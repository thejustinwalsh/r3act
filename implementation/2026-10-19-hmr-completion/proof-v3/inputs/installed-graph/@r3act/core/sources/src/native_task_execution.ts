import { AsyncResource } from "./async_resource_runtime.ts";
import {
  type AsyncTaskExecution,
  type AsyncTaskReuse,
  type AsyncTaskSpec,
  executeAsyncTaskPlan,
  prepareAsyncTaskPlan,
  type PreparedAsyncTaskPlan,
} from "./async_task_scheduler.ts";
import {
  type AsyncTaskIds,
  type AsyncTaskOutput,
  type AuthoredAsyncTask,
} from "./async_task_plan.ts";

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
  resource<Id extends AsyncTaskIds<Tasks>>(
    id: Id,
  ): AsyncResource<AsyncTaskOutput<Tasks, Id>>;
  completion: Promise<AsyncTaskExecution>;
  snapshot(): NativeTaskExecutionSnapshot;
  cancel(reason?: unknown): void;
  dispose(): void;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
  reject(reason: unknown): void;
};

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

const freezeList = (values: readonly string[]): readonly string[] =>
  Object.freeze([...values]);

/**
 * Start a typed task graph and expose one stable AsyncResource per task.
 * Resources are allocated before the scheduler can invoke any task callback.
 */
export const createTaskExecution = <
  const Tasks extends readonly AuthoredAsyncTask[],
