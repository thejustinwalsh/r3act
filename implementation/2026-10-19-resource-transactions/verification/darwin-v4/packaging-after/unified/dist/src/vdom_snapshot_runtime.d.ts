import type { HostPropertyCapability } from "./host_property_contract.ts";
import { type NumericColumn, type RuntimeNode, type ScalarSource } from "./jsx_binding_runtime.ts";
import type { ClosedHostOutputValue } from "./closed_host_value.ts";
import { type CompiledStateLayout } from "./compiled_state_layout.ts";
declare const retainedSourceDeltaBrand: unique symbol;
/** An opaque, projected cut over retained compiler-proven scalar writers. */
export interface PreparedRetainedSourceDelta {
    readonly [retainedSourceDeltaBrand]: never;
    readonly readSources: readonly ScalarSource[];
}
export type StorePropDelta = Readonly<{
    key: string;
    tag: string;
    props: readonly (readonly [string, ClosedHostOutputValue])[];
    children?: readonly (Readonly<{
        kind: "host";
        key: string;
        tag: string;
    }> | Readonly<{
        kind: "text";
        text: string;
    }>)[];
}>;
declare const storePropDeltaBrand: unique symbol;
export interface PreparedStorePropDelta {
    readonly [storePropDeltaBrand]: never;
}
export type PreparedNumericRowProgramSpec = Readonly<{
    owner: number;
    layout: CompiledStateLayout;
    rowIdentity: object;
    row: number;
    generation: number;
    sources: readonly (ScalarSource | undefined)[];
    columns: readonly NumericColumn[];
}>;
declare const preparedNumericRowProgramBrand: unique symbol;
export interface PreparedNumericRowProgram {
    readonly [preparedNumericRowProgramBrand]: never;
}
declare const preparedNumericCellProgramBrand: unique symbol;
/** Opaque proof that one source has a current unary numeric writer fanout. */
export interface PreparedNumericCellProgram {
    readonly [preparedNumericCellProgramBrand]: never;
}
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
    createElement(tag: string, parent?: Parent, creationProps?: Readonly<Record<string, unknown>>): H;
    createText(text: string): H;
    setText(node: H, text: string): void;
    setProp(node: H, name: string, value: unknown, previous: unknown): void;
    /** Optional observation; generic writes and host lifetime remain authoritative. */
    describePropertyWrite?(node: H, name: string, next: unknown): HostPropertyCapability;
    /** Optional property-level style writer used by compiled bindings. */
    setStyleProp?(node: H, name: string, value: unknown, previous: unknown): void;
    /**
     * Optionally prepare a property-level writer when a binding group activates.
     * This factory must not mutate the host; its returned function applies one
     * later value using semantics equivalent to setStyleProp.
     */
    prepareStyleProp?(node: H, name: string): ((next: unknown, previous: unknown) => void) | undefined;
    place(parent: Parent, node: H, before: H | null): void;
    remove(parent: Parent, node: H): void;
    /** Release resources owned by a host node after its descendants. */
    dispose?(node: H): void;
    /** Resolve a host handle to the public instance exposed through `ref`. */
    getPublicInstance?(node: H): unknown;
}
export type VDOMRefCallback = (instance: unknown | null) => unknown;
export type VDOMRefObject = {
    current: unknown;
};
export type PreparedVDOMCommit = {
    commit(): void;
    validate?(): boolean;
    discard?(): void;
};
export type RuntimeProfileCallback = (phase: string, milliseconds: number) => void;
export type RuntimeCounterCallback = (counters: Readonly<Record<string, number>>) => void;
/** Internal experiment control for comparing key-index maintenance algorithms. */
export type VDOMKeyIndexMaintenance = "delta" | "rebuild";
export type VDOMBindingIndexMaintenance = "delta" | "rebuild";
export type KeyedRegionDeltaOperation = {
    type: "insert";
    key: string;
    beforeKey: string | null;
    tree: RuntimeNode;
} | {
    type: "remove";
    key: string;
} | {
    type: "move";
    key: string;
    beforeKey: string | null;
} | {
    type: "replace";
    key: string;
    tree: RuntimeNode;
};
export type KeyedRegionDeltaRequest = Readonly<{
    parentKey: string;
    regionId: string;
    operations: readonly KeyedRegionDeltaOperation[];
}>;
export type PreparedKeyedVDOMProgram = {
    readonly scoped: boolean;
    readonly structuralVersionDelta: 0 | 1;
    validate(): boolean;
    validatePostHost(): boolean;
    overlapsRetainedTargets(delta: PreparedRetainedSourceDelta): boolean;
    overlapsStoreTargets(delta: PreparedStorePropDelta): boolean;
    readonly hostKeys?: readonly string[];
    overlapsHostReplacementTargets?(keys: readonly string[]): boolean;
    commit(): void;
    discard(): void;
};
export type PreparedScopedKeyedRetainedProgram = PreparedKeyedVDOMProgram & {
    readonly readSources: readonly ScalarSource[];
};
/** A retained VDOM root whose host changes only when commit() is called. */
export declare class VDOMSnapshotRoot<H, Parent = H> {
    #private;
    readonly host: VDOMHost<H, Parent>;
    readonly container: Parent;
    readonly profile?: RuntimeProfileCallback | undefined;
    readonly keyIndexMaintenance: VDOMKeyIndexMaintenance;
    readonly bindingIndexMaintenance: VDOMBindingIndexMaintenance;
    constructor(host: VDOMHost<H, Parent>, container: Parent, profile?: RuntimeProfileCallback | undefined, profileCounter?: RuntimeCounterCallback, keyIndexMaintenance?: VDOMKeyIndexMaintenance, bindingIndexMaintenance?: VDOMBindingIndexMaintenance);
    get version(): number;
    get appliedVersion(): number;
    beginPublication(): void;
    publishAccepted(): void;
    failPublication(): void;
    cancelPublication(): void;
    get partialCommitCount(): number;
    get partialCommitBatchCount(): number;
    /** A read-only, host-neutral description of the latest committed tree. */
    get snapshot(): readonly unknown[];
    commit(tree: RuntimeNode, compiledGraph?: CompiledVDOMBindingGraph | null, directBindingWrites?: boolean): void;
    /** Stop pending attaches without tearing down the active host batch. */
    cancelPendingRefAttachments(): void;
    /** Publish ref changes staged by a completed host commit. */
    flushRefs(): void;
    /**
     * Normalize and validate a candidate before touching its host. A caller can
     * prepare every root in a transition first, then apply these synchronous
     * commits together in one task.
     */
    prepareCommit(tree: RuntimeNode, compiledGraph?: CompiledVDOMBindingGraph | null, directBindingWrites?: boolean): PreparedVDOMCommit;
    /**
     * Update one globally unique keyed host region without normalizing or
     * reconciling its siblings. Returns false when that fast path is unsafe.
     */
    commitKeyedRegion(key: string, tree: RuntimeNode): boolean;
    /**
     * Apply a small structural edit directly to a compiler-marked keyed child
     * region. Ordinary ScalarSource/BoundValue writers are updated only within
     * changed subtrees, including ordinary direct property/style groups.
     * Compiled CSR and column roots retain their generic fallback.
     * The operation list is validated before host writes; order storage remains
     * bucketed and is never expanded to a sibling array on this path.
     */
    commitKeyedRegionDelta(parentKey: string, regionId: string, operations: readonly KeyedRegionDeltaOperation[]): boolean;
    prepareKeyedRegionDelta(parentKey: string, regionId: string, operations: readonly KeyedRegionDeltaOperation[]): PreparedKeyedVDOMProgram | null;
    /** Prepare keyed sparse edits and keyed leaf replacements as one host phase. */
    prepareKeyedRegionDeltas(deltas: readonly KeyedRegionDeltaRequest[], regions?: readonly {
        key: string;
        tree: RuntimeNode;
    }[], options?: {
        scoped?: boolean;
    }): PreparedKeyedVDOMProgram | null;
    /** Prepare one scoped structural and retained-writer host publication. */
    prepareScopedKeyedAndRetainedDeltas(deltas: readonly KeyedRegionDeltaRequest[], updates: readonly (readonly [ScalarSource, number])[]): PreparedScopedKeyedRetainedProgram | null;
    /** Prepare static host-subtree replacements against exact mounted footprints. */
    prepareScopedHostSubtreeReplacements(regions: readonly {
        key: string;
        tree: RuntimeNode;
    }[]): PreparedKeyedVDOMProgram | null;
    /** Prepare one scoped keyed, retained-source and Store-prop publication. */
    prepareScopedKeyedRetainedAndStoreDeltas(deltas: readonly KeyedRegionDeltaRequest[], updates: readonly (readonly [ScalarSource, number])[], storeRegions: readonly StorePropDelta[], replacements?: readonly {
        key: string;
        tree: RuntimeNode;
    }[]): PreparedScopedKeyedRetainedProgram | null;
    /**
     * Prepare a coherent host candidate for disjoint, globally keyed regions.
     * Returns null when the current root or candidate cannot use the incremental
     * ordinary-binding path. The returned handle is one-shot and checks the root
     * version again before it mutates any host nodes.
     */
    prepareKeyedRegions(regions: readonly {
        key: string;
        tree: RuntimeNode;
    }[]): PreparedVDOMCommit | null;
    /**
     * Atomically prepare and patch several disjoint, globally keyed host regions.
     * Returns false without changing the host if any target is missing,
     * incompatible, bound, duplicated, or would collide with a surviving key.
     */
    commitKeyedRegions(regions: readonly {
        key: string;
        tree: RuntimeNode;
    }[]): boolean;
    /**
     * Update every retained VDOM prop that depends on this source. The VDOM tree
     * is not re-walked; work follows the source-to-prop index built at commit.
     */
    setSource(source: ScalarSource, value: number): boolean;
    /** Whether this committed VDOM currently retains props bound to a source. */
    hasBoundSource(source: ScalarSource): boolean;
    /** Prepare closed prop writes on exact mounted, globally keyed host leaves. */
    prepareStorePropDelta(regions: readonly StorePropDelta[]): PreparedStorePropDelta | null;
    /** Validate exact mounted writers without requiring an unrelated root version. */
    isStorePropDeltaCurrent(token: PreparedStorePropDelta, options?: {
        afterHost?: boolean;
    }): boolean;
    /** Apply a prepared primitive cut inside the shared active publication. */
    applyStorePropDelta(token: PreparedStorePropDelta): void;
    /** Prepare only the compiler-proven retained writers reached by this cut. */
    prepareRetainedSourceDelta(updates: readonly (readonly [ScalarSource, number])[]): PreparedRetainedSourceDelta | null;
    /** Validate writer lifetime and accepted overlap after unrelated prop cuts. */
    isRetainedSourceDeltaCurrent(delta: PreparedRetainedSourceDelta, options?: {
        afterHost?: boolean;
    }): boolean;
    /** Apply a projected cut inside the Root's active host publication. */
    applyRetainedSourceDelta(delta: PreparedRetainedSourceDelta): boolean;
    /** Whether every retained writer for this source is a supported direct numeric program. */
    hasSourceProgram(source: ScalarSource): boolean;
    /**
     * Associate existing unary compiler-proven writers with one published
     * numeric column cell. This records an index only; it does not write hosts
     * or alter the source's binding metadata.
     */
    bindSourceColumn(source: ScalarSource, column: NumericColumn, row: number): boolean;
    /**
     * Prepare one source's unary cell-writer fanout. The returned token is tied
     * to this VDOM root, source slot, cell address, and the current binding
     * generation; it becomes stale when that source's bindings change.
     */
    prepareNumericCellProgram(source: ScalarSource, column: NumericColumn, row: number): PreparedNumericCellProgram | null;
    /** Prepare a compiler-v2 owner-row fanout once for a committed World row. */
    prepareNumericRowProgram(spec: PreparedNumericRowProgramSpec): PreparedNumericRowProgram | null;
    /** Execute an explicit multi-row, multi-source cut through prepared sinks. */
    executePreparedNumericRows(tokens: readonly (PreparedNumericRowProgram | undefined)[], changedRowIndices: Uint32Array, changedSlots: Uint32Array, values: readonly number[], count: number): boolean | null;
    /** Check whether a cached opaque cell program still names its live fanout. */
    isPreparedNumericCellProgramCurrent(token: PreparedNumericCellProgram): boolean;
    /**
     * Apply an explicit dirty-source cut using prepared unary fanouts. Returns
     * null when any token is stale or unsupported, false when accepted without
     * host writes, and true when at least one host prop was written.
     */
    executePreparedNumericCells(tokens: readonly (PreparedNumericCellProgram | undefined)[], values: readonly number[], count: number): boolean | null;
    /** Whether a numeric cell currently has at least one indexed host writer. */
    hasColumnCell(column: NumericColumn, row: number): boolean;
    /**
     * Apply an explicit dirty-address cut through existing unary writers.
     * Returns null when preflight declines the cut, false for a supported cut
     * with no host writes, and true when at least one host prop was written.
     */
    setColumnCells(columns: readonly (NumericColumn | undefined)[], rows: readonly number[], values: readonly number[], count: number): boolean | null;
    /** Execute a validated sparse/dense cut through compiler-proven numeric writers. */
    executeSourceProgram(sources: readonly (ScalarSource | undefined)[], values: readonly number[], count: number): boolean;
    /** Apply source changes as one coherent host-write batch. */
    setSources(updates: readonly (readonly [ScalarSource, number])[]): boolean;
    /**
     * Commit changed rows from compiled numeric columns through the binding
     * writers resolved at mount. The caller updates column buffers in place;
     * call-local staging keeps every writer on the same captured buffer cut.
     */
    setColumns(columns: readonly NumericColumn[]): boolean;
    /** Read-only lifecycle counters for benchmarks and host adapters. */
    diagnostics(): {
        mountedNodes: number;
        scalarBindingGroups: number;
        numericProgramSourceSlots: number;
        numericProgramSinkSlots: number;
        numericProgramSinkSlotCapacity: number;
        numericProgramFreeSinkSlots: number;
        numericProgramScratchRetained: number;
        numericProgramScratchCapacity: number;
        columnRowsScratchRetained: number;
        columnRowsScratchCapacity: number;
        compiledBindingGroups: number;
        compiledSourceGroups: number;
        compiledColumnGroups: number;
        compiledColumnBindingGroups: number;
        preparedNumericRowWorkVisits: number;
        preparedOwnerUpdateKernelBatches: number;
        preparedOwnerUpdateKernelRows: number;
        preparedOwnerUpdateKernelInputs: number;
        preparedOwnerUpdateKernelSelectedSinks: number;
        preparedOwnerUpdateKernelStagedSinks: number;
        preparedOwnerUpdateGenericFallbackCuts: number;
        preparedOwnerUpdateGenericProjectors: number;
        bindingIndexAttachOperations: number;
        bindingIndexDetachOperations: number;
        bindingIndexIndexOperations: number;
        sourceColumnPruneVisits: number;
    };
    /** Commit only rows in a reusable dirty-row buffer. */
    setColumnRows(columns: readonly NumericColumn[], rows: Uint32Array, rowCount?: number): boolean;
    /** Scan caller-selected contiguous row buckets, skipping unchanged rows. */
    setColumnBuckets(columns: readonly NumericColumn[], buckets: Uint32Array, bucketCount?: number, bucketSize?: number): boolean;
    dispose(): void;
}
export declare const createVDOMSnapshotRoot: <H, Parent = H>(host: VDOMHost<H, Parent>, container: Parent) => VDOMSnapshotRoot<H, Parent>;
export type MemoryNode = {
    readonly id: number;
    kind: "element" | "text";
    tag: string | null;
    text: string | null;
    props: Record<string, unknown>;
    children: MemoryNode[];
    parent: MemoryNode | null;
};
export declare class MemoryVDOMHost implements VDOMHost<MemoryNode, MemoryNode> {
    #private;
    writeCount: number;
    placementCount: number;
    removalCount: number;
    createContainer(): MemoryNode;
    createElement(tag: string, _parent?: MemoryNode, _creationProps?: Readonly<Record<string, unknown>>): MemoryNode;
    createText(text: string): MemoryNode;
    setText(node: MemoryNode, text: string): void;
    setProp(node: MemoryNode, name: string, value: unknown, _previous?: unknown): void;
    setStyleProp(node: MemoryNode, name: string, value: unknown): void;
    place(parent: MemoryNode, node: MemoryNode, before: MemoryNode | null): void;
    remove(parent: MemoryNode, node: MemoryNode): void;
    serialize(node: MemoryNode): unknown;
    findByProp(root: MemoryNode, name: string, value: unknown): MemoryNode | null;
}
export declare class DOMVDOMHost implements VDOMHost<Node, Node> {
    createElement(tag: string, parent?: Node): HTMLElement | SVGElement;
    createText(text: string): Text;
    setText(node: Node, text: string): void;
    setProp(node: Node, name: string, value: unknown, previous: unknown): void;
    describePropertyWrite(node: Node, name: string, next: unknown): HostPropertyCapability;
    setStyleProp(node: Node, name: string, value: unknown): void;
    prepareStyleProp(node: Node, name: string): ((value: unknown, previous: unknown) => void) | undefined;
    place(parent: Node, node: Node, before: Node | null): void;
    remove(parent: Node, node: Node): void;
}
export {};
//# sourceMappingURL=vdom_snapshot_runtime.d.ts.map