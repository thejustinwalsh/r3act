import { type ClosedStoreHostOutput, type ClosedStoreHostProgram } from "./closed_store_host_program.ts";
export type ClosedStoreDataExecution = Readonly<{
    schemaVersion: 1;
    kind: "owned-data";
    componentProgramId: string;
    moduleRevision: string;
}>;
declare const normalizedExecutionBrand: unique symbol;
export type NormalizedClosedStoreDataExecution = ClosedStoreDataExecution & Readonly<{
    [normalizedExecutionBrand]: true;
}>;
/** Copy an explicit data marker and bind it privately to a normalized host program. */
export declare const normalizeClosedStoreDataExecution: (raw: unknown, host: ClosedStoreHostProgram) => NormalizedClosedStoreDataExecution | null;
/** Evaluate only privately associated, finite numeric inputs into candidate-owned props. */
export declare const evaluateClosedStoreDataExecution: (execution: NormalizedClosedStoreDataExecution, numericValues: readonly number[]) => ClosedStoreHostOutput | null;
export {};
//# sourceMappingURL=closed_store_execution.d.ts.map