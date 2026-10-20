import { jsx, Fragment } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx",
	"module_revision": "native-v1-2b5c2ea91c1523da",
	"owners": [{
		"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowMesh",
		"repeated_scope": "runtime-keyed-owner"
	}, {
		"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [
		{
			"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowMesh#store:0",
			"owner_site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowMesh",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene#store:0",
			"owner_site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene#store:1",
			"owner_site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [],
	"operations": [
		{
			"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowMesh#store:0",
			"owner_site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowMesh",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene#store:0",
			"owner_site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene#store:1",
			"owner_site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {},
		"execution_order": []
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx" && event.previousRevision === "native-v1-2b5c2ea91c1523da" && event.previousInstance === "native-v1-2b5c2ea91c1523da") __invalidateNativeSemanticPlan(".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx", "native-v1-2b5c2ea91c1523da");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/host-three */
// @native-ui
import { Suspense } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export const ArrowMesh = __nativeDefineComponent(".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowMesh", { ArrowMesh: (props) => {
	const panel = __nativeUseAt(".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowMesh#store:0", props.resource);
	return /* @__PURE__ */ jsx("mesh", {
		key: "result",
		name: `result-${panel.stage}`
	}, /* @__PURE__ */ jsx("boxGeometry", null), /* @__PURE__ */ jsx("meshBasicMaterial", { color: "#4775ad" }));
} }.ArrowMesh, { propOnlySites: [] });
export const ArrowScene = __nativeDefineComponent(".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene", { ArrowScene: (props) => {
	const stage = __nativeUseAt(".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene#store:0", props.stage);
	const urgent = __nativeUseAt(".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene#store:1", props.urgent);
	return /* @__PURE__ */ jsx("group", {
		key: "scene",
		name: "arrow-components"
	}, /* @__PURE__ */ jsx("group", {
		key: "stage",
		name: `stage-${stage}`
	}), /* @__PURE__ */ jsx("group", {
		key: "urgent",
		name: `urgent-${urgent}`
	}), /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx("group", {
			key: "result",
			name: "result-pending"
		}),
		error: (reason) => /* @__PURE__ */ jsx("group", {
			key: "result",
			name: `result-error-${String(reason)}`
		}),
		__nativeBoundarySite: ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#boundary:0"
	}, /* @__PURE__ */ jsx(ArrowMesh, { resource: props.resource })));
} }.ArrowScene, { propOnlySites: [] });
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-2b5c2ea91c1523da",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx",
		"module_revision": "native-v1-2b5c2ea91c1523da",
		"owners": [{
			"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowMesh",
			"repeated_scope": "runtime-keyed-owner"
		}, {
			"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [
			{
				"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowMesh#store:0",
				"owner_site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowMesh",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene#store:0",
				"owner_site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene#store:1",
				"owner_site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [],
		"operations": [
			{
				"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowMesh#store:0",
				"owner_site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowMesh",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene#store:0",
				"owner_site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene#store:1",
				"owner_site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {},
			"execution_order": []
		}
	},
	"source_file": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/host-three */\n// @native-ui\nimport { Suspense, use } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport type { AsyncResource, StoreSource } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport type { Panel } from \"./app\";\n\nexport const ArrowMesh = __nativeDefineComponent(\".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowMesh\", ({ ArrowMesh: (props: { resource: AsyncResource<Panel> }) => {\n  const panel = __nativeUseAt(\".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowMesh#store:0\", props.resource);\n  return <mesh key=\"result\" name={`result-${panel.stage}`}>\n    <boxGeometry />\n    <meshBasicMaterial color=\"#4775ad\" />\n  </mesh>;\n} }).ArrowMesh, { propOnlySites: [] });\n\nexport const ArrowScene = __nativeDefineComponent(\".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene\", ({ ArrowScene: (props: {\n  stage: StoreSource<string>;\n  urgent: StoreSource<number>;\n  resource: AsyncResource<Panel>;\n}) => {\n  const stage = __nativeUseAt(\".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene#store:0\", props.stage);\n  const urgent = __nativeUseAt(\".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene#store:1\", props.urgent);\n  return <group key=\"scene\" name=\"arrow-components\">\n    <group key=\"stage\" name={`stage-${stage}`} />\n    <group key=\"urgent\" name={`urgent-${urgent}`} />\n    <Suspense fallback={<group key=\"result\" name=\"result-pending\" />}\n      error={(reason: unknown) => <group key=\"result\" name={`result-error-${String(reason)}`} />} __nativeBoundarySite=\".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#boundary:0\">\n      <ArrowMesh resource={props.resource} />\n    </Suspense>\n  </group>;\n} }).ArrowScene, { propOnlySites: [] });\n",
	"components": [{
		"name": "ArrowMesh",
		"component_site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowMesh",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [{
			"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowMesh#store:0",
			"source_expression": "props.resource"
		}],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}, {
		"name": "ArrowScene",
		"component_site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [{
			"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene#store:0",
			"source_expression": "props.stage"
		}, {
			"site_id": ".cache/compiled-arrow-components-3272b3ca-2698-48b1-bd1f-b8aee8e4f8d1/scene.tsx#component:ArrowScene#store:1",
			"source_expression": "props.urgent"
		}],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}]
};
