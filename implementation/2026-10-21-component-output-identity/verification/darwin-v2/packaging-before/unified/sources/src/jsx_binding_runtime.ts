import { type ClosedNumericExpression, evaluateClosedNumericExpression, normalizeClosedNumericExpression } from "./closed_numeric_expression.ts";
import { type BindingEdge, CompiledBindings } from "./compiled_bindings.ts";
import type { CompiledStateLayout } from "./compiled_state_layout.ts";

export type RuntimeNode =
  | RuntimeElement
  | string
  | number
  | null
  | undefined
  | false
  | RuntimeNode[];
export type ComponentType<P = Record<string, unknown>> = (
  props: P & { children?: RuntimeNode },
) => RuntimeNode;
export type ElementType = string | ComponentType<any> | typeof Fragment;
export type RuntimeElement = {
  type: ElementType;
  props: Record<string, any>;
};

const runtimeOwnedElements = new WeakSet<object>();
const componentOutputOwnerTag = Symbol("component-output-owner");

/** True only for an element and props allocated by the runtime. */
export const isRuntimeOwnedElement = (value: unknown): value is RuntimeElement =>
  typeof value === "object" && value !== null && runtimeOwnedElements.has(value);

const ownRuntimeElement = (element: RuntimeElement): RuntimeElement => {
  runtimeOwnedElements.add(element);
  return element;
};

/** @internal Copy an element into runtime-owned ordinary objects. */
export const copyRuntimeElement = (
  type: ElementType,
  props: Record<string, any>,
  componentOwner?: number,
): RuntimeElement => ownRuntimeElement(Object.freeze({
  type,
  props: Object.freeze(componentOwner === undefined
    ? { ...props } : { ...props, [componentOutputOwnerTag]: componentOwner }),
}));

const keyedOwnerRegionTag = Symbol("keyed-owner-region");
const keyedOwnerVersionTag = Symbol("keyed-owner-version");
const keyedOwnerVersions = new WeakSet<object>();
export type KeyedOwnerChildren = RuntimeNode[] & {
  readonly [keyedOwnerRegionTag]: string;
  readonly [keyedOwnerVersionTag]?: object;
};

/** Opaque compiler/runtime token for an unchanged keyed-region membership and row-data version. */
export type KeyedOwnerVersion = object & {
  readonly __keyedOwnerVersion?: never;
};

/** Create a trusted version token. Generated code should retain it across reorder-only updates. */
export const createKeyedOwnerVersion = (): KeyedOwnerVersion => {
  const version = Object.freeze({});
  keyedOwnerVersions.add(version);
  return version as KeyedOwnerVersion;
};

/** Compiler hint for a homogeneous keyed component list with stable identities. */
export const keyedOwnerChildren = (
  regionId: string,
  children: RuntimeNode[],
  version?: KeyedOwnerVersion,
): KeyedOwnerChildren => {
  if (!regionId) throw new Error("Keyed owner region ID must not be empty");
  if (version !== undefined && !keyedOwnerVersions.has(version)) {
    throw new TypeError(
      "Keyed owner version must come from the runtime helper",
    );
  }
  const marked = [...children] as KeyedOwnerChildren;
  Object.defineProperty(marked, keyedOwnerRegionTag, { value: regionId });
  if (version !== undefined) {
    Object.defineProperty(marked, keyedOwnerVersionTag, { value: version });
  }
  return marked;
};

export const getKeyedOwnerRegionId = (value: RuntimeNode): string | null =>
  Array.isArray(value) && keyedOwnerRegionTag in value
    ? (value as KeyedOwnerChildren)[keyedOwnerRegionTag]
    : null;

export const getKeyedOwnerVersion = (
  value: RuntimeNode,
): KeyedOwnerVersion | null =>
  Array.isArray(value) && keyedOwnerVersionTag in value
    ? (value as KeyedOwnerChildren)[keyedOwnerVersionTag] as KeyedOwnerVersion
    : null;

