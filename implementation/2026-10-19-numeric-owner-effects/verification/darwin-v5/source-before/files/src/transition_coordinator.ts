export type TransitionRoot<T = unknown> = {
  rootId: string;
  baseVersion: number;
  targetVersion: number;
  snapshot: T;
  pendingResources: readonly string[];
};

export type TransitionResolution =
  | { status: "pending"; remainingResources: number }
  | { status: "committed"; generation: number; roots: readonly string[] }
  | { status: "stale" }
  | { status: "cancelled" };

type ActiveTransition<T> = {
  generation: number;
  roots: TransitionRoot<T>[];
  pending: Set<string>;
};

/**
 * Coordinates candidate snapshots across a group of retained UI roots.
 * Candidate data is kept private until every declared resource is ready.
 * The commit callback is synchronous so state, host patches, and lifecycle
 * work can be applied in one task before the browser can paint. A host adapter
 * should prevalidate/stage its writes so the synchronous commit is no-throw.
 */
export class TransitionCoordinator<T = unknown> {
  #versions: Map<string, number>;
  #generation = 0;
  #active = new Map<number, ActiveTransition<T>>();
  #rootGenerations = new Map<string, number>();

  constructor(
    initialRootVersions: ReadonlyMap<string, number>,
    private readonly commitBatch: (
      roots: readonly TransitionRoot<T>[],
      generation: number,
    ) => void,
  ) {
    this.#versions = new Map(initialRootVersions);
  }

  get generation() {
    return this.#generation;
  }

