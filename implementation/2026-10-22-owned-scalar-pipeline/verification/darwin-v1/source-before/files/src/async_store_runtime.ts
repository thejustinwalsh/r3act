import {
  captureClosedProjectionValues, captureOwnedClosedProjectionValues,
  isOwnedClosedProjectionPaths,
} from "./owned_store_record.ts";
export { storeRecord } from "./owned_store_record.ts";

/**
 * A host-independent store with React-like update ordering.
 *
 * State is an append-only action log with a chronological head. Readers project
 * that log at a root/transition boundary: pending transition actions are
 * omitted from the visible state, while later urgent actions are replayed over
 * the state that root still shows. This is the property a single mutable
 * getState() value cannot provide.
 *
 * Promise values are ordinary store values. The store never unwraps or adopts
 * them; a renderer decides whether/how to suspend on a value returned by read.
 */

let storeMutationClock = 0;
const canonicalMapSet = Map.prototype.set;
const canonicalMapDelete = Map.prototype.delete;
const ownedBatchKey = Symbol("owned-store-batch");

// Publication is module-wide: a renderer may commit roots from several stores
// after publishing one shared host tree. Keep only stores with pending work,
// and remove each before draining it so this queue cannot retain stores.
const publicationStores = new Set<AsyncStore<unknown, unknown>>();
let publicationBatchDepth = 0;
let drainingPublicationStores = false;

/**
 * Defer store subscribers until a synchronous multi-store publication finishes.
 * State and root-pointer mutations remain synchronous; this does not roll back
 * mutations if `callback` throws. Nested calls join the outer publication.
 *
 * Notifications are drained even when the callback throws. If both the callback
 * and listeners throw, the resulting AggregateError contains the original
 * callback error and every listener/drain error.
 */
export function batchStorePublication<T>(callback: () => T): T {
  publicationBatchDepth++;
  let result!: T;
  let callbackError: unknown;
  let callbackFailed = false;
  try {
    result = callback();
  } catch (error) {
    callbackFailed = true;
    callbackError = error;
  } finally {
    publicationBatchDepth--;
  }

  let notificationError: unknown;
  let notificationFailed = false;
  if (publicationBatchDepth === 0) {
    try {
      drainPublicationStores();
    } catch (error) {
      notificationFailed = true;
      notificationError = error;
    }
  }

  if (callbackFailed && notificationFailed) {
    throw new AggregateError(
      [callbackError, notificationError],
      "Store publication callback and notification listeners failed",
    );
  }
  if (callbackFailed) throw callbackError;
  if (notificationFailed) throw notificationError;
  return result;
}

function scheduleStoreNotifications(store: AsyncStore<unknown, unknown>) {
  publicationStores.add(store);
  if (publicationBatchDepth === 0 && !drainingPublicationStores) {
    drainPublicationStores();
  }
}

function drainPublicationStores() {
  if (drainingPublicationStores || publicationBatchDepth > 0) return;
  drainingPublicationStores = true;
  const errors: unknown[] = [];
  try {
    while (publicationStores.size > 0) {
      const store = publicationStores.values().next().value as
        | AsyncStore<unknown, unknown>
        | undefined;
      if (!store) continue;
      publicationStores.delete(store);
      try {
        store._drainNotifications();
      } catch (error) {
        errors.push(error);
      }
    }
  } finally {
    drainingPublicationStores = false;
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, "Store notification listeners failed");
  }
}

export type StoreAction<S, A> = A | ((previous: S) => S);
export type StorePriority =
  | { kind: "urgent" }
  | { kind: "transition"; transitionId: string };

export type StoreReadOptions = {
  /** Transition updates to include while preparing that candidate. */
  transitions?: readonly string[];
};

export type StoreChange = {
  rootId: string;
  storeVersion: number;
  state: unknown;
  priority: StorePriority;
};

type StoreNotificationBatch = Map<string, StorePriority>;
const capturedReaderCut = Symbol("captured-reader-cut");
const directReaderCut = Symbol("direct-reader-cut");
type PendingReaderValues = ReadonlyMap<object, unknown> | typeof capturedReaderCut | typeof directReaderCut | null;
type StoreRootStamp = Readonly<{ version: number; rootEpoch: object }>;
type AcceptedReaderHistory = Readonly<{
  selections: Map<object, unknown> | typeof directReaderCut | null;
  stamp: StoreRootStamp | null;
}>;
export type AcceptedStoreReaderReceipt = Readonly<{
  history: object;
  version: number;
  rootEpoch: object;
}>;
type PreparedReaderValues = {
  readonly rootReaders: Map<string, AcceptedReaderHistory>;
  readonly isNewRoot: boolean;
  readonly entries: Map<string, AcceptedReaderHistory | null>;
};

type StoreEntry<S, A> = {
  action: A;
  state: S;
  version: number;
  priority: StorePriority;
  pendingRoots: Set<string>;
  committedRoots: Set<string>;
};

type TransitionRecord = {
  roots: Set<string>;
  completedRoots: Set<string>;
  open: boolean;
};

export type StoreRead<S> = {
  readonly value: S;
  /** Call only after the renderer commits the read that produced this value. */
  commit(): void;
};

/** A read-site context so chained selections get their own previous values. */
export class StoreReadSession {
  readonly transitions: ReadonlySet<string>;
  readonly previous: ReadonlyMap<object, unknown>;
  readonly next = new Map<object, unknown>();

  constructor(
    readonly rootId: string,
    readonly readerId: string,
    transitions: readonly string[],
    previous: ReadonlyMap<object, unknown>,
    /** Immutable projections pinned when this root began its render. */
    readonly snapshotStates: ReadonlyMap<object, unknown>,
  ) {
    this.transitions = new Set(transitions);
    this.previous = previous;
  }
}

/** Advanced adapter protocol: declare every store source read by this source. */
export const storeDependencies: unique symbol = Symbol(
  "native.store.dependencies",
);

export interface StoreSource<S> {
  readonly [storeDependencies]?: readonly StoreSource<unknown>[];
  read(session: StoreReadSession): S;
}

/**
 * A render transaction for one root. Every read uses the same projected state;
 * callers validate immediately before host commit and publish selector history
 * only after that commit succeeds.
 */
export class StoreRenderSnapshot<S, A = StoreAction<S, S>> {
  #pending = new Map<string, PendingReaderValues>();
  #committed = false;
  readonly #capturedStore: AsyncStore<S, A>;
  readonly #capturedRootId: string;
  readonly #capturedVersion: number;
  readonly #capturedRootEpoch: object;

