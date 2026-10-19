import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "scene.tsx",
	"module_revision": "native-v1-d8111a71ae7361cc",
	"owners": [{
		"site_id": "scene.tsx#component:ThreeApp",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": "scene.tsx#component:ThreeApp#store:0",
		"owner_site_id": "scene.tsx#component:ThreeApp",
		"kind": "use-input",
		"provenance": "opaque"
	}],
	"sinks": [],
	"operations": [{
		"site_id": "scene.tsx#component:ThreeApp#store:0",
		"owner_site_id": "scene.tsx#component:ThreeApp",
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
		if (event?.sourceFile === "scene.tsx" && event.previousRevision === "native-v1-d8111a71ae7361cc" && event.previousInstance === "native-v1-d8111a71ae7361cc") __invalidateNativeSemanticPlan("scene.tsx", "native-v1-d8111a71ae7361cc");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt } from "@r3act/core";
__nativeDefineComponent("scene.tsx#component:ThreeApp", ThreeApp, { propOnlySites: [] });
export function ThreeApp(props) {
	const stage = __nativeUseAt("scene.tsx#component:ThreeApp#store:0", props.stage);
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "scene",
		name: "custom-host-scene"
	}, /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "stage",
		name: `stage-${stage}`
	}));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-d8111a71ae7361cc",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "scene.tsx",
		"module_revision": "native-v1-d8111a71ae7361cc",
		"owners": [{
			"site_id": "scene.tsx#component:ThreeApp",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": "scene.tsx#component:ThreeApp#store:0",
			"owner_site_id": "scene.tsx#component:ThreeApp",
			"kind": "use-input",
			"provenance": "opaque"
		}],
		"sinks": [],
		"operations": [{
			"site_id": "scene.tsx#component:ThreeApp#store:0",
			"owner_site_id": "scene.tsx#component:ThreeApp",
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
	"component_module": "/** @jsxImportSource @r3act/host-three */\n// @native-ui\nimport { use } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"scene.tsx#component:ThreeApp\", ThreeApp, { propOnlySites: [] });\nimport type { StoreSource } from \"@r3act/core\";\n\nexport function ThreeApp(props: { stage: StoreSource<string> }) {\n  const stage = __nativeUseAt(\"scene.tsx#component:ThreeApp#store:0\", props.stage);\n  return <group key=\"scene\" name=\"custom-host-scene\">\n    <group key=\"stage\" name={`stage-${stage}`} />\n  </group>;\n}\n",
	"components": [{
		"name": "ThreeApp",
		"component_site_id": "scene.tsx#component:ThreeApp",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [{
			"site_id": "scene.tsx#component:ThreeApp#store:0",
			"source_expression": "props.stage"
		}],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}]
};
import * as __nativeJsx from "@r3act/core";
