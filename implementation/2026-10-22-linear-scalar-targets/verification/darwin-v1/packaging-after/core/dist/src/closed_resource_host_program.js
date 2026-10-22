import { jsx } from "./jsx_binding_runtime.js";
import { closedDataArray, closedDataRecord, exactClosedFields, isClosedHostPrimitive, } from "./closed_host_value.js";
import { evaluateClosedHostTree, normalizeClosedHostTree } from "./closed_host_tree.js";
const record = closedDataRecord;
const exact = exactClosedFields;
const primitive = isClosedHostPrimitive;
const tupleArray = closedDataArray;
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
            const host = normalizeClosedHostTree(root.host, 1, root.schemaVersion === 3);
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
    return evaluateClosedHostTree(program.host, [readyValue]);
};
//# sourceMappingURL=closed_resource_host_program.js.map