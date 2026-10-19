import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "native.tsx",
	"module_revision": "native-v1-5ab530c9c6fba80b",
	"owners": [{
		"site_id": "native.tsx#component:Counter",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": "native.tsx#component:Counter#state:0",
		"owner_site_id": "native.tsx#component:Counter",
		"kind": "state",
		"provenance": "tracked"
	}],
	"sinks": [{
		"site_id": "native.tsx#opaque-sink:359",
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
		if (event?.sourceFile === "native.tsx" && event.previousRevision === "native-v1-5ab530c9c6fba80b" && event.previousInstance === "native-v1-5ab530c9c6fba80b") __invalidateNativeSemanticPlan("native.tsx", "native-v1-5ab530c9c6fba80b");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt } from "@r3act/core";
import { createDOMRoot } from "@r3act/host-dom";
const Counter = __nativeDefineComponent("native.tsx#component:Counter", { Counter: () => {
	const [count, setCount] = __nativeUseStateAt("native.tsx#component:Counter#state:0", 0);
	return /* @__PURE__ */ __nativeJsx.jsx("main", null, /* @__PURE__ */ __nativeJsx.jsx("h1", null, "Arrow counter"), /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		onClick: () => setCount((value) => value + 1)
	}, "Increment"), /* @__PURE__ */ __nativeJsx.jsx("output", { "data-count": count }, count));
} }.Counter, { propOnlySites: [] });
const host = document.querySelector("#app");
if (host) {
	const root = createDOMRoot(host);
	root.mount(/* @__PURE__ */ __nativeJsx.jsx(Counter, null));
	window.comparison = {
		snapshot: () => ({
			count: host.querySelector("[data-count]")?.textContent ?? null,
			title: host.querySelector("h1")?.textContent ?? null,
			button: host.querySelector("button")?.textContent ?? null
		}),
		dispose: () => root.dispose()
	};
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-5ab530c9c6fba80b",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "native.tsx",
		"module_revision": "native-v1-5ab530c9c6fba80b",
		"owners": [{
			"site_id": "native.tsx#component:Counter",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": "native.tsx#component:Counter#state:0",
			"owner_site_id": "native.tsx#component:Counter",
			"kind": "state",
			"provenance": "tracked"
		}],
		"sinks": [{
			"site_id": "native.tsx#opaque-sink:359",
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
	"component_module": "/** @jsxImportSource @r3act/core */\n// @native-ui\nimport { useState } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\nimport { createDOMRoot } from \"@r3act/host-dom\";\n\nconst Counter = __nativeDefineComponent(\"native.tsx#component:Counter\", ({ Counter: () => {\n  const [count, setCount] = __nativeUseStateAt(\"native.tsx#component:Counter#state:0\", 0);\n  return <main><h1>Arrow counter</h1>\n    <button type=\"button\" onClick={() => setCount((value) => value + 1)}>Increment</button>\n    <output data-count={count}>{count}</output></main>;\n} }).Counter, { propOnlySites: [] });\n\nconst host = document.querySelector<HTMLElement>(\"#app\");\nif (host) {\n  const root = createDOMRoot(host);\n  root.mount(<Counter />);\n  window.comparison = {\n    snapshot: () => ({ count: host.querySelector(\"[data-count]\")?.textContent ?? null,\n      title: host.querySelector(\"h1\")?.textContent ?? null,\n      button: host.querySelector(\"button\")?.textContent ?? null }),\n    dispose: () => root.dispose(),\n  };\n}\n\ndeclare global { interface Window { comparison?: { snapshot(): unknown; dispose(): void } } }\n",
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
		"opaque_sinks": ["native.tsx#opaque-sink:359"]
	}]
};
import * as __nativeJsx from "@r3act/core";
