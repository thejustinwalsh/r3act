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
//#region src/compiled_state_layout.ts
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
//#endregion
//#region src/jsx_binding_runtime.ts
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
//#endregion
//#region src/owner_state_world.ts
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
Object.create(Object.prototype, { value: {
	configurable: true,
	enumerable: true,
	get: getLaneBackedValue,
	set: setLaneBackedValue
} });
//#endregion
//#region src/component_state_runtime.ts
var componentSite = Symbol("compiled-component-site");
var collectionRegionDescriptors = /* @__PURE__ */ new WeakMap();
var activeOwners = [];
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
//#endregion
//#region src/keyed_collection.ts
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
		for (const reader of readers) minimum = Math.min(minimum, reader.version);
		while (history.length > 0 && history[0].version <= minimum) history.shift();
	};
	const capHistory = () => {
		while (history.length > maxRetainedBatches) history.shift();
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
			const result = [];
			for (let entry = head; entry; entry = entry.next) {
				entryInspections++;
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
				batchOperations = Object.freeze(Array.from(operations, (operation) => Object.freeze({ ...operation })));
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
				state.entry.value = state.value;
				state.entry.previous = state.alive ? state.previous : null;
				state.entry.next = state.alive ? state.next : null;
			}
			head = virtualHead;
			tail = virtualTail;
			for (const [key, entry] of keyOverlay) if (entry === null) byKey.delete(key);
			else byKey.set(key, entry);
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
					const batches = history.filter((batch) => batch.version > reader.version);
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
//#region src/native_runtime_api.ts
/** Public native author API; `jsx` uses the classic variadic factory ABI. */
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
//#region .cache/structural-locality-protocol-v1/eligibility/entry_positive.ts
var registry = Object.freeze({
	NativeCollectionBoard,
	makeRows,
	NativeGenericBoard,
	ReactArrayBoard
});
Object.assign(globalThis, { __structuralEligibility: registry });
//#endregion

//# sourceMappingURL=positive-_6D6Yd-j.js.map