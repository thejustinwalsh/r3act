import { AsyncResource } from "./async_resource_runtime.ts";
import { type AsyncTaskExecution, type AsyncTaskReuse } from "./async_task_scheduler.ts";
import { type AsyncTaskIds, type AsyncTaskOutput, type AuthoredAsyncTask } from "./async_task_plan.ts";
export type NativeTaskExecutionOptions = {
    signal?: AbortSignal;
    maxConcurrency?: number;
    reuseCompleted?: AsyncTaskReuse;
    onObserverError?: (error: unknown) => void;
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
    resource<Id extends AsyncTaskIds<Tasks>>(id: Id): AsyncResource<AsyncTaskOutput<Tasks, Id>>;
    completion: Promise<AsyncTaskExecution>;
    snapshot(): NativeTaskExecutionSnapshot;
    cancel(reason?: unknown): void;
    dispose(): void;
};
/**
 * Start a typed task graph and expose one stable AsyncResource per task.
 * Resources are allocated before the scheduler can invoke any task callback.
 */
export declare const createTaskExecution: <const Tasks extends readonly AuthoredAsyncTask[]>(tasks: Tasks, initialValues: Readonly<Record<string, unknown>>, options?: NativeTaskExecutionOptions) => NativeTaskExecution<Tasks>;
//# sourceMappingURL=native_task_execution.d.ts.map