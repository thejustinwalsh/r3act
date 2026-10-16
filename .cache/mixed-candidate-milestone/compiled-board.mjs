import { createKeyedCollection, createStore } from "../../src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from "../../src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 1,
	sinkId: ".cache/mixed-candidate-milestone/authored-board.tsx#numeric-sink:1260",
	sourceSites: [".cache/mixed-candidate-milestone/authored-board.tsx#component:Row#state:0"]
}];
__nativeDefineComponent(".cache/mixed-candidate-milestone/authored-board.tsx#component:Board", Board, { propOnlySites: [] });
__nativeDefineComponent(".cache/mixed-candidate-milestone/authored-board.tsx#component:Row", Row, { propOnlySites: [".cache/mixed-candidate-milestone/authored-board.tsx#component:Row#state:0"] });
__nativeDefineComponent(".cache/mixed-candidate-milestone/authored-board.tsx#component:StoreProbe", StoreProbe, {
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
	const [x, setX] = __nativeUseStateAt(".cache/mixed-candidate-milestone/authored-board.tsx#component:Row#state:0", 0);
	trace.controls[row.id] = { setX };
	const sourceValue = row.id === "a" ? __nativeUseAt(".cache/mixed-candidate-milestone/authored-board.tsx#component:Row#store:0", shared) : null;
	__nativeUseEffectAt(".cache/mixed-candidate-milestone/authored-board.tsx#component:Row#effect:0", () => {
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
		"data-x": __nativeBindStatePropAt(".cache/mixed-candidate-milestone/authored-board.tsx#component:Row#state:0", (x) => x, __nativeNumericPrograms[0]),
		"data-source": sourceValue ?? "",
		"data-label": row.label
	}, row.label);
}
export function StoreProbe() {
	const value = __nativeUseAt(".cache/mixed-candidate-milestone/authored-board.tsx#component:StoreProbe#store:0", shared);
	__nativeUseEffectAt(".cache/mixed-candidate-milestone/authored-board.tsx#component:StoreProbe#effect:0", () => {
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
	const [boardState] = __nativeUseStateAt(".cache/mixed-candidate-milestone/authored-board.tsx#component:Board#state:0", "board");
	return /* @__PURE__ */ __nativeJsx.jsx("section", { "data-board-state": boardState }, /* @__PURE__ */ __nativeJsx.jsx(StoreProbe, null), /* @__PURE__ */ __nativeJsx.jsx("ul", null, __nativeRenderCollectionAt(".cache/mixed-candidate-milestone/authored-board.tsx#component:Board#collection:0", rows, ((row) => /* @__PURE__ */ __nativeJsx.jsx(Row, {
		key: row.id,
		row
	})))));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/mixed-candidate-milestone/authored-board.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { createKeyedCollection, createStore, use, useEffect, useState } from \"../../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../../src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 1, sinkId: \".cache/mixed-candidate-milestone/authored-board.tsx#numeric-sink:1260\", sourceSites: [\".cache/mixed-candidate-milestone/authored-board.tsx#component:Row#state:0\"] }] as const;\n__nativeDefineComponent(\".cache/mixed-candidate-milestone/authored-board.tsx#component:Board\", Board, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/mixed-candidate-milestone/authored-board.tsx#component:Row\", Row, { propOnlySites: [\".cache/mixed-candidate-milestone/authored-board.tsx#component:Row#state:0\"] });\n__nativeDefineComponent(\".cache/mixed-candidate-milestone/authored-board.tsx#component:StoreProbe\", StoreProbe, { propOnlySites: [], hostLeafOutput: true });\n\nexport const rows = createKeyedCollection([\n  { id: \"a\", label: \"Alpha\" },\n  { id: \"b\", label: \"Beta\" },\n  { id: \"c\", label: \"Gamma\" },\n], row => row.id);\nexport const shared = createStore(0);\nexport const trace = {\n  renders: Object.create(null),\n  controls: Object.create(null),\n  mounts: [],\n  cleanups: [],\n  refObservations: [],\n  storeObservations: [],\n  storeRefObservations: [],\n  effectObservations: [],\n  watchedNode: null,\n  probeNode: null,\n};\n\nexport function Row({ row }) {\n  trace.renders[row.id] = (trace.renders[row.id] || 0) + 1;\n  const [x, setX] = __nativeUseStateAt(\".cache/mixed-candidate-milestone/authored-board.tsx#component:Row#state:0\", 0);\n  trace.controls[row.id] = { setX };\n  const sourceValue = row.id === \"a\" ? __nativeUseAt(\".cache/mixed-candidate-milestone/authored-board.tsx#component:Row#store:0\", shared) : null;\n  __nativeUseEffectAt(\".cache/mixed-candidate-milestone/authored-board.tsx#component:Row#effect:0\", () => {\n    trace.mounts.push(row.id);\n    trace.effectObservations.push({\n      id: row.id,\n      watchedX: trace.watchedNode?.props[\"data-x\"],\n      probeValue: trace.probeNode?.props[\"data-source-probe\"],\n    });\n    return () => trace.cleanups.push(row.id);\n  });\n  return <li ref={node => {\n      if (node) trace.refObservations.push({\n        id: row.id,\n        watchedX: trace.watchedNode?.props[\"data-x\"],\n      });\n    }} data-row={row.id} data-x={__nativeBindStatePropAt(\".cache/mixed-candidate-milestone/authored-board.tsx#component:Row#state:0\", (x) => (x), __nativeNumericPrograms[0])} data-source={sourceValue ?? \"\"}\n    data-label={row.label}>{row.label}</li>;\n}\n\nexport function StoreProbe() {\n  const value = __nativeUseAt(\".cache/mixed-candidate-milestone/authored-board.tsx#component:StoreProbe#store:0\", shared);\n  __nativeUseEffectAt(\".cache/mixed-candidate-milestone/authored-board.tsx#component:StoreProbe#effect:0\", () => {\n    trace.storeObservations.push({\n      value,\n      watchedX: trace.watchedNode?.props[\"data-x\"],\n    });\n  });\n  return <output ref={node => {\n      if (!node) return;\n      trace.probeNode = node;\n      trace.storeRefObservations.push({\n        value: node.props[\"data-source-probe\"],\n        watchedX: trace.watchedNode?.props[\"data-x\"],\n      });\n    }} data-source-probe={value}>shared:{value}</output>;\n}\n\nexport function Board() {\n  const [boardState] = __nativeUseStateAt(\".cache/mixed-candidate-milestone/authored-board.tsx#component:Board#state:0\", \"board\");\n  return <section data-board-state={boardState}>\n    <StoreProbe />\n    <ul>{__nativeRenderCollectionAt(\".cache/mixed-candidate-milestone/authored-board.tsx#component:Board#collection:0\", rows, (row => <Row key={row.id} row={row} />))}</ul>\n  </section>;\n}",
	"components": [
		{
			"name": "Board",
			"component_site_id": ".cache/mixed-candidate-milestone/authored-board.tsx#component:Board",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/mixed-candidate-milestone/authored-board.tsx#component:Board#state:0",
				"initial_value": "\"board\""
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": ".cache/mixed-candidate-milestone/authored-board.tsx#component:Board#collection:0",
				"source_expression": "rows",
				"row_parameter": "row",
				"requires_owner_render": false
			}]
		},
		{
			"name": "Row",
			"component_site_id": ".cache/mixed-candidate-milestone/authored-board.tsx#component:Row",
			"prop_only_sites": [".cache/mixed-candidate-milestone/authored-board.tsx#component:Row#state:0"],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/mixed-candidate-milestone/authored-board.tsx#component:Row#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": ".cache/mixed-candidate-milestone/authored-board.tsx#component:Row#effect:0" }],
			"store_sites": [{
				"site_id": ".cache/mixed-candidate-milestone/authored-board.tsx#component:Row#store:0",
				"source_expression": "shared"
			}],
			"collection_sites": []
		},
		{
			"name": "StoreProbe",
			"component_site_id": ".cache/mixed-candidate-milestone/authored-board.tsx#component:StoreProbe",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [],
			"effect_sites": [{ "site_id": ".cache/mixed-candidate-milestone/authored-board.tsx#component:StoreProbe#effect:0" }],
			"store_sites": [{
				"site_id": ".cache/mixed-candidate-milestone/authored-board.tsx#component:StoreProbe#store:0",
				"source_expression": "shared"
			}],
			"collection_sites": []
		}
	]
};
import * as __nativeJsx from "../../src/native_runtime_api.ts";
