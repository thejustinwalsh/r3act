/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { asyncTask, createStore, Suspense, jsx } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 1,
	sinkId: ".cache/native-task-transition.tsx#numeric-sink:1563",
	sourceSites: [".cache/native-task-transition.tsx#component:App#state:1"]
}];
__nativeDefineComponent(".cache/native-task-transition.tsx#component:App", App, { propOnlySites: [".cache/native-task-transition.tsx#component:App#state:1"] });
__nativeDefineComponent(".cache/native-task-transition.tsx#component:Model", Model, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-task-transition.tsx#component:SearchFirst", SearchFirst, { propOnlySites: [] });
export const query = createStore("old");
export const old = deferred();
export const fresh = deferred();
export const starts = [];
export function deferred() {
	let resolve;
	const promise = new Promise((yes) => resolve = yes);
	return {
		promise,
		resolve
	};
}
export const tasks = [
	asyncTask("search", ["$query"], async (values, signal) => {
		const value = String(values.get("$query"));
		starts.push("search:" + value);
		return value === "old" ? old.promise : fresh.promise;
	}),
	asyncTask("catalog", ["$request"], async (values) => {
		const request = values.get("$request");
		starts.push("catalog");
		return request.locale;
	}),
	asyncTask("panel", ["catalog", "search"], async (values) => ({
		search: String(values.get("search")),
		catalog: String(values.get("catalog"))
	}))
];
export function Model({ resource }) {
	const model = __nativeUseAt(".cache/native-task-transition.tsx#component:Model#store:0", resource);
	return /* @__PURE__ */ jsx("output", { "data-model": "yes" }, model.search, ":", model.catalog);
}
export function SearchFirst({ search, model }) {
	__nativeUseAt(".cache/native-task-transition.tsx#component:SearchFirst#store:0", search);
	return /* @__PURE__ */ jsx(Model, { resource: model });
}
export function App({ search, model }) {
	const [draft, setDraft] = __nativeUseStateAt(".cache/native-task-transition.tsx#component:App#state:0", "");
	const [position, setPosition] = __nativeUseStateAt(".cache/native-task-transition.tsx#component:App#state:1", 5);
	return /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("input", {
		"data-draft": "yes",
		value: draft,
		onInput: (event) => setDraft(event.target.value)
	}), /* @__PURE__ */ jsx("button", {
		"data-move": "yes",
		"data-position": __nativeBindStatePropAt(".cache/native-task-transition.tsx#component:App#state:1", (position) => position, __nativeNumericPrograms[0]),
		onClick: () => setPosition((n) => n + 1)
	}, "Move"), /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx("p", null, "waiting"),
		__nativeBoundarySite: ".cache/native-task-transition.tsx#boundary:0"
	}, /* @__PURE__ */ jsx(SearchFirst, {
		search,
		model
	})));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/native-task-transition.tsx",
	"helper_module": "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts",
	"tasks": [
		{
			"id": "search",
			"site_id": ".cache/native-task-transition.tsx#async-task:search",
			"depends_on": ["$query"],
			"span": {
				"start": 526,
				"end": 687
			}
		},
		{
			"id": "catalog",
			"site_id": ".cache/native-task-transition.tsx#async-task:catalog",
			"depends_on": ["$request"],
			"span": {
				"start": 690,
				"end": 829
			}
		},
		{
			"id": "panel",
			"site_id": ".cache/native-task-transition.tsx#async-task:panel",
			"depends_on": ["catalog", "search"],
			"span": {
				"start": 832,
				"end": 943
			}
		}
	],
	"task_order": [
		0,
		1,
		2
	],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport {asyncTask,createStore,use,useState,Suspense,jsx} from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 1, sinkId: \".cache/native-task-transition.tsx#numeric-sink:1563\", sourceSites: [\".cache/native-task-transition.tsx#component:App#state:1\"] }] as const;\n__nativeDefineComponent(\".cache/native-task-transition.tsx#component:App\", App, { propOnlySites: [\".cache/native-task-transition.tsx#component:App#state:1\"] });\n__nativeDefineComponent(\".cache/native-task-transition.tsx#component:Model\", Model, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-task-transition.tsx#component:SearchFirst\", SearchFirst, { propOnlySites: [] });\nexport const query=createStore('old');\nexport const old=deferred<string>();\nexport const fresh=deferred<string>();\nexport const starts:string[]=[];\nexport function deferred<T>(){let resolve!:(v:T)=>void;const promise=new Promise<T>(yes=>resolve=yes);return {promise,resolve};}\nexport const tasks=[\n asyncTask('search',async(values,signal)=>{const value=String(values.get('$query'));starts.push('search:'+value);return value==='old'?old.promise:fresh.promise;}),\n asyncTask('catalog',async(values)=>{const request=values.get('$request') as {locale:string};starts.push('catalog');return request.locale;}),\n asyncTask('panel',async(values)=>({search:String(values.get('search')),catalog:String(values.get('catalog'))})),\n] as const;\nexport function Model({resource}:{resource:any}){const model=__nativeUseAt(\".cache/native-task-transition.tsx#component:Model#store:0\", resource) as {search:string,catalog:string};return <output data-model=\"yes\">{model.search}:{model.catalog}</output>;}\nexport function SearchFirst({search,model}:{search:any,model:any}){__nativeUseAt(\".cache/native-task-transition.tsx#component:SearchFirst#store:0\", search);return <Model resource={model}/>;}\nexport function App({search,model}:{search:any,model:any}){\n const [draft,setDraft]=__nativeUseStateAt(\".cache/native-task-transition.tsx#component:App#state:0\", '');const[position,setPosition]=__nativeUseStateAt(\".cache/native-task-transition.tsx#component:App#state:1\", 5);\n return <section><input data-draft=\"yes\" value={draft} onInput={(event:Event)=>setDraft((event.target as HTMLInputElement).value)}/><button data-move=\"yes\" data-position={__nativeBindStatePropAt(\".cache/native-task-transition.tsx#component:App#state:1\", (position) => (position), __nativeNumericPrograms[0])} onClick={()=>setPosition(n=>n+1)}>Move</button><Suspense fallback={<p>waiting</p>} __nativeBoundarySite=\".cache/native-task-transition.tsx#boundary:0\"><SearchFirst search={search} model={model}/></Suspense></section>;\n}\n",
	"components": [
		{
			"name": "App",
			"component_site_id": ".cache/native-task-transition.tsx#component:App",
			"prop_only_sites": [".cache/native-task-transition.tsx#component:App#state:1"],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/native-task-transition.tsx#component:App#state:0",
				"initial_value": "''"
			}, {
				"site_id": ".cache/native-task-transition.tsx#component:App#state:1",
				"initial_value": "5"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "Model",
			"component_site_id": ".cache/native-task-transition.tsx#component:Model",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": ".cache/native-task-transition.tsx#component:Model#store:0",
				"source_expression": "resource"
			}],
			"collection_sites": []
		},
		{
			"name": "SearchFirst",
			"component_site_id": ".cache/native-task-transition.tsx#component:SearchFirst",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": ".cache/native-task-transition.tsx#component:SearchFirst#store:0",
				"source_expression": "search"
			}],
			"collection_sites": []
		}
	]
};
