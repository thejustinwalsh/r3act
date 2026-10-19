import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "main.tsx",
	"module_revision": "native-v1-acc9b987d6f39211",
	"owners": [
		{
			"site_id": "main.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:Detail",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:DialogSlot",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:Health",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:Position",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": "main.tsx#component:Detail#store:0",
			"owner_site_id": "main.tsx#component:Detail",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "main.tsx#component:Detail#store:1",
			"owner_site_id": "main.tsx#component:Detail",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "main.tsx#component:DialogSlot#store:0",
			"owner_site_id": "main.tsx#component:DialogSlot",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "main.tsx#component:Health#store:0",
			"owner_site_id": "main.tsx#component:Health",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "main.tsx#component:Position#store:0",
			"owner_site_id": "main.tsx#component:Position",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [],
	"operations": [
		{
			"site_id": "main.tsx#component:Detail#store:0",
			"owner_site_id": "main.tsx#component:Detail",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "main.tsx#component:Detail#store:1",
			"owner_site_id": "main.tsx#component:Detail",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "main.tsx#component:DialogSlot#store:0",
			"owner_site_id": "main.tsx#component:DialogSlot",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "main.tsx#component:Health#store:0",
			"owner_site_id": "main.tsx#component:Health",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "main.tsx#component:Position#store:0",
			"owner_site_id": "main.tsx#component:Position",
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
		if (event?.sourceFile === "main.tsx") __invalidateNativeSemanticPlan("main.tsx", "native-v1-acc9b987d6f39211");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/core */
import { Suspense, NativeRootWorkQueue, createWorld } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt } from "@r3act/core";
__nativeDefineComponent("main.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent("main.tsx#component:Detail", Detail, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "main.tsx#component:Detail",
		"host": {
			"children": [{
				"expression": {
					"kind": "binary",
					"left": {
						"index": 0,
						"kind": "input"
					},
					"operator": "+",
					"right": {
						"index": 1,
						"kind": "input"
					}
				},
				"kind": "text"
			}],
			"key": "detail",
			"props": [["data-detail", {
				"index": 0,
				"kind": "input"
			}], ["data-joint", {
				"kind": "binary",
				"left": {
					"index": 0,
					"kind": "input"
				},
				"operator": "+",
				"right": {
					"index": 1,
					"kind": "input"
				}
			}]],
			"tag": "output"
		},
		"inputs": [{
			"storeProp": "resource",
			"storeUseSiteId": "main.tsx#component:Detail#store:0"
		}, {
			"storeProp": "point",
			"storeUseSiteId": "main.tsx#component:Detail#store:1"
		}],
		"moduleRevision": "native-v1-acc9b987d6f39211",
		"schemaVersion": 4
	}
});
__nativeDefineComponent("main.tsx#component:DialogSlot", DialogSlot, { propOnlySites: [] });
__nativeDefineComponent("main.tsx#component:Health", Health, {
	propOnlySites: [],
	closedResourceHostProgram: {
		"componentProgramId": "main.tsx#component:Health",
		"host": {
			"children": [{
				"expression": {
					"index": 0,
					"kind": "input"
				},
				"kind": "text"
			}],
			"key": "health",
			"props": [["data-health", {
				"index": 0,
				"kind": "input"
			}]],
			"tag": "output"
		},
		"moduleRevision": "native-v1-acc9b987d6f39211",
		"resourceProp": "resource",
		"resourceUseSiteId": "main.tsx#component:Health#store:0",
		"schemaVersion": 2
	},
	closedStoreHostProgram: {
		"componentProgramId": "main.tsx#component:Health",
		"host": {
			"children": [{
				"expression": {
					"index": 0,
					"kind": "input"
				},
				"kind": "text"
			}],
			"key": "health",
			"props": [["data-health", {
				"index": 0,
				"kind": "input"
			}]],
			"tag": "output"
		},
		"inputs": [{
			"storeProp": "resource",
			"storeUseSiteId": "main.tsx#component:Health#store:0"
		}],
		"moduleRevision": "native-v1-acc9b987d6f39211",
		"schemaVersion": 4
	}
});
__nativeDefineComponent("main.tsx#component:Position", Position, {
	propOnlySites: [],
	closedResourceHostProgram: {
		"componentProgramId": "main.tsx#component:Position",
		"host": {
			"children": [{
				"expression": {
					"index": 0,
					"kind": "input"
				},
				"kind": "text"
			}],
			"key": "position",
			"props": [["data-point", {
				"index": 0,
				"kind": "input"
			}]],
			"tag": "output"
		},
		"moduleRevision": "native-v1-acc9b987d6f39211",
		"resourceProp": "point",
		"resourceUseSiteId": "main.tsx#component:Position#store:0",
		"schemaVersion": 2
	},
	closedStoreHostProgram: {
		"componentProgramId": "main.tsx#component:Position",
		"host": {
			"children": [{
				"expression": {
					"index": 0,
					"kind": "input"
				},
				"kind": "text"
			}],
			"key": "position",
			"props": [["data-point", {
				"index": 0,
				"kind": "input"
			}]],
			"tag": "output"
		},
		"inputs": [{
			"storeProp": "point",
			"storeUseSiteId": "main.tsx#component:Position#store:0"
		}],
		"moduleRevision": "native-v1-acc9b987d6f39211",
		"schemaVersion": 4
	}
});
import { createDOMRoot } from "@r3act/host-dom";
import { createThreeNativeRoot } from "@r3act/host-three";
import { RadixDialog } from "@r3act/react-bridge/radix-dialog";
import { createElement } from "react";
import { BoxGeometry, MeshBasicMaterial, Scene } from "three";
import { DialogBody } from "./dialog-body";
import { ThreeApp } from "./scene";
import { createSceneDomain } from "./state";
export function Detail(props) {
	const value = __nativeUseAt("main.tsx#component:Detail#store:0", props.resource);
	const point = __nativeUseAt("main.tsx#component:Detail#store:1", props.point);
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "detail",
		"data-detail": value,
		"data-joint": value + point
	}, value + point);
}
export function Health(props) {
	const value = __nativeUseAt("main.tsx#component:Health#store:0", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "health",
		"data-health": value
	}, value);
}
export function Position(props) {
	const point = __nativeUseAt("main.tsx#component:Position#store:0", props.point);
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "position",
		"data-point": point
	}, point);
}
export function DialogSlot(props) {
	const open = __nativeUseAt("main.tsx#component:DialogSlot#store:0", props.domain.open);
	return /* @__PURE__ */ __nativeJsx.jsx("div", {
		key: "dialog",
		"data-dialog-slot": "true"
	}, /* @__PURE__ */ __nativeJsx.jsx(RadixDialog, {
		open,
		onOpenChange: props.onOpenChange,
		title: "Scene settings",
		description: "A controlled dialog for this scene",
		triggerLabel: "Open scene settings",
		closeLabel: "Close settings",
		portalContainer: props.portal,
		className: "dialog-content",
		overlayClassName: "dialog-overlay",
		children: createElement(DialogBody, { trace: props.trace })
	}));
}
export function App(props) {
	return /* @__PURE__ */ __nativeJsx.jsx("main", null, /* @__PURE__ */ __nativeJsx.jsx("h1", null, "Installed R3ACT scene"), /* @__PURE__ */ __nativeJsx.jsx("p", null, "Native controls update one Store read by this page and a Three scene."), /* @__PURE__ */ __nativeJsx.jsx("div", {
		role: "group",
		"aria-label": "Scene controls"
	}, /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		"data-action": "move",
		onClick: props.onMove
	}, "Move scene"), /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		"data-action": "reorder",
		onClick: props.onReorder
	}, "Reorder settings"), /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		"data-action": "detail",
		onClick: props.onLoadDetail
	}, "Load detail"), /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		"data-action": "signal",
		onClick: props.onLoadSignal
	}, "Load signal"), /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		"data-action": "health",
		onClick: props.onLoadHealth
	}, "Load health")), /* @__PURE__ */ __nativeJsx.jsx(Position, { point: props.domain.point }), /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("output", {
			key: "detail",
			"data-detail": "waiting"
		}, "Detail waiting"),
		__nativeBoundarySite: "main.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(Detail, {
		resource: props.domain.detail,
		point: props.domain.point
	})), /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("output", {
			key: "health",
			"data-health": "waiting"
		}, "Health waiting"),
		__nativeBoundarySite: "main.tsx#boundary:1"
	}, /* @__PURE__ */ __nativeJsx.jsx(Health, { resource: props.domain.health })), /* @__PURE__ */ __nativeJsx.jsx("div", { "data-islands": "true" }, props.order.map((id) => id === "dialog" ? /* @__PURE__ */ __nativeJsx.jsx(DialogSlot, {
		key: "dialog",
		...props
	}) : /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "other",
		"data-other": "stable"
	}, "Other island"))));
}
export function mountInstalledScene(host, portal) {
	const domain = createSceneDomain();
	const scene = new Scene();
	const portalParent = portal.parentNode;
	const borrowedDisposed = {
		geometry: 0,
		material: 0
	};
	const { borrowedGeometry, borrowedMaterial, domRoot, three, queue } = (() => {
		let geometry;
		let material;
		let dom;
		let sceneRoot;
		let workQueue;
		try {
			geometry = new BoxGeometry(.5, .5, .5);
			material = new MeshBasicMaterial({ color: "#637188" });
			geometry.addEventListener("dispose", () => {
				borrowedDisposed.geometry++;
			});
			material.addEventListener("dispose", () => {
				borrowedDisposed.material++;
			});
			const world = createWorld();
			dom = createDOMRoot(host, {
				world,
				rootId: "installed-dom"
			});
			sceneRoot = createThreeNativeRoot(scene, { rootOptions: {
				world,
				rootId: "installed-three"
			} });
			workQueue = new NativeRootWorkQueue();
			return {
				borrowedGeometry: geometry,
				borrowedMaterial: material,
				domRoot: dom,
				three: sceneRoot,
				queue: workQueue
			};
		} catch (error) {
			const errors = [error];
			for (const cleanup of [
				() => workQueue?.dispose(),
				() => dom?.dispose(),
				() => sceneRoot?.dispose(),
				() => geometry?.dispose(),
				() => material?.dispose()
			]) {
				try {
					cleanup();
				} catch (cleanupError) {
					errors.push(cleanupError);
				}
			}
			throw new AggregateError(errors, "Installed scene construction failed");
		}
	})();
	const trace = {
		mounts: 0,
		cleanups: 0
	};
	let order = ["dialog", "other"];
	let disposed = false;
	let dialogIdentity = null;
	let cursorIdentity = null;
	let revealCallbacks = 0;
	let revealView = null;
	let positionCallbacks = 0;
	let positionView = null;
	let borrowedAtHostDisposal = null;
	const onOpenChange = (open) => {
		domain.open.dispatch(open);
	};
	const updatePoint = (next) => {
		domain.point.dispatch(next);
		if (reveal.status !== "committed") return;
		queue.enqueueStores({
			id: `joint-position-${next}`,
			roots: [{
				root: domRoot,
				stores: [domain.point]
			}, {
				root: three.root,
				stores: [domain.point]
			}],
			onSettled(outcome) {
				if (outcome.status !== "committed") throw new Error(`Joint position ${outcome.status}`);
				positionCallbacks++;
				positionView = `${host.querySelector("[data-point]")?.getAttribute("data-point") ?? "missing"}:${scene.getObjectByName("cursor")?.position.x ?? "missing"}`;
			}
		});
	};
	const onMove = () => {
		updatePoint(domain.point.getState() + 1);
	};
	const onLoadDetail = () => {
		domain.resolveDetail(3);
	};
	const onLoadSignal = () => {
		domain.resolveSignal(5);
	};
	const onLoadHealth = () => {
		domain.resolveHealth("healthy");
	};
	const onReorder = () => {
		order = [...order].reverse();
		domRoot.update(tree());
	};
	const tree = () => /* @__PURE__ */ __nativeJsx.jsx(App, {
		domain,
		portal,
		trace,
		order,
		onOpenChange,
		onMove,
		onReorder,
		onLoadDetail,
		onLoadSignal,
		onLoadHealth
	});
	let reveal;
	try {
		domRoot.mount(tree());
		three.root.mount(/* @__PURE__ */ __nativeJsx.jsx(ThreeApp, {
			domain,
			geometry: borrowedGeometry,
			material: borrowedMaterial
		}));
		dialogIdentity = host.querySelector("[data-dialog-slot=\"true\"]");
		cursorIdentity = scene.getObjectByName("cursor") ?? null;
		reveal = queue.enqueueResources({
			id: "joint-dom-three-reveal",
			roots: [{
				root: domRoot,
				resources: [domain.detail]
			}, {
				root: three.root,
				resources: [domain.signal]
			}],
			onSettled(outcome) {
				if (outcome.status !== "committed") throw new Error(`Joint reveal ${outcome.status}`);
				revealCallbacks++;
				revealView = `${host.querySelector("[data-detail]")?.getAttribute("data-detail") ?? "missing"}:${scene.getObjectByName("signal-ready")?.position.x ?? "missing"}`;
			}
		});
	} catch (error) {
		const errors = [error];
		for (const cleanup of [
			() => queue.dispose(),
			() => domRoot.dispose(),
			() => three.dispose(),
			() => borrowedGeometry.dispose(),
			() => borrowedMaterial.dispose()
		]) {
			try {
				cleanup();
			} catch (cleanupError) {
				errors.push(cleanupError);
			}
		}
		throw new AggregateError(errors, "Installed scene setup failed");
	}
	return {
		settleA: onLoadDetail,
		settleB: onLoadSignal,
		settleHealth: onLoadHealth,
		updatePoint(next) {
			updatePoint(next ?? domain.point.getState() + 1);
		},
		reorder: onReorder,
		externalOpen() {
			domain.open.dispatch(true);
		},
		externalClose() {
			domain.open.dispatch(false);
		},
		removeDialog() {
			order = ["other"];
			domRoot.update(tree());
		},
		reinsertDialog() {
			order = ["dialog", "other"];
			domRoot.update(tree());
		},
		snapshot() {
			const cursor = scene.getObjectByName("cursor");
			const signal = scene.getObjectByName("signal-ready") ?? scene.getObjectByName("signal-waiting");
			const slot = host.querySelector("[data-dialog-slot=\"true\"]");
			const note = portal.querySelector("input[aria-label=\"Dialog note\"]");
			return {
				point: domain.point.getState(),
				domPoint: host.querySelector("[data-point]")?.getAttribute("data-point") ?? null,
				domDetail: host.querySelector("[data-detail]")?.getAttribute("data-detail") ?? null,
				domJoint: host.querySelector("[data-joint]")?.getAttribute("data-joint") ?? null,
				health: host.querySelector("[data-health]")?.getAttribute("data-health") ?? null,
				sceneCursorX: cursor?.position.x ?? null,
				sceneSignalName: signal?.name ?? null,
				sceneSignalX: signal?.position.x ?? null,
				sceneChildren: scene.children.length,
				cursorRetained: cursor === cursorIdentity,
				dialogPresent: slot !== null,
				dialogRetained: slot !== null && slot === dialogIdentity,
				dialogOpen: domain.open.getState(),
				portalChildCount: portal.childElementCount,
				portalRetained: portal.parentNode === portalParent && portal.isConnected,
				noteValue: note?.value ?? null,
				noteSelectionStart: note?.selectionStart ?? null,
				noteSelectionEnd: note?.selectionEnd ?? null,
				dialogLocalCount: portal.querySelector("[data-dialog-local]")?.getAttribute("data-dialog-local") ?? null,
				dialogMounts: trace.mounts,
				dialogCleanups: trace.cleanups,
				revealStatus: reveal.status,
				revealCallbacks,
				revealView,
				positionCallbacks,
				positionView,
				disposed,
				borrowedDisposed: { ...borrowedDisposed },
				borrowedAtHostDisposal,
				three: { ...three.host.diagnostics },
				dom: domRoot.diagnostics()
			};
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			const errors = [];
			for (const cleanup of [
				() => queue.dispose(),
				() => domRoot.dispose(),
				() => three.dispose()
			]) {
				try {
					cleanup();
				} catch (error) {
					errors.push(error);
				}
			}
			borrowedAtHostDisposal = { ...borrowedDisposed };
			for (const cleanup of [() => borrowedGeometry.dispose(), () => borrowedMaterial.dispose()]) {
				try {
					cleanup();
				} catch (error) {
					errors.push(error);
				}
			}
			if (errors.length) throw new AggregateError(errors, "Installed scene disposal failed");
		}
	};
}
const host = document.querySelector("#app");
const portal = document.querySelector("#dialog-portal");
if (host && portal) window.installedScene = mountInstalledScene(host, portal);
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-acc9b987d6f39211",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "main.tsx",
		"module_revision": "native-v1-acc9b987d6f39211",
		"owners": [
			{
				"site_id": "main.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:Detail",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:DialogSlot",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:Health",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:Position",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": "main.tsx#component:Detail#store:0",
				"owner_site_id": "main.tsx#component:Detail",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "main.tsx#component:Detail#store:1",
				"owner_site_id": "main.tsx#component:Detail",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "main.tsx#component:DialogSlot#store:0",
				"owner_site_id": "main.tsx#component:DialogSlot",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "main.tsx#component:Health#store:0",
				"owner_site_id": "main.tsx#component:Health",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "main.tsx#component:Position#store:0",
				"owner_site_id": "main.tsx#component:Position",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [],
		"operations": [
			{
				"site_id": "main.tsx#component:Detail#store:0",
				"owner_site_id": "main.tsx#component:Detail",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "main.tsx#component:Detail#store:1",
				"owner_site_id": "main.tsx#component:Detail",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "main.tsx#component:DialogSlot#store:0",
				"owner_site_id": "main.tsx#component:DialogSlot",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "main.tsx#component:Health#store:0",
				"owner_site_id": "main.tsx#component:Health",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "main.tsx#component:Position#store:0",
				"owner_site_id": "main.tsx#component:Position",
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
	"source_file": "main.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/core */\n// @native-ui\nimport { Suspense, NativeRootWorkQueue, createWorld, use } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"main.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"main.tsx#component:Detail\", Detail, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"main.tsx#component:Detail\",\"host\":{\"children\":[{\"expression\":{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"index\":1,\"kind\":\"input\"}},\"kind\":\"text\"}],\"key\":\"detail\",\"props\":[[\"data-detail\",{\"index\":0,\"kind\":\"input\"}],[\"data-joint\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"index\":1,\"kind\":\"input\"}}]],\"tag\":\"output\"},\"inputs\":[{\"storeProp\":\"resource\",\"storeUseSiteId\":\"main.tsx#component:Detail#store:0\"},{\"storeProp\":\"point\",\"storeUseSiteId\":\"main.tsx#component:Detail#store:1\"}],\"moduleRevision\":\"native-v1-acc9b987d6f39211\",\"schemaVersion\":4} });\n__nativeDefineComponent(\"main.tsx#component:DialogSlot\", DialogSlot, { propOnlySites: [] });\n__nativeDefineComponent(\"main.tsx#component:Health\", Health, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\"main.tsx#component:Health\",\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"health\",\"props\":[[\"data-health\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"output\"},\"moduleRevision\":\"native-v1-acc9b987d6f39211\",\"resourceProp\":\"resource\",\"resourceUseSiteId\":\"main.tsx#component:Health#store:0\",\"schemaVersion\":2}, closedStoreHostProgram: {\"componentProgramId\":\"main.tsx#component:Health\",\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"health\",\"props\":[[\"data-health\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"output\"},\"inputs\":[{\"storeProp\":\"resource\",\"storeUseSiteId\":\"main.tsx#component:Health#store:0\"}],\"moduleRevision\":\"native-v1-acc9b987d6f39211\",\"schemaVersion\":4} });\n__nativeDefineComponent(\"main.tsx#component:Position\", Position, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\"main.tsx#component:Position\",\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"position\",\"props\":[[\"data-point\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"output\"},\"moduleRevision\":\"native-v1-acc9b987d6f39211\",\"resourceProp\":\"point\",\"resourceUseSiteId\":\"main.tsx#component:Position#store:0\",\"schemaVersion\":2}, closedStoreHostProgram: {\"componentProgramId\":\"main.tsx#component:Position\",\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"position\",\"props\":[[\"data-point\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"output\"},\"inputs\":[{\"storeProp\":\"point\",\"storeUseSiteId\":\"main.tsx#component:Position#store:0\"}],\"moduleRevision\":\"native-v1-acc9b987d6f39211\",\"schemaVersion\":4} });\nimport { createDOMRoot } from \"@r3act/host-dom\";\nimport { createThreeNativeRoot } from \"@r3act/host-three\";\nimport { RadixDialog } from \"@r3act/react-bridge/radix-dialog\";\nimport { createElement } from \"react\";\nimport { BoxGeometry, MeshBasicMaterial, Scene } from \"three\";\nimport { DialogBody, type DialogTrace } from \"./dialog-body\";\nimport { ThreeApp } from \"./scene\";\nimport { createSceneDomain, type SceneDomain } from \"./state\";\n\ntype AppProps = {\n  domain: SceneDomain;\n  portal: HTMLElement;\n  trace: DialogTrace;\n  order: readonly string[];\n  onOpenChange: (open: boolean) => void;\n  onMove: () => void;\n  onReorder: () => void;\n  onLoadDetail: () => void;\n  onLoadSignal: () => void;\n  onLoadHealth: () => void;\n};\n\nexport function Detail(props: { resource: SceneDomain[\"detail\"]; point: SceneDomain[\"point\"] }) {\n  const value = __nativeUseAt(\"main.tsx#component:Detail#store:0\", props.resource);\n  const point = __nativeUseAt(\"main.tsx#component:Detail#store:1\", props.point);\n  return <output key=\"detail\" data-detail={value} data-joint={value + point}>{value + point}</output>;\n}\n\nexport function Health(props: { resource: SceneDomain[\"health\"] }) {\n  const value = __nativeUseAt(\"main.tsx#component:Health#store:0\", props.resource);\n  return <output key=\"health\" data-health={value}>{value}</output>;\n}\n\nexport function Position(props: { point: SceneDomain[\"point\"] }) {\n  const point = __nativeUseAt(\"main.tsx#component:Position#store:0\", props.point);\n  return <output key=\"position\" data-point={point}>{point}</output>;\n}\n\nexport function DialogSlot(props: AppProps) {\n  const open = __nativeUseAt(\"main.tsx#component:DialogSlot#store:0\", props.domain.open);\n  return <div key=\"dialog\" data-dialog-slot=\"true\">\n    <RadixDialog open={open} onOpenChange={props.onOpenChange}\n      title=\"Scene settings\" description=\"A controlled dialog for this scene\"\n      triggerLabel=\"Open scene settings\" closeLabel=\"Close settings\"\n      portalContainer={props.portal} className=\"dialog-content\"\n      overlayClassName=\"dialog-overlay\"\n      children={createElement(DialogBody, { trace: props.trace })} />\n  </div>;\n}\n\nexport function App(props: AppProps) {\n  return <main>\n    <h1>Installed R3ACT scene</h1>\n    <p>Native controls update one Store read by this page and a Three scene.</p>\n    <div role=\"group\" aria-label=\"Scene controls\">\n      <button type=\"button\" data-action=\"move\" onClick={props.onMove}>Move scene</button>\n      <button type=\"button\" data-action=\"reorder\" onClick={props.onReorder}>Reorder settings</button>\n      <button type=\"button\" data-action=\"detail\" onClick={props.onLoadDetail}>Load detail</button>\n      <button type=\"button\" data-action=\"signal\" onClick={props.onLoadSignal}>Load signal</button>\n      <button type=\"button\" data-action=\"health\" onClick={props.onLoadHealth}>Load health</button>\n    </div>\n    <Position point={props.domain.point} />\n    <Suspense fallback={<output key=\"detail\" data-detail=\"waiting\">Detail waiting</output>} __nativeBoundarySite=\"main.tsx#boundary:0\">\n      <Detail resource={props.domain.detail} point={props.domain.point} />\n    </Suspense>\n    <Suspense fallback={<output key=\"health\" data-health=\"waiting\">Health waiting</output>} __nativeBoundarySite=\"main.tsx#boundary:1\">\n      <Health resource={props.domain.health} />\n    </Suspense>\n    <div data-islands=\"true\">{props.order.map((id) => id === \"dialog\" ?\n      <DialogSlot key=\"dialog\" {...props} /> :\n      <output key=\"other\" data-other=\"stable\">Other island</output>)}</div>\n  </main>;\n}\n\nexport function mountInstalledScene(host: HTMLElement, portal: HTMLElement) {\n  const domain = createSceneDomain();\n  const scene = new Scene();\n  const portalParent = portal.parentNode;\n  const borrowedDisposed = { geometry: 0, material: 0 };\n  const { borrowedGeometry, borrowedMaterial, domRoot, three, queue } = (() => {\n    let geometry: BoxGeometry | undefined;\n    let material: MeshBasicMaterial | undefined;\n    let dom: ReturnType<typeof createDOMRoot<HTMLElement>> | undefined;\n    let sceneRoot: ReturnType<typeof createThreeNativeRoot> | undefined;\n    let workQueue: NativeRootWorkQueue | undefined;\n    try {\n      geometry = new BoxGeometry(0.5, 0.5, 0.5);\n      material = new MeshBasicMaterial({ color: \"#637188\" });\n      geometry.addEventListener(\"dispose\", () => { borrowedDisposed.geometry++; });\n      material.addEventListener(\"dispose\", () => { borrowedDisposed.material++; });\n      const world = createWorld();\n      dom = createDOMRoot(host, { world, rootId: \"installed-dom\" });\n      sceneRoot = createThreeNativeRoot(scene, { rootOptions: { world, rootId: \"installed-three\" } });\n      workQueue = new NativeRootWorkQueue();\n      return { borrowedGeometry: geometry, borrowedMaterial: material,\n        domRoot: dom, three: sceneRoot, queue: workQueue };\n    } catch (error) {\n      const errors: unknown[] = [error];\n      for (const cleanup of [() => workQueue?.dispose(), () => dom?.dispose(),\n        () => sceneRoot?.dispose(), () => geometry?.dispose(), () => material?.dispose()]) {\n        try { cleanup(); } catch (cleanupError) { errors.push(cleanupError); }\n      }\n      throw new AggregateError(errors, \"Installed scene construction failed\");\n    }\n  })();\n  const trace: DialogTrace = { mounts: 0, cleanups: 0 };\n  let order: readonly string[] = [\"dialog\", \"other\"];\n  let disposed = false;\n  let dialogIdentity: Element | null = null;\n  let cursorIdentity: object | null = null;\n  let revealCallbacks = 0;\n  let revealView: string | null = null;\n  let positionCallbacks = 0;\n  let positionView: string | null = null;\n  let borrowedAtHostDisposal: { geometry: number; material: number } | null = null;\n  const onOpenChange = (open: boolean) => { domain.open.dispatch(open); };\n  const updatePoint = (next: number) => {\n    domain.point.dispatch(next);\n    if (reveal.status !== \"committed\") return;\n    queue.enqueueStores({ id: `joint-position-${next}`, roots: [\n      { root: domRoot, stores: [domain.point] },\n      { root: three.root, stores: [domain.point] },\n    ], onSettled(outcome) {\n      if (outcome.status !== \"committed\") throw new Error(`Joint position ${outcome.status}`);\n      positionCallbacks++;\n      positionView = `${host.querySelector('[data-point]')?.getAttribute(\"data-point\") ?? \"missing\"}:${scene.getObjectByName(\"cursor\")?.position.x ?? \"missing\"}`;\n    } });\n  };\n  const onMove = () => { updatePoint(domain.point.getState() + 1); };\n  const onLoadDetail = () => { domain.resolveDetail(3); };\n  const onLoadSignal = () => { domain.resolveSignal(5); };\n  const onLoadHealth = () => { domain.resolveHealth(\"healthy\"); };\n  const onReorder = () => { order = [...order].reverse(); domRoot.update(tree()); };\n  const tree = () => <App domain={domain} portal={portal} trace={trace} order={order}\n    onOpenChange={onOpenChange} onMove={onMove} onReorder={onReorder}\n    onLoadDetail={onLoadDetail} onLoadSignal={onLoadSignal} onLoadHealth={onLoadHealth} />;\n  let reveal!: ReturnType<NativeRootWorkQueue[\"enqueueResources\"]>;\n  try {\n    domRoot.mount(tree());\n    three.root.mount(<ThreeApp domain={domain} geometry={borrowedGeometry} material={borrowedMaterial} />);\n    dialogIdentity = host.querySelector('[data-dialog-slot=\"true\"]');\n    cursorIdentity = scene.getObjectByName(\"cursor\") ?? null;\n    reveal = queue.enqueueResources({ id: \"joint-dom-three-reveal\", roots: [\n      { root: domRoot, resources: [domain.detail] },\n      { root: three.root, resources: [domain.signal] },\n    ], onSettled(outcome) {\n      if (outcome.status !== \"committed\") throw new Error(`Joint reveal ${outcome.status}`);\n      revealCallbacks++;\n      revealView = `${host.querySelector('[data-detail]')?.getAttribute(\"data-detail\") ?? \"missing\"}:${scene.getObjectByName(\"signal-ready\")?.position.x ?? \"missing\"}`;\n    } });\n  } catch (error) {\n    const errors: unknown[] = [error];\n    for (const cleanup of [() => queue.dispose(), () => domRoot.dispose(), () => three.dispose(),\n      () => borrowedGeometry.dispose(), () => borrowedMaterial.dispose()]) {\n      try { cleanup(); } catch (cleanupError) { errors.push(cleanupError); }\n    }\n    throw new AggregateError(errors, \"Installed scene setup failed\");\n  }\n  return {\n    settleA: onLoadDetail,\n    settleB: onLoadSignal,\n    settleHealth: onLoadHealth,\n    updatePoint(next?: number) { updatePoint(next ?? domain.point.getState() + 1); },\n    reorder: onReorder,\n    externalOpen() { domain.open.dispatch(true); },\n    externalClose() { domain.open.dispatch(false); },\n    removeDialog() { order = [\"other\"]; domRoot.update(tree()); },\n    reinsertDialog() { order = [\"dialog\", \"other\"]; domRoot.update(tree()); },\n    snapshot() {\n      const cursor = scene.getObjectByName(\"cursor\");\n      const signal = scene.getObjectByName(\"signal-ready\") ?? scene.getObjectByName(\"signal-waiting\");\n      const slot = host.querySelector('[data-dialog-slot=\"true\"]');\n      const note = portal.querySelector<HTMLInputElement>('input[aria-label=\"Dialog note\"]');\n      return {\n        point: domain.point.getState(),\n        domPoint: host.querySelector('[data-point]')?.getAttribute(\"data-point\") ?? null,\n        domDetail: host.querySelector('[data-detail]')?.getAttribute(\"data-detail\") ?? null,\n        domJoint: host.querySelector('[data-joint]')?.getAttribute(\"data-joint\") ?? null,\n        health: host.querySelector('[data-health]')?.getAttribute(\"data-health\") ?? null,\n        sceneCursorX: cursor?.position.x ?? null,\n        sceneSignalName: signal?.name ?? null,\n        sceneSignalX: signal?.position.x ?? null,\n        sceneChildren: scene.children.length,\n        cursorRetained: cursor === cursorIdentity,\n        dialogPresent: slot !== null,\n        dialogRetained: slot !== null && slot === dialogIdentity,\n        dialogOpen: domain.open.getState(),\n        portalChildCount: portal.childElementCount,\n        portalRetained: portal.parentNode === portalParent && portal.isConnected,\n        noteValue: note?.value ?? null,\n        noteSelectionStart: note?.selectionStart ?? null,\n        noteSelectionEnd: note?.selectionEnd ?? null,\n        dialogLocalCount: portal.querySelector('[data-dialog-local]')?.getAttribute(\"data-dialog-local\") ?? null,\n        dialogMounts: trace.mounts,\n        dialogCleanups: trace.cleanups,\n        revealStatus: reveal.status,\n        revealCallbacks,\n        revealView,\n        positionCallbacks,\n        positionView,\n        disposed,\n        borrowedDisposed: { ...borrowedDisposed },\n        borrowedAtHostDisposal,\n        three: { ...three.host.diagnostics },\n        dom: domRoot.diagnostics(),\n      };\n    },\n    dispose() {\n      if (disposed) return;\n      disposed = true;\n      const errors: unknown[] = [];\n      for (const cleanup of [() => queue.dispose(), () => domRoot.dispose(), () => three.dispose()]) {\n        try { cleanup(); } catch (error) { errors.push(error); }\n      }\n      borrowedAtHostDisposal = { ...borrowedDisposed };\n      for (const cleanup of [() => borrowedGeometry.dispose(), () => borrowedMaterial.dispose()]) {\n        try { cleanup(); } catch (error) { errors.push(error); }\n      }\n      if (errors.length) throw new AggregateError(errors, \"Installed scene disposal failed\");\n    },\n  };\n}\n\ndeclare global {\n  interface Window { installedScene?: ReturnType<typeof mountInstalledScene> }\n}\n\nconst host = document.querySelector<HTMLElement>(\"#app\");\nconst portal = document.querySelector<HTMLElement>(\"#dialog-portal\");\nif (host && portal) window.installedScene = mountInstalledScene(host, portal);\n",
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
			"name": "Detail",
			"component_site_id": "main.tsx#component:Detail",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "main.tsx#component:Detail#store:0",
				"source_expression": "props.resource"
			}, {
				"site_id": "main.tsx#component:Detail#store:1",
				"source_expression": "props.point"
			}],
			"closedStoreHostProgram": {
				"componentProgramId": "main.tsx#component:Detail",
				"host": {
					"children": [{
						"expression": {
							"kind": "binary",
							"left": {
								"index": 0,
								"kind": "input"
							},
							"operator": "+",
							"right": {
								"index": 1,
								"kind": "input"
							}
						},
						"kind": "text"
					}],
					"key": "detail",
					"props": [["data-detail", {
						"index": 0,
						"kind": "input"
					}], ["data-joint", {
						"kind": "binary",
						"left": {
							"index": 0,
							"kind": "input"
						},
						"operator": "+",
						"right": {
							"index": 1,
							"kind": "input"
						}
					}]],
					"tag": "output"
				},
				"inputs": [{
					"storeProp": "resource",
					"storeUseSiteId": "main.tsx#component:Detail#store:0"
				}, {
					"storeProp": "point",
					"storeUseSiteId": "main.tsx#component:Detail#store:1"
				}],
				"moduleRevision": "native-v1-acc9b987d6f39211",
				"schemaVersion": 4
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "DialogSlot",
			"component_site_id": "main.tsx#component:DialogSlot",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "main.tsx#component:DialogSlot#store:0",
				"source_expression": "props.domain.open"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Health",
			"component_site_id": "main.tsx#component:Health",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "main.tsx#component:Health#store:0",
				"source_expression": "props.resource"
			}],
			"closedResourceHostProgram": {
				"componentProgramId": "main.tsx#component:Health",
				"host": {
					"children": [{
						"expression": {
							"index": 0,
							"kind": "input"
						},
						"kind": "text"
					}],
					"key": "health",
					"props": [["data-health", {
						"index": 0,
						"kind": "input"
					}]],
					"tag": "output"
				},
				"moduleRevision": "native-v1-acc9b987d6f39211",
				"resourceProp": "resource",
				"resourceUseSiteId": "main.tsx#component:Health#store:0",
				"schemaVersion": 2
			},
			"closedStoreHostProgram": {
				"componentProgramId": "main.tsx#component:Health",
				"host": {
					"children": [{
						"expression": {
							"index": 0,
							"kind": "input"
						},
						"kind": "text"
					}],
					"key": "health",
					"props": [["data-health", {
						"index": 0,
						"kind": "input"
					}]],
					"tag": "output"
				},
				"inputs": [{
					"storeProp": "resource",
					"storeUseSiteId": "main.tsx#component:Health#store:0"
				}],
				"moduleRevision": "native-v1-acc9b987d6f39211",
				"schemaVersion": 4
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Position",
			"component_site_id": "main.tsx#component:Position",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "main.tsx#component:Position#store:0",
				"source_expression": "props.point"
			}],
			"closedResourceHostProgram": {
				"componentProgramId": "main.tsx#component:Position",
				"host": {
					"children": [{
						"expression": {
							"index": 0,
							"kind": "input"
						},
						"kind": "text"
					}],
					"key": "position",
					"props": [["data-point", {
						"index": 0,
						"kind": "input"
					}]],
					"tag": "output"
				},
				"moduleRevision": "native-v1-acc9b987d6f39211",
				"resourceProp": "point",
				"resourceUseSiteId": "main.tsx#component:Position#store:0",
				"schemaVersion": 2
			},
			"closedStoreHostProgram": {
				"componentProgramId": "main.tsx#component:Position",
				"host": {
					"children": [{
						"expression": {
							"index": 0,
							"kind": "input"
						},
						"kind": "text"
					}],
					"key": "position",
					"props": [["data-point", {
						"index": 0,
						"kind": "input"
					}]],
					"tag": "output"
				},
				"inputs": [{
					"storeProp": "point",
					"storeUseSiteId": "main.tsx#component:Position#store:0"
				}],
				"moduleRevision": "native-v1-acc9b987d6f39211",
				"schemaVersion": 4
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "@r3act/core";
