import {
  type AnyAsyncStore,
  batchStorePublication,
} from "./async_store_runtime.ts";
import {
  claimPreparedNativeGroup,
  ComponentStateRoot,
  isNativeRootHostPublicationBusy,
  publishPreparedNativeGroup,
  subscribeNativeRootHostPublication,
  type NativeRootCandidate,
} from "./component_state_runtime.ts";
import { type AsyncResource } from "./async_resource_runtime.ts";
import { type RuntimeNode } from "./jsx_binding_runtime.ts";
import {
  type RootWorkHandle,
  RootWorkPending,
  RootWorkQueue,
  type RootWorkSettled,
} from "./root_work_queue.ts";
import { type StateCellHandle } from "./owner_state_world.ts";
import type { KeyedCollection } from "./keyed_collection.ts";

type NativeRoot = ComponentStateRoot<any, any>;
type Candidate = NativeRootCandidate<any, any>;

type PendingSetup = {
  readonly resources: ReadonlyMap<string, AsyncResource<any> | undefined>;
  readonly stores: ReadonlyMap<AnyAsyncStore, ReadonlySet<string>>;
  readonly hostSubscribe?: (callback: () => void) => () => void;
  readonly hostAvailable?: () => boolean;
};

type PendingWave = { cleanup(): void };

export type NativeStoreDependencyLease = {
  readonly dependencies: readonly {
    readonly root: NativeRoot;
    readonly stores: ReadonlySet<AnyAsyncStore>;
  }[];
  release(): void;
};

export type NativeRootWorkHandle = RootWorkHandle & {
  /** Keep discovered store membership alive while replacing this work. */
  retainStoreDependencies(): NativeStoreDependencyLease;
};

export type NativeRootWork = {
  readonly id: string;
  readonly roots: readonly {
    readonly root: NativeRoot;
    readonly tree: RuntimeNode;
  }[];
  /** Optional caller-owned gates; resource waits are discovered from roots. */
  readonly pending?: readonly string[];
  readonly key?: string;
  /** Explicit store transition inclusion; owning the work does not own domain actions. */
  readonly transitions?: readonly string[];
  /** Finish the included store scopes after publication; defaults to false. */
  readonly finishTransitions?: boolean;
  /** Validate task-only live inputs at each candidate publication boundary. */
  readonly validateWork?: () => boolean;
  /** Decide whether stale native or external inputs should be rebuilt. */
  readonly onStaleWork?: () => "retry" | "reject";
  /** Declares generic tree preparation safe to discard and repeat. */
  readonly renderPreparation?: "repeatable";
  /** Task-only store scopes included in this work's publication. */
  readonly publicationDependencies?: readonly {
    readonly root: NativeRoot;
    readonly stores: ReadonlySet<AnyAsyncStore>;
  }[];
  readonly onSettled?: (resolution: RootWorkSettled) => void;
};

export type NativeRetainedRootWork = {
  readonly id: string;
  readonly roots: readonly {
    readonly root: NativeRoot;
    readonly cells: readonly StateCellHandle[];
  }[];
  readonly pending?: readonly string[];
  readonly key?: string;
  readonly validateWork?: () => boolean;
  readonly onStaleWork?: () => "retry" | "reject";
  readonly onSettled?: (resolution: RootWorkSettled) => void;
};

/** An explicit transaction over supported pending edits in selected collections. */
export type NativeCollectionRootWork = Omit<NativeRetainedRootWork, "roots"> & {
  readonly roots: readonly {
    readonly root: NativeRoot;
    readonly collections: readonly KeyedCollection<any>[];
  }[];
};

/** A declared joint cut over retained cells, collection edits, and Stores. */
export type NativeTransactionRootWork = Omit<NativeRetainedRootWork, "roots"> & {
  readonly roots: readonly {
    readonly root: NativeRoot;
    readonly cells: readonly StateCellHandle[];
    readonly collections: readonly KeyedCollection<any>[];
    readonly stores?: readonly AnyAsyncStore[];
    readonly resources?: readonly AsyncResource<any>[];
  }[];
};

