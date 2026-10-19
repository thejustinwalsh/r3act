import type { Plugin } from "vite";
import { transformWithOxc } from "vite";
import path from "node:path";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { isNativeTransformRequest, nativeModuleCandidateFromSource, nativeModuleCompilerPlugin, nativeRuntimeModuleFromSource, type NativeCompilerOptions } from "./vite_native_module.ts";
import { generateHostJSXDeclarations, GENERATED_HOST_JSX_HEADER, type HostJSXDeclarationOptions } from "./host_jsx_declarations.ts";

export { generateHostJSXDeclarations } from "./host_jsx_declarations.ts";
export type { HostJSXDeclarationOptions } from "./host_jsx_declarations.ts";

export type NativeModulePluginOptions = NativeCompilerOptions & {
  /** Type-only host registration. Module paths are relative to declarationFile. */
  jsxHosts?: readonly (HostJSXDeclarationOptions & { declarationFile: string })[];
};

type ReactExclude = string | RegExp | readonly (string | RegExp)[];

export type NativeReactPluginOptions<T extends { exclude?: ReactExclude }> = NativeModulePluginOptions & {
  root: string;
  /** Relative directories or TSX files to inspect when Vite creates its config. */
  sourceRoots?: readonly string[];
  reactOptions?: T;
};

const scanNativeFiles = (root: string, sourceRoots: readonly string[]): Set<string> => {
  const files = new Set<string>();
  const skipped = new Set(["node_modules", "dist", "build", "coverage", "implementation", "results"]);
  const visit = (filename: string) => {
    if (!existsSync(filename)) return;
    const entries = readdirSync(filename, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || skipped.has(entry.name)) continue;
      const child = path.join(filename, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile() && child.endsWith(".tsx") &&
        nativeModuleCandidateFromSource(readFileSync(child, "utf8"))) files.add(path.resolve(child));
    }
  };
  for (const sourceRoot of sourceRoots) {
    const location = path.resolve(root, sourceRoot);
    const relative = path.relative(root, location);
    if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error(`Native React source root must stay inside the Vite root: ${sourceRoot}`);
    }
    if (location.endsWith(".tsx")) {
      if (existsSync(location) && nativeModuleCandidateFromSource(readFileSync(location, "utf8"))) files.add(location);
    } else visit(location);
  }
  return files;
};

/** Compose native TSX and React through the public React exclude option. */
export const nativeReactPlugins = <T extends { exclude?: ReactExclude }>(
  react: (options: T) => Plugin[],
  options: NativeReactPluginOptions<T>,
): Plugin[] => {
  const { reactOptions, sourceRoots = ["."], ...nativeOptions } = options;
  const root = path.resolve(options.root);
  const excludedFiles = scanNativeFiles(root, sourceRoots);
  const userExclude = reactOptions?.exclude;
  const userPatterns = userExclude === undefined ? [] : Array.isArray(userExclude) ? userExclude : [userExclude];
  const exactNativePatterns = [...excludedFiles].map((filename) =>
    new RegExp(`^${filename.replaceAll(path.sep, "/").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\?.*)?$`)
  );
  const combined = {
    ...reactOptions,
    exclude: [/\/node_modules\//, ...userPatterns, ...exactNativePatterns],
  } as T;
  const resolvedSourceRoots = sourceRoots.map((entry) => path.resolve(root, entry));
  return [nativeModulePlugin({
    ...nativeOptions,
    root,
    reactBoundary: { excludedFiles, sourceRoots: resolvedSourceRoots },
  }), ...react(combined)];
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
      if (!isNativeTransformRequest(id)) return null;
      const compiled = await callPluginHook(compiler.transform, this, source, id);
      if (!compiled || typeof compiled === "string") return compiled ?? null;

      const runtimeModule = nativeRuntimeModuleFromSource(source);
      // Leave asyncTask-only modules without a native factory for downstream JSX lowering.
      if (!runtimeModule) return compiled;
      // Import the classic jsx/Fragment factory within this native module only.
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
    handleHotUpdate(context) {
      return callPluginHook(compiler.handleHotUpdate, this, context);
    },
    configureServer: compiler.configureServer,
    closeBundle: compiler.closeBundle,
  };
};
