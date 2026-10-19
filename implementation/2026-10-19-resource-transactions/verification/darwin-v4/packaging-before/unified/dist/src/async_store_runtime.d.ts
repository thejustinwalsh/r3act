export { storeRecord } from "./owned_store_record.ts";
/**
 * Defer store subscribers until a synchronous multi-store publication finishes.
 * State and root-pointer mutations remain synchronous; this does not roll back
 * mutations if `callback` throws. Nested calls join the outer publication.
 *
 * Notifications are drained even when the callback throws. If both the callback
 * and listeners throw, the resulting AggregateError contains the original
 * callback error and every listener/drain error.
 */
export declare function batchStorePublication<T>(callback: () => T): T;
export type StoreAction<S, A> = A | ((previous: S) => S);
export type StorePriority = {
    kind: "urgent";
} | {
    kind: "transition";
    transitionId: string;
};
export type StoreReadOptions = {
    /** Transition updates to include while preparing that candidate. */
    transitions?: readonly string[];
};
export type StoreChange = {
    rootId: string;
    storeVersion: number;
    state: unknown;
    priority: StorePriority;
};
type PendingReaderValues = ReadonlyMap<object, unknown> | null;
type PreparedReaderValues = {
    readonly rootReaders: Map<string, Map<object, unknown>>;
    readonly isNewRoot: boolean;
    readonly entries: Map<string, Map<object, unknown> | null>;
};
export type StoreRead<S> = {
    readonly value: S;
    /** Call only after the renderer commits the read that produced this value. */
    commit(): void;
};
/** A read-site context so chained selections get their own previous values. */
export declare class StoreReadSession {
    readonly rootId: string;
    readonly readerId: string;
    /** Immutable projections pinned when this root began its render. */
    readonly snapshotStates: ReadonlyMap<object, unknown>;
    readonly transitions: ReadonlySet<string>;
    readonly previous: ReadonlyMap<object, unknown>;
    readonly next: Map<object, unknown>;
    constructor(rootId: string, readerId: string, transitions: readonly string[], previous: ReadonlyMap<object, unknown>, 
    /** Immutable projections pinned when this root began its render. */
    snapshotStates: ReadonlyMap<object, unknown>);
}
/** Advanced adapter protocol: declare every store source read by this source. */
export declare const storeDependencies: unique symbol;
export interface StoreSource<S> {
    readonly [storeDependencies]?: readonly StoreSource<unknown>[];
    read(session: StoreReadSession): S;
}
/**
 * A render transaction for one root. Every read uses the same projected state;
 * callers validate immediately before host commit and publish selector history
 * only after that commit succeeds.
 */
export declare class StoreRenderSnapshot<S, A = StoreAction<S, S>> {
    #private;
    private readonly store;
    readonly rootId: string;
    private readonly options;
    readonly state: S;
    readonly version: number;
    private readonly rootEpoch;
    /** Legacy name for canonical callback-free capture, including selected record paths. */
    readonly closedNumeric: boolean;
    constructor(store: AsyncStore<S, A>, rootId: string, options: StoreReadOptions, state: S, version: number, rootEpoch: object, 
    /** Legacy name for canonical callback-free capture, including selected record paths. */
    closedNumeric?: boolean);
    read<T>(source: StoreSource<T>, readerId: string): T;
    /** False means discard/rebuild the candidate; never publish a mixed render. */
    validate(): boolean;
    validatePublicationInputs(): boolean;
    /** Call after host commit. Repeated calls are harmless. */
    commit(): void;
    /** Publish selector history after a renderer's pre-host-commit validation. */
    commitAfterValidatedRender(): void;
}
/** A derived store. Its previous value belongs to the read site, not the node. */
export declare class StoreSelection<T> implements StoreSource<T> {
    private readonly sources;
    private readonly selector;
    constructor(sources: readonly StoreSource<unknown>[], selector: (states: readonly unknown[], previous: T | undefined) => T);
    /** Immutable declared dependencies used to pin a complete root read set. */
    get dependencies(): readonly StoreSource<unknown>[];
    read(session: StoreReadSession): T;
    select<U>(selector: (value: T, previous: U | undefined) => U): StoreSelection<U>;
}
/** A derived read over one or more stores; previous values remain per reader. */
export declare function createStoreSelector<T>(sources: readonly StoreSource<unknown>[], selector: (states: readonly unknown[], previous: T | undefined) => T): StoreSelection<T>;
/**
 * An action-log store. Roots are explicit so a transition can hold the roots
 * that are still showing their previous state while other roots catch up.
 */
