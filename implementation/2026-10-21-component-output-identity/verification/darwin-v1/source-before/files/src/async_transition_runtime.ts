import {
  type AsyncTaskReuse,
  type AsyncTaskSpec,
  executeAsyncTaskPlan,
  prepareAsyncTaskPlan,
} from "./async_task_scheduler.ts";
import {
  TransitionCoordinator,
  type TransitionResolution,
} from "./transition_coordinator.ts";

export type AsyncTransitionRoot<T> = {
  rootId: string;
  baseVersion: number;
  targetVersion: number;
  /** The currently committed snapshot, retained while the candidate is pending. */
  committedSnapshot: T;
};

export type AsyncTransitionPlan<T> = {
  roots: readonly AsyncTransitionRoot<T>[];
  tasks: readonly AsyncTaskSpec[];
  initialValues?: Readonly<Record<string, unknown>>;
  maxConcurrency?: number;
  signal?: AbortSignal;
  /** Reuse completed, dependency-independent outputs from an aborted attempt. */
  reuseCompleted?: AsyncTaskReuse;
  /**
   * Build all root snapshots from completed task values. This callback runs
   * after async work settles, so live application state reads can include
   * urgent commits made while the task plan was pending.
   */
  buildSnapshots: (
    values: ReadonlyMap<string, unknown>,
  ) => ReadonlyMap<string, T>;
};

export type AsyncTransitionResult = {
  resolution: TransitionResolution;
  startedTasks: readonly string[];
  completedTasks: readonly string[];
  reusedTasks: readonly string[];
  taskValues: ReadonlyMap<string, unknown>;
};

/**
 * Coordinates async task execution with versioned, atomic root publication.
 * The committed snapshots remain visible until every declared task completes;
 * then all candidate root snapshots are staged and committed together.
 *
 * This is an event-loop async coordinator. It overlaps I/O-like promises but
 * does not parallelize CPU work or yet support progressive reveal boundaries.
 */
export class AsyncTransitionRuntime<T = unknown> {
  #controllers = new Map<number, AbortController>();
  #rootsByGeneration = new Map<number, Set<string>>();
  #tasksByGeneration = new Map<number, readonly AsyncTaskSpec[]>();

  constructor(
    private readonly coordinator: TransitionCoordinator<T>,
  ) {}

