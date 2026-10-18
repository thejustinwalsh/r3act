import { type ClosedNumericExpression } from "./closed_numeric_expression.ts";
type Primitive = string | number | boolean | null;
/** Compiler data program for one numeric Store read and one keyed host leaf. */
export type ClosedStoreHostProgram = Readonly<{
    schemaVersion: 1;
    componentProgramId: string;
    moduleRevision: string;
    storeUseSiteId: string;
    storeProp: string;
    host: Readonly<{
        tag: "mesh" | "group" | "div" | "output";
        key: string;
        props: readonly (readonly [string, ClosedNumericExpression])[];
        child: null;
    }>;
}>;
export type ClosedStoreHostOutput = readonly (readonly [string, Primitive])[];
/** Copy untrusted metadata into a frozen, data-only executable plan. */
export declare const normalizeClosedStoreHostProgram: (input: unknown) => ClosedStoreHostProgram | null;
/** Evaluate only frozen primitive data; unsupported values decline admission. */
export declare const evaluateClosedStoreHostProgram: (program: ClosedStoreHostProgram, numericValue: unknown) => ClosedStoreHostOutput | null;
export {};
//# sourceMappingURL=closed_store_host_program.d.ts.map