import { evaluateClosedNumericExpression, normalizeClosedNumericExpression } from "./closed_numeric_expression.js";
import { jsx } from "./jsx_binding_runtime.js";
import { closedDataArray, closedDataRecord, evaluateClosedHostValue, exactClosedFields, isClosedHostPrimitive, normalizeClosedHostValue, } from "./closed_host_value.js";
const record = closedDataRecord;
const exact = exactClosedFields;
const primitive = isClosedHostPrimitive;
const tupleArray = closedDataArray;
const normalizeHost = (input, schemaVersion) => {
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
                if (!pair || pair.length !== 2 || typeof pair[0] !== "string" || seen.has(pair[0]))
                    return null;
                const expression = normalizeClosedHostValue(pair[1], tag, pair[0], 1, schemaVersion === 3);
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
            (root.schemaVersion !== 1 && root.schemaVersion !== 2 && root.schemaVersion !== 3))
            return null;
        for (const key of ["componentProgramId", "moduleRevision", "resourceUseSiteId", "resourceProp"]) {
            if (typeof root[key] !== "string" || root[key].length === 0)
                return null;
        }
        if (!/^[A-Za-z_$][\w$]*$/.test(root.resourceProp))
            return null;
        if (root.schemaVersion === 2 || root.schemaVersion === 3) {
            const host = normalizeHost(root.host, root.schemaVersion);
            return host ? Object.freeze({
                schemaVersion: root.schemaVersion,
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
    const evaluate = (expression) => evaluateClosedHostValue(expression, inputs);
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
                const value = evaluateClosedNumericExpression(child.expression, inputs);
                if (!primitive(value) || value === true)
                    return null;
                children.push(value);
            }
        }
        return jsx(host.tag, props, ...children);
    };
    return construct(program.host);
};
//# sourceMappingURL=closed_resource_host_program.js.map