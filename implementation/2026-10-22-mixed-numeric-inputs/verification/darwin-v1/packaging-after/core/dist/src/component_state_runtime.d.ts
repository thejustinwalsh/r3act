import { type ClosedComponentForwardProgram } from "./closed_component_forward_program.ts";
import { type ClosedStoreHostProgram } from "./closed_store_host_program.ts";
import { type ClosedStoreNumericKernel } from "./closed_store_numeric_kernel.ts";
import { type ClosedResourceHostProgram } from "./closed_resource_host_program.ts";
import { type AnyAsyncStore, type StoreSource } from "./async_store_runtime.ts";
import { AsyncResource } from "./async_resource_runtime.ts";
import { type HostPublicationDomain } from "./host_publication_domain.ts";
import type { CompiledOwnerUpdateProgram, CompiledStateLayout } from "./compiled_state_layout.ts";
export type { CompiledOwnerUpdateProgram, CompiledStateLayout, } from "./compiled_state_layout.ts";
import { OwnerStateWorld, type StateAction, type StateCellHandle } from "./owner_state_world.ts";
import { type BoundValue, type ComponentType, type NumericBindingProgramDescriptor, type NumericBindingProgramDescriptorV1, type NumericBindingProgramDescriptorV2, type RuntimeNode } from "./jsx_binding_runtime.ts";
import { type RuntimeCounterCallback, type RuntimeProfileCallback, type VDOMHost, type VDOMKeyIndexMaintenance } from "./vdom_snapshot_runtime.ts";
import { type DerivedRegionGraph } from "./derived_region_runtime.ts";
import { type KeyedCollection } from "./keyed_collection.ts";
type EffectCleanup = () => void;
type EffectSetup = () => void | EffectCleanup;
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
    publish(): void;
    installSubscriptions(): unknown[];
    runEffects(): void;
    discard(): void;
    failGroup(error: unknown): void;
};
/** Recheck every private cut after the last grouped caller callback. */
export declare const admitPreparedNativeGroup: <H, Parent>(candidates: readonly NativeRootCandidate<H, Parent>[]) => boolean;
/** Apply one already-admitted group member without repeating public preflight. */
export declare const commitAdmittedNativeCandidate: <H, Parent>(candidate: NativeRootCandidate<H, Parent>) => void;
export declare class UnsupportedGroupOpaqueFreshnessError extends Error {
    constructor(kind?: string);
}
declare const rootHostPublicationDomain: unique symbol;
export declare const isNativeRootHostPublicationBusy: (root: ComponentStateRoot<any, any>) => boolean;
export declare const subscribeNativeRootHostPublication: (root: ComponentStateRoot<any, any>, callback: () => void) => (() => void);
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
export declare const claimPreparedNativeGroup: <H, Parent>(candidates: readonly NativeRootCandidate<H, Parent>[]) => ClaimedNativeGroup | BusyNativeGroup;
/** Accept a prepared group using only its private final admission receipts. */
export declare const publishPreparedNativeGroup: <H, Parent>(candidates: readonly NativeRootCandidate<H, Parent>[]) => void;
export type ComponentInvalidationPlan = DerivedRegionGraph & {
    readonly region_component_site_ids: readonly string[];
};
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
export declare const Suspense: ComponentType<NativeSuspenseProps>;
/** Attach the stable component-site ID that a compiler would emit for a function component. */
export declare const defineComponent: <P extends Record<string, unknown>>(siteId: string, render: ComponentType<P>, metadata?: {
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
    readonly closedComponentForwardProgram?: ClosedComponentForwardProgram;
}) => ComponentType<P>;
/** Build a live numeric binding from state cells owned by the active component. */
export declare function bindStatePropsAt<T>(siteIds: readonly string[], derive: (values: readonly number[]) => T, numericProgram: NumericBindingProgramDescriptorV2): BoundValue<T> | T;
export declare function bindStatePropsAt<T>(siteIds: readonly string[], derive: (values: readonly number[]) => T, numericProgram?: NumericBindingProgramDescriptorV1): BoundValue<T>;
export declare function bindStatePropsAt<T>(siteIds: readonly string[], derive: (values: readonly number[]) => T, numericProgram: NumericBindingProgramDescriptorV2): BoundValue<T> | T;
export declare function bindStatePropsAt<T>(siteIds: readonly string[], derive: (values: readonly number[]) => T, numericProgram?: NumericBindingProgramDescriptorV1): BoundValue<T>;
export declare function bindStatePropsAt<T>(siteIds: readonly string[], derive: (values: readonly number[]) => T, numericProgram: NumericBindingProgramDescriptor): BoundValue<T> | T;
/** Build a live numeric binding from one state cell owned by the active component. */
export declare const bindStatePropAt: <T>(siteId: string, project: (value: number) => T, numericProgram?: NumericBindingProgramDescriptor) => BoundValue<T> | T;
/** Explicit-site hook primitive; the compiler can lower familiar useState calls to this form. */
export declare const useStateAt: <T>(siteId: string, initial: T | (() => T)) => readonly [T, (action: StateAction<T>) => boolean];
/** Register an effect by compiler site ID; setup runs after commit, cleanup on deactivation or owner removal. */
export declare const useEffectAt: (siteId: string, setup: EffectSetup) => void;
/** Read a shared store or selector at a stable compiler-owned component site. */
export declare const useStoreAt: <T>(siteId: string, source: StoreSource<T>) => T;
/** Generic authored read: stores keep their value semantics; resources unwrap and suspend. */
export declare const useAt: <T>(siteId: string, source: StoreSource<T> | AsyncResource<T> | PromiseLike<T>) => T | Awaited<T>;
/**
 * Compiler lowering for `items.map(row => <Row key={row.id} ... />)` when the
 * input is a proven keyed collection. Initial/full renders take a snapshot;
 * committed roots consume later collection batches through a sparse region.
 */
