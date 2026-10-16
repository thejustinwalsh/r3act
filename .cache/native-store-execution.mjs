/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, createStoreSelector, jsx } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useAt as __nativeUseAt } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/native-store-execution.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-store-execution.tsx#component:Conditional", Conditional, {
	propOnlySites: [],
	hostLeafOutput: true
});
export const a = createStore(0);
export const b = createStore(10);
export const total = createStoreSelector([a, b], ([a, b]) => Number(a) + Number(b));
export const controls = {};
export let fail = false;
export function setFailure(next) {
	fail = next;
}
export function App() {
	const value = __nativeUseAt(".cache/native-store-execution.tsx#component:App#store:0", total);
	const [active, setActive] = __nativeUseStateAt(".cache/native-store-execution.tsx#component:App#state:0", true);
	controls.active = setActive;
	if (fail) throw new Error("candidate failure");
	return /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("button", {
		"data-total": "yes",
		onClick: () => a.dispatch((previous) => previous + 1)
	}, "Total ", value), active ? /* @__PURE__ */ jsx(Conditional, null) : null);
}
export function Conditional() {
	const [enabled, setEnabled] = __nativeUseStateAt(".cache/native-store-execution.tsx#component:Conditional#state:0", true);
	if (enabled) {
		const current = __nativeUseAt(".cache/native-store-execution.tsx#component:Conditional#store:0", a);
		return /* @__PURE__ */ jsx("output", {
			"data-conditional": "yes",
			onClick: () => setEnabled(false)
		}, current);
	}
	return /* @__PURE__ */ jsx("output", { "data-conditional": "yes" }, "Disabled");
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/native-store-execution.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport {use, useState, createStore, createStoreSelector, jsx} from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/native-store-execution.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-store-execution.tsx#component:Conditional\", Conditional, { propOnlySites: [], hostLeafOutput: true });\nexport const a=createStore(0);\nexport const b=createStore(10);\nexport const total=createStoreSelector([a,b],([a,b])=>Number(a)+Number(b));\nexport const controls:Record<string,(v:any)=>boolean>={};\nexport let fail=false;\nexport function setFailure(next:boolean){fail=next;}\nexport function App(){\n const value=__nativeUseAt(\".cache/native-store-execution.tsx#component:App#store:0\", total);\n const [active,setActive]=__nativeUseStateAt(\".cache/native-store-execution.tsx#component:App#state:0\", true);\n controls.active=setActive;\n if(fail)throw new Error('candidate failure');\n return <section><button data-total=\"yes\" onClick={()=>a.dispatch(previous=>previous+1)}>Total {value}</button>{active?<Conditional/>:null}</section>;\n}\nexport function Conditional(){\n const [enabled,setEnabled]=__nativeUseStateAt(\".cache/native-store-execution.tsx#component:Conditional#state:0\", true);\n if(enabled){const current=__nativeUseAt(\".cache/native-store-execution.tsx#component:Conditional#store:0\", a);return <output data-conditional=\"yes\" onClick={()=>setEnabled(false)}>{current}</output>;}\n return <output data-conditional=\"yes\">Disabled</output>;\n}\n",
	"components": [{
		"name": "App",
		"component_site_id": ".cache/native-store-execution.tsx#component:App",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [{
			"site_id": ".cache/native-store-execution.tsx#component:App#state:0",
			"initial_value": "true"
		}],
		"effect_sites": [],
		"store_sites": [{
			"site_id": ".cache/native-store-execution.tsx#component:App#store:0",
			"source_expression": "total"
		}],
		"collection_sites": []
	}, {
		"name": "Conditional",
		"component_site_id": ".cache/native-store-execution.tsx#component:Conditional",
		"prop_only_sites": [],
		"host_leaf_output": true,
		"state_sites": [{
			"site_id": ".cache/native-store-execution.tsx#component:Conditional#state:0",
			"initial_value": "true"
		}],
		"effect_sites": [],
		"store_sites": [{
			"site_id": ".cache/native-store-execution.tsx#component:Conditional#store:0",
			"source_expression": "a"
		}],
		"collection_sites": []
	}]
};
