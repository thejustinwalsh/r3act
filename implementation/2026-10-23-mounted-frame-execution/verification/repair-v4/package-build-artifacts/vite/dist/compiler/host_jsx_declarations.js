/**
 * Generate the small declaration shim that connects a host's intrinsic map to
 * both automatic JSX runtimes. The host map owns its schema; this module only
 * wires its type to the module namespace supplied by the caller.
 */
/** Stable marker used to identify generator-owned declaration files. */
export const GENERATED_HOST_JSX_HEADER = "// Generated host JSX declarations. Do not edit by hand.";
const validateModuleSpecifier = (name, value) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new TypeError(`${name} must be a non-empty module specifier`);
    }
    // Module specifiers are emitted as string literals, but line/control
    // characters are almost always a configuration mistake and make generated
    // declarations hard to inspect. JSON quoting handles quotes and backslashes.
    if (/[\u0000-\u001f\u007f]/u.test(value)) {
        throw new TypeError(`${name} must not contain control characters`);
    }
    return value;
};
const reservedIdentifiers = new Set([
    "as", "asserts", "async", "await", "break", "case", "catch", "class", "const",
    "constructor", "continue", "debugger", "declare", "default", "delete", "do", "else",
    "enum", "export", "extends", "false", "finally", "for", "from", "function", "get",
    "if", "implements", "import", "in", "infer", "instanceof", "interface", "is", "keyof",
    "let", "module", "namespace", "never", "new", "null", "of", "package", "private",
    "protected", "public", "readonly", "require", "return", "satisfies", "set", "static",
    "super", "switch", "symbol", "this", "throw", "true", "try", "type", "typeof", "unique",
    "unknown", "using", "var", "void", "while", "with", "yield",
]);
const validateExportIdentifier = (value) => {
    if (typeof value !== "string"
        || !/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(value)
        || reservedIdentifiers.has(value)) {
        throw new TypeError("intrinsicMapExport must be a valid non-reserved identifier");
    }
    return value;
};
/**
 * Emit deterministic, type-only JSX declarations for a host intrinsic map.
 * The generator intentionally does not inspect or infer the host map itself.
 */
export const generateHostJSXDeclarations = ({ namespaceModule, intrinsicMapModule, intrinsicMapExport, jsxImportSource, }) => {
    const namespaceSpecifier = validateModuleSpecifier("namespaceModule", namespaceModule);
    const mapSpecifier = validateModuleSpecifier("intrinsicMapModule", intrinsicMapModule);
    const jsxSource = validateModuleSpecifier("jsxImportSource", jsxImportSource).replace(/\/+$/u, "");
    if (jsxSource.length === 0) {
        throw new TypeError("jsxImportSource must include a package or module name");
    }
    const mapExport = validateExportIdentifier(intrinsicMapExport);
    const runtimeType = "__GeneratedHostJSXIntrinsicElements";
    const mapAlias = "__HostIntrinsicMap";
    const runtimeModules = [`${jsxSource}/jsx-runtime`, `${jsxSource}/jsx-dev-runtime`];
    return [
        GENERATED_HOST_JSX_HEADER,
        `import type { ${mapExport} as ${mapAlias} } from ${JSON.stringify(mapSpecifier)};`,
        `type ${runtimeType} = ${mapAlias}<typeof import(${JSON.stringify(namespaceSpecifier)})>;`,
        ...runtimeModules.map((runtimeModule) => `import type {} from ${JSON.stringify(runtimeModule)};`),
        ...runtimeModules.flatMap((runtimeModule) => [
            `declare module ${JSON.stringify(runtimeModule)} {`,
            "  namespace JSX {",
            `    interface IntrinsicElements extends ${runtimeType} {}`,
            "  }",
            "}",
        ]),
        "",
    ].join("\n");
};
//# sourceMappingURL=host_jsx_declarations.js.map