/** A declared joint reveal of the closed readers of selected resources. */
export type NativeResourceRootWork = Omit<NativeRetainedRootWork, "roots"> & {
  readonly roots: readonly {
    readonly root: NativeRoot;
    readonly resources: readonly AsyncResource<any>[];
  }[];
};

/** A declared publication cut covering every closed reader of selected Stores. */
export type NativeStoreRootWork = Omit<NativeRetainedRootWork, "roots"> & {
  readonly roots: readonly {
    readonly root: NativeRoot;
    readonly stores: readonly AnyAsyncStore[];
  }[];
};

/**
 * Native owner roots wired to the overlapping publication queue. A queued
 * group prepares every root and waits for every observed resource before any
 * candidate publishes; fallback UI can be mounted separately by the caller.
 * Canceling work never removes dispatched actions or cancels their providers.
 */
export class NativeRootWorkQueue {
  #queue: RootWorkQueue<Candidate>;
  #roots = new Map<string, { root: NativeRoot; unsubscribe: () => void }>();
  #detached = new Set<string>();
  #pendingSetups = new Map<string, PendingSetup>();
  #pendingWaves = new Map<string, PendingWave>();
  #pendingLeases = new Map<string, Set<() => void>>();
  #workStores = new Map<string, Map<AnyAsyncStore, Set<string>>>();
  #nextResourceToken = 0;
  #nextBlockedToken = 0;
  #nextHostToken = 0;
  #callDepth = 0;
  #disposed = false;

