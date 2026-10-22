import type { ClosedHostPrimitive } from "./closed_host_value.ts";
import type { ClosedStoreHostOutput } from "./closed_store_host_program.ts";
export type OwnedScalarValue = ClosedHostPrimitive;
export type OwnedScalarOutputCounts = {
    frames: number;
    rootMaterializations: number;
    propMaterializations: number;
};
export declare class OwnedScalarLayout {
    #private;
    private constructor();
    static create(names: readonly string[], constantSlots: readonly (OwnedScalarValue | undefined)[]): OwnedScalarLayout;
    static owns(value: unknown): value is OwnedScalarLayout;
    get length(): number;
    nameAt(index: number): string;
    slotAt(index: number): number;
    constantAt(index: number): OwnedScalarValue | undefined;
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
export declare const isOwnedScalarLayout: (value: unknown) => value is OwnedScalarLayout;
export declare const isOwnedScalarFrame: (value: unknown) => value is OwnedScalarFrame;
/** Derive the former public tuple shape only when an ordinary caller observes it. */
export declare const materializeOwnedScalarPropEntries: (frame: OwnedScalarFrame, counts?: OwnedScalarOutputCounts) => ClosedStoreHostOutput;
/** Create ordinary own data properties without exposing the frame's backing values. */
export declare const materializeOwnedScalarPropRecord: (frame: OwnedScalarFrame, counts?: OwnedScalarOutputCounts) => Readonly<Record<string, OwnedScalarValue>>;
//# sourceMappingURL=closed_scalar_output.d.ts.map