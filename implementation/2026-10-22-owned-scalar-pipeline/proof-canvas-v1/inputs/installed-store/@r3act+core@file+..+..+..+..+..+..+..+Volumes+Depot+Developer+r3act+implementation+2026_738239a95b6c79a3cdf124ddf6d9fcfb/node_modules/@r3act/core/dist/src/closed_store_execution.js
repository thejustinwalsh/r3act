import { closedDataArray, closedDataRecord, evaluateClosedHostValue, exactClosedFields, isClosedHostPrimitive, } from "./closed_host_value.js";
import { closedStoreHostInputPaths, closedStoreHostInputs, closedStoreHostValueCount, isNormalizedClosedStoreHostProgram, } from "./closed_store_host_program.js";
import { readOwnedClosedProjectionBatch, } from "./async_store_runtime.js";
import { captureOwnedClosedWorldInputs, } from "./owner_state_world.js";
import { snapshotScopedHostProp } from "./scoped_host_values.js";
const associations = new WeakMap();
const numericExpression = (value) => {
    switch (value.kind) {
        case "input": return true;
        case "literal": return typeof value.value === "number" && Number.isFinite(value.value);
        case "unary": return value.operator !== "!" && numericExpression(value.argument);
        case "binary": return !["==", "!=", "===", "!==", "<", "<=", ">", ">="].includes(value.operator) && numericExpression(value.left) && numericExpression(value.right);
        default: return false;
    }
};
const supportedHost = (host) => {
    if (host.schemaVersion === 4)
        return false;
    if (host.schemaVersion === 5) {
        if (host.host.tag !== "group" || host.host.children.length !== 0)
            return false;
        return host.host.props.some(([, value]) => numericExpression(value)) &&
            host.host.props.every(([, value]) => value.kind === "literal"
                ? isClosedHostPrimitive(value.value)
                : numericExpression(value));
    }
    return host.host.props.length > 0 && host.host.props.every(([, value]) => numericExpression(value));
};
/** Copy an explicit data marker and bind it privately to a normalized host program. */
export const normalizeClosedStoreDataExecution = (raw, host) => {
    try {
        if (!isNormalizedClosedStoreHostProgram(host) || !supportedHost(host))
            return null;
        const data = closedDataRecord(raw);
        if (!data || !exactClosedFields(data, [
            "schemaVersion", "kind", "componentProgramId", "moduleRevision",
        ]) || data.schemaVersion !== 1 || data.kind !== "owned-data" ||
            data.componentProgramId !== host.componentProgramId ||
            data.moduleRevision !== host.moduleRevision)
            return null;
        const normalized = Object.freeze({
            schemaVersion: 1,
            kind: "owned-data",
            componentProgramId: host.componentProgramId,
            moduleRevision: host.moduleRevision,
        });
        const inputs = closedStoreHostInputs(host);
        associations.set(normalized, Object.freeze({
            host,
            paths: Object.freeze(inputs.map((input) => closedStoreHostInputPaths(input))),
            stateSites: host.schemaVersion === 7 ? host.stateSites : Object.freeze([]),
            inputCount: inputs.length,
            valueCount: closedStoreHostValueCount(host),
            retainedChildren: host.schemaVersion === 5 || host.schemaVersion === 6 ||
                host.schemaVersion === 7,
        }));
        return normalized;
    }
    catch {
        return null;
    }
};
/** Evaluate only privately associated, finite numeric inputs into candidate-owned props. */
export const evaluateClosedStoreDataExecution = (execution, numericValues) => {
    try {
        const facts = typeof execution === "object" && execution !== null
            ? associations.get(execution) : undefined;
        if (!facts)
            return null;
        const values = closedDataArray(numericValues);
        if (!values || values.length !== facts.valueCount ||
            values.some((value) => typeof value !== "number" || !Number.isFinite(value)))
            return null;
        return evaluateOwnedProps(facts, values);
    }
    catch {
        return null;
    }
};
const evaluateOwnedProps = (facts, values) => {
    const props = [];
    for (const [name, expression] of facts.host.host.props) {
        const value = evaluateClosedHostValue(expression, values);
        if (!isClosedHostPrimitive(value))
            return null;
        props.push(Object.freeze([name, value]));
    }
    return Object.freeze(props);
};
const ownedScalarStorePropDeltas = new WeakSet();
/** Identify a region constructed by the shared scalar output authority. */
export const isOwnedScalarStorePropDelta = (region) => ownedScalarStorePropDeltas.has(region);
const ownScalarRegionData = (input) => {
    if (input === null || typeof input !== "object")
        return null;
    try {
        const prototype = Object.getPrototypeOf(input);
        if (prototype !== Object.prototype && prototype !== null)
            return null;
        const descriptors = Object.getOwnPropertyDescriptors(input);
        const keys = Reflect.ownKeys(descriptors);
        if (keys.length < 3 || keys.length > 5 ||
            keys.some((key) => typeof key !== "string" ||
                !["key", "tag", "props", "retainedChildren", "componentOwner", "children"]
                    .includes(key)) ||
            !descriptors.key || !descriptors.tag || !descriptors.props)
            return null;
        const copy = Object.create(null);
        for (const key of keys) {
            const descriptor = descriptors[key];
            if (!descriptor || !("value" in descriptor))
                return null;
            copy[key] = descriptor.value;
        }
        return copy;
    }
    catch {
        return null;
    }
};
const ownArray = (input, limit) => {
    if (!Array.isArray(input))
        return null;
    try {
        if (Object.getPrototypeOf(input) !== Array.prototype)
            return null;
        const size = Object.getOwnPropertyDescriptor(input, "length")?.value;
        if (!Number.isSafeInteger(size) || size < 0 || size > limit)
            return null;
        const descriptors = Object.getOwnPropertyDescriptors(input);
        const length = descriptors.length?.value;
        if (length !== size ||
            Reflect.ownKeys(descriptors).length !== length + 1)
            return null;
        const copy = [];
        for (let index = 0; index < length; index++) {
            const descriptor = descriptors[index];
            if (!descriptor || !("value" in descriptor))
                return null;
            copy.push(descriptor.value);
        }
        return copy;
    }
    catch {
        return null;
    }
};
/** Copy a caller's scalar Store region into a privately owned immutable shape. */
export const createOwnedScalarStorePropDelta = (region) => {
    const data = ownScalarRegionData(region);
    return data ? copyOwnedScalarRegion(data) : null;
};
const copyOwnedScalarRegion = (fields) => {
    const { key, tag, props, retainedChildren, componentOwner, children } = fields;
    if (typeof key !== "string" || !key || typeof tag !== "string" || !tag ||
        !["div", "span", "output", "group", "mesh"].includes(tag) ||
        (Object.hasOwn(fields, "retainedChildren") !==
            Object.hasOwn(fields, "componentOwner")) ||
        (Object.hasOwn(fields, "children") && children === undefined) ||
        (retainedChildren !== undefined && retainedChildren !== true) ||
        (componentOwner !== undefined &&
            (retainedChildren !== true || typeof componentOwner !== "number" ||
                !Number.isSafeInteger(componentOwner))) ||
        (retainedChildren === true && (componentOwner === undefined ||
            children !== undefined)))
        return null;
    const rawProps = ownArray(props, 32);
    if (!rawProps || (!rawProps.length && children === undefined))
        return null;
    const pairs = [];
    const names = new Set();
    for (const rawPair of rawProps) {
        const pair = ownArray(rawPair, 2);
        if (!pair || pair.length !== 2 || typeof pair[0] !== "string" ||
            !pair[0] || pair[0] === "__proto__" || pair[0] === "prototype" ||
            pair[0] === "constructor" || pair[0] === "ref" ||
            /^on[A-Z]/.test(pair[0]) || names.has(pair[0]))
            return null;
        const value = pair[1];
        if (value !== null && typeof value !== "string" &&
            typeof value !== "boolean" &&
            !(typeof value === "number" && Number.isFinite(value)))
            return null;
        const captured = snapshotScopedHostProp(tag, pair[0], value);
        if (!captured.accepted || captured.value === undefined ||
            !Object.is(captured.value, value))
            return null;
        names.add(pair[0]);
        pairs.push(Object.freeze([pair[0], value]));
    }
    if (children !== undefined) {
        const empty = ownArray(children, 0);
        if (!empty || empty.length !== 0)
            return null;
    }
    const copy = Object.freeze({ key, tag,
        props: Object.freeze(pairs),
        ...(retainedChildren === true ? { retainedChildren: true,
            componentOwner: componentOwner } : {}),
        ...(children === undefined ? {} : { children: Object.freeze([]) }), });
    ownedScalarStorePropDeltas.add(copy);
    return copy;
};
const createOwnedRegionFromExecution = (facts, owner, hostKey, props) => {
    const region = Object.freeze({
        key: facts.retainedChildren ? hostKey : facts.host.host.key,
        tag: facts.host.host.tag,
        props,
        ...(facts.retainedChildren ? { retainedChildren: true,
            componentOwner: owner } : {}),
    });
    ownedScalarStorePropDeltas.add(region);
    return region;
};
/** Enclose passive captures and finite evaluation for ordered owned scalar rows. */
export const prepareOwnedClosedStoreOutputs = (world, transaction, orderedRequests) => {
    try {
        const rawRequests = closedDataArray(orderedRequests, 65536);
        if (!rawRequests || rawRequests.length === 0)
            return null;
        const normalized = [];
        for (const raw of rawRequests) {
            const request = closedDataRecord(raw);
            if (!request || !exactClosedFields(request, ["execution", "owner", "hostKey", "inputs"]))
                return null;
            const facts = typeof request.execution === "object" && request.execution !== null
                ? associations.get(request.execution) : undefined;
            if (!facts || !Number.isSafeInteger(request.owner) ||
                typeof request.hostKey !== "string" || !request.hostKey)
                return null;
            const rawInputs = closedDataArray(request.inputs, 8);
            if (!rawInputs || rawInputs.length !== facts.inputCount)
                return null;
            const inputs = [];
            for (const rawInput of rawInputs) {
                const input = closedDataRecord(rawInput);
                if (!input || !exactClosedFields(input, ["store", "readerId"]) ||
                    typeof input.readerId !== "string" || !input.readerId ||
                    typeof input.store !== "object" || input.store === null)
                    return null;
                inputs.push({ store: input.store, readerId: input.readerId });
            }
            normalized.push({ facts, owner: request.owner,
                hostKey: request.hostKey, inputs });
        }
        const worldRows = captureOwnedClosedWorldInputs(world, normalized.map(({ owner, facts }) => ({ owner, sites: facts.stateSites })));
        if (!worldRows)
            return { kind: "public-required" };
        const projectionRequests = [];
        for (const row of normalized) {
            for (let index = 0; index < row.inputs.length; index++) {
                projectionRequests.push({ ...row.inputs[index], paths: row.facts.paths[index] });
            }
        }
        const projections = readOwnedClosedProjectionBatch(transaction, projectionRequests);
        if (!projections)
            return { kind: "public-required" };
        const scratch = [];
        const rows = [];
        let projectionIndex = 0;
        for (let index = 0; index < normalized.length; index++) {
            const request = normalized[index];
            const worldRow = worldRows[index];
            if (!worldRow || worldRow.owner !== request.owner ||
                worldRow.cells.length !== request.facts.stateSites.length)
                return null;
            scratch.length = request.facts.valueCount;
            let cursor = 0;
            for (let input = 0; input < request.inputs.length; input++) {
                const values = projections[projectionIndex++];
                if (!values || values.length !== request.facts.paths[input].length)
                    return null;
                for (const value of values) {
                    if (typeof value !== "number" || !Number.isFinite(value))
                        return null;
                    scratch[cursor++] = value;
                }
            }
            for (const cell of worldRow.cells) {
                if (typeof cell.value !== "number" || !Number.isFinite(cell.value))
                    return null;
                scratch[cursor++] = cell.value;
            }
            if (cursor !== scratch.length)
                return null;
            const props = evaluateOwnedProps(request.facts, scratch);
            if (!props)
                return null;
            rows.push(Object.freeze({ owner: request.owner, lineage: worldRow.lineage,
                cells: worldRow.cells,
                region: createOwnedRegionFromExecution(request.facts, request.owner, request.hostKey, props) }));
        }
        return Object.freeze({ kind: "ready", rows: Object.freeze(rows) });
    }
    catch {
        return null;
    }
};
//# sourceMappingURL=closed_store_execution.js.map