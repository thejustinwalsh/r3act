import {
  type AsyncTaskSpec,
  prepareAsyncTaskPlan,
} from "./async_task_scheduler.ts";

export type AsyncTaskRun<Output = unknown> = (
  values: ReadonlyMap<string, unknown>,
  signal: AbortSignal,
) => Output | PromiseLike<Output>;

/** A task declaration that retains its authored ID and result type. */
export type AuthoredAsyncTask<
  Id extends string = string,
  Output = unknown,
  Dependencies extends readonly string[] = readonly string[],
> = Readonly<{
  id: Id;
  dependsOn: Dependencies;
  run: AsyncTaskRun<Output>;
}>;

export type AsyncTaskIds<Tasks extends readonly AuthoredAsyncTask[]> =
  Tasks[number]["id"];

export type AsyncTaskOutput<
  Tasks extends readonly AuthoredAsyncTask[],
  Id extends AsyncTaskIds<Tasks>,
> = Awaited<Extract<Tasks[number], { id: Id }> extends AuthoredAsyncTask<
    string,
    infer Output,
    readonly string[]
  > ? Output : never>;

/**
 * Authoring helper for task prerequisites. Prefix an external input ID with $
 * (for example, "$query") to declare a live input read instead of a task edge.
 * OXC infers task and external-input edges from literal `values.get("key")`
 * reads in the task callback. The two-argument form is intended for plans
 * passed through the compiler and compiled-plan binder.
 */
export function asyncTask<const Id extends string, Output>(
  id: Id,
  run: AsyncTaskRun<Output>,
): AuthoredAsyncTask<Id, Output, readonly []>;
export function asyncTask<
  const Id extends string,
  const Dependencies extends readonly string[],
  Output,
>(
  id: Id,
  dependencies: Dependencies,
  run: AsyncTaskRun<Output>,
): AuthoredAsyncTask<Id, Output, Dependencies>;
export function asyncTask(
  id: string,
  dependenciesOrRun: readonly string[] | AsyncTaskSpec["run"],
  run?: AsyncTaskSpec["run"],
): AsyncTaskSpec {
  if (typeof dependenciesOrRun === "function") {
    if (run !== undefined) {
      throw new TypeError("asyncTask received more than one callback");
    }
    return { id, dependsOn: [], run: dependenciesOrRun };
  }
  if (run === undefined) {
    throw new TypeError("asyncTask requires a callback");
  }
  return { id, dependsOn: dependenciesOrRun, run };
};

export type CompiledAsyncTaskPlan = Readonly<{
  schema_version: 1;
  source_file: string;
  tasks: readonly Readonly<{
    id: string;
    site_id: string;
    depends_on: readonly string[];
  }>[];
  task_order: readonly number[];
}>;

/**
 * Bind compiler-emitted dependency metadata to authored task implementations.
 * The plan controls the runtime edges; callbacks provide the task behavior.
 */
export const bindCompiledAsyncTasks = (
  plan: CompiledAsyncTaskPlan,
  implementations: Readonly<Record<string, AsyncTaskSpec["run"]>>,
): AsyncTaskSpec[] => {
  if (plan.schema_version !== 1) {
    throw new Error(
      `Unsupported async task plan schema: ${plan.schema_version}`,
    );
  }
  const planIds = new Set(plan.tasks.map((task) => task.id));
  if (
    planIds.size !== plan.tasks.length || plan.tasks.some((task) => !task.id)
  ) {
    throw new Error("Compiled async task IDs must be unique and non-empty");
  }
  const implementationIds = Object.keys(implementations);
  if (
    implementationIds.length !== planIds.size ||
    implementationIds.some((id) => !planIds.has(id))
  ) {
    throw new Error(
      "Async task implementations must exactly match the compiled plan",
    );
  }
  const implementationsById = plan.tasks.map((task) => {
    const run = implementations[task.id];
    if (typeof run !== "function") {
      throw new Error(`Missing async task implementation: ${task.id}`);
    }
    const authoredDependencies = [...task.depends_on];
    return {
      id: task.id,
      dependsOn: task.depends_on.map((dependency) =>
        dependency.startsWith("$") ? dependency.slice(1) : dependency
      ),
      run: (inputs: ReadonlyMap<string, unknown>, signal: AbortSignal) => {
        // The scheduler uses canonical external input IDs (without `$`) for
        // dependency resolution. Rebuild only this task's authored view so
        // `$query` remains readable while plain state-site and task IDs stay
        // unchanged, and undeclared values never become visible.
        const authoredInputs = new Map<string, unknown>();
        for (const dependency of authoredDependencies) {
          const canonical = dependency.startsWith("$")
            ? dependency.slice(1)
            : dependency;
          if (inputs.has(canonical)) {
            authoredInputs.set(dependency, inputs.get(canonical));
          }
        }
        return run(authoredInputs, signal);
      },
    };
  });
  const expectedOrder = plan.task_order;
  if (
    expectedOrder.length !== implementationsById.length ||
    new Set(expectedOrder).size !== implementationsById.length ||
    expectedOrder.some((task) =>
      !Number.isInteger(task) || task < 0 || task >= implementationsById.length
    )
  ) {
    throw new Error("Compiled async task order is malformed");
  }
  const rank = new Uint32Array(implementationsById.length);
  expectedOrder.forEach((task, index) => rank[task] = index);
  const indexById = new Map(plan.tasks.map((task, index) => [task.id, index]));
  for (let task = 0; task < implementationsById.length; task++) {
    for (const dependencyId of implementationsById[task].dependsOn) {
      const dependency = indexById.get(dependencyId);
      // `$name` inputs and plain component state-site IDs are external
      // resources. Only a dependency that resolves to a declared task ID is
      // subject to task ordering.
      if (dependency !== undefined && rank[dependency] >= rank[task]) {
        throw new Error("Compiled async task order is not topological");
      }
    }
  }
  const tasks = expectedOrder.map((task) => implementationsById[task]);
  const inputIds = plan.tasks.flatMap((task) => task.depends_on.map((dependency) =>
    dependency.startsWith("$") ? dependency.slice(1) : dependency
  ).filter((dependency) => !planIds.has(dependency)));
  prepareAsyncTaskPlan(
    tasks,
    Object.fromEntries(inputIds.map((inputId) => [inputId, undefined])),
  );
  return tasks;
};
