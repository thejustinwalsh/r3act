export type AsyncTaskSpec = {
  id: string;
  dependsOn: readonly string[];
  run: (
    inputs: ReadonlyMap<string, unknown>,
    signal: AbortSignal,
  ) => unknown | Promise<unknown>;
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

export const prepareAsyncTaskPlan = (
  taskSpecs: readonly AsyncTaskSpec[],
  initialValues: Readonly<Record<string, unknown>> = {},
): PreparedAsyncTaskPlan => {
  const taskById = new Map<string, AsyncTaskSpec>();
  const orderById = new Map<string, number>();
  for (let index = 0; index < taskSpecs.length; index++) {
    const task = taskSpecs[index];
    if (!task.id || taskById.has(task.id)) {
      throw new Error(
        `Async task IDs must be unique and non-empty: ${task.id}`,
      );
    }
    if (Object.hasOwn(initialValues, task.id)) {
      throw new Error(`Task ID collides with initial value: ${task.id}`);
    }
    taskById.set(task.id, task);
    orderById.set(task.id, index);
  }

  const dependents = new Map<string, string[]>();
  const unresolved = new Map<string, number>();
  for (const task of taskSpecs) {
    const seen = new Set<string>();
    let taskPrerequisites = 0;
    for (const dependency of task.dependsOn) {
      if (seen.has(dependency)) {
        throw new Error(
          `Duplicate dependency ${dependency} in task ${task.id}`,
        );
      }
      seen.add(dependency);
      if (Object.hasOwn(initialValues, dependency)) continue;
      if (!taskById.has(dependency)) {
        throw new Error(
          `Task ${task.id} depends on unknown value ${dependency}`,
        );
      }
      taskPrerequisites++;
      const children = dependents.get(dependency) ?? [];
      children.push(task.id);
      dependents.set(dependency, children);
    }
    unresolved.set(task.id, taskPrerequisites);
  }

  const validationCounts = new Map(unresolved);
  const validationReady = taskSpecs.filter((task) =>
    validationCounts.get(task.id) === 0
  ).map((task) => task.id);
  let validated = 0;
  for (let cursor = 0; cursor < validationReady.length; cursor++) {
    const taskId = validationReady[cursor];
    validated++;
    for (const child of dependents.get(taskId) ?? []) {
      const count = validationCounts.get(child)! - 1;
      validationCounts.set(child, count);
      if (count === 0) validationReady.push(child);
    }
  }
  if (validated !== taskSpecs.length) {
    throw new Error("Async task plan contains a dependency cycle");
  }
  return {
    taskSpecs,
    initialValues,
    taskById,
    orderById,
    dependents,
    unresolved,
  };
};

/**
 * Execute a declared async task DAG with bounded concurrency.
 *
 * Independent tasks start together. A task starts as soon as its own task
 * dependencies settle, without waiting for unrelated branches. Results stay in
 * a candidate-local map; callers decide when to publish them to UI roots.
 * This overlaps async work on the event loop and does not parallelize CPU work.
 */
export const executeAsyncTaskPlan = async (
  taskSpecs: readonly AsyncTaskSpec[],
  initialValues: Readonly<Record<string, unknown>> = {},
  options: AsyncTaskExecutionOptions = {},
  prepared?: PreparedAsyncTaskPlan,
): Promise<AsyncTaskExecution> => {
  const maxConcurrency = options.maxConcurrency ?? Number.POSITIVE_INFINITY;
  if (
    !(maxConcurrency === Number.POSITIVE_INFINITY ||
      Number.isSafeInteger(maxConcurrency)) || maxConcurrency < 1
  ) {
    throw new RangeError(
      "maxConcurrency must be a positive integer or Infinity",
    );
  }

  const preparedPlan = prepared ??
    prepareAsyncTaskPlan(taskSpecs, initialValues);
  if (
    preparedPlan.taskSpecs !== taskSpecs ||
    preparedPlan.initialValues !== initialValues
  ) {
    throw new Error("Prepared async task plan does not match execution inputs");
  }
  const { taskById, orderById, dependents } = preparedPlan;
  const values = new Map(Object.entries(initialValues));
  const started: string[] = [];
  const completed: string[] = [];
  const reused: string[] = [];
  const reusedOutputs: AsyncTaskCompletionEvent[] = [];
  const reuse = options.reuseCompleted;
  if (reuse) {
    const changedInputs = new Set(reuse.changedInputs);
    const invalidated = new Set<string>();
    const invalidationQueue: string[] = [];
    for (const task of taskSpecs) {
      if (task.dependsOn.some((dependency) => changedInputs.has(dependency))) {
        invalidated.add(task.id);
        invalidationQueue.push(task.id);
      }
    }
    for (let cursor = 0; cursor < invalidationQueue.length; cursor++) {
      for (const child of dependents.get(invalidationQueue[cursor]) ?? []) {
        if (invalidated.has(child)) continue;
        invalidated.add(child);
        invalidationQueue.push(child);
      }
    }

    const seenCompleted = new Set<string>();
    for (const taskId of reuse.completed) {
      if (seenCompleted.has(taskId)) {
        throw new Error(`Duplicate reusable task output: ${taskId}`);
      }
      seenCompleted.add(taskId);
      if (!taskById.has(taskId) || !reuse.values.has(taskId)) {
        throw new Error(`Missing reusable task output: ${taskId}`);
      }
      if (invalidated.has(taskId)) continue;
      values.set(taskId, reuse.values.get(taskId));
      reused.push(taskId);
      completed.push(taskId);
      reusedOutputs.push({
        taskId,
        value: reuse.values.get(taskId),
        reused: true,
      });
    }
  }
  const reusable = new Set(reused);
  const unresolved = new Map<string, number>();
  for (const task of taskSpecs) {
    let count = 0;
    for (const dependency of task.dependsOn) {
      if (!values.has(dependency)) count++;
    }
    unresolved.set(task.id, count);
  }
  const ready: string[] = [];
  const readyBefore = (left: string, right: string) =>
    orderById.get(left)! < orderById.get(right)!;
  const enqueueReady = (taskId: string) => {
    let index = ready.length;
    ready.push(taskId);
    while (index > 0) {
      const parent = (index - 1) >>> 1;
      if (!readyBefore(taskId, ready[parent])) break;
      ready[index] = ready[parent];
      index = parent;
    }
    ready[index] = taskId;
  };
  const dequeueReady = () => {
    const first = ready[0];
    const last = ready.pop()!;
    if (ready.length === 0) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      if (left >= ready.length) break;
      const right = left + 1;
      const child =
        right < ready.length && readyBefore(ready[right], ready[left])
          ? right
          : left;
      if (!readyBefore(ready[child], last)) break;
      ready[index] = ready[child];
      index = child;
    }
    ready[index] = last;
    return first;
  };
  for (const task of taskSpecs) {
    if (!reusable.has(task.id) && unresolved.get(task.id) === 0) {
      enqueueReady(task.id);
    }
  }
  const controller = new AbortController();
  let running = 0;
  let settled = reused.length;
  let hasFailure = false;
  let failure: unknown;
  let wake = () => {};
  const externalSignal = options.signal;
  const abort = () => {
    controller.abort(externalSignal?.reason);
    wake();
  };
  if (externalSignal?.aborted) abort();
  else externalSignal?.addEventListener("abort", abort, { once: true });

  const reportObserverError = (
    error: unknown,
    event: AsyncTaskCompletionEvent,
  ) => {
    try {
      if (options.onObserverError) {
        const reported = options.onObserverError(error, event) as unknown;
        if (
          reported &&
          (typeof reported === "object" || typeof reported === "function")
        ) {
          void Promise.resolve(reported).catch(() => {});
        }
      } else console.error("Async task completion observer failed", error);
    } catch {
      // Observers and their error reporters cannot alter scheduler outcomes.
    }
  };
  const notifyTaskComplete = (event: AsyncTaskCompletionEvent) => {
    if (controller.signal.aborted || !options.onTaskComplete) return;
    try {
      const result = options.onTaskComplete(event) as unknown;
      // Completion observers are synchronous. Consume accidental async failures
      // so an async callback cannot create an unhandled rejection.
      if (
        result &&
        (typeof result === "object" || typeof result === "function") &&
        typeof (result as { then?: unknown }).then === "function"
      ) {
        void Promise.resolve(result).catch((error) =>
          reportObserverError(error, event)
        );
      }
    } catch (error) {
      reportObserverError(error, event);
    }
  };
  // Reused outputs are already present in the candidate value map. Publish
  // them once before any ready task (including a dependent) can start.
  for (const event of reusedOutputs) {
    if (controller.signal.aborted) break;
    notifyTaskComplete(event);
  }

  const launchReady = () => {
    while (
      !controller.signal.aborted && running < maxConcurrency && ready.length > 0
    ) {
      // The compiler-provided task order is the deterministic tie-breaker for
      // equally ready work. Priorities can be added to the plan explicitly.
      const taskId = dequeueReady();
      const task = taskById.get(taskId)!;
      const taskInputs = new Map<string, unknown>();
      for (const dependency of task.dependsOn) {
        taskInputs.set(dependency, values.get(dependency));
      }
      started.push(taskId);
      running++;

      let output: unknown | Promise<unknown>;
      try {
        output = task.run(taskInputs, controller.signal);
      } catch (error) {
        running--;
        hasFailure = true;
        failure = error;
        controller.abort(error);
        wake();
        continue;
      }
      Promise.resolve(output).then((value) => {
        if (controller.signal.aborted) return;
        values.set(taskId, value);
        completed.push(taskId);
        settled++;
        notifyTaskComplete({ taskId, value, reused: false });
        if (controller.signal.aborted) return;
        for (const child of dependents.get(taskId) ?? []) {
          const count = unresolved.get(child)! - 1;
          unresolved.set(child, count);
          if (count === 0) enqueueReady(child);
        }
      }, (error) => {
        if (!controller.signal.aborted) {
          hasFailure = true;
          failure = error;
          controller.abort(error);
        }
      }).finally(() => {
        running--;
        wake();
      });
    }
  };

  try {
    while (settled < taskSpecs.length && !controller.signal.aborted) {
      const changed = new Promise<void>((resolve) => wake = resolve);
      launchReady();
      if (
        hasFailure || controller.signal.aborted || settled === taskSpecs.length
      ) break;
      if (running === 0) {
        throw new Error("Async task plan has no runnable task");
      }
      await changed;
    }
    if (hasFailure) throw failure;
    return {
      status: controller.signal.aborted ? "aborted" : "complete",
      values: new Map(values),
      started: [...started],
      completed: [...completed],
      reused: [...reused],
    };
  } finally {
    externalSignal?.removeEventListener("abort", abort);
  }
};
