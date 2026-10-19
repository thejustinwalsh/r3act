import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "native.tsx",
	"module_revision": "native-v1-c00664a86bca5deb",
	"owners": [{
		"site_id": "native.tsx#component:Counter",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": "native.tsx#component:Counter#state:0",
		"owner_site_id": "native.tsx#component:Counter",
		"kind": "state",
		"provenance": "tracked"
	}],
	"sinks": [{
		"site_id": "native.tsx#opaque-sink:410",
		"owner_site_id": "native.tsx#component:Counter",
		"source_sites": [],
		"provenance": "opaque",
		"equality": "adapter-declared",
		"host_value": "adapter-declared",
		"retention": "adapter-declared",
		"execution": "generic"
	}, {
		"site_id": "native.tsx#opaque-sink:545",
		"owner_site_id": "native.tsx#component:Counter",
		"source_sites": [],
		"provenance": "opaque",
		"equality": "adapter-declared",
		"host_value": "adapter-declared",
		"retention": "adapter-declared",
		"execution": "generic"
	}],
	"operations": [],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {},
		"execution_order": []
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "native.tsx" && event.previousRevision === "native-v1-c00664a86bca5deb" && event.previousInstance === "native-v1-c00664a86bca5deb") __invalidateNativeSemanticPlan("native.tsx", "native-v1-c00664a86bca5deb");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/core */
import { createNativeRoot, jsx } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt } from "@r3act/core";
__nativeDefineComponent("native.tsx#component:Counter", Counter, {
	propOnlySites: [],
	hostLeafOutput: true
});
import { createDOMRoot } from "@r3act/host-dom";
import { Brush, RetainedCanvasHost } from "../example/retained_host";
function Counter(props) {
	const [count, setCount] = __nativeUseStateAt("native.tsx#component:Counter#state:0", 0);
	return /* @__PURE__ */ __nativeJsx.jsx("main", null, /* @__PURE__ */ __nativeJsx.jsx("h1", null, "Canvas counter"), /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		onClick: () => {
			const next = count + 1;
			setCount(next);
			props.paint(next);
		}
	}, "Increment"), /* @__PURE__ */ __nativeJsx.jsx("output", { "data-count": count }, count));
}
const host = document.querySelector("#app");
if (host) {
	const panel = document.createElement("div");
	const canvas = document.createElement("canvas");
	canvas.width = 200;
	canvas.height = 80;
	host.append(panel, canvas);
	const context = canvas.getContext("2d");
	if (!context) throw new Error("Canvas 2D unavailable");
	const adapter = new RetainedCanvasHost();
	const brush = new Brush("#227e70");
	const root = createNativeRoot(adapter, adapter.createContainer());
	root.mount(jsx("paintLayer", { name: "counter" }));
	const paint = (count) => {
		root.update(jsx("paintLayer", {
			name: "counter",
			children: [jsx("paintRect", {
				name: "bar",
				position: [12, 12],
				width: 20 + count * 20,
				height: 28,
				brush: {
					brush,
					ownership: "owned"
				}
			}), jsx("paintText", {
				name: "value",
				position: [12, 58],
				text: String(count),
				color: "#26384f"
			})]
		}));
		context.clearRect(0, 0, 200, 80);
		adapter.draw(context);
	};
	const dom = createDOMRoot(panel);
	dom.mount(/* @__PURE__ */ __nativeJsx.jsx(Counter, { paint }));
	paint(0);
	window.comparison = {
		snapshot: () => ({
			count: panel.querySelector("[data-count]")?.textContent ?? null,
			frame: adapter.frame(),
			pixel: [...context.getImageData(16, 16, 1, 1).data],
			growthPixel: [...context.getImageData(45, 16, 1, 1).data],
			brushDisposals: brush.disposeCalls,
			canvasNodes: adapter.diagnostics().liveHandles
		}),
		dispose: () => {
			dom.dispose();
			root.dispose();
			adapter.dispose();
			panel.remove();
			canvas.remove();
		}
	};
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-c00664a86bca5deb",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "native.tsx",
		"module_revision": "native-v1-c00664a86bca5deb",
		"owners": [{
			"site_id": "native.tsx#component:Counter",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": "native.tsx#component:Counter#state:0",
			"owner_site_id": "native.tsx#component:Counter",
			"kind": "state",
			"provenance": "tracked"
		}],
		"sinks": [{
			"site_id": "native.tsx#opaque-sink:410",
			"owner_site_id": "native.tsx#component:Counter",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}, {
			"site_id": "native.tsx#opaque-sink:545",
			"owner_site_id": "native.tsx#component:Counter",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}],
		"operations": [],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {},
			"execution_order": []
		}
	},
	"source_file": "native.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/core */\n// @native-ui\nimport { createNativeRoot, useState, jsx } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"native.tsx#component:Counter\", Counter, { propOnlySites: [], hostLeafOutput: true });\nimport { createDOMRoot } from \"@r3act/host-dom\";\nimport { Brush, RetainedCanvasHost } from \"../example/retained_host\";\n\nfunction Counter(props: { paint: (count: number) => void }) {\n  const [count, setCount] = __nativeUseStateAt(\"native.tsx#component:Counter#state:0\", 0);\n  return <main><h1>Canvas counter</h1>\n    <button type=\"button\" onClick={() => {\n      const next = count + 1;\n      setCount(next);\n      props.paint(next);\n    }}>Increment</button>\n    <output data-count={count}>{count}</output></main>;\n}\n\nconst host = document.querySelector<HTMLElement>(\"#app\");\nif (host) {\n  const panel = document.createElement(\"div\");\n  const canvas = document.createElement(\"canvas\");\n  canvas.width = 200;\n  canvas.height = 80;\n  host.append(panel, canvas);\n  const context = canvas.getContext(\"2d\");\n  if (!context) throw new Error(\"Canvas 2D unavailable\");\n  const adapter = new RetainedCanvasHost();\n  const brush = new Brush(\"#227e70\");\n  const root = createNativeRoot(adapter, adapter.createContainer());\n  root.mount(jsx(\"paintLayer\", { name: \"counter\" }));\n  const paint = (count: number) => {\n    root.update(jsx(\"paintLayer\", { name: \"counter\", children: [\n      jsx(\"paintRect\", { name: \"bar\", position: [12, 12], width: 20 + count * 20,\n        height: 28, brush: { brush, ownership: \"owned\" } }),\n      jsx(\"paintText\", { name: \"value\", position: [12, 58], text: String(count), color: \"#26384f\" }),\n    ] }));\n    context.clearRect(0, 0, 200, 80);\n    adapter.draw(context);\n  };\n  const dom = createDOMRoot(panel);\n  dom.mount(<Counter paint={paint} />);\n  paint(0);\n  window.comparison = {\n    snapshot: () => ({ count: panel.querySelector(\"[data-count]\")?.textContent ?? null,\n      frame: adapter.frame(), pixel: [...context.getImageData(16, 16, 1, 1).data],\n      growthPixel: [...context.getImageData(45, 16, 1, 1).data],\n      brushDisposals: brush.disposeCalls, canvasNodes: adapter.diagnostics().liveHandles }),\n    dispose: () => { dom.dispose(); root.dispose(); adapter.dispose(); panel.remove(); canvas.remove(); },\n  };\n}\n\ndeclare global { interface Window { comparison?: { snapshot(): unknown; dispose(): void } } }\n",
	"components": [{
		"name": "Counter",
		"component_site_id": "native.tsx#component:Counter",
		"prop_only_sites": [],
		"host_leaf_output": true,
		"state_sites": [{
			"site_id": "native.tsx#component:Counter#state:0",
			"initial_value": "0"
		}],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": ["native.tsx#opaque-sink:410", "native.tsx#opaque-sink:545"]
	}]
};
import * as __nativeJsx from "@r3act/core";
