import {
  NativeRootWorkQueue,
  type NativeRootWorkHandle,
  type NativeStoreRootWork,
} from "./native_root_work_queue.ts";
import {
  claimDeclarativeNativeFrame,
  publishDeclarativeNativeFrame,
  publishImmediateNativeFrameStores,
  releaseDeclarativeNativeFrame,
  tickDeclarativeNativeFrame,
} from "./component_state_runtime.ts";
import type { RootWorkResolution, RootWorkSettled } from "./root_work_queue.ts";

export type NativeFrameTime = Readonly<{ timeMs: number; deltaMs: number }>;

export type NativeFrameResult = Readonly<{
  status: "drawn" | "pending" | "cancelled" | "stale" | "failed" | "disposed";
  frame: NativeFrameTime;
  publication?: RootWorkResolution;
  error?: unknown;
}>;

export type NativeFrameLoopOptions = {
  readonly roots: NativeStoreRootWork["roots"];
  readonly update?: (frame: NativeFrameTime) => void;
  readonly draw: (frame: NativeFrameTime) => void;
  readonly requestFrame?: (callback: (timeMs: number) => void) => number;
  readonly cancelFrame?: (id: number) => void;
  readonly maxDeltaMs?: number;
  readonly onError?: (error: unknown) => void;
  readonly declarative?: true;
};

export type NativeFrameLoop = {
  readonly running: boolean;
  readonly disposed: boolean;
  start(): void;
  stop(): void;
  advance(timeMs: number): NativeFrameResult;
  dispose(): void;
};

type ActiveFrame = {
  readonly frame: NativeFrameTime;
  handle?: NativeRootWorkHandle;
  resolution?: RootWorkResolution;
  acceptedVersions?: readonly number[];
};

function withCleanup(error: unknown, cleanup: readonly unknown[]): unknown {
  return cleanup.length === 0
    ? error
    : new AggregateError([error, ...cleanup], "Native frame and cleanup failed");
}

class NativeFrameLoopController implements NativeFrameLoop {
  readonly #queue?: NativeRootWorkQueue;
  readonly #roots: NativeStoreRootWork["roots"];
  readonly #update?: (frame: NativeFrameTime) => void;
  readonly #draw: (frame: NativeFrameTime) => void;
  readonly #onError?: (error: unknown) => void;
  readonly #declarative: boolean;
  readonly #maxDeltaMs: number;
  readonly #requestOption?: NativeFrameLoopOptions["requestFrame"];
  readonly #cancelOption?: NativeFrameLoopOptions["cancelFrame"];
  readonly #retireUnsubscribes: (() => void)[] = [];
  #request?: NonNullable<NativeFrameLoopOptions["requestFrame"]>;
  #cancel?: NonNullable<NativeFrameLoopOptions["cancelFrame"]>;
  #scheduled?: { id?: number; token: object };
  #requesting = false;
  #asyncError?: { error: unknown };
  #failedPublication?: NativeFrameResult;
  #handlingFailure = false;
  #running = false;
  #disposed = false;
  #advancing = false;
  #lastTime?: number;
  #lastUpdateTime?: number;
  #active?: ActiveFrame;
  #nextWorkId = 0;
  #claimedDeclarative = false;

