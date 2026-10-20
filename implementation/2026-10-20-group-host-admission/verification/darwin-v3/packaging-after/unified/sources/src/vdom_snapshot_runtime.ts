import { evaluateClosedNumericExpression } from "./closed_numeric_expression.ts";
import type {
  HostCopyComparisonScalar,
  HostCopyValueCapture,
  HostPropertyCapability,
} from "./host_property_contract.ts";
import {
  Fragment,
  closedExpressionForBinding,
  canonicalCapturedBindingSourceArray,
  canonicalScalarSourceValue,
  getBoundValue,
  getKeyedOwnerRegionId,
  type NumericColumn,
  readBoundValue,
  type RuntimeElement,
  type RuntimeNode,
  ScalarSource,
} from "./jsx_binding_runtime.ts";
import { KeyedRegionBuckets } from "./keyed_region_buckets.ts";
import { createDOMStylePropWriter } from "./dom_style_writer.ts";
import { snapshotScopedHostProp } from "./scoped_host_values.ts";
import type { ClosedHostOutputValue } from "./closed_host_value.ts";
import {
  type CompiledOwnerUpdatePrimitive,
  type CompiledOwnerUpdateProgram,
  compiledOwnerUpdateProgramFor,
  type CompiledOwnerUpdateRowState,
  type CompiledStateLayout,
  compiledStateLayoutSignature,
  compiledStateLayoutSlot,
  normalizeCompiledStateLayout,
} from "./compiled_state_layout.ts";

type VText = { kind: "text"; text: string; key: string | null };
type VElement = {
  kind: "element";
  tag: string;
  key: string | null;
  props: Readonly<Record<string, unknown>>;
  /** Authored reads for an unbound style whose accepted data was copied into props. */
  scopedSourceProps?: Readonly<Record<string, unknown>>;
  acceptedCopyProps?: Readonly<Record<string, AcceptedCopyValue>>;
  children: readonly VNode[];
  keyedRegionId: string | null;
};
type VNode = VText | VElement;

type AcceptedCopyValue = Readonly<{
  sourceValue: unknown;
  writeValue: unknown;
  comparison: readonly HostCopyComparisonScalar[];
}>;

const captureCopyValue = (capture: HostCopyValueCapture | null, sourceValue: unknown):
  AcceptedCopyValue | null => {
    if (capture === null) return null;
    const fields = Object.getOwnPropertyDescriptors(capture);
    const comparisonSource = fields.comparison?.value;
    const writeValue = fields.writeValue?.value;
    if (fields.kind?.value !== "copy" || !Array.isArray(comparisonSource) ||
      !fields.writeValue || !("value" in fields.writeValue)) {
      throw new TypeError("Invalid host copy capture");
    }
    if (sourceValue !== null &&
      (typeof sourceValue === "object" || typeof sourceValue === "function") &&
      Object.is(writeValue, sourceValue)) {
      throw new TypeError("Host copy capture must own its write value");
    }
    const comparison: HostCopyComparisonScalar[] = [];
    for (const value of comparisonSource) {
      if (value !== null && value !== undefined && typeof value !== "string" &&
        typeof value !== "number" && typeof value !== "boolean" &&
        typeof value !== "bigint") {
        throw new TypeError("Invalid host copy comparison value");
      }
      comparison.push(value);
    }
    return Object.freeze({
      sourceValue,
      writeValue,
      comparison: Object.freeze(comparison),
    });
  };

const sameCopyValue = (a: AcceptedCopyValue, b: AcceptedCopyValue) =>
  a.comparison.length === b.comparison.length &&
  a.comparison.every((value, index) => Object.is(value, b.comparison[index]));

const isCompiledOwnerUpdatePrimitive = (
  value: unknown,
): value is CompiledOwnerUpdatePrimitive =>
  value === null || value === undefined || typeof value === "string" ||
  typeof value === "boolean" || typeof value === "number";

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
  refreshProp?(
    node: MountedNode<H>,
    name: string,
    next: unknown,
    acceptedCopy?: AcceptedCopyValue | null,
  ): void;
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
  lastValueIsCopy?: boolean;
  forceWrite?: boolean;
  columnStageToken?: symbol;
  columnRowsStageEpoch?: number;
  columnRowsScratchIndex?: number;
  sourceColumn?: NumericColumn;
  sourceColumnRow?: number;
  programEpoch?: number;
  styleWriter?: (next: unknown, previous: unknown) => void;
  ownerRowInputs?: number[];
  ownerRowInputSlots?: readonly number[];
  ownerRowProjectInputs?: (values: readonly number[]) => unknown;
  ownerRowCutEpoch?: number;
  pendingPublicationToken?: object;
  pendingPublicationIndex?: number;
  acceptedWriteGeneration?: number;
};

const retainedSourceDeltaBrand: unique symbol = Symbol();

/** An opaque, projected cut over retained compiler-proven scalar writers. */
export interface PreparedRetainedSourceDelta {
  readonly [retainedSourceDeltaBrand]: never;
  readonly readSources: readonly ScalarSource[];
}

export type StorePropDelta = Readonly<{
  key: string;
  tag: string;
  props: readonly (readonly [string, ClosedHostOutputValue])[];
  children?: readonly (Readonly<{ kind: "host"; key: string; tag: string }> |
    Readonly<{ kind: "text"; text: string }>)[];
}>;

const storePropDeltaBrand: unique symbol = Symbol();
export interface PreparedStorePropDelta {
  readonly [storePropDeltaBrand]: never;
}

type StorePropDeltaRecord<H> = {
  readonly targets: readonly {
    node: MountedNode<H>;
    vnode: VElement;
    handle: H;
    parent: MountedNode<H> | null;
    parentIndex: number;
    bucket: KeyedRegionBuckets<MountedNode<H>> | undefined;
    writes: readonly (readonly [string, ClosedHostOutputValue, ClosedHostOutputValue])[];
    next: VElement;
    children?: readonly MountedNode<H>[];
    childVNodes?: readonly VNode[];
    nextChildVNodes?: readonly VNode[];
  }[];
  readonly texts: readonly {
    node: MountedNode<H>;
    vnode: VText;
    next: VText;
    handle: H;
    parent: MountedNode<H>;
    index: number;
  }[];
  readonly writer: VDOMHost<H>["setProp"];
  readonly textWriter: VDOMHost<H>["setText"] | null;
  applied: boolean;
  publicationToken: object | null;
  appliedVersion: number | null;
};

type RetainedSourceDeltaRecord<H> = {
  readonly root: object;
  readonly structuralVersion: number;
  readonly readSources: readonly ScalarSource[];
  readonly readValues: readonly number[];
  readonly groups: readonly BoundPropGroup<H>[];
  readonly generations: readonly number[];
  readonly sourceValues: readonly number[];
  readonly outputs: readonly unknown[];
  applied: boolean;
};

export type PreparedNumericRowProgramSpec = Readonly<{
  owner: number;
  layout: CompiledStateLayout;
  rowIdentity: object;
  row: number;
  generation: number;
  sources: readonly (ScalarSource | undefined)[];
  columns: readonly NumericColumn[];
}>;

const preparedNumericRowProgramBrand: unique symbol = Symbol();
export interface PreparedNumericRowProgram {
  readonly [preparedNumericRowProgramBrand]: never;
}

type PreparedNumericRowProgramRecord<H> = {
  readonly token: PreparedNumericRowProgram;
  readonly root: object;
  readonly owner: number;
  readonly layout: CompiledStateLayout;
  readonly layoutSignature: string;
  readonly rowIdentity: object;
  readonly row: number;
  readonly generation: number;
  /** Caller-owned World vectors are revocable leases, not our cached view. */
  readonly sourceLease: readonly (ScalarSource | undefined)[];
  readonly columnLease: readonly NumericColumn[];
  readonly sources: readonly (ScalarSource | undefined)[];
  readonly columns: readonly NumericColumn[];
  readonly usedSlots: Uint8Array;
  readonly groupsBySlot: readonly (readonly BoundPropGroup<H>[])[];
  readonly ownerUpdateProgram?: CompiledOwnerUpdateProgram;
  readonly sinks?: readonly BoundPropGroup<H>[];
  readonly inputValues: number[];
  readonly changedEpochs: number[];
  readonly changedValues: number[];
  cutEpoch: number;
  seenMask: number;
  active: boolean;
};

type SourceColumnCell = { column: NumericColumn; row: number };

type NumericProgramSourceSlot<H> = {
  source: ScalarSource;
  /** Packed fanout built at activation; frame selection uses indexed loops. */
  groups: BoundPropGroup<H>[];
  eligible: boolean;
  unaryEligible: boolean;
  epoch: number;
  cellProgramGeneration: number;
  cellProgram?: PreparedNumericCellProgramRecord<H>;
  preparedCutEpoch: number;
  preparedCutValue: number;
};

const preparedNumericCellProgramBrand: unique symbol = Symbol();

/** Opaque proof that one source has a current unary numeric writer fanout. */
export interface PreparedNumericCellProgram {
  readonly [preparedNumericCellProgramBrand]: never;
}

type PreparedNumericCellProgramRecord<H> = {
  readonly token: PreparedNumericCellProgram;
  readonly root: object;
  readonly slot: NumericProgramSourceSlot<H>;
  readonly source: ScalarSource;
  readonly column: NumericColumn;
  readonly row: number;
  readonly generation: number;
  groups: BoundPropGroup<H>[] | undefined;
  active: boolean;
};

const safeLayoutSignature = (layout: CompiledStateLayout): string | null => {
  try {
    return compiledStateLayoutSignature(layout);
  } catch {
    return null;
  }
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
  /** Optional stable input and comparison history for a copied property write. */
  capturePropertyValue?(
    node: H,
    name: string,
    next: unknown,
  ): HostCopyValueCapture | null;
  /** Optional observation; generic writes and host lifetime remain authoritative. */
  describePropertyWrite?(
    node: H,
    name: string,
    next: unknown,
  ): HostPropertyCapability;
  /** Optional property-level style writer used by compiled bindings. */
  setStyleProp?(node: H, name: string, value: unknown, previous: unknown): void;
  /**
   * Optionally prepare a property-level writer when a binding group activates.
   * This factory must not mutate the host; its returned function applies one
   * later value using semantics equivalent to setStyleProp.
   */
  prepareStyleProp?(
    node: H,
    name: string,
  ): ((next: unknown, previous: unknown) => void) | undefined;
  place(parent: Parent, node: H, before: H | null): void;
  remove(parent: Parent, node: H): void;
  /** Release resources owned by a host node after its descendants. */
  dispose?(node: H): void;
  /** Resolve a host handle to the public instance exposed through `ref`. */
  getPublicInstance?(node: H): unknown;
}

const hostPropWriter = <H, Parent>(host: VDOMHost<H, Parent>) => {
  let target: object | null = host;
  while (target) {
    const descriptor = Object.getOwnPropertyDescriptor(target, "setProp");
    if (descriptor) {
      return typeof descriptor.value === "function"
        ? descriptor.value as VDOMHost<H, Parent>["setProp"]
        : null;
    }
    target = Object.getPrototypeOf(target);
  }
  return null;
};
const capturedHostMethods = <H, Parent>(host: VDOMHost<H, Parent>) => {
  const names = ["createElement", "createText", "setText", "setProp",
    "capturePropertyValue", "describePropertyWrite", "setStyleProp",
    "prepareStyleProp", "place", "remove", "dispose", "getPublicInstance"] as const;
  const descriptor = (name: string): PropertyDescriptor | null => {
    let target: object | null = host;
    while (target) {
      const found = Object.getOwnPropertyDescriptor(target, name);
      if (found) return found;
      target = Object.getPrototypeOf(target);
    }
    return null;
  };
  try {
    const originals = names.map(descriptor);
    const callable = names.map((name) => (host as unknown as Record<string, unknown>)[name]);
    if (callable.slice(0, 4).some((entry) => typeof entry !== "function") ||
      typeof callable[8] !== "function" || typeof callable[9] !== "function") return null;
    const calls = Object.fromEntries(names.map((name, index) =>
      [name, typeof callable[index] === "function"
        ? (callable[index] as Function).bind(host) : undefined],
    )) as VDOMHost<H, Parent>;
    return { calls, current: () => names.every((name, index) =>
      {
        const before = originals[index];
        const now = descriptor(name);
        return before === null ? now === null : now !== null &&
          before.value === now.value && before.get === now.get &&
          before.set === now.set;
      }) };
  } catch { return null; }
};
const hostCopyCapture = <H, Parent>(host: VDOMHost<H, Parent>) => {
  let target: object | null = host;
  while (target) {
    const descriptor = Object.getOwnPropertyDescriptor(
      target,
      "capturePropertyValue",
    );
    if (descriptor) {
      return typeof descriptor.value === "function"
        ? descriptor.value as NonNullable<VDOMHost<H, Parent>["capturePropertyValue"]>
        : null;
    }
    target = Object.getPrototypeOf(target);
  }
  return null;
};
const hostTextWriter = <H, Parent>(host: VDOMHost<H, Parent>) => {
  let target: object | null = host;
  while (target) {
    const descriptor = Object.getOwnPropertyDescriptor(target, "setText");
    if (descriptor) {
      return typeof descriptor.value === "function"
        ? descriptor.value as VDOMHost<H, Parent>["setText"]
        : null;
    }
    target = Object.getPrototypeOf(target);
  }
  return null;
};

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
  lastIsCopy = false,
  nextIsCopy = false,
) => {
  if (lastIsCopy || nextIsCopy) {
    if (!lastIsCopy || !nextIsCopy || forceWrite) return false;
    const last = lastValue as AcceptedCopyValue;
    const next = nextValue as AcceptedCopyValue;
    return Object.is(last.sourceValue, next.sourceValue) &&
      sameCopyValue(last, next);
  }
  if (!Object.is(lastValue, nextValue)) return false;
  return !forceWrite || nextValue === null ||
    (typeof nextValue !== "object" && typeof nextValue !== "function");
};

export type PreparedVDOMCommit = {
  commit(): void;
  validate(): boolean;
  validatePreparedPrivate(): boolean;
  commitAdmitted(): void;
  discard?(): void;
};
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

export type KeyedRegionDeltaRequest = Readonly<{
  parentKey: string;
  regionId: string;
  operations: readonly KeyedRegionDeltaOperation[];
}>;

export type PreparedKeyedVDOMProgram = {
  readonly scoped: boolean;
  readonly structuralVersionDelta: 0 | 1;
  validate(): boolean;
  validatePreparedPrivate(): boolean;
  validatePostHost(): boolean;
  validatePostHostPrivate(): boolean;
  overlapsRetainedTargets(delta: PreparedRetainedSourceDelta): boolean;
  overlapsStoreTargets(delta: PreparedStorePropDelta): boolean;
  readonly hostKeys?: readonly string[];
  overlapsHostReplacementTargets?(keys: readonly string[]): boolean;
  commit(): void;
  commitAdmitted(): void;
  discard(): void;
};

export type PreparedScopedKeyedRetainedProgram = PreparedKeyedVDOMProgram & {
  readonly readSources: readonly ScalarSource[];
};

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
  // Keyed regions release removed row descriptions after mount; normalization must
  // rebuild children from the RuntimeElement's current input tree.
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

const isPrimitiveOnlyScopedHostProp = (name: string, value: unknown): boolean =>
  name !== "ref" && name !== "style" && !/^on[A-Z]/.test(name) &&
  (value === null || value === undefined || typeof value === "string" ||
    typeof value === "number" || typeof value === "boolean");

const snapshotScopedHostTree = <H>(
  node: VNode,
  mounted?: MountedNode<H>,
): VNode | null => {
  if (node.kind === "text") {
    const copy: VText = { kind: "text", text: node.text, key: node.key };
    return Object.freeze(copy);
  }
  const props: Record<string, unknown> = {};
  const descriptors = Object.getOwnPropertyDescriptors(node.props);
  for (const name of Reflect.ownKeys(descriptors)) {
    if (typeof name !== "string") return null;
    const descriptor = descriptors[name];
    if (!("value" in descriptor)) return null;
    if (mounted && (name === "position" || name === "rotation" ||
      name === "scale") && Array.isArray(descriptor.value) &&
      !Object.isFrozen(descriptor.value)) return null;
    if (node.scopedSourceProps) {
      const source = Object.getOwnPropertyDescriptor(node.scopedSourceProps, name);
      if (!source || !("value" in source) ||
        !snapshotScopedHostProp(node.tag, name, source.value).accepted) {
        return null;
      }
    }
    const snapshot = snapshotScopedHostProp(node.tag, name, descriptor.value);
    if (!snapshot.accepted) return null;
    Object.defineProperty(props, name, { value: snapshot.value, enumerable: true,
      writable: false, configurable: false });
  }
  const children: VNode[] = [];
  const copies = mounted
    ? mountedChildren(mounted).map((child) =>
      snapshotScopedHostTree(child.vnode, child))
    : node.children.map((child) => snapshotScopedHostTree(child));
  for (const copy of copies) {
    if (!copy) return null;
    children.push(copy);
  }
  const copy: VElement = {
    kind: "element",
    tag: node.tag,
    key: node.key,
    props: Object.freeze(props),
    children: Object.freeze(children),
    keyedRegionId: node.keyedRegionId,
  };
  return Object.freeze(copy);
};

const cloneMountedElementVNode = (
  vnode: VElement,
  changes: Pick<VElement, "children">,
): VElement => {
  const copy = { ...vnode, ...changes };
  if (vnode.scopedSourceProps) {
    Object.defineProperty(copy, "scopedSourceProps", {
      value: vnode.scopedSourceProps,
    });
  }
  return copy;
};

const sameMountedElementHeader = (left: VNode, right: VNode): boolean =>
  left.kind === "element" && right.kind === "element" &&
  left.tag === right.tag && left.key === right.key &&
  left.props === right.props &&
  left.keyedRegionId === right.keyedRegionId &&
  left.scopedSourceProps === right.scopedSourceProps &&
  left.acceptedCopyProps === right.acceptedCopyProps;

const matchesAcceptedCopyCandidate = (mounted: VNode, candidate: VNode) =>
  mounted === candidate ||
  (mounted.kind === "element" && candidate.kind === "element" &&
    mounted.acceptedCopyProps !== undefined &&
    candidate.acceptedCopyProps === undefined &&
    mounted.tag === candidate.tag && mounted.key === candidate.key &&
    mounted.props === candidate.props &&
    mounted.children === candidate.children &&
    mounted.keyedRegionId === candidate.keyedRegionId &&
    mounted.scopedSourceProps === candidate.scopedSourceProps);

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

const publicElementSnapshot = (
  vnode: VElement,
  children: readonly VNode[],
): VElement => {
  const snapshot = { ...vnode, children };
  delete snapshot.acceptedCopyProps;
  return snapshot;
};

const serializeMounted = <H>(node: MountedNode<H>): VNode => {
  if (node.vnode.kind === "text") return node.vnode;
  return publicElementSnapshot(
    node.vnode,
    mountedChildren(node).map(serializeMounted),
  );
};

type AcceptedBucketUndo<H> =
  | { kind: "insert"; key: string }
  | {
    kind: "remove";
    key: string;
    child: MountedNode<H>;
    before: string | null;
  }
  | { kind: "move"; key: string; before: string | null }
  | { kind: "replace"; oldKey: string; newKey: string; child: MountedNode<H> };

class AcceptedMountedJournal<H> {
  readonly #before = new WeakMap<MountedNode<H>, {
    vnode: VNode;
    children: MountedNode<H>[];
    keyedChildren?: KeyedRegionBuckets<MountedNode<H>>;
  }>();
  readonly #bucketUndo = new Map<
    KeyedRegionBuckets<MountedNode<H>>,
    AcceptedBucketUndo<H>[]
  >();

  constructor(readonly roots: readonly MountedNode<H>[]) {}

  capture(node: MountedNode<H>, acceptedVNode: VNode = node.vnode) {
    if (this.#before.has(node)) return;
    const vnode = acceptedVNode.kind === "element"
      ? { ...acceptedVNode, children: acceptedVNode.children }
      : acceptedVNode;
    this.#before.set(node, {
      vnode,
      children: node.children,
      keyedChildren: node.keyedChildren,
    });
  }

  record(
    bucket: KeyedRegionBuckets<MountedNode<H>>,
    undo: AcceptedBucketUndo<H>,
  ) {
    let entries = this.#bucketUndo.get(bucket);
    if (!entries) this.#bucketUndo.set(bucket, entries = []);
    entries.push(undo);
  }

  serialize(): readonly VNode[] {
    return this.roots.map((root) => this.#serializeNode(root));
  }

  #children(bucket: KeyedRegionBuckets<MountedNode<H>>): MountedNode<H>[] {
    const entries = [...bucket.entries()];
    const undo = this.#bucketUndo.get(bucket);
    if (undo) {
      const position = (key: string) =>
        entries.findIndex((item) => item.key === key);
      const insertBefore = (
        key: string | null,
        item: { key: string; value: MountedNode<H> },
      ) => {
        const index = key === null ? entries.length : position(key);
        entries.splice(index < 0 ? entries.length : index, 0, item);
      };
      for (let index = undo.length - 1; index >= 0; index--) {
        const operation = undo[index];
        if (operation.kind === "insert") {
          const current = position(operation.key);
          if (current >= 0) entries.splice(current, 1);
        } else if (operation.kind === "remove") {
          insertBefore(operation.before, {
            key: operation.key,
            value: operation.child,
          });
        } else if (operation.kind === "move") {
          const current = position(operation.key);
          if (current < 0) continue;
          const [item] = entries.splice(current, 1);
          if (item) insertBefore(operation.before, item);
        } else {
          const current = position(operation.newKey);
          if (current >= 0) {
            entries[current] = {
              key: operation.oldKey,
              value: operation.child,
            };
          }
        }
      }
    }
    return entries.map((entry) => entry.value);
  }

  #serializeNode(node: MountedNode<H>): VNode {
    const before = this.#before.get(node);
    const vnode = before?.vnode ?? node.vnode;
    if (vnode.kind === "text") return vnode;
    const keyed = before?.keyedChildren ?? node.keyedChildren;
    const children = keyed
      ? this.#children(keyed)
      : before?.children ?? node.children;
    return publicElementSnapshot(
      vnode,
      children.map((child) => this.#serializeNode(child)),
    );
  }
}

const acceptedJournalByHost = new WeakMap<
  object,
  AcceptedMountedJournal<any>
>();

