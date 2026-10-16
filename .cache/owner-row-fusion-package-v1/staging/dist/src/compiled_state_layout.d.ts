import type { NumericColumn } from "./jsx_binding_runtime.ts";
/** Compiler-certified numeric state slots for one component site. */
export type CompiledStateLayout = Readonly<{
    schemaVersion: 1;
    /** Stable component program identity; omitted by legacy layout-v1 metadata. */
    programId?: string;
    slots: readonly Readonly<{
        siteId: string;
        slot: number;
    }>[];
}>;
/** Stable World-owned column address for a committed numeric state cell. */
export type NumericLaneAddress = Readonly<{
    column: NumericColumn;
    row: number;
    generation: number;
    owner: number;
    site: string;
}>;
/** Validate and defensively snapshot metadata once per compiler-owned object. */
export declare function normalizeCompiledStateLayout(input: CompiledStateLayout): CompiledStateLayout;
export declare function compiledStateLayoutSignature(layout: CompiledStateLayout): string;
/** Resolve a hook slot once per immutable layout descriptor. */
export declare function compiledStateLayoutSlot(layout: CompiledStateLayout, siteId: string): number | undefined;
//# sourceMappingURL=compiled_state_layout.d.ts.map