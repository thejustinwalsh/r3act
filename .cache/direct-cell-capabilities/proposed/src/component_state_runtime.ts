import {
  type AnyAsyncStore,
  AsyncStore,
  StoreRenderTransaction,
  type StoreSource,
} from "./async_store_runtime.ts";
import {
  AsyncResource,
  AsyncResourceTable,
  isPendingResourceToken,
  ResourceRejection,
} from "./async_resource_runtime.ts";
import { ResourceReadSet } from "./resource_read_set.ts";
import { PendingStateChanges } from "./pending_state_changes.ts";
import type {
  CompiledStateLayout,
  NumericLaneAddress,
} from "./compiled_state_layout.ts";
export type { CompiledStateLayout } from "./compiled_state_layout.ts";
import {
  type OwnerId,
  type OwnerKey,
  type OwnerPreparation,
  OwnerStateWorld,
  type StateAction,
  type StateCellHandle,
} from "./owner_state_world.ts";
import {
  bind,
  bindSources,
  type BoundValue,
  type ComponentType,
  copyKeyedOwnerMetadata,
  createKeyedOwnerVersion,
  Fragment,
  getKeyedOwnerRegionId,
  getKeyedOwnerVersion,
  keyedOwnerChildren,
  type NumericBindingProgramDescriptor,
  type RuntimeElement,
  type RuntimeNode,
  type ScalarSource,
} from "./jsx_binding_runtime.ts";
import {
  type PreparedNumericCellProgram,
  type PreparedVDOMCommit,
  type RuntimeCounterCallback,
  type RuntimeProfileCallback,
  type VDOMHost,
  type VDOMKeyIndexMaintenance,
  VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";
import {
  DerivedRegionDispatcher,
  type DerivedRegionGraph,
} from "./derived_region_runtime.ts";
import {
  type KeyedCollection,
  type KeyedCollectionBatch,
  type KeyedCollectionOperation,
} from "./keyed_collection.ts";

const componentSite = Symbol("compiled-component-site");
class SparseCandidateIneligible extends Error {}
type SiteComponent<P> = ComponentType<P> & { [componentSite]: string };
type EffectCleanup = () => void;
type EffectSetup = () => void | EffectCleanup;
type EffectRegistration = {
  owner: OwnerId;
  siteId: string;
  setup: EffectSetup;
};
type LiveEffect = { owner: OwnerId; siteId: string; cleanup?: EffectCleanup };
export type NativeRootCandidate<H, Parent = H> = {
  readonly rootId: string;
  readonly baseVersion: number;
  readonly targetVersion: number;
  readonly stores: ReadonlySet<AnyAsyncStore>;
  readonly transitions: readonly string[];
  /** Resources that suspended this prepared tree. */
  readonly pendingResources: readonly AsyncResource<any>[];
  /** True when retained content cannot finish from this candidate's pinned inputs. */
  readonly blocked: boolean;
  /** Keep candidate-discovered stores subscribed after discard until released. */
  retainStoreDependencies(): () => void;
  validate(): boolean;
  commitHost(): void;
  publish(): void;
  runEffects(): void;
  discard(): void;
  failGroup(error: unknown): void;
};
type BoundaryPrimary = {
  tree: RuntimeNode;
};
type BoundaryRenderState = { blocked: boolean; visited: Set<string> };
type PreparedRender = {
  owner: OwnerId;
  result: RuntimeNode;
  ownEffects: Map<string, EffectRegistration>;
  propBoundSites: ReadonlySet<string>;
};
type ComponentCache = {
  type: RuntimeElement["type"];
  hostKeyScope: OwnerKey;
  props: Record<string, unknown>;
  result: RuntimeNode;
  expandedResult: RuntimeNode;
  subtreeOwners: ReadonlySet<OwnerId>;
  ownEffects: Map<string, EffectRegistration>;
  propBoundSites: ReadonlySet<string>;
  nativeBoundary?: boolean;
  invalidatedByCollection?: boolean;
  /** A sparse keyed host commit changed a descendant output in this snapshot. */
  invalidatedBySparseStore?: boolean;
  keyedRegion?: KeyedRegionCache;
};
type CandidateNumericWrite = {
  readonly owner: OwnerId;
  readonly site: string;
  readonly source: ScalarSource;
  readonly version: number;
  readonly previous: number;
  readonly current: number;
};
type CandidateLifecycleSpec<H, Parent> = {
  baseVersion: number;
  baseVDOMVersion: number;
  stores: StoreRenderTransaction;
  transitions: readonly string[];
  pendingResources: readonly AsyncResource<any>[];
  blocked: boolean;
  validatePrepared(): boolean;
  validatePostHost(): boolean;
  commitHost(): void;
  publish(): void;
  runEffects(): readonly unknown[];
  discard(): void;
  releaseArtifacts(published: boolean): void;
  effectFailureMessage: string;
};
type KeyedRegionCache = {
  regionId: string;
  version: object;
  componentSiteId: string;
  outputsByKey: Map<string, RuntimeNode>;
  keysByOwner: Map<OwnerId, string>;
  collection?: CollectionRegionCache;
};
type CollectionRegionDescriptor<T = unknown> = {
  /** Compiler-unique collection site, independent of the mapped row component site. */
  siteId: string;
  componentSiteId?: string;
  collection: KeyedCollection<T>;
  renderRow: (value: T) => RuntimeNode;
  rows: Map<string, RuntimeNode>;
  snapshotVersion: number;
  requiresOwnerRender: boolean;
};
type CollectionRegionCache = CollectionRegionDescriptor<any> & {
  parentOwner: OwnerId;
  parentHostKey: string | null;
  reader?: ReturnType<KeyedCollection<unknown>["createReader"]>;
  hostKeysByCollectionKey: Map<string, string>;
  unsubscribe?: () => void;
};
const collectionRegionDescriptors = new WeakMap<
  object,
  CollectionRegionDescriptor<any>
>();
export type ComponentInvalidationPlan = DerivedRegionGraph & {
  readonly region_component_site_ids: readonly string[];
};
type ActiveOwner = {
  world: Pick<OwnerStateWorld, "useState" | "scalarSource">;
  owner: OwnerId;
  stateLayout?: CompiledStateLayout;
  registerEffect: (siteId: string, setup: EffectSetup) => void;
  propBoundSites: Set<string>;
  readStore: <T>(siteId: string, source: StoreSource<T>) => T;
  readResource?: <T>(source: AsyncResource<T> | PromiseLike<T>) => Awaited<T>;
  captureBinding?: (
    binding: BoundValue<unknown>,
    sources: ScalarSource[],
    owner: OwnerId,
    sites: readonly string[],
  ) => void;
};
const activeOwners: ActiveOwner[] = [];
class StaleCollectionCandidate extends Error {}

export type NativeSuspenseProps = {
  children?: RuntimeNode;
  fallback?: RuntimeNode;
  pending?: RuntimeNode;
  error?: (reason: unknown) => RuntimeNode;
  key?: string | number;
  /** Reserved compiler site identity, injected for imported Suspense. */
  __nativeBoundarySite?: string;
};

/** Native local resource boundary. The runtime recognizes this marker before invoking it. */
export const Suspense: ComponentType<NativeSuspenseProps> = (props) =>
  props.children ?? null;

const isPendingResource = (
  error: unknown,
): error is { resource: AsyncResource<any> } => isPendingResourceToken(error);

const worldResourceTables = new WeakMap<object, AsyncResourceTable>();

class ExpansionJournal {
  #undo: Array<() => void> = [];
  checkpoint() {
    return this.#undo.length;
  }
  clear() {
    this.#undo.length = 0;
  }
  rollback(cursor: number) {
    for (let i = this.#undo.length - 1; i >= cursor; i--) this.#undo[i]();
    this.#undo.length = cursor;
  }
  set<K, V>(map: Map<K, V>, key: K, value: V) {
    const had = map.has(key), previous = map.get(key);
    this.#undo.push(() => had ? map.set(key, previous as V) : map.delete(key));
    map.set(key, value);
  }
  add<T>(set: Set<T>, value: T) {
    const had = set.has(value);
    this.#undo.push(() => {
      if (!had) set.delete(value);
    });
    set.add(value);
  }
  push<T>(array: T[], value: T) {
    this.#undo.push(() => {
      array.pop();
    });
    array.push(value);
  }
  undo(callback: () => void) {
    this.#undo.push(callback);
  }
}

const effectKey = (owner: OwnerId, siteId: string) => `${owner}\u0000${siteId}`;
const closedCandidateValidate = () => false;
const closedCandidateAction = () => {
  throw new Error("Native root candidate is closed");
};
const closedCandidateNoop = () => {};
const closedCandidateLease = () => closedCandidateNoop;

/** Attach the stable component-site ID that a compiler would emit for a function component. */
export const defineComponent = <P extends Record<string, unknown>>(
  siteId: string,
  render: ComponentType<P>,
  metadata?: {
    readonly propOnlySites: readonly string[];
    /** Compiler proof that every render result is a single intrinsic host root. */
    readonly hostLeafOutput?: boolean;
    readonly stateLayout?: CompiledStateLayout;
  },
): ComponentType<P> => {
  if (siteId.length === 0) {
    throw new Error("Component site ID must not be empty");
  }
  Object.defineProperty(render, componentSite, { value: siteId });
  if (metadata) {
    const propOnlySites = [...metadata.propOnlySites];
    if (propOnlySites.some((site) => typeof site !== "string" || !site)) {
      throw new Error(
        "Component prop-only metadata contains an invalid state site ID",
      );
    }
    let stateLayout: CompiledStateLayout | undefined;
    if (metadata.stateLayout !== undefined) {
      const layout = metadata.stateLayout;
      if (layout.schemaVersion !== 1 || !Array.isArray(layout.slots)) {
        throw new Error("Invalid compiled state layout schema");
      }
      const seen = new Set<string>();
      const slots = layout.slots.map((entry, slot) => {
        if (
          !entry || entry.slot !== slot ||
          !propOnlySites.includes(entry.siteId) || seen.has(entry.siteId)
        ) {
          throw new Error("Invalid compiled state layout slot");
        }
        seen.add(entry.siteId);
        return Object.freeze({ siteId: entry.siteId, slot });
      });
      stateLayout = Object.freeze({
        schemaVersion: 1,
        slots: Object.freeze(slots),
      });
    }
    Object.defineProperty(render, componentMetadata, {
      value: Object.freeze({
        propOnlySites: Object.freeze(propOnlySites),
        hostLeafOutput: metadata.hostLeafOutput === true,
        ...(stateLayout ? { stateLayout } : {}),
      }),
    });
  }
  return render;
};

const componentMetadata = Symbol("compiled-component-metadata");
const emptyCompiledPropSites: ReadonlySet<string> = new Set();
type ComponentMetadata = {
  readonly propOnlySites: readonly string[];
  readonly hostLeafOutput?: boolean;
  readonly stateLayout?: CompiledStateLayout;
};

const compiledStateLayoutFor = (
  component: unknown,
): CompiledStateLayout | undefined =>
  typeof component === "function"
    ? (component as SiteComponent<unknown> & {
      [componentMetadata]?: ComponentMetadata;
    })[componentMetadata]?.stateLayout
    : undefined;

const validateNumericBindingProgram = (
  descriptor: NumericBindingProgramDescriptor | undefined,
  sites: readonly string[],
): NumericBindingProgramDescriptor | undefined => {
  if (descriptor === undefined) return undefined;
  if (
    !descriptor || typeof descriptor !== "object" ||
    descriptor.schemaVersion !== 1 ||
    typeof descriptor.sinkId !== "string" || descriptor.sinkId.length === 0 ||
    !Array.isArray(descriptor.sourceSites) ||
    descriptor.sourceSites.length !== sites.length
  ) {
    throw new TypeError("Invalid numeric binding program descriptor");
  }
  for (let index = 0; index < sites.length; index++) {
    if (
      typeof descriptor.sourceSites[index] !== "string" ||
      descriptor.sourceSites[index] !== sites[index]
    ) {
      throw new TypeError(
        "Numeric binding program source sites must exactly match the binding",
      );
    }
  }
  // Descriptor identity and source shape participate in cached VDOM
  // eligibility. Freeze them once during activation so caller mutation cannot
  // change the proof after the sink has been retained.
  Object.freeze(descriptor.sourceSites);
  return Object.freeze(descriptor);
};

/** Build a live numeric binding from state cells owned by the active component. */
export const bindStatePropsAt = <T>(
  siteIds: readonly string[],
  derive: (values: readonly number[]) => T,
  numericProgram?: NumericBindingProgramDescriptor,
): BoundValue<T> => {
  const active = activeOwners[activeOwners.length - 1];
  if (!active) {
    throw new Error(
      "bindStatePropsAt must run while an owner-aware component is rendering",
    );
  }
  if (siteIds.length === 0 || typeof derive !== "function") {
    throw new Error("A state prop binding needs sites and a derive function");
  }
  const validatedProgram = validateNumericBindingProgram(
    numericProgram,
    siteIds,
  );
  const sources: ScalarSource[] = [];
  for (const siteId of siteIds) {
    const source = active.world.scalarSource(active.owner, siteId);
    if (!source) {
      throw new Error(`State site ${siteId} is not a numeric state cell`);
    }
    active.propBoundSites.add(siteId);
    sources.push(source);
  }
  const binding = bindSources(sources, derive, validatedProgram);
  active.captureBinding?.(
    binding as BoundValue<unknown>,
    sources,
    active.owner,
    siteIds,
  );
  return binding;
};

