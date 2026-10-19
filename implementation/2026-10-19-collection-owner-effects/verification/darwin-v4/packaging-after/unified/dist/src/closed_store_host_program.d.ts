import { type ClosedNumericExpression } from "./closed_numeric_expression.ts";
import { type ClosedHostOutputValue, type ClosedHostValue } from "./closed_host_value.ts";
import { type ClosedHostTreeNode } from "./closed_host_tree.ts";
import { type RuntimeElement } from "./jsx_binding_runtime.ts";
type Host<Value extends ClosedHostValue> = Readonly<{
    tag: "mesh" | "group" | "div" | "span" | "output";
    key: string;
    props: readonly (readonly [string, Value])[];
    child: null;
}>;
export type ClosedStoreHostInput = Readonly<{
    storeUseSiteId: string;
    storeProp: string;
    paths?: readonly (readonly string[])[];
}>;
export type ClosedStoreProjectionInput = ClosedStoreHostInput & Readonly<{
    paths: readonly (readonly string[])[];
}>;
/** Compiler data program for one or more direct numeric Store reads and one keyed host leaf. */
export type ClosedStoreHostProgram = Readonly<{
    componentProgramId: string;
    moduleRevision: string;
}> & (Readonly<{
    schemaVersion: 1;
    storeUseSiteId: string;
    storeProp: string;
    host: Host<ClosedNumericExpression>;
}> | Readonly<{
    schemaVersion: 2;
    inputs: readonly ClosedStoreHostInput[];
    host: Host<ClosedNumericExpression>;
}> | Readonly<{
    schemaVersion: 3;
    inputs: readonly ClosedStoreHostInput[];
    host: Host<ClosedHostValue>;
}> | Readonly<{
    schemaVersion: 4;
    inputs: readonly ClosedStoreHostInput[];
    host: ClosedHostTreeNode;
}> | Readonly<{
    schemaVersion: 5;
    inputs: readonly ClosedStoreProjectionInput[];
    host: ClosedHostTreeNode;
}>);
export type ClosedStoreHostOutput = readonly (readonly [string, ClosedHostOutputValue])[];
/** Copy untrusted metadata into a frozen, data-only executable plan. */
export declare const normalizeClosedStoreHostProgram: (raw: unknown) => ClosedStoreHostProgram | null;
/** The ordered direct Store reads covered by the frozen compiler program. */
export declare const closedStoreHostInputs: (program: ClosedStoreHostProgram) => readonly ClosedStoreHostInput[];
/** Numeric paths for one lexical Store input; old schemas read the state directly. */
export declare const closedStoreHostInputPaths: (input: ClosedStoreHostInput) => readonly (readonly string[])[];
/** Number of numeric expression inputs after lexical path flattening. */
export declare const closedStoreHostValueCount: (program: ClosedStoreHostProgram) => number;
/** Evaluate frozen compiler data into candidate-owned host values; unsupported values decline. */
export declare const evaluateClosedStoreHostProgram: (program: ClosedStoreHostProgram, numericValues: number | readonly number[]) => ClosedStoreHostOutput | null;
/** Evaluate every Store schema as a keyed candidate tree for scoped host publication. */
export declare const evaluateClosedStoreHostTree: (program: ClosedStoreHostProgram, numericValues: number | readonly number[]) => RuntimeElement | null;
export {};
//# sourceMappingURL=closed_store_host_program.d.ts.map