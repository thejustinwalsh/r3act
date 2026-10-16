import { spawn, type ChildProcess, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { existsSync } from "node:fs";
import MagicString from "magic-string";
import type { Plugin, ViteDevServer } from "vite";

type NativePlan = {
  schema_version: number;
  module_revision: string;
  semantic_plan: {
    schema_version: number;
    source_file: string;
    module_revision: string;
    owners: readonly unknown[];
    sources: readonly unknown[];
    sinks: readonly unknown[];
    operations: readonly unknown[];
    graph: { coverage: string; source_to_sinks: Record<string, readonly string[]>; execution_order: readonly string[] };
  };
  source_file: string;
  helper_module: string;
  component_module?: string;
  components?: readonly unknown[];
  tasks: readonly unknown[];
  task_order: readonly number[];
};

type NativeResponse = {
  id: string;
  code?: string;
  plan?: NativePlan;
  edits?: readonly NativeEdit[];
  component_edits?: readonly NativeEdit[] | null;
  error?: string;
};

type NativeEdit = { start: number; end: number; replacement: string };

type PendingRequest = {
  resolve: (response: NativeResponse) => void;
  reject: (error: Error) => void;
};

type NativeRequest = {
  id: string;
  path: string;
  source: string;
  helper_module: string;
  component_module?: string;
};

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(moduleDir, "..");

type NamedImport = {
  module: string;
  names: readonly { imported: string; typeOnly: boolean }[];
  declarationTypeOnly: boolean;
};

// This deliberately small import scanner ignores comments and string literals
// so an example in a comment cannot opt a module into native compilation.
const namedImportsFromSource = (source: string): NamedImport[] => {
  const imports: NamedImport[] = [];
  const skipTrivia = (from: number): number => {
    let index = from;
    while (index < source.length) {
      if (/\s/.test(source[index])) {
        index++;
      } else if (source.startsWith("//", index)) {
        const newline = source.indexOf("\n", index + 2);
        index = newline < 0 ? source.length : newline + 1;
      } else if (source.startsWith("/*", index)) {
        const end = source.indexOf("*/", index + 2);
        index = end < 0 ? source.length : end + 2;
      } else {
        break;
      }
    }
    return index;
  };
  const skipQuoted = (from: number, quote: string): number => {
    let index = from + 1;
    while (index < source.length) {
      if (source[index] === "\\") index += 2;
      else if (source[index++] === quote) break;
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
      } else if (source.startsWith("/*", cursor)) {
        const end = source.indexOf("*/", cursor + 2);
        cursor = end < 0 ? source.length : end + 2;
      } else if (source[cursor] === "'" || source[cursor] === '"') {
        cursor = skipQuoted(cursor, source[cursor]);
      } else cursor++;
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
      if (!clean) return [];
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

const helperModuleFromSource = (source: string): string => {
  for (const declaration of namedImportsFromSource(source)) {
    if (declaration.names.some((name) => name.imported === "asyncTask" && !name.typeOnly)) {
      return declaration.module;
    }
  }
  return "";
};

const componentModuleFromSource = (source: string): string => {
  for (const declaration of namedImportsFromSource(source)) {
    const hasHook = declaration.names.some((name) =>
      name.imported === "useState" || name.imported === "useEffect" || name.imported === "use" || name.imported === "useStore"
    );
    // Rust diagnoses type-only hook imports; other native imports must be runtime values.
    const hasRuntimeNativeApi = declaration.names.some((name) =>
      !name.typeOnly && [
        "jsx", "jsxs", "jsxDEV", "Fragment", "Suspense", "createDOMRoot", "createNativeRoot", "createKeyedCollection",
      ].includes(name.imported)
    );
    const nativeEntry = declaration.module.includes("native_runtime_api") ||
      ["@compiled-ui/runtime", "@compiled-ui/runtime/core"].includes(declaration.module);
    if (nativeEntry && (hasHook || (!declaration.declarationTypeOnly && hasRuntimeNativeApi))) {
      return declaration.module;
    }
  }
  return "";
};

/** The native runtime import used by a component module, when present. */
export const nativeRuntimeModuleFromSource = componentModuleFromSource;

/**
 * Compile opt-in native TSX modules with the persistent Rust/OXC process.
 * Rust owns native hook/site analysis and asyncTask dependency inference. Vite
 * continues with its usual TSX and JSX lowering after this transform.
 */
export type NativeCompilerOptions = {
  root?: string;
  compilerRoot?: string;
  /** Explicit persistent compiler executable; skips the development Cargo build. */
  compilerBinary?: string;
};

export const nativeModuleCompilerPlugin = (
  options: NativeCompilerOptions = {},
): Plugin => {
  // `root` overrides the source project; installed compiler files sit beside this module.
  let sourceRoot = path.resolve(options.root ?? defaultRoot);
  const compilerRoot = path.resolve(options.compilerRoot ?? options.root ?? defaultRoot);
  const manifestPath = path.join(compilerRoot, "compiler/oxc-spike/Cargo.toml");
  const packagedBinary = path.join(moduleDir, "bin", `${process.platform}-${process.arch}`,
    `ui-graph-compiler-spike${process.platform === "win32" ? ".exe" : ""}`);
  const prebuiltBinary = options.compilerBinary
    ? path.resolve(options.compilerBinary)
    : existsSync(packagedBinary) ? packagedBinary : undefined;
  const binaryPath = prebuiltBinary ?? path.join(
    compilerRoot,
    "compiler/oxc-spike/target/debug/ui-graph-compiler-spike",
  );
  let processHandle: ChildProcessWithoutNullStreams | undefined;
  let buildProcess: ChildProcess | undefined;
  let startup: Promise<ChildProcessWithoutNullStreams> | undefined;
  let nextRequestId = 0;
  let outputBuffer = "";
  let stderrBuffer = "";
  let stopped = false;
  const pending = new Map<string, PendingRequest>();
  const compiledNativeFiles = new Set<string>();

  const failPending = (error: Error) => {
    for (const request of pending.values()) request.reject(error);
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

  const attachCompiler = (child: ChildProcessWithoutNullStreams) => {
    processHandle = child;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      outputBuffer += chunk;
      while (true) {
        const newline = outputBuffer.indexOf("\n");
        if (newline < 0) break;
        const line = outputBuffer.slice(0, newline).trim();
        outputBuffer = outputBuffer.slice(newline + 1);
        if (!line) continue;
        let response: NativeResponse;
        try {
          response = JSON.parse(line) as NativeResponse;
        } catch (error) {
          failPending(
            new Error(
              `Rust native compiler returned invalid JSON: ${String(error)}; line=${line}`,
            ),
          );
          continue;
        }
        const request = pending.get(response.id);
        if (!request) {
          failPending(
            new Error(`Rust native compiler returned unknown request ID: ${response.id}`),
          );
          continue;
        }
        pending.delete(response.id);
        request.resolve(response);
      }
    });
    child.stderr.on("data", (chunk: string) => {
      stderrBuffer = (stderrBuffer + chunk).slice(-8000);
    });
    child.on("error", (error) => {
      if (processHandle === child) processHandle = undefined;
      failPending(
        new Error(`Unable to start Rust native compiler: ${error.message}`),
      );
    });
    child.on("close", (code, signal) => {
      if (processHandle === child) {
        processHandle = undefined;
        startup = undefined;
      }
      const detail = stderrBuffer.trim();
      const error = new Error(
        `Rust native compiler exited (${code ?? signal ?? "unknown"})${detail ? `: ${detail}` : ""}`,
      );
      failPending(error);
    });
    return child;
  };

  const ensureCompiler = (): Promise<ChildProcessWithoutNullStreams> => {
    if (stopped) throw new Error("Native module compiler plugin is closed");
    if (processHandle && processHandle.exitCode === null) {
      return Promise.resolve(processHandle);
    }
    if (startup) return startup;
    outputBuffer = "";
    stderrBuffer = "";
    if (prebuiltBinary) {
      startup = new Promise((resolve, reject) => {
        const child = spawn(binaryPath, ["--serve-native"], {
          cwd: sourceRoot,
          stdio: ["pipe", "pipe", "pipe"],
        });
        attachCompiler(child);
        child.once("error", (error) => {
          startup = undefined;
          reject(new Error(`Unable to start Rust native compiler: ${error.message}`));
        });
        child.once("spawn", () => resolve(child));
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
        env: { ...process.env, CARGO_HOME: path.join(compilerRoot, ".cache/cargo") },
        stdio: ["ignore", "ignore", "pipe"],
      });
      buildProcess = builder;
      let buildErrors = "";
      builder.stderr.setEncoding("utf8");
      builder.stderr.on("data", (chunk: string) => {
        buildErrors = (buildErrors + chunk).slice(-8000);
      });
      builder.on("error", (error) => {
        buildProcess = undefined;
        startup = undefined;
        reject(new Error(`Unable to build Rust native compiler: ${error.message}`));
      });
      builder.on("close", (code, signal) => {
        if (buildProcess === builder) buildProcess = undefined;
        if (code !== 0) {
          startup = undefined;
          reject(
            new Error(
              `Rust native compiler build failed (${code ?? signal ?? "unknown"})${buildErrors ? `: ${buildErrors.trim()}` : ""}`,
            ),
          );
          return;
        }
        const child = spawn(binaryPath, ["--serve-native"], {
          cwd: compilerRoot,
          stdio: ["pipe", "pipe", "pipe"],
        });
        child.on("error", (error) => {
          if (processHandle === child) processHandle = undefined;
          startup = undefined;
          reject(new Error(`Unable to start Rust native compiler: ${error.message}`));
        });
        resolve(attachCompiler(child));
      });
    });
    return startup;
  };

  const compile = async (request: Omit<NativeRequest, "id">) => {
    const child = await ensureCompiler();
    const id = `vite-native-${++nextRequestId}`;
    return await new Promise<NativeResponse>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      child.stdin.write(`${JSON.stringify({ id, ...request } satisfies NativeRequest)}\n`, (error) => {
        if (!error) return;
        pending.delete(id);
        reject(new Error(`Could not send source to Rust compiler: ${error.message}`));
      });
    });
  };

  const shutdownOnServerClose = (server: ViteDevServer) => {
    server.httpServer?.once("close", stopCompiler);
    server.watcher.once("close", stopCompiler);
  };

  return {
    name: "native-module-rust-compiler",
    enforce: "pre",
    configResolved(config) {
      if (!options.root) sourceRoot = path.resolve(config.root);
    },
    async transform(source, id) {
      const cleanId = id.split("?", 1)[0];
      if (!cleanId.endsWith(".tsx")) {
        return null;
      }
      const absolutePath = path.resolve(cleanId);
      const sourcePath = path.relative(sourceRoot, absolutePath).split(path.sep).join("/");
      if (sourcePath.startsWith("../")) {
        if (source.includes("// @native-ui")) {
          this.error(`Native UI module must be inside the project root: ${cleanId}`);
        }
        return null;
      }
      const helperModule = helperModuleFromSource(source);
      const explicitMarker = source.includes("// @native-ui");
      // Resolve the candidate module through Vite so a similarly named local
      // module cannot accidentally opt a React file into native compilation.
      const candidateModule = componentModuleFromSource(source);
      const moduleToResolve = candidateModule ||
        (helperModule && namedImportsFromSource(source).some((item) =>
          item.module === helperModule && item.names.some((name) => name.imported === "asyncTask" && !name.typeOnly)
        ) ? helperModule : "");
      let resolvedNativeModule = "";
      if (moduleToResolve) {
        const declaration = namedImportsFromSource(source).find((item) => item.module === moduleToResolve);
        if (declaration) {
          const resolved = await this.resolve?.(moduleToResolve, cleanId);
          const resolvedId = resolved?.id.split("?", 1)[0];
          const publicExternal = resolved?.external && resolvedId === moduleToResolve &&
            ["@compiled-ui/runtime", "@compiled-ui/runtime/core"].includes(moduleToResolve);
          if (resolvedId && (/(?:^|[\\/])native_runtime_api\.(?:[cm]?[jt]sx?)$/i.test(resolvedId) || publicExternal)) {
            resolvedNativeModule = moduleToResolve;
          } else if (!this.resolve && /(?:^|[\\/])native_runtime_api\.(?:[cm]?[jt]sx?)$/i.test(moduleToResolve)) {
            // Compatibility for the intentionally minimal contexts used by
            // direct unit tests; normal Vite execution always resolves first.
            resolvedNativeModule = moduleToResolve;
          }
        }
      }
      const componentModule = candidateModule
        ? (resolvedNativeModule || (explicitMarker ? candidateModule : ""))
        : (explicitMarker ? candidateModule : "");
      if (!explicitMarker && !resolvedNativeModule) return null;
      if (!helperModule && !componentModule) return null;
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
        ...(componentModule ? { component_module: source } : {}),
      }).catch((error: unknown) => {
        this.error(
          `Native UI compilation failed for ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
      if (response.error) {
        this.error(`Native UI compilation failed for ${sourcePath}: ${response.error}`);
      }
      if (typeof response.code !== "string" || !response.plan) {
        this.error(
          `Native UI compiler returned an incomplete result for ${sourcePath}.`,
        );
      }
      const serializedPlan = JSON.stringify(response.plan).replace(/</g, "\\u003c");
      if (
        ![1, 2].includes(response.plan.schema_version) ||
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
              if (!component || typeof component !== "object") return true;
              const candidate = component as Record<string, unknown>;
              const validSiteList = (value: unknown) => Array.isArray(value) &&
                value.every((site) => typeof site === "string");
              const validRecords = (value: unknown, key: string) => Array.isArray(value) &&
                value.every((site) => Boolean(site) && typeof site === "object" &&
                  typeof (site as Record<string, unknown>)[key] === "string");
              return typeof candidate.name !== "string" ||
                typeof candidate.component_site_id !== "string" ||
                !validSiteList(candidate.prop_only_sites) ||
                !validRecords(candidate.state_sites, "site_id") ||
                !validRecords(candidate.effect_sites, "site_id") ||
                !Array.isArray(candidate.store_sites) ||
                candidate.store_sites.some((site) => !site || typeof site !== "object" ||
                  typeof (site as Record<string, unknown>).site_id !== "string" ||
                  typeof (site as Record<string, unknown>).source_expression !== "string") ||
                (candidate.collection_sites !== undefined &&
                  (!Array.isArray(candidate.collection_sites) ||
                    candidate.collection_sites.some((site) => !site || typeof site !== "object" ||
                      typeof (site as Record<string, unknown>).site_id !== "string" ||
                      typeof (site as Record<string, unknown>).source_expression !== "string" ||
                      typeof (site as Record<string, unknown>).row_parameter !== "string" ||
                      ((site as Record<string, unknown>).requires_owner_render !== undefined &&
                        typeof (site as Record<string, unknown>).requires_owner_render !== "boolean"))));
            }))) ||
        !Array.isArray(response.plan.tasks) ||
        !Array.isArray(response.plan.task_order) ||
        response.plan.tasks.some((task) => {
          if (!task || typeof task !== "object") return true;
          const candidate = task as Record<string, unknown>;
          return typeof candidate.id !== "string" ||
            typeof candidate.site_id !== "string" ||
            !Array.isArray(candidate.depends_on) ||
            !candidate.depends_on.every((dependency) => typeof dependency === "string");
        })
      ) {
        this.error(
          `Native UI compiler returned mismatched plan metadata for ${sourcePath}.`,
        );
      }
      if (!Array.isArray(response.edits)) {
        this.error(`Native UI compiler omitted source edits for ${sourcePath}.`);
      }
      const applyEdits = (editSource: string, edits: readonly NativeEdit[], output?: string) => {
        const magic = new MagicString(editSource);
        let priorEnd = 0;
        let priorStart = -1;
        let firstEdit = true;
        const isCodePointBoundary = (offset: number) => {
          if (offset <= 0 || offset >= editSource.length) return true;
          const previous = editSource.charCodeAt(offset - 1);
          const current = editSource.charCodeAt(offset);
          return !(previous >= 0xd800 && previous <= 0xdbff && current >= 0xdc00 && current <= 0xdfff);
        };
        for (const edit of edits) {
          if (
            !Number.isSafeInteger(edit.start) || !Number.isSafeInteger(edit.end) ||
            edit.start < 0 || edit.end < edit.start || edit.end > editSource.length ||
            typeof edit.replacement !== "string" ||
            (!firstEdit && (edit.start < priorEnd || edit.start === priorStart)) ||
            !isCodePointBoundary(edit.start) || !isCodePointBoundary(edit.end)
          ) {
            this.error(
              `Native UI compiler returned malformed or overlapping source edits for ${sourcePath}.`,
            );
          }
          if (edit.start === edit.end) {
            magic.appendLeft(edit.start, edit.replacement);
          } else {
            magic.overwrite(edit.start, edit.end, edit.replacement);
          }
          priorStart = edit.start;
          priorEnd = edit.end;
          firstEdit = false;
        }
        if (output !== undefined && magic.toString() !== output) {
          this.error(
            `Native UI compiler source edits did not reproduce its emitted code for ${sourcePath}.`,
          );
        }
        return magic;
      };
      const taskOutput = helperModule ? response.code : source;
      const taskMagic = applyEdits(source, response.edits, taskOutput);
      const exportName = response.plan.schema_version === 2
        ? "compiledNativeComponentPlan"
        : "compiledAsyncTaskPlan";
      let registrar = "__registerNativeSemanticPlan";
      while (new RegExp(`\\b${registrar}\\b`).test(source)) registrar += "_";
      let invalidator = "__invalidateNativeSemanticPlan";
      while (new RegExp(`\\b${invalidator}\\b`).test(source)) invalidator += "_";
      let hotListener = "__onNativeModuleRevision";
      while (new RegExp(`\\b${hotListener}\\b`).test(source)) hotListener += "_";
      const registryModule = componentModule ||
        (/(?:^|[\\/])async_task_plan\.ts$/.test(helperModule)
          ? helperModule.replace(/async_task_plan\.ts$/, "compiled_semantic_plan.ts")
          : helperModule);
      const semanticJson = JSON.stringify(response.plan.semantic_plan).replace(/</g, "\\u003c");
      const registration = `import { registerCompiledSemanticPlan as ${registrar}, invalidateCompiledSemanticPlan as ${invalidator} } from ${JSON.stringify(registryModule)};\n${registrar}(${semanticJson});\nif (import.meta.hot) {\n  const ${hotListener} = (event: { sourceFile?: string }) => { if (event?.sourceFile === ${JSON.stringify(sourcePath)}) ${invalidator}(${JSON.stringify(sourcePath)}, ${JSON.stringify(response.plan.module_revision)}); };\n  import.meta.hot.on("r3act:invalidate-native-module", ${hotListener});\n  import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", ${hotListener}));\n}\n`;
      compiledNativeFiles.add(absolutePath);
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
        return {
          code: combinedMagic.toString(),
          map: combinedMagic.generateMap({
            hires: true,
            includeContent: true,
            source: cleanId,
          }),
        };
      }
      taskMagic.prepend(registration);
      taskMagic.append(`\nexport const ${exportName} = ${serializedPlan} as const;\n`);
      return {
        code: taskMagic.toString(),
        map: taskMagic.generateMap({
          hires: true,
          includeContent: true,
          source: cleanId,
        }),
      };
    },
    handleHotUpdate(context) {
      if (!compiledNativeFiles.has(path.resolve(context.file))) return;
      const sourceFile = path.relative(sourceRoot, path.resolve(context.file)).split(path.sep).join("/");
      context.server.ws.send({
        type: "custom",
        event: "r3act:invalidate-native-module",
        data: { sourceFile },
      });
      context.server.ws.send({ type: "full-reload" });
      return [];
    },
    configureServer: shutdownOnServerClose,
    closeBundle: stopCompiler,
  };
};
