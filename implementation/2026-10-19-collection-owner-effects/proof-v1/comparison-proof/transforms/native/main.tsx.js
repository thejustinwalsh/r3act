import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "main.tsx",
	"module_revision": "native-v1-4685edf2b4d5d305",
	"owners": [
		{
			"site_id": "main.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:OpaqueCollection",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:Row",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:SafeCollection",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [{
		"site_id": "main.tsx#component:Row#state:0",
		"owner_site_id": "main.tsx#component:Row",
		"kind": "state",
		"provenance": "tracked"
	}],
	"sinks": [{
		"site_id": "main.tsx#numeric-sink:1412",
		"owner_site_id": "main.tsx#component:Row",
		"source_sites": ["main.tsx#component:Row#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}],
	"operations": [
		{
			"site_id": "main.tsx#component:OpaqueCollection#collection:0",
			"owner_site_id": "main.tsx#component:OpaqueCollection",
			"kind": "collection",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "main.tsx#component:Row#effect:0",
			"owner_site_id": "main.tsx#component:Row",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "main.tsx#component:SafeCollection#collection:0",
			"owner_site_id": "main.tsx#component:SafeCollection",
			"kind": "collection",
			"provenance": "opaque",
			"source_sites": []
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": { "main.tsx#component:Row#state:0": ["main.tsx#numeric-sink:1412"] },
		"execution_order": ["main.tsx#numeric-sink:1412"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "main.tsx" && event.previousRevision === "native-v1-4685edf2b4d5d305" && event.previousInstance === "native-v1-4685edf2b4d5d305") __invalidateNativeSemanticPlan("main.tsx", "native-v1-4685edf2b4d5d305");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/core */
import { createKeyedCollection, createWorld } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, renderCollectionAt as __nativeRenderCollectionAt, bindStatePropAt as __nativeBindStatePropAt } from "@r3act/core";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: "main.tsx#component:Row",
	sinkId: "main.tsx#numeric-sink:1412",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: ["main.tsx#component:Row#state:0"]
}];
__nativeDefineComponent("main.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent("main.tsx#component:OpaqueCollection", OpaqueCollection, {
	propOnlySites: [],
	closedCollectionSites: []
});
__nativeDefineComponent("main.tsx#component:Row", Row, { propOnlySites: [] });
__nativeDefineComponent("main.tsx#component:SafeCollection", SafeCollection, {
	propOnlySites: [],
	closedCollectionSites: ["main.tsx#component:SafeCollection#collection:0"]
});
import { createDOMRoot } from "@r3act/host-dom";
import { createThreeNativeRoot } from "@r3act/host-three";
import { Scene } from "three";
import { SceneApp } from "./scene";
import { createSceneResource } from "./state";
export const opaqueRows = createKeyedCollection([
	{
		id: "a",
		label: "Alpha"
	},
	{
		id: "b",
		label: "Beta"
	},
	{
		id: "c",
		label: "Gamma"
	}
], (row) => row.id);
export const safeRows = createKeyedCollection([{
	id: "p",
	label: "Pure"
}, {
	id: "q",
	label: "Quiet"
}], (row) => row.id);
const trace = {
	value: "A",
	opaqueCalls: 0,
	getterCalls: 0,
	mounts: {},
	cleanups: {},
	setters: {}
};
const opaqueSource = { get value() {
	trace.getterCalls++;
	return trace.value;
} };
function readOpaque() {
	trace.opaqueCalls++;
	return opaqueSource.value;
}
export function Row(props) {
	const { id, label } = props.row;
	const [count, setCount] = __nativeUseStateAt("main.tsx#component:Row#state:0", 0);
	__nativeUseEffectAt("main.tsx#component:Row#effect:0", () => {
		trace.mounts[id] = (trace.mounts[id] ?? 0) + 1;
		trace.setters[id] = setCount;
		return () => {
			trace.cleanups[id] = (trace.cleanups[id] ?? 0) + 1;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("li", {
		key: id,
		"data-row": id,
		"data-count": __nativeBindStatePropAt("main.tsx#component:Row#state:0", (count) => count, __nativeNumericPrograms[0])
	}, label);
}
export function OpaqueCollection() {
	const opaque = readOpaque();
	return /* @__PURE__ */ __nativeJsx.jsx("section", { key: "opaque-section" }, /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "opaque-output",
		"data-opaque": opaque
	}), /* @__PURE__ */ __nativeJsx.jsx("ul", {
		key: "opaque-list",
		"data-list": "opaque"
	}, __nativeRenderCollectionAt("main.tsx#component:OpaqueCollection#collection:0", opaqueRows, ((row) => /* @__PURE__ */ __nativeJsx.jsx(Row, { row })), { requiresOwnerRender: true })));
}
export function SafeCollection() {
	return /* @__PURE__ */ __nativeJsx.jsx("ol", {
		key: "safe-list",
		"data-list": "safe"
	}, __nativeRenderCollectionAt("main.tsx#component:SafeCollection#collection:0", safeRows, ((row) => /* @__PURE__ */ __nativeJsx.jsx(Row, { row }))));
}
export function App() {
	return /* @__PURE__ */ __nativeJsx.jsx("main", null, /* @__PURE__ */ __nativeJsx.jsx("h1", null, "Collection owner effects"), /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		"data-action": "safe",
		onClick: () => {
			safeRows.apply(safeRows.version, [{
				type: "move",
				key: "q",
				beforeKey: "p"
			}]);
		}
	}, "Move safe row"), /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		"data-action": "opaque",
		onClick: () => {
			trace.value = "B";
			opaqueRows.apply(opaqueRows.version, [{
				type: "move",
				key: "c",
				beforeKey: "a"
			}]);
		}
	}, "Move opaque row"), /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		"data-action": "row",
		onClick: () => trace.setters.b?.(7)
	}, "Update row"), /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		"data-action": "structure",
		onClick: () => {
			opaqueRows.apply(opaqueRows.version, [
				{
					type: "remove",
					key: "a"
				},
				{
					type: "insert",
					key: "d",
					value: {
						id: "d",
						label: "Delta"
					},
					beforeKey: "b"
				},
				{
					type: "replace",
					key: "b",
					value: {
						id: "b",
						label: "Bravo"
					}
				}
			]);
		}
	}, "Change structure"), /* @__PURE__ */ __nativeJsx.jsx(OpaqueCollection, { key: "opaque-owner" }), /* @__PURE__ */ __nativeJsx.jsx(SafeCollection, { key: "safe-owner" }));
}
export function mountCollectionOwnerScene(host) {
	const world = createWorld();
	const scene = new Scene();
	const pending = createSceneResource();
	const domRoot = createDOMRoot(host, {
		world,
		rootId: "collection-effects-dom"
	});
	const three = createThreeNativeRoot(scene, { rootOptions: {
		world,
		rootId: "collection-effects-three"
	} });
	let disposed = false;
	domRoot.mount(/* @__PURE__ */ __nativeJsx.jsx(App, null));
	three.root.mount(/* @__PURE__ */ __nativeJsx.jsx(SceneApp, { resource: pending.resource }));
	const identities = Object.fromEntries([
		"a",
		"b",
		"c",
		"p",
		"q"
	].map((id) => [id, host.querySelector(`[data-row="${id}"]`)]));
	const opaqueIdentity = host.querySelector("[data-opaque]");
	const sceneFallback = scene.children[0]?.children[0];
	const snapshot = () => {
		const list = (name) => Array.from(host.querySelectorAll(`[data-list="${name}"] [data-row]`)).map((node) => node.getAttribute("data-row"));
		const row = (id) => host.querySelector(`[data-row="${id}"]`);
		const sceneChild = scene.children[0]?.children[0];
		return {
			opaque: host.querySelector("[data-opaque]")?.getAttribute("data-opaque") ?? null,
			opaqueRetained: host.querySelector("[data-opaque]") === opaqueIdentity,
			opaqueCalls: trace.opaqueCalls,
			getterCalls: trace.getterCalls,
			opaqueOrder: list("opaque"),
			safeOrder: list("safe"),
			rowBCount: row("b")?.getAttribute("data-count") ?? null,
			rowBLabel: row("b")?.textContent ?? null,
			retained: Object.fromEntries(Object.entries(identities).map(([id, node]) => [id, row(id) === node])),
			mounts: { ...trace.mounts },
			cleanups: { ...trace.cleanups },
			sceneStatus: pending.resource.status.status,
			sceneName: sceneChild?.name ?? null,
			sceneFallbackRetained: sceneChild === sceneFallback,
			scenePosition: sceneChild?.children[0]?.position.toArray() ?? null,
			dom: domRoot.diagnostics(),
			three: three.root.diagnostics(),
			threeHost: three.host.diagnostics,
			disposed
		};
	};
	return {
		snapshot,
		resolveScene(x) {
			pending.resolve({ sample: { x } });
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			domRoot.dispose();
			three.dispose();
		}
	};
}
const host = document.getElementById("app");
window.collectionOwnerProof = mountCollectionOwnerScene(host);
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-4685edf2b4d5d305",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "main.tsx",
		"module_revision": "native-v1-4685edf2b4d5d305",
		"owners": [
			{
				"site_id": "main.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:OpaqueCollection",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:Row",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:SafeCollection",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [{
			"site_id": "main.tsx#component:Row#state:0",
			"owner_site_id": "main.tsx#component:Row",
			"kind": "state",
			"provenance": "tracked"
		}],
		"sinks": [{
			"site_id": "main.tsx#numeric-sink:1412",
			"owner_site_id": "main.tsx#component:Row",
			"source_sites": ["main.tsx#component:Row#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}],
		"operations": [
			{
				"site_id": "main.tsx#component:OpaqueCollection#collection:0",
				"owner_site_id": "main.tsx#component:OpaqueCollection",
				"kind": "collection",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "main.tsx#component:Row#effect:0",
				"owner_site_id": "main.tsx#component:Row",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "main.tsx#component:SafeCollection#collection:0",
				"owner_site_id": "main.tsx#component:SafeCollection",
				"kind": "collection",
				"provenance": "opaque",
				"source_sites": []
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": { "main.tsx#component:Row#state:0": ["main.tsx#numeric-sink:1412"] },
			"execution_order": ["main.tsx#numeric-sink:1412"]
		}
	},
	"source_file": "main.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/core */\n// @native-ui\nimport { createKeyedCollection, createWorld, useEffect, useState } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \"main.tsx#component:Row\", sinkId: \"main.tsx#numeric-sink:1412\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\"main.tsx#component:Row#state:0\"] }] as const;\n__nativeDefineComponent(\"main.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"main.tsx#component:OpaqueCollection\", OpaqueCollection, { propOnlySites: [], closedCollectionSites: [] });\n__nativeDefineComponent(\"main.tsx#component:Row\", Row, { propOnlySites: [] });\n__nativeDefineComponent(\"main.tsx#component:SafeCollection\", SafeCollection, { propOnlySites: [], closedCollectionSites: [\"main.tsx#component:SafeCollection#collection:0\"] });\nimport { createDOMRoot } from \"@r3act/host-dom\";\nimport { createThreeNativeRoot } from \"@r3act/host-three\";\nimport { Scene } from \"three\";\nimport { SceneApp } from \"./scene\";\nimport { createSceneResource } from \"./state\";\n\ntype Item = { id: string; label: string };\nexport const opaqueRows = createKeyedCollection<Item>([\n  { id: \"a\", label: \"Alpha\" }, { id: \"b\", label: \"Beta\" }, { id: \"c\", label: \"Gamma\" },\n], row => row.id);\nexport const safeRows = createKeyedCollection<Item>([\n  { id: \"p\", label: \"Pure\" }, { id: \"q\", label: \"Quiet\" },\n], row => row.id);\nconst trace = {\n  value: \"A\", opaqueCalls: 0, getterCalls: 0,\n  mounts: {} as Record<string, number>, cleanups: {} as Record<string, number>,\n  setters: {} as Record<string, (value: number) => void>,\n};\nconst opaqueSource = { get value() { trace.getterCalls++; return trace.value; } };\nfunction readOpaque() { trace.opaqueCalls++; return opaqueSource.value; }\nexport function Row(props: { row: Item }) {\n  const { id, label } = props.row;\n  const [count, setCount] = __nativeUseStateAt(\"main.tsx#component:Row#state:0\", 0);\n  __nativeUseEffectAt(\"main.tsx#component:Row#effect:0\", () => {\n    trace.mounts[id] = (trace.mounts[id] ?? 0) + 1;\n    trace.setters[id] = setCount;\n    return () => { trace.cleanups[id] = (trace.cleanups[id] ?? 0) + 1; };\n  });\n  return <li key={id} data-row={id} data-count={__nativeBindStatePropAt(\"main.tsx#component:Row#state:0\", (count) => (count), __nativeNumericPrograms[0])}>{label}</li>;\n}\nexport function OpaqueCollection() {\n  const opaque = readOpaque();\n  return <section key=\"opaque-section\">\n    <output key=\"opaque-output\" data-opaque={opaque} />\n    <ul key=\"opaque-list\" data-list=\"opaque\">{__nativeRenderCollectionAt(\"main.tsx#component:OpaqueCollection#collection:0\", opaqueRows, (row => <Row row={row} />), { requiresOwnerRender: true })}</ul>\n  </section>;\n}\nexport function SafeCollection() {\n  return <ol key=\"safe-list\" data-list=\"safe\">{__nativeRenderCollectionAt(\"main.tsx#component:SafeCollection#collection:0\", safeRows, (row => <Row row={row} />))}</ol>;\n}\nexport function App() {\n  return <main>\n    <h1>Collection owner effects</h1>\n    <button type=\"button\" data-action=\"safe\" onClick={() => {\n      safeRows.apply(safeRows.version, [{ type: \"move\", key: \"q\", beforeKey: \"p\" }]);\n    }}>Move safe row</button>\n    <button type=\"button\" data-action=\"opaque\" onClick={() => {\n      trace.value = \"B\";\n      opaqueRows.apply(opaqueRows.version, [{ type: \"move\", key: \"c\", beforeKey: \"a\" }]);\n    }}>Move opaque row</button>\n    <button type=\"button\" data-action=\"row\" onClick={() => trace.setters.b?.(7)}>Update row</button>\n    <button type=\"button\" data-action=\"structure\" onClick={() => {\n      opaqueRows.apply(opaqueRows.version, [\n        { type: \"remove\", key: \"a\" },\n        { type: \"insert\", key: \"d\", value: { id: \"d\", label: \"Delta\" }, beforeKey: \"b\" },\n        { type: \"replace\", key: \"b\", value: { id: \"b\", label: \"Bravo\" } },\n      ]);\n    }}>Change structure</button>\n    <OpaqueCollection key=\"opaque-owner\" />\n    <SafeCollection key=\"safe-owner\" />\n  </main>;\n}\n\nexport function mountCollectionOwnerScene(host: HTMLElement) {\n  const world = createWorld();\n  const scene = new Scene();\n  const pending = createSceneResource();\n  const domRoot = createDOMRoot(host, { world, rootId: \"collection-effects-dom\" });\n  const three = createThreeNativeRoot(scene,\n    { rootOptions: { world, rootId: \"collection-effects-three\" } });\n  let disposed = false;\n  domRoot.mount(<App />);\n  three.root.mount(<SceneApp resource={pending.resource} />);\n  const identities = Object.fromEntries([\"a\", \"b\", \"c\", \"p\", \"q\"].map(id =>\n    [id, host.querySelector(`[data-row=\"${id}\"]`)]));\n  const opaqueIdentity = host.querySelector(\"[data-opaque]\");\n  const sceneFallback = scene.children[0]?.children[0];\n  const snapshot = () => {\n    const list = (name: string) => Array.from(host.querySelectorAll(`[data-list=\"${name}\"] [data-row]`))\n      .map(node => node.getAttribute(\"data-row\"));\n    const row = (id: string) => host.querySelector(`[data-row=\"${id}\"]`);\n    const sceneChild = scene.children[0]?.children[0];\n    return { opaque: host.querySelector(\"[data-opaque]\")?.getAttribute(\"data-opaque\") ?? null,\n      opaqueRetained: host.querySelector(\"[data-opaque]\") === opaqueIdentity,\n      opaqueCalls: trace.opaqueCalls, getterCalls: trace.getterCalls,\n      opaqueOrder: list(\"opaque\"), safeOrder: list(\"safe\"),\n      rowBCount: row(\"b\")?.getAttribute(\"data-count\") ?? null,\n      rowBLabel: row(\"b\")?.textContent ?? null,\n      retained: Object.fromEntries(Object.entries(identities).map(([id, node]) => [id, row(id) === node])),\n      mounts: { ...trace.mounts }, cleanups: { ...trace.cleanups },\n      sceneStatus: pending.resource.status.status,\n      sceneName: sceneChild?.name ?? null,\n      sceneFallbackRetained: sceneChild === sceneFallback,\n      scenePosition: sceneChild?.children[0]?.position.toArray() ?? null,\n      dom: domRoot.diagnostics(), three: three.root.diagnostics(),\n      threeHost: three.host.diagnostics, disposed };\n  };\n  return { snapshot,\n    resolveScene(x: number) { pending.resolve({ sample: { x } }); },\n    dispose() { if (disposed) return; disposed = true; domRoot.dispose(); three.dispose(); } };\n}\n\nconst host = document.getElementById(\"app\")!;\n(window as Window & { collectionOwnerProof?: ReturnType<typeof mountCollectionOwnerScene> })\n  .collectionOwnerProof = mountCollectionOwnerScene(host);\n",
	"components": [
		{
			"name": "App",
			"component_site_id": "main.tsx#component:App",
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
			"name": "OpaqueCollection",
			"component_site_id": "main.tsx#component:OpaqueCollection",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": "main.tsx#component:OpaqueCollection#collection:0",
				"source_expression": "opaqueRows",
				"row_parameter": "row",
				"requires_owner_render": true
			}],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Row",
			"component_site_id": "main.tsx#component:Row",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": "main.tsx#component:Row#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": "main.tsx#component:Row#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": "main.tsx#numeric-sink:1412",
				"source_sites": ["main.tsx#component:Row#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		},
		{
			"name": "SafeCollection",
			"component_site_id": "main.tsx#component:SafeCollection",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": "main.tsx#component:SafeCollection#collection:0",
				"source_expression": "safeRows",
				"row_parameter": "row",
				"requires_owner_render": false
			}],
			"closedCollectionSites": ["main.tsx#component:SafeCollection#collection:0"],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "@r3act/core";
