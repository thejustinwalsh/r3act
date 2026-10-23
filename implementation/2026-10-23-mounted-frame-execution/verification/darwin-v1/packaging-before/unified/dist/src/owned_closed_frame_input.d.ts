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
/** Immutable group geometry composed through an ordered row remap. */
export declare class OwnedClosedFramePlan {
    #private;
    private constructor();
    static create(rows: readonly Readonly<{
        world: OwnedClosedWorldInputRequest;
        projections: readonly BoundClosedProjectionRequest[];
        group: number;
        groupRow: number;
    }>[], previous?: OwnedClosedFramePlan | null): OwnedClosedFramePlan | null;
    static owns(value: unknown): value is OwnedClosedFramePlan;
    get rowCount(): number;
    get projectionCount(): number;
    worldAt(index: number): OwnedClosedWorldInputRequest;
    rowGroupAt(index: number): number;
    groupRowAt(index: number): number;
    boundAt(index: number): BoundClosedProjectionRequest;
    projectionGroupAt(index: number): number;
    sharedOffsetAt(index: number): number;
    fillSharedAt(index: number): boolean;
    fallbackRowAt(index: number): number;
    chunkAt(index: number): object;
}
export declare const createOwnedClosedFramePlan: typeof OwnedClosedFramePlan.create;
/** Candidate-private buffers over a retained immutable capture plan. */
export declare class OwnedClosedFrameSchedule {
    #private;
    private constructor();
    static fromPlan(plan: OwnedClosedFramePlan, groupInputs: readonly OwnedClosedFrameInput[]): OwnedClosedFrameSchedule | null;
    static owns(value: unknown): value is OwnedClosedFrameSchedule;
    get rowCount(): number;
    get projectionCount(): number;
    worldAt(index: number): OwnedClosedWorldInputRequest;
    rowInputAt(index: number): OwnedClosedFrameInput | null;
    groupRowAt(index: number): number;
    fallbackAt(index: number): number[][] | undefined;
    boundAt(index: number): BoundClosedProjectionRequest;
    projectionInputAt(index: number): OwnedClosedFrameInput | null;
    sharedOffsetAt(index: number): number;
    fillSharedAt(index: number): boolean;
    projectionFallbackAt(index: number): number[][] | undefined;
}
export declare const createOwnedClosedFrameScheduleFromPlan: typeof OwnedClosedFrameSchedule.fromPlan;
export declare const canonicalOwnedClosedFrameScheduleOwns: typeof OwnedClosedFrameSchedule.owns;
export declare const canonicalOwnedClosedFrameScheduleWorldAt: (index: number) => OwnedClosedWorldInputRequest;
export declare const canonicalOwnedClosedFrameScheduleRowInputAt: (index: number) => OwnedClosedFrameInput | null;
export declare const canonicalOwnedClosedFrameScheduleGroupRowAt: (index: number) => number;
export declare const canonicalOwnedClosedFrameScheduleFallbackAt: (index: number) => number[][] | undefined;
export declare const canonicalOwnedClosedFrameScheduleBoundAt: (index: number) => BoundClosedProjectionRequest;
export declare const canonicalOwnedClosedFrameScheduleProjectionInputAt: (index: number) => OwnedClosedFrameInput | null;
export declare const canonicalOwnedClosedFrameScheduleSharedOffsetAt: (index: number) => number;
export declare const canonicalOwnedClosedFrameScheduleFillSharedAt: (index: number) => boolean;
export declare const canonicalOwnedClosedFrameScheduleProjectionFallbackAt: (index: number) => number[][] | undefined;
//# sourceMappingURL=owned_closed_frame_input.d.ts.map