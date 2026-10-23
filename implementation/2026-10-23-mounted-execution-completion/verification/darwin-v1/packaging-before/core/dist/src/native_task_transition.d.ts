import { type StoreSource } from "./async_store_runtime.ts";
import { type AuthoredAsyncTask } from "./async_task_plan.ts";
import { type NativeTaskExecution, type NativeTaskExecutionOptions } from "./native_task_execution.ts";
import { ComponentStateRoot } from "./component_state_runtime.ts";
import { type RuntimeNode } from "./jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import { type RootWorkResolution, type RootWorkStatus } from "./root_work_queue.ts";
type NativeRoot = ComponentStateRoot<any, any>;
type InputRecord = Readonly<Record<string, unknown>>;
type LiveInputRecord = Readonly<Record<string, StoreSource<unknown>>>;
export type NativeTaskTransitionOptions = {
    id?: string;
    inputs?: InputRecord;
    /**
     * Only explicitly named bindings are live. Task selectors are freshness
     * readers, not committed UI readers; their previous selector value is
     * undefined for each capture attempt, so keep them pure.
     */
    liveInputs?: LiveInputRecord;
    transitions?: readonly string[];
    finishTransitions?: boolean;
    maxConcurrency?: number;
    demandScope?: NativeTaskExecutionOptions["demandScope"];
    demands?: NativeTaskExecutionOptions["demands"];
    /** The roots of this enqueue form one coherent publication by default. */
    reveal?: "coherent" | "independent";
    key?: string;
    /** Declares generic task trees safe to prepare, discard, and repeat. */
    renderPreparation?: "repeatable";
    onSettled?: (resolution: RootWorkResolution) => void;
};
export type NativeTaskTransitionRoots<Tasks extends readonly AuthoredAsyncTask[]> = readonly {
    root: NativeRoot;
    buildTree: (execution: NativeTaskExecution<Tasks>, root: NativeRoot) => RuntimeNode;
}[];
export type NativeTaskTransitionSnapshot = {
    readonly status: RootWorkStatus;
    readonly generation: number;
    readonly taskIds: readonly string[];
    readonly roots: readonly string[];
    readonly started: readonly string[];
    readonly completed: readonly string[];
    readonly reused: readonly string[];
};
export type NativeTaskTransitionHandle = {
    readonly id: string;
    readonly status: RootWorkStatus;
    readonly resolution: RootWorkResolution;
    readonly completion: Promise<RootWorkResolution>;
    snapshot(): NativeTaskTransitionSnapshot;
    cancel(reason?: string): RootWorkResolution;
};
/**
 * Owns task executions and live-input observers for native root publications.
 * Store actions and task-domain side effects remain caller-owned.
 */
export declare class NativeTaskTransitionQueue {
    #private;
    constructor(options?: {
        queue?: NativeRootWorkQueue;
    });
    enqueue<const Tasks extends readonly AuthoredAsyncTask[]>(tasks: Tasks, roots: NativeTaskTransitionRoots<Tasks>, options?: NativeTaskTransitionOptions): NativeTaskTransitionHandle;
    dispose(): void;
}
export {};
//# sourceMappingURL=native_task_transition.d.ts.map