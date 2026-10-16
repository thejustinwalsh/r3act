import { createKeyedCollection, createStore } from "../src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from "../src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 1,
	sinkId: ".cache/native-collection-differential.tsx#numeric-sink:1347",
	sourceSites: [".cache/native-collection-differential.tsx#component:Row#state:0"]
}, {
	schemaVersion: 1,
	sinkId: ".cache/native-collection-differential.tsx#numeric-sink:2774",
	sourceSites: [".cache/native-collection-differential.tsx#component:FilterRow#state:0"]
}];
__nativeDefineComponent(".cache/native-collection-differential.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-collection-differential.tsx#component:FallbackApp", FallbackApp, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-collection-differential.tsx#component:FallbackRow", FallbackRow, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-collection-differential.tsx#component:FilterApp", FilterApp, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-collection-differential.tsx#component:FilterRow", FilterRow, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-collection-differential.tsx#component:Row", Row, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-collection-differential.tsx#component:StoreProbe", StoreProbe, {
	propOnlySites: [],
	hostLeafOutput: true
});
export const rows = createKeyedCollection([
	{
		id: "a",
		value: 1
	},
	{
		id: "b",
		value: 2
	},
	{
		id: "c",
		value: 3
	},
	{
		id: "d",
		value: 4
	},
	{
		id: "e",
		value: 5
	}
], (item) => item.id);
export const fallbackRows = createKeyedCollection([{
	id: "fa",
	value: 10
}, {
	id: "fb",
	value: 20
}], (item) => item.id);
export const sourceStore = createStore(100);
export const trace = {
	rowRenders: 0,
	mounts: 0,
	cleanups: 0,
	mountCounts: Object.create(null),
	cleanupCounts: Object.create(null),
	setters: Object.create(null),
	probeRenders: 0,
	fallbackOwnerRenders: 0,
	filterRenders: 0,
	filterMounts: 0,
	filterCleanups: 0,
	filterMountCounts: Object.create(null),
	filterCleanupCounts: Object.create(null),
	filterSetters: Object.create(null),
	filterOwnerRenders: 0
};
export function Row({ item }) {
	trace.rowRenders++;
	const [local, setLocal] = __nativeUseStateAt(".cache/native-collection-differential.tsx#component:Row#state:0", 0);
	trace.setters[item.id] = setLocal;
	__nativeUseEffectAt(".cache/native-collection-differential.tsx#component:Row#effect:0", () => {
		trace.mounts++;
		trace.mountCounts[item.id] = (trace.mountCounts[item.id] || 0) + 1;
		return () => {
			trace.cleanups++;
			trace.cleanupCounts[item.id] = (trace.cleanupCounts[item.id] || 0) + 1;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("li", {
		"data-row": item.id,
		"data-value": item.value,
		"data-local": __nativeBindStatePropAt(".cache/native-collection-differential.tsx#component:Row#state:0", (local) => local, __nativeNumericPrograms[0]),
		onClick: () => setLocal((value) => value + 1)
	}, item.id, ":", item.value, ":", local);
}
export function StoreProbe() {
	trace.probeRenders++;
	const value = __nativeUseAt(".cache/native-collection-differential.tsx#component:StoreProbe#store:0", sourceStore);
	return /* @__PURE__ */ __nativeJsx.jsx("output", { "data-source": value }, "source:", value);
}
export function App() {
	return /* @__PURE__ */ __nativeJsx.jsx("section", null, /* @__PURE__ */ __nativeJsx.jsx(StoreProbe, null), /* @__PURE__ */ __nativeJsx.jsx("ul", null, __nativeRenderCollectionAt(".cache/native-collection-differential.tsx#component:App#collection:0", rows, ((item) => /* @__PURE__ */ __nativeJsx.jsx(Row, {
		key: item.id,
		item
	})))));
}
export function FallbackRow({ item }) {
	return /* @__PURE__ */ __nativeJsx.jsx("li", { "data-fallback-row": item.id }, item.value);
}
export function FallbackApp() {
	trace.fallbackOwnerRenders++;
	return /* @__PURE__ */ __nativeJsx.jsx("section", null, /* @__PURE__ */ __nativeJsx.jsx("output", { "data-fallback-count": fallbackRows.size }, fallbackRows.size), /* @__PURE__ */ __nativeJsx.jsx("ul", null, __nativeRenderCollectionAt(".cache/native-collection-differential.tsx#component:FallbackApp#collection:0", fallbackRows, ((item) => /* @__PURE__ */ __nativeJsx.jsx(FallbackRow, {
		key: item.id,
		item
	})), { requiresOwnerRender: true })));
}
export const filterItems = [
	{
		id: "fi0",
		value: 1
	},
	{
		id: "fi1",
		value: 2
	},
	{
		id: "fi2",
		value: 3
	},
	{
		id: "fi3",
		value: 4
	},
	{
		id: "fi4",
		value: 5
	}
];
export function FilterRow({ item }) {
	trace.filterRenders++;
	const [local, setLocal] = __nativeUseStateAt(".cache/native-collection-differential.tsx#component:FilterRow#state:0", 0);
	trace.filterSetters[item.id] = setLocal;
	__nativeUseEffectAt(".cache/native-collection-differential.tsx#component:FilterRow#effect:0", () => {
		trace.filterMounts++;
		trace.filterMountCounts[item.id] = (trace.filterMountCounts[item.id] || 0) + 1;
		return () => {
			trace.filterCleanups++;
			trace.filterCleanupCounts[item.id] = (trace.filterCleanupCounts[item.id] || 0) + 1;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("li", {
		"data-filter-row": item.id,
		"data-filter-value": item.value,
		"data-filter-local": __nativeBindStatePropAt(".cache/native-collection-differential.tsx#component:FilterRow#state:0", (local) => local, __nativeNumericPrograms[1]),
		onClick: () => setLocal((value) => value + 1)
	}, item.id, ":", item.value, ":", local);
}
export function FilterApp() {
	const [evenOnly, setEvenOnly] = __nativeUseStateAt(".cache/native-collection-differential.tsx#component:FilterApp#state:0", false);
	trace.filterOwnerRenders++;
	return /* @__PURE__ */ __nativeJsx.jsx("section", null, /* @__PURE__ */ __nativeJsx.jsx("button", {
		"data-filter-toggle": "yes",
		onClick: () => setEvenOnly((value) => !value)
	}, evenOnly ? "even" : "all"), /* @__PURE__ */ __nativeJsx.jsx("ul", null, filterItems.filter((item) => !evenOnly || item.value % 2 === 0).map((item) => /* @__PURE__ */ __nativeJsx.jsx(FilterRow, {
		key: item.id,
		item
	}))));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/native-collection-differential.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { createKeyedCollection, createStore, use, useEffect, useState } from \"../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 1, sinkId: \".cache/native-collection-differential.tsx#numeric-sink:1347\", sourceSites: [\".cache/native-collection-differential.tsx#component:Row#state:0\"] }, { schemaVersion: 1, sinkId: \".cache/native-collection-differential.tsx#numeric-sink:2774\", sourceSites: [\".cache/native-collection-differential.tsx#component:FilterRow#state:0\"] }] as const;\n__nativeDefineComponent(\".cache/native-collection-differential.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-collection-differential.tsx#component:FallbackApp\", FallbackApp, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-collection-differential.tsx#component:FallbackRow\", FallbackRow, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-collection-differential.tsx#component:FilterApp\", FilterApp, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-collection-differential.tsx#component:FilterRow\", FilterRow, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-collection-differential.tsx#component:Row\", Row, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-collection-differential.tsx#component:StoreProbe\", StoreProbe, { propOnlySites: [], hostLeafOutput: true });\n\nexport const rows = createKeyedCollection([\n  { id: \"a\", value: 1 }, { id: \"b\", value: 2 }, { id: \"c\", value: 3 },\n  { id: \"d\", value: 4 }, { id: \"e\", value: 5 },\n], (item) => item.id);\nexport const fallbackRows = createKeyedCollection([\n  { id: \"fa\", value: 10 }, { id: \"fb\", value: 20 },\n], (item) => item.id);\nexport const sourceStore = createStore(100);\nexport const trace = {\n  rowRenders: 0,\n  mounts: 0,\n  cleanups: 0,\n  mountCounts: Object.create(null),\n  cleanupCounts: Object.create(null),\n  setters: Object.create(null),\n  probeRenders: 0,\n  fallbackOwnerRenders: 0,\n  filterRenders: 0,\n  filterMounts: 0,\n  filterCleanups: 0,\n  filterMountCounts: Object.create(null),\n  filterCleanupCounts: Object.create(null),\n  filterSetters: Object.create(null),\n  filterOwnerRenders: 0,\n};\n\nexport function Row({ item }) {\n  trace.rowRenders++;\n  const [local, setLocal] = __nativeUseStateAt(\".cache/native-collection-differential.tsx#component:Row#state:0\", 0);\n  trace.setters[item.id] = setLocal;\n  __nativeUseEffectAt(\".cache/native-collection-differential.tsx#component:Row#effect:0\", () => {\n    trace.mounts++;\n    trace.mountCounts[item.id] = (trace.mountCounts[item.id] || 0) + 1;\n    return () => {\n      trace.cleanups++;\n      trace.cleanupCounts[item.id] = (trace.cleanupCounts[item.id] || 0) + 1;\n    };\n  });\n  return <li data-row={item.id} data-value={item.value} data-local={__nativeBindStatePropAt(\".cache/native-collection-differential.tsx#component:Row#state:0\", (local) => (local), __nativeNumericPrograms[0])}\n    onClick={() => setLocal((value) => value + 1)}>{item.id}:{item.value}:{local}</li>;\n}\n\nexport function StoreProbe() {\n  trace.probeRenders++;\n  const value = __nativeUseAt(\".cache/native-collection-differential.tsx#component:StoreProbe#store:0\", sourceStore);\n  return <output data-source={value}>source:{value}</output>;\n}\n\nexport function App() {\n  return <section><StoreProbe /><ul>{__nativeRenderCollectionAt(\".cache/native-collection-differential.tsx#component:App#collection:0\", rows, ((item) => <Row key={item.id} item={item} />))}</ul></section>;\n}\n\nexport function FallbackRow({ item }) {\n  return <li data-fallback-row={item.id}>{item.value}</li>;\n}\n\nexport function FallbackApp() {\n  trace.fallbackOwnerRenders++;\n  return <section><output data-fallback-count={fallbackRows.size}>{fallbackRows.size}</output>\n    <ul>{__nativeRenderCollectionAt(\".cache/native-collection-differential.tsx#component:FallbackApp#collection:0\", fallbackRows, ((item) => <FallbackRow key={item.id} item={item} />), { requiresOwnerRender: true })}</ul></section>;\n}\n\nexport const filterItems = [\n  { id: \"fi0\", value: 1 }, { id: \"fi1\", value: 2 }, { id: \"fi2\", value: 3 },\n  { id: \"fi3\", value: 4 }, { id: \"fi4\", value: 5 },\n];\nexport function FilterRow({ item }) {\n  trace.filterRenders++;\n  const [local, setLocal] = __nativeUseStateAt(\".cache/native-collection-differential.tsx#component:FilterRow#state:0\", 0);\n  trace.filterSetters[item.id] = setLocal;\n  __nativeUseEffectAt(\".cache/native-collection-differential.tsx#component:FilterRow#effect:0\", () => {\n    trace.filterMounts++;\n    trace.filterMountCounts[item.id] = (trace.filterMountCounts[item.id] || 0) + 1;\n    return () => {\n      trace.filterCleanups++;\n      trace.filterCleanupCounts[item.id] = (trace.filterCleanupCounts[item.id] || 0) + 1;\n    };\n  });\n  return <li data-filter-row={item.id} data-filter-value={item.value} data-filter-local={__nativeBindStatePropAt(\".cache/native-collection-differential.tsx#component:FilterRow#state:0\", (local) => (local), __nativeNumericPrograms[1])}\n    onClick={() => setLocal((value) => value + 1)}>{item.id}:{item.value}:{local}</li>;\n}\n\nexport function FilterApp() {\n  const [evenOnly, setEvenOnly] = __nativeUseStateAt(\".cache/native-collection-differential.tsx#component:FilterApp#state:0\", false);\n  trace.filterOwnerRenders++;\n  return <section><button data-filter-toggle=\"yes\" onClick={() => setEvenOnly((value) => !value)}>{evenOnly ? \"even\" : \"all\"}</button>\n    <ul>{filterItems.filter((item) => !evenOnly || item.value % 2 === 0).map((item) => <FilterRow key={item.id} item={item} />)}</ul></section>;\n}",
	"components": [
		{
			"name": "App",
			"component_site_id": ".cache/native-collection-differential.tsx#component:App",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": ".cache/native-collection-differential.tsx#component:App#collection:0",
				"source_expression": "rows",
				"row_parameter": "item",
				"requires_owner_render": false
			}]
		},
		{
			"name": "FallbackApp",
			"component_site_id": ".cache/native-collection-differential.tsx#component:FallbackApp",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": ".cache/native-collection-differential.tsx#component:FallbackApp#collection:0",
				"source_expression": "fallbackRows",
				"row_parameter": "item",
				"requires_owner_render": true
			}]
		},
		{
			"name": "FallbackRow",
			"component_site_id": ".cache/native-collection-differential.tsx#component:FallbackRow",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "FilterApp",
			"component_site_id": ".cache/native-collection-differential.tsx#component:FilterApp",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/native-collection-differential.tsx#component:FilterApp#state:0",
				"initial_value": "false"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "FilterRow",
			"component_site_id": ".cache/native-collection-differential.tsx#component:FilterRow",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/native-collection-differential.tsx#component:FilterRow#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": ".cache/native-collection-differential.tsx#component:FilterRow#effect:0" }],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "Row",
			"component_site_id": ".cache/native-collection-differential.tsx#component:Row",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/native-collection-differential.tsx#component:Row#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": ".cache/native-collection-differential.tsx#component:Row#effect:0" }],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "StoreProbe",
			"component_site_id": ".cache/native-collection-differential.tsx#component:StoreProbe",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": ".cache/native-collection-differential.tsx#component:StoreProbe#store:0",
				"source_expression": "sourceStore"
			}],
			"collection_sites": []
		}
	]
};
import * as __nativeJsx from "../src/native_runtime_api.ts";
