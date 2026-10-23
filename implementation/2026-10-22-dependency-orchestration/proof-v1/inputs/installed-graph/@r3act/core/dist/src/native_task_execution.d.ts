import { AsyncResource } from "./async_resource_runtime.ts";
import { AsyncTaskDemandScope, type DemandCapture, type DemandDefinition } from "./async_task_demand.ts";
import { type AsyncTaskExecution, type AsyncTaskReuse, type PreparedAsyncTaskGraph } from "./async_task_scheduler.ts";
import { type AsyncTaskIds, type AsyncTaskOutput, type AuthoredAsyncTask } from "./async_task_plan.ts";
declare const taskExecutionDefinition: unique symbol;
export type NativeTaskExecutionOptions = {
    signal?: AbortSignal;
    maxConcurrency?: number;
    reuseCompleted?: AsyncTaskReuse;
    /** Internal prior execution receipt for compiled same-definition reuse. */
    reuseFrom?: Readonly<{
        [taskExecutionDefinition]: PreparedNativeTaskDefinition<readonly AuthoredAsyncTask[]>;
        snapshot(): NativeTaskExecutionSnapshot;
    }>;
    onObserverError?: (error: unknown) => void;
    demandScope?: AsyncTaskDemandScope;
    demands?: ReadonlyMap<string, DemandDefinition | Readonly<{
        definition: DemandDefinition;
        captures: (inputs: ReadonlyMap<string, unknown>) => readonly DemandCapture[];
    }>>;
};
export type NativeTaskExecutionSnapshot = Readonly<{
    status: "pending" | "complete" | "aborted" | "failed";
    started: readonly string[];
    completed: readonly string[];
    reused: readonly string[];
    completedValues: ReadonlyMap<string, unknown>;
    error?: unknown;
}>;
export type NativeTaskExecution<Tasks extends readonly AuthoredAsyncTask[]> = {
    readonly [taskExecutionDefinition]: PreparedNativeTaskDefinition<Tasks>;
    resource<Id extends AsyncTaskIds<Tasks>>(id: Id): AsyncResource<AsyncTaskOutput<Tasks, Id>>;
    completion: Promise<AsyncTaskExecution>;
    snapshot(): NativeTaskExecutionSnapshot;
    cancel(reason?: unknown): void;
    dispose(): void;
};
export type PreparedNativeTaskDefinition<Tasks extends readonly AuthoredAsyncTask[]> = Readonly<{
    tasks: Tasks;
    graph: PreparedAsyncTaskGraph;
}>;
/** A prepared compiler task remains valid only for its registered module plan. */
export declare const isPreparedNativeTaskDefinitionCurrent: (definition: PreparedNativeTaskDefinition<readonly AuthoredAsyncTask[]>) => boolean;
/** Snapshot and validate task relations once for all input generations. */
export declare const prepareNativeTaskDefinition: <const Tasks extends readonly AuthoredAsyncTask[]>(tasks: Tasks) => PreparedNativeTaskDefinition<Tasks>;
/** Start one input cut with stable task resources and candidate-owned results. */
export declare const createTaskExecutionFromDefinition: <const Tasks extends readonly AuthoredAsyncTask[]>(definition: PreparedNativeTaskDefinition<Tasks>, initialValues: Readonly<Record<string, unknown>>, options?: NativeTaskExecutionOptions) => NativeTaskExecution<Tasks>;
/** Allocate one execution from externally authored task declarations. */
export declare const createTaskExecution: <const Tasks extends readonly AuthoredAsyncTask[]>(tasks: Tasks, initialValues: Readonly<Record<string, unknown>>, options?: NativeTaskExecutionOptions) => NativeTaskExecution<Tasks>;
export {};
//# sourceMappingURL=native_task_execution.d.ts.map