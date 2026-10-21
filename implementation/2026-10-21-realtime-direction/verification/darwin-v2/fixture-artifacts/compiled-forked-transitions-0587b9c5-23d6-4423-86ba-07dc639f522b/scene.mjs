import { jsx, Fragment } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx",
	"module_revision": "native-v1-d37bfc3a098875c2",
	"owners": [{
		"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp",
		"repeated_scope": "runtime-keyed-owner"
	}, {
		"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeResult",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [
		{
			"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp#store:0",
			"owner_site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp#store:1",
			"owner_site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeResult#store:0",
			"owner_site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeResult",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [],
	"operations": [
		{
			"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp#store:0",
			"owner_site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp#store:1",
			"owner_site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeResult#store:0",
			"owner_site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeResult",
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
		if (event?.sourceFile === ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx" && event.previousRevision === "native-v1-d37bfc3a098875c2" && event.previousInstance === "native-v1-d37bfc3a098875c2") __invalidateNativeSemanticPlan(".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx", "native-v1-d37bfc3a098875c2");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/host-three */
// @native-ui
import { Suspense } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp", ThreeApp, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeResult", ThreeResult, { propOnlySites: [] });
export function ThreeResult(props) {
	const panel = __nativeUseAt(".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeResult#store:0", props.resource);
	return /* @__PURE__ */ jsx("mesh", {
		key: "result",
		name: `result-${panel.query}`,
		position: [
			panel.query === "A" ? 1 : panel.query === "B" ? 2 : 3,
			0,
			0
		]
	}, /* @__PURE__ */ jsx("boxGeometry", null), /* @__PURE__ */ jsx("meshBasicMaterial", { color: "#4775ad" }));
}
export function ThreeApp(props) {
	const query = __nativeUseAt(".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp#store:0", props.query);
	const urgent = __nativeUseAt(".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp#store:1", props.urgent);
	return /* @__PURE__ */ jsx("group", {
		key: "scene",
		name: "forked-transitions"
	}, /* @__PURE__ */ jsx("group", {
		key: "frontier",
		name: `query-${query}`
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
		__nativeBoundarySite: ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#boundary:0"
	}, /* @__PURE__ */ jsx(ThreeResult, { resource: props.resource })), /* @__PURE__ */ jsx("mesh", {
		key: "borrowed",
		name: "borrowed",
		args: [props.geometry, props.material]
	}));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-d37bfc3a098875c2",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx",
		"module_revision": "native-v1-d37bfc3a098875c2",
		"owners": [{
			"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp",
			"repeated_scope": "runtime-keyed-owner"
		}, {
			"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeResult",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [
			{
				"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp#store:0",
				"owner_site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp#store:1",
				"owner_site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeResult#store:0",
				"owner_site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeResult",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [],
		"operations": [
			{
				"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp#store:0",
				"owner_site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp#store:1",
				"owner_site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeResult#store:0",
				"owner_site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeResult",
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
	"source_file": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/host-three */\n// @native-ui\nimport { Suspense, use } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp\", ThreeApp, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeResult\", ThreeResult, { propOnlySites: [] });\nimport type { AsyncResource, StoreSource } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport type { BufferGeometry, Material } from \"three\";\nimport type { Panel } from \"./app\";\n\nexport function ThreeResult(props: { resource: AsyncResource<Panel> }) {\n  const panel = __nativeUseAt(\".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeResult#store:0\", props.resource);\n  return <mesh key=\"result\" name={`result-${panel.query}`} position={[panel.query === \"A\" ? 1 : panel.query === \"B\" ? 2 : 3, 0, 0]}>\n    <boxGeometry />\n    <meshBasicMaterial color=\"#4775ad\" />\n  </mesh>;\n}\n\nexport function ThreeApp(props: {\n  query: StoreSource<string>;\n  urgent: StoreSource<number>;\n  resource: AsyncResource<Panel>;\n  geometry: BufferGeometry;\n  material: Material;\n}) {\n  const query = __nativeUseAt(\".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp#store:0\", props.query);\n  const urgent = __nativeUseAt(\".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp#store:1\", props.urgent);\n  return <group key=\"scene\" name=\"forked-transitions\">\n    <group key=\"frontier\" name={`query-${query}`} />\n    <group key=\"urgent\" name={`urgent-${urgent}`} />\n    <Suspense fallback={<group key=\"result\" name=\"result-pending\" />}\n      error={(reason: unknown) => <group key=\"result\" name={`result-error-${String(reason)}`} />} __nativeBoundarySite=\".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#boundary:0\">\n      <ThreeResult resource={props.resource} />\n    </Suspense>\n    <mesh key=\"borrowed\" name=\"borrowed\" args={[props.geometry, props.material]} />\n  </group>;\n}\n",
	"components": [{
		"name": "ThreeApp",
		"component_site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [{
			"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp#store:0",
			"source_expression": "props.query"
		}, {
			"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeApp#store:1",
			"source_expression": "props.urgent"
		}],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}, {
		"name": "ThreeResult",
		"component_site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeResult",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [{
			"site_id": ".cache/compiled-forked-transitions-0587b9c5-23d6-4423-86ba-07dc639f522b/scene.tsx#component:ThreeResult#store:0",
			"source_expression": "props.resource"
		}],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}]
};
