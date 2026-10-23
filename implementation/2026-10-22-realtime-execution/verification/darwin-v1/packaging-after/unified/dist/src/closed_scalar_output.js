import { executeVerifiedClosedStoreBatch, } from "./closed_store_batch_kernel_proof.js";
import { OwnedClosedFrameInput } from "./owned_closed_frame_input.js";
const layoutKey = Symbol("owned-scalar-layout");
const frameKey = Symbol("owned-scalar-frame");
const intrinsicDefineProperty = Object.defineProperty;
const intrinsicIsArray = Array.isArray;
const intrinsicIs = Object.is;
const intrinsicFreeze = Object.freeze;
const intrinsicIsSafeInteger = Number.isSafeInteger;
const intrinsicIsFinite = Number.isFinite;
const batchPageKey = Symbol("owned-scalar-batch-page");
const copySlots = (source) => {
    const copied = [];
    if (!intrinsicIsArray(source))
        throw new TypeError("Scalar slots must be an array");
    const length = source.length;
    if (!Number.isSafeInteger(length) || length < 0 || length > 32) {
        throw new TypeError("Invalid scalar slot count");
    }
    for (let index = 0; index < length; index++) {
        intrinsicDefineProperty(copied, index, { value: source[index],
            enumerable: true, writable: true, configurable: true });
    }
    return copied;
};
export class OwnedScalarLayout {
    #names;
    #slots;
    #constantSlots;
    #verifiedNumericResults;
    constructor(key, names, constantSlots, numericPropIndices) {
        if (key !== layoutKey)
            throw new TypeError("Invalid scalar layout");
        this.#names = Object.freeze(names);
        const slots = [];
        let nextSlot = 0;
        for (let index = 0; index < names.length; index++) {
            const slot = numericPropIndices
                ? numericPropIndices[nextSlot] === index ? nextSlot++ : -1
                : constantSlots[index] === undefined ? nextSlot++ : -1;
            intrinsicDefineProperty(slots, index, { value: slot,
                enumerable: true, writable: true, configurable: true });
        }
        this.#slots = Object.freeze(slots);
        this.#constantSlots = Object.freeze(constantSlots);
        this.#verifiedNumericResults = numericPropIndices !== undefined;
        Object.freeze(this);
    }
    static create(names, constantSlots, numericPropIndices) {
        const copiedNames = copySlots(names);
        const copiedConstants = copySlots(constantSlots);
        if (copiedNames.length !== copiedConstants.length || copiedNames.length === 0 ||
            copiedNames.some((name) => typeof name !== "string" || name.length === 0) ||
            new Set(copiedNames).size !== copiedNames.length ||
            copiedConstants.some((value) => value !== undefined && value !== null &&
                typeof value !== "string" && typeof value !== "boolean" &&
                !(typeof value === "number" && Number.isFinite(value)))) {
            throw new TypeError("Invalid scalar layout fields");
        }
        if (numericPropIndices === undefined)
            return new OwnedScalarLayout(layoutKey, copiedNames, copiedConstants);
        const copiedIndices = copySlots(numericPropIndices);
        let cursor = 0;
        for (let index = 0; index < copiedConstants.length; index++) {
            const constant = copiedConstants[index];
            if (constant !== undefined && typeof constant !== "number")
                continue;
            if (copiedIndices[cursor++] !== index)
                throw new TypeError("Invalid scalar numeric result mapping");
        }
        if (cursor !== copiedIndices.length)
            throw new TypeError("Invalid scalar numeric result mapping");
        return new OwnedScalarLayout(layoutKey, copiedNames, copiedConstants, copiedIndices);
    }
    static owns(value) {
        try {
            return typeof value === "object" && value !== null && #names in value;
        }
        catch {
            return false;
        }
    }
    get length() { return this.#names.length; }
    nameAt(index) { return this.#names[index]; }
    slotAt(index) { return this.#slots[index]; }
    constantAt(index) {
        return this.#constantSlots[index];
    }
    get verifiedNumericResults() { return this.#verifiedNumericResults; }
}
export class OwnedScalarFrame {
    #layout;
    #values;
    constructor(key, layout, values) {
        if (key !== frameKey || !isOwnedScalarLayout(layout) ||
            values.length !== layout.length)
            throw new TypeError("Invalid scalar frame");
        this.#layout = layout;
        this.#values = intrinsicFreeze(values);
        intrinsicFreeze(this);
    }
    static create(layout, values, counts) {
        if (!isOwnedScalarLayout(layout))
            throw new TypeError("Unowned scalar layout");
        const copiedValues = copySlots(values);
        if (copiedValues.length !== layout.length)
            throw new TypeError("Scalar width mismatch");
        for (let index = 0; index < copiedValues.length; index++) {
            const value = copiedValues[index];
            if (value !== null && typeof value !== "string" &&
                typeof value !== "boolean" &&
                !(typeof value === "number" && Number.isFinite(value))) {
                throw new TypeError("Invalid scalar value");
            }
            const constant = layout.constantAt(index);
            if (constant !== undefined && !Object.is(value, constant)) {
                throw new TypeError("Scalar constant mismatch");
            }
        }
        const frame = new OwnedScalarFrame(frameKey, layout, copiedValues);
        if (counts)
            counts.frames++;
        return frame;
    }
    static owns(value) {
        try {
            return typeof value === "object" && value !== null && #values in value;
        }
        catch {
            return false;
        }
    }
    get layout() { return this.#layout; }
    get length() { return this.#values.length; }
    valueAt(index) { return this.#values[index]; }
}
export class OwnedScalarBatchPage {
    #layout;
    #rows;
    constructor(key, layout, rows) {
        if (key !== batchPageKey)
            throw new TypeError("Invalid scalar batch page");
        this.#layout = layout;
        this.#rows = rows;
        intrinsicFreeze(this);
    }
    static owns(value) {
        try {
            return typeof value === "object" && value !== null && #rows in value;
        }
        catch {
            return false;
        }
    }
    get layout() { return this.#layout; }
    get rowCount() { return this.#rows.length; }
    valueAt(rowIndex, propIndex) {
        if (!intrinsicIsSafeInteger(rowIndex) || rowIndex < 0 ||
            rowIndex >= this.#rows.length || !intrinsicIsSafeInteger(propIndex) ||
            propIndex < 0 || propIndex >= this.#layout.length)
            throw new TypeError("Invalid scalar page index");
        return this.#rows[rowIndex][propIndex];
    }
}
class PrivateScalarBatchPageBuilder {
    #layout;
    #rows;
    #sealed = false;
    constructor(key, layout, rowCount) {
        if (key !== batchPageKey)
            throw new TypeError("Invalid scalar batch page builder");
        this.#layout = layout;
        this.#rows = [];
        for (let row = 0; row < rowCount; row++) {
            const values = [];
            for (let prop = 0; prop < layout.length; prop++) {
                intrinsicDefineProperty(values, prop, {
                    value: layout.slotAt(prop) >= 0 ? NaN : layout.constantAt(prop),
                    enumerable: true, writable: true, configurable: true,
                });
            }
            intrinsicDefineProperty(this.#rows, row, { value: values,
                enumerable: true, writable: false, configurable: false });
        }
        intrinsicFreeze(this.#rows);
        intrinsicFreeze(this);
    }
    /** The proof permits writes only at numeric prop positions. */
    numericOutputs() {
        if (this.#sealed)
            throw new TypeError("Scalar batch page already sealed");
        return this.#rows;
    }
    seal() {
        if (this.#sealed)
            throw new TypeError("Scalar batch page already sealed");
        for (const values of this.#rows) {
            if (values.length !== this.#layout.length)
                throw new TypeError("Scalar batch width mismatch");
            for (let index = 0; index < values.length; index++) {
                const value = values[index];
                if (this.#layout.slotAt(index) >= 0) {
                    if (typeof value !== "number" || !intrinsicIsFinite(value))
                        throw new TypeError("Invalid scalar batch numeric result");
                }
                else if (value !== null && typeof value !== "string" &&
                    typeof value !== "boolean" &&
                    !(typeof value === "number" && intrinsicIsFinite(value))) {
                    throw new TypeError("Invalid scalar batch constant");
                }
                const constant = this.#layout.constantAt(index);
                if (constant !== undefined && !intrinsicIs(value, constant))
                    throw new TypeError("Scalar batch constant mismatch");
            }
        }
        for (const values of this.#rows)
            intrinsicFreeze(values);
        this.#sealed = true;
        return new OwnedScalarBatchPage(batchPageKey, this.#layout, this.#rows);
    }
}
/** Execute an authentic proof into one fully validated immutable page. */
export const captureVerifiedOwnedScalarBatch = (layout, proof, input, rowCount, counts) => {
    if (!isOwnedScalarLayout(layout) || !layout.verifiedNumericResults ||
        !OwnedClosedFrameInput.owns(input) || !intrinsicIsSafeInteger(rowCount) ||
        rowCount < 1 || rowCount > 4096)
        throw new TypeError("Invalid verified scalar batch");
    const output = new PrivateScalarBatchPageBuilder(batchPageKey, layout, rowCount);
    const buffers = input.buffers();
    executeVerifiedClosedStoreBatch(proof, buffers.shared, buffers.varying, output.numericOutputs(), rowCount);
    const page = output.seal();
    if (counts) {
        counts.pages = (counts.pages ?? 0) + 1;
        counts.batchCalls = (counts.batchCalls ?? 0) + 1;
        counts.batchRows = (counts.batchRows ?? 0) + rowCount;
    }
    return page;
};
export const isOwnedScalarImage = (value) => {
    if (typeof value !== "object" || value === null)
        return false;
    try {
        const image = value;
        return image.kind === "frame" ? isOwnedScalarFrame(image.frame) :
            image.kind === "page" && OwnedScalarBatchPage.owns(image.page) &&
                intrinsicIsSafeInteger(image.rowIndex) && image.rowIndex >= 0 &&
                image.rowIndex < image.page.rowCount;
    }
    catch {
        return false;
    }
};
export const ownedScalarImageLayout = (image) => image.kind === "frame" ? image.frame.layout : image.page.layout;
export const ownedScalarImageLength = (image) => ownedScalarImageLayout(image).length;
export const ownedScalarImageValueAt = (image, propIndex) => image.kind === "frame" ? image.frame.valueAt(propIndex) :
    image.page.valueAt(image.rowIndex, propIndex);
export const isOwnedScalarLayout = (value) => OwnedScalarLayout.owns(value);
export const isOwnedScalarFrame = (value) => OwnedScalarFrame.owns(value);
Object.freeze(OwnedScalarLayout.prototype);
Object.freeze(OwnedScalarLayout);
Object.freeze(OwnedScalarFrame.prototype);
Object.freeze(OwnedScalarFrame);
Object.freeze(OwnedScalarBatchPage.prototype);
Object.freeze(OwnedScalarBatchPage);
Object.freeze(PrivateScalarBatchPageBuilder.prototype);
Object.freeze(PrivateScalarBatchPageBuilder);
/** Derive the former public tuple shape only when an ordinary caller observes it. */
export const materializeOwnedScalarPropEntries = (frame, counts) => {
    if (!isOwnedScalarFrame(frame))
        throw new TypeError("Unowned scalar frame");
    const pairs = [];
    for (let index = 0; index < frame.length; index++) {
        pairs.push(Object.freeze([frame.layout.nameAt(index), frame.valueAt(index)]));
    }
    if (counts)
        counts.propMaterializations++;
    return Object.freeze(pairs);
};
/** Create ordinary own data properties without exposing the frame's backing values. */
export const materializeOwnedScalarPropRecord = (frame, counts) => {
    if (!isOwnedScalarFrame(frame))
        throw new TypeError("Unowned scalar frame");
    const props = {};
    for (let index = 0; index < frame.length; index++) {
        Object.defineProperty(props, frame.layout.nameAt(index), {
            value: frame.valueAt(index), enumerable: true, configurable: true,
            writable: true,
        });
    }
    if (counts)
        counts.propMaterializations++;
    return Object.freeze(props);
};
export const materializeOwnedScalarImagePropEntries = (image, counts) => {
    if (!isOwnedScalarImage(image))
        throw new TypeError("Unowned scalar image");
    if (image.kind === "frame")
        return materializeOwnedScalarPropEntries(image.frame, counts);
    const pairs = [];
    for (let index = 0; index < image.page.layout.length; index++)
        pairs.push(Object.freeze([image.page.layout.nameAt(index),
            image.page.valueAt(image.rowIndex, index)]));
    if (counts)
        counts.propMaterializations++;
    return Object.freeze(pairs);
};
export const materializeOwnedScalarImagePropRecord = (image, counts) => {
    if (!isOwnedScalarImage(image))
        throw new TypeError("Unowned scalar image");
    if (image.kind === "frame")
        return materializeOwnedScalarPropRecord(image.frame, counts);
    const props = {};
    for (let index = 0; index < image.page.layout.length; index++) {
        Object.defineProperty(props, image.page.layout.nameAt(index), {
            value: image.page.valueAt(image.rowIndex, index), enumerable: true,
            configurable: true, writable: true,
        });
    }
    if (counts)
        counts.propMaterializations++;
    return Object.freeze(props);
};
//# sourceMappingURL=closed_scalar_output.js.map