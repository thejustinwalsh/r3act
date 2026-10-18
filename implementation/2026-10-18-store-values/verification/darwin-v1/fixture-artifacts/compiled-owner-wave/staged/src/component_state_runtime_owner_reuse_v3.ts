import {
  type OwnerId,
  type OwnerKey,
  OwnerStateWorld,
  type StateAction,
} from "./owner_state_world.ts";
import {
  type ComponentType,
  copyKeyedOwnerMetadata,
  Fragment,
  getKeyedOwnerRegionId,
  getKeyedOwnerVersion,
  type RuntimeElement,
  type RuntimeNode,
} from "./jsx_binding_runtime.ts";
import {
  type RuntimeCounterCallback,
  type KeyedRegionDeltaOperation,
  type RuntimeProfileCallback,
  type VDOMHost,
  type VDOMKeyIndexMaintenance,
  VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";
import {
  DerivedRegionDispatcher,
  type DerivedRegionGraph,
} from "./derived_region_runtime.ts";

const componentSite = Symbol("compiled-component-site");
type SiteComponent<P> = ComponentType<P> & { [componentSite]: string };
type EffectCleanup = () => void;
type EffectSetup = () => void | EffectCleanup;
type EffectRegistration = {
  owner: OwnerId;
  siteId: string;
  setup: EffectSetup;
};
type LiveEffect = { owner: OwnerId; siteId: string; cleanup?: EffectCleanup };
type PreparedRender = {
  owner: OwnerId;
  result: RuntimeNode;
  ownEffects: Map<string, EffectRegistration>;
};
type ComponentCache = {
  type: RuntimeElement["type"];
  hostKeyScope: OwnerKey;
  props: Record<string, unknown>;
  result: RuntimeNode;
  expandedResult: RuntimeNode;
  subtreeOwners: readonly OwnerId[];
  ownEffects: Map<string, EffectRegistration>;
  keyedRegion?: KeyedRegionCache;
};
type KeyedRegionCache = {
  regionId: string;
  version: object;
  componentSiteId: string;
  outputsByKey: Map<string, RuntimeNode>;
  keysByOwner: Map<OwnerId, string>;
  orderedOwnerKeys: string[];
  orderedKeys: string[];
  hostKeysByOwnerKey: Map<string, string>;
  deltaSafe: boolean;
};
type KeyedRegionCacheDelta = {
  base: KeyedRegionCache;
  outputUpserts: Map<string, RuntimeNode>;
  ownerUpserts: Map<OwnerId, string>;
};

type KeyedOwnerRow = { key: string; element: RuntimeElement };

const findKeyedOwnerRows = (
  node: RuntimeNode,
  regionId: string,
): KeyedOwnerRow[] | null => {
  if (Array.isArray(node)) {
    if (getKeyedOwnerRegionId(node) === regionId) {
      const rows: KeyedOwnerRow[] = [];
      for (const child of node) {
        if (
          !child || Array.isArray(child) || typeof child !== "object" ||
          child.props.key == null
        ) return null;
        rows.push({ key: String(child.props.key), element: child });
      }
      return rows;
    }
    for (const child of node) {
      const rows = findKeyedOwnerRows(child, regionId);
      if (rows) return rows;
    }
    return null;
  }
  if (node && typeof node === "object") {
    return findKeyedOwnerRows(node.props.children, regionId);
  }
  return null;
};

const keyedRegionOperations = (
  previousKeys: readonly string[],
  nextRows: readonly { key: string; tree?: RuntimeNode }[],
  changedTrees: ReadonlyMap<string, RuntimeNode>,
): KeyedRegionDeltaOperation[] => {
  const oldIndex = new Map(previousKeys.map((key, index) => [key, index]));
  const nextKeys = nextRows.map((row) => row.key);
  const nextSet = new Set(nextKeys);
  const oldSet = new Set(previousKeys);
  const operations: KeyedRegionDeltaOperation[] = [];
  for (const key of previousKeys) {
    if (!nextSet.has(key)) operations.push({ type: "remove", key });
  }
  for (const key of nextKeys) {
    if (oldSet.has(key) && changedTrees.has(key)) {
      operations.push({ type: "replace", key, tree: changedTrees.get(key)! });
    }
  }

  // Keep a longest increasing subsequence of surviving row positions in
  // place, then express only the remaining order changes as keyed moves.
  const retained = nextKeys.map((key, position) => ({
    key,
    position,
    oldPosition: oldIndex.get(key),
  })).filter((item) => item.oldPosition !== undefined);
  const tails: number[] = [];
  const tailIndexes: number[] = [];
  const previous = new Array<number>(retained.length).fill(-1);
  for (let index = 0; index < retained.length; index++) {
    const value = retained[index].oldPosition!;
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (tails[middle] < value) low = middle + 1;
      else high = middle;
    }
    if (low > 0) previous[index] = tailIndexes[low - 1];
    tails[low] = value;
    tailIndexes[low] = index;
  }
  const stable = new Set<string>();
  let cursor = tailIndexes.at(-1) ?? -1;
  while (cursor !== -1) {
    stable.add(retained[cursor].key);
    cursor = previous[cursor];
  }

  let anchor: string | null = null;
  for (let index = nextRows.length - 1; index >= 0; index--) {
    const { key } = nextRows[index];
    if (!oldSet.has(key)) {
      const tree = nextRows[index].tree ?? changedTrees.get(key);
      if (tree === undefined) throw new Error(`Missing keyed row output: ${key}`);
      operations.push({ type: "insert", key, beforeKey: anchor, tree });
    } else if (!stable.has(key)) {
      operations.push({ type: "move", key, beforeKey: anchor });
    }
    anchor = key;
  }
  return operations;
};
export type ComponentInvalidationPlan = DerivedRegionGraph & {
  readonly region_component_site_ids: readonly string[];
};
type ActiveOwner = {
  world: OwnerStateWorld;
  owner: OwnerId;
  registerEffect: (siteId: string, setup: EffectSetup) => void;
};
const activeOwners: ActiveOwner[] = [];

const effectKey = (owner: OwnerId, siteId: string) => `${owner}\u0000${siteId}`;

/** Attach the stable component-site ID that a compiler would emit for a function component. */
export const defineComponent = <P extends Record<string, unknown>>(
  siteId: string,
  render: ComponentType<P>,
): ComponentType<P> => {
  if (siteId.length === 0) {
    throw new Error("Component site ID must not be empty");
  }
  Object.defineProperty(render, componentSite, { value: siteId });
  return render;
};

/** Explicit-site hook primitive; the compiler can lower familiar useState calls to this form. */
export const useStateAt = <T>(
  siteId: string,
  initial: T | (() => T),
): readonly [T, (action: StateAction<T>) => boolean] => {
  const active = activeOwners[activeOwners.length - 1];
  if (!active) {
    throw new Error(
      "useStateAt must run while an owner-aware component is rendering",
    );
  }
  return active.world.useState(active.owner, siteId, initial);
};

