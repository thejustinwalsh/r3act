import { AsyncResource } from "./async_resource_runtime.ts";
import {
  AsyncTaskDemandScope, runDemandUnshared,
  type DemandCapture, type DemandDefinition, type DemandLease,
} from "./async_task_demand.ts";
import { isCompiledSemanticRevisionCurrent,
  subscribeCompiledSemanticRevision } from "./compiled_semantic_plan.ts";
import {
  type AsyncTaskExecution,
  type AsyncTaskReuse,
  executeAsyncTaskPlan,
  prepareAsyncTaskGraph,
  prepareAsyncTaskPlan,
  type PreparedAsyncTaskGraph,
  type PreparedAsyncTaskPlan,
} from "./async_task_scheduler.ts";
import {
  type AsyncTaskIds,
  type AsyncTaskOutput,
  type AuthoredAsyncTask,
} from "./async_task_plan.ts";

const taskExecutionDefinition = Symbol("native.task-execution.definition");
const taskExecutionInputs = Symbol("native.task-execution.inputs");

export type NativeTaskExecutionOptions = {
  signal?: AbortSignal;
  maxConcurrency?: number;
  reuseCompleted?: AsyncTaskReuse;
  /** Internal prior execution receipt for compiled same-definition reuse. */
  reuseFrom?: Readonly<{
    [taskExecutionDefinition]: PreparedNativeTaskDefinition<readonly AuthoredAsyncTask[]>;
    [taskExecutionInputs](): Readonly<Record<string, unknown>>;
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
  readonly [taskExecutionInputs]: () => Readonly<Record<string, unknown>>;
  resource<Id extends AsyncTaskIds<Tasks>>(
    id: Id,
  ): AsyncResource<AsyncTaskOutput<Tasks, Id>>;
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
export const isPreparedNativeTaskDefinitionCurrent = (
  definition: PreparedNativeTaskDefinition<readonly AuthoredAsyncTask[]>,
): boolean => definition.tasks.every((task) => !task.compiled ||
  isCompiledSemanticRevisionCurrent(task.compiled.revisionToken));

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

const automaticCaptures = (task: { dependsOn: readonly string[] },
  inputs: ReadonlyMap<string, unknown>): Readonly<{
    captures: readonly DemandCapture[]; shareable: boolean;
  }> => {
    let shareable = true;
    const captures = task.dependsOn.map((identity) => {
      const value = inputs.get(identity);
      const opaque = (value !== null && typeof value === "object") ||
        typeof value === "function" || typeof value === "symbol";
      if (opaque)
        shareable = false;
      const version = opaque ? "opaque" :
        typeof value === "number" && Object.is(value, -0)
        ? "number:-0" : `${typeof value}:${String(value)}`;
      return Object.freeze({ identity, version, value });
    });
    return Object.freeze({ captures: Object.freeze(captures), shareable });
  };

/** Snapshot and validate task relations once for all input generations. */
export const prepareNativeTaskDefinition = <
  const Tasks extends readonly AuthoredAsyncTask[],
>(
  tasks: Tasks,
): PreparedNativeTaskDefinition<Tasks> => {
  const taskSnapshot = Object.freeze(tasks.map((task) =>
    Object.freeze({
      id: task.id,
      dependsOn: Object.freeze([...task.dependsOn]),
      run: task.run,
      ...(task.compiled ? { compiled: Object.freeze({ ...task.compiled,
        hardPrerequisites: Object.freeze([...task.compiled.hardPrerequisites]),
        controlInputs: Object.freeze([...task.compiled.controlInputs]),
      }) } : {}),
    })
  )) as unknown as Tasks;
  const definition = Object.freeze({
    tasks: taskSnapshot,
    graph: prepareAsyncTaskGraph(taskSnapshot),
  });
  if (!isPreparedNativeTaskDefinitionCurrent(definition))
    throw new Error("Compiled task module revision is stale");
  return definition;
};

/** Start one input cut with stable task resources and candidate-owned results. */
export const createTaskExecutionFromDefinition = <
  const Tasks extends readonly AuthoredAsyncTask[],
>(
  definition: PreparedNativeTaskDefinition<Tasks>,
  initialValues: Readonly<Record<string, unknown>>,
  options: NativeTaskExecutionOptions = {},
): NativeTaskExecution<Tasks> => {
  const { tasks: taskSnapshot, graph } = definition;
  if (!isPreparedNativeTaskDefinitionCurrent(definition))
    throw new Error("Compiled task module revision is stale");
  const compiledReuse = !!options.reuseCompleted &&
    taskSnapshot.some((task) => task.compiled);
  if (compiledReuse && options.reuseFrom?.[taskExecutionDefinition] !== definition)
    throw new Error("Compiled task output reuse requires prior code provenance");
  const demandBindings = options.demands ? new Map([...options.demands].map(
    ([id, binding]) => [id, "definition" in binding
      ? Object.freeze({ definition: binding.definition, captures: binding.captures })
      : binding] as const)) : undefined;
  const inputSnapshot = Object.freeze({ ...initialValues });
  const priorInputs = options.reuseCompleted && options.reuseFrom
    ? options.reuseFrom[taskExecutionInputs]() : undefined;
  const declaredExternalInputs = graph.externalInputs;
  const inputIds = Object.keys(inputSnapshot);
  const extraInputs = inputIds.filter((id) => !declaredExternalInputs.has(id));
  const missingInputs = [...declaredExternalInputs.keys()].filter((id) =>
    !Object.hasOwn(inputSnapshot, id)
  );
  if (extraInputs.length || missingInputs.length) {
    throw new Error(
      `Initial task inputs must exactly match declared external inputs (missing: ${
        missingInputs.join(", ") || "none"
      }; extra: ${extraInputs.join(", ") || "none"})`,
    );
  }

  const started: string[] = [];
  const prepared: PreparedAsyncTaskPlan = prepareAsyncTaskPlan(
    taskSnapshot,
    inputSnapshot,
    graph,
  );

  const resources = new Map<string, AsyncResource<unknown>>();
  const outputs = new Map<string, Deferred<unknown>>();
  for (const task of taskSnapshot) {
    const output = deferred<unknown>();
    outputs.set(task.id, output);
    resources.set(task.id, new AsyncResource(output.promise));
  }

  const priorSnapshot = compiledReuse ? options.reuseFrom!.snapshot() : undefined;
  const exactChangedInputs = priorInputs
    ? Object.keys(inputSnapshot).filter((id) =>
      !Object.is(priorInputs[id], inputSnapshot[id]))
    : options.reuseCompleted?.changedInputs;
  const reuseSnapshot: AsyncTaskReuse | undefined = options.reuseCompleted
    ? {
      values: new Map(priorSnapshot?.completedValues ?? options.reuseCompleted.values),
      completed: Object.freeze([...(priorSnapshot?.completed ??
        options.reuseCompleted.completed)]),
      changedInputs: Object.freeze([...(exactChangedInputs ?? [])]),
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
  const demandOwners = new Map<string, object>();
  const demandLeases: DemandLease<unknown>[] = [];
  let unsubscribeRevision: (() => void) | undefined;
  const releaseDemands = () => {
    for (const lease of demandLeases.splice(0)) lease.release();
  };

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
    unsubscribeRevision?.();
    unsubscribeRevision = undefined;
    releaseDemands();
    rejectOutstanding(reason);
  };

  function onExternalAbort() {
    cancel(externalSignal?.reason);
  }
  if (externalSignal?.aborted) cancel(externalSignal.reason);
  else {externalSignal?.addEventListener("abort", onExternalAbort, {
      once: true,
    });}
  if (status === "pending" && taskSnapshot.some((task) => task.compiled)) {
    const sources = new Set(taskSnapshot.flatMap((task) =>
      task.compiled ? [task.compiled.sourceFile] : []));
    unsubscribeRevision = subscribeCompiledSemanticRevision((change) => {
      if (sources.has(change.sourceFile) &&
        !isPreparedNativeTaskDefinitionCurrent(definition))
        cancel(new Error("Compiled task module revision is stale"));
    });
  }

  const completion = executeAsyncTaskPlan(
    taskSnapshot,
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
        if (!isPreparedNativeTaskDefinitionCurrent(definition)) {
          cancel(new Error("Compiled task module revision is stale"));
          return;
        }
        const output = outputs.get(taskId);
        if (!output || resources.get(taskId)?.status.status !== "pending") {
          return;
        }
        completedValues.set(taskId, value);
        completed.push(taskId);
        if (wasReused) reused.push(taskId);
        output.resolve(value);
      },
      runTask: (task, inputs, signal) => {
        if (!isPreparedNativeTaskDefinitionCurrent(definition))
          throw new Error("Compiled task module revision is stale");
        const binding = demandBindings?.get(task.id);
        if (!binding) return task.run(inputs, signal);
        const demandDefinition = "definition" in binding ? binding.definition : binding;
        const automatic = "definition" in binding ? null : automaticCaptures(task, inputs);
        const captures = "definition" in binding
          ? binding.captures(inputs) : automatic!.captures;
        if (automatic && !automatic.shareable)
          return runDemandUnshared(demandDefinition, captures, signal);
        let owner = demandOwners.get(task.id);
        if (!owner) demandOwners.set(task.id, owner = {});
        const lease = options.demandScope?.acquire(demandDefinition, owner, captures);
        if (!lease) return runDemandUnshared(demandDefinition, captures, signal);
        demandLeases.push(lease);
        return lease.result;
      },
    },
    prepared,
    started,
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
    unsubscribeRevision?.();
    unsubscribeRevision = undefined;
    releaseDemands();
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
    unsubscribeRevision?.();
    unsubscribeRevision = undefined;
    releaseDemands();
    resources.clear();
    outputs.clear();
    completedValues.clear();
    observerError = undefined;
    externalSignal?.removeEventListener("abort", onExternalAbort);
  };

  return Object.freeze({
    [taskExecutionDefinition]: definition,
    [taskExecutionInputs]: () => inputSnapshot,
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
  });
};

/** Allocate one execution from externally authored task declarations. */
export const createTaskExecution = <
  const Tasks extends readonly AuthoredAsyncTask[],
>(
  tasks: Tasks,
  initialValues: Readonly<Record<string, unknown>>,
  options: NativeTaskExecutionOptions = {},
): NativeTaskExecution<Tasks> =>
  createTaskExecutionFromDefinition(
    prepareNativeTaskDefinition(tasks), initialValues, options,
  );
