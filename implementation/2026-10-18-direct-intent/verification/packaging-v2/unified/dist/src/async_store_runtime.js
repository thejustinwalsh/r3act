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
// Publication is module-wide: a renderer may commit roots from several stores
// after publishing one shared host tree. Keep only stores with pending work,
// and remove each before draining it so this queue cannot retain stores.
const publicationStores = new Set();
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
export function batchStorePublication(callback) {
    publicationBatchDepth++;
    let result;
    let callbackError;
    let callbackFailed = false;
    try {
        result = callback();
    }
    catch (error) {
        callbackFailed = true;
        callbackError = error;
    }
    finally {
        publicationBatchDepth--;
    }
    let notificationError;
    let notificationFailed = false;
    if (publicationBatchDepth === 0) {
        try {
            drainPublicationStores();
        }
        catch (error) {
            notificationFailed = true;
            notificationError = error;
        }
    }
    if (callbackFailed && notificationFailed) {
        throw new AggregateError([callbackError, notificationError], "Store publication callback and notification listeners failed");
    }
    if (callbackFailed)
        throw callbackError;
    if (notificationFailed)
        throw notificationError;
    return result;
}
function scheduleStoreNotifications(store) {
    publicationStores.add(store);
    if (publicationBatchDepth === 0 && !drainingPublicationStores) {
        drainPublicationStores();
    }
}
function drainPublicationStores() {
    if (drainingPublicationStores || publicationBatchDepth > 0)
        return;
    drainingPublicationStores = true;
    const errors = [];
    try {
        while (publicationStores.size > 0) {
            const store = publicationStores.values().next().value;
            if (!store)
                continue;
            publicationStores.delete(store);
            try {
                store._drainNotifications();
            }
            catch (error) {
                errors.push(error);
            }
        }
    }
    finally {
        drainingPublicationStores = false;
    }
    if (errors.length > 0) {
        throw new AggregateError(errors, "Store notification listeners failed");
    }
}
/** A read-site context so chained selections get their own previous values. */
export class StoreReadSession {
    rootId;
    readerId;
    snapshotStates;
    transitions;
    previous;
    next = new Map();
    constructor(rootId, readerId, transitions, previous, 
    /** Immutable projections pinned when this root began its render. */
    snapshotStates) {
        this.rootId = rootId;
        this.readerId = readerId;
        this.snapshotStates = snapshotStates;
        this.transitions = new Set(transitions);
        this.previous = previous;
    }
}
/** Advanced adapter protocol: declare every store source read by this source. */
export const storeDependencies = Symbol("native.store.dependencies");
/**
 * A render transaction for one root. Every read uses the same projected state;
 * callers validate immediately before host commit and publish selector history
 * only after that commit succeeds.
 */