export declare class AsyncStore<S, A = StoreAction<S, S>> implements StoreSource<S> {
    #private;
    private readonly reducer;
    constructor(initialState: S, reducer?: (state: S, action: A) => S);
    /** Latest chronological value, including transition updates not yet shown. */
    getState(): S;
    get version(): number;
    /** Internal transaction clock; only participating stores constrain a read cut. */
    get mutationEpoch(): number;
    /** Version of the state this root can currently observe. */
    getRootVersion(rootId: string): number;
    /** Capture one immutable store projection for a root render. */
    beginRender(rootId: string, options?: StoreReadOptions): StoreRenderSnapshot<S, A>;
    /** Capture canonical Store state and selected values before registering a root. */
    _beginClosedProjectionRender(rootId: string, paths: readonly (readonly string[])[]): {
        snapshot: StoreRenderSnapshot<S, A>;
        values: readonly number[];
    } | null;
    /** Legacy direct numeric capture uses the same canonical projection path. */
    _beginClosedNumericRender(rootId: string): StoreRenderSnapshot<S, A> | null;
    _isClosedNumericCanonical(): boolean;
    select<T>(selector: (state: S, previous: T | undefined) => T): StoreSelection<T>;
    /** Register roots that may hold a transition update while it is pending. */
    beginTransition(transitionId: string, rootIds: readonly string[]): void;
    hasTransition(transitionId: string): boolean;
    transitionRoots(transitionId: string): readonly string[];
    /**
     * Dispatch in chronological order. A transition dispatch joins its explicit
     * transaction; it is not inferred from ambient async context.
     */
    dispatch(action: A, priority?: StorePriority): boolean;
    /** Mark the async action scope closed; non-participating roots may catch up. */
    finishTransition(transitionId: string): void;
    /**
     * Publish this transition's actions to one root after that root commits its
     * prepared UI. Call for each root in a coordinated host commit when needed.
     */
    commitTransition(transitionId: string, rootId: string): void;
    /**
     * Publish one transition to a coordinated root set. All projection/version
     * mutations happen before the first subscriber is notified, so observers
     * cannot see a partially committed group through this store.
     */
    commitTransitionRoots(transitionId: string, rootIds: readonly string[], options?: {
        finish?: boolean;
    }): void;
    /**
     * Release a root whose candidate was abandoned; its queued actions remain.
     * Releasing a nonparticipant in a known scope is a no-op. Unknown scope IDs
     * still indicate a protocol error.
     */
    releaseTransition(transitionId: string, rootId: string): void;
    /**
     * Detach a root and release all store-owned state associated with it.
     * Snapshots captured before detachment become stale, and a later root using
     * the same ID starts from the current store projection. Detaching the last
     * participant releases its root hold but does not finish the async action
     * scope; its owner must still call finishTransition explicitly.
     */
    detachRoot(rootId: string): void;
    /**
     * Project the log for a root. `options.transitions` is the candidate lane
     * being rendered; without it, unresolved transitions remain hidden from
     * roots that are still waiting on them.
     */
    getStateForRoot(rootId: string, options?: StoreReadOptions): S;
    /** Read a store/selection with read-site-local previous selection values. */
    read<T>(source: StoreSource<T>, rootId: string, readerId: string, options?: StoreReadOptions): StoreRead<T>;
    /** A store itself is also a source for a chained selection. */
    read(session: StoreReadSession): S;
    /** Internal reader used by a pinned render snapshot. */
    _readAtSnapshot<T>(source: StoreSource<T>, rootId: string, readerId: string, transitions: readonly string[], snapshotStates: ReadonlyMap<object, unknown>, pending: Map<string, Map<object, unknown>>): T;
    /** Read-only committed selection history, never mutated during preparation. */
    _readerValuesFor(rootId: string, readerId: string): ReadonlyMap<object, unknown>;
    diagnostics(): Readonly<{
        roots: number;
        listeners: number;
        readers: number;
        retainedActions: number;
        transitions: number;
    }>;
    _commitReaderValues(rootId: string, pending: Map<string, Map<object, unknown>>): void;
    _prepareReaderValues(rootId: string, pending: ReadonlyMap<string, PendingReaderValues>): PreparedReaderValues;
    _publishPreparedReaderValues(rootId: string, prepared: PreparedReaderValues): void;
    _validateRender(rootId: string, version: number, rootEpoch: object): boolean;
    _validateRenderLineage(rootId: string, version: number, rootEpoch: object): boolean;
    /** Drop read-site selector history when its owning component is removed. */
    forgetReader(rootId: string, readerId: string): void;
    subscribe(rootId: string, listener: (change: StoreChange) => void): () => void;
    /** Internal notification drain used by the cross-store publication queue. */
    _drainNotifications(): void;
}
export declare function createAsyncStore<S>(initialState: S): AsyncStore<S>;
export declare function createAsyncStore<S, A>(initialState: S, reducer: (state: S, action: A) => S): AsyncStore<S, A>;
/** Erased store participant type used only by root transaction machinery. */
export type AnyAsyncStore = AsyncStore<any, any>;
/** Opaque savepoint owned by the transaction that created it. */
declare const storeRenderCheckpointBrand: unique symbol;
export type StoreRenderCheckpoint = {
    readonly [storeRenderCheckpointBrand]: never;
};
export type StoreRenderObservation = Readonly<{
    source: StoreSource<unknown>;
    value: unknown;
}>;
/** Discover the full dependency set before evaluating any selector callback. */
export declare function storesForSource(source: StoreSource<unknown>): readonly AnyAsyncStore[];
/**
 * Root-wide candidate transaction. Dependencies discovered later in traversal
 * join the read set before their selectors run; every earlier projection is
 * validated again before any host mutation. Preparation never publishes history.
 */
