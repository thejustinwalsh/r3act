import { type ClosedNumericExpression } from "./closed_numeric_expression.ts";
type Primitive = string | number | boolean | null;
type Host = Readonly<{
    tag: "mesh" | "group" | "div" | "output";
    key: string;
    props: readonly (readonly [string, ClosedNumericExpression])[];
    child: null;
}>;
export type ClosedStoreHostInput = Readonly<{
    storeUseSiteId: string;
    storeProp: string;
}>;
/** Compiler data program for one or more direct numeric Store reads and one keyed host leaf. */
export type ClosedStoreHostProgram = Readonly<{
    componentProgramId: string;
    moduleRevision: string;
    host: Host;
}> & (Readonly<{
    schemaVersion: 1;
    storeUseSiteId: string;
    storeProp: string;
}> | Readonly<{
    schemaVersion: 2;
    inputs: readonly ClosedStoreHostInput[];
}>);
export type ClosedStoreHostOutput = readonly (readonly [string, Primitive])[];
/** Copy untrusted metadata into a frozen, data-only executable plan. */
export declare const normalizeClosedStoreHostProgram: (raw: unknown) => ClosedStoreHostProgram | null;
/** The ordered direct Store reads covered by the frozen compiler program. */
export declare const closedStoreHostInputs: (program: ClosedStoreHostProgram) => readonly ClosedStoreHostInput[];
/** Evaluate only frozen primitive data; unsupported values decline admission. */
export declare const evaluateClosedStoreHostProgram: (program: ClosedStoreHostProgram, numericValues: number | readonly number[]) => ClosedStoreHostOutput | null;
export {};
//# sourceMappingURL=closed_store_host_program.d.ts.map