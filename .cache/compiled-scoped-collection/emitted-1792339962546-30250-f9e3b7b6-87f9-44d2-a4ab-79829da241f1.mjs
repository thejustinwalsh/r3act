import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx",
	"module_revision": "native-v1-1ce9e041d3af55cc",
	"owners": [
		{
			"site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:List",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [{
		"site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0",
		"owner_site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item",
		"kind": "state",
		"provenance": "tracked"
	}],
	"sinks": [{
		"site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#numeric-sink:1023",
		"owner_site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item",
		"source_sites": [".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}],
	"operations": [{
		"site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#effect:0",
		"owner_site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item",
		"kind": "activation-effect",
		"provenance": "opaque",
		"source_sites": []
	}],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": { ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0": [".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#numeric-sink:1023"] },
		"execution_order": [".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#numeric-sink:1023"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx") __invalidateNativeSemanticPlan(".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx", "native-v1-1ce9e041d3af55cc");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { createKeyedCollection, renderCollectionAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item",
	sinkId: ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#numeric-sink:1023",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: [".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0"]
}];
const __nativeOwnerCutKernels = [{
	schemaVersion: 2,
	programId: ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item",
	slotCount: 1,
	sinkIds: [".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#numeric-sink:1023"],
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
__nativeDefineComponent(".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item", Item, {
	propOnlySites: [".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0"],
	stateLayout: {
		schemaVersion: 1,
		programId: ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item",
		moduleRevision: "native-v1-1ce9e041d3af55cc",
		slots: [{
			siteId: ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
__nativeDefineComponent(".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:List", List, { propOnlySites: [] });
export const leftRows = createKeyedCollection([
	{ id: "a" },
	{ id: "b" },
	{ id: "c" }
], (row) => row.id);
export const rightRows = createKeyedCollection([
	{ id: "d" },
	{ id: "e" },
	{ id: "f" }
], (row) => row.id);
export const trace = {
	appRenders: 0,
	rowRenders: Object.create(null),
	setters: Object.create(null),
	mounts: Object.create(null),
	cleanups: Object.create(null),
	refAttachments: Object.create(null),
	refCleanups: Object.create(null)
};
export function Item({ row }) {
	trace.rowRenders[row.id] = (trace.rowRenders[row.id] || 0) + 1;
	const [count, setCount] = __nativeUseStateAt(".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0", 0);
	trace.setters[row.id] = setCount;
	__nativeUseEffectAt(".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#effect:0", () => {
		trace.mounts[row.id] = (trace.mounts[row.id] || 0) + 1;
		return () => {
			trace.cleanups[row.id] = (trace.cleanups[row.id] || 0) + 1;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("li", {
		key: row.id,
		"data-row": row.id,
		"data-count": __nativeBindStatePropAt(".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0", (count) => count, __nativeNumericPrograms[0]),
		ref: (node) => {
			if (!node) return;
			trace.refAttachments[row.id] = (trace.refAttachments[row.id] || 0) + 1;
			return () => {
				trace.refCleanups[row.id] = (trace.refCleanups[row.id] || 0) + 1;
			};
		}
	}, row.id);
}
export function List({ side }) {
	return side === "left" ? /* @__PURE__ */ __nativeJsx.jsx("ul", {
		key: "left-list",
		"data-side": "left"
	}, renderCollectionAt("compiled-scoped-left", leftRows, (row) => /* @__PURE__ */ __nativeJsx.jsx(Item, {
		key: row.id,
		row
	}))) : /* @__PURE__ */ __nativeJsx.jsx("ul", {
		key: "right-list",
		"data-side": "right"
	}, renderCollectionAt("compiled-scoped-right", rightRows, (row) => /* @__PURE__ */ __nativeJsx.jsx(Item, {
		key: row.id,
		row
	})));
}
export function App() {
	trace.appRenders++;
	return /* @__PURE__ */ __nativeJsx.jsx("section", null, /* @__PURE__ */ __nativeJsx.jsx(List, {
		key: "left",
		side: "left"
	}), /* @__PURE__ */ __nativeJsx.jsx(List, {
		key: "right",
		side: "right"
	}));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-1ce9e041d3af55cc",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx",
		"module_revision": "native-v1-1ce9e041d3af55cc",
		"owners": [
			{
				"site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:List",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [{
			"site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0",
			"owner_site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item",
			"kind": "state",
			"provenance": "tracked"
		}],
		"sinks": [{
			"site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#numeric-sink:1023",
			"owner_site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item",
			"source_sites": [".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}],
		"operations": [{
			"site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#effect:0",
			"owner_site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": { ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0": [".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#numeric-sink:1023"] },
			"execution_order": [".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#numeric-sink:1023"]
		}
	},
	"source_file": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { createKeyedCollection, renderCollectionAt, useState, useEffect } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item\", sinkId: \".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#numeric-sink:1023\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 2, programId: \".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item\", slotCount: 1, sinkIds: [\".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#numeric-sink:1023\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\n__nativeDefineComponent(\".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item\", Item, { propOnlySites: [\".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0\"], stateLayout: { schemaVersion: 1, programId: \".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item\", moduleRevision: \"native-v1-1ce9e041d3af55cc\", slots: [{ siteId: \".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\n__nativeDefineComponent(\".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:List\", List, { propOnlySites: [] });\n\nexport const leftRows = createKeyedCollection([\n  { id: \"a\" }, { id: \"b\" }, { id: \"c\" },\n], row => row.id);\nexport const rightRows = createKeyedCollection([\n  { id: \"d\" }, { id: \"e\" }, { id: \"f\" },\n], row => row.id);\nexport const trace = {\n  appRenders: 0,\n  rowRenders: Object.create(null),\n  setters: Object.create(null),\n  mounts: Object.create(null),\n  cleanups: Object.create(null),\n  refAttachments: Object.create(null),\n  refCleanups: Object.create(null),\n};\n\nexport function Item({ row }) {\n  trace.rowRenders[row.id] = (trace.rowRenders[row.id] || 0) + 1;\n  const [count, setCount] = __nativeUseStateAt(\".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0\", 0);\n  trace.setters[row.id] = setCount;\n  __nativeUseEffectAt(\".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#effect:0\", () => {\n    trace.mounts[row.id] = (trace.mounts[row.id] || 0) + 1;\n    return () => {\n      trace.cleanups[row.id] = (trace.cleanups[row.id] || 0) + 1;\n    };\n  });\n  return <li key={row.id} data-row={row.id} data-count={__nativeBindStatePropAt(\".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0\", (count) => (count), __nativeNumericPrograms[0])}\n    ref={node => {\n      if (!node) return;\n      trace.refAttachments[row.id] = (trace.refAttachments[row.id] || 0) + 1;\n      return () => {\n        trace.refCleanups[row.id] = (trace.refCleanups[row.id] || 0) + 1;\n      };\n    }}>{row.id}</li>;\n}\n\nexport function List({ side }) {\n  return side === \"left\"\n    ? <ul key=\"left-list\" data-side=\"left\">{renderCollectionAt(\"compiled-scoped-left\", leftRows,\n        row => <Item key={row.id} row={row} />)}</ul>\n    : <ul key=\"right-list\" data-side=\"right\">{renderCollectionAt(\"compiled-scoped-right\", rightRows,\n        row => <Item key={row.id} row={row} />)}</ul>;\n}\n\nexport function App() {\n  trace.appRenders++;\n  return <section><List key=\"left\" side=\"left\" /><List key=\"right\" side=\"right\" /></section>;\n}",
	"components": [
		{
			"name": "App",
			"component_site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:App",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Item",
			"component_site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item",
			"prop_only_sites": [".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0"],
			"state_layout": {
				"schema_version": 1,
				"programId": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item",
				"moduleRevision": "native-v1-1ce9e041d3af55cc",
				"slots": [{
					"site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#numeric-sink:1023",
				"source_sites": [".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:Item#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		},
		{
			"name": "List",
			"component_site_id": ".cache/compiled-scoped-collection/authored-1792339962546-30250-f9e3b7b6-87f9-44d2-a4ab-79829da241f1.tsx#component:List",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
