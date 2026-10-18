import { closedDataArray, closedDataRecord, evaluateClosedHostValue, exactClosedFields, isClosedHostPrimitive, normalizeClosedHostValue, } from "./closed_host_value.js";
const record = closedDataRecord;
const exact = exactClosedFields;
const array = closedDataArray;
const allowedName = (tag, name) => tag === "div" || tag === "span" || tag === "output"
    ? /^data-[a-z][a-z0-9-]*$/.test(name)
    : /^(?:position|rotation|scale)-[xyz]$/.test(name) || name === "visible";
const input = (site, prop) => typeof site === "string" && site.length > 0 &&
    typeof prop === "string" && /^[A-Za-z_$][\w$]*$/.test(prop)
    ? Object.freeze({ storeUseSiteId: site, storeProp: prop }) : null;
/** Copy untrusted metadata into a frozen, data-only executable plan. */
export const normalizeClosedStoreHostProgram = (raw) => {
    try {
        const root = record(raw);
        if (!root || typeof root.componentProgramId !== "string" ||
            !root.componentProgramId || typeof root.moduleRevision !== "string" ||
            !root.moduleRevision)
            return null;
        let inputs;
        if (root.schemaVersion === 1) {
            if (!exact(root, ["schemaVersion", "componentProgramId", "moduleRevision", "storeUseSiteId", "storeProp", "host"]))
                return null;
            const one = input(root.storeUseSiteId, root.storeProp);
            if (!one)
                return null;
            inputs = Object.freeze([one]);
        }
        else if (root.schemaVersion === 2 || root.schemaVersion === 3) {
            if (!exact(root, ["schemaVersion", "componentProgramId", "moduleRevision", "inputs", "host"]))
                return null;
            const rawInputs = array(root.inputs);
            if (!rawInputs || rawInputs.length < (root.schemaVersion === 2 ? 2 : 1) || rawInputs.length > 8)
                return null;
            const next = [];
            const sites = new Set();
            for (const rawInput of rawInputs) {
                const item = record(rawInput);
                if (!item || !exact(item, ["storeUseSiteId", "storeProp"]))
                    return null;
                const normalized = input(item.storeUseSiteId, item.storeProp);
                if (!normalized || sites.has(normalized.storeUseSiteId))
                    return null;
                sites.add(normalized.storeUseSiteId);
                next.push(normalized);
            }
            inputs = Object.freeze(next);
        }
        else
            return null;
        const host = record(root.host);
        if (!host || !exact(host, ["tag", "key", "props", "child"]) ||
            !["mesh", "group", "div", "span", "output"].includes(host.tag) ||
            (root.schemaVersion !== 3 && host.tag === "span") ||
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
                (root.schemaVersion !== 3 && !allowedName(tag, pair[0])) || names.has(pair[0]))
                return null;
            const expression = normalizeClosedHostValue(pair[1], tag, pair[0], inputs.length, root.schemaVersion === 3);
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
            : Object.freeze({ ...common, schemaVersion: root.schemaVersion, inputs });
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
/** Evaluate frozen compiler data into candidate-owned host values; unsupported values decline. */
export const evaluateClosedStoreHostProgram = (program, numericValues) => {
    const count = program.schemaVersion !== 1 ? program.inputs.length : 1;
    const values = typeof numericValues === "number"
        ? count === 1 ? [numericValues] : null
        : array(numericValues);
    if (!values || values.length !== count || values.some((value) => typeof value !== "number" || !Number.isFinite(value)))
        return null;
    const props = [];
    for (const [name, expression] of program.host.props) {
        const value = evaluateClosedHostValue(expression, values);
        if (value === undefined || (program.schemaVersion !== 3 && !isClosedHostPrimitive(value)))
            return null;
        props.push(Object.freeze([name, value]));
    }
    return Object.freeze(props);
};
//# sourceMappingURL=closed_store_host_program.js.map