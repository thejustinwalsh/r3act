import {
  Fragment,
  getBoundValue,
  getKeyedOwnerRegionId,
  type NumericColumn,
  readBoundValue,
  type RuntimeElement,
  type RuntimeNode,
  type ScalarSource,
} from "./jsx_binding_runtime.ts";
import { KeyedRegionBuckets } from "./keyed_region_buckets.ts";

type VText = { kind: "text"; text: string; key: string | null };
type VElement = {
  kind: "element";
  tag: string;
  key: string | null;
  props: Readonly<Record<string, unknown>>;
  children: readonly VNode[];
  keyedRegionId: string | null;
};
type VNode = VText | VElement;

type MountedNode<H> = {
  vnode: VNode;
  handle: H;
  /** Set before invoking host.dispose so a failed terminal removal is not retried. */
  hostDisposed?: boolean;
  children: MountedNode<H>[];
  /** Stable writer handles used for constant-time sparse structural detach. */
  scalarBindingGroups?: Map<string, BoundPropGroup<H>[]>;
  scalarIncompatibleBindingProps?: Set<string>;
  keyedChildren?: KeyedRegionBuckets<MountedNode<H>>;
  parent: MountedNode<H> | null;
  parentIndex: number;
};

type MountedKeyIndex<H> = {
  attach?(node: MountedNode<H>): void;
  detach?(node: MountedNode<H>): void;
  attachKey?(node: MountedNode<H>): void;
  detachKey?(node: MountedNode<H>): void;
  refreshProp?(node: MountedNode<H>, name: string, next: unknown): void;
};

type BoundPropGroup<H> = {
  handle: H;
  name: string;
  styleProperty?: string;
  project?: (value: number) => unknown;
  column?: NumericColumn;
  columnIndex?: number;
  lastSourceValue?: number;
  sources: readonly ScalarSource[];
  rawValue: unknown;
  lastValue: unknown;
  forceWrite?: boolean;
  columnStageToken?: symbol;
};

/** The CSR portion of a dependency plan emitted by OXC. */
export interface CompiledVDOMBindingGraph {
  readonly sourceCount: number;
  readonly sourcePaths: readonly string[];
  readonly sourceBindingOffsets: readonly number[];
  readonly bindingIds: readonly number[];
}

/** Minimal operation set needed by the VDOM diff for a host platform. */
export interface VDOMHost<H, Parent = H> {
  /** Parent context lets hosts choose a namespace or other inherited mode. */
  createElement(
    tag: string,
    parent?: Parent,
    creationProps?: Readonly<Record<string, unknown>>,
  ): H;
  createText(text: string): H;
  setText(node: H, text: string): void;
  setProp(node: H, name: string, value: unknown, previous: unknown): void;
  /** Optional property-level style writer used by compiled bindings. */
  setStyleProp?(node: H, name: string, value: unknown, previous: unknown): void;
  place(parent: Parent, node: H, before: H | null): void;
  remove(parent: Parent, node: H): void;
  /** Release resources owned by a host node after its descendants. */
  dispose?(node: H): void;
  /** Resolve a host handle to the public instance exposed through `ref`. */
  getPublicInstance?(node: H): unknown;
}

export type VDOMRefCallback = (instance: unknown | null) => unknown;
export type VDOMRefObject = { current: unknown };
type VDOMRef = VDOMRefCallback | VDOMRefObject;
type CommittedVDOMRef = {
  ref: VDOMRef;
  instance: unknown;
  cleanup?: () => void;
};

const sameBoundValueCanSkipWrite = (
  lastValue: unknown,
  nextValue: unknown,
  forceWrite = false,
) => {
  if (!Object.is(lastValue, nextValue)) return false;
  return !forceWrite || nextValue === null ||
    (typeof nextValue !== "object" && typeof nextValue !== "function");
};

export type PreparedVDOMCommit = { commit(): void };
export type RuntimeProfileCallback = (
  phase: string,
  milliseconds: number,
) => void;
export type RuntimeCounterCallback = (
  counters: Readonly<Record<string, number>>,
) => void;
/** Internal experiment control for comparing key-index maintenance algorithms. */
export type VDOMKeyIndexMaintenance = "delta" | "rebuild";
export type VDOMBindingIndexMaintenance = "delta" | "rebuild";

export type KeyedRegionDeltaOperation =
  | { type: "insert"; key: string; beforeKey: string | null; tree: RuntimeNode }
  | { type: "remove"; key: string }
  | { type: "move"; key: string; beforeKey: string | null }
  | { type: "replace"; key: string; tree: RuntimeNode };

const elementKey = (element: RuntimeElement): string | null => {
  const key = element.props.key;
  return key == null ? null : String(key);
};

const hostProps = (props: Record<string, any>) => {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(props)) {
    if (name === "children" || name === "key") continue;
    result[name] = value;
  }
  return result;
};

const normalizedElementCache = new WeakMap<RuntimeElement, VElement>();

const normalizeMany = (input: RuntimeNode): VNode[] => {
  if (input == null || input === false) return [];
  if (Array.isArray(input)) {
    return input.flatMap((child) => normalizeMany(child));
  }
  if (typeof input === "string" || typeof input === "number") {
    return [{ kind: "text", text: String(input), key: null }];
  }
  if (typeof input.type === "function") {
    // Component execution is synchronous in this first VDOM slice. Async
    // resources are represented by the TransitionCoordinator's readiness IDs.
    return normalizeMany(input.type(input.props));
  }
  if (input.type === Fragment) return normalizeMany(input.props.children);
  const keyedRegionId = getKeyedOwnerRegionId(input.props.children);
  // Keyed-region VNodes discard their original child array after mounting so
  // sparse edits can release removed row descriptions. Do not cache these
  // containers: a later normalization of the same RuntimeElement must rebuild
  // its children from the still-current input tree.
  const cached = keyedRegionId === null
    ? normalizedElementCache.get(input)
    : undefined;
  if (cached) return [cached];
  const normalized: VElement = {
    kind: "element",
    tag: input.type,
    key: elementKey(input),
    props: hostProps(input.props),
    children: normalizeMany(input.props.children),
    keyedRegionId,
  };
  if (keyedRegionId === null) normalizedElementCache.set(input, normalized);
  return [normalized];
};

const mountedChildren = <H>(node: MountedNode<H>): MountedNode<H>[] =>
  node.keyedChildren
    ? [...node.keyedChildren.entries()].map((entry) => entry.value)
    : node.children;

const forEachMountedChild = <H>(
  node: MountedNode<H>,
  visitor: (child: MountedNode<H>) => void,
) => {
  if (node.keyedChildren) {
    node.keyedChildren.forEach((_key, child) => visitor(child));
  } else {
    for (const child of node.children) visitor(child);
  }
};

const storeMountedChildren = <H>(
  node: MountedNode<H>,
  regionId: string | null,
  children: MountedNode<H>[],
) => {
  const keyed = keyedChildrenFor(regionId, children);
  node.keyedChildren = keyed;
  node.children = keyed ? [] : children;
};

/** Materialize a keyed run only when falling back to ordinary full reconciliation. */
const materializeMountedChildren = <H>(node: MountedNode<H>) => {
  const children = mountedChildren(node);
  for (let index = 0; index < children.length; index++) {
    children[index].parent = node;
    children[index].parentIndex = index;
  }
  return children;
};

const keyedChildrenFor = <H>(
  regionId: string | null,
  children: readonly MountedNode<H>[],
) => {
  if (regionId === null || children.some((child) => child.vnode.key === null)) {
    return undefined;
  }
  return new KeyedRegionBuckets(
    children.map((child) => ({ key: child.vnode.key!, value: child })),
  );
};

const serializeMounted = <H>(node: MountedNode<H>): VNode => {
  if (node.vnode.kind === "text") return node.vnode;
  return {
    ...node.vnode,
    children: mountedChildren(node).map(serializeMounted),
  };
};

const compatible = (left: VNode, right: VNode) =>
  left.kind === right.kind && left.key === right.key &&
  (left.kind === "text" ||
    (right.kind === "element" && left.tag === right.tag));

const validateUniqueKeys = (siblings: readonly VNode[]) => {
  const keys = new Set<string>();
  for (const node of siblings) {
    if (node.kind === "element") {
      const ref = node.props.ref;
      if (
        ref != null && typeof ref !== "function" &&
        !(typeof ref === "object" && "current" in ref)
      ) {
        throw new TypeError(
          "VDOM ref must be a callback or an object with current",
        );
      }
    }
    if (node.key !== null) {
      if (keys.has(node.key)) {
        throw new Error(`Duplicate key in next VDOM children: ${node.key}`);
      }
      keys.add(node.key);
    }
    if (node.kind === "element") validateUniqueKeys(node.children);
  }
};

const applyProps = <H, P>(
  host: VDOMHost<H, P>,
  handle: H,
  previous: Readonly<Record<string, unknown>>,
  next: Readonly<Record<string, unknown>>,
  previousWriters?: ReadonlyMap<string, readonly BoundPropGroup<H>[]>,
  afterProp?: (name: string, next: unknown) => void,
) => {
  const names = new Set([...Object.keys(previous), ...Object.keys(next)]);
  for (const name of names) {
    // A source may have advanced before this candidate reaches VDOM commit.
    // Reading the old BoundValue here would observe the new value and suppress
    // the host write. Its writer index retains the value last committed to the
    // host, which is the correct previous value for diffing.
    const previousWriter = previousWriters?.get(name);
    let before: unknown;
    if (previousWriter?.length) {
      const wholeProp = previousWriter.find((group) =>
        group.styleProperty === undefined
      );
      if (wholeProp) {
        before = wholeProp.lastValue;
      } else if (name === "style") {
        const oldStyle = previous[name];
        const style = oldStyle && typeof oldStyle === "object" &&
            !Array.isArray(oldStyle)
          ? { ...(oldStyle as Record<string, unknown>) }
          : {};
        for (const group of previousWriter) {
          if (group.styleProperty !== undefined) {
            style[group.styleProperty] = group.lastValue;
          }
        }
        before = style;
      } else {
        before = materializeProp(name, previous[name]);
      }
    } else {
      before = materializeProp(name, previous[name]);
    }
    const value = materializeProp(name, next[name]);
    if (!Object.is(before, value)) host.setProp(handle, name, value, before);
    afterProp?.(name, next[name]);
  }
};

const materializeCreationProps = (
  props: Readonly<Record<string, unknown>>,
) => {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(props)) {
    if (name === "ref") continue;
    result[name] = materializeProp(name, value);
  }
  return result;
};

/** Release listeners in tree order, then host resources in postorder. */
const releaseMountedSubtree = <H, P>(
  host: VDOMHost<H, P>,
  node: MountedNode<H>,
  errors: unknown[],
) => {
  if (node.vnode.kind === "element") {
    if (node.vnode.props.ref != null) {
      try {
        host.setProp(node.handle, "ref", undefined, node.vnode.props.ref);
      } catch (error) {
        errors.push(error);
      }
    }
    for (const [name, value] of Object.entries(node.vnode.props)) {
      if (/^on[A-Z]/.test(name) && typeof value === "function") {
        try {
          host.setProp(node.handle, name, undefined, value);
        } catch (error) {
          errors.push(error);
        }
      }
    }
  }
  forEachMountedChild(node, (child) => {
    try {
      releaseMountedSubtree(host, child, errors);
    } catch (error) {
      errors.push(error);
    }
  });
  if (!node.hostDisposed) {
    node.hostDisposed = true;
    try {
      host.dispose?.(node.handle);
    } catch (error) {
      errors.push(error);
    }
  }
};

const removeMountedSubtree = <H, P>(
  host: VDOMHost<H, P>,
  parent: P,
  node: MountedNode<H>,
  collectedErrors?: unknown[],
) => {
  const errors = collectedErrors ?? [];
  releaseMountedSubtree(host, node, errors);
  try {
    host.remove(parent, node.handle);
  } catch (error) {
    errors.push(error);
  }
  if (!collectedErrors && errors.length > 0) {
    throw new AggregateError(
      errors,
      "VDOM subtree removal encountered host errors",
    );
  }
};

const materializeValue = (value: unknown): unknown => {
  const binding = getBoundValue(value);
  return binding ? readBoundValue(binding) : value;
};