export declare class StoreRenderTransaction {
    #private;
    readonly rootId: string;
    private readonly options;
    constructor(rootId: string, options?: StoreReadOptions);
    get stores(): ReadonlySet<AnyAsyncStore>;
    get readers(): ReadonlyMap<string, ReadonlySet<AnyAsyncStore>>;
    /** Current branch's successfully completed reader observations. */
    get observations(): ReadonlyMap<string, StoreRenderObservation>;
    /** Detect a newer action or revoked closed Store capture after publication. */
    closedInputsChanged(): boolean;
    /** Create an O(1) savepoint for branch-local reader state. */
    checkpoint(): StoreRenderCheckpoint;
    /** Undo reader staging and observations after a live savepoint. */
    rollbackTo(checkpoint: StoreRenderCheckpoint): void;
    /** Release a consumed savepoint without affecting its ancestors. */
    releaseCheckpoint(checkpoint: StoreRenderCheckpoint): void;
    /** Return only observations produced or replaced in this live branch. */
    observationsSince(checkpoint: StoreRenderCheckpoint): ReadonlyMap<string, StoreRenderObservation>;
    /** Return only reader footprints produced or replaced in this live branch. */
    readersSince(checkpoint: StoreRenderCheckpoint): ReadonlyMap<string, ReadonlySet<AnyAsyncStore>>;
    /** O(1) lookup for a single boundary reader. */
    getObservation(readerId: string): StoreRenderObservation | undefined;
    /**
     * Keep committed-boundary reader dependencies in this candidate without
     * staging selector history from a speculative branch. Stores are pinned
     * before validation so their root projection participates in the read cut.
     */
    preserveReaders(readers: ReadonlyMap<string, ReadonlySet<AnyAsyncStore>>): void;
    /**
     * Remove superseded reader observations from this candidate. Store snapshots
     * stay pinned: even a reader that leaves the candidate participated in its
     * validation cut, and its stores may still be shared by other readers.
     */
    dropReaders(readerIds: Iterable<string>): void;
    /** Stage exact accepted reader retirement with this transaction's observations. */
    retireClosedReaders(readers: ReadonlyMap<string, ReadonlySet<AnyAsyncStore>>): boolean;
    /** Stage selected numeric paths while recording the actual whole-state observation. */
    readClosedProjections(store: AnyAsyncStore, readerId: string, paths: readonly (readonly string[])[]): readonly number[] | null;
    /** Compatibility wrapper for one direct numeric Store state. */
    readClosedNumeric(store: AnyAsyncStore, readerId: string): number | null;
    read<T>(source: StoreSource<T>, readerId: string): T;
    validate(): boolean;
    validatePublicationInputs(): boolean;
    /** Complete fallible reader validation and staging before accepted publication. */
    preparePublication(): void;
    /** Stage an older accepted read cut after newer actions reached the store log. */
    preparePublicationAfterHost(): void;
    /** Install prepared per-reader histories after every group member is ready. */
    publishAccepted(): void;
    notifyPublished(): void;
    /** Compatibility path for a single validated renderer commit. */
    commitAfterValidatedRender(): void;
    discard(): void;
}
//# sourceMappingURL=async_store_runtime.d.ts.map