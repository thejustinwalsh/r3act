/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { jsx, createKeyedCollection } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, renderCollectionAt as __nativeRenderCollectionAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 1,
	sinkId: ".cache/native-collection-execution.tsx#numeric-sink:720",
	sourceSites: [".cache/native-collection-execution.tsx#component:Row#state:0"]
}];
__nativeDefineComponent(".cache/native-collection-execution.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-collection-execution.tsx#component:CountHost", CountHost, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-collection-execution.tsx#component:HostChild", HostChild, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent(".cache/native-collection-execution.tsx#component:Row", Row, { propOnlySites: [".cache/native-collection-execution.tsx#component:Row#state:0"] });
__nativeDefineComponent(".cache/native-collection-execution.tsx#component:Rows", Rows, { propOnlySites: [] });
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
	const [tick, setTick] = __nativeUseStateAt(".cache/native-collection-execution.tsx#component:Row#state:0", 0);
	const [draft, setDraft] = __nativeUseStateAt(".cache/native-collection-execution.tsx#component:Row#state:1", row.label);
	__nativeUseEffectAt(".cache/native-collection-execution.tsx#component:Row#effect:0", () => {
		trace.mounts++;
		return () => {
			trace.cleanups++;
		};
	});
	if (row.label === "BAD") throw new Error("row candidate failed");
	return /* @__PURE__ */ jsx("li", {
		"data-row": row.id,
		"data-tick": __nativeBindStatePropAt(".cache/native-collection-execution.tsx#component:Row#state:0", (tick) => tick, __nativeNumericPrograms[0])
	}, /* @__PURE__ */ jsx("button", { onClick: () => setTick((previous) => previous + 1) }, "Tick"), /* @__PURE__ */ jsx("input", {
		value: draft,
		onInput: (event) => setDraft(event.value)
	}), /* @__PURE__ */ jsx("span", null, row.label));
}
export function Rows() {
	return /* @__PURE__ */ jsx("ul", null, __nativeRenderCollectionAt(".cache/native-collection-execution.tsx#component:Rows#collection:0", rows, ((row) => /* @__PURE__ */ jsx(Row, {
		key: row.id,
		row
	}))));
}
export const tiny = createKeyedCollection([{
	id: "tinyA",
	label: "A"
}, {
	id: "tinyB",
	label: "B"
}], (row) => row.id);
export function HostChild({ id }) {
	const [value, setValue] = __nativeUseStateAt(".cache/native-collection-execution.tsx#component:HostChild#state:0", 0);
	return /* @__PURE__ */ jsx("button", {
		"data-child": id,
		onClick: () => setValue((previous) => previous + 1)
	}, value);
}
export function CountHost() {
	return /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("output", { "data-count": "yes" }, tiny.size, "v", tiny.version), /* @__PURE__ */ jsx("ul", null, __nativeRenderCollectionAt(".cache/native-collection-execution.tsx#component:CountHost#collection:0", tiny, ((row) => /* @__PURE__ */ jsx("li", { key: row.id }, /* @__PURE__ */ jsx(HostChild, { id: row.id }))), { requiresOwnerRender: true })));
}
export function App({ title = "initial" }) {
	return /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("h1", null, title), /* @__PURE__ */ jsx(Rows, null));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/native-collection-execution.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport {jsx,useState,useEffect,createKeyedCollection} from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 1, sinkId: \".cache/native-collection-execution.tsx#numeric-sink:720\", sourceSites: [\".cache/native-collection-execution.tsx#component:Row#state:0\"] }] as const;\n__nativeDefineComponent(\".cache/native-collection-execution.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-collection-execution.tsx#component:CountHost\", CountHost, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-collection-execution.tsx#component:HostChild\", HostChild, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\".cache/native-collection-execution.tsx#component:Row\", Row, { propOnlySites: [\".cache/native-collection-execution.tsx#component:Row#state:0\"] });\n__nativeDefineComponent(\".cache/native-collection-execution.tsx#component:Rows\", Rows, { propOnlySites: [] });\nexport const rows=createKeyedCollection(Array.from({length:1000},(_,i)=>({id:String(i),label:'Row '+i})),row=>row.id);\nexport const trace={renders:0,mounts:0,cleanups:0};\nexport function Row({row}:{row:{id:string,label:string}}){\n trace.renders++;\n const [tick,setTick]=__nativeUseStateAt(\".cache/native-collection-execution.tsx#component:Row#state:0\", 0);\n const [draft,setDraft]=__nativeUseStateAt(\".cache/native-collection-execution.tsx#component:Row#state:1\", row.label);\n __nativeUseEffectAt(\".cache/native-collection-execution.tsx#component:Row#effect:0\", ()=>{trace.mounts++;return ()=>{trace.cleanups++}});\n if(row.label==='BAD')throw new Error('row candidate failed');\n return <li data-row={row.id} data-tick={__nativeBindStatePropAt(\".cache/native-collection-execution.tsx#component:Row#state:0\", (tick) => (tick), __nativeNumericPrograms[0])}><button onClick={()=>setTick(previous=>previous+1)}>Tick</button><input value={draft} onInput={(event:any)=>setDraft(event.value)}/><span>{row.label}</span></li>;\n}\nexport function Rows(){return <ul>{__nativeRenderCollectionAt(\".cache/native-collection-execution.tsx#component:Rows#collection:0\", rows, (row=><Row key={row.id} row={row}/>))}</ul>;}\nexport const tiny=createKeyedCollection([{id:'tinyA',label:'A'},{id:'tinyB',label:'B'}],row=>row.id);\nexport function HostChild({id}:{id:string}){const [value,setValue]=__nativeUseStateAt(\".cache/native-collection-execution.tsx#component:HostChild#state:0\", 0);return <button data-child={id} onClick={()=>setValue(previous=>previous+1)}>{value}</button>;}\nexport function CountHost(){return <section><output data-count=\"yes\">{tiny.size}v{tiny.version}</output><ul>{__nativeRenderCollectionAt(\".cache/native-collection-execution.tsx#component:CountHost#collection:0\", tiny, (row=><li key={row.id}><HostChild id={row.id}/></li>), { requiresOwnerRender: true })}</ul></section>;}\nexport function App({title='initial'}:{title?:string}){return <section><h1>{title}</h1><Rows/></section>;}\n",
	"components": [
		{
			"name": "App",
			"component_site_id": ".cache/native-collection-execution.tsx#component:App",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "CountHost",
			"component_site_id": ".cache/native-collection-execution.tsx#component:CountHost",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": ".cache/native-collection-execution.tsx#component:CountHost#collection:0",
				"source_expression": "tiny",
				"row_parameter": "row",
				"requires_owner_render": true
			}]
		},
		{
			"name": "HostChild",
			"component_site_id": ".cache/native-collection-execution.tsx#component:HostChild",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": ".cache/native-collection-execution.tsx#component:HostChild#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "Row",
			"component_site_id": ".cache/native-collection-execution.tsx#component:Row",
			"prop_only_sites": [".cache/native-collection-execution.tsx#component:Row#state:0"],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/native-collection-execution.tsx#component:Row#state:0",
				"initial_value": "0"
			}, {
				"site_id": ".cache/native-collection-execution.tsx#component:Row#state:1",
				"initial_value": "row.label"
			}],
			"effect_sites": [{ "site_id": ".cache/native-collection-execution.tsx#component:Row#effect:0" }],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "Rows",
			"component_site_id": ".cache/native-collection-execution.tsx#component:Rows",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": ".cache/native-collection-execution.tsx#component:Rows#collection:0",
				"source_expression": "rows",
				"row_parameter": "row",
				"requires_owner_render": false
			}]
		}
	]
};
