import { type ClosedStoreHostProgram } from "./closed_store_host_program.ts";
export type ClosedScalarNumericKernel = (inputs: readonly number[], outputs: number[]) => void;
export type ClosedScalarKernelProof = Readonly<{
    kind: "verified";
    kernel: ClosedScalarNumericKernel;
    numericPropIndices: readonly number[];
}> | Readonly<{
    kind: "rejected";
    reason: string;
}>;
/** Verify complete source behavior against a privately normalized host program. */
export declare function proveClosedScalarNumericKernel(candidate: unknown, host: ClosedStoreHostProgram): ClosedScalarKernelProof;
//# sourceMappingURL=closed_scalar_kernel_proof.d.ts.map