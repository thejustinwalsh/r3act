import { type ClosedStoreHostProgram } from "./closed_store_host_program.ts";
/** Compiler-proven numeric leaf outputs over row-major Store projections. */
export type ClosedStoreNumericKernel = Readonly<{
    schemaVersion: 1;
    componentProgramId: string;
    moduleRevision: string;
    inputCount: number;
    propNames: readonly string[];
    executeRange: (inputValues: readonly number[], inputStart: number, rowCount: number, outputValues: number[], outputStart: number) => number;
}>;
/** Match executable metadata to the already normalized Store host program. */
export declare const normalizeClosedStoreNumericKernel: (raw: unknown, host: ClosedStoreHostProgram) => ClosedStoreNumericKernel | null;
//# sourceMappingURL=closed_store_numeric_kernel.d.ts.map