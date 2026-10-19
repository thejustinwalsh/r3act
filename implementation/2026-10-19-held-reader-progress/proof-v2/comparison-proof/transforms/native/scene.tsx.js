import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "scene.tsx",
	"module_revision": "native-v1-12f7d2b68e9bef12",
	"owners": [{
		"site_id": "scene.tsx#component:HeldThree",
		"repeated_scope": "runtime-keyed-owner"
	}, {
		"site_id": "scene.tsx#component:SceneApp",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": "scene.tsx#component:HeldThree#store:0",
		"owner_site_id": "scene.tsx#component:HeldThree",
		"kind": "use-input",
		"provenance": "opaque"
	}, {
		"site_id": "scene.tsx#component:HeldThree#store:1",
		"owner_site_id": "scene.tsx#component:HeldThree",
		"kind": "use-input",
		"provenance": "opaque"
	}],
	"sinks": [],
	"operations": [{
		"site_id": "scene.tsx#component:HeldThree#store:0",
		"owner_site_id": "scene.tsx#component:HeldThree",
		"kind": "use-store-or-resource",
		"provenance": "opaque",
		"source_sites": []
	}, {
		"site_id": "scene.tsx#component:HeldThree#store:1",
		"owner_site_id": "scene.tsx#component:HeldThree",
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
		if (event?.sourceFile === "scene.tsx" && event.previousRevision === "native-v1-12f7d2b68e9bef12" && event.previousInstance === "native-v1-12f7d2b68e9bef12") __invalidateNativeSemanticPlan("scene.tsx", "native-v1-12f7d2b68e9bef12");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/host-three */
import { Suspense } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt, stabilizeHostTuple as __nativeStabilizeHostTuple } from "@r3act/core";
__nativeDefineComponent("scene.tsx#component:HeldThree", HeldThree, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "scene.tsx#component:HeldThree",
		"host": {
			"children": [{
				"host": {
					"children": [],
					"key": "held-mesh",
					"props": [["position", {
						"items": [
							{
								"index": 0,
								"kind": "input"
							},
							{
								"index": 2,
								"kind": "input"
							},
							{
								"kind": "binary",
								"left": {
									"index": 1,
									"kind": "input"
								},
								"operator": "+",
								"right": {
									"index": 3,
									"kind": "input"
								}
							}
						],
						"kind": "tuple"
					}]],
					"tag": "mesh"
				},
				"kind": "host"
			}],
			"key": "held-three",
			"props": [],
			"tag": "group"
		},
		"inputs": [{
			"paths": [["vector", "x"], ["vector", "y"]],
			"storeProp": "heldA",
			"storeUseSiteId": "scene.tsx#component:HeldThree#store:0"
		}, {
			"paths": [["sample", "x"], ["sample", "y"]],
			"storeProp": "resource",
			"storeUseSiteId": "scene.tsx#component:HeldThree#store:1"
		}],
		"moduleRevision": "native-v1-12f7d2b68e9bef12",
		"schemaVersion": 5
	}
});
__nativeDefineComponent("scene.tsx#component:SceneApp", SceneApp, { propOnlySites: [] });
export function HeldThree(props) {
	const a = __nativeUseAt("scene.tsx#component:HeldThree#store:0", props.heldA);
	const signal = __nativeUseAt("scene.tsx#component:HeldThree#store:1", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("group", { key: "held-three" }, /* @__PURE__ */ __nativeJsx.jsx("mesh", {
		key: "held-mesh",
		position: __nativeStabilizeHostTuple([
			a.vector.x,
			signal.sample.x,
			a.vector.y + signal.sample.y
		])
	}));
}
export function SceneApp(props) {
	return /* @__PURE__ */ __nativeJsx.jsx("group", { key: "scene-root" }, /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("group", {
			key: "held-three",
			name: "waiting"
		}),
		__nativeBoundarySite: "scene.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(HeldThree, {
		key: "held-three-owner",
		heldA: props.domain.heldA,
		resource: props.domain.signal
	})));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-12f7d2b68e9bef12",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "scene.tsx",
		"module_revision": "native-v1-12f7d2b68e9bef12",
		"owners": [{
			"site_id": "scene.tsx#component:HeldThree",
			"repeated_scope": "runtime-keyed-owner"
		}, {
			"site_id": "scene.tsx#component:SceneApp",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": "scene.tsx#component:HeldThree#store:0",
			"owner_site_id": "scene.tsx#component:HeldThree",
			"kind": "use-input",
			"provenance": "opaque"
		}, {
			"site_id": "scene.tsx#component:HeldThree#store:1",
			"owner_site_id": "scene.tsx#component:HeldThree",
			"kind": "use-input",
			"provenance": "opaque"
		}],
		"sinks": [],
		"operations": [{
			"site_id": "scene.tsx#component:HeldThree#store:0",
			"owner_site_id": "scene.tsx#component:HeldThree",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		}, {
			"site_id": "scene.tsx#component:HeldThree#store:1",
			"owner_site_id": "scene.tsx#component:HeldThree",
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
	"component_module": "/** @jsxImportSource @r3act/host-three */\n// @native-ui\nimport { Suspense, use } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt, stabilizeHostTuple as __nativeStabilizeHostTuple } from \"@r3act/core\";\n__nativeDefineComponent(\"scene.tsx#component:HeldThree\", HeldThree, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"scene.tsx#component:HeldThree\",\"host\":{\"children\":[{\"host\":{\"children\":[],\"key\":\"held-mesh\",\"props\":[[\"position\",{\"items\":[{\"index\":0,\"kind\":\"input\"},{\"index\":2,\"kind\":\"input\"},{\"kind\":\"binary\",\"left\":{\"index\":1,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"index\":3,\"kind\":\"input\"}}],\"kind\":\"tuple\"}]],\"tag\":\"mesh\"},\"kind\":\"host\"}],\"key\":\"held-three\",\"props\":[],\"tag\":\"group\"},\"inputs\":[{\"paths\":[[\"vector\",\"x\"],[\"vector\",\"y\"]],\"storeProp\":\"heldA\",\"storeUseSiteId\":\"scene.tsx#component:HeldThree#store:0\"},{\"paths\":[[\"sample\",\"x\"],[\"sample\",\"y\"]],\"storeProp\":\"resource\",\"storeUseSiteId\":\"scene.tsx#component:HeldThree#store:1\"}],\"moduleRevision\":\"native-v1-12f7d2b68e9bef12\",\"schemaVersion\":5} });\n__nativeDefineComponent(\"scene.tsx#component:SceneApp\", SceneApp, { propOnlySites: [] });\nimport type { Domain } from \"./state\";\n\nexport function HeldThree(props: { heldA: Domain[\"heldA\"]; resource: Domain[\"signal\"] }) {\n  const a = __nativeUseAt(\"scene.tsx#component:HeldThree#store:0\", props.heldA);\n  const signal = __nativeUseAt(\"scene.tsx#component:HeldThree#store:1\", props.resource);\n  return <group key=\"held-three\"><mesh key=\"held-mesh\" position={__nativeStabilizeHostTuple([a.vector.x,\n    signal.sample.x, a.vector.y + signal.sample.y])} /></group>;\n}\n\nexport function SceneApp(props: { domain: Domain }) {\n  return <group key=\"scene-root\">\n    <Suspense fallback={<group key=\"held-three\" name=\"waiting\" />} __nativeBoundarySite=\"scene.tsx#boundary:0\">\n      <HeldThree key=\"held-three-owner\" heldA={props.domain.heldA}\n        resource={props.domain.signal} />\n    </Suspense>\n  </group>;\n}\n",
	"components": [{
		"name": "HeldThree",
		"component_site_id": "scene.tsx#component:HeldThree",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [{
			"site_id": "scene.tsx#component:HeldThree#store:0",
			"source_expression": "props.heldA"
		}, {
			"site_id": "scene.tsx#component:HeldThree#store:1",
			"source_expression": "props.resource"
		}],
		"closedStoreHostProgram": {
			"componentProgramId": "scene.tsx#component:HeldThree",
			"host": {
				"children": [{
					"host": {
						"children": [],
						"key": "held-mesh",
						"props": [["position", {
							"items": [
								{
									"index": 0,
									"kind": "input"
								},
								{
									"index": 2,
									"kind": "input"
								},
								{
									"kind": "binary",
									"left": {
										"index": 1,
										"kind": "input"
									},
									"operator": "+",
									"right": {
										"index": 3,
										"kind": "input"
									}
								}
							],
							"kind": "tuple"
						}]],
						"tag": "mesh"
					},
					"kind": "host"
				}],
				"key": "held-three",
				"props": [],
				"tag": "group"
			},
			"inputs": [{
				"paths": [["vector", "x"], ["vector", "y"]],
				"storeProp": "heldA",
				"storeUseSiteId": "scene.tsx#component:HeldThree#store:0"
			}, {
				"paths": [["sample", "x"], ["sample", "y"]],
				"storeProp": "resource",
				"storeUseSiteId": "scene.tsx#component:HeldThree#store:1"
			}],
			"moduleRevision": "native-v1-12f7d2b68e9bef12",
			"schemaVersion": 5
		},
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}, {
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
	}]
};
import * as __nativeJsx from "@r3act/core";
