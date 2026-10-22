import { ScalarSource } from "./jsx_binding_runtime.ts";
import { NumericColumn } from "./jsx_binding_runtime.ts";
import { type CompiledStateLayout, type NumericLaneAddress } from "./compiled_state_layout.ts";
/** A component instance in the owner graph. IDs are allocated once and never reused. */
export type OwnerId = number;
export type OwnerKey = string | number | null;
export type StateSiteId = string;
export type StateAction<T> = T | ((previous: T) => T);
/** Cached compiled row binding for one committed state cell. */
export type NumericCellRowView = Readonly<{
    owner: OwnerId;
    site: StateSiteId;
    layout: CompiledStateLayout;
    rowIdentity: object;
    row: number;
    generation: number;
    slot: number;
    lane: NumericLaneAddress;
    source: ScalarSource;
    sources: readonly (ScalarSource | undefined)[];
    columns: readonly NumericColumn[];
}>;
/** Stable, payload-free address for a committed state cell. */
export type StateCellHandle = Readonly<{
    owner: OwnerId;
    site: StateSiteId;
    cellIdentity: object;
}>;
export type OwnedClosedWorldInputCell = Readonly<{
    handle: StateCellHandle;
    source: ScalarSource;
    version: number;
    value: number;
}>;
export type OwnedClosedWorldInputRow = Readonly<{
    owner: OwnerId;
    lineage: readonly OwnerId[];
    cells: readonly OwnedClosedWorldInputCell[];
}>;
type ClosedWorldCell = Readonly<{
    owner: OwnerId;
    site: StateSiteId;
    identity: object;
    source: ScalarSource;
    version: number;
    value: number;
}>;
declare class PrivateClosedWorldCellCut {
    #private;
    constructor(key: symbol, cells: readonly ClosedWorldCell[]);
    static cells(candidate: unknown): readonly ClosedWorldCell[] | null;
}
/** Candidate-local captured cells, privately copied for one publication cut. */
export type ClosedWorldCellCut = PrivateClosedWorldCellCut;
export type CanonicalClosedPhaseStatus = "current" | "stale" | "public-required";
export type StateChange = {
    readonly owner: OwnerId;
    readonly site: StateSiteId;
    readonly version: number;
    /** Stable opaque identity for committed world notifications; legacy records may omit it. */
    readonly cellIdentity?: object;
};
declare const ownerPreparationCheckpointBrand: unique symbol;
/** Opaque, preparation-scoped branch marker. It contains no world or journal. */
export type OwnerPreparationCheckpoint = {
    readonly [ownerPreparationCheckpointBrand]: true;
};
/** A candidate-local view of owner slots and hook cells.
 * Slot validation uses a parent's shape generation: any sibling slot edit
 * conservatively invalidates the candidate, while removed keys leave no
 * per-key tombstones behind.
 */
export type OwnerPreparation = {
    resolveOwner(parent: OwnerId | null, componentSiteId: string, key?: OwnerKey): OwnerId;
    /** Resolve from this candidate's slot overlay, then its pinned committed view. */
    findOwner(parent: OwnerId | null, componentSiteId: string, key?: OwnerKey): OwnerId | undefined;
    /** Create a fresh private incarnation that shadows the current slot until publish. */
    replaceOwner(parent: OwnerId | null, componentSiteId: string, key?: OwnerKey): OwnerId;
    useState<T>(owner: OwnerId, site: StateSiteId, initial: T | (() => T), layout?: CompiledStateLayout): readonly [T, (action: StateAction<T>) => boolean];
    /** Existing numeric sources are snapshot copies; their ID is stable but identity is not. */
    scalarSource(owner: OwnerId, site: StateSiteId): ScalarSource | null;
    /** True after a candidate-local setter changed a value during preparation. */
    hasStateWrites(): boolean;
    /** O(1) branch marker for work performed during this preparation. */
    checkpoint(): OwnerPreparationCheckpoint;
    /** Revert mutations after a marker while keeping the preparation open. */
    rollbackTo(checkpoint: OwnerPreparationCheckpoint): void;
    /** Consume a marker after its branch is no longer needed for rollback. */
    releaseCheckpoint(checkpoint: OwnerPreparationCheckpoint): void;
    /** Remove a private owner and its private descendants from this candidate. */
    discardPrivateOwner(owner: OwnerId): boolean;
    validate(): boolean;
    /** Accept newer live cell actions while retaining the captured owner cut. */
    validatePublicationInputs(): boolean;
    /** Validate and stage fallible work before grouped accepted publication. */
    preparePublication(): void;
    /** Route host-time setters for existing cells to their live identities. */
    beginHostApplication(): void;
    /** Stage after host callbacks while preserving newer live cell actions. */
    preparePublicationAfterHost(): void;
    /** Install the already prepared owner and cell state without callbacks. */
    publishAccepted(): void;
    /** Compatibility hook after accepted owner publication. */
    notifyPublished(): void;
    /** Compatibility path for one owner publication. */
    publish(): void;
    /** Discards private owners/cells; candidate setters subsequently return false. */
    discard(): void;
};
/**
 * Experimental owner-addressed hook storage.
 *
 * State is indexed by (owner entity, compiler site ID), never by call position.
 * `resolveOwner` interns a component instance by its parent, lexical component
 * site, and optional keyed-item identity. The compiler is expected to emit
 * stable site IDs; the string is explicit here so the runtime can be evaluated
 * before JSX lowering produces them.
 */