export class StoreRenderSnapshot {
    store;
    rootId;
    options;
    state;
    version;
    rootEpoch;
    #pending = new Map();
    #committed = false;
    constructor(store, rootId, options, state, version, rootEpoch) {
        this.store = store;
        this.rootId = rootId;
        this.options = options;
        this.state = state;
        this.version = version;
        this.rootEpoch = rootEpoch;
    }
    read(source, readerId) {
        if (this.#committed) {
            throw new Error("Cannot read from a committed store render snapshot");
        }
        return this.store._readAtSnapshot(source, this.rootId, readerId, this.options.transitions ?? [], new Map([[this.store, this.state]]), this.#pending);
    }
    /** False means discard/rebuild the candidate; never publish a mixed render. */
    validate() {
        return !this.#committed &&
            this.store._validateRender(this.rootId, this.version, this.rootEpoch);
    }
    validatePublicationInputs() {
        return !this.#committed && this.store._validateRenderLineage(this.rootId, this.version, this.rootEpoch);
    }
    /** Call after host commit. Repeated calls are harmless. */
    commit() {
        if (this.#committed)
            return;
        if (!this.validate()) {
            throw new Error(`Store snapshot for root ${this.rootId} is stale; rebuild before commit`);
        }
        this.commitAfterValidatedRender();
    }
    /** Publish selector history after a renderer's pre-host-commit validation. */
    commitAfterValidatedRender() {
        if (this.#committed)
            return;
        this.store._commitReaderValues(this.rootId, this.#pending);
        this.#committed = true;
    }
}
/** A derived store. Its previous value belongs to the read site, not the node. */
export class StoreSelection {
    sources;
    selector;
    constructor(sources, selector) {
        this.sources = sources;
        this.selector = selector;
        this.sources = Object.freeze([...sources]);
    }
    /** Immutable declared dependencies used to pin a complete root read set. */
    get dependencies() {
        return this.sources;
    }
    read(session) {
        const states = this.sources.map((source) => source.read(session));
        const previous = session.previous.get(this);
        const value = this.selector(states, previous);
        session.next.set(this, value);
        return value;
    }
    select(selector) {
        return createStoreSelector([this], ([value], previous) => selector(value, previous));
    }
}
/** A derived read over one or more stores; previous values remain per reader. */
export function createStoreSelector(sources, selector) {
    if (sources.length === 0) {
        throw new Error("A store selection requires at least one source");
    }
    return new StoreSelection(sources, selector);
}
/**
 * An action-log store. Roots are explicit so a transition can hold the roots
 * that are still showing their previous state while other roots catch up.
 */
export class AsyncStore {
    reducer;
    #baseState;
    #headState;
    #version = 0;
    #mutationEpoch = 0;
    #rootVersions = new Map();
    #rootEpochs = new Map();
    #knownRoots = new Set();
    #entries = [];
    #transitions = new Map();
    #roots = new Map();
    #readerValues = new Map();
    #notificationQueue = [];
    #notifying = false;
    constructor(initialState, reducer = ((state, action) => typeof action === "function"
        ? action(state)
        : action)) {
        this.reducer = reducer;
        this.#baseState = initialState;
        this.#headState = initialState;
    }
    /** Latest chronological value, including transition updates not yet shown. */
    getState() {
        return this.#headState;
    }
    get version() {
        return this.#version;
    }
    /** Internal transaction clock; only participating stores constrain a read cut. */
    get mutationEpoch() {
        return this.#mutationEpoch;
    }
    /** Version of the state this root can currently observe. */
    getRootVersion(rootId) {
        return this.#rootVersions.get(rootId) ?? 0;
    }
    /** Capture one immutable store projection for a root render. */
    beginRender(rootId, options = {}) {
        this.#knownRoots.add(rootId);
        let rootEpoch = this.#rootEpochs.get(rootId);
        if (!rootEpoch)
            this.#rootEpochs.set(rootId, rootEpoch = {});
        return new StoreRenderSnapshot(this, rootId, options, this.getStateForRoot(rootId, options), this.getRootVersion(rootId), rootEpoch);
    }
    select(selector) {
        return createStoreSelector([this], ([state], previous) => selector(state, previous));
    }
    /** Register roots that may hold a transition update while it is pending. */
    beginTransition(transitionId, rootIds) {
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
        for (const rootId of rootIds)
            this.#knownRoots.add(rootId);
    }
    hasTransition(transitionId) {
        return this.#transitions.has(transitionId);
    }
    transitionRoots(transitionId) {
        const transition = this.#transitions.get(transitionId);
        if (!transition)
            throw new Error(`Unknown transition: ${transitionId}`);
        return [...transition.roots];
    }
    /**
     * Dispatch in chronological order. A transition dispatch joins its explicit
     * transaction; it is not inferred from ambient async context.
     */
    dispatch(action, priority = { kind: "urgent" }) {
        const pendingRoots = new Set();
        if (priority.kind === "transition") {
            const transition = this.#transitions.get(priority.transitionId);
            if (!transition) {
                throw new Error(`Unknown transition: ${priority.transitionId}`);
            }
            if (!transition.open) {
                throw new Error(`Transition is already finished: ${priority.transitionId}`);
            }
            for (const rootId of transition.roots)
                pendingRoots.add(rootId);
        }
        const next = this.reducer(this.#headState, action);
        if (Object.is(next, this.#headState)) {
            // With no retained actions every root shares the chronological head.
            if (this.#entries.length === 0)
                return false;
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
            if (!changesProjection)
                return false;
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
        for (const rootId of affectedRoots)
            this.#bumpRootVersion(rootId);
        if (priority.kind === "urgent") {
            this.#notifyAll(priority);
        }
        else {
            // Candidate readers can opt into the transition ID. Ordinary readers of
            // its pending roots keep the old state until the transition commits.
            this.#enqueueNotifications([...pendingRoots], priority);
        }
        this.#compact();
        return true;
    }
    /** Mark the async action scope closed; non-participating roots may catch up. */
    finishTransition(transitionId) {
        const transition = this.#transitions.get(transitionId);
        if (!transition)
            return;
        if (!transition.open)
            return;
        this.#mutationEpoch = ++storeMutationClock;
        transition.open = false;
        const changedRoots = [];
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
    commitTransition(transitionId, rootId) {
        this.commitTransitionRoots(transitionId, [rootId]);
    }
    /**
     * Publish one transition to a coordinated root set. All projection/version
     * mutations happen before the first subscriber is notified, so observers
     * cannot see a partially committed group through this store.
     */
    commitTransitionRoots(transitionId, rootIds, options = {}) {
        const transition = this.#transitions.get(transitionId);
        if (!transition)
            throw new Error(`Unknown transition: ${transitionId}`);
        const uniqueRoots = new Set(rootIds);
        if (uniqueRoots.size !== rootIds.length) {
            throw new Error("A transition commit cannot contain duplicate roots");
        }
        for (const rootId of uniqueRoots) {
            if (!transition.roots.has(rootId)) {
                throw new Error(`Root ${rootId} is not part of transition ${transitionId}`);
            }
        }
        this.#mutationEpoch = ++storeMutationClock;
        if (options.finish)
            transition.open = false;
        for (const entry of this.#entries) {
            if (entry.priority.kind === "transition" &&
                entry.priority.transitionId === transitionId) {
                for (const rootId of uniqueRoots)
                    entry.committedRoots.add(rootId);
            }
        }
        for (const rootId of uniqueRoots) {
            transition.completedRoots.add(rootId);
        }
        const changedRoots = new Set(uniqueRoots);
        if (options.finish) {
            for (const rootId of this.#knownRoots) {
                if (!transition.roots.has(rootId))
                    changedRoots.add(rootId);
            }
        }
        for (const rootId of changedRoots)
            this.#bumpRootVersion(rootId);
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
    releaseTransition(transitionId, rootId) {
        const transition = this.#transitions.get(transitionId);
        if (!transition)
            throw new Error(`Unknown transition: ${transitionId}`);
        if (!transition.roots.has(rootId))
            return;
        this.#mutationEpoch = ++storeMutationClock;
        transition.roots.delete(rootId);
        transition.completedRoots.add(rootId);
        this.#bumpRootVersion(rootId);
        for (const entry of this.#entries) {
            if (entry.priority.kind === "transition" &&
                entry.priority.transitionId === transitionId) {
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
    detachRoot(rootId) {
        const wasKnown = this.#knownRoots.delete(rootId);
        const hadListeners = this.#roots.delete(rootId);
        const hadReaders = this.#readerValues.delete(rootId);
        for (const [transitionId, transition] of this.#transitions) {
            if (transition.roots.delete(rootId)) {
                transition.completedRoots.add(rootId);
            }
            for (const entry of this.#entries) {
                if (entry.priority.kind === "transition" &&
                    entry.priority.transitionId === transitionId) {
                    entry.pendingRoots.delete(rootId);
                    entry.committedRoots.delete(rootId);
                }
            }
        }
        if (wasKnown || hadListeners || hadReaders)
            this.#bumpRootVersion(rootId);
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
    getStateForRoot(rootId, options = {}) {
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
    read(sourceOrSession, rootId, readerId, options = {}) {
        if (sourceOrSession instanceof StoreReadSession) {
            if (!sourceOrSession.snapshotStates.has(this)) {
                throw new Error("Store was not included in this root render snapshot read set");
            }
            return sourceOrSession.snapshotStates.get(this);
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
    _readAtSnapshot(source, rootId, readerId, transitions, snapshotStates, pending) {
        const previous = this.#readerValues.get(rootId)?.get(readerId) ??
            new Map();
        const session = new StoreReadSession(rootId, readerId, transitions, previous, snapshotStates);
        const value = source.read(session);
        pending.set(readerId, session.next);
        return value;
    }
    /** Read-only committed selection history, never mutated during preparation. */
    _readerValuesFor(rootId, readerId) {
        return this.#readerValues.get(rootId)?.get(readerId) ?? new Map();
    }
    diagnostics() {
        return Object.freeze({
            roots: this.#knownRoots.size,
            listeners: [...this.#roots.values()].reduce((count, values) => count + values.size, 0),
            readers: [...this.#readerValues.values()].reduce((count, values) => count + values.size, 0),
            retainedActions: this.#entries.length,
            transitions: this.#transitions.size,
        });
    }
    _commitReaderValues(rootId, pending) {
        this._publishPreparedReaderValues(rootId, this._prepareReaderValues(rootId, pending));
    }
    _prepareReaderValues(rootId, pending) {
        if (!this.#knownRoots.has(rootId)) {
            throw new Error(`Store reader root is no longer live: ${rootId}`);
        }
        const prepared = new Map();
        for (const [readerId, values] of pending) {
            prepared.set(readerId, new Map(values));
        }
        const existing = this.#readerValues.get(rootId);
        return {
            rootReaders: existing ?? new Map(),
            isNewRoot: existing === undefined,
            entries: prepared,
        };
    }
    _publishPreparedReaderValues(rootId, prepared) {
        if (prepared.isNewRoot) {
            this.#readerValues.set(rootId, prepared.rootReaders);
        }
        for (const [readerId, values] of prepared.entries) {
            prepared.rootReaders.set(readerId, values);
        }
    }
    _validateRender(rootId, version, rootEpoch) {
        return this.#knownRoots.has(rootId) &&
            this.#rootEpochs.get(rootId) === rootEpoch &&
            this.getRootVersion(rootId) === version;
    }
    _validateRenderLineage(rootId, version, rootEpoch) {
        return this.#knownRoots.has(rootId) &&
            this.#rootEpochs.get(rootId) === rootEpoch &&
            this.getRootVersion(rootId) >= version;
    }
    #bumpRootVersion(rootId) {
        this.#mutationEpoch = ++storeMutationClock;
        this.#knownRoots.add(rootId);
        this.#rootVersions.set(rootId, this.getRootVersion(rootId) + 1);
    }
    #newProjectionProbeId() {
        let rootId = "\0async-store-projection-probe";
        while (this.#knownRoots.has(rootId) ||
            this.#entries.some((entry) => entry.pendingRoots.has(rootId))) {
            rootId += "\0";
        }
        return rootId;
    }
    /** Drop read-site selector history when its owning component is removed. */
    forgetReader(rootId, readerId) {
        const readers = this.#readerValues.get(rootId);
        readers?.delete(readerId);
        if (readers?.size === 0)
            this.#readerValues.delete(rootId);
    }
    subscribe(rootId, listener) {
        this.#knownRoots.add(rootId);
        let listeners = this.#roots.get(rootId);
        if (!listeners)
            this.#roots.set(rootId, listeners = new Set());
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
            if (listeners.size === 0)
                this.#roots.delete(rootId);
            this.#compact();
        };
    }
    #notifyAll(priority) {
        this.#enqueueNotifications([...this.#roots.keys()], priority);
    }
    #notify(rootId, priority) {
        this.#enqueueNotifications([rootId], priority);
    }
    /** Queue reentrant dispatch notifications until the current listener batch finishes. */
    #enqueueNotifications(rootIds, priority) {
        if (rootIds.length === 0)
            return;
        if (this.#notifying) {
            const deferred = this.#notificationQueue.at(-1) ?? new Map();
            if (this.#notificationQueue.length === 0) {
                this.#notificationQueue.push(deferred);
            }
            for (const rootId of rootIds)
                deferred.set(rootId, priority);
            scheduleStoreNotifications(this);
            return;
        }
        const batch = new Map();
        for (const rootId of rootIds)
            batch.set(rootId, priority);
        this.#notificationQueue.push(batch);
        scheduleStoreNotifications(this);
    }
    /** Internal notification drain used by the cross-store publication queue. */
    _drainNotifications() {
        if (this.#notifying)
            return;
        this.#notifying = true;
        const errors = [];
        try {
            while (this.#notificationQueue.length > 0) {
                const batch = this.#notificationQueue.shift();
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
                    },
                }));
                for (const { listeners, change } of deliveries) {
                    for (const listener of listeners) {
                        try {
                            listener(change);
                        }
                        catch (error) {
                            errors.push(error);
                        }
                    }
                }
            }
        }
        finally {
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
            if (!transition || transition.open)
                break;
            let committedEverywhere = true;
            for (const rootId of entry.pendingRoots) {
                if (!entry.committedRoots.has(rootId)) {
                    committedEverywhere = false;
                    break;
                }
            }
            if (!committedEverywhere)
                break;
            this.#baseState = entry.state;
            count++;
        }
        if (count > 0)
            this.#entries.splice(0, count);
        for (const [id, transition] of this.#transitions) {
            if (transition.open)
                continue;
            const retained = this.#entries.some((entry) => entry.priority.kind === "transition" &&
                entry.priority.transitionId === id);
            const allRootsCompleted = [...transition.roots].every((rootId) => transition.completedRoots.has(rootId));
            if (!retained && allRootsCompleted)
                this.#transitions.delete(id);
        }
    }
}
export function createAsyncStore(initialState, reducer) {
    return new AsyncStore(initialState, reducer);
}
/** Discover the full dependency set before evaluating any selector callback. */
export function storesForSource(source) {
    const stores = new Set();
    const visiting = new Set();
    const complete = new Set();
    const visit = (current) => {
        if (current instanceof AsyncStore) {
            stores.add(current);
            return;
        }
        const dependencies = current instanceof StoreSelection
            ? current.dependencies
            : current[storeDependencies];
        if (!Array.isArray(dependencies)) {
            throw new Error("Native store reads require an AsyncStore, declared StoreSelection or storeDependencies graph");
        }
        if (visiting.has(current)) {
            throw new Error("Store selection dependency cycle");
        }
        if (complete.has(current))
            return;
        visiting.add(current);
        for (const dependency of dependencies)
            visit(dependency);
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
    rootId;
    options;
    #snapshots = new Map();
    #states = new Map();
    #readers = new Map();
    #pending = new Map();
    #values = new Map();
    #closed = false;
    #preparedPublication;
    #journal = [];
    #branchChanges = [];
    #checkpointState = new WeakMap();
    #checkpointHead;
    #checkpointTail;
    #checkpointSequence = 0;
    #startedEpoch = storeMutationClock;
    #discoveredAfterMutation = false;
    constructor(rootId, options = {}) {
        this.rootId = rootId;
        this.options = options;
        if (!rootId)
            throw new Error("A store transaction requires a root ID");
        this.options = {
            transitions: Object.freeze([...(options.transitions ?? [])]),
        };
    }
    get stores() {
        return new Set(this.#snapshots.keys());
    }
    get readers() {
        return new Map(this.#readers);
    }
    /** Current branch's successfully completed reader observations. */
    get observations() {
        return new Map(this.#values);
    }
    /** Create an O(1) savepoint for branch-local reader state. */
    checkpoint() {
        if (this.#closed || this.#preparedPublication) {
            throw new Error("Cannot checkpoint a closed store transaction");
        }
        const token = Object.freeze({});
        const state = {
            cursor: this.#journal.length,
            changeCursor: this.#branchChanges.length,
            sequence: ++this.#checkpointSequence,
            active: true,
            previous: this.#checkpointTail,
        };
        if (this.#checkpointTail)
            this.#checkpointTail.next = state;
        else
            this.#checkpointHead = state;
        this.#checkpointTail = state;
        this.#checkpointState.set(token, state);
        return token;
    }
    /** Undo reader staging and observations after a live savepoint. */
    rollbackTo(checkpoint) {
        if (this.#closed || this.#preparedPublication) {
            throw new Error("Cannot roll back a closed store transaction");
        }
        const state = checkpoint && typeof checkpoint === "object"
            ? this.#checkpointState.get(checkpoint)
            : undefined;
        if (!state?.active)
            throw new Error("Invalid store render checkpoint");
        for (let i = this.#journal.length - 1; i >= state.cursor; i--) {
            this.#journal[i]();
        }
        this.#journal.length = state.cursor;
        this.#branchChanges.length = state.changeCursor;
        while (this.#checkpointTail &&
            this.#checkpointTail.sequence > state.sequence)
            this.#removeCheckpoint(this.#checkpointTail);
    }
    /** Release a consumed savepoint without affecting its ancestors. */
    releaseCheckpoint(checkpoint) {
        if (this.#closed || this.#preparedPublication) {
            throw new Error("Cannot release a checkpoint from a closed store transaction");
        }
        const state = checkpoint && typeof checkpoint === "object"
            ? this.#checkpointState.get(checkpoint)
            : undefined;
        if (!state?.active)
            throw new Error("Invalid store render checkpoint");
        this.#removeCheckpoint(state);
        this.#checkpointState.delete(checkpoint);
        if (!this.#checkpointHead) {
            this.#journal.length = 0;
            this.#branchChanges.length = 0;
        }
    }
    /** Return only observations produced or replaced in this live branch. */
    observationsSince(checkpoint) {
        const state = this.#activeCheckpoint(checkpoint);
        const result = new Map();
        for (let i = state.changeCursor; i < this.#branchChanges.length; i++) {
            const readerId = this.#branchChanges[i];
            const observation = this.#values.get(readerId);
            if (observation)
                result.set(readerId, observation);
        }
        return result;
    }
    /** Return only reader footprints produced or replaced in this live branch. */
    readersSince(checkpoint) {
        const state = this.#activeCheckpoint(checkpoint);
        const result = new Map();
        for (let i = state.changeCursor; i < this.#branchChanges.length; i++) {
            const readerId = this.#branchChanges[i];
            const readers = this.#readers.get(readerId);
            if (readers)
                result.set(readerId, new Set(readers));
        }
        return result;
    }
    /** O(1) lookup for a single boundary reader. */
    getObservation(readerId) {
        return this.#values.get(readerId);
    }
    #activeCheckpoint(checkpoint) {
        if (this.#closed || this.#preparedPublication) {
            throw new Error("Cannot inspect a closed store transaction");
        }
        const state = checkpoint && typeof checkpoint === "object"
            ? this.#checkpointState.get(checkpoint)
            : undefined;
        if (!state?.active)
            throw new Error("Invalid store render checkpoint");
        return state;
    }
    #recordBranchChange(readerId) {
        if (this.#checkpointHead)
            this.#branchChanges.push(readerId);
    }
    #removeCheckpoint(state) {
        state.active = false;
        if (state.previous)
            state.previous.next = state.next;
        else
            this.#checkpointHead = state.next;
        if (state.next)
            state.next.previous = state.previous;
        else
            this.#checkpointTail = state.previous;
        state.previous = undefined;
        state.next = undefined;
    }
    /**
     * Keep committed-boundary reader dependencies in this candidate without
     * staging selector history from a speculative branch. Stores are pinned
     * before validation so their root projection participates in the read cut.
     */
    preserveReaders(readers) {
        if (this.#closed || this.#preparedPublication) {
            throw new Error("Cannot preserve readers in a closed store transaction");
        }
        for (const [readerId, readerStores] of readers) {
            if (!readerId)
                throw new Error("A store reader requires a site ID");
            for (const store of readerStores)
                this.#pinStore(store);
            this.#setJournaled(this.#readers, readerId, new Set(readerStores));
            this.#deleteJournaled(this.#values, readerId);
            for (const [store, pending] of this.#pending) {
                this.#deleteJournaled(pending, readerId);
                if (pending.size === 0)
                    this.#deleteJournaled(this.#pending, store);
            }
            this.#recordBranchChange(readerId);
        }
    }
    /**
     * Remove superseded reader observations from this candidate. Store snapshots
     * stay pinned: even a reader that leaves the candidate participated in its
     * validation cut, and its stores may still be shared by other readers.
     */
    dropReaders(readerIds) {
        if (this.#closed || this.#preparedPublication) {
            throw new Error("Cannot drop readers from a closed store transaction");
        }
        for (const readerId of readerIds) {
            this.#deleteJournaled(this.#readers, readerId);
            this.#deleteJournaled(this.#values, readerId);
            for (const [store, pending] of this.#pending) {
                this.#deleteJournaled(pending, readerId);
                if (pending.size === 0)
                    this.#deleteJournaled(this.#pending, store);
            }
            this.#recordBranchChange(readerId);
        }
    }
    #pinStore(store) {
        if (this.#snapshots.has(store))
            return;
        if (store.mutationEpoch > this.#startedEpoch) {
            this.#discoveredAfterMutation = true;
        }
        const snapshot = store.beginRender(this.rootId, this.options);
        this.#snapshots.set(store, snapshot);
        this.#states.set(store, snapshot.state);
    }
    #setJournaled(map, key, value) {
        if (this.#checkpointHead) {
            const existed = map.has(key);
            const previous = map.get(key);
            this.#journal.push(() => {
                if (existed)
                    map.set(key, previous);
                else
                    map.delete(key);
            });
        }
        map.set(key, value);
    }
    #deleteJournaled(map, key) {
        if (!map.has(key))
            return;
        if (this.#checkpointHead) {
            const previous = map.get(key);
            this.#journal.push(() => map.set(key, previous));
        }
        map.delete(key);
    }
    read(source, readerId) {
        if (this.#closed || this.#preparedPublication) {
            throw new Error("Cannot read a closed or prepared store transaction");
        }
        if (!readerId)
            throw new Error("A store reader requires a site ID");
        const cached = this.#values.get(readerId);
        if (cached) {
            if (cached.source !== source) {
                throw new Error("Store reader changed its source within one candidate");
            }
            return cached.value;
        }
        const stores = storesForSource(source);
        const previous = new Map();
        for (const store of stores) {
            this.#pinStore(store);
            for (const [selection, value] of store._readerValuesFor(this.rootId, readerId))
                previous.set(selection, value);
        }
        const session = new StoreReadSession(this.rootId, readerId, this.options.transitions ?? [], previous, this.#states);
        const value = source.read(session);
        this.#setJournaled(this.#readers, readerId, new Set(stores));
        for (const store of stores) {
            let pending = this.#pending.get(store);
            if (!pending) {
                pending = new Map();
                this.#setJournaled(this.#pending, store, pending);
            }
            this.#setJournaled(pending, readerId, session.next);
        }
        this.#setJournaled(this.#values, readerId, { source, value });
        this.#recordBranchChange(readerId);
        return value;
    }
    validate() {
        return !this.#closed && !this.#discoveredAfterMutation &&
            [...this.#snapshots.values()].every((snapshot) => snapshot.validate());
    }
    validatePublicationInputs() {
        return !this.#closed && !this.#discoveredAfterMutation &&
            [...this.#snapshots.values()].every((snapshot) => snapshot.validatePublicationInputs());
    }
    /** Complete fallible reader validation and staging before accepted publication. */
    preparePublication() {
        if (this.#closed)
            throw new Error("Store render transaction is closed");
        if (this.#preparedPublication)
            return;
        if (!this.validate()) {
            throw new Error(`Store render transaction for ${this.rootId} is stale`);
        }
        this.#stagePublication();
    }
    /** Stage an older accepted read cut after newer actions reached the store log. */
    preparePublicationAfterHost() {
        if (this.#closed)
            throw new Error("Store render transaction is closed");
        if (this.#preparedPublication)
            return;
        if (!this.validatePublicationInputs()) {
            throw new Error(`Store publication inputs for ${this.rootId} are stale`);
        }
        this.#stagePublication();
    }
    #stagePublication() {
        const prepared = new Map();
        for (const [store, pending] of this.#pending) {
            prepared.set(store, store._prepareReaderValues(this.rootId, pending));
        }
        this.#preparedPublication = prepared;
    }
    /** Install prepared per-reader histories after every group member is ready. */
    publishAccepted() {
        const prepared = this.#preparedPublication;
        if (!prepared || this.#closed) {
            throw new Error("Store publication was not prepared");
        }
        for (const [store, readers] of prepared) {
            store._publishPreparedReaderValues(this.rootId, readers);
        }
        this.#closed = true;
        this.#preparedPublication = undefined;
        this.#releaseSavepoints();
    }
    notifyPublished() { }
    /** Compatibility path for a single validated renderer commit. */
    commitAfterValidatedRender() {
        if (this.#closed)
            return;
        this.preparePublication();
        this.publishAccepted();
        this.notifyPublished();
    }
    discard() {
        this.#closed = true;
        this.#preparedPublication = undefined;
        this.#pending.clear();
        this.#values.clear();
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
//# sourceMappingURL=async_store_runtime.js.map