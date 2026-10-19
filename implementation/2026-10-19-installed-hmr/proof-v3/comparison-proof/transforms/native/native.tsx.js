import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "native.tsx",
	"module_revision": "native-v1-014f8aad83a62cf1",
	"owners": [{
		"site_id": "native.tsx#component:Counter",
		"repeated_scope": "runtime-keyed-owner"
	}, {
		"site_id": "native.tsx#component:Readout",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": "native.tsx#component:Counter#state:0",
		"owner_site_id": "native.tsx#component:Counter",
		"kind": "state",
		"provenance": "tracked"
	}],
	"sinks": [{
		"site_id": "native.tsx#opaque-sink:343",
		"owner_site_id": "native.tsx#component:Counter",
		"source_sites": [],
		"provenance": "opaque",
		"equality": "adapter-declared",
		"host_value": "adapter-declared",
		"retention": "adapter-declared",
		"execution": "generic"
	}, {
		"site_id": "native.tsx#opaque-sink:417",
		"owner_site_id": "native.tsx#component:Counter",
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
		if (event?.sourceFile === "native.tsx" && event.previousRevision === "native-v1-014f8aad83a62cf1" && event.previousInstance === "native-v1-014f8aad83a62cf1") __invalidateNativeSemanticPlan("native.tsx", "native-v1-014f8aad83a62cf1");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt } from "@r3act/core";
__nativeDefineComponent("native.tsx#component:Counter", Counter, { propOnlySites: [] });
__nativeDefineComponent("native.tsx#component:Readout", Readout, { propOnlySites: [] });
import { createDOMRoot } from "@r3act/host-dom";
function Readout(props) {
	return /* @__PURE__ */ __nativeJsx.jsx("output", { "data-count": props.count }, props.count);
}
function Counter() {
	const [count, setCount] = __nativeUseStateAt("native.tsx#component:Counter#state:0", 0);
	return /* @__PURE__ */ __nativeJsx.jsx("main", { "data-count": count }, /* @__PURE__ */ __nativeJsx.jsx("h1", null, "Installed counter"), /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		onClick: () => setCount(count + 1)
	}, "Increment"), /* @__PURE__ */ __nativeJsx.jsx(Readout, { count }));
}
createDOMRoot(document.getElementById("app")).mount(/* @__PURE__ */ __nativeJsx.jsx(Counter, null));
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-014f8aad83a62cf1",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "native.tsx",
		"module_revision": "native-v1-014f8aad83a62cf1",
		"owners": [{
			"site_id": "native.tsx#component:Counter",
			"repeated_scope": "runtime-keyed-owner"
		}, {
			"site_id": "native.tsx#component:Readout",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": "native.tsx#component:Counter#state:0",
			"owner_site_id": "native.tsx#component:Counter",
			"kind": "state",
			"provenance": "tracked"
		}],
		"sinks": [{
			"site_id": "native.tsx#opaque-sink:343",
			"owner_site_id": "native.tsx#component:Counter",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}, {
			"site_id": "native.tsx#opaque-sink:417",
			"owner_site_id": "native.tsx#component:Counter",
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
	"source_file": "native.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/core */\n// @native-ui\nimport { useState } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"native.tsx#component:Counter\", Counter, { propOnlySites: [] });\n__nativeDefineComponent(\"native.tsx#component:Readout\", Readout, { propOnlySites: [] });\nimport { createDOMRoot } from \"@r3act/host-dom\";\n\nfunction Readout(props: { count: number }) {\n  return <output data-count={props.count}>{props.count}</output>;\n}\n\nfunction Counter() {\n  const [count, setCount] = __nativeUseStateAt(\"native.tsx#component:Counter#state:0\", 0);\n  return <main data-count={count}>\n    <h1>Installed counter</h1>\n    <button type=\"button\" onClick={() => setCount(count + 1)}>Increment</button>\n    <Readout count={count} />\n  </main>;\n}\n\ncreateDOMRoot(document.getElementById(\"app\")!).mount(<Counter />);\n",
	"components": [{
		"name": "Counter",
		"component_site_id": "native.tsx#component:Counter",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [{
			"site_id": "native.tsx#component:Counter#state:0",
			"initial_value": "0"
		}],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": ["native.tsx#opaque-sink:343", "native.tsx#opaque-sink:417"]
	}, {
		"name": "Readout",
		"component_site_id": "native.tsx#component:Readout",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}]
};
import * as __nativeJsx from "@r3act/core";
