import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, bindStatePropsAt as __nativeBindStatePropsAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
const __nativeNumericPrograms = [
	{
		schemaVersion: 1,
		sinkId: ".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#numeric-sink:761",
		sourceSites: [".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:0"]
	},
	{
		schemaVersion: 1,
		sinkId: ".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#numeric-sink:772",
		sourceSites: [".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:1"]
	},
	{
		schemaVersion: 1,
		sinkId: ".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#numeric-sink:785",
		sourceSites: [".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:0", ".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:1"]
	},
	{
		schemaVersion: 1,
		sinkId: ".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#numeric-sink:811",
		sourceSites: [".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:0"]
	},
	{
		schemaVersion: 1,
		sinkId: ".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#numeric-sink:826",
		sourceSites: [".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:1"]
	}
];
__nativeDefineComponent(".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row", Row, { propOnlySites: [".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:0", ".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:1"] });
export const controls = {};
export const trace = {
	renders: Array.from({ length: 32 }, () => 0),
	appRenders: 0
};
export let showLast;
const ids = Array.from({ length: 32 }, (_, index) => index);
export function Row({ id }) {
	trace.renders[id]++;
	const [x, setX] = __nativeUseStateAt(".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:0", 0);
	const [y, setY] = __nativeUseStateAt(".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:1", 0);
	const [label, setLabel] = __nativeUseStateAt(".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:2", "row-" + id);
	controls[id] = {
		x: setX,
		y: setY,
		label: setLabel
	};
	return /* @__PURE__ */ __nativeJsx.jsx("div", {
		"data-row": id,
		"data-x": __nativeBindStatePropAt(".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:0", (x) => x, __nativeNumericPrograms[0]),
		"data-y": __nativeBindStatePropAt(".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:1", (y) => y, __nativeNumericPrograms[1]),
		"data-sum": __nativeBindStatePropsAt([".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:0", ".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:1"], ([x, y]) => x + y, __nativeNumericPrograms[2]),
		style: {
			left: __nativeBindStatePropAt(".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:0", (x) => `${x}px`, __nativeNumericPrograms[3]),
			top: __nativeBindStatePropAt(".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:1", (y) => `${y}px`, __nativeNumericPrograms[4]),
			width: "7px"
		}
	}, label);
}
export function App() {
	trace.appRenders++;
	const [visible, setVisible] = __nativeUseStateAt(".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:App#state:0", true);
	showLast = setVisible;
	return /* @__PURE__ */ __nativeJsx.jsx("main", null, ids.map((id) => id === 31 && !visible ? null : /* @__PURE__ */ __nativeJsx.jsx(Row, {
		key: id,
		id
	})));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/native-cell-cut-milestone/authored-numeric-cells.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { useState } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 1, sinkId: \".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#numeric-sink:761\", sourceSites: [\".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:0\"] }, { schemaVersion: 1, sinkId: \".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#numeric-sink:772\", sourceSites: [\".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:1\"] }, { schemaVersion: 1, sinkId: \".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#numeric-sink:785\", sourceSites: [\".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:0\", \".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:1\"] }, { schemaVersion: 1, sinkId: \".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#numeric-sink:811\", sourceSites: [\".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:0\"] }, { schemaVersion: 1, sinkId: \".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#numeric-sink:826\", sourceSites: [\".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:1\"] }] as const;\n__nativeDefineComponent(\".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row\", Row, { propOnlySites: [\".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:0\", \".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:1\"] });\nexport const controls: Record<number, {\n  x: (value: number) => boolean;\n  y: (value: number) => boolean;\n  label: (value: string) => boolean;\n}> = {};\nexport const trace = { renders: Array.from({ length: 32 }, () => 0), appRenders: 0 };\nexport let showLast: (value: boolean) => boolean;\nconst ids = Array.from({ length: 32 }, (_, index) => index);\n\nexport function Row({ id }: { id: number }) {\n  trace.renders[id]++;\n  const [x, setX] = __nativeUseStateAt(\".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:0\", 0);\n  const [y, setY] = __nativeUseStateAt(\".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:1\", 0);\n  const [label, setLabel] = __nativeUseStateAt(\".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:2\", \"row-\" + id);\n  controls[id] = { x: setX, y: setY, label: setLabel };\n  return <div data-row={id} data-x={__nativeBindStatePropAt(\".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:0\", (x) => (x), __nativeNumericPrograms[0])} data-y={__nativeBindStatePropAt(\".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:1\", (y) => (y), __nativeNumericPrograms[1])} data-sum={__nativeBindStatePropsAt([\".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:0\", \".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:1\"], ([x, y]) => (x + y), __nativeNumericPrograms[2])}\n    style={{ left: __nativeBindStatePropAt(\".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:0\", (x) => (`${x}px`), __nativeNumericPrograms[3]), top: __nativeBindStatePropAt(\".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:1\", (y) => (`${y}px`), __nativeNumericPrograms[4]), width: \"7px\" }}>{label}</div>;\n}\n\nexport function App() {\n  trace.appRenders++;\n  const [visible, setVisible] = __nativeUseStateAt(\".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:App#state:0\", true);\n  showLast = setVisible;\n  return <main>{ids.map(id => id === 31 && !visible ? null : <Row key={id} id={id} />)}</main>;\n}",
	"components": [{
		"name": "App",
		"component_site_id": ".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:App",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [{
			"site_id": ".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:App#state:0",
			"initial_value": "true"
		}],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": []
	}, {
		"name": "Row",
		"component_site_id": ".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row",
		"prop_only_sites": [".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:0", ".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:1"],
		"host_leaf_output": false,
		"state_sites": [
			{
				"site_id": ".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:0",
				"initial_value": "0"
			},
			{
				"site_id": ".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:1",
				"initial_value": "0"
			},
			{
				"site_id": ".cache/native-cell-cut-milestone/authored-numeric-cells.tsx#component:Row#state:2",
				"initial_value": "\"row-\" + id"
			}
		],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": []
	}]
};
import * as __nativeJsx from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
