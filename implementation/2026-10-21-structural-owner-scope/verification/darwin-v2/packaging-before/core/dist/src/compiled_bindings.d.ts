/**
 * Small pure-JavaScript prototype of compiler-emitted scalar prop bindings.
 *
 * This models the graph/runtime fast path only. It is not a React renderer,
 * does not model DOM or Three setter costs, and does not claim React timings.
 */
export type BindingEdge = readonly [source: number, target: number];
export interface FlushStats {
    changedSources: number;
    bindingVisits: number;
    hostWrites: number;
}
export declare class CompiledBindings {
    #private;
    readonly sourceValues: Float64Array;
    readonly hostValues: Float64Array;
    constructor(sourceCount: number, targetCount: number, edges: readonly BindingEdge[]);
    set(source: number, value: number): boolean;
    flush(writeHost?: (target: number, value: number) => void, collectStats?: boolean): FlushStats | undefined;
}
//# sourceMappingURL=compiled_bindings.d.ts.map