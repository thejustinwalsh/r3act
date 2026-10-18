import { jsx } from "./jsx_binding_runtime.js";
const record = (input) => {
    if (typeof input !== "object" || input === null || Array.isArray(input))
        return null;
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null)
        return null;
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const copy = Object.create(null);
    for (const [key, descriptor] of Object.entries(descriptors)) {
        if (!("value" in descriptor))
            return null;
        copy[key] = descriptor.value;
    }
    return copy;
};
const exact = (value, keys) => Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
const primitive = (value) => value === null || typeof value === "string" || typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value));
const tupleArray = (input) => {
    if (!Array.isArray(input) || input.length > 32)
        return null;
    const descriptors = Object.getOwnPropertyDescriptors(input);
    if (Object.keys(descriptors).length !== input.length + 1)
        return null;
    const copy = [];
    for (let index = 0; index < input.length; index++) {
        const descriptor = descriptors[index];
        if (!descriptor || !("value" in descriptor))
            return null;
        copy.push(descriptor.value);
    }
    return copy;
};
/** Snapshot untrusted metadata; evaluation reads only this frozen copy. */
export const normalizeClosedResourceHostProgram = (input) => {
    const root = record(input);
    if (!root || !exact(root, ["schemaVersion", "componentProgramId", "moduleRevision", "resourceUseSiteId", "resourceProp", "host"]) || root.schemaVersion !== 1)
        return null;
    for (const key of ["componentProgramId", "moduleRevision", "resourceUseSiteId", "resourceProp"]) {
        if (typeof root[key] !== "string" || root[key].length === 0)
            return null;
    }
    if (!/^[A-Za-z_$][\w$]*$/.test(root.resourceProp))
        return null;
    const host = record(root.host);
    if (!host || !exact(host, ["tag", "key", "props", "child"]) || host.tag !== "div" || host.child !== "resource-value" || typeof host.key !== "string" || host.key.length === 0)
        return null;
    const rawProps = tupleArray(host.props);
    if (!rawProps)
        return null;
    const seen = new Set();
    const props = [];
    for (const raw of rawProps) {
        const pair = tupleArray(raw);
        if (!pair || pair.length !== 2 || typeof pair[0] !== "string" || !/^data-[a-z][a-z0-9-]*$/.test(pair[0]) || seen.has(pair[0]) || !primitive(pair[1]))
            return null;
        seen.add(pair[0]);
        props.push(Object.freeze([pair[0], pair[1]]));
    }
    return Object.freeze({
        schemaVersion: 1,
        componentProgramId: root.componentProgramId,
        moduleRevision: root.moduleRevision,
        resourceUseSiteId: root.resourceUseSiteId,
        resourceProp: root.resourceProp,
        host: Object.freeze({ tag: "div", key: host.key, props: Object.freeze(props), child: "resource-value" }),
    });
};
/** Construct a ready host leaf without invoking the authored component. */
export const evaluateClosedResourceHostProgram = (program, readyValue) => {
    if (!primitive(readyValue))
        return null;
    if (readyValue === true)
        return null;
    const props = { key: program.host.key };
    for (const [name, value] of program.host.props)
        props[name] = value;
    return jsx(program.host.tag, props, readyValue);
};
//# sourceMappingURL=closed_resource_host_program.js.map