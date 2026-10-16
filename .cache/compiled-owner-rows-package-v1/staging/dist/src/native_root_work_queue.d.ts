import { type AnyAsyncStore } from "./async_store_runtime.ts";
import { ComponentStateRoot } from "./component_state_runtime.ts";
import { type RuntimeNode } from "./jsx_binding_runtime.ts";
import { type RootWorkHandle, type RootWorkSettled } from "./root_work_queue.ts";
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
    /** Task-only store scopes included in this work's publication. */
    readonly publicationDependencies?: readonly {
        readonly root: NativeRoot;
        readonly stores: ReadonlySet<AnyAsyncStore>;
    }[];
    readonly onSettled?: (resolution: RootWorkSettled) => void;
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
    getVersion(root: NativeRoot): number;
    /** Detach coordinator registrations; roots and action scopes remain caller-owned. */
    dispose(): void;
}
export {};
//# sourceMappingURL=native_root_work_queue.d.ts.map