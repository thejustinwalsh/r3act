/** Read-only compiler proof and capability hints for one native module revision. */
export type CompiledSemanticPlan = Readonly<{
    schema_version: 1;
    source_file: string;
    module_revision: string;
    owners: readonly Readonly<{
        site_id: string;
        repeated_scope: "runtime-keyed-owner";
    }>[];
    sources: readonly Readonly<{
        site_id: string;
        owner_site_id: string;
        kind: "state" | "use-input";
        provenance: "tracked" | "opaque";
    }>[];
    sinks: readonly Readonly<{
        site_id: string;
        owner_site_id: string;
        source_sites: readonly string[];
        provenance: "closed" | "opaque";
        equality: "object-is" | "adapter-declared";
        host_value: "scalar" | "adapter-declared";
        retention: "value" | "adapter-declared";
        execution: "compiled-binding" | "generic";
    }>[];
    operations: readonly Readonly<{
        site_id: string;
        owner_site_id: string | null;
        kind: "use-store-or-resource" | "collection" | "activation-effect" | "async-task";
        provenance: "opaque";
        source_sites: readonly string[];
    }>[];
    graph: Readonly<{
        coverage: "proven-sinks-only";
        source_to_sinks: Readonly<Record<string, readonly string[]>>;
        execution_order: readonly string[];
    }>;
}>;
export type CompiledSemanticRevisionChange = Readonly<{
    sourceFile: string;
    previousRevision: string;
    nextRevision: string | null;
}>;
declare const planIdentity: unique symbol;
export type CompiledSemanticRevisionToken = Readonly<{
    sourceFile: string;
    moduleRevision: string;
    [planIdentity]: CompiledSemanticPlan;
}>;
/** Register inspection metadata; callers must never treat this public value as purity proof. */
export declare function registerCompiledSemanticPlan(input: CompiledSemanticPlan): CompiledSemanticPlan;
/** Inspect compiler evidence without granting purity to extension metadata. */
export declare function inspectCompiledSemanticPlan(sourceFile: string): CompiledSemanticPlan | undefined;
export declare function compiledSemanticRevision(sourceFile: string): string | undefined;
/** Capture the registered plan identity before preparing work from its module. */
export declare function captureCompiledSemanticRevision(sourceFile: string, expectedRevision?: string): CompiledSemanticRevisionToken | undefined;
/** A retired plan stays stale even if the same revision string registers again. */
export declare function isCompiledSemanticRevisionCurrent(token: CompiledSemanticRevisionToken): boolean;
/** Revoke work compiled before a module edit, prior to conservative full reload. */
export declare function invalidateCompiledSemanticPlan(sourceFile: string, expectedRevision?: string): boolean;
export declare function subscribeCompiledSemanticRevision(listener: (change: CompiledSemanticRevisionChange) => void): () => void;
export {};
//# sourceMappingURL=compiled_semantic_plan.d.ts.map