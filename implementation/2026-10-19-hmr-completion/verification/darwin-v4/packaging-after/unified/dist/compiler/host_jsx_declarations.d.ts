/**
 * Generate the small declaration shim that connects a host's intrinsic map to
 * both automatic JSX runtimes. The host map owns its schema; this module only
 * wires its type to the module namespace supplied by the caller.
 */
export interface HostJSXDeclarationOptions {
    /** Module whose exports form the host namespace (for example, a host API). */
    namespaceModule: string;
    /** Module exporting the generic intrinsic-map type. */
    intrinsicMapModule: string;
    /** Named export of `intrinsicMapModule` that accepts the namespace type. */
    intrinsicMapExport: string;
    /** JSX import source without the `/jsx-runtime` suffix. */
    jsxImportSource: string;
}
/** Stable marker used to identify generator-owned declaration files. */
export declare const GENERATED_HOST_JSX_HEADER = "// Generated host JSX declarations. Do not edit by hand.";
/**
 * Emit deterministic, type-only JSX declarations for a host intrinsic map.
 * The generator intentionally does not inspect or infer the host map itself.
 */
export declare const generateHostJSXDeclarations: ({ namespaceModule, intrinsicMapModule, intrinsicMapExport, jsxImportSource, }: HostJSXDeclarationOptions) => string;
//# sourceMappingURL=host_jsx_declarations.d.ts.map