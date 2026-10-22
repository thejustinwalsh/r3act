import { evaluateClosedNumericExpression, normalizeClosedNumericExpression } from "./closed_numeric_expression.js";
import { jsx } from "./jsx_binding_runtime.js";
import { closedDataArray, closedDataRecord, evaluateClosedHostValue, exactClosedFields, isClosedHostPrimitive, normalizeClosedHostValue, } from "./closed_host_value.js";
/** Copy a finite host tree from untrusted descriptor data into frozen compiler metadata. */
export const normalizeClosedHostTree = (input, inputCount, allowAggregates, maximumInputs = 8) => {
    if (!Number.isSafeInteger(maximumInputs) || maximumInputs < 1 || maximumInputs > 32 ||
        !Number.isSafeInteger(inputCount) || inputCount < 1 || inputCount > maximumInputs)
        return null;
    const active = new Set();
    const keys = new Set();
    let nodes = 0;
    const visit = (raw, depth) => {
        if (depth > 32 || ++nodes > 256 || typeof raw !== "object" || raw === null || active.has(raw))
            return null;
        active.add(raw);
        try {
            const host = closedDataRecord(raw);
            if (!host || !exactClosedFields(host, ["tag", "key", "props", "children"]) ||
                !["div", "span", "output", "group", "mesh"].includes(host.tag) ||
                typeof host.key !== "string" || host.key.length === 0 || keys.has(host.key))
                return null;
            const tag = host.tag;
            keys.add(host.key);
            const rawProps = closedDataArray(host.props);
            const rawChildren = closedDataArray(host.children, 256);
            if (!rawProps || !rawChildren)
                return null;
            const props = [];
            const names = new Set();
            for (const rawPair of rawProps) {
                const pair = closedDataArray(rawPair, 2);
                if (!pair || pair.length !== 2 || typeof pair[0] !== "string" || names.has(pair[0]))
                    return null;
                const expression = normalizeClosedHostValue(pair[1], tag, pair[0], inputCount, allowAggregates);
                if (!expression)
                    return null;
                names.add(pair[0]);
                props.push(Object.freeze([pair[0], expression]));
            }
            const children = [];
            for (const rawChild of rawChildren) {
                const child = closedDataRecord(rawChild);
                if (!child)
                    return null;
                if (child.kind === "host" && exactClosedFields(child, ["kind", "host"])) {
                    const nested = visit(child.host, depth + 1);
                    if (!nested)
                        return null;
                    children.push(Object.freeze({ kind: "host", host: nested }));
                }
                else if (child.kind === "text" && exactClosedFields(child, ["kind", "expression"])) {
                    if (++nodes > 256)
                        return null;
                    const expression = normalizeClosedNumericExpression(child.expression, inputCount);
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
/** Build candidate-owned JSX values from a frozen host tree. */
export const evaluateClosedHostTree = (host, inputs, requireTextNode = false) => {
    const construct = (node) => {
        const props = { key: node.key };
        for (const [name, expression] of node.props) {
            const value = evaluateClosedHostValue(expression, inputs);
            if (value === undefined)
                return null;
            props[name] = value;
        }
        const children = [];
        for (const child of node.children) {
            if (child.kind === "host") {
                const nested = construct(child.host);
                if (!nested)
                    return null;
                children.push(nested);
            }
            else {
                const value = evaluateClosedNumericExpression(child.expression, inputs);
                if (!isClosedHostPrimitive(value) || value === true ||
                    (requireTextNode && typeof value !== "string" && typeof value !== "number"))
                    return null;
                children.push(value);
            }
        }
        return jsx(node.tag, props, ...children);
    };
    return construct(host);
};
//# sourceMappingURL=closed_host_tree.js.map