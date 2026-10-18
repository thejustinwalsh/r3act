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