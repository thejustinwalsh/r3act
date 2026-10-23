import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "game-companion/hud.tsx",
	"module_revision": "native-v1-c428fa89fea3f0c4",
	"owners": [{
		"site_id": "game-companion/hud.tsx#component:Hud",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": "game-companion/hud.tsx#component:Hud#store:0",
		"owner_site_id": "game-companion/hud.tsx#component:Hud",
		"kind": "use-input",
		"provenance": "opaque"
	}],
	"sinks": [],
	"operations": [{
		"site_id": "game-companion/hud.tsx#component:Hud#store:0",
		"owner_site_id": "game-companion/hud.tsx#component:Hud",
		"kind": "use-store-or-resource",
		"provenance": "opaque",
		"source_sites": []
	}],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {},
		"execution_order": []
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "game-companion/hud.tsx" && event.previousRevision === "native-v1-c428fa89fea3f0c4" && event.previousInstance === "native-v1-c428fa89fea3f0c4") __invalidateNativeSemanticPlan("game-companion/hud.tsx", "native-v1-c428fa89fea3f0c4");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt } from "@r3act/core";
__nativeDefineComponent("game-companion/hud.tsx#component:Hud", Hud, {
	propOnlySites: [],
	closedResourceHostProgram: {
		"componentProgramId": "game-companion/hud.tsx#component:Hud",
		"host": {
			"children": [],
			"key": "hud",
			"props": [["data-tick", {
				"index": 0,
				"kind": "input"
			}]],
			"tag": "output"
		},
		"moduleRevision": "native-v1-c428fa89fea3f0c4",
		"resourceProp": "ticks",
		"resourceUseSiteId": "game-companion/hud.tsx#component:Hud#store:0",
		"schemaVersion": 2
	},
	closedStoreHostProgram: {
		"componentProgramId": "game-companion/hud.tsx#component:Hud",
		"host": {
			"child": null,
			"key": "hud",
			"props": [["data-tick", {
				"index": 0,
				"kind": "input"
			}]],
			"tag": "output"
		},
		"moduleRevision": "native-v1-c428fa89fea3f0c4",
		"schemaVersion": 1,
		"storeProp": "ticks",
		"storeUseSiteId": "game-companion/hud.tsx#component:Hud#store:0"
	},
	closedStoreExecution: {
		"componentProgramId": "game-companion/hud.tsx#component:Hud",
		"kind": "owned-data",
		"moduleRevision": "native-v1-c428fa89fea3f0c4",
		"schemaVersion": 3,
		"batchKernel": (sharedInputs, varyingInputs, outputs, rowCount) => {
			for (let row = 0; row < rowCount; row++) {
				const rowOutput = outputs[row];
				rowOutput[0] = sharedInputs[0];
			}
		}
	}
});
export function Hud(props) {
	const tick = __nativeUseAt("game-companion/hud.tsx#component:Hud#store:0", props.ticks);
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "hud",
		"data-tick": tick
	});
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-c428fa89fea3f0c4",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "game-companion/hud.tsx",
		"module_revision": "native-v1-c428fa89fea3f0c4",
		"owners": [{
			"site_id": "game-companion/hud.tsx#component:Hud",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": "game-companion/hud.tsx#component:Hud#store:0",
			"owner_site_id": "game-companion/hud.tsx#component:Hud",
			"kind": "use-input",
			"provenance": "opaque"
		}],
		"sinks": [],
		"operations": [{
			"site_id": "game-companion/hud.tsx#component:Hud#store:0",
			"owner_site_id": "game-companion/hud.tsx#component:Hud",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		}],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {},
			"execution_order": []
		}
	},
	"source_file": "game-companion/hud.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/core */\n// @native-ui\nimport { jsx, use, type StoreSource } from '@r3act/core';\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"game-companion/hud.tsx#component:Hud\", Hud, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\"game-companion/hud.tsx#component:Hud\",\"host\":{\"children\":[],\"key\":\"hud\",\"props\":[[\"data-tick\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"output\"},\"moduleRevision\":\"native-v1-c428fa89fea3f0c4\",\"resourceProp\":\"ticks\",\"resourceUseSiteId\":\"game-companion/hud.tsx#component:Hud#store:0\",\"schemaVersion\":2}, closedStoreHostProgram: {\"componentProgramId\":\"game-companion/hud.tsx#component:Hud\",\"host\":{\"child\":null,\"key\":\"hud\",\"props\":[[\"data-tick\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"output\"},\"moduleRevision\":\"native-v1-c428fa89fea3f0c4\",\"schemaVersion\":1,\"storeProp\":\"ticks\",\"storeUseSiteId\":\"game-companion/hud.tsx#component:Hud#store:0\"}, closedStoreExecution: {\"componentProgramId\":\"game-companion/hud.tsx#component:Hud\",\"kind\":\"owned-data\",\"moduleRevision\":\"native-v1-c428fa89fea3f0c4\",\"schemaVersion\":3,\"batchKernel\":(sharedInputs, varyingInputs, outputs, rowCount) => {for (let row = 0; row < rowCount; row++) {const rowOutput = outputs[row];rowOutput[0] = sharedInputs[0];}}} });\nexport function Hud(props: { ticks: StoreSource<number> }) {\n  const tick = __nativeUseAt(\"game-companion/hud.tsx#component:Hud#store:0\", props.ticks);\n  return <output key=\"hud\" data-tick={tick} />;\n}\n",
	"components": [{
		"name": "Hud",
		"component_site_id": "game-companion/hud.tsx#component:Hud",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [{
			"site_id": "game-companion/hud.tsx#component:Hud#store:0",
			"source_expression": "props.ticks"
		}],
		"closedResourceHostProgram": {
			"componentProgramId": "game-companion/hud.tsx#component:Hud",
			"host": {
				"children": [],
				"key": "hud",
				"props": [["data-tick", {
					"index": 0,
					"kind": "input"
				}]],
				"tag": "output"
			},
			"moduleRevision": "native-v1-c428fa89fea3f0c4",
			"resourceProp": "ticks",
			"resourceUseSiteId": "game-companion/hud.tsx#component:Hud#store:0",
			"schemaVersion": 2
		},
		"closedStoreHostProgram": {
			"componentProgramId": "game-companion/hud.tsx#component:Hud",
			"host": {
				"child": null,
				"key": "hud",
				"props": [["data-tick", {
					"index": 0,
					"kind": "input"
				}]],
				"tag": "output"
			},
			"moduleRevision": "native-v1-c428fa89fea3f0c4",
			"schemaVersion": 1,
			"storeProp": "ticks",
			"storeUseSiteId": "game-companion/hud.tsx#component:Hud#store:0"
		},
		"closedStoreExecution": {
			"componentProgramId": "game-companion/hud.tsx#component:Hud",
			"kind": "owned-data",
			"moduleRevision": "native-v1-c428fa89fea3f0c4",
			"schemaVersion": 3
		},
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}]
};
import * as __nativeJsx from "@r3act/core";
