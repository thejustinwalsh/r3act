import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "scene.tsx",
	"module_revision": "native-v1-6761fc70e91ee202",
	"owners": [{
		"site_id": "scene.tsx#component:SceneApp",
		"repeated_scope": "runtime-keyed-owner"
	}, {
		"site_id": "scene.tsx#component:SceneLeaf",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": "scene.tsx#component:SceneLeaf#store:0",
		"owner_site_id": "scene.tsx#component:SceneLeaf",
		"kind": "use-input",
		"provenance": "opaque"
	}],
	"sinks": [],
	"operations": [{
		"site_id": "scene.tsx#component:SceneLeaf#store:0",
		"owner_site_id": "scene.tsx#component:SceneLeaf",
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
		if (event?.sourceFile === "scene.tsx" && event.previousRevision === "native-v1-6761fc70e91ee202" && event.previousInstance === "native-v1-6761fc70e91ee202") __invalidateNativeSemanticPlan("scene.tsx", "native-v1-6761fc70e91ee202");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/host-three */
import { Suspense } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt, stabilizeHostTuple as __nativeStabilizeHostTuple } from "@r3act/core";
__nativeDefineComponent("scene.tsx#component:SceneApp", SceneApp, { propOnlySites: [] });
__nativeDefineComponent("scene.tsx#component:SceneLeaf", SceneLeaf, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "scene.tsx#component:SceneLeaf",
		"host": {
			"children": [{
				"host": {
					"children": [],
					"key": "scene-mesh",
					"props": [["position", {
						"items": [
							{
								"index": 0,
								"kind": "input"
							},
							{
								"kind": "literal",
								"value": 0
							},
							{
								"kind": "literal",
								"value": 0
							}
						],
						"kind": "tuple"
					}]],
					"tag": "mesh"
				},
				"kind": "host"
			}],
			"key": "scene-leaf",
			"props": [],
			"tag": "group"
		},
		"inputs": [{
			"paths": [["sample", "x"]],
			"storeProp": "resource",
			"storeUseSiteId": "scene.tsx#component:SceneLeaf#store:0"
		}],
		"moduleRevision": "native-v1-6761fc70e91ee202",
		"schemaVersion": 5
	}
});
export function SceneLeaf(props) {
	const value = __nativeUseAt("scene.tsx#component:SceneLeaf#store:0", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("group", { key: "scene-leaf" }, /* @__PURE__ */ __nativeJsx.jsx("mesh", {
		key: "scene-mesh",
		position: __nativeStabilizeHostTuple([
			value.sample.x,
			0,
			0
		])
	}));
}
export function SceneApp(props) {
	return /* @__PURE__ */ __nativeJsx.jsx("group", { key: "scene-root" }, /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("group", {
			key: "scene-leaf",
			name: "waiting"
		}),
		__nativeBoundarySite: "scene.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(SceneLeaf, {
		key: "scene-owner",
		resource: props.resource
	})));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-6761fc70e91ee202",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "scene.tsx",
		"module_revision": "native-v1-6761fc70e91ee202",
		"owners": [{
			"site_id": "scene.tsx#component:SceneApp",
			"repeated_scope": "runtime-keyed-owner"
		}, {
			"site_id": "scene.tsx#component:SceneLeaf",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": "scene.tsx#component:SceneLeaf#store:0",
			"owner_site_id": "scene.tsx#component:SceneLeaf",
			"kind": "use-input",
			"provenance": "opaque"
		}],
		"sinks": [],
		"operations": [{
			"site_id": "scene.tsx#component:SceneLeaf#store:0",
			"owner_site_id": "scene.tsx#component:SceneLeaf",
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
	"source_file": "scene.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/host-three */\n// @native-ui\nimport { Suspense, use } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt, stabilizeHostTuple as __nativeStabilizeHostTuple } from \"@r3act/core\";\n__nativeDefineComponent(\"scene.tsx#component:SceneApp\", SceneApp, { propOnlySites: [] });\n__nativeDefineComponent(\"scene.tsx#component:SceneLeaf\", SceneLeaf, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"scene.tsx#component:SceneLeaf\",\"host\":{\"children\":[{\"host\":{\"children\":[],\"key\":\"scene-mesh\",\"props\":[[\"position\",{\"items\":[{\"index\":0,\"kind\":\"input\"},{\"kind\":\"literal\",\"value\":0.0},{\"kind\":\"literal\",\"value\":0.0}],\"kind\":\"tuple\"}]],\"tag\":\"mesh\"},\"kind\":\"host\"}],\"key\":\"scene-leaf\",\"props\":[],\"tag\":\"group\"},\"inputs\":[{\"paths\":[[\"sample\",\"x\"]],\"storeProp\":\"resource\",\"storeUseSiteId\":\"scene.tsx#component:SceneLeaf#store:0\"}],\"moduleRevision\":\"native-v1-6761fc70e91ee202\",\"schemaVersion\":5} });\nimport type { SceneValue } from \"./state\";\nimport type { AsyncResource } from \"@r3act/core\";\n\nexport function SceneLeaf(props: { resource: AsyncResource<SceneValue> }) {\n  const value = __nativeUseAt(\"scene.tsx#component:SceneLeaf#store:0\", props.resource);\n  return <group key=\"scene-leaf\"><mesh key=\"scene-mesh\" position={__nativeStabilizeHostTuple([value.sample.x, 0, 0])} /></group>;\n}\nexport function SceneApp(props: { resource: AsyncResource<SceneValue> }) {\n  return <group key=\"scene-root\"><Suspense fallback={<group key=\"scene-leaf\" name=\"waiting\" />} __nativeBoundarySite=\"scene.tsx#boundary:0\">\n    <SceneLeaf key=\"scene-owner\" resource={props.resource} />\n  </Suspense></group>;\n}\n",
	"components": [{
		"name": "SceneApp",
		"component_site_id": "scene.tsx#component:SceneApp",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}, {
		"name": "SceneLeaf",
		"component_site_id": "scene.tsx#component:SceneLeaf",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [{
			"site_id": "scene.tsx#component:SceneLeaf#store:0",
			"source_expression": "props.resource"
		}],
		"closedStoreHostProgram": {
			"componentProgramId": "scene.tsx#component:SceneLeaf",
			"host": {
				"children": [{
					"host": {
						"children": [],
						"key": "scene-mesh",
						"props": [["position", {
							"items": [
								{
									"index": 0,
									"kind": "input"
								},
								{
									"kind": "literal",
									"value": 0
								},
								{
									"kind": "literal",
									"value": 0
								}
							],
							"kind": "tuple"
						}]],
						"tag": "mesh"
					},
					"kind": "host"
				}],
				"key": "scene-leaf",
				"props": [],
				"tag": "group"
			},
			"inputs": [{
				"paths": [["sample", "x"]],
				"storeProp": "resource",
				"storeUseSiteId": "scene.tsx#component:SceneLeaf#store:0"
			}],
			"moduleRevision": "native-v1-6761fc70e91ee202",
			"schemaVersion": 5
		},
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}]
};
import * as __nativeJsx from "@r3act/core";
