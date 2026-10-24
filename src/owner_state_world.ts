import { ScalarSource, canonicalScalarSourceValue } from "./jsx_binding_runtime.ts";
import { NumericColumn } from "./jsx_binding_runtime.ts";
import {
  OwnedClosedFrameInput, OwnedClosedFrameFill,
  canonicalOwnedClosedFrameFillOwns,
  canonicalOwnedClosedFrameFillWorldAt,
  canonicalOwnedClosedFrameFillRowInputAt,
  canonicalOwnedClosedFrameFillGroupRowAt,
} from "./owned_closed_frame_input.ts";
import {
  compiledStateLayoutSlot,
  compiledStateLayoutSignature,
  normalizeCompiledStateLayout,
  type CompiledStateLayout,
  type NumericLaneAddress,
} from "./compiled_state_layout.ts";
import {
  type PreparedDirtyMembership,
  WorldDirtyJournal,
} from "./world_dirty_journal.ts";

const ownedWorldCaptureKey = Symbol("owned-world-capture");
const ownedWorldRetirementKey = Symbol("owned-world-retirement");
const ownedCaptureArrayPush = Array.prototype.push;
const ownedCaptureApply = Reflect.apply;

/** A component instance in the owner graph. IDs are allocated once and never reused. */
export type OwnerId = number;
export type OwnerKey = string | number | null;
export type StateSiteId = string;
export type StateAction<T> = T | ((previous: T) => T);

type StateCell<T> = {
  value: T;
  /** Private boxed value used only before/after a compiled numeric lane. */
  boxedValue?: unknown;
  version: number;
  /** Compiler intent is retained after promotion so it cannot be re-enabled. */
  stateLayout?: CompiledStateLayout;
  /** Cached slot lookup; undefined is a valid result when resolved is true. */
  numericLaneSlot?: number;
  laneSlotResolved?: boolean;
  /** A nonnumeric runtime value permanently opts this owner/site out of lanes. */
  promoted?: boolean;
  lane?: NumericLaneAddress;
  /** Allocated only on the first committed dispatch for this cell. */
  cellIdentity?: object;
  cellHandle?: StateCellHandle;
  /** Borrowed only while this committed cell occupies a numeric row slot. */
  rowLease?: NumericRowLease;
  /** Cached row projection; it contains no cell reference. */
  rowView?: NumericCellRowView;
  /** Reusable owner/site journal node; it contains no cell payload. */
  dirtyMembership?: PreparedDirtyMembership;
  source?: ScalarSource;
  dispatch: (action: StateAction<T>) => boolean;
};

function getLaneBackedValue(this: StateCell<unknown>): unknown {
  const lane = this.lane;
  return lane ? lane.column.values[lane.row] : this.boxedValue;
}

function setLaneBackedValue(this: StateCell<unknown>, next: unknown): void {
  const lane = this.lane;
  if (!lane) {
    this.boxedValue = next;
    return;
  }
  if (typeof next !== "number") {
    throw new TypeError("Promote a numeric state cell before boxing it");
  }
  lane.column.values[lane.row] = next;
}

const laneBackedValueDescriptor: PropertyDescriptor = {
  configurable: true,
  enumerable: true,
  get: getLaneBackedValue,
  set: setLaneBackedValue,
};

/** Shared-from-birth accessor shape for cells born with a certified numeric slot. */
const compiledNumericStateCellPrototype = Object.create(
  Object.prototype,
  { value: laneBackedValueDescriptor },
);

function isCompiledNumericStateCell(cell: StateCell<unknown>): boolean {
  return Object.getPrototypeOf(cell) === compiledNumericStateCellPrototype;
}

function makeCompiledNumericStateCell<T>(args: {
  value: T;
  version: number;
  layout: CompiledStateLayout;
  slot: number;
  source?: ScalarSource;
  dispatch: (action: StateAction<T>) => boolean;
  promoted?: boolean;
  laneSlotResolved: boolean;
}): StateCell<T> {
  const cell = Object.create(compiledNumericStateCellPrototype) as StateCell<T>;
  // Keep own fields and their insertion order fixed across direct and candidate cells.
  cell.boxedValue = args.value;
  cell.version = args.version;
  cell.stateLayout = args.layout;
  cell.numericLaneSlot = args.slot;
  cell.laneSlotResolved = args.laneSlotResolved;
  cell.source = args.source;
  cell.dispatch = args.dispatch;
  cell.lane = undefined;
  cell.cellIdentity = undefined;
  cell.cellHandle = undefined;
  cell.dirtyMembership = undefined;
  cell.rowLease = undefined;
  cell.rowView = undefined;
  cell.promoted = args.promoted;
  return cell;
}

/** Revocable, opaque authority for one committed cell. */
class CommittedCellCapability {
  #worldSecret: object | null;
  readonly #owner: OwnerId;
  readonly #site: StateSiteId;
  #cell: StateCell<unknown> | null;

  constructor(
    worldSecret: object,
    owner: OwnerId,
    site: StateSiteId,
    cell: StateCell<unknown>,
  ) {
    this.#worldSecret = worldSecret;
    this.#owner = owner;
    this.#site = site;
    this.#cell = cell;
    Object.setPrototypeOf(this, null);
    Object.freeze(this);
  }

