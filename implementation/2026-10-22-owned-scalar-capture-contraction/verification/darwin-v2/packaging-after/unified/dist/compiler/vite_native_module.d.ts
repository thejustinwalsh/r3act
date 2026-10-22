import { type Plugin } from "vite";
/** The statically verifiable native runtime import used by a component module. */
export declare const nativeRuntimeModuleFromSource: (source: string, importer: string) => string;
export declare const nativeModuleCandidateFromSource: (source: string, importer: string) => boolean;
export declare const isNativeTransformRequest: (id: string) => boolean;
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
    /** Source-derived React exclusions fixed when the Vite config was created. */
    reactBoundary?: {
        excludedFiles: ReadonlySet<string>;
        sourceRoots: readonly string[];
    };
};
export declare const nativeModuleCompilerPlugin: (options?: NativeCompilerOptions) => Plugin;
//# sourceMappingURL=vite_native_module.d.ts.map