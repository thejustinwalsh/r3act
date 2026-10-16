import type { Plugin } from "vite";
import { transformWithOxc } from "vite";
import path from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { nativeModuleCompilerPlugin, nativeRuntimeModuleFromSource, type NativeCompilerOptions } from "./vite_native_module.ts";
import { generateHostJSXDeclarations, GENERATED_HOST_JSX_HEADER, type HostJSXDeclarationOptions } from "./host_jsx_declarations.ts";

export { generateHostJSXDeclarations } from "./host_jsx_declarations.ts";
export type { HostJSXDeclarationOptions } from "./host_jsx_declarations.ts";

export type NativeModulePluginOptions = NativeCompilerOptions & {
  /** Type-only host registration. Module paths are relative to declarationFile. */
  jsxHosts?: readonly (HostJSXDeclarationOptions & { declarationFile: string })[];
};

const emitHostDeclarations = (root: string, hosts: NonNullable<NativeModulePluginOptions["jsxHosts"]>) => {
  const paths = new Set<string>();
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
    if (paths.has(filename)) throw new Error(`Duplicate JSX host declarationFile: ${declarationFile}`);
    paths.add(filename);
    const code = generateHostJSXDeclarations(schema);
    const previous = existsSync(filename) ? readFileSync(filename, "utf8") : undefined;
    if (previous !== undefined && !previous.startsWith(`${GENERATED_HOST_JSX_HEADER}\n`)) {
      throw new Error(`Refusing to overwrite authored JSX declarations: ${declarationFile}`);
    }
    return { filename, code, previous };
  });
  for (const { filename, code, previous } of outputs) {
    if (code === previous) continue;
    mkdirSync(path.dirname(filename), { recursive: true });
    writeFileSync(filename, code, "utf8");
  }
};

type HookHandler = (this: any, ...args: any[]) => any;
type HookValue<T extends HookHandler> = T | { handler: T };

const callPluginHook = <T extends HookHandler>(
  hook: HookValue<T> | undefined,
  context: ThisParameterType<T>,
  ...args: Parameters<T>
): ReturnType<T> | undefined => {
  if (!hook) return undefined;
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
export const nativeModulePlugin = (options: NativeModulePluginOptions = {}): Plugin => {
  const compiler = nativeModuleCompilerPlugin(options);
  return {
    name: "native-module",
    enforce: "pre",
    config(config) {
      // Keep the public runtime entry out of Vite's dev dependency optimizer.
      // The optimizer rewrites its identity to a generated .vite/deps module,
      // which prevents the compiler from confirming that this is the installed
      // native runtime API. Excluding this public runtime package family
      // preserves user exclusions and leaves ordinary React dependencies on
      // the normal path.
      const optimizeDeps = config.optimizeDeps ?? {};
      config.optimizeDeps = {
        ...optimizeDeps,
        exclude: [...new Set([
          ...(optimizeDeps.exclude ?? []),
          "@compiled-ui/runtime",
          "@compiled-ui/runtime/core",
        ])],
      };
    },
    configResolved(config) {
      emitHostDeclarations(config.root, options.jsxHosts ?? []);
      callPluginHook(compiler.configResolved, this, config);
    },
    async transform(source, id) {
      if (!id.split("?", 1)[0].endsWith(".tsx")) return null;
      const compiled = await callPluginHook(compiler.transform, this, source, id);
      if (!compiled || typeof compiled === "string") return compiled ?? null;

      const runtimeModule = nativeRuntimeModuleFromSource(source);
      // Marker based asyncTask-only modules remain a supported migration path.
      // Without the public native runtime module there is no correct local
      // factory to import, so leave their JSX for the configured Vite pipeline.
      if (!runtimeModule) return compiled;
      // The native runtime exports the classic factory ABI (`jsx` and
      // `Fragment`). Keeping this import scoped to this source module avoids
      // changing JSX behavior in React modules in the same Vite project.
      let factory = "__nativeJsx";
      let suffix = 0;
      while (new RegExp(`\\b${factory}\\b`).test(`${source}\n${compiled.code}`)) {
        factory = `__nativeJsx${++suffix}`;
      }
      const loweredInput = `${compiled.code}\nimport * as ${factory} from ${JSON.stringify(runtimeModule)};\n`;
      const inputMap = typeof compiled.map === "string"
        ? JSON.parse(compiled.map) as object
        : compiled.map;
      return await transformWithOxc(
        loweredInput,
        id.split("?", 1)[0],
        {
          lang: "tsx",
          jsx: {
            runtime: "classic",
            pragma: `${factory}.jsx`,
            pragmaFrag: `${factory}.Fragment`,
          },
        },
        inputMap ?? undefined,
      );
    },
    configureServer: compiler.configureServer,
    closeBundle: compiler.closeBundle,
  };
};
