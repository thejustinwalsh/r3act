import * as THREE from "three";
const unsafeSegments = new Set(["__proto__", "constructor", "prototype"]);
const threeObjectFlags = [
    "isVector2",
    "isVector3",
    "isVector4",
    "isEuler",
    "isQuaternion",
    "isColor",
    "isMatrix3",
    "isMatrix4",
];
const isObject = (value) => typeof value === "object" && value !== null;
const cloneValue = (value) => {
    if (!isObject(value))
        return value;
    // Only converted Three values are mutated in place. Ordinary data is
    // assigned, so its original reference is the correct removal default.
    if (isThreeObject(value) && typeof value.clone === "function") {
        return value.clone();
    }
    return value;
};
const isThreeObject = (value) => isObject(value) && threeObjectFlags.some((flag) => value[flag] === true);
const dataValue = (object, key) => {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    return descriptor && "value" in descriptor ? descriptor.value : undefined;
};
const numericData = (object, keys) => {
    const values = [];
    for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(object, key);
        if (!descriptor || !("value" in descriptor) ||
            typeof descriptor.value !== "number")
            return null;
        values.push(descriptor.value);
    }
    return values;
};
const numericTuple = (value, length) => {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
        return null;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).length !== length + 1 ||
        descriptors.length?.value !== length)
        return null;
    const items = [];
    for (let index = 0; index < length; index++) {
        const descriptor = descriptors[index];
        if (!descriptor || !("value" in descriptor) ||
            typeof descriptor.value !== "number")
            return null;
        items.push(descriptor.value);
    }
    return items;
};
const eulerTuple = (value) => {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
        return null;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const length = descriptors.length?.value;
    if ((length !== 3 && length !== 4) ||
        Reflect.ownKeys(descriptors).length !== length + 1)
        return null;
    const components = [];
    for (let index = 0; index < length; index++) {
        const descriptor = descriptors[index];
        if (!descriptor || !("value" in descriptor) ||
            (index < 3 ? typeof descriptor.value !== "number" :
                typeof descriptor.value !== "string"))
            return null;
        components.push(descriptor.value);
    }
    return components;
};
const builtinCopySpecs = [
    {
        prototype: THREE.Vector2.prototype, fields: ["x", "y"],
        ownFields: ["x", "y"], length: 2,
        copy: THREE.Vector2.prototype.copy,
        fromArray: THREE.Vector2.prototype.fromArray,
    },
    {
        prototype: THREE.Vector3.prototype, fields: ["x", "y", "z"],
        ownFields: ["x", "y", "z"], length: 3,
        copy: THREE.Vector3.prototype.copy,
        fromArray: THREE.Vector3.prototype.fromArray,
    },
    {
        prototype: THREE.Vector4.prototype, fields: ["x", "y", "z", "w"],
        ownFields: ["x", "y", "z", "w"], length: 4,
        copy: THREE.Vector4.prototype.copy,
        fromArray: THREE.Vector4.prototype.fromArray,
    },
    {
        prototype: THREE.Quaternion.prototype,
        fields: ["_x", "_y", "_z", "_w"],
        ownFields: ["isQuaternion", "_x", "_y", "_z", "_w"],
        length: 4, flag: "isQuaternion",
        copy: THREE.Quaternion.prototype.copy,
        fromArray: THREE.Quaternion.prototype.fromArray,
    },
    {
        prototype: THREE.Euler.prototype, fields: ["_x", "_y", "_z"],
        ownFields: ["isEuler", "_x", "_y", "_z", "_order"],
        length: 3, flag: "isEuler",
        copy: THREE.Euler.prototype.copy,
        fromArray: THREE.Euler.prototype.fromArray,
    },
    {
        prototype: THREE.Color.prototype, fields: ["r", "g", "b"],
        ownFields: ["isColor", "r", "g", "b"],
        length: 3, flag: "isColor",
        copy: THREE.Color.prototype.copy,
        fromArray: THREE.Color.prototype.fromArray,
    },
    {
        prototype: THREE.Matrix3.prototype, fields: [],
        ownFields: ["elements"], length: 9,
        copy: THREE.Matrix3.prototype.copy,
        fromArray: THREE.Matrix3.prototype.fromArray,
    },
    {
        prototype: THREE.Matrix4.prototype, fields: [],
        ownFields: ["elements"], length: 16,
        copy: THREE.Matrix4.prototype.copy,
        fromArray: THREE.Matrix4.prototype.fromArray,
    },
];
const ordinaryOwnFields = (object, expected) => {
    const keys = Reflect.ownKeys(object);
    if (keys.length !== expected.length &&
        !(keys.length === expected.length + 1 &&
            keys.includes("_onChangeCallback")))
        return false;
    for (const key of keys) {
        if (key === "_onChangeCallback" && !expected.includes(key)) {
            if (typeof dataValue(object, key) !== "function")
                return false;
            continue;
        }
        if (typeof key !== "string" || !expected.includes(key))
            return false;
        const descriptor = Object.getOwnPropertyDescriptor(object, key);
        if (!descriptor || !("value" in descriptor))
            return false;
    }
    return expected.every((key) => keys.includes(key));
};
const copiedInput = (current, value) => {
    const prototype = Object.getPrototypeOf(current);
    const spec = builtinCopySpecs.find((candidate) => prototype === candidate.prototype);
    if (!spec)
        return null;
    const { prototype: known, fields, ownFields, length, flag } = spec;
    if (!ordinaryOwnFields(current, ownFields) ||
        (flag && dataValue(current, flag) !== true))
        return null;
    if (dataValue(known, "copy") !== spec.copy ||
        dataValue(known, "fromArray") !== spec.fromArray)
        return null;
    if (fields.length && !numericData(current, fields))
        return null;
    if (!fields.length && !numericTuple(dataValue(current, "elements"), length)) {
        return null;
    }
    if (known === THREE.Color.prototype) {
        if (typeof value !== "object" || value === null ||
            Object.getPrototypeOf(value) !== known ||
            !ordinaryOwnFields(value, ownFields) || dataValue(value, flag) !== true) {
            return null;
        }
        const components = numericData(value, fields);
        if (!components)
            return null;
        const copy = new THREE.Color();
        [copy.r, copy.g, copy.b] = components;
        return { writeValue: Object.freeze(copy), comparison: components };
    }
    let components = null;
    let order;
    const objectInput = typeof value === "object" && value !== null &&
        Object.getPrototypeOf(value) === known &&
        ordinaryOwnFields(value, ownFields) &&
        (!flag || dataValue(value, flag) === true);
    if (objectInput) {
        if (fields.length)
            components = numericData(value, fields);
        else
            components = numericTuple(dataValue(value, "elements"), length);
        if (known === THREE.Euler.prototype) {
            const candidate = dataValue(value, "_order");
            if (typeof candidate !== "string")
                return null;
            order = candidate;
        }
    }
    else if (known === THREE.Euler.prototype) {
        components = eulerTuple(value);
    }
    else
        components = numericTuple(value, length);
    if (!components)
        return null;
    if (known === THREE.Euler.prototype && order !== undefined)
        components.push(order);
    const snapshot = Object.freeze([...components]);
    if (!objectInput)
        return { writeValue: snapshot, comparison: snapshot };
    let writeValue;
    if (known === THREE.Vector2.prototype) {
        writeValue = new THREE.Vector2(components[0], components[1]);
    }
    else if (known === THREE.Vector3.prototype) {
        writeValue = new THREE.Vector3(components[0], components[1], components[2]);
    }
    else if (known === THREE.Vector4.prototype) {
        writeValue = new THREE.Vector4(components[0], components[1], components[2], components[3]);
    }
    else if (known === THREE.Quaternion.prototype) {
        writeValue = new THREE.Quaternion(components[0], components[1], components[2], components[3]);
    }
    else if (known === THREE.Euler.prototype) {
        writeValue = new THREE.Euler(components[0], components[1], components[2], components[3]);
    }
    else if (known === THREE.Matrix3.prototype) {
        writeValue = new THREE.Matrix3().fromArray(components);
    }
    else {
        writeValue = new THREE.Matrix4().fromArray(components);
    }
    if (known === THREE.Matrix3.prototype || known === THREE.Matrix4.prototype) {
        Object.freeze(writeValue.elements);
    }
    Object.freeze(writeValue);
    return { writeValue, comparison: snapshot };
};
/** Capture supported built-in Three copy inputs from own data fields. */
export const captureThreePropertyCopy = (root, property, value) => {
    if (value === null || value === undefined)
        return null;
    assertSafeProperty(property);
    const direct = Object.getOwnPropertyDescriptor(root, property);
    const segments = direct ? [property] : property.split("-");
    let target = root;
    for (const segment of segments.slice(0, -1)) {
        const next = dataValue(target, segment);
        if (typeof next !== "object" || next === null)
            return null;
        target = next;
    }
    const current = dataValue(target, segments.at(-1));
    if (typeof current !== "object" || current === null ||
        Object.is(current, value))
        return null;
    const copied = copiedInput(current, value);
    if (!copied)
        return null;
    return Object.freeze({
        kind: "copy",
        writeValue: copied.writeValue,
        comparison: Object.freeze([...copied.comparison]),
    });
};
const compatibleObjects = (target, value) => {
    if (!isObject(value))
        return false;
    if (target.constructor === value.constructor)
        return true;
    return threeObjectFlags.some((flag) => target[flag] === true && value[flag] === true);
};
const assertCompatibleNumericArray = (current, value, property) => {
    const length = current.isVector2
        ? 2
        : current.isVector3
            ? 3
            : current.isVector4 || current.isQuaternion
                ? 4
                : current.isMatrix3
                    ? 9
                    : current.isMatrix4
                        ? 16
                        : 3;
    const valid = current.isEuler === true
        ? (value.length === 3 || value.length === 4) &&
            value.slice(0, 3).every((item) => typeof item === "number") &&
            (value[3] === undefined || typeof value[3] === "string")
        : value.length === length &&
            value.every((item) => typeof item === "number");
    if (!valid) {
        throw new Error(`Three property ${JSON.stringify(property)} requires a compatible numeric array`);
    }
};
const resolveProperty = (root, property, segments) => {
    if (Object.prototype.hasOwnProperty.call(root, property) || property in root) {
        return { target: root, key: property };
    }
    let target = root;
    for (let index = 0; index < segments.length - 1; index++) {
        const segment = segments[index];
        if (target == null || !isObject(target) || !(segment in target)) {
            throw new Error(`Cannot resolve Three property path ${JSON.stringify(property)} at ${JSON.stringify(segment)}`);
        }
        target = target[segment];
    }
    if (!isObject(target)) {
        throw new Error(`Three property path ${JSON.stringify(property)} has no object target`);
    }
    if (!(segments.at(-1) in target)) {
        throw new Error(`Unsupported Three property ${JSON.stringify(property)}`);
    }
    return { target, key: segments.at(-1) };
};
const assertSafeProperty = (property) => {
    if (!property || property.split("-").some((part) => unsafeSegments.has(part))) {
        throw new Error(`Unsafe Three property path ${JSON.stringify(property)}`);
    }
};
const writeResolved = (target, key, value, property) => {
    const record = target;
    const current = record[key];
    if (typeof current === "function") {
        throw new Error(`Three method ${JSON.stringify(property)} is not a data property`);
    }
    if (Object.is(current, value))
        return;
    if (isObject(current) && current.isColor === true &&
        typeof current.set === "function") {
        if (isObject(value) && compatibleObjects(current, value)) {
            if (typeof current.copy !== "function") {
                throw new Error(`Three Color property ${JSON.stringify(property)} cannot copy values`);
            }
            current.copy(value);
            return;
        }
        if (typeof value === "string" || typeof value === "number") {
            current.set(value);
            return;
        }
        throw new Error(`Incompatible value for Three Color property ${JSON.stringify(property)}`);
    }
    if (isThreeObject(current) && isObject(value) &&
        compatibleObjects(current, value) && typeof current.copy === "function") {
        current.copy(value);
        return;
    }
    if (isObject(current) && isThreeObject(current)) {
        if (typeof value === "number" && typeof current.setScalar === "function") {
            current.setScalar(value);
            return;
        }
        if (Array.isArray(value)) {
            assertCompatibleNumericArray(current, value, property);
            if (typeof current.fromArray === "function") {
                current.fromArray(value);
                return;
            }
            if (typeof current.set === "function") {
                current.set(...value);
                return;
            }
            throw new Error(`Three property ${JSON.stringify(property)} cannot read arrays`);
        }
        if (isObject(value) && compatibleObjects(current, value)) {
            if (typeof current.copy !== "function") {
                throw new Error(`Three property ${JSON.stringify(property)} cannot copy values`);
            }
            current.copy(value);
            return;
        }
        throw new Error(`Incompatible value for Three property ${JSON.stringify(property)}`);
    }
    if (!isObject(current) || value == null || !isObject(value)) {
        record[key] = value;
        return;
    }
    // Ordinary user data remains assignable. Never call arbitrary `set` or `copy`.
    record[key] = value;
};
/** Describe the current generic write branch; later writes still re-resolve it. */
export const describeThreePropertyWrite = (root, property, value) => {
    assertSafeProperty(property);
    const { target, key } = resolveProperty(root, property, property.split("-"));
    const current = target[key];
    const result = (valuePolicy) => ({
        target,
        valuePolicy,
    });
    if (typeof current === "function" || value == null)
        return result("unknown");
    if (Object.is(current, value)) {
        return result(isObject(value) ? "unknown" : "scalar");
    }
    if (isObject(current) && current.isColor === true &&
        typeof current.set === "function") {
        if (isObject(value) && compatibleObjects(current, value) &&
            typeof current.copy === "function")
            return result("copy");
        return result(typeof value === "string" || typeof value === "number"
            ? "copy"
            : "unknown");
    }
    if (isObject(current) && isThreeObject(current)) {
        if (isObject(value) && compatibleObjects(current, value) &&
            typeof current.copy === "function")
            return result("copy");
        if (typeof value === "number" && typeof current.setScalar === "function") {
            return result("copy");
        }
        if (Array.isArray(value)) {
            assertCompatibleNumericArray(current, value, property);
            return result(typeof current.fromArray === "function" ||
                typeof current.set === "function"
                ? "copy"
                : "unknown");
        }
        return result("unknown");
    }
    return result(typeof value === "object" || typeof value === "function"
        ? "retain"
        : "scalar");
};
/**
 * Resolve and cache a writer by raw host object and authored property name.
 * Nested paths are resolved on each write so replaced materials remain live;
 * defaults are weakly keyed by the actual resolved target.
 */
