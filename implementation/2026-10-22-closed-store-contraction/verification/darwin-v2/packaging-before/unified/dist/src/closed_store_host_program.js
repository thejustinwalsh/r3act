import { closedDataArray, closedDataRecord, evaluateClosedHostValue, exactClosedFields, isClosedHostPrimitive, normalizeClosedHostValue, } from "./closed_host_value.js";
import { evaluateClosedHostTree, normalizeClosedHostTree } from "./closed_host_tree.js";
import { jsx } from "./jsx_binding_runtime.js";
import { normalizeClosedProjectionPaths } from "./owned_store_record.js";
const record = closedDataRecord;
const exact = exactClosedFields;
const array = closedDataArray;
const allowedName = (tag, name) => tag === "div" || tag === "span" || tag === "output"
    ? /^data-[a-z][a-z0-9-]*$/.test(name)
    : /^(?:position|rotation|scale)-[xyz]$/.test(name) || name === "visible";
const input = (site, prop) => typeof site === "string" && site.length > 0 &&
    typeof prop === "string" && /^[A-Za-z_$][\w$]*$/.test(prop)
    ? Object.freeze({ storeUseSiteId: site, storeProp: prop }) : null;
const directPath = Object.freeze([Object.freeze([])]);
/** Copy untrusted metadata into a frozen, data-only executable plan. */
export const normalizeClosedStoreHostProgram = (raw) => {
    try {
        const root = record(raw);
        if (!root || typeof root.componentProgramId !== "string" ||
            !root.componentProgramId || typeof root.moduleRevision !== "string" ||
            !root.moduleRevision)
            return null;
        let inputs;
        let valueCount = 0;
        let stateSites;
        let effectSites;
        if (root.schemaVersion === 1) {
            if (!exact(root, ["schemaVersion", "componentProgramId", "moduleRevision", "storeUseSiteId", "storeProp", "host"]))
                return null;
            const one = input(root.storeUseSiteId, root.storeProp);
            if (!one)
                return null;
            inputs = Object.freeze([one]);
        }
        else if (root.schemaVersion === 2 || root.schemaVersion === 3 || root.schemaVersion === 4 || root.schemaVersion === 5 || root.schemaVersion === 6 || root.schemaVersion === 7) {
            if (!exact(root, root.schemaVersion === 7
                ? ["schemaVersion", "componentProgramId", "moduleRevision", "inputs", "stateSites", "effectSites", "host", "retainedChildProp"]
                : root.schemaVersion === 6
                    ? ["schemaVersion", "componentProgramId", "moduleRevision", "inputs", "host", "retainedChildProp"]
                    : ["schemaVersion", "componentProgramId", "moduleRevision", "inputs", "host"]))
                return null;
            if (root.schemaVersion === 6 && root.retainedChildProp !== "children")
                return null;
            if (root.schemaVersion === 7) {
                if (root.retainedChildProp !== "children" && root.retainedChildProp !== null)
                    return null;
                const copiedStateSites = array(root.stateSites, 8);
                const copiedEffectSites = array(root.effectSites, 32);
                if (!copiedStateSites || copiedStateSites.length < 1 || !copiedEffectSites ||
                    [...copiedStateSites, ...copiedEffectSites].some((site) => typeof site !== "string" || site.length === 0) ||
                    new Set(copiedStateSites).size !== copiedStateSites.length ||
                    new Set(copiedEffectSites).size !== copiedEffectSites.length)
                    return null;
                stateSites = Object.freeze(copiedStateSites);
                effectSites = Object.freeze(copiedEffectSites);
            }
            const rawInputs = array(root.inputs);
            if (!rawInputs || rawInputs.length < (root.schemaVersion === 2 ? 2 : 1) || rawInputs.length > 8)
                return null;
            const next = [];
            const sites = new Set();
            let hasProjection = false;
            for (const rawInput of rawInputs) {
                const item = record(rawInput);
                if (!item || !exact(item, root.schemaVersion === 5 || root.schemaVersion === 6 || root.schemaVersion === 7
                    ? ["storeUseSiteId", "storeProp", "paths"]
                    : ["storeUseSiteId", "storeProp"]))
                    return null;
                const normalized = input(item.storeUseSiteId, item.storeProp);
                if (!normalized || sites.has(normalized.storeUseSiteId))
                    return null;
                sites.add(normalized.storeUseSiteId);
                if (root.schemaVersion === 5 || root.schemaVersion === 6 || root.schemaVersion === 7) {
                    const paths = normalizeClosedProjectionPaths(item.paths);
                    if (!paths)
                        return null;
                    valueCount += paths.length;
                    if (valueCount > 32)
                        return null;
                    hasProjection ||= paths.some((path) => path.length > 0);
                    next.push(Object.freeze({ ...normalized, paths }));
                }
                else
                    next.push(normalized);
            }
            if (root.schemaVersion === 5 && !hasProjection)
                return null;
            inputs = Object.freeze(next);
        }
        else
            return null;
        if (root.schemaVersion === 7 &&
            valueCount + stateSites.length > 32)
            return null;
        if (root.schemaVersion === 4 || root.schemaVersion === 5) {
            const inputCount = root.schemaVersion === 5
                ? inputs.reduce((count, item) => count + item.paths.length, 0)
                : inputs.length;
            const host = normalizeClosedHostTree(root.host, inputCount, true, root.schemaVersion === 5 ? 32 : 8);
            return host ? Object.freeze({
                schemaVersion: root.schemaVersion,
                componentProgramId: root.componentProgramId,
                moduleRevision: root.moduleRevision,
                inputs: inputs,
                host,
            }) : null;
        }
        const host = record(root.host);
        if (!host || !exact(host, ["tag", "key", "props", "child"]) ||
            !["mesh", "group", "div", "span", "output"].includes(host.tag) ||
            (root.schemaVersion !== 3 && root.schemaVersion !== 6 && root.schemaVersion !== 7 && host.tag === "span") ||
            typeof host.key !== "string" || host.key.length === 0 ||
            host.child !== null)
            return null;
        const tag = host.tag;
        const rawProps = array(host.props);
        if (!rawProps)
            return null;
        const props = [];
        const names = new Set();
        for (const rawProp of rawProps) {
            const pair = array(rawProp);
            if (!pair || pair.length !== 2 || typeof pair[0] !== "string" ||
                (root.schemaVersion !== 3 && root.schemaVersion !== 6 && root.schemaVersion !== 7 && !allowedName(tag, pair[0])) || names.has(pair[0]))
                return null;
            const expression = normalizeClosedHostValue(pair[1], tag, pair[0], root.schemaVersion === 6 || root.schemaVersion === 7
                ? valueCount + (root.schemaVersion === 7 ? stateSites.length : 0)
                : inputs.length, root.schemaVersion === 3 || root.schemaVersion === 6 || root.schemaVersion === 7);
            if (!expression)
                return null;
            names.add(pair[0]);
            props.push(Object.freeze([pair[0], expression]));
        }
        if (props.length === 0)
            return null;
        const common = {
            componentProgramId: root.componentProgramId,
            moduleRevision: root.moduleRevision,
            host: Object.freeze({ tag, key: host.key, props: Object.freeze(props), child: null }),
        };
        return root.schemaVersion === 1
            ? Object.freeze({ ...common, schemaVersion: 1, ...inputs[0] })
            : Object.freeze({ ...common, schemaVersion: root.schemaVersion, inputs,
                ...(root.schemaVersion === 6 ? { retainedChildProp: "children" } : {}),
                ...(root.schemaVersion === 7 ? {
                    stateSites: stateSites,
                    effectSites: effectSites,
                    retainedChildProp: root.retainedChildProp,
                } : {}) });
    }
    catch {
        return null;
    }
};
/** The ordered direct Store reads covered by the frozen compiler program. */
export const closedStoreHostInputs = (program) => program.schemaVersion !== 1
    ? program.inputs
    : Object.freeze([Object.freeze({
            storeUseSiteId: program.storeUseSiteId,
            storeProp: program.storeProp,
        })]);
