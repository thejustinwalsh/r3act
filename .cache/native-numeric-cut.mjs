import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, bindStatePropsAt as __nativeBindStatePropsAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
const __nativeNumericPrograms = [
	{
		schemaVersion: 1,
		sinkId: ".cache/native-numeric-cut.tsx#numeric-sink:418",
		sourceSites: [".cache/native-numeric-cut.tsx#component:Output#state:0"]
	},
	{
		schemaVersion: 1,
		sinkId: ".cache/native-numeric-cut.tsx#numeric-sink:429",
		sourceSites: [".cache/native-numeric-cut.tsx#component:Output#state:1"]
	},
	{
		schemaVersion: 1,
		sinkId: ".cache/native-numeric-cut.tsx#numeric-sink:442",
		sourceSites: [".cache/native-numeric-cut.tsx#component:Output#state:0", ".cache/native-numeric-cut.tsx#component:Output#state:1"]
	}
];
__nativeDefineComponent(".cache/native-numeric-cut.tsx#component:Output", Output, {
	propOnlySites: [".cache/native-numeric-cut.tsx#component:Output#state:0", ".cache/native-numeric-cut.tsx#component:Output#state:1"],
	hostLeafOutput: true
});
export const control = {};
export const trace = { renders: 0 };
export function Output() {
	trace.renders++;
	const [a, setA] = __nativeUseStateAt(".cache/native-numeric-cut.tsx#component:Output#state:0", 1);
	const [b, setB] = __nativeUseStateAt(".cache/native-numeric-cut.tsx#component:Output#state:1", 1);
	control.a = setA;
	control.b = setB;
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		"data-a": __nativeBindStatePropAt(".cache/native-numeric-cut.tsx#component:Output#state:0", (a) => a, __nativeNumericPrograms[0]),
		"data-b": __nativeBindStatePropAt(".cache/native-numeric-cut.tsx#component:Output#state:1", (b) => b, __nativeNumericPrograms[1]),
		"data-sum": __nativeBindStatePropsAt([".cache/native-numeric-cut.tsx#component:Output#state:0", ".cache/native-numeric-cut.tsx#component:Output#state:1"], ([a, b]) => a + b, __nativeNumericPrograms[2])
	});
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/native-numeric-cut.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { useState } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 1, sinkId: \".cache/native-numeric-cut.tsx#numeric-sink:418\", sourceSites: [\".cache/native-numeric-cut.tsx#component:Output#state:0\"] }, { schemaVersion: 1, sinkId: \".cache/native-numeric-cut.tsx#numeric-sink:429\", sourceSites: [\".cache/native-numeric-cut.tsx#component:Output#state:1\"] }, { schemaVersion: 1, sinkId: \".cache/native-numeric-cut.tsx#numeric-sink:442\", sourceSites: [\".cache/native-numeric-cut.tsx#component:Output#state:0\", \".cache/native-numeric-cut.tsx#component:Output#state:1\"] }] as const;\n__nativeDefineComponent(\".cache/native-numeric-cut.tsx#component:Output\", Output, { propOnlySites: [\".cache/native-numeric-cut.tsx#component:Output#state:0\", \".cache/native-numeric-cut.tsx#component:Output#state:1\"], hostLeafOutput: true });\nexport const control: Record<string, (value: number) => boolean> = {};\nexport const trace = { renders: 0 };\nexport function Output() {\n  trace.renders++;\n  const [a, setA] = __nativeUseStateAt(\".cache/native-numeric-cut.tsx#component:Output#state:0\", 1);\n  const [b, setB] = __nativeUseStateAt(\".cache/native-numeric-cut.tsx#component:Output#state:1\", 1);\n  control.a = setA;\n  control.b = setB;\n  return <output data-a={__nativeBindStatePropAt(\".cache/native-numeric-cut.tsx#component:Output#state:0\", (a) => (a), __nativeNumericPrograms[0])} data-b={__nativeBindStatePropAt(\".cache/native-numeric-cut.tsx#component:Output#state:1\", (b) => (b), __nativeNumericPrograms[1])} data-sum={__nativeBindStatePropsAt([\".cache/native-numeric-cut.tsx#component:Output#state:0\", \".cache/native-numeric-cut.tsx#component:Output#state:1\"], ([a, b]) => (a + b), __nativeNumericPrograms[2])} />;\n}",
	"components": [{
		"name": "Output",
		"component_site_id": ".cache/native-numeric-cut.tsx#component:Output",
		"prop_only_sites": [".cache/native-numeric-cut.tsx#component:Output#state:0", ".cache/native-numeric-cut.tsx#component:Output#state:1"],
		"host_leaf_output": true,
		"state_sites": [{
			"site_id": ".cache/native-numeric-cut.tsx#component:Output#state:0",
			"initial_value": "1"
		}, {
			"site_id": ".cache/native-numeric-cut.tsx#component:Output#state:1",
			"initial_value": "1"
		}],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": []
	}]
};
import * as __nativeJsx from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