export declare const renderCollectionAt: <T>(siteId: string, collection: KeyedCollection<T>, renderRow: (value: T) => RuntimeNode, options?: {
    readonly requiresOwnerRender?: boolean;
}) => RuntimeNode[];
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
/**
 * Component execution bridge between owner/site state and retained VDOM.
 * The native module compiler supplies stable component, hook, and collection
 * site IDs; explicit helpers remain available to host adapters and extensions.
 */
export declare class ComponentStateRoot<H, Parent = H> {
    #private;
    readonly world: OwnerStateWorld;
    [rootHostPublicationDomain](): HostPublicationDomain;
    constructor(host: VDOMHost<H, Parent>, container: Parent, options?: ComponentStateRootOptions);
    get version(): number;
    /** Logical native publication revision, including non-DOM source commits. */
    get publicationVersion(): number;
    /** Hold declared task/input store dependencies until this owner releases them. */
    holdStoreDependencies(stores: Iterable<AnyAsyncStore>): () => void;
    /** Prepare an isolated full-tree candidate without touching host or live caches. */
    prepare(tree: RuntimeNode, options?: {
        readonly transitions?: readonly string[];
        readonly autoRetryResources?: boolean;
        readonly renderPreparation?: "repeatable";
    }): NativeRootCandidate<H, Parent>;
    /** Prepare tracked root work without requiring callers to provide a full tree. */
    preparePending(options?: {
        readonly transitions?: readonly string[];
        readonly renderPreparation?: "repeatable";
    }): NativeRootCandidate<H, Parent> | null;
    /** Prepare explicit move/remove collection work without broadening its tree cut. */
    prepareCollections(collections: readonly KeyedCollection<any>[], publicationLease?: () => void): NativeRootCandidate<H, Parent> | null;
    /** Prepare one declared closed local, Store and keyed collection cut. */
    prepareTransaction(work: {
        readonly cells: readonly StateCellHandle[];
        readonly collections: readonly KeyedCollection<any>[];
        readonly stores?: readonly AnyAsyncStore[];
        readonly resources?: readonly AsyncResource<any>[];
    }, resourceLease?: () => void): NativeRootCandidate<H, Parent> | null;
    /** Prepare all closed host consumers of the selected direct Stores. */
    prepareStores(selected: readonly AnyAsyncStore[], publicationLease?: () => void): NativeRootCandidate<H, Parent> | null;
    /** Prepare the selected closed resource consumers as one root publication. */
    prepareResources(resources: readonly AsyncResource<any>[], resourceLease?: () => void, inputs?: {
        readonly cells?: readonly StateCellHandle[];
        readonly stores?: readonly AnyAsyncStore[];
        readonly collections?: readonly KeyedCollection<any>[];
    }): NativeRootCandidate<H, Parent> | null;
    /** Keep a declared pending cut out of automatic publication until released. */
    holdTransactionPublications(work: {
        readonly resources: readonly AsyncResource<any>[];
        readonly cells?: readonly StateCellHandle[];
        readonly collections?: readonly KeyedCollection<any>[];
        readonly stores?: readonly AnyAsyncStore[];
    }): () => void;
    /** Prepare a closed retained-prop cut; include every joint input cell. */
    prepareRetained(cells: readonly StateCellHandle[], publicationLease?: () => void): NativeRootCandidate<H, Parent> | null;
    /** Root-wide declaration that generic render preparation may repeat. */
    get renderPreparation(): "repeatable" | undefined;
    /** Stable identifier used when coordinating transitions across native roots. */
    get rootId(): string;
    /** A retired root rejects new work; its accepted host tree stays until caller disposal. */
    get retired(): boolean;
    onDispose(listener: () => void): () => void;
    /** Observe terminal work retirement; callers still dispose the accepted host tree. */
    onRetire(listener: () => void): () => void;
    get snapshot(): readonly unknown[];
    get partialCommitCount(): number;
    get partialCommitBatchCount(): number;
    diagnostics(): {
        version: number;
        ownerCount: number;
        pendingChangeCount: number;
        sourceValueSyncVisits: number;
        disposed: boolean;
    };
    mount(tree: RuntimeNode): void;
    /** Commit one batched owner/site update; return false when there is no work. */
    flush(): boolean;
    /** Replace the declarative tree while preserving component owners by site/key. */
    update(tree: RuntimeNode): void;
    render(tree: RuntimeNode): void;
    dispose(): void;
}
//# sourceMappingURL=component_state_runtime.d.ts.map