const materializeProp = (name: string, value: unknown): unknown => {
  if (
    name === "style" && typeof value === "object" && value !== null &&
    !Array.isArray(value)
  ) {
    const style = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, styleValue] of Object.entries(style)) {
      output[key] = materializeValue(styleValue);
    }
    return output;
  }
  return materializeValue(value);
};

const boundSourcesIn = (name: string, value: unknown): ScalarSource[] => {
  const values =
    name === "style" && typeof value === "object" && value !== null &&
      !Array.isArray(value)
      ? Object.values(value as Record<string, unknown>)
      : [value];
  const sources: ScalarSource[] = [];
  for (const item of values) {
    const binding = getBoundValue(item);
    if (binding) {
      for (const source of binding.sources ?? [binding.source]) {
        if (!sources.includes(source)) sources.push(source);
      }
    }
  }
  return sources;
};

const hasStableDerivedBinding = (value: unknown): boolean => {
  const direct = getBoundValue(value);
  if (direct) return !!direct.read;
  return typeof value === "object" && value !== null &&
    Object.values(value as Record<string, unknown>).some((item) =>
      !!getBoundValue(item)?.read
    );
};

const compiledBindingsIn = (name: string, value: unknown) => {
  const values =
    name === "style" && typeof value === "object" && value !== null &&
      !Array.isArray(value)
      ? Object.entries(value as Record<string, unknown>)
      : [[undefined, value] as const];
  const bindings: Array<
    {
      source: ScalarSource;
      bindingId: number;
      sourceSlot: number;
      styleProperty?: string;
      binding: ReturnType<typeof getBoundValue>;
    }
  > = [];
  for (const [styleProperty, item] of values) {
    const binding = getBoundValue(item);
    const hasCompiledIdentity = binding &&
      Number.isInteger(binding.bindingId) &&
      Number.isInteger(binding.sourceSlot);
    if (
      hasCompiledIdentity && binding.sources && binding.sources.length !== 1
    ) {
      throw new Error(
        "Compiled VDOM bindings currently require one source per prop",
      );
    }
    if (
      hasCompiledIdentity
    ) {
      bindings.push({
        source: binding.source,
        bindingId: binding.bindingId!,
        sourceSlot: binding.sourceSlot!,
        styleProperty,
        binding,
      });
    }
  }
  return bindings;
};

/** CSR/column bindings require their own registration and lifetime protocol. */
const hasNonScalarBindingMetadata = (name: string, value: unknown): boolean => {
  const values = name === "style" && typeof value === "object" &&
      value !== null && !Array.isArray(value)
    ? Object.values(value as Record<string, unknown>)
    : [value];
  return values.some((item) => {
    const binding = getBoundValue(item);
    return !!binding && (
      binding.bindingId !== undefined || binding.sourceSlot !== undefined ||
      binding.column !== undefined
    );
  });
};

const createMounted = <H, P>(
  host: VDOMHost<H, P>,
  vnode: VNode,
  parent: P,
  keyIndex?: MountedKeyIndex<H>,
): MountedNode<H> => {
  if (vnode.kind === "text") {
    const mounted: MountedNode<H> = {
      vnode,
      handle: host.createText(vnode.text),
      children: [],
      parent: null,
      parentIndex: -1,
    };
    keyIndex?.attach?.(mounted);
    return mounted;
  }
  const handle = host.createElement(
    vnode.tag,
    parent,
    materializeCreationProps(vnode.props),
  );
  applyProps(host, handle, {}, vnode.props);
  const children = reconcileChildren(
    host,
    handle as unknown as P,
    [],
    vnode.children,
    keyIndex,
  );
  const mounted: MountedNode<H> = {
    vnode,
    handle,
    children,
    parent: null,
    parentIndex: -1,
  };
  storeMountedChildren(mounted, vnode.keyedRegionId, children);
  for (let index = 0; index < children.length; index++) {
    children[index].parent = mounted;
    children[index].parentIndex = index;
  }
  keyIndex?.attach?.(mounted);
  return mounted;
};

const updateMounted = <H, P>(
  host: VDOMHost<H, P>,
  parent: P,
  old: MountedNode<H> | null,
  next: VNode,
  keyIndex?: MountedKeyIndex<H>,
): MountedNode<H> => {
  if (old && old.vnode === next) return old;
  if (!old || !compatible(old.vnode, next)) {
    if (old) {
      visitMountedSubtree(old, keyIndex?.detach);
      removeMountedSubtree(host, parent, old);
    }
    const mounted = createMounted(host, next, parent, keyIndex);
    if (old) {
      mounted.parent = old.parent;
      mounted.parentIndex = old.parentIndex;
      const siblings = old.parent?.keyedChildren;
      const oldKey = old.vnode.key;
      const anchorKey = siblings && oldKey !== null
        ? siblings.afterKey(oldKey)
        : null;
      const anchor = anchorKey === null
        ? null
        : siblings!.get(anchorKey)?.handle ?? null;
      host.place(parent, mounted.handle, anchor);
      if (siblings && oldKey !== null && mounted.vnode.key !== null) {
        siblings.replace(oldKey, mounted.vnode.key, mounted);
      }
    } else {
      host.place(parent, mounted.handle, null);
    }
    return mounted;
  }
  if (next.kind === "text" && old.vnode.kind === "text") {
    if (old.vnode.text !== next.text) host.setText(old.handle, next.text);
    old.vnode = next;
    return old;
  }
  if (next.kind === "element" && old.vnode.kind === "element") {
    applyProps(
      host,
      old.handle,
      old.vnode.props,
      next.props,
      old.scalarBindingGroups,
      keyIndex?.refreshProp
        ? (name, value) => keyIndex.refreshProp!(old, name, value)
        : undefined,
    );
    const children = reconcileChildren(
      host,
      old.handle as unknown as P,
      materializeMountedChildren(old),
      next.children,
      keyIndex,
    );
    for (let index = 0; index < children.length; index++) {
      children[index].parent = old;
      children[index].parentIndex = index;
    }
    storeMountedChildren(old, next.keyedRegionId, children);
    if (old.vnode.keyedRegionId !== next.keyedRegionId) {
      if (keyIndex?.detachKey) keyIndex.detachKey(old);
      else keyIndex?.detach?.(old);
      old.vnode = next;
      if (keyIndex?.attachKey) keyIndex.attachKey(old);
      else keyIndex?.attach?.(old);
      return old;
    }
    old.vnode = next;
    return old;
  }
  throw new Error("Incompatible VDOM node kinds reached update path");
};

const reconcileChildren = <H, P>(
  host: VDOMHost<H, P>,
  parent: P,
  previous: MountedNode<H>[],
  next: readonly VNode[],
  keyIndex?: MountedKeyIndex<H>,
): MountedNode<H>[] => {
  // Preserve the allocation-light path for props/text changes when sibling
  // identity and order stay fixed. Previously we built key maps and sets
  // before reaching this check, even though no key lookup was needed.
  if (
    next.length === previous.length &&
    next.every((vnode, index) =>
      previous[index].vnode.key === vnode.key &&
      compatible(previous[index].vnode, vnode)
    )
  ) {
    return next.map((vnode, index) =>
      updateMounted(host, parent, previous[index], vnode, keyIndex)
    );
  }

  const keyed = new Map<string, MountedNode<H>>();
  const unkeyed: MountedNode<H>[] = [];
  for (let index = 0; index < previous.length; index++) {
    const child = previous[index];
    const key = child.vnode.key;
    if (key == null) unkeyed.push(child);
    else {
      if (keyed.has(key)) {
        throw new Error(`Duplicate key in previous VDOM children: ${key}`);
      }
      keyed.set(key, child);
    }
  }
  const nextKeys = new Set<string>();
  for (const child of next) {
    if (child.key != null) {
      if (nextKeys.has(child.key)) {
        throw new Error(`Duplicate key in next VDOM children: ${child.key}`);
      }
      nextKeys.add(child.key);
    }
  }

  const used = new Set<MountedNode<H>>();
  const needsPlacement = new Uint8Array(next.length);
  let unkeyedIndex = 0;
  let lastPlacedIndex = -1;
  const selected = next.map((vnode, index) => {
    let candidate: MountedNode<H> | undefined;
    if (vnode.key != null) candidate = keyed.get(vnode.key);
    else candidate = unkeyed[unkeyedIndex++];
    if (!candidate || !compatible(candidate.vnode, vnode)) {
      needsPlacement[index] = 1;
      return null;
    }
    used.add(candidate);
    // The linear last-placed-index plan may move more nodes than an LIS plan,
    // but avoids the O(n log n) search and its temporary buffers on each edit.
    if (candidate.parentIndex < lastPlacedIndex) needsPlacement[index] = 1;
    else lastPlacedIndex = candidate.parentIndex;
    return candidate;
  });

  const mounted = new Array<MountedNode<H>>(next.length);
  let anchor: H | null = null;
  for (let index = next.length - 1; index >= 0; index--) {
    const old = selected[index];
    // New children are mounted detached and placed once at their final slot.
    // New children and prior indexes behind the forward cursor are placed.
    const child = old
      ? updateMounted(host, parent, old, next[index], keyIndex)
      : createMounted(host, next[index], parent, keyIndex);
    if (needsPlacement[index] !== 0) {
      host.place(parent, child.handle, anchor);
    }
    mounted[index] = child;
    anchor = child.handle;
  }
  for (const child of previous) {
    if (!used.has(child)) {
      visitMountedSubtree(child, keyIndex?.detach);
      removeMountedSubtree(host, parent, child);
    }
  }
  return mounted;
};

const visitMountedSubtree = <H>(
  node: MountedNode<H>,
  visit?: (node: MountedNode<H>) => void,
) => {
  if (!visit) return;
  visit(node);
  forEachMountedChild(node, (child) => visitMountedSubtree(child, visit));
};

/** A retained VDOM root whose host changes only when commit() is called. */
export class VDOMSnapshotRoot<H, Parent = H> {
  #mounted: MountedNode<H>[] = [];
  #snapshot: readonly VNode[] = [];
  #numericWriteInProgress = false;
  #snapshotDirty = false;
  #nodesByKey = new Map<string, Set<MountedNode<H>>>();
  #nodesByKeyedRegion = new Map<string, Set<MountedNode<H>>>();
  // Set membership gives structural detach O(1) even when thousands of rows
  // share one scalar source. Compiled CSR indexes remain dense arrays/maps.
  #groupsBySource = new Map<ScalarSource, Set<BoundPropGroup<H>>>();
  #groupsByCompiledBinding = new Map<
    ScalarSource,
    Map<number, BoundPropGroup<H>[]>
  >();
  #groupsByCompiledSource = new Map<ScalarSource, BoundPropGroup<H>[]>();
  #groupsByCompiledColumnBinding = new Map<
    NumericColumn,
    Map<number, BoundPropGroup<H>[]>
  >();
  #groupsByCompiledColumn = new Map<NumericColumn, BoundPropGroup<H>[]>();
  #groupsByCompiledColumnRows = new Map<
    NumericColumn,
    Array<BoundPropGroup<H>[] | undefined>
  >();
  #compiledSlotBySource = new Map<ScalarSource, number>();
  #compiledGraph: CompiledVDOMBindingGraph | null = null;
  #directBindingWrites = false;
  #version = 0;
  #partialCommitCount = 0;
  #partialCommitBatchCount = 0;
  #bindingIndexAttachOperations = 0;
  #bindingIndexDetachOperations = 0;
  #bindingIndexIndexOperations = 0;
  #incompatibleScalarBindingGroups = 0;
  #profileCounter?: RuntimeCounterCallback;
  #renderHost: VDOMHost<H, Parent>;
  #pendingRefs = new Map<H, VDOMRef | null>();
  #committedRefs = new Map<H, CommittedVDOMRef>();
  #refPublicationEpoch = 0;
  readonly keyIndexMaintenance: VDOMKeyIndexMaintenance;
  readonly bindingIndexMaintenance: VDOMBindingIndexMaintenance;

