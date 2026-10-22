import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/native-task-transition.tsx",
	"module_revision": "native-v1-fe84e9b98adc5a3e",
	"owners": [
		{
			"site_id": ".cache/native-task-transition.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/native-task-transition.tsx#component:Model",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/native-task-transition.tsx#component:SearchFirst",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": ".cache/native-task-transition.tsx#component:App#state:0",
			"owner_site_id": ".cache/native-task-transition.tsx#component:App",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": ".cache/native-task-transition.tsx#component:App#state:1",
			"owner_site_id": ".cache/native-task-transition.tsx#component:App",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": ".cache/native-task-transition.tsx#component:Model#store:0",
			"owner_site_id": ".cache/native-task-transition.tsx#component:Model",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/native-task-transition.tsx#component:SearchFirst#store:0",
			"owner_site_id": ".cache/native-task-transition.tsx#component:SearchFirst",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [{
		"site_id": ".cache/native-task-transition.tsx#numeric-sink:1522",
		"owner_site_id": ".cache/native-task-transition.tsx#component:App",
		"source_sites": [".cache/native-task-transition.tsx#component:App#state:1"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}, {
		"site_id": ".cache/native-task-transition.tsx#opaque-sink:1399",
		"owner_site_id": ".cache/native-task-transition.tsx#component:App",
		"source_sites": [],
		"provenance": "opaque",
		"equality": "adapter-declared",
		"host_value": "adapter-declared",
		"retention": "adapter-declared",
		"execution": "generic"
	}],
	"operations": [
		{
			"site_id": ".cache/native-task-transition.tsx#component:Model#store:0",
			"owner_site_id": ".cache/native-task-transition.tsx#component:Model",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/native-task-transition.tsx#component:SearchFirst#store:0",
			"owner_site_id": ".cache/native-task-transition.tsx#component:SearchFirst",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/native-task-transition.tsx#async-task:search",
			"owner_site_id": null,
			"kind": "async-task",
			"provenance": "opaque",
			"source_sites": ["$query"]
		},
		{
			"site_id": ".cache/native-task-transition.tsx#async-task:catalog",
			"owner_site_id": null,
			"kind": "async-task",
			"provenance": "opaque",
			"source_sites": ["$request"]
		},
		{
			"site_id": ".cache/native-task-transition.tsx#async-task:panel",
			"owner_site_id": null,
			"kind": "async-task",
			"provenance": "opaque",
			"source_sites": ["catalog", "search"]
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": { ".cache/native-task-transition.tsx#component:App#state:1": [".cache/native-task-transition.tsx#numeric-sink:1522"] },
		"execution_order": [
			".cache/native-task-transition.tsx#numeric-sink:1522",
			".cache/native-task-transition.tsx#async-task:search",
			".cache/native-task-transition.tsx#async-task:catalog",
			".cache/native-task-transition.tsx#async-task:panel"
		]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === ".cache/native-task-transition.tsx" && event.previousRevision === "native-v1-fe84e9b98adc5a3e" && event.previousInstance === "native-v1-fe84e9b98adc5a3e") __invalidateNativeSemanticPlan(".cache/native-task-transition.tsx", "native-v1-fe84e9b98adc5a3e");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { asyncTask, createStore, Suspense, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: ".cache/native-task-transition.tsx#component:App",
	sinkId: ".cache/native-task-transition.tsx#numeric-sink:1522",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: [".cache/native-task-transition.tsx#component:App#state:1"]
}];
__nativeDefineComponent(".cache/native-task-transition.tsx#component:App", App, { propOnlySites: [] });
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
	"module_revision": "native-v1-fe84e9b98adc5a3e",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/native-task-transition.tsx",
		"module_revision": "native-v1-fe84e9b98adc5a3e",
		"owners": [
			{
				"site_id": ".cache/native-task-transition.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/native-task-transition.tsx#component:Model",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/native-task-transition.tsx#component:SearchFirst",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": ".cache/native-task-transition.tsx#component:App#state:0",
				"owner_site_id": ".cache/native-task-transition.tsx#component:App",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": ".cache/native-task-transition.tsx#component:App#state:1",
				"owner_site_id": ".cache/native-task-transition.tsx#component:App",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": ".cache/native-task-transition.tsx#component:Model#store:0",
				"owner_site_id": ".cache/native-task-transition.tsx#component:Model",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/native-task-transition.tsx#component:SearchFirst#store:0",
				"owner_site_id": ".cache/native-task-transition.tsx#component:SearchFirst",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [{
			"site_id": ".cache/native-task-transition.tsx#numeric-sink:1522",
			"owner_site_id": ".cache/native-task-transition.tsx#component:App",
			"source_sites": [".cache/native-task-transition.tsx#component:App#state:1"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}, {
			"site_id": ".cache/native-task-transition.tsx#opaque-sink:1399",
			"owner_site_id": ".cache/native-task-transition.tsx#component:App",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}],
		"operations": [
			{
				"site_id": ".cache/native-task-transition.tsx#component:Model#store:0",
				"owner_site_id": ".cache/native-task-transition.tsx#component:Model",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/native-task-transition.tsx#component:SearchFirst#store:0",
				"owner_site_id": ".cache/native-task-transition.tsx#component:SearchFirst",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/native-task-transition.tsx#async-task:search",
				"owner_site_id": null,
				"kind": "async-task",
				"provenance": "opaque",
				"source_sites": ["$query"]
			},
			{
				"site_id": ".cache/native-task-transition.tsx#async-task:catalog",
				"owner_site_id": null,
				"kind": "async-task",
				"provenance": "opaque",
				"source_sites": ["$request"]
			},
			{
				"site_id": ".cache/native-task-transition.tsx#async-task:panel",
				"owner_site_id": null,
				"kind": "async-task",
				"provenance": "opaque",
				"source_sites": ["catalog", "search"]
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": { ".cache/native-task-transition.tsx#component:App#state:1": [".cache/native-task-transition.tsx#numeric-sink:1522"] },
			"execution_order": [
				".cache/native-task-transition.tsx#numeric-sink:1522",
				".cache/native-task-transition.tsx#async-task:search",
				".cache/native-task-transition.tsx#async-task:catalog",
				".cache/native-task-transition.tsx#async-task:panel"
			]
		}
	},
	"source_file": ".cache/native-task-transition.tsx",
	"helper_module": "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts",
	"tasks": [
		{
			"id": "search",
			"site_id": ".cache/native-task-transition.tsx#async-task:search",
			"depends_on": ["$query"],
			"span": {
				"start": 485,
				"end": 646
			}
		},
		{
			"id": "catalog",
			"site_id": ".cache/native-task-transition.tsx#async-task:catalog",
			"depends_on": ["$request"],
			"span": {
				"start": 649,
				"end": 788
			}
		},
		{
			"id": "panel",
			"site_id": ".cache/native-task-transition.tsx#async-task:panel",
			"depends_on": ["catalog", "search"],
			"span": {
				"start": 791,
				"end": 902
			}
		}
	],
	"task_order": [
		0,
		1,
		2
	],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport {asyncTask,createStore,use,useState,Suspense,jsx} from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \".cache/native-task-transition.tsx#component:App\", sinkId: \".cache/native-task-transition.tsx#numeric-sink:1522\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\".cache/native-task-transition.tsx#component:App#state:1\"] }] as const;\n__nativeDefineComponent(\".cache/native-task-transition.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-task-transition.tsx#component:Model\", Model, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-task-transition.tsx#component:SearchFirst\", SearchFirst, { propOnlySites: [] });\nexport const query=createStore('old');\nexport const old=deferred<string>();\nexport const fresh=deferred<string>();\nexport const starts:string[]=[];\nexport function deferred<T>(){let resolve!:(v:T)=>void;const promise=new Promise<T>(yes=>resolve=yes);return {promise,resolve};}\nexport const tasks=[\n asyncTask('search',async(values,signal)=>{const value=String(values.get('$query'));starts.push('search:'+value);return value==='old'?old.promise:fresh.promise;}),\n asyncTask('catalog',async(values)=>{const request=values.get('$request') as {locale:string};starts.push('catalog');return request.locale;}),\n asyncTask('panel',async(values)=>({search:String(values.get('search')),catalog:String(values.get('catalog'))})),\n] as const;\nexport function Model({resource}:{resource:any}){const model=__nativeUseAt(\".cache/native-task-transition.tsx#component:Model#store:0\", resource) as {search:string,catalog:string};return <output data-model=\"yes\">{model.search}:{model.catalog}</output>;}\nexport function SearchFirst({search,model}:{search:any,model:any}){__nativeUseAt(\".cache/native-task-transition.tsx#component:SearchFirst#store:0\", search);return <Model resource={model}/>;}\nexport function App({search,model}:{search:any,model:any}){\n const [draft,setDraft]=__nativeUseStateAt(\".cache/native-task-transition.tsx#component:App#state:0\", '');const[position,setPosition]=__nativeUseStateAt(\".cache/native-task-transition.tsx#component:App#state:1\", 5);\n return <section><input data-draft=\"yes\" value={draft} onInput={(event:Event)=>setDraft((event.target as HTMLInputElement).value)}/><button data-move=\"yes\" data-position={__nativeBindStatePropAt(\".cache/native-task-transition.tsx#component:App#state:1\", (position) => (position), __nativeNumericPrograms[0])} onClick={()=>setPosition(n=>n+1)}>Move</button><Suspense fallback={<p>waiting</p>} __nativeBoundarySite=\".cache/native-task-transition.tsx#boundary:0\"><SearchFirst search={search} model={model}/></Suspense></section>;\n}\n",
	"components": [
		{
			"name": "App",
			"component_site_id": ".cache/native-task-transition.tsx#component:App",
			"prop_only_sites": [],
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
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": ".cache/native-task-transition.tsx#numeric-sink:1522",
				"source_sites": [".cache/native-task-transition.tsx#component:App#state:1"],
				"primitive_value": true
			}],
			"opaque_sinks": [".cache/native-task-transition.tsx#opaque-sink:1399"]
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
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
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
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
