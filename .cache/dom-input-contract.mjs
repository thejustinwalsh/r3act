// @native-ui
/** @jsxRuntime classic */
/** @jsx jsx */
import { createDOMRoot, jsx } from "https://async-transition-stress.localhost:1355/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt } from "https://async-transition-stress.localhost:1355/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/dom-input-contract.tsx#component:InputContract", InputContract, {
	propOnlySites: [],
	hostLeafOutput: true
});
function InputContract() {
	const [checked, setChecked] = __nativeUseStateAt(".cache/dom-input-contract.tsx#component:InputContract#state:0", false);
	const [text, setText] = __nativeUseStateAt(".cache/dom-input-contract.tsx#component:InputContract#state:1", "seed");
	return /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("label", null, "Probe checkbox", /* @__PURE__ */ jsx("input", {
		type: "checkbox",
		checked,
		onChange: (event) => setChecked(event.target.checked)
	})), /* @__PURE__ */ jsx("button", { onClick: () => setChecked(false) }, "Reset checkbox"), /* @__PURE__ */ jsx("label", null, "Probe text", /* @__PURE__ */ jsx("input", {
		value: text,
		onInput: (event) => setText(event.target.value)
	})), /* @__PURE__ */ jsx("output", { "data-probe-text": "yes" }, text), /* @__PURE__ */ jsx("button", { onClick: () => setText("") }, "Reset text"), /* @__PURE__ */ jsx("button", {
		"aria-pressed": checked,
		"data-enabled": checked
	}, "Probe toggle"));
}
export function mount(container) {
	const root = createDOMRoot(container, { rootId: "dom-input-contract" });
	root.mount(/* @__PURE__ */ jsx(InputContract, null));
	return () => root.dispose();
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/dom-input-contract.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "// @native-ui\n/** @jsxRuntime classic */\n/** @jsx jsx */\nimport {createDOMRoot,useState,jsx} from 'https://async-transition-stress.localhost:1355/src/native_runtime_api.ts';\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"https://async-transition-stress.localhost:1355/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/dom-input-contract.tsx#component:InputContract\", InputContract, { propOnlySites: [], hostLeafOutput: true });\nfunction InputContract(){\n const[checked,setChecked]=__nativeUseStateAt(\".cache/dom-input-contract.tsx#component:InputContract#state:0\", false);\n const[text,setText]=__nativeUseStateAt(\".cache/dom-input-contract.tsx#component:InputContract#state:1\", 'seed');\n return <section><label>Probe checkbox<input type=\"checkbox\" checked={checked} onChange={(event:Event)=>setChecked((event.target as HTMLInputElement).checked)}/></label><button onClick={()=>setChecked(false)}>Reset checkbox</button><label>Probe text<input value={text} onInput={(event:Event)=>setText((event.target as HTMLInputElement).value)}/></label><output data-probe-text=\"yes\">{text}</output><button onClick={()=>setText('')}>Reset text</button><button aria-pressed={checked} data-enabled={checked}>Probe toggle</button></section>;\n}\nexport function mount(container:HTMLElement){const root=createDOMRoot(container,{rootId:'dom-input-contract'});root.mount(<InputContract/>);return()=>root.dispose();}\n",
	"components": [{
		"name": "InputContract",
		"component_site_id": ".cache/dom-input-contract.tsx#component:InputContract",
		"prop_only_sites": [],
		"host_leaf_output": true,
		"state_sites": [{
			"site_id": ".cache/dom-input-contract.tsx#component:InputContract#state:0",
			"initial_value": "false"
		}, {
			"site_id": ".cache/dom-input-contract.tsx#component:InputContract#state:1",
			"initial_value": "'seed'"
		}],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": []
	}]
};
