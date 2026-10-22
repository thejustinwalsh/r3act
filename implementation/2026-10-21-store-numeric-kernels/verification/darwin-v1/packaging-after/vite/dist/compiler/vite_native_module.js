import { spawn } from "node:child_process";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { existsSync } from "node:fs";
import MagicString from "magic-string";
import { transformWithOxc } from "vite";
import { resolvePackagedNativeCompiler, verifyPackagedNativeCompiler, } from "./native_compiler_artifact.js";
import { isResolvedRuntimeImport, isStaticRuntimeImport } from "./native_runtime_origin.js";
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(moduleDir, "..");
// This deliberately small import scanner ignores comments and string literals
// so an example in a comment cannot opt a module into native compilation.
const namedImportsFromSource = (source) => {
    const imports = [];
    const skipTrivia = (from) => {
        let index = from;
        while (index < source.length) {
            if (/\s/.test(source[index])) {
                index++;
            }
            else if (source.startsWith("//", index)) {
                const newline = source.indexOf("\n", index + 2);
                index = newline < 0 ? source.length : newline + 1;
            }
            else if (source.startsWith("/*", index)) {
                const end = source.indexOf("*/", index + 2);
                index = end < 0 ? source.length : end + 2;
            }
            else {
                break;
            }
        }
        return index;
    };
    const skipQuoted = (from, quote) => {
        let index = from + 1;
        while (index < source.length) {
            if (source[index] === "\\")
                index += 2;
            else if (source[index++] === quote)
                break;
        }
        return index;
    };
    for (let index = 0; index < source.length;) {
        if (source.startsWith("//", index)) {
            const newline = source.indexOf("\n", index + 2);
            index = newline < 0 ? source.length : newline + 1;
            continue;
        }
        if (source.startsWith("/*", index)) {
            const end = source.indexOf("*/", index + 2);
            index = end < 0 ? source.length : end + 2;
            continue;
        }
        if (source[index] === "'" || source[index] === '"') {
            index = skipQuoted(index, source[index]);
            continue;
        }
        if (source[index] === "`") {
            // Template literals can contain arbitrary code-like text. Skip the full
            // literal; imports inside ${...} are expressions and are not declarations.
            index = skipQuoted(index, "`");
            continue;
        }
        if (!source.startsWith("import", index) || /[\w$]/.test(source[index - 1] ?? "")) {
            index++;
            continue;
        }
        let cursor = index + 6;
        if (/[\w$]/.test(source[cursor] ?? "")) {
            index++;
            continue;
        }
        cursor = skipTrivia(cursor);
        if (source[cursor] === "." || source[cursor] === "(") {
            index = cursor + 1;
            continue;
        }
        let declarationTypeOnly = false;
        if (source.startsWith("type", cursor) && !/[\w$]/.test(source[cursor + 4] ?? "")) {
            declarationTypeOnly = true;
            cursor = skipTrivia(cursor + 4);
        }
        if (source[cursor] !== "{") {
            index = cursor + 1;
            continue;
        }
        const open = cursor++;
        while (cursor < source.length && source[cursor] !== "}") {
            if (source.startsWith("//", cursor)) {
                const newline = source.indexOf("\n", cursor + 2);
                cursor = newline < 0 ? source.length : newline + 1;
            }
            else if (source.startsWith("/*", cursor)) {
                const end = source.indexOf("*/", cursor + 2);
                cursor = end < 0 ? source.length : end + 2;
            }
            else if (source[cursor] === "'" || source[cursor] === '"') {
                cursor = skipQuoted(cursor, source[cursor]);
            }
            else
                cursor++;
        }
        if (source[cursor] !== "}") {
            index = open + 1;
            continue;
        }
        const body = source.slice(open + 1, cursor++);
        cursor = skipTrivia(cursor);
        if (!source.startsWith("from", cursor) || /[\w$]/.test(source[cursor + 4] ?? "")) {
            index = cursor + 1;
            continue;
        }
        cursor = skipTrivia(cursor + 4);
        const quote = source[cursor];
        if (quote !== "'" && quote !== '"') {
            index = cursor + 1;
            continue;
        }
        const end = skipQuoted(cursor, quote);
        const module = source.slice(cursor + 1, end - 1);
        const names = body.split(",").flatMap((part) => {
            const clean = part.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").trim();
            if (!clean)
                return [];
            const typeOnly = clean.startsWith("type ");
            const declaration = typeOnly ? clean.slice(5).trim() : clean;
            const imported = declaration.split(/\s+as\s+/)[0].trim();
            return /^[\w$]+$/.test(imported) ? [{ imported, typeOnly }] : [];
        });
        imports.push({ module, names, declarationTypeOnly });
        index = end;
    }
    return imports;
};
const helperModuleFromSource = (source, trusted) => {
    let first = "";
    for (const declaration of namedImportsFromSource(source)) {
        if (declaration.names.some((name) => name.imported === "asyncTask" && !name.typeOnly)) {
            first ||= declaration.module;
            if (trusted.has(declaration.module))
                return declaration.module;
        }
    }
    return first;
};
const componentModuleFromSource = (source, trusted) => {
    for (const declaration of namedImportsFromSource(source)) {
        if (!trusted.has(declaration.module))
            continue;
        const hasHook = declaration.names.some((name) => name.imported === "useState" || name.imported === "useEffect" || name.imported === "use" || name.imported === "useStore");
        // Rust diagnoses type-only hook imports; other native imports must be runtime values.
        const hasRuntimeNativeApi = declaration.names.some((name) => !name.typeOnly && [
            "jsx", "jsxs", "jsxDEV", "Fragment", "Suspense", "createDOMRoot", "createNativeRoot", "createKeyedCollection",
        ].includes(name.imported));
        if (hasHook || (!declaration.declarationTypeOnly && hasRuntimeNativeApi)) {
            return declaration.module;
        }
    }
    return "";
};
const staticTrustedModules = (source, importer) => new Set(namedImportsFromSource(source).map((item) => item.module)
    .filter((module) => isStaticRuntimeImport(module, importer)));