/** Register an effect by compiler site ID; setup runs after commit, cleanup on deactivation or owner removal. */
export const useEffectAt = (siteId: string, setup: EffectSetup): void => {
  const active = activeOwners[activeOwners.length - 1];
  if (!active) {
    throw new Error(
      "useEffectAt must run while an owner-aware component is rendering",
    );
  }
  active.registerEffect(siteId, setup);
};

export type ComponentStateRootOptions = {
  /** Defer one commit after state writes; defaults to a microtask scheduler. */
  scheduleCommit?: (commit: () => void) => void;
  /** Optional OXC-emitted state-site-to-component invalidation graph. */
  invalidationPlan?: ComponentInvalidationPlan;
  /** Optional diagnostic timing callback; not intended for production hot paths. */
  profile?: RuntimeProfileCallback;
  /** Optional diagnostic work counter callback; excludes time-only instrumentation. */
  profileCounter?: RuntimeCounterCallback;
  /** Experimental selector for comparing keyed-index algorithms in one reconciler. */
  keyIndexMaintenance?: VDOMKeyIndexMaintenance;
  /** Enable compiler-hinted same-key-set owner-cache reuse for structural commits. */
  keyedOwnerReuse?: boolean;
  /** Select the V1 checked scan or V2 trusted-token keyed-region path. */
  keyedOwnerReuseMode?: "checked" | "token" | "token-delta";
};

const getComponentSiteId = (type: RuntimeElement["type"]): string => {
  if (typeof type !== "function") {
    throw new Error("Expected a function component");
  }
  const siteId = (type as SiteComponent<unknown>)[componentSite];
  if (!siteId) {
    throw new Error(
      "Owner-aware components must be registered with defineComponent(siteId, render)",
    );
  }
  return siteId;
};

const keyedIdentity = (
  element: RuntimeElement,
  siteId: string,
  ordinal: number,
): OwnerKey => {
  const key = element.props.key;
  return key == null ? `@slot:${siteId}:${ordinal}` : String(key);
};

const carryHostKeys = (
  node: RuntimeNode,
  componentKey: OwnerKey,
  path = "0",
): RuntimeNode => {
  if (
    node == null || node === false || typeof node === "string" ||
    typeof node === "number"
  ) return node;
  if (Array.isArray(node)) {
    return copyKeyedOwnerMetadata(
      node,
      node.map((child, index) =>
        carryHostKeys(child, componentKey, `${path}.${index}`)
      ),
    );
  }
  if (node.type === Fragment) {
    return {
      ...node,
      props: {
        ...node.props,
        children: carryHostKeys(node.props.children, componentKey, path),
      },
    };
  }
  const existingKey = node.props.key;
  const key = existingKey == null
    ? `${String(componentKey)}:${path}`
    : String(existingKey);
  return { ...node, props: { ...node.props, key } };
};

const singleHostRootKey = (node: RuntimeNode): string | null => {
  const roots: RuntimeElement[] = [];
  const flatten = (value: RuntimeNode): boolean => {
    if (value == null || value === false) return true;
    if (Array.isArray(value)) return value.every(flatten);
    if (typeof value === "string" || typeof value === "number") return false;
    if (value.type === Fragment) return flatten(value.props.children);
    if (typeof value.type !== "string") return false;
    roots.push(value);
    return true;
  };
  if (!flatten(node) || roots.length !== 1 || roots[0].props.key == null) {
    return null;
  }
  return String(roots[0].props.key);
};

const hasNestedComponent = (node: RuntimeNode): boolean => {
  if (
    node == null || node === false || typeof node === "string" ||
    typeof node === "number"
  ) return false;
  if (Array.isArray(node)) return node.some(hasNestedComponent);
  if (typeof node.type === "function") return true;
  return hasNestedComponent(node.props.children);
};

/**
 * Small component execution bridge between owner/site state and the retained
 * VDOM. It is a runtime prototype, not the final JSX compiler output: stable
 * site IDs are supplied by `defineComponent` and `useStateAt` explicitly.
 */