/** Preserve compiler-owned keyed-region metadata when a runtime maps an array. */
export const copyKeyedOwnerMetadata = <T extends RuntimeNode[]>(
  source: RuntimeNode,
  target: T,
): T => {
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

/** @internal Attach the current owner incarnation to one component output root. */
export const stampComponentOutput = (
  node: RuntimeNode, owner: number, key?: string,
): RuntimeNode => {
  if (typeof node === "string" || typeof node === "number") {
    return copyRuntimeElement(Fragment, { children: node, key }, owner);
  }
  if (isRuntimeOwnedElement(node) && typeof node.type === "string") {
    return copyRuntimeElement(node.type, node.props, owner);
  }
  return node;
};

/** @internal Read only an owner stamp on a runtime-owned output root. */
export const getComponentOutputOwner = (node: RuntimeElement): number | undefined => {
  if (!isRuntimeOwnedElement(node)) return undefined;
  if (typeof node.type !== "string" &&
    !(node.type === Fragment &&
      (typeof node.props.children === "string" ||
        typeof node.props.children === "number"))) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(node.props, componentOutputOwnerTag);
  return descriptor && "value" in descriptor && Number.isSafeInteger(descriptor.value)
    ? descriptor.value as number : undefined;
};

/** Classic JSX factory used by the TSX prototype page. */
export function jsx(
  type: ElementType,
  props: Record<string, any> | null,
  ...children: RuntimeNode[]
): RuntimeElement {
  const next = { ...(props ?? {}) };
  if (children.length === 1) next.children = freezeChild(children[0]);
  else if (children.length > 1) {
    next.children = Object.freeze(children.map(freezeChild));
  } else if (Array.isArray(next.children)) {
    next.children = Object.freeze(next.children.map(freezeChild));
  }
  Object.freeze(next);
  const element = Object.freeze({ type, props: next });
  return ownRuntimeElement(element);
}

const freezeChild = (node: RuntimeNode): RuntimeNode => {
  if (!Array.isArray(node)) return node;
  const frozen = node.map(freezeChild);
  copyKeyedOwnerMetadata(node, frozen);
  return Object.freeze(frozen) as RuntimeNode[];
};

export class ScalarSource {
  readonly #owned = true;
  constructor(readonly id: number, public value: number) {}

  static canonicalValue(source: ScalarSource): number | undefined {
    if (typeof source !== "object" || source === null || !(#owned in source)) return undefined;
    const descriptor = Object.getOwnPropertyDescriptor(source, "value");
    return descriptor && "value" in descriptor && typeof descriptor.value === "number"
      ? descriptor.value : undefined;
  }
}
const canonicalScalarValue = ScalarSource.canonicalValue;

/** Read only a runtime-created scalar's own data value, without caller getters. */
export const canonicalScalarSourceValue = (source: ScalarSource): number | null =>
  canonicalScalarValue.call(ScalarSource, source) ?? null;

/** Legacy compiler proof for a fixed numeric source program. */
export type NumericBindingProgramDescriptorV1 = Readonly<{
  schemaVersion: 1;
  sinkId: string;
  sourceSites: readonly string[];
  closedExpression?: ClosedNumericExpression;
}>;

/** Owner-scoped compiler proof for an authored numeric sink. */
export type NumericBindingProgramDescriptorV2 = Readonly<{
  schemaVersion: 2;
  ownerProgramId: string;
  sinkId: string;
  sourceSites: readonly string[];
  closedExpression?: ClosedNumericExpression;
}>;

/** Compiler proof that a binding is a fixed numeric source program. */
export type NumericBindingProgramDescriptor =
  | NumericBindingProgramDescriptorV1
  | NumericBindingProgramDescriptorV2;

/** Immutable owner/layout association for a compiled sink; contains no runtime handles. */
export type NumericOwnerBinding = Readonly<{
  owner: number;
  programId: string;
  layout: CompiledStateLayout;
  sourceSlots: readonly number[];
}>;

/** Contiguous per-entity values for a compiler-known trait/source slot. */
export class NumericColumn {
  readonly source: ScalarSource;
  constructor(
    readonly id: number,
    readonly sourceSlot: number,
    public values: Float64Array,
  ) {
    this.source = new ScalarSource(id, 0);
  }

  /**
   * Ensure storage for at least `minCapacity` rows. Growth doubles the current
   * capacity (using one slot as the zero-capacity seed), or uses the requested
   * capacity when that is larger. Existing values are copied and the new tail
   * is zero-filled by Float64Array. The column and its source identities stay
   * stable; callers should reserve while activating rows, not during a flush.
   */
  reserve(minCapacity: number): void {
    if (!Number.isSafeInteger(minCapacity) || minCapacity < 0) {
      throw new RangeError("Numeric column capacity must be a nonnegative safe integer");
    }
    const current = this.values;
    if (current.length >= minCapacity) return;
    const geometricCapacity = Math.max(1, current.length * 2);
    const next = new Float64Array(Math.max(minCapacity, geometricCapacity));
    next.set(current);
    this.values = next;
  }
}

const bindingTag = Symbol("jsx-runtime-binding");
export type BoundValue<T = unknown> = {
  readonly [bindingTag]: true;
  readonly source: ScalarSource;
  /** Additional dependencies for a derived prop. Scalar bindings omit this. */
  readonly sources?: readonly ScalarSource[];
  readonly project: (value: number) => T;
  /** Read a derived value from all current sources. May return a stable object. */
  readonly read?: () => T;
  /** OXC-emitted identity for compiled dispatch; absent on runtime-discovered bindings. */
  readonly bindingId?: number;
  /** Slot in the compiled source table for this repeated-host scope. */
  readonly sourceSlot?: number;
  /** Entity row for a columnar compiled binding. */
  readonly column?: NumericColumn;
  readonly entityIndex?: number;
  /** Optional compiler-owned numeric program identity and fixed source shape. */
  readonly numericProgram?: NumericBindingProgramDescriptor;
  /** Optional owner-row association for a matching compiler-v2 program. */
  readonly numericOwner?: NumericOwnerBinding;
  /** Multi-source authored projector, exposed without wrapping or coercion. */
  readonly projectInputs?: (values: readonly number[]) => unknown;
};

/** Mark a JSX prop as a scalar source binding, optionally projecting to a host value. */
export const bind = <T = number>(
  source: ScalarSource,
  project: (value: number) => T = ((value) => value as T),
): BoundValue<T> => ownBinding({
  [bindingTag]: true,
  source,
  project,
});

/** @internal Build an owned generic state binding without granting closed-expression proof. */
export const bindStateSource = <T>(
  source: ScalarSource, project: (value: number) => T,
  numericProgram?: NumericBindingProgramDescriptor,
): BoundValue<T> => {
  const sources = [source];
  return ownBinding({
    [bindingTag]: true, source, project, sources,
    read: () => project(sources[0].value),
    ...(numericProgram ? { numericProgram } : {}),
  });
};

type ClosedBindingCapability = {
  expression: ClosedNumericExpression | null;
  project: BoundValue["project"];
  read: BoundValue["read"];
  projectInputs: BoundValue["projectInputs"];
  sources: ScalarSource[] | null;
  sourceSnapshot: readonly ScalarSource[];
};
const closedBindings = new WeakMap<object, ClosedBindingCapability>();
const ownBinding = <T>(binding: BoundValue<T>, expression: ClosedNumericExpression | null = null): BoundValue<T> => {
  closedBindings.set(binding, {
    expression, project: binding.project, read: binding.read,
    projectInputs: binding.projectInputs,
    sources: binding.sources as ScalarSource[] | undefined ?? null,
    sourceSnapshot: Object.freeze([...(binding.sources ?? [binding.source])]),
  });
  return binding;
};

const capturedBindingCurrent = (binding: BoundValue): boolean => {
  const capability = closedBindings.get(binding);
  if (!capability) return false;
  const data = Object.getOwnPropertyDescriptors(binding);
  const matches = (name: string, expected: unknown) => {
    const descriptor = data[name];
    return descriptor ? "value" in descriptor && descriptor.value === expected
      : expected === undefined;
  };
  if (!matches("project", capability.project) || !matches("read", capability.read) ||
    !matches("projectInputs", capability.projectInputs) ||
    !matches("sources", capability.sources ?? undefined) ||
    !matches("source", capability.sourceSnapshot[0])) return false;
  if (capability.sources) {
    if (capability.sources.length !== capability.sourceSnapshot.length) return false;
    for (let index = 0; index < capability.sourceSnapshot.length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(capability.sources, String(index));
      if (!descriptor || !("value" in descriptor) ||
        descriptor.value !== capability.sourceSnapshot[index]) return false;
    }
  }
  return true;
};

/** @internal Check whether a captured binding can take canonical sources without getters. */
export const canRebindCapturedBindingSources = (
  binding: BoundValue,
  canonical: readonly ScalarSource[],
): boolean => {
  const capability = closedBindings.get(binding);
  if (!capability || canonical.length !== capability.sourceSnapshot.length ||
    !capturedBindingCurrent(binding)) return false;
  const source = Object.getOwnPropertyDescriptor(binding, "source")!;
  if (source.value !== canonical[0] && !source.writable) return false;
  if (capability.sources) for (let index = 0; index < canonical.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(capability.sources, String(index))!;
    if (descriptor.value !== canonical[index] && !descriptor.writable) return false;
  }
  return true;
};

/** Resolve only runtime-created data programs whose callbacks remain intact. */
export const closedExpressionForBinding = (
  binding: BoundValue,
): ClosedNumericExpression | null => {
  const capability = closedBindings.get(binding);
  if (!capability?.expression) return null;
  return capturedBindingCurrent(binding)
    ? capability.expression : null;
};

/** @internal Return only the validated runtime-owned source array. */
export const canonicalCapturedBindingSourceArray = (
  binding: BoundValue,
): readonly ScalarSource[] | null => {
  const capability = closedBindings.get(binding);
  return capability?.sources &&
      capturedBindingCurrent(binding)
    ? capability.sources : null;
};

/** @internal Rebind a runtime-owned closed binding without invoking authored setters. */
export const rebindCapturedBindingSources = (
  binding: BoundValue,
  canonical: readonly ScalarSource[],
): boolean => {
  const capability = closedBindings.get(binding);
  if (!capability || !canRebindCapturedBindingSources(binding, canonical)) return false;
  if (capability.sources) for (let index = 0; index < canonical.length; index++) {
    if (capability.sources[index] !== canonical[index]) {
      capability.sources[index] = canonical[index];
    }
  }
  if (binding.source !== canonical[0]) {
    (binding as { source: ScalarSource }).source = canonical[0];
  }
  capability.sourceSnapshot = Object.freeze([...canonical]);
  return true;
};

/** Bind one prop to several sources; the value is read after a source batch. */
export const bindSources = <T>(
  sources: readonly ScalarSource[],
  derive: (values: readonly number[]) => T,
  numericProgram?: NumericBindingProgramDescriptor,
): BoundValue<T> => {
  if (sources.length === 0) {
    throw new Error("A derived binding needs at least one source");
  }
  const expression = numericProgram?.closedExpression
    ? normalizeClosedNumericExpression(numericProgram.closedExpression, sources.length)
    : null;
  if (expression) {
    derive = (values) => evaluateClosedNumericExpression(expression, values) as T;
  }
  const boundSources = [...sources];
  let read: () => T;
  if (numericProgram) {
    // Compiler-proven numeric programs use one stable scratch array per
    // activation. Legacy/manual derived bindings retain fresh-array semantics.
    const inputValues = new Array<number>(boundSources.length);
    read = () => {
      for (let index = 0; index < boundSources.length; index++) {
        inputValues[index] = boundSources[index].value;
      }
      return derive(inputValues);
    };
  } else {
    read = () => derive(boundSources.map((source) => source.value));
  }
  const binding: BoundValue<T> = {
    [bindingTag]: true,
    source: boundSources[0],
    sources: boundSources,
    project: expression && boundSources.length === 1
      ? (value) => evaluateClosedNumericExpression(expression, [value]) as T
      : () => read(),
    read,
    ...(numericProgram?.schemaVersion === 2 ? { projectInputs: derive } : {}),
    ...(numericProgram ? { numericProgram } : {}),
  };
  return ownBinding(binding, expression);
};

/** A stable tuple binding for vector-like host props such as R3F position. */
export const bindVector3 = (
  x: ScalarSource,
  y: ScalarSource,
  z: ScalarSource,
): BoundValue<[number, number, number]> => {
  const tuple: [number, number, number] = [x.value, y.value, z.value];
  const sources = [x, y, z];
  const read = () => {
    tuple[0] = sources[0].value;
    tuple[1] = sources[1].value;
    tuple[2] = sources[2].value;
    return tuple;
  };
  return ownBinding({
    [bindingTag]: true,
    source: x,
    sources,
    project: () => read(),
    read,
  });
};

export const readBoundValue = <T>(binding: BoundValue<T>): T =>
  binding.read ? binding.read() : binding.project(
    binding.column
      ? binding.column.values[binding.entityIndex!]
      : binding.source.value,
  );

/** Bind with identities emitted by the UI compiler's dependency plan. */
export const bindCompiled = <T = number>(
  source: ScalarSource,
  bindingId: number,
  sourceSlot: number,
  project: (value: number) => T = ((value) => value as T),
): BoundValue<T> => ownBinding({
  [bindingTag]: true,
  source,
  project,
  bindingId,
  sourceSlot,
});

/** Bind one compiled prop to an entity row in a contiguous numeric column. */
export const bindCompiledColumn = <T = number>(
  column: NumericColumn,
  entityIndex: number,
  bindingId: number,
  project: (value: number) => T = ((value) => value as T),
): BoundValue<T> => ({
  [bindingTag]: true,
  source: column.source,
  project,
  bindingId,
  sourceSlot: column.sourceSlot,
  column,
  entityIndex,
});

export const isBoundValue = (value: unknown): value is BoundValue =>
  typeof value === "object" && value !== null &&
  (value as BoundValue)[bindingTag] === true;

export const getBoundValue = (value: unknown): BoundValue | null =>
  isBoundValue(value) ? value : null;

const isNode = (value: unknown): value is Node =>
  typeof Node !== "undefined" && value instanceof Node;

export interface MountedRuntime {
  flush(): void;
  dispose(): void;
  readonly bindingCount: number;
}

/**
 * Minimal mount-time JSX binding runtime. JSX is transformed by Vite at build
 * time; this prototype discovers dynamic props while mounting the generated
 * element descriptions, then uses CompiledBindings for subsequent updates.
 * It intentionally has no diffing, keyed updates, refs, or hook semantics.
 */
export const createJSXBindingRuntime = () => {
  const sources: ScalarSource[] = [];
  const nodes: Array<{ write(value: number): void }> = [];
  let graph: CompiledBindings | null = null;
  let mountedRoot: HTMLElement | null = null;

  const signal = (initial: number) => {
    const source = new ScalarSource(sources.length, initial);
    sources.push(source);
    return source;
  };

  const set = (source: ScalarSource, value: number) => {
    if (source.id < 0 || sources[source.id] !== source) {
      throw new Error("Scalar source belongs to another JSX runtime");
    }
    if (Object.is(source.value, value)) return false;
    source.value = value;
    graph?.set(source.id, value);
    return true;
  };

  const addBinding = (value: BoundValue, write: (value: unknown) => void) => {
    if (sources[value.source.id] !== value.source) {
      throw new Error("Binding references a source from another JSX runtime");
    }
    const target = nodes.length;
    nodes.push({ write: (scalar) => write(value.project(scalar)) });
    return [value.source.id, target] as const satisfies BindingEdge;
  };

  const setStyle = (element: HTMLElement, property: string, value: unknown) => {
    if (property.startsWith("--")) {
      element.style.setProperty(property, String(value));
    } else {(element.style as any)[property] = value == null
        ? ""
        : String(value);}
  };

  const setHostProp = (
    element: HTMLElement,
    property: string,
    value: unknown,
  ) => {
    if (property === "className") element.className = String(value ?? "");
    else if (property === "htmlFor") {
      (element as HTMLLabelElement).htmlFor = String(value ?? "");
    } else if (
      property in element && !property.startsWith("aria-") &&
      !property.startsWith("data-")
    ) {
      (element as any)[property] = value;
    } else if (value == null || value === false) {
      element.removeAttribute(property);
    } else element.setAttribute(property, value === true ? "" : String(value));
  };

  const appendChild = (parent: Node, child: RuntimeNode): void => {
    if (child == null || child === false) return;
    if (Array.isArray(child)) {
      for (const item of child) appendChild(parent, item);
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
      if (
        property === "children" || property === "key" || property === "ref" ||
        value == null
      ) continue;
      if (property === "style" && typeof value === "object") {
        for (const [styleProperty, styleValue] of Object.entries(value)) {
          if (isBoundValue(styleValue)) {
            const edge = addBinding(
              styleValue,
              (next) => setStyle(element, styleProperty, next),
            );
            edges.push(edge);
            setStyle(
              element,
              styleProperty,
              styleValue.project(styleValue.source.value),
            );
          } else setStyle(element, styleProperty, styleValue);
        }
      } else if (isBoundValue(value)) {
        const edge = addBinding(
          value,
          (next) => setHostProp(element, property, next),
        );
        edges.push(edge);
        setHostProp(element, property, value.project(value.source.value));
      } else if (property.startsWith("on") && typeof value === "function") {
        // Native DOM event listeners; no synthetic event layer in this prototype.
        element.addEventListener(property.slice(2).toLowerCase(), value);
      } else setHostProp(element, property, value);
    }
    appendChild(element, child.props.children);
    parent.appendChild(element);
  };

  let edges: BindingEdge[] = [];

  const mount = (tree: RuntimeNode, container: HTMLElement): MountedRuntime => {
    if (graph) throw new Error("This runtime instance is already mounted");
    edges = [];
    nodes.length = 0;
    container.replaceChildren();
    appendChild(container, tree);
    mountedRoot = container;
    graph = new CompiledBindings(sources.length, nodes.length, edges);
    for (const source of sources) graph.set(source.id, source.value);
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

declare global {
  namespace JSX {
    type ElementType = string | ComponentType<any> | typeof Fragment;
    type Element = RuntimeElement;
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicElements {
      [name: string]: any;
    }
  }
}
