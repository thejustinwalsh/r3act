import type { ClosedHostPrimitive } from "./closed_host_value.ts";
import type { ClosedStoreHostOutput } from "./closed_store_host_program.ts";
import { type ClosedStoreBatchKernelProof } from "./closed_store_batch_kernel_proof.ts";
import { OwnedClosedFrameInput } from "./owned_closed_frame_input.ts";
export type OwnedScalarValue = ClosedHostPrimitive;
export type OwnedScalarOutputCounts = {
    frames: number;
    rootMaterializations: number;
    propMaterializations: number;
    pages?: number;
    batchCalls?: number;
    batchRows?: number;
};
export declare class OwnedScalarLayout {
    #private;
    private constructor();
    static create(names: readonly string[], constantSlots: readonly (OwnedScalarValue | undefined)[], numericPropIndices?: readonly number[]): OwnedScalarLayout;
    static owns(value: unknown): value is OwnedScalarLayout;
    get length(): number;
    nameAt(index: number): string;
    slotAt(index: number): number;
    constantAt(index: number): OwnedScalarValue | undefined;
    get verifiedNumericResults(): boolean;
}
export declare class OwnedScalarFrame {
    #private;
    private constructor();
    static create(layout: OwnedScalarLayout, values: readonly OwnedScalarValue[], counts?: OwnedScalarOutputCounts): OwnedScalarFrame;
    static owns(value: unknown): value is OwnedScalarFrame;
    get layout(): OwnedScalarLayout;
    get length(): number;
    valueAt(index: number): OwnedScalarValue;
}
export declare class OwnedScalarBatchPage {
    #private;
    constructor(key: symbol, layout: OwnedScalarLayout, rows: readonly (readonly OwnedScalarValue[])[]);
    static owns(value: unknown): value is OwnedScalarBatchPage;
    get layout(): OwnedScalarLayout;
    get rowCount(): number;
    valueAt(rowIndex: number, propIndex: number): OwnedScalarValue;
}
/** Execute an authentic proof into one fully validated immutable page. */
export declare const captureVerifiedOwnedScalarBatch: (layout: OwnedScalarLayout, proof: ClosedStoreBatchKernelProof, input: OwnedClosedFrameInput, rowCount: number, counts?: OwnedScalarOutputCounts) => OwnedScalarBatchPage;
export type OwnedScalarImage = Readonly<{
    kind: "frame";
    frame: OwnedScalarFrame;
} | {
    kind: "page";
    page: OwnedScalarBatchPage;
    rowIndex: number;
}>;
export declare const isOwnedScalarImage: (value: unknown) => value is OwnedScalarImage;
export declare const ownedScalarImageLayout: (image: OwnedScalarImage) => OwnedScalarLayout;
export declare const ownedScalarImageLength: (image: OwnedScalarImage) => number;
export declare const ownedScalarImageValueAt: (image: OwnedScalarImage, propIndex: number) => OwnedScalarValue;
export declare const isOwnedScalarLayout: (value: unknown) => value is OwnedScalarLayout;
export declare const isOwnedScalarFrame: (value: unknown) => value is OwnedScalarFrame;
/** Derive the former public tuple shape only when an ordinary caller observes it. */
export declare const materializeOwnedScalarPropEntries: (frame: OwnedScalarFrame, counts?: OwnedScalarOutputCounts) => ClosedStoreHostOutput;
/** Create ordinary own data properties without exposing the frame's backing values. */
export declare const materializeOwnedScalarPropRecord: (frame: OwnedScalarFrame, counts?: OwnedScalarOutputCounts) => Readonly<Record<string, OwnedScalarValue>>;
export declare const materializeOwnedScalarImagePropEntries: (image: OwnedScalarImage, counts?: OwnedScalarOutputCounts) => ClosedStoreHostOutput;
export declare const materializeOwnedScalarImagePropRecord: (image: OwnedScalarImage, counts?: OwnedScalarOutputCounts) => Readonly<Record<string, OwnedScalarValue>>;
//# sourceMappingURL=closed_scalar_output.d.ts.map