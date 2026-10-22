import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx",
	"module_revision": "native-v1-de1dd8632b6a6242",
	"owners": [
		{
			"site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:List",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:Row",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [],
	"sinks": [],
	"operations": [{
		"site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:List#collection:0",
		"owner_site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:List",
		"kind": "collection",
		"provenance": "opaque",
		"source_sites": []
	}, {
		"site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:Row#effect:0",
		"owner_site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:Row",
		"kind": "activation-effect",
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
		if (event?.sourceFile === ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx" && event.previousRevision === "native-v1-de1dd8632b6a6242" && event.previousInstance === "native-v1-de1dd8632b6a6242") __invalidateNativeSemanticPlan(".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx", "native-v1-de1dd8632b6a6242");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { jsx, createKeyedCollection } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useEffectAt as __nativeUseEffectAt, renderCollectionAt as __nativeRenderCollectionAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:List", List, {
	propOnlySites: [],
	closedCollectionSites: [".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:List#collection:0"]
});
__nativeDefineComponent(".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:Row", Row, { propOnlySites: [] });
export const rows = createKeyedCollection([{
	id: "dead",
	payload: { value: "removed" }
}, {
	id: "live",
	payload: { value: "surviving" }
}], (row) => row.id);
export const trace = {
	mounts: {},
	cleanups: {}
};
export function Row({ row }) {
	__nativeUseEffectAt(".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:Row#effect:0", () => {
		trace.mounts[row.id] = (trace.mounts[row.id] || 0) + 1;
		return () => {
			trace.cleanups[row.id] = (trace.cleanups[row.id] || 0) + 1;
		};
	});
	return /* @__PURE__ */ jsx("li", {
		key: row.id,
		"data-id": row.id,
		onClick: () => row.payload
	}, row.id);
}
export function List() {
	return /* @__PURE__ */ jsx("ul", null, __nativeRenderCollectionAt(".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:List#collection:0", rows, ((row) => /* @__PURE__ */ jsx(Row, { row }))));
}
export function App() {
	return /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx(List, { key: "list" }));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-de1dd8632b6a6242",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx",
		"module_revision": "native-v1-de1dd8632b6a6242",
		"owners": [
			{
				"site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:List",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:Row",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [],
		"sinks": [],
		"operations": [{
			"site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:List#collection:0",
			"owner_site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:List",
			"kind": "collection",
			"provenance": "opaque",
			"source_sites": []
		}, {
			"site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:Row#effect:0",
			"owner_site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:Row",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {},
			"execution_order": []
		}
	},
	"source_file": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport { jsx, createKeyedCollection, useEffect } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:List\", List, { propOnlySites: [], closedCollectionSites: [\".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:List#collection:0\"] });\n__nativeDefineComponent(\".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:Row\", Row, { propOnlySites: [] });\nexport const rows = createKeyedCollection([\n  { id: \"dead\", payload: { value: \"removed\" } },\n  { id: \"live\", payload: { value: \"surviving\" } },\n], row => row.id);\nexport const trace = { mounts: {}, cleanups: {} };\nexport function Row({ row }) {\n  __nativeUseEffectAt(\".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:Row#effect:0\", () => {\n    trace.mounts[row.id] = (trace.mounts[row.id] || 0) + 1;\n    return () => { trace.cleanups[row.id] = (trace.cleanups[row.id] || 0) + 1; };\n  });\n  return <li key={row.id} data-id={row.id} onClick={() => row.payload}>{row.id}</li>;\n}\nexport function List() {\n  return <ul>{__nativeRenderCollectionAt(\".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:List#collection:0\", rows, (row => <Row row={row} />))}</ul>;\n}\nexport function App() { return <section><List key=\"list\" /></section>; }\n",
	"components": [
		{
			"name": "App",
			"component_site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:App",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "List",
			"component_site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:List",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:List#collection:0",
				"source_expression": "rows",
				"row_parameter": "row",
				"requires_owner_render": false
			}],
			"closedCollectionSites": [".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:List#collection:0"],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Row",
			"component_site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:Row",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [{ "site_id": ".cache/compiled-collection-owner-retention-4d112bb7-5ae3-44eb-9d76-73c4d3d17a2e/retention.tsx#component:Row#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
