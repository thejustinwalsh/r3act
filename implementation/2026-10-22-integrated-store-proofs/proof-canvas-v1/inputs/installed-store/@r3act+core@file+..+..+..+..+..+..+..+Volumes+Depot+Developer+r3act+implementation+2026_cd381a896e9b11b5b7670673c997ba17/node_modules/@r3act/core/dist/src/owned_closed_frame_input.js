const inputKey = Symbol("owned-closed-frame-input");
const scheduleKey = Symbol("owned-closed-frame-schedule");
const intrinsicDefineProperty = Object.defineProperty;
const intrinsicFreeze = Object.freeze;
const intrinsicPush = Array.prototype.push;
const intrinsicApply = Reflect.apply;
const intrinsicIsArray = Array.isArray;
const intrinsicIsSafeInteger = Number.isSafeInteger;
const intrinsicIsFinite = Number.isFinite;
const intrinsicIs = Object.is;
import { isBoundClosedProjectionRequest, ownedClosedProjectionPathCount, } from "./async_store_runtime.js";
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
/** One ephemeral authenticated candidate schedule consumed by World and Store. */
export class OwnedClosedFrameSchedule {
    #rows = [];
    #columns = [];
    #sealed = false;
    constructor(key) {
        if (key !== scheduleKey)
            throw new TypeError("Invalid closed frame schedule");
        intrinsicFreeze(this);
    }
    static create() {
        return new OwnedClosedFrameSchedule(scheduleKey);
    }
    append(world, sourceProjections, input, groupRow, fallback) {
        const sourceLength = intrinsicIsArray(sourceProjections)
            ? sourceProjections.length : -1;
        if (this.#sealed || this.#rows.length >= 65536 ||
            !isOwnedClosedWorldInputRequest(world) ||
            !intrinsicIsSafeInteger(sourceLength) || sourceLength < 0 ||
            sourceLength > 8 || this.#columns.length + sourceLength > 65536 ||
            (input !== null && !OwnedClosedFrameInput.owns(input)) ||
            !intrinsicIsSafeInteger(groupRow) || groupRow < -1 ||
            (input === null && groupRow !== -1) || (input !== null && groupRow < 0))
            return false;
        const projections = [];
        for (let index = 0; index < sourceLength; index++) {
            const bound = sourceProjections[index];
            if (!isBoundClosedProjectionRequest(bound))
                return false;
            intrinsicApply(intrinsicPush, projections, [bound]);
        }
        const owned = intrinsicFreeze({ world,
            projections: intrinsicFreeze(projections), input, groupRow,
            ...(fallback ? { fallbackValues: [] } : {}) });
        intrinsicApply(intrinsicPush, this.#rows, [owned]);
        let offset = 0;
        for (let index = 0; index < projections.length; index++) {
            const bound = projections[index];
            intrinsicApply(intrinsicPush, this.#columns, [intrinsicFreeze({ bound,
                    input, sharedOffset: offset, fillShared: groupRow === 0,
                    ...(owned.fallbackValues ? { fallbackValues: owned.fallbackValues } : {}) })]);
            offset += ownedClosedProjectionPathCount(bound);
        }
        return true;
    }
    seal() {
        if (this.#sealed || this.#rows.length === 0 || this.#columns.length > 65536)
            return false;
        this.#sealed = true;
        intrinsicFreeze(this.#rows);
        intrinsicFreeze(this.#columns);
        return true;
    }
    static owns(value) {
        try {
            return typeof value === "object" && value !== null && #rows in value;
        }
        catch {
            return false;
        }
    }
    get sealed() { return this.#sealed; }
    get rowCount() { return this.#rows.length; }
    rowAt(index) { return this.#rows[index]; }
    get projectionCount() { return this.#columns.length; }
    projectionAt(index) {
        return this.#columns[index];
    }
}
export const createOwnedClosedFrameSchedule = OwnedClosedFrameSchedule.create;
export const canonicalOwnedClosedFrameScheduleOwns = OwnedClosedFrameSchedule.owns;
export const canonicalOwnedClosedFrameScheduleRowAt = OwnedClosedFrameSchedule.prototype.rowAt;
export const canonicalOwnedClosedFrameScheduleProjectionAt = OwnedClosedFrameSchedule.prototype.projectionAt;
intrinsicFreeze(OwnedClosedFrameSchedule.prototype);
intrinsicFreeze(OwnedClosedFrameSchedule);
//# sourceMappingURL=owned_closed_frame_input.js.map