  constructor(
    readonly host: VDOMHost<H, Parent>,
    readonly container: Parent,
    readonly profile?: RuntimeProfileCallback,
    profileCounter?: RuntimeCounterCallback,
    keyIndexMaintenance: VDOMKeyIndexMaintenance = "delta",
    bindingIndexMaintenance: VDOMBindingIndexMaintenance = "delta",
  ) {
    this.#profileCounter = profileCounter;
    this.keyIndexMaintenance = keyIndexMaintenance;
    this.bindingIndexMaintenance = bindingIndexMaintenance;
    this.#renderHost = {
      createElement: (tag, parent, props) =>
        host.createElement(tag, parent, props),
      createText: (text) => host.createText(text),
      setText: (node, text) => host.setText(node, text),
      setProp: (node, name, value, previous) => {
        if (name === "ref") {
          this.#pendingRefs.set(node, value == null ? null : value as VDOMRef);
        } else {
          host.setProp(node, name, value, previous);
        }
      },
      setStyleProp: host.setStyleProp
        ? (node, name, value, previous) =>
          host.setStyleProp!(node, name, value, previous)
        : undefined,
      place: (parent, node, before) => host.place(parent, node, before),
      remove: (parent, node) => host.remove(parent, node),
      dispose: host.dispose ? (node) => host.dispose!(node) : undefined,
      getPublicInstance: host.getPublicInstance
        ? (node) => host.getPublicInstance!(node)
        : undefined,
    };
  }

  get version() {
    return this.#version;
  }

  get partialCommitCount() {
    return this.#partialCommitCount;
  }

  get partialCommitBatchCount() {
    return this.#partialCommitBatchCount;
  }

  /** A read-only, host-neutral description of the latest committed tree. */
  get snapshot(): readonly unknown[] {
    if (this.#snapshotDirty) {
      this.#snapshot = this.#mounted.map(serializeMounted);
      this.#snapshotDirty = false;
    }
    return this.#snapshot;
  }

  commit(
    tree: RuntimeNode,
    compiledGraph: CompiledVDOMBindingGraph | null = null,
    directBindingWrites = false,
  ) {
    this.prepareCommit(tree, compiledGraph, directBindingWrites).commit();
    this.flushRefs();
  }

  /** Publish ref changes staged by a completed host commit. */
  flushRefs() {
    const publicationEpoch = this.#refPublicationEpoch;
    const pending = [...this.#pendingRefs];
    this.#pendingRefs.clear();
    const errors: unknown[] = [];

    for (const [node, nextRef] of pending) {
      if (publicationEpoch !== this.#refPublicationEpoch) break;
      const previous = this.#committedRefs.get(node);
      if (previous?.ref === nextRef) continue;
      if (!previous) continue;
      this.#committedRefs.delete(node);
      try {
        if (previous.cleanup) previous.cleanup();
        else if (typeof previous.ref === "function") {
          previous.ref(null);
        } else {
          previous.ref.current = null;
        }
      } catch (error) {
        errors.push(error);
      }
    }

    for (const [node, nextRef] of pending) {
      if (publicationEpoch !== this.#refPublicationEpoch) break;
      if (nextRef == null) continue;
      const previous = this.#committedRefs.get(node);
      if (previous?.ref === nextRef) continue;
      let instance: unknown;
      try {
        instance = this.host.getPublicInstance
          ? this.host.getPublicInstance(node)
          : node;
      } catch (error) {
        errors.push(error);
        continue;
      }
      const committed: CommittedVDOMRef = { ref: nextRef, instance };
      // Record before user code so a callback that throws is still detached
      // during later replacement or root disposal.
      this.#committedRefs.set(node, committed);
      try {
        if (typeof nextRef === "function") {
          const cleanup = nextRef(instance);
          if (typeof cleanup === "function") {
            const release = cleanup as () => void;
            if (
              publicationEpoch !== this.#refPublicationEpoch ||
              this.#committedRefs.get(node) !== committed
            ) {
              try {
                release();
              } catch (error) {
                errors.push(error);
              }
            } else {
              committed.cleanup = release;
            }
          }
        } else {
          nextRef.current = instance;
        }
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        "VDOM ref publication encountered errors",
      );
    }
  }

  /**
   * Normalize and validate a candidate before touching its host. A caller can
   * prepare every root in a transition first, then apply these synchronous
   * commits together in one task.
   */
  prepareCommit(
    tree: RuntimeNode,
    compiledGraph: CompiledVDOMBindingGraph | null = this.#compiledGraph,
    directBindingWrites = this.#directBindingWrites,
  ): PreparedVDOMCommit {
    const next = normalizeMany(tree);
    validateUniqueKeys(next);
    if (compiledGraph) {
      this.#validateCompiledGraph(compiledGraph);
      const validateBindings = (nodes: readonly VNode[]) => {
        for (const node of nodes) {
          if (node.kind !== "element") continue;
          for (const [name, value] of Object.entries(node.props)) {
            for (const binding of compiledBindingsIn(name, value)) {
              const slot = binding.sourceSlot;
              if (slot < 0 || slot >= compiledGraph.sourceCount) {
                throw new Error(
                  `Compiled binding uses invalid source slot ${slot}`,
                );
              }
              const start = compiledGraph.sourceBindingOffsets[slot];
              const end = compiledGraph.sourceBindingOffsets[slot + 1];
              let found = false;
              for (let edge = start; edge < end; edge++) {
                if (compiledGraph.bindingIds[edge] === binding.bindingId) {
                  found = true;
                }
              }
              if (!found) {
                throw new Error(
                  `Compiled binding ${binding.bindingId} is absent from source slot ${slot}`,
                );
              }
            }
          }
          validateBindings(node.children);
        }
      };
      validateBindings(next);
    }

    let committed = false;
    return {
      commit: () => {
        if (committed) {
          throw new Error("Prepared VDOM commit can only be applied once");
        }
        committed = true;
        let oldIndexVisits = 0;
        let newIndexVisits = 0;
        const deltaPlainBindings = this.bindingIndexMaintenance === "delta" &&
          compiledGraph === null && this.#compiledGraph === null &&
          directBindingWrites === this.#directBindingWrites;
        const bindingAttachStart = this.#bindingIndexAttachOperations;
        const bindingDetachStart = this.#bindingIndexDetachOperations;
        const countIndexVisits = this.#profileCounter !== undefined;
        const deltaKeys = this.keyIndexMaintenance === "delta";
        const keyIndex: MountedKeyIndex<H> | undefined =
          deltaKeys || deltaPlainBindings
            ? {
              detachKey: (node) => {
                if (!deltaKeys) return;
                if (countIndexVisits) oldIndexVisits++;
                this.#removeFromKeyIndex(node);
              },
              attachKey: (node) => {
                if (!deltaKeys) return;
                if (countIndexVisits) newIndexVisits++;
                this.#addToKeyIndex(node);
              },
              detach: (node) => {
                if (deltaKeys) {
                  if (countIndexVisits) oldIndexVisits++;
                  this.#removeFromKeyIndex(node);
                }
                if (deltaPlainBindings) this.#detachScalarBindingNode(node);
              },
              attach: (node) => {
                if (deltaKeys) {
                  if (countIndexVisits) newIndexVisits++;
                  this.#addToKeyIndex(node);
                }
                if (deltaPlainBindings) this.#attachScalarBindingNode(node);
              },
              ...(deltaPlainBindings
                ? {
                  refreshProp: (
                    node: MountedNode<H>,
                    name: string,
                    value: unknown,
                  ) => this.#refreshScalarBindingProp(node, name, value),
                }
                : {}),
            }
            : undefined;
        try {
          this.#mounted = reconcileChildren(
            this.#renderHost,
            this.container,
            this.#mounted,
            next,
            keyIndex,
          );
        } catch (error) {
          // Host cleanup can dispose a mounted record before a later host step
          // fails, and attached candidate nodes may not belong to this root's
          // retained tree. Re-index only reachable live records in either mode.
          const repairErrors: unknown[] = [];
          try {
            this.#rebuildKeyIndex();
          } catch (repairError) {
            repairErrors.push(repairError);
          }
          try {
            this.#rebuildBindingIndex();
          } catch (repairError) {
            this.#clearBindingIndex();
            repairErrors.push(repairError);
          }
          if (repairErrors.length > 0) {
            throw new AggregateError(
              [error, ...repairErrors],
              "VDOM host commit and index repair failed",
            );
          }
          throw error;
        }
        for (let index = 0; index < this.#mounted.length; index++) {
          this.#mounted[index].parent = null;
          this.#mounted[index].parentIndex = index;
        }
        this.#snapshot = next;
        this.#snapshotDirty = false;
        this.#compiledGraph = compiledGraph;
        this.#directBindingWrites = directBindingWrites;
        if (deltaPlainBindings && countIndexVisits) {
          this.#profileCounter?.({
            "vdom.binding-index.incremental-group-detaches":
              this.#bindingIndexDetachOperations - bindingDetachStart,
            "vdom.binding-index.incremental-group-attaches":
              this.#bindingIndexAttachOperations - bindingAttachStart,
          });
        } else if (!deltaPlainBindings) {
          this.#rebuildBindingIndex();
        }
        if (this.keyIndexMaintenance === "rebuild") {
          this.#rebuildKeyIndex();
        } else if (countIndexVisits) {
          this.#profileCounter?.({
            "vdom.key-index.incremental-old-visits": oldIndexVisits,
            "vdom.key-index.incremental-new-visits": newIndexVisits,
          });
        }
        this.#version++;
      },
    };
  }

  /**
   * Update one globally unique keyed host region without normalizing or
   * reconciling its siblings. Returns false when that fast path is unsafe.
   */
  commitKeyedRegion(key: string, tree: RuntimeNode): boolean {
    if (this.#directBindingWrites) {
      const prepared = this.prepareKeyedRegions([{ key, tree }]);
      if (!prepared) return false;
      prepared.commit();
      return true;
    }
    if (
      this.#compiledGraph || this.#directBindingWrites ||
      this.#groupsBySource.size > 0
    ) return false;
    const matches = this.#nodesByKey.get(key);
    if (!matches || matches.size !== 1) return false;
    let started = this.profile ? performance.now() : 0;
    const [next] = normalizeMany(tree);
    this.profile?.("vdom.normalize", performance.now() - started);
    started = this.profile ? performance.now() : 0;
    const target = matches.values().next().value as MountedNode<H> | undefined;
    if (
      !target || !next || next.key !== key || !compatible(target.vnode, next)
    ) return false;

    let oldIndexVisits = 0;
    let newIndexVisits = 0;
    const countIndexVisits = this.#profileCounter !== undefined;
    const previousSubtree: Array<{
      node: MountedNode<H>;
      key: string | null;
    }> = [];
    if (this.keyIndexMaintenance === "rebuild") {
      const collect = (node: MountedNode<H>) => {
        previousSubtree.push({ node, key: node.vnode.key });
        if (countIndexVisits) oldIndexVisits++;
        forEachMountedChild(node, collect);
      };
      collect(target);
      for (const { node, key: oldKey } of previousSubtree) {
        if (oldKey !== null) this.#removeKeyFromIndex(oldKey, node);
      }
    }
    const keyIndex: MountedKeyIndex<H> | undefined =
      this.keyIndexMaintenance === "delta"
        ? {
          detach: (node) => {
            if (countIndexVisits) oldIndexVisits++;
            this.#removeFromKeyIndex(node);
          },
          attach: (node) => {
            if (countIndexVisits) newIndexVisits++;
            this.#addToKeyIndex(node);
          },
        }
        : undefined;
    const parent = target.parent
      ? target.parent.handle as unknown as Parent
      : this.container;
    updateMounted(this.#renderHost, parent, target, next, keyIndex);
    if (this.keyIndexMaintenance === "rebuild") {
      const indexSubtree = (node: MountedNode<H>) => {
        if (countIndexVisits) newIndexVisits++;
        this.#addToKeyIndex(node);
        forEachMountedChild(node, indexSubtree);
      };
      indexSubtree(target);
    }
    this.profile?.("vdom.reconcile-host", performance.now() - started);
    started = this.profile ? performance.now() : 0;
    this.#snapshotDirty = true;
    this.#version++;
    this.#partialCommitCount++;
    this.#partialCommitBatchCount++;
    if (countIndexVisits) {
      this.#profileCounter?.(
        this.keyIndexMaintenance === "delta"
          ? {
            "vdom.key-index.incremental-old-visits": oldIndexVisits,
            "vdom.key-index.incremental-new-visits": newIndexVisits,
          }
          : {
            "vdom.key-index.subtree-rescan-old-visits": oldIndexVisits,
            "vdom.key-index.subtree-rescan-new-visits": newIndexVisits,
          },
      );
    }
    this.profile?.("vdom.index-snapshot", performance.now() - started);
    return true;
  }

  /**
   * Apply a small structural edit directly to a compiler-marked keyed child
   * region. Ordinary ScalarSource/BoundValue writers are updated only within
   * changed subtrees, including ordinary direct property/style groups.
   * Compiled CSR and column roots retain their generic fallback.
   * The operation list is validated before host writes; order storage remains
   * bucketed and is never expanded to a sibling array on this path.
   */
  commitKeyedRegionDelta(
    parentKey: string,
    regionId: string,
    operations: readonly KeyedRegionDeltaOperation[],
  ): boolean {
    if (
      !parentKey || !regionId ||
      // The sparse delta path supports the ordinary ScalarSource/BoundValue
      // index below. Compiled CSR and direct-column writers have separate
      // identity/lifetime rules and deliberately keep the generic fallback.
      this.#compiledGraph ||
      this.#incompatibleScalarBindingGroups > 0
    ) {
      this.#profileCounter?.({ "vdom.keyed-region-delta.bail.root-guard": 1 });
      return false;
    }
    const roots = this.#nodesByKey.get(parentKey);
    if (!roots || roots.size !== 1) {
      this.#profileCounter?.({ "vdom.keyed-region-delta.bail.root-lookup": 1 });
      return false;
    }
    const root = roots.values().next().value as MountedNode<H> | undefined;
    if (!root) return false;
    const candidates = this.#nodesByKeyedRegion.get(regionId);
    let parent: MountedNode<H> | undefined;
    let matches = 0;
    for (const candidate of candidates ?? []) {
      let ancestor: MountedNode<H> = candidate;
      // `parentKey` identifies the keyed host root for this delta. A mounted
      // component root can itself be nested inside the application tree, so
      // walking to the outermost mounted node would incorrectly reject it.
      while (ancestor !== root && ancestor.parent) ancestor = ancestor.parent;
      if (ancestor !== root) continue;
      if (
        candidate.vnode.kind === "element" && candidate.keyedChildren
      ) {
        parent = candidate;
        matches++;
      }
    }
    if (matches !== 1) {
      this.#profileCounter?.({
        [`vdom.keyed-region-delta.bail.region-matches-${matches}`]: 1,
      });
      return false;
    }
    const region = parent?.keyedChildren;
    if (
      !parent || parent.vnode.kind !== "element" || !region ||
      parent.vnode.keyedRegionId !== regionId
    ) {
      this.#profileCounter?.({
        "vdom.keyed-region-delta.bail.parent-guard": 1,
      });
      return false;
    }
    if (operations.length === 0) return true;

    const normalized = new Map<number, VNode>();
    const state = new Map<string, boolean>();
    const present = (key: string) => {
      if (!state.has(key)) state.set(key, region.has(key));
      return state.get(key)!;
    };
    // Validate binding shapes and evaluate their initial values before host
    // mutation. Compiled graph/column bindings are rejected by the root guard.
    const validateScalarBindings = (node: VNode): boolean => {
      if (node.kind === "text") return true;
      for (const [name, value] of Object.entries(node.props)) {
        try {
          if (hasNonScalarBindingMetadata(name, value)) return false;
          if (compiledBindingsIn(name, value).length > 0) return false;
          const sources = boundSourcesIn(name, value);
          if (sources.length > 0) materializeProp(name, value);
        } catch {
          return false;
        }
      }
      return node.children.every(validateScalarBindings);
    };

    for (let index = 0; index < operations.length; index++) {
      const operation = operations[index];
      if (!operation.key) return false;
      if (operation.type === "insert" || operation.type === "replace") {
        const key = operation.key;
        if (operation.type === "insert") {
          if (present(key)) return false;
          if (operation.beforeKey !== null && !present(operation.beforeKey)) {
            return false;
          }
          const roots = normalizeMany(operation.tree);
          if (roots.length !== 1 || roots[0].key !== key) return false;
          try {
            validateUniqueKeys(roots);
          } catch {
            return false;
          }
          if (!validateScalarBindings(roots[0])) return false;
          normalized.set(index, roots[0]);
          state.set(key, true);
        } else {
          if (!present(key)) return false;
          const roots = normalizeMany(operation.tree);
          if (roots.length !== 1 || roots[0].key !== key) return false;
          try {
            validateUniqueKeys(roots);
          } catch {
            return false;
          }
          if (!validateScalarBindings(roots[0])) return false;
          normalized.set(index, roots[0]);
        }
      } else if (operation.type === "remove") {
        if (!present(operation.key)) return false;
        state.set(operation.key, false);
      } else {
        if (!present(operation.key)) return false;
        if (
          operation.beforeKey !== null &&
          !present(operation.beforeKey)
        ) return false;
      }
    }

    const keyIndex: MountedKeyIndex<H> = {
      detach: (node) => this.#removeFromKeyIndex(node),
      attach: (node) => this.#addToKeyIndex(node),
    };
    const bindingAttachStart = this.#bindingIndexAttachOperations;
    const bindingDetachStart = this.#bindingIndexDetachOperations;
    const bindingIndexStart = this.#bindingIndexIndexOperations;
    const hostParent = parent.handle as unknown as Parent;
    for (let index = 0; index < operations.length; index++) {
      const operation = operations[index];
      if (operation.type === "remove") {
        const child = region.get(operation.key)!;
        region.remove(operation.key);
        visitMountedSubtree(child, keyIndex.detach);
        this.#detachScalarBindingSubtree(child);
        removeMountedSubtree(this.#renderHost, hostParent, child);
      } else if (operation.type === "move") {
        if (operation.key === operation.beforeKey) continue;
        const child = region.get(operation.key)!;
        const anchor = operation.beforeKey === null
          ? null
          : region.get(operation.beforeKey)!.handle;
        region.moveBefore(operation.key, operation.beforeKey);
        this.#renderHost.place(hostParent, child.handle, anchor);
      } else if (operation.type === "insert") {
        const vnode = normalized.get(index)!;
        const child = createMounted(
          this.#renderHost,
          vnode,
          hostParent,
          keyIndex,
        );
        child.parent = parent;
        child.parentIndex = -1;
        const anchor = operation.beforeKey === null
          ? null
          : region.get(operation.beforeKey)!.handle;
        region.insertBefore(operation.beforeKey, operation.key, child);
        this.#renderHost.place(hostParent, child.handle, anchor);
        this.#attachScalarBindingSubtree(child);
      } else {
        const old = region.get(operation.key)!;
        this.#detachScalarBindingSubtree(old);
        updateMounted(
          this.#renderHost,
          hostParent,
          old,
          normalized.get(index)!,
          keyIndex,
        );
        this.#attachScalarBindingSubtree(region.get(operation.key)!);
      }
    }
    // The mounted bucket owns the current row order. Drop the initial VNode
    // child array and cached snapshot now so removed rows are not retained
    // until a later snapshot read or full render.
    const releasedChildVNodeCount = parent.vnode.children.length;
    parent.vnode.children = [];
    this.#snapshot = [];
    this.#snapshotDirty = true;
    this.#version++;
    this.#partialCommitCount++;
    this.#partialCommitBatchCount++;
    this.#profileCounter?.({
      "vdom.keyed-region-delta.operations": operations.length,
      "vdom.keyed-region-delta.bucket-count": region.bucketCount,
      "vdom.keyed-region-delta.binding-attaches":
        this.#bindingIndexAttachOperations - bindingAttachStart,
      "vdom.keyed-region-delta.binding-detaches":
        this.#bindingIndexDetachOperations - bindingDetachStart,
      "vdom.keyed-region-delta.binding-index-operations":
        this.#bindingIndexIndexOperations - bindingIndexStart,
      "vdom.keyed-region-delta.released-child-vnodes": releasedChildVNodeCount,
    });
    return true;
  }

  /**
   * Prepare a coherent host candidate for disjoint, globally keyed regions.
   * Returns null when the current root or candidate cannot use the incremental
   * ordinary-binding path. The returned handle is one-shot and checks the root
   * version again before it mutates any host nodes.
   */
  prepareKeyedRegions(
    regions: readonly { key: string; tree: RuntimeNode }[],
  ): PreparedVDOMCommit | null {
    if (
      regions.length === 0 || this.#compiledGraph !== null ||
      this.bindingIndexMaintenance !== "delta" ||
      this.keyIndexMaintenance !== "delta"
    ) return null;

    const preparedVersion = this.#version;
    const prepared: Array<{ target: MountedNode<H>; next: VNode }> = [];
    const replacedNodes = new Set<MountedNode<H>>();
    const candidateKeys = new Set<string>();
    const seenTargets = new Set<string>();
    const countVisits = this.#profileCounter !== undefined;
    let validationNodeVisits = 0;
    let oldSubtreeVisits = 0;
    let newCandidateKeyVisits = 0;

    const validateCandidate = (node: VNode): boolean => {
      if (countVisits) validationNodeVisits++;
      if (node.kind === "text") return true;
      for (const [name, value] of Object.entries(node.props)) {
        if (hasNonScalarBindingMetadata(name, value)) return false;
        if (compiledBindingsIn(name, value).length > 0) return false;
        // Validate scalar binding enumeration without evaluating user
        // projections during prepare. Their values are read once in the host
        // diff, just as in a normal commit.
        boundSourcesIn(name, value);
      }
      return node.children.every(validateCandidate);
    };

    for (const region of regions) {
      if (!region.key || seenTargets.has(region.key)) return null;
      seenTargets.add(region.key);
      const matches = this.#nodesByKey.get(region.key);
      if (!matches || matches.size !== 1) return null;
      const target = matches.values().next().value as
        | MountedNode<H>
        | undefined;
      const normalized = normalizeMany(region.tree);
      if (normalized.length !== 1) return null;
      const next = normalized[0];
      try {
        validateUniqueKeys([next]);
      } catch {
        return null;
      }
      if (
        !target || target.hostDisposed || next.key !== region.key ||
        !compatible(target.vnode, next)
      ) return null;
      try {
        if (!validateCandidate(next)) return null;
      } catch {
        return null;
      }

      const collectOld = (node: MountedNode<H>): boolean => {
        if (countVisits) oldSubtreeVisits++;
        if (replacedNodes.has(node)) return false;
        replacedNodes.add(node);
        forEachMountedChild(node, (child) => {
          if (!collectOld(child)) overlappingSubtree = true;
        });
        return !overlappingSubtree;
      };
      let overlappingSubtree = false;
      if (!collectOld(target) || overlappingSubtree) return null;
      prepared.push({ target, next });
    }

    const collectCandidateKeys = (node: VNode): boolean => {
      if (countVisits) newCandidateKeyVisits++;
      if (node.kind === "text") return true;
      if (node.key !== null) {
        if (candidateKeys.has(node.key)) return false;
        candidateKeys.add(node.key);
      }
      return node.children.every(collectCandidateKeys);
    };
    for (const { next } of prepared) {
      if (!collectCandidateKeys(next)) return null;
    }
    for (const key of candidateKeys) {
      const existing = this.#nodesByKey.get(key);
      if (existing && [...existing].some((node) => !replacedNodes.has(node))) {
        return null;
      }
    }

    if (this.#version !== preparedVersion) return null;
    let committed = false;
    return {
      commit: () => {
        if (committed) {
          throw new Error("Prepared VDOM commit can only be applied once");
        }
        committed = true;
        if (
          this.#version !== preparedVersion ||
          prepared.some(({ target }) => {
            const entries = target.vnode.key === null
              ? undefined
              : this.#nodesByKey.get(target.vnode.key);
            return target.hostDisposed || entries?.size !== 1 ||
              !entries.has(target);
          })
        ) {
          throw new Error("Prepared VDOM keyed-region candidate is stale");
        }

        let oldIndexVisits = 0;
        let newIndexVisits = 0;
        const keyIndex: MountedKeyIndex<H> = {
          detach: (node) => {
            if (countVisits) oldIndexVisits++;
            this.#removeFromKeyIndex(node);
            this.#detachScalarBindingNode(node);
          },
          attach: (node) => {
            if (countVisits) newIndexVisits++;
            this.#addToKeyIndex(node);
            this.#attachScalarBindingNode(node);
          },
          detachKey: (node) => {
            if (countVisits) oldIndexVisits++;
            this.#removeFromKeyIndex(node);
          },
          attachKey: (node) => {
            if (countVisits) newIndexVisits++;
            this.#addToKeyIndex(node);
          },
          refreshProp: (node, name, value) =>
            this.#refreshScalarBindingProp(node, name, value),
        };
        const bindingAttachStart = this.#bindingIndexAttachOperations;
        const bindingDetachStart = this.#bindingIndexDetachOperations;
        const bindingIndexStart = this.#bindingIndexIndexOperations;
        const pendingRefsBeforeCommit = new Map(this.#pendingRefs);
        try {
          for (const { target, next } of prepared) {
            const parent = target.parent
              ? target.parent.handle as unknown as Parent
              : this.container;
            updateMounted(this.#renderHost, parent, target, next, keyIndex);
          }
        } catch (error) {
          this.#pendingRefs.clear();
          for (const [node, ref] of pendingRefsBeforeCommit) {
            this.#pendingRefs.set(node, ref);
          }
          this.#snapshotDirty = true;
          this.#version++;
          const repairErrors: unknown[] = [];
          try {
            this.#rebuildKeyIndex();
          } catch (repairError) {
            repairErrors.push(repairError);
          }
          try {
            this.#rebuildBindingIndex();
          } catch (repairError) {
            this.#clearBindingIndex();
            repairErrors.push(repairError);
          }
          if (repairErrors.length > 0) {
            throw new AggregateError(
              [error, ...repairErrors],
              "VDOM keyed-region host commit and index repair failed",
            );
          }
          throw error;
        }

        this.#snapshotDirty = true;
        this.#version++;
        this.#partialCommitCount += prepared.length;
        this.#partialCommitBatchCount++;
        if (countVisits) {
          this.#profileCounter?.({
            "vdom.prepared-keyed-regions.validation-node-visits":
              validationNodeVisits,
            "vdom.prepared-keyed-regions.old-subtree-visits": oldSubtreeVisits,
            "vdom.prepared-keyed-regions.new-candidate-key-visits":
              newCandidateKeyVisits,
            "vdom.key-index.incremental-old-visits": oldIndexVisits,
            "vdom.key-index.incremental-new-visits": newIndexVisits,
            "vdom.binding-index.incremental-group-detaches":
              this.#bindingIndexDetachOperations - bindingDetachStart,
            "vdom.binding-index.incremental-group-attaches":
              this.#bindingIndexAttachOperations - bindingAttachStart,
            "vdom.binding-index.incremental-index-operations":
              this.#bindingIndexIndexOperations - bindingIndexStart,
          });
        }
      },
    };
  }

  /**
   * Atomically prepare and patch several disjoint, globally keyed host regions.
   * Returns false without changing the host if any target is missing,
   * incompatible, bound, duplicated, or would collide with a surviving key.
   */
  commitKeyedRegions(
    regions: readonly { key: string; tree: RuntimeNode }[],
  ): boolean {
    if (this.#directBindingWrites) {
      const prepared = this.prepareKeyedRegions(regions);
      if (!prepared) return false;
      prepared.commit();
      return true;
    }
    if (
      regions.length === 0 || this.#compiledGraph ||
      this.#directBindingWrites || this.#groupsBySource.size > 0
    ) return false;

    const seenTargetKeys = new Set<string>();
    const replacedNodes = new Set<MountedNode<H>>();
    const prepared: Array<{
      key: string;
      target: MountedNode<H>;
      next: VNode;
    }> = [];

    for (const region of regions) {
      if (!region.key || seenTargetKeys.has(region.key)) return false;
      seenTargetKeys.add(region.key);
      const matches = this.#nodesByKey.get(region.key);
      if (!matches || matches.size !== 1) return false;
      const target = matches.values().next().value as
        | MountedNode<H>
        | undefined;
      const normalized = normalizeMany(region.tree);
      if (normalized.length !== 1) return false;
      const next = normalized[0];
      try {
        validateUniqueKeys([next]);
      } catch {
        return false;
      }
      if (
        !target || next.key !== region.key || !compatible(target.vnode, next)
      ) {
        return false;
      }
      if (replacedNodes.has(target)) return false;
      const collect = (node: MountedNode<H>) => {
        replacedNodes.add(node);
        forEachMountedChild(node, collect);
      };
      collect(target);
      prepared.push({ key: region.key, target, next });
    }

    const candidateKeys = new Set<string>();
    const collectCandidateKeys = (node: VNode): boolean => {
      if (node.kind !== "element") return true;
      if (node.key !== null) {
        if (candidateKeys.has(node.key)) return false;
        candidateKeys.add(node.key);
      }
      return node.children.every(collectCandidateKeys);
    };
    for (const item of prepared) {
      if (!collectCandidateKeys(item.next)) return false;
    }
    for (const key of candidateKeys) {
      const existing = this.#nodesByKey.get(key);
      if (existing && [...existing].some((node) => !replacedNodes.has(node))) {
        return false;
      }
    }

    let oldIndexVisits = 0;
    let newIndexVisits = 0;
    const countIndexVisits = this.#profileCounter !== undefined;
    const previousSubtrees: Array<
      Array<{
        node: MountedNode<H>;
        key: string | null;
      }>
    > = [];
    if (this.keyIndexMaintenance === "rebuild") {
      for (const item of prepared) {
        const previousSubtree: Array<{
          node: MountedNode<H>;
          key: string | null;
        }> = [];
        const collect = (node: MountedNode<H>) => {
          previousSubtree.push({ node, key: node.vnode.key });
          if (countIndexVisits) oldIndexVisits++;
          forEachMountedChild(node, collect);
        };
        collect(item.target);
        previousSubtrees.push(previousSubtree);
      }
      for (const subtree of previousSubtrees) {
        for (const { node, key: oldKey } of subtree) {
          if (oldKey !== null) this.#removeKeyFromIndex(oldKey, node);
        }
      }
    }
    const keyIndex: MountedKeyIndex<H> | undefined =
      this.keyIndexMaintenance === "delta"
        ? {
          detach: (node) => {
            if (countIndexVisits) oldIndexVisits++;
            this.#removeFromKeyIndex(node);
          },
          attach: (node) => {
            if (countIndexVisits) newIndexVisits++;
            this.#addToKeyIndex(node);
          },
        }
        : undefined;
    // All validation is complete. These host operations run in one JS task,
    // so the browser cannot paint an intermediate subset of the batch.
    for (const item of prepared) {
      const parent = item.target.parent
        ? item.target.parent.handle as unknown as Parent
        : this.container;
      updateMounted(this.#renderHost, parent, item.target, item.next, keyIndex);
    }
    if (this.keyIndexMaintenance === "rebuild") {
      const indexSubtree = (node: MountedNode<H>) => {
        if (countIndexVisits) newIndexVisits++;
        this.#addToKeyIndex(node);
        forEachMountedChild(node, indexSubtree);
      };
      for (const item of prepared) indexSubtree(item.target);
    }
    this.#snapshotDirty = true;
    this.#version++;
    this.#partialCommitCount += prepared.length;
    this.#partialCommitBatchCount++;
    if (countIndexVisits) {
      this.#profileCounter?.(
        this.keyIndexMaintenance === "delta"
          ? {
            "vdom.key-index.incremental-old-visits": oldIndexVisits,
            "vdom.key-index.incremental-new-visits": newIndexVisits,
          }
          : {
            "vdom.key-index.subtree-rescan-old-visits": oldIndexVisits,
            "vdom.key-index.subtree-rescan-new-visits": newIndexVisits,
          },
      );
    }
    return true;
  }

  /**
   * Update every retained VDOM prop that depends on this source. The VDOM tree
   * is not re-walked; work follows the source-to-prop index built at commit.
   */
  setSource(source: ScalarSource, value: number) {
    return this.setSources([[source, value]]);
  }

  /** Whether this committed VDOM currently retains props bound to a source. */
  hasBoundSource(source: ScalarSource): boolean {
    const groups = this.#compiledGraph
      ? this.#groupsByCompiledSource.get(source)
      : this.#groupsBySource.get(source);
    return !!groups &&
      (groups instanceof Set ? groups.size : groups.length) > 0;
  }

  /** Apply source changes as one coherent host-write batch. */
  setSources(updates: readonly (readonly [ScalarSource, number])[]) {
    return this.#withNumericWriteGuard(() => this.#setSources(updates));
  }

  #setSources(updates: readonly (readonly [ScalarSource, number])[]) {
    const nextValues = new Map<ScalarSource, number>();
    for (const [source, value] of updates) nextValues.set(source, value);
    const changed: ScalarSource[] = [];
    for (const [source, value] of nextValues) {
      const groups = this.#compiledGraph
        ? this.#groupsByCompiledSource.get(source)
        : this.#groupsBySource.get(source);
      if (
        !groups || (groups instanceof Set ? groups.size : groups.length) === 0
      ) {
        throw new Error("Scalar source is not bound in this VDOM root");
      }
      if (!Object.is(source.value, value)) changed.push(source);
    }
    if (changed.length === 0) return false;

    for (const source of changed) source.value = nextValues.get(source)!;
    const affected = new Set<BoundPropGroup<H>>();
    for (const source of changed) {
      const groups = this.#compiledGraph
        ? this.#groupsByCompiledSource.get(source)
        : this.#groupsBySource.get(source);
      for (const group of groups ?? []) affected.add(group);
    }
    // Capture every projection before invoking host code. A host writer may
    // synchronously reenter this root and change source.value; all writers in
    // this batch must still consume the same source cut.
    const projectedValues: unknown[] = [];
    for (const group of affected) {
      const directBinding = group.styleProperty === undefined
        ? null
        : getBoundValue(group.rawValue);
      projectedValues.push(
        directBinding
          ? readBoundValue(directBinding)
          : materializeProp(group.name, group.rawValue),
      );
    }
    let projectedIndex = 0;
    for (const group of affected) {
      const next = projectedValues[projectedIndex++];
      if (sameBoundValueCanSkipWrite(group.lastValue, next, group.forceWrite)) {
        continue;
      }
      if (group.styleProperty !== undefined) {
        if (this.#renderHost.setStyleProp) {
          this.#renderHost.setStyleProp(
            group.handle,
            group.styleProperty,
            next,
            group.lastValue,
          );
        } else {this.#renderHost.setProp(group.handle, "style", {
            [group.styleProperty]: next,
          }, { [group.styleProperty]: group.lastValue });}
      } else {this.#renderHost.setProp(
          group.handle,
          group.name,
          next,
          group.lastValue,
        );}
      group.lastValue = next;
    }
    return true;
  }

  /**
   * Commit changed rows from compiled numeric columns through the binding
   * writers resolved at mount. The caller updates column buffers in place;
   * call-local staging keeps every writer on the same captured buffer cut.
   */
  setColumns(columns: readonly NumericColumn[]) {
    return this.#withNumericWriteGuard(() => this.#setColumns(columns));
  }

  #setColumns(columns: readonly NumericColumn[]) {
    for (const column of columns) {
      const groups = this.#groupsByCompiledColumn.get(column);
      if (!groups || groups.length === 0) {
        throw new Error("Numeric column is not bound in this VDOM root");
      }
      for (const group of groups) {
        if (group.columnIndex! >= column.values.length) {
          throw new Error(
            "Numeric column is shorter than its bound entity rows",
          );
        }
      }
    }
    for (const column of columns) column.source.value++;
    const stagedGroups: BoundPropGroup<H>[] = [];
    const stagedSources: number[] = [];
    const stageToken = Symbol();
    for (const column of columns) {
      const groups = this.#groupsByCompiledColumn.get(column)!;
      for (const group of groups) {
        if (group.columnStageToken === stageToken) continue;
        group.columnStageToken = stageToken;
        const sourceValue = column.values[group.columnIndex!];
        if (Object.is(group.lastSourceValue, sourceValue)) continue;
        stagedGroups.push(group);
        stagedSources.push(sourceValue);
      }
    }
    const stagedValues: unknown[] = [];
    for (let index = 0; index < stagedGroups.length; index++) {
      stagedValues.push(stagedGroups[index].project!(stagedSources[index]));
    }
    return this.#writeStagedColumnValues(
      stagedGroups,
      stagedSources,
      stagedValues,
    );
  }

  /** Read-only lifecycle counters for benchmarks and host adapters. */
  diagnostics() {
    const groupCount = (value: unknown): number => {
      if (value instanceof Map) {
        let count = 0;
        for (const entry of value.values()) count += groupCount(entry);
        return count;
      }
      if (value instanceof Set) return value.size;
      return Array.isArray(value) ? value.length : 0;
    };
    return {
      mountedNodes: this.#mounted.length,
      scalarBindingGroups: groupCount(this.#groupsBySource),
      compiledBindingGroups: groupCount(this.#groupsByCompiledBinding),
      compiledSourceGroups: groupCount(this.#groupsByCompiledSource),
      compiledColumnGroups: groupCount(this.#groupsByCompiledColumn),
      compiledColumnBindingGroups: groupCount(
        this.#groupsByCompiledColumnBinding,
      ),
      bindingIndexAttachOperations: this.#bindingIndexAttachOperations,
      bindingIndexDetachOperations: this.#bindingIndexDetachOperations,
      bindingIndexIndexOperations: this.#bindingIndexIndexOperations,
    };
  }

  /** Commit only rows in a reusable dirty-row buffer. */
  setColumnRows(
    columns: readonly NumericColumn[],
    rows: Uint32Array,
    rowCount = rows.length,
  ) {
    return this.#withNumericWriteGuard(() =>
      this.#setColumnRows(columns, rows, rowCount)
    );
  }

  #setColumnRows(
    columns: readonly NumericColumn[],
    rows: Uint32Array,
    rowCount: number,
  ) {
    if (!Number.isInteger(rowCount) || rowCount < 0 || rowCount > rows.length) {
      throw new Error("Dirty row count is outside the supplied buffer");
    }
    for (const column of columns) {
      const rowGroups = this.#groupsByCompiledColumnRows.get(column);
      if (!rowGroups) {
        throw new Error("Numeric column is not bound in this VDOM root");
      }
      for (let index = 0; index < rowCount; index++) {
        const row = rows[index];
        if (row >= column.values.length || rowGroups[row] === undefined) {
          throw new Error("Dirty row is outside the bound column rows");
        }
      }
    }
    if (rowCount === 0) return false;
    for (const column of columns) column.source.value++;
    const stagedGroups: BoundPropGroup<H>[] = [];
    const stagedSources: number[] = [];
    const stageToken = Symbol();
    for (const column of columns) {
      const rowGroups = this.#groupsByCompiledColumnRows.get(column)!;
      for (let index = 0; index < rowCount; index++) {
        const row = rows[index];
        const sourceValue = column.values[row];
        const groups = rowGroups[row]!;
        for (const group of groups) {
          if (group.columnStageToken === stageToken) continue;
          group.columnStageToken = stageToken;
          if (Object.is(group.lastSourceValue, sourceValue)) continue;
          stagedGroups.push(group);
          stagedSources.push(sourceValue);
        }
      }
    }
    const stagedValues: unknown[] = [];
    for (let index = 0; index < stagedGroups.length; index++) {
      stagedValues.push(stagedGroups[index].project!(stagedSources[index]));
    }
    return this.#writeStagedColumnValues(
      stagedGroups,
      stagedSources,
      stagedValues,
    );
  }

  /** Scan caller-selected contiguous row buckets, skipping unchanged rows. */
  setColumnBuckets(
    columns: readonly NumericColumn[],
    buckets: Uint32Array,
    bucketCount = buckets.length,
    bucketSize = 64,
  ) {
    return this.#withNumericWriteGuard(() =>
      this.#setColumnBuckets(columns, buckets, bucketCount, bucketSize)
    );
  }

  #setColumnBuckets(
    columns: readonly NumericColumn[],
    buckets: Uint32Array,
    bucketCount: number,
    bucketSize: number,
  ) {
    if (
      !Number.isInteger(bucketCount) || bucketCount < 0 ||
      bucketCount > buckets.length || !Number.isInteger(bucketSize) ||
      bucketSize <= 0
    ) throw new Error("Invalid dirty bucket descriptor");
    for (const column of columns) {
      if (!this.#groupsByCompiledColumnRows.has(column)) {
        throw new Error("Numeric column is not bound in this VDOM root");
      }
      for (let index = 0; index < bucketCount; index++) {
        const start = buckets[index] * bucketSize;
        if (!Number.isSafeInteger(start) || start >= column.values.length) {
          throw new Error("Dirty bucket is outside the bound column rows");
        }
      }
    }
    if (bucketCount === 0) return false;
    for (const column of columns) column.source.value++;
    const stagedGroups: BoundPropGroup<H>[] = [];
    const stagedSources: number[] = [];
    const stageToken = Symbol();
    for (const column of columns) {
      const rowGroups = this.#groupsByCompiledColumnRows.get(column)!;
      for (let index = 0; index < bucketCount; index++) {
        const start = buckets[index] * bucketSize;
        const end = Math.min(start + bucketSize, column.values.length);
        for (let row = start; row < end; row++) {
          const groups = rowGroups[row];
          if (!groups) continue;
          const sourceValue = column.values[row];
          for (const group of groups) {
            if (group.columnStageToken === stageToken) continue;
            group.columnStageToken = stageToken;
            if (Object.is(group.lastSourceValue, sourceValue)) continue;
            stagedGroups.push(group);
            stagedSources.push(sourceValue);
          }
        }
      }
    }
    const stagedValues: unknown[] = [];
    for (let index = 0; index < stagedGroups.length; index++) {
      stagedValues.push(stagedGroups[index].project!(stagedSources[index]));
    }
    return this.#writeStagedColumnValues(
      stagedGroups,
      stagedSources,
      stagedValues,
    );
  }

  dispose() {
    const errors: unknown[] = [];
    this.#refPublicationEpoch++;
    // Pending attaches belong to an uncommitted publication boundary and are
    // abandoned. Only refs that were already published receive detaches.
    this.#pendingRefs.clear();
    for (const node of this.#committedRefs.keys()) {
      this.#pendingRefs.set(node, null);
    }
    try {
      for (const child of this.#mounted) {
        try {
          removeMountedSubtree(this.#renderHost, this.container, child, errors);
        } catch (error) {
          errors.push(error);
        }
      }
      try {
        this.flushRefs();
      } catch (error) {
        errors.push(error);
      }
    } finally {
      // Host cleanup can fail partway through. The root still relinquishes all
      // retained VDOM and binding ownership so a failed candidate can remount.
      this.#mounted = [];
      this.#snapshot = [];
      this.#snapshotDirty = false;
      this.#nodesByKey.clear();
      this.#nodesByKeyedRegion.clear();
      this.#groupsBySource.clear();
      this.#incompatibleScalarBindingGroups = 0;
      this.#groupsByCompiledBinding.clear();
      this.#groupsByCompiledSource.clear();
      this.#groupsByCompiledColumnBinding.clear();
      this.#groupsByCompiledColumn.clear();
      this.#groupsByCompiledColumnRows.clear();
      this.#compiledSlotBySource.clear();
      this.#compiledGraph = null;
      this.#directBindingWrites = false;
      this.#pendingRefs.clear();
      this.#committedRefs.clear();
    }
    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        "VDOM root disposal encountered host errors",
      );
    }
  }

  #withNumericWriteGuard<T>(operation: () => T): T {
    if (this.#numericWriteInProgress) {
      throw new Error("Nested numeric VDOM writes are not supported");
    }
    this.#numericWriteInProgress = true;
    try {
      return operation();
    } finally {
      this.#numericWriteInProgress = false;
    }
  }

  #writeStagedColumnValues(
    groups: readonly BoundPropGroup<H>[],
    sourceValues: readonly number[],
    nextValues: readonly unknown[],
  ) {
    let wrote = false;
    for (let index = 0; index < groups.length; index++) {
      const group = groups[index];
      const sourceValue = sourceValues[index];
      const next = nextValues[index];
      if (sameBoundValueCanSkipWrite(group.lastValue, next, group.forceWrite)) {
        group.lastSourceValue = sourceValue;
        continue;
      }
      if (group.styleProperty !== undefined && this.#renderHost.setStyleProp) {
        this.#renderHost.setStyleProp(
          group.handle,
          group.styleProperty,
          next,
          group.lastValue,
        );
      } else if (group.styleProperty !== undefined) {
        this.#renderHost.setProp(group.handle, "style", {
          [group.styleProperty]: next,
        }, { [group.styleProperty]: group.lastValue });
      } else {
        this.#renderHost.setProp(
          group.handle,
          group.name,
          next,
          group.lastValue,
        );
      }
      group.lastSourceValue = sourceValue;
      group.lastValue = next;
      wrote = true;
    }
    return wrote;
  }

  #makeScalarBindingGroups(
    node: MountedNode<H>,
    name: string,
    rawValue: unknown,
  ): { groups: BoundPropGroup<H>[]; incompatible: boolean } {
    const incompatible = hasNonScalarBindingMetadata(name, rawValue);
    if (
      this.#directBindingWrites &&
      (name !== "style" || this.#renderHost.setStyleProp)
    ) {
      const entries = name === "style" && typeof rawValue === "object" &&
          rawValue !== null && !Array.isArray(rawValue)
        ? Object.entries(rawValue as Record<string, unknown>)
        : [[undefined, rawValue] as const];
      const groups: BoundPropGroup<H>[] = [];
      for (const [styleProperty, item] of entries) {
        const binding = getBoundValue(item);
        if (!binding) continue;
        groups.push({
          handle: node.handle,
          name,
          styleProperty,
          project: binding.project,
          sources: binding.sources ?? [binding.source],
          rawValue: binding,
          lastValue: readBoundValue(binding),
          forceWrite: !!binding.read,
        });
      }
      if (groups.length > 0) return { groups, incompatible };
    }
    const sources = boundSourcesIn(name, rawValue);
    if (sources.length === 0) return { groups: [], incompatible: false };
    return {
      groups: [{
        handle: node.handle,
        name,
        sources,
        rawValue,
        lastValue: materializeProp(name, rawValue),
        forceWrite: hasStableDerivedBinding(rawValue),
      }],
      incompatible,
    };
  }

  #registerScalarBindingProp(
    node: MountedNode<H>,
    name: string,
    rawValue: unknown,
    planned?: { groups: BoundPropGroup<H>[]; incompatible: boolean },
  ) {
    const plan = planned ?? this.#makeScalarBindingGroups(node, name, rawValue);
    const groups = plan.groups;
    if (groups.length === 0) return;
    (node.scalarBindingGroups ??= new Map()).set(name, groups);
    this.#bindingIndexAttachOperations += groups.length;
    if (plan.incompatible) {
      (node.scalarIncompatibleBindingProps ??= new Set()).add(name);
      this.#incompatibleScalarBindingGroups++;
    }
    for (const group of groups) {
      for (const source of group.sources) {
        let list = this.#groupsBySource.get(source);
        if (!list) this.#groupsBySource.set(source, list = new Set());
        const alreadyIndexed = list.has(group);
        list.add(group);
        if (!alreadyIndexed) this.#bindingIndexIndexOperations++;
      }
    }
  }

  #unregisterScalarBindingProp(node: MountedNode<H>, name: string) {
    const groups = node.scalarBindingGroups?.get(name);
    if (groups) {
      let detached = false;
      for (const group of groups) {
        for (const source of group.sources) {
          const list = this.#groupsBySource.get(source);
          if (!list || !list.delete(group)) continue;
          detached = true;
          this.#bindingIndexIndexOperations++;
          if (list.size === 0) this.#groupsBySource.delete(source);
        }
      }
      if (detached) this.#bindingIndexDetachOperations += groups.length;
      node.scalarBindingGroups?.delete(name);
      if (node.scalarBindingGroups?.size === 0) {
        node.scalarBindingGroups = undefined;
      }
    }
    if (node.scalarIncompatibleBindingProps?.delete(name)) {
      this.#incompatibleScalarBindingGroups--;
      if (node.scalarIncompatibleBindingProps.size === 0) {
        node.scalarIncompatibleBindingProps = undefined;
      }
    }
  }

  #refreshScalarBindingProp(
    node: MountedNode<H>,
    name: string,
    rawValue: unknown,
  ) {
    const oldGroups = node.scalarBindingGroups?.get(name) ?? [];
    const oldIncompatible = node.scalarIncompatibleBindingProps?.has(name) ??
      false;
    const plan = this.#makeScalarBindingGroups(node, name, rawValue);
    const nextGroups = plan.groups;
    const nextIncompatible = plan.incompatible;
    const sameMembership = oldGroups.length === nextGroups.length &&
      oldGroups.every((old, index) => {
        const next = nextGroups[index];
        return old.styleProperty === next.styleProperty &&
          old.sources.length === next.sources.length &&
          old.sources.every((source, sourceIndex) =>
            source === next.sources[sourceIndex]
          );
      });
    if (sameMembership) {
      for (let index = 0; index < oldGroups.length; index++) {
        const old = oldGroups[index];
        const next = nextGroups[index];
        old.rawValue = next.rawValue;
        old.project = next.project;
        old.lastValue = next.lastValue;
        old.forceWrite = next.forceWrite;
      }
      if (oldIncompatible !== nextIncompatible) {
        this.#incompatibleScalarBindingGroups += nextIncompatible ? 1 : -1;
      }
      if (nextIncompatible) {
        (node.scalarIncompatibleBindingProps ??= new Set()).add(name);
      } else {
        node.scalarIncompatibleBindingProps?.delete(name);
        if (node.scalarIncompatibleBindingProps?.size === 0) {
          node.scalarIncompatibleBindingProps = undefined;
        }
      }
      return;
    }
    this.#unregisterScalarBindingProp(node, name);
    if (!nextIncompatible) node.scalarIncompatibleBindingProps?.delete(name);
    this.#registerScalarBindingProp(node, name, rawValue, plan);
  }

  #attachScalarBindingNode(node: MountedNode<H>) {
    if (node.vnode.kind !== "element") return;
    for (const [name, rawValue] of Object.entries(node.vnode.props)) {
      this.#registerScalarBindingProp(node, name, rawValue);
    }
  }

  #detachScalarBindingNode(node: MountedNode<H>) {
    if (node.vnode.kind !== "element") return;
    const names = new Set([
      ...node.scalarBindingGroups?.keys() ?? [],
      ...node.scalarIncompatibleBindingProps ?? [],
    ]);
    for (const name of names) this.#unregisterScalarBindingProp(node, name);
  }

  /** Attach ordinary scalar prop writers for only the newly mounted subtree. */
  #attachScalarBindingSubtree(node: MountedNode<H>) {
    const visit = (mounted: MountedNode<H>) => {
      this.#attachScalarBindingNode(mounted);
      forEachMountedChild(mounted, visit);
    };
    visit(node);
  }

  /** Detach writer groups before their hosts leave or change their props. */
  #detachScalarBindingSubtree(node: MountedNode<H>) {
    const visit = (mounted: MountedNode<H>) => {
      this.#detachScalarBindingNode(mounted);
      forEachMountedChild(mounted, visit);
    };
    visit(node);
  }

  #rebuildBindingIndex() {
    let visits = 0;
    const countVisits = this.#profileCounter !== undefined;
    this.#groupsBySource.clear();
    this.#incompatibleScalarBindingGroups = 0;
    this.#groupsByCompiledBinding.clear();
    this.#groupsByCompiledSource.clear();
    this.#groupsByCompiledColumnBinding.clear();
    this.#groupsByCompiledColumn.clear();
    this.#groupsByCompiledColumnRows.clear();
    this.#compiledSlotBySource.clear();
    if (this.#compiledGraph) this.#validateCompiledGraph(this.#compiledGraph);
    const visit = (node: MountedNode<H>) => {
      if (node.hostDisposed) {
        node.scalarBindingGroups = undefined;
        node.scalarIncompatibleBindingProps = undefined;
        return;
      }
      if (countVisits) visits++;
      node.scalarBindingGroups = undefined;
      node.scalarIncompatibleBindingProps = undefined;
      if (node.vnode.kind === "element") {
        for (const [name, rawValue] of Object.entries(node.vnode.props)) {
          if (this.#compiledGraph) {
            for (const binding of compiledBindingsIn(name, rawValue)) {
              const existingSlot = this.#compiledSlotBySource.get(
                binding.source,
              );
              if (
                existingSlot !== undefined &&
                existingSlot !== binding.sourceSlot
              ) {
                throw new Error(
                  "One scalar source cannot occupy multiple slots in a compiled VDOM root",
                );
              }
              this.#compiledSlotBySource.set(
                binding.source,
                binding.sourceSlot,
              );
              const rowStart =
                this.#compiledGraph.sourceBindingOffsets[binding.sourceSlot];
              const rowEnd = this.#compiledGraph
                .sourceBindingOffsets[binding.sourceSlot + 1];
              let found = false;
              for (let edge = rowStart; edge < rowEnd; edge++) {
                if (
                  this.#compiledGraph.bindingIds[edge] === binding.bindingId
                ) found = true;
              }
              if (!found) {
                throw new Error(
                  `Compiled binding ${binding.bindingId} is absent from source slot ${binding.sourceSlot}`,
                );
              }
              let byBinding = this.#groupsByCompiledBinding.get(binding.source);
              if (!byBinding) {
                this.#groupsByCompiledBinding.set(
                  binding.source,
                  byBinding = new Map(),
                );
              }
              const column = binding.binding!.column;
              const columnIndex = binding.binding!.entityIndex;
              if (
                column && (!Number.isInteger(columnIndex) || columnIndex! < 0)
              ) {
                throw new Error(
                  "Compiled column binding has an invalid entity index",
                );
              }
              const group: BoundPropGroup<H> = {
                handle: node.handle,
                name,
                styleProperty: binding.styleProperty,
                project: binding.binding!.project,
                ...(column
                  ? {
                    column,
                    columnIndex,
                    lastSourceValue: column.values[columnIndex!],
                  }
                  : {}),
                sources: [binding.source],
                rawValue: binding.binding,
                lastValue: column
                  ? binding.binding!.project(column.values[columnIndex!])
                  : binding.binding!.project(binding.source.value),
              };
              const bindingGroups = byBinding.get(binding.bindingId);
              if (bindingGroups) bindingGroups.push(group);
              else byBinding.set(binding.bindingId, [group]);
              if (column) {
                let columnBindings = this.#groupsByCompiledColumnBinding.get(
                  column,
                );
                if (!columnBindings) {
                  this.#groupsByCompiledColumnBinding.set(
                    column,
                    columnBindings = new Map(),
                  );
                }
                const columnGroups = columnBindings.get(binding.bindingId);
                if (columnGroups) columnGroups.push(group);
                else columnBindings.set(binding.bindingId, [group]);
              }
            }
          } else {
            if (
              this.#directBindingWrites &&
              (name !== "style" || this.#renderHost.setStyleProp)
            ) {
              const values = name === "style" && typeof rawValue === "object" &&
                  rawValue !== null && !Array.isArray(rawValue)
                ? Object.entries(rawValue as Record<string, unknown>)
                : [[undefined, rawValue] as const];
              let foundBinding = false;
              for (const [styleProperty, item] of values) {
                const binding = getBoundValue(item);
                if (!binding) continue;
                foundBinding = true;
                const group: BoundPropGroup<H> = {
                  handle: node.handle,
                  name,
                  styleProperty,
                  project: binding.project,
                  rawValue: binding,
                  sources: binding.sources ?? [binding.source],
                  lastValue: readBoundValue(binding),
                  forceWrite: !!binding.read,
                };
                const groups = node.scalarBindingGroups?.get(name) ?? [];
                groups.push(group);
                (node.scalarBindingGroups ??= new Map()).set(name, groups);
                for (const source of binding.sources ?? [binding.source]) {
                  const list = this.#groupsBySource.get(source);
                  if (list) list.add(group);
                  else this.#groupsBySource.set(source, new Set([group]));
                }
              }
              if (foundBinding) {
                if (hasNonScalarBindingMetadata(name, rawValue)) {
                  this.#incompatibleScalarBindingGroups++;
                  (node.scalarIncompatibleBindingProps ??= new Set()).add(name);
                }
                continue;
              }
            }
            const sources = boundSourcesIn(name, rawValue);
            if (sources.length === 0) continue;
            const values = name === "style" && typeof rawValue === "object" &&
                rawValue !== null && !Array.isArray(rawValue)
              ? Object.values(rawValue as Record<string, unknown>)
              : [rawValue];
            if (
              values.some((item) => {
                const binding = getBoundValue(item);
                return !!binding && (
                  binding.bindingId !== undefined ||
                  binding.sourceSlot !== undefined ||
                  binding.column !== undefined
                );
              })
            ) {
              this.#incompatibleScalarBindingGroups++;
              (node.scalarIncompatibleBindingProps ??= new Set()).add(name);
            }
            const group: BoundPropGroup<H> = {
              handle: node.handle,
              name,
              sources,
              rawValue,
              lastValue: materializeProp(name, rawValue),
              forceWrite: hasStableDerivedBinding(rawValue),
            };
            (node.scalarBindingGroups ??= new Map()).set(name, [group]);
            for (const source of sources) {
              const list = this.#groupsBySource.get(source);
              if (list) list.add(group);
              else this.#groupsBySource.set(source, new Set([group]));
            }
          }
        }
      }
      forEachMountedChild(node, visit);
    };
    for (const node of this.#mounted) visit(node);
    if (countVisits) {
      this.#profileCounter?.({
        "vdom.binding-index.full-rebuild-visits": visits,
      });
    }
    if (this.#compiledGraph) {
      for (const [source, byBinding] of this.#groupsByCompiledBinding) {
        const slot = this.#compiledSlotBySource.get(source)!;
        const groups: BoundPropGroup<H>[] = [];
        const start = this.#compiledGraph.sourceBindingOffsets[slot];
        const end = this.#compiledGraph.sourceBindingOffsets[slot + 1];
        for (let edge = start; edge < end; edge++) {
          const bindingGroups = byBinding.get(
            this.#compiledGraph.bindingIds[edge],
          );
          if (bindingGroups) groups.push(...bindingGroups);
        }
        if (groups.length > 0) this.#groupsByCompiledSource.set(source, groups);
      }
      for (
        const [column, byBinding] of this.#groupsByCompiledColumnBinding
      ) {
        const groups: BoundPropGroup<H>[] = [];
        const rowGroups: Array<BoundPropGroup<H>[] | undefined> = [];
        const start = this.#compiledGraph.sourceBindingOffsets[
          column.sourceSlot
        ];
        const end = this.#compiledGraph.sourceBindingOffsets[
          column.sourceSlot + 1
        ];
        for (let edge = start; edge < end; edge++) {
          const bindingGroups = byBinding.get(
            this.#compiledGraph.bindingIds[edge],
          );
          if (bindingGroups) {
            for (const group of bindingGroups) {
              groups.push(group);
              const row = group.columnIndex!;
              const indexed = rowGroups[row];
              if (indexed) indexed.push(group);
              else rowGroups[row] = [group];
            }
          }
        }
        if (groups.length > 0) {
          this.#groupsByCompiledColumn.set(column, groups);
          this.#groupsByCompiledColumnRows.set(column, rowGroups);
        }
      }
    }
  }

  #clearBindingIndex() {
    this.#groupsBySource.clear();
    this.#incompatibleScalarBindingGroups = 0;
    this.#groupsByCompiledBinding.clear();
    this.#groupsByCompiledSource.clear();
    this.#groupsByCompiledColumnBinding.clear();
    this.#groupsByCompiledColumn.clear();
    this.#groupsByCompiledColumnRows.clear();
    this.#compiledSlotBySource.clear();
    const clear = (node: MountedNode<H>) => {
      node.scalarBindingGroups = undefined;
      node.scalarIncompatibleBindingProps = undefined;
      forEachMountedChild(node, clear);
    };
    for (const node of this.#mounted) clear(node);
  }

  #rebuildKeyIndex() {
    this.#nodesByKey.clear();
    this.#nodesByKeyedRegion.clear();
    let visits = 0;
    const countVisits = this.#profileCounter !== undefined;
    const visit = (node: MountedNode<H>) => {
      if (node.hostDisposed) return;
      if (countVisits) visits++;
      this.#addToKeyIndex(node);
      forEachMountedChild(node, visit);
    };
    for (const node of this.#mounted) visit(node);
    if (countVisits) {
      this.#profileCounter?.({ "vdom.key-index.full-rebuild-visits": visits });
    }
  }

  #addToKeyIndex(node: MountedNode<H>) {
    const key = node.vnode.key;
    if (key !== null) {
      let set = this.#nodesByKey.get(key);
      if (!set) this.#nodesByKey.set(key, set = new Set());
      set.add(node);
    }
    if (node.vnode.kind === "element" && node.vnode.keyedRegionId !== null) {
      let set = this.#nodesByKeyedRegion.get(node.vnode.keyedRegionId);
      if (!set) {
        this.#nodesByKeyedRegion.set(node.vnode.keyedRegionId, set = new Set());
      }
      set.add(node);
    }
  }

  #removeFromKeyIndex(node: MountedNode<H>) {
    this.#removeKeyFromIndex(node.vnode.key, node);
    if (node.vnode.kind === "element" && node.vnode.keyedRegionId !== null) {
      const set = this.#nodesByKeyedRegion.get(node.vnode.keyedRegionId);
      set?.delete(node);
      if (set?.size === 0) {
        this.#nodesByKeyedRegion.delete(node.vnode.keyedRegionId);
      }
    }
  }

  #removeKeyFromIndex(key: string | null, node: MountedNode<H>) {
    if (key === null) return;
    const set = this.#nodesByKey.get(key);
    set?.delete(node);
    if (set?.size === 0) this.#nodesByKey.delete(key);
  }

  #validateCompiledGraph(graph: CompiledVDOMBindingGraph) {
    if (
      !Number.isInteger(graph.sourceCount) || graph.sourceCount < 0 ||
      graph.sourcePaths.length !== graph.sourceCount ||
      graph.sourceBindingOffsets.length !== graph.sourceCount + 1 ||
      graph.sourceBindingOffsets[0] !== 0 ||
      graph.sourceBindingOffsets[graph.sourceCount] !== graph.bindingIds.length
    ) {
      throw new Error("Malformed compiled VDOM dependency graph");
    }
    for (let slot = 0; slot < graph.sourceCount; slot++) {
      if (
        !Number.isInteger(graph.sourceBindingOffsets[slot]) ||
        graph.sourceBindingOffsets[slot] > graph.sourceBindingOffsets[slot + 1]
      ) {
        throw new Error(`Malformed compiled VDOM source range at slot ${slot}`);
      }
    }
  }
}

