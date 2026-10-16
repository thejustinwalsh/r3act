/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { Suspense, createStore, createStoreSelector, jsx } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useAt as __nativeUseAt } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/native-promise-store-race.tsx#component:Pair", Pair, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-promise-store-race.tsx#component:Reader", Reader, { propOnlySites: [] });
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
export const oldB = deferred();
export const replacementB = deferred();
export const rejectedB = deferred();
export const modeStore = createStore("A", (_state, next) => next);
export const storeA = createStore(Promise.resolve("base-A"), (_state, next) => next);
export const storeB = createStore(Promise.resolve("base-B"), (_state, next) => next);
export const edits = createStore(0, (state, delta) => state + delta);
export const selectionA = createStoreSelector([storeA], ([value]) => value);
export const selectionB = createStoreSelector([storeB], ([value]) => value);
export let setups = 0;
export let cleanups = 0;
export let active = 0;
export function Reader({ label }) {
	const mode = __nativeUseAt(".cache/native-promise-store-race.tsx#component:Reader#store:0", modeStore);
	const selected = mode === "A" ? selectionA : selectionB;
	const promise = __nativeUseAt(".cache/native-promise-store-race.tsx#component:Reader#store:1", selected);
	const value = __nativeUseAt(".cache/native-promise-store-race.tsx#component:Reader#store:2", promise);
	const edit = __nativeUseAt(".cache/native-promise-store-race.tsx#component:Reader#store:3", edits);
	__nativeUseEffectAt(".cache/native-promise-store-race.tsx#component:Reader#effect:0", () => {
		setups++;
		active++;
		return () => {
			cleanups++;
			active--;
		};
	});
	return /* @__PURE__ */ jsx("output", {
		"data-reader": label,
		"data-mode": mode
	}, label, ":", mode, ":", value, ":", edit);
}
export function Pair() {
	const [showLate, setShowLate] = __nativeUseStateAt(".cache/native-promise-store-race.tsx#component:Pair#state:0", false);
	return /* @__PURE__ */ jsx("main", null, /* @__PURE__ */ jsx("button", {
		"data-add-late": "yes",
		onClick: () => setShowLate(true)
	}, "Add late reader"), /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx("i", { "data-fallback": "left" }, "left pending"),
		error: (reason) => /* @__PURE__ */ jsx("i", { "data-error": "left" }, "left error:", String(reason)),
		__nativeBoundarySite: ".cache/native-promise-store-race.tsx#boundary:0"
	}, /* @__PURE__ */ jsx(Reader, {
		key: "stable-left",
		label: "left"
	})), /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx("i", { "data-fallback": "right" }, "right pending"),
		error: (reason) => /* @__PURE__ */ jsx("i", { "data-error": "right" }, "right error:", String(reason)),
		__nativeBoundarySite: ".cache/native-promise-store-race.tsx#boundary:1"
	}, /* @__PURE__ */ jsx(Reader, {
		key: "stable-right",
		label: "right"
	})), showLate ? /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx("i", { "data-fallback": "late" }, "late pending"),
		error: (reason) => /* @__PURE__ */ jsx("i", { "data-error": "late" }, "late error:", String(reason)),
		__nativeBoundarySite: ".cache/native-promise-store-race.tsx#boundary:2"
	}, /* @__PURE__ */ jsx(Reader, {
		key: "stable-late",
		label: "late"
	})) : null);
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/native-promise-store-race.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport {Suspense,use,useState,useEffect,createStore,createStoreSelector,jsx} from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/native-promise-store-race.tsx#component:Pair\", Pair, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-promise-store-race.tsx#component:Reader\", Reader, { propOnlySites: [] });\nexport function deferred<T=string>(){\n let resolve!:(value:T)=>void;let reject!:(reason:unknown)=>void;\n const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});\n return {promise,resolve,reject};\n}\nexport const oldB=deferred<string>();\nexport const replacementB=deferred<string>();\nexport const rejectedB=deferred<string>();\nexport const modeStore=createStore('A',(_state:'A'|'B',next:'A'|'B')=>next);\nexport const storeA=createStore(Promise.resolve('base-A'),(_state:PromiseLike<string>,next:PromiseLike<string>)=>next);\nexport const storeB=createStore(Promise.resolve('base-B'),(_state:PromiseLike<string>,next:PromiseLike<string>)=>next);\nexport const edits=createStore(0,(state:number,delta:number)=>state+delta);\nexport const selectionA=createStoreSelector([storeA],([value])=>value);\nexport const selectionB=createStoreSelector([storeB],([value])=>value);\nexport let setups=0;\nexport let cleanups=0;\nexport let active=0;\nexport function Reader({label}:{label:string}){\n const mode=__nativeUseAt(\".cache/native-promise-store-race.tsx#component:Reader#store:0\", modeStore);\n const selected=mode==='A'?selectionA:selectionB;\n const promise=__nativeUseAt(\".cache/native-promise-store-race.tsx#component:Reader#store:1\", selected);\n const value=__nativeUseAt(\".cache/native-promise-store-race.tsx#component:Reader#store:2\", promise);\n const edit=__nativeUseAt(\".cache/native-promise-store-race.tsx#component:Reader#store:3\", edits);\n __nativeUseEffectAt(\".cache/native-promise-store-race.tsx#component:Reader#effect:0\", ()=>{setups++;active++;return()=>{cleanups++;active--;};});\n return <output data-reader={label} data-mode={mode}>{label}:{mode}:{value}:{edit}</output>;\n}\nexport function Pair(){\n const [showLate,setShowLate]=__nativeUseStateAt(\".cache/native-promise-store-race.tsx#component:Pair#state:0\", false);\n return <main><button data-add-late=\"yes\" onClick={()=>setShowLate(true)}>Add late reader</button><Suspense fallback={<i data-fallback=\"left\">left pending</i>} error={(reason:unknown)=><i data-error=\"left\">left error:{String(reason)}</i>} __nativeBoundarySite=\".cache/native-promise-store-race.tsx#boundary:0\"><Reader key=\"stable-left\" label=\"left\"/></Suspense><Suspense fallback={<i data-fallback=\"right\">right pending</i>} error={(reason:unknown)=><i data-error=\"right\">right error:{String(reason)}</i>} __nativeBoundarySite=\".cache/native-promise-store-race.tsx#boundary:1\"><Reader key=\"stable-right\" label=\"right\"/></Suspense>{showLate?<Suspense fallback={<i data-fallback=\"late\">late pending</i>} error={(reason:unknown)=><i data-error=\"late\">late error:{String(reason)}</i>} __nativeBoundarySite=\".cache/native-promise-store-race.tsx#boundary:2\"><Reader key=\"stable-late\" label=\"late\"/></Suspense>:null}</main>;\n}\n",
	"components": [{
		"name": "Pair",
		"component_site_id": ".cache/native-promise-store-race.tsx#component:Pair",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [{
			"site_id": ".cache/native-promise-store-race.tsx#component:Pair#state:0",
			"initial_value": "false"
		}],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": []
	}, {
		"name": "Reader",
		"component_site_id": ".cache/native-promise-store-race.tsx#component:Reader",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [{ "site_id": ".cache/native-promise-store-race.tsx#component:Reader#effect:0" }],
		"store_sites": [
			{
				"site_id": ".cache/native-promise-store-race.tsx#component:Reader#store:0",
				"source_expression": "modeStore"
			},
			{
				"site_id": ".cache/native-promise-store-race.tsx#component:Reader#store:1",
				"source_expression": "selected"
			},
			{
				"site_id": ".cache/native-promise-store-race.tsx#component:Reader#store:2",
				"source_expression": "promise"
			},
			{
				"site_id": ".cache/native-promise-store-race.tsx#component:Reader#store:3",
				"source_expression": "edits"
			}
		],
		"collection_sites": []
	}]
};
