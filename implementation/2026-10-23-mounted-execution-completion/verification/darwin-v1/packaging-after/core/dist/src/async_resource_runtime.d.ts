/**
 * A small host-independent wrapper around promise-like values.
 *
 * Resources observe an already-created thenable; they do not start fetches,
 * cancel providers, or retain work after the resource itself is unreachable.
 */
declare const pendingTokenBrand: unique symbol;
declare const rejectionBrand: unique symbol;
type CanonicalReadObserver = (resource: AsyncResource<any>, version: number) => void;
/** @internal Capture actual runtime resource reads through opaque bound wrappers. */
export declare function captureCanonicalResourceReads<T>(read: () => T, observe: CanonicalReadObserver): T;
export type PendingResourceToken<T = unknown> = Readonly<{
    readonly [pendingTokenBrand]: true;
    readonly kind: "pending-resource";
    readonly resource: AsyncResource<T>;
    readonly version: 0;
}>;
export declare class ResourceRejection<T = unknown> extends Error {
    readonly resource: AsyncResource<T>;
    readonly reason: unknown;
    readonly [rejectionBrand] = true;
    readonly kind: "resource-rejection";
    constructor(resource: AsyncResource<T>, reason: unknown);
}
export type PendingResourceStatus = Readonly<{
    status: "pending";
    /** Each resource starts at version zero and advances once on settlement. */
    version: 0;
}>;
export type FulfilledResourceStatus<T> = Readonly<{
    status: "fulfilled";
    version: 1;
    value: Awaited<T>;
}>;
export type RejectedResourceStatus<T> = Readonly<{
    status: "rejected";
    version: 1;
    reason: unknown;
    rejection: ResourceRejection<T>;
}>;
export type AsyncResourceStatus<T> = PendingResourceStatus | FulfilledResourceStatus<T> | RejectedResourceStatus<T>;
export type ResourceListener<T> = (resource: AsyncResource<T>, status: AsyncResourceStatus<T>) => void;
export type ResourceErrorReporter = (error: unknown) => void;
/**
 * A stable record for one PromiseLike. `read()` returns its value, or throws a
 * recognizable pending token/rejection. Settlement is one-shot even for
 * synchronous or hostile thenables.
 */
export declare class AsyncResource<T> {
    #private;
    private readonly reportListenerError;
    constructor(thenable: PromiseLike<T>, reportListenerError?: ResourceErrorReporter, 
    /** Internal hook used by tables to publish identity before then runs. */
    beforeObserve?: (resource: AsyncResource<T>) => void);
    get status(): AsyncResourceStatus<T>;
    get version(): 0 | 1;
    read(): Awaited<T>;
    /** Subscribe to the single pending-to-settled transition. */
    subscribe(listener: ResourceListener<T>): () => void;
}
/** True for the structured token thrown by a pending resource's read(). */
export declare function isPendingResourceToken(value: unknown): value is PendingResourceToken;
/** True for the structured rejection thrown by a rejected resource's read(). */
export declare function isResourceRejection(value: unknown): value is ResourceRejection;
/**
 * A caller-owned identity table. The WeakMap deduplicates object/function
 * thenables without keeping keys alive; each table has independent identity.
 */
export declare class AsyncResourceTable {
    #private;
    private readonly reportListenerError;
    constructor(reportListenerError?: ResourceErrorReporter);
    from<T>(thenable: PromiseLike<T>): AsyncResource<Awaited<T>>;
}
export {};
//# sourceMappingURL=async_resource_runtime.d.ts.map