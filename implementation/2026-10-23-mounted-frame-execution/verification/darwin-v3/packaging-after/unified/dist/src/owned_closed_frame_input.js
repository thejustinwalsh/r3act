const inputKey = Symbol("owned-closed-frame-input");
const planKey = Symbol("owned-closed-frame-plan");
const fillKey = Symbol("owned-closed-frame-fill");
const intrinsicDefineProperty = Object.defineProperty;
const intrinsicFreeze = Object.freeze;
const intrinsicPush = Array.prototype.push;
const intrinsicApply = Reflect.apply;
const intrinsicIsArray = Array.isArray;
const intrinsicIsSafeInteger = Number.isSafeInteger;
const intrinsicIsFinite = Number.isFinite;
const intrinsicIs = Object.is;
import { isBoundClosedProjectionRequest, ownedClosedProjectionPathCount, ownedClosedProjectionMetadata, } from "./async_store_runtime.js";
import { isOwnedClosedWorldInputRequest, } from "./owner_state_world.js";
/** Ephemeral numeric columns owned by one sealed frame capture. */
export class OwnedClosedFrameInput {
    #shared;
    #varying;
    #sharedFilled;
    #varyingFilled;
    #varyingWidth;
    #sealed = false;
    constructor(key, sharedCount, varyingCount, rowCount) {
        if (key !== inputKey || !intrinsicIsSafeInteger(sharedCount) ||
            !intrinsicIsSafeInteger(varyingCount) || !intrinsicIsSafeInteger(rowCount) ||
            sharedCount < 0 || varyingCount < 0 || rowCount < 1 || rowCount > 4096 ||
            sharedCount > 256 || varyingCount > 256) {
            throw new TypeError("Invalid closed frame input shape");
        }
        this.#shared = [];
        this.#varying = [];
        this.#varyingWidth = varyingCount;
        this.#sharedFilled = [];
        this.#varyingFilled = [];
        for (let index = 0; index < sharedCount; index++) {
            intrinsicDefineProperty(this.#sharedFilled, index, { value: false,
                writable: true, enumerable: true, configurable: true });
            intrinsicDefineProperty(this.#shared, index, { value: NaN,
                writable: true, enumerable: true, configurable: true });
        }
        for (let index = 0; index < varyingCount * rowCount; index++) {
            intrinsicDefineProperty(this.#varyingFilled, index, { value: false,
                writable: true, enumerable: true, configurable: true });
            intrinsicDefineProperty(this.#varying, index, { value: NaN,
                writable: true, enumerable: true, configurable: true });
        }
        intrinsicFreeze(this);
    }
    get sharedCount() { return this.#shared.length; }
    get varyingCount() { return this.#varyingWidth; }
    static owns(value) {
        try {
            return typeof value === "object" && value !== null && #shared in value;
        }
        catch {
            return false;
        }
    }
    setShared(index, value) {
        if (this.#sealed || !intrinsicIsSafeInteger(index) || index < 0 || index >= this.#shared.length ||
            typeof value !== "number" || !intrinsicIsFinite(value)) {
            throw new TypeError("Invalid shared input");
        }
        if (this.#sharedFilled[index] && !intrinsicIs(this.#shared[index], value))
            throw new TypeError("Conflicting shared input");
        this.#shared[index] = value;
        this.#sharedFilled[index] = true;
    }
    setVarying(index, value) {
        if (this.#sealed || !intrinsicIsSafeInteger(index) || index < 0 || index >= this.#varying.length ||
            typeof value !== "number" || !intrinsicIsFinite(value) ||
            this.#varyingFilled[index])
            throw new TypeError("Invalid varying input");
        this.#varying[index] = value;
        this.#varyingFilled[index] = true;
    }
    buffers() {
        if (this.#sealed)
            throw new TypeError("Closed frame input already consumed");
        for (let index = 0; index < this.#sharedFilled.length; index++)
            if (!this.#sharedFilled[index])
                throw new TypeError("Incomplete closed frame input");
        for (let index = 0; index < this.#varyingFilled.length; index++)
            if (!this.#varyingFilled[index])
                throw new TypeError("Incomplete closed frame input");
        this.#sealed = true;
        return intrinsicFreeze({ shared: intrinsicFreeze(this.#shared),
            varying: intrinsicFreeze(this.#varying) });
    }
}
export const createOwnedClosedFrameInput = (sharedCount, varyingCount, rowCount) => new OwnedClosedFrameInput(inputKey, sharedCount, varyingCount, rowCount);
Object.freeze(OwnedClosedFrameInput.prototype);
Object.freeze(OwnedClosedFrameInput);
/** Immutable group geometry composed through an ordered row remap. */
export class OwnedClosedFramePlan {
    #rows;
    #columns;
    #chunks;
    #readers;
    #readerIndex;
    #stores;
    #readersByStore;
    #uniqueProjections;
    #columnProjectionIndex;
    #projectionIndexByStore;
    constructor(key, rows, columns, chunks, readers, readerIndex, stores, readersByStore, uniqueProjections, columnProjectionIndex, projectionIndexByStore) {
        if (key !== planKey)
            throw new TypeError("Invalid closed frame plan");
        this.#rows = intrinsicFreeze(rows);
        this.#columns = intrinsicFreeze(columns);
        this.#chunks = intrinsicFreeze(chunks);
        this.#readers = intrinsicFreeze(readers);
        this.#readerIndex = readerIndex;
        this.#stores = intrinsicFreeze(stores);
        this.#readersByStore = intrinsicFreeze(readersByStore);
        this.#uniqueProjections = intrinsicFreeze(uniqueProjections);
        this.#columnProjectionIndex = intrinsicFreeze(columnProjectionIndex);
        this.#projectionIndexByStore = projectionIndexByStore;
        intrinsicFreeze(this);
    }
    static create(rows, previous) {
        if (!intrinsicIsArray(rows) || !rows.length || rows.length > 65536 ||
            (previous && !OwnedClosedFramePlan.owns(previous)))
            return null;
        const groupRows = new Map();
        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            if (!isOwnedClosedWorldInputRequest(row.world) ||
                !intrinsicIsArray(row.projections) || row.projections.length > 8 ||
                !intrinsicIsSafeInteger(row.group) || row.group < -1 ||
                !intrinsicIsSafeInteger(row.groupRow) ||
                (row.group < 0 ? row.groupRow !== -1 : row.groupRow < 0))
                return null;
            const group = row.group < 0 ? -index - 1 : row.group;
            let members = groupRows.get(group);
            if (!members)
                groupRows.set(group, members = []);
            if (row.group >= 0 && row.groupRow !== members.length)
                return null;
            members.push(index);
        }
        const chunks = [];
        const orderedRows = Array(rows.length);
        const priorByWorld = new Map();
        for (const chunk of previous ? previous.#chunks : []) {
            const world = chunk.rows[0].world;
            let candidates = priorByWorld.get(world);
            if (!candidates)
                priorByWorld.set(world, candidates = []);
            candidates.push(chunk);
        }
        const usedPrior = new Set();
        for (const members of groupRows.values()) {
            const same = (chunk) => chunk.rows.length === members.length && members.every((ordinal, localRow) => {
                const source = rows[ordinal], prior = chunk.rows[localRow];
                return prior.world === source.world &&
                    prior.projections.length === source.projections.length &&
                    prior.projections.every((bound, index) => bound === source.projections[index]);
            });
            let chunk = priorByWorld.get(rows[members[0]].world)?.find((candidate) => !usedPrior.has(candidate) && same(candidate));
            if (chunk)
                usedPrior.add(chunk);
            else {
                const chunkRows = [];
                const chunkColumns = [];
                for (let localRow = 0; localRow < members.length; localRow++) {
                    const source = rows[members[localRow]];
                    const projections = [];
                    const columns = [];
                    let offset = 0;
                    for (const bound of source.projections) {
                        if (!isBoundClosedProjectionRequest(bound))
                            return null;
                        projections.push(bound);
                        columns.push(intrinsicFreeze({ bound, sharedOffset: offset,
                            fillShared: localRow === 0 }));
                        offset += ownedClosedProjectionPathCount(bound);
                    }
                    chunkRows.push(intrinsicFreeze({ world: source.world,
                        projections: intrinsicFreeze(projections) }));
                    chunkColumns.push(intrinsicFreeze(columns));
                }
                chunk = intrinsicFreeze({ identity: intrinsicFreeze({}),
                    rows: intrinsicFreeze(chunkRows),
                    columns: intrinsicFreeze(chunkColumns) });
            }
            chunks.push(chunk);
            for (let localRow = 0; localRow < members.length; localRow++) {
                const ordinal = members[localRow];
                orderedRows[ordinal] = intrinsicFreeze({ chunk, localRow,
                    group: rows[ordinal].group });
            }
        }
        const orderedColumns = [];
        for (let ordinal = 0; ordinal < orderedRows.length; ordinal++) {
            const entry = orderedRows[ordinal];
            const columns = entry.chunk.columns[entry.localRow];
            for (let localColumn = 0; localColumn < columns.length; localColumn++) {
                if (orderedColumns.length >= 65536)
                    return null;
                orderedColumns.push(intrinsicFreeze({ chunk: entry.chunk,
                    localRow: entry.localRow, localColumn, group: entry.group,
                    fallbackRow: entry.group < 0 ? ordinal : -1 }));
            }
        }
        const readers = [];
        const readerIndex = new Map();
        const stores = [];
        const storeIndex = new Map();
        const readersByStore = [];
        const uniqueProjections = [];
        const columnProjectionIndex = [];
        const projectionByStore = new Map();
        for (const column of orderedColumns) {
            const bound = column.chunk.columns[column.localRow][column.localColumn].bound;
            const request = ownedClosedProjectionMetadata(bound);
            if (!request)
                return null;
            let byPath = projectionByStore.get(request.store);
            if (!byPath)
                projectionByStore.set(request.store, byPath = new Map());
            let projectionIndex = byPath.get(request.paths);
            if (projectionIndex === undefined) {
                projectionIndex = uniqueProjections.length;
                byPath.set(request.paths, projectionIndex);
                uniqueProjections.push(bound);
            }
            columnProjectionIndex.push(projectionIndex);
            const priorIndex = readerIndex.get(request.readerId);
            if (priorIndex !== undefined) {
                const prior = ownedClosedProjectionMetadata(readers[priorIndex]);
                if (!prior || prior.store !== request.store)
                    return null;
                continue;
            }
            readerIndex.set(request.readerId, readers.length);
            readers.push(bound);
            let index = storeIndex.get(request.store);
            if (index === undefined) {
                index = stores.length;
                storeIndex.set(request.store, index);
                stores.push(request.store);
                readersByStore.push([]);
            }
            readersByStore[index].push(request.readerId);
        }
        return new OwnedClosedFramePlan(planKey, orderedRows, orderedColumns, chunks, readers, readerIndex, stores, readersByStore.map((row) => intrinsicFreeze(row)), uniqueProjections, columnProjectionIndex, projectionByStore);
    }
    static owns(value) {
        try {
            return typeof value === "object" && value !== null && #rows in value;
        }
        catch {
            return false;
        }
    }
    get rowCount() { return this.#rows.length; }
    get projectionCount() { return this.#columns.length; }
    get readerCount() { return this.#readers.length; }
    get storeCount() { return this.#stores.length; }
    get uniqueProjectionCount() { return this.#uniqueProjections.length; }
    uniqueProjectionAt(index) {
        return this.#uniqueProjections[index];
    }
    projectionIndexAt(index) { return this.#columnProjectionIndex[index]; }
    projectionIndexFor(store, paths) {
        return this.#projectionIndexByStore.get(store)?.get(paths) ?? -1;
    }
    readerAt(index) { return this.#readers[index]; }
    readerIndexForId(id) { return this.#readerIndex.get(id) ?? -1; }
    storeAt(index) { return this.#stores[index]; }
    storeReadersAt(index) {
        return this.#readersByStore[index];
    }
    worldAt(index) {
        const row = this.#rows[index];
        return row.chunk.rows[row.localRow].world;
    }
    rowGroupAt(index) { return this.#rows[index].group; }
    groupRowAt(index) {
        const row = this.#rows[index];
        return row.group < 0 ? -1 : row.localRow;
    }
    boundAt(index) {
        const column = this.#columns[index];
        return column.chunk.columns[column.localRow][column.localColumn].bound;
    }
    projectionGroupAt(index) { return this.#columns[index].group; }
    sharedOffsetAt(index) {
        const column = this.#columns[index];
        return column.chunk.columns[column.localRow][column.localColumn].sharedOffset;
    }
    fillSharedAt(index) {
        const column = this.#columns[index];
        return column.chunk.columns[column.localRow][column.localColumn].fillShared;
    }
    fallbackRowAt(index) { return this.#columns[index].fallbackRow; }
    chunkAt(index) { return this.#rows[index].chunk.identity; }
}
export const createOwnedClosedFramePlan = OwnedClosedFramePlan.create;
const canonicalPlanWorldAt = OwnedClosedFramePlan.prototype.worldAt;
const canonicalPlanRowGroupAt = OwnedClosedFramePlan.prototype.rowGroupAt;
const canonicalPlanGroupRowAt = OwnedClosedFramePlan.prototype.groupRowAt;
const canonicalPlanBoundAt = OwnedClosedFramePlan.prototype.boundAt;
const canonicalPlanProjectionGroupAt = OwnedClosedFramePlan.prototype.projectionGroupAt;
const canonicalPlanSharedOffsetAt = OwnedClosedFramePlan.prototype.sharedOffsetAt;
const canonicalPlanFillSharedAt = OwnedClosedFramePlan.prototype.fillSharedAt;
const canonicalPlanFallbackRowAt = OwnedClosedFramePlan.prototype.fallbackRowAt;
export const canonicalOwnedClosedFramePlanReaderAt = OwnedClosedFramePlan.prototype.readerAt;
export const canonicalOwnedClosedFramePlanReaderIndexForId = OwnedClosedFramePlan.prototype.readerIndexForId;
export const canonicalOwnedClosedFramePlanStoreAt = OwnedClosedFramePlan.prototype.storeAt;
export const canonicalOwnedClosedFramePlanStoreReadersAt = OwnedClosedFramePlan.prototype.storeReadersAt;
export const canonicalOwnedClosedFramePlanUniqueProjectionAt = OwnedClosedFramePlan.prototype.uniqueProjectionAt;
export const canonicalOwnedClosedFramePlanProjectionIndexAt = OwnedClosedFramePlan.prototype.projectionIndexAt;
export const canonicalOwnedClosedFramePlanProjectionIndexFor = OwnedClosedFramePlan.prototype.projectionIndexFor;
intrinsicFreeze(OwnedClosedFramePlan.prototype);
intrinsicFreeze(OwnedClosedFramePlan);
/** Candidate-private buffers over a retained immutable capture plan. */
export class OwnedClosedFrameFill {
    #plan;
    #groupInputs;
    #fallbackValues;
    constructor(key, plan, groupInputs) {
        if (key !== fillKey)
            throw new TypeError("Invalid closed frame cut");
        this.#plan = plan;
        this.#groupInputs = intrinsicFreeze([...groupInputs]);
        const fallbacks = [];
        for (let index = 0; index < plan.rowCount; index++) {
            const group = canonicalPlanRowGroupAt.call(plan, index);
            if (group >= groupInputs.length)
                throw new TypeError("Missing group input");
            if (group < 0)
                fallbacks[index] = [];
        }
        this.#fallbackValues = fallbacks;
        intrinsicFreeze(this);
    }
    static fromPlan(plan, groupInputs) {
        if (!OwnedClosedFramePlan.owns(plan) || !intrinsicIsArray(groupInputs))
            return null;
        for (let index = 0; index < groupInputs.length; index++)
            if (!OwnedClosedFrameInput.owns(groupInputs[index]))
                return null;
        try {
            return new OwnedClosedFrameFill(fillKey, plan, groupInputs);
        }
        catch {
            return null;
        }
    }
    static owns(value) {
        try {
            return typeof value === "object" && value !== null && #plan in value;
        }
        catch {
            return false;
        }
    }
    get rowCount() { return this.#plan.rowCount; }
    get projectionCount() { return this.#plan.projectionCount; }
    get plan() { return this.#plan; }
    worldAt(index) {
        return canonicalPlanWorldAt.call(this.#plan, index);
    }
    rowInputAt(index) {
        const group = canonicalPlanRowGroupAt.call(this.#plan, index);
        return group < 0 ? null : this.#groupInputs[group];
    }
    groupRowAt(index) {
        return canonicalPlanGroupRowAt.call(this.#plan, index);
    }
    fallbackAt(index) {
        return this.#fallbackValues[index];
    }
    boundAt(index) {
        return canonicalPlanBoundAt.call(this.#plan, index);
    }
    projectionInputAt(index) {
        const group = canonicalPlanProjectionGroupAt.call(this.#plan, index);
        return group < 0 ? null : this.#groupInputs[group];
    }
    sharedOffsetAt(index) {
        return canonicalPlanSharedOffsetAt.call(this.#plan, index);
    }
    fillSharedAt(index) {
        return canonicalPlanFillSharedAt.call(this.#plan, index);
    }
    projectionFallbackAt(index) {
        const row = canonicalPlanFallbackRowAt.call(this.#plan, index);
        return row < 0 ? undefined : this.#fallbackValues[row];
    }
}
export const createOwnedClosedFrameFillFromPlan = OwnedClosedFrameFill.fromPlan;
export const canonicalOwnedClosedFrameFillOwns = OwnedClosedFrameFill.owns;
export const canonicalOwnedClosedFrameFillWorldAt = OwnedClosedFrameFill.prototype.worldAt;
export const canonicalOwnedClosedFrameFillRowInputAt = OwnedClosedFrameFill.prototype.rowInputAt;
export const canonicalOwnedClosedFrameFillGroupRowAt = OwnedClosedFrameFill.prototype.groupRowAt;
export const canonicalOwnedClosedFrameFillFallbackAt = OwnedClosedFrameFill.prototype.fallbackAt;
export const canonicalOwnedClosedFrameFillBoundAt = OwnedClosedFrameFill.prototype.boundAt;
export const canonicalOwnedClosedFrameFillProjectionInputAt = OwnedClosedFrameFill.prototype.projectionInputAt;
export const canonicalOwnedClosedFrameFillSharedOffsetAt = OwnedClosedFrameFill.prototype.sharedOffsetAt;
export const canonicalOwnedClosedFrameFillFillSharedAt = OwnedClosedFrameFill.prototype.fillSharedAt;
export const canonicalOwnedClosedFrameFillProjectionFallbackAt = OwnedClosedFrameFill.prototype.projectionFallbackAt;
intrinsicFreeze(OwnedClosedFrameFill.prototype);
intrinsicFreeze(OwnedClosedFrameFill);
//# sourceMappingURL=owned_closed_frame_input.js.map