const acceptedJournalForHost = <H, P>(host: VDOMHost<H, P>) =>
  acceptedJournalByHost.get(host as object) as
    | AcceptedMountedJournal<H>
    | undefined;

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
  afterProp?: (
    name: string,
    next: unknown,
    acceptedCopy?: AcceptedCopyValue | null,
  ) => void,
  acceptedBefore?: Readonly<Record<string, unknown>>,
  previousCopies?: Readonly<Record<string, AcceptedCopyValue>>,
) => {
  let writtenStyle: unknown = noStructuredWrite;
  const acceptedCopies: Record<string, AcceptedCopyValue> = Object.create(null);
  const names = new Set([...Object.keys(previous), ...Object.keys(next)]);
  for (const name of names) {
    // Diff against the writer's last committed value: BoundValue may already expose
    // a newer source and would incorrectly suppress this host write.
    const previousWriter = previousWriters?.get(name);
    let boundWholeProp: BoundPropGroup<H> | undefined;
    let before: unknown;
    if (previousWriter?.length) {
      const wholeProp = previousWriter.find((group) =>
        group.styleProperty === undefined
      );
      if (wholeProp) {
        boundWholeProp = wholeProp;
        before = wholeProp.lastValueIsCopy
          ? (wholeProp.lastValue as AcceptedCopyValue).writeValue
          : wholeProp.lastValue;
      } else if (name === "style") {
        const oldStyle = previous[name];
        const style = oldStyle && typeof oldStyle === "object" &&
            !Array.isArray(oldStyle)
          ? { ...(oldStyle as Record<string, unknown>) }
          : {};
        for (const group of previousWriter) {
          if (group.styleProperty !== undefined) {
            style[group.styleProperty] = group.lastValueIsCopy
              ? (group.lastValue as AcceptedCopyValue).writeValue
              : group.lastValue;
          }
        }
        before = style;
      } else {
        before = materializeProp(name, previous[name]);
      }
    } else {
      before = materializeProp(name, previous[name]);
    }
    // Authored previous style still runs in order; the accepted copy governs host diff.
    if (name === "style" && acceptedBefore && !previousWriter?.length) {
      before = materializeProp(name, acceptedBefore[name]);
    }
    let styleHasBinding = false;
    const value = materializeProp(name, next[name], name === "style"
      ? () => { styleHasBinding = true; }
      : undefined);
    const capture = value !== null && typeof value === "object"
      ? host.capturePropertyValue
      : undefined;
    const captured = capture
      ? captureCopyValue(capture.call(host, handle, name, value), value)
      : null;
    if (capture && capture !== host.capturePropertyValue) {
      throw new Error("Host copy capture changed during property write");
    }
    const priorCopy = boundWholeProp
      ? boundWholeProp.lastValueIsCopy
        ? boundWholeProp.lastValue as AcceptedCopyValue
        : undefined
      : previousCopies?.[name];
    if (priorCopy) before = priorCopy.writeValue;
    const changed = captured
      ? !priorCopy || !Object.is(priorCopy.sourceValue, value) ||
        !sameCopyValue(priorCopy, captured)
      : !!priorCopy || !Object.is(before, value);
    if (captured) acceptedCopies[name] = changed ? captured : priorCopy!;
    if (changed) {
      const written = captured ? captured.writeValue : value;
      host.setProp(handle, name, written, before);
      if (name === "style" && !styleHasBinding) writtenStyle = written;
    }
    afterProp?.(name, next[name], acceptedCopies[name] ?? null);
  }
  return { writtenStyle, acceptedCopies: Object.freeze(acceptedCopies) };
};

const noStructuredWrite = Symbol("no structured host write");

