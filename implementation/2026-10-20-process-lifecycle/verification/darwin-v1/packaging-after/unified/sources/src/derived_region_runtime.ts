/** Compact source-to-derived-region dispatch for compiler-emitted plans. */
export type DerivedRegionGraph = Readonly<{
  source_count: number;
  source_paths: readonly string[];
  source_region_offsets: readonly number[];
  region_ids: readonly number[];
}>;

export class DerivedRegionDispatcher {
  readonly #pending: Uint8Array;
  #pendingRegions: number[] = [];
  #processingRegions: number[] = [];

  constructor(readonly graph: DerivedRegionGraph) {
    const { source_count, source_paths, source_region_offsets, region_ids } = graph;
    if (!Number.isInteger(source_count) || source_count < 0 ||
      source_paths.length !== source_count || source_region_offsets.length !== source_count + 1 ||
      source_region_offsets[0] !== 0 || source_region_offsets[source_count] !== region_ids.length) {
      throw new Error("Malformed derived-region CSR graph");
    }
    let regionCount = 0;
    for (let source = 0; source < source_count; source++) {
      const start = source_region_offsets[source];
      const end = source_region_offsets[source + 1];
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > region_ids.length) {
        throw new Error(`Malformed derived-region source range at slot ${source}`);
      }
    }
    for (const region of region_ids) {
      if (!Number.isInteger(region) || region < 0) throw new Error("Derived-region graph contains an invalid region ID");
      regionCount = Math.max(regionCount, region + 1);
    }
    this.#pending = new Uint8Array(regionCount);
  }

  invalidateSourceSlot(sourceSlot: number) {
    const { source_count, source_region_offsets, region_ids } = this.graph;
    if (!Number.isInteger(sourceSlot) || sourceSlot < 0 || sourceSlot >= source_count) {
      throw new RangeError(`Derived-region source slot out of range: ${sourceSlot}`);
    }
    for (let edge = source_region_offsets[sourceSlot]; edge < source_region_offsets[sourceSlot + 1]; edge++) {
      const region = region_ids[edge];
      if (this.#pending[region] === 0) {
        this.#pending[region] = 1;
        this.#pendingRegions.push(region);
      }
    }
  }

  /** Run each invalidated region once, in first-invalidation order. */
  flush(runRegion: (regionId: number) => void) {
    const processing = this.#pendingRegions;
    this.#pendingRegions = this.#processingRegions;
    this.#processingRegions = processing;
    this.#pendingRegions.length = 0;
    let index = 0;
    try {
      for (; index < processing.length; index++) {
        const region = processing[index];
        this.#pending[region] = 0;
        runRegion(region);
      }
      return processing.length;
    } finally {
      // A failed callback must not strand the remaining dirty bits. New work
      // queued reentrantly lives in the other reusable array.
      for (; index < processing.length; index++) this.#pending[processing[index]] = 0;
      processing.length = 0;
    }
  }
}
