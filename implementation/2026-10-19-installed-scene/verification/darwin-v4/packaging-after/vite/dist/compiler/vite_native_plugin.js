import { transformWithOxc } from "vite";
import path from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { nativeModuleCompilerPlugin, nativeRuntimeModuleFromSource } from "./vite_native_module.js";
import { generateHostJSXDeclarations, GENERATED_HOST_JSX_HEADER } from "./host_jsx_declarations.js";
export { generateHostJSXDeclarations } from "./host_jsx_declarations.js";
const emitHostDeclarations = (root, hosts) => {
    const paths = new Set();
    // Validate every destination before writing any of the configured outputs.
    const outputs = hosts.map(({ declarationFile, ...schema }) => {
        if (typeof declarationFile !== "string" || !declarationFile.endsWith(".d.ts")) {
            throw new Error("JSX host declarationFile must name a .d.ts file");
        }
        const filename = path.resolve(root, declarationFile);
        const relative = path.relative(root, filename);
        if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
            throw new Error("JSX host declarationFile must be inside the Vite project root");
        }
        if (paths.has(filename))
            throw new Error(`Duplicate JSX host declarationFile: ${declarationFile}`);
        paths.add(filename);
        const code = generateHostJSXDeclarations(schema);
        const previous = existsSync(filename) ? readFileSync(filename, "utf8") : undefined;
        if (previous !== undefined && !previous.startsWith(`${GENERATED_HOST_JSX_HEADER}\n`)) {
            throw new Error(`Refusing to overwrite authored JSX declarations: ${declarationFile}`);
        }
        return { filename, code, previous };
    });
    for (const { filename, code, previous } of outputs) {
        if (code === previous)
            continue;
        mkdirSync(path.dirname(filename), { recursive: true });
        writeFileSync(filename, code, "utf8");
    }
};
const callPluginHook = (hook, context, ...args) => {
    if (!hook)
        return undefined;
    const handler = typeof hook === "function" ? hook : hook.handler;
    return handler.apply(context, args);
};
/**
 * Compose native Rust analysis with module-local TS/JSX lowering.
 *
 * Native TSX opts in through imports from the supported native runtime API;
 * ordinary React TSX is left for the consumer's normal Vite/React pipeline.
 * The generated JSX factory import is local to compiled native modules, so
 * this plugin never changes project-wide JSX settings.
 */
export const nativeModulePlugin = (options = {}) => {
    const compiler = nativeModuleCompilerPlugin(options);
    return {
        name: "native-module",
        enforce: "pre",
        config(config) {
            // Exclude native entries from optimization so the compiler can resolve their identity.
            // Preserve the consumer's existing exclusions.
            const optimizeDeps = config.optimizeDeps ?? {};
            config.optimizeDeps = {
                ...optimizeDeps,
                exclude: [...new Set([
                        ...(optimizeDeps.exclude ?? []),
                        "@compiled-ui/runtime",
                        "@compiled-ui/runtime/core",
                        "@r3act/core",
                    ])],
            };
        },
        configResolved(config) {
            emitHostDeclarations(config.root, options.jsxHosts ?? []);
            callPluginHook(compiler.configResolved, this, config);
        },
        async transform(source, id) {
            if (!id.split("?", 1)[0].endsWith(".tsx"))
                return null;
            const compiled = await callPluginHook(compiler.transform, this, source, id);
            if (!compiled || typeof compiled === "string")
                return compiled ?? null;
            const runtimeModule = nativeRuntimeModuleFromSource(source);
            // Leave asyncTask-only modules without a native factory for downstream JSX lowering.
            if (!runtimeModule)
                return compiled;
            // Import the classic jsx/Fragment factory within this native module only.
            let factory = "__nativeJsx";
            let suffix = 0;
            while (new RegExp(`\\b${factory}\\b`).test(`${source}\n${compiled.code}`)) {
                factory = `__nativeJsx${++suffix}`;
            }
            const loweredInput = `${compiled.code}\nimport * as ${factory} from ${JSON.stringify(runtimeModule)};\n`;
            const inputMap = typeof compiled.map === "string"
                ? JSON.parse(compiled.map)
                : compiled.map;
            return await transformWithOxc(loweredInput, id.split("?", 1)[0], {
                lang: "tsx",
                jsx: {
                    runtime: "classic",
                    pragma: `${factory}.jsx`,
                    pragmaFrag: `${factory}.Fragment`,
                },
            }, inputMap ?? undefined);
        },
        handleHotUpdate(context) {
            return callPluginHook(compiler.handleHotUpdate, this, context);
        },
        configureServer: compiler.configureServer,
        closeBundle: compiler.closeBundle,
    };
};
//# sourceMappingURL=vite_native_plugin.js.map