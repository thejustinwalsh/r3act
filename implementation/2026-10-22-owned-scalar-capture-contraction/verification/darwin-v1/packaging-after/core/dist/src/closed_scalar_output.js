const layoutKey = Symbol("owned-scalar-layout");
const frameKey = Symbol("owned-scalar-frame");
const intrinsicDefineProperty = Object.defineProperty;
const intrinsicIsArray = Array.isArray;
const intrinsicHasOwn = Object.hasOwn;
const intrinsicIs = Object.is;
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
    #numericResultCount;
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
        this.#numericResultCount = nextSlot;
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
    get numericResultCount() { return this.#numericResultCount; }
}
export class OwnedScalarFrame {
    #layout;
    #values;
    constructor(key, layout, values) {
        if (key !== frameKey || !isOwnedScalarLayout(layout) ||
            values.length !== layout.length)
            throw new TypeError("Invalid scalar frame");
        this.#layout = layout;
        this.#values = Object.freeze(values);
        Object.freeze(this);
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
    /** Capture a verified kernel's dense prefix into one private final frame array. */
    static captureVerifiedNumericResults(layout, results, counts) {
        if (!isOwnedScalarLayout(layout) || !layout.verifiedNumericResults ||
            !intrinsicIsArray(results))
            throw new TypeError("Invalid verified scalar capture");
        const length = results.length;
        if (!Number.isSafeInteger(length) || length < layout.numericResultCount || length > 32)
            throw new TypeError("Scalar numeric result width mismatch");
        const captured = [];
        for (let index = 0; index < layout.length; index++) {
            const slot = layout.slotAt(index);
            if (slot >= 0 && !intrinsicHasOwn(results, slot))
                throw new TypeError("Missing scalar numeric result");
            const value = slot >= 0 ? results[slot] : layout.constantAt(index);
            if (slot >= 0) {
                if (typeof value !== "number" || !Number.isFinite(value))
                    throw new TypeError("Invalid scalar numeric result");
            }
            else if (value !== null && typeof value !== "string" &&
                typeof value !== "boolean" &&
                !(typeof value === "number" && Number.isFinite(value))) {
                throw new TypeError("Invalid scalar value");
            }
            const constant = layout.constantAt(index);
            if (constant !== undefined && !intrinsicIs(value, constant))
                throw new TypeError("Scalar constant mismatch");
            intrinsicDefineProperty(captured, index, { value, enumerable: true,
                writable: true, configurable: true });
        }
        const frame = new OwnedScalarFrame(frameKey, layout, captured);
        if (counts) {
            counts.frames++;
            counts.directCaptures = (counts.directCaptures ?? 0) + 1;
        }
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
export const isOwnedScalarLayout = (value) => OwnedScalarLayout.owns(value);
export const isOwnedScalarFrame = (value) => OwnedScalarFrame.owns(value);
Object.freeze(OwnedScalarLayout.prototype);
Object.freeze(OwnedScalarLayout);
Object.freeze(OwnedScalarFrame.prototype);
Object.freeze(OwnedScalarFrame);
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
//# sourceMappingURL=closed_scalar_output.js.map