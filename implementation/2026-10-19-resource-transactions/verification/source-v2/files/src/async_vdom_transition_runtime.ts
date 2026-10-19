import {
  type AsyncTransitionResult,
  AsyncTransitionRuntime,
} from "./async_transition_runtime.ts";
import type { AsyncTaskReuse, AsyncTaskSpec } from "./async_task_scheduler.ts";
import type { RuntimeNode } from "./jsx_binding_runtime.ts";
import type { OwnerStateWorld, StateChange } from "./owner_state_world.ts";
import type {
  AsyncStore,
  StoreRenderSnapshot,
} from "./async_store_runtime.ts";
import { TransitionCoordinator } from "./transition_coordinator.ts";
import {
  type PreparedVDOMCommit,
  type VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";

export type AsyncVDOMTransitionPlan = {
  rootIds: readonly string[];
  tasks: readonly AsyncTaskSpec[];
  /** Store action logs whose root projections join this candidate commit. */
  storeTransitions?: readonly {
    store: AsyncStore<any, any>;
    transitionId: string;
  }[];
  /** Stores read by candidate roots, including stores without pending actions. */
  storeReads?: readonly AsyncStore<any, any>[];
  initialValues?: Readonly<Record<string, unknown>>;
  maxConcurrency?: number;
  signal?: AbortSignal;
  /** Maximum full-plan restarts after a declared external input changes. */
  maxInputRestarts?: number;
  /** Read the newest values for changed input IDs before a restart. */
  refreshInputs?: (
    changedInputIds: readonly string[],
  ) => Readonly<Record<string, unknown>>;
  /** Reuse completed task outputs outside the changed-input DAG closure. */
  reuseCompletedTasks?: boolean;
  /** Read the latest committed app state when constructing the candidate. */
  buildTree: (
    rootId: string,
    values: ReadonlyMap<string, unknown>,
    context: {
      storeTransitionIds: readonly string[];
      storeSnapshots: ReadonlyMap<
        AsyncStore<any, any>,
        StoreRenderSnapshot<any, any>
      >;
    },
  ) => RuntimeNode;
};

export type AsyncVDOMTransitionResult = AsyncTransitionResult & {
  restartCount: number;
};

/**
 * A concrete adapter from async candidate preparation to retained VDOM roots.
 * Every candidate VDOM is normalized and validated before any root is patched;
 * the prepared host commits then run synchronously as one coordinator batch.
 */
export class AsyncVDOMTransitionRuntime<H, Parent = H> {
  readonly coordinator: TransitionCoordinator<PreparedVDOMCommit>;
  readonly transitions: AsyncTransitionRuntime<PreparedVDOMCommit>;
  #pendingChangedSites = new Map<string, Set<string>>();
  #nextRunId = 0;
  #activeRunByRoot = new Map<string, number>();
  #restartInputsByRun = new Map<number, Set<string>>();
  #storeTransitionsByRoot = new Map<
    string,
    readonly { store: AsyncStore<any, any>; transitionId: string }[]
  >();
  #storeSnapshotsByRoot = new Map<
    string,
    ReadonlyMap<AsyncStore<any, any>, StoreRenderSnapshot<any, any>>
  >();

  constructor(
    private readonly roots: ReadonlyMap<string, VDOMSnapshotRoot<H, Parent>>,
  ) {
    const versions = new Map<string, number>();
    for (const [rootId, root] of roots) versions.set(rootId, root.version);
    this.coordinator = new TransitionCoordinator(versions, (batch) => {
      // Check every host root before mutating any of them. Direct commits made
      // outside this coordinator invalidate the candidate rather than allowing
      // an old async result to overwrite newer UI.
      for (const candidate of batch) {
        const target = this.roots.get(candidate.rootId);
        if (!target) {
          throw new Error(`Unknown VDOM transition root: ${candidate.rootId}`);
        }
        if (target.version !== candidate.baseVersion) {
          throw new Error(
            `VDOM root ${candidate.rootId} changed during async preparation`,
          );
        }
      }
      // Validate every root's complete store read set before mutating any host.
      // A stale snapshot invalidates the candidate as a whole, preserving the
      // currently committed tree instead of exposing a mixed store version.
      for (const candidate of batch) {
        for (const snapshot of this.#storeSnapshotsByRoot.get(candidate.rootId)?.values() ?? []) {
          if (!snapshot.validate()) {
            throw new Error(
              `Store snapshot for root ${candidate.rootId} changed during async preparation`,
            );
          }
        }
      }
      // Preparation and structural validation have already completed. These
      // synchronous host mutations occur in one JS task, before the next paint.
      for (const root of batch) root.snapshot.commit();
      for (const root of batch) {
        for (const snapshot of this.#storeSnapshotsByRoot.get(root.rootId)?.values() ?? []) {
          snapshot.commitAfterValidatedRender();
        }
      }
      const links = new Set(
        batch.flatMap((root) =>
          this.#storeTransitionsByRoot.get(root.rootId) ?? []
        ),
      );
      for (const link of links) link.store.finishTransition(link.transitionId);
      for (const root of batch) {
        for (const link of this.#storeTransitionsByRoot.get(root.rootId) ?? []) {
          link.store.commitTransition(link.transitionId, root.rootId);
        }
        this.#storeTransitionsByRoot.set(root.rootId, []);
      }
    });
    this.transitions = new AsyncTransitionRuntime(this.coordinator);
  }

  /**
   * Observe ECS state writes for a root. Matching task inputs are invalidated
   * at dispatch time; independent writes are retained for the next urgent
   * commit so its candidate can rebase against the new root version.
   */
  watchStateWorld(rootId: string, world: OwnerStateWorld) {
    if (!this.roots.has(rootId)) {
      throw new Error("Unknown VDOM transition root: " + rootId);
    }
    let changedSites = this.#pendingChangedSites.get(rootId);
    if (!changedSites) {
      this.#pendingChangedSites.set(rootId, changedSites = new Set());
    }
    return world.subscribeChanges((change) => {
      changedSites!.add(change.site);
      const invalidated = this.transitions.invalidateChangedInputs(rootId, [
        change.site,
      ]);
      const runId = this.#activeRunByRoot.get(rootId);
      if (
        runId !== undefined &&
        (invalidated > 0 || this.#restartInputsByRun.has(runId))
      ) {
        let restartInputs = this.#restartInputsByRun.get(runId);
        if (!restartInputs) {
          this.#restartInputsByRun.set(runId, restartInputs = new Set());
        }
        restartInputs.add(change.site);
      }
    });
  }

  async run(plan: AsyncVDOMTransitionPlan): Promise<AsyncVDOMTransitionResult> {
    const maxInputRestarts = plan.maxInputRestarts ?? 0;
    if (!Number.isSafeInteger(maxInputRestarts) || maxInputRestarts < 0) {
      throw new RangeError("maxInputRestarts must be a non-negative integer");
    }
    if (maxInputRestarts > 0 && !plan.refreshInputs) {
      throw new Error("Input restarts require a refreshInputs callback");
    }

    const runId = ++this.#nextRunId;
    let initialValues = plan.initialValues ?? {};
    let restartCount = 0;
    let reuseCompleted: AsyncTaskReuse | undefined;
    let storeTransitionsCommitted = false;
    try {
      for (const link of plan.storeTransitions ?? []) {
        if (!link.store.hasTransition(link.transitionId)) {
          throw new Error(`Unknown store transition: ${link.transitionId}`);
        }
        const transitionRoots = new Set(
          link.store.transitionRoots(link.transitionId),
        );
        if (
          transitionRoots.size !== plan.rootIds.length ||
          plan.rootIds.some((rootId) => !transitionRoots.has(rootId))
        ) {
          throw new Error(
            `Store transition ${link.transitionId} roots must match the VDOM candidate roots`,
          );
        }
      }
      for (const rootId of plan.rootIds) {
        this.#activeRunByRoot.set(rootId, runId);
        this.#storeTransitionsByRoot.set(
          rootId,
          (plan.storeTransitions ?? []).filter((link) =>
            link.store.transitionRoots(link.transitionId).includes(rootId)
          ),
        );
      }
      const readStores = [...new Set([
        ...(plan.storeReads ?? []),
        ...(plan.storeTransitions ?? []).map((link) => link.store),
      ])];
      while (true) {
        const roots = plan.rootIds.map((rootId) => {
          const root = this.roots.get(rootId);
          if (!root) throw new Error(`Unknown VDOM transition root: ${rootId}`);
          return {
            rootId,
            baseVersion: root.version,
            targetVersion: root.version + 1,
            committedSnapshot: root.prepareCommit(null),
          };
        });
        const result = await this.transitions.run({
          roots,
          tasks: plan.tasks,
          initialValues,
          maxConcurrency: plan.maxConcurrency,
          signal: plan.signal,
          reuseCompleted,
          buildSnapshots: (values) =>
            new Map(roots.map(({ rootId }) => {
              const root = this.roots.get(rootId)!;
              const rootLinks = (
                this.#storeTransitionsByRoot.get(rootId) ?? []
              );
              const storeTransitionIds = rootLinks.map((link) => link.transitionId);
              const transitionIdsByStore = new Map(
                rootLinks.map((link) => [link.store, link.transitionId] as const),
              );
              const storeSnapshots = new Map(readStores.map((store) => [
                store,
                store.beginRender(rootId, {
                  transitions: transitionIdsByStore.has(store)
                    ? [transitionIdsByStore.get(store)!]
                    : [],
                }),
              ]));
              this.#storeSnapshotsByRoot.set(rootId, storeSnapshots);
              const tree = plan.buildTree(rootId, values, {
                storeTransitionIds,
                storeSnapshots,
              });
              return [rootId, root.prepareCommit(tree)] as const;
            })),
        });
        if (result.resolution.status === "committed") {
          storeTransitionsCommitted = true;
        }

        const stillCurrent = plan.rootIds.every((rootId) =>
          this.#activeRunByRoot.get(rootId) === runId
        );
        if (!stillCurrent) {
          this.#restartInputsByRun.delete(runId);
          return { ...result, restartCount };
        }

        const changed = [...(this.#restartInputsByRun.get(runId) ?? [])];
        this.#restartInputsByRun.delete(runId);
        if (
          changed.length === 0 || restartCount >= maxInputRestarts ||
          !plan.refreshInputs || plan.signal?.aborted
        ) {
          return { ...result, restartCount };
        }

        const refreshed = plan.refreshInputs(changed);
        for (const inputId of changed) {
          if (!Object.hasOwn(refreshed, inputId)) {
            throw new Error(
              `refreshInputs did not provide the changed input ${inputId}`,
            );
          }
        }
        initialValues = { ...initialValues, ...refreshed };
        reuseCompleted = plan.reuseCompletedTasks
          ? {
            values: result.taskValues,
            completed: result.completedTasks,
            changedInputs: changed,
          }
          : undefined;
        restartCount++;
      }
    } finally {
      if (!storeTransitionsCommitted) {
        for (const link of plan.storeTransitions ?? []) {
          link.store.finishTransition(link.transitionId);
          for (const rootId of plan.rootIds) {
            if (
              link.store.hasTransition(link.transitionId) &&
              link.store.transitionRoots(link.transitionId).includes(rootId)
            ) {
              link.store.releaseTransition(link.transitionId, rootId);
            }
          }
        }
      }
      this.#restartInputsByRun.delete(runId);
      for (const rootId of plan.rootIds) {
        if (this.#activeRunByRoot.get(rootId) === runId) {
          this.#activeRunByRoot.delete(rootId);
          this.#storeTransitionsByRoot.delete(rootId);
          this.#storeSnapshotsByRoot.delete(rootId);
        }
      }
    }
  }

  /**
   * Commit an urgent root update now. StateChange records contribute their
   * compiler-addressable site IDs to pending-task invalidation automatically.
   */
  commitUrgent(
    rootId: string,
    tree: RuntimeNode,
    changedDependencies?: readonly (string | StateChange)[],
    storeSnapshots: readonly StoreRenderSnapshot<any, any>[] = [],
  ) {
    const root = this.roots.get(rootId);
    if (!root) throw new Error("Unknown VDOM transition root: " + rootId);
    if (storeSnapshots.some((snapshot) => !snapshot.validate())) {
      throw new Error(
        `Store snapshot for root ${rootId} changed during urgent render`,
      );
    }
    root.commit(tree);
    for (const snapshot of storeSnapshots) {
      snapshot.commitAfterValidatedRender();
    }
    this.coordinator.recordUrgentCommit(rootId, root.version);
    const changedIds =
      changedDependencies?.map((dependency) =>
        typeof dependency === "string" ? dependency : dependency.site
      ) ?? [...(this.#pendingChangedSites.get(rootId) ?? [])];
    this.transitions.invalidateChangedInputs(rootId, changedIds);
    this.#pendingChangedSites.get(rootId)?.clear();
  }
}
