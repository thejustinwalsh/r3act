import { type ClosedStoreHostOutput, type ClosedStoreHostProgram } from "./closed_store_host_program.ts";
import { type AnyAsyncStore, type BoundClosedProjectionRequest, type StoreRenderTransaction } from "./async_store_runtime.ts";
import { type ClosedWorldCellCut, type OwnedClosedWorldInputCell, type OwnedClosedWorldInputRequest, type OwnerStateWorld } from "./owner_state_world.ts";
import type { StorePropDelta } from "./vdom_snapshot_runtime.ts";
import { type ClosedScalarKernelProof } from "./closed_scalar_kernel_proof.ts";
import { type ClosedStoreBatchKernelProof } from "./closed_store_batch_kernel_proof.ts";
import { OwnedScalarFrame, OwnedScalarLayout, type OwnedScalarOutputCounts } from "./closed_scalar_output.ts";
type ClosedStoreDataExecutionIdentity = Readonly<{
    kind: "owned-data";
    componentProgramId: string;
    moduleRevision: string;
}>;
export type ClosedStoreDataExecution = ClosedStoreDataExecutionIdentity & (Readonly<{
    schemaVersion: 1;
}> | Readonly<{
    schemaVersion: 2;
    numericKernel?: (inputs: readonly number[], outputs: number[]) => void;
}> | Readonly<{
    schemaVersion: 3;
    batchKernel?: (sharedInputs: readonly number[], varyingInputs: readonly number[], outputs: number[][], rowCount: number) => void;
}>);
type ExecutionFacts = Readonly<{
    host: ClosedStoreHostProgram;
    paths: readonly (readonly (readonly string[])[])[];
    stateSites: readonly string[];
    inputCount: number;
    valueCount: number;
    retainedChildren: boolean;
    layout: OwnedScalarLayout;
    scalarProof: ClosedScalarKernelProof | null;
    batchProof: ClosedStoreBatchKernelProof | null;
    diagnostic: Readonly<{
        mode: "verified-batch" | "verified-scalar" | "interpreted";
        reason: string;
    }>;
}>;
declare const normalizedExecutionBrand: unique symbol;
export type NormalizedClosedStoreDataExecution = ClosedStoreDataExecutionIdentity & Readonly<{
    schemaVersion: 1 | 2 | 3;
    [normalizedExecutionBrand]: true;
}>;
/** Copy an explicit data marker and bind it privately to a normalized host program. */
export declare const normalizeClosedStoreDataExecution: (raw: unknown, host: ClosedStoreHostProgram) => NormalizedClosedStoreDataExecution | null;
/** Report registration-time selection without exposing executable state. */
export declare const inspectClosedStoreDataExecution: (execution: NormalizedClosedStoreDataExecution) => Readonly<{
    mode: "verified-batch" | "verified-scalar" | "interpreted";
    reason: string;
}> | null;
/** Evaluate only privately associated, finite numeric inputs into candidate-owned props. */
export declare const evaluateClosedStoreDataExecution: (execution: NormalizedClosedStoreDataExecution, numericValues: readonly number[]) => ClosedStoreHostOutput | null;
/** Identify a region constructed by the shared scalar output authority. */
export declare const isOwnedScalarStorePropDelta: (region: StorePropDelta) => boolean;
/** Copy a caller's scalar Store region into a privately owned immutable shape. */
export declare const createOwnedScalarStorePropDelta: (region: StorePropDelta) => StorePropDelta | null;
export declare const materializeOwnedScalarStorePropDelta: (row: OwnedClosedStoreOutputRow, counts?: OwnedScalarOutputCounts) => StorePropDelta;
export type OwnedClosedStoreOutputRequest = Readonly<{
    execution: NormalizedClosedStoreDataExecution;
    owner: number;
    hostKey: string;
    inputs: readonly Readonly<{
        store: AnyAsyncStore;
        readerId: string;
    }>[];
}>;
export type OwnedClosedStoreOutputRow = Readonly<{
    owner: number;
    lineage: readonly number[];
    cells: readonly OwnedClosedWorldInputCell[];
    frame: OwnedScalarFrame;
    key: string;
    tag: string;
    retainedChildren?: true;
    componentOwner?: number;
}>;
type NormalizedRequest = Readonly<{
    execution: NormalizedClosedStoreDataExecution;
    facts: ExecutionFacts;
    owner: number;
    hostKey: string;
    inputs: readonly Readonly<{
        store: AnyAsyncStore;
        readerId: string;
    }>[];
    worldRequest?: OwnedClosedWorldInputRequest;
    projectionRequests?: readonly BoundClosedProjectionRequest[];
}>;
declare class PrivateBoundClosedStoreOutputRequest {
    #private;
    private constructor();
    static bind(raw: OwnedClosedStoreOutputRequest): PrivateBoundClosedStoreOutputRequest | null;
    static unwrap(key: symbol, value: unknown): NormalizedRequest | null;
}
export type BoundClosedStoreOutputRequest = PrivateBoundClosedStoreOutputRequest;
export declare const bindOwnedClosedStoreOutputRequest: typeof PrivateBoundClosedStoreOutputRequest.bind;
export declare class OwnedClosedFrameRequests {
    #private;
    private constructor();
    static create(): OwnedClosedFrameRequests;
    append(bound: BoundClosedStoreOutputRequest): boolean;
    seal(): boolean;
    static consume(key: symbol, value: unknown): readonly NormalizedRequest[] | null;
}
export declare const createOwnedClosedFrameRequests: typeof OwnedClosedFrameRequests.create;
/** Enclose passive captures and finite evaluation for ordered owned scalar rows. */
export declare const prepareOwnedClosedStoreOutputs: (world: OwnerStateWorld, transaction: StoreRenderTransaction, orderedRequests: readonly (OwnedClosedStoreOutputRequest | BoundClosedStoreOutputRequest)[] | OwnedClosedFrameRequests, counts?: OwnedScalarOutputCounts) => {
    kind: "ready";
    rows: readonly OwnedClosedStoreOutputRow[];
    cellCut: ClosedWorldCellCut;
} | {
    kind: "public-required";
} | null;
export {};
//# sourceMappingURL=closed_store_execution.d.ts.map