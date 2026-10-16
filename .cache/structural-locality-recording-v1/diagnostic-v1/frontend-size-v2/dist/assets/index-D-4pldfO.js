//#region \0rolldown/runtime.js
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
//#endregion
//#region \0vite/modulepreload-polyfill.js
(function polyfill() {
	const relList = document.createElement("link").relList;
	if (relList && relList.supports && relList.supports("modulepreload")) return;
	for (const link of document.querySelectorAll("link[rel=\"modulepreload\"]")) processPreload(link);
	new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;
			for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
		}
	}).observe(document, {
		childList: true,
		subtree: true
	});
	function getFetchOpts(link) {
		const fetchOpts = {};
		if (link.integrity) fetchOpts.integrity = link.integrity;
		if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
		if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
		else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
		else fetchOpts.credentials = "same-origin";
		return fetchOpts;
	}
	function processPreload(link) {
		if (link.ep) return;
		link.ep = true;
		const fetchOpts = getFetchOpts(link);
		fetch(link.href, fetchOpts);
	}
})();
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/snapshot/src/async_store_runtime.ts
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
var storeMutationClock = 0;
var publicationStores = /* @__PURE__ */ new Set();
var publicationBatchDepth = 0;
var drainingPublicationStores = false;
function scheduleStoreNotifications(store) {
	publicationStores.add(store);
	if (publicationBatchDepth === 0 && !drainingPublicationStores) drainPublicationStores();
}
function drainPublicationStores() {
	if (drainingPublicationStores || publicationBatchDepth > 0) return;
	drainingPublicationStores = true;
	const errors = [];
	try {
		while (publicationStores.size > 0) {
			const store = publicationStores.values().next().value;
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
	if (errors.length > 0) throw new AggregateError(errors, "Store notification listeners failed");
}
/** A read-site context so chained selections get their own previous values. */
var StoreReadSession = class {
	rootId;
	readerId;
	snapshotStates;
	transitions;
	previous;
	next = /* @__PURE__ */ new Map();
	constructor(rootId, readerId, transitions, previous, snapshotStates) {
		this.rootId = rootId;
		this.readerId = readerId;
		this.snapshotStates = snapshotStates;
		this.transitions = new Set(transitions);
		this.previous = previous;
	}
};
/** Advanced adapter protocol: declare every store source read by this source. */
var storeDependencies = Symbol("native.store.dependencies");
/**
* A render transaction for one root. Every read uses the same projected state;
* callers validate immediately before host commit and publish selector history
* only after that commit succeeds.
*/
var StoreRenderSnapshot = class {
	store;
	rootId;
	options;
	state;
	version;
	rootEpoch;
	#pending = /* @__PURE__ */ new Map();
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
		if (this.#committed) throw new Error("Cannot read from a committed store render snapshot");
		return this.store._readAtSnapshot(source, this.rootId, readerId, this.options.transitions ?? [], /* @__PURE__ */ new Map([[this.store, this.state]]), this.#pending);
	}
	/** False means discard/rebuild the candidate; never publish a mixed render. */
	validate() {
		return !this.#committed && this.store._validateRender(this.rootId, this.version, this.rootEpoch);
	}
	/** Call after host commit. Repeated calls are harmless. */
	commit() {
		if (this.#committed) return;
		if (!this.validate()) throw new Error(`Store snapshot for root ${this.rootId} is stale; rebuild before commit`);
		this.commitAfterValidatedRender();
	}
	/** Publish selector history after a renderer's pre-host-commit validation. */
	commitAfterValidatedRender() {
		if (this.#committed) return;
		this.store._commitReaderValues(this.rootId, this.#pending);
		this.#committed = true;
	}
};
/** A derived store. Its previous value belongs to the read site, not the node. */
var StoreSelection = class {
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
};
/** A derived read over one or more stores; previous values remain per reader. */
function createStoreSelector(sources, selector) {
	if (sources.length === 0) throw new Error("A store selection requires at least one source");
	return new StoreSelection(sources, selector);
}
/**
* An action-log store. Roots are explicit so a transition can hold the roots
* that are still showing their previous state while other roots catch up.
*/
var AsyncStore = class {
	reducer;
	#baseState;
	#headState;
	#version = 0;
	#mutationEpoch = 0;
	#rootVersions = /* @__PURE__ */ new Map();
	#rootEpochs = /* @__PURE__ */ new Map();
	#knownRoots = /* @__PURE__ */ new Set();
	#entries = [];
	#transitions = /* @__PURE__ */ new Map();
	#roots = /* @__PURE__ */ new Map();
	#readerValues = /* @__PURE__ */ new Map();
	#notificationQueue = [];
	#notifying = false;
	constructor(initialState, reducer = ((state, action) => typeof action === "function" ? action(state) : action)) {
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
		if (!rootEpoch) this.#rootEpochs.set(rootId, rootEpoch = {});
		return new StoreRenderSnapshot(this, rootId, options, this.getStateForRoot(rootId, options), this.getRootVersion(rootId), rootEpoch);
	}
	select(selector) {
		return createStoreSelector([this], ([state], previous) => selector(state, previous));
	}
	/** Register roots that may hold a transition update while it is pending. */
	beginTransition(transitionId, rootIds) {
		if (transitionId.length === 0) throw new Error("Transition ID must not be empty");
		if (this.#transitions.has(transitionId)) throw new Error(`Transition already exists: ${transitionId}`);
		this.#transitions.set(transitionId, {
			roots: new Set(rootIds),
			completedRoots: /* @__PURE__ */ new Set(),
			open: true
		});
		for (const rootId of rootIds) this.#knownRoots.add(rootId);
	}
	hasTransition(transitionId) {
		return this.#transitions.has(transitionId);
	}
	transitionRoots(transitionId) {
		const transition = this.#transitions.get(transitionId);
		if (!transition) throw new Error(`Unknown transition: ${transitionId}`);
		return [...transition.roots];
	}
	/**
	* Dispatch in chronological order. A transition dispatch joins its explicit
	* transaction; it is not inferred from ambient async context.
	*/
	dispatch(action, priority = { kind: "urgent" }) {
		const pendingRoots = /* @__PURE__ */ new Set();
		if (priority.kind === "transition") {
			const transition = this.#transitions.get(priority.transitionId);
			if (!transition) throw new Error(`Unknown transition: ${priority.transitionId}`);
			if (!transition.open) throw new Error(`Transition is already finished: ${priority.transitionId}`);
			for (const rootId of transition.roots) pendingRoots.add(rootId);
		}
		const next = this.reducer(this.#headState, action);
		if (Object.is(next, this.#headState)) {
			if (this.#entries.length === 0) return false;
			const projectionRoots = new Set(this.#knownRoots);
			const newRootProbe = this.#newProjectionProbeId();
			projectionRoots.add(newRootProbe);
			if (![...projectionRoots].map((rootId) => ({
				rootId,
				options: priority.kind === "urgent" ? {} : { transitions: [priority.transitionId] }
			})).some(({ rootId, options }) => {
				const state = this.getStateForRoot(rootId, options);
				return !Object.is(this.reducer(state, action), state);
			})) return false;
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
			committedRoots: /* @__PURE__ */ new Set()
		});
		const affectedRoots = priority.kind === "urgent" ? this.#knownRoots : pendingRoots;
		for (const rootId of affectedRoots) this.#bumpRootVersion(rootId);
		if (priority.kind === "urgent") this.#notifyAll(priority);
		else this.#enqueueNotifications([...pendingRoots], priority);
		this.#compact();
		return true;
	}
	/** Mark the async action scope closed; non-participating roots may catch up. */
	finishTransition(transitionId) {
		const transition = this.#transitions.get(transitionId);
		if (!transition) return;
		if (!transition.open) return;
		this.#mutationEpoch = ++storeMutationClock;
		transition.open = false;
		const changedRoots = [];
		for (const rootId of this.#knownRoots) if (!transition.roots.has(rootId)) {
			this.#bumpRootVersion(rootId);
			changedRoots.push(rootId);
		}
		this.#enqueueNotifications(changedRoots, {
			kind: "transition",
			transitionId
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
		if (!transition) throw new Error(`Unknown transition: ${transitionId}`);
		const uniqueRoots = new Set(rootIds);
		if (uniqueRoots.size !== rootIds.length) throw new Error("A transition commit cannot contain duplicate roots");
		for (const rootId of uniqueRoots) if (!transition.roots.has(rootId)) throw new Error(`Root ${rootId} is not part of transition ${transitionId}`);
		this.#mutationEpoch = ++storeMutationClock;
		if (options.finish) transition.open = false;
		for (const entry of this.#entries) if (entry.priority.kind === "transition" && entry.priority.transitionId === transitionId) for (const rootId of uniqueRoots) entry.committedRoots.add(rootId);
		for (const rootId of uniqueRoots) transition.completedRoots.add(rootId);
		const changedRoots = new Set(uniqueRoots);
		if (options.finish) {
			for (const rootId of this.#knownRoots) if (!transition.roots.has(rootId)) changedRoots.add(rootId);
		}
		for (const rootId of changedRoots) this.#bumpRootVersion(rootId);
		this.#enqueueNotifications([...changedRoots], {
			kind: "transition",
			transitionId
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
		if (!transition) throw new Error(`Unknown transition: ${transitionId}`);
		if (!transition.roots.has(rootId)) return;
		this.#mutationEpoch = ++storeMutationClock;
		transition.roots.delete(rootId);
		transition.completedRoots.add(rootId);
		this.#bumpRootVersion(rootId);
		for (const entry of this.#entries) if (entry.priority.kind === "transition" && entry.priority.transitionId === transitionId) entry.pendingRoots.delete(rootId);
		this.#notify(rootId, {
			kind: "transition",
			transitionId
		});
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
			if (transition.roots.delete(rootId)) transition.completedRoots.add(rootId);
			for (const entry of this.#entries) if (entry.priority.kind === "transition" && entry.priority.transitionId === transitionId) {
				entry.pendingRoots.delete(rootId);
				entry.committedRoots.delete(rootId);
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
	getStateForRoot(rootId, options = {}) {
		const included = new Set(options.transitions ?? []);
		let state = this.#baseState;
		let hasSkippedAction = false;
		for (const entry of this.#entries) {
			const transitionId = entry.priority.kind === "transition" ? entry.priority.transitionId : null;
			const isPendingForRoot = entry.pendingRoots.has(rootId) && !entry.committedRoots.has(rootId);
			const scopeOpen = transitionId !== null && this.#transitions.get(transitionId)?.open === true;
			if (!(transitionId === null || included.has(transitionId) || !isPendingForRoot && !scopeOpen)) {
				hasSkippedAction = true;
				continue;
			}
			state = hasSkippedAction ? this.reducer(state, entry.action) : entry.state;
		}
		return state;
	}
	read(sourceOrSession, rootId, readerId, options = {}) {
		if (sourceOrSession instanceof StoreReadSession) {
			if (!sourceOrSession.snapshotStates.has(this)) throw new Error("Store was not included in this root render snapshot read set");
			return sourceOrSession.snapshotStates.get(this);
		}
		const source = sourceOrSession;
		if (rootId === void 0 || readerId === void 0) throw new Error("A root ID and reader ID are required for a store read");
		let readers = this.#readerValues.get(rootId);
		if (!readers) this.#readerValues.set(rootId, readers = /* @__PURE__ */ new Map());
		let previous = readers.get(readerId);
		if (!previous) readers.set(readerId, previous = /* @__PURE__ */ new Map());
		const snapshot = this.beginRender(rootId, options);
		return {
			value: snapshot.read(source, readerId),
			commit: () => snapshot.commit()
		};
	}
	/** Internal reader used by a pinned render snapshot. */
	_readAtSnapshot(source, rootId, readerId, transitions, snapshotStates, pending) {
		const session = new StoreReadSession(rootId, readerId, transitions, this.#readerValues.get(rootId)?.get(readerId) ?? /* @__PURE__ */ new Map(), snapshotStates);
		const value = source.read(session);
		pending.set(readerId, session.next);
		return value;
	}
	/** Read-only committed selection history, never mutated during preparation. */
	_readerValuesFor(rootId, readerId) {
		return this.#readerValues.get(rootId)?.get(readerId) ?? /* @__PURE__ */ new Map();
	}
	diagnostics() {
		return Object.freeze({
			roots: this.#knownRoots.size,
			listeners: [...this.#roots.values()].reduce((count, values) => count + values.size, 0),
			readers: [...this.#readerValues.values()].reduce((count, values) => count + values.size, 0),
			retainedActions: this.#entries.length,
			transitions: this.#transitions.size
		});
	}
	_commitReaderValues(rootId, pending) {
		let readers = this.#readerValues.get(rootId);
		if (!readers) this.#readerValues.set(rootId, readers = /* @__PURE__ */ new Map());
		for (const [readerId, values] of pending) readers.set(readerId, new Map(values));
	}
	_validateRender(rootId, version, rootEpoch) {
		return this.#knownRoots.has(rootId) && this.#rootEpochs.get(rootId) === rootEpoch && this.getRootVersion(rootId) === version;
	}
	#bumpRootVersion(rootId) {
		this.#mutationEpoch = ++storeMutationClock;
		this.#knownRoots.add(rootId);
		this.#rootVersions.set(rootId, this.getRootVersion(rootId) + 1);
	}
	#newProjectionProbeId() {
		let rootId = "\0async-store-projection-probe";
		while (this.#knownRoots.has(rootId) || this.#entries.some((entry) => entry.pendingRoots.has(rootId))) rootId += "\0";
		return rootId;
	}
	/** Drop read-site selector history when its owning component is removed. */
	forgetReader(rootId, readerId) {
		const readers = this.#readerValues.get(rootId);
		readers?.delete(readerId);
		if (readers?.size === 0) this.#readerValues.delete(rootId);
	}
	subscribe(rootId, listener) {
		this.#knownRoots.add(rootId);
		let listeners = this.#roots.get(rootId);
		if (!listeners) this.#roots.set(rootId, listeners = /* @__PURE__ */ new Set());
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
			if (listeners.size === 0) this.#roots.delete(rootId);
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
		if (rootIds.length === 0) return;
		if (this.#notifying) {
			const deferred = this.#notificationQueue.at(-1) ?? /* @__PURE__ */ new Map();
			if (this.#notificationQueue.length === 0) this.#notificationQueue.push(deferred);
			for (const rootId of rootIds) deferred.set(rootId, priority);
			scheduleStoreNotifications(this);
			return;
		}
		const batch = /* @__PURE__ */ new Map();
		for (const rootId of rootIds) batch.set(rootId, priority);
		this.#notificationQueue.push(batch);
		scheduleStoreNotifications(this);
	}
	/** Internal notification drain used by the cross-store publication queue. */
	_drainNotifications() {
		if (this.#notifying) return;
		this.#notifying = true;
		const errors = [];
		try {
			while (this.#notificationQueue.length > 0) {
				const deliveries = [...this.#notificationQueue.shift()].map(([rootId, priority]) => ({
					listeners: [...this.#roots.get(rootId) ?? []],
					change: {
						rootId,
						storeVersion: this.#version,
						state: this.getStateForRoot(rootId),
						priority
					}
				}));
				for (const { listeners, change } of deliveries) for (const listener of listeners) try {
					listener(change);
				} catch (error) {
					errors.push(error);
				}
			}
		} finally {
			this.#notifying = false;
		}
		if (errors.length > 0) throw new AggregateError(errors, "Store notification listeners failed");
	}
	#compact() {
		let count = 0;
		while (count < this.#entries.length) {
			const entry = this.#entries[count];
			const transitionId = entry.priority.kind === "transition" ? entry.priority.transitionId : null;
			if (transitionId === null) {
				this.#baseState = entry.state;
				count++;
				continue;
			}
			const transition = this.#transitions.get(transitionId);
			if (!transition || transition.open) break;
			let committedEverywhere = true;
			for (const rootId of entry.pendingRoots) if (!entry.committedRoots.has(rootId)) {
				committedEverywhere = false;
				break;
			}
			if (!committedEverywhere) break;
			this.#baseState = entry.state;
			count++;
		}
		if (count > 0) this.#entries.splice(0, count);
		for (const [id, transition] of this.#transitions) {
			if (transition.open) continue;
			const retained = this.#entries.some((entry) => entry.priority.kind === "transition" && entry.priority.transitionId === id);
			const allRootsCompleted = [...transition.roots].every((rootId) => transition.completedRoots.has(rootId));
			if (!retained && allRootsCompleted) this.#transitions.delete(id);
		}
	}
};
/** Discover the full dependency set before evaluating any selector callback. */
function storesForSource(source) {
	const stores = /* @__PURE__ */ new Set();
	const visiting = /* @__PURE__ */ new Set();
	const complete = /* @__PURE__ */ new Set();
	const visit = (current) => {
		if (current instanceof AsyncStore) {
			stores.add(current);
			return;
		}
		const dependencies = current instanceof StoreSelection ? current.dependencies : current[storeDependencies];
		if (!Array.isArray(dependencies)) throw new Error("Native store reads require an AsyncStore, declared StoreSelection or storeDependencies graph");
		if (visiting.has(current)) throw new Error("Store selection dependency cycle");
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
var StoreRenderTransaction = class {
	rootId;
	options;
	#snapshots = /* @__PURE__ */ new Map();
	#states = /* @__PURE__ */ new Map();
	#readers = /* @__PURE__ */ new Map();
	#pending = /* @__PURE__ */ new Map();
	#values = /* @__PURE__ */ new Map();
	#closed = false;
	#journal = [];
	#branchChanges = [];
	#checkpointState = /* @__PURE__ */ new WeakMap();
	#checkpointHead;
	#checkpointTail;
	#checkpointSequence = 0;
	#startedEpoch = storeMutationClock;
	#discoveredAfterMutation = false;
	constructor(rootId, options = {}) {
		this.rootId = rootId;
		this.options = options;
		if (!rootId) throw new Error("A store transaction requires a root ID");
		this.options = { transitions: Object.freeze([...options.transitions ?? []]) };
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
		if (this.#closed) throw new Error("Cannot checkpoint a closed store transaction");
		const token = Object.freeze({});
		const state = {
			cursor: this.#journal.length,
			changeCursor: this.#branchChanges.length,
			sequence: ++this.#checkpointSequence,
			active: true,
			previous: this.#checkpointTail
		};
		if (this.#checkpointTail) this.#checkpointTail.next = state;
		else this.#checkpointHead = state;
		this.#checkpointTail = state;
		this.#checkpointState.set(token, state);
		return token;
	}
	/** Undo reader staging and observations after a live savepoint. */
	rollbackTo(checkpoint) {
		if (this.#closed) throw new Error("Cannot roll back a closed store transaction");
		const state = checkpoint && typeof checkpoint === "object" ? this.#checkpointState.get(checkpoint) : void 0;
		if (!state?.active) throw new Error("Invalid store render checkpoint");
		for (let i = this.#journal.length - 1; i >= state.cursor; i--) this.#journal[i]();
		this.#journal.length = state.cursor;
		this.#branchChanges.length = state.changeCursor;
		while (this.#checkpointTail && this.#checkpointTail.sequence > state.sequence) this.#removeCheckpoint(this.#checkpointTail);
	}
	/** Release a consumed savepoint without affecting its ancestors. */
	releaseCheckpoint(checkpoint) {
		if (this.#closed) throw new Error("Cannot release a checkpoint from a closed store transaction");
		const state = checkpoint && typeof checkpoint === "object" ? this.#checkpointState.get(checkpoint) : void 0;
		if (!state?.active) throw new Error("Invalid store render checkpoint");
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
		const result = /* @__PURE__ */ new Map();
		for (let i = state.changeCursor; i < this.#branchChanges.length; i++) {
			const readerId = this.#branchChanges[i];
			const observation = this.#values.get(readerId);
			if (observation) result.set(readerId, observation);
		}
		return result;
	}
	/** Return only reader footprints produced or replaced in this live branch. */
	readersSince(checkpoint) {
		const state = this.#activeCheckpoint(checkpoint);
		const result = /* @__PURE__ */ new Map();
		for (let i = state.changeCursor; i < this.#branchChanges.length; i++) {
			const readerId = this.#branchChanges[i];
			const readers = this.#readers.get(readerId);
			if (readers) result.set(readerId, new Set(readers));
		}
		return result;
	}
	/** O(1) lookup for a single boundary reader. */
	getObservation(readerId) {
		return this.#values.get(readerId);
	}
	#activeCheckpoint(checkpoint) {
		if (this.#closed) throw new Error("Cannot inspect a closed store transaction");
		const state = checkpoint && typeof checkpoint === "object" ? this.#checkpointState.get(checkpoint) : void 0;
		if (!state?.active) throw new Error("Invalid store render checkpoint");
		return state;
	}
	#recordBranchChange(readerId) {
		if (this.#checkpointHead) this.#branchChanges.push(readerId);
	}
	#removeCheckpoint(state) {
		state.active = false;
		if (state.previous) state.previous.next = state.next;
		else this.#checkpointHead = state.next;
		if (state.next) state.next.previous = state.previous;
		else this.#checkpointTail = state.previous;
		state.previous = void 0;
		state.next = void 0;
	}
	/**
	* Keep committed-boundary reader dependencies in this candidate without
	* staging selector history from a speculative branch. Stores are pinned
	* before validation so their root projection participates in the read cut.
	*/
	preserveReaders(readers) {
		if (this.#closed) throw new Error("Cannot preserve readers in a closed store transaction");
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
	/**
	* Remove superseded reader observations from this candidate. Store snapshots
	* stay pinned: even a reader that leaves the candidate participated in its
	* validation cut, and its stores may still be shared by other readers.
	*/
	dropReaders(readerIds) {
		if (this.#closed) throw new Error("Cannot drop readers from a closed store transaction");
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
	#pinStore(store) {
		if (this.#snapshots.has(store)) return;
		if (store.mutationEpoch > this.#startedEpoch) this.#discoveredAfterMutation = true;
		const snapshot = store.beginRender(this.rootId, this.options);
		this.#snapshots.set(store, snapshot);
		this.#states.set(store, snapshot.state);
	}
	#setJournaled(map, key, value) {
		if (this.#checkpointHead) {
			const existed = map.has(key);
			const previous = map.get(key);
			this.#journal.push(() => {
				if (existed) map.set(key, previous);
				else map.delete(key);
			});
		}
		map.set(key, value);
	}
	#deleteJournaled(map, key) {
		if (!map.has(key)) return;
		if (this.#checkpointHead) {
			const previous = map.get(key);
			this.#journal.push(() => map.set(key, previous));
		}
		map.delete(key);
	}
	read(source, readerId) {
		if (this.#closed) throw new Error("Cannot read a closed store transaction");
		if (!readerId) throw new Error("A store reader requires a site ID");
		const cached = this.#values.get(readerId);
		if (cached) {
			if (cached.source !== source) throw new Error("Store reader changed its source within one candidate");
			return cached.value;
		}
		const stores = storesForSource(source);
		const previous = /* @__PURE__ */ new Map();
		for (const store of stores) {
			this.#pinStore(store);
			for (const [selection, value] of store._readerValuesFor(this.rootId, readerId)) previous.set(selection, value);
		}
		const session = new StoreReadSession(this.rootId, readerId, this.options.transitions ?? [], previous, this.#states);
		const value = source.read(session);
		this.#setJournaled(this.#readers, readerId, new Set(stores));
		for (const store of stores) {
			let pending = this.#pending.get(store);
			if (!pending) {
				pending = /* @__PURE__ */ new Map();
				this.#setJournaled(this.#pending, store, pending);
			}
			this.#setJournaled(pending, readerId, session.next);
		}
		this.#setJournaled(this.#values, readerId, {
			source,
			value
		});
		this.#recordBranchChange(readerId);
		return value;
	}
	validate() {
		return !this.#closed && !this.#discoveredAfterMutation && [...this.#snapshots.values()].every((snapshot) => snapshot.validate());
	}
	/** Call only after successful host commit and its pre-host validation. */
	commitAfterValidatedRender() {
		if (this.#closed) return;
		for (const [store, pending] of this.#pending) store._commitReaderValues(this.rootId, pending);
		this.#closed = true;
		this.#releaseSavepoints();
	}
	discard() {
		this.#closed = true;
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
			state.previous = void 0;
			state.next = void 0;
			state = next;
		}
		this.#checkpointHead = void 0;
		this.#checkpointTail = void 0;
		this.#checkpointState = /* @__PURE__ */ new WeakMap();
	}
};
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/snapshot/src/async_resource_runtime.ts
/**
* A small host-independent wrapper around promise-like values.
*
* Resources observe an already-created thenable; they do not start fetches,
* cancel providers, or retain work after the resource itself is unreachable.
*/
var pendingTokenBrand = Symbol("native.resource.pending");
var rejectionBrand = Symbol("native.resource.rejection");
var ResourceRejection = class extends Error {
	resource;
	reason;
	[rejectionBrand] = true;
	kind = "resource-rejection";
	constructor(resource, reason) {
		super("An async resource was rejected");
		this.resource = resource;
		this.reason = reason;
		this.name = "ResourceRejection";
	}
};
function reportResourceListenerError(error) {
	console.error("AsyncResource subscriber failed", error);
}
/**
* A stable record for one PromiseLike. `read()` returns its value, or throws a
* recognizable pending token/rejection. Settlement is one-shot even for
* synchronous or hostile thenables.
*/
var AsyncResource = class {
	reportListenerError;
	#status = Object.freeze({
		status: "pending",
		version: 0
	});
	#pendingToken;
	#listeners = /* @__PURE__ */ new Set();
	constructor(thenable, reportListenerError = reportResourceListenerError, beforeObserve) {
		this.reportListenerError = reportListenerError;
		this.#pendingToken = Object.freeze({
			[pendingTokenBrand]: true,
			kind: "pending-resource",
			resource: this,
			version: 0
		});
		beforeObserve?.(this);
		this.#observe(thenable);
	}
	get status() {
		return this.#status;
	}
	get version() {
		return this.#status.version;
	}
	read() {
		const status = this.#status;
		if (status.status === "fulfilled") return status.value;
		if (status.status === "rejected") throw status.rejection;
		throw this.#pendingToken;
	}
	/** Subscribe to the single pending-to-settled transition. */
	subscribe(listener) {
		if (this.#status.status !== "pending") return () => {};
		this.#listeners.add(listener);
		let active = true;
		return () => {
			if (!active) return;
			active = false;
			this.#listeners.delete(listener);
		};
	}
	#observe(thenable) {
		this.#adopt(thenable, /* @__PURE__ */ new Set(), true);
	}
	#adopt(value, seen, requireThenable = false) {
		for (;;) {
			if ((typeof value !== "object" || value === null) && typeof value !== "function") {
				if (requireThenable) this.#reject(/* @__PURE__ */ new TypeError("AsyncResource requires a thenable"));
				else this.#fulfill(value);
				return;
			}
			const objectValue = value;
			if (seen.has(objectValue)) {
				this.#reject(/* @__PURE__ */ new TypeError("Thenable resolution cycle"));
				return;
			}
			let then;
			try {
				then = value.then;
			} catch (error) {
				this.#reject(error);
				return;
			}
			if (typeof then !== "function") {
				if (requireThenable) this.#reject(/* @__PURE__ */ new TypeError("AsyncResource requires a thenable"));
				else this.#fulfill(value);
				return;
			}
			seen.add(objectValue);
			let called = false;
			let invoking = true;
			let nextValue;
			let resolvedSynchronously = false;
			let rejectedSynchronously = false;
			let rejectionReason;
			const resolve = (next) => {
				if (called) return;
				called = true;
				if (invoking) {
					nextValue = next;
					resolvedSynchronously = true;
				} else this.#adopt(next, seen);
			};
			const reject = (reason) => {
				if (called) return;
				called = true;
				if (invoking) {
					rejectionReason = reason;
					rejectedSynchronously = true;
				} else this.#reject(reason);
			};
			try {
				then.call(objectValue, resolve, reject);
			} catch (error) {
				if (!called) {
					called = true;
					rejectionReason = error;
					rejectedSynchronously = true;
				}
			}
			invoking = false;
			if (rejectedSynchronously) {
				this.#reject(rejectionReason);
				return;
			}
			if (!resolvedSynchronously) return;
			value = nextValue;
			requireThenable = false;
		}
	}
	#fulfill(value) {
		if (this.#status.status !== "pending") return;
		this.#status = Object.freeze({
			status: "fulfilled",
			version: 1,
			value
		});
		this.#notify();
	}
	#reject(reason) {
		if (this.#status.status !== "pending") return;
		const rejection = new ResourceRejection(this, reason);
		this.#status = Object.freeze({
			status: "rejected",
			version: 1,
			reason,
			rejection
		});
		this.#notify();
	}
	#notify() {
		const status = this.#status;
		const listeners = [...this.#listeners];
		this.#listeners.clear();
		for (const listener of listeners) try {
			listener(this, status);
		} catch (error) {
			try {
				this.reportListenerError(error);
			} catch {}
		}
	}
};
/** True for the structured token thrown by a pending resource's read(). */
function isPendingResourceToken(value) {
	return typeof value === "object" && value !== null && value[pendingTokenBrand] === true;
}
/**
* A caller-owned identity table. The WeakMap deduplicates object/function
* thenables without keeping keys alive; each table has independent identity.
*/
var AsyncResourceTable = class {
	reportListenerError;
	#resources = /* @__PURE__ */ new WeakMap();
	constructor(reportListenerError = reportResourceListenerError) {
		this.reportListenerError = reportListenerError;
	}
	from(thenable) {
		if ((typeof thenable !== "object" || thenable === null) && typeof thenable !== "function") throw new TypeError("AsyncResourceTable requires an object thenable");
		const key = thenable;
		let resource = this.#resources.get(key);
		if (!resource) resource = new AsyncResource(thenable, this.reportListenerError, (created) => this.#resources.set(key, created));
		return resource;
	}
};
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/snapshot/src/resource_read_set.ts
/** Candidate-local async reads; no subscriptions or provider cancellation. */
var ResourceReadSet = class {
	table;
	#versions = /* @__PURE__ */ new Map();
	#closed = false;
	constructor(table) {
		this.table = table;
	}
	read(source) {
		if (this.#closed) throw new Error("Resource read set is closed");
		const resource = source instanceof AsyncResource ? source : this.table.from(source);
		if (!this.#versions.has(resource)) this.#versions.set(resource, resource.version);
		return resource.read();
	}
	get pending() {
		return [...this.#versions.keys()].filter((resource) => resource.status.status === "pending");
	}
	validate() {
		return !this.#closed && [...this.#versions].every(([resource, version]) => resource.version === version);
	}
	discard() {
		this.#closed = true;
		this.#versions.clear();
	}
};
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/snapshot/src/pending_state_changes.ts
/**
* Ordered, owner/site-coalesced dirty state journal.
*
* Keys live in the owner/site cache and are linked only while pending. That
* keeps the per-frame hot path to field updates and pointer changes, while
* allowing an acknowledged key to re-enter at the end of the queue.
*/
var PendingStateChanges = class {
	#keysByOwner = /* @__PURE__ */ new Map();
	#keysByIdentity = /* @__PURE__ */ new WeakMap();
	#head;
	#tail;
	#size = 0;
	get size() {
		return this.#size;
	}
	/** Keep the public journal's historical latest-arrival/reference semantics. */
	set(change) {
		let key = change.cellIdentity ? this.#keysByIdentity.get(change.cellIdentity) : void 0;
		if (!key?.alive || key.owner !== change.owner || key.site !== change.site) {
			key = this.#keyForOwnerSite(change.owner, change.site, true);
			if (change.cellIdentity) this.#keysByIdentity.set(change.cellIdentity, key);
		}
		if (change.cellIdentity) key.cellIdentity = change.cellIdentity;
		key.legacy = change;
		key.cellVersion = void 0;
		key.cellHandle = void 0;
		this.#enqueue(key);
	}
	/** Store native dirty-cell notifications without allocating StateChange records. */
	setCell(handle, version) {
		let key = this.#keysByIdentity.get(handle.cellIdentity);
		if (!key?.alive || key.owner !== handle.owner || key.site !== handle.site) {
			key = this.#keyForOwnerSite(handle.owner, handle.site, true);
			this.#keysByIdentity.set(handle.cellIdentity, key);
		}
		if (key.cellIdentity !== handle.cellIdentity) key.cellVersion = void 0;
		key.cellIdentity = handle.cellIdentity;
		key.cellHandle = handle;
		key.legacy = void 0;
		if (key.cellVersion === void 0 || version > key.cellVersion) key.cellVersion = version;
		this.#enqueue(key);
	}
	/** Capture an independent array; native records are fresh snapshots. */
	capture() {
		const captured = [];
		for (let key = this.#head; key; key = key.next) if (key.legacy) captured.push(key.legacy);
		else if (key.cellVersion !== void 0 && key.cellIdentity) captured.push({
			owner: key.owner,
			site: key.site,
			version: key.cellVersion,
			cellIdentity: key.cellIdentity
		});
		return captured;
	}
	/**
	* Capture a snapshot-free native cut into caller-owned, pre-sized reusable
	* buffers. Capacity must cover the current queue; legacy entries or
	* insufficient capacity return null and scrub the partially written prefix.
	*/
	captureNative(handles, versions) {
		let count = 0;
		for (let key = this.#head; key; key = key.next) {
			if (key.legacy || !key.cellHandle || key.cellVersion === void 0) {
				this.#scrubNativePrefix(handles, versions, count);
				return null;
			}
			if (count >= handles.length || count >= versions.length) {
				this.#scrubNativePrefix(handles, versions, count);
				return null;
			}
			handles[count] = key.cellHandle;
			versions[count] = key.cellVersion;
			count++;
		}
		return count;
	}
	values() {
		return this.capture().values();
	}
	clear() {
		for (let key = this.#head; key;) {
			const next = key.next;
			this.#removePending(key);
			key.cellIdentity = void 0;
			key = next;
		}
		this.#keysByOwner.clear();
		this.#keysByIdentity = /* @__PURE__ */ new WeakMap();
	}
	/** Remove captured entries that have not advanced past their captured version. */
	clearThrough(captured) {
		for (const change of captured) {
			let key = change.cellIdentity ? this.#keysByIdentity.get(change.cellIdentity) : void 0;
			if (!key?.alive || key.owner !== change.owner || key.site !== change.site) {
				key = this.#keyForOwnerSite(change.owner, change.site, false);
				if (key && change.cellIdentity) this.#keysByIdentity.set(change.cellIdentity, key);
			}
			if (!key?.queued) continue;
			const version = key.cellVersion ?? key.legacy?.version;
			if (version !== void 0 && version <= change.version) this.#removePending(key);
		}
	}
	/** Acknowledge only the exact native handles and versions in a captured cut. */
	clearNativeThrough(handles, versions, count) {
		if (!Number.isSafeInteger(count) || count < 0 || count > handles.length || count > versions.length) throw new RangeError("Invalid native state change count");
		for (let index = 0; index < count; index++) {
			const handle = handles[index];
			if (!handle || !Number.isSafeInteger(versions[index])) continue;
			let key = this.#keysByIdentity.get(handle.cellIdentity);
			if (!key?.alive || key.owner !== handle.owner || key.site !== handle.site) key = this.#keyForOwnerSite(handle.owner, handle.site, false);
			if (!key?.alive || !key.queued || key.owner !== handle.owner || key.site !== handle.site || key.cellIdentity !== handle.cellIdentity || key.cellHandle?.cellIdentity !== handle.cellIdentity) continue;
			if (key.cellVersion !== void 0 && key.cellVersion <= versions[index]) this.#removePending(key);
		}
	}
	/** Remove an owner's pending entries and cached identities. */
	dropOwner(owner) {
		const keysBySite = this.#keysByOwner.get(owner);
		if (!keysBySite) return;
		for (const key of keysBySite.values()) {
			key.alive = false;
			this.#removePending(key);
			key.cellIdentity = void 0;
		}
		this.#keysByOwner.delete(owner);
	}
	#enqueue(key) {
		if (key.queued) return;
		key.queued = true;
		key.prev = this.#tail;
		key.next = void 0;
		if (this.#tail) this.#tail.next = key;
		else this.#head = key;
		this.#tail = key;
		this.#size++;
	}
	#unlink(key) {
		if (!key.queued) return;
		if (key.prev) key.prev.next = key.next;
		else this.#head = key.next;
		if (key.next) key.next.prev = key.prev;
		else this.#tail = key.prev;
		key.prev = void 0;
		key.next = void 0;
		key.queued = false;
		this.#size--;
	}
	#removePending(key) {
		this.#unlink(key);
		key.legacy = void 0;
		key.cellVersion = void 0;
		key.cellHandle = void 0;
	}
	#scrubNativePrefix(handles, versions, count) {
		for (let index = 0; index < count; index++) {
			handles[index] = void 0;
			versions[index] = 0;
		}
	}
	#keyForOwnerSite(owner, site, create) {
		let keysBySite = this.#keysByOwner.get(owner);
		if (!keysBySite) {
			if (!create) return void 0;
			keysBySite = /* @__PURE__ */ new Map();
			this.#keysByOwner.set(owner, keysBySite);
		}
		let key = keysBySite.get(site);
		if (!key && create) {
			key = {
				alive: true,
				owner,
				site,
				queued: false
			};
			keysBySite.set(site, key);
		}
		return key;
	}
};
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/snapshot/src/structural_count_probe.ts
var roots = /* @__PURE__ */ new Map();
var enabled = false;
var active = null;
var configureStructuralCountProbe = (value) => {
	if (active) throw new Error("Cannot change structural probe mode in a count window");
	enabled = value;
};
var registerStructuralRoot = (root, rootId) => {
	if (active && root !== active.root) active.errors.push("another root created inside edit window");
	roots.set(root, rootId);
};
var unregisterStructuralRoot = (root) => {
	if (active?.root === root) active.errors.push("root disposed inside edit window");
	roots.delete(root);
};
var beginStructuralCountWindow = (root, label) => {
	if (!enabled) throw new Error("Structural count mode is disabled");
	if (active) throw new Error("A structural count window is already active");
	const rootId = roots.get(root);
	if (roots.size !== 1 || !rootId) throw new Error("Structural count window requires exactly one registered root");
	if (!label) throw new Error("Structural count window needs a label");
	active = {
		root,
		rootId,
		label,
		counts: /* @__PURE__ */ new Map(),
		bails: [],
		errors: [],
		route: null,
		flushDepth: 0,
		flushes: 0
	};
};
var structuralCount = (name, unit, site, amount = 1) => {
	const window = active;
	if (!window) return;
	if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0) {
		window.errors.push("invalid structural count amount");
		return;
	}
	const prior = window.counts.get(name);
	if (prior && (prior.unit !== unit || prior.site !== site)) {
		window.errors.push(`mixed authority: ${name}`);
		return;
	}
	if (prior && !Number.isSafeInteger(prior.value + amount)) {
		window.errors.push("structural count overflow");
		return;
	}
	if (prior) prior.value += amount;
	else window.counts.set(name, {
		value: amount,
		unit,
		site
	});
};
var structuralRoute = (route) => {
	if (!active) return;
	if (active.route !== null && active.route !== route) active.errors.push(`multiple root routes: ${active.route}, ${route}`);
	active.route = route;
};
var structuralBail = (reason) => {
	active?.bails.push(reason);
};
var structuralError = (reason) => {
	active?.errors.push(reason);
};
var enterStructuralFlush = (root) => {
	if (!active) return;
	if (root !== active.root) active.errors.push("another root flushed inside edit window");
	active.flushDepth++;
	active.flushes++;
	if (active.flushDepth !== 1) active.errors.push("reentrant root flush");
	structuralCount("root.flush.entries", "event", "component_state_runtime.ts:flush");
};
var leaveStructuralFlush = (root) => {
	if (!active) return;
	if (root !== active.root) active.errors.push("another root left edit window");
	active.flushDepth--;
	if (active.flushDepth < 0) active.errors.push("root flush depth underflow");
};
var endStructuralCountWindow = (root) => {
	const window = active;
	if (!window || root !== window.root) throw new Error("Structural count window root mismatch");
	active = null;
	if (window.flushes !== 1) window.errors.push(`expected one flush, got ${window.flushes}`);
	if (window.flushDepth !== 0) window.errors.push("root flush remained active");
	if (roots.size !== 1 || roots.get(root) !== window.rootId) window.errors.push("single bound root not retained through edit window");
	if (!window.route) window.errors.push("missing exclusive root route");
	const counts = {};
	for (const [name, value] of window.counts) counts[name] = Object.freeze({ ...value });
	return Object.freeze({
		coverageId: "recording-b-probe-coverage-v1",
		label: window.label,
		rootId: window.rootId,
		phase: "edit",
		completed: window.errors.length === 0 && window.bails.length === 0,
		route: window.route,
		bails: Object.freeze([...window.bails]),
		errors: Object.freeze([...window.errors]),
		counts: Object.freeze(counts),
		missing: Object.freeze({
			"host.dispose.success": {
				value: null,
				reason: "DOM host has no dispose implementation"
			},
			"bucket.stats.public-access": {
				value: null,
				reason: "Retained VDOM bucket stats have no public accessor; use separated probes, not invented gauges"
			},
			"vdom.prepare.exact-bail": {
				value: null,
				reason: "Root records VDOM decline; all preparer early-return causes are not independently identified"
			},
			"gc.deferred.work": {
				value: null,
				reason: "No synchronous iteration authority; requires separate GC evidence"
			},
			"user.effect.body.work": {
				value: null,
				reason: "User callback internals are outside runtime counter authority"
			},
			"bucket.native-splice.actual-shifts": {
				value: null,
				reason: "JS engine internal moves are not observable; estimate separately"
			},
			"host.layout-paint": {
				value: null,
				reason: "Synchronous count window does not measure presentation"
			}
		})
	});
};
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/snapshot/src/compiled_state_layout.ts
var layoutRecords = /* @__PURE__ */ new WeakMap();
var makeLayoutSignature = (programId, slots) => JSON.stringify([programId ?? null, slots.map(({ siteId, slot }) => [siteId, slot])]);
function recordForLayout(input) {
	if (typeof input !== "object" || input === null) throw new TypeError("Compiled state layout must be an object");
	const cached = layoutRecords.get(input);
	if (cached) return cached;
	if (input.schemaVersion !== 1 || !Array.isArray(input.slots)) throw new TypeError("Unsupported compiled state layout");
	if (input.programId !== void 0 && (typeof input.programId !== "string" || input.programId.length === 0)) throw new TypeError("Invalid compiled state layout program ID");
	const sites = /* @__PURE__ */ new Set();
	const slots = input.slots.map((entry, index) => {
		if (!entry || typeof entry.siteId !== "string" || entry.siteId.length === 0 || !Number.isSafeInteger(entry.slot) || entry.slot !== index || sites.has(entry.siteId)) throw new TypeError("Invalid compiled state layout slot");
		sites.add(entry.siteId);
		return Object.freeze({
			siteId: entry.siteId,
			slot: entry.slot
		});
	});
	const normalized = Object.freeze({
		schemaVersion: 1,
		...input.programId !== void 0 ? { programId: input.programId } : {},
		slots: Object.freeze(slots)
	});
	const record = {
		layout: normalized,
		signature: makeLayoutSignature(input.programId, slots)
	};
	layoutRecords.set(input, record);
	layoutRecords.set(normalized, record);
	return record;
}
/** Validate and defensively snapshot metadata once per compiler-owned object. */
function normalizeCompiledStateLayout(input) {
	return recordForLayout(input).layout;
}
function compiledStateLayoutSignature(layout) {
	return recordForLayout(layout).signature;
}
/** Resolve a hook slot once per immutable layout descriptor. */
function compiledStateLayoutSlot(layout, siteId) {
	const record = recordForLayout(layout);
	let bySite = record.slotsBySite;
	if (!bySite) {
		bySite = /* @__PURE__ */ new Map();
		for (const slot of record.layout.slots) bySite.set(slot.siteId, slot.slot);
		record.slotsBySite = bySite;
	}
	return bySite.get(siteId);
}
/** Validate and associate one immutable owner update program with a layout. */
function associateCompiledOwnerUpdateProgram(layout, input) {
	const record = recordForLayout(layout);
	if (typeof input !== "object" || input === null) throw new TypeError("Compiled owner update program must be an object");
	const schemaVersion = input.schemaVersion;
	const programId = input.programId;
	const slotCount = input.slotCount;
	const inputSinkIds = input.sinkIds;
	const executeCut = input.executeCut;
	if (schemaVersion !== 2 || typeof programId !== "string" || !programId || record.layout.programId !== programId || !Number.isSafeInteger(slotCount) || slotCount !== record.layout.slots.length || slotCount < 1 || slotCount > 30 || !Array.isArray(inputSinkIds) || inputSinkIds.length < 1 || inputSinkIds.length > 30 || typeof executeCut !== "function") throw new TypeError("Invalid compiled owner update program");
	const seen = /* @__PURE__ */ new Set();
	const sinkIds = [];
	for (let index = 0; index < inputSinkIds.length; index++) {
		const sinkId = inputSinkIds[index];
		if (typeof sinkId !== "string" || !sinkId || seen.has(sinkId)) throw new TypeError("Invalid compiled owner update sink ID");
		seen.add(sinkId);
		sinkIds.push(sinkId);
	}
	const current = record.ownerUpdateProgram;
	if (current) {
		if (current.schemaVersion !== schemaVersion || current.programId !== programId || current.slotCount !== slotCount || current.executeCut !== executeCut || current.sinkIds.length !== sinkIds.length || current.sinkIds.some((sinkId, index) => sinkId !== sinkIds[index])) throw new TypeError("Conflicting compiled owner update program");
		return current;
	}
	const snapshot = Object.freeze({
		schemaVersion: 2,
		programId,
		slotCount,
		sinkIds: Object.freeze(sinkIds),
		executeCut
	});
	record.ownerUpdateProgram = snapshot;
	return snapshot;
}
/** Resolve a program during VDOM row preparation, not during cut execution. */
function compiledOwnerUpdateProgramFor(layout) {
	return recordForLayout(layout).ownerUpdateProgram;
}
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/snapshot/src/jsx_binding_runtime.ts
var keyedOwnerRegionTag = Symbol("keyed-owner-region");
var keyedOwnerVersionTag = Symbol("keyed-owner-version");
var keyedOwnerVersions = /* @__PURE__ */ new WeakSet();
/** Create a trusted version token. Generated code should retain it across reorder-only updates. */
var createKeyedOwnerVersion = () => {
	const version = Object.freeze({});
	keyedOwnerVersions.add(version);
	return version;
};
/** Compiler hint for a homogeneous keyed component list with stable identities. */
var keyedOwnerChildren = (regionId, children, version) => {
	if (!regionId) throw new Error("Keyed owner region ID must not be empty");
	if (version !== void 0 && !keyedOwnerVersions.has(version)) throw new TypeError("Keyed owner version must come from the runtime helper");
	const marked = [...children];
	Object.defineProperty(marked, keyedOwnerRegionTag, { value: regionId });
	if (version !== void 0) Object.defineProperty(marked, keyedOwnerVersionTag, { value: version });
	return marked;
};
var getKeyedOwnerRegionId = (value) => Array.isArray(value) && keyedOwnerRegionTag in value ? value[keyedOwnerRegionTag] : null;
var getKeyedOwnerVersion = (value) => Array.isArray(value) && keyedOwnerVersionTag in value ? value[keyedOwnerVersionTag] : null;
/** Preserve compiler-owned keyed-region metadata when a runtime maps an array. */
var copyKeyedOwnerMetadata = (source, target) => {
	const regionId = getKeyedOwnerRegionId(source);
	if (regionId !== null) {
		Object.defineProperty(target, keyedOwnerRegionTag, { value: regionId });
		const version = getKeyedOwnerVersion(source);
		if (version !== null) Object.defineProperty(target, keyedOwnerVersionTag, { value: version });
	}
	return target;
};
var Fragment = Symbol("jsx-runtime-fragment");
/** Classic JSX factory used by the TSX prototype page. */
function jsx(type, props, ...children) {
	const next = { ...props ?? {} };
	if (children.length === 1) next.children = freezeChild(children[0]);
	else if (children.length > 1) next.children = Object.freeze(children.map(freezeChild));
	else if (Array.isArray(next.children)) next.children = Object.freeze(next.children.map(freezeChild));
	Object.freeze(next);
	return Object.freeze({
		type,
		props: next
	});
}
var freezeChild = (node) => {
	if (!Array.isArray(node)) return node;
	const frozen = node.map(freezeChild);
	copyKeyedOwnerMetadata(node, frozen);
	return Object.freeze(frozen);
};
var ScalarSource = class {
	id;
	value;
	constructor(id, value) {
		this.id = id;
		this.value = value;
	}
};
/** Contiguous per-entity values for a compiler-known trait/source slot. */
var NumericColumn = class {
	id;
	sourceSlot;
	values;
	source;
	constructor(id, sourceSlot, values) {
		this.id = id;
		this.sourceSlot = sourceSlot;
		this.values = values;
		this.source = new ScalarSource(id, 0);
	}
	/**
	* Ensure storage for at least `minCapacity` rows. Growth doubles the current
	* capacity (using one slot as the zero-capacity seed), or uses the requested
	* capacity when that is larger. Existing values are copied and the new tail
	* is zero-filled by Float64Array. The column and its source identities stay
	* stable; callers should reserve while activating rows, not during a flush.
	*/
	reserve(minCapacity) {
		if (!Number.isSafeInteger(minCapacity) || minCapacity < 0) throw new RangeError("Numeric column capacity must be a nonnegative safe integer");
		const current = this.values;
		if (current.length >= minCapacity) return;
		const geometricCapacity = Math.max(1, current.length * 2);
		const next = new Float64Array(Math.max(minCapacity, geometricCapacity));
		next.set(current);
		this.values = next;
	}
};
var bindingTag = Symbol("jsx-runtime-binding");
var readBoundValue = (binding) => binding.read ? binding.read() : binding.project(binding.column ? binding.column.values[binding.entityIndex] : binding.source.value);
var isBoundValue = (value) => typeof value === "object" && value !== null && value[bindingTag] === true;
var getBoundValue = (value) => isBoundValue(value) ? value : null;
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/snapshot/src/world_dirty_journal.ts
var preparedMembershipAuthority = {};
/** Runtime-opaque token; private data retains one bucket/node, never the journal. */
var PreparedDirtyMembershipToken = class {
	#journalIdentity;
	#entry;
	constructor(authority, journalIdentity, entry) {
		if (authority !== preparedMembershipAuthority) throw new TypeError("Prepared dirty membership is not constructible");
		this.#journalIdentity = journalIdentity;
		this.#entry = entry;
		Object.freeze(this);
	}
	static resolve(value, journalIdentity) {
		if (typeof value !== "object" && typeof value !== "function" || value === null || !(#entry in value)) return null;
		const token = value;
		const entry = token.#entry;
		return token.#journalIdentity === journalIdentity && entry && !entry.bucket.retired ? entry : null;
	}
	static retire(value, journalIdentity) {
		if (typeof value !== "object" && typeof value !== "function" || value === null || !(#entry in value)) return;
		const token = value;
		if (token.#journalIdentity !== journalIdentity) return;
		token.#journalIdentity = void 0;
		token.#entry = void 0;
	}
};
/**
* Owner-major ordered dirty membership for OwnerStateWorld.
*
* Buckets and site nodes are reused after acknowledgement or clear, then
* released by removeOwner. This class stores no cell values, handles, sources,
* closures, or payloads.
*/
var WorldDirtyJournal = class {
	#identity = {};
	#owners = /* @__PURE__ */ new Map();
	#firstOwner;
	#lastOwner;
	#activeOwnerCount = 0;
	/** Number of owners with at least one active dirty site. */
	get size() {
		return this.#activeOwnerCount;
	}
	/** Test active membership without traversing the pending journal. */
	has(owner, site) {
		return this.#owners.get(owner)?.sites.get(site)?.active === true;
	}
	/** Mark an owner/site dirty, coalescing repeated writes without reordering. */
	mark(owner, site) {
		const entry = this.#entryFor(owner, site);
		this.#markEntry(entry.bucket, entry);
	}
	/** Prepare one reusable node; subsequent marks/deletes avoid owner/site Maps. */
	prepareMembership(owner, site) {
		const entry = this.#entryFor(owner, site);
		if (!entry.prepared) entry.prepared = new PreparedDirtyMembershipToken(preparedMembershipAuthority, this.#identity, entry);
		return entry.prepared;
	}
	/** Mark a previously prepared node in O(1); foreign or retired nodes decline. */
	markPrepared(token) {
		const data = PreparedDirtyMembershipToken.resolve(token, this.#identity);
		if (!data) return false;
		this.#markEntry(data.bucket, data);
		return true;
	}
	/** Delete a previously prepared node in O(1); foreign or retired nodes decline. */
	deletePrepared(token) {
		const data = PreparedDirtyMembershipToken.resolve(token, this.#identity);
		if (!data) return false;
		this.#deleteEntry(data.bucket, data);
		return true;
	}
	#entryFor(owner, site) {
		let bucket = this.#owners.get(owner);
		if (!bucket) {
			bucket = {
				owner,
				sites: /* @__PURE__ */ new Map(),
				retired: false,
				active: false
			};
			this.#owners.set(owner, bucket);
		}
		let entry = bucket.sites.get(site);
		if (!entry) {
			entry = {
				site,
				bucket,
				active: false
			};
			bucket.sites.set(site, entry);
		}
		return entry;
	}
	#markEntry(bucket, entry) {
		if (entry.active) return;
		entry.active = true;
		entry.previous = bucket.lastSite;
		entry.next = void 0;
		if (bucket.lastSite) bucket.lastSite.next = entry;
		else bucket.firstSite = entry;
		bucket.lastSite = entry;
		if (!bucket.active) this.#activateOwner(bucket);
	}
	/** Remove one dirty site; a later mark re-enters at the tail. */
	delete(owner, site) {
		const bucket = this.#owners.get(owner);
		const entry = bucket?.sites.get(site);
		if (!bucket || !entry?.active) return;
		this.#deleteEntry(bucket, entry);
	}
	#deleteEntry(bucket, entry) {
		if (!entry.active) return;
		this.#unlinkSite(bucket, entry);
		if (!bucket.firstSite) this.#deactivateOwner(bucket);
	}
	/** Remove all dirty and reusable journal metadata for a destroyed owner. */
	removeOwner(owner) {
		const bucket = this.#owners.get(owner);
		if (!bucket) return;
		if (bucket.active) this.#deactivateOwner(bucket);
		bucket.retired = true;
		for (const entry of bucket.sites.values()) {
			entry.active = false;
			entry.previous = void 0;
			entry.next = void 0;
			PreparedDirtyMembershipToken.retire(entry.prepared, this.#identity);
			entry.prepared = void 0;
		}
		bucket.firstSite = void 0;
		bucket.lastSite = void 0;
		bucket.sites.clear();
		this.#owners.delete(owner);
	}
	/** Clear active work while retaining buckets and site nodes for reuse. */
	clear() {
		for (let bucket = this.#firstOwner; bucket;) {
			const nextBucket = bucket.next;
			for (let entry = bucket.firstSite; entry;) {
				const nextEntry = entry.next;
				entry.active = false;
				entry.previous = void 0;
				entry.next = void 0;
				entry = nextEntry;
			}
			bucket.active = false;
			bucket.firstSite = void 0;
			bucket.lastSite = void 0;
			bucket.previous = void 0;
			bucket.next = void 0;
			bucket = nextBucket;
		}
		this.#firstOwner = void 0;
		this.#lastOwner = void 0;
		this.#activeOwnerCount = 0;
	}
	/** Enumerate active pairs in owner insertion order, then site insertion order. */
	*entries() {
		for (let bucket = this.#firstOwner; bucket; bucket = bucket.next) for (let entry = bucket.firstSite; entry; entry = entry.next) yield [bucket.owner, entry.site];
	}
	#activateOwner(bucket) {
		bucket.active = true;
		bucket.previous = this.#lastOwner;
		bucket.next = void 0;
		if (this.#lastOwner) this.#lastOwner.next = bucket;
		else this.#firstOwner = bucket;
		this.#lastOwner = bucket;
		this.#activeOwnerCount++;
	}
	#deactivateOwner(bucket) {
		if (bucket.previous) bucket.previous.next = bucket.next;
		else this.#firstOwner = bucket.next;
		if (bucket.next) bucket.next.previous = bucket.previous;
		else this.#lastOwner = bucket.previous;
		bucket.previous = void 0;
		bucket.next = void 0;
		bucket.active = false;
		this.#activeOwnerCount--;
	}
	#unlinkSite(bucket, entry) {
		if (entry.previous) entry.previous.next = entry.next;
		else bucket.firstSite = entry.next;
		if (entry.next) entry.next.previous = entry.previous;
		else bucket.lastSite = entry.previous;
		entry.previous = void 0;
		entry.next = void 0;
		entry.active = false;
	}
};
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/snapshot/src/owner_state_world.ts
function getLaneBackedValue() {
	const lane = this.lane;
	return lane ? lane.column.values[lane.row] : this.boxedValue;
}
function setLaneBackedValue(next) {
	const lane = this.lane;
	if (!lane) {
		this.boxedValue = next;
		return;
	}
	if (typeof next !== "number") throw new TypeError("Promote a numeric state cell before boxing it");
	lane.column.values[lane.row] = next;
}
var laneBackedValueDescriptor = {
	configurable: true,
	enumerable: true,
	get: getLaneBackedValue,
	set: setLaneBackedValue
};
/** Shared-from-birth accessor shape for cells born with a certified numeric slot. */
var compiledNumericStateCellPrototype = Object.create(Object.prototype, { value: laneBackedValueDescriptor });
function isCompiledNumericStateCell(cell) {
	return Object.getPrototypeOf(cell) === compiledNumericStateCellPrototype;
}
function makeCompiledNumericStateCell(args) {
	const cell = Object.create(compiledNumericStateCellPrototype);
	cell.boxedValue = args.value;
	cell.version = args.version;
	cell.stateLayout = args.layout;
	cell.numericLaneSlot = args.slot;
	cell.laneSlotResolved = args.laneSlotResolved;
	cell.source = args.source;
	cell.dispatch = args.dispatch;
	cell.lane = void 0;
	cell.cellIdentity = void 0;
	cell.cellHandle = void 0;
	cell.dirtyMembership = void 0;
	cell.rowLease = void 0;
	cell.rowView = void 0;
	cell.promoted = args.promoted;
	return cell;
}
/** Revocable, opaque authority for one committed cell. */
var CommittedCellCapability = class {
	#worldSecret;
	#owner;
	#site;
	#cell;
	constructor(worldSecret, owner, site, cell) {
		this.#worldSecret = worldSecret;
		this.#owner = owner;
		this.#site = site;
		this.#cell = cell;
		Object.setPrototypeOf(this, null);
		Object.freeze(this);
	}
	static resolve(candidate, worldSecret, owner, site) {
		if (typeof candidate !== "object" && typeof candidate !== "function" || candidate === null || !(#cell in candidate)) return null;
		const capability = candidate;
		return capability.#worldSecret === worldSecret && capability.#owner === owner && capability.#site === site ? capability.#cell : null;
	}
	static resolveLegacyChange(candidate, worldSecret, change) {
		if (typeof candidate !== "object" && typeof candidate !== "function" || candidate === null || !(#cell in candidate)) return null;
		const capability = candidate;
		if (capability.#worldSecret !== worldSecret) return null;
		const cell = capability.#cell;
		return capability.#owner === change.owner && capability.#site === change.site ? cell : null;
	}
	static revoke(candidate, worldSecret) {
		if (!(#cell in candidate)) return;
		const capability = candidate;
		if (capability.#worldSecret !== worldSecret) return;
		capability.#cell = null;
		capability.#worldSecret = null;
	}
};
/** A row-scoped lease, deliberately free of cell and World references. */
var NumericRowLease = class {
	#active = true;
	#owner;
	#layout;
	#row;
	#generation;
	#columns;
	#sources;
	#lanes;
	constructor(owner, layout, row, generation, columns) {
		this.#owner = owner;
		this.#layout = layout;
		this.#row = row;
		this.#generation = generation;
		this.#columns = [...columns];
		this.#sources = Array(columns.length);
		this.#lanes = Array(columns.length);
		Object.setPrototypeOf(this, null);
		Object.freeze(this);
	}
	static columns(candidate) {
		return candidate.#columns;
	}
	static sources(candidate) {
		return candidate.#sources;
	}
	static isCurrent(candidate, owner, site, layout, lane, slot, source) {
		if (typeof candidate !== "object" && typeof candidate !== "function" || candidate === null || !(#active in candidate)) return false;
		return candidate.#active && candidate.#owner === owner && candidate.#row === lane.row && candidate.#generation === lane.generation && candidate.#layout === layout && layout.slots[slot]?.siteId === site && candidate.#columns[slot] === lane.column && candidate.#sources[slot] === source && candidate.#lanes[slot] === lane && lane.owner === owner && lane.site === site;
	}
	static setSlot(candidate, slot, lane, source) {
		if (!candidate.#active) return;
		candidate.#sources[slot] = source;
		candidate.#lanes[slot] = lane;
	}
	static setSource(candidate, slot, source) {
		if (candidate.#active) candidate.#sources[slot] = source;
	}
	static clearSlot(candidate, slot) {
		candidate.#sources[slot] = void 0;
		candidate.#lanes[slot] = void 0;
	}
	static retire(candidate) {
		if (!candidate.#active) return;
		candidate.#sources.fill(void 0);
		candidate.#lanes.fill(void 0);
		candidate.#active = false;
	}
};
function makeNumericCellRowView(owner, site, layout, lease, lane, slot, source, sources, columns) {
	return Object.freeze({
		owner,
		site,
		layout,
		rowIdentity: lease,
		row: lane.row,
		generation: lane.generation,
		slot,
		lane,
		source,
		sources,
		columns
	});
}
function refreshNumericCellRowView(cell, owner, site) {
	const lane = cell.lane;
	const source = cell.source;
	const lease = cell.rowLease;
	const layout = cell.stateLayout;
	const slot = cell.numericLaneSlot;
	cell.rowView = lane && source && lease && layout && slot !== void 0 ? makeNumericCellRowView(owner, site, layout, lease, lane, slot, source, NumericRowLease.sources(lease), NumericRowLease.columns(lease)) : void 0;
}
/** Install the column as the only logical-value storage for a committed cell. */
function attachNumericLane(cell, lane, lease, layout, slot) {
	const current = cell.value;
	if (typeof current !== "number") throw new TypeError("Only numeric state cells can use numeric lanes");
	lane.column.values[lane.row] = current;
	cell.lane = lane;
	cell.rowLease = lease;
	NumericRowLease.setSlot(lease, slot, lane, cell.source);
	refreshNumericCellRowView(cell, lane.owner, lane.site);
	if (isCompiledNumericStateCell(cell)) cell.boxedValue = void 0;
	else Object.defineProperty(cell, "value", laneBackedValueDescriptor);
}
/** Restore an ordinary writable value before the row is cleared or reused. */
function detachNumericLane(cell) {
	const lane = cell.lane;
	if (!lane) return null;
	const value = lane.column.values[lane.row];
	if (cell.rowLease && cell.numericLaneSlot !== void 0) NumericRowLease.clearSlot(cell.rowLease, cell.numericLaneSlot);
	cell.rowLease = void 0;
	cell.rowView = void 0;
	if (isCompiledNumericStateCell(cell)) {
		cell.boxedValue = value;
		cell.lane = void 0;
	} else {
		Object.defineProperty(cell, "value", {
			configurable: true,
			enumerable: true,
			writable: true,
			value
		});
		cell.lane = void 0;
	}
	return lane;
}
/**
* Experimental owner-addressed hook storage.
*
* State is indexed by (owner entity, compiler site ID), never by call position.
* `resolveOwner` interns a component instance by its parent, lexical component
* site, and optional keyed-item identity. The compiler is expected to emit
* stable site IDs; the string is explicit here so the runtime can be evaluated
* before JSX lowering produces them.
*/
var OwnerStateWorld = class OwnerStateWorld {
	static #nextSourceId = 1;
	#nextOwner = 1;
	#owners = /* @__PURE__ */ new Map();
	#childrenBySlot = /* @__PURE__ */ new Map();
	#rootChildrenVersion = 0;
	#stateByOwner = /* @__PURE__ */ new Map();
	#numericLayouts = /* @__PURE__ */ new WeakMap();
	#identitySecret = Object.freeze({});
	#dirtyJournal = new WorldDirtyJournal();
	#changeListeners = /* @__PURE__ */ new Set();
	#dirtyCellListeners = [];
	#claimedRootIds = /* @__PURE__ */ new Map();
	#stagedOwners = /* @__PURE__ */ new Set();
	#layoutRecord(owner, layout) {
		if (!this.#owners.has(owner)) throw new Error(`Owner ${owner} is not alive`);
		const normalized = normalizeCompiledStateLayout(layout);
		const signature = compiledStateLayoutSignature(normalized);
		let storage = this.#numericLayouts.get(normalized);
		if (storage) {
			if (storage.signature !== signature) throw new Error("Compiled state layout descriptor changed");
			return storage;
		}
		const slotsBySite = /* @__PURE__ */ new Map();
		storage = {
			layout: normalized,
			signature,
			slotsBySite,
			columns: normalized.slots.map(({ siteId, slot }) => {
				slotsBySite.set(siteId, slot);
				return new NumericColumn(OwnerStateWorld.#nextSourceId++, slot, /* @__PURE__ */ new Float64Array(0));
			}),
			generations: [],
			freeRows: [],
			nextRow: 0,
			rowsByOwner: /* @__PURE__ */ new Map()
		};
		this.#numericLayouts.set(normalized, storage);
		return storage;
	}
	#ensureCellLayout(owner, site, cell, layout) {
		if (!layout) return;
		const normalized = normalizeCompiledStateLayout(layout);
		if (cell.stateLayout && cell.laneSlotResolved) {
			if (compiledStateLayoutSignature(cell.stateLayout) !== compiledStateLayoutSignature(normalized)) throw new Error("State cell received a different compiled layout");
			return;
		}
		let canonical = normalized;
		if (cell.stateLayout) {
			if (compiledStateLayoutSignature(cell.stateLayout) !== compiledStateLayoutSignature(normalized)) throw new Error("State cell received a different compiled layout");
			canonical = cell.stateLayout;
		}
		this.#layoutRecord(owner, canonical);
		cell.stateLayout = canonical;
		cell.numericLaneSlot = compiledStateLayoutSlot(canonical, site);
		cell.laneSlotResolved = true;
		if (cell.numericLaneSlot !== void 0 && typeof cell.value !== "number") cell.promoted = true;
	}
	#laneIsCurrent(owner, site, cell, lane) {
		return this.#owners.has(owner) && this.#stateByOwner.get(owner)?.get(site) === cell && this.#laneAddressIsCurrent(owner, site, cell, lane);
	}
	#laneAddressIsCurrent(owner, site, cell, lane) {
		const layout = cell.stateLayout;
		const slot = cell.numericLaneSlot;
		const lease = cell.rowLease;
		const source = cell.source;
		return !!layout && slot !== void 0 && !!lease && !!source && NumericRowLease.isCurrent(lease, owner, site, layout, lane, slot, source) && cell.lane === lane && cell.rowView?.rowIdentity === lease && !cell.promoted && typeof cell.value === "number";
	}
	#ensureNumericLane(owner, site, cell) {
		const layout = cell.stateLayout;
		if (!layout || cell.promoted) return null;
		const slot = cell.numericLaneSlot;
		if (slot === void 0) return null;
		if (typeof cell.value !== "number") {
			cell.promoted = true;
			this.#releaseNumericLane(owner, site, cell);
			return null;
		}
		const existing = cell.lane;
		if (existing && this.#laneAddressIsCurrent(owner, site, cell, existing)) return existing;
		const storage = this.#layoutRecord(owner, layout);
		if (existing) this.#releaseNumericLane(owner, site, cell);
		let row = storage.rowsByOwner.get(owner);
		if (!row) {
			const rowIndex = storage.freeRows.pop() ?? storage.nextRow++;
			const generation = storage.generations[rowIndex] ?? 1;
			storage.generations[rowIndex] = generation;
			for (const column of storage.columns) column.reserve(rowIndex + 1);
			row = {
				row: rowIndex,
				generation,
				cells: 0,
				lease: new NumericRowLease(owner, layout, rowIndex, generation, storage.columns)
			};
			storage.rowsByOwner.set(owner, row);
		}
		const column = storage.columns[slot];
		column.reserve(row.row + 1);
		const lane = Object.freeze({
			column,
			row: row.row,
			generation: row.generation,
			owner,
			site
		});
		row.cells++;
		attachNumericLane(cell, lane, row.lease, layout, slot);
		return lane;
	}
	#releaseNumericLane(owner, site, cell) {
		const lane = cell.lane;
		if (!lane) return;
		if (!detachNumericLane(cell)) return;
		const storage = cell.stateLayout ? this.#numericLayouts.get(cell.stateLayout) : void 0;
		const row = storage?.rowsByOwner.get(owner);
		const slot = storage?.slotsBySite.get(site);
		if (!storage || !row || slot === void 0 || row.row !== lane.row) return;
		lane.column.values[lane.row] = 0;
		row.cells--;
		if (row.cells !== 0) return;
		NumericRowLease.retire(row.lease);
		for (const column of storage.columns) column.values[row.row] = 0;
		const nextGeneration = row.generation + 1;
		storage.generations[row.row] = nextGeneration;
		storage.freeRows.push(row.row);
		storage.rowsByOwner.delete(owner);
	}
	#readStateValue(owner, site, cell) {
		return cell.value;
	}
	/** Begin an isolated owner/state view for one candidate preparation attempt. */
	beginPreparation() {
		let state = "open";
		let hasStateWrites = false;
		const privateOwners = /* @__PURE__ */ new Map();
		const privateSlots = /* @__PURE__ */ new Map();
		const expectedSlots = /* @__PURE__ */ new Map();
		const expectedCells = /* @__PURE__ */ new Map();
		const candidateCells = /* @__PURE__ */ new Map();
		const candidateInitialValues = /* @__PURE__ */ new Map();
		const candidateDispatches = /* @__PURE__ */ new Map();
		const undoJournal = [];
		const preparationIdentity = {};
		let checkpointMetadata = /* @__PURE__ */ new WeakMap();
		let checkpointTop = null;
		let activeCheckpointCount = 0;
		const recordUndo = (undo) => undoJournal.push(undo);
		const setMap = (map, key, value) => {
			if (activeCheckpointCount !== 0) {
				const existed = map.has(key);
				const previous = map.get(key);
				recordUndo(() => {
					if (existed) map.set(key, previous);
					else map.delete(key);
				});
			}
			map.set(key, value);
		};
		const deleteMap = (map, key) => {
			if (!map.has(key)) return;
			if (activeCheckpointCount !== 0) {
				const previous = map.get(key);
				recordUndo(() => map.set(key, previous));
			}
			map.delete(key);
		};
		const pruneCheckpointTop = () => {
			while (checkpointTop && !checkpointTop.active) checkpointTop = checkpointTop.previous;
		};
		const checkpointFor = (checkpoint) => {
			const metadata = checkpointMetadata.get(checkpoint);
			if (!metadata || metadata.preparation !== preparationIdentity || !metadata.node.valid || !metadata.node.active) throw new Error("Owner preparation checkpoint is invalid");
			return metadata;
		};
		const assertOpen = () => {
			if (state !== "open") throw new Error(`Owner preparation is ${state}`);
		};
		const getPrivateSlot = (parent, site, key) => privateSlots.get(parent)?.get(site)?.get(key);
		const putPrivateSlot = (parent, site, key, owner) => {
			let bySite = privateSlots.get(parent);
			if (!bySite) {
				bySite = /* @__PURE__ */ new Map();
				setMap(privateSlots, parent, bySite);
			}
			let byKey = bySite.get(site);
			if (!byKey) {
				byKey = /* @__PURE__ */ new Map();
				setMap(bySite, site, byKey);
			}
			setMap(byKey, key, owner);
		};
		const captureSlot = (parent, site, key) => {
			const existing = expectedSlots.get(parent)?.get(site)?.get(key);
			if (existing) return existing;
			const captured = {
				parent,
				site,
				key,
				owner: this.#childrenBySlot.get(parent)?.get(site)?.get(key),
				parentVersion: this.#parentChildrenVersion(parent),
				retained: false
			};
			let bySite = expectedSlots.get(parent);
			if (!bySite) {
				bySite = /* @__PURE__ */ new Map();
				setMap(expectedSlots, parent, bySite);
			}
			let byKey = bySite.get(site);
			if (!byKey) {
				byKey = /* @__PURE__ */ new Map();
				setMap(bySite, site, byKey);
			}
			setMap(byKey, key, captured);
			return captured;
		};
		const retainSlot = (captured) => {
			if (captured.retained) return;
			if (activeCheckpointCount !== 0) recordUndo(() => captured.retained = false);
			captured.retained = true;
		};
		const ownerRecord = (owner) => {
			const record = privateOwners.get(owner) ?? this.#owners.get(owner);
			if (!record) throw new Error(`Owner ${owner} is not alive in this preparation`);
			if (!privateOwners.has(owner)) {
				const slot = captureSlot(record.parent, record.componentSiteId, record.key);
				retainSlot(slot);
				if (slot.owner !== owner) throw new Error(`Owner ${owner} no longer occupies its committed slot`);
			}
			return record;
		};
		const captureCell = (owner, site) => {
			let sites = expectedCells.get(owner);
			if (!sites) {
				sites = /* @__PURE__ */ new Map();
				setMap(expectedCells, owner, sites);
			}
			let captured = sites.get(site);
			if (!captured) {
				const cell = this.#stateByOwner.get(owner)?.get(site);
				captured = {
					cell,
					version: cell?.version ?? 0
				};
				setMap(sites, site, captured);
			}
			return captured;
		};
		const installSlot = (record) => {
			let bySite = this.#childrenBySlot.get(record.parent);
			if (!bySite) this.#childrenBySlot.set(record.parent, bySite = /* @__PURE__ */ new Map());
			let byKey = bySite.get(record.componentSiteId);
			if (!byKey) bySite.set(record.componentSiteId, byKey = /* @__PURE__ */ new Map());
			byKey.set(record.key, record.id);
			if (record.parent !== null) this.#owners.get(record.parent).children.add(record.id);
			this.#bumpParentChildrenVersion(record.parent);
		};
		const makeCandidateCell = (owner, site, initial, layout) => {
			let sites = candidateCells.get(owner);
			if (!sites) {
				sites = /* @__PURE__ */ new Map();
				setMap(candidateCells, owner, sites);
			}
			let cell = sites.get(site);
			if (cell) {
				if (layout) {
					const normalized = normalizeCompiledStateLayout(layout);
					if (cell.stateLayout && compiledStateLayoutSignature(cell.stateLayout) !== compiledStateLayoutSignature(normalized)) throw new Error("State cell received a different compiled layout");
					const oldLayout = cell.stateLayout;
					const oldPromoted = cell.promoted;
					const oldNumericLaneSlot = cell.numericLaneSlot;
					const oldLaneSlotResolved = cell.laneSlotResolved;
					if (activeCheckpointCount !== 0) recordUndo(() => {
						cell.stateLayout = oldLayout;
						cell.promoted = oldPromoted;
						cell.numericLaneSlot = oldNumericLaneSlot;
						cell.laneSlotResolved = oldLaneSlotResolved;
					});
					if (!cell.stateLayout) cell.stateLayout = normalized;
					const slot = compiledStateLayoutSlot(normalized, site);
					cell.numericLaneSlot = slot;
					cell.laneSlotResolved = true;
					if (slot !== void 0 && typeof cell.value !== "number") cell.promoted = true;
				}
				return cell;
			}
			const committed = privateOwners.has(owner) ? void 0 : captureCell(owner, site).cell;
			const normalizedLayout = layout ? normalizeCompiledStateLayout(layout) : committed?.stateLayout;
			if (layout && committed?.stateLayout && compiledStateLayoutSignature(committed.stateLayout) !== compiledStateLayoutSignature(normalizedLayout)) throw new Error("State cell received a different compiled layout");
			const value = committed ? committed.value : typeof initial === "function" ? initial() : initial;
			const stateLayout = committed?.stateLayout ?? normalizedLayout;
			const numericLaneSlot = stateLayout ? compiledStateLayoutSlot(stateLayout, site) : void 0;
			const source = committed?.source ? new ScalarSource(committed.source.id, committed.source.value) : typeof value === "number" ? new ScalarSource(OwnerStateWorld.#nextSourceId++, value) : void 0;
			const promoted = committed?.promoted || numericLaneSlot !== void 0 && typeof value !== "number" ? true : void 0;
			if (stateLayout && numericLaneSlot !== void 0 && typeof value === "number" && !promoted) cell = makeCompiledNumericStateCell({
				value,
				version: committed?.version ?? 0,
				layout: stateLayout,
				slot: numericLaneSlot,
				source,
				dispatch: () => false,
				laneSlotResolved: true
			});
			else cell = {
				value,
				version: committed?.version ?? 0,
				...stateLayout ? { stateLayout } : {},
				...stateLayout ? {
					numericLaneSlot,
					laneSlotResolved: true
				} : {},
				...promoted ? { promoted: true } : {},
				...source ? { source } : {},
				dirtyMembership: void 0,
				cellIdentity: void 0,
				cellHandle: void 0,
				rowLease: void 0,
				rowView: void 0,
				dispatch: () => false
			};
			setMap(sites, site, cell);
			let initialBySite = candidateInitialValues.get(owner);
			if (!initialBySite) {
				initialBySite = /* @__PURE__ */ new Map();
				setMap(candidateInitialValues, owner, initialBySite);
			}
			setMap(initialBySite, site, committed?.value);
			return cell;
		};
		const preparation = {
			resolveOwner: (parent, componentSiteId, key = null) => {
				assertOpen();
				if (!componentSiteId) throw new Error("Component site ID must not be empty");
				if (parent !== null) ownerRecord(parent);
				const overlay = getPrivateSlot(parent, componentSiteId, key);
				if (overlay !== void 0) return overlay;
				if (privateOwners.has(parent)) {
					const id = this.#nextOwner++;
					setMap(privateOwners, id, {
						id,
						parent,
						componentSiteId,
						key,
						children: /* @__PURE__ */ new Set(),
						childrenVersion: 0
					});
					putPrivateSlot(parent, componentSiteId, key, id);
					return id;
				}
				const expected = captureSlot(parent, componentSiteId, key);
				if (expected.owner !== void 0) retainSlot(expected);
				if (expected.owner !== void 0) return expected.owner;
				const id = this.#nextOwner++;
				setMap(privateOwners, id, {
					id,
					parent,
					componentSiteId,
					key,
					children: /* @__PURE__ */ new Set(),
					childrenVersion: 0
				});
				putPrivateSlot(parent, componentSiteId, key, id);
				return id;
			},
			findOwner: (parent, componentSiteId, key = null) => {
				assertOpen();
				if (!componentSiteId) throw new Error("Component site ID must not be empty");
				if (parent !== null) ownerRecord(parent);
				const privateOwner = getPrivateSlot(parent, componentSiteId, key);
				if (privateOwner !== void 0) return privateOwner;
				if (parent !== null && privateOwners.has(parent)) return void 0;
				const expected = captureSlot(parent, componentSiteId, key);
				retainSlot(expected);
				return expected.owner;
			},
			replaceOwner: (parent, componentSiteId, key = null) => {
				assertOpen();
				if (!componentSiteId) throw new Error("Component site ID must not be empty");
				if (parent !== null) ownerRecord(parent);
				if (parent === null || !privateOwners.has(parent)) captureSlot(parent, componentSiteId, key);
				const id = this.#nextOwner++;
				setMap(privateOwners, id, {
					id,
					parent,
					componentSiteId,
					key,
					children: /* @__PURE__ */ new Set(),
					childrenVersion: 0
				});
				putPrivateSlot(parent, componentSiteId, key, id);
				return id;
			},
			useState: (owner, site, initial, layout) => {
				assertOpen();
				ownerRecord(owner);
				if (!site) throw new Error("State site ID must not be empty");
				const cell = makeCandidateCell(owner, site, initial, layout);
				let dispatches = candidateDispatches.get(owner);
				if (!dispatches) {
					dispatches = /* @__PURE__ */ new Map();
					setMap(candidateDispatches, owner, dispatches);
				}
				let control = dispatches.get(site);
				if (!control) {
					control = {
						candidateCell: cell,
						discarded: false,
						dispatch: (action) => false
					};
					control.dispatch = (action) => {
						if (control.discarded) return false;
						if (control.forward) return control.forward(action);
						const candidate = control.candidateCell;
						if (!candidate) return false;
						const typedAction = action;
						const previous = candidate.value;
						const next = typeof typedAction === "function" ? typedAction(previous) : typedAction;
						if (Object.is(previous, next)) return false;
						const previousVersion = candidate.version;
						const previousSource = candidate.source;
						const previousSourceValue = previousSource?.value;
						const previousPromoted = candidate.promoted;
						const previousHasStateWrites = hasStateWrites;
						if (activeCheckpointCount !== 0) recordUndo(() => {
							candidate.value = previous;
							candidate.version = previousVersion;
							candidate.source = previousSource;
							candidate.promoted = previousPromoted;
							if (previousSource && previousSourceValue !== void 0) previousSource.value = previousSourceValue;
							hasStateWrites = previousHasStateWrites;
						});
						candidate.value = next;
						candidate.version++;
						if (candidate.numericLaneSlot !== void 0 && typeof next !== "number") candidate.promoted = true;
						hasStateWrites = true;
						if (typeof next === "number") {
							candidate.source ??= new ScalarSource(OwnerStateWorld.#nextSourceId++, next);
							candidate.source.value = next;
						}
						return true;
					};
					setMap(dispatches, site, control);
					if (activeCheckpointCount !== 0) {
						const newControl = control;
						recordUndo(() => {
							newControl.candidateCell = null;
							newControl.forward = void 0;
							newControl.discarded = true;
						});
					}
				}
				return [cell.value, control.dispatch];
			},
			scalarSource: (owner, site) => {
				assertOpen();
				ownerRecord(owner);
				const candidate = candidateCells.get(owner)?.get(site);
				if (candidate) return typeof candidate.value === "number" ? candidate.source ?? null : null;
				if (privateOwners.has(owner)) return null;
				const committed = captureCell(owner, site).cell;
				if (typeof committed?.value !== "number") return null;
				return makeCandidateCell(owner, site, committed.value).source ?? null;
			},
			hasStateWrites: () => hasStateWrites,
			checkpoint: () => {
				assertOpen();
				pruneCheckpointTop();
				const token = Object.freeze({});
				const node = {
					previous: checkpointTop,
					active: true,
					valid: true
				};
				checkpointTop = node;
				activeCheckpointCount++;
				checkpointMetadata.set(token, {
					preparation: preparationIdentity,
					cursor: undoJournal.length,
					node
				});
				return token;
			},
			rollbackTo: (checkpoint) => {
				assertOpen();
				const metadata = checkpointFor(checkpoint);
				if (metadata.cursor > undoJournal.length) throw new Error("Owner preparation checkpoint is invalid");
				for (let index = undoJournal.length - 1; index >= metadata.cursor; index--) undoJournal[index]();
				undoJournal.length = metadata.cursor;
				while (checkpointTop !== metadata.node) {
					if (!checkpointTop) throw new Error("Owner preparation checkpoint is invalid");
					const discarded = checkpointTop;
					checkpointTop = discarded.previous;
					discarded.valid = false;
					if (discarded.active) {
						discarded.active = false;
						activeCheckpointCount--;
					}
				}
			},
			releaseCheckpoint: (checkpoint) => {
				assertOpen();
				const metadata = checkpointFor(checkpoint);
				metadata.node.active = false;
				metadata.node.valid = false;
				activeCheckpointCount--;
				checkpointMetadata.delete(checkpoint);
				pruneCheckpointTop();
				if (activeCheckpointCount === 0) {
					checkpointTop = null;
					undoJournal.length = 0;
				}
			},
			discardPrivateOwner: (owner) => {
				assertOpen();
				if (!privateOwners.has(owner)) return false;
				const previousHasStateWrites = hasStateWrites;
				if (activeCheckpointCount !== 0) recordUndo(() => hasStateWrites = previousHasStateWrites);
				const privateChildren = /* @__PURE__ */ new Map();
				const fallbackSlots = /* @__PURE__ */ new Map();
				for (const [candidate, record] of privateOwners) if (record.parent !== null) {
					let children = privateChildren.get(record.parent);
					if (!children) privateChildren.set(record.parent, children = []);
					children.push(candidate);
				}
				const subtree = [];
				const subtreeSet = /* @__PURE__ */ new Set();
				const collect = (current) => {
					subtreeSet.add(current);
					for (const child of privateChildren.get(current) ?? []) collect(child);
					subtree.push(current);
				};
				collect(owner);
				for (const [candidate, record] of privateOwners) {
					if (subtreeSet.has(candidate)) continue;
					let bySite = fallbackSlots.get(record.parent);
					if (!bySite) fallbackSlots.set(record.parent, bySite = /* @__PURE__ */ new Map());
					let byKey = bySite.get(record.componentSiteId);
					if (!byKey) bySite.set(record.componentSiteId, byKey = /* @__PURE__ */ new Map());
					byKey.set(record.key, candidate);
				}
				for (const current of subtree) {
					const record = privateOwners.get(current);
					for (const [site, control] of candidateDispatches.get(current) ?? []) {
						const cell = control.candidateCell;
						const oldDiscarded = control.discarded;
						const oldForward = control.forward;
						if (activeCheckpointCount !== 0) recordUndo(() => {
							control.candidateCell = cell;
							control.discarded = oldDiscarded;
							control.forward = oldForward;
						});
						control.candidateCell = null;
						control.forward = void 0;
						control.discarded = true;
					}
					for (const cell of candidateCells.get(current)?.values() ?? []) {
						const oldValue = cell.value;
						const oldSource = cell.source;
						const oldSourceValue = oldSource?.value;
						if (activeCheckpointCount !== 0) recordUndo(() => {
							cell.value = oldValue;
							cell.source = oldSource;
							if (oldSource && oldSourceValue !== void 0) oldSource.value = oldSourceValue;
						});
						cell.value = void 0;
						if (oldSource) oldSource.value = 0;
						cell.source = void 0;
					}
					deleteMap(candidateDispatches, current);
					deleteMap(candidateCells, current);
					deleteMap(candidateInitialValues, current);
					deleteMap(expectedCells, current);
					deleteMap(privateOwners, current);
					if (getPrivateSlot(record.parent, record.componentSiteId, record.key) === current) {
						const previousPrivate = fallbackSlots.get(record.parent)?.get(record.componentSiteId)?.get(record.key);
						const bySite = privateSlots.get(record.parent)?.get(record.componentSiteId);
						if (previousPrivate !== void 0) setMap(bySite, record.key, previousPrivate);
						else if (bySite) {
							deleteMap(bySite, record.key);
							if (bySite.size === 0) {
								const parentSlots = privateSlots.get(record.parent);
								deleteMap(parentSlots, record.componentSiteId);
								if (parentSlots.size === 0) deleteMap(privateSlots, record.parent);
							}
							const expectedByKey = expectedSlots.get(record.parent)?.get(record.componentSiteId);
							const expected = expectedByKey?.get(record.key);
							if (expectedByKey && expected && !expected.retained) {
								deleteMap(expectedByKey, record.key);
								if (expectedByKey.size === 0) {
									const expectedBySite = expectedSlots.get(record.parent);
									deleteMap(expectedBySite, record.componentSiteId);
									if (expectedBySite.size === 0) deleteMap(expectedSlots, record.parent);
								}
							}
						}
					}
				}
				hasStateWrites = false;
				for (const [candidateOwner, sites] of candidateCells) for (const [site, candidate] of sites) {
					const baseVersion = privateOwners.has(candidateOwner) ? 0 : expectedCells.get(candidateOwner)?.get(site)?.version ?? 0;
					if (candidate.version !== baseVersion) hasStateWrites = true;
				}
				return true;
			},
			validate: () => {
				if (state !== "open") return false;
				for (const [owner, record] of privateOwners) {
					if (record.parent !== null && !privateOwners.has(record.parent) && this.#owners.get(record.parent) === void 0) return false;
					const slot = expectedSlots.get(record.parent)?.get(record.componentSiteId)?.get(record.key);
					if (!privateOwners.has(record.parent) && !slot) return false;
				}
				for (const bySite of expectedSlots.values()) for (const byKey of bySite.values()) for (const expected of byKey.values()) {
					if (this.#childrenBySlot.get(expected.parent)?.get(expected.site)?.get(expected.key) !== expected.owner) return false;
					if (this.#parentChildrenVersion(expected.parent) !== expected.parentVersion) return false;
				}
				for (const [owner, sites] of expectedCells) {
					if (!this.#owners.has(owner)) return false;
					for (const [site, expected] of sites) {
						const current = this.#stateByOwner.get(owner)?.get(site);
						if (current !== expected.cell || (current?.version ?? 0) !== expected.version) return false;
					}
				}
				return true;
			},
			publish: () => {
				assertOpen();
				if (!preparation.validate()) throw new Error("Owner preparation is stale");
				const records = [...privateOwners.values()];
				for (const record of records) {
					this.#owners.set(record.id, record);
					installSlot(record);
				}
				for (const [owner, sites] of candidateCells) {
					let committedSites = this.#stateByOwner.get(owner);
					if (!committedSites) this.#stateByOwner.set(owner, committedSites = /* @__PURE__ */ new Map());
					for (const [site, candidate] of sites) {
						const candidateLayout = candidate.stateLayout;
						const existing = committedSites.get(site);
						if (existing) {
							if (candidateLayout) this.#ensureCellLayout(owner, site, existing, candidateLayout);
							if (candidate.promoted) {
								this.#releaseNumericLane(owner, site, existing);
								existing.promoted = true;
							}
							if (candidate.version !== existing.version) {
								existing.value = candidate.value;
								existing.version = candidate.version;
								if (typeof candidate.value === "number") {
									existing.source ??= new ScalarSource(OwnerStateWorld.#nextSourceId++, candidate.value);
									existing.source.value = candidate.value;
									if (existing.rowLease && existing.numericLaneSlot !== void 0) {
										NumericRowLease.setSource(existing.rowLease, existing.numericLaneSlot, existing.source);
										if (!existing.rowView) refreshNumericCellRowView(existing, owner, site);
									}
								}
								if (typeof candidate.value === "number" && existing.stateLayout && !existing.promoted) this.#ensureNumericLane(owner, site, existing);
								this.#markCellDirty(owner, site, existing);
							} else if (typeof existing.value === "number" && existing.stateLayout && !existing.promoted) this.#ensureNumericLane(owner, site, existing);
							continue;
						}
						candidate.dispatch = (action) => this.#dispatchState(owner, site, candidate, action);
						committedSites.set(site, candidate);
						if (candidate.stateLayout && !candidate.promoted && typeof candidate.value === "number") this.#ensureNumericLane(owner, site, candidate);
						if (candidate.version > 0) this.#markCellDirty(owner, site, candidate);
					}
				}
				state = "published";
				for (const [owner, dispatches] of candidateDispatches) for (const [site, control] of dispatches) {
					const live = this.#stateByOwner.get(owner)?.get(site);
					control.candidateCell = null;
					control.forward = live?.dispatch;
				}
				undoJournal.length = 0;
				checkpointMetadata = /* @__PURE__ */ new WeakMap();
				checkpointTop = null;
				activeCheckpointCount = 0;
				privateOwners.clear();
				privateSlots.clear();
				expectedSlots.clear();
				expectedCells.clear();
				candidateCells.clear();
				candidateInitialValues.clear();
				candidateDispatches.clear();
			},
			discard: () => {
				if (state !== "open") return;
				state = "discarded";
				for (const dispatches of candidateDispatches.values()) for (const control of dispatches.values()) {
					control.candidateCell = null;
					control.forward = void 0;
					control.discarded = true;
				}
				for (const sites of candidateCells.values()) for (const cell of sites.values()) {
					cell.value = void 0;
					if (cell.source) cell.source.value = 0;
					cell.source = void 0;
				}
				undoJournal.length = 0;
				checkpointMetadata = /* @__PURE__ */ new WeakMap();
				checkpointTop = null;
				activeCheckpointCount = 0;
				privateOwners.clear();
				privateSlots.clear();
				expectedSlots.clear();
				expectedCells.clear();
				candidateCells.clear();
				candidateInitialValues.clear();
				candidateDispatches.clear();
			}
		};
		return preparation;
	}
	claimRootId(rootId) {
		if (!rootId) throw new Error("Component root ID must not be empty");
		if (this.#claimedRootIds.has(rootId)) throw new Error(`Component root ID ${rootId} is already active in this world`);
		const owner = this.resolveOwner(null, `@component-root:${rootId}`);
		this.#claimedRootIds.set(rootId, owner);
		return owner;
	}
	releaseRootId(rootId, owner) {
		if (this.#claimedRootIds.get(rootId) !== owner) return;
		this.#claimedRootIds.delete(rootId);
	}
	resolveOwner(parent, componentSiteId, key = null) {
		if (componentSiteId.length === 0) throw new Error("Component site ID must not be empty");
		if (parent !== null) this.#assertOwner(parent);
		let bySite = this.#childrenBySlot.get(parent);
		if (!bySite) this.#childrenBySlot.set(parent, bySite = /* @__PURE__ */ new Map());
		let byKey = bySite.get(componentSiteId);
		if (!byKey) bySite.set(componentSiteId, byKey = /* @__PURE__ */ new Map());
		structuralCount("owner.slot.resolve-probes", "lookup", "owner_state_world.ts:resolveOwner");
		const existing = byKey.get(key);
		if (existing !== void 0) return existing;
		const id = this.#nextOwner++;
		this.#owners.set(id, {
			id,
			parent,
			componentSiteId,
			key,
			children: /* @__PURE__ */ new Set(),
			childrenVersion: 0
		});
		if (parent !== null) this.#owners.get(parent).children.add(id);
		byKey.set(key, id);
		this.#bumpParentChildrenVersion(parent);
		return id;
	}
	/** Allocate a private incarnation without replacing a committed keyed slot. */
	createStagedOwner(parent, componentSiteId, key) {
		this.#assertOwner(parent);
		if (!componentSiteId) throw new Error("Component site ID must not be empty");
		const id = this.#nextOwner++;
		this.#owners.set(id, {
			id,
			parent,
			componentSiteId,
			key,
			children: /* @__PURE__ */ new Set(),
			childrenVersion: 0
		});
		this.#owners.get(parent).children.add(id);
		this.#stagedOwners.add(id);
		return id;
	}
	/** Publish a prepared incarnation only over its expected previous slot. */
	activateStagedOwner(owner, previousOwner) {
		this.#assertOwner(owner);
		if (!this.#stagedOwners.has(owner)) throw new Error("Owner is not staged");
		const record = this.#owners.get(owner);
		let bySite = this.#childrenBySlot.get(record.parent);
		let byKey = bySite?.get(record.componentSiteId);
		if (byKey?.get(record.key) !== previousOwner) throw new Error("Staged owner slot changed before publication");
		if (!bySite) this.#childrenBySlot.set(record.parent, bySite = /* @__PURE__ */ new Map());
		if (!byKey) bySite.set(record.componentSiteId, byKey = /* @__PURE__ */ new Map());
		byKey.set(record.key, owner);
		this.#stagedOwners.delete(owner);
		this.#bumpParentChildrenVersion(record.parent);
	}
	findOwner(parent, componentSiteId, key = null) {
		if (parent !== null) this.#assertOwner(parent);
		structuralCount("owner.slot.find-probes", "lookup", "owner_state_world.ts:findOwner");
		return this.#childrenBySlot.get(parent)?.get(componentSiteId)?.get(key);
	}
	/** React-like state API with an explicit, compiler-addressable site ID. */
	useState(owner, site, initial, layout) {
		this.#assertOwner(owner);
		if (site.length === 0) throw new Error("State site ID must not be empty");
		let sites = this.#stateByOwner.get(owner);
		if (!sites) this.#stateByOwner.set(owner, sites = /* @__PURE__ */ new Map());
		let cell = sites.get(site);
		if (!cell) {
			const value = typeof initial === "function" ? initial() : initial;
			const normalizedLayout = layout ? normalizeCompiledStateLayout(layout) : void 0;
			const numericLaneSlot = normalizedLayout ? compiledStateLayoutSlot(normalizedLayout, site) : void 0;
			const source = typeof value === "number" ? new ScalarSource(OwnerStateWorld.#nextSourceId++, value) : void 0;
			if (normalizedLayout && numericLaneSlot !== void 0 && typeof value === "number") cell = makeCompiledNumericStateCell({
				value,
				version: 0,
				layout: normalizedLayout,
				slot: numericLaneSlot,
				source,
				dispatch: () => false,
				laneSlotResolved: false
			});
			else {
				cell = {
					value,
					version: 0,
					...normalizedLayout ? { stateLayout: normalizedLayout } : {},
					cellIdentity: void 0,
					cellHandle: void 0,
					dirtyMembership: void 0,
					rowLease: void 0,
					rowView: void 0,
					dispatch: () => false
				};
				if (source) cell.source = source;
			}
			cell.dispatch = (action) => this.#dispatchState(owner, site, cell, action);
			sites.set(site, cell);
		}
		if (layout) this.#ensureCellLayout(owner, site, cell, layout);
		if (cell.stateLayout && !cell.promoted && typeof cell.value === "number") this.#ensureNumericLane(owner, site, cell);
		return [this.#readStateValue(owner, site, cell), cell.dispatch];
	}
	/** Return the stable committed lane address, if this cell is lane-backed. */
	numericLane(owner, site) {
		if (!this.#owners.has(owner)) return null;
		const cell = this.#stateByOwner.get(owner)?.get(site);
		const lane = cell?.lane;
		return cell && lane && this.#laneIsCurrent(owner, site, cell, lane) ? lane : null;
	}
	/** Resolve a captured handle/version to its exact live numeric lane address. */
	numericLaneForCell(handle, version) {
		const capturedVersion = version;
		if (!Number.isSafeInteger(capturedVersion)) return null;
		let owner;
		let site;
		let identity;
		try {
			owner = handle.owner;
			site = handle.site;
			identity = handle.cellIdentity;
		} catch {
			return null;
		}
		const cell = this.#resolveCellIdentity(identity, owner, site);
		if (!cell || cell.version !== capturedVersion) return null;
		const lane = cell.lane;
		return lane && this.#laneAddressIsCurrent(owner, site, cell, lane) ? lane : null;
	}
	/** Resolve a committed numeric cell to its cached row projection. */
	numericRowForCell(handle, version) {
		const capturedVersion = version;
		if (!Number.isSafeInteger(capturedVersion)) return null;
		let owner;
		let site;
		let identity;
		try {
			owner = handle.owner;
			site = handle.site;
			identity = handle.cellIdentity;
		} catch {
			return null;
		}
		const cell = this.#resolveCellIdentity(identity, owner, site);
		if (!cell || cell.version !== capturedVersion) return null;
		const lane = cell.lane;
		const view = cell.rowView;
		const lease = cell.rowLease;
		const layout = cell.stateLayout;
		const slot = cell.numericLaneSlot;
		if (!lane || !cell.source || !view || !lease || !layout || slot === void 0 || view.rowIdentity !== lease || view.owner !== owner || view.site !== site || view.layout !== layout || view.row !== lane.row || view.generation !== lane.generation || view.slot !== slot || view.lane !== lane || view.source !== cell.source || !this.#laneAddressIsCurrent(owner, site, cell, lane)) return null;
		return view;
	}
	#resolveCellIdentity(identity, owner, site) {
		if (!Number.isSafeInteger(owner) || typeof site !== "string" || site.length === 0) return null;
		return CommittedCellCapability.resolve(identity, this.#identitySecret, owner, site);
	}
	#resolveCellHandle(handle) {
		let owner;
		let site;
		let identity;
		try {
			owner = handle.owner;
			site = handle.site;
			identity = handle.cellIdentity;
		} catch {
			return null;
		}
		return this.#resolveCellIdentity(identity, owner, site);
	}
	version(owner, site) {
		this.#assertOwner(owner);
		return this.#stateByOwner.get(owner)?.get(site)?.version ?? 0;
	}
	/** Stable scalar handle for a numeric state cell; nonnumeric sites have none. */
	scalarSource(owner, site) {
		this.#assertOwner(owner);
		const cell = this.#stateByOwner.get(owner)?.get(site);
		return cell && typeof this.#readStateValue(owner, site, cell) === "number" ? cell.source ?? null : null;
	}
	/** Resolve the canonical source for an identity-bearing committed change. */
	scalarSourceForChange(change) {
		const cell = change.cellIdentity ? CommittedCellCapability.resolveLegacyChange(change.cellIdentity, this.#identitySecret, change) : null;
		if (cell) {
			this.#assertOwner(change.owner);
			return typeof cell.value === "number" ? cell.source ?? null : null;
		}
		return this.scalarSource(change.owner, change.site);
	}
	/** Resolve the canonical numeric source for an exact committed cell handle. */
	scalarSourceForCell(handle) {
		const cell = this.#resolveCellHandle(handle);
		return cell && typeof cell.value === "number" ? cell.source ?? null : null;
	}
	/** Resolve the current version for an identity-bearing committed change. */
	versionForChange(change) {
		const cell = change.cellIdentity ? CommittedCellCapability.resolveLegacyChange(change.cellIdentity, this.#identitySecret, change) : null;
		if (cell) {
			this.#assertOwner(change.owner);
			return cell.version;
		}
		return this.version(change.owner, change.site);
	}
	/** Resolve the current version for an exact committed cell handle. */
	versionForCell(handle) {
		return this.#resolveCellHandle(handle)?.version ?? null;
	}
	/** Clear dirty cells only when each exact cell has not advanced past its cut. */
	clearCellChangesThrough(handles, versions, count) {
		if (!Number.isSafeInteger(count) || count < 0 || count > handles.length || count > versions.length) throw new RangeError("Invalid native state change count");
		for (let index = 0; index < count; index++) {
			let handle;
			let version;
			try {
				handle = handles[index];
				version = versions[index];
			} catch {
				continue;
			}
			if (!handle || !Number.isSafeInteger(version)) continue;
			const cell = this.#resolveCellHandle(handle);
			if (!cell || cell.version > version) continue;
			const membership = cell.dirtyMembership;
			if (membership) this.#dirtyJournal.deletePrepared(membership);
		}
	}
	/** Clear only changes at or below the captured versions. Reentrant writes survive. */
	clearChangesThrough(captured) {
		for (const change of captured) {
			if (!this.#dirtyJournal.has(change.owner, change.site)) continue;
			if (!this.#owners.has(change.owner) || this.versionForChange(change) <= change.version) this.#dirtyJournal.delete(change.owner, change.site);
		}
	}
	/** Coalesce repeated writes to the same owner/site until a scheduler consumes them. */
	pendingChanges() {
		const changes = [];
		for (const [owner, site] of this.#dirtyJournal.entries()) changes.push({
			owner,
			site,
			version: this.version(owner, site)
		});
		return changes;
	}
	drainChanges() {
		const changes = this.pendingChanges();
		this.#dirtyJournal.clear();
		return changes;
	}
	/** Return the changed owner and its component ancestors up to the root entity. */
	ownerLineage(owner) {
		this.#assertOwner(owner);
		const lineage = [];
		let current = owner;
		while (current !== null) {
			structuralCount("owner.lineage.parent-steps", "iteration", "owner_state_world.ts:ownerLineage");
			lineage.push(current);
			current = this.#owners.get(current).parent;
		}
		return lineage;
	}
	isAlive(owner) {
		return this.#owners.has(owner);
	}
	isWithin(owner, ancestor) {
		if (!this.#owners.has(owner) || !this.#owners.has(ancestor)) return false;
		let current = owner;
		while (current !== null) {
			if (current === ancestor) return true;
			current = this.#owners.get(current).parent;
		}
		return false;
	}
	hasPendingChanges() {
		return this.#dirtyJournal.size !== 0;
	}
	subscribeChanges(listener) {
		this.#changeListeners.add(listener);
		return () => this.#changeListeners.delete(listener);
	}
	/** Subscribe to committed state writes without allocating public change records. */
	subscribeDirtyCells(listener) {
		this.#dirtyCellListeners = [...this.#dirtyCellListeners, listener];
		let subscribed = true;
		return () => {
			if (!subscribed) return;
			subscribed = false;
			const index = this.#dirtyCellListeners.indexOf(listener);
			if (index < 0) return;
			this.#dirtyCellListeners = [...this.#dirtyCellListeners.slice(0, index), ...this.#dirtyCellListeners.slice(index + 1)];
		};
	}
	/** Destroy an owner and all nested keyed/component owners, including state traits. */
	destroyOwner(owner) {
		const record = this.#owners.get(owner);
		if (!record) return false;
		structuralCount("owner.destroy.visits", "iteration", "owner_state_world.ts:destroyOwner");
		for (const child of [...record.children]) {
			structuralCount("owner.destroy.child-edges", "iteration", "owner_state_world.ts:destroyOwner");
			this.destroyOwner(child);
		}
		const bySite = this.#childrenBySlot.get(record.parent);
		const byKey = bySite?.get(record.componentSiteId);
		if (byKey?.get(record.key) === owner) {
			byKey.delete(record.key);
			this.#bumpParentChildrenVersion(record.parent);
		}
		if (byKey?.size === 0) bySite?.delete(record.componentSiteId);
		if (bySite?.size === 0) this.#childrenBySlot.delete(record.parent);
		if (record.parent !== null) this.#owners.get(record.parent)?.children.delete(owner);
		this.#stagedOwners.delete(owner);
		const ownerCells = this.#stateByOwner.get(owner);
		for (const cell of ownerCells?.values() ?? []) {
			const identity = cell.cellIdentity;
			if (identity) CommittedCellCapability.revoke(identity, this.#identitySecret);
			cell.cellIdentity = void 0;
			cell.cellHandle = void 0;
		}
		this.#owners.delete(owner);
		for (const [site, cell] of ownerCells ?? []) {
			this.#releaseNumericLane(owner, site, cell);
			cell.dirtyMembership = void 0;
			cell.rowView = void 0;
			cell.value = void 0;
			cell.source = void 0;
		}
		this.#stateByOwner.delete(owner);
		this.#dirtyJournal.removeOwner(owner);
		return true;
	}
	#assertOwner(owner) {
		if (!this.#owners.has(owner)) throw new Error(`Owner ${owner} is not alive`);
	}
	#markCellDirty(owner, site, cell) {
		let membership = cell.dirtyMembership;
		if (!membership) {
			membership = this.#dirtyJournal.prepareMembership(owner, site);
			cell.dirtyMembership = membership;
		}
		if (!this.#dirtyJournal.markPrepared(membership)) throw new Error("Committed cell has stale dirty membership");
	}
	#parentChildrenVersion(parent) {
		return parent === null ? this.#rootChildrenVersion : this.#owners.get(parent)?.childrenVersion ?? -1;
	}
	#bumpParentChildrenVersion(parent) {
		if (parent === null) {
			this.#rootChildrenVersion++;
			return;
		}
		const record = this.#owners.get(parent);
		if (record) record.childrenVersion++;
	}
	#dispatchState(owner, site, cell, action) {
		this.#assertOwner(owner);
		const previous = cell.value;
		const isUpdater = typeof action === "function";
		const next = isUpdater ? action(previous) : action;
		if (isUpdater && (!this.#owners.has(owner) || this.#stateByOwner.get(owner)?.get(site) !== cell)) return false;
		if (Object.is(previous, next)) return false;
		if (cell.lane && typeof next !== "number") {
			this.#releaseNumericLane(owner, site, cell);
			cell.promoted = true;
		} else if (cell.numericLaneSlot !== void 0 && typeof next !== "number") cell.promoted = true;
		cell.value = next;
		cell.version++;
		if (typeof next === "number") {
			if (!cell.lane && cell.numericLaneSlot !== void 0 && !cell.promoted) this.#ensureNumericLane(owner, site, cell);
			cell.source ??= new ScalarSource(OwnerStateWorld.#nextSourceId++, next);
			cell.source.value = next;
			if (cell.rowLease && cell.numericLaneSlot !== void 0) {
				NumericRowLease.setSource(cell.rowLease, cell.numericLaneSlot, cell.source);
				if (!cell.rowView) refreshNumericCellRowView(cell, owner, site);
			}
		}
		this.#markCellDirty(owner, site, cell);
		let cellIdentity = cell.cellIdentity;
		if (!cellIdentity) {
			cellIdentity = new CommittedCellCapability(this.#identitySecret, owner, site, cell);
			cell.cellIdentity = cellIdentity;
			cell.cellHandle = Object.freeze({
				owner,
				site,
				cellIdentity
			});
		}
		const handle = cell.cellHandle;
		const version = cell.version;
		const dirtyCellListeners = this.#dirtyCellListeners;
		const changeListeners = this.#changeListeners.size > 0 ? [...this.#changeListeners] : null;
		if (handle) for (const listener of dirtyCellListeners) listener(handle, version);
		if (changeListeners) {
			const change = {
				owner,
				site,
				version,
				cellIdentity
			};
			for (const listener of changeListeners) listener(change);
		}
		return true;
	}
};
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/snapshot/src/keyed_region_buckets.ts
/**
* Ordered keyed rows with direct key lookup and bounded local edits.
*
* Iteration is intentionally linear; it is for initial materialization and
* snapshots. Replace/remove/insert/move use the key index and touch one or two
* buckets. When a bucket fills, it splits in half; sparse neighbors merge.
*/
var KeyedRegionBuckets = class {
	bucketCapacity;
	#head = null;
	#tail = null;
	#byKey = /* @__PURE__ */ new Map();
	#size = 0;
	#splits = 0;
	#merges = 0;
	#bucketSlotReads = 0;
	#bucketSlotWrites = 0;
	#bucketCount = 0;
	constructor(entries, bucketCapacity = 128) {
		if (!Number.isSafeInteger(bucketCapacity) || bucketCapacity < 4) throw new RangeError("bucketCapacity must be an integer >= 4");
		this.bucketCapacity = bucketCapacity;
		for (const item of entries) {
			if (this.#byKey.has(item.key)) throw new Error(`Duplicate keyed-region key: ${item.key}`);
			this.#append(item.key, item.value);
		}
	}
	get size() {
		return this.#size;
	}
	get bucketCount() {
		return this.#bucketCount;
	}
	has(key) {
		structuralCount("bucket.key-probes", "lookup", "keyed_region_buckets.ts:key-probe");
		return this.#byKey.has(key);
	}
	get(key) {
		structuralCount("bucket.key-probes", "lookup", "keyed_region_buckets.ts:key-probe");
		return this.#byKey.get(key)?.value;
	}
	beforeKey(key) {
		const { bucket, offset } = this.#require(key);
		if (offset > 0) return bucket.entries[offset - 1].key;
		return bucket.previous?.entries.at(-1)?.key ?? null;
	}
	afterKey(key) {
		const { bucket, offset } = this.#require(key);
		if (offset + 1 < bucket.entries.length) return bucket.entries[offset + 1].key;
		return bucket.next?.entries[0]?.key ?? null;
	}
	replace(oldKey, newKey, value) {
		const old = this.#require(oldKey);
		if (newKey !== oldKey && this.#byKey.has(newKey)) throw new Error(`Duplicate keyed-region key: ${newKey}`);
		this.#bucketSlotReads++;
		const replacement = {
			key: newKey,
			value,
			bucket: old.bucket,
			offset: old.offset
		};
		old.bucket.entries[old.offset] = replacement;
		this.#bucketSlotWrites++;
		this.#byKey.delete(oldKey);
		this.#byKey.set(newKey, replacement);
	}
	insertBefore(anchorKey, key, value) {
		if (this.#byKey.has(key)) throw new Error(`Duplicate keyed-region key: ${key}`);
		if (this.#size === 0) {
			const bucket = this.#newBucket(null, null);
			this.#insertInto(bucket, 0, key, value);
			return;
		}
		if (anchorKey === null) {
			const bucket = this.#tail;
			if (bucket.entries.length === this.bucketCapacity) {
				this.#split(bucket);
				this.#insertInto(this.#tail, this.#tail.entries.length, key, value);
			} else this.#insertInto(bucket, bucket.entries.length, key, value);
			return;
		}
		const anchor = this.#require(anchorKey);
		let bucket = anchor.bucket;
		let offset = anchor.offset;
		if (bucket.entries.length === this.bucketCapacity) {
			const [left, right] = this.#split(bucket);
			const split = left.entries.length;
			if (offset >= split) {
				bucket = right;
				offset -= split;
			}
		}
		this.#insertInto(bucket, offset, key, value);
	}
	remove(key) {
		const { bucket, offset } = this.#require(key);
		const [removed] = bucket.entries.splice(offset, 1);
		this.#bucketSlotReads++;
		this.#bucketSlotWrites += bucket.entries.length - offset;
		structuralCount("bucket.splice-shift-estimate", "estimate", "keyed_region_buckets.ts:splice", bucket.entries.length - offset);
		this.#byKey.delete(key);
		this.#size--;
		this.#reindex(bucket, offset);
		if (bucket.entries.length === 0) this.#unlink(bucket);
		else this.#rebalance(bucket);
		return removed.value;
	}
	moveBefore(key, anchorKey) {
		if (key === anchorKey) return;
		const value = this.remove(key);
		this.insertBefore(anchorKey, key, value);
	}
	*entries() {
		for (let bucket = this.#head; bucket; bucket = bucket.next) {
			structuralCount("bucket.iterated-buckets", "iteration", "keyed_region_buckets.ts:entries");
			for (const entry of bucket.entries) {
				structuralCount("bucket.iterated-entries", "iteration", "keyed_region_buckets.ts:entries");
				yield {
					key: entry.key,
					value: entry.value
				};
			}
		}
	}
	/** Allocation-free full scan for snapshots and dense region work. */
	forEach(visitor) {
		for (let bucket = this.#head; bucket; bucket = bucket.next) {
			structuralCount("bucket.forEach-buckets", "iteration", "keyed_region_buckets.ts:forEach");
			for (const entry of bucket.entries) {
				structuralCount("bucket.forEach-entries", "iteration", "keyed_region_buckets.ts:forEach");
				visitor(entry.key, entry.value);
			}
		}
	}
	stats() {
		return {
			bucketSlotReads: this.#bucketSlotReads,
			bucketSlotWrites: this.#bucketSlotWrites,
			splits: this.#splits,
			merges: this.#merges,
			bucketCount: this.#bucketCount
		};
	}
	resetStats() {
		this.#bucketSlotReads = 0;
		this.#bucketSlotWrites = 0;
		this.#splits = 0;
		this.#merges = 0;
	}
	/** Full consistency check for experiment integrity, not a hot-path method. */
	assertIntegrity() {
		const seen = /* @__PURE__ */ new Set();
		let count = 0;
		let previous = null;
		for (let bucket = this.#head; bucket; bucket = bucket.next) {
			if (bucket.previous !== previous) throw new Error("Keyed-region bucket links are inconsistent");
			if (bucket.entries.length === 0 || bucket.entries.length > this.bucketCapacity) throw new Error("Keyed-region bucket occupancy is invalid");
			for (let offset = 0; offset < bucket.entries.length; offset++) {
				const entry = bucket.entries[offset];
				if (seen.has(entry.key) || entry.bucket !== bucket || entry.offset !== offset || this.#byKey.get(entry.key) !== entry) throw new Error(`Keyed-region entry index mismatch: ${entry.key}`);
				seen.add(entry.key);
				count++;
			}
			previous = bucket;
		}
		if (previous !== this.#tail || count !== this.#size || seen.size !== this.#byKey.size || this.#bucketCount < 1 && count > 0) throw new Error("Keyed-region aggregate size mismatch");
	}
	#append(key, value) {
		let bucket = this.#tail;
		if (!bucket || bucket.entries.length === this.bucketCapacity) bucket = this.#newBucket(this.#tail, null);
		this.#insertInto(bucket, bucket.entries.length, key, value);
	}
	#insertInto(bucket, offset, key, value) {
		const entry = {
			key,
			value,
			bucket,
			offset
		};
		bucket.entries.splice(offset, 0, entry);
		this.#size++;
		this.#bucketSlotWrites += bucket.entries.length - offset;
		structuralCount("bucket.splice-shift-estimate", "estimate", "keyed_region_buckets.ts:splice", bucket.entries.length - offset);
		this.#reindex(bucket, offset);
		this.#byKey.set(key, entry);
	}
	#reindex(bucket, start) {
		for (let offset = start; offset < bucket.entries.length; offset++) {
			structuralCount("bucket.reindex-loop-visits", "iteration", "keyed_region_buckets.ts:reindex");
			bucket.entries[offset].bucket = bucket;
			bucket.entries[offset].offset = offset;
			this.#bucketSlotWrites++;
		}
	}
	#split(bucket) {
		const splitAt = Math.ceil(bucket.entries.length / 2);
		const moved = bucket.entries.splice(splitAt);
		const right = this.#newBucket(bucket, bucket.next);
		right.entries.push(...moved);
		this.#reindex(right, 0);
		this.#reindex(bucket, splitAt);
		this.#splits++;
		structuralCount("bucket.split-events", "event", "keyed_region_buckets.ts:split");
		return [bucket, right];
	}
	#rebalance(bucket) {
		const minimum = Math.floor(this.bucketCapacity / 2);
		if (bucket.entries.length >= minimum) return;
		const left = bucket.next ? bucket : bucket.previous;
		const right = bucket.next ?? bucket;
		if (!left || !right || left === right) return;
		if (left.entries.length + right.entries.length <= this.bucketCapacity) {
			left.entries.push(...right.entries);
			this.#reindex(left, 0);
			this.#unlink(right);
			this.#merges++;
			structuralCount("bucket.merge-events", "event", "keyed_region_buckets.ts:rebalance");
			return;
		}
		const combined = [...left.entries, ...right.entries];
		const splitAt = Math.ceil(combined.length / 2);
		left.entries = combined.slice(0, splitAt);
		right.entries = combined.slice(splitAt);
		this.#reindex(left, 0);
		this.#reindex(right, 0);
	}
	#newBucket(previous, next) {
		const bucket = {
			entries: [],
			previous,
			next
		};
		if (previous) previous.next = bucket;
		else this.#head = bucket;
		if (next) next.previous = bucket;
		else this.#tail = bucket;
		this.#bucketCount++;
		return bucket;
	}
	#unlink(bucket) {
		if (bucket.previous) bucket.previous.next = bucket.next;
		else this.#head = bucket.next;
		if (bucket.next) bucket.next.previous = bucket.previous;
		else this.#tail = bucket.previous;
		this.#bucketCount--;
	}
	#require(key) {
		structuralCount("bucket.key-probes", "lookup", "keyed_region_buckets.ts:key-probe");
		const entry = this.#byKey.get(key);
		if (!entry) throw new Error(`Unknown keyed-region key: ${key}`);
		return entry;
	}
};
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/snapshot/src/dom_style_writer.ts
/**
* Prepare a DOM style-property writer while binding metadata is activated.
* The style and property name are captured; mutable CSSStyleDeclaration
* methods are looked up and invoked with the style object as receiver on each
* write, matching DOMVDOMHost's current writeStyle behavior.
*/
function createDOMStylePropWriter(style, name) {
	if (name.startsWith("--")) return (value, _previous) => {
		if (value == null) style.removeProperty(name);
		else style.setProperty(name, String(value));
	};
	const writableStyle = style;
	return (value, _previous) => {
		writableStyle[name] = value == null ? "" : String(value);
	};
}
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/snapshot/src/vdom_snapshot_runtime.ts
var isCompiledOwnerUpdatePrimitive = (value) => value === null || value === void 0 || typeof value === "string" || typeof value === "boolean" || typeof value === "number";
var safeLayoutSignature = (layout) => {
	try {
		return compiledStateLayoutSignature(layout);
	} catch {
		return null;
	}
};
var sameBoundValueCanSkipWrite = (lastValue, nextValue, forceWrite = false) => {
	if (!Object.is(lastValue, nextValue)) return false;
	return !forceWrite || nextValue === null || typeof nextValue !== "object" && typeof nextValue !== "function";
};
var elementKey = (element) => {
	const key = element.props.key;
	return key == null ? null : String(key);
};
var hostProps = (props) => {
	const result = {};
	for (const [name, value] of Object.entries(props)) {
		if (name === "children" || name === "key") continue;
		result[name] = value;
	}
	return result;
};
var normalizedElementCache = /* @__PURE__ */ new WeakMap();
var normalizeMany = (input) => {
	structuralCount("vdom.normalize.input-visits", "iteration", "vdom_snapshot_runtime.ts:normalizeMany");
	if (input == null || input === false) return [];
	if (Array.isArray(input)) return input.flatMap((child) => normalizeMany(child));
	if (typeof input === "string" || typeof input === "number") return [{
		kind: "text",
		text: String(input),
		key: null
	}];
	if (typeof input.type === "function") return normalizeMany(input.type(input.props));
	if (input.type === Fragment) return normalizeMany(input.props.children);
	const keyedRegionId = getKeyedOwnerRegionId(input.props.children);
	const cached = keyedRegionId === null ? normalizedElementCache.get(input) : void 0;
	if (cached) return [cached];
	const normalized = {
		kind: "element",
		tag: input.type,
		key: elementKey(input),
		props: hostProps(input.props),
		children: normalizeMany(input.props.children),
		keyedRegionId
	};
	if (keyedRegionId === null) normalizedElementCache.set(input, normalized);
	return [normalized];
};
var mountedChildren = (node) => node.keyedChildren ? [...node.keyedChildren.entries()].map((entry) => entry.value) : node.children;
var forEachMountedChild = (node, visitor) => {
	if (node.keyedChildren) node.keyedChildren.forEach((_key, child) => {
		structuralCount("vdom.child-callback.visits", "iteration", "vdom_snapshot_runtime.ts:forEachMountedChild");
		visitor(child);
	});
	else for (const child of node.children) {
		structuralCount("vdom.child-callback.visits", "iteration", "vdom_snapshot_runtime.ts:forEachMountedChild");
		visitor(child);
	}
};
var storeMountedChildren = (node, regionId, children) => {
	const keyed = keyedChildrenFor(regionId, children);
	node.keyedChildren = keyed;
	node.children = keyed ? [] : children;
};
/** Materialize a keyed run only when falling back to ordinary full reconciliation. */
var materializeMountedChildren = (node) => {
	const children = mountedChildren(node);
	for (let index = 0; index < children.length; index++) {
		children[index].parent = node;
		children[index].parentIndex = index;
	}
	return children;
};
var keyedChildrenFor = (regionId, children) => {
	if (regionId === null || children.some((child) => child.vnode.key === null)) return;
	return new KeyedRegionBuckets(children.map((child) => ({
		key: child.vnode.key,
		value: child
	})));
};
var serializeMounted = (node) => {
	structuralCount("vdom.snapshot.serialize-node-visits", "iteration", "vdom_snapshot_runtime.ts:serializeMounted");
	if (node.vnode.kind === "text") return node.vnode;
	return {
		...node.vnode,
		children: mountedChildren(node).map(serializeMounted)
	};
};
var compatible = (left, right) => left.kind === right.kind && left.key === right.key && (left.kind === "text" || right.kind === "element" && left.tag === right.tag);
var validateUniqueKeys = (siblings) => {
	const keys = /* @__PURE__ */ new Set();
	for (const node of siblings) {
		structuralCount("vdom.unique-key.node-visits", "iteration", "vdom_snapshot_runtime.ts:validateUniqueKeys");
		if (node.kind === "element") {
			const ref = node.props.ref;
			if (ref != null && typeof ref !== "function" && !(typeof ref === "object" && "current" in ref)) throw new TypeError("VDOM ref must be a callback or an object with current");
		}
		if (node.key !== null) {
			if (keys.has(node.key)) throw new Error(`Duplicate key in next VDOM children: ${node.key}`);
			keys.add(node.key);
		}
		if (node.kind === "element") validateUniqueKeys(node.children);
	}
};
var applyProps = (host, handle, previous, next, previousWriters, afterProp) => {
	const names = /* @__PURE__ */ new Set([...Object.keys(previous), ...Object.keys(next)]);
	for (const name of names) {
		const previousWriter = previousWriters?.get(name);
		let before;
		if (previousWriter?.length) {
			const wholeProp = previousWriter.find((group) => group.styleProperty === void 0);
			if (wholeProp) before = wholeProp.lastValue;
			else if (name === "style") {
				const oldStyle = previous[name];
				const style = oldStyle && typeof oldStyle === "object" && !Array.isArray(oldStyle) ? { ...oldStyle } : {};
				for (const group of previousWriter) if (group.styleProperty !== void 0) style[group.styleProperty] = group.lastValue;
				before = style;
			} else before = materializeProp(name, previous[name]);
		} else before = materializeProp(name, previous[name]);
		const value = materializeProp(name, next[name]);
		if (!Object.is(before, value)) host.setProp(handle, name, value, before);
		afterProp?.(name, next[name]);
	}
};
var materializeCreationProps = (props) => {
	const result = {};
	for (const [name, value] of Object.entries(props)) {
		if (name === "ref") continue;
		result[name] = materializeProp(name, value);
	}
	return result;
};
/** Release listeners in tree order, then host resources in postorder. */
var releaseMountedSubtree = (host, node, errors) => {
	structuralCount("vdom.release.subtree-visits", "iteration", "vdom_snapshot_runtime.ts:releaseMountedSubtree");
	if (node.vnode.kind === "element") {
		if (node.vnode.props.ref != null) try {
			host.setProp(node.handle, "ref", void 0, node.vnode.props.ref);
		} catch (error) {
			errors.push(error);
		}
		for (const [name, value] of Object.entries(node.vnode.props)) if (/^on[A-Z]/.test(name) && typeof value === "function") try {
			host.setProp(node.handle, name, void 0, value);
		} catch (error) {
			errors.push(error);
		}
	}
	forEachMountedChild(node, (child) => {
		try {
			releaseMountedSubtree(host, child, errors);
		} catch (error) {
			errors.push(error);
		}
	});
	if (!node.hostDisposed) {
		node.hostDisposed = true;
		try {
			structuralCount("host.optional-dispose.requests", "event", "vdom_snapshot_runtime.ts:releaseMountedSubtree");
			host.dispose?.(node.handle);
		} catch (error) {
			errors.push(error);
		}
	}
};
var removeMountedSubtree = (host, parent, node, collectedErrors) => {
	const errors = collectedErrors ?? [];
	releaseMountedSubtree(host, node, errors);
	try {
		structuralCount("host.remove.attempts", "event", "vdom_snapshot_runtime.ts:removeMountedSubtree");
		host.remove(parent, node.handle);
	} catch (error) {
		errors.push(error);
	}
	if (!collectedErrors && errors.length > 0) throw new AggregateError(errors, "VDOM subtree removal encountered host errors");
};
var materializeValue = (value) => {
	const binding = getBoundValue(value);
	return binding ? readBoundValue(binding) : value;
};
var materializeProp = (name, value) => {
	if (name === "style" && typeof value === "object" && value !== null && !Array.isArray(value)) {
		const style = value;
		const output = {};
		for (const [key, styleValue] of Object.entries(style)) output[key] = materializeValue(styleValue);
		return output;
	}
	return materializeValue(value);
};
var boundSourcesIn = (name, value) => {
	const values = name === "style" && typeof value === "object" && value !== null && !Array.isArray(value) ? Object.values(value) : [value];
	const sources = [];
	for (const item of values) {
		const binding = getBoundValue(item);
		if (binding) {
			for (const source of binding.sources ?? [binding.source]) if (!sources.includes(source)) sources.push(source);
		}
	}
	return sources;
};
var hasStableDerivedBinding = (value) => {
	const direct = getBoundValue(value);
	if (direct) return !!direct.read;
	return typeof value === "object" && value !== null && Object.values(value).some((item) => !!getBoundValue(item)?.read);
};
var compiledBindingsIn = (name, value) => {
	const values = name === "style" && typeof value === "object" && value !== null && !Array.isArray(value) ? Object.entries(value) : [[void 0, value]];
	const bindings = [];
	for (const [styleProperty, item] of values) {
		const binding = getBoundValue(item);
		const hasCompiledIdentity = binding && Number.isInteger(binding.bindingId) && Number.isInteger(binding.sourceSlot);
		if (hasCompiledIdentity && binding.sources && binding.sources.length !== 1) throw new Error("Compiled VDOM bindings currently require one source per prop");
		if (hasCompiledIdentity) bindings.push({
			source: binding.source,
			bindingId: binding.bindingId,
			sourceSlot: binding.sourceSlot,
			styleProperty,
			binding
		});
	}
	return bindings;
};
/** CSR/column bindings require their own registration and lifetime protocol. */
var hasNonScalarBindingMetadata = (name, value) => {
	return (name === "style" && typeof value === "object" && value !== null && !Array.isArray(value) ? Object.values(value) : [value]).some((item) => {
		const binding = getBoundValue(item);
		return !!binding && (binding.bindingId !== void 0 || binding.sourceSlot !== void 0 || binding.column !== void 0);
	});
};
var createMounted = (host, vnode, parent, keyIndex) => {
	if (vnode.kind === "text") {
		const mounted = {
			vnode,
			handle: host.createText(vnode.text),
			children: [],
			parent: null,
			parentIndex: -1
		};
		keyIndex?.attach?.(mounted);
		return mounted;
	}
	const handle = host.createElement(vnode.tag, parent, materializeCreationProps(vnode.props));
	applyProps(host, handle, {}, vnode.props);
	const children = reconcileChildren(host, handle, [], vnode.children, keyIndex);
	const mounted = {
		vnode,
		handle,
		children,
		parent: null,
		parentIndex: -1
	};
	storeMountedChildren(mounted, vnode.keyedRegionId, children);
	for (let index = 0; index < children.length; index++) {
		children[index].parent = mounted;
		children[index].parentIndex = index;
	}
	keyIndex?.attach?.(mounted);
	return mounted;
};
var updateMounted = (host, parent, old, next, keyIndex) => {
	if (old && old.vnode === next) return old;
	if (!old || !compatible(old.vnode, next)) {
		if (old) {
			visitMountedSubtree(old, keyIndex?.detach);
			removeMountedSubtree(host, parent, old);
		}
		const mounted = createMounted(host, next, parent, keyIndex);
		if (old) {
			mounted.parent = old.parent;
			mounted.parentIndex = old.parentIndex;
			const siblings = old.parent?.keyedChildren;
			const oldKey = old.vnode.key;
			const anchorKey = siblings && oldKey !== null ? siblings.afterKey(oldKey) : null;
			const anchor = anchorKey === null ? null : siblings.get(anchorKey)?.handle ?? null;
			host.place(parent, mounted.handle, anchor);
			if (siblings && oldKey !== null && mounted.vnode.key !== null) siblings.replace(oldKey, mounted.vnode.key, mounted);
		} else host.place(parent, mounted.handle, null);
		return mounted;
	}
	if (next.kind === "text" && old.vnode.kind === "text") {
		if (old.vnode.text !== next.text) host.setText(old.handle, next.text);
		old.vnode = next;
		return old;
	}
	if (next.kind === "element" && old.vnode.kind === "element") {
		applyProps(host, old.handle, old.vnode.props, next.props, old.scalarBindingGroups, keyIndex?.refreshProp ? (name, value) => keyIndex.refreshProp(old, name, value) : void 0);
		const children = reconcileChildren(host, old.handle, materializeMountedChildren(old), next.children, keyIndex);
		for (let index = 0; index < children.length; index++) {
			children[index].parent = old;
			children[index].parentIndex = index;
		}
		storeMountedChildren(old, next.keyedRegionId, children);
		if (old.vnode.keyedRegionId !== next.keyedRegionId) {
			if (keyIndex?.detachKey) keyIndex.detachKey(old);
			else keyIndex?.detach?.(old);
			old.vnode = next;
			if (keyIndex?.attachKey) keyIndex.attachKey(old);
			else keyIndex?.attach?.(old);
			return old;
		}
		old.vnode = next;
		return old;
	}
	throw new Error("Incompatible VDOM node kinds reached update path");
};
var reconcileChildren = (host, parent, previous, next, keyIndex) => {
	if (next.length === previous.length && next.every((vnode, index) => {
		structuralCount("vdom.reconcile.fast-check-visits", "iteration", "vdom_snapshot_runtime.ts:reconcileChildren");
		return previous[index].vnode.key === vnode.key && compatible(previous[index].vnode, vnode);
	})) return next.map((vnode, index) => {
		structuralCount("vdom.reconcile.fast-update-visits", "iteration", "vdom_snapshot_runtime.ts:reconcileChildren");
		return updateMounted(host, parent, previous[index], vnode, keyIndex);
	});
	const keyed = /* @__PURE__ */ new Map();
	const unkeyed = [];
	for (let index = 0; index < previous.length; index++) {
		structuralCount("vdom.reconcile.previous-child-visits", "iteration", "vdom_snapshot_runtime.ts:reconcileChildren");
		const child = previous[index];
		const key = child.vnode.key;
		if (key == null) unkeyed.push(child);
		else {
			if (keyed.has(key)) throw new Error(`Duplicate key in previous VDOM children: ${key}`);
			keyed.set(key, child);
		}
	}
	const nextKeys = /* @__PURE__ */ new Set();
	for (const child of next) {
		structuralCount("vdom.reconcile.next-key-visits", "iteration", "vdom_snapshot_runtime.ts:reconcileChildren");
		if (child.key != null) {
			if (nextKeys.has(child.key)) throw new Error(`Duplicate key in next VDOM children: ${child.key}`);
			nextKeys.add(child.key);
		}
	}
	const used = /* @__PURE__ */ new Set();
	const needsPlacement = new Uint8Array(next.length);
	let unkeyedIndex = 0;
	let lastPlacedIndex = -1;
	const selected = next.map((vnode, index) => {
		structuralCount("vdom.reconcile.selection-visits", "iteration", "vdom_snapshot_runtime.ts:reconcileChildren");
		let candidate;
		if (vnode.key != null) candidate = keyed.get(vnode.key);
		else candidate = unkeyed[unkeyedIndex++];
		if (!candidate || !compatible(candidate.vnode, vnode)) {
			needsPlacement[index] = 1;
			return null;
		}
		used.add(candidate);
		if (candidate.parentIndex < lastPlacedIndex) needsPlacement[index] = 1;
		else lastPlacedIndex = candidate.parentIndex;
		return candidate;
	});
	const mounted = new Array(next.length);
	let anchor = null;
	for (let index = next.length - 1; index >= 0; index--) {
		structuralCount("vdom.reconcile.mount-visits", "iteration", "vdom_snapshot_runtime.ts:reconcileChildren");
		const old = selected[index];
		const child = old ? updateMounted(host, parent, old, next[index], keyIndex) : createMounted(host, next[index], parent, keyIndex);
		if (needsPlacement[index] !== 0) host.place(parent, child.handle, anchor);
		mounted[index] = child;
		anchor = child.handle;
	}
	for (const child of previous) if (!used.has(child)) {
		visitMountedSubtree(child, keyIndex?.detach);
		removeMountedSubtree(host, parent, child);
	}
	return mounted;
};
var visitMountedSubtree = (node, visit) => {
	if (!visit) return;
	visit(node);
	forEachMountedChild(node, (child) => visitMountedSubtree(child, visit));
};
/** A retained VDOM root whose host changes only when commit() is called. */
var VDOMSnapshotRoot = class {
	host;
	container;
	profile;
	#mounted = [];
	#snapshot = [];
	#numericWriteInProgress = false;
	#snapshotDirty = false;
	#nodesByKey = /* @__PURE__ */ new Map();
	#nodesByKeyedRegion = /* @__PURE__ */ new Map();
	#groupsBySource = /* @__PURE__ */ new Map();
	#programSourceSlots = /* @__PURE__ */ new Map();
	#preparedNumericRowPrograms = /* @__PURE__ */ new WeakMap();
	#activePreparedNumericRowRecords = /* @__PURE__ */ new Set();
	#numericRowProgramsBySource = /* @__PURE__ */ new Map();
	#preparedNumericRowByIdentity = /* @__PURE__ */ new WeakMap();
	#ownerRowCutEpoch = 0;
	#ownerRowRecordScratch = [];
	#ownerRowInputRecordScratch = [];
	#ownerRowRecordCount = 0;
	#ownerRowGroupScratch = [];
	#ownerRowGroupRecordScratch = [];
	#ownerRowValueScratch = [];
	#ownerRowStagedInputIndices = /* @__PURE__ */ new Uint32Array(0);
	#ownerRowStagedSinkIds = /* @__PURE__ */ new Uint16Array(0);
	#ownerRowStagedValues = [];
	#ownerRowGroupCount = 0;
	#ownerRowExecutionActive = false;
	#ownerRowExecutionCancelled = false;
	#ownerRowWorkVisits = 0;
	#ownerUpdateKernelBatches = 0;
	#ownerUpdateKernelRows = 0;
	#ownerUpdateKernelInputs = 0;
	#ownerUpdateKernelSelectedSinks = 0;
	#ownerUpdateKernelStagedSinks = 0;
	#ownerUpdateGenericFallbackCuts = 0;
	#ownerUpdateGenericProjectors = 0;
	#preparedCellProgramRecords = /* @__PURE__ */ new WeakMap();
	#preparedCellDirtySlots = [];
	#preparedCellDirtyValues = [];
	#preparedCellDirtyCount = 0;
	#preparedCellCutEpoch = 0;
	#programSinkSlots = [];
	#programSinkSlotByGroup = /* @__PURE__ */ new Map();
	#programDirtySources = [];
	#programDirtySourceCount = 0;
	#programChangedSources = [];
	#programChangedSourceCount = 0;
	#programAffectedSinks = [];
	#programAffectedSinkCount = 0;
	#programOutputValues = [];
	#programOutputCount = 0;
	#programSourceEpoch = 0;
	#programSinkEpoch = 0;
	#programFreeSinkSlots = [];
	#columnRowsStageEpoch = 0;
	#columnRowsScratchGroups = [];
	#columnRowsScratchSources = [];
	#columnRowsScratchValues = [];
	#columnRowsScratchCount = 0;
	#columnRowsScratchActive = false;
	#columnRowsScratchCancelled = false;
	#groupsByCompiledBinding = /* @__PURE__ */ new Map();
	#groupsByCompiledSource = /* @__PURE__ */ new Map();
	#groupsByCompiledColumnBinding = /* @__PURE__ */ new Map();
	#groupsByCompiledColumn = /* @__PURE__ */ new Map();
	#groupsByCompiledColumnRows = /* @__PURE__ */ new Map();
	#sourceColumnCells = /* @__PURE__ */ new Map();
	#pendingSourceColumnPrunes = /* @__PURE__ */ new Set();
	#groupsByColumnCell = /* @__PURE__ */ new Map();
	#compiledSlotBySource = /* @__PURE__ */ new Map();
	#compiledGraph = null;
	#directBindingWrites = false;
	#version = 0;
	#partialCommitCount = 0;
	#partialCommitBatchCount = 0;
	#bindingIndexAttachOperations = 0;
	#bindingIndexDetachOperations = 0;
	#bindingIndexIndexOperations = 0;
	#sourceColumnPruneVisits = 0;
	#incompatibleScalarBindingGroups = 0;
	#profileCounter;
	#renderHost;
	#pendingRefs = /* @__PURE__ */ new Map();
	#committedRefs = /* @__PURE__ */ new Map();
	#refPublicationEpoch = 0;
	keyIndexMaintenance;
	bindingIndexMaintenance;
	constructor(host, container, profile, profileCounter, keyIndexMaintenance = "delta", bindingIndexMaintenance = "delta") {
		this.host = host;
		this.container = container;
		this.profile = profile;
		this.#profileCounter = profileCounter;
		this.keyIndexMaintenance = keyIndexMaintenance;
		this.bindingIndexMaintenance = bindingIndexMaintenance;
		this.#renderHost = {
			createElement: (tag, parent, props) => host.createElement(tag, parent, props),
			createText: (text) => host.createText(text),
			setText: (node, text) => host.setText(node, text),
			setProp: (node, name, value, previous) => {
				if (name === "ref") this.#pendingRefs.set(node, value == null ? null : value);
				else host.setProp(node, name, value, previous);
			},
			setStyleProp: host.setStyleProp ? (node, name, value, previous) => host.setStyleProp(node, name, value, previous) : void 0,
			prepareStyleProp: host.prepareStyleProp ? (node, name) => host.prepareStyleProp(node, name) : void 0,
			place: (parent, node, before) => host.place(parent, node, before),
			remove: (parent, node) => host.remove(parent, node),
			dispose: host.dispose ? (node) => host.dispose(node) : void 0,
			getPublicInstance: host.getPublicInstance ? (node) => host.getPublicInstance(node) : void 0
		};
	}
	get version() {
		return this.#version;
	}
	get partialCommitCount() {
		return this.#partialCommitCount;
	}
	get partialCommitBatchCount() {
		return this.#partialCommitBatchCount;
	}
	/** A read-only, host-neutral description of the latest committed tree. */
	get snapshot() {
		structuralCount("vdom.snapshot.accesses", "event", "vdom_snapshot_runtime.ts:snapshot");
		structuralBail("vdom-snapshot-inside-edit-window");
		if (this.#snapshotDirty) {
			this.#snapshot = this.#mounted.map(serializeMounted);
			this.#snapshotDirty = false;
		}
		return this.#snapshot;
	}
	commit(tree, compiledGraph = null, directBindingWrites = false) {
		this.prepareCommit(tree, compiledGraph, directBindingWrites).commit();
		this.flushRefs();
	}
	/** Publish ref changes staged by a completed host commit. */
	flushRefs() {
		const publicationEpoch = this.#refPublicationEpoch;
		const pending = [...this.#pendingRefs];
		structuralCount("ref.pending-array-length", "length", "vdom_snapshot_runtime.ts:flushRefs", pending.length);
		this.#pendingRefs.clear();
		const errors = [];
		for (const [node, nextRef] of pending) {
			structuralCount("ref.detach-pending-visits", "iteration", "vdom_snapshot_runtime.ts:flushRefs");
			if (publicationEpoch !== this.#refPublicationEpoch) break;
			const previous = this.#committedRefs.get(node);
			if (previous?.ref === nextRef) continue;
			if (!previous) continue;
			this.#committedRefs.delete(node);
			try {
				if (previous.cleanup) {
					structuralCount("ref.detach-callbacks", "event", "vdom_snapshot_runtime.ts:flushRefs");
					previous.cleanup();
				} else if (typeof previous.ref === "function") {
					structuralCount("ref.detach-callbacks", "event", "vdom_snapshot_runtime.ts:flushRefs");
					previous.ref(null);
				} else previous.ref.current = null;
			} catch (error) {
				errors.push(error);
			}
		}
		for (const [node, nextRef] of pending) {
			structuralCount("ref.attach-pending-visits", "iteration", "vdom_snapshot_runtime.ts:flushRefs");
			if (publicationEpoch !== this.#refPublicationEpoch) break;
			if (nextRef == null) continue;
			if (this.#committedRefs.get(node)?.ref === nextRef) continue;
			let instance;
			try {
				instance = this.host.getPublicInstance ? this.host.getPublicInstance(node) : node;
			} catch (error) {
				errors.push(error);
				continue;
			}
			const committed = {
				ref: nextRef,
				instance
			};
			this.#committedRefs.set(node, committed);
			try {
				if (typeof nextRef === "function") {
					structuralCount("ref.attach-callbacks", "event", "vdom_snapshot_runtime.ts:flushRefs");
					const cleanup = nextRef(instance);
					if (typeof cleanup === "function") {
						const release = cleanup;
						if (publicationEpoch !== this.#refPublicationEpoch || this.#committedRefs.get(node) !== committed) try {
							release();
						} catch (error) {
							errors.push(error);
						}
						else committed.cleanup = release;
					}
				} else nextRef.current = instance;
			} catch (error) {
				errors.push(error);
			}
		}
		if (errors.length > 0) throw new AggregateError(errors, "VDOM ref publication encountered errors");
	}
	/**
	* Normalize and validate a candidate before touching its host. A caller can
	* prepare every root in a transition first, then apply these synchronous
	* commits together in one task.
	*/
	prepareCommit(tree, compiledGraph = this.#compiledGraph, directBindingWrites = this.#directBindingWrites) {
		const next = normalizeMany(tree);
		validateUniqueKeys(next);
		if (compiledGraph) {
			this.#validateCompiledGraph(compiledGraph);
			const validateBindings = (nodes) => {
				for (const node of nodes) {
					if (node.kind !== "element") continue;
					for (const [name, value] of Object.entries(node.props)) for (const binding of compiledBindingsIn(name, value)) {
						const slot = binding.sourceSlot;
						if (slot < 0 || slot >= compiledGraph.sourceCount) throw new Error(`Compiled binding uses invalid source slot ${slot}`);
						const start = compiledGraph.sourceBindingOffsets[slot];
						const end = compiledGraph.sourceBindingOffsets[slot + 1];
						let found = false;
						for (let edge = start; edge < end; edge++) if (compiledGraph.bindingIds[edge] === binding.bindingId) found = true;
						if (!found) throw new Error(`Compiled binding ${binding.bindingId} is absent from source slot ${slot}`);
					}
					validateBindings(node.children);
				}
			};
			validateBindings(next);
		}
		let committed = false;
		return { commit: () => {
			if (committed) throw new Error("Prepared VDOM commit can only be applied once");
			committed = true;
			let oldIndexVisits = 0;
			let newIndexVisits = 0;
			const deltaPlainBindings = this.bindingIndexMaintenance === "delta" && compiledGraph === null && this.#compiledGraph === null && directBindingWrites === this.#directBindingWrites;
			const bindingAttachStart = this.#bindingIndexAttachOperations;
			const bindingDetachStart = this.#bindingIndexDetachOperations;
			const countIndexVisits = this.#profileCounter !== void 0;
			const deltaKeys = this.keyIndexMaintenance === "delta";
			const keyIndex = deltaKeys || deltaPlainBindings ? {
				detachKey: (node) => {
					if (!deltaKeys) return;
					if (countIndexVisits) oldIndexVisits++;
					this.#removeFromKeyIndex(node);
				},
				attachKey: (node) => {
					if (!deltaKeys) return;
					if (countIndexVisits) newIndexVisits++;
					this.#addToKeyIndex(node);
				},
				detach: (node) => {
					if (deltaKeys) {
						if (countIndexVisits) oldIndexVisits++;
						this.#removeFromKeyIndex(node);
					}
					if (deltaPlainBindings) this.#detachScalarBindingNode(node);
				},
				attach: (node) => {
					if (deltaKeys) {
						if (countIndexVisits) newIndexVisits++;
						this.#addToKeyIndex(node);
					}
					if (deltaPlainBindings) this.#attachScalarBindingNode(node);
				},
				...deltaPlainBindings ? { refreshProp: (node, name, value) => this.#refreshScalarBindingProp(node, name, value) } : {}
			} : void 0;
			try {
				this.#mounted = reconcileChildren(this.#renderHost, this.container, this.#mounted, next, keyIndex);
			} catch (error) {
				const repairErrors = [];
				try {
					this.#rebuildKeyIndex();
				} catch (repairError) {
					repairErrors.push(repairError);
				}
				try {
					this.#rebuildBindingIndex();
				} catch (repairError) {
					this.#clearBindingIndex();
					repairErrors.push(repairError);
				}
				if (repairErrors.length > 0) throw new AggregateError([error, ...repairErrors], "VDOM host commit and index repair failed");
				throw error;
			}
			for (let index = 0; index < this.#mounted.length; index++) {
				this.#mounted[index].parent = null;
				this.#mounted[index].parentIndex = index;
			}
			this.#snapshot = next;
			this.#snapshotDirty = false;
			this.#compiledGraph = compiledGraph;
			this.#directBindingWrites = directBindingWrites;
			if (deltaPlainBindings && countIndexVisits) this.#profileCounter?.({
				"vdom.binding-index.incremental-group-detaches": this.#bindingIndexDetachOperations - bindingDetachStart,
				"vdom.binding-index.incremental-group-attaches": this.#bindingIndexAttachOperations - bindingAttachStart
			});
			else if (!deltaPlainBindings) this.#rebuildBindingIndex();
			this.#pruneSourceColumnCells();
			if (this.keyIndexMaintenance === "rebuild") this.#rebuildKeyIndex();
			else if (countIndexVisits) this.#profileCounter?.({
				"vdom.key-index.incremental-old-visits": oldIndexVisits,
				"vdom.key-index.incremental-new-visits": newIndexVisits
			});
			this.#version++;
		} };
	}
	/**
	* Update one globally unique keyed host region without normalizing or
	* reconciling its siblings. Returns false when that fast path is unsafe.
	*/
	commitKeyedRegion(key, tree) {
		if (this.#directBindingWrites) {
			const prepared = this.prepareKeyedRegions([{
				key,
				tree
			}]);
			if (!prepared) return false;
			prepared.commit();
			return true;
		}
		if (this.#compiledGraph || this.#directBindingWrites || this.#groupsBySource.size > 0) return false;
		const matches = this.#nodesByKey.get(key);
		if (!matches || matches.size !== 1) return false;
		let started = this.profile ? performance.now() : 0;
		const [next] = normalizeMany(tree);
		this.profile?.("vdom.normalize", performance.now() - started);
		started = this.profile ? performance.now() : 0;
		const target = matches.values().next().value;
		if (!target || !next || next.key !== key || !compatible(target.vnode, next)) return false;
		let oldIndexVisits = 0;
		let newIndexVisits = 0;
		const countIndexVisits = this.#profileCounter !== void 0;
		const previousSubtree = [];
		if (this.keyIndexMaintenance === "rebuild") {
			const collect = (node) => {
				previousSubtree.push({
					node,
					key: node.vnode.key
				});
				if (countIndexVisits) oldIndexVisits++;
				forEachMountedChild(node, collect);
			};
			collect(target);
			for (const { node, key: oldKey } of previousSubtree) if (oldKey !== null) this.#removeKeyFromIndex(oldKey, node);
		}
		const keyIndex = this.keyIndexMaintenance === "delta" ? {
			detach: (node) => {
				if (countIndexVisits) oldIndexVisits++;
				this.#removeFromKeyIndex(node);
			},
			attach: (node) => {
				if (countIndexVisits) newIndexVisits++;
				this.#addToKeyIndex(node);
			}
		} : void 0;
		const parent = target.parent ? target.parent.handle : this.container;
		updateMounted(this.#renderHost, parent, target, next, keyIndex);
		if (this.keyIndexMaintenance === "rebuild") {
			const indexSubtree = (node) => {
				if (countIndexVisits) newIndexVisits++;
				this.#addToKeyIndex(node);
				forEachMountedChild(node, indexSubtree);
			};
			indexSubtree(target);
		}
		this.profile?.("vdom.reconcile-host", performance.now() - started);
		started = this.profile ? performance.now() : 0;
		this.#snapshotDirty = true;
		this.#version++;
		this.#partialCommitCount++;
		this.#partialCommitBatchCount++;
		if (countIndexVisits) this.#profileCounter?.(this.keyIndexMaintenance === "delta" ? {
			"vdom.key-index.incremental-old-visits": oldIndexVisits,
			"vdom.key-index.incremental-new-visits": newIndexVisits
		} : {
			"vdom.key-index.subtree-rescan-old-visits": oldIndexVisits,
			"vdom.key-index.subtree-rescan-new-visits": newIndexVisits
		});
		this.profile?.("vdom.index-snapshot", performance.now() - started);
		return true;
	}
	/**
	* Apply a small structural edit directly to a compiler-marked keyed child
	* region. Ordinary ScalarSource/BoundValue writers are updated only within
	* changed subtrees, including ordinary direct property/style groups.
	* Compiled CSR and column roots retain their generic fallback.
	* The operation list is validated before host writes; order storage remains
	* bucketed and is never expanded to a sibling array on this path.
	*/
	commitKeyedRegionDelta(parentKey, regionId, operations) {
		const committed = this.#commitKeyedRegionDelta(parentKey, regionId, operations);
		if (committed) this.#pruneSourceColumnCells();
		return committed;
	}
	#commitKeyedRegionDelta(parentKey, regionId, operations, incrementVersion = true, preparedNodes) {
		if (!parentKey || !regionId || this.#compiledGraph || this.#incompatibleScalarBindingGroups > 0) {
			this.#profileCounter?.({ "vdom.keyed-region-delta.bail.root-guard": 1 });
			return false;
		}
		const roots = this.#nodesByKey.get(parentKey);
		if (!roots || roots.size !== 1) {
			this.#profileCounter?.({ "vdom.keyed-region-delta.bail.root-lookup": 1 });
			return false;
		}
		const root = roots.values().next().value;
		if (!root) return false;
		const candidates = this.#nodesByKeyedRegion.get(regionId);
		let parent;
		let matches = 0;
		for (const candidate of candidates ?? []) {
			structuralCount("vdom.delta.region-candidate-visits", "iteration", "vdom_snapshot_runtime.ts:commitKeyedRegionDelta");
			let ancestor = candidate;
			while (ancestor !== root && ancestor.parent) {
				structuralCount("vdom.delta.ancestor-steps", "iteration", "vdom_snapshot_runtime.ts:commitKeyedRegionDelta");
				ancestor = ancestor.parent;
			}
			if (ancestor !== root) continue;
			if (candidate.vnode.kind === "element" && candidate.keyedChildren) {
				parent = candidate;
				matches++;
			}
		}
		if (matches !== 1) {
			this.#profileCounter?.({ [`vdom.keyed-region-delta.bail.region-matches-${matches}`]: 1 });
			return false;
		}
		const region = parent?.keyedChildren;
		if (!parent || parent.vnode.kind !== "element" || !region || parent.vnode.keyedRegionId !== regionId) {
			this.#profileCounter?.({ "vdom.keyed-region-delta.bail.parent-guard": 1 });
			return false;
		}
		if (operations.length === 0) return true;
		const normalized = /* @__PURE__ */ new Map();
		const state = /* @__PURE__ */ new Map();
		const present = (key) => {
			if (!state.has(key)) state.set(key, region.has(key));
			return state.get(key);
		};
		const validateScalarBindings = (node) => {
			if (node.kind === "text") return true;
			for (const [name, value] of Object.entries(node.props)) try {
				if (hasNonScalarBindingMetadata(name, value)) return false;
				if (compiledBindingsIn(name, value).length > 0) return false;
				if (boundSourcesIn(name, value).length > 0) materializeProp(name, value);
			} catch {
				return false;
			}
			return node.children.every(validateScalarBindings);
		};
		for (let index = 0; index < operations.length; index++) {
			structuralCount("vdom.delta.validate-operation-visits", "iteration", "vdom_snapshot_runtime.ts:commitKeyedRegionDelta");
			const operation = operations[index];
			if (!operation.key) return false;
			if (operation.type === "insert" || operation.type === "replace") {
				const key = operation.key;
				if (operation.type === "insert") {
					if (present(key)) return false;
					if (operation.beforeKey !== null && !present(operation.beforeKey)) return false;
					const roots = preparedNodes?.has(operation) ? [preparedNodes.get(operation)] : normalizeMany(operation.tree);
					if (roots.length !== 1 || roots[0].key !== key) return false;
					try {
						validateUniqueKeys(roots);
					} catch {
						return false;
					}
					if (!validateScalarBindings(roots[0])) return false;
					normalized.set(index, roots[0]);
					state.set(key, true);
				} else {
					if (!present(key)) return false;
					const roots = preparedNodes?.has(operation) ? [preparedNodes.get(operation)] : normalizeMany(operation.tree);
					if (roots.length !== 1 || roots[0].key !== key) return false;
					try {
						validateUniqueKeys(roots);
					} catch {
						return false;
					}
					if (!validateScalarBindings(roots[0])) return false;
					normalized.set(index, roots[0]);
				}
			} else if (operation.type === "remove") {
				if (!present(operation.key)) return false;
				state.set(operation.key, false);
			} else {
				if (!present(operation.key)) return false;
				if (operation.beforeKey !== null && !present(operation.beforeKey)) return false;
			}
		}
		const keyIndex = {
			detach: (node) => this.#removeFromKeyIndex(node),
			attach: (node) => this.#addToKeyIndex(node)
		};
		const bindingAttachStart = this.#bindingIndexAttachOperations;
		const bindingDetachStart = this.#bindingIndexDetachOperations;
		const bindingIndexStart = this.#bindingIndexIndexOperations;
		const hostParent = parent.handle;
		for (let index = 0; index < operations.length; index++) {
			structuralCount("vdom.delta.commit-operation-visits", "iteration", "vdom_snapshot_runtime.ts:commitKeyedRegionDelta");
			const operation = operations[index];
			if (operation.type === "remove") {
				const child = region.get(operation.key);
				region.remove(operation.key);
				visitMountedSubtree(child, keyIndex.detach);
				this.#detachScalarBindingSubtree(child);
				removeMountedSubtree(this.#renderHost, hostParent, child);
			} else if (operation.type === "move") {
				if (operation.key === operation.beforeKey) continue;
				const child = region.get(operation.key);
				const anchor = operation.beforeKey === null ? null : region.get(operation.beforeKey).handle;
				region.moveBefore(operation.key, operation.beforeKey);
				this.#renderHost.place(hostParent, child.handle, anchor);
			} else if (operation.type === "insert") {
				const vnode = normalized.get(index);
				const child = createMounted(this.#renderHost, vnode, hostParent, keyIndex);
				child.parent = parent;
				child.parentIndex = -1;
				const anchor = operation.beforeKey === null ? null : region.get(operation.beforeKey).handle;
				region.insertBefore(operation.beforeKey, operation.key, child);
				this.#renderHost.place(hostParent, child.handle, anchor);
				this.#attachScalarBindingSubtree(child);
			} else {
				const old = region.get(operation.key);
				this.#detachScalarBindingSubtree(old);
				updateMounted(this.#renderHost, hostParent, old, normalized.get(index), keyIndex);
				this.#attachScalarBindingSubtree(region.get(operation.key));
			}
		}
		const releasedChildVNodeCount = parent.vnode.children.length;
		structuralCount("vdom.delta.released-child-array-length", "length", "vdom_snapshot_runtime.ts:commitKeyedRegionDelta", releasedChildVNodeCount);
		parent.vnode.children = [];
		this.#snapshot = [];
		this.#snapshotDirty = true;
		if (incrementVersion) this.#version++;
		this.#partialCommitCount++;
		this.#partialCommitBatchCount++;
		this.#profileCounter?.({
			"vdom.keyed-region-delta.operations": operations.length,
			"vdom.keyed-region-delta.bucket-count": region.bucketCount,
			"vdom.keyed-region-delta.binding-attaches": this.#bindingIndexAttachOperations - bindingAttachStart,
			"vdom.keyed-region-delta.binding-detaches": this.#bindingIndexDetachOperations - bindingDetachStart,
			"vdom.keyed-region-delta.binding-index-operations": this.#bindingIndexIndexOperations - bindingIndexStart,
			"vdom.keyed-region-delta.released-child-vnodes": releasedChildVNodeCount
		});
		return true;
	}
	prepareKeyedRegionDelta(parentKey, regionId, operations) {
		return this.prepareKeyedRegionDeltas([{
			parentKey,
			regionId,
			operations
		}]);
	}
	/** Prepare keyed sparse edits and keyed leaf replacements as one host phase. */
	prepareKeyedRegionDeltas(deltas, regions = []) {
		if (this.#compiledGraph || this.#incompatibleScalarBindingGroups > 0 || deltas.length === 0 && regions.length === 0) return null;
		const baseVersion = this.#version;
		const hasLeafRegions = regions.length > 0;
		const preparedDeltas = [];
		const deltaParents = /* @__PURE__ */ new Set();
		const regionIds = /* @__PURE__ */ new Set();
		const touchedKeys = /* @__PURE__ */ new Map();
		const replacedNodes = /* @__PURE__ */ new Set();
		const candidateKeys = /* @__PURE__ */ new Set();
		const candidateRoots = [];
		const isAncestor = (ancestor, node) => {
			for (let current = node; current; current = current.parent) {
				structuralCount("vdom.prepare.ancestor-steps", "iteration", "vdom_snapshot_runtime.ts:prepareKeyedRegionDeltas");
				if (current === ancestor) return true;
			}
			return false;
		};
		const collectMounted = (node) => {
			structuralCount("vdom.prepare.replaced-subtree-visits", "iteration", "vdom_snapshot_runtime.ts:prepareKeyedRegionDeltas");
			if (replacedNodes.has(node)) return false;
			replacedNodes.add(node);
			forEachMountedChild(node, collectMounted);
			return true;
		};
		const validateBindings = (node) => {
			if (node.kind === "text") return true;
			for (const [name, value] of Object.entries(node.props)) {
				if (hasNonScalarBindingMetadata(name, value)) return false;
				if (compiledBindingsIn(name, value).length > 0) return false;
				if (boundSourcesIn(name, value).length > 0) materializeProp(name, value);
			}
			return node.children.every(validateBindings);
		};
		const candidateKeyOwners = /* @__PURE__ */ new Map();
		const collectCandidateKeys = (node, owner) => {
			structuralCount("vdom.prepare.candidate-key-node-visits", "iteration", "vdom_snapshot_runtime.ts:prepareKeyedRegionDeltas");
			if (node.kind === "text") return true;
			if (node.key !== null) {
				const previousOwner = candidateKeyOwners.get(node.key);
				if (previousOwner !== void 0 && previousOwner !== owner) return false;
				candidateKeyOwners.set(node.key, owner);
				candidateKeys.add(node.key);
			}
			return node.children.every((child) => collectCandidateKeys(child, owner));
		};
		try {
			for (const delta of deltas) {
				structuralCount("vdom.prepare.delta-visits", "iteration", "vdom_snapshot_runtime.ts:prepareKeyedRegionDeltas");
				if (!delta.parentKey || !delta.regionId || regionIds.has(delta.regionId)) return null;
				regionIds.add(delta.regionId);
				const matches = this.#nodesByKey.get(delta.parentKey);
				if (!matches || matches.size !== 1) return null;
				const root = matches.values().next().value;
				if (!root || root.hostDisposed) return null;
				let parent;
				let matchesRegion = 0;
				for (const candidate of this.#nodesByKeyedRegion.get(delta.regionId) ?? []) {
					structuralCount("vdom.prepare.region-candidate-visits", "iteration", "vdom_snapshot_runtime.ts:prepareKeyedRegionDeltas");
					if (!isAncestor(root, candidate)) continue;
					if (candidate.vnode.kind === "element" && candidate.keyedChildren) {
						parent = candidate;
						matchesRegion++;
					}
				}
				if (matchesRegion !== 1 || !parent || parent.vnode.kind !== "element" || parent.vnode.keyedRegionId !== delta.regionId || deltaParents.has(parent)) return null;
				for (const previous of deltaParents) if (isAncestor(previous, parent) || isAncestor(parent, previous)) return null;
				deltaParents.add(parent);
				const bucket = parent.keyedChildren;
				const operations = delta.operations.map((operation) => ({ ...operation }));
				const virtual = /* @__PURE__ */ new Map();
				const present = (key) => {
					if (!virtual.has(key)) virtual.set(key, bucket.has(key));
					return virtual.get(key);
				};
				const nodes = /* @__PURE__ */ new Map();
				for (const op of operations) {
					structuralCount("vdom.prepare.operation-visits", "iteration", "vdom_snapshot_runtime.ts:prepareKeyedRegionDeltas");
					if (!op.key) return null;
					const previousRegion = touchedKeys.get(op.key);
					if (previousRegion !== void 0 && previousRegion !== delta.regionId) return null;
					touchedKeys.set(op.key, delta.regionId);
					if (op.type === "insert" || op.type === "replace") {
						if (op.type === "insert") {
							if (present(op.key) || op.beforeKey !== null && !present(op.beforeKey)) return null;
						} else if (!present(op.key)) return null;
						const candidates = normalizeMany(op.tree);
						if (candidates.length !== 1 || candidates[0].key !== op.key) return null;
						validateUniqueKeys(candidates);
						if (!validateBindings(candidates[0])) return null;
						nodes.set(op, candidates[0]);
						candidateRoots.push({
							node: candidates[0],
							owner: `${delta.regionId}\0${op.key}`
						});
						if (op.type === "replace") {
							const old = bucket.get(op.key);
							if (old) collectMounted(old);
						} else virtual.set(op.key, true);
					} else if (op.type === "remove") {
						if (!present(op.key)) return null;
						const old = bucket.get(op.key);
						if (old) collectMounted(old);
						virtual.set(op.key, false);
					} else {
						if (!present(op.key) || op.beforeKey !== null && !present(op.beforeKey)) return null;
						if (op.key === op.beforeKey) continue;
					}
				}
				preparedDeltas.push({
					...delta,
					root,
					parent,
					operations,
					nodes
				});
			}
			for (const parent of deltaParents) if (replacedNodes.has(parent)) return null;
			const leafPrepared = /* @__PURE__ */ new Set();
			for (const region of regions) {
				if (!region.key) return null;
				const matches = this.#nodesByKey.get(region.key);
				if (!matches || matches.size !== 1) return null;
				const target = matches.values().next().value;
				const candidates = normalizeMany(region.tree);
				if (!target || target.hostDisposed || candidates.length !== 1 || candidates[0].key !== region.key || !compatible(target.vnode, candidates[0])) return null;
				for (const prior of leafPrepared) if (isAncestor(prior, target) || isAncestor(target, prior)) return null;
				for (const deltaParent of deltaParents) if (isAncestor(deltaParent, target) || isAncestor(target, deltaParent)) return null;
				if (!validateBindings(candidates[0])) return null;
				validateUniqueKeys(candidates);
				if (!collectMounted(target)) return null;
				leafPrepared.add(target);
				candidateRoots.push({
					node: candidates[0],
					owner: `leaf\0${region.key}`
				});
			}
			for (const candidate of candidateRoots) if (!collectCandidateKeys(candidate.node, candidate.owner)) return null;
			for (const key of candidateKeys) {
				const existing = this.#nodesByKey.get(key);
				if (existing && [...existing].some((node) => !replacedNodes.has(node))) return null;
			}
		} catch {
			return null;
		}
		if (this.#version !== baseVersion) return null;
		const leafPlan = /* @__PURE__ */ new Map();
		for (const candidate of candidateRoots) if (candidate.owner.startsWith("leaf\0")) {
			const key = candidate.owner.slice(5);
			leafPlan.set(key, candidate.node);
		}
		const preparedLeaves = hasLeafRegions ? this.#prepareKeyedRegions(regions, false, leafPlan) : null;
		if (regions.length > 0 && !preparedLeaves) return null;
		let state = "prepared";
		let released = false;
		const program = {
			validate: () => state === "prepared" && this.#version === baseVersion && preparedDeltas.every(({ root, parent, parentKey, regionId }) => {
				const entries = this.#nodesByKey.get(parentKey);
				if (root.hostDisposed || parent.hostDisposed || entries?.size !== 1 || !entries.has(root)) return false;
				let found = 0;
				for (const candidate of this.#nodesByKeyedRegion.get(regionId) ?? []) if (isAncestor(root, candidate) && candidate === parent && candidate.keyedChildren && candidate.vnode.kind === "element" && candidate.vnode.keyedRegionId === regionId) found++;
				return found === 1;
			}) && (!hasLeafRegions || preparedLeaves.validate?.() !== false),
			commit: () => {
				if (state !== "prepared") throw new Error("Prepared keyed VDOM program is no longer available");
				if (!program.validate()) {
					program.discard();
					throw new Error("Prepared keyed VDOM program is stale");
				}
				state = "committed";
				const pendingRefsBefore = new Map(this.#pendingRefs);
				const batchCountBefore = this.#partialCommitBatchCount;
				const changed = preparedDeltas.some(({ operations }) => operations.length > 0) || hasLeafRegions;
				try {
					for (const delta of preparedDeltas) if (delta.operations.length > 0 && !this.#commitKeyedRegionDelta(delta.parentKey, delta.regionId, delta.operations, false, delta.nodes)) throw new Error("Prepared keyed-region delta could not be applied");
					preparedLeaves?.commit();
					this.#pruneSourceColumnCells();
					if (changed) this.#version = baseVersion + 1;
					this.#partialCommitBatchCount = batchCountBefore + Number(changed);
				} catch (error) {
					this.#pendingRefs.clear();
					for (const [node, ref] of pendingRefsBefore) this.#pendingRefs.set(node, ref);
					this.#snapshotDirty = true;
					this.#version = baseVersion + 1;
					this.#partialCommitBatchCount = batchCountBefore + 1;
					const repairErrors = [];
					try {
						this.#rebuildKeyIndex();
					} catch (repairError) {
						repairErrors.push(repairError);
					}
					try {
						this.#rebuildBindingIndex();
					} catch (repairError) {
						this.#clearBindingIndex();
						repairErrors.push(repairError);
					}
					if (repairErrors.length) throw new AggregateError([error, ...repairErrors], "Prepared keyed VDOM host commit and index repair failed");
					throw error;
				} finally {
					program.discard();
				}
			},
			discard: () => {
				if (released) return;
				released = true;
				if (state === "prepared") state = "discarded";
				preparedLeaves?.discard?.();
				leafPlan.clear();
				preparedDeltas.length = 0;
				candidateRoots.length = 0;
				candidateKeys.clear();
				candidateKeyOwners.clear();
				replacedNodes.clear();
				deltaParents.clear();
				regionIds.clear();
				touchedKeys.clear();
			}
		};
		return program;
	}
	/**
	* Prepare a coherent host candidate for disjoint, globally keyed regions.
	* Returns null when the current root or candidate cannot use the incremental
	* ordinary-binding path. The returned handle is one-shot and checks the root
	* version again before it mutates any host nodes.
	*/
	prepareKeyedRegions(regions) {
		return this.#prepareKeyedRegions(regions, true);
	}
	#prepareKeyedRegions(regions, incrementVersion, normalizedOverrides) {
		if (regions.length === 0 || this.#compiledGraph !== null || this.bindingIndexMaintenance !== "delta" || this.keyIndexMaintenance !== "delta") return null;
		const preparedVersion = this.#version;
		const prepared = [];
		const replacedNodes = /* @__PURE__ */ new Set();
		const candidateKeys = /* @__PURE__ */ new Set();
		const seenTargets = /* @__PURE__ */ new Set();
		const countVisits = this.#profileCounter !== void 0;
		let validationNodeVisits = 0;
		let oldSubtreeVisits = 0;
		let newCandidateKeyVisits = 0;
		const validateCandidate = (node) => {
			if (countVisits) validationNodeVisits++;
			if (node.kind === "text") return true;
			for (const [name, value] of Object.entries(node.props)) {
				if (hasNonScalarBindingMetadata(name, value)) return false;
				if (compiledBindingsIn(name, value).length > 0) return false;
				boundSourcesIn(name, value);
			}
			return node.children.every(validateCandidate);
		};
		for (const region of regions) {
			if (!region.key || seenTargets.has(region.key)) return null;
			seenTargets.add(region.key);
			const matches = this.#nodesByKey.get(region.key);
			if (!matches || matches.size !== 1) return null;
			const target = matches.values().next().value;
			const normalized = normalizedOverrides?.has(region.key) ? [normalizedOverrides.get(region.key)] : normalizeMany(region.tree);
			if (normalized.length !== 1) return null;
			const next = normalized[0];
			try {
				validateUniqueKeys([next]);
			} catch {
				return null;
			}
			if (!target || target.hostDisposed || next.key !== region.key || !compatible(target.vnode, next)) return null;
			try {
				if (!validateCandidate(next)) return null;
			} catch {
				return null;
			}
			const collectOld = (node) => {
				if (countVisits) oldSubtreeVisits++;
				if (replacedNodes.has(node)) return false;
				replacedNodes.add(node);
				forEachMountedChild(node, (child) => {
					if (!collectOld(child)) overlappingSubtree = true;
				});
				return !overlappingSubtree;
			};
			let overlappingSubtree = false;
			if (!collectOld(target) || overlappingSubtree) return null;
			prepared.push({
				target,
				next
			});
		}
		const collectCandidateKeys = (node) => {
			if (countVisits) newCandidateKeyVisits++;
			if (node.kind === "text") return true;
			if (node.key !== null) {
				if (candidateKeys.has(node.key)) return false;
				candidateKeys.add(node.key);
			}
			return node.children.every(collectCandidateKeys);
		};
		for (const { next } of prepared) if (!collectCandidateKeys(next)) return null;
		for (const key of candidateKeys) {
			const existing = this.#nodesByKey.get(key);
			if (existing && [...existing].some((node) => !replacedNodes.has(node))) return null;
		}
		if (this.#version !== preparedVersion) return null;
		let committed = false;
		let released = false;
		const release = () => {
			if (released) return;
			released = true;
			committed = true;
			prepared.length = 0;
			replacedNodes.clear();
			candidateKeys.clear();
			seenTargets.clear();
		};
		return {
			validate: () => !committed && this.#version === preparedVersion && prepared.every(({ target }) => {
				const entries = target.vnode.key === null ? void 0 : this.#nodesByKey.get(target.vnode.key);
				return !target.hostDisposed && entries?.size === 1 && entries.has(target);
			}),
			discard: release,
			commit: () => {
				if (committed) throw new Error("Prepared VDOM commit can only be applied once");
				committed = true;
				if (this.#version !== preparedVersion || prepared.some(({ target }) => {
					const entries = target.vnode.key === null ? void 0 : this.#nodesByKey.get(target.vnode.key);
					return target.hostDisposed || entries?.size !== 1 || !entries.has(target);
				})) {
					release();
					throw new Error("Prepared VDOM keyed-region candidate is stale");
				}
				let oldIndexVisits = 0;
				let newIndexVisits = 0;
				const keyIndex = {
					detach: (node) => {
						if (countVisits) oldIndexVisits++;
						this.#removeFromKeyIndex(node);
						this.#detachScalarBindingNode(node);
					},
					attach: (node) => {
						if (countVisits) newIndexVisits++;
						this.#addToKeyIndex(node);
						this.#attachScalarBindingNode(node);
					},
					detachKey: (node) => {
						if (countVisits) oldIndexVisits++;
						this.#removeFromKeyIndex(node);
					},
					attachKey: (node) => {
						if (countVisits) newIndexVisits++;
						this.#addToKeyIndex(node);
					},
					refreshProp: (node, name, value) => this.#refreshScalarBindingProp(node, name, value)
				};
				const bindingAttachStart = this.#bindingIndexAttachOperations;
				const bindingDetachStart = this.#bindingIndexDetachOperations;
				const bindingIndexStart = this.#bindingIndexIndexOperations;
				const pendingRefsBeforeCommit = new Map(this.#pendingRefs);
				const preparedCount = prepared.length;
				try {
					for (const { target, next } of prepared) {
						const parent = target.parent ? target.parent.handle : this.container;
						updateMounted(this.#renderHost, parent, target, next, keyIndex);
					}
				} catch (error) {
					this.#pendingRefs.clear();
					for (const [node, ref] of pendingRefsBeforeCommit) this.#pendingRefs.set(node, ref);
					this.#snapshotDirty = true;
					if (incrementVersion) this.#version++;
					const repairErrors = [];
					try {
						this.#rebuildKeyIndex();
					} catch (repairError) {
						repairErrors.push(repairError);
					}
					try {
						this.#rebuildBindingIndex();
					} catch (repairError) {
						this.#clearBindingIndex();
						repairErrors.push(repairError);
					}
					if (repairErrors.length > 0) throw new AggregateError([error, ...repairErrors], "VDOM keyed-region host commit and index repair failed");
					throw error;
				} finally {
					release();
				}
				this.#pruneSourceColumnCells();
				this.#snapshotDirty = true;
				if (incrementVersion) this.#version++;
				this.#partialCommitCount += preparedCount;
				this.#partialCommitBatchCount++;
				if (countVisits) this.#profileCounter?.({
					"vdom.prepared-keyed-regions.validation-node-visits": validationNodeVisits,
					"vdom.prepared-keyed-regions.old-subtree-visits": oldSubtreeVisits,
					"vdom.prepared-keyed-regions.new-candidate-key-visits": newCandidateKeyVisits,
					"vdom.key-index.incremental-old-visits": oldIndexVisits,
					"vdom.key-index.incremental-new-visits": newIndexVisits,
					"vdom.binding-index.incremental-group-detaches": this.#bindingIndexDetachOperations - bindingDetachStart,
					"vdom.binding-index.incremental-group-attaches": this.#bindingIndexAttachOperations - bindingAttachStart,
					"vdom.binding-index.incremental-index-operations": this.#bindingIndexIndexOperations - bindingIndexStart
				});
			}
		};
	}
	/**
	* Atomically prepare and patch several disjoint, globally keyed host regions.
	* Returns false without changing the host if any target is missing,
	* incompatible, bound, duplicated, or would collide with a surviving key.
	*/
	commitKeyedRegions(regions) {
		if (this.#directBindingWrites) {
			const prepared = this.prepareKeyedRegions(regions);
			if (!prepared) return false;
			prepared.commit();
			return true;
		}
		if (regions.length === 0 || this.#compiledGraph || this.#directBindingWrites || this.#groupsBySource.size > 0) return false;
		const seenTargetKeys = /* @__PURE__ */ new Set();
		const replacedNodes = /* @__PURE__ */ new Set();
		const prepared = [];
		for (const region of regions) {
			if (!region.key || seenTargetKeys.has(region.key)) return false;
			seenTargetKeys.add(region.key);
			const matches = this.#nodesByKey.get(region.key);
			if (!matches || matches.size !== 1) return false;
			const target = matches.values().next().value;
			const normalized = normalizeMany(region.tree);
			if (normalized.length !== 1) return false;
			const next = normalized[0];
			try {
				validateUniqueKeys([next]);
			} catch {
				return false;
			}
			if (!target || next.key !== region.key || !compatible(target.vnode, next)) return false;
			if (replacedNodes.has(target)) return false;
			const collect = (node) => {
				replacedNodes.add(node);
				forEachMountedChild(node, collect);
			};
			collect(target);
			prepared.push({
				key: region.key,
				target,
				next
			});
		}
		const candidateKeys = /* @__PURE__ */ new Set();
		const collectCandidateKeys = (node) => {
			if (node.kind !== "element") return true;
			if (node.key !== null) {
				if (candidateKeys.has(node.key)) return false;
				candidateKeys.add(node.key);
			}
			return node.children.every(collectCandidateKeys);
		};
		for (const item of prepared) if (!collectCandidateKeys(item.next)) return false;
		for (const key of candidateKeys) {
			const existing = this.#nodesByKey.get(key);
			if (existing && [...existing].some((node) => !replacedNodes.has(node))) return false;
		}
		let oldIndexVisits = 0;
		let newIndexVisits = 0;
		const countIndexVisits = this.#profileCounter !== void 0;
		const previousSubtrees = [];
		if (this.keyIndexMaintenance === "rebuild") {
			for (const item of prepared) {
				const previousSubtree = [];
				const collect = (node) => {
					previousSubtree.push({
						node,
						key: node.vnode.key
					});
					if (countIndexVisits) oldIndexVisits++;
					forEachMountedChild(node, collect);
				};
				collect(item.target);
				previousSubtrees.push(previousSubtree);
			}
			for (const subtree of previousSubtrees) for (const { node, key: oldKey } of subtree) if (oldKey !== null) this.#removeKeyFromIndex(oldKey, node);
		}
		const keyIndex = this.keyIndexMaintenance === "delta" ? {
			detach: (node) => {
				if (countIndexVisits) oldIndexVisits++;
				this.#removeFromKeyIndex(node);
			},
			attach: (node) => {
				if (countIndexVisits) newIndexVisits++;
				this.#addToKeyIndex(node);
			}
		} : void 0;
		for (const item of prepared) {
			const parent = item.target.parent ? item.target.parent.handle : this.container;
			updateMounted(this.#renderHost, parent, item.target, item.next, keyIndex);
		}
		if (this.keyIndexMaintenance === "rebuild") {
			const indexSubtree = (node) => {
				if (countIndexVisits) newIndexVisits++;
				this.#addToKeyIndex(node);
				forEachMountedChild(node, indexSubtree);
			};
			for (const item of prepared) indexSubtree(item.target);
		}
		this.#snapshotDirty = true;
		this.#version++;
		this.#partialCommitCount += prepared.length;
		this.#partialCommitBatchCount++;
		if (countIndexVisits) this.#profileCounter?.(this.keyIndexMaintenance === "delta" ? {
			"vdom.key-index.incremental-old-visits": oldIndexVisits,
			"vdom.key-index.incremental-new-visits": newIndexVisits
		} : {
			"vdom.key-index.subtree-rescan-old-visits": oldIndexVisits,
			"vdom.key-index.subtree-rescan-new-visits": newIndexVisits
		});
		return true;
	}
	/**
	* Update every retained VDOM prop that depends on this source. The VDOM tree
	* is not re-walked; work follows the source-to-prop index built at commit.
	*/
	setSource(source, value) {
		return this.setSources([[source, value]]);
	}
	/** Whether this committed VDOM currently retains props bound to a source. */
	hasBoundSource(source) {
		const groups = this.#compiledGraph ? this.#groupsByCompiledSource.get(source) : this.#groupsBySource.get(source);
		return !!groups && (groups instanceof Set ? groups.size : groups.length) > 0;
	}
	/** Whether every retained writer for this source is a supported direct numeric program. */
	hasSourceProgram(source) {
		return !!this.#programSourceSlots.get(source)?.eligible;
	}
	/**
	* Associate existing unary compiler-proven writers with one published
	* numeric column cell. This records an index only; it does not write hosts
	* or alter the source's binding metadata.
	*/
	bindSourceColumn(source, column, row) {
		if (this.#numericWriteInProgress || this.#compiledGraph || !this.#directBindingWrites || !Number.isSafeInteger(row) || row < 0 || row >= column.values.length) return false;
		const groups = this.#groupsBySource.get(source);
		const slot = this.#programSourceSlots.get(source);
		if (!groups?.size || !slot?.eligible || !slot.unaryEligible) return false;
		const prior = this.#sourceColumnCells.get(source);
		if (prior) return prior.column === column && prior.row === row;
		this.#sourceColumnCells.set(source, {
			column,
			row
		});
		for (const group of groups) this.#indexSourceColumnGroup(source, group);
		return true;
	}
	/**
	* Prepare one source's unary cell-writer fanout. The returned token is tied
	* to this VDOM root, source slot, cell address, and the current binding
	* generation; it becomes stale when that source's bindings change.
	*/
	prepareNumericCellProgram(source, column, row) {
		if (this.#numericWriteInProgress || this.#compiledGraph || !this.#directBindingWrites || !Number.isSafeInteger(row) || row < 0 || row >= column.values.length) return null;
		const slot = this.#programSourceSlots.get(source);
		if (!slot?.eligible || !slot.unaryEligible || slot.groups.length === 0) return null;
		if (!this.bindSourceColumn(source, column, row)) return null;
		const cell = this.#sourceColumnCells.get(source);
		if (!cell || cell.column !== column || cell.row !== row) return null;
		const current = slot.cellProgram;
		if (current?.active && current.generation === slot.cellProgramGeneration && current.column === column && current.row === row && current.groups === slot.groups) return current.token;
		if (current) this.#invalidatePreparedNumericCellProgram(slot);
		const token = Object.freeze({});
		const record = {
			token,
			root: this,
			slot,
			source,
			column,
			row,
			generation: slot.cellProgramGeneration,
			groups: slot.groups,
			active: true
		};
		slot.cellProgram = record;
		this.#preparedCellProgramRecords.set(token, record);
		return token;
	}
	/** Prepare a compiler-v2 owner-row fanout once for a committed World row. */
	prepareNumericRowProgram(spec) {
		if (this.#numericWriteInProgress || this.#compiledGraph || !this.#directBindingWrites || !Number.isSafeInteger(spec.owner) || !Number.isSafeInteger(spec.row) || spec.row < 0 || !Number.isSafeInteger(spec.generation) || spec.generation < 0 || typeof spec.rowIdentity !== "object" || spec.rowIdentity === null) return null;
		let layout;
		try {
			layout = normalizeCompiledStateLayout(spec.layout);
		} catch {
			return null;
		}
		if (!layout.programId || layout.slots.length === 0) return null;
		const slotCount = layout.slots.length;
		if (spec.sources.length !== slotCount || spec.columns.length !== slotCount) return null;
		const layoutSignature = compiledStateLayoutSignature(layout);
		const priorIdentityRecord = this.#preparedNumericRowByIdentity.get(spec.rowIdentity);
		if (priorIdentityRecord) {
			if (!priorIdentityRecord.active || priorIdentityRecord.owner !== spec.owner || priorIdentityRecord.row !== spec.row || priorIdentityRecord.generation !== spec.generation || priorIdentityRecord.layoutSignature !== layoutSignature) return null;
			for (let index = 0; index < slotCount; index++) if (priorIdentityRecord.sources[index] !== spec.sources[index] || priorIdentityRecord.columns[index] !== spec.columns[index]) return null;
			return priorIdentityRecord.token;
		}
		const sources = new Array(slotCount);
		const columns = new Array(slotCount);
		const groupsBySlot = new Array(slotCount);
		const usedSlots = new Uint8Array(slotCount);
		const sourceSet = /* @__PURE__ */ new Set();
		for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
			const source = spec.sources[slotIndex];
			const column = spec.columns[slotIndex];
			const slot = layout.slots[slotIndex];
			if (!column || column.sourceSlot !== slotIndex || compiledStateLayoutSlot(layout, slot.siteId) !== slotIndex) return null;
			if (source) {
				if (sourceSet.has(source) || this.#numericRowProgramsBySource.has(source)) return null;
				sourceSet.add(source);
			}
			sources[slotIndex] = source;
			columns[slotIndex] = column;
			groupsBySlot[slotIndex] = [];
		}
		for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
			const source = sources[slotIndex];
			if (!source) continue;
			const groups = this.#groupsBySource.get(source);
			for (const group of groups ?? []) {
				const binding = getBoundValue(group.rawValue);
				const ownerBinding = binding?.numericOwner;
				const descriptor = binding?.numericProgram;
				if (!binding || !ownerBinding || !descriptor || descriptor.schemaVersion !== 2 || descriptor.ownerProgramId !== layout.programId || typeof descriptor.sinkId !== "string" || descriptor.sinkId.length === 0 || !Array.isArray(descriptor.sourceSites) || !Array.isArray(ownerBinding.sourceSlots) || !binding.project || ownerBinding.owner !== spec.owner || ownerBinding.programId !== layout.programId || safeLayoutSignature(ownerBinding.layout) !== layoutSignature || ownerBinding.sourceSlots.length !== group.sources.length || group.sources.length > 1 && typeof binding.projectInputs !== "function") return null;
				const sites = descriptor.sourceSites;
				if (sites.length !== group.sources.length) return null;
				for (let input = 0; input < group.sources.length; input++) {
					const sourceSlot = ownerBinding.sourceSlots[input];
					if (!Number.isSafeInteger(sourceSlot) || sourceSlot < 0 || sourceSlot >= slotCount || group.sources[input] !== sources[sourceSlot] || sites[input] !== layout.slots[sourceSlot].siteId) return null;
					usedSlots[sourceSlot] = 1;
					if (sourceSlot === slotIndex && !groupsBySlot[slotIndex].includes(group)) groupsBySlot[slotIndex].push(group);
				}
			}
		}
		for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
			if (!usedSlots[slotIndex]) continue;
			if (!sources[slotIndex]) return null;
			for (const group of groupsBySlot[slotIndex]) if (group.ownerRowInputSlots !== void 0) return null;
		}
		let ownerUpdateProgram;
		let ownerUpdateSinks;
		const candidateProgram = compiledOwnerUpdateProgramFor(layout);
		if (candidateProgram?.schemaVersion === 2 && candidateProgram.programId === layout.programId && candidateProgram.slotCount === slotCount && candidateProgram.sinkIds.length > 0 && candidateProgram.sinkIds.length <= 30) {
			const groupsBySinkId = /* @__PURE__ */ new Map();
			const visitedGroups = /* @__PURE__ */ new Set();
			let complete = true;
			for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
				for (const group of groupsBySlot[slotIndex]) {
					if (visitedGroups.has(group)) continue;
					visitedGroups.add(group);
					const binding = getBoundValue(group.rawValue);
					const sinkId = binding.numericProgram?.schemaVersion === 2 ? binding.numericProgram.sinkId : void 0;
					if (!sinkId || groupsBySinkId.has(sinkId)) {
						complete = false;
						break;
					}
					groupsBySinkId.set(sinkId, group);
				}
				if (!complete) break;
			}
			const sinks = [];
			if (complete && groupsBySinkId.size === candidateProgram.sinkIds.length) for (const sinkId of candidateProgram.sinkIds) {
				const group = groupsBySinkId.get(sinkId);
				if (!group) {
					complete = false;
					break;
				}
				sinks.push(group);
			}
			else complete = false;
			if (complete) for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
				const actual = groupsBySlot[slotIndex];
				let actualIndex = 0;
				for (let sinkIndex = 0; sinkIndex < candidateProgram.sinkIds.length; sinkIndex++) {
					const group = sinks[sinkIndex];
					if (getBoundValue(group.rawValue).numericOwner.sourceSlots.includes(slotIndex)) {
						if (actual[actualIndex++] !== group) {
							complete = false;
							break;
						}
					}
				}
				if (!complete || actualIndex !== actual.length) {
					complete = false;
					break;
				}
			}
			if (complete) {
				ownerUpdateProgram = candidateProgram;
				ownerUpdateSinks = sinks;
			}
		}
		const token = Object.freeze({});
		const inputValues = new Array(slotCount);
		const changedEpochs = new Array(slotCount).fill(0);
		const changedValues = new Array(slotCount).fill(0);
		const record = {
			token,
			root: this,
			owner: spec.owner,
			layout,
			layoutSignature,
			rowIdentity: spec.rowIdentity,
			row: spec.row,
			generation: spec.generation,
			sourceLease: spec.sources,
			columnLease: spec.columns,
			sources,
			columns,
			usedSlots,
			groupsBySlot,
			ownerUpdateProgram,
			sinks: ownerUpdateSinks,
			inputValues,
			changedEpochs,
			changedValues,
			cutEpoch: 0,
			seenMask: 0,
			active: true
		};
		for (const groups of groupsBySlot) for (const group of groups) {
			const binding = getBoundValue(group.rawValue);
			group.ownerRowInputSlots = binding.numericOwner.sourceSlots;
			group.ownerRowProjectInputs = binding.projectInputs;
			if (!ownerUpdateProgram) group.ownerRowInputs ??= new Array(group.sources.length);
		}
		this.#preparedNumericRowPrograms.set(token, record);
		this.#activePreparedNumericRowRecords.add(record);
		this.#preparedNumericRowByIdentity.set(spec.rowIdentity, record);
		for (let slotIndex = 0; slotIndex < sources.length; slotIndex++) {
			const source = sources[slotIndex];
			if (source) this.#numericRowProgramsBySource.set(source, {
				record,
				slot: slotIndex
			});
		}
		return token;
	}
	#invalidatePreparedNumericRowsForSource(source) {
		const membership = this.#numericRowProgramsBySource.get(source);
		if (!membership) return;
		const record = membership.record;
		if (!record.active) return;
		record.active = false;
		this.#activePreparedNumericRowRecords.delete(record);
		this.#preparedNumericRowPrograms.delete(record.token);
		this.#preparedNumericRowByIdentity.delete(record.rowIdentity);
		for (const recordSource of record.sources) if (recordSource && this.#numericRowProgramsBySource.get(recordSource)?.record === record) this.#numericRowProgramsBySource.delete(recordSource);
		for (const groups of record.groupsBySlot) for (const group of groups) {
			group.ownerRowInputs = void 0;
			group.ownerRowInputSlots = void 0;
			group.ownerRowProjectInputs = void 0;
			group.ownerRowCutEpoch = void 0;
		}
	}
	/** Execute an explicit multi-row, multi-source cut through prepared sinks. */
	executePreparedNumericRows(tokens, changedRowIndices, changedSlots, values, count) {
		if (this.#numericWriteInProgress) throw new Error("Nested numeric VDOM writes are not supported");
		this.#numericWriteInProgress = true;
		try {
			return this.#executePreparedNumericRows(tokens, changedRowIndices, changedSlots, values, count);
		} finally {
			this.#numericWriteInProgress = false;
		}
	}
	/** Check whether a cached opaque cell program still names its live fanout. */
	isPreparedNumericCellProgramCurrent(token) {
		const record = this.#preparedCellProgramRecords.get(token);
		return !!record && record.root === this && record.active && record.slot.cellProgram === record && record.slot.eligible && record.generation === record.slot.cellProgramGeneration && record.groups === record.slot.groups;
	}
	/**
	* Apply an explicit dirty-source cut using prepared unary fanouts. Returns
	* null when any token is stale or unsupported, false when accepted without
	* host writes, and true when at least one host prop was written.
	*/
	executePreparedNumericCells(tokens, values, count) {
		return this.#withNumericWriteGuard(() => this.#executePreparedNumericCells(tokens, values, count));
	}
	/** Whether a numeric cell currently has at least one indexed host writer. */
	hasColumnCell(column, row) {
		return Number.isSafeInteger(row) && row >= 0 && (this.#groupsByColumnCell.get(column)?.get(row)?.length ?? 0) > 0;
	}
	/**
	* Apply an explicit dirty-address cut through existing unary writers.
	* Returns null when preflight declines the cut, false for a supported cut
	* with no host writes, and true when at least one host prop was written.
	*/
	setColumnCells(columns, rows, values, count) {
		return this.#withNumericWriteGuard(() => this.#setColumnCells(columns, rows, values, count));
	}
	/** Execute a validated sparse/dense cut through compiler-proven numeric writers. */
	executeSourceProgram(sources, values, count) {
		return this.#withNumericWriteGuard(() => {
			this.#programDirtySourceCount = 0;
			this.#programChangedSourceCount = 0;
			this.#programAffectedSinkCount = 0;
			this.#programOutputCount = 0;
			try {
				if (this.#programSourceEpoch >= Number.MAX_SAFE_INTEGER) {
					for (const slot of this.#programSourceSlots.values()) slot.epoch = 0;
					this.#programSourceEpoch = 1;
				} else this.#programSourceEpoch++;
				const sourceEpoch = this.#programSourceEpoch;
				if (!Number.isInteger(count) || count < 0 || count > sources.length || count > values.length) throw new RangeError("Invalid numeric source program count");
				for (let index = 0; index < count; index++) {
					const source = sources[index];
					if (source == null || typeof source !== "object" || typeof values[index] !== "number") throw new TypeError("Invalid numeric source program input");
					const slot = this.#programSourceSlots.get(source);
					if (!slot?.eligible || !this.#groupsBySource.has(source)) throw new Error("Scalar source has no supported numeric program in this VDOM root");
					if (slot.epoch === sourceEpoch) throw new TypeError("Duplicate numeric source program slot");
					slot.epoch = sourceEpoch;
					this.#programDirtySources[this.#programDirtySourceCount++] = slot;
				}
				let changed = false;
				for (let index = 0; index < count; index++) {
					const slot = this.#programDirtySources[index];
					if (!Object.is(slot.source.value, values[index])) {
						changed = true;
						this.#programChangedSources[this.#programChangedSourceCount++] = slot;
					}
				}
				if (!changed) return false;
				for (let index = 0; index < count; index++) this.#programDirtySources[index].source.value = values[index];
				if (this.#programSinkEpoch >= Number.MAX_SAFE_INTEGER) {
					for (const group of this.#programSinkSlots) if (group) group.programEpoch = 0;
					this.#programSinkEpoch = 1;
				} else this.#programSinkEpoch++;
				const sinkEpoch = this.#programSinkEpoch;
				let projectionCount = 0;
				let writeCount = 0;
				let skipCount = 0;
				for (let changedIndex = 0; changedIndex < this.#programChangedSourceCount; changedIndex++) {
					const slot = this.#programChangedSources[changedIndex];
					for (let groupIndex = 0; groupIndex < slot.groups.length; groupIndex++) {
						const group = slot.groups[groupIndex];
						if (this.#programSinkSlotByGroup.get(group) === void 0 || group.column !== void 0) continue;
						if (group.programEpoch === sinkEpoch) continue;
						group.programEpoch = sinkEpoch;
						this.#programAffectedSinks[this.#programAffectedSinkCount++] = group;
					}
				}
				try {
					for (let sinkIndex = 0; sinkIndex < this.#programAffectedSinkCount; sinkIndex++) {
						const group = this.#programAffectedSinks[sinkIndex];
						const binding = getBoundValue(group.rawValue);
						if (!binding || !binding.numericProgram || typeof binding.project !== "function") throw new Error("Numeric program sink is no longer supported");
						this.#programOutputValues[this.#programOutputCount++] = binding.read ? binding.read() : binding.project(group.sources.length === 1 ? group.sources[0].value : 0);
						projectionCount++;
					}
					for (let index = 0; index < this.#programAffectedSinkCount; index++) {
						const group = this.#programAffectedSinks[index];
						const next = this.#programOutputValues[index];
						if (sameBoundValueCanSkipWrite(group.lastValue, next, group.forceWrite)) {
							skipCount++;
							continue;
						}
						this.#writeBoundGroup(group, next);
						group.lastValue = next;
						writeCount++;
					}
				} finally {
					const sourceUpdates = this.#programChangedSourceCount;
					const sinkCount = this.#programAffectedSinkCount;
					this.#profileCounter?.({
						"numeric.program-batches": 1,
						"numeric.program-source-updates": sourceUpdates,
						"numeric.program-source-slots": count,
						"numeric.program-sinks": sinkCount,
						"numeric.program-projections": projectionCount,
						"numeric.program-writes": writeCount,
						"numeric.program-skips": skipCount
					});
				}
				return true;
			} finally {
				for (let index = 0; index < this.#programDirtySourceCount; index++) this.#programDirtySources[index] = void 0;
				for (let index = 0; index < this.#programChangedSourceCount; index++) this.#programChangedSources[index] = void 0;
				for (let index = 0; index < this.#programAffectedSinkCount; index++) this.#programAffectedSinks[index] = void 0;
				for (let index = 0; index < this.#programOutputCount; index++) this.#programOutputValues[index] = void 0;
				this.#programDirtySourceCount = 0;
				this.#programChangedSourceCount = 0;
				this.#programAffectedSinkCount = 0;
				this.#programOutputCount = 0;
			}
		});
	}
	/** Apply source changes as one coherent host-write batch. */
	setSources(updates) {
		return this.#withNumericWriteGuard(() => this.#setSources(updates));
	}
	#setSources(updates) {
		const nextValues = /* @__PURE__ */ new Map();
		for (const [source, value] of updates) nextValues.set(source, value);
		const changed = [];
		for (const [source, value] of nextValues) {
			const groups = this.#compiledGraph ? this.#groupsByCompiledSource.get(source) : this.#groupsBySource.get(source);
			if (!groups || (groups instanceof Set ? groups.size : groups.length) === 0) throw new Error("Scalar source is not bound in this VDOM root");
			if (!Object.is(source.value, value)) changed.push(source);
		}
		if (changed.length === 0) return false;
		for (const source of changed) source.value = nextValues.get(source);
		const affected = /* @__PURE__ */ new Set();
		for (const source of changed) {
			const groups = this.#compiledGraph ? this.#groupsByCompiledSource.get(source) : this.#groupsBySource.get(source);
			for (const group of groups ?? []) affected.add(group);
		}
		const projectedValues = [];
		for (const group of affected) {
			const directBinding = group.styleProperty === void 0 ? null : getBoundValue(group.rawValue);
			projectedValues.push(directBinding ? readBoundValue(directBinding) : materializeProp(group.name, group.rawValue));
		}
		let projectedIndex = 0;
		for (const group of affected) {
			const next = projectedValues[projectedIndex++];
			if (sameBoundValueCanSkipWrite(group.lastValue, next, group.forceWrite)) continue;
			this.#writeBoundGroup(group, next);
			group.lastValue = next;
		}
		return true;
	}
	/**
	* Commit changed rows from compiled numeric columns through the binding
	* writers resolved at mount. The caller updates column buffers in place;
	* call-local staging keeps every writer on the same captured buffer cut.
	*/
	setColumns(columns) {
		return this.#withNumericWriteGuard(() => this.#setColumns(columns));
	}
	#setColumns(columns) {
		for (const column of columns) {
			const groups = this.#groupsByCompiledColumn.get(column);
			if (!groups || groups.length === 0) throw new Error("Numeric column is not bound in this VDOM root");
			for (const group of groups) if (group.columnIndex >= column.values.length) throw new Error("Numeric column is shorter than its bound entity rows");
		}
		for (const column of columns) column.source.value++;
		const stagedGroups = [];
		const stagedSources = [];
		const stageToken = Symbol();
		for (const column of columns) {
			const groups = this.#groupsByCompiledColumn.get(column);
			for (const group of groups) {
				if (group.columnStageToken === stageToken) continue;
				group.columnStageToken = stageToken;
				const sourceValue = column.values[group.columnIndex];
				if (Object.is(group.lastSourceValue, sourceValue)) continue;
				stagedGroups.push(group);
				stagedSources.push(sourceValue);
			}
		}
		const stagedValues = [];
		for (let index = 0; index < stagedGroups.length; index++) stagedValues.push(stagedGroups[index].project(stagedSources[index]));
		return this.#writeStagedColumnValues(stagedGroups, stagedSources, stagedValues);
	}
	/** Read-only lifecycle counters for benchmarks and host adapters. */
	diagnostics() {
		const groupCount = (value) => {
			if (value instanceof Map) {
				let count = 0;
				for (const entry of value.values()) count += groupCount(entry);
				return count;
			}
			if (value instanceof Set) return value.size;
			return Array.isArray(value) ? value.length : 0;
		};
		return {
			mountedNodes: this.#mounted.length,
			scalarBindingGroups: groupCount(this.#groupsBySource),
			numericProgramSourceSlots: this.#programSourceSlots.size,
			numericProgramSinkSlots: this.#programSinkSlotByGroup.size,
			numericProgramSinkSlotCapacity: this.#programSinkSlots.length,
			numericProgramFreeSinkSlots: this.#programFreeSinkSlots.length,
			numericProgramScratchRetained: this.#programDirtySourceCount + this.#programChangedSourceCount + this.#programAffectedSinkCount + this.#programOutputCount,
			numericProgramScratchCapacity: this.#programDirtySources.length + this.#programChangedSources.length + this.#programAffectedSinks.length + this.#programOutputValues.length,
			columnRowsScratchRetained: this.#columnRowsScratchCount,
			columnRowsScratchCapacity: this.#columnRowsScratchGroups.length + this.#columnRowsScratchSources.length + this.#columnRowsScratchValues.length,
			compiledBindingGroups: groupCount(this.#groupsByCompiledBinding),
			compiledSourceGroups: groupCount(this.#groupsByCompiledSource),
			compiledColumnGroups: groupCount(this.#groupsByCompiledColumn),
			compiledColumnBindingGroups: groupCount(this.#groupsByCompiledColumnBinding),
			preparedNumericRowWorkVisits: this.#ownerRowWorkVisits,
			preparedOwnerUpdateKernelBatches: this.#ownerUpdateKernelBatches,
			preparedOwnerUpdateKernelRows: this.#ownerUpdateKernelRows,
			preparedOwnerUpdateKernelInputs: this.#ownerUpdateKernelInputs,
			preparedOwnerUpdateKernelSelectedSinks: this.#ownerUpdateKernelSelectedSinks,
			preparedOwnerUpdateKernelStagedSinks: this.#ownerUpdateKernelStagedSinks,
			preparedOwnerUpdateGenericFallbackCuts: this.#ownerUpdateGenericFallbackCuts,
			preparedOwnerUpdateGenericProjectors: this.#ownerUpdateGenericProjectors,
			bindingIndexAttachOperations: this.#bindingIndexAttachOperations,
			bindingIndexDetachOperations: this.#bindingIndexDetachOperations,
			bindingIndexIndexOperations: this.#bindingIndexIndexOperations,
			sourceColumnPruneVisits: this.#sourceColumnPruneVisits
		};
	}
	/** Commit only rows in a reusable dirty-row buffer. */
	setColumnRows(columns, rows, rowCount = rows.length) {
		return this.#withNumericWriteGuard(() => this.#setColumnRows(columns, rows, rowCount));
	}
	#setColumnRows(columns, rows, rowCount) {
		if (!Number.isInteger(rowCount) || rowCount < 0 || rowCount > rows.length) throw new Error("Dirty row count is outside the supplied buffer");
		for (const column of columns) {
			const rowGroups = this.#groupsByCompiledColumnRows.get(column);
			if (!rowGroups) throw new Error("Numeric column is not bound in this VDOM root");
			for (let index = 0; index < rowCount; index++) {
				const row = rows[index];
				if (row >= column.values.length || rowGroups[row] === void 0) throw new Error("Dirty row is outside the bound column rows");
			}
		}
		if (rowCount === 0) return false;
		for (const column of columns) column.source.value++;
		this.#columnRowsScratchActive = true;
		this.#columnRowsScratchCancelled = false;
		try {
			if (this.#columnRowsStageEpoch >= Number.MAX_SAFE_INTEGER) {
				for (const rowsByColumn of this.#groupsByCompiledColumnRows.values()) for (const groups of rowsByColumn) {
					if (!groups) continue;
					for (const group of groups) group.columnRowsStageEpoch = 0;
				}
				this.#columnRowsStageEpoch = 1;
			} else this.#columnRowsStageEpoch++;
			const stageEpoch = this.#columnRowsStageEpoch;
			for (const column of columns) {
				const rowGroups = this.#groupsByCompiledColumnRows.get(column);
				for (let index = 0; index < rowCount; index++) {
					const row = rows[index];
					const sourceValue = column.values[row];
					const groups = rowGroups[row];
					for (const group of groups) {
						if (group.columnRowsStageEpoch === stageEpoch) continue;
						group.columnRowsStageEpoch = stageEpoch;
						if (Object.is(group.lastSourceValue, sourceValue)) continue;
						const scratchIndex = this.#columnRowsScratchCount++;
						this.#columnRowsScratchGroups[scratchIndex] = group;
						this.#columnRowsScratchSources[scratchIndex] = sourceValue;
					}
				}
			}
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				if (this.#columnRowsScratchCancelled) return false;
				const group = this.#columnRowsScratchGroups[index];
				this.#columnRowsScratchValues[index] = group.project(this.#columnRowsScratchSources[index]);
			}
			let wrote = false;
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				if (this.#columnRowsScratchCancelled) break;
				const group = this.#columnRowsScratchGroups[index];
				const sourceValue = this.#columnRowsScratchSources[index];
				const next = this.#columnRowsScratchValues[index];
				if (sameBoundValueCanSkipWrite(group.lastValue, next, group.forceWrite)) {
					group.lastSourceValue = sourceValue;
					continue;
				}
				this.#writeBoundGroup(group, next);
				if (this.#columnRowsScratchCancelled) break;
				group.lastSourceValue = sourceValue;
				group.lastValue = next;
				wrote = true;
			}
			return wrote;
		} finally {
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				this.#columnRowsScratchGroups[index] = void 0;
				this.#columnRowsScratchSources[index] = void 0;
				this.#columnRowsScratchValues[index] = void 0;
			}
			this.#columnRowsScratchCount = 0;
			this.#columnRowsScratchActive = false;
			if (this.#columnRowsScratchCancelled) {
				this.#columnRowsScratchGroups.length = 0;
				this.#columnRowsScratchSources.length = 0;
				this.#columnRowsScratchValues.length = 0;
			}
			this.#columnRowsScratchCancelled = false;
		}
	}
	#setColumnCells(columns, rows, values, count) {
		if (!Number.isInteger(count) || count < 0 || count > columns.length || count > rows.length || count > values.length) throw new RangeError("Dirty cell count is outside the supplied buffers");
		this.#columnRowsScratchActive = true;
		this.#columnRowsScratchCancelled = false;
		try {
			if (this.#columnRowsStageEpoch >= Number.MAX_SAFE_INTEGER) {
				for (const rowsByColumn of this.#groupsByCompiledColumnRows.values()) for (const groups of rowsByColumn) {
					if (!groups) continue;
					for (const group of groups) group.columnRowsStageEpoch = 0;
				}
				for (const rowsByColumn of this.#groupsByColumnCell.values()) for (const groups of rowsByColumn.values()) for (const group of groups) group.columnRowsStageEpoch = 0;
				this.#columnRowsStageEpoch = 1;
			} else this.#columnRowsStageEpoch++;
			const stageEpoch = this.#columnRowsStageEpoch;
			for (let inputIndex = 0; inputIndex < count; inputIndex++) {
				const column = columns[inputIndex];
				const row = rows[inputIndex];
				const value = values[inputIndex];
				if (!column || !Number.isSafeInteger(row) || row < 0 || row >= column.values.length || typeof value !== "number") return null;
				const groups = this.#groupsByColumnCell.get(column)?.get(row);
				if (!groups?.length) return null;
				for (const group of groups) {
					const source = group.sources.length === 1 ? group.sources[0] : void 0;
					const association = source ? this.#sourceColumnCells.get(source) : void 0;
					if (!source || !association || association.column !== column || association.row !== row || !this.#isUnaryColumnGroup(source, group) || !this.#programSourceSlots.get(source)?.eligible) return null;
					if (group.columnRowsStageEpoch === stageEpoch) {
						const stagedIndex = group.columnRowsScratchIndex;
						if (stagedIndex === void 0 || this.#columnRowsScratchGroups[stagedIndex] !== group || !Object.is(this.#columnRowsScratchSources[stagedIndex], value)) return null;
						continue;
					}
					group.columnRowsStageEpoch = stageEpoch;
					const scratchIndex = this.#columnRowsScratchCount++;
					group.columnRowsScratchIndex = scratchIndex;
					this.#columnRowsScratchGroups[scratchIndex] = group;
					this.#columnRowsScratchSources[scratchIndex] = value;
				}
			}
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				const group = this.#columnRowsScratchGroups[index];
				group.sources[0].value = this.#columnRowsScratchSources[index];
			}
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				if (this.#columnRowsScratchCancelled) return false;
				const group = this.#columnRowsScratchGroups[index];
				const sourceValue = this.#columnRowsScratchSources[index];
				if (Object.is(group.lastSourceValue, sourceValue)) this.#columnRowsScratchValues[index] = void 0;
				else this.#columnRowsScratchValues[index] = group.project(sourceValue);
			}
			let wrote = false;
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				if (this.#columnRowsScratchCancelled) break;
				const group = this.#columnRowsScratchGroups[index];
				const sourceValue = this.#columnRowsScratchSources[index];
				if (Object.is(group.lastSourceValue, sourceValue)) continue;
				const next = this.#columnRowsScratchValues[index];
				if (sameBoundValueCanSkipWrite(group.lastValue, next, group.forceWrite)) {
					group.lastSourceValue = sourceValue;
					continue;
				}
				this.#writeBoundGroup(group, next);
				if (this.#columnRowsScratchCancelled) break;
				group.lastSourceValue = sourceValue;
				group.lastValue = next;
				wrote = true;
			}
			return wrote;
		} finally {
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				this.#columnRowsScratchGroups[index].columnRowsScratchIndex = void 0;
				this.#columnRowsScratchGroups[index] = void 0;
				this.#columnRowsScratchSources[index] = void 0;
				this.#columnRowsScratchValues[index] = void 0;
			}
			this.#columnRowsScratchCount = 0;
			this.#columnRowsScratchActive = false;
			if (this.#columnRowsScratchCancelled) {
				this.#columnRowsScratchGroups.length = 0;
				this.#columnRowsScratchSources.length = 0;
				this.#columnRowsScratchValues.length = 0;
			}
			this.#columnRowsScratchCancelled = false;
		}
	}
	#executePreparedNumericRows(tokens, changedRowIndices, changedSlots, values, count) {
		if (!Number.isSafeInteger(count) || count < 0 || count > changedRowIndices.length || count > changedSlots.length || count > values.length) throw new RangeError("Prepared owner-row cut exceeds supplied buffers");
		const countVisits = this.#profileCounter !== void 0;
		if (countVisits) this.#ownerRowWorkVisits = 0;
		this.#ownerRowRecordCount = 0;
		this.#ownerRowGroupCount = 0;
		this.#ownerRowExecutionActive = true;
		this.#ownerRowExecutionCancelled = false;
		let inputRecordCount = 0;
		let stagedCount = 0;
		let stagedCleanupBound = 0;
		let ownerUpdateProgram;
		try {
			if (this.#ownerRowCutEpoch >= Number.MAX_SAFE_INTEGER) {
				this.#ownerRowCutEpoch = 1;
				for (const record of this.#activePreparedNumericRowRecords) {
					record.cutEpoch = 0;
					record.seenMask = 0;
					record.changedEpochs.fill(0);
					for (const groups of record.groupsBySlot) for (const group of groups) group.ownerRowCutEpoch = 0;
				}
			} else this.#ownerRowCutEpoch++;
			const epoch = this.#ownerRowCutEpoch;
			let previousToken;
			let previousRecord;
			for (let index = 0; index < count; index++) {
				if (countVisits) this.#ownerRowWorkVisits++;
				const tokenIndex = changedRowIndices[index];
				const slotIndex = changedSlots[index];
				const token = tokens[tokenIndex];
				const value = values[index];
				if (!Number.isSafeInteger(tokenIndex) || tokenIndex >= tokens.length || !token || !Number.isSafeInteger(slotIndex) || typeof value !== "number") return null;
				const record = token === previousToken ? previousRecord : this.#preparedNumericRowPrograms.get(token);
				previousToken = token;
				previousRecord = record;
				if (!record || record.root !== this || !record.active || record.token !== token || !record.layout.programId || slotIndex >= record.sources.length) return null;
				const source = record.sources[slotIndex];
				const column = record.columns[slotIndex];
				if (!source || record.sourceLease[slotIndex] !== source || record.columnLease[slotIndex] !== column || !column || column.values.length <= record.row) return null;
				if (record.cutEpoch !== epoch) {
					record.cutEpoch = epoch;
					this.#ownerRowRecordScratch[this.#ownerRowRecordCount++] = record;
				}
				if (record.changedEpochs[slotIndex] === epoch) {
					if (!Object.is(record.changedValues[slotIndex], value)) return null;
				} else {
					record.changedEpochs[slotIndex] = epoch;
					record.changedValues[slotIndex] = value;
				}
				this.#ownerRowInputRecordScratch[index] = record;
				inputRecordCount++;
			}
			if (count === 0) return false;
			ownerUpdateProgram = this.#ownerRowRecordScratch[0].ownerUpdateProgram;
			for (let rowIndex = 0; rowIndex < this.#ownerRowRecordCount; rowIndex++) {
				const record = this.#ownerRowRecordScratch[rowIndex];
				if (!record) continue;
				if (ownerUpdateProgram && (record.ownerUpdateProgram !== ownerUpdateProgram || !record.sinks || record.sinks.length !== ownerUpdateProgram.sinkIds.length)) ownerUpdateProgram = void 0;
				for (let slotIndex = 0; slotIndex < record.sources.length; slotIndex++) {
					if (countVisits) this.#ownerRowWorkVisits++;
					if (record.usedSlots[slotIndex]) {
						const source = record.sources[slotIndex];
						const column = record.columns[slotIndex];
						if (!source || record.sourceLease[slotIndex] !== source || record.columnLease[slotIndex] !== column || !column || column.values.length <= record.row) return null;
						record.inputValues[slotIndex] = record.columns[slotIndex].values[record.row];
					}
					if (record.changedEpochs[slotIndex] === epoch) record.inputValues[slotIndex] = record.changedValues[slotIndex];
				}
			}
			if (ownerUpdateProgram) {
				const outputCapacity = this.#ownerRowRecordCount * ownerUpdateProgram.sinkIds.length;
				if (!Number.isSafeInteger(outputCapacity) || outputCapacity > 4294967295) ownerUpdateProgram = void 0;
				else {
					stagedCleanupBound = outputCapacity;
					if (this.#ownerRowStagedInputIndices.length < outputCapacity) {
						this.#ownerRowStagedInputIndices = new Uint32Array(outputCapacity);
						this.#ownerRowStagedSinkIds = new Uint16Array(outputCapacity);
						this.#ownerRowStagedValues.length = outputCapacity;
					} else if (this.#ownerRowStagedValues.length < outputCapacity) this.#ownerRowStagedValues.length = outputCapacity;
					for (let rowIndex = 0; rowIndex < this.#ownerRowRecordCount; rowIndex++) {
						const record = this.#ownerRowRecordScratch[rowIndex];
						if (record) record.seenMask = 0;
					}
					if (countVisits) {
						this.#ownerUpdateKernelBatches++;
						this.#ownerUpdateKernelRows += this.#ownerRowRecordCount;
						this.#ownerUpdateKernelInputs += count;
					}
				}
			}
			if (!ownerUpdateProgram) {
				for (let rowIndex = 0; rowIndex < this.#ownerRowRecordCount; rowIndex++) {
					const record = this.#ownerRowRecordScratch[rowIndex];
					if (!record) continue;
					const sinks = record.sinks;
					if (record.ownerUpdateProgram && sinks && sinks[0].ownerRowInputs === void 0) {
						for (const groups of record.groupsBySlot) for (const group of groups) if (group !== sinks[0]) group.ownerRowInputs ??= new Array(group.sources.length);
						sinks[0].ownerRowInputs ??= new Array(sinks[0].sources.length);
					}
				}
				if (countVisits) this.#ownerUpdateGenericFallbackCuts++;
			}
			for (let rowIndex = 0; rowIndex < this.#ownerRowRecordCount; rowIndex++) {
				const record = this.#ownerRowRecordScratch[rowIndex];
				if (!record) continue;
				for (let slotIndex = 0; slotIndex < record.sources.length; slotIndex++) {
					if (countVisits) this.#ownerRowWorkVisits++;
					const source = record.sources[slotIndex];
					if (source && (record.usedSlots[slotIndex] || record.changedEpochs[slotIndex] === epoch)) source.value = record.inputValues[slotIndex];
				}
			}
			let wrote = false;
			if (ownerUpdateProgram) {
				if (this.#ownerRowExecutionCancelled) return false;
				stagedCount = ownerUpdateProgram.executeCut(changedSlots, count, this.#ownerRowInputRecordScratch, this.#ownerRowStagedInputIndices, this.#ownerRowStagedSinkIds, this.#ownerRowStagedValues);
				if (this.#ownerRowExecutionCancelled) return false;
				if (!Number.isSafeInteger(stagedCount) || stagedCount < 0 || stagedCount > stagedCleanupBound) throw new Error("Compiled owner update kernel returned an invalid output count");
				for (let index = 0; index < this.#ownerRowRecordCount; index++) {
					const record = this.#ownerRowRecordScratch[index];
					if (!record) continue;
					const validMask = (1 << record.sinks.length) - 1;
					if ((record.seenMask & ~validMask) !== 0) throw new Error("Compiled owner update kernel selected an unknown sink");
				}
				for (let index = 0; index < stagedCount; index++) {
					const inputIndex = this.#ownerRowStagedInputIndices[index];
					const sinkIndex = this.#ownerRowStagedSinkIds[index];
					const record = this.#ownerRowInputRecordScratch[inputIndex];
					const next = this.#ownerRowStagedValues[index];
					if (!Number.isSafeInteger(inputIndex) || inputIndex >= count || !record || !record.sinks || sinkIndex >= record.sinks.length || (record.seenMask & 1 << sinkIndex) === 0 || !isCompiledOwnerUpdatePrimitive(next)) throw new Error("Compiled owner update kernel returned an invalid sink output");
				}
				if (this.#ownerRowExecutionCancelled) return false;
				stagedCleanupBound = stagedCount;
				let selectedSinkCount = 0;
				for (let index = 0; index < this.#ownerRowRecordCount; index++) {
					const record = this.#ownerRowRecordScratch[index];
					if (!record) continue;
					for (let sinkIndex = 0; sinkIndex < record.sinks.length; sinkIndex++) if ((record.seenMask & 1 << sinkIndex) !== 0) {
						const group = record.sinks[sinkIndex];
						selectedSinkCount++;
						group.lastSourceValue = record.inputValues[group.ownerRowInputSlots[0]];
					}
				}
				if (countVisits) {
					this.#ownerUpdateKernelSelectedSinks += selectedSinkCount;
					this.#ownerUpdateKernelStagedSinks += stagedCount;
				}
				if (this.#ownerRowExecutionCancelled) return false;
				for (let index = 0; index < stagedCount; index++) {
					if (this.#ownerRowExecutionCancelled) break;
					const inputIndex = this.#ownerRowStagedInputIndices[index];
					const sinkIndex = this.#ownerRowStagedSinkIds[index];
					const record = this.#ownerRowInputRecordScratch[inputIndex];
					const next = this.#ownerRowStagedValues[index];
					const group = record.sinks[sinkIndex];
					this.#writeBoundGroup(group, next);
					wrote = true;
					if (this.#ownerRowExecutionCancelled) break;
					group.lastValue = next;
				}
			} else {
				for (let index = 0; index < count; index++) {
					const record = this.#ownerRowInputRecordScratch[index];
					const slotIndex = changedSlots[index];
					if (countVisits) this.#ownerRowWorkVisits++;
					for (const group of record.groupsBySlot[slotIndex]) {
						if (countVisits) this.#ownerRowWorkVisits++;
						if (group.ownerRowCutEpoch === epoch) continue;
						group.ownerRowCutEpoch = epoch;
						const scratchIndex = this.#ownerRowGroupCount++;
						this.#ownerRowGroupScratch[scratchIndex] = group;
						this.#ownerRowGroupRecordScratch[scratchIndex] = record;
					}
				}
				for (let index = 0; index < this.#ownerRowGroupCount; index++) {
					if (this.#ownerRowExecutionCancelled) return false;
					if (countVisits) this.#ownerRowWorkVisits++;
					const group = this.#ownerRowGroupScratch[index];
					const record = this.#ownerRowGroupRecordScratch[index];
					const slots = group.ownerRowInputSlots;
					const inputs = group.ownerRowInputs;
					for (let inputIndex = 0; inputIndex < slots.length; inputIndex++) inputs[inputIndex] = record.inputValues[slots[inputIndex]];
					this.#ownerRowValueScratch[index] = group.ownerRowProjectInputs ? group.ownerRowProjectInputs(inputs) : group.project(inputs[0]);
					if (this.#ownerRowExecutionCancelled) return false;
				}
				if (countVisits) this.#ownerUpdateGenericProjectors += this.#ownerRowGroupCount;
				if (this.#ownerRowExecutionCancelled) return false;
				for (let index = 0; index < this.#ownerRowGroupCount; index++) {
					const group = this.#ownerRowGroupScratch[index];
					group.lastSourceValue = this.#ownerRowGroupRecordScratch[index].inputValues[group.ownerRowInputSlots[0]];
				}
				for (let index = 0; index < this.#ownerRowGroupCount; index++) {
					if (this.#ownerRowExecutionCancelled) break;
					const group = this.#ownerRowGroupScratch[index];
					const next = this.#ownerRowValueScratch[index];
					if (sameBoundValueCanSkipWrite(group.lastValue, next, group.forceWrite)) continue;
					this.#writeBoundGroup(group, next);
					wrote = true;
					if (this.#ownerRowExecutionCancelled) break;
					group.lastValue = next;
				}
			}
			return wrote;
		} finally {
			for (let index = 0; index < this.#ownerRowRecordCount; index++) this.#ownerRowRecordScratch[index] = void 0;
			for (let index = 0; index < inputRecordCount; index++) this.#ownerRowInputRecordScratch[index] = void 0;
			for (let index = 0; index < this.#ownerRowGroupCount; index++) {
				this.#ownerRowGroupScratch[index] = void 0;
				this.#ownerRowGroupRecordScratch[index] = void 0;
				this.#ownerRowValueScratch[index] = void 0;
			}
			const stagedCleanupCount = Math.min(stagedCleanupBound, this.#ownerRowStagedValues.length);
			for (let index = 0; index < stagedCleanupCount; index++) {
				this.#ownerRowStagedInputIndices[index] = 0;
				this.#ownerRowStagedSinkIds[index] = 0;
				this.#ownerRowStagedValues[index] = 0;
			}
			this.#ownerRowRecordCount = 0;
			this.#ownerRowGroupCount = 0;
			this.#ownerRowExecutionActive = false;
			if (this.#ownerRowExecutionCancelled) {
				this.#ownerRowRecordScratch.length = 0;
				this.#ownerRowInputRecordScratch.length = 0;
				this.#ownerRowGroupScratch.length = 0;
				this.#ownerRowGroupRecordScratch.length = 0;
				this.#ownerRowValueScratch.length = 0;
				this.#ownerRowStagedInputIndices = /* @__PURE__ */ new Uint32Array(0);
				this.#ownerRowStagedSinkIds = /* @__PURE__ */ new Uint16Array(0);
				this.#ownerRowStagedValues.length = 0;
			}
			this.#ownerRowExecutionCancelled = false;
		}
	}
	#executePreparedNumericCells(tokens, values, count) {
		if (!Number.isInteger(count) || count < 0 || count > tokens.length || count > values.length) throw new RangeError("Prepared numeric cell count is outside the supplied buffers");
		this.#preparedCellDirtyCount = 0;
		this.#columnRowsScratchCount = 0;
		this.#columnRowsScratchActive = true;
		this.#columnRowsScratchCancelled = false;
		try {
			if (this.#preparedCellCutEpoch >= Number.MAX_SAFE_INTEGER) {
				for (const slot of this.#programSourceSlots.values()) slot.preparedCutEpoch = 0;
				this.#preparedCellCutEpoch = 1;
			} else this.#preparedCellCutEpoch++;
			const cutEpoch = this.#preparedCellCutEpoch;
			for (let index = 0; index < count; index++) {
				const token = tokens[index];
				const value = values[index];
				if (!token || typeof value !== "number") return null;
				const record = this.#preparedCellProgramRecords.get(token);
				if (!record || record.root !== this || !record.active || record.slot.cellProgram !== record || !record.slot.eligible || record.generation !== record.slot.cellProgramGeneration || record.groups !== record.slot.groups) return null;
				const slot = record.slot;
				if (slot.preparedCutEpoch === cutEpoch) {
					if (!Object.is(slot.preparedCutValue, value)) return null;
					continue;
				}
				slot.preparedCutEpoch = cutEpoch;
				slot.preparedCutValue = value;
				const dirtyIndex = this.#preparedCellDirtyCount++;
				this.#preparedCellDirtySlots[dirtyIndex] = slot;
				this.#preparedCellDirtyValues[dirtyIndex] = value;
			}
			for (let index = 0; index < this.#preparedCellDirtyCount; index++) this.#preparedCellDirtySlots[index].source.value = this.#preparedCellDirtyValues[index];
			for (let dirtyIndex = 0; dirtyIndex < this.#preparedCellDirtyCount; dirtyIndex++) {
				const slot = this.#preparedCellDirtySlots[dirtyIndex];
				const sourceValue = this.#preparedCellDirtyValues[dirtyIndex];
				for (const group of slot.groups) {
					const scratchIndex = this.#columnRowsScratchCount++;
					this.#columnRowsScratchGroups[scratchIndex] = group;
					this.#columnRowsScratchSources[scratchIndex] = sourceValue;
					this.#columnRowsScratchValues[scratchIndex] = void 0;
				}
			}
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				if (this.#columnRowsScratchCancelled) return false;
				const group = this.#columnRowsScratchGroups[index];
				const sourceValue = this.#columnRowsScratchSources[index];
				this.#columnRowsScratchValues[index] = Object.is(group.lastSourceValue, sourceValue) ? void 0 : group.project(sourceValue);
			}
			let wrote = false;
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				if (this.#columnRowsScratchCancelled) break;
				const group = this.#columnRowsScratchGroups[index];
				const sourceValue = this.#columnRowsScratchSources[index];
				if (Object.is(group.lastSourceValue, sourceValue)) continue;
				const next = this.#columnRowsScratchValues[index];
				if (sameBoundValueCanSkipWrite(group.lastValue, next, group.forceWrite)) {
					group.lastSourceValue = sourceValue;
					continue;
				}
				this.#writeBoundGroup(group, next);
				if (this.#columnRowsScratchCancelled) break;
				group.lastSourceValue = sourceValue;
				group.lastValue = next;
				wrote = true;
			}
			return wrote;
		} finally {
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				this.#columnRowsScratchGroups[index] = void 0;
				this.#columnRowsScratchSources[index] = void 0;
				this.#columnRowsScratchValues[index] = void 0;
			}
			for (let index = 0; index < this.#preparedCellDirtyCount; index++) {
				this.#preparedCellDirtySlots[index] = void 0;
				this.#preparedCellDirtyValues[index] = void 0;
			}
			this.#columnRowsScratchCount = 0;
			this.#preparedCellDirtyCount = 0;
			this.#columnRowsScratchActive = false;
			if (this.#columnRowsScratchCancelled) {
				this.#columnRowsScratchGroups.length = 0;
				this.#columnRowsScratchSources.length = 0;
				this.#columnRowsScratchValues.length = 0;
				this.#preparedCellDirtySlots.length = 0;
				this.#preparedCellDirtyValues.length = 0;
			}
			this.#columnRowsScratchCancelled = false;
		}
	}
	/** Scan caller-selected contiguous row buckets, skipping unchanged rows. */
	setColumnBuckets(columns, buckets, bucketCount = buckets.length, bucketSize = 64) {
		return this.#withNumericWriteGuard(() => this.#setColumnBuckets(columns, buckets, bucketCount, bucketSize));
	}
	#setColumnBuckets(columns, buckets, bucketCount, bucketSize) {
		if (!Number.isInteger(bucketCount) || bucketCount < 0 || bucketCount > buckets.length || !Number.isInteger(bucketSize) || bucketSize <= 0) throw new Error("Invalid dirty bucket descriptor");
		for (const column of columns) {
			if (!this.#groupsByCompiledColumnRows.has(column)) throw new Error("Numeric column is not bound in this VDOM root");
			for (let index = 0; index < bucketCount; index++) {
				const start = buckets[index] * bucketSize;
				if (!Number.isSafeInteger(start) || start >= column.values.length) throw new Error("Dirty bucket is outside the bound column rows");
			}
		}
		if (bucketCount === 0) return false;
		for (const column of columns) column.source.value++;
		const stagedGroups = [];
		const stagedSources = [];
		const stageToken = Symbol();
		for (const column of columns) {
			const rowGroups = this.#groupsByCompiledColumnRows.get(column);
			for (let index = 0; index < bucketCount; index++) {
				const start = buckets[index] * bucketSize;
				const end = Math.min(start + bucketSize, column.values.length);
				for (let row = start; row < end; row++) {
					const groups = rowGroups[row];
					if (!groups) continue;
					const sourceValue = column.values[row];
					for (const group of groups) {
						if (group.columnStageToken === stageToken) continue;
						group.columnStageToken = stageToken;
						if (Object.is(group.lastSourceValue, sourceValue)) continue;
						stagedGroups.push(group);
						stagedSources.push(sourceValue);
					}
				}
			}
		}
		const stagedValues = [];
		for (let index = 0; index < stagedGroups.length; index++) stagedValues.push(stagedGroups[index].project(stagedSources[index]));
		return this.#writeStagedColumnValues(stagedGroups, stagedSources, stagedValues);
	}
	dispose() {
		const errors = [];
		this.#invalidateAllPreparedNumericCellPrograms();
		for (const source of this.#numericRowProgramsBySource.keys()) this.#invalidatePreparedNumericRowsForSource(source);
		this.#refPublicationEpoch++;
		if (this.#ownerRowExecutionActive) this.#ownerRowExecutionCancelled = true;
		this.#pendingRefs.clear();
		for (const node of this.#committedRefs.keys()) this.#pendingRefs.set(node, null);
		try {
			for (const child of this.#mounted) try {
				removeMountedSubtree(this.#renderHost, this.container, child, errors);
			} catch (error) {
				errors.push(error);
			}
			try {
				this.flushRefs();
			} catch (error) {
				errors.push(error);
			}
		} finally {
			this.#mounted = [];
			this.#snapshot = [];
			this.#snapshotDirty = false;
			this.#nodesByKey.clear();
			this.#nodesByKeyedRegion.clear();
			this.#groupsBySource.clear();
			this.#programSourceSlots.clear();
			this.#numericRowProgramsBySource.clear();
			this.#programSinkSlots.length = 0;
			this.#programFreeSinkSlots.length = 0;
			this.#programSinkSlotByGroup.clear();
			this.#programDirtySources.length = 0;
			this.#programChangedSources.length = 0;
			this.#programAffectedSinks.length = 0;
			this.#programOutputValues.length = 0;
			this.#programDirtySourceCount = 0;
			this.#programChangedSourceCount = 0;
			this.#programAffectedSinkCount = 0;
			this.#programOutputCount = 0;
			if (this.#columnRowsScratchActive) this.#columnRowsScratchCancelled = true;
			else {
				this.#columnRowsScratchGroups.length = 0;
				this.#columnRowsScratchSources.length = 0;
				this.#columnRowsScratchValues.length = 0;
				this.#columnRowsScratchCount = 0;
				this.#preparedCellDirtySlots.length = 0;
				this.#preparedCellDirtyValues.length = 0;
				this.#preparedCellDirtyCount = 0;
			}
			if (!this.#ownerRowExecutionActive) {
				this.#ownerRowRecordScratch.length = 0;
				this.#ownerRowInputRecordScratch.length = 0;
				this.#ownerRowGroupScratch.length = 0;
				this.#ownerRowGroupRecordScratch.length = 0;
				this.#ownerRowValueScratch.length = 0;
				this.#ownerRowStagedInputIndices = /* @__PURE__ */ new Uint32Array(0);
				this.#ownerRowStagedSinkIds = /* @__PURE__ */ new Uint16Array(0);
				this.#ownerRowStagedValues.length = 0;
				this.#ownerRowRecordCount = 0;
				this.#ownerRowGroupCount = 0;
			}
			this.#incompatibleScalarBindingGroups = 0;
			this.#groupsByCompiledBinding.clear();
			this.#groupsByCompiledSource.clear();
			this.#groupsByCompiledColumnBinding.clear();
			this.#groupsByCompiledColumn.clear();
			this.#groupsByCompiledColumnRows.clear();
			this.#sourceColumnCells.clear();
			this.#pendingSourceColumnPrunes.clear();
			this.#groupsByColumnCell.clear();
			this.#compiledSlotBySource.clear();
			this.#compiledGraph = null;
			this.#directBindingWrites = false;
			this.#pendingRefs.clear();
			this.#committedRefs.clear();
		}
		if (errors.length > 0) throw new AggregateError(errors, "VDOM root disposal encountered host errors");
	}
	#withNumericWriteGuard(operation) {
		if (this.#numericWriteInProgress) throw new Error("Nested numeric VDOM writes are not supported");
		this.#numericWriteInProgress = true;
		try {
			return operation();
		} finally {
			this.#numericWriteInProgress = false;
		}
	}
	#writeStagedColumnValues(groups, sourceValues, nextValues) {
		let wrote = false;
		for (let index = 0; index < groups.length; index++) {
			const group = groups[index];
			const sourceValue = sourceValues[index];
			const next = nextValues[index];
			if (sameBoundValueCanSkipWrite(group.lastValue, next, group.forceWrite)) {
				group.lastSourceValue = sourceValue;
				continue;
			}
			this.#writeBoundGroup(group, next);
			group.lastSourceValue = sourceValue;
			group.lastValue = next;
			wrote = true;
		}
		return wrote;
	}
	#writeBoundGroup(group, next) {
		if (group.styleProperty !== void 0) {
			if (group.styleWriter) group.styleWriter(next, group.lastValue);
			else if (this.#renderHost.setStyleProp) this.#renderHost.setStyleProp(group.handle, group.styleProperty, next, group.lastValue);
			else this.#renderHost.setProp(group.handle, "style", { [group.styleProperty]: next }, { [group.styleProperty]: group.lastValue });
		} else this.#renderHost.setProp(group.handle, group.name, next, group.lastValue);
	}
	#activateBoundPropGroup(group) {
		if (group.styleProperty === void 0 || !this.#renderHost.setStyleProp) return;
		const writer = this.#renderHost.prepareStyleProp?.(group.handle, group.styleProperty);
		if (typeof writer === "function") group.styleWriter = writer;
	}
	#makeScalarBindingGroups(node, name, rawValue) {
		const incompatible = hasNonScalarBindingMetadata(name, rawValue);
		if (this.#directBindingWrites && (name !== "style" || this.#renderHost.setStyleProp)) {
			const entries = name === "style" && typeof rawValue === "object" && rawValue !== null && !Array.isArray(rawValue) ? Object.entries(rawValue) : [[void 0, rawValue]];
			const groups = [];
			for (const [styleProperty, item] of entries) {
				const binding = getBoundValue(item);
				if (!binding) continue;
				groups.push({
					handle: node.handle,
					name,
					styleProperty,
					project: binding.project,
					sources: binding.sources ?? [binding.source],
					rawValue: binding,
					lastValue: readBoundValue(binding),
					forceWrite: !!binding.read
				});
			}
			if (groups.length > 0) return {
				groups,
				incompatible
			};
		}
		const sources = boundSourcesIn(name, rawValue);
		if (sources.length === 0) return {
			groups: [],
			incompatible: false
		};
		return {
			groups: [{
				handle: node.handle,
				name,
				sources,
				rawValue,
				lastValue: materializeProp(name, rawValue),
				forceWrite: hasStableDerivedBinding(rawValue)
			}],
			incompatible
		};
	}
	#registerScalarBindingProp(node, name, rawValue, planned) {
		const plan = planned ?? this.#makeScalarBindingGroups(node, name, rawValue);
		const groups = plan.groups;
		if (groups.length === 0) return;
		for (const group of groups) this.#activateBoundPropGroup(group);
		(node.scalarBindingGroups ??= /* @__PURE__ */ new Map()).set(name, groups);
		this.#bindingIndexAttachOperations += groups.length;
		if (plan.incompatible) {
			(node.scalarIncompatibleBindingProps ??= /* @__PURE__ */ new Set()).add(name);
			this.#incompatibleScalarBindingGroups++;
		}
		for (const group of groups) {
			if (!this.#programSinkSlotByGroup.has(group)) {
				const free = this.#programFreeSinkSlots.pop();
				const sinkSlot = free === void 0 ? this.#programSinkSlots.length : free;
				this.#programSinkSlots[sinkSlot] = group;
				this.#programSinkSlotByGroup.set(group, sinkSlot);
			}
			for (const source of group.sources) {
				this.#invalidatePreparedNumericRowsForSource(source);
				this.#pendingSourceColumnPrunes.delete(source);
				let list = this.#groupsBySource.get(source);
				if (!list) this.#groupsBySource.set(source, list = /* @__PURE__ */ new Set());
				const alreadyIndexed = list.has(group);
				list.add(group);
				let slot = this.#programSourceSlots.get(source);
				if (!slot) this.#programSourceSlots.set(source, slot = {
					source,
					groups: [],
					eligible: false,
					unaryEligible: false,
					epoch: 0,
					cellProgramGeneration: 0,
					preparedCutEpoch: 0,
					preparedCutValue: 0
				});
				if (!slot.groups.includes(group)) {
					this.#invalidatePreparedNumericCellProgram(slot);
					slot.groups.push(group);
				}
				this.#refreshProgramEligibility(slot);
				this.#indexSourceColumnGroup(source, group);
				if (!alreadyIndexed) this.#bindingIndexIndexOperations++;
			}
		}
	}
	#unregisterScalarBindingProp(node, name) {
		const groups = node.scalarBindingGroups?.get(name);
		if (groups) {
			let detached = false;
			for (const group of groups) {
				this.#unindexSourceColumnGroup(group);
				for (const source of group.sources) {
					this.#invalidatePreparedNumericRowsForSource(source);
					const list = this.#groupsBySource.get(source);
					if (!list || !list.delete(group)) continue;
					const programSlot = this.#programSourceSlots.get(source);
					if (programSlot) {
						this.#invalidatePreparedNumericCellProgram(programSlot);
						const index = programSlot.groups.indexOf(group);
						if (index !== -1) programSlot.groups.splice(index, 1);
					}
					if (programSlot && programSlot.groups.length === 0) this.#programSourceSlots.delete(source);
					else if (programSlot) this.#refreshProgramEligibility(programSlot);
					detached = true;
					this.#bindingIndexIndexOperations++;
					if (list.size === 0) {
						this.#groupsBySource.delete(source);
						if (this.#sourceColumnCells.has(source)) this.#pendingSourceColumnPrunes.add(source);
					}
				}
			}
			if (detached) this.#bindingIndexDetachOperations += groups.length;
			node.scalarBindingGroups?.delete(name);
			for (const group of groups) {
				this.#removeProgramSink(group);
				group.styleWriter = void 0;
			}
			if (node.scalarBindingGroups?.size === 0) node.scalarBindingGroups = void 0;
		}
		if (node.scalarIncompatibleBindingProps?.delete(name)) {
			this.#incompatibleScalarBindingGroups--;
			if (node.scalarIncompatibleBindingProps.size === 0) node.scalarIncompatibleBindingProps = void 0;
		}
	}
	#refreshProgramEligibility(slot) {
		const wasEligible = slot.eligible;
		let eligible = this.#directBindingWrites && slot.groups.length > 0;
		let unaryEligible = eligible;
		if (!eligible) {
			slot.eligible = false;
			slot.unaryEligible = false;
			if (wasEligible) this.#invalidatePreparedNumericCellProgram(slot);
			return;
		}
		for (const group of slot.groups) {
			const binding = getBoundValue(group.rawValue);
			const descriptor = binding?.numericProgram;
			if (!descriptor || descriptor.schemaVersion !== 1 && descriptor.schemaVersion !== 2 || typeof descriptor.sinkId !== "string" || descriptor.sinkId.length === 0 || descriptor.schemaVersion === 2 && (typeof descriptor.ownerProgramId !== "string" || descriptor.ownerProgramId.length === 0) || !Array.isArray(descriptor.sourceSites) || descriptor.sourceSites.length !== group.sources.length || descriptor.sourceSites.some((site) => typeof site !== "string") || !group.sources.includes(slot.source) || !binding.project || group.column !== void 0 || group.styleProperty !== void 0 && !group.styleWriter && !this.#renderHost.setStyleProp) {
				eligible = false;
				break;
			}
			if (group.sources.length !== 1 || group.sources[0] !== slot.source || typeof group.project !== "function" || group.column !== void 0 || descriptor.sourceSites.length !== 1) unaryEligible = false;
		}
		slot.eligible = eligible;
		slot.unaryEligible = eligible && unaryEligible;
		if (wasEligible !== eligible) this.#invalidatePreparedNumericCellProgram(slot);
	}
	#invalidatePreparedNumericCellProgram(slot) {
		slot.cellProgramGeneration++;
		const record = slot.cellProgram;
		if (record) {
			record.active = false;
			record.groups = void 0;
			this.#preparedCellProgramRecords.delete(record.token);
			slot.cellProgram = void 0;
		}
	}
	#invalidateAllPreparedNumericCellPrograms() {
		for (const slot of this.#programSourceSlots.values()) this.#invalidatePreparedNumericCellProgram(slot);
	}
	#isUnaryColumnGroup(source, group) {
		const descriptor = getBoundValue(group.rawValue)?.numericProgram;
		const supportedDescriptor = !!descriptor && (descriptor.schemaVersion === 1 || descriptor.schemaVersion === 2 && typeof descriptor.ownerProgramId === "string" && descriptor.ownerProgramId.length > 0);
		return group.sources.length === 1 && group.sources[0] === source && typeof group.project === "function" && group.column === void 0 && supportedDescriptor && descriptor.sourceSites.length === 1 && typeof descriptor.sourceSites[0] === "string";
	}
	#indexSourceColumnGroup(source, group) {
		const cell = this.#sourceColumnCells.get(source);
		if (!cell || !this.#isUnaryColumnGroup(source, group)) return;
		let rows = this.#groupsByColumnCell.get(cell.column);
		if (!rows) this.#groupsByColumnCell.set(cell.column, rows = /* @__PURE__ */ new Map());
		let groups = rows.get(cell.row);
		if (!groups) rows.set(cell.row, groups = []);
		if (!groups.includes(group)) groups.push(group);
		group.sourceColumn = cell.column;
		group.sourceColumnRow = cell.row;
	}
	#unindexSourceColumnGroup(group) {
		const column = group.sourceColumn;
		const row = group.sourceColumnRow;
		if (!column || row === void 0) return;
		const rows = this.#groupsByColumnCell.get(column);
		const groups = rows?.get(row);
		if (groups) {
			const index = groups.indexOf(group);
			if (index !== -1) groups.splice(index, 1);
			if (groups.length === 0) rows.delete(row);
			if (rows.size === 0) this.#groupsByColumnCell.delete(column);
		}
		group.sourceColumn = void 0;
		group.sourceColumnRow = void 0;
	}
	#pruneSourceColumnCells() {
		for (const source of this.#pendingSourceColumnPrunes) {
			this.#sourceColumnPruneVisits++;
			if (!this.#groupsBySource.get(source)?.size) this.#sourceColumnCells.delete(source);
		}
		this.#pendingSourceColumnPrunes.clear();
	}
	#removeProgramSink(group) {
		const index = this.#programSinkSlotByGroup.get(group);
		if (index === void 0) return;
		this.#programSinkSlotByGroup.delete(group);
		this.#programSinkSlots[index] = void 0;
		this.#programFreeSinkSlots.push(index);
	}
	#refreshScalarBindingProp(node, name, rawValue) {
		const oldGroups = node.scalarBindingGroups?.get(name) ?? [];
		const oldIncompatible = node.scalarIncompatibleBindingProps?.has(name) ?? false;
		const plan = this.#makeScalarBindingGroups(node, name, rawValue);
		const nextGroups = plan.groups;
		const nextIncompatible = plan.incompatible;
		if (oldGroups.length === nextGroups.length && oldGroups.every((old, index) => old.rawValue === nextGroups[index].rawValue) && oldIncompatible === nextIncompatible) return;
		if (oldGroups.length === nextGroups.length && oldGroups.every((old, index) => {
			const next = nextGroups[index];
			return old.styleProperty === next.styleProperty && old.sources.length === next.sources.length && old.sources.every((source, sourceIndex) => source === next.sources[sourceIndex]);
		})) {
			for (const old of oldGroups) this.#unindexSourceColumnGroup(old);
			for (let index = 0; index < oldGroups.length; index++) {
				const old = oldGroups[index];
				const next = nextGroups[index];
				for (const source of old.sources) this.#invalidatePreparedNumericRowsForSource(source);
				old.rawValue = next.rawValue;
				old.project = next.project;
				old.lastValue = next.lastValue;
				old.forceWrite = next.forceWrite;
				for (const source of old.sources) {
					const slot = this.#programSourceSlots.get(source);
					if (slot) {
						this.#invalidatePreparedNumericCellProgram(slot);
						this.#refreshProgramEligibility(slot);
					}
				}
			}
			for (const old of oldGroups) for (const source of old.sources) if (this.#programSourceSlots.get(source)?.eligible && this.#sourceColumnCells.has(source)) this.#indexSourceColumnGroup(source, old);
			if (oldIncompatible !== nextIncompatible) this.#incompatibleScalarBindingGroups += nextIncompatible ? 1 : -1;
			if (nextIncompatible) (node.scalarIncompatibleBindingProps ??= /* @__PURE__ */ new Set()).add(name);
			else {
				node.scalarIncompatibleBindingProps?.delete(name);
				if (node.scalarIncompatibleBindingProps?.size === 0) node.scalarIncompatibleBindingProps = void 0;
			}
			return;
		}
		this.#unregisterScalarBindingProp(node, name);
		if (!nextIncompatible) node.scalarIncompatibleBindingProps?.delete(name);
		this.#registerScalarBindingProp(node, name, rawValue, plan);
	}
	#attachScalarBindingNode(node) {
		if (node.vnode.kind !== "element") return;
		for (const [name, rawValue] of Object.entries(node.vnode.props)) this.#registerScalarBindingProp(node, name, rawValue);
	}
	#detachScalarBindingNode(node) {
		if (node.vnode.kind !== "element") return;
		const names = /* @__PURE__ */ new Set([...node.scalarBindingGroups?.keys() ?? [], ...node.scalarIncompatibleBindingProps ?? []]);
		for (const name of names) this.#unregisterScalarBindingProp(node, name);
	}
	/** Attach ordinary scalar prop writers for only the newly mounted subtree. */
	#attachScalarBindingSubtree(node) {
		const visit = (mounted) => {
			structuralCount("vdom.binding.attach-subtree-visits", "iteration", "vdom_snapshot_runtime.ts:attachScalarBindingSubtree");
			this.#attachScalarBindingNode(mounted);
			forEachMountedChild(mounted, visit);
		};
		visit(node);
	}
	/** Detach writer groups before their hosts leave or change their props. */
	#detachScalarBindingSubtree(node) {
		const visit = (mounted) => {
			structuralCount("vdom.binding.detach-subtree-visits", "iteration", "vdom_snapshot_runtime.ts:detachScalarBindingSubtree");
			this.#detachScalarBindingNode(mounted);
			forEachMountedChild(mounted, visit);
		};
		visit(node);
	}
	#rebuildBindingIndex() {
		structuralCount("vdom.binding.full-rebuild-events", "event", "vdom_snapshot_runtime.ts:rebuildBindingIndex");
		let visits = 0;
		const countVisits = this.#profileCounter !== void 0;
		this.#invalidateAllPreparedNumericCellPrograms();
		for (const source of this.#numericRowProgramsBySource.keys()) this.#invalidatePreparedNumericRowsForSource(source);
		this.#groupsBySource.clear();
		this.#programSourceSlots.clear();
		this.#programSinkSlots.length = 0;
		this.#programFreeSinkSlots.length = 0;
		this.#programSinkSlotByGroup.clear();
		this.#incompatibleScalarBindingGroups = 0;
		this.#groupsByCompiledBinding.clear();
		this.#groupsByCompiledSource.clear();
		this.#groupsByCompiledColumnBinding.clear();
		this.#groupsByCompiledColumn.clear();
		this.#groupsByCompiledColumnRows.clear();
		this.#groupsByColumnCell.clear();
		this.#pendingSourceColumnPrunes.clear();
		this.#compiledSlotBySource.clear();
		if (this.#compiledGraph) this.#validateCompiledGraph(this.#compiledGraph);
		const visit = (node) => {
			if (node.hostDisposed) {
				node.scalarBindingGroups = void 0;
				node.scalarIncompatibleBindingProps = void 0;
				return;
			}
			structuralCount("vdom.binding.full-rebuild-visits", "iteration", "vdom_snapshot_runtime.ts:rebuildBindingIndex");
			if (countVisits) visits++;
			if (node.scalarBindingGroups) for (const groups of node.scalarBindingGroups.values()) for (const group of groups) group.styleWriter = void 0;
			node.scalarBindingGroups = void 0;
			node.scalarIncompatibleBindingProps = void 0;
			if (node.vnode.kind === "element") for (const [name, rawValue] of Object.entries(node.vnode.props)) if (this.#compiledGraph) for (const binding of compiledBindingsIn(name, rawValue)) {
				const existingSlot = this.#compiledSlotBySource.get(binding.source);
				if (existingSlot !== void 0 && existingSlot !== binding.sourceSlot) throw new Error("One scalar source cannot occupy multiple slots in a compiled VDOM root");
				this.#compiledSlotBySource.set(binding.source, binding.sourceSlot);
				const rowStart = this.#compiledGraph.sourceBindingOffsets[binding.sourceSlot];
				const rowEnd = this.#compiledGraph.sourceBindingOffsets[binding.sourceSlot + 1];
				let found = false;
				for (let edge = rowStart; edge < rowEnd; edge++) if (this.#compiledGraph.bindingIds[edge] === binding.bindingId) found = true;
				if (!found) throw new Error(`Compiled binding ${binding.bindingId} is absent from source slot ${binding.sourceSlot}`);
				let byBinding = this.#groupsByCompiledBinding.get(binding.source);
				if (!byBinding) this.#groupsByCompiledBinding.set(binding.source, byBinding = /* @__PURE__ */ new Map());
				const column = binding.binding.column;
				const columnIndex = binding.binding.entityIndex;
				if (column && (!Number.isInteger(columnIndex) || columnIndex < 0)) throw new Error("Compiled column binding has an invalid entity index");
				const group = {
					handle: node.handle,
					name,
					styleProperty: binding.styleProperty,
					project: binding.binding.project,
					...column ? {
						column,
						columnIndex,
						lastSourceValue: column.values[columnIndex]
					} : {},
					sources: [binding.source],
					rawValue: binding.binding,
					lastValue: column ? binding.binding.project(column.values[columnIndex]) : binding.binding.project(binding.source.value)
				};
				this.#activateBoundPropGroup(group);
				const bindingGroups = byBinding.get(binding.bindingId);
				if (bindingGroups) bindingGroups.push(group);
				else byBinding.set(binding.bindingId, [group]);
				if (column) {
					let columnBindings = this.#groupsByCompiledColumnBinding.get(column);
					if (!columnBindings) this.#groupsByCompiledColumnBinding.set(column, columnBindings = /* @__PURE__ */ new Map());
					const columnGroups = columnBindings.get(binding.bindingId);
					if (columnGroups) columnGroups.push(group);
					else columnBindings.set(binding.bindingId, [group]);
				}
			}
			else {
				if (this.#directBindingWrites && (name !== "style" || this.#renderHost.setStyleProp)) {
					const values = name === "style" && typeof rawValue === "object" && rawValue !== null && !Array.isArray(rawValue) ? Object.entries(rawValue) : [[void 0, rawValue]];
					let foundBinding = false;
					for (const [styleProperty, item] of values) {
						const binding = getBoundValue(item);
						if (!binding) continue;
						foundBinding = true;
						const group = {
							handle: node.handle,
							name,
							styleProperty,
							project: binding.project,
							rawValue: binding,
							sources: binding.sources ?? [binding.source],
							lastValue: readBoundValue(binding),
							forceWrite: !!binding.read
						};
						this.#activateBoundPropGroup(group);
						const groups = node.scalarBindingGroups?.get(name) ?? [];
						groups.push(group);
						(node.scalarBindingGroups ??= /* @__PURE__ */ new Map()).set(name, groups);
						for (const source of binding.sources ?? [binding.source]) {
							const list = this.#groupsBySource.get(source);
							if (list) list.add(group);
							else this.#groupsBySource.set(source, /* @__PURE__ */ new Set([group]));
						}
					}
					if (foundBinding) {
						if (hasNonScalarBindingMetadata(name, rawValue)) {
							this.#incompatibleScalarBindingGroups++;
							(node.scalarIncompatibleBindingProps ??= /* @__PURE__ */ new Set()).add(name);
						}
						continue;
					}
				}
				const sources = boundSourcesIn(name, rawValue);
				if (sources.length === 0) continue;
				if ((name === "style" && typeof rawValue === "object" && rawValue !== null && !Array.isArray(rawValue) ? Object.values(rawValue) : [rawValue]).some((item) => {
					const binding = getBoundValue(item);
					return !!binding && (binding.bindingId !== void 0 || binding.sourceSlot !== void 0 || binding.column !== void 0);
				})) {
					this.#incompatibleScalarBindingGroups++;
					(node.scalarIncompatibleBindingProps ??= /* @__PURE__ */ new Set()).add(name);
				}
				const group = {
					handle: node.handle,
					name,
					sources,
					rawValue,
					lastValue: materializeProp(name, rawValue),
					forceWrite: hasStableDerivedBinding(rawValue)
				};
				(node.scalarBindingGroups ??= /* @__PURE__ */ new Map()).set(name, [group]);
				for (const source of sources) {
					const list = this.#groupsBySource.get(source);
					if (list) list.add(group);
					else this.#groupsBySource.set(source, /* @__PURE__ */ new Set([group]));
				}
			}
			forEachMountedChild(node, visit);
		};
		for (const node of this.#mounted) visit(node);
		for (const source of this.#sourceColumnCells.keys()) {
			this.#sourceColumnPruneVisits++;
			const groups = this.#groupsBySource.get(source);
			if (!groups?.size) {
				this.#sourceColumnCells.delete(source);
				continue;
			}
			for (const group of groups) this.#indexSourceColumnGroup(source, group);
		}
		if (countVisits) this.#profileCounter?.({ "vdom.binding-index.full-rebuild-visits": visits });
		if (this.#compiledGraph) {
			for (const [source, byBinding] of this.#groupsByCompiledBinding) {
				const slot = this.#compiledSlotBySource.get(source);
				const groups = [];
				const start = this.#compiledGraph.sourceBindingOffsets[slot];
				const end = this.#compiledGraph.sourceBindingOffsets[slot + 1];
				for (let edge = start; edge < end; edge++) {
					const bindingGroups = byBinding.get(this.#compiledGraph.bindingIds[edge]);
					if (bindingGroups) groups.push(...bindingGroups);
				}
				if (groups.length > 0) this.#groupsByCompiledSource.set(source, groups);
			}
			for (const [column, byBinding] of this.#groupsByCompiledColumnBinding) {
				const groups = [];
				const rowGroups = [];
				const start = this.#compiledGraph.sourceBindingOffsets[column.sourceSlot];
				const end = this.#compiledGraph.sourceBindingOffsets[column.sourceSlot + 1];
				for (let edge = start; edge < end; edge++) {
					const bindingGroups = byBinding.get(this.#compiledGraph.bindingIds[edge]);
					if (bindingGroups) for (const group of bindingGroups) {
						groups.push(group);
						const row = group.columnIndex;
						const indexed = rowGroups[row];
						if (indexed) indexed.push(group);
						else rowGroups[row] = [group];
					}
				}
				if (groups.length > 0) {
					this.#groupsByCompiledColumn.set(column, groups);
					this.#groupsByCompiledColumnRows.set(column, rowGroups);
				}
			}
		}
		for (const [source, groups] of this.#groupsBySource) {
			const slot = {
				source,
				groups: Array.from(groups),
				eligible: false,
				unaryEligible: false,
				epoch: 0,
				cellProgramGeneration: 0,
				preparedCutEpoch: 0,
				preparedCutValue: 0
			};
			this.#programSourceSlots.set(source, slot);
			for (const group of groups) if (!this.#programSinkSlotByGroup.has(group)) {
				this.#programSinkSlotByGroup.set(group, this.#programSinkSlots.length);
				this.#programSinkSlots.push(group);
			}
			this.#refreshProgramEligibility(slot);
		}
	}
	#clearBindingIndex() {
		this.#invalidateAllPreparedNumericCellPrograms();
		this.#groupsBySource.clear();
		this.#programSourceSlots.clear();
		this.#programSinkSlots.length = 0;
		this.#programFreeSinkSlots.length = 0;
		this.#programSinkSlotByGroup.clear();
		this.#incompatibleScalarBindingGroups = 0;
		this.#groupsByCompiledBinding.clear();
		this.#groupsByCompiledSource.clear();
		this.#groupsByCompiledColumnBinding.clear();
		this.#groupsByCompiledColumn.clear();
		this.#groupsByCompiledColumnRows.clear();
		this.#sourceColumnCells.clear();
		this.#pendingSourceColumnPrunes.clear();
		this.#groupsByColumnCell.clear();
		this.#compiledSlotBySource.clear();
		const clear = (node) => {
			if (node.scalarBindingGroups) for (const groups of node.scalarBindingGroups.values()) for (const group of groups) group.styleWriter = void 0;
			node.scalarBindingGroups = void 0;
			node.scalarIncompatibleBindingProps = void 0;
			forEachMountedChild(node, clear);
		};
		for (const node of this.#mounted) clear(node);
	}
	#rebuildKeyIndex() {
		structuralCount("vdom.key-index.full-rebuild-events", "event", "vdom_snapshot_runtime.ts:rebuildKeyIndex");
		this.#nodesByKey.clear();
		this.#nodesByKeyedRegion.clear();
		let visits = 0;
		const countVisits = this.#profileCounter !== void 0;
		const visit = (node) => {
			if (node.hostDisposed) return;
			structuralCount("vdom.key-index.full-rebuild-visits", "iteration", "vdom_snapshot_runtime.ts:rebuildKeyIndex");
			if (countVisits) visits++;
			this.#addToKeyIndex(node);
			forEachMountedChild(node, visit);
		};
		for (const node of this.#mounted) visit(node);
		if (countVisits) this.#profileCounter?.({ "vdom.key-index.full-rebuild-visits": visits });
	}
	#addToKeyIndex(node) {
		const key = node.vnode.key;
		if (key !== null) {
			let set = this.#nodesByKey.get(key);
			if (!set) this.#nodesByKey.set(key, set = /* @__PURE__ */ new Set());
			set.add(node);
		}
		if (node.vnode.kind === "element" && node.vnode.keyedRegionId !== null) {
			let set = this.#nodesByKeyedRegion.get(node.vnode.keyedRegionId);
			if (!set) this.#nodesByKeyedRegion.set(node.vnode.keyedRegionId, set = /* @__PURE__ */ new Set());
			set.add(node);
		}
	}
	#removeFromKeyIndex(node) {
		this.#removeKeyFromIndex(node.vnode.key, node);
		if (node.vnode.kind === "element" && node.vnode.keyedRegionId !== null) {
			const set = this.#nodesByKeyedRegion.get(node.vnode.keyedRegionId);
			set?.delete(node);
			if (set?.size === 0) this.#nodesByKeyedRegion.delete(node.vnode.keyedRegionId);
		}
	}
	#removeKeyFromIndex(key, node) {
		if (key === null) return;
		const set = this.#nodesByKey.get(key);
		set?.delete(node);
		if (set?.size === 0) this.#nodesByKey.delete(key);
	}
	#validateCompiledGraph(graph) {
		if (!Number.isInteger(graph.sourceCount) || graph.sourceCount < 0 || graph.sourcePaths.length !== graph.sourceCount || graph.sourceBindingOffsets.length !== graph.sourceCount + 1 || graph.sourceBindingOffsets[0] !== 0 || graph.sourceBindingOffsets[graph.sourceCount] !== graph.bindingIds.length) throw new Error("Malformed compiled VDOM dependency graph");
		for (let slot = 0; slot < graph.sourceCount; slot++) if (!Number.isInteger(graph.sourceBindingOffsets[slot]) || graph.sourceBindingOffsets[slot] > graph.sourceBindingOffsets[slot + 1]) throw new Error(`Malformed compiled VDOM source range at slot ${slot}`);
	}
};
var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
var XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
var SVG_ATTRIBUTE_NAMES = {
	accentHeight: "accent-height",
	alignmentBaseline: "alignment-baseline",
	baselineShift: "baseline-shift",
	clipPath: "clip-path",
	clipRule: "clip-rule",
	colorInterpolation: "color-interpolation",
	colorInterpolationFilters: "color-interpolation-filters",
	dominantBaseline: "dominant-baseline",
	enableBackground: "enable-background",
	fillOpacity: "fill-opacity",
	fillRule: "fill-rule",
	floodColor: "flood-color",
	floodOpacity: "flood-opacity",
	fontFamily: "font-family",
	fontSize: "font-size",
	fontSizeAdjust: "font-size-adjust",
	fontStretch: "font-stretch",
	fontStyle: "font-style",
	fontVariant: "font-variant",
	fontWeight: "font-weight",
	glyphOrientationHorizontal: "glyph-orientation-horizontal",
	glyphOrientationVertical: "glyph-orientation-vertical",
	letterSpacing: "letter-spacing",
	lightingColor: "lighting-color",
	markerEnd: "marker-end",
	markerMid: "marker-mid",
	markerStart: "marker-start",
	paintOrder: "paint-order",
	pointerEvents: "pointer-events",
	shapeRendering: "shape-rendering",
	stopColor: "stop-color",
	stopOpacity: "stop-opacity",
	strokeDasharray: "stroke-dasharray",
	strokeDashoffset: "stroke-dashoffset",
	strokeLinecap: "stroke-linecap",
	strokeLinejoin: "stroke-linejoin",
	strokeMiterlimit: "stroke-miterlimit",
	strokeOpacity: "stroke-opacity",
	strokeWidth: "stroke-width",
	textAnchor: "text-anchor",
	textDecoration: "text-decoration",
	textRendering: "text-rendering",
	transformOrigin: "transform-origin",
	vectorEffect: "vector-effect",
	wordSpacing: "word-spacing",
	writingMode: "writing-mode"
};
var svgAttributeName = (name) => SVG_ATTRIBUTE_NAMES[name] ?? name;
var writeStyle = (style, name, value) => {
	if (name.startsWith("--")) {
		if (value == null) style.removeProperty(name);
		else style.setProperty(name, String(value));
	} else style[name] = value == null ? "" : String(value);
};
var DOMVDOMHost = class DOMVDOMHost {
	createElement(tag, parent) {
		if (tag.toLowerCase() === "svg") return document.createElementNS(SVG_NAMESPACE, tag);
		const parentElement = parent instanceof Element ? parent : null;
		const parentIsSvg = parentElement?.namespaceURI === SVG_NAMESPACE;
		const parentIsForeignObject = parentIsSvg && parentElement?.localName === "foreignObject";
		if (parentIsSvg && !parentIsForeignObject) return document.createElementNS(SVG_NAMESPACE, tag);
		return document.createElement(tag);
	}
	createText(text) {
		return document.createTextNode(text);
	}
	setText(node, text) {
		node.textContent = text;
	}
	setProp(node, name, value, previous) {
		if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;
		if (name === "style") {
			const before = previous ?? {};
			const after = value ?? {};
			for (const key of /* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)])) {
				if (Object.is(before[key], after[key])) continue;
				writeStyle(node.style, key, after[key]);
			}
			return;
		}
		if (/^on[A-Z]/.test(name)) {
			const eventName = name.slice(2).toLowerCase();
			if (typeof previous === "function") node.removeEventListener(eventName, previous);
			if (typeof value === "function") node.addEventListener(eventName, value);
			return;
		}
		if (name === "className") {
			if (node instanceof HTMLElement) node.className = String(value ?? "");
			else node.setAttribute("class", String(value ?? ""));
			return;
		}
		if (name.startsWith("aria-") || name.startsWith("data-")) {
			if (value == null) node.removeAttribute(name);
			else node.setAttribute(name, String(value));
			return;
		}
		if (node instanceof SVGElement) {
			if (name === "xlinkHref") {
				if (value == null || value === false) node.removeAttributeNS(XLINK_NAMESPACE, "href");
				else node.setAttributeNS(XLINK_NAMESPACE, "xlink:href", String(value));
				return;
			}
			const attribute = svgAttributeName(name);
			if (value == null || value === false) node.removeAttribute(attribute);
			else node.setAttribute(attribute, value === true ? "" : String(value));
			return;
		}
		if (name === "htmlFor" && node instanceof HTMLLabelElement) {
			node.htmlFor = String(value ?? "");
			return;
		}
		if (name === "value" && (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement)) {
			const next = value == null ? "" : String(value);
			if (node.value !== next) node.value = next;
			if (value == null) node.removeAttribute(name);
			return;
		}
		if ((value == null || value === false) && name in node && typeof node[name] === "boolean") {
			node[name] = false;
			node.removeAttribute(name);
		} else if (value == null || value === false) node.removeAttribute(name);
		else if (name in node && !name.startsWith("aria-") && !name.startsWith("data-")) node[name] = value;
		else node.setAttribute(name, value === true ? "" : String(value));
	}
	setStyleProp(node, name, value) {
		if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;
		writeStyle(node.style, name, value);
	}
	prepareStyleProp(node, name) {
		if (this.setStyleProp !== DOMVDOMHost.prototype.setStyleProp) return;
		if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;
		return createDOMStylePropWriter(node.style, name);
	}
	place(parent, node, before) {
		structuralCount("host.place.attempts", "event", "vdom_snapshot_runtime.ts:DOMVDOMHost.place");
		if (node.parentNode === parent && node.nextSibling === before) {
			structuralCount("host.place.noops", "event", "vdom_snapshot_runtime.ts:DOMVDOMHost.place");
			return;
		}
		if (before === null && node.parentNode === parent && parent.lastChild === node) {
			structuralCount("host.place.noops", "event", "vdom_snapshot_runtime.ts:DOMVDOMHost.place");
			return;
		}
		parent.insertBefore(node, before);
		structuralCount("host.place.effective-insertBefore", "event", "vdom_snapshot_runtime.ts:DOMVDOMHost.place");
	}
	remove(parent, node) {
		if (node.parentNode === parent) {
			parent.removeChild(node);
			structuralCount("host.remove.effective", "event", "vdom_snapshot_runtime.ts:DOMVDOMHost.remove");
		}
	}
};
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/snapshot/src/derived_region_runtime.ts
var DerivedRegionDispatcher = class {
	graph;
	#pending;
	#pendingRegions = [];
	#processingRegions = [];
	constructor(graph) {
		this.graph = graph;
		const { source_count, source_paths, source_region_offsets, region_ids } = graph;
		if (!Number.isInteger(source_count) || source_count < 0 || source_paths.length !== source_count || source_region_offsets.length !== source_count + 1 || source_region_offsets[0] !== 0 || source_region_offsets[source_count] !== region_ids.length) throw new Error("Malformed derived-region CSR graph");
		let regionCount = 0;
		for (let source = 0; source < source_count; source++) {
			const start = source_region_offsets[source];
			const end = source_region_offsets[source + 1];
			if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > region_ids.length) throw new Error(`Malformed derived-region source range at slot ${source}`);
		}
		for (const region of region_ids) {
			if (!Number.isInteger(region) || region < 0) throw new Error("Derived-region graph contains an invalid region ID");
			regionCount = Math.max(regionCount, region + 1);
		}
		this.#pending = new Uint8Array(regionCount);
	}
	invalidateSourceSlot(sourceSlot) {
		const { source_count, source_region_offsets, region_ids } = this.graph;
		if (!Number.isInteger(sourceSlot) || sourceSlot < 0 || sourceSlot >= source_count) throw new RangeError(`Derived-region source slot out of range: ${sourceSlot}`);
		for (let edge = source_region_offsets[sourceSlot]; edge < source_region_offsets[sourceSlot + 1]; edge++) {
			const region = region_ids[edge];
			if (this.#pending[region] === 0) {
				this.#pending[region] = 1;
				this.#pendingRegions.push(region);
			}
		}
	}
	/** Run each invalidated region once, in first-invalidation order. */
	flush(runRegion) {
		const processing = this.#pendingRegions;
		this.#pendingRegions = this.#processingRegions;
		this.#processingRegions = processing;
		this.#pendingRegions.length = 0;
		let index = 0;
		try {
			for (; index < processing.length; index++) {
				const region = processing[index];
				this.#pending[region] = 0;
				runRegion(region);
			}
			return processing.length;
		} finally {
			for (; index < processing.length; index++) this.#pending[processing[index]] = 0;
			processing.length = 0;
		}
	}
};
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/snapshot/src/component_state_runtime.ts
var componentSite = Symbol("compiled-component-site");
var SparseCandidateIneligible = class extends Error {};
var collectionRegionDescriptors = /* @__PURE__ */ new WeakMap();
var activeOwners = [];
var StaleCollectionCandidate = class extends Error {};
/** Native local resource boundary. The runtime recognizes this marker before invoking it. */
var Suspense = (props) => props.children ?? null;
var isPendingResource = (error) => isPendingResourceToken(error);
var worldResourceTables = /* @__PURE__ */ new WeakMap();
var ExpansionJournal = class {
	#undo = [];
	checkpoint() {
		return this.#undo.length;
	}
	clear() {
		this.#undo.length = 0;
	}
	rollback(cursor) {
		for (let i = this.#undo.length - 1; i >= cursor; i--) this.#undo[i]();
		this.#undo.length = cursor;
	}
	set(map, key, value) {
		const had = map.has(key), previous = map.get(key);
		this.#undo.push(() => had ? map.set(key, previous) : map.delete(key));
		map.set(key, value);
	}
	add(set, value) {
		const had = set.has(value);
		this.#undo.push(() => {
			if (!had) set.delete(value);
		});
		set.add(value);
	}
	push(array, value) {
		this.#undo.push(() => {
			array.pop();
		});
		array.push(value);
	}
	undo(callback) {
		this.#undo.push(callback);
	}
};
var effectKey = (owner, siteId) => `${owner}\u0000${siteId}`;
var closedCandidateValidate = () => false;
var closedCandidateAction = () => {
	throw new Error("Native root candidate is closed");
};
var closedCandidateNoop = () => {};
var closedCandidateLease = () => closedCandidateNoop;
/** Attach the stable component-site ID that a compiler would emit for a function component. */
var defineComponent = (siteId, render, metadata) => {
	if (siteId.length === 0) throw new Error("Component site ID must not be empty");
	Object.defineProperty(render, componentSite, { value: siteId });
	if (metadata) {
		const propOnlySites = [...metadata.propOnlySites];
		if (propOnlySites.some((site) => typeof site !== "string" || !site)) throw new Error("Component prop-only metadata contains an invalid state site ID");
		let stateLayout;
		if (metadata.stateLayout !== void 0) {
			const layout = metadata.stateLayout;
			if (layout.programId !== void 0 && layout.programId !== siteId) throw new Error("Compiled state layout program ID must match its component site");
			const normalized = normalizeCompiledStateLayout(layout);
			if (normalized.slots.some((entry) => !propOnlySites.includes(entry.siteId))) throw new Error("Invalid compiled state layout slot");
			stateLayout = normalized;
		}
		if (metadata.ownerUpdateProgram !== void 0) {
			const program = metadata.ownerUpdateProgram;
			if (!stateLayout || program.programId !== siteId || stateLayout.programId !== siteId) throw new Error("Compiled owner update program must match its component and state layout IDs");
			associateCompiledOwnerUpdateProgram(stateLayout, program);
		}
		Object.defineProperty(render, componentMetadata, { value: Object.freeze({
			propOnlySites: Object.freeze(propOnlySites),
			hostLeafOutput: metadata.hostLeafOutput === true,
			...stateLayout ? { stateLayout } : {}
		}) });
	}
	return render;
};
var componentMetadata = Symbol("compiled-component-metadata");
var emptyCompiledPropSites = /* @__PURE__ */ new Set();
var compiledStateLayoutFor = (component) => typeof component === "function" ? component[componentMetadata]?.stateLayout : void 0;
/** Explicit-site hook primitive; the compiler can lower familiar useState calls to this form. */
var useStateAt = (siteId, initial) => {
	const active = activeOwners[activeOwners.length - 1];
	if (!active) throw new Error("useStateAt must run while an owner-aware component is rendering");
	return active.stateLayout ? active.world.useState(active.owner, siteId, initial, active.stateLayout) : active.world.useState(active.owner, siteId, initial);
};
/** Register an effect by compiler site ID; setup runs after commit, cleanup on deactivation or owner removal. */
var useEffectAt = (siteId, setup) => {
	const active = activeOwners[activeOwners.length - 1];
	if (!active) throw new Error("useEffectAt must run while an owner-aware component is rendering");
	active.registerEffect(siteId, setup);
};
/**
* Compiler lowering for `items.map(row => <Row key={row.id} ... />)` when the
* input is a proven keyed collection. Initial/full renders take a snapshot;
* committed roots consume later collection batches through a sparse region.
*/
var renderCollectionAt = (siteId, collection, renderRow, options = {}) => {
	if (activeOwners.length === 0) throw new Error("renderCollectionAt must run while an owner is rendering");
	if (!siteId || !collection || typeof collection.snapshot !== "function" || typeof collection.createReader !== "function" || typeof renderRow !== "function") throw new Error("renderCollectionAt requires a site, collection, and row renderer");
	const snapshotVersion = collection.version;
	const rows = /* @__PURE__ */ new Map();
	let componentSiteId;
	const children = collection.snapshot().map(({ key, value }) => {
		const rendered = renderRow(value);
		if (!rendered || Array.isArray(rendered) || typeof rendered !== "object" || !(typeof rendered.type === "function" || typeof rendered.type === "string")) throw new Error("Keyed collection rows must render one element");
		const rowSiteId = typeof rendered.type === "function" ? getComponentSiteId(rendered.type) : void 0;
		if (rowSiteId && componentSiteId && componentSiteId !== rowSiteId) throw new Error("A collection region must map one component site");
		if (rowSiteId) componentSiteId = rowSiteId;
		const authoredKey = rendered.props.key;
		if (authoredKey != null && String(authoredKey) !== key) throw new Error(`Collection key ${key} does not match rendered row key ${String(authoredKey)}`);
		rows.set(key, {
			...rendered,
			props: {
				...rendered.props,
				key
			}
		});
		return rows.get(key);
	});
	const version = createKeyedOwnerVersion();
	const marked = keyedOwnerChildren(siteId, children, version);
	collectionRegionDescriptors.set(version, {
		siteId,
		componentSiteId,
		collection,
		renderRow,
		rows,
		snapshotVersion,
		requiresOwnerRender: options.requiresOwnerRender === true
	});
	return marked;
};
var getComponentSiteId = (type) => {
	if (typeof type !== "function") throw new Error("Expected a function component");
	const siteId = type[componentSite];
	if (!siteId) throw new Error("Owner-aware components must be registered with defineComponent(siteId, render)");
	return siteId;
};
var keyedIdentity = (element, siteId, ordinal) => {
	const key = element.props.key;
	return key == null ? `@slot:${siteId}:${ordinal}` : String(key);
};
var collectionOwnerSite = (collectionSiteId, componentSiteId) => `${componentSiteId}\u0000collection:${collectionSiteId}`;
var carryHostKeys = (node, componentKey, path = "0", onVisit) => {
	onVisit?.();
	if (node == null || node === false || typeof node === "string" || typeof node === "number") return node;
	if (Array.isArray(node)) return copyKeyedOwnerMetadata(node, node.map((child, index) => carryHostKeys(child, componentKey, `${path}.${index}`, onVisit)));
	if (node.type === Fragment) return {
		...node,
		props: {
			...node.props,
			children: carryHostKeys(node.props.children, componentKey, path, onVisit)
		}
	};
	const existingKey = node.props.key;
	const key = existingKey == null ? `${String(componentKey)}:${path}` : String(existingKey);
	return {
		...node,
		props: {
			...node.props,
			key
		}
	};
};
var singleHostRootKey = (node, onVisit) => {
	const roots = [];
	const flatten = (value) => {
		onVisit?.();
		if (value == null || value === false) return true;
		if (Array.isArray(value)) return value.every(flatten);
		if (typeof value === "string" || typeof value === "number") return false;
		if (value.type === Fragment) return flatten(value.props.children);
		if (typeof value.type !== "string") return false;
		roots.push(value);
		return true;
	};
	if (!flatten(node) || roots.length !== 1 || roots[0].props.key == null) return null;
	return String(roots[0].props.key);
};
var hasNestedComponent = (node, onVisit) => {
	onVisit?.();
	if (node == null || node === false || typeof node === "string" || typeof node === "number") return false;
	if (Array.isArray(node)) return node.some((child) => hasNestedComponent(child, onVisit));
	if (typeof node.type === "function") return true;
	return hasNestedComponent(node.props.children, onVisit);
};
/**
* Component execution bridge between owner/site state and retained VDOM.
* The native module compiler supplies stable component, hook, and collection
* site IDs; explicit helpers remain available to host adapters and extensions.
*/
var ComponentStateRoot = class ComponentStateRoot {
	world;
	#rootOwner;
	#rootId;
	#vdom;
	#tree = null;
	#liveOwners = /* @__PURE__ */ new Set();
	#liveEffects = /* @__PURE__ */ new Map();
	#liveEffectKeysByOwner = /* @__PURE__ */ new Map();
	#componentCache = /* @__PURE__ */ new Map();
	#compiledPropSitesByCache = /* @__PURE__ */ new WeakMap();
	#liveCollectionRegions = /* @__PURE__ */ new Map();
	#pendingCollectionRegionKeys = /* @__PURE__ */ new Set();
	#collectionSnapshotFallbackKeys = /* @__PURE__ */ new Set();
	#preparedRenders = /* @__PURE__ */ new Map();
	#disposed = false;
	#disposing = false;
	#publicationVersion = 0;
	#preparedCandidates = /* @__PURE__ */ new Set();
	#candidateHostCommit = false;
	#publicationBarrier = null;
	#deferredFlush = false;
	#disposeListeners = /* @__PURE__ */ new Set();
	#candidateStoreHolds = /* @__PURE__ */ new Map();
	#storeDependencyLeases = /* @__PURE__ */ new Map();
	#terminalHostFailure;
	#terminalHostFailed = false;
	#scheduled = false;
	#pendingChanges = new PendingStateChanges();
	#lastSourceValues = /* @__PURE__ */ new Map();
	#numericProgramSources = [];
	#numericProgramCurrentValues = [];
	#numericProgramPreviousValues = [];
	#numericProgramUsedCount = 0;
	#nativeCellHandles = [];
	#nativeCellVersions = [];
	#nativeLaneTokens = [];
	#nativeLanePrograms = /* @__PURE__ */ new WeakMap();
	#nativeRowPrograms = /* @__PURE__ */ new WeakMap();
	#nativeRowEpoch = 0;
	#nativeRowTokens = [];
	#nativeRowViews = [];
	#nativeChangedRows = /* @__PURE__ */ new Uint32Array(0);
	#nativeChangedSlots = /* @__PURE__ */ new Uint32Array(0);
	#nativeRowUsedCount = 0;
	#nativeCellCutActive = false;
	#liveStoreSubscriptions = /* @__PURE__ */ new Map();
	#liveStoreReaders = /* @__PURE__ */ new Map();
	#resourceTable;
	#liveResourceSubscriptions = /* @__PURE__ */ new Map();
	#everReadResource = false;
	#everHadNativeBoundary = false;
	#pendingResourceRetry = false;
	#boundaryPrimaries = /* @__PURE__ */ new Map();
	#storeNotificationGeneration = 0;
	#committedStoreNotificationGeneration = 0;
	#sourceValueSyncVisits = 0;
	#scheduleCommit;
	#unsubscribe;
	#profile;
	#profileCounter;
	#keyedOwnerReuse;
	#keyedOwnerReuseMode;
	#collectedKeyedRegions = null;
	#collectedCollectionRegions = null;
	#activeCounters;
	#invalidation;
	static #nextRootId = 1;
	constructor(host, container, options = {}) {
		this.world = options.world ?? new OwnerStateWorld();
		let resourceTable = worldResourceTables.get(this.world);
		if (!resourceTable) {
			resourceTable = new AsyncResourceTable();
			worldResourceTables.set(this.world, resourceTable);
		}
		this.#resourceTable = resourceTable;
		this.#profile = options.profile;
		this.#profileCounter = options.profileCounter;
		this.#keyedOwnerReuse = options.keyedOwnerReuse ?? options.keyedOwnerReuseMode !== void 0;
		this.#keyedOwnerReuseMode = options.keyedOwnerReuseMode ?? "checked";
		this.#vdom = new VDOMSnapshotRoot(host, container, options.profile, options.profileCounter ? (counters) => {
			for (const [name, count] of Object.entries(counters)) this.#count(name, count);
		} : void 0, options.keyIndexMaintenance);
		const rootId = options.rootId ?? `root-${ComponentStateRoot.#nextRootId++}`;
		if (!rootId) throw new Error("Component root ID must not be empty");
		this.#rootId = rootId;
		this.#scheduleCommit = options.scheduleCommit ?? ((commit) => queueMicrotask(commit));
		if (options.invalidationPlan) {
			const plan = options.invalidationPlan;
			if (plan.region_component_site_ids.some((siteId) => typeof siteId !== "string" || siteId.length === 0)) throw new Error("Component invalidation plan has an invalid component site ID");
			for (const region of plan.region_ids) if (region >= plan.region_component_site_ids.length) throw new Error("Component invalidation region has no component site ID");
			this.#invalidation = {
				dispatcher: new DerivedRegionDispatcher(plan),
				sourceSlots: new Map(plan.source_paths.map((siteId, index) => [siteId, index])),
				componentSites: plan.region_component_site_ids
			};
		}
		this.#rootOwner = this.world.claimRootId(rootId);
		this.#unsubscribe = this.world.subscribeDirtyCells((handle, version) => {
			if (!this.world.isWithin(handle.owner, this.#rootOwner)) return;
			this.#pendingChanges.setCell(handle, version);
			this.#schedule();
		});
		registerStructuralRoot(this, rootId);
	}
	get version() {
		return this.#vdom.version;
	}
	/** Logical native publication revision, including non-DOM source commits. */
	get publicationVersion() {
		return this.#publicationVersion;
	}
	/** Hold declared task/input store dependencies until this owner releases them. */
	holdStoreDependencies(stores) {
		this.#assertActive();
		const leasedStores = new Set(stores);
		if ([...leasedStores].some((store) => !(store instanceof AsyncStore))) throw new TypeError("Store dependency holds require native stores");
		const leaseId = Symbol("root-store-dependencies");
		this.#storeDependencyLeases.set(leaseId, leasedStores);
		this.#reconcileStoreSubscriptions();
		let released = false;
		return () => {
			if (released) return;
			released = true;
			leasedStores.clear();
			this.#storeDependencyLeases.delete(leaseId);
			this.#reconcileStoreSubscriptions();
		};
	}
	/** Prepare an isolated full-tree candidate without touching host or live caches. */
	prepare(tree, options = {}) {
		return this.#prepareCandidate(tree, options, true, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set());
	}
	/** Prepare tracked root work without requiring callers to provide a full tree. */
	preparePending(options = {}) {
		this.#assertActive();
		this.#assertNoPublicationBarrier("prepare");
		if (this.#terminalHostFailed) throw new Error("Component root is terminal after a host commit failure");
		const changes = this.#pendingChanges.capture();
		if (changes.length === 0 && this.#pendingCollectionRegionKeys.size === 0 && this.#storeNotificationGeneration === this.#committedStoreNotificationGeneration && (options.transitions?.length ?? 0) === 0) return null;
		return this.#prepareMixedCollectionCandidate(changes, {
			storeGeneration: this.#storeNotificationGeneration,
			transitions: options.transitions ?? []
		}) ?? this.#prepareCandidate(this.#tree, { transitions: options.transitions ?? [] }, true, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set());
	}
	/** Prepare a store-only update to independent, leaf owner host regions. */
	#createCandidateLifecycle(spec) {
		const candidateStores = new Set(spec.stores.stores);
		for (const store of candidateStores) this.#candidateStoreHolds.set(store, (this.#candidateStoreHolds.get(store) ?? 0) + 1);
		let storesReleased = false;
		const releaseStores = () => {
			if (storesReleased) return;
			storesReleased = true;
			this.#releaseCandidateStoreHolds(candidateStores);
		};
		let phase = "prepared";
		let released = false;
		let candidateHandle = null;
		const pendingResources = [...spec.pendingResources];
		const release = (published) => {
			if (released) return;
			released = true;
			try {
				spec.releaseArtifacts(published);
			} finally {
				pendingResources.length = 0;
				candidateStores.clear();
				if (candidateHandle) {
					Object.defineProperty(candidateHandle, "pendingResources", {
						value: Object.freeze([]),
						enumerable: true,
						configurable: true
					});
					candidateHandle.validate = closedCandidateValidate;
					candidateHandle.commitHost = closedCandidateAction;
					candidateHandle.publish = closedCandidateAction;
					candidateHandle.runEffects = closedCandidateAction;
					candidateHandle.discard = closedCandidateNoop;
					candidateHandle.failGroup = closedCandidateNoop;
					candidateHandle.retainStoreDependencies = closedCandidateLease;
				}
			}
		};
		const finishUnpublished = (next) => {
			phase = next;
			try {
				spec.discard();
			} finally {
				releaseStores();
				this.#preparedCandidates.delete(candidate);
				this.#releasePublicationBarrier(candidate);
				release(false);
			}
		};
		const candidate = {
			rootId: this.#rootId,
			baseVersion: spec.baseVersion,
			targetVersion: spec.baseVersion + 1,
			stores: candidateStores,
			transitions: Object.freeze([...spec.transitions]),
			pendingResources: Object.freeze([...pendingResources]),
			blocked: spec.blocked,
			retainStoreDependencies: () => {
				if (this.#disposed || released) return () => {};
				return this.holdStoreDependencies(candidateStores);
			},
			validate: () => phase === "prepared" && !released && !this.#disposed && !this.#terminalHostFailed && this.#publicationVersion === spec.baseVersion && this.#vdom.version === spec.baseVDOMVersion && spec.validatePrepared(),
			commitHost: () => {
				if (phase !== "prepared") throw new Error(`Candidate is ${phase}`);
				this.#assertNoPublicationBarrier("commit another candidate");
				if (!candidate.validate()) {
					finishUnpublished("discarded");
					throw new Error("Native root candidate is stale");
				}
				this.#publicationBarrier = candidate;
				try {
					this.#candidateHostCommit = true;
					spec.commitHost();
					if (phase !== "prepared" || this.#disposed || this.#disposing) throw new Error("Native root candidate was cancelled during host commit");
					phase = "host-committed";
				} catch (error) {
					phase = "failed";
					this.#terminalHostFailure ??= error;
					this.#terminalHostFailed = true;
					try {
						spec.discard();
					} finally {
						releaseStores();
						this.#preparedCandidates.delete(candidate);
						release(false);
						this.#releasePublicationBarrier(candidate);
					}
					throw error;
				} finally {
					this.#candidateHostCommit = false;
				}
			},
			publish: () => {
				if (phase !== "host-committed") throw new Error(`Candidate is ${phase}`);
				if (this.#disposed || this.#publicationVersion !== spec.baseVersion || this.#vdom.version !== spec.baseVDOMVersion + 1 || !spec.validatePostHost()) {
					const error = /* @__PURE__ */ new Error("Native root candidate became stale after host commit");
					phase = "failed";
					this.#terminalHostFailure ??= error;
					this.#terminalHostFailed = true;
					try {
						spec.discard();
					} finally {
						releaseStores();
						this.#preparedCandidates.delete(candidate);
						release(false);
						this.#releasePublicationBarrier(candidate);
					}
					throw error;
				}
				try {
					spec.publish();
					releaseStores();
					phase = "published";
				} catch (error) {
					phase = "failed";
					this.#terminalHostFailure ??= error;
					this.#terminalHostFailed = true;
					try {
						spec.discard();
					} finally {
						releaseStores();
						this.#preparedCandidates.delete(candidate);
						release(false);
						this.#releasePublicationBarrier(candidate);
					}
					throw error;
				}
			},
			runEffects: () => {
				if (phase !== "published") throw new Error(`Candidate is ${phase}`);
				const errors = [];
				try {
					errors.push(...spec.runEffects());
				} catch (error) {
					errors.push(error);
					this.#terminalHostFailure ??= error;
					this.#terminalHostFailed = true;
					phase = "failed";
				} finally {
					if (phase === "published") phase = "finished";
					this.#preparedCandidates.delete(candidate);
					release(true);
					this.#releasePublicationBarrier(candidate);
				}
				if (errors.length) throw new AggregateError(errors, spec.effectFailureMessage);
			},
			discard: () => {
				if (phase === "published" || phase === "finished" || phase === "discarded" || phase === "failed") return;
				if (phase === "host-committed") throw new Error("Cannot discard a candidate after host commit");
				finishUnpublished("discarded");
			},
			failGroup: (error) => {
				const wasPublished = phase === "published" || phase === "finished";
				phase = "failed";
				this.#terminalHostFailure ??= error;
				this.#terminalHostFailed = true;
				try {
					if (!wasPublished) spec.discard();
				} finally {
					if (!wasPublished) releaseStores();
					this.#preparedCandidates.delete(candidate);
					this.#releasePublicationBarrier(candidate);
					release(wasPublished);
				}
			}
		};
		candidateHandle = candidate;
		this.#preparedCandidates.add(candidate);
		return candidate;
	}
	#prepareSparseStoreCandidate(readerOwners, capturedChanges, directOnlyOwners, storeGenerationAtPrepare) {
		if (readerOwners.size === 0 || this.#everReadResource || this.#everHadNativeBoundary || this.#pendingCollectionRegionKeys.size > 0) return null;
		for (const change of capturedChanges) if (!readerOwners.has(change.owner) && !directOnlyOwners.has(change.owner)) return null;
		const readerCaches = /* @__PURE__ */ new Map();
		const readerKeys = /* @__PURE__ */ new Map();
		for (const owner of readerOwners) {
			this.#count("store.sparse.eligibility-owner-visits");
			if (!this.world.isAlive(owner) || !this.#liveOwners.has(owner)) return null;
			this.#count("store.sparse.reader-cache-lookups");
			const cache = this.#componentCache.get(owner);
			if (!cache || cache.nativeBoundary || cache.subtreeOwners.size !== 1) return null;
			if (cache.type[componentMetadata]?.hostLeafOutput !== true) return null;
			if (hasNestedComponent(cache.result, () => this.#count("store.sparse.eligibility-tree-node-visits"))) return null;
			const hostKey = singleHostRootKey(cache.expandedResult, () => this.#count("store.sparse.eligibility-tree-node-visits"));
			if (hostKey === null) return null;
			readerCaches.set(owner, cache);
			readerKeys.set(owner, hostKey);
		}
		const baseVersion = this.#publicationVersion;
		const baseVDOMVersion = this.#vdom.version;
		const candidateChanges = [...capturedChanges];
		const preparation = this.world.beginPreparation();
		const stores = new StoreRenderTransaction(this.#rootId);
		let resourceReads = new ResourceReadSet(this.#resourceTable);
		const cachePatches = /* @__PURE__ */ new Map();
		const ancestorPatches = /* @__PURE__ */ new Map();
		const capturedBindings = [];
		const numericWrites = [];
		const numericSources = /* @__PURE__ */ new Set();
		for (const change of candidateChanges) {
			if (!directOnlyOwners.has(change.owner)) continue;
			if (!this.world.isAlive(change.owner)) continue;
			const source = this.world.scalarSource(change.owner, change.site);
			const previous = source ? this.#lastSourceValues.get(source) : void 0;
			if (!source || previous === void 0 || numericSources.has(source)) continue;
			numericSources.add(source);
			numericWrites.push({
				owner: change.owner,
				site: change.site,
				source,
				version: this.world.version(change.owner, change.site),
				previous,
				current: source.value
			});
		}
		const validateNumericWrites = () => numericWrites.every((write) => this.world.isAlive(write.owner) && this.world.version(write.owner, write.site) === write.version && this.world.scalarSource(write.owner, write.site) === write.source && Object.is(write.source.value, write.current));
		let resourceWasRead = false;
		let preparedHost = null;
		let preparationFailed = false;
		try {
			const regions = [];
			for (const owner of readerOwners) {
				const cached = readerCaches.get(owner);
				this.#count("owner.component-visits");
				const prepared = this.#prepareOwnerRender(owner, {
					preparation,
					stores,
					resourceReads,
					onResourceRead: () => resourceWasRead = true,
					captureBinding: (binding, sources, bindingOwner, sites) => {
						capturedBindings.push({
							binding,
							sources,
							owner: bindingOwner,
							sites
						});
					},
					onOutputNode: () => this.#count("store.sparse.output-tree-node-visits")
				});
				if (!prepared || resourceWasRead) {
					preparationFailed = true;
					break;
				}
				const result = prepared.result;
				if (hasNestedComponent(result, () => this.#count("store.sparse.output-tree-node-visits")) || singleHostRootKey(result, () => this.#count("store.sparse.output-tree-node-visits")) !== readerKeys.get(owner)) {
					preparationFailed = true;
					break;
				}
				cachePatches.set(owner, {
					...cached,
					result,
					expandedResult: result,
					ownEffects: prepared.ownEffects,
					propBoundSites: prepared.propBoundSites
				});
				regions.push({
					key: readerKeys.get(owner),
					tree: result
				});
				this.#count("store.sparse.reader-owner-renders");
				for (const ancestor of this.world.ownerLineage(owner).slice(1)) {
					this.#count("store.sparse.ancestor-owner-visits");
					if (ancestorPatches.has(ancestor)) continue;
					const ancestorCache = this.#componentCache.get(ancestor);
					if (!ancestorCache || ancestorCache.invalidatedBySparseStore) continue;
					ancestorPatches.set(ancestor, {
						...ancestorCache,
						expandedResult: null,
						invalidatedBySparseStore: true
					});
				}
			}
			if (preparationFailed || resourceWasRead) throw new SparseCandidateIneligible();
			preparedHost = this.#vdom.prepareKeyedRegions(regions);
			if (!preparedHost) throw new SparseCandidateIneligible();
		} catch (error) {
			preparation.discard();
			stores.discard();
			resourceReads?.discard();
			resourceReads = null;
			this.#discardUncommittedStoreRoots(stores);
			preparedHost = null;
			cachePatches.clear();
			ancestorPatches.clear();
			capturedBindings.length = 0;
			numericWrites.length = 0;
			readerCaches.clear();
			readerKeys.clear();
			candidateChanges.length = 0;
			if (resourceWasRead || preparationFailed || error instanceof SparseCandidateIneligible) return null;
			throw error;
		}
		return this.#createCandidateLifecycle({
			baseVersion,
			baseVDOMVersion,
			stores,
			transitions: [],
			pendingResources: [],
			blocked: false,
			validatePrepared: () => this.#storeNotificationGeneration === storeGenerationAtPrepare && preparation.validate() && !preparation.hasStateWrites() && stores.validate() && validateNumericWrites() && (resourceReads?.validate() ?? false),
			validatePostHost: () => preparation.validate() && !preparation.hasStateWrites() && stores.validate() && validateNumericWrites() && this.#storeNotificationGeneration === storeGenerationAtPrepare && (resourceReads?.validate() ?? false),
			commitHost: () => {
				for (const item of capturedBindings) {
					const canonical = item.sites.map((site, index) => this.world.isAlive(item.owner) ? this.world.scalarSource(item.owner, site) ?? item.sources[index] : item.sources[index]);
					const mutable = item.binding.sources;
					if (mutable) for (let index = 0; index < canonical.length; index++) mutable[index] = canonical[index];
					item.binding.source = canonical[0];
				}
				preparedHost.commit();
				preparedHost = null;
				this.#applyCandidateNumericWrites(numericWrites);
			},
			publish: () => {
				preparation.publish();
				stores.commitAfterValidatedRender();
				this.#syncStoreReaders(stores, true);
				for (const [owner, cache] of cachePatches) {
					this.#count("store.sparse.cache-patch-writes");
					this.#componentCache.set(owner, cache);
				}
				for (const owner of cachePatches.keys()) this.#refreshDirectKeyedRegionOutput(owner, true);
				for (const [owner, cache] of ancestorPatches) {
					this.#count("store.sparse.ancestor-marker-writes");
					this.#componentCache.set(owner, cache);
				}
				for (const [owner, cache] of cachePatches) {
					this.#count("store.sparse.source-history-owner-visits");
					const previous = readerCaches.get(owner);
					this.#syncOwnerSourceValues(owner, previous, cache.propBoundSites);
				}
				for (const write of numericWrites) if (this.world.isAlive(write.owner) && this.world.scalarSource(write.owner, write.site) === write.source) {
					if (this.#vdom.hasBoundSource(write.source)) this.#lastSourceValues.set(write.source, write.current);
					else this.#lastSourceValues.delete(write.source);
				}
				resourceReads?.discard();
				resourceReads = null;
				this.#committedStoreNotificationGeneration = storeGenerationAtPrepare;
				this.world.clearChangesThrough(candidateChanges);
				this.#pendingChanges.clearThrough(candidateChanges);
				this.#publicationVersion++;
			},
			runEffects: () => {
				const errors = [];
				for (const [owner, cache] of cachePatches) {
					this.#count("store.sparse.effect-owner-visits");
					errors.push(...this.#reconcileOwnerEffects(owner, cache.ownEffects));
				}
				return errors;
			},
			discard: () => {
				preparation.discard();
				stores.discard();
				resourceReads?.discard();
				resourceReads = null;
			},
			releaseArtifacts: () => {
				resourceReads?.discard();
				resourceReads = null;
				cachePatches.clear();
				ancestorPatches.clear();
				readerCaches.clear();
				readerKeys.clear();
				candidateChanges.length = 0;
				capturedBindings.length = 0;
				numericWrites.length = 0;
				preparedHost = null;
			},
			effectFailureMessage: "Component effects failed after sparse store candidate publication"
		});
	}
	#prepareCandidate(tree, options, forceRender, dirtyOwners, relevantOwners, numericChanges = []) {
		this.#assertActive();
		this.#assertNoPublicationBarrier("prepare");
		if (this.#terminalHostFailed) throw new Error("Component root is terminal after a host commit failure");
		const baseVersion = this.#publicationVersion;
		const baseVDOMVersion = this.#vdom.version;
		const storeGenerationAtPrepare = this.#storeNotificationGeneration;
		const capturedChanges = this.#pendingChanges.capture();
		const numericWrites = [];
		const numericSources = /* @__PURE__ */ new Set();
		for (const change of numericChanges) {
			if (!this.world.isAlive(change.owner)) continue;
			const source = this.world.scalarSource(change.owner, change.site);
			const previous = source ? this.#lastSourceValues.get(source) : void 0;
			if (!source || previous === void 0 || numericSources.has(source)) continue;
			numericSources.add(source);
			numericWrites.push({
				owner: change.owner,
				site: change.site,
				source,
				version: this.world.version(change.owner, change.site),
				previous,
				current: source.value
			});
		}
		const validateNumericWrites = () => numericWrites.every((write) => this.world.isAlive(write.owner) && this.world.version(write.owner, write.site) === write.version && this.world.scalarSource(write.owner, write.site) === write.source && Object.is(write.source.value, write.current));
		const preparation = this.world.beginPreparation();
		const stores = new StoreRenderTransaction(this.#rootId, { transitions: options.transitions });
		let resourceReads = new ResourceReadSet(this.#resourceTable);
		const expansionJournal = void 0;
		const nextBoundaryPrimaries = new Map(this.#boundaryPrimaries);
		const boundaryState = {
			blocked: false,
			visited: /* @__PURE__ */ new Set()
		};
		const nextOwners = /* @__PURE__ */ new Set();
		const nextEffects = /* @__PURE__ */ new Map();
		const nextCache = /* @__PURE__ */ new Map();
		const createdOwners = [];
		const keyedRegions = /* @__PURE__ */ new Map();
		const collectionRegions = /* @__PURE__ */ new Map();
		const capturedBindings = [];
		let expanded;
		let preparedHost = null;
		const priorKeyed = this.#collectedKeyedRegions;
		const priorCollections = this.#collectedCollectionRegions;
		this.#collectedKeyedRegions = keyedRegions;
		this.#collectedCollectionRegions = collectionRegions;
		try {
			expanded = this.#expand(tree, this.#rootOwner, nextOwners, nextEffects, nextCache, createdOwners, "root", forceRender, dirtyOwners, relevantOwners, [], /* @__PURE__ */ new Map(), stores, void 0, void 0, preparation, (binding, sources, owner, sites) => capturedBindings.push({
				binding,
				sources,
				owner,
				sites
			}), resourceReads, expansionJournal, nextBoundaryPrimaries, boundaryState);
			for (const key of nextBoundaryPrimaries.keys()) if (!boundaryState.visited.has(key)) nextBoundaryPrimaries.delete(key);
			preparedHost = this.#vdom.prepareCommit(expanded, null, true);
			expanded = null;
		} catch (error) {
			preparation.discard();
			stores.discard();
			resourceReads?.discard();
			resourceReads = null;
			this.#discardUncommittedStoreRoots(stores);
			throw error;
		} finally {
			this.#collectedKeyedRegions = priorKeyed;
			this.#collectedCollectionRegions = priorCollections;
		}
		const candidatePendingResources = [...resourceReads.pending];
		const ownerIds = new Set(nextOwners);
		const previousOwners = new Set(this.#liveOwners);
		const artifacts = {
			preparation,
			stores,
			preparedHost,
			tree: { value: tree },
			nextCache,
			nextEffects,
			nextOwners,
			ownerIds,
			previousOwners,
			keyedRegions,
			collectionRegions,
			capturedBindings,
			capturedChanges,
			numericWrites
		};
		let artifactsReleased = false;
		const releaseCandidateArtifacts = (published) => {
			if (artifactsReleased) return;
			artifactsReleased = true;
			resourceReads?.discard();
			resourceReads = null;
			candidatePendingResources.length = 0;
			artifacts.preparation = null;
			artifacts.stores = null;
			artifacts.preparedHost = null;
			artifacts.tree = null;
			if (!published) artifacts.nextCache?.clear();
			artifacts.nextCache = null;
			artifacts.nextEffects?.clear();
			artifacts.nextEffects = null;
			artifacts.nextOwners?.clear();
			artifacts.nextOwners = null;
			artifacts.ownerIds?.clear();
			artifacts.ownerIds = null;
			artifacts.previousOwners?.clear();
			artifacts.previousOwners = null;
			artifacts.keyedRegions?.clear();
			artifacts.keyedRegions = null;
			artifacts.collectionRegions?.clear();
			artifacts.collectionRegions = null;
			artifacts.capturedBindings?.splice(0);
			artifacts.capturedBindings = null;
			artifacts.capturedChanges?.splice(0);
			artifacts.capturedChanges = null;
			artifacts.numericWrites?.splice(0);
			artifacts.numericWrites = null;
			if (!published) nextBoundaryPrimaries.clear();
			tree = null;
			expanded = null;
			preparedHost = null;
		};
		const validatesCollections = () => [...artifacts.keyedRegions?.values() ?? []].every((region) => !region.collection || region.collection.collection.version === region.collection.snapshotVersion) && [...artifacts.collectionRegions?.values() ?? []].every((region) => region.collection.version === region.snapshotVersion);
		return this.#createCandidateLifecycle({
			baseVersion,
			baseVDOMVersion,
			stores,
			transitions: options.transitions ?? [],
			pendingResources: candidatePendingResources,
			blocked: boundaryState.blocked,
			validatePrepared: () => artifacts.preparation !== null && artifacts.preparation.validate() && !artifacts.preparation.hasStateWrites() && artifacts.stores !== null && artifacts.stores.validate() && validateNumericWrites() && (resourceReads?.validate() ?? false) && !boundaryState.blocked && validatesCollections(),
			validatePostHost: () => artifacts.preparation !== null && artifacts.preparation.validate() && !artifacts.preparation.hasStateWrites() && artifacts.stores !== null && artifacts.stores.validate() && validateNumericWrites() && (resourceReads?.validate() ?? false) && !boundaryState.blocked && validatesCollections(),
			commitHost: () => {
				for (const item of artifacts.capturedBindings ?? []) {
					const canonical = item.sites.map((site, index) => this.world.isAlive(item.owner) ? this.world.scalarSource(item.owner, site) ?? item.sources[index] : item.sources[index]);
					const mutable = item.binding.sources;
					if (mutable) for (let index = 0; index < canonical.length; index++) mutable[index] = canonical[index];
					item.binding.source = canonical[0];
				}
				artifacts.preparedHost.commit();
				artifacts.preparedHost = null;
				this.#applyCandidateNumericWrites(artifacts.numericWrites ?? []);
			},
			publish: () => {
				artifacts.preparation.publish();
				artifacts.stores.commitAfterValidatedRender();
				this.#tree = artifacts.tree.value;
				this.#liveOwners = new Set(artifacts.ownerIds);
				this.#componentCache = artifacts.nextCache;
				this.#syncStoreReaders(artifacts.stores);
				this.#boundaryPrimaries = nextBoundaryPrimaries;
				if (options.autoRetryResources !== false) this.#syncResourceSubscriptions(candidatePendingResources);
				resourceReads?.discard();
				resourceReads = null;
				this.#syncCollectionRegions(artifacts.nextCache, artifacts.collectionRegions);
				this.#syncLastSourceValues(artifacts.nextCache);
				if (this.#storeNotificationGeneration === storeGenerationAtPrepare) this.#committedStoreNotificationGeneration = storeGenerationAtPrepare;
				this.world.clearChangesThrough(capturedChanges);
				this.#pendingChanges.clearThrough(capturedChanges);
				this.#publicationVersion++;
			},
			runEffects: () => {
				if (this.#disposed) return [];
				const errors = [];
				errors.push(...this.#reconcileEffects(artifacts.nextEffects));
				for (const previous of artifacts.previousOwners ?? []) {
					if (artifacts.ownerIds?.has(previous)) continue;
					this.world.destroyOwner(previous);
					this.#dropPendingForOwner(previous);
				}
				return errors;
			},
			discard: () => {
				artifacts.preparation?.discard();
				artifacts.stores?.discard();
				resourceReads?.discard();
				resourceReads = null;
			},
			releaseArtifacts: releaseCandidateArtifacts,
			effectFailureMessage: "Component effects failed after candidate publication"
		});
	}
	/** Stable identifier used when coordinating transitions across native roots. */
	get rootId() {
		return this.#rootId;
	}
	onDispose(listener) {
		if (typeof listener !== "function") throw new Error("Dispose listener must be a function");
		if (this.#disposed) {
			listener();
			return () => {};
		}
		this.#disposeListeners.add(listener);
		return () => this.#disposeListeners.delete(listener);
	}
	get snapshot() {
		return this.#vdom.snapshot;
	}
	get partialCommitCount() {
		return this.#vdom.partialCommitCount;
	}
	get partialCommitBatchCount() {
		return this.#vdom.partialCommitBatchCount;
	}
	diagnostics() {
		return {
			version: this.version,
			ownerCount: this.#liveOwners.size,
			pendingChangeCount: this.#pendingChanges.size,
			sourceValueSyncVisits: this.#sourceValueSyncVisits,
			disposed: this.#disposed
		};
	}
	mount(tree) {
		this.#assertActive();
		this.#assertNoPublicationBarrier("mount");
		if (this.version !== 0) throw new Error("ComponentStateRoot is already mounted");
		this.#renderAndCommit(tree, true);
	}
	/** Commit one batched owner/site update; return false when there is no work. */
	flush() {
		this.#assertActive();
		enterStructuralFlush(this);
		try {
			if (this.#nativeCellCutActive) {
				this.#scheduled = false;
				this.#deferredFlush = true;
				return false;
			}
			if (this.#publicationBarrier) {
				this.#deferredFlush = true;
				this.#scheduled = false;
				return false;
			}
			const flushStarted = this.#profile ? performance.now() : 0;
			const reportFlush = () => {
				if (this.#activeCounters) {
					this.#profileCounter?.(Object.fromEntries(this.#activeCounters));
					this.#activeCounters = void 0;
				}
				if (this.#profile) this.#profile("root.flush", performance.now() - flushStarted);
			};
			this.#scheduled = false;
			const resourceRetry = this.#pendingResourceRetry;
			this.#pendingResourceRetry = false;
			const storeGeneration = this.#storeNotificationGeneration;
			const storeChangePending = storeGeneration !== this.#committedStoreNotificationGeneration;
			if (this.#pendingChanges.size === 0 && !storeChangePending && this.#pendingCollectionRegionKeys.size === 0 && !resourceRetry) {
				structuralRoute("no-commit");
				return false;
			}
			if (resourceRetry && this.#pendingChanges.size === 0 && !storeChangePending && this.#pendingCollectionRegionKeys.size === 0) {
				structuralRoute("full-reconcile");
				this.#renderAndCommit(this.#tree, true);
				reportFlush();
				return true;
			}
			this.#activeCounters = this.#profileCounter ? /* @__PURE__ */ new Map() : void 0;
			if (!resourceRetry && !storeChangePending && this.#pendingCollectionRegionKeys.size === 0 && this.#pendingChanges.size > 0 && this.#tryFlushNativeCellCut()) {
				structuralRoute("numeric");
				reportFlush();
				return true;
			}
			const capturedChanges = this.#pendingChanges.capture();
			if (resourceRetry) {
				structuralRoute("full-reconcile");
				this.#renderAndCommit(this.#tree, true);
				this.#finishChanges(capturedChanges);
				reportFlush();
				return true;
			}
			if (this.#pendingCollectionRegionKeys.size > 0 && (capturedChanges.length > 0 || storeChangePending)) {
				const mixed = this.#prepareMixedCollectionCandidate(capturedChanges, {
					storeGeneration,
					transitions: []
				});
				if (mixed) {
					if (mixed.validate()) {
						structuralRoute("mixed");
						mixed.commitHost();
						mixed.publish();
						mixed.runEffects();
						reportFlush();
						return true;
					}
					mixed.discard();
					structuralBail("mixed-candidate-stale");
					this.#count("collection.mixed.stale-fallbacks");
				}
			}
			if (capturedChanges.length === 0 && !storeChangePending && this.#pendingCollectionRegionKeys.size > 0) {
				if (this.#flushCollectionDelta()) {
					structuralRoute("collection-delta");
					reportFlush();
					return true;
				}
				this.#profile?.("collection.delta.fallback-candidate", 0);
				structuralBail("collection-delta-declined");
			}
			if (capturedChanges.length === 0 && !storeChangePending && this.#pendingCollectionRegionKeys.size === 0) return false;
			const dirtyOwners = new Set(capturedChanges.map((change) => change.owner));
			if (this.#invalidation) {
				const graphMappedOwners = [];
				for (const change of capturedChanges) {
					const sourceSlot = this.#invalidation.sourceSlots.get(change.site);
					if (sourceSlot === void 0) continue;
					this.#invalidation.dispatcher.invalidateSourceSlot(sourceSlot);
					graphMappedOwners.push(change.owner);
				}
				const affectedComponentSites = /* @__PURE__ */ new Set();
				this.#invalidation.dispatcher.flush((region) => affectedComponentSites.add(this.#invalidation.componentSites[region]));
				for (const owner of graphMappedOwners) {
					const cache = this.#componentCache.get(owner);
					if (cache && !affectedComponentSites.has(getComponentSiteId(cache.type))) dirtyOwners.delete(owner);
				}
			}
			const directOnlyOwners = /* @__PURE__ */ new Set();
			const ownerEligibility = /* @__PURE__ */ new Map();
			for (const change of capturedChanges) {
				const cache = this.#componentCache.get(change.owner);
				const approvedSites = cache ? this.#compiledPropSitesForCache(cache) : void 0;
				const source = this.world.scalarSourceForChange(change);
				const approved = !!cache && !!approvedSites?.has(change.site) && !!source && this.#lastSourceValues.has(source);
				ownerEligibility.set(change.owner, (ownerEligibility.get(change.owner) ?? true) && approved);
			}
			for (const [owner, eligible] of ownerEligibility) if (eligible) {
				directOnlyOwners.add(owner);
				dirtyOwners.add(owner);
			}
			const initialDirtyOwnerIds = [...dirtyOwners];
			this.#profile?.(`dispatch.diagnostic.dirty-owner-count.${initialDirtyOwnerIds.length}`, 0);
			this.#profile?.(`dispatch.diagnostic.change-count.${capturedChanges.length}`, 0);
			if (initialDirtyOwnerIds.length !== 1) this.#profile?.("dispatch.structural-gate.owner-count-not-one", 0);
			else if (capturedChanges.length !== 1) this.#profile?.("dispatch.structural-gate.change-count-not-one", 0);
			const numericOnly = capturedChanges.length > 0 && directOnlyOwners.size === dirtyOwners.size;
			let succeeded = false;
			if (numericOnly && !storeChangePending && this.#pendingCollectionRegionKeys.size === 0) succeeded = this.#flushNumericSources(capturedChanges);
			if (succeeded) {
				structuralRoute("numeric");
				this.#finishChanges(capturedChanges);
				reportFlush();
				return true;
			}
			const storeReaderOwners = /* @__PURE__ */ new Set();
			let hasSuspendedStoreReader = false;
			let missingStoreReaderOwner = false;
			for (const readerId of this.#liveStoreReaders.keys()) {
				this.#count("store.sparse.live-reader-selection-visits");
				if (readerId.startsWith("\0suspense-pending:")) {
					hasSuspendedStoreReader = true;
					continue;
				}
				const separator = readerId.indexOf("\0");
				if (separator <= 0) {
					hasSuspendedStoreReader = true;
					continue;
				}
				const owner = Number(readerId.slice(0, separator));
				if (!Number.isSafeInteger(owner)) {
					hasSuspendedStoreReader = true;
					continue;
				}
				storeReaderOwners.add(owner);
				if (!this.#componentCache.has(owner)) missingStoreReaderOwner = true;
			}
			const collectionParentOwners = /* @__PURE__ */ new Set();
			let missingCollectionParent = false;
			for (const regionKey of this.#pendingCollectionRegionKeys) {
				const region = this.#liveCollectionRegions.get(regionKey);
				if (!region || !this.#componentCache.has(region.parentOwner)) {
					missingCollectionParent = true;
					continue;
				}
				collectionParentOwners.add(region.parentOwner);
				dirtyOwners.add(region.parentOwner);
			}
			for (const owner of storeReaderOwners) dirtyOwners.add(owner);
			this.#count("store.reader-owners-selected", storeReaderOwners.size);
			this.#count("collection.parent-owners-selected", collectionParentOwners.size);
			if (this.#everReadResource || this.#everHadNativeBoundary || hasSuspendedStoreReader || missingCollectionParent || missingStoreReaderOwner) {
				structuralRoute("full-reconcile");
				this.#renderAndCommit(this.#tree, true);
				this.#finishChanges(capturedChanges);
				reportFlush();
				return true;
			}
			const sparseChangesAreSafe = capturedChanges.every((change) => storeReaderOwners.has(change.owner) || directOnlyOwners.has(change.owner));
			const sparseReaderStateChange = capturedChanges.some((change) => storeReaderOwners.has(change.owner) && !directOnlyOwners.has(change.owner));
			if ((storeChangePending || sparseReaderStateChange) && sparseChangesAreSafe && this.#pendingCollectionRegionKeys.size === 0) {
				const sparseCandidate = this.#prepareSparseStoreCandidate(storeReaderOwners, capturedChanges, directOnlyOwners, storeGeneration);
				if (sparseCandidate) {
					if (sparseCandidate.validate()) {
						structuralRoute("sparse-store");
						sparseCandidate.commitHost();
						sparseCandidate.publish();
						sparseCandidate.runEffects();
						this.#finishChanges(capturedChanges);
						reportFlush();
						return true;
					}
					sparseCandidate.discard();
					this.#count("store.sparse.stale-fallbacks");
				}
				this.#count("store.sparse.generic-fallbacks");
				if (this.#everReadResource || this.#everHadNativeBoundary) {
					structuralRoute("full-reconcile");
					this.#renderAndCommit(this.#tree, true);
					this.#finishChanges(capturedChanges);
					reportFlush();
					return true;
				}
			}
			const relevantOwners = /* @__PURE__ */ new Set();
			const addRelevantLineage = (owners) => {
				for (const owner of owners) for (const ancestor of this.world.ownerLineage(owner)) relevantOwners.add(ancestor);
			};
			addRelevantLineage(dirtyOwners);
			if (directOnlyOwners.size > 0) {
				for (const owner of directOnlyOwners) if (!storeReaderOwners.has(owner) && !collectionParentOwners.has(owner)) dirtyOwners.delete(owner);
				relevantOwners.clear();
				addRelevantLineage(dirtyOwners);
			}
			const dirtyOwnerIds = [...dirtyOwners];
			const hasSelectiveOwnerCandidate = collectionParentOwners.size > 0 || this.#liveStoreSubscriptions.size > 0 || storeChangePending;
			if (!hasSelectiveOwnerCandidate && dirtyOwnerIds.length === 1 && capturedChanges.length === 1 ? this.#tryPartialOwnerCommit(dirtyOwnerIds[0]) : !hasSelectiveOwnerCandidate && dirtyOwnerIds.length > 0 && directOnlyOwners.size === 0 ? this.#tryPartialOwnerCommits(dirtyOwnerIds) : false) {
				structuralRoute("partial-owner");
				this.#profile?.("dispatch.path.partial-owner", 0);
				this.#finishChanges(capturedChanges);
				reportFlush();
				return true;
			}
			if (!hasSelectiveOwnerCandidate && dirtyOwnerIds.length === 1 && capturedChanges.length === 1 && directOnlyOwners.size === 0 ? this.#tryStructuralOwnerCommit(dirtyOwnerIds[0]) : false) {
				structuralRoute("structural-owner");
				this.#profile?.("dispatch.path.structural-owner", 0);
				this.#finishChanges(capturedChanges);
				reportFlush();
				return true;
			}
			this.#profile?.("dispatch.path.full-reconcile", 0);
			structuralRoute("full-reconcile");
			try {
				this.#renderAndCommit(this.#tree, false, dirtyOwners, relevantOwners, 0, directOnlyOwners.size > 0 ? capturedChanges.filter((change) => directOnlyOwners.has(change.owner)) : []);
				succeeded = true;
			} finally {
				this.#preparedRenders.clear();
			}
			if (succeeded) this.#finishChanges(capturedChanges);
			else this.#schedule();
			reportFlush();
			return true;
		} catch (error) {
			structuralError("root.flush threw");
			throw error;
		} finally {
			leaveStructuralFlush(this);
		}
	}
	/** Replace the declarative tree while preserving component owners by site/key. */
	update(tree) {
		this.#assertActive();
		this.#assertNoPublicationBarrier("update");
		const captured = this.#pendingChanges.capture();
		this.#renderAndCommit(tree, true);
		this.#finishChanges(captured);
	}
	render(tree) {
		this.update(tree);
	}
	dispose() {
		if (this.#disposed) return;
		this.#disposing = true;
		for (const candidate of [...this.#preparedCandidates]) candidate.failGroup(/* @__PURE__ */ new Error("Component root disposed during candidate preparation"));
		this.#disposed = true;
		try {
			this.#disposing = false;
			this.#deferredFlush = false;
			const disposeErrors = [];
			for (const listener of this.#disposeListeners) try {
				listener();
			} catch (error) {
				disposeErrors.push(error);
			}
			this.#disposeListeners.clear();
			this.#unsubscribe();
			this.#scheduled = false;
			this.#pendingChanges.clear();
			this.#lastSourceValues.clear();
			this.#nativeLanePrograms = /* @__PURE__ */ new WeakMap();
			this.#nativeRowPrograms = /* @__PURE__ */ new WeakMap();
			if (!this.#nativeCellCutActive) {
				this.#clearNumericProgramBuffers();
				this.#numericProgramSources.length = 0;
				this.#numericProgramCurrentValues.length = 0;
				this.#numericProgramPreviousValues.length = 0;
			}
			if (!this.#nativeCellCutActive) {
				this.#clearNativeRowBuffers();
				this.#clearNativeCellCutBuffers();
				this.#nativeCellHandles.length = 0;
				this.#nativeCellVersions.length = 0;
				this.#nativeLaneTokens.length = 0;
			}
			try {
				this.#vdom.dispose();
			} catch (error) {
				disposeErrors.push(error);
			}
			const subscribedStores = [...this.#liveStoreSubscriptions.keys()];
			for (const unsubscribe of this.#liveStoreSubscriptions.values()) unsubscribe();
			this.#liveStoreSubscriptions.clear();
			for (const stores of this.#storeDependencyLeases.values()) stores.clear();
			this.#storeDependencyLeases.clear();
			for (const unsubscribe of this.#liveResourceSubscriptions.values()) unsubscribe();
			this.#liveResourceSubscriptions.clear();
			this.#boundaryPrimaries.clear();
			for (const [readerId, stores] of this.#liveStoreReaders) for (const store of stores) store.forgetReader(this.#rootId, readerId);
			this.#liveStoreReaders.clear();
			for (const store of subscribedStores) store.detachRoot(this.#rootId);
			const effectErrors = [...disposeErrors, ...this.#cleanupEffects(this.#liveEffects.values())];
			this.#liveEffects.clear();
			this.#liveEffectKeysByOwner.clear();
			for (const owner of this.#liveOwners) this.world.destroyOwner(owner);
			this.#liveOwners.clear();
			this.#componentCache.clear();
			for (const region of this.#liveCollectionRegions.values()) {
				region.unsubscribe?.();
				region.reader?.detach();
			}
			this.#liveCollectionRegions.clear();
			this.#pendingCollectionRegionKeys.clear();
			this.#collectionSnapshotFallbackKeys.clear();
			this.world.destroyOwner(this.#rootOwner);
			this.world.releaseRootId(this.#rootId, this.#rootOwner);
			if (effectErrors.length) throw new AggregateError(effectErrors, "Component effect cleanup failed during dispose");
		} finally {
			unregisterStructuralRoot(this);
		}
	}
	#renderAndCommit(tree, forceRender, dirtyOwners = /* @__PURE__ */ new Set(), relevantOwners = /* @__PURE__ */ new Set(), collectionRetry = 0, numericChanges = []) {
		try {
			const candidate = this.#prepareCandidate(tree, {}, forceRender, dirtyOwners, relevantOwners, numericChanges);
			if (candidate.blocked) {
				const pending = [...candidate.pendingResources];
				this.#syncResourceSubscriptions(pending);
				candidate.discard();
				return;
			}
			if (!candidate.validate()) {
				candidate.discard();
				if (collectionRetry < 2) return this.#renderAndCommit(tree, forceRender, dirtyOwners, relevantOwners, collectionRetry + 1, numericChanges);
				this.#schedule();
				return;
			}
			candidate.commitHost();
			candidate.publish();
			candidate.runEffects();
		} catch (error) {
			if (error instanceof StaleCollectionCandidate && collectionRetry < 2) return this.#renderAndCommit(tree, forceRender, dirtyOwners, relevantOwners, collectionRetry + 1, numericChanges);
			throw error;
		}
	}
	#preparePartialOwnerRender(owner) {
		return this.#prepareOwnerRender(owner);
	}
	#prepareOwnerRender(owner, options = {}) {
		const cached = this.#componentCache.get(owner);
		if (!cached) return null;
		const ownEffects = /* @__PURE__ */ new Map();
		const propBoundSites = /* @__PURE__ */ new Set();
		const ownsStoreTransaction = options.stores === void 0;
		const storeTransaction = options.stores ?? new StoreRenderTransaction(this.#rootId);
		let result;
		const activeOwner = {
			world: options.preparation ?? this.world,
			owner,
			stateLayout: compiledStateLayoutFor(cached.type),
			propBoundSites,
			readStore: (siteId, source) => storeTransaction.read(source, `${owner}\u0000${siteId}`),
			...options.resourceReads ? { readResource: (source) => {
				options.onResourceRead?.();
				this.#everReadResource = true;
				return options.resourceReads.read(source);
			} } : {},
			...options.captureBinding ? { captureBinding: options.captureBinding } : {},
			registerEffect: (siteId, setup) => {
				if (!siteId || typeof setup !== "function") throw new Error("Invalid effect registration");
				const key = effectKey(owner, siteId);
				if (ownEffects.has(key)) throw new Error(`Effect site ${siteId} was registered more than once for owner ${owner}`);
				ownEffects.set(key, {
					owner,
					siteId,
					setup
				});
			}
		};
		activeOwners.push(activeOwner);
		const renderStarted = this.#profile ? performance.now() : 0;
		if (this.#activeCounters) this.#count("owner.component-renders");
		try {
			result = cached.type(cached.props);
		} catch (error) {
			if (ownsStoreTransaction) {
				storeTransaction.discard();
				this.#discardUncommittedStoreRoots(storeTransaction);
			}
			throw error;
		} finally {
			activeOwners.pop();
		}
		if (ownsStoreTransaction && storeTransaction.stores.size > 0) {
			storeTransaction.discard();
			this.#discardUncommittedStoreRoots(storeTransaction);
			return null;
		}
		if (ownsStoreTransaction) storeTransaction.discard();
		result = carryHostKeys(result, cached.hostKeyScope, "0", options.onOutputNode);
		if (this.#profile) this.#profile("owner.render-and-key", performance.now() - renderStarted);
		return {
			owner,
			result,
			ownEffects,
			propBoundSites
		};
	}
	#commitPartialOwnerRender(prepared) {
		const cached = this.#componentCache.get(prepared.owner);
		this.#componentCache.set(prepared.owner, {
			...cached,
			result: prepared.result,
			expandedResult: prepared.result,
			subtreeOwners: /* @__PURE__ */ new Set([prepared.owner]),
			ownEffects: prepared.ownEffects,
			propBoundSites: prepared.propBoundSites
		});
		this.#syncOwnerSourceValues(prepared.owner, cached, prepared.propBoundSites);
		this.#refreshDirectKeyedRegionOutput(prepared.owner);
		const effectErrors = this.#reconcileOwnerEffects(prepared.owner, prepared.ownEffects);
		if (effectErrors.length) throw new AggregateError(effectErrors, "Component effect setup or cleanup failed after partial commit");
	}
	#tryPartialOwnerCommit(owner) {
		const cached = this.#componentCache.get(owner);
		if (!cached || cached.subtreeOwners.size !== 1) return false;
		const oldKey = singleHostRootKey(cached.expandedResult);
		if (oldKey === null) return false;
		const prepared = this.#preparePartialOwnerRender(owner);
		if (!prepared) return false;
		const nextKey = singleHostRootKey(prepared.result);
		if (!hasNestedComponent(prepared.result) && nextKey === oldKey && this.#commitHostMutation(() => this.#vdom.commitKeyedRegion(oldKey, prepared.result))) {
			this.#commitPartialOwnerRender(prepared);
			return true;
		}
		this.#preparedRenders.set(owner, prepared);
		return false;
	}
	/**
	* Re-expand one stateful owner subtree when its keyed host root is stable.
	* Unaffected owners and effects are carried forward; keyed children inside
	* the region are reconciled by the VDOM without rerunning unchanged rows.
	*/
	#tryStructuralOwnerCommit(owner) {
		const cached = this.#componentCache.get(owner);
		if (!cached) {
			this.#profile?.("dispatch.structural-bail.cache-missing", 0);
			return false;
		}
		if (cached.subtreeOwners.size <= 1) {
			this.#profile?.("dispatch.structural-bail.no-nested-owners", 0);
			return false;
		}
		const oldKey = singleHostRootKey(cached.expandedResult);
		if (oldKey === null) {
			this.#profile?.("dispatch.structural-bail.old-root-unkeyed", 0);
			return false;
		}
		const prepared = this.#preparePartialOwnerRender(owner);
		if (!prepared) {
			this.#profile?.("dispatch.structural-bail.render-unavailable", 0);
			return false;
		}
		if (singleHostRootKey(prepared.result) !== oldKey) {
			this.#profile?.("dispatch.structural-bail.root-key-changed", 0);
			this.#preparedRenders.set(owner, prepared);
			return false;
		}
		if (this.#keyedOwnerReuse) {
			const expandStarted = this.#profile ? performance.now() : 0;
			const expandedResult = this.#expandStableKeyedOwnerResult(prepared.result, owner, cached);
			if (this.#profile) this.#profile("owner.expand-and-cache", performance.now() - expandStarted);
			if (expandedResult !== null && this.#commitHostMutation(() => this.#vdom.commitKeyedRegion(oldKey, expandedResult))) {
				this.#componentCache.set(owner, {
					...cached,
					result: prepared.result,
					expandedResult,
					ownEffects: prepared.ownEffects,
					propBoundSites: prepared.propBoundSites
				});
				this.#syncOwnerSourceValues(owner, cached, prepared.propBoundSites);
				const effectErrors = this.#reconcileOwnerEffects(owner, prepared.ownEffects);
				if (effectErrors.length) throw new AggregateError(effectErrors, "Component effects failed after keyed-owner reuse commit");
				this.#profile?.("dispatch.path.keyed-owner-reuse", 0);
				return true;
			}
		}
		const affectedOwners = new Set(cached.subtreeOwners);
		const nextOwners = /* @__PURE__ */ new Set([owner]);
		const nextComponentCache = /* @__PURE__ */ new Map();
		const nextEffects = /* @__PURE__ */ new Map();
		const createdOwners = [];
		const subtreeOwnersByOwner = /* @__PURE__ */ new Map([[owner, /* @__PURE__ */ new Set([owner])]]);
		const expandStarted = this.#profile ? performance.now() : 0;
		this.#collectedKeyedRegions = /* @__PURE__ */ new Map();
		this.#collectedCollectionRegions = /* @__PURE__ */ new Map();
		let structuralStoreRead = false;
		const structuralStoreTransaction = new StoreRenderTransaction(this.#rootId);
		const expandedResult = (() => {
			try {
				for (const [key, effect] of prepared.ownEffects) nextEffects.set(key, effect);
				const expanded = this.#expand(prepared.result, owner, nextOwners, nextEffects, nextComponentCache, createdOwners, `structural/${getComponentSiteId(cached.type)}`, false, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set(), [owner], subtreeOwnersByOwner, structuralStoreTransaction);
				if (structuralStoreTransaction.stores.size > 0) {
					structuralStoreRead = true;
					structuralStoreTransaction.discard();
					this.#discardUncommittedStoreRoots(structuralStoreTransaction);
					return null;
				}
				return expanded;
			} catch (error) {
				structuralStoreTransaction.discard();
				this.#discardUncommittedStoreRoots(structuralStoreTransaction);
				this.#collectedKeyedRegions = null;
				this.#collectedCollectionRegions = null;
				for (let index = createdOwners.length - 1; index >= 0; index--) {
					const owner = createdOwners[index];
					this.world.destroyOwner(owner);
					this.#dropPendingForOwner(owner);
				}
				throw error;
			}
		})();
		const structuralKeyedRegions = this.#collectedKeyedRegions;
		const structuralCollectionRegions = this.#collectedCollectionRegions;
		this.#collectedKeyedRegions = null;
		this.#collectedCollectionRegions = null;
		if (this.#profile) this.#profile("owner.expand-and-cache", performance.now() - expandStarted);
		if (structuralStoreRead) {
			for (let index = createdOwners.length - 1; index >= 0; index--) {
				const candidateOwner = createdOwners[index];
				this.world.destroyOwner(candidateOwner);
				this.#dropPendingForOwner(candidateOwner);
			}
			return false;
		}
		const ownSubtreeOwners = subtreeOwnersByOwner.get(owner) ?? /* @__PURE__ */ new Set([owner]);
		nextComponentCache.set(owner, {
			...cached,
			result: prepared.result,
			expandedResult,
			subtreeOwners: ownSubtreeOwners,
			ownEffects: prepared.ownEffects,
			propBoundSites: prepared.propBoundSites,
			...structuralKeyedRegions?.get(owner) ? { keyedRegion: structuralKeyedRegions.get(owner) } : {}
		});
		let structurallyCommitted;
		try {
			structurallyCommitted = this.#commitHostMutation(() => this.#vdom.commitKeyedRegion(oldKey, expandedResult));
		} catch (error) {
			for (let index = createdOwners.length - 1; index >= 0; index--) {
				const candidateOwner = createdOwners[index];
				this.world.destroyOwner(candidateOwner);
				this.#dropPendingForOwner(candidateOwner);
			}
			throw error;
		}
		if (!structurallyCommitted) {
			this.#profile?.("dispatch.structural-bail.keyed-region-rejected", 0);
			for (const candidateOwner of ownSubtreeOwners) {
				const candidate = nextComponentCache.get(candidateOwner);
				if (candidate) this.#preparedRenders.set(candidateOwner, {
					owner: candidateOwner,
					result: candidate.result,
					ownEffects: candidate.ownEffects,
					propBoundSites: candidate.propBoundSites
				});
			}
			return false;
		}
		const effectErrors = [];
		for (const previousOwner of affectedOwners) {
			if (nextOwners.has(previousOwner)) continue;
			if (this.#activeCounters) this.#count("owner.retired");
			this.#componentCache.delete(previousOwner);
			this.#liveOwners.delete(previousOwner);
			effectErrors.push(...this.#reconcileOwnerEffects(previousOwner, /* @__PURE__ */ new Map()));
			this.world.destroyOwner(previousOwner);
			this.#dropPendingForOwner(previousOwner);
		}
		for (const [nextOwner, component] of nextComponentCache) {
			this.#componentCache.set(nextOwner, component);
			this.#liveOwners.add(nextOwner);
			effectErrors.push(...this.#reconcileOwnerEffects(nextOwner, component.ownEffects));
		}
		this.#syncCollectionRegions(this.#componentCache, structuralCollectionRegions ?? /* @__PURE__ */ new Map());
		this.#syncLastSourceValues(this.#componentCache);
		if (effectErrors.length) throw new AggregateError(effectErrors, "Component effect setup or cleanup failed after structural commit");
		return true;
	}
	#expandStableKeyedOwnerResult(node, parentOwner, previousOwnerCache) {
		let regionCount = 0;
		let reusedRows = 0;
		const visit = (value) => {
			if (value == null || value === false || typeof value === "string" || typeof value === "number") return value;
			if (Array.isArray(value)) {
				const regionId = getKeyedOwnerRegionId(value);
				if (regionId !== null) {
					regionCount++;
					if (this.#keyedOwnerReuseMode === "token") {
						const version = getKeyedOwnerVersion(value);
						const keyedRegion = previousOwnerCache.keyedRegion;
						if (regionCount !== 1 || version === null || !keyedRegion || keyedRegion.regionId !== regionId || keyedRegion.version !== version || keyedRegion.outputsByKey.size !== value.length || previousOwnerCache.subtreeOwners.size !== value.length + 1) {
							if (this.#activeCounters) this.#count("owner.keyed-region.token-mismatches");
							return null;
						}
						const output = [];
						for (const child of value) {
							structuralCount("owner.token-output-loop-visits", "iteration", "component_state_runtime.ts:expandStableKeyedOwnerResult");
							const key = String(child.props.key);
							const cachedOutput = keyedRegion.outputsByKey.get(key);
							if (cachedOutput === void 0) return null;
							output.push(cachedOutput);
						}
						if (this.#activeCounters) {
							this.#count("owner.keyed-region.token-hits", value.length);
							this.#count("owner.keyed-region.token-output-reuses", output.length);
						}
						reusedRows += output.length;
						return copyKeyedOwnerMetadata(value, output);
					}
					if (regionCount !== 1 || value.length === 0 || previousOwnerCache.subtreeOwners.size !== value.length + 1) return null;
					const output = [];
					const seenKeys = /* @__PURE__ */ new Set();
					let componentSiteId = null;
					for (const child of value) {
						structuralCount("owner.checked-output-loop-visits", "iteration", "component_state_runtime.ts:expandStableKeyedOwnerResult");
						if (child == null || child === false || Array.isArray(child) || typeof child !== "object" || typeof child.type !== "function") return null;
						const siteId = getComponentSiteId(child.type);
						if (siteId !== regionId || componentSiteId && siteId !== componentSiteId) return null;
						componentSiteId = siteId;
						const rawKey = child.props.key;
						if (rawKey == null) return null;
						const key = String(rawKey);
						if (seenKeys.has(key)) return null;
						seenKeys.add(key);
						const childOwner = this.world.findOwner(parentOwner, siteId, key);
						if (childOwner === void 0 || !this.#liveOwners.has(childOwner)) return null;
						const childCache = this.#componentCache.get(childOwner);
						if (!childCache || childCache.type !== child.type || childCache.subtreeOwners.size !== 1) return null;
						const { key: _key, ref: _ref, ...props } = child.props;
						if (!shallowEqual(childCache.props, props)) return null;
						output.push(childCache.expandedResult);
						reusedRows++;
					}
					if (this.#activeCounters) {
						this.#count("owner.keyed-region.visits", value.length);
						this.#count("owner.keyed-region.eligibility-visits", value.length);
						this.#count("owner.keyed-region.cache-hits", reusedRows);
					}
					return output;
				}
				const output = [];
				let changed = false;
				for (const child of value) {
					const expanded = visit(child);
					if (expanded === null) return null;
					output.push(expanded);
					if (expanded !== child) changed = true;
				}
				return changed ? output : value;
			}
			if (typeof value.type === "function") return null;
			const child = visit(value.props.children);
			if (child === null) return null;
			return child === value.props.children ? value : {
				...value,
				props: {
					...value.props,
					children: child
				}
			};
		};
		const result = visit(node);
		if (result === null || regionCount !== 1 || reusedRows === 0) {
			this.#count("owner.keyed-region.fallback");
			return null;
		}
		return result;
	}
	#tryPartialOwnerCommits(owners) {
		const keys = /* @__PURE__ */ new Map();
		const seenKeys = /* @__PURE__ */ new Set();
		for (const owner of owners) {
			const cached = this.#componentCache.get(owner);
			if (!cached) {
				this.#profile?.("dispatch.partial-bail.cache-missing", 0);
				return false;
			}
			if (cached.subtreeOwners.size !== 1) {
				this.#profile?.("dispatch.partial-bail.owner-has-nested-subtree", 0);
				return false;
			}
			const key = singleHostRootKey(cached.expandedResult);
			if (key === null) {
				this.#profile?.("dispatch.partial-bail.old-root-unkeyed", 0);
				return false;
			}
			if (seenKeys.has(key)) {
				this.#profile?.("dispatch.partial-bail.duplicate-region-key", 0);
				return false;
			}
			seenKeys.add(key);
			keys.set(owner, key);
		}
		const prepared = owners.map((owner) => this.#preparePartialOwnerRender(owner));
		if (prepared.some((item) => item === null)) {
			this.#profile?.("dispatch.partial-bail.render-unavailable", 0);
			return false;
		}
		const ready = prepared;
		for (const item of ready) if (hasNestedComponent(item.result) || singleHostRootKey(item.result) !== keys.get(item.owner)) {
			for (const candidate of ready) this.#preparedRenders.set(candidate.owner, candidate);
			this.#profile?.("dispatch.partial-bail.changed-root-or-nested-owner", 0);
			return false;
		}
		const regions = ready.map((item) => ({
			key: keys.get(item.owner),
			tree: item.result
		}));
		if (!this.#commitHostMutation(() => this.#vdom.commitKeyedRegions(regions))) {
			this.#profile?.("dispatch.partial-bail.keyed-regions-rejected", 0);
			for (const item of ready) this.#preparedRenders.set(item.owner, item);
			return false;
		}
		const effectErrors = [];
		for (const item of ready) {
			const cached = this.#componentCache.get(item.owner);
			this.#componentCache.set(item.owner, {
				...cached,
				result: item.result,
				expandedResult: item.result,
				subtreeOwners: /* @__PURE__ */ new Set([item.owner]),
				ownEffects: item.ownEffects,
				propBoundSites: item.propBoundSites
			});
			this.#syncOwnerSourceValues(item.owner, cached, item.propBoundSites);
			this.#refreshDirectKeyedRegionOutput(item.owner);
			effectErrors.push(...this.#reconcileOwnerEffects(item.owner, item.ownEffects));
			this.#preparedRenders.delete(item.owner);
		}
		if (effectErrors.length) throw new AggregateError(effectErrors, "Component effects failed after multi-region partial commit");
		return true;
	}
	#cleanupEffects(effects) {
		const errors = [];
		for (const effect of effects) {
			if (!effect.cleanup) continue;
			try {
				effect.cleanup();
			} catch (error) {
				errors.push(error);
			}
		}
		return errors;
	}
	#reconcileEffects(nextEffects) {
		const errors = [];
		try {
			this.#vdom.flushRefs();
		} catch (error) {
			errors.push(error);
		}
		if (this.#disposed) return errors;
		const previousEffects = this.#liveEffects;
		const nextLiveEffects = /* @__PURE__ */ new Map();
		const registrationsToStart = [];
		for (const [key, registration] of nextEffects) {
			const previous = previousEffects.get(key);
			if (previous) nextLiveEffects.set(key, previous);
			else registrationsToStart.push([key, registration]);
		}
		const removedEffects = [...previousEffects].filter(([key]) => !nextEffects.has(key)).map(([, effect]) => effect);
		this.#liveEffects = nextLiveEffects;
		this.#rebuildLiveEffectKeysByOwner();
		for (const effect of removedEffects) {
			if (!effect.cleanup) continue;
			try {
				effect.cleanup();
			} catch (error) {
				errors.push(error);
			}
			if (this.#disposed) return errors;
		}
		for (const [key, registration] of registrationsToStart) {
			if (this.#disposed) break;
			let cleanup;
			try {
				cleanup = registration.setup();
			} catch (error) {
				errors.push(error);
				if (this.#disposed) break;
				cleanup = void 0;
			}
			if (this.#disposed) {
				if (typeof cleanup === "function") try {
					cleanup();
				} catch (error) {
					errors.push(error);
				}
				break;
			}
			const effect = {
				owner: registration.owner,
				siteId: registration.siteId,
				cleanup: typeof cleanup === "function" ? cleanup : void 0
			};
			nextLiveEffects.set(key, effect);
			this.#addLiveEffectKey(key, effect);
		}
		return errors;
	}
	#reconcileOwnerEffects(owner, nextEffects) {
		const errors = [];
		try {
			this.#vdom.flushRefs();
		} catch (error) {
			errors.push(error);
		}
		if (this.#disposed) return errors;
		const currentKeys = this.#liveEffectKeysByOwner.get(owner);
		if (currentKeys) {
			const removedEffects = [];
			for (const key of [...currentKeys]) {
				structuralCount("effect.current-key-visits", "iteration", "component_state_runtime.ts:reconcileOwnerEffects");
				if (nextEffects.has(key)) continue;
				const previous = this.#liveEffects.get(key);
				if (previous) removedEffects.push(previous);
				this.#liveEffects.delete(key);
				currentKeys.delete(key);
			}
			for (const effect of removedEffects) {
				if (effect.cleanup) try {
					structuralCount("effect.cleanup-calls", "event", "component_state_runtime.ts:reconcileOwnerEffects");
					effect.cleanup();
				} catch (error) {
					errors.push(error);
				}
				if (this.#disposed) return errors;
			}
		}
		for (const [key, registration] of nextEffects) {
			structuralCount("effect.next-registration-visits", "iteration", "component_state_runtime.ts:reconcileOwnerEffects");
			if (this.#disposed) break;
			if (this.#liveEffects.has(key)) continue;
			let cleanup;
			try {
				structuralCount("effect.setup-calls", "event", "component_state_runtime.ts:reconcileOwnerEffects");
				cleanup = registration.setup();
			} catch (error) {
				errors.push(error);
				if (this.#disposed) break;
				cleanup = void 0;
			}
			if (this.#disposed) {
				if (typeof cleanup === "function") try {
					cleanup();
				} catch (error) {
					errors.push(error);
				}
				break;
			}
			const effect = {
				owner,
				siteId: registration.siteId,
				cleanup: typeof cleanup === "function" ? cleanup : void 0
			};
			this.#liveEffects.set(key, effect);
			this.#addLiveEffectKey(key, effect);
		}
		if (this.#liveEffectKeysByOwner.get(owner)?.size === 0) this.#liveEffectKeysByOwner.delete(owner);
		return errors;
	}
	#rebuildLiveEffectKeysByOwner() {
		this.#liveEffectKeysByOwner.clear();
		for (const [key, effect] of this.#liveEffects) this.#addLiveEffectKey(key, effect);
	}
	#addLiveEffectKey(key, effect) {
		let keys = this.#liveEffectKeysByOwner.get(effect.owner);
		if (!keys) this.#liveEffectKeysByOwner.set(effect.owner, keys = /* @__PURE__ */ new Set());
		keys.add(key);
	}
	#count(name, count = 1) {
		if (!this.#activeCounters || count === 0) return;
		this.#activeCounters.set(name, (this.#activeCounters.get(name) ?? 0) + count);
	}
	#compiledPropSitesForCache(cache) {
		if (cache.propBoundSites.size === 0) return emptyCompiledPropSites;
		const cached = this.#compiledPropSitesByCache.get(cache);
		if (cached) return cached;
		const metadata = cache.type[componentMetadata];
		if (!metadata?.propOnlySites.length) return emptyCompiledPropSites;
		this.#count("numeric.compiled-site-cache-constructions");
		const eligible = /* @__PURE__ */ new Set();
		for (const site of metadata?.propOnlySites ?? []) {
			this.#count("numeric.compiled-site-metadata-inspections");
			if (cache.propBoundSites.has(site)) eligible.add(site);
		}
		this.#compiledPropSitesByCache.set(cache, eligible);
		return eligible;
	}
	#refreshDirectKeyedRegionOutput(owner, sparseStore = false) {
		if (sparseStore) this.#count("store.sparse.keyed-output-edge-visits");
		const parentOwner = this.world.ownerLineage(owner)[1];
		if (parentOwner === void 0) return;
		const keyedRegion = this.#componentCache.get(parentOwner)?.keyedRegion;
		const key = keyedRegion?.keysByOwner.get(owner);
		if (key === void 0 || !keyedRegion) return;
		const childCache = this.#componentCache.get(owner);
		if (childCache) keyedRegion.outputsByKey.set(key, childCache.expandedResult);
	}
	#syncCollectionRegions(caches, collected = /* @__PURE__ */ new Map()) {
		if (this.#disposed) return;
		const next = /* @__PURE__ */ new Map();
		for (const [owner, component] of caches) {
			const region = component.keyedRegion?.collection;
			if (!region) continue;
			const key = `${owner}\u0000${region.siteId}`;
			next.set(key, region);
		}
		for (const [key, region] of collected) next.set(key, region);
		for (const [key, previous] of this.#liveCollectionRegions) {
			const current = next.get(key);
			if (current?.collection === previous.collection) {
				current.reader = previous.reader;
				current.unsubscribe = previous.unsubscribe;
				if (current.reader && current.snapshotVersion === previous.collection.version) {
					current.reader.resetTo(current.snapshotVersion);
					this.#collectionSnapshotFallbackKeys.delete(key);
				}
				if (current.snapshotVersion !== previous.collection.version) this.#pendingCollectionRegionKeys.add(key);
				else this.#pendingCollectionRegionKeys.delete(key);
				continue;
			}
			previous.unsubscribe?.();
			previous.reader?.detach();
			this.#count("collection.reader-detaches");
			this.#pendingCollectionRegionKeys.delete(key);
			this.#collectionSnapshotFallbackKeys.delete(key);
		}
		for (const [key, region] of next) {
			if (region.reader) continue;
			region.reader = region.collection.createReader();
			region.unsubscribe = region.collection.subscribe(() => {
				if (this.#disposed) return;
				this.#pendingCollectionRegionKeys.add(key);
				this.#schedule();
			});
			this.#count("collection.reader-attaches");
			if (region.snapshotVersion !== region.collection.version) this.#pendingCollectionRegionKeys.add(key);
		}
		this.#liveCollectionRegions = next;
	}
	#prepareMixedCollectionCandidate(capturedChanges, options) {
		if (this.#pendingCollectionRegionKeys.size === 0 || this.#everReadResource || this.#everHadNativeBoundary) return null;
		const storeGenerationAtPrepare = options.storeGeneration;
		const baseVersion = this.#publicationVersion;
		const baseVDOMVersion = this.#vdom.version;
		const preparation = this.world.beginPreparation();
		const stores = new StoreRenderTransaction(this.#rootId, { transitions: options.transitions });
		let resourceReads = new ResourceReadSet(this.#resourceTable);
		const stages = /* @__PURE__ */ new Map();
		const rowsByOwner = /* @__PURE__ */ new Map();
		const droppedReaderIds = /* @__PURE__ */ new Set();
		const renderedOwners = /* @__PURE__ */ new Set();
		const retiredOwners = /* @__PURE__ */ new Set();
		const privateOwners = /* @__PURE__ */ new Set();
		const capturedBindings = [];
		const leafCaches = /* @__PURE__ */ new Map();
		const leafPreviousCaches = /* @__PURE__ */ new Map();
		const leafRegions = [];
		const numericWrites = [];
		const numericSources = /* @__PURE__ */ new Set();
		const discardArtifacts = () => {
			try {
				preparation.discard();
			} finally {
				stores.discard();
				resourceReads?.discard();
				resourceReads = null;
				this.#discardUncommittedStoreRoots(stores);
			}
		};
		let preparedProgram = null;
		let preparationFailed = false;
		let resourceWasRead = false;
		try {
			if (this.#storeNotificationGeneration !== storeGenerationAtPrepare) throw new SparseCandidateIneligible();
			const storeChangePending = this.#storeNotificationGeneration !== this.#committedStoreNotificationGeneration;
			const regionKeys = storeChangePending ? new Set(this.#liveCollectionRegions.keys()) : new Set(this.#pendingCollectionRegionKeys);
			for (const regionKey of regionKeys) {
				this.#count("collection.mixed-region-visits");
				if (this.#collectionSnapshotFallbackKeys.has(regionKey)) {
					preparationFailed = true;
					break;
				}
				const region = this.#liveCollectionRegions.get(regionKey);
				const parentCache = region && this.#componentCache.get(region.parentOwner);
				const ownerRegion = parentCache?.keyedRegion;
				if (!region || !region.reader || !parentCache || !ownerRegion || ownerRegion.collection !== region || !region.parentHostKey || region.requiresOwnerRender) {
					preparationFailed = true;
					break;
				}
				const read = region.reader.read();
				if (read.status !== "available") {
					preparationFailed = true;
					break;
				}
				const stage = {
					key: regionKey,
					region,
					ownerRegion,
					read,
					rows: /* @__PURE__ */ new Map(),
					previousRows: /* @__PURE__ */ new Map(),
					operations: []
				};
				stages.set(regionKey, stage);
			}
			if (preparationFailed || stages.size === 0) throw new SparseCandidateIneligible();
			const rowFor = (stage, key) => {
				if (stage.rows.has(key)) return stage.rows.get(key) ?? null;
				const node = stage.region.rows.get(key);
				const componentSiteId = stage.region.componentSiteId ?? (node && typeof node === "object" && !Array.isArray(node) && typeof node.type === "function" ? getComponentSiteId(node.type) : void 0);
				if (!node || !componentSiteId) return null;
				const owner = preparation.findOwner(stage.region.parentOwner, collectionOwnerSite(stage.region.siteId, componentSiteId), key);
				const cache = owner === void 0 ? void 0 : this.#componentCache.get(owner);
				const hostKey = stage.region.hostKeysByCollectionKey.get(key);
				if (owner === void 0 || !cache || !hostKey) return null;
				const row = {
					owner,
					hostKey,
					node,
					cache,
					privateOwner: false
				};
				stage.previousRows.set(key, row);
				rowsByOwner.set(owner, {
					stage,
					key
				});
				return row;
			};
			const prepareRenderedRow = (stage, key, rendered, owner, previous, privateOwner) => {
				if (typeof rendered.type !== "function" || stage.region.componentSiteId !== void 0 && getComponentSiteId(rendered.type) !== stage.region.componentSiteId) return null;
				const authoredKey = rendered.props.key;
				if (authoredKey != null && String(authoredKey) !== key) return null;
				const { key: _key, ref: _ref, ...props } = rendered.props;
				if (previous?.privateOwner && previous.owner === owner) {
					stores.dropReaders([...stores.readers.keys()].filter((id) => id.startsWith(`${owner}\u0000`)));
					for (let index = capturedBindings.length - 1; index >= 0; index--) if (capturedBindings[index].owner === owner) capturedBindings.splice(index, 1);
				}
				const ownEffects = /* @__PURE__ */ new Map();
				const propBoundSites = /* @__PURE__ */ new Set();
				activeOwners.push({
					world: preparation,
					owner,
					stateLayout: compiledStateLayoutFor(rendered.type),
					propBoundSites,
					readStore: (siteId, source) => stores.read(source, `${owner}\u0000${siteId}`),
					readResource: (source) => {
						resourceWasRead = true;
						this.#everReadResource = true;
						return resourceReads.read(source);
					},
					captureBinding: (binding, sources, bindingOwner, sites) => {
						capturedBindings.push({
							binding,
							sources,
							owner: bindingOwner,
							sites
						});
					},
					registerEffect: (siteId, setup) => {
						if (!siteId || typeof setup !== "function") throw new Error("Invalid effect registration");
						const effectId = effectKey(owner, siteId);
						if (ownEffects.has(effectId)) throw new Error(`Effect site ${siteId} was registered twice for owner ${owner}`);
						ownEffects.set(effectId, {
							owner,
							siteId,
							setup
						});
					}
				});
				let result;
				try {
					if (this.#activeCounters) {
						this.#count("owner.component-visits");
						this.#count("owner.component-renders");
					}
					result = rendered.type(props);
				} finally {
					activeOwners.pop();
				}
				if (resourceWasRead) return null;
				result = carryHostKeys(result, key);
				const hostKey = singleHostRootKey(result);
				if (hostKey === null || hasNestedComponent(result)) return null;
				const cache = {
					type: rendered.type,
					hostKeyScope: key,
					props,
					result,
					expandedResult: result,
					subtreeOwners: /* @__PURE__ */ new Set([owner]),
					ownEffects,
					propBoundSites
				};
				const row = {
					owner,
					hostKey,
					node: {
						...rendered,
						props: {
							...rendered.props,
							key
						}
					},
					cache,
					privateOwner
				};
				renderedOwners.add(owner);
				if (privateOwner) privateOwners.add(owner);
				if (previous && previous.owner !== owner) retiredOwners.add(previous.owner);
				rowsByOwner.set(owner, {
					stage,
					key
				});
				return row;
			};
			const appendOperation = (stage, operation) => {
				stage.operations.push(operation);
				return "ok";
			};
			for (const stage of stages.values()) for (const batch of stage.read.batches) {
				if (batch.fromVersion + 1 !== batch.version) throw new SparseCandidateIneligible();
				for (const operation of batch.operations) {
					this.#count("collection.delta-operations");
					if (operation.type === "remove") {
						const previous = rowFor(stage, operation.key);
						if (!previous) throw new SparseCandidateIneligible();
						if (appendOperation(stage, {
							type: "remove",
							key: previous.hostKey
						}) === false) throw new SparseCandidateIneligible();
						stage.rows.set(operation.key, null);
						if (privateOwners.has(previous.owner)) {
							preparation.discardPrivateOwner(previous.owner);
							privateOwners.delete(previous.owner);
							renderedOwners.delete(previous.owner);
							rowsByOwner.delete(previous.owner);
							for (let index = capturedBindings.length - 1; index >= 0; index--) if (capturedBindings[index].owner === previous.owner) capturedBindings.splice(index, 1);
							stores.dropReaders([...stores.readers.keys()].filter((id) => id.startsWith(`${previous.owner}\u0000`)));
						} else retiredOwners.add(previous.owner);
					} else if (operation.type === "move") {
						const row = rowFor(stage, operation.key);
						const anchor = operation.beforeKey === null ? null : rowFor(stage, operation.beforeKey);
						if (!row || operation.beforeKey !== null && !anchor || appendOperation(stage, {
							type: "move",
							key: row.hostKey,
							beforeKey: anchor?.hostKey ?? null
						}) === false) throw new SparseCandidateIneligible();
					} else {
						const previous = rowFor(stage, operation.key);
						const inserting = operation.type === "insert";
						if (inserting && previous || !inserting && !previous) throw new SparseCandidateIneligible();
						const anchor = inserting && operation.beforeKey !== null ? rowFor(stage, operation.beforeKey) : null;
						if (inserting && operation.beforeKey !== null && !anchor) throw new SparseCandidateIneligible();
						const rendered = stage.region.renderRow(operation.value);
						if (!rendered || Array.isArray(rendered) || typeof rendered !== "object" || typeof rendered.type !== "function") throw new SparseCandidateIneligible();
						const componentSiteId = getComponentSiteId(rendered.type);
						const ownerSite = collectionOwnerSite(stage.region.siteId, componentSiteId);
						const existing = preparation.findOwner(stage.region.parentOwner, ownerSite, operation.key);
						const preserveReplacementOwner = operation.type === "replace" && existing !== void 0;
						const owner = existing === void 0 ? preparation.resolveOwner(stage.region.parentOwner, ownerSite, operation.key) : preserveReplacementOwner ? existing : preparation.replaceOwner(stage.region.parentOwner, ownerSite, operation.key);
						const candidate = prepareRenderedRow(stage, operation.key, rendered, owner, previous, owner !== existing);
						if (!candidate || previous && candidate.hostKey !== previous.hostKey) throw new SparseCandidateIneligible();
						if (appendOperation(stage, previous === null ? {
							type: "insert",
							key: candidate.hostKey,
							beforeKey: anchor?.hostKey ?? null,
							tree: candidate.cache.expandedResult
						} : {
							type: "replace",
							key: candidate.hostKey,
							tree: candidate.cache.expandedResult
						}) === false) throw new SparseCandidateIneligible();
						stage.rows.set(operation.key, candidate);
						if (previous) {
							if (previous.owner !== candidate.owner && privateOwners.has(previous.owner)) {
								preparation.discardPrivateOwner(previous.owner);
								privateOwners.delete(previous.owner);
								renderedOwners.delete(previous.owner);
								rowsByOwner.delete(previous.owner);
								for (let index = capturedBindings.length - 1; index >= 0; index--) if (capturedBindings[index].owner === previous.owner) capturedBindings.splice(index, 1);
								stores.dropReaders([...stores.readers.keys()].filter((id) => id.startsWith(`${previous.owner}\u0000`)));
							}
						}
					}
				}
			}
			const affectedReaderIds = new Set(droppedReaderIds);
			const readerOwners = /* @__PURE__ */ new Map();
			for (const readerId of this.#liveStoreReaders.keys()) {
				const split = readerId.indexOf("\0");
				if (split <= 0) throw new SparseCandidateIneligible();
				const owner = Number(readerId.slice(0, split));
				if (!Number.isSafeInteger(owner)) throw new SparseCandidateIneligible();
				const ids = readerOwners.get(owner) ?? [];
				ids.push(readerId);
				readerOwners.set(owner, ids);
			}
			for (const owner of readerOwners.keys()) {
				this.#count("collection.mixed-store-reader-visits");
				for (const stage of stages.values()) {
					const collectionKey = stage.ownerRegion.keysByOwner.get(owner);
					if (collectionKey !== void 0 && stage.region.rows.has(collectionKey)) {
						rowsByOwner.set(owner, {
							stage,
							key: collectionKey
						});
						break;
					}
				}
			}
			for (const [owner, ids] of readerOwners) if (retiredOwners.has(owner)) for (const id of ids) {
				droppedReaderIds.add(id);
				affectedReaderIds.add(id);
			}
			else if (renderedOwners.has(owner)) for (const id of ids) affectedReaderIds.add(id);
			if (storeChangePending) for (const [owner, ids] of readerOwners) {
				if (retiredOwners.has(owner)) continue;
				const rowLocation = rowsByOwner.get(owner);
				if (rowLocation) {
					const stage = rowLocation.stage;
					const row = rowFor(stage, rowLocation.key);
					if (!row) {
						for (const id of ids) droppedReaderIds.add(id);
						continue;
					}
					if (row.owner !== owner) {
						for (const id of ids) {
							droppedReaderIds.add(id);
							affectedReaderIds.add(id);
						}
						continue;
					}
					if (renderedOwners.has(owner)) {
						for (const id of ids) affectedReaderIds.add(id);
						continue;
					}
					const rendered = row.node;
					const prepared = prepareRenderedRow(stage, rowLocation.key, rendered, owner, row, false);
					if (!prepared || !appendOperation(stage, {
						type: "replace",
						key: row.hostKey,
						tree: prepared.cache.expandedResult
					})) throw new SparseCandidateIneligible();
					stage.rows.set(rowLocation.key, prepared);
					for (const id of ids) affectedReaderIds.add(id);
				} else {
					if (!storeChangePending) continue;
					const cache = this.#componentCache.get(owner);
					const metadata = cache && cache.type[componentMetadata];
					if (!cache || cache.nativeBoundary || metadata?.hostLeafOutput !== true || cache.subtreeOwners.size !== 1 || hasNestedComponent(cache.result)) throw new SparseCandidateIneligible();
					const key = singleHostRootKey(cache.expandedResult);
					if (!key) throw new SparseCandidateIneligible();
					this.#count("owner.component-visits");
					const prepared = this.#prepareOwnerRender(owner, {
						preparation,
						stores,
						resourceReads,
						captureBinding: (binding, sources, bindingOwner, sites) => capturedBindings.push({
							binding,
							sources,
							owner: bindingOwner,
							sites
						}),
						onResourceRead: () => resourceWasRead = true
					});
					if (!prepared || resourceWasRead || singleHostRootKey(prepared.result) !== key || hasNestedComponent(prepared.result)) throw new SparseCandidateIneligible();
					leafCaches.set(owner, {
						...cache,
						result: prepared.result,
						expandedResult: prepared.result,
						ownEffects: prepared.ownEffects,
						propBoundSites: prepared.propBoundSites
					});
					leafPreviousCaches.set(owner, cache);
					leafRegions.push({
						key,
						tree: prepared.result
					});
					for (const id of ids) affectedReaderIds.add(id);
				}
			}
			if (droppedReaderIds.size) stores.dropReaders(droppedReaderIds);
			const preserved = /* @__PURE__ */ new Map();
			for (const [readerId, readerStores] of this.#liveStoreReaders) {
				if (affectedReaderIds.has(readerId)) continue;
				preserved.set(readerId, readerStores);
			}
			if (preserved.size) stores.preserveReaders(preserved);
			const touchedOldOwners = /* @__PURE__ */ new Set([...retiredOwners, ...renderedOwners]);
			for (const change of capturedChanges) {
				if (touchedOldOwners.has(change.owner)) continue;
				const cache = this.#componentCache.get(change.owner);
				const source = this.world.scalarSourceForChange(change);
				const approvedSites = cache ? this.#compiledPropSitesForCache(cache) : void 0;
				const previous = source ? this.#lastSourceValues.get(source) : void 0;
				if (!cache || !approvedSites?.has(change.site) || !source || previous === void 0 || !this.#vdom.hasBoundSource(source) || numericSources.has(source)) throw new SparseCandidateIneligible();
				numericSources.add(source);
				numericWrites.push({
					owner: change.owner,
					site: change.site,
					source,
					version: change.version,
					previous,
					current: source.value,
					change
				});
			}
			const validateNumericWrites = () => numericWrites.every((write) => this.world.versionForChange(write.change) === write.version && this.world.scalarSource(write.owner, write.site) === write.source && Object.is(write.source.value, write.current));
			if (resourceWasRead || preparation.hasStateWrites()) throw new SparseCandidateIneligible();
			const deltas = [...stages.values()].filter((stage) => stage.operations.length > 0).map((stage) => ({
				parentKey: stage.region.parentHostKey,
				regionId: stage.region.siteId,
				operations: stage.operations
			}));
			preparedProgram = this.#vdom.prepareKeyedRegionDeltas(deltas, leafRegions);
			if (!preparedProgram) throw new SparseCandidateIneligible();
			const touchedCollections = [...stages.values()];
			const validateCollections = () => touchedCollections.every((stage) => stage.region.collection.version === stage.read.toVersion);
			const artifactsReleased = { value: false };
			const releaseArtifacts = () => {
				if (artifactsReleased.value) return;
				artifactsReleased.value = true;
				preparedProgram?.discard();
				preparedProgram = null;
				resourceReads?.discard();
				resourceReads = null;
				for (const stage of stages.values()) {
					stage.rows.clear();
					stage.previousRows.clear();
					stage.operations.length = 0;
				}
				stages.clear();
				rowsByOwner.clear();
				capturedBindings.length = 0;
				leafCaches.clear();
				leafPreviousCaches.clear();
				leafRegions.length = 0;
				numericWrites.length = 0;
				numericSources.clear();
				privateOwners.clear();
				retiredOwners.clear();
				renderedOwners.clear();
			};
			return this.#createCandidateLifecycle({
				baseVersion,
				baseVDOMVersion,
				stores,
				transitions: options.transitions,
				pendingResources: [],
				blocked: false,
				validatePrepared: () => this.#storeNotificationGeneration === storeGenerationAtPrepare && preparation.validate() && !preparation.hasStateWrites() && stores.validate() && validateNumericWrites() && validateCollections() && (resourceReads?.validate() ?? false) && (preparedProgram?.validate() ?? false),
				validatePostHost: () => preparation.validate() && !preparation.hasStateWrites() && stores.validate() && validateNumericWrites() && this.#storeNotificationGeneration === storeGenerationAtPrepare && validateCollections() && (resourceReads?.validate() ?? false),
				commitHost: () => {
					for (const item of capturedBindings) {
						const canonical = item.sites.map((site, index) => privateOwners.has(item.owner) ? preparation.scalarSource(item.owner, site) ?? item.sources[index] : this.world.scalarSource(item.owner, site) ?? item.sources[index]);
						const mutable = item.binding.sources;
						if (mutable) for (let index = 0; index < canonical.length; index++) mutable[index] = canonical[index];
						item.binding.source = canonical[0];
					}
					preparedProgram.commit();
					preparedProgram = null;
					this.#applyCandidateNumericWrites(numericWrites);
					if (numericWrites.length > 0) {
						this.#count("numeric.candidate-batches");
						this.#count("numeric.candidate-source-updates", numericWrites.length);
					}
				},
				publish: () => {
					preparation.publish();
					stores.commitAfterValidatedRender();
					this.#syncStoreReaders(stores);
					for (const [owner, cache] of leafCaches) this.#componentCache.set(owner, cache);
					for (const stage of stages.values()) {
						for (const [key, candidate] of stage.rows) {
							if (!candidate) {
								stage.region.rows.delete(key);
								stage.region.hostKeysByCollectionKey.delete(key);
								stage.ownerRegion.outputsByKey.delete(key);
								const previous = stage.previousRows.get(key);
								if (previous) stage.ownerRegion.keysByOwner.delete(previous.owner);
								continue;
							}
							stage.region.rows.set(key, candidate.node);
							stage.region.hostKeysByCollectionKey.set(key, candidate.hostKey);
							const previous = stage.previousRows.get(key);
							this.#componentCache.set(candidate.owner, candidate.cache);
							if (!this.#liveOwners.has(candidate.owner)) this.#count("owner.created");
							this.#liveOwners.add(candidate.owner);
							for (const ancestor of this.world.ownerLineage(candidate.owner).slice(1)) {
								const ancestorCache = this.#componentCache.get(ancestor);
								if (ancestorCache?.subtreeOwners instanceof Set && !ancestorCache.subtreeOwners.has(candidate.owner)) {
									ancestorCache.subtreeOwners.add(candidate.owner);
									this.#count("collection.owner-membership-writes");
								}
							}
							stage.ownerRegion.outputsByKey.set(key, candidate.cache.expandedResult);
							stage.ownerRegion.keysByOwner.set(candidate.owner, key);
							if (previous && previous.owner !== candidate.owner) stage.ownerRegion.keysByOwner.delete(previous.owner);
							if (previous && previous.owner === candidate.owner) this.#syncOwnerSourceValues(candidate.owner, previous.cache, candidate.cache.propBoundSites);
							else for (const site of candidate.cache.propBoundSites) {
								const source = this.world.scalarSource(candidate.owner, site);
								if (source) this.#lastSourceValues.set(source, source.value);
							}
						}
						if (stage.region.collection.version === stage.read.toVersion) {
							if (!stage.region.reader?.acknowledge(stage.read.toVersion)) throw new Error("Collection reader lost its validated version after mixed VDOM commit");
							this.#pendingCollectionRegionKeys.delete(stage.key);
						}
						for (const ancestor of this.world.ownerLineage(stage.region.parentOwner)) {
							const cache = this.#componentCache.get(ancestor);
							if (!cache) continue;
							const keyedRegion = cache.keyedRegion ? {
								...cache.keyedRegion,
								version: createKeyedOwnerVersion()
							} : void 0;
							if (keyedRegion?.collection !== stage.region && keyedRegion) {
								keyedRegion.outputsByKey.clear();
								keyedRegion.keysByOwner.clear();
							}
							this.#componentCache.set(ancestor, {
								...cache,
								result: null,
								expandedResult: null,
								invalidatedByCollection: true,
								...keyedRegion ? { keyedRegion } : {}
							});
						}
					}
					for (const [owner, cache] of leafCaches) {
						const previous = leafPreviousCaches.get(owner);
						if (previous) this.#syncOwnerSourceValues(owner, previous, cache.propBoundSites);
						this.#refreshDirectKeyedRegionOutput(owner, true);
					}
					for (const write of numericWrites) this.#lastSourceValues.set(write.source, write.current);
					resourceReads?.discard();
					resourceReads = null;
					this.world.clearChangesThrough(capturedChanges);
					this.#pendingChanges.clearThrough(capturedChanges);
					this.#committedStoreNotificationGeneration = storeGenerationAtPrepare;
					this.#publicationVersion++;
				},
				runEffects: () => {
					const errors = [];
					try {
						this.#vdom.flushRefs();
					} catch (error) {
						errors.push(error);
					}
					for (const owner of retiredOwners) this.#retireCollectionRow(owner, errors);
					for (const [owner, cache] of leafCaches) errors.push(...this.#reconcileOwnerEffects(owner, cache.ownEffects));
					for (const stage of stages.values()) for (const [key, row] of stage.rows) {
						if (!row) continue;
						errors.push(...this.#reconcileOwnerEffects(row.owner, row.cache.ownEffects));
					}
					return errors;
				},
				discard: discardArtifacts,
				releaseArtifacts,
				effectFailureMessage: "Mixed collection candidate effects failed after publication"
			});
		} catch (error) {
			preparedProgram?.discard();
			preparedProgram = null;
			discardArtifacts();
			stages.clear();
			rowsByOwner.clear();
			capturedBindings.length = 0;
			leafCaches.clear();
			leafPreviousCaches.clear();
			leafRegions.length = 0;
			numericWrites.length = 0;
			numericSources.clear();
			privateOwners.clear();
			retiredOwners.clear();
			renderedOwners.clear();
			if (error instanceof SparseCandidateIneligible || preparationFailed || resourceWasRead) return null;
			throw error;
		}
	}
	#flushCollectionDelta() {
		if (this.#pendingCollectionRegionKeys.size !== 1) {
			structuralBail("delta-region-count-not-one");
			return false;
		}
		const regionKey = this.#pendingCollectionRegionKeys.values().next().value;
		if (!regionKey) {
			structuralBail("delta-region-key-missing");
			return false;
		}
		if (this.#collectionSnapshotFallbackKeys.has(regionKey)) {
			structuralBail("delta-snapshot-fallback-required");
			return false;
		}
		const region = this.#liveCollectionRegions.get(regionKey);
		const parentCache = region && this.#componentCache.get(region.parentOwner);
		const ownerRegion = parentCache?.keyedRegion;
		const parentHostKey = region?.parentHostKey ?? null;
		if (!region || !region.reader || !parentCache || !ownerRegion || ownerRegion.collection !== region || parentHostKey === null || region.requiresOwnerRender) {
			structuralBail("delta-region-or-owner-guard");
			return false;
		}
		const read = region.reader.read();
		if (read.status !== "available") {
			structuralBail("delta-reader-expired");
			this.#count("collection.delta.reader-expired");
			return false;
		}
		if (read.batches.length === 0) {
			if (!region.reader.acknowledge(read.toVersion)) {
				structuralBail("delta-empty-reader-ack-declined");
				return false;
			}
			this.#pendingCollectionRegionKeys.delete(regionKey);
			return true;
		}
		const overlay = /* @__PURE__ */ new Map();
		const storeGenerationAtPrepare = this.#storeNotificationGeneration;
		const originalRows = /* @__PURE__ */ new Map();
		const activationPreviousOwners = /* @__PURE__ */ new Map();
		const stagedOwners = [];
		const newlyAllocatedOwners = [];
		const preparedStores = [];
		const operations = [];
		const rowFor = (key) => {
			structuralCount("collection.delta.row-for-calls", "event", "component_state_runtime.ts:rowFor");
			if (overlay.has(key)) return overlay.get(key) ?? null;
			const node = region.rows.get(key);
			const componentSiteId = region.componentSiteId ?? (node && typeof node === "object" && !Array.isArray(node) && typeof node.type === "function" ? getComponentSiteId(node.type) : void 0);
			if (!componentSiteId) return null;
			const owner = this.world.findOwner(region.parentOwner, collectionOwnerSite(region.siteId, componentSiteId), key);
			if (!node || owner === void 0) return null;
			const cache = this.#componentCache.get(owner);
			const hostKey = region.hostKeysByCollectionKey.get(key);
			if (!cache || !hostKey) return null;
			const row = {
				owner,
				hostKey,
				node,
				cache
			};
			originalRows.set(key, row);
			return row;
		};
		const activationPreviousOwner = (key) => {
			if (!activationPreviousOwners.has(key)) {
				const componentSiteId = region.componentSiteId;
				activationPreviousOwners.set(key, componentSiteId ? this.world.findOwner(region.parentOwner, collectionOwnerSite(region.siteId, componentSiteId), key) : void 0);
			}
			return activationPreviousOwners.get(key);
		};
		const prepareRow = (key, value, existingOwner, stagedInsert = false, stagedPreviousOwner) => {
			structuralCount("collection.delta.prepare-row-calls", "event", "component_state_runtime.ts:prepareRow");
			const rendered = region.renderRow(value);
			if (!rendered || Array.isArray(rendered) || typeof rendered !== "object" || typeof rendered.type !== "function" || region.componentSiteId !== void 0 && getComponentSiteId(rendered.type) !== region.componentSiteId) return null;
			const rowComponentSiteId = getComponentSiteId(rendered.type);
			const ownerSiteId = collectionOwnerSite(region.siteId, rowComponentSiteId);
			const authoredKey = rendered.props.key;
			if (authoredKey != null && String(authoredKey) !== key) return null;
			const owner = stagedInsert ? this.world.createStagedOwner(region.parentOwner, ownerSiteId, key) : existingOwner ?? this.world.resolveOwner(region.parentOwner, ownerSiteId, key);
			const staged = stagedInsert || existingOwner !== void 0 && stagedOwners.includes(existingOwner);
			if (staged) stagedOwners.push(owner);
			else if (existingOwner === void 0) newlyAllocatedOwners.push(owner);
			const { key: _key, ref: _ref, ...props } = rendered.props;
			const ownEffects = /* @__PURE__ */ new Map();
			const propBoundSites = /* @__PURE__ */ new Set();
			const storeTransaction = new StoreRenderTransaction(this.#rootId);
			activeOwners.push({
				world: this.world,
				owner,
				stateLayout: compiledStateLayoutFor(rendered.type),
				propBoundSites,
				readStore: (siteId, source) => storeTransaction.read(source, `${owner}\u0000${siteId}`),
				registerEffect: (siteId, setup) => {
					if (!siteId || typeof setup !== "function") throw new Error("Invalid effect registration");
					const effectId = effectKey(owner, siteId);
					if (ownEffects.has(effectId)) throw new Error(`Effect site ${siteId} was registered twice for owner ${owner}`);
					ownEffects.set(effectId, {
						owner,
						siteId,
						setup
					});
				}
			});
			let result;
			try {
				if (this.#activeCounters) {
					this.#count("owner.component-visits");
					this.#count("owner.component-renders");
				}
				structuralCount("owner.delta-row-executions", "iteration", "component_state_runtime.ts:row-execute");
				result = rendered.type(props);
			} finally {
				activeOwners.pop();
			}
			preparedStores.push(storeTransaction);
			if (storeTransaction.stores.size > 0) return null;
			storeTransaction.discard();
			result = carryHostKeys(result, key);
			const hostKey = singleHostRootKey(result);
			if (hostKey === null || hasNestedComponent(result)) return null;
			const cache = {
				type: rendered.type,
				hostKeyScope: key,
				props,
				result,
				expandedResult: result,
				subtreeOwners: /* @__PURE__ */ new Set([owner]),
				ownEffects,
				propBoundSites
			};
			return {
				owner,
				hostKey,
				node: {
					...rendered,
					props: {
						...rendered.props,
						key
					}
				},
				cache,
				...staged ? {
					staged: true,
					previousOwner: stagedPreviousOwner
				} : {}
			};
		};
		const discardCandidate = () => {
			for (const transaction of preparedStores) {
				transaction.discard();
				this.#discardUncommittedStoreRoots(transaction);
			}
			for (const owner of [.../* @__PURE__ */ new Set([...stagedOwners, ...newlyAllocatedOwners])]) {
				this.world.destroyOwner(owner);
				this.#dropPendingForOwner(owner);
			}
		};
		try {
			for (const batch of read.batches) {
				structuralCount("collection.delta.batch-visits", "iteration", "component_state_runtime.ts:flushCollectionDelta");
				if (batch.fromVersion + 1 !== batch.version) {
					discardCandidate();
					structuralBail("delta-batch-version-gap");
					return false;
				}
				for (const operation of batch.operations) {
					structuralCount("collection.delta.operation-visits", "iteration", "component_state_runtime.ts:flushCollectionDelta");
					if (operation.type === "remove") {
						const row = rowFor(operation.key);
						if (!row) {
							discardCandidate();
							structuralBail("delta-remove-row-missing");
							return false;
						}
						overlay.set(operation.key, null);
						operations.push({
							type: "remove",
							key: row.hostKey
						});
					} else if (operation.type === "move") {
						const row = rowFor(operation.key);
						const anchor = operation.beforeKey === null ? null : rowFor(operation.beforeKey);
						if (!row || operation.beforeKey !== null && !anchor) {
							discardCandidate();
							structuralBail("delta-move-row-or-anchor-missing");
							return false;
						}
						operations.push({
							type: "move",
							key: row.hostKey,
							beforeKey: anchor?.hostKey ?? null
						});
					} else {
						const previous = rowFor(operation.key);
						const isInsert = operation.type === "insert";
						if (isInsert && previous) {
							discardCandidate();
							structuralBail("delta-insert-key-already-present");
							return false;
						}
						if (!isInsert && !previous) {
							discardCandidate();
							structuralBail("delta-replace-row-missing");
							return false;
						}
						const anchor = isInsert && operation.beforeKey !== null ? rowFor(operation.beforeKey) : null;
						if (isInsert && operation.beforeKey !== null && !anchor) {
							discardCandidate();
							structuralBail("delta-insert-anchor-missing");
							return false;
						}
						const previousOwner = isInsert ? activationPreviousOwner(operation.key) : previous?.staged ? previous.previousOwner : void 0;
						const candidate = prepareRow(operation.key, operation.value, previous?.owner, isInsert, previousOwner);
						if (!candidate || previous && candidate.hostKey !== previous.hostKey) {
							discardCandidate();
							structuralBail("delta-row-render-or-host-key-declined");
							return false;
						}
						overlay.set(operation.key, candidate);
						operations.push(isInsert ? {
							type: "insert",
							key: candidate.hostKey,
							beforeKey: anchor?.hostKey ?? null,
							tree: candidate.cache.expandedResult
						} : {
							type: "replace",
							key: candidate.hostKey,
							tree: candidate.cache.expandedResult
						});
					}
				}
			}
		} catch {
			discardCandidate();
			structuralBail("delta-row-render-threw");
			this.#collectionSnapshotFallbackKeys.add(regionKey);
			this.#count("collection.delta.render-fallback");
			return false;
		}
		if (region.collection.version !== read.toVersion || this.#storeNotificationGeneration !== storeGenerationAtPrepare || this.#pendingChanges.size > 0) {
			discardCandidate();
			structuralBail("delta-candidate-stale");
			this.#count("collection.delta.stale-candidate");
			return false;
		}
		let deltaCommitted;
		try {
			deltaCommitted = this.#commitHostMutation(() => this.#vdom.commitKeyedRegionDelta(parentHostKey, region.siteId, operations));
		} catch (error) {
			discardCandidate();
			throw error;
		}
		if (!deltaCommitted) {
			discardCandidate();
			structuralBail("delta-vdom-declined");
			return false;
		}
		if (!region.reader.acknowledge(read.toVersion)) throw new Error("Collection reader lost its validated version after VDOM commit");
		const effectErrors = [];
		for (const [key, candidate] of overlay) {
			structuralCount("collection.delta.publication-overlay-visits", "iteration", "component_state_runtime.ts:flushCollectionDelta");
			const previous = originalRows.get(key);
			if (candidate === null) {
				if (previous) this.#retireCollectionRow(previous.owner, effectErrors);
				region.rows.delete(key);
				region.hostKeysByCollectionKey.delete(key);
				ownerRegion.outputsByKey.delete(key);
				if (previous) ownerRegion.keysByOwner.delete(previous.owner);
				continue;
			}
			if (candidate.staged) {
				this.world.activateStagedOwner(candidate.owner, candidate.previousOwner);
				if (candidate.previousOwner !== void 0) this.#retireCollectionRow(candidate.previousOwner, effectErrors);
			}
			const oldOwner = previous?.owner;
			if (oldOwner !== void 0 && oldOwner !== candidate.owner) {
				this.#retireCollectionRow(oldOwner, effectErrors);
				ownerRegion.keysByOwner.delete(oldOwner);
			}
			const previousCache = this.#componentCache.get(candidate.owner);
			this.#componentCache.set(candidate.owner, candidate.cache);
			if (!this.#liveOwners.has(candidate.owner)) this.#count("owner.created");
			this.#liveOwners.add(candidate.owner);
			for (const ancestor of this.world.ownerLineage(candidate.owner).slice(1)) {
				structuralCount("collection.delta.membership-ancestor-visits", "iteration", "component_state_runtime.ts:flushCollectionDelta");
				const ancestorCache = this.#componentCache.get(ancestor);
				if (ancestorCache?.subtreeOwners instanceof Set && !ancestorCache.subtreeOwners.has(candidate.owner)) {
					ancestorCache.subtreeOwners.add(candidate.owner);
					this.#count("collection.owner-membership-writes");
				}
			}
			if (previousCache) this.#syncOwnerSourceValues(candidate.owner, previousCache, candidate.cache.propBoundSites);
			else for (const site of candidate.cache.propBoundSites) {
				const source = this.world.scalarSource(candidate.owner, site);
				if (source) {
					this.#sourceValueSyncVisits++;
					this.#lastSourceValues.set(source, source.value);
				}
			}
			region.rows.set(key, candidate.node);
			region.hostKeysByCollectionKey.set(key, candidate.hostKey);
			region.componentSiteId = getComponentSiteId(candidate.cache.type);
			ownerRegion.outputsByKey.set(key, candidate.cache.expandedResult);
			ownerRegion.keysByOwner.set(candidate.owner, key);
			effectErrors.push(...this.#reconcileOwnerEffects(candidate.owner, candidate.cache.ownEffects));
			this.#count("collection.rows-prepared");
		}
		const publishedOwners = new Set([...overlay.values()].flatMap((candidate) => candidate ? [candidate.owner] : []));
		for (const owner of [.../* @__PURE__ */ new Set([...stagedOwners, ...newlyAllocatedOwners])]) {
			if (publishedOwners.has(owner)) continue;
			this.world.destroyOwner(owner);
			this.#dropPendingForOwner(owner);
		}
		for (const ancestor of this.world.ownerLineage(region.parentOwner)) {
			const cache = this.#componentCache.get(ancestor);
			if (!cache) continue;
			const keyedRegion = cache.keyedRegion ? {
				...cache.keyedRegion,
				version: createKeyedOwnerVersion()
			} : void 0;
			if (keyedRegion?.collection !== region && keyedRegion) {
				keyedRegion.outputsByKey.clear();
				keyedRegion.keysByOwner.clear();
			}
			this.#componentCache.set(ancestor, {
				...cache,
				result: null,
				expandedResult: null,
				invalidatedByCollection: true,
				...keyedRegion ? { keyedRegion } : {}
			});
		}
		if (region.collection.version === read.toVersion) this.#pendingCollectionRegionKeys.delete(regionKey);
		else {
			this.#pendingCollectionRegionKeys.add(regionKey);
			this.#schedule();
		}
		this.#count("collection.delta-operations", operations.length);
		if (effectErrors.length) throw new AggregateError(effectErrors, "Collection row effect lifecycle failed after VDOM commit");
		return true;
	}
	#retireCollectionRow(owner, errors) {
		const cache = this.#componentCache.get(owner);
		if (!cache) return;
		structuralCount("owner.retire-row-events", "event", "component_state_runtime.ts:retireCollectionRow");
		const lineage = this.world.ownerLineage(owner).slice(1);
		this.#count("owner.retired");
		errors.push(...this.#reconcileOwnerEffects(owner, /* @__PURE__ */ new Map()));
		this.#forgetOwnerSourceValues(owner, cache.propBoundSites);
		this.#componentCache.delete(owner);
		this.#liveOwners.delete(owner);
		this.#dropPendingForOwner(owner);
		this.world.destroyOwner(owner);
		for (const ancestor of lineage) {
			structuralCount("collection.delta.retire-ancestor-visits", "iteration", "component_state_runtime.ts:retireCollectionRow");
			const ancestorCache = this.#componentCache.get(ancestor);
			if (ancestorCache?.subtreeOwners instanceof Set && ancestorCache.subtreeOwners.delete(owner)) this.#count("collection.owner-membership-writes");
		}
	}
	#forgetOwnerSourceValues(owner, sites) {
		for (const site of sites) {
			const source = this.world.scalarSource(owner, site);
			if (source) this.#lastSourceValues.delete(source);
		}
	}
	#commitHostMutation(commit) {
		try {
			const result = commit();
			if (!this.#candidateHostCommit && result !== false) this.#publicationVersion++;
			return result;
		} catch (error) {
			this.#terminalHostFailure ??= error;
			this.#terminalHostFailed = true;
			throw error;
		}
	}
	#assertNoPublicationBarrier(operation) {
		if (this.#nativeCellCutActive) throw new Error(`Cannot ${operation} while a native numeric cell cut is executing`);
		if (this.#publicationBarrier) throw new Error(`Cannot ${operation} while a native root candidate is publishing`);
	}
	#releasePublicationBarrier(candidate) {
		if (this.#publicationBarrier !== candidate) return;
		this.#publicationBarrier = null;
		const shouldFlush = this.#deferredFlush || this.#hasPendingWork();
		this.#deferredFlush = false;
		if (shouldFlush && !this.#disposed && !this.#disposing && !this.#terminalHostFailed) this.#schedule();
	}
	#hasPendingWork() {
		return this.#pendingChanges.size > 0 || this.#pendingCollectionRegionKeys.size > 0 || this.#pendingResourceRetry || this.#storeNotificationGeneration !== this.#committedStoreNotificationGeneration;
	}
	#schedule() {
		if (this.#disposed || this.#scheduled) return;
		if (this.#publicationBarrier) {
			this.#deferredFlush = true;
			return;
		}
		this.#scheduled = true;
		this.#scheduleCommit(() => {
			if (this.#disposed || !this.#scheduled) return;
			this.#scheduled = false;
			if (this.#publicationBarrier) {
				this.#deferredFlush = true;
				return;
			}
			if (this.#hasPendingWork()) this.flush();
		});
	}
	#finishChanges(captured) {
		this.world.clearChangesThrough(captured);
		this.#pendingChanges.clearThrough(captured);
		if (this.#pendingChanges.size > 0) this.#schedule();
	}
	#syncStoreReaders(transaction, sparseStoreCandidate = false) {
		if (this.#disposed) return;
		const nextReaders = /* @__PURE__ */ new Map();
		for (const [readerId, stores] of transaction.readers) {
			if (sparseStoreCandidate) this.#count("store.sparse.reader-publication-map-visits");
			nextReaders.set(readerId, new Set(stores));
		}
		for (const [readerId, stores] of this.#liveStoreReaders) {
			if (sparseStoreCandidate) this.#count("store.sparse.reader-publication-map-visits");
			const next = nextReaders.get(readerId);
			for (const store of stores) if (!next?.has(store)) store.forgetReader(this.#rootId, readerId);
		}
		this.#liveStoreReaders = nextReaders;
		this.#reconcileStoreSubscriptions(sparseStoreCandidate);
	}
	#reconcileStoreSubscriptions(sparseStoreCandidate = false) {
		if (this.#disposed) return;
		const nextStores = /* @__PURE__ */ new Set();
		for (const stores of this.#liveStoreReaders.values()) {
			if (sparseStoreCandidate) this.#count("store.sparse.subscription-reader-visits");
			for (const store of stores) nextStores.add(store);
		}
		for (const stores of this.#storeDependencyLeases.values()) for (const store of stores) nextStores.add(store);
		for (const [store, unsubscribe] of this.#liveStoreSubscriptions) {
			if (nextStores.has(store)) continue;
			unsubscribe();
			if ((this.#candidateStoreHolds.get(store) ?? 0) === 0) store.detachRoot(this.#rootId);
			this.#liveStoreSubscriptions.delete(store);
		}
		for (const store of nextStores) {
			if (this.#liveStoreSubscriptions.has(store)) continue;
			this.#liveStoreSubscriptions.set(store, store.subscribe(this.#rootId, () => {
				this.#storeNotificationGeneration++;
				this.#schedule();
			}));
		}
	}
	#syncResourceSubscriptions(resources) {
		const wanted = new Set(resources.filter((resource) => resource.status.status === "pending"));
		for (const [resource, unsubscribe] of this.#liveResourceSubscriptions) {
			if (wanted.has(resource)) continue;
			unsubscribe();
			this.#liveResourceSubscriptions.delete(resource);
		}
		for (const resource of wanted) {
			if (this.#liveResourceSubscriptions.has(resource)) continue;
			const unsubscribe = resource.subscribe(() => {
				this.#liveResourceSubscriptions.get(resource)?.();
				this.#liveResourceSubscriptions.delete(resource);
				if (!this.#disposed) {
					this.#pendingResourceRetry = true;
					this.#schedule();
				}
			});
			this.#liveResourceSubscriptions.set(resource, unsubscribe);
		}
	}
	#discardUncommittedStoreRoots(transaction) {
		for (const store of transaction.stores) if (!this.#liveStoreSubscriptions.has(store) && (this.#candidateStoreHolds.get(store) ?? 0) === 0) store.detachRoot(this.#rootId);
	}
	#releaseCandidateStoreHolds(stores) {
		for (const store of stores) {
			const count = this.#candidateStoreHolds.get(store) ?? 0;
			if (count > 1) {
				this.#candidateStoreHolds.set(store, count - 1);
				continue;
			}
			this.#candidateStoreHolds.delete(store);
			if (!this.#liveStoreSubscriptions.has(store)) store.detachRoot(this.#rootId);
		}
	}
	#dropPendingForOwner(owner) {
		this.#pendingChanges.dropOwner(owner);
	}
	#syncLastSourceValues(caches) {
		if (this.#disposed) return;
		const live = /* @__PURE__ */ new Set();
		for (const [owner, cache] of caches) for (const site of cache.propBoundSites) {
			this.#sourceValueSyncVisits++;
			const source = this.world.scalarSource(owner, site);
			if (!source) continue;
			live.add(source);
			this.#lastSourceValues.set(source, source.value);
		}
		for (const source of this.#lastSourceValues.keys()) if (!live.has(source)) this.#lastSourceValues.delete(source);
	}
	#syncOwnerSourceValues(owner, previous, nextSites) {
		for (const site of previous.propBoundSites) {
			if (nextSites.has(site)) continue;
			const source = this.world.scalarSource(owner, site);
			if (source) this.#lastSourceValues.delete(source);
		}
		for (const site of nextSites) {
			this.#sourceValueSyncVisits++;
			const source = this.world.scalarSource(owner, site);
			if (source) this.#lastSourceValues.set(source, source.value);
		}
	}
	#applyCandidateNumericWrites(writes) {
		const pending = writes.filter((write) => this.world.isAlive(write.owner) && this.world.scalarSource(write.owner, write.site) === write.source && this.#vdom.hasBoundSource(write.source));
		for (const write of pending) if (this.world.version(write.owner, write.site) !== write.version) throw new Error("Numeric source changed during candidate host commit");
		if (pending.length === 0) return;
		const updates = pending.map(({ source, current }) => [source, current]);
		for (const write of pending) write.source.value = write.previous;
		try {
			this.#vdom.setSources(updates);
		} finally {
			for (const write of pending) if (this.world.isAlive(write.owner) && this.world.version(write.owner, write.site) === write.version && this.world.scalarSource(write.owner, write.site) === write.source) write.source.value = write.current;
		}
	}
	#flushNumericSources(changes, previousValues = this.#lastSourceValues) {
		const pending = [];
		const seenSources = /* @__PURE__ */ new Set();
		for (const change of changes) {
			const source = this.world.scalarSourceForChange(change);
			if (!source) return false;
			const previous = previousValues.get(source);
			if (previous === void 0) return false;
			if (seenSources.has(source)) continue;
			seenSources.add(source);
			pending.push({
				change,
				source,
				previous,
				current: source.value
			});
		}
		const updates = pending.map(({ source, current }) => [source, current]);
		for (const { source, previous } of pending) source.value = previous;
		try {
			const wrote = this.#commitHostMutation(() => this.#vdom.setSources(updates));
			for (const { source, current } of pending) this.#lastSourceValues.set(source, current);
			return wrote || changes.length > 0;
		} finally {
			for (const write of pending) if (this.world.isAlive(write.change.owner) && this.world.versionForChange(write.change) === write.change.version && this.world.scalarSourceForChange(write.change) === write.source) write.source.value = write.current;
		}
	}
	#clearNumericProgramBuffers() {
		for (let index = 0; index < this.#numericProgramUsedCount; index++) this.#numericProgramSources[index] = void 0;
		this.#numericProgramUsedCount = 0;
	}
	#clearNativeRowBuffers() {
		for (let index = 0; index < this.#nativeRowUsedCount; index++) {
			this.#nativeRowTokens[index] = void 0;
			this.#nativeRowViews[index] = void 0;
		}
		this.#nativeRowUsedCount = 0;
		if (this.#disposed) {
			this.#nativeRowTokens.length = 0;
			this.#nativeRowViews.length = 0;
			this.#nativeChangedRows = /* @__PURE__ */ new Uint32Array(0);
			this.#nativeChangedSlots = /* @__PURE__ */ new Uint32Array(0);
		}
	}
	#acknowledgeNativeCellCut(count) {
		if (this.#disposed) return;
		for (let index = 0; index < count; index++) this.#lastSourceValues.set(this.#numericProgramSources[index], this.#numericProgramCurrentValues[index]);
		this.world.clearCellChangesThrough(this.#nativeCellHandles, this.#nativeCellVersions, count);
		this.#pendingChanges.clearNativeThrough(this.#nativeCellHandles, this.#nativeCellVersions, count);
	}
	/** Execute one compiler-owned row plan per affected committed owner. */
	#tryCommitNativeRows(count) {
		if (this.#nativeChangedRows.length < count) {
			let capacity = Math.max(16, this.#nativeChangedRows.length);
			while (capacity < count) capacity *= 2;
			this.#nativeChangedRows = new Uint32Array(capacity);
			this.#nativeChangedSlots = new Uint32Array(capacity);
		}
		if (this.#nativeRowEpoch === Number.MAX_SAFE_INTEGER) {
			this.#nativeRowPrograms = /* @__PURE__ */ new WeakMap();
			this.#nativeRowEpoch = 0;
		}
		const epoch = ++this.#nativeRowEpoch;
		let accepted = false;
		try {
			for (let index = 0; index < count; index++) {
				const view = this.world.numericRowForCell(this.#nativeCellHandles[index], this.#nativeCellVersions[index]);
				if (!view || !view.layout.programId) return null;
				let prepared = this.#nativeRowPrograms.get(view.rowIdentity);
				if (!prepared) {
					const token = this.#vdom.prepareNumericRowProgram(view);
					if (!token) return null;
					prepared = {
						token,
						epoch: 0,
						index: 0
					};
					this.#nativeRowPrograms.set(view.rowIdentity, prepared);
				}
				if (prepared.epoch !== epoch) {
					prepared.epoch = epoch;
					prepared.index = this.#nativeRowUsedCount++;
					this.#nativeRowTokens[prepared.index] = prepared.token;
					this.#nativeRowViews[prepared.index] = view;
				}
				this.#nativeChangedRows[index] = prepared.index;
				this.#nativeChangedSlots[index] = view.slot;
				this.#numericProgramSources[index] = view.source;
				this.#numericProgramCurrentValues[index] = view.columns[view.slot].values[view.row];
				this.#numericProgramUsedCount = index + 1;
			}
			let declined = false;
			let wrote = this.#commitHostMutation(() => {
				const result = this.#vdom.executePreparedNumericRows(this.#nativeRowTokens, this.#nativeChangedRows, this.#nativeChangedSlots, this.#numericProgramCurrentValues, count);
				if (result === null) {
					declined = true;
					return false;
				}
				return result;
			});
			if (declined) {
				for (let index = 0; index < count; index++) {
					const current = this.world.numericRowForCell(this.#nativeCellHandles[index], this.#nativeCellVersions[index]);
					const prior = this.#nativeRowViews[this.#nativeChangedRows[index]];
					if (!current || current.rowIdentity !== prior.rowIdentity || current.slot !== this.#nativeChangedSlots[index] || current.source !== this.#numericProgramSources[index]) return null;
				}
				for (let index = 0; index < this.#nativeRowUsedCount; index++) {
					const view = this.#nativeRowViews[index];
					const token = this.#vdom.prepareNumericRowProgram(view);
					if (!token) return null;
					this.#nativeRowTokens[index] = token;
					this.#nativeRowPrograms.get(view.rowIdentity).token = token;
				}
				declined = false;
				wrote = this.#commitHostMutation(() => {
					const result = this.#vdom.executePreparedNumericRows(this.#nativeRowTokens, this.#nativeChangedRows, this.#nativeChangedSlots, this.#numericProgramCurrentValues, count);
					if (result === null) {
						declined = true;
						return false;
					}
					return result;
				});
				if (declined) return null;
			}
			accepted = true;
			this.#count("numeric.row-batches");
			this.#count("numeric.row-count", this.#nativeRowUsedCount);
			this.#count("numeric.row-cells", count);
			this.#acknowledgeNativeCellCut(count);
			return wrote || count > 0;
		} finally {
			this.#clearNativeRowBuffers();
			if (!accepted) this.#clearNumericProgramBuffers();
		}
	}
	/** Capture exact published lane cells; null keeps the existing fallback cut. */
	#tryCommitNativeLanes(count) {
		let accepted = false;
		try {
			for (let index = 0; index < count; index++) {
				const handle = this.#nativeCellHandles[index];
				const lane = this.world.numericLaneForCell(handle, this.#nativeCellVersions[index]);
				if (!lane) return null;
				let prepared = this.#nativeLanePrograms.get(lane);
				if (!prepared) {
					const source = this.world.scalarSourceForCell(handle);
					if (!source) return null;
					const token = this.#vdom.prepareNumericCellProgram(source, lane.column, lane.row);
					if (!token) return null;
					prepared = {
						token,
						source
					};
					this.#nativeLanePrograms.set(lane, prepared);
				}
				this.#nativeLaneTokens[index] = prepared.token;
				this.#numericProgramSources[index] = prepared.source;
				this.#numericProgramCurrentValues[index] = lane.column.values[lane.row];
				this.#numericProgramUsedCount = index + 1;
			}
			let declined = false;
			let wrote = this.#commitHostMutation(() => {
				const result = this.#vdom.executePreparedNumericCells(this.#nativeLaneTokens, this.#numericProgramCurrentValues, count);
				if (result === null) {
					declined = true;
					return false;
				}
				return result;
			});
			if (declined) {
				declined = false;
				for (let index = 0; index < count; index++) {
					const handle = this.#nativeCellHandles[index];
					const lane = this.world.numericLaneForCell(handle, this.#nativeCellVersions[index]);
					if (!lane) return null;
					this.#nativeLanePrograms.delete(lane);
					const source = this.world.scalarSourceForCell(handle);
					if (!source) return null;
					const token = this.#vdom.prepareNumericCellProgram(source, lane.column, lane.row);
					if (!token) return null;
					this.#nativeLanePrograms.set(lane, {
						token,
						source
					});
					this.#nativeLaneTokens[index] = token;
					this.#numericProgramSources[index] = source;
				}
				wrote = this.#commitHostMutation(() => {
					const result = this.#vdom.executePreparedNumericCells(this.#nativeLaneTokens, this.#numericProgramCurrentValues, count);
					if (result === null) {
						declined = true;
						return false;
					}
					return result;
				});
				if (declined) return null;
			}
			accepted = true;
			this.#count("numeric.lane-batches");
			this.#count("numeric.lane-cells", count);
			this.#acknowledgeNativeCellCut(count);
			return wrote || count > 0;
		} finally {
			if (!accepted) this.#clearNumericProgramBuffers();
		}
	}
	/** Snapshot-free route for a fully native, compiler-approved numeric cut. */
	#tryFlushNativeCellCut() {
		const capacity = this.#pendingChanges.size;
		if (this.#nativeCellHandles.length < capacity) {
			this.#nativeCellHandles.length = capacity;
			this.#nativeCellVersions.length = capacity;
		}
		if (this.#nativeLaneTokens.length < capacity) this.#nativeLaneTokens.length = capacity;
		const count = this.#pendingChanges.captureNative(this.#nativeCellHandles, this.#nativeCellVersions);
		if (count === null || count === 0) {
			this.#clearNativeCellCutBuffers();
			return false;
		}
		this.#nativeCellCutActive = true;
		let committed = false;
		try {
			const rowCommit = this.#tryCommitNativeRows(count);
			if (rowCommit !== null) {
				committed = rowCommit;
				return committed;
			}
			const laneCommit = this.#tryCommitNativeLanes(count);
			if (laneCommit !== null) {
				committed = laneCommit;
				return committed;
			}
			for (let index = 0; index < count; index++) {
				const handle = this.#nativeCellHandles[index];
				const version = this.#nativeCellVersions[index];
				const cache = this.#componentCache.get(handle.owner);
				const source = this.world.scalarSourceForCell(handle);
				const currentVersion = this.world.versionForCell(handle);
				if (!cache || !this.#compiledPropSitesForCache(cache)?.has(handle.site) || !source || !this.#lastSourceValues.has(source) || !this.#vdom.hasSourceProgram(source) || currentVersion !== version) return false;
				this.#numericProgramSources[index] = source;
				this.#numericProgramCurrentValues[index] = source.value;
				this.#numericProgramPreviousValues[index] = this.#lastSourceValues.get(source);
				this.#numericProgramUsedCount = index + 1;
			}
			this.#count("numeric.program-source-buffer-capacity", this.#numericProgramSources.length);
			if (this.#invalidation) {
				for (let index = 0; index < count; index++) {
					const slot = this.#invalidation.sourceSlots.get(this.#nativeCellHandles[index].site);
					if (slot !== void 0) this.#invalidation.dispatcher.invalidateSourceSlot(slot);
				}
				this.#invalidation.dispatcher.flush(() => {});
			}
			for (let index = 0; index < count; index++) this.#numericProgramSources[index].value = this.#numericProgramPreviousValues[index];
			try {
				const wrote = this.#commitHostMutation(() => this.#vdom.executeSourceProgram(this.#numericProgramSources, this.#numericProgramCurrentValues, count));
				if (this.#disposed) return wrote || count > 0;
				for (let index = 0; index < count; index++) {
					const source = this.#numericProgramSources[index];
					this.#lastSourceValues.set(source, this.#numericProgramCurrentValues[index]);
				}
				this.world.clearCellChangesThrough(this.#nativeCellHandles, this.#nativeCellVersions, count);
				this.#pendingChanges.clearNativeThrough(this.#nativeCellHandles, this.#nativeCellVersions, count);
				committed = wrote || count > 0;
				return committed;
			} finally {
				for (let index = 0; index < count; index++) {
					const handle = this.#nativeCellHandles[index];
					const source = this.#numericProgramSources[index];
					if (!this.#disposed && this.world.versionForCell(handle) === this.#nativeCellVersions[index] && this.world.scalarSourceForCell(handle) === source) source.value = this.#numericProgramCurrentValues[index];
				}
			}
		} finally {
			this.#clearNumericProgramBuffers();
			this.#clearNativeCellCutBuffers(count);
			this.#nativeCellCutActive = false;
			if (this.#disposed) {
				this.#nativeCellHandles.length = 0;
				this.#nativeCellVersions.length = 0;
				this.#nativeLaneTokens.length = 0;
				this.#numericProgramSources.length = 0;
				this.#numericProgramCurrentValues.length = 0;
				this.#numericProgramPreviousValues.length = 0;
			} else if (!this.#terminalHostFailed && (this.#deferredFlush || committed && this.#hasPendingWork())) {
				this.#deferredFlush = false;
				this.#schedule();
			}
		}
	}
	#clearNativeCellCutBuffers(count = this.#nativeCellHandles.length) {
		for (let index = 0; index < count; index++) {
			this.#nativeCellHandles[index] = void 0;
			this.#nativeCellVersions[index] = 0;
			this.#nativeLaneTokens[index] = void 0;
		}
	}
	#expand(node, parentOwner, nextOwners, nextEffects, nextComponentCache, createdOwners, path, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, collectionOwnerScope, collectionRowScopeKey, ownerPreparation, captureBinding, resourceReads, expansionJournal, boundaryPrimaries, boundaryState, protectedBranch = false, boundaryHostScope) {
		if (node == null || node === false || typeof node === "string" || typeof node === "number") return node;
		if (Array.isArray(node)) {
			const regionId = getKeyedOwnerRegionId(node);
			const version = getKeyedOwnerVersion(node);
			const collectionDescriptor = version === null ? void 0 : collectionRegionDescriptors.get(version);
			const outputsByKey = version === null || this.#keyedOwnerReuseMode !== "token" && !collectionDescriptor ? null : /* @__PURE__ */ new Map();
			const keysByOwner = outputsByKey ? /* @__PURE__ */ new Map() : null;
			let regionSiteId = collectionDescriptor?.componentSiteId ?? null;
			let validRegion = outputsByKey !== null;
			const siteOrdinals = /* @__PURE__ */ new Map();
			let changed = false;
			const collectionKeys = collectionDescriptor ? [...collectionDescriptor.rows.keys()] : [];
			const siblingPending = [];
			const children = node.map((child, index) => {
				const childPath = `${path}/${index}`;
				const siteId = child && !Array.isArray(child) && typeof child === "object" && child.type === Suspense ? `@suspense:${String(child.props.__nativeBoundarySite ?? "anonymous")}` : child && !Array.isArray(child) && typeof child === "object" && typeof child.type === "function" ? getComponentSiteId(child.type) : "";
				const ordinal = siteId ? siteOrdinals.get(siteId) ?? 0 : 0;
				if (siteId) siteOrdinals.set(siteId, ordinal + 1);
				const journalMark = protectedBranch ? expansionJournal?.checkpoint() : void 0;
				const ownerMark = protectedBranch ? ownerPreparation?.checkpoint() : void 0;
				const storeMark = protectedBranch ? storeTransaction.checkpoint() : void 0;
				let expanded;
				try {
					expanded = this.#expand(child, parentOwner, nextOwners, nextEffects, nextComponentCache, createdOwners, siteId ? `${childPath}#${ordinal}` : childPath, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, collectionDescriptor?.siteId ?? collectionOwnerScope, collectionDescriptor ? !siteId ? collectionKeys[index] : void 0 : collectionRowScopeKey, ownerPreparation, captureBinding, resourceReads, expansionJournal, boundaryPrimaries, boundaryState);
				} catch (error) {
					if (!isPendingResource(error) && !(error instanceof ResourceRejection)) throw error;
					if (storeMark === void 0) throw error;
					const branchReaders = storeMark === void 0 ? /* @__PURE__ */ new Map() : storeTransaction.readersSince(storeMark);
					if (ownerMark) ownerPreparation?.rollbackTo(ownerMark);
					if (storeMark !== void 0) {
						storeTransaction.rollbackTo(storeMark);
						if (branchReaders.size) storeTransaction.preserveReaders(branchReaders);
					}
					if (journalMark !== void 0) expansionJournal?.rollback(journalMark);
					if (error instanceof ResourceRejection) throw error;
					siblingPending.push(error);
					return child;
				} finally {
					if (storeMark !== void 0) storeTransaction.releaseCheckpoint(storeMark);
					if (ownerMark) ownerPreparation?.releaseCheckpoint(ownerMark);
				}
				if (expanded !== child) changed = true;
				if (outputsByKey && regionId !== null) {
					if (!child || Array.isArray(child) || typeof child !== "object" || typeof child.type !== "function") validRegion = false;
					else {
						const childSiteId = getComponentSiteId(child.type);
						const rawKey = child.props.key;
						if ((collectionDescriptor ? regionSiteId !== null && regionSiteId !== childSiteId : childSiteId !== regionId) || rawKey == null || regionSiteId !== null && regionSiteId !== childSiteId) validRegion = false;
						else {
							regionSiteId = childSiteId;
							const key = String(rawKey);
							const owner = ownerPreparation?.findOwner?.(parentOwner, collectionDescriptor ? collectionOwnerSite(collectionDescriptor.siteId, childSiteId) : childSiteId, key) ?? (ownerPreparation ? void 0 : this.world.findOwner(parentOwner, collectionDescriptor ? collectionOwnerSite(collectionDescriptor.siteId, childSiteId) : childSiteId, key));
							if (outputsByKey.has(key) || owner === void 0) validRegion = false;
							else {
								outputsByKey.set(key, expanded);
								keysByOwner?.set(owner, key);
							}
						}
					}
				}
				return expanded;
			});
			if (siblingPending.length) throw siblingPending[0];
			let collectedCollection;
			if (collectionDescriptor && collectionDescriptor.siteId === regionId && collectionDescriptor.rows.size === children.length) {
				const hostKeysByCollectionKey = /* @__PURE__ */ new Map();
				let index = 0;
				for (const collectionKey of collectionDescriptor.rows.keys()) {
					const hostKey = singleHostRootKey(children[index++] ?? null);
					if (hostKey !== null) hostKeysByCollectionKey.set(collectionKey, hostKey);
				}
				collectedCollection = {
					...collectionDescriptor,
					parentOwner,
					parentHostKey: null,
					hostKeysByCollectionKey
				};
				if (this.#collectedCollectionRegions) {
					if (expansionJournal) expansionJournal.set(this.#collectedCollectionRegions, `${parentOwner}\u0000${collectedCollection.siteId}`, collectedCollection);
					else this.#collectedCollectionRegions.set(`${parentOwner}\u0000${collectedCollection.siteId}`, collectedCollection);
				}
			}
			if (validRegion && outputsByKey && regionId !== null && version !== null && (regionSiteId !== null || collectionDescriptor !== void 0) && outputsByKey.size === node.length) {
				const collected = {
					regionId,
					version,
					componentSiteId: regionSiteId ?? collectionDescriptor?.componentSiteId ?? "",
					outputsByKey,
					keysByOwner,
					...collectedCollection && !collectedCollection.requiresOwnerRender && collectedCollection.componentSiteId ? { collection: collectedCollection } : {}
				};
				if (this.#collectedKeyedRegions) {
					if (expansionJournal) expansionJournal.set(this.#collectedKeyedRegions, parentOwner, collected);
					else this.#collectedKeyedRegions.set(parentOwner, collected);
				}
			}
			return changed ? copyKeyedOwnerMetadata(node, children) : node;
		}
		if (node.type === Suspense) {
			this.#everHadNativeBoundary = true;
			const props = node.props;
			const siteId = props.__nativeBoundarySite || `@runtime-suspense:${path}`;
			const lastSegment = path.slice(path.lastIndexOf("/") + 1);
			const ordinal = Number(lastSegment.split("#").at(-1)) || 0;
			const identityKey = props.key == null ? `@slot:${siteId}:${ordinal}` : String(props.key);
			const ownerSite = `\u0000native-suspense:${siteId}`;
			const priorBoundaryOwner = ownerPreparation ? ownerPreparation.findOwner(parentOwner, ownerSite, identityKey) : this.world.findOwner(parentOwner, ownerSite, identityKey);
			const boundaryOwner = ownerPreparation ? ownerPreparation.resolveOwner(parentOwner, ownerSite, identityKey) : this.world.resolveOwner(parentOwner, ownerSite, identityKey);
			if (!priorBoundaryOwner && !ownerPreparation && expansionJournal) expansionJournal.undo(() => {
				if (this.world.isAlive(boundaryOwner)) this.world.destroyOwner(boundaryOwner);
			});
			if (!this.#liveOwners.has(boundaryOwner)) {
				if (expansionJournal) expansionJournal.push(createdOwners, boundaryOwner);
				else createdOwners.push(boundaryOwner);
			}
			if (expansionJournal) expansionJournal.add(nextOwners, boundaryOwner);
			else nextOwners.add(boundaryOwner);
			if (!subtreeOwnersByOwner.has(boundaryOwner)) {
				if (expansionJournal) expansionJournal.set(subtreeOwnersByOwner, boundaryOwner, /* @__PURE__ */ new Set([boundaryOwner]));
				else subtreeOwnersByOwner.set(boundaryOwner, /* @__PURE__ */ new Set([boundaryOwner]));
			}
			for (const ancestor of ownerPath) {
				const descendants = subtreeOwnersByOwner.get(ancestor);
				if (descendants) {
					if (expansionJournal) expansionJournal.add(descendants, boundaryOwner);
					else descendants.add(boundaryOwner);
				}
			}
			const boundaryKey = String(boundaryOwner);
			if (boundaryState && !boundaryState.visited.has(boundaryKey)) {
				boundaryState.visited.add(boundaryKey);
				expansionJournal?.undo(() => boundaryState.visited.delete(boundaryKey));
			}
			const branchJournal = expansionJournal ?? new ExpansionJournal();
			const recordBoundaryOutput = (output) => {
				const cache = {
					type: Suspense,
					hostKeyScope: identityKey,
					props: { ...props },
					result: props.children ?? null,
					expandedResult: output,
					subtreeOwners: /* @__PURE__ */ new Set([boundaryOwner]),
					ownEffects: /* @__PURE__ */ new Map(),
					propBoundSites: /* @__PURE__ */ new Set(),
					nativeBoundary: true
				};
				if (expansionJournal) expansionJournal.set(nextComponentCache, boundaryOwner, cache);
				else nextComponentCache.set(boundaryOwner, cache);
				return output;
			};
			const storeMark = storeTransaction.checkpoint();
			const ownerMark = ownerPreparation?.checkpoint();
			const journalMark = branchJournal.checkpoint();
			ownerPath.push(boundaryOwner);
			try {
				const primary = this.#expand(props.children ?? null, boundaryOwner, nextOwners, nextEffects, nextComponentCache, createdOwners, `${path}/suspense:${siteId}`, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, collectionOwnerScope, collectionRowScopeKey, ownerPreparation, captureBinding, resourceReads, branchJournal, boundaryPrimaries, boundaryState, true, boundaryOwner);
				if (boundaryPrimaries) {
					const snapshot = { tree: props.children ?? null };
					if (expansionJournal) expansionJournal.set(boundaryPrimaries, boundaryKey, snapshot);
					else boundaryPrimaries.set(boundaryKey, snapshot);
				}
				storeTransaction.releaseCheckpoint(storeMark);
				if (ownerMark) ownerPreparation?.releaseCheckpoint(ownerMark);
				return recordBoundaryOutput(primary);
			} catch (error) {
				if (!isPendingResource(error) && !(error instanceof ResourceRejection)) {
					storeTransaction.releaseCheckpoint(storeMark);
					if (ownerMark) ownerPreparation?.releaseCheckpoint(ownerMark);
					throw error;
				}
				const suspendedReaders = storeTransaction.readersSince(storeMark);
				storeTransaction.rollbackTo(storeMark);
				storeTransaction.releaseCheckpoint(storeMark);
				if (ownerMark) {
					ownerPreparation?.rollbackTo(ownerMark);
					ownerPreparation?.releaseCheckpoint(ownerMark);
				}
				branchJournal.rollback(journalMark);
				if (suspendedReaders.size) {
					const pendingReaderDependencies = new Map([...suspendedReaders].map(([readerId, stores]) => [`\u0000suspense-pending:${boundaryKey}:${readerId}`, stores]));
					storeTransaction.preserveReaders(pendingReaderDependencies);
				}
				const previous = boundaryPrimaries?.get(boundaryKey);
				if (isPendingResource(error) && previous) {
					const retainedStoreMark = storeTransaction.checkpoint();
					const retainedOwnerMark = ownerPreparation?.checkpoint();
					const retainedJournalMark = branchJournal.checkpoint();
					try {
						const retained = this.#expand(previous.tree, boundaryOwner, nextOwners, nextEffects, nextComponentCache, createdOwners, `${path}/suspense-retained:${siteId}`, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, collectionOwnerScope, collectionRowScopeKey, ownerPreparation, captureBinding, resourceReads, branchJournal, boundaryPrimaries, boundaryState, true, boundaryOwner);
						storeTransaction.releaseCheckpoint(retainedStoreMark);
						if (retainedOwnerMark) ownerPreparation?.releaseCheckpoint(retainedOwnerMark);
						return recordBoundaryOutput(retained);
					} catch (retainedError) {
						if (!isPendingResource(retainedError) && !(retainedError instanceof ResourceRejection)) {
							storeTransaction.releaseCheckpoint(retainedStoreMark);
							if (retainedOwnerMark) ownerPreparation?.releaseCheckpoint(retainedOwnerMark);
							throw retainedError;
						}
					}
					if (retainedOwnerMark) {
						ownerPreparation?.rollbackTo(retainedOwnerMark);
						ownerPreparation?.releaseCheckpoint(retainedOwnerMark);
					}
					storeTransaction.rollbackTo(retainedStoreMark);
					storeTransaction.releaseCheckpoint(retainedStoreMark);
					branchJournal.rollback(retainedJournalMark);
					if (boundaryState) boundaryState.blocked = true;
					return null;
				}
				const fallback = error instanceof ResourceRejection ? props.error?.(error.reason) ?? null : props.pending ?? props.fallback ?? null;
				return recordBoundaryOutput(this.#expand(fallback, boundaryOwner, nextOwners, nextEffects, nextComponentCache, createdOwners, `${path}/suspense-fallback:${siteId}`, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, collectionOwnerScope, collectionRowScopeKey, ownerPreparation, captureBinding, resourceReads, expansionJournal, boundaryPrimaries, boundaryState, protectedBranch, boundaryOwner));
			} finally {
				ownerPath.pop();
				if (!expansionJournal) branchJournal.clear();
			}
		}
		if (typeof node.type === "function") {
			structuralCount("owner.component-node-visits", "iteration", "component_state_runtime.ts:expand");
			if (this.#activeCounters) this.#count("owner.component-visits");
			const siteId = getComponentSiteId(node.type);
			const lastSegment = path.slice(path.lastIndexOf("/") + 1);
			const ownerKey = keyedIdentity(node, siteId, Number(lastSegment.split("#").at(-1)) || 0);
			const key = boundaryHostScope === void 0 ? String(ownerKey) : `${boundaryHostScope}\u0000${String(ownerKey)}`;
			const ownerSite = collectionOwnerScope ? collectionOwnerSite(collectionRowScopeKey === void 0 ? collectionOwnerScope : `${collectionOwnerScope}#row:${collectionRowScopeKey}`, siteId) : siteId;
			const priorOwner = ownerPreparation ? void 0 : this.world.findOwner(parentOwner, ownerSite, ownerKey);
			const owner = ownerPreparation ? ownerPreparation.resolveOwner(parentOwner, ownerSite, ownerKey) : this.world.resolveOwner(parentOwner, ownerSite, ownerKey);
			if (!ownerPreparation && priorOwner === void 0 && expansionJournal) expansionJournal.undo(() => {
				if (this.world.isAlive(owner)) this.world.destroyOwner(owner);
			});
			if (!this.#liveOwners.has(owner)) {
				if (expansionJournal) expansionJournal.push(createdOwners, owner);
				else createdOwners.push(owner);
				if (this.#activeCounters) this.#count("owner.created");
			}
			if (expansionJournal) expansionJournal.add(nextOwners, owner);
			else nextOwners.add(owner);
			if (!subtreeOwnersByOwner.has(owner)) {
				if (expansionJournal) expansionJournal.set(subtreeOwnersByOwner, owner, /* @__PURE__ */ new Set([owner]));
				else subtreeOwnersByOwner.set(owner, /* @__PURE__ */ new Set([owner]));
			}
			for (const ancestor of ownerPath) {
				const descendants = subtreeOwnersByOwner.get(ancestor);
				if (descendants) {
					if (expansionJournal) expansionJournal.add(descendants, owner);
					else descendants.add(owner);
				}
			}
			const { key: _key, ref: _ref, ...componentProps } = node.props;
			const cached = this.#componentCache.get(owner);
			const propsUnchanged = cached !== void 0 && shallowEqual(cached.props, componentProps);
			const shouldRender = forceRender || dirtyOwners.has(owner) || !cached || cached.invalidatedByCollection === true || cached.type !== node.type || !propsUnchanged;
			ownerPath.push(owner);
			try {
				if (!shouldRender && cached && !relevantOwners.has(owner) && !cached.invalidatedBySparseStore) {
					if (this.#activeCounters) this.#count("owner.cached-reused", cached.subtreeOwners.size);
					for (const cachedOwner of cached.subtreeOwners) {
						if (expansionJournal) expansionJournal.add(nextOwners, cachedOwner);
						else nextOwners.add(cachedOwner);
						const childCache = this.#componentCache.get(cachedOwner);
						if (!childCache) throw new Error(`Missing component cache for owner ${cachedOwner}`);
						if (expansionJournal) expansionJournal.set(nextComponentCache, cachedOwner, childCache);
						else nextComponentCache.set(cachedOwner, childCache);
						if (childCache.nativeBoundary && boundaryState) {
							const boundaryKey = String(cachedOwner);
							if (!boundaryState.visited.has(boundaryKey)) {
								if (expansionJournal) expansionJournal.add(boundaryState.visited, boundaryKey);
								else boundaryState.visited.add(boundaryKey);
							}
						}
						for (const [registeredKey, effect] of childCache.ownEffects) if (expansionJournal) expansionJournal.set(nextEffects, registeredKey, effect);
						else nextEffects.set(registeredKey, effect);
						if (cachedOwner !== owner) for (const ancestor of ownerPath) {
							const descendants = subtreeOwnersByOwner.get(ancestor);
							if (descendants) {
								if (expansionJournal) expansionJournal.add(descendants, cachedOwner);
								else descendants.add(cachedOwner);
							}
						}
					}
					return cached.expandedResult;
				}
				let result = cached?.result;
				let ownEffects = cached?.ownEffects;
				let propBoundSites = cached?.propBoundSites ?? /* @__PURE__ */ new Set();
				if (shouldRender) {
					const prepared = this.#preparedRenders.get(owner) ?? null;
					if (prepared) {
						result = prepared.result;
						ownEffects = prepared.ownEffects;
						propBoundSites = prepared.propBoundSites;
						for (const [registeredKey, effect] of ownEffects) if (expansionJournal) expansionJournal.set(nextEffects, registeredKey, effect);
						else nextEffects.set(registeredKey, effect);
					} else {
						ownEffects = /* @__PURE__ */ new Map();
						const nextPropBoundSites = /* @__PURE__ */ new Set();
						propBoundSites = nextPropBoundSites;
						activeOwners.push({
							world: ownerPreparation ?? this.world,
							owner,
							stateLayout: compiledStateLayoutFor(node.type),
							propBoundSites: nextPropBoundSites,
							readStore: (storeSiteId, source) => storeTransaction.read(source, `${owner}\u0000${storeSiteId}`),
							readResource: (source) => {
								if (!resourceReads) throw new Error("Resource reads require a root resource candidate");
								this.#everReadResource = true;
								return resourceReads.read(source);
							},
							captureBinding,
							registerEffect: (effectSiteId, setup) => {
								if (effectSiteId.length === 0) throw new Error("Effect site ID must not be empty");
								if (typeof setup !== "function") throw new Error("Effect setup must be a function");
								const key = effectKey(owner, effectSiteId);
								if (nextEffects.has(key)) throw new Error(`Effect site ${effectSiteId} was registered more than once for owner ${owner}`);
								const registration = {
									owner,
									siteId: effectSiteId,
									setup
								};
								if (expansionJournal) expansionJournal.set(nextEffects, key, registration);
								else nextEffects.set(key, registration);
								ownEffects.set(key, registration);
							}
						});
						try {
							if (this.#activeCounters) this.#count("owner.component-renders");
							structuralCount("owner.generic-component-executions", "iteration", "component_state_runtime.ts:expand-render");
							result = node.type(componentProps);
						} finally {
							activeOwners.pop();
						}
						result = carryHostKeys(result, key);
					}
				} else if (ownEffects) for (const [registeredKey, effect] of ownEffects) if (expansionJournal) expansionJournal.set(nextEffects, registeredKey, effect);
				else nextEffects.set(registeredKey, effect);
				const expandedResult = this.#expand(result ?? null, owner, nextOwners, nextEffects, nextComponentCache, createdOwners, `${path}/${siteId}`, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, void 0, void 0, ownerPreparation, captureBinding, resourceReads, expansionJournal, boundaryPrimaries, boundaryState, protectedBranch);
				const collectedKeyedRegion = this.#collectedKeyedRegions?.get(owner);
				const collectionRegion = collectedKeyedRegion?.collection;
				if (collectionRegion) {
					const completeRegion = {
						...collectionRegion,
						parentHostKey: singleHostRootKey(expandedResult)
					};
					if (this.#collectedCollectionRegions) {
						if (expansionJournal) expansionJournal.set(this.#collectedCollectionRegions, `${owner}\u0000${completeRegion.siteId}`, completeRegion);
						else this.#collectedCollectionRegions.set(`${owner}\u0000${completeRegion.siteId}`, completeRegion);
					}
					const updatedRegion = {
						...collectedKeyedRegion,
						collection: completeRegion
					};
					if (this.#collectedKeyedRegions) {
						if (expansionJournal) expansionJournal.set(this.#collectedKeyedRegions, owner, updatedRegion);
						else this.#collectedKeyedRegions.set(owner, updatedRegion);
					}
				}
				const componentCache = {
					type: node.type,
					hostKeyScope: key,
					props: componentProps,
					result: result ?? null,
					expandedResult,
					subtreeOwners: subtreeOwnersByOwner.get(owner) ?? /* @__PURE__ */ new Set([owner]),
					ownEffects: ownEffects ?? /* @__PURE__ */ new Map(),
					propBoundSites,
					...this.#collectedKeyedRegions?.get(owner) ? { keyedRegion: this.#collectedKeyedRegions.get(owner) } : {}
				};
				if (expansionJournal) expansionJournal.set(nextComponentCache, owner, componentCache);
				else nextComponentCache.set(owner, componentCache);
				return expandedResult;
			} finally {
				ownerPath.pop();
			}
		}
		const children = this.#expand(node.props.children, parentOwner, nextOwners, nextEffects, nextComponentCache, createdOwners, `${path}/${node.type === Fragment ? "fragment" : node.type}`, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, collectionOwnerScope, collectionRowScopeKey, ownerPreparation, captureBinding, resourceReads, expansionJournal, boundaryPrimaries, boundaryState);
		return children === node.props.children ? node : {
			...node,
			props: {
				...node.props,
				children
			}
		};
	}
	#assertActive() {
		if (this.#disposed) throw new Error("ComponentStateRoot is disposed");
		if (this.#terminalHostFailed) throw new Error("ComponentStateRoot cannot continue after a host commit failure", { cause: this.#terminalHostFailure });
	}
};
var shallowEqual = (left, right) => {
	const leftKeys = Object.keys(left);
	const rightKeys = Object.keys(right);
	if (leftKeys.length !== rightKeys.length) return false;
	for (const key of leftKeys) if (!Object.hasOwn(right, key) || !Object.is(left[key], right[key])) return false;
	return true;
};
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/snapshot/src/keyed_collection.ts
/**
* Create an ordered keyed collection with independent, versioned readers.
* Key/anchor lookup is Map-backed; edits link/unlink entries without copying
* the sibling list. History is capped by `maxRetainedBatches`; lagging readers
* receive `unavailable` and should ask their owner for a generic snapshot.
* Payload values are retained by reference and must be treated as immutable by
* callers; operation descriptors and batches are copied and frozen here.
* `.map` is an O(N) generic snapshot operation. Compiler lowering may replace
* a proven collection row-map with versioned region rendering.
*/
function createKeyedCollection(initial, keyOf, options = {}) {
	const maxRetainedBatches = options.maxRetainedBatches ?? 256;
	if (!Number.isSafeInteger(maxRetainedBatches) || maxRetainedBatches < 1) throw new RangeError("maxRetainedBatches must be an integer >= 1");
	let head = null;
	let tail = null;
	const byKey = /* @__PURE__ */ new Map();
	const history = [];
	const readers = /* @__PURE__ */ new Set();
	const listeners = /* @__PURE__ */ new Set();
	const notificationQueue = [];
	let drainingNotifications = false;
	let version = 0;
	let entryInspections = 0;
	let anchorInspections = 0;
	let listenerNotifications = 0;
	let listenerErrors = 0;
	for (const value of initial) {
		const key = keyOf(value);
		if (typeof key !== "string" || key.length === 0) throw new TypeError("keyOf must return a non-empty string");
		if (byKey.has(key)) throw new Error(`Duplicate keyed-collection key: ${key}`);
		const entry = {
			key,
			value,
			previous: tail,
			next: null
		};
		if (tail) tail.next = entry;
		else head = entry;
		tail = entry;
		byKey.set(key, entry);
	}
	const find = (key) => {
		entryInspections++;
		structuralCount("collection.key-lookups", "lookup", "keyed_collection.ts:key-lookup");
		return byKey.get(key);
	};
	const getVirtual = (entry, virtual) => {
		let state = virtual.get(entry);
		if (!state) {
			state = {
				entry,
				value: entry.value,
				previous: entry.previous,
				next: entry.next,
				alive: true
			};
			virtual.set(entry, state);
		}
		return state;
	};
	const pruneAcknowledged = () => {
		if (readers.size === 0) {
			history.length = 0;
			return;
		}
		let minimum = Infinity;
		for (const reader of readers) {
			structuralCount("collection.history.reader-visits", "iteration", "keyed_collection.ts:pruneAcknowledged");
			minimum = Math.min(minimum, reader.version);
		}
		while (history.length > 0 && history[0].version <= minimum) {
			structuralCount("collection.history.pruned-batches", "event", "keyed_collection.ts:pruneAcknowledged");
			history.shift();
		}
	};
	const capHistory = () => {
		while (history.length > maxRetainedBatches) {
			structuralCount("collection.history.capped-batches", "event", "keyed_collection.ts:capHistory");
			history.shift();
		}
	};
	return {
		get version() {
			return version;
		},
		get size() {
			return byKey.size;
		},
		get firstKey() {
			return head?.key ?? null;
		},
		get lastKey() {
			return tail?.key ?? null;
		},
		has(key) {
			return find(key) !== void 0;
		},
		get(key) {
			return find(key)?.value;
		},
		/** Return an adjacent key, null at the edge, or undefined if missing. */
		previousKey(key) {
			const entry = find(key);
			return entry ? entry.previous?.key ?? null : void 0;
		},
		/** Return an adjacent key, null at the edge, or undefined if missing. */
		nextKey(key) {
			const entry = find(key);
			return entry ? entry.next?.key ?? null : void 0;
		},
		/** O(N), intended for initial materialization or generic fallback. */
		snapshot() {
			structuralBail("collection-snapshot-inside-edit-window");
			structuralCount("collection.snapshot.invocations", "event", "keyed_collection.ts:snapshot");
			const result = [];
			for (let entry = head; entry; entry = entry.next) {
				entryInspections++;
				structuralCount("collection.snapshot.entry-visits", "iteration", "keyed_collection.ts:snapshot");
				result.push(Object.freeze({
					key: entry.key,
					value: entry.value
				}));
			}
			return Object.freeze(result);
		},
		/** O(N) generic fallback; callback receives only the row value, never index. */
		map(render) {
			return this.snapshot().map(({ value }) => render(value));
		},
		apply(expectedVersion, operations) {
			if (expectedVersion !== version) return {
				ok: false,
				reason: "stale-version",
				version
			};
			let batchOperations;
			try {
				batchOperations = Object.freeze(Array.from(operations, (operation) => {
					structuralCount("collection.copy-operation-callbacks", "iteration", "keyed_collection.ts:apply-copy");
					return Object.freeze({ ...operation });
				}));
			} catch {
				return {
					ok: false,
					reason: "invalid-operation",
					version
				};
			}
			if (batchOperations.length === 0) return {
				ok: true,
				version
			};
			const virtual = /* @__PURE__ */ new Map();
			const keyOverlay = /* @__PURE__ */ new Map();
			let virtualHead = head;
			let virtualTail = tail;
			const lookup = (key) => {
				entryInspections++;
				structuralCount("collection.key-lookups", "lookup", "keyed_collection.ts:key-lookup");
				if (keyOverlay.has(key)) return keyOverlay.get(key) ?? void 0;
				return byKey.get(key);
			};
			const anchor = (key) => {
				if (key === null) return null;
				anchorInspections++;
				return lookup(key);
			};
			const linkOut = (entry) => {
				const state = getVirtual(entry, virtual);
				const before = state.previous;
				const after = state.next;
				if (before) getVirtual(before, virtual).next = after;
				else virtualHead = after;
				if (after) getVirtual(after, virtual).previous = before;
				else virtualTail = before;
				state.previous = null;
				state.next = null;
				state.alive = false;
			};
			const linkBefore = (entry, before) => {
				const previous = before ? getVirtual(before, virtual).previous : virtualTail;
				const state = getVirtual(entry, virtual);
				state.previous = previous;
				state.next = before;
				state.alive = true;
				if (previous) getVirtual(previous, virtual).next = entry;
				else virtualHead = entry;
				if (before) getVirtual(before, virtual).previous = entry;
				else virtualTail = entry;
			};
			for (const operation of batchOperations) {
				structuralCount("collection.preflight.operation-visits", "iteration", "keyed_collection.ts:apply-preflight");
				if (!operation || typeof operation.key !== "string" || !operation.key) return {
					ok: false,
					reason: "invalid-operation",
					version
				};
				if (operation.type === "insert") {
					if (lookup(operation.key) !== void 0) return {
						ok: false,
						reason: "invalid-operation",
						version
					};
					let selectedKey;
					try {
						selectedKey = keyOf(operation.value);
					} catch {
						return {
							ok: false,
							reason: "invalid-operation",
							version
						};
					}
					if (selectedKey !== operation.key) return {
						ok: false,
						reason: "invalid-operation",
						version
					};
					const before = anchor(operation.beforeKey);
					if (before === void 0) return {
						ok: false,
						reason: "invalid-operation",
						version
					};
					const entry = {
						key: operation.key,
						value: operation.value,
						previous: null,
						next: null
					};
					virtual.set(entry, {
						entry,
						value: operation.value,
						previous: null,
						next: null,
						alive: false
					});
					keyOverlay.set(operation.key, entry);
					linkBefore(entry, before);
				} else if (operation.type === "remove") {
					const entry = lookup(operation.key);
					if (!entry) return {
						ok: false,
						reason: "invalid-operation",
						version
					};
					linkOut(entry);
					keyOverlay.set(operation.key, null);
				} else if (operation.type === "move") {
					const entry = lookup(operation.key);
					const before = anchor(operation.beforeKey);
					if (!entry || before === void 0 || before === entry) return {
						ok: false,
						reason: "invalid-operation",
						version
					};
					linkOut(entry);
					linkBefore(entry, before);
				} else if (operation.type === "replace") {
					const entry = lookup(operation.key);
					if (!entry) return {
						ok: false,
						reason: "invalid-operation",
						version
					};
					let selectedKey;
					try {
						selectedKey = keyOf(operation.value);
					} catch {
						return {
							ok: false,
							reason: "invalid-operation",
							version
						};
					}
					if (selectedKey !== operation.key) return {
						ok: false,
						reason: "invalid-operation",
						version
					};
					getVirtual(entry, virtual).value = operation.value;
				} else return {
					ok: false,
					reason: "invalid-operation",
					version
				};
			}
			for (const state of virtual.values()) {
				structuralCount("collection.publish.virtual-entry-visits", "iteration", "keyed_collection.ts:apply-publish");
				state.entry.value = state.value;
				state.entry.previous = state.alive ? state.previous : null;
				state.entry.next = state.alive ? state.next : null;
			}
			head = virtualHead;
			tail = virtualTail;
			for (const [key, entry] of keyOverlay) {
				structuralCount("collection.publish.key-overlay-visits", "iteration", "keyed_collection.ts:apply-publish");
				if (entry === null) byKey.delete(key);
				else byKey.set(key, entry);
			}
			version++;
			const batch = Object.freeze({
				fromVersion: version - 1,
				version,
				operations: batchOperations
			});
			history.push(batch);
			pruneAcknowledged();
			capHistory();
			const errors = [];
			notificationQueue.push({
				batch,
				listeners: [...listeners]
			});
			if (!drainingNotifications) {
				drainingNotifications = true;
				try {
					while (notificationQueue.length > 0) {
						const pending = notificationQueue.shift();
						for (const listener of pending.listeners) {
							structuralCount("collection.listener-callbacks", "event", "keyed_collection.ts:apply-notify");
							listenerNotifications++;
							try {
								listener(pending.batch);
							} catch (error) {
								listenerErrors++;
								errors.push(error);
							}
						}
					}
				} finally {
					drainingNotifications = false;
				}
			}
			if (errors.length > 0) throw new AggregateError(errors, `Keyed collection committed version ${version}, but ${errors.length} listener(s) failed`);
			return {
				ok: true,
				version
			};
		},
		subscribe(listener) {
			if (typeof listener !== "function") throw new TypeError("listener must be a function");
			listeners.add(listener);
			let subscribed = true;
			return () => {
				if (!subscribed) return;
				subscribed = false;
				listeners.delete(listener);
			};
		},
		createReader() {
			const reader = {
				version,
				readThrough: version,
				detached: false
			};
			readers.add(reader);
			const ensureAttached = () => {
				if (reader.detached) throw new Error("Keyed collection reader is detached");
			};
			return Object.freeze({
				read() {
					ensureAttached();
					const oldestAvailableVersion = history[0]?.fromVersion ?? version;
					if (reader.version < oldestAvailableVersion) return Object.freeze({
						status: "unavailable",
						requestedVersion: reader.version,
						oldestAvailableVersion,
						currentVersion: version
					});
					const batches = history.filter((batch) => {
						structuralCount("collection.reader.history-visits", "iteration", "keyed_collection.ts:reader-read");
						return batch.version > reader.version;
					});
					reader.readThrough = version;
					return Object.freeze({
						status: "available",
						fromVersion: reader.version,
						toVersion: version,
						batches: Object.freeze(batches)
					});
				},
				acknowledge(ackVersion) {
					ensureAttached();
					if (!Number.isSafeInteger(ackVersion) || ackVersion < reader.version || ackVersion > reader.readThrough) return false;
					reader.version = ackVersion;
					pruneAcknowledged();
					return true;
				},
				resetTo(resetVersion) {
					ensureAttached();
					if (resetVersion !== version) return false;
					reader.version = resetVersion;
					reader.readThrough = resetVersion;
					pruneAcknowledged();
					return true;
				},
				detach() {
					if (reader.detached) return;
					reader.detached = true;
					readers.delete(reader);
					pruneAcknowledged();
				}
			});
		},
		stats() {
			return Object.freeze({
				entryInspections,
				anchorInspections,
				retainedBatches: history.length,
				readerCount: readers.size,
				listenerNotifications,
				listenerErrors
			});
		},
		resetStats() {
			entryInspections = 0;
			anchorInspections = 0;
			listenerNotifications = 0;
			listenerErrors = 0;
		}
	};
}
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/snapshot/src/native_runtime_api.ts
/** Public native author API; `jsx` uses the classic variadic factory ABI. */
var createDOMRoot = (container, options = {}) => new ComponentStateRoot(new DOMVDOMHost(), container, options);
//#endregion
//#region .cache/structural-locality-protocol-v1/eligibility/native_collection.tsx
defineComponent(".cache/structural-locality-protocol-v1/eligibility/native_collection.tsx#component:NativeCollectionBoard", NativeCollectionBoard, { propOnlySites: [] });
defineComponent(".cache/structural-locality-protocol-v1/eligibility/native_collection.tsx#component:NativeRow", NativeRow, { propOnlySites: [] });
var makeRows = (ids) => createKeyedCollection(ids.map((id) => ({ id })), (row) => row.id);
function NativeRow({ id, life }) {
	const [selected, setSelected] = useStateAt(".cache/structural-locality-protocol-v1/eligibility/native_collection.tsx#component:NativeRow#state:0", false);
	useEffectAt(".cache/structural-locality-protocol-v1/eligibility/native_collection.tsx#component:NativeRow#effect:0", () => {
		life.mounted(id);
		return () => life.cleaned(id);
	});
	return /* @__PURE__ */ jsx("li", {
		"data-id": id,
		"data-selected": String(selected),
		onClick: () => setSelected((prior) => !prior)
	}, id);
}
function NativeCollectionBoard({ rows, life }) {
	return /* @__PURE__ */ jsx("ul", { "data-list": "rows" }, renderCollectionAt(".cache/structural-locality-protocol-v1/eligibility/native_collection.tsx#component:NativeCollectionBoard#collection:0", rows, ((row) => /* @__PURE__ */ jsx(NativeRow, {
		key: row.id,
		id: row.id,
		life
	}))));
}
//#endregion
//#region .cache/structural-locality-protocol-v1/eligibility/native_generic.tsx
defineComponent(".cache/structural-locality-protocol-v1/eligibility/native_generic.tsx#component:GenericRow", GenericRow, { propOnlySites: [] });
defineComponent(".cache/structural-locality-protocol-v1/eligibility/native_generic.tsx#component:NativeGenericBoard", NativeGenericBoard, { propOnlySites: [] });
function GenericRow({ id, life }) {
	const [selected, setSelected] = useStateAt(".cache/structural-locality-protocol-v1/eligibility/native_generic.tsx#component:GenericRow#state:0", false);
	useEffectAt(".cache/structural-locality-protocol-v1/eligibility/native_generic.tsx#component:GenericRow#effect:0", () => {
		life.mounted(id);
		return () => life.cleaned(id);
	});
	return /* @__PURE__ */ jsx("li", {
		"data-id": id,
		"data-selected": String(selected),
		onClick: () => setSelected((prior) => !prior)
	}, id);
}
function NativeGenericBoard({ initialIds, life, registerIdsSetter }) {
	const [ids, setIds] = useStateAt(".cache/structural-locality-protocol-v1/eligibility/native_generic.tsx#component:NativeGenericBoard#state:0", [...initialIds]);
	useEffectAt(".cache/structural-locality-protocol-v1/eligibility/native_generic.tsx#component:NativeGenericBoard#effect:0", () => {
		return registerIdsSetter(setIds);
	});
	return /* @__PURE__ */ jsx("ul", { "data-list": "rows" }, ids.map((id) => /* @__PURE__ */ jsx(GenericRow, {
		key: id,
		id,
		life
	})));
}
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/frontend-size-v2/native_controller.tsx
defineComponent(".cache/structural-locality-recording-v1/diagnostic-v1/frontend-size-v2/native_controller.tsx#component:NativeCollectionMount", NativeCollectionMount, { propOnlySites: [] });
defineComponent(".cache/structural-locality-recording-v1/diagnostic-v1/frontend-size-v2/native_controller.tsx#component:NativeGenericMount", NativeGenericMount, { propOnlySites: [] });
function describeThrown$1(value) {
	const kind = value === null ? "null" : typeof value;
	try {
		return {
			kind,
			message: String(value)
		};
	} catch {
		return {
			kind,
			message: "<unprintable thrown value>"
		};
	}
}
function NativeCollectionMount({ rows, life }) {
	return /* @__PURE__ */ jsx(NativeCollectionBoard, {
		rows,
		life
	});
}
function NativeGenericMount({ initialIds, life, registerIdsSetter }) {
	return /* @__PURE__ */ jsx(NativeGenericBoard, {
		initialIds,
		life,
		registerIdsSetter
	});
}
function mountNativeCount(container, initialIds, life, countMode, profileCounter) {
	configureStructuralCountProbe(countMode);
	const root = createDOMRoot(container, {
		scheduleCommit: () => {},
		profileCounter
	});
	const rows = makeRows(initialIds);
	try {
		root.mount(/* @__PURE__ */ jsx(NativeCollectionMount, {
			rows,
			life
		}));
		root.flush();
	} catch (error) {
		try {
			root.dispose();
		} catch (disposal) {
			throw new Error(`mount ${String(error)}; disposal ${String(disposal)}`);
		}
		throw error;
	}
	return {
		click(id) {
			const node = [...container.querySelectorAll("li[data-id]")].find((item) => item.dataset.id === id);
			if (!node) throw new Error(`missing click target ${id}`);
			node.click();
			root.flush();
		},
		reset(operations) {
			if (operations.length === 0) return null;
			const applied = rows.apply(rows.version, operations);
			if (!applied.ok) throw new Error(`reset rejected ${applied.reason}`);
			if (!root.flush()) throw new Error("reset lacked synchronous commit");
			return applied.version;
		},
		edit(label, operations) {
			const statsBefore = rows.stats();
			const expectedVersion = rows.version;
			let applyResult = null;
			let flushResult = null;
			let receipt = null;
			let editThrew = false;
			let editThrown;
			let receiptThrew = false;
			let receiptThrown;
			if (countMode) beginStructuralCountWindow(root, label);
			try {
				applyResult = rows.apply(expectedVersion, operations);
				if (!applyResult.ok) throw new Error(`edit rejected ${applyResult.reason}`);
				flushResult = root.flush();
				if (flushResult !== true) throw new Error("edit lacked synchronous commit");
			} catch (error) {
				editThrew = true;
				editThrown = error;
			} finally {
				if (countMode) try {
					receipt = endStructuralCountWindow(root);
				} catch (error) {
					receiptThrew = true;
					receiptThrown = error;
				}
			}
			const afterCollectionVersion = rows.version;
			const statsAfter = rows.stats();
			const pendingChangeCount = root.diagnostics().pendingChangeCount;
			if (editThrew || receiptThrew) {
				const failure = /* @__PURE__ */ new Error(`native edit failed: edit=${editThrew ? JSON.stringify(describeThrown$1(editThrown)) : "none"}; receipt=${receiptThrew ? JSON.stringify(describeThrown$1(receiptThrown)) : "none"}`);
				Object.assign(failure, {
					editThrew,
					editThrown,
					receiptThrew,
					receiptThrown,
					receipt
				});
				throw failure;
			}
			return {
				receipt,
				statsBefore,
				statsAfter,
				expectedVersion,
				applyResult,
				afterCollectionVersion,
				flushResult,
				pendingChangeCount
			};
		},
		dispose() {
			root.dispose();
			return {
				readerCount: rows.stats().readerCount,
				ownerCount: root.diagnostics().ownerCount
			};
		}
	};
}
//#endregion
//#region node_modules/.pnpm/react@19.3.0/node_modules/react/cjs/react.production.js
/**
* @license React
* react.production.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_react_production = /* @__PURE__ */ __commonJSMin(((exports) => {
	var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
	var REACT_PORTAL_TYPE = Symbol.for("react.portal");
	var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
	var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
	var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
	var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
	var REACT_CONTEXT_TYPE = Symbol.for("react.context");
	var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
	var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
	var REACT_MEMO_TYPE = Symbol.for("react.memo");
	var REACT_LAZY_TYPE = Symbol.for("react.lazy");
	var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
	var REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition");
	var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
	function getIteratorFn(maybeIterable) {
		if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
		maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
		return "function" === typeof maybeIterable ? maybeIterable : null;
	}
	var ReactNoopUpdateQueue = {
		isMounted: function() {
			return !1;
		},
		enqueueForceUpdate: function() {},
		enqueueReplaceState: function() {},
		enqueueSetState: function() {}
	};
	var assign = Object.assign;
	var emptyObject = {};
	function Component(props, context, updater) {
		this.props = props;
		this.context = context;
		this.refs = emptyObject;
		this.updater = updater || ReactNoopUpdateQueue;
	}
	Component.prototype.isReactComponent = {};
	Component.prototype.setState = function(partialState, callback) {
		if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState) throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
		this.updater.enqueueSetState(this, partialState, callback, "setState");
	};
	Component.prototype.forceUpdate = function(callback) {
		this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
	};
	function ComponentDummy() {}
	ComponentDummy.prototype = Component.prototype;
	function PureComponent(props, context, updater) {
		this.props = props;
		this.context = context;
		this.refs = emptyObject;
		this.updater = updater || ReactNoopUpdateQueue;
	}
	var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
	pureComponentPrototype.constructor = PureComponent;
	assign(pureComponentPrototype, Component.prototype);
	pureComponentPrototype.isPureReactComponent = !0;
	var isArrayImpl = Array.isArray;
	function noop() {}
	var ReactSharedInternals = {
		H: null,
		A: null,
		T: null,
		S: null
	};
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	function ReactElement(type, key, props) {
		var refProp = props.ref;
		return {
			$$typeof: REACT_ELEMENT_TYPE,
			type,
			key,
			ref: void 0 !== refProp ? refProp : null,
			props
		};
	}
	function cloneAndReplaceKey(oldElement, newKey) {
		return ReactElement(oldElement.type, newKey, oldElement.props);
	}
	function isValidElement(object) {
		return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
	}
	function escape(key) {
		var escaperLookup = {
			"=": "=0",
			":": "=2"
		};
		return "$" + key.replace(/[=:]/g, function(match) {
			return escaperLookup[match];
		});
	}
	var userProvidedKeyEscapeRegex = /\/+/g;
	function getElementKey(element, index) {
		return "object" === typeof element && null !== element && null != element.key ? escape("" + element.key) : index.toString(36);
	}
	function resolveThenable(thenable) {
		switch (thenable.status) {
			case "fulfilled": return thenable.value;
			case "rejected": throw thenable.reason;
			default: switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(function(fulfilledValue) {
				"pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
			}, function(error) {
				"pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
			})), thenable.status) {
				case "fulfilled": return thenable.value;
				case "rejected": throw thenable.reason;
			}
		}
		throw thenable;
	}
	function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
		var type = typeof children;
		if ("undefined" === type || "boolean" === type) children = null;
		var invokeCallback = !1;
		if (null === children) invokeCallback = !0;
		else switch (type) {
			case "bigint":
			case "string":
			case "number":
				invokeCallback = !0;
				break;
			case "object": switch (children.$$typeof) {
				case REACT_ELEMENT_TYPE:
				case REACT_PORTAL_TYPE:
					invokeCallback = !0;
					break;
				case REACT_LAZY_TYPE: return invokeCallback = children._init, mapIntoArray(invokeCallback(children._payload), array, escapedPrefix, nameSoFar, callback);
			}
		}
		if (invokeCallback) return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
			return c;
		})) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(callback, escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(userProvidedKeyEscapeRegex, "$&/") + "/") + invokeCallback)), array.push(callback)), 1;
		invokeCallback = 0;
		var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
		if (isArrayImpl(children)) for (var i = 0; i < children.length; i++) nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
		else if (i = getIteratorFn(children), "function" === typeof i) for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done;) nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
		else if ("object" === type) {
			if ("function" === typeof children.then) return mapIntoArray(resolveThenable(children), array, escapedPrefix, nameSoFar, callback);
			array = String(children);
			throw Error("Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead.");
		}
		return invokeCallback;
	}
	function mapChildren(children, func, context) {
		if (null == children) return children;
		var result = [], count = 0;
		mapIntoArray(children, result, "", "", function(child) {
			return func.call(context, child, count++);
		});
		return result;
	}
	function lazyInitializer(payload) {
		if (-1 === payload._status) {
			var ctor = payload._result, thenable = ctor();
			thenable.then(function(moduleObject) {
				if (0 === payload._status || -1 === payload._status) payload._status = 1, payload._result = moduleObject, void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
			}, function(error) {
				if (0 === payload._status || -1 === payload._status) payload._status = 2, payload._result = error, void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
			});
			-1 === payload._status && (payload._status = 0, payload._result = thenable);
		}
		if (1 === payload._status) return payload._result.default;
		throw payload._result;
	}
	var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
		if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
			var event = new window.ErrorEvent("error", {
				bubbles: !0,
				cancelable: !0,
				message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
				error
			});
			if (!window.dispatchEvent(event)) return;
		} else if ("object" === typeof process && "function" === typeof process.emit) {
			process.emit("uncaughtException", error);
			return;
		}
		console.error(error);
	};
	function startTransition(scope) {
		var prevTransition = ReactSharedInternals.T, currentTransition = {};
		currentTransition.types = null !== prevTransition ? prevTransition.types : null;
		ReactSharedInternals.T = currentTransition;
		try {
			var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
			null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
			"object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
		} catch (error) {
			reportGlobalError(error);
		} finally {
			null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
		}
	}
	function addTransitionType(type) {
		var transition = ReactSharedInternals.T;
		if (null !== transition) {
			var transitionTypes = transition.types;
			null === transitionTypes ? transition.types = [type] : -1 === transitionTypes.indexOf(type) && transitionTypes.push(type);
		} else startTransition(addTransitionType.bind(null, type));
	}
	var Children = {
		map: mapChildren,
		forEach: function(children, forEachFunc, forEachContext) {
			mapChildren(children, function() {
				forEachFunc.apply(this, arguments);
			}, forEachContext);
		},
		count: function(children) {
			var n = 0;
			mapChildren(children, function() {
				n++;
			});
			return n;
		},
		toArray: function(children) {
			return mapChildren(children, function(child) {
				return child;
			}) || [];
		},
		only: function(children) {
			if (!isValidElement(children)) throw Error("React.Children.only expected to receive a single React element child.");
			return children;
		}
	};
	exports.Activity = REACT_ACTIVITY_TYPE;
	exports.Children = Children;
	exports.Component = Component;
	exports.Fragment = REACT_FRAGMENT_TYPE;
	exports.Profiler = REACT_PROFILER_TYPE;
	exports.PureComponent = PureComponent;
	exports.StrictMode = REACT_STRICT_MODE_TYPE;
	exports.Suspense = REACT_SUSPENSE_TYPE;
	exports.ViewTransition = REACT_VIEW_TRANSITION_TYPE;
	exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
	exports.__COMPILER_RUNTIME = {
		__proto__: null,
		c: function(size) {
			return ReactSharedInternals.H.useMemoCache(size);
		}
	};
	exports.addTransitionType = addTransitionType;
	exports.cache = function(fn) {
		return function() {
			return fn.apply(null, arguments);
		};
	};
	exports.cacheSignal = function() {
		return null;
	};
	exports.cloneElement = function(element, config, children) {
		if (null === element || void 0 === element) throw Error("The argument must be a React element, but you passed " + element + ".");
		var props = assign({}, element.props), key = element.key;
		if (null != config) for (propName in void 0 !== config.key && (key = "" + config.key), config) !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
		var propName = arguments.length - 2;
		if (1 === propName) props.children = children;
		else if (1 < propName) {
			for (var childArray = Array(propName), i = 0; i < propName; i++) childArray[i] = arguments[i + 2];
			props.children = childArray;
		}
		return ReactElement(element.type, key, props);
	};
	exports.createContext = function(defaultValue) {
		defaultValue = {
			$$typeof: REACT_CONTEXT_TYPE,
			_currentValue: defaultValue,
			_currentValue2: defaultValue,
			_threadCount: 0,
			Provider: null,
			Consumer: null
		};
		defaultValue.Provider = defaultValue;
		defaultValue.Consumer = {
			$$typeof: REACT_CONSUMER_TYPE,
			_context: defaultValue
		};
		return defaultValue;
	};
	exports.createElement = function(type, config, children) {
		var propName, props = {}, key = null;
		if (null != config) for (propName in void 0 !== config.key && (key = "" + config.key), config) hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
		var childrenLength = arguments.length - 2;
		if (1 === childrenLength) props.children = children;
		else if (1 < childrenLength) {
			for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++) childArray[i] = arguments[i + 2];
			props.children = childArray;
		}
		if (type && type.defaultProps) for (propName in childrenLength = type.defaultProps, childrenLength) void 0 === props[propName] && (props[propName] = childrenLength[propName]);
		return ReactElement(type, key, props);
	};
	exports.createRef = function() {
		return { current: null };
	};
	exports.forwardRef = function(render) {
		return {
			$$typeof: REACT_FORWARD_REF_TYPE,
			render
		};
	};
	exports.isValidElement = isValidElement;
	exports.lazy = function(ctor) {
		return {
			$$typeof: REACT_LAZY_TYPE,
			_payload: {
				_status: -1,
				_result: ctor
			},
			_init: lazyInitializer
		};
	};
	exports.memo = function(type, compare) {
		return {
			$$typeof: REACT_MEMO_TYPE,
			type,
			compare: void 0 === compare ? null : compare
		};
	};
	exports.startTransition = startTransition;
	exports.unstable_useCacheRefresh = function() {
		return ReactSharedInternals.H.useCacheRefresh();
	};
	exports.use = function(usable) {
		return ReactSharedInternals.H.use(usable);
	};
	exports.useActionState = function(action, initialState, permalink) {
		return ReactSharedInternals.H.useActionState(action, initialState, permalink);
	};
	exports.useCallback = function(callback, deps) {
		return ReactSharedInternals.H.useCallback(callback, deps);
	};
	exports.useContext = function(Context) {
		return ReactSharedInternals.H.useContext(Context);
	};
	exports.useDebugValue = function() {};
	exports.useDeferredValue = function(value, initialValue) {
		return ReactSharedInternals.H.useDeferredValue(value, initialValue);
	};
	exports.useEffect = function(create, deps) {
		return ReactSharedInternals.H.useEffect(create, deps);
	};
	exports.useEffectEvent = function(callback) {
		return ReactSharedInternals.H.useEffectEvent(callback);
	};
	exports.useId = function() {
		return ReactSharedInternals.H.useId();
	};
	exports.useImperativeHandle = function(ref, create, deps) {
		return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
	};
	exports.useInsertionEffect = function(create, deps) {
		return ReactSharedInternals.H.useInsertionEffect(create, deps);
	};
	exports.useLayoutEffect = function(create, deps) {
		return ReactSharedInternals.H.useLayoutEffect(create, deps);
	};
	exports.useMemo = function(create, deps) {
		return ReactSharedInternals.H.useMemo(create, deps);
	};
	exports.useOptimistic = function(passthrough, reducer) {
		return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
	};
	exports.useReducer = function(reducer, initialArg, init) {
		return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
	};
	exports.useRef = function(initialValue) {
		return ReactSharedInternals.H.useRef(initialValue);
	};
	exports.useState = function(initialState) {
		return ReactSharedInternals.H.useState(initialState);
	};
	exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
		return ReactSharedInternals.H.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
	};
	exports.useTransition = function() {
		return ReactSharedInternals.H.useTransition();
	};
	exports.version = "19.3.0";
}));
//#endregion
//#region node_modules/.pnpm/react@19.3.0/node_modules/react/index.js
var require_react = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_react_production();
}));
//#endregion
//#region node_modules/.pnpm/react@19.3.0/node_modules/react/cjs/react-compiler-runtime.production.js
/**
* @license React
* react-compiler-runtime.production.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_react_compiler_runtime_production = /* @__PURE__ */ __commonJSMin(((exports) => {
	var ReactSharedInternals = require_react().__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
	exports.c = function(size) {
		return ReactSharedInternals.H.useMemoCache(size);
	};
}));
//#endregion
//#region node_modules/.pnpm/react@19.3.0/node_modules/react/compiler-runtime.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_compiler_runtime = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_react_compiler_runtime_production();
}));
//#endregion
//#region node_modules/.pnpm/react@19.3.0/node_modules/react/cjs/react-jsx-runtime.production.js
/**
* @license React
* react-jsx-runtime.production.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_react_jsx_runtime_production = /* @__PURE__ */ __commonJSMin(((exports) => {
	var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
	function jsxProd(type, config, maybeKey) {
		var key = null;
		void 0 !== maybeKey && (key = "" + maybeKey);
		void 0 !== config.key && (key = "" + config.key);
		if ("key" in config) {
			maybeKey = {};
			for (var propName in config) "key" !== propName && (maybeKey[propName] = config[propName]);
		} else maybeKey = config;
		config = maybeKey.ref;
		return {
			$$typeof: REACT_ELEMENT_TYPE,
			type,
			key,
			ref: void 0 !== config ? config : null,
			props: maybeKey
		};
	}
	exports.jsx = jsxProd;
}));
//#endregion
//#region node_modules/.pnpm/react@19.3.0/node_modules/react/jsx-runtime.js
var require_jsx_runtime = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_react_jsx_runtime_production();
}));
//#endregion
//#region .cache/structural-locality-protocol-v1/eligibility/react_array.tsx
var import_compiler_runtime = require_compiler_runtime();
var import_react = require_react();
var import_jsx_runtime = require_jsx_runtime();
function ReactRow(t0) {
	const $ = (0, import_compiler_runtime.c)(8);
	const { id, life } = t0;
	const [selected, setSelected] = (0, import_react.useState)(false);
	let t1;
	let t2;
	if ($[0] !== id || $[1] !== life) {
		t1 = () => {
			life.mounted(id);
			return () => life.cleaned(id);
		};
		t2 = [id, life];
		$[0] = id;
		$[1] = life;
		$[2] = t1;
		$[3] = t2;
	} else {
		t1 = $[2];
		t2 = $[3];
	}
	(0, import_react.useLayoutEffect)(t1, t2);
	const t3 = String(selected);
	let t4;
	if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
		t4 = () => setSelected(_temp);
		$[4] = t4;
	} else t4 = $[4];
	let t5;
	if ($[5] !== id || $[6] !== t3) {
		t5 = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
			"data-id": id,
			"data-selected": t3,
			onClick: t4,
			children: id
		});
		$[5] = id;
		$[6] = t3;
		$[7] = t5;
	} else t5 = $[7];
	return t5;
}
function _temp(prior) {
	return !prior;
}
function ReactArrayBoard(t0) {
	const $ = (0, import_compiler_runtime.c)(12);
	const { initialIds, life, registerIdsSetter } = t0;
	let t1;
	if ($[0] !== initialIds) {
		t1 = () => [...initialIds];
		$[0] = initialIds;
		$[1] = t1;
	} else t1 = $[1];
	const [ids, setIds] = (0, import_react.useState)(t1);
	let t2;
	let t3;
	if ($[2] !== registerIdsSetter) {
		t2 = () => registerIdsSetter(setIds);
		t3 = [registerIdsSetter];
		$[2] = registerIdsSetter;
		$[3] = t2;
		$[4] = t3;
	} else {
		t2 = $[3];
		t3 = $[4];
	}
	(0, import_react.useLayoutEffect)(t2, t3);
	let t4;
	if ($[5] !== ids || $[6] !== life) {
		let t5;
		if ($[8] !== life) {
			t5 = (id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReactRow, {
				id,
				life
			}, id);
			$[8] = life;
			$[9] = t5;
		} else t5 = $[9];
		t4 = ids.map(t5);
		$[5] = ids;
		$[6] = life;
		$[7] = t4;
	} else t4 = $[7];
	let t5;
	if ($[10] !== t4) {
		t5 = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			"data-list": "rows",
			children: t4
		});
		$[10] = t4;
		$[11] = t5;
	} else t5 = $[11];
	return t5;
}
//#endregion
//#region .cache/structural-locality-recording-v1/model/schedule.mjs
var SIZES = Object.freeze([
	128,
	1024,
	1e4
]);
var OPERATION_KINDS = Object.freeze([
	"insert-head",
	"insert-middle",
	"insert-tail",
	"remove-head",
	"remove-middle",
	"remove-tail",
	"move-head",
	"move-middle",
	"move-tail",
	"same-key-rotation",
	"edge-replacement",
	"odd-key-filter"
]);
var PAIR_INDEXES = Object.freeze([
	0,
	1,
	2,
	3,
	4
]);
var SCHEDULE_LABEL = "proposal-formula-v1";
var PROPOSED_SEED_LABEL = "0x5b2026";
var freezeArray = (items) => Object.freeze(items);
var rowId = (index) => `row-${index}`;
var canonicalIds = (size) => freezeArray(Array.from({ length: size }, (_, index) => rowId(index)));
function armOrder(sizeIndex, pairIndex) {
	if (!Number.isInteger(sizeIndex) || sizeIndex < 0 || sizeIndex >= SIZES.length || !PAIR_INDEXES.includes(pairIndex)) throw new RangeError("invalid size/pair index");
	return freezeArray(pairIndex % 2 === 0 !== (sizeIndex === 1) ? ["native", "react"] : ["react", "native"]);
}
function orderedKinds(sizeIndex, pairIndex, trialIndex) {
	if (!Number.isInteger(sizeIndex) || sizeIndex < 0 || sizeIndex >= SIZES.length || !PAIR_INDEXES.includes(pairIndex) || !Number.isInteger(trialIndex) || trialIndex < 0 || trialIndex >= 10) throw new RangeError("invalid schedule coordinate");
	const rotation = (sizeIndex + pairIndex + trialIndex) % OPERATION_KINDS.length;
	const rotated = [...OPERATION_KINDS.slice(rotation), ...OPERATION_KINDS.slice(0, rotation)];
	return freezeArray(trialIndex % 2 === 1 ? rotated.reverse() : rotated);
}
function immutableOperation(operation) {
	if (operation.value) Object.freeze(operation.value);
	return Object.freeze(operation);
}
function applyOperationsToIds(ids, operations) {
	if (operations.length > 1 && operations.every((item) => item.type === "remove")) {
		const live = new Set(ids);
		const removed = /* @__PURE__ */ new Set();
		for (const operation of operations) {
			if (!live.has(operation.key)) throw Error(`missing remove key ${operation.key}`);
			if (removed.has(operation.key)) throw Error(`duplicate remove key ${operation.key}`);
			removed.add(operation.key);
		}
		return freezeArray(ids.filter((id) => !removed.has(id)));
	}
	const result = [...ids];
	for (const operation of operations) if (operation.type === "remove") {
		const index = result.indexOf(operation.key);
		if (index < 0) throw Error(`missing remove key ${operation.key}`);
		result.splice(index, 1);
	} else if (operation.type === "insert") {
		if (result.includes(operation.key)) throw Error(`duplicate insert key ${operation.key}`);
		const index = operation.beforeKey === null ? result.length : result.indexOf(operation.beforeKey);
		if (index < 0) throw Error(`missing insert anchor ${operation.beforeKey}`);
		result.splice(index, 0, operation.key);
	} else if (operation.type === "move") {
		const from = result.indexOf(operation.key);
		if (from < 0) throw Error(`missing move key ${operation.key}`);
		result.splice(from, 1);
		const to = operation.beforeKey === null ? result.length : result.indexOf(operation.beforeKey);
		if (to < 0) throw Error(`missing move anchor ${operation.beforeKey}`);
		result.splice(to, 0, operation.key);
	} else throw Error(`unexpected operation ${operation.type}`);
	return freezeArray(result);
}
function editFor(size, pairIndex, trialIndex, kind) {
	const sizeIndex = SIZES.indexOf(size);
	if (sizeIndex < 0 || !PAIR_INDEXES.includes(pairIndex) || !Number.isInteger(trialIndex) || trialIndex < 0 || trialIndex >= 10 || !OPERATION_KINDS.includes(kind)) throw new RangeError("invalid edit coordinate");
	const ids = canonicalIds(size);
	const middle = Math.floor(size / 2);
	const freshKey = `new-n${size}-p${pairIndex}-t${trialIndex}-${kind}`;
	const insert = (beforeKey) => immutableOperation({
		type: "insert",
		key: freshKey,
		value: { id: freshKey },
		beforeKey
	});
	const remove = (key) => immutableOperation({
		type: "remove",
		key
	});
	const move = (key, beforeKey) => immutableOperation({
		type: "move",
		key,
		beforeKey
	});
	let operations;
	let movingKey = null;
	switch (kind) {
		case "insert-head":
			operations = [insert(rowId(0))];
			break;
		case "insert-middle":
			operations = [insert(rowId(middle))];
			break;
		case "insert-tail":
			operations = [insert(null)];
			break;
		case "remove-head":
			operations = [remove(rowId(0))];
			break;
		case "remove-middle":
			operations = [remove(rowId(middle))];
			break;
		case "remove-tail":
			operations = [remove(rowId(size - 1))];
			break;
		case "move-head":
			movingKey = rowId(size - 1);
			operations = [move(movingKey, rowId(0))];
			break;
		case "move-middle":
			movingKey = rowId(0);
			operations = [move(movingKey, rowId(middle))];
			break;
		case "move-tail":
			movingKey = rowId(0);
			operations = [move(movingKey, null)];
			break;
		case "same-key-rotation":
			movingKey = rowId(0);
			operations = [move(movingKey, null)];
			break;
		case "edge-replacement":
			operations = [remove(rowId(size - 1)), insert(rowId(0))];
			break;
		case "odd-key-filter": operations = Array.from({ length: size / 2 }, (_, index) => remove(rowId(index * 2 + 1)));
	}
	const nativeOperations = freezeArray(operations);
	const nextIds = applyOperationsToIds(ids, nativeOperations);
	const addedIds = freezeArray(operations.filter((item) => item.type === "insert").map((item) => item.key));
	const removedIds = freezeArray(operations.filter((item) => item.type === "remove").map((item) => item.key));
	return Object.freeze({
		id: `n${size}-p${pairIndex}-t${trialIndex}-${kind}`,
		size,
		sizeIndex,
		pairIndex,
		trialIndex,
		sampleKind: trialIndex < 2 ? "warmup" : "measured",
		measuredIndex: trialIndex < 2 ? null : trialIndex - 2,
		kind,
		canonicalIds: ids,
		nativeOperations,
		nextIds,
		movingKey,
		selectedBeforeIds: freezeArray(movingKey ? [rowId(2), movingKey] : [rowId(2)]),
		addedIds,
		removedIds,
		changedKeys: addedIds.length + removedIds.length || (movingKey ? 1 : 0),
		beforeSize: size,
		afterSize: nextIds.length
	});
}
function pageSchedule({ size, pairIndex = 0, arm, pageKind = "latency" }) {
	const sizeIndex = SIZES.indexOf(size);
	if (sizeIndex < 0 || !PAIR_INDEXES.includes(pairIndex) || ![
		"native",
		"react",
		"generic"
	].includes(arm) || ![
		"latency",
		"count",
		"oracle"
	].includes(pageKind) || pageKind === "latency" && arm === "generic" || pageKind === "count" && arm !== "native" || pageKind === "oracle" && arm !== "generic" || pageKind !== "latency" && pairIndex !== 0) throw new RangeError("invalid page coordinate");
	const trials = [];
	for (let trialIndex = 0; trialIndex < 10; trialIndex++) orderedKinds(sizeIndex, pairIndex, trialIndex).forEach((kind, operationIndex) => trials.push(Object.freeze({
		...editFor(size, pairIndex, trialIndex, kind),
		operationIndex,
		blockId: `n${size}-p${pairIndex}`,
		trialId: `n${size}-p${pairIndex}-t${trialIndex}`
	})));
	return Object.freeze({
		id: `${pageKind}-n${size}-p${pairIndex}-${arm}`,
		scheduleLabel: SCHEDULE_LABEL,
		proposedSeedLabel: PROPOSED_SEED_LABEL,
		size,
		sizeIndex,
		pairIndex,
		arm,
		pageKind,
		armOrder: armOrder(sizeIndex, pairIndex),
		trialCountPerOperation: 10,
		warmupTrialsPerOperation: 2,
		measuredTrialsPerOperation: 8,
		trials: freezeArray(trials)
	});
}
//#endregion
//#region .cache/structural-locality-recording-v1/model/model.mjs
var check = (condition, message) => {
	if (!condition) throw Error(message);
};
var equal = (actual, expected, message) => check(Object.is(actual, expected), `${message}: ${String(actual)} != ${String(expected)}`);
var sameArray = (actual, expected, message) => {
	check(actual.length === expected.length, `${message}: length ${actual.length} != ${expected.length}`);
	for (let index = 0; index < actual.length; index++) equal(actual[index], expected[index], `${message} at ${index}`);
};
var freezeRows = (rows) => Object.freeze(rows.map((row) => Object.freeze(row)));
var stateOf = (rows, generations) => Object.freeze({
	rows: freezeRows(rows),
	generations
});
var canonicalId = (index) => `row-${index}`;
function initialModel(size) {
	if (!SIZES.includes(size)) throw new RangeError("unsupported registered size");
	const rows = Array.from({ length: size }, (_, index) => ({
		id: canonicalId(index),
		incarnation: `${canonicalId(index)}#1`,
		selected: false
	}));
	return stateOf(rows, new Map(rows.map((row) => [row.id, 1])));
}
function identityDelta(before, after) {
	const previous = new Map(before.rows.map((row) => [row.id, row]));
	const next = new Map(after.rows.map((row) => [row.id, row]));
	const retained = [], mounted = [], cleaned = [];
	for (const row of after.rows) {
		const old = previous.get(row.id);
		if (old) {
			equal(row.incarnation, old.incarnation, `retained ${row.id} changed incarnation`);
			retained.push(row.id);
		} else mounted.push(row.id);
	}
	for (const row of before.rows) if (!next.has(row.id)) cleaned.push(row.id);
	return Object.freeze({
		retained: Object.freeze(retained),
		mounted: Object.freeze(mounted),
		cleaned: Object.freeze(cleaned)
	});
}
function restoreCanonical(current, size) {
	if (!SIZES.includes(size)) throw new RangeError("unsupported registered size");
	const previous = new Map(current.rows.map((row) => [row.id, row]));
	const generations = new Map(current.generations);
	const state = stateOf(Array.from({ length: size }, (_, index) => {
		const id = canonicalId(index);
		const retained = previous.get(id);
		if (retained) return {
			id,
			incarnation: retained.incarnation,
			selected: id === "row-2" ? retained.selected : false
		};
		const generation = (generations.get(id) ?? 0) + 1;
		generations.set(id, generation);
		return {
			id,
			incarnation: `${id}#${generation}`,
			selected: false
		};
	}), generations);
	const resetSelectionChanges = state.rows.flatMap((row) => {
		const old = previous.get(row.id);
		if (!old || old.incarnation !== row.incarnation || old.selected === row.selected) return [];
		return [{
			id: row.id,
			incarnation: row.incarnation,
			fromSelected: old.selected,
			toSelected: row.selected
		}];
	});
	return Object.freeze({
		state,
		lifecycle: identityDelta(current, state),
		resetSelectionChanges: Object.freeze(resetSelectionChanges.map((item) => Object.freeze(item))),
		phase: "untimed-canonical-reset"
	});
}
function prepareTrial(current, trial) {
	check(current && trial && SIZES.includes(trial.size), "invalid trial preparation");
	const reset = restoreCanonical(current, trial.size);
	sameArray(reset.state.rows.map((row) => row.id), trial.canonicalIds, "canonical reset order");
	const selected = new Set(trial.selectedBeforeIds);
	check(selected.has("row-2"), "sentinel must be selected before each edit");
	if (trial.movingKey) check(selected.has(trial.movingKey), "moving key must be selected");
	const preselectionChanges = reset.state.rows.flatMap((row) => {
		const wanted = selected.has(row.id);
		if (row.selected === wanted) return [];
		return [{
			id: row.id,
			incarnation: row.incarnation,
			fromSelected: row.selected,
			toSelected: wanted
		}];
	});
	const state = stateOf(reset.state.rows.map((row) => ({
		...row,
		selected: selected.has(row.id)
	})), reset.state.generations);
	return Object.freeze({
		state,
		reset: reset.lifecycle,
		resetSelectionChanges: reset.resetSelectionChanges,
		preselectionChanges: Object.freeze(preselectionChanges.map((item) => Object.freeze(item))),
		phase: "untimed-reset-and-preselection"
	});
}
function applyExpectedEdit(prepared, trial) {
	check(prepared && trial && SIZES.includes(trial.size), "invalid expected edit");
	const before = prepared.state ?? prepared;
	sameArray(before.rows.map((row) => row.id), trial.canonicalIds, "edit must start from canonical order");
	sameArray(before.rows.filter((row) => row.selected).map((row) => row.id), trial.selectedBeforeIds.slice().sort((a, b) => trial.canonicalIds.indexOf(a) - trial.canonicalIds.indexOf(b)), "edit must start with registered sentinels");
	let rows = [...before.rows];
	const generations = new Map(before.generations);
	if (trial.nativeOperations.length > 1 && trial.nativeOperations.every((item) => item.type === "remove")) {
		const live = new Set(rows.map((row) => row.id));
		const removed = /* @__PURE__ */ new Set();
		for (const operation of trial.nativeOperations) {
			check(live.has(operation.key), `missing remove key ${operation.key}`);
			check(!removed.has(operation.key), `duplicate remove key ${operation.key}`);
			removed.add(operation.key);
		}
		rows = rows.filter((row) => !removed.has(row.id));
	} else for (const operation of trial.nativeOperations) if (operation.type === "remove") {
		const index = rows.findIndex((row) => row.id === operation.key);
		check(index >= 0, `missing remove key ${operation.key}`);
		rows.splice(index, 1);
	} else if (operation.type === "insert") {
		check(!rows.some((row) => row.id === operation.key), "inserted key already live");
		const index = operation.beforeKey === null ? rows.length : rows.findIndex((row) => row.id === operation.beforeKey);
		check(index >= 0, `missing insert anchor ${operation.beforeKey}`);
		const generation = (generations.get(operation.key) ?? 0) + 1;
		generations.set(operation.key, generation);
		rows.splice(index, 0, {
			id: operation.key,
			incarnation: `${operation.key}#${generation}`,
			selected: false
		});
	} else if (operation.type === "move") {
		const oldIndex = rows.findIndex((row) => row.id === operation.key);
		check(oldIndex >= 0, `missing move key ${operation.key}`);
		const [row] = rows.splice(oldIndex, 1);
		const index = operation.beforeKey === null ? rows.length : rows.findIndex((item) => item.id === operation.beforeKey);
		check(index >= 0, `missing move anchor ${operation.beforeKey}`);
		rows.splice(index, 0, row);
	} else throw Error(`unexpected operation ${operation.type}`);
	const state = stateOf(rows, generations);
	sameArray(state.rows.map((row) => row.id), trial.nextIds, "edited output order");
	check(state.rows.find((row) => row.id === "row-2")?.selected, "sentinel row-2 must survive selected");
	if (trial.movingKey) check(state.rows.find((row) => row.id === trial.movingKey)?.selected, "moving row must retain selected state");
	return Object.freeze({
		state,
		lifecycle: identityDelta(before, state),
		phase: "edit-result-inspect-after-commit"
	});
}
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/frontend-size-v2/receipt-analyzer.mjs
var REQUIRED_COUNT_SITES = Object.freeze({
	"root.flush.entries": {
		unit: "event",
		site: "component_state_runtime.ts:flush"
	},
	"collection.copy-operation-callbacks": {
		unit: "iteration",
		site: "keyed_collection.ts:apply-copy"
	},
	"collection.preflight.operation-visits": {
		unit: "iteration",
		site: "keyed_collection.ts:apply-preflight"
	},
	"collection.delta.batch-visits": {
		unit: "iteration",
		site: "component_state_runtime.ts:flushCollectionDelta"
	},
	"collection.delta.operation-visits": {
		unit: "iteration",
		site: "component_state_runtime.ts:flushCollectionDelta"
	},
	"vdom.delta.validate-operation-visits": {
		unit: "iteration",
		site: "vdom_snapshot_runtime.ts:commitKeyedRegionDelta"
	},
	"vdom.delta.commit-operation-visits": {
		unit: "iteration",
		site: "vdom_snapshot_runtime.ts:commitKeyedRegionDelta"
	}
});
function requiredCountValue(name, operationCount) {
	if (!Object.hasOwn(REQUIRED_COUNT_SITES, name) || !Number.isSafeInteger(operationCount) || operationCount < 1) throw Error(`invalid required count request ${name}/${operationCount}`);
	return name === "root.flush.entries" || name === "collection.delta.batch-visits" ? 1 : operationCount;
}
//#endregion
//#region .cache/structural-locality-recording-v1/diagnostic-v1/frontend-size-v2/entry.ts
Object.assign(globalThis, { __structuralFixtureRegistry: {
	ReactArrayBoard,
	NativeGenericBoard,
	NativeGenericMount
} });
var fail = (message) => {
	throw new Error(message);
};
var describeThrown = (value) => {
	const kind = value === null ? "null" : typeof value;
	try {
		return {
			kind,
			message: String(value)
		};
	} catch {
		return {
			kind,
			message: "<unprintable thrown value>"
		};
	}
};
var same = (actual, expected, label) => {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
};
var nodes = (host) => [...host.querySelectorAll("li[data-id]")];
var indexNodes = (host) => new Map(nodes(host).map((node) => [node.dataset.id, node]));
var countAt = (map, id) => map.get(id) ?? 0;
var digest = (rows) => {
	let hash = 2166136261;
	for (const row of rows) for (const character of `${row.id}:${row.selected};`) {
		hash ^= character.charCodeAt(0);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(16).padStart(8, "0");
};
var output = (host) => nodes(host).map((node) => ({
	id: node.dataset.id,
	selected: node.dataset.selected,
	text: node.textContent
}));
function inverseOperations(trial) {
	if (!trial) return Object.freeze([]);
	const size = trial.size;
	const row = (index) => `row-${index}`;
	const insert = (key, beforeKey) => Object.freeze({
		type: "insert",
		key,
		value: Object.freeze({ id: key }),
		beforeKey
	});
	const remove = (key) => Object.freeze({
		type: "remove",
		key
	});
	const move = (key, beforeKey) => Object.freeze({
		type: "move",
		key,
		beforeKey
	});
	const kind = trial.kind;
	if (kind.startsWith("insert-")) return Object.freeze([remove(trial.addedIds[0])]);
	if (kind === "remove-head") return Object.freeze([insert(row(0), row(1))]);
	if (kind === "remove-middle") return Object.freeze([insert(row(Math.floor(size / 2)), row(Math.floor(size / 2) + 1))]);
	if (kind === "remove-tail") return Object.freeze([insert(row(size - 1), null)]);
	if (kind === "move-head") return Object.freeze([move(row(size - 1), null)]);
	if ([
		"move-middle",
		"move-tail",
		"same-key-rotation"
	].includes(kind)) return Object.freeze([move(row(0), row(1))]);
	if (kind === "edge-replacement") return Object.freeze([remove(trial.addedIds[0]), insert(row(size - 1), null)]);
	if (kind === "odd-key-filter") return Object.freeze(Array.from({ length: size / 2 }, (_, index) => insert(row(index * 2 + 1), index * 2 + 2 < size ? row(index * 2 + 2) : null)));
	return fail(`unknown inverse ${kind}`);
}
function inspect(host, state, label, before, lifecycle, mounts, cleanups, priorMounts, priorCleanups, ever, checkSelection) {
	const actual = output(host);
	same(actual.map((row) => row.id), state.rows.map((row) => row.id), `${label}/order`);
	if (checkSelection) same(actual, state.rows.map((row) => ({
		id: row.id,
		selected: String(row.selected),
		text: row.id
	})), `${label}/output`);
	const after = indexNodes(host);
	if (before) {
		for (const id of lifecycle.retained) {
			if (after.get(id) !== before.get(id)) fail(`${label}/retained-node ${id}`);
			if (countAt(mounts, id) !== countAt(priorMounts, id) || countAt(cleanups, id) !== countAt(priorCleanups, id)) fail(`${label}/retained-lifetime ${id}`);
		}
		for (const id of lifecycle.mounted) {
			const node = after.get(id);
			if (!node || ever.has(node)) fail(`${label}/new-node ${id}`);
			if (countAt(mounts, id) !== countAt(priorMounts, id) + 1) fail(`${label}/new-mount ${id}`);
		}
		for (const id of lifecycle.cleaned) if (after.has(id) || countAt(cleanups, id) !== countAt(priorCleanups, id) + 1) fail(`${label}/cleanup ${id}`);
	}
	for (const node of after.values()) ever.add(node);
	return {
		size: actual.length,
		digest: digest(actual.map((row) => ({
			id: row.id,
			selected: row.selected
		}))),
		identity: before ? {
			retainedChecked: lifecycle.retained.length,
			newNotSeen: lifecycle.mounted.length,
			cleanedChecked: lifecycle.cleaned.length
		} : null,
		sentinelSelected: after.get("row-2")?.dataset.selected === "true"
	};
}
function statsDelta(before, after) {
	return {
		deltas: Object.fromEntries([
			"entryInspections",
			"anchorInspections",
			"listenerNotifications",
			"listenerErrors"
		].map((key) => [key, after[key] - before[key]])),
		gauges: {
			before: {
				readerCount: before.readerCount,
				retainedBatches: before.retainedBatches
			},
			after: {
				readerCount: after.readerCount,
				retainedBatches: after.retainedBatches
			}
		}
	};
}
async function run(mode, size) {
	if (mode !== "count" && mode !== "off" || ![
		128,
		1024,
		1e4
	].includes(size)) fail(`unsupported page coordinate ${mode}/${size}`);
	const schedule = pageSchedule({
		size,
		pairIndex: 0,
		arm: "native",
		pageKind: "count"
	});
	const host = document.createElement("section");
	document.body.append(host);
	const mounts = /* @__PURE__ */ new Map();
	const cleanups = /* @__PURE__ */ new Map();
	const profile = [];
	const ever = /* @__PURE__ */ new WeakSet();
	const life = {
		mounted(id) {
			mounts.set(id, countAt(mounts, id) + 1);
		},
		cleaned(id) {
			cleanups.set(id, countAt(cleanups, id) + 1);
		}
	};
	let controller = null;
	let state = initialModel(size);
	let previous = null;
	const edits = [];
	const trace = [];
	window.__structuralRecording.trace = trace;
	window.__structuralRecording.lastResult = null;
	let primaryThrew = false;
	let primaryError;
	let failedReceipt = null;
	const cleanupErrors = [];
	let final = null;
	try {
		controller = mountNativeCount(host, state.rows.map((row) => row.id), life, mode === "count", (values) => profile.push(values));
		inspect(host, state, "mount", null, null, mounts, cleanups, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), ever, true);
		for (const trial of schedule.trials) {
			const resetOps = inverseOperations(previous);
			const prepared = prepareTrial(state, trial);
			const beforeReset = indexNodes(host);
			const resetMounts = new Map(mounts), resetCleanups = new Map(cleanups);
			controller.reset(resetOps);
			const resetSummary = inspect(host, prepared.state, `${trial.id}/reset`, beforeReset, prepared.reset, mounts, cleanups, resetMounts, resetCleanups, ever, false);
			for (const action of [...prepared.resetSelectionChanges, ...prepared.preselectionChanges]) {
				const node = indexNodes(host).get(action.id);
				if (!node || node.dataset.selected !== String(action.fromSelected)) fail(`${trial.id}/selection-before ${action.id}`);
				controller.click(action.id);
				if (node.dataset.selected !== String(action.toSelected)) fail(`${trial.id}/selection-after ${action.id}`);
			}
			inspect(host, prepared.state, `${trial.id}/prepared`, null, null, mounts, cleanups, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), ever, true);
			const beforeEdit = indexNodes(host);
			const editMounts = new Map(mounts), editCleanups = new Map(cleanups);
			const beforeProfile = profile.length;
			const edited = controller.edit(trial.id, trial.nativeOperations);
			if (!Number.isSafeInteger(edited.expectedVersion) || edited.expectedVersion < 0 || edited.applyResult?.ok !== true || edited.applyResult.version !== edited.expectedVersion + 1 || edited.afterCollectionVersion !== edited.applyResult.version || edited.flushResult !== true || edited.pendingChangeCount !== 0) fail(`${trial.id}/unsettled native edit`);
			const collection = statsDelta(edited.statsBefore, edited.statsAfter);
			if (collection.deltas.listenerErrors !== 0 || collection.gauges.before.readerCount !== 1 || collection.gauges.after.readerCount !== 1 || collection.gauges.before.retainedBatches !== 0 || collection.gauges.after.retainedBatches !== 0) fail(`${trial.id}/collection reader or listener state`);
			const expected = applyExpectedEdit(prepared, trial);
			const outputSummary = inspect(host, expected.state, `${trial.id}/edit`, beforeEdit, expected.lifecycle, mounts, cleanups, editMounts, editCleanups, ever, true);
			if (profile.length !== beforeProfile + 1) fail(`${trial.id}/profile count`);
			const path = profile.at(-1);
			if (path["collection.delta-operations"] !== trial.nativeOperations.length || (path["collection.delta.render-fallback"] ?? 0) !== 0 || (path["collection.delta.stale-candidate"] ?? 0) !== 0 || (path["collection.delta.reader-expired"] ?? 0) !== 0) fail(`${trial.id}/unexpected delta path ${JSON.stringify(path)}`);
			if (mode === "count") {
				const receipt = edited.receipt;
				if (!receipt || receipt.label !== trial.id || !receipt.completed || receipt.phase !== "edit" || receipt.coverageId !== "recording-b-probe-coverage-v1" || receipt.bails.length || receipt.errors.length || receipt.route !== "collection-delta" || typeof receipt.counts !== "object" || typeof receipt.missing !== "object") fail(`${trial.id}/probe receipt ${JSON.stringify(receipt)}`);
				for (const [name, expectedSite] of Object.entries(REQUIRED_COUNT_SITES)) {
					const count = receipt.counts[name];
					if (!count || count.value !== requiredCountValue(name, trial.nativeOperations.length) || count.unit !== expectedSite.unit || count.site !== expectedSite.site) fail(`${trial.id}/required count site ${name}: ${JSON.stringify(count)}`);
				}
			} else if (edited.receipt !== null) fail(`${trial.id}/probe active in off mode`);
			const item = {
				id: trial.id,
				kind: trial.kind,
				trialIndex: trial.trialIndex,
				sampleKind: trial.sampleKind,
				operationIndex: trial.operationIndex,
				changedKeys: trial.changedKeys,
				beforeSize: trial.beforeSize,
				afterSize: trial.afterSize,
				reset: resetSummary,
				output: outputSummary,
				selectionActions: {
					reset: prepared.resetSelectionChanges.length,
					preselection: prepared.preselectionChanges.length
				},
				lifecycle: {
					retained: expected.lifecycle.retained.length,
					mounted: expected.lifecycle.mounted.length,
					cleaned: expected.lifecycle.cleaned.length
				},
				commit: {
					expectedVersion: edited.expectedVersion,
					applyResult: edited.applyResult,
					afterCollectionVersion: edited.afterCollectionVersion,
					flushResult: edited.flushResult,
					pendingChangeCount: edited.pendingChangeCount
				},
				collection,
				bucketStats: {
					before: null,
					after: null,
					reason: "Retained VDOM bucket stats have no public accessor; use separated count probes"
				},
				bucketProfileGauge: typeof path["vdom.keyed-region-delta.bucket-count"] === "number" ? path["vdom.keyed-region-delta.bucket-count"] : null,
				path: {
					deltaOperations: path["collection.delta-operations"],
					renderFallback: path["collection.delta.render-fallback"] ?? 0
				},
				receipt: edited.receipt
			};
			edits.push(item);
			trace.push({
				id: trial.id,
				status: "PASS",
				digest: outputSummary.digest,
				route: mode === "count" ? edited.receipt?.route : null
			});
			state = expected.state;
			previous = trial;
		}
	} catch (error) {
		primaryThrew = true;
		primaryError = error;
		try {
			if (error && typeof error === "object" && Object.hasOwn(error, "receipt")) failedReceipt = error.receipt;
		} catch {}
		trace.push({
			phase: "failed",
			error: describeThrown(error),
			receipt: failedReceipt
		});
	} finally {
		try {
			if (controller) {
				final = controller.dispose();
				trace.push({
					phase: "disposed",
					final,
					remainingChildren: host.childNodes.length
				});
				if (final.ownerCount !== 0 || final.readerCount !== 0 || host.childNodes.length) cleanupErrors.push(`disposal resources ${JSON.stringify(final)}`);
				for (const [id, count] of mounts) if (countAt(cleanups, id) !== count) cleanupErrors.push(`lifetime ${id}: ${count}/${countAt(cleanups, id)}`);
			}
		} catch (error) {
			cleanupErrors.push(`dispose ${describeThrown(error).message}`);
		}
		host.remove();
	}
	const primaryDescription = primaryThrew ? describeThrown(primaryError) : null;
	const result = {
		schemaVersion: "structural-count-page-v2",
		mode,
		size,
		scheduleId: schedule.id,
		edits,
		trace,
		final,
		error: primaryDescription?.message ?? null,
		errorKind: primaryDescription?.kind ?? null,
		failedReceipt,
		cleanupErrors,
		status: primaryThrew || cleanupErrors.length ? "FAIL" : "PASS"
	};
	window.__structuralRecording.lastResult = result;
	if (result.status !== "PASS") throw new Error(`structural recording failed: ${result.error}; cleanup: ${cleanupErrors.join("; ")}`);
	return result;
}
window.__structuralRecording = {
	run,
	trace: [],
	lastResult: null
};
//#endregion

//# sourceMappingURL=index-D-4pldfO.js.map