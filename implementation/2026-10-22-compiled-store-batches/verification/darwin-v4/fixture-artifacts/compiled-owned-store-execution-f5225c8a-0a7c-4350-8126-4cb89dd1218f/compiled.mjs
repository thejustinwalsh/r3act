import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx",
	"module_revision": "native-v1-d0ec14cbf7e11fbf",
	"owners": [{
		"site_id": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data#store:0",
		"owner_site_id": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data",
		"kind": "use-input",
		"provenance": "opaque"
	}],
	"sinks": [],
	"operations": [{
		"site_id": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data#store:0",
		"owner_site_id": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data",
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
		if (event?.sourceFile === ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx" && event.previousRevision === "native-v1-d0ec14cbf7e11fbf" && event.previousInstance === "native-v1-d0ec14cbf7e11fbf") __invalidateNativeSemanticPlan(".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx", "native-v1-d0ec14cbf7e11fbf");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data", Data, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data",
		"host": {
			"children": [],
			"key": "data",
			"props": [["name", {
				"kind": "literal",
				"value": "renamed-phase-anchor"
			}], ["position-x", {
				"kind": "binary",
				"left": {
					"index": 0,
					"kind": "input"
				},
				"operator": "*",
				"right": {
					"kind": "literal",
					"value": 2
				}
			}]],
			"tag": "group"
		},
		"inputs": [{
			"paths": [["phase"]],
			"storeProp": "clock",
			"storeUseSiteId": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data#store:0"
		}],
		"moduleRevision": "native-v1-d0ec14cbf7e11fbf",
		"schemaVersion": 5
	},
	closedStoreExecution: {
		"componentProgramId": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data",
		"kind": "owned-data",
		"moduleRevision": "native-v1-d0ec14cbf7e11fbf",
		"schemaVersion": 3,
		"batchKernel": (sharedInputs, varyingInputs, outputs, rowCount) => {
			const $r3actDag0 = sharedInputs[0] * 2;
			for (let row = 0; row < rowCount; row++) {
				const rowOutput = outputs[row];
				rowOutput[1] = $r3actDag0;
			}
		}
	}
});
export const clock = createStore(storeRecord({ phase: 0 }));
export function Data(props) {
	const frame = __nativeUseAt(".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data#store:0", props.clock);
	return /* @__PURE__ */ jsx("group", {
		key: "data",
		name: "renamed-phase-anchor",
		"position-x": frame.phase * 2
	});
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-d0ec14cbf7e11fbf",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx",
		"module_revision": "native-v1-d0ec14cbf7e11fbf",
		"owners": [{
			"site_id": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data#store:0",
			"owner_site_id": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data",
			"kind": "use-input",
			"provenance": "opaque"
		}],
		"sinks": [],
		"operations": [{
			"site_id": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data#store:0",
			"owner_site_id": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data",
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
	"source_file": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport { createStore, storeRecord, use, jsx } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data\", Data, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data\",\"host\":{\"children\":[],\"key\":\"data\",\"props\":[[\"name\",{\"kind\":\"literal\",\"value\":\"renamed-phase-anchor\"}],[\"position-x\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":2.0}}]],\"tag\":\"group\"},\"inputs\":[{\"paths\":[[\"phase\"]],\"storeProp\":\"clock\",\"storeUseSiteId\":\".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data#store:0\"}],\"moduleRevision\":\"native-v1-d0ec14cbf7e11fbf\",\"schemaVersion\":5}, closedStoreExecution: {\"componentProgramId\":\".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data\",\"kind\":\"owned-data\",\"moduleRevision\":\"native-v1-d0ec14cbf7e11fbf\",\"schemaVersion\":3,\"batchKernel\":(sharedInputs, varyingInputs, outputs, rowCount) => {const $r3actDag0 = ((sharedInputs[0] * 2.0));for (let row = 0; row < rowCount; row++) {const rowOutput = outputs[row];rowOutput[1] = $r3actDag0;}}} });\nexport const clock = createStore(storeRecord({ phase: 0 }));\nexport function Data(props) {\n  const frame = __nativeUseAt(\".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data#store:0\", props.clock);\n  return <group key=\"data\" name=\"renamed-phase-anchor\" position-x={frame.phase * 2} />;\n}",
	"components": [{
		"name": "Data",
		"component_site_id": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [{
			"site_id": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data#store:0",
			"source_expression": "props.clock"
		}],
		"closedStoreHostProgram": {
			"componentProgramId": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data",
			"host": {
				"children": [],
				"key": "data",
				"props": [["name", {
					"kind": "literal",
					"value": "renamed-phase-anchor"
				}], ["position-x", {
					"kind": "binary",
					"left": {
						"index": 0,
						"kind": "input"
					},
					"operator": "*",
					"right": {
						"kind": "literal",
						"value": 2
					}
				}]],
				"tag": "group"
			},
			"inputs": [{
				"paths": [["phase"]],
				"storeProp": "clock",
				"storeUseSiteId": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data#store:0"
			}],
			"moduleRevision": "native-v1-d0ec14cbf7e11fbf",
			"schemaVersion": 5
		},
		"closedStoreExecution": {
			"componentProgramId": ".cache/compiled-owned-store-execution-f5225c8a-0a7c-4350-8126-4cb89dd1218f/authored.tsx#component:Data",
			"kind": "owned-data",
			"moduleRevision": "native-v1-d0ec14cbf7e11fbf",
			"schemaVersion": 3
		},
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}]
};
