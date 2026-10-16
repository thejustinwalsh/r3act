import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "../../src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/publication-20261016-mixed-proof/authored-board.tsx",
	"module_revision": "native-v1-8fe3ba71272bc97d",
	"owners": [
		{
			"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board#state:0",
			"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0",
			"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#store:0",
			"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe#store:0",
			"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [{
		"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#opaque-sink:1941",
		"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board",
		"source_sites": [],
		"provenance": "opaque",
		"equality": "adapter-declared",
		"host_value": "adapter-declared",
		"retention": "adapter-declared",
		"execution": "generic"
	}, {
		"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#numeric-sink:1260",
		"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row",
		"source_sites": [".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}],
	"operations": [
		{
			"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board#collection:0",
			"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board",
			"kind": "collection",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#store:0",
			"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#effect:0",
			"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe#store:0",
			"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe#effect:0",
			"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": { ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0": [".cache/publication-20261016-mixed-proof/authored-board.tsx#numeric-sink:1260"] },
		"execution_order": [".cache/publication-20261016-mixed-proof/authored-board.tsx#numeric-sink:1260"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === ".cache/publication-20261016-mixed-proof/authored-board.tsx") __invalidateNativeSemanticPlan(".cache/publication-20261016-mixed-proof/authored-board.tsx", "native-v1-8fe3ba71272bc97d");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { createKeyedCollection, createStore } from "../../src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from "../../src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row",
	sinkId: ".cache/publication-20261016-mixed-proof/authored-board.tsx#numeric-sink:1260",
	sourceSites: [".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0"]
}];
const __nativeOwnerCutKernels = [{
	schemaVersion: 2,
	programId: ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row",
	slotCount: 1,
	sinkIds: [".cache/publication-20261016-mixed-proof/authored-board.tsx#numeric-sink:1260"],
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
__nativeDefineComponent(".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board", Board, { propOnlySites: [] });
__nativeDefineComponent(".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row", Row, {
	propOnlySites: [".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0"],
	stateLayout: {
		schemaVersion: 1,
		programId: ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row",
		moduleRevision: "native-v1-8fe3ba71272bc97d",
		slots: [{
			siteId: ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
__nativeDefineComponent(".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe", StoreProbe, {
	propOnlySites: [],
	hostLeafOutput: true
});
export const rows = createKeyedCollection([
	{
		id: "a",
		label: "Alpha"
	},
	{
		id: "b",
		label: "Beta"
	},
	{
		id: "c",
		label: "Gamma"
	}
], (row) => row.id);
export const shared = createStore(0);
export const trace = {
	renders: Object.create(null),
	controls: Object.create(null),
	mounts: [],
	cleanups: [],
	refObservations: [],
	storeObservations: [],
	storeRefObservations: [],
	effectObservations: [],
	watchedNode: null,
	probeNode: null
};
export function Row({ row }) {
	trace.renders[row.id] = (trace.renders[row.id] || 0) + 1;
	const [x, setX] = __nativeUseStateAt(".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0", 0);
	trace.controls[row.id] = { setX };
	const sourceValue = row.id === "a" ? __nativeUseAt(".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#store:0", shared) : null;
	__nativeUseEffectAt(".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#effect:0", () => {
		trace.mounts.push(row.id);
		trace.effectObservations.push({
			id: row.id,
			watchedX: trace.watchedNode?.props["data-x"],
			probeValue: trace.probeNode?.props["data-source-probe"]
		});
		return () => trace.cleanups.push(row.id);
	});
	return /* @__PURE__ */ __nativeJsx.jsx("li", {
		ref: (node) => {
			if (node) trace.refObservations.push({
				id: row.id,
				watchedX: trace.watchedNode?.props["data-x"]
			});
		},
		"data-row": row.id,
		"data-x": __nativeBindStatePropAt(".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0", (x) => x, __nativeNumericPrograms[0]),
		"data-source": sourceValue ?? "",
		"data-label": row.label
	}, row.label);
}
export function StoreProbe() {
	const value = __nativeUseAt(".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe#store:0", shared);
	__nativeUseEffectAt(".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe#effect:0", () => {
		trace.storeObservations.push({
			value,
			watchedX: trace.watchedNode?.props["data-x"]
		});
	});
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		ref: (node) => {
			if (!node) return;
			trace.probeNode = node;
			trace.storeRefObservations.push({
				value: node.props["data-source-probe"],
				watchedX: trace.watchedNode?.props["data-x"]
			});
		},
		"data-source-probe": value
	}, "shared:", value);
}
export function Board() {
	const [boardState] = __nativeUseStateAt(".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board#state:0", "board");
	return /* @__PURE__ */ __nativeJsx.jsx("section", { "data-board-state": boardState }, /* @__PURE__ */ __nativeJsx.jsx(StoreProbe, null), /* @__PURE__ */ __nativeJsx.jsx("ul", null, __nativeRenderCollectionAt(".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board#collection:0", rows, ((row) => /* @__PURE__ */ __nativeJsx.jsx(Row, {
		key: row.id,
		row
	})))));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-8fe3ba71272bc97d",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/publication-20261016-mixed-proof/authored-board.tsx",
		"module_revision": "native-v1-8fe3ba71272bc97d",
		"owners": [
			{
				"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board#state:0",
				"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0",
				"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#store:0",
				"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe#store:0",
				"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [{
			"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#opaque-sink:1941",
			"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}, {
			"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#numeric-sink:1260",
			"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row",
			"source_sites": [".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}],
		"operations": [
			{
				"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board#collection:0",
				"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board",
				"kind": "collection",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#store:0",
				"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#effect:0",
				"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe#store:0",
				"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe#effect:0",
				"owner_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": { ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0": [".cache/publication-20261016-mixed-proof/authored-board.tsx#numeric-sink:1260"] },
			"execution_order": [".cache/publication-20261016-mixed-proof/authored-board.tsx#numeric-sink:1260"]
		}
	},
	"source_file": ".cache/publication-20261016-mixed-proof/authored-board.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { createKeyedCollection, createStore, use, useEffect, useState } from \"../../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../../src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row\", sinkId: \".cache/publication-20261016-mixed-proof/authored-board.tsx#numeric-sink:1260\", sourceSites: [\".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"../../src/native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 2, programId: \".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row\", slotCount: 1, sinkIds: [\".cache/publication-20261016-mixed-proof/authored-board.tsx#numeric-sink:1260\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\n__nativeDefineComponent(\".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board\", Board, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row\", Row, { propOnlySites: [\".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0\"], stateLayout: { schemaVersion: 1, programId: \".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row\", moduleRevision: \"native-v1-8fe3ba71272bc97d\", slots: [{ siteId: \".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\n__nativeDefineComponent(\".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe\", StoreProbe, { propOnlySites: [], hostLeafOutput: true });\n\nexport const rows = createKeyedCollection([\n  { id: \"a\", label: \"Alpha\" },\n  { id: \"b\", label: \"Beta\" },\n  { id: \"c\", label: \"Gamma\" },\n], row => row.id);\nexport const shared = createStore(0);\nexport const trace = {\n  renders: Object.create(null),\n  controls: Object.create(null),\n  mounts: [],\n  cleanups: [],\n  refObservations: [],\n  storeObservations: [],\n  storeRefObservations: [],\n  effectObservations: [],\n  watchedNode: null,\n  probeNode: null,\n};\n\nexport function Row({ row }) {\n  trace.renders[row.id] = (trace.renders[row.id] || 0) + 1;\n  const [x, setX] = __nativeUseStateAt(\".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0\", 0);\n  trace.controls[row.id] = { setX };\n  const sourceValue = row.id === \"a\" ? __nativeUseAt(\".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#store:0\", shared) : null;\n  __nativeUseEffectAt(\".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#effect:0\", () => {\n    trace.mounts.push(row.id);\n    trace.effectObservations.push({\n      id: row.id,\n      watchedX: trace.watchedNode?.props[\"data-x\"],\n      probeValue: trace.probeNode?.props[\"data-source-probe\"],\n    });\n    return () => trace.cleanups.push(row.id);\n  });\n  return <li ref={node => {\n      if (node) trace.refObservations.push({\n        id: row.id,\n        watchedX: trace.watchedNode?.props[\"data-x\"],\n      });\n    }} data-row={row.id} data-x={__nativeBindStatePropAt(\".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0\", (x) => (x), __nativeNumericPrograms[0])} data-source={sourceValue ?? \"\"}\n    data-label={row.label}>{row.label}</li>;\n}\n\nexport function StoreProbe() {\n  const value = __nativeUseAt(\".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe#store:0\", shared);\n  __nativeUseEffectAt(\".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe#effect:0\", () => {\n    trace.storeObservations.push({\n      value,\n      watchedX: trace.watchedNode?.props[\"data-x\"],\n    });\n  });\n  return <output ref={node => {\n      if (!node) return;\n      trace.probeNode = node;\n      trace.storeRefObservations.push({\n        value: node.props[\"data-source-probe\"],\n        watchedX: trace.watchedNode?.props[\"data-x\"],\n      });\n    }} data-source-probe={value}>shared:{value}</output>;\n}\n\nexport function Board() {\n  const [boardState] = __nativeUseStateAt(\".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board#state:0\", \"board\");\n  return <section data-board-state={boardState}>\n    <StoreProbe />\n    <ul>{__nativeRenderCollectionAt(\".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board#collection:0\", rows, (row => <Row key={row.id} row={row} />))}</ul>\n  </section>;\n}",
	"components": [
		{
			"name": "Board",
			"component_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board#state:0",
				"initial_value": "\"board\""
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Board#collection:0",
				"source_expression": "rows",
				"row_parameter": "row",
				"requires_owner_render": false
			}],
			"numeric_sinks": [],
			"opaque_sinks": [".cache/publication-20261016-mixed-proof/authored-board.tsx#opaque-sink:1941"]
		},
		{
			"name": "Row",
			"component_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row",
			"prop_only_sites": [".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0"],
			"state_layout": {
				"schema_version": 1,
				"programId": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row",
				"moduleRevision": "native-v1-8fe3ba71272bc97d",
				"slots": [{
					"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#effect:0" }],
			"store_sites": [{
				"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#store:0",
				"source_expression": "shared"
			}],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#numeric-sink:1260",
				"source_sites": [".cache/publication-20261016-mixed-proof/authored-board.tsx#component:Row#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		},
		{
			"name": "StoreProbe",
			"component_site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [],
			"effect_sites": [{ "site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe#effect:0" }],
			"store_sites": [{
				"site_id": ".cache/publication-20261016-mixed-proof/authored-board.tsx#component:StoreProbe#store:0",
				"source_expression": "shared"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "../../src/native_runtime_api.ts";