export declare class OwnerStateWorld {
    #private;
    static _canRetireOwnedOwner(key: symbol, world: OwnerStateWorld, owner: OwnerId): boolean;
    static _retireOwnedOwner(key: symbol, world: OwnerStateWorld, owner: OwnerId): boolean;
    static _captureOwnedClosedInputs(key: symbol, world: OwnerStateWorld, requests: readonly {
        owner: OwnerId;
        sites: readonly StateSiteId[];
    }[]): readonly OwnedClosedWorldInputRow[] | null;
    static _validateClosedCellCut(key: symbol, world: OwnerStateWorld, cut: ClosedWorldCellCut, phase: "prepared" | "after-host"): boolean;
    static _validateCanonicalClosedPhase(key: symbol, world: OwnerStateWorld, cut: ClosedWorldCellCut, phase: "prepared" | "after-host"): CanonicalClosedPhaseStatus;
    /** Begin an isolated owner/state view for one candidate preparation attempt. */
    beginPreparation(): OwnerPreparation;
    claimRootId(rootId: string): OwnerId;
    releaseRootId(rootId: string, owner: OwnerId): void;
    resolveOwner(parent: OwnerId | null, componentSiteId: string, key?: OwnerKey): OwnerId;
    /** Allocate a private incarnation without replacing a committed keyed slot. */
    createStagedOwner(parent: OwnerId, componentSiteId: string, key: OwnerKey): OwnerId;
    /** Validate a staged slot and allocate its missing maps before acceptance. */
    prepareStagedOwnerActivation(owner: OwnerId, previousOwner?: OwnerId): () => void;
    /** Publish a prepared incarnation only over its expected previous slot. */
    activateStagedOwner(owner: OwnerId, previousOwner?: OwnerId): void;
    findOwner(parent: OwnerId | null, componentSiteId: string, key?: OwnerKey): OwnerId | undefined;
    /** React-like state API with an explicit, compiler-addressable site ID. */
    useState<T>(owner: OwnerId, site: StateSiteId, initial: T | (() => T), layout?: CompiledStateLayout): readonly [T, (action: StateAction<T>) => boolean];
    /** Return the stable committed lane address, if this cell is lane-backed. */
    numericLane(owner: OwnerId, site: StateSiteId): NumericLaneAddress | null;
    /** Resolve a captured handle/version to its exact live numeric lane address. */
    numericLaneForCell(handle: StateCellHandle, version: number): NumericLaneAddress | null;
    /** Resolve a committed numeric cell to its cached row projection. */
    numericRowForCell(handle: StateCellHandle, version: number): NumericCellRowView | null;
    version(owner: OwnerId, site: StateSiteId): number;
    /** Return one live committed cell's stable capability without dispatching it. */
    cellHandle(owner: OwnerId, site: StateSiteId): StateCellHandle | null;
    /** Stable scalar handle for a numeric state cell; nonnumeric sites have none. */
    scalarSource(owner: OwnerId, site: StateSiteId): ScalarSource | null;
    /** Resolve the canonical source for an identity-bearing committed change. */
    scalarSourceForChange(change: StateChange): ScalarSource | null;
    /** Resolve the canonical numeric source for an exact committed cell handle. */
    scalarSourceForCell(handle: StateCellHandle): ScalarSource | null;
    /** Resolve the current version for an identity-bearing committed change. */
    versionForChange(change: StateChange): number;
    /** Resolve the current version for an exact committed cell handle. */
    versionForCell(handle: StateCellHandle): number | null;
    /** Clear dirty cells only when each exact cell has not advanced past its cut. */
    clearCellChangesThrough(handles: readonly (StateCellHandle | undefined)[], versions: readonly number[], count: number): void;
    /** Clear only changes at or below the captured versions. Reentrant writes survive. */
    clearChangesThrough(captured: readonly StateChange[]): void;
    /** Coalesce repeated writes to the same owner/site until a scheduler consumes them. */
    pendingChanges(): StateChange[];
    drainChanges(): StateChange[];
    /** Return the changed owner and its component ancestors up to the root entity. */
    ownerLineage(owner: OwnerId): OwnerId[];
    isAlive(owner: OwnerId): boolean;
    /** Check canonical committed state without creating or dispatching a cell. */
    ownerStateValuesArePrimitive(owner: OwnerId): boolean;
    isWithin(owner: OwnerId, ancestor: OwnerId): boolean;
    hasPendingChanges(): boolean;
    subscribeChanges(listener: (change: StateChange) => void): () => void;
    /** Subscribe to committed state writes without allocating public change records. */
    subscribeDirtyCells(listener: (handle: StateCellHandle, version: number) => void): () => void;
    /** Destroy an owner and all nested keyed/component owners, including state traits. */
    destroyOwner(owner: OwnerId): boolean;
}
export declare function canRetireOwnedWorldOwner(world: OwnerStateWorld, owner: OwnerId): boolean;
export declare function retireOwnedWorldOwner(world: OwnerStateWorld, owner: OwnerId): boolean;
export declare function captureOwnedClosedWorldInputs(world: OwnerStateWorld, requests: readonly {
    owner: OwnerId;
    sites: readonly StateSiteId[];
}[]): readonly OwnedClosedWorldInputRow[] | null;
/** Copy runtime captures into one opaque cut before any private validation. */
export declare function createClosedWorldCellCut(rows: readonly OwnedClosedWorldInputCell[]): ClosedWorldCellCut | null;
/** Validate one captured World cut without consulting public World methods. */
export declare function validateClosedWorldCellCut(world: OwnerStateWorld, cut: ClosedWorldCellCut, phase: "prepared" | "after-host"): boolean;
/** Audit canonical World shape and validate one private cut at this phase. */
export declare function validateCanonicalClosedWorldPhase(world: OwnerStateWorld, cut: ClosedWorldCellCut, phase: "prepared" | "after-host"): CanonicalClosedPhaseStatus;
export {};
//# sourceMappingURL=owner_state_world.d.ts.map