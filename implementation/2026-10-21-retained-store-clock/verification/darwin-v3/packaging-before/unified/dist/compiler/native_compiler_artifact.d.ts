export type CompilerArtifact = {
    target: string;
    platform: string;
    arch: string;
    file: string;
    sha256: string;
    bytes: number;
};
export type CompilerRuntime = {
    platform: string;
    arch: string;
    linuxLibc?: "gnu" | "musl" | "unknown";
};
/** Resolve one verified bundled compiler, or undefined when no bin directory exists. */
export declare const resolvePackagedNativeCompiler: (binDirectory: string, runtime?: CompilerRuntime) => Promise<{
    binaryPath: string;
    artifact: CompilerArtifact;
} | undefined>;
/** Check the selected executable's protocol identity before starting its service. */
export declare const verifyPackagedNativeCompiler: (binaryPath: string, artifact: CompilerArtifact) => Promise<void>;
//# sourceMappingURL=native_compiler_artifact.d.ts.map