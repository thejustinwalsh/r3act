import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "../../../src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx",
	"module_revision": "native-v1-8ee23d6bc3a57467",
	"owners": [{
		"site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeList",
		"repeated_scope": "runtime-keyed-owner"
	}, {
		"site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0",
		"owner_site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow",
		"kind": "state",
		"provenance": "tracked"
	}],
	"sinks": [{
		"site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#numeric-sink:818",
		"owner_site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow",
		"source_sites": ["implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}],
	"operations": [{
		"site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#effect:0",
		"owner_site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow",
		"kind": "activation-effect",
		"provenance": "opaque",
		"source_sites": []
	}],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": { "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0": ["implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#numeric-sink:818"] },
		"execution_order": ["implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#numeric-sink:818"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx") __invalidateNativeSemanticPlan("implementation/2026-10-18-first-pass/benchmark/native_arm.tsx", "native-v1-8ee23d6bc3a57467");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { createDOMRoot, createKeyedCollection, renderCollectionAt } from "../../../src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, bindStatePropAt as __nativeBindStatePropAt } from "../../../src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow",
	sinkId: "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#numeric-sink:818",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: ["implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0"]
}];
const __nativeOwnerCutKernels = [{
	schemaVersion: 2,
	programId: "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow",
	slotCount: 1,
	sinkIds: ["implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#numeric-sink:818"],
	executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) {
		let stagedCount = 0;
		for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) {
			const rowState = rowStates[changeIndex];
			switch (changedSlots[changeIndex]) {
				case 0: {
					if ((rowState.seenMask & 1) === 0) {
						rowState.seenMask |= 1;
						const next = rowState.inputValues[0];
						const sinkState = rowState.sinks[0];
						const last = sinkState.lastValue;
						const same = last === next ? typeof next !== "number" || typeof last === "number" && (last !== 0 || 1 / last === 1 / next) : typeof last === "number" && typeof next === "number" && last !== last && next !== next;
						if (!same) {
							stagedInputIndices[stagedCount] = changeIndex;
							stagedSinkIds[stagedCount] = 0;
							stagedValues[stagedCount] = next;
							stagedCount++;
						}
					}
					break;
				}
			}
		}
		return stagedCount;
	}
}];
__nativeDefineComponent("implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeList", NativeList, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow", NativeRow, {
	propOnlySites: ["implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0"],
	stateLayout: {
		schemaVersion: 1,
		programId: "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow",
		moduleRevision: "native-v1-8ee23d6bc3a57467",
		slots: [{
			siteId: "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
function NativeRow({ id, registry }) {
	const [value, setValue] = __nativeUseStateAt("implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0", 0);
	__nativeUseEffectAt("implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#effect:0", () => {
		registry.setters.set(id, setValue);
		registry.mounts.set(id, (registry.mounts.get(id) ?? 0) + 1);
		return () => {
			registry.setters.delete(id);
			registry.cleanups.set(id, (registry.cleanups.get(id) ?? 0) + 1);
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("li", {
		"data-id": id,
		"data-value": __nativeBindStatePropAt("implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0", (value) => value, __nativeNumericPrograms[0])
	}, id);
}
function NativeList({ rows, registry }) {
	return /* @__PURE__ */ __nativeJsx.jsx("ul", null, renderCollectionAt("first-pass-joint-rows", rows, (row) => /* @__PURE__ */ __nativeJsx.jsx(NativeRow, {
		key: row.id,
		id: row.id,
		registry
	})));
}
export function mountNative(host, ids, selected) {
	const rows = createKeyedCollection(ids.map((id) => ({ id })), (row) => row.id);
	const registry = {
		setters: new Map(),
		mounts: new Map(),
		cleanups: new Map()
	};
	const root = createDOMRoot(host, { scheduleCommit() {} });
	const mountStart = performance.now();
	root.mount(/* @__PURE__ */ __nativeJsx.jsx(NativeList, {
		rows,
		registry
	}));
	root.flush();
	const mountDurationMs = performance.now() - mountStart;
	const dirty = [];
	const unsubscribe = root.world.subscribeDirtyCells((handle) => dirty.push(handle));
	const handles = [];
	for (const id of selected) {
		const before = dirty.length;
		const setter = registry.setters.get(id);
		if (!setter || !setter(1)) throw new Error(`cannot prime selected row ${id}`);
		const handle = dirty.slice(before).find((item) => item.site.endsWith("#state:0"));
		if (!handle) throw new Error(`no state handle captured for ${id}`);
		handles.push(handle);
	}
	unsubscribe();
	if (!root.flush()) throw new Error("native baseline update failed");
	if (new Set(handles.map((handle) => handle.owner)).size !== selected.length) throw new Error("selected row handles are not unique");
	const selectedSetters = selected.map((id) => {
		const setter = registry.setters.get(id);
		if (!setter) throw new Error(`selected row setter is missing for ${id}`);
		return setter;
	});
	const toTail = Object.freeze([{
		type: "move",
		key: "row-0",
		beforeKey: null
	}]);
	const toHead = Object.freeze([{
		type: "move",
		key: "row-0",
		beforeKey: "row-1"
	}]);
	const transact = (step, move) => {
		for (const [index, setter] of selectedSetters.entries()) setter(step * 1e3 + index + 2);
		const applied = rows.apply(rows.version, move);
		if (!applied.ok) throw new Error(`collection apply rejected: ${JSON.stringify(applied)}`);
		const candidate = root.prepareTransaction({
			cells: handles,
			collections: [rows]
		});
		if (!candidate || !candidate.validate()) throw new Error("joint transaction preparation or validation failed");
		candidate.commitHost();
		if (!candidate.validatePostHost()) throw new Error("joint transaction became stale after host commit");
		candidate.preparePublication();
		candidate.publish();
		candidate.installSubscriptions();
		candidate.runEffects();
		return candidate;
	};
	return {
		mountDurationMs,
		lifecycle() {
			return {
				mounts: Object.fromEntries(registry.mounts),
				cleanups: Object.fromEntries(registry.cleanups)
			};
		},
		transact(step, tail) {
			return transact(step, tail ? toTail : toHead);
		},
		scopeState() {
			return {
				rootId: root.rootId,
				publicationVersion: root.publicationVersion
			};
		},
		dispose() {
			root.dispose();
			return {
				ownerCount: root.diagnostics().ownerCount,
				readerCount: rows.stats().readerCount
			};
		}
	};
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-8ee23d6bc3a57467",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx",
		"module_revision": "native-v1-8ee23d6bc3a57467",
		"owners": [{
			"site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeList",
			"repeated_scope": "runtime-keyed-owner"
		}, {
			"site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0",
			"owner_site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow",
			"kind": "state",
			"provenance": "tracked"
		}],
		"sinks": [{
			"site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#numeric-sink:818",
			"owner_site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow",
			"source_sites": ["implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}],
		"operations": [{
			"site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#effect:0",
			"owner_site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": { "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0": ["implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#numeric-sink:818"] },
			"execution_order": ["implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#numeric-sink:818"]
		}
	},
	"source_file": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import {\n  createDOMRoot,\n  createKeyedCollection,\n  renderCollectionAt,\n  useEffect,\n  useState,\n  type KeyedCollection,\n  type KeyedCollectionOperation,\n  type StateCellHandle,\n} from \"../../../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../../../src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \"implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow\", sinkId: \"implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#numeric-sink:818\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\"implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"../../../src/native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 2, programId: \"implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow\", slotCount: 1, sinkIds: [\"implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#numeric-sink:818\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\n__nativeDefineComponent(\"implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeList\", NativeList, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow\", NativeRow, { propOnlySites: [\"implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0\"], stateLayout: { schemaVersion: 1, programId: \"implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow\", moduleRevision: \"native-v1-8ee23d6bc3a57467\", slots: [{ siteId: \"implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\n\ntype RowValue = { id: string };\ntype Registry = { setters: Map<string, (value: number) => boolean>; mounts: Map<string, number>; cleanups: Map<string, number> };\nfunction NativeRow({ id, registry }: { id: string; registry: Registry; key?: string }) {\n  const [value, setValue] = __nativeUseStateAt(\"implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0\", 0);\n  __nativeUseEffectAt(\"implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#effect:0\", () => {\n    registry.setters.set(id, setValue);\n    registry.mounts.set(id, (registry.mounts.get(id) ?? 0) + 1);\n    return () => {\n      registry.setters.delete(id);\n      registry.cleanups.set(id, (registry.cleanups.get(id) ?? 0) + 1);\n    };\n  });\n  return <li data-id={id} data-value={__nativeBindStatePropAt(\"implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0\", (value) => (value), __nativeNumericPrograms[0])}>{id}</li>;\n}\nfunction NativeList({ rows, registry }: { rows: KeyedCollection<RowValue>; registry: Registry }) {\n  return <ul>{renderCollectionAt(\"first-pass-joint-rows\", rows, (row) => <NativeRow key={row.id} id={row.id} registry={registry} />)}</ul>;\n}\n\nexport function mountNative(host: HTMLElement, ids: readonly string[], selected: readonly string[]) {\n  const rows = createKeyedCollection(ids.map((id) => ({ id })), (row) => row.id);\n  const registry: Registry = { setters: new Map(), mounts: new Map(), cleanups: new Map() };\n  const root = createDOMRoot(host, { scheduleCommit() {} });\n  const mountStart = performance.now();\n  root.mount(<NativeList rows={rows} registry={registry} />);\n  root.flush();\n  const mountDurationMs = performance.now() - mountStart;\n  const dirty: StateCellHandle[] = [];\n  const unsubscribe = root.world.subscribeDirtyCells((handle) => dirty.push(handle));\n  const handles: StateCellHandle[] = [];\n  for (const id of selected) {\n    const before = dirty.length;\n    const setter = registry.setters.get(id);\n    if (!setter || !setter(1)) throw new Error(`cannot prime selected row ${id}`);\n    const handle = dirty.slice(before).find((item) => item.site.endsWith(\"#state:0\"));\n    if (!handle) throw new Error(`no state handle captured for ${id}`);\n    handles.push(handle);\n  }\n  unsubscribe();\n  if (!root.flush()) throw new Error(\"native baseline update failed\");\n  if (new Set(handles.map((handle) => handle.owner)).size !== selected.length) throw new Error(\"selected row handles are not unique\");\n  const selectedSetters = selected.map((id) => {\n    const setter = registry.setters.get(id);\n    if (!setter) throw new Error(`selected row setter is missing for ${id}`);\n    return setter;\n  });\n\n  const toTail: readonly KeyedCollectionOperation<RowValue>[] = Object.freeze([{ type: \"move\", key: \"row-0\", beforeKey: null }]);\n  const toHead: readonly KeyedCollectionOperation<RowValue>[] = Object.freeze([{ type: \"move\", key: \"row-0\", beforeKey: \"row-1\" }]);\n  const transact = (step: number, move: readonly KeyedCollectionOperation<RowValue>[]) => {\n    for (const [index, setter] of selectedSetters.entries()) setter(step * 1000 + index + 2);\n    const applied = rows.apply(rows.version, move);\n    if (!applied.ok) throw new Error(`collection apply rejected: ${JSON.stringify(applied)}`);\n    const candidate = root.prepareTransaction({ cells: handles, collections: [rows] });\n    if (!candidate || !candidate.validate()) throw new Error(\"joint transaction preparation or validation failed\");\n    candidate.commitHost();\n    if (!candidate.validatePostHost()) throw new Error(\"joint transaction became stale after host commit\");\n    candidate.preparePublication();\n    candidate.publish();\n    candidate.installSubscriptions();\n    candidate.runEffects();\n    return candidate;\n  };\n  return {\n    mountDurationMs,\n    lifecycle() { return { mounts: Object.fromEntries(registry.mounts), cleanups: Object.fromEntries(registry.cleanups) }; },\n    transact(step: number, tail: boolean) { return transact(step, tail ? toTail : toHead); },\n    scopeState() { return { rootId: root.rootId, publicationVersion: root.publicationVersion }; },\n    dispose() { root.dispose(); return { ownerCount: root.diagnostics().ownerCount, readerCount: rows.stats().readerCount }; },\n  };\n}\n",
	"components": [{
		"name": "NativeList",
		"component_site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeList",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}, {
		"name": "NativeRow",
		"component_site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow",
		"prop_only_sites": ["implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0"],
		"state_layout": {
			"schema_version": 1,
			"programId": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow",
			"moduleRevision": "native-v1-8ee23d6bc3a57467",
			"slots": [{
				"site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0",
				"slot": 0
			}]
		},
		"host_leaf_output": false,
		"state_sites": [{
			"site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0",
			"initial_value": "0"
		}],
		"effect_sites": [{ "site_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#effect:0" }],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [{
			"sink_id": "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#numeric-sink:818",
			"source_sites": ["implementation/2026-10-18-first-pass/benchmark/native_arm.tsx#component:NativeRow#state:0"],
			"primitive_value": true
		}],
		"opaque_sinks": []
	}]
};
import * as __nativeJsx from "../../../src/native_runtime_api.ts";
