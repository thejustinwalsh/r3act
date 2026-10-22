import { closedDataArray, closedDataRecord, evaluateClosedHostValue, exactClosedFields, isClosedHostPrimitive, } from "./closed_host_value.js";
import { closedStoreHostValueCount, isNormalizedClosedStoreHostProgram, } from "./closed_store_host_program.js";
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
        associations.set(normalized, host);
        return normalized;
    }
    catch {
        return null;
    }
};
/** Evaluate only privately associated, finite numeric inputs into candidate-owned props. */
export const evaluateClosedStoreDataExecution = (execution, numericValues) => {
    try {
        const host = typeof execution === "object" && execution !== null
            ? associations.get(execution) : undefined;
        if (!host)
            return null;
        const values = closedDataArray(numericValues);
        if (!values || values.length !== closedStoreHostValueCount(host) ||
            values.some((value) => typeof value !== "number" || !Number.isFinite(value)))
            return null;
        const props = [];
        for (const [name, expression] of host.host.props) {
            const value = evaluateClosedHostValue(expression, values);
            if (!isClosedHostPrimitive(value))
                return null;
            props.push(Object.freeze([name, value]));
        }
        return Object.freeze(props);
    }
    catch {
        return null;
    }
};
//# sourceMappingURL=closed_store_execution.js.map