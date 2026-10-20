import { jsx, Fragment } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/.cache/compiled-runtime-origin-classification-2b0b6a5c-b6c5-451f-8b38-ae813267f916/fake-runtime.mjs";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "compiler/fixtures/native-runtime-origin/fake-app.tsx",
	"module_revision": "native-v1-6c58fe97acc68062",
	"owners": [{
		"site_id": "compiler/fixtures/native-runtime-origin/fake-app.tsx#component:App",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": "compiler/fixtures/native-runtime-origin/fake-app.tsx#component:App#store:0",
		"owner_site_id": "compiler/fixtures/native-runtime-origin/fake-app.tsx#component:App",
		"kind": "use-input",
		"provenance": "opaque"
	}],
	"sinks": [],
	"operations": [{
		"site_id": "compiler/fixtures/native-runtime-origin/fake-app.tsx#component:App#store:0",
		"owner_site_id": "compiler/fixtures/native-runtime-origin/fake-app.tsx#component:App",
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
		if (event?.sourceFile === "compiler/fixtures/native-runtime-origin/fake-app.tsx" && event.previousRevision === "native-v1-6c58fe97acc68062" && event.previousInstance === "native-v1-6c58fe97acc68062") __invalidateNativeSemanticPlan("compiler/fixtures/native-runtime-origin/fake-app.tsx", "native-v1-6c58fe97acc68062");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/core */
import { createStore } from "file:///Volumes/Depot/Developer/r3act/.cache/compiled-runtime-origin-classification-2b0b6a5c-b6c5-451f-8b38-ae813267f916/fake-runtime.mjs";
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt } from "file:///Volumes/Depot/Developer/r3act/.cache/compiled-runtime-origin-classification-2b0b6a5c-b6c5-451f-8b38-ae813267f916/fake-runtime.mjs";
__nativeDefineComponent("compiler/fixtures/native-runtime-origin/fake-app.tsx#component:App", App, { propOnlySites: [] });
const source = createStore("probe");
export function App() {
	return /* @__PURE__ */ jsx("output", null, __nativeUseAt("compiler/fixtures/native-runtime-origin/fake-app.tsx#component:App#store:0", source));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-6c58fe97acc68062",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "compiler/fixtures/native-runtime-origin/fake-app.tsx",
		"module_revision": "native-v1-6c58fe97acc68062",
		"owners": [{
			"site_id": "compiler/fixtures/native-runtime-origin/fake-app.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": "compiler/fixtures/native-runtime-origin/fake-app.tsx#component:App#store:0",
			"owner_site_id": "compiler/fixtures/native-runtime-origin/fake-app.tsx#component:App",
			"kind": "use-input",
			"provenance": "opaque"
		}],
		"sinks": [],
		"operations": [{
			"site_id": "compiler/fixtures/native-runtime-origin/fake-app.tsx#component:App#store:0",
			"owner_site_id": "compiler/fixtures/native-runtime-origin/fake-app.tsx#component:App",
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
	"source_file": "compiler/fixtures/native-runtime-origin/fake-app.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/core */\nimport { createStore, use } from \"./fake/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"./fake/native_runtime_api.ts\";\n__nativeDefineComponent(\"compiler/fixtures/native-runtime-origin/fake-app.tsx#component:App\", App, { propOnlySites: [] });\n\nconst source = createStore(\"probe\");\n\nexport function App() {\n  return <output>{__nativeUseAt(\"compiler/fixtures/native-runtime-origin/fake-app.tsx#component:App#store:0\", source)}</output>;\n}\n",
	"components": [{
		"name": "App",
		"component_site_id": "compiler/fixtures/native-runtime-origin/fake-app.tsx#component:App",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [{
			"site_id": "compiler/fixtures/native-runtime-origin/fake-app.tsx#component:App#store:0",
			"source_expression": "source"
		}],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}]
};
