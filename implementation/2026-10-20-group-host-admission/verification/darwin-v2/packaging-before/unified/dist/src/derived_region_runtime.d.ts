/** Compact source-to-derived-region dispatch for compiler-emitted plans. */
export type DerivedRegionGraph = Readonly<{
    source_count: number;
    source_paths: readonly string[];
    source_region_offsets: readonly number[];
    region_ids: readonly number[];
}>;
export declare class DerivedRegionDispatcher {
    #private;
    readonly graph: DerivedRegionGraph;
    constructor(graph: DerivedRegionGraph);
    invalidateSourceSlot(sourceSlot: number): void;
    /** Run each invalidated region once, in first-invalidation order. */
    flush(runRegion: (regionId: number) => void): number;
}
//# sourceMappingURL=derived_region_runtime.d.ts.map