/** Numeric paths for one lexical Store input; old schemas read the state directly. */
export const closedStoreHostInputPaths = (input) => input.paths ?? directPath;
/** Number of numeric expression inputs after lexical path flattening. */
export const closedStoreHostValueCount = (program) => closedStoreHostInputs(program).reduce((count, input) => count + closedStoreHostInputPaths(input).length, 0) +
    (program.schemaVersion === 7 ? program.stateSites.length : 0);
/** Evaluate frozen compiler data into candidate-owned host values; unsupported values decline. */
export const evaluateClosedStoreHostProgram = (program, numericValues) => {
    if (program.schemaVersion === 4 || program.schemaVersion === 5 ||
        program.schemaVersion === 7)
        return null;
    const count = program.schemaVersion === 6 ? closedStoreHostValueCount(program)
        : program.schemaVersion !== 1 ? program.inputs.length : 1;
    const values = typeof numericValues === "number"
        ? count === 1 ? [numericValues] : null
        : array(numericValues);
    if (!values || values.length !== count || values.some((value) => typeof value !== "number" || !Number.isFinite(value)))
        return null;
    const props = [];
    for (const [name, expression] of program.host.props) {
        const value = evaluateClosedHostValue(expression, values);
        if (value === undefined || (program.schemaVersion !== 3 && program.schemaVersion !== 6 && !isClosedHostPrimitive(value)))
            return null;
        props.push(Object.freeze([name, value]));
    }
    return Object.freeze(props);
};
/** Evaluate every Store schema as a keyed candidate tree for scoped host publication. */
export const evaluateClosedStoreHostTree = (program, numericValues) => {
    if (program.schemaVersion === 6)
        return null;
    if (program.schemaVersion !== 4 && program.schemaVersion !== 5) {
        const output = evaluateClosedStoreHostProgram(program, numericValues);
        if (!output)
            return null;
        const props = { key: program.host.key };
        for (const [name, value] of output)
            props[name] = value;
        return jsx(program.host.tag, props);
    }
    const count = closedStoreHostValueCount(program);
    const values = typeof numericValues === "number"
        ? count === 1 ? [numericValues] : null
        : array(numericValues);
    if (!values || values.length !== count || values.some((value) => typeof value !== "number" || !Number.isFinite(value)))
        return null;
    return evaluateClosedHostTree(program.host, values, true);
};
//# sourceMappingURL=closed_store_host_program.js.map