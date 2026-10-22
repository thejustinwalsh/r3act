import { evaluateClosedHostTree, normalizeClosedHostTree, } from "./closed_host_tree.js";
import { closedDataArray, closedDataRecord, exactClosedFields, } from "./closed_host_value.js";
import { copyRuntimeElement } from "./jsx_binding_runtime.js";
import { captureClosedProjectionValues } from "./owned_store_record.js";
const safePathSegment = (part) => typeof part === "string" && /^[A-Za-z_$][\w$]*$/.test(part) &&
    part !== "__proto__" && part !== "constructor" && part !== "prototype";
/** Snapshot a compiler row template without retaining mutable metadata objects. */
export const normalizeClosedCollectionRowProgram = (raw) => {
    try {
        const value = closedDataRecord(raw);
        if (!value || !exactClosedFields(value, [
            "schemaVersion", "collectionSiteId", "componentProgramId",
            "rowComponentProgramId", "moduleRevision", "rowComponent", "rowProp",
            "inputs", "host",
        ]) || value.schemaVersion !== 1 || value.rowProp !== "row" ||
            typeof value.rowComponent !== "function")
            return null;
        for (const name of [
            "collectionSiteId", "componentProgramId", "rowComponentProgramId",
            "moduleRevision",
        ])
            if (typeof value[name] !== "string" || !value[name])
                return null;
        const rawInputs = closedDataArray(value.inputs, 32);
        if (!rawInputs || rawInputs.length === 0)
            return null;
        const inputs = [];
        const seen = new Set();
        for (const rawInput of rawInputs) {
            const input = closedDataRecord(rawInput);
            if (!input || !exactClosedFields(input, ["path"]))
                return null;
            const path = closedDataArray(input.path, 8);
            if (!path || path.length === 0 || !path.every(safePathSegment))
                return null;
            const identity = JSON.stringify(path);
            if (seen.has(identity))
                return null;
            seen.add(identity);
            inputs.push(Object.freeze({ path: Object.freeze(path) }));
        }
        const rawHost = closedDataRecord(value.host);
        if (!rawHost || !exactClosedFields(rawHost, ["tag", "key", "props", "children"]) ||
            rawHost.key !== null)
            return null;
        const host = normalizeClosedHostTree({ ...rawHost, key: "@closed-row-root" }, inputs.length, true, 32);
        if (!host || host.children.some((child) => child.kind === "host"))
            return null;
        return Object.freeze({
            schemaVersion: 1,
            collectionSiteId: value.collectionSiteId,
            componentProgramId: value.componentProgramId,
            rowComponentProgramId: value.rowComponentProgramId,
            moduleRevision: value.moduleRevision,
            rowComponent: value.rowComponent,
            rowProp: "row",
            inputs: Object.freeze(inputs),
            host,
        });
    }
    catch {
        return null;
    }
};
/** Admit only creator-owned immutable row records with finite numeric paths. */
export const captureClosedCollectionRowInputs = (program, row) => captureClosedProjectionValues(row, program.inputs.map((input) => input.path));
/** Build an unkeyed intrinsic root; the existing owner scope assigns its key. */
export const evaluateClosedCollectionRowProgram = (program, inputs) => {
    const result = evaluateClosedHostTree(program.host, inputs);
    if (!result)
        return null;
    return copyRuntimeElement(result.type, { ...result.props, key: undefined });
};
//# sourceMappingURL=closed_collection_row_program.js.map