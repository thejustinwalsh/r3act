var _a;
import { ScalarSource } from "./jsx_binding_runtime.js";
import { NumericColumn } from "./jsx_binding_runtime.js";
import { compiledStateLayoutSlot, compiledStateLayoutSignature, normalizeCompiledStateLayout, } from "./compiled_state_layout.js";
import { WorldDirtyJournal, } from "./world_dirty_journal.js";
function getLaneBackedValue() {
    const lane = this.lane;
    return lane ? lane.column.values[lane.row] : this.boxedValue;
}
function setLaneBackedValue(next) {
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
const laneBackedValueDescriptor = {
    configurable: true,
    enumerable: true,
    get: getLaneBackedValue,
    set: setLaneBackedValue,
};
/** Shared-from-birth accessor shape for cells born with a certified numeric slot. */
const compiledNumericStateCellPrototype = Object.create(Object.prototype, { value: laneBackedValueDescriptor });
function isCompiledNumericStateCell(cell) {
    return Object.getPrototypeOf(cell) === compiledNumericStateCellPrototype;
}
function makeCompiledNumericStateCell(args) {
    const cell = Object.create(compiledNumericStateCellPrototype);
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
    #worldSecret;
    #owner;
    #site;
    #cell;
    constructor(worldSecret, owner, site, cell) {
        this.#worldSecret = worldSecret;
        this.#owner = owner;
        this.#site = site;
        this.#cell = cell;
        Object.setPrototypeOf(this, null);
        Object.freeze(this);
    }
    static resolve(candidate, worldSecret, owner, site) {
        if ((typeof candidate !== "object" && typeof candidate !== "function") ||
            candidate === null || !(#cell in candidate))
            return null;
        const capability = candidate;
        return capability.#worldSecret === worldSecret &&
            capability.#owner === owner && capability.#site === site
            ? capability.#cell
            : null;
    }
    static resolveLegacyChange(candidate, worldSecret, change) {
        if ((typeof candidate !== "object" && typeof candidate !== "function") ||
            candidate === null || !(#cell in candidate))
            return null;
        const capability = candidate;
        if (capability.#worldSecret !== worldSecret)
            return null;
        const cell = capability.#cell;
        return capability.#owner === change.owner &&
            capability.#site === change.site
            ? cell
            : null;
    }
    static revoke(candidate, worldSecret) {
        if (!(#cell in candidate))
            return;
        const capability = candidate;
        if (capability.#worldSecret !== worldSecret)
            return;
        capability.#cell = null;
        capability.#worldSecret = null;
    }
}
/** A row-scoped lease, deliberately free of cell and World references. */
class NumericRowLease {
    #active = true;
    #owner;
    #layout;
    #row;
    #generation;
    #columns;
    #sources;
    #lanes;
    constructor(owner, layout, row, generation, columns) {
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
    static columns(candidate) {
        return candidate.#columns;
    }
    static sources(candidate) {
        return candidate.#sources;
    }
    static isCurrent(candidate, owner, site, layout, lane, slot, source) {
        if ((typeof candidate !== "object" && typeof candidate !== "function") ||
            candidate === null || !(#active in candidate))
            return false;
        return candidate.#active && candidate.#owner === owner &&
            candidate.#row === lane.row &&
            candidate.#generation === lane.generation &&
            candidate.#layout === layout && layout.slots[slot]?.siteId === site &&
            candidate.#columns[slot] === lane.column &&
            candidate.#sources[slot] === source &&
            candidate.#lanes[slot] === lane &&
            lane.owner === owner && lane.site === site;
    }
    static setSlot(candidate, slot, lane, source) {
        if (!candidate.#active)
            return;
        candidate.#sources[slot] = source;
        candidate.#lanes[slot] = lane;
    }
    static setSource(candidate, slot, source) {
        if (candidate.#active) {
            candidate.#sources[slot] = source;
        }
    }
    static clearSlot(candidate, slot) {
        candidate.#sources[slot] = undefined;
        candidate.#lanes[slot] = undefined;
    }
    static retire(candidate) {
        if (!candidate.#active)
            return;
        candidate.#sources.fill(undefined);
        candidate.#lanes.fill(undefined);
        candidate.#active = false;
    }
}
function makeNumericCellRowView(owner, site, layout, lease, lane, slot, source, sources, columns) {
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
function refreshNumericCellRowView(cell, owner, site) {
    const lane = cell.lane;
    const source = cell.source;
    const lease = cell.rowLease;
    const layout = cell.stateLayout;
    const slot = cell.numericLaneSlot;
    cell.rowView = lane && source && lease && layout && slot !== undefined
        ? makeNumericCellRowView(owner, site, layout, lease, lane, slot, source, NumericRowLease.sources(lease), NumericRowLease.columns(lease))
        : undefined;
}
/** Install the column as the only logical-value storage for a committed cell. */
function attachNumericLane(cell, lane, lease, layout, slot) {
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
    }
    else {
        Object.defineProperty(cell, "value", laneBackedValueDescriptor);
    }
}
/** Restore an ordinary writable value before the row is cleared or reused. */
function detachNumericLane(cell) {
    const lane = cell.lane;
    if (!lane)
        return null;
    const value = lane.column.values[lane.row];
    if (cell.rowLease && cell.numericLaneSlot !== undefined) {
        NumericRowLease.clearSlot(cell.rowLease, cell.numericLaneSlot);
    }
    cell.rowLease = undefined;
    cell.rowView = undefined;
    if (isCompiledNumericStateCell(cell)) {
        cell.boxedValue = value;
        cell.lane = undefined;
    }
    else {
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
const ownerPreparationCheckpointBrand = Symbol("OwnerPreparationCheckpoint");
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
    #owners = new Map();
    #childrenBySlot = new Map();
    #rootChildrenVersion = 0;
    #stateByOwner = new Map();
    #numericLayouts = new WeakMap();
    #identitySecret = Object.freeze({});
    #dirtyJournal = new WorldDirtyJournal();
    #changeListeners = new Set();
    #dirtyCellListeners = [];
    #claimedRootIds = new Map();
    #stagedOwners = new Set();
    #layoutRecord(owner, layout) {
        if (!this.#owners.has(owner))
            throw new Error(`Owner ${owner} is not alive`);
        const normalized = normalizeCompiledStateLayout(layout);
        const signature = compiledStateLayoutSignature(normalized);
        let storage = this.#numericLayouts.get(normalized);
        if (storage) {
            if (storage.signature !== signature) {
                throw new Error("Compiled state layout descriptor changed");
            }
            return storage;
        }
        const slotsBySite = new Map();
        const columns = normalized.slots.map(({ siteId, slot }) => {
            slotsBySite.set(siteId, slot);
            return new NumericColumn(_a.#nextSourceId++, slot, new Float64Array(0));
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
        this.#numericLayouts.set(normalized, storage);
        return storage;
    }
    #ensureCellLayout(owner, site, cell, layout) {
        if (!layout)
            return;
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
    #laneIsCurrent(owner, site, cell, lane) {
        return this.#owners.has(owner) &&
            this.#stateByOwner.get(owner)?.get(site) === cell &&
            this.#laneAddressIsCurrent(owner, site, cell, lane);
    }
    #laneAddressIsCurrent(owner, site, cell, lane) {
        const layout = cell.stateLayout;
        const slot = cell.numericLaneSlot;
        const lease = cell.rowLease;
        const source = cell.source;
        return !!layout && slot !== undefined && !!lease && !!source &&
            NumericRowLease.isCurrent(lease, owner, site, layout, lane, slot, source) && cell.lane === lane && cell.rowView?.rowIdentity === lease &&
            !cell.promoted && typeof cell.value === "number";
    }
    #ensureNumericLane(owner, site, cell) {
        const layout = cell.stateLayout;
        if (!layout || cell.promoted)
            return null;
        const slot = cell.numericLaneSlot;
        if (slot === undefined)
            return null;
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
        if (existing)
            this.#releaseNumericLane(owner, site, cell);
        let row = storage.rowsByOwner.get(owner);
        if (!row) {
            const recycled = storage.freeRows.pop();
            const rowIndex = recycled ?? storage.nextRow;
            const generation = storage.generations[rowIndex] ?? 1;
            try {
                for (const column of storage.columns)
                    column.reserve(rowIndex + 1);
                row = {
                    row: rowIndex,
                    generation,
                    cells: 0,
                    lease: new NumericRowLease(owner, layout, rowIndex, generation, storage.columns),
                };
            }
            catch (error) {
                if (recycled !== undefined)
                    storage.freeRows.push(recycled);
                throw error;
            }
            storage.generations[rowIndex] = generation;
            if (recycled === undefined)
                storage.nextRow++;
            storage.rowsByOwner.set(owner, row);
        }
        let counted = false;
        try {
            const column = storage.columns[slot];
            column.reserve(row.row + 1);
            const lane = Object.freeze({
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
        }
        catch (error) {
            if (cell.lane)
                this.#releaseNumericLane(owner, site, cell);
            else if (counted)
                row.cells--;
            if (row.cells === 0 && storage.rowsByOwner.get(owner) === row) {
                NumericRowLease.retire(row.lease);
                storage.rowsByOwner.delete(owner);
                storage.generations[row.row] = row.generation + 1;
                storage.freeRows.push(row.row);
            }
            throw error;
        }
    }
    #attachOptionalNumericLane(owner, site, cell) {
        if (!cell.stateLayout || cell.promoted ||
            typeof cell.value !== "number")
            return;
        try {
            this.#ensureNumericLane(owner, site, cell);
        }
        catch {
            this.#releaseNumericLane(owner, site, cell);
            cell.promoted = true;
        }
    }
    #releaseNumericLane(owner, site, cell) {
        const lane = cell.lane;
        if (!lane)
            return;
        const detached = detachNumericLane(cell);
        if (!detached)
            return;
        const storage = cell.stateLayout
            ? this.#numericLayouts.get(cell.stateLayout)
            : undefined;
        const row = storage?.rowsByOwner.get(owner);
        const slot = storage?.slotsBySite.get(site);
        if (!storage || !row || slot === undefined || row.row !== lane.row)
            return;
        lane.column.values[lane.row] = 0;
        row.cells--;
        if (row.cells !== 0)
            return;
        NumericRowLease.retire(row.lease);
        for (const column of storage.columns)
            column.values[row.row] = 0;
        const nextGeneration = row.generation + 1;
        storage.generations[row.row] = nextGeneration;
        storage.freeRows.push(row.row);
        storage.rowsByOwner.delete(owner);
    }
    #readStateValue(owner, site, cell) {
        void owner;
        void site;
        return cell.value;
    }
    /** Begin an isolated owner/state view for one candidate preparation attempt. */
    beginPreparation() {
        let state = "open";
        let publicationPrepared = false;
        let hostApplication = false;
        let preserveNewerCells = false;
        let publicationRecords = [];
        const publicationSiteMaps = new Map();
        const publicationParentMaps = new Map();
        const publicationSlotMaps = new Map();
        const publicationLayoutSlots = new Map();
        const publicationSources = new Map();
        const publicationDispatches = new Map();
        let hasStateWrites = false;
        const privateOwners = new Map();
        const privateSlots = new Map();
        const expectedSlots = new Map();
        const expectedCells = new Map();
        const candidateCells = new Map();
        const candidateInitialValues = new Map();
        const candidateDispatches = new Map();
        const undoJournal = [];
        const preparationIdentity = {};
        let checkpointMetadata = new WeakMap();
        let checkpointTop = null;
        let activeCheckpointCount = 0;
        const recordUndo = (undo) => undoJournal.push(undo);
        const setMap = (map, key, value) => {
            if (activeCheckpointCount !== 0) {
                const existed = map.has(key);
                const previous = map.get(key);
                recordUndo(() => {
                    if (existed)
                        map.set(key, previous);
                    else
                        map.delete(key);
                });
            }
            map.set(key, value);
        };
        const deleteMap = (map, key) => {
            if (!map.has(key))
                return;
            if (activeCheckpointCount !== 0) {
                const previous = map.get(key);
                recordUndo(() => map.set(key, previous));
            }
            map.delete(key);
        };
        const pruneCheckpointTop = () => {
            while (checkpointTop && !checkpointTop.active) {
                checkpointTop = checkpointTop.previous;
            }
        };
        const checkpointFor = (checkpoint) => {
            const metadata = checkpointMetadata.get(checkpoint);
            if (!metadata || metadata.preparation !== preparationIdentity ||
                !metadata.node.valid || !metadata.node.active) {
                throw new Error("Owner preparation checkpoint is invalid");
            }
            return metadata;
        };
        const assertOpen = (allowPrepared = false) => {
            if (state !== "open")
                throw new Error(`Owner preparation is ${state}`);
            if (publicationPrepared && !allowPrepared) {
                throw new Error("Owner publication has already been prepared");
            }
        };
        const getPrivateSlot = (parent, site, key) => privateSlots.get(parent)?.get(site)?.get(key);
        const putPrivateSlot = (parent, site, key, owner) => {
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
        const captureSlot = (parent, site, key) => {
            const existing = expectedSlots.get(parent)?.get(site)?.get(key);
            if (existing)
                return existing;
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
        const retainSlot = (captured) => {
            if (captured.retained)
                return;
            if (activeCheckpointCount !== 0) {
                recordUndo(() => captured.retained = false);
            }
            captured.retained = true;
        };
        const ownerRecord = (owner) => {
            const record = privateOwners.get(owner) ?? this.#owners.get(owner);
            if (!record) {
                throw new Error(`Owner ${owner} is not alive in this preparation`);
            }
            if (!privateOwners.has(owner)) {
                const slot = captureSlot(record.parent, record.componentSiteId, record.key);
                retainSlot(slot);
                if (slot.owner !== owner) {
                    throw new Error(`Owner ${owner} no longer occupies its committed slot`);
                }
            }
            return record;
        };
        const captureCell = (owner, site) => {
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
        const installSlot = (record) => {
            let bySite = this.#childrenBySlot.get(record.parent);
            if (!bySite) {
                bySite = publicationParentMaps.get(record.parent);
                this.#childrenBySlot.set(record.parent, bySite);
            }
            let byKey = bySite.get(record.componentSiteId);
            if (!byKey) {
                byKey = publicationSlotMaps.get(record.parent)?.get(record.componentSiteId);
                bySite.set(record.componentSiteId, byKey);
            }
            byKey.set(record.key, record.id);
            if (record.parent !== null) {
                this.#owners.get(record.parent).children.add(record.id);
            }
            this.#bumpParentChildrenVersion(record.parent);
        };
        const makeCandidateCell = (owner, site, initial, layout) => {
            let sites = candidateCells.get(owner);
            if (!sites) {
                sites = new Map();
                setMap(candidateCells, owner, sites);
            }
            let cell = sites.get(site);
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
                            cell.stateLayout = oldLayout;
                            cell.promoted = oldPromoted;
                            cell.numericLaneSlot = oldNumericLaneSlot;
                            cell.laneSlotResolved = oldLaneSlotResolved;
                        });
                    }
                    if (!cell.stateLayout)
                        cell.stateLayout = normalized;
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
                : captureCell(owner, site).cell;
            const normalizedLayout = layout
                ? normalizeCompiledStateLayout(layout)
                : committed?.stateLayout;
            if (layout && committed?.stateLayout &&
                compiledStateLayoutSignature(committed.stateLayout) !==
                    compiledStateLayoutSignature(normalizedLayout)) {
                throw new Error("State cell received a different compiled layout");
            }
            const value = committed
                ? committed.value
                : typeof initial === "function"
                    ? initial()
                    : initial;
            const stateLayout = committed?.stateLayout ?? normalizedLayout;
            const numericLaneSlot = stateLayout
                ? compiledStateLayoutSlot(stateLayout, site)
                : undefined;
            const source = committed?.source
                ? new ScalarSource(committed.source.id, committed.source.value)
                : typeof value === "number"
                    ? new ScalarSource(_a.#nextSourceId++, value)
                    : undefined;
            const promoted = committed?.promoted ||
                (numericLaneSlot !== undefined && typeof value !== "number")
                ? true
                : undefined;
            if (stateLayout && numericLaneSlot !== undefined &&
                typeof value === "number" && !promoted) {
                cell = makeCompiledNumericStateCell({
                    value: value,
                    version: committed?.version ?? 0,
                    layout: stateLayout,
                    slot: numericLaneSlot,
                    source,
                    dispatch: () => false,
                    laneSlotResolved: true,
                });
            }
            else {
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
            setMap(sites, site, cell);
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
                const bySite = currentParent ?? preparedParent;
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
                        const storage = this.#numericLayouts.get(normalized);
                        if (storage && storage.signature !== signature) {
                            throw new Error("Compiled state layout descriptor changed");
                        }
                        publicationLayoutSlots.set(candidate, compiledStateLayoutSlot(normalized, site));
                    }
                    if (!existing) {
                        publicationDispatches.set(candidate, (action) => this.#dispatchState(owner, site, candidate, action));
                    }
                    else if (candidate.version !== existing.version &&
                        typeof candidate.value === "number" && !existing.source) {
                        publicationSources.set(candidate, candidate.source ?? new ScalarSource(_a.#nextSourceId++, candidate.value));
                    }
                }
            }
            publicationPrepared = true;
        };
        const preparation = {
            resolveOwner: (parent, componentSiteId, key = null) => {
                assertOpen();
                if (!componentSiteId) {
                    throw new Error("Component site ID must not be empty");
                }
                if (parent !== null)
                    ownerRecord(parent);
                const overlay = getPrivateSlot(parent, componentSiteId, key);
                if (overlay !== undefined)
                    return overlay;
                if (privateOwners.has(parent)) {
                    const id = this.#nextOwner++;
                    const record = {
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
                if (expected.owner !== undefined)
                    retainSlot(expected);
                if (expected.owner !== undefined)
                    return expected.owner;
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
                if (parent !== null)
                    ownerRecord(parent);
                const privateOwner = getPrivateSlot(parent, componentSiteId, key);
                if (privateOwner !== undefined)
                    return privateOwner;
                if (parent !== null && privateOwners.has(parent))
                    return undefined;
                const expected = captureSlot(parent, componentSiteId, key);
                retainSlot(expected);
                return expected.owner;
            },
            replaceOwner: (parent, componentSiteId, key = null) => {
                assertOpen();
                if (!componentSiteId) {
                    throw new Error("Component site ID must not be empty");
                }
                if (parent !== null)
                    ownerRecord(parent);
                if (parent === null || !privateOwners.has(parent)) {
                    // Pin both the old occupant and the parent's shape generation. A
                    // sibling edit or replacement before publish makes this candidate stale.
                    captureSlot(parent, componentSiteId, key);
                }
                const id = this.#nextOwner++;
                const record = {
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
            useState: (owner, site, initial, layout) => {
                assertOpen();
                ownerRecord(owner);
                if (!site)
                    throw new Error("State site ID must not be empty");
                const cell = makeCandidateCell(owner, site, initial, layout);
                let dispatches = candidateDispatches.get(owner);
                if (!dispatches) {
                    dispatches = new Map();
                    setMap(candidateDispatches, owner, dispatches);
                }
                let control = dispatches.get(site);
                if (!control) {
                    control = {
                        candidateCell: cell,
                        discarded: false,
                        dispatch: (action) => false,
                    };
                    control.dispatch = (action) => {
                        if (control.discarded)
                            return false;
                        if (control.forward)
                            return control.forward(action);
                        if (hostApplication)
                            return false;
                        const candidate = control.candidateCell;
                        if (!candidate)
                            return false;
                        const typedAction = action;
                        const previous = candidate.value;
                        const next = typeof typedAction === "function"
                            ? typedAction(previous)
                            : typedAction;
                        if (Object.is(previous, next))
                            return false;
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
                        if (candidate.numericLaneSlot !== undefined &&
                            typeof next !== "number")
                            candidate.promoted = true;
                        hasStateWrites = true;
                        if (typeof next === "number") {
                            candidate.source ??= new ScalarSource(_a.#nextSourceId++, next);
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
                    control.dispatch,
                ];
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
                if (privateOwners.has(owner))
                    return null;
                const committed = captureCell(owner, site).cell;
                if (typeof committed?.value !== "number")
                    return null;
                const snapshot = makeCandidateCell(owner, site, committed.value);
                return snapshot.source ?? null;
            },
            hasStateWrites: () => hasStateWrites,
            checkpoint: () => {
                assertOpen();
                pruneCheckpointTop();
                const token = Object.freeze({});
                const node = {
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
                for (let index = undoJournal.length - 1; index >= metadata.cursor; index--) {
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
                checkpointMetadata.delete(checkpoint);
                pruneCheckpointTop();
                if (activeCheckpointCount === 0) {
                    checkpointTop = null;
                    undoJournal.length = 0;
                }
            },
            discardPrivateOwner: (owner) => {
                assertOpen();
                if (!privateOwners.has(owner))
                    return false;
                const previousHasStateWrites = hasStateWrites;
                if (activeCheckpointCount !== 0) {
                    recordUndo(() => hasStateWrites = previousHasStateWrites);
                }
                // Index private children and surviving slot owners once, so discard work is
                // proportional to private owners and removed cells.
                const privateChildren = new Map();
                const fallbackSlots = new Map();
                for (const [candidate, record] of privateOwners) {
                    if (record.parent !== null) {
                        let children = privateChildren.get(record.parent);
                        if (!children)
                            privateChildren.set(record.parent, children = []);
                        children.push(candidate);
                    }
                }
                const subtree = [];
                const subtreeSet = new Set();
                const collect = (current) => {
                    subtreeSet.add(current);
                    for (const child of privateChildren.get(current) ?? []) {
                        collect(child);
                    }
                    subtree.push(current);
                };
                collect(owner);
                for (const [candidate, record] of privateOwners) {
                    if (subtreeSet.has(candidate))
                        continue;
                    let bySite = fallbackSlots.get(record.parent);
                    if (!bySite)
                        fallbackSlots.set(record.parent, bySite = new Map());
                    let byKey = bySite.get(record.componentSiteId);
                    if (!byKey)
                        bySite.set(record.componentSiteId, byKey = new Map());
                    // Insertion order makes the last surviving owner the newest overlay.
                    byKey.set(record.key, candidate);
                }
                for (const current of subtree) {
                    const record = privateOwners.get(current);
                    for (const [site, control] of candidateDispatches.get(current) ?? []) {
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
                        if (oldSource)
                            oldSource.value = 0;
                        cell.source = undefined;
                    }
                    deleteMap(candidateDispatches, current);
                    deleteMap(candidateCells, current);
                    deleteMap(candidateInitialValues, current);
                    deleteMap(expectedCells, current);
                    deleteMap(privateOwners, current);
                    const overlay = getPrivateSlot(record.parent, record.componentSiteId, record.key);
                    if (overlay === current) {
                        const previousPrivate = fallbackSlots.get(record.parent)?.get(record.componentSiteId)?.get(record.key);
                        const bySite = privateSlots.get(record.parent)?.get(record.componentSiteId);
                        if (previousPrivate !== undefined) {
                            setMap(bySite, record.key, previousPrivate);
                        }
                        else if (bySite) {
                            deleteMap(bySite, record.key);
                            if (bySite.size === 0) {
                                const parentSlots = privateSlots.get(record.parent);
                                deleteMap(parentSlots, record.componentSiteId);
                                if (parentSlots.size === 0) {
                                    deleteMap(privateSlots, record.parent);
                                }
                            }
                            // Drop a capture used only to create the now-cancelled overlay.
                            const expectedByKey = expectedSlots.get(record.parent)?.get(record.componentSiteId);
                            const expected = expectedByKey?.get(record.key);
                            // An absent fallback means no surviving private owner depends on this
                            // capture; fallbackSlots excludes the discarded subtree.
                            if (expectedByKey && expected && !expected.retained) {
                                deleteMap(expectedByKey, record.key);
                                if (expectedByKey.size === 0) {
                                    const expectedBySite = expectedSlots.get(record.parent);
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
                        if (candidate.version !== baseVersion)
                            hasStateWrites = true;
                    }
                }
                return true;
            },
            validate: () => {
                if (state !== "open")
                    return false;
                for (const [owner, record] of privateOwners) {
                    if (record.parent !== null && !privateOwners.has(record.parent) &&
                        this.#owners.get(record.parent) === undefined)
                        return false;
                    const slot = expectedSlots.get(record.parent)?.get(record.componentSiteId)?.get(record.key);
                    if (!privateOwners.has(record.parent) && !slot) {
                        return false;
                    }
                }
                for (const bySite of expectedSlots.values()) {
                    for (const byKey of bySite.values()) {
                        for (const expected of byKey.values()) {
                            if (this.#childrenBySlot.get(expected.parent)?.get(expected.site)
                                ?.get(expected.key) !== expected.owner)
                                return false;
                            if (this.#parentChildrenVersion(expected.parent) !==
                                expected.parentVersion)
                                return false;
                        }
                    }
                }
                for (const [owner, sites] of expectedCells) {
                    if (!this.#owners.has(owner))
                        return false;
                    for (const [site, expected] of sites) {
                        const current = this.#stateByOwner.get(owner)?.get(site);
                        if (current !== expected.cell ||
                            (current?.version ?? 0) !== expected.version)
                            return false;
                    }
                }
                return true;
            },
            validatePublicationInputs: () => {
                if (state !== "open")
                    return false;
                for (const record of privateOwners.values()) {
                    if (record.parent !== null && !privateOwners.has(record.parent) &&
                        this.#owners.get(record.parent) === undefined)
                        return false;
                    const slot = expectedSlots.get(record.parent)?.get(record.componentSiteId)?.get(record.key);
                    if (!privateOwners.has(record.parent) && !slot) {
                        return false;
                    }
                }
                for (const bySite of expectedSlots.values()) {
                    for (const byKey of bySite.values()) {
                        for (const expected of byKey.values()) {
                            if (this.#childrenBySlot.get(expected.parent)?.get(expected.site)
                                ?.get(expected.key) !== expected.owner ||
                                this.#parentChildrenVersion(expected.parent) !==
                                    expected.parentVersion)
                                return false;
                        }
                    }
                }
                for (const [owner, sites] of expectedCells) {
                    if (!this.#owners.has(owner))
                        return false;
                    for (const [site, expected] of sites) {
                        const current = this.#stateByOwner.get(owner)?.get(site);
                        if (current !== expected.cell ||
                            (current?.version ?? 0) < expected.version)
                            return false;
                        const candidate = candidateCells.get(owner)?.get(site);
                        if (current && current.version > expected.version && candidate &&
                            candidate.version > expected.version)
                            return false;
                    }
                }
                return true;
            },
            preparePublication: () => {
                if (publicationPrepared && state === "open")
                    return;
                assertOpen();
                if (!preparation.validate()) {
                    throw new Error("Owner preparation is stale");
                }
                preserveNewerCells = false;
                prepareAcceptedData();
            },
            beginHostApplication: () => {
                assertOpen();
                if (hostApplication)
                    return;
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
                if (publicationPrepared && state === "open")
                    return;
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
                        this.#stateByOwner.set(owner, committedSites = publicationSiteMaps.get(owner));
                    }
                    for (const [site, candidate] of sites) {
                        const candidateLayout = candidate.stateLayout;
                        const existing = committedSites.get(site);
                        if (existing) {
                            if (candidateLayout && !existing.laneSlotResolved) {
                                existing.stateLayout = candidateLayout;
                                existing.numericLaneSlot = publicationLayoutSlots.get(candidate);
                                existing.laneSlotResolved = true;
                                if (existing.numericLaneSlot !== undefined &&
                                    typeof existing.value !== "number")
                                    existing.promoted = true;
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
                                    existing.source ??= publicationSources.get(candidate);
                                    existing.source.value = candidate.value;
                                    if (existing.rowLease &&
                                        existing.numericLaneSlot !== undefined) {
                                        NumericRowLease.setSource(existing.rowLease, existing.numericLaneSlot, existing.source);
                                    }
                                }
                                this.#markCellDirty(owner, site, existing);
                            }
                            continue;
                        }
                        candidate.dispatch = publicationDispatches.get(candidate);
                        committedSites.set(site, candidate);
                        if (candidate.version > 0) {
                            this.#markCellDirty(owner, site, candidate);
                        }
                    }
                }
                for (const [owner, sites] of candidateCells) {
                    for (const site of sites.keys()) {
                        const cell = this.#stateByOwner.get(owner)?.get(site);
                        if (cell)
                            this.#attachOptionalNumericLane(owner, site, cell);
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
            notifyPublished: () => { },
            publish: () => {
                preparation.preparePublication();
                preparation.publishAccepted();
                preparation.notifyPublished();
            },
            discard: () => {
                if (state !== "open")
                    return;
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
                        if (cell.source)
                            cell.source.value = 0;
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
    claimRootId(rootId) {
        if (!rootId)
            throw new Error("Component root ID must not be empty");
        if (this.#claimedRootIds.has(rootId)) {
            throw new Error(`Component root ID ${rootId} is already active in this world`);
        }
        const owner = this.resolveOwner(null, `@component-root:${rootId}`);
        this.#claimedRootIds.set(rootId, owner);
        return owner;
    }
    releaseRootId(rootId, owner) {
        if (this.#claimedRootIds.get(rootId) !== owner)
            return;
        this.#claimedRootIds.delete(rootId);
    }
    resolveOwner(parent, componentSiteId, key = null) {
        if (componentSiteId.length === 0) {
            throw new Error("Component site ID must not be empty");
        }
        if (parent !== null)
            this.#assertOwner(parent);
        let bySite = this.#childrenBySlot.get(parent);
        if (!bySite)
            this.#childrenBySlot.set(parent, bySite = new Map());
        let byKey = bySite.get(componentSiteId);
        if (!byKey)
            bySite.set(componentSiteId, byKey = new Map());
        const existing = byKey.get(key);
        if (existing !== undefined)
            return existing;
        const id = this.#nextOwner++;
        this.#owners.set(id, {
            id,
            parent,
            componentSiteId,
            key,
            children: new Set(),
            childrenVersion: 0,
        });
        if (parent !== null)
            this.#owners.get(parent).children.add(id);
        byKey.set(key, id);
        this.#bumpParentChildrenVersion(parent);
        return id;
    }
    /** Allocate a private incarnation without replacing a committed keyed slot. */
    createStagedOwner(parent, componentSiteId, key) {
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
        this.#owners.get(parent).children.add(id);
        this.#stagedOwners.add(id);
        return id;
    }
    /** Validate a staged slot and allocate its missing maps before acceptance. */
    prepareStagedOwnerActivation(owner, previousOwner) {
        this.#assertOwner(owner);
        if (!this.#stagedOwners.has(owner))
            throw new Error("Owner is not staged");
        const record = this.#owners.get(owner);
        const bySite = this.#childrenBySlot.get(record.parent);
        const byKey = bySite?.get(record.componentSiteId);
        const current = byKey?.get(record.key);
        if (current !== previousOwner) {
            throw new Error("Staged owner slot changed before publication");
        }
        const preparedSite = bySite ?? new Map();
        const preparedKey = byKey ?? new Map();
        let installed = false;
        return () => {
            if (installed)
                return;
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
    activateStagedOwner(owner, previousOwner) {
        this.prepareStagedOwnerActivation(owner, previousOwner)();
    }
    findOwner(parent, componentSiteId, key = null) {
        if (parent !== null)
            this.#assertOwner(parent);
        return this.#childrenBySlot.get(parent)?.get(componentSiteId)?.get(key);
    }
    /** React-like state API with an explicit, compiler-addressable site ID. */
    useState(owner, site, initial, layout) {
        this.#assertOwner(owner);
        if (site.length === 0)
            throw new Error("State site ID must not be empty");
        let sites = this.#stateByOwner.get(owner);
        if (!sites)
            this.#stateByOwner.set(owner, sites = new Map());
        let cell = sites.get(site);
        if (!cell) {
            const value = typeof initial === "function"
                ? initial()
                : initial;
            const normalizedLayout = layout
                ? normalizeCompiledStateLayout(layout)
                : undefined;
            const numericLaneSlot = normalizedLayout
                ? compiledStateLayoutSlot(normalizedLayout, site)
                : undefined;
            const source = typeof value === "number"
                ? new ScalarSource(_a.#nextSourceId++, value)
                : undefined;
            if (normalizedLayout && numericLaneSlot !== undefined &&
                typeof value === "number") {
                cell = makeCompiledNumericStateCell({
                    value: value,
                    version: 0,
                    layout: normalizedLayout,
                    slot: numericLaneSlot,
                    source,
                    dispatch: () => false,
                    laneSlotResolved: false,
                });
            }
            else {
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
                if (source)
                    cell.source = source;
            }
            cell.dispatch = (action) => this.#dispatchState(owner, site, cell, action);
            sites.set(site, cell);
        }
        if (layout)
            this.#ensureCellLayout(owner, site, cell, layout);
        if (cell.stateLayout && !cell.promoted && typeof cell.value === "number") {
            this.#attachOptionalNumericLane(owner, site, cell);
        }
        return [this.#readStateValue(owner, site, cell), cell.dispatch];
    }
    /** Return the stable committed lane address, if this cell is lane-backed. */
    numericLane(owner, site) {
        if (!this.#owners.has(owner))
            return null;
        const cell = this.#stateByOwner.get(owner)?.get(site);
        const lane = cell?.lane;
        return cell && lane && this.#laneIsCurrent(owner, site, cell, lane)
            ? lane
            : null;
    }
    /** Resolve a captured handle/version to its exact live numeric lane address. */
    numericLaneForCell(handle, version) {
        const capturedVersion = version;
        if (!Number.isSafeInteger(capturedVersion))
            return null;
        let owner;
        let site;
        let identity;
        try {
            owner = handle.owner;
            site = handle.site;
            identity = handle.cellIdentity;
        }
        catch {
            return null;
        }
        const cell = this.#resolveCellIdentity(identity, owner, site);
        if (!cell || cell.version !== capturedVersion)
            return null;
        const lane = cell.lane;
        return lane && this.#laneAddressIsCurrent(owner, site, cell, lane)
            ? lane
            : null;
    }
    /** Resolve a committed numeric cell to its cached row projection. */
    numericRowForCell(handle, version) {
        const capturedVersion = version;
        if (!Number.isSafeInteger(capturedVersion))
            return null;
        let owner;
        let site;
        let identity;
        try {
            owner = handle.owner;
            site = handle.site;
            identity = handle.cellIdentity;
        }
        catch {
            return null;
        }
        const cell = this.#resolveCellIdentity(identity, owner, site);
        if (!cell || cell.version !== capturedVersion)
            return null;
        const lane = cell.lane;
        const view = cell.rowView;
        const lease = cell.rowLease;
        const layout = cell.stateLayout;
        const slot = cell.numericLaneSlot;
        if (!lane || !cell.source || !view || !lease || !layout ||
            slot === undefined ||
            view.rowIdentity !== lease || view.owner !== owner || view.site !== site ||
            view.layout !== layout || view.row !== lane.row ||
            view.generation !== lane.generation || view.slot !== slot ||
            view.lane !== lane || view.source !== cell.source ||
            !this.#laneAddressIsCurrent(owner, site, cell, lane))
            return null;
        return view;
    }
    #resolveCellIdentity(identity, owner, site) {
        if (!Number.isSafeInteger(owner) || typeof site !== "string" ||
            site.length === 0)
            return null;
        return CommittedCellCapability.resolve(identity, this.#identitySecret, owner, site);
    }
    #resolveCellHandle(handle) {
        let owner;
        let site;
        let identity;
        try {
            owner = handle.owner;
            site = handle.site;
            identity = handle.cellIdentity;
        }
        catch {
            return null;
        }
        return this.#resolveCellIdentity(identity, owner, site);
    }
    version(owner, site) {
        this.#assertOwner(owner);
        return this.#stateByOwner.get(owner)?.get(site)?.version ?? 0;
    }
    /** Return one live committed cell's stable capability without dispatching it. */
    cellHandle(owner, site) {
        if (!this.#owners.has(owner) || this.#stagedOwners.has(owner))
            return null;
        const cell = this.#stateByOwner.get(owner)?.get(site);
        return cell ? this.#handleForCell(owner, site, cell) : null;
    }
    #handleForCell(owner, site, cell) {
        let handle = cell.cellHandle;
        if (handle)
            return handle;
        const cellIdentity = new CommittedCellCapability(this.#identitySecret, owner, site, cell);
        cell.cellIdentity = cellIdentity;
        handle = Object.freeze({ owner, site, cellIdentity });
        cell.cellHandle = handle;
        return handle;
    }
    /** Stable scalar handle for a numeric state cell; nonnumeric sites have none. */
    scalarSource(owner, site) {
        this.#assertOwner(owner);
        const cell = this.#stateByOwner.get(owner)?.get(site);
        return cell && typeof this.#readStateValue(owner, site, cell) === "number"
            ? cell.source ?? null
            : null;
    }
    /** Resolve the canonical source for an identity-bearing committed change. */
    scalarSourceForChange(change) {
        const cell = change.cellIdentity
            ? CommittedCellCapability.resolveLegacyChange(change.cellIdentity, this.#identitySecret, change)
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
    scalarSourceForCell(handle) {
        const cell = this.#resolveCellHandle(handle);
        return cell && typeof cell.value === "number"
            ? cell.source ?? null
            : null;
    }
    /** Resolve the current version for an identity-bearing committed change. */
    versionForChange(change) {
        const cell = change.cellIdentity
            ? CommittedCellCapability.resolveLegacyChange(change.cellIdentity, this.#identitySecret, change)
            : null;
        if (cell) {
            this.#assertOwner(change.owner);
            return cell.version;
        }
        return this.version(change.owner, change.site);
    }
    /** Resolve the current version for an exact committed cell handle. */
    versionForCell(handle) {
        return this.#resolveCellHandle(handle)?.version ?? null;
    }
    /** Clear dirty cells only when each exact cell has not advanced past its cut. */
    clearCellChangesThrough(handles, versions, count) {
        if (!Number.isSafeInteger(count) || count < 0 || count > handles.length ||
            count > versions.length)
            throw new RangeError("Invalid native state change count");
        for (let index = 0; index < count; index++) {
            let handle;
            let version;
            try {
                handle = handles[index];
                version = versions[index];
            }
            catch {
                continue;
            }
            if (!handle || !Number.isSafeInteger(version))
                continue;
            const cell = this.#resolveCellHandle(handle);
            if (!cell || cell.version > version)
                continue;
            const membership = cell.dirtyMembership;
            if (membership)
                this.#dirtyJournal.deletePrepared(membership);
        }
    }
    /** Clear only changes at or below the captured versions. Reentrant writes survive. */
    clearChangesThrough(captured) {
        for (const change of captured) {
            if (!this.#dirtyJournal.has(change.owner, change.site))
                continue;
            if (!this.#owners.has(change.owner) ||
                this.versionForChange(change) <= change.version) {
                this.#dirtyJournal.delete(change.owner, change.site);
            }
        }
    }
    /** Coalesce repeated writes to the same owner/site until a scheduler consumes them. */
    pendingChanges() {
        const changes = [];
        for (const [owner, site] of this.#dirtyJournal.entries()) {
            changes.push({ owner, site, version: this.version(owner, site) });
        }
        return changes;
    }
    drainChanges() {
        const changes = this.pendingChanges();
        this.#dirtyJournal.clear();
        return changes;
    }
    /** Return the changed owner and its component ancestors up to the root entity. */
    ownerLineage(owner) {
        this.#assertOwner(owner);
        const lineage = [];
        let current = owner;
        while (current !== null) {
            lineage.push(current);
            current = this.#owners.get(current).parent;
        }
        return lineage;
    }
    isAlive(owner) {
        return this.#owners.has(owner);
    }
    isWithin(owner, ancestor) {
        if (!this.#owners.has(owner) || !this.#owners.has(ancestor))
            return false;
        let current = owner;
        while (current !== null) {
            if (current === ancestor)
                return true;
            current = this.#owners.get(current).parent;
        }
        return false;
    }
    hasPendingChanges() {
        return this.#dirtyJournal.size !== 0;
    }
    subscribeChanges(listener) {
        this.#changeListeners.add(listener);
        return () => this.#changeListeners.delete(listener);
    }
    /** Subscribe to committed state writes without allocating public change records. */
    subscribeDirtyCells(listener) {
        this.#dirtyCellListeners = [...this.#dirtyCellListeners, listener];
        let subscribed = true;
        return () => {
            if (!subscribed)
                return;
            subscribed = false;
            const index = this.#dirtyCellListeners.indexOf(listener);
            if (index < 0)
                return;
            this.#dirtyCellListeners = [
                ...this.#dirtyCellListeners.slice(0, index),
                ...this.#dirtyCellListeners.slice(index + 1),
            ];
        };
    }
    /** Destroy an owner and all nested keyed/component owners, including state traits. */
    destroyOwner(owner) {
        const record = this.#owners.get(owner);
        if (!record)
            return false;
        for (const child of [...record.children])
            this.destroyOwner(child);
        const bySite = this.#childrenBySlot.get(record.parent);
        const byKey = bySite?.get(record.componentSiteId);
        if (byKey?.get(record.key) === owner) {
            byKey.delete(record.key);
            this.#bumpParentChildrenVersion(record.parent);
        }
        if (byKey?.size === 0)
            bySite?.delete(record.componentSiteId);
        if (bySite?.size === 0)
            this.#childrenBySlot.delete(record.parent);
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
    #assertOwner(owner) {
        if (!this.#owners.has(owner)) {
            throw new Error(`Owner ${owner} is not alive`);
        }
    }
    #markCellDirty(owner, site, cell) {
        let membership = cell.dirtyMembership;
        if (!membership) {
            membership = this.#dirtyJournal.prepareMembership(owner, site);
            cell.dirtyMembership = membership;
        }
        if (!this.#dirtyJournal.markPrepared(membership)) {
            throw new Error("Committed cell has stale dirty membership");
        }
    }
    #parentChildrenVersion(parent) {
        return parent === null
            ? this.#rootChildrenVersion
            : this.#owners.get(parent)?.childrenVersion ?? -1;
    }
    #bumpParentChildrenVersion(parent) {
        if (parent === null) {
            this.#rootChildrenVersion++;
            return;
        }
        const record = this.#owners.get(parent);
        if (record)
            record.childrenVersion++;
    }
    #dispatchState(owner, site, cell, action) {
        this.#assertOwner(owner);
        const previous = cell.value;
        const isUpdater = typeof action === "function";
        const next = isUpdater
            ? action(previous)
            : action;
        // User code may synchronously destroy this owner while calculating next.
        // Reject that dispatch before it can dirty or recreate a dead identity.
        if (isUpdater && (!this.#owners.has(owner) ||
            this.#stateByOwner.get(owner)?.get(site) !== cell))
            return false;
        if (Object.is(previous, next))
            return false;
        if (cell.lane && typeof next !== "number") {
            this.#releaseNumericLane(owner, site, cell);
            cell.promoted = true;
        }
        else if (cell.numericLaneSlot !== undefined &&
            typeof next !== "number") {
            cell.promoted = true;
        }
        cell.value = next;
        cell.version++;
        if (typeof next === "number") {
            cell.source ??= new ScalarSource(_a.#nextSourceId++, next);
            cell.source.value = next;
            if (cell.rowLease && cell.numericLaneSlot !== undefined) {
                NumericRowLease.setSource(cell.rowLease, cell.numericLaneSlot, cell.source);
                if (!cell.rowView) {
                    refreshNumericCellRowView(cell, owner, site);
                }
            }
        }
        this.#markCellDirty(owner, site, cell);
        if (typeof next === "number" && !cell.lane &&
            cell.numericLaneSlot !== undefined && !cell.promoted) {
            this.#attachOptionalNumericLane(owner, site, cell);
        }
        const handle = this.#handleForCell(owner, site, cell);
        const cellIdentity = handle.cellIdentity;
        const version = cell.version;
        // Capture both listener cuts before callbacks run. Subscription changes
        // during a notification affect the next dispatch, including public ones.
        const dirtyCellListeners = this.#dirtyCellListeners;
        const changeListeners = this.#changeListeners.size > 0
            ? [...this.#changeListeners]
            : null;
        for (const listener of dirtyCellListeners)
            listener(handle, version);
        if (changeListeners) {
            const change = { owner, site, version, cellIdentity };
            for (const listener of changeListeners)
                listener(change);
        }
        return true;
    }
}
_a = OwnerStateWorld;
//# sourceMappingURL=owner_state_world.js.map