import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx",
	"module_revision": "native-v1-384b2d23c32c3833",
	"owners": [
		{
			"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Candidate",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Warm",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmA",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmB",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#state:0",
			"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#state:1",
			"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#store:0",
			"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#store:1",
			"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmA#store:0",
			"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmA",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmB#store:0",
			"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmB",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [{
		"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#opaque-sink:1198",
		"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
		"source_sites": [],
		"provenance": "opaque",
		"equality": "adapter-declared",
		"host_value": "adapter-declared",
		"retention": "adapter-declared",
		"execution": "generic"
	}],
	"operations": [
		{
			"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#store:0",
			"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#store:1",
			"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#effect:0",
			"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmA#store:0",
			"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmA",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmB#store:0",
			"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmB",
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
		if (event?.sourceFile === ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx" && event.previousRevision === "native-v1-384b2d23c32c3833" && event.previousInstance === "native-v1-384b2d23c32c3833") __invalidateNativeSemanticPlan(".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx", "native-v1-384b2d23c32c3833");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { Suspense, createStore, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useAt as __nativeUseAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Candidate", Candidate, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child", Child, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Warm", Warm, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmA", WarmA, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmB", WarmB, { propOnlySites: [] });
export const first = deferred();
export const second = deferred();
export const warmOther = deferred();
export const rejected = deferred();
export const replacement = deferred();
export const candidatePending = deferred();
export const resourceStore = createStore(first.promise, (_state, next) => next);
export let activeEffects = 0;
export let effectSetups = 0;
export let effectCleanups = 0;
export function deferred() {
	let resolve;
	let reject;
	const promise = new Promise((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return {
		promise,
		resolve,
		reject
	};
}
export function Child({ name }) {
	const value = __nativeUseAt(".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#store:0", __nativeUseAt(".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#store:1", resourceStore));
	const [count, setCount] = __nativeUseStateAt(".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#state:0", 0);
	const [draft, setDraft] = __nativeUseStateAt(".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#state:1", "");
	__nativeUseEffectAt(".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#effect:0", () => {
		activeEffects++;
		effectSetups++;
		return () => {
			activeEffects--;
			effectCleanups++;
		};
	});
	return /* @__PURE__ */ jsx("article", { "data-child": name }, /* @__PURE__ */ jsx("button", {
		"data-count": name,
		onClick: () => setCount((n) => n + 1)
	}, count), /* @__PURE__ */ jsx("input", {
		"data-draft": name,
		value: draft,
		onInput: (event) => setDraft(event.target.value)
	}), /* @__PURE__ */ jsx("output", null, name, ":", value));
}
export function App() {
	return /* @__PURE__ */ jsx("main", null, /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx("p", { "data-fallback": "left" }, "left waiting"),
		error: (reason) => /* @__PURE__ */ jsx("strong", { "data-error": "left" }, "left error:", String(reason)),
		__nativeBoundarySite: ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#boundary:0"
	}, /* @__PURE__ */ jsx(Child, { name: "left" })), /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx("p", { "data-fallback": "right" }, "right waiting"),
		error: (reason) => /* @__PURE__ */ jsx("strong", { "data-error": "right" }, "right error:", String(reason)),
		__nativeBoundarySite: ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#boundary:1"
	}, /* @__PURE__ */ jsx(Child, { name: "right" })));
}
export function WarmA() {
	return /* @__PURE__ */ jsx("b", null, __nativeUseAt(".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmA#store:0", first.promise));
}
export function WarmB() {
	return /* @__PURE__ */ jsx("i", null, __nativeUseAt(".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmB#store:0", warmOther.promise));
}
export function Warm() {
	return /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx("p", null, "warm waiting"),
		__nativeBoundarySite: ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#boundary:2"
	}, /* @__PURE__ */ jsx(WarmA, null), /* @__PURE__ */ jsx(WarmB, null));
}
export function Candidate() {
	return /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx("p", null, "candidate fallback"),
		__nativeBoundarySite: ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#boundary:3"
	}, /* @__PURE__ */ jsx(Child, {
		key: "candidate",
		name: "candidate"
	}));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-384b2d23c32c3833",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx",
		"module_revision": "native-v1-384b2d23c32c3833",
		"owners": [
			{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Candidate",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Warm",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmA",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmB",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#state:0",
				"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#state:1",
				"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#store:0",
				"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#store:1",
				"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmA#store:0",
				"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmA",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmB#store:0",
				"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmB",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [{
			"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#opaque-sink:1198",
			"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}],
		"operations": [
			{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#store:0",
				"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#store:1",
				"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#effect:0",
				"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmA#store:0",
				"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmA",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmB#store:0",
				"owner_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmB",
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
	"source_file": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport {Suspense,use,useState,useEffect,createStore,jsx} from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Candidate\", Candidate, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child\", Child, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Warm\", Warm, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmA\", WarmA, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmB\", WarmB, { propOnlySites: [] });\nexport const first=deferred();\nexport const second=deferred();\nexport const warmOther=deferred();\nexport const rejected=deferred();\nexport const replacement=deferred();\nexport const candidatePending=deferred();\nexport const resourceStore=createStore(first.promise,(_state:PromiseLike<string>,next:PromiseLike<string>)=>next);\nexport let activeEffects=0;\nexport let effectSetups=0;\nexport let effectCleanups=0;\nexport function deferred<T=string>(){\n let resolve!:(value:T)=>void;let reject!:(reason:unknown)=>void;\n const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});\n return {promise,resolve,reject};\n}\nexport function Child({name}:{name:string}){\n const value=__nativeUseAt(\".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#store:0\", __nativeUseAt(\".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#store:1\", resourceStore));\n const [count,setCount]=__nativeUseStateAt(\".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#state:0\", 0);\n const [draft,setDraft]=__nativeUseStateAt(\".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#state:1\", '');\n __nativeUseEffectAt(\".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#effect:0\", ()=>{activeEffects++;effectSetups++;return()=>{activeEffects--;effectCleanups++;};});\n return <article data-child={name}><button data-count={name} onClick={()=>setCount(n=>n+1)}>{count}</button><input data-draft={name} value={draft} onInput={(event:Event)=>setDraft((event.target as HTMLInputElement).value)}/><output>{name}:{value}</output></article>;\n}\nexport function App(){\n return <main><Suspense fallback={<p data-fallback=\"left\">left waiting</p>} error={(reason:unknown)=><strong data-error=\"left\">left error:{String(reason)}</strong>} __nativeBoundarySite=\".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#boundary:0\"><Child name=\"left\"/></Suspense><Suspense fallback={<p data-fallback=\"right\">right waiting</p>} error={(reason:unknown)=><strong data-error=\"right\">right error:{String(reason)}</strong>} __nativeBoundarySite=\".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#boundary:1\"><Child name=\"right\"/></Suspense></main>;\n}\nexport function WarmA(){return <b>{__nativeUseAt(\".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmA#store:0\", first.promise)}</b>;}\nexport function WarmB(){return <i>{__nativeUseAt(\".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmB#store:0\", warmOther.promise)}</i>;}\nexport function Warm(){return <Suspense fallback={<p>warm waiting</p>} __nativeBoundarySite=\".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#boundary:2\"><WarmA/><WarmB/></Suspense>;}\nexport function Candidate(){return <Suspense fallback={<p>candidate fallback</p>} __nativeBoundarySite=\".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#boundary:3\"><Child key=\"candidate\" name=\"candidate\"/></Suspense>;}\n",
	"components": [
		{
			"name": "App",
			"component_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:App",
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
			"name": "Candidate",
			"component_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Candidate",
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
			"name": "Child",
			"component_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#state:0",
				"initial_value": "0"
			}, {
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#state:1",
				"initial_value": "''"
			}],
			"effect_sites": [{ "site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#effect:0" }],
			"store_sites": [{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#store:0",
				"source_expression": "use(resourceStore)"
			}, {
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Child#store:1",
				"source_expression": "resourceStore"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": [".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#opaque-sink:1198"]
		},
		{
			"name": "Warm",
			"component_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:Warm",
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
			"name": "WarmA",
			"component_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmA",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmA#store:0",
				"source_expression": "first.promise"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "WarmB",
			"component_site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmB",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": ".cache/native-resource-execution-rR4WLi/native-resource-execution.tsx#component:WarmB#store:0",
				"source_expression": "warmOther.promise"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