  constructor(options: NativeFrameLoopOptions) {
    if ((options.requestFrame === undefined) !== (options.cancelFrame === undefined)) {
      throw new TypeError("requestFrame and cancelFrame must be supplied together");
    }
    const maxDeltaMs = options.maxDeltaMs ?? 50;
    if (!Number.isFinite(maxDeltaMs) || maxDeltaMs <= 0) {
      throw new RangeError("maxDeltaMs must be positive and finite");
    }
    if (!options.roots.length) throw new Error("Native frame loop requires roots");
    const rootIds = new Set<string>();
    this.#roots = Object.freeze(options.roots.map(({ root, stores }) => {
      if (root.retired || rootIds.has(root.rootId)) {
        throw new Error("Native frame loop requires distinct active roots");
      }
      rootIds.add(root.rootId);
      return Object.freeze({ root, stores: Object.freeze([...stores]) });
    }));
    if (options.declarative && this.#roots.length !== 1) {
      throw new Error("Declarative frame publication requires one root");
    }
    if (!options.declarative && !options.update) {
      throw new Error("Imperative frame loop requires update");
    }
    this.#update = options.update;
    this.#draw = options.draw;
    this.#onError = options.onError;
    this.#declarative = options.declarative === true;
    this.#maxDeltaMs = maxDeltaMs;
    this.#requestOption = options.requestFrame;
    this.#cancelOption = options.cancelFrame;
    if (!this.#declarative) {
      this.#queue = new NativeRootWorkQueue({ onError: (error) => this.#failAsync(error) });
    }
    try {
      if (this.#declarative) {
        claimDeclarativeNativeFrame(this.#roots[0].root, this);
        this.#claimedDeclarative = true;
      }
      for (const { root } of this.#roots) {
        this.#retireUnsubscribes.push(root.onRetire(() => this.dispose()));
      }
    } catch (error) {
      const cleanup: unknown[] = [];
      try { this.dispose(); } catch (cleanupError) { cleanup.push(cleanupError); }
      throw withCleanup(error, cleanup);
    }
  }

  get running(): boolean { return this.#running; }
  get disposed(): boolean { return this.#disposed; }

  start(): void {
    if (this.#disposed) throw new Error("Native frame loop is disposed");
    if (this.#failedPublication) throw this.#failedPublication.error;
    if (this.#running) return;
    if (this.#requestOption) {
      this.#request = this.#requestOption;
      this.#cancel = this.#cancelOption;
    } else {
      const request = globalThis.requestAnimationFrame;
      const cancel = globalThis.cancelAnimationFrame;
      if (typeof request !== "function" || typeof cancel !== "function") {
        throw new Error("requestAnimationFrame and cancelAnimationFrame are unavailable");
      }
      this.#request = (callback) => request.call(globalThis, callback);
      this.#cancel = (id) => cancel.call(globalThis, id);
    }
    this.#lastTime = undefined;
    this.#lastUpdateTime = undefined;
    this.#asyncError = undefined;
    this.#running = true;
    try { this.#schedule(); } catch (error) { throw this.#fail(error); }
    const failure = this.#currentAsyncError();
    if (failure) throw failure.error;
  }

  stop(): void {
    if (this.#disposed) return;
    const errors: unknown[] = [];
    this.#running = false;
    this.#cancelScheduled(errors);
    this.#cancelActive(errors);
    this.#lastTime = undefined;
    this.#lastUpdateTime = undefined;
    if (errors.length) throw new AggregateError(errors, "Native frame stop failed");
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#running = false;
    const errors: unknown[] = [];
    this.#cancelScheduled(errors);
    this.#cancelActive(errors);
    for (const unsubscribe of this.#retireUnsubscribes.splice(0)) {
      try { unsubscribe(); } catch (error) { errors.push(error); }
    }
    try { this.#queue?.dispose(); } catch (error) { errors.push(error); }
    if (this.#claimedDeclarative) {
      this.#claimedDeclarative = false;
      try { releaseDeclarativeNativeFrame(this.#roots[0].root, this); }
      catch (error) { errors.push(error); }
    }
    if (errors.length) throw new AggregateError(errors, "Native frame disposal failed");
  }

  advance(timeMs: number): NativeFrameResult {
    if (this.#advancing) throw new Error("Native frame advance is reentrant");
    if (this.#disposed && this.#failedPublication) {
      return { status: "disposed", frame: this.#failedPublication.frame };
    }
    if (this.#failedPublication) return this.#failedPublication;
    if (!Number.isFinite(timeMs) || (this.#lastTime !== undefined && timeMs < this.#lastTime)) {
      throw this.#fail(new RangeError("Native frame time must be finite and nondecreasing"));
    }
    const frame = this.#active?.frame ?? Object.freeze({
      timeMs,
      deltaMs: this.#lastUpdateTime === undefined ? 0 :
        Math.min(timeMs - this.#lastUpdateTime, this.#maxDeltaMs),
    });
    if (this.#disposed) return { status: "disposed", frame };
    const priorFailure = this.#asyncFailure(frame);
    if (priorFailure) return priorFailure;
    this.#lastTime = timeMs;
    this.#advancing = true;
    try {
      if (this.#roots.some(({ root }) => root.retired)) {
        this.dispose();
        return { status: "disposed", frame };
      }
      if (!this.#active) {
        this.#lastUpdateTime = timeMs;
        const active: ActiveFrame = { frame };
        this.#active = active;
        if (this.#declarative) tickDeclarativeNativeFrame(this.#roots[0].root,
          frame, this, () => this.#active === active && !this.#disposed);
        this.#update?.(frame);
        if (this.#disposed) return { status: "disposed", frame };
        if (this.#active !== active) return { status: "cancelled", frame };
        this.#publish(active);
        const failure = this.#asyncFailure(frame);
        if (failure) return failure;
        if (this.#active !== active) return { status: "cancelled", frame };
      } else if (this.#active.handle?.status === "pending") {
        this.#active.handle.refresh();
      } else if (this.#declarative &&
        this.#active.resolution?.status === "pending") {
        this.#publish(this.#active);
      }
      if (this.#disposed) return { status: "disposed", frame };
      const pendingFailure = this.#asyncFailure(frame);
      if (pendingFailure) return pendingFailure;
      if (!this.#active) return { status: "cancelled", frame };
      const active = this.#active!;
      let resolution = this.#currentResolution(active);
      if (resolution?.status === "committed" && !this.#versionsCurrent(active)) {
        active.resolution = undefined;
        active.acceptedVersions = undefined;
        active.handle = undefined;
        this.#publish(active);
        if (this.#disposed) return { status: "disposed", frame };
        const replacementFailure = this.#asyncFailure(frame);
        if (replacementFailure) return replacementFailure;
        if (this.#active !== active) return { status: "cancelled", frame };
        resolution = this.#currentResolution(active);
      }
      if (resolution?.status === "committed") {
        if (!this.#versionsCurrent(active)) {
          return { status: "stale", frame, publication: resolution };
        }
        this.#active = undefined;
        this.#draw(frame);
        return { status: "drawn", frame, publication: resolution };
      }
      if (resolution?.status === "pending" || resolution === undefined) {
        return { status: "pending", frame, publication: resolution };
      }
      this.#active = undefined;
      if (resolution.status === "failed") {
        const error = Object.hasOwn(resolution, "error")
          ? resolution.error
          : new Error(resolution.reason ?? "Native frame publication failed");
        this.#failedPublication = Object.freeze({ status: "failed" as const, frame, publication: resolution, error });
        this.#failedPublication = Object.freeze({ ...this.#failedPublication, error: this.#fail(error) });
        return this.#failedPublication;
      }
      return { status: resolution.status, frame, publication: resolution,
        error: resolution.error };
    } catch (error) {
      throw this.#fail(error);
    } finally {
      this.#advancing = false;
    }
  }

  #publish(active: ActiveFrame): void {
    const id = `native-frame:${++this.#nextWorkId}`;
    if (this.#declarative) {
      const result = publishDeclarativeNativeFrame(this.#roots[0].root, this);
      if (this.#active !== active || this.#disposed) return;
      active.resolution = Object.freeze({ status: result.status,
        transitionId: id, roots: Object.freeze(this.#roots.map(({ root }) => root.rootId)) });
      if (result.status === "committed") {
        active.acceptedVersions = Object.freeze([result.publicationVersion]);
      }
      return;
    }
    if (this.#roots.length === 1) {
      const { root, stores } = this.#roots[0];
      let result: ReturnType<typeof publishImmediateNativeFrameStores>;
      try { result = publishImmediateNativeFrameStores(root, stores); }
      catch (error) {
        if (this.#active !== active || this.#disposed) throw error;
        active.resolution = Object.freeze({ status: "failed" as const,
          transitionId: id, roots: Object.freeze([root.rootId]), error });
        return;
      }
      if (result.kind === "committed") {
        if (this.#active === active && !this.#disposed) {
          active.resolution = Object.freeze({ status: "committed" as const,
            transitionId: id, roots: Object.freeze([root.rootId]) });
          active.acceptedVersions = Object.freeze([result.publicationVersion]);
        }
        return;
      }
    }
    const queue = this.#queue!;
    const handle = queue.enqueueStores({
      id,
      roots: this.#roots,
      onSettled: (resolution: RootWorkSettled) => {
        if (this.#active !== active || this.#disposed) return;
        active.resolution = resolution;
        if (resolution.status === "committed") {
          active.acceptedVersions = this.#roots.map(({ root }) => queue.getVersion(root));
        }
      },
    });
    if (this.#active === active && !this.#disposed) {
      active.handle = handle;
      active.resolution ??= handle.resolution;
      if (active.resolution.status === "committed" && !active.acceptedVersions) {
        active.acceptedVersions = this.#roots.map(({ root }) => queue.getVersion(root));
      }
    } else if (handle.status === "pending") {
      handle.cancel("Native frame loop stopped during preparation");
    }
  }

  #versionsCurrent(active: ActiveFrame): boolean {
    return active.acceptedVersions !== undefined && this.#roots.every(
      ({ root }, index) => !root.retired &&
        root.publicationVersion === active.acceptedVersions![index],
    );
  }

  #asyncFailure(frame: NativeFrameTime): NativeFrameResult | undefined {
    const failure = this.#currentAsyncError();
    return failure ? { status: "failed", frame, error: failure.error } : undefined;
  }

  #currentAsyncError(): { error: unknown } | undefined {
    return this.#asyncError;
  }

  #currentResolution(active: ActiveFrame): RootWorkResolution | undefined {
    return active.resolution ?? active.handle?.resolution;
  }

  #schedule(): void {
    if (!this.#running || this.#disposed || this.#scheduled) return;
    const token = {};
    const scheduled: { id?: number; token: object } = { token };
    this.#scheduled = scheduled;
    this.#requesting = true;
    let id: number;
    try { id = this.#request!((timeMs) => {
      if (this.#requesting) {
        this.#failAsync(new Error("requestFrame callback ran synchronously"));
        return;
      }
      if (this.#scheduled?.token !== token || !this.#running || this.#disposed) return;
      this.#scheduled = undefined;
      try {
        const result = this.advance(timeMs);
        if (result.status === "failed" && !this.#onError) throw result.error;
      } catch (error) {
        if (!this.#onError) throw error;
      }
      if (this.#running && !this.#disposed) {
        try { this.#schedule(); } catch (error) { this.#failAsync(error); }
      }
    }); } catch (error) {
      if (this.#scheduled === scheduled) this.#scheduled = undefined;
      throw error;
    } finally {
      this.#requesting = false;
    }
    if (this.#scheduled === scheduled) scheduled.id = id;
    else this.#cancel?.(id);
  }

  #cancelScheduled(errors: unknown[]): void {
    const scheduled = this.#scheduled;
    this.#scheduled = undefined;
    if (scheduled?.id !== undefined) {
      try { this.#cancel?.(scheduled.id); } catch (error) { errors.push(error); }
    }
  }

  #cancelActive(errors: unknown[]): void {
    const active = this.#active;
    this.#active = undefined;
    if (active?.handle?.status === "pending") {
      try { active.handle.cancel("Native frame loop stopped"); }
      catch (error) { errors.push(error); }
    }
  }

  #fail(error: unknown): unknown {
    if (this.#handlingFailure) return error;
    this.#handlingFailure = true;
    const cleanup: unknown[] = [];
    try { this.stop(); } catch (cleanupError) { cleanup.push(cleanupError); }
    try { this.#onError?.(error); } catch (callbackError) { cleanup.push(callbackError); }
    this.#handlingFailure = false;
    return withCleanup(error, cleanup);
  }

  #failAsync(error: unknown): void {
    this.#asyncError = { error: this.#fail(error) };
  }
}

export function createNativeFrameLoop(options: NativeFrameLoopOptions): NativeFrameLoop {
  return new NativeFrameLoopController(options);
}
