import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx",
	"module_revision": "native-v1-1a993a991585dbf3",
	"owners": [{
		"site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:List",
		"repeated_scope": "runtime-keyed-owner"
	}, {
		"site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0",
		"owner_site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row",
		"kind": "state",
		"provenance": "tracked"
	}],
	"sinks": [{
		"site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#numeric-sink:668",
		"owner_site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row",
		"source_sites": [".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}],
	"operations": [{
		"site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#effect:0",
		"owner_site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row",
		"kind": "activation-effect",
		"provenance": "opaque",
		"source_sites": []
	}],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": { ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0": [".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#numeric-sink:668"] },
		"execution_order": [".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#numeric-sink:668"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx" && event.previousRevision === "native-v1-1a993a991585dbf3" && event.previousInstance === "native-v1-1a993a991585dbf3") __invalidateNativeSemanticPlan(".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx", "native-v1-1a993a991585dbf3");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { createKeyedCollection, renderCollectionAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row",
	sinkId: ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#numeric-sink:668",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: [".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0"]
}];
const __nativeOwnerCutKernels = [{
	schemaVersion: 4,
	programId: ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row",
	slotCount: 1,
	sinkIds: [".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#numeric-sink:668"],
	executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues, inputStart = 0, outputStart = 0) {
		let stagedCount = outputStart;
		for (let localIndex = 0; localIndex < changeCount; localIndex++) {
			const changeIndex = inputStart + localIndex;
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
		return stagedCount - outputStart;
	}
}];
__nativeDefineComponent(".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:List", List, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row", Row, {
	propOnlySites: [".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0"],
	numericPrimitiveProps: ["id"],
	stateLayout: {
		schemaVersion: 1,
		programId: ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row",
		moduleRevision: "native-v1-1a993a991585dbf3",
		slots: [{
			siteId: ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
export const rows = createKeyedCollection(Array.from({ length: 12 }, (_, index) => ({ id: `row-${index}` })), (row) => row.id);
export const trace = {
	setters: Object.create(null),
	mounts: Object.create(null),
	cleanups: Object.create(null)
};
export function Row({ id }) {
	const [value, setValue] = __nativeUseStateAt(".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0", 0);
	__nativeUseEffectAt(".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#effect:0", () => {
		trace.setters[id] = setValue;
		trace.mounts[id] = (trace.mounts[id] || 0) + 1;
		return () => {
			trace.cleanups[id] = (trace.cleanups[id] || 0) + 1;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("li", {
		"data-id": id,
		"data-value": __nativeBindStatePropAt(".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0", (value) => value, __nativeNumericPrograms[0])
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
	"module_revision": "native-v1-1a993a991585dbf3",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx",
		"module_revision": "native-v1-1a993a991585dbf3",
		"owners": [{
			"site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:List",
			"repeated_scope": "runtime-keyed-owner"
		}, {
			"site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0",
			"owner_site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row",
			"kind": "state",
			"provenance": "tracked"
		}],
		"sinks": [{
			"site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#numeric-sink:668",
			"owner_site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row",
			"source_sites": [".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}],
		"operations": [{
			"site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#effect:0",
			"owner_site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": { ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0": [".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#numeric-sink:668"] },
			"execution_order": [".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#numeric-sink:668"]
		}
	},
	"source_file": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { createKeyedCollection, renderCollectionAt, useState, useEffect } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row\", sinkId: \".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#numeric-sink:668\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 4, programId: \".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row\", slotCount: 1, sinkIds: [\".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#numeric-sink:668\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues, inputStart = 0, outputStart = 0) { let stagedCount = outputStart; for (let localIndex = 0; localIndex < changeCount; localIndex++) { const changeIndex = inputStart + localIndex; const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount - outputStart; } }];\n__nativeDefineComponent(\".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:List\", List, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row\", Row, { propOnlySites: [\".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0\"], numericPrimitiveProps: [\"id\"], stateLayout: { schemaVersion: 1, programId: \".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row\", moduleRevision: \"native-v1-1a993a991585dbf3\", slots: [{ siteId: \".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\nexport const rows = createKeyedCollection(Array.from({ length: 12 }, (_, index) => ({ id: `row-${index}` })), row => row.id);\nexport const trace = { setters: Object.create(null), mounts: Object.create(null), cleanups: Object.create(null) };\nexport function Row({ id }) {\n  const [value, setValue] = __nativeUseStateAt(\".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0\", 0);\n  __nativeUseEffectAt(\".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#effect:0\", () => { trace.setters[id] = setValue; trace.mounts[id] = (trace.mounts[id] || 0) + 1; return () => { trace.cleanups[id] = (trace.cleanups[id] || 0) + 1; }; });\n  return <li data-id={id} data-value={__nativeBindStatePropAt(\".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0\", (value) => (value), __nativeNumericPrograms[0])}>{id}</li>;\n}\nexport function List() { return <ul>{renderCollectionAt(\"compiled-joint-rows\", rows, row => <Row key={row.id} id={row.id} />)}</ul>; }",
	"components": [{
		"name": "List",
		"component_site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:List",
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
		"component_site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row",
		"prop_only_sites": [".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0"],
		"numeric_primitive_props": ["id"],
		"state_layout": {
			"schema_version": 1,
			"programId": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row",
			"moduleRevision": "native-v1-1a993a991585dbf3",
			"slots": [{
				"site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0",
				"slot": 0
			}]
		},
		"host_leaf_output": false,
		"state_sites": [{
			"site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0",
			"initial_value": "0"
		}],
		"effect_sites": [{ "site_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#effect:0" }],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [{
			"sink_id": ".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#numeric-sink:668",
			"source_sites": [".cache/compiled-joint-transaction/rows-1792624720513-67338-dbbfb222-1ff7-44a9-8c3e-1682715da01c.tsx#component:Row#state:0"],
			"primitive_value": true
		}],
		"opaque_sinks": []
	}]
};
import * as __nativeJsx from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