  static _isOwnedPhaseSnapshot(
    candidate: unknown, store: AnyAsyncStore, rootId: string,
  ): boolean {
    if (typeof candidate !== "object" || candidate === null ||
      !(#capturedStore in candidate)) return false;
    if (Object.getPrototypeOf(candidate) !== StoreRenderSnapshot.prototype ||
      !snapshotPhaseMethodsCanonical(candidate)) return false;
    const snapshot = candidate as StoreRenderSnapshot<unknown, any>;
    const ownData = (name: string, expected: unknown) => {
      const descriptor = Object.getOwnPropertyDescriptor(snapshot, name);
      return descriptor && "value" in descriptor && descriptor.value === expected;
    };
    return snapshot.#capturedStore === store &&
      snapshot.#capturedRootId === rootId &&
      ownData("store", store) && ownData("rootId", rootId) &&
      ownData("version", snapshot.#capturedVersion) &&
      ownData("rootEpoch", snapshot.#capturedRootEpoch) &&
      ownData("closedNumeric", true);
  }

  constructor(
    private readonly store: AsyncStore<S, A>,
    readonly rootId: string,
    private readonly options: StoreReadOptions,
    readonly state: S,
    readonly version: number,
    private readonly rootEpoch: object,
    /** Legacy name for canonical callback-free capture, including selected record paths. */
    readonly closedNumeric = false,
  ) {
    this.#capturedStore = store;
    this.#capturedRootId = rootId;
    this.#capturedVersion = version;
    this.#capturedRootEpoch = rootEpoch;
  }

  capturedRootStamp(): StoreRootStamp {
    return Object.freeze({ version: this.version, rootEpoch: this.rootEpoch });
  }

  read<T>(source: StoreSource<T>, readerId: string): T {
    if (this.#committed) {
      throw new Error("Cannot read from a committed store render snapshot");
    }
    return this.store._readAtSnapshot(
      source,
      this.rootId,
      readerId,
      this.options.transitions ?? [],
      new Map<object, unknown>([[this.store, this.state]]),
      this.#pending,
    );
  }

  /** False means discard/rebuild the candidate; never publish a mixed render. */
  validate(): boolean {
    return !this.#committed &&
      (!this.closedNumeric ||
        canonicalClosedNumericStore.call(this.store)) &&
      (this.closedNumeric
        ? canonicalValidateRender.call(
          this.store,
          this.rootId,
          this.version,
          this.rootEpoch,
        )
        : this.store._validateRender(this.rootId, this.version, this.rootEpoch));
  }

  /** Check the captured Store cut without invoking replaceable Store methods. */
  validatePreparedCanonical(): boolean {
    return !this.#committed && canonicalValidateRenderStamp.call(
      this.#capturedStore, this.#capturedRootId,
      this.#capturedVersion, this.#capturedRootEpoch,
    );
  }

  validatePublicationInputs(): boolean {
    return !this.#committed &&
      (!this.closedNumeric ||
        canonicalClosedNumericStore.call(this.store)) &&
      (this.closedNumeric
        ? canonicalValidateRenderLineage.call(
          this.store,
          this.rootId,
          this.version,
          this.rootEpoch,
        )
        : this.store._validateRenderLineage(
          this.rootId,
          this.version,
          this.rootEpoch,
        ));
  }
  validatePublicationInputsCanonical(): boolean {
    return !this.#committed &&
      canonicalValidateRenderLineage.call(
        this.#capturedStore, this.#capturedRootId,
        this.#capturedVersion, this.#capturedRootEpoch,
      );
  }

  /** Call after host commit. Repeated calls are harmless. */
  commit(): void {
    if (this.#committed) return;
    if (!this.validate()) {
      throw new Error(
        `Store snapshot for root ${this.rootId} is stale; rebuild before commit`,
      );
    }
    this.commitAfterValidatedRender();
  }

  /** Publish selector history after a renderer's pre-host-commit validation. */
  commitAfterValidatedRender(): void {
    if (this.#committed) return;
    this.store._commitReaderValues(
      this.rootId, this.#pending, canonicalSnapshotRootStamp.call(this),
    );
    this.#committed = true;
  }
}

/** A derived store. Its previous value belongs to the read site, not the node. */
export class StoreSelection<T> implements StoreSource<T> {
  constructor(
    private readonly sources: readonly StoreSource<unknown>[],
    private readonly selector: (
      states: readonly unknown[],
      previous: T | undefined,
    ) => T,
  ) {
    this.sources = Object.freeze([...sources]);
  }

  /** Immutable declared dependencies used to pin a complete root read set. */
  get dependencies(): readonly StoreSource<unknown>[] {
    return this.sources;
  }

  read(session: StoreReadSession): T {
    const states = this.sources.map((source) => source.read(session));
    const previous = session.previous.get(this) as T | undefined;
    const value = this.selector(states, previous);
    session.next.set(this, value);
    return value;
  }

  select<U>(selector: (value: T, previous: U | undefined) => U) {
    return createStoreSelector<U>(
      [this],
      ([value], previous) => selector(value as T, previous),
    );
  }
}

/** A derived read over one or more stores; previous values remain per reader. */
export function createStoreSelector<T>(
  sources: readonly StoreSource<unknown>[],
  selector: (states: readonly unknown[], previous: T | undefined) => T,
): StoreSelection<T> {
  if (sources.length === 0) {
    throw new Error("A store selection requires at least one source");
  }
  return new StoreSelection(sources, selector);
}

/**
 * An action-log store. Roots are explicit so a transition can hold the roots
 * that are still showing their previous state while other roots catch up.
 */
export class AsyncStore<S, A = StoreAction<S, S>> implements StoreSource<S> {
  #baseState: S;
  #headState: S;
  #version = 0;
  #mutationEpoch = 0;
  #rootVersions = new Map<string, number>();
  #rootEpochs = new Map<string, object>();
  #knownRoots = new Set<string>();
  #entries: StoreEntry<S, A>[] = [];
  #transitions = new Map<string, TransitionRecord>();
  #roots = new Map<string, Set<(change: StoreChange) => void>>();
  #readerValues = new Map<string, Map<string, AcceptedReaderHistory>>();
  #notificationQueue: StoreNotificationBatch[] = [];
  #notifying = false;

  constructor(
    initialState: S,
    private readonly reducer: (state: S, action: A) => S =
      ((state, action) =>
        typeof action === "function"
          ? (action as unknown as (previous: S) => S)(state)
          : action as unknown as S),
  ) {
    this.#baseState = initialState;
    this.#headState = initialState;
  }

  /** Latest chronological value, including transition updates not yet shown. */
  getState(): S {
    return this.#headState;
  }

  get version(): number {
    return this.#version;
  }

  /** Internal transaction clock; only participating stores constrain a read cut. */
  get mutationEpoch(): number {
    return this.#mutationEpoch;
  }

  /** Version of the state this root can currently observe. */
  getRootVersion(rootId: string): number {
    return this.#rootVersions.get(rootId) ?? 0;
  }

  /** Capture one immutable store projection for a root render. */
  beginRender(
    rootId: string,
    options: StoreReadOptions = {},
  ): StoreRenderSnapshot<S, A> {
    this.#knownRoots.add(rootId);
    let rootEpoch = this.#rootEpochs.get(rootId);
    if (!rootEpoch) this.#rootEpochs.set(rootId, rootEpoch = {});
    return new StoreRenderSnapshot(
      this,
      rootId,
      options,
      this.getStateForRoot(rootId, options),
      this.getRootVersion(rootId),
      rootEpoch,
    );
  }

  /** Capture canonical Store state and selected values before registering a root. */
  _beginClosedProjectionRender(
    rootId: string,
    paths: readonly (readonly string[])[],
  ): { snapshot: StoreRenderSnapshot<S, A>; values: readonly number[] } | null {
    try {
      if (!canonicalClosedNumericStore.call(this)) {
        return null;
      }
      const captured = this.#closedProjectionState(rootId);
      if (!captured) return null;
      const values = isOwnedClosedProjectionPaths(paths)
        ? captureOwnedClosedProjectionValues(captured.state, paths)
        : captureClosedProjectionValues(captured.state, paths);
      if (!values || !canonicalClosedNumericStore.call(this)) return null;
      this.#knownRoots.add(rootId);
      const rootEpoch = captured.rootEpoch ?? {};
      if (!captured.rootEpoch) this.#rootEpochs.set(rootId, rootEpoch);
      return { snapshot: new StoreRenderSnapshot(
        this, rootId, {}, captured.state, captured.version, rootEpoch, true,
      ), values };
    } catch (error) {
      if (error instanceof TypeError) return null;
      throw error;
    }
  }

  #closedProjectionState(rootId: string): {
    state: S; version: number; rootEpoch: object | undefined;
  } | null {
    let state = this.#baseState;
    for (const entry of this.#entries) {
      const transitionId = entry.priority.kind === "transition"
        ? entry.priority.transitionId : null;
      const pending = entry.pendingRoots.has(rootId) &&
        !entry.committedRoots.has(rootId);
      const open = transitionId !== null &&
        this.#transitions.get(transitionId)?.open === true;
      if (transitionId !== null && (pending || open)) return null;
      state = entry.state;
    }
    return {
      state,
      version: this.#rootVersions.get(rootId) ?? 0,
      rootEpoch: this.#rootEpochs.get(rootId),
    };
  }

  _isOwnedBatchInstanceCanonical(key: symbol): boolean {
    if (key !== ownedBatchKey) return false;
    try {
      this.#entries;
      if (Object.getPrototypeOf(this) !== AsyncStore.prototype) return false;
      for (const name of closedNumericPrototypeKeys) {
        if (typeof name === "string" && name !== "constructor" && Object.hasOwn(this, name)) return false;
      }
      return !Object.hasOwn(this, storeDependencies);
    } catch (error) {
      if (error instanceof TypeError) return false;
      throw error;
    }
  }

  _captureOwnedBatchState(key: symbol, rootId: string): {
    state: S; version: number; rootEpoch: object | undefined; mutationEpoch: number;
  } | null {
    if (key !== ownedBatchKey) return null;
    this.#entries;
    const captured = this.#closedProjectionState(rootId);
    return captured && { ...captured, mutationEpoch: this.#mutationEpoch };
  }

  _pinOwnedBatchRoot(key: symbol, rootId: string, rootEpoch: object): void {
    if (key !== ownedBatchKey) return;
    this.#entries;
    this.#knownRoots.add(rootId);
    if (!this.#rootEpochs.has(rootId)) this.#rootEpochs.set(rootId, rootEpoch);
  }

  /** Legacy direct numeric capture uses the same canonical projection path. */
  _beginClosedNumericRender(rootId: string): StoreRenderSnapshot<S, A> | null {
    return canonicalBeginClosedProjectionRender.call(this, rootId, closedDirectProjectionPaths)?.snapshot ?? null;
  }

  _isClosedNumericCanonical(): boolean {
    try {
      this.#entries;
      return closedNumericPrototypeIsCanonical() &&
        canonicalOwnedBatchInstance.call(this, ownedBatchKey);
    } catch (error) {
      if (error instanceof TypeError) return false;
      throw error;
    }
  }

  select<T>(selector: (state: S, previous: T | undefined) => T) {
    return createStoreSelector<T>(
      [this],
      ([state], previous) => selector(state as S, previous),
    );
  }

  /** Register roots that may hold a transition update while it is pending. */
  beginTransition(transitionId: string, rootIds: readonly string[]): void {
    if (transitionId.length === 0) {
      throw new Error("Transition ID must not be empty");
    }
    if (this.#transitions.has(transitionId)) {
      throw new Error(`Transition already exists: ${transitionId}`);
    }
    this.#transitions.set(transitionId, {
      roots: new Set(rootIds),
      completedRoots: new Set(),
      open: true,
    });
    for (const rootId of rootIds) this.#knownRoots.add(rootId);
  }

  hasTransition(transitionId: string): boolean {
    return this.#transitions.has(transitionId);
  }

  transitionRoots(transitionId: string): readonly string[] {
    const transition = this.#transitions.get(transitionId);
    if (!transition) throw new Error(`Unknown transition: ${transitionId}`);
    return [...transition.roots];
  }

  /**
   * Dispatch in chronological order. A transition dispatch joins its explicit
   * transaction; it is not inferred from ambient async context.
   */
  dispatch(action: A, priority: StorePriority = { kind: "urgent" }): boolean {
    const pendingRoots = new Set<string>();
    if (priority.kind === "transition") {
      const transition = this.#transitions.get(priority.transitionId);
      if (!transition) {
        throw new Error(`Unknown transition: ${priority.transitionId}`);
      }
      if (!transition.open) {
        throw new Error(
          `Transition is already finished: ${priority.transitionId}`,
        );
      }
      for (const rootId of transition.roots) pendingRoots.add(rootId);
    }

    const next = this.reducer(this.#headState, action);
    if (Object.is(next, this.#headState)) {
      // With no retained actions every root shares the chronological head.
      if (this.#entries.length === 0) return false;
      // The chronological head may include a transition that one or more
      // roots still hide. An urgent action can therefore be a no-op at the
      // head while still changing a root's visible projection. Keep that
      // action in the log so getStateForRoot can replay it after the skipped
      // transition; only discard it when every known root also sees a no-op.
      const projectionRoots = new Set(this.#knownRoots);
      // A root can attach while work is pending. Include a representative
      // projection for a fresh root so dropping an action cannot make that
      // later root miss an update it would otherwise observe.
      const newRootProbe = this.#newProjectionProbeId();
      projectionRoots.add(newRootProbe);
      const candidates = [...projectionRoots].map((rootId) => ({
        rootId,
        options: priority.kind === "urgent"
          ? {}
          : { transitions: [priority.transitionId] },
      }));
      const changesProjection = candidates.some(({ rootId, options }) => {
        const state = this.getStateForRoot(rootId, options);
        return !Object.is(this.reducer(state, action), state);
      });
      if (!changesProjection) return false;
    }

    this.#mutationEpoch = ++storeMutationClock;
    this.#version++;
    this.#headState = next;
    this.#entries.push({
      action,
      state: next,
      version: this.#version,
      priority,
      pendingRoots,
      committedRoots: new Set(),
    });

    const affectedRoots = priority.kind === "urgent"
      ? this.#knownRoots
      : pendingRoots;
    for (const rootId of affectedRoots) this.#bumpRootVersion(rootId);

    if (priority.kind === "urgent") {
      this.#notifyAll(priority);
    } else {
      // Candidate readers can opt into the transition ID. Ordinary readers of
      // its pending roots keep the old state until the transition commits.
      this.#enqueueNotifications([...pendingRoots], priority);
    }
    this.#compact();
    return true;
  }

  /** Mark the async action scope closed; non-participating roots may catch up. */
  finishTransition(transitionId: string): void {
    const transition = this.#transitions.get(transitionId);
    if (!transition) return;
    if (!transition.open) return;
    this.#mutationEpoch = ++storeMutationClock;
    transition.open = false;
    const changedRoots: string[] = [];
    for (const rootId of this.#knownRoots) {
      if (!transition.roots.has(rootId)) {
        this.#bumpRootVersion(rootId);
        changedRoots.push(rootId);
      }
    }
    this.#enqueueNotifications(changedRoots, {
      kind: "transition",
      transitionId,
    });
    this.#compact();
  }

  /**
   * Publish this transition's actions to one root after that root commits its
   * prepared UI. Call for each root in a coordinated host commit when needed.
   */
  commitTransition(transitionId: string, rootId: string): void {
    this.commitTransitionRoots(transitionId, [rootId]);
  }

  /**
   * Publish one transition to a coordinated root set. All projection/version
   * mutations happen before the first subscriber is notified, so observers
   * cannot see a partially committed group through this store.
   */
  commitTransitionRoots(
    transitionId: string,
    rootIds: readonly string[],
    options: { finish?: boolean } = {},
  ): void {
    const transition = this.#transitions.get(transitionId);
    if (!transition) throw new Error(`Unknown transition: ${transitionId}`);
    const uniqueRoots = new Set(rootIds);
    if (uniqueRoots.size !== rootIds.length) {
      throw new Error("A transition commit cannot contain duplicate roots");
    }
    for (const rootId of uniqueRoots) {
      if (!transition.roots.has(rootId)) {
        throw new Error(
          `Root ${rootId} is not part of transition ${transitionId}`,
        );
      }
    }

    this.#mutationEpoch = ++storeMutationClock;
    if (options.finish) transition.open = false;

    for (const entry of this.#entries) {
      if (
        entry.priority.kind === "transition" &&
        entry.priority.transitionId === transitionId
      ) {
        for (const rootId of uniqueRoots) entry.committedRoots.add(rootId);
      }
    }
    for (const rootId of uniqueRoots) {
      transition.completedRoots.add(rootId);
    }

    const changedRoots = new Set(uniqueRoots);
    if (options.finish) {
      for (const rootId of this.#knownRoots) {
        if (!transition.roots.has(rootId)) changedRoots.add(rootId);
      }
    }
    for (const rootId of changedRoots) this.#bumpRootVersion(rootId);

    this.#enqueueNotifications([...changedRoots], {
      kind: "transition",
      transitionId,
    });
    this.#compact();
  }

  /**
   * Release a root whose candidate was abandoned; its queued actions remain.
   * Releasing a nonparticipant in a known scope is a no-op. Unknown scope IDs
   * still indicate a protocol error.
   */
  releaseTransition(transitionId: string, rootId: string): void {
    const transition = this.#transitions.get(transitionId);
    if (!transition) throw new Error(`Unknown transition: ${transitionId}`);
    if (!transition.roots.has(rootId)) return;
    this.#mutationEpoch = ++storeMutationClock;
    transition.roots.delete(rootId);
    transition.completedRoots.add(rootId);
    this.#bumpRootVersion(rootId);
    for (const entry of this.#entries) {
      if (
        entry.priority.kind === "transition" &&
        entry.priority.transitionId === transitionId
      ) {
        entry.pendingRoots.delete(rootId);
      }
    }
    this.#notify(rootId, { kind: "transition", transitionId });
    this.#compact();
  }

  /**
   * Detach a root and release all store-owned state associated with it.
   * Snapshots captured before detachment become stale, and a later root using
   * the same ID starts from the current store projection. Detaching the last
   * participant releases its root hold but does not finish the async action
   * scope; its owner must still call finishTransition explicitly.
   */
  detachRoot(rootId: string): void {
    const wasKnown = this.#knownRoots.delete(rootId);
    const hadListeners = this.#roots.delete(rootId);
    const hadReaders = this.#readerValues.delete(rootId);

    for (const [transitionId, transition] of this.#transitions) {
      if (transition.roots.delete(rootId)) {
        transition.completedRoots.add(rootId);
      }
      for (const entry of this.#entries) {
        if (
          entry.priority.kind === "transition" &&
          entry.priority.transitionId === transitionId
        ) {
          entry.pendingRoots.delete(rootId);
          entry.committedRoots.delete(rootId);
        }
      }
    }

    if (wasKnown || hadListeners || hadReaders) this.#bumpRootVersion(rootId);
    this.#knownRoots.delete(rootId);
    this.#rootVersions.delete(rootId);
    this.#rootEpochs.delete(rootId);
    this.#compact();
  }

  /**
   * Project the log for a root. `options.transitions` is the candidate lane
   * being rendered; without it, unresolved transitions remain hidden from
   * roots that are still waiting on them.
   */
  getStateForRoot(rootId: string, options: StoreReadOptions = {}): S {
    const included = new Set(options.transitions ?? []);
    let state = this.#baseState;
    let hasSkippedAction = false;

    for (const entry of this.#entries) {
      const transitionId = entry.priority.kind === "transition"
        ? entry.priority.transitionId
        : null;
      const isPendingForRoot = entry.pendingRoots.has(rootId) &&
        !entry.committedRoots.has(rootId);
      const scopeOpen = transitionId !== null &&
        this.#transitions.get(transitionId)?.open === true;
      const visible = transitionId === null ||
        included.has(transitionId) ||
        (!isPendingForRoot && !scopeOpen);

      if (!visible) {
        hasSkippedAction = true;
        continue;
      }

      // Once an earlier action is skipped, later cached head states include
      // that missing action. Replay the reducer over this root's own projection.
      state = hasSkippedAction
        ? this.reducer(state, entry.action)
        : entry.state;
    }
    return state;
  }

  /** Read a store/selection with read-site-local previous selection values. */
  read<T>(
    source: StoreSource<T>,
    rootId: string,
    readerId: string,
    options?: StoreReadOptions,
  ): StoreRead<T>;
  /** A store itself is also a source for a chained selection. */
  read(session: StoreReadSession): S;
  read<T>(
    sourceOrSession: StoreSource<T> | StoreReadSession,
    rootId?: string,
    readerId?: string,
    options: StoreReadOptions = {},
  ): StoreRead<T> | S {
    if (sourceOrSession instanceof StoreReadSession) {
      if (!sourceOrSession.snapshotStates.has(this)) {
        throw new Error(
          "Store was not included in this root render snapshot read set",
        );
      }
      return sourceOrSession.snapshotStates.get(this) as S;
    }
    const source = sourceOrSession;
    if (rootId === undefined || readerId === undefined) {
      throw new Error("A root ID and reader ID are required for a store read");
    }
    const snapshot = this.beginRender(rootId, options);
    const value = snapshot.read(source, readerId);
    return { value, commit: () => snapshot.commit() };
  }

  /** Internal reader used by a pinned render snapshot. */
  _readAtSnapshot<T>(
    source: StoreSource<T>,
    rootId: string,
    readerId: string,
    transitions: readonly string[],
    snapshotStates: ReadonlyMap<object, unknown>,
    pending: Map<string, PendingReaderValues>,
  ): T {
    const selections = this.#readerValues.get(rootId)?.get(readerId)?.selections;
    const previous = selections instanceof Map ? selections : new Map<object, unknown>();
    const session = new StoreReadSession(
      rootId,
      readerId,
      transitions,
      previous,
      snapshotStates,
    );
    const value = source.read(session);
    pending.set(readerId, Object.is(source, this) && session.next.size === 0
      ? directReaderCut : session.next);
    return value;
  }

  /** Read-only committed selection history, never mutated during preparation. */
  _readerValuesFor(
    rootId: string,
    readerId: string,
  ): ReadonlyMap<object, unknown> {
    const selections = this.#readerValues.get(rootId)?.get(readerId)?.selections;
    return selections instanceof Map ? selections : new Map();
  }

  _captureCanonicalReaderReceipt(
    rootId: string,
    readerId: string,
  ): AcceptedStoreReaderReceipt | null {
    if (!canonicalClosedNumericStore.call(this) ||
      !this.#knownRoots.has(rootId)) return null;
    const history = this.#readerValues.get(rootId)?.get(readerId);
    const stamp = history?.stamp;
    if (!history || !stamp ||
      this.#rootEpochs.get(rootId) !== stamp.rootEpoch ||
      (this.#rootVersions.get(rootId) ?? 0) < stamp.version) return null;
    return Object.freeze({
      history, version: stamp.version, rootEpoch: stamp.rootEpoch,
    });
  }

  _inspectCanonicalReaderReceipt(
    rootId: string,
    readerId: string,
    receipt: AcceptedStoreReaderReceipt,
  ): "current" | "retained" | null {
    const history = this.#readerValues.get(rootId)?.get(readerId);
    if (!canonicalClosedNumericStore.call(this) ||
      !this.#knownRoots.has(rootId) ||
      history !== receipt.history ||
      history?.stamp?.version !== receipt.version ||
      history?.stamp?.rootEpoch !== receipt.rootEpoch ||
      this.#rootEpochs.get(rootId) !== receipt.rootEpoch) return null;
    const version = this.#rootVersions.get(rootId) ?? 0;
    if (version < receipt.version) return null;
    return version === receipt.version ? "current" : "retained";
  }

  diagnostics() {
    return Object.freeze({
      roots: this.#knownRoots.size,
      listeners: [...this.#roots.values()].reduce(
        (count, values) => count + values.size,
        0,
      ),
      readers: [...this.#readerValues.values()].reduce(
        (count, values) => count + [...values.values()].filter(
          (history) => history.selections !== null,
        ).length,
        0,
      ),
      retainedActions: this.#entries.length,
      transitions: this.#transitions.size,
    });
  }

  _commitReaderValues(
    rootId: string,
    pending: Map<string, PendingReaderValues>,
    stamp?: StoreRootStamp,
  ) {
    if (this._prepareReaderValues !== canonicalPrepareReaderValues) {
      this._prepareReaderValues(rootId, pending);
    }
    this._publishPreparedReaderValues(
      rootId,
      canonicalPrepareReaderValues.call(this, rootId, pending, stamp),
    );
  }

  _prepareReaderValues(
    rootId: string,
    pending: ReadonlyMap<string, PendingReaderValues>,
    stamp?: StoreRootStamp,
  ): PreparedReaderValues {
    if (!this.#knownRoots.has(rootId)) {
      throw new Error(`Store reader root is no longer live: ${rootId}`);
    }
    const prepared = new Map<string, AcceptedReaderHistory | null>();
    const existing = this.#readerValues.get(rootId);
    for (const [readerId, values] of pending) {
      if (values === null) {
        prepared.set(readerId, null);
      } else if (values === capturedReaderCut) {
        const accepted = existing?.get(readerId);
        prepared.set(readerId, accepted?.selections ? accepted : Object.freeze({
          selections: null, stamp: stamp ?? null,
        }));
      } else if (values === directReaderCut) {
        prepared.set(readerId, Object.freeze({
          selections: directReaderCut, stamp: stamp ?? null,
        }));
      } else {
        prepared.set(readerId, Object.freeze({
          selections: new Map(values), stamp: stamp ?? null,
        }));
      }
    }
    return {
      rootReaders: existing ?? new Map(),
      isNewRoot: existing === undefined,
      entries: prepared,
    };
  }

  _publishPreparedReaderValues(
    rootId: string,
    prepared: PreparedReaderValues,
  ): void {
    if (prepared.isNewRoot) {
      this.#readerValues.set(rootId, prepared.rootReaders);
    }
    for (const [readerId, values] of prepared.entries) {
      if (values === null) canonicalMapDelete.call(prepared.rootReaders, readerId);
      else canonicalMapSet.call(prepared.rootReaders, readerId, values);
    }
  }

  _validateRender(rootId: string, version: number, rootEpoch: object): boolean {
    return this.#knownRoots.has(rootId) &&
      this.#rootEpochs.get(rootId) === rootEpoch &&
      this.getRootVersion(rootId) === version;
  }

  _validateRenderStampCanonical(
    rootId: string, version: number, rootEpoch: object,
  ): boolean {
    return this.#knownRoots.has(rootId) &&
      this.#rootEpochs.get(rootId) === rootEpoch &&
      (this.#rootVersions.get(rootId) ?? 0) === version;
  }

  _validateRenderLineage(
    rootId: string,
    version: number,
    rootEpoch: object,
  ): boolean {
    return this.#knownRoots.has(rootId) &&
      this.#rootEpochs.get(rootId) === rootEpoch &&
      (this.#rootVersions.get(rootId) ?? 0) >= version;
  }

  #bumpRootVersion(rootId: string) {
    this.#mutationEpoch = ++storeMutationClock;
    this.#knownRoots.add(rootId);
    this.#rootVersions.set(rootId, this.getRootVersion(rootId) + 1);
  }

  #newProjectionProbeId(): string {
    let rootId = "\0async-store-projection-probe";
    while (
      this.#knownRoots.has(rootId) ||
      this.#entries.some((entry) => entry.pendingRoots.has(rootId))
    ) {
      rootId += "\0";
    }
    return rootId;
  }

  /** Drop read-site selector history when its owning component is removed. */
  forgetReader(rootId: string, readerId: string): void {
    const readers = this.#readerValues.get(rootId);
    readers?.delete(readerId);
    if (readers?.size === 0) this.#readerValues.delete(rootId);
  }

  subscribe(
    rootId: string,
    listener: (change: StoreChange) => void,
  ): () => void {
    this.#knownRoots.add(rootId);
    let listeners = this.#roots.get(rootId);
    if (!listeners) this.#roots.set(rootId, listeners = new Set());
    listeners.add(listener);
    return () => {
      listeners!.delete(listener);
      if (listeners!.size === 0) this.#roots.delete(rootId);
      this.#compact();
    };
  }

  #notifyAll(priority: StorePriority) {
    this.#enqueueNotifications([...this.#roots.keys()], priority);
  }

  #notify(rootId: string, priority: StorePriority) {
    this.#enqueueNotifications([rootId], priority);
  }

  /** Queue reentrant dispatch notifications until the current listener batch finishes. */
  #enqueueNotifications(rootIds: readonly string[], priority: StorePriority) {
    if (rootIds.length === 0) return;
    if (this.#notifying) {
      const deferred = this.#notificationQueue.at(-1) ?? new Map();
      if (this.#notificationQueue.length === 0) {
        this.#notificationQueue.push(deferred);
      }
      for (const rootId of rootIds) deferred.set(rootId, priority);
      scheduleStoreNotifications(this as AsyncStore<unknown, unknown>);
      return;
    }

    const batch: StoreNotificationBatch = new Map();
    for (const rootId of rootIds) batch.set(rootId, priority);
    this.#notificationQueue.push(batch);
    scheduleStoreNotifications(this as AsyncStore<unknown, unknown>);
  }

  /** Internal notification drain used by the cross-store publication queue. */
  _drainNotifications() {
    if (this.#notifying) return;
    this.#notifying = true;
    const errors: unknown[] = [];
    try {
      while (this.#notificationQueue.length > 0) {
        const batch = this.#notificationQueue.shift()!;
        // Capture every root projection before invoking user code. A listener
        // that dispatches synchronously queues a later batch, so all listeners
        // in this batch observe the same publication boundary.
        const deliveries = [...batch].map(([rootId, priority]) => ({
          listeners: [...(this.#roots.get(rootId) ?? [])],
          change: {
            rootId,
            storeVersion: this.#version,
            state: this.getStateForRoot(rootId),
            priority,
          } satisfies StoreChange,
        }));
        for (const { listeners, change } of deliveries) {
          for (const listener of listeners) {
            try {
              listener(change);
            } catch (error) {
              errors.push(error);
            }
          }
        }
      }
    } finally {
      // A throwing listener must not permanently disable later notifications.
      this.#notifying = false;
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, "Store notification listeners failed");
    }
  }

  #compact() {
    let count = 0;
    while (count < this.#entries.length) {
      const entry = this.#entries[count];
      const transitionId = entry.priority.kind === "transition"
        ? entry.priority.transitionId
        : null;
      if (transitionId === null) {
        // Urgent entries are immediately visible to every root.
        this.#baseState = entry.state;
        count++;
        continue;
      }
      const transition = this.#transitions.get(transitionId);
      if (!transition || transition.open) break;
      let committedEverywhere = true;
      for (const rootId of entry.pendingRoots) {
        if (!entry.committedRoots.has(rootId)) {
          committedEverywhere = false;
          break;
        }
      }
      if (!committedEverywhere) break;
      this.#baseState = entry.state;
      count++;
    }
    if (count > 0) this.#entries.splice(0, count);

    for (const [id, transition] of this.#transitions) {
      if (transition.open) continue;
      const retained = this.#entries.some((entry) =>
        entry.priority.kind === "transition" &&
        entry.priority.transitionId === id
      );
      const allRootsCompleted = [...transition.roots].every((rootId) =>
        transition.completedRoots.has(rootId)
      );
      if (!retained && allRootsCompleted) this.#transitions.delete(id);
    }
  }
}

const closedNumericPrototypeKeys = Reflect.ownKeys(AsyncStore.prototype);
const closedNumericPrototypeDescriptors = new Map(
  closedNumericPrototypeKeys.map((key) => [
    key,
    Object.getOwnPropertyDescriptor(AsyncStore.prototype, key)!,
  ]),
);
const canonicalClosedNumericStore = AsyncStore.prototype._isClosedNumericCanonical;
const canonicalOwnedBatchInstance = AsyncStore.prototype._isOwnedBatchInstanceCanonical;
const canonicalCaptureOwnedBatchState = AsyncStore.prototype._captureOwnedBatchState;
const canonicalPinOwnedBatchRoot = AsyncStore.prototype._pinOwnedBatchRoot;
function closedNumericPrototypeIsCanonical(): boolean {
  if (Reflect.ownKeys(AsyncStore.prototype).length !== closedNumericPrototypeKeys.length) return false;
  for (const key of closedNumericPrototypeKeys) {
    const expected = closedNumericPrototypeDescriptors.get(key);
    const actual = Object.getOwnPropertyDescriptor(AsyncStore.prototype, key);
    if (!expected || !actual || expected.value !== actual.value ||
      expected.get !== actual.get || expected.set !== actual.set ||
      expected.writable !== actual.writable ||
      expected.enumerable !== actual.enumerable ||
      expected.configurable !== actual.configurable) return false;
  }
  return true;
}
const canonicalBeginClosedProjectionRender = AsyncStore.prototype._beginClosedProjectionRender;
const canonicalValidateRender = AsyncStore.prototype._validateRender;
const canonicalValidateRenderStamp = AsyncStore.prototype._validateRenderStampCanonical;
const canonicalValidateRenderLineage = AsyncStore.prototype._validateRenderLineage;
const canonicalPrepareReaderValues = AsyncStore.prototype._prepareReaderValues;
const canonicalPublishReaderValues = AsyncStore.prototype._publishPreparedReaderValues;
const canonicalCaptureReaderReceipt = AsyncStore.prototype._captureCanonicalReaderReceipt;
const canonicalInspectReaderReceipt = AsyncStore.prototype._inspectCanonicalReaderReceipt;
const canonicalSnapshotRootStamp = StoreRenderSnapshot.prototype.capturedRootStamp;
const canonicalValidateSnapshotPrepared = StoreRenderSnapshot.prototype.validatePreparedCanonical;
const canonicalValidateSnapshotLineage = StoreRenderSnapshot.prototype.validatePublicationInputsCanonical;
const canonicalIsOwnedPhaseSnapshot = StoreRenderSnapshot._isOwnedPhaseSnapshot;
const snapshotPhaseMethodNames = Object.freeze([
  "validate", "validatePublicationInputs", "validatePreparedCanonical",
  "validatePublicationInputsCanonical",
] as const);
const snapshotPhaseDescriptors = new Map(snapshotPhaseMethodNames.map((name) => [
  name, Object.getOwnPropertyDescriptor(StoreRenderSnapshot.prototype, name)!,
]));

function phaseMethodsCanonical(
  receiver: object,
  prototype: object,
  names: readonly string[],
  expected: ReadonlyMap<string, PropertyDescriptor>,
): boolean {
  for (const name of names) {
    if (Object.hasOwn(receiver, name)) return false;
    const actual = Object.getOwnPropertyDescriptor(prototype, name);
    const original = expected.get(name);
    if (!actual || !original || actual.value !== original.value ||
      actual.get !== original.get || actual.set !== original.set ||
      actual.writable !== original.writable ||
      actual.enumerable !== original.enumerable ||
      actual.configurable !== original.configurable) return false;
  }
  return true;
}

function snapshotPhaseMethodsCanonical(snapshot: object): boolean {
  return phaseMethodsCanonical(snapshot, StoreRenderSnapshot.prototype,
    snapshotPhaseMethodNames, snapshotPhaseDescriptors);
}


export function captureCanonicalStoreReaderReceipt(
  store: AnyAsyncStore,
  rootId: string,
  readerId: string,
): AcceptedStoreReaderReceipt | null {
  try {
    return canonicalCaptureReaderReceipt.call(store, rootId, readerId);
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}

export function inspectCanonicalStoreReaderReceipt(
  store: AnyAsyncStore,
  rootId: string,
  readerId: string,
  receipt: AcceptedStoreReaderReceipt,
): "current" | "retained" | null {
  try {
    return canonicalInspectReaderReceipt.call(store, rootId, readerId, receipt);
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}

export function createAsyncStore<S>(initialState: S): AsyncStore<S>;
export function createAsyncStore<S, A>(
  initialState: S,
  reducer: (state: S, action: A) => S,
): AsyncStore<S, A>;
export function createAsyncStore<S, A>(
  initialState: S,
  reducer?: (state: S, action: A) => S,
): AsyncStore<S, A> {
  return new AsyncStore(initialState, reducer);
}

/** Erased store participant type used only by root transaction machinery. */
export type AnyAsyncStore = AsyncStore<any, any>;

export type OwnedClosedProjectionRequest = Readonly<{
  store: AnyAsyncStore;
  readerId: string;
  paths: readonly (readonly string[])[];
}>;

/** Opaque savepoint owned by the transaction that created it. */
declare const storeRenderCheckpointBrand: unique symbol;
export type StoreRenderCheckpoint = {
  readonly [storeRenderCheckpointBrand]: never;
};

export type StoreRenderObservation = Readonly<{
  source: StoreSource<unknown>;
  value: unknown;
}>;

const closedDirectProjectionPaths = Object.freeze([Object.freeze([] as string[])]);

type CheckpointState = {
  cursor: number;
  changeCursor: number;
  sequence: number;
  active: boolean;
  previous?: CheckpointState;
  next?: CheckpointState;
};

/** Discover the full dependency set before evaluating any selector callback. */
export function storesForSource(
  source: StoreSource<unknown>,
): readonly AnyAsyncStore[] {
  const stores = new Set<AnyAsyncStore>();
  const visiting = new Set<object>();
  const complete = new Set<object>();
  const visit = (current: StoreSource<unknown>) => {
    if (current instanceof AsyncStore) {
      stores.add(current);
      return;
    }
    const dependencies = current instanceof StoreSelection
      ? current.dependencies
      : current[storeDependencies];
    if (!Array.isArray(dependencies)) {
      throw new Error(
        "Native store reads require an AsyncStore, declared StoreSelection or storeDependencies graph",
      );
    }
    if (visiting.has(current)) {
      throw new Error("Store selection dependency cycle");
    }
    if (complete.has(current)) return;
    visiting.add(current);
    for (const dependency of dependencies) visit(dependency);
    visiting.delete(current);
    complete.add(current);
  };
  visit(source);
  return Object.freeze([...stores]);
}

/**
 * Root-wide candidate transaction. Dependencies discovered later in traversal
 * join the read set before their selectors run; every earlier projection is
 * validated again before any host mutation. Preparation never publishes history.
 */
export class StoreRenderTransaction {
  readonly #capturedRootId: string;
  readonly #capturedOptions: StoreReadOptions;
  readonly #capturedTransitions: readonly string[];
  #snapshots = new Map<AnyAsyncStore, StoreRenderSnapshot<any, any>>();
  #states = new Map<object, unknown>();
  #readers = new Map<string, ReadonlySet<AnyAsyncStore>>();
  #pending = new Map<AnyAsyncStore, Map<string, PendingReaderValues>>();
  #ownedProjectionValues = new Map<StoreRenderSnapshot<any, any>, Map<readonly (readonly string[])[], readonly number[]>>();
  #values = new Map<string, { source: StoreSource<unknown>; value: unknown }>();
  #closed = false;
  #preparedPublication?: Map<
    AnyAsyncStore,
    PreparedReaderValues
  >;
  #journal: Array<() => void> = [];
  #branchChanges: string[] = [];
  #checkpointState = new WeakMap<object, CheckpointState>();
  #checkpointHead?: CheckpointState;
  #checkpointTail?: CheckpointState;
  #checkpointSequence = 0;
  #startedEpoch = storeMutationClock;
  #discoveredAfterMutation = false;

  _validateCanonicalClosedPhase(
    key: symbol, phase: "prepared" | "after-host",
  ): "current" | "stale" | "public-required" {
    if (typeof this !== "object" || this === null || !(#snapshots in this)) {
      return "public-required";
    }
    if (key !== ownedBatchKey || (phase !== "prepared" && phase !== "after-host")) {
      return "public-required";
    }
    if (Object.getPrototypeOf(this) !== StoreRenderTransaction.prototype ||
      !transactionPhaseMethodsCanonical(this)) return "public-required";
    const root = Object.getOwnPropertyDescriptor(this, "rootId");
    const options = Object.getOwnPropertyDescriptor(this, "options");
    const transitions = Object.getOwnPropertyDescriptor(this.#capturedOptions, "transitions");
    if (!root || !("value" in root) || root.value !== this.#capturedRootId ||
      !options || !("value" in options) || options.value !== this.#capturedOptions ||
      !transitions || !("value" in transitions) ||
      transitions.value !== this.#capturedTransitions) return "public-required";
    if (this.#closed || this.#discoveredAfterMutation) return "stale";
    if (this.#snapshots.size === 0 ||
      this.#ownedProjectionValues.size !== this.#snapshots.size ||
      this.#capturedTransitions.length !== 0) return "public-required";
    if (!closedNumericPrototypeIsCanonical()) return "public-required";
    for (const [store, snapshot] of this.#snapshots) {
      if (!this.#ownedProjectionValues.has(snapshot) ||
        !canonicalIsOwnedPhaseSnapshot.call(
          StoreRenderSnapshot, snapshot, store, this.#capturedRootId,
        ) ||
        !canonicalOwnedBatchInstance.call(store, ownedBatchKey)) return "public-required";
    }
    for (const snapshot of this.#snapshots.values()) {
      const current = phase === "prepared"
        ? canonicalValidateSnapshotPrepared.call(snapshot)
        : canonicalValidateSnapshotLineage.call(snapshot);
      if (!current) return "stale";
    }
    return "current";
  }
  constructor(
    readonly rootId: string,
    private readonly options: StoreReadOptions = {},
  ) {
    if (!rootId) throw new Error("A store transaction requires a root ID");
    this.options = {
      transitions: Object.freeze([...(options.transitions ?? [])]),
    };
    this.#capturedRootId = rootId;
    this.#capturedOptions = this.options;
    this.#capturedTransitions = this.options.transitions!;
  }

  _readOwnedClosedProjectionBatch(
    key: symbol,
    requests: readonly OwnedClosedProjectionRequest[],
  ): readonly (readonly number[])[] | null {
    if (typeof this !== "object" || this === null || !(#snapshots in this)) return null;
    if (key !== ownedBatchKey || this.#closed || this.#preparedPublication ||
      this.#snapshots.size || this.#states.size || this.#readers.size ||
      this.#pending.size || this.#values.size || this.#discoveredAfterMutation ||
      this.#capturedTransitions.length !== 0) return null;
    if (Object.getPrototypeOf(this) !== StoreRenderTransaction.prototype ||
      Object.hasOwn(this, "readClosedProjections")) return null;
    const publicRead = Object.getOwnPropertyDescriptor(
      StoreRenderTransaction.prototype, "readClosedProjections",
    );
    if (!publicRead || publicRead.value !== canonicalTransactionClosedRead.value ||
      publicRead.get !== canonicalTransactionClosedRead.get ||
      publicRead.set !== canonicalTransactionClosedRead.set ||
      publicRead.writable !== canonicalTransactionClosedRead.writable ||
      publicRead.enumerable !== canonicalTransactionClosedRead.enumerable ||
      publicRead.configurable !== canonicalTransactionClosedRead.configurable) return null;
    const root = Object.getOwnPropertyDescriptor(this, "rootId");
    const options = Object.getOwnPropertyDescriptor(this, "options");
    const transitions = Object.getOwnPropertyDescriptor(this.#capturedOptions, "transitions");
    if (!root || !("value" in root) || root.value !== this.#capturedRootId ||
      !options || !("value" in options) || options.value !== this.#capturedOptions ||
      !transitions || !("value" in transitions) ||
      transitions.value !== this.#capturedTransitions) return null;
    if (!closedNumericPrototypeIsCanonical()) return null;
    const stores = new Set<AnyAsyncStore>();
    const readerSources = new Map<string, AnyAsyncStore>();
    for (const request of requests) {
      if (!request.readerId || !isOwnedClosedProjectionPaths(request.paths)) return null;
      const prior = readerSources.get(request.readerId);
      if (prior && prior !== request.store) return null;
      readerSources.set(request.readerId, request.store);
      if (!stores.has(request.store)) {
        if (!canonicalOwnedBatchInstance.call(request.store, ownedBatchKey)) return null;
        stores.add(request.store);
      }
    }
    const captures = new Map<AnyAsyncStore, {
      state: unknown; version: number; rootEpoch: object | undefined; mutationEpoch: number;
    }>();
    for (const store of stores) {
      const capture = canonicalCaptureOwnedBatchState.call(store, ownedBatchKey, this.#capturedRootId);
      if (!capture) return null;
      captures.set(store, capture);
    }
    const projectionValues = new Map<AnyAsyncStore, Map<readonly (readonly string[])[], readonly number[]>>();
    const result: (readonly number[])[] = [];
    for (const request of requests) {
      let byPath = projectionValues.get(request.store);
      if (!byPath) projectionValues.set(request.store, byPath = new Map());
      let values = byPath.get(request.paths);
      if (!values) {
        values = captureOwnedClosedProjectionValues(captures.get(request.store)!.state, request.paths) ?? undefined;
        if (!values) return null;
        byPath.set(request.paths, values);
      }
      result.push(values);
    }
    const snapshots = new Map<AnyAsyncStore, StoreRenderSnapshot<any, any>>();
    for (const [store, capture] of captures) {
      const rootEpoch = capture.rootEpoch ?? {};
      canonicalPinOwnedBatchRoot.call(store, ownedBatchKey, this.#capturedRootId, rootEpoch);
      const snapshot = new StoreRenderSnapshot(
        store, this.#capturedRootId, {}, capture.state, capture.version, rootEpoch, true,
      );
      snapshots.set(store, snapshot);
      if (capture.mutationEpoch > this.#startedEpoch) this.#discoveredAfterMutation = true;
      this.#snapshots.set(store, snapshot);
      this.#states.set(store, snapshot.state);
      this.#ownedProjectionValues.set(snapshot, projectionValues.get(store)!);
    }
    for (let index = 0; index < requests.length; index++) {
      const { store, readerId } = requests[index];
      const snapshot = snapshots.get(store)!;
      const cached = this.#values.get(readerId);
      if (cached) {
        continue;
      }
      this.#setJournaled(this.#readers, readerId, new Set([store]));
      let pending = this.#pending.get(store);
      if (!pending) {
        pending = new Map();
        this.#setJournaled(this.#pending, store, pending);
      }
      this.#setJournaled(pending, readerId, directReaderCut);
      this.#setJournaled(this.#values, readerId, { source: store, value: snapshot.state });
      this.#recordBranchChange(readerId);
    }
    return Object.freeze(result);
  }
  get stores(): ReadonlySet<AnyAsyncStore> {
    return new Set(this.#snapshots.keys());
  }
  get readers(): ReadonlyMap<string, ReadonlySet<AnyAsyncStore>> {
    return new Map(this.#readers);
  }
  /** Current branch's successfully completed reader observations. */
  get observations(): ReadonlyMap<string, StoreRenderObservation> {
    return new Map(this.#values);
  }

  /** Detect a newer action or revoked closed Store capture after publication. */
  closedInputsChanged(): boolean {
    if (!this.#closed) return true;
    for (const snapshot of this.#snapshots.values()) {
      if (!snapshot.closedNumeric || !snapshot.validate()) return true;
    }
    return false;
  }

  /** Create an O(1) savepoint for branch-local reader state. */
  checkpoint(): StoreRenderCheckpoint {
    if (this.#closed || this.#preparedPublication) {
      throw new Error("Cannot checkpoint a closed store transaction");
    }
    const token = Object.freeze({}) as StoreRenderCheckpoint;
    const state: CheckpointState = {
      cursor: this.#journal.length,
      changeCursor: this.#branchChanges.length,
      sequence: ++this.#checkpointSequence,
      active: true,
      previous: this.#checkpointTail,
    };
    if (this.#checkpointTail) this.#checkpointTail.next = state;
    else this.#checkpointHead = state;
    this.#checkpointTail = state;
    this.#checkpointState.set(token as object, state);
    return token;
  }

  /** Undo reader staging and observations after a live savepoint. */
  rollbackTo(checkpoint: StoreRenderCheckpoint): void {
    if (this.#closed || this.#preparedPublication) {
      throw new Error("Cannot roll back a closed store transaction");
    }
    const state = checkpoint && typeof checkpoint === "object"
      ? this.#checkpointState.get(checkpoint as object)
      : undefined;
    if (!state?.active) throw new Error("Invalid store render checkpoint");
    for (let i = this.#journal.length - 1; i >= state.cursor; i--) {
      this.#journal[i]();
    }
    this.#journal.length = state.cursor;
    this.#branchChanges.length = state.changeCursor;
    while (
      this.#checkpointTail &&
      this.#checkpointTail.sequence > state.sequence
    ) this.#removeCheckpoint(this.#checkpointTail);
  }

  /** Release a consumed savepoint without affecting its ancestors. */
  releaseCheckpoint(checkpoint: StoreRenderCheckpoint): void {
    if (this.#closed || this.#preparedPublication) {
      throw new Error(
        "Cannot release a checkpoint from a closed store transaction",
      );
    }
    const state = checkpoint && typeof checkpoint === "object"
      ? this.#checkpointState.get(checkpoint as object)
      : undefined;
    if (!state?.active) throw new Error("Invalid store render checkpoint");
    this.#removeCheckpoint(state);
    this.#checkpointState.delete(checkpoint as object);
    if (!this.#checkpointHead) {
      this.#journal.length = 0;
      this.#branchChanges.length = 0;
    }
  }

  /** Return only observations produced or replaced in this live branch. */
  observationsSince(
    checkpoint: StoreRenderCheckpoint,
  ): ReadonlyMap<string, StoreRenderObservation> {
    const state = this.#activeCheckpoint(checkpoint);
    const result = new Map<string, StoreRenderObservation>();
    for (let i = state.changeCursor; i < this.#branchChanges.length; i++) {
      const readerId = this.#branchChanges[i];
      const observation = this.#values.get(readerId);
      if (observation) result.set(readerId, observation);
    }
    return result;
  }

  /** Return only reader footprints produced or replaced in this live branch. */
  readersSince(
    checkpoint: StoreRenderCheckpoint,
  ): ReadonlyMap<string, ReadonlySet<AnyAsyncStore>> {
    const state = this.#activeCheckpoint(checkpoint);
    const result = new Map<string, ReadonlySet<AnyAsyncStore>>();
    for (let i = state.changeCursor; i < this.#branchChanges.length; i++) {
      const readerId = this.#branchChanges[i];
      const readers = this.#readers.get(readerId);
      if (readers) result.set(readerId, new Set(readers));
    }
    return result;
  }

  /** O(1) lookup for a single boundary reader. */
  getObservation(readerId: string): StoreRenderObservation | undefined {
    return this.#values.get(readerId);
  }

  #activeCheckpoint(checkpoint: StoreRenderCheckpoint): CheckpointState {
    if (this.#closed || this.#preparedPublication) {
      throw new Error("Cannot inspect a closed store transaction");
    }
    const state = checkpoint && typeof checkpoint === "object"
      ? this.#checkpointState.get(checkpoint as object)
      : undefined;
    if (!state?.active) throw new Error("Invalid store render checkpoint");
    return state;
  }

  #recordBranchChange(readerId: string) {
    if (this.#checkpointHead) this.#branchChanges.push(readerId);
  }

  #removeCheckpoint(state: CheckpointState) {
    state.active = false;
    if (state.previous) state.previous.next = state.next;
    else this.#checkpointHead = state.next;
    if (state.next) state.next.previous = state.previous;
    else this.#checkpointTail = state.previous;
    state.previous = undefined;
    state.next = undefined;
  }

  /**
   * Keep committed-boundary reader dependencies in this candidate without
   * staging selector history from a speculative branch. Stores are pinned
   * before validation so their root projection participates in the read cut.
   */
  preserveReaders(
    readers: ReadonlyMap<string, ReadonlySet<AnyAsyncStore>>,
  ): void {
    if (this.#closed || this.#preparedPublication) {
      throw new Error("Cannot preserve readers in a closed store transaction");
    }
    for (const [readerId, readerStores] of readers) {
      if (!readerId) throw new Error("A store reader requires a site ID");
      for (const store of readerStores) this.#pinStore(store);
      this.#setJournaled(this.#readers, readerId, new Set(readerStores));
      this.#deleteJournaled(this.#values, readerId);
      for (const [store, pending] of this.#pending) {
        this.#deleteJournaled(pending, readerId);
        if (pending.size === 0) this.#deleteJournaled(this.#pending, store);
      }
      this.#recordBranchChange(readerId);
    }
  }

  /** Carry the captured cut of a suspended draft without rerunning its readers. */
  preserveCapturedReaders(
    readers: ReadonlyMap<string, ReadonlySet<AnyAsyncStore>>,
  ): void {
    this.preserveReaders(readers);
    for (const [readerId, stores] of readers) {
      for (const store of stores) {
        if (!canonicalClosedNumericStore.call(store)) continue;
        let pending = this.#pending.get(store);
        if (!pending) {
          pending = new Map();
          this.#setJournaled(this.#pending, store, pending);
        }
        this.#setJournaled(pending, readerId, capturedReaderCut);
      }
    }
  }

  /**
   * Remove superseded reader observations from this candidate. Store snapshots
   * stay pinned: even a reader that leaves the candidate participated in its
   * validation cut, and its stores may still be shared by other readers.
   */
  dropReaders(readerIds: Iterable<string>): void {
    if (this.#closed || this.#preparedPublication) {
      throw new Error("Cannot drop readers from a closed store transaction");
    }
    for (const readerId of readerIds) {
      this.#deleteJournaled(this.#readers, readerId);
      this.#deleteJournaled(this.#values, readerId);
      for (const [store, pending] of this.#pending) {
        this.#deleteJournaled(pending, readerId);
        if (pending.size === 0) this.#deleteJournaled(this.#pending, store);
      }
      this.#recordBranchChange(readerId);
    }
  }

  /** Stage exact accepted reader retirement with this transaction's observations. */
  retireClosedReaders(
    readers: ReadonlyMap<string, ReadonlySet<AnyAsyncStore>>,
  ): boolean {
    if (this.#closed || this.#preparedPublication) {
      throw new Error("Cannot retire readers in a closed store transaction");
    }
    for (const [readerId, stores] of readers) {
      if (!readerId) return false;
      for (const store of stores) {
        const snapshot = this.#snapshots.get(store);
        if (!snapshot?.closedNumeric ||
          !canonicalClosedNumericStore.call(store) ||
          !snapshot.validatePublicationInputs()) return false;
      }
    }
    for (const [readerId, stores] of readers) {
      for (const store of stores) {
        let pending = this.#pending.get(store);
        if (!pending) {
          pending = new Map();
          this.#setJournaled(this.#pending, store, pending);
        }
        if (!pending.has(readerId)) this.#setJournaled(pending, readerId, null);
      }
    }
    return true;
  }

  #pinStore(store: AnyAsyncStore) {
    if (this.#snapshots.has(store)) return;
    if (store.mutationEpoch > this.#startedEpoch) {
      this.#discoveredAfterMutation = true;
    }
    const snapshot = store.beginRender(this.rootId, this.options);
    this.#snapshots.set(store, snapshot);
    this.#states.set(store, snapshot.state);
  }

  #setJournaled<K, V>(map: Map<K, V>, key: K, value: V) {
    if (this.#checkpointHead) {
      const existed = map.has(key);
      const previous = map.get(key);
      this.#journal.push(() => {
        if (existed) map.set(key, previous as V);
        else map.delete(key);
      });
    }
    map.set(key, value);
  }

  #deleteJournaled<K, V>(map: Map<K, V>, key: K) {
    if (!map.has(key)) return;
    if (this.#checkpointHead) {
      const previous = map.get(key) as V;
      this.#journal.push(() => map.set(key, previous));
    }
    map.delete(key);
  }

  /** Stage selected numeric paths while recording the actual whole-state observation. */
  readClosedProjections(
    store: AnyAsyncStore,
    readerId: string,
    paths: readonly (readonly string[])[],
  ): readonly number[] | null {
    if (this.#closed || this.#preparedPublication) {
      throw new Error("Cannot read a closed or prepared store transaction");
    }
    if (!readerId) throw new Error("A store reader requires a site ID");
    const cached = this.#values.get(readerId);
    if (cached && cached.source !== store) return null;
    let snapshot = this.#snapshots.get(store);
    let values: readonly number[] | null;
    if (!snapshot) {
      const captured = canonicalBeginClosedProjectionRender.call(store, this.rootId, paths);
      if (!captured) return null;
      snapshot = captured.snapshot;
      values = captured.values;
    } else {
      values = isOwnedClosedProjectionPaths(paths)
        ? this.#ownedProjectionValues.get(snapshot)?.get(paths) ??
          captureOwnedClosedProjectionValues(snapshot.state, paths)
        : captureClosedProjectionValues(snapshot.state, paths);
    }
    if (!snapshot.closedNumeric || !canonicalClosedNumericStore.call(store)) return null;
    if (!values) return null;
    if (isOwnedClosedProjectionPaths(paths)) {
      let byPath = this.#ownedProjectionValues.get(snapshot);
      if (!byPath) this.#ownedProjectionValues.set(snapshot, byPath = new Map());
      byPath.set(paths, values);
    }
    if (!this.#snapshots.has(store)) {
      if (store.mutationEpoch > this.#startedEpoch) this.#discoveredAfterMutation = true;
      this.#snapshots.set(store, snapshot);
      this.#states.set(store, snapshot.state);
    }
    if (!cached) {
      this.#setJournaled(this.#readers, readerId, new Set([store]));
      let pending = this.#pending.get(store);
      if (!pending) {
        pending = new Map();
        this.#setJournaled(this.#pending, store, pending);
      }
      this.#setJournaled(pending, readerId, directReaderCut);
      this.#setJournaled(this.#values, readerId, {
        source: store,
        value: snapshot.state,
      });
      this.#recordBranchChange(readerId);
    }
    return values;
  }

  /** Compatibility wrapper for one direct numeric Store state. */
  readClosedNumeric(
    store: AnyAsyncStore,
    readerId: string,
  ): number | null {
    return this.readClosedProjections(store, readerId, closedDirectProjectionPaths)?.[0] ?? null;
  }
  read<T>(source: StoreSource<T>, readerId: string): T {
    if (this.#closed || this.#preparedPublication) {
      throw new Error("Cannot read a closed or prepared store transaction");
    }
    if (!readerId) throw new Error("A store reader requires a site ID");
    const cached = this.#values.get(readerId);
    if (cached) {
      if (cached.source !== source) {
        throw new Error("Store reader changed its source within one candidate");
      }
      return cached.value as T;
    }
    const stores = storesForSource(source);
    const previous = new Map<object, unknown>();
    for (const store of stores) {
      this.#pinStore(store);
      for (
        const [selection, value] of store._readerValuesFor(
          this.rootId,
          readerId,
        )
      ) previous.set(selection, value);
    }
    const session = new StoreReadSession(
      this.rootId,
      readerId,
      this.options.transitions ?? [],
      previous,
      this.#states,
    );
    const value = source.read(session);
    this.#setJournaled(this.#readers, readerId, new Set(stores));
    for (const store of stores) {
      let pending = this.#pending.get(store);
      if (!pending) {
        pending = new Map();
        this.#setJournaled(this.#pending, store, pending);
      }
      this.#setJournaled(pending, readerId,
        Object.is(source, store) && session.next.size === 0 ? directReaderCut : session.next);
    }
    this.#setJournaled(this.#values, readerId, { source, value });
    this.#recordBranchChange(readerId);
    return value;
  }
  validate(): boolean {
    return !this.#closed && !this.#discoveredAfterMutation &&
      [...this.#snapshots.values()].every((snapshot) => snapshot.validate());
  }
  validatePreparedCanonical(): boolean {
    return !this.#closed && !this.#discoveredAfterMutation &&
      [...this.#snapshots.values()].every((snapshot) =>
        canonicalValidateSnapshotPrepared.call(snapshot)
      );
  }
  validatePublicationInputs(): boolean {
    return !this.#closed && !this.#discoveredAfterMutation &&
      [...this.#snapshots.values()].every((snapshot) =>
        snapshot.validatePublicationInputs()
      );
  }
  validatePublicationInputsCanonical(): boolean {
    return !this.#closed && !this.#discoveredAfterMutation &&
      [...this.#snapshots.values()].every((snapshot) =>
        canonicalValidateSnapshotLineage.call(snapshot)
      );
  }
  /** Complete fallible reader validation and staging before accepted publication. */
  preparePublication(): void {
    if (this.#closed) throw new Error("Store render transaction is closed");
    if (this.#preparedPublication) return;
    if (!this.validate()) {
      throw new Error(`Store render transaction for ${this.rootId} is stale`);
    }
    this.#stagePublication(false);
  }
  /** Stage an older accepted read cut after newer actions reached the store log. */
  preparePublicationAfterHost(): void {
    if (this.#closed) throw new Error("Store render transaction is closed");
    if (this.#preparedPublication) return;
    if (!this.validatePublicationInputs()) {
      throw new Error(`Store publication inputs for ${this.rootId} are stale`);
    }
    this.#stagePublication(true);
  }
  #stagePublication(afterHost: boolean): void {
    const prepared = new Map<AnyAsyncStore, PreparedReaderValues>();
    for (const [store, pending] of this.#pending) {
      const snapshot = this.#snapshots.get(store)!;
      if (!snapshot.closedNumeric) {
        const prepare = store._prepareReaderValues;
        if (prepare !== canonicalPrepareReaderValues) {
          prepare.call(store, this.rootId, pending);
        }
      }
      prepared.set(store, canonicalPrepareReaderValues.call(
        store, this.rootId, pending, canonicalSnapshotRootStamp.call(snapshot),
      ));
    }
    const valid = afterHost ? this.validatePublicationInputs() : this.validate();
    const closedValid = [...this.#snapshots.values()].every((snapshot) =>
      !snapshot.closedNumeric || snapshot.validatePublicationInputs()
    );
    if (!valid || !closedValid) {
      throw new Error(`Store publication inputs for ${this.rootId} changed during preparation`);
    }
    this.#preparedPublication = prepared;
  }
  /** Install prepared per-reader histories after every group member is ready. */
  publishAccepted(): void {
    const prepared = this.#preparedPublication;
    if (!prepared || this.#closed) {
      throw new Error("Store publication was not prepared");
    }
    for (const [store, readers] of prepared) {
      canonicalPublishReaderValues.call(store, this.rootId, readers);
    }
    this.#closed = true;
    this.#preparedPublication = undefined;
    this.#ownedProjectionValues.clear();
    this.#releaseSavepoints();
  }
  notifyPublished(): void {}
  /** Compatibility path for a single validated renderer commit. */
  commitAfterValidatedRender(): void {
    if (this.#closed) return;
    this.preparePublication();
    this.publishAccepted();
    this.notifyPublished();
  }
  discard(): void {
    this.#closed = true;
    this.#preparedPublication = undefined;
    this.#pending.clear();
    this.#values.clear();
    this.#ownedProjectionValues.clear();
    this.#releaseSavepoints();
  }

  #releaseSavepoints() {
    this.#journal.length = 0;
    this.#branchChanges.length = 0;
    let state = this.#checkpointHead;
    while (state) {
      const next = state.next;
      state.active = false;
      state.previous = undefined;
      state.next = undefined;
      state = next;
    }
    this.#checkpointHead = undefined;
    this.#checkpointTail = undefined;
    this.#checkpointState = new WeakMap();
  }
}

const canonicalReadOwnedClosedProjectionBatch =
  StoreRenderTransaction.prototype._readOwnedClosedProjectionBatch;
const canonicalValidateStorePhase =
  StoreRenderTransaction.prototype._validateCanonicalClosedPhase;
const canonicalTransactionClosedRead =
  Object.getOwnPropertyDescriptor(StoreRenderTransaction.prototype, "readClosedProjections")!;
const transactionPhaseMethodNames = Object.freeze([
  "validate", "validatePublicationInputs", "validatePreparedCanonical",
  "validatePublicationInputsCanonical",
] as const);
const transactionPhaseDescriptors = new Map(transactionPhaseMethodNames.map((name) => [
  name, Object.getOwnPropertyDescriptor(StoreRenderTransaction.prototype, name)!,
]));

function transactionPhaseMethodsCanonical(transaction: object): boolean {
  return phaseMethodsCanonical(transaction, StoreRenderTransaction.prototype,
    transactionPhaseMethodNames, transactionPhaseDescriptors);
}

/** Audit selected owned Store snapshots and their captured phase stamps. */
export function validateCanonicalClosedStorePhase(
  transaction: StoreRenderTransaction,
  phase: "prepared" | "after-host",
): "current" | "stale" | "public-required" {
  try {
    return canonicalValidateStorePhase.call(transaction, ownedBatchKey, phase);
  } catch (error) {
    if (error instanceof TypeError) return "public-required";
    throw error;
  }
}

export function readOwnedClosedProjectionBatch(
  transaction: StoreRenderTransaction,
  requests: readonly OwnedClosedProjectionRequest[],
): readonly (readonly number[])[] | null {
  let copied: OwnedClosedProjectionRequest[];
  try {
    const length = Object.getOwnPropertyDescriptor(requests, "length")?.value;
    if (!Number.isSafeInteger(length) || length < 0 || length > 65536) return null;
    copied = [];
    for (let index = 0; index < length; index++) {
      const request = Object.getOwnPropertyDescriptor(requests, String(index));
      if (!request || !("value" in request) || !request.value) return null;
      const store = Object.getOwnPropertyDescriptor(request.value, "store");
      const readerId = Object.getOwnPropertyDescriptor(request.value, "readerId");
      const paths = Object.getOwnPropertyDescriptor(request.value, "paths");
      if (!store || !("value" in store) || !readerId || !("value" in readerId) ||
        typeof readerId.value !== "string" || !paths || !("value" in paths)) return null;
      copied.push({ store: store.value, readerId: readerId.value, paths: paths.value });
    }
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
  return canonicalReadOwnedClosedProjectionBatch.call(transaction, ownedBatchKey, copied);
}
