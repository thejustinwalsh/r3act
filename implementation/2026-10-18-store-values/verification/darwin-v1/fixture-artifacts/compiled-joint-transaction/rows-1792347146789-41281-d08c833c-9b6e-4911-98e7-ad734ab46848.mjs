import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx",
	"module_revision": "native-v1-badc4c321136c27b",
	"owners": [{
		"site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:List",
		"repeated_scope": "runtime-keyed-owner"
	}, {
		"site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0",
		"owner_site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row",
		"kind": "state",
		"provenance": "tracked"
	}],
	"sinks": [{
		"site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#numeric-sink:752",
		"owner_site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row",
		"source_sites": [".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}],
	"operations": [{
		"site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#effect:0",
		"owner_site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row",
		"kind": "activation-effect",
		"provenance": "opaque",
		"source_sites": []
	}],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": { ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0": [".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#numeric-sink:752"] },
		"execution_order": [".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#numeric-sink:752"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx") __invalidateNativeSemanticPlan(".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx", "native-v1-badc4c321136c27b");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { createKeyedCollection, renderCollectionAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row",
	sinkId: ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#numeric-sink:752",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: [".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0"]
}];
const __nativeOwnerCutKernels = [{
	schemaVersion: 2,
	programId: ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row",
	slotCount: 1,
	sinkIds: [".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#numeric-sink:752"],
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
__nativeDefineComponent(".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:List", List, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row", Row, {
	propOnlySites: [".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0"],
	stateLayout: {
		schemaVersion: 1,
		programId: ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row",
		moduleRevision: "native-v1-badc4c321136c27b",
		slots: [{
			siteId: ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
export const rows = createKeyedCollection(Array.from({ length: 12 }, (_, index) => ({ id: `row-${index}` })), (row) => row.id);
export const trace = {
	setters: Object.create(null),
	renders: Object.create(null),
	mounts: Object.create(null),
	cleanups: Object.create(null)
};
export function Row({ id }) {
	trace.renders[id] = (trace.renders[id] || 0) + 1;
	const [value, setValue] = __nativeUseStateAt(".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0", 0);
	trace.setters[id] = setValue;
	__nativeUseEffectAt(".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#effect:0", () => {
		trace.mounts[id] = (trace.mounts[id] || 0) + 1;
		return () => {
			trace.cleanups[id] = (trace.cleanups[id] || 0) + 1;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("li", {
		"data-id": id,
		"data-value": __nativeBindStatePropAt(".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0", (value) => value, __nativeNumericPrograms[0])
	}, id);
}
export function List() {
	return /* @__PURE__ */ __nativeJsx.jsx("ul", null, renderCollectionAt("compiled-joint-rows", rows, (row) => /* @__PURE__ */ __nativeJsx.jsx(Row, {
		key: row.id,
		id: row.id
	})));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-badc4c321136c27b",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx",
		"module_revision": "native-v1-badc4c321136c27b",
		"owners": [{
			"site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:List",
			"repeated_scope": "runtime-keyed-owner"
		}, {
			"site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0",
			"owner_site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row",
			"kind": "state",
			"provenance": "tracked"
		}],
		"sinks": [{
			"site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#numeric-sink:752",
			"owner_site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row",
			"source_sites": [".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}],
		"operations": [{
			"site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#effect:0",
			"owner_site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": { ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0": [".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#numeric-sink:752"] },
			"execution_order": [".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#numeric-sink:752"]
		}
	},
	"source_file": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { createKeyedCollection, renderCollectionAt, useState, useEffect } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row\", sinkId: \".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#numeric-sink:752\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 2, programId: \".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row\", slotCount: 1, sinkIds: [\".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#numeric-sink:752\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\n__nativeDefineComponent(\".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:List\", List, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row\", Row, { propOnlySites: [\".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0\"], stateLayout: { schemaVersion: 1, programId: \".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row\", moduleRevision: \"native-v1-badc4c321136c27b\", slots: [{ siteId: \".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\nexport const rows = createKeyedCollection(Array.from({ length: 12 }, (_, index) => ({ id: `row-${index}` })), row => row.id);\nexport const trace = { setters: Object.create(null), renders: Object.create(null), mounts: Object.create(null), cleanups: Object.create(null) };\nexport function Row({ id }) {\n  trace.renders[id] = (trace.renders[id] || 0) + 1;\n  const [value, setValue] = __nativeUseStateAt(\".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0\", 0);\n  trace.setters[id] = setValue;\n  __nativeUseEffectAt(\".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#effect:0\", () => { trace.mounts[id] = (trace.mounts[id] || 0) + 1; return () => { trace.cleanups[id] = (trace.cleanups[id] || 0) + 1; }; });\n  return <li data-id={id} data-value={__nativeBindStatePropAt(\".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0\", (value) => (value), __nativeNumericPrograms[0])}>{id}</li>;\n}\nexport function List() { return <ul>{renderCollectionAt(\"compiled-joint-rows\", rows, row => <Row key={row.id} id={row.id} />)}</ul>; }",
	"components": [{
		"name": "List",
		"component_site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:List",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}, {
		"name": "Row",
		"component_site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row",
		"prop_only_sites": [".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0"],
		"state_layout": {
			"schema_version": 1,
			"programId": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row",
			"moduleRevision": "native-v1-badc4c321136c27b",
			"slots": [{
				"site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0",
				"slot": 0
			}]
		},
		"host_leaf_output": false,
		"state_sites": [{
			"site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0",
			"initial_value": "0"
		}],
		"effect_sites": [{ "site_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#effect:0" }],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [{
			"sink_id": ".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#numeric-sink:752",
			"source_sites": [".cache/compiled-joint-transaction/rows-1792347146789-41281-d08c833c-9b6e-4911-98e7-ad734ab46848.tsx#component:Row#state:0"],
			"primitive_value": true
		}],
		"opaque_sinks": []
	}]
};
import * as __nativeJsx from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
