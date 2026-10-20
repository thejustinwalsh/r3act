import { AsyncResource, AsyncResourceTable, type AsyncResourceStatus, type FulfilledResourceStatus } from "./async_resource_runtime.ts";
/** @internal Read the provider's private version without an authored getter. */
export declare const canonicalResourceVersion: (resource: unknown) => number | null;
/** Inspect only the canonical resource implementation, without authored getters. */
export declare const closedResourceStatus: (resource: unknown) => AsyncResourceStatus<unknown> | null;
/** Candidate-local async reads; no subscriptions or provider cancellation. */
export declare class ResourceReadSet {
    #private;
    private readonly table;
    constructor(table: AsyncResourceTable);
    read<T>(source: AsyncResource<T> | PromiseLike<T>): Awaited<T>;
    /** Capture a fulfilled canonical resource without calling its public methods. */
    readClosed<T>(resource: AsyncResource<T>): FulfilledResourceStatus<unknown> | null;
    get pending(): readonly AsyncResource<any>[];
    validate(): boolean;
    validateCanonical(): boolean;
    discard(): void;
}
//# sourceMappingURL=resource_read_set.d.ts.map