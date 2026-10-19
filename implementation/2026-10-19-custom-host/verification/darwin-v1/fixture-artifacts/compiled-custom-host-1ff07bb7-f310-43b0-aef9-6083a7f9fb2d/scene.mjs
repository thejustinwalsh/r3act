import { jsx, Fragment } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx",
	"module_revision": "native-v1-69dcf4863040913c",
	"owners": [{
		"site_id": ".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx#component:ThreeApp",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": ".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx#component:ThreeApp#store:0",
		"owner_site_id": ".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx#component:ThreeApp",
		"kind": "use-input",
		"provenance": "opaque"
	}],
	"sinks": [],
	"operations": [{
		"site_id": ".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx#component:ThreeApp#store:0",
		"owner_site_id": ".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx#component:ThreeApp",
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
		if (event?.sourceFile === ".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx" && event.previousRevision === "native-v1-69dcf4863040913c" && event.previousInstance === "native-v1-69dcf4863040913c") __invalidateNativeSemanticPlan(".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx", "native-v1-69dcf4863040913c");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx#component:ThreeApp", ThreeApp, { propOnlySites: [] });
export function ThreeApp(props) {
	const stage = __nativeUseAt(".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx#component:ThreeApp#store:0", props.stage);
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
	"module_revision": "native-v1-69dcf4863040913c",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx",
		"module_revision": "native-v1-69dcf4863040913c",
		"owners": [{
			"site_id": ".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx#component:ThreeApp",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": ".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx#component:ThreeApp#store:0",
			"owner_site_id": ".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx#component:ThreeApp",
			"kind": "use-input",
			"provenance": "opaque"
		}],
		"sinks": [],
		"operations": [{
			"site_id": ".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx#component:ThreeApp#store:0",
			"owner_site_id": ".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx#component:ThreeApp",
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
	"source_file": ".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/host-three */\n// @native-ui\nimport { use } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx#component:ThreeApp\", ThreeApp, { propOnlySites: [] });\nimport type { StoreSource } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n\nexport function ThreeApp(props: { stage: StoreSource<string> }) {\n  const stage = __nativeUseAt(\".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx#component:ThreeApp#store:0\", props.stage);\n  return <group key=\"scene\" name=\"custom-host-scene\">\n    <group key=\"stage\" name={`stage-${stage}`} />\n  </group>;\n}\n",
	"components": [{
		"name": "ThreeApp",
		"component_site_id": ".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx#component:ThreeApp",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [{
			"site_id": ".cache/compiled-custom-host-1ff07bb7-f310-43b0-aef9-6083a7f9fb2d/scene.tsx#component:ThreeApp#store:0",
			"source_expression": "props.stage"
		}],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}]
};
