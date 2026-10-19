import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "main.tsx",
	"module_revision": "native-v1-717a684371edf2ef",
	"owners": [
		{
			"site_id": "main.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:DialogSlot",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:ForwardHeldDom",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:HeldDom",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:NumericCounter",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": "main.tsx#component:DialogSlot#state:0",
			"owner_site_id": "main.tsx#component:DialogSlot",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": "main.tsx#component:DialogSlot#store:0",
			"owner_site_id": "main.tsx#component:DialogSlot",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "main.tsx#component:HeldDom#store:0",
			"owner_site_id": "main.tsx#component:HeldDom",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "main.tsx#component:HeldDom#store:1",
			"owner_site_id": "main.tsx#component:HeldDom",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "main.tsx#component:NumericCounter#state:0",
			"owner_site_id": "main.tsx#component:NumericCounter",
			"kind": "state",
			"provenance": "tracked"
		}
	],
	"sinks": [
		{
			"site_id": "main.tsx#opaque-sink:1603",
			"owner_site_id": "main.tsx#component:DialogSlot",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		},
		{
			"site_id": "main.tsx#opaque-sink:1672",
			"owner_site_id": "main.tsx#component:DialogSlot",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		},
		{
			"site_id": "main.tsx#numeric-sink:750",
			"owner_site_id": "main.tsx#component:NumericCounter",
			"source_sites": ["main.tsx#component:NumericCounter#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}
	],
	"operations": [
		{
			"site_id": "main.tsx#component:DialogSlot#store:0",
			"owner_site_id": "main.tsx#component:DialogSlot",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "main.tsx#component:HeldDom#store:0",
			"owner_site_id": "main.tsx#component:HeldDom",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "main.tsx#component:HeldDom#store:1",
			"owner_site_id": "main.tsx#component:HeldDom",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": { "main.tsx#component:NumericCounter#state:0": ["main.tsx#numeric-sink:750"] },
		"execution_order": ["main.tsx#numeric-sink:750"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "main.tsx" && event.previousRevision === "native-v1-717a684371edf2ef" && event.previousInstance === "native-v1-717a684371edf2ef") __invalidateNativeSemanticPlan("main.tsx", "native-v1-717a684371edf2ef");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/core */
import { NativeRootWorkQueue, Suspense, createWorld } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from "@r3act/core";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: "main.tsx#component:NumericCounter",
	sinkId: "main.tsx#numeric-sink:750",
	closedExpression: {
		"kind": "binary",
		"left": {
			"index": 0,
			"kind": "input"
		},
		"operator": "+",
		"right": {
			"kind": "literal",
			"value": 1
		}
	},
	sourceSites: ["main.tsx#component:NumericCounter#state:0"]
}];
const __nativeOwnerCutKernels = [{
	schemaVersion: 2,
	programId: "main.tsx#component:NumericCounter",
	slotCount: 1,
	sinkIds: ["main.tsx#numeric-sink:750"],
	executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) {
		let stagedCount = 0;
		for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) {
			const rowState = rowStates[changeIndex];
			switch (changedSlots[changeIndex]) {
				case 0: {
					if ((rowState.seenMask & 1) === 0) {
						rowState.seenMask |= 1;
						const next = rowState.inputValues[0] + 1;
						const sinkState = rowState.sinks[0];
						const last = sinkState.lastValue;
						const same = last === next ? typeof next !== "number" || typeof last === "number" && (last !== 0 || 1 / last === 1 / next) : typeof last === "number" && typeof next === "number" && last !== last && next !== next;
						if (!same) {
							stagedInputIndices[stagedCount] = changeIndex;
							stagedSinkIds[stagedCount] = 0;
							stagedValues[stagedCount] = next;
							stagedCount++;
						}
					}
					break;
				}
			}
		}
		return stagedCount;
	}
}];
import { createDOMRoot } from "@r3act/host-dom";
import { createThreeNativeRoot } from "@r3act/host-three";
import { RadixDialog } from "@r3act/react-bridge/radix-dialog";
import { createElement } from "react";
import { Scene } from "three";
import { ReactPanel } from "./react-panel";
import { SceneApp } from "./scene";
import { createDomain, heldState, sample } from "./state";
export const NumericCounter = __nativeDefineComponent("main.tsx#component:NumericCounter", { NumericCounter: () => {
	const [count] = __nativeUseStateAt("main.tsx#component:NumericCounter#state:0", 0);
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "numeric-counter",
		"data-count": __nativeBindStatePropAt("main.tsx#component:NumericCounter#state:0", (count) => count + 1, __nativeNumericPrograms[0])
	});
} }.NumericCounter, {
	propOnlySites: ["main.tsx#component:NumericCounter#state:0"],
	stateLayout: {
		schemaVersion: 1,
		programId: "main.tsx#component:NumericCounter",
		moduleRevision: "native-v1-717a684371edf2ef",
		slots: [{
			siteId: "main.tsx#component:NumericCounter#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
export const HeldDom = __nativeDefineComponent("main.tsx#component:HeldDom", { HeldDom: (props) => {
	const a = __nativeUseAt("main.tsx#component:HeldDom#store:0", props.heldA);
	const detail = __nativeUseAt("main.tsx#component:HeldDom#store:1", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("div", {
		key: "held-dom",
		"data-held": a.vector.x + detail.sample.x,
		"data-accepted-a": a.vector.x
	}, /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "held-dom-value",
		"data-value": a.vector.y + detail.sample.y
	}));
} }.HeldDom, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "main.tsx#component:HeldDom",
		"host": {
			"children": [{
				"host": {
					"children": [],
					"key": "held-dom-value",
					"props": [["data-value", {
						"kind": "binary",
						"left": {
							"index": 1,
							"kind": "input"
						},
						"operator": "+",
						"right": {
							"index": 3,
							"kind": "input"
						}
					}]],
					"tag": "output"
				},
				"kind": "host"
			}],
			"key": "held-dom",
			"props": [["data-held", {
				"kind": "binary",
				"left": {
					"index": 0,
					"kind": "input"
				},
				"operator": "+",
				"right": {
					"index": 2,
					"kind": "input"
				}
			}], ["data-accepted-a", {
				"index": 0,
				"kind": "input"
			}]],
			"tag": "div"
		},
		"inputs": [{
			"paths": [["vector", "x"], ["vector", "y"]],
			"storeProp": "heldA",
			"storeUseSiteId": "main.tsx#component:HeldDom#store:0"
		}, {
			"paths": [["sample", "x"], ["sample", "y"]],
			"storeProp": "resource",
			"storeUseSiteId": "main.tsx#component:HeldDom#store:1"
		}],
		"moduleRevision": "native-v1-717a684371edf2ef",
		"schemaVersion": 5
	}
});
export const ForwardHeldDom = __nativeDefineComponent("main.tsx#component:ForwardHeldDom", { ForwardHeldDom: (props) => /* @__PURE__ */ __nativeJsx.jsx(HeldDom, {
	key: "held-owner",
	heldA: props.heldA,
	resource: props.resource
}) }.ForwardHeldDom, {
	propOnlySites: [],
	closedComponentForwardProgram: {
		"childComponentProgramId": "main.tsx#component:HeldDom",
		"componentProgramId": "main.tsx#component:ForwardHeldDom",
		"key": "held-owner",
		"moduleRevision": "native-v1-717a684371edf2ef",
		"props": [["heldA", {
			"kind": "prop",
			"name": "heldA"
		}], ["resource", {
			"kind": "prop",
			"name": "resource"
		}]],
		"schemaVersion": 1,
		"childComponent": HeldDom
	}
});
export const DialogSlot = __nativeDefineComponent("main.tsx#component:DialogSlot", { DialogSlot: (props) => {
	const open = __nativeUseAt("main.tsx#component:DialogSlot#store:0", props.domain.independentB);
	const [local, setLocal] = __nativeUseStateAt("main.tsx#component:DialogSlot#state:0", 0);
	return /* @__PURE__ */ __nativeJsx.jsx("div", {
		key: "dialog-slot",
		"data-dialog-slot": "true",
		"data-open": open ? "true" : undefined,
		"data-local": local
	}, /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		"data-action": "local",
		onClick: () => setLocal(local + 1)
	}, "Local ", local), /* @__PURE__ */ __nativeJsx.jsx(RadixDialog, {
		open,
		onOpenChange: (value) => props.domain.independentB.dispatch(value),
		title: "Closed arrow settings",
		description: "Independent scene controls",
		triggerLabel: "Open closed arrow settings",
		closeLabel: "Close closed arrow settings",
		portalContainer: props.portal,
		className: "dialog-content",
		overlayClassName: "dialog-overlay",
		children: createElement(ReactPanel, { trace: props.trace })
	}));
} }.DialogSlot, { propOnlySites: [] });
export const App = __nativeDefineComponent("main.tsx#component:App", { App: (props) => {
	return /* @__PURE__ */ __nativeJsx.jsx("main", null, /* @__PURE__ */ __nativeJsx.jsx("h1", null, "Closed arrow authoring"), /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		"data-action": "open",
		onClick: () => props.domain.independentB.dispatch(true)
	}, "Open settings"), /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		"data-action": "close",
		onClick: () => props.domain.independentB.dispatch(false)
	}, "Close settings"), /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("div", {
			key: "held-dom",
			"data-held": "waiting"
		}, "Waiting"),
		__nativeBoundarySite: "main.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(ForwardHeldDom, {
		key: "held-forward",
		heldA: props.domain.heldA,
		resource: props.domain.detail
	})), /* @__PURE__ */ __nativeJsx.jsx(DialogSlot, {
		key: "dialog-owner",
		...props
	}), /* @__PURE__ */ __nativeJsx.jsx(NumericCounter, { key: "numeric-owner" }));
} }.App, { propOnlySites: [] });
export function mountHeldReaderScene(host, portal) {
	const domain = createDomain();
	const trace = {
		mounts: 0,
		cleanups: 0
	};
	const world = createWorld();
	const scene = new Scene();
	const domRoot = createDOMRoot(host, {
		world,
		rootId: "closed-arrow-dom"
	});
	const three = createThreeNativeRoot(scene, { rootOptions: {
		world,
		rootId: "closed-arrow-three"
	} });
	const queue = new NativeRootWorkQueue();
	const initialPortalParent = portal.parentNode;
	let groupCallbacks = 0;
	let disposed = false;
	domRoot.mount(/* @__PURE__ */ __nativeJsx.jsx(App, {
		domain,
		portal,
		trace
	}));
	three.root.mount(/* @__PURE__ */ __nativeJsx.jsx(SceneApp, { domain }));
	const fallback = host.querySelector("[data-held=\"waiting\"]");
	const numericInitial = host.querySelector("[data-count]");
	const sceneFallback = scene.children[0]?.children[0];
	const group = queue.enqueueResources({
		id: "closed-arrow-dom-three",
		roots: [{
			root: domRoot,
			resources: [domain.detail]
		}, {
			root: three.root,
			resources: [domain.signal]
		}],
		onSettled(outcome) {
			if (outcome.status === "cancelled" && disposed) return;
			if (outcome.status !== "committed") throw outcome.error ?? new Error(`held reader group ${outcome.status}`);
			groupCallbacks++;
		}
	});
	if (group.status !== "pending") throw new Error("held resource group was not admitted");
	const snapshot = () => {
		const held = host.querySelector("[data-held]");
		const slot = host.querySelector("[data-dialog-slot]");
		const sceneHeld = scene.children[0]?.children[0];
		const mesh = sceneHeld?.children[0];
		return {
			groupStatus: group.status,
			groupCallbacks,
			detailStatus: domain.detail.status.status,
			signalStatus: domain.signal.status.status,
			held: held?.getAttribute("data-held") ?? null,
			acceptedA: held?.getAttribute("data-accepted-a") ?? null,
			fallbackRetained: held === fallback,
			threeFallbackRetained: sceneHeld === sceneFallback,
			threePosition: mesh?.position.toArray() ?? null,
			open: slot?.getAttribute("data-open") ?? null,
			local: slot?.getAttribute("data-local") ?? null,
			numeric: host.querySelector("[data-count]")?.getAttribute("data-count") ?? null,
			numericRetained: host.querySelector("[data-count]") === numericInitial,
			dialogPresent: Boolean(portal.querySelector("[role=\"dialog\"]")),
			reactMounts: trace.mounts,
			reactCleanups: trace.cleanups,
			dom: domRoot.diagnostics(),
			three: three.root.diagnostics(),
			threeHost: three.host.diagnostics,
			heldPendingValue: domain.heldA.getState().vector.x,
			heldDomProjection: disposed ? null : domain.heldA.getStateForRoot(domRoot.rootId).vector.x,
			heldThreeProjection: disposed ? null : domain.heldA.getStateForRoot(three.root.rootId).vector.x,
			portalConnected: portal.parentNode === initialPortalParent,
			disposed
		};
	};
	return {
		snapshot,
		setHeldA(x, y) {
			domain.heldA.dispatch(heldState(x, y));
		},
		setOpen(open) {
			domain.independentB.dispatch(open);
		},
		resolveDetail(x = 4, y = 5) {
			domain.resolveDetail(sample(x, y));
		},
		resolveSignal(x = 2, y = 3) {
			domain.resolveSignal(sample(x, y));
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			queue.dispose();
			domRoot.dispose();
			three.dispose();
		}
	};
}
const host = document.getElementById("app");
const portal = document.getElementById("dialog-portal");
window.heldReaderProof = mountHeldReaderScene(host, portal);
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-717a684371edf2ef",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "main.tsx",
		"module_revision": "native-v1-717a684371edf2ef",
		"owners": [
			{
				"site_id": "main.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:DialogSlot",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:ForwardHeldDom",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:HeldDom",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:NumericCounter",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": "main.tsx#component:DialogSlot#state:0",
				"owner_site_id": "main.tsx#component:DialogSlot",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": "main.tsx#component:DialogSlot#store:0",
				"owner_site_id": "main.tsx#component:DialogSlot",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "main.tsx#component:HeldDom#store:0",
				"owner_site_id": "main.tsx#component:HeldDom",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "main.tsx#component:HeldDom#store:1",
				"owner_site_id": "main.tsx#component:HeldDom",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "main.tsx#component:NumericCounter#state:0",
				"owner_site_id": "main.tsx#component:NumericCounter",
				"kind": "state",
				"provenance": "tracked"
			}
		],
		"sinks": [
			{
				"site_id": "main.tsx#opaque-sink:1603",
				"owner_site_id": "main.tsx#component:DialogSlot",
				"source_sites": [],
				"provenance": "opaque",
				"equality": "adapter-declared",
				"host_value": "adapter-declared",
				"retention": "adapter-declared",
				"execution": "generic"
			},
			{
				"site_id": "main.tsx#opaque-sink:1672",
				"owner_site_id": "main.tsx#component:DialogSlot",
				"source_sites": [],
				"provenance": "opaque",
				"equality": "adapter-declared",
				"host_value": "adapter-declared",
				"retention": "adapter-declared",
				"execution": "generic"
			},
			{
				"site_id": "main.tsx#numeric-sink:750",
				"owner_site_id": "main.tsx#component:NumericCounter",
				"source_sites": ["main.tsx#component:NumericCounter#state:0"],
				"provenance": "closed",
				"equality": "object-is",
				"host_value": "scalar",
				"retention": "value",
				"execution": "compiled-binding"
			}
		],
		"operations": [
			{
				"site_id": "main.tsx#component:DialogSlot#store:0",
				"owner_site_id": "main.tsx#component:DialogSlot",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "main.tsx#component:HeldDom#store:0",
				"owner_site_id": "main.tsx#component:HeldDom",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "main.tsx#component:HeldDom#store:1",
				"owner_site_id": "main.tsx#component:HeldDom",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": { "main.tsx#component:NumericCounter#state:0": ["main.tsx#numeric-sink:750"] },
			"execution_order": ["main.tsx#numeric-sink:750"]
		}
	},
	"source_file": "main.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/core */\n// @native-ui\nimport { NativeRootWorkQueue, Suspense, createWorld, use, useState } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \"main.tsx#component:NumericCounter\", sinkId: \"main.tsx#numeric-sink:750\", closedExpression: {\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"kind\":\"literal\",\"value\":1.0}}, sourceSites: [\"main.tsx#component:NumericCounter#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"@r3act/core\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 2, programId: \"main.tsx#component:NumericCounter\", slotCount: 1, sinkIds: [\"main.tsx#numeric-sink:750\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0] + 1); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\nimport { createDOMRoot } from \"@r3act/host-dom\";\nimport { createThreeNativeRoot } from \"@r3act/host-three\";\nimport { RadixDialog } from \"@r3act/react-bridge/radix-dialog\";\nimport { createElement } from \"react\";\nimport { Scene } from \"three\";\nimport { ReactPanel, type DialogTrace } from \"./react-panel\";\nimport { SceneApp } from \"./scene\";\nimport { createDomain, heldState, sample, type Domain } from \"./state\";\n\ntype AppProps = { domain: Domain; portal: HTMLElement; trace: DialogTrace };\n\nexport const NumericCounter = __nativeDefineComponent(\"main.tsx#component:NumericCounter\", ({ NumericCounter: () => {\n  const [count] = __nativeUseStateAt(\"main.tsx#component:NumericCounter#state:0\", 0);\n  return <output key=\"numeric-counter\" data-count={__nativeBindStatePropAt(\"main.tsx#component:NumericCounter#state:0\", (count) => (count + 1), __nativeNumericPrograms[0])} />;\n} }).NumericCounter, { propOnlySites: [\"main.tsx#component:NumericCounter#state:0\"], stateLayout: { schemaVersion: 1, programId: \"main.tsx#component:NumericCounter\", moduleRevision: \"native-v1-717a684371edf2ef\", slots: [{ siteId: \"main.tsx#component:NumericCounter#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\n\nexport const HeldDom = __nativeDefineComponent(\"main.tsx#component:HeldDom\", ({ HeldDom: (props: { heldA: Domain[\"heldA\"]; resource: Domain[\"detail\"] }) => {\n  const a = __nativeUseAt(\"main.tsx#component:HeldDom#store:0\", props.heldA);\n  const detail = __nativeUseAt(\"main.tsx#component:HeldDom#store:1\", props.resource);\n  return <div key=\"held-dom\" data-held={a.vector.x + detail.sample.x}\n    data-accepted-a={a.vector.x}>\n    {/* elidable formatting around the closed child */}\n    <output key=\"held-dom-value\" data-value={a.vector.y + detail.sample.y} />\n  </div>;\n} }).HeldDom, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"main.tsx#component:HeldDom\",\"host\":{\"children\":[{\"host\":{\"children\":[],\"key\":\"held-dom-value\",\"props\":[[\"data-value\",{\"kind\":\"binary\",\"left\":{\"index\":1,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"index\":3,\"kind\":\"input\"}}]],\"tag\":\"output\"},\"kind\":\"host\"}],\"key\":\"held-dom\",\"props\":[[\"data-held\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"index\":2,\"kind\":\"input\"}}],[\"data-accepted-a\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"div\"},\"inputs\":[{\"paths\":[[\"vector\",\"x\"],[\"vector\",\"y\"]],\"storeProp\":\"heldA\",\"storeUseSiteId\":\"main.tsx#component:HeldDom#store:0\"},{\"paths\":[[\"sample\",\"x\"],[\"sample\",\"y\"]],\"storeProp\":\"resource\",\"storeUseSiteId\":\"main.tsx#component:HeldDom#store:1\"}],\"moduleRevision\":\"native-v1-717a684371edf2ef\",\"schemaVersion\":5} })\n\nexport const ForwardHeldDom = __nativeDefineComponent(\"main.tsx#component:ForwardHeldDom\", ({ ForwardHeldDom: (props: { heldA: Domain[\"heldA\"]; resource: Domain[\"detail\"] }) =>\n  <HeldDom key=\"held-owner\" heldA={props.heldA} resource={props.resource} /> }).ForwardHeldDom, { propOnlySites: [], closedComponentForwardProgram: {\"childComponentProgramId\":\"main.tsx#component:HeldDom\",\"componentProgramId\":\"main.tsx#component:ForwardHeldDom\",\"key\":\"held-owner\",\"moduleRevision\":\"native-v1-717a684371edf2ef\",\"props\":[[\"heldA\",{\"kind\":\"prop\",\"name\":\"heldA\"}],[\"resource\",{\"kind\":\"prop\",\"name\":\"resource\"}]],\"schemaVersion\":1,\"childComponent\":HeldDom} });\n\nexport const DialogSlot = __nativeDefineComponent(\"main.tsx#component:DialogSlot\", ({ DialogSlot: (props: AppProps) => {\n  const open = __nativeUseAt(\"main.tsx#component:DialogSlot#store:0\", props.domain.independentB);\n  const [local, setLocal] = __nativeUseStateAt(\"main.tsx#component:DialogSlot#state:0\", 0);\n  return <div key=\"dialog-slot\" data-dialog-slot=\"true\" data-open={open ? \"true\" : undefined}\n    data-local={local}>\n    <button type=\"button\" data-action=\"local\"\n      onClick={() => setLocal(local + 1)}>Local {local}</button>\n    <RadixDialog open={open}\n      onOpenChange={(value) => props.domain.independentB.dispatch(value)}\n      title=\"Closed arrow settings\" description=\"Independent scene controls\"\n      triggerLabel=\"Open closed arrow settings\" closeLabel=\"Close closed arrow settings\"\n      portalContainer={props.portal} className=\"dialog-content\"\n      overlayClassName=\"dialog-overlay\"\n      children={createElement(ReactPanel, { trace: props.trace })} />\n  </div>;\n} }).DialogSlot, { propOnlySites: [] })\n\nexport const App = __nativeDefineComponent(\"main.tsx#component:App\", ({ App: (props: AppProps) => {\n  return <main>\n    <h1>Closed arrow authoring</h1>\n    <button type=\"button\" data-action=\"open\"\n      onClick={() => props.domain.independentB.dispatch(true)}>Open settings</button>\n    <button type=\"button\" data-action=\"close\"\n      onClick={() => props.domain.independentB.dispatch(false)}>Close settings</button>\n    <Suspense fallback={<div key=\"held-dom\" data-held=\"waiting\">Waiting</div>} __nativeBoundarySite=\"main.tsx#boundary:0\">\n      <ForwardHeldDom key=\"held-forward\" heldA={props.domain.heldA}\n        resource={props.domain.detail} />\n    </Suspense>\n    <DialogSlot key=\"dialog-owner\" {...props} />\n    <NumericCounter key=\"numeric-owner\" />\n  </main>;\n} }).App, { propOnlySites: [] })\n\nexport function mountHeldReaderScene(host: HTMLElement, portal: HTMLElement) {\n  const domain = createDomain();\n  const trace: DialogTrace = { mounts: 0, cleanups: 0 };\n  const world = createWorld();\n  const scene = new Scene();\n  const domRoot = createDOMRoot(host, { world, rootId: \"closed-arrow-dom\" });\n  const three = createThreeNativeRoot(scene, {\n    rootOptions: { world, rootId: \"closed-arrow-three\" },\n  });\n  const queue = new NativeRootWorkQueue();\n  const initialPortalParent = portal.parentNode;\n  let groupCallbacks = 0;\n  let disposed = false;\n  domRoot.mount(<App domain={domain} portal={portal} trace={trace} />);\n  three.root.mount(<SceneApp domain={domain} />);\n  const fallback = host.querySelector('[data-held=\"waiting\"]');\n  const numericInitial = host.querySelector(\"[data-count]\");\n  const sceneFallback = scene.children[0]?.children[0];\n  const group = queue.enqueueResources({ id: \"closed-arrow-dom-three\", roots: [\n    { root: domRoot, resources: [domain.detail] },\n    { root: three.root, resources: [domain.signal] },\n  ], onSettled(outcome) {\n    if (outcome.status === \"cancelled\" && disposed) return;\n    if (outcome.status !== \"committed\") throw outcome.error ??\n      new Error(`held reader group ${outcome.status}`);\n    groupCallbacks++;\n  } });\n  if (group.status !== \"pending\") throw new Error(\"held resource group was not admitted\");\n  const snapshot = () => {\n    const held = host.querySelector(\"[data-held]\");\n    const slot = host.querySelector(\"[data-dialog-slot]\");\n    const sceneHeld = scene.children[0]?.children[0];\n    const mesh = sceneHeld?.children[0];\n    return {\n      groupStatus: group.status, groupCallbacks,\n      detailStatus: domain.detail.status.status,\n      signalStatus: domain.signal.status.status,\n      held: held?.getAttribute(\"data-held\") ?? null,\n      acceptedA: held?.getAttribute(\"data-accepted-a\") ?? null,\n      fallbackRetained: held === fallback,\n      threeFallbackRetained: sceneHeld === sceneFallback,\n      threePosition: mesh?.position.toArray() ?? null,\n      open: slot?.getAttribute(\"data-open\") ?? null,\n      local: slot?.getAttribute(\"data-local\") ?? null,\n      numeric: host.querySelector(\"[data-count]\")?.getAttribute(\"data-count\") ?? null,\n      numericRetained: host.querySelector(\"[data-count]\") === numericInitial,\n      dialogPresent: Boolean(portal.querySelector('[role=\"dialog\"]')),\n      reactMounts: trace.mounts, reactCleanups: trace.cleanups,\n      dom: domRoot.diagnostics(), three: three.root.diagnostics(),\n      threeHost: three.host.diagnostics,\n      heldPendingValue: domain.heldA.getState().vector.x,\n      heldDomProjection: disposed ? null : domain.heldA.getStateForRoot(domRoot.rootId).vector.x,\n      heldThreeProjection: disposed ? null : domain.heldA.getStateForRoot(three.root.rootId).vector.x,\n      portalConnected: portal.parentNode === initialPortalParent,\n      disposed,\n    };\n  };\n  return {\n    snapshot,\n    setHeldA(x: number, y: number) { domain.heldA.dispatch(heldState(x, y)); },\n    setOpen(open: boolean) { domain.independentB.dispatch(open); },\n    resolveDetail(x = 4, y = 5) { domain.resolveDetail(sample(x, y)); },\n    resolveSignal(x = 2, y = 3) { domain.resolveSignal(sample(x, y)); },\n    dispose() {\n      if (disposed) return;\n      disposed = true;\n      queue.dispose();\n      domRoot.dispose();\n      three.dispose();\n    },\n  };\n}\n\nconst host = document.getElementById(\"app\")!;\nconst portal = document.getElementById(\"dialog-portal\")!;\n(window as Window & { heldReaderProof?: ReturnType<typeof mountHeldReaderScene> })\n  .heldReaderProof = mountHeldReaderScene(host, portal);\n",
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
			"name": "DialogSlot",
			"component_site_id": "main.tsx#component:DialogSlot",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": "main.tsx#component:DialogSlot#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "main.tsx#component:DialogSlot#store:0",
				"source_expression": "props.domain.independentB"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": ["main.tsx#opaque-sink:1603", "main.tsx#opaque-sink:1672"]
		},
		{
			"name": "ForwardHeldDom",
			"component_site_id": "main.tsx#component:ForwardHeldDom",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"closedComponentForwardProgram": {
				"childComponentProgramId": "main.tsx#component:HeldDom",
				"componentProgramId": "main.tsx#component:ForwardHeldDom",
				"key": "held-owner",
				"moduleRevision": "native-v1-717a684371edf2ef",
				"props": [["heldA", {
					"kind": "prop",
					"name": "heldA"
				}], ["resource", {
					"kind": "prop",
					"name": "resource"
				}]],
				"schemaVersion": 1
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "HeldDom",
			"component_site_id": "main.tsx#component:HeldDom",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "main.tsx#component:HeldDom#store:0",
				"source_expression": "props.heldA"
			}, {
				"site_id": "main.tsx#component:HeldDom#store:1",
				"source_expression": "props.resource"
			}],
			"closedStoreHostProgram": {
				"componentProgramId": "main.tsx#component:HeldDom",
				"host": {
					"children": [{
						"host": {
							"children": [],
							"key": "held-dom-value",
							"props": [["data-value", {
								"kind": "binary",
								"left": {
									"index": 1,
									"kind": "input"
								},
								"operator": "+",
								"right": {
									"index": 3,
									"kind": "input"
								}
							}]],
							"tag": "output"
						},
						"kind": "host"
					}],
					"key": "held-dom",
					"props": [["data-held", {
						"kind": "binary",
						"left": {
							"index": 0,
							"kind": "input"
						},
						"operator": "+",
						"right": {
							"index": 2,
							"kind": "input"
						}
					}], ["data-accepted-a", {
						"index": 0,
						"kind": "input"
					}]],
					"tag": "div"
				},
				"inputs": [{
					"paths": [["vector", "x"], ["vector", "y"]],
					"storeProp": "heldA",
					"storeUseSiteId": "main.tsx#component:HeldDom#store:0"
				}, {
					"paths": [["sample", "x"], ["sample", "y"]],
					"storeProp": "resource",
					"storeUseSiteId": "main.tsx#component:HeldDom#store:1"
				}],
				"moduleRevision": "native-v1-717a684371edf2ef",
				"schemaVersion": 5
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "NumericCounter",
			"component_site_id": "main.tsx#component:NumericCounter",
			"prop_only_sites": ["main.tsx#component:NumericCounter#state:0"],
			"state_layout": {
				"schema_version": 1,
				"programId": "main.tsx#component:NumericCounter",
				"moduleRevision": "native-v1-717a684371edf2ef",
				"slots": [{
					"site_id": "main.tsx#component:NumericCounter#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": "main.tsx#component:NumericCounter#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": "main.tsx#numeric-sink:750",
				"source_sites": ["main.tsx#component:NumericCounter#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "@r3act/core";
