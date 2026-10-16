import { createKeyedCollection } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, renderCollectionAt as __nativeRenderCollectionAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
const __nativeNumericPrograms = [
	{
		schemaVersion: 1,
		sinkId: ".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#numeric-sink:909",
		sourceSites: [".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:0"]
	},
	{
		schemaVersion: 1,
		sinkId: ".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#numeric-sink:928",
		sourceSites: [".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:1"]
	},
	{
		schemaVersion: 1,
		sinkId: ".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#numeric-sink:953",
		sourceSites: [".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:2"]
	}
];
__nativeDefineComponent(".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Board", Board, { propOnlySites: [] });
__nativeDefineComponent(".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row", Row, {
	propOnlySites: [
		".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:0",
		".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:1",
		".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:2"
	],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		slots: [
			{
				siteId: ".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:0",
				slot: 0
			},
			{
				siteId: ".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:1",
				slot: 1
			},
			{
				siteId: ".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:2",
				slot: 2
			}
		]
	}
});
export const rows = createKeyedCollection([{ id: "a" }, { id: "b" }], (row) => row.id);
export const trace = {
	renders: {},
	controls: {},
	candidateMutationKey: null,
	candidateMutations: 0
};
export function Row({ row }) {
	trace.renders[row.id] = (trace.renders[row.id] ?? 0) + 1;
	const [x, setX] = __nativeUseStateAt(".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:0", 0);
	const [y, setY] = __nativeUseStateAt(".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:1", 0);
	const [rotation, setRotation] = __nativeUseStateAt(".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:2", 0);
	trace.controls[row.id] = {
		x: setX,
		y: setY,
		rotation: setRotation
	};
	__nativeUseEffectAt(".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#effect:0", () => {
		return () => {
			if (trace.controls[row.id]?.x === setX) delete trace.controls[row.id];
		};
	});
	if (trace.candidateMutationKey === row.id) {
		trace.candidateMutations++;
		setX(999);
	}
	return /* @__PURE__ */ __nativeJsx.jsx("i", {
		"data-row": row.id,
		style: {
			left: __nativeBindStatePropAt(".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:0", (x) => `${x}px`, __nativeNumericPrograms[0]),
			top: __nativeBindStatePropAt(".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:1", (y) => `${y}px`, __nativeNumericPrograms[1]),
			transform: __nativeBindStatePropAt(".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:2", (rotation) => `rotate(${rotation}deg)`, __nativeNumericPrograms[2])
		}
	});
}
export function Board() {
	return /* @__PURE__ */ __nativeJsx.jsx("ul", null, __nativeRenderCollectionAt(".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Board#collection:0", rows, ((row) => /* @__PURE__ */ __nativeJsx.jsx(Row, {
		key: row.id,
		row
	}))));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { createKeyedCollection, useEffect, useState } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 1, sinkId: \".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#numeric-sink:909\", sourceSites: [\".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:0\"] }, { schemaVersion: 1, sinkId: \".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#numeric-sink:928\", sourceSites: [\".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:1\"] }, { schemaVersion: 1, sinkId: \".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#numeric-sink:953\", sourceSites: [\".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:2\"] }] as const;\n__nativeDefineComponent(\".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Board\", Board, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row\", Row, { propOnlySites: [\".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:0\", \".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:1\", \".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:2\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, slots: [{ siteId: \".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:0\", slot: 0 }, { siteId: \".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:1\", slot: 1 }, { siteId: \".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:2\", slot: 2 }] } });\nexport const rows = createKeyedCollection([{ id: \"a\" }, { id: \"b\" }], row => row.id);\nexport const trace = { renders: {}, controls: {}, candidateMutationKey: null, candidateMutations: 0 };\n\nexport function Row({ row }) {\n  trace.renders[row.id] = (trace.renders[row.id] ?? 0) + 1;\n  const [x, setX] = __nativeUseStateAt(\".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:0\", 0);\n  const [y, setY] = __nativeUseStateAt(\".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:1\", 0);\n  const [rotation, setRotation] = __nativeUseStateAt(\".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:2\", 0);\n  trace.controls[row.id] = { x: setX, y: setY, rotation: setRotation };\n  __nativeUseEffectAt(\".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#effect:0\", () => {\n    return () => {\n      if (trace.controls[row.id]?.x === setX) delete trace.controls[row.id];\n    };\n  });\n  if (trace.candidateMutationKey === row.id) {\n    trace.candidateMutations++;\n    setX(999);\n  }\n  return <i data-row={row.id} style={{\n    left: __nativeBindStatePropAt(\".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:0\", (x) => (`${x}px`), __nativeNumericPrograms[0]),\n    top: __nativeBindStatePropAt(\".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:1\", (y) => (`${y}px`), __nativeNumericPrograms[1]),\n    transform: __nativeBindStatePropAt(\".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:2\", (rotation) => (`rotate(${rotation}deg)`), __nativeNumericPrograms[2]),\n  }} />;\n}\n\nexport function Board() {\n  return <ul>{__nativeRenderCollectionAt(\".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Board#collection:0\", rows, (row => <Row key={row.id} row={row} />))}</ul>;\n}",
	"components": [{
		"name": "Board",
		"component_site_id": ".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Board",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": [{
			"site_id": ".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Board#collection:0",
			"source_expression": "rows",
			"row_parameter": "row",
			"requires_owner_render": false
		}]
	}, {
		"name": "Row",
		"component_site_id": ".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row",
		"prop_only_sites": [
			".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:0",
			".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:1",
			".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:2"
		],
		"state_layout": {
			"schema_version": 1,
			"slots": [
				{
					"site_id": ".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:0",
					"slot": 0
				},
				{
					"site_id": ".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:1",
					"slot": 1
				},
				{
					"site_id": ".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:2",
					"slot": 2
				}
			]
		},
		"host_leaf_output": true,
		"state_sites": [
			{
				"site_id": ".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:0",
				"initial_value": "0"
			},
			{
				"site_id": ".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:1",
				"initial_value": "0"
			},
			{
				"site_id": ".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#state:2",
				"initial_value": "0"
			}
		],
		"effect_sites": [{ "site_id": ".cache/numeric-state-layout/authored-layout-1791873621593-40139.tsx#component:Row#effect:0" }],
		"store_sites": [],
		"collection_sites": []
	}]
};
import * as __nativeJsx from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