export const createVDOMSnapshotRoot = <H, Parent = H>(
  host: VDOMHost<H, Parent>,
  container: Parent,
) => new VDOMSnapshotRoot(host, container);

export type MemoryNode = {
  readonly id: number;
  kind: "element" | "text";
  tag: string | null;
  text: string | null;
  props: Record<string, unknown>;
  children: MemoryNode[];
  parent: MemoryNode | null;
};

export class MemoryVDOMHost implements VDOMHost<MemoryNode, MemoryNode> {
  #nextId = 0;
  writeCount = 0;
  placementCount = 0;
  removalCount = 0;

  createContainer(): MemoryNode {
    return this.#node("element", "#root");
  }

  createElement(
    tag: string,
    _parent?: MemoryNode,
    _creationProps?: Readonly<Record<string, unknown>>,
  ) {
    return this.#node("element", tag);
  }

  createText(text: string) {
    const node = this.#node("text", null);
    node.text = text;
    return node;
  }

  setText(node: MemoryNode, text: string) {
    this.writeCount++;
    node.text = text;
  }

  setProp(
    node: MemoryNode,
    name: string,
    value: unknown,
    _previous?: unknown,
  ) {
    this.writeCount++;
    if (value === undefined || value === null || value === false) {
      delete node.props[name];
    } else node.props[name] = value;
  }