>(
  tasks: Tasks,
  initialValues: Readonly<Record<string, unknown>>,
  options: NativeTaskExecutionOptions = {},
): NativeTaskExecution<Tasks> => {
  // Snapshot the plan and inputs before validation or task startup so caller
  // mutations cannot change edges or external values after this call returns.
  const taskIds = new Set<string>();
  const taskSnapshot = Object.freeze(tasks.map((task) => {
    if (!task.id || taskIds.has(task.id)) {
      throw new Error(
        `Async task IDs must be unique and non-empty: ${task.id}`,
      );
    }
    taskIds.add(task.id);
    return Object.freeze({
      id: task.id,
      dependsOn: Object.freeze([...task.dependsOn]),
      run: task.run,
    });
  }));
  const inputSnapshot = Object.freeze({ ...initialValues });
  const declaredExternalInputs = new Set<string>();
  for (const task of taskSnapshot) {
    for (const dependency of task.dependsOn) {
      if (!taskIds.has(dependency)) declaredExternalInputs.add(dependency);
    }
  }
  const inputIds = Object.keys(inputSnapshot);
  const extraInputs = inputIds.filter((id) => !declaredExternalInputs.has(id));
  const missingInputs = [...declaredExternalInputs].filter((id) =>
    !Object.hasOwn(inputSnapshot, id)
  );
  if (extraInputs.length || missingInputs.length) {
    throw new Error(
      `Initial task inputs must exactly match declared external inputs (missing: ${
        missingInputs.join(", ") || "none"
      }; extra: ${extraInputs.join(", ") || "none"})`,
    );
  }

  const runtimeTasks: AsyncTaskSpec[] = [];
  const started: string[] = [];
  for (const task of taskSnapshot) {
    runtimeTasks.push({
      id: task.id,
      dependsOn: task.dependsOn,
      run: (inputs, signal) => {
        started.push(task.id);
        return task.run(inputs, signal);
      },
    });
  }
  const frozenRuntimeTasks = Object.freeze(runtimeTasks);
  const prepared: PreparedAsyncTaskPlan = prepareAsyncTaskPlan(
    frozenRuntimeTasks,
    inputSnapshot,
  );

  const resources = new Map<string, AsyncResource<unknown>>();
  const outputs = new Map<string, Deferred<unknown>>();
  for (const task of taskSnapshot) {
    const output = deferred<unknown>();
    outputs.set(task.id, output);
    resources.set(task.id, new AsyncResource(output.promise));
  }

  const reuseSnapshot: AsyncTaskReuse | undefined = options.reuseCompleted
    ? {
      values: new Map(options.reuseCompleted.values),
      completed: Object.freeze([...options.reuseCompleted.completed]),
      changedInputs: Object.freeze([...options.reuseCompleted.changedInputs]),
    }
    : undefined;
  const controller = new AbortController();
  const externalSignal = options.signal;
  let status: NativeTaskExecutionSnapshot["status"] = "pending";
  let error: unknown;
  let isDisposed = false;
  let observerError = options.onObserverError;
  const completedValues = new Map<string, unknown>();
  const completed: string[] = [];
  const reused: string[] = [];

  const rejectOutstanding = (reason: unknown) => {
    for (const [id, output] of outputs) {
      if (resources.get(id)?.status.status === "pending") output.reject(reason);
    }
  };
  const cancel = (
    reason: unknown = new Error("Native task execution cancelled"),
  ) => {
    if (status !== "pending") return;
    status = "aborted";
    error = reason;
    controller.abort(reason);
    rejectOutstanding(reason);
  };

  function onExternalAbort() {
    cancel(externalSignal?.reason);
  }
  if (externalSignal?.aborted) cancel(externalSignal.reason);
  else {externalSignal?.addEventListener("abort", onExternalAbort, {
      once: true,
    });}

  const completion = executeAsyncTaskPlan(
    frozenRuntimeTasks,
    inputSnapshot,
    {
      maxConcurrency: options.maxConcurrency,
      signal: controller.signal,
      reuseCompleted: reuseSnapshot,
      ...(observerError
        ? {
          onObserverError: (observerFailure: unknown) => {
            try {
              observerError?.(observerFailure);
            } catch {
              // The scheduler also isolates its reporter; retain that guarantee at
              // this adapter boundary if a caller replaces it during disposal.
            }
          },
        }
        : {}),
      onTaskComplete: ({ taskId, value, reused: wasReused }) => {
        if (status !== "pending" || controller.signal.aborted) return;
        const output = outputs.get(taskId);
        if (!output || resources.get(taskId)?.status.status !== "pending") {
          return;
        }
        completedValues.set(taskId, value);
        completed.push(taskId);
        if (wasReused) reused.push(taskId);
        output.resolve(value);
      },
    },
    prepared,
  ).then((result) => {
    if (!isDisposed) {
      if (status === "pending") status = result.status;
      completed.length = 0;
      completed.push(...result.completed);
      reused.length = 0;
      reused.push(...result.reused);
      for (const [id, value] of result.values) {
        if (resources.get(id)?.status.status === "fulfilled") {
          completedValues.set(id, value);
        }
      }
      if (result.status === "aborted") {
        const reason = controller.signal.reason ??
          new Error("Native task execution aborted");
        error ??= reason;
        rejectOutstanding(reason);
      }
    }
    return result;
  }, (failure: unknown) => {
    if (!isDisposed) {
      status = "failed";
      error = failure;
      rejectOutstanding(failure);
    }
    throw failure;
  }).finally(() => {
    externalSignal?.removeEventListener("abort", onExternalAbort);
  });
  // Keep a rejection handled even if a consumer only observes individual
  // resources. The returned completion promise still rejects for the caller.
  void completion.catch(() => {});

  const snapshot = (): NativeTaskExecutionSnapshot =>
    Object.freeze({
      status,
      started: freezeList(started),
      completed: freezeList(completed),
      reused: freezeList(reused),
      completedValues: new Map(completedValues),
      ...(error !== undefined ? { error } : {}),
    });
  const dispose = () => {
    if (isDisposed) return;
    if (status === "pending") {
      cancel(new Error("Native task execution disposed"));
    }
    isDisposed = true;
    resources.clear();
    outputs.clear();
    completedValues.clear();
    observerError = undefined;
    externalSignal?.removeEventListener("abort", onExternalAbort);
  };

  return {
    resource<Id extends AsyncTaskIds<Tasks>>(
      id: Id,
    ): AsyncResource<AsyncTaskOutput<Tasks, Id>> {
      const resource = resources.get(id);
      if (!resource) {
        throw new Error(
          isDisposed
            ? "Native task execution has been disposed"
            : `Unknown task resource: ${String(id)}`,
        );
      }
      return resource as AsyncResource<AsyncTaskOutput<Tasks, Id>>;
    },
    completion,
    snapshot,
    cancel,
    dispose,
  };
};
