import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "native.tsx",
	"module_revision": "native-v1-b1054d5c746aca73",
	"owners": [{
		"site_id": "native.tsx#component:Dialog",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": "native.tsx#component:Dialog#store:0",
		"owner_site_id": "native.tsx#component:Dialog",
		"kind": "use-input",
		"provenance": "opaque"
	}],
	"sinks": [],
	"operations": [{
		"site_id": "native.tsx#component:Dialog#store:0",
		"owner_site_id": "native.tsx#component:Dialog",
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
		if (event?.sourceFile === "native.tsx") __invalidateNativeSemanticPlan("native.tsx", "native-v1-b1054d5c746aca73");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { createDOMRoot, createStore, storeRecord } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt } from "@r3act/core";
__nativeDefineComponent("native.tsx#component:Dialog", Dialog, { propOnlySites: [] });
import { RadixDialog } from "@r3act/react-bridge/radix-dialog";
const state = createStore(storeRecord({ open: false }));
function Dialog() {
	const value = __nativeUseAt("native.tsx#component:Dialog#store:0", state);
	return /* @__PURE__ */ __nativeJsx.jsx(RadixDialog, {
		open: value.open,
		onOpenChange: (open) => state.dispatch(storeRecord({ open })),
		title: "Settings",
		description: "Edit settings",
		triggerLabel: "Open settings",
		closeLabel: "Close settings"
	});
}
createDOMRoot(document.getElementById("app")).mount(/* @__PURE__ */ __nativeJsx.jsx(Dialog, null));
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-b1054d5c746aca73",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "native.tsx",
		"module_revision": "native-v1-b1054d5c746aca73",
		"owners": [{
			"site_id": "native.tsx#component:Dialog",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": "native.tsx#component:Dialog#store:0",
			"owner_site_id": "native.tsx#component:Dialog",
			"kind": "use-input",
			"provenance": "opaque"
		}],
		"sinks": [],
		"operations": [{
			"site_id": "native.tsx#component:Dialog#store:0",
			"owner_site_id": "native.tsx#component:Dialog",
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
	"source_file": "native.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { createDOMRoot, createStore, storeRecord, use } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"native.tsx#component:Dialog\", Dialog, { propOnlySites: [] });\nimport { RadixDialog } from \"@r3act/react-bridge/radix-dialog\";\n\nconst state = createStore(storeRecord({ open: false }));\nfunction Dialog() {\n  const value = __nativeUseAt(\"native.tsx#component:Dialog#store:0\", state);\n  return <RadixDialog open={value.open}\n    onOpenChange={(open) => state.dispatch(storeRecord({ open }))}\n    title=\"Settings\" description=\"Edit settings\" triggerLabel=\"Open settings\"\n    closeLabel=\"Close settings\" />;\n}\ncreateDOMRoot(document.getElementById(\"app\")!).mount(<Dialog />);\n",
	"components": [{
		"name": "Dialog",
		"component_site_id": "native.tsx#component:Dialog",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [{
			"site_id": "native.tsx#component:Dialog#store:0",
			"source_expression": "state"
		}],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}]
};
import * as __nativeJsx from "@r3act/core";
