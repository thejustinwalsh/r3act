import type { Plugin } from "vite";
import { type NativeCompilerOptions } from "./vite_native_module.ts";
import { type HostJSXDeclarationOptions } from "./host_jsx_declarations.ts";
export { generateHostJSXDeclarations } from "./host_jsx_declarations.ts";
export type { HostJSXDeclarationOptions } from "./host_jsx_declarations.ts";
export type NativeModulePluginOptions = NativeCompilerOptions & {
    /** Type-only host registration. Module paths are relative to declarationFile. */
    jsxHosts?: readonly (HostJSXDeclarationOptions & {
        declarationFile: string;
    })[];
};
type ReactExclude = string | RegExp | readonly (string | RegExp)[];
type ReactPluginFactory = (options: {
    exclude?: string | RegExp | (string | RegExp)[];
}) => Plugin[];
export type NativeReactPluginOptions<T extends {
    exclude?: ReactExclude;
}> = NativeModulePluginOptions & {
    root: string;
    /** Relative directories or TSX files to inspect when Vite creates its config. */
    sourceRoots?: readonly string[];
    reactOptions?: T;
};
/** Compose native TSX and React through the public React exclude option. */
export declare const nativeReactPlugins: <Factory extends ReactPluginFactory>(react: Factory, options: NativeReactPluginOptions<NonNullable<Parameters<Factory>[0]> & {
    exclude?: ReactExclude;
}>) => Plugin[];
/**
 * Compose native Rust analysis with module-local TS/JSX lowering.
 *
 * Native TSX opts in through imports from the supported native runtime API;
 * ordinary React TSX is left for the consumer's normal Vite/React pipeline.
 * The generated JSX factory import is local to compiled native modules, so
 * this plugin never changes project-wide JSX settings.
 */
export declare const nativeModulePlugin: (options?: NativeModulePluginOptions) => Plugin;
//# sourceMappingURL=vite_native_plugin.d.ts.map