  get pendingResourceCount() {
    let pending = 0;
    for (const active of this.#active.values()) pending += active.pending.size;
    return pending;
  }

  getVersion(rootId: string) {
    const version = this.#versions.get(rootId);
    if (version === undefined) {
      throw new Error(`Unknown transition root: ${rootId}`);
    }
    return version;
  }

  /** Record a committed urgent write while preserving pending candidates. */
  recordUrgentCommit(rootId: string, version: number) {
    const current = this.getVersion(rootId);
    if (!Number.isSafeInteger(version) || version <= current) {
      throw new Error(
        "Urgent commit version for " + rootId + " must advance " + current,
      );
    }
    this.#versions.set(rootId, version);
  }

  begin(roots: readonly TransitionRoot<T>[]): TransitionResolution {
    if (roots.length === 0) {
      throw new Error("A transition requires at least one root");
    }
    const rootIds = new Set<string>();
    const pending = new Set<string>();
    for (const root of roots) {
      if (rootIds.has(root.rootId)) {
        throw new Error(`Duplicate root in transition: ${root.rootId}`);
      }
      rootIds.add(root.rootId);
      const currentVersion = this.#versions.get(root.rootId);
      if (currentVersion === undefined) {
        throw new Error(`Unknown transition root: ${root.rootId}`);
      }
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
      for (const resource of root.pendingResources) pending.add(resource);
    }

    // Supersede whole conflicting groups, while disjoint root groups continue
    // independently. An overlapping root cannot publish two candidate trees.
    const conflicting = [...this.#active.values()]
      .filter((active) =>
        active.roots.some((root) => rootIds.has(root.rootId))
      );
    for (const active of conflicting) this.#discardActive(active.generation);

    this.#generation++;
    const active = { generation: this.#generation, roots: [...roots], pending };
    this.#active.set(active.generation, active);
    for (const root of roots) {
      this.#rootGenerations.set(root.rootId, active.generation);
    }
    return pending.size === 0
      ? this.#commitActive(active.generation)
      : { status: "pending", remainingResources: pending.size };
  }

  resolve(generation: number, resourceId: string): TransitionResolution {
    const active = this.#active.get(generation);
    if (!active) return { status: "stale" };
    if (!active.pending.delete(resourceId)) return { status: "stale" };
    return active.pending.size === 0
      ? this.#commitActive(generation)
      : { status: "pending", remainingResources: active.pending.size };
  }

  /**
   * Replace candidate snapshots after asynchronous preparation, while the
   * candidate is still pending. Root identity and version targets stay fixed;
   * only the private snapshots change. The caller can then resolve its task
   * tokens, with the final token triggering the normal atomic commit.
   */
  stageSnapshots(
    generation: number,
    snapshots: ReadonlyMap<string, T>,
  ): TransitionResolution {
    const active = this.#active.get(generation);
    if (!active) return { status: "stale" };
    if (active.pending.size === 0) {
      throw new Error("Cannot stage snapshots after transition readiness");
    }
    if (snapshots.size !== active.roots.length) {
      throw new Error("Staged snapshots must cover every transition root");
    }
    for (const root of active.roots) {
      if (!snapshots.has(root.rootId)) {
        throw new Error(`Missing staged snapshot for ${root.rootId}`);
      }
    }
    active.roots = active.roots.map((root) => ({
      ...root,
      snapshot: snapshots.get(root.rootId)!,
    }));
    return { status: "pending", remainingResources: active.pending.size };
  }

  /**
   * Rebase a pending candidate over newer committed root versions. Callers
   * provide freshly built snapshots so urgent state is included in the next
   * candidate while the original async resource set remains pending.
   */
  rebase(
    generation: number,
    roots: readonly TransitionRoot<T>[],
  ): TransitionResolution {
    const active = this.#active.get(generation);
    if (!active) return { status: "stale" };
    if (active.pending.size === 0) {
      throw new Error("Cannot rebase after transition readiness");
    }
    if (roots.length !== active.roots.length) {
      throw new Error("Rebased roots must preserve the transition root set");
    }
    const byId = new Map<string, TransitionRoot<T>>();
    for (const root of roots) {
      if (byId.has(root.rootId)) {
        throw new Error("Duplicate root in rebase: " + root.rootId);
      }
      const currentVersion = this.getVersion(root.rootId);
      if (root.baseVersion !== currentVersion) {
        throw new Error(
          "Stale rebase base version for " + root.rootId + ": expected " +
            currentVersion + ", received " + root.baseVersion,
        );
      }
      if (
        !Number.isSafeInteger(root.targetVersion) ||
        root.targetVersion <= root.baseVersion
      ) {
        throw new Error(
          "Rebased target version for " + root.rootId +
            " must advance its base version",
        );
      }
      byId.set(root.rootId, root);
    }
    if (active.roots.some((root) => !byId.has(root.rootId))) {
      throw new Error("Rebased roots must preserve the transition root set");
    }
    active.roots = active.roots.map((root) => {
      const rebased = byId.get(root.rootId)!;
      return { ...rebased, pendingResources: root.pendingResources };
    });
    return { status: "pending", remainingResources: active.pending.size };
  }

  retryReadyCommit(generation: number): TransitionResolution {
    const active = this.#active.get(generation);
    if (!active) return { status: "stale" };
    if (active.pending.size !== 0) {
      return { status: "pending", remainingResources: active.pending.size };
    }
    return this.#commitActive(generation);
  }

  cancel(generation: number): TransitionResolution {
    const active = this.#active.get(generation);
    if (!active) return { status: "stale" };
    this.#discardActive(generation);
    return { status: "cancelled" };
  }

  #commitActive(generation: number): TransitionResolution {
    const active = this.#active.get(generation);
    if (!active) return { status: "stale" };

    // Call before publishing versions; a thrown host/state commit leaves the
    // scheduler versions authoritative and allows retryReadyCommit().
    this.commitBatch(active.roots, active.generation);
    for (const root of active.roots) {
      this.#versions.set(root.rootId, root.targetVersion);
    }
    this.#discardActive(generation);
    return {
      status: "committed",
      generation: active.generation,
      roots: active.roots.map((root) => root.rootId),
    };
  }

  #discardActive(generation: number) {
    const active = this.#active.get(generation);
    if (!active) return;
    this.#active.delete(generation);
    for (const root of active.roots) {
      if (this.#rootGenerations.get(root.rootId) === generation) {
        this.#rootGenerations.delete(root.rootId);
      }
    }
  }
}
