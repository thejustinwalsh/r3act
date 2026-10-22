import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-group-admission-b1deeb92-7b95-4e12-bc43-3e288c8b59c5/group.tsx",
	"module_revision": "native-v1-808cfc4f10ab2ed3",
	"owners": [{
		"site_id": ".cache/compiled-group-admission-b1deeb92-7b95-4e12-bc43-3e288c8b59c5/group.tsx#component:Dom",
		"repeated_scope": "runtime-keyed-owner"
	}, {
		"site_id": ".cache/compiled-group-admission-b1deeb92-7b95-4e12-bc43-3e288c8b59c5/group.tsx#component:Scene",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [],
	"sinks": [],
	"operations": [],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {},
		"execution_order": []
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === ".cache/compiled-group-admission-b1deeb92-7b95-4e12-bc43-3e288c8b59c5/group.tsx" && event.previousRevision === "native-v1-808cfc4f10ab2ed3" && event.previousInstance === "native-v1-808cfc4f10ab2ed3") __invalidateNativeSemanticPlan(".cache/compiled-group-admission-b1deeb92-7b95-4e12-bc43-3e288c8b59c5/group.tsx", "native-v1-808cfc4f10ab2ed3");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { defineComponent as __nativeDefineComponent } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/compiled-group-admission-b1deeb92-7b95-4e12-bc43-3e288c8b59c5/group.tsx#component:Dom", Dom, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-group-admission-b1deeb92-7b95-4e12-bc43-3e288c8b59c5/group.tsx#component:Scene", Scene, {
	propOnlySites: [],
	hostLeafOutput: true
});
export function Scene(props) {
	return /* @__PURE__ */ __nativeJsx.jsx("group", { key: "scene" }, /* @__PURE__ */ __nativeJsx.jsx("mesh", {
		key: "mesh",
		"position-x": props.step
	}));
}
export function Dom(props) {
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "status",
		"data-step": props.step
	}, "step:", props.step);
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-808cfc4f10ab2ed3",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-group-admission-b1deeb92-7b95-4e12-bc43-3e288c8b59c5/group.tsx",
		"module_revision": "native-v1-808cfc4f10ab2ed3",
		"owners": [{
			"site_id": ".cache/compiled-group-admission-b1deeb92-7b95-4e12-bc43-3e288c8b59c5/group.tsx#component:Dom",
			"repeated_scope": "runtime-keyed-owner"
		}, {
			"site_id": ".cache/compiled-group-admission-b1deeb92-7b95-4e12-bc43-3e288c8b59c5/group.tsx#component:Scene",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [],
		"sinks": [],
		"operations": [],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {},
			"execution_order": []
		}
	},
	"source_file": ".cache/compiled-group-admission-b1deeb92-7b95-4e12-bc43-3e288c8b59c5/group.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { jsx } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/compiled-group-admission-b1deeb92-7b95-4e12-bc43-3e288c8b59c5/group.tsx#component:Dom\", Dom, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-group-admission-b1deeb92-7b95-4e12-bc43-3e288c8b59c5/group.tsx#component:Scene\", Scene, { propOnlySites: [], hostLeafOutput: true });\nexport function Scene(props) {\n  return <group key=\"scene\"><mesh key=\"mesh\" position-x={props.step} /></group>;\n}\nexport function Dom(props) {\n  return <output key=\"status\" data-step={props.step}>step:{props.step}</output>;\n}",
	"components": [{
		"name": "Dom",
		"component_site_id": ".cache/compiled-group-admission-b1deeb92-7b95-4e12-bc43-3e288c8b59c5/group.tsx#component:Dom",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}, {
		"name": "Scene",
		"component_site_id": ".cache/compiled-group-admission-b1deeb92-7b95-4e12-bc43-3e288c8b59c5/group.tsx#component:Scene",
		"prop_only_sites": [],
		"host_leaf_output": true,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}]
};
import * as __nativeJsx from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
