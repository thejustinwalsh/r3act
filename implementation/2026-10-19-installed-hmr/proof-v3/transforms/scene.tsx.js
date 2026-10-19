import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "scene.tsx",
	"module_revision": "native-v1-126285328cc0927a",
	"owners": [
		{
			"site_id": "scene.tsx#component:ScenePosition",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "scene.tsx#component:SceneSignal",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "scene.tsx#component:ThreeApp",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [{
		"site_id": "scene.tsx#component:ScenePosition#store:0",
		"owner_site_id": "scene.tsx#component:ScenePosition",
		"kind": "use-input",
		"provenance": "opaque"
	}, {
		"site_id": "scene.tsx#component:SceneSignal#store:0",
		"owner_site_id": "scene.tsx#component:SceneSignal",
		"kind": "use-input",
		"provenance": "opaque"
	}],
	"sinks": [],
	"operations": [{
		"site_id": "scene.tsx#component:ScenePosition#store:0",
		"owner_site_id": "scene.tsx#component:ScenePosition",
		"kind": "use-store-or-resource",
		"provenance": "opaque",
		"source_sites": []
	}, {
		"site_id": "scene.tsx#component:SceneSignal#store:0",
		"owner_site_id": "scene.tsx#component:SceneSignal",
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
		if (event?.sourceFile === "scene.tsx" && event.previousRevision === "native-v1-126285328cc0927a" && event.previousInstance === "native-v1-126285328cc0927a") __invalidateNativeSemanticPlan("scene.tsx", "native-v1-126285328cc0927a");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/host-three */
import { Suspense } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt, stabilizeHostTuple as __nativeStabilizeHostTuple } from "@r3act/core";
__nativeDefineComponent("scene.tsx#component:ScenePosition", ScenePosition, {
	propOnlySites: [],
	closedResourceHostProgram: {
		"componentProgramId": "scene.tsx#component:ScenePosition",
		"host": {
			"children": [],
			"key": "cursor",
			"props": [["name", {
				"kind": "literal",
				"value": "cursor"
			}], ["position", {
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
		"moduleRevision": "native-v1-126285328cc0927a",
		"resourceProp": "point",
		"resourceUseSiteId": "scene.tsx#component:ScenePosition#store:0",
		"schemaVersion": 3
	},
	closedStoreHostProgram: {
		"componentProgramId": "scene.tsx#component:ScenePosition",
		"host": {
			"children": [],
			"key": "cursor",
			"props": [["name", {
				"kind": "literal",
				"value": "cursor"
			}], ["position", {
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
		"inputs": [{
			"storeProp": "point",
			"storeUseSiteId": "scene.tsx#component:ScenePosition#store:0"
		}],
		"moduleRevision": "native-v1-126285328cc0927a",
		"schemaVersion": 4
	}
});
__nativeDefineComponent("scene.tsx#component:SceneSignal", SceneSignal, {
	propOnlySites: [],
	closedResourceHostProgram: {
		"componentProgramId": "scene.tsx#component:SceneSignal",
		"host": {
			"children": [],
			"key": "signal",
			"props": [["name", {
				"kind": "literal",
				"value": "signal-ready"
			}], ["position", {
				"items": [
					{
						"index": 0,
						"kind": "input"
					},
					{
						"kind": "literal",
						"value": 1
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
		"moduleRevision": "native-v1-126285328cc0927a",
		"resourceProp": "resource",
		"resourceUseSiteId": "scene.tsx#component:SceneSignal#store:0",
		"schemaVersion": 3
	},
	closedStoreHostProgram: {
		"componentProgramId": "scene.tsx#component:SceneSignal",
		"host": {
			"children": [],
			"key": "signal",
			"props": [["name", {
				"kind": "literal",
				"value": "signal-ready"
			}], ["position", {
				"items": [
					{
						"index": 0,
						"kind": "input"
					},
					{
						"kind": "literal",
						"value": 1
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
		"inputs": [{
			"storeProp": "resource",
			"storeUseSiteId": "scene.tsx#component:SceneSignal#store:0"
		}],
		"moduleRevision": "native-v1-126285328cc0927a",
		"schemaVersion": 4
	}
});
__nativeDefineComponent("scene.tsx#component:ThreeApp", ThreeApp, { propOnlySites: [] });
export function ScenePosition(props) {
	const x = __nativeUseAt("scene.tsx#component:ScenePosition#store:0", props.point);
	return /* @__PURE__ */ __nativeJsx.jsx("mesh", {
		key: "cursor",
		name: "cursor",
		position: __nativeStabilizeHostTuple([
			x,
			0,
			0
		])
	});
}
export function SceneSignal(props) {
	const signal = __nativeUseAt("scene.tsx#component:SceneSignal#store:0", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("mesh", {
		key: "signal",
		name: "signal-ready",
		position: __nativeStabilizeHostTuple([
			signal,
			1,
			0
		])
	});
}
export function ThreeApp(props) {
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "scene",
		name: "installed-scene"
	}, /* @__PURE__ */ __nativeJsx.jsx(ScenePosition, { point: props.domain.point }), /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("mesh", {
			key: "signal",
			name: "signal-waiting"
		}),
		__nativeBoundarySite: "scene.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(SceneSignal, { resource: props.domain.signal })), /* @__PURE__ */ __nativeJsx.jsx("mesh", {
		key: "decoration",
		name: "decoration"
	}, /* @__PURE__ */ __nativeJsx.jsx("boxGeometry", null), /* @__PURE__ */ __nativeJsx.jsx("meshBasicMaterial", { color: "#497ec5" })), /* @__PURE__ */ __nativeJsx.jsx("mesh", {
		key: "borrowed",
		name: "borrowed",
		args: [props.geometry, props.material]
	}));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-126285328cc0927a",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "scene.tsx",
		"module_revision": "native-v1-126285328cc0927a",
		"owners": [
			{
				"site_id": "scene.tsx#component:ScenePosition",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "scene.tsx#component:SceneSignal",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "scene.tsx#component:ThreeApp",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [{
			"site_id": "scene.tsx#component:ScenePosition#store:0",
			"owner_site_id": "scene.tsx#component:ScenePosition",
			"kind": "use-input",
			"provenance": "opaque"
		}, {
			"site_id": "scene.tsx#component:SceneSignal#store:0",
			"owner_site_id": "scene.tsx#component:SceneSignal",
			"kind": "use-input",
			"provenance": "opaque"
		}],
		"sinks": [],
		"operations": [{
			"site_id": "scene.tsx#component:ScenePosition#store:0",
			"owner_site_id": "scene.tsx#component:ScenePosition",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		}, {
			"site_id": "scene.tsx#component:SceneSignal#store:0",
			"owner_site_id": "scene.tsx#component:SceneSignal",
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
	"component_module": "/** @jsxImportSource @r3act/host-three */\n// @native-ui\nimport { Suspense, use } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt, stabilizeHostTuple as __nativeStabilizeHostTuple } from \"@r3act/core\";\n__nativeDefineComponent(\"scene.tsx#component:ScenePosition\", ScenePosition, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\"scene.tsx#component:ScenePosition\",\"host\":{\"children\":[],\"key\":\"cursor\",\"props\":[[\"name\",{\"kind\":\"literal\",\"value\":\"cursor\"}],[\"position\",{\"items\":[{\"index\":0,\"kind\":\"input\"},{\"kind\":\"literal\",\"value\":0.0},{\"kind\":\"literal\",\"value\":0.0}],\"kind\":\"tuple\"}]],\"tag\":\"mesh\"},\"moduleRevision\":\"native-v1-126285328cc0927a\",\"resourceProp\":\"point\",\"resourceUseSiteId\":\"scene.tsx#component:ScenePosition#store:0\",\"schemaVersion\":3}, closedStoreHostProgram: {\"componentProgramId\":\"scene.tsx#component:ScenePosition\",\"host\":{\"children\":[],\"key\":\"cursor\",\"props\":[[\"name\",{\"kind\":\"literal\",\"value\":\"cursor\"}],[\"position\",{\"items\":[{\"index\":0,\"kind\":\"input\"},{\"kind\":\"literal\",\"value\":0.0},{\"kind\":\"literal\",\"value\":0.0}],\"kind\":\"tuple\"}]],\"tag\":\"mesh\"},\"inputs\":[{\"storeProp\":\"point\",\"storeUseSiteId\":\"scene.tsx#component:ScenePosition#store:0\"}],\"moduleRevision\":\"native-v1-126285328cc0927a\",\"schemaVersion\":4} });\n__nativeDefineComponent(\"scene.tsx#component:SceneSignal\", SceneSignal, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\"scene.tsx#component:SceneSignal\",\"host\":{\"children\":[],\"key\":\"signal\",\"props\":[[\"name\",{\"kind\":\"literal\",\"value\":\"signal-ready\"}],[\"position\",{\"items\":[{\"index\":0,\"kind\":\"input\"},{\"kind\":\"literal\",\"value\":1.0},{\"kind\":\"literal\",\"value\":0.0}],\"kind\":\"tuple\"}]],\"tag\":\"mesh\"},\"moduleRevision\":\"native-v1-126285328cc0927a\",\"resourceProp\":\"resource\",\"resourceUseSiteId\":\"scene.tsx#component:SceneSignal#store:0\",\"schemaVersion\":3}, closedStoreHostProgram: {\"componentProgramId\":\"scene.tsx#component:SceneSignal\",\"host\":{\"children\":[],\"key\":\"signal\",\"props\":[[\"name\",{\"kind\":\"literal\",\"value\":\"signal-ready\"}],[\"position\",{\"items\":[{\"index\":0,\"kind\":\"input\"},{\"kind\":\"literal\",\"value\":1.0},{\"kind\":\"literal\",\"value\":0.0}],\"kind\":\"tuple\"}]],\"tag\":\"mesh\"},\"inputs\":[{\"storeProp\":\"resource\",\"storeUseSiteId\":\"scene.tsx#component:SceneSignal#store:0\"}],\"moduleRevision\":\"native-v1-126285328cc0927a\",\"schemaVersion\":4} });\n__nativeDefineComponent(\"scene.tsx#component:ThreeApp\", ThreeApp, { propOnlySites: [] });\nimport type { BufferGeometry, Material } from \"three\";\nimport type { SceneDomain } from \"./state\";\n\nexport function ScenePosition(props: { point: SceneDomain[\"point\"] }) {\n  const x = __nativeUseAt(\"scene.tsx#component:ScenePosition#store:0\", props.point);\n  return <mesh key=\"cursor\" name=\"cursor\" position={__nativeStabilizeHostTuple([x, 0, 0])} />;\n}\n\nexport function SceneSignal(props: { resource: SceneDomain[\"signal\"] }) {\n  const signal = __nativeUseAt(\"scene.tsx#component:SceneSignal#store:0\", props.resource);\n  return <mesh key=\"signal\" name=\"signal-ready\" position={__nativeStabilizeHostTuple([signal, 1, 0])} />;\n}\n\nexport function ThreeApp(props: { domain: SceneDomain; geometry: BufferGeometry; material: Material }) {\n  return <group key=\"scene\" name=\"installed-scene\">\n    <ScenePosition point={props.domain.point} />\n    <Suspense fallback={<mesh key=\"signal\" name=\"signal-waiting\" />} __nativeBoundarySite=\"scene.tsx#boundary:0\">\n      <SceneSignal resource={props.domain.signal} />\n    </Suspense>\n    <mesh key=\"decoration\" name=\"decoration\">\n      <boxGeometry />\n      <meshBasicMaterial color=\"#497ec5\" />\n    </mesh>\n    <mesh key=\"borrowed\" name=\"borrowed\" args={[props.geometry, props.material]} />\n  </group>;\n}\n",
	"components": [
		{
			"name": "ScenePosition",
			"component_site_id": "scene.tsx#component:ScenePosition",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "scene.tsx#component:ScenePosition#store:0",
				"source_expression": "props.point"
			}],
			"closedResourceHostProgram": {
				"componentProgramId": "scene.tsx#component:ScenePosition",
				"host": {
					"children": [],
					"key": "cursor",
					"props": [["name", {
						"kind": "literal",
						"value": "cursor"
					}], ["position", {
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
				"moduleRevision": "native-v1-126285328cc0927a",
				"resourceProp": "point",
				"resourceUseSiteId": "scene.tsx#component:ScenePosition#store:0",
				"schemaVersion": 3
			},
			"closedStoreHostProgram": {
				"componentProgramId": "scene.tsx#component:ScenePosition",
				"host": {
					"children": [],
					"key": "cursor",
					"props": [["name", {
						"kind": "literal",
						"value": "cursor"
					}], ["position", {
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
				"inputs": [{
					"storeProp": "point",
					"storeUseSiteId": "scene.tsx#component:ScenePosition#store:0"
				}],
				"moduleRevision": "native-v1-126285328cc0927a",
				"schemaVersion": 4
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "SceneSignal",
			"component_site_id": "scene.tsx#component:SceneSignal",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "scene.tsx#component:SceneSignal#store:0",
				"source_expression": "props.resource"
			}],
			"closedResourceHostProgram": {
				"componentProgramId": "scene.tsx#component:SceneSignal",
				"host": {
					"children": [],
					"key": "signal",
					"props": [["name", {
						"kind": "literal",
						"value": "signal-ready"
					}], ["position", {
						"items": [
							{
								"index": 0,
								"kind": "input"
							},
							{
								"kind": "literal",
								"value": 1
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
				"moduleRevision": "native-v1-126285328cc0927a",
				"resourceProp": "resource",
				"resourceUseSiteId": "scene.tsx#component:SceneSignal#store:0",
				"schemaVersion": 3
			},
			"closedStoreHostProgram": {
				"componentProgramId": "scene.tsx#component:SceneSignal",
				"host": {
					"children": [],
					"key": "signal",
					"props": [["name", {
						"kind": "literal",
						"value": "signal-ready"
					}], ["position", {
						"items": [
							{
								"index": 0,
								"kind": "input"
							},
							{
								"kind": "literal",
								"value": 1
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
				"inputs": [{
					"storeProp": "resource",
					"storeUseSiteId": "scene.tsx#component:SceneSignal#store:0"
				}],
				"moduleRevision": "native-v1-126285328cc0927a",
				"schemaVersion": 4
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "ThreeApp",
			"component_site_id": "scene.tsx#component:ThreeApp",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "@r3act/core";