/** The statically verifiable native runtime import used by a component module. */
export const nativeRuntimeModuleFromSource = (source, importer) => componentModuleFromSource(source, staticTrustedModules(source, importer));
export const nativeModuleCandidateFromSource = (source, importer) => {
    const trusted = staticTrustedModules(source, importer);
    if (componentModuleFromSource(source, trusted))
        return true;
    const helper = helperModuleFromSource(source, trusted);
    return Boolean(helper && (trusted.has(helper) || source.includes("// @native-ui")));
};
export const isNativeTransformRequest = (id) => {
    const [filename, query = ""] = id.split("?", 2);
    return filename.endsWith(".tsx") &&
        !/(?:^|&)(?:raw|url|worker|sharedworker|inline)(?:&|=|$)/.test(query);
};
export const nativeModuleCompilerPlugin = (options = {}) => {
    // `root` overrides the source project; installed compiler files sit beside this module.
    let sourceRoot = path.resolve(options.root ?? defaultRoot);
    const compilerRoot = path.resolve(options.compilerRoot ?? options.root ?? defaultRoot);
    const manifestPath = path.join(compilerRoot, "compiler/oxc-spike/Cargo.toml");
    const binDirectory = path.join(moduleDir, "bin");
    const explicitBinary = options.compilerBinary
        ? path.resolve(options.compilerBinary) : undefined;
    const devBinaryPath = path.join(compilerRoot, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
    let processHandle;
    let buildProcess;
    let startup;
    let nextRequestId = 0;
    let outputBuffer = "";
    let stderrBuffer = "";
    let stopped = false;
    let hmrEnabled = false;
    let devServer;
    let restartRequested = false;
    const pending = new Map();
    const compiledNativeFiles = new Map();
    const pluginInstance = randomUUID();
    const trustedModules = async (source, importer, resolve) => {
        const trusted = new Set();
        for (const specifier of new Set(namedImportsFromSource(source).map((item) => item.module))) {
            const resolved = resolve ? await resolve(specifier, importer) : undefined;
            if (isResolvedRuntimeImport(specifier, importer, resolved, Boolean(resolve)))
                trusted.add(specifier);
        }
        return trusted;
    };
    const failPending = (error) => {
        for (const request of pending.values())
            request.reject(error);
        pending.clear();
    };
    const stopCompiler = () => {
        stopped = true;
        const child = processHandle;
        const builder = buildProcess;
        processHandle = undefined;
        buildProcess = undefined;
        failPending(new Error("Native module compiler stopped"));
        child?.kill();
        builder?.kill();
    };
    const attachCompiler = (child) => {
        processHandle = child;
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk) => {
            outputBuffer += chunk;
            while (true) {
                const newline = outputBuffer.indexOf("\n");
                if (newline < 0)
                    break;
                const line = outputBuffer.slice(0, newline).trim();
                outputBuffer = outputBuffer.slice(newline + 1);
                if (!line)
                    continue;
                let response;
                try {
                    response = JSON.parse(line);
                }
                catch (error) {
                    failPending(new Error(`Rust native compiler returned invalid JSON: ${String(error)}; line=${line}`));
                    continue;
                }
                const request = pending.get(response.id);
                if (!request) {
                    failPending(new Error(`Rust native compiler returned unknown request ID: ${response.id}`));
                    continue;
                }
                pending.delete(response.id);
                request.resolve(response);
            }
        });
        child.stderr.on("data", (chunk) => {
            stderrBuffer = (stderrBuffer + chunk).slice(-8000);
        });
        child.on("error", (error) => {
            if (processHandle === child)
                processHandle = undefined;
            failPending(new Error(`Unable to start Rust native compiler: ${error.message}`));
        });
        child.on("close", (code, signal) => {
            if (processHandle === child) {
                processHandle = undefined;
                startup = undefined;
            }
            const detail = stderrBuffer.trim();
            const error = new Error(`Rust native compiler exited (${code ?? signal ?? "unknown"})${detail ? `: ${detail}` : ""}`);
            failPending(error);
        });
        return child;
    };
    const ensureCompiler = () => {
        if (stopped)
            throw new Error("Native module compiler plugin is closed");
        if (processHandle && processHandle.exitCode === null) {
            return Promise.resolve(processHandle);
        }
        if (startup)
            return startup;
        outputBuffer = "";
        stderrBuffer = "";
        if (explicitBinary || existsSync(binDirectory) || !existsSync(manifestPath)) {
            startup = (async () => {
                const packaged = explicitBinary ? undefined
                    : await resolvePackagedNativeCompiler(binDirectory);
                if (!explicitBinary && !packaged) {
                    throw new Error(`No Rust native compiler for ${process.platform}-${process.arch}; install a matching @r3act/vite artifact or provide compilerBinary`);
                }
                if (packaged) {
                    await verifyPackagedNativeCompiler(packaged.binaryPath, packaged.artifact);
                }
                if (stopped)
                    throw new Error("Native module compiler plugin is closed");
                const executable = explicitBinary ?? packaged.binaryPath;
                return await new Promise((resolve, reject) => {
                    const child = spawn(executable, ["--serve-native"], {
                        cwd: sourceRoot,
                        stdio: ["pipe", "pipe", "pipe"],
                    });
                    attachCompiler(child);
                    child.once("error", (error) => {
                        reject(new Error(`Unable to start Rust native compiler: ${error.message}`));
                    });
                    child.once("spawn", () => resolve(child));
                });
            })().catch((error) => {
                startup = undefined;
                throw error;
            });
            return startup;
        }
        startup = new Promise((resolve, reject) => {
            const builder = spawn("cargo", [
                "build",
                "--quiet",
                "--manifest-path",
                manifestPath,
                "--bin",
                "ui-graph-compiler-spike",
            ], {
                cwd: compilerRoot,
                env: { ...process.env, CARGO_HOME: process.env.CARGO_HOME ?? path.join(compilerRoot, ".cache/cargo") },
                stdio: ["ignore", "ignore", "pipe"],
            });
            buildProcess = builder;
            let buildErrors = "";
            builder.stderr.setEncoding("utf8");
            builder.stderr.on("data", (chunk) => {
                buildErrors = (buildErrors + chunk).slice(-8000);
            });
            builder.on("error", (error) => {
                buildProcess = undefined;
                startup = undefined;
                reject(new Error(`Unable to build Rust native compiler: ${error.message}`));
            });
            builder.on("close", (code, signal) => {
                if (buildProcess === builder)
                    buildProcess = undefined;
                if (code !== 0) {
                    startup = undefined;
                    reject(new Error(`Rust native compiler build failed (${code ?? signal ?? "unknown"})${buildErrors ? `: ${buildErrors.trim()}` : ""}`));
                    return;
                }
                const child = spawn(devBinaryPath, ["--serve-native"], {
                    cwd: compilerRoot,
                    stdio: ["pipe", "pipe", "pipe"],
                });
                child.on("error", (error) => {
                    if (processHandle === child)
                        processHandle = undefined;
                    startup = undefined;
                    reject(new Error(`Unable to start Rust native compiler: ${error.message}`));
                });
                resolve(attachCompiler(child));
            });
        });
        return startup;
    };
    const compile = async (request) => {
        const child = await ensureCompiler();
        const id = `vite-native-${++nextRequestId}`;
        const response = await new Promise((resolve, reject) => {
            pending.set(id, { resolve, reject });
            child.stdin.write(`${JSON.stringify({ id, ...request })}\n`, (error) => {
                if (!error)
                    return;
                pending.delete(id);
                reject(new Error(`Could not send source to Rust compiler: ${error.message}`));
            });
        });
        if (!response.error) {
            const expected = [...new Set(request.trusted_runtime_modules)]
                .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
            if (!Array.isArray(response.trusted_runtime_modules) ||
                response.trusted_runtime_modules.length !== expected.length ||
                response.trusted_runtime_modules.some((module, index) => module !== expected[index])) {
                throw new Error("Native compiler does not support the trusted runtime-origin protocol, or returned a mismatched origin list");
            }
        }
        return response;
    };
    const shutdownOnServerClose = (server) => {
        devServer = server;
        server.httpServer?.once("close", stopCompiler);
        server.watcher.once("close", stopCompiler);
    };
    const restartForBoundaryChange = () => {
        if (restartRequested || !devServer)
            return;
        restartRequested = true;
        queueMicrotask(() => {
            const server = devServer;
            if (!server)
                return;
            void server.restart().catch((error) => {
                server.config.logger.error(`Native/React boundary restart failed: ${String(error)}`);
            });
        });
    };
    return {
        name: "native-module-rust-compiler",
        enforce: "pre",
        configResolved(config) {
            if (!options.root)
                sourceRoot = path.resolve(config.root);
            hmrEnabled = config.command === "serve";
        },
        async transform(source, id) {
            if (!isNativeTransformRequest(id))
                return null;
            const cleanId = id.split("?", 1)[0];
            const absolutePath = path.resolve(cleanId);
            const trusted = await trustedModules(source, cleanId, this.resolve?.bind(this));
            const helperImport = helperModuleFromSource(source, trusted);
            const explicitMarker = source.includes("// @native-ui");
            const helperModule = helperImport && (trusted.has(helperImport) || explicitMarker) ? helperImport : "";
            const componentModule = componentModuleFromSource(source, trusted);
            const candidate = Boolean(helperModule || componentModule);
            if (options.reactBoundary) {
                const covered = options.reactBoundary.sourceRoots.some((entry) => absolutePath === entry || absolutePath.startsWith(`${entry}${path.sep}`));
                if (candidate && !covered) {
                    this.error(`Native TSX module is outside configured nativeReactPlugins sourceRoots: ${cleanId}`);
                }
                if (options.reactBoundary.excludedFiles.has(absolutePath) !== candidate) {
                    restartForBoundaryChange();
                    this.error(`Native/React module boundary changed for ${cleanId}; Vite is restarting.`);
                }
            }
            const sourcePath = path.relative(sourceRoot, absolutePath).split(path.sep).join("/");
            if (sourcePath.startsWith("../")) {
                if (source.includes("// @native-ui")) {
                    this.error(`Native UI module must be inside the project root: ${cleanId}`);
                }
                return null;
            }
            if (!candidate)
                return null;
            if (!helperModule && !componentModule)
                return null;
            if (helperModule.startsWith(".")) {
                this.addWatchFile(path.resolve(path.dirname(absolutePath), helperModule));
            }
            if (componentModule.startsWith(".")) {
                this.addWatchFile(path.resolve(path.dirname(absolutePath), componentModule));
            }
            const response = await compile({
                path: sourcePath,
                source,
                helper_module: helperModule,
                trusted_runtime_modules: [...trusted],
                ...(componentModule ? { component_module: source } : {}),
            }).catch((error) => {
                this.error(`Native UI compilation failed for ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`);
            });
            if (response.error) {
                this.error(`Native UI compilation failed for ${sourcePath}: ${response.error}`);
            }
            if (typeof response.code !== "string" || !response.plan) {
                this.error(`Native UI compiler returned an incomplete result for ${sourcePath}.`);
            }
            const serializedPlan = JSON.stringify(response.plan).replace(/</g, "\\u003c");
            if (![1, 2].includes(response.plan.schema_version) ||
                typeof response.plan.module_revision !== "string" ||
                !response.plan.module_revision ||
                response.plan.semantic_plan?.schema_version !== 1 ||
                response.plan.semantic_plan.source_file !== sourcePath ||
                response.plan.semantic_plan.module_revision !== response.plan.module_revision ||
                !Array.isArray(response.plan.semantic_plan.owners) ||
                !Array.isArray(response.plan.semantic_plan.sources) ||
                !Array.isArray(response.plan.semantic_plan.sinks) ||
                !Array.isArray(response.plan.semantic_plan.operations) ||
                !response.plan.semantic_plan.graph ||
                response.plan.semantic_plan.graph.coverage !== "proven-sinks-only" ||
                !Array.isArray(response.plan.semantic_plan.graph.execution_order) ||
                typeof response.plan.semantic_plan.graph.source_to_sinks !== "object" ||
                response.plan.source_file !== sourcePath ||
                response.plan.helper_module !== helperModule ||
                (response.plan.schema_version === 2 &&
                    (typeof response.plan.component_module !== "string" ||
                        !Array.isArray(response.plan.components) ||
                        response.plan.components.some((component) => {
                            if (!component || typeof component !== "object")
                                return true;
                            const candidate = component;
                            const validSiteList = (value) => Array.isArray(value) &&
                                value.every((site) => typeof site === "string");
                            const validRecords = (value, key) => Array.isArray(value) &&
                                value.every((site) => Boolean(site) && typeof site === "object" &&
                                    typeof site[key] === "string");
                            return typeof candidate.name !== "string" ||
                                typeof candidate.component_site_id !== "string" ||
                                !validSiteList(candidate.prop_only_sites) ||
                                !validRecords(candidate.state_sites, "site_id") ||
                                !validRecords(candidate.effect_sites, "site_id") ||
                                !Array.isArray(candidate.store_sites) ||
                                candidate.store_sites.some((site) => !site || typeof site !== "object" ||
                                    typeof site.site_id !== "string" ||
                                    typeof site.source_expression !== "string") ||
                                (candidate.collection_sites !== undefined &&
                                    (!Array.isArray(candidate.collection_sites) ||
                                        candidate.collection_sites.some((site) => !site || typeof site !== "object" ||
                                            typeof site.site_id !== "string" ||
                                            typeof site.source_expression !== "string" ||
                                            typeof site.row_parameter !== "string" ||
                                            (site.requires_owner_render !== undefined &&
                                                typeof site.requires_owner_render !== "boolean"))));
                        }))) ||
                !Array.isArray(response.plan.tasks) ||
                !Array.isArray(response.plan.task_order) ||
                response.plan.tasks.some((task) => {
                    if (!task || typeof task !== "object")
                        return true;
                    const candidate = task;
                    return typeof candidate.id !== "string" ||
                        typeof candidate.site_id !== "string" ||
                        !Array.isArray(candidate.depends_on) ||
                        !candidate.depends_on.every((dependency) => typeof dependency === "string");
                })) {
                this.error(`Native UI compiler returned mismatched plan metadata for ${sourcePath}.`);
            }
            if (!Array.isArray(response.edits)) {
                this.error(`Native UI compiler omitted source edits for ${sourcePath}.`);
            }
            const applyEdits = (editSource, edits, output) => {
                const magic = new MagicString(editSource);
                let priorEnd = 0;
                let priorStart = -1;
                let firstEdit = true;
                const isCodePointBoundary = (offset) => {
                    if (offset <= 0 || offset >= editSource.length)
                        return true;
                    const previous = editSource.charCodeAt(offset - 1);
                    const current = editSource.charCodeAt(offset);
                    return !(previous >= 0xd800 && previous <= 0xdbff && current >= 0xdc00 && current <= 0xdfff);
                };
                for (const edit of edits) {
                    if (!Number.isSafeInteger(edit.start) || !Number.isSafeInteger(edit.end) ||
                        edit.start < 0 || edit.end < edit.start || edit.end > editSource.length ||
                        typeof edit.replacement !== "string" ||
                        (!firstEdit && (edit.start < priorEnd || edit.start === priorStart)) ||
                        !isCodePointBoundary(edit.start) || !isCodePointBoundary(edit.end)) {
                        this.error(`Native UI compiler returned malformed or overlapping source edits for ${sourcePath}.`);
                    }
                    if (edit.start === edit.end) {
                        magic.appendLeft(edit.start, edit.replacement);
                    }
                    else {
                        magic.overwrite(edit.start, edit.end, edit.replacement);
                    }
                    priorStart = edit.start;
                    priorEnd = edit.end;
                    firstEdit = false;
                }
                if (output !== undefined && magic.toString() !== output) {
                    this.error(`Native UI compiler source edits did not reproduce its emitted code for ${sourcePath}.`);
                }
                return magic;
            };
            const taskOutput = helperModule ? response.code : source;
            const taskMagic = applyEdits(source, response.edits, taskOutput);
            const exportName = response.plan.schema_version === 2
                ? "compiledNativeComponentPlan"
                : "compiledAsyncTaskPlan";
            let registrar = "__registerNativeSemanticPlan";
            while (new RegExp(`\\b${registrar}\\b`).test(source))
                registrar += "_";
            let invalidator = "__invalidateNativeSemanticPlan";
            while (new RegExp(`\\b${invalidator}\\b`).test(source))
                invalidator += "_";
            let hotListener = "__onNativeModuleRevision";
            while (new RegExp(`\\b${hotListener}\\b`).test(source))
                hotListener += "_";
            const registryModule = componentModule ||
                (/(?:^|[\\/])async_task_plan\.ts$/.test(helperModule)
                    ? helperModule.replace(/async_task_plan\.ts$/, "compiled_semantic_plan.ts")
                    : helperModule);
            const semanticJson = JSON.stringify(response.plan.semantic_plan).replace(/</g, "\\u003c");
            const previous = compiledNativeFiles.get(absolutePath);
            const instance = previous?.revision === response.plan.module_revision
                ? previous.instance : hmrEnabled ? `${pluginInstance}:${response.id}` : response.plan.module_revision;
            const registration = `import { registerCompiledSemanticPlan as ${registrar}, invalidateCompiledSemanticPlan as ${invalidator} } from ${JSON.stringify(registryModule)};\n${registrar}(${semanticJson});\nif (import.meta.hot) {\n  const ${hotListener} = (event: { sourceFile?: string; previousRevision?: string; previousInstance?: string }) => { if (event?.sourceFile === ${JSON.stringify(sourcePath)} && event.previousRevision === ${JSON.stringify(response.plan.module_revision)} && event.previousInstance === ${JSON.stringify(instance)}) ${invalidator}(${JSON.stringify(sourcePath)}, ${JSON.stringify(response.plan.module_revision)}); };\n  import.meta.hot.on("r3act:invalidate-native-module", ${hotListener});\n  import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", ${hotListener}));\n}\n`;
            if (response.plan.schema_version === 2) {
                if (!componentModule || !Array.isArray(response.component_edits) ||
                    typeof response.plan.component_module !== "string") {
                    this.error(`Native UI compiler omitted component edits or output for ${sourcePath}.`);
                }
                const componentEdits = [...response.component_edits]
                    .sort((left, right) => left.start - right.start || left.end - right.end);
                const componentMagic = applyEdits(source, componentEdits, response.plan.component_module);
                const combinedEdits = [...response.edits, ...response.component_edits]
                    .sort((left, right) => left.start - right.start || left.end - right.end);
                const combinedMagic = applyEdits(source, combinedEdits);
                combinedMagic.prepend(registration);
                if (helperModule && taskMagic.toString() !== source &&
                    componentMagic.toString() !== source &&
                    combinedEdits.some((edit, index) => index > 0 && edit.start < combinedEdits[index - 1].end)) {
                    this.error(`Native UI compiler returned overlapping task and component transformations for ${sourcePath}.`);
                }
                combinedMagic.append(`\nexport const ${exportName} = ${serializedPlan} as const;\n`);
                compiledNativeFiles.set(absolutePath, { revision: response.plan.module_revision, instance });
                return {
                    code: combinedMagic.toString(),
                    meta: { nativeRuntimeModule: componentModule },
                    map: combinedMagic.generateMap({
                        hires: true,
                        includeContent: true,
                        source: cleanId,
                    }),
                };
            }
            taskMagic.prepend(registration);
            taskMagic.append(`\nexport const ${exportName} = ${serializedPlan} as const;\n`);
            compiledNativeFiles.set(absolutePath, { revision: response.plan.module_revision, instance });
            return {
                code: taskMagic.toString(),
                meta: { nativeRuntimeModule: componentModule },
                map: taskMagic.generateMap({
                    hires: true,
                    includeContent: true,
                    source: cleanId,
                }),
            };
        },
        async handleHotUpdate(context) {
            const changedFile = path.resolve(context.file);
            const resolveForHot = context.server.pluginContainer?.resolveId.bind(context.server.pluginContainer);
            const affected = new Map();
            const changedModule = compiledNativeFiles.get(changedFile);
            if (changedModule)
                affected.set(changedFile, changedModule);
            const visited = new Set(context.modules);
            const queue = [...context.modules];
            for (const module of queue) {
                if (module.file) {
                    const importerFile = path.resolve(module.file);
                    const compiledImporter = compiledNativeFiles.get(importerFile);
                    if (compiledImporter)
                        affected.set(importerFile, compiledImporter);
                }
                if (module.isSelfAccepting &&
                    !(module.file && compiledNativeFiles.has(path.resolve(module.file))))
                    continue;
                for (const importer of module.importers) {
                    if (importer.acceptedHmrDeps?.has(module))
                        continue;
                    if (visited.has(importer))
                        continue;
                    visited.add(importer);
                    queue.push(importer);
                }
            }
            let boundaryChanged = false;
            if (options.reactBoundary && changedFile.endsWith(".tsx") &&
                options.reactBoundary.sourceRoots.some((entry) => changedFile === entry || changedFile.startsWith(`${entry}${path.sep}`))) {
                let source = "";
                try {
                    source = await context.read();
                }
                catch { /* Deleted files leave the boundary. */ }
                const trusted = await trustedModules(source, changedFile, resolveForHot);
                const helper = helperModuleFromSource(source, trusted);
                const candidate = Boolean(componentModuleFromSource(source, trusted) ||
                    (helper && (trusted.has(helper) || source.includes("// @native-ui"))));
                boundaryChanged = options.reactBoundary.excludedFiles.has(changedFile) !== candidate;
            }
            if (!affected.size && !boundaryChanged)
                return;
            const acceptedChangedModule = affected.get(changedFile);
            if (acceptedChangedModule) {
                const source = await context.read();
                await transformWithOxc(source, changedFile, { lang: "tsx" });
                const trusted = await trustedModules(source, changedFile, resolveForHot);
                const helperImport = helperModuleFromSource(source, trusted);
                const helperModule = helperImport && (trusted.has(helperImport) || source.includes("// @native-ui")) ? helperImport : "";
                const componentModule = componentModuleFromSource(source, trusted);
                if (helperModule || componentModule) {
                    const sourcePath = path.relative(sourceRoot, changedFile).split(path.sep).join("/");
                    const response = await compile({
                        path: sourcePath,
                        source,
                        helper_module: helperModule,
                        trusted_runtime_modules: [...trusted],
                        ...(componentModule ? { component_module: source } : {}),
                    });
                    if (response.error) {
                        throw new Error(`Native UI compilation failed for ${sourcePath}: ${response.error}`);
                    }
                    if (typeof response.code !== "string" || !response.plan) {
                        throw new Error(`Native UI compiler returned an incomplete result for ${sourcePath}.`);
                    }
                }
                const latestSource = await context.read();
                if (latestSource !== source)
                    return [];
            }
            if ([...affected].some(([file, accepted]) => {
                const current = compiledNativeFiles.get(file);
                return current?.revision !== accepted.revision || current.instance !== accepted.instance;
            }))
                return [];
            for (const [file, accepted] of affected) {
                const sourceFile = path.relative(sourceRoot, file).split(path.sep).join("/");
                context.server.ws.send({
                    type: "custom",
                    event: "r3act:invalidate-native-module",
                    data: {
                        sourceFile,
                        previousRevision: accepted.revision,
                        previousInstance: accepted.instance,
                    },
                });
            }
            context.server.ws.send({ type: "full-reload" });
            if (boundaryChanged)
                restartForBoundaryChange();
            return [];
        },
        configureServer: shutdownOnServerClose,
        closeBundle: stopCompiler,
    };
};
//# sourceMappingURL=vite_native_module.js.map