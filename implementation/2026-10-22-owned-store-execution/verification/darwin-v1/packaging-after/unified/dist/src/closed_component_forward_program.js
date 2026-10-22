import { closedDataArray, closedDataRecord, exactClosedFields, isClosedHostPrimitive } from "./closed_host_value.js";
const record = closedDataRecord;
const exact = exactClosedFields;
const array = closedDataArray;
const safeName = (name) => typeof name === "string" && /^[A-Za-z_$][\w$]*$/.test(name) &&
    name !== "key" && name !== "ref" && name !== "children" &&
    name !== "__proto__" && name !== "constructor" && name !== "prototype";
/** Snapshot untrusted compiler metadata without invoking either component. */
export const normalizeClosedComponentForwardProgram = (input) => {
    try {
        const root = record(input);
        if (!root || !exact(root, ["schemaVersion", "componentProgramId", "moduleRevision",
            "childComponentProgramId", "childComponent", "key", "props"]) ||
            root.schemaVersion !== 1 ||
            typeof root.componentProgramId !== "string" || root.componentProgramId.length === 0 ||
            typeof root.moduleRevision !== "string" || root.moduleRevision.length === 0 ||
            typeof root.childComponentProgramId !== "string" || root.childComponentProgramId.length === 0 ||
            typeof root.childComponent !== "function" ||
            (root.key !== null && (typeof root.key !== "string" || root.key.length === 0)))
            return null;
        const rawProps = array(root.props, 32);
        if (!rawProps)
            return null;
        const props = [];
        const seen = new Set();
        for (const rawProp of rawProps) {
            const pair = array(rawProp, 2);
            if (!pair || pair.length !== 2 || !safeName(pair[0]) || seen.has(pair[0]))
                return null;
            const rawExpression = record(pair[1]);
            if (!rawExpression)
                return null;
            let expression;
            if (rawExpression.kind === "prop" && exact(rawExpression, ["kind", "name"]) &&
                safeName(rawExpression.name)) {
                expression = Object.freeze({ kind: "prop", name: rawExpression.name });
            }
            else if (rawExpression.kind === "literal" && exact(rawExpression, ["kind", "value"]) &&
                isClosedHostPrimitive(rawExpression.value)) {
                expression = Object.freeze({ kind: "literal", value: rawExpression.value });
            }
            else
                return null;
            seen.add(pair[0]);
            props.push(Object.freeze([pair[0], expression]));
        }
        return Object.freeze({
            schemaVersion: 1,
            componentProgramId: root.componentProgramId,
            moduleRevision: root.moduleRevision,
            childComponentProgramId: root.childComponentProgramId,
            childComponent: root.childComponent,
            key: root.key,
            props: Object.freeze(props),
        });
    }
    catch {
        return null;
    }
};
//# sourceMappingURL=closed_component_forward_program.js.map