/**
 * Ready-to-commit work for retained roots. Transition records are independent
 * of root identity: overlapping roots coexist until an explicit key replaces
 * one of them. Preparation is synchronous and is repeated against current
 * versions when a candidate goes stale. Host commits must also be synchronous.
 */
export type RootWorkCandidate<T> = {
    rootId: string;
    baseVersion: number;
    targetVersion: number;
    value: T;
    /** Optional source/store read-set validation at the publication boundary. */
    validate?(): boolean;
};
/**
 * Suspend preparation until an adapter resolves every listed resource token.
 * Any resources created earlier in the throwing prepare call remain the
 * prepare callback's cleanup responsibility because no candidate batch was
 * returned to the queue.
 */
export declare class RootWorkPending extends Error {
    readonly tokens: readonly string[];
    constructor(tokens: readonly string[]);
}
export type RootWorkPendingContext = {
    readonly tokens: readonly string[];
    resolve(token: string): RootWorkResolution;
    refresh(): RootWorkResolution;
};
export type RootWorkStatus = "pending" | "committed" | "cancelled" | "stale" | "failed";
export type RootWorkResolution = {
    status: RootWorkStatus;
    transitionId: string;
    roots: readonly string[];
    error?: unknown;
    reason?: string;
};
export type RootWorkSettled = RootWorkResolution & {
    status: Exclude<RootWorkStatus, "pending">;
};
export type RootWorkPrepareContext = {
    transitionId: string;
    attempt: number;
    /** Versions are captured immediately before each synchronous preparation. */
    versions: ReadonlyMap<string, number>;
};
export type RootWorkStaleContext<T> = {
    transitionId: string;
    attempt: number;
    candidates: readonly RootWorkCandidate<T>[];
    currentVersions: ReadonlyMap<string, number>;
    reason: string;
};
export type RootWorkDefinition<T> = {
    /** Must be unique among currently pending work. */
    id: string;
    /** All roots commit as one synchronous group. */
    roots: readonly string[];
    /** Only an equal explicit key replaces previous work. */
    key?: string;
    /** Task/resource IDs that must resolve before preparation can begin. */
    pending?: readonly string[];
    prepare(context: RootWorkPrepareContext): readonly RootWorkCandidate<T>[];
    /** Task-only live inputs checked after preparation callbacks and before admission. */
    validateWork?(): boolean;
    /**
     * Release candidates when this queue abandons a prepared attempt. Called
     * once per candidate on retry or terminal failure/cancellation. A successful
     * commit takes ownership and is never followed by discard. If prepare throws
     * before returning, prepare remains responsible for any partial resources.
     */
    discard?(candidate: RootWorkCandidate<T>): void;
    /** One synchronous callback owns the whole root group commit boundary. */
    commit(candidates: readonly RootWorkCandidate<T>[]): void;
    /**
     * Runs once after every root version is published and status is committed,
     * before onSettled. Group root locks remain held through both callbacks.
     * Calling enqueue is allowed; ready work runs after this publication phase.
     */
    afterCommit?(candidates: readonly RootWorkCandidate<T>[]): void;
    /** Subscribe to resources requested by a thrown RootWorkPending signal. */
    onPending?(context: RootWorkPendingContext): void;
    /** Return "retry" to rebuild; omit/reject to terminate stale work. */
    onStale?(context: RootWorkStaleContext<T>): "retry" | "reject";
    /** Runs after commit and version publication, or after terminal settlement. */
    onSettled?(resolution: RootWorkSettled): void;
};
export type RootWorkHandle = {
    readonly id: string;
    readonly status: RootWorkStatus;
    readonly resolution: RootWorkResolution;
    /** Resolve one pending resource. Repeated/unknown tokens are stale. */
    resolve(resourceId: string): RootWorkResolution;
    /** Invalidate dynamic resource waits only; static pending gates remain. */
    refresh(): RootWorkResolution;
    cancel(reason?: string): RootWorkResolution;
};
/**
 * Serializes ready root groups on one JS turn while allowing arbitrary
 * independent transitions, including several that share the same root.
 * This is a publication queue, not an async task scheduler.
 */
export declare class RootWorkQueue<T = unknown> {
    #private;
    private readonly maxStaleRetries;
    private readonly onCallbackError?;
    constructor(initialRootVersions: ReadonlyMap<string, number>, maxStaleRetries?: number, onCallbackError?: ((error: unknown) => void) | undefined);
    getVersion(rootId: string): number;
    /** Whether this exact work is inside its synchronous commit boundary. */
    isCommitting(id: string): boolean;
    /** Register a new or remounted root. Remount clears its terminal failure. */
    attachRoot(rootId: string, version?: number): void;
    /** Publish an urgent/external commit while leaving pending work independent. */
    recordRootCommit(rootId: string, version: number): void;
    /** Alias for urgent commits; omitting version advances the root by one. */
    recordUrgentCommit(rootId: string, version?: number): number;
    /** Detach a root and cancel only work that actually includes that root. */
    detachRoot(rootId: string): number;
    enqueue(definition: RootWorkDefinition<T>): RootWorkHandle;
}
//# sourceMappingURL=root_work_queue.d.ts.map