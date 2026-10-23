import { closedDataArray, closedDataRecord, evaluateClosedHostValue, exactClosedFields, isClosedHostPrimitive, } from "./closed_host_value.js";
import { closedStoreHostInputPaths, closedStoreHostInputs, closedStoreHostValueCount, isNormalizedClosedStoreHostProgram, } from "./closed_store_host_program.js";
import { bindOwnedClosedProjectionRequest, readOwnedClosedProjectionSchedule, } from "./async_store_runtime.js";
import { bindOwnedClosedWorldInputRequest, captureOwnedClosedWorldInputSchedule, } from "./owner_state_world.js";
import { snapshotScopedHostProp } from "./scoped_host_values.js";
import { proveClosedStoreBatchKernel, CLOSED_STORE_BATCH_MAX_ROWS, } from "./closed_store_batch_kernel_proof.js";
import { createOwnedClosedFrameInput, createOwnedClosedFrameSchedule, canonicalOwnedClosedFrameScheduleRowAt, } from "./owned_closed_frame_input.js";
import { OwnedScalarFrame, OwnedScalarLayout, materializeOwnedScalarPropEntries, materializeOwnedScalarImagePropEntries, captureVerifiedOwnedScalarBatch, } from "./closed_scalar_output.js";
const associations = new WeakMap();
const intrinsicApply = Reflect.apply;
const intrinsicDefineProperty = Object.defineProperty;
const intrinsicPush = Array.prototype.push;
const intrinsicFreeze = Object.freeze;
const appendOwned = (array, value) => {
    intrinsicApply(intrinsicPush, array, [value]);
};
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
        if (!data || data.schemaVersion !== 3 ||
            !exactClosedFields(data, Object.hasOwn(data, "batchKernel") ? [
                "schemaVersion", "kind", "componentProgramId", "moduleRevision", "batchKernel",
            ] : ["schemaVersion", "kind", "componentProgramId", "moduleRevision"]) ||
            data.kind !== "owned-data" ||
            data.componentProgramId !== host.componentProgramId ||
            data.moduleRevision !== host.moduleRevision)
            return null;
        const batchProof = typeof data.batchKernel === "function"
            ? proveClosedStoreBatchKernel(data.batchKernel, host) : null;
        const diagnostic = Object.freeze(batchProof?.kind === "verified"
            ? { mode: "verified-batch", reason: "verified" }
            : { mode: "interpreted",
                reason: batchProof?.reason ?? "batch-kernel-unavailable" });
        const normalized = Object.freeze({
            schemaVersion: 3,
            kind: "owned-data",
            componentProgramId: host.componentProgramId,
            moduleRevision: host.moduleRevision,
        });
        const inputs = closedStoreHostInputs(host);
        const layout = OwnedScalarLayout.create(host.host.props.map(([name]) => name), host.host.props.map(([, expression]) => expression.kind === "literal" &&
            isClosedHostPrimitive(expression.value)
            ? expression.value : undefined), batchProof?.kind === "verified" ? batchProof.numericPropIndices : undefined);
        associations.set(normalized, Object.freeze({
            host, layout,
            paths: Object.freeze(inputs.map((input) => closedStoreHostInputPaths(input))),
            stateSites: host.schemaVersion === 7 ? host.stateSites : Object.freeze([]),
            inputCount: inputs.length,
            valueCount: closedStoreHostValueCount(host),
            retainedChildren: host.schemaVersion === 5 || host.schemaVersion === 6 ||
                host.schemaVersion === 7,
            batchProof, diagnostic,
        }));
        return normalized;
    }
    catch {
        return null;
    }
};
/** Report registration-time selection without exposing executable state. */
export const inspectClosedStoreDataExecution = (execution) => typeof execution === "object" && execution !== null
    ? associations.get(execution)?.diagnostic ?? null : null;
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
const denseNumericScratch = (length) => {
    const values = [];
    growNumericScratch(values, length);
    return values;
};
const growNumericScratch = (values, length) => {
    for (let index = values.length; index < length; index++) {
        intrinsicDefineProperty(values, index, { value: 0, writable: true,
            enumerable: true, configurable: true });
    }
};
const evaluateOwnedFrame = (facts, values, counts) => {
    const props = [];
    for (const [, expression] of facts.host.host.props) {
        const value = evaluateClosedHostValue(expression, values);
        if (!isClosedHostPrimitive(value))
            return null;
        intrinsicDefineProperty(props, props.length, { value, writable: true,
            enumerable: true, configurable: true });
    }
    return OwnedScalarFrame.create(facts.layout, props, counts);
};
const evaluateOwnedProps = (facts, values) => {
    const frame = evaluateOwnedFrame(facts, values);
    return frame ? materializeOwnedScalarPropEntries(frame) : null;
};
const ownedScalarStorePropDeltas = new WeakSet();
const ownedClosedOutputRows = new WeakSet();
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
export const materializeOwnedScalarStorePropDelta = (row, counts) => {
    if (typeof row !== "object" || row === null || !ownedClosedOutputRows.has(row)) {
        throw new TypeError("Unowned scalar output row");
    }
    const region = Object.freeze({
        key: row.key,
        tag: row.tag,
        props: materializeOwnedScalarImagePropEntries(row, counts),
        ...(row.retainedChildren ? { retainedChildren: true,
            componentOwner: row.componentOwner } : {}),
    });
    ownedScalarStorePropDeltas.add(region);
    return region;
};
const normalizeOwnedOutputRequest = (raw) => {
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
    return { execution: request.execution,
        facts, owner: request.owner,
        hostKey: request.hostKey, inputs };
};
const closedOutputBindingKey = Symbol("closed-output-binding");
class PrivateBoundClosedStoreOutputRequest {
    #request;
    constructor(key, request) {
        if (key !== closedOutputBindingKey)
            throw new TypeError("Invalid output binding");
        this.#request = request;
        Object.freeze(this);
    }
    static bind(raw) {
        try {
            const request = normalizeOwnedOutputRequest(raw);
            if (!request)
                return null;
            const worldRequest = bindOwnedClosedWorldInputRequest({
                owner: request.owner, sites: request.facts.stateSites,
            });
            if (!worldRequest)
                return null;
            const projectionRequests = [];
            for (let index = 0; index < request.inputs.length; index++) {
                const input = request.inputs[index];
                const bound = bindOwnedClosedProjectionRequest({
                    store: input.store, readerId: input.readerId,
                    paths: request.facts.paths[index],
                });
                if (!bound)
                    return null;
                projectionRequests.push(bound);
            }
            return new PrivateBoundClosedStoreOutputRequest(closedOutputBindingKey, Object.freeze({
                ...request, inputs: Object.freeze(request.inputs.map((input) => Object.freeze(input))),
                worldRequest, projectionRequests: Object.freeze(projectionRequests),
            }));
        }
        catch {
            return null;
        }
    }
    static unwrap(key, value) {
        if (key !== closedOutputBindingKey)
            return null;
        return typeof value === "object" && value !== null &&
            #request in value ? value.#request : null;
    }
}
export const bindOwnedClosedStoreOutputRequest = PrivateBoundClosedStoreOutputRequest.bind;
const canonicalUnwrapClosedStoreOutputRequest = PrivateBoundClosedStoreOutputRequest.unwrap;
const ownedFrameRequestsKey = Symbol("owned-frame-requests");
export class OwnedClosedFrameRequests {
    #requests = [];
    #sealed = false;
    #consumed = false;
    constructor(key) {
        if (key !== ownedFrameRequestsKey)
            throw new TypeError("Invalid frame request builder");
        Object.freeze(this);
    }
    static create() {
        return new OwnedClosedFrameRequests(ownedFrameRequestsKey);
    }
    append(bound) {
        if (this.#sealed || this.#consumed || this.#requests.length >= 65536)
            return false;
        const request = canonicalUnwrapClosedStoreOutputRequest(closedOutputBindingKey, bound);
        if (!request)
            return false;
        appendOwned(this.#requests, request);
        return true;
    }
    seal() {
        if (this.#sealed || this.#consumed || this.#requests.length === 0)
            return false;
        this.#sealed = true;
        return true;
    }
    static consume(key, value) {
        if (key !== ownedFrameRequestsKey || typeof value !== "object" || value === null ||
            !(#requests in value) || !value.#sealed || value.#consumed)
            return null;
        value.#consumed = true;
        return value.#requests;
    }
}
export const createOwnedClosedFrameRequests = OwnedClosedFrameRequests.create;
const canonicalConsumeOwnedFrameRequests = OwnedClosedFrameRequests.consume;
Object.freeze(OwnedClosedFrameRequests.prototype);
Object.freeze(OwnedClosedFrameRequests);
const prepareOwnedFrameSchedule = (world, transaction, requests, counts) => {
    if (requests.length === 0)
        return null;
    const scheduled = [];
    const groups = [];
    const byExecution = new Map();
    for (let ordinal = 0; ordinal < requests.length; ordinal++) {
        const request = requests[ordinal];
        let group = null;
        let groupRow = -1;
        if (request.facts.batchProof?.kind === "verified") {
            const existingRoot = byExecution.get(request.execution);
            let node;
            if (existingRoot)
                node = existingRoot;
            else {
                node = { children: new Map() };
                byExecution.set(request.execution, node);
            }
            for (let index = 0; index < request.inputs.length; index++) {
                const store = request.inputs[index].store;
                const existingChild = node.children.get(store);
                let child;
                if (existingChild)
                    child = existingChild;
                else {
                    child = { children: new Map() };
                    node.children.set(store, child);
                }
                node = child;
            }
            group = node.group ?? null;
            if (!group || group.rows.length >= CLOSED_STORE_BATCH_MAX_ROWS) {
                group = { execution: request.execution, rows: [] };
                node.group = group;
                appendOwned(groups, group);
            }
            groupRow = group.rows.length;
            appendOwned(group.rows, ordinal);
        }
        appendOwned(scheduled, { request, group, groupRow });
    }
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
        const group = groups[groupIndex];
        const proof = requests[group.rows[0]].facts.batchProof;
        if (proof?.kind !== "verified")
            return null;
        group.input = createOwnedClosedFrameInput(proof.sharedInputCount, proof.varyingInputCount, group.rows.length);
    }
    const schedule = createOwnedClosedFrameSchedule();
    for (let rowIndex = 0; rowIndex < scheduled.length; rowIndex++) {
        const row = scheduled[rowIndex];
        const request = row.request;
        if (!request.worldRequest || !request.projectionRequests)
            return null;
        if (!schedule.append(request.worldRequest, request.projectionRequests, row.group?.input ?? null, row.groupRow, !row.group))
            return null;
    }
    if (!schedule.seal())
        return null;
    const worldBatch = captureOwnedClosedWorldInputSchedule(world, schedule);
    if (!worldBatch)
        return { kind: "public-required" };
    if (!readOwnedClosedProjectionSchedule(transaction, schedule))
        return { kind: "public-required" };
    const rows = [];
    const makeRow = (ordinal, source, rowIndex = -1) => {
        const request = scheduled[ordinal].request;
        const worldRow = worldBatch.rows[ordinal];
        if (!worldRow || worldRow.owner !== request.owner ||
            worldRow.cells.length !== request.facts.stateSites.length)
            throw new TypeError("Invalid owned World row");
        const image = rowIndex < 0
            ? { kind: "frame", frame: source }
            : { kind: "page", page: source, rowIndex };
        const row = intrinsicFreeze({ owner: request.owner, lineage: worldRow.lineage,
            cells: worldRow.cells, ...image,
            key: request.facts.retainedChildren ? request.hostKey : request.facts.host.host.key,
            tag: request.facts.host.host.tag,
            ...(request.facts.retainedChildren ? { retainedChildren: true,
                componentOwner: request.owner } : {}),
        });
        ownedClosedOutputRows.add(row);
        intrinsicDefineProperty(rows, ordinal, { value: row, enumerable: true,
            writable: true, configurable: true });
    };
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
        const group = groups[groupIndex];
        const facts = scheduled[group.rows[0]].request.facts;
        const proof = facts.batchProof;
        if (proof?.kind !== "verified" || !group.input)
            return null;
        const page = captureVerifiedOwnedScalarBatch(facts.layout, proof, group.input, group.rows.length, counts);
        for (let index = 0; index < group.rows.length; index++)
            makeRow(group.rows[index], page, index);
    }
    let scratch = null;
    for (let ordinal = 0; ordinal < scheduled.length; ordinal++) {
        const row = scheduled[ordinal];
        if (row.group)
            continue;
        const facts = row.request.facts;
        const worldRow = worldBatch.rows[ordinal];
        const fallbackValues = canonicalOwnedClosedFrameScheduleRowAt.call(schedule, ordinal).fallbackValues;
        if (!worldRow || !fallbackValues ||
            fallbackValues.length !== row.request.inputs.length)
            return null;
        if (!scratch)
            scratch = denseNumericScratch(0);
        growNumericScratch(scratch, facts.valueCount);
        let cursor = 0;
        for (let projection = 0; projection < fallbackValues.length; projection++) {
            const values = fallbackValues[projection];
            for (let valueIndex = 0; valueIndex < values.length; valueIndex++) {
                const value = values[valueIndex];
                if (typeof value !== "number" || !Number.isFinite(value))
                    return null;
                scratch[cursor++] = value;
            }
        }
        for (let cellIndex = 0; cellIndex < worldRow.cells.length; cellIndex++) {
            const cell = worldRow.cells[cellIndex];
            if (typeof cell.value !== "number" || !Number.isFinite(cell.value))
                return null;
            scratch[cursor++] = cell.value;
        }
        if (cursor !== facts.valueCount)
            return null;
        const frame = evaluateOwnedFrame(facts, scratch, counts);
        if (!frame)
            return null;
        makeRow(ordinal, frame);
    }
    return intrinsicFreeze({ kind: "ready", rows: intrinsicFreeze(rows),
        cellCut: worldBatch.cellCut });
};
/** Enclose passive captures and finite evaluation for ordered owned scalar rows. */
export const prepareOwnedClosedStoreOutputs = (world, transaction, orderedRequests, counts) => {
    try {
        const owned = canonicalConsumeOwnedFrameRequests(ownedFrameRequestsKey, orderedRequests);
        return owned ? prepareOwnedFrameSchedule(world, transaction, owned, counts) : null;
    }
    catch {
        return null;
    }
};
//# sourceMappingURL=closed_store_execution.js.map