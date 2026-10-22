import type { TaskGraphPlan } from "./task_graph_plan.ts";

/** Read-only views into packed node values and task input indices; no input array is allocated per run. */
export type TaskFunction = (
  values: readonly unknown[],
  inputNodeIds: readonly number[],
  inputStart: number,
  inputEnd: number,
) => unknown;
export type TaskFunctions = Readonly<Record<string, TaskFunction>>;

/** Executes only value-dependent tasks reached from changed source nodes. */
export class TaskGraphRuntime {
  readonly #values: unknown[];
  readonly #hasTaskValue: Uint8Array;
  readonly #sourceSlot = new Map<string, number>();
  readonly #taskSlot = new Map<string, number>();
  readonly #taskFunctions: readonly TaskFunction[];
  readonly #topoRank: Uint32Array;
  readonly #pendingSources: number[] = [];
  readonly #sourceQueued: Uint8Array;
  readonly #taskQueued: Uint8Array;
  readonly #taskHeap: number[] = [];
  #initialized = false;

  constructor(
    readonly plan: TaskGraphPlan,
    functions: TaskFunctions,
    initialSources: Readonly<Record<string, unknown>> = {},
  ) {
    this.#validatePlan();
    this.#values = new Array(plan.source_count + plan.task_count);
    this.#hasTaskValue = new Uint8Array(plan.task_count);
    this.#sourceQueued = new Uint8Array(plan.source_count);
    this.#taskQueued = new Uint8Array(plan.task_count);
    for (let source = 0; source < plan.source_count; source++) {
      const id = plan.source_ids[source];
      this.#sourceSlot.set(id, source);
      this.#values[source] = initialSources[id];
    }
    for (let task = 0; task < plan.task_count; task++) {
      const id = plan.task_ids[task];
      this.#taskSlot.set(id, task);
      const fn = functions[id];
      if (typeof fn !== "function") throw new Error(`Missing task implementation: ${id}`);
    }
    this.#taskFunctions = plan.task_ids.map((id) => functions[id]);
    this.#topoRank = new Uint32Array(plan.task_count);
    plan.task_order.forEach((task, rank) => this.#topoRank[task] = rank);
  }

  getSource(sourceId: string): unknown {
    const slot = this.#sourceSlot.get(sourceId);
    if (slot === undefined) throw new Error(`Unknown task graph source: ${sourceId}`);
    return this.#values[slot];
  }

  getTaskValue(taskId: string): unknown {
    const task = this.#taskSlot.get(taskId);
    if (task === undefined) throw new Error(`Unknown task graph task: ${taskId}`);
    return this.#hasTaskValue[task] ? this.#values[this.plan.source_count + task] : undefined;
  }

  /** Change a source value; repeated writes coalesce until flush. */
  setSource(sourceId: string, value: unknown): boolean {
    const slot = this.#sourceSlot.get(sourceId);
    if (slot === undefined) throw new Error(`Unknown task graph source: ${sourceId}`);
    return this.setSourceSlot(slot, value);
  }

  /** Numeric fast path for compiler-emitted source slots. */
  setSourceSlot(slot: number, value: unknown): boolean {
    if (!Number.isInteger(slot) || slot < 0 || slot >= this.plan.source_count) {
      throw new RangeError(`Task graph source slot out of range: ${slot}`);
    }
    if (Object.is(this.#values[slot], value)) return false;
    this.#values[slot] = value;
    if (this.#sourceQueued[slot] === 0) {
      this.#sourceQueued[slot] = 1;
      this.#pendingSources.push(slot);
    }
    return true;
  }

  /** Compute the initial task snapshot once, in dependency order. */
  initialize(): number {
    if (this.#initialized) return 0;
    this.#initialized = true;
    for (let task = 0; task < this.plan.task_count; task++) {
      if (this.#taskQueued[task] === 0) {
        this.#taskQueued[task] = 1;
        this.#heapPush(task);
      }
    }
    return this.flush();
  }

  /** Propagate queued values; returns the number of task executions. */
  flush(): number {
    let executed = 0;
    try {
      while (this.#pendingSources.length > 0 || this.#taskHeap.length > 0) {
        while (this.#pendingSources.length > 0) {
          const source = this.#pendingSources.pop()!;
          this.#sourceQueued[source] = 0;
          this.#enqueueDependents(source);
        }
        while (this.#taskHeap.length > 0) {
          const task = this.#heapPop();
          this.#taskQueued[task] = 0;
          const start = this.plan.task_input_offsets[task];
          const end = this.plan.task_input_offsets[task + 1];
          const node = this.plan.source_count + task;
          const next = this.#taskFunctions[task](this.#values, this.plan.input_node_ids, start, end);
          const changed = this.#hasTaskValue[task] === 0 || !Object.is(this.#values[node], next);
          this.#values[node] = next;
          this.#hasTaskValue[task] = 1;
          executed++;
          if (changed) this.#enqueueDependents(node);
        }
      }
      return executed;
    } catch (error) {
      this.#clearPendingFlags();
      throw error;
    }
  }

  #enqueueDependents(node: number) {
    const { node_task_offsets: offsets, dependent_task_ids: tasks } = this.plan;
    for (let edge = offsets[node]; edge < offsets[node + 1]; edge++) {
      const task = tasks[edge];
      if (this.#taskQueued[task] === 0) {
        this.#taskQueued[task] = 1;
        this.#heapPush(task);
      }
    }
  }

  #heapPush(task: number) {
    const heap = this.#taskHeap;
    let index = heap.length;
    heap.push(task);
    while (index > 0) {
      const parent = (index - 1) >>> 1;
      if (this.#topoRank[heap[parent]] <= this.#topoRank[task]) break;
      heap[index] = heap[parent];
      index = parent;
    }
    heap[index] = task;
  }

  #heapPop(): number {
    const heap = this.#taskHeap;
    const first = heap[0];
    const last = heap.pop()!;
    if (heap.length === 0) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      if (left >= heap.length) break;
      const right = left + 1;
      const child = right < heap.length && this.#topoRank[heap[right]] < this.#topoRank[heap[left]] ? right : left;
      if (this.#topoRank[last] <= this.#topoRank[heap[child]]) break;
      heap[index] = heap[child];
      index = child;
    }
    heap[index] = last;
    return first;
  }

  #clearPendingFlags() {
    for (const source of this.#pendingSources) this.#sourceQueued[source] = 0;
    this.#pendingSources.length = 0;
    for (const task of this.#taskHeap) this.#taskQueued[task] = 0;
    this.#taskHeap.length = 0;
  }

  #validatePlan() {
    const plan = this.plan;
    const nodeCount = plan.source_count + plan.task_count;
    if (!Number.isInteger(plan.source_count) || plan.source_count < 0 ||
      !Number.isInteger(plan.task_count) || plan.task_count < 0 ||
      plan.source_ids.length !== plan.source_count || plan.task_ids.length !== plan.task_count ||
      plan.task_input_offsets.length !== plan.task_count + 1 || plan.task_input_offsets[0] !== 0 ||
      plan.task_input_offsets.at(-1) !== plan.input_node_ids.length ||
      plan.node_task_offsets.length !== nodeCount + 1 || plan.node_task_offsets[0] !== 0 ||
      plan.node_task_offsets.at(-1) !== plan.dependent_task_ids.length || plan.task_order.length !== plan.task_count) {
      throw new Error("Malformed task graph plan");
    }
    for (let task = 0; task < plan.task_count; task++) {
      const start = plan.task_input_offsets[task];
      const end = plan.task_input_offsets[task + 1];
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > plan.input_node_ids.length) {
        throw new Error(`Malformed task graph input range at task ${task}`);
      }
    }
    for (let node = 0; node < nodeCount; node++) {
      const start = plan.node_task_offsets[node];
      const end = plan.node_task_offsets[node + 1];
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > plan.dependent_task_ids.length) {
        throw new Error(`Malformed task graph adjacency range at node ${node}`);
      }
    }
    for (const node of plan.input_node_ids) {
      if (!Number.isInteger(node) || node < 0 || node >= nodeCount) throw new Error("Task graph contains an invalid input node");
    }
    const rank = new Int32Array(plan.task_count).fill(-1);
    for (let index = 0; index < plan.task_order.length; index++) {
      const task = plan.task_order[index];
      if (!Number.isInteger(task) || task < 0 || task >= plan.task_count || rank[task] !== -1) {
        throw new Error("Malformed task graph topological order");
      }
      rank[task] = index;
    }
    for (let task = 0; task < plan.task_count; task++) {
      for (let input = plan.task_input_offsets[task]; input < plan.task_input_offsets[task + 1]; input++) {
        const node = plan.input_node_ids[input];
        if (node >= plan.source_count && rank[node - plan.source_count] >= rank[task]) {
          throw new Error("Task graph topological order violates a dependency or contains a cycle");
        }
      }
    }
    for (const task of plan.dependent_task_ids) {
      if (!Number.isInteger(task) || task < 0 || task >= plan.task_count) throw new Error("Task graph contains an invalid dependent task");
    }
  }
}