  setStyleProp(node: MemoryNode, name: string, value: unknown) {
    this.writeCount++;
    const style = (node.props.style ??= {}) as Record<string, unknown>;
    style[name] = value;
  }

  place(parent: MemoryNode, node: MemoryNode, before: MemoryNode | null) {
    this.placementCount++;
    if (node.parent) {
      const oldIndex = node.parent.children.indexOf(node);
      if (oldIndex >= 0) node.parent.children.splice(oldIndex, 1);
    }
    const index = before == null
      ? parent.children.length
      : parent.children.indexOf(before);
    if (index < 0) {
      throw new Error(
        "Insertion anchor is not a child of the destination parent",
      );
    }
    parent.children.splice(index, 0, node);
    node.parent = parent;
  }

  remove(parent: MemoryNode, node: MemoryNode) {
    this.removalCount++;
    const index = parent.children.indexOf(node);
    if (index >= 0) parent.children.splice(index, 1);
    node.parent = null;
  }

  serialize(node: MemoryNode): unknown {
    return node.kind === "text" ? { id: node.id, text: node.text } : {
      id: node.id,
      tag: node.tag,
      props: { ...node.props },
      children: node.children.map((child) => this.serialize(child)),
    };
  }

  findByProp(
    root: MemoryNode,
    name: string,
    value: unknown,
  ): MemoryNode | null {
    if (Object.is(root.props[name], value)) return root;
    for (const child of root.children) {
      const found = this.findByProp(child, name, value);
      if (found) return found;
    }
    return null;
  }

