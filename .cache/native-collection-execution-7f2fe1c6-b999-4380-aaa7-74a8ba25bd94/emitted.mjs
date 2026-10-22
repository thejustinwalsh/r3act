import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx",
	"module_revision": "native-v1-d3af8f1d73f7a965",
	"owners": [
		{
			"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:CountHost",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:HostChild",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Rows",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:HostChild#state:0",
			"owner_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:HostChild",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:0",
			"owner_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:1",
			"owner_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row",
			"kind": "state",
			"provenance": "tracked"
		}
	],
	"sinks": [{
		"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#numeric-sink:679",
		"owner_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row",
		"source_sites": [".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}, {
		"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#opaque-sink:764",
		"owner_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row",
		"source_sites": [],
		"provenance": "opaque",
		"equality": "adapter-declared",
		"host_value": "adapter-declared",
		"retention": "adapter-declared",
		"execution": "generic"
	}],
	"operations": [
		{
			"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:CountHost#collection:0",
			"owner_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:CountHost",
			"kind": "collection",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#effect:0",
			"owner_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Rows#collection:0",
			"owner_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Rows",
			"kind": "collection",
			"provenance": "opaque",
			"source_sites": []
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": { ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:0": [".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#numeric-sink:679"] },
		"execution_order": [".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#numeric-sink:679"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx" && event.previousRevision === "native-v1-d3af8f1d73f7a965" && event.previousInstance === "native-v1-d3af8f1d73f7a965") __invalidateNativeSemanticPlan(".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx", "native-v1-d3af8f1d73f7a965");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { jsx, createKeyedCollection } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, renderCollectionAt as __nativeRenderCollectionAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row",
	sinkId: ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#numeric-sink:679",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: [".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:0"]
}];
__nativeDefineComponent(".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:CountHost", CountHost, {
	propOnlySites: [],
	closedCollectionSites: []
});
__nativeDefineComponent(".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:HostChild", HostChild, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent(".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row", Row, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Rows", Rows, {
	propOnlySites: [],
	closedCollectionSites: [".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Rows#collection:0"]
});
export const rows = createKeyedCollection(Array.from({ length: 1e3 }, (_, i) => ({
	id: String(i),
	label: "Row " + i
})), (row) => row.id);
export const trace = {
	renders: 0,
	mounts: 0,
	cleanups: 0
};
export function Row({ row }) {
	trace.renders++;
	const [tick, setTick] = __nativeUseStateAt(".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:0", 0);
	const [draft, setDraft] = __nativeUseStateAt(".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:1", row.label);
	__nativeUseEffectAt(".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#effect:0", () => {
		trace.mounts++;
		return () => {
			trace.cleanups++;
		};
	});
	if (row.label === "BAD") throw new Error("row candidate failed");
	return /* @__PURE__ */ jsx("li", {
		"data-row": row.id,
		"data-tick": __nativeBindStatePropAt(".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:0", (tick) => tick, __nativeNumericPrograms[0])
	}, /* @__PURE__ */ jsx("button", { onClick: () => setTick((previous) => previous + 1) }, "Tick"), /* @__PURE__ */ jsx("input", {
		value: draft,
		onInput: (event) => setDraft(event.value)
	}), /* @__PURE__ */ jsx("span", null, row.label));
}
export function Rows() {
	return /* @__PURE__ */ jsx("ul", null, __nativeRenderCollectionAt(".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Rows#collection:0", rows, ((row) => /* @__PURE__ */ jsx(Row, { row }))));
}
export const tiny = createKeyedCollection([{
	id: "tinyA",
	label: "A"
}, {
	id: "tinyB",
	label: "B"
}], (row) => row.id);
export function HostChild({ id }) {
	const [value, setValue] = __nativeUseStateAt(".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:HostChild#state:0", 0);
	return /* @__PURE__ */ jsx("button", {
		"data-child": id,
		onClick: () => setValue((previous) => previous + 1)
	}, value);
}
export function CountHost() {
	return /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("output", { "data-count": "yes" }, tiny.size, "v", tiny.version), /* @__PURE__ */ jsx("ul", null, __nativeRenderCollectionAt(".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:CountHost#collection:0", tiny, ((row) => /* @__PURE__ */ jsx("li", { key: row.id }, /* @__PURE__ */ jsx(HostChild, { id: row.id }))), { requiresOwnerRender: true })));
}
export function App({ title = "initial" }) {
	return /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("h1", null, title), /* @__PURE__ */ jsx(Rows, null));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-d3af8f1d73f7a965",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx",
		"module_revision": "native-v1-d3af8f1d73f7a965",
		"owners": [
			{
				"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:CountHost",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:HostChild",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Rows",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:HostChild#state:0",
				"owner_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:HostChild",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:0",
				"owner_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:1",
				"owner_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row",
				"kind": "state",
				"provenance": "tracked"
			}
		],
		"sinks": [{
			"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#numeric-sink:679",
			"owner_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row",
			"source_sites": [".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}, {
			"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#opaque-sink:764",
			"owner_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}],
		"operations": [
			{
				"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:CountHost#collection:0",
				"owner_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:CountHost",
				"kind": "collection",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#effect:0",
				"owner_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Rows#collection:0",
				"owner_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Rows",
				"kind": "collection",
				"provenance": "opaque",
				"source_sites": []
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": { ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:0": [".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#numeric-sink:679"] },
			"execution_order": [".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#numeric-sink:679"]
		}
	},
	"source_file": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport {jsx,useState,useEffect,createKeyedCollection} from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row\", sinkId: \".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#numeric-sink:679\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:0\"] }] as const;\n__nativeDefineComponent(\".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:CountHost\", CountHost, { propOnlySites: [], closedCollectionSites: [] });\n__nativeDefineComponent(\".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:HostChild\", HostChild, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row\", Row, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Rows\", Rows, { propOnlySites: [], closedCollectionSites: [\".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Rows#collection:0\"] });\nexport const rows=createKeyedCollection(Array.from({length:1000},(_,i)=>({id:String(i),label:'Row '+i})),row=>row.id);\nexport const trace={renders:0,mounts:0,cleanups:0};\nexport function Row({row}:{row:{id:string,label:string}}){\n trace.renders++;\n const [tick,setTick]=__nativeUseStateAt(\".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:0\", 0);\n const [draft,setDraft]=__nativeUseStateAt(\".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:1\", row.label);\n __nativeUseEffectAt(\".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#effect:0\", ()=>{trace.mounts++;return ()=>{trace.cleanups++}});\n if(row.label==='BAD')throw new Error('row candidate failed');\n return <li data-row={row.id} data-tick={__nativeBindStatePropAt(\".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:0\", (tick) => (tick), __nativeNumericPrograms[0])}><button onClick={()=>setTick(previous=>previous+1)}>Tick</button><input value={draft} onInput={(event:any)=>setDraft(event.value)}/><span>{row.label}</span></li>;\n}\nexport function Rows(){return <ul>{__nativeRenderCollectionAt(\".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Rows#collection:0\", rows, (row=><Row row={row}/>))}</ul>;}\nexport const tiny=createKeyedCollection([{id:'tinyA',label:'A'},{id:'tinyB',label:'B'}],row=>row.id);\nexport function HostChild({id}:{id:string}){const [value,setValue]=__nativeUseStateAt(\".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:HostChild#state:0\", 0);return <button data-child={id} onClick={()=>setValue(previous=>previous+1)}>{value}</button>;}\nexport function CountHost(){return <section><output data-count=\"yes\">{tiny.size}v{tiny.version}</output><ul>{__nativeRenderCollectionAt(\".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:CountHost#collection:0\", tiny, (row=><li key={row.id}><HostChild id={row.id}/></li>), { requiresOwnerRender: true })}</ul></section>;}\nexport function App({title='initial'}:{title?:string}){return <section><h1>{title}</h1><Rows/></section>;}\n",
	"components": [
		{
			"name": "App",
			"component_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:App",
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
			"name": "CountHost",
			"component_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:CountHost",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:CountHost#collection:0",
				"source_expression": "tiny",
				"row_parameter": "row",
				"requires_owner_render": true
			}],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "HostChild",
			"component_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:HostChild",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:HostChild#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Row",
			"component_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:0",
				"initial_value": "0"
			}, {
				"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:1",
				"initial_value": "row.label"
			}],
			"effect_sites": [{ "site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#numeric-sink:679",
				"source_sites": [".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Row#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": [".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#opaque-sink:764"]
		},
		{
			"name": "Rows",
			"component_site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Rows",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": ".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Rows#collection:0",
				"source_expression": "rows",
				"row_parameter": "row",
				"requires_owner_render": false
			}],
			"closedCollectionSites": [".cache/native-collection-execution-7f2fe1c6-b999-4380-aaa7-74a8ba25bd94/authored.tsx#component:Rows#collection:0"],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