  constructor(
    options: { maxStaleRetries?: number; onError?: (error: unknown) => void } =
      {},
  ) {
    this.#queue = new RootWorkQueue(
      new Map(),
      options.maxStaleRetries ?? 2,
      options.onError,
    );
  }

  enqueue(work: NativeRootWork): NativeRootWorkHandle {
    this.#assertActive();
    if (work.renderPreparation !== undefined &&
      work.renderPreparation !== "repeatable") {
      throw new Error("Native work renderPreparation must be repeatable");
    }
    for (const { root } of work.roots) {
      if (work.renderPreparation !== "repeatable" &&
        root.renderPreparation !== "repeatable") {
        throw new Error(
          `Generic native work requires repeatable render preparation: ${root.rootId}`,
        );
      }
    }
    return this.#enqueuePrepared(
      work,
      work.roots.map(({ root, tree }) => ({ root, tree })),
      ({ root, tree }, transitions) => root.prepare(tree, {
        transitions,
        autoRetryResources: false,
        renderPreparation: work.renderPreparation,
      }),
    );
  }

  enqueueRetained(work: NativeRetainedRootWork): NativeRootWorkHandle {
    return this.#enqueuePrepared(
      work,
      work.roots.map(({ root, cells }) => ({
        root,
        cells: Object.freeze([...cells]),
      })),
      ({ root, cells }, _transitions, lease) => root.prepareRetained(cells, lease),
      ({ root, cells }) => root.holdTransactionPublications({
        resources: [], cells, collections: [], stores: [],
      }),
    );
  }

  enqueueStores(work: NativeStoreRootWork): NativeRootWorkHandle {
    return this.#enqueuePrepared(
      work,
      work.roots.map(({ root, stores }) => ({ root, stores: Object.freeze([...stores]) })),
      ({ root, stores }, _transitions, lease) => root.prepareStores(stores, lease),
      ({ root, stores }) => root.holdTransactionPublications({
        resources: [], cells: [], collections: [], stores,
      }),
    );
  }

  enqueueCollections(work: NativeCollectionRootWork): NativeRootWorkHandle {
    return this.#enqueuePrepared(
      work,
      work.roots.map(({ root, collections }) => ({
        root,
        collections: Object.freeze([...collections]),
      })),
      ({ root, collections }, _transitions, lease) =>
        root.prepareCollections(collections, lease),
      ({ root, collections }) => root.holdTransactionPublications({
        resources: [], cells: [], collections, stores: [],
      }),
    );
  }

  enqueueResources(work: NativeResourceRootWork): NativeRootWorkHandle {
    return this.#enqueuePrepared(
      work,
      work.roots.map(({ root, resources }) => ({
        root,
        resources: Object.freeze([...resources]),
      })),
      ({ root, resources }, _transitions, resourceLease) =>
        root.prepareResources(resources, resourceLease),
      ({ root, resources }) => root.holdTransactionPublications({
        resources, cells: [], collections: [], stores: [],
      }),
    );
  }

  enqueueTransaction(work: NativeTransactionRootWork): NativeRootWorkHandle {
    return this.#enqueuePrepared(
      work,
      work.roots.map(({ root, cells, collections, stores, resources }) => ({
        root,
        cells: Object.freeze([...cells]),
        collections: Object.freeze([...collections]),
        stores: Object.freeze([...(stores ?? [])]),
        resources: Object.freeze([...(resources ?? [])]),
      })),
      ({ root, cells, collections, stores, resources }, _transitions, resourceLease) =>
        root.prepareTransaction({ cells, collections, stores, resources }, resourceLease),
      ({ root, cells, collections, stores, resources }) =>
        root.holdTransactionPublications({ resources, cells, collections, stores }),
    );
  }

  #enqueuePrepared<Entry extends { readonly root: NativeRoot }>(
    work: NativeRootWork | NativeRetainedRootWork | NativeCollectionRootWork | NativeTransactionRootWork | NativeStoreRootWork | NativeResourceRootWork,
    entries: readonly Entry[],
    prepareCandidate: (
      entry: Entry,
      transitions: readonly string[],
      resourceLease?: () => void,
    ) => Candidate | null,
    holdResources?: (entry: Entry) => () => void,
  ): NativeRootWorkHandle {
    this.#assertActive();
    const transitions = Object.freeze([
      ...new Set("transitions" in work ? work.transitions ?? [] : []),
    ]);
    const finishTransitions = "finishTransitions" in work &&
      work.finishTransitions === true;
    const rootById = new Map(entries.map(({ root }) => [root.rootId, root]));
    const publicationDependencies = Object.freeze(
      (
        "publicationDependencies" in work
          ? work.publicationDependencies ?? []
          : []
      ).map(({ root, stores }) => {
        if (rootById.get(root.rootId) !== root) {
          throw new Error(
            `Publication dependency root is not included in work: ${root.rootId}`,
          );
        }
        return Object.freeze({ rootId: root.rootId, stores: new Set(stores) });
      }),
    );
    if (transitions.some((id) => typeof id !== "string" || !id)) {
      throw new Error("Store transition IDs must be nonempty strings");
    }
    if (!entries.length) throw new Error("Native work requires roots");
    if (
      new Set(entries.map(({ root }) => root.rootId)).size !== entries.length
    ) {
      throw new Error("Native work cannot contain duplicate root IDs");
    }
    if (entries.some(({ root }) => root.retired)) {
      throw new Error("Cannot enqueue work for a retired native root");
    }
    for (const { root } of entries) this.#attach(root);
    const resourceHolds: (() => void)[] = [];
    const resourceLeaseByRoot = new Map<NativeRoot, () => void>();
    const releaseResourceHolds = () => {
      const errors: unknown[] = [];
      for (const release of resourceHolds.splice(0)) {
        try { release(); } catch (error) { errors.push(error); }
      }
      if (errors.length) {
        throw new AggregateError(errors, "Resource publication hold release failed");
      }
    };
    try {
      if (holdResources) {
        for (const entry of entries) {
          const release = holdResources(entry);
          resourceHolds.push(release);
          resourceLeaseByRoot.set(entry.root, release);
        }
      }
    } catch (error) {
      try { releaseResourceHolds(); } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], "Resource hold acquisition and cleanup failed");
      }
      throw error;
    }
    try { return this.#invoke(() => {
      let groupClaim: Extract<ReturnType<typeof claimPreparedNativeGroup>, { status: "claimed" }> | undefined;
      let groupWasPartial = false;
      const handle = this.#queue.enqueue({
        id: work.id,
        roots: entries.map(({ root }) => root.rootId),
        key: work.key,
        pending: work.pending,
        prepare: () => {
          // A retry always replaces the full observed frontier. This is also a
          // safety net for retries initiated by the generic queue itself. Keep
          // prior store leases until replacement candidates have retained the
          // new frontier, or their candidate holds have taken over.
          this.#cleanupWave(work.id);
          const previousLeases = this.#pendingLeases.get(work.id);
          const suspendForBusyHosts = (busyRoots: readonly NativeRoot[]): never => {
            this.#pendingSetups.set(work.id, {
              resources: new Map(),
              stores: new Map(),
              hostSubscribe: (callback) => {
                const unsubscribes = busyRoots.map((root) =>
                  subscribeNativeRootHostPublication(root, callback)
                );
                return () => { for (const unsubscribe of unsubscribes) unsubscribe(); };
              },
              hostAvailable: () => busyRoots.every((root) =>
                !isNativeRootHostPublicationBusy(root)
              ),
            });
            throw new RootWorkPending([
              `native-host:${++this.#nextHostToken}`,
            ]);
          };
          const busyRoots = entries.filter(({ root }) =>
            isNativeRootHostPublicationBusy(root)
          ).map(({ root }) => root);
          if (busyRoots.length) suspendForBusyHosts(busyRoots);
          for (const dependency of publicationDependencies) {
            this.#rememberRootWorkStores(
              work.id,
              dependency.rootId,
              dependency.stores,
            );
          }
          const prepared: Candidate[] = [];
          try {
            for (const entry of entries) {
              if (isNativeRootHostPublicationBusy(entry.root)) {
                suspendForBusyHosts([entry.root]);
              }
              const candidate = prepareCandidate(
                entry, transitions, resourceLeaseByRoot.get(entry.root)
              );
              if (!candidate) {
                throw new Error(
                  `Scoped root delta is unavailable: ${entry.root.rootId}`,
                );
              }
              prepared.push(candidate);
              this.#rememberWorkStores(work.id, candidate);
            }
            const resources = new Set<AsyncResource<any>>();
            let blocked = false;
            const stores = new Map<AnyAsyncStore, Set<string>>();
            for (const candidate of prepared) {
              for (const resource of candidate.pendingResources) {
                resources.add(resource);
              }
              blocked ||= candidate.blocked;
              for (const store of candidate.stores) {
                let roots = stores.get(store);
                if (!roots) stores.set(store, roots = new Set());
                roots.add(candidate.rootId);
              }
            }
            if (resources.size > 0 || blocked) {
              // Keep the root's source readers alive while the candidate is
              // discarded. The queue owns only these observer leases, never
              // the resource providers or store transition scopes.
              const releaseLeases: (() => void)[] = [];
              try {
                for (const candidate of prepared) {
                  releaseLeases.push(candidate.retainStoreDependencies());
                }
              } catch (error) {
                for (const release of releaseLeases) release();
                throw error;
              }
              const nextLeases = new Set(releaseLeases);
              this.#pendingLeases.set(work.id, nextLeases);
              const resourceTokens = new Map<
                string,
                AsyncResource<any> | undefined
              >();
              for (const resource of resources) {
                resourceTokens.set(
                  `native-resource:${++this.#nextResourceToken}`,
                  resource,
                );
              }
              if (blocked) {
                resourceTokens.set(
                  `native-store-frontier:${++this.#nextBlockedToken}`,
                  // A blocked candidate may have no currently pending
                  // resource. Its synthetic token is refreshed by a source
                  // notification, never resolved by a provider.
                  undefined,
                );
              }
              for (const candidate of prepared) candidate.discard();
              prepared.length = 0;
              this.#pendingSetups.set(work.id, {
                resources: resourceTokens,
                stores,
              });
              this.#releaseLeases(previousLeases);
              throw new RootWorkPending([...resourceTokens.keys()]);
            }
            return prepared.map((value) => ({
              rootId: value.rootId,
              baseVersion: value.baseVersion,
              targetVersion: value.targetVersion,
              value,
              validate: () => value.validate(),
            }));
          } catch (error) {
            const cleanupErrors: unknown[] = [];
            for (const candidate of prepared) {
              try { candidate.discard(); } catch (cleanupError) {
                cleanupErrors.push(cleanupError);
              }
            }
            if (cleanupErrors.length) {
              throw new AggregateError(
                [error, ...cleanupErrors],
                "Native preparation and candidate cleanup failed",
              );
            }
            throw error;
          }
        },
        discard: ({ value }) => value.discard(),
        admit: (candidates) => {
          const claim = claimPreparedNativeGroup(candidates.map(({ value }) => value));
          if (claim.status === "busy") {
            this.#pendingSetups.set(work.id, {
              resources: new Map(),
              stores: new Map(),
              hostSubscribe: claim.subscribe,
              hostAvailable: () => entries.every(({ root }) =>
                !isNativeRootHostPublicationBusy(root)
              ),
            });
            throw new RootWorkPending([
              `native-host:${++this.#nextHostToken}`,
            ]);
          }
          groupClaim = claim;
          groupWasPartial = false;
          return () => {
            if (groupClaim === claim) groupClaim = undefined;
            claim.release();
          };
        },
        commit: (candidates) => {
          try {
            // Queue validation admitted the full prepared group before this
            // callback. A host writer may still reenter and change live inputs.
            for (const { value } of candidates) value.commitHost();
            if (work.validateWork && !work.validateWork()) {
              throw new Error(
                "External work inputs became stale after grouped host commit",
              );
            }
            for (const { value } of candidates) {
              if (!value.validatePostHost()) {
                throw new Error(
                  `Native candidate became stale after host application: ${value.rootId}`,
                );
              }
            }
            for (const { value } of candidates) value.preparePublication();
            for (const { value } of candidates) {
              if (!value.validatePostHost()) {
                throw new Error(
                  `Native candidate became stale before grouped publication: ${value.rootId}`,
                );
              }
            }
            publishPreparedNativeGroup(candidates.map(({ value }) => value));
          } catch (error) {
            const errors: unknown[] = [error];
            try { groupWasPartial = groupClaim?.quarantine(error) ?? false; } catch (quarantineError) {
              groupWasPartial = true;
              errors.push(quarantineError);
            }
            for (const { value } of candidates) {
              try { value.failGroup(error); } catch (cleanupError) {
                errors.push(cleanupError);
              }
            }
            if (errors.length > 1) {
              throw new AggregateError(errors, "Grouped publication and cleanup failed");
            }
            throw error;
          }
        },
        commitFailurePoison: () => groupWasPartial,
        afterCommit: (candidates) => {
          const errors: unknown[] = [];
          // Root pointers and queue versions are already visible before any
          // store subscriber or lifecycle callback can run.
          const byStore = new Map<AnyAsyncStore, Map<string, string[]>>();
          for (const { value } of candidates) {
            try {
              errors.push(...value.installSubscriptions());
            } catch (error) {
              errors.push(error);
            }
          }
          for (const { value } of candidates) {
            try {
              this.#rememberWorkStores(work.id, value);
            } catch (error) {
              errors.push(error);
            }
          }
          for (const [store, rootIds] of this.#workStores.get(work.id) ?? []) {
            let byTransition = byStore.get(store);
            if (!byTransition) byStore.set(store, byTransition = new Map());
            for (const id of transitions) {
              if (!store.hasTransition(id)) continue;
              const participatingRoots = new Set(store.transitionRoots(id));
              const roots = [...rootIds].filter((rootId) =>
                participatingRoots.has(rootId)
              );
              // A store can drop this root during publication when the final
              // candidate no longer reads it. Its transition scope still
              // belongs to this work; close even a now-empty root set when
              // requested so an unread, zero-root scope cannot stay open.
              if (roots.length > 0 || finishTransitions) {
                byTransition.set(id, roots);
              }
            }
          }
          try {
            // Store listeners may prepare work in another queue; drain them only
            // after every candidate releases its publication barrier.
            batchStorePublication(() => {
              try {
                for (const [store, byTransition] of byStore) {
                  for (const [id, roots] of byTransition) {
                    store.commitTransitionRoots(id, roots, {
                      finish: finishTransitions,
                    });
                  }
                }
              } catch (error) {
                errors.push(error);
              }
              for (const { value } of candidates) {
                try {
                  value.runEffects();
                } catch (error) {
                  errors.push(error);
                }
              }
            });
          } catch (error) {
            errors.push(error);
          }
          if (errors.length) {
            throw new AggregateError(
              errors,
              "Native post-publication callbacks failed",
            );
          }
        },
        onStale: () => {
          this.#syncVersions();
          return this.#invoke(() => work.onStaleWork?.() ?? "retry");
        },
        validateWork: work.validateWork,
        onPending: ({ tokens, resolve, refresh }) => {
          this.#watchPending(work.id, tokens, resolve, refresh);
        },
        onSettled: (resolution) => {
          const errors: unknown[] = [];
          try { this.#cleanupPending(work.id); } catch (error) { errors.push(error); }
          this.#workStores.delete(work.id);
          try { releaseResourceHolds(); } catch (error) { errors.push(error); }
          try { work.onSettled?.(resolution); } catch (error) { errors.push(error); }
          if (errors.length) throw new AggregateError(errors, "Native work settlement cleanup failed");
        },
      });
      return {
        id: handle.id,
        get status() {
          return handle.status;
        },
        get resolution() {
          return handle.resolution;
        },
        resolve: (resourceId) => this.#invoke(() => handle.resolve(resourceId)),
        refresh: () =>
          this.#invoke(() => {
            // Refresh immediately prepares a replacement frontier. Do not
            // release its store holds in the gap before that preparation.
            this.#cleanupWave(work.id);
            return handle.refresh();
          }),
        cancel: (reason) => this.#invoke(() => handle.cancel(reason)),
        retainStoreDependencies: () => {
          if (handle.status !== "pending") {
            throw new Error("Only pending work can retain store dependencies");
          }
          const byRoot = new Map<NativeRoot, Set<AnyAsyncStore>>();
          for (const [store, rootIds] of this.#workStores.get(work.id) ?? []) {
            for (const rootId of rootIds) {
              const root = rootById.get(rootId);
              if (!root) continue;
              let stores = byRoot.get(root);
              if (!stores) byRoot.set(root, stores = new Set());
              stores.add(store);
            }
          }
          const releases: (() => void)[] = [];
          try {
            for (const [root, stores] of byRoot) {
              releases.push(root.holdStoreDependencies(stores));
            }
          } catch (error) {
            for (const release of releases.splice(0)) release();
            throw error;
          }
          return {
            dependencies: Object.freeze(
              [...byRoot].map(([root, stores]) =>
                Object.freeze({ root, stores: new Set(stores) })
              ),
            ),
            release: () => {
              for (const release of releases.splice(0)) release();
            },
          };
        },
      };
    }); } catch (error) {
      try { releaseResourceHolds(); } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], "Native work enqueue and cleanup failed");
      }
      throw error;
    }
  }

  getVersion(root: NativeRoot): number {
    return this.#queue.getVersion(root.rootId);
  }

  /** @internal Read the existing synchronous publication state for exact work. */
  isApplying(id: string): boolean {
    return this.#queue.isCommitting(id);
  }

  /** Detach coordinator registrations; roots and action scopes remain caller-owned. */
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const rootId of this.#roots.keys()) this.#detached.add(rootId);
    if (this.#callDepth === 0) this.#flushDetached();
  }

  #attach(root: NativeRoot): void {
    if (root.retired) {
      throw new Error("Cannot attach a retired native root");
    }
    const prior = this.#roots.get(root.rootId);
    if (prior) {
      if (prior.root !== root) {
        throw new Error(`Native root ID collision: ${root.rootId}`);
      }
      return;
    }
    this.#queue.attachRoot(root.rootId, root.publicationVersion);
    const unsubscribe = root.onRetire(() => {
      this.#detached.add(root.rootId);
      if (this.#callDepth === 0) this.#flushDetached();
    });
    this.#roots.set(root.rootId, { root, unsubscribe });
  }

  #syncVersions(): void {
    for (const [rootId, { root }] of this.#roots) {
      if (this.#detached.has(rootId)) continue;
      const current = this.#queue.getVersion(rootId);
      if (root.publicationVersion > current) {
        this.#queue.recordRootCommit(rootId, root.publicationVersion);
      }
    }
  }

  #invoke<T>(callback: () => T): T {
    this.#callDepth++;
    try {
      this.#syncVersions();
      return callback();
    } finally {
      this.#callDepth--;
      if (this.#callDepth === 0) this.#flushDetached();
    }
  }

  #flushDetached(): void {
    for (const rootId of this.#detached) {
      const registered = this.#roots.get(rootId);
      if (!registered) continue;
      this.#queue.detachRoot(rootId);
      registered.unsubscribe();
      this.#roots.delete(rootId);
    }
    this.#detached.clear();
  }

  #watchPending(
    workId: string,
    tokens: readonly string[],
    _resolve: (token: string) => unknown,
    refresh: () => unknown,
  ): void {
    this.#cleanupWave(workId);
    const setup = this.#pendingSetups.get(workId);
    if (!setup) return;
    this.#pendingSetups.delete(workId);
    let active = true;
    let wave!: PendingWave;
    const unsubscribes: (() => void)[] = [];
    const cleanup = () => {
      if (!active) return;
      active = false;
      if (this.#pendingWaves.get(workId) === wave) {
        this.#pendingWaves.delete(workId);
      }
      for (const unsubscribe of unsubscribes.splice(0)) unsubscribe();
    };
    wave = { cleanup };
    this.#pendingWaves.set(workId, wave);

    const refreshFrontier = () => {
      if (!active) return;
      this.#invoke(() => {
        if (!active) return;
        cleanup();
        refresh();
      });
    };
    for (const [store, roots] of setup.stores) {
      for (const rootId of roots) {
        unsubscribes.push(store.subscribe(rootId, refreshFrontier));
      }
    }
    if (setup.hostSubscribe) {
      unsubscribes.push(setup.hostSubscribe(refreshFrontier));
      if (setup.hostAvailable?.()) {
        // The holder may have released between failed admission and subscribe.
        queueMicrotask(() => { if (active) refreshFrontier(); });
      }
    }
    for (const token of tokens) {
      if (!active) break;
      const resource = setup.resources.get(token);
      if (!resource) continue;
      if (resource.status.status !== "pending") {
        // Rebuild the complete declared root frontier if a resource settled
        // between prepare and subscription. This also rechecks blocked roots.
        refreshFrontier();
        continue;
      }
      unsubscribes.push(resource.subscribe(() => {
        if (active) refreshFrontier();
      }));
      // Recheck after subscribing so a custom thenable/resource settlement
      // cannot be lost at the subscription boundary.
      if (resource.status.status !== "pending") refreshFrontier();
    }
  }

  #cleanupWave(workId: string): void {
    this.#pendingWaves.get(workId)?.cleanup();
  }

  #cleanupPending(workId: string): void {
    this.#cleanupWave(workId);
    this.#pendingSetups.delete(workId);
    this.#releasePendingLeases(workId);
  }

  #releasePendingLeases(workId: string): void {
    const releases = this.#pendingLeases.get(workId);
    this.#pendingLeases.delete(workId);
    this.#releaseLeases(releases);
  }

  #releaseLeases(releases: ReadonlySet<() => void> | undefined): void {
    if (!releases) return;
    for (const release of releases) release();
  }

  #rememberWorkStores(workId: string, candidate: Candidate): void {
    this.#rememberRootWorkStores(workId, candidate.rootId, candidate.stores);
  }

  #rememberRootWorkStores(
    workId: string,
    rootId: string,
    candidateStores: ReadonlySet<AnyAsyncStore>,
  ): void {
    let stores = this.#workStores.get(workId);
    if (!stores) this.#workStores.set(workId, stores = new Map());
    for (const store of candidateStores) {
      let roots = stores.get(store);
      if (!roots) stores.set(store, roots = new Set());
      roots.add(rootId);
    }
  }

  #assertActive(): void {
    if (this.#disposed) throw new Error("Native work queue is disposed");
  }
}
