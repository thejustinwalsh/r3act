import type { CompiledStateLayout } from "./compiled_state_layout.ts";
export type RuntimeNode = RuntimeElement | string | number | null | undefined | false | RuntimeNode[];
export type ComponentType<P = Record<string, unknown>> = (props: P & {
    children?: RuntimeNode;
}) => RuntimeNode;
export type ElementType = string | ComponentType<any> | typeof Fragment;
export type RuntimeElement = {
    type: ElementType;
    props: Record<string, any>;
};
declare const keyedOwnerRegionTag: unique symbol;
declare const keyedOwnerVersionTag: unique symbol;
export type KeyedOwnerChildren = RuntimeNode[] & {
    readonly [keyedOwnerRegionTag]: string;
    readonly [keyedOwnerVersionTag]?: object;
};
/** Opaque compiler/runtime token for an unchanged keyed-region membership and row-data version. */
export type KeyedOwnerVersion = object & {
    readonly __keyedOwnerVersion?: never;
};
/** Create a trusted version token. Generated code should retain it across reorder-only updates. */
export declare const createKeyedOwnerVersion: () => KeyedOwnerVersion;
/** Compiler hint for a homogeneous keyed component list with stable identities. */
export declare const keyedOwnerChildren: (regionId: string, children: RuntimeNode[], version?: KeyedOwnerVersion) => KeyedOwnerChildren;
export declare const getKeyedOwnerRegionId: (value: RuntimeNode) => string | null;
export declare const getKeyedOwnerVersion: (value: RuntimeNode) => KeyedOwnerVersion | null;
/** Preserve compiler-owned keyed-region metadata when a runtime maps an array. */
export declare const copyKeyedOwnerMetadata: <T extends RuntimeNode[]>(source: RuntimeNode, target: T) => T;
export declare const Fragment: unique symbol;
/** Classic JSX factory used by the TSX prototype page. */
export declare function jsx(type: ElementType, props: Record<string, any> | null, ...children: RuntimeNode[]): RuntimeElement;
export declare class ScalarSource {
    readonly id: number;
    value: number;
    constructor(id: number, value: number);
}
/** Legacy compiler proof for a fixed numeric source program. */
export type NumericBindingProgramDescriptorV1 = Readonly<{
    schemaVersion: 1;
    sinkId: string;
    sourceSites: readonly string[];
}>;
/** Owner-scoped compiler proof for an authored numeric sink. */
export type NumericBindingProgramDescriptorV2 = Readonly<{
    schemaVersion: 2;
    ownerProgramId: string;
    sinkId: string;
    sourceSites: readonly string[];
}>;
/** Compiler proof that a binding is a fixed numeric source program. */
export type NumericBindingProgramDescriptor = NumericBindingProgramDescriptorV1 | NumericBindingProgramDescriptorV2;
/** Immutable owner/layout association for a compiled sink; contains no runtime handles. */
export type NumericOwnerBinding = Readonly<{
    owner: number;
    programId: string;
    layout: CompiledStateLayout;
    sourceSlots: readonly number[];
}>;
/** Contiguous per-entity values for a compiler-known trait/source slot. */
export declare class NumericColumn {
    readonly id: number;
    readonly sourceSlot: number;
    values: Float64Array;
    readonly source: ScalarSource;
    constructor(id: number, sourceSlot: number, values: Float64Array);
    /**
     * Ensure storage for at least `minCapacity` rows. Growth doubles the current
     * capacity (using one slot as the zero-capacity seed), or uses the requested
     * capacity when that is larger. Existing values are copied and the new tail
     * is zero-filled by Float64Array. The column and its source identities stay
     * stable; callers should reserve while activating rows, not during a flush.
     */
    reserve(minCapacity: number): void;
}
declare const bindingTag: unique symbol;
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
export declare const bind: <T = number>(source: ScalarSource, project?: (value: number) => T) => BoundValue<T>;
/** Bind one prop to several sources; the value is read after a source batch. */
export declare const bindSources: <T>(sources: readonly ScalarSource[], derive: (values: readonly number[]) => T, numericProgram?: NumericBindingProgramDescriptor) => BoundValue<T>;
/** A stable tuple binding for vector-like host props such as R3F position. */
export declare const bindVector3: (x: ScalarSource, y: ScalarSource, z: ScalarSource) => BoundValue<[number, number, number]>;
export declare const readBoundValue: <T>(binding: BoundValue<T>) => T;
/** Bind with identities emitted by the UI compiler's dependency plan. */
export declare const bindCompiled: <T = number>(source: ScalarSource, bindingId: number, sourceSlot: number, project?: (value: number) => T) => BoundValue<T>;
/** Bind one compiled prop to an entity row in a contiguous numeric column. */
export declare const bindCompiledColumn: <T = number>(column: NumericColumn, entityIndex: number, bindingId: number, project?: (value: number) => T) => BoundValue<T>;
export declare const isBoundValue: (value: unknown) => value is BoundValue;
export declare const getBoundValue: (value: unknown) => BoundValue | null;
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
export declare const createJSXBindingRuntime: () => {
    signal: (initial: number) => ScalarSource;
    set: (source: ScalarSource, value: number) => boolean;
    mount: (tree: RuntimeNode, container: HTMLElement) => MountedRuntime;
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
export {};
//# sourceMappingURL=jsx_binding_runtime.d.ts.map