import { jsx, Fragment } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx",
	"module_revision": "native-v1-030541eed7e85119",
	"owners": [
		{
			"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasApp",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:DomApp",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasApp#store:0",
			"owner_site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasApp",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow#state:0",
			"owner_site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:DomApp#store:0",
			"owner_site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:DomApp",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [{
		"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#opaque-sink:1489",
		"owner_site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow",
		"source_sites": [],
		"provenance": "opaque",
		"equality": "adapter-declared",
		"host_value": "adapter-declared",
		"retention": "adapter-declared",
		"execution": "generic"
	}],
	"operations": [
		{
			"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasApp#store:0",
			"owner_site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasApp",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow#effect:0",
			"owner_site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:DomApp#store:0",
			"owner_site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:DomApp",
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
		if (event?.sourceFile === ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx" && event.previousRevision === "native-v1-030541eed7e85119" && event.previousInstance === "native-v1-030541eed7e85119") __invalidateNativeSemanticPlan(".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx", "native-v1-030541eed7e85119");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useAt as __nativeUseAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasApp", CanvasApp, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow", CanvasRow, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:DomApp", DomApp, { propOnlySites: [] });
export function DomApp(props) {
	const stage = __nativeUseAt(".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:DomApp#store:0", props.stage);
	return /* @__PURE__ */ jsx("section", { "data-custom-host": "dom" }, /* @__PURE__ */ jsx("output", { "data-stage": stage }, stage));
}
export function CanvasRow(props) {
	const [clicks, setClicks] = __nativeUseStateAt(".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow#state:0", 0);
	__nativeUseEffectAt(".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow#effect:0", () => {
		props.life.mounts++;
		return () => {
			props.life.cleanups++;
		};
	});
	const y = 18 + props.index * 44;
	return /* @__PURE__ */ jsx("paintLayer", {
		key: props.id,
		name: props.id
	}, /* @__PURE__ */ jsx("paintRect", {
		key: "body",
		ref: props.nodeRef,
		name: props.id,
		position: [16, y],
		width: 160,
		height: 32,
		brush: props.brush,
		payload: props.payload,
		onClick: () => setClicks((current) => current + 1)
	}), /* @__PURE__ */ jsx("paintText", {
		key: "label",
		name: `${props.id}-label`,
		position: [24, y + 21],
		text: `${props.id}:${clicks}`,
		color: "#ffffff"
	}));
}
export function CanvasApp(props) {
	const stage = __nativeUseAt(".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasApp#store:0", props.stage);
	return /* @__PURE__ */ jsx("paintLayer", {
		key: "root",
		name: "canvas-root"
	}, /* @__PURE__ */ jsx("paintText", {
		key: "stage",
		name: "stage",
		position: [16, 14],
		text: `stage-${stage}`,
		color: "#26384f"
	}), props.rows.map((id, index) => /* @__PURE__ */ jsx(CanvasRow, {
		key: id,
		id,
		index,
		brush: props.brushes[id],
		nodeRef: props.refs[id],
		payload: props.payloads[id],
		life: props.life
	})));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-030541eed7e85119",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx",
		"module_revision": "native-v1-030541eed7e85119",
		"owners": [
			{
				"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasApp",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:DomApp",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasApp#store:0",
				"owner_site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasApp",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow#state:0",
				"owner_site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:DomApp#store:0",
				"owner_site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:DomApp",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [{
			"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#opaque-sink:1489",
			"owner_site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}],
		"operations": [
			{
				"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasApp#store:0",
				"owner_site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasApp",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow#effect:0",
				"owner_site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:DomApp#store:0",
				"owner_site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:DomApp",
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
	"source_file": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/core */\n// @native-ui\nimport { use, useEffect, useState } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasApp\", CanvasApp, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow\", CanvasRow, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:DomApp\", DomApp, { propOnlySites: [] });\nimport type { StoreSource } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport type { BrushBinding, CanvasNode } from \"./retained_host\";\n\nexport type RowId = \"shared-a\" | \"shared-b\" | \"owned\" | \"borrowed\";\nexport type RowLife = { mounts: number; cleanups: number };\nexport type RowRefs = Record<RowId, { current: CanvasNode | null }>;\nexport type RowBrushes = Record<RowId, BrushBinding>;\n\nexport function DomApp(props: { stage: StoreSource<string> }) {\n  const stage = __nativeUseAt(\".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:DomApp#store:0\", props.stage);\n  return <section data-custom-host=\"dom\"><output data-stage={stage}>{stage}</output></section>;\n}\n\nexport function CanvasRow(props: {\n  id: RowId;\n  index: number;\n  brush: BrushBinding;\n  nodeRef: { current: CanvasNode | null };\n  payload: { label: string };\n  life: RowLife;\n}) {\n  const [clicks, setClicks] = __nativeUseStateAt(\".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow#state:0\", 0);\n  __nativeUseEffectAt(\".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow#effect:0\", () => {\n    props.life.mounts++;\n    return () => { props.life.cleanups++; };\n  });\n  const y = 18 + props.index * 44;\n  return <paintLayer key={props.id} name={props.id}>\n    <paintRect key=\"body\" ref={props.nodeRef} name={props.id} position={[16, y]}\n      width={160} height={32} brush={props.brush} payload={props.payload}\n      onClick={() => setClicks((current) => current + 1)} />\n    <paintText key=\"label\" name={`${props.id}-label`} position={[24, y + 21]}\n      text={`${props.id}:${clicks}`} color=\"#ffffff\" />\n  </paintLayer>;\n}\n\nexport function CanvasApp(props: {\n  stage: StoreSource<string>;\n  rows: readonly RowId[];\n  brushes: RowBrushes;\n  refs: RowRefs;\n  payloads: Record<RowId, { label: string }>;\n  life: RowLife;\n}) {\n  const stage = __nativeUseAt(\".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasApp#store:0\", props.stage);\n  return <paintLayer key=\"root\" name=\"canvas-root\">\n    <paintText key=\"stage\" name=\"stage\" position={[16, 14]} text={`stage-${stage}`} color=\"#26384f\" />\n    {props.rows.map((id, index) => <CanvasRow key={id} id={id} index={index}\n      brush={props.brushes[id]} nodeRef={props.refs[id]}\n      payload={props.payloads[id]} life={props.life} />)}\n  </paintLayer>;\n}\n",
	"components": [
		{
			"name": "CanvasApp",
			"component_site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasApp",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasApp#store:0",
				"source_expression": "props.stage"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "CanvasRow",
			"component_site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:CanvasRow#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": [".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#opaque-sink:1489"]
		},
		{
			"name": "DomApp",
			"component_site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:DomApp",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": ".cache/compiled-custom-host-597dfb1e-f895-4aa2-9d1e-ec5bf7dbeba7/app.tsx#component:DomApp#store:0",
				"source_expression": "props.stage"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
