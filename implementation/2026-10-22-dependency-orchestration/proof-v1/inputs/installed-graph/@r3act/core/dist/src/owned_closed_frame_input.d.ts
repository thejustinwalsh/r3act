import { type BoundClosedProjectionRequest } from "./async_store_runtime.ts";
import { type OwnedClosedWorldInputRequest } from "./owner_state_world.ts";
/** Ephemeral numeric columns owned by one sealed frame capture. */
export declare class OwnedClosedFrameInput {
    #private;
    constructor(key: symbol, sharedCount: number, varyingCount: number, rowCount: number);
    get sharedCount(): number;
    get varyingCount(): number;
    static owns(value: unknown): value is OwnedClosedFrameInput;
    setShared(index: number, value: number): void;
    setVarying(index: number, value: number): void;
    buffers(): Readonly<{
        shared: readonly number[];
        varying: readonly number[];
    }>;
}
export declare const createOwnedClosedFrameInput: (sharedCount: number, varyingCount: number, rowCount: number) => OwnedClosedFrameInput;
export type OwnedClosedFrameScheduleRow = Readonly<{
    world: OwnedClosedWorldInputRequest;
    projections: readonly BoundClosedProjectionRequest[];
    input: OwnedClosedFrameInput | null;
    groupRow: number;
    fallbackValues?: number[][];
}>;
export type OwnedClosedFrameProjectionColumn = Readonly<{
    bound: BoundClosedProjectionRequest;
    input: OwnedClosedFrameInput | null;
    sharedOffset: number;
    fillShared: boolean;
    fallbackValues?: number[][];
}>;
/** One ephemeral authenticated candidate schedule consumed by World and Store. */
export declare class OwnedClosedFrameSchedule {
    #private;
    private constructor();
    static create(): OwnedClosedFrameSchedule;
    append(world: OwnedClosedWorldInputRequest, sourceProjections: readonly BoundClosedProjectionRequest[], input: OwnedClosedFrameInput | null, groupRow: number, fallback: boolean): boolean;
    seal(): boolean;
    static owns(value: unknown): value is OwnedClosedFrameSchedule;
    get sealed(): boolean;
    get rowCount(): number;
    rowAt(index: number): OwnedClosedFrameScheduleRow;
    get projectionCount(): number;
    projectionAt(index: number): OwnedClosedFrameProjectionColumn;
}
export declare const createOwnedClosedFrameSchedule: typeof OwnedClosedFrameSchedule.create;
export declare const canonicalOwnedClosedFrameScheduleOwns: typeof OwnedClosedFrameSchedule.owns;
export declare const canonicalOwnedClosedFrameScheduleRowAt: (index: number) => OwnedClosedFrameScheduleRow;
export declare const canonicalOwnedClosedFrameScheduleProjectionAt: (index: number) => OwnedClosedFrameProjectionColumn;
//# sourceMappingURL=owned_closed_frame_input.d.ts.map