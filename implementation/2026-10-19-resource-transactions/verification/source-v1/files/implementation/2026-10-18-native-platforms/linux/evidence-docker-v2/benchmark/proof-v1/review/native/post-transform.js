import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "native_arm.tsx",
	"module_revision": "native-v1-2509d0d75a6b029e",
	"owners": [{
		"site_id": "native_arm.tsx#component:Counter",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": "native_arm.tsx#component:Counter#state:0",
		"owner_site_id": "native_arm.tsx#component:Counter",
		"kind": "state",
		"provenance": "tracked"
	}],
	"sinks": [{
		"site_id": "native_arm.tsx#opaque-sink:191",
		"owner_site_id": "native_arm.tsx#component:Counter",
		"source_sites": [],
		"provenance": "opaque",
		"equality": "adapter-declared",
		"host_value": "adapter-declared",
		"retention": "adapter-declared",
		"execution": "generic"
	}],
	"operations": [],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {},
		"execution_order": []
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "native_arm.tsx") __invalidateNativeSemanticPlan("native_arm.tsx", "native-v1-2509d0d75a6b029e");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt } from "@r3act/core";
__nativeDefineComponent("native_arm.tsx#component:Counter", Counter, { propOnlySites: [] });
export function Counter(props) {
	const [level, setLevel] = __nativeUseStateAt("native_arm.tsx#component:Counter#state:0", props.initial);
	return /* @__PURE__ */ __nativeJsx.jsx("button", {
		key: "counter",
		"data-level": level,
		onClick: () => setLevel((previous) => previous + 1)
	}, "level ", level);
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-2509d0d75a6b029e",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "native_arm.tsx",
		"module_revision": "native-v1-2509d0d75a6b029e",
		"owners": [{
			"site_id": "native_arm.tsx#component:Counter",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": "native_arm.tsx#component:Counter#state:0",
			"owner_site_id": "native_arm.tsx#component:Counter",
			"kind": "state",
			"provenance": "tracked"
		}],
		"sinks": [{
			"site_id": "native_arm.tsx#opaque-sink:191",
			"owner_site_id": "native_arm.tsx#component:Counter",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}],
		"operations": [],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {},
			"execution_order": []
		}
	},
	"source_file": "native_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { useState } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"native_arm.tsx#component:Counter\", Counter, { propOnlySites: [] });\n\nexport function Counter(props: { initial: number }) {\n  const [level, setLevel] = __nativeUseStateAt(\"native_arm.tsx#component:Counter#state:0\", props.initial);\n  return <button key=\"counter\" data-level={level}\n    onClick={() => setLevel((previous) => previous + 1)}>level {level}</button>;\n}\n",
	"components": [{
		"name": "Counter",
		"component_site_id": "native_arm.tsx#component:Counter",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [{
			"site_id": "native_arm.tsx#component:Counter#state:0",
			"initial_value": "props.initial"
		}],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": ["native_arm.tsx#opaque-sink:191"]
	}]
};
import * as __nativeJsx from "@r3act/core";