  /**
   * Cancel pending candidates whose task graph reads changed application
   * inputs. The caller supplies compiler-known changed dependency IDs.
   */
  invalidateChangedInputs(rootId: string, changedIds: readonly string[]) {
    const changed = new Set(changedIds);
    if (changed.size === 0) return 0;
    let invalidated = 0;
    for (const [generation, roots] of this.#rootsByGeneration) {
      if (!roots.has(rootId)) continue;
      const readsChangedInput = this.#tasksByGeneration.get(generation)?.some(
        (task) => task.dependsOn.some((dependency) => changed.has(dependency)),
      ) ?? false;
      if (!readsChangedInput) continue;
      this.#controllers.get(generation)?.abort("urgent dependency changed");
      this.coordinator.cancel(generation);
      this.#controllers.delete(generation);
      this.#rootsByGeneration.delete(generation);
      this.#tasksByGeneration.delete(generation);
      invalidated++;
    }
    return invalidated;
  }

  #validateRoots(roots: readonly AsyncTransitionRoot<T>[]) {
    if (roots.length === 0) {
      throw new Error("An async transition requires at least one root");
    }
    const seen = new Set<string>();
    for (const root of roots) {
      if (seen.has(root.rootId)) {
        throw new Error(`Duplicate root in transition: ${root.rootId}`);
      }
      seen.add(root.rootId);
      const currentVersion = this.coordinator.getVersion(root.rootId);
      if (root.baseVersion !== currentVersion) {
        throw new Error(
          `Stale base version for ${root.rootId}: expected ${currentVersion}, received ${root.baseVersion}`,
        );
      }
      if (
        !Number.isInteger(root.targetVersion) ||
        root.targetVersion <= root.baseVersion
      ) {
        throw new Error(
          `Target version for ${root.rootId} must advance its base version`,
        );
      }
    }
  }

  #validateSnapshots(
    roots: readonly AsyncTransitionRoot<T>[],
    snapshots: ReadonlyMap<string, T>,
  ) {
    if (snapshots.size !== roots.length) {
      throw new Error("Prepared snapshots must cover every transition root");
    }
    for (const root of roots) {
      if (!snapshots.has(root.rootId)) {
        throw new Error(`Missing prepared snapshot for ${root.rootId}`);
      }
    }
  }

  async run(plan: AsyncTransitionPlan<T>): Promise<AsyncTransitionResult> {
    this.#validateRoots(plan.roots);
    const initialValues = plan.initialValues ?? {};
    const preparedPlan = prepareAsyncTaskPlan(plan.tasks, initialValues);
    const maxConcurrency = plan.maxConcurrency ?? Number.POSITIVE_INFINITY;
    if (
      !(maxConcurrency === Number.POSITIVE_INFINITY ||
        Number.isSafeInteger(maxConcurrency)) || maxConcurrency < 1
    ) {
      throw new RangeError(
        "maxConcurrency must be a positive integer or Infinity",
      );
    }

    // A newer candidate touching the same root invalidates and cancels the
    // older candidate's work before starting its own task plan.
    const rootIds = new Set(plan.roots.map((root) => root.rootId));
    for (const [generation, roots] of this.#rootsByGeneration) {
      if ([...roots].some((rootId) => rootIds.has(rootId))) {
        this.#controllers.get(generation)?.abort("superseded");
        this.coordinator.cancel(generation);
        this.#controllers.delete(generation);
        this.#rootsByGeneration.delete(generation);
      }
    }

    const pendingResources = plan.tasks.map((task) => task.id);
    if (pendingResources.length === 0) {
      const snapshots = plan.buildSnapshots(
        new Map(Object.entries(initialValues)),
      );
      this.#validateSnapshots(plan.roots, snapshots);
      const resolution = this.coordinator.begin(plan.roots.map((root) => ({
        rootId: root.rootId,
        baseVersion: root.baseVersion,
        targetVersion: root.targetVersion,
        snapshot: snapshots.get(root.rootId)!,
        pendingResources: [],
      })));
      return {
        resolution,
        startedTasks: [],
        completedTasks: [],
        reusedTasks: [],
        taskValues: new Map(Object.entries(initialValues)),
      };
    }

    const candidateStart = this.coordinator.begin(plan.roots.map((root) => ({
      rootId: root.rootId,
      baseVersion: root.baseVersion,
      targetVersion: root.targetVersion,
      snapshot: root.committedSnapshot,
      pendingResources,
    })));
    if (candidateStart.status !== "pending") {
      return {
        resolution: candidateStart,
        startedTasks: [],
        completedTasks: [],
        reusedTasks: [],
        taskValues: new Map(Object.entries(initialValues)),
      };
    }

    const generation = this.coordinator.generation;
    const controller = new AbortController();
    const abortFromCaller = () => controller.abort(plan.signal?.reason);
    if (plan.signal?.aborted) abortFromCaller();
    else {plan.signal?.addEventListener("abort", abortFromCaller, {
        once: true,
      });}
    this.#controllers.set(generation, controller);
    this.#rootsByGeneration.set(generation, rootIds);
    this.#tasksByGeneration.set(generation, plan.tasks);

    try {
      const execution = await executeAsyncTaskPlan(
        plan.tasks,
        initialValues,
        {
          maxConcurrency: plan.maxConcurrency,
          signal: controller.signal,
          reuseCompleted: plan.reuseCompleted,
        },
        preparedPlan,
      );
      if (execution.status === "aborted") {
        return {
          resolution: this.coordinator.cancel(generation),
          startedTasks: execution.started,
          completedTasks: execution.completed,
          reusedTasks: execution.reused,
          taskValues: execution.values,
        };
      }

      const snapshots = plan.buildSnapshots(execution.values);
      this.#validateSnapshots(plan.roots, snapshots);
      const currentVersions = plan.roots.map((root) => ({
        rootId: root.rootId,
        baseVersion: this.coordinator.getVersion(root.rootId),
      }));
      const changedDuringPreparation = currentVersions.some((
        { rootId, baseVersion },
      ) =>
        plan.roots.find((root) => root.rootId === rootId)!.baseVersion !==
          baseVersion
      );
      const staged = changedDuringPreparation
        ? this.coordinator.rebase(
          generation,
          currentVersions.map(({ rootId, baseVersion }) => ({
            rootId,
            baseVersion,
            targetVersion: baseVersion + 1,
            snapshot: snapshots.get(rootId)!,
            pendingResources,
          })),
        )
        : this.coordinator.stageSnapshots(generation, snapshots);
      if (staged.status !== "pending") {
        return {
          resolution: staged,
          startedTasks: execution.started,
          completedTasks: execution.completed,
          reusedTasks: execution.reused,
          taskValues: execution.values,
        };
      }

      let resolution: TransitionResolution = staged;
      for (const resource of pendingResources) {
        resolution = this.coordinator.resolve(generation, resource);
        if (
          resolution.status !== "pending" &&
          resource !== pendingResources.at(-1)
        ) {
          break;
        }
      }
      return {
        resolution,
        startedTasks: execution.started,
        completedTasks: execution.completed,
        reusedTasks: execution.reused,
        taskValues: execution.values,
      };
    } catch (error) {
      this.coordinator.cancel(generation);
      throw error;
    } finally {
      plan.signal?.removeEventListener("abort", abortFromCaller);
      this.#controllers.delete(generation);
      this.#rootsByGeneration.delete(generation);
      this.#tasksByGeneration.delete(generation);
    }
  }
}
