import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "scene.tsx",
	"module_revision": "native-v1-719b64ff853528a5",
	"owners": [{
		"site_id": "scene.tsx#component:SceneApp",
		"repeated_scope": "runtime-keyed-owner"
	}, {
		"site_id": "scene.tsx#component:SceneResult",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": "scene.tsx#component:SceneResult#store:0",
		"owner_site_id": "scene.tsx#component:SceneResult",
		"kind": "use-input",
		"provenance": "opaque"
	}],
	"sinks": [],
	"operations": [{
		"site_id": "scene.tsx#component:SceneResult#store:0",
		"owner_site_id": "scene.tsx#component:SceneResult",
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
		if (event?.sourceFile === "scene.tsx" && event.previousRevision === "native-v1-719b64ff853528a5" && event.previousInstance === "native-v1-719b64ff853528a5") __invalidateNativeSemanticPlan("scene.tsx", "native-v1-719b64ff853528a5");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/host-three */
import { Suspense } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt } from "@r3act/core";
__nativeDefineComponent("scene.tsx#component:SceneApp", SceneApp, { propOnlySites: [] });
__nativeDefineComponent("scene.tsx#component:SceneResult", SceneResult, {
	propOnlySites: [],
	closedResourceHostProgram: {
		"componentProgramId": "scene.tsx#component:SceneResult",
		"host": {
			"children": [],
			"key": "scene-value",
			"props": [["name", {
				"index": 0,
				"kind": "input"
			}]],
			"tag": "group"
		},
		"moduleRevision": "native-v1-719b64ff853528a5",
		"resourceProp": "resource",
		"resourceUseSiteId": "scene.tsx#component:SceneResult#store:0",
		"schemaVersion": 2
	}
});
function SceneResult(props) {
	const value = __nativeUseAt("scene.tsx#component:SceneResult#store:0", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "scene-value",
		name: value
	});
}
export function SceneApp(props) {
	return /* @__PURE__ */ __nativeJsx.jsx("group", { key: "scene-root" }, props.resource ? /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("group", {
			key: "scene-value",
			name: "waiting"
		}),
		__nativeBoundarySite: "scene.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(SceneResult, {
		key: "scene-owner",
		resource: props.resource
	})) : /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "scene-value",
		name: "old"
	}));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-719b64ff853528a5",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "scene.tsx",
		"module_revision": "native-v1-719b64ff853528a5",
		"owners": [{
			"site_id": "scene.tsx#component:SceneApp",
			"repeated_scope": "runtime-keyed-owner"
		}, {
			"site_id": "scene.tsx#component:SceneResult",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": "scene.tsx#component:SceneResult#store:0",
			"owner_site_id": "scene.tsx#component:SceneResult",
			"kind": "use-input",
			"provenance": "opaque"
		}],
		"sinks": [],
		"operations": [{
			"site_id": "scene.tsx#component:SceneResult#store:0",
			"owner_site_id": "scene.tsx#component:SceneResult",
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
	"component_module": "/** @jsxImportSource @r3act/host-three */\n// @native-ui\nimport { Suspense, use } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"scene.tsx#component:SceneApp\", SceneApp, { propOnlySites: [] });\n__nativeDefineComponent(\"scene.tsx#component:SceneResult\", SceneResult, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\"scene.tsx#component:SceneResult\",\"host\":{\"children\":[],\"key\":\"scene-value\",\"props\":[[\"name\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"group\"},\"moduleRevision\":\"native-v1-719b64ff853528a5\",\"resourceProp\":\"resource\",\"resourceUseSiteId\":\"scene.tsx#component:SceneResult#store:0\",\"schemaVersion\":2} });\nimport type { AsyncResource } from \"@r3act/core\";\n\nfunction SceneResult(props: { resource: AsyncResource<string> }) {\n  const value = __nativeUseAt(\"scene.tsx#component:SceneResult#store:0\", props.resource);\n  return <group key=\"scene-value\" name={value} />;\n}\nexport function SceneApp(props: { resource?: AsyncResource<string>; label: string }) {\n  return <group key=\"scene-root\">\n    {props.resource\n      ? <Suspense fallback={<group key=\"scene-value\" name=\"waiting\" />} __nativeBoundarySite=\"scene.tsx#boundary:0\">\n          <SceneResult key=\"scene-owner\" resource={props.resource} />\n        </Suspense>\n      : <group key=\"scene-value\" name=\"old\" />}\n  </group>;\n}\n",
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
		"name": "SceneResult",
		"component_site_id": "scene.tsx#component:SceneResult",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [{
			"site_id": "scene.tsx#component:SceneResult#store:0",
			"source_expression": "props.resource"
		}],
		"closedResourceHostProgram": {
			"componentProgramId": "scene.tsx#component:SceneResult",
			"host": {
				"children": [],
				"key": "scene-value",
				"props": [["name", {
					"index": 0,
					"kind": "input"
				}]],
				"tag": "group"
			},
			"moduleRevision": "native-v1-719b64ff853528a5",
			"resourceProp": "resource",
			"resourceUseSiteId": "scene.tsx#component:SceneResult#store:0",
			"schemaVersion": 2
		},
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}]
};
import * as __nativeJsx from "@r3act/core";
