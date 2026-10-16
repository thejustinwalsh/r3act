import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, bindStatePropsAt as __nativeBindStatePropsAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
const __nativeNumericPrograms = [
	{
		schemaVersion: 1,
		sinkId: ".cache/native-unary-binding.tsx#numeric-sink:692",
		sourceSites: [".cache/native-unary-binding.tsx#component:App#state:0"]
	},
	{
		schemaVersion: 1,
		sinkId: ".cache/native-unary-binding.tsx#numeric-sink:710",
		sourceSites: [".cache/native-unary-binding.tsx#component:App#state:0"]
	},
	{
		schemaVersion: 1,
		sinkId: ".cache/native-unary-binding.tsx#numeric-sink:732",
		sourceSites: [".cache/native-unary-binding.tsx#component:App#state:0", ".cache/native-unary-binding.tsx#component:App#state:1"]
	}
];
__nativeDefineComponent(".cache/native-unary-binding.tsx#component:App", App, { propOnlySites: [".cache/native-unary-binding.tsx#component:App#state:0", ".cache/native-unary-binding.tsx#component:App#state:1"] });
__nativeDefineComponent(".cache/native-unary-binding.tsx#component:Row", Row, {
	propOnlySites: [],
	hostLeafOutput: true
});
export const controls = {};
export const metrics = {
	appRenders: 0,
	rowRenders: 0,
	effectSetups: 0,
	effectCleanups: 0
};
export function Row() {
	metrics.rowRenders++;
	__nativeUseEffectAt(".cache/native-unary-binding.tsx#component:Row#effect:0", () => {
		metrics.effectSetups++;
		return () => {
			metrics.effectCleanups++;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("aside", { "data-row": "retained" }, "row");
}
export function App() {
	metrics.appRenders++;
	const [x, setX] = __nativeUseStateAt(".cache/native-unary-binding.tsx#component:App#state:0", 1);
	const [y, setY] = __nativeUseStateAt(".cache/native-unary-binding.tsx#component:App#state:1", 2);
	controls.x = setX;
	controls.y = setY;
	return /* @__PURE__ */ __nativeJsx.jsx("section", null, /* @__PURE__ */ __nativeJsx.jsx("div", {
		"data-direct": __nativeBindStatePropAt(".cache/native-unary-binding.tsx#component:App#state:0", (x) => x, __nativeNumericPrograms[0]),
		"data-repeated": __nativeBindStatePropAt(".cache/native-unary-binding.tsx#component:App#state:0", (x) => x + x, __nativeNumericPrograms[1]),
		"data-compound": __nativeBindStatePropsAt([".cache/native-unary-binding.tsx#component:App#state:0", ".cache/native-unary-binding.tsx#component:App#state:1"], ([x, y]) => x + y, __nativeNumericPrograms[2])
	}), /* @__PURE__ */ __nativeJsx.jsx(Row, { key: "row" }));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/native-unary-binding.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { useState, useEffect } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 1, sinkId: \".cache/native-unary-binding.tsx#numeric-sink:692\", sourceSites: [\".cache/native-unary-binding.tsx#component:App#state:0\"] }, { schemaVersion: 1, sinkId: \".cache/native-unary-binding.tsx#numeric-sink:710\", sourceSites: [\".cache/native-unary-binding.tsx#component:App#state:0\"] }, { schemaVersion: 1, sinkId: \".cache/native-unary-binding.tsx#numeric-sink:732\", sourceSites: [\".cache/native-unary-binding.tsx#component:App#state:0\", \".cache/native-unary-binding.tsx#component:App#state:1\"] }] as const;\n__nativeDefineComponent(\".cache/native-unary-binding.tsx#component:App\", App, { propOnlySites: [\".cache/native-unary-binding.tsx#component:App#state:0\", \".cache/native-unary-binding.tsx#component:App#state:1\"] });\n__nativeDefineComponent(\".cache/native-unary-binding.tsx#component:Row\", Row, { propOnlySites: [], hostLeafOutput: true });\nexport const controls: Record<string, (value: number) => boolean> = {};\nexport const metrics = { appRenders: 0, rowRenders: 0, effectSetups: 0, effectCleanups: 0 };\nexport function Row() {\n  metrics.rowRenders++;\n  __nativeUseEffectAt(\".cache/native-unary-binding.tsx#component:Row#effect:0\", () => { metrics.effectSetups++; return () => { metrics.effectCleanups++; }; });\n  return <aside data-row=\"retained\">row</aside>;\n}\nexport function App() {\n  metrics.appRenders++;\n  const [x, setX] = __nativeUseStateAt(\".cache/native-unary-binding.tsx#component:App#state:0\", 1);\n  const [y, setY] = __nativeUseStateAt(\".cache/native-unary-binding.tsx#component:App#state:1\", 2);\n  controls.x = setX;\n  controls.y = setY;\n  return <section><div data-direct={__nativeBindStatePropAt(\".cache/native-unary-binding.tsx#component:App#state:0\", (x) => (x), __nativeNumericPrograms[0])} data-repeated={__nativeBindStatePropAt(\".cache/native-unary-binding.tsx#component:App#state:0\", (x) => (x + x), __nativeNumericPrograms[1])} data-compound={__nativeBindStatePropsAt([\".cache/native-unary-binding.tsx#component:App#state:0\", \".cache/native-unary-binding.tsx#component:App#state:1\"], ([x, y]) => (x + y), __nativeNumericPrograms[2])} /><Row key=\"row\" /></section>;\n}",
	"components": [{
		"name": "App",
		"component_site_id": ".cache/native-unary-binding.tsx#component:App",
		"prop_only_sites": [".cache/native-unary-binding.tsx#component:App#state:0", ".cache/native-unary-binding.tsx#component:App#state:1"],
		"host_leaf_output": false,
		"state_sites": [{
			"site_id": ".cache/native-unary-binding.tsx#component:App#state:0",
			"initial_value": "1"
		}, {
			"site_id": ".cache/native-unary-binding.tsx#component:App#state:1",
			"initial_value": "2"
		}],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": []
	}, {
		"name": "Row",
		"component_site_id": ".cache/native-unary-binding.tsx#component:Row",
		"prop_only_sites": [],
		"host_leaf_output": true,
		"state_sites": [],
		"effect_sites": [{ "site_id": ".cache/native-unary-binding.tsx#component:Row#effect:0" }],
		"store_sites": [],
		"collection_sites": []
	}]
};
import * as __nativeJsx from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