const acceptedStructuredVNode = (
  vnode: VElement,
  writtenStyle: unknown,
  acceptedCopies: Readonly<Record<string, AcceptedCopyValue>>,
): VElement => {
  const copyVNode = Object.keys(acceptedCopies).length
    ? { ...vnode, acceptedCopyProps: acceptedCopies }
    : vnode;
  if (writtenStyle === noStructuredWrite || Object.isFrozen(vnode.props)) {
    return copyVNode;
  }
  let snapshot;
  try { snapshot = snapshotScopedHostProp(vnode.tag, "style", writtenStyle); }
  catch { return copyVNode; }
  if (!snapshot.accepted) return copyVNode;
  const props = { ...vnode.props, style: snapshot.value };
  const accepted = { ...copyVNode, props };
  Object.defineProperty(accepted, "scopedSourceProps", { value: vnode.props });
  return accepted;
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

const materializeValue = (value: unknown, bindingSeen?: () => void): unknown => {
  const binding = getBoundValue(value);
  if (binding) bindingSeen?.();
  return binding ? readBoundValue(binding) : value;
};

const materializeProp = (
  name: string,
  value: unknown,
  bindingSeen?: () => void,
): unknown => {
  if (
    name === "style" && typeof value === "object" && value !== null &&
    !Array.isArray(value)
  ) {
    const style = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, styleValue] of Object.entries(style)) {
      output[key] = materializeValue(styleValue, bindingSeen);
    }
    return output;
  }
  return materializeValue(value, bindingSeen);
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
  const { writtenStyle, acceptedCopies } = applyProps(
    host,
    handle,
    {},
    vnode.props,
  );
  const children = reconcileChildren(
    host,
    handle as unknown as P,
    [],
    vnode.children,
    keyIndex,
  );
  const mounted: MountedNode<H> = {
    vnode: acceptedStructuredVNode(vnode, writtenStyle, acceptedCopies),
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
  if (old) acceptedJournalForHost(host)?.capture(old);
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
        acceptedJournalForHost(host)?.record(siblings, {
          kind: "replace",
          oldKey,
          newKey: mounted.vnode.key,
          child: old,
        });
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
    const { writtenStyle, acceptedCopies } = applyProps(
      host,
      old.handle,
      old.vnode.scopedSourceProps ?? old.vnode.props,
      next.props,
      old.scalarBindingGroups,
      keyIndex?.refreshProp
        ? (name, value, acceptedCopy) =>
          keyIndex.refreshProp!(old, name, value, acceptedCopy)
        : undefined,
      old.vnode.scopedSourceProps ? old.vnode.props : undefined,
      old.vnode.acceptedCopyProps,
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
      old.vnode = acceptedStructuredVNode(next, writtenStyle, acceptedCopies);
      if (keyIndex?.attachKey) keyIndex.attachKey(old);
      else keyIndex?.attach?.(old);
      return old;
    }
    old.vnode = acceptedStructuredVNode(next, writtenStyle, acceptedCopies);
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
  // Skip key maps when only props/text change and sibling identity/order are fixed.
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
  #publicationToken: object | null = null;
  #pendingHistoryGroups: BoundPropGroup<H>[] = [];
  #pendingHistoryValues: unknown[] = [];
  #pendingHistorySources: Array<number | undefined> = [];
  #pendingHistoryFlags: number[] = [];
  #acceptedJournal: AcceptedMountedJournal<H> | null = null;
  #publicationFailed = false;
  #acceptedVersion = 0;
  #acceptedSnapshot: readonly VNode[] | null = null;
  #keyedVNodeRetentionParents = new Set<MountedNode<H>>();
  #nodesByKey = new Map<string, Set<MountedNode<H>>>();
  #nodesByKeyedRegion = new Map<string, Set<MountedNode<H>>>();
  // Set membership gives structural detach O(1) even when thousands of rows
  // share one scalar source. Compiled CSR indexes remain dense arrays/maps.
  #groupsBySource = new Map<ScalarSource, Set<BoundPropGroup<H>>>();
  #retainedSourceDeltas = new WeakMap<
    PreparedRetainedSourceDelta,
    RetainedSourceDeltaRecord<H>
  >();
  #storePropDeltas = new WeakMap<PreparedStorePropDelta, StorePropDeltaRecord<H>>();
  #programSourceSlots = new Map<ScalarSource, NumericProgramSourceSlot<H>>();
  #preparedNumericRowPrograms = new WeakMap<
    PreparedNumericRowProgram,
    PreparedNumericRowProgramRecord<H>
  >();
  #activePreparedNumericRowRecords = new Set<
    PreparedNumericRowProgramRecord<H>
  >();
  #numericRowProgramsBySource = new Map<
    ScalarSource,
    { record: PreparedNumericRowProgramRecord<H>; slot: number }
  >();
  #preparedNumericRowByIdentity = new WeakMap<
    object,
    PreparedNumericRowProgramRecord<H>
  >();
  #ownerRowCutEpoch = 0;
  #ownerRowRecordScratch: Array<
    PreparedNumericRowProgramRecord<H> | undefined
  > = [];
  #ownerRowInputRecordScratch: Array<
    PreparedNumericRowProgramRecord<H> | undefined
  > = [];
  #ownerRowRecordCount = 0;
  #ownerRowGroupScratch: Array<BoundPropGroup<H> | undefined> = [];
  #ownerRowGroupRecordScratch: Array<
    PreparedNumericRowProgramRecord<H> | undefined
  > = [];
  #ownerRowValueScratch: unknown[] = [];
  #ownerRowStagedInputIndices = new Uint32Array(0);
  #ownerRowStagedSinkIds = new Uint16Array(0);
  #ownerRowStagedValues: CompiledOwnerUpdatePrimitive[] = [];
  #ownerRowGroupCount = 0;
  #ownerRowExecutionActive = false;
  #ownerRowExecutionCancelled = false;
  #ownerRowWorkVisits = 0;
  #ownerUpdateKernelBatches = 0;
  #ownerUpdateKernelRows = 0;
  #ownerUpdateKernelInputs = 0;
  #ownerUpdateKernelSelectedSinks = 0;
  #ownerUpdateKernelStagedSinks = 0;
  #ownerUpdateGenericFallbackCuts = 0;
  #ownerUpdateGenericProjectors = 0;
  #preparedCellProgramRecords = new WeakMap<
    PreparedNumericCellProgram,
    PreparedNumericCellProgramRecord<H>
  >();
  #preparedCellDirtySlots: Array<NumericProgramSourceSlot<H> | undefined> = [];
  #preparedCellDirtyValues: Array<number | undefined> = [];
  #preparedCellDirtyCount = 0;
  #preparedCellCutEpoch = 0;
  #programSinkSlots: Array<BoundPropGroup<H> | undefined> = [];
  #programSinkSlotByGroup = new Map<BoundPropGroup<H>, number>();
  #programDirtySources: Array<NumericProgramSourceSlot<H> | undefined> = [];
  #programDirtySourceCount = 0;
  #programChangedSources: Array<NumericProgramSourceSlot<H> | undefined> = [];
  #programChangedSourceCount = 0;
  #programAffectedSinks: Array<BoundPropGroup<H> | undefined> = [];
  #programAffectedSinkCount = 0;
  #programOutputValues: unknown[] = [];
  #programOutputCount = 0;
  #programSourceEpoch = 0;
  #programSinkEpoch = 0;
  #programFreeSinkSlots: number[] = [];
  #columnRowsStageEpoch = 0;
  #columnRowsScratchGroups: Array<BoundPropGroup<H> | undefined> = [];
  #columnRowsScratchSources: Array<number | undefined> = [];
  #columnRowsScratchValues: unknown[] = [];
  #columnRowsScratchCount = 0;
  #columnRowsScratchActive = false;
  #columnRowsScratchCancelled = false;
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
  #sourceColumnCells = new Map<ScalarSource, SourceColumnCell>();
  #pendingSourceColumnPrunes = new Set<ScalarSource>();
  #groupsByColumnCell = new Map<
    NumericColumn,
    Map<number, BoundPropGroup<H>[]>
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
  #sourceColumnPruneVisits = 0;
  #incompatibleScalarBindingGroups = 0;
  #profileCounter?: RuntimeCounterCallback;
  #renderHost: VDOMHost<H, Parent>;
  #admittedHostCalls: VDOMHost<H, Parent> | null = null;
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
    const copyCapture = hostCopyCapture(host);
    this.#renderHost = {
      createElement: (tag, parent, props) =>
        this.#admittedHostCalls
          ? this.#admittedHostCalls.createElement(tag, parent, props)
          : host.createElement(tag, parent, props),
      createText: (text) => this.#admittedHostCalls
        ? this.#admittedHostCalls.createText(text) : host.createText(text),
      setText: (node, text) => this.#admittedHostCalls
        ? this.#admittedHostCalls.setText(node, text) : host.setText(node, text),
      setProp: (node, name, value, previous) => {
        if (name === "ref") {
          this.#pendingRefs.set(node, value == null ? null : value as VDOMRef);
        } else {
          if (this.#admittedHostCalls) {
            this.#admittedHostCalls.setProp(node, name, value, previous);
          } else host.setProp(node, name, value, previous);
        }
      },
      capturePropertyValue: copyCapture
        ? (node, name, value) => {
          if (hostCopyCapture(host) !== copyCapture) {
            throw new Error("Host copy capture changed before property write");
          }
          const writer = hostPropWriter(host);
          if (!writer) return null;
          const result = captureCopyValue(
            copyCapture.call(host, node, name, value),
            value,
          );
          if (hostCopyCapture(host) !== copyCapture) {
            throw new Error("Host copy capture changed during property write");
          }
          if (hostPropWriter(host) !== writer) {
            throw new Error("Host property writer changed during copy capture");
          }
          return result && {
            kind: "copy" as const,
            writeValue: result.writeValue,
            comparison: result.comparison,
          };
        }
        : undefined,
      setStyleProp: host.setStyleProp
        ? (node, name, value, previous) =>
          this.#admittedHostCalls
            ? this.#admittedHostCalls.setStyleProp!(node, name, value, previous)
            : host.setStyleProp!(node, name, value, previous)
        : undefined,
      prepareStyleProp: host.prepareStyleProp
        ? (node, name) => this.#admittedHostCalls
          ? this.#admittedHostCalls.prepareStyleProp!(node, name)
          : host.prepareStyleProp!(node, name)
        : undefined,
      place: (parent, node, before) => this.#admittedHostCalls
        ? this.#admittedHostCalls.place(parent, node, before)
        : host.place(parent, node, before),
      remove: (parent, node) => this.#admittedHostCalls
        ? this.#admittedHostCalls.remove(parent, node) : host.remove(parent, node),
      dispose: host.dispose ? (node) => this.#admittedHostCalls
        ? this.#admittedHostCalls.dispose!(node) : host.dispose!(node) : undefined,
      getPublicInstance: host.getPublicInstance
        ? (node) => this.#admittedHostCalls
          ? this.#admittedHostCalls.getPublicInstance!(node)
          : host.getPublicInstance!(node)
        : undefined,
    };
  }

  #withAdmittedHostCalls<T>(calls: VDOMHost<H, Parent>, apply: () => T): T {
    const previous = this.#admittedHostCalls;
    this.#admittedHostCalls = calls;
    try { return apply(); }
    finally { this.#admittedHostCalls = previous; }
  }

  get version() {
    return this.#publicationToken || this.#publicationFailed
      ? this.#acceptedVersion
      : this.#version;
  }

  get appliedVersion() {
    return this.#version;
  }

  beginPublication() {
    if (this.#publicationToken) throw new Error("VDOM publication is active");
    if (this.#publicationFailed) {
      throw new Error("VDOM publication is terminal after partial failure");
    }
    this.#acceptedVersion = this.#version;
    this.#acceptedSnapshot = this.#snapshotDirty ? null : this.#snapshot;
    this.#acceptedJournal = new AcceptedMountedJournal(this.#mounted);
    acceptedJournalByHost.set(
      this.#renderHost as object,
      this.#acceptedJournal,
    );
    this.#publicationToken = {};
  }

  #releaseKeyedVNodeAncestorChildren(parent: MountedNode<H>) {
    for (let ancestor = parent.parent; ancestor; ancestor = ancestor.parent) {
      if (ancestor.vnode.kind === "element" && ancestor.vnode.children.length) {
        ancestor.vnode = cloneMountedElementVNode(ancestor.vnode, { children: [] });
      }
    }
  }

  publishAccepted() {
    if (!this.#publicationToken) {
      throw new Error("No VDOM publication is active");
    }
    for (let index = 0; index < this.#pendingHistoryGroups.length; index++) {
      const group = this.#pendingHistoryGroups[index];
      const flags = this.#pendingHistoryFlags[index];
      if (flags & 1) group.lastSourceValue = this.#pendingHistorySources[index];
      if (flags & 2) {
        group.lastValue = this.#pendingHistoryValues[index];
        group.lastValueIsCopy = !!(flags & 4);
      }
      group.acceptedWriteGeneration =
        (group.acceptedWriteGeneration ?? 0) + 1;
    }
    this.#clearPendingHistory();
    this.#publicationToken = null;
    acceptedJournalByHost.delete(this.#renderHost as object);
    this.#acceptedJournal = null;
    this.#publicationFailed = false;
    this.#acceptedVersion = this.#version;
    this.#acceptedSnapshot = null;
    for (const parent of this.#keyedVNodeRetentionParents) {
      this.#releaseKeyedVNodeAncestorChildren(parent);
    }
    this.#keyedVNodeRetentionParents.clear();
  }

  failPublication() {
    if (this.#publicationToken) {
      this.#clearPendingHistory();
      this.#publicationToken = null;
      acceptedJournalByHost.delete(this.#renderHost as object);
      this.#publicationFailed = true;
      this.#keyedVNodeRetentionParents.clear();
    }
  }

  cancelPublication() {
    this.#clearPendingHistory();
    this.#publicationToken = null;
    acceptedJournalByHost.delete(this.#renderHost as object);
    this.#acceptedJournal = null;
    this.#acceptedSnapshot = null;
    this.#keyedVNodeRetentionParents.clear();
  }

  #effectiveLastValue(group: BoundPropGroup<H>): unknown {
    const index = this.#pendingHistoryIndex(group);
    return index !== null && (this.#pendingHistoryFlags[index] & 2)
      ? this.#pendingHistoryValues[index]
      : group.lastValue;
  }

  #effectiveLastValueIsCopy(group: BoundPropGroup<H>): boolean {
    const index = this.#pendingHistoryIndex(group);
    return index !== null && (this.#pendingHistoryFlags[index] & 2)
      ? !!(this.#pendingHistoryFlags[index] & 4)
      : !!group.lastValueIsCopy;
  }

  #effectiveLastSourceValue(group: BoundPropGroup<H>): number | undefined {
    const index = this.#pendingHistoryIndex(group);
    return index !== null && (this.#pendingHistoryFlags[index] & 1)
      ? this.#pendingHistorySources[index]
      : group.lastSourceValue;
  }

  #stageLastValue(
    group: BoundPropGroup<H>,
    value: unknown,
    isCopy = false,
  ) {
    if (!this.#publicationToken) {
      group.lastValue = value;
      group.lastValueIsCopy = isCopy;
      group.acceptedWriteGeneration =
        (group.acceptedWriteGeneration ?? 0) + 1;
      return;
    }
    const index = this.#stageHistoryIndex(group);
    this.#pendingHistoryValues[index] = value;
    this.#pendingHistoryFlags[index] =
      (this.#pendingHistoryFlags[index] & ~4) | 2 | (isCopy ? 4 : 0);
  }

  #prepareBoundCopy(
    group: BoundPropGroup<H>,
    next: unknown,
  ): AcceptedCopyValue | null {
    if (group.styleProperty !== undefined) return null;
    const capture = next !== null && typeof next === "object"
      ? this.#renderHost.capturePropertyValue
      : undefined;
    if (!capture) return null;
    const result = captureCopyValue(
      capture.call(this.#renderHost, group.handle, group.name, next),
      next,
    );
    if (capture !== this.#renderHost.capturePropertyValue) {
      throw new Error("Host copy capture changed during binding write");
    }
    if (group.sources.some((source) => this.#compiledGraph
      ? !this.#groupsByCompiledSource.get(source)?.includes(group)
      : !this.#groupsBySource.get(source)?.has(group))) {
      throw new Error("Bound host copy writer changed during capture");
    }
    return result;
  }

  #stageLastSourceValue(group: BoundPropGroup<H>, value: number | undefined) {
    if (!this.#publicationToken) {
      group.lastSourceValue = value;
      return;
    }
    const index = this.#stageHistoryIndex(group);
    this.#pendingHistorySources[index] = value;
    this.#pendingHistoryFlags[index] |= 1;
  }

  #pendingHistoryIndex(group: BoundPropGroup<H>): number | null {
    return this.#publicationToken &&
        group.pendingPublicationToken === this.#publicationToken
      ? group.pendingPublicationIndex!
      : null;
  }

  #stageHistoryIndex(group: BoundPropGroup<H>): number {
    const existing = this.#pendingHistoryIndex(group);
    if (existing !== null) return existing;
    const index = this.#pendingHistoryGroups.length;
    group.pendingPublicationToken = this.#publicationToken!;
    group.pendingPublicationIndex = index;
    this.#pendingHistoryGroups.push(group);
    this.#pendingHistoryValues.push(undefined);
    this.#pendingHistorySources.push(undefined);
    this.#pendingHistoryFlags.push(0);
    return index;
  }

  #clearPendingHistory() {
    for (const group of this.#pendingHistoryGroups) {
      delete group.pendingPublicationToken;
      delete group.pendingPublicationIndex;
    }
    this.#pendingHistoryGroups.length = 0;
    this.#pendingHistoryValues.length = 0;
    this.#pendingHistorySources.length = 0;
    this.#pendingHistoryFlags.length = 0;
  }

  get partialCommitCount() {
    return this.#partialCommitCount;
  }

  get partialCommitBatchCount() {
    return this.#partialCommitBatchCount;
  }

  /** A read-only, host-neutral description of the latest committed tree. */
  get snapshot(): readonly unknown[] {
    if (this.#publicationToken || this.#publicationFailed) {
      return this.#acceptedSnapshot ??= this.#acceptedJournal?.serialize() ??
        [];
    }
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

  /** Stop pending attaches without tearing down the active host batch. */
  cancelPendingRefAttachments() {
    this.#refPublicationEpoch++;
    this.#pendingRefs.clear();
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

    const preparedVersion = this.#version;
    const hostMethods = capturedHostMethods(this.host);
    let committed = false;
    const prepared: PreparedVDOMCommit = {
      validate: () => !committed && !this.#publicationFailed &&
        this.#version === preparedVersion &&
        (hostMethods === null || hostMethods.current()),
      validatePreparedPrivate: () => !committed && !this.#publicationFailed &&
        this.#version === preparedVersion && hostMethods !== null,
      commitAdmitted: () => {
        if (!prepared.validatePreparedPrivate()) {
          throw new Error("Prepared VDOM commit is stale");
        }
        this.#withAdmittedHostCalls(hostMethods!.calls, () => prepared.commit());
      },
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
                    acceptedCopy?: AcceptedCopyValue | null,
                  ) => this.#refreshScalarBindingProp(
                    node,
                    name,
                    value,
                    acceptedCopy,
                  ),
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
          // Re-index reachable live records only: cleanup may dispose mounted records,
          // and candidate nodes may not belong to the retained tree.
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
        this.#pruneSourceColumnCells();
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
    return prepared;
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
    const committed = this.#commitKeyedRegionDelta(
      parentKey,
      regionId,
      operations,
    );
    if (committed) this.#pruneSourceColumnCells();
    return committed;
  }

  #commitKeyedRegionDelta(
    parentKey: string,
    regionId: string,
    operations: readonly KeyedRegionDeltaOperation[],
    incrementVersion = true,
    preparedNodes?: ReadonlyMap<KeyedRegionDeltaOperation, VNode>,
  ): boolean {
    if (
      !parentKey || !regionId ||
      // Sparse deltas use the ScalarSource/BoundValue index; compiled CSR and
      // direct-column writers retain their separate fallback.
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
      // Use the keyed host root: a mounted component root may be nested in the app
      // tree, so the outermost mounted node is not the delta root.
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
          const roots = preparedNodes?.has(operation)
            ? [preparedNodes.get(operation)!]
            : normalizeMany(operation.tree);
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
          const roots = preparedNodes?.has(operation)
            ? [preparedNodes.get(operation)!]
            : normalizeMany(operation.tree);
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
    const acceptedJournal = acceptedJournalForHost(this.#renderHost);
    for (let index = 0; index < operations.length; index++) {
      const operation = operations[index];
      if (operation.type === "remove") {
        const child = region.get(operation.key)!;
        acceptedJournal?.record(region, {
          kind: "remove",
          key: operation.key,
          child,
          before: region.afterKey(operation.key),
        });
        region.remove(operation.key);
        visitMountedSubtree(child, keyIndex.detach);
        this.#detachScalarBindingSubtree(child);
        removeMountedSubtree(this.#renderHost, hostParent, child);
      } else if (operation.type === "move") {
        if (operation.key === operation.beforeKey) continue;
        const child = region.get(operation.key)!;
        acceptedJournal?.record(region, {
          kind: "move",
          key: operation.key,
          before: region.afterKey(operation.key),
        });
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
        acceptedJournal?.record(region, {
          kind: "insert",
          key: operation.key,
        });
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
    // The mounted bucket owns row order; accepted publication retires
    // ancestor child arrays after post-host validation.
    acceptedJournal?.capture(parent);
    const releasedChildVNodeCount = parent.vnode.children.length;
    parent.vnode = cloneMountedElementVNode(parent.vnode, { children: [] });
    if (this.#publicationToken) this.#keyedVNodeRetentionParents.add(parent);
    else this.#releaseKeyedVNodeAncestorChildren(parent);
    this.#snapshot = [];
    this.#snapshotDirty = true;
    if (incrementVersion) this.#version++;
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

  prepareKeyedRegionDelta(
    parentKey: string,
    regionId: string,
    operations: readonly KeyedRegionDeltaOperation[],
  ): PreparedKeyedVDOMProgram | null {
    return this.prepareKeyedRegionDeltas([{ parentKey, regionId, operations }]);
  }

  /** Prepare keyed sparse edits and keyed leaf replacements as one host phase. */
  prepareKeyedRegionDeltas(
    deltas: readonly KeyedRegionDeltaRequest[],
    regions: readonly { key: string; tree: RuntimeNode }[] = [],
    options: { scoped?: boolean } = {},
  ): PreparedKeyedVDOMProgram | null {
    return this.#prepareKeyedRegionDeltas(deltas, regions, options, false);
  }

  #prepareKeyedRegionDeltas(
    deltas: readonly KeyedRegionDeltaRequest[],
    regions: readonly { key: string; tree: RuntimeNode }[],
    options: { scoped?: boolean },
    deferVersion: boolean,
    postHostStore: PreparedStorePropDelta | null = null,
  ): PreparedKeyedVDOMProgram | null {
    const baseVersion = this.#version;
    const scoped = options.scoped === true;
    const admittedHost = capturedHostMethods(this.host);
    deferVersion &&= scoped;
    const methodNames = ["createElement", "createText", "setText", "setProp",
      "place", "remove", "dispose", "setStyleProp", "prepareStyleProp"] as const;
    const hostMethod = (name: string): Function | null => {
      let object: object | null = this.host;
      while (object) {
        const descriptor = Object.getOwnPropertyDescriptor(object, name);
        if (descriptor) return typeof descriptor.value === "function"
          ? descriptor.value : null;
        object = Object.getPrototypeOf(object);
      }
      return null;
    };
    let methods: readonly (Function | null)[] = [];
    if (scoped) {
      try { methods = methodNames.map(hostMethod); } catch { return null; }
      if (methods.slice(0, 6).some((method) => !method)) return null;
    }
    const hostMethodsCurrent = () => !scoped || methodNames.every((name, index) =>
      hostMethod(name) === methods[index]);
    if (
      this.#compiledGraph ||
      this.#incompatibleScalarBindingGroups > 0 ||
      (deltas.length === 0 && regions.length === 0) ||
      (scoped && (deltas.length === 0 || regions.length > 0 ||
        !deltas.some((delta) => delta.operations.length > 0)))
    ) return null;
    const hasLeafRegions = regions.length > 0;
    type PreparedDelta = {
      parentKey: string;
      regionId: string;
      root: MountedNode<H>;
      parent: MountedNode<H>;
      operations: readonly KeyedRegionDeltaOperation[];
      nodes: Map<KeyedRegionDeltaOperation, VNode>;
      bucket: KeyedRegionBuckets<MountedNode<H>>;
      bucketRevision: number;
      parentVNode: VNode;
      keyedFootprint: Map<string, MountedNode<H> | null>;
    };
    const preparedDeltas: PreparedDelta[] = [];
    const deltaParents = new Set<MountedNode<H>>();
    const regionIds = new Set<string>();
    const touchedKeys = new Map<string, string>();
    const replacedNodes = new Set<MountedNode<H>>();
    const replacedVNodeFootprint = new Map<MountedNode<H>, VNode>();
    let scopedTreeEdit = false;
    const candidateKeys = new Set<string>();
    const candidateRoots: Array<{ node: VNode; owner: string }> = [];
    const isAncestor = (ancestor: MountedNode<H>, node: MountedNode<H>) => {
      for (
        let current: MountedNode<H> | null = node;
        current;
        current = current.parent
      ) {
        if (current === ancestor) return true;
      }
      return false;
    };
    const collectMounted = (node: MountedNode<H>) => {
      if (replacedNodes.has(node)) return false;
      replacedNodes.add(node);
      if (scoped) replacedVNodeFootprint.set(node, node.vnode);
      forEachMountedChild(node, collectMounted);
      return true;
    };
    const isStaticMountedSubtree = (node: MountedNode<H>): boolean => {
      if (node.scalarBindingGroups?.size ||
        node.scalarIncompatibleBindingProps?.size) return false;
      if (node.vnode.kind === "element") {
        for (const [name, value] of Object.entries(node.vnode.props)) {
          if (!isPrimitiveOnlyScopedHostProp(name, value)) return false;
        }
      }
      let valid = true;
      forEachMountedChild(node, (child) => {
        if (!isStaticMountedSubtree(child)) valid = false;
      });
      return valid;
    };
    const validateBindings = (node: VNode): boolean => {
      if (node.kind === "text") return true;
      for (const [name, value] of Object.entries(node.props)) {
        if (hasNonScalarBindingMetadata(name, value)) return false;
        if (compiledBindingsIn(name, value).length > 0) return false;
        const sources = boundSourcesIn(name, value);
        if (scoped && sources.length > 0) return false;
        if (sources.length > 0) materializeProp(name, value);
      }
      return node.children.every(validateBindings);
    };
    const candidateKeyOwners = new Map<string, string>();
    const collectCandidateKeys = (node: VNode, owner: string): boolean => {
      if (node.kind === "text") return true;
      if (node.key !== null) {
        const previousOwner = candidateKeyOwners.get(node.key);
        if (previousOwner !== undefined && previousOwner !== owner) {
          return false;
        }
        candidateKeyOwners.set(node.key, owner);
        candidateKeys.add(node.key);
      }
      return node.children.every((child) => collectCandidateKeys(child, owner));
    };

    try {
      for (const delta of deltas) {
        if (
          !delta.parentKey || !delta.regionId || regionIds.has(delta.regionId)
        ) return null;
        regionIds.add(delta.regionId);
        const matches = this.#nodesByKey.get(delta.parentKey);
        if (!matches || matches.size !== 1) return null;
        const root = matches.values().next().value as
          | MountedNode<H>
          | undefined;
        if (!root || root.hostDisposed) return null;
        let parent: MountedNode<H> | undefined;
        let matchesRegion = 0;
        for (
          const candidate of this.#nodesByKeyedRegion.get(delta.regionId) ?? []
        ) {
          if (!isAncestor(root, candidate)) continue;
          if (candidate.vnode.kind === "element" && candidate.keyedChildren) {
            parent = candidate;
            matchesRegion++;
          }
        }
        if (
          matchesRegion !== 1 || !parent || parent.vnode.kind !== "element" ||
          parent.vnode.keyedRegionId !== delta.regionId ||
          deltaParents.has(parent)
        ) return null;
        for (const previous of deltaParents) {
          if (isAncestor(previous, parent) || isAncestor(parent, previous)) {
            return null;
          }
        }
        deltaParents.add(parent);
        if (scoped && this.#version !== baseVersion) return null;
        const bucket = parent.keyedChildren!;
        const bucketRevision = bucket.structuralRevision;
        const parentVNode = parent.vnode;
        const keyedFootprint = new Map<string, MountedNode<H> | null>();
        const captureKey = (key: string | null) => {
          if (key === null || keyedFootprint.has(key)) return;
          keyedFootprint.set(key, bucket.get(key) ?? null);
        };
        const operations = delta.operations.map((operation) => ({
          ...operation,
        }));
        const virtual = new Map<string, boolean>();
        const present = (key: string) => {
          if (!virtual.has(key)) virtual.set(key, bucket.has(key));
          return virtual.get(key)!;
        };
        const nodes = new Map<KeyedRegionDeltaOperation, VNode>();
        for (const op of operations) {
          if (scoped) {
            captureKey(op.key);
            if (op.type === "move" || op.type === "insert") {
              captureKey(op.beforeKey);
            }
          }
          if (!op.key) return null;
          const previousRegion = touchedKeys.get(op.key);
          if (
            previousRegion !== undefined && previousRegion !== delta.regionId
          ) return null;
          touchedKeys.set(op.key, delta.regionId);
          if (op.type === "insert" || op.type === "replace") {
            if (scoped) scopedTreeEdit = true;
            if (op.type === "insert") {
              if (
                present(op.key) ||
                (op.beforeKey !== null && !present(op.beforeKey))
              ) return null;
            } else if (!present(op.key)) return null;
            if (scoped && op.type === "replace") {
              const old = bucket.get(op.key);
              if (!old || !isStaticMountedSubtree(old)) return null;
              collectMounted(old);
            }
            const candidates = normalizeMany(op.tree);
            if (candidates.length !== 1 || candidates[0].key !== op.key) {
              return null;
            }
            const candidate = scoped
              ? snapshotScopedHostTree(candidates[0])
              : candidates[0];
            if (!candidate) return null;
            validateUniqueKeys([candidate]);
            if (!validateBindings(candidate)) return null;
            nodes.set(op, candidate);
            candidateRoots.push({
              node: candidate,
              owner: `${delta.regionId}\0${op.key}`,
            });
            if (op.type === "replace") {
              if (!scoped) {
                const old = bucket.get(op.key);
                if (old) collectMounted(old);
              }
            } else virtual.set(op.key, true);
          } else if (op.type === "remove") {
            if (!present(op.key)) return null;
            const old = bucket.get(op.key);
            if (old) collectMounted(old);
            virtual.set(op.key, false);
          } else {
            if (
              !present(op.key) ||
              (op.beforeKey !== null && !present(op.beforeKey))
            ) return null;
            if (op.key === op.beforeKey) continue;
          }
        }
        preparedDeltas.push({
          ...delta,
          root,
          parent,
          operations,
          nodes,
          bucket,
          bucketRevision,
          parentVNode,
          keyedFootprint,
        });
      }

      for (const parent of deltaParents) {
        if (replacedNodes.has(parent)) return null;
      }

      const leafPrepared = new Set<MountedNode<H>>();
      for (const region of regions) {
        if (!region.key) return null;
        const matches = this.#nodesByKey.get(region.key);
        if (!matches || matches.size !== 1) return null;
        const target = matches.values().next().value as
          | MountedNode<H>
          | undefined;
        const candidates = normalizeMany(region.tree);
        if (
          !target || target.hostDisposed || candidates.length !== 1 ||
          candidates[0].key !== region.key ||
          !compatible(target.vnode, candidates[0])
        ) return null;
        for (const prior of leafPrepared) {
          if (isAncestor(prior, target) || isAncestor(target, prior)) {
            return null;
          }
        }
        for (const deltaParent of deltaParents) {
          if (
            isAncestor(deltaParent, target) || isAncestor(target, deltaParent)
          ) return null;
        }
        if (!validateBindings(candidates[0])) return null;
        validateUniqueKeys(candidates);
        if (!collectMounted(target)) return null;
        leafPrepared.add(target);
        candidateRoots.push({
          node: candidates[0],
          owner: `leaf\0${region.key}`,
        });
      }
      for (const candidate of candidateRoots) {
        if (!collectCandidateKeys(candidate.node, candidate.owner)) return null;
      }
      for (const key of candidateKeys) {
        const existing = this.#nodesByKey.get(key);
        if (
          existing && [...existing].some((node) => !replacedNodes.has(node))
        ) return null;
      }
    } catch {
      return null;
    }
    if ((!scoped || scopedTreeEdit) && this.#version !== baseVersion) {
      return null;
    }
    const leafPlan = new Map<string, VNode>();
    for (const candidate of candidateRoots) {
      if (candidate.owner.startsWith("leaf\0")) {
        const key = candidate.owner.slice("leaf\0".length);
        leafPlan.set(key, candidate.node);
      }
    }
    const preparedLeaves = hasLeafRegions
      ? this.#prepareKeyedRegions(regions, false, leafPlan)
      : null;
    if (regions.length > 0 && !preparedLeaves) return null;
    let state: "prepared" | "committed" | "discarded" = "prepared";
    let released = false;
    let committedVersion: number | null = null;
    let committedPublicationToken: object | null = null;
    let committedTargets: Array<{
      parent: MountedNode<H>;
      vnode: VNode;
      handle: H;
      bucket: KeyedRegionBuckets<MountedNode<H>>;
      keys: Array<{
        key: string;
        node: MountedNode<H> | undefined;
        vnode: VNode | undefined;
        handle: H | undefined;
        afterKey: string | null;
      }>;
    }> | null = null;
    const validateTargets = () => preparedDeltas.every(
      ({ root, parent, parentKey, regionId, bucket, bucketRevision, parentVNode, keyedFootprint }) => {
        const entries = this.#nodesByKey.get(parentKey);
        if (
          root.hostDisposed || parent.hostDisposed || entries?.size !== 1 ||
          !entries.has(root)
        ) return false;
        let found = 0;
        for (const candidate of this.#nodesByKeyedRegion.get(regionId) ?? []) {
          if (
            isAncestor(root, candidate) && candidate === parent &&
            candidate.keyedChildren && candidate.vnode.kind === "element" &&
            candidate.vnode.keyedRegionId === regionId
          ) found++;
        }
        if (found !== 1) return false;
        if (!scoped) return true;
        if (
          parent.keyedChildren !== bucket ||
          bucket.structuralRevision !== bucketRevision ||
          (parent.vnode !== parentVNode &&
            (parent.vnode.kind !== "element" ||
              parent.vnode.children.length !== 0 ||
              !sameMountedElementHeader(parent.vnode, parentVNode)))
        ) {
          return false;
        }
        for (const [key, node] of keyedFootprint) {
          if (bucket.get(key) !== (node ?? undefined) ||
            (node !== null && (node.hostDisposed || node.parent !== parent))) {
            return false;
          }
        }
        return true;
      },
    );
    const validateScoped = () => {
      if (!validateTargets()) return false;
      for (const [node, vnode] of replacedVNodeFootprint) {
        if (node.hostDisposed || node.vnode !== vnode) return false;
      }
      for (const key of candidateKeys) {
        const existing = this.#nodesByKey.get(key);
        if (existing && [...existing].some((node) =>
          !replacedNodes.has(node)
        )) return false;
      }
      return true;
    };
    if (scoped && !validateScoped()) return null;
    const hostKeys = Object.freeze([...candidateKeys]);
    const changed =
      preparedDeltas.some(({ operations }) => operations.length > 0) ||
      hasLeafRegions;
    let admittedCommit = false;
    const program: PreparedKeyedVDOMProgram = {
      scoped,
      structuralVersionDelta: changed ? 1 : 0,
      hostKeys,
      overlapsHostReplacementTargets: (keys) => keys.some((key) => {
        const matches = this.#nodesByKey.get(key);
        if (matches?.size !== 1) return true;
        const target = matches.values().next().value as MountedNode<H>;
        return [...deltaParents].some((parent) =>
          isAncestor(parent, target) || isAncestor(target, parent));
      }),
      overlapsRetainedTargets: (delta) => {
        const record = this.#retainedSourceDeltas.get(delta);
        if (!record || record.root !== this) return true;
        const removedHandles = new Set(
          [...replacedNodes].map((node) => node.handle),
        );
        return record.groups.some((group) => removedHandles.has(group.handle));
      },
      overlapsStoreTargets: (delta) => {
        const record = this.#storePropDeltas.get(delta);
        return !record || record.targets.some((target) =>
          replacedNodes.has(target.node)
        );
      },
      validatePreparedPrivate: () =>
        state === "prepared" && admittedHost !== null && !this.#publicationFailed &&
        (scoped ? validateScoped() :
          this.#version === baseVersion && validateTargets()) &&
        (!hasLeafRegions || preparedLeaves!.validatePreparedPrivate()),
      validate: () => hostMethodsCurrent() && admittedHost?.current() !== false &&
        state === "prepared" && !this.#publicationFailed &&
        (scoped ? validateScoped() :
          this.#version === baseVersion && validateTargets()) &&
        (!hasLeafRegions || preparedLeaves!.validate()),
      validatePostHost: () => hostMethodsCurrent() &&
        (!postHostStore || this.#isStorePropDeltaCurrent(postHostStore, true, false)) &&
        program.validatePostHostPrivate(),
      validatePostHostPrivate: () =>
        state === "committed" && committedPublicationToken !== null &&
        this.#publicationToken === committedPublicationToken &&
        !this.#publicationFailed && committedVersion !== null &&
        this.#version === committedVersion + Number(deferVersion && changed) &&
        (!postHostStore || this.#isStorePropDeltaCurrent(postHostStore, true, false, true)) &&
        committedTargets !== null && committedTargets.every((target) =>
          !target.parent.hostDisposed && target.parent.vnode === target.vnode &&
          target.parent.handle === target.handle &&
          target.parent.keyedChildren === target.bucket &&
          target.keys.every(({ key, node, vnode, handle, afterKey }) =>
            target.bucket.get(key) === node &&
            (node === undefined || (!node.hostDisposed &&
              node.parent === target.parent && node.vnode ===
                (postHostStore
                  ? this.#storePropDeltas.get(postHostStore)?.targets.find(
                    (candidate) => candidate.node === node,
                  )?.next ?? vnode
                  : vnode) &&
              node.handle === handle && target.bucket.afterKey(key) === afterKey &&
              this.#nodesByKey.get(key)?.size === 1 &&
              this.#nodesByKey.get(key)?.has(node) === true)))),
      commit: () => {
        const admitted = admittedCommit;
        admittedCommit = false;
        if (state !== "prepared") {
          throw new Error("Prepared keyed VDOM program is no longer available");
        }
        if (!(admitted ? program.validatePreparedPrivate() : program.validate())) {
          program.discard();
          throw new Error("Prepared keyed VDOM program is stale");
        }
        state = "committed";
        const pendingRefsBefore = new Map(this.#pendingRefs);
        const batchCountBefore = this.#partialCommitBatchCount;
        const versionAtApply = this.#version;
        try {
          for (const delta of preparedDeltas) {
            if (
              delta.operations.length > 0 && !this.#commitKeyedRegionDelta(
                delta.parentKey,
                delta.regionId,
                delta.operations,
                false,
                delta.nodes,
              )
            ) {
              throw new Error(
                "Prepared keyed-region delta could not be applied",
              );
            }
          }
          if (admitted) preparedLeaves?.commitAdmitted();
          else preparedLeaves?.commit();
          this.#pruneSourceColumnCells();
          if (this.#version !== versionAtApply) {
            throw new Error("Prepared keyed VDOM changed during host application");
          }
          if (!admitted && !hostMethodsCurrent()) {
            throw new Error("Prepared keyed VDOM host methods changed during application");
          }
          committedTargets = preparedDeltas.map(({ parent, bucket, keyedFootprint }) => ({
            parent, vnode: parent.vnode, handle: parent.handle, bucket,
            keys: [...keyedFootprint.keys()].map((key) => {
              const node = bucket.get(key);
              return { key, node, vnode: node?.vnode, handle: node?.handle,
                afterKey: node ? bucket.afterKey(key) : null };
            }),
          }));
          if (changed && !deferVersion) this.#version++;
          committedVersion = this.#version;
          committedPublicationToken = this.#publicationToken;
          this.#partialCommitBatchCount = batchCountBefore +
            Number(changed && !deferVersion);
        } catch (error) {
          committedTargets = null;
          this.#pendingRefs.clear();
          for (const [node, ref] of pendingRefsBefore) {
            this.#pendingRefs.set(node, ref);
          }
          this.#snapshotDirty = true;
          this.#version++;
          this.#partialCommitBatchCount = batchCountBefore + 1;
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
          if (repairErrors.length) {
            throw new AggregateError(
              [error, ...repairErrors],
              "Prepared keyed VDOM host commit and index repair failed",
            );
          }
          throw error;
        } finally { releasePrepared(); }
      },
      commitAdmitted: () => {
        if (!admittedHost) throw new Error("Prepared VDOM host calls are unsupported");
        admittedCommit = true;
        this.#withAdmittedHostCalls(admittedHost.calls, () => program.commit());
      },
      discard: () => {
        if (state === "committed") committedTargets = null;
        releasePrepared();
      },
    };
    function releasePrepared() {
      if (released) return;
      released = true;
      if (state === "prepared") state = "discarded";
      preparedLeaves?.discard?.();
      leafPlan.clear();
      preparedDeltas.length = 0;
      candidateRoots.length = 0;
      candidateKeys.clear();
      candidateKeyOwners.clear();
      replacedNodes.clear();
      replacedVNodeFootprint.clear();
      deltaParents.clear();
      regionIds.clear();
      touchedKeys.clear();
    }
    return program;
  }

  /** Prepare one scoped structural and retained-writer host publication. */
  prepareScopedKeyedAndRetainedDeltas(
    deltas: readonly KeyedRegionDeltaRequest[],
    updates: readonly (readonly [ScalarSource, number])[],
  ): PreparedScopedKeyedRetainedProgram | null {
    if (deltas.length === 0 || updates.length === 0) return null;
    return this.prepareScopedKeyedRetainedAndStoreDeltas(deltas, updates, []);
  }

  /** Prepare static host-subtree replacements against exact mounted footprints. */
  prepareScopedHostSubtreeReplacements(
    regions: readonly { key: string; tree: RuntimeNode }[],
  ): PreparedKeyedVDOMProgram | null {
    if (!regions.length || this.#publicationToken || this.#publicationFailed ||
      this.#compiledGraph || this.#numericWriteInProgress ||
      this.keyIndexMaintenance !== "delta" ||
      this.bindingIndexMaintenance !== "delta") return null;
    const writer = hostPropWriter(this.host);
    const admittedHost = capturedHostMethods(this.host);
    if (!writer) return null;
    const hostMethod = (name: string): Function | null => {
      let object: object | null = this.host;
      while (object) {
        const descriptor = Object.getOwnPropertyDescriptor(object, name);
        if (descriptor) return typeof descriptor.value === "function"
          ? descriptor.value : null;
        object = Object.getPrototypeOf(object);
      }
      return null;
    };
    const methodNames = ["createElement", "createText", "setText", "place",
      "remove", "dispose", "setStyleProp", "prepareStyleProp"] as const;
    const methods = methodNames.map(hostMethod);
    if (methods.slice(0, 5).some((method) => !method)) return null;
    type OldNode = {
      node: MountedNode<H>;
      vnode: VNode;
      acceptedVNode: VNode;
      handle: H;
      parent: MountedNode<H> | null;
      index: number;
    };
    type Target = {
      key: string;
      old: MountedNode<H>;
      parent: MountedNode<H> | null;
      index: number;
      bucket: KeyedRegionBuckets<MountedNode<H>> | undefined;
      afterKey: string | null;
      next: VNode;
      applied: MountedNode<H> | null;
    };
    type NewNode = {
      node: MountedNode<H>;
      vnode: VNode;
      handle: H;
      parent: MountedNode<H> | null;
      index: number;
    };
    const targets: Target[] = [];
    const oldNodes: OldNode[] = [];
    const newNodes: NewNode[] = [];
    const removedNodes = new Set<MountedNode<H>>();
    const candidateKeys = new Set<string>();
    const collectOld = (node: MountedNode<H>, acceptedVNode: VNode): boolean => {
      if (node.hostDisposed || removedNodes.has(node) || node.keyedChildren ||
        node.scalarBindingGroups?.size ||
        node.scalarIncompatibleBindingProps?.size ||
        (node.vnode.kind === "element" &&
          node.vnode.keyedRegionId !== null) ||
        node.vnode.kind !== acceptedVNode.kind ||
        (acceptedVNode.kind === "element" &&
          (node.children.length !== acceptedVNode.children.length ||
            acceptedVNode.keyedRegionId !== null))) {
        return false;
      }
      removedNodes.add(node);
      oldNodes.push({ node, vnode: node.vnode, acceptedVNode, handle: node.handle,
        parent: node.parent, index: node.parentIndex });
      return node.vnode.kind === "text" || node.children.every((child, index) =>
        collectOld(child, (acceptedVNode as VElement).children[index]));
    };
    const collectNext = (node: VNode): boolean => {
      if (node.kind === "element" && node.keyedRegionId !== null) return false;
      if (node.key !== null) {
        if (candidateKeys.has(node.key)) return false;
        candidateKeys.add(node.key);
      }
      return node.kind === "text" || node.children.every(collectNext);
    };
    try {
      for (const region of regions) {
        if (!region.key) return null;
        const matches = this.#nodesByKey.get(region.key);
        if (matches?.size !== 1) return null;
        const old = matches.values().next().value as MountedNode<H>;
        const acceptedOld = snapshotScopedHostTree(old.vnode, old);
        if (old.vnode.kind !== "element" || !acceptedOld ||
          !collectOld(old, acceptedOld)) return null;
        const normalized = normalizeMany(region.tree);
        if (normalized.length !== 1 || normalized[0].key !== region.key) return null;
        const next = snapshotScopedHostTree(normalized[0]);
        if (!next || next.kind !== "element" || !collectNext(next)) return null;
        const parent = old.parent;
        const bucket = parent?.keyedChildren;
        targets.push({ key: region.key, old, parent,
          index: old.parentIndex, bucket,
          afterKey: bucket?.afterKey(region.key) ?? null,
          next, applied: null });
      }
    } catch {
      return null;
    }
    const current = (privateOnly = false) => {
      if (this.#publicationFailed || this.#compiledGraph ||
        this.#numericWriteInProgress || (!privateOnly &&
        (hostPropWriter(this.host) !== writer ||
        methodNames.some((name, index) => hostMethod(name) !== methods[index])))) {
        return false;
      }
      for (const { node, vnode, handle, parent, index } of oldNodes) {
        if (node.hostDisposed || node.vnode !== vnode || node.handle !== handle ||
          node.parent !== parent || node.parentIndex !== index) return false;
        if (parent) {
          if (parent.hostDisposed || (parent.keyedChildren
            ? parent.keyedChildren.get(vnode.key!) !== node
            : parent.children[index] !== node)) return false;
        } else if (this.#mounted[index] !== node) return false;
      }
      for (const { key, old, parent, index, bucket, afterKey } of targets) {
        const matches = this.#nodesByKey.get(key);
        if (matches?.size !== 1 || !matches.has(old) ||
          (parent?.keyedChildren ?? undefined) !== bucket ||
          (bucket ? bucket.get(key) !== old || bucket.afterKey(key) !== afterKey
            : parent ? parent.children[index] !== old : this.#mounted[index] !== old)) {
          return false;
        }
      }
      for (const key of candidateKeys) {
        const matches = this.#nodesByKey.get(key);
        if (matches && [...matches].some((node) => !removedNodes.has(node))) return false;
      }
      return true;
    };
    if (!current()) return null;
    let state: "prepared" | "committed" | "discarded" = "prepared";
    let appliedVersion: number | null = null;
    let appliedToken: object | null = null;
    const newCurrent = () => newNodes.every(({ node, vnode, handle, parent, index }) => {
      if (node.hostDisposed || node.vnode !== vnode || node.handle !== handle ||
        node.parent !== parent || node.parentIndex !== index) return false;
      if (parent) {
        if (parent.hostDisposed || (parent.keyedChildren
          ? parent.keyedChildren.get(vnode.key!) !== node
          : parent.children[index] !== node)) return false;
      } else if (this.#mounted[index] !== node) return false;
      if (vnode.key !== null) {
        const matches = this.#nodesByKey.get(vnode.key);
        if (matches?.size !== 1 || !matches.has(node)) return false;
      }
      return true;
    });
    const captureNew = (node: MountedNode<H>, vnode: VNode): boolean => {
      if (!matchesAcceptedCopyCandidate(node.vnode, vnode) || node.hostDisposed ||
        (vnode.kind === "element" && (node.children.length !== vnode.children.length ||
          !node.children.every((child, index) =>
            captureNew(child, vnode.children[index])
          )))) return false;
      newNodes.push({ node, vnode: node.vnode, handle: node.handle,
        parent: node.parent, index: node.parentIndex });
      return true;
    };
    let admittedCommit = false;
    const program: PreparedKeyedVDOMProgram = {
      scoped: true,
      structuralVersionDelta: 1,
      hostKeys: Object.freeze([...candidateKeys]),
      overlapsRetainedTargets: (delta) => {
        const record = this.#retainedSourceDeltas.get(delta);
        return !record || record.groups.some((group) =>
          [...removedNodes].some((node) => node.handle === group.handle)
        );
      },
      overlapsStoreTargets: (delta) => {
        const record = this.#storePropDeltas.get(delta);
        return !record || record.targets.some((target) => removedNodes.has(target.node));
      },
      validate: () => state === "prepared" && !this.#publicationToken &&
        admittedHost?.current() !== false && current(),
      validatePreparedPrivate: () => state === "prepared" &&
        admittedHost !== null && !this.#publicationToken && current(true),
      validatePostHost: () => hostPropWriter(this.host) === writer &&
        methodNames.every((name, index) => hostMethod(name) === methods[index]) &&
        program.validatePostHostPrivate(),
      validatePostHostPrivate: () => state === "committed" && appliedToken !== null &&
        this.#publicationToken === appliedToken && !this.#publicationFailed &&
        this.#version === appliedVersion &&
        newCurrent() && targets.every(({ key, parent, index,
          bucket, afterKey, applied, next }) => {
          if (!applied || applied.hostDisposed || applied.parent !== parent ||
            !matchesAcceptedCopyCandidate(applied.vnode, next) ||
            parent?.hostDisposed ||
            this.#nodesByKey.get(key)?.size !== 1 ||
            !this.#nodesByKey.get(key)?.has(applied)) return false;
          return bucket ? parent?.keyedChildren === bucket &&
              bucket.get(key) === applied &&
              bucket.afterKey(key) === afterKey
            : parent ? parent.children[index] === applied
            : this.#mounted[index] === applied;
        }),
      commit: () => {
        const admitted = admittedCommit;
        admittedCommit = false;
        if (state !== "prepared" || !this.#publicationToken ||
          !current(admitted)) {
          throw new Error("Prepared scoped host subtree replacement is stale");
        }
        state = "committed";
        const pendingRefs = new Map(this.#pendingRefs);
        const baseVersion = this.#version;
        for (const { node, acceptedVNode } of oldNodes) {
          this.#acceptedJournal?.capture(node, acceptedVNode);
          node.vnode = acceptedVNode;
        }
        this.#acceptedSnapshot = null;
        const keyIndex: MountedKeyIndex<H> = {
          detach: (node) => this.#removeFromKeyIndex(node),
          attach: (node) => this.#addToKeyIndex(node),
        };
        const created: Array<{
          handle: H;
          placedParent: Parent | undefined;
          disposed: boolean;
        }> = [];
        const createdByHandle = new Map<H, typeof created[number]>();
        const track = (handle: H) => {
          const entry = { handle, placedParent: undefined as Parent | undefined,
            disposed: false };
          created.push(entry);
          createdByHandle.set(handle, entry);
          return handle;
        };
        const host: VDOMHost<H, Parent> = {
          createElement: (tag, parent, props) =>
            track(this.#renderHost.createElement(tag, parent, props)),
          createText: (text) => track(this.#renderHost.createText(text)),
          setText: (node, text) => this.#renderHost.setText(node, text),
          setProp: (node, name, value, previous) =>
            this.#renderHost.setProp(node, name, value, previous),
          capturePropertyValue: this.#renderHost.capturePropertyValue
            ? (node, name, value) =>
              this.#renderHost.capturePropertyValue!(node, name, value)
            : undefined,
          setStyleProp: this.#renderHost.setStyleProp
            ? (node, name, value, previous) =>
              this.#renderHost.setStyleProp!(node, name, value, previous)
            : undefined,
          prepareStyleProp: this.#renderHost.prepareStyleProp
            ? (node, name) => this.#renderHost.prepareStyleProp!(node, name)
            : undefined,
          place: (parent, node, before) => {
            const entry = createdByHandle.get(node);
            if (entry) entry.placedParent = parent;
            this.#renderHost.place(parent, node, before);
          },
          remove: (parent, node) => {
            this.#renderHost.remove(parent, node);
            const entry = createdByHandle.get(node);
            if (entry) entry.placedParent = undefined;
          },
          dispose: this.#renderHost.dispose ? (node) => {
            const entry = createdByHandle.get(node);
            if (entry) entry.disposed = true;
            this.#renderHost.dispose!(node);
          } : undefined,
        };
        if (this.#acceptedJournal) {
          acceptedJournalByHost.set(host as object, this.#acceptedJournal);
        }
        try {
          for (const target of targets) {
            const { old, parent, index, bucket, key, next } = target;
            const hostParent = parent
              ? parent.handle as unknown as Parent : this.container;
            let applied: MountedNode<H>;
            if (compatible(old.vnode, next)) {
              applied = updateMounted(host, hostParent, old, next, keyIndex);
            } else {
              this.#acceptedJournal?.capture(old);
              if (parent) this.#acceptedJournal?.capture(parent);
              visitMountedSubtree(old, keyIndex.detach);
              removeMountedSubtree(host, hostParent, old);
              applied = createMounted(host, next, hostParent, keyIndex);
              target.applied = applied;
              applied.parent = parent;
              applied.parentIndex = index;
              const anchor = bucket
                ? target.afterKey === null ? null : bucket.get(target.afterKey)!.handle
                : parent ? parent.children[index + 1]?.handle ?? null
                : this.#mounted[index + 1]?.handle ?? null;
              host.place(hostParent, applied.handle, anchor);
              if (bucket) {
                this.#acceptedJournal?.record(bucket, {
                  kind: "replace", oldKey: key, newKey: key, child: old,
                });
                bucket.replace(key, key, applied);
              } else if (parent) {
                const children = parent.children.slice();
                children[index] = applied;
                parent.children = children;
                if (parent.vnode.kind === "element") {
                  parent.vnode = cloneMountedElementVNode(parent.vnode, {
                    children: children.map((child) => child.vnode),
                  });
                }
              } else {
                const roots = this.#mounted.slice();
                roots[index] = applied;
                this.#mounted = roots;
              }
            }
            target.applied = applied;
          }
          newNodes.length = 0;
          if (!targets.every((target) => target.applied &&
            captureNew(target.applied, target.next)) ||
            !newCurrent() || this.#version !== baseVersion ||
            (!admitted && (hostPropWriter(this.host) !== writer ||
            methodNames.some((name, index) => hostMethod(name) !== methods[index])))) {
            throw new Error("Scoped host subtree changed during application");
          }
          this.#snapshotDirty = true;
          this.#version++;
          this.#partialCommitCount++;
          this.#partialCommitBatchCount++;
          appliedVersion = this.#version;
          appliedToken = this.#publicationToken;
        } catch (error) {
          const errors: unknown[] = [];
          for (let index = created.length - 1; index >= 0; index--) {
            const entry = created[index];
            if (entry.placedParent !== undefined) {
              try { this.#renderHost.remove(entry.placedParent, entry.handle); }
              catch (failure) { errors.push(failure); }
            }
            if (!entry.disposed && this.#renderHost.dispose) {
              entry.disposed = true;
              try { this.#renderHost.dispose(entry.handle); }
              catch (failure) { errors.push(failure); }
            }
          }
          for (const target of targets) {
            if (target.applied) visitMountedSubtree(target.applied, (node) => {
              if (createdByHandle.has(node.handle)) node.hostDisposed = true;
            });
          }
          this.#pendingRefs.clear();
          for (const [node, ref] of pendingRefs) this.#pendingRefs.set(node, ref);
          this.#snapshotDirty = true;
          this.#version++;
          try { this.#rebuildKeyIndex(); } catch (failure) { errors.push(failure); }
          try { this.#rebuildBindingIndex(); } catch (failure) {
            this.#clearBindingIndex(); errors.push(failure);
          }
          if (errors.length) throw new AggregateError(
            [error, ...errors], "Scoped host subtree replacement and repair failed",
            { cause: error },
          );
          throw error;
        } finally {
          acceptedJournalByHost.delete(host as object);
        }
      },
      commitAdmitted: () => {
        if (!admittedHost) throw new Error("Prepared VDOM host calls are unsupported");
        admittedCommit = true;
        this.#withAdmittedHostCalls(admittedHost.calls, () => program.commit());
      },
      discard: () => {
        state = "discarded";
        targets.length = 0;
        oldNodes.length = 0;
        newNodes.length = 0;
        removedNodes.clear();
        candidateKeys.clear();
      },
    };
    return program;
  }

  /** Prepare one scoped keyed, retained-source and Store-prop publication. */
  prepareScopedKeyedRetainedAndStoreDeltas(
    deltas: readonly KeyedRegionDeltaRequest[],
    updates: readonly (readonly [ScalarSource, number])[],
    storeRegions: readonly StorePropDelta[],
    replacements: readonly { key: string; tree: RuntimeNode }[] = [],
  ): PreparedScopedKeyedRetainedProgram | null {
    if (!deltas.length && !updates.length && !storeRegions.length &&
      !replacements.length) return null;
    const retained = updates.length ? this.prepareRetainedSourceDelta(updates) : null;
    if (updates.length && !retained) return null;
    const store = storeRegions.length ? this.prepareStorePropDelta(storeRegions) : null;
    if (storeRegions.length && !store) return null;
    const keyed = deltas.length
      ? this.#prepareKeyedRegionDeltas(deltas, [], { scoped: true },
        replacements.length > 0, store) : null;
    const replacement = replacements.length
      ? this.prepareScopedHostSubtreeReplacements(replacements) : null;
    const structural = [keyed, replacement].filter(
      (plan): plan is PreparedKeyedVDOMProgram => plan !== null,
    );
    const overlap = keyed && replacement && (
      keyed.overlapsHostReplacementTargets?.(replacements.map(({ key }) => key)) ||
      (keyed.hostKeys ?? []).some((key) => replacement.hostKeys?.includes(key))
    );
    if (((deltas.length || replacements.length) &&
      ((deltas.length && !keyed) || (replacements.length && !replacement))) ||
      overlap ||
      structural.some((plan) => plan.structuralVersionDelta !== 1 ||
        !plan.validate()) ||
      (retained && structural.some((plan) =>
        plan.overlapsRetainedTargets(retained))) ||
      (store && structural.some((plan) =>
        plan.overlapsStoreTargets(store))) ||
      (retained && !this.#isRetainedSourceDeltaCurrent(retained, undefined, true)) ||
      (store && !this.isStorePropDeltaCurrent(store))) {
      keyed?.discard();
      replacement?.discard();
      return null;
    }
    let state: "prepared" | "committed" | "discarded" = "prepared";
    let admittedCommit = false;
    const program: PreparedScopedKeyedRetainedProgram = {
      scoped: true,
      structuralVersionDelta: structural.length ? 1 : 0,
      readSources: retained?.readSources ?? [],
      overlapsRetainedTargets: (delta) => structural.some((plan) =>
        plan.overlapsRetainedTargets(delta)),
      overlapsStoreTargets: (delta) => structural.some((plan) =>
        plan.overlapsStoreTargets(delta)),
      validate: () => state === "prepared" &&
        structural.every((plan) => plan.validate()) &&
        (!retained || structural.every((plan) =>
          !plan.overlapsRetainedTargets(retained))) &&
        (!store || structural.every((plan) =>
          !plan.overlapsStoreTargets(store))) &&
        (!retained || this.#isRetainedSourceDeltaCurrent(retained, undefined, true)) &&
        (!store || this.isStorePropDeltaCurrent(store)),
      validatePreparedPrivate: () => state === "prepared" &&
        structural.every((plan) => plan.validatePreparedPrivate()) &&
        (!retained || structural.every((plan) =>
          !plan.overlapsRetainedTargets(retained))) &&
        (!store || structural.every((plan) =>
          !plan.overlapsStoreTargets(store))) &&
        (!retained || this.#isRetainedSourceDeltaCurrent(
          retained, undefined, true, true,
        )) &&
        (!store || this.#isStorePropDeltaCurrent(store, false, false, true)),
      validatePostHost: () => state === "committed" &&
        structural.every((plan) => plan.validatePostHost()) &&
        (!retained || this.#isRetainedSourceDeltaCurrent(
          retained, { afterHost: true }, true,
        )) &&
        (!store || this.isStorePropDeltaCurrent(store, { afterHost: true })),
      validatePostHostPrivate: () => state === "committed" &&
        structural.every((plan) => plan.validatePostHostPrivate()) &&
        (!retained || this.#isRetainedSourceDeltaCurrent(
          retained, { afterHost: true }, true,
        )) &&
        (!store || this.#isStorePropDeltaCurrent(store, true, false, true)),
      commit: () => {
        const admitted = admittedCommit;
        admittedCommit = false;
        if (state !== "prepared" || !this.#publicationToken ||
          (keyed && !(admitted
            ? keyed.validatePreparedPrivate() : keyed.validate())) ||
          (retained && structural.some((plan) =>
            plan.overlapsRetainedTargets(retained))) ||
          (store && structural.some((plan) =>
            plan.overlapsStoreTargets(store))) ||
          (store && !this.#isStorePropDeltaCurrent(store, false, true, admitted))) {
          throw new Error("Prepared scoped VDOM transaction is stale");
        }
        state = "committed";
        if (retained) this.#applyRetainedSourceDelta(retained, true, admitted);
        if (admitted) keyed?.commitAdmitted();
        else keyed?.commit();
        if (admitted) replacement?.commitAdmitted();
        else replacement?.commit();
        if (store) this.#applyStorePropDelta(store, admitted);
      },
      commitAdmitted: () => {
        admittedCommit = true;
        program.commit();
      },
      discard: () => {
        if (state === "discarded") return;
        if (state === "prepared") state = "discarded";
        keyed?.discard();
        replacement?.discard();
      },
    };
    return program;
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
    return this.#prepareKeyedRegions(regions, true);
  }

  #prepareKeyedRegions(
    regions: readonly { key: string; tree: RuntimeNode }[],
    incrementVersion: boolean,
    normalizedOverrides?: ReadonlyMap<string, VNode>,
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
        // Validate bindings without evaluating user projections; the host diff reads
        // their values once, as in a normal commit.
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
      const normalized = normalizedOverrides?.has(region.key)
        ? [normalizedOverrides.get(region.key)!]
        : normalizeMany(region.tree);
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
    const admittedHost = capturedHostMethods(this.host);
    let committed = false;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      committed = true;
      prepared.length = 0;
      replacedNodes.clear();
      candidateKeys.clear();
      seenTargets.clear();
    };
    const preparedCommit: PreparedVDOMCommit = {
      validatePreparedPrivate: () =>
        !committed && admittedHost !== null &&
        this.#version === preparedVersion && prepared.every(({ target }) => {
          const entries = target.vnode.key === null
            ? undefined
            : this.#nodesByKey.get(target.vnode.key);
          return !target.hostDisposed && entries?.size === 1 &&
            entries.has(target);
        }),
      validate: () => !committed && this.#version === preparedVersion &&
        admittedHost?.current() !== false && prepared.every(({ target }) => {
          const entries = target.vnode.key === null
            ? undefined : this.#nodesByKey.get(target.vnode.key);
          return !target.hostDisposed && entries?.size === 1 && entries.has(target);
        }),
      commitAdmitted: () => {
        if (!admittedHost) throw new Error("Prepared VDOM host calls are unsupported");
        this.#withAdmittedHostCalls(admittedHost.calls, () => preparedCommit.commit());
      },
      discard: release,
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
          release();
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
          refreshProp: (node, name, value, acceptedCopy) =>
            this.#refreshScalarBindingProp(node, name, value, acceptedCopy),
        };
        const bindingAttachStart = this.#bindingIndexAttachOperations;
        const bindingDetachStart = this.#bindingIndexDetachOperations;
        const bindingIndexStart = this.#bindingIndexIndexOperations;
        const pendingRefsBeforeCommit = new Map(this.#pendingRefs);
        const preparedCount = prepared.length;
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
          if (incrementVersion) this.#version++;
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
        } finally {
          release();
        }

        this.#pruneSourceColumnCells();
        this.#snapshotDirty = true;
        if (incrementVersion) this.#version++;
        this.#partialCommitCount += preparedCount;
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
    return preparedCommit;
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

  /** Prepare closed prop writes on exact mounted, globally keyed host leaves. */
  prepareStorePropDelta(
    regions: readonly StorePropDelta[],
  ): PreparedStorePropDelta | null {
    if (this.#publicationToken || this.#publicationFailed ||
      this.#compiledGraph !== null ||
      this.#numericWriteInProgress || regions.length === 0) return null;
    const writer = hostPropWriter(this.host);
    if (!writer) return null;
    const seen = new Set<string>();
    const targets: StorePropDeltaRecord<H>["targets"][number][] = [];
    const texts: StorePropDeltaRecord<H>["texts"][number][] = [];
    for (const region of regions) {
      if (!region.key || !region.tag || seen.has(region.key) ||
        (region.children === undefined && region.props.length === 0)) return null;
      seen.add(region.key);
      const matches = this.#nodesByKey.get(region.key);
      if (matches?.size !== 1) return null;
      const node = matches.values().next().value as MountedNode<H>;
      const vnode = node.vnode;
      if (node.hostDisposed || vnode.kind !== "element" ||
        vnode.key !== region.key || vnode.tag !== region.tag ||
        vnode.keyedRegionId !== null ||
        (region.children === undefined && node.children.length !== 0) ||
        node.keyedChildren || node.scalarBindingGroups?.size ||
        node.scalarIncompatibleBindingProps?.size) return null;
      if (region.children !== undefined) {
        if (node.children.length !== region.children.length ||
          vnode.children.length !== region.children.length) return null;
        for (let index = 0; index < region.children.length; index++) {
          const description = region.children[index];
          const child = node.children[index];
          const childVNode = vnode.children[index];
          if (!child || child.hostDisposed || child.parent !== node ||
            child.parentIndex !== index || child.vnode.kind !== childVNode.kind) return null;
          if (description.kind === "host") {
            if (child.vnode.kind !== "element" || childVNode.kind !== "element" ||
              child.vnode.key !== description.key || child.vnode.tag !== description.tag ||
              childVNode.key !== description.key || childVNode.tag !== description.tag) return null;
          } else {
            if (typeof description.text !== "string" || child.vnode.kind !== "text" ||
              childVNode.kind !== "text") return null;
            texts.push({ node: child, vnode: child.vnode,
              next: { ...child.vnode, text: description.text },
              handle: child.handle, parent: node, index });
          }
        }
      }
      let descriptors: Record<string, PropertyDescriptor>;
      try { descriptors = Object.getOwnPropertyDescriptors(vnode.props); }
      catch { return null; }
      const capture = (name: string, value: unknown, previous: boolean) => {
        try {
          if (name === "ref" || /^on[A-Z]/.test(name)) return null;
          if ((name === "style" || name === "position" || name === "rotation" ||
            name === "scale") && previous && !Object.isFrozen(value)) return null;
          if ((name === "position" || name === "rotation" || name === "scale") &&
            !previous && !Object.isFrozen(value)) return null;
          return snapshotScopedHostProp(vnode.tag, name, value);
        } catch { return null; }
      };
      const nextProps: Record<string, unknown> = {};
      for (const [name, descriptor] of Object.entries(descriptors)) {
        if (!("value" in descriptor)) return null;
        const captured = capture(name, descriptor.value, true);
        if (!captured?.accepted || captured.value === undefined) return null;
        if (vnode.scopedSourceProps) {
          let authored: PropertyDescriptor | undefined;
          try { authored = Object.getOwnPropertyDescriptor(vnode.scopedSourceProps, name); }
          catch { return null; }
          if (!authored || !("value" in authored) ||
            !capture(name, authored.value, false)?.accepted) return null;
        }
        nextProps[name] = captured.value;
      }
      const names = new Set<string>();
      const writes: Array<readonly [string, ClosedHostOutputValue,
        ClosedHostOutputValue]> = [];
      for (const [name, proposed] of region.props) {
        const prior = descriptors[name];
        if (names.has(name) || !prior || !("value" in prior)) return null;
        names.add(name);
        const captured = capture(name, proposed, false);
        if (!captured?.accepted || captured.value === undefined) return null;
        const next = captured.value as ClosedHostOutputValue;
        const previous = nextProps[name] as ClosedHostOutputValue;
        nextProps[name] = next;
        writes.push([name, next, previous]);
      }
      const parent = node.parent;
      const next = { ...vnode, props: Object.freeze(nextProps) };
      targets.push({
        node, vnode, handle: node.handle, parent,
        parentIndex: node.parentIndex,
        bucket: parent?.keyedChildren,
        writes,
        next,
        ...(region.children === undefined ? {} : {
          children: [...node.children], childVNodes: node.children.map((child) => child.vnode),
        }),
      });
    }
    const byNode = new Map(targets.map((target) => [target.node, target] as const));
    const textByNode = new Map(texts.map((target) => [target.node, target] as const));
    for (const target of targets) {
      if (!target.children) continue;
      for (const child of target.children) {
        if (child.vnode.kind === "element" && !byNode.has(child)) return null;
      }
    }
    const completed = new Map<MountedNode<H>, VElement>();
    const nextVNode = (target: StorePropDeltaRecord<H>["targets"][number]): VElement => {
      const existing = completed.get(target.node);
      if (existing) return existing;
      const next = !target.children ? target.next : cloneMountedElementVNode(target.next, { children: target.children.map((child) =>
        child.vnode.kind === "text" ? textByNode.get(child)!.next :
          nextVNode(byNode.get(child)!)) });
      completed.set(target.node, next);
      return next;
    };
    for (const target of targets) nextVNode(target);
    for (const target of targets) target.next = completed.get(target.node)!;
    for (const target of targets) {
      if (target.children) target.nextChildVNodes = target.next.children;
    }
    const textWriter = texts.length ? hostTextWriter(this.host) : null;
    if (texts.length && !textWriter) return null;
    const token = Object.freeze({}) as PreparedStorePropDelta;
    this.#storePropDeltas.set(token, {
      targets, texts, writer, textWriter, applied: false, publicationToken: null,
      appliedVersion: null,
    });
    if (!this.isStorePropDeltaCurrent(token)) return null;
    return token;
  }

  /** Validate exact mounted writers without requiring an unrelated root version. */
  isStorePropDeltaCurrent(
    token: PreparedStorePropDelta,
    options: { afterHost?: boolean } = {},
  ): boolean {
    return this.#isStorePropDeltaCurrent(token, options.afterHost === true, false);
  }

  #isStorePropDeltaCurrent(
    token: PreparedStorePropDelta,
    afterHost: boolean,
    allowActivePublication: boolean,
    privateOnly = false,
  ): boolean {
    const record = this.#storePropDeltas.get(token);
    if (!record || this.#publicationFailed || this.#compiledGraph !== null ||
      (!privateOnly && hostPropWriter(this.host) !== record.writer) ||
      (!privateOnly && record.texts.length > 0 &&
        hostTextWriter(this.host) !== record.textWriter) ||
      this.#numericWriteInProgress) {
      return false;
    }
    if (afterHost) {
      if (!record.applied || !record.publicationToken ||
        this.#publicationToken !== record.publicationToken ||
        this.#version !== record.appliedVersion) return false;
    } else if (record.applied ||
      (allowActivePublication ? !this.#publicationToken : !!this.#publicationToken)) return false;
    for (const target of record.targets) {
      const { node, vnode, parent, bucket } = target;
      if (node.hostDisposed || node.handle !== target.handle ||
        node.parent !== parent || node.vnode !==
          (afterHost ? target.next : vnode) ||
        this.#nodesByKey.get(vnode.key!)?.size !== 1 ||
        !this.#nodesByKey.get(vnode.key!)?.has(node) ||
        node.scalarBindingGroups?.size ||
        node.scalarIncompatibleBindingProps?.size) return false;
      if (parent) {
        if (parent.hostDisposed || parent.keyedChildren !== bucket ||
          (bucket ? bucket.get(vnode.key!) !== node :
            parent.children[target.parentIndex] !== node)) return false;
      } else if (this.#mounted[target.parentIndex] !== node) return false;
      if (target.children) {
        if (node.keyedChildren || node.children.length !== target.children.length) return false;
        for (let index = 0; index < target.children.length; index++) {
          const child = target.children[index];
          if (node.children[index] !== child || child.hostDisposed ||
            child.parent !== node || child.parentIndex !== index ||
            child.vnode !== (afterHost
              ? target.nextChildVNodes?.[index]
              : target.childVNodes?.[index])) return false;
        }
      }
    }
    for (const target of record.texts) {
      if (target.node.hostDisposed || target.node.handle !== target.handle ||
        target.parent.hostDisposed || target.node.parent !== target.parent ||
        target.parent.children[target.index] !== target.node ||
        target.node.parentIndex !== target.index ||
        target.node.vnode !== (afterHost ? target.next : target.vnode)) return false;
    }
    return true;
  }

  /** Apply a prepared primitive cut inside the shared active publication. */
  applyStorePropDelta(token: PreparedStorePropDelta): void {
    this.#applyStorePropDelta(token, false);
  }

  #applyStorePropDelta(token: PreparedStorePropDelta, privateOnly: boolean): void {
    const record = this.#storePropDeltas.get(token);
    if (!record || !this.#isStorePropDeltaCurrent(token, false, true, privateOnly)) {
      throw new Error("Prepared Store prop delta is stale");
    }
    record.applied = true;
    const versionAtApply = this.#version;
    for (const target of record.targets) {
      this.#acceptedJournal?.capture(target.node);
      for (const [name, next, previous] of target.writes) {
        if (!Object.is(previous, next)) {
          record.writer.call(this.host, target.handle, name, next, previous);
        }
      }
    }
    for (const target of record.texts) {
      this.#acceptedJournal?.capture(target.node);
      if (target.vnode.text !== target.next.text) {
        record.textWriter!.call(this.host, target.handle, target.next.text);
      }
    }
    if (this.#version !== versionAtApply ||
      record.targets.some((target) => target.node.vnode !== target.vnode) ||
      record.texts.some((target) => target.node.vnode !== target.vnode)) {
      throw new Error("Prepared Store prop delta changed during host application");
    }
    for (const target of record.targets) target.node.vnode = target.next;
    for (const target of record.texts) target.node.vnode = target.next;
    this.#snapshotDirty = true;
    record.publicationToken = this.#publicationToken;
    record.appliedVersion = this.#version;
  }

  /** Prepare only the compiler-proven retained writers reached by this cut. */
  prepareRetainedSourceDelta(
    updates: readonly (readonly [ScalarSource, number])[],
  ): PreparedRetainedSourceDelta | null {
    if (this.#publicationToken || this.#publicationFailed ||
      this.#numericWriteInProgress || updates.length === 0) return null;
    const structuralVersion = this.#version;
    const seen = new Set<ScalarSource>();
    const selected = new Set<BoundPropGroup<H>>();
    for (const [source, value] of updates) {
      if (seen.has(source) || typeof value !== "number" ||
        !Object.is(source.value, value)) return null;
      seen.add(source);
      const slot = this.#programSourceSlots.get(source);
      const groups = this.#groupsBySource.get(source);
      if (!slot?.eligible || !groups?.size) return null;
      for (const group of groups) selected.add(group);
    }
    const readSources: ScalarSource[] = [];
    const readValues: number[] = [];
    const readIndices = new Map<ScalarSource, number>();
    const groups: BoundPropGroup<H>[] = [];
    const generations: number[] = [];
    const sourceValues: number[] = [];
    const outputs: unknown[] = [];
    for (const group of selected) {
      const binding = getBoundValue(group.rawValue);
      const descriptor = binding?.numericProgram;
      if (!binding || !descriptor || group.column !== undefined ||
        group.sources.length === 0 || group.sources.some((source) =>
          !this.#groupsBySource.get(source)?.has(group) ||
          !this.#programSourceSlots.get(source)?.eligible
        )) return null;
      const expression = closedExpressionForBinding(binding);
      if (!expression) return null;
      for (const source of group.sources) {
        if (readIndices.has(source)) continue;
        const value = source.value;
        if (typeof value !== "number") return null;
        readIndices.set(source, readSources.length);
        readSources.push(source);
        readValues.push(value);
      }
      const generation = group.acceptedWriteGeneration ?? 0;
      const output = evaluateClosedNumericExpression(
        expression, group.sources.map((source) => readValues[readIndices.get(source)!]),
      );
      if (!isCompiledOwnerUpdatePrimitive(output)) return null;
      groups.push(group);
      generations.push(generation);
      sourceValues.push(readValues[readIndices.get(group.sources[0])!]);
      outputs.push(output);
    }
    if (groups.length === 0 ||
      readSources.some((source, index) =>
        !Object.is(source.value, readValues[index])
      ) || this.#publicationToken || this.#publicationFailed ||
      this.#numericWriteInProgress) return null;
    const token = Object.freeze({
      readSources: Object.freeze(readSources),
    }) as PreparedRetainedSourceDelta;
    this.#retainedSourceDeltas.set(token, {
      root: this,
      structuralVersion,
      readSources,
      readValues,
      groups,
      generations,
      sourceValues,
      outputs,
      applied: false,
    });
    if (!this.isRetainedSourceDeltaCurrent(token)) {
      this.#retainedSourceDeltas.delete(token);
      return null;
    }
    return token;
  }

  /** Validate writer lifetime and accepted overlap after unrelated prop cuts. */
  isRetainedSourceDeltaCurrent(
    delta: PreparedRetainedSourceDelta,
    options?: { afterHost?: boolean },
  ): boolean {
    return this.#isRetainedSourceDeltaCurrent(delta, options, false);
  }

  #retainedGroupSourcesCurrent(group: BoundPropGroup<H>, privateOnly: boolean): boolean {
    if (!privateOnly) return !group.sources.some((source) =>
      !this.#groupsBySource.get(source)?.has(group) ||
      !this.#programSourceSlots.get(source)?.eligible);
    const sources = canonicalCapturedBindingSourceArray(
      group.rawValue as import("./jsx_binding_runtime.ts").BoundValue,
    );
    if (!sources || sources !== group.sources) return false;
    for (let index = 0; index < sources.length; index++) {
      const source = sources[index];
      if (!this.#groupsBySource.get(source)?.has(group) ||
        !this.#programSourceSlots.get(source)?.eligible) return false;
    }
    return true;
  }

  #isRetainedSourceDeltaCurrent(
    delta: PreparedRetainedSourceDelta,
    options: { afterHost?: boolean } | undefined,
    scoped: boolean,
    privateOnly = false,
  ): boolean {
    const record = this.#retainedSourceDeltas.get(delta);
    if (!record || record.root !== this || this.#publicationFailed ||
      (!scoped && this.#version !== record.structuralVersion) ||
      (!options?.afterHost && (this.#publicationToken !== null ||
        record.applied)) ||
      (options?.afterHost && (!this.#publicationToken || !record.applied))) {
      return false;
    }
    for (let index = 0; index < record.readSources.length; index++) {
      if (!options?.afterHost) {
        const source = record.readSources[index];
        const value = privateOnly
          ? canonicalScalarSourceValue(source) : source.value;
        if (value === null || !Object.is(value, record.readValues[index])) {
          return false;
        }
      }
    }
    for (let index = 0; index < record.groups.length; index++) {
      const group = record.groups[index];
      if ((group.acceptedWriteGeneration ?? 0) !==
          record.generations[index] ||
        !this.#programSinkSlotByGroup.has(group) ||
        !closedExpressionForBinding(group.rawValue as import("./jsx_binding_runtime.ts").BoundValue) ||
        !this.#retainedGroupSourcesCurrent(group, privateOnly)) return false;
    }
    return true;
  }

  /** Apply a projected cut inside the Root's active host publication. */
  applyRetainedSourceDelta(delta: PreparedRetainedSourceDelta): boolean {
    return this.#applyRetainedSourceDelta(delta, false);
  }

  #applyRetainedSourceDelta(
    delta: PreparedRetainedSourceDelta,
    scoped: boolean,
    privateOnly = false,
  ): boolean {
    const record = this.#retainedSourceDeltas.get(delta);
    if (!record || !this.#publicationToken || record.applied ||
      this.#publicationFailed ||
      (!scoped && this.#version !== record.structuralVersion) ||
      record.readSources.some((source, index) =>
        !Object.is(privateOnly ? canonicalScalarSourceValue(source) : source.value,
          record.readValues[index])
      ) || record.groups.some((group, index) =>
        (group.acceptedWriteGeneration ?? 0) !==
          record.generations[index] ||
        !this.#programSinkSlotByGroup.has(group) ||
        !closedExpressionForBinding(group.rawValue as import("./jsx_binding_runtime.ts").BoundValue) ||
        !this.#retainedGroupSourcesCurrent(group, privateOnly)
      )) throw new Error("Retained source delta is stale");
    return this.#withNumericWriteGuard(() => {
      let wrote = false;
      for (let index = 0; index < record.groups.length; index++) {
        const group = record.groups[index];
        const next = record.outputs[index];
        const preparedCopy = this.#prepareBoundCopy(group, next);
        const prepared = preparedCopy ?? next;
        const shouldWrite = !sameBoundValueCanSkipWrite(
          this.#effectiveLastValue(group),
          prepared,
          group.forceWrite,
          this.#effectiveLastValueIsCopy(group),
          !!preparedCopy,
        );
        if (shouldWrite) {
          this.#writeBoundGroup(group, prepared, !!preparedCopy);
          wrote = true;
        }
        this.#stageLastValue(
          group,
          shouldWrite ? prepared : this.#effectiveLastValue(group),
          shouldWrite
            ? !!preparedCopy
            : this.#effectiveLastValueIsCopy(group),
        );
        if (group.sources.length === 1) {
          this.#stageLastSourceValue(group, record.sourceValues[index]);
        }
      }
      record.applied = true;
      return wrote;
    });
  }

  /** Whether every retained writer for this source is a supported direct numeric program. */
  hasSourceProgram(source: ScalarSource): boolean {
    return !!this.#programSourceSlots.get(source)?.eligible;
  }

  /**
   * Associate existing unary compiler-proven writers with one published
   * numeric column cell. This records an index only; it does not write hosts
   * or alter the source's binding metadata.
   */
  bindSourceColumn(
    source: ScalarSource,
    column: NumericColumn,
    row: number,
  ): boolean {
    if (
      this.#numericWriteInProgress || this.#compiledGraph ||
      !this.#directBindingWrites ||
      !Number.isSafeInteger(row) || row < 0 || row >= column.values.length
    ) return false;
    const groups = this.#groupsBySource.get(source);
    const slot = this.#programSourceSlots.get(source);
    if (!groups?.size || !slot?.eligible || !slot.unaryEligible) return false;
    const prior = this.#sourceColumnCells.get(source);
    if (prior) return prior.column === column && prior.row === row;
    this.#sourceColumnCells.set(source, { column, row });
    for (const group of groups) this.#indexSourceColumnGroup(source, group);
    return true;
  }

  /**
   * Prepare one source's unary cell-writer fanout. The returned token is tied
   * to this VDOM root, source slot, cell address, and the current binding
   * generation; it becomes stale when that source's bindings change.
   */
  prepareNumericCellProgram(
    source: ScalarSource,
    column: NumericColumn,
    row: number,
  ): PreparedNumericCellProgram | null {
    if (
      this.#numericWriteInProgress || this.#compiledGraph ||
      !this.#directBindingWrites || !Number.isSafeInteger(row) || row < 0 ||
      row >= column.values.length
    ) return null;
    const slot = this.#programSourceSlots.get(source);
    if (!slot?.eligible || !slot.unaryEligible || slot.groups.length === 0) {
      return null;
    }
    if (!this.bindSourceColumn(source, column, row)) return null;
    const cell = this.#sourceColumnCells.get(source);
    if (!cell || cell.column !== column || cell.row !== row) return null;
    const current = slot.cellProgram;
    if (
      current?.active && current.generation === slot.cellProgramGeneration &&
      current.column === column && current.row === row &&
      current.groups === slot.groups
    ) return current.token;
    if (current) this.#invalidatePreparedNumericCellProgram(slot);

    // Descriptor and unary shape checks were compiled into the source slot at
    // activation/refresh, never during a prepared cut.
    const token = Object.freeze({}) as PreparedNumericCellProgram;
    const record: PreparedNumericCellProgramRecord<H> = {
      token,
      root: this,
      slot,
      source,
      column,
      row,
      generation: slot.cellProgramGeneration,
      groups: slot.groups,
      active: true,
    };
    slot.cellProgram = record;
    this.#preparedCellProgramRecords.set(token, record);
    return token;
  }

  /** Prepare a compiler-v2 owner-row fanout once for a committed World row. */
  prepareNumericRowProgram(
    spec: PreparedNumericRowProgramSpec,
  ): PreparedNumericRowProgram | null {
    if (
      this.#numericWriteInProgress || this.#compiledGraph ||
      !this.#directBindingWrites || !Number.isSafeInteger(spec.owner) ||
      !Number.isSafeInteger(spec.row) || spec.row < 0 ||
      !Number.isSafeInteger(spec.generation) || spec.generation < 0 ||
      typeof spec.rowIdentity !== "object" || spec.rowIdentity === null
    ) return null;
    let layout: CompiledStateLayout;
    try {
      layout = normalizeCompiledStateLayout(spec.layout);
    } catch {
      return null;
    }
    if (!layout.programId || layout.slots.length === 0) return null;
    const slotCount = layout.slots.length;
    if (
      spec.sources.length !== slotCount || spec.columns.length !== slotCount
    ) {
      return null;
    }
    const layoutSignature = compiledStateLayoutSignature(layout);
    const priorIdentityRecord = this.#preparedNumericRowByIdentity.get(
      spec.rowIdentity,
    );
    if (priorIdentityRecord) {
      if (
        !priorIdentityRecord.active ||
        priorIdentityRecord.owner !== spec.owner ||
        priorIdentityRecord.row !== spec.row ||
        priorIdentityRecord.generation !== spec.generation ||
        priorIdentityRecord.layoutSignature !== layoutSignature
      ) return null;
      for (let index = 0; index < slotCount; index++) {
        if (
          priorIdentityRecord.sources[index] !== spec.sources[index] ||
          priorIdentityRecord.columns[index] !== spec.columns[index]
        ) return null;
      }
      return priorIdentityRecord.token;
    }

    const sources: (ScalarSource | undefined)[] = new Array(slotCount);
    const columns: NumericColumn[] = new Array(slotCount);
    const groupsBySlot: BoundPropGroup<H>[][] = new Array(slotCount);
    const usedSlots = new Uint8Array(slotCount);
    const sourceSet = new Set<ScalarSource>();
    for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
      const source = spec.sources[slotIndex];
      const column = spec.columns[slotIndex];
      const slot = layout.slots[slotIndex];
      if (
        !column || column.sourceSlot !== slotIndex ||
        compiledStateLayoutSlot(layout, slot.siteId) !== slotIndex
      ) return null;
      if (source) {
        if (
          sourceSet.has(source) || this.#numericRowProgramsBySource.has(source)
        ) {
          return null;
        }
        sourceSet.add(source);
      }
      sources[slotIndex] = source;
      columns[slotIndex] = column;
      groupsBySlot[slotIndex] = [];
    }

    for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
      const source = sources[slotIndex];
      if (!source) continue;
      const groups = this.#groupsBySource.get(source);
      for (const group of groups ?? []) {
        const binding = getBoundValue(group.rawValue);
        const ownerBinding = binding?.numericOwner;
        const descriptor = binding?.numericProgram;
        if (
          !binding || !ownerBinding || !descriptor ||
          descriptor.schemaVersion !== 2 ||
          descriptor.ownerProgramId !== layout.programId ||
          typeof descriptor.sinkId !== "string" ||
          descriptor.sinkId.length === 0 ||
          !Array.isArray(descriptor.sourceSites) ||
          !Array.isArray(ownerBinding.sourceSlots) || !binding.project ||
          ownerBinding.owner !== spec.owner ||
          ownerBinding.programId !== layout.programId ||
          safeLayoutSignature(ownerBinding.layout) !== layoutSignature ||
          ownerBinding.sourceSlots.length !== group.sources.length ||
          group.sources.length > 1 &&
            typeof binding.projectInputs !== "function"
        ) return null;
        const sites = descriptor.sourceSites;
        if (sites.length !== group.sources.length) return null;
        for (let input = 0; input < group.sources.length; input++) {
          const sourceSlot = ownerBinding.sourceSlots[input];
          if (
            !Number.isSafeInteger(sourceSlot) || sourceSlot < 0 ||
            sourceSlot >= slotCount ||
            group.sources[input] !== sources[sourceSlot] ||
            sites[input] !== layout.slots[sourceSlot].siteId
          ) return null;
          usedSlots[sourceSlot] = 1;
          if (
            sourceSlot === slotIndex && !groupsBySlot[slotIndex].includes(group)
          ) {
            groupsBySlot[slotIndex].push(group);
          }
        }
      }
    }

    for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
      if (!usedSlots[slotIndex]) continue;
      if (!sources[slotIndex]) return null;
      for (const group of groupsBySlot[slotIndex]) {
        if (group.ownerRowInputSlots !== undefined) return null;
      }
    }
    let ownerUpdateProgram: CompiledOwnerUpdateProgram | undefined;
    let ownerUpdateSinks: BoundPropGroup<H>[] | undefined;
    const candidateProgram = compiledOwnerUpdateProgramFor(layout);
    if (
      candidateProgram?.schemaVersion === 2 &&
      candidateProgram.programId === layout.programId &&
      candidateProgram.slotCount === slotCount &&
      candidateProgram.sinkIds.length > 0 &&
      candidateProgram.sinkIds.length <= 30
    ) {
      const groupsBySinkId = new Map<string, BoundPropGroup<H>>();
      const visitedGroups = new Set<BoundPropGroup<H>>();
      let complete = true;
      for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
        for (const group of groupsBySlot[slotIndex]) {
          if (visitedGroups.has(group)) continue;
          visitedGroups.add(group);
          const binding = getBoundValue(group.rawValue)!;
          const sinkId = binding.numericProgram?.schemaVersion === 2
            ? binding.numericProgram.sinkId
            : undefined;
          if (!sinkId || groupsBySinkId.has(sinkId)) {
            complete = false;
            break;
          }
          groupsBySinkId.set(sinkId, group);
        }
        if (!complete) break;
      }
      const sinks: BoundPropGroup<H>[] = [];
      if (complete && groupsBySinkId.size === candidateProgram.sinkIds.length) {
        for (const sinkId of candidateProgram.sinkIds) {
          const group = groupsBySinkId.get(sinkId);
          if (!group) {
            complete = false;
            break;
          }
          sinks.push(group);
        }
      } else complete = false;
      if (complete) {
        for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
          const actual = groupsBySlot[slotIndex];
          let actualIndex = 0;
          for (
            let sinkIndex = 0;
            sinkIndex < candidateProgram.sinkIds.length;
            sinkIndex++
          ) {
            const group = sinks[sinkIndex];
            const binding = getBoundValue(group.rawValue)!;
            if (binding.numericOwner!.sourceSlots.includes(slotIndex)) {
              if (actual[actualIndex++] !== group) {
                complete = false;
                break;
              }
            }
          }
          if (!complete || actualIndex !== actual.length) {
            complete = false;
            break;
          }
        }
      }
      if (complete) {
        ownerUpdateProgram = candidateProgram;
        ownerUpdateSinks = sinks;
      }
    }
    const token = Object.freeze({}) as PreparedNumericRowProgram;
    const inputValues = new Array<number>(slotCount);
    const changedEpochs = new Array<number>(slotCount).fill(0);
    const changedValues = new Array<number>(slotCount).fill(0);
    const record: PreparedNumericRowProgramRecord<H> = {
      token,
      root: this,
      owner: spec.owner,
      layout,
      layoutSignature,
      rowIdentity: spec.rowIdentity,
      row: spec.row,
      generation: spec.generation,
      sourceLease: spec.sources,
      columnLease: spec.columns,
      sources,
      columns,
      usedSlots,
      groupsBySlot,
      ownerUpdateProgram,
      sinks: ownerUpdateSinks,
      inputValues,
      changedEpochs,
      changedValues,
      cutEpoch: 0,
      seenMask: 0,
      active: true,
    };
    for (const groups of groupsBySlot) {
      for (const group of groups) {
        const binding = getBoundValue(group.rawValue)!;
        group.ownerRowInputSlots = binding.numericOwner!.sourceSlots;
        group.ownerRowProjectInputs = binding.projectInputs;
        if (!ownerUpdateProgram) {
          group.ownerRowInputs ??= new Array<number>(group.sources.length);
        }
      }
    }
    this.#preparedNumericRowPrograms.set(token, record);
    this.#activePreparedNumericRowRecords.add(record);
    this.#preparedNumericRowByIdentity.set(spec.rowIdentity, record);
    for (let slotIndex = 0; slotIndex < sources.length; slotIndex++) {
      const source = sources[slotIndex];
      if (source) {
        this.#numericRowProgramsBySource.set(source, {
          record,
          slot: slotIndex,
        });
      }
    }
    return token;
  }

  #invalidatePreparedNumericRowsForSource(source: ScalarSource) {
    const membership = this.#numericRowProgramsBySource.get(source);
    if (!membership) return;
    const record = membership.record;
    if (!record.active) return;
    record.active = false;
    this.#activePreparedNumericRowRecords.delete(record);
    this.#preparedNumericRowPrograms.delete(record.token);
    this.#preparedNumericRowByIdentity.delete(record.rowIdentity);
    for (const recordSource of record.sources) {
      if (
        recordSource &&
        this.#numericRowProgramsBySource.get(recordSource)?.record === record
      ) this.#numericRowProgramsBySource.delete(recordSource);
    }
    for (const groups of record.groupsBySlot) {
      for (const group of groups) {
        group.ownerRowInputs = undefined;
        group.ownerRowInputSlots = undefined;
        group.ownerRowProjectInputs = undefined;
        group.ownerRowCutEpoch = undefined;
      }
    }
  }

  /** Execute an explicit multi-row, multi-source cut through prepared sinks. */
  executePreparedNumericRows(
    tokens: readonly (PreparedNumericRowProgram | undefined)[],
    changedRowIndices: Uint32Array,
    changedSlots: Uint32Array,
    values: readonly number[],
    count: number,
  ): boolean | null {
    if (this.#numericWriteInProgress) {
      throw new Error("Nested numeric VDOM writes are not supported");
    }
    this.#numericWriteInProgress = true;
    try {
      return this.#executePreparedNumericRows(
        tokens,
        changedRowIndices,
        changedSlots,
        values,
        count,
      );
    } finally {
      this.#numericWriteInProgress = false;
    }
  }

  /** Check whether a cached opaque cell program still names its live fanout. */
  isPreparedNumericCellProgramCurrent(
    token: PreparedNumericCellProgram,
  ): boolean {
    const record = this.#preparedCellProgramRecords.get(token);
    return !!record && record.root === this && record.active &&
      record.slot.cellProgram === record && record.slot.eligible &&
      record.generation === record.slot.cellProgramGeneration &&
      record.groups === record.slot.groups;
  }

  /**
   * Apply an explicit dirty-source cut using prepared unary fanouts. Returns
   * null when any token is stale or unsupported, false when accepted without
   * host writes, and true when at least one host prop was written.
   */
  executePreparedNumericCells(
    tokens: readonly (PreparedNumericCellProgram | undefined)[],
    values: readonly number[],
    count: number,
  ): boolean | null {
    return this.#withNumericWriteGuard(() =>
      this.#executePreparedNumericCells(tokens, values, count)
    );
  }

  /** Whether a numeric cell currently has at least one indexed host writer. */
  hasColumnCell(column: NumericColumn, row: number): boolean {
    return Number.isSafeInteger(row) && row >= 0 &&
      (this.#groupsByColumnCell.get(column)?.get(row)?.length ?? 0) > 0;
  }

  /**
   * Apply an explicit dirty-address cut through existing unary writers.
   * Returns null when preflight declines the cut, false for a supported cut
   * with no host writes, and true when at least one host prop was written.
   */
  setColumnCells(
    columns: readonly (NumericColumn | undefined)[],
    rows: readonly number[],
    values: readonly number[],
    count: number,
  ): boolean | null {
    return this.#withNumericWriteGuard(() =>
      this.#setColumnCells(columns, rows, values, count)
    );
  }

  /** Execute a validated sparse/dense cut through compiler-proven numeric writers. */
  executeSourceProgram(
    sources: readonly (ScalarSource | undefined)[],
    values: readonly number[],
    count: number,
  ): boolean {
    return this.#withNumericWriteGuard(() => {
      this.#programDirtySourceCount = 0;
      this.#programChangedSourceCount = 0;
      this.#programAffectedSinkCount = 0;
      this.#programOutputCount = 0;
      try {
        // Slot stamps make duplicate checking linear and are advanced for every
        // invocation, including malformed batches that fail validation.
        if (this.#programSourceEpoch >= Number.MAX_SAFE_INTEGER) {
          for (const slot of this.#programSourceSlots.values()) slot.epoch = 0;
          this.#programSourceEpoch = 1;
        } else {
          this.#programSourceEpoch++;
        }
        const sourceEpoch = this.#programSourceEpoch;
        // Validate the complete cut, including duplicates, before changing a source.
        if (
          !Number.isInteger(count) || count < 0 || count > sources.length ||
          count > values.length
        ) {
          throw new RangeError("Invalid numeric source program count");
        }
        for (let index = 0; index < count; index++) {
          const source = sources[index];
          if (
            source == null || typeof source !== "object" ||
            typeof values[index] !== "number"
          ) {
            throw new TypeError("Invalid numeric source program input");
          }
          const slot = this.#programSourceSlots.get(source);
          if (!slot?.eligible || !this.#groupsBySource.has(source)) {
            throw new Error(
              "Scalar source has no supported numeric program in this VDOM root",
            );
          }
          if (slot.epoch === sourceEpoch) {
            throw new TypeError("Duplicate numeric source program slot");
          }
          slot.epoch = sourceEpoch;
          this.#programDirtySources[this.#programDirtySourceCount++] = slot;
        }
        let changed = false;
        for (let index = 0; index < count; index++) {
          const slot = this.#programDirtySources[index]!;
          if (!Object.is(slot.source.value, values[index])) {
            changed = true;
            this.#programChangedSources[this.#programChangedSourceCount++] =
              slot;
          }
        }
        if (!changed) return false;

        for (let index = 0; index < count; index++) {
          this.#programDirtySources[index]!.source.value = values[index];
        }
        if (this.#programSinkEpoch >= Number.MAX_SAFE_INTEGER) {
          for (const group of this.#programSinkSlots) {
            if (group) group.programEpoch = 0;
          }
          this.#programSinkEpoch = 1;
        } else {
          this.#programSinkEpoch++;
        }
        const sinkEpoch = this.#programSinkEpoch;
        let projectionCount = 0;
        let writeCount = 0;
        let skipCount = 0;
        for (
          let changedIndex = 0;
          changedIndex < this.#programChangedSourceCount;
          changedIndex++
        ) {
          const slot = this.#programChangedSources[changedIndex]!;
          for (
            let groupIndex = 0;
            groupIndex < slot.groups.length;
            groupIndex++
          ) {
            const group = slot.groups[groupIndex];
            const sinkSlot = this.#programSinkSlotByGroup.get(group);
            if (sinkSlot === undefined || group.column !== undefined) continue;
            if (group.programEpoch === sinkEpoch) continue;
            group.programEpoch = sinkEpoch;
            this.#programAffectedSinks[this.#programAffectedSinkCount++] =
              group;
          }
        }
        try {
          // Projection uses the retained binding's compiler emitted pure projector.
          for (
            let sinkIndex = 0;
            sinkIndex < this.#programAffectedSinkCount;
            sinkIndex++
          ) {
            const group = this.#programAffectedSinks[sinkIndex]!;
            const binding = getBoundValue(group.rawValue);
            if (
              !binding || !binding.numericProgram ||
              typeof binding.project !== "function"
            ) {
              throw new Error("Numeric program sink is no longer supported");
            }
            this.#programOutputValues[this.#programOutputCount++] = binding.read
              ? binding.read()
              : binding.project(
                group.sources.length === 1 ? group.sources[0].value : 0,
              );
            projectionCount++;
          }
          for (let index = 0; index < this.#programAffectedSinkCount; index++) {
            const group = this.#programAffectedSinks[index]!;
            const next = this.#programOutputValues[index];
            const preparedCopy = this.#prepareBoundCopy(group, next);
            const prepared = preparedCopy ?? next;
            if (
              sameBoundValueCanSkipWrite(
                this.#effectiveLastValue(group),
                prepared,
                group.forceWrite,
                this.#effectiveLastValueIsCopy(group),
                !!preparedCopy,
              )
            ) {
              skipCount++;
              continue;
            }
            this.#writeBoundGroup(group, prepared, !!preparedCopy);
            this.#stageLastValue(group, prepared, !!preparedCopy);
            writeCount++;
          }
        } finally {
          const sourceUpdates = this.#programChangedSourceCount;
          const sinkCount = this.#programAffectedSinkCount;
          this.#profileCounter?.({
            "numeric.program-batches": 1,
            "numeric.program-source-updates": sourceUpdates,
            "numeric.program-source-slots": count,
            "numeric.program-sinks": sinkCount,
            "numeric.program-projections": projectionCount,
            "numeric.program-writes": writeCount,
            "numeric.program-skips": skipCount,
          });
        }
        return true;
      } finally {
        for (let index = 0; index < this.#programDirtySourceCount; index++) {
          this.#programDirtySources[index] = undefined;
        }
        for (let index = 0; index < this.#programChangedSourceCount; index++) {
          this.#programChangedSources[index] = undefined;
        }
        for (let index = 0; index < this.#programAffectedSinkCount; index++) {
          this.#programAffectedSinks[index] = undefined;
        }
        for (let index = 0; index < this.#programOutputCount; index++) {
          this.#programOutputValues[index] = undefined;
        }
        this.#programDirtySourceCount = 0;
        this.#programChangedSourceCount = 0;
        this.#programAffectedSinkCount = 0;
        this.#programOutputCount = 0;
      }
    });
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
    // Capture projections before host calls so reentrant source changes cannot alter
    // the values consumed by this batch.
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
      const preparedCopy = this.#prepareBoundCopy(group, next);
      const prepared = preparedCopy ?? next;
      if (
        sameBoundValueCanSkipWrite(
          this.#effectiveLastValue(group),
          prepared,
          group.forceWrite,
          this.#effectiveLastValueIsCopy(group),
          !!preparedCopy,
        )
      ) {
        continue;
      }
      this.#writeBoundGroup(group, prepared, !!preparedCopy);
      this.#stageLastValue(group, prepared, !!preparedCopy);
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
        if (Object.is(this.#effectiveLastSourceValue(group), sourceValue)) {
          continue;
        }
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
      numericProgramSourceSlots: this.#programSourceSlots.size,
      numericProgramSinkSlots: this.#programSinkSlotByGroup.size,
      numericProgramSinkSlotCapacity: this.#programSinkSlots.length,
      numericProgramFreeSinkSlots: this.#programFreeSinkSlots.length,
      numericProgramScratchRetained: this.#programDirtySourceCount +
        this.#programChangedSourceCount + this.#programAffectedSinkCount +
        this.#programOutputCount,
      numericProgramScratchCapacity: this.#programDirtySources.length +
        this.#programChangedSources.length + this.#programAffectedSinks.length +
        this.#programOutputValues.length,
      columnRowsScratchRetained: this.#columnRowsScratchCount,
      columnRowsScratchCapacity: this.#columnRowsScratchGroups.length +
        this.#columnRowsScratchSources.length +
        this.#columnRowsScratchValues.length,
      compiledBindingGroups: groupCount(this.#groupsByCompiledBinding),
      compiledSourceGroups: groupCount(this.#groupsByCompiledSource),
      compiledColumnGroups: groupCount(this.#groupsByCompiledColumn),
      compiledColumnBindingGroups: groupCount(
        this.#groupsByCompiledColumnBinding,
      ),
      preparedNumericRowWorkVisits: this.#ownerRowWorkVisits,
      preparedOwnerUpdateKernelBatches: this.#ownerUpdateKernelBatches,
      preparedOwnerUpdateKernelRows: this.#ownerUpdateKernelRows,
      preparedOwnerUpdateKernelInputs: this.#ownerUpdateKernelInputs,
      preparedOwnerUpdateKernelSelectedSinks:
        this.#ownerUpdateKernelSelectedSinks,
      preparedOwnerUpdateKernelStagedSinks: this.#ownerUpdateKernelStagedSinks,
      preparedOwnerUpdateGenericFallbackCuts:
        this.#ownerUpdateGenericFallbackCuts,
      preparedOwnerUpdateGenericProjectors: this.#ownerUpdateGenericProjectors,
      bindingIndexAttachOperations: this.#bindingIndexAttachOperations,
      bindingIndexDetachOperations: this.#bindingIndexDetachOperations,
      bindingIndexIndexOperations: this.#bindingIndexIndexOperations,
      sourceColumnPruneVisits: this.#sourceColumnPruneVisits,
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
    this.#columnRowsScratchActive = true;
    this.#columnRowsScratchCancelled = false;
    try {
      if (this.#columnRowsStageEpoch >= Number.MAX_SAFE_INTEGER) {
        for (const rowsByColumn of this.#groupsByCompiledColumnRows.values()) {
          for (const groups of rowsByColumn) {
            if (!groups) continue;
            for (const group of groups) group.columnRowsStageEpoch = 0;
          }
        }
        this.#columnRowsStageEpoch = 1;
      } else {
        this.#columnRowsStageEpoch++;
      }
      const stageEpoch = this.#columnRowsStageEpoch;
      for (const column of columns) {
        const rowGroups = this.#groupsByCompiledColumnRows.get(column)!;
        for (let index = 0; index < rowCount; index++) {
          const row = rows[index];
          const sourceValue = column.values[row];
          const groups = rowGroups[row]!;
          for (const group of groups) {
            if (group.columnRowsStageEpoch === stageEpoch) continue;
            group.columnRowsStageEpoch = stageEpoch;
            if (Object.is(this.#effectiveLastSourceValue(group), sourceValue)) {
              continue;
            }
            const scratchIndex = this.#columnRowsScratchCount++;
            this.#columnRowsScratchGroups[scratchIndex] = group;
            this.#columnRowsScratchSources[scratchIndex] = sourceValue;
          }
        }
      }
      // Capture every projection before host code can mutate any column value.
      for (let index = 0; index < this.#columnRowsScratchCount; index++) {
        if (this.#columnRowsScratchCancelled) return false;
        const group = this.#columnRowsScratchGroups[index]!;
        this.#columnRowsScratchValues[index] = group.project!(
          this.#columnRowsScratchSources[index]!,
        );
      }
      let wrote = false;
      for (let index = 0; index < this.#columnRowsScratchCount; index++) {
        if (this.#columnRowsScratchCancelled) break;
        const group = this.#columnRowsScratchGroups[index]!;
        const sourceValue = this.#columnRowsScratchSources[index]!;
        const next = this.#columnRowsScratchValues[index];
        const preparedCopy = this.#prepareBoundCopy(group, next);
        const prepared = preparedCopy ?? next;
        if (
          sameBoundValueCanSkipWrite(
            this.#effectiveLastValue(group),
            prepared,
            group.forceWrite,
            this.#effectiveLastValueIsCopy(group),
            !!preparedCopy,
          )
        ) {
          this.#stageLastSourceValue(group, sourceValue);
          continue;
        }
        this.#writeBoundGroup(group, prepared, !!preparedCopy);
        if (this.#columnRowsScratchCancelled) break;
        this.#stageLastSourceValue(group, sourceValue);
        this.#stageLastValue(group, prepared, !!preparedCopy);
        wrote = true;
      }
      return wrote;
    } finally {
      for (let index = 0; index < this.#columnRowsScratchCount; index++) {
        this.#columnRowsScratchGroups[index] = undefined;
        this.#columnRowsScratchSources[index] = undefined;
        this.#columnRowsScratchValues[index] = undefined;
      }
      this.#columnRowsScratchCount = 0;
      this.#columnRowsScratchActive = false;
      if (this.#columnRowsScratchCancelled) {
        this.#columnRowsScratchGroups.length = 0;
        this.#columnRowsScratchSources.length = 0;
        this.#columnRowsScratchValues.length = 0;
      }
      this.#columnRowsScratchCancelled = false;
    }
  }

  #setColumnCells(
    columns: readonly (NumericColumn | undefined)[],
    rows: readonly number[],
    values: readonly number[],
    count: number,
  ): boolean | null {
    if (
      !Number.isInteger(count) || count < 0 || count > columns.length ||
      count > rows.length || count > values.length
    ) throw new RangeError("Dirty cell count is outside the supplied buffers");

    this.#columnRowsScratchActive = true;
    this.#columnRowsScratchCancelled = false;
    try {
      if (this.#columnRowsStageEpoch >= Number.MAX_SAFE_INTEGER) {
        for (const rowsByColumn of this.#groupsByCompiledColumnRows.values()) {
          for (const groups of rowsByColumn) {
            if (!groups) continue;
            for (const group of groups) group.columnRowsStageEpoch = 0;
          }
        }
        for (const rowsByColumn of this.#groupsByColumnCell.values()) {
          for (const groups of rowsByColumn.values()) {
            for (const group of groups) group.columnRowsStageEpoch = 0;
          }
        }
        this.#columnRowsStageEpoch = 1;
      } else {
        this.#columnRowsStageEpoch++;
      }
      const stageEpoch = this.#columnRowsStageEpoch;

      // Validate and capture every supplied value before invoking any user
      // projector. Duplicate addresses must agree so the cut is unambiguous.
      for (let inputIndex = 0; inputIndex < count; inputIndex++) {
        const column = columns[inputIndex];
        const row = rows[inputIndex];
        const value = values[inputIndex];
        if (
          !column || !Number.isSafeInteger(row) || row < 0 ||
          row >= column.values.length || typeof value !== "number"
        ) return null;
        const groups = this.#groupsByColumnCell.get(column)?.get(row);
        if (!groups?.length) return null;
        for (const group of groups) {
          const source = group.sources.length === 1
            ? group.sources[0]
            : undefined;
          const association = source
            ? this.#sourceColumnCells.get(source)
            : undefined;
          if (
            !source || !association || association.column !== column ||
            association.row !== row ||
            !this.#isUnaryColumnGroup(source, group) ||
            !this.#programSourceSlots.get(source)?.eligible
          ) return null;
          if (group.columnRowsStageEpoch === stageEpoch) {
            const stagedIndex = group.columnRowsScratchIndex;
            if (
              stagedIndex === undefined ||
              this.#columnRowsScratchGroups[stagedIndex] !== group ||
              !Object.is(this.#columnRowsScratchSources[stagedIndex], value)
            ) return null;
            continue;
          }
          group.columnRowsStageEpoch = stageEpoch;
          const scratchIndex = this.#columnRowsScratchCount++;
          group.columnRowsScratchIndex = scratchIndex;
          this.#columnRowsScratchGroups[scratchIndex] = group;
          this.#columnRowsScratchSources[scratchIndex] = value;
        }
      }

      // The index is already unique per source/cell, but distinct authored
      // sources may share a cell. Apply all source values before projection.
      for (let index = 0; index < this.#columnRowsScratchCount; index++) {
        const group = this.#columnRowsScratchGroups[index]!;
        group.sources[0].value = this.#columnRowsScratchSources[index]!;
      }
      for (let index = 0; index < this.#columnRowsScratchCount; index++) {
        if (this.#columnRowsScratchCancelled) return false;
        const group = this.#columnRowsScratchGroups[index]!;
        const sourceValue = this.#columnRowsScratchSources[index]!;
        if (Object.is(this.#effectiveLastSourceValue(group), sourceValue)) {
          this.#columnRowsScratchValues[index] = undefined;
        } else {
          this.#columnRowsScratchValues[index] = group.project!(sourceValue);
        }
      }

      let wrote = false;
      for (let index = 0; index < this.#columnRowsScratchCount; index++) {
        if (this.#columnRowsScratchCancelled) break;
        const group = this.#columnRowsScratchGroups[index]!;
        const sourceValue = this.#columnRowsScratchSources[index]!;
        if (Object.is(this.#effectiveLastSourceValue(group), sourceValue)) {
          continue;
        }
        const next = this.#columnRowsScratchValues[index];
        const preparedCopy = this.#prepareBoundCopy(group, next);
        const prepared = preparedCopy ?? next;
        if (
          sameBoundValueCanSkipWrite(
            this.#effectiveLastValue(group),
            prepared,
            group.forceWrite,
            this.#effectiveLastValueIsCopy(group),
            !!preparedCopy,
          )
        ) {
          this.#stageLastSourceValue(group, sourceValue);
          continue;
        }
        this.#writeBoundGroup(group, prepared, !!preparedCopy);
        if (this.#columnRowsScratchCancelled) break;
        this.#stageLastSourceValue(group, sourceValue);
        this.#stageLastValue(group, prepared, !!preparedCopy);
        wrote = true;
      }
      return wrote;
    } finally {
      for (let index = 0; index < this.#columnRowsScratchCount; index++) {
        this.#columnRowsScratchGroups[index]!.columnRowsScratchIndex =
          undefined;
        this.#columnRowsScratchGroups[index] = undefined;
        this.#columnRowsScratchSources[index] = undefined;
        this.#columnRowsScratchValues[index] = undefined;
      }
      this.#columnRowsScratchCount = 0;
      this.#columnRowsScratchActive = false;
      if (this.#columnRowsScratchCancelled) {
        this.#columnRowsScratchGroups.length = 0;
        this.#columnRowsScratchSources.length = 0;
        this.#columnRowsScratchValues.length = 0;
      }
      this.#columnRowsScratchCancelled = false;
    }
  }

  #executePreparedNumericRows(
    tokens: readonly (PreparedNumericRowProgram | undefined)[],
    changedRowIndices: Uint32Array,
    changedSlots: Uint32Array,
    values: readonly number[],
    count: number,
  ): boolean | null {
    if (
      !Number.isSafeInteger(count) || count < 0 ||
      count > changedRowIndices.length || count > changedSlots.length ||
      count > values.length
    ) throw new RangeError("Prepared owner-row cut exceeds supplied buffers");
    const countVisits = this.#profileCounter !== undefined;
    if (countVisits) this.#ownerRowWorkVisits = 0;
    this.#ownerRowRecordCount = 0;
    this.#ownerRowGroupCount = 0;
    this.#ownerRowExecutionActive = true;
    this.#ownerRowExecutionCancelled = false;
    let inputRecordCount = 0;
    let stagedCount = 0;
    let stagedCleanupBound = 0;
    let ownerUpdateProgram: CompiledOwnerUpdateProgram | undefined;
    try {
      if (this.#ownerRowCutEpoch >= Number.MAX_SAFE_INTEGER) {
        this.#ownerRowCutEpoch = 1;
        for (const record of this.#activePreparedNumericRowRecords) {
          record.cutEpoch = 0;
          record.seenMask = 0;
          record.changedEpochs.fill(0);
          for (const groups of record.groupsBySlot) {
            for (const group of groups) group.ownerRowCutEpoch = 0;
          }
        }
      } else this.#ownerRowCutEpoch++;
      const epoch = this.#ownerRowCutEpoch;

      // Validate the packed dirty cut before source mirrors or projections.
      let previousToken: PreparedNumericRowProgram | undefined;
      let previousRecord: PreparedNumericRowProgramRecord<H> | undefined;
      for (let index = 0; index < count; index++) {
        if (countVisits) this.#ownerRowWorkVisits++;
        const tokenIndex = changedRowIndices[index];
        const slotIndex = changedSlots[index];
        const token = tokens[tokenIndex];
        const value = values[index];
        if (
          !Number.isSafeInteger(tokenIndex) || tokenIndex >= tokens.length ||
          !token || !Number.isSafeInteger(slotIndex) ||
          typeof value !== "number"
        ) return null;
        const record = token === previousToken
          ? previousRecord
          : this.#preparedNumericRowPrograms.get(token);
        previousToken = token;
        previousRecord = record;
        if (
          !record || record.root !== this || !record.active ||
          record.token !== token || !record.layout.programId ||
          slotIndex >= record.sources.length
        ) return null;
        const source = record.sources[slotIndex];
        const column = record.columns[slotIndex];
        if (
          !source || record.sourceLease[slotIndex] !== source ||
          record.columnLease[slotIndex] !== column ||
          !column || column.values.length <= record.row
        ) return null;
        if (record.cutEpoch !== epoch) {
          record.cutEpoch = epoch;
          this.#ownerRowRecordScratch[this.#ownerRowRecordCount++] = record;
        }
        if (record.changedEpochs[slotIndex] === epoch) {
          if (!Object.is(record.changedValues[slotIndex], value)) return null;
        } else {
          record.changedEpochs[slotIndex] = epoch;
          record.changedValues[slotIndex] = value;
        }
        this.#ownerRowInputRecordScratch[index] = record;
        inputRecordCount++;
      }
      if (count === 0) return false;
      ownerUpdateProgram = this.#ownerRowRecordScratch[0]!.ownerUpdateProgram;

      // Validate reached dependencies in scratch first: shared leases may be cleared
      // by promotion or row retirement, including untouched dependencies.
      for (let rowIndex = 0; rowIndex < this.#ownerRowRecordCount; rowIndex++) {
        const record = this.#ownerRowRecordScratch[rowIndex];
        if (!record) continue;
        if (
          ownerUpdateProgram && (
            record.ownerUpdateProgram !== ownerUpdateProgram || !record.sinks ||
            record.sinks.length !== ownerUpdateProgram.sinkIds.length
          )
        ) ownerUpdateProgram = undefined;
        for (
          let slotIndex = 0;
          slotIndex < record.sources.length;
          slotIndex++
        ) {
          if (countVisits) this.#ownerRowWorkVisits++;
          if (record.usedSlots[slotIndex]) {
            const source = record.sources[slotIndex];
            const column = record.columns[slotIndex];
            if (
              !source || record.sourceLease[slotIndex] !== source ||
              record.columnLease[slotIndex] !== column ||
              !column || column.values.length <= record.row
            ) return null;
            record.inputValues[slotIndex] =
              record.columns[slotIndex].values[record.row];
          }
          if (record.changedEpochs[slotIndex] === epoch) {
            record.inputValues[slotIndex] = record.changedValues[slotIndex];
          }
        }
      }

      if (ownerUpdateProgram) {
        const outputCapacity = this.#ownerRowRecordCount *
          ownerUpdateProgram.sinkIds.length;
        if (
          !Number.isSafeInteger(outputCapacity) || outputCapacity > 0xffff_ffff
        ) {
          ownerUpdateProgram = undefined;
        } else {
          stagedCleanupBound = outputCapacity;
          if (this.#ownerRowStagedInputIndices.length < outputCapacity) {
            this.#ownerRowStagedInputIndices = new Uint32Array(outputCapacity);
            this.#ownerRowStagedSinkIds = new Uint16Array(outputCapacity);
            this.#ownerRowStagedValues.length = outputCapacity;
          } else if (this.#ownerRowStagedValues.length < outputCapacity) {
            this.#ownerRowStagedValues.length = outputCapacity;
          }
          for (
            let rowIndex = 0;
            rowIndex < this.#ownerRowRecordCount;
            rowIndex++
          ) {
            const record = this.#ownerRowRecordScratch[rowIndex];
            if (record) record.seenMask = 0;
          }
          if (countVisits) {
            this.#ownerUpdateKernelBatches++;
            this.#ownerUpdateKernelRows += this.#ownerRowRecordCount;
            this.#ownerUpdateKernelInputs += count;
          }
        }
      }
      if (!ownerUpdateProgram) {
        for (
          let rowIndex = 0;
          rowIndex < this.#ownerRowRecordCount;
          rowIndex++
        ) {
          const record = this.#ownerRowRecordScratch[rowIndex];
          if (!record) continue;
          const sinks = record.sinks;
          if (
            record.ownerUpdateProgram && sinks &&
            sinks[0].ownerRowInputs === undefined
          ) {
            for (const groups of record.groupsBySlot) {
              for (const group of groups) {
                if (group !== sinks[0]) {
                  group.ownerRowInputs ??= new Array<number>(
                    group.sources.length,
                  );
                }
              }
            }
            sinks[0].ownerRowInputs ??= new Array<number>(
              sinks[0].sources.length,
            );
          }
        }
        if (countVisits) this.#ownerUpdateGenericFallbackCuts++;
      }

      // Mirror the complete captured dependency vectors before any sink runs.
      for (let rowIndex = 0; rowIndex < this.#ownerRowRecordCount; rowIndex++) {
        const record = this.#ownerRowRecordScratch[rowIndex];
        if (!record) continue;
        for (
          let slotIndex = 0;
          slotIndex < record.sources.length;
          slotIndex++
        ) {
          if (countVisits) this.#ownerRowWorkVisits++;
          const source = record.sources[slotIndex];
          if (
            source &&
            (record.usedSlots[slotIndex] ||
              record.changedEpochs[slotIndex] === epoch)
          ) {
            source.value = record.inputValues[slotIndex];
          }
        }
      }

      let wrote = false;
      if (ownerUpdateProgram) {
        if (this.#ownerRowExecutionCancelled) return false;
        stagedCount = ownerUpdateProgram.executeCut(
          changedSlots,
          count,
          this.#ownerRowInputRecordScratch as unknown as readonly (
            CompiledOwnerUpdateRowState | undefined
          )[],
          this.#ownerRowStagedInputIndices,
          this.#ownerRowStagedSinkIds,
          this.#ownerRowStagedValues,
        );
        if (this.#ownerRowExecutionCancelled) return false;
        if (
          !Number.isSafeInteger(stagedCount) || stagedCount < 0 ||
          stagedCount > stagedCleanupBound
        ) {
          throw new Error(
            "Compiled owner update kernel returned an invalid output count",
          );
        }
        for (let index = 0; index < this.#ownerRowRecordCount; index++) {
          const record = this.#ownerRowRecordScratch[index];
          if (!record) continue;
          const validMask = (1 << record.sinks!.length) - 1;
          if ((record.seenMask & ~validMask) !== 0) {
            throw new Error(
              "Compiled owner update kernel selected an unknown sink",
            );
          }
        }
        for (let index = 0; index < stagedCount; index++) {
          const inputIndex = this.#ownerRowStagedInputIndices[index];
          const sinkIndex = this.#ownerRowStagedSinkIds[index];
          const record = this.#ownerRowInputRecordScratch[inputIndex];
          const next = this.#ownerRowStagedValues[index];
          if (
            !Number.isSafeInteger(inputIndex) || inputIndex >= count ||
            !record || !record.sinks || sinkIndex >= record.sinks.length ||
            (record.seenMask & (1 << sinkIndex)) === 0 ||
            !isCompiledOwnerUpdatePrimitive(next)
          ) {
            throw new Error(
              "Compiled owner update kernel returned an invalid sink output",
            );
          }
        }
        if (this.#ownerRowExecutionCancelled) return false;
        stagedCleanupBound = stagedCount;
        let selectedSinkCount = 0;
        for (let index = 0; index < this.#ownerRowRecordCount; index++) {
          const record = this.#ownerRowRecordScratch[index];
          if (!record) continue;
          for (
            let sinkIndex = 0;
            sinkIndex < record.sinks!.length;
            sinkIndex++
          ) {
            if ((record.seenMask & (1 << sinkIndex)) !== 0) {
              const group = record.sinks![sinkIndex];
              selectedSinkCount++;
              this.#stageLastSourceValue(
                group,
                record.inputValues[group.ownerRowInputSlots![0]],
              );
            }
          }
        }
        if (countVisits) {
          this.#ownerUpdateKernelSelectedSinks += selectedSinkCount;
          this.#ownerUpdateKernelStagedSinks += stagedCount;
        }
        if (this.#ownerRowExecutionCancelled) return false;
        for (let index = 0; index < stagedCount; index++) {
          if (this.#ownerRowExecutionCancelled) break;
          const inputIndex = this.#ownerRowStagedInputIndices[index];
          const sinkIndex = this.#ownerRowStagedSinkIds[index];
          const record = this.#ownerRowInputRecordScratch[inputIndex]!;
          const next = this.#ownerRowStagedValues[index];
          const group = record.sinks![sinkIndex];
          const preparedCopy = this.#prepareBoundCopy(group, next);
          const prepared = preparedCopy ?? next;
          this.#writeBoundGroup(group, prepared, !!preparedCopy);
          wrote = true;
          if (this.#ownerRowExecutionCancelled) break;
          this.#stageLastValue(group, prepared, !!preparedCopy);
        }
      } else {
        // Explicit changed-slot fanouts preserve the generic first-touch order.
        for (let index = 0; index < count; index++) {
          const record = this.#ownerRowInputRecordScratch[index]!;
          const slotIndex = changedSlots[index];
          if (countVisits) this.#ownerRowWorkVisits++;
          for (const group of record.groupsBySlot[slotIndex]) {
            if (countVisits) this.#ownerRowWorkVisits++;
            if (group.ownerRowCutEpoch === epoch) continue;
            group.ownerRowCutEpoch = epoch;
            const scratchIndex = this.#ownerRowGroupCount++;
            this.#ownerRowGroupScratch[scratchIndex] = group;
            this.#ownerRowGroupRecordScratch[scratchIndex] = record;
          }
        }
        for (let index = 0; index < this.#ownerRowGroupCount; index++) {
          if (this.#ownerRowExecutionCancelled) return false;
          if (countVisits) this.#ownerRowWorkVisits++;
          const group = this.#ownerRowGroupScratch[index]!;
          const record = this.#ownerRowGroupRecordScratch[index]!;
          const slots = group.ownerRowInputSlots!;
          const inputs = group.ownerRowInputs!;
          for (let inputIndex = 0; inputIndex < slots.length; inputIndex++) {
            inputs[inputIndex] = record.inputValues[slots[inputIndex]];
          }
          this.#ownerRowValueScratch[index] = group.ownerRowProjectInputs
            ? group.ownerRowProjectInputs(inputs)
            : group.project!(inputs[0]);
          if (this.#ownerRowExecutionCancelled) return false;
        }
        if (countVisits) {
          this.#ownerUpdateGenericProjectors += this.#ownerRowGroupCount;
        }
        if (this.#ownerRowExecutionCancelled) return false;

        for (let index = 0; index < this.#ownerRowGroupCount; index++) {
          const group = this.#ownerRowGroupScratch[index]!;
          const record = this.#ownerRowGroupRecordScratch[index]!;
          this.#stageLastSourceValue(
            group,
            record.inputValues[group.ownerRowInputSlots![0]],
          );
        }
        for (let index = 0; index < this.#ownerRowGroupCount; index++) {
          if (this.#ownerRowExecutionCancelled) break;
          const group = this.#ownerRowGroupScratch[index]!;
          const next = this.#ownerRowValueScratch[index];
          const preparedCopy = this.#prepareBoundCopy(group, next);
          const prepared = preparedCopy ?? next;
          if (
            sameBoundValueCanSkipWrite(
              this.#effectiveLastValue(group),
              prepared,
              group.forceWrite,
              this.#effectiveLastValueIsCopy(group),
              !!preparedCopy,
            )
          ) continue;
          this.#writeBoundGroup(group, prepared, !!preparedCopy);
          wrote = true;
          if (this.#ownerRowExecutionCancelled) break;
          this.#stageLastValue(group, prepared, !!preparedCopy);
        }
      }
      return wrote;
    } finally {
      for (let index = 0; index < this.#ownerRowRecordCount; index++) {
        this.#ownerRowRecordScratch[index] = undefined;
      }
      for (let index = 0; index < inputRecordCount; index++) {
        this.#ownerRowInputRecordScratch[index] = undefined;
      }
      for (let index = 0; index < this.#ownerRowGroupCount; index++) {
        this.#ownerRowGroupScratch[index] = undefined;
        this.#ownerRowGroupRecordScratch[index] = undefined;
        this.#ownerRowValueScratch[index] = undefined;
      }
      const stagedCleanupCount = Math.min(
        stagedCleanupBound,
        this.#ownerRowStagedValues.length,
      );
      for (let index = 0; index < stagedCleanupCount; index++) {
        this.#ownerRowStagedInputIndices[index] = 0;
        this.#ownerRowStagedSinkIds[index] = 0;
        this.#ownerRowStagedValues[index] = 0;
      }
      this.#ownerRowRecordCount = 0;
      this.#ownerRowGroupCount = 0;
      this.#ownerRowExecutionActive = false;
      if (this.#ownerRowExecutionCancelled) {
        this.#ownerRowRecordScratch.length = 0;
        this.#ownerRowInputRecordScratch.length = 0;
        this.#ownerRowGroupScratch.length = 0;
        this.#ownerRowGroupRecordScratch.length = 0;
        this.#ownerRowValueScratch.length = 0;
        this.#ownerRowStagedInputIndices = new Uint32Array(0);
        this.#ownerRowStagedSinkIds = new Uint16Array(0);
        this.#ownerRowStagedValues.length = 0;
      }
      this.#ownerRowExecutionCancelled = false;
    }
  }

  #executePreparedNumericCells(
    tokens: readonly (PreparedNumericCellProgram | undefined)[],
    values: readonly number[],
    count: number,
  ): boolean | null {
    if (
      !Number.isInteger(count) || count < 0 || count > tokens.length ||
      count > values.length
    ) {
      throw new RangeError(
        "Prepared numeric cell count is outside the supplied buffers",
      );
    }

    this.#preparedCellDirtyCount = 0;
    this.#columnRowsScratchCount = 0;
    this.#columnRowsScratchActive = true;
    this.#columnRowsScratchCancelled = false;
    try {
      if (this.#preparedCellCutEpoch >= Number.MAX_SAFE_INTEGER) {
        for (const slot of this.#programSourceSlots.values()) {
          slot.preparedCutEpoch = 0;
        }
        this.#preparedCellCutEpoch = 1;
      } else {
        this.#preparedCellCutEpoch++;
      }
      const cutEpoch = this.#preparedCellCutEpoch;

      // Validate all token provenance and conflicting duplicate values before
      // changing any ScalarSource or calling a projector/host writer.
      for (let index = 0; index < count; index++) {
        const token = tokens[index];
        const value = values[index];
        if (!token || typeof value !== "number") return null;
        const record = this.#preparedCellProgramRecords.get(token);
        if (
          !record || record.root !== this || !record.active ||
          record.slot.cellProgram !== record || !record.slot.eligible ||
          record.generation !== record.slot.cellProgramGeneration ||
          record.groups !== record.slot.groups
        ) return null;
        const slot = record.slot;
        if (slot.preparedCutEpoch === cutEpoch) {
          if (!Object.is(slot.preparedCutValue, value)) return null;
          continue;
        }
        slot.preparedCutEpoch = cutEpoch;
        slot.preparedCutValue = value;
        const dirtyIndex = this.#preparedCellDirtyCount++;
        this.#preparedCellDirtySlots[dirtyIndex] = slot;
        this.#preparedCellDirtyValues[dirtyIndex] = value;
      }

      // Capture every source value first. Some compiler closures read the
      // mirrored ScalarSource directly instead of only using the argument.
      for (let index = 0; index < this.#preparedCellDirtyCount; index++) {
        this.#preparedCellDirtySlots[index]!.source.value = this
          .#preparedCellDirtyValues[index]!;
      }
      for (
        let dirtyIndex = 0;
        dirtyIndex < this.#preparedCellDirtyCount;
        dirtyIndex++
      ) {
        const slot = this.#preparedCellDirtySlots[dirtyIndex]!;
        const sourceValue = this.#preparedCellDirtyValues[dirtyIndex]!;
        for (const group of slot.groups) {
          const scratchIndex = this.#columnRowsScratchCount++;
          this.#columnRowsScratchGroups[scratchIndex] = group;
          this.#columnRowsScratchSources[scratchIndex] = sourceValue;
          this.#columnRowsScratchValues[scratchIndex] = undefined;
        }
      }

      // Run all projections before the first host write.
      for (let index = 0; index < this.#columnRowsScratchCount; index++) {
        if (this.#columnRowsScratchCancelled) return false;
        const group = this.#columnRowsScratchGroups[index]!;
        const sourceValue = this.#columnRowsScratchSources[index]!;
        this.#columnRowsScratchValues[index] =
          Object.is(this.#effectiveLastSourceValue(group), sourceValue)
            ? undefined
            : group.project!(sourceValue);
      }

      let wrote = false;
      for (let index = 0; index < this.#columnRowsScratchCount; index++) {
        if (this.#columnRowsScratchCancelled) break;
        const group = this.#columnRowsScratchGroups[index]!;
        const sourceValue = this.#columnRowsScratchSources[index]!;
        if (Object.is(this.#effectiveLastSourceValue(group), sourceValue)) {
          continue;
        }
        const next = this.#columnRowsScratchValues[index];
        const preparedCopy = this.#prepareBoundCopy(group, next);
        const prepared = preparedCopy ?? next;
        if (
          sameBoundValueCanSkipWrite(
            this.#effectiveLastValue(group),
            prepared,
            group.forceWrite,
            this.#effectiveLastValueIsCopy(group),
            !!preparedCopy,
          )
        ) {
          this.#stageLastSourceValue(group, sourceValue);
          continue;
        }
        this.#writeBoundGroup(group, prepared, !!preparedCopy);
        if (this.#columnRowsScratchCancelled) break;
        this.#stageLastSourceValue(group, sourceValue);
        this.#stageLastValue(group, prepared, !!preparedCopy);
        wrote = true;
      }
      return wrote;
    } finally {
      for (let index = 0; index < this.#columnRowsScratchCount; index++) {
        this.#columnRowsScratchGroups[index] = undefined;
        this.#columnRowsScratchSources[index] = undefined;
        this.#columnRowsScratchValues[index] = undefined;
      }
      for (let index = 0; index < this.#preparedCellDirtyCount; index++) {
        this.#preparedCellDirtySlots[index] = undefined;
        this.#preparedCellDirtyValues[index] = undefined;
      }
      this.#columnRowsScratchCount = 0;
      this.#preparedCellDirtyCount = 0;
      this.#columnRowsScratchActive = false;
      if (this.#columnRowsScratchCancelled) {
        this.#columnRowsScratchGroups.length = 0;
        this.#columnRowsScratchSources.length = 0;
        this.#columnRowsScratchValues.length = 0;
        this.#preparedCellDirtySlots.length = 0;
        this.#preparedCellDirtyValues.length = 0;
      }
      this.#columnRowsScratchCancelled = false;
    }
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
            if (Object.is(this.#effectiveLastSourceValue(group), sourceValue)) {
              continue;
            }
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
    this.#invalidateAllPreparedNumericCellPrograms();
    for (const source of this.#numericRowProgramsBySource.keys()) {
      this.#invalidatePreparedNumericRowsForSource(source);
    }
    this.#refPublicationEpoch++;
    if (this.#ownerRowExecutionActive) this.#ownerRowExecutionCancelled = true;
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
      this.#clearPendingHistory();
      this.#publicationToken = null;
      this.#publicationFailed = false;
      acceptedJournalByHost.delete(this.#renderHost as object);
      this.#acceptedJournal = null;
      this.#acceptedSnapshot = null;
      this.#keyedVNodeRetentionParents.clear();
      this.#mounted = [];
      this.#snapshot = [];
      this.#snapshotDirty = false;
      this.#nodesByKey.clear();
      this.#nodesByKeyedRegion.clear();
      this.#groupsBySource.clear();
      this.#programSourceSlots.clear();
      this.#numericRowProgramsBySource.clear();
      this.#programSinkSlots.length = 0;
      this.#programFreeSinkSlots.length = 0;
      this.#programSinkSlotByGroup.clear();
      this.#programDirtySources.length = 0;
      this.#programChangedSources.length = 0;
      this.#programAffectedSinks.length = 0;
      this.#programOutputValues.length = 0;
      this.#programDirtySourceCount = 0;
      this.#programChangedSourceCount = 0;
      this.#programAffectedSinkCount = 0;
      this.#programOutputCount = 0;
      if (this.#columnRowsScratchActive) {
        this.#columnRowsScratchCancelled = true;
      } else {
        this.#columnRowsScratchGroups.length = 0;
        this.#columnRowsScratchSources.length = 0;
        this.#columnRowsScratchValues.length = 0;
        this.#columnRowsScratchCount = 0;
        this.#preparedCellDirtySlots.length = 0;
        this.#preparedCellDirtyValues.length = 0;
        this.#preparedCellDirtyCount = 0;
      }
      if (!this.#ownerRowExecutionActive) {
        this.#ownerRowRecordScratch.length = 0;
        this.#ownerRowInputRecordScratch.length = 0;
        this.#ownerRowGroupScratch.length = 0;
        this.#ownerRowGroupRecordScratch.length = 0;
        this.#ownerRowValueScratch.length = 0;
        this.#ownerRowStagedInputIndices = new Uint32Array(0);
        this.#ownerRowStagedSinkIds = new Uint16Array(0);
        this.#ownerRowStagedValues.length = 0;
        this.#ownerRowRecordCount = 0;
        this.#ownerRowGroupCount = 0;
      }
      this.#incompatibleScalarBindingGroups = 0;
      this.#groupsByCompiledBinding.clear();
      this.#groupsByCompiledSource.clear();
      this.#groupsByCompiledColumnBinding.clear();
      this.#groupsByCompiledColumn.clear();
      this.#groupsByCompiledColumnRows.clear();
      this.#sourceColumnCells.clear();
      this.#pendingSourceColumnPrunes.clear();
      this.#groupsByColumnCell.clear();
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
      const preparedCopy = this.#prepareBoundCopy(group, next);
      const prepared = preparedCopy ?? next;
      if (
        sameBoundValueCanSkipWrite(
          this.#effectiveLastValue(group),
          prepared,
          group.forceWrite,
          this.#effectiveLastValueIsCopy(group),
          !!preparedCopy,
        )
      ) {
        this.#stageLastSourceValue(group, sourceValue);
        continue;
      }
      this.#writeBoundGroup(group, prepared, !!preparedCopy);
      this.#stageLastSourceValue(group, sourceValue);
      this.#stageLastValue(group, prepared, !!preparedCopy);
      wrote = true;
    }
    return wrote;
  }

  #writeBoundGroup(
    group: BoundPropGroup<H>,
    next: unknown,
    nextIsCopy = false,
  ) {
    const written = nextIsCopy
      ? (next as AcceptedCopyValue).writeValue
      : next;
    const previous = this.#effectiveLastValue(group);
    const before = this.#effectiveLastValueIsCopy(group)
      ? (previous as AcceptedCopyValue).writeValue
      : previous;
    if (group.styleProperty !== undefined) {
      if (group.styleWriter) {
        group.styleWriter(written, before);
      } else if (this.#renderHost.setStyleProp) {
        this.#renderHost.setStyleProp(
          group.handle,
          group.styleProperty,
          written,
          before,
        );
      } else {
        this.#renderHost.setProp(group.handle, "style", {
          [group.styleProperty]: written,
        }, { [group.styleProperty]: before });
      }
    } else {
      this.#renderHost.setProp(
        group.handle,
        group.name,
        written,
        before,
      );
    }
  }

  #activateBoundPropGroup(group: BoundPropGroup<H>) {
    if (group.styleProperty === undefined || !this.#renderHost.setStyleProp) {
      return;
    }
    const writer = this.#renderHost.prepareStyleProp?.(
      group.handle,
      group.styleProperty,
    );
    if (typeof writer === "function") group.styleWriter = writer;
  }

  #makeScalarBindingGroups(
    node: MountedNode<H>,
    name: string,
    rawValue: unknown,
    acceptedCopy?: AcceptedCopyValue | null,
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
          lastValue: styleProperty === undefined
            ? (acceptedCopy === undefined && node.vnode.kind === "element"
              ? node.vnode.acceptedCopyProps?.[name]
              : acceptedCopy) ?? readBoundValue(binding)
            : readBoundValue(binding),
          lastValueIsCopy: styleProperty === undefined &&
            !!(acceptedCopy === undefined && node.vnode.kind === "element"
              ? node.vnode.acceptedCopyProps?.[name]
              : acceptedCopy),
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
        lastValue: (acceptedCopy === undefined && node.vnode.kind === "element"
          ? node.vnode.acceptedCopyProps?.[name]
          : acceptedCopy) ??
          materializeProp(name, rawValue),
        lastValueIsCopy: !!(acceptedCopy === undefined &&
            node.vnode.kind === "element"
          ? node.vnode.acceptedCopyProps?.[name]
          : acceptedCopy),
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
    for (const group of groups) this.#activateBoundPropGroup(group);
    (node.scalarBindingGroups ??= new Map()).set(name, groups);
    this.#bindingIndexAttachOperations += groups.length;
    if (plan.incompatible) {
      (node.scalarIncompatibleBindingProps ??= new Set()).add(name);
      this.#incompatibleScalarBindingGroups++;
    }
    for (const group of groups) {
      if (!this.#programSinkSlotByGroup.has(group)) {
        const free = this.#programFreeSinkSlots.pop();
        const sinkSlot = free === undefined
          ? this.#programSinkSlots.length
          : free;
        this.#programSinkSlots[sinkSlot] = group;
        this.#programSinkSlotByGroup.set(group, sinkSlot);
      }
      for (const source of group.sources) {
        this.#invalidatePreparedNumericRowsForSource(source);
        this.#pendingSourceColumnPrunes.delete(source);
        let list = this.#groupsBySource.get(source);
        if (!list) this.#groupsBySource.set(source, list = new Set());
        const alreadyIndexed = list.has(group);
        list.add(group);
        let slot = this.#programSourceSlots.get(source);
        if (!slot) {
          this.#programSourceSlots.set(
            source,
            slot = {
              source,
              groups: [],
              eligible: false,
              unaryEligible: false,
              epoch: 0,
              cellProgramGeneration: 0,
              preparedCutEpoch: 0,
              preparedCutValue: 0,
            },
          );
        }
        if (!slot.groups.includes(group)) {
          this.#invalidatePreparedNumericCellProgram(slot);
          slot.groups.push(group);
        }
        this.#refreshProgramEligibility(slot);
        this.#indexSourceColumnGroup(source, group);
        if (!alreadyIndexed) this.#bindingIndexIndexOperations++;
      }
    }
  }

  #unregisterScalarBindingProp(node: MountedNode<H>, name: string) {
    const groups = node.scalarBindingGroups?.get(name);
    if (groups) {
      let detached = false;
      for (const group of groups) {
        this.#unindexSourceColumnGroup(group);
        for (const source of group.sources) {
          this.#invalidatePreparedNumericRowsForSource(source);
          const list = this.#groupsBySource.get(source);
          if (!list || !list.delete(group)) continue;
          const programSlot = this.#programSourceSlots.get(source);
          if (programSlot) {
            this.#invalidatePreparedNumericCellProgram(programSlot);
            const index = programSlot.groups.indexOf(group);
            if (index !== -1) programSlot.groups.splice(index, 1);
          }
          if (programSlot && programSlot.groups.length === 0) {
            this.#programSourceSlots.delete(source);
          } else if (programSlot) this.#refreshProgramEligibility(programSlot);
          detached = true;
          this.#bindingIndexIndexOperations++;
          if (list.size === 0) {
            this.#groupsBySource.delete(source);
            if (this.#sourceColumnCells.has(source)) {
              this.#pendingSourceColumnPrunes.add(source);
            }
          }
        }
      }
      if (detached) this.#bindingIndexDetachOperations += groups.length;
      node.scalarBindingGroups?.delete(name);
      for (const group of groups) {
        this.#removeProgramSink(group);
        group.styleWriter = undefined;
      }
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

  #refreshProgramEligibility(slot: NumericProgramSourceSlot<H>) {
    const wasEligible = slot.eligible;
    let eligible = this.#directBindingWrites && slot.groups.length > 0;
    let unaryEligible = eligible;
    if (!eligible) {
      slot.eligible = false;
      slot.unaryEligible = false;
      if (wasEligible) this.#invalidatePreparedNumericCellProgram(slot);
      return;
    }
    for (const group of slot.groups) {
      const binding = getBoundValue(group.rawValue);
      const descriptor = binding?.numericProgram;
      if (
        !descriptor ||
        (descriptor.schemaVersion !== 1 && descriptor.schemaVersion !== 2) ||
        typeof descriptor.sinkId !== "string" ||
        descriptor.sinkId.length === 0 ||
        (descriptor.schemaVersion === 2 &&
          (typeof descriptor.ownerProgramId !== "string" ||
            descriptor.ownerProgramId.length === 0)) ||
        !Array.isArray(descriptor.sourceSites) ||
        descriptor.sourceSites.length !== group.sources.length ||
        descriptor.sourceSites.some((site) => typeof site !== "string") ||
        !group.sources.includes(slot.source) || !binding.project ||
        group.column !== undefined ||
        (group.styleProperty !== undefined && !group.styleWriter &&
          !this.#renderHost.setStyleProp)
      ) {
        eligible = false;
        break;
      }
      if (
        group.sources.length !== 1 || group.sources[0] !== slot.source ||
        typeof group.project !== "function" || group.column !== undefined ||
        descriptor.sourceSites.length !== 1
      ) unaryEligible = false;
    }
    slot.eligible = eligible;
    slot.unaryEligible = eligible && unaryEligible;
    if (wasEligible !== eligible) {
      this.#invalidatePreparedNumericCellProgram(slot);
    }
  }

  #invalidatePreparedNumericCellProgram(slot: NumericProgramSourceSlot<H>) {
    slot.cellProgramGeneration++;
    const record = slot.cellProgram;
    if (record) {
      record.active = false;
      record.groups = undefined;
      this.#preparedCellProgramRecords.delete(record.token);
      slot.cellProgram = undefined;
    }
  }

  #invalidateAllPreparedNumericCellPrograms() {
    for (const slot of this.#programSourceSlots.values()) {
      this.#invalidatePreparedNumericCellProgram(slot);
    }
  }

  #isUnaryColumnGroup(source: ScalarSource, group: BoundPropGroup<H>) {
    const binding = getBoundValue(group.rawValue);
    const descriptor = binding?.numericProgram;
    const supportedDescriptor = !!descriptor && (
      descriptor.schemaVersion === 1 ||
      descriptor.schemaVersion === 2 &&
        typeof descriptor.ownerProgramId === "string" &&
        descriptor.ownerProgramId.length > 0
    );
    return group.sources.length === 1 && group.sources[0] === source &&
      typeof group.project === "function" && group.column === undefined &&
      supportedDescriptor && descriptor!.sourceSites.length === 1 &&
      typeof descriptor!.sourceSites[0] === "string";
  }

  #indexSourceColumnGroup(source: ScalarSource, group: BoundPropGroup<H>) {
    const cell = this.#sourceColumnCells.get(source);
    if (
      !cell ||
      !this.#isUnaryColumnGroup(source, group)
    ) return;
    let rows = this.#groupsByColumnCell.get(cell.column);
    if (!rows) this.#groupsByColumnCell.set(cell.column, rows = new Map());
    let groups = rows.get(cell.row);
    if (!groups) rows.set(cell.row, groups = []);
    if (!groups.includes(group)) groups.push(group);
    group.sourceColumn = cell.column;
    group.sourceColumnRow = cell.row;
  }

  #unindexSourceColumnGroup(group: BoundPropGroup<H>) {
    const column = group.sourceColumn;
    const row = group.sourceColumnRow;
    if (!column || row === undefined) return;
    const rows = this.#groupsByColumnCell.get(column);
    const groups = rows?.get(row);
    if (groups) {
      const index = groups.indexOf(group);
      if (index !== -1) groups.splice(index, 1);
      if (groups.length === 0) rows!.delete(row);
      if (rows!.size === 0) this.#groupsByColumnCell.delete(column);
    }
    group.sourceColumn = undefined;
    group.sourceColumnRow = undefined;
  }

  #pruneSourceColumnCells() {
    for (const source of this.#pendingSourceColumnPrunes) {
      this.#sourceColumnPruneVisits++;
      if (!this.#groupsBySource.get(source)?.size) {
        this.#sourceColumnCells.delete(source);
      }
    }
    this.#pendingSourceColumnPrunes.clear();
  }

  #removeProgramSink(group: BoundPropGroup<H>) {
    const index = this.#programSinkSlotByGroup.get(group);
    if (index === undefined) return;
    this.#programSinkSlotByGroup.delete(group);
    this.#programSinkSlots[index] = undefined;
    this.#programFreeSinkSlots.push(index);
  }

  #refreshScalarBindingProp(
    node: MountedNode<H>,
    name: string,
    rawValue: unknown,
    acceptedCopy?: AcceptedCopyValue | null,
  ) {
    const oldGroups = node.scalarBindingGroups?.get(name) ?? [];
    const oldIncompatible = node.scalarIncompatibleBindingProps?.has(name) ??
      false;
    const plan = this.#makeScalarBindingGroups(
      node,
      name,
      rawValue,
      acceptedCopy,
    );
    const nextGroups = plan.groups;
    const nextIncompatible = plan.incompatible;
    const unchangedGroups = oldGroups.length === nextGroups.length &&
      oldGroups.every((old, index) =>
        old.rawValue === nextGroups[index].rawValue
      );
    if (unchangedGroups && oldIncompatible === nextIncompatible) {
      for (let index = 0; index < oldGroups.length; index++) {
        const group = oldGroups[index];
        if (group.styleProperty === undefined &&
          (acceptedCopy || this.#effectiveLastValueIsCopy(group))) {
          this.#stageLastValue(
            group,
            nextGroups[index].lastValue,
            !!nextGroups[index].lastValueIsCopy,
          );
        }
      }
      return;
    }
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
      for (const old of oldGroups) this.#unindexSourceColumnGroup(old);
      for (let index = 0; index < oldGroups.length; index++) {
        const old = oldGroups[index];
        const next = nextGroups[index];
        for (const source of old.sources) {
          this.#invalidatePreparedNumericRowsForSource(source);
        }
        old.rawValue = next.rawValue;
        old.project = next.project;
        this.#stageLastValue(old, next.lastValue, !!next.lastValueIsCopy);
        old.forceWrite = next.forceWrite;
        for (const source of old.sources) {
          const slot = this.#programSourceSlots.get(source);
          if (slot) {
            this.#invalidatePreparedNumericCellProgram(slot);
            this.#refreshProgramEligibility(slot);
          }
        }
      }
      for (const old of oldGroups) {
        for (const source of old.sources) {
          const slot = this.#programSourceSlots.get(source);
          if (slot?.eligible && this.#sourceColumnCells.has(source)) {
            this.#indexSourceColumnGroup(source, old);
          }
        }
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
    const authored = node.vnode.scopedSourceProps ?? node.vnode.props;
    for (const [name, rawValue] of Object.entries(authored)) {
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
    this.#invalidateAllPreparedNumericCellPrograms();
    for (const source of this.#numericRowProgramsBySource.keys()) {
      this.#invalidatePreparedNumericRowsForSource(source);
    }
    this.#groupsBySource.clear();
    this.#programSourceSlots.clear();
    this.#programSinkSlots.length = 0;
    this.#programFreeSinkSlots.length = 0;
    this.#programSinkSlotByGroup.clear();
    this.#incompatibleScalarBindingGroups = 0;
    this.#groupsByCompiledBinding.clear();
    this.#groupsByCompiledSource.clear();
    this.#groupsByCompiledColumnBinding.clear();
    this.#groupsByCompiledColumn.clear();
    this.#groupsByCompiledColumnRows.clear();
    this.#groupsByColumnCell.clear();
    this.#pendingSourceColumnPrunes.clear();
    this.#compiledSlotBySource.clear();
    if (this.#compiledGraph) this.#validateCompiledGraph(this.#compiledGraph);
    const visit = (node: MountedNode<H>) => {
      if (node.hostDisposed) {
        node.scalarBindingGroups = undefined;
        node.scalarIncompatibleBindingProps = undefined;
        return;
      }
      if (countVisits) visits++;
      if (node.scalarBindingGroups) {
        for (const groups of node.scalarBindingGroups.values()) {
          for (const group of groups) group.styleWriter = undefined;
        }
      }
      node.scalarBindingGroups = undefined;
      node.scalarIncompatibleBindingProps = undefined;
      if (node.vnode.kind === "element") {
        const authored = node.vnode.scopedSourceProps ?? node.vnode.props;
        for (const [name, rawValue] of Object.entries(authored)) {
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
                lastValue: node.vnode.acceptedCopyProps?.[name] ?? (column
                  ? binding.binding!.project(column.values[columnIndex!])
                  : binding.binding!.project(binding.source.value)),
                lastValueIsCopy: !!node.vnode.acceptedCopyProps?.[name],
              };
              this.#activateBoundPropGroup(group);
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
                  lastValue: styleProperty === undefined
                    ? node.vnode.acceptedCopyProps?.[name] ??
                      readBoundValue(binding)
                    : readBoundValue(binding),
                  lastValueIsCopy: styleProperty === undefined &&
                    !!node.vnode.acceptedCopyProps?.[name],
                  forceWrite: !!binding.read,
                };
                this.#activateBoundPropGroup(group);
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
              lastValue: node.vnode.acceptedCopyProps?.[name] ??
                materializeProp(name, rawValue),
              lastValueIsCopy: !!node.vnode.acceptedCopyProps?.[name],
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
    for (const source of this.#sourceColumnCells.keys()) {
      this.#sourceColumnPruneVisits++;
      const groups = this.#groupsBySource.get(source);
      if (!groups?.size) {
        this.#sourceColumnCells.delete(source);
        continue;
      }
      for (const group of groups) this.#indexSourceColumnGroup(source, group);
    }
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
    // Rebuild mode regenerates writer groups directly; publish the same program
    // indices used by delta registration from that canonical source index.
    for (const [source, groups] of this.#groupsBySource) {
      const slot: NumericProgramSourceSlot<H> = {
        source,
        groups: Array.from(groups),
        eligible: false,
        unaryEligible: false,
        epoch: 0,
        cellProgramGeneration: 0,
        preparedCutEpoch: 0,
        preparedCutValue: 0,
      };
      this.#programSourceSlots.set(source, slot);
      for (const group of groups) {
        if (!this.#programSinkSlotByGroup.has(group)) {
          this.#programSinkSlotByGroup.set(
            group,
            this.#programSinkSlots.length,
          );
          this.#programSinkSlots.push(group);
        }
      }
      this.#refreshProgramEligibility(slot);
    }
  }

  #clearBindingIndex() {
    this.#invalidateAllPreparedNumericCellPrograms();
    this.#groupsBySource.clear();
    this.#programSourceSlots.clear();
    this.#programSinkSlots.length = 0;
    this.#programFreeSinkSlots.length = 0;
    this.#programSinkSlotByGroup.clear();
    this.#incompatibleScalarBindingGroups = 0;
    this.#groupsByCompiledBinding.clear();
    this.#groupsByCompiledSource.clear();
    this.#groupsByCompiledColumnBinding.clear();
    this.#groupsByCompiledColumn.clear();
    this.#groupsByCompiledColumnRows.clear();
    this.#sourceColumnCells.clear();
    this.#pendingSourceColumnPrunes.clear();
    this.#groupsByColumnCell.clear();
    this.#compiledSlotBySource.clear();
    const clear = (node: MountedNode<H>) => {
      if (node.scalarBindingGroups) {
        for (const groups of node.scalarBindingGroups.values()) {
          for (const group of groups) group.styleWriter = undefined;
        }
      }
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

  describePropertyWrite(
    node: Node,
    name: string,
    next: unknown,
  ): HostPropertyCapability {
    let valuePolicy: HostPropertyCapability["valuePolicy"] = "unknown";
    if (Object.getPrototypeOf(this) === DOMVDOMHost.prototype &&
      Object.getOwnPropertyDescriptor(this, "setProp") === undefined &&
      Object.getOwnPropertyDescriptor(DOMVDOMHost.prototype, "setProp")?.value ===
        domBaseSetProp &&
      (node instanceof HTMLElement || node instanceof SVGElement)) {
      if (name === "style") valuePolicy = "copy";
      else if (/^on[A-Z]/.test(name)) {
        if (typeof next === "function") valuePolicy = "retain";
      } else if (name === "className" || name.startsWith("aria-") ||
        name.startsWith("data-") || node instanceof SVGElement ||
        (name === "htmlFor" && node instanceof HTMLLabelElement) ||
        (name === "value" &&
          (node instanceof HTMLInputElement ||
            node instanceof HTMLTextAreaElement ||
            node instanceof HTMLSelectElement))) {
        valuePolicy = "copy";
      }
    }
    return Object.freeze({
      valuePolicy,
      targetResource: null,
      valueResource: null,
      mayThrow: true,
    });
  }

  setStyleProp(node: Node, name: string, value: unknown) {
    if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;
    writeStyle(node.style, name, value);
  }

  prepareStyleProp(node: Node, name: string) {
    // Preserve subclass setter semantics unless it also supplies a preparation policy.
    if (this.setStyleProp !== DOMVDOMHost.prototype.setStyleProp) return;
    if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;
    return createDOMStylePropWriter(node.style, name);
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

const domBaseSetProp = DOMVDOMHost.prototype.setProp;
