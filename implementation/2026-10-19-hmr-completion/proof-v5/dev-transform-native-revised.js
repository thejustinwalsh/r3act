import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/main.tsx");const createElement = __vite__cjsImport10_react["createElement"];import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "/node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_8be8f42ef9db25da9d9e35d6d564c12a/node_modules/@r3act/core/dist/src/native_runtime_api.js?v=8ce1d4f6";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "main.tsx",
	"module_revision": "native-v1-361c25740deaac39",
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
		if (event?.sourceFile === "main.tsx" && event.previousRevision === "native-v1-361c25740deaac39" && event.previousInstance === "11c84ea3-0870-4b02-8af0-e9a5c4b04dfe:vite-native-6") __invalidateNativeSemanticPlan("main.tsx", "native-v1-361c25740deaac39");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/core */
// @native-ui
import { Suspense, NativeRootWorkQueue, createWorld } from "/node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_8be8f42ef9db25da9d9e35d6d564c12a/node_modules/@r3act/core/dist/src/native_runtime_api.js?v=8ce1d4f6";
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt } from "/node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_8be8f42ef9db25da9d9e35d6d564c12a/node_modules/@r3act/core/dist/src/native_runtime_api.js?v=8ce1d4f6";
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
		"moduleRevision": "native-v1-361c25740deaac39",
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
		"moduleRevision": "native-v1-361c25740deaac39",
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
		"moduleRevision": "native-v1-361c25740deaac39",
		"schemaVersion": 4
	}
});
import { createDOMRoot } from "/node_modules/.vite/deps/@r3act_host-dom.js?v=f84968cd";
import { createThreeNativeRoot } from "/node_modules/.vite/deps/@r3act_host-three.js?v=27463a6d";
import { RadixDialog } from "/node_modules/.vite/deps/@r3act_react-bridge_radix-dialog.js?v=6daf561a";
import __vite__cjsImport10_react from "/node_modules/.vite/deps/react.js?v=c6eb636d";
import { BoxGeometry, MeshBasicMaterial, Scene } from "/node_modules/.vite/deps/three.js?v=3efd3166";
import { ReactPanel } from "/react-panel.tsx?t=1792443997500";
import { ThreeApp } from "/scene.tsx";
import { createSceneDomain } from "/state.ts";
export const nativeRevision = "native-v2";
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
export const Position = __nativeDefineComponent("main.tsx#component:Position", { Position: (props) => {
	const point = __nativeUseAt("main.tsx#component:Position#store:0", props.point);
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "position",
		"data-point": point
	}, point);
} }.Position, { propOnlySites: [] });
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
		children: createElement(ReactPanel, { trace: props.trace })
	}));
}
export function App(props) {
	return /* @__PURE__ */ __nativeJsx.jsx("main", null, /* @__PURE__ */ __nativeJsx.jsx("h1", { "data-native-revision": nativeRevision }, "Installed R3ACT HMR ", nativeRevision), /* @__PURE__ */ __nativeJsx.jsx("p", null, "Native controls update one Store read by this page and a Three scene."), /* @__PURE__ */ __nativeJsx.jsx("div", {
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
				if (outcome.status === "cancelled") return;
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
				if (outcome.status === "cancelled") return;
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
				nativeRevision,
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
const previous = sessionStorage.getItem("r3act-installed-hmr-disposal");
if (previous) window.installedHmrPrevious = JSON.parse(previous);
if (host && portal) window.installedHmr = mountInstalledScene(host, portal);
const recordDisposal = () => {
	window.installedHmr?.dispose();
	if (window.installedHmr) sessionStorage.setItem("r3act-installed-hmr-disposal", JSON.stringify(window.installedHmr.snapshot()));
};
window.addEventListener("pagehide", recordDisposal, { once: true });
if (import.meta.hot) {
	import.meta.hot.dispose(() => {
		window.removeEventListener("pagehide", recordDisposal);
		recordDisposal();
	});
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-361c25740deaac39",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "main.tsx",
		"module_revision": "native-v1-361c25740deaac39",
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
	"component_module": "/** @jsxImportSource @r3act/core */\n// @native-ui\nimport { Suspense, NativeRootWorkQueue, createWorld, use } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"main.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"main.tsx#component:Detail\", Detail, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"main.tsx#component:Detail\",\"host\":{\"children\":[{\"expression\":{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"index\":1,\"kind\":\"input\"}},\"kind\":\"text\"}],\"key\":\"detail\",\"props\":[[\"data-detail\",{\"index\":0,\"kind\":\"input\"}],[\"data-joint\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"index\":1,\"kind\":\"input\"}}]],\"tag\":\"output\"},\"inputs\":[{\"storeProp\":\"resource\",\"storeUseSiteId\":\"main.tsx#component:Detail#store:0\"},{\"storeProp\":\"point\",\"storeUseSiteId\":\"main.tsx#component:Detail#store:1\"}],\"moduleRevision\":\"native-v1-361c25740deaac39\",\"schemaVersion\":4} });\n__nativeDefineComponent(\"main.tsx#component:DialogSlot\", DialogSlot, { propOnlySites: [] });\n__nativeDefineComponent(\"main.tsx#component:Health\", Health, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\"main.tsx#component:Health\",\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"health\",\"props\":[[\"data-health\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"output\"},\"moduleRevision\":\"native-v1-361c25740deaac39\",\"resourceProp\":\"resource\",\"resourceUseSiteId\":\"main.tsx#component:Health#store:0\",\"schemaVersion\":2}, closedStoreHostProgram: {\"componentProgramId\":\"main.tsx#component:Health\",\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"health\",\"props\":[[\"data-health\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"output\"},\"inputs\":[{\"storeProp\":\"resource\",\"storeUseSiteId\":\"main.tsx#component:Health#store:0\"}],\"moduleRevision\":\"native-v1-361c25740deaac39\",\"schemaVersion\":4} });\nimport { createDOMRoot } from \"@r3act/host-dom\";\nimport { createThreeNativeRoot } from \"@r3act/host-three\";\nimport { RadixDialog } from \"@r3act/react-bridge/radix-dialog\";\nimport { createElement } from \"react\";\nimport { BoxGeometry, MeshBasicMaterial, Scene } from \"three\";\nimport { ReactPanel, type DialogTrace } from \"./react-panel\";\nimport { ThreeApp } from \"./scene\";\nimport { createSceneDomain, type SceneDomain } from \"./state\";\n\nexport const nativeRevision = \"native-v2\";\n\ntype AppProps = {\n  domain: SceneDomain;\n  portal: HTMLElement;\n  trace: DialogTrace;\n  order: readonly string[];\n  onOpenChange: (open: boolean) => void;\n  onMove: () => void;\n  onReorder: () => void;\n  onLoadDetail: () => void;\n  onLoadSignal: () => void;\n  onLoadHealth: () => void;\n};\n\nexport function Detail(props: { resource: SceneDomain[\"detail\"]; point: SceneDomain[\"point\"] }) {\n  const value = __nativeUseAt(\"main.tsx#component:Detail#store:0\", props.resource);\n  const point = __nativeUseAt(\"main.tsx#component:Detail#store:1\", props.point);\n  return <output key=\"detail\" data-detail={value} data-joint={value + point}>{value + point}</output>;\n}\n\nexport function Health(props: { resource: SceneDomain[\"health\"] }) {\n  const value = __nativeUseAt(\"main.tsx#component:Health#store:0\", props.resource);\n  return <output key=\"health\" data-health={value}>{value}</output>;\n}\n\nexport const Position = __nativeDefineComponent(\"main.tsx#component:Position\", ({ Position: (props: { point: SceneDomain[\"point\"] }) => {\n  const point = __nativeUseAt(\"main.tsx#component:Position#store:0\", props.point);\n  return <output key=\"position\" data-point={point}>{point}</output>;\n} }).Position, { propOnlySites: [] });\n\nexport function DialogSlot(props: AppProps) {\n  const open = __nativeUseAt(\"main.tsx#component:DialogSlot#store:0\", props.domain.open);\n  return <div key=\"dialog\" data-dialog-slot=\"true\">\n    <RadixDialog open={open} onOpenChange={props.onOpenChange}\n      title=\"Scene settings\" description=\"A controlled dialog for this scene\"\n      triggerLabel=\"Open scene settings\" closeLabel=\"Close settings\"\n      portalContainer={props.portal} className=\"dialog-content\"\n      overlayClassName=\"dialog-overlay\"\n      children={createElement(ReactPanel, { trace: props.trace })} />\n  </div>;\n}\n\nexport function App(props: AppProps) {\n  return <main>\n    <h1 data-native-revision={nativeRevision}>Installed R3ACT HMR {nativeRevision}</h1>\n    <p>Native controls update one Store read by this page and a Three scene.</p>\n    <div role=\"group\" aria-label=\"Scene controls\">\n      <button type=\"button\" data-action=\"move\" onClick={props.onMove}>Move scene</button>\n      <button type=\"button\" data-action=\"reorder\" onClick={props.onReorder}>Reorder settings</button>\n      <button type=\"button\" data-action=\"detail\" onClick={props.onLoadDetail}>Load detail</button>\n      <button type=\"button\" data-action=\"signal\" onClick={props.onLoadSignal}>Load signal</button>\n      <button type=\"button\" data-action=\"health\" onClick={props.onLoadHealth}>Load health</button>\n    </div>\n    <Position point={props.domain.point} />\n    <Suspense fallback={<output key=\"detail\" data-detail=\"waiting\">Detail waiting</output>} __nativeBoundarySite=\"main.tsx#boundary:0\">\n      <Detail resource={props.domain.detail} point={props.domain.point} />\n    </Suspense>\n    <Suspense fallback={<output key=\"health\" data-health=\"waiting\">Health waiting</output>} __nativeBoundarySite=\"main.tsx#boundary:1\">\n      <Health resource={props.domain.health} />\n    </Suspense>\n    <div data-islands=\"true\">{props.order.map((id) => id === \"dialog\" ?\n      <DialogSlot key=\"dialog\" {...props} /> :\n      <output key=\"other\" data-other=\"stable\">Other island</output>)}</div>\n  </main>;\n}\n\nexport function mountInstalledScene(host: HTMLElement, portal: HTMLElement) {\n  const domain = createSceneDomain();\n  const scene = new Scene();\n  const portalParent = portal.parentNode;\n  const borrowedDisposed = { geometry: 0, material: 0 };\n  const { borrowedGeometry, borrowedMaterial, domRoot, three, queue } = (() => {\n    let geometry: BoxGeometry | undefined;\n    let material: MeshBasicMaterial | undefined;\n    let dom: ReturnType<typeof createDOMRoot<HTMLElement>> | undefined;\n    let sceneRoot: ReturnType<typeof createThreeNativeRoot> | undefined;\n    let workQueue: NativeRootWorkQueue | undefined;\n    try {\n      geometry = new BoxGeometry(0.5, 0.5, 0.5);\n      material = new MeshBasicMaterial({ color: \"#637188\" });\n      geometry.addEventListener(\"dispose\", () => { borrowedDisposed.geometry++; });\n      material.addEventListener(\"dispose\", () => { borrowedDisposed.material++; });\n      const world = createWorld();\n      dom = createDOMRoot(host, { world, rootId: \"installed-dom\" });\n      sceneRoot = createThreeNativeRoot(scene, { rootOptions: { world, rootId: \"installed-three\" } });\n      workQueue = new NativeRootWorkQueue();\n      return { borrowedGeometry: geometry, borrowedMaterial: material,\n        domRoot: dom, three: sceneRoot, queue: workQueue };\n    } catch (error) {\n      const errors: unknown[] = [error];\n      for (const cleanup of [() => workQueue?.dispose(), () => dom?.dispose(),\n        () => sceneRoot?.dispose(), () => geometry?.dispose(), () => material?.dispose()]) {\n        try { cleanup(); } catch (cleanupError) { errors.push(cleanupError); }\n      }\n      throw new AggregateError(errors, \"Installed scene construction failed\");\n    }\n  })();\n  const trace: DialogTrace = { mounts: 0, cleanups: 0 };\n  let order: readonly string[] = [\"dialog\", \"other\"];\n  let disposed = false;\n  let dialogIdentity: Element | null = null;\n  let cursorIdentity: object | null = null;\n  let revealCallbacks = 0;\n  let revealView: string | null = null;\n  let positionCallbacks = 0;\n  let positionView: string | null = null;\n  let borrowedAtHostDisposal: { geometry: number; material: number } | null = null;\n  const onOpenChange = (open: boolean) => { domain.open.dispatch(open); };\n  const updatePoint = (next: number) => {\n    domain.point.dispatch(next);\n    if (reveal.status !== \"committed\") return;\n    queue.enqueueStores({ id: `joint-position-${next}`, roots: [\n      { root: domRoot, stores: [domain.point] },\n      { root: three.root, stores: [domain.point] },\n    ], onSettled(outcome) {\n      if (outcome.status === \"cancelled\") return;\n      if (outcome.status !== \"committed\") throw new Error(`Joint position ${outcome.status}`);\n      positionCallbacks++;\n      positionView = `${host.querySelector('[data-point]')?.getAttribute(\"data-point\") ?? \"missing\"}:${scene.getObjectByName(\"cursor\")?.position.x ?? \"missing\"}`;\n    } });\n  };\n  const onMove = () => { updatePoint(domain.point.getState() + 1); };\n  const onLoadDetail = () => { domain.resolveDetail(3); };\n  const onLoadSignal = () => { domain.resolveSignal(5); };\n  const onLoadHealth = () => { domain.resolveHealth(\"healthy\"); };\n  const onReorder = () => { order = [...order].reverse(); domRoot.update(tree()); };\n  const tree = () => <App domain={domain} portal={portal} trace={trace} order={order}\n    onOpenChange={onOpenChange} onMove={onMove} onReorder={onReorder}\n    onLoadDetail={onLoadDetail} onLoadSignal={onLoadSignal} onLoadHealth={onLoadHealth} />;\n  let reveal!: ReturnType<NativeRootWorkQueue[\"enqueueResources\"]>;\n  try {\n    domRoot.mount(tree());\n    three.root.mount(<ThreeApp domain={domain} geometry={borrowedGeometry} material={borrowedMaterial} />);\n    dialogIdentity = host.querySelector('[data-dialog-slot=\"true\"]');\n    cursorIdentity = scene.getObjectByName(\"cursor\") ?? null;\n    reveal = queue.enqueueResources({ id: \"joint-dom-three-reveal\", roots: [\n      { root: domRoot, resources: [domain.detail] },\n      { root: three.root, resources: [domain.signal] },\n    ], onSettled(outcome) {\n      if (outcome.status === \"cancelled\") return;\n      if (outcome.status !== \"committed\") throw new Error(`Joint reveal ${outcome.status}`);\n      revealCallbacks++;\n      revealView = `${host.querySelector('[data-detail]')?.getAttribute(\"data-detail\") ?? \"missing\"}:${scene.getObjectByName(\"signal-ready\")?.position.x ?? \"missing\"}`;\n    } });\n  } catch (error) {\n    const errors: unknown[] = [error];\n    for (const cleanup of [() => queue.dispose(), () => domRoot.dispose(), () => three.dispose(),\n      () => borrowedGeometry.dispose(), () => borrowedMaterial.dispose()]) {\n      try { cleanup(); } catch (cleanupError) { errors.push(cleanupError); }\n    }\n    throw new AggregateError(errors, \"Installed scene setup failed\");\n  }\n  return {\n    settleA: onLoadDetail,\n    settleB: onLoadSignal,\n    settleHealth: onLoadHealth,\n    updatePoint(next?: number) { updatePoint(next ?? domain.point.getState() + 1); },\n    reorder: onReorder,\n    externalOpen() { domain.open.dispatch(true); },\n    externalClose() { domain.open.dispatch(false); },\n    removeDialog() { order = [\"other\"]; domRoot.update(tree()); },\n    reinsertDialog() { order = [\"dialog\", \"other\"]; domRoot.update(tree()); },\n    snapshot() {\n      const cursor = scene.getObjectByName(\"cursor\");\n      const signal = scene.getObjectByName(\"signal-ready\") ?? scene.getObjectByName(\"signal-waiting\");\n      const slot = host.querySelector('[data-dialog-slot=\"true\"]');\n      const note = portal.querySelector<HTMLInputElement>('input[aria-label=\"Dialog note\"]');\n      return {\n        point: domain.point.getState(),\n        nativeRevision,\n        domPoint: host.querySelector('[data-point]')?.getAttribute(\"data-point\") ?? null,\n        domDetail: host.querySelector('[data-detail]')?.getAttribute(\"data-detail\") ?? null,\n        domJoint: host.querySelector('[data-joint]')?.getAttribute(\"data-joint\") ?? null,\n        health: host.querySelector('[data-health]')?.getAttribute(\"data-health\") ?? null,\n        sceneCursorX: cursor?.position.x ?? null,\n        sceneSignalName: signal?.name ?? null,\n        sceneSignalX: signal?.position.x ?? null,\n        sceneChildren: scene.children.length,\n        cursorRetained: cursor === cursorIdentity,\n        dialogPresent: slot !== null,\n        dialogRetained: slot !== null && slot === dialogIdentity,\n        dialogOpen: domain.open.getState(),\n        portalChildCount: portal.childElementCount,\n        portalRetained: portal.parentNode === portalParent && portal.isConnected,\n        noteValue: note?.value ?? null,\n        noteSelectionStart: note?.selectionStart ?? null,\n        noteSelectionEnd: note?.selectionEnd ?? null,\n        dialogLocalCount: portal.querySelector('[data-dialog-local]')?.getAttribute(\"data-dialog-local\") ?? null,\n        dialogMounts: trace.mounts,\n        dialogCleanups: trace.cleanups,\n        revealStatus: reveal.status,\n        revealCallbacks,\n        revealView,\n        positionCallbacks,\n        positionView,\n        disposed,\n        borrowedDisposed: { ...borrowedDisposed },\n        borrowedAtHostDisposal,\n        three: { ...three.host.diagnostics },\n        dom: domRoot.diagnostics(),\n      };\n    },\n    dispose() {\n      if (disposed) return;\n      disposed = true;\n      const errors: unknown[] = [];\n      for (const cleanup of [() => queue.dispose(), () => domRoot.dispose(), () => three.dispose()]) {\n        try { cleanup(); } catch (error) { errors.push(error); }\n      }\n      borrowedAtHostDisposal = { ...borrowedDisposed };\n      for (const cleanup of [() => borrowedGeometry.dispose(), () => borrowedMaterial.dispose()]) {\n        try { cleanup(); } catch (error) { errors.push(error); }\n      }\n      if (errors.length) throw new AggregateError(errors, \"Installed scene disposal failed\");\n    },\n  };\n}\n\ndeclare global {\n  interface Window {\n    installedHmr?: ReturnType<typeof mountInstalledScene>;\n    installedHmrPrevious?: ReturnType<ReturnType<typeof mountInstalledScene>[\"snapshot\"]>;\n  }\n}\n\nconst host = document.querySelector<HTMLElement>(\"#app\");\nconst portal = document.querySelector<HTMLElement>(\"#dialog-portal\");\nconst previous = sessionStorage.getItem(\"r3act-installed-hmr-disposal\");\nif (previous) window.installedHmrPrevious = JSON.parse(previous);\nif (host && portal) window.installedHmr = mountInstalledScene(host, portal);\nconst recordDisposal = () => {\n  window.installedHmr?.dispose();\n  if (window.installedHmr) sessionStorage.setItem(\n    \"r3act-installed-hmr-disposal\", JSON.stringify(window.installedHmr.snapshot()));\n};\nwindow.addEventListener(\"pagehide\", recordDisposal, { once: true });\nif (import.meta.hot) {\n  import.meta.hot.dispose(() => {\n    window.removeEventListener(\"pagehide\", recordDisposal);\n    recordDisposal();\n  });\n}\n",
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
				"moduleRevision": "native-v1-361c25740deaac39",
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
				"moduleRevision": "native-v1-361c25740deaac39",
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
				"moduleRevision": "native-v1-361c25740deaac39",
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
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "/node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_8be8f42ef9db25da9d9e35d6d564c12a/node_modules/@r3act/core/dist/src/native_runtime_api.js?v=8ce1d4f6";

//# sourceMappingURL=data:application/json;base64,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dCI6W10sInNvdXJjZXMiOlsibWFpbi50c3giXSwic291cmNlc0NvbnRlbnQiOlsiLyoqIEBqc3hJbXBvcnRTb3VyY2UgQHIzYWN0L2NvcmUgKi9cbi8vIEBuYXRpdmUtdWlcbmltcG9ydCB7IFN1c3BlbnNlLCBOYXRpdmVSb290V29ya1F1ZXVlLCBjcmVhdGVXb3JsZCwgdXNlIH0gZnJvbSBcIkByM2FjdC9jb3JlXCI7XG5pbXBvcnQgeyBjcmVhdGVET01Sb290IH0gZnJvbSBcIkByM2FjdC9ob3N0LWRvbVwiO1xuaW1wb3J0IHsgY3JlYXRlVGhyZWVOYXRpdmVSb290IH0gZnJvbSBcIkByM2FjdC9ob3N0LXRocmVlXCI7XG5pbXBvcnQgeyBSYWRpeERpYWxvZyB9IGZyb20gXCJAcjNhY3QvcmVhY3QtYnJpZGdlL3JhZGl4LWRpYWxvZ1wiO1xuaW1wb3J0IHsgY3JlYXRlRWxlbWVudCB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHsgQm94R2VvbWV0cnksIE1lc2hCYXNpY01hdGVyaWFsLCBTY2VuZSB9IGZyb20gXCJ0aHJlZVwiO1xuaW1wb3J0IHsgUmVhY3RQYW5lbCwgdHlwZSBEaWFsb2dUcmFjZSB9IGZyb20gXCIuL3JlYWN0LXBhbmVsXCI7XG5pbXBvcnQgeyBUaHJlZUFwcCB9IGZyb20gXCIuL3NjZW5lXCI7XG5pbXBvcnQgeyBjcmVhdGVTY2VuZURvbWFpbiwgdHlwZSBTY2VuZURvbWFpbiB9IGZyb20gXCIuL3N0YXRlXCI7XG5cbmV4cG9ydCBjb25zdCBuYXRpdmVSZXZpc2lvbiA9IFwibmF0aXZlLXYyXCI7XG5cbnR5cGUgQXBwUHJvcHMgPSB7XG4gIGRvbWFpbjogU2NlbmVEb21haW47XG4gIHBvcnRhbDogSFRNTEVsZW1lbnQ7XG4gIHRyYWNlOiBEaWFsb2dUcmFjZTtcbiAgb3JkZXI6IHJlYWRvbmx5IHN0cmluZ1tdO1xuICBvbk9wZW5DaGFuZ2U6IChvcGVuOiBib29sZWFuKSA9PiB2b2lkO1xuICBvbk1vdmU6ICgpID0+IHZvaWQ7XG4gIG9uUmVvcmRlcjogKCkgPT4gdm9pZDtcbiAgb25Mb2FkRGV0YWlsOiAoKSA9PiB2b2lkO1xuICBvbkxvYWRTaWduYWw6ICgpID0+IHZvaWQ7XG4gIG9uTG9hZEhlYWx0aDogKCkgPT4gdm9pZDtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBEZXRhaWwocHJvcHM6IHsgcmVzb3VyY2U6IFNjZW5lRG9tYWluW1wiZGV0YWlsXCJdOyBwb2ludDogU2NlbmVEb21haW5bXCJwb2ludFwiXSB9KSB7XG4gIGNvbnN0IHZhbHVlID0gdXNlKHByb3BzLnJlc291cmNlKTtcbiAgY29uc3QgcG9pbnQgPSB1c2UocHJvcHMucG9pbnQpO1xuICByZXR1cm4gPG91dHB1dCBrZXk9XCJkZXRhaWxcIiBkYXRhLWRldGFpbD17dmFsdWV9IGRhdGEtam9pbnQ9e3ZhbHVlICsgcG9pbnR9Pnt2YWx1ZSArIHBvaW50fTwvb3V0cHV0Pjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIEhlYWx0aChwcm9wczogeyByZXNvdXJjZTogU2NlbmVEb21haW5bXCJoZWFsdGhcIl0gfSkge1xuICBjb25zdCB2YWx1ZSA9IHVzZShwcm9wcy5yZXNvdXJjZSk7XG4gIHJldHVybiA8b3V0cHV0IGtleT1cImhlYWx0aFwiIGRhdGEtaGVhbHRoPXt2YWx1ZX0+e3ZhbHVlfTwvb3V0cHV0Pjtcbn1cblxuZXhwb3J0IGNvbnN0IFBvc2l0aW9uID0gKHByb3BzOiB7IHBvaW50OiBTY2VuZURvbWFpbltcInBvaW50XCJdIH0pID0+IHtcbiAgY29uc3QgcG9pbnQgPSB1c2UocHJvcHMucG9pbnQpO1xuICByZXR1cm4gPG91dHB1dCBrZXk9XCJwb3NpdGlvblwiIGRhdGEtcG9pbnQ9e3BvaW50fT57cG9pbnR9PC9vdXRwdXQ+O1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIERpYWxvZ1Nsb3QocHJvcHM6IEFwcFByb3BzKSB7XG4gIGNvbnN0IG9wZW4gPSB1c2UocHJvcHMuZG9tYWluLm9wZW4pO1xuICByZXR1cm4gPGRpdiBrZXk9XCJkaWFsb2dcIiBkYXRhLWRpYWxvZy1zbG90PVwidHJ1ZVwiPlxuICAgIDxSYWRpeERpYWxvZyBvcGVuPXtvcGVufSBvbk9wZW5DaGFuZ2U9e3Byb3BzLm9uT3BlbkNoYW5nZX1cbiAgICAgIHRpdGxlPVwiU2NlbmUgc2V0dGluZ3NcIiBkZXNjcmlwdGlvbj1cIkEgY29udHJvbGxlZCBkaWFsb2cgZm9yIHRoaXMgc2NlbmVcIlxuICAgICAgdHJpZ2dlckxhYmVsPVwiT3BlbiBzY2VuZSBzZXR0aW5nc1wiIGNsb3NlTGFiZWw9XCJDbG9zZSBzZXR0aW5nc1wiXG4gICAgICBwb3J0YWxDb250YWluZXI9e3Byb3BzLnBvcnRhbH0gY2xhc3NOYW1lPVwiZGlhbG9nLWNvbnRlbnRcIlxuICAgICAgb3ZlcmxheUNsYXNzTmFtZT1cImRpYWxvZy1vdmVybGF5XCJcbiAgICAgIGNoaWxkcmVuPXtjcmVhdGVFbGVtZW50KFJlYWN0UGFuZWwsIHsgdHJhY2U6IHByb3BzLnRyYWNlIH0pfSAvPlxuICA8L2Rpdj47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBBcHAocHJvcHM6IEFwcFByb3BzKSB7XG4gIHJldHVybiA8bWFpbj5cbiAgICA8aDEgZGF0YS1uYXRpdmUtcmV2aXNpb249e25hdGl2ZVJldmlzaW9ufT5JbnN0YWxsZWQgUjNBQ1QgSE1SIHtuYXRpdmVSZXZpc2lvbn08L2gxPlxuICAgIDxwPk5hdGl2ZSBjb250cm9scyB1cGRhdGUgb25lIFN0b3JlIHJlYWQgYnkgdGhpcyBwYWdlIGFuZCBhIFRocmVlIHNjZW5lLjwvcD5cbiAgICA8ZGl2IHJvbGU9XCJncm91cFwiIGFyaWEtbGFiZWw9XCJTY2VuZSBjb250cm9sc1wiPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hY3Rpb249XCJtb3ZlXCIgb25DbGljaz17cHJvcHMub25Nb3ZlfT5Nb3ZlIHNjZW5lPC9idXR0b24+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLWFjdGlvbj1cInJlb3JkZXJcIiBvbkNsaWNrPXtwcm9wcy5vblJlb3JkZXJ9PlJlb3JkZXIgc2V0dGluZ3M8L2J1dHRvbj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRhdGEtYWN0aW9uPVwiZGV0YWlsXCIgb25DbGljaz17cHJvcHMub25Mb2FkRGV0YWlsfT5Mb2FkIGRldGFpbDwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hY3Rpb249XCJzaWduYWxcIiBvbkNsaWNrPXtwcm9wcy5vbkxvYWRTaWduYWx9PkxvYWQgc2lnbmFsPC9idXR0b24+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLWFjdGlvbj1cImhlYWx0aFwiIG9uQ2xpY2s9e3Byb3BzLm9uTG9hZEhlYWx0aH0+TG9hZCBoZWFsdGg8L2J1dHRvbj5cbiAgICA8L2Rpdj5cbiAgICA8UG9zaXRpb24gcG9pbnQ9e3Byb3BzLmRvbWFpbi5wb2ludH0gLz5cbiAgICA8U3VzcGVuc2UgZmFsbGJhY2s9ezxvdXRwdXQga2V5PVwiZGV0YWlsXCIgZGF0YS1kZXRhaWw9XCJ3YWl0aW5nXCI+RGV0YWlsIHdhaXRpbmc8L291dHB1dD59PlxuICAgICAgPERldGFpbCByZXNvdXJjZT17cHJvcHMuZG9tYWluLmRldGFpbH0gcG9pbnQ9e3Byb3BzLmRvbWFpbi5wb2ludH0gLz5cbiAgICA8L1N1c3BlbnNlPlxuICAgIDxTdXNwZW5zZSBmYWxsYmFjaz17PG91dHB1dCBrZXk9XCJoZWFsdGhcIiBkYXRhLWhlYWx0aD1cIndhaXRpbmdcIj5IZWFsdGggd2FpdGluZzwvb3V0cHV0Pn0+XG4gICAgICA8SGVhbHRoIHJlc291cmNlPXtwcm9wcy5kb21haW4uaGVhbHRofSAvPlxuICAgIDwvU3VzcGVuc2U+XG4gICAgPGRpdiBkYXRhLWlzbGFuZHM9XCJ0cnVlXCI+e3Byb3BzLm9yZGVyLm1hcCgoaWQpID0+IGlkID09PSBcImRpYWxvZ1wiID9cbiAgICAgIDxEaWFsb2dTbG90IGtleT1cImRpYWxvZ1wiIHsuLi5wcm9wc30gLz4gOlxuICAgICAgPG91dHB1dCBrZXk9XCJvdGhlclwiIGRhdGEtb3RoZXI9XCJzdGFibGVcIj5PdGhlciBpc2xhbmQ8L291dHB1dD4pfTwvZGl2PlxuICA8L21haW4+O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbW91bnRJbnN0YWxsZWRTY2VuZShob3N0OiBIVE1MRWxlbWVudCwgcG9ydGFsOiBIVE1MRWxlbWVudCkge1xuICBjb25zdCBkb21haW4gPSBjcmVhdGVTY2VuZURvbWFpbigpO1xuICBjb25zdCBzY2VuZSA9IG5ldyBTY2VuZSgpO1xuICBjb25zdCBwb3J0YWxQYXJlbnQgPSBwb3J0YWwucGFyZW50Tm9kZTtcbiAgY29uc3QgYm9ycm93ZWREaXNwb3NlZCA9IHsgZ2VvbWV0cnk6IDAsIG1hdGVyaWFsOiAwIH07XG4gIGNvbnN0IHsgYm9ycm93ZWRHZW9tZXRyeSwgYm9ycm93ZWRNYXRlcmlhbCwgZG9tUm9vdCwgdGhyZWUsIHF1ZXVlIH0gPSAoKCkgPT4ge1xuICAgIGxldCBnZW9tZXRyeTogQm94R2VvbWV0cnkgfCB1bmRlZmluZWQ7XG4gICAgbGV0IG1hdGVyaWFsOiBNZXNoQmFzaWNNYXRlcmlhbCB8IHVuZGVmaW5lZDtcbiAgICBsZXQgZG9tOiBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVET01Sb290PEhUTUxFbGVtZW50Pj4gfCB1bmRlZmluZWQ7XG4gICAgbGV0IHNjZW5lUm9vdDogUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlVGhyZWVOYXRpdmVSb290PiB8IHVuZGVmaW5lZDtcbiAgICBsZXQgd29ya1F1ZXVlOiBOYXRpdmVSb290V29ya1F1ZXVlIHwgdW5kZWZpbmVkO1xuICAgIHRyeSB7XG4gICAgICBnZW9tZXRyeSA9IG5ldyBCb3hHZW9tZXRyeSgwLjUsIDAuNSwgMC41KTtcbiAgICAgIG1hdGVyaWFsID0gbmV3IE1lc2hCYXNpY01hdGVyaWFsKHsgY29sb3I6IFwiIzYzNzE4OFwiIH0pO1xuICAgICAgZ2VvbWV0cnkuYWRkRXZlbnRMaXN0ZW5lcihcImRpc3Bvc2VcIiwgKCkgPT4geyBib3Jyb3dlZERpc3Bvc2VkLmdlb21ldHJ5Kys7IH0pO1xuICAgICAgbWF0ZXJpYWwuYWRkRXZlbnRMaXN0ZW5lcihcImRpc3Bvc2VcIiwgKCkgPT4geyBib3Jyb3dlZERpc3Bvc2VkLm1hdGVyaWFsKys7IH0pO1xuICAgICAgY29uc3Qgd29ybGQgPSBjcmVhdGVXb3JsZCgpO1xuICAgICAgZG9tID0gY3JlYXRlRE9NUm9vdChob3N0LCB7IHdvcmxkLCByb290SWQ6IFwiaW5zdGFsbGVkLWRvbVwiIH0pO1xuICAgICAgc2NlbmVSb290ID0gY3JlYXRlVGhyZWVOYXRpdmVSb290KHNjZW5lLCB7IHJvb3RPcHRpb25zOiB7IHdvcmxkLCByb290SWQ6IFwiaW5zdGFsbGVkLXRocmVlXCIgfSB9KTtcbiAgICAgIHdvcmtRdWV1ZSA9IG5ldyBOYXRpdmVSb290V29ya1F1ZXVlKCk7XG4gICAgICByZXR1cm4geyBib3Jyb3dlZEdlb21ldHJ5OiBnZW9tZXRyeSwgYm9ycm93ZWRNYXRlcmlhbDogbWF0ZXJpYWwsXG4gICAgICAgIGRvbVJvb3Q6IGRvbSwgdGhyZWU6IHNjZW5lUm9vdCwgcXVldWU6IHdvcmtRdWV1ZSB9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBlcnJvcnM6IHVua25vd25bXSA9IFtlcnJvcl07XG4gICAgICBmb3IgKGNvbnN0IGNsZWFudXAgb2YgWygpID0+IHdvcmtRdWV1ZT8uZGlzcG9zZSgpLCAoKSA9PiBkb20/LmRpc3Bvc2UoKSxcbiAgICAgICAgKCkgPT4gc2NlbmVSb290Py5kaXNwb3NlKCksICgpID0+IGdlb21ldHJ5Py5kaXNwb3NlKCksICgpID0+IG1hdGVyaWFsPy5kaXNwb3NlKCldKSB7XG4gICAgICAgIHRyeSB7IGNsZWFudXAoKTsgfSBjYXRjaCAoY2xlYW51cEVycm9yKSB7IGVycm9ycy5wdXNoKGNsZWFudXBFcnJvcik7IH1cbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBBZ2dyZWdhdGVFcnJvcihlcnJvcnMsIFwiSW5zdGFsbGVkIHNjZW5lIGNvbnN0cnVjdGlvbiBmYWlsZWRcIik7XG4gICAgfVxuICB9KSgpO1xuICBjb25zdCB0cmFjZTogRGlhbG9nVHJhY2UgPSB7IG1vdW50czogMCwgY2xlYW51cHM6IDAgfTtcbiAgbGV0IG9yZGVyOiByZWFkb25seSBzdHJpbmdbXSA9IFtcImRpYWxvZ1wiLCBcIm90aGVyXCJdO1xuICBsZXQgZGlzcG9zZWQgPSBmYWxzZTtcbiAgbGV0IGRpYWxvZ0lkZW50aXR5OiBFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIGxldCBjdXJzb3JJZGVudGl0eTogb2JqZWN0IHwgbnVsbCA9IG51bGw7XG4gIGxldCByZXZlYWxDYWxsYmFja3MgPSAwO1xuICBsZXQgcmV2ZWFsVmlldzogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIGxldCBwb3NpdGlvbkNhbGxiYWNrcyA9IDA7XG4gIGxldCBwb3NpdGlvblZpZXc6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBsZXQgYm9ycm93ZWRBdEhvc3REaXNwb3NhbDogeyBnZW9tZXRyeTogbnVtYmVyOyBtYXRlcmlhbDogbnVtYmVyIH0gfCBudWxsID0gbnVsbDtcbiAgY29uc3Qgb25PcGVuQ2hhbmdlID0gKG9wZW46IGJvb2xlYW4pID0+IHsgZG9tYWluLm9wZW4uZGlzcGF0Y2gob3Blbik7IH07XG4gIGNvbnN0IHVwZGF0ZVBvaW50ID0gKG5leHQ6IG51bWJlcikgPT4ge1xuICAgIGRvbWFpbi5wb2ludC5kaXNwYXRjaChuZXh0KTtcbiAgICBpZiAocmV2ZWFsLnN0YXR1cyAhPT0gXCJjb21taXR0ZWRcIikgcmV0dXJuO1xuICAgIHF1ZXVlLmVucXVldWVTdG9yZXMoeyBpZDogYGpvaW50LXBvc2l0aW9uLSR7bmV4dH1gLCByb290czogW1xuICAgICAgeyByb290OiBkb21Sb290LCBzdG9yZXM6IFtkb21haW4ucG9pbnRdIH0sXG4gICAgICB7IHJvb3Q6IHRocmVlLnJvb3QsIHN0b3JlczogW2RvbWFpbi5wb2ludF0gfSxcbiAgICBdLCBvblNldHRsZWQob3V0Y29tZSkge1xuICAgICAgaWYgKG91dGNvbWUuc3RhdHVzID09PSBcImNhbmNlbGxlZFwiKSByZXR1cm47XG4gICAgICBpZiAob3V0Y29tZS5zdGF0dXMgIT09IFwiY29tbWl0dGVkXCIpIHRocm93IG5ldyBFcnJvcihgSm9pbnQgcG9zaXRpb24gJHtvdXRjb21lLnN0YXR1c31gKTtcbiAgICAgIHBvc2l0aW9uQ2FsbGJhY2tzKys7XG4gICAgICBwb3NpdGlvblZpZXcgPSBgJHtob3N0LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXBvaW50XScpPy5nZXRBdHRyaWJ1dGUoXCJkYXRhLXBvaW50XCIpID8/IFwibWlzc2luZ1wifToke3NjZW5lLmdldE9iamVjdEJ5TmFtZShcImN1cnNvclwiKT8ucG9zaXRpb24ueCA/PyBcIm1pc3NpbmdcIn1gO1xuICAgIH0gfSk7XG4gIH07XG4gIGNvbnN0IG9uTW92ZSA9ICgpID0+IHsgdXBkYXRlUG9pbnQoZG9tYWluLnBvaW50LmdldFN0YXRlKCkgKyAxKTsgfTtcbiAgY29uc3Qgb25Mb2FkRGV0YWlsID0gKCkgPT4geyBkb21haW4ucmVzb2x2ZURldGFpbCgzKTsgfTtcbiAgY29uc3Qgb25Mb2FkU2lnbmFsID0gKCkgPT4geyBkb21haW4ucmVzb2x2ZVNpZ25hbCg1KTsgfTtcbiAgY29uc3Qgb25Mb2FkSGVhbHRoID0gKCkgPT4geyBkb21haW4ucmVzb2x2ZUhlYWx0aChcImhlYWx0aHlcIik7IH07XG4gIGNvbnN0IG9uUmVvcmRlciA9ICgpID0+IHsgb3JkZXIgPSBbLi4ub3JkZXJdLnJldmVyc2UoKTsgZG9tUm9vdC51cGRhdGUodHJlZSgpKTsgfTtcbiAgY29uc3QgdHJlZSA9ICgpID0+IDxBcHAgZG9tYWluPXtkb21haW59IHBvcnRhbD17cG9ydGFsfSB0cmFjZT17dHJhY2V9IG9yZGVyPXtvcmRlcn1cbiAgICBvbk9wZW5DaGFuZ2U9e29uT3BlbkNoYW5nZX0gb25Nb3ZlPXtvbk1vdmV9IG9uUmVvcmRlcj17b25SZW9yZGVyfVxuICAgIG9uTG9hZERldGFpbD17b25Mb2FkRGV0YWlsfSBvbkxvYWRTaWduYWw9e29uTG9hZFNpZ25hbH0gb25Mb2FkSGVhbHRoPXtvbkxvYWRIZWFsdGh9IC8+O1xuICBsZXQgcmV2ZWFsITogUmV0dXJuVHlwZTxOYXRpdmVSb290V29ya1F1ZXVlW1wiZW5xdWV1ZVJlc291cmNlc1wiXT47XG4gIHRyeSB7XG4gICAgZG9tUm9vdC5tb3VudCh0cmVlKCkpO1xuICAgIHRocmVlLnJvb3QubW91bnQoPFRocmVlQXBwIGRvbWFpbj17ZG9tYWlufSBnZW9tZXRyeT17Ym9ycm93ZWRHZW9tZXRyeX0gbWF0ZXJpYWw9e2JvcnJvd2VkTWF0ZXJpYWx9IC8+KTtcbiAgICBkaWFsb2dJZGVudGl0eSA9IGhvc3QucXVlcnlTZWxlY3RvcignW2RhdGEtZGlhbG9nLXNsb3Q9XCJ0cnVlXCJdJyk7XG4gICAgY3Vyc29ySWRlbnRpdHkgPSBzY2VuZS5nZXRPYmplY3RCeU5hbWUoXCJjdXJzb3JcIikgPz8gbnVsbDtcbiAgICByZXZlYWwgPSBxdWV1ZS5lbnF1ZXVlUmVzb3VyY2VzKHsgaWQ6IFwiam9pbnQtZG9tLXRocmVlLXJldmVhbFwiLCByb290czogW1xuICAgICAgeyByb290OiBkb21Sb290LCByZXNvdXJjZXM6IFtkb21haW4uZGV0YWlsXSB9LFxuICAgICAgeyByb290OiB0aHJlZS5yb290LCByZXNvdXJjZXM6IFtkb21haW4uc2lnbmFsXSB9LFxuICAgIF0sIG9uU2V0dGxlZChvdXRjb21lKSB7XG4gICAgICBpZiAob3V0Y29tZS5zdGF0dXMgPT09IFwiY2FuY2VsbGVkXCIpIHJldHVybjtcbiAgICAgIGlmIChvdXRjb21lLnN0YXR1cyAhPT0gXCJjb21taXR0ZWRcIikgdGhyb3cgbmV3IEVycm9yKGBKb2ludCByZXZlYWwgJHtvdXRjb21lLnN0YXR1c31gKTtcbiAgICAgIHJldmVhbENhbGxiYWNrcysrO1xuICAgICAgcmV2ZWFsVmlldyA9IGAke2hvc3QucXVlcnlTZWxlY3RvcignW2RhdGEtZGV0YWlsXScpPy5nZXRBdHRyaWJ1dGUoXCJkYXRhLWRldGFpbFwiKSA/PyBcIm1pc3NpbmdcIn06JHtzY2VuZS5nZXRPYmplY3RCeU5hbWUoXCJzaWduYWwtcmVhZHlcIik/LnBvc2l0aW9uLnggPz8gXCJtaXNzaW5nXCJ9YDtcbiAgICB9IH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnN0IGVycm9yczogdW5rbm93bltdID0gW2Vycm9yXTtcbiAgICBmb3IgKGNvbnN0IGNsZWFudXAgb2YgWygpID0+IHF1ZXVlLmRpc3Bvc2UoKSwgKCkgPT4gZG9tUm9vdC5kaXNwb3NlKCksICgpID0+IHRocmVlLmRpc3Bvc2UoKSxcbiAgICAgICgpID0+IGJvcnJvd2VkR2VvbWV0cnkuZGlzcG9zZSgpLCAoKSA9PiBib3Jyb3dlZE1hdGVyaWFsLmRpc3Bvc2UoKV0pIHtcbiAgICAgIHRyeSB7IGNsZWFudXAoKTsgfSBjYXRjaCAoY2xlYW51cEVycm9yKSB7IGVycm9ycy5wdXNoKGNsZWFudXBFcnJvcik7IH1cbiAgICB9XG4gICAgdGhyb3cgbmV3IEFnZ3JlZ2F0ZUVycm9yKGVycm9ycywgXCJJbnN0YWxsZWQgc2NlbmUgc2V0dXAgZmFpbGVkXCIpO1xuICB9XG4gIHJldHVybiB7XG4gICAgc2V0dGxlQTogb25Mb2FkRGV0YWlsLFxuICAgIHNldHRsZUI6IG9uTG9hZFNpZ25hbCxcbiAgICBzZXR0bGVIZWFsdGg6IG9uTG9hZEhlYWx0aCxcbiAgICB1cGRhdGVQb2ludChuZXh0PzogbnVtYmVyKSB7IHVwZGF0ZVBvaW50KG5leHQgPz8gZG9tYWluLnBvaW50LmdldFN0YXRlKCkgKyAxKTsgfSxcbiAgICByZW9yZGVyOiBvblJlb3JkZXIsXG4gICAgZXh0ZXJuYWxPcGVuKCkgeyBkb21haW4ub3Blbi5kaXNwYXRjaCh0cnVlKTsgfSxcbiAgICBleHRlcm5hbENsb3NlKCkgeyBkb21haW4ub3Blbi5kaXNwYXRjaChmYWxzZSk7IH0sXG4gICAgcmVtb3ZlRGlhbG9nKCkgeyBvcmRlciA9IFtcIm90aGVyXCJdOyBkb21Sb290LnVwZGF0ZSh0cmVlKCkpOyB9LFxuICAgIHJlaW5zZXJ0RGlhbG9nKCkgeyBvcmRlciA9IFtcImRpYWxvZ1wiLCBcIm90aGVyXCJdOyBkb21Sb290LnVwZGF0ZSh0cmVlKCkpOyB9LFxuICAgIHNuYXBzaG90KCkge1xuICAgICAgY29uc3QgY3Vyc29yID0gc2NlbmUuZ2V0T2JqZWN0QnlOYW1lKFwiY3Vyc29yXCIpO1xuICAgICAgY29uc3Qgc2lnbmFsID0gc2NlbmUuZ2V0T2JqZWN0QnlOYW1lKFwic2lnbmFsLXJlYWR5XCIpID8/IHNjZW5lLmdldE9iamVjdEJ5TmFtZShcInNpZ25hbC13YWl0aW5nXCIpO1xuICAgICAgY29uc3Qgc2xvdCA9IGhvc3QucXVlcnlTZWxlY3RvcignW2RhdGEtZGlhbG9nLXNsb3Q9XCJ0cnVlXCJdJyk7XG4gICAgICBjb25zdCBub3RlID0gcG9ydGFsLnF1ZXJ5U2VsZWN0b3I8SFRNTElucHV0RWxlbWVudD4oJ2lucHV0W2FyaWEtbGFiZWw9XCJEaWFsb2cgbm90ZVwiXScpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcG9pbnQ6IGRvbWFpbi5wb2ludC5nZXRTdGF0ZSgpLFxuICAgICAgICBuYXRpdmVSZXZpc2lvbixcbiAgICAgICAgZG9tUG9pbnQ6IGhvc3QucXVlcnlTZWxlY3RvcignW2RhdGEtcG9pbnRdJyk/LmdldEF0dHJpYnV0ZShcImRhdGEtcG9pbnRcIikgPz8gbnVsbCxcbiAgICAgICAgZG9tRGV0YWlsOiBob3N0LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWRldGFpbF0nKT8uZ2V0QXR0cmlidXRlKFwiZGF0YS1kZXRhaWxcIikgPz8gbnVsbCxcbiAgICAgICAgZG9tSm9pbnQ6IGhvc3QucXVlcnlTZWxlY3RvcignW2RhdGEtam9pbnRdJyk/LmdldEF0dHJpYnV0ZShcImRhdGEtam9pbnRcIikgPz8gbnVsbCxcbiAgICAgICAgaGVhbHRoOiBob3N0LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWhlYWx0aF0nKT8uZ2V0QXR0cmlidXRlKFwiZGF0YS1oZWFsdGhcIikgPz8gbnVsbCxcbiAgICAgICAgc2NlbmVDdXJzb3JYOiBjdXJzb3I/LnBvc2l0aW9uLnggPz8gbnVsbCxcbiAgICAgICAgc2NlbmVTaWduYWxOYW1lOiBzaWduYWw/Lm5hbWUgPz8gbnVsbCxcbiAgICAgICAgc2NlbmVTaWduYWxYOiBzaWduYWw/LnBvc2l0aW9uLnggPz8gbnVsbCxcbiAgICAgICAgc2NlbmVDaGlsZHJlbjogc2NlbmUuY2hpbGRyZW4ubGVuZ3RoLFxuICAgICAgICBjdXJzb3JSZXRhaW5lZDogY3Vyc29yID09PSBjdXJzb3JJZGVudGl0eSxcbiAgICAgICAgZGlhbG9nUHJlc2VudDogc2xvdCAhPT0gbnVsbCxcbiAgICAgICAgZGlhbG9nUmV0YWluZWQ6IHNsb3QgIT09IG51bGwgJiYgc2xvdCA9PT0gZGlhbG9nSWRlbnRpdHksXG4gICAgICAgIGRpYWxvZ09wZW46IGRvbWFpbi5vcGVuLmdldFN0YXRlKCksXG4gICAgICAgIHBvcnRhbENoaWxkQ291bnQ6IHBvcnRhbC5jaGlsZEVsZW1lbnRDb3VudCxcbiAgICAgICAgcG9ydGFsUmV0YWluZWQ6IHBvcnRhbC5wYXJlbnROb2RlID09PSBwb3J0YWxQYXJlbnQgJiYgcG9ydGFsLmlzQ29ubmVjdGVkLFxuICAgICAgICBub3RlVmFsdWU6IG5vdGU/LnZhbHVlID8/IG51bGwsXG4gICAgICAgIG5vdGVTZWxlY3Rpb25TdGFydDogbm90ZT8uc2VsZWN0aW9uU3RhcnQgPz8gbnVsbCxcbiAgICAgICAgbm90ZVNlbGVjdGlvbkVuZDogbm90ZT8uc2VsZWN0aW9uRW5kID8/IG51bGwsXG4gICAgICAgIGRpYWxvZ0xvY2FsQ291bnQ6IHBvcnRhbC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1kaWFsb2ctbG9jYWxdJyk/LmdldEF0dHJpYnV0ZShcImRhdGEtZGlhbG9nLWxvY2FsXCIpID8/IG51bGwsXG4gICAgICAgIGRpYWxvZ01vdW50czogdHJhY2UubW91bnRzLFxuICAgICAgICBkaWFsb2dDbGVhbnVwczogdHJhY2UuY2xlYW51cHMsXG4gICAgICAgIHJldmVhbFN0YXR1czogcmV2ZWFsLnN0YXR1cyxcbiAgICAgICAgcmV2ZWFsQ2FsbGJhY2tzLFxuICAgICAgICByZXZlYWxWaWV3LFxuICAgICAgICBwb3NpdGlvbkNhbGxiYWNrcyxcbiAgICAgICAgcG9zaXRpb25WaWV3LFxuICAgICAgICBkaXNwb3NlZCxcbiAgICAgICAgYm9ycm93ZWREaXNwb3NlZDogeyAuLi5ib3Jyb3dlZERpc3Bvc2VkIH0sXG4gICAgICAgIGJvcnJvd2VkQXRIb3N0RGlzcG9zYWwsXG4gICAgICAgIHRocmVlOiB7IC4uLnRocmVlLmhvc3QuZGlhZ25vc3RpY3MgfSxcbiAgICAgICAgZG9tOiBkb21Sb290LmRpYWdub3N0aWNzKCksXG4gICAgICB9O1xuICAgIH0sXG4gICAgZGlzcG9zZSgpIHtcbiAgICAgIGlmIChkaXNwb3NlZCkgcmV0dXJuO1xuICAgICAgZGlzcG9zZWQgPSB0cnVlO1xuICAgICAgY29uc3QgZXJyb3JzOiB1bmtub3duW10gPSBbXTtcbiAgICAgIGZvciAoY29uc3QgY2xlYW51cCBvZiBbKCkgPT4gcXVldWUuZGlzcG9zZSgpLCAoKSA9PiBkb21Sb290LmRpc3Bvc2UoKSwgKCkgPT4gdGhyZWUuZGlzcG9zZSgpXSkge1xuICAgICAgICB0cnkgeyBjbGVhbnVwKCk7IH0gY2F0Y2ggKGVycm9yKSB7IGVycm9ycy5wdXNoKGVycm9yKTsgfVxuICAgICAgfVxuICAgICAgYm9ycm93ZWRBdEhvc3REaXNwb3NhbCA9IHsgLi4uYm9ycm93ZWREaXNwb3NlZCB9O1xuICAgICAgZm9yIChjb25zdCBjbGVhbnVwIG9mIFsoKSA9PiBib3Jyb3dlZEdlb21ldHJ5LmRpc3Bvc2UoKSwgKCkgPT4gYm9ycm93ZWRNYXRlcmlhbC5kaXNwb3NlKCldKSB7XG4gICAgICAgIHRyeSB7IGNsZWFudXAoKTsgfSBjYXRjaCAoZXJyb3IpIHsgZXJyb3JzLnB1c2goZXJyb3IpOyB9XG4gICAgICB9XG4gICAgICBpZiAoZXJyb3JzLmxlbmd0aCkgdGhyb3cgbmV3IEFnZ3JlZ2F0ZUVycm9yKGVycm9ycywgXCJJbnN0YWxsZWQgc2NlbmUgZGlzcG9zYWwgZmFpbGVkXCIpO1xuICAgIH0sXG4gIH07XG59XG5cbmRlY2xhcmUgZ2xvYmFsIHtcbiAgaW50ZXJmYWNlIFdpbmRvdyB7XG4gICAgaW5zdGFsbGVkSG1yPzogUmV0dXJuVHlwZTx0eXBlb2YgbW91bnRJbnN0YWxsZWRTY2VuZT47XG4gICAgaW5zdGFsbGVkSG1yUHJldmlvdXM/OiBSZXR1cm5UeXBlPFJldHVyblR5cGU8dHlwZW9mIG1vdW50SW5zdGFsbGVkU2NlbmU+W1wic25hcHNob3RcIl0+O1xuICB9XG59XG5cbmNvbnN0IGhvc3QgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihcIiNhcHBcIik7XG5jb25zdCBwb3J0YWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihcIiNkaWFsb2ctcG9ydGFsXCIpO1xuY29uc3QgcHJldmlvdXMgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKFwicjNhY3QtaW5zdGFsbGVkLWhtci1kaXNwb3NhbFwiKTtcbmlmIChwcmV2aW91cykgd2luZG93Lmluc3RhbGxlZEhtclByZXZpb3VzID0gSlNPTi5wYXJzZShwcmV2aW91cyk7XG5pZiAoaG9zdCAmJiBwb3J0YWwpIHdpbmRvdy5pbnN0YWxsZWRIbXIgPSBtb3VudEluc3RhbGxlZFNjZW5lKGhvc3QsIHBvcnRhbCk7XG5jb25zdCByZWNvcmREaXNwb3NhbCA9ICgpID0+IHtcbiAgd2luZG93Lmluc3RhbGxlZEhtcj8uZGlzcG9zZSgpO1xuICBpZiAod2luZG93Lmluc3RhbGxlZEhtcikgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShcbiAgICBcInIzYWN0LWluc3RhbGxlZC1obXItZGlzcG9zYWxcIiwgSlNPTi5zdHJpbmdpZnkod2luZG93Lmluc3RhbGxlZEhtci5zbmFwc2hvdCgpKSk7XG59O1xud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJwYWdlaGlkZVwiLCByZWNvcmREaXNwb3NhbCwgeyBvbmNlOiB0cnVlIH0pO1xuaWYgKGltcG9ydC5tZXRhLmhvdCkge1xuICBpbXBvcnQubWV0YS5ob3QuZGlzcG9zZSgoKSA9PiB7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJwYWdlaGlkZVwiLCByZWNvcmREaXNwb3NhbCk7XG4gICAgcmVjb3JkRGlzcG9zYWwoKTtcbiAgfSk7XG59XG4iXSwiZmlsZSI6Ii9wcml2YXRlL3Zhci9mb2xkZXJzLzZwLzc5bXI4XzRuMzRkOV8ybTc1bjU0cjFxYzAwMDBnbi9UL3IzYWN0LWluc3RhbGxlZC1obXItaGltRjZsL21haW4udHN4In0=