import { evaluateClosedNumericExpression, normalizeClosedNumericExpression, } from "./closed_numeric_expression.js";
const record = (input) => {
    if (typeof input !== "object" || input === null || Array.isArray(input))
        return null;
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null)
        return null;
    const copy = Object.create(null);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(input))) {
        if (!("value" in descriptor))
            return null;
        copy[key] = descriptor.value;
    }
    return copy;
};
const exact = (value, keys) => Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
const array = (input) => {
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
const allowedName = (tag, name) => tag === "div" || tag === "output"
    ? /^data-[a-z][a-z0-9-]*$/.test(name)
    : /^(?:position|rotation|scale)-[xyz]$/.test(name) || name === "visible";
const primitive = (value) => value === null || typeof value === "string" || typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value));
/** Copy untrusted metadata into a frozen, data-only executable plan. */
export const normalizeClosedStoreHostProgram = (input) => {
    try {
        const root = record(input);
        if (!root || !exact(root, ["schemaVersion", "componentProgramId", "moduleRevision", "storeUseSiteId", "storeProp", "host"]) || root.schemaVersion !== 1)
            return null;
        for (const key of ["componentProgramId", "moduleRevision", "storeUseSiteId", "storeProp"]) {
            if (typeof root[key] !== "string" || root[key].length === 0)
                return null;
        }
        if (!/^[A-Za-z_$][\w$]*$/.test(root.storeProp))
            return null;
        const host = record(root.host);
        if (!host || !exact(host, ["tag", "key", "props", "child"]) ||
            !["mesh", "group", "div", "output"].includes(host.tag) ||
            typeof host.key !== "string" || host.key.length === 0 ||
            host.child !== null)
            return null;
        const tag = host.tag;
        const rawProps = array(host.props);
        if (!rawProps)
            return null;
        const props = [];
        const names = new Set();
        for (const raw of rawProps) {
            const pair = array(raw);
            if (!pair || pair.length !== 2 || typeof pair[0] !== "string" ||
                !allowedName(tag, pair[0]) || names.has(pair[0]))
                return null;
            const expression = normalizeClosedNumericExpression(pair[1], 1);
            if (!expression)
                return null;
            names.add(pair[0]);
            props.push(Object.freeze([pair[0], expression]));
        }
        if (props.length === 0)
            return null;
        return Object.freeze({
            schemaVersion: 1,
            componentProgramId: root.componentProgramId,
            moduleRevision: root.moduleRevision,
            storeUseSiteId: root.storeUseSiteId,
            storeProp: root.storeProp,
            host: Object.freeze({ tag, key: host.key,
                props: Object.freeze(props), child: null }),
        });
    }
    catch {
        return null;
    }
};
/** Evaluate only frozen primitive data; unsupported values decline admission. */
export const evaluateClosedStoreHostProgram = (program, numericValue) => {
    if (typeof numericValue !== "number" || !Number.isFinite(numericValue))
        return null;
    const props = [];
    for (const [name, expression] of program.host.props) {
        const value = evaluateClosedNumericExpression(expression, [numericValue]);
        if (!primitive(value))
            return null;
        props.push(Object.freeze([name, value]));
    }
    return Object.freeze(props);
};
//# sourceMappingURL=closed_store_host_program.js.map