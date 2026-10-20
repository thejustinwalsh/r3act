import {
  type AnyAsyncStore,
  StoreRenderTransaction,
  storesForSource,
  type StoreSource,
} from "./async_store_runtime.ts";
import { type AuthoredAsyncTask } from "./async_task_plan.ts";
import {
  createTaskExecution,
  type NativeTaskExecution,
} from "./native_task_execution.ts";
import { ComponentStateRoot } from "./component_state_runtime.ts";
import { type RuntimeNode } from "./jsx_binding_runtime.ts";
import {
  type NativeRootWorkHandle,
  NativeRootWorkQueue,
  type NativeStoreDependencyLease,
} from "./native_root_work_queue.ts";
import {
  type RootWorkResolution,
  type RootWorkStatus,
} from "./root_work_queue.ts";

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
  key?: string;
  onSettled?: (resolution: RootWorkResolution) => void;
};

export type NativeTaskTransitionRoots<
  Tasks extends readonly AuthoredAsyncTask[],
> = readonly {
  root: NativeRoot;
  buildTree: (
    execution: NativeTaskExecution<Tasks>,
    root: NativeRoot,
  ) => RuntimeNode;
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

type RootDescriptor<Tasks extends readonly AuthoredAsyncTask[]> =
  NativeTaskTransitionRoots<Tasks>[number];
type CapturedRoot<Tasks extends readonly AuthoredAsyncTask[]> = {
  root: NativeRoot;
  buildTree: RootDescriptor<Tasks>["buildTree"];
  transaction: StoreRenderTransaction;
  values: Record<string, unknown>;
  stores: ReadonlySet<AnyAsyncStore>;
  unsubs: (() => void)[];
  release?: () => void;
  execution?: NativeTaskExecution<Tasks>;
  groupInputs: Record<string, unknown>;
  live: boolean;
};
type Operation<Tasks extends readonly AuthoredAsyncTask[]> = {
  id: string;
  tasks: Tasks;
  options: NativeTaskTransitionOptions;
  roots: CapturedRoot<Tasks>[];
  rootDisposers: (() => void)[];
  status: RootWorkStatus;
  resolution: RootWorkResolution;
  resolveCompletion: (value: RootWorkResolution) => void;
  completion: Promise<RootWorkResolution>;
  generation: number;
  execution?: NativeTaskExecution<Tasks>;
  executions: Set<NativeTaskExecution<Tasks>>;
  native?: NativeRootWorkHandle;
  storeDependencyLease?: NativeStoreDependencyLease;
  publicationDependencies: Map<NativeRoot, Set<AnyAsyncStore>>;
  finalSnapshot?: NativeTaskTransitionSnapshot;
  restarting: boolean;
  refreshRequested: boolean;
  refreshScheduled: boolean;
  capturing: boolean;
  disposed: boolean;
};

type OwnedExecution = {
  execution: NativeTaskExecution<any>;
  roots: Map<string, NativeRoot>;
  unsubs: Map<string, () => void>;
};

class TaskTransitionInterrupted extends Error {}

let nextOperationId = 0;
const freezeRecord = (input: InputRecord): Record<string, unknown> => {
  const result: Record<string, unknown> = Object.create(null);
  for (const [key, value] of Object.entries(input)) result[key] = value;
  return Object.freeze(result);
};
const sameValues = (
  left: Readonly<Record<string, unknown>>,
  right: Readonly<Record<string, unknown>>,
) => {
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length &&
    keys.every((key) =>
      Object.hasOwn(right, key) && Object.is(left[key], right[key])
    );
};
const changedKeys = (
  left: Readonly<Record<string, unknown>>,
  right: Readonly<Record<string, unknown>>,
) =>
  [...new Set([...Object.keys(left), ...Object.keys(right)])].filter((key) =>
    !Object.hasOwn(left, key) || !Object.hasOwn(right, key) ||
    !Object.is(left[key], right[key])
  );
const resolutionFor = (
  id: string,
  status: Exclude<RootWorkStatus, "pending">,
  roots: readonly string[],
  reason?: string,
  error?: unknown,
): RootWorkResolution => ({
  status,
  transitionId: id,
  roots: Object.freeze([...roots]),
  ...(reason === undefined ? {} : { reason }),
  ...(error === undefined ? {} : { error }),
});
const currentOperationStatus = (operation: Operation<any>): RootWorkStatus =>
  operation.status;

/**
 * Owns task executions and live-input observers for native root publications.
 * Store actions and task-domain side effects remain caller-owned.
 */
export class NativeTaskTransitionQueue {
  #queue: NativeRootWorkQueue;
  #ownsQueue: boolean;
  #operations = new Map<string, Operation<any>>();
  #keys = new Map<string, string>();
  #ownedExecutions = new Map<NativeTaskExecution<any>, OwnedExecution>();
  #disposed = false;

  constructor(options: { queue?: NativeRootWorkQueue } = {}) {
    this.#queue = options.queue ?? new NativeRootWorkQueue();
    this.#ownsQueue = options.queue === undefined;
  }

  enqueue<const Tasks extends readonly AuthoredAsyncTask[]>(
    tasks: Tasks,
    roots: NativeTaskTransitionRoots<Tasks>,
    options: NativeTaskTransitionOptions = {},
  ): NativeTaskTransitionHandle {
    this.#assertActive();
    if (!roots.length) throw new Error("Task transition requires roots");
    if (new Set(roots.map(({ root }) => root.rootId)).size !== roots.length) {
      throw new Error("Task transition cannot contain duplicate roots");
    }
    const publicId = options.id;
    if (
      publicId !== undefined && (!publicId || this.#operations.has(publicId))
    ) {
      throw new Error("Task transition IDs must be unique non-empty strings");
    }
    const id = publicId ?? "native-task-op:" + (++nextOperationId);
    let resolveCompletion!: (value: RootWorkResolution) => void;
    const completion = new Promise<RootWorkResolution>((resolve) => {
      resolveCompletion = resolve;
    });
    const taskSnapshot = Object.freeze(tasks.map((task) =>
      Object.freeze({
        id: task.id,
        dependsOn: Object.freeze([...task.dependsOn]),
        run: task.run,
      })
    )) as unknown as Tasks;
    const descriptors = Object.freeze(
      roots.map(({ root, buildTree }) => Object.freeze({ root, buildTree })),
    );
    const operation: Operation<Tasks> = {
      id,
      tasks: taskSnapshot,
      options: {
        ...options,
        inputs: freezeRecord(options.inputs ?? {}),
        liveInputs: Object.freeze({ ...(options.liveInputs ?? {}) }),
        transitions: Object.freeze([...(options.transitions ?? [])]),
        key: options.key === undefined ? undefined : String(options.key),
      },
      roots: [],
      rootDisposers: [],
      status: "pending",
      resolution: { status: "pending", transitionId: id, roots: [] },
      resolveCompletion,
      completion,
      generation: 0,
      executions: new Set(),
      publicationDependencies: new Map(),
      restarting: false,
      refreshRequested: false,
      refreshScheduled: false,
      capturing: false,
      disposed: false,
    };
    const handle: NativeTaskTransitionHandle = {
      id,
      get status() {
        return operation.status;
      },
      get resolution() {
        return operation.resolution;
      },
      completion,
      snapshot: () => this.#snapshot(operation),
      cancel: (reason) => this.#cancel(operation, reason),
    };
    this.#operations.set(id, operation);
    if (options.key !== undefined) {
      const key = options.key;
      const prior = this.#keys.get(key);
      this.#keys.set(key, id);
      if (prior) {
        const previous = this.#operations.get(prior);
        if (previous) {
          this.#cancel(previous, "Replaced by explicit operation key");
        }
      }
    }
    if (operation.status !== "pending") return handle;
    try {
      for (const descriptor of descriptors) {
        if (descriptor.root.retired) {
          throw new Error("Cannot enqueue task work for a retired root");
        }
        operation.rootDisposers.push(descriptor.root.onRetire(() => {
          this.#cancel(operation, "Root detached: " + descriptor.root.rootId);
        }));
      }
      operation.capturing = true;
      operation.roots = this.#captureAll(operation, descriptors);
      operation.capturing = false;
      if (operation.status !== "pending") return handle;
      if (operation.refreshRequested && operation.status === "pending") {
        this.#requestRefresh(operation);
      }
      if (operation.status === "pending" && operation.generation === 0) {
        this.#launch(operation);
      }
    } catch (error) {
      operation.capturing = false;
      if (operation.status !== "pending") {
        if (error instanceof TaskTransitionInterrupted) return handle;
        throw error;
      }
      this.#terminate(operation, "failed", error, undefined, true);
      throw error;
    }
    return handle;
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    if ([...this.#operations.values()].some((operation) =>
      operation.status === "pending" &&
      this.#queue.isApplying(operation.id + ":generation:" + operation.generation)
    )) {
      queueMicrotask(() => this.#finishDispose());
      return;
    }
    this.#finishDispose();
  }

  #finishDispose(): void {
    for (const operation of [...this.#operations.values()]) {
      if (operation.status === "pending") {
        this.#cancel(operation, "Task transition queue disposed");
      }
    }
    for (const owned of this.#ownedExecutions.values()) {
      if (owned.execution.snapshot().status === "pending") {
        owned.execution.cancel("Task transition queue disposed");
      }
    }
    if (this.#ownsQueue) this.#queue.dispose();
  }

  #capture<Tasks extends readonly AuthoredAsyncTask[]>(
    operation: Operation<Tasks>,
    descriptor: RootDescriptor<Tasks>,
    attempt = 0,
  ): CapturedRoot<Tasks> {
    if (operation.status !== "pending") {
      throw new TaskTransitionInterrupted();
    }
    const root = descriptor.root;
    const transaction = new StoreRenderTransaction(root.rootId, {
      transitions: operation.options.transitions,
    });
    const values: Record<string, unknown> = Object.assign(
      Object.create(null),
      operation.options.inputs,
    );
    const stores = new Set<AnyAsyncStore>();
    let captured: CapturedRoot<Tasks> | undefined;
    try {
      for (
        const [key, source] of Object.entries(
          operation.options.liveInputs ?? {},
        )
      ) {
        if (Object.hasOwn(values, key)) {
          throw new Error(
            "Live task input collides with immutable input: " + key,
          );
        }
        for (const store of storesForSource(source)) stores.add(store);
        values[key] = transaction.read(
          source,
          "native-task:" + operation.id + ":" + key,
        );
        if (operation.status !== "pending") {
          throw new TaskTransitionInterrupted();
        }
      }
      captured = {
        root,
        buildTree: descriptor.buildTree,
        transaction,
        values: Object.freeze(values),
        stores,
        unsubs: [],
        groupInputs: Object.freeze({}),
        live: true,
      };
      if (stores.size) {
        captured.release = root.holdStoreDependencies(stores);
        if (operation.status !== "pending") {
          throw new TaskTransitionInterrupted();
        }
        for (const store of stores) {
          captured.unsubs.push(
            store.subscribe(root.rootId, () => this.#requestRefresh(operation)),
          );
          if (operation.status !== "pending") {
            throw new TaskTransitionInterrupted();
          }
        }
      }
      // Recheck after observer registration so an update cannot fall between
      // the snapshot and subscription boundary.
      if (!transaction.validate()) {
        this.#releaseRoot(captured);
        transaction.discard();
        if (operation.status !== "pending") {
          throw new TaskTransitionInterrupted();
        }
        if (attempt < 2) {
          return this.#capture(operation, descriptor, attempt + 1);
        }
        throw new Error("Could not capture a stable live task input cut");
      }
      if (operation.status !== "pending") {
        throw new TaskTransitionInterrupted();
      }
      return captured;
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      if (captured) {
        try { this.#releaseRoot(captured); }
        catch (cleanupError) { cleanupErrors.push(cleanupError); }
      }
      try { transaction.discard(); }
      catch (cleanupError) { cleanupErrors.push(cleanupError); }
      throw cleanupErrors.length
        ? new AggregateError([error, ...cleanupErrors], "Task input capture cleanup failed")
        : error;
    }
  }

  #launch<Tasks extends readonly AuthoredAsyncTask[]>(
    operation: Operation<Tasks>,
    priorGroups: readonly {
      execution: NativeTaskExecution<Tasks>;
      values: Record<string, unknown>;
      rootIds: ReadonlySet<string>;
      completedValues: ReadonlyMap<string, unknown>;
      completed: readonly string[];
    }[] = [],
  ): void {
    if (operation.status !== "pending" || operation.disposed) return;
    const generation = ++operation.generation;
    operation.execution = undefined;
    const groups: {
      values: Record<string, unknown>;
      roots: CapturedRoot<Tasks>[];
      execution?: NativeTaskExecution<Tasks>;
    }[] = [];
    const retainedExecutions = new Set<NativeTaskExecution<Tasks>>();
    operation.executions = new Set();
    for (const captured of operation.roots) {
      const group = groups.find((candidate) =>
        sameValues(candidate.values, captured.values)
      );
      if (group) group.roots.push(captured);
      else groups.push({ values: captured.values, roots: [captured] });
    }
    try {
      for (const group of groups) {
        const priorMatches = priorGroups.filter((prior) =>
          group.roots.some((root) => prior.rootIds.has(root.root.rootId))
        );
        const equalPrior = priorMatches.find((prior) =>
          sameValues(prior.values, group.values)
        );
        if (equalPrior) {
          group.execution = equalPrior.execution;
          retainedExecutions.add(equalPrior.execution);
        } else if (priorMatches.length === 1) {
          const prior = priorMatches[0];
          const inputsChanged = changedKeys(prior.values, group.values);
          group.execution = createTaskExecution(
            operation.tasks,
            group.values,
            {
              maxConcurrency: operation.options.maxConcurrency,
              reuseCompleted: prior.completed.length
                ? {
                  values: prior.completedValues,
                  completed: prior.completed,
                  changedInputs: inputsChanged,
                }
                : undefined,
            },
          );
        }
        group.execution ??= createTaskExecution(
          operation.tasks,
          group.values,
          { maxConcurrency: operation.options.maxConcurrency },
        );
        if (operation.status !== "pending") {
          throw new TaskTransitionInterrupted();
        }
        operation.executions.add(group.execution);
        this.#trackExecution(
          group.execution,
          group.roots.map(({ root }) => root),
        );
        if (operation.status !== "pending") {
          throw new TaskTransitionInterrupted();
        }
        for (const root of group.roots) {
          root.execution = group.execution;
          root.groupInputs = group.values;
        }
        if (operation.status !== "pending") {
          throw new TaskTransitionInterrupted();
        }
      }

      for (const prior of priorGroups) {
        if (!retainedExecutions.has(prior.execution)) {
          prior.execution.cancel("Live task input changed");
        }
      }
      if (operation.status !== "pending") {
        throw new TaskTransitionInterrupted();
      }

      operation.execution = groups[0]?.execution;
      const trees: { root: NativeRoot; tree: RuntimeNode }[] = [];
      for (const root of operation.roots) {
        trees.push({
          root: root.root,
          tree: root.buildTree(root.execution!, root.root),
        });
        if (operation.status !== "pending") {
          throw new TaskTransitionInterrupted();
        }
      }
      this.#rememberPublicationDependencies(
        operation,
        operation.roots.map(({ root, stores }) => ({ root, stores })),
      );
      if (operation.status !== "pending") {
        throw new TaskTransitionInterrupted();
      }
      const handle = this.#queue.enqueue({
        id: operation.id + ":generation:" + generation,
        key: operation.options.key,
        roots: trees,
        transitions: operation.options.transitions,
        finishTransitions: operation.options.finishTransitions,
        validateWork: () =>
          operation.status === "pending" &&
          operation.generation === generation &&
          operation.roots.every((root) =>
            root.live && root.transaction.validate()
          ),
        publicationDependencies: [...operation.publicationDependencies].map(
          ([root, stores]) => ({ root, stores }),
        ),
        onStaleWork: () => {
          if (
            operation.status !== "pending" ||
            operation.generation !== generation
          ) return "reject";
          this.#requestRefresh(operation);
          return "retry";
        },
        onSettled: (result) => this.#rootSettled(operation, generation, result),
      });
      if (
        operation.status === "pending" && operation.generation === generation
      ) {
        operation.native = handle;
      }
    } catch (error) {
      if (currentOperationStatus(operation) === "committed") throw error;
      const cleanupErrors: unknown[] = [];
      for (const execution of new Set([
        ...priorGroups.map(({ execution }) => execution),
        ...groups.flatMap(({ execution }) => execution ? [execution] : []),
      ])) {
        try { execution.cancel("Task transition setup failed"); }
        catch (cleanupError) { cleanupErrors.push(cleanupError); }
        try { execution.dispose(); }
        catch (cleanupError) { cleanupErrors.push(cleanupError); }
      }
      const failure = cleanupErrors.length
        ? new AggregateError([error, ...cleanupErrors], "Task transition setup cleanup failed")
        : error;
      if (operation.status !== "pending") {
        if (failure instanceof TaskTransitionInterrupted) return;
        throw failure;
      }
      this.#terminate(operation, "failed", failure, undefined, true);
    }
  }

  #captureAll<Tasks extends readonly AuthoredAsyncTask[]>(
    operation: Operation<Tasks>,
    descriptors: readonly RootDescriptor<Tasks>[] = operation.roots.map(
      ({ root, buildTree }) => ({ root, buildTree }),
    ),
  ): CapturedRoot<Tasks>[] {
    for (let attempt = 0; attempt < 3; attempt++) {
      const captured: CapturedRoot<Tasks>[] = [];
      try {
        for (const descriptor of descriptors) {
          captured.push(this.#capture(operation, descriptor));
          if (operation.status !== "pending") {
            throw new TaskTransitionInterrupted();
          }
        }
        if (captured.every((root) => root.transaction.validate())) {
          if (operation.status !== "pending") {
            throw new TaskTransitionInterrupted();
          }
          return captured;
        }
      } catch (error) {
        const cleanupErrors: unknown[] = [];
        for (const root of captured) {
          try { this.#releaseRoot(root); }
          catch (cleanupError) { cleanupErrors.push(cleanupError); }
          try { root.transaction.discard(); }
          catch (cleanupError) { cleanupErrors.push(cleanupError); }
        }
        throw cleanupErrors.length
          ? new AggregateError([error, ...cleanupErrors], "Task root capture cleanup failed")
          : error;
      }
      for (const root of captured) this.#releaseRoot(root);
      for (const root of captured) root.transaction.discard();
    }
    throw new Error("Could not capture a coherent live task cut across roots");
  }

  #priorGroups<Tasks extends readonly AuthoredAsyncTask[]>(
    roots: readonly CapturedRoot<Tasks>[],
  ) {
    const groups = new Map<NativeTaskExecution<Tasks>, {
      execution: NativeTaskExecution<Tasks>;
      values: Record<string, unknown>;
      rootIds: Set<string>;
      completedValues: ReadonlyMap<string, unknown>;
      completed: readonly string[];
    }>();
    for (const root of roots) {
      const execution = root.execution;
      if (!execution) continue;
      let group = groups.get(execution);
      if (!group) {
        const snapshot = execution.snapshot();
        groups.set(
          execution,
          group = {
            execution,
            values: root.groupInputs,
            rootIds: new Set(),
            completedValues: new Map(snapshot.completedValues),
            completed: [...snapshot.completed],
          },
        );
      }
      group.rootIds.add(root.root.rootId);
    }
    return [...groups.values()];
  }

  #requestRefresh<Tasks extends readonly AuthoredAsyncTask[]>(
    operation: Operation<Tasks>,
  ): void {
    if (operation.status !== "pending") return;
    operation.refreshRequested = true;
    if (operation.capturing) return;
    if (operation.restarting) return;
    operation.restarting = true;
    let attempts = 0;
    try {
      while (
        operation.refreshRequested && operation.status === "pending" &&
        attempts++ < 8
      ) {
        operation.refreshRequested = false;
        const oldRoots = operation.roots;
        const priorGroups = this.#priorGroups(oldRoots);
        const fresh = this.#captureAll(operation);
        const changed = fresh.some((root, index) =>
          !sameValues(oldRoots[index].values, root.values)
        );
        if (!changed) {
          for (let index = 0; index < fresh.length; index++) {
            fresh[index].execution = oldRoots[index].execution;
            fresh[index].groupInputs = oldRoots[index].groupInputs;
          }
          operation.roots = fresh;
          for (const old of oldRoots) {
            old.transaction.discard();
            this.#releaseRoot(old);
          }
          operation.native?.refresh();
          continue;
        }
        operation.generation++;
        const priorNative = operation.native;
        operation.roots = fresh;
        let lease: NativeStoreDependencyLease | undefined;
        try {
          if (priorNative?.status === "pending") {
            lease = priorNative.retainStoreDependencies();
            this.#rememberPublicationDependencies(
              operation,
              lease.dependencies,
            );
          }
        } catch (error) {
          for (const old of oldRoots) {
            old.transaction.discard();
            this.#releaseRoot(old);
          }
          throw error;
        } finally {
          // Aggregate holds are installed before this temporary native lease
          // is released, including when the store union already exists.
          lease?.release();
        }
        for (const old of oldRoots) {
          old.transaction.discard();
          this.#releaseRoot(old);
        }
        // Generation/status changes happen before cancellation callbacks.
        priorNative?.cancel("Live task input changed");
        operation.native = undefined;
        this.#launch(operation, priorGroups);
      }
    } catch (error) {
      if (operation.status !== "pending") {
        if (error instanceof TaskTransitionInterrupted) return;
        throw error;
      }
      this.#terminate(operation, "failed", error, undefined, true);
    } finally {
      operation.restarting = false;
      if (
        operation.refreshRequested && operation.status === "pending" &&
        !operation.refreshScheduled
      ) {
        operation.refreshScheduled = true;
        queueMicrotask(() => {
          operation.refreshScheduled = false;
          this.#requestRefresh(operation);
        });
      }
    }
  }

  #rootSettled<Tasks extends readonly AuthoredAsyncTask[]>(
    operation: Operation<Tasks>,
    generation: number,
    result: RootWorkResolution,
  ): void {
    if (generation !== operation.generation || operation.status !== "pending") {
      return;
    }
    if (result.status === "failed") {
      this.#terminate(operation, "failed", result.error, result.reason, true);
      return;
    }
    if (result.status === "cancelled") {
      this.#terminate(
        operation,
        "cancelled",
        undefined,
        result.reason ?? "Root detached",
        true,
      );
      return;
    }
    if (result.status === "stale") {
      this.#terminate(operation, "stale", result.error, result.reason, true);
      return;
    }
    if (result.status !== "committed") return;
    for (const root of operation.roots) {
      // Task input reads are freshness guards, not native UI read sites.
      // Discard their selector staging instead of publishing reader history.
      root.transaction.discard();
      this.#releaseRoot(root);
    }
    this.#terminate(operation, "committed", undefined, undefined, false);
  }

  #cancel(operation: Operation<any>, reason?: string): RootWorkResolution {
    if (operation.status !== "pending") return operation.resolution;
    if (
      this.#queue.isApplying(
        operation.id + ":generation:" + operation.generation,
      )
    ) return operation.resolution;
    operation.disposed = true;
    return this.#terminate(operation, "cancelled", undefined, reason, true);
  }

  #terminate<Tasks extends readonly AuthoredAsyncTask[]>(
    operation: Operation<Tasks>,
    status: Exclude<RootWorkStatus, "pending">,
    error?: unknown,
    reason?: string,
    abortOwnedWork = status !== "committed",
  ): RootWorkResolution {
    if (operation.status !== "pending") return operation.resolution;
    operation.status = status;
    operation.generation++;
    const snapshots = [...operation.executions].map((execution) =>
      execution.snapshot()
    );
    operation.finalSnapshot = Object.freeze({
      status,
      generation: operation.generation,
      taskIds: Object.freeze(
        operation.tasks.map((task: AuthoredAsyncTask) => task.id),
      ),
      roots: Object.freeze(operation.roots.map(({ root }) => root.rootId)),
      started: Object.freeze([
        ...new Set(snapshots.flatMap(({ started }) => started)),
      ]),
      completed: Object.freeze([
        ...new Set(snapshots.flatMap(({ completed }) => completed)),
      ]),
      reused: Object.freeze([
        ...new Set(snapshots.flatMap(({ reused }) => reused)),
      ]),
    });
    operation.resolution = resolutionFor(
      operation.id,
      status,
      operation.roots.map(({ root }) => root.rootId),
      reason,
      error,
    );
    const native = operation.native;
    operation.native = undefined;
    if (abortOwnedWork) {
      try {
        native?.cancel(reason ?? "Task transition settled");
      } catch {
        // Terminal cleanup still releases task and store dependencies.
      }
    }
    if (abortOwnedWork) {
      for (const execution of operation.executions) {
        try {
          execution.cancel(reason ?? "Task transition settled");
        } catch {
          // Terminal cleanup proceeds even if a custom task adapter throws.
        }
        try {
          execution.dispose();
        } catch {
          // Disposal errors cannot retain subscriptions or prevent completion.
        }
      }
    }
    for (const root of operation.roots) {
      root.transaction.discard();
      this.#releaseRoot(root);
    }
    this.#releaseStoreDependencyLease(operation);
    for (const unsubscribe of operation.rootDisposers.splice(0)) unsubscribe();
    if (
      operation.options.key !== undefined &&
      this.#keys.get(operation.options.key) === operation.id
    ) {
      this.#keys.delete(operation.options.key);
    }
    const callback = operation.options.onSettled;
    operation.options = {};
    try {
      callback?.(operation.resolution);
    } catch {
      // Settled observers cannot reopen a terminal operation.
    }
    this.#operations.delete(operation.id);
    operation.roots.length = 0;
    operation.publicationDependencies.clear();
    operation.execution = undefined;
    operation.executions.clear();
    operation.tasks = [] as unknown as Tasks;
    operation.refreshRequested = false;
    operation.resolveCompletion(operation.resolution);
    return operation.resolution;
  }

  #releaseRoot<Tasks extends readonly AuthoredAsyncTask[]>(
    root: CapturedRoot<Tasks>,
  ): void {
    if (!root.live) return;
    root.live = false;
    for (const unsubscribe of root.unsubs.splice(0)) unsubscribe();
    root.release?.();
    root.release = undefined;
  }

  #rememberPublicationDependencies(
    operation: Operation<any>,
    dependencies: readonly {
      readonly root: NativeRoot;
      readonly stores: ReadonlySet<AnyAsyncStore>;
    }[],
  ): void {
    const merged = new Map<NativeRoot, Set<AnyAsyncStore>>(
      [...operation.publicationDependencies].map(([root, stores]) => [
        root,
        new Set(stores),
      ]),
    );
    let changed = false;
    for (const { root, stores } of dependencies) {
      let retained = merged.get(root);
      if (!retained) {
        retained = new Set();
        merged.set(root, retained);
        changed = true;
      }
      for (const store of stores) {
        if (retained.has(store)) continue;
        retained.add(store);
        changed = true;
      }
    }
    if (!changed) return;

    const retainedDependencies = Object.freeze(
      [...merged].map(([root, stores]) =>
        Object.freeze({ root, stores: new Set(stores) })
      ),
    );
    const releases: (() => void)[] = [];
    try {
      for (const { root, stores } of retainedDependencies) {
        releases.push(root.holdStoreDependencies(stores));
        if (operation.status !== "pending") {
          throw new TaskTransitionInterrupted();
        }
      }
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      for (const release of releases.splice(0)) {
        try { release(); }
        catch (cleanupError) { cleanupErrors.push(cleanupError); }
      }
      throw cleanupErrors.length
        ? new AggregateError([error, ...cleanupErrors], "Task publication lease cleanup failed")
        : error;
    }
    const previous = operation.storeDependencyLease;
    operation.publicationDependencies = merged;
    operation.storeDependencyLease = {
      dependencies: retainedDependencies,
      release: () => {
        for (const release of releases.splice(0)) release();
      },
    };
    previous?.release();
  }

  #releaseStoreDependencyLease(operation: Operation<any>): void {
    const lease = operation.storeDependencyLease;
    operation.storeDependencyLease = undefined;
    try {
      lease?.release();
    } catch {
      // Keep terminal cleanup moving if a dependency release throws.
    }
  }

  #trackExecution(
    execution: NativeTaskExecution<any>,
    roots: readonly NativeRoot[],
  ): void {
    let owned = this.#ownedExecutions.get(execution);
    if (!owned) {
      owned = { execution, roots: new Map(), unsubs: new Map() };
      this.#ownedExecutions.set(execution, owned);
      void execution.completion.then(
        () => this.#releaseExecution(execution),
        () => this.#releaseExecution(execution),
      );
    }
    for (const root of roots) {
      if (owned.roots.has(root.rootId)) continue;
      owned.roots.set(root.rootId, root);
      owned.unsubs.set(
        root.rootId,
        root.onRetire(() => {
          const current = this.#ownedExecutions.get(execution);
          if (!current) return;
          current.roots.delete(root.rootId);
          current.unsubs.get(root.rootId)?.();
          current.unsubs.delete(root.rootId);
          if (
            !current.roots.size && execution.snapshot().status === "pending"
          ) {
            execution.cancel("All task transition roots detached");
          }
        }),
      );
    }
  }

  #releaseExecution(execution: NativeTaskExecution<any>): void {
    const owned = this.#ownedExecutions.get(execution);
    if (!owned) return;
    for (const unsubscribe of owned.unsubs.values()) unsubscribe();
    owned.unsubs.clear();
    owned.roots.clear();
    this.#ownedExecutions.delete(execution);
  }

  #snapshot(operation: Operation<any>): NativeTaskTransitionSnapshot {
    if (operation.finalSnapshot) return operation.finalSnapshot;
    const current = [...operation.executions].map((execution) =>
      execution.snapshot()
    );
    return Object.freeze({
      status: operation.status,
      generation: operation.generation,
      taskIds: Object.freeze(
        operation.tasks.map((task: AuthoredAsyncTask) => task.id),
      ),
      roots: Object.freeze(operation.roots.map(({ root }) => root.rootId)),
      started: Object.freeze([
        ...new Set(current.flatMap(({ started }) => started)),
      ]),
      completed: Object.freeze([
        ...new Set(current.flatMap(({ completed }) => completed)),
      ]),
      reused: Object.freeze([
        ...new Set(current.flatMap(({ reused }) => reused)),
      ]),
    });
  }

  #assertActive(): void {
    if (this.#disposed) {
      throw new Error("Native task transition queue is disposed");
    }
  }
}