  #node(kind: MemoryNode["kind"], tag: string | null): MemoryNode {
    return {
      id: this.#nextId++,
      kind,
      tag,
      text: null,
      props: {},
      children: [],
      parent: null,
    };
  }
}

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";

// JSX spellings which map to hyphenated SVG attributes. Unknown names retain
// their spelling because SVG has case-sensitive native and extension attrs.
const SVG_ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
  accentHeight: "accent-height",
  alignmentBaseline: "alignment-baseline",
  baselineShift: "baseline-shift",
  clipPath: "clip-path",
  clipRule: "clip-rule",
  colorInterpolation: "color-interpolation",
  colorInterpolationFilters: "color-interpolation-filters",
  dominantBaseline: "dominant-baseline",
  enableBackground: "enable-background",
  fillOpacity: "fill-opacity",
  fillRule: "fill-rule",
  floodColor: "flood-color",
  floodOpacity: "flood-opacity",
  fontFamily: "font-family",
  fontSize: "font-size",
  fontSizeAdjust: "font-size-adjust",
  fontStretch: "font-stretch",
  fontStyle: "font-style",
  fontVariant: "font-variant",
  fontWeight: "font-weight",
  glyphOrientationHorizontal: "glyph-orientation-horizontal",
  glyphOrientationVertical: "glyph-orientation-vertical",
  letterSpacing: "letter-spacing",
  lightingColor: "lighting-color",
  markerEnd: "marker-end",
  markerMid: "marker-mid",
  markerStart: "marker-start",
  paintOrder: "paint-order",
  pointerEvents: "pointer-events",
  shapeRendering: "shape-rendering",
  stopColor: "stop-color",
  stopOpacity: "stop-opacity",
  strokeDasharray: "stroke-dasharray",
  strokeDashoffset: "stroke-dashoffset",
  strokeLinecap: "stroke-linecap",
  strokeLinejoin: "stroke-linejoin",
  strokeMiterlimit: "stroke-miterlimit",
  strokeOpacity: "stroke-opacity",
  strokeWidth: "stroke-width",
  textAnchor: "text-anchor",
  textDecoration: "text-decoration",
  textRendering: "text-rendering",
  transformOrigin: "transform-origin",
  vectorEffect: "vector-effect",
  wordSpacing: "word-spacing",
  writingMode: "writing-mode",
};

