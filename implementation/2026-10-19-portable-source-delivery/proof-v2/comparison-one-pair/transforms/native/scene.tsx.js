import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "scene.tsx",
	"module_revision": "native-v1-8212b86c3fe06222",
	"owners": [
		{
			"site_id": "scene.tsx#component:ActiveMesh",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "scene.tsx#component:PendingMesh",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "scene.tsx#component:SceneApp",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [{
		"site_id": "scene.tsx#component:PendingMesh#store:0",
		"owner_site_id": "scene.tsx#component:PendingMesh",
		"kind": "use-input",
		"provenance": "opaque"
	}],
	"sinks": [],
	"operations": [{
		"site_id": "scene.tsx#component:PendingMesh#store:0",
		"owner_site_id": "scene.tsx#component:PendingMesh",
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
		if (event?.sourceFile === "scene.tsx" && event.previousRevision === "native-v1-8212b86c3fe06222" && event.previousInstance === "native-v1-8212b86c3fe06222") __invalidateNativeSemanticPlan("scene.tsx", "native-v1-8212b86c3fe06222");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/host-three */
import { Suspense } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt } from "@r3act/core";
__nativeDefineComponent("scene.tsx#component:ActiveMesh", ActiveMesh, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent("scene.tsx#component:PendingMesh", PendingMesh, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "scene.tsx#component:PendingMesh",
		"host": {
			"children": [],
			"key": "pending-mesh",
			"props": [["name", {
				"expressions": [{
					"index": 0,
					"kind": "input"
				}],
				"kind": "template",
				"parts": ["ready-", ""]
			}]],
			"tag": "group"
		},
		"inputs": [{
			"paths": [["x"]],
			"storeProp": "resource",
			"storeUseSiteId": "scene.tsx#component:PendingMesh#store:0"
		}],
		"moduleRevision": "native-v1-8212b86c3fe06222",
		"schemaVersion": 5
	}
});
__nativeDefineComponent("scene.tsx#component:SceneApp", SceneApp, { propOnlySites: [] });
import { values } from "./state";
export function ActiveMesh(props) {
	return /* @__PURE__ */ __nativeJsx.jsx("mesh", {
		key: "active-mesh",
		name: `step-${props.step}`,
		position: values.position,
		rotation: values.rotation
	}, /* @__PURE__ */ __nativeJsx.jsx("boxGeometry", { key: "active-geometry" }), /* @__PURE__ */ __nativeJsx.jsx("meshStandardMaterial", { key: "active-material" }));
}
export function PendingMesh(props) {
	const value = __nativeUseAt("scene.tsx#component:PendingMesh#store:0", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "pending-mesh",
		name: `ready-${value.x}`
	});
}
export function SceneApp(props) {
	return /* @__PURE__ */ __nativeJsx.jsx("group", { key: "scene-root" }, /* @__PURE__ */ __nativeJsx.jsx(ActiveMesh, {
		key: "active-owner",
		step: props.step
	}), /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("group", {
			key: "pending-mesh",
			name: "waiting"
		}),
		__nativeBoundarySite: "scene.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(PendingMesh, {
		key: "pending-owner",
		resource: props.resource
	})));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-8212b86c3fe06222",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "scene.tsx",
		"module_revision": "native-v1-8212b86c3fe06222",
		"owners": [
			{
				"site_id": "scene.tsx#component:ActiveMesh",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "scene.tsx#component:PendingMesh",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "scene.tsx#component:SceneApp",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [{
			"site_id": "scene.tsx#component:PendingMesh#store:0",
			"owner_site_id": "scene.tsx#component:PendingMesh",
			"kind": "use-input",
			"provenance": "opaque"
		}],
		"sinks": [],
		"operations": [{
			"site_id": "scene.tsx#component:PendingMesh#store:0",
			"owner_site_id": "scene.tsx#component:PendingMesh",
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
	"component_module": "/** @jsxImportSource @r3act/host-three */\n// @native-ui\nimport { Suspense, use } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"scene.tsx#component:ActiveMesh\", ActiveMesh, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\"scene.tsx#component:PendingMesh\", PendingMesh, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"scene.tsx#component:PendingMesh\",\"host\":{\"children\":[],\"key\":\"pending-mesh\",\"props\":[[\"name\",{\"expressions\":[{\"index\":0,\"kind\":\"input\"}],\"kind\":\"template\",\"parts\":[\"ready-\",\"\"]}]],\"tag\":\"group\"},\"inputs\":[{\"paths\":[[\"x\"]],\"storeProp\":\"resource\",\"storeUseSiteId\":\"scene.tsx#component:PendingMesh#store:0\"}],\"moduleRevision\":\"native-v1-8212b86c3fe06222\",\"schemaVersion\":5} });\n__nativeDefineComponent(\"scene.tsx#component:SceneApp\", SceneApp, { propOnlySites: [] });\nimport type { AsyncResource } from \"@r3act/core\";\nimport { values } from \"./state\";\n\nexport function ActiveMesh(props: { step: number }) {\n  return <mesh key=\"active-mesh\" name={`step-${props.step}`}\n    position={values.position} rotation={values.rotation}>\n    <boxGeometry key=\"active-geometry\" />\n    <meshStandardMaterial key=\"active-material\" />\n  </mesh>;\n}\nexport function PendingMesh(props: { resource: AsyncResource<{ x: number }> }) {\n  const value = __nativeUseAt(\"scene.tsx#component:PendingMesh#store:0\", props.resource);\n  return <group key=\"pending-mesh\" name={`ready-${value.x}`} />;\n}\nexport function SceneApp(props: { step: number; resource: AsyncResource<{ x: number }> }) {\n  return <group key=\"scene-root\">\n    <ActiveMesh key=\"active-owner\" step={props.step} />\n    <Suspense fallback={<group key=\"pending-mesh\" name=\"waiting\" />} __nativeBoundarySite=\"scene.tsx#boundary:0\">\n      <PendingMesh key=\"pending-owner\" resource={props.resource} />\n    </Suspense>\n  </group>;\n}\n",
	"components": [
		{
			"name": "ActiveMesh",
			"component_site_id": "scene.tsx#component:ActiveMesh",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "PendingMesh",
			"component_site_id": "scene.tsx#component:PendingMesh",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "scene.tsx#component:PendingMesh#store:0",
				"source_expression": "props.resource"
			}],
			"closedStoreHostProgram": {
				"componentProgramId": "scene.tsx#component:PendingMesh",
				"host": {
					"children": [],
					"key": "pending-mesh",
					"props": [["name", {
						"expressions": [{
							"index": 0,
							"kind": "input"
						}],
						"kind": "template",
						"parts": ["ready-", ""]
					}]],
					"tag": "group"
				},
				"inputs": [{
					"paths": [["x"]],
					"storeProp": "resource",
					"storeUseSiteId": "scene.tsx#component:PendingMesh#store:0"
				}],
				"moduleRevision": "native-v1-8212b86c3fe06222",
				"schemaVersion": 5
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
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
		}
	]
};
import * as __nativeJsx from "@r3act/core";
