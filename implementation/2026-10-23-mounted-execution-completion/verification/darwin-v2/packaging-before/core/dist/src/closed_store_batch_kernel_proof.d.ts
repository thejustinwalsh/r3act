import { type ClosedStoreHostProgram } from "./closed_store_host_program.ts";
export type ClosedStoreBatchNumericKernel = (sharedInputs: readonly number[], varyingInputs: readonly number[], outputs: number[][], rowCount: number) => void;
export type ClosedStoreBatchKernelProof = Readonly<{
    kind: "verified";
    numericPropIndices: readonly number[];
    sharedInputCount: number;
    varyingInputCount: number;
}> | Readonly<{
    kind: "rejected";
    reason: string;
}>;
export declare const CLOSED_STORE_BATCH_MAX_ROWS = 4096;
export declare const executeVerifiedClosedStoreBatch: (proof: ClosedStoreBatchKernelProof, sharedInputs: readonly number[], varyingInputs: readonly number[], outputs: number[][], rowCount: number) => void;
export declare function proveClosedStoreBatchKernel(candidate: unknown, host: ClosedStoreHostProgram): ClosedStoreBatchKernelProof;
//# sourceMappingURL=closed_store_batch_kernel_proof.d.ts.map