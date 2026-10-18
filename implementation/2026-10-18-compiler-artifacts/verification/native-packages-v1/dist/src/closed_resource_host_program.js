import { evaluateClosedNumericExpression, normalizeClosedNumericExpression } from "./closed_numeric_expression.js";
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
const tupleArray = (input, limit = 32) => {
    if (!Array.isArray(input) || input.length > limit)
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
const propertyName = (tag, name) => {
    if (name === "key" || name === "children" || name === "ref" || name === "style" ||
        name === "__proto__" || name === "prototype" || name === "constructor" ||
        name.startsWith("on"))
        return false;
    if (tag === "div" || tag === "span" || tag === "output") {
        return /^data-[a-z][a-z0-9-]*$/.test(name);
    }
    return name === "name" || name === "visible" ||
        /^(position|rotation|scale)-[xyz]$/.test(name);
};
const normalizeHost = (input) => {
    const active = new Set();
    const keys = new Set();
    let nodes = 0;
    const visit = (raw, depth) => {
        if (depth > 32 || ++nodes > 256 || typeof raw !== "object" || raw === null || active.has(raw))
            return null;
        active.add(raw);
        try {
            const host = record(raw);
            if (!host || !exact(host, ["tag", "key", "props", "children"]) ||
                !["div", "span", "output", "group", "mesh"].includes(host.tag) ||
                typeof host.key !== "string" || host.key.length === 0 || keys.has(host.key))
                return null;
            const tag = host.tag;
            keys.add(host.key);
            const rawProps = tupleArray(host.props);
            const rawChildren = tupleArray(host.children, 256);
            if (!rawProps || !rawChildren)
                return null;
            const props = [];
            const seen = new Set();
            for (const rawPair of rawProps) {
                const pair = tupleArray(rawPair, 2);
                if (!pair || pair.length !== 2 || typeof pair[0] !== "string" ||
                    !propertyName(tag, pair[0]) || seen.has(pair[0]))
                    return null;
                const expression = normalizeClosedNumericExpression(pair[1], 1);
                if (!expression)
                    return null;
                seen.add(pair[0]);
                props.push(Object.freeze([pair[0], expression]));
            }
            const children = [];
            for (const rawChild of rawChildren) {
                const child = record(rawChild);
                if (!child)
                    return null;
                if (child.kind === "host" && exact(child, ["kind", "host"])) {
                    const nested = visit(child.host, depth + 1);
                    if (!nested)
                        return null;
                    children.push(Object.freeze({ kind: "host", host: nested }));
                }
                else if (child.kind === "text" && exact(child, ["kind", "expression"])) {
                    if (++nodes > 256)
                        return null;
                    const expression = normalizeClosedNumericExpression(child.expression, 1);
                    if (!expression)
                        return null;
                    children.push(Object.freeze({ kind: "text", expression }));
                }
                else
                    return null;
            }
            return Object.freeze({ tag, key: host.key, props: Object.freeze(props), children: Object.freeze(children) });
        }
        finally {
            active.delete(raw);
        }
    };
    try {
        return visit(input, 0);
    }
    catch {
        return null;
    }
};
/** Snapshot untrusted metadata; evaluation reads only this frozen copy. */
export const normalizeClosedResourceHostProgram = (input) => {
    try {
        const root = record(input);
        if (!root || !exact(root, ["schemaVersion", "componentProgramId", "moduleRevision", "resourceUseSiteId", "resourceProp", "host"]) ||
            (root.schemaVersion !== 1 && root.schemaVersion !== 2))
            return null;
        for (const key of ["componentProgramId", "moduleRevision", "resourceUseSiteId", "resourceProp"]) {
            if (typeof root[key] !== "string" || root[key].length === 0)
                return null;
        }
        if (!/^[A-Za-z_$][\w$]*$/.test(root.resourceProp))
            return null;
        if (root.schemaVersion === 2) {
            const host = normalizeHost(root.host);
            return host ? Object.freeze({
                schemaVersion: 2,
                componentProgramId: root.componentProgramId,
                moduleRevision: root.moduleRevision,
                resourceUseSiteId: root.resourceUseSiteId,
                resourceProp: root.resourceProp,
                host,
            }) : null;
        }
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
    }
    catch {
        return null;
    }
};
/** Construct ready host output without invoking the authored component. */
export const evaluateClosedResourceHostProgram = (program, readyValue) => {
    if (!primitive(readyValue))
        return null;
    if (program.schemaVersion === 1) {
        if (readyValue === true)
            return null;
        const props = { key: program.host.key };
        for (const [name, value] of program.host.props)
            props[name] = value;
        return jsx(program.host.tag, props, readyValue);
    }
    const inputs = [readyValue];
    const evaluate = (expression) => {
        const value = evaluateClosedNumericExpression(expression, inputs);
        return primitive(value) ? value : undefined;
    };
    const construct = (host) => {
        const props = { key: host.key };
        for (const [name, expression] of host.props) {
            const value = evaluate(expression);
            if (value === undefined)
                return null;
            props[name] = value;
        }
        const children = [];
        for (const child of host.children) {
            if (child.kind === "host") {
                const nested = construct(child.host);
                if (!nested)
                    return null;
                children.push(nested);
            }
            else {
                const value = evaluate(child.expression);
                if (value === undefined || value === true)
                    return null;
                children.push(value);
            }
        }
        return jsx(host.tag, props, ...children);
    };
    return construct(program.host);
};
//# sourceMappingURL=closed_resource_host_program.js.map