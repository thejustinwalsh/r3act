import { type NativeStoreRootWork } from "./native_root_work_queue.ts";
import type { RootWorkResolution } from "./root_work_queue.ts";
export type NativeFrameTime = Readonly<{
    timeMs: number;
    deltaMs: number;
}>;
export type NativeFrameResult = Readonly<{
    status: "drawn" | "pending" | "cancelled" | "stale" | "failed" | "disposed";
    frame: NativeFrameTime;
    publication?: RootWorkResolution;
    error?: unknown;
}>;
export type NativeFrameLoopOptions = {
    readonly roots: NativeStoreRootWork["roots"];
    readonly update: (frame: NativeFrameTime) => void;
    readonly draw: (frame: NativeFrameTime) => void;
    readonly requestFrame?: (callback: (timeMs: number) => void) => number;
    readonly cancelFrame?: (id: number) => void;
    readonly maxDeltaMs?: number;
    readonly onError?: (error: unknown) => void;
};
export type NativeFrameLoop = {
    readonly running: boolean;
    readonly disposed: boolean;
    start(): void;
    stop(): void;
    advance(timeMs: number): NativeFrameResult;
    dispose(): void;
};
export declare function createNativeFrameLoop(options: NativeFrameLoopOptions): NativeFrameLoop;
//# sourceMappingURL=native_frame_loop.d.ts.map