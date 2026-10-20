export const isSafeClosedStyleName = (name) => name !== "__proto__" && name !== "prototype" && name !== "constructor" &&
    (/^[A-Za-z_][A-Za-z0-9_-]*$/.test(name) ||
        /^--[A-Za-z_][A-Za-z0-9_-]*$/.test(name));
const declined = Object.freeze({ accepted: false });
const isFinitePrimitive = (value) => value === null || value === undefined || typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value));
/** Capture a supported host prop without retaining caller-owned structured values. */
export const snapshotScopedHostProp = (tag, name, value) => {
    if (name === "ref" || /^on[A-Z]/.test(name))
        return declined;
    if (name === "style") {
        if (tag !== "div" && tag !== "span" && tag !== "output")
            return declined;
        if (value === null || typeof value !== "object" || Array.isArray(value)) {
            return declined;
        }
        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null)
            return declined;
        const descriptors = Object.getOwnPropertyDescriptors(value);
        const names = Reflect.ownKeys(descriptors);
        if (names.length > 32)
            return declined;
        const copy = {};
        for (const key of names) {
            if (typeof key !== "string" || !isSafeClosedStyleName(key))
                return declined;
            const descriptor = descriptors[key];
            if (!("value" in descriptor))
                return declined;
            const item = descriptor.value;
            if (item !== null && typeof item !== "string" &&
                !(typeof item === "number" && Number.isFinite(item)))
                return declined;
            copy[key] = item;
        }
        return { accepted: true, value: Object.freeze(copy) };
    }
    if (isFinitePrimitive(value))
        return { accepted: true, value };
    if (name === "position" || name === "rotation" || name === "scale") {
        if (tag !== "group" && tag !== "mesh")
            return declined;
        if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
            return declined;
        }
        const descriptors = Object.getOwnPropertyDescriptors(value);
        const keys = Reflect.ownKeys(descriptors);
        if (keys.length !== 4 || !["0", "1", "2", "length"].every((key) => keys.includes(key)))
            return declined;
        const lengthDescriptor = descriptors["length"];
        if (!lengthDescriptor || !("value" in lengthDescriptor) ||
            lengthDescriptor.value !== 3) {
            return declined;
        }
        const items = [];
        for (const key of ["0", "1", "2"]) {
            const descriptor = descriptors[key];
            if (!("value" in descriptor) || typeof descriptor.value !== "number" ||
                !Number.isFinite(descriptor.value))
                return declined;
            items.push(descriptor.value);
        }
        return { accepted: true, value: Object.freeze(items) };
    }
    return declined;
};
//# sourceMappingURL=scoped_host_values.js.map