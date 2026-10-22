import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-host-domain-9d5960a9-5678-4874-bc3a-cf109098d738/domain.tsx",
	"module_revision": "native-v1-5fc22f685a4e826d",
	"owners": [{
		"site_id": ".cache/compiled-host-domain-9d5960a9-5678-4874-bc3a-cf109098d738/domain.tsx#component:Dom",
		"repeated_scope": "runtime-keyed-owner"
	}, {
		"site_id": ".cache/compiled-host-domain-9d5960a9-5678-4874-bc3a-cf109098d738/domain.tsx#component:Scene",
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
		if (event?.sourceFile === ".cache/compiled-host-domain-9d5960a9-5678-4874-bc3a-cf109098d738/domain.tsx" && event.previousRevision === "native-v1-5fc22f685a4e826d" && event.previousInstance === "native-v1-5fc22f685a4e826d") __invalidateNativeSemanticPlan(".cache/compiled-host-domain-9d5960a9-5678-4874-bc3a-cf109098d738/domain.tsx", "native-v1-5fc22f685a4e826d");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { defineComponent as __nativeDefineComponent } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/compiled-host-domain-9d5960a9-5678-4874-bc3a-cf109098d738/domain.tsx#component:Dom", Dom, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-host-domain-9d5960a9-5678-4874-bc3a-cf109098d738/domain.tsx#component:Scene", Scene, {
	propOnlySites: [],
	hostLeafOutput: true
});
export const trace = {
	sceneBodies: [],
	domBodies: []
};
export function Scene(props) {
	trace.sceneBodies.push(props.label + ":" + props.step);
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "root",
		name: props.label
	}, /* @__PURE__ */ __nativeJsx.jsx("mesh", {
		key: "mesh",
		"position-x": props.step,
		domainProbe: props.step
	}));
}
export function Dom(props) {
	trace.domBodies.push(props.step);
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "status",
		"data-step": props.step
	}, "step:", props.step);
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-5fc22f685a4e826d",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-host-domain-9d5960a9-5678-4874-bc3a-cf109098d738/domain.tsx",
		"module_revision": "native-v1-5fc22f685a4e826d",
		"owners": [{
			"site_id": ".cache/compiled-host-domain-9d5960a9-5678-4874-bc3a-cf109098d738/domain.tsx#component:Dom",
			"repeated_scope": "runtime-keyed-owner"
		}, {
			"site_id": ".cache/compiled-host-domain-9d5960a9-5678-4874-bc3a-cf109098d738/domain.tsx#component:Scene",
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
	"source_file": ".cache/compiled-host-domain-9d5960a9-5678-4874-bc3a-cf109098d738/domain.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { jsx } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/compiled-host-domain-9d5960a9-5678-4874-bc3a-cf109098d738/domain.tsx#component:Dom\", Dom, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-host-domain-9d5960a9-5678-4874-bc3a-cf109098d738/domain.tsx#component:Scene\", Scene, { propOnlySites: [], hostLeafOutput: true });\nexport const trace = { sceneBodies: [], domBodies: [] };\nexport function Scene(props) {\n  trace.sceneBodies.push(props.label + \":\" + props.step);\n  return <group key=\"root\" name={props.label}>\n    <mesh key=\"mesh\" position-x={props.step} domainProbe={props.step} />\n  </group>;\n}\nexport function Dom(props) {\n  trace.domBodies.push(props.step);\n  return <output key=\"status\" data-step={props.step}>step:{props.step}</output>;\n}",
	"components": [{
		"name": "Dom",
		"component_site_id": ".cache/compiled-host-domain-9d5960a9-5678-4874-bc3a-cf109098d738/domain.tsx#component:Dom",
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
		"component_site_id": ".cache/compiled-host-domain-9d5960a9-5678-4874-bc3a-cf109098d738/domain.tsx#component:Scene",
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
