import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 1,
	sinkId: ".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#numeric-sink:1157",
	sourceSites: [".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row#state:0"]
}];
__nativeDefineComponent(".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row", Row, {
	propOnlySites: [".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row#state:0"],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		slots: [{
			siteId: ".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row#state:0",
			slot: 0
		}]
	}
});
export const trace = {
	initializers: 0,
	renders: 0,
	events: [],
	node: null,
	setValue: null
};
export function resetTrace() {
	trace.initializers = 0;
	trace.renders = 0;
	trace.events.length = 0;
	trace.node = null;
	trace.setValue = null;
}
export function captureNode(node) {
	if (node) {
		trace.node = node;
		trace.events.push({
			kind: "ref",
			left: node.props.style?.left
		});
		return () => {
			trace.events.push({
				kind: "ref-cleanup",
				left: node.props.style?.left
			});
			if (trace.node === node) trace.node = null;
		};
	}
}
export function Row() {
	if (trace.renders === 0) trace.initializers++;
	trace.renders++;
	const [value, setValue] = __nativeUseStateAt(".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row#state:0", 2);
	trace.setValue = setValue;
	__nativeUseEffectAt(".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row#effect:0", () => {
		trace.events.push({
			kind: "effect",
			left: trace.node?.props.style?.left
		});
		return () => {
			trace.events.push({
				kind: "effect-cleanup",
				left: trace.node?.props.style?.left
			});
			trace.setValue = null;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("i", {
		ref: captureNode,
		style: { left: __nativeBindStatePropAt(".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row#state:0", (value) => `${value}px`, __nativeNumericPrograms[0]) }
	});
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { useEffect, useState } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 1, sinkId: \".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#numeric-sink:1157\", sourceSites: [\".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row#state:0\"] }] as const;\n__nativeDefineComponent(\".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row\", Row, { propOnlySites: [\".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row#state:0\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, slots: [{ siteId: \".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row#state:0\", slot: 0 }] } });\nexport const trace = {\n  initializers: 0, renders: 0, events: [], node: null, setValue: null,\n};\nexport function resetTrace() {\n  trace.initializers = 0;\n  trace.renders = 0;\n  trace.events.length = 0;\n  trace.node = null;\n  trace.setValue = null;\n}\nexport function captureNode(node) {\n  if (node) {\n    trace.node = node;\n    trace.events.push({ kind: \"ref\", left: node.props.style?.left });\n    return () => {\n      trace.events.push({ kind: \"ref-cleanup\", left: node.props.style?.left });\n      if (trace.node === node) trace.node = null;\n    };\n  }\n}\nexport function Row() {\n  if (trace.renders === 0) trace.initializers++;\n  trace.renders++;\n  const [value, setValue] = __nativeUseStateAt(\".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row#state:0\", 2);\n  trace.setValue = setValue;\n  __nativeUseEffectAt(\".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row#effect:0\", () => {\n    trace.events.push({ kind: \"effect\", left: trace.node?.props.style?.left });\n    return () => {\n      trace.events.push({ kind: \"effect-cleanup\", left: trace.node?.props.style?.left });\n      trace.setValue = null;\n    };\n  });\n  return <i ref={captureNode} style={{ left: __nativeBindStatePropAt(\".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row#state:0\", (value) => (`${value}px`), __nativeNumericPrograms[0]) }} />;\n}",
	"components": [{
		"name": "Row",
		"component_site_id": ".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row",
		"prop_only_sites": [".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row#state:0"],
		"state_layout": {
			"schema_version": 1,
			"slots": [{
				"site_id": ".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row#state:0",
				"slot": 0
			}]
		},
		"host_leaf_output": true,
		"state_sites": [{
			"site_id": ".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row#state:0",
			"initial_value": "2"
		}],
		"effect_sites": [{ "site_id": ".cache/numeric-state-lane-lifecycle/authored-lifecycle-1791874496964-58994.tsx#component:Row#effect:0" }],
		"store_sites": [],
		"collection_sites": []
	}]
};
import * as __nativeJsx from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