/** Build a live numeric binding from one state cell owned by the active component. */
export const bindStatePropAt = <T>(
  siteId: string,
  project: (value: number) => T,
  numericProgram?: NumericBindingProgramDescriptor,
): BoundValue<T> | T => {
  const active = activeOwners[activeOwners.length - 1];
  if (!active) {
    throw new Error(
      "bindStatePropAt must run while an owner-aware component is rendering",
    );
  }
  if (
    typeof siteId !== "string" || siteId.length === 0 ||
    typeof project !== "function"
  ) {
    throw new Error("A state prop binding needs a site and project function");
  }
  const validatedProgram = validateNumericBindingProgram(numericProgram, [
    siteId,
  ]);
  const source = active.world.scalarSource(active.owner, siteId);
  if (!source) {
    if (
      validatedProgram &&
      active.stateLayout?.slots.some((slot) => slot.siteId === siteId)
    ) {
      // A compiler-certified numeric site can promote to general state. Its
      // ordinary initializer already ran; read the same private/committed cell
      // and evaluate the authored expression without a numeric subscription.
      const [value] = active.world.useState<unknown>(
        active.owner,
        siteId,
        undefined,
        active.stateLayout,
      );
      return project(value as number);
    }
    throw new Error(`State site ${siteId} is not a numeric state cell`);
  }
  active.propBoundSites.add(siteId);
  const sources = [source];
  const sites = [siteId];
  // Keep the conservative writer behavior for projections that return a stable
  // mutable object. The scalar source still drives the normal binding protocol.
  const binding: BoundValue<T> = {
    ...bind(source, project),
    sources,
    read: () => project(sources[0].value),
    ...(validatedProgram ? { numericProgram: validatedProgram } : {}),
  };
  active.captureBinding?.(
    binding as BoundValue<unknown>,
    sources,
    active.owner,
    sites,
  );
  return binding;
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
  return active.stateLayout
    ? active.world.useState(active.owner, siteId, initial, active.stateLayout)
    : active.world.useState(active.owner, siteId, initial);
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

/** Read a shared store or selector at a stable compiler-owned component site. */
export const useStoreAt = <T>(
  siteId: string,
  source: StoreSource<T>,
): T => {
  const active = activeOwners[activeOwners.length - 1];
  if (!active) {
    throw new Error(
      "useStoreAt must run while an owner-aware component is rendering",
    );
  }
  if (!siteId || !source || typeof source.read !== "function") {
    throw new Error("useStoreAt requires a site ID and store source");
  }
  return active.readStore(siteId, source);
};

/** Generic authored read: stores keep their value semantics; resources unwrap and suspend. */
export const useAt = <T>(
  siteId: string,
  source: StoreSource<T> | AsyncResource<T> | PromiseLike<T>,
): T | Awaited<T> => {
  if (source instanceof AsyncResource) {
    const active = activeOwners[activeOwners.length - 1];
    if (!active?.readResource) {
      throw new Error("useAt resource reads require an owner-aware render");
    }
    return active.readResource(source as AsyncResource<T> | PromiseLike<T>);
  }
  if (
    source && (typeof source === "object" || typeof source === "function") &&
    typeof (source as { read?: unknown }).read === "function"
  ) {
    return useStoreAt(siteId, source as StoreSource<T>);
  }
  if (source && (typeof source === "object" || typeof source === "function")) {
    const active = activeOwners[activeOwners.length - 1];
    if (!active?.readResource) {
      throw new Error("useAt resource reads require an owner-aware render");
    }
    return active.readResource(source as AsyncResource<T> | PromiseLike<T>);
  }
  throw new TypeError("useAt requires a store source, resource, or thenable");
};

/**
 * Compiler lowering for `items.map(row => <Row key={row.id} ... />)` when the
 * input is a proven keyed collection. Initial/full renders take a snapshot;
 * committed roots consume later collection batches through a sparse region.
 */
export const renderCollectionAt = <T>(
  siteId: string,
  collection: KeyedCollection<T>,
  renderRow: (value: T) => RuntimeNode,
  options: { readonly requiresOwnerRender?: boolean } = {},
): RuntimeNode[] => {
  if (activeOwners.length === 0) {
    throw new Error("renderCollectionAt must run while an owner is rendering");
  }
  if (
    !siteId || !collection || typeof collection.snapshot !== "function" ||
    typeof collection.createReader !== "function" ||
    typeof renderRow !== "function"
  ) {
    throw new Error(
      "renderCollectionAt requires a site, collection, and row renderer",
    );
  }
  const snapshotVersion = collection.version;
  const rows = new Map<string, RuntimeNode>();
  let componentSiteId: string | undefined;
  const children = collection.snapshot().map(({ key, value }) => {
    const rendered = renderRow(value);
    if (
      !rendered || Array.isArray(rendered) || typeof rendered !== "object" ||
      !(typeof rendered.type === "function" ||
        typeof rendered.type === "string")
    ) {
      throw new Error("Keyed collection rows must render one element");
    }
    const rowSiteId = typeof rendered.type === "function"
      ? getComponentSiteId(rendered.type)
      : undefined;
    if (rowSiteId && componentSiteId && componentSiteId !== rowSiteId) {
      throw new Error("A collection region must map one component site");
    }
    if (rowSiteId) componentSiteId = rowSiteId;
    const authoredKey = rendered.props.key;
    if (authoredKey != null && String(authoredKey) !== key) {
      throw new Error(
        `Collection key ${key} does not match rendered row key ${
          String(authoredKey)
        }`,
      );
    }
    rows.set(key, { ...rendered, props: { ...rendered.props, key } });
    return rows.get(key)!;
  });
  const version = createKeyedOwnerVersion();
  const marked = keyedOwnerChildren(siteId, children, version);
  collectionRegionDescriptors.set(version, {
    siteId,
    componentSiteId,
    collection,
    renderRow,
    rows,
    snapshotVersion,
    requiresOwnerRender: options.requiresOwnerRender === true,
  });
  return marked;
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
  keyedOwnerReuseMode?: "checked" | "token";
  /** Share state/source storage with other roots in one runtime instance. */
  world?: OwnerStateWorld;
  /** Stable root namespace within a shared world. Defaults to a unique ID. */
  rootId?: string;
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

const collectionOwnerSite = (
  collectionSiteId: string,
  componentSiteId: string,
) => `${componentSiteId}\u0000collection:${collectionSiteId}`;

const carryHostKeys = (
  node: RuntimeNode,
  componentKey: OwnerKey,
  path = "0",
  onVisit?: () => void,
): RuntimeNode => {
  onVisit?.();
  if (
    node == null || node === false || typeof node === "string" ||
    typeof node === "number"
  ) return node;
  if (Array.isArray(node)) {
    return copyKeyedOwnerMetadata(
      node,
      node.map((child, index) =>
        carryHostKeys(child, componentKey, `${path}.${index}`, onVisit)
      ),
    );
  }
  if (node.type === Fragment) {
    return {
      ...node,
      props: {
        ...node.props,
        children: carryHostKeys(
          node.props.children,
          componentKey,
          path,
          onVisit,
        ),
      },
    };
  }
  const existingKey = node.props.key;
  const key = existingKey == null
    ? `${String(componentKey)}:${path}`
    : String(existingKey);
  return { ...node, props: { ...node.props, key } };
};

const singleHostRootKey = (
  node: RuntimeNode,
  onVisit?: () => void,
): string | null => {
  const roots: RuntimeElement[] = [];
  const flatten = (value: RuntimeNode): boolean => {
    onVisit?.();
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

const hasNestedComponent = (
  node: RuntimeNode,
  onVisit?: () => void,
): boolean => {
  onVisit?.();
  if (
    node == null || node === false || typeof node === "string" ||
    typeof node === "number"
  ) return false;
  if (Array.isArray(node)) {
    return node.some((child) => hasNestedComponent(child, onVisit));
  }
  if (typeof node.type === "function") return true;
  return hasNestedComponent(node.props.children, onVisit);
};

/**
 * Component execution bridge between owner/site state and retained VDOM.
 * The native module compiler supplies stable component, hook, and collection
 * site IDs; explicit helpers remain available to host adapters and extensions.
 */
export class ComponentStateRoot<H, Parent = H> {
  readonly world: OwnerStateWorld;
  readonly #rootOwner: OwnerId;
  readonly #rootId: string;
  readonly #vdom: VDOMSnapshotRoot<H, Parent>;
  #tree: RuntimeNode = null;
  #liveOwners = new Set<OwnerId>();
  #liveEffects = new Map<string, LiveEffect>();
  #liveEffectKeysByOwner = new Map<OwnerId, Set<string>>();
  #componentCache = new Map<OwnerId, ComponentCache>();
  // Metadata describes every compiler-approved prop sink a component can use;
  // the committed cache records only the sites actually bound in this render.
  // Cache identity changes on render, so the intersection is naturally
  // invalidated when conditional output changes.
  #compiledPropSitesByCache = new WeakMap<
    ComponentCache,
    ReadonlySet<string>
  >();
  #liveCollectionRegions = new Map<string, CollectionRegionCache>();
  #pendingCollectionRegionKeys = new Set<string>();
  #collectionSnapshotFallbackKeys = new Set<string>();
  #preparedRenders = new Map<OwnerId, PreparedRender>();
  #disposed = false;
  #disposing = false;
  #publicationVersion = 0;
  #preparedCandidates = new Set<NativeRootCandidate<H, Parent>>();
  #candidateHostCommit = false;
  #publicationBarrier: NativeRootCandidate<H, Parent> | null = null;
  #deferredFlush = false;
  #disposeListeners = new Set<() => void>();
  #candidateStoreHolds = new Map<AnyAsyncStore, number>();
  #storeDependencyLeases = new Map<symbol, Set<AnyAsyncStore>>();
  #terminalHostFailure: unknown;
  #terminalHostFailed = false;
  #scheduled = false;
  #pendingChanges = new PendingStateChanges();
  #lastSourceValues = new Map<ScalarSource, number>();
  #numericProgramSources: Array<ScalarSource | undefined> = [];
  #numericProgramCurrentValues: number[] = [];
  #numericProgramPreviousValues: number[] = [];
  #numericProgramUsedCount = 0;
  #nativeCellHandles: Array<StateCellHandle | undefined> = [];
  #nativeCellVersions: number[] = [];
  #nativeLaneTokens: Array<PreparedNumericCellProgram | undefined> = [];
  #nativeLanePrograms = new WeakMap<
    NumericLaneAddress,
    { readonly token: PreparedNumericCellProgram; readonly source: ScalarSource }
  >();
  #nativeCellCutActive = false;
  #liveStoreSubscriptions = new Map<AnyAsyncStore, () => void>();
  #liveStoreReaders = new Map<string, Set<AnyAsyncStore>>();
  readonly #resourceTable: AsyncResourceTable;
  #liveResourceSubscriptions = new Map<AsyncResource<any>, () => void>();
  // Resource reads are transaction-scoped. Until their read footprint is
  // cached per owner, any store-driven selective candidate must conservatively
  // rebuild the complete tree once a root has observed a resource.
  #everReadResource = false;
  // This sticky bit avoids scanning every cache to decide whether a store
  // candidate may safely skip native-boundary expansion.
  #everHadNativeBoundary = false;
  #pendingResourceRetry = false;
  #boundaryPrimaries = new Map<string, BoundaryPrimary>();
  #storeNotificationGeneration = 0;
  #committedStoreNotificationGeneration = 0;
  #sourceValueSyncVisits = 0;
  readonly #scheduleCommit: (commit: () => void) => void;
  readonly #unsubscribe: () => void;
  readonly #profile?: RuntimeProfileCallback;
  readonly #profileCounter?: RuntimeCounterCallback;
  readonly #keyedOwnerReuse: boolean;
  readonly #keyedOwnerReuseMode: "checked" | "token";
  #collectedKeyedRegions: Map<OwnerId, KeyedRegionCache> | null = null;
  #collectedCollectionRegions: Map<string, CollectionRegionCache> | null = null;
  #activeCounters?: Map<string, number>;
  readonly #invalidation?: {
    dispatcher: DerivedRegionDispatcher;
    sourceSlots: Map<string, number>;
    componentSites: readonly string[];
  };
  static #nextRootId = 1;

  constructor(
    host: VDOMHost<H, Parent>,
    container: Parent,
    options: ComponentStateRootOptions = {},
  ) {
    this.world = options.world ?? new OwnerStateWorld();
    let resourceTable = worldResourceTables.get(this.world);
    if (!resourceTable) {
      resourceTable = new AsyncResourceTable();
      worldResourceTables.set(this.world, resourceTable);
    }
    this.#resourceTable = resourceTable;
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
    const rootId = options.rootId ?? `root-${ComponentStateRoot.#nextRootId++}`;
    if (!rootId) throw new Error("Component root ID must not be empty");
    this.#rootId = rootId;
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
    this.#rootOwner = this.world.claimRootId(rootId);
    this.#unsubscribe = this.world.subscribeDirtyCells((handle, version) => {
      if (!this.world.isWithin(handle.owner, this.#rootOwner)) return;
      this.#pendingChanges.setCell(handle, version);
      this.#schedule();
    });
  }

  get version() {
    return this.#vdom.version;
  }

  /** Logical native publication revision, including non-DOM source commits. */
  get publicationVersion() {
    return this.#publicationVersion;
  }

  /** Hold declared task/input store dependencies until this owner releases them. */
  holdStoreDependencies(stores: Iterable<AnyAsyncStore>): () => void {
    this.#assertActive();
    const leasedStores = new Set(stores);
    if ([...leasedStores].some((store) => !(store instanceof AsyncStore))) {
      throw new TypeError("Store dependency holds require native stores");
    }
    const leaseId = Symbol("root-store-dependencies");
    this.#storeDependencyLeases.set(leaseId, leasedStores);
    this.#reconcileStoreSubscriptions();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      leasedStores.clear();
      this.#storeDependencyLeases.delete(leaseId);
      this.#reconcileStoreSubscriptions();
    };
  }

  /** Prepare an isolated full-tree candidate without touching host or live caches. */
  prepare(
    tree: RuntimeNode,
    options: {
      readonly transitions?: readonly string[];
      readonly autoRetryResources?: boolean;
    } = {},
  ): NativeRootCandidate<H, Parent> {
    return this.#prepareCandidate(tree, options, true, new Set(), new Set());
  }

  /** Prepare tracked root work without requiring callers to provide a full tree. */
  preparePending(
    options: { readonly transitions?: readonly string[] } = {},
  ): NativeRootCandidate<H, Parent> | null {
    this.#assertActive();
    this.#assertNoPublicationBarrier("prepare");
    if (this.#terminalHostFailed) {
      throw new Error("Component root is terminal after a host commit failure");
    }
    const changes = this.#pendingChanges.capture();
    if (
      changes.length === 0 && this.#pendingCollectionRegionKeys.size === 0 &&
      this.#storeNotificationGeneration ===
        this.#committedStoreNotificationGeneration &&
      (options.transitions?.length ?? 0) === 0
    ) return null;
    const mixed = this.#prepareMixedCollectionCandidate(changes, {
      storeGeneration: this.#storeNotificationGeneration,
      transitions: options.transitions ?? [],
    });
    return mixed ?? this.#prepareCandidate(
      this.#tree,
      { transitions: options.transitions ?? [] },
      true,
      new Set(),
      new Set(),
    );
  }

  /** Prepare a store-only update to independent, leaf owner host regions. */
  #createCandidateLifecycle(
    spec: CandidateLifecycleSpec<H, Parent>,
  ): NativeRootCandidate<H, Parent> {
    const candidateStores = new Set(spec.stores.stores);
    for (const store of candidateStores) {
      this.#candidateStoreHolds.set(
        store,
        (this.#candidateStoreHolds.get(store) ?? 0) + 1,
      );
    }
    let storesReleased = false;
    const releaseStores = () => {
      if (storesReleased) return;
      storesReleased = true;
      this.#releaseCandidateStoreHolds(candidateStores);
    };
    let phase:
      | "prepared"
      | "host-committed"
      | "published"
      | "finished"
      | "discarded"
      | "failed" = "prepared";
    let released = false;
    let candidateHandle: NativeRootCandidate<H, Parent> | null = null;
    const pendingResources = [...spec.pendingResources];
    const release = (published: boolean) => {
      if (released) return;
      released = true;
      try {
        spec.releaseArtifacts(published);
      } finally {
        pendingResources.length = 0;
        candidateStores.clear();
        if (candidateHandle) {
          Object.defineProperty(candidateHandle, "pendingResources", {
            value: Object.freeze([]),
            enumerable: true,
            configurable: true,
          });
          candidateHandle.validate = closedCandidateValidate;
          candidateHandle.commitHost = closedCandidateAction;
          candidateHandle.publish = closedCandidateAction;
          candidateHandle.runEffects = closedCandidateAction;
          candidateHandle.discard = closedCandidateNoop;
          candidateHandle.failGroup = closedCandidateNoop;
          candidateHandle.retainStoreDependencies = closedCandidateLease;
        }
      }
    };
    const finishUnpublished = (next: "discarded" | "failed") => {
      phase = next;
      try {
        spec.discard();
      } finally {
        releaseStores();
        this.#preparedCandidates.delete(candidate);
        this.#releasePublicationBarrier(candidate);
        release(false);
      }
    };
    const candidate: NativeRootCandidate<H, Parent> = {
      rootId: this.#rootId,
      baseVersion: spec.baseVersion,
      targetVersion: spec.baseVersion + 1,
      stores: candidateStores,
      transitions: Object.freeze([...spec.transitions]),
      pendingResources: Object.freeze([...pendingResources]),
      blocked: spec.blocked,
      retainStoreDependencies: () => {
        if (this.#disposed || released) return () => {};
        return this.holdStoreDependencies(candidateStores);
      },
      validate: () =>
        phase === "prepared" && !released && !this.#disposed &&
        !this.#terminalHostFailed &&
        this.#publicationVersion === spec.baseVersion &&
        this.#vdom.version === spec.baseVDOMVersion &&
        spec.validatePrepared(),
      commitHost: () => {
        if (phase !== "prepared") throw new Error(`Candidate is ${phase}`);
        this.#assertNoPublicationBarrier("commit another candidate");
        if (!candidate.validate()) {
          finishUnpublished("discarded");
          throw new Error("Native root candidate is stale");
        }
        this.#publicationBarrier = candidate;
        try {
          this.#candidateHostCommit = true;
          spec.commitHost();
          if (phase !== "prepared" || this.#disposed || this.#disposing) {
            throw new Error(
              "Native root candidate was cancelled during host commit",
            );
          }
          phase = "host-committed";
        } catch (error) {
          phase = "failed";
          this.#terminalHostFailure ??= error;
          this.#terminalHostFailed = true;
          try {
            spec.discard();
          } finally {
            releaseStores();
            this.#preparedCandidates.delete(candidate);
            release(false);
            this.#releasePublicationBarrier(candidate);
          }
          throw error;
        } finally {
          this.#candidateHostCommit = false;
        }
      },
      publish: () => {
        if (phase !== "host-committed") {
          throw new Error(`Candidate is ${phase}`);
        }
        if (
          this.#disposed ||
          this.#publicationVersion !== spec.baseVersion ||
          this.#vdom.version !== spec.baseVDOMVersion + 1 ||
          !spec.validatePostHost()
        ) {
          const error = new Error(
            "Native root candidate became stale after host commit",
          );
          phase = "failed";
          this.#terminalHostFailure ??= error;
          this.#terminalHostFailed = true;
          try {
            spec.discard();
          } finally {
            releaseStores();
            this.#preparedCandidates.delete(candidate);
            release(false);
            this.#releasePublicationBarrier(candidate);
          }
          throw error;
        }
        try {
          spec.publish();
          releaseStores();
          phase = "published";
        } catch (error) {
          phase = "failed";
          this.#terminalHostFailure ??= error;
          this.#terminalHostFailed = true;
          try {
            spec.discard();
          } finally {
            releaseStores();
            this.#preparedCandidates.delete(candidate);
            release(false);
            this.#releasePublicationBarrier(candidate);
          }
          throw error;
        }
      },
      runEffects: () => {
        if (phase !== "published") throw new Error(`Candidate is ${phase}`);
        const errors: unknown[] = [];
        try {
          errors.push(...spec.runEffects());
        } catch (error) {
          errors.push(error);
          this.#terminalHostFailure ??= error;
          this.#terminalHostFailed = true;
          phase = "failed";
        } finally {
          if (phase === "published") phase = "finished";
          this.#preparedCandidates.delete(candidate);
          release(true);
          this.#releasePublicationBarrier(candidate);
        }
        if (errors.length) {
          throw new AggregateError(errors, spec.effectFailureMessage);
        }
      },
      discard: () => {
        if (
          phase === "published" || phase === "finished" ||
          phase === "discarded" || phase === "failed"
        ) return;
        if (phase === "host-committed") {
          throw new Error("Cannot discard a candidate after host commit");
        }
        finishUnpublished("discarded");
      },
      failGroup: (error) => {
        const wasPublished = phase === "published" || phase === "finished";
        phase = "failed";
        this.#terminalHostFailure ??= error;
        this.#terminalHostFailed = true;
        try {
          if (!wasPublished) spec.discard();
        } finally {
          if (!wasPublished) releaseStores();
          this.#preparedCandidates.delete(candidate);
          this.#releasePublicationBarrier(candidate);
          release(wasPublished);
        }
      },
    };
    candidateHandle = candidate;
    this.#preparedCandidates.add(candidate);
    return candidate;
  }

  #prepareSparseStoreCandidate(
    readerOwners: ReadonlySet<OwnerId>,
    capturedChanges: readonly import("./owner_state_world.ts").StateChange[],
    directOnlyOwners: ReadonlySet<OwnerId>,
    storeGenerationAtPrepare: number,
  ): NativeRootCandidate<H, Parent> | null {
    if (
      readerOwners.size === 0 || this.#everReadResource ||
      this.#everHadNativeBoundary || this.#pendingCollectionRegionKeys.size > 0
    ) return null;

    // Every non-reader state change must already have been approved as a
    // numeric host binding. Structural owners stay on the generic candidate.
    for (const change of capturedChanges) {
      if (
        !readerOwners.has(change.owner) &&
        !directOnlyOwners.has(change.owner)
      ) return null;
    }

    const readerCaches = new Map<OwnerId, ComponentCache>();
    const readerKeys = new Map<OwnerId, string>();
    for (const owner of readerOwners) {
      this.#count("store.sparse.eligibility-owner-visits");
      if (!this.world.isAlive(owner) || !this.#liveOwners.has(owner)) {
        return null;
      }
      this.#count("store.sparse.reader-cache-lookups");
      const cache = this.#componentCache.get(owner);
      if (!cache || cache.nativeBoundary || cache.subtreeOwners.size !== 1) {
        return null;
      }
      const metadata = (cache.type as SiteComponent<unknown> & {
        [componentMetadata]?: ComponentMetadata;
      })[componentMetadata];
      if (metadata?.hostLeafOutput !== true) return null;
      if (
        hasNestedComponent(
          cache.result,
          () => this.#count("store.sparse.eligibility-tree-node-visits"),
        )
      ) return null;
      const hostKey = singleHostRootKey(
        cache.expandedResult,
        () => this.#count("store.sparse.eligibility-tree-node-visits"),
      );
      if (hostKey === null) return null;
      readerCaches.set(owner, cache);
      readerKeys.set(owner, hostKey);
    }

    const baseVersion = this.#publicationVersion;
    const baseVDOMVersion = this.#vdom.version;
    const candidateChanges = [...capturedChanges];
    const preparation = this.world.beginPreparation();
    const stores = new StoreRenderTransaction(this.#rootId);
    let resourceReads: ResourceReadSet | null = new ResourceReadSet(
      this.#resourceTable,
    );
    const cachePatches = new Map<OwnerId, ComponentCache>();
    const ancestorPatches = new Map<OwnerId, ComponentCache>();
    const capturedBindings: Array<{
      binding: BoundValue<unknown>;
      sources: ScalarSource[];
      owner: OwnerId;
      sites: readonly string[];
    }> = [];
    const numericWrites: CandidateNumericWrite[] = [];
    const numericSources = new Set<ScalarSource>();
    for (const change of candidateChanges) {
      if (!directOnlyOwners.has(change.owner)) continue;
      if (!this.world.isAlive(change.owner)) continue;
      const source = this.world.scalarSource(change.owner, change.site);
      const previous = source ? this.#lastSourceValues.get(source) : undefined;
      if (!source || previous === undefined || numericSources.has(source)) {
        continue;
      }
      numericSources.add(source);
      numericWrites.push({
        owner: change.owner,
        site: change.site,
        source,
        version: this.world.version(change.owner, change.site),
        previous,
        current: source.value,
      });
    }
    const validateNumericWrites = () =>
      numericWrites.every((write) =>
        this.world.isAlive(write.owner) &&
        this.world.version(write.owner, write.site) === write.version &&
        this.world.scalarSource(write.owner, write.site) === write.source &&
        Object.is(write.source.value, write.current)
      );

    let resourceWasRead = false;
    let preparedHost: PreparedVDOMCommit | null = null;
    let preparationFailed = false;
    try {
      const regions: Array<{ key: string; tree: RuntimeNode }> = [];
      for (const owner of readerOwners) {
        const cached = readerCaches.get(owner)!;
        this.#count("owner.component-visits");
        const prepared = this.#prepareOwnerRender(owner, {
          preparation,
          stores,
          resourceReads,
          onResourceRead: () => resourceWasRead = true,
          captureBinding: (binding, sources, bindingOwner, sites) => {
            capturedBindings.push({
              binding,
              sources,
              owner: bindingOwner,
              sites,
            });
          },
          onOutputNode: () =>
            this.#count("store.sparse.output-tree-node-visits"),
        });
        if (!prepared || resourceWasRead) {
          preparationFailed = true;
          break;
        }
        const result = prepared.result;
        if (
          hasNestedComponent(
            result,
            () => this.#count("store.sparse.output-tree-node-visits"),
          ) ||
          singleHostRootKey(
              result,
              () => this.#count("store.sparse.output-tree-node-visits"),
            ) !== readerKeys.get(owner)
        ) {
          preparationFailed = true;
          break;
        }
        cachePatches.set(owner, {
          ...cached,
          result,
          expandedResult: result,
          ownEffects: prepared.ownEffects,
          propBoundSites: prepared.propBoundSites,
        });
        regions.push({ key: readerKeys.get(owner)!, tree: result });
        this.#count("store.sparse.reader-owner-renders");
        for (const ancestor of this.world.ownerLineage(owner).slice(1)) {
          this.#count("store.sparse.ancestor-owner-visits");
          if (ancestorPatches.has(ancestor)) continue;
          const ancestorCache = this.#componentCache.get(ancestor);
          if (!ancestorCache || ancestorCache.invalidatedBySparseStore) {
            continue;
          }
          ancestorPatches.set(ancestor, {
            ...ancestorCache,
            expandedResult: null,
            invalidatedBySparseStore: true,
          });
        }
      }
      if (preparationFailed || resourceWasRead) {
        throw new SparseCandidateIneligible();
      }
      preparedHost = this.#vdom.prepareKeyedRegions(regions);
      if (!preparedHost) throw new SparseCandidateIneligible();
    } catch (error) {
      preparation.discard();
      stores.discard();
      resourceReads?.discard();
      resourceReads = null;
      this.#discardUncommittedStoreRoots(stores);
      preparedHost = null;
      cachePatches.clear();
      ancestorPatches.clear();
      capturedBindings.length = 0;
      numericWrites.length = 0;
      readerCaches.clear();
      readerKeys.clear();
      candidateChanges.length = 0;
      if (
        resourceWasRead || preparationFailed ||
        error instanceof SparseCandidateIneligible
      ) {
        return null;
      }
      throw error;
    }

    return this.#createCandidateLifecycle({
      baseVersion,
      baseVDOMVersion,
      stores,
      transitions: [],
      pendingResources: [],
      blocked: false,
      validatePrepared: () =>
        this.#storeNotificationGeneration === storeGenerationAtPrepare &&
        preparation.validate() && !preparation.hasStateWrites() &&
        stores.validate() && validateNumericWrites() &&
        (resourceReads?.validate() ?? false),
      validatePostHost: () =>
        preparation.validate() && !preparation.hasStateWrites() &&
        stores.validate() && validateNumericWrites() &&
        this.#storeNotificationGeneration === storeGenerationAtPrepare &&
        (resourceReads?.validate() ?? false),
      commitHost: () => {
        for (const item of capturedBindings) {
          const canonical = item.sites.map((site, index) =>
            this.world.isAlive(item.owner)
              ? this.world.scalarSource(item.owner, site) ?? item.sources[index]
              : item.sources[index]
          );
          const mutable = item.binding.sources as ScalarSource[] | undefined;
          if (mutable) {
            for (let index = 0; index < canonical.length; index++) {
              mutable[index] = canonical[index];
            }
          }
          (item.binding as { source: ScalarSource }).source = canonical[0];
        }
        preparedHost!.commit();
        preparedHost = null;
        this.#applyCandidateNumericWrites(numericWrites);
      },
      publish: () => {
        preparation.publish();
        stores.commitAfterValidatedRender();
        this.#syncStoreReaders(stores, true);
        for (const [owner, cache] of cachePatches) {
          this.#count("store.sparse.cache-patch-writes");
          this.#componentCache.set(owner, cache);
        }
        for (const owner of cachePatches.keys()) {
          this.#refreshDirectKeyedRegionOutput(owner, true);
        }
        for (const [owner, cache] of ancestorPatches) {
          this.#count("store.sparse.ancestor-marker-writes");
          this.#componentCache.set(owner, cache);
        }
        for (const [owner, cache] of cachePatches) {
          this.#count("store.sparse.source-history-owner-visits");
          const previous = readerCaches.get(owner)!;
          this.#syncOwnerSourceValues(owner, previous, cache.propBoundSites);
        }
        for (const write of numericWrites) {
          if (
            this.world.isAlive(write.owner) &&
            this.world.scalarSource(write.owner, write.site) === write.source
          ) {
            if (this.#vdom.hasBoundSource(write.source)) {
              this.#lastSourceValues.set(write.source, write.current);
            } else {
              this.#lastSourceValues.delete(write.source);
            }
          }
        }
        resourceReads?.discard();
        resourceReads = null;
        this.#committedStoreNotificationGeneration = storeGenerationAtPrepare;
        this.world.clearChangesThrough(candidateChanges);
        this.#pendingChanges.clearThrough(candidateChanges);
        this.#publicationVersion++;
      },
      runEffects: () => {
        const errors: unknown[] = [];
        for (const [owner, cache] of cachePatches) {
          this.#count("store.sparse.effect-owner-visits");
          errors.push(...this.#reconcileOwnerEffects(owner, cache.ownEffects));
        }
        return errors;
      },
      discard: () => {
        preparation.discard();
        stores.discard();
        resourceReads?.discard();
        resourceReads = null;
      },
      releaseArtifacts: () => {
        resourceReads?.discard();
        resourceReads = null;
        cachePatches.clear();
        ancestorPatches.clear();
        readerCaches.clear();
        readerKeys.clear();
        candidateChanges.length = 0;
        capturedBindings.length = 0;
        numericWrites.length = 0;
        preparedHost = null;
      },
      effectFailureMessage:
        "Component effects failed after sparse store candidate publication",
    });
  }

  #prepareCandidate(
    tree: RuntimeNode,
    options: {
      readonly transitions?: readonly string[];
      readonly autoRetryResources?: boolean;
    },
    forceRender: boolean,
    dirtyOwners: Set<OwnerId>,
    relevantOwners: Set<OwnerId>,
    numericChanges: readonly import("./owner_state_world.ts").StateChange[] =
      [],
  ): NativeRootCandidate<H, Parent> {
    this.#assertActive();
    this.#assertNoPublicationBarrier("prepare");
    if (this.#terminalHostFailed) {
      throw new Error("Component root is terminal after a host commit failure");
    }
    const baseVersion = this.#publicationVersion;
    const baseVDOMVersion = this.#vdom.version;
    const storeGenerationAtPrepare = this.#storeNotificationGeneration;
    const capturedChanges = this.#pendingChanges.capture();
    // A direct writer's owner is deliberately reused by this candidate, so
    // OwnerPreparation cannot validate its state version for us. Capture the
    // source and version anew for every candidate attempt instead.
    const numericWrites: CandidateNumericWrite[] = [];
    const numericSources = new Set<ScalarSource>();
    for (const change of numericChanges) {
      if (!this.world.isAlive(change.owner)) continue;
      const source = this.world.scalarSource(change.owner, change.site);
      const previous = source ? this.#lastSourceValues.get(source) : undefined;
      if (!source || previous === undefined || numericSources.has(source)) {
        continue;
      }
      numericSources.add(source);
      numericWrites.push({
        owner: change.owner,
        site: change.site,
        source,
        version: this.world.version(change.owner, change.site),
        previous,
        current: source.value,
      });
    }
    const validateNumericWrites = () =>
      numericWrites.every((write) =>
        this.world.isAlive(write.owner) &&
        this.world.version(write.owner, write.site) === write.version &&
        this.world.scalarSource(write.owner, write.site) === write.source &&
        Object.is(write.source.value, write.current)
      );
    const preparation = this.world.beginPreparation();
    const stores = new StoreRenderTransaction(this.#rootId, {
      transitions: options.transitions,
    });
    let resourceReads: ResourceReadSet | null = new ResourceReadSet(
      this.#resourceTable,
    );
    const expansionJournal: ExpansionJournal | undefined = undefined;
    const nextBoundaryPrimaries = new Map(this.#boundaryPrimaries);
    const boundaryState: BoundaryRenderState = {
      blocked: false,
      visited: new Set(),
    };
    const nextOwners = new Set<OwnerId>();
    const nextEffects = new Map<string, EffectRegistration>();
    const nextCache = new Map<OwnerId, ComponentCache>();
    const createdOwners: OwnerId[] = [];
    const keyedRegions = new Map<OwnerId, KeyedRegionCache>();
    const collectionRegions = new Map<string, CollectionRegionCache>();
    const capturedBindings: Array<{
      binding: BoundValue<unknown>;
      sources: ScalarSource[];
      owner: OwnerId;
      sites: readonly string[];
    }> = [];
    let expanded: RuntimeNode;
    let preparedHost:
      | ReturnType<VDOMSnapshotRoot<H, Parent>["prepareCommit"]>
      | null = null;
    const priorKeyed = this.#collectedKeyedRegions;
    const priorCollections = this.#collectedCollectionRegions;
    this.#collectedKeyedRegions = keyedRegions;
    this.#collectedCollectionRegions = collectionRegions;
    try {
      expanded = this.#expand(
        tree,
        this.#rootOwner,
        nextOwners,
        nextEffects,
        nextCache,
        createdOwners,
        "root",
        forceRender,
        dirtyOwners,
        relevantOwners,
        [],
        new Map(),
        stores,
        undefined,
        undefined,
        preparation,
        (binding, sources, owner, sites) =>
          capturedBindings.push({ binding, sources, owner, sites }),
        resourceReads!,
        expansionJournal,
        nextBoundaryPrimaries,
        boundaryState,
      );
      for (const key of nextBoundaryPrimaries.keys()) {
        if (!boundaryState.visited.has(key)) nextBoundaryPrimaries.delete(key);
      }
      // Tagged scalar bindings already carry the property/source contract.
      // Select direct writers from the first native commit, including empty
      // collections whose first bound row is inserted later through a delta.
      // The VDOM retains whole-style fallback when the host lacks field writes.
      preparedHost = this.#vdom.prepareCommit(expanded, null, true);
      expanded = null;
    } catch (error) {
      preparation.discard();
      stores.discard();
      resourceReads?.discard();
      resourceReads = null;
      this.#discardUncommittedStoreRoots(stores);
      throw error;
    } finally {
      this.#collectedKeyedRegions = priorKeyed;
      this.#collectedCollectionRegions = priorCollections;
    }
    const candidatePendingResources = [...resourceReads!.pending];
    const ownerIds = new Set(nextOwners);
    const previousOwners = new Set(this.#liveOwners);
    const artifacts = {
      preparation: preparation as OwnerPreparation | null,
      stores: stores as StoreRenderTransaction | null,
      preparedHost: preparedHost as
        | ReturnType<VDOMSnapshotRoot<H, Parent>["prepareCommit"]>
        | null,
      tree: { value: tree as RuntimeNode | null } as {
        value: RuntimeNode | null;
      } | null,
      nextCache: nextCache as Map<OwnerId, ComponentCache> | null,
      nextEffects: nextEffects as Map<string, EffectRegistration> | null,
      nextOwners: nextOwners as Set<OwnerId> | null,
      ownerIds: ownerIds as Set<OwnerId> | null,
      previousOwners: previousOwners as Set<OwnerId> | null,
      keyedRegions: keyedRegions as Map<OwnerId, KeyedRegionCache> | null,
      collectionRegions: collectionRegions as
        | Map<string, CollectionRegionCache>
        | null,
      capturedBindings: capturedBindings as typeof capturedBindings | null,
      capturedChanges: capturedChanges as typeof capturedChanges | null,
      numericWrites: numericWrites as CandidateNumericWrite[] | null,
    };
    let artifactsReleased = false;
    const releaseCandidateArtifacts = (published: boolean) => {
      if (artifactsReleased) return;
      artifactsReleased = true;
      resourceReads?.discard();
      resourceReads = null;
      candidatePendingResources.length = 0;
      artifacts.preparation = null;
      artifacts.stores = null;
      artifacts.preparedHost = null;
      artifacts.tree = null;
      if (!published) artifacts.nextCache?.clear();
      artifacts.nextCache = null;
      artifacts.nextEffects?.clear();
      artifacts.nextEffects = null;
      artifacts.nextOwners?.clear();
      artifacts.nextOwners = null;
      artifacts.ownerIds?.clear();
      artifacts.ownerIds = null;
      artifacts.previousOwners?.clear();
      artifacts.previousOwners = null;
      artifacts.keyedRegions?.clear();
      artifacts.keyedRegions = null;
      artifacts.collectionRegions?.clear();
      artifacts.collectionRegions = null;
      artifacts.capturedBindings?.splice(0);
      artifacts.capturedBindings = null;
      artifacts.capturedChanges?.splice(0);
      artifacts.capturedChanges = null;
      artifacts.numericWrites?.splice(0);
      artifacts.numericWrites = null;
      if (!published) nextBoundaryPrimaries.clear();
      // Candidate methods share this preparation scope. Clear large source
      // objects as well as their explicit artifact holders on every terminal path.
      tree = null;
      expanded = null;
      preparedHost = null;
    };
    const validatesCollections = () =>
      [...(artifacts.keyedRegions?.values() ?? [])].every((region) =>
        !region.collection ||
        region.collection.collection.version ===
          region.collection.snapshotVersion
      ) && [...(artifacts.collectionRegions?.values() ?? [])].every((region) =>
        region.collection.version === region.snapshotVersion
      );
    return this.#createCandidateLifecycle({
      baseVersion,
      baseVDOMVersion,
      stores,
      transitions: options.transitions ?? [],
      pendingResources: candidatePendingResources,
      blocked: boundaryState.blocked,
      validatePrepared: () =>
        artifacts.preparation !== null && artifacts.preparation.validate() &&
        !artifacts.preparation.hasStateWrites() &&
        artifacts.stores !== null && artifacts.stores.validate() &&
        validateNumericWrites() &&
        (resourceReads?.validate() ?? false) &&
        !boundaryState.blocked && validatesCollections(),
      validatePostHost: () =>
        artifacts.preparation !== null && artifacts.preparation.validate() &&
        !artifacts.preparation.hasStateWrites() &&
        artifacts.stores !== null && artifacts.stores.validate() &&
        validateNumericWrites() &&
        (resourceReads?.validate() ?? false) &&
        !boundaryState.blocked && validatesCollections(),
      commitHost: () => {
        for (const item of artifacts.capturedBindings ?? []) {
          const canonical = item.sites.map((site, index) =>
            this.world.isAlive(item.owner)
              ? this.world.scalarSource(item.owner, site) ?? item.sources[index]
              : item.sources[index]
          );
          const mutable = item.binding.sources as ScalarSource[] | undefined;
          if (mutable) {
            for (let index = 0; index < canonical.length; index++) {
              mutable[index] = canonical[index];
            }
          }
          (item.binding as { source: ScalarSource }).source = canonical[0];
        }
        artifacts.preparedHost!.commit();
        artifacts.preparedHost = null;
        this.#applyCandidateNumericWrites(artifacts.numericWrites ?? []);
      },
      publish: () => {
        artifacts.preparation!.publish();
        artifacts.stores!.commitAfterValidatedRender();
        this.#tree = artifacts.tree!.value;
        this.#liveOwners = new Set(artifacts.ownerIds!);
        this.#componentCache = artifacts.nextCache!;
        this.#syncStoreReaders(artifacts.stores!);
        this.#boundaryPrimaries = nextBoundaryPrimaries;
        if (options.autoRetryResources !== false) {
          this.#syncResourceSubscriptions(candidatePendingResources);
        }
        resourceReads?.discard();
        resourceReads = null;
        this.#syncCollectionRegions(
          artifacts.nextCache!,
          artifacts.collectionRegions!,
        );
        this.#syncLastSourceValues(artifacts.nextCache!);
        if (this.#storeNotificationGeneration === storeGenerationAtPrepare) {
          this.#committedStoreNotificationGeneration = storeGenerationAtPrepare;
        }
        this.world.clearChangesThrough(capturedChanges);
        this.#pendingChanges.clearThrough(capturedChanges);
        this.#publicationVersion++;
      },
      runEffects: () => {
        if (this.#disposed) return [];
        const errors: unknown[] = [];
        errors.push(...this.#reconcileEffects(artifacts.nextEffects!));
        for (const previous of artifacts.previousOwners ?? []) {
          if (artifacts.ownerIds?.has(previous)) continue;
          this.world.destroyOwner(previous);
          this.#dropPendingForOwner(previous);
        }
        return errors;
      },
      discard: () => {
        artifacts.preparation?.discard();
        artifacts.stores?.discard();
        resourceReads?.discard();
        resourceReads = null;
      },
      releaseArtifacts: releaseCandidateArtifacts,
      effectFailureMessage:
        "Component effects failed after candidate publication",
    });
  }

  /** Stable identifier used when coordinating transitions across native roots. */
  get rootId() {
    return this.#rootId;
  }

  onDispose(listener: () => void): () => void {
    if (typeof listener !== "function") {
      throw new Error("Dispose listener must be a function");
    }
    if (this.#disposed) {
      listener();
      return () => {};
    }
    this.#disposeListeners.add(listener);
    return () => this.#disposeListeners.delete(listener);
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

  diagnostics() {
    return {
      version: this.version,
      ownerCount: this.#liveOwners.size,
      pendingChangeCount: this.#pendingChanges.size,
      sourceValueSyncVisits: this.#sourceValueSyncVisits,
      disposed: this.#disposed,
    };
  }

  mount(tree: RuntimeNode) {
    this.#assertActive();
    this.#assertNoPublicationBarrier("mount");
    if (this.version !== 0) {
      throw new Error("ComponentStateRoot is already mounted");
    }
    this.#renderAndCommit(tree, true);
  }

  /** Commit one batched owner/site update; return false when there is no work. */
  flush(): boolean {
    this.#assertActive();
    // A host writer may synchronously call flush after a setter. Keep this
    // route's reusable capture buffers owned by the outer frame until it
    // finishes; the outer acknowledgement will schedule the newer version.
    if (this.#nativeCellCutActive) {
      this.#scheduled = false;
      this.#deferredFlush = true;
      return false;
    }
    if (this.#publicationBarrier) {
      this.#deferredFlush = true;
      this.#scheduled = false;
      return false;
    }
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
    const resourceRetry = this.#pendingResourceRetry;
    this.#pendingResourceRetry = false;
    const storeGeneration = this.#storeNotificationGeneration;
    const storeChangePending =
      storeGeneration !== this.#committedStoreNotificationGeneration;
    if (
      this.#pendingChanges.size === 0 && !storeChangePending &&
      this.#pendingCollectionRegionKeys.size === 0 && !resourceRetry
    ) {
      return false;
    }
    if (
      resourceRetry && this.#pendingChanges.size === 0 && !storeChangePending &&
      this.#pendingCollectionRegionKeys.size === 0
    ) {
      this.#renderAndCommit(this.#tree, true);
      reportFlush();
      return true;
    }
    this.#activeCounters = this.#profileCounter ? new Map() : undefined;
    if (
      !resourceRetry && !storeChangePending &&
      this.#pendingCollectionRegionKeys.size === 0 &&
      this.#pendingChanges.size > 0 &&
      this.#tryFlushNativeCellCut()
    ) {
      reportFlush();
      return true;
    }
    const capturedChanges = this.#pendingChanges.capture();
    if (resourceRetry) {
      this.#renderAndCommit(this.#tree, true);
      this.#finishChanges(capturedChanges);
      reportFlush();
      return true;
    }
    if (
      this.#pendingCollectionRegionKeys.size > 0 &&
      (capturedChanges.length > 0 || storeChangePending)
    ) {
      const mixed = this.#prepareMixedCollectionCandidate(capturedChanges, {
        storeGeneration,
        transitions: [],
      });
      if (mixed) {
        if (mixed.validate()) {
          mixed.commitHost();
          mixed.publish();
          mixed.runEffects();
          reportFlush();
          return true;
        }
        mixed.discard();
        this.#count("collection.mixed.stale-fallbacks");
      }
    }
    if (
      capturedChanges.length === 0 && !storeChangePending &&
      this.#pendingCollectionRegionKeys.size > 0
    ) {
      const delta = this.#flushCollectionDelta();
      if (delta) {
        reportFlush();
        return true;
      }
      this.#profile?.("collection.delta.fallback-candidate", 0);
    }
    if (
      capturedChanges.length === 0 && !storeChangePending &&
      this.#pendingCollectionRegionKeys.size === 0
    ) return false;
    const dirtyOwners = new Set(capturedChanges.map((change) => change.owner));
    if (this.#invalidation) {
      const graphMappedOwners: OwnerId[] = [];
      for (const change of capturedChanges) {
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
    const directOnlyOwners = new Set<OwnerId>();
    const ownerEligibility = new Map<OwnerId, boolean>();
    for (const change of capturedChanges) {
      const cache = this.#componentCache.get(change.owner);
      const approvedSites = cache
        ? this.#compiledPropSitesForCache(cache)
        : undefined;
      const source = this.world.scalarSourceForChange(change);
      const approved = !!cache &&
        !!approvedSites?.has(change.site) && !!source &&
        this.#lastSourceValues.has(source);
      ownerEligibility.set(
        change.owner,
        (ownerEligibility.get(change.owner) ?? true) && approved,
      );
    }
    for (const [owner, eligible] of ownerEligibility) {
      if (eligible) {
        directOnlyOwners.add(owner);
        // A compiler-approved prop sink is itself a valid dependency even if
        // an optional component invalidation graph omits its state site.
        dirtyOwners.add(owner);
      }
    }
    const initialDirtyOwnerIds = [...dirtyOwners];
    this.#profile?.(
      `dispatch.diagnostic.dirty-owner-count.${initialDirtyOwnerIds.length}`,
      0,
    );
    this.#profile?.(
      `dispatch.diagnostic.change-count.${capturedChanges.length}`,
      0,
    );
    if (initialDirtyOwnerIds.length !== 1) {
      this.#profile?.("dispatch.structural-gate.owner-count-not-one", 0);
    } else if (capturedChanges.length !== 1) {
      this.#profile?.("dispatch.structural-gate.change-count-not-one", 0);
    }
    const numericOnly = capturedChanges.length > 0 &&
      directOnlyOwners.size === dirtyOwners.size;
    let succeeded = false;
    if (
      numericOnly && !storeChangePending &&
      this.#pendingCollectionRegionKeys.size === 0
    ) {
      succeeded = this.#flushNumericSources(capturedChanges);
    }
    if (succeeded) {
      this.#finishChanges(capturedChanges);
      reportFlush();
      return true;
    }
    // Reader/collection cache scans stay off the numeric-only fast path.
    const storeReaderOwners = new Set<OwnerId>();
    let hasSuspendedStoreReader = false;
    let missingStoreReaderOwner = false;
    for (const readerId of this.#liveStoreReaders.keys()) {
      this.#count("store.sparse.live-reader-selection-visits");
      if (readerId.startsWith("\u0000suspense-pending:")) {
        hasSuspendedStoreReader = true;
        continue;
      }
      const separator = readerId.indexOf("\u0000");
      if (separator <= 0) {
        hasSuspendedStoreReader = true;
        continue;
      }
      const owner = Number(readerId.slice(0, separator));
      if (!Number.isSafeInteger(owner)) {
        hasSuspendedStoreReader = true;
        continue;
      }
      storeReaderOwners.add(owner);
      if (!this.#componentCache.has(owner)) missingStoreReaderOwner = true;
    }
    const collectionParentOwners = new Set<OwnerId>();
    let missingCollectionParent = false;
    for (const regionKey of this.#pendingCollectionRegionKeys) {
      const region = this.#liveCollectionRegions.get(regionKey);
      if (!region || !this.#componentCache.has(region.parentOwner)) {
        missingCollectionParent = true;
        continue;
      }
      collectionParentOwners.add(region.parentOwner);
      dirtyOwners.add(region.parentOwner);
    }
    for (const owner of storeReaderOwners) dirtyOwners.add(owner);
    this.#count("store.reader-owners-selected", storeReaderOwners.size);
    this.#count(
      "collection.parent-owners-selected",
      collectionParentOwners.size,
    );
    // Store selector history and subscription footprints are transaction
    // scoped. Re-execute every live store-reader owner on selective candidates
    // so readers with unchanged sources are retained and switched sources are
    // detached atomically with publication.
    if (
      this.#everReadResource || this.#everHadNativeBoundary ||
      hasSuspendedStoreReader ||
      missingCollectionParent || missingStoreReaderOwner
    ) {
      this.#renderAndCommit(this.#tree, true);
      this.#finishChanges(capturedChanges);
      reportFlush();
      return true;
    }
    const sparseChangesAreSafe = capturedChanges.every((change) =>
      storeReaderOwners.has(change.owner) || directOnlyOwners.has(change.owner)
    );
    const sparseReaderStateChange = capturedChanges.some((change) =>
      storeReaderOwners.has(change.owner) && !directOnlyOwners.has(change.owner)
    );
    if (
      (storeChangePending || sparseReaderStateChange) && sparseChangesAreSafe &&
      this.#pendingCollectionRegionKeys.size === 0
    ) {
      const sparseCandidate = this.#prepareSparseStoreCandidate(
        storeReaderOwners,
        capturedChanges,
        directOnlyOwners,
        storeGeneration,
      );
      if (sparseCandidate) {
        if (sparseCandidate.validate()) {
          sparseCandidate.commitHost();
          sparseCandidate.publish();
          sparseCandidate.runEffects();
          this.#finishChanges(capturedChanges);
          reportFlush();
          return true;
        }
        sparseCandidate.discard();
        this.#count("store.sparse.stale-fallbacks");
      }
      this.#count("store.sparse.generic-fallbacks");
      if (this.#everReadResource || this.#everHadNativeBoundary) {
        this.#renderAndCommit(this.#tree, true);
        this.#finishChanges(capturedChanges);
        reportFlush();
        return true;
      }
    }
    const relevantOwners = new Set<OwnerId>();
    const addRelevantLineage = (owners: Iterable<OwnerId>) => {
      for (const owner of owners) {
        for (const ancestor of this.world.ownerLineage(owner)) {
          relevantOwners.add(ancestor);
        }
      }
    };
    addRelevantLineage(dirtyOwners);
    // In a mixed batch, the generic candidate carries the latest numeric
    // bindings. Keep direct-only owners cached so they are not re-executed;
    // host writes happen only as part of the successful VDOM commit.
    if (directOnlyOwners.size > 0) {
      for (const owner of directOnlyOwners) {
        if (
          !storeReaderOwners.has(owner) &&
          !collectionParentOwners.has(owner)
        ) dirtyOwners.delete(owner);
      }
      relevantOwners.clear();
      addRelevantLineage(dirtyOwners);
    }
    const dirtyOwnerIds = [...dirtyOwners];
    const hasSelectiveOwnerCandidate = collectionParentOwners.size > 0 ||
      this.#liveStoreSubscriptions.size > 0 || storeChangePending;
    const partialCommit = !hasSelectiveOwnerCandidate &&
        dirtyOwnerIds.length === 1 && capturedChanges.length === 1
      ? this.#tryPartialOwnerCommit(dirtyOwnerIds[0])
      : !hasSelectiveOwnerCandidate && dirtyOwnerIds.length > 0 &&
          directOnlyOwners.size === 0
      ? this.#tryPartialOwnerCommits(dirtyOwnerIds)
      : false;
    if (partialCommit) {
      this.#profile?.("dispatch.path.partial-owner", 0);
      this.#finishChanges(capturedChanges);
      reportFlush();
      return true;
    }
    const structuralCommit = !hasSelectiveOwnerCandidate &&
        dirtyOwnerIds.length === 1 && capturedChanges.length === 1 &&
        directOnlyOwners.size === 0
      ? this.#tryStructuralOwnerCommit(dirtyOwnerIds[0])
      : false;
    if (structuralCommit) {
      this.#profile?.("dispatch.path.structural-owner", 0);
      this.#finishChanges(capturedChanges);
      reportFlush();
      return true;
    }
    this.#profile?.("dispatch.path.full-reconcile", 0);
    try {
      this.#renderAndCommit(
        this.#tree,
        false,
        dirtyOwners,
        relevantOwners,
        0,
        directOnlyOwners.size > 0
          ? capturedChanges.filter((change) =>
            directOnlyOwners.has(change.owner)
          )
          : [],
      );
      succeeded = true;
    } finally {
      this.#preparedRenders.clear();
    }
    if (succeeded) this.#finishChanges(capturedChanges);
    else this.#schedule();
    reportFlush();
    return true;
  }

  /** Replace the declarative tree while preserving component owners by site/key. */
  update(tree: RuntimeNode) {
    this.#assertActive();
    this.#assertNoPublicationBarrier("update");
    const captured = this.#pendingChanges.capture();
    this.#renderAndCommit(tree, true);
    this.#finishChanges(captured);
  }

  render(tree: RuntimeNode) {
    this.update(tree);
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposing = true;
    for (const candidate of [...this.#preparedCandidates]) {
      candidate.failGroup(
        new Error("Component root disposed during candidate preparation"),
      );
    }
    this.#disposed = true;
    this.#disposing = false;
    this.#deferredFlush = false;
    const disposeErrors: unknown[] = [];
    for (const listener of this.#disposeListeners) {
      try {
        listener();
      } catch (error) {
        disposeErrors.push(error);
      }
    }
    this.#disposeListeners.clear();
    this.#unsubscribe();
    this.#scheduled = false;
    this.#pendingChanges.clear();
    this.#lastSourceValues.clear();
    this.#nativeLanePrograms = new WeakMap();
    if (!this.#nativeCellCutActive) {
      this.#clearNumericProgramBuffers();
      this.#numericProgramSources.length = 0;
      this.#numericProgramCurrentValues.length = 0;
      this.#numericProgramPreviousValues.length = 0;
    }
    if (!this.#nativeCellCutActive) {
      this.#clearNativeCellCutBuffers();
      this.#nativeCellHandles.length = 0;
      this.#nativeCellVersions.length = 0;
      this.#nativeLaneTokens.length = 0;
    }
    try {
      this.#vdom.dispose();
    } catch (error) {
      disposeErrors.push(error);
    }
    const subscribedStores = [...this.#liveStoreSubscriptions.keys()];
    for (const unsubscribe of this.#liveStoreSubscriptions.values()) {
      unsubscribe();
    }
    this.#liveStoreSubscriptions.clear();
    for (const stores of this.#storeDependencyLeases.values()) stores.clear();
    this.#storeDependencyLeases.clear();
    for (const unsubscribe of this.#liveResourceSubscriptions.values()) {
      unsubscribe();
    }
    this.#liveResourceSubscriptions.clear();
    this.#boundaryPrimaries.clear();
    for (const [readerId, stores] of this.#liveStoreReaders) {
      for (const store of stores) store.forgetReader(this.#rootId, readerId);
    }
    this.#liveStoreReaders.clear();
    for (const store of subscribedStores) {
      store.detachRoot(this.#rootId);
    }
    const effectErrors = [
      ...disposeErrors,
      ...this.#cleanupEffects(this.#liveEffects.values()),
    ];
    this.#liveEffects.clear();
    this.#liveEffectKeysByOwner.clear();
    for (const owner of this.#liveOwners) this.world.destroyOwner(owner);
    this.#liveOwners.clear();
    this.#componentCache.clear();
    for (const region of this.#liveCollectionRegions.values()) {
      region.unsubscribe?.();
      region.reader?.detach();
    }
    this.#liveCollectionRegions.clear();
    this.#pendingCollectionRegionKeys.clear();
    this.#collectionSnapshotFallbackKeys.clear();
    this.world.destroyOwner(this.#rootOwner);
    this.world.releaseRootId(this.#rootId, this.#rootOwner);
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
    collectionRetry = 0,
    numericChanges: readonly import("./owner_state_world.ts").StateChange[] =
      [],
  ): void {
    try {
      const candidate = this.#prepareCandidate(
        tree,
        {},
        forceRender,
        dirtyOwners,
        relevantOwners,
        numericChanges,
      );
      if (candidate.blocked) {
        const pending = [...candidate.pendingResources];
        this.#syncResourceSubscriptions(pending);
        candidate.discard();
        return;
      }
      if (!candidate.validate()) {
        candidate.discard();
        if (collectionRetry < 2) {
          return this.#renderAndCommit(
            tree,
            forceRender,
            dirtyOwners,
            relevantOwners,
            collectionRetry + 1,
            numericChanges,
          );
        }
        this.#schedule();
        return;
      }
      candidate.commitHost();
      candidate.publish();
      candidate.runEffects();
    } catch (error) {
      if (error instanceof StaleCollectionCandidate && collectionRetry < 2) {
        return this.#renderAndCommit(
          tree,
          forceRender,
          dirtyOwners,
          relevantOwners,
          collectionRetry + 1,
          numericChanges,
        );
      }
      throw error;
    }
  }
  #preparePartialOwnerRender(owner: OwnerId): PreparedRender | null {
    return this.#prepareOwnerRender(owner);
  }

  #prepareOwnerRender(
    owner: OwnerId,
    options: {
      readonly preparation?: OwnerPreparation;
      readonly stores?: StoreRenderTransaction;
      readonly resourceReads?: ResourceReadSet;
      readonly captureBinding?: ActiveOwner["captureBinding"];
      readonly onResourceRead?: () => void;
      readonly onOutputNode?: () => void;
    } = {},
  ): PreparedRender | null {
    const cached = this.#componentCache.get(owner);
    if (!cached) return null;

    const ownEffects = new Map<string, EffectRegistration>();
    const propBoundSites = new Set<string>();
    const ownsStoreTransaction = options.stores === undefined;
    const storeTransaction = options.stores ??
      new StoreRenderTransaction(this.#rootId);
    let result: RuntimeNode;
    const activeOwner: ActiveOwner = {
      world: options.preparation ?? this.world,
      owner,
      stateLayout: compiledStateLayoutFor(cached.type),
      propBoundSites,
      readStore: (siteId, source) =>
        storeTransaction.read(source, `${owner}\u0000${siteId}`),
      ...(options.resourceReads
        ? {
          readResource: <T>(
            source: AsyncResource<T> | PromiseLike<T>,
          ): Awaited<T> => {
            options.onResourceRead?.();
            this.#everReadResource = true;
            return options.resourceReads!.read(source);
          },
        }
        : {}),
      ...(options.captureBinding
        ? { captureBinding: options.captureBinding }
        : {}),
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
    };
    activeOwners.push(activeOwner);
    const renderStarted = this.#profile ? performance.now() : 0;
    if (this.#activeCounters) this.#count("owner.component-renders");
    try {
      result = (cached.type as (props: Record<string, unknown>) => RuntimeNode)(
        cached.props,
      );
    } catch (error) {
      if (ownsStoreTransaction) {
        storeTransaction.discard();
        this.#discardUncommittedStoreRoots(storeTransaction);
      }
      throw error;
    } finally {
      activeOwners.pop();
    }
    if (ownsStoreTransaction && storeTransaction.stores.size > 0) {
      storeTransaction.discard();
      this.#discardUncommittedStoreRoots(storeTransaction);
      return null;
    }
    if (ownsStoreTransaction) storeTransaction.discard();
    result = carryHostKeys(
      result,
      cached.hostKeyScope,
      "0",
      options.onOutputNode,
    );
    if (this.#profile) {
      this.#profile("owner.render-and-key", performance.now() - renderStarted);
    }
    return { owner, result, ownEffects, propBoundSites };
  }

  #commitPartialOwnerRender(prepared: PreparedRender) {
    const cached = this.#componentCache.get(prepared.owner)!;
    this.#componentCache.set(prepared.owner, {
      ...cached,
      result: prepared.result,
      expandedResult: prepared.result,
      subtreeOwners: new Set([prepared.owner]),
      ownEffects: prepared.ownEffects,
      propBoundSites: prepared.propBoundSites,
    });
    this.#syncOwnerSourceValues(
      prepared.owner,
      cached,
      prepared.propBoundSites,
    );
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
    if (!cached || cached.subtreeOwners.size !== 1) return false;
    const oldKey = singleHostRootKey(cached.expandedResult);
    if (oldKey === null) return false;
    const prepared = this.#preparePartialOwnerRender(owner);
    if (!prepared) return false;
    const nextKey = singleHostRootKey(prepared.result);
    if (
      !hasNestedComponent(prepared.result) && nextKey === oldKey &&
      this.#commitHostMutation(() =>
        this.#vdom.commitKeyedRegion(oldKey, prepared.result)
      )
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
    if (cached.subtreeOwners.size <= 1) {
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
      if (
        expandedResult !== null &&
        this.#commitHostMutation(() =>
          this.#vdom.commitKeyedRegion(oldKey, expandedResult)
        )
      ) {
        this.#componentCache.set(owner, {
          ...cached,
          result: prepared.result,
          expandedResult,
          ownEffects: prepared.ownEffects,
          propBoundSites: prepared.propBoundSites,
        });
        this.#syncOwnerSourceValues(
          owner,
          cached,
          prepared.propBoundSites,
        );
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
    const subtreeOwnersByOwner = new Map<OwnerId, Set<OwnerId>>([[
      owner,
      new Set([
        owner,
      ]),
    ]]);
    const expandStarted = this.#profile ? performance.now() : 0;
    this.#collectedKeyedRegions = new Map();
    this.#collectedCollectionRegions = new Map();
    let structuralStoreRead = false;
    const structuralStoreTransaction = new StoreRenderTransaction(
      this.#rootId,
    );
    const expandedResult: RuntimeNode = (() => {
      try {
        for (const [key, effect] of prepared.ownEffects) {
          nextEffects.set(key, effect);
        }
        const expanded = this.#expand(
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
          structuralStoreTransaction,
        );
        if (structuralStoreTransaction.stores.size > 0) {
          structuralStoreRead = true;
          structuralStoreTransaction.discard();
          this.#discardUncommittedStoreRoots(structuralStoreTransaction);
          return null;
        }
        return expanded;
      } catch (error) {
        structuralStoreTransaction.discard();
        this.#discardUncommittedStoreRoots(structuralStoreTransaction);
        this.#collectedKeyedRegions = null;
        this.#collectedCollectionRegions = null;
        for (let index = createdOwners.length - 1; index >= 0; index--) {
          const owner = createdOwners[index];
          this.world.destroyOwner(owner);
          this.#dropPendingForOwner(owner);
        }
        throw error;
      }
    })();
    const structuralKeyedRegions = this.#collectedKeyedRegions;
    const structuralCollectionRegions = this.#collectedCollectionRegions;
    this.#collectedKeyedRegions = null;
    this.#collectedCollectionRegions = null;
    if (this.#profile) {
      this.#profile(
        "owner.expand-and-cache",
        performance.now() - expandStarted,
      );
    }
    if (structuralStoreRead) {
      for (let index = createdOwners.length - 1; index >= 0; index--) {
        const candidateOwner = createdOwners[index];
        this.world.destroyOwner(candidateOwner);
        this.#dropPendingForOwner(candidateOwner);
      }
      return false;
    }
    const ownSubtreeOwners = subtreeOwnersByOwner.get(owner) ??
      new Set([owner]);
    nextComponentCache.set(owner, {
      ...cached,
      result: prepared.result,
      expandedResult,
      subtreeOwners: ownSubtreeOwners,
      ownEffects: prepared.ownEffects,
      propBoundSites: prepared.propBoundSites,
      ...(structuralKeyedRegions?.get(owner)
        ? { keyedRegion: structuralKeyedRegions.get(owner) }
        : {}),
    });

    let structurallyCommitted: boolean;
    try {
      structurallyCommitted = this.#commitHostMutation(() =>
        this.#vdom.commitKeyedRegion(oldKey, expandedResult)
      );
    } catch (error) {
      for (let index = createdOwners.length - 1; index >= 0; index--) {
        const candidateOwner = createdOwners[index];
        this.world.destroyOwner(candidateOwner);
        this.#dropPendingForOwner(candidateOwner);
      }
      throw error;
    }
    if (!structurallyCommitted) {
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
            propBoundSites: candidate.propBoundSites,
          });
        }
      }
      return false;
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
      this.#dropPendingForOwner(previousOwner);
    }
    for (const [nextOwner, component] of nextComponentCache) {
      this.#componentCache.set(nextOwner, component);
      this.#liveOwners.add(nextOwner);
      effectErrors.push(
        ...this.#reconcileOwnerEffects(nextOwner, component.ownEffects),
      );
    }
    this.#syncCollectionRegions(
      this.#componentCache,
      structuralCollectionRegions ?? new Map(),
    );
    this.#syncLastSourceValues(this.#componentCache);
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
          if (this.#keyedOwnerReuseMode === "token") {
            const version = getKeyedOwnerVersion(value);
            const keyedRegion = previousOwnerCache.keyedRegion;
            if (
              regionCount !== 1 || version === null || !keyedRegion ||
              keyedRegion.regionId !== regionId ||
              keyedRegion.version !== version ||
              keyedRegion.outputsByKey.size !== value.length ||
              previousOwnerCache.subtreeOwners.size !== value.length + 1
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
            previousOwnerCache.subtreeOwners.size !== value.length + 1
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
              childCache.subtreeOwners.size !== 1
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
      if (cached.subtreeOwners.size !== 1) {
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
    if (
      !this.#commitHostMutation(() => this.#vdom.commitKeyedRegions(regions))
    ) {
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
        subtreeOwners: new Set([item.owner]),
        ownEffects: item.ownEffects,
        propBoundSites: item.propBoundSites,
      });
      this.#syncOwnerSourceValues(item.owner, cached, item.propBoundSites);
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
    const errors: unknown[] = [];
    try {
      this.#vdom.flushRefs();
    } catch (error) {
      errors.push(error);
    }
    if (this.#disposed) return errors;
    const previousEffects = this.#liveEffects;
    const nextLiveEffects = new Map<string, LiveEffect>();
    const registrationsToStart: Array<[string, EffectRegistration]> = [];
    for (const [key, registration] of nextEffects) {
      const previous = previousEffects.get(key);
      if (previous) {
        nextLiveEffects.set(key, previous);
      } else {
        registrationsToStart.push([key, registration]);
      }
    }
    const removedEffects = [...previousEffects]
      .filter(([key]) => !nextEffects.has(key))
      .map(([, effect]) => effect);
    this.#liveEffects = nextLiveEffects;
    this.#rebuildLiveEffectKeysByOwner();
    for (const effect of removedEffects) {
      if (!effect.cleanup) continue;
      try {
        effect.cleanup();
      } catch (error) {
        errors.push(error);
      }
      if (this.#disposed) return errors;
    }
    for (const [key, registration] of registrationsToStart) {
      if (this.#disposed) break;
      let cleanup: void | EffectCleanup;
      try {
        cleanup = registration.setup();
      } catch (error) {
        errors.push(error);
        if (this.#disposed) break;
        cleanup = undefined;
      }
      // setup may synchronously dispose the root before it returns its cleanup.
      if (this.#disposed) {
        if (typeof cleanup === "function") {
          try {
            cleanup();
          } catch (error) {
            errors.push(error);
          }
        }
        break;
      }
      const effect: LiveEffect = {
        owner: registration.owner,
        siteId: registration.siteId,
        cleanup: typeof cleanup === "function" ? cleanup : undefined,
      };
      nextLiveEffects.set(key, effect);
      this.#addLiveEffectKey(key, effect);
    }
    return errors;
  }

  #reconcileOwnerEffects(
    owner: OwnerId,
    nextEffects: Map<string, EffectRegistration>,
  ): unknown[] {
    const errors: unknown[] = [];
    try {
      this.#vdom.flushRefs();
    } catch (error) {
      errors.push(error);
    }
    if (this.#disposed) return errors;
    const currentKeys = this.#liveEffectKeysByOwner.get(owner);
    if (currentKeys) {
      const removedEffects: LiveEffect[] = [];
      for (const key of [...currentKeys]) {
        if (nextEffects.has(key)) continue;
        const previous = this.#liveEffects.get(key);
        if (previous) removedEffects.push(previous);
        this.#liveEffects.delete(key);
        currentKeys.delete(key);
      }
      for (const effect of removedEffects) {
        if (effect.cleanup) {
          try {
            effect.cleanup();
          } catch (error) {
            errors.push(error);
          }
        }
        if (this.#disposed) return errors;
      }
    }
    for (const [key, registration] of nextEffects) {
      if (this.#disposed) break;
      if (this.#liveEffects.has(key)) continue;
      let cleanup: void | EffectCleanup;
      try {
        cleanup = registration.setup();
      } catch (error) {
        errors.push(error);
        if (this.#disposed) break;
        cleanup = undefined;
      }
      if (this.#disposed) {
        if (typeof cleanup === "function") {
          try {
            cleanup();
          } catch (error) {
            errors.push(error);
          }
        }
        break;
      }
      const effect: LiveEffect = {
        owner,
        siteId: registration.siteId,
        cleanup: typeof cleanup === "function" ? cleanup : undefined,
      };
      this.#liveEffects.set(key, effect);
      this.#addLiveEffectKey(key, effect);
    }
    if (this.#liveEffectKeysByOwner.get(owner)?.size === 0) {
      this.#liveEffectKeysByOwner.delete(owner);
    }
    return errors;
  }

  #rebuildLiveEffectKeysByOwner() {
    this.#liveEffectKeysByOwner.clear();
    for (const [key, effect] of this.#liveEffects) {
      this.#addLiveEffectKey(key, effect);
    }
  }

  #addLiveEffectKey(key: string, effect: LiveEffect) {
    let keys = this.#liveEffectKeysByOwner.get(effect.owner);
    if (!keys) this.#liveEffectKeysByOwner.set(effect.owner, keys = new Set());
    keys.add(key);
  }

  #count(name: string, count = 1) {
    if (!this.#activeCounters || count === 0) return;
    this.#activeCounters.set(
      name,
      (this.#activeCounters.get(name) ?? 0) + count,
    );
  }

  #compiledPropSitesForCache(cache: ComponentCache): ReadonlySet<string> {
    if (cache.propBoundSites.size === 0) return emptyCompiledPropSites;
    const cached = this.#compiledPropSitesByCache.get(cache);
    if (cached) return cached;
    const metadata = (cache.type as SiteComponent<unknown> & {
      [componentMetadata]?: ComponentMetadata;
    })[componentMetadata];
    if (!metadata?.propOnlySites.length) return emptyCompiledPropSites;
    this.#count("numeric.compiled-site-cache-constructions");
    const eligible = new Set<string>();
    for (const site of metadata?.propOnlySites ?? []) {
      this.#count("numeric.compiled-site-metadata-inspections");
      if (cache.propBoundSites.has(site)) eligible.add(site);
    }
    this.#compiledPropSitesByCache.set(cache, eligible);
    return eligible;
  }

  #refreshDirectKeyedRegionOutput(owner: OwnerId, sparseStore = false) {
    if (sparseStore) this.#count("store.sparse.keyed-output-edge-visits");
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

  #syncCollectionRegions(
    caches: ReadonlyMap<OwnerId, ComponentCache>,
    collected: ReadonlyMap<string, CollectionRegionCache> = new Map(),
  ) {
    if (this.#disposed) return;
    const next = new Map<string, CollectionRegionCache>();
    for (const [owner, component] of caches) {
      const region = component.keyedRegion?.collection;
      if (!region) continue;
      const key = `${owner}\u0000${region.siteId}`;
      next.set(key, region);
    }
    for (const [key, region] of collected) next.set(key, region);
    for (const [key, previous] of this.#liveCollectionRegions) {
      const current = next.get(key);
      if (current?.collection === previous.collection) {
        current.reader = previous.reader;
        current.unsubscribe = previous.unsubscribe;
        if (
          current.reader &&
          current.snapshotVersion === previous.collection.version
        ) {
          current.reader.resetTo(current.snapshotVersion);
          this.#collectionSnapshotFallbackKeys.delete(key);
        }
        if (current.snapshotVersion !== previous.collection.version) {
          this.#pendingCollectionRegionKeys.add(key);
        } else {
          this.#pendingCollectionRegionKeys.delete(key);
        }
        continue;
      }
      previous.unsubscribe?.();
      previous.reader?.detach();
      this.#count("collection.reader-detaches");
      this.#pendingCollectionRegionKeys.delete(key);
      this.#collectionSnapshotFallbackKeys.delete(key);
    }
    for (const [key, region] of next) {
      if (region.reader) continue;
      region.reader = region.collection.createReader();
      region.unsubscribe = region.collection.subscribe(() => {
        if (this.#disposed) return;
        this.#pendingCollectionRegionKeys.add(key);
        this.#schedule();
      });
      this.#count("collection.reader-attaches");
      if (region.snapshotVersion !== region.collection.version) {
        this.#pendingCollectionRegionKeys.add(key);
      }
    }
    this.#liveCollectionRegions = next;
  }

  #prepareMixedCollectionCandidate(
    capturedChanges: readonly import("./owner_state_world.ts").StateChange[],
    options: {
      readonly storeGeneration: number;
      readonly transitions: readonly string[];
    },
  ): NativeRootCandidate<H, Parent> | null {
    if (
      this.#pendingCollectionRegionKeys.size === 0 || this.#everReadResource ||
      this.#everHadNativeBoundary
    ) return null;

    type CandidateRow = {
      owner: OwnerId;
      hostKey: string;
      node: RuntimeNode;
      cache: ComponentCache;
      privateOwner: boolean;
    };
    type RegionStage = {
      key: string;
      region: CollectionRegionCache;
      ownerRegion: KeyedRegionCache;
      read: Extract<
        ReturnType<NonNullable<CollectionRegionCache["reader"]>["read"]>,
        { status: "available" }
      >;
      rows: Map<string, CandidateRow | null>;
      previousRows: Map<string, CandidateRow>;
      operations:
        import("./vdom_snapshot_runtime.ts").KeyedRegionDeltaOperation[];
      operatedKeys: Set<string>;
    };

    const storeGenerationAtPrepare = options.storeGeneration;
    const baseVersion = this.#publicationVersion;
    const baseVDOMVersion = this.#vdom.version;
    const preparation = this.world.beginPreparation();
    const stores = new StoreRenderTransaction(this.#rootId, {
      transitions: options.transitions,
    });
    let resourceReads: ResourceReadSet | null = new ResourceReadSet(
      this.#resourceTable,
    );
    const stages = new Map<string, RegionStage>();
    const rowsByOwner = new Map<OwnerId, { stage: RegionStage; key: string }>();
    const droppedReaderIds = new Set<string>();
    const renderedOwners = new Set<OwnerId>();
    const retiredOwners = new Set<OwnerId>();
    const privateOwners = new Set<OwnerId>();
    const capturedBindings: Array<{
      binding: BoundValue<unknown>;
      sources: ScalarSource[];
      owner: OwnerId;
      sites: readonly string[];
    }> = [];
    const leafCaches = new Map<OwnerId, ComponentCache>();
    const leafPreviousCaches = new Map<OwnerId, ComponentCache>();
    const leafRegions: Array<{ key: string; tree: RuntimeNode }> = [];
    const numericWrites: CandidateNumericWrite[] = [];
    const numericSources = new Set<ScalarSource>();
    const numericChanges = new Map<
      ScalarSource,
      import("./owner_state_world.ts").StateChange
    >();
    const discardArtifacts = () => {
      try {
        preparation.discard();
      } finally {
        stores.discard();
        resourceReads?.discard();
        resourceReads = null;
        this.#discardUncommittedStoreRoots(stores);
      }
    };

    let preparedProgram:
      | import("./vdom_snapshot_runtime.ts").PreparedKeyedVDOMProgram
      | null = null;
    let preparationFailed = false;
    let resourceWasRead = false;
    try {
      if (this.#storeNotificationGeneration !== storeGenerationAtPrepare) {
        // Store notifications may have advanced since the caller captured its
        // generation; rebuild under the latest root-visible store cut.
        throw new SparseCandidateIneligible();
      }

      const storeChangePending = this.#storeNotificationGeneration !==
        this.#committedStoreNotificationGeneration;
      const regionKeys = storeChangePending
        ? new Set(this.#liveCollectionRegions.keys())
        : new Set(this.#pendingCollectionRegionKeys);
      for (const regionKey of regionKeys) {
        this.#count("collection.mixed-region-visits");
        if (this.#collectionSnapshotFallbackKeys.has(regionKey)) {
          preparationFailed = true;
          break;
        }
        const region = this.#liveCollectionRegions.get(regionKey);
        const parentCache = region &&
          this.#componentCache.get(region.parentOwner);
        const ownerRegion = parentCache?.keyedRegion;
        if (
          !region || !region.reader || !parentCache || !ownerRegion ||
          ownerRegion.collection !== region || !region.parentHostKey ||
          region.requiresOwnerRender
        ) {
          preparationFailed = true;
          break;
        }
        const read = region.reader.read();
        if (read.status !== "available") {
          preparationFailed = true;
          break;
        }
        const stage: RegionStage = {
          key: regionKey,
          region,
          ownerRegion,
          read,
          rows: new Map<string, CandidateRow | null>(),
          previousRows: new Map(),
          operations: [],
          operatedKeys: new Set(),
        };
        stages.set(regionKey, stage);
      }
      if (preparationFailed || stages.size === 0) {
        throw new SparseCandidateIneligible();
      }

      const rowFor = (stage: RegionStage, key: string): CandidateRow | null => {
        if (stage.rows.has(key)) return stage.rows.get(key) ?? null;
        const node = stage.region.rows.get(key);
        const componentSiteId = stage.region.componentSiteId ??
          (node && typeof node === "object" && !Array.isArray(node) &&
              typeof node.type === "function"
            ? getComponentSiteId(node.type)
            : undefined);
        if (!node || !componentSiteId) return null;
        const owner = preparation.findOwner(
          stage.region.parentOwner,
          collectionOwnerSite(stage.region.siteId, componentSiteId),
          key,
        );
        const cache = owner === undefined
          ? undefined
          : this.#componentCache.get(owner);
        const hostKey = stage.region.hostKeysByCollectionKey.get(key);
        if (owner === undefined || !cache || !hostKey) return null;
        const row = { owner, hostKey, node, cache, privateOwner: false };
        stage.previousRows.set(key, row);
        rowsByOwner.set(owner, { stage, key });
        return row;
      };

      const prepareRenderedRow = (
        stage: RegionStage,
        key: string,
        rendered: RuntimeElement,
        owner: OwnerId,
        previous: CandidateRow | null,
        privateOwner: boolean,
      ): CandidateRow | null => {
        if (
          typeof rendered.type !== "function" ||
          (stage.region.componentSiteId !== undefined &&
            getComponentSiteId(rendered.type) !== stage.region.componentSiteId)
        ) return null;
        const authoredKey = rendered.props.key;
        if (authoredKey != null && String(authoredKey) !== key) return null;
        const { key: _key, ref: _ref, ...props } = rendered.props;
        if (previous?.privateOwner && previous.owner === owner) {
          stores.dropReaders(
            [...stores.readers.keys()].filter((id) =>
              id.startsWith(`${owner}\u0000`)
            ),
          );
          for (let index = capturedBindings.length - 1; index >= 0; index--) {
            if (capturedBindings[index].owner === owner) {
              capturedBindings.splice(index, 1);
            }
          }
        }
        const ownEffects = new Map<string, EffectRegistration>();
        const propBoundSites = new Set<string>();
        activeOwners.push({
          world: preparation,
          owner,
          stateLayout: compiledStateLayoutFor(rendered.type),
          propBoundSites,
          readStore: (siteId, source) =>
            stores.read(source, `${owner}\u0000${siteId}`),
          readResource: <T>(source: AsyncResource<T> | PromiseLike<T>) => {
            resourceWasRead = true;
            this.#everReadResource = true;
            return resourceReads!.read(source);
          },
          captureBinding: (binding, sources, bindingOwner, sites) => {
            capturedBindings.push({
              binding,
              sources,
              owner: bindingOwner,
              sites,
            });
          },
          registerEffect: (siteId, setup) => {
            if (!siteId || typeof setup !== "function") {
              throw new Error("Invalid effect registration");
            }
            const effectId = effectKey(owner, siteId);
            if (ownEffects.has(effectId)) {
              throw new Error(
                `Effect site ${siteId} was registered twice for owner ${owner}`,
              );
            }
            ownEffects.set(effectId, { owner, siteId, setup });
          },
        });
        let result: RuntimeNode;
        try {
          if (this.#activeCounters) {
            this.#count("owner.component-visits");
            this.#count("owner.component-renders");
          }
          result =
            (rendered.type as (props: Record<string, unknown>) => RuntimeNode)(
              props,
            );
        } finally {
          activeOwners.pop();
        }
        if (resourceWasRead) return null;
        result = carryHostKeys(result, key);
        const hostKey = singleHostRootKey(result);
        if (hostKey === null || hasNestedComponent(result)) return null;
        const cache: ComponentCache = {
          type: rendered.type,
          hostKeyScope: key,
          props,
          result,
          expandedResult: result,
          subtreeOwners: new Set([owner]),
          ownEffects,
          propBoundSites,
        };
        const node = { ...rendered, props: { ...rendered.props, key } };
        const row = { owner, hostKey, node, cache, privateOwner };
        renderedOwners.add(owner);
        if (privateOwner) privateOwners.add(owner);
        if (previous && previous.owner !== owner) {
          retiredOwners.add(previous.owner);
        }
        rowsByOwner.set(owner, { stage, key });
        return row;
      };

      const appendOperation = (
        stage: RegionStage,
        operation:
          import("./vdom_snapshot_runtime.ts").KeyedRegionDeltaOperation,
      ): "ok" | "cancel" | false => {
        stage.operatedKeys.add(operation.key);
        stage.operations.push(operation);
        return "ok";
      };

      for (const stage of stages.values()) {
        for (
          const batch of stage.read.batches as readonly KeyedCollectionBatch<
            unknown
          >[]
        ) {
          if (batch.fromVersion + 1 !== batch.version) {
            throw new SparseCandidateIneligible();
          }
          for (
            const operation of batch
              .operations as readonly KeyedCollectionOperation<unknown>[]
          ) {
            this.#count("collection.delta-operations");
            if (operation.type === "remove") {
              const previous = rowFor(stage, operation.key);
              if (!previous) throw new SparseCandidateIneligible();
              const removeResult = appendOperation(stage, {
                type: "remove",
                key: previous.hostKey,
              });
              if (removeResult === false) throw new SparseCandidateIneligible();
              stage.rows.set(operation.key, null);
              if (privateOwners.has(previous.owner)) {
                preparation.discardPrivateOwner(previous.owner);
                privateOwners.delete(previous.owner);
                renderedOwners.delete(previous.owner);
                rowsByOwner.delete(previous.owner);
                for (
                  let index = capturedBindings.length - 1;
                  index >= 0;
                  index--
                ) {
                  if (capturedBindings[index].owner === previous.owner) {
                    capturedBindings.splice(index, 1);
                  }
                }
                stores.dropReaders(
                  [...stores.readers.keys()].filter((id) =>
                    id.startsWith(`${previous.owner}\u0000`)
                  ),
                );
              } else {
                retiredOwners.add(previous.owner);
              }
            } else if (operation.type === "move") {
              const row = rowFor(stage, operation.key);
              const anchor = operation.beforeKey === null
                ? null
                : rowFor(stage, operation.beforeKey);
              if (
                !row || (operation.beforeKey !== null && !anchor) ||
                appendOperation(stage, {
                    type: "move",
                    key: row.hostKey,
                    beforeKey: anchor?.hostKey ?? null,
                  }) === false
              ) throw new SparseCandidateIneligible();
            } else {
              const previous = rowFor(stage, operation.key);
              const inserting = operation.type === "insert";
              if ((inserting && previous) || (!inserting && !previous)) {
                throw new SparseCandidateIneligible();
              }
              const anchor = inserting && operation.beforeKey !== null
                ? rowFor(stage, operation.beforeKey)
                : null;
              if (inserting && operation.beforeKey !== null && !anchor) {
                throw new SparseCandidateIneligible();
              }
              const rendered = stage.region.renderRow(operation.value);
              if (
                !rendered || Array.isArray(rendered) ||
                typeof rendered !== "object" ||
                typeof rendered.type !== "function"
              ) throw new SparseCandidateIneligible();
              const componentSiteId = getComponentSiteId(rendered.type);
              const ownerSite = collectionOwnerSite(
                stage.region.siteId,
                componentSiteId,
              );
              const existing = preparation.findOwner(
                stage.region.parentOwner,
                ownerSite,
                operation.key,
              );
              const preserveReplacementOwner = operation.type === "replace" &&
                existing !== undefined;
              const owner = existing === undefined
                ? preparation.resolveOwner(
                  stage.region.parentOwner,
                  ownerSite,
                  operation.key,
                )
                : preserveReplacementOwner
                ? existing
                : preparation.replaceOwner(
                  stage.region.parentOwner,
                  ownerSite,
                  operation.key,
                );
              const candidate = prepareRenderedRow(
                stage,
                operation.key,
                rendered,
                owner,
                previous,
                owner !== existing,
              );
              if (
                !candidate ||
                (previous && candidate.hostKey !== previous.hostKey)
              ) throw new SparseCandidateIneligible();
              const hostOperation = previous === null
                ? {
                  type: "insert" as const,
                  key: candidate.hostKey,
                  beforeKey: anchor?.hostKey ?? null,
                  tree: candidate.cache.expandedResult,
                }
                : {
                  type: "replace" as const,
                  key: candidate.hostKey,
                  tree: candidate.cache.expandedResult,
                };
              const appendResult = appendOperation(stage, hostOperation);
              if (appendResult === false) throw new SparseCandidateIneligible();
              stage.rows.set(operation.key, candidate);
              if (previous) {
                if (
                  previous.owner !== candidate.owner &&
                  privateOwners.has(previous.owner)
                ) {
                  preparation.discardPrivateOwner(previous.owner);
                  privateOwners.delete(previous.owner);
                  renderedOwners.delete(previous.owner);
                  rowsByOwner.delete(previous.owner);
                  for (
                    let index = capturedBindings.length - 1;
                    index >= 0;
                    index--
                  ) {
                    if (capturedBindings[index].owner === previous.owner) {
                      capturedBindings.splice(index, 1);
                    }
                  }
                  stores.dropReaders(
                    [...stores.readers.keys()].filter((id) =>
                      id.startsWith(`${previous.owner}\u0000`)
                    ),
                  );
                }
              }
            }
          }
        }
      }

      const affectedReaderIds = new Set<string>(droppedReaderIds);
      const readerOwners = new Map<number, string[]>();
      for (const readerId of this.#liveStoreReaders.keys()) {
        const split = readerId.indexOf("\u0000");
        if (split <= 0) throw new SparseCandidateIneligible();
        const owner = Number(readerId.slice(0, split));
        if (!Number.isSafeInteger(owner)) throw new SparseCandidateIneligible();
        const ids = readerOwners.get(owner) ?? [];
        ids.push(readerId);
        readerOwners.set(owner, ids);
      }

      // Resolve only owners that actually have store readers. Looking up each
      // reader owner in the maintained reverse index keeps this candidate
      // proportional to participating readers instead of collection size.
      for (const owner of readerOwners.keys()) {
        this.#count("collection.mixed-store-reader-visits");
        for (const stage of stages.values()) {
          const collectionKey = stage.ownerRegion.keysByOwner.get(owner);
          if (
            collectionKey !== undefined && stage.region.rows.has(collectionKey)
          ) {
            rowsByOwner.set(owner, { stage, key: collectionKey });
            break;
          }
        }
      }

      for (const [owner, ids] of readerOwners) {
        if (retiredOwners.has(owner)) {
          for (const id of ids) {
            droppedReaderIds.add(id);
            affectedReaderIds.add(id);
          }
        } else if (renderedOwners.has(owner)) {
          for (const id of ids) affectedReaderIds.add(id);
        }
      }

      // Store readers inside a touched collection are folded into that region;
      // retained rows are replaced in place and edited rows already have their
      // candidate render. Other readers must be independent host leaves.
      if (storeChangePending) {
        for (const [owner, ids] of readerOwners) {
          if (retiredOwners.has(owner)) continue;
          const rowLocation = rowsByOwner.get(owner);
          if (rowLocation) {
            const stage = rowLocation.stage;
            const row = rowFor(stage, rowLocation.key);
            if (!row) {
              for (const id of ids) droppedReaderIds.add(id);
              continue;
            }
            if (row.owner !== owner) {
              for (const id of ids) {
                droppedReaderIds.add(id);
                affectedReaderIds.add(id);
              }
              continue;
            }
            if (renderedOwners.has(owner)) {
              for (const id of ids) affectedReaderIds.add(id);
              continue;
            }
            const rendered = row.node as RuntimeElement;
            const prepared = prepareRenderedRow(
              stage,
              rowLocation.key,
              rendered,
              owner,
              row,
              false,
            );
            if (
              !prepared ||
              !appendOperation(stage, {
                type: "replace",
                key: row.hostKey,
                tree: prepared.cache.expandedResult,
              })
            ) throw new SparseCandidateIneligible();
            stage.rows.set(rowLocation.key, prepared);
            for (const id of ids) affectedReaderIds.add(id);
          } else {
            if (!storeChangePending) continue;
            const cache = this.#componentCache.get(owner);
            const metadata = cache &&
              (cache.type as SiteComponent<unknown> & {
                [componentMetadata]?: ComponentMetadata;
              })[componentMetadata];
            if (
              !cache || cache.nativeBoundary ||
              metadata?.hostLeafOutput !== true ||
              cache.subtreeOwners.size !== 1 || hasNestedComponent(cache.result)
            ) throw new SparseCandidateIneligible();
            const key = singleHostRootKey(cache.expandedResult);
            if (!key) throw new SparseCandidateIneligible();
            this.#count("owner.component-visits");
            const prepared = this.#prepareOwnerRender(owner, {
              preparation,
              stores,
              resourceReads,
              captureBinding: (binding, sources, bindingOwner, sites) =>
                capturedBindings.push({
                  binding,
                  sources,
                  owner: bindingOwner,
                  sites,
                }),
              onResourceRead: () => resourceWasRead = true,
            });
            if (
              !prepared || resourceWasRead ||
              singleHostRootKey(prepared.result) !== key ||
              hasNestedComponent(prepared.result)
            ) throw new SparseCandidateIneligible();
            leafCaches.set(owner, {
              ...cache,
              result: prepared.result,
              expandedResult: prepared.result,
              ownEffects: prepared.ownEffects,
              propBoundSites: prepared.propBoundSites,
            });
            leafPreviousCaches.set(owner, cache);
            leafRegions.push({ key, tree: prepared.result });
            for (const id of ids) affectedReaderIds.add(id);
          }
        }
      }

      // Remove stale observations from deleted/replaced rows, then carry every
      // unaffected reader footprint forward into this shared store cut.
      if (droppedReaderIds.size) stores.dropReaders(droppedReaderIds);
      const preserved = new Map<string, ReadonlySet<AnyAsyncStore>>();
      for (const [readerId, readerStores] of this.#liveStoreReaders) {
        if (affectedReaderIds.has(readerId)) continue;
        preserved.set(readerId, readerStores);
      }
      if (preserved.size) stores.preserveReaders(preserved);

      const touchedOldOwners = new Set([...retiredOwners, ...renderedOwners]);
      for (const change of capturedChanges) {
        if (touchedOldOwners.has(change.owner)) continue;
        const cache = this.#componentCache.get(change.owner);
        const source = this.world.scalarSourceForChange(change);
        const approvedSites = cache
          ? this.#compiledPropSitesForCache(cache)
          : undefined;
        const previous = source
          ? this.#lastSourceValues.get(source)
          : undefined;
        if (
          !cache || !approvedSites?.has(change.site) || !source ||
          previous === undefined || !this.#vdom.hasBoundSource(source) ||
          numericSources.has(source)
        ) throw new SparseCandidateIneligible();
        numericSources.add(source);
        numericChanges.set(source, change);
        numericWrites.push({
          owner: change.owner,
          site: change.site,
          source,
          version: change.version,
          previous,
          current: source.value,
        });
      }
      const validateNumericWrites = () =>
        numericWrites.every((write) =>
          this.world.versionForChange(
              numericChanges.get(write.source)!,
            ) === write.version &&
          this.world.scalarSource(write.owner, write.site) === write.source &&
          Object.is(write.source.value, write.current)
        );

      if (resourceWasRead || preparation.hasStateWrites()) {
        throw new SparseCandidateIneligible();
      }
      const deltas = [...stages.values()].filter((stage) =>
        stage.operations.length > 0
      ).map((stage) => ({
        parentKey: stage.region.parentHostKey!,
        regionId: stage.region.siteId,
        operations: stage.operations,
      }));
      preparedProgram = this.#vdom.prepareKeyedRegionDeltas(
        deltas,
        leafRegions,
      );
      if (!preparedProgram) throw new SparseCandidateIneligible();

      const touchedCollections = [...stages.values()];
      const validateCollections = () =>
        touchedCollections.every((stage) =>
          stage.region.collection.version === stage.read.toVersion
        );
      const artifactsReleased = { value: false };
      const releaseArtifacts = () => {
        if (artifactsReleased.value) return;
        artifactsReleased.value = true;
        preparedProgram?.discard();
        preparedProgram = null;
        resourceReads?.discard();
        resourceReads = null;
        for (const stage of stages.values()) {
          stage.rows.clear();
          stage.previousRows.clear();
          stage.operations.length = 0;
          stage.operatedKeys.clear();
        }
        stages.clear();
        rowsByOwner.clear();
        capturedBindings.length = 0;
        leafCaches.clear();
        leafPreviousCaches.clear();
        leafRegions.length = 0;
        numericWrites.length = 0;
        numericSources.clear();
        numericChanges.clear();
        privateOwners.clear();
        retiredOwners.clear();
        renderedOwners.clear();
      };
      return this.#createCandidateLifecycle({
        baseVersion,
        baseVDOMVersion,
        stores,
        transitions: options.transitions,
        pendingResources: [],
        blocked: false,
        validatePrepared: () =>
          this.#storeNotificationGeneration === storeGenerationAtPrepare &&
          preparation.validate() && !preparation.hasStateWrites() &&
          stores.validate() && validateNumericWrites() &&
          validateCollections() &&
          (resourceReads?.validate() ?? false) &&
          (preparedProgram?.validate() ?? false),
        validatePostHost: () =>
          preparation.validate() && !preparation.hasStateWrites() &&
          stores.validate() && validateNumericWrites() &&
          this.#storeNotificationGeneration === storeGenerationAtPrepare &&
          validateCollections() && (resourceReads?.validate() ?? false),
        commitHost: () => {
          for (const item of capturedBindings) {
            const canonical = item.sites.map((site, index) =>
              privateOwners.has(item.owner)
                ? preparation.scalarSource(item.owner, site) ??
                  item.sources[index]
                : this.world.scalarSource(item.owner, site) ??
                  item.sources[index]
            );
            const mutable = item.binding.sources as ScalarSource[] | undefined;
            if (mutable) {
              for (let index = 0; index < canonical.length; index++) {
                mutable[index] = canonical[index];
              }
            }
            (item.binding as { source: ScalarSource }).source = canonical[0];
          }
          preparedProgram!.commit();
          preparedProgram = null;
          this.#applyCandidateNumericWrites(numericWrites);
          if (numericWrites.length > 0) {
            this.#count("numeric.candidate-batches");
            this.#count(
              "numeric.candidate-source-updates",
              numericWrites.length,
            );
          }
        },
        publish: () => {
          preparation.publish();
          stores.commitAfterValidatedRender();
          this.#syncStoreReaders(stores);
          for (const [owner, cache] of leafCaches) {
            this.#componentCache.set(owner, cache);
          }
          for (const stage of stages.values()) {
            for (const [key, candidate] of stage.rows) {
              if (!candidate) {
                stage.region.rows.delete(key);
                stage.region.hostKeysByCollectionKey.delete(key);
                stage.ownerRegion.outputsByKey.delete(key);
                const previous = stage.previousRows.get(key);
                if (previous) {
                  stage.ownerRegion.keysByOwner.delete(previous.owner);
                }
                continue;
              }
              stage.region.rows.set(key, candidate.node);
              stage.region.hostKeysByCollectionKey.set(key, candidate.hostKey);
              const previous = stage.previousRows.get(key);
              this.#componentCache.set(candidate.owner, candidate.cache);
              if (!this.#liveOwners.has(candidate.owner)) {
                this.#count("owner.created");
              }
              this.#liveOwners.add(candidate.owner);
              for (
                const ancestor of this.world.ownerLineage(candidate.owner)
                  .slice(1)
              ) {
                const ancestorCache = this.#componentCache.get(ancestor);
                if (
                  ancestorCache?.subtreeOwners instanceof Set &&
                  !ancestorCache.subtreeOwners.has(candidate.owner)
                ) {
                  ancestorCache.subtreeOwners.add(candidate.owner);
                  this.#count("collection.owner-membership-writes");
                }
              }
              stage.ownerRegion.outputsByKey.set(
                key,
                candidate.cache.expandedResult,
              );
              stage.ownerRegion.keysByOwner.set(candidate.owner, key);
              if (previous && previous.owner !== candidate.owner) {
                stage.ownerRegion.keysByOwner.delete(previous.owner);
              }
              if (previous && previous.owner === candidate.owner) {
                this.#syncOwnerSourceValues(
                  candidate.owner,
                  previous.cache,
                  candidate.cache.propBoundSites,
                );
              } else {
                for (const site of candidate.cache.propBoundSites) {
                  const source = this.world.scalarSource(candidate.owner, site);
                  if (source) this.#lastSourceValues.set(source, source.value);
                }
              }
            }
            if (stage.region.collection.version === stage.read.toVersion) {
              if (!stage.region.reader?.acknowledge(stage.read.toVersion)) {
                throw new Error(
                  "Collection reader lost its validated version after mixed VDOM commit",
                );
              }
              this.#pendingCollectionRegionKeys.delete(stage.key);
            }
            for (
              const ancestor of this.world.ownerLineage(
                stage.region.parentOwner,
              )
            ) {
              const cache = this.#componentCache.get(ancestor);
              if (!cache) continue;
              const keyedRegion = cache.keyedRegion
                ? { ...cache.keyedRegion, version: createKeyedOwnerVersion() }
                : undefined;
              if (keyedRegion?.collection !== stage.region && keyedRegion) {
                keyedRegion.outputsByKey.clear();
                keyedRegion.keysByOwner.clear();
              }
              this.#componentCache.set(ancestor, {
                ...cache,
                result: null,
                expandedResult: null,
                invalidatedByCollection: true,
                ...(keyedRegion ? { keyedRegion } : {}),
              });
            }
          }
          for (const [owner, cache] of leafCaches) {
            const previous = leafPreviousCaches.get(owner);
            if (previous) {
              this.#syncOwnerSourceValues(
                owner,
                previous,
                cache.propBoundSites,
              );
            }
            this.#refreshDirectKeyedRegionOutput(owner, true);
          }
          for (const write of numericWrites) {
            this.#lastSourceValues.set(write.source, write.current);
          }
          resourceReads?.discard();
          resourceReads = null;
          this.world.clearChangesThrough(capturedChanges);
          this.#pendingChanges.clearThrough(capturedChanges);
          this.#committedStoreNotificationGeneration = storeGenerationAtPrepare;
          this.#publicationVersion++;
        },
        runEffects: () => {
          const errors: unknown[] = [];
          try {
            this.#vdom.flushRefs();
          } catch (error) {
            errors.push(error);
          }
          // Match the full candidate lifecycle: retired owners clean up before
          // replacement effects publish any same-key external registrations.
          for (const owner of retiredOwners) {
            this.#retireCollectionRow(owner, errors);
          }
          for (const [owner, cache] of leafCaches) {
            errors.push(
              ...this.#reconcileOwnerEffects(owner, cache.ownEffects),
            );
          }
          for (const stage of stages.values()) {
            for (const [key, row] of stage.rows) {
              if (!row) continue;
              errors.push(
                ...this.#reconcileOwnerEffects(row.owner, row.cache.ownEffects),
              );
            }
          }
          return errors;
        },
        discard: discardArtifacts,
        releaseArtifacts,
        effectFailureMessage:
          "Mixed collection candidate effects failed after publication",
      });
    } catch (error) {
      preparedProgram?.discard();
      preparedProgram = null;
      discardArtifacts();
      stages.clear();
      rowsByOwner.clear();
      capturedBindings.length = 0;
      leafCaches.clear();
      leafPreviousCaches.clear();
      leafRegions.length = 0;
      numericWrites.length = 0;
      numericSources.clear();
      numericChanges.clear();
      privateOwners.clear();
      retiredOwners.clear();
      renderedOwners.clear();
      if (
        error instanceof SparseCandidateIneligible || preparationFailed ||
        resourceWasRead
      ) return null;
      throw error;
    }
  }

  #flushCollectionDelta(): boolean {
    if (this.#pendingCollectionRegionKeys.size !== 1) return false;
    const regionKey = this.#pendingCollectionRegionKeys.values().next().value as
      | string
      | undefined;
    if (!regionKey) return false;
    if (this.#collectionSnapshotFallbackKeys.has(regionKey)) return false;
    const region = this.#liveCollectionRegions.get(regionKey);
    const parentCache = region && this.#componentCache.get(region.parentOwner);
    const ownerRegion = parentCache?.keyedRegion;
    const parentHostKey = region?.parentHostKey ?? null;
    if (
      !region || !region.reader || !parentCache || !ownerRegion ||
      ownerRegion.collection !== region || parentHostKey === null ||
      region.requiresOwnerRender
    ) return false;

    const read = region.reader.read();
    if (read.status !== "available") {
      this.#count("collection.delta.reader-expired");
      return false;
    }
    if (read.batches.length === 0) {
      if (!region.reader.acknowledge(read.toVersion)) return false;
      this.#pendingCollectionRegionKeys.delete(regionKey);
      return true;
    }

    type CandidateRow = {
      owner: OwnerId;
      hostKey: string;
      node: RuntimeNode;
      cache: ComponentCache;
      staged?: boolean;
      previousOwner?: OwnerId;
    };
    const overlay = new Map<string, CandidateRow | null>();
    const storeGenerationAtPrepare = this.#storeNotificationGeneration;
    const originalRows = new Map<string, CandidateRow>();
    const activationPreviousOwners = new Map<string, OwnerId | undefined>();
    const stagedOwners: OwnerId[] = [];
    const newlyAllocatedOwners: OwnerId[] = [];
    const preparedStores: StoreRenderTransaction[] = [];
    const operations: Array<
      import("./vdom_snapshot_runtime.ts").KeyedRegionDeltaOperation
    > = [];
    const rowFor = (key: string): CandidateRow | null => {
      if (overlay.has(key)) return overlay.get(key) ?? null;
      const node = region.rows.get(key);
      const componentSiteId = region.componentSiteId ??
        (node && typeof node === "object" && !Array.isArray(node) &&
            typeof node.type === "function"
          ? getComponentSiteId(node.type)
          : undefined);
      if (!componentSiteId) return null;
      const owner = this.world.findOwner(
        region.parentOwner,
        collectionOwnerSite(region.siteId, componentSiteId),
        key,
      );
      if (!node || owner === undefined) return null;
      const cache = this.#componentCache.get(owner);
      const hostKey = region.hostKeysByCollectionKey.get(key);
      if (!cache || !hostKey) return null;
      const row = { owner, hostKey, node, cache };
      originalRows.set(key, row);
      return row;
    };
    const activationPreviousOwner = (key: string): OwnerId | undefined => {
      if (!activationPreviousOwners.has(key)) {
        const componentSiteId = region.componentSiteId;
        activationPreviousOwners.set(
          key,
          componentSiteId
            ? this.world.findOwner(
              region.parentOwner,
              collectionOwnerSite(region.siteId, componentSiteId),
              key,
            )
            : undefined,
        );
      }
      return activationPreviousOwners.get(key);
    };
    const prepareRow = (
      key: string,
      value: unknown,
      existingOwner: OwnerId | undefined,
      stagedInsert = false,
      stagedPreviousOwner?: OwnerId,
    ): CandidateRow | null => {
      const rendered = region.renderRow(value);
      if (
        !rendered || Array.isArray(rendered) || typeof rendered !== "object" ||
        typeof rendered.type !== "function" ||
        (region.componentSiteId !== undefined &&
          getComponentSiteId(rendered.type) !== region.componentSiteId)
      ) return null;
      const rowComponentSiteId = getComponentSiteId(rendered.type);
      const ownerSiteId = collectionOwnerSite(
        region.siteId,
        rowComponentSiteId,
      );
      const authoredKey = rendered.props.key;
      if (authoredKey != null && String(authoredKey) !== key) return null;
      const owner = stagedInsert
        ? this.world.createStagedOwner(
          region.parentOwner,
          ownerSiteId,
          key,
        )
        : existingOwner ??
          this.world.resolveOwner(region.parentOwner, ownerSiteId, key);
      const staged = stagedInsert ||
        (existingOwner !== undefined && stagedOwners.includes(existingOwner));
      if (staged) stagedOwners.push(owner);
      else if (existingOwner === undefined) newlyAllocatedOwners.push(owner);

      const { key: _key, ref: _ref, ...props } = rendered.props;
      const ownEffects = new Map<string, EffectRegistration>();
      const propBoundSites = new Set<string>();
      const storeTransaction = new StoreRenderTransaction(this.#rootId);
      activeOwners.push({
        world: this.world,
        owner,
        stateLayout: compiledStateLayoutFor(rendered.type),
        propBoundSites,
        readStore: (siteId, source) =>
          storeTransaction.read(source, `${owner}\u0000${siteId}`),
        registerEffect: (siteId, setup) => {
          if (!siteId || typeof setup !== "function") {
            throw new Error("Invalid effect registration");
          }
          const effectId = effectKey(owner, siteId);
          if (ownEffects.has(effectId)) {
            throw new Error(
              `Effect site ${siteId} was registered twice for owner ${owner}`,
            );
          }
          ownEffects.set(effectId, { owner, siteId, setup });
        },
      });
      let result: RuntimeNode;
      try {
        if (this.#activeCounters) {
          this.#count("owner.component-visits");
          this.#count("owner.component-renders");
        }
        result =
          (rendered.type as (props: Record<string, unknown>) => RuntimeNode)(
            props,
          );
      } finally {
        activeOwners.pop();
      }
      preparedStores.push(storeTransaction);
      if (storeTransaction.stores.size > 0) return null;
      storeTransaction.discard();
      result = carryHostKeys(result, key);
      const hostKey = singleHostRootKey(result);
      if (hostKey === null || hasNestedComponent(result)) return null;
      const cache: ComponentCache = {
        type: rendered.type,
        hostKeyScope: key,
        props,
        result,
        expandedResult: result,
        subtreeOwners: new Set([owner]),
        ownEffects,
        propBoundSites,
      };
      return {
        owner,
        hostKey,
        node: { ...rendered, props: { ...rendered.props, key } },
        cache,
        ...(staged ? { staged: true, previousOwner: stagedPreviousOwner } : {}),
      };
    };

    const discardCandidate = () => {
      for (const transaction of preparedStores) {
        transaction.discard();
        this.#discardUncommittedStoreRoots(transaction);
      }
      for (
        const owner of [...new Set([...stagedOwners, ...newlyAllocatedOwners])]
      ) {
        this.world.destroyOwner(owner);
        this.#dropPendingForOwner(owner);
      }
    };

    try {
      for (
        const batch of read.batches as readonly KeyedCollectionBatch<unknown>[]
      ) {
        if (batch.fromVersion + 1 !== batch.version) {
          discardCandidate();
          return false;
        }
        for (
          const operation of batch
            .operations as readonly KeyedCollectionOperation<unknown>[]
        ) {
          if (operation.type === "remove") {
            const row = rowFor(operation.key);
            if (!row) {
              discardCandidate();
              return false;
            }
            overlay.set(operation.key, null);
            operations.push({ type: "remove", key: row.hostKey });
          } else if (operation.type === "move") {
            const row = rowFor(operation.key);
            const anchor = operation.beforeKey === null
              ? null
              : rowFor(operation.beforeKey);
            if (!row || (operation.beforeKey !== null && !anchor)) {
              discardCandidate();
              return false;
            }
            operations.push({
              type: "move",
              key: row.hostKey,
              beforeKey: anchor?.hostKey ?? null,
            });
          } else {
            const previous = rowFor(operation.key);
            const isInsert = operation.type === "insert";
            if (isInsert && previous) {
              discardCandidate();
              return false;
            }
            if (!isInsert && !previous) {
              discardCandidate();
              return false;
            }
            const anchor = isInsert && operation.beforeKey !== null
              ? rowFor(operation.beforeKey)
              : null;
            if (isInsert && operation.beforeKey !== null && !anchor) {
              discardCandidate();
              return false;
            }
            const previousOwner = isInsert
              ? activationPreviousOwner(operation.key)
              : previous?.staged
              ? previous.previousOwner
              : undefined;
            const candidate = prepareRow(
              operation.key,
              operation.value,
              previous?.owner,
              isInsert,
              previousOwner,
            );
            if (
              !candidate || (previous && candidate.hostKey !== previous.hostKey)
            ) {
              discardCandidate();
              return false;
            }
            overlay.set(operation.key, candidate);
            operations.push(
              isInsert
                ? {
                  type: "insert",
                  key: candidate.hostKey,
                  beforeKey: anchor?.hostKey ?? null,
                  tree: candidate.cache.expandedResult,
                }
                : {
                  type: "replace",
                  key: candidate.hostKey,
                  tree: candidate.cache.expandedResult,
                },
            );
          }
        }
      }
    } catch {
      discardCandidate();
      this.#collectionSnapshotFallbackKeys.add(regionKey);
      this.#count("collection.delta.render-fallback");
      return false;
    }
    if (
      region.collection.version !== read.toVersion ||
      this.#storeNotificationGeneration !== storeGenerationAtPrepare ||
      this.#pendingChanges.size > 0
    ) {
      discardCandidate();
      this.#count("collection.delta.stale-candidate");
      return false;
    }
    let deltaCommitted: boolean;
    try {
      deltaCommitted = this.#commitHostMutation(() =>
        this.#vdom.commitKeyedRegionDelta(
          parentHostKey,
          region.siteId,
          operations,
        )
      );
    } catch (error) {
      discardCandidate();
      throw error;
    }
    if (!deltaCommitted) {
      discardCandidate();
      return false;
    }
    if (!region.reader.acknowledge(read.toVersion)) {
      throw new Error(
        "Collection reader lost its validated version after VDOM commit",
      );
    }

    const effectErrors: unknown[] = [];
    for (const [key, candidate] of overlay) {
      const previous = originalRows.get(key);
      if (candidate === null) {
        if (previous) this.#retireCollectionRow(previous.owner, effectErrors);
        region.rows.delete(key);
        region.hostKeysByCollectionKey.delete(key);
        ownerRegion.outputsByKey.delete(key);
        if (previous) ownerRegion.keysByOwner.delete(previous.owner);
        continue;
      }
      if (candidate.staged) {
        this.world.activateStagedOwner(
          candidate.owner,
          candidate.previousOwner,
        );
        if (candidate.previousOwner !== undefined) {
          this.#retireCollectionRow(candidate.previousOwner, effectErrors);
        }
      }
      const oldOwner = previous?.owner;
      if (oldOwner !== undefined && oldOwner !== candidate.owner) {
        this.#retireCollectionRow(oldOwner, effectErrors);
        ownerRegion.keysByOwner.delete(oldOwner);
      }
      const previousCache = this.#componentCache.get(candidate.owner);
      this.#componentCache.set(candidate.owner, candidate.cache);
      if (!this.#liveOwners.has(candidate.owner)) this.#count("owner.created");
      this.#liveOwners.add(candidate.owner);
      for (
        const ancestor of this.world.ownerLineage(candidate.owner).slice(1)
      ) {
        const ancestorCache = this.#componentCache.get(ancestor);
        if (
          ancestorCache?.subtreeOwners instanceof Set &&
          !ancestorCache.subtreeOwners.has(candidate.owner)
        ) {
          ancestorCache.subtreeOwners.add(candidate.owner);
          this.#count("collection.owner-membership-writes");
        }
      }
      if (previousCache) {
        this.#syncOwnerSourceValues(
          candidate.owner,
          previousCache,
          candidate.cache.propBoundSites,
        );
      } else {
        for (const site of candidate.cache.propBoundSites) {
          const source = this.world.scalarSource(candidate.owner, site);
          if (source) {
            this.#sourceValueSyncVisits++;
            this.#lastSourceValues.set(source, source.value);
          }
        }
      }
      region.rows.set(key, candidate.node);
      region.hostKeysByCollectionKey.set(key, candidate.hostKey);
      region.componentSiteId = getComponentSiteId(candidate.cache.type);
      ownerRegion.outputsByKey.set(key, candidate.cache.expandedResult);
      ownerRegion.keysByOwner.set(candidate.owner, key);
      effectErrors.push(
        ...this.#reconcileOwnerEffects(
          candidate.owner,
          candidate.cache.ownEffects,
        ),
      );
      this.#count("collection.rows-prepared");
    }
    const publishedOwners = new Set(
      [...overlay.values()].flatMap((candidate) =>
        candidate ? [candidate.owner] : []
      ),
    );
    for (
      const owner of [...new Set([...stagedOwners, ...newlyAllocatedOwners])]
    ) {
      if (publishedOwners.has(owner)) continue;
      this.world.destroyOwner(owner);
      this.#dropPendingForOwner(owner);
    }
    // Authored and expanded ancestor arrays retain row props and closures from
    // this snapshot. Drop them in O(depth); the stable host key and per-row
    // maps above are sufficient for the next sparse delta. A later generic
    // render must rebuild every invalidated ancestor from current inputs.
    for (const ancestor of this.world.ownerLineage(region.parentOwner)) {
      const cache = this.#componentCache.get(ancestor);
      if (!cache) continue;
      const keyedRegion = cache.keyedRegion
        ? { ...cache.keyedRegion, version: createKeyedOwnerVersion() }
        : undefined;
      if (keyedRegion?.collection !== region && keyedRegion) {
        keyedRegion.outputsByKey.clear();
        keyedRegion.keysByOwner.clear();
      }
      this.#componentCache.set(ancestor, {
        ...cache,
        result: null,
        expandedResult: null,
        invalidatedByCollection: true,
        ...(keyedRegion ? { keyedRegion } : {}),
      });
    }
    if (region.collection.version === read.toVersion) {
      this.#pendingCollectionRegionKeys.delete(regionKey);
    } else {
      this.#pendingCollectionRegionKeys.add(regionKey);
      this.#schedule();
    }
    this.#count("collection.delta-operations", operations.length);
    if (effectErrors.length) {
      throw new AggregateError(
        effectErrors,
        "Collection row effect lifecycle failed after VDOM commit",
      );
    }
    return true;
  }

  #retireCollectionRow(owner: OwnerId, errors: unknown[]) {
    const cache = this.#componentCache.get(owner);
    if (!cache) return;
    const lineage = this.world.ownerLineage(owner).slice(1);
    this.#count("owner.retired");
    errors.push(...this.#reconcileOwnerEffects(owner, new Map()));
    this.#forgetOwnerSourceValues(owner, cache.propBoundSites);
    this.#componentCache.delete(owner);
    this.#liveOwners.delete(owner);
    this.#dropPendingForOwner(owner);
    this.world.destroyOwner(owner);
    for (const ancestor of lineage) {
      const ancestorCache = this.#componentCache.get(ancestor);
      if (
        ancestorCache?.subtreeOwners instanceof Set &&
        ancestorCache.subtreeOwners.delete(owner)
      ) {
        this.#count("collection.owner-membership-writes");
      }
    }
  }

  #forgetOwnerSourceValues(owner: OwnerId, sites: ReadonlySet<string>) {
    for (const site of sites) {
      const source = this.world.scalarSource(owner, site);
      if (source) this.#lastSourceValues.delete(source);
    }
  }

  #commitHostMutation<T>(commit: () => T): T {
    try {
      const result = commit();
      if (!this.#candidateHostCommit && result !== false) {
        this.#publicationVersion++;
      }
      return result;
    } catch (error) {
      this.#terminalHostFailure ??= error;
      this.#terminalHostFailed = true;
      throw error;
    }
  }

  #assertNoPublicationBarrier(operation: string) {
    if (this.#nativeCellCutActive) {
      throw new Error(
        `Cannot ${operation} while a native numeric cell cut is executing`,
      );
    }
    if (this.#publicationBarrier) {
      throw new Error(
        `Cannot ${operation} while a native root candidate is publishing`,
      );
    }
  }

  #releasePublicationBarrier(candidate: NativeRootCandidate<H, Parent>) {
    if (this.#publicationBarrier !== candidate) return;
    this.#publicationBarrier = null;
    const shouldFlush = this.#deferredFlush || this.#hasPendingWork();
    this.#deferredFlush = false;
    if (
      shouldFlush && !this.#disposed && !this.#disposing &&
      !this.#terminalHostFailed
    ) this.#schedule();
  }

  #hasPendingWork() {
    return this.#pendingChanges.size > 0 ||
      this.#pendingCollectionRegionKeys.size > 0 ||
      this.#pendingResourceRetry ||
      this.#storeNotificationGeneration !==
        this.#committedStoreNotificationGeneration;
  }

  #schedule() {
    if (this.#disposed || this.#scheduled) return;
    if (this.#publicationBarrier) {
      this.#deferredFlush = true;
      return;
    }
    this.#scheduled = true;
    this.#scheduleCommit(() => {
      if (this.#disposed || !this.#scheduled) return;
      this.#scheduled = false;
      if (this.#publicationBarrier) {
        this.#deferredFlush = true;
        return;
      }
      if (this.#hasPendingWork()) {
        this.flush();
      }
    });
  }

  #finishChanges(
    captured: readonly import("./owner_state_world.ts").StateChange[],
  ) {
    this.world.clearChangesThrough(captured);
    this.#pendingChanges.clearThrough(captured);
    if (this.#pendingChanges.size > 0) this.#schedule();
  }

  #syncStoreReaders(
    transaction: StoreRenderTransaction,
    sparseStoreCandidate = false,
  ) {
    if (this.#disposed) return;
    const nextReaders = new Map<string, Set<AnyAsyncStore>>();
    for (const [readerId, stores] of transaction.readers) {
      if (sparseStoreCandidate) {
        this.#count("store.sparse.reader-publication-map-visits");
      }
      nextReaders.set(readerId, new Set(stores));
    }
    for (const [readerId, stores] of this.#liveStoreReaders) {
      if (sparseStoreCandidate) {
        this.#count("store.sparse.reader-publication-map-visits");
      }
      const next = nextReaders.get(readerId);
      for (const store of stores) {
        if (!next?.has(store)) store.forgetReader(this.#rootId, readerId);
      }
    }
    this.#liveStoreReaders = nextReaders;
    this.#reconcileStoreSubscriptions(sparseStoreCandidate);
  }

  #reconcileStoreSubscriptions(sparseStoreCandidate = false) {
    if (this.#disposed) return;
    const nextStores = new Set<AnyAsyncStore>();
    for (const stores of this.#liveStoreReaders.values()) {
      if (sparseStoreCandidate) {
        this.#count("store.sparse.subscription-reader-visits");
      }
      for (const store of stores) nextStores.add(store);
    }
    for (const stores of this.#storeDependencyLeases.values()) {
      for (const store of stores) nextStores.add(store);
    }
    for (const [store, unsubscribe] of this.#liveStoreSubscriptions) {
      if (nextStores.has(store)) continue;
      unsubscribe();
      if ((this.#candidateStoreHolds.get(store) ?? 0) === 0) {
        store.detachRoot(this.#rootId);
      }
      this.#liveStoreSubscriptions.delete(store);
    }
    for (const store of nextStores) {
      if (this.#liveStoreSubscriptions.has(store)) continue;
      this.#liveStoreSubscriptions.set(
        store,
        store.subscribe(this.#rootId, () => {
          this.#storeNotificationGeneration++;
          this.#schedule();
        }),
      );
    }
  }

  #syncResourceSubscriptions(resources: readonly AsyncResource<any>[]) {
    const wanted = new Set(
      resources.filter((resource) => resource.status.status === "pending"),
    );
    for (const [resource, unsubscribe] of this.#liveResourceSubscriptions) {
      if (wanted.has(resource)) continue;
      unsubscribe();
      this.#liveResourceSubscriptions.delete(resource);
    }
    for (const resource of wanted) {
      if (this.#liveResourceSubscriptions.has(resource)) continue;
      const unsubscribe = resource.subscribe(() => {
        this.#liveResourceSubscriptions.get(resource)?.();
        this.#liveResourceSubscriptions.delete(resource);
        if (!this.#disposed) {
          this.#pendingResourceRetry = true;
          this.#schedule();
        }
      });
      this.#liveResourceSubscriptions.set(resource, unsubscribe);
    }
  }

  #discardUncommittedStoreRoots(transaction: StoreRenderTransaction) {
    for (const store of transaction.stores) {
      if (
        !this.#liveStoreSubscriptions.has(store) &&
        (this.#candidateStoreHolds.get(store) ?? 0) === 0
      ) {
        store.detachRoot(this.#rootId);
      }
    }
  }

  #releaseCandidateStoreHolds(stores: ReadonlySet<AnyAsyncStore>) {
    for (const store of stores) {
      const count = this.#candidateStoreHolds.get(store) ?? 0;
      if (count > 1) {
        this.#candidateStoreHolds.set(store, count - 1);
        continue;
      }
      this.#candidateStoreHolds.delete(store);
      if (!this.#liveStoreSubscriptions.has(store)) {
        store.detachRoot(this.#rootId);
      }
    }
  }

  #dropPendingForOwner(owner: OwnerId) {
    this.#pendingChanges.dropOwner(owner);
  }

  #syncLastSourceValues(caches: ReadonlyMap<OwnerId, ComponentCache>) {
    if (this.#disposed) return;
    const live = new Set<ScalarSource>();
    for (const [owner, cache] of caches) {
      for (const site of cache.propBoundSites) {
        this.#sourceValueSyncVisits++;
        const source = this.world.scalarSource(owner, site);
        if (!source) continue;
        live.add(source);
        this.#lastSourceValues.set(source, source.value);
      }
    }
    for (const source of this.#lastSourceValues.keys()) {
      if (!live.has(source)) this.#lastSourceValues.delete(source);
    }
  }

  #syncOwnerSourceValues(
    owner: OwnerId,
    previous: ComponentCache,
    nextSites: ReadonlySet<string>,
  ) {
    for (const site of previous.propBoundSites) {
      if (nextSites.has(site)) continue;
      const source = this.world.scalarSource(owner, site);
      if (source) this.#lastSourceValues.delete(source);
    }
    for (const site of nextSites) {
      this.#sourceValueSyncVisits++;
      const source = this.world.scalarSource(owner, site);
      if (source) this.#lastSourceValues.set(source, source.value);
    }
  }

  #applyCandidateNumericWrites(writes: readonly CandidateNumericWrite[]) {
    const pending = writes.filter((write) =>
      this.world.isAlive(write.owner) &&
      this.world.scalarSource(write.owner, write.site) === write.source &&
      this.#vdom.hasBoundSource(write.source)
    );
    for (const write of pending) {
      if (this.world.version(write.owner, write.site) !== write.version) {
        throw new Error("Numeric source changed during candidate host commit");
      }
    }
    if (pending.length === 0) return;
    // VDOM validates and updates the batch's source values before calling any
    // writers. Refs and effects remain behind the candidate publication
    // barrier until this complete source-to-prop update succeeds.
    const updates = pending.map(({ source, current }) =>
      [source, current] as const
    );
    for (const write of pending) write.source.value = write.previous;
    try {
      this.#vdom.setSources(updates);
    } finally {
      // A writer can synchronously trigger another state update. Preserve
      // newer values; otherwise restore this candidate's captured snapshot.
      for (const write of pending) {
        if (
          this.world.isAlive(write.owner) &&
          this.world.version(write.owner, write.site) === write.version &&
          this.world.scalarSource(write.owner, write.site) === write.source
        ) write.source.value = write.current;
      }
    }
  }

  #flushNumericSources(
    changes: readonly import("./owner_state_world.ts").StateChange[],
    previousValues: ReadonlyMap<ScalarSource, number> = this.#lastSourceValues,
  ): boolean {
    const pending: Array<{
      change: import("./owner_state_world.ts").StateChange;
      source: ScalarSource;
      previous: number;
      current: number;
    }> = [];
    const seenSources = new Set<ScalarSource>();
    for (const change of changes) {
      const source = this.world.scalarSourceForChange(change);
      if (!source) return false;
      const previous = previousValues.get(source);
      if (previous === undefined) return false;
      if (seenSources.has(source)) continue;
      seenSources.add(source);
      pending.push({
        change,
        source,
        previous,
        current: source.value,
      });
    }
    // Resolve every source and its prior committed value before touching any
    // shared source handle. An unavailable binding can safely take fallback.
    const updates = pending.map(({ source, current }) =>
      [source, current] as const
    );
    for (const { source, previous } of pending) source.value = previous;
    try {
      // Host writers can fail after earlier writes. Propagate that failure
      // with state pending; fallback or retry could apply a second sequence.
      const wrote = this.#commitHostMutation(() =>
        this.#vdom.setSources(updates)
      );
      for (const { source, current } of pending) {
        this.#lastSourceValues.set(source, current);
      }
      return wrote || changes.length > 0;
    } finally {
      for (const write of pending) {
        if (
          this.world.isAlive(write.change.owner) &&
          this.world.versionForChange(write.change) === write.change.version &&
          this.world.scalarSourceForChange(write.change) === write.source
        ) write.source.value = write.current;
      }
    }
  }

  #clearNumericProgramBuffers() {
    for (let index = 0; index < this.#numericProgramUsedCount; index++) {
      this.#numericProgramSources[index] = undefined;
    }
    this.#numericProgramUsedCount = 0;
  }

  /** Capture exact published lane cells; null keeps the existing fallback cut. */
  #tryCommitNativeLanes(count: number): boolean | null {
    let accepted = false;
    try {
      for (let index = 0; index < count; index++) {
        const handle = this.#nativeCellHandles[index]!;
        const lane = this.world.numericLaneForCell(
          handle,
          this.#nativeCellVersions[index],
        );
        if (!lane) return null;
        let prepared = this.#nativeLanePrograms.get(lane);
        if (!prepared) {
          const source = this.world.scalarSourceForCell(handle);
          if (!source) return null;
          const token = this.#vdom.prepareNumericCellProgram(
            source,
            lane.column,
            lane.row,
          );
          if (!token) return null;
          prepared = { token, source };
          this.#nativeLanePrograms.set(lane, prepared);
        }
        this.#nativeLaneTokens[index] = prepared.token;
        this.#numericProgramSources[index] = prepared.source;
        this.#numericProgramCurrentValues[index] = lane.column.values[lane.row];
        this.#numericProgramUsedCount = index + 1;
      }
      let declined = false;
      let wrote = this.#commitHostMutation(() => {
        const result = this.#vdom.executePreparedNumericCells(
          this.#nativeLaneTokens,
          this.#numericProgramCurrentValues,
          count,
        );
        if (result === null) {
          declined = true;
          return false;
        }
        return result;
      });
      if (declined) {
        declined = false;
        // The VDOM preflight declined before changing sources, projecting,
        // or writing hosts. Refresh cached tokens and retry this exact cut
        // once, preserving the values captured above.
        for (let index = 0; index < count; index++) {
          const handle = this.#nativeCellHandles[index]!;
          const lane = this.world.numericLaneForCell(
            handle,
            this.#nativeCellVersions[index],
          );
          if (!lane) return null;
          this.#nativeLanePrograms.delete(lane);
          const source = this.world.scalarSourceForCell(handle);
          if (!source) return null;
          const token = this.#vdom.prepareNumericCellProgram(
            source,
            lane.column,
            lane.row,
          );
          if (!token) return null;
          this.#nativeLanePrograms.set(lane, { token, source });
          this.#nativeLaneTokens[index] = token;
          this.#numericProgramSources[index] = source;
        }
        wrote = this.#commitHostMutation(() => {
          const result = this.#vdom.executePreparedNumericCells(
            this.#nativeLaneTokens,
            this.#numericProgramCurrentValues,
            count,
          );
          if (result === null) {
            declined = true;
            return false;
          }
          return result;
        });
        // A repeated preflight decline preserves the generic fallback path.
        if (declined) return null;
      }
      accepted = true;
      this.#count("numeric.lane-batches");
      this.#count("numeric.lane-cells", count);
      if (!this.#disposed) {
        for (let index = 0; index < count; index++) {
          this.#lastSourceValues.set(
            this.#numericProgramSources[index]!,
            this.#numericProgramCurrentValues[index],
          );
        }
        this.world.clearCellChangesThrough(
          this.#nativeCellHandles,
          this.#nativeCellVersions,
          count,
        );
        this.#pendingChanges.clearNativeThrough(
          this.#nativeCellHandles,
          this.#nativeCellVersions,
          count,
        );
      }
      return wrote || count > 0;
    } finally {
      if (!accepted) this.#clearNumericProgramBuffers();
    }
  }

  /** Snapshot-free route for a fully native, compiler-approved numeric cut. */
  #tryFlushNativeCellCut(): boolean {
    const capacity = this.#pendingChanges.size;
    if (this.#nativeCellHandles.length < capacity) {
      this.#nativeCellHandles.length = capacity;
      this.#nativeCellVersions.length = capacity;
    }
    if (this.#nativeLaneTokens.length < capacity) {
      this.#nativeLaneTokens.length = capacity;
    }
    const count = this.#pendingChanges.captureNative(
      this.#nativeCellHandles,
      this.#nativeCellVersions,
    );
    if (count === null || count === 0) {
      this.#clearNativeCellCutBuffers();
      return false;
    }

    this.#nativeCellCutActive = true;
    let committed = false;
    try {
      const laneCommit = this.#tryCommitNativeLanes(count);
      if (laneCommit !== null) {
        committed = laneCommit;
        return committed;
      }
      for (let index = 0; index < count; index++) {
        const handle = this.#nativeCellHandles[index]!;
        const version = this.#nativeCellVersions[index];
        const cache = this.#componentCache.get(handle.owner);
        const source = this.world.scalarSourceForCell(handle);
        const currentVersion = this.world.versionForCell(handle);
        if (
          !cache || !this.#compiledPropSitesForCache(cache)?.has(handle.site) ||
          !source || !this.#lastSourceValues.has(source) ||
          !this.#vdom.hasSourceProgram(source) || currentVersion !== version
        ) return false;
        this.#numericProgramSources[index] = source;
        this.#numericProgramCurrentValues[index] = source.value;
        this.#numericProgramPreviousValues[index] = this.#lastSourceValues.get(
          source,
        )!;
        this.#numericProgramUsedCount = index + 1;
      }
      this.#count(
        "numeric.program-source-buffer-capacity",
        this.#numericProgramSources.length,
      );

      if (this.#invalidation) {
        for (let index = 0; index < count; index++) {
          const slot = this.#invalidation.sourceSlots.get(
            this.#nativeCellHandles[index]!.site,
          );
          if (slot !== undefined) {
            this.#invalidation.dispatcher.invalidateSourceSlot(slot);
          }
        }
        this.#invalidation.dispatcher.flush(() => {});
      }

      for (let index = 0; index < count; index++) {
        this.#numericProgramSources[index]!.value =
          this.#numericProgramPreviousValues[index];
      }
      try {
        const wrote = this.#commitHostMutation(() =>
          this.#vdom.executeSourceProgram(
            this.#numericProgramSources,
            this.#numericProgramCurrentValues,
            count,
          )
        );
        if (this.#disposed) return wrote || count > 0;
        for (let index = 0; index < count; index++) {
          const source = this.#numericProgramSources[index]!;
          this.#lastSourceValues.set(
            source,
            this.#numericProgramCurrentValues[index],
          );
        }
        this.world.clearCellChangesThrough(
          this.#nativeCellHandles,
          this.#nativeCellVersions,
          count,
        );
        this.#pendingChanges.clearNativeThrough(
          this.#nativeCellHandles,
          this.#nativeCellVersions,
          count,
        );
        committed = wrote || count > 0;
        return committed;
      } finally {
        for (let index = 0; index < count; index++) {
          const handle = this.#nativeCellHandles[index]!;
          const source = this.#numericProgramSources[index]!;
          if (
            !this.#disposed &&
            this.world.versionForCell(handle) ===
              this.#nativeCellVersions[index] &&
            this.world.scalarSourceForCell(handle) === source
          ) source.value = this.#numericProgramCurrentValues[index];
        }
      }
    } finally {
      this.#clearNumericProgramBuffers();
      this.#clearNativeCellCutBuffers(count);
      this.#nativeCellCutActive = false;
      if (this.#disposed) {
        this.#nativeCellHandles.length = 0;
        this.#nativeCellVersions.length = 0;
        this.#nativeLaneTokens.length = 0;
        this.#numericProgramSources.length = 0;
        this.#numericProgramCurrentValues.length = 0;
        this.#numericProgramPreviousValues.length = 0;
      } else if (
        !this.#terminalHostFailed &&
        (this.#deferredFlush || (committed && this.#hasPendingWork()))
      ) {
        this.#deferredFlush = false;
        this.#schedule();
      }
    }
  }

  #clearNativeCellCutBuffers(count = this.#nativeCellHandles.length) {
    for (let index = 0; index < count; index++) {
      this.#nativeCellHandles[index] = undefined;
      this.#nativeCellVersions[index] = 0;
      this.#nativeLaneTokens[index] = undefined;
    }
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
    subtreeOwnersByOwner: Map<OwnerId, Set<OwnerId>>,
    storeTransaction: StoreRenderTransaction,
    collectionOwnerScope?: string,
    collectionRowScopeKey?: string,
    ownerPreparation?: OwnerPreparation,
    captureBinding?: ActiveOwner["captureBinding"],
    resourceReads?: ResourceReadSet,
    expansionJournal?: ExpansionJournal,
    boundaryPrimaries?: Map<string, BoundaryPrimary>,
    boundaryState?: BoundaryRenderState,
    protectedBranch = false,
    boundaryHostScope?: OwnerId,
  ): RuntimeNode {
    if (
      node == null || node === false || typeof node === "string" ||
      typeof node === "number"
    ) return node;
    if (Array.isArray(node)) {
      const regionId = getKeyedOwnerRegionId(node);
      const version = getKeyedOwnerVersion(node);
      const collectionDescriptor = version === null
        ? undefined
        : collectionRegionDescriptors.get(version);
      const outputsByKey = version === null ||
          (this.#keyedOwnerReuseMode !== "token" && !collectionDescriptor)
        ? null
        : new Map<string, RuntimeNode>();
      const keysByOwner = outputsByKey ? new Map<OwnerId, string>() : null;
      let regionSiteId: string | null = collectionDescriptor?.componentSiteId ??
        null;
      let validRegion = outputsByKey !== null;
      const siteOrdinals = new Map<string, number>();
      let changed = false;
      const collectionKeys = collectionDescriptor
        ? [...collectionDescriptor.rows.keys()]
        : [];
      const siblingPending: unknown[] = [];
      const children = node.map((child, index) => {
        const childPath = `${path}/${index}`;
        const siteId = child && !Array.isArray(child) &&
            typeof child === "object" && child.type === Suspense
          ? `@suspense:${
            String(child.props.__nativeBoundarySite ?? "anonymous")
          }`
          : child && !Array.isArray(child) && typeof child === "object" &&
              typeof child.type === "function"
          ? getComponentSiteId(child.type)
          : "";
        const ordinal = siteId ? (siteOrdinals.get(siteId) ?? 0) : 0;
        if (siteId) siteOrdinals.set(siteId, ordinal + 1);
        const journalMark = protectedBranch
          ? expansionJournal?.checkpoint()
          : undefined;
        const ownerMark = protectedBranch
          ? ownerPreparation?.checkpoint()
          : undefined;
        const storeMark = protectedBranch
          ? storeTransaction.checkpoint()
          : undefined;
        let expanded: RuntimeNode;
        try {
          expanded = this.#expand(
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
            storeTransaction,
            collectionDescriptor?.siteId ?? collectionOwnerScope,
            collectionDescriptor
              ? !siteId ? collectionKeys[index] : undefined
              : collectionRowScopeKey,
            ownerPreparation,
            captureBinding,
            resourceReads,
            expansionJournal,
            boundaryPrimaries,
            boundaryState,
          );
        } catch (error) {
          if (
            !isPendingResource(error) && !(error instanceof ResourceRejection)
          ) throw error;
          if (storeMark === undefined) throw error;
          const branchReaders = storeMark === undefined
            ? new Map<string, ReadonlySet<AnyAsyncStore>>()
            : storeTransaction.readersSince(storeMark);
          if (ownerMark) ownerPreparation?.rollbackTo(ownerMark);
          if (storeMark !== undefined) {
            storeTransaction.rollbackTo(storeMark);
            if (branchReaders.size) {
              storeTransaction.preserveReaders(branchReaders);
            }
          }
          if (journalMark !== undefined) {
            expansionJournal?.rollback(journalMark);
          }
          if (error instanceof ResourceRejection) throw error;
          siblingPending.push(error);
          return child;
        } finally {
          if (storeMark !== undefined) {
            storeTransaction.releaseCheckpoint(storeMark);
          }
          if (ownerMark) ownerPreparation?.releaseCheckpoint(ownerMark);
        }
        if (expanded !== child) changed = true;
        if (outputsByKey && regionId !== null) {
          if (
            !child || Array.isArray(child) || typeof child !== "object" ||
            typeof child.type !== "function"
          ) {
            validRegion = false;
          } else {
            const childSiteId = getComponentSiteId(child.type);
            const rawKey = child.props.key;
            if (
              (collectionDescriptor
                ? regionSiteId !== null && regionSiteId !== childSiteId
                : childSiteId !== regionId) ||
              rawKey == null ||
              (regionSiteId !== null && regionSiteId !== childSiteId)
            ) {
              validRegion = false;
            } else {
              regionSiteId = childSiteId;
              const key = String(rawKey);
              const owner = (ownerPreparation as
                | (OwnerPreparation & {
                  findOwner?: OwnerStateWorld["findOwner"];
                })
                | undefined)?.findOwner?.(
                  parentOwner,
                  collectionDescriptor
                    ? collectionOwnerSite(
                      collectionDescriptor.siteId,
                      childSiteId,
                    )
                    : childSiteId,
                  key,
                ) ?? (ownerPreparation ? undefined : this.world.findOwner(
                  parentOwner,
                  collectionDescriptor
                    ? collectionOwnerSite(
                      collectionDescriptor.siteId,
                      childSiteId,
                    )
                    : childSiteId,
                  key,
                ));
              if (outputsByKey.has(key) || owner === undefined) {
                validRegion = false;
              } else {
                outputsByKey.set(key, expanded);
                keysByOwner?.set(owner, key);
              }
            }
          }
        }
        return expanded;
      });
      if (siblingPending.length) throw siblingPending[0];
      let collectedCollection: CollectionRegionCache | undefined;
      if (
        collectionDescriptor && collectionDescriptor.siteId === regionId &&
        collectionDescriptor.rows.size === children.length
      ) {
        const hostKeysByCollectionKey = new Map<string, string>();
        let index = 0;
        for (const collectionKey of collectionDescriptor.rows.keys()) {
          const hostKey = singleHostRootKey(children[index++] ?? null);
          if (hostKey !== null) {
            hostKeysByCollectionKey.set(collectionKey, hostKey);
          }
        }
        collectedCollection = {
          ...collectionDescriptor,
          parentOwner,
          parentHostKey: null,
          hostKeysByCollectionKey,
        };
        if (this.#collectedCollectionRegions) {
          if (expansionJournal) {
            expansionJournal.set(
              this.#collectedCollectionRegions,
              `${parentOwner}\u0000${collectedCollection.siteId}`,
              collectedCollection,
            );
          } else {this.#collectedCollectionRegions.set(
              `${parentOwner}\u0000${collectedCollection.siteId}`,
              collectedCollection,
            );}
        }
      }
      if (
        validRegion && outputsByKey && regionId !== null && version !== null &&
        (regionSiteId !== null || collectionDescriptor !== undefined) &&
        outputsByKey.size === node.length
      ) {
        const collected = {
          regionId,
          version,
          componentSiteId: regionSiteId ??
            collectionDescriptor?.componentSiteId ?? "",
          outputsByKey,
          keysByOwner: keysByOwner!,
          ...(collectedCollection &&
              !collectedCollection.requiresOwnerRender &&
              collectedCollection.componentSiteId
            ? { collection: collectedCollection }
            : {}),
        };
        if (this.#collectedKeyedRegions) {
          if (expansionJournal) {
            expansionJournal.set(
              this.#collectedKeyedRegions,
              parentOwner,
              collected,
            );
          } else this.#collectedKeyedRegions.set(parentOwner, collected);
        }
      }
      return changed ? copyKeyedOwnerMetadata(node, children) : node;
    }
    if (node.type === Suspense) {
      this.#everHadNativeBoundary = true;
      const props = node.props as NativeSuspenseProps;
      const siteId = props.__nativeBoundarySite || `@runtime-suspense:${path}`;
      const lastSegment = path.slice(path.lastIndexOf("/") + 1);
      const ordinal = Number(lastSegment.split("#").at(-1)) || 0;
      const identityKey = props.key == null
        ? `@slot:${siteId}:${ordinal}`
        : String(props.key);
      const ownerSite = `\u0000native-suspense:${siteId}`;
      const priorBoundaryOwner = ownerPreparation
        ? ownerPreparation.findOwner(parentOwner, ownerSite, identityKey)
        : this.world.findOwner(parentOwner, ownerSite, identityKey);
      const boundaryOwner = ownerPreparation
        ? ownerPreparation.resolveOwner(parentOwner, ownerSite, identityKey)
        : this.world.resolveOwner(parentOwner, ownerSite, identityKey);
      if (!priorBoundaryOwner && !ownerPreparation && expansionJournal) {
        expansionJournal.undo(() => {
          if (this.world.isAlive(boundaryOwner)) {
            this.world.destroyOwner(boundaryOwner);
          }
        });
      }
      if (!this.#liveOwners.has(boundaryOwner)) {
        if (expansionJournal) {
          expansionJournal.push(createdOwners, boundaryOwner);
        } else createdOwners.push(boundaryOwner);
      }
      if (expansionJournal) expansionJournal.add(nextOwners, boundaryOwner);
      else nextOwners.add(boundaryOwner);
      if (!subtreeOwnersByOwner.has(boundaryOwner)) {
        if (expansionJournal) {
          expansionJournal.set(
            subtreeOwnersByOwner,
            boundaryOwner,
            new Set([boundaryOwner]),
          );
        } else {subtreeOwnersByOwner.set(
            boundaryOwner,
            new Set([boundaryOwner]),
          );}
      }
      for (const ancestor of ownerPath) {
        const descendants = subtreeOwnersByOwner.get(ancestor);
        if (descendants) {
          if (expansionJournal) {
            expansionJournal.add(descendants, boundaryOwner);
          } else descendants.add(boundaryOwner);
        }
      }
      const boundaryKey = String(boundaryOwner);
      if (boundaryState && !boundaryState.visited.has(boundaryKey)) {
        boundaryState.visited.add(boundaryKey);
        expansionJournal?.undo(() => boundaryState.visited.delete(boundaryKey));
      }
      const branchJournal = expansionJournal ?? new ExpansionJournal();
      const recordBoundaryOutput = (output: RuntimeNode): RuntimeNode => {
        const cache: ComponentCache = {
          type: Suspense,
          hostKeyScope: identityKey,
          props: { ...props },
          result: props.children ?? null,
          expandedResult: output,
          subtreeOwners: new Set([boundaryOwner]),
          ownEffects: new Map(),
          propBoundSites: new Set(),
          nativeBoundary: true,
        };
        if (expansionJournal) {
          expansionJournal.set(nextComponentCache, boundaryOwner, cache);
        } else nextComponentCache.set(boundaryOwner, cache);
        return output;
      };
      const storeMark = storeTransaction.checkpoint();
      const ownerMark = ownerPreparation?.checkpoint();
      const journalMark = branchJournal.checkpoint();
      ownerPath.push(boundaryOwner);
      try {
        const primary = this.#expand(
          props.children ?? null,
          boundaryOwner,
          nextOwners,
          nextEffects,
          nextComponentCache,
          createdOwners,
          `${path}/suspense:${siteId}`,
          forceRender,
          dirtyOwners,
          relevantOwners,
          ownerPath,
          subtreeOwnersByOwner,
          storeTransaction,
          collectionOwnerScope,
          collectionRowScopeKey,
          ownerPreparation,
          captureBinding,
          resourceReads,
          branchJournal,
          boundaryPrimaries,
          boundaryState,
          true,
          boundaryOwner,
        );
        if (boundaryPrimaries) {
          const snapshot: BoundaryPrimary = {
            tree: props.children ?? null,
          };
          if (expansionJournal) {
            expansionJournal.set(boundaryPrimaries, boundaryKey, snapshot);
          } else boundaryPrimaries.set(boundaryKey, snapshot);
        }
        storeTransaction.releaseCheckpoint(storeMark);
        if (ownerMark) ownerPreparation?.releaseCheckpoint(ownerMark);
        return recordBoundaryOutput(primary);
      } catch (error) {
        if (
          !isPendingResource(error) && !(error instanceof ResourceRejection)
        ) {
          storeTransaction.releaseCheckpoint(storeMark);
          if (ownerMark) ownerPreparation?.releaseCheckpoint(ownerMark);
          throw error;
        }
        const suspendedReaders = storeTransaction.readersSince(storeMark);
        storeTransaction.rollbackTo(storeMark);
        storeTransaction.releaseCheckpoint(storeMark);
        if (ownerMark) {
          ownerPreparation?.rollbackTo(ownerMark);
          ownerPreparation?.releaseCheckpoint(ownerMark);
        }
        branchJournal.rollback(journalMark);
        if (suspendedReaders.size) {
          // The retained primary can read the same lexical sites from a
          // different source. Keep the suspended branch's dependencies under
          // boundary-scoped IDs so those reads cannot overwrite them. These
          // are subscription footprints only; they stage no selector history.
          const pendingReaderDependencies = new Map(
            [...suspendedReaders].map(([readerId, stores]) => [
              `\u0000suspense-pending:${boundaryKey}:${readerId}`,
              stores,
            ]),
          );
          storeTransaction.preserveReaders(pendingReaderDependencies);
        }
        const previous = boundaryPrimaries?.get(boundaryKey);
        if (isPendingResource(error) && previous) {
          // Retain the committed raw primary by evaluating it against this
          // candidate's current owner state and pinned store projection.
          const retainedStoreMark = storeTransaction.checkpoint();
          const retainedOwnerMark = ownerPreparation?.checkpoint();
          const retainedJournalMark = branchJournal.checkpoint();
          try {
            const retained = this.#expand(
              previous.tree,
              boundaryOwner,
              nextOwners,
              nextEffects,
              nextComponentCache,
              createdOwners,
              `${path}/suspense-retained:${siteId}`,
              forceRender,
              dirtyOwners,
              relevantOwners,
              ownerPath,
              subtreeOwnersByOwner,
              storeTransaction,
              collectionOwnerScope,
              collectionRowScopeKey,
              ownerPreparation,
              captureBinding,
              resourceReads,
              branchJournal,
              boundaryPrimaries,
              boundaryState,
              true,
              boundaryOwner,
            );
            // A successful retained re-expansion is already a complete read
            // of this candidate's pinned projection. Its actual current reads
            // define the retained branch dependencies, so conditional reads
            // removed by a draft update are released naturally.
            storeTransaction.releaseCheckpoint(retainedStoreMark);
            if (retainedOwnerMark) {
              ownerPreparation?.releaseCheckpoint(retainedOwnerMark);
            }
            return recordBoundaryOutput(retained);
          } catch (retainedError) {
            if (
              !isPendingResource(retainedError) &&
              !(retainedError instanceof ResourceRejection)
            ) {
              storeTransaction.releaseCheckpoint(retainedStoreMark);
              if (retainedOwnerMark) {
                ownerPreparation?.releaseCheckpoint(retainedOwnerMark);
              }
              throw retainedError;
            }
          }
          if (retainedOwnerMark) {
            ownerPreparation?.rollbackTo(retainedOwnerMark);
            ownerPreparation?.releaseCheckpoint(retainedOwnerMark);
          }
          storeTransaction.rollbackTo(retainedStoreMark);
          storeTransaction.releaseCheckpoint(retainedStoreMark);
          branchJournal.rollback(retainedJournalMark);
          if (boundaryState) boundaryState.blocked = true;
          return null;
        }
        const fallback = error instanceof ResourceRejection
          ? props.error?.(error.reason) ?? null
          : props.pending ?? props.fallback ?? null;
        const expandedFallback = this.#expand(
          fallback,
          boundaryOwner,
          nextOwners,
          nextEffects,
          nextComponentCache,
          createdOwners,
          `${path}/suspense-fallback:${siteId}`,
          forceRender,
          dirtyOwners,
          relevantOwners,
          ownerPath,
          subtreeOwnersByOwner,
          storeTransaction,
          collectionOwnerScope,
          collectionRowScopeKey,
          ownerPreparation,
          captureBinding,
          resourceReads,
          expansionJournal,
          boundaryPrimaries,
          boundaryState,
          protectedBranch,
          boundaryOwner,
        );
        return recordBoundaryOutput(expandedFallback);
      } finally {
        ownerPath.pop();
        if (!expansionJournal) branchJournal.clear();
      }
    }
    if (typeof node.type === "function") {
      if (this.#activeCounters) this.#count("owner.component-visits");
      const siteId = getComponentSiteId(node.type);
      const lastSegment = path.slice(path.lastIndexOf("/") + 1);
      const ordinal = Number(lastSegment.split("#").at(-1)) || 0;
      const ownerKey = keyedIdentity(node, siteId, ordinal);
      // Scope host keys only at native boundaries. Ordinary owner keys must
      // remain canonical so sparse keyed-region commits target the same hosts.
      const key = boundaryHostScope === undefined
        ? String(ownerKey)
        : `${boundaryHostScope}\u0000${String(ownerKey)}`;
      const ownerSite = collectionOwnerScope
        ? collectionOwnerSite(
          collectionRowScopeKey === undefined
            ? collectionOwnerScope
            : `${collectionOwnerScope}#row:${collectionRowScopeKey}`,
          siteId,
        )
        : siteId;
      const priorOwner = ownerPreparation ? undefined : this.world.findOwner(
        parentOwner,
        ownerSite,
        ownerKey,
      );
      const owner = ownerPreparation
        ? ownerPreparation.resolveOwner(
          parentOwner,
          ownerSite,
          ownerKey,
        )
        : this.world.resolveOwner(
          parentOwner,
          ownerSite,
          ownerKey,
        );
      if (!ownerPreparation && priorOwner === undefined && expansionJournal) {
        expansionJournal.undo(() => {
          if (this.world.isAlive(owner)) this.world.destroyOwner(owner);
        });
      }
      if (!this.#liveOwners.has(owner)) {
        if (expansionJournal) expansionJournal.push(createdOwners, owner);
        else createdOwners.push(owner);
        if (this.#activeCounters) this.#count("owner.created");
      }
      if (expansionJournal) expansionJournal.add(nextOwners, owner);
      else nextOwners.add(owner);
      if (!subtreeOwnersByOwner.has(owner)) {
        if (expansionJournal) {
          expansionJournal.set(subtreeOwnersByOwner, owner, new Set([owner]));
        } else subtreeOwnersByOwner.set(owner, new Set([owner]));
      }
      for (const ancestor of ownerPath) {
        const descendants = subtreeOwnersByOwner.get(ancestor);
        if (descendants) {
          if (expansionJournal) expansionJournal.add(descendants, owner);
          else descendants.add(owner);
        }
      }
      const { key: _key, ref: _ref, ...componentProps } = node.props;
      const cached = this.#componentCache.get(owner);
      const propsUnchanged = cached !== undefined &&
        shallowEqual(cached.props, componentProps);
      const shouldRender = forceRender || dirtyOwners.has(owner) || !cached ||
        cached.invalidatedByCollection === true ||
        cached.type !== node.type || !propsUnchanged;
      ownerPath.push(owner);
      try {
        if (
          !shouldRender && cached && !relevantOwners.has(owner) &&
          !cached.invalidatedBySparseStore
        ) {
          if (this.#activeCounters) {
            this.#count("owner.cached-reused", cached.subtreeOwners.size);
          }
          for (const cachedOwner of cached.subtreeOwners) {
            if (expansionJournal) expansionJournal.add(nextOwners, cachedOwner);
            else nextOwners.add(cachedOwner);
            const childCache = this.#componentCache.get(cachedOwner);
            if (!childCache) {
              throw new Error(
                `Missing component cache for owner ${cachedOwner}`,
              );
            }
            if (expansionJournal) {
              expansionJournal.set(nextComponentCache, cachedOwner, childCache);
            } else nextComponentCache.set(cachedOwner, childCache);
            if (childCache.nativeBoundary && boundaryState) {
              const boundaryKey = String(cachedOwner);
              if (!boundaryState.visited.has(boundaryKey)) {
                if (expansionJournal) {
                  expansionJournal.add(boundaryState.visited, boundaryKey);
                } else boundaryState.visited.add(boundaryKey);
              }
            }
            for (const [registeredKey, effect] of childCache.ownEffects) {
              if (expansionJournal) {
                expansionJournal.set(nextEffects, registeredKey, effect);
              } else nextEffects.set(registeredKey, effect);
            }
            if (cachedOwner !== owner) {
              for (const ancestor of ownerPath) {
                const descendants = subtreeOwnersByOwner.get(ancestor);
                if (descendants) {
                  if (expansionJournal) {
                    expansionJournal.add(descendants, cachedOwner);
                  } else descendants.add(cachedOwner);
                }
              }
            }
          }
          return cached.expandedResult;
        }

        let result = cached?.result;
        let ownEffects = cached?.ownEffects;
        let propBoundSites: ReadonlySet<string> = cached?.propBoundSites ??
          new Set();
        if (shouldRender) {
          const prepared = this.#preparedRenders.get(owner) ?? null;
          if (prepared) {
            result = prepared.result;
            ownEffects = prepared.ownEffects;
            propBoundSites = prepared.propBoundSites;
            for (const [registeredKey, effect] of ownEffects) {
              if (expansionJournal) {
                expansionJournal.set(nextEffects, registeredKey, effect);
              } else nextEffects.set(registeredKey, effect);
            }
          } else {
            ownEffects = new Map<string, EffectRegistration>();
            const nextPropBoundSites = new Set<string>();
            propBoundSites = nextPropBoundSites;
            activeOwners.push({
              world: ownerPreparation ?? this.world,
              owner,
              stateLayout: compiledStateLayoutFor(node.type),
              propBoundSites: nextPropBoundSites,
              readStore: (storeSiteId, source) =>
                storeTransaction.read(
                  source,
                  `${owner}\u0000${storeSiteId}`,
                ),
              readResource: (source) => {
                if (!resourceReads) {
                  throw new Error(
                    "Resource reads require a root resource candidate",
                  );
                }
                this.#everReadResource = true;
                return resourceReads.read(source);
              },
              captureBinding,
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
                if (expansionJournal) {
                  expansionJournal.set(nextEffects, key, registration);
                } else nextEffects.set(key, registration);
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
            if (expansionJournal) {
              expansionJournal.set(nextEffects, registeredKey, effect);
            } else nextEffects.set(registeredKey, effect);
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
          storeTransaction,
          undefined,
          undefined,
          ownerPreparation,
          captureBinding,
          resourceReads,
          expansionJournal,
          boundaryPrimaries,
          boundaryState,
          protectedBranch,
        );
        const collectedKeyedRegion = this.#collectedKeyedRegions?.get(owner);
        const collectionRegion = collectedKeyedRegion?.collection;
        if (collectionRegion) {
          const completeRegion = {
            ...collectionRegion,
            parentHostKey: singleHostRootKey(expandedResult),
          };
          if (this.#collectedCollectionRegions) {
            if (expansionJournal) {
              expansionJournal.set(
                this.#collectedCollectionRegions,
                `${owner}\u0000${completeRegion.siteId}`,
                completeRegion,
              );
            } else {this.#collectedCollectionRegions.set(
                `${owner}\u0000${completeRegion.siteId}`,
                completeRegion,
              );}
          }
          const updatedRegion = {
            ...collectedKeyedRegion,
            collection: completeRegion,
          };
          if (this.#collectedKeyedRegions) {
            if (expansionJournal) {
              expansionJournal.set(
                this.#collectedKeyedRegions,
                owner,
                updatedRegion,
              );
            } else this.#collectedKeyedRegions.set(owner, updatedRegion);
          }
        }
        const componentCache: ComponentCache = {
          type: node.type,
          hostKeyScope: key,
          props: componentProps,
          result: result ?? null,
          expandedResult,
          subtreeOwners: subtreeOwnersByOwner.get(owner) ?? new Set([owner]),
          ownEffects: ownEffects ?? new Map(),
          propBoundSites,
          ...(this.#collectedKeyedRegions?.get(owner)
            ? { keyedRegion: this.#collectedKeyedRegions.get(owner) }
            : {}),
        };
        if (expansionJournal) {
          expansionJournal.set(nextComponentCache, owner, componentCache);
        } else nextComponentCache.set(owner, componentCache);
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
      storeTransaction,
      collectionOwnerScope,
      collectionRowScopeKey,
      ownerPreparation,
      captureBinding,
      resourceReads,
      expansionJournal,
      boundaryPrimaries,
      boundaryState,
    );
    return children === node.props.children
      ? node
      : { ...node, props: { ...node.props, children } };
  }

  #assertActive() {
    if (this.#disposed) throw new Error("ComponentStateRoot is disposed");
    if (this.#terminalHostFailed) {
      throw new Error(
        "ComponentStateRoot cannot continue after a host commit failure",
        { cause: this.#terminalHostFailure },
      );
    }
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
