import { AsyncResource } from "./async_resource_runtime.ts";
declare const definitionKey: unique symbol;
export type DemandCapture = Readonly<{
    /** Identity and version must cover every value dependency of the work. */
    identity: unknown;
    version: string | number;
    value: unknown;
}>;
type DemandBase = Readonly<{
    identity: object;
    codeRevision: string;
    readonly [definitionKey]: true;
}>;
export type DemandDefinition<T = unknown> = DemandBase & (Readonly<{
    kind: "provider";
    start: (captures: readonly DemandCapture[], signal: AbortSignal) => PromiseLike<T>;
}> | Readonly<{
    kind: "pure-derived";
    derive: (captures: readonly DemandCapture[]) => T | PromiseLike<T>;
}>);
export type DemandLease<T> = Readonly<{
    resource: AsyncResource<Awaited<T>>;
    result: Promise<Awaited<T>>;
    release(): void;
}>;
/** An explicit provider owns request startup and responds to its abort signal. */
export declare const defineProviderDemand: <T>(identity: object, codeRevision: string, start: (captures: readonly DemandCapture[], signal: AbortSignal) => PromiseLike<T>) => DemandDefinition<T>;
/** The author promises this derivation has no observable effects. */
export declare const definePureDerivedDemand: <T>(identity: object, codeRevision: string, derive: (captures: readonly DemandCapture[]) => T | PromiseLike<T>) => DemandDefinition<T>;
/** Execute an explicit definition without sharing when a scope is full. */
export declare const runDemandUnshared: <T>(definition: DemandDefinition<T>, captures: readonly DemandCapture[], signal: AbortSignal) => Promise<Awaited<T>>;
/** Caller-owned, bounded in-flight and leased-result sharing scope. */
export declare class AsyncTaskDemandScope {
    #private;
    constructor(maxEntries?: number);
    get size(): number;
    acquire<T>(definition: DemandDefinition<T>, owner: object, captures: readonly DemandCapture[]): DemandLease<T> | null;
    dispose(): void;
}
export {};
//# sourceMappingURL=async_task_demand.d.ts.map