const svgAttributeName = (name: string) => SVG_ATTRIBUTE_NAMES[name] ?? name;

const writeStyle = (
  style: CSSStyleDeclaration,
  name: string,
  value: unknown,
) => {
  if (name.startsWith("--")) {
    if (value == null) style.removeProperty(name);
    else style.setProperty(name, String(value));
  } else {
    (style as any)[name] = value == null ? "" : String(value);
  }
};

export class DOMVDOMHost implements VDOMHost<Node, Node> {
  createElement(tag: string, parent?: Node) {
    if (tag.toLowerCase() === "svg") {
      return document.createElementNS(SVG_NAMESPACE, tag);
    }
    const parentElement = parent instanceof Element ? parent : null;
    const parentIsSvg = parentElement?.namespaceURI === SVG_NAMESPACE;
    const parentIsForeignObject = parentIsSvg &&
      parentElement?.localName === "foreignObject";
    if (parentIsSvg && !parentIsForeignObject) {
      return document.createElementNS(SVG_NAMESPACE, tag);
    }
    return document.createElement(tag);
  }

  createText(text: string) {
    return document.createTextNode(text);
  }

  setText(node: Node, text: string) {
    node.textContent = text;
  }

  setProp(node: Node, name: string, value: unknown, previous: unknown) {
    if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;
    if (name === "style") {
      const before = (previous ?? {}) as Record<string, unknown>;
      const after = (value ?? {}) as Record<string, unknown>;
      for (
        const key of new Set([...Object.keys(before), ...Object.keys(after)])
      ) {
        if (Object.is(before[key], after[key])) continue;
        writeStyle(node.style, key, after[key]);
      }
      return;
    }
    if (/^on[A-Z]/.test(name)) {
      const eventName = name.slice(2).toLowerCase();
      if (typeof previous === "function") {
        node.removeEventListener(eventName, previous as EventListener);
      }
      if (typeof value === "function") {
        node.addEventListener(eventName, value as EventListener);
      }
      return;
    }
    if (name === "className") {
      if (node instanceof HTMLElement) node.className = String(value ?? "");
      else node.setAttribute("class", String(value ?? ""));
      return;
    }
    if (name.startsWith("aria-") || name.startsWith("data-")) {
      if (value == null) node.removeAttribute(name);
      else node.setAttribute(name, String(value));
      return;
    }
    if (node instanceof SVGElement) {
      if (name === "xlinkHref") {
        if (value == null || value === false) {
          node.removeAttributeNS(XLINK_NAMESPACE, "href");
        } else {
          node.setAttributeNS(XLINK_NAMESPACE, "xlink:href", String(value));
        }
        return;
      }
      const attribute = svgAttributeName(name);
      if (value == null || value === false) node.removeAttribute(attribute);
      else node.setAttribute(attribute, value === true ? "" : String(value));
      return;
    }
    if (name === "htmlFor" && node instanceof HTMLLabelElement) {
      node.htmlFor = String(value ?? "");
      return;
    }
    // Live form properties do not necessarily reflect their attributes.
    // Removing `checked` alone cannot undo a prior property assignment.
    if (
      name === "value" &&
      (node instanceof HTMLInputElement ||
        node instanceof HTMLTextAreaElement ||
        node instanceof HTMLSelectElement)
    ) {
      const next = value == null ? "" : String(value);
      if (node.value !== next) node.value = next;
      if (value == null) node.removeAttribute(name);
      return;
    }
    if (
      (value == null || value === false) && name in node &&
      typeof (node as any)[name] === "boolean"
    ) {
      (node as any)[name] = false;
      node.removeAttribute(name);
    } else if (value == null || value === false) {
      node.removeAttribute(name);
    } else if (
      name in node && !name.startsWith("aria-") && !name.startsWith("data-")
    ) {
      (node as any)[name] = value;
    } else {
      node.setAttribute(name, value === true ? "" : String(value));
    }
  }

  setStyleProp(node: Node, name: string, value: unknown) {
    if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;
    writeStyle(node.style, name, value);
  }

  place(parent: Node, node: Node, before: Node | null) {
    if (node.parentNode === parent && node.nextSibling === before) return;
    if (
      before === null && node.parentNode === parent && parent.lastChild === node
    ) return;
    parent.insertBefore(node, before);
  }

  remove(parent: Node, node: Node) {
    if (node.parentNode === parent) parent.removeChild(node);
  }
}
