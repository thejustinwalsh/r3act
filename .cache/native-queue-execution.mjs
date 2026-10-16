/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, createStoreSelector, createKeyedCollection, jsx } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 1,
	sinkId: ".cache/native-queue-execution.tsx#numeric-sink:879",
	sourceSites: [".cache/native-queue-execution.tsx#component:App#state:0"]
}, {
	schemaVersion: 1,
	sinkId: ".cache/native-queue-execution.tsx#numeric-sink:1296",
	sourceSites: [".cache/native-queue-execution.tsx#component:CollectionRow#state:0"]
}];
__nativeDefineComponent(".cache/native-queue-execution.tsx#component:App", App, { propOnlySites: [".cache/native-queue-execution.tsx#component:App#state:0"] });
__nativeDefineComponent(".cache/native-queue-execution.tsx#component:Badge", Badge, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent(".cache/native-queue-execution.tsx#component:CollectionApp", CollectionApp, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-queue-execution.tsx#component:CollectionRow", CollectionRow, {
	propOnlySites: [".cache/native-queue-execution.tsx#component:CollectionRow#state:0"],
	hostLeafOutput: true
});
export const a = createStore(1, (s, n) => s + n);
export const b = createStore(10, (s, n) => s + n);
export const total = createStoreSelector([a, b], ([a, b]) => Number(a) + Number(b));
export const rows = createKeyedCollection([{ id: "a" }, { id: "b" }], (row) => row.id);
export let activeEffects = 0;
export function Badge() {
	__nativeUseEffectAt(".cache/native-queue-execution.tsx#component:Badge#effect:0", () => {
		activeEffects++;
		return () => {
			activeEffects--;
		};
	});
	return /* @__PURE__ */ jsx("span", null, "Ready");
}
export function App({ phase }) {
	const value = __nativeUseAt(".cache/native-queue-execution.tsx#component:App#store:0", total);
	const [position, setPosition] = __nativeUseStateAt(".cache/native-queue-execution.tsx#component:App#state:0", 5);
	const [draft, setDraft] = __nativeUseStateAt(".cache/native-queue-execution.tsx#component:App#state:1", "");
	return /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("button", {
		"data-move": "yes",
		"data-position": __nativeBindStatePropAt(".cache/native-queue-execution.tsx#component:App#state:0", (position) => position, __nativeNumericPrograms[0]),
		onClick: () => setPosition((n) => n + 1)
	}, "Move"), /* @__PURE__ */ jsx("input", {
		"data-draft": "yes",
		value: draft,
		onInput: (event) => setDraft(event.target.value)
	}), /* @__PURE__ */ jsx("output", { "data-total": "yes" }, value), /* @__PURE__ */ jsx(Badge, { key: phase }));
}
export function CollectionRow({ row }) {
	const [tick, setTick] = __nativeUseStateAt(".cache/native-queue-execution.tsx#component:CollectionRow#state:0", 0);
	const [draft, setDraft] = __nativeUseStateAt(".cache/native-queue-execution.tsx#component:CollectionRow#state:1", "");
	return /* @__PURE__ */ jsx("li", {
		"data-row": row.id,
		"data-tick": __nativeBindStatePropAt(".cache/native-queue-execution.tsx#component:CollectionRow#state:0", (tick) => tick, __nativeNumericPrograms[1])
	}, /* @__PURE__ */ jsx("input", {
		value: draft,
		onInput: (event) => setDraft(event.target.value)
	}), /* @__PURE__ */ jsx("button", { onClick: () => setTick((n) => n + 1) }, "Tick"));
}
export function CollectionApp() {
	return /* @__PURE__ */ jsx("ul", null, __nativeRenderCollectionAt(".cache/native-queue-execution.tsx#component:CollectionApp#collection:0", rows, ((row) => /* @__PURE__ */ jsx(CollectionRow, {
		key: row.id,
		row
	}))));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/native-queue-execution.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport {use,useState,useEffect,createStore,createStoreSelector,createKeyedCollection,jsx} from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 1, sinkId: \".cache/native-queue-execution.tsx#numeric-sink:879\", sourceSites: [\".cache/native-queue-execution.tsx#component:App#state:0\"] }, { schemaVersion: 1, sinkId: \".cache/native-queue-execution.tsx#numeric-sink:1296\", sourceSites: [\".cache/native-queue-execution.tsx#component:CollectionRow#state:0\"] }] as const;\n__nativeDefineComponent(\".cache/native-queue-execution.tsx#component:App\", App, { propOnlySites: [\".cache/native-queue-execution.tsx#component:App#state:0\"] });\n__nativeDefineComponent(\".cache/native-queue-execution.tsx#component:Badge\", Badge, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\".cache/native-queue-execution.tsx#component:CollectionApp\", CollectionApp, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-queue-execution.tsx#component:CollectionRow\", CollectionRow, { propOnlySites: [\".cache/native-queue-execution.tsx#component:CollectionRow#state:0\"], hostLeafOutput: true });\nexport const a=createStore(1,(s:number,n:number)=>s+n);\nexport const b=createStore(10,(s:number,n:number)=>s+n);\nexport const total=createStoreSelector([a,b],([a,b])=>Number(a)+Number(b));\nexport const rows=createKeyedCollection([{id:'a'},{id:'b'}],row=>row.id);\nexport let activeEffects=0;\nexport function Badge(){\n __nativeUseEffectAt(\".cache/native-queue-execution.tsx#component:Badge#effect:0\", ()=>{activeEffects++;return ()=>{activeEffects--;};});\n return <span>Ready</span>;\n}\nexport function App({phase}:{phase:string}){\n const value=__nativeUseAt(\".cache/native-queue-execution.tsx#component:App#store:0\", total);\n const [position,setPosition]=__nativeUseStateAt(\".cache/native-queue-execution.tsx#component:App#state:0\", 5);\n const [draft,setDraft]=__nativeUseStateAt(\".cache/native-queue-execution.tsx#component:App#state:1\", '');\n return <section><button data-move=\"yes\" data-position={__nativeBindStatePropAt(\".cache/native-queue-execution.tsx#component:App#state:0\", (position) => (position), __nativeNumericPrograms[0])} onClick={()=>setPosition(n=>n+1)}>Move</button><input data-draft=\"yes\" value={draft} onInput={(event:Event)=>setDraft((event.target as HTMLInputElement).value)}/><output data-total=\"yes\">{value}</output><Badge key={phase}/></section>;\n}\nexport function CollectionRow({row}:{row:{id:string}}){\n const [tick,setTick]=__nativeUseStateAt(\".cache/native-queue-execution.tsx#component:CollectionRow#state:0\", 0);\n const [draft,setDraft]=__nativeUseStateAt(\".cache/native-queue-execution.tsx#component:CollectionRow#state:1\", '');\n return <li data-row={row.id} data-tick={__nativeBindStatePropAt(\".cache/native-queue-execution.tsx#component:CollectionRow#state:0\", (tick) => (tick), __nativeNumericPrograms[1])}><input value={draft} onInput={(event:Event)=>setDraft((event.target as HTMLInputElement).value)}/><button onClick={()=>setTick(n=>n+1)}>Tick</button></li>;\n}\nexport function CollectionApp(){return <ul>{__nativeRenderCollectionAt(\".cache/native-queue-execution.tsx#component:CollectionApp#collection:0\", rows, (row=><CollectionRow key={row.id} row={row}/>))}</ul>;}\n",
	"components": [
		{
			"name": "App",
			"component_site_id": ".cache/native-queue-execution.tsx#component:App",
			"prop_only_sites": [".cache/native-queue-execution.tsx#component:App#state:0"],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/native-queue-execution.tsx#component:App#state:0",
				"initial_value": "5"
			}, {
				"site_id": ".cache/native-queue-execution.tsx#component:App#state:1",
				"initial_value": "''"
			}],
			"effect_sites": [],
			"store_sites": [{
				"site_id": ".cache/native-queue-execution.tsx#component:App#store:0",
				"source_expression": "total"
			}],
			"collection_sites": []
		},
		{
			"name": "Badge",
			"component_site_id": ".cache/native-queue-execution.tsx#component:Badge",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [],
			"effect_sites": [{ "site_id": ".cache/native-queue-execution.tsx#component:Badge#effect:0" }],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "CollectionApp",
			"component_site_id": ".cache/native-queue-execution.tsx#component:CollectionApp",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": ".cache/native-queue-execution.tsx#component:CollectionApp#collection:0",
				"source_expression": "rows",
				"row_parameter": "row",
				"requires_owner_render": false
			}]
		},
		{
			"name": "CollectionRow",
			"component_site_id": ".cache/native-queue-execution.tsx#component:CollectionRow",
			"prop_only_sites": [".cache/native-queue-execution.tsx#component:CollectionRow#state:0"],
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": ".cache/native-queue-execution.tsx#component:CollectionRow#state:0",
				"initial_value": "0"
			}, {
				"site_id": ".cache/native-queue-execution.tsx#component:CollectionRow#state:1",
				"initial_value": "''"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		}
	]
};
