import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-three-lifetime-575477bf-5891-49a9-b5bc-e67494bbc56e/scene.tsx",
	"module_revision": "native-v1-cc111740fb79d94e",
	"owners": [{
		"site_id": ".cache/compiled-three-lifetime-575477bf-5891-49a9-b5bc-e67494bbc56e/scene.tsx#component:Dom",
		"repeated_scope": "runtime-keyed-owner"
	}, {
		"site_id": ".cache/compiled-three-lifetime-575477bf-5891-49a9-b5bc-e67494bbc56e/scene.tsx#component:Scene",
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
		if (event?.sourceFile === ".cache/compiled-three-lifetime-575477bf-5891-49a9-b5bc-e67494bbc56e/scene.tsx" && event.previousRevision === "native-v1-cc111740fb79d94e" && event.previousInstance === "native-v1-cc111740fb79d94e") __invalidateNativeSemanticPlan(".cache/compiled-three-lifetime-575477bf-5891-49a9-b5bc-e67494bbc56e/scene.tsx", "native-v1-cc111740fb79d94e");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { defineComponent as __nativeDefineComponent } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/compiled-three-lifetime-575477bf-5891-49a9-b5bc-e67494bbc56e/scene.tsx#component:Dom", Dom, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-three-lifetime-575477bf-5891-49a9-b5bc-e67494bbc56e/scene.tsx#component:Scene", Scene, {
	propOnlySites: [],
	hostLeafOutput: true
});
export function Scene(props) {
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "group",
		name: props.label
	}, /* @__PURE__ */ __nativeJsx.jsx("mesh", {
		key: "main",
		"position-x": props.phase,
		failPhase: props.phase
	}, props.show ? /* @__PURE__ */ __nativeJsx.jsx("sharedGeometry", { key: "geometry" }) : null, props.show ? /* @__PURE__ */ __nativeJsx.jsx("sharedMaterial", { key: "material" }) : null), /* @__PURE__ */ __nativeJsx.jsx("mesh", { key: "borrowed" }, /* @__PURE__ */ __nativeJsx.jsx("primitive", {
		key: "borrowed-geometry",
		object: props.borrowed,
		attach: "geometry"
	})));
}
export function Dom(props) {
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "status",
		"data-phase": props.phase
	}, "phase:", props.phase);
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-cc111740fb79d94e",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-three-lifetime-575477bf-5891-49a9-b5bc-e67494bbc56e/scene.tsx",
		"module_revision": "native-v1-cc111740fb79d94e",
		"owners": [{
			"site_id": ".cache/compiled-three-lifetime-575477bf-5891-49a9-b5bc-e67494bbc56e/scene.tsx#component:Dom",
			"repeated_scope": "runtime-keyed-owner"
		}, {
			"site_id": ".cache/compiled-three-lifetime-575477bf-5891-49a9-b5bc-e67494bbc56e/scene.tsx#component:Scene",
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
	"source_file": ".cache/compiled-three-lifetime-575477bf-5891-49a9-b5bc-e67494bbc56e/scene.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport { jsx } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/compiled-three-lifetime-575477bf-5891-49a9-b5bc-e67494bbc56e/scene.tsx#component:Dom\", Dom, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-three-lifetime-575477bf-5891-49a9-b5bc-e67494bbc56e/scene.tsx#component:Scene\", Scene, { propOnlySites: [], hostLeafOutput: true });\nexport function Scene(props) {\n  return <group key=\"group\" name={props.label}>\n    <mesh key=\"main\" position-x={props.phase} failPhase={props.phase}>\n      {props.show ? <sharedGeometry key=\"geometry\" /> : null}\n      {props.show ? <sharedMaterial key=\"material\" /> : null}\n    </mesh>\n    <mesh key=\"borrowed\"><primitive key=\"borrowed-geometry\" object={props.borrowed} attach=\"geometry\" /></mesh>\n  </group>;\n}\nexport function Dom(props) { return <output key=\"status\" data-phase={props.phase}>phase:{props.phase}</output>; }\n",
	"components": [{
		"name": "Dom",
		"component_site_id": ".cache/compiled-three-lifetime-575477bf-5891-49a9-b5bc-e67494bbc56e/scene.tsx#component:Dom",
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
		"component_site_id": ".cache/compiled-three-lifetime-575477bf-5891-49a9-b5bc-e67494bbc56e/scene.tsx#component:Scene",
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
