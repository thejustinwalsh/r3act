import { jsx, Fragment } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "compiler/fixtures/native-runtime-origin/app.tsx",
	"module_revision": "native-v1-b8aca3c70da65b51",
	"owners": [{
		"site_id": "compiler/fixtures/native-runtime-origin/app.tsx#component:App",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": "compiler/fixtures/native-runtime-origin/app.tsx#component:App#state:0",
		"owner_site_id": "compiler/fixtures/native-runtime-origin/app.tsx#component:App",
		"kind": "state",
		"provenance": "tracked"
	}],
	"sinks": [{
		"site_id": "compiler/fixtures/native-runtime-origin/app.tsx#opaque-sink:283",
		"owner_site_id": "compiler/fixtures/native-runtime-origin/app.tsx#component:App",
		"source_sites": [],
		"provenance": "opaque",
		"equality": "adapter-declared",
		"host_value": "adapter-declared",
		"retention": "adapter-declared",
		"execution": "generic"
	}, {
		"site_id": "compiler/fixtures/native-runtime-origin/app.tsx#opaque-sink:299",
		"owner_site_id": "compiler/fixtures/native-runtime-origin/app.tsx#component:App",
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
		if (event?.sourceFile === "compiler/fixtures/native-runtime-origin/app.tsx" && event.previousRevision === "native-v1-b8aca3c70da65b51" && event.previousInstance === "native-v1-b8aca3c70da65b51") __invalidateNativeSemanticPlan("compiler/fixtures/native-runtime-origin/app.tsx", "native-v1-b8aca3c70da65b51");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__nativeDefineComponent("compiler/fixtures/native-runtime-origin/app.tsx#component:App", App, { propOnlySites: [] });
import { use as wrapperUse } from "file:///Volumes/Depot/Developer/r3act/.cache/compiled-runtime-origin-6fd62bd4-c397-4bc0-a9e8-9ce55c405fce/wrapper.mjs";
export function App() {
	const [count, setCount] = __nativeUseStateAt("compiler/fixtures/native-runtime-origin/app.tsx#component:App#state:0", 0);
	const text = wrapperUse(count);
	return /* @__PURE__ */ jsx("button", {
		"data-count": count,
		onClick: () => setCount(count + 1)
	}, text);
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-b8aca3c70da65b51",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "compiler/fixtures/native-runtime-origin/app.tsx",
		"module_revision": "native-v1-b8aca3c70da65b51",
		"owners": [{
			"site_id": "compiler/fixtures/native-runtime-origin/app.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": "compiler/fixtures/native-runtime-origin/app.tsx#component:App#state:0",
			"owner_site_id": "compiler/fixtures/native-runtime-origin/app.tsx#component:App",
			"kind": "state",
			"provenance": "tracked"
		}],
		"sinks": [{
			"site_id": "compiler/fixtures/native-runtime-origin/app.tsx#opaque-sink:283",
			"owner_site_id": "compiler/fixtures/native-runtime-origin/app.tsx#component:App",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}, {
			"site_id": "compiler/fixtures/native-runtime-origin/app.tsx#opaque-sink:299",
			"owner_site_id": "compiler/fixtures/native-runtime-origin/app.tsx#component:App",
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
	"source_file": "compiler/fixtures/native-runtime-origin/app.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/core */\n// @native-ui\nimport { useState } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"compiler/fixtures/native-runtime-origin/app.tsx#component:App\", App, { propOnlySites: [] });\nimport { use as wrapperUse } from \"./my_native_runtime_api.ts\";\n\nexport function App() {\n  const [count, setCount] = __nativeUseStateAt(\"compiler/fixtures/native-runtime-origin/app.tsx#component:App#state:0\", 0);\n  const text = wrapperUse(count);\n  return <button data-count={count} onClick={() => setCount(count + 1)}>{text}</button>;\n}\n",
	"components": [{
		"name": "App",
		"component_site_id": "compiler/fixtures/native-runtime-origin/app.tsx#component:App",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [{
			"site_id": "compiler/fixtures/native-runtime-origin/app.tsx#component:App#state:0",
			"initial_value": "0"
		}],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": ["compiler/fixtures/native-runtime-origin/app.tsx#opaque-sink:283", "compiler/fixtures/native-runtime-origin/app.tsx#opaque-sink:299"]
	}]
};
