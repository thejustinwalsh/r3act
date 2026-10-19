import { evaluateClosedNumericExpression, normalizeClosedNumericExpression } from "./closed_numeric_expression.js";
import { CompiledBindings } from "./compiled_bindings.js";
const keyedOwnerRegionTag = Symbol("keyed-owner-region");
const keyedOwnerVersionTag = Symbol("keyed-owner-version");
const keyedOwnerVersions = new WeakSet();
/** Create a trusted version token. Generated code should retain it across reorder-only updates. */
export const createKeyedOwnerVersion = () => {
    const version = Object.freeze({});
    keyedOwnerVersions.add(version);
    return version;
};
/** Compiler hint for a homogeneous keyed component list with stable identities. */
export const keyedOwnerChildren = (regionId, children, version) => {
    if (!regionId)
        throw new Error("Keyed owner region ID must not be empty");
    if (version !== undefined && !keyedOwnerVersions.has(version)) {
        throw new TypeError("Keyed owner version must come from the runtime helper");
    }
    const marked = [...children];
    Object.defineProperty(marked, keyedOwnerRegionTag, { value: regionId });
    if (version !== undefined) {
        Object.defineProperty(marked, keyedOwnerVersionTag, { value: version });
    }
    return marked;
};
export const getKeyedOwnerRegionId = (value) => Array.isArray(value) && keyedOwnerRegionTag in value
    ? value[keyedOwnerRegionTag]
    : null;
export const getKeyedOwnerVersion = (value) => Array.isArray(value) && keyedOwnerVersionTag in value
    ? value[keyedOwnerVersionTag]
    : null;
