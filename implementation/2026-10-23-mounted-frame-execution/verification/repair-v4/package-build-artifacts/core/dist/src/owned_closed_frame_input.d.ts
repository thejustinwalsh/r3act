import { type AnyAsyncStore, type BoundClosedProjectionRequest } from "./async_store_runtime.ts";
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
    get readerCount(): number;
    get storeCount(): number;
    get uniqueProjectionCount(): number;
    uniqueProjectionAt(index: number): BoundClosedProjectionRequest;
    projectionIndexAt(index: number): number;
    projectionIndexFor(store: AnyAsyncStore, paths: readonly (readonly string[])[]): number;
    readerAt(index: number): BoundClosedProjectionRequest;
    readerIndexForId(id: string): number;
    storeAt(index: number): AnyAsyncStore;
    storeReadersAt(index: number): readonly string[];
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
export declare const canonicalOwnedClosedFramePlanReaderAt: (index: number) => BoundClosedProjectionRequest;
export declare const canonicalOwnedClosedFramePlanReaderIndexForId: (id: string) => number;
export declare const canonicalOwnedClosedFramePlanStoreAt: (index: number) => AnyAsyncStore;
export declare const canonicalOwnedClosedFramePlanStoreReadersAt: (index: number) => readonly string[];
export declare const canonicalOwnedClosedFramePlanUniqueProjectionAt: (index: number) => BoundClosedProjectionRequest;
export declare const canonicalOwnedClosedFramePlanProjectionIndexAt: (index: number) => number;
export declare const canonicalOwnedClosedFramePlanProjectionIndexFor: (store: AnyAsyncStore, paths: readonly (readonly string[])[]) => number;
/** Candidate-private buffers over a retained immutable capture plan. */
export declare class OwnedClosedFrameFill {
    #private;
    private constructor();
    static fromPlan(plan: OwnedClosedFramePlan, groupInputs: readonly OwnedClosedFrameInput[]): OwnedClosedFrameFill | null;
    static owns(value: unknown): value is OwnedClosedFrameFill;
    get rowCount(): number;
    get projectionCount(): number;
    get plan(): OwnedClosedFramePlan;
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
export declare const createOwnedClosedFrameFillFromPlan: typeof OwnedClosedFrameFill.fromPlan;
export declare const canonicalOwnedClosedFrameFillOwns: typeof OwnedClosedFrameFill.owns;
export declare const canonicalOwnedClosedFrameFillWorldAt: (index: number) => OwnedClosedWorldInputRequest;
export declare const canonicalOwnedClosedFrameFillRowInputAt: (index: number) => OwnedClosedFrameInput | null;
export declare const canonicalOwnedClosedFrameFillGroupRowAt: (index: number) => number;
export declare const canonicalOwnedClosedFrameFillFallbackAt: (index: number) => number[][] | undefined;
export declare const canonicalOwnedClosedFrameFillBoundAt: (index: number) => BoundClosedProjectionRequest;
export declare const canonicalOwnedClosedFrameFillProjectionInputAt: (index: number) => OwnedClosedFrameInput | null;
export declare const canonicalOwnedClosedFrameFillSharedOffsetAt: (index: number) => number;
export declare const canonicalOwnedClosedFrameFillFillSharedAt: (index: number) => boolean;
export declare const canonicalOwnedClosedFrameFillProjectionFallbackAt: (index: number) => number[][] | undefined;
//# sourceMappingURL=owned_closed_frame_input.d.ts.map