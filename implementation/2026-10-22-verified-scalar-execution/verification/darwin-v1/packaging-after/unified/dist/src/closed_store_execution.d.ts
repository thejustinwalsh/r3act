import { type ClosedStoreHostOutput, type ClosedStoreHostProgram } from "./closed_store_host_program.ts";
import { type AnyAsyncStore, type StoreRenderTransaction } from "./async_store_runtime.ts";
import { type OwnedClosedWorldInputCell, type OwnerStateWorld } from "./owner_state_world.ts";
import type { StorePropDelta } from "./vdom_snapshot_runtime.ts";
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
}>);
declare const normalizedExecutionBrand: unique symbol;
export type NormalizedClosedStoreDataExecution = ClosedStoreDataExecutionIdentity & Readonly<{
    schemaVersion: 1 | 2;
    [normalizedExecutionBrand]: true;
}>;
/** Copy an explicit data marker and bind it privately to a normalized host program. */
export declare const normalizeClosedStoreDataExecution: (raw: unknown, host: ClosedStoreHostProgram) => NormalizedClosedStoreDataExecution | null;
/** Report registration-time selection without exposing executable state. */
export declare const inspectClosedStoreDataExecution: (execution: NormalizedClosedStoreDataExecution) => Readonly<{
    mode: "verified-scalar" | "interpreted";
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
export type OwnedClosedStoreOutputRow = Readonly<{
    owner: number;
    lineage: readonly number[];
    cells: readonly OwnedClosedWorldInputCell[];
    region: StorePropDelta;
}>;
/** Enclose passive captures and finite evaluation for ordered owned scalar rows. */
export declare const prepareOwnedClosedStoreOutputs: (world: OwnerStateWorld, transaction: StoreRenderTransaction, orderedRequests: readonly OwnedClosedStoreOutputRequest[]) => {
    kind: "ready";
    rows: readonly OwnedClosedStoreOutputRow[];
} | {
    kind: "public-required";
} | null;
export {};
//# sourceMappingURL=closed_store_execution.d.ts.map