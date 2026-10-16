import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/derived-array-eligibility-stage/runtime/src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: ".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row",
	sinkId: ".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#numeric-sink:384",
	sourceSites: [".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row#state:0"]
}];
__nativeDefineComponent(".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent(".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row", Row, {
	propOnlySites: [".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row#state:0"],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: ".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row",
		slots: [{
			siteId: ".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row#state:0",
			slot: 0
		}]
	}
});
export const trace = {
	renders: 0,
	setValue: null
};
function Row() {
	trace.renders++;
	const [x, setValue] = __nativeUseStateAt(".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row#state:0", 1);
	trace.setValue = setValue;
	const parity = x % 2;
	return /* @__PURE__ */ __nativeJsx.jsx("mesh", { position: __nativeBindStatePropAt(".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row#state:0", (x) => [
		x,
		x % 2,
		0
	], __nativeNumericPrograms[0]) });
}
export function App() {
	return /* @__PURE__ */ __nativeJsx.jsx(Row, null);
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { useState } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/derived-array-eligibility-stage/runtime/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/derived-array-eligibility-stage/runtime/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row\", sinkId: \".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#numeric-sink:384\", sourceSites: [\".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row#state:0\"] }] as const;\n__nativeDefineComponent(\".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row\", Row, { propOnlySites: [\".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row#state:0\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row\", slots: [{ siteId: \".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row#state:0\", slot: 0 }] } });\nexport const trace = { renders: 0, setValue: null };\nfunction Row() {\n  trace.renders++;\n  const [x, setValue] = __nativeUseStateAt(\".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row#state:0\", 1);\n  trace.setValue = setValue;\n  const parity = x % 2;\n  return <mesh position={__nativeBindStatePropAt(\".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row#state:0\", (x) => ([x, (x % 2), 0]), __nativeNumericPrograms[0])} />;\n}\nexport function App() { return <Row />; }",
	"components": [{
		"name": "App",
		"component_site_id": ".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:App",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": []
	}, {
		"name": "Row",
		"component_site_id": ".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row",
		"prop_only_sites": [".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row#state:0"],
		"state_layout": {
			"schema_version": 1,
			"programId": ".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row",
			"slots": [{
				"site_id": ".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row#state:0",
				"slot": 0
			}]
		},
		"host_leaf_output": true,
		"state_sites": [{
			"site_id": ".cache/derived-array-eligibility-stage/proof/results/authored-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.tsx#component:Row#state:0",
			"initial_value": "1"
		}],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": []
	}]
};
import * as __nativeJsx from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/derived-array-eligibility-stage/runtime/src/native_runtime_api.ts";
