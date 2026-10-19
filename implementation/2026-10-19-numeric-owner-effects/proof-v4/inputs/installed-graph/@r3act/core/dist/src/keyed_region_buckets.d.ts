export type KeyedRegionEntry<T> = {
    key: string;
    value: T;
};
export type KeyedRegionBucketStats = {
    bucketSlotReads: number;
    bucketSlotWrites: number;
    splits: number;
    merges: number;
    bucketCount: number;
};
/**
 * Ordered keyed rows with direct key lookup and bounded local edits.
 *
 * Iteration is intentionally linear; it is for initial materialization and
 * snapshots. Replace/remove/insert/move use the key index and touch one or two
 * buckets. When a bucket fills, it splits in half; sparse neighbors merge.
 */
export declare class KeyedRegionBuckets<T> {
    #private;
    readonly bucketCapacity: number;
    constructor(entries: readonly KeyedRegionEntry<T>[], bucketCapacity?: number);
    get size(): number;
    get bucketCount(): number;
    has(key: string): boolean;
    get(key: string): T | undefined;
    beforeKey(key: string): string | null;
    afterKey(key: string): string | null;
    replace(oldKey: string, newKey: string, value: T): void;
    insertBefore(anchorKey: string | null, key: string, value: T): void;
    remove(key: string): T;
    moveBefore(key: string, anchorKey: string | null): void;
    entries(): IterableIterator<KeyedRegionEntry<T>>;
    /** Allocation-free full scan for snapshots and dense region work. */
    forEach(visitor: (key: string, value: T) => void): void;
    stats(): KeyedRegionBucketStats;
    resetStats(): void;
    /** Full consistency check for experiment integrity, not a hot-path method. */
    assertIntegrity(): void;
}
//# sourceMappingURL=keyed_region_buckets.d.ts.map