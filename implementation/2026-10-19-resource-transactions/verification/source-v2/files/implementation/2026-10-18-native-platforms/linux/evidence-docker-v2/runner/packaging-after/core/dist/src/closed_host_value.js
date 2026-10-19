import { evaluateClosedNumericExpression, normalizeClosedNumericExpression, } from "./closed_numeric_expression.js";
import { isSafeClosedStyleName } from "./scoped_host_values.js";
export const closedDataRecord = (input) => {
    if (typeof input !== "object" || input === null || Array.isArray(input))
        return null;
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null)
        return null;
    const descriptors = Object.getOwnPropertyDescriptors(input);
    if (Reflect.ownKeys(input).length !== Object.keys(descriptors).length)
        return null;
    const copy = Object.create(null);
    for (const [key, descriptor] of Object.entries(descriptors)) {
        if (!("value" in descriptor))
            return null;
        copy[key] = descriptor.value;
    }
    return copy;
};
export const exactClosedFields = (value, keys) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
export const closedDataArray = (input, limit = 32) => {
    if (!Array.isArray(input) || input.length > limit)
        return null;
    const descriptors = Object.getOwnPropertyDescriptors(input);
    if (Reflect.ownKeys(input).length !== input.length + 1 ||
        Object.keys(descriptors).length !== input.length + 1)
        return null;
    const copy = [];
    for (let index = 0; index < input.length; index++) {
        const descriptor = descriptors[index];
        if (!descriptor || !("value" in descriptor))
            return null;
        copy.push(descriptor.value);
    }
    return copy;
};
export const isClosedHostPrimitive = (value) => value === null || typeof value === "string" || typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value));
export const isClosedHostPropertyName = (tag, name) => {
    if (name === "key" || name === "children" || name === "ref" || name === "style" ||
        name === "__proto__" || name === "prototype" || name === "constructor" ||
        name.startsWith("on"))
        return false;
    if (tag === "div" || tag === "span" || tag === "output") {
        return /^data-[a-z][a-z0-9-]*$/.test(name);
    }
    return name === "name" || name === "visible" ||
        /^(position|rotation|scale)-[xyz]$/.test(name);
};
/** Normalize one compiler-proven primitive or aggregate host prop from descriptor data. */
export const normalizeClosedHostValue = (input, tag, name, inputCount, allowAggregates) => {
    try {
        if (allowAggregates && typeof input === "object" && input !== null) {
            const aggregate = closedDataRecord(input);
            if (!aggregate)
                return null;
            if (aggregate.kind === "tuple") {
                if ((tag !== "group" && tag !== "mesh") ||
                    (name !== "position" && name !== "rotation" && name !== "scale") ||
                    !exactClosedFields(aggregate, ["kind", "items"]))
                    return null;
                const items = closedDataArray(aggregate.items, 3);
                if (!items || items.length !== 3)
                    return null;
                const first = normalizeClosedNumericExpression(items[0], inputCount);
                const second = normalizeClosedNumericExpression(items[1], inputCount);
                const third = normalizeClosedNumericExpression(items[2], inputCount);
                return first && second && third
                    ? Object.freeze({ kind: "tuple", items: Object.freeze([first, second, third]) })
                    : null;
            }
            if (aggregate.kind === "style") {
                if ((tag !== "div" && tag !== "span" && tag !== "output") ||
                    name !== "style" || !exactClosedFields(aggregate, ["kind", "entries"]))
                    return null;
                const rawEntries = closedDataArray(aggregate.entries, 32);
                if (!rawEntries)
                    return null;
                const entries = [];
                const seen = new Set();
                for (const raw of rawEntries) {
                    const pair = closedDataArray(raw, 2);
                    if (!pair || pair.length !== 2 || typeof pair[0] !== "string" ||
                        !isSafeClosedStyleName(pair[0]) || seen.has(pair[0]))
                        return null;
                    const expression = normalizeClosedNumericExpression(pair[1], inputCount);
                    if (!expression)
                        return null;
                    seen.add(pair[0]);
                    entries.push(Object.freeze([pair[0], expression]));
                }
                return Object.freeze({ kind: "style", entries: Object.freeze(entries) });
            }
        }
        return isClosedHostPropertyName(tag, name)
            ? normalizeClosedNumericExpression(input, inputCount) : null;
    }
    catch {
        return null;
    }
};
/** Evaluate into a fresh value owned by this candidate; undefined means unsupported output. */
export const evaluateClosedHostValue = (expression, inputs) => {
    if (expression.kind === "tuple") {
        const values = expression.items.map((item) => evaluateClosedNumericExpression(item, inputs));
        if (values.some((value) => typeof value !== "number" || !Number.isFinite(value)))
            return undefined;
        return Object.freeze(values);
    }
    if (expression.kind === "style") {
        const style = Object.create(null);
        for (const [name, item] of expression.entries) {
            const value = evaluateClosedNumericExpression(item, inputs);
            if (value !== null && typeof value !== "string" &&
                !(typeof value === "number" && Number.isFinite(value)))
                return undefined;
            style[name] = value;
        }
        return Object.freeze(style);
    }
    const value = evaluateClosedNumericExpression(expression, inputs);
    return isClosedHostPrimitive(value) ? value : undefined;
};
/** Compiler-only: freeze a fresh, unescaped tuple literal proven by the compiler. This is not a purity proof for arbitrary arrays. */
export const stabilizeHostTuple = (value) => Object.freeze(value);
//# sourceMappingURL=closed_host_value.js.map