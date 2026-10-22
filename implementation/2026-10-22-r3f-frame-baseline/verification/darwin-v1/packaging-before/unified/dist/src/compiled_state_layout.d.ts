import type { NumericColumn } from "./jsx_binding_runtime.ts";
/** Compiler-certified numeric state slots for one component site. */
export type CompiledStateLayout = Readonly<{
    schemaVersion: 1;
    /** Stable component program identity; omitted by legacy layout-v1 metadata. */
    programId?: string;
    /** Source revision that emitted this layout and its executable program. */
    moduleRevision?: string;
    slots: readonly Readonly<{
        siteId: string;
        slot: number;
    }>[];
}>;
/** A primitive value accepted by the compiler-emitted owner update kernel. */
export type CompiledOwnerUpdatePrimitive = number | string | boolean | null | undefined;
/** Existing prepared sink value inspected by an owner update kernel. */
export type CompiledOwnerUpdateSink = Readonly<{
    lastValue: unknown;
}>;
/** Existing prepared row state shared by generic and compiled execution. */
export type CompiledOwnerUpdateRowState = {
    readonly inputValues: readonly number[];
    readonly sinks: readonly CompiledOwnerUpdateSink[];
    seenMask: number;
};
/** Static primitive-only update kernel attached to one normalized layout. */
export type CompiledOwnerUpdateProgram = Readonly<{
    /** V3/V5 require retained-child admission; V4/V5 support ranged execution. */
    schemaVersion: 2 | 3 | 4 | 5;
    programId: string;
    slotCount: number;
    sinkIds: readonly string[];
    /**
     * Execute `changeCount` inputs. V4/V5 read whole-cut `changedSlots` and
     * `rowStates` from `inputStart`, append at `outputStart`, and return the
     * number appended rather than the absolute output end.
     */
    executeCut: (changedSlots: Uint32Array, changeCount: number, rowStates: readonly (CompiledOwnerUpdateRowState | undefined)[], stagedInputIndices: Uint32Array, stagedSinkIds: Uint16Array, stagedValues: CompiledOwnerUpdatePrimitive[], 
    /** Absolute first input in whole-cut buffers; omitted for V2/V3. */
    inputStart?: number, 
    /** Absolute first output in whole-cut buffers; omitted for V2/V3. */
    outputStart?: number) => number;
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
/** Validate and associate one immutable owner update program with a layout. */
export declare function associateCompiledOwnerUpdateProgram(layout: CompiledStateLayout, input: CompiledOwnerUpdateProgram): CompiledOwnerUpdateProgram;
/** Resolve a program during VDOM row preparation, not during cut execution. */
export declare function compiledOwnerUpdateProgramFor(layout: CompiledStateLayout): CompiledOwnerUpdateProgram | undefined;
//# sourceMappingURL=compiled_state_layout.d.ts.map