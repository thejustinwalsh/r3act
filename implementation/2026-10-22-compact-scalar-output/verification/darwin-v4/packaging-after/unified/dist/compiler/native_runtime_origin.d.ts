export declare const publicRuntimeModules: readonly ["@r3act/core", "@compiled-ui/runtime", "@compiled-ui/runtime/core"];
export declare const isRuntimeOriginFile: (filename: string) => boolean;
export declare const isStaticRuntimeImport: (specifier: string, importer: string) => boolean;
export declare const isResolvedRuntimeImport: (specifier: string, importer: string, resolved?: {
    id: string;
    external?: boolean | string;
} | null, hasResolver?: boolean) => boolean;
//# sourceMappingURL=native_runtime_origin.d.ts.map