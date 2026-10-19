/** Packed, build-time representation of value dependencies between sources and tasks. */
export type TaskGraphPlan = Readonly<{
  source_count: number;
  source_ids: readonly string[];
  task_count: number;
  task_ids: readonly string[];
  task_input_offsets: readonly number[];
  /** Node IDs address sources first, then task outputs at source_count + taskIndex. */
  input_node_ids: readonly number[];
  /** Node-to-task adjacency in CSR form. */
  node_task_offsets: readonly number[];
  dependent_task_ids: readonly number[];
  /** Stable topological order emitted at build time. */
  task_order: readonly number[];
}>;

/**
 * Small build-time fixture compiler. Production compiler output should emit this
 * packed shape directly from its semantic IR rather than call this at runtime.
 */
export const defineTaskGraphPlan = (
  sourceIds: readonly string[],
  taskIds: readonly string[],
  dependencies: readonly (readonly string[])[],
): TaskGraphPlan => {
  if (new Set(sourceIds).size !== sourceIds.length || sourceIds.some((id) => !id)) {
    throw new Error("Task graph source IDs must be unique and non-empty");
  }
  if (new Set(taskIds).size !== taskIds.length || taskIds.some((id) => !id)) {
    throw new Error("Task graph task IDs must be unique and non-empty");
  }
  if (dependencies.length !== taskIds.length) throw new Error("Task graph needs one dependency list per task");

  const sourceSlot = new Map(sourceIds.map((id, index) => [id, index]));
  const taskSlot = new Map(taskIds.map((id, index) => [id, index]));
  const taskInputOffsets = [0];
  const inputNodeIds: number[] = [];
  const dependents = Array.from({ length: sourceIds.length + taskIds.length }, () => [] as number[]);
  const taskPrerequisites = Array.from({ length: taskIds.length }, () => new Set<number>());

  for (let task = 0; task < taskIds.length; task++) {
    for (const dependency of dependencies[task]) {
      const [kind, ...parts] = dependency.split(":");
      const name = parts.join(":");
      const node = kind === "source"
        ? sourceSlot.get(name)
        : kind === "task"
        ? taskSlot.has(name) ? sourceIds.length + taskSlot.get(name)! : undefined
        : undefined;
      if (node === undefined) throw new Error(`Task graph has an unknown dependency: ${dependency}`);
      inputNodeIds.push(node);
      if (!dependents[node].includes(task)) dependents[node].push(task);
      if (node >= sourceIds.length) taskPrerequisites[task].add(node - sourceIds.length);
    }
    taskInputOffsets.push(inputNodeIds.length);
  }

  const indegree = taskPrerequisites.map((items) => items.size);
  const ready: number[] = [];
  for (let task = 0; task < taskIds.length; task++) if (indegree[task] === 0) ready.push(task);
  const taskOrder: number[] = [];
  for (let cursor = 0; cursor < ready.length; cursor++) {
    const task = ready[cursor];
    taskOrder.push(task);
    for (const dependent of dependents[sourceIds.length + task]) {
      if (--indegree[dependent] === 0) ready.push(dependent);
    }
  }
  if (taskOrder.length !== taskIds.length) throw new Error("Task graph contains a cycle");

  const nodeTaskOffsets = [0];
  const dependentTaskIds: number[] = [];
  for (const tasks of dependents) {
    dependentTaskIds.push(...tasks);
    nodeTaskOffsets.push(dependentTaskIds.length);
  }

  return {
    source_count: sourceIds.length,
    source_ids: [...sourceIds],
    task_count: taskIds.length,
    task_ids: [...taskIds],
    task_input_offsets: taskInputOffsets,
    input_node_ids: inputNodeIds,
    node_task_offsets: nodeTaskOffsets,
    dependent_task_ids: dependentTaskIds,
    task_order: taskOrder,
  };
};
