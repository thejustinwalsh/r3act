import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "compiler/fixtures/native-react-island.tsx",
	"module_revision": "native-v1-3fdfccc040a4076c",
	"owners": [{
		"site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp",
		"repeated_scope": "runtime-keyed-owner"
	}, {
		"site_id": "compiler/fixtures/native-react-island.tsx#component:PendingGate",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [
		{
			"site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp#state:0",
			"owner_site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp#store:0",
			"owner_site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "compiler/fixtures/native-react-island.tsx#component:PendingGate#store:0",
			"owner_site_id": "compiler/fixtures/native-react-island.tsx#component:PendingGate",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [{
		"site_id": "compiler/fixtures/native-react-island.tsx#opaque-sink:1100",
		"owner_site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp",
		"source_sites": [],
		"provenance": "opaque",
		"equality": "adapter-declared",
		"host_value": "adapter-declared",
		"retention": "adapter-declared",
		"execution": "generic"
	}],
	"operations": [{
		"site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp#store:0",
		"owner_site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp",
		"kind": "use-store-or-resource",
		"provenance": "opaque",
		"source_sites": []
	}, {
		"site_id": "compiler/fixtures/native-react-island.tsx#component:PendingGate#store:0",
		"owner_site_id": "compiler/fixtures/native-react-island.tsx#component:PendingGate",
		"kind": "use-store-or-resource",
		"provenance": "opaque",
		"source_sites": []
	}],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {},
		"execution_order": []
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "compiler/fixtures/native-react-island.tsx") __invalidateNativeSemanticPlan("compiler/fixtures/native-react-island.tsx", "native-v1-3fdfccc040a4076c");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxRuntime classic */
/** @jsx jsx */
import { createStore, storeRecord } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useAt as __nativeUseAt } from "@r3act/core";
__nativeDefineComponent("compiler/fixtures/native-react-island.tsx#component:NativeIslandApp", NativeIslandApp, { propOnlySites: [] });
__nativeDefineComponent("compiler/fixtures/native-react-island.tsx#component:PendingGate", PendingGate, { propOnlySites: [] });
import { createNativeReactRootAdapter } from "@r3act/react-bridge";
import { ReactLeaf } from "../../implementation/2026-10-19-react-island/workload/react_leaf.tsx";
export const Island = createNativeReactRootAdapter(ReactLeaf);
export function createPointStore() {
	return createStore(storeRecord({ point: 1 }), (_old, value) => value);
}
export function PendingGate(props) {
	const value = __nativeUseAt("compiler/fixtures/native-react-island.tsx#component:PendingGate#store:0", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("output", { "data-gate": value });
}
export function NativeIslandApp(props) {
	const point = __nativeUseAt("compiler/fixtures/native-react-island.tsx#component:NativeIslandApp#store:0", props.point);
	const [nativeClicks, setNativeClicks] = __nativeUseStateAt("compiler/fixtures/native-react-island.tsx#component:NativeIslandApp#state:0", 0);
	return /* @__PURE__ */ __nativeJsx.jsx("section", {
		"data-native-label": props.label,
		"data-native-clicks": nativeClicks
	}, /* @__PURE__ */ __nativeJsx.jsx("button", {
		"data-native-action": "true",
		onClick: () => setNativeClicks((current) => current + 1)
	}, "native"), props.order.map((id) => /* @__PURE__ */ __nativeJsx.jsx(Island, {
		key: id,
		id,
		label: props.label,
		point: point.point,
		nativeClicks,
		trace: props.trace,
		onNativeAction: props.onNativeAction
	})), props.gate ? /* @__PURE__ */ __nativeJsx.jsx(PendingGate, { resource: props.gate }) : null);
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-3fdfccc040a4076c",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "compiler/fixtures/native-react-island.tsx",
		"module_revision": "native-v1-3fdfccc040a4076c",
		"owners": [{
			"site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp",
			"repeated_scope": "runtime-keyed-owner"
		}, {
			"site_id": "compiler/fixtures/native-react-island.tsx#component:PendingGate",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [
			{
				"site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp#state:0",
				"owner_site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp#store:0",
				"owner_site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "compiler/fixtures/native-react-island.tsx#component:PendingGate#store:0",
				"owner_site_id": "compiler/fixtures/native-react-island.tsx#component:PendingGate",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [{
			"site_id": "compiler/fixtures/native-react-island.tsx#opaque-sink:1100",
			"owner_site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}],
		"operations": [{
			"site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp#store:0",
			"owner_site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		}, {
			"site_id": "compiler/fixtures/native-react-island.tsx#component:PendingGate#store:0",
			"owner_site_id": "compiler/fixtures/native-react-island.tsx#component:PendingGate",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		}],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {},
			"execution_order": []
		}
	},
	"source_file": "compiler/fixtures/native-react-island.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport { AsyncResource, createStore, jsx, storeRecord, use, useState } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"compiler/fixtures/native-react-island.tsx#component:NativeIslandApp\", NativeIslandApp, { propOnlySites: [] });\n__nativeDefineComponent(\"compiler/fixtures/native-react-island.tsx#component:PendingGate\", PendingGate, { propOnlySites: [] });\nimport { createNativeReactRootAdapter } from \"@r3act/react-bridge\";\nimport { ReactLeaf, type IslandProps } from \"../../implementation/2026-10-19-react-island/workload/react_leaf.tsx\";\n\nexport const Island = createNativeReactRootAdapter(ReactLeaf);\nexport type NativeIslandProps = {\n  label: string;\n  order: readonly string[];\n  point: ReturnType<typeof createPointStore>;\n  gate?: AsyncResource<string>;\n  trace: IslandProps[\"trace\"];\n  onNativeAction: () => void;\n};\nexport function createPointStore() {\n  return createStore(storeRecord({ point: 1 }), (_old, value) => value);\n}\nexport function PendingGate(props: { resource: AsyncResource<string> }) {\n  const value = __nativeUseAt(\"compiler/fixtures/native-react-island.tsx#component:PendingGate#store:0\", props.resource);\n  return <output data-gate={value} />;\n}\nexport function NativeIslandApp(props: NativeIslandProps) {\n  const point = __nativeUseAt(\"compiler/fixtures/native-react-island.tsx#component:NativeIslandApp#store:0\", props.point);\n  const [nativeClicks, setNativeClicks] = __nativeUseStateAt(\"compiler/fixtures/native-react-island.tsx#component:NativeIslandApp#state:0\", 0);\n  return <section data-native-label={props.label} data-native-clicks={nativeClicks}>\n    <button data-native-action=\"true\" onClick={() => setNativeClicks(current => current + 1)}>native</button>\n    {props.order.map(id => <Island key={id} id={id} label={props.label} point={point.point}\n      nativeClicks={nativeClicks}\n      trace={props.trace} onNativeAction={props.onNativeAction} />)}\n    {props.gate ? <PendingGate resource={props.gate} /> : null}\n  </section>;\n}\n",
	"components": [{
		"name": "NativeIslandApp",
		"component_site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [{
			"site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp#state:0",
			"initial_value": "0"
		}],
		"effect_sites": [],
		"store_sites": [{
			"site_id": "compiler/fixtures/native-react-island.tsx#component:NativeIslandApp#store:0",
			"source_expression": "props.point"
		}],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": ["compiler/fixtures/native-react-island.tsx#opaque-sink:1100"]
	}, {
		"name": "PendingGate",
		"component_site_id": "compiler/fixtures/native-react-island.tsx#component:PendingGate",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [{
			"site_id": "compiler/fixtures/native-react-island.tsx#component:PendingGate#store:0",
			"source_expression": "props.resource"
		}],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}]
};
import * as __nativeJsx from "@r3act/core";
