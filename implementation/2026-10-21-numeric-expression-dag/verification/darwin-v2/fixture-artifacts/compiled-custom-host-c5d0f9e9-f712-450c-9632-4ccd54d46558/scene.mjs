import { jsx, Fragment } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx",
	"module_revision": "native-v1-aa7250cbe47e6977",
	"owners": [{
		"site_id": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp#store:0",
		"owner_site_id": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp",
		"kind": "use-input",
		"provenance": "opaque"
	}],
	"sinks": [],
	"operations": [{
		"site_id": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp#store:0",
		"owner_site_id": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp",
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
		if (event?.sourceFile === ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx" && event.previousRevision === "native-v1-aa7250cbe47e6977" && event.previousInstance === "native-v1-aa7250cbe47e6977") __invalidateNativeSemanticPlan(".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx", "native-v1-aa7250cbe47e6977");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp", ThreeApp, {
	propOnlySites: [],
	closedResourceHostProgram: {
		"componentProgramId": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp",
		"host": {
			"children": [{
				"host": {
					"children": [],
					"key": "stage",
					"props": [["name", {
						"expressions": [{
							"index": 0,
							"kind": "input"
						}],
						"kind": "template",
						"parts": ["stage-", ""]
					}]],
					"tag": "group"
				},
				"kind": "host"
			}],
			"key": "scene",
			"props": [["name", {
				"kind": "literal",
				"value": "custom-host-scene"
			}]],
			"tag": "group"
		},
		"moduleRevision": "native-v1-aa7250cbe47e6977",
		"resourceProp": "stage",
		"resourceUseSiteId": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp#store:0",
		"schemaVersion": 2
	},
	closedStoreHostProgram: {
		"componentProgramId": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp",
		"host": {
			"children": [{
				"host": {
					"children": [],
					"key": "stage",
					"props": [["name", {
						"expressions": [{
							"index": 0,
							"kind": "input"
						}],
						"kind": "template",
						"parts": ["stage-", ""]
					}]],
					"tag": "group"
				},
				"kind": "host"
			}],
			"key": "scene",
			"props": [["name", {
				"kind": "literal",
				"value": "custom-host-scene"
			}]],
			"tag": "group"
		},
		"inputs": [{
			"storeProp": "stage",
			"storeUseSiteId": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp#store:0"
		}],
		"moduleRevision": "native-v1-aa7250cbe47e6977",
		"schemaVersion": 4
	}
});
export function ThreeApp(props) {
	const stage = __nativeUseAt(".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp#store:0", props.stage);
	return /* @__PURE__ */ jsx("group", {
		key: "scene",
		name: "custom-host-scene"
	}, /* @__PURE__ */ jsx("group", {
		key: "stage",
		name: `stage-${stage}`
	}));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-aa7250cbe47e6977",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx",
		"module_revision": "native-v1-aa7250cbe47e6977",
		"owners": [{
			"site_id": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp#store:0",
			"owner_site_id": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp",
			"kind": "use-input",
			"provenance": "opaque"
		}],
		"sinks": [],
		"operations": [{
			"site_id": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp#store:0",
			"owner_site_id": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp",
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
	"source_file": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/host-three */\n// @native-ui\nimport { use } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp\", ThreeApp, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp\",\"host\":{\"children\":[{\"host\":{\"children\":[],\"key\":\"stage\",\"props\":[[\"name\",{\"expressions\":[{\"index\":0,\"kind\":\"input\"}],\"kind\":\"template\",\"parts\":[\"stage-\",\"\"]}]],\"tag\":\"group\"},\"kind\":\"host\"}],\"key\":\"scene\",\"props\":[[\"name\",{\"kind\":\"literal\",\"value\":\"custom-host-scene\"}]],\"tag\":\"group\"},\"moduleRevision\":\"native-v1-aa7250cbe47e6977\",\"resourceProp\":\"stage\",\"resourceUseSiteId\":\".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp#store:0\",\"schemaVersion\":2}, closedStoreHostProgram: {\"componentProgramId\":\".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp\",\"host\":{\"children\":[{\"host\":{\"children\":[],\"key\":\"stage\",\"props\":[[\"name\",{\"expressions\":[{\"index\":0,\"kind\":\"input\"}],\"kind\":\"template\",\"parts\":[\"stage-\",\"\"]}]],\"tag\":\"group\"},\"kind\":\"host\"}],\"key\":\"scene\",\"props\":[[\"name\",{\"kind\":\"literal\",\"value\":\"custom-host-scene\"}]],\"tag\":\"group\"},\"inputs\":[{\"storeProp\":\"stage\",\"storeUseSiteId\":\".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp#store:0\"}],\"moduleRevision\":\"native-v1-aa7250cbe47e6977\",\"schemaVersion\":4} });\nimport type { StoreSource } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n\nexport function ThreeApp(props: { stage: StoreSource<string> }) {\n  const stage = __nativeUseAt(\".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp#store:0\", props.stage);\n  return <group key=\"scene\" name=\"custom-host-scene\">\n    <group key=\"stage\" name={`stage-${stage}`} />\n  </group>;\n}\n",
	"components": [{
		"name": "ThreeApp",
		"component_site_id": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [{
			"site_id": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp#store:0",
			"source_expression": "props.stage"
		}],
		"closedResourceHostProgram": {
			"componentProgramId": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp",
			"host": {
				"children": [{
					"host": {
						"children": [],
						"key": "stage",
						"props": [["name", {
							"expressions": [{
								"index": 0,
								"kind": "input"
							}],
							"kind": "template",
							"parts": ["stage-", ""]
						}]],
						"tag": "group"
					},
					"kind": "host"
				}],
				"key": "scene",
				"props": [["name", {
					"kind": "literal",
					"value": "custom-host-scene"
				}]],
				"tag": "group"
			},
			"moduleRevision": "native-v1-aa7250cbe47e6977",
			"resourceProp": "stage",
			"resourceUseSiteId": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp#store:0",
			"schemaVersion": 2
		},
		"closedStoreHostProgram": {
			"componentProgramId": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp",
			"host": {
				"children": [{
					"host": {
						"children": [],
						"key": "stage",
						"props": [["name", {
							"expressions": [{
								"index": 0,
								"kind": "input"
							}],
							"kind": "template",
							"parts": ["stage-", ""]
						}]],
						"tag": "group"
					},
					"kind": "host"
				}],
				"key": "scene",
				"props": [["name", {
					"kind": "literal",
					"value": "custom-host-scene"
				}]],
				"tag": "group"
			},
			"inputs": [{
				"storeProp": "stage",
				"storeUseSiteId": ".cache/compiled-custom-host-c5d0f9e9-f712-450c-9632-4ccd54d46558/scene.tsx#component:ThreeApp#store:0"
			}],
			"moduleRevision": "native-v1-aa7250cbe47e6977",
			"schemaVersion": 4
		},
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}]
};
