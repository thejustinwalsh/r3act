import {
  Fragment,
  getBoundValue,
  readBoundValue,
  type RuntimeElement,
  type RuntimeNode,
  type NumericColumn,
  type ScalarSource,
} from "./jsx_binding_runtime.ts";

type VText = { kind: "text"; text: string; key: string | null };
type VElement = {
  kind: "element";
  tag: string;
  key: string | null;
  props: Readonly<Record<string, unknown>>;
  children: readonly VNode[];
};
type VNode = VText | VElement;

type MountedNode<H> = {
  vnode: VNode;
  handle: H;
  children: MountedNode<H>[];
  parent: MountedNode<H> | null;
  parentIndex: number;
};

type BoundPropGroup<H> = {
  handle: H;
  name: string;
  styleProperty?: string;
  project?: (value: number) => unknown;
  column?: NumericColumn;
  columnIndex?: number;
  lastSourceValue?: number;
  rawValue: unknown;
  lastValue: unknown;
  forceWrite?: boolean;
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
  createElement(tag: string): H;
  createText(text: string): H;
  setText(node: H, text: string): void;
  setProp(node: H, name: string, value: unknown, previous: unknown): void;
  /** Optional property-level style writer used by compiled bindings. */
  setStyleProp?(node: H, name: string, value: unknown, previous: unknown): void;
  place(parent: Parent, node: H, before: H | null): void;
  remove(parent: Parent, node: H): void;
}

export type PreparedVDOMCommit = { commit(): void };
export type RuntimeProfileCallback = (
  phase: string,
  milliseconds: number,
) => void;

const elementKey = (element: RuntimeElement): string | null => {
  const key = element.props.key;
  return key == null ? null : String(key);
};

const hostProps = (props: Record<string, any>) => {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(props)) {
    if (name === "children" || name === "key" || name === "ref") continue;
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
  const cached = normalizedElementCache.get(input);
  if (cached) return [cached];
  const normalized: VElement = {
    kind: "element",
    tag: input.type,
    key: elementKey(input),
    props: hostProps(input.props),
    children: normalizeMany(input.props.children),
  };
  normalizedElementCache.set(input, normalized);
  return [normalized];
};

const compatible = (left: VNode, right: VNode) =>
  left.kind === right.kind && left.key === right.key &&
  (left.kind === "text" ||
    (right.kind === "element" && left.tag === right.tag));

const validateUniqueKeys = (siblings: readonly VNode[]) => {
  const keys = new Set<string>();
  for (const node of siblings) {
    if (node.key !== null) {
      if (keys.has(node.key)) {
        throw new Error(`Duplicate key in next VDOM children: ${node.key}`);
      }
      keys.add(node.key);
    }
    if (node.kind === "element") validateUniqueKeys(node.children);
  }
};

const releaseMountedListeners = <H, P>(
  host: VDOMHost<H, P>,
  node: MountedNode<H>,
) => {
  if (node.vnode.kind === "element") {
    for (const [name, value] of Object.entries(node.vnode.props)) {
      if (/^on[A-Z]/.test(name) && typeof value === "function") {
        host.setProp(node.handle, name, undefined, value);
      }
    }
  }
  for (const child of node.children) releaseMountedListeners(host, child);
};