export class ComponentStateRoot<H, Parent = H> {
  readonly world = new OwnerStateWorld();
  readonly #rootOwner: OwnerId;
  readonly #vdom: VDOMSnapshotRoot<H, Parent>;
  #tree: RuntimeNode = null;
  #liveOwners = new Set<OwnerId>();
  #liveEffects = new Map<string, LiveEffect>();
  #liveEffectKeysByOwner = new Map<OwnerId, Set<string>>();
  #componentCache = new Map<OwnerId, ComponentCache>();
  #preparedRenders = new Map<OwnerId, PreparedRender>();
  #disposed = false;
  #scheduled = false;
  readonly #scheduleCommit: (commit: () => void) => void;
  readonly #unsubscribe: () => void;
  readonly #profile?: RuntimeProfileCallback;
  readonly #profileCounter?: RuntimeCounterCallback;
  readonly #keyedOwnerReuse: boolean;
  readonly #keyedOwnerReuseMode: "checked" | "token" | "token-delta";
  #collectedKeyedRegions: Map<OwnerId, KeyedRegionCache> | null = null;
  #collectedKeyedRegionDeltas: Map<OwnerId, KeyedRegionCacheDelta> | null =
    null;
  #activeCounters?: Map<string, number>;
  readonly #invalidation?: {
    dispatcher: DerivedRegionDispatcher;
    sourceSlots: Map<string, number>;
    componentSites: readonly string[];
  };

  constructor(
    host: VDOMHost<H, Parent>,
    container: Parent,
    options: ComponentStateRootOptions = {},
  ) {
    this.#profile = options.profile;
    this.#profileCounter = options.profileCounter;
    this.#keyedOwnerReuse = options.keyedOwnerReuse ??
      options.keyedOwnerReuseMode !== undefined;
    this.#keyedOwnerReuseMode = options.keyedOwnerReuseMode ?? "checked";
    this.#vdom = new VDOMSnapshotRoot(
      host,
      container,
      options.profile,
      options.profileCounter
        ? (counters) => {
          for (const [name, count] of Object.entries(counters)) {
            this.#count(name, count);
          }
        }
        : undefined,
      options.keyIndexMaintenance,
    );
    this.#rootOwner = this.world.resolveOwner(null, "@component-root");
    this.#scheduleCommit = options.scheduleCommit ??
      ((commit) => queueMicrotask(commit));
    if (options.invalidationPlan) {
      const plan = options.invalidationPlan;
      if (
        plan.region_component_site_ids.some((siteId) =>
          typeof siteId !== "string" || siteId.length === 0
        )
      ) {
        throw new Error(
          "Component invalidation plan has an invalid component site ID",
        );
      }
      for (const region of plan.region_ids) {
        if (region >= plan.region_component_site_ids.length) {
          throw new Error(
            "Component invalidation region has no component site ID",
          );
        }
      }
      this.#invalidation = {
        dispatcher: new DerivedRegionDispatcher(plan),
        sourceSlots: new Map(
          plan.source_paths.map((siteId, index) => [siteId, index]),
        ),
        componentSites: plan.region_component_site_ids,
      };
    }
    this.#unsubscribe = this.world.subscribeChanges(() => this.#schedule());
  }

  get version() {
    return this.#vdom.version;
  }

  get snapshot() {
    return this.#vdom.snapshot;
  }

  get partialCommitCount() {
    return this.#vdom.partialCommitCount;
  }

  get partialCommitBatchCount() {
    return this.#vdom.partialCommitBatchCount;
  }

  mount(tree: RuntimeNode) {
    this.#assertActive();
    if (this.version !== 0) {
      throw new Error("ComponentStateRoot is already mounted");
    }
    this.#renderAndCommit(tree, true);
  }

  /** Commit one batched owner/site update; return false when there is no work. */
  flush(): boolean {
    this.#assertActive();
    const flushStarted = this.#profile ? performance.now() : 0;
    const reportFlush = () => {
      if (this.#activeCounters) {
        this.#profileCounter?.(Object.fromEntries(this.#activeCounters));
        this.#activeCounters = undefined;
      }
      if (this.#profile) {
        this.#profile("root.flush", performance.now() - flushStarted);
      }
    };
    this.#scheduled = false;
    if (!this.world.hasPendingChanges()) return false;
    this.#activeCounters = this.#profileCounter ? new Map() : undefined;
    const changes = this.world.pendingChanges();
    const dirtyOwners = new Set(changes.map((change) => change.owner));
    if (this.#invalidation) {
      const graphMappedOwners: OwnerId[] = [];
      for (const change of changes) {
        const sourceSlot = this.#invalidation.sourceSlots.get(change.site);
        if (sourceSlot === undefined) continue;
        this.#invalidation.dispatcher.invalidateSourceSlot(sourceSlot);
        graphMappedOwners.push(change.owner);
      }
      const affectedComponentSites = new Set<string>();
      this.#invalidation.dispatcher.flush((region) =>
        affectedComponentSites.add(this.#invalidation!.componentSites[region])
      );
      for (const owner of graphMappedOwners) {
        const cache = this.#componentCache.get(owner);
        if (
          cache &&
          !affectedComponentSites.has(
            getComponentSiteId(cache.type as RuntimeElement["type"]),
          )
        ) {
          dirtyOwners.delete(owner);
        }
      }
    }
    const relevantOwners = new Set<OwnerId>();
    for (const owner of dirtyOwners) {
      for (const ancestor of this.world.ownerLineage(owner)) {
        relevantOwners.add(ancestor);
      }
    }
    const dirtyOwnerIds = [...dirtyOwners];
    this.#profile?.(
      `dispatch.diagnostic.dirty-owner-count.${dirtyOwnerIds.length}`,
      0,
    );
    this.#profile?.(`dispatch.diagnostic.change-count.${changes.length}`, 0);
    if (dirtyOwnerIds.length !== 1) {
      this.#profile?.("dispatch.structural-gate.owner-count-not-one", 0);
    } else if (changes.length !== 1) {
      this.#profile?.("dispatch.structural-gate.change-count-not-one", 0);
    }
    const partialCommit = dirtyOwnerIds.length === 1 && changes.length === 1
      ? this.#tryPartialOwnerCommit(dirtyOwnerIds[0])
      : dirtyOwnerIds.length > 0
      ? this.#tryPartialOwnerCommits(dirtyOwnerIds)
      : false;
    if (partialCommit) {
      this.#profile?.("dispatch.path.partial-owner", 0);
      this.world.drainChanges();
      reportFlush();
      return true;
    }
    const structuralCommit = dirtyOwnerIds.length === 1 && changes.length === 1
      ? this.#tryStructuralOwnerCommit(dirtyOwnerIds[0])
      : false;
    if (structuralCommit) {
      this.#profile?.("dispatch.path.structural-owner", 0);
      this.world.drainChanges();
      reportFlush();
      return true;
    }
    this.#profile?.("dispatch.path.full-reconcile", 0);
    try {
      this.#renderAndCommit(this.#tree, false, dirtyOwners, relevantOwners);
    } finally {
      this.#preparedRenders.clear();
    }
    this.world.drainChanges();
    reportFlush();
    return true;
  }

  /** Replace the declarative tree while preserving component owners by site/key. */
  update(tree: RuntimeNode) {
    this.#assertActive();
    this.#renderAndCommit(tree, true);
    this.world.drainChanges();
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#unsubscribe();
    this.#scheduled = false;
    this.#vdom.dispose();
    const effectErrors = this.#cleanupEffects(this.#liveEffects.values());
    this.#liveEffects.clear();
    this.#liveEffectKeysByOwner.clear();
    for (const owner of this.#liveOwners) this.world.destroyOwner(owner);
    this.#liveOwners.clear();
    this.#componentCache.clear();
    this.world.destroyOwner(this.#rootOwner);
    if (effectErrors.length) {
      throw new AggregateError(
        effectErrors,
        "Component effect cleanup failed during dispose",
      );
    }
  }

  #renderAndCommit(
    tree: RuntimeNode,
    forceRender: boolean,
    dirtyOwners = new Set<OwnerId>(),
    relevantOwners = new Set<OwnerId>(),
  ) {
    const nextOwners = new Set<OwnerId>();
    const nextEffects = new Map<string, EffectRegistration>();
    const nextComponentCache = new Map<OwnerId, ComponentCache>();
    const createdOwners: OwnerId[] = [];
    this.#collectedKeyedRegions = new Map();
    try {
      const expandStarted = this.#profile ? performance.now() : 0;
      const expanded = this.#expand(
        tree,
        this.#rootOwner,
        nextOwners,
        nextEffects,
        nextComponentCache,
        createdOwners,
        "root",
        forceRender,
        dirtyOwners,
        relevantOwners,
        [],
        new Map(),
      );
      this.#profile?.("owner.full-expand", performance.now() - expandStarted);
      const commitStarted = this.#profile ? performance.now() : 0;
      this.#vdom.commit(expanded);
      this.#profile?.("vdom.full-commit", performance.now() - commitStarted);
    } catch (error) {
      this.#collectedKeyedRegions = null;
      // Candidate component owners are not committed; remove any newly created
      // ownership/state records so a failed render cannot leak entities.
      for (let index = createdOwners.length - 1; index >= 0; index--) {
        this.world.destroyOwner(createdOwners[index]);
      }
      throw error;
    }
    this.#collectedKeyedRegions = null;
    this.#tree = tree;
    const previousOwners = this.#liveOwners;
    this.#liveOwners = nextOwners;
    this.#componentCache = nextComponentCache;
    const effectErrors = this.#reconcileEffects(nextEffects);
    for (const owner of previousOwners) {
      if (!nextOwners.has(owner)) {
        if (this.#activeCounters) this.#count("owner.retired");
        this.world.destroyOwner(owner);
      }
    }
    if (effectErrors.length) {
      throw new AggregateError(
        effectErrors,
        "Component effect setup or cleanup failed after commit",
      );
    }
  }

  #preparePartialOwnerRender(owner: OwnerId): PreparedRender | null {
    const cached = this.#componentCache.get(owner);
    if (!cached) return null;

    const ownEffects = new Map<string, EffectRegistration>();
    let result: RuntimeNode;
    activeOwners.push({
      world: this.world,
      owner,
      registerEffect: (siteId, setup) => {
        if (!siteId || typeof setup !== "function") {
          throw new Error("Invalid effect registration");
        }
        const key = effectKey(owner, siteId);
        if (ownEffects.has(key)) {
          throw new Error(
            `Effect site ${siteId} was registered more than once for owner ${owner}`,
          );
        }
        ownEffects.set(key, { owner, siteId, setup });
      },
    });
    const renderStarted = this.#profile ? performance.now() : 0;
    if (this.#activeCounters) this.#count("owner.component-renders");
    try {
      result = (cached.type as (props: Record<string, unknown>) => RuntimeNode)(
        cached.props,
      );
    } finally {
      activeOwners.pop();
    }
    result = carryHostKeys(result, cached.hostKeyScope);
    if (this.#profile) {
      this.#profile("owner.render-and-key", performance.now() - renderStarted);
    }
    return { owner, result, ownEffects };
  }

  #commitPartialOwnerRender(prepared: PreparedRender) {
    const cached = this.#componentCache.get(prepared.owner)!;
    this.#componentCache.set(prepared.owner, {
      ...cached,
      result: prepared.result,
      expandedResult: prepared.result,
      subtreeOwners: [prepared.owner],
      ownEffects: prepared.ownEffects,
    });
    this.#refreshDirectKeyedRegionOutput(prepared.owner);
    const effectErrors = this.#reconcileOwnerEffects(
      prepared.owner,
      prepared.ownEffects,
    );
    if (effectErrors.length) {
      throw new AggregateError(
        effectErrors,
        "Component effect setup or cleanup failed after partial commit",
      );
    }
  }

  #tryPartialOwnerCommit(owner: OwnerId): boolean {
    const cached = this.#componentCache.get(owner);
    if (!cached || cached.subtreeOwners.length !== 1) return false;
    const oldKey = singleHostRootKey(cached.expandedResult);
    if (oldKey === null) return false;
    const prepared = this.#preparePartialOwnerRender(owner);
    if (!prepared) return false;
    const nextKey = singleHostRootKey(prepared.result);
    if (
      !hasNestedComponent(prepared.result) && nextKey === oldKey &&
      this.#vdom.commitKeyedRegion(oldKey, prepared.result)
    ) {
      this.#commitPartialOwnerRender(prepared);
      return true;
    }
    this.#preparedRenders.set(owner, prepared);
    return false;
  }

  /**
   * Re-expand one stateful owner subtree when its keyed host root is stable.
   * Unaffected owners and effects are carried forward; keyed children inside
   * the region are reconciled by the VDOM without rerunning unchanged rows.
   */
  #tryStructuralOwnerCommit(owner: OwnerId): boolean {
    const cached = this.#componentCache.get(owner);
    if (!cached) {
      this.#profile?.("dispatch.structural-bail.cache-missing", 0);
      return false;
    }
    if (cached.subtreeOwners.length <= 1) {
      this.#profile?.("dispatch.structural-bail.no-nested-owners", 0);
      return false;
    }
    const oldKey = singleHostRootKey(cached.expandedResult);
    if (oldKey === null) {
      this.#profile?.("dispatch.structural-bail.old-root-unkeyed", 0);
      return false;
    }
    const prepared = this.#preparePartialOwnerRender(owner);
    if (!prepared) {
      this.#profile?.("dispatch.structural-bail.render-unavailable", 0);
      return false;
    }

    const nextRootKey = singleHostRootKey(prepared.result);
    if (nextRootKey !== oldKey) {
      this.#profile?.("dispatch.structural-bail.root-key-changed", 0);
      this.#preparedRenders.set(owner, prepared);
      return false;
    }

    if (this.#keyedOwnerReuse) {
      const expandStarted = this.#profile ? performance.now() : 0;
      const expandedResult = this.#expandStableKeyedOwnerResult(
        prepared.result,
        owner,
        cached,
      );
      if (this.#profile) {
        this.#profile(
          "owner.expand-and-cache",
          performance.now() - expandStarted,
        );
      }
      let committed = false;
      let nextOrderedKeys: string[] | null = null;
      if (
        expandedResult !== null &&
        this.#keyedOwnerReuseMode === "token-delta" && cached.keyedRegion
      ) {
        const rows = findKeyedOwnerRows(
          prepared.result,
          cached.keyedRegion.regionId,
        );
        if (rows) {
          const hostRows = rows.map((row) => {
            const key = cached.keyedRegion!.hostKeysByOwnerKey.get(row.key);
            return key === undefined ? null : { key };
          });
          if (cached.keyedRegion.deltaSafe && hostRows.every(Boolean)) {
            const operations = keyedRegionOperations(
              cached.keyedRegion.orderedKeys,
              hostRows as Array<{ key: string }>,
              new Map(),
            );
            committed = this.#vdom.commitKeyedRegionDelta(
              oldKey,
              cached.keyedRegion.regionId,
              operations,
            );
            if (committed) nextOrderedKeys = hostRows.map((row) => row!.key);
          }
        }
      }
      if (
        expandedResult !== null && !committed &&
        this.#vdom.commitKeyedRegion(oldKey, expandedResult)
      ) committed = true;
      if (expandedResult !== null && committed) {
        if (nextOrderedKeys && cached.keyedRegion) {
          cached.keyedRegion.orderedKeys = nextOrderedKeys;
        }
        this.#componentCache.set(owner, {
          ...cached,
          result: prepared.result,
          expandedResult,
          ownEffects: prepared.ownEffects,
        });
        const effectErrors = this.#reconcileOwnerEffects(
          owner,
          prepared.ownEffects,
        );
        if (effectErrors.length) {
          throw new AggregateError(
            effectErrors,
            "Component effects failed after keyed-owner reuse commit",
          );
        }
        this.#profile?.("dispatch.path.keyed-owner-reuse", 0);
        return true;
      }
    }

    const affectedOwners = new Set(cached.subtreeOwners);
    const nextOwners = new Set<OwnerId>([owner]);
    const nextComponentCache = new Map<OwnerId, ComponentCache>();
    const nextEffects = new Map<string, EffectRegistration>();

    const createdOwners: OwnerId[] = [];
    const subtreeOwnersByOwner = new Map<OwnerId, OwnerId[]>([[owner, [
      owner,
    ]]]);
    const expandStarted = this.#profile ? performance.now() : 0;
    this.#collectedKeyedRegions = new Map();
    this.#collectedKeyedRegionDeltas = this.#keyedOwnerReuseMode ===
        "token-delta"
      ? new Map()
      : null;
    const expandedResult: RuntimeNode = (() => {
      try {
        for (const [key, effect] of prepared.ownEffects) {
          nextEffects.set(key, effect);
        }
        return this.#expand(
          prepared.result,
          owner,
          nextOwners,
          nextEffects,
          nextComponentCache,
          createdOwners,
          `structural/${getComponentSiteId(cached.type)}`,
          false,
          new Set(),
          new Set(),
          [owner],
          subtreeOwnersByOwner,
        );
      } catch (error) {
        this.#collectedKeyedRegions = null;
        this.#collectedKeyedRegionDeltas = null;
        for (let index = createdOwners.length - 1; index >= 0; index--) {
          this.world.destroyOwner(createdOwners[index]);
        }
        throw error;
      }
    })();
    const structuralKeyedRegions = this.#collectedKeyedRegions;
    const structuralKeyedRegionDeltas = this.#collectedKeyedRegionDeltas;
    this.#collectedKeyedRegions = null;
    this.#collectedKeyedRegionDeltas = null;
    if (this.#profile) {
      this.#profile(
        "owner.expand-and-cache",
        performance.now() - expandStarted,
      );
    }
    const ownSubtreeOwners = subtreeOwnersByOwner.get(owner) ?? [owner];
    nextComponentCache.set(owner, {
      ...cached,
      result: prepared.result,
      expandedResult,
      subtreeOwners: ownSubtreeOwners,
      ownEffects: prepared.ownEffects,
      ...(structuralKeyedRegions?.get(owner)
        ? { keyedRegion: structuralKeyedRegions.get(owner) }
        : {}),
    });

    let structuralCommit = false;
    const ownerRegionDelta = structuralKeyedRegionDeltas?.get(owner);
    const nextOwnerRegion = structuralKeyedRegions?.get(owner);
    if (
      ownerRegionDelta && nextOwnerRegion && ownerRegionDelta.base.deltaSafe &&
      nextOwnerRegion.deltaSafe &&
      nextOwnerRegion.orderedKeys.length === nextOwnerRegion.orderedOwnerKeys.length
    ) {
      const changedTrees = new Map<string, RuntimeNode>();
      for (const [ownerKey, tree] of ownerRegionDelta.outputUpserts) {
        const hostKey = nextOwnerRegion.hostKeysByOwnerKey.get(ownerKey);
        if (hostKey !== undefined) changedTrees.set(hostKey, tree);
      }
      const operations = keyedRegionOperations(
        ownerRegionDelta.base.orderedKeys,
        nextOwnerRegion.orderedOwnerKeys.map((ownerKey) => {
          const key = nextOwnerRegion.hostKeysByOwnerKey.get(ownerKey);
          if (key === undefined) {
            throw new Error(`Keyed row ${ownerKey} has no host root key`);
          }
          return { key, tree: ownerRegionDelta.outputUpserts.get(ownerKey) };
        }),
        changedTrees,
      );
      structuralCommit = this.#vdom.commitKeyedRegionDelta(
        oldKey,
        ownerRegionDelta.base.regionId,
        operations,
      );
    }
    if (
      !structuralCommit && !this.#vdom.commitKeyedRegion(oldKey, expandedResult)
    ) {
      this.#profile?.("dispatch.structural-bail.keyed-region-rejected", 0);
      // Full reconciliation remains the correctness fallback. Reuse any
      // component results already produced while preparing this subtree.
      for (const candidateOwner of ownSubtreeOwners) {
        const candidate = nextComponentCache.get(candidateOwner);
        if (candidate) {
          this.#preparedRenders.set(candidateOwner, {
            owner: candidateOwner,
            result: candidate.result,
            ownEffects: candidate.ownEffects,
          });
        }
      }
      return false;
    }

    if (structuralKeyedRegionDeltas) {
      for (const [regionOwner, delta] of structuralKeyedRegionDeltas) {
        for (const previousOwner of affectedOwners) {
          if (nextOwners.has(previousOwner)) continue;
          const key = delta.base.keysByOwner.get(previousOwner);
          if (key === undefined) continue;
          delta.base.keysByOwner.delete(previousOwner);
          delta.base.outputsByKey.delete(key);
          this.#count("owner.keyed-region.delta-owner-deletes");
        }
        for (const [key, output] of delta.outputUpserts) {
          delta.base.outputsByKey.set(key, output);
        }
        this.#count(
          "owner.keyed-region.delta-output-upserts",
          delta.outputUpserts.size,
        );
        for (const [nextOwner, key] of delta.ownerUpserts) {
          delta.base.keysByOwner.set(nextOwner, key);
        }
        this.#count(
          "owner.keyed-region.delta-owner-upserts",
          delta.ownerUpserts.size,
        );
        // The next owner cache already points at these shared maps; this
        // assertion protects against collecting a delta for a discarded node.
        if (!nextOwners.has(regionOwner)) {
          throw new Error("Committed keyed-region delta lost its owner");
        }
      }
    }

    const effectErrors: unknown[] = [];
    for (const previousOwner of affectedOwners) {
      if (nextOwners.has(previousOwner)) continue;
      if (this.#activeCounters) this.#count("owner.retired");
      this.#componentCache.delete(previousOwner);
      this.#liveOwners.delete(previousOwner);
      effectErrors.push(
        ...this.#reconcileOwnerEffects(previousOwner, new Map()),
      );
      this.world.destroyOwner(previousOwner);
    }
    for (const [nextOwner, component] of nextComponentCache) {
      this.#componentCache.set(nextOwner, component);
      this.#liveOwners.add(nextOwner);
      effectErrors.push(
        ...this.#reconcileOwnerEffects(nextOwner, component.ownEffects),
      );
    }
    if (effectErrors.length) {
      throw new AggregateError(
        effectErrors,
        "Component effect setup or cleanup failed after structural commit",
      );
    }
    return true;
  }

  #expandStableKeyedOwnerResult(
    node: RuntimeNode,
    parentOwner: OwnerId,
    previousOwnerCache: ComponentCache,
  ): RuntimeNode | null {
    let regionCount = 0;
    let reusedRows = 0;
    const visit = (value: RuntimeNode): RuntimeNode | null => {
      if (
        value == null || value === false || typeof value === "string" ||
        typeof value === "number"
      ) return value;
      if (Array.isArray(value)) {
        const regionId = getKeyedOwnerRegionId(value);
        if (regionId !== null) {
          regionCount++;
          if (
            this.#keyedOwnerReuseMode === "token" ||
            this.#keyedOwnerReuseMode === "token-delta"
          ) {
            const version = getKeyedOwnerVersion(value);
            const keyedRegion = previousOwnerCache.keyedRegion;
            if (
              regionCount !== 1 || version === null || !keyedRegion ||
              keyedRegion.regionId !== regionId ||
              keyedRegion.version !== version ||
              keyedRegion.outputsByKey.size !== value.length ||
              previousOwnerCache.subtreeOwners.length !== value.length + 1
            ) {
              if (this.#activeCounters) {
                this.#count("owner.keyed-region.token-mismatches");
              }
              return null;
            }
            const output: RuntimeNode[] = [];
            for (const child of value) {
              const key = String((child as RuntimeElement).props.key);
              const cachedOutput = keyedRegion.outputsByKey.get(key);
              if (cachedOutput === undefined) return null;
              output.push(cachedOutput);
            }
            if (this.#activeCounters) {
              this.#count("owner.keyed-region.token-hits", value.length);
              this.#count(
                "owner.keyed-region.token-output-reuses",
                output.length,
              );
            }
            reusedRows += output.length;
            return copyKeyedOwnerMetadata(value, output);
          }
          if (
            regionCount !== 1 || value.length === 0 ||
            previousOwnerCache.subtreeOwners.length !== value.length + 1
          ) return null;
          const output: RuntimeNode[] = [];
          const seenKeys = new Set<string>();
          let componentSiteId: string | null = null;
          for (const child of value) {
            if (
              child == null || child === false || Array.isArray(child) ||
              typeof child !== "object" || typeof child.type !== "function"
            ) return null;
            const siteId = getComponentSiteId(child.type);
            if (
              siteId !== regionId ||
              (componentSiteId && siteId !== componentSiteId)
            ) {
              return null;
            }
            componentSiteId = siteId;
            const rawKey = child.props.key;
            if (rawKey == null) return null;
            const key = String(rawKey);
            if (seenKeys.has(key)) return null;
            seenKeys.add(key);
            const childOwner = this.world.findOwner(parentOwner, siteId, key);
            if (childOwner === undefined || !this.#liveOwners.has(childOwner)) {
              return null;
            }
            const childCache = this.#componentCache.get(childOwner);
            if (
              !childCache || childCache.type !== child.type ||
              childCache.subtreeOwners.length !== 1
            ) return null;
            const { key: _key, ref: _ref, ...props } = child.props;
            if (!shallowEqual(childCache.props, props)) return null;
            output.push(childCache.expandedResult);
            reusedRows++;
          }
          if (this.#activeCounters) {
            this.#count("owner.keyed-region.visits", value.length);
            this.#count("owner.keyed-region.eligibility-visits", value.length);
            this.#count("owner.keyed-region.cache-hits", reusedRows);
          }
          return output;
        }
        const output: RuntimeNode[] = [];
        let changed = false;
        for (const child of value) {
          const expanded = visit(child);
          if (expanded === null) return null;
          output.push(expanded);
          if (expanded !== child) changed = true;
        }
        return changed ? output : value;
      }
      if (typeof value.type === "function") return null;
      const child = visit(value.props.children);
      if (child === null) return null;
      return child === value.props.children
        ? value
        : { ...value, props: { ...value.props, children: child } };
    };
    const result = visit(node);
    if (result === null || regionCount !== 1 || reusedRows === 0) {
      this.#count("owner.keyed-region.fallback");
      return null;
    }
    return result;
  }

  #tryPartialOwnerCommits(owners: readonly OwnerId[]): boolean {
    const keys = new Map<OwnerId, string>();
    const seenKeys = new Set<string>();
    for (const owner of owners) {
      const cached = this.#componentCache.get(owner);
      if (!cached) {
        this.#profile?.("dispatch.partial-bail.cache-missing", 0);
        return false;
      }
      if (cached.subtreeOwners.length !== 1) {
        this.#profile?.("dispatch.partial-bail.owner-has-nested-subtree", 0);
        return false;
      }
      const key = singleHostRootKey(cached.expandedResult);
      if (key === null) {
        this.#profile?.("dispatch.partial-bail.old-root-unkeyed", 0);
        return false;
      }
      if (seenKeys.has(key)) {
        this.#profile?.("dispatch.partial-bail.duplicate-region-key", 0);
        return false;
      }
      seenKeys.add(key);
      keys.set(owner, key);
    }
    const prepared = owners.map((owner) =>
      this.#preparePartialOwnerRender(owner)
    );
    if (prepared.some((item) => item === null)) {
      this.#profile?.("dispatch.partial-bail.render-unavailable", 0);
      return false;
    }
    const ready = prepared as PreparedRender[];
    for (const item of ready) {
      if (
        hasNestedComponent(item.result) ||
        singleHostRootKey(item.result) !== keys.get(item.owner)
      ) {
        for (const candidate of ready) {
          this.#preparedRenders.set(candidate.owner, candidate);
        }
        this.#profile?.(
          "dispatch.partial-bail.changed-root-or-nested-owner",
          0,
        );
        return false;
      }
    }
    const regions = ready.map((item) => ({
      key: keys.get(item.owner)!,
      tree: item.result,
    }));
    if (!this.#vdom.commitKeyedRegions(regions)) {
      this.#profile?.("dispatch.partial-bail.keyed-regions-rejected", 0);
      for (const item of ready) this.#preparedRenders.set(item.owner, item);
      return false;
    }
    const effectErrors: unknown[] = [];
    for (const item of ready) {
      const cached = this.#componentCache.get(item.owner)!;
      this.#componentCache.set(item.owner, {
        ...cached,
        result: item.result,
        expandedResult: item.result,
        subtreeOwners: [item.owner],
        ownEffects: item.ownEffects,
      });
      this.#refreshDirectKeyedRegionOutput(item.owner);
      effectErrors.push(
        ...this.#reconcileOwnerEffects(item.owner, item.ownEffects),
      );
      this.#preparedRenders.delete(item.owner);
    }
    if (effectErrors.length) {
      throw new AggregateError(
        effectErrors,
        "Component effects failed after multi-region partial commit",
      );
    }
    return true;
  }

  #cleanupEffects(effects: Iterable<LiveEffect>): unknown[] {
    const errors: unknown[] = [];
    for (const effect of effects) {
      if (!effect.cleanup) continue;
      try {
        effect.cleanup();
      } catch (error) {
        errors.push(error);
      }
    }
    return errors;
  }

  #reconcileEffects(nextEffects: Map<string, EffectRegistration>): unknown[] {
    const errors = this.#cleanupEffects(
      [...this.#liveEffects].filter(([key]) => !nextEffects.has(key)).map((
        [, effect],
      ) => effect),
    );
    const nextLiveEffects = new Map<string, LiveEffect>();
    for (const [key, registration] of nextEffects) {
      const previous = this.#liveEffects.get(key);
      if (previous) {
        nextLiveEffects.set(key, previous);
        continue;
      }
      try {
        const cleanup = registration.setup();
        nextLiveEffects.set(key, {
          owner: registration.owner,
          siteId: registration.siteId,
          cleanup: typeof cleanup === "function" ? cleanup : undefined,
        });
      } catch (error) {
        errors.push(error);
        nextLiveEffects.set(key, {
          owner: registration.owner,
          siteId: registration.siteId,
        });
      }
    }
    this.#liveEffects = nextLiveEffects;
    this.#liveEffectKeysByOwner.clear();
    for (const [key, effect] of nextLiveEffects) {
      let keys = this.#liveEffectKeysByOwner.get(effect.owner);
      if (!keys) {
        this.#liveEffectKeysByOwner.set(effect.owner, keys = new Set());
      }
      keys.add(key);
    }
    return errors;
  }

  #reconcileOwnerEffects(
    owner: OwnerId,
    nextEffects: Map<string, EffectRegistration>,
  ): unknown[] {
    const errors: unknown[] = [];
    const currentKeys = this.#liveEffectKeysByOwner.get(owner);
    if (currentKeys) {
      for (const key of [...currentKeys]) {
        if (nextEffects.has(key)) continue;
        const previous = this.#liveEffects.get(key);
        if (previous?.cleanup) {
          try {
            previous.cleanup();
          } catch (error) {
            errors.push(error);
          }
        }
        this.#liveEffects.delete(key);
        currentKeys.delete(key);
      }
    }
    for (const [key, registration] of nextEffects) {
      if (this.#liveEffects.has(key)) continue;
      try {
        const cleanup = registration.setup();
        this.#liveEffects.set(key, {
          owner,
          siteId: registration.siteId,
          cleanup: typeof cleanup === "function" ? cleanup : undefined,
        });
      } catch (error) {
        errors.push(error);
        this.#liveEffects.set(key, { owner, siteId: registration.siteId });
      }
      let keys = this.#liveEffectKeysByOwner.get(owner);
      if (!keys) this.#liveEffectKeysByOwner.set(owner, keys = new Set());
      keys.add(key);
    }
    if (this.#liveEffectKeysByOwner.get(owner)?.size === 0) {
      this.#liveEffectKeysByOwner.delete(owner);
    }
    return errors;
  }

  #count(name: string, count = 1) {
    if (!this.#activeCounters || count === 0) return;
    this.#activeCounters.set(
      name,
      (this.#activeCounters.get(name) ?? 0) + count,
    );
  }

  #refreshDirectKeyedRegionOutput(owner: OwnerId) {
    const parentOwner = this.world.ownerLineage(owner)[1];
    if (parentOwner === undefined) return;
    const parentCache = this.#componentCache.get(parentOwner);
    const keyedRegion = parentCache?.keyedRegion;
    const key = keyedRegion?.keysByOwner.get(owner);
    if (key === undefined || !keyedRegion) return;
    const childCache = this.#componentCache.get(owner);
    if (childCache) {
      keyedRegion.outputsByKey.set(key, childCache.expandedResult);
    }
  }

  #schedule() {
    if (this.#disposed || this.#scheduled) return;
    this.#scheduled = true;
    this.#scheduleCommit(() => {
      if (this.#disposed || !this.#scheduled) return;
      this.#scheduled = false;
      if (this.world.hasPendingChanges()) this.flush();
    });
  }

  #expand(
    node: RuntimeNode,
    parentOwner: OwnerId,
    nextOwners: Set<OwnerId>,
    nextEffects: Map<string, EffectRegistration>,
    nextComponentCache: Map<OwnerId, ComponentCache>,
    createdOwners: OwnerId[],
    path: string,
    forceRender: boolean,
    dirtyOwners: Set<OwnerId>,
    relevantOwners: Set<OwnerId>,
    ownerPath: OwnerId[],
    subtreeOwnersByOwner: Map<OwnerId, OwnerId[]>,
  ): RuntimeNode {
    if (
      node == null || node === false || typeof node === "string" ||
      typeof node === "number"
    ) return node;
    if (Array.isArray(node)) {
      const regionId = getKeyedOwnerRegionId(node);
      const version = getKeyedOwnerVersion(node);
      const tokenMode = version !== null && regionId !== null && (
        this.#keyedOwnerReuseMode === "token" ||
        this.#keyedOwnerReuseMode === "token-delta"
      );
      const priorRegion = this.#keyedOwnerReuseMode === "token-delta"
        ? this.#componentCache.get(parentOwner)?.keyedRegion
        : undefined;
      const canDelta = tokenMode &&
        this.#keyedOwnerReuseMode === "token-delta" &&
        this.#collectedKeyedRegionDeltas !== null &&
        priorRegion?.regionId === regionId &&
        priorRegion.componentSiteId === regionId && priorRegion.deltaSafe;
      const outputsByKey = tokenMode && !canDelta
        ? new Map<string, RuntimeNode>()
        : null;
      const keysByOwner = outputsByKey ? new Map<OwnerId, string>() : null;
      const outputUpserts = canDelta ? new Map<string, RuntimeNode>() : null;
      const ownerUpserts = canDelta ? new Map<OwnerId, string>() : null;
      const orderedOwnerKeys: string[] = [];
      const orderedKeys: string[] = [];
      const hostKeysByOwnerKey = new Map<string, string>();
      let deltaSafe = true;
      let regionSiteId: string | null = null;
      let validRegion = tokenMode;
      const siteOrdinals = new Map<string, number>();
      let changed = false;
      const children = node.map((child, index) => {
        const childPath = `${path}/${index}`;
        const siteId =
          child && !Array.isArray(child) && typeof child === "object" &&
            typeof child.type === "function"
            ? getComponentSiteId(child.type)
            : "";
        const ordinal = siteId ? (siteOrdinals.get(siteId) ?? 0) : 0;
        if (siteId) siteOrdinals.set(siteId, ordinal + 1);
        const expanded = this.#expand(
          child,
          parentOwner,
          nextOwners,
          nextEffects,
          nextComponentCache,
          createdOwners,
          siteId ? `${childPath}#${ordinal}` : childPath,
          forceRender,
          dirtyOwners,
          relevantOwners,
          ownerPath,
          subtreeOwnersByOwner,
        );
        if (expanded !== child) changed = true;
        if (tokenMode && regionId !== null) {
          if (
            !child || Array.isArray(child) || typeof child !== "object" ||
            typeof child.type !== "function"
          ) {
            validRegion = false;
          } else {
            const childSiteId = getComponentSiteId(child.type);
            const rawKey = child.props.key;
            if (
              childSiteId !== regionId || rawKey == null ||
              (regionSiteId !== null && regionSiteId !== childSiteId)
            ) {
              validRegion = false;
            } else {
              regionSiteId = childSiteId;
              const key = String(rawKey);
              orderedOwnerKeys.push(key);
              const hostKey = singleHostRootKey(expanded);
              if (hostKey === null) deltaSafe = false;
              else {
                orderedKeys.push(hostKey);
                hostKeysByOwnerKey.set(key, hostKey);
              }
              if (outputsByKey) {
                const owner = this.world.findOwner(
                  parentOwner,
                  childSiteId,
                  key,
                );
                if (outputsByKey.has(key) || owner === undefined) {
                  validRegion = false;
                } else {
                  outputsByKey.set(key, expanded);
                  keysByOwner?.set(owner, key);
                }
              } else if (canDelta && priorRegion) {
                const previousOutput = priorRegion.outputsByKey.get(key);
                if (previousOutput !== expanded) {
                  outputUpserts?.set(key, expanded);
                }
                if (!priorRegion.outputsByKey.has(key)) {
                  const owner = this.world.findOwner(
                    parentOwner,
                    childSiteId,
                    key,
                  );
                  if (owner === undefined) {
                    validRegion = false;
                  } else {
                    ownerUpserts?.set(owner, key);
                  }
                }
              } else {
                validRegion = false;
              }
            }
          }
        }
        return expanded;
      });
      if (
        validRegion && outputsByKey && regionId !== null && version !== null &&
        regionSiteId !== null && outputsByKey.size === node.length
      ) {
        this.#collectedKeyedRegions?.set(parentOwner, {
          regionId,
          version,
          componentSiteId: regionSiteId,
          outputsByKey,
          keysByOwner: keysByOwner!,
          orderedOwnerKeys,
          orderedKeys,
          hostKeysByOwnerKey,
          deltaSafe,
        });
      } else if (
        validRegion && canDelta && priorRegion && regionId !== null &&
        version !== null && regionSiteId !== null
      ) {
        this.#collectedKeyedRegions?.set(parentOwner, {
          regionId,
          version,
          componentSiteId: regionSiteId,
          outputsByKey: priorRegion.outputsByKey,
          keysByOwner: priorRegion.keysByOwner,
          orderedOwnerKeys,
          orderedKeys,
          hostKeysByOwnerKey,
          deltaSafe,
        });
        this.#collectedKeyedRegionDeltas?.set(parentOwner, {
          base: priorRegion,
          outputUpserts: outputUpserts!,
          ownerUpserts: ownerUpserts!,
        });
      }
      return changed ? copyKeyedOwnerMetadata(node, children) : node;
    }
    if (typeof node.type === "function") {
      if (this.#activeCounters) this.#count("owner.component-visits");
      const siteId = getComponentSiteId(node.type);
      const lastSegment = path.slice(path.lastIndexOf("/") + 1);
      const ordinal = Number(lastSegment.split("#").at(-1)) || 0;
      const key = keyedIdentity(node, siteId, ordinal);
      const owner = this.world.resolveOwner(parentOwner, siteId, key);
      if (!this.#liveOwners.has(owner)) {
        createdOwners.push(owner);
        if (this.#activeCounters) this.#count("owner.created");
      }
      nextOwners.add(owner);
      if (!subtreeOwnersByOwner.has(owner)) {
        subtreeOwnersByOwner.set(owner, [owner]);
      }
      for (const ancestor of ownerPath) {
        const descendants = subtreeOwnersByOwner.get(ancestor);
        if (descendants) descendants.push(owner);
      }
      const { key: _key, ref: _ref, ...componentProps } = node.props;
      const cached = this.#componentCache.get(owner);
      const propsUnchanged = cached !== undefined &&
        shallowEqual(cached.props, componentProps);
      const shouldRender = forceRender || dirtyOwners.has(owner) || !cached ||
        cached.type !== node.type || !propsUnchanged;
      ownerPath.push(owner);
      try {
        if (!shouldRender && cached && !relevantOwners.has(owner)) {
          if (this.#activeCounters) {
            this.#count("owner.cached-reused", cached.subtreeOwners.length);
          }
          for (const cachedOwner of cached.subtreeOwners) {
            nextOwners.add(cachedOwner);
            const childCache = this.#componentCache.get(cachedOwner);
            if (!childCache) {
              throw new Error(
                `Missing component cache for owner ${cachedOwner}`,
              );
            }
            nextComponentCache.set(cachedOwner, childCache);
            for (const [registeredKey, effect] of childCache.ownEffects) {
              nextEffects.set(registeredKey, effect);
            }
            if (cachedOwner !== owner) {
              for (const ancestor of ownerPath) {
                subtreeOwnersByOwner.get(ancestor)?.push(cachedOwner);
              }
            }
          }
          return cached.expandedResult;
        }

        let result = cached?.result;
        let ownEffects = cached?.ownEffects;
        if (shouldRender) {
          const prepared = this.#preparedRenders.get(owner) ?? null;
          if (prepared) {
            result = prepared.result;
            ownEffects = prepared.ownEffects;
            for (const [registeredKey, effect] of ownEffects) {
              nextEffects.set(registeredKey, effect);
            }
          } else {
            ownEffects = new Map<string, EffectRegistration>();
            activeOwners.push({
              world: this.world,
              owner,
              registerEffect: (effectSiteId, setup) => {
                if (effectSiteId.length === 0) {
                  throw new Error("Effect site ID must not be empty");
                }
                if (typeof setup !== "function") {
                  throw new Error("Effect setup must be a function");
                }
                const key = effectKey(owner, effectSiteId);
                if (nextEffects.has(key)) {
                  throw new Error(
                    `Effect site ${effectSiteId} was registered more than once for owner ${owner}`,
                  );
                }
                const registration = { owner, siteId: effectSiteId, setup };
                nextEffects.set(key, registration);
                ownEffects!.set(key, registration);
              },
            });
            try {
              if (this.#activeCounters) this.#count("owner.component-renders");
              result = node.type(componentProps);
            } finally {
              activeOwners.pop();
            }
            result = carryHostKeys(result, key);
          }
        } else if (ownEffects) {
          for (const [registeredKey, effect] of ownEffects) {
            nextEffects.set(registeredKey, effect);
          }
        }
        const expandedResult = this.#expand(
          result ?? null,
          owner,
          nextOwners,
          nextEffects,
          nextComponentCache,
          createdOwners,
          `${path}/${siteId}`,
          forceRender,
          dirtyOwners,
          relevantOwners,
          ownerPath,
          subtreeOwnersByOwner,
        );
        const componentCache: ComponentCache = {
          type: node.type,
          hostKeyScope: key,
          props: componentProps,
          result: result ?? null,
          expandedResult,
          subtreeOwners: subtreeOwnersByOwner.get(owner) ?? [owner],
          ownEffects: ownEffects ?? new Map(),
          ...(this.#collectedKeyedRegions?.get(owner)
            ? { keyedRegion: this.#collectedKeyedRegions.get(owner) }
            : {}),
        };
        nextComponentCache.set(owner, componentCache);
        return expandedResult;
      } finally {
        ownerPath.pop();
      }
    }
    const children = this.#expand(
      node.props.children,
      parentOwner,
      nextOwners,
      nextEffects,
      nextComponentCache,
      createdOwners,
      `${path}/${node.type === Fragment ? "fragment" : node.type}`,
      forceRender,
      dirtyOwners,
      relevantOwners,
      ownerPath,
      subtreeOwnersByOwner,
    );
    return children === node.props.children
      ? node
      : { ...node, props: { ...node.props, children } };
  }

  #assertActive() {
    if (this.#disposed) throw new Error("ComponentStateRoot is disposed");
  }
}

const shallowEqual = (
  left: Record<string, unknown>,
  right: Record<string, unknown>,
) => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!Object.hasOwn(right, key) || !Object.is(left[key], right[key])) {
      return false;
    }
  }
  return true;
};
