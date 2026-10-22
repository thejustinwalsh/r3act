import { normalizeClosedNumericExpression } from "./closed_numeric_expression.ts";
import {
  type ClosedCollectionRowProgram,
  captureClosedCollectionRowInputs,
  evaluateClosedCollectionRowProgram,
  normalizeClosedCollectionRowProgram,
} from "./closed_collection_row_program.ts";
import {
  type ClosedComponentForwardProgram,
  normalizeClosedComponentForwardProgram,
} from "./closed_component_forward_program.ts";
import {
  type ClosedStoreHostProgram,
  type ClosedStoreHostOutput,
  closedStoreHostInputs,
  closedStoreHostInputPaths,
  evaluateClosedStoreHostProgram,
  evaluateClosedStoreHostTree,
  normalizeClosedStoreHostProgram,
} from "./closed_store_host_program.ts";
import {
  type ClosedStoreNumericKernel, normalizeClosedStoreNumericKernel,
} from "./closed_store_numeric_kernel.ts";
import {
  type ClosedStoreDataExecution,
  type NormalizedClosedStoreDataExecution,
  type OwnedClosedStoreOutputRow,
  type BoundClosedStoreOutputRequest,
  type OwnedClosedStoreOutputRequest,
  bindOwnedClosedStoreOutputRequest,
  evaluateClosedStoreDataExecution,
  inspectClosedStoreDataExecution,
  normalizeClosedStoreDataExecution,
  prepareOwnedClosedStoreOutputs,
  createOwnedClosedFrameRequests,
  materializeOwnedScalarStorePropDelta,
  createOwnedScalarStorePropDelta,
} from "./closed_store_execution.ts";
import { type OwnedScalarFrame, type OwnedScalarOutputCounts } from "./closed_scalar_output.ts";
import { materializeOwnedScalarRuntimeElement } from "./jsx_binding_runtime.ts";
import type { ClosedHostTreeNode } from "./closed_host_tree.ts";
import type { ClosedHostOutputValue } from "./closed_host_value.ts";
import {
  type ClosedResourceHostProgram,
  evaluateClosedResourceHostProgram,
  normalizeClosedResourceHostProgram,
} from "./closed_resource_host_program.ts";
import {
  captureCompiledSemanticRevision,
  type CompiledSemanticRevisionToken,
  isCompiledSemanticRevisionCurrent,
  subscribeCompiledSemanticRevision,
} from "./compiled_semantic_plan.ts";
import {
  type AcceptedStoreReaderReceipt,
  type AnyAsyncStore,
  acknowledgeCanonicalStoreReaderCohort,
  AsyncStore,
  type BlockedStoreReaderReceipt,
  captureCanonicalBlockedStoreReaderReceipt,
  captureCanonicalStoreReaderReceipt,
  inspectCanonicalBlockedStoreReaderReceipt,
  inspectCanonicalStoreReaderReceipt,
  StoreRenderTransaction,
  inspectCanonicalClosedStorePublication,
  prepareCanonicalClosedStorePublicationAfterHost,
  prepareCanonicalClosedStorePublication,
  readOwnedClosedStoreCaptureCounts,
  type StoreSource,
  validateCanonicalClosedStorePhase,
} from "./async_store_runtime.ts";
import {
  AsyncResource,
  AsyncResourceTable,
  isPendingResourceToken,
  ResourceRejection,
} from "./async_resource_runtime.ts";
import {
  canonicalResourceVersion,
  closedResourceStatus,
  ResourceReadSet,
} from "./resource_read_set.ts";
import { captureClosedProjectionValues } from "./owned_store_record.ts";
import { snapshotScopedHostProp } from "./scoped_host_values.ts";
import {
  assertHostPublicationClaim,
  createHostPublicationClaim,
  hostPublicationDomain,
  type HostPublicationClaim,
  type HostPublicationDomain,
  isHostPublicationDomainBusy,
  quarantineHostPublicationDomains,
  releaseHostPublicationDomains,
  subscribeHostPublicationAvailability,
  tryClaimHostPublicationDomains,
} from "./host_publication_domain.ts";
import { PendingStateChanges } from "./pending_state_changes.ts";
import type {
  CompiledOwnerUpdateProgram,
  CompiledStateLayout,
  NumericLaneAddress,
} from "./compiled_state_layout.ts";
import {
  associateCompiledOwnerUpdateProgram,
  compiledStateLayoutSlot,
  normalizeCompiledStateLayout,
} from "./compiled_state_layout.ts";
export type {
  CompiledOwnerUpdateProgram,
  CompiledStateLayout,
} from "./compiled_state_layout.ts";
import {
  type NumericCellRowView,
  type OwnerId,
  type OwnerKey,
  type OwnerPreparation,
  OwnerStateWorld,
  type StateAction,
  type StateCellHandle,
  canRetireOwnedWorldOwner,
  captureOwnedClosedWorldInputs,
  createClosedWorldCellCut,
  validateCanonicalClosedWorldPhase,
  validateClosedWorldCellCut,
  type ClosedWorldCellCut,
  retireOwnedWorldOwner,
} from "./owner_state_world.ts";
import {
  bindSources,
  bindStateSource,
  canRebindCapturedBindingSources,
  canonicalScalarSourceValue,
  type BoundValue,
  type ComponentType,
  copyKeyedOwnerMetadata,
  copyRuntimeElement,
  copyRuntimeElementFromEntries,
  copyRuntimeElementWithGeneratedHostKey,
  createKeyedOwnerVersion,
  Fragment,
  getComponentOutputOwner,
  hasGeneratedHostKey,
  getKeyedOwnerRegionId,
  getKeyedOwnerVersion,
  isRuntimeOwnedElement,
  keyedOwnerChildren,
  markSuspenseRevealAdoption,
  type NumericBindingProgramDescriptor,
  type NumericBindingProgramDescriptorV1,
  type NumericBindingProgramDescriptorV2,
  type RuntimeElement,
  type RuntimeNode,
  type ScalarSource,
  rebindCapturedBindingSources,
  stampComponentOutput,
} from "./jsx_binding_runtime.ts";
import {
  type PreparedNumericCellProgram,
  type PreparedNumericRowProgram,
  type PreparedVDOMCommit,
  type RuntimeCounterCallback,
  type RuntimeProfileCallback,
  type StorePropDelta,
  type VDOMHost,
  type VDOMKeyIndexMaintenance,
  VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";
import {
  DerivedRegionDispatcher,
  type DerivedRegionGraph,
} from "./derived_region_runtime.ts";
import {
  canonicalCollectionApiIntact,
  canonicalCollectionEntry,
  canonicalCollectionVersion,
  prepareCollectionReaderAcknowledgement,
  type KeyedCollection,
  type KeyedCollectionBatch,
  type KeyedCollectionOperation,
} from "./keyed_collection.ts";

const canonicalStoreForNumericKernel = AsyncStore.prototype._isClosedNumericCanonical;
const ownDataDescriptor = Object.getOwnPropertyDescriptor;
const canonicalSetForEach = Set.prototype.forEach;
const canonicalSetHas = Set.prototype.has;
const collectCleanupErrors = (actions: readonly (() => void)[]): unknown[] => {
  const errors: unknown[] = [];
  for (const action of actions) {
    try { action(); } catch (error) { errors.push(error); }
  }
  return errors;
};
const throwWithCleanup = (error: unknown, errors: readonly unknown[]): never => {
  if (errors.length) {
    throw new AggregateError([error, ...errors], "Publication and cleanup failed");
  }
  throw error;
};

const sameClosedHostOutput = (
  tag: string, name: string, previous: unknown, next: unknown,
): boolean => {
  if (Object.is(previous, next)) return true;
  try {
    const oldValue = snapshotScopedHostProp(tag, name, previous);
    const newValue = snapshotScopedHostProp(tag, name, next);
    if (!oldValue.accepted || !newValue.accepted) return false;
    const old = oldValue.value, proposed = newValue.value;
    if (Object.is(old, proposed)) return true;
    if (Array.isArray(old) && Array.isArray(proposed)) {
      return old.length === proposed.length &&
        old.every((value, index) => Object.is(value, proposed[index]));
    }
    if (old && proposed && typeof old === "object" && typeof proposed === "object") {
      const keys = Object.keys(old);
      return keys.length === Object.keys(proposed).length &&
        keys.every((key) => Object.hasOwn(proposed, key) &&
          Object.is((old as Record<string, unknown>)[key],
            (proposed as Record<string, unknown>)[key]));
    }
    return false;
  } catch {
    return false;
  }
};

type ComponentRegistration = Readonly<{
  siteId: string;
  metadata?: ComponentMetadata;
}>;
const componentRegistration = Symbol("compiled-component-registration");
const definedComponents = new WeakMap<Function, ComponentRegistration>();
class SparseCandidateIneligible extends Error {}
class HeldPublicationWait extends Error {
  constructor(readonly resource: AsyncResource<void>) { super("Publication is held"); }
}
type EffectCleanup = () => void;
type DirectTreeIntent = {
  tree: RuntimeNode;
  releaseStoreLease: (() => void) | null;
  attemptedStoreGeneration: number | null;
};
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
  validatePostHost(): boolean;
  preparePublication(): void;
  publish(privateWorld?: boolean): void;
  installSubscriptions(): unknown[];
  runEffects(): void;
  discard(): void;
  failGroup(error: unknown): void;
};
type CandidateLifecycleCore = Pick<NativeRootCandidate<unknown, unknown>,
  "validate" | "commitHost" | "validatePostHost" | "preparePublication" |
  "publish" | "installSubscriptions" | "runEffects" | "discard" | "failGroup"> & {
  commitAdmitted(): void;
};
const groupPublicationReceipts = new WeakMap<object, {
  preHostCurrent(): boolean;
  commitAdmitted(): void;
  current(): boolean;
  accept(): void;
  canonicalPostHostEligible(): boolean;
  prepareCanonicalPostHost(): void;
  domain: HostPublicationDomain;
  bindClaim(
    claim: HostPublicationClaim,
    entered: () => void,
    groupWasPartial: () => boolean,
  ): void;
}>();

/** Recheck every private cut after the last grouped caller callback. */
export const admitPreparedNativeGroup = <H, Parent>(
  candidates: readonly NativeRootCandidate<H, Parent>[],
): boolean => candidates.every((candidate) =>
  groupPublicationReceipts.get(candidate)?.preHostCurrent() === true
);

/** Apply one already-admitted group member with live continuation checks. */
export const commitAdmittedNativeCandidate = <H, Parent>(
  candidate: NativeRootCandidate<H, Parent>,
): void => {
  const receipt = groupPublicationReceipts.get(candidate);
  if (!receipt) throw new Error("Native candidate has no live publication receipt");
  receipt.commitAdmitted();
};

class HostPublicationBusyError extends Error {
  constructor() { super("Host publication domain is busy"); }
}

export class UnsupportedGroupOpaqueFreshnessError extends Error {
  constructor(kind = "input") {
    super(`Grouped host admission requires canonical freshness for opaque ${kind}`);
  }
}

const rootHostPublicationDomain = Symbol("native.root.host-publication-domain");

export const isNativeRootHostPublicationBusy = (
  root: ComponentStateRoot<any, any>,
): boolean => isHostPublicationDomainBusy(root[rootHostPublicationDomain]());

export const subscribeNativeRootHostPublication = (
  root: ComponentStateRoot<any, any>,
  callback: () => void,
): (() => void) => subscribeHostPublicationAvailability(
  [root[rootHostPublicationDomain]()], callback,
);

type ClaimedNativeGroup = {
  status: "claimed";
  release(): void;
  quarantine(error: unknown): boolean;
};
type BusyNativeGroup = {
  status: "busy";
  subscribe(callback: () => void): () => void;
};

/** Claim every host touched by one prepared native group before its first write. */
export const claimPreparedNativeGroup = <H, Parent>(
  candidates: readonly NativeRootCandidate<H, Parent>[],
): ClaimedNativeGroup | BusyNativeGroup => {
  const receipts = candidates.map((candidate) => groupPublicationReceipts.get(candidate));
  if (receipts.some((receipt) => !receipt)) {
    throw new Error("Native candidate has no live publication receipt");
  }
  const domains = [...new Set(receipts.map((receipt) => receipt!.domain))];
  const claim = createHostPublicationClaim();
  if (tryClaimHostPublicationDomains(domains, claim) === "busy") {
    return {
      status: "busy",
      subscribe: (callback) => subscribeHostPublicationAvailability(domains, callback),
    };
  }
  const touched = new Set<HostPublicationDomain>();
  for (const receipt of receipts) {
    receipt!.bindClaim(
      claim,
      () => { touched.add(receipt!.domain); },
      () => touched.size > 0,
    );
  }
  let released = false;
  return {
    status: "claimed",
    release: () => {
      if (released) return;
      released = true;
      releaseHostPublicationDomains(domains, claim);
    },
    quarantine: (error) => {
      if (!touched.size) return false;
      quarantineHostPublicationDomains([...touched], claim, error);
      return true;
    },
  };
};

/** Accept a prepared group using only its private final admission receipts. */
export const publishPreparedNativeGroup = <H, Parent>(
  candidates: readonly NativeRootCandidate<H, Parent>[],
): void => {
  const receipts = candidates.map((candidate) => groupPublicationReceipts.get(candidate));
  if (receipts.some((receipt) => !receipt) ||
    receipts.some((receipt) => !receipt!.current())) {
    throw new Error("Native candidate became stale before grouped publication");
  }
  for (const receipt of receipts) receipt!.accept();
};

/** Prepare a proven owned Store group after every public posthost check. */
export const prepareCanonicalNativeGroup = <H, Parent>(
  candidates: readonly NativeRootCandidate<H, Parent>[],
): boolean => {
  const receipts = candidates.map((candidate) => groupPublicationReceipts.get(candidate));
  if (receipts.some((receipt) => !receipt?.canonicalPostHostEligible())) return false;
  for (const receipt of receipts) receipt!.prepareCanonicalPostHost();
  return true;
};
type BoundaryPrimary = {
  tree: RuntimeNode;
};
type HeldGenericBoundary = {
  cache: ComponentCache;
  resource: AsyncResource<any>;
  parked?: {
    subscription: {
      unsubscribe: () => void;
      boundary: OwnerId | null;
      blockedReaders?: readonly SubscribedBlockedStoreReaderWitness[];
    };
    witnesses: readonly SubscribedBlockedStoreReaderWitness[];
    ancestorControlsCurrent: () => boolean;
    ancestorOwners: ReadonlySet<OwnerId>;
    ancestorCaches: ReadonlyMap<OwnerId, ComponentCache | undefined>;
    ancestorReaders: ReadonlyMap<string, {
      membership: ReadonlySet<AnyAsyncStore>;
      receipts: ReadonlyMap<AnyAsyncStore, AcceptedStoreReaderReceipt>;
    }>;
    propsCurrent?: () => boolean;
    ownerCaches: ReadonlyMap<OwnerId, ComponentCache>;
    lineages: ReadonlyMap<OwnerId, readonly OwnerId[]>;
  };
};
type HeldGenericState = {
  kind: "explicit" | "parked";
  holds: ReadonlyMap<() => void, object>;
  boundaries: ReadonlyMap<OwnerId, HeldGenericBoundary>;
  readers: ReadonlyMap<string, {
    membership: ReadonlySet<AnyAsyncStore>;
    receipts: ReadonlyMap<AnyAsyncStore, AcceptedStoreReaderReceipt>;
  }>;
};
type BoundaryRenderState = {
  blocked: boolean;
  visited: Set<string>;
  held?: HeldGenericState;
  retained?: Set<OwnerId>;
  suspendedStoreReaders?: SuspendedStoreReader[];
  /** Candidate-local clean cache views for marked reveal output paths. */
  cleanRevealOutputs?: WeakMap<object, RuntimeNode>;
};
type SuspendedStoreReader = {
  resource: AsyncResource<any>;
  boundaryOwner: OwnerId;
  pendingId: string;
  originalId: string;
  store: AnyAsyncStore;
};
type BlockedStoreReaderWitness = SuspendedStoreReader & {
  receipt: BlockedStoreReaderReceipt;
};
type SubscribedBlockedStoreReaderWitness = BlockedStoreReaderWitness & {
  acceptedBoundaryCache: ComponentCache;
  acceptedOwnerCache: ComponentCache;
};

const cleanRevealOutput = (
  state: BoundaryRenderState | undefined, output: RuntimeNode,
): RuntimeNode => output !== null && typeof output === "object"
  ? state?.cleanRevealOutputs?.get(output) ?? output : output;

const sameClosedBoundaryNode = (left: unknown, right: unknown, depth = 0): boolean => {
  if (Object.is(left, right)) return true;
  if (depth > 32 || !isRuntimeOwnedElement(left) ||
    !isRuntimeOwnedElement(right)) return false;
  const leftType = Object.getOwnPropertyDescriptor(left, "type")?.value;
  const rightType = Object.getOwnPropertyDescriptor(right, "type")?.value;
  const leftProps = Object.getOwnPropertyDescriptor(left, "props")?.value;
  const rightProps = Object.getOwnPropertyDescriptor(right, "props")?.value;
  if (leftType !== rightType || !leftProps || !rightProps ||
    Object.getPrototypeOf(leftProps) !== Object.prototype ||
    Object.getPrototypeOf(rightProps) !== Object.prototype ||
    !Object.isFrozen(leftProps) || !Object.isFrozen(rightProps)) return false;
  const leftKeys = Reflect.ownKeys(leftProps);
  const rightKeys = Reflect.ownKeys(rightProps);
  if (leftKeys.length !== rightKeys.length || leftKeys.length > 64) return false;
  return leftKeys.every((key, index) => {
    if (key !== rightKeys[index]) return false;
    const a = Object.getOwnPropertyDescriptor(leftProps, key);
    const b = Object.getOwnPropertyDescriptor(rightProps, key);
    return !!a && !!b && "value" in a && "value" in b &&
      sameClosedBoundaryNode(a.value, b.value, depth + 1);
  });
};
const sameClosedBoundaryProps = (
  element: RuntimeElement, accepted: Record<string, unknown>,
): boolean => {
  if (!isRuntimeOwnedElement(element)) return false;
  const props = Object.getOwnPropertyDescriptor(element, "props")?.value;
  if (!props || Object.getPrototypeOf(props) !== Object.prototype ||
    Object.getPrototypeOf(accepted) !== Object.prototype ||
    !Object.isFrozen(props)) return false;
  const keys = Reflect.ownKeys(props);
  const acceptedKeys = Reflect.ownKeys(accepted);
  if (keys.length !== acceptedKeys.length || keys.length > 64) return false;
  return keys.every((key, index) => {
    if (key !== acceptedKeys[index]) return false;
    const current = Object.getOwnPropertyDescriptor(props, key);
    const previous = Object.getOwnPropertyDescriptor(accepted, key);
    return !!current && !!previous && "value" in current &&
      "value" in previous &&
      sameClosedBoundaryNode(current.value, previous.value);
  });
};
type PreparedRender = {
  owner: OwnerId;
  result: RuntimeNode;
  ownEffects: Map<string, EffectRegistration>;
  propBoundSites: ReadonlySet<string>;
  readonly numericStateAdmitted: boolean;
};
type ComponentCache = {
  type: RuntimeElement["type"];
  hostKeyScope: OwnerKey;
  readonly scopeExplicitHostKeys?: boolean;
  props: Record<string, unknown>;
  readonly numericPropsAdmitted?: boolean;
  readonly retainedStoreChildAdmitted?: boolean;
  readonly numericStateAdmitted?: boolean;
  readonly collectionPropsOwned?: boolean;
  readonly collectionEntry?: object;
  output: ComponentOutput;
  subtreeOwners: ReadonlySet<OwnerId>;
  ownEffects: Map<string, EffectRegistration>;
  propBoundSites: ReadonlySet<string>;
  nativeBoundary?: boolean;
  pendingResource?: AsyncResource<any>;
  invalidatedByCollection?: boolean;
  /** A sparse keyed host commit changed a descendant output in this snapshot. */
  invalidatedBySparseStore?: boolean;
  keyedRegion?: KeyedRegionCache;
};

type ScalarOutputTemplate = Readonly<{ tag: string; key: string;
  owner: OwnerId; children?: RuntimeNode }>;
type ComponentOutput =
  | Readonly<{ kind: "ordinary"; authored: RuntimeNode;
    expanded: RuntimeNode; shape?: ClosedStoreOutputShape;
    scalarPlan?: import("./vdom_snapshot_runtime.ts").MountedScalarStorePlan }>
  | Readonly<{ kind: "scalar"; frame: OwnedScalarFrame;
    authoredTemplate: ScalarOutputTemplate;
    expandedTemplate: ScalarOutputTemplate;
    expandedValid: boolean; shape?: ClosedStoreOutputShape;
    scalarPlan?: import("./vdom_snapshot_runtime.ts").MountedScalarStorePlan }>;
const ordinaryOutput = (authored: RuntimeNode, expanded: RuntimeNode,
  shape?: ClosedStoreOutputShape,
  scalarPlan?: import("./vdom_snapshot_runtime.ts").MountedScalarStorePlan): ComponentOutput =>
  Object.freeze({ kind: "ordinary" as const, authored, expanded, shape,
    scalarPlan });
const cacheOutputView = (cache: ComponentCache, expanded: boolean,
  counts?: OwnedScalarOutputCounts): RuntimeNode => {
  const output = cache.output;
  if (output.kind === "ordinary") return expanded ? output.expanded : output.authored;
  if (expanded && !output.expandedValid) return null;
  return materializeOwnedScalarRuntimeElement(output.frame,
    expanded ? output.expandedTemplate : output.authoredTemplate, counts);
};
const invalidatedOutput = (output: ComponentOutput): ComponentOutput =>
  output.kind === "ordinary"
    ? ordinaryOutput(output.authored, null)
    : Object.freeze({ ...output, expandedValid: false,
      expandedTemplate: Object.freeze({ tag: output.expandedTemplate.tag,
        key: output.expandedTemplate.key,
        owner: output.expandedTemplate.owner }),
      shape: undefined, scalarPlan: undefined });

type ClosedStoreOutputShape = Readonly<{
  program: ClosedStoreHostProgram;
  owner: OwnerId;
  cacheProps: ComponentCache["props"];
  hostKey: string;
  tag: string;
  boundRequest?: BoundClosedStoreOutputRequest;
  boundExecution?: NormalizedClosedStoreDataExecution;
  boundInputs?: readonly Readonly<{ id: string; prop: string;
    source: AnyAsyncStore; store: AnyAsyncStore;
    membership: Set<AnyAsyncStore> }>[];
}>;

const canAdoptBareSuspenseFallback = (
  boundaryOwner: OwnerId,
  accepted: ComponentCache | undefined,
  next: RuntimeNode,
  childOwner: OwnerId,
): next is RuntimeElement => {
  if (!accepted?.nativeBoundary || !accepted.pendingResource ||
    accepted.subtreeOwners.size !== 1 ||
    !accepted.subtreeOwners.has(boundaryOwner) ||
    !isRuntimeOwnedElement(next)) return false;
  const previous = cacheOutputView(accepted, true);
  if (!isRuntimeOwnedElement(previous)) return false;
  if (typeof previous.type !== "string" || previous.type !== next.type ||
    getComponentOutputOwner(previous) !== undefined ||
    getComponentOutputOwner(next) !== childOwner) return false;
  const oldKey = Object.getOwnPropertyDescriptor(previous.props, "key");
  const newKey = Object.getOwnPropertyDescriptor(next.props, "key");
  if (!oldKey || !newKey || !("value" in oldKey) || !("value" in newKey)) {
    return false;
  }
  const canonicalKey = (value: unknown): string | null =>
    typeof value === "string" || typeof value === "number"
      ? String(value) : null;
  const expectedKey = canonicalKey(oldKey.value);
  return expectedKey !== null && expectedKey === canonicalKey(newKey.value);
};
type CandidateNumericWrite = {
  readonly owner: OwnerId;
  readonly site: string;
  readonly source: ScalarSource;
  readonly version: number;
  readonly previous: number;
  readonly current: number;
};
type MixedCandidateNumericWrite = CandidateNumericWrite & {
  readonly change: import("./owner_state_world.ts").StateChange;
};
type RetainedCellWrite = {
  handle: StateCellHandle;
  source: ScalarSource;
  version: number;
  value: number;
};
type ClosedStoreOutputCut = {
  readonly owners: ReadonlySet<OwnerId>;
  readonly regions: readonly (StorePropDelta | import("./vdom_snapshot_runtime.ts").OwnedScalarStoreRegion)[];
  readonly scalarPlans: readonly (import("./vdom_snapshot_runtime.ts").MountedScalarStorePlan | null)[];
  setScalarSuccessors(plans: readonly (import("./vdom_snapshot_runtime.ts").MountedScalarStorePlan | null)[] | undefined): void;
  readonly inputStores: ReadonlySet<AnyAsyncStore>;
  readonly inputCells: readonly StateCellHandle[];
  readonly inputCellWrites: readonly RetainedCellWrite[];
  readonly producerCellCut: ClosedWorldCellCut | null;
  readonly ordinaryScalar: boolean;
  readonly deferredValidation: boolean;
  useExternalCellCut(cut: ClosedWorldCellCut): void;
  readonly inputResources: ReadonlySet<AsyncResource<any>>;
  current(): boolean;
  storeCurrent(afterHost?: boolean): boolean;
  privateCurrent(): boolean;
  postHostCurrent(): boolean;
  postHostPrivateCurrent(): boolean;
  privatePreparedCurrent(): boolean;
  publish(): void;
  release(): void;
};
type CandidateLifecycleSpec<H, Parent> = {
  baseVersion: number;
  baseVDOMVersion: number;
  scope?: { kind: "retained" } | { kind: "keyed"; versionDelta: 0 | 1 };
  stores: StoreRenderTransaction;
  transitions: readonly string[];
  pendingResources: readonly AsyncResource<any>[];
  blocked: boolean;
  permitPendingDirectIntent?: () => boolean;
  permitHeldFullCandidate?: () => boolean;
  admissionCurrent?(): boolean;
  codeCurrent(): boolean;
  validationStrategy?: { kind: "owned-scalar-immediate";
    preflightPrepared(): boolean; preflightPostHost(): boolean };
  referencesCompiledSource?: (sourceFile: string) => boolean;
  validatePrepared(): boolean;
  validatePreparedPrivate(): boolean;
  validateAdmittedContinuation?(): boolean;
  validatePostHost(): boolean;
  canonicalGroupPostHost?: { eligible(): boolean; prepare(): void };
  finalGroupCurrent(): boolean;
  commitHost(): void;
  commitHostAdmitted(): void;
  preparePublication(): void;
  publish(): void;
  accepted?(): void;
  installSubscriptions(): readonly unknown[];
  runEffects(): readonly unknown[];
  discard(): void;
  releaseArtifacts(published: boolean): void;
  effectFailureMessage: string;
};
type KeyedRegionCache = {
  regionId: string;
  version: object;
  componentSiteId: string;
  siteScope?: string;
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
  rows: Map<string, Readonly<{ node: RuntimeNode; entry?: object }>>;
  snapshotVersion: number;
  requiresOwnerRender: boolean;
  ownerInputsAdmitted: boolean;
};
type CollectionRegionCache = CollectionRegionDescriptor<any> & {
  parentOwner: OwnerId;
  parentHostKey: string | null;
  siteScope?: string;
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
  numericStateReadsPrimitive: boolean;
  collectionPropsOwned?: boolean;
  collectionProps?: Record<string, unknown>;
  collectionSites?: readonly string[];
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
    readonly numericPrimitiveProps?: readonly string[];
    readonly numericRetainedProps?: readonly string[];
    readonly closedCollectionSites?: readonly string[];
    readonly closedCollectionRowPrograms?: readonly unknown[];
    /** Compiler proof that every render result is a single intrinsic host root. */
    readonly hostLeafOutput?: boolean;
    readonly stateLayout?: CompiledStateLayout;
    readonly ownerUpdateProgram?: CompiledOwnerUpdateProgram;
    readonly closedResourceHostProgram?: ClosedResourceHostProgram;
    readonly closedStoreHostProgram?: ClosedStoreHostProgram;
    readonly closedStoreNumericKernel?: ClosedStoreNumericKernel;
    readonly closedStoreExecution?: ClosedStoreDataExecution;
    readonly closedComponentForwardProgram?: ClosedComponentForwardProgram;
  },
): ComponentType<P> => {
  if (siteId.length === 0) throw new Error("Component site ID must not be empty");
  if (siteId.includes("\u0000")) {
    throw new Error("Component site ID cannot contain NUL");
  }
  const priorDefinition = definedComponents.get(render);
  if (priorDefinition && priorDefinition.siteId === siteId &&
    !metadata && !priorDefinition.metadata &&
    siteId.lastIndexOf("#component:") < 0) return render;
  if (priorDefinition) {
    throw new TypeError("Component function is already registered");
  }
  const moduleEnd = siteId.lastIndexOf("#component:");
  let normalizedMetadata: ComponentMetadata | undefined;
  if (metadata || moduleEnd >= 0) {
    const propOnlySites = [...(metadata?.propOnlySites ?? [])];
    if (propOnlySites.some((site) => typeof site !== "string" || !site)) {
      throw new Error(
        "Component prop-only metadata contains an invalid state site ID",
      );
    }
    if (metadata?.numericPrimitiveProps !== undefined &&
      !Array.isArray(metadata.numericPrimitiveProps)) {
      throw new Error("Component numeric primitive prop metadata is invalid");
    }
    const numericPrimitiveProps = metadata?.numericPrimitiveProps === undefined
      ? undefined : [...metadata.numericPrimitiveProps];
    if (numericPrimitiveProps?.some((name) =>
      typeof name !== "string" || !name || name === "key" || name === "ref"
    )) {
      throw new Error("Component numeric primitive prop metadata is invalid");
    }
    if (metadata?.numericRetainedProps !== undefined &&
      !Array.isArray(metadata.numericRetainedProps)) {
      throw new Error("Component numeric retained prop metadata is invalid");
    }
    const numericRetainedProps = metadata?.numericRetainedProps === undefined
      ? undefined : [...metadata.numericRetainedProps];
    if (numericRetainedProps &&
      (numericRetainedProps.some((name) => name !== "children") ||
        new Set(numericRetainedProps).size !== numericRetainedProps.length)) {
      throw new Error("Component numeric retained prop metadata is invalid");
    }
    if (metadata?.closedCollectionSites !== undefined &&
      !Array.isArray(metadata.closedCollectionSites)) {
      throw new Error("Component collection site metadata is invalid");
    }
    const closedCollectionSites = metadata?.closedCollectionSites === undefined
      ? undefined : [...metadata.closedCollectionSites];
    if (closedCollectionSites?.some((site) =>
      typeof site !== "string" || !site
    )) throw new Error("Component collection site metadata is invalid");
    if (metadata?.closedCollectionRowPrograms !== undefined &&
      !Array.isArray(metadata.closedCollectionRowPrograms)) {
      throw new Error("Closed collection row program metadata is invalid");
    }
    const closedCollectionRowPrograms = metadata?.closedCollectionRowPrograms?.map((raw) => {
      const program = normalizeClosedCollectionRowProgram(raw);
      if (!program) throw new Error("Closed collection row program metadata is invalid");
      return program;
    });
    if (closedCollectionRowPrograms && (
      closedCollectionRowPrograms.some((program) =>
        program.componentProgramId !== siteId ||
        !closedCollectionSites?.includes(program.collectionSiteId)
      ) || new Set(closedCollectionRowPrograms.map((program) =>
        program.collectionSiteId)).size !== closedCollectionRowPrograms.length
    )) {
      throw new Error("Closed collection row program must match its owner and site");
    }
    let stateLayout: CompiledStateLayout | undefined;
    if (metadata?.stateLayout !== undefined) {
      const layout = metadata.stateLayout;
      if (layout.programId !== undefined && layout.programId !== siteId) {
        throw new Error(
          "Compiled state layout program ID must match its component site",
        );
      }
      const normalized = normalizeCompiledStateLayout(layout);
      if (
        normalized.slots.some((entry) => !propOnlySites.includes(entry.siteId))
      ) {
        throw new Error("Invalid compiled state layout slot");
      }
      stateLayout = normalized;
    }
    if (metadata?.ownerUpdateProgram !== undefined) {
      const program = metadata.ownerUpdateProgram;
      if (
        !stateLayout || program.programId !== siteId ||
        stateLayout.programId !== siteId
      ) {
        throw new Error(
          "Compiled owner update program must match its component and state layout IDs",
        );
      }
      if ((program.schemaVersion === 3 || program.schemaVersion === 5) !==
        (numericRetainedProps?.length === 1 &&
          numericRetainedProps[0] === "children")) {
        throw new Error(
          "Retained-child admission requires matching owner program schema 3 or 5 metadata",
        );
      }
      associateCompiledOwnerUpdateProgram(stateLayout, program);
    } else if (numericRetainedProps?.length) {
      throw new Error("Numeric retained props require a compiled owner update program");
    }
    const closedResourceHostProgram = metadata?.closedResourceHostProgram === undefined
      ? undefined
      : normalizeClosedResourceHostProgram(metadata.closedResourceHostProgram);
    if (metadata?.closedResourceHostProgram !== undefined &&
      (!closedResourceHostProgram || closedResourceHostProgram.componentProgramId !== siteId)) {
      throw new Error("Closed resource host program must match its component revision");
    }
    const closedStoreHostProgram = metadata?.closedStoreHostProgram === undefined
      ? undefined : normalizeClosedStoreHostProgram(metadata.closedStoreHostProgram);
    if (metadata?.closedStoreHostProgram !== undefined &&
      (!closedStoreHostProgram || closedStoreHostProgram.componentProgramId !== siteId)) {
      throw new Error("Closed Store host program must match its component revision");
    }
    const closedStoreNumericKernel = metadata?.closedStoreNumericKernel === undefined
      ? undefined : closedStoreHostProgram
      ? normalizeClosedStoreNumericKernel(metadata.closedStoreNumericKernel,
        closedStoreHostProgram)
      : null;
    const closedStoreExecution = metadata?.closedStoreExecution === undefined
      ? undefined : closedStoreHostProgram
      ? normalizeClosedStoreDataExecution(metadata.closedStoreExecution,
        closedStoreHostProgram)
      : null;
    if ((metadata?.closedStoreExecution !== undefined && !closedStoreExecution) ||
      (closedStoreExecution && closedStoreNumericKernel) ||
      (closedStoreHostProgram?.schemaVersion === 7 &&
        !closedStoreExecution && !closedStoreNumericKernel)) {
      throw new Error("Closed Store execution must match one supported host arm and revision");
    }
    if ((metadata?.closedStoreNumericKernel !== undefined &&
      !closedStoreNumericKernel)) {
      throw new Error("Closed Store numeric kernel must match its host program and revision");
    }
    const closedComponentForwardProgram = metadata?.closedComponentForwardProgram === undefined
      ? undefined : normalizeClosedComponentForwardProgram(metadata.closedComponentForwardProgram);
    if (metadata?.closedComponentForwardProgram !== undefined &&
      (!closedComponentForwardProgram || closedComponentForwardProgram.componentProgramId !== siteId)) {
      throw new Error("Closed component forward program must match its component revision");
    }
    const revisions = [stateLayout?.moduleRevision,
      closedResourceHostProgram?.moduleRevision, closedStoreHostProgram?.moduleRevision,
      closedComponentForwardProgram?.moduleRevision,
      ...(closedCollectionRowPrograms?.map((program) => program.moduleRevision) ?? [])]
      .filter((value): value is string => value !== undefined);
    const expectedRevision = revisions[0];
    if (revisions.some((revision) => revision !== expectedRevision)) {
      throw new Error("Compiled component programs disagree on module revision");
    }
    const revision = moduleEnd < 0 ? undefined : captureCompiledSemanticRevision(
      siteId.slice(0, moduleEnd), expectedRevision,
    );
    if (expectedRevision && !revision) {
      throw new Error("Compiled component program has no matching module revision");
    }
    normalizedMetadata = Object.freeze({
        propOnlySites: Object.freeze(propOnlySites),
        ...(numericPrimitiveProps
          ? { numericPrimitiveProps: Object.freeze(numericPrimitiveProps) }
          : {}),
        ...(numericRetainedProps
          ? { numericRetainedProps: Object.freeze(numericRetainedProps) }
          : {}),
        ...(closedCollectionSites
          ? { closedCollectionSites: Object.freeze(closedCollectionSites) }
          : {}),
        ...(closedCollectionRowPrograms
          ? { closedCollectionRowPrograms: Object.freeze(closedCollectionRowPrograms) }
          : {}),
        hostLeafOutput: metadata?.hostLeafOutput === true,
        ...(revision ? { revision } : {}),
        ...(stateLayout ? { stateLayout } : {}),
        ...(closedResourceHostProgram ? { closedResourceHostProgram } : {}),
        ...(closedStoreHostProgram ? { closedStoreHostProgram } : {}),
        ...(closedStoreNumericKernel ? { closedStoreNumericKernel } : {}),
        ...(closedStoreExecution ? { closedStoreExecution } : {}),
        ...(closedComponentForwardProgram ? { closedComponentForwardProgram } : {}),
      });
  }
  const registration = Object.freeze({ siteId, metadata: normalizedMetadata });
  Object.defineProperty(render, componentRegistration, { value: registration });
  definedComponents.set(render, registration);
  return render;
};

const emptyCompiledPropSites: ReadonlySet<string> = new Set();
type ComponentMetadata = {
  readonly revision?: CompiledSemanticRevisionToken;
  readonly propOnlySites: readonly string[];
  readonly numericPrimitiveProps?: readonly string[];
  readonly numericRetainedProps?: readonly string[];
  readonly closedCollectionSites?: readonly string[];
  readonly closedCollectionRowPrograms?: readonly ClosedCollectionRowProgram[];
  readonly hostLeafOutput?: boolean;
  readonly stateLayout?: CompiledStateLayout;
  readonly closedResourceHostProgram?: ClosedResourceHostProgram;
  readonly closedStoreHostProgram?: ClosedStoreHostProgram;
  readonly closedStoreNumericKernel?: ClosedStoreNumericKernel;
  readonly closedStoreExecution?: NormalizedClosedStoreDataExecution;
  readonly closedComponentForwardProgram?: ClosedComponentForwardProgram;
};

const componentRevision = (component: unknown) =>
  typeof component === "function"
    ? (definedComponents.get(component) ??
      (component as Function & {
        [componentRegistration]?: ComponentRegistration;
      })[componentRegistration])?.metadata?.revision
    : undefined;
const componentCodeCurrent = (component: unknown): boolean => {
  const revision = componentRevision(component);
  return !revision || isCompiledSemanticRevisionCurrent(revision);
};
const componentCodeCurrentPrivate = (component: unknown): boolean => {
  const revision = typeof component === "function"
    ? definedComponents.get(component)?.metadata?.revision : undefined;
  return !revision || isCompiledSemanticRevisionCurrent(revision);
};
const treeReferencesCompiledSource = (
  node: RuntimeNode,
  sourceFile: string,
  seen = new WeakSet<object>(),
): boolean => {
  if (node == null || typeof node !== "object") return false;
  if (seen.has(node)) return true;
  seen.add(node);
  try {
    if (Array.isArray(node)) {
      const length = Object.getOwnPropertyDescriptor(node, "length")?.value;
      if (typeof length !== "number") return true;
      for (let index = 0; index < length; index++) {
        const child = Object.getOwnPropertyDescriptor(node, String(index));
        if (!child || !("value" in child) ||
          treeReferencesCompiledSource(child.value, sourceFile, seen)) return true;
      }
      return false;
    }
    const type = Object.getOwnPropertyDescriptor(node, "type");
    const props = Object.getOwnPropertyDescriptor(node, "props");
    if (!type || !("value" in type) || !props || !("value" in props) ||
      props.value === null || typeof props.value !== "object") return true;
    if (componentRevision(type.value)?.sourceFile === sourceFile) return true;
    const children = Object.getOwnPropertyDescriptor(props.value, "children");
    return !!children && (!("value" in children) ||
      treeReferencesCompiledSource(children.value, sourceFile, seen));
  } catch {
    return true;
  } finally {
    seen.delete(node);
  }
};
const cacheReferencesCompiledSource = (
  cache: ComponentCache, sourceFile: string,
): boolean => {
  if (componentRevision(cache.type)?.sourceFile === sourceFile ||
    treeReferencesCompiledSource(cacheOutputView(cache, false), sourceFile)) return true;
  const children = Object.getOwnPropertyDescriptor(cache.props, "children");
  return !!children && (!("value" in children) ||
    treeReferencesCompiledSource(children.value, sourceFile));
};
const cacheCodeCurrent = (caches: Iterable<ComponentCache>): boolean => {
  for (const cache of caches) if (!componentCodeCurrent(cache.type)) return false;
  return true;
};
const cacheCodeCurrentPrivate = (caches: Iterable<ComponentCache>): boolean => {
  for (const cache of caches) if (!componentCodeCurrentPrivate(cache.type)) return false;
  return true;
};
const capturedScalarCurrent = (source: ScalarSource, value: number): boolean => {
  const current = canonicalScalarSourceValue(source);
  return current !== null && Object.is(current, value);
};
const prepareAdmittedBindings = (
  items: readonly { binding: BoundValue<unknown>; owner: OwnerId;
    sites: readonly string[] }[],
  resolve: (owner: OwnerId, site: string) => ScalarSource | null,
): ScalarSource[][] | null => {
  const captured: ScalarSource[][] = [];
  for (const item of items) {
    const canonical: ScalarSource[] = [];
    for (const site of item.sites) {
      const source = resolve(item.owner, site);
      if (!source) return null;
      canonical.push(source);
    }
    if (!canRebindCapturedBindingSources(item.binding, canonical)) return null;
    captured.push(canonical);
  }
  return captured;
};
const applyAdmittedBindings = (
  items: readonly { binding: BoundValue<unknown> }[],
  captured: readonly (readonly ScalarSource[])[],
): void => {
  if (captured.length !== items.length) throw new Error("Binding admission changed");
  for (let index = 0; index < items.length; index++) {
    if (!rebindCapturedBindingSources(items[index].binding, captured[index])) {
      throw new Error("Binding admission changed");
    }
  }
};
const canonicalWorldIsAlive = OwnerStateWorld.prototype.isAlive;
const canonicalWorldOwnerLineage = OwnerStateWorld.prototype.ownerLineage;
const canonicalWorldCellHandle = OwnerStateWorld.prototype.cellHandle;
const canonicalWorldClearCellChangesThrough = OwnerStateWorld.prototype.clearCellChangesThrough;
const canonicalWorldIsWithin = OwnerStateWorld.prototype.isWithin;
const canonicalWorldFindOwner = OwnerStateWorld.prototype.findOwner;
const canonicalWorldScalarSource = OwnerStateWorld.prototype.scalarSource;
const canonicalWorldScalarSourceForCell = OwnerStateWorld.prototype.scalarSourceForCell;
const canonicalWorldVersion = OwnerStateWorld.prototype.version;
const canonicalWorldVersionForCell = OwnerStateWorld.prototype.versionForCell;
const canonicalResourceCutCurrent = (reads: ResourceReadSet): boolean => {
  const status = reads.preparedCanonicalStatus();
  if (status === "unsupported") throw new UnsupportedGroupOpaqueFreshnessError("resource");
  return status === "current";
};
const canonicalCollectionCutCurrent = (
  collection: KeyedCollection<any>, version: number | null,
): boolean => {
  const current = canonicalCollectionVersion(collection);
  if (current === null || version === null) {
    throw new UnsupportedGroupOpaqueFreshnessError("collection");
  }
  return current === version;
};
const canonicalResourceVersionCurrent = (
  resource: AsyncResource<any>, version: number | null,
): boolean => {
  const current = canonicalResourceVersion(resource);
  if (current === null || version === null) {
    throw new UnsupportedGroupOpaqueFreshnessError("resource");
  }
  return current === version;
};
const captureCodeRevisions = (
  caches: Iterable<ComponentCache>,
): { readonly revisions: readonly CompiledSemanticRevisionToken[] } |
  { readonly error: unknown } => {
  const revisions: CompiledSemanticRevisionToken[] = [];
  try {
    for (const cache of caches) {
      const revision = componentRevision(cache.type);
      if (revision) revisions.push(revision);
    }
  } catch (error) {
    return { error };
  }
  return { revisions };
};
const codeRevisionsCurrent = (
  captured: ReturnType<typeof captureCodeRevisions>,
) => {
  if ("error" in captured) throw captured.error;
  return captured.revisions.every(isCompiledSemanticRevisionCurrent);
};

const compiledStateLayoutFor = (
  component: unknown,
): CompiledStateLayout | undefined =>
  typeof component === "function"
    ? definedComponents.get(component)?.metadata?.stateLayout
    : undefined;

const numericOwnerPropsAdmitted = (
  component: unknown,
  props: Record<string, unknown>,
  owned: boolean,
): boolean => {
  const metadata = typeof component === "function"
    ? definedComponents.get(component)?.metadata : undefined;
  const names = metadata?.numericPrimitiveProps;
  const retainedNames = metadata?.numericRetainedProps;
  if (!names?.length && !retainedNames?.length) return true;
  if (!owned || !Object.isFrozen(props)) return false;
  for (const name of names ?? []) {
    const descriptor = Object.getOwnPropertyDescriptor(props, name);
    if (!descriptor || !("value" in descriptor) ||
      (descriptor.value !== null && descriptor.value !== undefined &&
        typeof descriptor.value !== "string" &&
        typeof descriptor.value !== "number" &&
        typeof descriptor.value !== "boolean")) return false;
  }
  for (const name of retainedNames ?? []) {
    const descriptor = Object.getOwnPropertyDescriptor(props, name);
    if (!descriptor || !("value" in descriptor) ||
      !isRuntimeOwnedElement(descriptor.value) ||
      !Object.isFrozen(descriptor.value)) return false;
  }
  return true;
};

const ownCompiledOwnerProps = (
  component: unknown,
  source: RuntimeElement,
  props: Record<string, unknown>,
): Record<string, unknown> => {
  const metadata = typeof component === "function"
    ? definedComponents.get(component)?.metadata : undefined;
  if ((metadata?.numericPrimitiveProps?.length ||
    metadata?.numericRetainedProps?.length ||
    (metadata?.closedStoreHostProgram?.schemaVersion === 6 ||
      metadata?.closedStoreHostProgram?.schemaVersion === 7)) &&
    isRuntimeOwnedElement(source) &&
    Object.isFrozen(source.props)) Object.freeze(props);
  return props;
};

const retainedStoreChildAdmitted = (
  component: unknown, source: RuntimeElement,
  props: Record<string, unknown>,
): boolean => {
  const program = typeof component === "function"
    ? definedComponents.get(component)?.metadata?.closedStoreHostProgram : undefined;
  if (program?.schemaVersion !== 6 &&
    !(program?.schemaVersion === 7 && program.retainedChildProp === "children")) return false;
  const child = Object.getOwnPropertyDescriptor(props, "children");
  return isRuntimeOwnedElement(source) && Object.isFrozen(source.props) &&
    Object.isFrozen(props) && !!child && "value" in child &&
    isRuntimeOwnedElement(child.value) && Object.isFrozen(child.value);
};

const closedCollectionSitesFor = (component: unknown): readonly string[] | undefined =>
  typeof component === "function"
    ? definedComponents.get(component)?.metadata?.closedCollectionSites
    : undefined;

const closedCollectionRowProgramFor = (
  owner: unknown,
  siteId: string,
  rowSiteId?: string,
): ClosedCollectionRowProgram | undefined => {
  if (typeof owner !== "function") return undefined;
  const program = definedComponents.get(owner)?.metadata?.closedCollectionRowPrograms
    ?.find((candidate) => candidate.collectionSiteId === siteId);
  const ownerSite = definedComponents.get(owner)?.siteId;
  const rowSite = program && definedComponents.get(program.rowComponent)?.siteId;
  if (!program || !componentCodeCurrent(owner) ||
    !componentCodeCurrent(program.rowComponent) ||
    ownerSite !== program.componentProgramId ||
    rowSite !== program.rowComponentProgramId ||
    (rowSiteId !== undefined && rowSiteId !== program.rowComponentProgramId)) {
    return undefined;
  }
  const ownerRevision = componentRevision(owner);
  const rowRevision = componentRevision(program.rowComponent);
  if (!ownerRevision || !rowRevision ||
    ownerRevision.sourceFile !== rowRevision.sourceFile ||
    ownerRevision.moduleRevision !== program.moduleRevision ||
    rowRevision.moduleRevision !== program.moduleRevision) return undefined;
  return program;
};

const ownCollectionOwnerProps = (
  component: unknown,
  source: RuntimeElement,
  props: Record<string, unknown>,
): boolean => {
  if (!closedCollectionSitesFor(component)?.length ||
    !isRuntimeOwnedElement(source) || !Object.isFrozen(source.props)) return false;
  Object.freeze(props);
  return true;
};

const collectionOwnerInputsAdmitted = (
  active: ActiveOwner,
  siteId: string,
  collection: KeyedCollection<unknown>,
): boolean => {
  if (active.collectionSites === undefined) return true;
  if (!active.collectionPropsOwned ||
    !active.collectionSites?.includes(siteId) ||
    canonicalCollectionVersion(collection) === null ||
    !canonicalCollectionApiIntact(collection)) return false;
  const props = active.collectionProps;
  if (!props || !Object.isFrozen(props)) return false;
  for (const key of Reflect.ownKeys(props)) {
    const descriptor = Object.getOwnPropertyDescriptor(props, key);
    if (!descriptor) return false;
    if (!("value" in descriptor)) return false;
    const value = descriptor.value;
    if (value === collection || value === null || value === undefined ||
      typeof value === "string" || typeof value === "number" ||
      typeof value === "boolean") continue;
    return false;
  }
  return true;
};

const collectionOwnerApiAdmitted = (
  region: CollectionRegionCache,
  cache: ComponentCache,
): boolean => closedCollectionSitesFor(cache.type) === undefined ||
  canonicalCollectionApiIntact(region.collection);

const collectionOwnerNeedsGenericRows = (
  cache: ComponentCache,
  batches: readonly KeyedCollectionBatch<unknown>[],
): boolean => closedCollectionSitesFor(cache.type) !== undefined &&
  batches.some((batch) => batch.operations.some((operation) =>
    operation.type === "insert" || operation.type === "replace"
  ));

const numericOwnerCacheAdmitted = (cache: ComponentCache): boolean =>
  cache.numericPropsAdmitted === true && cache.numericStateAdmitted === true;

const closedResourceHostProgramFor = (
  component: unknown,
): ClosedResourceHostProgram | undefined =>
  typeof component === "function" && componentCodeCurrent(component)
    ? definedComponents.get(component)?.metadata?.closedResourceHostProgram
    : undefined;

const closedStoreHostProgramFor = (
  component: unknown,
): ClosedStoreHostProgram | undefined =>
  typeof component === "function" && componentCodeCurrent(component)
    ? definedComponents.get(component)?.metadata?.closedStoreHostProgram
    : undefined;

const closedComponentForwardProgramFor = (
  component: unknown,
): ClosedComponentForwardProgram | undefined =>
  typeof component === "function" && componentCodeCurrent(component)
    ? definedComponents.get(component)?.metadata?.closedComponentForwardProgram
    : undefined;

const validateNumericBindingProgram = (
  descriptor: NumericBindingProgramDescriptor | undefined,
  sites: readonly string[],
): NumericBindingProgramDescriptor | undefined => {
  if (descriptor === undefined) return undefined;
  if (
    !descriptor || typeof descriptor !== "object" ||
    (descriptor.schemaVersion !== 1 && descriptor.schemaVersion !== 2) ||
    typeof descriptor.sinkId !== "string" || descriptor.sinkId.length === 0 ||
    !Array.isArray(descriptor.sourceSites) ||
    descriptor.sourceSites.length !== sites.length
  ) {
    throw new TypeError("Invalid numeric binding program descriptor");
  }
  if (
    descriptor.schemaVersion === 2 &&
    (typeof descriptor.ownerProgramId !== "string" ||
      descriptor.ownerProgramId.length === 0 ||
      descriptor.sourceSites.some((site) =>
        typeof site !== "string" || site.length === 0
      ) ||
      new Set(descriptor.sourceSites).size !== descriptor.sourceSites.length)
  ) {
    throw new TypeError("Invalid owner-scoped numeric binding descriptor");
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
  // Freeze descriptor identity and source shape at activation; cached VDOM eligibility
  // must not change if callers later mutate the descriptor.
  const closedExpression = descriptor.closedExpression === undefined
    ? null
    : normalizeClosedNumericExpression(descriptor.closedExpression, sites.length);
  Object.freeze(descriptor.sourceSites);
  Object.freeze(descriptor);
  return Object.freeze({
    ...descriptor,
    closedExpression: closedExpression ?? undefined,
  });
};

/** Build immutable owner metadata only when the v2 program names this exact layout. */
const numericOwnerBindingFor = (
  active: ActiveOwner,
  descriptor: NumericBindingProgramDescriptor | undefined,
  siteIds: readonly string[],
): BoundValue["numericOwner"] => {
  if (
    descriptor?.schemaVersion !== 2 || !active.stateLayout ||
    active.stateLayout.programId !== descriptor.ownerProgramId
  ) return undefined;
  const sourceSlots: number[] = [];
  for (const siteId of siteIds) {
    const slot = compiledStateLayoutSlot(active.stateLayout, siteId);
    if (slot === undefined) return undefined;
    sourceSlots.push(slot);
  }
  return Object.freeze({
    owner: active.owner,
    programId: descriptor.ownerProgramId,
    layout: active.stateLayout,
    sourceSlots: Object.freeze(sourceSlots),
  });
};

/** Build a live numeric binding from state cells owned by the active component. */
export function bindStatePropsAt<T>(
  siteIds: readonly string[],
  derive: (values: readonly number[]) => T,
  numericProgram: NumericBindingProgramDescriptorV2,
): BoundValue<T> | T;
export function bindStatePropsAt<T>(
  siteIds: readonly string[],
  derive: (values: readonly number[]) => T,
  numericProgram?: NumericBindingProgramDescriptorV1,
): BoundValue<T>;
export function bindStatePropsAt<T>(
  siteIds: readonly string[],
  derive: (values: readonly number[]) => T,
  numericProgram: NumericBindingProgramDescriptorV2,
): BoundValue<T> | T;
export function bindStatePropsAt<T>(
  siteIds: readonly string[],
  derive: (values: readonly number[]) => T,
  numericProgram?: NumericBindingProgramDescriptorV1,
): BoundValue<T>;
export function bindStatePropsAt<T>(
  siteIds: readonly string[],
  derive: (values: readonly number[]) => T,
  numericProgram: NumericBindingProgramDescriptor,
): BoundValue<T> | T;
export function bindStatePropsAt<T>(
  siteIds: readonly string[],
  derive: (values: readonly number[]) => T,
  numericProgram?: NumericBindingProgramDescriptor,
): BoundValue<T> | T {
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
  const numericOwner = numericOwnerBindingFor(
    active,
    validatedProgram,
    siteIds,
  );
  const sources: ScalarSource[] = [];
  let missingNumericSite: string | undefined;
  for (const siteId of siteIds) {
    const source = active.world.scalarSource(active.owner, siteId);
    if (!source) {
      missingNumericSite ??= siteId;
      continue;
    }
    active.propBoundSites.add(siteId);
    sources.push(source);
  }
  if (missingNumericSite !== undefined) {
    if (!numericOwner || validatedProgram?.schemaVersion !== 2) {
      throw new Error(
        `State site ${missingNumericSite} is not a numeric state cell`,
      );
    }
    // Promotion removes numeric sources but leaves the authored owner slots.
    // Read their actual values and call the same projector with no coercion.
    const values = siteIds.map((siteId) =>
      active.world.useState<unknown>(
        active.owner,
        siteId,
        undefined,
        active.stateLayout!,
      )[0] as number
    );
    return derive(values);
  }
  const binding = bindSources(sources, derive, validatedProgram);
  const ownedBinding = numericOwner ? Object.assign(binding, { numericOwner }) : binding;
  active.captureBinding?.(
    ownedBinding as BoundValue<unknown>,
    sources,
    active.owner,
    siteIds,
  );
  return ownedBinding;
}

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
  const numericOwner = numericOwnerBindingFor(
    active,
    validatedProgram,
    [siteId],
  );
  const source = active.world.scalarSource(active.owner, siteId);
  if (!source) {
    if (
      (validatedProgram?.schemaVersion === 1 &&
        active.stateLayout?.slots.some((slot) => slot.siteId === siteId)) ||
      numericOwner !== undefined
    ) {
      // Promotion reuses the already-initialized cell and evaluates the authored expression
      // without retaining a numeric subscription.
      const [value] = active.world.useState<unknown>(
        active.owner,
        siteId,
        undefined,
        active.stateLayout!,
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
  const binding = validatedProgram?.closedExpression
    ? bindSources(sources, ([value]) => project(value), validatedProgram)
    : bindStateSource(source, project, validatedProgram);
  if (numericOwner) Object.assign(binding, { numericOwner });
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
  const result = active.stateLayout
    ? active.world.useState(active.owner, siteId, initial, active.stateLayout)
    : active.world.useState(active.owner, siteId, initial);
  const value = result[0];
  if (value !== null && value !== undefined &&
    typeof value !== "string" && typeof value !== "number" &&
    typeof value !== "boolean") active.numericStateReadsPrimitive = false;
  return result;
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
    !siteId || siteId.includes("\u0000") || !collection ||
    typeof collection.snapshot !== "function" ||
    typeof collection.createReader !== "function" ||
    typeof renderRow !== "function"
  ) {
    throw new Error(
      "renderCollectionAt requires a site, collection, and row renderer",
    );
  }
  const ownerInputsAdmitted = collectionOwnerInputsAdmitted(
    activeOwners[activeOwners.length - 1], siteId, collection,
  );
  const snapshotVersion = collection.version;
  const rows = new Map<string, Readonly<{ node: RuntimeNode; entry?: object }>>();
  let componentSiteId: string | undefined;
  const snapshot = collection.snapshot();
  const entries = canonicalCollectionApiIntact(collection)
    ? snapshot.map(({ key }) => canonicalCollectionEntry(collection, key))
    : undefined;
  const children = snapshot.map(({ key, value }, index) => {
    const entry = entries?.[index] ?? canonicalCollectionEntry(collection, key);
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
    const props = { ...rendered.props, key };
    const owned = isRuntimeOwnedElement(rendered as unknown);
    const node = owned
      ? copyRuntimeElement(rendered.type, props)
      : { ...rendered, props };
    rows.set(key, { node: null, entry });
    return node;
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
    ownerInputsAdmitted,
  });
  return marked;
};

export type ComponentStateRootOptions = {
  /** Allow isolated generic renders to be discarded and repeated. */
  renderPreparation?: "repeatable";
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
  const siteId = (definedComponents.get(type) ??
    (type as Function & {
      [componentRegistration]?: ComponentRegistration;
    })[componentRegistration])?.siteId;
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

type StructuralScope = { siteScope?: string; position: string };
const rootStructuralScope: StructuralScope = { position: "0" };
const scopedOwnerSite = (site: string, scope?: string): string =>
  scope === undefined ? site : `\u0000structural:${JSON.stringify([site, scope])}`;
const collectionRegionKey = (
  parentOwner: OwnerId, siteId: string, siteScope?: string,
): string => `${parentOwner}\u0000${scopedOwnerSite(siteId, siteScope)}`;
const hasSiblingCollectionSite = (
  regions: Iterable<CollectionRegionCache>, region: CollectionRegionCache,
): boolean => {
  for (const other of regions) {
    if (other !== region && other.parentOwner === region.parentOwner &&
      other.siteId === region.siteId) return true;
  }
  return false;
};
const structuralChildPosition = (
  scope: StructuralScope, index: number,
): StructuralScope => ({ ...scope, position: `${scope.position}/${index}` });
const appendStructuralSegment = (
  siteScope: string | undefined, segment: readonly unknown[],
): string => {
  const encoded = JSON.stringify(segment);
  return `${siteScope ?? ""}${encoded.length}:${encoded}`;
};
const structuralContainerScope = (
  scope: StructuralScope, kind: "array" | "fragment",
): StructuralScope => scope.position === "0" ? scope : {
  siteScope: appendStructuralSegment(scope.siteScope,
    [kind, ["slot", scope.position]]),
  position: "0",
};
const structuralHostScope = (
  scope: StructuralScope, node: RuntimeElement,
): StructuralScope => {
  const descriptor = isRuntimeOwnedElement(node)
    ? Object.getOwnPropertyDescriptor(node.props, "key") : undefined;
  const value = descriptor && "value" in descriptor ? descriptor.value : undefined;
  const authoredKey = !hasGeneratedHostKey(node) &&
      (typeof value === "string" || typeof value === "number")
    ? String(value) : undefined;
  return {
    siteScope: appendStructuralSegment(scope.siteScope,
      ["host", node.type,
        authoredKey === undefined ? ["slot", scope.position] : ["key", authoredKey]]),
    position: "0",
  };
};
const structuralFragmentScope = (
  scope: StructuralScope, node: RuntimeElement,
): StructuralScope => {
  const descriptor = isRuntimeOwnedElement(node)
    ? Object.getOwnPropertyDescriptor(node.props, "key") : undefined;
  const value = descriptor && "value" in descriptor ? descriptor.value : undefined;
  return typeof value !== "string" && typeof value !== "number"
    ? structuralContainerScope(scope, "fragment")
    : {
    siteScope: appendStructuralSegment(scope.siteScope,
      ["fragment", String(value)]),
    position: "0",
  };
};

const carryHostKeys = (
  node: RuntimeNode,
  componentKey: OwnerKey,
  path = "0",
  onVisit?: () => void,
  scopeExplicitHostKeys = false,
  owner?: OwnerId,
): RuntimeNode => {
  onVisit?.();
  if (node == null || node === false) return node;
  if (typeof node === "string" || typeof node === "number") {
    return owner === undefined ? node : stampComponentOutput(node, owner,
      `${String(componentKey)}:${path}`);
  }
  if (Array.isArray(node)) {
    return copyKeyedOwnerMetadata(
      node,
      node.map((child, index) =>
        carryHostKeys(child, componentKey, `${path}.${index}`, onVisit,
          scopeExplicitHostKeys, owner)
      ),
    );
  }
  if (node.type === Fragment) {
    return copyRuntimeElement(node.type, {
      ...node.props,
      children: carryHostKeys(
        node.props.children,
        componentKey,
        path,
        onVisit,
        scopeExplicitHostKeys,
        owner,
      ),
    });
  }
  const existingKey = node.props.key;
  const key = existingKey == null
    ? `${String(componentKey)}:${path}`
    : scopeExplicitHostKeys
    ? `${String(componentKey)}\u0000${String(existingKey)}`
    : String(existingKey);
  const type = node.type;
  return typeof type === "string" && existingKey == null
    ? copyRuntimeElementWithGeneratedHostKey(type, { ...node.props, key }, owner)
    : copyRuntimeElement(type, { ...node.props, key },
      typeof type === "string" ? owner : undefined);
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
  readonly #hostPublicationDomain: HostPublicationDomain;
  #hostAvailabilityWait: { unsubscribe: () => void; flushRequested: boolean } | null = null;
  #activeRootClaim: HostPublicationClaim | null = null;
  readonly #renderPreparation: "repeatable" | undefined;
  readonly world: OwnerStateWorld;
  readonly #rootOwner: OwnerId;
  readonly #rootId: string;
  readonly #vdom: VDOMSnapshotRoot<H, Parent>;
  #tree: RuntimeNode = null;
  #pendingDirectIntent: DirectTreeIntent | null = null;
  #liveOwners = new Set<OwnerId>();
  #liveEffects = new Map<string, LiveEffect>();
  #liveEffectKeysByOwner = new Map<OwnerId, Set<string>>();
  #componentCache = new Map<OwnerId, ComponentCache>();
  // Metadata lists compiler-approved sinks; the committed cache records sinks bound
  // in this render, so render identity invalidates conditional-output changes.
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
  #disposeRequested = false;
  #hostApplicationDepth = 0;
  #directPublicationPending = false;
  #publicationVersion = 0;
  #preparedCandidates = new Map<NativeRootCandidate<H, Parent> | CandidateLifecycleCore,
    (sourceFile: string) => boolean>();
  #candidateHostCommit = false;
  #publicationBarrier: NativeRootCandidate<H, Parent> | CandidateLifecycleCore | null = null;
  #deferredFlush = false;
  #disposeListeners = new Set<() => void>();
  #retireListeners = new Set<() => void>();
  #candidateStoreHolds = new Map<AnyAsyncStore, number>();
  #storeDependencyLeases = new Map<symbol, Set<AnyAsyncStore>>();
  #terminalHostFailure: unknown;
  #terminalHostFailed = false;
  #terminalFailureKind: "host" | "publication" = "host";
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
    {
      readonly token: PreparedNumericCellProgram;
      readonly source: ScalarSource;
    }
  >();
  #nativeRowPrograms = new WeakMap<object, {
    token: PreparedNumericRowProgram;
    epoch: number;
    index: number;
  }>();
  #nativeRowEpoch = 0;
  #nativeRowTokens: Array<PreparedNumericRowProgram | undefined> = [];
  #nativeRowViews: Array<NumericCellRowView | undefined> = [];
  #nativeChangedRows = new Uint32Array(0);
  #nativeChangedSlots = new Uint32Array(0);
  #nativeRowUsedCount = 0;
  #nativeCellCutActive = false;
  #liveStoreSubscriptions = new Map<AnyAsyncStore, () => void>();
  #liveStoreReaders = new Map<string, Set<AnyAsyncStore>>();
  readonly #resourceTable: AsyncResourceTable;
  #liveResourceSubscriptions = new Map<AsyncResource<any>, {
    unsubscribe: () => void;
    boundary: OwnerId | null;
    blockedReaders?: readonly SubscribedBlockedStoreReaderWitness[];
  }>();
  // Resource reads are transaction-scoped; until owner footprints are cached, a
  // store-driven candidate rebuilds the tree after any resource read.
  #everReadResource = false;
  // This sticky bit avoids scanning every cache to decide whether a store
  // candidate may safely skip native-boundary expansion.
  #everHadNativeBoundary = false;
  #pendingResourceRetry = false;
  #pendingBoundaryRetries = new Set<OwnerId>();
  #publicationIntents = new Map<() => void, {
    resources: ReadonlySet<AsyncResource<any>>;
    cells: readonly StateCellHandle[];
    stores: ReadonlySet<AnyAsyncStore>;
    collections: ReadonlySet<KeyedCollection<any>>;
    wait: AsyncResource<void>;
  }>();
  #scopedFlushActive = false;
  #boundaryPrimaries = new Map<string, BoundaryPrimary>();
  #storeNotificationGeneration = 0;
  #committedStoreNotificationGeneration = 0;
  #partialStoreAttemptGeneration = -1;
  #sourceValueSyncVisits = 0;
  readonly #scheduleCommit: (commit: () => void) => void;
  readonly #unsubscribe: () => void;
  readonly #unsubscribeRevision: () => void;
  #codeInvalidated = false;
  #revisionRetirementPending = false;
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

  [rootHostPublicationDomain](): HostPublicationDomain {
    return this.#hostPublicationDomain;
  }

  constructor(
    host: VDOMHost<H, Parent>,
    container: Parent,
    options: ComponentStateRootOptions = {},
  ) {
    this.#hostPublicationDomain = hostPublicationDomain(host);
    if (options.renderPreparation !== undefined &&
      options.renderPreparation !== "repeatable") {
      throw new TypeError("Unknown render preparation capability");
    }
    this.#renderPreparation = options.renderPreparation;
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
    this.#unsubscribeRevision = subscribeCompiledSemanticRevision((change) => {
      if (this.#disposed || this.#codeInvalidated) return;
      let affected = treeReferencesCompiledSource(this.#tree, change.sourceFile) ||
        treeReferencesCompiledSource(this.#pendingDirectIntent?.tree ?? null, change.sourceFile);
      for (const cache of this.#componentCache.values()) {
        if (cacheReferencesCompiledSource(cache, change.sourceFile)) {
          affected = true;
          break;
        }
      }
      if (!affected) {
        for (const referencesSource of this.#preparedCandidates.values()) {
          if (referencesSource(change.sourceFile)) {
            affected = true;
            break;
          }
        }
      }
      if (!affected) return;
      this.#codeInvalidated = true;
      this.#revisionRetirementPending = true;
      this.#retireCompiledInterests();
    });
    this.#rootOwner = this.world.claimRootId(rootId);
    this.#unsubscribe = this.world.subscribeDirtyCells((handle, version) => {
      if (!this.world.isWithin(handle.owner, this.#rootOwner)) return;
      this.#pendingChanges.setCell(handle, version);
      if (this.#pendingDirectIntent) this.#pendingResourceRetry = true;
      this.#schedule();
    });
  }

  #waitForHostAvailability(flushRequested = false) {
    if (this.#hostAvailabilityWait) {
      this.#hostAvailabilityWait.flushRequested ||= flushRequested;
      return;
    }
    if (this.#disposed) return;
    const wait = { unsubscribe: () => {}, flushRequested };
    this.#hostAvailabilityWait = wait;
    wait.unsubscribe = subscribeHostPublicationAvailability(
      [this.#hostPublicationDomain],
      () => {
        if (this.#hostAvailabilityWait !== wait) return;
        this.#hostAvailabilityWait = null;
        wait.unsubscribe();
        if (this.#disposed) return;
        if (this.#disposeRequested) this.dispose();
        else if (this.#hostPublicationDomain.failed) return;
        else if (this.#pendingDirectIntent || wait.flushRequested) this.flush();
        else if (this.#hasPendingWork()) this.#schedule();
      },
    );
  }

  #enterDirectHostDomain(flushRequested = false): boolean {
    const claim = createHostPublicationClaim();
    if (tryClaimHostPublicationDomains(
      [this.#hostPublicationDomain], claim,
    ) === "busy") {
      this.#waitForHostAvailability(flushRequested);
      return false;
    }
    this.#activeRootClaim = claim;
    return true;
  }

  #assertPreparationHostAvailable() {
    if (isHostPublicationDomainBusy(
      this.#hostPublicationDomain, this.#activeRootClaim ?? undefined,
    )) throw new HostPublicationBusyError();
  }

  #leaveDirectHostDomain() {
    const claim = this.#activeRootClaim;
    if (!claim) return;
    this.#activeRootClaim = null;
    if (this.#disposeRequested) this.#waitForHostAvailability();
    releaseHostPublicationDomains([this.#hostPublicationDomain], claim);
    if (!this.#disposeRequested && !this.#disposed &&
      !this.#hostPublicationDomain.failed && this.#deferredFlush &&
      this.#pendingDirectIntent) {
      queueMicrotask(() => {
        if (!this.#disposed && !this.#disposeRequested &&
          !this.#hostPublicationDomain.failed && this.#deferredFlush &&
          this.#pendingDirectIntent) this.flush();
      });
    }
  }

  #retireCompiledInterests() {
    if (!this.#revisionRetirementPending || this.#disposed ||
      this.#publicationBarrier || this.#hostApplicationDepth > 0 ||
      this.#nativeCellCutActive || this.#directPublicationPending) return;
    this.#revisionRetirementPending = false;
    for (const [owner, cache] of this.#componentCache) {
      if (cache.output.shape || cache.output.scalarPlan) this.#componentCache.set(owner, {
        ...cache, output: cache.output.kind === "ordinary"
          ? ordinaryOutput(cache.output.authored, cache.output.expanded)
          : Object.freeze({ ...cache.output, shape: undefined,
            scalarPlan: undefined }),
      });
    }
    const listeners = [...this.#retireListeners];
    this.#retireListeners.clear();
    const errors = collectCleanupErrors([
      ...listeners,
      () => {
        const cleanup = collectCleanupErrors(
          [...this.#preparedCandidates.keys()].map((candidate) => () => candidate.discard()),
        );
        if (cleanup.length) throw new AggregateError(cleanup, "Revision candidate cleanup failed");
      },
      () => this.#dropPendingDirectIntent(),
      () => this.#cancelTerminalResourceWaits(),
      () => {
        const subscriptions = [...this.#liveStoreSubscriptions];
        const readers = [...this.#liveStoreReaders];
        for (const stores of this.#storeDependencyLeases.values()) stores.clear();
        this.#storeDependencyLeases.clear();
        this.#liveStoreSubscriptions.clear();
        this.#liveStoreReaders.clear();
        const cleanup = collectCleanupErrors([
          ...subscriptions.map(([, unsubscribe]) => unsubscribe),
          ...readers.flatMap(([readerId, stores]) => [...stores].map((store) =>
            () => store.forgetReader(this.#rootId, readerId))),
          ...subscriptions.filter(([store]) =>
            (this.#candidateStoreHolds.get(store) ?? 0) === 0).map(([store]) =>
              () => store.detachRoot(this.#rootId)),
        ]);
        if (cleanup.length) throw new AggregateError(cleanup, "Revision Store cleanup failed");
      },
      () => {
        const regions = [...this.#liveCollectionRegions.values()];
        this.#liveCollectionRegions.clear();
        const cleanup = collectCleanupErrors(regions.flatMap((region) => [
          ...(region.unsubscribe ? [region.unsubscribe] : []),
          ...(region.reader ? [() => region.reader!.detach()] : []),
        ]));
        if (cleanup.length) throw new AggregateError(cleanup, "Revision collection cleanup failed");
      },
      () => this.#unsubscribe(),
      () => {
        const cleanup = this.#cleanupEffects(this.#liveEffects.values());
        this.#liveEffects.clear();
        this.#liveEffectKeysByOwner.clear();
        if (cleanup.length) throw new AggregateError(cleanup, "Revision effect cleanup failed");
      },
    ]);
    if (errors.length === 1) throw errors[0];
    if (errors.length) throw new AggregateError(errors, "Revision cleanup failed");
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
    try {
      this.#reconcileStoreSubscriptions();
    } catch (error) {
      leasedStores.clear();
      this.#storeDependencyLeases.delete(leaseId);
      return throwWithCleanup(error, collectCleanupErrors([
        () => this.#reconcileStoreSubscriptions(),
      ]));
    }
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
      readonly renderPreparation?: "repeatable";
    } = {},
  ): NativeRootCandidate<H, Parent> {
    this.#requireRepeatableRender(options.renderPreparation);
    this.#assertActive();
    this.#assertPreparationHostAvailable();
    const held = this.#publicationIntents.values().next().value;
    if (held) return this.#prepareBlockedPublication([held.wait]);
    return this.#prepareCandidate(tree, options, true, new Set(), new Set());
  }

  /** Prepare tracked root work without requiring callers to provide a full tree. */
  preparePending(
    options: {
      readonly transitions?: readonly string[];
      readonly renderPreparation?: "repeatable";
    } = {},
  ): NativeRootCandidate<H, Parent> | null {
    this.#validateRenderPreparation(options.renderPreparation);
    this.#assertActive();
    this.#assertNoPublicationBarrier("prepare");
    this.#assertPreparationHostAvailable();
    if (this.#terminalHostFailed) {
      throw new Error("Component root is terminal after a host commit failure");
    }
    const held = this.#publicationIntents.values().next().value;
    if (held) return this.#prepareBlockedPublication([held.wait]);
    if (this.#pendingDirectIntent) {
      this.#requireRepeatableRender(options.renderPreparation);
      return this.#prepareCandidate(
        this.#pendingDirectIntent.tree,
        { transitions: options.transitions ?? [] },
        true, new Set(), new Set(),
      );
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
      renderPreparation: options.renderPreparation,
    });
    if (!mixed) this.#requireRepeatableRender(options.renderPreparation);
    return mixed ?? this.#prepareCandidate(
      this.#tree,
      { transitions: options.transitions ?? [] },
      true,
      new Set(),
      new Set(),
    );
  }

  /** Prepare explicit move/remove collection work without broadening its tree cut. */
  prepareCollections(
    collections: readonly KeyedCollection<any>[],
    publicationLease?: () => void,
  ): NativeRootCandidate<H, Parent> | null {
    return this.prepareTransaction({ cells: [], collections }, publicationLease);
  }

  /** Prepare one declared closed local, Store and keyed collection cut. */
  prepareTransaction(work: {
    readonly cells: readonly StateCellHandle[];
    readonly collections: readonly KeyedCollection<any>[];
    readonly stores?: readonly AnyAsyncStore[];
    readonly resources?: readonly AsyncResource<any>[];
  }, resourceLease?: () => void): NativeRootCandidate<H, Parent> | null {
    const { cells, collections } = work;
    const selectedStores = work.stores ?? [];
    if (!this.#leaseCoversSelection(resourceLease,
      new Set(work.resources ?? []), { cells, stores: selectedStores, collections })) {
      return null;
    }
    if (work.resources?.length) {
      return this.prepareResources(work.resources, resourceLease,
        { cells, stores: selectedStores, collections });
    }
    const holdWait = this.#resourceHoldWait(new Set(), resourceLease,
      { cells, stores: selectedStores, collections });
    if (holdWait) return this.#prepareBlockedPublication([holdWait]);
    if (collections.length === 0) return this.#prepareClosedInputCandidate(
      cells, selectedStores, false, () => true, resourceLease);
    this.#assertActive();
    this.#assertNoPublicationBarrier("prepare transaction");
    this.#assertPreparationHostAvailable();
    if ((this.#pendingDirectIntent && !(resourceLease &&
      this.#publicationIntents.has(resourceLease))) ||
      this.#terminalHostFailed || this.#codeInvalidated ||
      new Set(collections).size !== collections.length
    ) return null;
    const selected = new Set<string>();
    const acceptedCollections: Array<() => boolean> = [];
    for (const collection of collections) {
      let found = false;
      for (const [key, region] of this.#liveCollectionRegions) {
        if (region.collection !== collection) continue;
        found = true;
        if (this.#pendingCollectionRegionKeys.has(key)) {
          selected.add(key);
        } else {
          const reader = region.reader;
          const read = reader?.read();
          if (!reader || read?.status !== "available" ||
            read.batches.length !== 0 ||
            collection.version !== read.toVersion) return null;
          acceptedCollections.push(() => {
            if (this.#liveCollectionRegions.get(key) !== region ||
              region.reader !== reader ||
              this.#pendingCollectionRegionKeys.has(key) ||
              collection.version !== read.toVersion) return false;
            const current = reader.read();
            return current.status === "available" &&
              current.batches.length === 0 &&
              current.toVersion === read.toVersion;
          });
        }
      }
      if (!found) return null;
    }
    if (!selected.size) {
      if (cells.length || selectedStores.length) return this.#prepareClosedInputCandidate(
        cells, selectedStores, false, () => true, resourceLease,
        acceptedCollections, new Set(), collections);
      return this.#prepareAcceptedResourceNoop(new Map(), resourceLease,
        acceptedCollections, new Set(), collections);
    }
    return this.#prepareMixedCollectionCandidate([], {
      storeGeneration: this.#storeNotificationGeneration,
      transitions: [],
      selectedRegionKeys: selected,
      scopedStructural: true,
      scopedCells: cells,
      scopedStores: selectedStores,
      resourceLease,
      acceptedCollections,
    });
  }

  /** Prepare all closed host consumers of the selected direct Stores. */
  prepareStores(
    selected: readonly AnyAsyncStore[], publicationLease?: () => void,
  ): NativeRootCandidate<H, Parent> | null {
    return this.#prepareClosedStoreCandidate(selected, false, publicationLease, true);
  }

  /** Prepare the selected closed resource consumers as one root publication. */
  prepareResources(
    resources: readonly AsyncResource<any>[], resourceLease?: () => void,
    inputs: {
      readonly cells?: readonly StateCellHandle[];
      readonly stores?: readonly AnyAsyncStore[];
      readonly collections?: readonly KeyedCollection<any>[];
    } = {},
  ): NativeRootCandidate<H, Parent> | null {
    this.#assertActive();
    this.#assertNoPublicationBarrier("prepare resources");
    this.#assertPreparationHostAvailable();
    if (!this.#leaseCoversSelection(resourceLease, new Set(resources), inputs)) {
      return null;
    }
    if (!resources.length || new Set(resources).size !== resources.length ||
      (this.#pendingDirectIntent &&
        !(resourceLease && this.#publicationIntents.has(resourceLease))) ||
      this.#terminalHostFailed || this.#codeInvalidated) return null;
    const selected = new Set(resources);
    if (resources.some((resource) => closedResourceStatus(resource) === null ||
      closedResourceStatus(resource)?.status === "rejected")) return null;
    const boundaries: OwnerId[] = [];
    const covered = new Set<AsyncResource<any>>();
    const dependencies = new Set<AsyncResource<any>>(selected);
    const jointStores = new Set<AnyAsyncStore>();
    for (const [owner, cache] of this.#componentCache) {
      if (!cache.nativeBoundary || !cache.pendingResource) continue;
      const child = Object.getOwnPropertyDescriptor(cache.props, "children")?.value;
      const boundaryStores = new Set<AnyAsyncStore>();
      const footprint = this.#boundaryResourceDependencies(child, boundaryStores);
      if (!footprint) continue;
      footprint.add(cache.pendingResource);
      if (![...selected].some((resource) => footprint.has(resource))) continue;
      boundaries.push(owner);
      for (const store of boundaryStores) jointStores.add(store);
      for (const resource of footprint) {
        dependencies.add(resource);
        if (selected.has(resource)) covered.add(resource);
      }
    }
    const accepted = new Map<OwnerId, RuntimeNode>();
    for (const [key, primary] of this.#boundaryPrimaries) {
      const owner = Number(key) as OwnerId;
      const footprint = this.#boundaryResourceDependencies(primary.tree);
      if (!footprint) continue;
      for (const resource of footprint) {
        if (selected.has(resource)) {
          covered.add(resource);
          accepted.set(owner, primary.tree);
        }
      }
    }
    if (covered.size !== selected.size) return null;
    const wait = this.#resourceHoldWait(dependencies, resourceLease, {
      ...inputs, stores: [...(inputs.stores ?? []), ...jointStores],
    });
    const pending = [...dependencies].filter((resource) =>
      closedResourceStatus(resource)?.status === "pending"
    );
    if ([...dependencies].some((resource) =>
      closedResourceStatus(resource) === null ||
      closedResourceStatus(resource)?.status === "rejected")) return null;
    if (wait || pending.length) {
      return this.#prepareBlockedPublication([...pending, ...(wait ? [wait] : [])]);
    }
    const acceptedCurrent = () => [...accepted].every(([owner, tree]) =>
      this.#boundaryPrimaries.get(String(owner))?.tree === tree &&
      this.#liveOwners.has(owner) && canonicalWorldIsAlive.call(this.world, owner));
    if (inputs.collections?.length) {
      const selectedKeys = new Set<string>();
      const acceptedCollections: Array<() => boolean> = [];
      if (new Set(inputs.collections).size !== inputs.collections.length) return null;
      for (const collection of inputs.collections) {
        let found = false;
        for (const [key, region] of this.#liveCollectionRegions) {
          if (region.collection !== collection) continue;
          found = true;
          if (this.#pendingCollectionRegionKeys.has(key)) {
            selectedKeys.add(key);
          } else {
            const reader = region.reader;
            const read = reader?.read();
            if (!reader || read?.status !== "available" ||
              read.batches.length !== 0 ||
              collection.version !== read.toVersion) return null;
            acceptedCollections.push(() => {
              if (this.#liveCollectionRegions.get(key) !== region ||
                region.reader !== reader ||
                this.#pendingCollectionRegionKeys.has(key) ||
                collection.version !== read.toVersion) return false;
              const current = reader.read();
              return current.status === "available" &&
                current.batches.length === 0 &&
                current.toVersion === read.toVersion;
            });
          }
        }
        if (!found) return null;
      }
      if (!selectedKeys.size) {
        if (!boundaries.length) {
          if (!inputs.cells?.length && !inputs.stores?.length) {
            return this.#prepareAcceptedResourceNoop(accepted, resourceLease,
              acceptedCollections, selected, inputs.collections);
          }
          return this.#prepareClosedInputCandidate(inputs.cells ?? [],
            inputs.stores ?? [], false, acceptedCurrent, resourceLease,
            acceptedCollections, selected, inputs.collections);
        }
        return this.#prepareResourceReveals(
          boundaries, resourceLease, inputs.cells ?? [], inputs.stores ?? [],
          [acceptedCurrent, ...acceptedCollections], selected,
          inputs.collections,
        );
      }
      return this.#prepareMixedCollectionCandidate([], {
        storeGeneration: this.#storeNotificationGeneration,
        transitions: [], selectedRegionKeys: selectedKeys,
        scopedStructural: true,
        scopedCells: inputs.cells ?? [], scopedStores: inputs.stores ?? [],
        scopedResourceOwners: boundaries, resourceLease,
        acceptedCollections: [acceptedCurrent, ...acceptedCollections],
        acceptedResources: selected,
        acceptedCollectionFootprint: inputs.collections,
      });
    }
    if (!boundaries.length) {
      if (inputs.cells?.length || inputs.stores?.length) {
        return this.#prepareClosedInputCandidate(inputs.cells ?? [],
          inputs.stores ?? [], false, acceptedCurrent, resourceLease,
          [], selected);
      }
      return this.#prepareAcceptedResourceNoop(accepted, resourceLease, [], selected);
    }
    return this.#prepareResourceReveals(
      boundaries, resourceLease, inputs.cells ?? [], inputs.stores ?? [],
      [acceptedCurrent], selected,
    );
  }

  #prepareBlockedPublication(
    pendingResources: readonly AsyncResource<any>[],
  ): NativeRootCandidate<H, Parent> {
    const stores = new StoreRenderTransaction(this.#rootId);
    return this.#createCandidateLifecycle({
      baseVersion: this.#publicationVersion,
      baseVDOMVersion: this.#vdom.version,
      scope: { kind: "retained" }, stores, transitions: [],
      pendingResources, blocked: true,
      codeCurrent: () => false,
      validatePrepared: () => false,
      validatePreparedPrivate: () => false,
      validatePostHost: () => false,
      finalGroupCurrent: () => false,
      commitHost: () => { throw new Error("Resource candidate is blocked"); },
      commitHostAdmitted: () => { throw new Error("Resource candidate is blocked"); },
      preparePublication: () => {}, publish: () => {},
      installSubscriptions: () => [], runEffects: () => [],
      discard: () => stores.discard(), releaseArtifacts: () => {},
      effectFailureMessage: "Blocked resource candidate callbacks failed",
    });
  }

  #prepareAcceptedResourceNoop(
    accepted: ReadonlyMap<OwnerId, RuntimeNode>, resourceLease?: () => void,
    validators: readonly (() => boolean)[] = [],
    resources: ReadonlySet<AsyncResource<any>> = new Set(),
    collections: readonly KeyedCollection<any>[] = [],
  ): NativeRootCandidate<H, Parent> | null {
    if (!accepted.size && !validators.length) return null;
    const stores = new StoreRenderTransaction(this.#rootId);
    const collectionVersions = collections.map((collection) =>
      [collection, canonicalCollectionVersion(collection)] as const
    );
    const resourceVersions = [...resources].map((resource) =>
      [resource, canonicalResourceVersion(resource)] as const
    );
    const current = () => validators.every((validate) => validate()) &&
      [...accepted].every(([owner, tree]) =>
      this.#boundaryPrimaries.get(String(owner))?.tree === tree &&
      this.#liveOwners.has(owner) && this.world.isAlive(owner)
    );
    return this.#createCandidateLifecycle({
      baseVersion: this.#publicationVersion,
      baseVDOMVersion: this.#vdom.version,
      scope: { kind: "retained" }, stores, transitions: [],
      pendingResources: [], blocked: false,
      permitPendingDirectIntent: () => resourceLease !== undefined &&
        this.#publicationIntents.has(resourceLease),
      admissionCurrent: () => (!resourceLease ||
        this.#publicationIntents.has(resourceLease)) &&
        !this.#resourceHoldWait(resources, resourceLease, { collections }) &&
        (!resourceLease || this.#publicationIntents.has(resourceLease)),
      codeCurrent: current,
      validatePrepared: () => current() && stores.validate(),
      validatePreparedPrivate: () => (!resourceLease ||
        this.#publicationIntents.has(resourceLease)) &&
        !this.#resourceHoldWait(
          new Set(resourceVersions.map(([resource]) => resource)), resourceLease,
          { collections: collectionVersions.map(([collection]) => collection) },
        ) && [...accepted].every(([owner, tree]) =>
        this.#boundaryPrimaries.get(String(owner))?.tree === tree &&
        this.#liveOwners.has(owner) && canonicalWorldIsAlive.call(this.world, owner)
      ) && collectionVersions.every(([collection, version]) =>
        canonicalCollectionCutCurrent(collection, version)
      ) && resourceVersions.every(([resource, version]) =>
        canonicalResourceVersionCurrent(resource, version)
      ) && stores.validatePreparedCanonical(),
      validatePostHost: () => current() && stores.validatePublicationInputs(),
      finalGroupCurrent: () => [...accepted].every(([owner, tree]) =>
        this.#boundaryPrimaries.get(String(owner))?.tree === tree &&
        this.#liveOwners.has(owner) && this.world.isAlive(owner)
      ) && collectionVersions.every(([collection, version]) => {
        const current = canonicalCollectionVersion(collection);
        return version === null || current === null || current >= version;
      }) && resourceVersions.every(([resource, version]) =>
        version === null || canonicalResourceVersion(resource) === version
      ) && stores.validatePublicationInputsCanonical(),
      commitHost: () => {},
      commitHostAdmitted: () => {},
      preparePublication: () => stores.preparePublicationAfterHost(),
      publish: () => { stores.publishAccepted(); this.#publicationVersion++; },
      installSubscriptions: () => [], runEffects: () => {
        stores.notifyPublished(); return [];
      },
      discard: () => stores.discard(), releaseArtifacts: () => {},
      effectFailureMessage: "Accepted resource candidate callbacks failed",
    });
  }

  /** Keep a declared pending cut out of automatic publication until released. */
  holdTransactionPublications(work: {
    readonly resources: readonly AsyncResource<any>[];
    readonly cells?: readonly StateCellHandle[];
    readonly collections?: readonly KeyedCollection<any>[];
    readonly stores?: readonly AnyAsyncStore[];
  }): () => void {
    this.#assertActive();
    const unique = new Set(work.resources);
    const cells = Object.freeze((work.cells ?? []).map((cell) => Object.freeze({
      owner: cell.owner, site: cell.site, cellIdentity: cell.cellIdentity,
    })));
    let wake!: () => void;
    const wait = new AsyncResource<void>(new Promise<void>((resolve) => {
      wake = resolve;
    }));
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      this.#publicationIntents.delete(release);
      wake();
      this.#partialStoreAttemptGeneration = -1;
      if (this.#pendingDirectIntent && this.#publicationIntents.size === 0) {
        this.#pendingResourceRetry = true;
      }
      if (!this.#disposed && !this.#terminalHostFailed &&
        (this.#pendingDirectIntent || this.#hasPendingWork())) this.#schedule();
    };
    this.#publicationIntents.set(release, {
      resources: unique,
      cells,
      stores: new Set(work.stores ?? []),
      collections: new Set(work.collections ?? []),
      wait,
    });
    return release;
  }

  #heldCell(handle: StateCellHandle): boolean {
    return [...this.#publicationIntents.values()].some(({ cells }) =>
      cells.some((selected) => selected.owner === handle.owner &&
        selected.site === handle.site &&
        selected.cellIdentity === handle.cellIdentity)
    );
  }

  #readerBelongsToOwner(readerId: string, owner: OwnerId): boolean {
    return readerId.startsWith(`${owner}\u0000`) ||
      readerId.startsWith(`\u0000suspense-pending:${owner}:`) ||
      (readerId.startsWith("\u0000suspense-pending:") &&
        readerId.includes(`:${owner}\u0000`));
  }

  #heldStore(store: AnyAsyncStore): boolean {
    return [...this.#publicationIntents.values()].some(({ stores }) =>
      stores.has(store));
  }

  #heldCollection(collection: KeyedCollection<any>): boolean {
    return [...this.#publicationIntents.values()].some(({ collections }) =>
      collections.has(collection));
  }

  #captureHeldGenericState(): HeldGenericState | null {
    if (this.#publicationIntents.size === 0 ||
      this.#pendingCollectionRegionKeys.size > 0) return null;
    const pendingChanges = this.#pendingChanges.capture();
    if (pendingChanges.some((change) =>
      !change.cellIdentity || this.#heldCell({
        owner: change.owner,
        site: change.site,
        cellIdentity: change.cellIdentity,
      })
    )) return null;
    const holds = new Map<() => void, object>();
    const boundaries = new Map<OwnerId, {
      cache: ComponentCache;
      resource: AsyncResource<any>;
    }>();
    for (const [release, hold] of this.#publicationIntents) {
      if (hold.cells.length || hold.stores.size ||
        hold.collections.size || hold.resources.size === 0) return null;
      holds.set(release, hold);
      for (const resource of hold.resources) {
        const status = closedResourceStatus(resource);
        if (status === null) return null;
        const entries = [...this.#componentCache].filter(([owner, cache]) =>
          this.#liveOwners.has(owner) && cache.nativeBoundary &&
          cache.pendingResource === resource
        );
        if (entries.length !== 1) return null;
        const [owner, cache] = entries[0];
        boundaries.set(owner, { cache, resource });
      }
    }
    const heldOwners = new Set(
      [...boundaries.values()].flatMap(({ cache }) => [...cache.subtreeOwners]),
    );
    if (pendingChanges.some((change) =>
      heldOwners.has(change.owner)
    )) return null;
    const readers = new Map<string, {
      membership: ReadonlySet<AnyAsyncStore>;
      receipts: ReadonlyMap<AnyAsyncStore, AcceptedStoreReaderReceipt>;
    }>();
    for (const [readerId, membership] of this.#liveStoreReaders) {
      if (![...heldOwners].some((owner) =>
        this.#readerBelongsToOwner(readerId, owner)
      )) continue;
      const receipts = new Map<AnyAsyncStore, AcceptedStoreReaderReceipt>();
      for (const store of membership) {
        const receipt = captureCanonicalStoreReaderReceipt(
          store, this.#rootId, readerId,
        );
        if (!receipt) return null;
        receipts.set(store, receipt);
      }
      readers.set(readerId, { membership, receipts });
    }
    return boundaries.size ? { kind: "explicit", holds, boundaries, readers } : null;
  }

  #parkedBoundaryCurrent(
    owner: OwnerId,
    boundary: HeldGenericBoundary,
    afterHost = false,
    onNewer?: () => void,
  ): boolean {
    const parked = boundary.parked;
    const cache = boundary.cache;
    const resource = boundary.resource;
    if (!parked || this.#componentCache.get(owner) !== cache ||
      !cache.nativeBoundary || cache.pendingResource !== undefined ||
      !this.#boundaryPrimaries.has(String(owner)) ||
      !this.#liveOwners.has(owner) ||
      !canonicalWorldIsAlive.call(this.world, owner) ||
      !cacheCodeCurrentPrivate([cache]) ||
      parked.subscription.blockedReaders !== parked.witnesses ||
      (parked.subscription.boundary !== null &&
        parked.subscription.boundary !== owner) ||
      (parked.propsCurrent !== undefined && !parked.propsCurrent()) ||
      cache.subtreeOwners.size !== parked.ownerCaches.size ||
      !this.#parkedLocalChangesCurrent(cache.subtreeOwners,
        afterHost, onNewer) ||
      !this.#parkedAncestorControlsCurrent(parked,
        afterHost, onNewer)) return false;
    const resourceStatus = closedResourceStatus(resource);
    if (!resourceStatus) return false;
    const resourcePending = resourceStatus.status === "pending";
    const liveSubscription = this.#liveResourceSubscriptions.get(resource);
    if (!afterHost && (!resourcePending ||
      liveSubscription !== parked.subscription)) return false;
    if (afterHost && liveSubscription !== parked.subscription &&
      (resourcePending || !this.#pendingResourceRetry)) return false;
    if (afterHost && !resourcePending) onNewer?.();
    for (const owned of cache.subtreeOwners) {
      const accepted = parked.ownerCaches.get(owned);
      const lineage = parked.lineages.get(owned);
      const currentLineage = canonicalWorldOwnerLineage.call(this.world, owned);
      if (!accepted || this.#componentCache.get(owned) !== accepted ||
        !this.#liveOwners.has(owned) ||
        !canonicalWorldIsAlive.call(this.world, owned) ||
        !canonicalWorldIsWithin.call(this.world, owned, owner) ||
        !lineage || currentLineage.length !== lineage.length ||
        currentLineage.some((ancestor, index) => ancestor !== lineage[index]) ||
        !cacheCodeCurrentPrivate([accepted])) return false;
    }
    const witnessed = new Map<string, Set<AnyAsyncStore>>();
    for (const row of parked.witnesses) {
      const separator = row.originalId.indexOf("\u0000");
      const originalOwner = Number(row.originalId.slice(0, separator));
      let stores = witnessed.get(row.originalId);
      if (!stores) witnessed.set(row.originalId, stores = new Set());
      if (stores.has(row.store)) return false;
      stores.add(row.store);
      if (row.resource !== resource || row.boundaryOwner !== owner ||
        row.pendingId !==
          `\u0000suspense-pending:${owner}:${row.originalId}` ||
        separator <= 0 || !Number.isSafeInteger(originalOwner) ||
        !cache.subtreeOwners.has(originalOwner) ||
        row.acceptedBoundaryCache !== cache ||
        row.acceptedOwnerCache !== parked.ownerCaches.get(originalOwner) ||
        !this.#liveStoreReaders.get(row.originalId)?.has(row.store)) return false;
      const exact = inspectCanonicalBlockedStoreReaderReceipt(
        row.receipt, row.store, this.#rootId, row.pendingId,
      );
      if (!exact && (!afterHost ||
        !inspectCanonicalBlockedStoreReaderReceipt(
          row.receipt, row.store, this.#rootId, row.pendingId, "after-host",
        ))) return false;
      if (!exact) onNewer?.();
    }
    return parked.witnesses.length > 0;
  }

  #parkedLocalChangesCurrent(owners: ReadonlySet<OwnerId>,
    afterHost: boolean, onNewer?: () => void): boolean {
    for (const change of this.#pendingChanges.capture()) {
      if (!owners.has(change.owner)) continue;
      if (!afterHost || !change.cellIdentity ||
        !this.#liveOwners.has(change.owner) ||
        !canonicalWorldIsAlive.call(this.world, change.owner)) return false;
      const handle = canonicalWorldCellHandle.call(this.world,
        change.owner, change.site);
      const version = handle
        ? canonicalWorldVersionForCell.call(this.world, handle) : null;
      if (!handle || handle.cellIdentity !== change.cellIdentity ||
        version === null || version < change.version) {
        return false;
      }
      onNewer?.();
    }
    return true;
  }

  #parkedAncestorControlsCurrent(
    parked: NonNullable<HeldGenericBoundary["parked"]>,
    afterHost: boolean, onNewer?: () => void,
  ): boolean {
    if (!afterHost) return parked.ancestorControlsCurrent();
    for (const ancestor of parked.ancestorOwners) {
      const accepted = parked.ancestorCaches.get(ancestor);
      if (!canonicalWorldIsAlive.call(this.world, ancestor) ||
        (accepted !== undefined && !this.#liveOwners.has(ancestor)) ||
        this.#componentCache.get(ancestor) !== parked.ancestorCaches.get(ancestor)) {
        return false;
      }
    }
    if (!this.#parkedLocalChangesCurrent(parked.ancestorOwners,
      true, onNewer)) return false;
    for (const [readerId] of this.#liveStoreReaders) {
      if ([...parked.ancestorOwners].some((owner) =>
        this.#readerBelongsToOwner(readerId, owner)) &&
        !parked.ancestorReaders.has(readerId)) return false;
    }
    for (const [readerId, { membership, receipts }] of parked.ancestorReaders) {
      if (this.#liveStoreReaders.get(readerId) !== membership ||
        membership.size !== receipts.size) return false;
      for (const store of membership) {
        const receipt = receipts.get(store);
        const status = receipt && inspectCanonicalStoreReaderReceipt(
          store, this.#rootId, readerId, receipt,
        );
        if (!status) return false;
        if (status === "retained") onNewer?.();
      }
    }
    return true;
  }

  #captureParkedGenericState(): HeldGenericState | null {
    if (this.#publicationIntents.size > 0 ||
      this.#pendingCollectionRegionKeys.size > 0) return null;
    const boundaries = new Map<OwnerId, HeldGenericBoundary>();
    for (const [resource, subscription] of this.#liveResourceSubscriptions) {
      const witnesses = subscription.blockedReaders;
      if (!witnesses?.length ||
        closedResourceStatus(resource)?.status !== "pending") continue;
      const owner = witnesses[0].boundaryOwner;
      if (witnesses.some((row) => row.boundaryOwner !== owner) ||
        boundaries.has(owner)) return null;
      const cache = this.#componentCache.get(owner);
      if (!cache?.nativeBoundary || cache.pendingResource !== undefined) continue;
      const ancestorControlsCurrent =
        this.#captureBoundaryAncestorControlsCurrent(owner);
      if (!ancestorControlsCurrent) continue;
      const ancestorOwners = new Set(
        canonicalWorldOwnerLineage.call(this.world, owner).slice(1));
      const ancestorCaches = new Map<OwnerId, ComponentCache | undefined>();
      for (const ancestor of ancestorOwners) {
        ancestorCaches.set(ancestor, this.#componentCache.get(ancestor));
      }
      const ancestorReaders = new Map<string, {
        membership: ReadonlySet<AnyAsyncStore>;
        receipts: ReadonlyMap<AnyAsyncStore, AcceptedStoreReaderReceipt>;
      }>();
      let ancestorSupported = true;
      for (const [readerId, membership] of this.#liveStoreReaders) {
        if (![...ancestorOwners].some((ancestor) =>
          this.#readerBelongsToOwner(readerId, ancestor))) continue;
        const receipts = new Map<AnyAsyncStore, AcceptedStoreReaderReceipt>();
        for (const store of membership) {
          const receipt = captureCanonicalStoreReaderReceipt(
            store, this.#rootId, readerId,
          );
          if (!receipt || inspectCanonicalStoreReaderReceipt(
            store, this.#rootId, readerId, receipt,
          ) !== "current") {
            ancestorSupported = false;
            break;
          }
          receipts.set(store, receipt);
        }
        if (!ancestorSupported) break;
        ancestorReaders.set(readerId, { membership, receipts });
      }
      if (!ancestorSupported) continue;
      const ownerCaches = new Map<OwnerId, ComponentCache>();
      const lineages = new Map<OwnerId, readonly OwnerId[]>();
      for (const owned of cache.subtreeOwners) {
        const accepted = this.#componentCache.get(owned);
        if (!accepted) break;
        ownerCaches.set(owned, accepted);
        lineages.set(owned,
          canonicalWorldOwnerLineage.call(this.world, owned));
      }
      if (ownerCaches.size !== cache.subtreeOwners.size) continue;
      const boundary = { cache, resource, parked: {
        subscription, witnesses, ancestorControlsCurrent, ancestorOwners,
        ancestorCaches, ancestorReaders, ownerCaches, lineages,
      } };
      if (this.#parkedBoundaryCurrent(owner, boundary)) {
        boundaries.set(owner, boundary);
      }
    }
    if (boundaries.size === 0) return null;
    let independentReaderPending = false;
    for (const [readerId, membership] of this.#liveStoreReaders) {
      if ([...boundaries.values()].some(({ cache }) =>
        [...cache.subtreeOwners].some((owner) =>
          this.#readerBelongsToOwner(readerId, owner)))) continue;
      for (const store of membership) {
        const receipt = captureCanonicalStoreReaderReceipt(
          store, this.#rootId, readerId,
        );
        if (receipt && inspectCanonicalStoreReaderReceipt(
          store, this.#rootId, readerId, receipt,
        ) === "retained") independentReaderPending = true;
      }
    }
    if (!independentReaderPending) return null;
    const readers = new Map<string, {
      membership: ReadonlySet<AnyAsyncStore>;
      receipts: ReadonlyMap<AnyAsyncStore, AcceptedStoreReaderReceipt>;
    }>();
    for (const [readerId, membership] of this.#liveStoreReaders) {
      const boundary = [...boundaries].find(([, { cache }]) =>
        [...cache.subtreeOwners].some((owner) =>
          this.#readerBelongsToOwner(readerId, owner)));
      if (!boundary) continue;
      const receipts = new Map<AnyAsyncStore, AcceptedStoreReaderReceipt>();
      for (const store of membership) {
        const receipt = captureCanonicalStoreReaderReceipt(
          store, this.#rootId, readerId,
        );
        if (!receipt) return null;
        const status = inspectCanonicalStoreReaderReceipt(
          store, this.#rootId, readerId, receipt,
        );
        if (status === null ||
          (status === "retained" && !boundary[1].parked!.witnesses.some(
            (row) => row.originalId === readerId && row.store === store,
          ))) return null;
        receipts.set(store, receipt);
      }
      readers.set(readerId, { membership, receipts });
    }
    return { kind: "parked", holds: new Map(), boundaries, readers };
  }

  #heldGenericReadersState(
    state: HeldGenericState,
    afterHost = false,
    onNewer?: () => void,
  ): "current" | "retained" | null {
    let result: "current" | "retained" = "current";
    if (state.kind === "parked") {
      for (const [readerId] of this.#liveStoreReaders) {
        if ([...state.boundaries.values()].some(({ cache }) =>
          [...cache.subtreeOwners].some((owner) =>
            this.#readerBelongsToOwner(readerId, owner))) &&
          !state.readers.has(readerId)) return null;
      }
    }
    for (const [readerId, { membership, receipts }] of state.readers) {
      if (this.#liveStoreReaders.get(readerId) !== membership ||
        membership.size !== receipts.size) return null;
      for (const store of membership) {
        const receipt = receipts.get(store);
        if (!receipt) return null;
        const status = inspectCanonicalStoreReaderReceipt(
          store, this.#rootId, readerId, receipt,
        );
        if (status === null) return null;
        if (status === "retained") {
          if (state.kind === "parked") {
            const witnessed = [...state.boundaries.values()].some(({ parked }) =>
              parked?.witnesses.some((row) =>
                row.originalId === readerId && row.store === store));
            if (!witnessed && !afterHost) return null;
            if (!witnessed) onNewer?.();
          }
          result = "retained";
        }
      }
    }
    return result;
  }

  #captureBoundaryAncestorControlsCurrent(
    boundaryOwner: OwnerId,
  ): (() => boolean) | null {
    const ancestors = new Set(this.world.ownerLineage(boundaryOwner).slice(1));
    const localControlsCurrent = () =>
      !this.#pendingChanges.capture().some((change) => ancestors.has(change.owner));
    if (!localControlsCurrent()) return null;
    const readers: Array<{
      readerId: string;
      membership: ReadonlySet<AnyAsyncStore>;
      receipts: ReadonlyMap<AnyAsyncStore, AcceptedStoreReaderReceipt>;
    }> = [];
    for (const [readerId, membership] of this.#liveStoreReaders) {
      if (![...ancestors].some((owner) =>
        this.#readerBelongsToOwner(readerId, owner)
      )) continue;
      const receipts = new Map<AnyAsyncStore, AcceptedStoreReaderReceipt>();
      for (const store of membership) {
        const receipt = captureCanonicalStoreReaderReceipt(
          store, this.#rootId, readerId,
        );
        if (!receipt || inspectCanonicalStoreReaderReceipt(
          store, this.#rootId, readerId, receipt,
        ) !== "current") return null;
        receipts.set(store, receipt);
      }
      readers.push({ readerId, membership, receipts });
    }
    return () => localControlsCurrent() && readers.every(
      ({ readerId, membership, receipts }) =>
        this.#liveStoreReaders.get(readerId) === membership &&
        membership.size === receipts.size && [...membership].every((store) => {
          const receipt = receipts.get(store);
          return receipt !== undefined && inspectCanonicalStoreReaderReceipt(
            store, this.#rootId, readerId, receipt,
          ) === "current";
        }),
    );
  }

  #heldGenericStateCurrent(state: HeldGenericState,
    afterHost = false, onNewer?: () => void): boolean {
    if (this.#heldGenericReadersState(state, afterHost, onNewer) === null) return false;
    if (this.#publicationIntents.size !== state.holds.size) return false;
    for (const [release, hold] of state.holds) {
      if (this.#publicationIntents.get(release) !== hold) return false;
    }
    for (const [owner, { cache, resource }] of state.boundaries) {
      if (state.kind === "parked") {
        const boundary = state.boundaries.get(owner)!;
        if (!this.#parkedBoundaryCurrent(owner, boundary,
          afterHost, onNewer)) return false;
        continue;
      }
      if (!this.#liveOwners.has(owner) || !canonicalWorldIsAlive.call(this.world, owner) ||
        this.#componentCache.get(owner) !== cache ||
        !cacheCodeCurrentPrivate([cache]) ||
        cache.pendingResource !== resource) return false;
      for (const heldOwner of cache.subtreeOwners) {
        if (!this.#liveOwners.has(heldOwner) ||
          !canonicalWorldIsAlive.call(this.world, heldOwner) ||
          !canonicalWorldIsWithin.call(this.world, heldOwner, owner) ||
          !this.#componentCache.has(heldOwner)) return false;
      }
    }
    return true;
  }

  #unheldCellChanges(): boolean {
    if (this.#publicationIntents.size === 0) {
      return this.#pendingChanges.size > 0;
    }
    return this.#pendingChanges.capture().some((change) =>
      !change.cellIdentity || !this.#heldCell({
        owner: change.owner, site: change.site,
        cellIdentity: change.cellIdentity,
      })
    );
  }

  #unheldCollectionChanges(): boolean {
    return [...this.#pendingCollectionRegionKeys].some((key) => {
      const region = this.#liveCollectionRegions.get(key);
      return !region || !this.#heldCollection(region.collection);
    });
  }

  #resourceHoldWait(
    resources: ReadonlySet<AsyncResource<any>>, lease?: () => void,
    footprint: {
      readonly cells?: readonly StateCellHandle[];
      readonly stores?: readonly AnyAsyncStore[];
      readonly collections?: readonly KeyedCollection<any>[];
    } = {},
  ): AsyncResource<void> | null {
    for (const [owner, hold] of this.#publicationIntents) {
      if (owner === lease) break;
      if (![...resources].some((resource) => hold.resources.has(resource)) &&
        !(footprint.cells ?? []).some((cell) => hold.cells.some((held) =>
          held.owner === cell.owner && held.site === cell.site &&
          held.cellIdentity === cell.cellIdentity)) &&
        !(footprint.stores ?? []).some((store) => hold.stores.has(store)) &&
        !(footprint.collections ?? []).some((collection) =>
          hold.collections.has(collection))) continue;
      return hold.wait;
    }
    return null;
  }

  #leaseCoversSelection(
    lease: (() => void) | undefined,
    resources: ReadonlySet<AsyncResource<any>>,
    footprint: {
      readonly cells?: readonly StateCellHandle[];
      readonly stores?: readonly AnyAsyncStore[];
      readonly collections?: readonly KeyedCollection<any>[];
    },
  ): boolean {
    if (!lease) return true;
    const held = this.#publicationIntents.get(lease);
    return !!held && [...resources].every((resource) => held.resources.has(resource)) &&
      (footprint.cells ?? []).every((cell) => held.cells.some((selected) =>
        selected.owner === cell.owner && selected.site === cell.site &&
        selected.cellIdentity === cell.cellIdentity)) &&
      (footprint.stores ?? []).every((store) => held.stores.has(store)) &&
      (footprint.collections ?? []).every((collection) =>
        held.collections.has(collection)) &&
      this.#publicationIntents.get(lease) === held;
  }

  #boundaryResourceDependencies(
    tree: RuntimeNode, stores?: Set<AnyAsyncStore>,
  ): Set<AsyncResource<any>> | null {
    const dependencies = new Set<AsyncResource<any>>();
    let node: RuntimeNode = tree;
    const visited = new Set<Function>();
    for (let depth = 0; depth < 9; depth++) {
      if (!node || Array.isArray(node) || typeof node !== "object" ||
        !Object.isFrozen(node)) return null;
      const type = Object.getOwnPropertyDescriptor(node, "type")?.value;
      const props = Object.getOwnPropertyDescriptor(node, "props")?.value;
      if (typeof type !== "function" || visited.has(type) ||
        !props || typeof props !== "object" || !Object.isFrozen(props)) return null;
      visited.add(type);
      const descriptors = Object.getOwnPropertyDescriptors(props);
      if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string") ||
        Object.values(descriptors).some((descriptor) => !("value" in descriptor))) return null;
      for (const descriptor of Object.values(descriptors)) {
        if (descriptor.value instanceof AsyncResource) dependencies.add(descriptor.value);
        if (descriptor.value instanceof AsyncStore) stores?.add(descriptor.value);
      }
      const forward = closedComponentForwardProgramFor(type);
      if (!forward) return dependencies;
      const nextProps: Record<string, unknown> = {};
      for (const [name, expression] of forward.props) {
        if (expression.kind === "prop") {
          const source = descriptors[expression.name];
          if (!source || !("value" in source)) return null;
          nextProps[name] = source.value;
        } else nextProps[name] = expression.value;
      }
      node = Object.freeze({ type: forward.childComponent,
        props: Object.freeze(nextProps) }) as RuntimeNode;
    }
    return null;
  }

  #stageClosedStoreOutputs(
    selected: readonly AnyAsyncStore[], stores: StoreRenderTransaction,
    requireOutputChange = false,
    newlyStaged: ReadonlySet<AnyAsyncStore> = new Set(),
    retiredPendingReaders: ReadonlySet<string> = new Set(),
    resourceLease?: () => void,
    selectedCells: readonly RetainedCellWrite[] = [],
    privatePublication = false,
    deferPrivateCells = false,
  ): ClosedStoreOutputCut {
    if (new Set(selected).size !== selected.length) throw new SparseCandidateIneligible();
    const selectedStores = new Set(selected);
    const selectedCellSites = new Map<OwnerId, Set<string>>();
    for (const { handle } of selectedCells) {
      let sites = selectedCellSites.get(handle.owner);
      if (!sites) selectedCellSites.set(handle.owner, sites = new Set());
      sites.add(handle.site);
    }
    const inputStores = new Set<AnyAsyncStore>(selected);
    const inputCells: StateCellHandle[] = [];
    const inputResources = new Set<AsyncResource<any>>();
    type Input = { id: string; prop: string; source: unknown;
      membership?: Set<AnyAsyncStore>; acceptedReceipt?: AcceptedStoreReaderReceipt };
    type StoreInput = Input & { store: AnyAsyncStore; source: AnyAsyncStore;
      membership: Set<AnyAsyncStore> };
    type Owner = { owner: OwnerId; cache: ComponentCache; inputs: readonly Input[];
      stateInputs: readonly RetainedCellWrite[]; next?: RuntimeElement;
      nextResult?: RuntimeElement; frame?: OwnedScalarFrame;
      authoredTemplate?: ScalarOutputTemplate;
      expandedTemplate?: ScalarOutputTemplate;
      keyedOutput?: Readonly<{ parentOwner: OwnerId; parentCache: ComponentCache;
        region: KeyedRegionCache; key: string; value: RuntimeElement }>;
      nextShape?: ClosedStoreOutputShape;
      scalarPlan?: import("./vdom_snapshot_runtime.ts").MountedScalarStorePlan;
      regionIndex: number };
    const owners = new Map<OwnerId, Owner>();
    let privateCellCut: ClosedWorldCellCut | null = null;
    let phaseCellCut: ClosedWorldCellCut | null = null;
    let producerCellCut: ClosedWorldCellCut | null = null;
    let externalCellCutCovered = false;
    let hasMixedOwner = false;
    const covered = new Set<string>();
    const seen = new Set<AnyAsyncStore>();
    const regions: (StorePropDelta | import("./vdom_snapshot_runtime.ts").OwnedScalarStoreRegion)[] = [];
    const resources = new ResourceReadSet(this.#resourceTable);
    let outputChanged = false;
    let allOwnedScalar = true;
    let kernelInputs: number[] | null = null;
    let kernelOutputs: number[] | null = null;
    type NumericRow = {
      owner: OwnerId; cache: ComponentCache; inputs: readonly Input[];
      stateInputs: readonly RetainedCellWrite[];
      program: Exclude<ClosedStoreHostProgram, { schemaVersion: 4 }>;
      boundRequest?: BoundClosedStoreOutputRequest;
      boundInputs?: ClosedStoreOutputShape["boundInputs"];
      boundExecution?: NormalizedClosedStoreDataExecution;
    };
    let numericRun: {
      kernel: ClosedStoreNumericKernel; inputStart: number; rows: NumericRow[];
    } | null = null;
    const emptyStateInputs: readonly RetainedCellWrite[] = Object.freeze([]);
    type PassiveRow = Omit<Owner, "inputs"> & {
      program: ClosedStoreHostProgram;
      dataExecution: NormalizedClosedStoreDataExecution;
      inputs: readonly StoreInput[];
      boundRequest?: BoundClosedStoreOutputRequest;
    };
    const passiveRows: PassiveRow[] = [];
    const passiveByReader = new Set<string>();
    let coverage: Readonly<{
      ownerPrefixes: ReadonlySet<string>;
      coveredReaders: ReadonlySet<string>;
    }> | null = null;
    const ownValue = (object: object, name: string) => {
      const descriptor = Object.getOwnPropertyDescriptor(object, name);
      return descriptor && "value" in descriptor ? descriptor.value : undefined;
    };
    const ownedShape = (
      cache: ComponentCache, program: ClosedStoreHostProgram, owner: OwnerId,
      hostKey: string,
    ): ClosedStoreOutputShape | undefined => {
      const shape = cache.output.shape;
      if (!shape || shape.program !== program || shape.owner !== owner ||
        shape.cacheProps !== cache.props || shape.hostKey !== hostKey ||
        shape.tag !== program.host.tag) return undefined;
      return shape;
    };
    let passiveEligible = newlyStaged.size === 0 && retiredPendingReaders.size === 0;
    if (passiveEligible) {
      const candidates = new Set<OwnerId>();
      for (const [id, membership] of this.#liveStoreReaders) {
        if (![...membership].some((store) => selectedStores.has(store))) continue;
        passiveByReader.add(id);
        const split = id.indexOf("\u0000");
        const owner = Number(id.slice(0, split));
        if (split <= 0 || !Number.isSafeInteger(owner)) {
          passiveEligible = false; break;
        }
        candidates.add(owner);
      }
      for (const owner of selectedCellSites.keys()) candidates.add(owner);
      if (candidates.size === 0) passiveEligible = false;
      for (const owner of candidates) {
        if (!passiveEligible) break;
        const cache = this.#componentCache.get(owner);
        const metadata = typeof cache?.type === "function"
          ? definedComponents.get(cache.type)?.metadata : undefined;
        const program = metadata?.closedStoreHostProgram;
        if (!cache || !program || !metadata?.closedStoreExecution ||
          program.schemaVersion === 4 ||
          metadata.closedStoreNumericKernel ||
          !this.#liveOwners.has(owner) || !componentCodeCurrentPrivate(cache.type) ||
          (cache.output.kind === "ordinary" &&
            (!isRuntimeOwnedElement(cache.output.expanded) ||
              !Object.isFrozen(cache.output.expanded.props))) ||
          (cache.output.kind === "scalar" && !cache.output.expandedValid) ||
          cache.keyedRegion || cache.nativeBoundary || cache.propBoundSites.size > 0 ||
          (program.schemaVersion !== 6 && program.schemaVersion !== 7 &&
            cache.subtreeOwners.size !== 1) ||
          (program.schemaVersion !== 7 && cache.ownEffects.size !== 0)) {
          passiveEligible = false; break;
        }
        if (program.schemaVersion === 7 &&
          (cache.ownEffects.size !== program.effectSites.length ||
            program.effectSites.some((site) =>
              !cache.ownEffects.has(effectKey(owner, site)) ||
              !this.#liveEffectKeysByOwner.get(owner)?.has(effectKey(owner, site))))) {
          passiveEligible = false; break;
        }
        const programInputs = closedStoreHostInputs(program);
        const hostKey = cache.scopeExplicitHostKeys === true
          ? `${String(cache.hostKeyScope)}\u0000${program.host.key}` : program.host.key;
        const shape = ownedShape(cache, program, owner, hostKey);
        const priorInputs = shape?.boundInputs;
        const reusable = !!shape?.boundRequest &&
          shape.boundExecution === metadata.closedStoreExecution &&
          priorInputs?.length === programInputs.length &&
          priorInputs.every((prior, index) => {
            const input = programInputs[index];
            const id = `${owner}\u0000${input.storeUseSiteId}`;
            const store = ownValue(cache.props, input.storeProp);
            const membership = this.#liveStoreReaders.get(id);
            return prior.id === id && prior.prop === input.storeProp &&
              prior.source === store && prior.store === store &&
              prior.membership === membership && membership?.size === 1 &&
              membership.has(store as AnyAsyncStore) &&
              selectedStores.has(store as AnyAsyncStore);
          });
        let rowInputs: PassiveRow["inputs"];
        if (reusable && priorInputs && shape?.boundRequest) {
          rowInputs = priorInputs;
        } else {
          const freshInputs: StoreInput[] = [];
          for (const input of programInputs) {
            const id = `${owner}\u0000${input.storeUseSiteId}`;
            const store = ownValue(cache.props, input.storeProp);
            const membership = this.#liveStoreReaders.get(id);
            if ((typeof store !== "object" || store === null) ||
              !selectedStores.has(store as AnyAsyncStore) ||
              !membership || membership.size !== 1 ||
              !membership.has(store as AnyAsyncStore)) {
              passiveEligible = false; break;
            }
            freshInputs.push(Object.freeze({ id, prop: input.storeProp,
              source: store as AnyAsyncStore, store: store as AnyAsyncStore,
              membership }));
            if (this.#activeCounters) this.#count("store.bound-input.allocated-records");
          }
          rowInputs = Object.freeze(freshInputs);
        }
        if (passiveEligible) {
          for (const input of rowInputs) {
            passiveByReader.delete(input.id);
            seen.add(input.store);
          }
          passiveRows.push({ owner, cache, program,
            dataExecution: metadata.closedStoreExecution,
            inputs: rowInputs, stateInputs: emptyStateInputs,
            ...(reusable && shape?.boundRequest ? { boundRequest: shape.boundRequest } : {}),
            regionIndex: -1 });
        }
      }
      if (passiveByReader.size !== 0 ||
        [...selectedStores].some((store) => !seen.has(store))) passiveEligible = false;
    }
    if (!passiveEligible) seen.clear();
    let passive: readonly OwnedClosedStoreOutputRow[] | null = null;
    let acceptedScalarPlans: readonly (import("./vdom_snapshot_runtime.ts").MountedScalarStorePlan | null)[] = [];
    const nextShape = (
      cache: ComponentCache, program: ClosedStoreHostProgram, owner: OwnerId,
      hostKey: string,
      boundRequest?: BoundClosedStoreOutputRequest,
      boundInputs?: ClosedStoreOutputShape["boundInputs"],
      boundExecution?: NormalizedClosedStoreDataExecution,
    ): ClosedStoreOutputShape => {
      const prior = ownedShape(cache, program, owner, hostKey);
      if (prior && prior.boundRequest === boundRequest &&
        prior.boundInputs === boundInputs &&
        prior.boundExecution === boundExecution) return prior;
      return Object.freeze({ program, owner, cacheProps: cache.props,
        hostKey, tag: program.host.tag, boundRequest, boundExecution,
        boundInputs: boundInputs && (Object.isFrozen(boundInputs) ? boundInputs
          : Object.freeze([...boundInputs])) });
    };
    const scalarRegion = (region: StorePropDelta): StorePropDelta => {
      const owned = createOwnedScalarStorePropDelta(region);
      if (!owned) allOwnedScalar = false;
      return owned ?? region;
    };
    const treeRegions = (
      host: ClosedHostTreeNode, previous: RuntimeNode, next: RuntimeNode,
    ): { regions: StorePropDelta[]; changed: boolean } | null => {
      const staged: StorePropDelta[] = [];
      let changed = false;
      const visit = (shape: ClosedHostTreeNode, old: RuntimeNode, proposed: RuntimeNode): boolean => {
        if (!old || !proposed || Array.isArray(old) || Array.isArray(proposed) ||
          typeof old !== "object" || typeof proposed !== "object") return false;
        const priorElement = Object.getOwnPropertyDescriptors(old);
        const nextElement = Object.getOwnPropertyDescriptors(proposed);
        const oldType = priorElement.type, newType = nextElement.type;
        const oldProps = priorElement.props, newProps = nextElement.props;
        if (!oldType || !newType || !oldProps || !newProps ||
          !("value" in oldType) || !("value" in newType) ||
          !("value" in oldProps) || !("value" in newProps)) return false;
        const priorType = oldType.value;
        const nextType = newType.value;
        const priorProps = oldProps.value;
        const nextProps = newProps.value;
        if (priorType !== shape.tag || nextType !== shape.tag ||
          !priorProps || !nextProps || typeof priorProps !== "object" ||
          typeof nextProps !== "object" || Array.isArray(priorProps) ||
          Array.isArray(nextProps)) return false;
        const priorDescriptors = Object.getOwnPropertyDescriptors(priorProps);
        const nextDescriptors = Object.getOwnPropertyDescriptors(nextProps);
        const oldKey = priorDescriptors.key, newKey = nextDescriptors.key;
        if (!oldKey || !newKey || !("value" in oldKey) || !("value" in newKey) ||
          oldKey.value !== shape.key || newKey.value !== shape.key) return false;
        const expected = new Set(["key", "children", ...shape.props.map(([name]) => name)]);
        if (Object.keys(priorDescriptors).some((name) => !expected.has(name)) ||
          Object.keys(nextDescriptors).some((name) => !expected.has(name))) return false;
        const props: Array<readonly [string, ClosedHostOutputValue]> = [];
        for (const [name] of shape.props) {
          const prior = priorDescriptors[name];
          const proposedValue = nextDescriptors[name];
          if (!prior || !proposedValue || !("value" in prior) ||
            !("value" in proposedValue)) return false;
          props.push([name, proposedValue.value as ClosedHostOutputValue]);
          changed ||= !sameClosedHostOutput(shape.tag, name, prior.value, proposedValue.value);
        }
        const childrenFor = (
          descriptors: Record<string, PropertyDescriptor>,
        ): RuntimeNode[] | null => {
          const descriptor = descriptors.children;
          if (descriptor && !("value" in descriptor)) return null;
          if (shape.children.length === 0) return descriptor?.value === undefined ? [] : null;
          const value = descriptor?.value;
          if (shape.children.length === 1) return Array.isArray(value) ? null : [value];
          if (!Array.isArray(value)) return null;
          const elements = Object.getOwnPropertyDescriptors(value) as unknown as
            Record<string, PropertyDescriptor>;
          const length = elements.length;
          if (!length || !("value" in length) ||
            length.value !== shape.children.length ||
            Reflect.ownKeys(value).length !== shape.children.length + 1) return null;
          const copy: RuntimeNode[] = [];
          for (let index = 0; index < shape.children.length; index++) {
            const item = elements[index];
            if (!item || !("value" in item)) return null;
            copy.push(item.value as RuntimeNode);
          }
          return copy;
        };
        const oldChildren = childrenFor(priorDescriptors);
        const nextChildren = childrenFor(nextDescriptors);
        if (!oldChildren || !nextChildren ||
          oldChildren.length !== shape.children.length ||
          nextChildren.length !== shape.children.length) return false;
        const childDescriptions: NonNullable<StorePropDelta["children"]>[number][] = [];
        staged.push({ key: shape.key, tag: shape.tag, props, children: childDescriptions });
        for (let index = 0; index < shape.children.length; index++) {
          const child = shape.children[index];
          const oldChild = oldChildren[index];
          const nextChild = nextChildren[index];
          if (child.kind === "host") {
            childDescriptions.push({ kind: "host", key: child.host.key, tag: child.host.tag });
            if (!visit(child.host, oldChild, nextChild)) return false;
          } else {
            if ((typeof oldChild !== "string" && typeof oldChild !== "number") ||
              (typeof nextChild !== "string" && typeof nextChild !== "number")) return false;
            const oldText = String(oldChild);
            const nextText = String(nextChild);
            childDescriptions.push({ kind: "text", text: nextText });
            changed ||= oldText !== nextText;
          }
        }
        return true;
      };
      return visit(host, previous, next) ? { regions: staged.map(scalarRegion), changed } : null;
    };
    const stageLeaf = (
      { owner, cache, inputs, stateInputs, program, boundRequest, boundInputs,
        boundExecution }: NumericRow,
      output: ClosedStoreHostOutput | null,
      enclosedRegion?: StorePropDelta,
    ) => {
      if (program.schemaVersion === 6 ||
        (program.schemaVersion === 7 && program.retainedChildProp === "children")) {
        const authored = this.#cacheOutputView(cache, false);
        const expanded = this.#cacheOutputView(cache, true);
        const hostKey = cache.scopeExplicitHostKeys === true
          ? `${String(cache.hostKeyScope)}\u0000${program.host.key}`
          : program.host.key;
        const child = Object.getOwnPropertyDescriptor(cache.props, "children");
        if (!cache.retainedStoreChildAdmitted || !Object.isFrozen(cache.props) ||
          !child || !("value" in child) ||
          !isRuntimeOwnedElement(child.value) || !Object.isFrozen(child.value) ||
          !output || !isRuntimeOwnedElement(authored) ||
          !isRuntimeOwnedElement(expanded)) throw new SparseCandidateIneligible();
        const proof = ownedShape(cache, program, owner, hostKey);
        if (!proof) {
          if (getComponentOutputOwner(authored) !== owner ||
            getComponentOutputOwner(expanded) !== owner ||
            authored.type !== program.host.tag || expanded.type !== program.host.tag) {
            throw new SparseCandidateIneligible();
          }
          const authoredProps = Object.getOwnPropertyDescriptors(authored.props);
          const expandedProps = Object.getOwnPropertyDescriptors(expanded.props);
          const expected = new Set(["key", "children", ...program.host.props.map(([name]) => name)]);
          if (Object.keys(authoredProps).some((name) => !expected.has(name)) ||
            Object.keys(expandedProps).some((name) => !expected.has(name)) ||
            Object.getOwnPropertySymbols(authored.props).length !== 1 ||
            Object.getOwnPropertySymbols(expanded.props).length !== 1 ||
            authoredProps.key?.value !== hostKey || expandedProps.key?.value !== hostKey ||
            authoredProps.children?.value !== child.value ||
            !expandedProps.children || !("value" in expandedProps.children) ||
            !isRuntimeOwnedElement(expandedProps.children.value) ||
            program.host.props.some(([name]) =>
              !("value" in (authoredProps[name] ?? {})) ||
              !("value" in (expandedProps[name] ?? {})))) {
            throw new SparseCandidateIneligible();
          }
        } else if (authored.props.children !== child.value ||
          !isRuntimeOwnedElement(expanded.props.children)) {
          throw new SparseCandidateIneligible();
        }
        const expandedChild = expanded.props.children;
        outputChanged ||= output.some(([name, value]) =>
          !sameClosedHostOutput(program.host.tag, name, expanded.props[name], value));
        const nextResult = copyRuntimeElementFromEntries(program.host.tag,
          [["key", hostKey], ...output, ["children", child.value]], owner);
        const next = copyRuntimeElementFromEntries(program.host.tag,
          [["key", hostKey], ...output, ["children", expandedChild]], owner);
        owners.set(owner, { owner, cache, inputs, stateInputs, next, nextResult,
          nextShape: nextShape(cache, program, owner, hostKey,
            boundRequest, boundInputs,
            boundExecution),
          regionIndex: regions.length });
        regions.push(enclosedRegion ?? scalarRegion({ key: hostKey, tag: program.host.tag,
          props: output, retainedChildren: true, componentOwner: owner }));
        return;
      }
      if (program.schemaVersion === 7 || program.schemaVersion === 5) {
        const authored = this.#cacheOutputView(cache, false);
        const expanded = this.#cacheOutputView(cache, true);
        const hostKey = cache.scopeExplicitHostKeys === true
          ? `${String(cache.hostKeyScope)}\u0000${program.host.key}`
          : program.host.key;
        if (!output || !isRuntimeOwnedElement(authored) ||
          !isRuntimeOwnedElement(expanded)) {
          throw new SparseCandidateIneligible();
        }
        const proof = ownedShape(cache, program, owner, hostKey);
        if (!proof) {
          if (getComponentOutputOwner(authored) !== owner ||
            getComponentOutputOwner(expanded) !== owner ||
            authored.type !== program.host.tag || expanded.type !== program.host.tag ||
            Object.getOwnPropertySymbols(authored.props).length !== 1 ||
            Object.getOwnPropertySymbols(expanded.props).length !== 1) {
            throw new SparseCandidateIneligible();
          }
          const before = Object.getOwnPropertyDescriptors(expanded.props);
          const authoredProps = Object.getOwnPropertyDescriptors(authored.props);
          const expected = new Set(["key", ...program.host.props.map(([name]) => name)]);
          if (Object.keys(before).some((name) => !expected.has(name)) ||
            Object.keys(authoredProps).some((name) => !expected.has(name)) ||
            before.key?.value !== hostKey || authoredProps.key?.value !== hostKey ||
            before.children !== undefined || authoredProps.children !== undefined ||
            program.host.props.some(([name]) =>
              !("value" in (before[name] ?? {})) ||
              !("value" in (authoredProps[name] ?? {})))) {
            throw new SparseCandidateIneligible();
          }
        }
        outputChanged ||= output.some(([name, value]) =>
          !sameClosedHostOutput(program.host.tag, name, expanded.props[name], value));
        const next = copyRuntimeElementFromEntries(program.host.tag,
          [["key", hostKey], ...output], owner);
        owners.set(owner, { owner, cache, inputs, stateInputs, next,
          nextShape: nextShape(cache, program, owner, hostKey,
            boundRequest, boundInputs, boundExecution),
          regionIndex: regions.length });
        regions.push(enclosedRegion ?? scalarRegion({ key: hostKey, tag: program.host.tag,
          props: output, retainedChildren: true, componentOwner: owner }));
        return;
      }
      const previous = this.#cacheOutputView(cache, true);
      if (!output || !previous || Array.isArray(previous) || typeof previous !== "object" ||
        previous.type !== program.host.tag || previous.props.key !== program.host.key ||
        (previous.props.children !== undefined && previous.props.children !== null && previous.props.children !== false)) {
        throw new SparseCandidateIneligible();
      }
      outputChanged ||= output.some(([name, value]) =>
        !sameClosedHostOutput(program.host.tag, name, previous.props[name], value));
      const next = copyRuntimeElementFromEntries(program.host.tag,
        [["key", program.host.key], ...output], owner);
      owners.set(owner, { owner, cache, inputs, stateInputs, next,
        nextShape: nextShape(cache, program, owner, program.host.key,
          boundRequest, boundInputs,
          boundExecution),
        regionIndex: regions.length });
      regions.push(enclosedRegion ?? scalarRegion({ key: program.host.key,
        tag: program.host.tag, props: output }));
    };
    const stagePassiveRow = (row: PassiveRow,
      image: OwnedClosedStoreOutputRow) => {
      const { owner, cache, program, inputs: capturedInputs } = row;
      const hostKey = cache.scopeExplicitHostKeys === true
        ? `${String(cache.hostKeyScope)}\u0000${program.host.key}` : program.host.key;
      if (image.owner !== owner || image.tag !== program.host.tag ||
        image.key !== hostKey || owners.has(owner)) throw new SparseCandidateIneligible();
      const proof = ownedShape(cache, program, owner, hostKey);
      const retained = program.schemaVersion === 6 ||
        (program.schemaVersion === 7 && program.retainedChildProp === "children");
      const prior = cache.output;
      if (prior.kind === "scalar" && !prior.expandedValid) {
        throw new SparseCandidateIneligible();
      }
      let previousProps: Record<string, PropertyDescriptor> | undefined;
      if (prior.kind === "ordinary") {
        if (!isRuntimeOwnedElement(prior.authored) ||
          !isRuntimeOwnedElement(prior.expanded) ||
          !Object.isFrozen(prior.authored.props) ||
          !Object.isFrozen(prior.expanded.props) ||
          getComponentOutputOwner(prior.authored) !== owner ||
          getComponentOutputOwner(prior.expanded) !== owner ||
          prior.authored.type !== image.tag || prior.expanded.type !== image.tag) {
          throw new SparseCandidateIneligible();
        }
        const authoredProps = Object.getOwnPropertyDescriptors(prior.authored.props);
        previousProps = Object.getOwnPropertyDescriptors(prior.expanded.props);
        const expected = new Set(["key", ...program.host.props.map(([name]) => name),
          ...(retained ? ["children"] : [])]);
        if (Object.keys(authoredProps).some((name) => !expected.has(name)) ||
          Object.keys(previousProps).some((name) => !expected.has(name)) ||
          Object.getOwnPropertySymbols(prior.authored.props).length !== 1 ||
          Object.getOwnPropertySymbols(prior.expanded.props).length !== 1 ||
          authoredProps.key?.value !== hostKey ||
          previousProps.key?.value !== hostKey ||
          program.host.props.some(([name]) =>
            !("value" in (authoredProps[name] ?? {})) ||
            !("value" in (previousProps![name] ?? {}))) ||
          (retained && (!("value" in (authoredProps.children ?? {})) ||
            !("value" in (previousProps.children ?? {}))))) {
          throw new SparseCandidateIneligible();
        }
      }
      let authoredChild: RuntimeNode | undefined;
      let expandedChild: RuntimeNode | undefined;
      if (retained) {
        const child = Object.getOwnPropertyDescriptor(cache.props, "children");
        if (!cache.retainedStoreChildAdmitted || !Object.isFrozen(cache.props) ||
          !child || !("value" in child) || !isRuntimeOwnedElement(child.value) ||
          !Object.isFrozen(child.value) || image.retainedChildren !== true ||
          image.componentOwner !== owner) throw new SparseCandidateIneligible();
        authoredChild = child.value;
        if (proof) {
          const priorAuthored = prior.kind === "scalar"
            ? prior.authoredTemplate.children
            : isRuntimeOwnedElement(prior.authored)
            ? Object.getOwnPropertyDescriptor(prior.authored.props, "children")?.value
            : undefined;
          const priorExpanded = prior.kind === "scalar"
            ? prior.expandedTemplate.children : previousProps?.children?.value;
          if (priorAuthored !== authoredChild ||
            !isRuntimeOwnedElement(priorExpanded)) {
            throw new SparseCandidateIneligible();
          }
          expandedChild = priorExpanded;
        } else if (prior.kind === "ordinary" &&
          isRuntimeOwnedElement(prior.authored) &&
          Object.getOwnPropertyDescriptor(prior.authored.props,
            "children")?.value === authoredChild &&
          isRuntimeOwnedElement(previousProps?.children?.value)) {
          expandedChild = previousProps!.children.value;
        } else throw new SparseCandidateIneligible();
      } else if (image.retainedChildren !== true || image.componentOwner !== owner) {
        throw new SparseCandidateIneligible();
      }
      if (prior.kind === "scalar") {
        if (!prior.expandedValid || prior.frame.layout !== image.frame.layout ||
          prior.authoredTemplate.key !== hostKey ||
          prior.expandedTemplate.key !== hostKey ||
          prior.authoredTemplate.tag !== image.tag ||
          prior.expandedTemplate.tag !== image.tag ||
          prior.authoredTemplate.owner !== owner ||
          prior.expandedTemplate.owner !== owner) {
          throw new SparseCandidateIneligible();
        }
        for (let index = 0; index < image.frame.length; index++) {
          outputChanged ||= !Object.is(prior.frame.valueAt(index),
            image.frame.valueAt(index));
        }
      } else {
        for (let index = 0; index < image.frame.length; index++) {
          const name = image.frame.layout.nameAt(index);
          outputChanged ||= !sameClosedHostOutput(image.tag, name,
            previousProps![name].value, image.frame.valueAt(index));
        }
      }
      if (program.schemaVersion === 7) {
        hasMixedOwner = true;
        if (image.cells.length !== program.stateSites.length) {
          throw new SparseCandidateIneligible();
        }
        for (const captured of image.cells) {
          const wait = this.#resourceHoldWait(new Set(), resourceLease,
            { cells: [captured.handle] });
          if (wait) throw new HeldPublicationWait(wait);
          inputCells.push(captured.handle);
        }
        if (selectedCellSites.has(owner) &&
          [...selectedCellSites.get(owner)!].some((site) =>
            !program.stateSites.includes(site))) throw new SparseCandidateIneligible();
      } else if (image.cells.length || selectedCellSites.has(owner)) {
        throw new SparseCandidateIneligible();
      }
      row.stateInputs = image.cells;
      if (closedStoreHostInputs(program).length !== capturedInputs.length) {
        throw new SparseCandidateIneligible();
      }
      for (const captured of capturedInputs) {
        const store = captured.store;
        inputStores.add(store);
        const wait = this.#resourceHoldWait(new Set(), resourceLease,
          { stores: [store] });
        if (wait) throw new HeldPublicationWait(wait);
        covered.add(captured.id);
        if (selectedStores.has(store)) seen.add(store);
      }
      const reuseTemplates = prior.kind === "scalar" &&
        prior.authoredTemplate.children === authoredChild &&
        prior.expandedTemplate.children === expandedChild;
      const authoredTemplate: ScalarOutputTemplate = reuseTemplates
        ? prior.authoredTemplate : Object.freeze({ tag: image.tag, key: hostKey,
          owner, ...(retained ? { children: authoredChild } : {}) });
      const expandedTemplate: ScalarOutputTemplate = reuseTemplates
        ? prior.expandedTemplate : Object.freeze({ tag: image.tag, key: hostKey,
          owner, ...(retained ? { children: expandedChild } : {}) });
      const parentOwner = image.lineage[1];
      const parentCache = parentOwner === undefined ? undefined
        : this.#componentCache.get(parentOwner);
      const keyedRegion = parentCache?.keyedRegion;
      const keyedKey = keyedRegion?.keysByOwner.get(owner);
      const keyedCounts: OwnedScalarOutputCounts | undefined = keyedKey !== undefined &&
        this.#activeCounters
        ? { frames: 0, rootMaterializations: 0, propMaterializations: 0 }
        : undefined;
      const keyedOutput = parentOwner !== undefined && parentCache &&
        keyedRegion && keyedKey !== undefined
        ? Object.freeze({ parentOwner, parentCache, region: keyedRegion,
          key: keyedKey, value: materializeOwnedScalarRuntimeElement(
            image.frame, expandedTemplate, keyedCounts) })
        : undefined;
      if (keyedCounts) {
        this.#count("store.scalar-output.root-materializations",
          keyedCounts.rootMaterializations);
        this.#count("store.scalar-output.prop-materializations",
          keyedCounts.propMaterializations);
      }
      const next = nextShape(cache, program, owner, hostKey,
        row.boundRequest, row.inputs,
        row.dataExecution);
      row.frame = image.frame;
      row.authoredTemplate = authoredTemplate;
      row.expandedTemplate = expandedTemplate;
      row.keyedOutput = keyedOutput;
      row.nextShape = next;
      row.regionIndex = regions.length;
      owners.set(owner, row);
      regions.push(Object.freeze({ key: image.key, tag: image.tag,
        frame: image.frame, ...(image.retainedChildren ? {
          retainedChildren: true as const, componentOwner: image.componentOwner,
        } : {}) }));
    };
    const flushNumericRun = () => {
      const run = numericRun;
      if (!run) return;
      numericRun = null;
      const inputs = kernelInputs!;
      const outputs = kernelOutputs!;
      const stride = run.kernel.propNames.length;
      const outputStart = outputs.length;
      const expected = run.rows.length * stride;
      for (let index = 0; index < expected; index++) outputs.push(NaN);
      const written = run.kernel.executeRange(
        inputs, run.inputStart, run.rows.length, outputs, outputStart,
      );
      if (written !== expected || outputs.length !== outputStart + expected) {
        throw new SparseCandidateIneligible();
      }
      for (let rowIndex = 0; rowIndex < run.rows.length; rowIndex++) {
        const props: Array<readonly [string, number]> = [];
        for (let propIndex = 0; propIndex < stride; propIndex++) {
          const offset = outputStart + rowIndex * stride + propIndex;
          const value = outputs[offset];
          if (!Object.hasOwn(outputs, offset) || !Number.isFinite(value)) {
            throw new SparseCandidateIneligible();
          }
          props.push(Object.freeze([run.kernel.propNames[propIndex], value] as const));
        }
        stageLeaf(run.rows[rowIndex], Object.freeze(props));
      }
      if (this.#activeCounters) {
        this.#count("store.numeric-kernel.runs");
        this.#count("store.numeric-kernel.rows", run.rows.length);
      }
      run.rows.length = 0;
    };
    const current = (privateOnly = false, afterHost = false) => {
      let worldPhaseCurrent = false;
      if (!privateOnly && passive && phaseCellCut) {
        const status = validateCanonicalClosedWorldPhase(this.world, phaseCellCut,
          afterHost ? "after-host" : "prepared");
        if (status === "stale") return false;
        worldPhaseCurrent = status === "current";
      }
      const ownerPrefixes = coverage?.ownerPrefixes;
      const coveredReaders = coverage?.coveredReaders;
      if (!ownerPrefixes || !coveredReaders) return false;
      for (const [owner, { cache, inputs, stateInputs, keyedOutput }] of owners) {
        if (worldPhaseCurrent &&
          (typeof cache.type !== "function" || !definedComponents.has(cache.type))) {
          worldPhaseCurrent = false;
        }
        if (!this.#liveOwners.has(owner) ||
          !canonicalWorldIsAlive.call(this.world, owner) ||
          this.#componentCache.get(owner) !== cache ||
          (keyedOutput !== undefined &&
            (this.#componentCache.get(keyedOutput.parentOwner) !==
              keyedOutput.parentCache ||
              keyedOutput.region.keysByOwner.get(owner) !== keyedOutput.key)) ||
          !(privateOnly ? componentCodeCurrentPrivate(cache.type) :
            componentCodeCurrent(cache.type)) ||
          !inputs.every(({ id, prop, source, membership, acceptedReceipt }) => {
            if (ownValue(cache.props, prop) !== source ||
              (membership !== undefined &&
                (this.#liveStoreReaders.get(id) !== membership ||
                  membership.size !== 1 ||
                  !membership.has(source as AnyAsyncStore)))) return false;
            if (acceptedReceipt !== undefined) {
              const status = inspectCanonicalStoreReaderReceipt(
                source as AnyAsyncStore, this.#rootId, id, acceptedReceipt,
              );
              if (afterHost ? status === null : status !== "current") return false;
            }
            return true;
          }) || !stateInputs.every(({ handle, source, version, value }) => {
            if (worldPhaseCurrent) return true;
            if (privateOnly && (privateCellCut ||
              (deferPrivateCells && externalCellCutCovered))) return true;
            const liveSource = privateOnly
              ? canonicalWorldScalarSourceForCell.call(this.world, handle)
              : this.world.scalarSourceForCell(handle);
            const liveVersion = privateOnly
              ? canonicalWorldVersionForCell.call(this.world, handle)
              : this.world.versionForCell(handle);
            return liveSource === source && liveVersion !== null &&
              (afterHost ? liveVersion >= version : liveVersion === version) &&
              (afterHost && liveVersion > version || capturedScalarCurrent(source, value));
          })) return false;
      }
      if (hasMixedOwner) {
        for (const change of this.#pendingChanges.capture()) {
          const stateInputs = owners.get(change.owner)?.stateInputs;
          if (!stateInputs?.length ||
            selectedCellSites.get(change.owner)?.has(change.site)) continue;
          const captured = stateInputs.find(({ handle }) => handle.site === change.site);
          if (!afterHost || !captured ||
            change.cellIdentity !== captured.handle.cellIdentity ||
            change.version <= captured.version) return false;
        }
      }
      if (privateOnly && !deferPrivateCells && privateCellCut &&
        !validateClosedWorldCellCut(this.world, privateCellCut,
          afterHost ? "after-host" : "prepared")) return false;
      if (!afterHost && this.#resourceHoldWait(new Set(), resourceLease,
        { cells: inputCells })) return false;
      const canonicalMembershipIteration = passive &&
        ownDataDescriptor(Set.prototype, "forEach")?.value === canonicalSetForEach &&
        ownDataDescriptor(Set.prototype, "has")?.value === canonicalSetHas;
      for (const [id, membership] of this.#liveStoreReaders) {
        const split = id.indexOf("\u0000");
        if (split >= 0 && canonicalSetHas.call(ownerPrefixes, id.slice(0, split)) &&
          !canonicalSetHas.call(coveredReaders, id)) return false;
        let selectedMember = false;
        if (canonicalMembershipIteration) {
          canonicalSetForEach.call(membership, (store) => {
            if (canonicalSetHas.call(selectedStores, store)) selectedMember = true;
          });
        } else {
          selectedMember = [...membership].some((store) => selectedStores.has(store));
        }
        if (selectedMember && !canonicalSetHas.call(coveredReaders, id) &&
          !retiredPendingReaders.has(id)) return false;
      }
      return privateOnly ? resources.validateCanonical() : resources.validate();
    };
    const storeCurrent = (afterHost = false) => {
      if (passive) {
        const status = validateCanonicalClosedStorePhase(stores,
          afterHost ? "after-host" : "prepared");
        if (status !== "public-required") return status === "current";
      }
      return afterHost ? stores.validatePublicationInputs() : stores.validate();
    };
    try {
      if (passiveEligible) {
        const ownedRequests = createOwnedClosedFrameRequests();
        let allBound = true;
        for (const row of passiveRows) {
          const { owner, cache, program, dataExecution, inputs } = row;
          if (row.boundRequest) {
            if (this.#activeCounters) this.#count("store.bound-input.reused-rows");
          } else {
            const hostKey = cache.scopeExplicitHostKeys === true
              ? `${String(cache.hostKeyScope)}\u0000${program.host.key}` : program.host.key;
            const request: OwnedClosedStoreOutputRequest = {
              execution: dataExecution, owner, hostKey,
              inputs: inputs.map(({ store, id }) => ({ store, readerId: id })),
            };
            const bound = bindOwnedClosedStoreOutputRequest(request);
            if (bound) {
              row.boundRequest = bound;
              if (this.#activeCounters) this.#count("store.bound-input.new-rows");
            }
          }
          if (!row.boundRequest || !ownedRequests.append(row.boundRequest)) {
            allBound = false;
            break;
          }
        }
        const requests: readonly (OwnedClosedStoreOutputRequest | BoundClosedStoreOutputRequest)[] |
          ReturnType<typeof createOwnedClosedFrameRequests> = allBound && ownedRequests.seal()
          ? ownedRequests : passiveRows.map((row) => {
            if (row.boundRequest) return row.boundRequest;
            const { owner, cache, program, dataExecution, inputs } = row;
            const hostKey = cache.scopeExplicitHostKeys === true
              ? `${String(cache.hostKeyScope)}\u0000${program.host.key}` : program.host.key;
            return { execution: dataExecution, owner, hostKey,
              inputs: inputs.map(({ store, id }) => ({ store, readerId: id })) };
          });
        const scalarCounts: OwnedScalarOutputCounts | undefined = this.#activeCounters
          ? { frames: 0, rootMaterializations: 0, propMaterializations: 0,
            directCaptures: 0 }
          : undefined;
        const batch = prepareOwnedClosedStoreOutputs(this.world, stores, requests,
          scalarCounts);
        if (scalarCounts) this.#count("store.scalar-output.frames", scalarCounts.frames);
        if (scalarCounts?.directCaptures) this.#count(
          "store.scalar-output.direct-captures", scalarCounts.directCaptures);
        if (scalarCounts?.batchCalls) this.#count("store.batch.calls", scalarCounts.batchCalls);
        if (scalarCounts?.batchRows) this.#count("store.batch.rows", scalarCounts.batchRows);
        if (scalarCounts?.scalarKernelCalls) this.#count(
          "store.scalar-kernel.calls", scalarCounts.scalarKernelCalls);
        if (batch === null) throw new SparseCandidateIneligible();
        if (batch.kind !== "ready") seen.clear();
        if (batch.kind === "ready") {
          producerCellCut = batch.cellCut;
          if (batch.rows.length !== passiveRows.length) throw new SparseCandidateIneligible();
          passive = batch.rows;
          for (let index = 0; index < passiveRows.length; index++) {
            const row = passiveRows[index], image = passive[index];
            if (row.program.schemaVersion === 1 ||
              row.program.schemaVersion === 2 ||
              row.program.schemaVersion === 3) {
              if (image.owner !== row.owner || image.tag !== row.program.host.tag ||
                image.key !== row.program.host.key || image.cells.length !== 0 ||
                image.retainedChildren === true || owners.has(row.owner)) {
                throw new SparseCandidateIneligible();
              }
              for (const input of row.inputs) {
                inputStores.add(input.store);
                const wait = this.#resourceHoldWait(new Set(), resourceLease,
                  { stores: [input.store] });
                if (wait) throw new HeldPublicationWait(wait);
                covered.add(input.id);
                if (selectedStores.has(input.store)) seen.add(input.store);
              }
              const region = materializeOwnedScalarStorePropDelta(image, scalarCounts);
              stageLeaf({ ...row, program: row.program,
                boundExecution: row.dataExecution,
                boundInputs: row.inputs }, region.props, region);
            } else stagePassiveRow(row, image);
            if (this.#activeCounters) {
              this.#count("store.owned-data.rows");
              if (inspectClosedStoreDataExecution(passiveRows[index].dataExecution)
                ?.mode.startsWith("verified-")) {
                this.#count("store.owned-data.verified-rows");
              }
            }
          }
          if (scalarCounts?.propMaterializations) this.#count(
            "store.scalar-output.prop-materializations",
            scalarCounts.propMaterializations,
          );
        }
      }
      if (!passive) for (const [id, membership] of this.#liveStoreReaders) {
        const split = id.indexOf("\u0000");
        const owner = Number(id.slice(0, split));
        if (![...membership].some((store) => selectedStores.has(store)) &&
          !selectedCellSites.has(owner)) continue;
        if (covered.has(id)) continue;
        if (split <= 0 || !Number.isSafeInteger(owner)) {
          throw new SparseCandidateIneligible();
        }
        if (owners.has(owner)) continue;
        const cache = this.#componentCache.get(owner);
        const program = typeof cache?.type === "function"
          ? definedComponents.get(cache.type)?.metadata?.closedStoreHostProgram
          : undefined;
        if (!cache || !program ||
          (program.schemaVersion !== 6 && program.schemaVersion !== 7 &&
            cache.subtreeOwners.size !== 1) ||
          (program.schemaVersion !== 7 && cache.ownEffects.size !== 0) ||
          cache.propBoundSites.size !== 0 ||
          cache.keyedRegion || cache.nativeBoundary || !componentCodeCurrent(cache.type)) {
          throw new SparseCandidateIneligible();
        }
        const stateInputs: RetainedCellWrite[] = [];
        if (program.schemaVersion === 7) {
          hasMixedOwner = true;
          if (cache.ownEffects.size !== program.effectSites.length ||
            program.effectSites.some((site) =>
              !cache.ownEffects.has(effectKey(owner, site)) ||
              !this.#liveEffectKeysByOwner.get(owner)?.has(effectKey(owner, site)))) {
            throw new SparseCandidateIneligible();
          }
          for (let index = 0; index < program.stateSites.length; index++) {
            const site = program.stateSites[index];
            const handle = this.world.cellHandle(owner, site);
            if (handle) {
              const wait = this.#resourceHoldWait(new Set(), resourceLease,
                { cells: [handle] });
              if (wait) throw new HeldPublicationWait(wait);
            }
            const source = handle && this.world.scalarSourceForCell(handle);
            const version = handle && this.world.versionForCell(handle);
            const value = source && Object.getOwnPropertyDescriptor(source, "value")?.value;
            if (!handle || !source || version == null ||
              typeof value !== "number" || !Number.isFinite(value)) {
              throw new SparseCandidateIneligible();
            }
            stateInputs.push({ handle, source, version, value });
            inputCells.push(handle);
          }
          if (selectedCellSites.has(owner) &&
            [...selectedCellSites.get(owner)!].some((site) =>
              !program.stateSites.includes(site))) throw new SparseCandidateIneligible();
        } else if (selectedCellSites.has(owner)) throw new SparseCandidateIneligible();
        const kernel = definedComponents.get(cache.type as Function)?.metadata
          ?.closedStoreNumericKernel;
        const output = this.#cacheOutputView(cache, true);
        const numericKernel = kernel && isRuntimeOwnedElement(output) &&
          Object.isFrozen(output.props) &&
          closedStoreHostInputs(program).every((input) => {
          const source = ownValue(cache.props, input.storeProp);
          const membership = this.#liveStoreReaders.get(
            `${owner}\u0000${input.storeUseSiteId}`,
          );
          return typeof source === "object" && source !== null &&
            !!membership && membership.size === 1 &&
            membership.has(source as AnyAsyncStore) &&
            canonicalStoreForNumericKernel.call(source as AnyAsyncStore);
        }) ? kernel : undefined;
        const dataExecution = definedComponents.get(cache.type as Function)
          ?.metadata?.closedStoreExecution;
        if (program.schemaVersion === 7 && !numericKernel && !dataExecution) {
          throw new SparseCandidateIneligible();
        }
        if (numericRun && numericRun.kernel !== numericKernel) flushNumericRun();
        const inputs: Input[] = [];
        const values: number[] = [];
        const programInputs = closedStoreHostInputs(program);
        for (let inputIndex = 0; inputIndex < programInputs.length; inputIndex++) {
          const input = programInputs[inputIndex];
          const inputId = `${owner}\u0000${input.storeUseSiteId}`;
          const store = ownValue(cache.props, input.storeProp);
          const inputMembership = this.#liveStoreReaders.get(inputId);
          let acceptedReceipt: AcceptedStoreReaderReceipt | undefined;
          let projections: readonly number[] | null = null;
          if (store instanceof AsyncStore) {
            inputStores.add(store);
            const wait = this.#resourceHoldWait(new Set(), resourceLease,
              { stores: [store] });
            if (wait) throw new HeldPublicationWait(wait);
            if (!inputMembership || inputMembership.size !== 1 ||
              !inputMembership.has(store)) throw new SparseCandidateIneligible();
            if (program.schemaVersion === 7 && !selectedStores.has(store) &&
              !newlyStaged.has(store)) {
              const receipt = captureCanonicalStoreReaderReceipt(
                store, this.#rootId, inputId,
              );
              if (!receipt || inspectCanonicalStoreReaderReceipt(
                store, this.#rootId, inputId, receipt,
              ) !== "current") throw new SparseCandidateIneligible();
              acceptedReceipt = receipt;
            }
            projections = stores.readClosedProjections(store, inputId,
              closedStoreHostInputPaths(input));
            if (selectedStores.has(store)) seen.add(store);
          } else {
            if (program.schemaVersion === 6 || program.schemaVersion === 7) {
              throw new SparseCandidateIneligible();
            }
            if (inputMembership || !(store instanceof AsyncResource)) {
              throw new SparseCandidateIneligible();
            }
            inputResources.add(store);
            const wait = this.#resourceHoldWait(new Set([store]), resourceLease);
            if (wait) throw new HeldPublicationWait(wait);
            const status = resources.readClosed(store);
            projections = status ? captureClosedProjectionValues(status.value,
              closedStoreHostInputPaths(input)) : null;
          }
          if (!projections) throw new SparseCandidateIneligible();
          inputs.push({ id: inputId, prop: input.storeProp, source: store,
            ...(inputMembership ? { membership: inputMembership } : {}),
            ...(acceptedReceipt ? { acceptedReceipt } : {}) });
          values.push(...projections);
          if (inputMembership) covered.add(inputId);
        }
        if (program.schemaVersion === 7) {
          values.push(...stateInputs.map(({ value }) => value));
        }
        if (program.schemaVersion === 4 ||
          (program.schemaVersion === 5 && !dataExecution)) {
          const tree = evaluateClosedStoreHostTree(program, values);
          if (!tree) throw new SparseCandidateIneligible();
          const next = copyRuntimeElement(tree.type, tree.props, owner);
          const previous = this.#cacheOutputView(cache, true);
          const staged = treeRegions(program.host, previous, next);
          if (!staged) throw new SparseCandidateIneligible();
          outputChanged ||= staged.changed;
          owners.set(owner, { owner, cache, inputs, stateInputs, next,
            regionIndex: regions.length });
          regions.push(...staged.regions);
          continue;
        }
        if (numericKernel) {
          kernelInputs ??= [];
          kernelOutputs ??= [];
          if (!numericRun) numericRun = {
            kernel: numericKernel, inputStart: kernelInputs.length, rows: [],
          };
          kernelInputs.push(...values);
          numericRun.rows.push({ owner, cache, inputs, stateInputs, program });
          continue;
        }
        stageLeaf({ owner, cache, inputs, stateInputs, program }, dataExecution
          ? evaluateClosedStoreDataExecution(dataExecution, values)
          : evaluateClosedStoreHostProgram(program, values));
        if (dataExecution && this.#activeCounters) {
          this.#count("store.owned-data.rows");
          if (inspectClosedStoreDataExecution(dataExecution)?.mode.startsWith("verified-")) {
            this.#count("store.owned-data.verified-rows");
          }
        }
      }
      flushNumericRun();
      const stagedCellWrites = [...owners.values()].flatMap(({ stateInputs }) =>
        [...stateInputs]);
      if (passive && !deferPrivateCells) {
        phaseCellCut = createClosedWorldCellCut(stagedCellWrites);
        if (!phaseCellCut) throw new SparseCandidateIneligible();
        privateCellCut = phaseCellCut;
      }
      if (!deferPrivateCells && passive && stagedCellWrites.length) {
        if (!privateCellCut ||
          !validateClosedWorldCellCut(this.world, privateCellCut, "prepared")) {
          throw new SparseCandidateIneligible();
        }
      }
      const ownerIds = new Set(owners.keys());
      coverage = Object.freeze({
        ownerPrefixes: new Set([...ownerIds].map(String)),
        coveredReaders: new Set(covered),
      });
      if ((passive ? passive.some((image) => image.lineage.slice(1).some(
        (ancestor) => ownerIds.has(ancestor))) : [...ownerIds].some((owner) =>
        this.world.ownerLineage(owner).slice(1).some((ancestor) =>
          ownerIds.has(ancestor)))) ||
        [...selectedStores].some((store) =>
        !seen.has(store) && !newlyStaged.has(store)) ||
        [...selectedCellSites.keys()].some((owner) => !ownerIds.has(owner)) ||
        (requireOutputChange && !outputChanged) ||
        (!(deferPrivateCells && passive) && (!current() || !storeCurrent()))) {
        throw new SparseCandidateIneligible();
      }
      const publicationLineages = privatePublication
        ? new Map([...ownerIds].map((owner) =>
          [owner, canonicalWorldOwnerLineage.call(this.world, owner)] as const))
        : null;
      if (passive && this.#activeCounters) {
        this.#count("store.owned-data.batches");
        this.#count("store.owned-data.enclosed-batches");
      }
      const stagedByRegion: Array<Owner | undefined> =
        Array(regions.length);
      for (const [owner, staged] of owners) {
        stagedByRegion[staged.regionIndex] = staged;
      }
      acceptedScalarPlans = Object.freeze(regions.map((_region, index) =>
        stagedByRegion[index]?.cache.output.scalarPlan ?? null));
      return {
        owners: ownerIds, regions,
        get scalarPlans() { return acceptedScalarPlans; },
        setScalarSuccessors: (plans) => {
          if (plans && plans.length !== regions.length) {
            throw new SparseCandidateIneligible();
          }
          const successors = plans ? Object.freeze([...plans]) : [];
          for (let index = 0; index < successors.length; index++) {
            const plan = successors[index];
            if (!plan) continue;
            const entry = stagedByRegion[index];
            if (regions[index]?.componentOwner !== undefined &&
              regions[index].componentOwner !== entry?.owner) {
              throw new SparseCandidateIneligible();
            }
          }
          for (let index = 0; index < successors.length; index++) {
            const plan = successors[index];
            if (!plan) continue;
            const staged = stagedByRegion[index];
            if (staged) staged.scalarPlan = plan;
          }
        },
        current: () => current(), storeCurrent,
        useExternalCellCut: (cut) => {
          phaseCellCut = cut;
          externalCellCutCovered = true;
        },
        privateCurrent: () => current(true),
        postHostCurrent: () => current(false, true),
        postHostPrivateCurrent: () => current(true, true),
        inputStores, inputResources,
        inputCells, inputCellWrites: stagedCellWrites,
        producerCellCut,
        ordinaryScalar: !!passive && allOwnedScalar && regions.length > 0,
        deferredValidation: deferPrivateCells && !!passive,
        privatePreparedCurrent: () => current(true) &&
          canonicalResourceCutCurrent(resources),
        publish: () => {
          if (privatePublication && !publicationLineages) {
            throw new Error("Closed Store publication lacks owned World lineage");
          }
          const ancestors = new Set<OwnerId>();
          for (const [owner, { next, nextResult, frame, authoredTemplate,
            expandedTemplate, keyedOutput, nextShape, scalarPlan }] of owners) {
            const cache = this.#componentCache.get(owner)!;
            const output: ComponentOutput = frame && authoredTemplate &&
              expandedTemplate
              ? Object.freeze({ kind: "scalar" as const, frame,
                authoredTemplate, expandedTemplate, expandedValid: true,
                shape: nextShape, scalarPlan })
              : ordinaryOutput(nextResult ?? next ?? null, next ?? null,
                nextShape, scalarPlan);
            this.#componentCache.set(owner, { ...cache,
              output });
            if (keyedOutput) {
              keyedOutput.region.outputsByKey.set(keyedOutput.key,
                keyedOutput.value);
            } else if (privatePublication && !frame) {
              this.#refreshDirectKeyedRegionOutputForParent(owner,
                publicationLineages!.get(owner)![1]);
            } else if (!frame) this.#refreshDirectKeyedRegionOutput(owner);
            const lineage = privatePublication
              ? publicationLineages!.get(owner)! : this.world.ownerLineage(owner);
            for (const ancestor of lineage.slice(1)) {
              ancestors.add(ancestor);
            }
          }
          for (const ancestor of ancestors) {
            const live = this.#componentCache.get(ancestor);
            if (live) this.#componentCache.set(ancestor, {
              ...live, output: invalidatedOutput(live.output),
              invalidatedBySparseStore: true,
            });
          }
        },
        release: () => {
          resources.discard(); owners.clear(); ownerIds.clear(); covered.clear();
          seen.clear(); inputStores.clear(); inputResources.clear();
          publicationLineages?.clear(); regions.length = 0;
          inputCells.length = 0;
          stagedCellWrites.length = 0;
          passive = null; privateCellCut = null; phaseCellCut = null;
          producerCellCut = null;
          externalCellCutCovered = false;
          passiveRows.length = 0; passiveByReader.clear();
          stagedByRegion.length = 0;
          acceptedScalarPlans = [];
          coverage = null;
          if (kernelInputs) kernelInputs.length = 0;
          if (kernelOutputs) kernelOutputs.length = 0;
        },
      };
    } catch (error) {
      resources.discard();
      owners.clear(); covered.clear(); seen.clear();
      inputStores.clear(); inputResources.clear(); regions.length = 0;
      inputCells.length = 0;
      passive = null; privateCellCut = null; phaseCellCut = null;
      producerCellCut = null;
      externalCellCutCovered = false;
      passiveRows.length = 0; passiveByReader.clear();
      if (kernelInputs) kernelInputs.length = 0;
      if (kernelOutputs) kernelOutputs.length = 0;
      throw error;
    }
  }

  #prepareClosedStoreCandidate(
    selected: readonly AnyAsyncStore[], requireOutputChange: boolean,
    publicationLease?: () => void,
    groupContinuation = false,
  ): NativeRootCandidate<H, Parent> | null {
    return this.#prepareClosedInputCandidate([], selected, requireOutputChange,
      () => true, publicationLease, [], new Set(), [], false, groupContinuation);
  }

  #prepareInternalClosedInputs(
    cells: readonly StateCellHandle[], selected: readonly AnyAsyncStore[],
  ): NativeRootCandidate<H, Parent> | CandidateLifecycleCore | null {
    return this.#prepareClosedInputCandidate(cells, selected, false,
      () => true, undefined, [], new Set(), [], true);
  }

  /** Prepare a closed retained-prop cut; include every joint input cell. */
  prepareRetained(
    cells: readonly StateCellHandle[], publicationLease?: () => void,
  ): NativeRootCandidate<H, Parent> | null {
    return this.#prepareClosedInputCandidate(cells, [], false,
      () => true, publicationLease);
  }

  #prepareClosedInputCandidate(
    cells: readonly StateCellHandle[], selected: readonly AnyAsyncStore[],
    requireOutputChange?: boolean, acceptedCurrent?: () => boolean,
    resourceLease?: () => void,
    acceptedCollections?: readonly (() => boolean)[],
    acceptedResources?: ReadonlySet<AsyncResource<any>>,
    acceptedCollectionFootprint?: readonly KeyedCollection<any>[],
    internalCellCapture?: false,
    groupContinuation?: boolean,
  ): NativeRootCandidate<H, Parent> | null;
  #prepareClosedInputCandidate(
    cells: readonly StateCellHandle[], selected: readonly AnyAsyncStore[],
    requireOutputChange: boolean, acceptedCurrent: () => boolean,
    resourceLease: (() => void) | undefined,
    acceptedCollections: readonly (() => boolean)[],
    acceptedResources: ReadonlySet<AsyncResource<any>>,
    acceptedCollectionFootprint: readonly KeyedCollection<any>[],
    internalCellCapture: true,
    groupContinuation?: false,
  ): NativeRootCandidate<H, Parent> | CandidateLifecycleCore | null;
  #prepareClosedInputCandidate(
    cells: readonly StateCellHandle[], selected: readonly AnyAsyncStore[],
    requireOutputChange = false,
    acceptedCurrent: () => boolean = () => true,
    resourceLease?: () => void,
    acceptedCollections: readonly (() => boolean)[] = [],
    acceptedResources: ReadonlySet<AsyncResource<any>> = new Set(),
    acceptedCollectionFootprint: readonly KeyedCollection<any>[] = [],
    internalCellCapture = false,
    groupContinuation = false,
  ): NativeRootCandidate<H, Parent> | CandidateLifecycleCore | null {
    this.#assertActive();
    this.#assertNoPublicationBarrier("prepare closed inputs");
    this.#assertPreparationHostAvailable();
    if (!this.#leaseCoversSelection(resourceLease, new Set(),
      { cells, stores: selected })) return null;
    const holdWait = this.#resourceHoldWait(new Set(), resourceLease,
      { cells, stores: selected });
    if (holdWait) return this.#prepareBlockedPublication([holdWait]);
    if ((this.#pendingDirectIntent && !(resourceLease &&
      this.#publicationIntents.has(resourceLease))) ||
      (!cells.length && !selected.length)) return null;
    const captured = this.#captureRetainedCells(cells,
      internalCellCapture ? selected : []);
    if (!captured) return null;
    const { writes, sources } = captured;
    const mixedWrites = writes.filter(({ handle }) => {
      const cache = this.#componentCache.get(handle.owner);
      const host = typeof cache?.type === "function"
        ? definedComponents.get(cache.type)?.metadata?.closedStoreHostProgram
        : undefined;
      return host?.schemaVersion === 7 && host.stateSites.includes(handle.site);
    });
    const stores = new StoreRenderTransaction(this.#rootId);
    let closed: ClosedStoreOutputCut | null = null;
    let program: import("./vdom_snapshot_runtime.ts").PreparedScopedKeyedRetainedProgram | null = null;
    let privateCellCut: ClosedWorldCellCut | null = null;
    let cellFootprint: RetainedCellWrite[] = [];
    let ownedCellCut = false;
    let ownedStoreOnly = false;
    let ownedScalarPhases: import("./vdom_snapshot_runtime.ts").OwnedScalarPhases | null = null;
    try {
      if (selected.length || mixedWrites.length) {
        closed = this.#stageClosedStoreOutputs(selected, stores,
          requireOutputChange, new Set(), new Set(), resourceLease, mixedWrites,
          true, true);
      }
      ownedCellCut = closed?.ordinaryScalar === true &&
        writes.every(({ handle }) => closed!.owners.has(handle.owner));
      if (ownedCellCut) {
        const producerCovered = !!closed!.producerCellCut && writes.every((write) =>
          closed!.inputCellWrites.some((input) =>
            input.handle.owner === write.handle.owner &&
            input.handle.site === write.handle.site &&
            input.handle.cellIdentity === write.handle.cellIdentity &&
            input.source === write.source && input.version === write.version &&
            Object.is(input.value, write.value)));
        if (producerCovered) {
          privateCellCut = closed!.producerCellCut;
          if (this.#activeCounters) this.#count("store.world-cut.producer-reuse");
        } else {
          cellFootprint = [...writes, ...closed!.inputCellWrites];
          privateCellCut = createClosedWorldCellCut(cellFootprint);
        }
        if (!privateCellCut ||
          !validateClosedWorldCellCut(this.world, privateCellCut, "prepared")) {
          throw new SparseCandidateIneligible();
        }
        closed!.useExternalCellCut(privateCellCut);
        if (!closed!.current() || !closed!.storeCurrent()) {
          throw new SparseCandidateIneligible();
        }
      } else if (closed?.deferredValidation &&
        (!closed.current() || !closed.storeCurrent())) {
        throw new SparseCandidateIneligible();
      }
      const remainingWrites = writes.filter(({ handle }) =>
        !closed?.owners.has(handle.owner)).map(
        ({ source, value }) => [source, value] as const);
      const ownedRegions = closed?.regions;
      const isOwnedRegion = (region: StorePropDelta |
        import("./vdom_snapshot_runtime.ts").OwnedScalarStoreRegion):
        region is import("./vdom_snapshot_runtime.ts").OwnedScalarStoreRegion =>
        "frame" in region;
      ownedStoreOnly = selected.length > 0 &&
        ownedCellCut && remainingWrites.length === 0 &&
        closed?.ordinaryScalar === true && closed.inputResources.size === 0 &&
        acceptedCollections.length === 0 && acceptedResources.size === 0 &&
        acceptedCollectionFootprint.length === 0;
      const narrowOwnedScalar = (internalCellCapture || groupContinuation) &&
        ownedStoreOnly &&
        ownedRegions?.every(isOwnedRegion) === true;
      const ownedProgram = narrowOwnedScalar && ownedRegions &&
        ownedRegions.every(isOwnedRegion)
        ? this.#vdom.prepareOwnedScalarStoreDeltas(
          ownedRegions, closed!.scalarPlans)
        : null;
      program = ownedProgram ?? this.#vdom.prepareScopedKeyedRetainedAndStoreDeltas(
        [], remainingWrites, closed?.regions ?? [], [], closed?.scalarPlans);
      ownedScalarPhases = ownedProgram?.ownedScalarPhases ?? null;
      if (!program || program.readSources.some((source) => !sources.has(source))) {
        throw new SparseCandidateIneligible();
      }
      closed?.setScalarSuccessors(program.storeScalarPlans);
    } catch (error) {
      privateCellCut = null; cellFootprint.length = 0;
      const errors = collectCleanupErrors([
        () => program?.discard(), () => closed?.release(), () => stores.discard(),
        () => this.#discardUncommittedStoreRoots(stores),
      ]);
      if (error instanceof HeldPublicationWait && !errors.length) {
        return this.#prepareBlockedPublication([error.resource]);
      }
      if (error instanceof SparseCandidateIneligible && !errors.length) return null;
      return throwWithCleanup(error, errors);
    }
    const codeCurrent = () => acceptedCurrent() &&
      acceptedCollections.every((validate) => validate()) &&
      writes.every(({ handle }) => {
      const cache = this.#componentCache.get(handle.owner);
      return cache !== undefined && componentCodeCurrent(cache.type);
    });
    const handles = writes.map(({ handle }) => handle);
    const versions = writes.map(({ version }) => version);
    const holdCells = [...handles, ...(closed?.inputCells ?? [])];
    const holdStores = [...selected, ...(closed?.inputStores ?? [])];
    const holdResources = closed?.inputResources;
    const acceptedCollectionVersions = acceptedCollectionFootprint.map((collection) =>
      [collection, canonicalCollectionVersion(collection)] as const
    );
    const heldCollections = acceptedCollectionVersions.map(([collection]) => collection);
    const acceptedResourceVersions = [...acceptedResources].map((resource) =>
      [resource, canonicalResourceVersion(resource)] as const
    );
    const privateCellsCurrent = (afterHost: boolean) =>
      ownedCellCut
        ? !privateCellCut || validateClosedWorldCellCut(this.world, privateCellCut,
          afterHost ? "after-host" : "prepared")
        : this.#validateRetainedCellsPrivate(writes, afterHost);
    let conservativeOwnedPrepared = !internalCellCapture;
    let conservativeOwnedPostHost = !internalCellCapture;
    const lifecycleSpec: CandidateLifecycleSpec<H, Parent> = {
      baseVersion: this.#publicationVersion, baseVDOMVersion: this.#vdom.version,
      scope: { kind: "retained" }, stores, transitions: [], pendingResources: [], blocked: false,
      permitPendingDirectIntent: () => resourceLease !== undefined &&
        this.#publicationIntents.has(resourceLease),
      admissionCurrent: () => (!resourceLease ||
        this.#publicationIntents.has(resourceLease)) &&
        !this.#resourceHoldWait(acceptedResources, resourceLease, {
          cells: holdCells,
          stores: holdStores,
          collections: acceptedCollectionFootprint,
        }) && !(holdResources?.size && this.#resourceHoldWait(
          holdResources, resourceLease)) &&
        (!resourceLease || this.#publicationIntents.has(resourceLease)),
      codeCurrent,
      ...(internalCellCapture && ownedScalarPhases ? { validationStrategy: {
        kind: "owned-scalar-immediate" as const,
        preflightPrepared: () => {
          conservativeOwnedPrepared = !ownedScalarPhases!.preflightPrepared();
          return true;
        },
        preflightPostHost: () => {
          conservativeOwnedPostHost = !ownedScalarPhases!.preflightPostHost();
          return true;
        },
      } } : {}),
      validatePrepared: () =>
        (ownedScalarPhases && !conservativeOwnedPrepared || program!.validate()) &&
        this.#validateRetainedCells(writes, false) &&
        (closed?.current() ?? true) &&
        (closed?.storeCurrent() ?? stores.validate()),
      validatePreparedPrivate: () =>
        (ownedScalarPhases && !conservativeOwnedPrepared ||
          program!.validatePreparedPrivate()) &&
        (!resourceLease || this.#publicationIntents.has(resourceLease)) &&
        !this.#resourceHoldWait(
          acceptedResources,
          resourceLease, { cells: holdCells,
            stores: holdStores,
            collections: heldCollections },
        ) &&
        privateCellsCurrent(false) &&
        (closed?.privatePreparedCurrent() ?? true) &&
        stores.validatePreparedCanonical() && acceptedCurrent() &&
        acceptedCollectionVersions.every(([collection, version]) =>
          canonicalCollectionCutCurrent(collection, version)
        ) && acceptedResourceVersions.every(([resource, version]) =>
          canonicalResourceVersionCurrent(resource, version)
        ) && writes.every(({ handle }) => {
          const cache = this.#componentCache.get(handle.owner);
          return this.#liveOwners.has(handle.owner) && cache !== undefined &&
            componentCodeCurrentPrivate(cache.type);
        }),
      ...(groupContinuation && ownedStoreOnly ? { validateAdmittedContinuation: () =>
        (ownedScalarPhases ? ownedScalarPhases.preflightPrepared() : program!.validate()) &&
        program!.validatePreparedPrivate() &&
        (!resourceLease || this.#publicationIntents.has(resourceLease)) &&
        !this.#resourceHoldWait(
          acceptedResources, resourceLease, {
            cells: holdCells, stores: holdStores,
            collections: heldCollections,
          },
        ) &&
        privateCellsCurrent(true) &&
        (closed?.postHostPrivateCurrent() ?? true) &&
        stores.validatePublicationInputsCanonical() && acceptedCurrent() &&
        acceptedCollectionVersions.every(([collection, version]) =>
          canonicalCollectionCutCurrent(collection, version)
        ) && acceptedResourceVersions.every(([resource, version]) =>
          canonicalResourceVersionCurrent(resource, version)
        ) && writes.every(({ handle }) => {
          const cache = this.#componentCache.get(handle.owner);
          return this.#liveOwners.has(handle.owner) && cache !== undefined &&
            componentCodeCurrentPrivate(cache.type);
        }),
      } : {}),
      validatePostHost: () =>
        (ownedScalarPhases && !conservativeOwnedPostHost ||
          program!.validatePostHost()) &&
        this.#validateRetainedCells(writes, true) &&
        (closed?.postHostCurrent() ?? true) &&
        (closed?.storeCurrent(true) ?? stores.validatePublicationInputs()),
      ...(groupContinuation && ownedStoreOnly && ownedScalarPhases ? {
        canonicalGroupPostHost: {
          eligible: () => inspectCanonicalClosedStorePublication(stores) === "current",
          prepare: () => {
            if (prepareCanonicalClosedStorePublicationAfterHost(stores) !== "ready") {
              throw new Error("Closed Store publication became stale after host commit");
            }
          },
        },
      } : {}),
      finalGroupCurrent: () =>
        (ownedScalarPhases || program!.validatePostHostPrivate()) &&
        privateCellsCurrent(true) &&
        (closed?.postHostPrivateCurrent() ?? true) && stores.validatePublicationInputsCanonical() &&
        acceptedCurrent() &&
        acceptedCollectionVersions.every(([collection, version]) =>
          version === null || canonicalCollectionVersion(collection) === version
        ) && acceptedResourceVersions.every(([resource, version]) =>
          version === null || canonicalResourceVersion(resource) === version
        ) && writes.every(({ handle }) => {
          const cache = this.#componentCache.get(handle.owner);
          return this.#liveOwners.has(handle.owner) && cache !== undefined &&
            componentCodeCurrentPrivate(cache.type);
        }) && (!ownedScalarPhases || program!.validatePostHostPrivate()),
      commitHost: () => program!.commit(),
      commitHostAdmitted: () => program!.commitAdmitted(),
      preparePublication: () => {
        if (ownedScalarPhases) {
          const status = prepareCanonicalClosedStorePublication(stores);
          if (status === "stale") {
            throw new Error("Closed Store publication became stale after host commit");
          }
          if (status === "ready") return;
        }
        stores.preparePublicationAfterHost();
      },
      publish: () => {
        stores.publishAccepted();
        closed?.publish();
        for (const write of writes) this.#lastSourceValues.set(write.source, write.value);
        canonicalWorldClearCellChangesThrough.call(this.world,
          handles, versions, handles.length);
        this.#pendingChanges.clearNativeThrough(handles, versions, handles.length);
        this.#publicationVersion++;
      },
      installSubscriptions: () => [],
      runEffects: () => {
        stores.notifyPublished();
        if (groupContinuation) this.#acknowledgeCurrentStoreNotifications();
        return [];
      },
      discard: () => stores.discard(),
      releaseArtifacts: () => {
        if (this.#activeCounters && ownedScalarPhases) {
          const readerCounts = readOwnedClosedStoreCaptureCounts(stores);
          if (readerCounts) {
            this.#count("store.reader-staging.owned-direct-rows",
              readerCounts.ownedDirectRows);
            this.#count("store.reader-staging.generic-materializations",
              readerCounts.genericMaterializations);
          }
          const phaseCounts = ownedScalarPhases.readCounts();
          this.#count("store.scalar-target.full-prepared-sweeps",
            phaseCounts.preparedSweeps);
          this.#count("store.scalar-target.full-post-host-sweeps",
            phaseCounts.postHostSweeps);
        }
        program?.discard(); program = null;
        closed?.release(); closed = null;
        privateCellCut = null; cellFootprint.length = 0;
        holdCells.length = 0; holdStores.length = 0; heldCollections.length = 0;
        acceptedCollectionVersions.length = 0; acceptedResourceVersions.length = 0;
        writes.length = 0; handles.length = 0; versions.length = 0;
      },
      effectFailureMessage: "Closed input publication callbacks failed",
    };
    const ordinaryClosed = closed;
    const ordinaryImmediate = internalCellCapture && selected.length > 0 &&
      ownedCellCut && ordinaryClosed?.ordinaryScalar === true &&
      ordinaryClosed.inputResources.size === 0 && acceptedCollections.length === 0 &&
      acceptedResources.size === 0 && acceptedCollectionFootprint.length === 0;
    return ordinaryImmediate
      ? this.#createCandidateLifecycle(lifecycleSpec, true)
      : this.#createCandidateLifecycle(lifecycleSpec);
  }

  #captureRetainedCells(
    cells: readonly StateCellHandle[], selected: readonly AnyAsyncStore[] = [],
  ): {
    writes: RetainedCellWrite[];
    sources: Set<ScalarSource>;
  } | null {
    const writes: RetainedCellWrite[] = [];
    const sources = new Set<ScalarSource>();
    const firstBySource = new Map<ScalarSource, RetainedCellWrite>();
    const selectedStores = new Set(selected);
    const passiveOwners = new Set<OwnerId>();
    let passiveEligible = cells.length > 0 && selected.length > 0 &&
      cells.every((cell) => {
        const cache = this.#componentCache.get(cell.owner);
        const metadata = typeof cache?.type === "function"
          ? definedComponents.get(cache.type)?.metadata : undefined;
        if (!metadata?.closedStoreExecution ||
          metadata.closedStoreHostProgram?.schemaVersion !== 7 ||
          !metadata.closedStoreHostProgram.stateSites.includes(cell.site)) return false;
        passiveOwners.add(cell.owner);
        return true;
      });
    if (passiveEligible) {
      for (const [id, membership] of this.#liveStoreReaders) {
        if (![...membership].some((store) => selectedStores.has(store))) continue;
        const split = id.indexOf("\u0000");
        const owner = Number(id.slice(0, split));
        const cache = this.#componentCache.get(owner);
        if (split <= 0 || !Number.isSafeInteger(owner) ||
          typeof cache?.type !== "function" ||
          !definedComponents.get(cache.type)?.metadata?.closedStoreExecution) {
          passiveEligible = false; break;
        }
      }
    }
    const captured = passiveEligible ? captureOwnedClosedWorldInputs(this.world,
      [...passiveOwners].map((owner) => {
        const cache = this.#componentCache.get(owner)!;
        const program = definedComponents.get(cache.type as Function)!.metadata!
          .closedStoreHostProgram!;
        return { owner, sites: program.schemaVersion === 7 ? program.stateSites : [] };
      })) : null;
    const passiveCells = new Map<string, NonNullable<typeof captured>[number]["cells"][number]>();
    for (const row of captured ?? []) {
      for (const cell of row.cells) passiveCells.set(`${row.owner}\u0000${cell.handle.site}`, cell);
    }
    for (const input of cells) {
      const handle = Object.freeze({
        owner: input.owner, site: input.site, cellIdentity: input.cellIdentity,
      });
      const passive = captured && passiveCells.get(`${handle.owner}\u0000${handle.site}`);
      if (captured && (!passive || passive.handle.cellIdentity !== handle.cellIdentity)) {
        return null;
      }
      const source = passive ? passive.source : this.world.scalarSourceForCell(handle);
      const version = passive ? passive.version : this.world.versionForCell(handle);
      const cache = this.#componentCache.get(handle.owner);
      const mixed = cache && typeof cache.type === "function"
        ? definedComponents.get(cache.type)?.metadata?.closedStoreHostProgram
        : undefined;
      if (
        !source || version === null || !cache ||
        !this.#liveOwners.has(handle.owner) ||
        (!this.#compiledPropSitesForCache(handle.owner, cache).has(handle.site) &&
          !(mixed?.schemaVersion === 7 && mixed.stateSites.includes(handle.site)))
      ) return null;
      const prior = firstBySource.get(source);
      if (prior) {
        if (prior.handle.owner !== handle.owner || prior.handle.site !== handle.site ||
          prior.handle.cellIdentity !== handle.cellIdentity ||
          prior.version !== version ||
          (passive && !Object.is(prior.value, passive.value))) return null;
        continue;
      }
      const value = passive ? passive.value :
        Object.getOwnPropertyDescriptor(source, "value")?.value;
      if (typeof value !== "number") return null;
      const write = { handle, source, version, value };
      firstBySource.set(source, write);
      sources.add(source);
      writes.push(write);
    }
    return { writes, sources };
  }

  #validateRetainedCells(
    writes: readonly RetainedCellWrite[],
    afterHost: boolean,
  ): boolean {
    return writes.every((write) => {
      const version = this.world.versionForCell(write.handle);
      return this.#liveOwners.has(write.handle.owner) &&
        this.world.scalarSourceForCell(write.handle) === write.source &&
        version !== null && (afterHost ? version >= write.version : version === write.version) &&
        (afterHost && version > write.version || Object.is(Object.getOwnPropertyDescriptor(write.source, "value")?.value, write.value));
    });
  }

  #validateRetainedCellsPrivate(
    writes: readonly RetainedCellWrite[], afterHost = false,
  ): boolean {
    return writes.every((write) => {
      if (!this.#liveOwners.has(write.handle.owner) ||
        canonicalWorldScalarSourceForCell.call(this.world, write.handle) !== write.source) {
        return false;
      }
      const version = canonicalWorldVersionForCell.call(this.world, write.handle);
      return version !== null &&
        (afterHost ? version >= write.version : version === write.version) &&
        (afterHost && version > write.version ||
          capturedScalarCurrent(write.source, write.value));
    });
  }

  #createCandidateLifecycle(
    spec: CandidateLifecycleSpec<H, Parent>, immediate: true,
  ): CandidateLifecycleCore;
  #createCandidateLifecycle(
    spec: CandidateLifecycleSpec<H, Parent>, immediate?: false,
  ): NativeRootCandidate<H, Parent>;
  #createCandidateLifecycle(
    spec: CandidateLifecycleSpec<H, Parent>, immediate: boolean,
  ): NativeRootCandidate<H, Parent> | CandidateLifecycleCore;
  #createCandidateLifecycle(
    spec: CandidateLifecycleSpec<H, Parent>, immediate = false,
  ): NativeRootCandidate<H, Parent> | CandidateLifecycleCore {
    const scopedDelta = spec.scope !== undefined;
    const appliedVDOMDelta = !spec.scope ? 1
      : spec.scope.kind === "retained" ? 0 : spec.scope.versionDelta;
    let admittedVersion = spec.baseVersion;
    let admittedVDOMVersion = spec.baseVDOMVersion;
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
      | "publication-ready"
      | "published"
      | "finished"
      | "discarded"
      | "failed" = "prepared";
    let released = false;
    let subscriptionsInstalled = false;
    let candidateHandle: NativeRootCandidate<H, Parent> | null = null;
    const operationHandle = () => candidateHandle ?? core;
    let groupClaim: HostPublicationClaim | null = null;
    let groupEntered: (() => void) | null = null;
    let groupWasPartial: (() => boolean) | null = null;
    let ownClaim: HostPublicationClaim | null = null;
    let enteredHostApplication = false;
    const releaseOwnClaim = () => {
      if (!ownClaim) return;
      const claim = ownClaim;
      ownClaim = null;
      releaseHostPublicationDomains([this.#hostPublicationDomain], claim);
    };
    const pendingResources = immediate && spec.pendingResources.length === 0
      ? null : [...spec.pendingResources];
    const release = (published: boolean) => {
      if (released) return;
      released = true;
      try {
        spec.releaseArtifacts(published);
      } finally {
        if (pendingResources) pendingResources.length = 0;
        candidateStores.clear();
        if (candidateHandle) {
          groupPublicationReceipts.delete(candidateHandle);
          Object.defineProperties(candidateHandle, {
            baseVersion: { value: admittedVersion, enumerable: true, configurable: true },
            targetVersion: { value: admittedVersion + 1, enumerable: true, configurable: true },
          });
          Object.defineProperty(candidateHandle, "pendingResources", {
            value: Object.freeze([]),
            enumerable: true,
            configurable: true,
          });
          candidateHandle.validate = closedCandidateValidate;
          candidateHandle.commitHost = closedCandidateAction;
          candidateHandle.validatePostHost = closedCandidateValidate;
          candidateHandle.preparePublication = closedCandidateAction;
          candidateHandle.publish = closedCandidateAction;
          candidateHandle.installSubscriptions = () => [];
          candidateHandle.runEffects = closedCandidateAction;
          candidateHandle.discard = closedCandidateNoop;
          candidateHandle.failGroup = closedCandidateNoop;
          candidateHandle.retainStoreDependencies = closedCandidateLease;
        }
      }
    };
    const finishUnpublished = (next: "discarded" | "failed") => {
      phase = next;
      const errors = collectCleanupErrors([
        () => spec.discard(),
        releaseStores,
        () => { this.#preparedCandidates.delete(operationHandle()); },
        () => release(false),
        () => this.#releasePublicationBarrier(operationHandle(), groupClaim ?? ownClaim ?? undefined),
        releaseOwnClaim,
      ]);
      if (errors.length === 1) throw errors[0];
      if (errors.length) throw new AggregateError(errors, "Candidate cleanup failed");
    };
    const failUnpublished = (error: unknown): never => {
      if (!enteredHostApplication) {
        try { finishUnpublished("discarded"); }
        catch (cleanupError) {
          throw new AggregateError([error, cleanupError], "Candidate admission and cleanup failed");
        }
        throw error;
      }
      phase = "failed";
      this.#terminalHostFailure ??= error;
      this.#terminalHostFailed = true;
      const claim = groupClaim ?? this.#activeRootClaim ?? ownClaim;
      const errors = collectCleanupErrors([
        () => {
          if (claim) quarantineHostPublicationDomains(
            [this.#hostPublicationDomain], claim, error,
          );
        },
        () => this.#vdom.failPublication(),
        () => this.#dropPendingDirectIntent(),
        () => this.#cancelTerminalResourceWaits(),
        () => spec.discard(),
        releaseStores,
        () => { this.#preparedCandidates.delete(operationHandle()); },
        () => release(false),
        () => this.#releasePublicationBarrier(operationHandle(), groupClaim ?? ownClaim ?? undefined),
        releaseOwnClaim,
      ]);
      return throwWithCleanup(error, errors);
    };
    const rootVersion = () => this.#publicationVersion;
    let publicPostHostValidated = false;
    const acceptPrepared = () => {
      if (phase !== "publication-ready") throw new Error(`Candidate is ${phase}`);
      try {
        spec.publish();
        this.#vdom.publishAccepted();
        phase = "published";
        spec.accepted?.();
        releaseOwnClaim();
      } catch (error) {
        this.#terminalFailureKind = "publication";
        failUnpublished(error);
      }
    };
    const finalPrivateCurrent = () => phase === "publication-ready" && !released &&
      !this.#disposed && !this.#disposeRequested &&
      !this.#terminalHostFailed && !this.#codeInvalidated &&
      (!scopedDelta || spec.permitPendingDirectIntent?.() ||
        this.#pendingDirectIntent === null) &&
      this.#publicationVersion === admittedVersion &&
      this.#vdom.appliedVersion === admittedVDOMVersion + appliedVDOMDelta &&
      spec.finalGroupCurrent();
    const preHostLifecycleCurrent = () => phase === "prepared" && !released &&
      !this.#disposed && !this.#disposeRequested &&
      !this.#terminalHostFailed && !this.#hostPublicationDomain.failed &&
      !this.#codeInvalidated &&
      (scopedDelta || this.#publicationIntents.size === 0 ||
        (spec.permitHeldFullCandidate?.() ?? false)) &&
      (!scopedDelta || spec.permitPendingDirectIntent?.() ||
        this.#pendingDirectIntent === null) &&
      (scopedDelta || (this.#publicationVersion === spec.baseVersion &&
        this.#vdom.version === spec.baseVDOMVersion));
    const preHostPrivateCurrent = () => preHostLifecycleCurrent() &&
      spec.validatePreparedPrivate();
    const commitHostInternal = (admitted: boolean) => {
      if (phase !== "prepared") throw new Error(`Candidate is ${phase}`);
      this.#assertNoPublicationBarrier("commit another candidate");
      const groupContinuation = admitted && groupClaim !== null &&
        groupClaim !== undefined && groupWasPartial?.() === true &&
        spec.validateAdmittedContinuation !== undefined;
      if ((!admitted && !operationHandle().validate()) ||
        !(admitted ? groupContinuation
          ? preHostLifecycleCurrent() && spec.validateAdmittedContinuation!() &&
            preHostLifecycleCurrent()
          : preHostPrivateCurrent() : preHostLifecycleCurrent())) {
        if (phase === "prepared" && !released) finishUnpublished("discarded");
        throw new Error("Native root candidate is stale");
      }
      const claim = groupClaim ?? this.#activeRootClaim ??
        createHostPublicationClaim();
      if (tryClaimHostPublicationDomains(
        [this.#hostPublicationDomain], claim,
      ) === "busy") throw new HostPublicationBusyError();
      if (!groupClaim && !this.#activeRootClaim) ownClaim = claim;
      admittedVersion = this.#publicationVersion;
      admittedVDOMVersion = this.#vdom.version;
      this.#publicationBarrier = operationHandle();
      try {
        this.#vdom.beginPublication();
        this.#candidateHostCommit = true;
        enteredHostApplication = true;
        groupEntered?.();
        if (admitted) spec.commitHostAdmitted();
        else spec.commitHost();
        if (
          phase !== "prepared" || this.#disposed || this.#disposeRequested
        ) {
          throw new Error(
            "Native root candidate was cancelled during host commit",
          );
        }
        phase = "host-committed";
        if (admitted && spec.validationStrategy?.kind === "owned-scalar-immediate" &&
          this.#activeCounters) this.#count("publication.owned-scalar-phase-runs");
      } catch (error) {
        failUnpublished(error);
      } finally {
        this.#candidateHostCommit = false;
      }
    };
    const core: CandidateLifecycleCore = {
      commitAdmitted: () => commitHostInternal(true),
      validate: () =>
        phase === "prepared" && !released && !this.#disposed &&
        !this.#disposeRequested &&
        !this.#terminalHostFailed && !this.#hostPublicationDomain.failed &&
        !this.#codeInvalidated &&
        (scopedDelta || this.#publicationIntents.size === 0 ||
          (spec.permitHeldFullCandidate?.() ?? false)) &&
        (!scopedDelta || spec.permitPendingDirectIntent?.() ||
          this.#pendingDirectIntent === null) &&
        (spec.admissionCurrent?.() ?? true) &&
        spec.codeCurrent() &&
        (scopedDelta || (this.#publicationVersion === spec.baseVersion &&
          this.#vdom.version === spec.baseVDOMVersion)) &&
        (spec.validationStrategy?.preflightPrepared() ?? true) &&
        spec.validatePrepared() && !this.#codeInvalidated &&
        (!scopedDelta || spec.permitPendingDirectIntent?.() ||
          this.#pendingDirectIntent === null) &&
        (spec.admissionCurrent?.() ?? true) &&
        spec.codeCurrent(),
      commitHost: () => commitHostInternal(false),
      validatePostHost: () => {
        const valid =
          (phase === "host-committed" || phase === "publication-ready") && !this.#disposed &&
        !this.#disposeRequested && !this.#terminalHostFailed &&
        !this.#codeInvalidated &&
        (!scopedDelta || spec.permitPendingDirectIntent?.() ||
          this.#pendingDirectIntent === null) &&
        spec.codeCurrent() &&
        this.#publicationVersion === admittedVersion &&
        this.#vdom.appliedVersion === admittedVDOMVersion + appliedVDOMDelta &&
        (spec.validationStrategy?.preflightPostHost() ?? true) &&
        spec.validatePostHost() && !this.#codeInvalidated &&
        (!scopedDelta || spec.permitPendingDirectIntent?.() ||
          this.#pendingDirectIntent === null) &&
        spec.codeCurrent();
        publicPostHostValidated = valid;
        return valid;
      },
      preparePublication: () => {
        if (phase !== "host-committed") {
          throw new Error(`Candidate is ${phase}`);
        }
        if (!operationHandle().validatePostHost()) {
          const error = new Error(
            "Native root candidate became stale after host commit",
          );
          failUnpublished(error);
        }
        try {
          spec.preparePublication();
          phase = "publication-ready";
        } catch (error) {
          failUnpublished(error);
        }
      },
      publish: () => {
        if (phase === "host-committed") operationHandle().preparePublication();
        if (phase !== "publication-ready") {
          throw new Error(`Candidate is ${phase}`);
        }
        try {
          if (this.#codeInvalidated ||
            (scopedDelta && !spec.permitPendingDirectIntent?.() &&
              this.#pendingDirectIntent !== null) ||
            !spec.codeCurrent() || !finalPrivateCurrent()) {
            throw new Error("Compiled module changed before publication");
          }
        } catch (error) {
          this.#terminalFailureKind = "publication";
          failUnpublished(error);
        }
        acceptPrepared();
      },
      installSubscriptions: () => {
        if (phase !== "published") throw new Error(`Candidate is ${phase}`);
        if (subscriptionsInstalled) return [];
        subscriptionsInstalled = true;
        try {
          return [...spec.installSubscriptions()];
        } catch (error) {
          return [error];
        }
      },
      runEffects: () => {
        if (phase !== "published") throw new Error(`Candidate is ${phase}`);
        const errors: unknown[] = operationHandle().installSubscriptions();
        try {
          errors.push(...spec.runEffects());
        } catch (error) {
          errors.push(error);
        } finally {
          if (phase === "published") phase = "finished";
          errors.push(...collectCleanupErrors([
            () => { this.#preparedCandidates.delete(operationHandle()); },
            releaseStores,
            () => release(true),
            () => this.#releasePublicationBarrier(operationHandle(), groupClaim ?? ownClaim ?? undefined),
          ]));
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
        if (phase === "host-committed" || phase === "publication-ready") {
          throw new Error("Cannot discard a candidate after host commit");
        }
        finishUnpublished("discarded");
      },
      failGroup: (error) => {
        if (phase === "failed" || phase === "discarded") return;
        if (!enteredHostApplication && !this.#hostPublicationDomain.failed &&
          !(groupWasPartial?.() ?? false)) {
          finishUnpublished("discarded");
          return;
        }
        const wasPublished = phase === "published" || phase === "finished";
        phase = "failed";
        this.#terminalHostFailure ??= error;
        this.#terminalHostFailed = true;
        if (wasPublished) this.#terminalFailureKind = "publication";
        const errors = collectCleanupErrors([
          () => {
            const claim = groupClaim ?? this.#activeRootClaim ?? ownClaim;
            if (claim && enteredHostApplication) {
              quarantineHostPublicationDomains(
                [this.#hostPublicationDomain], claim, error,
              );
            }
          },
          () => this.#vdom.failPublication(),
          () => this.#dropPendingDirectIntent(),
          () => this.#cancelTerminalResourceWaits(),
          () => { if (!wasPublished) spec.discard(); },
          releaseStores,
          () => { this.#preparedCandidates.delete(operationHandle()); },
          () => release(wasPublished),
          () => this.#releasePublicationBarrier(operationHandle(), groupClaim ?? ownClaim ?? undefined),
          releaseOwnClaim,
        ]);
        if (errors.length) throwWithCleanup(error, errors);
      },
    };
    if (!immediate) {
      const candidate: NativeRootCandidate<H, Parent> = {
        rootId: this.#rootId,
        get baseVersion() {
          return scopedDelta && phase === "prepared"
            ? rootVersion() : admittedVersion;
        },
        get targetVersion() { return candidate.baseVersion + 1; },
        stores: candidateStores,
        transitions: Object.freeze([...spec.transitions]),
        pendingResources: Object.freeze([...(pendingResources ?? [])]),
        blocked: spec.blocked,
        retainStoreDependencies: () => {
          if (this.#disposed || released) return () => {};
          return this.holdStoreDependencies(candidateStores);
        },
        validate: () => core.validate(),
        commitHost: () => core.commitHost(),
        validatePostHost: () => core.validatePostHost(),
        preparePublication: () => core.preparePublication(),
        publish: () => core.publish(),
        installSubscriptions: () => core.installSubscriptions(),
        runEffects: () => core.runEffects(),
        discard: () => core.discard(),
        failGroup: (error) => core.failGroup(error),
      };
      candidateHandle = candidate;
      const originalValidatePostHost = candidate.validatePostHost;
      const originalPreparePublication = candidate.preparePublication;
      groupPublicationReceipts.set(candidate, {
        preHostCurrent: preHostPrivateCurrent,
        commitAdmitted: core.commitAdmitted,
        current: finalPrivateCurrent,
        accept: acceptPrepared,
        canonicalPostHostEligible: () => phase === "host-committed" &&
          publicPostHostValidated &&
          ownDataDescriptor(candidate, "validatePostHost")?.value ===
            originalValidatePostHost &&
          ownDataDescriptor(candidate, "preparePublication")?.value ===
            originalPreparePublication &&
          spec.canonicalGroupPostHost?.eligible() === true,
        prepareCanonicalPostHost: () => {
          if (phase !== "host-committed" || !publicPostHostValidated ||
            !spec.canonicalGroupPostHost) {
            throw new Error("Candidate lacks canonical posthost preparation");
          }
          try {
            spec.canonicalGroupPostHost.prepare();
            phase = "publication-ready";
          } catch (error) {
            failUnpublished(error);
          }
        },
        domain: this.#hostPublicationDomain,
        bindClaim: (claim, entered, partial) => {
          groupClaim = claim;
          groupEntered = entered;
          groupWasPartial = partial;
        },
      });
      if (this.#activeCounters) this.#count("publication.deferred-adapters");
    }
    this.#preparedCandidates.set(operationHandle(),
      spec.referencesCompiledSource ?? (() => false));
    if (this.#codeInvalidated) operationHandle().discard();
    return operationHandle();
  }

  #prepareSparseStoreCandidate(
    readerOwners: ReadonlySet<OwnerId>,
    capturedChanges: readonly import("./owner_state_world.ts").StateChange[],
    directOnlyOwners: ReadonlySet<OwnerId>,
    storeGenerationAtPrepare: number,
  ): NativeRootCandidate<H, Parent> | null {
    if (this.#renderPreparation !== "repeatable") return null;
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
      const metadata = typeof cache.type === "function"
        ? definedComponents.get(cache.type)?.metadata : undefined;
      if (metadata?.hostLeafOutput !== true) return null;
      if (
        hasNestedComponent(
          this.#cacheOutputView(cache, false),
          () => this.#count("store.sparse.eligibility-tree-node-visits"),
        )
      ) return null;
      const hostKey = singleHostRootKey(
        this.#cacheOutputView(cache, true),
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
    const validatePostHostNumericWrites = () =>
      numericWrites.every((write) =>
        this.world.isAlive(write.owner) &&
        this.world.scalarSource(write.owner, write.site) === write.source &&
        this.world.version(write.owner, write.site) >= write.version &&
        (this.world.version(write.owner, write.site) > write.version ||
          Object.is(write.source.value, write.current))
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
          output: ordinaryOutput(result, result),
          ownEffects: prepared.ownEffects,
          propBoundSites: prepared.propBoundSites,
          numericStateAdmitted: prepared.numericStateAdmitted,
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
            output: invalidatedOutput(ancestorCache.output),
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

    const capturedSparseValues = new Map<OwnerId, Map<string, number>>();
    for (const [owner, cache] of cachePatches) {
      for (const site of cache.propBoundSites) {
        const source = preparation.scalarSource(owner, site);
        if (!source) continue;
        let sites = capturedSparseValues.get(owner);
        if (!sites) capturedSparseValues.set(owner, sites = new Map());
        sites.set(site, source.value);
      }
    }
    const capturedCodeRevisions = captureCodeRevisions(cachePatches.values());
    let admittedBindings: ScalarSource[][] | null = null;
    const validateAdmittedBindings = () => {
      admittedBindings = prepareAdmittedBindings(capturedBindings,
        (owner, site) => canonicalWorldIsAlive.call(this.world, owner)
          ? canonicalWorldScalarSource.call(this.world, owner, site) : null);
      if (admittedBindings === null) {
        throw new UnsupportedGroupOpaqueFreshnessError("binding");
      }
      return true;
    };
    const commitSparseHost = (admitted: boolean) => {
      preparation.beginHostApplication();
      if (admitted) applyAdmittedBindings(capturedBindings, admittedBindings ?? []);
      else for (const item of capturedBindings) {
        const canonical = item.sites.map((site, index) =>
          this.world.isAlive(item.owner)
            ? this.world.scalarSource(item.owner, site) ?? item.sources[index]
            : item.sources[index]
        );
        if (rebindCapturedBindingSources(item.binding, canonical)) continue;
        const mutable = item.binding.sources as ScalarSource[] | undefined;
        if (mutable) {
          for (let index = 0; index < canonical.length; index++) {
            mutable[index] = canonical[index];
          }
        }
        (item.binding as { source: ScalarSource }).source = canonical[0];
      }
      if (admitted) preparedHost!.commitAdmitted();
      else preparedHost!.commit();
      preparedHost = null;
      this.#applyCandidateNumericWrites(numericWrites);
    };
    return this.#createCandidateLifecycle({
      baseVersion,
      baseVDOMVersion,
      stores,
      transitions: [],
      pendingResources: [],
      blocked: false,
      codeCurrent: () => cacheCodeCurrent(cachePatches.values()),
      validatePrepared: () =>
        this.#storeNotificationGeneration === storeGenerationAtPrepare &&
        preparation.validate() && !preparation.hasStateWrites() &&
        stores.validate() && validateNumericWrites() &&
        (resourceReads?.validate() ?? false) &&
        (preparedHost?.validate?.() ?? false),
      validatePreparedPrivate: () =>
        this.#storeNotificationGeneration === storeGenerationAtPrepare &&
        preparation.validate() && !preparation.hasStateWrites() &&
        stores.validatePreparedCanonical() &&
        numericWrites.every((write) =>
          canonicalWorldIsAlive.call(this.world, write.owner) &&
          canonicalWorldVersion.call(this.world, write.owner, write.site) === write.version &&
          canonicalWorldScalarSource.call(this.world, write.owner, write.site) === write.source &&
          capturedScalarCurrent(write.source, write.current)
        ) && (resourceReads ? canonicalResourceCutCurrent(resourceReads) : false) &&
        (preparedHost?.validatePreparedPrivate() ?? false) &&
        validateAdmittedBindings() &&
        cacheCodeCurrentPrivate(cachePatches.values()) &&
        codeRevisionsCurrent(capturedCodeRevisions),
      validatePostHost: () =>
        preparation.validatePublicationInputs() &&
        !preparation.hasStateWrites() &&
        stores.validatePublicationInputs() &&
        validatePostHostNumericWrites() &&
        (resourceReads?.validate() ?? false),
      finalGroupCurrent: () => preparation.validatePublicationInputs() &&
        !preparation.hasStateWrites() &&
        stores.validatePublicationInputsCanonical() &&
        validatePostHostNumericWrites() &&
        (resourceReads?.validateCanonical() ?? false) &&
        cacheCodeCurrentPrivate(cachePatches.values()) &&
        codeRevisionsCurrent(capturedCodeRevisions),
      preparePublication: () => {
        preparation.preparePublicationAfterHost();
        stores.preparePublicationAfterHost();
      },
      commitHost: () => commitSparseHost(false),
      commitHostAdmitted: () => commitSparseHost(true),
      publish: () => {
        preparation.publishAccepted();
        stores.publishAccepted();
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
          this.#syncOwnerSourceValues(
            owner,
            previous,
            cache.propBoundSites,
            capturedSparseValues.get(owner),
          );
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
      installSubscriptions: () => {
        try {
          this.#syncStoreReaders(stores, true);
          return [];
        } catch (error) {
          return [error];
        }
      },
      runEffects: () => {
        const errors: unknown[] = [];
        try {
          preparation.notifyPublished();
        } catch (error) {
          errors.push(error);
        }
        try {
          stores.notifyPublished();
        } catch (error) {
          errors.push(error);
        }
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
        admittedBindings = null;
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
    heldGenericState?: HeldGenericState,
    blockedWitnessSink?: (rows: readonly BlockedStoreReaderWitness[]) => void,
  ): NativeRootCandidate<H, Parent> {
    this.#assertActive();
    this.#assertNoPublicationBarrier("prepare");
    this.#assertPreparationHostAvailable();
    if (this.#terminalHostFailed) {
      throw new Error("Component root is terminal after a host commit failure");
    }
    const baseVersion = this.#publicationVersion;
    const baseVDOMVersion = this.#vdom.version;
    const directIntentAtPrepare = this.#pendingDirectIntent;
    let acceptedIntentLease: (() => void) | null = null;
    let retryResourceAfterPublication = false;
    const storeGenerationAtPrepare = this.#storeNotificationGeneration;
    const capturedChanges = this.#pendingChanges.capture();
    // Direct-writer owners are reused, so recapture their source/version on every
    // candidate attempt instead of relying on OwnerPreparation validation.
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
    const validatePostHostNumericWrites = () =>
      numericWrites.every((write) =>
        this.world.isAlive(write.owner) &&
        this.world.scalarSource(write.owner, write.site) === write.source &&
        this.world.version(write.owner, write.site) >= write.version &&
        (this.world.version(write.owner, write.site) > write.version ||
          Object.is(write.source.value, write.current))
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
      held: heldGenericState,
      retained: heldGenericState ? new Set() : undefined,
    };
    const nextOwners = new Set<OwnerId>();
    const nextEffects = new Map<string, EffectRegistration>();
    const nextCache = new Map<OwnerId, ComponentCache>();
    const acceptedCache = this.#componentCache;
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
      if (heldGenericState &&
        (boundaryState.retained?.size !== heldGenericState.boundaries.size ||
          !this.#heldGenericStateCurrent(heldGenericState))) {
        boundaryState.blocked = true;
      }
      for (const key of nextBoundaryPrimaries.keys()) {
        if (!boundaryState.visited.has(key)) nextBoundaryPrimaries.delete(key);
      }
      // Tagged bindings select direct writers on the first commit, even for empty collections.
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
      boundaryState.cleanRevealOutputs = undefined;
      this.#collectedKeyedRegions = priorKeyed;
      this.#collectedCollectionRegions = priorCollections;
    }
    const retainedCollectionRegions = new Map<string, CollectionRegionCache>();
    for (const [key, region] of this.#liveCollectionRegions) {
      if (nextCache.get(region.parentOwner) === acceptedCache.get(region.parentOwner) &&
        nextCache.has(region.parentOwner)) {
        retainedCollectionRegions.set(key, region);
      }
    }
    const capturedBoundValues = new Map<OwnerId, Map<string, number>>();
    for (const [owner, cache] of nextCache) {
      for (const site of cache.propBoundSites) {
        const source = preparation.scalarSource(owner, site);
        if (!source) continue;
        let sites = capturedBoundValues.get(owner);
        if (!sites) capturedBoundValues.set(owner, sites = new Map());
        sites.set(site, source.value);
      }
    }
    const candidatePendingResources = [...new Set([
      ...resourceReads!.pending,
      ...[...(heldGenericState?.boundaries.values() ?? [])].map(({ resource }) => resource),
    ])];
    if (blockedWitnessSink && boundaryState.blocked) {
      const witnesses: BlockedStoreReaderWitness[] = [];
      for (const row of boundaryState.suspendedStoreReaders ?? []) {
        const receipt = captureCanonicalBlockedStoreReaderReceipt(
          stores, row.pendingId, row.store,
        );
        if (receipt) witnesses.push({ ...row, receipt });
      }
      blockedWitnessSink(witnesses);
    }
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
    let admittedBindings: ScalarSource[][] | null = null;
    let artifactsReleased = false;
    let parkedHostStarted = false;
    const releaseCandidateArtifacts = (published: boolean) => {
      if (artifactsReleased) return;
      artifactsReleased = true;
      admittedBindings = null;
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
      retainedCollectionRegions.clear();
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
    const validatesPostHostCollections = () =>
      [...(artifacts.keyedRegions?.values() ?? [])].every((region) =>
        !region.collection ||
        region.collection.collection.version >=
          region.collection.snapshotVersion
      ) && [...(artifacts.collectionRegions?.values() ?? [])].every((region) =>
        region.collection.version >= region.snapshotVersion
      );
    const validatesPostHostCollectionsCanonical = () =>
      [...(artifacts.keyedRegions?.values() ?? [])].every((region) => {
        if (!region.collection) return true;
        const version = canonicalCollectionVersion(region.collection.collection);
        return version === null || version >= region.collection.snapshotVersion;
      }) && [...(artifacts.collectionRegions?.values() ?? [])].every((region) => {
        const version = canonicalCollectionVersion(region.collection);
        return version === null || version >= region.snapshotVersion;
      });
    const validatesPreparedCollectionsCanonical = () =>
      [...(artifacts.keyedRegions?.values() ?? [])].every((region) =>
        !region.collection || canonicalCollectionCutCurrent(
          region.collection.collection, region.collection.snapshotVersion,
        )
      ) && [...(artifacts.collectionRegions?.values() ?? [])].every((region) =>
        canonicalCollectionCutCurrent(region.collection, region.snapshotVersion)
      );
    const capturedCodeRevisions = captureCodeRevisions(
      artifacts.nextCache?.values() ?? [],
    );
    const validateAdmittedBindings = () => {
      admittedBindings = prepareAdmittedBindings(
        artifacts.capturedBindings ?? [],
        (owner, site) => canonicalWorldIsAlive.call(this.world, owner)
          ? canonicalWorldScalarSource.call(this.world, owner, site)
          : artifacts.preparation!.scalarSource(owner, site),
      );
      if (admittedBindings === null) {
        throw new UnsupportedGroupOpaqueFreshnessError("binding");
      }
      return true;
    };
    const commitFullHost = (admitted: boolean) => {
      parkedHostStarted = true;
      artifacts.preparation!.beginHostApplication();
      if (admitted) applyAdmittedBindings(
        artifacts.capturedBindings ?? [], admittedBindings ?? [],
      );
      else for (const item of artifacts.capturedBindings ?? []) {
        const canonical = item.sites.map((site, index) =>
          this.world.isAlive(item.owner)
            ? this.world.scalarSource(item.owner, site) ?? item.sources[index]
            : item.sources[index]
        );
        if (rebindCapturedBindingSources(item.binding, canonical)) continue;
        const mutable = item.binding.sources as ScalarSource[] | undefined;
        if (mutable) {
          for (let index = 0; index < canonical.length; index++) {
            mutable[index] = canonical[index];
          }
        }
        (item.binding as { source: ScalarSource }).source = canonical[0];
      }
      if (admitted) artifacts.preparedHost!.commitAdmitted();
      else artifacts.preparedHost!.commit();
      artifacts.preparedHost = null;
      this.#applyCandidateNumericWrites(artifacts.numericWrites ?? []);
    };
    return this.#createCandidateLifecycle({
      baseVersion,
      baseVDOMVersion,
      stores,
      transitions: options.transitions ?? [],
      pendingResources: candidatePendingResources,
      blocked: boundaryState.blocked,
      permitHeldFullCandidate: heldGenericState
        ? () => this.#heldGenericStateCurrent(heldGenericState)
        : undefined,
      referencesCompiledSource: (sourceFile) =>
        treeReferencesCompiledSource(tree, sourceFile) ||
        [...(artifacts.nextCache?.values() ?? [])].some((cache) =>
          cacheReferencesCompiledSource(cache, sourceFile)),
      codeCurrent: () =>
        this.#pendingDirectIntent === directIntentAtPrepare &&
        (!heldGenericState ||
          (heldGenericState.kind === "parked" && parkedHostStarted) ||
          this.#heldGenericStateCurrent(heldGenericState)) &&
        cacheCodeCurrent(artifacts.nextCache?.values() ?? []),
      validatePrepared: () =>
        artifacts.preparation !== null && artifacts.preparation.validate() &&
        !artifacts.preparation.hasStateWrites() &&
        artifacts.stores !== null && artifacts.stores.validate() &&
        validateNumericWrites() &&
        (resourceReads?.validate() ?? false) &&
        !boundaryState.blocked && validatesCollections() &&
        (artifacts.preparedHost?.validate?.() ?? false),
      validatePreparedPrivate: () =>
        artifacts.preparation !== null && artifacts.preparation.validate() &&
        !artifacts.preparation.hasStateWrites() &&
        artifacts.stores !== null && artifacts.stores.validatePreparedCanonical() &&
        (artifacts.numericWrites ?? []).every((write) =>
          canonicalWorldIsAlive.call(this.world, write.owner) &&
          canonicalWorldVersion.call(this.world, write.owner, write.site) === write.version &&
          canonicalWorldScalarSource.call(this.world, write.owner, write.site) === write.source &&
          capturedScalarCurrent(write.source, write.current)
        ) && !boundaryState.blocked &&
        validatesPreparedCollectionsCanonical() &&
        this.#pendingDirectIntent === directIntentAtPrepare &&
        (!heldGenericState || this.#heldGenericStateCurrent(heldGenericState)) &&
        cacheCodeCurrentPrivate(artifacts.nextCache?.values() ?? []) &&
        codeRevisionsCurrent(capturedCodeRevisions) &&
        (resourceReads ? canonicalResourceCutCurrent(resourceReads) : false) &&
        (artifacts.preparedHost?.validatePreparedPrivate() ?? false) &&
        validateAdmittedBindings(),
      validatePostHost: () =>
        artifacts.preparation !== null &&
        artifacts.preparation.validatePublicationInputs() &&
        !artifacts.preparation.hasStateWrites() &&
        artifacts.stores !== null &&
        artifacts.stores.validatePublicationInputs() &&
        validatePostHostNumericWrites() &&
        !boundaryState.blocked && validatesPostHostCollections(),
      finalGroupCurrent: () =>
        artifacts.preparation !== null &&
        artifacts.preparation.validatePublicationInputs() &&
        !artifacts.preparation.hasStateWrites() &&
        artifacts.stores !== null &&
        artifacts.stores.validatePublicationInputsCanonical() &&
        validatePostHostNumericWrites() && !boundaryState.blocked &&
        validatesPostHostCollectionsCanonical() &&
        cacheCodeCurrentPrivate(artifacts.nextCache?.values() ?? []) &&
        codeRevisionsCurrent(capturedCodeRevisions) &&
        this.#pendingDirectIntent === directIntentAtPrepare &&
        (!heldGenericState || this.#heldGenericStateCurrent(heldGenericState,
          heldGenericState.kind === "parked", () => {
            retryResourceAfterPublication = true;
          })) &&
        ((resourceReads?.validateCanonical() ?? true) ||
          (retryResourceAfterPublication = true)),
      preparePublication: () => {
        retryResourceAfterPublication = resourceReads !== null &&
          !resourceReads.validate();
        artifacts.preparation!.preparePublicationAfterHost();
        artifacts.stores!.preparePublicationAfterHost();
        if (!validatesPostHostCollections() ||
          !validatePostHostNumericWrites() ||
          !artifacts.stores!.validatePublicationInputs() ||
          !artifacts.preparation!.validatePublicationInputs()) {
          throw new Error("Full candidate inputs changed before publication");
        }
      },
      commitHost: () => commitFullHost(false),
      commitHostAdmitted: () => commitFullHost(true),
      publish: () => {
        artifacts.preparation!.publishAccepted();
        artifacts.stores!.publishAccepted();
        this.#tree = artifacts.tree!.value;
        this.#liveOwners = new Set(artifacts.ownerIds!);
        this.#componentCache = artifacts.nextCache!;
        this.#boundaryPrimaries = nextBoundaryPrimaries;
        if (retryResourceAfterPublication) this.#pendingResourceRetry = true;
        resourceReads?.discard();
        resourceReads = null;
        this.#syncLastSourceValues(artifacts.nextCache!, capturedBoundValues);
        if (this.#storeNotificationGeneration === storeGenerationAtPrepare &&
          (!heldGenericState ||
            (heldGenericState.kind === "explicit"
              ? this.#heldGenericReadersState(heldGenericState) === "current"
              : !retryResourceAfterPublication &&
                this.#heldGenericStateCurrent(heldGenericState)))) {
          this.#committedStoreNotificationGeneration = storeGenerationAtPrepare;
        }
        this.world.clearChangesThrough(capturedChanges);
        this.#pendingChanges.clearThrough(capturedChanges);
        this.#publicationVersion++;
      },
      accepted: () => {
        if (directIntentAtPrepare &&
          this.#pendingDirectIntent === directIntentAtPrepare) {
          this.#pendingDirectIntent = null;
          acceptedIntentLease = directIntentAtPrepare.releaseStoreLease;
          directIntentAtPrepare.releaseStoreLease = null;
          directIntentAtPrepare.tree = null;
        }
      },
      installSubscriptions: () => {
        if (this.#disposed) return [];
        const errors: unknown[] = [];
        try {
          this.#syncStoreReaders(artifacts.stores!);
        } catch (error) {
          errors.push(error);
        } finally {
          const releaseLease = acceptedIntentLease;
          acceptedIntentLease = null;
          if (releaseLease) errors.push(...collectCleanupErrors([releaseLease]));
        }
        if (options.autoRetryResources !== false) {
          try {
            this.#syncResourceSubscriptions(candidatePendingResources);
          } catch (error) {
            errors.push(error);
          }
        }
        try {
          this.#syncCollectionRegions(
            artifacts.nextCache!,
            artifacts.collectionRegions!,
            retainedCollectionRegions,
          );
        } catch (error) {
          errors.push(error);
        }
        return errors;
      },
      runEffects: () => {
        if (this.#disposed) return [];
        const errors: unknown[] = [];
        try {
          artifacts.preparation!.notifyPublished();
        } catch (error) {
          errors.push(error);
        }
        try {
          artifacts.stores!.notifyPublished();
        } catch (error) {
          errors.push(error);
        }
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

  /** Root-wide declaration that generic render preparation may repeat. */
  get renderPreparation(): "repeatable" | undefined {
    return this.#renderPreparation;
  }

  #requireRepeatableRender(capability?: "repeatable"): void {
    this.#validateRenderPreparation(capability);
    if (capability === "repeatable" || this.#renderPreparation === "repeatable") return;
    throw new Error("Isolated generic preparation requires renderPreparation: repeatable");
  }

  #validateRenderPreparation(capability?: "repeatable"): void {
    if (capability !== undefined && capability !== "repeatable") {
      throw new TypeError("Unknown render preparation capability");
    }
  }

  /** Stable identifier used when coordinating transitions across native roots. */
  get rootId() {
    return this.#rootId;
  }

  /** A retired root rejects new work; its accepted host tree stays until caller disposal. */
  get retired() {
    return this.#disposed || this.#codeInvalidated;
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

  /** Observe terminal work retirement; callers still dispose the accepted host tree. */
  onRetire(listener: () => void): () => void {
    if (typeof listener !== "function") throw new Error("Retire listener must be a function");
    if (this.#disposed || (this.#codeInvalidated && !this.#revisionRetirementPending)) {
      listener();
      return () => {};
    }
    this.#retireListeners.add(listener);
    return () => this.#retireListeners.delete(listener);
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
    if (!this.#enterDirectHostDomain()) {
      this.#pendingDirectIntent = {
        tree,
        releaseStoreLease: null,
        attemptedStoreGeneration: null,
      };
      this.#deferredFlush = true;
      return;
    }
    try { this.#renderAndCommit(tree, true); }
    finally { this.#leaveDirectHostDomain(); }
  }

  /** Commit one batched owner/site update; return false when there is no work. */
  flush(): boolean {
    this.#assertActive();
    // Keep capture buffers owned by the outer frame across reentrant flushes; its
    // acknowledgement schedules any newer setter version.
    if (this.#nativeCellCutActive || this.#scopedFlushActive) {
      if (isHostPublicationDomainBusy(this.#hostPublicationDomain)) {
        this.#waitForHostAvailability(true);
      }
      this.#scheduled = false;
      this.#deferredFlush = true;
      return false;
    }
    if (
      this.#publicationBarrier || this.#hostApplicationDepth > 0 ||
      this.#directPublicationPending || this.#activeRootClaim
    ) {
      if (isHostPublicationDomainBusy(this.#hostPublicationDomain)) {
        this.#waitForHostAvailability(true);
      }
      this.#deferredFlush = true;
      this.#scheduled = false;
      return false;
    }
    if (!this.#enterDirectHostDomain(true)) {
      this.#scheduled = false;
      this.#deferredFlush = true;
      return false;
    }
    this.#deferredFlush = false;
    try {
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
    if (this.#pendingDirectIntent && this.#publicationIntents.size === 0) {
      const intent = this.#pendingDirectIntent;
      const acceptedTree = this.#tree;
      const retryResource = this.#pendingResourceRetry;
      const retryBoundaries = [...this.#pendingBoundaryRetries];
      this.#pendingResourceRetry = false;
      this.#pendingBoundaryRetries.clear();
      this.#scopedFlushActive = true;
      let scheduleRestoredWork = false;
      try {
        return this.#renderAndCommit(
          intent.tree, true, new Set(), new Set(), 0, [], intent,
        );
      } catch (error) {
        if (!this.#disposed && !this.#codeInvalidated &&
          !this.#terminalHostFailed && this.#tree === acceptedTree) {
          this.#pendingResourceRetry ||= retryResource;
          for (const owner of retryBoundaries) {
            const cache = this.#componentCache.get(owner);
            if (cache?.nativeBoundary && cache.pendingResource) {
              this.#pendingBoundaryRetries.add(owner);
            }
          }
          scheduleRestoredWork = !this.#pendingDirectIntent;
        }
        throw error;
      } finally {
        this.#scopedFlushActive = false;
        const shouldSchedule = scheduleRestoredWork ||
          (this.#deferredFlush && this.#hasPendingWork());
        this.#deferredFlush = false;
        if (shouldSchedule) this.#schedule();
        reportFlush();
      }
    }
    const storeGenerationAtStart = this.#storeNotificationGeneration;
    const mixedCells: StateCellHandle[] = [];
    let onlyMixedCells = this.#pendingChanges.size === 0;
    const scanMixedCells = () => {
      mixedCells.length = 0;
      const capacity = this.#pendingChanges.size;
      if (this.#nativeCellHandles.length < capacity) {
        this.#nativeCellHandles.length = capacity;
        this.#nativeCellVersions.length = capacity;
      }
      const count = this.#pendingChanges.captureNative(
        this.#nativeCellHandles, this.#nativeCellVersions,
      );
      onlyMixedCells = count !== null;
      if (count === null) return;
      try {
        for (let index = 0; index < count; index++) {
          const handle = this.#nativeCellHandles[index]!;
          if (this.#heldCell(handle)) continue;
          const cache = this.#componentCache.get(handle.owner);
          const program = typeof cache?.type === "function"
            ? definedComponents.get(cache.type)?.metadata?.closedStoreHostProgram
            : undefined;
          if (program?.schemaVersion !== 7 ||
            !program.stateSites.includes(handle.site)) {
            onlyMixedCells = false;
            mixedCells.length = 0;
            return;
          }
          mixedCells.push(handle);
        }
      } finally {
        for (let index = 0; index < count; index++) {
          this.#nativeCellHandles[index] = undefined;
          this.#nativeCellVersions[index] = 0;
        }
      }
    };
    const asyncWorkPending = this.#liveResourceSubscriptions.size > 0 ||
      this.#pendingResourceRetry || this.#pendingBoundaryRetries.size > 0;
    const scanMixedEarly = this.#pendingChanges.size > 0 &&
      (storeGenerationAtStart !== this.#committedStoreNotificationGeneration ||
        asyncWorkPending || this.#publicationIntents.size > 0);
    if (scanMixedEarly) scanMixedCells();
    const canTryClosedStores =
      (this.#publicationIntents.size > 0 ||
        (!this.#pendingResourceRetry && this.#pendingBoundaryRetries.size === 0)) &&
      onlyMixedCells && !this.#unheldCollectionChanges() &&
      (mixedCells.length > 0 ||
        storeGenerationAtStart !== this.#committedStoreNotificationGeneration) &&
      (this.#publicationIntents.size === 0 ||
        this.#partialStoreAttemptGeneration !== storeGenerationAtStart);
    if (canTryClosedStores && this.#publicationIntents.size > 0) {
      this.#partialStoreAttemptGeneration = storeGenerationAtStart;
    }
    if (canTryClosedStores) {
      this.#activeCounters = this.#profileCounter ? new Map() : undefined;
    }
    const closedStoreResult = canTryClosedStores
      ? this.#tryFlushClosedStores(mixedCells) : "none";
    let closedPublished = closedStoreResult === "partial-generic";
    if (closedStoreResult === "complete" || closedStoreResult === "partial") {
      const fresh = this.#storeNotificationGeneration !== storeGenerationAtStart ||
        (this.#publicationIntents.size === 0 &&
          (this.#pendingResourceRetry || this.#pendingBoundaryRetries.size > 0));
      this.#deferredFlush = false;
      if (fresh || this.#hasPendingWork()) this.#schedule();
      reportFlush();
      return true;
    }
    const urgentPublished = (asyncWorkPending ||
      this.#publicationIntents.size > 0) &&
      this.#pendingChanges.size > 0 &&
      !this.#unheldCollectionChanges() &&
      this.#tryFlushUrgentRetainedCut();
    if (this.#disposed || this.#terminalHostFailed || this.#codeInvalidated) {
      reportFlush();
      return closedPublished || urgentPublished;
    }
    const resourceRetry = this.#pendingResourceRetry;
    this.#pendingResourceRetry = false;
    if (resourceRetry && this.#publicationIntents.size > 0) {
      this.#pendingResourceRetry = true;
    }
    const boundaryRetries = [...this.#pendingBoundaryRetries];
    const capturedBoundaryOwners = new Set(boundaryRetries);
    this.#pendingBoundaryRetries.clear();
    const canDrainBoundaries = !this.#unheldCellChanges() &&
      !this.#unheldCollectionChanges();
    const acceptedTree = this.#tree;
    let boundaryPublished = false;
    let boundaryFallback = false;
    let boundaryAborted = false;
    if (canDrainBoundaries && boundaryRetries.length > 0) {
      const drained = this.#drainBoundaryRetries(boundaryRetries, acceptedTree);
      boundaryPublished = drained.published;
      boundaryFallback = drained.fallback;
      boundaryAborted = drained.aborted;
    } else if (boundaryRetries.length > 0) {
      boundaryFallback = true;
      for (const owner of boundaryRetries) this.#pendingBoundaryRetries.add(owner);
    }
    if (boundaryAborted) {
      this.#deferredFlush = false;
      reportFlush();
      return closedPublished || boundaryPublished || urgentPublished;
    }
    const retryWholeTree = (resourceRetry &&
      this.#publicationIntents.size === 0) || boundaryFallback;
    if ((boundaryPublished || urgentPublished) && !retryWholeTree &&
      !closedPublished) {
      this.#deferredFlush = false;
      if (urgentPublished) {
        if (this.#hasPendingWork()) this.#schedule();
      } else if (this.#hasPendingWork()) this.#schedule();
      reportFlush();
      return true;
    }
    if (boundaryPublished || urgentPublished) this.#deferredFlush = false;
    if (this.#publicationIntents.size > 0 &&
      (this.#pendingDirectIntent ||
        this.#pendingChanges.size > 0 ||
        this.#storeNotificationGeneration !==
          this.#committedStoreNotificationGeneration) &&
      (this.#pendingChanges.size > 0 || canTryClosedStores ||
        this.#partialStoreAttemptGeneration !==
        this.#storeNotificationGeneration)) {
      const intent = this.#pendingDirectIntent;
      this.#partialStoreAttemptGeneration = this.#storeNotificationGeneration;
      this.#scopedFlushActive = true;
      let published = false;
      try {
        published = this.#renderAndCommit(
          intent?.tree ?? this.#tree,
          true,
          new Set(),
          new Set(),
          0,
          [],
          intent,
        );
      } finally {
        this.#scopedFlushActive = false;
      }
      const deferred = this.#deferredFlush;
      this.#deferredFlush = false;
      if (deferred && this.#hasPendingWork()) this.#schedule();
      if (published) {
        reportFlush();
        return true;
      }
    }
    if (this.#publicationIntents.size > 0 &&
      (this.#pendingDirectIntent || this.#pendingChanges.size > 0 ||
        this.#pendingCollectionRegionKeys.size > 0 ||
        this.#storeNotificationGeneration !==
          this.#committedStoreNotificationGeneration)) {
      reportFlush();
      return closedPublished || boundaryPublished || urgentPublished;
    }
    const runGenericRetry = (): boolean => {
      const unprocessed = [...this.#pendingBoundaryRetries].filter((owner) =>
        capturedBoundaryOwners.has(owner)
      );
      for (const owner of unprocessed) this.#pendingBoundaryRetries.delete(owner);
      let published = false;
      this.#deferredFlush = false;
      this.#scopedFlushActive = true;
      try {
        published = this.#renderAndCommit(this.#tree, true);
      } catch (error) {
        if (!this.#disposed) {
          for (const owner of unprocessed) {
            const cache = this.#componentCache.get(owner);
            if (cache?.nativeBoundary && cache.pendingResource) {
              this.#pendingBoundaryRetries.add(owner);
            }
          }
          if (!this.#terminalHostFailed) this.#pendingResourceRetry = true;
        }
        throw error;
      } finally {
        this.#scopedFlushActive = false;
      }
      if (!published && !this.#disposed) {
        for (const owner of unprocessed) {
          const cache = this.#componentCache.get(owner);
          if (cache?.nativeBoundary && cache.pendingResource) {
            this.#pendingBoundaryRetries.add(owner);
          }
        }
      }
      const deferred = this.#deferredFlush;
      this.#deferredFlush = false;
      if (
        (published && deferred) ||
        (this.#pendingChanges.size === 0 &&
          this.#pendingCollectionRegionKeys.size === 0 &&
          [...this.#pendingBoundaryRetries].some((owner) =>
            !capturedBoundaryOwners.has(owner)
          ))
      ) this.#schedule();
      return published;
    };
    const storeGeneration = this.#storeNotificationGeneration;
    const storeChangePending =
      storeGeneration !== this.#committedStoreNotificationGeneration;
    if (
      this.#pendingChanges.size === 0 && !storeChangePending &&
      this.#pendingCollectionRegionKeys.size === 0 && !retryWholeTree
    ) {
      if (closedPublished) reportFlush();
      return closedPublished;
    }
    if (
      retryWholeTree && this.#pendingChanges.size === 0 && !storeChangePending &&
      this.#pendingCollectionRegionKeys.size === 0
    ) {
      runGenericRetry();
      reportFlush();
      return true;
    }
    if (!canTryClosedStores) {
      this.#activeCounters = this.#profileCounter ? new Map() : undefined;
    }
    if (
      !retryWholeTree && !storeChangePending &&
      this.#pendingCollectionRegionKeys.size === 0 &&
      this.#pendingChanges.size > 0 &&
      this.#tryFlushNativeCellCut()
    ) {
      reportFlush();
      return true;
    }
    if (!scanMixedEarly && !retryWholeTree && !storeChangePending &&
      this.#pendingCollectionRegionKeys.size === 0 &&
      this.#pendingChanges.size > 0) {
      scanMixedCells();
      const mixedClosedResult = onlyMixedCells && mixedCells.length > 0
        ? this.#tryFlushClosedStores(mixedCells) : "none";
      closedPublished ||= mixedClosedResult === "partial-generic";
      if (mixedClosedResult === "complete" || mixedClosedResult === "partial") {
        this.#deferredFlush = false;
        if (this.#hasPendingWork()) this.#schedule();
        reportFlush();
        return true;
      }
    }
    const capturedChanges = this.#pendingChanges.capture();
    if (retryWholeTree) {
      runGenericRetry();
      reportFlush();
      return true;
    }
    const collectionOnly = capturedChanges.length === 0 &&
      !storeChangePending && this.#pendingCollectionRegionKeys.size > 0;
    let tryMixed = !collectionOnly &&
      this.#pendingCollectionRegionKeys.size > 0 &&
      (capturedChanges.length > 0 || storeChangePending);
    if (collectionOnly) {
      const delta = this.#flushCollectionDelta();
      if (delta === true) {
        reportFlush();
        return true;
      }
      tryMixed = delta === "closed-row";
    }
    if (tryMixed) {
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
    if (collectionOnly) {
      this.#profile?.("collection.delta.fallback-candidate", 0);
    }
    if (
      capturedChanges.length === 0 && !storeChangePending &&
      this.#pendingCollectionRegionKeys.size === 0
    ) {
      if (closedPublished) reportFlush();
      return closedPublished;
    }
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
        ? this.#compiledPropSitesForCache(change.owner, cache)
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
    // Store selectors and footprints are transaction-scoped; re-execute live readers
    // so source switches detach atomically at publication.
    if (
      this.#everReadResource || this.#everHadNativeBoundary ||
      hasSuspendedStoreReader ||
      missingCollectionParent || missingStoreReaderOwner
    ) {
      this.#renderAndCommit(this.#tree, true, new Set(), new Set(), 0, [],
        null, storeChangePending);
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
        this.#renderAndCommit(this.#tree, true, new Set(), new Set(), 0, [],
          null, storeChangePending);
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
    // The generic candidate carries latest numeric bindings; retain direct-only owners
    // and apply their host writes during VDOM commit.
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
        null,
        storeChangePending,
      );
    } finally {
      this.#preparedRenders.clear();
    }
    reportFlush();
    return true;
    } finally {
      this.#leaveDirectHostDomain();
    }
  }

  /** Replace the declarative tree while preserving component owners by site/key. */
  update(tree: RuntimeNode) {
    this.#assertActive();
    this.#assertNoPublicationBarrier("update");
    const previous = this.#pendingDirectIntent;
    const intent: DirectTreeIntent = {
      tree,
      releaseStoreLease: previous?.releaseStoreLease ?? null,
      attemptedStoreGeneration: null,
    };
    if (previous) {
      previous.releaseStoreLease = null;
      previous.tree = null;
    }
    this.#pendingDirectIntent = intent;
    if (this.#activeRootClaim || !this.#enterDirectHostDomain()) {
      this.#deferredFlush = true;
      return;
    }
    const previousCounters = this.#activeCounters;
    const observationCounters = this.#profileCounter && !previousCounters
      ? new Map<string, number>() : undefined;
    if (observationCounters) this.#activeCounters = observationCounters;
    try { this.#renderAndCommit(tree, true, new Set(), new Set(), 0, [], intent); }
    finally {
      if (observationCounters) this.#activeCounters = previousCounters;
      this.#leaveDirectHostDomain();
    }
    if (observationCounters?.size) {
      this.#profileCounter?.(Object.fromEntries(observationCounters));
    }
  }

  render(tree: RuntimeNode) {
    this.update(tree);
  }

  dispose() {
    this.#disposeWithClaim();
  }

  #disposeWithClaim(borrowedClaim?: HostPublicationClaim) {
    if (this.#disposed) return;
    if (
      this.#publicationBarrier || this.#nativeCellCutActive ||
      this.#directPublicationPending ||
      this.#hostApplicationDepth > 0 ||
      (this.#activeRootClaim && this.#activeRootClaim !== borrowedClaim)
    ) {
      this.#disposeRequested = true;
      this.#vdom.cancelPendingRefAttachments();
      if (this.#activeRootClaim) this.#waitForHostAvailability();
      return;
    }
    const teardownClaim = borrowedClaim ?? createHostPublicationClaim();
    if (tryClaimHostPublicationDomains(
      [this.#hostPublicationDomain], teardownClaim, "teardown",
    ) === "busy") {
      this.#disposeRequested = true;
      this.#vdom.cancelPendingRefAttachments();
      this.#waitForHostAvailability();
      return;
    }
    try {
    this.#disposing = true;
    const disposeErrors: unknown[] = [];
    for (const candidate of [...this.#preparedCandidates.keys()]) {
      try {
        candidate.failGroup(
          new Error("Component root disposed during candidate preparation"),
        );
      } catch (error) {
        disposeErrors.push(error);
      }
    }
    this.#disposed = true;
    this.#disposing = false;
    this.#deferredFlush = false;
    this.#hostAvailabilityWait?.unsubscribe();
    this.#hostAvailabilityWait = null;
    disposeErrors.push(...collectCleanupErrors([...this.#retireListeners]));
    this.#retireListeners.clear();
    disposeErrors.push(...collectCleanupErrors(
      [...this.#publicationIntents.keys()],
    ));
    try {
      this.#dropPendingDirectIntent();
    } catch (error) {
      disposeErrors.push(error);
    }
    for (const listener of this.#disposeListeners) {
      try {
        listener();
      } catch (error) {
        disposeErrors.push(error);
      }
    }
    this.#disposeListeners.clear();
    this.#unsubscribe();
    this.#unsubscribeRevision();
    this.#scheduled = false;
    this.#pendingChanges.clear();
    this.#lastSourceValues.clear();
    this.#nativeLanePrograms = new WeakMap();
    this.#nativeRowPrograms = new WeakMap();
    if (!this.#nativeCellCutActive) {
      this.#clearNumericProgramBuffers();
      this.#numericProgramSources.length = 0;
      this.#numericProgramCurrentValues.length = 0;
      this.#numericProgramPreviousValues.length = 0;
    }
    if (!this.#nativeCellCutActive) {
      this.#clearNativeRowBuffers();
      this.#clearNativeCellCutBuffers();
      this.#nativeCellHandles.length = 0;
      this.#nativeCellVersions.length = 0;
      this.#nativeLaneTokens.length = 0;
    }
    try {
      this.#vdom.dispose();
    } catch (error) {
      disposeErrors.push(error);
      try {
        quarantineHostPublicationDomains(
          [this.#hostPublicationDomain], teardownClaim, error,
        );
      } catch (quarantineError) {
        disposeErrors.push(quarantineError);
      }
    }
    const subscribedStores = [...this.#liveStoreSubscriptions.keys()];
    for (const unsubscribe of this.#liveStoreSubscriptions.values()) {
      unsubscribe();
    }
    this.#liveStoreSubscriptions.clear();
    for (const stores of this.#storeDependencyLeases.values()) stores.clear();
    this.#storeDependencyLeases.clear();
    for (const subscription of this.#liveResourceSubscriptions.values()) {
      subscription.unsubscribe();
    }
    this.#liveResourceSubscriptions.clear();
    this.#pendingBoundaryRetries.clear();
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
    } finally {
      if (!borrowedClaim) {
        releaseHostPublicationDomains([this.#hostPublicationDomain], teardownClaim);
      }
    }
  }

  #drainBoundaryRetries(
    targets: readonly OwnerId[],
    acceptedTree: RuntimeNode,
  ): { published: boolean; fallback: boolean; aborted: boolean } {
    let published = false;
    let fallback = false;
    let aborted = false;
    let next = 0;
    this.#scopedFlushActive = true;
    try {
      while (next < targets.length) {
        if (this.#disposed || this.#disposeRequested ||
          this.#codeInvalidated || this.#terminalHostFailed ||
          this.#tree !== acceptedTree) {
          aborted = true;
          break;
        }
        if (this.#unheldCellChanges() ||
          this.#unheldCollectionChanges()) {
          fallback = true;
          break;
        }
        const heldResource = this.#componentCache.get(targets[next])?.pendingResource;
        const heldCache = this.#componentCache.get(targets[next]);
        const heldChild = heldCache && Object.getOwnPropertyDescriptor(
          heldCache.props, "children")?.value;
        const heldStores = new Set<AnyAsyncStore>();
        const heldDependencies = this.#boundaryResourceDependencies(
          heldChild, heldStores,
        );
        if ((heldResource && this.#resourceHoldWait(new Set([heldResource]))) ||
          (heldDependencies && this.#resourceHoldWait(
            heldDependencies, undefined, { stores: [...heldStores] },
          ))) {
          this.#pendingBoundaryRetries.add(targets[next]);
          next++;
          continue;
        }
        const reveal = this.#prepareBoundaryReveal(targets[next]);
        if (!reveal) {
          fallback = true;
          this.#pendingBoundaryRetries.add(targets[next]);
          next++;
          continue;
        }
        try {
          if (!reveal.validate()) {
            reveal.discard();
            fallback = true;
            this.#pendingBoundaryRetries.add(targets[next]);
            next++;
            continue;
          }
          reveal.commitHost();
          reveal.publish();
          published = true;
          next++;
          reveal.runEffects();
        } catch (error) {
          const cleanup = collectCleanupErrors([() => reveal.discard()]);
          return throwWithCleanup(error, cleanup);
        }
      }
    } catch (error) {
      if (!this.#disposed && !this.#terminalHostFailed) {
        this.#pendingResourceRetry = true;
      }
      throw error;
    } finally {
      for (; next < targets.length; next++) {
        const owner = targets[next];
        const cache = this.#componentCache.get(owner);
        if (cache?.nativeBoundary && cache.pendingResource) {
          this.#pendingBoundaryRetries.add(owner);
        }
      }
      this.#scopedFlushActive = false;
    }
    if (this.#disposed || this.#disposeRequested || this.#codeInvalidated ||
      this.#terminalHostFailed || this.#tree !== acceptedTree) aborted = true;
    return { published, fallback, aborted };
  }

  #tryFlushUrgentRetainedCut(): boolean {
    const count = this.#pendingChanges.size;
    if (count === 0 || this.#unheldCollectionChanges()) return false;
    const handles: (StateCellHandle | undefined)[] = Array(count);
    const versions: number[] = Array(count);
    if (this.#pendingChanges.captureNative(handles, versions) !== count) return false;
    const complete: StateCellHandle[] = [];
    for (let index = 0; index < count; index++) {
      const handle = handles[index];
      if (!handle || this.world.versionForCell(handle) !== versions[index]) {
        return false;
      }
      const source = this.world.scalarSourceForCell(handle);
      if (!source || !this.#lastSourceValues.has(source)) return false;
      if (!this.#heldCell(handle)) complete.push(handle);
    }
    if (!complete.length) return false;
    const candidate = this.prepareRetained(complete);
    if (!candidate) return false;
    this.#scopedFlushActive = true;
    try {
      if (!candidate.validate()) {
        candidate.discard();
        return false;
      }
      candidate.commitHost();
      candidate.publish();
      candidate.runEffects();
      return true;
    } catch (error) {
      const cleanup = collectCleanupErrors([() => candidate.discard()]);
      return throwWithCleanup(error, cleanup);
    } finally {
      this.#scopedFlushActive = false;
    }
  }

  #tryFlushClosedStores(mixedCells: readonly StateCellHandle[] = []):
    "none" | "complete" | "partial" | "partial-generic" {
    const acceptedTree = this.#tree;
    let published = false;
    let failedStores: Set<AnyAsyncStore> | undefined;
    let attemptedStores: Set<AnyAsyncStore> | undefined;
    let selected: AnyAsyncStore[] | undefined;
    let capturedGeneration = 0;
    this.#scopedFlushActive = true;
    try {
      selected = this.#storeNotificationGeneration ===
          this.#committedStoreNotificationGeneration
        ? [] : [...this.#liveStoreSubscriptions.keys()].filter((store) =>
          !this.#heldStore(store));
      capturedGeneration = this.#storeNotificationGeneration;
      const complete = selected.length || mixedCells.length
        ? this.#prepareInternalClosedInputs(mixedCells, selected) : null;
      if (complete) {
        try {
          if (complete.validate()) {
            if ("commitAdmitted" in complete) complete.commitAdmitted();
            else commitAdmittedNativeCandidate(complete);
            complete.publish();
            if ("commitAdmitted" in complete && this.#activeCounters) {
              this.#count("publication.immediate.runs");
            }
            if (this.#liveStoreSubscriptions.size === selected.length &&
              selected.every((store) => this.#liveStoreSubscriptions.has(store))) {
              this.#committedStoreNotificationGeneration = capturedGeneration;
            }
            complete.runEffects();
            return "complete";
          }
          complete.discard();
        } catch (error) {
          return throwWithCleanup(error, collectCleanupErrors([() => complete.discard()]));
        }
      }
      failedStores = new Set<AnyAsyncStore>();
      attemptedStores = new Set<AnyAsyncStore>();
      for (const store of [...this.#liveStoreSubscriptions.keys()]) {
        if (this.#heldStore(store)) continue;
        if (this.#disposed || this.#disposeRequested || this.#terminalHostFailed ||
          this.#codeInvalidated || this.#tree !== acceptedTree) break;
        attemptedStores.add(store);
        const candidate = this.#prepareClosedStoreCandidate([store], true);
        if (!candidate) { failedStores.add(store); continue; }
        try {
          if (!candidate.validate()) {
            candidate.discard();
            failedStores.add(store);
            continue;
          }
          commitAdmittedNativeCandidate(candidate);
          candidate.publish();
          published = true;
          candidate.runEffects();
        } catch (error) {
          return throwWithCleanup(error, collectCleanupErrors([() => candidate.discard()]));
        }
      }
    } finally {
      this.#scopedFlushActive = false;
    }
    if (!published || !selected || !failedStores || !attemptedStores) return "none";
    if (this.#storeNotificationGeneration !== capturedGeneration) return "partial";
    let needsGeneric = selected.some((store) =>
      !attemptedStores.has(store) && !this.#heldStore(store));
    const unresolved = new Set([...failedStores].filter((store) =>
      !this.#heldStore(store) && this.#liveStoreSubscriptions.has(store)));
    const seenReaders = new Set<AnyAsyncStore>();
    const pendingCurrent = new Map<string, Set<AnyAsyncStore>>();
    const blockedCurrent = new Map<string, Set<AnyAsyncStore>>();
    const retainedReaders: Array<{ readerId: string; store: AnyAsyncStore }> = [];
    const pendingPrefix = "\u0000suspense-pending:";
    if (unresolved.size > 0) {
      for (const [readerId, membership] of this.#liveStoreReaders) {
        let pendingOriginal: string | undefined;
        if (readerId.startsWith(pendingPrefix)) {
          const separator = readerId.indexOf(":", pendingPrefix.length);
          const boundaryId = readerId.slice(pendingPrefix.length, separator);
          const boundaryOwner = Number(boundaryId);
          const original = readerId.slice(separator + 1);
          const ownerSeparator = original.indexOf("\u0000");
          const originalOwner = Number(original.slice(0, ownerSeparator));
          const cache = this.#componentCache.get(boundaryOwner);
          const resource = cache?.pendingResource;
          if (separator > pendingPrefix.length && boundaryId === String(boundaryOwner) &&
            ownerSeparator > 0 && Number.isSafeInteger(originalOwner) &&
            this.#liveOwners.has(boundaryOwner) &&
            canonicalWorldIsAlive.call(this.world, boundaryOwner) &&
            this.#liveOwners.has(originalOwner) &&
            canonicalWorldIsAlive.call(this.world, originalOwner) &&
            canonicalWorldIsWithin.call(this.world, originalOwner, boundaryOwner) &&
            cache?.nativeBoundary && cache.subtreeOwners.has(originalOwner) &&
            resource && closedResourceStatus(resource)?.status === "pending" &&
            this.#liveResourceSubscriptions.get(resource)?.boundary === boundaryOwner) {
            pendingOriginal = original;
          }
        }
        for (const store of membership) {
          if (!unresolved.has(store)) continue;
          seenReaders.add(store);
          const receipt = captureCanonicalStoreReaderReceipt(
            store, this.#rootId, readerId,
          );
          const status = receipt && inspectCanonicalStoreReaderReceipt(
            store, this.#rootId, readerId, receipt,
          );
          if (status === "current") {
            if (pendingOriginal) {
              let stores = pendingCurrent.get(pendingOriginal);
              if (!stores) pendingCurrent.set(pendingOriginal, stores = new Set());
              stores.add(store);
            }
          } else if (status === "retained" && !readerId.startsWith(pendingPrefix)) {
            retainedReaders.push({ readerId, store });
          } else {
            needsGeneric = true;
          }
        }
      }
    }
    for (const [resource, subscription] of this.#liveResourceSubscriptions) {
      if (closedResourceStatus(resource)?.status !== "pending") continue;
      for (const row of subscription.blockedReaders ?? []) {
        if (row.resource !== resource || !unresolved.has(row.store) ||
          (subscription.boundary !== null &&
            subscription.boundary !== row.boundaryOwner) ||
          row.pendingId !==
            `\u0000suspense-pending:${row.boundaryOwner}:${row.originalId}` ||
          !this.#liveStoreReaders.get(row.originalId)?.has(row.store)) continue;
        const ownerSeparator = row.originalId.indexOf("\u0000");
        const originalOwner = Number(row.originalId.slice(0, ownerSeparator));
        const cache = this.#componentCache.get(row.boundaryOwner);
        const ownerCache = this.#componentCache.get(originalOwner);
        if (ownerSeparator <= 0 || !Number.isSafeInteger(originalOwner) ||
          !this.#liveOwners.has(row.boundaryOwner) ||
          !canonicalWorldIsAlive.call(this.world, row.boundaryOwner) ||
          !this.#liveOwners.has(originalOwner) ||
          !canonicalWorldIsAlive.call(this.world, originalOwner) ||
          !canonicalWorldIsWithin.call(this.world, originalOwner,
          row.boundaryOwner) || !cache?.nativeBoundary ||
          cache !== row.acceptedBoundaryCache ||
          ownerCache !== row.acceptedOwnerCache ||
          !cache.subtreeOwners.has(originalOwner) ||
          !cacheCodeCurrentPrivate([cache]) ||
          !inspectCanonicalBlockedStoreReaderReceipt(
            row.receipt, row.store, this.#rootId, row.pendingId,
          )) continue;
        let stores = blockedCurrent.get(row.originalId);
        if (!stores) blockedCurrent.set(row.originalId, stores = new Set());
        stores.add(row.store);
      }
    }
    let parkedRetained = false;
    for (const { readerId, store } of retainedReaders) {
      if (pendingCurrent.get(readerId)?.has(store) ||
        blockedCurrent.get(readerId)?.has(store)) parkedRetained = true;
      else needsGeneric = true;
    }
    if ([...unresolved].some((store) => !seenReaders.has(store))) needsGeneric = true;
    if (!needsGeneric && !parkedRetained &&
      this.#storeNotificationGeneration === capturedGeneration &&
      this.#liveStoreSubscriptions.size === selected.length &&
      selected.every((store) => attemptedStores.has(store) &&
        this.#liveStoreSubscriptions.has(store))) {
      this.#committedStoreNotificationGeneration = capturedGeneration;
    }
    return needsGeneric ? "partial-generic" : "partial";
  }

  #prepareBoundaryReveal(
    boundaryOwner: OwnerId,
    resourceLease?: () => void,
  ): NativeRootCandidate<H, Parent> | null {
    return this.#prepareResourceReveals([boundaryOwner], resourceLease);
  }

  #prepareResourceReveals(
    boundaryOwners: readonly OwnerId[], resourceLease?: () => void,
    cells: readonly StateCellHandle[] = [],
    selectedStores: readonly AnyAsyncStore[] = [],
    acceptedCollections: readonly (() => boolean)[] = [],
    acceptedResources: ReadonlySet<AsyncResource<any>> = new Set(),
    acceptedCollectionFootprint: readonly KeyedCollection<any>[] = [],
  ): NativeRootCandidate<H, Parent> | null {
    this.#assertActive();
    this.#assertNoPublicationBarrier("prepare resource reveals");
    this.#assertPreparationHostAvailable();
    if (!boundaryOwners.length || new Set(boundaryOwners).size !== boundaryOwners.length ||
      this.#terminalHostFailed || this.#codeInvalidated) return null;
    const baseVersion = this.#publicationVersion;
    const baseVDOMVersion = this.#vdom.version;
    const preparation = this.world.beginPreparation();
    const stores = new StoreRenderTransaction(this.#rootId);
    let reads: ResourceReadSet | null = new ResourceReadSet(this.#resourceTable);
    let program: import("./vdom_snapshot_runtime.ts").PreparedScopedKeyedRetainedProgram | null = null;
    let closed: ClosedStoreOutputCut | null = null;
    const stages: Array<{
      region: { key: string; tree: RuntimeNode };
      resource: AsyncResource<any>;
      dependencies: ReadonlySet<AsyncResource<any>>;
      storeInputs: ReadonlySet<AnyAsyncStore>;
      pendingReaderIds: ReadonlySet<string>;
      current(): boolean;
      privateCurrent(): boolean;
      privatePreparedCurrent(): boolean;
      retirementCurrent(): boolean;
      publish(): void;
      installSubscriptions(): void;
      runEffects(): unknown[];
      release(): void;
    }> = [];
    let writes: RetainedCellWrite[] = [];
    let sources = new Set<ScalarSource>();
    try {
      const captured = this.#captureRetainedCells(cells);
      if (!captured) throw new SparseCandidateIneligible();
      writes = captured.writes;
      sources = captured.sources;
      for (const owner of boundaryOwners) {
        const stage = this.#stageBoundaryReveal(
          owner, preparation, stores, reads, resourceLease,
        );
        if (!stage) throw new SparseCandidateIneligible();
        stages.push(stage);
      }
      const mixedWrites = writes.filter(({ handle }) => {
        const cache = this.#componentCache.get(handle.owner);
        const host = typeof cache?.type === "function"
          ? definedComponents.get(cache.type)?.metadata?.closedStoreHostProgram
          : undefined;
        return host?.schemaVersion === 7 && host.stateSites.includes(handle.site);
      });
      if (selectedStores.length || mixedWrites.length) {
        const newlyStaged = new Set(stages.flatMap((stage) =>
          [...stage.storeInputs]));
        const pendingReaderIds = new Set(stages.flatMap((stage) =>
          [...stage.pendingReaderIds]));
        closed = this.#stageClosedStoreOutputs(
          selectedStores, stores, false, newlyStaged, pendingReaderIds,
          resourceLease, mixedWrites, true,
        );
      }
      program = this.#vdom.prepareScopedKeyedRetainedAndStoreDeltas(
        [], writes.filter(({ handle }) => !closed?.owners.has(handle.owner)).map(
          ({ source, value }) => [source, value] as const),
        closed?.regions ?? [], stages.map(({ region }) => region),
        closed?.scalarPlans,
      );
      if (!program || program.readSources.some((source) => !sources.has(source))) {
        throw new SparseCandidateIneligible();
      }
      closed?.setScalarSuccessors(program.storeScalarPlans);
      if (!preparation.validate() || !stores.validate() || !reads.validate() ||
        !stages.every((stage) => stage.current())) {
        throw new SparseCandidateIneligible();
      }
    } catch (error) {
      const cleanup = collectCleanupErrors([
        () => program?.discard(), () => preparation.discard(),
        () => stores.discard(), () => reads?.discard(),
        () => closed?.release(),
        ...stages.map((stage) => () => stage.release()),
      ]);
      if (error instanceof HeldPublicationWait && !cleanup.length) {
        return this.#prepareBlockedPublication([error.resource]);
      }
      if (error instanceof SparseCandidateIneligible && !cleanup.length) return null;
      return throwWithCleanup(error, cleanup);
    }
    const handles = writes.map(({ handle }) => handle);
    const versions = writes.map(({ version }) => version);
    const acceptedCollectionVersions = acceptedCollectionFootprint.map((collection) =>
      [collection, canonicalCollectionVersion(collection)] as const
    );
    const acceptedResourceVersions = [...acceptedResources].map((resource) =>
      [resource, canonicalResourceVersion(resource)] as const
    );
    const stageCodeCurrent = () => stages.every((stage) => stage.current()) &&
      acceptedCollections.every((validate) => validate()) &&
      writes.every(({ handle }) => {
        const cache = this.#componentCache.get(handle.owner);
        return cache !== undefined && componentCodeCurrent(cache.type);
      });
    return this.#createCandidateLifecycle({
      baseVersion, baseVDOMVersion,
      scope: { kind: "keyed", versionDelta: 1 },
      stores, transitions: [], pendingResources: [], blocked: false,
      permitPendingDirectIntent: () => resourceLease !== undefined &&
        this.#publicationIntents.has(resourceLease),
      admissionCurrent: () => (!resourceLease ||
        this.#publicationIntents.has(resourceLease)) &&
        !this.#resourceHoldWait(new Set([
          ...acceptedResources,
          ...stages.flatMap((stage) => [...stage.dependencies]),
        ]), resourceLease, {
          cells: [...handles, ...(closed?.inputCells ?? [])], stores: [...selectedStores,
            ...stages.flatMap((stage) => [...stage.storeInputs]),
            ...(closed?.inputStores ?? [])],
          collections: acceptedCollectionFootprint,
        }) && !this.#resourceHoldWait(
          new Set(closed?.inputResources ?? []), resourceLease) &&
        (!resourceLease || this.#publicationIntents.has(resourceLease)),
      codeCurrent: stageCodeCurrent,
      validatePrepared: () => preparation.validate() &&
        !preparation.hasStateWrites() && stores.validate() &&
        (reads?.validate() ?? false) && (program?.validate() ?? false) &&
        this.#validateRetainedCells(writes, false) &&
        (closed?.current() ?? true) && stageCodeCurrent(),
      validatePreparedPrivate: () => (!resourceLease ||
        this.#publicationIntents.has(resourceLease)) && preparation.validate() &&
        !this.#resourceHoldWait(new Set([
          ...acceptedResourceVersions.map(([resource]) => resource),
          ...stages.flatMap((stage) => [...stage.dependencies]),
          ...(closed?.inputResources ?? []),
        ]), resourceLease, {
          cells: [...handles, ...(closed?.inputCells ?? [])], stores: [...selectedStores,
            ...stages.flatMap((stage) => [...stage.storeInputs]),
            ...(closed?.inputStores ?? [])],
          collections: acceptedCollectionVersions.map(([collection]) => collection),
        }) &&
        !preparation.hasStateWrites() && stores.validatePreparedCanonical() &&
        (reads ? canonicalResourceCutCurrent(reads) : false) &&
        (program?.validatePreparedPrivate() ?? false) &&
        this.#validateRetainedCellsPrivate(writes) &&
        stages.every((stage) => stage.privateCurrent()) &&
        (closed?.privatePreparedCurrent() ?? true) &&
        acceptedCollectionVersions.every(([collection, version]) =>
          canonicalCollectionCutCurrent(collection, version)
        ) && acceptedResourceVersions.every(([resource, version]) =>
          canonicalResourceVersionCurrent(resource, version)
        ) && writes.every(({ handle }) => {
          const cache = this.#componentCache.get(handle.owner);
          return cache !== undefined && componentCodeCurrentPrivate(cache.type);
        }),
      validatePostHost: () => preparation.validatePublicationInputs() &&
        !preparation.hasStateWrites() && stores.validatePublicationInputs() &&
        (reads?.validate() ?? false) && (program?.validatePostHost() ?? false) &&
        this.#validateRetainedCells(writes, true) &&
        (closed?.postHostCurrent() ?? true) && stageCodeCurrent(),
      finalGroupCurrent: () => preparation.validatePublicationInputs() &&
        !preparation.hasStateWrites() &&
        stores.validatePublicationInputsCanonical() &&
        (reads?.validateCanonical() ?? false) &&
        (program?.validatePostHostPrivate() ?? false) &&
        this.#validateRetainedCellsPrivate(writes, true) &&
        stages.every((stage) => stage.privateCurrent()) &&
        (closed?.postHostPrivateCurrent() ?? true) &&
        writes.every(({ handle }) => {
          const cache = this.#componentCache.get(handle.owner);
          return cache !== undefined && componentCodeCurrentPrivate(cache.type);
        }) && stages.every((stage) => stage.retirementCurrent()),
      commitHost: () => { preparation.beginHostApplication(); program!.commit(); },
      commitHostAdmitted: () => {
        preparation.beginHostApplication();
        program!.commitAdmitted();
      },
      preparePublication: () => {
        preparation.preparePublicationAfterHost();
        stores.preparePublicationAfterHost();
      },
      publish: () => {
        preparation.publishAccepted();
        stores.publishAccepted();
        for (const stage of stages) stage.publish();
        closed?.publish();
        for (const write of writes) this.#lastSourceValues.set(write.source, write.value);
        canonicalWorldClearCellChangesThrough.call(this.world,
          handles, versions, handles.length);
        this.#pendingChanges.clearNativeThrough(handles, versions, handles.length);
        reads?.discard(); reads = null;
        this.#publicationVersion++;
      },
      installSubscriptions: () => {
        for (const stage of stages) stage.installSubscriptions();
        if (stores.closedInputsChanged()) {
          this.#storeNotificationGeneration++;
          this.#schedule();
        }
        return [];
      },
      runEffects: () => {
        const errors: unknown[] = [];
        try { preparation.notifyPublished(); } catch (error) { errors.push(error); }
        try { stores.notifyPublished(); } catch (error) { errors.push(error); }
        try { this.#vdom.flushRefs(); } catch (error) { errors.push(error); }
        for (const stage of stages) errors.push(...stage.runEffects());
        return errors;
      },
      discard: () => {
        program?.discard(); preparation.discard(); stores.discard();
        reads?.discard(); reads = null;
      },
      releaseArtifacts: () => {
        program?.discard(); program = null;
        closed?.release(); closed = null;
        for (const stage of stages) stage.release();
        stages.length = 0; writes.length = 0; sources.clear();
        handles.length = 0; versions.length = 0;
        reads?.discard(); reads = null;
      },
      effectFailureMessage: "Resource reveal effects failed",
    });
  }

  #stageBoundaryReveal(
    boundaryOwner: OwnerId,
    preparation: ReturnType<OwnerStateWorld["beginPreparation"]>,
    stores: StoreRenderTransaction,
    reads: ResourceReadSet,
    resourceLease?: () => void,
  ) {
    const boundaryCache = this.#componentCache.get(boundaryOwner);
    if (!boundaryCache?.nativeBoundary || !boundaryCache.pendingResource ||
      !this.#liveOwners.has(boundaryOwner) || !this.world.isAlive(boundaryOwner) ||
      this.#boundaryPrimaries.has(String(boundaryOwner))) return null;
    const ancestorControlsCurrent = this.#captureBoundaryAncestorControlsCurrent(
      boundaryOwner,
    );
    if (!ancestorControlsCurrent) return null;
    const resource = boundaryCache.pendingResource;
    if (this.#resourceHoldWait(new Set([resource]), resourceLease)) return null;
    if (closedResourceStatus(resource)?.status !== "fulfilled") return null;
    const child = Object.getOwnPropertyDescriptor(boundaryCache.props, "children")?.value;
    if (!isRuntimeOwnedElement(child)) return null;
    const dependencyStores = new Set<AnyAsyncStore>();
    const dependencies = this.#boundaryResourceDependencies(child, dependencyStores);
    if (!dependencies || this.#resourceHoldWait(
      dependencies, resourceLease, { stores: [...dependencyStores] },
    )) return null;
    type RevealStep = {
      node: RuntimeElement;
      type: ComponentType<Record<string, unknown>>;
      props: Record<string, unknown>;
      descriptors: Record<string, PropertyDescriptor>;
      siteId: string;
      ownerKey: string;
      hostKeyScope: string;
      revision: CompiledSemanticRevisionToken;
      forward?: ClosedComponentForwardProgram;
    };
    const steps: RevealStep[] = [];
    const visited = new Set<Function>();
    let projected: RuntimeElement = child as RuntimeElement;
    for (;;) {
      const type = Object.getOwnPropertyDescriptor(projected, "type")?.value;
      const props = Object.getOwnPropertyDescriptor(projected, "props")?.value;
      if (typeof type !== "function" || !definedComponents.has(type) ||
        visited.has(type) ||
        !props || typeof props !== "object" || !Object.isFrozen(props)) return null;
      visited.add(type);
      const siteId = definedComponents.get(type)?.siteId;
      const revision = componentRevision(type);
      if (!siteId || !revision || !isCompiledSemanticRevisionCurrent(revision)) return null;
      if (steps.length && (revision.sourceFile !== steps[0].revision.sourceFile ||
        revision.moduleRevision !== steps[0].revision.moduleRevision)) return null;
      const descriptors = Object.getOwnPropertyDescriptors(props);
      if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string") ||
        Object.values(descriptors).some((descriptor) => !("value" in descriptor)) ||
        descriptors.ref?.value != null) return null;
      const authoredKey = descriptors.key?.value;
      if (authoredKey != null && typeof authoredKey !== "string") return null;
      const ownerKey = authoredKey ?? `@slot:${siteId}:0`;
      const hostKeyScope = steps.length
        ? ownerKey : `${boundaryOwner}\u0000${ownerKey}`;
      const forward = closedComponentForwardProgramFor(type);
      steps.push({ node: projected,
        type: type as ComponentType<Record<string, unknown>>, props, descriptors,
        siteId, ownerKey, hostKeyScope, revision,
        ...(forward ? { forward } : {}) });
      if (!forward) break;
      if (steps.length > 8 ||
        forward.childComponent === type ||
        definedComponents.get(forward.childComponent)?.siteId !==
          forward.childComponentProgramId ||
        !componentCodeCurrent(forward.childComponent)) return null;
      const nextRevision = componentRevision(forward.childComponent);
      if (!nextRevision || nextRevision.sourceFile !== revision.sourceFile ||
        nextRevision.moduleRevision !== revision.moduleRevision) return null;
      const nextProps: Record<string, unknown> = {};
      for (const [name, expression] of forward.props) {
        if (expression.kind === "prop") {
          const source = descriptors[expression.name];
          if (!source || !("value" in source)) return null;
          nextProps[name] = source.value;
        } else nextProps[name] = expression.value;
      }
      nextProps.key = forward.key ?? `${hostKeyScope}:0`;
      projected = Object.freeze({
        type: forward.childComponent as RuntimeElement["type"],
        props: Object.freeze(nextProps),
      });
    }
    const leaf = steps.at(-1)!;
    const childType = leaf.type;
    const childProps = leaf.props;
    const descriptors = leaf.descriptors;
    const legacyResourceProgram = closedResourceHostProgramFor(childType);
    const legacySource = legacyResourceProgram
      ? descriptors[legacyResourceProgram.resourceProp]?.value
      : undefined;
    const resourceProgram = legacySource === resource ? legacyResourceProgram : undefined;
    const storeProgram = closedStoreHostProgramFor(childType);
    if (!resourceProgram && !storeProgram) return null;
    const hostKey = (resourceProgram ?? storeProgram)!.host.key;
    const source = resourceProgram ? descriptors[resourceProgram.resourceProp]?.value : undefined;
    if (resourceProgram && source !== resource) return null;
    const first = steps[0];
    if (this.world.findOwner(boundaryOwner, first.siteId, first.ownerKey) !== undefined) {
      return null;
    }
    const oldOutput = this.#cacheOutputView(boundaryCache, true);
    if (!isRuntimeOwnedElement(oldOutput) ||
      typeof Object.getOwnPropertyDescriptor(oldOutput, "type")?.value !== "string") {
      return null;
    }
    const oldOutputProps = Object.getOwnPropertyDescriptor(oldOutput, "props")?.value;
    if (!oldOutputProps || typeof oldOutputProps !== "object" ||
      Object.getOwnPropertyDescriptor(oldOutputProps, "key")?.value !== hostKey) return null;
    if (!boundaryCache.subtreeOwners.has(boundaryOwner) ||
      boundaryCache.ownEffects.size !== 0 ||
      boundaryCache.propBoundSites.size !== 0) return null;
    const fallbackCaches = new Map<OwnerId, {
      cache: ComponentCache;
      revision: CompiledSemanticRevisionToken | undefined;
    }>();
    for (const owner of boundaryCache.subtreeOwners) {
      if (owner === boundaryOwner) continue;
      const cache = this.#componentCache.get(owner);
      if (!cache || !this.#liveOwners.has(owner) || !this.world.isAlive(owner) ||
        !this.world.isWithin(owner, boundaryOwner) || cache.nativeBoundary ||
        cache.keyedRegion || cache.pendingResource || cache.propBoundSites.size ||
        this.#ownerHasStoreReaders(owner) ||
        !canRetireOwnedWorldOwner(this.world, owner)) return null;
      const revision = componentRevision(cache.type);
      if (revision && !isCompiledSemanticRevisionCurrent(revision)) return null;
      fallbackCaches.set(owner, { cache, revision });
    }
    const oldTag = Object.getOwnPropertyDescriptor(oldOutput, "type")?.value;
    const retired = [...fallbackCaches.keys()].sort((left, right) =>
      this.world.ownerLineage(right).length - this.world.ownerLineage(left).length
    );
    const retiredEffects = [...this.#liveEffects].filter(([, effect]) =>
      fallbackCaches.has(effect.owner)
    );
    const pendingPrefix = `\u0000suspense-pending:${boundaryOwner}:`;
    const pendingReaders = new Map<string, Set<AnyAsyncStore>>();
    for (const [readerId, membership] of this.#liveStoreReaders) {
      if (readerId.startsWith(pendingPrefix)) pendingReaders.set(readerId, membership);
    }
    if (pendingReaders.size && resourceProgram) return null;
    if (pendingReaders.size && !storeProgram) return null;
    const acceptedReaders = new Map<string, Set<AnyAsyncStore>>();
    const storeInputs = new Set<AnyAsyncStore>();
    try {
      const preparedOwners: OwnerId[] = [];
      let parentOwner = boundaryOwner;
      for (const step of steps) {
        if (preparation.findOwner(parentOwner, step.siteId, step.ownerKey) !== undefined) {
          throw new SparseCandidateIneligible();
        }
        const owner = preparation.resolveOwner(parentOwner, step.siteId, step.ownerKey);
        preparedOwners.push(owner);
        parentOwner = owner;
      }
      const childOwner = preparedOwners.at(-1)!;
      let generated: RuntimeElement | null = null;
      if (!resourceProgram && storeProgram) {
        const values: number[] = [];
        const consumedPending = new Set<string>();
        for (const input of closedStoreHostInputs(storeProgram)) {
          const value = descriptors[input.storeProp]?.value;
          const paths = closedStoreHostInputPaths(input);
          const readerId = `${childOwner}\u0000${input.storeUseSiteId}`;
          if (value instanceof AsyncStore) {
            storeInputs.add(value);
            const captured = stores.readClosedProjections(value, readerId, paths);
            if (!captured) throw new SparseCandidateIneligible();
            values.push(...captured);
            acceptedReaders.set(readerId, new Set([value]));
            for (const [pendingId, membership] of pendingReaders) {
              const oldId = pendingId.slice(pendingPrefix.length);
              if (!oldId.endsWith(`\u0000${input.storeUseSiteId}`)) continue;
              if (membership.size !== 1 || !membership.has(value) ||
                consumedPending.has(pendingId)) {
                throw new SparseCandidateIneligible();
              }
              consumedPending.add(pendingId);
            }
          } else if (value instanceof AsyncResource) {
            if (pendingReaders.size && [...pendingReaders.keys()].some((id) =>
              id.endsWith(`\u0000${input.storeUseSiteId}`))) {
              throw new SparseCandidateIneligible();
            }
            const status = reads.readClosed(value);
            const captured = status ? captureClosedProjectionValues(status.value, paths) : null;
            if (!captured) throw new SparseCandidateIneligible();
            values.push(...captured);
          } else throw new SparseCandidateIneligible();
        }
        if (consumedPending.size !== pendingReaders.size ||
          !stores.retireClosedReaders(pendingReaders)) throw new SparseCandidateIneligible();
        generated = evaluateClosedStoreHostTree(storeProgram, values);
      } else if (resourceProgram) {
        const status = reads.readClosed(resource);
        generated = status && evaluateClosedResourceHostProgram(resourceProgram, status.value);
      }
      if (!generated) throw new SparseCandidateIneligible();
      generated = copyRuntimeElement(generated.type, generated.props, childOwner);
      const preparedCaches = new Map<OwnerId, ComponentCache>();
      for (let index = 0; index < steps.length; index++) {
        const step = steps[index];
        const componentProps: Record<string, unknown> = {};
        for (const [name, descriptor] of Object.entries(step.descriptors)) {
          if (name !== "key" && name !== "ref") componentProps[name] = descriptor.value;
        }
        ownCompiledOwnerProps(step.type, step.node, componentProps);
        preparedCaches.set(preparedOwners[index], {
          type: step.type,
          hostKeyScope: step.hostKeyScope,
          props: componentProps,
          numericPropsAdmitted: numericOwnerPropsAdmitted(
            step.type, componentProps, isRuntimeOwnedElement(step.node),
          ),
          numericStateAdmitted: true,
          output: ordinaryOutput(steps[index + 1]?.node ?? generated, generated),
          subtreeOwners: new Set(preparedOwners.slice(index)),
          ownEffects: new Map(),
          propBoundSites: new Set(),
        });
      }
      const forwardingCodeCurrent = () => steps.every((step, index) =>
        isCompiledSemanticRevisionCurrent(step.revision) &&
        (step.forward === undefined ||
          (closedComponentForwardProgramFor(step.type) === step.forward &&
            definedComponents.get(step.forward.childComponent)?.siteId ===
              step.forward.childComponentProgramId &&
            step.forward.childComponent === steps[index + 1]?.type))
      );
      const forwardingCurrent = () => steps.every((step) => {
        if (Object.getOwnPropertyDescriptor(step.node, "type")?.value !== step.type ||
          Object.getOwnPropertyDescriptor(step.node, "props")?.value !== step.props) return false;
        const now = Object.getOwnPropertyDescriptors(step.props);
        const names = Reflect.ownKeys(now);
        return names.length === Reflect.ownKeys(step.descriptors).length &&
          names.every((name) => {
            const original = step.descriptors[name as string];
            const actual = now[name as string];
            return original && actual && "value" in original && "value" in actual &&
              Object.is(actual.value, original.value);
          });
      });
      const retiredOwned = retired.map((owner) => {
        const cache = fallbackCaches.get(owner)!.cache;
        const lineage = canonicalWorldOwnerLineage.call(this.world, owner).slice(1);
        const sources = new Map<string, ScalarSource | null>();
        for (const site of cache.propBoundSites) {
          sources.set(site, canonicalWorldScalarSource.call(this.world, owner, site));
        }
        return { owner, cache, lineage, sources };
      }).sort((left, right) => right.lineage.length - left.lineage.length);
      const boundaryLineage = canonicalWorldOwnerLineage.call(this.world,
        boundaryOwner).slice(1);
      const lineageCurrent = (owner: OwnerId, captured: readonly OwnerId[]) => {
        const live = canonicalWorldOwnerLineage.call(this.world, owner).slice(1);
        return live.length === captured.length &&
          live.every((ancestor, index) => ancestor === captured[index]);
      };
      const retirementCurrent = () => retiredOwned.every(
        ({ owner, cache, lineage, sources }) =>
          this.#componentCache.get(owner) === cache &&
          canRetireOwnedWorldOwner(this.world, owner) &&
          lineageCurrent(owner, lineage) &&
          [...sources].every(([site, source]) =>
            canonicalWorldScalarSource.call(this.world, owner, site) === source)
      ) && lineageCurrent(boundaryOwner, boundaryLineage);
      const privateCurrent = () => ancestorControlsCurrent() && forwardingCodeCurrent() &&
        closedResourceStatus(resource)?.status === "fulfilled" &&
        !this.#codeInvalidated &&
        this.#componentCache.get(boundaryOwner) === boundaryCache &&
        this.#liveOwners.has(boundaryOwner) && canonicalWorldIsAlive.call(this.world, boundaryOwner) &&
        [...fallbackCaches].every(([owner, { cache, revision }]) =>
          this.#componentCache.get(owner) === cache &&
          this.#liveOwners.has(owner) && canonicalWorldIsAlive.call(this.world, owner) &&
          !this.#ownerHasStoreReaders(owner) &&
          (!revision || isCompiledSemanticRevisionCurrent(revision))
        ) && retirementCurrent() &&
        retiredEffects.every(([key, effect]) => this.#liveEffects.get(key) === effect) &&
        !this.#boundaryPrimaries.has(String(boundaryOwner)) &&
        boundaryCache.pendingResource === resource &&
        canonicalWorldFindOwner.call(this.world, boundaryOwner, first.siteId, first.ownerKey) === undefined &&
        [...pendingReaders].every(([id, membership]) =>
          this.#liveStoreReaders.get(id) === membership) &&
        preparation.validatePublicationInputs();
      const current = () =>
        Object.getOwnPropertyDescriptor(child, "type")?.value === steps[0].type &&
        Object.getOwnPropertyDescriptor(child, "props")?.value === steps[0].props &&
        forwardingCurrent() &&
        Object.getOwnPropertyDescriptor(oldOutput, "type")?.value === oldTag &&
        Object.getOwnPropertyDescriptor(oldOutput, "props")?.value === oldOutputProps &&
        privateCurrent();
      const sourceCurrent = () =>
        (resourceProgram ? Object.getOwnPropertyDescriptor(childProps, resourceProgram.resourceProp)?.value === source : true) &&
        (!resourceProgram && storeProgram ? closedStoreHostInputs(storeProgram).every((input) =>
          Object.getOwnPropertyDescriptor(childProps, input.storeProp)?.value ===
            descriptors[input.storeProp]?.value) : true);
      const regionTree = canAdoptBareSuspenseFallback(
        boundaryOwner, boundaryCache, generated, childOwner,
      ) ? markSuspenseRevealAdoption(generated, childOwner) : generated;
      return {
        region: { key: hostKey, tree: regionTree },
        resource,
        dependencies: new Set([resource, ...dependencies]),
        storeInputs,
        pendingReaderIds: new Set(pendingReaders.keys()),
        stores,
        current: () => sourceCurrent() && current(),
        privateCurrent: () => sourceCurrent() && current(),
        privatePreparedCurrent: () => sourceCurrent() && current(),
        retirementCurrent,
        publish: () => {
          for (const { owner, cache, lineage, sources } of retiredOwned) {
            this.#retireOwnerAcceptedOwned(owner, cache, lineage, sources);
          }
          for (const [key] of retiredEffects) this.#liveEffects.delete(key);
          for (const owner of retired) this.#liveEffectKeysByOwner.delete(owner);
          for (const [owner, cache] of preparedCaches) this.#componentCache.set(owner, cache);
          this.#componentCache.set(boundaryOwner, {
            ...boundaryCache,
            output: ordinaryOutput(cacheOutputView(boundaryCache, false), generated),
            subtreeOwners: new Set([boundaryOwner, ...preparedOwners]),
            pendingResource: undefined,
          });
          for (const owner of preparedOwners) this.#liveOwners.add(owner);
          for (const readerId of pendingReaders.keys()) this.#liveStoreReaders.delete(readerId);
          for (const [readerId, membership] of acceptedReaders) {
            this.#liveStoreReaders.set(readerId, membership);
          }
          this.#boundaryPrimaries.set(String(boundaryOwner), { tree: child });
          this.#refreshDirectKeyedRegionOutputForParent(boundaryOwner,
            boundaryLineage[0]);
          for (const ancestor of boundaryLineage) {
            const cache = this.#componentCache.get(ancestor);
            if (!cache) continue;
            const subtreeOwners = cache.subtreeOwners as Set<OwnerId>;
            for (const owner of preparedOwners) subtreeOwners.add(owner);
            this.#componentCache.set(ancestor, {
              ...cache,
              output: ordinaryOutput(null, null),
              subtreeOwners,
              invalidatedByCollection: true,
            });
          }
        },
        installSubscriptions: () => {
          if (acceptedReaders.size) this.#reconcileStoreSubscriptions();
        },
        runEffects: () => this.#cleanupEffects(retiredEffects.map(([, effect]) => effect)),
        release: () => {
          preparedCaches.clear();
          preparedOwners.length = 0;
          steps.length = 0;
          fallbackCaches.clear();
          pendingReaders.clear();
          acceptedReaders.clear();
          retiredOwned.length = 0;
          boundaryLineage.length = 0;
          retired.length = 0;
          retiredEffects.length = 0;
        },
      };
    } catch (error) {
      if (error instanceof SparseCandidateIneligible) return null;
      throw error;
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
    directIntent: DirectTreeIntent | null = null,
    allowParked = false,
  ): boolean {
    let candidate: NativeRootCandidate<H, Parent> | null = null;
    let blockedWitnesses: readonly BlockedStoreReaderWitness[] = [];
    const heldGenericState = this.#publicationIntents.size > 0
      ? this.#captureHeldGenericState()
      : allowParked && !directIntent && !this.#pendingDirectIntent &&
          !this.#pendingResourceRetry &&
          this.#pendingBoundaryRetries.size === 0
      ? this.#captureParkedGenericState() : null;
    if (this.#publicationIntents.size > 0 && !heldGenericState) return false;
    const storeGenerationAtAttempt = this.#storeNotificationGeneration;
    const holdDirectFrontier = (
      current: NativeRootCandidate<H, Parent>,
      intent: DirectTreeIntent,
    ) => {
      const nextLease = current.retainStoreDependencies();
      try {
        if (this.#pendingDirectIntent !== intent) {
          nextLease();
          return;
        }
        this.#syncResourceSubscriptions([...current.pendingResources]);
        if (this.#pendingDirectIntent !== intent) {
          nextLease();
          this.#pendingResourceRetry = true;
          this.#schedule();
          return;
        }
        const previousLease = intent.releaseStoreLease;
        intent.releaseStoreLease = nextLease;
        intent.attemptedStoreGeneration = storeGenerationAtAttempt;
        previousLease?.();
      } catch (error) {
        return throwWithCleanup(error, collectCleanupErrors([nextLease]));
      }
    };
    try {
      candidate = this.#prepareCandidate(
        tree,
        {},
        forceRender,
        dirtyOwners,
        relevantOwners,
        numericChanges,
        heldGenericState ?? undefined,
        (rows) => { blockedWitnesses = rows; },
      );
      if (directIntent && this.#pendingDirectIntent !== directIntent) {
        candidate.discard();
        return false;
      }
      if (candidate.blocked) {
        if (directIntent) holdDirectFrontier(candidate, directIntent);
        else this.#syncResourceSubscriptions([...candidate.pendingResources]);
        for (const resource of candidate.pendingResources) {
          const subscription = this.#liveResourceSubscriptions.get(resource);
          if (subscription) subscription.blockedReaders = undefined;
        }
        const byResource = new Map<AsyncResource<any>, SubscribedBlockedStoreReaderWitness[]>();
        for (const row of blockedWitnesses) {
          if (!inspectCanonicalBlockedStoreReaderReceipt(
            row.receipt, row.store, this.#rootId, row.pendingId,
          )) continue;
          const ownerSeparator = row.originalId.indexOf("\u0000");
          const originalOwner = Number(row.originalId.slice(0, ownerSeparator));
          const acceptedBoundaryCache = this.#componentCache.get(row.boundaryOwner);
          const acceptedOwnerCache = this.#componentCache.get(originalOwner);
          if (ownerSeparator <= 0 || !Number.isSafeInteger(originalOwner) ||
            !acceptedBoundaryCache?.nativeBoundary || !acceptedOwnerCache ||
            !acceptedBoundaryCache.subtreeOwners.has(originalOwner)) continue;
          let rows = byResource.get(row.resource);
          if (!rows) byResource.set(row.resource, rows = []);
          rows.push({ ...row, acceptedBoundaryCache, acceptedOwnerCache });
        }
        for (const [resource, rows] of byResource) {
          const subscription = this.#liveResourceSubscriptions.get(resource);
          if (subscription && closedResourceStatus(resource)?.status === "pending") {
            subscription.blockedReaders = Object.freeze(rows);
          }
        }
        candidate.discard();
        return false;
      }
      if (!candidate.validate()) {
        if (directIntent && this.#pendingDirectIntent !== directIntent) {
          candidate.discard();
          return false;
        }
        if (directIntent && this.#renderPreparation !== "repeatable" &&
          candidate.pendingResources.length > 0) {
          holdDirectFrontier(candidate, directIntent);
        }
        if (collectionRetry >= 2 && directIntent &&
          this.#renderPreparation === "repeatable") {
          if (candidate.pendingResources.length === 0) {
            throw new Error("Direct update stayed stale without a dependency wake");
          }
          holdDirectFrontier(candidate, directIntent);
          if (this.#pendingDirectIntent === directIntent &&
            this.#liveResourceSubscriptions.size === 0) {
            throw new Error("Direct update stayed stale without a dependency wake");
          }
        }
        candidate.discard();
        if (this.#renderPreparation === "repeatable" && collectionRetry < 2) {
          return this.#renderAndCommit(
            tree,
            forceRender,
            dirtyOwners,
            relevantOwners,
            collectionRetry + 1,
            numericChanges,
            directIntent,
            allowParked,
          );
        }
        if (!directIntent && this.#renderPreparation === "repeatable") {
          this.#schedule();
        }
        return false;
      }
      candidate.commitHost();
      candidate.publish();
      candidate.runEffects();
      return true;
    } catch (error) {
      if (error instanceof StaleCollectionCandidate &&
        this.#renderPreparation === "repeatable" && collectionRetry < 2) {
        return this.#renderAndCommit(
          tree,
          forceRender,
          dirtyOwners,
          relevantOwners,
          collectionRetry + 1,
          numericChanges,
          directIntent,
          allowParked,
        );
      }
      if (candidate) {
        const failedCandidate = candidate;
        const cleanup = collectCleanupErrors([
          () => failedCandidate.discard(),
          () => {
            if (directIntent && this.#pendingDirectIntent === directIntent) {
              this.#dropPendingDirectIntent();
            }
          },
        ]);
        return throwWithCleanup(error, cleanup);
      }
      if (directIntent && this.#pendingDirectIntent === directIntent) {
        return throwWithCleanup(error, collectCleanupErrors([
          () => this.#dropPendingDirectIntent(),
        ]));
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
      numericStateReadsPrimitive: true,
      collectionPropsOwned: cached.collectionPropsOwned,
      collectionProps: cached.props,
      collectionSites: closedCollectionSitesFor(cached.type),
      stateLayout: numericOwnerCacheAdmitted(cached)
        ? compiledStateLayoutFor(cached.type) : undefined,
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
      cached.scopeExplicitHostKeys === true,
      owner,
    );
    if (this.#profile) {
      this.#profile("owner.render-and-key", performance.now() - renderStarted);
    }
    return { owner, result, ownEffects, propBoundSites,
      numericStateAdmitted: activeOwner.numericStateReadsPrimitive };
  }

  #commitPartialOwnerRender(
    prepared: PreparedRender,
    captured: ReadonlyMap<string, number>,
  ) {
    const cached = this.#componentCache.get(prepared.owner)!;
    this.#componentCache.set(prepared.owner, {
      ...cached,
      output: ordinaryOutput(prepared.result, prepared.result),
      subtreeOwners: new Set([prepared.owner]),
      ownEffects: prepared.ownEffects,
      propBoundSites: prepared.propBoundSites,
      numericStateAdmitted: prepared.numericStateAdmitted,
    });
    this.#syncOwnerSourceValues(
      prepared.owner,
      cached,
      prepared.propBoundSites,
      captured,
    );
    this.#refreshDirectKeyedRegionOutput(prepared.owner);
  }

  #tryPartialOwnerCommit(owner: OwnerId): boolean {
    if (this.#renderPreparation !== "repeatable") return false;
    const cached = this.#componentCache.get(owner);
    if (!cached || cached.subtreeOwners.size !== 1) return false;
    const oldKey = singleHostRootKey(this.#cacheOutputView(cached, true));
    if (oldKey === null) return false;
    const prepared = this.#preparePartialOwnerRender(owner);
    if (!prepared) return false;
    const nextKey = singleHostRootKey(prepared.result);
    if (!hasNestedComponent(prepared.result) && nextKey === oldKey) {
      const captured = this.#captureOwnerSourceValues(
        owner,
        prepared.propBoundSites,
      );
      const committed = this.#commitHostMutation(
        () => this.#vdom.commitKeyedRegion(oldKey, prepared.result),
        true,
      );
      if (committed) {
        try {
          this.#commitPartialOwnerRender(prepared, captured);
          this.#publishDirectHostMutation();
        } catch (error) {
          if (this.#directPublicationPending) {
            this.#failDirectHostMutation(error);
          }
          throw error;
        }
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
        return true;
      }
      this.#abandonDirectHostMutation();
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
    if (this.#renderPreparation !== "repeatable") return false;
    const cached = this.#componentCache.get(owner);
    if (!cached) {
      this.#profile?.("dispatch.structural-bail.cache-missing", 0);
      return false;
    }
    if (cached.subtreeOwners.size <= 1) {
      this.#profile?.("dispatch.structural-bail.no-nested-owners", 0);
      return false;
    }
    const oldKey = singleHostRootKey(this.#cacheOutputView(cached, true));
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
      if (expandedResult !== null) {
        const captured = this.#captureOwnerSourceValues(
          owner,
          prepared.propBoundSites,
        );
        const committed = this.#commitHostMutation(
          () => this.#vdom.commitKeyedRegion(oldKey, expandedResult),
          true,
        );
        if (committed) {
          try {
            this.#componentCache.set(owner, {
              ...cached,
              output: ordinaryOutput(prepared.result, expandedResult),
              ownEffects: prepared.ownEffects,
              propBoundSites: prepared.propBoundSites,
              numericStateAdmitted: prepared.numericStateAdmitted,
            });
            this.#syncOwnerSourceValues(
              owner,
              cached,
              prepared.propBoundSites,
              captured,
            );
            this.#publishDirectHostMutation();
          } catch (error) {
            if (this.#directPublicationPending) {
              this.#failDirectHostMutation(error);
            }
            throw error;
          }
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
        this.#abandonDirectHostMutation();
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
      output: ordinaryOutput(prepared.result, expandedResult),
      subtreeOwners: ownSubtreeOwners,
      ownEffects: prepared.ownEffects,
      propBoundSites: prepared.propBoundSites,
      numericStateAdmitted: prepared.numericStateAdmitted,
      keyedRegion: structuralKeyedRegions?.get(owner),
    });
    const retainedCollectionRegions = new Map<string, CollectionRegionCache>();
    for (const [key, region] of this.#liveCollectionRegions) {
      if (!affectedOwners.has(region.parentOwner) ||
        nextComponentCache.get(region.parentOwner) ===
          this.#componentCache.get(region.parentOwner)) {
        retainedCollectionRegions.set(key, region);
      }
    }
    const capturedStructuralValues = new Map<OwnerId, Map<string, number>>();
    for (const [nextOwner, component] of nextComponentCache) {
      capturedStructuralValues.set(
        nextOwner,
        this.#captureOwnerSourceValues(nextOwner, component.propBoundSites),
      );
    }

    let structurallyCommitted: boolean;
    try {
      structurallyCommitted = this.#commitHostMutation(
        () => this.#vdom.commitKeyedRegion(oldKey, expandedResult),
        true,
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
      this.#abandonDirectHostMutation();
      this.#profile?.("dispatch.structural-bail.keyed-region-rejected", 0);
      // Full reconciliation remains the correctness fallback. Reuse any
      // component results already produced while preparing this subtree.
      for (const candidateOwner of ownSubtreeOwners) {
        const candidate = nextComponentCache.get(candidateOwner);
        if (candidate) {
          this.#preparedRenders.set(candidateOwner, {
            owner: candidateOwner,
            result: this.#cacheOutputView(candidate, false),
            ownEffects: candidate.ownEffects,
            propBoundSites: candidate.propBoundSites,
            numericStateAdmitted: candidate.numericStateAdmitted === true,
          });
        }
      }
      return false;
    }

    const retiredOwners: OwnerId[] = [];
    try {
      for (const previousOwner of affectedOwners) {
        if (nextOwners.has(previousOwner)) continue;
        if (this.#activeCounters) this.#count("owner.retired");
        this.#componentCache.delete(previousOwner);
        this.#liveOwners.delete(previousOwner);
        retiredOwners.push(previousOwner);
      }
      for (const [nextOwner, component] of nextComponentCache) {
        this.#componentCache.set(nextOwner, component);
        this.#liveOwners.add(nextOwner);
      }
      this.#syncLastSourceValues(
        this.#componentCache,
        capturedStructuralValues,
      );
      this.#publishDirectHostMutation();
    } catch (error) {
      if (this.#directPublicationPending) this.#failDirectHostMutation(error);
      throw error;
    }
    const effectErrors: unknown[] = [];
    for (const previousOwner of retiredOwners) {
      effectErrors.push(
        ...this.#reconcileOwnerEffects(previousOwner, new Map()),
      );
      this.world.destroyOwner(previousOwner);
      this.#dropPendingForOwner(previousOwner);
    }
    for (const [nextOwner, component] of nextComponentCache) {
      effectErrors.push(
        ...this.#reconcileOwnerEffects(nextOwner, component.ownEffects),
      );
    }
    try {
      this.#syncCollectionRegions(
        this.#componentCache,
        structuralCollectionRegions ?? new Map(),
        retainedCollectionRegions,
      );
    } catch (error) {
      effectErrors.push(error);
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
    const visit = (
      value: RuntimeNode, scope: StructuralScope,
    ): RuntimeNode | null => {
      if (
        value == null || value === false || typeof value === "string" ||
        typeof value === "number"
      ) return value;
      if (Array.isArray(value)) {
        const arrayScope = structuralContainerScope(scope, "array");
        const regionId = getKeyedOwnerRegionId(value);
        if (regionId !== null) {
          regionCount++;
          if (this.#keyedOwnerReuseMode === "token") {
            const version = getKeyedOwnerVersion(value);
            const keyedRegion = previousOwnerCache.keyedRegion;
            if (
              regionCount !== 1 || version === null || !keyedRegion ||
              keyedRegion.regionId !== regionId ||
              keyedRegion.siteScope !== arrayScope.siteScope ||
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
            const childOwner = this.world.findOwner(parentOwner,
              scopedOwnerSite(siteId, arrayScope.siteScope), key);
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
            output.push(this.#cacheOutputView(childCache, true));
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
        for (let index = 0; index < value.length; index++) {
          const child = value[index]!;
          const expanded = visit(child, structuralChildPosition(arrayScope, index));
          if (expanded === null) return null;
          output.push(expanded);
          if (expanded !== child) changed = true;
        }
        return changed ? output : value;
      }
      if (typeof value.type === "function") return null;
      const child = visit(value.props.children,
        value.type === Fragment
          ? structuralFragmentScope(scope, value)
          : structuralHostScope(scope, value));
      if (child === null) return null;
      return child === value.props.children
        ? value
        : copyRuntimeElement(value.type, { ...value.props, children: child });
    };
    const result = visit(node, rootStructuralScope);
    if (result === null || regionCount !== 1 || reusedRows === 0) {
      this.#count("owner.keyed-region.fallback");
      return null;
    }
    return result;
  }

  #tryPartialOwnerCommits(owners: readonly OwnerId[]): boolean {
    if (this.#renderPreparation !== "repeatable") return false;
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
      const key = singleHostRootKey(this.#cacheOutputView(cached, true));
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
    const capturedPartialValues = new Map(
      ready.map((item) => [
        item.owner,
        this.#captureOwnerSourceValues(item.owner, item.propBoundSites),
      ]),
    );
    if (
      !this.#commitHostMutation(
        () => this.#vdom.commitKeyedRegions(regions),
        true,
      )
    ) {
      this.#abandonDirectHostMutation();
      this.#profile?.("dispatch.partial-bail.keyed-regions-rejected", 0);
      for (const item of ready) this.#preparedRenders.set(item.owner, item);
      return false;
    }
    try {
      for (const item of ready) {
        const cached = this.#componentCache.get(item.owner)!;
        this.#componentCache.set(item.owner, {
          ...cached,
          output: ordinaryOutput(item.result, item.result),
          subtreeOwners: new Set([item.owner]),
          ownEffects: item.ownEffects,
          propBoundSites: item.propBoundSites,
          numericStateAdmitted: item.numericStateAdmitted,
        });
        this.#syncOwnerSourceValues(
          item.owner,
          cached,
          item.propBoundSites,
          capturedPartialValues.get(item.owner),
        );
        this.#refreshDirectKeyedRegionOutput(item.owner);
        this.#preparedRenders.delete(item.owner);
      }
      this.#publishDirectHostMutation();
    } catch (error) {
      if (this.#directPublicationPending) this.#failDirectHostMutation(error);
      throw error;
    }
    const effectErrors: unknown[] = [];
    for (const item of ready) {
      effectErrors.push(
        ...this.#reconcileOwnerEffects(item.owner, item.ownEffects),
      );
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
    if (this.#disposed || this.#disposeRequested) return errors;
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
      if (this.#disposed || this.#disposeRequested) return errors;
    }
    for (const [key, registration] of registrationsToStart) {
      if (this.#disposed || this.#disposeRequested) break;
      let cleanup: void | EffectCleanup;
      try {
        cleanup = registration.setup();
      } catch (error) {
        errors.push(error);
        if (this.#disposed || this.#disposeRequested) break;
        cleanup = undefined;
      }
      // setup may synchronously dispose the root before it returns its cleanup.
      if (this.#disposed || this.#disposeRequested) {
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
    if (this.#disposed || this.#disposeRequested) return errors;
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
        if (this.#disposed || this.#disposeRequested) return errors;
      }
    }
    for (const [key, registration] of nextEffects) {
      if (this.#disposed || this.#disposeRequested) break;
      if (this.#liveEffects.has(key)) continue;
      let cleanup: void | EffectCleanup;
      try {
        cleanup = registration.setup();
      } catch (error) {
        errors.push(error);
        if (this.#disposed || this.#disposeRequested) break;
        cleanup = undefined;
      }
      if (this.#disposed || this.#disposeRequested) {
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

  #cacheOutputView(cache: ComponentCache, expanded: boolean): RuntimeNode {
    const counts: OwnedScalarOutputCounts | undefined = this.#activeCounters
      ? { frames: 0, rootMaterializations: 0, propMaterializations: 0 }
      : undefined;
    const value = cacheOutputView(cache, expanded, counts);
    if (counts) {
      this.#count("store.scalar-output.root-materializations", counts.rootMaterializations);
      this.#count("store.scalar-output.prop-materializations", counts.propMaterializations);
    }
    return value;
  }

  #compiledPropSitesForCache(owner: OwnerId, cache: ComponentCache): ReadonlySet<string> {
    if (cache.propBoundSites.size === 0) return emptyCompiledPropSites;
    if (!numericOwnerCacheAdmitted(cache) ||
      !this.world.ownerStateValuesArePrimitive(owner)) {
      return emptyCompiledPropSites;
    }
    const cached = this.#compiledPropSitesByCache.get(cache);
    if (cached) return cached;
    const metadata = typeof cache.type === "function"
      ? definedComponents.get(cache.type)?.metadata : undefined;
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

  #compiledOwnerSiteCertified(
    owner: OwnerId, cache: ComponentCache, site: string,
  ): boolean {
    if (!numericOwnerCacheAdmitted(cache) ||
      !this.world.ownerStateValuesArePrimitive(owner)) return false;
    const metadata = typeof cache.type === "function"
      ? definedComponents.get(cache.type)?.metadata : undefined;
    return metadata?.propOnlySites.includes(site) === true;
  }

  #refreshDirectKeyedRegionOutput(owner: OwnerId, sparseStore = false) {
    this.#refreshDirectKeyedRegionOutputForParent(owner,
      this.world.ownerLineage(owner)[1], sparseStore);
  }

  #refreshDirectKeyedRegionOutputForParent(
    owner: OwnerId, parentOwner: OwnerId | undefined, sparseStore = false,
  ) {
    if (sparseStore) this.#count("store.sparse.keyed-output-edge-visits");
    if (parentOwner === undefined) return;
    const parentCache = this.#componentCache.get(parentOwner);
    const keyedRegion = parentCache?.keyedRegion;
    const key = keyedRegion?.keysByOwner.get(owner);
    if (key === undefined || !keyedRegion) return;
    const childCache = this.#componentCache.get(owner);
    if (childCache) {
      keyedRegion.outputsByKey.set(key, this.#cacheOutputView(childCache, true));
    }
  }

  #syncCollectionRegions(
    caches: ReadonlyMap<OwnerId, ComponentCache>,
    collected: ReadonlyMap<string, CollectionRegionCache> = new Map(),
    retained: ReadonlyMap<string, CollectionRegionCache> = new Map(),
  ) {
    if (this.#disposed) return;
    const next = new Map<string, CollectionRegionCache>();
    for (const [owner, component] of caches) {
      const region = component.keyedRegion?.collection;
      if (!region) continue;
      const key = collectionRegionKey(owner, region.siteId, region.siteScope);
      next.set(key, region);
    }
    for (const [key, region] of retained) {
      if (caches.has(region.parentOwner) &&
        this.#liveCollectionRegions.get(key) === region) next.set(key, region);
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
      readonly selectedRegionKeys?: ReadonlySet<string>;
      readonly scopedStructural?: boolean;
      readonly scopedCells?: readonly StateCellHandle[];
      readonly scopedStores?: readonly AnyAsyncStore[];
      readonly scopedResourceOwners?: readonly OwnerId[];
      readonly resourceLease?: () => void;
      readonly acceptedCollections?: readonly (() => boolean)[];
      readonly acceptedResources?: ReadonlySet<AsyncResource<any>>;
      readonly acceptedCollectionFootprint?: readonly KeyedCollection<any>[];
      readonly renderPreparation?: "repeatable";
    },
  ): NativeRootCandidate<H, Parent> | null {
    const repeatable = this.#renderPreparation === "repeatable" ||
      options.renderPreparation === "repeatable";
    if (this.#pendingCollectionRegionKeys.size === 0 ||
      (!options.scopedStructural &&
        (this.#everReadResource || this.#everHadNativeBoundary))
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
      reader: NonNullable<CollectionRegionCache["reader"]>;
      parentCache: ComponentCache;
      ownerRegion: KeyedRegionCache;
      read: Extract<
        ReturnType<NonNullable<CollectionRegionCache["reader"]>["read"]>,
        { status: "available" }
      >;
      rows: Map<string, CandidateRow | null>;
      previousRows: Map<string, CandidateRow>;
      operations:
        import("./vdom_snapshot_runtime.ts").KeyedRegionDeltaOperation[];
      rowProgram?: ClosedCollectionRowProgram;
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
    let closedStoreOutputs: ClosedStoreOutputCut | null = null;
    const capturedBindings: Array<{
      binding: BoundValue<unknown>;
      sources: ScalarSource[];
      owner: OwnerId;
      sites: readonly string[];
    }> = [];
    const leafCaches = new Map<OwnerId, ComponentCache>();
    const leafPreviousCaches = new Map<OwnerId, ComponentCache>();
    const leafRegions: Array<{ key: string; tree: RuntimeNode }> = [];
    const numericWrites: MixedCandidateNumericWrite[] = [];
    const numericSources = new Set<ScalarSource>();
    const scopedCellWrites: RetainedCellWrite[] = [];
    const resourceStages: Array<{
      region: { key: string; tree: RuntimeNode };
      dependencies: ReadonlySet<AsyncResource<any>>;
      storeInputs: ReadonlySet<AnyAsyncStore>;
      pendingReaderIds: ReadonlySet<string>;
      current(): boolean;
      privateCurrent(): boolean;
      privatePreparedCurrent(): boolean;
      publish(): void;
      installSubscriptions(): void;
      runEffects(): unknown[];
      release(): void;
    }> = [];
    const scopedSources = new Set<ScalarSource>();
    const scopedHandles: StateCellHandle[] = [];
    const scopedVersions: number[] = [];
    const validateScopedCells = (afterHost: boolean) =>
      this.#validateRetainedCells(scopedCellWrites, afterHost);
    const hasScopedStoreReaderConflict = () => {
      if (!options.scopedStructural) return false;
      for (const owner of retiredOwners) {
        if (this.#ownerHasStoreReaders(owner)) return true;
      }
      return false;
    };
    const discardArtifacts = () => {
      try {
        preparation.discard();
      } finally {
        stores.discard();
        resourceReads?.discard();
        resourceReads = null;
        this.#discardUncommittedStoreRoots(stores);
        closedStoreOutputs?.release(); closedStoreOutputs = null;
        for (const stage of resourceStages) stage.release();
        resourceStages.length = 0;
      }
    };

    let preparedProgram:
      | import("./vdom_snapshot_runtime.ts").PreparedKeyedVDOMProgram
      | null = null;
    let committedProgram:
      | import("./vdom_snapshot_runtime.ts").PreparedKeyedVDOMProgram
      | null = null;
    let preparationFailed = false;
    let resourceWasRead = false;
    try {
      if (!options.scopedStructural &&
        this.#storeNotificationGeneration !== storeGenerationAtPrepare) {
        // Store notifications may have advanced since the caller captured its
        // generation; rebuild under the latest root-visible store cut.
        throw new SparseCandidateIneligible();
      }

      if (options.scopedStructural) {
        const captured = this.#captureRetainedCells(options.scopedCells ?? []);
        if (!captured) throw new SparseCandidateIneligible();
        scopedCellWrites.push(...captured.writes);
        for (const source of captured.sources) scopedSources.add(source);
        for (const write of scopedCellWrites) {
          scopedHandles.push(write.handle);
          scopedVersions.push(write.version);
        }
      }

      const storeChangePending = this.#storeNotificationGeneration !==
        this.#committedStoreNotificationGeneration;
      if (options.scopedStructural && (
        options.transitions.length > 0 || capturedChanges.length > 0 ||
        !options.selectedRegionKeys?.size
      )) throw new SparseCandidateIneligible();
      const regionKeys = options.selectedRegionKeys ?? (storeChangePending
        ? new Set(this.#liveCollectionRegions.keys())
        : new Set(this.#pendingCollectionRegionKeys));
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
          hasSiblingCollectionSite(this.#liveCollectionRegions.values(), region) ||
          ownerRegion.collection !== region || !region.parentHostKey ||
          region.requiresOwnerRender || !region.ownerInputsAdmitted ||
          (closedCollectionSitesFor(parentCache.type) !== undefined &&
            parentCache.collectionPropsOwned !== true) ||
          !collectionOwnerApiAdmitted(region, parentCache) ||
          !componentCodeCurrent(parentCache.type) ||
          (options.scopedStructural &&
            !this.#pendingCollectionRegionKeys.has(regionKey))
        ) {
          preparationFailed = true;
          break;
        }
        const read = region.reader.read();
        if (read.status !== "available") {
          preparationFailed = true;
          break;
        }
        const rowProgram = closedCollectionRowProgramFor(
          parentCache.type, region.siteId, region.componentSiteId,
        );
        if (collectionOwnerNeedsGenericRows(parentCache, read.batches) &&
          !rowProgram) {
          preparationFailed = true;
          break;
        }
        const stage: RegionStage = {
          key: regionKey,
          region,
          reader: region.reader,
          parentCache,
          ownerRegion,
          read,
          rows: new Map<string, CandidateRow | null>(),
          previousRows: new Map(),
          operations: [],
          ...(rowProgram ? { rowProgram } : {}),
        };
        stages.set(regionKey, stage);
      }
      if (preparationFailed || stages.size === 0) {
        throw new SparseCandidateIneligible();
      }
      if (!repeatable &&
        [...stages.values()].some((stage) =>
          stage.read.batches.some((batch) => batch.operations.some((operation) =>
            operation.type !== "move" && operation.type !== "remove" &&
              !stage.rowProgram
          )))) throw new SparseCandidateIneligible();
      if (options.scopedStructural) {
        for (const stage of stages.values()) {
          for (const batch of stage.read.batches) {
            if (batch.operations.some((operation) =>
              operation.type !== "move" && operation.type !== "remove"
            ) && !stage.rowProgram) throw new SparseCandidateIneligible();
          }
        }
      }

      const rowFor = (stage: RegionStage, key: string): CandidateRow | null => {
        if (stage.rows.has(key)) return stage.rows.get(key) ?? null;
        const node = stage.region.rows.get(key)?.node;
        const componentSiteId = stage.region.componentSiteId ??
          (node && typeof node === "object" && !Array.isArray(node) &&
              typeof node.type === "function"
            ? getComponentSiteId(node.type)
            : undefined);
        if (!node || !componentSiteId) return null;
        const owner = preparation.findOwner(
          stage.region.parentOwner,
          scopedOwnerSite(collectionOwnerSite(stage.region.siteId, componentSiteId),
            stage.region.siteScope),
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
        closedOutput?: RuntimeElement,
      ): CandidateRow | null => {
        if (
          typeof rendered.type !== "function" ||
          (stage.region.componentSiteId !== undefined &&
            getComponentSiteId(rendered.type) !== stage.region.componentSiteId)
        ) return null;
        const authoredKey = rendered.props.key;
        if (authoredKey != null && String(authoredKey) !== key) return null;
        const { key: _key, ref: _ref, ...props } = rendered.props;
        ownCompiledOwnerProps(rendered.type, rendered, props);
        const collectionPropsOwned = ownCollectionOwnerProps(
          rendered.type, rendered, props,
        );
        const priorCache = previous?.owner === owner ? previous.cache : undefined;
        const hostKeyScope = priorCache?.hostKeyScope ?? key;
        const scopeExplicitHostKeys = priorCache?.scopeExplicitHostKeys === true;
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
        const activeOwner: ActiveOwner = {
          world: preparation,
          owner,
          numericStateReadsPrimitive: true,
          collectionPropsOwned,
          collectionProps: props,
          collectionSites: closedCollectionSitesFor(rendered.type),
          stateLayout: numericOwnerPropsAdmitted(
            rendered.type, props, isRuntimeOwnedElement(rendered),
          )
            ? compiledStateLayoutFor(rendered.type) : undefined,
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
        };
        let result: RuntimeNode;
        if (closedOutput) {
          result = closedOutput;
        } else {
          activeOwners.push(activeOwner);
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
        }
        if (resourceWasRead) return null;
        result = carryHostKeys(
          result, hostKeyScope, "0", undefined, scopeExplicitHostKeys, owner,
        );
        const hostKey = singleHostRootKey(result);
        if (hostKey === null || hasNestedComponent(result)) return null;
        const cache: ComponentCache = {
          type: rendered.type,
          hostKeyScope,
          scopeExplicitHostKeys,
          collectionPropsOwned,
          props,
          numericPropsAdmitted: numericOwnerPropsAdmitted(
            rendered.type, props, isRuntimeOwnedElement(rendered),
          ),
          numericStateAdmitted: activeOwner.numericStateReadsPrimitive,
          collectionEntry: canonicalCollectionEntry(stage.region.collection, key),
          output: ordinaryOutput(result, result),
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
              if (options.scopedStructural &&
                previous.cache.subtreeOwners.size !== 1
              ) throw new SparseCandidateIneligible();
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
              if (!repeatable && !stage.rowProgram) {
                throw new SparseCandidateIneligible();
              }
              const program = stage.rowProgram;
              if (program && previous && (
                previous.cache.type !== program.rowComponent ||
                previous.cache.subtreeOwners.size !== 1 ||
                previous.cache.ownEffects.size !== 0 ||
                previous.cache.propBoundSites.size !== 0 ||
                this.#ownerHasStoreReaders(previous.owner)
              )) throw new SparseCandidateIneligible();
              const inputs = program
                ? captureClosedCollectionRowInputs(program, operation.value)
                : null;
              const closedOutput = program && inputs
                ? evaluateClosedCollectionRowProgram(program, inputs)
                : undefined;
              if (program && !closedOutput) throw new SparseCandidateIneligible();
              const rendered = program
                ? copyRuntimeElement(program.rowComponent as ComponentType,
                  { [program.rowProp]: operation.value })
                : stage.region.renderRow(operation.value);
              if (
                !rendered || Array.isArray(rendered) ||
                typeof rendered !== "object" ||
                typeof rendered.type !== "function"
              ) throw new SparseCandidateIneligible();
              const componentSiteId = getComponentSiteId(rendered.type);
              const ownerSite = scopedOwnerSite(collectionOwnerSite(
                stage.region.siteId,
                componentSiteId,
              ), stage.region.siteScope);
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
                closedOutput ?? undefined,
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
                  tree: this.#cacheOutputView(candidate.cache, true),
                }
                : {
                  type: "replace" as const,
                  key: candidate.hostKey,
                  tree: this.#cacheOutputView(candidate.cache, true),
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
      if (!options.scopedStructural) for (const readerId of this.#liveStoreReaders.keys()) {
        const split = readerId.indexOf("\u0000");
        if (split <= 0) throw new SparseCandidateIneligible();
        const owner = Number(readerId.slice(0, split));
        if (!Number.isSafeInteger(owner)) throw new SparseCandidateIneligible();
        const ids = readerOwners.get(owner) ?? [];
        ids.push(readerId);
        readerOwners.set(owner, ids);
      }
      if (!options.scopedStructural) {
        // Resolve only store-reader owners through the reverse index, keeping work
        // proportional to participating readers.
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

        // Fold touched collection readers into that region; other store readers must be
        // independent host leaves.
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
              if (!repeatable) {
                throw new SparseCandidateIneligible();
              }
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
                  tree: this.#cacheOutputView(prepared.cache, true),
                })
              ) throw new SparseCandidateIneligible();
              stage.rows.set(rowLocation.key, prepared);
              for (const id of ids) affectedReaderIds.add(id);
            } else {
              if (!storeChangePending) continue;
              const cache = this.#componentCache.get(owner);
              const metadata = cache && typeof cache.type === "function"
                ? definedComponents.get(cache.type)?.metadata : undefined;
              if (
                !cache || cache.nativeBoundary ||
                metadata?.hostLeafOutput !== true ||
                cache.subtreeOwners.size !== 1 || hasNestedComponent(this.#cacheOutputView(cache, false))
              ) throw new SparseCandidateIneligible();
              const key = singleHostRootKey(this.#cacheOutputView(cache, true));
              if (!key) throw new SparseCandidateIneligible();
              this.#count("owner.component-visits");
              if (!repeatable) {
                throw new SparseCandidateIneligible();
              }
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
                output: ordinaryOutput(prepared.result, prepared.result),
                ownEffects: prepared.ownEffects,
                propBoundSites: prepared.propBoundSites,
                numericStateAdmitted: prepared.numericStateAdmitted,
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
      }

      const touchedOldOwners = new Set([...retiredOwners, ...renderedOwners]);
      for (const change of capturedChanges) {
        if (touchedOldOwners.has(change.owner)) continue;
        const cache = this.#componentCache.get(change.owner);
        const source = this.world.scalarSourceForChange(change);
        const approvedSites = cache
          ? this.#compiledPropSitesForCache(change.owner, cache)
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
        numericWrites.push({
          owner: change.owner,
          site: change.site,
          source,
          version: change.version,
          previous,
          current: source.value,
          change,
        });
      }
      const validateNumericWrites = () =>
        numericWrites.every((write) =>
          this.world.versionForChange(write.change) === write.version &&
          this.world.scalarSource(write.owner, write.site) === write.source &&
          Object.is(write.source.value, write.current)
        );
      const validatePostHostNumericWrites = () =>
        numericWrites.every((write) =>
          this.world.scalarSource(write.owner, write.site) === write.source &&
          this.world.version(write.owner, write.site) >= write.version &&
          (this.world.version(write.owner, write.site) > write.version ||
            Object.is(write.source.value, write.current))
        );

      if (resourceWasRead || preparation.hasStateWrites()) {
        throw new SparseCandidateIneligible();
      }
      if (hasScopedStoreReaderConflict()) throw new SparseCandidateIneligible();
      const scopedClosedRowOwners = options.scopedStructural &&
        [...renderedOwners].every((owner) => {
          const location = rowsByOwner.get(owner);
          return location?.stage.rowProgram !== undefined &&
            location.stage.rows.get(location.key)?.owner === owner;
        }) && [...privateOwners].every((owner) => renderedOwners.has(owner));
      if (options.scopedStructural && (
        leafRegions.length > 0 || leafCaches.size > 0 ||
        numericWrites.length > 0 || !scopedClosedRowOwners
      )) throw new SparseCandidateIneligible();
      if (options.scopedStructural && scopedCellWrites.some(({ handle }) =>
        retiredOwners.has(handle.owner)
      )) throw new SparseCandidateIneligible();
      if (options.scopedResourceOwners?.length) {
        for (const owner of options.scopedResourceOwners) {
          const stage = this.#stageBoundaryReveal(
            owner, preparation, stores, resourceReads!, options.resourceLease,
          );
          if (!stage) throw new SparseCandidateIneligible();
          resourceStages.push(stage);
        }
      }
      const scopedMixedWrites = scopedCellWrites.filter(({ handle }) => {
        const cache = this.#componentCache.get(handle.owner);
        const host = typeof cache?.type === "function"
          ? definedComponents.get(cache.type)?.metadata?.closedStoreHostProgram
          : undefined;
        return host?.schemaVersion === 7 && host.stateSites.includes(handle.site);
      });
      if (options.scopedStructural &&
        ((options.scopedStores?.length ?? 0) > 0 || scopedMixedWrites.length > 0)) {
        const newlyStaged = new Set(resourceStages.flatMap((stage) =>
          [...stage.storeInputs]));
        const pendingReaderIds = new Set(resourceStages.flatMap((stage) =>
          [...stage.pendingReaderIds]));
        closedStoreOutputs = this.#stageClosedStoreOutputs(
          options.scopedStores ?? [], stores, false, newlyStaged, pendingReaderIds,
          options.resourceLease, scopedMixedWrites,
        );
      }
      if (options.scopedStructural && closedStoreOutputs &&
        [...closedStoreOutputs.owners].some((owner) =>
          retiredOwners.has(owner) || renderedOwners.has(owner))
      ) throw new SparseCandidateIneligible();
      const deltas = [...stages.values()].filter((stage) =>
        stage.operations.length > 0
      ).map((stage) => ({
        parentKey: stage.region.parentHostKey!,
        regionId: stage.region.siteId,
        operations: stage.operations,
      }));
      if (options.scopedStructural && (scopedCellWrites.length > 0 ||
        (closedStoreOutputs?.regions.length ?? 0) > 0 ||
        resourceStages.length > 0)) {
        const joint = this.#vdom.prepareScopedKeyedRetainedAndStoreDeltas(
          deltas,
          scopedCellWrites.filter(({ handle }) =>
            !closedStoreOutputs?.owners.has(handle.owner)).map(
            ({ source, value }) => [source, value] as const),
          closedStoreOutputs?.regions ?? [],
          resourceStages.map(({ region }) => region),
          closedStoreOutputs?.scalarPlans,
        );
        if (!joint || joint.readSources.some((source) =>
          !scopedSources.has(source)
        )) throw new SparseCandidateIneligible();
        closedStoreOutputs?.setScalarSuccessors(joint.storeScalarPlans);
        preparedProgram = joint;
      } else {
        preparedProgram = this.#vdom.prepareKeyedRegionDeltas(
          deltas,
          leafRegions,
          options.scopedStructural ? { scoped: true } : undefined,
        );
      }
      if (!preparedProgram) throw new SparseCandidateIneligible();
      if (options.scopedStructural && !preparedProgram.scoped) {
        throw new SparseCandidateIneligible();
      }
      const capturedMixedValues = new Map<OwnerId, Map<string, number>>();
      const captureMixedValues = (owner: OwnerId, cache: ComponentCache) => {
        for (const site of cache.propBoundSites) {
          const source = preparation.scalarSource(owner, site);
          if (!source) continue;
          let sites = capturedMixedValues.get(owner);
          if (!sites) capturedMixedValues.set(owner, sites = new Map());
          sites.set(site, source.value);
        }
      };
      for (const [owner, cache] of leafCaches) captureMixedValues(owner, cache);
      if (!options.scopedStructural) for (const stage of stages.values()) {
        for (const row of stage.rows.values()) {
          if (row) captureMixedValues(row.owner, row.cache);
        }
      }

      const touchedCollections = [...stages.values()];
      let collectionAcknowledgements: Array<() => boolean> = [];
      const validateCollections = () =>
        touchedCollections.every((stage) =>
          collectionOwnerApiAdmitted(stage.region, stage.parentCache) &&
          stage.region.collection.version === stage.read.toVersion
        );
      const validatePostHostCollections = () =>
        touchedCollections.every((stage) =>
          collectionOwnerApiAdmitted(stage.region, stage.parentCache) &&
          stage.region.collection.version >= stage.read.toVersion
        );
      const validatePostHostCollectionsCanonical = () =>
        touchedCollections.every((stage) => {
          const version = canonicalCollectionVersion(stage.region.collection);
          return collectionOwnerApiAdmitted(stage.region, stage.parentCache) &&
            (version === null || version >= stage.read.toVersion);
        });
      const validateScopedCachePrivate = () => !options.scopedStructural ||
        !hasScopedStoreReaderConflict() &&
        touchedCollections.every((stage) =>
          this.#liveCollectionRegions.get(stage.key) === stage.region &&
          stage.region.reader === stage.reader &&
          this.#componentCache.get(stage.region.parentOwner) === stage.parentCache &&
          componentCodeCurrentPrivate(stage.parentCache.type) &&
          stage.parentCache.keyedRegion === stage.ownerRegion &&
          [...stage.previousRows.values()].every((row) =>
            this.#componentCache.get(row.owner) === row.cache &&
            canonicalWorldIsAlive.call(this.world, row.owner)
          )
        );
      const validateScopedCache = () => validateScopedCachePrivate() &&
        (options.acceptedCollections?.every((validate) => validate()) ?? true) &&
        touchedCollections.every((stage) =>
          componentCodeCurrent(stage.parentCache.type)
        );
      let admittedBindings: ScalarSource[][] | null = null;
      const artifactsReleased = { value: false };
      const releaseArtifacts = () => {
        if (artifactsReleased.value) return;
        artifactsReleased.value = true;
        admittedBindings = null;
        preparedProgram?.discard();
        preparedProgram = null;
        committedProgram = null;
        resourceReads?.discard();
        resourceReads = null;
        for (const stage of stages.values()) {
          stage.rows.clear();
          stage.previousRows.clear();
          stage.operations.length = 0;
        }
        stages.clear();
        collectionAcknowledgements = [];
        rowsByOwner.clear();
        capturedBindings.length = 0;
        leafCaches.clear();
        leafPreviousCaches.clear();
        leafRegions.length = 0;
        numericWrites.length = 0;
        numericSources.clear();
        scopedCellWrites.length = 0;
        scopedSources.clear();
        scopedHandles.length = 0;
        scopedVersions.length = 0;
        closedStoreOutputs?.release(); closedStoreOutputs = null;
        for (const stage of resourceStages) stage.release();
        resourceStages.length = 0;
        privateOwners.clear();
        retiredOwners.clear();
        renderedOwners.clear();
      };
      const capturedCodeRevisions = captureCodeRevisions([
        ...leafCaches.values(),
        ...[...stages.values()].flatMap((stage) =>
          [...stage.rows.values(), ...stage.previousRows.values()]
            .flatMap((row) => row ? [row.cache] : [])
        ),
      ]);
      const acceptedCollectionVersions = (options.acceptedCollectionFootprint ?? [])
        .map((collection) => [collection, canonicalCollectionVersion(collection)] as const);
      const acceptedResourceVersions = [...(options.acceptedResources ?? [])]
        .map((resource) => [resource, canonicalResourceVersion(resource)] as const);
      const validateAdmittedBindings = () => {
        admittedBindings = prepareAdmittedBindings(capturedBindings,
          (owner, site) => privateOwners.has(owner)
            ? preparation.scalarSource(owner, site)
            : canonicalWorldIsAlive.call(this.world, owner)
            ? canonicalWorldScalarSource.call(this.world, owner, site) : null);
        if (admittedBindings === null) {
          throw new UnsupportedGroupOpaqueFreshnessError("binding");
        }
        return true;
      };
      const validateMixedPreparedPrivate = () => {
        return (!options.resourceLease ||
            this.#publicationIntents.has(options.resourceLease)) &&
          !this.#resourceHoldWait(new Set([
            ...acceptedResourceVersions.map(([resource]) => resource),
            ...resourceStages.flatMap((stage) => [...stage.dependencies]),
            ...(closedStoreOutputs?.inputResources ?? []),
          ]), options.resourceLease, {
            cells: [...scopedHandles, ...(closedStoreOutputs?.inputCells ?? [])],
            stores: [...(options.scopedStores ?? []),
              ...resourceStages.flatMap((stage) => [...stage.storeInputs]),
              ...(closedStoreOutputs?.inputStores ?? [])],
            collections: [...touchedCollections.map((stage) => stage.region.collection),
              ...acceptedCollectionVersions.map(([collection]) => collection)],
          }) &&
          (options.scopedStructural ||
            this.#storeNotificationGeneration === storeGenerationAtPrepare) &&
          preparation.validate() && !preparation.hasStateWrites() &&
          stores.validatePreparedCanonical() &&
          numericWrites.every((write) =>
            canonicalWorldIsAlive.call(this.world, write.owner) &&
            canonicalWorldVersion.call(this.world, write.owner, write.site) === write.version &&
            canonicalWorldScalarSource.call(this.world, write.owner, write.site) === write.source &&
            capturedScalarCurrent(write.source, write.current)
          ) &&
          touchedCollections.every((stage) =>
            canonicalCollectionCutCurrent(stage.region.collection, stage.read.toVersion)
          ) && validateScopedCachePrivate() &&
          (resourceReads ? canonicalResourceCutCurrent(resourceReads) : false) &&
          (preparedProgram?.validatePreparedPrivate() ?? false) &&
          this.#validateRetainedCellsPrivate(scopedCellWrites) &&
          resourceStages.every((stage) => stage.privatePreparedCurrent()) &&
          (closedStoreOutputs?.privatePreparedCurrent() ?? true) &&
          acceptedCollectionVersions.every(([collection, version]) =>
            canonicalCollectionCutCurrent(collection, version)
          ) && acceptedResourceVersions.every(([resource, version]) =>
            canonicalResourceVersionCurrent(resource, version)
          ) && cacheCodeCurrentPrivate(leafCaches.values()) &&
          [...stages.values()].every((stage) =>
            componentCodeCurrentPrivate(stage.parentCache.type) &&
            [...stage.rows.values(), ...stage.previousRows.values()].every((row) =>
              !row || componentCodeCurrentPrivate(row.cache.type)
            )
          ) && codeRevisionsCurrent(capturedCodeRevisions) &&
          validateAdmittedBindings();
      };
      return this.#createCandidateLifecycle({
        baseVersion,
        baseVDOMVersion,
        scope: options.scopedStructural
          ? { kind: "keyed", versionDelta: preparedProgram.structuralVersionDelta }
          : undefined,
        stores,
        transitions: options.transitions,
        pendingResources: [],
        blocked: false,
        permitPendingDirectIntent: () => !!options.resourceLease &&
          this.#publicationIntents.has(options.resourceLease),
        admissionCurrent: () => (!options.resourceLease ||
          this.#publicationIntents.has(options.resourceLease)) &&
          !this.#resourceHoldWait(new Set([
            ...(options.acceptedResources ?? []),
            ...resourceStages.flatMap((stage) => [...stage.dependencies]),
          ]), options.resourceLease, {
            cells: [...scopedHandles, ...(closedStoreOutputs?.inputCells ?? [])],
            stores: [...(options.scopedStores ?? []),
              ...resourceStages.flatMap((stage) => [...stage.storeInputs]),
              ...(closedStoreOutputs?.inputStores ?? [])],
            collections: [...touchedCollections.map((stage) => stage.region.collection),
              ...(options.acceptedCollectionFootprint ?? [])],
          }) && !this.#resourceHoldWait(
            new Set(closedStoreOutputs?.inputResources ?? []),
            options.resourceLease) &&
          (!options.resourceLease || this.#publicationIntents.has(options.resourceLease)),
        codeCurrent: () => cacheCodeCurrent(leafCaches.values()) &&
          validateScopedCache() &&
          resourceStages.every((stage) => stage.current()) &&
          scopedCellWrites.every(({ handle }) => {
            const cache = this.#componentCache.get(handle.owner);
            return cache !== undefined && componentCodeCurrent(cache.type);
          }) &&
          touchedCollections.every((stage) =>
            [...stage.rows.values(), ...stage.previousRows.values()].every((row) =>
              !row || componentCodeCurrent(row.cache.type)
            )
          ),
        validatePrepared: () =>
          (options.scopedStructural ||
            this.#storeNotificationGeneration === storeGenerationAtPrepare) &&
          preparation.validate() && !preparation.hasStateWrites() &&
          stores.validate() && validateNumericWrites() &&
          validateCollections() &&
          validateScopedCache() &&
          (resourceReads?.validate() ?? false) &&
          resourceStages.every((stage) => stage.current()) &&
          (preparedProgram?.validate() ?? false) &&
          preparation.validate() && validateScopedCells(false) &&
          (closedStoreOutputs?.current() ?? true) && stores.validate(),
        validatePreparedPrivate: validateMixedPreparedPrivate,
        validatePostHost: () =>
          preparation.validatePublicationInputs() &&
          !preparation.hasStateWrites() &&
          stores.validatePublicationInputs() &&
          validatePostHostNumericWrites() &&
          validatePostHostCollections() &&
          validateScopedCache() &&
          (!options.scopedStructural ||
            committedProgram?.validatePostHost() === true) &&
          (resourceReads?.validate() ?? false) &&
          resourceStages.every((stage) => stage.current()) &&
          preparation.validatePublicationInputs() && validateScopedCells(true) &&
          (closedStoreOutputs?.postHostCurrent() ?? true) && stores.validatePublicationInputs(),
        finalGroupCurrent: () =>
          preparation.validatePublicationInputs() &&
          !preparation.hasStateWrites() &&
          stores.validatePublicationInputsCanonical() &&
          validatePostHostNumericWrites() &&
          validatePostHostCollectionsCanonical() &&
          validateScopedCachePrivate() &&
          (!options.scopedStructural ||
            committedProgram?.validatePostHostPrivate() === true) &&
          (resourceReads?.validateCanonical() ?? false) &&
          resourceStages.every((stage) => stage.privateCurrent()) &&
          validateScopedCells(true) &&
          (closedStoreOutputs?.postHostPrivateCurrent() ?? true) &&
          cacheCodeCurrentPrivate(leafCaches.values()) &&
          codeRevisionsCurrent(capturedCodeRevisions),
        preparePublication: () => {
          preparation.preparePublicationAfterHost();
          stores.preparePublicationAfterHost();
          collectionAcknowledgements = touchedCollections.map((stage) => {
            const acknowledge = stage.region.reader &&
              prepareCollectionReaderAcknowledgement(
                stage.region.reader,
                stage.read.toVersion,
              );
            if (!acknowledge) {
              throw new Error("Collection reader cannot accept captured publication");
            }
            return acknowledge;
          });
        },
        commitHost: () => {
          preparation.beginHostApplication();
          for (const item of capturedBindings) {
            const canonical = item.sites.map((site, index) =>
              privateOwners.has(item.owner)
                ? preparation.scalarSource(item.owner, site) ??
                  item.sources[index]
                : this.world.scalarSource(item.owner, site) ??
                  item.sources[index]
            );
            if (rebindCapturedBindingSources(item.binding, canonical)) continue;
            const mutable = item.binding.sources as ScalarSource[] | undefined;
            if (mutable) {
              for (let index = 0; index < canonical.length; index++) {
                mutable[index] = canonical[index];
              }
            }
            (item.binding as { source: ScalarSource }).source = canonical[0];
          }
          committedProgram = preparedProgram;
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
        commitHostAdmitted: () => {
          preparation.beginHostApplication();
          applyAdmittedBindings(capturedBindings, admittedBindings ?? []);
          committedProgram = preparedProgram;
          preparedProgram!.commitAdmitted();
          preparedProgram = null;
          this.#applyCandidateNumericWrites(numericWrites);
          if (numericWrites.length > 0) {
            this.#count("numeric.candidate-batches");
            this.#count("numeric.candidate-source-updates", numericWrites.length);
          }
        },
        publish: () => {
          preparation.publishAccepted();
          stores.publishAccepted();
          for (let index = 0; index < collectionAcknowledgements.length; index++) {
            if (collectionAcknowledgements[index]()) {
              this.#pendingCollectionRegionKeys.delete(touchedCollections[index].key);
            }
          }
          collectionAcknowledgements = [];
          for (const [owner, cache] of leafCaches) {
            this.#componentCache.set(owner, cache);
          }
          for (const stage of stages.values()) {
            for (const [key, candidate] of stage.rows) {
              if (!candidate) {
                const previous = stage.previousRows.get(key);
                if (options.scopedStructural && previous) {
                  this.#retireOwnerAccepted(previous.owner);
                }
                stage.region.rows.delete(key);
                stage.region.hostKeysByCollectionKey.delete(key);
                stage.ownerRegion.outputsByKey.delete(key);
                if (previous) {
                  stage.ownerRegion.keysByOwner.delete(previous.owner);
                }
                continue;
              }
              stage.region.rows.set(key, {
                node: candidate.node,
                entry: candidate.cache.collectionEntry,
              });
              stage.region.hostKeysByCollectionKey.set(key, candidate.hostKey);
              const previous = stage.previousRows.get(key);
              this.#componentCache.set(candidate.owner, candidate.cache);
              if (!this.#liveOwners.has(candidate.owner)) {
                this.#count("owner.created");
              }
              this.#liveOwners.add(candidate.owner);
              for (
                const ancestor of canonicalWorldOwnerLineage.call(this.world, candidate.owner)
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
                this.#cacheOutputView(candidate.cache, true),
              );
              stage.ownerRegion.keysByOwner.set(candidate.owner, key);
              if (previous && previous.owner !== candidate.owner) {
                stage.ownerRegion.keysByOwner.delete(previous.owner);
              }
              if (previous && previous.owner === candidate.owner &&
                !options.scopedStructural) {
                this.#syncOwnerSourceValues(
                  candidate.owner,
                  previous.cache,
                  candidate.cache.propBoundSites,
                  capturedMixedValues.get(candidate.owner),
                );
              } else if (!previous || previous.owner !== candidate.owner) {
                for (const site of candidate.cache.propBoundSites) {
                  const source = this.world.scalarSource(candidate.owner, site);
                  if (source) {
                    this.#lastSourceValues.set(
                      source,
                      capturedMixedValues.get(candidate.owner)?.get(site) ??
                        source.value,
                    );
                  }
                }
              }
            }
            for (
              const ancestor of canonicalWorldOwnerLineage.call(
                this.world, stage.region.parentOwner,
              )
            ) {
              const cache = this.#componentCache.get(ancestor);
              if (!cache) continue;
              const keyedRegion = cache.keyedRegion
                ? { ...cache.keyedRegion, version: createKeyedOwnerVersion() }
                : undefined;
              if (!options.scopedStructural &&
                keyedRegion?.collection !== stage.region && keyedRegion) {
                keyedRegion.outputsByKey.clear();
                keyedRegion.keysByOwner.clear();
              }
              this.#componentCache.set(ancestor, {
                ...cache,
                output: ordinaryOutput(null, null),
                invalidatedByCollection: true,
                ...(keyedRegion ? { keyedRegion } : {}),
              });
            }
          }
          for (const stage of resourceStages) stage.publish();
          closedStoreOutputs?.publish();
          for (const [owner, cache] of leafCaches) {
            const previous = leafPreviousCaches.get(owner);
            if (previous) {
              this.#syncOwnerSourceValues(
                owner,
                previous,
                cache.propBoundSites,
                capturedMixedValues.get(owner),
              );
            }
            this.#refreshDirectKeyedRegionOutput(owner, true);
          }
          for (const write of numericWrites) {
            this.#lastSourceValues.set(write.source, write.current);
          }
          for (const write of scopedCellWrites) {
            this.#lastSourceValues.set(write.source, write.value);
          }
          resourceReads?.discard();
          resourceReads = null;
          if (capturedChanges.length > 0) {
            this.world.clearChangesThrough(capturedChanges);
            this.#pendingChanges.clearThrough(capturedChanges);
          }
          if (scopedCellWrites.length > 0) {
            canonicalWorldClearCellChangesThrough.call(this.world,
              scopedHandles, scopedVersions, scopedHandles.length,
            );
            this.#pendingChanges.clearNativeThrough(
              scopedHandles, scopedVersions, scopedHandles.length,
            );
          }
          if (!options.scopedStructural) {
            this.#committedStoreNotificationGeneration = storeGenerationAtPrepare;
          }
          this.#publicationVersion++;
        },
        installSubscriptions: () => {
          if (options.scopedStructural) {
            for (const stage of resourceStages) stage.installSubscriptions();
            if (stores.closedInputsChanged()) {
              this.#storeNotificationGeneration++;
              this.#schedule();
            }
            return [];
          }
          try {
            this.#syncStoreReaders(stores);
            return [];
          } catch (error) {
            return [error];
          }
        },
        runEffects: () => {
          const errors: unknown[] = [];
          try {
            preparation.notifyPublished();
          } catch (error) {
            errors.push(error);
          }
          if (!options.scopedStructural || closedStoreOutputs ||
            resourceStages.length > 0) {
            try {
              stores.notifyPublished();
            } catch (error) {
              errors.push(error);
            }
          }
          try {
            this.#vdom.flushRefs();
          } catch (error) {
            errors.push(error);
          }
          // Match the full candidate lifecycle: retired owners clean up before
          // replacement effects publish any same-key external registrations.
          for (const owner of retiredOwners) {
            if (options.scopedStructural) {
              errors.push(...this.#reconcileOwnerEffects(owner, new Map()));
            } else this.#retireCollectionRow(owner, errors);
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
          for (const stage of resourceStages) {
            errors.push(...stage.runEffects());
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
      privateOwners.clear();
      retiredOwners.clear();
      renderedOwners.clear();
      if (
        error instanceof HeldPublicationWait
      ) return this.#prepareBlockedPublication([error.resource]);
      if (
        error instanceof SparseCandidateIneligible || preparationFailed ||
        resourceWasRead
      ) return null;
      throw error;
    }
  }

  #flushCollectionDelta(): boolean | "closed-row" {
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
      hasSiblingCollectionSite(this.#liveCollectionRegions.values(), region) ||
      ownerRegion.collection !== region || parentHostKey === null ||
      region.requiresOwnerRender || !region.ownerInputsAdmitted ||
      (closedCollectionSitesFor(parentCache.type) !== undefined &&
        parentCache.collectionPropsOwned !== true) ||
      !collectionOwnerApiAdmitted(region, parentCache) ||
      !componentCodeCurrent(parentCache.type)
    ) return false;

    const read = region.reader.read();
    if (read.status !== "available") {
      this.#count("collection.delta.reader-expired");
      return false;
    }
    if (collectionOwnerNeedsGenericRows(parentCache, read.batches)) {
      return closedCollectionRowProgramFor(
        parentCache.type, region.siteId, region.componentSiteId,
      ) ? "closed-row" : false;
    }
    if (this.#renderPreparation !== "repeatable" &&
      read.batches.some((batch) => batch.operations.some((operation) =>
        operation.type !== "move" && operation.type !== "remove"
      ))) return false;
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
      const node = region.rows.get(key)?.node;
      const componentSiteId = region.componentSiteId ??
        (node && typeof node === "object" && !Array.isArray(node) &&
            typeof node.type === "function"
          ? getComponentSiteId(node.type)
          : undefined);
      if (!componentSiteId) return null;
      const owner = this.world.findOwner(
        region.parentOwner,
        scopedOwnerSite(collectionOwnerSite(region.siteId, componentSiteId),
          region.siteScope),
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
              scopedOwnerSite(collectionOwnerSite(region.siteId, componentSiteId),
                region.siteScope),
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
      const ownerSiteId = scopedOwnerSite(collectionOwnerSite(
        region.siteId,
        rowComponentSiteId,
      ), region.siteScope);
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
      ownCompiledOwnerProps(rendered.type, rendered, props);
      const collectionPropsOwned = ownCollectionOwnerProps(
        rendered.type, rendered, props,
      );
      const priorCache = !staged && existingOwner !== undefined
        ? this.#componentCache.get(existingOwner)
        : undefined;
      const hostKeyScope = priorCache?.hostKeyScope ?? key;
      const scopeExplicitHostKeys = priorCache?.scopeExplicitHostKeys === true;
      const ownEffects = new Map<string, EffectRegistration>();
      const propBoundSites = new Set<string>();
      const storeTransaction = new StoreRenderTransaction(this.#rootId);
      const activeOwner: ActiveOwner = {
        world: this.world,
        owner,
        numericStateReadsPrimitive: true,
        collectionPropsOwned,
        collectionProps: props,
        collectionSites: closedCollectionSitesFor(rendered.type),
        stateLayout: numericOwnerPropsAdmitted(
          rendered.type, props, isRuntimeOwnedElement(rendered),
        )
          ? compiledStateLayoutFor(rendered.type) : undefined,
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
      };
      activeOwners.push(activeOwner);
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
      result = carryHostKeys(
        result, hostKeyScope, "0", undefined, scopeExplicitHostKeys, owner,
      );
      const hostKey = singleHostRootKey(result);
      if (hostKey === null || hasNestedComponent(result)) return null;
      const cache: ComponentCache = {
        type: rendered.type,
        hostKeyScope,
        scopeExplicitHostKeys,
        collectionPropsOwned,
        props,
        numericPropsAdmitted: numericOwnerPropsAdmitted(
          rendered.type, props, isRuntimeOwnedElement(rendered),
        ),
        numericStateAdmitted: activeOwner.numericStateReadsPrimitive,
        collectionEntry: canonicalCollectionEntry(region.collection, key),
        output: ordinaryOutput(result, result),
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
            if (row.cache.subtreeOwners.size !== 1 ||
              this.#ownerHasStoreReaders(row.owner)) {
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
            if (previous && (previous.cache.subtreeOwners.size !== 1 ||
              this.#ownerHasStoreReaders(previous.owner))) {
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
                  tree: this.#cacheOutputView(candidate.cache, true),
                }
                : {
                  type: "replace",
                  key: candidate.hostKey,
                  tree: this.#cacheOutputView(candidate.cache, true),
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
      !collectionOwnerApiAdmitted(region, parentCache) ||
      region.collection.version !== read.toVersion ||
      this.#storeNotificationGeneration !== storeGenerationAtPrepare ||
      this.#pendingChanges.size > 0
    ) {
      discardCandidate();
      this.#count("collection.delta.stale-candidate");
      return false;
    }
    const capturedDeltaValues = new Map<OwnerId, Map<string, number>>();
    for (const candidate of overlay.values()) {
      if (!candidate) continue;
      for (const site of candidate.cache.propBoundSites) {
        const source = this.world.scalarSource(candidate.owner, site);
        if (!source) continue;
        let sites = capturedDeltaValues.get(candidate.owner);
        if (!sites) capturedDeltaValues.set(candidate.owner, sites = new Map());
        sites.set(site, source.value);
      }
    }
    if (!prepareCollectionReaderAcknowledgement(region.reader, read.toVersion)) {
      discardCandidate();
      return false;
    }
    let deltaCommitted: boolean;
    try {
      deltaCommitted = this.#commitHostMutation(
        () =>
          this.#vdom.commitKeyedRegionDelta(
            parentHostKey,
            region.siteId,
            operations,
          ),
        true,
      );
    } catch (error) {
      discardCandidate();
      throw error;
    }
    if (!deltaCommitted) {
      this.#abandonDirectHostMutation();
      discardCandidate();
      return false;
    }
    const effectErrors: unknown[] = [];
    const deferredEffects: Array<() => void> = [];
    try {
      if (!collectionOwnerApiAdmitted(region, parentCache)) {
        throw new Error("Collection public API changed during host application");
      }
      const acknowledge = prepareCollectionReaderAcknowledgement(
        region.reader,
        read.toVersion,
      );
      if (!acknowledge) {
        throw new Error("Collection reader cannot accept captured publication");
      }
      if (!this.world.isAlive(region.parentOwner)) {
        throw new Error("Collection parent was removed during host application");
      }
      for (const previous of originalRows.values()) {
        if (!this.world.isAlive(previous.owner)) {
          throw new Error("Collection owner was removed during host application");
        }
      }
      const activations = new Map<OwnerId, () => void>();
      for (const candidate of overlay.values()) {
        if (!candidate) continue;
        if (!this.world.isAlive(candidate.owner) || !componentCodeCurrent(candidate.cache.type)) {
          throw new Error("Collection owner changed during host application");
        }
        if (candidate.staged) {
          activations.set(candidate.owner, this.world.prepareStagedOwnerActivation(
            candidate.owner,
            candidate.previousOwner,
          ));
        }
      }
      acknowledge();

      for (const [key, candidate] of overlay) {
        const previous = originalRows.get(key);
        if (candidate === null) {
          if (previous) {
            this.#retireCollectionRow(
              previous.owner,
              effectErrors,
              deferredEffects,
            );
          }
          region.rows.delete(key);
          region.hostKeysByCollectionKey.delete(key);
          ownerRegion.outputsByKey.delete(key);
          if (previous) ownerRegion.keysByOwner.delete(previous.owner);
          continue;
        }
        if (candidate.staged) {
          activations.get(candidate.owner)!();
          if (candidate.previousOwner !== undefined) {
            this.#retireCollectionRow(
              candidate.previousOwner,
              effectErrors,
              deferredEffects,
            );
          }
        }
        const oldOwner = previous?.owner;
        if (oldOwner !== undefined && oldOwner !== candidate.owner) {
          this.#retireCollectionRow(oldOwner, effectErrors, deferredEffects);
          ownerRegion.keysByOwner.delete(oldOwner);
        }
        const previousCache = this.#componentCache.get(candidate.owner);
        this.#componentCache.set(candidate.owner, candidate.cache);
        if (!this.#liveOwners.has(candidate.owner)) {
          this.#count("owner.created");
        }
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
            capturedDeltaValues.get(candidate.owner),
          );
        } else {
          for (const site of candidate.cache.propBoundSites) {
            const source = this.world.scalarSource(candidate.owner, site);
            if (source) {
              this.#sourceValueSyncVisits++;
              this.#lastSourceValues.set(
                source,
                capturedDeltaValues.get(candidate.owner)?.get(site) ??
                  source.value,
              );
            }
          }
        }
        region.rows.set(key, {
          node: candidate.node,
          entry: candidate.cache.collectionEntry,
        });
        region.hostKeysByCollectionKey.set(key, candidate.hostKey);
        region.componentSiteId = getComponentSiteId(candidate.cache.type);
        ownerRegion.outputsByKey.set(key, this.#cacheOutputView(candidate.cache, true));
        ownerRegion.keysByOwner.set(candidate.owner, key);
        deferredEffects.push(() => {
          effectErrors.push(...this.#reconcileOwnerEffects(
            candidate.owner,
            candidate.cache.ownEffects,
          ));
        });
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
      // Drop snapshot ancestor arrays in O(depth); stable keys/maps serve sparse deltas,
      // and the next generic render rebuilds invalidated ancestors.
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
          output: ordinaryOutput(null, null),
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
      this.#publishDirectHostMutation();
    } catch (error) {
      if (this.#directPublicationPending) this.#failDirectHostMutation(error);
      throw error;
    }
    try {
      this.#vdom.flushRefs();
    } catch (error) {
      effectErrors.push(error);
    }
    for (const effect of deferredEffects) {
      try {
        effect();
      } catch (error) {
        effectErrors.push(error);
      }
    }
    if (effectErrors.length) {
      throw new AggregateError(
        effectErrors,
        "Collection row effect lifecycle failed after VDOM commit",
      );
    }
    return true;
  }

  #retireCollectionRow(
    owner: OwnerId,
    errors: unknown[],
    deferredEffects?: Array<() => void>,
  ) {
    const cache = this.#componentCache.get(owner);
    if (!cache) return;
    const lineage = this.world.ownerLineage(owner).slice(1);
    this.#count("owner.retired");
    if (deferredEffects) {
      deferredEffects.push(() => {
        errors.push(...this.#reconcileOwnerEffects(owner, new Map()));
        this.world.destroyOwner(owner);
        this.#dropPendingForOwner(owner);
      });
    } else {
      errors.push(...this.#reconcileOwnerEffects(owner, new Map()));
    }
    this.#forgetOwnerSourceValues(owner, cache.propBoundSites);
    this.#componentCache.delete(owner);
    this.#liveOwners.delete(owner);
    if (!deferredEffects) {
      this.#dropPendingForOwner(owner);
      this.world.destroyOwner(owner);
    }
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

  #retireOwnerAccepted(owner: OwnerId) {
    const cache = this.#componentCache.get(owner);
    if (!cache) return;
    const lineage = this.world.ownerLineage(owner).slice(1);
    this.#retireOwnerAcceptedFromSources(owner, cache, lineage,
      (site) => this.world.scalarSource(owner, site),
      () => this.world.destroyOwner(owner));
  }

  #retireOwnerAcceptedOwned(
    owner: OwnerId, cache: ComponentCache, lineage: readonly OwnerId[],
    sources: ReadonlyMap<string, ScalarSource | null>,
  ) {
    if (this.#componentCache.get(owner) !== cache) {
      throw new Error("Retired owner cache changed before publication");
    }
    this.#retireOwnerAcceptedFromSources(owner, cache, lineage,
      (site) => sources.get(site) ?? null,
      () => retireOwnedWorldOwner(this.world, owner), true);
  }

  #retireOwnerAcceptedFromSources(
    owner: OwnerId, cache: ComponentCache, lineage: readonly OwnerId[],
    sourceFor: (site: string) => ScalarSource | null,
    destroy: () => boolean,
    requireDestroy = false,
  ) {
    this.#count("owner.retired");
    for (const site of cache.propBoundSites) {
      const source = sourceFor(site);
      if (source) this.#lastSourceValues.delete(source);
    }
    this.#componentCache.delete(owner);
    this.#liveOwners.delete(owner);
    this.#dropPendingForOwner(owner);
    if (!destroy() && requireDestroy) {
      throw new Error("Retired World owner changed before publication");
    }
    for (const ancestor of lineage) {
      const ancestorCache = this.#componentCache.get(ancestor);
      if (
        ancestorCache?.subtreeOwners instanceof Set &&
        ancestorCache.subtreeOwners.delete(owner)
      ) this.#count("collection.owner-membership-writes");
    }
  }

  #forgetOwnerSourceValues(owner: OwnerId, sites: ReadonlySet<string>) {
    for (const site of sites) {
      const source = this.world.scalarSource(owner, site);
      if (source) this.#lastSourceValues.delete(source);
    }
  }

  #commitHostMutation<T>(commit: () => T, deferPublication = false): T {
    const direct = !this.#candidateHostCommit;
    if (this.#codeInvalidated) throw new Error("Compiled module changed; remount the root");
    if (direct) {
      if (!this.#activeRootClaim) {
        throw new Error("Direct host mutation has no publication claim");
      }
      assertHostPublicationClaim(this.#hostPublicationDomain, this.#activeRootClaim);
    }
    if (direct) this.#vdom.beginPublication();
    let failed = false;
    let primaryFailure: unknown;
    this.#hostApplicationDepth++;
    try {
      const result = commit();
      if (this.#disposeRequested) {
        throw new Error("Root disposal was requested during host application");
      }
      if (this.#codeInvalidated) throw new Error("Compiled module changed during host application");
      if (direct) {
        if (deferPublication) {
          this.#directPublicationPending = true;
        } else if (result !== false) {
          this.#vdom.publishAccepted();
          this.#publicationVersion++;
        } else {
          this.#vdom.cancelPublication();
        }
      }
      return result;
    } catch (error) {
      failed = true;
      primaryFailure = error;
      if (direct) this.#vdom.failPublication();
      this.#terminalHostFailure ??= error;
      this.#terminalHostFailed = true;
      const cleanup = collectCleanupErrors([
        () => {
          if (direct && this.#activeRootClaim) {
            quarantineHostPublicationDomains(
              [this.#hostPublicationDomain], this.#activeRootClaim, error,
            );
          }
        },
        () => this.#dropPendingDirectIntent(),
        () => this.#cancelTerminalResourceWaits(),
      ]);
      try {
        return throwWithCleanup(error, cleanup);
      } catch (failure) {
        primaryFailure = failure;
        throw failure;
      }
    } finally {
      this.#hostApplicationDepth--;
      this.#finishDeferredLifetime(failed ? { error: primaryFailure } : undefined);
    }
  }

  #publishDirectHostMutation() {
    if (!this.#directPublicationPending) {
      throw new Error("No direct host publication is pending");
    }
    if (!this.#activeRootClaim) {
      throw new Error("Direct host publication has no claim");
    }
    assertHostPublicationClaim(this.#hostPublicationDomain, this.#activeRootClaim);
    if (this.#codeInvalidated) {
      this.#failDirectHostMutation(new Error("Compiled module changed before publication"));
    }
    this.#vdom.publishAccepted();
    this.#publicationVersion++;
    this.#directPublicationPending = false;
    this.#finishDeferredLifetime();
    if (this.#deferredFlush && !this.#disposed) this.#schedule();
  }

  #abandonDirectHostMutation() {
    if (!this.#directPublicationPending) return;
    this.#vdom.cancelPublication();
    this.#directPublicationPending = false;
    this.#finishDeferredLifetime();
  }

  #failDirectHostMutation(error: unknown): never {
    this.#vdom.failPublication();
    this.#directPublicationPending = false;
    this.#terminalHostFailure ??= error;
    this.#terminalHostFailed = true;
    this.#terminalFailureKind = "publication";
    const cleanup = collectCleanupErrors([
      () => {
        if (this.#activeRootClaim) quarantineHostPublicationDomains(
          [this.#hostPublicationDomain], this.#activeRootClaim, error,
        );
      },
      () => this.#dropPendingDirectIntent(),
      () => this.#cancelTerminalResourceWaits(),
    ]);
    this.#finishDeferredLifetime({ error }, cleanup);
    throw error;
  }

  #dropPendingDirectIntent() {
    const intent = this.#pendingDirectIntent;
    this.#pendingDirectIntent = null;
    const release = intent?.releaseStoreLease;
    if (intent) {
      intent.releaseStoreLease = null;
      intent.tree = null;
    }
    release?.();
  }

  #cancelTerminalResourceWaits() {
    const errors = collectCleanupErrors(
      [...this.#liveResourceSubscriptions.values()].map(({ unsubscribe }) =>
        unsubscribe
      ).concat([...this.#publicationIntents.keys()]),
    );
    this.#liveResourceSubscriptions.clear();
    this.#pendingResourceRetry = false;
    this.#pendingBoundaryRetries.clear();
    if (errors.length === 1) throw errors[0];
    if (errors.length) throw new AggregateError(errors, "Resource wait cleanup failed");
  }

  #completeDeferredDispose(borrowedClaim?: HostPublicationClaim) {
    if (
      !this.#disposeRequested || this.#disposed || this.#publicationBarrier ||
      this.#directPublicationPending ||
      this.#nativeCellCutActive || this.#hostApplicationDepth > 0
    ) return;
    this.#disposeRequested = false;
    this.#disposeWithClaim(this.#activeRootClaim ?? borrowedClaim);
  }

  #finishDeferredLifetime(
    primary?: { error: unknown },
    priorErrors: readonly unknown[] = [],
    borrowedClaim?: HostPublicationClaim,
  ): void {
    const errors = [...priorErrors, ...collectCleanupErrors([
      () => this.#retireCompiledInterests(),
      () => this.#completeDeferredDispose(borrowedClaim),
    ])];
    if (primary) throwWithCleanup(primary.error, errors);
    if (errors.length === 1) throw errors[0];
    if (errors.length) throw new AggregateError(errors, "Deferred lifetime cleanup failed");
  }

  #assertNoPublicationBarrier(operation: string) {
    if (
      this.#nativeCellCutActive || this.#hostApplicationDepth > 0 ||
      this.#directPublicationPending
    ) {
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

  #releasePublicationBarrier(
    candidate: NativeRootCandidate<H, Parent> | CandidateLifecycleCore,
    borrowedClaim?: HostPublicationClaim,
  ) {
    if (this.#publicationBarrier !== candidate) {
      this.#finishDeferredLifetime(undefined, [], borrowedClaim);
      return;
    }
    this.#publicationBarrier = null;
    this.#finishDeferredLifetime(undefined, [], borrowedClaim);
    const shouldFlush = this.#deferredFlush || this.#hasPendingWork();
    this.#deferredFlush = false;
    if (
      shouldFlush && !this.#disposed && !this.#disposing &&
      !this.#terminalHostFailed
    ) this.#schedule();
  }

  #hasPendingWork() {
    if (this.#publicationIntents.size > 0) {
      return this.#unheldCellChanges() || this.#unheldCollectionChanges() ||
        [...this.#pendingBoundaryRetries].some((owner) => {
          const cache = this.#componentCache.get(owner);
          if (!cache?.pendingResource) return false;
          const child = Object.getOwnPropertyDescriptor(
            cache.props, "children")?.value;
          const stores = new Set<AnyAsyncStore>();
          const resources = this.#boundaryResourceDependencies(child, stores);
          return !!resources && !this.#resourceHoldWait(resources, undefined,
            { stores: [...stores] });
        }) ||
        (this.#storeNotificationGeneration !==
          this.#committedStoreNotificationGeneration &&
          this.#partialStoreAttemptGeneration !==
            this.#storeNotificationGeneration &&
          [...this.#liveStoreSubscriptions.keys()].some((store) =>
            !this.#heldStore(store)));
    }
    if (this.#pendingDirectIntent) {
      return this.#pendingResourceRetry ||
        this.#pendingBoundaryRetries.size > 0 ||
        (this.#pendingDirectIntent.attemptedStoreGeneration !== null &&
          this.#storeNotificationGeneration !==
            this.#pendingDirectIntent.attemptedStoreGeneration);
    }
    return this.#pendingChanges.size > 0 ||
      this.#pendingCollectionRegionKeys.size > 0 ||
      this.#pendingResourceRetry ||
      this.#pendingBoundaryRetries.size > 0 ||
      this.#storeNotificationGeneration !==
        this.#committedStoreNotificationGeneration;
  }

  #schedule() {
    if (this.#disposed || this.#disposeRequested || this.#codeInvalidated ||
      this.#terminalHostFailed || this.#hostPublicationDomain.failed ||
      this.#scheduled) return;
    if (isHostPublicationDomainBusy(
      this.#hostPublicationDomain, this.#activeRootClaim ?? undefined,
    )) {
      this.#deferredFlush = true;
      this.#waitForHostAvailability();
      return;
    }
    if (
      this.#publicationBarrier || this.#hostApplicationDepth > 0 ||
      this.#directPublicationPending || this.#scopedFlushActive
    ) {
      this.#deferredFlush = true;
      return;
    }
    this.#scheduled = true;
    this.#scheduleCommit(() => {
      if (this.#disposed || this.#disposeRequested || this.#codeInvalidated ||
        this.#terminalHostFailed || !this.#scheduled) return;
      this.#scheduled = false;
      if (
        this.#publicationBarrier || this.#hostApplicationDepth > 0 ||
        this.#directPublicationPending || this.#scopedFlushActive
      ) {
        this.#deferredFlush = true;
        return;
      }
      if (this.#pendingDirectIntent || this.#hasPendingWork()) {
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

  #ownerHasStoreReaders(owner: OwnerId): boolean {
    for (const readerId of this.#liveStoreReaders.keys()) {
      if (this.#readerBelongsToOwner(readerId, owner)) return true;
    }
    return false;
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

  #acknowledgeCurrentStoreNotifications(): void {
    const generation = this.#storeNotificationGeneration;
    if (this.#disposed || this.#terminalHostFailed || this.#codeInvalidated ||
      generation === this.#committedStoreNotificationGeneration ||
      [...this.#liveResourceSubscriptions.values()].some((subscription) =>
        subscription.blockedReaders?.length)) return;
    const subscriptions = [...this.#liveStoreSubscriptions.keys()];
    if (subscriptions.length === 0) return;
    const readers = [...this.#liveStoreReaders].map(([id, membership]) =>
      ({ id, membership, stores: [...membership] }));
    const seen = new Set<AnyAsyncStore>();
    const entries: Array<{ store: AnyAsyncStore; rootId: string; readerId: string }> = [];
    for (const { id, membership, stores } of readers) {
      if (id.startsWith("\u0000suspense-pending:") ||
        this.#liveStoreReaders.get(id) !== membership ||
        membership.size !== stores.length || stores.length === 0) return;
      for (const store of stores) {
        if (!this.#liveStoreSubscriptions.has(store)) return;
        entries.push({ store, rootId: this.#rootId, readerId: id });
        seen.add(store);
      }
    }
    const cohort = acknowledgeCanonicalStoreReaderCohort(entries);
    if (cohort === "stale") return;
    if (cohort === "public-required") {
      for (const { store, rootId, readerId } of entries) {
        const receipt = captureCanonicalStoreReaderReceipt(store, rootId, readerId);
        if (!receipt || inspectCanonicalStoreReaderReceipt(
          store, rootId, readerId, receipt,
        ) !== "current") return;
      }
    }
    if (this.#storeNotificationGeneration !== generation ||
      this.#liveStoreReaders.size !== readers.length ||
      readers.some(({ id, membership, stores }) =>
        this.#liveStoreReaders.get(id) !== membership ||
        membership.size !== stores.length ||
        stores.some((store) => !membership.has(store))) ||
      this.#liveStoreSubscriptions.size !== subscriptions.length ||
      subscriptions.some((store) =>
        !this.#liveStoreSubscriptions.has(store) || !seen.has(store))) return;
    this.#committedStoreNotificationGeneration = generation;
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
    for (const [resource, subscription] of this.#liveResourceSubscriptions) {
      if (wanted.has(resource)) continue;
      subscription.unsubscribe();
      this.#liveResourceSubscriptions.delete(resource);
    }
    for (const resource of wanted) {
      let boundary: OwnerId | null = null;
      for (const [owner, cache] of this.#componentCache) {
        if (!cache.nativeBoundary || cache.pendingResource !== resource) continue;
        if (boundary !== null) {
          boundary = null;
          break;
        }
        boundary = owner;
      }
      const existing = this.#liveResourceSubscriptions.get(resource);
      if (existing) {
        existing.boundary = boundary;
        continue;
      }
      const unsubscribe = resource.subscribe(() => {
        const subscription = this.#liveResourceSubscriptions.get(resource);
        subscription?.unsubscribe();
        this.#liveResourceSubscriptions.delete(resource);
        if (!this.#disposed) {
          if (subscription?.boundary !== null && subscription?.boundary !== undefined) {
            this.#pendingBoundaryRetries.add(subscription.boundary);
          } else this.#pendingResourceRetry = true;
          this.#schedule();
        }
      });
      this.#liveResourceSubscriptions.set(resource, { unsubscribe, boundary });
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

  #captureOwnerSourceValues(
    owner: OwnerId,
    sites: ReadonlySet<string>,
  ): Map<string, number> {
    const captured = new Map<string, number>();
    for (const site of sites) {
      const source = this.world.scalarSource(owner, site);
      if (source) captured.set(site, source.value);
    }
    return captured;
  }

  #syncLastSourceValues(
    caches: ReadonlyMap<OwnerId, ComponentCache>,
    captured?: ReadonlyMap<OwnerId, ReadonlyMap<string, number>>,
  ) {
    if (this.#disposed) return;
    const live = new Set<ScalarSource>();
    for (const [owner, cache] of caches) {
      for (const site of cache.propBoundSites) {
        this.#sourceValueSyncVisits++;
        const source = this.world.scalarSource(owner, site);
        if (!source) continue;
        live.add(source);
        this.#lastSourceValues.set(
          source,
          captured
            ? captured.get(owner)?.get(site) ??
              this.#lastSourceValues.get(source) ?? source.value
            : source.value,
        );
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
    captured?: ReadonlyMap<string, number>,
  ) {
    for (const site of previous.propBoundSites) {
      if (nextSites.has(site)) continue;
      const source = this.world.scalarSource(owner, site);
      if (source) this.#lastSourceValues.delete(source);
    }
    for (const site of nextSites) {
      this.#sourceValueSyncVisits++;
      const source = this.world.scalarSource(owner, site);
      if (source) {
        this.#lastSourceValues.set(source, captured?.get(site) ?? source.value);
      }
    }
  }

  #applyCandidateNumericWrites(writes: readonly CandidateNumericWrite[]) {
    const pending = writes.filter((write) =>
      this.world.isAlive(write.owner) &&
      this.world.version(write.owner, write.site) === write.version &&
      this.world.scalarSource(write.owner, write.site) === write.source &&
      this.#vdom.hasBoundSource(write.source)
    );
    if (pending.length === 0) return;
    // VDOM validates and updates sources before writers; refs and effects wait until
    // the source-to-prop update and candidate publication succeed.
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
      const wrote = this.#commitHostMutation(
        () => this.#vdom.setSources(updates),
        true,
      );
      try {
        for (const { source, current } of pending) {
          this.#lastSourceValues.set(source, current);
        }
        this.#finishChanges(changes);
        if (this.#directPublicationPending) this.#publishDirectHostMutation();
      } catch (error) {
        if (this.#directPublicationPending) this.#failDirectHostMutation(error);
        throw error;
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

  #clearNativeRowBuffers() {
    for (let index = 0; index < this.#nativeRowUsedCount; index++) {
      this.#nativeRowTokens[index] = undefined;
      this.#nativeRowViews[index] = undefined;
    }
    this.#nativeRowUsedCount = 0;
    if (this.#disposed) {
      this.#nativeRowTokens.length = 0;
      this.#nativeRowViews.length = 0;
      this.#nativeChangedRows = new Uint32Array(0);
      this.#nativeChangedSlots = new Uint32Array(0);
    }
  }

  #acknowledgeNativeCellCut(count: number) {
    if (this.#disposed) return;
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

  /** Execute one compiler-owned row plan per affected committed owner. */
  #tryCommitNativeRows(count: number): boolean | null {
    if (this.#nativeChangedRows.length < count) {
      let capacity = Math.max(16, this.#nativeChangedRows.length);
      while (capacity < count) capacity *= 2;
      this.#nativeChangedRows = new Uint32Array(capacity);
      this.#nativeChangedSlots = new Uint32Array(capacity);
    }
    // These epochs are Root-local: grafted roots never share cut bookkeeping.
    if (this.#nativeRowEpoch === Number.MAX_SAFE_INTEGER) {
      this.#nativeRowPrograms = new WeakMap();
      this.#nativeRowEpoch = 0;
    }
    const epoch = ++this.#nativeRowEpoch;
    let accepted = false;
    try {
      for (let index = 0; index < count; index++) {
        const handle = this.#nativeCellHandles[index]!;
        const cache = this.#componentCache.get(handle.owner);
        if (!cache) return null;
        const view = this.world.numericRowForCell(
          handle,
          this.#nativeCellVersions[index],
        );
        if (!view || !view.layout.programId) return null;
        let prepared = this.#nativeRowPrograms.get(view.rowIdentity);
        if (!this.#compiledOwnerSiteCertified(handle.owner, cache, handle.site)) {
          return null;
        }
        if (!prepared) {
          const token = this.#vdom.prepareNumericRowProgram(view);
          if (!token) return null;
          prepared = { token, epoch: 0, index: 0 };
          this.#nativeRowPrograms.set(view.rowIdentity, prepared);
        }
        if (prepared.epoch !== epoch) {
          prepared.epoch = epoch;
          prepared.index = this.#nativeRowUsedCount++;
          this.#nativeRowTokens[prepared.index] = prepared.token;
          this.#nativeRowViews[prepared.index] = view;
        }
        this.#nativeChangedRows[index] = prepared.index;
        this.#nativeChangedSlots[index] = view.slot;
        this.#numericProgramSources[index] = view.source;
        this.#numericProgramCurrentValues[index] =
          view.columns[view.slot].values[view.row];
        this.#numericProgramUsedCount = index + 1;
      }
      let declined = false;
      let wrote = this.#commitHostMutation(() => {
        const result = this.#vdom.executePreparedNumericRows(
          this.#nativeRowTokens,
          this.#nativeChangedRows,
          this.#nativeChangedSlots,
          this.#numericProgramCurrentValues,
          count,
        );
        if (result === null) {
          declined = true;
          return false;
        }
        return result;
      }, true);
      if (declined) {
        this.#abandonDirectHostMutation();
        // A binding edit can stale a cached VDOM token. Recheck the entire
        // World cut before rebuilding any row token; never recapture values.
        for (let index = 0; index < count; index++) {
          const handle = this.#nativeCellHandles[index]!;
          const cache = this.#componentCache.get(handle.owner);
          if (!cache || !this.#compiledOwnerSiteCertified(handle.owner, cache, handle.site)) {
            return null;
          }
          const current = this.world.numericRowForCell(
            handle,
            this.#nativeCellVersions[index],
          );
          const prior = this.#nativeRowViews[this.#nativeChangedRows[index]]!;
          if (
            !current || current.rowIdentity !== prior.rowIdentity ||
            current.slot !== this.#nativeChangedSlots[index] ||
            current.source !== this.#numericProgramSources[index]
          ) return null;
        }
        for (let index = 0; index < this.#nativeRowUsedCount; index++) {
          const view = this.#nativeRowViews[index]!;
          const token = this.#vdom.prepareNumericRowProgram(view);
          if (!token) return null;
          this.#nativeRowTokens[index] = token;
          this.#nativeRowPrograms.get(view.rowIdentity)!.token = token;
        }
        declined = false;
        wrote = this.#commitHostMutation(() => {
          const result = this.#vdom.executePreparedNumericRows(
            this.#nativeRowTokens,
            this.#nativeChangedRows,
            this.#nativeChangedSlots,
            this.#numericProgramCurrentValues,
            count,
          );
          if (result === null) {
            declined = true;
            return false;
          }
          return result;
        }, true);
        if (declined) {
          this.#abandonDirectHostMutation();
          return null;
        }
      }
      accepted = true;
      this.#count("numeric.row-batches");
      this.#count("numeric.row-count", this.#nativeRowUsedCount);
      this.#count("numeric.row-cells", count);
      try {
        this.#acknowledgeNativeCellCut(count);
        this.#publishDirectHostMutation();
      } catch (error) {
        if (this.#directPublicationPending) this.#failDirectHostMutation(error);
        throw error;
      }
      return wrote || count > 0;
    } finally {
      this.#clearNativeRowBuffers();
      if (!accepted) this.#clearNumericProgramBuffers();
    }
  }

  /** Capture exact published lane cells; null keeps the existing fallback cut. */
  #tryCommitNativeLanes(count: number): boolean | null {
    let accepted = false;
    try {
      for (let index = 0; index < count; index++) {
        const handle = this.#nativeCellHandles[index]!;
        const cache = this.#componentCache.get(handle.owner);
        if (!cache) return null;
        const lane = this.world.numericLaneForCell(
          handle,
          this.#nativeCellVersions[index],
        );
        if (!lane) return null;
        let prepared = this.#nativeLanePrograms.get(lane);
        if (!this.#compiledOwnerSiteCertified(handle.owner, cache, handle.site)) {
          return null;
        }
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
      }, true);
      if (declined) {
        this.#abandonDirectHostMutation();
        declined = false;
        // On a mutation-free preflight decline, refresh tokens and retry once with
        // the same captured values.
        for (let index = 0; index < count; index++) {
          const handle = this.#nativeCellHandles[index]!;
          const cache = this.#componentCache.get(handle.owner);
          if (!cache || !this.#compiledOwnerSiteCertified(handle.owner, cache, handle.site)) {
            return null;
          }
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
        }, true);
        // A repeated preflight decline preserves the generic fallback path.
        if (declined) {
          this.#abandonDirectHostMutation();
          return null;
        }
      }
      accepted = true;
      this.#count("numeric.lane-batches");
      this.#count("numeric.lane-cells", count);
      try {
        this.#acknowledgeNativeCellCut(count);
        this.#publishDirectHostMutation();
      } catch (error) {
        if (this.#directPublicationPending) this.#failDirectHostMutation(error);
        throw error;
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
      const rowCommit = this.#tryCommitNativeRows(count);
      if (rowCommit !== null) {
        committed = rowCommit;
        return committed;
      }
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
          !cache || !this.#compiledPropSitesForCache(handle.owner, cache).has(handle.site) ||
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
        const wrote = this.#commitHostMutation(
          () =>
            this.#vdom.executeSourceProgram(
              this.#numericProgramSources,
              this.#numericProgramCurrentValues,
              count,
            ),
          true,
        );
        try {
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
          this.#publishDirectHostMutation();
        } catch (error) {
          if (this.#directPublicationPending) {
            this.#failDirectHostMutation(error);
          }
          throw error;
        }
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
      this.#finishDeferredLifetime();
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
    collectionEntry?: object,
    structuralScope: StructuralScope = rootStructuralScope,
  ): RuntimeNode {
    if (
      node == null || node === false || typeof node === "string" ||
      typeof node === "number"
    ) return node;
    if (Array.isArray(node)) {
      const arrayScope = structuralContainerScope(structuralScope, "array");
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
      const cleanChildReplacements: {
        rows: Array<readonly [number, RuntimeNode]> | null;
      } = { rows: null };
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
            false,
            undefined,
            collectionDescriptor?.rows.get(collectionKeys[index])?.entry,
            structuralChildPosition(arrayScope, index),
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
              storeTransaction.preserveCapturedReaders(branchReaders);
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
        const cleanExpanded = cleanRevealOutput(boundaryState, expanded);
        if (cleanExpanded !== expanded) {
          (cleanChildReplacements.rows ??= []).push([index, cleanExpanded]);
        }
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
                  scopedOwnerSite(collectionDescriptor
                    ? collectionOwnerSite(
                      collectionDescriptor.siteId,
                      childSiteId,
                    )
                    : childSiteId, arrayScope.siteScope),
                  key,
                ) ?? (ownerPreparation ? undefined : this.world.findOwner(
                  parentOwner,
                  scopedOwnerSite(collectionDescriptor
                    ? collectionOwnerSite(
                      collectionDescriptor.siteId,
                      childSiteId,
                    )
                    : childSiteId, arrayScope.siteScope),
                  key,
                ));
              if (outputsByKey.has(key) || owner === undefined) {
                validRegion = false;
              } else {
                outputsByKey.set(key, cleanExpanded);
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
        const liveRows = new Map<string, Readonly<{
          node: RuntimeNode;
          entry?: object;
        }>>();
        let index = 0;
        for (const collectionKey of collectionDescriptor.rows.keys()) {
          liveRows.set(collectionKey, {
            node: node[index],
            entry: collectionDescriptor.rows.get(collectionKey)?.entry,
          });
          const hostKey = singleHostRootKey(children[index++] ?? null);
          if (hostKey !== null) {
            hostKeysByCollectionKey.set(collectionKey, hostKey);
          }
        }
        collectedCollection = {
          ...collectionDescriptor,
          rows: liveRows,
          parentOwner,
          parentHostKey: null,
          siteScope: arrayScope.siteScope,
          hostKeysByCollectionKey,
        };
        if (this.#collectedCollectionRegions) {
          if (expansionJournal) {
            expansionJournal.set(
              this.#collectedCollectionRegions,
              collectionRegionKey(parentOwner, collectedCollection.siteId,
                collectedCollection.siteScope),
              collectedCollection,
            );
          } else {this.#collectedCollectionRegions.set(
              collectionRegionKey(parentOwner, collectedCollection.siteId,
                collectedCollection.siteScope),
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
          siteScope: arrayScope.siteScope,
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
      const expandedChildren = changed ? copyKeyedOwnerMetadata(node, children) : node;
      if (cleanChildReplacements.rows) {
        const cleanChildren = children.slice();
        for (const [index, clean] of cleanChildReplacements.rows) {
          cleanChildren[index] = clean;
        }
        boundaryState!.cleanRevealOutputs!.set(
          expandedChildren,
          copyKeyedOwnerMetadata(node, cleanChildren),
        );
      }
      return expandedChildren;
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
      const ownerSite = scopedOwnerSite(
        `\u0000native-suspense:${siteId}`, structuralScope.siteScope);
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
      const recordBoundaryOutput = (
        output: RuntimeNode,
        pendingResource?: AsyncResource<any>,
        primaryReveal = false,
      ): RuntimeNode => {
        const accepted = primaryReveal && boundaryState
          ? this.#componentCache.get(boundaryOwner) : undefined;
        const outputOwner = isRuntimeOwnedElement(output)
          ? getComponentOutputOwner(output) : undefined;
        let candidateOutput = output;
        if (outputOwner !== undefined &&
          canAdoptBareSuspenseFallback(boundaryOwner, accepted, output, outputOwner)) {
          const markedOutput = markSuspenseRevealAdoption(output, outputOwner);
          (boundaryState!.cleanRevealOutputs ??= new WeakMap()).set(
            markedOutput, cleanRevealOutput(boundaryState, output),
          );
          candidateOutput = markedOutput;
        }
        const cache: ComponentCache = {
          type: Suspense,
          hostKeyScope: identityKey,
          props: { ...props },
          output: ordinaryOutput(props.children ?? null,
            cleanRevealOutput(boundaryState, output)),
          subtreeOwners: new Set(
            subtreeOwnersByOwner.get(boundaryOwner) ?? [boundaryOwner],
          ),
          ownEffects: new Map(),
          propBoundSites: new Set(),
          nativeBoundary: true,
          ...(pendingResource ? { pendingResource } : {}),
        };
        if (expansionJournal) {
          expansionJournal.set(nextComponentCache, boundaryOwner, cache);
        } else nextComponentCache.set(boundaryOwner, cache);
        return candidateOutput;
      };
      const heldBoundary = boundaryState?.held?.boundaries.get(boundaryOwner);
      if (heldBoundary) {
        const accepted = heldBoundary.cache;
        if (this.#componentCache.get(boundaryOwner) !== accepted ||
          !sameClosedBoundaryProps(node, accepted.props) ||
          !accepted.nativeBoundary ||
          (heldBoundary.parked
            ? !this.#parkedBoundaryCurrent(boundaryOwner, heldBoundary)
            : accepted.pendingResource !== heldBoundary.resource) ||
          [...accepted.subtreeOwners].some((owner) =>
            !this.#liveOwners.has(owner) ||
            !this.#componentCache.has(owner)
          )) {
          boundaryState!.blocked = true;
          return this.#cacheOutputView(accepted, true);
        }
        const heldOwners = accepted.subtreeOwners;
        if (heldBoundary.parked) {
          heldBoundary.parked.propsCurrent = () =>
            sameClosedBoundaryProps(node, accepted.props);
        }
        for (const heldOwner of heldOwners) {
          const cache = this.#componentCache.get(heldOwner)!;
          nextOwners.add(heldOwner);
          nextComponentCache.set(heldOwner, cache);
          for (const [key, effect] of cache.ownEffects) nextEffects.set(key, effect);
          if (cache.nativeBoundary) boundaryState!.visited.add(String(heldOwner));
          for (const ancestor of ownerPath) {
            subtreeOwnersByOwner.get(ancestor)?.add(heldOwner);
          }
        }
        const heldReaders = new Map<string, ReadonlySet<AnyAsyncStore>>();
        for (const [readerId, stores] of this.#liveStoreReaders) {
          if ([...heldOwners].some((owner) =>
            this.#readerBelongsToOwner(readerId, owner)
          )) heldReaders.set(readerId, stores);
        }
        storeTransaction.preserveReaders(heldReaders);
        boundaryState!.retained!.add(boundaryOwner);
        return this.#cacheOutputView(accepted, true);
      }
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
          undefined,
          rootStructuralScope,
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
        return recordBoundaryOutput(primary, undefined, true);
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
          // Boundary-scoped IDs keep captured subscriptions separate when
          // lexical sites read from different sources.
          const pendingReaderDependencies = new Map(
            [...suspendedReaders].map(([readerId, stores]) => [
              `\u0000suspense-pending:${boundaryKey}:${readerId}`,
              stores,
            ]),
          );
          storeTransaction.preserveCapturedReaders(pendingReaderDependencies);
          if (isPendingResource(error) && boundaryState) {
            for (const [originalId, membership] of suspendedReaders) {
              const pendingId = `\u0000suspense-pending:${boundaryKey}:${originalId}`;
              for (const store of membership) {
                (boundaryState.suspendedStoreReaders ??= []).push({
                  resource: error.resource, boundaryOwner, pendingId,
                  originalId, store,
                });
              }
            }
          }
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
              undefined,
              rootStructuralScope,
            );
            // Successful re-expansion records actual reads as retained dependencies,
            // naturally releasing conditional reads removed by this draft.
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
          undefined,
          rootStructuralScope,
        );
        if (error instanceof ResourceRejection && boundaryPrimaries) {
          const snapshot: BoundaryPrimary = { tree: fallback };
          if (expansionJournal) {
            expansionJournal.set(boundaryPrimaries, boundaryKey, snapshot);
          } else boundaryPrimaries.set(boundaryKey, snapshot);
        }
        return recordBoundaryOutput(
          expandedFallback,
          isPendingResource(error) ? error.resource : undefined,
        );
      } finally {
        ownerPath.pop();
        if (!expansionJournal) branchJournal.clear();
      }
    }
    if (typeof node.type === "function") {
      if (!componentCodeCurrent(node.type)) {
        throw new Error("Compiled component revision is obsolete; remount with current code");
      }
      if (this.#activeCounters) this.#count("owner.component-visits");
      const siteId = getComponentSiteId(node.type);
      const lastSegment = path.slice(path.lastIndexOf("/") + 1);
      const ordinal = Number(lastSegment.split("#").at(-1)) || 0;
      const ownerKey = keyedIdentity(node, siteId, ordinal);
      // Scope host keys only at native boundaries. Ordinary owner keys must
      // remain canonical so sparse keyed-region commits target the same hosts.
      let key = boundaryHostScope === undefined
        ? String(ownerKey)
        : `${boundaryHostScope}\u0000${String(ownerKey)}`;
      const ownerSite = scopedOwnerSite(collectionOwnerScope
        ? collectionOwnerSite(
          collectionRowScopeKey === undefined
            ? collectionOwnerScope
            : `${collectionOwnerScope}#row:${collectionRowScopeKey}`,
          siteId,
        )
        : siteId, structuralScope.siteScope);
      const acceptedOwner = collectionOwnerScope && collectionEntry &&
          ownerPreparation
        ? ownerPreparation.findOwner(parentOwner, ownerSite, ownerKey)
        : undefined;
      const acceptedEntry = acceptedOwner === undefined
        ? undefined
        : this.#componentCache.get(acceptedOwner)?.collectionEntry;
      if (
        acceptedEntry !== undefined && collectionEntry !== undefined &&
        acceptedEntry !== collectionEntry
      ) ownerPreparation?.replaceOwner(parentOwner, ownerSite, ownerKey);
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
      ownCompiledOwnerProps(node.type, node, componentProps);
      const collectionPropsOwned = ownCollectionOwnerProps(
        node.type, node, componentProps,
      );
      const numericPropsAdmitted = numericOwnerPropsAdmitted(
        node.type, componentProps, isRuntimeOwnedElement(node),
      );
      const storeChildAdmitted = retainedStoreChildAdmitted(
        node.type, node, componentProps,
      );
      const cached = this.#componentCache.get(owner);
      const scopeExplicitHostKeys = cached?.scopeExplicitHostKeys === true ||
        (collectionEntry !== undefined && acceptedOwner !== undefined &&
          acceptedOwner !== owner);
      if (collectionEntry !== undefined) {
        if (cached?.hostKeyScope !== undefined) {
          key = String(cached.hostKeyScope);
        } else if (acceptedOwner !== undefined && acceptedOwner !== owner) {
          key = `${key}\u0000owner:${owner}`;
        }
      }
      const propsUnchanged = cached !== undefined &&
        cached.numericPropsAdmitted === numericPropsAdmitted &&
        cached.retainedStoreChildAdmitted === storeChildAdmitted &&
        cached.collectionPropsOwned === collectionPropsOwned &&
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
          return this.#cacheOutputView(cached, true);
        }

        let result = cached ? this.#cacheOutputView(cached, false) : undefined;
        let ownEffects = cached?.ownEffects;
        let propBoundSites: ReadonlySet<string> = cached?.propBoundSites ??
          new Set();
        let numericStateAdmitted = cached?.numericStateAdmitted === true;
        if (shouldRender) {
          const prepared = cached?.numericPropsAdmitted === numericPropsAdmitted &&
            cached?.collectionPropsOwned === collectionPropsOwned &&
            (cached?.collectionPropsOwned !== true || propsUnchanged)
            ? this.#preparedRenders.get(owner) ?? null : null;
          if (prepared) {
            result = prepared.result;
            ownEffects = prepared.ownEffects;
            propBoundSites = prepared.propBoundSites;
            numericStateAdmitted = prepared.numericStateAdmitted;
            for (const [registeredKey, effect] of ownEffects) {
              if (expansionJournal) {
                expansionJournal.set(nextEffects, registeredKey, effect);
              } else nextEffects.set(registeredKey, effect);
            }
          } else {
            ownEffects = new Map<string, EffectRegistration>();
            const nextPropBoundSites = new Set<string>();
            propBoundSites = nextPropBoundSites;
            const activeOwner: ActiveOwner = {
              world: ownerPreparation ?? this.world,
              owner,
              numericStateReadsPrimitive: true,
              collectionPropsOwned,
              collectionProps: componentProps,
              collectionSites: closedCollectionSitesFor(node.type),
              stateLayout: numericOwnerPropsAdmitted(
                node.type, componentProps, isRuntimeOwnedElement(node),
              )
                ? compiledStateLayoutFor(node.type) : undefined,
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
            };
            activeOwners.push(activeOwner);
            try {
              if (this.#activeCounters) this.#count("owner.component-renders");
              result = node.type(componentProps);
            } finally {
              activeOwners.pop();
            }
            numericStateAdmitted = activeOwner.numericStateReadsPrimitive;
            result = carryHostKeys(
              result,
              key,
              "0",
              undefined,
              scopeExplicitHostKeys,
              owner,
            );
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
          undefined,
          undefined,
          rootStructuralScope,
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
                collectionRegionKey(owner, completeRegion.siteId,
                  completeRegion.siteScope),
                completeRegion,
              );
            } else {this.#collectedCollectionRegions.set(
              collectionRegionKey(owner, completeRegion.siteId,
                completeRegion.siteScope),
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
          scopeExplicitHostKeys,
          props: componentProps,
          numericPropsAdmitted,
          retainedStoreChildAdmitted: storeChildAdmitted,
          numericStateAdmitted,
          collectionEntry,
          collectionPropsOwned,
          output: ordinaryOutput(result ?? null,
            cleanRevealOutput(boundaryState, expandedResult)),
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
      false,
      undefined,
      undefined,
      node.type === Fragment
        ? structuralFragmentScope(structuralScope, node)
        : structuralHostScope(structuralScope, node),
    );
    const expanded = children === node.props.children
      ? node
      : copyRuntimeElement(node.type, { ...node.props, children });
    const cleanChildren = cleanRevealOutput(boundaryState, children);
    if (cleanChildren !== children) {
      if (!isRuntimeOwnedElement(expanded)) {
        throw new Error("Suspense reveal cache output must be runtime-owned");
      }
      boundaryState!.cleanRevealOutputs!.set(
        expanded,
        copyRuntimeElement(expanded.type, {
          ...expanded.props, children: cleanChildren,
        }),
      );
    }
    return expanded;
  }

  #assertActive() {
    if (this.#codeInvalidated) throw new Error("Compiled module changed; remount the root");
    if (this.#disposed) throw new Error("ComponentStateRoot is disposed");
    if (this.#disposeRequested) {
      throw new Error("ComponentStateRoot disposal is pending publication");
    }
    if (this.#terminalHostFailed) {
      throw new Error(
        this.#terminalFailureKind === "host"
          ? "ComponentStateRoot cannot continue after a host commit failure"
          : "ComponentStateRoot cannot continue after partial publication",
        { cause: this.#terminalHostFailure },
      );
    }
    if (this.#hostPublicationDomain.failed) {
      throw new Error("ComponentStateRoot cannot continue after a shared host failure", {
        cause: this.#hostPublicationDomain.failure,
      });
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
