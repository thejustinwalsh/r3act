import { type ClosedStoreHostOutput, type ClosedStoreHostProgram } from "./closed_store_host_program.ts";
import { type AnyAsyncStore, type BoundClosedProjectionRequest, type StoreRenderTransaction } from "./async_store_runtime.ts";
import { type ClosedWorldCellCut, type OwnedClosedWorldInputCell, type OwnedClosedWorldInputRequest, type OwnerStateWorld } from "./owner_state_world.ts";
import type { StorePropDelta } from "./vdom_snapshot_runtime.ts";
import { type ClosedStoreBatchKernelProof } from "./closed_store_batch_kernel_proof.ts";
import { type OwnedClosedFramePlan } from "./owned_closed_frame_input.ts";
import { OwnedScalarLayout, type OwnedScalarImage, type OwnedScalarOutputCounts, type OwnedScalarValue } from "./closed_scalar_output.ts";
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
export type OwnedClosedStoreOutputRequest = Readonly<{
    execution: NormalizedClosedStoreDataExecution;
    owner: number;
    hostKey: string;
    inputs: readonly Readonly<{
        store: AnyAsyncStore;
        readerId: string;
    }>[];
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
type ScheduledFrameRow = Readonly<{
    request: NormalizedRequest;
    group: BatchGroup | null;
    groupIndex: number;
    groupRow: number;
}>;
type BatchGroup = Readonly<{
    execution: NormalizedClosedStoreDataExecution;
    index: number;
    rows: readonly number[];
}>;
/** Root-owned immutable schedule geometry; a candidate owns every writable buffer. */
export declare class MountedClosedStoreExecution {
    #private;
    private constructor();
    static prepare(key: symbol, requests: readonly NormalizedRequest[], boundRequests: readonly BoundClosedStoreOutputRequest[], previous?: MountedClosedStoreExecution | null, counts?: MountedClosedStoreExecutionCounts): MountedClosedStoreExecution | null;
    static owns(value: unknown): value is MountedClosedStoreExecution;
    static prune(key: symbol, previous: MountedClosedStoreExecution | null, retired: ReadonlySet<number>): MountedClosedStoreExecution | null;
    static retain(key: symbol, previous: MountedClosedStoreExecution | null, live: ReadonlySet<number>): MountedClosedStoreExecution | null;
    static inspect(key: symbol, value: MountedClosedStoreExecution): Readonly<{
        scheduled: readonly ScheduledFrameRow[];
        groups: readonly BatchGroup[];
        framePlan: OwnedClosedFramePlan;
    }> | null;
    layoutIdentityForOwner(owner: number): object | null;
    get rowCount(): number;
    requestAt(index: number): BoundClosedStoreOutputRequest;
}
export declare const pruneMountedClosedStoreExecution: (previous: MountedClosedStoreExecution | null, retired: ReadonlySet<number>) => MountedClosedStoreExecution | null;
export declare const retainMountedClosedStoreExecution: (previous: MountedClosedStoreExecution | null, live: ReadonlySet<number>) => MountedClosedStoreExecution | null;
export type MountedClosedStoreExecutionCounts = {
    built: number;
    reused: number;
    repairedGroups: number;
};
export declare const prepareMountedClosedStoreExecution: (orderedRequests: readonly BoundClosedStoreOutputRequest[], previousPlan?: MountedClosedStoreExecution | null, planCounts?: MountedClosedStoreExecutionCounts) => MountedClosedStoreExecution | null;
/** One authentic capture and immutable scalar result over mounted metadata. */
export declare class OwnedClosedFrameCut {
    #private;
    private constructor();
    static owns(value: unknown): value is OwnedClosedFrameCut;
    static capture(world: OwnerStateWorld, transaction: StoreRenderTransaction, mounted: MountedClosedStoreExecution, counts?: OwnedScalarOutputCounts): {
        kind: "ready";
        cut: OwnedClosedFrameCut;
    } | {
        kind: "public-required";
    } | null;
    get mounted(): MountedClosedStoreExecution;
    get rowCount(): number;
    get cellCut(): ClosedWorldCellCut;
    ownerAt(index: number): number;
    keyAt(index: number): string;
    tagAt(index: number): string;
    retainedChildrenAt(index: number): boolean;
    layoutAt(index: number): OwnedScalarLayout;
    cellsAt(index: number): readonly OwnedClosedWorldInputCell[];
    lineageAt(index: number): readonly number[];
    valueAt(index: number, prop: number): OwnedScalarValue;
    imageAt(index: number): OwnedScalarImage;
}
/** Capture one mounted plan through its canonical World and Store authorities. */
export declare const prepareOwnedClosedStoreOutputs: (world: OwnerStateWorld, transaction: StoreRenderTransaction, mountedPlan: MountedClosedStoreExecution, counts?: OwnedScalarOutputCounts) => {
    kind: "ready";
    cut: OwnedClosedFrameCut;
} | {
    kind: "public-required";
} | null;
export {};
//# sourceMappingURL=closed_store_execution.d.ts.map