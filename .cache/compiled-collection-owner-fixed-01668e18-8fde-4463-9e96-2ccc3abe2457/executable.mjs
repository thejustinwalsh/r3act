import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx",
	"module_revision": "native-v1-3de10c3ae9ff9621",
	"owners": [
		{
			"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:PureCollection",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [{
		"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#state:0",
		"owner_site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row",
		"kind": "state",
		"provenance": "tracked"
	}],
	"sinks": [{
		"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#numeric-sink:1411",
		"owner_site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row",
		"source_sites": [".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}],
	"operations": [
		{
			"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection#collection:0",
			"owner_site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection",
			"kind": "collection",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection#effect:0",
			"owner_site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:PureCollection#collection:0",
			"owner_site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:PureCollection",
			"kind": "collection",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#effect:0",
			"owner_site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": { ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#state:0": [".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#numeric-sink:1411"] },
		"execution_order": [".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#numeric-sink:1411"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx" && event.previousRevision === "native-v1-3de10c3ae9ff9621" && event.previousInstance === "native-v1-3de10c3ae9ff9621") __invalidateNativeSemanticPlan(".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx", "native-v1-3de10c3ae9ff9621");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createKeyedCollection, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, renderCollectionAt as __nativeRenderCollectionAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row",
	sinkId: ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#numeric-sink:1411",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: [".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#state:0"]
}];
__nativeDefineComponent(".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection", OpaqueCollection, {
	propOnlySites: [],
	closedCollectionSites: []
});
__nativeDefineComponent(".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:PureCollection", PureCollection, {
	propOnlySites: [],
	closedCollectionSites: [".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:PureCollection#collection:0"]
});
__nativeDefineComponent(".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row", Row, { propOnlySites: [] });
export const trace = {
	value: "A",
	throwGetter: false,
	throwRowGetter: false,
	opaqueCalls: 0,
	getterCalls: 0,
	rowGetterCalls: 0,
	ownerCalls: 0,
	mounts: {},
	cleanups: {},
	setters: {},
	effectMounts: 0,
	effectCleanups: 0
};
export const opaqueRows = createKeyedCollection([
	{
		id: "a",
		label: "Alpha"
	},
	{
		id: "b",
		label: "Beta"
	},
	{
		id: "c",
		get label() {
			trace.rowGetterCalls++;
			if (trace.throwRowGetter) throw new Error("collection row getter failed");
			return "Gamma";
		}
	}
], (row) => row.id);
export const pureRows = createKeyedCollection([{
	id: "p",
	label: "Pure"
}, {
	id: "q",
	label: "Quiet"
}], (row) => row.id);
const source = { get current() {
	trace.getterCalls++;
	if (trace.throwGetter) throw new Error("collection opaque getter failed");
	return trace.value;
} };
export function readOpaque() {
	trace.opaqueCalls++;
	return source.current;
}
export function Row(props) {
	const { id, label } = props.row;
	const [count, setCount] = __nativeUseStateAt(".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#state:0", 0);
	__nativeUseEffectAt(".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#effect:0", () => {
		trace.mounts[id] = (trace.mounts[id] || 0) + 1;
		trace.setters[id] = setCount;
		return () => {
			trace.cleanups[id] = (trace.cleanups[id] || 0) + 1;
		};
	});
	return /* @__PURE__ */ jsx("li", {
		key: id,
		"data-row": id,
		"data-count": __nativeBindStatePropAt(".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#state:0", (count) => count, __nativeNumericPrograms[0])
	}, label);
}
export function OpaqueCollection(props) {
	trace.ownerCalls++;
	__nativeUseEffectAt(".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection#effect:0", () => {
		trace.effectMounts++;
		return () => {
			trace.effectCleanups++;
		};
	});
	const sibling = readOpaque();
	return /* @__PURE__ */ jsx("section", {
		key: "opaque-section",
		"data-section": props.caption
	}, /* @__PURE__ */ jsx("output", {
		key: "opaque-sibling",
		"data-opaque": sibling
	}), /* @__PURE__ */ jsx("ul", { key: "opaque-list" }, __nativeRenderCollectionAt(".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection#collection:0", opaqueRows, ((row) => /* @__PURE__ */ jsx(Row, {
		row,
		probe: row.label
	})), { requiresOwnerRender: true })));
}
export function PureCollection() {
	return /* @__PURE__ */ jsx("ol", { key: "pure-list" }, __nativeRenderCollectionAt(".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:PureCollection#collection:0", pureRows, ((row) => /* @__PURE__ */ jsx(Row, { row }))));
}
export function App(props) {
	return /* @__PURE__ */ jsx("main", null, /* @__PURE__ */ jsx(OpaqueCollection, {
		key: "opaque-owner",
		caption: props.caption
	}), /* @__PURE__ */ jsx(PureCollection, { key: "pure-owner" }));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-3de10c3ae9ff9621",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx",
		"module_revision": "native-v1-3de10c3ae9ff9621",
		"owners": [
			{
				"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:PureCollection",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [{
			"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#state:0",
			"owner_site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row",
			"kind": "state",
			"provenance": "tracked"
		}],
		"sinks": [{
			"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#numeric-sink:1411",
			"owner_site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row",
			"source_sites": [".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}],
		"operations": [
			{
				"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection#collection:0",
				"owner_site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection",
				"kind": "collection",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection#effect:0",
				"owner_site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:PureCollection#collection:0",
				"owner_site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:PureCollection",
				"kind": "collection",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#effect:0",
				"owner_site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": { ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#state:0": [".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#numeric-sink:1411"] },
			"execution_order": [".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#numeric-sink:1411"]
		}
	},
	"source_file": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport { createKeyedCollection, jsx, useEffect, useState } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row\", sinkId: \".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#numeric-sink:1411\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#state:0\"] }] as const;\n__nativeDefineComponent(\".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection\", OpaqueCollection, { propOnlySites: [], closedCollectionSites: [] });\n__nativeDefineComponent(\".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:PureCollection\", PureCollection, { propOnlySites: [], closedCollectionSites: [\".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:PureCollection#collection:0\"] });\n__nativeDefineComponent(\".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row\", Row, { propOnlySites: [] });\n\nexport const trace = {\n  value: \"A\", throwGetter: false, throwRowGetter: false,\n  opaqueCalls: 0, getterCalls: 0, rowGetterCalls: 0,\n  ownerCalls: 0, mounts: {}, cleanups: {},\n  setters: {}, effectMounts: 0, effectCleanups: 0,\n};\nexport const opaqueRows = createKeyedCollection([\n  { id: \"a\", label: \"Alpha\" }, { id: \"b\", label: \"Beta\" },\n  { id: \"c\", get label() {\n    trace.rowGetterCalls++;\n    if (trace.throwRowGetter) throw new Error(\"collection row getter failed\");\n    return \"Gamma\";\n  } },\n], row => row.id);\nexport const pureRows = createKeyedCollection([\n  { id: \"p\", label: \"Pure\" }, { id: \"q\", label: \"Quiet\" },\n], row => row.id);\nconst source = { get current() {\n  trace.getterCalls++;\n  if (trace.throwGetter) throw new Error(\"collection opaque getter failed\");\n  return trace.value;\n} };\nexport function readOpaque() { trace.opaqueCalls++; return source.current; }\n\nexport function Row(props) {\n  const { id, label } = props.row;\n  const [count, setCount] = __nativeUseStateAt(\".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#state:0\", 0);\n  __nativeUseEffectAt(\".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#effect:0\", () => {\n    trace.mounts[id] = (trace.mounts[id] || 0) + 1;\n    trace.setters[id] = setCount;\n    return () => { trace.cleanups[id] = (trace.cleanups[id] || 0) + 1; };\n  });\n  return <li key={id} data-row={id} data-count={__nativeBindStatePropAt(\".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#state:0\", (count) => (count), __nativeNumericPrograms[0])}>{label}</li>;\n}\nexport function OpaqueCollection(props) {\n  trace.ownerCalls++;\n  __nativeUseEffectAt(\".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection#effect:0\", () => {\n    trace.effectMounts++;\n    return () => { trace.effectCleanups++; };\n  });\n  const sibling = readOpaque();\n  return <section key=\"opaque-section\" data-section={props.caption}>\n    <output key=\"opaque-sibling\" data-opaque={sibling} />\n    <ul key=\"opaque-list\">{__nativeRenderCollectionAt(\".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection#collection:0\", opaqueRows, (row => <Row row={row} probe={row.label} />), { requiresOwnerRender: true })}</ul>\n  </section>;\n}\nexport function PureCollection() {\n  return <ol key=\"pure-list\">{__nativeRenderCollectionAt(\".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:PureCollection#collection:0\", pureRows, (row => <Row row={row} />))}</ol>;\n}\nexport function App(props) {\n  return <main>\n    <OpaqueCollection key=\"opaque-owner\" caption={props.caption} />\n    <PureCollection key=\"pure-owner\" />\n  </main>;\n}\n",
	"components": [
		{
			"name": "App",
			"component_site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:App",
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
			"name": "OpaqueCollection",
			"component_site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [{ "site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection#effect:0" }],
			"store_sites": [],
			"collection_sites": [{
				"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:OpaqueCollection#collection:0",
				"source_expression": "opaqueRows",
				"row_parameter": "row",
				"requires_owner_render": true
			}],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "PureCollection",
			"component_site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:PureCollection",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:PureCollection#collection:0",
				"source_expression": "pureRows",
				"row_parameter": "row",
				"requires_owner_render": false
			}],
			"closedCollectionSites": [".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:PureCollection#collection:0"],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Row",
			"component_site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": ".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#numeric-sink:1411",
				"source_sites": [".cache/compiled-collection-owner-fixed-01668e18-8fde-4463-9e96-2ccc3abe2457/collection-owner-effects.tsx#component:Row#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		}
	]
};
