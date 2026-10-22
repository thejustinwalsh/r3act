export type AsyncTaskSpec = {
    id: string;
    dependsOn: readonly string[];
    run: (inputs: ReadonlyMap<string, unknown>, signal: AbortSignal) => unknown | Promise<unknown>;
};
export type AsyncTaskExecution = {
    status: "complete" | "aborted";
    values: ReadonlyMap<string, unknown>;
    started: readonly string[];
    completed: readonly string[];
    reused: readonly string[];
};
export type AsyncTaskReuse = {
    /** Values from a prior aborted execution, keyed by task ID. */
    values: ReadonlyMap<string, unknown>;
    /** Only these task outputs are eligible for reuse. */
    completed: readonly string[];
    /** External input IDs whose values changed between attempts. */
    changedInputs: readonly string[];
};
export type AsyncTaskExecutionOptions = {
    maxConcurrency?: number;
    signal?: AbortSignal;
    reuseCompleted?: AsyncTaskReuse;
    /** Synchronous output publication hook, delivered once for each accepted task result. */
    onTaskComplete?: (event: AsyncTaskCompletionEvent) => void;
    /** Receives completion observer failures; reporter failures are ignored. */
    onObserverError?: (error: unknown, event: AsyncTaskCompletionEvent) => void;
};
export type AsyncTaskCompletionEvent = {
    taskId: string;
    value: unknown;
    reused: boolean;
};
/** Validate a task DAG without invoking any user-provided task function. */
export type PreparedAsyncTaskPlan = {
    taskSpecs: readonly AsyncTaskSpec[];
    initialValues: Readonly<Record<string, unknown>>;
    taskById: ReadonlyMap<string, AsyncTaskSpec>;
    orderById: ReadonlyMap<string, number>;
    dependents: ReadonlyMap<string, readonly string[]>;
    unresolved: ReadonlyMap<string, number>;
};
export declare const prepareAsyncTaskPlan: (taskSpecs: readonly AsyncTaskSpec[], initialValues?: Readonly<Record<string, unknown>>) => PreparedAsyncTaskPlan;
/**
 * Execute a declared async task DAG with bounded concurrency.
 *
 * Independent tasks start together. A task starts as soon as its own task
 * dependencies settle, without waiting for unrelated branches. Results stay in
 * a candidate-local map; callers decide when to publish them to UI roots.
 * This overlaps async work on the event loop and does not parallelize CPU work.
 */
export declare const executeAsyncTaskPlan: (taskSpecs: readonly AsyncTaskSpec[], initialValues?: Readonly<Record<string, unknown>>, options?: AsyncTaskExecutionOptions, prepared?: PreparedAsyncTaskPlan) => Promise<AsyncTaskExecution>;
//# sourceMappingURL=async_task_scheduler.d.ts.map