  static resolve(
    candidate: unknown,
    worldSecret: object,
    owner: OwnerId,
    site: StateSiteId,
  ): StateCell<unknown> | null {
    if (
      (typeof candidate !== "object" && typeof candidate !== "function") ||
      candidate === null || !(#cell in candidate)
    ) return null;
    const capability = candidate as CommittedCellCapability;
    return capability.#worldSecret === worldSecret &&
        capability.#owner === owner && capability.#site === site
      ? capability.#cell
      : null;
  }

  static resolveLegacyChange(
    candidate: unknown,
    worldSecret: object,
    change: StateChange,
  ): StateCell<unknown> | null {
    if (
      (typeof candidate !== "object" && typeof candidate !== "function") ||
      candidate === null || !(#cell in candidate)
    ) return null;
    const capability = candidate as CommittedCellCapability;
    if (capability.#worldSecret !== worldSecret) return null;
    const cell = capability.#cell;
    return capability.#owner === change.owner &&
        capability.#site === change.site
      ? cell
      : null;
  }

  static revoke(candidate: object, worldSecret: object): void {
    if (!(#cell in candidate)) return;
    const capability = candidate as CommittedCellCapability;
    if (capability.#worldSecret !== worldSecret) return;
    capability.#cell = null;
    capability.#worldSecret = null;
  }
}

/** A row-scoped lease, deliberately free of cell and World references. */
class NumericRowLease {
  #active = true;
  #owner: OwnerId;
  #layout: CompiledStateLayout;
  #row: number;
  #generation: number;
  #columns: NumericColumn[];
  #sources: (ScalarSource | undefined)[];
  #lanes: (NumericLaneAddress | undefined)[];

  constructor(
    owner: OwnerId,
    layout: CompiledStateLayout,
    row: number,
    generation: number,
    columns: NumericColumn[],
  ) {
    this.#owner = owner;
    this.#layout = layout;
    this.#row = row;
    this.#generation = generation;
    this.#columns = [...columns];
    this.#sources = Array(columns.length);
    this.#lanes = Array(columns.length);
    Object.setPrototypeOf(this, null);
    Object.freeze(this);
  }

  static columns(candidate: NumericRowLease): readonly NumericColumn[] {
    return candidate.#columns;
  }

  static sources(
    candidate: NumericRowLease,
  ): readonly (ScalarSource | undefined)[] {
    return candidate.#sources;
  }

  static isCurrent(
    candidate: unknown,
    owner: OwnerId,
    site: StateSiteId,
    layout: CompiledStateLayout,
    lane: NumericLaneAddress,
    slot: number,
    source: ScalarSource,
  ): candidate is NumericRowLease {
    if (
      (typeof candidate !== "object" && typeof candidate !== "function") ||
      candidate === null || !(#active in candidate)
    ) return false;
    return candidate.#active && candidate.#owner === owner &&
      candidate.#row === lane.row &&
      candidate.#generation === lane.generation &&
      candidate.#layout === layout && layout.slots[slot]?.siteId === site &&
      candidate.#columns[slot] === lane.column &&
      candidate.#sources[slot] === source &&
      candidate.#lanes[slot] === lane &&
      lane.owner === owner && lane.site === site;
  }

  static setSlot(
    candidate: NumericRowLease,
    slot: number,
    lane: NumericLaneAddress,
    source: ScalarSource | undefined,
  ): void {
    if (!candidate.#active) return;
    candidate.#sources[slot] = source;
    candidate.#lanes[slot] = lane;
  }

  static setSource(
    candidate: NumericRowLease,
    slot: number,
    source: ScalarSource | undefined,
  ): void {
    if (candidate.#active) {
      candidate.#sources[slot] = source;
    }
  }

  static clearSlot(candidate: NumericRowLease, slot: number): void {
    candidate.#sources[slot] = undefined;
    candidate.#lanes[slot] = undefined;
  }

  static retire(candidate: NumericRowLease): void {
    if (!candidate.#active) return;
    candidate.#sources.fill(undefined);
    candidate.#lanes.fill(undefined);
    candidate.#active = false;
  }
}

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

function makeNumericCellRowView(
  owner: OwnerId,
  site: StateSiteId,
  layout: CompiledStateLayout,
  lease: NumericRowLease,
  lane: NumericLaneAddress,
  slot: number,
  source: ScalarSource,
  sources: readonly (ScalarSource | undefined)[],
  columns: readonly NumericColumn[],
): NumericCellRowView {
  return Object.freeze({
    owner,
    site,
    layout,
    rowIdentity: lease,
    row: lane.row,
    generation: lane.generation,
    slot,
    lane,
    source,
    sources,
    columns,
  });
}

function refreshNumericCellRowView(
  cell: StateCell<unknown>,
  owner: OwnerId,
  site: StateSiteId,
): void {
  const lane = cell.lane;
  const source = cell.source;
  const lease = cell.rowLease;
  const layout = cell.stateLayout;
  const slot = cell.numericLaneSlot;
  cell.rowView = lane && source && lease && layout && slot !== undefined
    ? makeNumericCellRowView(
      owner,
      site,
      layout,
      lease,
      lane,
      slot,
      source,
      NumericRowLease.sources(lease),
      NumericRowLease.columns(lease),
    )
    : undefined;
}

/** Install the column as the only logical-value storage for a committed cell. */
function attachNumericLane(
  cell: StateCell<unknown>,
  lane: NumericLaneAddress,
  lease: NumericRowLease,
  layout: CompiledStateLayout,
  slot: number,
): void {
  const current = cell.value;
  if (typeof current !== "number") {
    throw new TypeError("Only numeric state cells can use numeric lanes");
  }
  lane.column.values[lane.row] = current;
  cell.lane = lane;
  cell.rowLease = lease;
  NumericRowLease.setSlot(lease, slot, lane, cell.source);
  refreshNumericCellRowView(cell, lane.owner, lane.site);
  if (isCompiledNumericStateCell(cell)) {
    cell.boxedValue = undefined;
  } else {
    Object.defineProperty(cell, "value", laneBackedValueDescriptor);
  }
}

/** Restore an ordinary writable value before the row is cleared or reused. */
function detachNumericLane(cell: StateCell<unknown>): NumericLaneAddress | null {
  const lane = cell.lane;
  if (!lane) return null;
  const value = lane.column.values[lane.row];
  if (cell.rowLease && cell.numericLaneSlot !== undefined) {
    NumericRowLease.clearSlot(cell.rowLease, cell.numericLaneSlot);
  }
  cell.rowLease = undefined;
  cell.rowView = undefined;
  if (isCompiledNumericStateCell(cell)) {
    cell.boxedValue = value;
    cell.lane = undefined;
  } else {
    Object.defineProperty(cell, "value", {
      configurable: true,
      enumerable: true,
      writable: true,
      value,
    });
    cell.lane = undefined;
  }
  return lane;
}

type CandidateStateDispatch = {
  candidateCell: StateCell<unknown> | null;
  forward?: (action: StateAction<unknown>) => boolean;
  discarded: boolean;
  dispatch: (action: StateAction<unknown>) => boolean;
};

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

export type OwnedClosedWorldInputBatch = Readonly<{
  rows: readonly OwnedClosedWorldInputRow[];
  cellCut: ClosedWorldCellCut;
}>;

type ClosedWorldCell = Readonly<{
  owner: OwnerId;
  site: StateSiteId;
  identity: object;
  source: ScalarSource;
  version: number;
  value: number;
}>;

const closedWorldCellCutKey = Symbol("closed-world-cell-cut");
class PrivateClosedWorldCellCut {
  readonly #cells: readonly ClosedWorldCell[];

  constructor(key: symbol, cells: readonly ClosedWorldCell[]) {
    if (key !== closedWorldCellCutKey) throw new TypeError("Invalid World cell cut");
    this.#cells = cells;
    Object.setPrototypeOf(this, null);
    Object.freeze(this);
  }

  static cells(candidate: unknown): readonly ClosedWorldCell[] | null {
    return typeof candidate === "object" && candidate !== null &&
        #cells in candidate
      ? candidate.#cells
      : null;
  }
}

/** Candidate-local captured cells, privately copied for one publication cut. */
export type ClosedWorldCellCut = PrivateClosedWorldCellCut;
export type CanonicalClosedPhaseStatus = "current" | "stale" | "public-required";

type OwnerRecord = {
  id: OwnerId;
  parent: OwnerId | null;
  componentSiteId: string;
  key: OwnerKey;
  children: Set<OwnerId>;
  /** Changes for any direct child slot mutation; avoids per-key tombstones. */
  childrenVersion: number;
};

type NumericLayoutRecord = {
  layout: CompiledStateLayout;
  signature: string;
  slotsBySite: Map<StateSiteId, number>;
  columns: NumericColumn[];
  generations: number[];
  freeRows: number[];
  nextRow: number;
  rowsByOwner: Map<OwnerId, {
    row: number;
    generation: number;
    cells: number;
    lease: NumericRowLease;
  }>;
};

export type StateChange = {
  readonly owner: OwnerId;
  readonly site: StateSiteId;
  readonly version: number;
  /** Stable opaque identity for committed world notifications; legacy records may omit it. */
  readonly cellIdentity?: object;
};

const ownerPreparationCheckpointBrand: unique symbol = Symbol(
  "OwnerPreparationCheckpoint",
);
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
  resolveOwner(
    parent: OwnerId | null,
    componentSiteId: string,
    key?: OwnerKey,
  ): OwnerId;
  /** Resolve from this candidate's slot overlay, then its pinned committed view. */
  findOwner(
    parent: OwnerId | null,
    componentSiteId: string,
    key?: OwnerKey,
  ): OwnerId | undefined;
  /** Create a fresh private incarnation that shadows the current slot until publish. */
  replaceOwner(
    parent: OwnerId | null,
    componentSiteId: string,
    key?: OwnerKey,
  ): OwnerId;
  useState<T>(
    owner: OwnerId,
    site: StateSiteId,
    initial: T | (() => T),
    layout?: CompiledStateLayout,
  ): readonly [T, (action: StateAction<T>) => boolean];
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
export class OwnerStateWorld {
  static #nextSourceId = 1;
  #nextOwner = 1;
  #owners = new Map<OwnerId, OwnerRecord>();
  #childrenBySlot = new Map<
    OwnerId | null,
    Map<string, Map<OwnerKey, OwnerId>>
  >();
  #rootChildrenVersion = 0;
  #stateByOwner = new Map<OwnerId, Map<StateSiteId, StateCell<unknown>>>();
  #numericLayouts = new WeakMap<object, NumericLayoutRecord>();
  #identitySecret = Object.freeze({});
  #dirtyJournal = new WorldDirtyJournal();
  #changeListeners = new Set<(change: StateChange) => void>();
  #dirtyCellListeners:
    readonly ((handle: StateCellHandle, version: number) => void)[] = [];
  #claimedRootIds = new Map<string, OwnerId>();
  #stagedOwners = new Set<OwnerId>();

  static _canRetireOwnedOwner(
    key: symbol,
    world: OwnerStateWorld,
    owner: OwnerId,
  ): boolean {
    if (key !== ownedWorldRetirementKey) return false;
    if (typeof world !== "object" || world === null || !(#owners in world)) return false;
    return Number.isSafeInteger(owner) && world.#canRetireOwnedOwner(owner);
  }

  static _retireOwnedOwner(
    key: symbol,
    world: OwnerStateWorld,
    owner: OwnerId,
  ): boolean {
    if (key !== ownedWorldRetirementKey) return false;
    if (typeof world !== "object" || world === null || !(#owners in world)) return false;
    if (!Number.isSafeInteger(owner) || !world.#canRetireOwnedOwner(owner)) return false;
    return world.#destroyOwner(owner, true);
  }

  static _captureOwnedClosedInputs(
    key: symbol,
    world: OwnerStateWorld,
    requests: readonly { owner: OwnerId; sites: readonly StateSiteId[] }[] |
      OwnedClosedFrameFill,
    includeCut = false,
  ): OwnedClosedWorldInputBatch | readonly OwnedClosedWorldInputRow[] | null {
    if (key !== ownedWorldCaptureKey) return null;
    if (typeof world !== "object" || world === null || !(#owners in world)) return null;
    try {
      if (!OwnerStateWorld.#closedCaptureShapeCanonical(world)) return null;
      const rows: OwnedClosedWorldInputRow[] = [];
      const capturedCells: ClosedWorldCell[] = [];
      const byOwner = includeCut
        ? new Map<OwnerId, Map<StateSiteId, ClosedWorldCell>>() : null;
      const schedule = canonicalOwnedClosedFrameFillOwns(requests) ? requests : null;
      const requestCount = schedule ? schedule.rowCount :
        (requests as readonly { owner: OwnerId; sites: readonly StateSiteId[] }[]).length;
      for (let requestIndex = 0; requestIndex < requestCount; requestIndex++) {
        const scheduledWorld = schedule
          ? canonicalOwnedClosedFrameFillWorldAt.call(schedule, requestIndex) : null;
        const scheduledInput = schedule
          ? canonicalOwnedClosedFrameFillRowInputAt.call(schedule, requestIndex) : null;
        const scheduledGroupRow = schedule
          ? canonicalOwnedClosedFrameFillGroupRowAt.call(schedule, requestIndex) : -1;
        const request = scheduledWorld
          ? canonicalUnwrapOwnedWorldInputRequest(ownedWorldInputBindingKey,
            scheduledWorld)
          : (requests as readonly { owner: OwnerId;
            sites: readonly StateSiteId[] }[])[requestIndex];
        if (!request) return null;
        if (scheduledInput && (!OwnedClosedFrameInput.owns(scheduledInput) ||
          !Number.isSafeInteger(scheduledGroupRow) || scheduledGroupRow < 0 ||
          scheduledInput.varyingCount < request.sites.length)) return null;
        const owner = request.owner;
        if (!Number.isSafeInteger(owner) || !world.#owners.has(owner) ||
          world.#stagedOwners.has(owner)) return null;
        const lineage: OwnerId[] = [];
        let ancestor: OwnerId | null = owner;
        while (ancestor !== null) {
          ownedCaptureApply(ownedCaptureArrayPush, lineage, [ancestor]);
          ancestor = world.#owners.get(ancestor)!.parent;
        }
        const cells: OwnedClosedWorldInputCell[] = [];
        for (let siteIndex = 0; siteIndex < request.sites.length; siteIndex++) {
          const site = request.sites[siteIndex];
          const cell = world.#stateByOwner.get(owner)?.get(site);
          if (!cell || cell.lane || !cell.source) return null;
          const descriptor = Object.getOwnPropertyDescriptor(cell, "value");
          const value = descriptor && "value" in descriptor ? descriptor.value : undefined;
          const sourceValue = canonicalScalarSourceValue(cell.source);
          if (typeof value !== "number" || !Number.isFinite(value) ||
            sourceValue === null || !Object.is(value, sourceValue)) return null;
          if (scheduledInput) scheduledInput.setVarying(
            scheduledGroupRow * scheduledInput.varyingCount + siteIndex, value,
          );
          const handle = world.#handleForCell(owner, site, cell);
          if (byOwner) {
            const captured = Object.freeze({
              owner, site, identity: handle.cellIdentity, source: cell.source,
              version: cell.version, value,
            });
            let sites = byOwner.get(owner);
            if (!sites) byOwner.set(owner, sites = new Map());
            const previous = sites.get(site);
            if (previous) {
              if (previous.identity !== captured.identity ||
                previous.source !== captured.source ||
                previous.version !== captured.version ||
                !Object.is(previous.value, captured.value)) return null;
            } else {
              sites.set(site, captured);
              ownedCaptureApply(ownedCaptureArrayPush, capturedCells, [captured]);
            }
          }
          ownedCaptureApply(ownedCaptureArrayPush, cells, [Object.freeze({
            handle,
            source: cell.source,
            version: cell.version,
            value,
          })]);
        }
        ownedCaptureApply(ownedCaptureArrayPush, rows, [Object.freeze({ owner,
          lineage: Object.freeze(lineage), cells: Object.freeze(cells) })]);
      }
      const frozenRows = Object.freeze(rows);
      return includeCut ? Object.freeze({ rows: frozenRows, cellCut:
        new PrivateClosedWorldCellCut(closedWorldCellCutKey, Object.freeze(capturedCells)) })
        : frozenRows;
    } catch (error) {
      if (error instanceof TypeError) return null;
      throw error;
    }
  }

  static _validateClosedCellCut(
    key: symbol,
    world: OwnerStateWorld,
    cut: ClosedWorldCellCut,
    phase: "prepared" | "after-host",
  ): boolean {
    if (key !== closedWorldCellCutKey ||
      (phase !== "prepared" && phase !== "after-host") ||
      typeof world !== "object" || world === null || !(#owners in world)) return false;
    return OwnerStateWorld.#closedCellCutStatus(world, cut, phase) === "current";
  }

  static #closedCaptureShapeCanonical(world: OwnerStateWorld): boolean {
    if (Object.getPrototypeOf(world) !== OwnerStateWorld.prototype) return false;
    for (const name of closedWorldCaptureMethods) {
      if (Object.hasOwn(world, name)) return false;
      const current = Object.getOwnPropertyDescriptor(OwnerStateWorld.prototype, name);
      const expected = closedWorldCaptureDescriptors.get(name);
      if (!current || !expected || current.value !== expected.value ||
        current.get !== expected.get || current.set !== expected.set ||
        current.writable !== expected.writable ||
        current.enumerable !== expected.enumerable ||
        current.configurable !== expected.configurable) return false;
    }
    return true;
  }

  static #closedCellCutStatus(
    world: OwnerStateWorld,
    cut: ClosedWorldCellCut,
    phase: "prepared" | "after-host",
  ): CanonicalClosedPhaseStatus {
    const rows = PrivateClosedWorldCellCut.cells(cut);
    if (!rows) return "public-required";
    for (const row of rows) {
      if (!world.#owners.has(row.owner) || world.#stagedOwners.has(row.owner)) return "stale";
      const cell = world.#resolveCellIdentity(row.identity, row.owner, row.site);
      if (!cell || world.#stateByOwner.get(row.owner)?.get(row.site) !== cell ||
        cell.source !== row.source) return "stale";
      if (cell.lane) return "public-required";
      const valueDescriptor = Object.getOwnPropertyDescriptor(cell, "value");
      if (!valueDescriptor || !("value" in valueDescriptor)) return "public-required";
      const value = valueDescriptor.value;
      const sourceValue = canonicalScalarSourceValue(row.source);
      if (sourceValue === null || typeof value !== "number") return "public-required";
      if (!Object.is(value, sourceValue) || cell.version < row.version ||
        (phase === "prepared" && cell.version !== row.version) ||
        (cell.version === row.version && !Object.is(value, row.value))) return "stale";
    }
    return "current";
  }

  static _validateCanonicalClosedPhase(
    key: symbol,
    world: OwnerStateWorld,
    cut: ClosedWorldCellCut,
    phase: "prepared" | "after-host",
  ): CanonicalClosedPhaseStatus {
    if (key !== closedWorldCellCutKey ||
      (phase !== "prepared" && phase !== "after-host") ||
      typeof world !== "object" || world === null || !(#owners in world)) return "public-required";
    if (!PrivateClosedWorldCellCut.cells(cut)) return "public-required";
    try {
      if (!OwnerStateWorld.#closedCaptureShapeCanonical(world)) return "public-required";
      return OwnerStateWorld.#closedCellCutStatus(world, cut, phase);
    } catch (error) {
      if (error instanceof TypeError) return "public-required";
      throw error;
    }
  }

  #layoutRecord(owner: OwnerId, layout: CompiledStateLayout) {
    if (!this.#owners.has(owner)) throw new Error(`Owner ${owner} is not alive`);
    const normalized = normalizeCompiledStateLayout(layout);
    const signature = compiledStateLayoutSignature(normalized);
    let storage = this.#numericLayouts.get(normalized as object);
    if (storage) {
      if (storage.signature !== signature) {
        throw new Error("Compiled state layout descriptor changed");
      }
      return storage;
    }
    const slotsBySite = new Map<StateSiteId, number>();
    const columns = normalized.slots.map(({ siteId, slot }) => {
      slotsBySite.set(siteId, slot);
      return new NumericColumn(
        OwnerStateWorld.#nextSourceId++,
        slot,
        new Float64Array(0),
      );
    });
    storage = {
      layout: normalized,
      signature,
      slotsBySite,
      columns,
      generations: [],
      freeRows: [],
      nextRow: 0,
      rowsByOwner: new Map(),
    };
    this.#numericLayouts.set(normalized as object, storage);
    return storage;
  }

  #ensureCellLayout(
    owner: OwnerId,
    site: StateSiteId,
    cell: StateCell<unknown>,
    layout?: CompiledStateLayout,
  ) {
    if (!layout) return;
    const normalized = normalizeCompiledStateLayout(layout);
    if (cell.stateLayout && cell.laneSlotResolved) {
      if (compiledStateLayoutSignature(cell.stateLayout) !==
        compiledStateLayoutSignature(normalized)) {
        throw new Error("State cell received a different compiled layout");
      }
      return;
    }
    let canonical = normalized;
    if (cell.stateLayout) {
      if (compiledStateLayoutSignature(cell.stateLayout) !==
        compiledStateLayoutSignature(normalized)) {
        throw new Error("State cell received a different compiled layout");
      }
      canonical = cell.stateLayout;
    }
    // Validate component-site ownership and descriptor consistency now, while
    // owner activation is already in progress.
    this.#layoutRecord(owner, canonical);
    cell.stateLayout = canonical;
    cell.numericLaneSlot = compiledStateLayoutSlot(canonical, site);
    cell.laneSlotResolved = true;
    if (cell.numericLaneSlot !== undefined && typeof cell.value !== "number") {
      cell.promoted = true;
    }
  }

  #laneIsCurrent<T>(
    owner: OwnerId,
    site: StateSiteId,
    cell: StateCell<T>,
    lane: NumericLaneAddress,
  ) {
    return this.#owners.has(owner) &&
      this.#stateByOwner.get(owner)?.get(site) === cell &&
      this.#laneAddressIsCurrent(owner, site, cell, lane);
  }

  #laneAddressIsCurrent<T>(
    owner: OwnerId,
    site: StateSiteId,
    cell: StateCell<T>,
    lane: NumericLaneAddress,
  ) {
    const layout = cell.stateLayout;
    const slot = cell.numericLaneSlot;
    const lease = cell.rowLease;
    const source = cell.source;
    return !!layout && slot !== undefined && !!lease && !!source &&
      NumericRowLease.isCurrent(
        lease,
        owner,
        site,
        layout,
        lane,
        slot,
        source,
      ) && cell.lane === lane && cell.rowView?.rowIdentity === lease &&
      !cell.promoted && typeof cell.value === "number";
  }

  #ensureNumericLane(
    owner: OwnerId,
    site: StateSiteId,
    cell: StateCell<unknown>,
  ): NumericLaneAddress | null {
    const layout = cell.stateLayout;
    if (!layout || cell.promoted) return null;
    const slot = cell.numericLaneSlot;
    if (slot === undefined) return null;
    if (typeof cell.value !== "number") {
      cell.promoted = true;
      this.#releaseNumericLane(owner, site, cell);
      return null;
    }
    const existing = cell.lane;
    if (existing && this.#laneAddressIsCurrent(owner, site, cell, existing)) {
      return existing;
    }
    const storage = this.#layoutRecord(owner, layout);
    if (existing) this.#releaseNumericLane(owner, site, cell);
    let row = storage.rowsByOwner.get(owner);
    if (!row) {
      const recycled = storage.freeRows.pop();
      const rowIndex = recycled ?? storage.nextRow;
      const generation = storage.generations[rowIndex] ?? 1;
      try {
        for (const column of storage.columns) column.reserve(rowIndex + 1);
        row = {
          row: rowIndex,
          generation,
          cells: 0,
          lease: new NumericRowLease(owner, layout, rowIndex, generation, storage.columns),
        };
      } catch (error) {
        if (recycled !== undefined) storage.freeRows.push(recycled);
        throw error;
      }
      storage.generations[rowIndex] = generation;
      if (recycled === undefined) storage.nextRow++;
      storage.rowsByOwner.set(owner, row);
    }
    let counted = false;
    try {
      const column = storage.columns[slot];
      column.reserve(row.row + 1);
      const lane: NumericLaneAddress = Object.freeze({
        column,
        row: row.row,
        generation: row.generation,
        owner,
        site,
      });
      row.cells++;
      counted = true;
      attachNumericLane(cell, lane, row.lease, layout, slot);
      return lane;
    } catch (error) {
      if (cell.lane) this.#releaseNumericLane(owner, site, cell);
      else if (counted) row.cells--;
      if (row.cells === 0 && storage.rowsByOwner.get(owner) === row) {
        NumericRowLease.retire(row.lease);
        storage.rowsByOwner.delete(owner);
        storage.generations[row.row] = row.generation + 1;
        storage.freeRows.push(row.row);
      }
      throw error;
    }
  }

  #attachOptionalNumericLane(
    owner: OwnerId,
    site: StateSiteId,
    cell: StateCell<unknown>,
  ): void {
    if (!cell.stateLayout || cell.promoted ||
      typeof cell.value !== "number") return;
    try {
      this.#ensureNumericLane(owner, site, cell);
    } catch {
      this.#releaseNumericLane(owner, site, cell);
      cell.promoted = true;
    }
  }

  #releaseNumericLane(
    owner: OwnerId,
    site: StateSiteId,
    cell: StateCell<unknown>,
  ) {
    const lane = cell.lane;
    if (!lane) return;
    const detached = detachNumericLane(cell);
    if (!detached) return;
    const storage = cell.stateLayout
      ? this.#numericLayouts.get(cell.stateLayout as object)
      : undefined;
    const row = storage?.rowsByOwner.get(owner);
    const slot = storage?.slotsBySite.get(site);
    if (!storage || !row || slot === undefined || row.row !== lane.row) return;
    lane.column.values[lane.row] = 0;
    row.cells--;
    if (row.cells !== 0) return;
    NumericRowLease.retire(row.lease);
    for (const column of storage.columns) column.values[row.row] = 0;
    const nextGeneration = row.generation + 1;
    storage.generations[row.row] = nextGeneration;
    storage.freeRows.push(row.row);
    storage.rowsByOwner.delete(owner);
  }

  #readStateValue<T>(owner: OwnerId, site: StateSiteId, cell: StateCell<T>): T {
    void owner;
    void site;
    return cell.value;
  }

  /** Begin an isolated owner/state view for one candidate preparation attempt. */
  beginPreparation(): OwnerPreparation {
    let state: "open" | "published" | "discarded" = "open";
    let publicationPrepared = false;
    let hostApplication = false;
    let preserveNewerCells = false;
    let publicationRecords: OwnerRecord[] = [];
    const publicationSiteMaps = new Map<OwnerId, Map<StateSiteId, StateCell<unknown>>>();
    const publicationParentMaps = new Map<OwnerId | null, Map<string, Map<OwnerKey, OwnerId>>>();
    const publicationSlotMaps = new Map<OwnerId | null, Map<string, Map<OwnerKey, OwnerId>>>();
    const publicationLayoutSlots = new Map<StateCell<unknown>, number | undefined>();
    const publicationSources = new Map<StateCell<unknown>, ScalarSource>();
    const publicationDispatches = new Map<StateCell<unknown>, (action: StateAction<unknown>) => boolean>();
    let hasStateWrites = false;
    const privateOwners = new Map<OwnerId, OwnerRecord>();
    const privateSlots = new Map<
      OwnerId | null,
      Map<string, Map<OwnerKey, OwnerId>>
    >();
    const expectedSlots = new Map<
      OwnerId | null,
      Map<
        string,
        Map<OwnerKey, {
          parent: OwnerId | null;
          site: string;
          key: OwnerKey;
          owner: OwnerId | undefined;
          parentVersion: number;
          retained: boolean;
        }>
      >
    >();
    const expectedCells = new Map<
      OwnerId,
      Map<StateSiteId, {
        cell: StateCell<unknown> | undefined;
        version: number;
      }>
    >();
    const candidateCells = new Map<
      OwnerId,
      Map<StateSiteId, StateCell<unknown>>
    >();
    const candidateInitialValues = new Map<
      OwnerId,
      Map<StateSiteId, unknown>
    >();
    const candidateDispatches = new Map<
      OwnerId,
      Map<StateSiteId, CandidateStateDispatch>
    >();
    const undoJournal: Array<() => void> = [];
    const preparationIdentity = {};
    type CheckpointNode = {
      previous: CheckpointNode | null;
      active: boolean;
      valid: boolean;
    };
    type CheckpointMetadata = {
      preparation: object;
      cursor: number;
      node: CheckpointNode;
    };
    let checkpointMetadata = new WeakMap<object, CheckpointMetadata>();
    let checkpointTop: CheckpointNode | null = null;
    let activeCheckpointCount = 0;
    const recordUndo = (undo: () => void) => undoJournal.push(undo);
    const setMap = <K, V>(map: Map<K, V>, key: K, value: V) => {
      if (activeCheckpointCount !== 0) {
        const existed = map.has(key);
        const previous = map.get(key);
        recordUndo(() => {
          if (existed) map.set(key, previous!);
          else map.delete(key);
        });
      }
      map.set(key, value);
    };
    const deleteMap = <K, V>(map: Map<K, V>, key: K) => {
      if (!map.has(key)) return;
      if (activeCheckpointCount !== 0) {
        const previous = map.get(key)!;
        recordUndo(() => map.set(key, previous));
      }
      map.delete(key);
    };
    const pruneCheckpointTop = () => {
      while (checkpointTop && !checkpointTop.active) {
        checkpointTop = checkpointTop.previous;
      }
    };
    const checkpointFor = (checkpoint: OwnerPreparationCheckpoint) => {
      const metadata = checkpointMetadata.get(checkpoint as object);
      if (
        !metadata || metadata.preparation !== preparationIdentity ||
        !metadata.node.valid || !metadata.node.active
      ) {
        throw new Error("Owner preparation checkpoint is invalid");
      }
      return metadata;
    };

    const assertOpen = (allowPrepared = false) => {
      if (state !== "open") throw new Error(`Owner preparation is ${state}`);
      if (publicationPrepared && !allowPrepared) {
        throw new Error("Owner publication has already been prepared");
      }
    };
    const getPrivateSlot = (
      parent: OwnerId | null,
      site: string,
      key: OwnerKey,
    ) => privateSlots.get(parent)?.get(site)?.get(key);
    const putPrivateSlot = (
      parent: OwnerId | null,
      site: string,
      key: OwnerKey,
      owner: OwnerId,
    ) => {
      let bySite = privateSlots.get(parent);
      if (!bySite) {
        bySite = new Map();
        setMap(privateSlots, parent, bySite);
      }
      let byKey = bySite.get(site);
      if (!byKey) {
        byKey = new Map();
        setMap(bySite, site, byKey);
      }
      setMap(byKey, key, owner);
    };
    const captureSlot = (
      parent: OwnerId | null,
      site: string,
      key: OwnerKey,
    ) => {
      const existing = expectedSlots.get(parent)?.get(site)?.get(key);
      if (existing) return existing;
      const owner = this.#childrenBySlot.get(parent)?.get(site)?.get(key);
      const captured = {
        parent,
        site,
        key,
        owner,
        parentVersion: this.#parentChildrenVersion(parent),
        retained: false,
      };
      let bySite = expectedSlots.get(parent);
      if (!bySite) {
        bySite = new Map();
        setMap(expectedSlots, parent, bySite);
      }
      let byKey = bySite.get(site);
      if (!byKey) {
        byKey = new Map();
        setMap(bySite, site, byKey);
      }
      setMap(byKey, key, captured);
      return captured;
    };
    const retainSlot = (captured: {
      retained: boolean;
    }) => {
      if (captured.retained) return;
      if (activeCheckpointCount !== 0) {
        recordUndo(() => captured.retained = false);
      }
      captured.retained = true;
    };
    const ownerRecord = (owner: OwnerId) => {
      const record = privateOwners.get(owner) ?? this.#owners.get(owner);
      if (!record) {
        throw new Error(`Owner ${owner} is not alive in this preparation`);
      }
      if (!privateOwners.has(owner)) {
        const slot = captureSlot(
          record.parent,
          record.componentSiteId,
          record.key,
        );
        retainSlot(slot);
        if (slot.owner !== owner) {
          throw new Error(
            `Owner ${owner} no longer occupies its committed slot`,
          );
        }
      }
      return record;
    };
    const captureCell = (owner: OwnerId, site: StateSiteId) => {
      let sites = expectedCells.get(owner);
      if (!sites) {
        sites = new Map();
        setMap(expectedCells, owner, sites);
      }
      let captured = sites.get(site);
      if (!captured) {
        const cell = this.#stateByOwner.get(owner)?.get(site);
        captured = { cell, version: cell?.version ?? 0 };
        setMap(sites, site, captured);
      }
      return captured;
    };
    const installSlot = (record: OwnerRecord) => {
      let bySite = this.#childrenBySlot.get(record.parent);
      if (!bySite) {
        bySite = publicationParentMaps.get(record.parent)!;
        this.#childrenBySlot.set(record.parent, bySite);
      }
      let byKey = bySite.get(record.componentSiteId);
      if (!byKey) {
        byKey = publicationSlotMaps.get(record.parent)?.get(record.componentSiteId)!;
        bySite.set(record.componentSiteId, byKey);
      }
      byKey.set(record.key, record.id);
      if (record.parent !== null) {
        this.#owners.get(record.parent)!.children.add(record.id);
      }
      this.#bumpParentChildrenVersion(record.parent);
    };
    const makeCandidateCell = <T>(
      owner: OwnerId,
      site: StateSiteId,
      initial: T | (() => T),
      layout?: CompiledStateLayout,
    ) => {
      let sites = candidateCells.get(owner);
      if (!sites) {
        sites = new Map();
        setMap(candidateCells, owner, sites);
      }
      let cell = sites.get(site) as StateCell<T> | undefined;
      if (cell) {
        if (layout) {
          const normalized = normalizeCompiledStateLayout(layout);
          if (cell.stateLayout &&
            compiledStateLayoutSignature(cell.stateLayout) !==
              compiledStateLayoutSignature(normalized)) {
            throw new Error("State cell received a different compiled layout");
          }
          const oldLayout = cell.stateLayout;
          const oldPromoted = cell.promoted;
          const oldNumericLaneSlot = cell.numericLaneSlot;
          const oldLaneSlotResolved = cell.laneSlotResolved;
          if (activeCheckpointCount !== 0) {
            recordUndo(() => {
              cell!.stateLayout = oldLayout;
              cell!.promoted = oldPromoted;
              cell!.numericLaneSlot = oldNumericLaneSlot;
              cell!.laneSlotResolved = oldLaneSlotResolved;
            });
          }
          if (!cell.stateLayout) cell.stateLayout = normalized;
          const slot = compiledStateLayoutSlot(normalized, site);
          cell.numericLaneSlot = slot;
          cell.laneSlotResolved = true;
          if (slot !== undefined && typeof cell.value !== "number") {
            cell.promoted = true;
          }
        }
        return cell;
      }
      const committed = privateOwners.has(owner)
        ? undefined
        : captureCell(owner, site).cell as StateCell<T> | undefined;
      const normalizedLayout = layout
        ? normalizeCompiledStateLayout(layout)
        : committed?.stateLayout;
      if (layout && committed?.stateLayout &&
        compiledStateLayoutSignature(committed.stateLayout) !==
          compiledStateLayoutSignature(normalizedLayout!)) {
        throw new Error("State cell received a different compiled layout");
      }
      const value = committed
        ? committed.value
        : typeof initial === "function"
        ? (initial as () => T)()
        : initial;
      const stateLayout = committed?.stateLayout ?? normalizedLayout;
      const numericLaneSlot = stateLayout
        ? compiledStateLayoutSlot(stateLayout, site)
        : undefined;
      const source = committed?.source
        ? new ScalarSource(committed.source.id, committed.source.value)
        : typeof value === "number"
        ? new ScalarSource(OwnerStateWorld.#nextSourceId++, value)
        : undefined;
      const promoted = committed?.promoted ||
        (numericLaneSlot !== undefined && typeof value !== "number")
        ? true
        : undefined;
      if (
        stateLayout && numericLaneSlot !== undefined &&
        typeof value === "number" && !promoted
      ) {
        cell = makeCompiledNumericStateCell<T>({
          value: value as T,
          version: committed?.version ?? 0,
          layout: stateLayout,
          slot: numericLaneSlot,
          source,
          dispatch: () => false,
          laneSlotResolved: true,
        });
      } else {
        cell = {
          value,
          version: committed?.version ?? 0,
          ...(stateLayout ? { stateLayout } : {}),
          ...(stateLayout ? { numericLaneSlot, laneSlotResolved: true } : {}),
          ...(promoted ? { promoted: true } : {}),
          ...(source ? { source } : {}),
          dirtyMembership: undefined,
          cellIdentity: undefined,
          cellHandle: undefined,
          rowLease: undefined,
          rowView: undefined,
          dispatch: () => false,
        };
      }
      setMap(sites, site, cell as StateCell<unknown>);
      let initialBySite = candidateInitialValues.get(owner);
      if (!initialBySite) {
        initialBySite = new Map();
        setMap(candidateInitialValues, owner, initialBySite);
      }
      setMap(initialBySite, site, committed?.value);
      return cell;
    };

    const prepareAcceptedData = () => {
      publicationRecords = [...privateOwners.values()];
      for (const record of publicationRecords) {
        const currentParent = this.#childrenBySlot.get(record.parent);
        let preparedParent = publicationParentMaps.get(record.parent);
        if (!currentParent && !preparedParent) {
          preparedParent = new Map();
          publicationParentMaps.set(record.parent, preparedParent);
        }
        const bySite = currentParent ?? preparedParent!;
        if (!bySite.has(record.componentSiteId)) {
          let slots = publicationSlotMaps.get(record.parent);
          if (!slots) {
            slots = new Map();
            publicationSlotMaps.set(record.parent, slots);
          }
          if (!slots.has(record.componentSiteId)) {
            slots.set(record.componentSiteId, new Map());
          }
        }
      }
      for (const [owner, sites] of candidateCells) {
        if (!this.#stateByOwner.has(owner)) {
          publicationSiteMaps.set(owner, new Map());
        }
        for (const [site, candidate] of sites) {
          const existing = this.#stateByOwner.get(owner)?.get(site);
          const layout = candidate.stateLayout;
          if (layout) {
            const normalized = normalizeCompiledStateLayout(layout);
            const signature = compiledStateLayoutSignature(normalized);
            if (existing?.stateLayout &&
              compiledStateLayoutSignature(existing.stateLayout) !== signature) {
              throw new Error("State cell received a different compiled layout");
            }
            const storage = this.#numericLayouts.get(normalized as object);
            if (storage && storage.signature !== signature) {
              throw new Error("Compiled state layout descriptor changed");
            }
            publicationLayoutSlots.set(candidate, compiledStateLayoutSlot(normalized, site));
          }
          if (!existing) {
            publicationDispatches.set(
              candidate,
              (action) => this.#dispatchState(owner, site, candidate, action),
            );
          } else if (candidate.version !== existing.version &&
            typeof candidate.value === "number" && !existing.source) {
            publicationSources.set(
              candidate,
              candidate.source ?? new ScalarSource(
                OwnerStateWorld.#nextSourceId++,
                candidate.value,
              ),
            );
          }
        }
      }
      publicationPrepared = true;
    };

    const preparation: OwnerPreparation = {
      resolveOwner: (parent, componentSiteId, key = null) => {
        assertOpen();
        if (!componentSiteId) {
          throw new Error("Component site ID must not be empty");
        }
        if (parent !== null) ownerRecord(parent);
        const overlay = getPrivateSlot(parent, componentSiteId, key);
        if (overlay !== undefined) return overlay;
        if (privateOwners.has(parent as OwnerId)) {
          const id = this.#nextOwner++;
          const record: OwnerRecord = {
            id,
            parent,
            componentSiteId,
            key,
            children: new Set(),
            childrenVersion: 0,
          };
          setMap(privateOwners, id, record);
          putPrivateSlot(parent, componentSiteId, key, id);
          return id;
        }
        const expected = captureSlot(parent, componentSiteId, key);
        if (expected.owner !== undefined) retainSlot(expected);
        if (expected.owner !== undefined) return expected.owner;
        const id = this.#nextOwner++;
        setMap(privateOwners, id, {
          id,
          parent,
          componentSiteId,
          key,
          children: new Set(),
          childrenVersion: 0,
        });
        putPrivateSlot(parent, componentSiteId, key, id);
        return id;
      },
      findOwner: (parent, componentSiteId, key = null) => {
        assertOpen();
        if (!componentSiteId) {
          throw new Error("Component site ID must not be empty");
        }
        if (parent !== null) ownerRecord(parent);
        const privateOwner = getPrivateSlot(parent, componentSiteId, key);
        if (privateOwner !== undefined) return privateOwner;
        if (parent !== null && privateOwners.has(parent)) return undefined;
        const expected = captureSlot(parent, componentSiteId, key);
        retainSlot(expected);
        return expected.owner;
      },
      replaceOwner: (parent, componentSiteId, key = null) => {
        assertOpen();
        if (!componentSiteId) {
          throw new Error("Component site ID must not be empty");
        }
        if (parent !== null) ownerRecord(parent);
        if (parent === null || !privateOwners.has(parent)) {
          // Pin both the old occupant and the parent's shape generation. A
          // sibling edit or replacement before publish makes this candidate stale.
          captureSlot(parent, componentSiteId, key);
        }
        const id = this.#nextOwner++;
        const record: OwnerRecord = {
          id,
          parent,
          componentSiteId,
          key,
          children: new Set(),
          childrenVersion: 0,
        };
        setMap(privateOwners, id, record);
        putPrivateSlot(parent, componentSiteId, key, id);
        return id;
      },
      useState: <T>(
        owner: OwnerId,
        site: StateSiteId,
        initial: T | (() => T),
        layout?: CompiledStateLayout,
      ) => {
        assertOpen();
        ownerRecord(owner);
        if (!site) throw new Error("State site ID must not be empty");
        const cell = makeCandidateCell(owner, site, initial, layout);
        let dispatches = candidateDispatches.get(owner);
        if (!dispatches) {
          dispatches = new Map();
          setMap(candidateDispatches, owner, dispatches);
        }
        let control = dispatches.get(site);
        if (!control) {
          control = {
            candidateCell: cell as StateCell<unknown>,
            discarded: false,
            dispatch: (action) => false,
          };
          control.dispatch = (action: StateAction<unknown>): boolean => {
            if (control!.discarded) return false;
            if (control!.forward) return control!.forward(action);
            if (hostApplication) return false;
            const candidate = control!.candidateCell as StateCell<T> | null;
            if (!candidate) return false;
            const typedAction = action as StateAction<T>;
            const previous = candidate.value;
            const next = typeof typedAction === "function"
              ? (typedAction as (previous: T) => T)(previous)
              : typedAction;
            if (Object.is(previous, next)) return false;
            const previousVersion = candidate.version;
            const previousSource = candidate.source;
            const previousSourceValue = previousSource?.value;
            const previousPromoted = candidate.promoted;
            const previousHasStateWrites = hasStateWrites;
            if (activeCheckpointCount !== 0) {
              recordUndo(() => {
                candidate.value = previous;
                candidate.version = previousVersion;
                candidate.source = previousSource;
                candidate.promoted = previousPromoted;
                if (previousSource && previousSourceValue !== undefined) {
                  previousSource.value = previousSourceValue;
                }
                hasStateWrites = previousHasStateWrites;
              });
            }
            candidate.value = next;
            candidate.version++;
            if (
              candidate.numericLaneSlot !== undefined &&
              typeof next !== "number"
            ) candidate.promoted = true;
            hasStateWrites = true;
            if (typeof next === "number") {
              candidate.source ??= new ScalarSource(
                OwnerStateWorld.#nextSourceId++,
                next,
              );
              candidate.source.value = next;
            }
            return true;
          };
          setMap(dispatches, site, control);
          if (activeCheckpointCount !== 0) {
            const newControl = control;
            recordUndo(() => {
              newControl.candidateCell = null;
              newControl.forward = undefined;
              newControl.discarded = true;
            });
          }
        }
        return [
          cell.value,
          control.dispatch as (action: StateAction<T>) => boolean,
        ] as const;
      },
      scalarSource: (owner, site) => {
        assertOpen();
        ownerRecord(owner);
        const candidate = candidateCells.get(owner)?.get(site);
        if (candidate) {
          return typeof candidate.value === "number"
            ? candidate.source ?? null
            : null;
        }
        if (privateOwners.has(owner)) return null;
        const committed = captureCell(owner, site).cell;
        if (typeof committed?.value !== "number") return null;
        const snapshot = makeCandidateCell(owner, site, committed.value);
        return snapshot.source ?? null;
      },
      hasStateWrites: () => hasStateWrites,
      checkpoint: () => {
        assertOpen();
        pruneCheckpointTop();
        const token = Object.freeze({}) as OwnerPreparationCheckpoint;
        const node: CheckpointNode = {
          previous: checkpointTop,
          active: true,
          valid: true,
        };
        checkpointTop = node;
        activeCheckpointCount++;
        checkpointMetadata.set(token, {
          preparation: preparationIdentity,
          cursor: undoJournal.length,
          node,
        });
        return token;
      },
      rollbackTo: (checkpoint) => {
        assertOpen();
        const metadata = checkpointFor(checkpoint);
        if (metadata.cursor > undoJournal.length) {
          throw new Error("Owner preparation checkpoint is invalid");
        }
        for (
          let index = undoJournal.length - 1;
          index >= metadata.cursor;
          index--
        ) {
          undoJournal[index]();
        }
        undoJournal.length = metadata.cursor;
        while (checkpointTop !== metadata.node) {
          if (!checkpointTop) {
            throw new Error("Owner preparation checkpoint is invalid");
          }
          const discarded = checkpointTop;
          checkpointTop = discarded.previous;
          discarded.valid = false;
          if (discarded.active) {
            discarded.active = false;
            activeCheckpointCount--;
          }
        }
      },
      releaseCheckpoint: (checkpoint) => {
        assertOpen();
        const metadata = checkpointFor(checkpoint);
        metadata.node.active = false;
        metadata.node.valid = false;
        activeCheckpointCount--;
        checkpointMetadata.delete(checkpoint as object);
        pruneCheckpointTop();
        if (activeCheckpointCount === 0) {
          checkpointTop = null;
          undoJournal.length = 0;
        }
      },
      discardPrivateOwner: (owner) => {
        assertOpen();
        if (!privateOwners.has(owner)) return false;
        const previousHasStateWrites = hasStateWrites;
        if (activeCheckpointCount !== 0) {
          recordUndo(() => hasStateWrites = previousHasStateWrites);
        }
        // Index private children and surviving slot owners once, so discard work is
        // proportional to private owners and removed cells.
        const privateChildren = new Map<OwnerId, OwnerId[]>();
        const fallbackSlots = new Map<
          OwnerId | null,
          Map<string, Map<OwnerKey, OwnerId>>
        >();
        for (const [candidate, record] of privateOwners) {
          if (record.parent !== null) {
            let children = privateChildren.get(record.parent);
            if (!children) privateChildren.set(record.parent, children = []);
            children.push(candidate);
          }
        }
        const subtree: OwnerId[] = [];
        const subtreeSet = new Set<OwnerId>();
        const collect = (current: OwnerId) => {
          subtreeSet.add(current);
          for (const child of privateChildren.get(current) ?? []) {
            collect(child);
          }
          subtree.push(current);
        };
        collect(owner);
        for (const [candidate, record] of privateOwners) {
          if (subtreeSet.has(candidate)) continue;
          let bySite = fallbackSlots.get(record.parent);
          if (!bySite) fallbackSlots.set(record.parent, bySite = new Map());
          let byKey = bySite.get(record.componentSiteId);
          if (!byKey) bySite.set(record.componentSiteId, byKey = new Map());
          // Insertion order makes the last surviving owner the newest overlay.
          byKey.set(record.key, candidate);
        }
        for (const current of subtree) {
          const record = privateOwners.get(current)!;
          for (
            const [site, control] of candidateDispatches.get(current) ?? []
          ) {
            const cell = control.candidateCell;
            const oldDiscarded = control.discarded;
            const oldForward = control.forward;
            if (activeCheckpointCount !== 0) {
              recordUndo(() => {
                control.candidateCell = cell;
                control.discarded = oldDiscarded;
                control.forward = oldForward;
              });
            }
            control.candidateCell = null;
            control.forward = undefined;
            control.discarded = true;
            void site;
          }
          for (const cell of candidateCells.get(current)?.values() ?? []) {
            const oldValue = cell.value;
            const oldSource = cell.source;
            const oldSourceValue = oldSource?.value;
            if (activeCheckpointCount !== 0) {
              recordUndo(() => {
                cell.value = oldValue;
                cell.source = oldSource;
                if (oldSource && oldSourceValue !== undefined) {
                  oldSource.value = oldSourceValue;
                }
              });
            }
            cell.value = undefined;
            if (oldSource) oldSource.value = 0;
            cell.source = undefined;
          }
          deleteMap(candidateDispatches, current);
          deleteMap(candidateCells, current);
          deleteMap(candidateInitialValues, current);
          deleteMap(expectedCells, current);
          deleteMap(privateOwners, current);

          const overlay = getPrivateSlot(
            record.parent,
            record.componentSiteId,
            record.key,
          );
          if (overlay === current) {
            const previousPrivate = fallbackSlots.get(record.parent)?.get(
              record.componentSiteId,
            )?.get(record.key);
            const bySite = privateSlots.get(record.parent)?.get(
              record.componentSiteId,
            );
            if (previousPrivate !== undefined) {
              setMap(bySite!, record.key, previousPrivate);
            } else if (bySite) {
              deleteMap(bySite, record.key);
              if (bySite.size === 0) {
                const parentSlots = privateSlots.get(record.parent)!;
                deleteMap(parentSlots, record.componentSiteId);
                if (parentSlots.size === 0) {
                  deleteMap(privateSlots, record.parent);
                }
              }
              // Drop a capture used only to create the now-cancelled overlay.
              const expectedByKey = expectedSlots.get(record.parent)?.get(
                record.componentSiteId,
              );
              const expected = expectedByKey?.get(record.key);
              // An absent fallback means no surviving private owner depends on this
              // capture; fallbackSlots excludes the discarded subtree.
              if (expectedByKey && expected && !expected.retained) {
                deleteMap(expectedByKey, record.key);
                if (expectedByKey.size === 0) {
                  const expectedBySite = expectedSlots.get(record.parent)!;
                  deleteMap(expectedBySite, record.componentSiteId);
                  if (expectedBySite.size === 0) {
                    deleteMap(expectedSlots, record.parent);
                  }
                }
              }
            }
          }
        }
        hasStateWrites = false;
        for (const [candidateOwner, sites] of candidateCells) {
          for (const [site, candidate] of sites) {
            const baseVersion = privateOwners.has(candidateOwner)
              ? 0
              : expectedCells.get(candidateOwner)?.get(site)?.version ?? 0;
            if (candidate.version !== baseVersion) hasStateWrites = true;
          }
        }
        return true;
      },
      validate: () => {
        if (state !== "open") return false;
        for (const [owner, record] of privateOwners) {
          if (
            record.parent !== null && !privateOwners.has(record.parent) &&
            this.#owners.get(record.parent) === undefined
          ) return false;
          const slot = expectedSlots.get(record.parent)?.get(
            record.componentSiteId,
          )?.get(record.key);
          if (!privateOwners.has(record.parent as OwnerId) && !slot) {
            return false;
          }
        }
        for (const bySite of expectedSlots.values()) {
          for (const byKey of bySite.values()) {
            for (const expected of byKey.values()) {
              if (
                this.#childrenBySlot.get(expected.parent)?.get(expected.site)
                  ?.get(expected.key) !== expected.owner
              ) return false;
              if (
                this.#parentChildrenVersion(expected.parent) !==
                  expected.parentVersion
              ) return false;
            }
          }
        }
        for (const [owner, sites] of expectedCells) {
          if (!this.#owners.has(owner)) return false;
          for (const [site, expected] of sites) {
            const current = this.#stateByOwner.get(owner)?.get(site);
            if (
              current !== expected.cell ||
              (current?.version ?? 0) !== expected.version
            ) return false;
          }
        }
        return true;
      },
      validatePublicationInputs: () => {
        if (state !== "open") return false;
        for (const record of privateOwners.values()) {
          if (
            record.parent !== null && !privateOwners.has(record.parent) &&
            this.#owners.get(record.parent) === undefined
          ) return false;
          const slot = expectedSlots.get(record.parent)?.get(
            record.componentSiteId,
          )?.get(record.key);
          if (!privateOwners.has(record.parent as OwnerId) && !slot) {
            return false;
          }
        }
        for (const bySite of expectedSlots.values()) {
          for (const byKey of bySite.values()) {
            for (const expected of byKey.values()) {
              if (
                this.#childrenBySlot.get(expected.parent)?.get(expected.site)
                  ?.get(expected.key) !== expected.owner ||
                this.#parentChildrenVersion(expected.parent) !==
                  expected.parentVersion
              ) return false;
            }
          }
        }
        for (const [owner, sites] of expectedCells) {
          if (!this.#owners.has(owner)) return false;
          for (const [site, expected] of sites) {
            const current = this.#stateByOwner.get(owner)?.get(site);
            if (current !== expected.cell ||
              (current?.version ?? 0) < expected.version) return false;
            const candidate = candidateCells.get(owner)?.get(site);
            if (current && current.version > expected.version && candidate &&
              candidate.version > expected.version) return false;
          }
        }
        return true;
      },
      preparePublication: () => {
        if (publicationPrepared && state === "open") return;
        assertOpen();
        if (!preparation.validate()) {
          throw new Error("Owner preparation is stale");
        }
        preserveNewerCells = false;
        prepareAcceptedData();
      },
      beginHostApplication: () => {
        assertOpen();
        if (hostApplication) return;
        if (!preparation.validate() || hasStateWrites) {
          throw new Error("Owner preparation is stale before host application");
        }
        for (const [owner, dispatches] of candidateDispatches) {
          for (const [site, control] of dispatches) {
            const captured = expectedCells.get(owner)?.get(site)?.cell;
            if (captured && this.#stateByOwner.get(owner)?.get(site) === captured) {
              control.forward = captured.dispatch;
            }
          }
        }
        hostApplication = true;
      },
      preparePublicationAfterHost: () => {
        if (publicationPrepared && state === "open") return;
        assertOpen();
        if (!preparation.validatePublicationInputs()) {
          throw new Error("Owner publication inputs are stale");
        }
        preserveNewerCells = true;
        prepareAcceptedData();
      },
      publishAccepted: () => {
        assertOpen(true);
        if (!publicationPrepared) {
          throw new Error("Owner publication was not prepared");
        }
        // resolveOwner creates each parent before its private descendants.
        for (const record of publicationRecords) {
          this.#owners.set(record.id, record);
          installSlot(record);
        }
        for (const [owner, sites] of candidateCells) {
          let committedSites = this.#stateByOwner.get(owner);
          if (!committedSites) {
            this.#stateByOwner.set(
              owner,
              committedSites = publicationSiteMaps.get(owner)!,
            );
          }
          for (const [site, candidate] of sites) {
            const candidateLayout = candidate.stateLayout;
            const existing = committedSites.get(site);
            if (existing) {
              if (candidateLayout && !existing.laneSlotResolved) {
                existing.stateLayout = candidateLayout;
                existing.numericLaneSlot = publicationLayoutSlots.get(candidate);
                existing.laneSlotResolved = true;
                if (
                  existing.numericLaneSlot !== undefined &&
                  typeof existing.value !== "number"
                ) existing.promoted = true;
              }
              if (preserveNewerCells && existing.version >
                (expectedCells.get(owner)?.get(site)?.version ?? 0)) {
                continue;
              }
              if (candidate.promoted) {
                this.#releaseNumericLane(owner, site, existing);
                existing.promoted = true;
              }
              if (candidate.version !== existing.version) {
                existing.value = candidate.value;
                existing.version = candidate.version;
                if (typeof candidate.value === "number") {
                  existing.source ??= publicationSources.get(candidate)!;
                  existing.source.value = candidate.value;
                  if (
                    existing.rowLease &&
                    existing.numericLaneSlot !== undefined
                  ) {
                    NumericRowLease.setSource(
                      existing.rowLease,
                      existing.numericLaneSlot,
                      existing.source,
                    );
                  }
                }
                this.#markCellDirty(owner, site, existing);
              }
              continue;
            }
            candidate.dispatch = publicationDispatches.get(candidate)!;
            committedSites.set(site, candidate);
            if (candidate.version > 0) {
              this.#markCellDirty(owner, site, candidate);
            }
          }
        }
        for (const [owner, sites] of candidateCells) {
          for (const site of sites.keys()) {
            const cell = this.#stateByOwner.get(owner)?.get(site);
            if (cell) this.#attachOptionalNumericLane(owner, site, cell);
          }
        }
        state = "published";
        for (const [owner, dispatches] of candidateDispatches) {
          for (const [site, control] of dispatches) {
            const live = this.#stateByOwner.get(owner)?.get(site);
            control.candidateCell = null;
            control.forward = live?.dispatch;
          }
        }
        undoJournal.length = 0;
        checkpointMetadata = new WeakMap();
        checkpointTop = null;
        activeCheckpointCount = 0;
        privateOwners.clear();
        privateSlots.clear();
        expectedSlots.clear();
        expectedCells.clear();
        candidateInitialValues.clear();
        candidateDispatches.clear();
        publicationRecords = [];
        publicationSiteMaps.clear();
        publicationParentMaps.clear();
        publicationSlotMaps.clear();
        publicationLayoutSlots.clear();
        publicationSources.clear();
        publicationDispatches.clear();
        candidateCells.clear();
      },
      notifyPublished: () => {},
      publish: () => {
        preparation.preparePublication();
        preparation.publishAccepted();
        preparation.notifyPublished();
      },
      discard: () => {
        if (state !== "open") return;
        state = "discarded";
        for (const dispatches of candidateDispatches.values()) {
          for (const control of dispatches.values()) {
            control.candidateCell = null;
            control.forward = undefined;
            control.discarded = true;
          }
        }
        for (const sites of candidateCells.values()) {
          for (const cell of sites.values()) {
            cell.value = undefined;
            if (cell.source) cell.source.value = 0;
            cell.source = undefined;
          }
        }
        undoJournal.length = 0;
        checkpointMetadata = new WeakMap();
        checkpointTop = null;
        activeCheckpointCount = 0;
        privateOwners.clear();
        privateSlots.clear();
        expectedSlots.clear();
        expectedCells.clear();
        candidateCells.clear();
        candidateInitialValues.clear();
        candidateDispatches.clear();
        publicationRecords = [];
        publicationSiteMaps.clear();
        publicationParentMaps.clear();
        publicationSlotMaps.clear();
        publicationLayoutSlots.clear();
        publicationSources.clear();
        publicationDispatches.clear();
      },
    };
    return preparation;
  }

  claimRootId(rootId: string): OwnerId {
    if (!rootId) throw new Error("Component root ID must not be empty");
    if (this.#claimedRootIds.has(rootId)) {
      throw new Error(
        `Component root ID ${rootId} is already active in this world`,
      );
    }
    const owner = this.resolveOwner(null, `@component-root:${rootId}`);
    this.#claimedRootIds.set(rootId, owner);
    return owner;
  }

  releaseRootId(rootId: string, owner: OwnerId): void {
    if (this.#claimedRootIds.get(rootId) !== owner) return;
    this.#claimedRootIds.delete(rootId);
  }

  resolveOwner(
    parent: OwnerId | null,
    componentSiteId: string,
    key: OwnerKey = null,
  ): OwnerId {
    if (componentSiteId.length === 0) {
      throw new Error("Component site ID must not be empty");
    }
    if (parent !== null) this.#assertOwner(parent);

    let bySite = this.#childrenBySlot.get(parent);
    if (!bySite) this.#childrenBySlot.set(parent, bySite = new Map());
    let byKey = bySite.get(componentSiteId);
    if (!byKey) bySite.set(componentSiteId, byKey = new Map());
    const existing = byKey.get(key);
    if (existing !== undefined) return existing;

    const id = this.#nextOwner++;
    this.#owners.set(id, {
      id,
      parent,
      componentSiteId,
      key,
      children: new Set(),
      childrenVersion: 0,
    });
    if (parent !== null) this.#owners.get(parent)!.children.add(id);
    byKey.set(key, id);
    this.#bumpParentChildrenVersion(parent);
    return id;
  }

  /** Allocate a private incarnation without replacing a committed keyed slot. */
  createStagedOwner(
    parent: OwnerId,
    componentSiteId: string,
    key: OwnerKey,
  ): OwnerId {
    this.#assertOwner(parent);
    if (!componentSiteId) {
      throw new Error("Component site ID must not be empty");
    }
    const id = this.#nextOwner++;
    this.#owners.set(id, {
      id,
      parent,
      componentSiteId,
      key,
      children: new Set(),
      childrenVersion: 0,
    });
    this.#owners.get(parent)!.children.add(id);
    this.#stagedOwners.add(id);
    return id;
  }

  /** Validate a staged slot and allocate its missing maps before acceptance. */
  prepareStagedOwnerActivation(
    owner: OwnerId,
    previousOwner?: OwnerId,
  ): () => void {
    this.#assertOwner(owner);
    if (!this.#stagedOwners.has(owner)) throw new Error("Owner is not staged");
    const record = this.#owners.get(owner)!;
    const bySite = this.#childrenBySlot.get(record.parent);
    const byKey = bySite?.get(record.componentSiteId);
    const current = byKey?.get(record.key);
    if (current !== previousOwner) {
      throw new Error("Staged owner slot changed before publication");
    }
    const preparedSite = bySite ?? new Map<string, Map<OwnerKey, OwnerId>>();
    const preparedKey = byKey ?? new Map<OwnerKey, OwnerId>();
    let installed = false;
    return () => {
      if (installed) return;
      installed = true;
      const installedSite = this.#childrenBySlot.get(record.parent) ?? preparedSite;
      if (!this.#childrenBySlot.has(record.parent)) {
        this.#childrenBySlot.set(record.parent, installedSite);
      }
      const installedKey = installedSite.get(record.componentSiteId) ?? preparedKey;
      if (!installedSite.has(record.componentSiteId)) {
        installedSite.set(record.componentSiteId, installedKey);
      }
      installedKey.set(record.key, owner);
      this.#stagedOwners.delete(owner);
      this.#bumpParentChildrenVersion(record.parent);
    };
  }

  /** Publish a prepared incarnation only over its expected previous slot. */
  activateStagedOwner(owner: OwnerId, previousOwner?: OwnerId): void {
    this.prepareStagedOwnerActivation(owner, previousOwner)();
  }

  findOwner(
    parent: OwnerId | null,
    componentSiteId: string,
    key: OwnerKey = null,
  ): OwnerId | undefined {
    if (parent !== null) this.#assertOwner(parent);
    return this.#childrenBySlot.get(parent)?.get(componentSiteId)?.get(key);
  }

  /** React-like state API with an explicit, compiler-addressable site ID. */
  useState<T>(
    owner: OwnerId,
    site: StateSiteId,
    initial: T | (() => T),
    layout?: CompiledStateLayout,
  ): readonly [T, (action: StateAction<T>) => boolean] {
    this.#assertOwner(owner);
    if (site.length === 0) throw new Error("State site ID must not be empty");
    let sites = this.#stateByOwner.get(owner);
    if (!sites) this.#stateByOwner.set(owner, sites = new Map());
    let cell = sites.get(site) as StateCell<T> | undefined;
    if (!cell) {
      const value = typeof initial === "function"
        ? (initial as () => T)()
        : initial;
      const normalizedLayout = layout
        ? normalizeCompiledStateLayout(layout)
        : undefined;
      const numericLaneSlot = normalizedLayout
        ? compiledStateLayoutSlot(normalizedLayout, site)
        : undefined;
      const source = typeof value === "number"
        ? new ScalarSource(OwnerStateWorld.#nextSourceId++, value)
        : undefined;
      if (
        normalizedLayout && numericLaneSlot !== undefined &&
        typeof value === "number"
      ) {
        cell = makeCompiledNumericStateCell<T>({
          value: value as T,
          version: 0,
          layout: normalizedLayout,
          slot: numericLaneSlot,
          source,
          dispatch: () => false,
          laneSlotResolved: false,
        });
      } else {
        cell = {
          value,
          version: 0,
          ...(normalizedLayout ? { stateLayout: normalizedLayout } : {}),
          cellIdentity: undefined,
          cellHandle: undefined,
          dirtyMembership: undefined,
          rowLease: undefined,
          rowView: undefined,
          dispatch: () => false,
        };
        if (source) cell.source = source;
      }
      cell.dispatch = (action) =>
        this.#dispatchState(owner, site, cell!, action);
      sites.set(site, cell as StateCell<unknown>);
    }
    if (layout) this.#ensureCellLayout(owner, site, cell as StateCell<unknown>, layout);
    if (cell.stateLayout && !cell.promoted && typeof cell.value === "number") {
      this.#attachOptionalNumericLane(owner, site, cell as StateCell<unknown>);
    }
    return [this.#readStateValue(owner, site, cell), cell.dispatch] as const;
  }

  /** Return the stable committed lane address, if this cell is lane-backed. */
  numericLane(owner: OwnerId, site: StateSiteId): NumericLaneAddress | null {
    if (!this.#owners.has(owner)) return null;
    const cell = this.#stateByOwner.get(owner)?.get(site);
    const lane = cell?.lane;
    return cell && lane && this.#laneIsCurrent(owner, site, cell, lane)
      ? lane
      : null;
  }

  /** Resolve a captured handle/version to its exact live numeric lane address. */
  numericLaneForCell(
    handle: StateCellHandle,
    version: number,
  ): NumericLaneAddress | null {
    const capturedVersion = version;
    if (!Number.isSafeInteger(capturedVersion)) return null;
    let owner: OwnerId;
    let site: StateSiteId;
    let identity: object;
    try {
      owner = handle.owner;
      site = handle.site;
      identity = handle.cellIdentity;
    } catch {
      return null;
    }
    const cell = this.#resolveCellIdentity(identity, owner, site);
    if (!cell || cell.version !== capturedVersion) return null;
    const lane = cell.lane;
    return lane && this.#laneAddressIsCurrent(owner, site, cell, lane)
      ? lane
      : null;
  }

  /** Resolve a committed numeric cell to its cached row projection. */
  numericRowForCell(
    handle: StateCellHandle,
    version: number,
  ): NumericCellRowView | null {
    const capturedVersion = version;
    if (!Number.isSafeInteger(capturedVersion)) return null;
    let owner: OwnerId;
    let site: StateSiteId;
    let identity: object;
    try {
      owner = handle.owner;
      site = handle.site;
      identity = handle.cellIdentity;
    } catch {
      return null;
    }
    const cell = this.#resolveCellIdentity(identity, owner, site);
    if (!cell || cell.version !== capturedVersion) return null;
    const lane = cell.lane;
    const view = cell.rowView;
    const lease = cell.rowLease;
    const layout = cell.stateLayout;
    const slot = cell.numericLaneSlot;
    if (
      !lane || !cell.source || !view || !lease || !layout ||
      slot === undefined ||
      view.rowIdentity !== lease || view.owner !== owner || view.site !== site ||
      view.layout !== layout || view.row !== lane.row ||
      view.generation !== lane.generation || view.slot !== slot ||
      view.lane !== lane || view.source !== cell.source ||
      !this.#laneAddressIsCurrent(owner, site, cell, lane)
    ) return null;
    return view;
  }

  #resolveCellIdentity(
    identity: object,
    owner: OwnerId,
    site: StateSiteId,
  ): StateCell<unknown> | null {
    if (
      !Number.isSafeInteger(owner) || typeof site !== "string" ||
      site.length === 0
    ) return null;
    return CommittedCellCapability.resolve(
      identity,
      this.#identitySecret,
      owner,
      site,
    );
  }

  #resolveCellHandle(handle: StateCellHandle): StateCell<unknown> | null {
    let owner: OwnerId;
    let site: StateSiteId;
    let identity: object;
    try {
      owner = handle.owner;
      site = handle.site;
      identity = handle.cellIdentity;
    } catch {
      return null;
    }
    return this.#resolveCellIdentity(identity, owner, site);
  }

  version(owner: OwnerId, site: StateSiteId): number {
    this.#assertOwner(owner);
    return this.#stateByOwner.get(owner)?.get(site)?.version ?? 0;
  }

  /** Return one live committed cell's stable capability without dispatching it. */
  cellHandle(owner: OwnerId, site: StateSiteId): StateCellHandle | null {
    if (!this.#owners.has(owner) || this.#stagedOwners.has(owner)) return null;
    const cell = this.#stateByOwner.get(owner)?.get(site);
    return cell ? this.#handleForCell(owner, site, cell) : null;
  }

  #handleForCell(
    owner: OwnerId,
    site: StateSiteId,
    cell: StateCell<unknown>,
  ): StateCellHandle {
    let handle = cell.cellHandle;
    if (handle) return handle;
    const cellIdentity = new CommittedCellCapability(
      this.#identitySecret,
      owner,
      site,
      cell,
    );
    cell.cellIdentity = cellIdentity;
    handle = Object.freeze({ owner, site, cellIdentity });
    cell.cellHandle = handle;
    return handle;
  }

  /** Stable scalar handle for a numeric state cell; nonnumeric sites have none. */
  scalarSource(owner: OwnerId, site: StateSiteId): ScalarSource | null {
    this.#assertOwner(owner);
    const cell = this.#stateByOwner.get(owner)?.get(site);
    return cell && typeof this.#readStateValue(owner, site, cell) === "number"
      ? cell.source ?? null
      : null;
  }

  /** Resolve the canonical source for an identity-bearing committed change. */
  scalarSourceForChange(change: StateChange): ScalarSource | null {
    const cell = change.cellIdentity
      ? CommittedCellCapability.resolveLegacyChange(
        change.cellIdentity,
        this.#identitySecret,
        change,
      )
      : null;
    if (cell) {
      this.#assertOwner(change.owner);
      return typeof cell.value === "number"
        ? cell.source ?? null
        : null;
    }
    return this.scalarSource(change.owner, change.site);
  }

  /** Resolve the canonical numeric source for an exact committed cell handle. */
  scalarSourceForCell(handle: StateCellHandle): ScalarSource | null {
    const cell = this.#resolveCellHandle(handle);
    return cell && typeof cell.value === "number"
      ? cell.source ?? null
      : null;
  }

  /** Resolve the current version for an identity-bearing committed change. */
  versionForChange(change: StateChange): number {
    const cell = change.cellIdentity
      ? CommittedCellCapability.resolveLegacyChange(
        change.cellIdentity,
        this.#identitySecret,
        change,
      )
      : null;
    if (cell) {
      this.#assertOwner(change.owner);
      return cell.version;
    }
    return this.version(change.owner, change.site);
  }

  /** Resolve the current version for an exact committed cell handle. */
  versionForCell(handle: StateCellHandle): number | null {
    return this.#resolveCellHandle(handle)?.version ?? null;
  }

  /** Clear dirty cells only when each exact cell has not advanced past its cut. */
  clearCellChangesThrough(
    handles: readonly (StateCellHandle | undefined)[],
    versions: readonly number[],
    count: number,
  ): void {
    if (
      !Number.isSafeInteger(count) || count < 0 || count > handles.length ||
      count > versions.length
    ) throw new RangeError("Invalid native state change count");
    for (let index = 0; index < count; index++) {
      let handle: StateCellHandle | undefined;
      let version: number;
      try {
        handle = handles[index];
        version = versions[index];
      } catch {
        continue;
      }
      if (!handle || !Number.isSafeInteger(version)) continue;
      const cell = this.#resolveCellHandle(handle);
      if (!cell || cell.version > version) continue;
      const membership = cell.dirtyMembership;
      if (membership) this.#dirtyJournal.deletePrepared(membership);
    }
  }

  /** Clear only changes at or below the captured versions. Reentrant writes survive. */
  clearChangesThrough(captured: readonly StateChange[]): void {
    for (const change of captured) {
      if (!this.#dirtyJournal.has(change.owner, change.site)) continue;
      if (
        !this.#owners.has(change.owner) ||
        this.versionForChange(change) <= change.version
      ) {
        this.#dirtyJournal.delete(change.owner, change.site);
      }
    }
  }

  /** Coalesce repeated writes to the same owner/site until a scheduler consumes them. */
  pendingChanges(): StateChange[] {
    const changes: StateChange[] = [];
    for (const [owner, site] of this.#dirtyJournal.entries()) {
      changes.push({ owner, site, version: this.version(owner, site) });
    }
    return changes;
  }

  drainChanges(): StateChange[] {
    const changes = this.pendingChanges();
    this.#dirtyJournal.clear();
    return changes;
  }

  /** Return the changed owner and its component ancestors up to the root entity. */
  ownerLineage(owner: OwnerId): OwnerId[] {
    this.#assertOwner(owner);
    const lineage: OwnerId[] = [];
    let current: OwnerId | null = owner;
    while (current !== null) {
      lineage.push(current);
      current = this.#owners.get(current)!.parent;
    }
    return lineage;
  }

  isAlive(owner: OwnerId): boolean {
    return this.#owners.has(owner);
  }

  /** Check canonical committed state without creating or dispatching a cell. */
  ownerStateValuesArePrimitive(owner: OwnerId): boolean {
    if (!this.#owners.has(owner) || this.#stagedOwners.has(owner)) return false;
    for (const cell of this.#stateByOwner.get(owner)?.values() ?? []) {
      const value = cell.value;
      if (value !== null && value !== undefined &&
        typeof value !== "string" && typeof value !== "number" &&
        typeof value !== "boolean") return false;
    }
    return true;
  }

  isWithin(owner: OwnerId, ancestor: OwnerId): boolean {
    if (!this.#owners.has(owner) || !this.#owners.has(ancestor)) return false;
    let current: OwnerId | null = owner;
    while (current !== null) {
      if (current === ancestor) return true;
      current = this.#owners.get(current)!.parent;
    }
    return false;
  }

  hasPendingChanges(): boolean {
    return this.#dirtyJournal.size !== 0;
  }

  subscribeChanges(listener: (change: StateChange) => void): () => void {
    this.#changeListeners.add(listener);
    return () => this.#changeListeners.delete(listener);
  }

  /** Subscribe to committed state writes without allocating public change records. */
  subscribeDirtyCells(
    listener: (handle: StateCellHandle, version: number) => void,
  ): () => void {
    this.#dirtyCellListeners = [...this.#dirtyCellListeners, listener];
    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      const index = this.#dirtyCellListeners.indexOf(listener);
      if (index < 0) return;
      this.#dirtyCellListeners = [
        ...this.#dirtyCellListeners.slice(0, index),
        ...this.#dirtyCellListeners.slice(index + 1),
      ];
    };
  }

  /** Destroy an owner and all nested keyed/component owners, including state traits. */
  destroyOwner(owner: OwnerId): boolean {
    return this.#destroyOwner(owner, false);
  }

  #canRetireOwnedOwner(owner: OwnerId): boolean {
    const root = this.#owners.get(owner);
    if (!root || this.#stagedOwners.has(owner)) return false;
    const pending = [root];
    while (pending.length > 0) {
      const record = pending.pop()!;
      if (this.#stagedOwners.has(record.id)) return false;
      for (const cell of this.#stateByOwner.get(record.id)?.values() ?? []) {
        if (cell.lane) return false;
      }
      for (const child of record.children) {
        const childRecord = this.#owners.get(child);
        if (!childRecord) return false;
        pending.push(childRecord);
      }
    }
    return true;
  }

  #destroyOwner(owner: OwnerId, canonicalChildren: boolean): boolean {
    const record = this.#owners.get(owner);
    if (!record) return false;
    for (const child of [...record.children]) {
      if (canonicalChildren) this.#destroyOwner(child, true);
      else this.destroyOwner(child);
    }

    const bySite = this.#childrenBySlot.get(record.parent);
    const byKey = bySite?.get(record.componentSiteId);
    if (byKey?.get(record.key) === owner) {
      byKey.delete(record.key);
      this.#bumpParentChildrenVersion(record.parent);
    }
    if (byKey?.size === 0) bySite?.delete(record.componentSiteId);
    if (bySite?.size === 0) this.#childrenBySlot.delete(record.parent);
    if (record.parent !== null) {
      this.#owners.get(record.parent)?.children.delete(owner);
    }

    this.#stagedOwners.delete(owner);
    const ownerCells = this.#stateByOwner.get(owner);
    // Revoke every externally retained capability before marking the owner
    // dead or releasing any cell/row payload.
    for (const cell of ownerCells?.values() ?? []) {
      const identity = cell.cellIdentity;
      if (identity) {
        CommittedCellCapability.revoke(identity, this.#identitySecret);
      }
      cell.cellIdentity = undefined;
      cell.cellHandle = undefined;
    }
    this.#owners.delete(owner);
    for (const [site, cell] of ownerCells ?? []) {
      this.#releaseNumericLane(owner, site, cell);
      cell.dirtyMembership = undefined;
      cell.rowView = undefined;
      // Retained dead setters still close over the cell, so release its payload
      // and numeric source after removing the owner from the live world.
      cell.value = undefined;
      cell.source = undefined;
    }
    this.#stateByOwner.delete(owner);
    this.#dirtyJournal.removeOwner(owner);
    return true;
  }

  #assertOwner(owner: OwnerId) {
    if (!this.#owners.has(owner)) {
      throw new Error(`Owner ${owner} is not alive`);
    }
  }

  #markCellDirty(owner: OwnerId, site: StateSiteId, cell: StateCell<unknown>) {
    let membership = cell.dirtyMembership;
    if (!membership) {
      membership = this.#dirtyJournal.prepareMembership(owner, site);
      cell.dirtyMembership = membership;
    }
    if (!this.#dirtyJournal.markPrepared(membership)) {
      throw new Error("Committed cell has stale dirty membership");
    }
  }

  #parentChildrenVersion(parent: OwnerId | null): number {
    return parent === null
      ? this.#rootChildrenVersion
      : this.#owners.get(parent)?.childrenVersion ?? -1;
  }

  #bumpParentChildrenVersion(parent: OwnerId | null) {
    if (parent === null) {
      this.#rootChildrenVersion++;
      return;
    }
    const record = this.#owners.get(parent);
    if (record) record.childrenVersion++;
  }

  #dispatchState<T>(
    owner: OwnerId,
    site: StateSiteId,
    cell: StateCell<T>,
    action: StateAction<T>,
  ): boolean {
    this.#assertOwner(owner);
    const previous = cell.value;
    const isUpdater = typeof action === "function";
    const next = isUpdater
      ? (action as (previous: T) => T)(previous)
      : action;
    // User code may synchronously destroy this owner while calculating next.
    // Reject that dispatch before it can dirty or recreate a dead identity.
    if (
      isUpdater && (!this.#owners.has(owner) ||
        this.#stateByOwner.get(owner)?.get(site) !== cell)
    ) return false;
    if (Object.is(previous, next)) return false;
    if (cell.lane && typeof next !== "number") {
      this.#releaseNumericLane(owner, site, cell as StateCell<unknown>);
      cell.promoted = true;
    } else if (cell.numericLaneSlot !== undefined &&
      typeof next !== "number") {
      cell.promoted = true;
    }
    cell.value = next;
    cell.version++;
    if (typeof next === "number") {
      cell.source ??= new ScalarSource(OwnerStateWorld.#nextSourceId++, next);
      cell.source.value = next;
      if (cell.rowLease && cell.numericLaneSlot !== undefined) {
        NumericRowLease.setSource(
          cell.rowLease,
          cell.numericLaneSlot,
          cell.source,
        );
        if (!cell.rowView) {
          refreshNumericCellRowView(
            cell as StateCell<unknown>,
            owner,
            site,
          );
        }
      }
    }
    this.#markCellDirty(owner, site, cell as StateCell<unknown>);
    if (typeof next === "number" && !cell.lane &&
      cell.numericLaneSlot !== undefined && !cell.promoted) {
      this.#attachOptionalNumericLane(owner, site, cell as StateCell<unknown>);
    }
    const handle = this.#handleForCell(owner, site, cell as StateCell<unknown>);
    const cellIdentity = handle.cellIdentity;
    const version = cell.version;
    // Capture both listener cuts before callbacks run. Subscription changes
    // during a notification affect the next dispatch, including public ones.
    const dirtyCellListeners = this.#dirtyCellListeners;
    const changeListeners = this.#changeListeners.size > 0
      ? [...this.#changeListeners]
      : null;
    for (const listener of dirtyCellListeners) listener(handle, version);
    if (changeListeners) {
      const change: StateChange = { owner, site, version, cellIdentity };
      for (const listener of changeListeners) listener(change);
    }
    return true;
  }
}

const closedWorldCaptureMethods = Object.freeze([
  "cellHandle", "scalarSourceForCell", "versionForCell", "ownerLineage",
] as const);
const closedWorldCaptureDescriptors = new Map(
  closedWorldCaptureMethods.map((name) => [
    name, Object.getOwnPropertyDescriptor(OwnerStateWorld.prototype, name)!,
  ]),
);
const canonicalCaptureOwnedClosedInputs = OwnerStateWorld._captureOwnedClosedInputs;
const canonicalValidateClosedCellCut = OwnerStateWorld._validateClosedCellCut;
const canonicalValidateClosedWorldPhase = OwnerStateWorld._validateCanonicalClosedPhase;
const canonicalCanRetireOwnedOwner = OwnerStateWorld._canRetireOwnedOwner;
const canonicalRetireOwnedOwner = OwnerStateWorld._retireOwnedOwner;

export function canRetireOwnedWorldOwner(world: OwnerStateWorld, owner: OwnerId): boolean {
  return canonicalCanRetireOwnedOwner.call(
    OwnerStateWorld, ownedWorldRetirementKey, world, owner,
  );
}

export function retireOwnedWorldOwner(world: OwnerStateWorld, owner: OwnerId): boolean {
  return canonicalRetireOwnedOwner.call(
    OwnerStateWorld, ownedWorldRetirementKey, world, owner,
  );
}

const ownedWorldInputBindingKey = Symbol("owned-world-input-binding");
class PrivateOwnedClosedWorldInputRequest {
  readonly #request: Readonly<{ owner: OwnerId; sites: readonly StateSiteId[] }>;
  private constructor(key: symbol,
    request: Readonly<{ owner: OwnerId; sites: readonly StateSiteId[] }>) {
    if (key !== ownedWorldInputBindingKey) throw new TypeError("Invalid World input binding");
    this.#request = request;
    Object.freeze(this);
  }
  static bind(request: { owner: OwnerId; sites: readonly StateSiteId[] }):
    PrivateOwnedClosedWorldInputRequest | null {
    try {
      const owner = Object.getOwnPropertyDescriptor(request, "owner");
      const sites = Object.getOwnPropertyDescriptor(request, "sites");
      if (!owner || !("value" in owner) || !Number.isSafeInteger(owner.value) ||
        !sites || !("value" in sites)) return null;
      const siteLength = Object.getOwnPropertyDescriptor(sites.value, "length")?.value;
      if (!Number.isSafeInteger(siteLength) || siteLength < 0 || siteLength > 256) return null;
      const copied: StateSiteId[] = [];
      for (let index = 0; index < siteLength; index++) {
        const site = Object.getOwnPropertyDescriptor(sites.value, String(index));
        if (!site || !("value" in site) || typeof site.value !== "string" ||
          !site.value) return null;
        copied.push(site.value);
      }
      return new PrivateOwnedClosedWorldInputRequest(ownedWorldInputBindingKey,
        Object.freeze({ owner: owner.value, sites: Object.freeze(copied) }));
    } catch (error) {
      if (error instanceof TypeError) return null;
      throw error;
    }
  }
  static unwrap(key: symbol, value: unknown):
    { owner: OwnerId; sites: readonly StateSiteId[] } | null {
    if (key !== ownedWorldInputBindingKey) return null;
    return typeof value === "object" && value !== null &&
      #request in value ? value.#request : null;
  }
  static owns(value: unknown): value is PrivateOwnedClosedWorldInputRequest {
    try { return typeof value === "object" && value !== null && #request in value; }
    catch { return false; }
  }
}

export type OwnedClosedWorldInputRequest = PrivateOwnedClosedWorldInputRequest;
export const bindOwnedClosedWorldInputRequest = PrivateOwnedClosedWorldInputRequest.bind;
export const isOwnedClosedWorldInputRequest = PrivateOwnedClosedWorldInputRequest.owns;
const canonicalUnwrapOwnedWorldInputRequest = PrivateOwnedClosedWorldInputRequest.unwrap;

function normalizeOwnedClosedWorldInputRequests(
  requests: readonly ({ owner: OwnerId; sites: readonly StateSiteId[] } |
    OwnedClosedWorldInputRequest)[],
): { owner: OwnerId; sites: readonly StateSiteId[] }[] | null {
  const length = Object.getOwnPropertyDescriptor(requests, "length")?.value;
  if (!Number.isSafeInteger(length) || length < 0 || length > 65536) return null;
  const copied: { owner: OwnerId; sites: readonly StateSiteId[] }[] = [];
  for (let index = 0; index < length; index++) {
    const request = Object.getOwnPropertyDescriptor(requests, String(index));
    if (!request || !("value" in request) || !request.value) return null;
    const bound = canonicalUnwrapOwnedWorldInputRequest(
      ownedWorldInputBindingKey, request.value);
    if (bound) {
      copied.push(bound);
      continue;
    }
    const owner = Object.getOwnPropertyDescriptor(request.value, "owner");
    const sites = Object.getOwnPropertyDescriptor(request.value, "sites");
    if (!owner || !("value" in owner) || !sites || !("value" in sites)) return null;
    const siteLength = Object.getOwnPropertyDescriptor(sites.value, "length")?.value;
    if (!Number.isSafeInteger(siteLength) || siteLength < 0 || siteLength > 256) return null;
    const copiedSites: StateSiteId[] = [];
    for (let siteIndex = 0; siteIndex < siteLength; siteIndex++) {
      const site = Object.getOwnPropertyDescriptor(sites.value, String(siteIndex));
      if (!site || !("value" in site) || typeof site.value !== "string" || !site.value) return null;
      copiedSites.push(site.value);
    }
    copied.push({ owner: owner.value, sites: copiedSites });
  }
  return copied;
}

export function captureOwnedClosedWorldInputBatch(
  world: OwnerStateWorld,
  requests: readonly ({ owner: OwnerId; sites: readonly StateSiteId[] } |
    OwnedClosedWorldInputRequest)[],
): OwnedClosedWorldInputBatch | null {
  try {
    const copied = normalizeOwnedClosedWorldInputRequests(requests);
    if (!copied) return null;
    return canonicalCaptureOwnedClosedInputs.call(
      OwnerStateWorld, ownedWorldCaptureKey, world, copied, true,
    ) as OwnedClosedWorldInputBatch | null;
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}

/** Capture producer-owned rows and fill varying columns in the same World cut. */
export function captureOwnedClosedWorldInputFill(
  world: OwnerStateWorld,
  schedule: OwnedClosedFrameFill,
): OwnedClosedWorldInputBatch | null {
  if (!canonicalOwnedClosedFrameFillOwns(schedule) ||
    schedule.rowCount > 65536) return null;
  try {
    return canonicalCaptureOwnedClosedInputs.call(
      OwnerStateWorld, ownedWorldCaptureKey, world, schedule, true,
    ) as OwnedClosedWorldInputBatch | null;
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}

export function captureOwnedClosedWorldInputs(
  world: OwnerStateWorld,
  requests: readonly ({ owner: OwnerId; sites: readonly StateSiteId[] } |
    OwnedClosedWorldInputRequest)[],
): readonly OwnedClosedWorldInputRow[] | null {
  try {
    const copied = normalizeOwnedClosedWorldInputRequests(requests);
    if (!copied) return null;
    return canonicalCaptureOwnedClosedInputs.call(
      OwnerStateWorld, ownedWorldCaptureKey, world, copied, false,
    ) as readonly OwnedClosedWorldInputRow[] | null;
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}

/** Copy runtime captures into one opaque cut before any private validation. */
export function createClosedWorldCellCut(
  rows: readonly OwnedClosedWorldInputCell[],
): ClosedWorldCellCut | null {
  try {
    const length = Object.getOwnPropertyDescriptor(rows, "length")?.value;
    if (!Number.isSafeInteger(length) || length < 0 || length > 65536) return null;
    const copied: ClosedWorldCell[] = [];
    const byOwner = new Map<OwnerId, Map<StateSiteId, ClosedWorldCell>>();
    for (let index = 0; index < length; index++) {
      const rowDescriptor = Object.getOwnPropertyDescriptor(rows, String(index));
      if (!rowDescriptor || !("value" in rowDescriptor) || !rowDescriptor.value) return null;
      const row = rowDescriptor.value;
      const handleDescriptor = Object.getOwnPropertyDescriptor(row, "handle");
      const sourceDescriptor = Object.getOwnPropertyDescriptor(row, "source");
      const versionDescriptor = Object.getOwnPropertyDescriptor(row, "version");
      const valueDescriptor = Object.getOwnPropertyDescriptor(row, "value");
      if (!handleDescriptor || !("value" in handleDescriptor) ||
        !sourceDescriptor || !("value" in sourceDescriptor) ||
        !versionDescriptor || !("value" in versionDescriptor) ||
        !valueDescriptor || !("value" in valueDescriptor)) return null;
      const handle = handleDescriptor.value;
      if ((typeof handle !== "object" && typeof handle !== "function") ||
        handle === null) return null;
      const ownerDescriptor = Object.getOwnPropertyDescriptor(handle, "owner");
      const siteDescriptor = Object.getOwnPropertyDescriptor(handle, "site");
      const identityDescriptor = Object.getOwnPropertyDescriptor(handle, "cellIdentity");
      if (!ownerDescriptor || !("value" in ownerDescriptor) ||
        !siteDescriptor || !("value" in siteDescriptor) ||
        !identityDescriptor || !("value" in identityDescriptor)) return null;
      const owner = ownerDescriptor.value;
      const site = siteDescriptor.value;
      const identity = identityDescriptor.value;
      const source = sourceDescriptor.value;
      const version = versionDescriptor.value;
      const value = valueDescriptor.value;
      if (!Number.isSafeInteger(owner) || typeof site !== "string" || !site ||
        (typeof identity !== "object" && typeof identity !== "function") ||
        identity === null || typeof source !== "object" || source === null ||
        !Number.isSafeInteger(version) || version < 0 || typeof value !== "number") return null;
      const normalized: ClosedWorldCell = Object.freeze({
        owner, site, identity, source, version, value,
      });
      let sites = byOwner.get(owner);
      if (!sites) byOwner.set(owner, sites = new Map());
      const previous = sites.get(site);
      if (previous) {
        if (previous.identity !== identity || previous.source !== source ||
          previous.version !== version || !Object.is(previous.value, value)) return null;
      } else {
        sites.set(site, normalized);
        copied.push(normalized);
      }
    }
    return new PrivateClosedWorldCellCut(closedWorldCellCutKey, Object.freeze(copied));
  } catch {
    return null;
  }
}

/** Validate one captured World cut without consulting public World methods. */
export function validateClosedWorldCellCut(
  world: OwnerStateWorld,
  cut: ClosedWorldCellCut,
  phase: "prepared" | "after-host",
): boolean {
  return canonicalValidateClosedCellCut.call(
    OwnerStateWorld, closedWorldCellCutKey, world, cut, phase,
  );
}

/** Audit canonical World shape and validate one private cut at this phase. */
export function validateCanonicalClosedWorldPhase(
  world: OwnerStateWorld,
  cut: ClosedWorldCellCut,
  phase: "prepared" | "after-host",
): CanonicalClosedPhaseStatus {
  return canonicalValidateClosedWorldPhase.call(
    OwnerStateWorld, closedWorldCellCutKey, world, cut, phase,
  );
}
