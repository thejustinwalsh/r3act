import { type AnyAsyncStore } from "./async_store_runtime.ts";
import { ComponentStateRoot } from "./component_state_runtime.ts";
import { type AsyncResource } from "./async_resource_runtime.ts";
import { type RuntimeNode } from "./jsx_binding_runtime.ts";
import { type RootWorkHandle, type RootWorkSettled } from "./root_work_queue.ts";
import { type StateCellHandle } from "./owner_state_world.ts";
import type { KeyedCollection } from "./keyed_collection.ts";
type NativeRoot = ComponentStateRoot<any, any>;
export type NativeStoreDependencyLease = {
    readonly dependencies: readonly {
        readonly root: NativeRoot;
        readonly stores: ReadonlySet<AnyAsyncStore>;
    }[];
    release(): void;
};
export type NativeRootWorkHandle = RootWorkHandle & {
    /** Keep discovered store membership alive while replacing this work. */
    retainStoreDependencies(): NativeStoreDependencyLease;
};
export type NativeRootWork = {
    readonly id: string;
    readonly roots: readonly {
        readonly root: NativeRoot;
        readonly tree: RuntimeNode;
    }[];
    /** Optional caller-owned gates; resource waits are discovered from roots. */
    readonly pending?: readonly string[];
    readonly key?: string;
    /** Explicit store transition inclusion; owning the work does not own domain actions. */
    readonly transitions?: readonly string[];
    /** Finish the included store scopes after publication; defaults to false. */
    readonly finishTransitions?: boolean;
    /** Validate task-only live inputs at each candidate publication boundary. */
    readonly validateWork?: () => boolean;
    /** Decide whether stale native or external inputs should be rebuilt. */
    readonly onStaleWork?: () => "retry" | "reject";
    /** Declares generic tree preparation safe to discard and repeat. */
    readonly renderPreparation?: "repeatable";
    /** Task-only store scopes included in this work's publication. */
    readonly publicationDependencies?: readonly {
        readonly root: NativeRoot;
        readonly stores: ReadonlySet<AnyAsyncStore>;
    }[];
    readonly onSettled?: (resolution: RootWorkSettled) => void;
};
type NativeScopedRootWork = {
    readonly id: string;
    readonly pending?: readonly string[];
    readonly key?: string;
    readonly validateWork?: () => boolean;
    readonly onStaleWork?: () => "retry" | "reject";
    readonly onSettled?: (resolution: RootWorkSettled) => void;
};
/** A declared joint cut over retained cells, collection edits, and Stores. */
export type NativeTransactionRootWork = NativeScopedRootWork & {
    readonly roots: readonly {
        readonly root: NativeRoot;
        readonly cells?: readonly StateCellHandle[];
        readonly collections?: readonly KeyedCollection<any>[];
        readonly stores?: readonly AnyAsyncStore[];
        readonly resources?: readonly AsyncResource<any>[];
    }[];
};
/** A declared publication cut covering every closed reader of selected Stores. */
export type NativeStoreRootWork = NativeScopedRootWork & {
    readonly roots: readonly {
        readonly root: NativeRoot;
        readonly stores: readonly AnyAsyncStore[];
    }[];
};
/**
 * Native owner roots wired to the overlapping publication queue. A queued
 * group prepares every root and waits for every observed resource before any
 * candidate publishes; fallback UI can be mounted separately by the caller.
 * Canceling work never removes dispatched actions or cancels their providers.
 */
export declare class NativeRootWorkQueue {
    #private;
    constructor(options?: {
        maxStaleRetries?: number;
        onError?: (error: unknown) => void;
    });
    enqueue(work: NativeRootWork): NativeRootWorkHandle;
    enqueueStores(work: NativeStoreRootWork): NativeRootWorkHandle;
    enqueueTransaction(work: NativeTransactionRootWork): NativeRootWorkHandle;
    getVersion(root: NativeRoot): number;
    /** @internal Read the existing synchronous publication state for exact work. */
    isApplying(id: string): boolean;
    /** Detach coordinator registrations; roots and action scopes remain caller-owned. */
    dispose(): void;
}
export {};
//# sourceMappingURL=native_root_work_queue.d.ts.map