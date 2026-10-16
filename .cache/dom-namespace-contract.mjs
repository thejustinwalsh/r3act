// @native-ui
/** @jsxRuntime classic */
/** @jsx jsx */
import { createDOMRoot, jsx } from "https://async-transition-stress.localhost:1355/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt } from "https://async-transition-stress.localhost:1355/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/dom-namespace-contract.tsx#component:NamespaceContract", NamespaceContract, {
	propOnlySites: [],
	hostLeafOutput: true
});
function NamespaceContract() {
	const [updated, setUpdated] = __nativeUseStateAt(".cache/dom-namespace-contract.tsx#component:NamespaceContract#state:0", false);
	return /* @__PURE__ */ jsx("g", { "data-probe": "svg-root-child" }, /* @__PURE__ */ jsx("svg", {
		"data-probe": "nested-svg",
		viewBox: "0 0 24 24"
	}, /* @__PURE__ */ jsx("path", {
		"data-probe": "path",
		d: "M1 1h22v22H1z",
		strokeWidth: updated ? 4 : 2,
		xlinkHref: "#shape-source",
		"aria-hidden": false,
		"data-active": false,
		style: {
			stroke: updated ? "blue" : "red",
			opacity: updated ? undefined : .5
		}
	}), /* @__PURE__ */ jsx("filter", { "data-probe": "filter" }, /* @__PURE__ */ jsx("feTurbulence", {
		"data-probe": "turbulence",
		numOctaves: 3
	})), /* @__PURE__ */ jsx("animate", {
		"data-probe": "animation",
		attributeName: "opacity",
		keyPoints: "0;1"
	})), /* @__PURE__ */ jsx("foreignObject", {
		"data-probe": "foreign-object",
		width: "80",
		height: "40"
	}, /* @__PURE__ */ jsx("div", {
		"data-probe": "html-child",
		style: { color: updated ? undefined : "red" }
	}, /* @__PURE__ */ jsx("span", { "data-probe": "html-descendant" }, updated ? "updated" : "initial"), /* @__PURE__ */ jsx("button", {
		"data-probe": "update",
		onClick: () => setUpdated((value) => !value)
	}, updated ? "Updated" : "Update"), /* @__PURE__ */ jsx("svg", {
		"data-probe": "inner-svg",
		viewBox: "0 0 4 4"
	}, /* @__PURE__ */ jsx("circle", {
		"data-probe": "inner-circle",
		cx: "2",
		cy: "2",
		r: "1"
	})))));
}
export function mount(container) {
	const root = createDOMRoot(container, { rootId: "dom-namespace-contract" });
	root.mount(/* @__PURE__ */ jsx(NamespaceContract, null));
	return () => root.dispose();
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/dom-namespace-contract.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "// @native-ui\n/** @jsxRuntime classic */\n/** @jsx jsx */\nimport {createDOMRoot,useState,jsx} from 'https://async-transition-stress.localhost:1355/src/native_runtime_api.ts';\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"https://async-transition-stress.localhost:1355/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/dom-namespace-contract.tsx#component:NamespaceContract\", NamespaceContract, { propOnlySites: [], hostLeafOutput: true });\n\nfunction NamespaceContract(){\n const[updated,setUpdated]=__nativeUseStateAt(\".cache/dom-namespace-contract.tsx#component:NamespaceContract#state:0\", false);\n return <g data-probe=\"svg-root-child\">\n  <svg data-probe=\"nested-svg\" viewBox=\"0 0 24 24\">\n   <path data-probe=\"path\" d=\"M1 1h22v22H1z\" strokeWidth={updated?4:2} xlinkHref=\"#shape-source\" aria-hidden={false} data-active={false} style={{stroke:updated?'blue':'red',opacity:updated?undefined:0.5}}/>\n   <filter data-probe=\"filter\"><feTurbulence data-probe=\"turbulence\" numOctaves={3}/></filter>\n   <animate data-probe=\"animation\" attributeName=\"opacity\" keyPoints=\"0;1\"/>\n  </svg>\n  <foreignObject data-probe=\"foreign-object\" width=\"80\" height=\"40\">\n   <div data-probe=\"html-child\" style={{color:updated?undefined:'red'}}>\n   <span data-probe=\"html-descendant\">{updated?'updated':'initial'}</span>\n    <button data-probe=\"update\" onClick={()=>setUpdated(value=>!value)}>{updated?'Updated':'Update'}</button>\n    <svg data-probe=\"inner-svg\" viewBox=\"0 0 4 4\"><circle data-probe=\"inner-circle\" cx=\"2\" cy=\"2\" r=\"1\"/></svg>\n   </div>\n  </foreignObject>\n </g>;\n}\n\nexport function mount(container:Node){\n const root=createDOMRoot(container,{rootId:'dom-namespace-contract'});\n root.mount(<NamespaceContract/>);\n return()=>root.dispose();\n}\n",
	"components": [{
		"name": "NamespaceContract",
		"component_site_id": ".cache/dom-namespace-contract.tsx#component:NamespaceContract",
		"prop_only_sites": [],
		"host_leaf_output": true,
		"state_sites": [{
			"site_id": ".cache/dom-namespace-contract.tsx#component:NamespaceContract#state:0",
			"initial_value": "false"
		}],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": []
	}]
};