/** Create a cache scoped to one host/handle lifecycle. */
export const createThreePropertyWriterResolver = () => {
    const writers = new WeakMap();
    const resolve = (root, property) => {
        let byProperty = writers.get(root);
        if (!byProperty)
            writers.set(root, byProperty = new Map());
        const cached = byProperty.get(property);
        if (cached)
            return cached;
        assertSafeProperty(property);
        const segments = property.split("-");
        const defaults = new WeakMap();
        const resolveAndCapture = () => {
            const resolved = resolveProperty(root, property, segments);
            if (typeof resolved.target[resolved.key] === "function") {
                throw new Error(`Three method ${JSON.stringify(property)} is not a data property`);
            }
            if (!defaults.has(resolved.target)) {
                defaults.set(resolved.target, {
                    value: cloneValue(resolved.target[resolved.key]),
                });
            }
            return resolved;
        };
        const writer = Object.freeze({
            property,
            write(value, invalidate) {
                const { target, key } = resolveAndCapture();
                writeResolved(target, key, value, property);
                invalidate?.(root, target, key, target[key]);
            },
            reset(invalidate) {
                const { target, key } = resolveAndCapture();
                const saved = defaults.get(target);
                const current = target[key];
                if (isThreeObject(current) && isObject(saved.value) &&
                    compatibleObjects(current, saved.value) &&
                    typeof current.copy === "function") {
                    current.copy(saved.value);
                }
                else {
                    target[key] = cloneValue(saved.value);
                }
                invalidate?.(root, target, key, target[key]);
            },
        });
        byProperty.set(property, writer);
        return writer;
    };
    return {
        resolve,
        release(root) {
            writers.delete(root);
        },
    };
};
const standaloneResolver = createThreePropertyWriterResolver();
/** Resolve through the module-level cache for standalone host integrations. */
export const resolveThreePropertyWriter = (root, property) => standaloneResolver.resolve(root, property);
//# sourceMappingURL=three_property_writer.js.map