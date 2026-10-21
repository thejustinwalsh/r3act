import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx",
	"module_revision": "native-v1-511f05d914ab2c7b",
	"owners": [
		{
			"site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:List",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [{
		"site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0",
		"owner_site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item",
		"kind": "state",
		"provenance": "tracked"
	}],
	"sinks": [{
		"site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#numeric-sink:1140",
		"owner_site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item",
		"source_sites": [".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}],
	"operations": [{
		"site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#effect:0",
		"owner_site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item",
		"kind": "activation-effect",
		"provenance": "opaque",
		"source_sites": []
	}],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": { ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0": [".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#numeric-sink:1140"] },
		"execution_order": [".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#numeric-sink:1140"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx" && event.previousRevision === "native-v1-511f05d914ab2c7b" && event.previousInstance === "native-v1-511f05d914ab2c7b") __invalidateNativeSemanticPlan(".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx", "native-v1-511f05d914ab2c7b");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { createKeyedCollection, renderCollectionAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item",
	sinkId: ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#numeric-sink:1140",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: [".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0"]
}];
const __nativeOwnerCutKernels = [{
	schemaVersion: 2,
	programId: ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item",
	slotCount: 1,
	sinkIds: [".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#numeric-sink:1140"],
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
__nativeDefineComponent(".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item", Item, {
	propOnlySites: [".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0"],
	numericPrimitiveProps: ["id"],
	stateLayout: {
		schemaVersion: 1,
		programId: ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item",
		moduleRevision: "native-v1-511f05d914ab2c7b",
		slots: [{
			siteId: ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
__nativeDefineComponent(".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:List", List, { propOnlySites: [] });
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
	setters: Object.create(null),
	mounts: Object.create(null),
	cleanups: Object.create(null),
	refAttachments: Object.create(null),
	refCleanups: Object.create(null)
};
export function captureItemNode(node) {
	if (!node) return;
	const id = node.props["data-row"];
	trace.refAttachments[id] = (trace.refAttachments[id] || 0) + 1;
	return () => {
		trace.refCleanups[id] = (trace.refCleanups[id] || 0) + 1;
	};
}
export function Item({ id }) {
	const [count, setCount] = __nativeUseStateAt(".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0", 0);
	__nativeUseEffectAt(".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#effect:0", () => {
		trace.setters[id] = setCount;
		trace.mounts[id] = (trace.mounts[id] || 0) + 1;
		return () => {
			trace.cleanups[id] = (trace.cleanups[id] || 0) + 1;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("li", {
		key: id,
		"data-row": id,
		"data-count": __nativeBindStatePropAt(".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0", (count) => count, __nativeNumericPrograms[0]),
		ref: captureItemNode
	}, id);
}
export function List({ side }) {
	return side === "left" ? /* @__PURE__ */ __nativeJsx.jsx("ul", {
		key: "left-list",
		"data-side": "left"
	}, renderCollectionAt("compiled-scoped-left", leftRows, (row) => /* @__PURE__ */ __nativeJsx.jsx(Item, {
		key: row.id,
		id: row.id
	}))) : /* @__PURE__ */ __nativeJsx.jsx("ul", {
		key: "right-list",
		"data-side": "right"
	}, renderCollectionAt("compiled-scoped-right", rightRows, (row) => /* @__PURE__ */ __nativeJsx.jsx(Item, {
		key: row.id,
		id: row.id
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
	"module_revision": "native-v1-511f05d914ab2c7b",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx",
		"module_revision": "native-v1-511f05d914ab2c7b",
		"owners": [
			{
				"site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:List",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [{
			"site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0",
			"owner_site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item",
			"kind": "state",
			"provenance": "tracked"
		}],
		"sinks": [{
			"site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#numeric-sink:1140",
			"owner_site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item",
			"source_sites": [".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}],
		"operations": [{
			"site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#effect:0",
			"owner_site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": { ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0": [".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#numeric-sink:1140"] },
			"execution_order": [".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#numeric-sink:1140"]
		}
	},
	"source_file": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { createKeyedCollection, renderCollectionAt, useState, useEffect } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item\", sinkId: \".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#numeric-sink:1140\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 2, programId: \".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item\", slotCount: 1, sinkIds: [\".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#numeric-sink:1140\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\n__nativeDefineComponent(\".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item\", Item, { propOnlySites: [\".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0\"], numericPrimitiveProps: [\"id\"], stateLayout: { schemaVersion: 1, programId: \".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item\", moduleRevision: \"native-v1-511f05d914ab2c7b\", slots: [{ siteId: \".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\n__nativeDefineComponent(\".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:List\", List, { propOnlySites: [] });\n\nexport const leftRows = createKeyedCollection([\n  { id: \"a\" }, { id: \"b\" }, { id: \"c\" },\n], row => row.id);\nexport const rightRows = createKeyedCollection([\n  { id: \"d\" }, { id: \"e\" }, { id: \"f\" },\n], row => row.id);\nexport const trace = {\n  appRenders: 0,\n  setters: Object.create(null),\n  mounts: Object.create(null),\n  cleanups: Object.create(null),\n  refAttachments: Object.create(null),\n  refCleanups: Object.create(null),\n};\n\nexport function captureItemNode(node) {\n  if (!node) return;\n  const id = node.props[\"data-row\"];\n  trace.refAttachments[id] = (trace.refAttachments[id] || 0) + 1;\n  return () => { trace.refCleanups[id] = (trace.refCleanups[id] || 0) + 1; };\n}\n\nexport function Item({ id }) {\n  const [count, setCount] = __nativeUseStateAt(\".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0\", 0);\n  __nativeUseEffectAt(\".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#effect:0\", () => {\n    trace.setters[id] = setCount;\n    trace.mounts[id] = (trace.mounts[id] || 0) + 1;\n    return () => {\n      trace.cleanups[id] = (trace.cleanups[id] || 0) + 1;\n    };\n  });\n  return <li key={id} data-row={id} data-count={__nativeBindStatePropAt(\".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0\", (count) => (count), __nativeNumericPrograms[0])}\n    ref={captureItemNode}>{id}</li>;\n}\n\nexport function List({ side }) {\n  return side === \"left\"\n    ? <ul key=\"left-list\" data-side=\"left\">{renderCollectionAt(\"compiled-scoped-left\", leftRows,\n        row => <Item key={row.id} id={row.id} />)}</ul>\n    : <ul key=\"right-list\" data-side=\"right\">{renderCollectionAt(\"compiled-scoped-right\", rightRows,\n        row => <Item key={row.id} id={row.id} />)}</ul>;\n}\n\nexport function App() {\n  trace.appRenders++;\n  return <section><List key=\"left\" side=\"left\" /><List key=\"right\" side=\"right\" /></section>;\n}",
	"components": [
		{
			"name": "App",
			"component_site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:App",
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
			"component_site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item",
			"prop_only_sites": [".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0"],
			"numeric_primitive_props": ["id"],
			"state_layout": {
				"schema_version": 1,
				"programId": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item",
				"moduleRevision": "native-v1-511f05d914ab2c7b",
				"slots": [{
					"site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#numeric-sink:1140",
				"source_sites": [".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:Item#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		},
		{
			"name": "List",
			"component_site_id": ".cache/compiled-scoped-collection/authored-1792618359741-12212-cdd6f07c-42ec-46de-b4a8-a996c4a99f77.tsx#component:List",
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
