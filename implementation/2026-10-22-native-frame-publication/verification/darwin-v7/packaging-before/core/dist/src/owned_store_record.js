const ownedStoreRecords = new WeakSet();
const ownedClosedProjectionPaths = new WeakSet();
/** Copy one plain data record into immutable runtime-owned Store state. */
export function storeRecord(input) {
    if (Array.isArray(input))
        throw new TypeError("Store record cannot be an array");
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError("Store record requires a plain prototype");
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const copy = Object.create(prototype);
    for (const key of Reflect.ownKeys(descriptors)) {
        if (typeof key !== "string" || key === "__proto__" ||
            key === "constructor" || key === "prototype") {
            throw new TypeError("Store record has an unsafe property");
        }
        const descriptor = descriptors[key];
        if (!descriptor || !("value" in descriptor)) {
            throw new TypeError("Store record requires own data properties");
        }
        Object.defineProperty(copy, key, {
            value: descriptor.value,
            enumerable: descriptor.enumerable,
            writable: false,
            configurable: false,
        });
    }
    Object.freeze(copy);
    ownedStoreRecords.add(copy);
    return copy;
}
const closedPathSegment = (value) => typeof value === "string" && /^[A-Za-z_$][\w$]*$/.test(value) &&
    value !== "__proto__" && value !== "constructor" && value !== "prototype";
const closedDataArray = (value, maximum) => {
    if (!Array.isArray(value))
        return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const length = descriptors.length?.value;
    if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0 || length > maximum ||
        Reflect.ownKeys(value).length !== length + 1 ||
        Object.keys(descriptors).length !== length + 1)
        return null;
    const result = [];
    for (let index = 0; index < length; index++) {
        const descriptor = descriptors[index];
        if (!descriptor || !("value" in descriptor))
            return null;
        result.push(descriptor.value);
    }
    return result;
};
/** Copy validated projection paths into a privately owned immutable plan. */
export function normalizeClosedProjectionPaths(raw) {
    try {
        const rawPaths = closedDataArray(raw, 32);
        if (!rawPaths || rawPaths.length === 0)
            return null;
        const paths = [];
        const seen = new Set();
        for (const rawPath of rawPaths) {
            const parts = closedDataArray(rawPath, 8);
            if (!parts || !parts.every(closedPathSegment))
                return null;
            const key = JSON.stringify(parts);
            if (seen.has(key))
                return null;
            seen.add(key);
            paths.push(Object.freeze(parts));
        }
        const result = Object.freeze(paths);
        ownedClosedProjectionPaths.add(result);
        return result;
    }
    catch {
        return null;
    }
}
export function isOwnedClosedProjectionPaths(paths) {
    return typeof paths === "object" && paths !== null && ownedClosedProjectionPaths.has(paths);
}
/** Capture an owned path plan through records issued by storeRecord. */
export function captureOwnedClosedProjectionValues(state, paths) {
    if (!isOwnedClosedProjectionPaths(paths))
        return null;
    try {
        const values = [];
        for (const path of paths) {
            let value = state;
            for (const segment of path) {
                if (typeof value !== "object" || value === null || !ownedStoreRecords.has(value))
                    return null;
                const descriptor = Object.getOwnPropertyDescriptor(value, segment);
                if (!descriptor || !("value" in descriptor))
                    return null;
                value = descriptor.value;
            }
            if (typeof value !== "number" || !Number.isFinite(value))
                return null;
            values.push(value);
        }
        return Object.freeze(values);
    }
    catch {
        return null;
    }
}
/** Capture finite numeric paths through records issued by storeRecord. */
export function captureClosedProjectionValues(state, paths) {
    try {
        const selectedPaths = closedDataArray(paths, 32);
        if (!selectedPaths || selectedPaths.length < 1)
            return null;
        const values = [];
        for (const rawPath of selectedPaths) {
            const path = closedDataArray(rawPath, 8);
            if (!path)
                return null;
            let value = state;
            for (const segment of path) {
                if (!closedPathSegment(segment) || typeof value !== "object" ||
                    value === null || !ownedStoreRecords.has(value))
                    return null;
                const descriptor = Object.getOwnPropertyDescriptor(value, segment);
                if (!descriptor || !("value" in descriptor))
                    return null;
                value = descriptor.value;
            }
            if (typeof value !== "number" || !Number.isFinite(value))
                return null;
            values.push(value);
        }
        return Object.freeze(values);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=owned_store_record.js.map