const applyProps = <H, P>(
  host: VDOMHost<H, P>,
  handle: H,
  previous: Readonly<Record<string, unknown>>,
  next: Readonly<Record<string, unknown>>,
) => {
  const names = new Set([...Object.keys(previous), ...Object.keys(next)]);
  for (const name of names) {
    const before = materializeProp(name, previous[name]);
    const value = materializeProp(name, next[name]);
    if (!Object.is(before, value)) host.setProp(handle, name, value, before);
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
    if (binding?.sources && binding.sources.length !== 1) {
      throw new Error(
        "Compiled VDOM bindings currently require one source per prop",
      );
    }
    if (
      binding && Number.isInteger(binding.bindingId) &&
      Number.isInteger(binding.sourceSlot)
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

const createMounted = <H, P>(
  host: VDOMHost<H, P>,
  vnode: VNode,
): MountedNode<H> => {
  if (vnode.kind === "text") {
    return {
      vnode,
      handle: host.createText(vnode.text),
      children: [],
      parent: null,
      parentIndex: -1,
    };
  }
  const handle = host.createElement(vnode.tag);
  applyProps(host, handle, {}, vnode.props);
  const children = reconcileChildren(
    host,
    handle as unknown as P,
    [],
    vnode.children,
  );
  const mounted = { vnode, handle, children, parent: null, parentIndex: -1 };
  for (let index = 0; index < children.length; index++) {
    children[index].parent = mounted;
    children[index].parentIndex = index;
  }
  return mounted;
};

const updateMounted = <H, P>(
  host: VDOMHost<H, P>,
  parent: P,
  old: MountedNode<H> | null,
  next: VNode,
): MountedNode<H> => {
  if (old && old.vnode === next) return old;
  if (!old || !compatible(old.vnode, next)) {
    if (old) {
      releaseMountedListeners(host, old);
      host.remove(parent, old.handle);
    }
    const mounted = createMounted(host, next);
    host.place(parent, mounted.handle, null);
    return mounted;
  }
  if (next.kind === "text" && old.vnode.kind === "text") {
    if (old.vnode.text !== next.text) host.setText(old.handle, next.text);
    old.vnode = next;
    return old;
  }
  if (next.kind === "element" && old.vnode.kind === "element") {
    applyProps(host, old.handle, old.vnode.props, next.props);
    old.children = reconcileChildren(
      host,
      old.handle as unknown as P,
      old.children,
      next.children,
    );
    for (let index = 0; index < old.children.length; index++) {
      old.children[index].parent = old;
      old.children[index].parentIndex = index;
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
      updateMounted(host, parent, previous[index], vnode)
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
      ? updateMounted(host, parent, old, next[index])
      : createMounted(host, next[index]);
    if (needsPlacement[index] !== 0) {
      host.place(parent, child.handle, anchor);
    }
    mounted[index] = child;
    anchor = child.handle;
  }
  for (const child of previous) {
    if (!used.has(child)) {
      releaseMountedListeners(host, child);
      host.remove(parent, child.handle);
    }
  }
  return mounted;
};

/** A retained VDOM root whose host changes only when commit() is called. */
export class VDOMSnapshotRoot<H, Parent = H> {
  #mounted: MountedNode<H>[] = [];
  #snapshot: readonly VNode[] = [];
  #nodesByKey = new Map<string, Set<MountedNode<H>>>();
  #groupsBySource = new Map<ScalarSource, BoundPropGroup<H>[]>();
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

  constructor(
    readonly host: VDOMHost<H, Parent>,
    readonly container: Parent,
    readonly profile?: RuntimeProfileCallback,
  ) {}

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
    return this.#snapshot;
  }

  commit(
    tree: RuntimeNode,
    compiledGraph: CompiledVDOMBindingGraph | null = null,
    directBindingWrites = false,
  ) {
    this.prepareCommit(tree, compiledGraph, directBindingWrites).commit();
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
        this.#mounted = reconcileChildren(
          this.host,
          this.container,
          this.#mounted,
          next,
        );
        for (let index = 0; index < this.#mounted.length; index++) {
          this.#mounted[index].parent = null;
          this.#mounted[index].parentIndex = index;
        }
        this.#snapshot = next;
        this.#compiledGraph = compiledGraph;
        this.#directBindingWrites = directBindingWrites;
        this.#rebuildKeyIndex();
        this.#rebuildBindingIndex();
        this.#version++;
      },
    };
  }

  /**
   * Update one globally unique keyed host region without normalizing or
   * reconciling its siblings. Returns false when that fast path is unsafe.
   */
  commitKeyedRegion(key: string, tree: RuntimeNode): boolean {
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

    const previousSubtree: Array<{ node: MountedNode<H>; key: string | null }> =
      [];
    const collect = (node: MountedNode<H>) => {
      previousSubtree.push({ node, key: node.vnode.key });
      for (const child of node.children) collect(child);
    };
    collect(target);
    const parent = target.parent
      ? target.parent.handle as unknown as Parent
      : this.container;
    updateMounted(this.host, parent, target, next);
    this.profile?.("vdom.reconcile-host", performance.now() - started);
    started = this.profile ? performance.now() : 0;
    for (const { node, key: oldKey } of previousSubtree) {
      if (oldKey === null) continue;
      const set = this.#nodesByKey.get(oldKey);
      set?.delete(node);
      if (set?.size === 0) this.#nodesByKey.delete(oldKey);
    }
    const indexSubtree = (node: MountedNode<H>) => {
      const nodeKey = node.vnode.key;
      if (nodeKey !== null) {
        let set = this.#nodesByKey.get(nodeKey);
        if (!set) this.#nodesByKey.set(nodeKey, set = new Set());
        set.add(node);
      }
      for (const child of node.children) indexSubtree(child);
    };
    indexSubtree(target);
    for (let child = target; child.parent; child = child.parent) {
      const ancestor = child.parent;
      if (ancestor.vnode.kind === "element") {
        (ancestor.vnode.children as VNode[])[child.parentIndex] = child.vnode;
      }
    }
    this.#snapshot = this.#mounted.map((node) => node.vnode);
    this.#version++;
    this.#partialCommitCount++;
    this.#partialCommitBatchCount++;
    this.profile?.("vdom.index-snapshot", performance.now() - started);
    return true;
  }

  /**
   * Atomically prepare and patch several disjoint, globally keyed host regions.
   * Returns false without changing the host if any target is missing,
   * incompatible, bound, duplicated, or would collide with a surviving key.
   */
  commitKeyedRegions(
    regions: readonly { key: string; tree: RuntimeNode }[],
  ): boolean {
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
      previousSubtree: MountedNode<H>[];
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
      const previousSubtree: MountedNode<H>[] = [];
      const collect = (node: MountedNode<H>) => {
        replacedNodes.add(node);
        previousSubtree.push(node);
        for (const child of node.children) collect(child);
      };
      collect(target);
      prepared.push({ key: region.key, target, next, previousSubtree });
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

    // All validation is complete. These host operations run in one JS task,
    // so the browser cannot paint an intermediate subset of the batch.
    for (const item of prepared) {
      for (const node of item.previousSubtree) {
        const oldKey = node.vnode.key;
        if (oldKey === null) continue;
        const set = this.#nodesByKey.get(oldKey);
        set?.delete(node);
        if (set?.size === 0) this.#nodesByKey.delete(oldKey);
      }
    }
    for (const item of prepared) {
      const parent = item.target.parent
        ? item.target.parent.handle as unknown as Parent
        : this.container;
      updateMounted(this.host, parent, item.target, item.next);
      const indexSubtree = (node: MountedNode<H>) => {
        const key = node.vnode.key;
        if (key !== null) {
          let set = this.#nodesByKey.get(key);
          if (!set) this.#nodesByKey.set(key, set = new Set());
          set.add(node);
        }
        for (const child of node.children) indexSubtree(child);
      };
      indexSubtree(item.target);
    }
    for (const item of prepared) {
      for (let child = item.target; child.parent; child = child.parent) {
        const ancestor = child.parent;
        if (ancestor.vnode.kind === "element") {
          (ancestor.vnode.children as VNode[])[child.parentIndex] = child.vnode;
        }
      }
    }
    this.#snapshot = this.#mounted.map((node) => node.vnode);
    this.#version++;
    this.#partialCommitCount += prepared.length;
    this.#partialCommitBatchCount++;
    return true;
  }

  /**
   * Update every retained VDOM prop that depends on this source. The VDOM tree
   * is not re-walked; work follows the source-to-prop index built at commit.
   */
  setSource(source: ScalarSource, value: number) {
    return this.setSources([[source, value]]);
  }

  /** Apply source changes as one coherent host-write batch. */
  setSources(updates: readonly (readonly [ScalarSource, number])[]) {
    const nextValues = new Map<ScalarSource, number>();
    for (const [source, value] of updates) nextValues.set(source, value);
    const changed: ScalarSource[] = [];
    for (const [source, value] of nextValues) {
      const groups = this.#compiledGraph
        ? this.#groupsByCompiledSource.get(source)
        : this.#groupsBySource.get(source);
      if (!groups || groups.length === 0) {
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
    for (const group of affected) {
      const directBinding = group.styleProperty === undefined
        ? null
        : getBoundValue(group.rawValue);
      const next = directBinding
        ? readBoundValue(directBinding)
        : materializeProp(group.name, group.rawValue);
      if (!group.forceWrite && Object.is(group.lastValue, next)) continue;
      if (group.styleProperty !== undefined) {
        if (this.host.setStyleProp) {
          this.host.setStyleProp(
            group.handle,
            group.styleProperty,
            next,
            group.lastValue,
          );
        } else {this.host.setProp(group.handle, "style", {
            [group.styleProperty]: next,
          }, { [group.styleProperty]: group.lastValue });}
      } else this.host.setProp(group.handle, group.name, next, group.lastValue);
      group.lastValue = next;
    }
    return true;
  }

  /**
   * Commit changed rows from compiled numeric columns through the binding
   * writers resolved at mount. The caller updates column buffers in place;
   * this path does not build per-row source maps, update tuples, or dedupe sets.
   */
  setColumns(columns: readonly NumericColumn[]) {
    for (const column of columns) {
      const groups = this.#groupsByCompiledColumn.get(column);
      if (!groups || groups.length === 0) {
        throw new Error("Numeric column is not bound in this VDOM root");
      }
      for (const group of groups) {
        if (group.columnIndex! >= column.values.length) {
          throw new Error("Numeric column is shorter than its bound entity rows");
        }
      }
      column.source.value++;
    }
    let wrote = false;
    for (const column of columns) {
      const groups = this.#groupsByCompiledColumn.get(column)!;
      for (const group of groups) {
        const sourceValue = column.values[group.columnIndex!];
        if (Object.is(group.lastSourceValue, sourceValue)) continue;
        const next = group.project!(sourceValue);
        if (!group.forceWrite && Object.is(group.lastValue, next)) {
          group.lastSourceValue = sourceValue;
          continue;
        }
        if (group.styleProperty !== undefined && this.host.setStyleProp) {
          this.host.setStyleProp(
            group.handle,
            group.styleProperty,
            next,
            group.lastValue,
          );
        } else if (group.styleProperty !== undefined) {
          this.host.setProp(group.handle, "style", {
            [group.styleProperty]: next,
          }, { [group.styleProperty]: group.lastValue });
        } else {
          this.host.setProp(group.handle, group.name, next, group.lastValue);
        }
        group.lastSourceValue = sourceValue;
        group.lastValue = next;
        wrote = true;
      }
    }
    return wrote;
  }

  /** Commit only rows in a reusable dirty-row buffer. */
  setColumnRows(
    columns: readonly NumericColumn[],
    rows: Uint32Array,
    rowCount = rows.length,
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
    let wrote = false;
    for (const column of columns) {
      const rowGroups = this.#groupsByCompiledColumnRows.get(column)!;
      for (let index = 0; index < rowCount; index++) {
        const row = rows[index];
        const sourceValue = column.values[row];
        const groups = rowGroups[row]!;
        for (const group of groups) {
          if (Object.is(group.lastSourceValue, sourceValue)) continue;
          const next = group.project!(sourceValue);
          if (!group.forceWrite && Object.is(group.lastValue, next)) {
            group.lastSourceValue = sourceValue;
            continue;
          }
          if (group.styleProperty !== undefined && this.host.setStyleProp) {
            this.host.setStyleProp(group.handle, group.styleProperty, next, group.lastValue);
          } else if (group.styleProperty !== undefined) {
            this.host.setProp(group.handle, "style", {
              [group.styleProperty]: next,
            }, { [group.styleProperty]: group.lastValue });
          } else {
            this.host.setProp(group.handle, group.name, next, group.lastValue);
          }
          group.lastSourceValue = sourceValue;
          group.lastValue = next;
          wrote = true;
        }
      }
    }
    return wrote;
  }

  /** Scan caller-selected contiguous row buckets, skipping unchanged rows. */
  setColumnBuckets(
    columns: readonly NumericColumn[],
    buckets: Uint32Array,
    bucketCount = buckets.length,
    bucketSize = 64,
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
    let wrote = false;
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
            if (Object.is(group.lastSourceValue, sourceValue)) continue;
            const next = group.project!(sourceValue);
            if (!group.forceWrite && Object.is(group.lastValue, next)) {
              group.lastSourceValue = sourceValue;
              continue;
            }
            if (group.styleProperty !== undefined && this.host.setStyleProp) {
              this.host.setStyleProp(group.handle, group.styleProperty, next, group.lastValue);
            } else if (group.styleProperty !== undefined) {
              this.host.setProp(group.handle, "style", {
                [group.styleProperty]: next,
              }, { [group.styleProperty]: group.lastValue });
            } else {
              this.host.setProp(group.handle, group.name, next, group.lastValue);
            }
            group.lastSourceValue = sourceValue;
            group.lastValue = next;
            wrote = true;
          }
        }
      }
    }
    return wrote;
  }

  dispose() {
    for (const child of this.#mounted) {
      releaseMountedListeners(this.host, child);
      this.host.remove(this.container, child.handle);
    }
    this.#mounted = [];
    this.#snapshot = [];
    this.#nodesByKey.clear();
    this.#groupsBySource.clear();
    this.#groupsByCompiledBinding.clear();
    this.#groupsByCompiledSource.clear();
    this.#groupsByCompiledColumnBinding.clear();
    this.#groupsByCompiledColumn.clear();
    this.#groupsByCompiledColumnRows.clear();
    this.#compiledSlotBySource.clear();
    this.#compiledGraph = null;
    this.#directBindingWrites = false;
  }

  #rebuildBindingIndex() {
    this.#groupsBySource.clear();
    this.#groupsByCompiledBinding.clear();
    this.#groupsByCompiledSource.clear();
    this.#groupsByCompiledColumnBinding.clear();
    this.#groupsByCompiledColumn.clear();
    this.#groupsByCompiledColumnRows.clear();
    this.#compiledSlotBySource.clear();
    if (this.#compiledGraph) this.#validateCompiledGraph(this.#compiledGraph);
    const visit = (node: MountedNode<H>) => {
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
              if (column && (!Number.isInteger(columnIndex) || columnIndex! < 0)) {
                throw new Error("Compiled column binding has an invalid entity index");
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
            if (this.#directBindingWrites) {
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
                  lastValue: readBoundValue(binding),
                  forceWrite: !!binding.read,
                };
                for (const source of binding.sources ?? [binding.source]) {
                  const list = this.#groupsBySource.get(source);
                  if (list) list.push(group);
                  else this.#groupsBySource.set(source, [group]);
                }
              }
              if (foundBinding) continue;
            }
            const sources = boundSourcesIn(name, rawValue);
            if (sources.length === 0) continue;
            const group: BoundPropGroup<H> = {
              handle: node.handle,
              name,
              rawValue,
              lastValue: materializeProp(name, rawValue),
              forceWrite: hasStableDerivedBinding(rawValue),
            };
            for (const source of sources) {
              const list = this.#groupsBySource.get(source);
              if (list) list.push(group);
              else this.#groupsBySource.set(source, [group]);
            }
          }
        }
      }
      for (const child of node.children) visit(child);
    };
    for (const node of this.#mounted) visit(node);
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

  #rebuildKeyIndex() {
    this.#nodesByKey.clear();
    const visit = (node: MountedNode<H>) => {
      if (node.vnode.key !== null) {
        let set = this.#nodesByKey.get(node.vnode.key);
        if (!set) this.#nodesByKey.set(node.vnode.key, set = new Set());
        set.add(node);
      }
      for (const child of node.children) visit(child);
    };
    for (const node of this.#mounted) visit(node);
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

  createElement(tag: string) {
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

  setProp(node: MemoryNode, name: string, value: unknown) {
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

export class DOMVDOMHost implements VDOMHost<Node, Node> {
  createElement(tag: string) {
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
    if (name === "style" && node instanceof HTMLElement) {
      const before = (previous ?? {}) as Record<string, unknown>;
      const after = (value ?? {}) as Record<string, unknown>;
      for (
        const key of new Set([...Object.keys(before), ...Object.keys(after)])
      ) {
        if (Object.is(before[key], after[key])) continue;
        if (key.startsWith("--")) {
          if (after[key] == null) node.style.removeProperty(key);
          else node.style.setProperty(key, String(after[key]));
        } else {(node.style as any)[key] = after[key] == null
            ? ""
            : String(after[key]);}
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
    if (name === "htmlFor" && node instanceof HTMLLabelElement) {
      node.htmlFor = String(value ?? "");
      return;
    }
    if (value == null || value === false) {
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
    if (!(node instanceof HTMLElement)) return;
    if (name.startsWith("--")) {
      if (value == null) node.style.removeProperty(name);
      else node.style.setProperty(name, String(value));
    } else (node.style as any)[name] = value == null ? "" : String(value);
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
