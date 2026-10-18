import { AsyncResource, AsyncResourceTable } from "./async_resource_runtime.ts";
/** Candidate-local async reads; no subscriptions or provider cancellation. */
export declare class ResourceReadSet {
    #private;
    private readonly table;
    constructor(table: AsyncResourceTable);
    read<T>(source: AsyncResource<T> | PromiseLike<T>): Awaited<T>;
    get pending(): readonly AsyncResource<any>[];
    validate(): boolean;
    discard(): void;
}
//# sourceMappingURL=resource_read_set.d.ts.map