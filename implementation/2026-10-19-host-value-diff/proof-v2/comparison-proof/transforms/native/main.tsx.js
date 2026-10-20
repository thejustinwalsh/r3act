import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "main.tsx",
	"module_revision": "native-v1-c4277cd852b26941",
	"owners": [
		{
			"site_id": "main.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:PendingDom",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:Row",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [{
		"site_id": "main.tsx#component:App#state:0",
		"owner_site_id": "main.tsx#component:App",
		"kind": "state",
		"provenance": "tracked"
	}, {
		"site_id": "main.tsx#component:PendingDom#store:0",
		"owner_site_id": "main.tsx#component:PendingDom",
		"kind": "use-input",
		"provenance": "opaque"
	}],
	"sinks": [{
		"site_id": "main.tsx#numeric-sink:2179",
		"owner_site_id": "main.tsx#component:App",
		"source_sites": ["main.tsx#component:App#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}],
	"operations": [
		{
			"site_id": "main.tsx#component:App#collection:0",
			"owner_site_id": "main.tsx#component:App",
			"kind": "collection",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "main.tsx#component:PendingDom#store:0",
			"owner_site_id": "main.tsx#component:PendingDom",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "main.tsx#component:Row#effect:0",
			"owner_site_id": "main.tsx#component:Row",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": { "main.tsx#component:App#state:0": ["main.tsx#numeric-sink:2179"] },
		"execution_order": ["main.tsx#numeric-sink:2179"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "main.tsx" && event.previousRevision === "native-v1-c4277cd852b26941" && event.previousInstance === "native-v1-c4277cd852b26941") __invalidateNativeSemanticPlan("main.tsx", "native-v1-c4277cd852b26941");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/core */
import { Suspense, createKeyedCollection, createWorld } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from "@r3act/core";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: "main.tsx#component:App",
	sinkId: "main.tsx#numeric-sink:2179",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: ["main.tsx#component:App#state:0"]
}];
__nativeDefineComponent("main.tsx#component:App", App, {
	propOnlySites: [],
	closedCollectionSites: []
});
__nativeDefineComponent("main.tsx#component:PendingDom", PendingDom, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "main.tsx#component:PendingDom",
		"host": {
			"children": [],
			"key": "pending-dom",
			"props": [["data-dom-pending", {
				"expressions": [{
					"index": 0,
					"kind": "input"
				}],
				"kind": "template",
				"parts": ["ready-", ""]
			}]],
			"tag": "span"
		},
		"inputs": [{
			"paths": [["x"]],
			"storeProp": "resource",
			"storeUseSiteId": "main.tsx#component:PendingDom#store:0"
		}],
		"moduleRevision": "native-v1-c4277cd852b26941",
		"schemaVersion": 5
	}
});
__nativeDefineComponent("main.tsx#component:Row", Row, { propOnlySites: [] });
import { createDOMRoot } from "@r3act/host-dom";
import { createThreeNativeRoot } from "@r3act/host-three";
import { Scene } from "three";
import { SceneApp } from "./scene";
import { verifyPublicCopyHost } from "./copy-host";
import { createPending, values } from "./state";
const copyHostContract = verifyPublicCopyHost();
const rows = createKeyedCollection([{
	id: "a",
	label: "Alpha"
}, {
	id: "b",
	label: "Beta"
}], (row) => row.id);
const trace = {
	mounts: {},
	cleanups: {}
};
let setSceneStep = null;
function Row(props) {
	__nativeUseEffectAt("main.tsx#component:Row#effect:0", () => {
		const id = props.row.id;
		trace.mounts[id] = (trace.mounts[id] ?? 0) + 1;
		return () => {
			trace.cleanups[id] = (trace.cleanups[id] ?? 0) + 1;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("li", {
		key: props.row.id,
		"data-row": props.row.id
	}, props.row.label);
}
function PendingDom(props) {
	const value = __nativeUseAt("main.tsx#component:PendingDom#store:0", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("span", {
		key: "pending-dom",
		"data-dom-pending": `ready-${value.x}`
	});
}
export function App(props) {
	const [step, setStep] = __nativeUseStateAt("main.tsx#component:App#state:0", 0);
	const update = () => {
		values.position.set(4, 5, 6);
		values.rotation[1] = .5;
		values.style.color = "blue";
		delete values.style.opacity;
		values.scalar = "second";
		setStep(1);
		setSceneStep?.(1);
	};
	return /* @__PURE__ */ __nativeJsx.jsx("main", null, /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		"data-action": "update",
		onClick: update
	}, "Update values"), /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		"data-action": "structure",
		onClick: () => rows.apply(rows.version, [
			{
				type: "move",
				key: "b",
				beforeKey: "a"
			},
			{
				type: "remove",
				key: "a"
			},
			{
				type: "insert",
				key: "c",
				value: {
					id: "c",
					label: "Charlie"
				},
				beforeKey: null
			}
		])
	}, "Change rows"), /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "target",
		"data-target": "value",
		"data-scalar": values.scalar,
		"data-step": __nativeBindStatePropAt("main.tsx#component:App#state:0", (step) => step, __nativeNumericPrograms[0]),
		style: values.style
	}), /* @__PURE__ */ __nativeJsx.jsx("ul", {
		key: "rows",
		"data-list": "rows"
	}, __nativeRenderCollectionAt("main.tsx#component:App#collection:0", rows, ((row) => /* @__PURE__ */ __nativeJsx.jsx(Row, { row })), { requiresOwnerRender: true })), /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("span", {
			key: "pending-dom",
			"data-dom-pending": "waiting"
		}),
		__nativeBoundarySite: "main.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(PendingDom, {
		key: "pending-dom-owner",
		resource: props.resource
	})));
}
export function mountHostValueDiff(host) {
	const world = createWorld();
	const scene = new Scene();
	const pending = createPending();
	const dom = createDOMRoot(host, {
		world,
		rootId: "host-value-dom"
	});
	const three = createThreeNativeRoot(scene, { rootOptions: {
		world,
		rootId: "host-value-three"
	} });
	let disposed = false;
	let sceneStep = 0;
	setSceneStep = (value) => {
		sceneStep = value;
		three.root.update(/* @__PURE__ */ __nativeJsx.jsx(SceneApp, {
			step: value,
			resource: pending.resource
		}));
	};
	dom.mount(/* @__PURE__ */ __nativeJsx.jsx(App, { resource: pending.resource }));
	three.root.mount(/* @__PURE__ */ __nativeJsx.jsx(SceneApp, {
		step: sceneStep,
		resource: pending.resource
	}));
	const target = host.querySelector("[data-target=\"value\"]");
	const initialRows = Object.fromEntries(["a", "b"].map((id) => [id, host.querySelector(`[data-row="${id}"]`)]));
	const mesh = scene.children[0]?.children.find((child) => child.name === "step-0");
	const fallback = scene.children[0]?.children.find((child) => child.name === "waiting");
	const snapshot = () => {
		const element = host.querySelector("[data-target=\"value\"]");
		const sceneRoot = scene.children[0];
		const active = sceneRoot?.children.find((child) => child.name.startsWith("step-"));
		const pendingChild = sceneRoot?.children.find((child) => child.name === "waiting" || child.name.startsWith("ready-"));
		return {
			color: element?.style.color ?? null,
			opacity: element?.style.opacity ?? null,
			scalar: element?.getAttribute("data-scalar") ?? null,
			step: element?.getAttribute("data-step") ?? null,
			targetRetained: element === target,
			rowOrder: Array.from(host.querySelectorAll("[data-row]")).map((node) => node.getAttribute("data-row")),
			rowBRetained: host.querySelector("[data-row=\"b\"]") === initialRows.b,
			mounts: { ...trace.mounts },
			cleanups: { ...trace.cleanups },
			meshRetained: active === mesh,
			position: active?.position.toArray() ?? null,
			rotation: active?.rotation.toArray().slice(0, 3) ?? null,
			pending: pending.resource.status.status,
			pendingName: pendingChild?.name ?? null,
			domPending: host.querySelector("[data-dom-pending]")?.getAttribute("data-dom-pending") ?? null,
			fallbackRetained: pendingChild === fallback,
			dom: dom.diagnostics(),
			three: three.root.diagnostics(),
			threeHost: three.host.diagnostics,
			copyHostContract,
			disposed
		};
	};
	return {
		snapshot,
		resolvePending(x) {
			pending.resolve({ x });
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			setSceneStep = null;
			dom.dispose();
			three.dispose();
		}
	};
}
window.hostValueProof = mountHostValueDiff(document.getElementById("app"));
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-c4277cd852b26941",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "main.tsx",
		"module_revision": "native-v1-c4277cd852b26941",
		"owners": [
			{
				"site_id": "main.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:PendingDom",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:Row",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [{
			"site_id": "main.tsx#component:App#state:0",
			"owner_site_id": "main.tsx#component:App",
			"kind": "state",
			"provenance": "tracked"
		}, {
			"site_id": "main.tsx#component:PendingDom#store:0",
			"owner_site_id": "main.tsx#component:PendingDom",
			"kind": "use-input",
			"provenance": "opaque"
		}],
		"sinks": [{
			"site_id": "main.tsx#numeric-sink:2179",
			"owner_site_id": "main.tsx#component:App",
			"source_sites": ["main.tsx#component:App#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}],
		"operations": [
			{
				"site_id": "main.tsx#component:App#collection:0",
				"owner_site_id": "main.tsx#component:App",
				"kind": "collection",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "main.tsx#component:PendingDom#store:0",
				"owner_site_id": "main.tsx#component:PendingDom",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "main.tsx#component:Row#effect:0",
				"owner_site_id": "main.tsx#component:Row",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": { "main.tsx#component:App#state:0": ["main.tsx#numeric-sink:2179"] },
			"execution_order": ["main.tsx#numeric-sink:2179"]
		}
	},
	"source_file": "main.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/core */\n// @native-ui\nimport { Suspense, createKeyedCollection, createWorld, use, useEffect, useState } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \"main.tsx#component:App\", sinkId: \"main.tsx#numeric-sink:2179\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\"main.tsx#component:App#state:0\"] }] as const;\n__nativeDefineComponent(\"main.tsx#component:App\", App, { propOnlySites: [], closedCollectionSites: [] });\n__nativeDefineComponent(\"main.tsx#component:PendingDom\", PendingDom, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"main.tsx#component:PendingDom\",\"host\":{\"children\":[],\"key\":\"pending-dom\",\"props\":[[\"data-dom-pending\",{\"expressions\":[{\"index\":0,\"kind\":\"input\"}],\"kind\":\"template\",\"parts\":[\"ready-\",\"\"]}]],\"tag\":\"span\"},\"inputs\":[{\"paths\":[[\"x\"]],\"storeProp\":\"resource\",\"storeUseSiteId\":\"main.tsx#component:PendingDom#store:0\"}],\"moduleRevision\":\"native-v1-c4277cd852b26941\",\"schemaVersion\":5} });\n__nativeDefineComponent(\"main.tsx#component:Row\", Row, { propOnlySites: [] });\nimport type { AsyncResource } from \"@r3act/core\";\nimport { createDOMRoot } from \"@r3act/host-dom\";\nimport { createThreeNativeRoot } from \"@r3act/host-three\";\nimport { Scene } from \"three\";\nimport { SceneApp } from \"./scene\";\nimport { verifyPublicCopyHost } from \"./copy-host\";\nimport { createPending, values } from \"./state\";\n\nconst copyHostContract = verifyPublicCopyHost();\n\ntype RowValue = { id: string; label: string };\nconst rows = createKeyedCollection<RowValue>([\n  { id: \"a\", label: \"Alpha\" }, { id: \"b\", label: \"Beta\" },\n], row => row.id);\nconst trace = { mounts: {} as Record<string, number>, cleanups: {} as Record<string, number> };\nlet setSceneStep: ((value: number) => void) | null = null;\nfunction Row(props: { row: RowValue }) {\n  __nativeUseEffectAt(\"main.tsx#component:Row#effect:0\", () => {\n    const id = props.row.id;\n    trace.mounts[id] = (trace.mounts[id] ?? 0) + 1;\n    return () => { trace.cleanups[id] = (trace.cleanups[id] ?? 0) + 1; };\n  });\n  return <li key={props.row.id} data-row={props.row.id}>{props.row.label}</li>;\n}\nfunction PendingDom(props: { resource: AsyncResource<{ x: number }> }) {\n  const value = __nativeUseAt(\"main.tsx#component:PendingDom#store:0\", props.resource);\n  return <span key=\"pending-dom\" data-dom-pending={`ready-${value.x}`} />;\n}\nexport function App(props: { resource: AsyncResource<{ x: number }> }) {\n  const [step, setStep] = __nativeUseStateAt(\"main.tsx#component:App#state:0\", 0);\n  const update = () => {\n    values.position.set(4, 5, 6);\n    values.rotation[1] = 0.5;\n    values.style.color = \"blue\";\n    delete values.style.opacity;\n    values.scalar = \"second\";\n    setStep(1);\n    setSceneStep?.(1);\n  };\n  return <main>\n    <button type=\"button\" data-action=\"update\" onClick={update}>Update values</button>\n    <button type=\"button\" data-action=\"structure\" onClick={() => rows.apply(rows.version, [\n      { type: \"move\", key: \"b\", beforeKey: \"a\" },\n      { type: \"remove\", key: \"a\" },\n      { type: \"insert\", key: \"c\", value: { id: \"c\", label: \"Charlie\" }, beforeKey: null },\n    ])}>Change rows</button>\n    <output key=\"target\" data-target=\"value\" data-scalar={values.scalar}\n      data-step={__nativeBindStatePropAt(\"main.tsx#component:App#state:0\", (step) => (step), __nativeNumericPrograms[0])} style={values.style} />\n    <ul key=\"rows\" data-list=\"rows\">{__nativeRenderCollectionAt(\"main.tsx#component:App#collection:0\", rows, (row => <Row row={row} />), { requiresOwnerRender: true })}</ul>\n    <Suspense fallback={<span key=\"pending-dom\" data-dom-pending=\"waiting\" />} __nativeBoundarySite=\"main.tsx#boundary:0\">\n      <PendingDom key=\"pending-dom-owner\" resource={props.resource} />\n    </Suspense>\n  </main>;\n}\n\nexport function mountHostValueDiff(host: HTMLElement) {\n  const world = createWorld();\n  const scene = new Scene();\n  const pending = createPending();\n  const dom = createDOMRoot(host, { world, rootId: \"host-value-dom\" });\n  const three = createThreeNativeRoot(scene, { rootOptions: { world, rootId: \"host-value-three\" } });\n  let disposed = false;\n  let sceneStep = 0;\n  setSceneStep = value => { sceneStep = value; three.root.update(<SceneApp step={value} resource={pending.resource} />); };\n  dom.mount(<App resource={pending.resource} />);\n  three.root.mount(<SceneApp step={sceneStep} resource={pending.resource} />);\n  const target = host.querySelector('[data-target=\"value\"]');\n  const initialRows = Object.fromEntries([\"a\", \"b\"].map(id => [id, host.querySelector(`[data-row=\"${id}\"]`)]));\n  const mesh = scene.children[0]?.children.find(child => child.name === \"step-0\");\n  const fallback = scene.children[0]?.children.find(child => child.name === \"waiting\");\n  const snapshot = () => {\n    const element = host.querySelector<HTMLElement>('[data-target=\"value\"]');\n    const sceneRoot = scene.children[0];\n    const active = sceneRoot?.children.find(child => child.name.startsWith(\"step-\"));\n    const pendingChild = sceneRoot?.children.find(child => child.name === \"waiting\" || child.name.startsWith(\"ready-\"));\n    return { color: element?.style.color ?? null, opacity: element?.style.opacity ?? null,\n      scalar: element?.getAttribute(\"data-scalar\") ?? null,\n      step: element?.getAttribute(\"data-step\") ?? null,\n      targetRetained: element === target,\n      rowOrder: Array.from(host.querySelectorAll(\"[data-row]\")).map(node => node.getAttribute(\"data-row\")),\n      rowBRetained: host.querySelector('[data-row=\"b\"]') === initialRows.b,\n      mounts: { ...trace.mounts }, cleanups: { ...trace.cleanups },\n      meshRetained: active === mesh, position: active?.position.toArray() ?? null,\n      rotation: active?.rotation.toArray().slice(0, 3) ?? null,\n      pending: pending.resource.status.status, pendingName: pendingChild?.name ?? null,\n      domPending: host.querySelector(\"[data-dom-pending]\")?.getAttribute(\"data-dom-pending\") ?? null,\n      fallbackRetained: pendingChild === fallback,\n      dom: dom.diagnostics(), three: three.root.diagnostics(),\n      threeHost: three.host.diagnostics, copyHostContract, disposed };\n  };\n  return { snapshot, resolvePending(x: number) { pending.resolve({ x }); },\n    dispose() { if (disposed) return; disposed = true; setSceneStep = null; dom.dispose(); three.dispose(); } };\n}\n\n(window as Window & { hostValueProof?: ReturnType<typeof mountHostValueDiff> }).hostValueProof =\n  mountHostValueDiff(document.getElementById(\"app\")!);\n",
	"components": [
		{
			"name": "App",
			"component_site_id": "main.tsx#component:App",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": "main.tsx#component:App#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": "main.tsx#component:App#collection:0",
				"source_expression": "rows",
				"row_parameter": "row",
				"requires_owner_render": true
			}],
			"numeric_sinks": [{
				"sink_id": "main.tsx#numeric-sink:2179",
				"source_sites": ["main.tsx#component:App#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		},
		{
			"name": "PendingDom",
			"component_site_id": "main.tsx#component:PendingDom",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "main.tsx#component:PendingDom#store:0",
				"source_expression": "props.resource"
			}],
			"closedStoreHostProgram": {
				"componentProgramId": "main.tsx#component:PendingDom",
				"host": {
					"children": [],
					"key": "pending-dom",
					"props": [["data-dom-pending", {
						"expressions": [{
							"index": 0,
							"kind": "input"
						}],
						"kind": "template",
						"parts": ["ready-", ""]
					}]],
					"tag": "span"
				},
				"inputs": [{
					"paths": [["x"]],
					"storeProp": "resource",
					"storeUseSiteId": "main.tsx#component:PendingDom#store:0"
				}],
				"moduleRevision": "native-v1-c4277cd852b26941",
				"schemaVersion": 5
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Row",
			"component_site_id": "main.tsx#component:Row",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [{ "site_id": "main.tsx#component:Row#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "@r3act/core";
