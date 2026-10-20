import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/native-queue-execution.tsx",
	"module_revision": "native-v1-8bed6ea8539de10d",
	"owners": [
		{
			"site_id": ".cache/native-queue-execution.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/native-queue-execution.tsx#component:Badge",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/native-queue-execution.tsx#component:CollectionApp",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/native-queue-execution.tsx#component:CollectionRow",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": ".cache/native-queue-execution.tsx#component:App#state:0",
			"owner_site_id": ".cache/native-queue-execution.tsx#component:App",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": ".cache/native-queue-execution.tsx#component:App#state:1",
			"owner_site_id": ".cache/native-queue-execution.tsx#component:App",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": ".cache/native-queue-execution.tsx#component:App#store:0",
			"owner_site_id": ".cache/native-queue-execution.tsx#component:App",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/native-queue-execution.tsx#component:CollectionRow#state:0",
			"owner_site_id": ".cache/native-queue-execution.tsx#component:CollectionRow",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": ".cache/native-queue-execution.tsx#component:CollectionRow#state:1",
			"owner_site_id": ".cache/native-queue-execution.tsx#component:CollectionRow",
			"kind": "state",
			"provenance": "tracked"
		}
	],
	"sinks": [
		{
			"site_id": ".cache/native-queue-execution.tsx#numeric-sink:838",
			"owner_site_id": ".cache/native-queue-execution.tsx#component:App",
			"source_sites": [".cache/native-queue-execution.tsx#component:App#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		},
		{
			"site_id": ".cache/native-queue-execution.tsx#opaque-sink:926",
			"owner_site_id": ".cache/native-queue-execution.tsx#component:App",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		},
		{
			"site_id": ".cache/native-queue-execution.tsx#numeric-sink:1255",
			"owner_site_id": ".cache/native-queue-execution.tsx#component:CollectionRow",
			"source_sites": [".cache/native-queue-execution.tsx#component:CollectionRow#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		},
		{
			"site_id": ".cache/native-queue-execution.tsx#opaque-sink:1275",
			"owner_site_id": ".cache/native-queue-execution.tsx#component:CollectionRow",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}
	],
	"operations": [
		{
			"site_id": ".cache/native-queue-execution.tsx#component:App#store:0",
			"owner_site_id": ".cache/native-queue-execution.tsx#component:App",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/native-queue-execution.tsx#component:Badge#effect:0",
			"owner_site_id": ".cache/native-queue-execution.tsx#component:Badge",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/native-queue-execution.tsx#component:CollectionApp#collection:0",
			"owner_site_id": ".cache/native-queue-execution.tsx#component:CollectionApp",
			"kind": "collection",
			"provenance": "opaque",
			"source_sites": []
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {
			".cache/native-queue-execution.tsx#component:App#state:0": [".cache/native-queue-execution.tsx#numeric-sink:838"],
			".cache/native-queue-execution.tsx#component:CollectionRow#state:0": [".cache/native-queue-execution.tsx#numeric-sink:1255"]
		},
		"execution_order": [".cache/native-queue-execution.tsx#numeric-sink:838", ".cache/native-queue-execution.tsx#numeric-sink:1255"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === ".cache/native-queue-execution.tsx" && event.previousRevision === "native-v1-8bed6ea8539de10d" && event.previousInstance === "native-v1-8bed6ea8539de10d") __invalidateNativeSemanticPlan(".cache/native-queue-execution.tsx", "native-v1-8bed6ea8539de10d");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, createStoreSelector, createKeyedCollection } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: ".cache/native-queue-execution.tsx#component:App",
	sinkId: ".cache/native-queue-execution.tsx#numeric-sink:838",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: [".cache/native-queue-execution.tsx#component:App#state:0"]
}, {
	schemaVersion: 2,
	ownerProgramId: ".cache/native-queue-execution.tsx#component:CollectionRow",
	sinkId: ".cache/native-queue-execution.tsx#numeric-sink:1255",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: [".cache/native-queue-execution.tsx#component:CollectionRow#state:0"]
}];
__nativeDefineComponent(".cache/native-queue-execution.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-queue-execution.tsx#component:Badge", Badge, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent(".cache/native-queue-execution.tsx#component:CollectionApp", CollectionApp, {
	propOnlySites: [],
	closedCollectionSites: []
});
__nativeDefineComponent(".cache/native-queue-execution.tsx#component:CollectionRow", CollectionRow, {
	propOnlySites: [],
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
	return /* @__PURE__ */ React.createElement("span", null, "Ready");
}
export function App({ phase }) {
	const value = __nativeUseAt(".cache/native-queue-execution.tsx#component:App#store:0", total);
	const [position, setPosition] = __nativeUseStateAt(".cache/native-queue-execution.tsx#component:App#state:0", 5);
	const [draft, setDraft] = __nativeUseStateAt(".cache/native-queue-execution.tsx#component:App#state:1", "");
	return /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("button", {
		"data-move": "yes",
		"data-position": __nativeBindStatePropAt(".cache/native-queue-execution.tsx#component:App#state:0", (position) => position, __nativeNumericPrograms[0]),
		onClick: () => setPosition((n) => n + 1)
	}, "Move"), /* @__PURE__ */ React.createElement("input", {
		"data-draft": "yes",
		value: draft,
		onInput: (event) => setDraft(event.target.value)
	}), /* @__PURE__ */ React.createElement("output", { "data-total": "yes" }, value), /* @__PURE__ */ React.createElement(Badge, { key: phase }));
}
export function CollectionRow({ row }) {
	const [tick, setTick] = __nativeUseStateAt(".cache/native-queue-execution.tsx#component:CollectionRow#state:0", 0);
	const [draft, setDraft] = __nativeUseStateAt(".cache/native-queue-execution.tsx#component:CollectionRow#state:1", "");
	return /* @__PURE__ */ React.createElement("li", {
		"data-row": row.id,
		"data-tick": __nativeBindStatePropAt(".cache/native-queue-execution.tsx#component:CollectionRow#state:0", (tick) => tick, __nativeNumericPrograms[1])
	}, /* @__PURE__ */ React.createElement("input", {
		value: draft,
		onInput: (event) => setDraft(event.target.value)
	}), /* @__PURE__ */ React.createElement("button", { onClick: () => setTick((n) => n + 1) }, "Tick"));
}
export function CollectionApp() {
	return /* @__PURE__ */ React.createElement("ul", null, __nativeRenderCollectionAt(".cache/native-queue-execution.tsx#component:CollectionApp#collection:0", rows, ((row) => /* @__PURE__ */ React.createElement(CollectionRow, {
		key: row.id,
		row
	})), { requiresOwnerRender: true }));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-8bed6ea8539de10d",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/native-queue-execution.tsx",
		"module_revision": "native-v1-8bed6ea8539de10d",
		"owners": [
			{
				"site_id": ".cache/native-queue-execution.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/native-queue-execution.tsx#component:Badge",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/native-queue-execution.tsx#component:CollectionApp",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/native-queue-execution.tsx#component:CollectionRow",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": ".cache/native-queue-execution.tsx#component:App#state:0",
				"owner_site_id": ".cache/native-queue-execution.tsx#component:App",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": ".cache/native-queue-execution.tsx#component:App#state:1",
				"owner_site_id": ".cache/native-queue-execution.tsx#component:App",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": ".cache/native-queue-execution.tsx#component:App#store:0",
				"owner_site_id": ".cache/native-queue-execution.tsx#component:App",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/native-queue-execution.tsx#component:CollectionRow#state:0",
				"owner_site_id": ".cache/native-queue-execution.tsx#component:CollectionRow",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": ".cache/native-queue-execution.tsx#component:CollectionRow#state:1",
				"owner_site_id": ".cache/native-queue-execution.tsx#component:CollectionRow",
				"kind": "state",
				"provenance": "tracked"
			}
		],
		"sinks": [
			{
				"site_id": ".cache/native-queue-execution.tsx#numeric-sink:838",
				"owner_site_id": ".cache/native-queue-execution.tsx#component:App",
				"source_sites": [".cache/native-queue-execution.tsx#component:App#state:0"],
				"provenance": "closed",
				"equality": "object-is",
				"host_value": "scalar",
				"retention": "value",
				"execution": "compiled-binding"
			},
			{
				"site_id": ".cache/native-queue-execution.tsx#opaque-sink:926",
				"owner_site_id": ".cache/native-queue-execution.tsx#component:App",
				"source_sites": [],
				"provenance": "opaque",
				"equality": "adapter-declared",
				"host_value": "adapter-declared",
				"retention": "adapter-declared",
				"execution": "generic"
			},
			{
				"site_id": ".cache/native-queue-execution.tsx#numeric-sink:1255",
				"owner_site_id": ".cache/native-queue-execution.tsx#component:CollectionRow",
				"source_sites": [".cache/native-queue-execution.tsx#component:CollectionRow#state:0"],
				"provenance": "closed",
				"equality": "object-is",
				"host_value": "scalar",
				"retention": "value",
				"execution": "compiled-binding"
			},
			{
				"site_id": ".cache/native-queue-execution.tsx#opaque-sink:1275",
				"owner_site_id": ".cache/native-queue-execution.tsx#component:CollectionRow",
				"source_sites": [],
				"provenance": "opaque",
				"equality": "adapter-declared",
				"host_value": "adapter-declared",
				"retention": "adapter-declared",
				"execution": "generic"
			}
		],
		"operations": [
			{
				"site_id": ".cache/native-queue-execution.tsx#component:App#store:0",
				"owner_site_id": ".cache/native-queue-execution.tsx#component:App",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/native-queue-execution.tsx#component:Badge#effect:0",
				"owner_site_id": ".cache/native-queue-execution.tsx#component:Badge",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/native-queue-execution.tsx#component:CollectionApp#collection:0",
				"owner_site_id": ".cache/native-queue-execution.tsx#component:CollectionApp",
				"kind": "collection",
				"provenance": "opaque",
				"source_sites": []
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {
				".cache/native-queue-execution.tsx#component:App#state:0": [".cache/native-queue-execution.tsx#numeric-sink:838"],
				".cache/native-queue-execution.tsx#component:CollectionRow#state:0": [".cache/native-queue-execution.tsx#numeric-sink:1255"]
			},
			"execution_order": [".cache/native-queue-execution.tsx#numeric-sink:838", ".cache/native-queue-execution.tsx#numeric-sink:1255"]
		}
	},
	"source_file": ".cache/native-queue-execution.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport {use,useState,useEffect,createStore,createStoreSelector,createKeyedCollection,jsx} from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \".cache/native-queue-execution.tsx#component:App\", sinkId: \".cache/native-queue-execution.tsx#numeric-sink:838\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\".cache/native-queue-execution.tsx#component:App#state:0\"] }, { schemaVersion: 2, ownerProgramId: \".cache/native-queue-execution.tsx#component:CollectionRow\", sinkId: \".cache/native-queue-execution.tsx#numeric-sink:1255\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\".cache/native-queue-execution.tsx#component:CollectionRow#state:0\"] }] as const;\n__nativeDefineComponent(\".cache/native-queue-execution.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-queue-execution.tsx#component:Badge\", Badge, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\".cache/native-queue-execution.tsx#component:CollectionApp\", CollectionApp, { propOnlySites: [], closedCollectionSites: [] });\n__nativeDefineComponent(\".cache/native-queue-execution.tsx#component:CollectionRow\", CollectionRow, { propOnlySites: [], hostLeafOutput: true });\nexport const a=createStore(1,(s:number,n:number)=>s+n);\nexport const b=createStore(10,(s:number,n:number)=>s+n);\nexport const total=createStoreSelector([a,b],([a,b])=>Number(a)+Number(b));\nexport const rows=createKeyedCollection([{id:'a'},{id:'b'}],row=>row.id);\nexport let activeEffects=0;\nexport function Badge(){\n __nativeUseEffectAt(\".cache/native-queue-execution.tsx#component:Badge#effect:0\", ()=>{activeEffects++;return ()=>{activeEffects--;};});\n return <span>Ready</span>;\n}\nexport function App({phase}:{phase:string}){\n const value=__nativeUseAt(\".cache/native-queue-execution.tsx#component:App#store:0\", total);\n const [position,setPosition]=__nativeUseStateAt(\".cache/native-queue-execution.tsx#component:App#state:0\", 5);\n const [draft,setDraft]=__nativeUseStateAt(\".cache/native-queue-execution.tsx#component:App#state:1\", '');\n return <section><button data-move=\"yes\" data-position={__nativeBindStatePropAt(\".cache/native-queue-execution.tsx#component:App#state:0\", (position) => (position), __nativeNumericPrograms[0])} onClick={()=>setPosition(n=>n+1)}>Move</button><input data-draft=\"yes\" value={draft} onInput={(event:Event)=>setDraft((event.target as HTMLInputElement).value)}/><output data-total=\"yes\">{value}</output><Badge key={phase}/></section>;\n}\nexport function CollectionRow({row}:{row:{id:string}}){\n const [tick,setTick]=__nativeUseStateAt(\".cache/native-queue-execution.tsx#component:CollectionRow#state:0\", 0);\n const [draft,setDraft]=__nativeUseStateAt(\".cache/native-queue-execution.tsx#component:CollectionRow#state:1\", '');\n return <li data-row={row.id} data-tick={__nativeBindStatePropAt(\".cache/native-queue-execution.tsx#component:CollectionRow#state:0\", (tick) => (tick), __nativeNumericPrograms[1])}><input value={draft} onInput={(event:Event)=>setDraft((event.target as HTMLInputElement).value)}/><button onClick={()=>setTick(n=>n+1)}>Tick</button></li>;\n}\nexport function CollectionApp(){return <ul>{__nativeRenderCollectionAt(\".cache/native-queue-execution.tsx#component:CollectionApp#collection:0\", rows, (row=><CollectionRow key={row.id} row={row}/>), { requiresOwnerRender: true })}</ul>;}\n",
	"components": [
		{
			"name": "App",
			"component_site_id": ".cache/native-queue-execution.tsx#component:App",
			"prop_only_sites": [],
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
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": ".cache/native-queue-execution.tsx#numeric-sink:838",
				"source_sites": [".cache/native-queue-execution.tsx#component:App#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": [".cache/native-queue-execution.tsx#opaque-sink:926"]
		},
		{
			"name": "Badge",
			"component_site_id": ".cache/native-queue-execution.tsx#component:Badge",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [],
			"effect_sites": [{ "site_id": ".cache/native-queue-execution.tsx#component:Badge#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
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
				"requires_owner_render": true
			}],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "CollectionRow",
			"component_site_id": ".cache/native-queue-execution.tsx#component:CollectionRow",
			"prop_only_sites": [],
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
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": ".cache/native-queue-execution.tsx#numeric-sink:1255",
				"source_sites": [".cache/native-queue-execution.tsx#component:CollectionRow#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": [".cache/native-queue-execution.tsx#opaque-sink:1275"]
		}
	]
};
