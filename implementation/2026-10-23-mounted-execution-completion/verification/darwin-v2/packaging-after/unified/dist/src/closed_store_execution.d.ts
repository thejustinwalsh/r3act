import { type ClosedStoreHostOutput, type ClosedStoreHostProgram } from "./closed_store_host_program.ts";
import { type AnyAsyncStore, type BoundClosedProjectionRequest, type StoreRenderTransaction } from "./async_store_runtime.ts";
import { type ClosedWorldCellCut, type OwnedClosedWorldInputCell, type OwnedClosedWorldInputRequest, type OwnerStateWorld } from "./owner_state_world.ts";
import type { StorePropDelta } from "./vdom_snapshot_runtime.ts";
import { type ClosedStoreBatchKernelProof } from "./closed_store_batch_kernel_proof.ts";
import { type OwnedClosedFramePlan } from "./owned_closed_frame_input.ts";
import { OwnedScalarLayout, type OwnedScalarImage, type OwnedScalarOutputCounts } from "./closed_scalar_output.ts";
type ClosedStoreDataExecutionIdentity = Readonly<{
    kind: "owned-data";
    componentProgramId: string;
    moduleRevision: string;
}>;
export type ClosedStoreDataExecution = ClosedStoreDataExecutionIdentity & Readonly<{
    schemaVersion: 3;
    batchKernel?: (sharedInputs: readonly number[], varyingInputs: readonly number[], outputs: number[][], rowCount: number) => void;
}>;
type ExecutionFacts = Readonly<{
    host: ClosedStoreHostProgram;
    paths: readonly (readonly (readonly string[])[])[];
    stateSites: readonly string[];
    inputCount: number;
    valueCount: number;
    retainedChildren: boolean;
    layout: OwnedScalarLayout;
    batchProof: ClosedStoreBatchKernelProof | null;
    diagnostic: Readonly<{
        mode: "verified-batch" | "interpreted";
        reason: string;
    }>;
}>;
declare const normalizedExecutionBrand: unique symbol;
export type NormalizedClosedStoreDataExecution = ClosedStoreDataExecutionIdentity & Readonly<{
    schemaVersion: 3;
    [normalizedExecutionBrand]: true;
}>;
/** Copy an explicit data marker and bind it privately to a normalized host program. */
export declare const normalizeClosedStoreDataExecution: (raw: unknown, host: ClosedStoreHostProgram) => NormalizedClosedStoreDataExecution | null;
/** Report registration-time selection without exposing executable state. */
export declare const inspectClosedStoreDataExecution: (execution: NormalizedClosedStoreDataExecution) => Readonly<{
    mode: "verified-batch" | "interpreted";
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
    key: string;
    tag: string;
    retainedChildren?: true;
    componentOwner?: number;
}> & OwnedScalarImage;
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
type ScheduledFrameRow = Readonly<{
    request: NormalizedRequest;
    group: BatchGroup | null;
    groupRow: number;
}>;
type BatchGroup = Readonly<{
    execution: NormalizedClosedStoreDataExecution;
    rows: readonly number[];
}>;
/** Root-owned immutable schedule geometry; a candidate owns every writable buffer. */
export declare class MountedClosedStoreExecution {
    #private;
    private constructor();
    static prepare(key: symbol, requests: readonly NormalizedRequest[], previous?: MountedClosedStoreExecution | null, counts?: MountedClosedStoreExecutionCounts): MountedClosedStoreExecution | null;
    static owns(value: unknown): value is MountedClosedStoreExecution;
    static prune(key: symbol, previous: MountedClosedStoreExecution | null, retired: ReadonlySet<number>): MountedClosedStoreExecution | null;
    static retain(key: symbol, previous: MountedClosedStoreExecution | null, live: ReadonlySet<number>): MountedClosedStoreExecution | null;
    static inspect(key: symbol, value: MountedClosedStoreExecution): Readonly<{
        scheduled: readonly ScheduledFrameRow[];
        groups: readonly BatchGroup[];
        framePlan: OwnedClosedFramePlan;
    }> | null;
    layoutIdentityForOwner(owner: number): object | null;
}
export declare const pruneMountedClosedStoreExecution: (previous: MountedClosedStoreExecution | null, retired: ReadonlySet<number>) => MountedClosedStoreExecution | null;
export declare const retainMountedClosedStoreExecution: (previous: MountedClosedStoreExecution | null, live: ReadonlySet<number>) => MountedClosedStoreExecution | null;
export type MountedClosedStoreExecutionCounts = {
    built: number;
    reused: number;
    repairedGroups: number;
};
/** Enclose passive captures and finite evaluation for ordered owned scalar rows. */
export declare const prepareOwnedClosedStoreOutputs: (world: OwnerStateWorld, transaction: StoreRenderTransaction, orderedRequests: readonly BoundClosedStoreOutputRequest[], counts?: OwnedScalarOutputCounts, previousPlan?: MountedClosedStoreExecution | null, planCounts?: MountedClosedStoreExecutionCounts) => {
    kind: "ready";
    rows: readonly OwnedClosedStoreOutputRow[];
    cellCut: ClosedWorldCellCut;
    plan: MountedClosedStoreExecution;
} | {
    kind: "public-required";
} | null;
export {};
//# sourceMappingURL=closed_store_execution.d.ts.map