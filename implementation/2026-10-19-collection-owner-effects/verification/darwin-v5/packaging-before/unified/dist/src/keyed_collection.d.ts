/**
 * A keyed, insertion-ordered collection for compiler-proven sparse edits.
 *
 * `.map` takes an O(N) snapshot. Compiler lowering uses that same snapshot
 * contract for generic renders; arbitrary method replacement is unsupported.
 */
export type KeyedCollectionEntry<T> = Readonly<{
    key: string;
    value: T;
}>;
export type KeyedCollectionOperation<T> = Readonly<{
    type: "insert";
    key: string;
    value: T;
    beforeKey: string | null;
}> | Readonly<{
    type: "remove";
    key: string;
}> | Readonly<{
    type: "move";
    key: string;
    beforeKey: string | null;
}> | Readonly<{
    type: "replace";
    key: string;
    value: T;
}>;
export type KeyedCollectionBatch<T> = Readonly<{
    fromVersion: number;
    version: number;
    operations: readonly KeyedCollectionOperation<T>[];
}>;
export type KeyedCollectionRead<T> = Readonly<{
    status: "available";
    fromVersion: number;
    toVersion: number;
    batches: readonly KeyedCollectionBatch<T>[];
}> | Readonly<{
    status: "unavailable";
    requestedVersion: number;
    oldestAvailableVersion: number;
    currentVersion: number;
}>;
export type KeyedCollectionApplyResult = Readonly<{
    ok: true;
    version: number;
}> | Readonly<{
    ok: false;
    reason: "stale-version" | "invalid-operation";
    version: number;
}>;
export type KeyedCollectionStats = Readonly<{
    entryInspections: number;
    anchorInspections: number;
    retainedBatches: number;
    readerCount: number;
    listenerNotifications: number;
    listenerErrors: number;
}>;
export type KeyedCollectionReader<T> = Readonly<{
    read(): KeyedCollectionRead<T>;
    /** Acknowledge only a version returned by the latest read. */
    acknowledge(version: number): boolean;
    /** Reset after a fallback snapshot only if that snapshot's version is current. */
    resetTo(version: number): boolean;
    detach(): void;
}>;
/** @internal Read the creator-owned collection version without public getters. */
export declare const canonicalCollectionVersion: (collection: unknown) => number | null;
/** @internal Opaque creator-owned entry identity for a live key. */
export declare const canonicalCollectionEntry: (collection: unknown, key: string) => object | undefined;
/** @internal Verify public methods without executing caller-replaceable getters. */
export declare const canonicalCollectionApiIntact: (collection: unknown) => boolean;
/** @internal Stage exact acceptance; the callback reports whether the reader caught up. */
export declare function prepareCollectionReaderAcknowledgement(reader: KeyedCollectionReader<unknown>, version: number): (() => boolean) | null;
export type KeyedCollectionListener<T> = (batch: KeyedCollectionBatch<T>) => void;
/**
 * Create an ordered keyed collection with independent, versioned readers.
 * Key/anchor lookup is Map-backed; edits link/unlink entries without copying
 * the sibling list. History is capped by `maxRetainedBatches`; lagging readers
 * receive `unavailable` and should ask their owner for a generic snapshot.
 * Payload values are retained by reference and must be treated as immutable by
 * callers; operation descriptors and batches are copied and frozen here.
 * `.map` is an O(N) generic snapshot operation. Compiler lowering may replace
 * a proven collection row-map with versioned region rendering.
 */
export declare function createKeyedCollection<T>(initial: readonly T[], keyOf: (value: T) => string, options?: Readonly<{
    maxRetainedBatches?: number;
}>): {
    readonly version: number;
    readonly size: number;
    readonly firstKey: string | null;
    readonly lastKey: string | null;
    has(key: string): boolean;
    get(key: string): T | undefined;
    /** Return an adjacent key, null at the edge, or undefined if missing. */
    previousKey(key: string): string | null | undefined;
    /** Return an adjacent key, null at the edge, or undefined if missing. */
    nextKey(key: string): string | null | undefined;
    /** O(N), intended for initial materialization or generic fallback. */
    snapshot(): readonly KeyedCollectionEntry<T>[];
    /** O(N) generic fallback; callback receives only the row value, never index. */
    map<U>(render: (value: T) => U): U[];
    apply(expectedVersion: number, operations: readonly KeyedCollectionOperation<T>[]): KeyedCollectionApplyResult;
    subscribe(listener: KeyedCollectionListener<T>): () => void;
    createReader(): KeyedCollectionReader<T>;
    stats(): KeyedCollectionStats;
    resetStats(): void;
};
/** Public structural type for consumers that need to name the collection. */
export type KeyedCollection<T> = ReturnType<typeof createKeyedCollection<T>>;
//# sourceMappingURL=keyed_collection.d.ts.map