import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "compiler/fixtures/native-radix-dialog.tsx",
	"module_revision": "native-v1-214ada0441637c7c",
	"owners": [{
		"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp",
		"repeated_scope": "runtime-keyed-owner"
	}, {
		"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:PendingGate",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [
		{
			"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#state:0",
			"owner_site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#store:0",
			"owner_site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#store:1",
			"owner_site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:PendingGate#store:0",
			"owner_site_id": "compiler/fixtures/native-radix-dialog.tsx#component:PendingGate",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [{
		"site_id": "compiler/fixtures/native-radix-dialog.tsx#opaque-sink:1321",
		"owner_site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp",
		"source_sites": [],
		"provenance": "opaque",
		"equality": "adapter-declared",
		"host_value": "adapter-declared",
		"retention": "adapter-declared",
		"execution": "generic"
	}],
	"operations": [
		{
			"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#store:0",
			"owner_site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#store:1",
			"owner_site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:PendingGate#store:0",
			"owner_site_id": "compiler/fixtures/native-radix-dialog.tsx#component:PendingGate",
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
		if (event?.sourceFile === "compiler/fixtures/native-radix-dialog.tsx") __invalidateNativeSemanticPlan("compiler/fixtures/native-radix-dialog.tsx", "native-v1-214ada0441637c7c");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxRuntime classic */
/** @jsx jsx */
import { createStore, storeRecord } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useAt as __nativeUseAt } from "@r3act/core";
__nativeDefineComponent("compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp", NativeRadixApp, { propOnlySites: [] });
__nativeDefineComponent("compiler/fixtures/native-radix-dialog.tsx#component:PendingGate", PendingGate, { propOnlySites: [] });
import { RadixDialog } from "@r3act/react-bridge/radix-dialog";
import { createElement } from "react";
import { DialogBody } from "../../implementation/2026-10-19-radix-dialog/workload/dialog_body.tsx";
export function createOpenStore() {
	return createStore(storeRecord({ open: false }), (_old, value) => value);
}
export function createPointStore() {
	return createStore(storeRecord({ point: 1 }), (_old, value) => value);
}
export function PendingGate(props) {
	const value = __nativeUseAt("compiler/fixtures/native-radix-dialog.tsx#component:PendingGate#store:0", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("output", { "data-gate": value });
}
export function NativeRadixApp(props) {
	const open = __nativeUseAt("compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#store:0", props.openStore);
	const point = __nativeUseAt("compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#store:1", props.pointStore);
	const [nativeCount, setNativeCount] = __nativeUseStateAt("compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#state:0", 0);
	return /* @__PURE__ */ __nativeJsx.jsx("section", {
		"data-native-label": props.label,
		"data-native-count": nativeCount
	}, /* @__PURE__ */ __nativeJsx.jsx("button", {
		"data-native-action": "true",
		onClick: () => setNativeCount((current) => current + 1)
	}, "Native count"), props.order.map((id) => /* @__PURE__ */ __nativeJsx.jsx("div", {
		key: id,
		"data-row": id
	}, id === "dialog" ? /* @__PURE__ */ __nativeJsx.jsx(RadixDialog, {
		key: "dialog",
		open: open.open,
		onOpenChange: props.onOpenChange,
		title: "Settings",
		description: "Edit your dialog note",
		triggerLabel: "Open settings",
		closeLabel: "Close settings",
		portalContainer: props.portalContainer,
		children: createElement(DialogBody, {
			label: props.label,
			point: point.point,
			nativeCount,
			observer: props.observer
		})
	}) : /* @__PURE__ */ __nativeJsx.jsx("output", { "data-other": "stable" }))), props.gate ? /* @__PURE__ */ __nativeJsx.jsx(PendingGate, { resource: props.gate }) : null);
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-214ada0441637c7c",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "compiler/fixtures/native-radix-dialog.tsx",
		"module_revision": "native-v1-214ada0441637c7c",
		"owners": [{
			"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp",
			"repeated_scope": "runtime-keyed-owner"
		}, {
			"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:PendingGate",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [
			{
				"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#state:0",
				"owner_site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#store:0",
				"owner_site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#store:1",
				"owner_site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:PendingGate#store:0",
				"owner_site_id": "compiler/fixtures/native-radix-dialog.tsx#component:PendingGate",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [{
			"site_id": "compiler/fixtures/native-radix-dialog.tsx#opaque-sink:1321",
			"owner_site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}],
		"operations": [
			{
				"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#store:0",
				"owner_site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#store:1",
				"owner_site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:PendingGate#store:0",
				"owner_site_id": "compiler/fixtures/native-radix-dialog.tsx#component:PendingGate",
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
	"source_file": "compiler/fixtures/native-radix-dialog.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport { AsyncResource, createStore, jsx, storeRecord, use, useState } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp\", NativeRadixApp, { propOnlySites: [] });\n__nativeDefineComponent(\"compiler/fixtures/native-radix-dialog.tsx#component:PendingGate\", PendingGate, { propOnlySites: [] });\nimport { RadixDialog } from \"@r3act/react-bridge/radix-dialog\";\nimport { createElement } from \"react\";\nimport { DialogBody, type DialogObserver } from \"../../implementation/2026-10-19-radix-dialog/workload/dialog_body.tsx\";\n\nexport function createOpenStore() {\n  return createStore(storeRecord({ open: false }), (_old, value) => value);\n}\nexport function createPointStore() {\n  return createStore(storeRecord({ point: 1 }), (_old, value) => value);\n}\nexport type NativeRadixProps = {\n  openStore: ReturnType<typeof createOpenStore>;\n  pointStore: ReturnType<typeof createPointStore>;\n  label: string;\n  order: readonly string[];\n  portalContainer: HTMLElement;\n  observer: DialogObserver;\n  onOpenChange: (open: boolean) => void;\n  gate?: AsyncResource<string>;\n};\nexport function PendingGate(props: { resource: AsyncResource<string> }) {\n  const value = __nativeUseAt(\"compiler/fixtures/native-radix-dialog.tsx#component:PendingGate#store:0\", props.resource);\n  return <output data-gate={value} />;\n}\nexport function NativeRadixApp(props: NativeRadixProps) {\n  const open = __nativeUseAt(\"compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#store:0\", props.openStore);\n  const point = __nativeUseAt(\"compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#store:1\", props.pointStore);\n  const [nativeCount, setNativeCount] = __nativeUseStateAt(\"compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#state:0\", 0);\n  return <section data-native-label={props.label} data-native-count={nativeCount}>\n    <button data-native-action=\"true\" onClick={() => setNativeCount(current => current + 1)}>Native count</button>\n    {props.order.map(id => <div key={id} data-row={id}>{id === \"dialog\" ?\n      <RadixDialog key=\"dialog\" open={open.open} onOpenChange={props.onOpenChange}\n        title=\"Settings\" description=\"Edit your dialog note\" triggerLabel=\"Open settings\"\n        closeLabel=\"Close settings\" portalContainer={props.portalContainer}\n        children={createElement(DialogBody, { label: props.label, point: point.point,\n          nativeCount, observer: props.observer })} /> : <output data-other=\"stable\" />}</div>)}\n    {props.gate ? <PendingGate resource={props.gate} /> : null}\n  </section>;\n}\n",
	"components": [{
		"name": "NativeRadixApp",
		"component_site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [{
			"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#state:0",
			"initial_value": "0"
		}],
		"effect_sites": [],
		"store_sites": [{
			"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#store:0",
			"source_expression": "props.openStore"
		}, {
			"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:NativeRadixApp#store:1",
			"source_expression": "props.pointStore"
		}],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": ["compiler/fixtures/native-radix-dialog.tsx#opaque-sink:1321"]
	}, {
		"name": "PendingGate",
		"component_site_id": "compiler/fixtures/native-radix-dialog.tsx#component:PendingGate",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [{
			"site_id": "compiler/fixtures/native-radix-dialog.tsx#component:PendingGate#store:0",
			"source_expression": "props.resource"
		}],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}]
};
import * as __nativeJsx from "@r3act/core";