/** Preserve compiler-owned keyed-region metadata when a runtime maps an array. */
export const copyKeyedOwnerMetadata = (source, target) => {
    const regionId = getKeyedOwnerRegionId(source);
    if (regionId !== null) {
        Object.defineProperty(target, keyedOwnerRegionTag, { value: regionId });
        const version = getKeyedOwnerVersion(source);
        if (version !== null) {
            Object.defineProperty(target, keyedOwnerVersionTag, { value: version });
        }
    }
    return target;
};
export const Fragment = Symbol("jsx-runtime-fragment");
/** Classic JSX factory used by the TSX prototype page. */
export function jsx(type, props, ...children) {
    const next = { ...(props ?? {}) };
    if (children.length === 1)
        next.children = freezeChild(children[0]);
    else if (children.length > 1) {
        next.children = Object.freeze(children.map(freezeChild));
    }
    else if (Array.isArray(next.children)) {
        next.children = Object.freeze(next.children.map(freezeChild));
    }
    Object.freeze(next);
    return Object.freeze({ type, props: next });
}
const freezeChild = (node) => {
    if (!Array.isArray(node))
        return node;
    const frozen = node.map(freezeChild);
    copyKeyedOwnerMetadata(node, frozen);
    return Object.freeze(frozen);
};
export class ScalarSource {
    id;
    value;
    constructor(id, value) {
        this.id = id;
        this.value = value;
    }
}
/** Contiguous per-entity values for a compiler-known trait/source slot. */
export class NumericColumn {
    id;
    sourceSlot;
    values;
    source;
    constructor(id, sourceSlot, values) {
        this.id = id;
        this.sourceSlot = sourceSlot;
        this.values = values;
        this.source = new ScalarSource(id, 0);
    }
    /**
     * Ensure storage for at least `minCapacity` rows. Growth doubles the current
     * capacity (using one slot as the zero-capacity seed), or uses the requested
     * capacity when that is larger. Existing values are copied and the new tail
     * is zero-filled by Float64Array. The column and its source identities stay
     * stable; callers should reserve while activating rows, not during a flush.
     */
    reserve(minCapacity) {
        if (!Number.isSafeInteger(minCapacity) || minCapacity < 0) {
            throw new RangeError("Numeric column capacity must be a nonnegative safe integer");
        }
        const current = this.values;
        if (current.length >= minCapacity)
            return;
        const geometricCapacity = Math.max(1, current.length * 2);
        const next = new Float64Array(Math.max(minCapacity, geometricCapacity));
        next.set(current);
        this.values = next;
    }
}
const bindingTag = Symbol("jsx-runtime-binding");
/** Mark a JSX prop as a scalar source binding, optionally projecting to a host value. */
export const bind = (source, project = ((value) => value)) => ({
    [bindingTag]: true,
    source,
    project,
});
const closedBindings = new WeakMap();
/** Resolve only runtime-created data programs whose callbacks remain intact. */
export const closedExpressionForBinding = (binding) => {
    const capability = closedBindings.get(binding);
    if (!capability)
        return null;
    const data = Object.getOwnPropertyDescriptors(binding);
    const matches = (name, expected) => {
        const descriptor = data[name];
        return descriptor ? "value" in descriptor && descriptor.value === expected
            : expected === undefined;
    };
    return matches("project", capability.project) &&
        matches("read", capability.read) &&
        matches("projectInputs", capability.projectInputs) &&
        matches("sources", capability.sources)
        ? capability.expression : null;
};
/** Bind one prop to several sources; the value is read after a source batch. */
export const bindSources = (sources, derive, numericProgram) => {
    if (sources.length === 0) {
        throw new Error("A derived binding needs at least one source");
    }
    const expression = numericProgram?.closedExpression
        ? normalizeClosedNumericExpression(numericProgram.closedExpression, sources.length)
        : null;
    if (expression) {
        derive = (values) => evaluateClosedNumericExpression(expression, values);
    }
    let read;
    if (numericProgram) {
        // Compiler-proven numeric programs use one stable scratch array per
        // activation. Legacy/manual derived bindings retain fresh-array semantics.
        const inputValues = new Array(sources.length);
        read = () => {
            for (let index = 0; index < sources.length; index++) {
                inputValues[index] = sources[index].value;
            }
            return derive(inputValues);
        };
    }
    else {
        read = () => derive(sources.map((source) => source.value));
    }
    const binding = {
        [bindingTag]: true,
        source: sources[0],
        sources,
        project: expression && sources.length === 1
            ? (value) => evaluateClosedNumericExpression(expression, [value])
            : () => read(),
        read,
        ...(numericProgram?.schemaVersion === 2 ? { projectInputs: derive } : {}),
        ...(numericProgram ? { numericProgram } : {}),
    };
    if (expression)
        closedBindings.set(binding, Object.freeze({
            expression, project: binding.project, read: binding.read,
            projectInputs: binding.projectInputs, sources,
        }));
    return binding;
};
/** A stable tuple binding for vector-like host props such as R3F position. */
export const bindVector3 = (x, y, z) => {
    const tuple = [x.value, y.value, z.value];
    const read = () => {
        tuple[0] = x.value;
        tuple[1] = y.value;
        tuple[2] = z.value;
        return tuple;
    };
    return {
        [bindingTag]: true,
        source: x,
        sources: [x, y, z],
        project: () => read(),
        read,
    };
};
export const readBoundValue = (binding) => binding.read ? binding.read() : binding.project(binding.column
    ? binding.column.values[binding.entityIndex]
    : binding.source.value);
/** Bind with identities emitted by the UI compiler's dependency plan. */
export const bindCompiled = (source, bindingId, sourceSlot, project = ((value) => value)) => ({
    [bindingTag]: true,
    source,
    project,
    bindingId,
    sourceSlot,
});
/** Bind one compiled prop to an entity row in a contiguous numeric column. */
export const bindCompiledColumn = (column, entityIndex, bindingId, project = ((value) => value)) => ({
    [bindingTag]: true,
    source: column.source,
    project,
    bindingId,
    sourceSlot: column.sourceSlot,
    column,
    entityIndex,
});
export const isBoundValue = (value) => typeof value === "object" && value !== null &&
    value[bindingTag] === true;
export const getBoundValue = (value) => isBoundValue(value) ? value : null;
const isNode = (value) => typeof Node !== "undefined" && value instanceof Node;
/**
 * Minimal mount-time JSX binding runtime. JSX is transformed by Vite at build
 * time; this prototype discovers dynamic props while mounting the generated
 * element descriptions, then uses CompiledBindings for subsequent updates.
 * It intentionally has no diffing, keyed updates, refs, or hook semantics.
 */
export const createJSXBindingRuntime = () => {
    const sources = [];
    const nodes = [];
    let graph = null;
    let mountedRoot = null;
    const signal = (initial) => {
        const source = new ScalarSource(sources.length, initial);
        sources.push(source);
        return source;
    };
    const set = (source, value) => {
        if (source.id < 0 || sources[source.id] !== source) {
            throw new Error("Scalar source belongs to another JSX runtime");
        }
        if (Object.is(source.value, value))
            return false;
        source.value = value;
        graph?.set(source.id, value);
        return true;
    };
    const addBinding = (value, write) => {
        if (sources[value.source.id] !== value.source) {
            throw new Error("Binding references a source from another JSX runtime");
        }
        const target = nodes.length;
        nodes.push({ write: (scalar) => write(value.project(scalar)) });
        return [value.source.id, target];
    };
    const setStyle = (element, property, value) => {
        if (property.startsWith("--")) {
            element.style.setProperty(property, String(value));
        }
        else {
            element.style[property] = value == null
                ? ""
                : String(value);
        }
    };
    const setHostProp = (element, property, value) => {
        if (property === "className")
            element.className = String(value ?? "");
        else if (property === "htmlFor") {
            element.htmlFor = String(value ?? "");
        }
        else if (property in element && !property.startsWith("aria-") &&
            !property.startsWith("data-")) {
            element[property] = value;
        }
        else if (value == null || value === false) {
            element.removeAttribute(property);
        }
        else
            element.setAttribute(property, value === true ? "" : String(value));
    };
    const appendChild = (parent, child) => {
        if (child == null || child === false)
            return;
        if (Array.isArray(child)) {
            for (const item of child)
                appendChild(parent, item);
            return;
        }
        if (isNode(child)) {
            parent.appendChild(child);
            return;
        }
        if (typeof child === "string" || typeof child === "number") {
            parent.appendChild(document.createTextNode(String(child)));
            return;
        }
        if (typeof child.type === "function") {
            appendChild(parent, child.type(child.props));
            return;
        }
        if (child.type === Fragment) {
            appendChild(parent, child.props.children);
            return;
        }
        const element = document.createElement(child.type);
        for (const [property, value] of Object.entries(child.props)) {
            if (property === "children" || property === "key" || property === "ref" ||
                value == null)
                continue;
            if (property === "style" && typeof value === "object") {
                for (const [styleProperty, styleValue] of Object.entries(value)) {
                    if (isBoundValue(styleValue)) {
                        const edge = addBinding(styleValue, (next) => setStyle(element, styleProperty, next));
                        edges.push(edge);
                        setStyle(element, styleProperty, styleValue.project(styleValue.source.value));
                    }
                    else
                        setStyle(element, styleProperty, styleValue);
                }
            }
            else if (isBoundValue(value)) {
                const edge = addBinding(value, (next) => setHostProp(element, property, next));
                edges.push(edge);
                setHostProp(element, property, value.project(value.source.value));
            }
            else if (property.startsWith("on") && typeof value === "function") {
                // Native DOM event listeners; no synthetic event layer in this prototype.
                element.addEventListener(property.slice(2).toLowerCase(), value);
            }
            else
                setHostProp(element, property, value);
        }
        appendChild(element, child.props.children);
        parent.appendChild(element);
    };
    let edges = [];
    const mount = (tree, container) => {
        if (graph)
            throw new Error("This runtime instance is already mounted");
        edges = [];
        nodes.length = 0;
        container.replaceChildren();
        appendChild(container, tree);
        mountedRoot = container;
        graph = new CompiledBindings(sources.length, nodes.length, edges);
        for (const source of sources)
            graph.set(source.id, source.value);
        graph.flush((target, value) => nodes[target].write(value), false);
        return {
            get bindingCount() {
                return nodes.length;
            },
            flush() {
                graph?.flush((target, value) => nodes[target].write(value), false);
            },
            dispose() {
                mountedRoot?.replaceChildren();
                mountedRoot = null;
                graph = null;
                edges = [];
                nodes.length = 0;
            },
        };
    };
    return { signal, set, mount };
};
//# sourceMappingURL=jsx_binding_runtime.js.map