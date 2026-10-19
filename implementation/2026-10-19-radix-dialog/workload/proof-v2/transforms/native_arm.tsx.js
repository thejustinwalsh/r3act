import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "implementation/2026-10-19-radix-dialog/workload/native_arm.tsx",
	"module_revision": "native-v1-cf53c52b0f7dfdb7",
	"owners": [{
		"site_id": "implementation/2026-10-19-radix-dialog/workload/native_arm.tsx#component:NativeRootView",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [],
	"sinks": [],
	"operations": [],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {},
		"execution_order": []
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "implementation/2026-10-19-radix-dialog/workload/native_arm.tsx") __invalidateNativeSemanticPlan("implementation/2026-10-19-radix-dialog/workload/native_arm.tsx", "native-v1-cf53c52b0f7dfdb7");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { AsyncResource, createDOMRoot, NativeRootWorkQueue, storeRecord, Suspense } from "@r3act/core";
import { defineComponent as __nativeDefineComponent } from "@r3act/core";
__nativeDefineComponent("implementation/2026-10-19-radix-dialog/workload/native_arm.tsx#component:NativeRootView", NativeRootView, { propOnlySites: [] });
import { NativeRadixApp, createOpenStore, createPointStore } from "../../../compiler/fixtures/native-radix-dialog.tsx";
import { createDialogTrace } from "./dialog_body.tsx";
function deferred() {
	let resolve;
	const promise = new Promise((done) => {
		resolve = done;
	});
	return {
		promise,
		resolve
	};
}
function NativeRootView(props) {
	return /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("output", { "data-native-waiting": "true" }),
		__nativeBoundarySite: "implementation/2026-10-19-radix-dialog/workload/native_arm.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(NativeRadixApp, props));
}
export function mountNative(host, portal) {
	const root = createDOMRoot(host), queue = new NativeRootWorkQueue();
	const { trace, observer } = createDialogTrace();
	const openStore = createOpenStore(), pointStore = createPointStore();
	const pending = deferred(), resource = new AsyncResource(pending.promise);
	let callbackCount = 0, callbackOpen = false, groupedCallback = 0;
	const onOpenChange = (open) => {
		callbackCount++;
		callbackOpen = open;
		openStore.dispatch(storeRecord({ open }));
	};
	const tree = (label, order, gate = false) => /* @__PURE__ */ __nativeJsx.jsx(NativeRootView, {
		openStore,
		pointStore,
		label,
		order,
		portalContainer: portal,
		observer,
		onOpenChange,
		gate: gate ? resource : undefined
	});
	root.mount(tree("accepted", ["dialog", "other"]));
	return {
		trace,
		host,
		portal,
		root,
		externalOpen() {
			openStore.dispatch(storeRecord({ open: true }));
		},
		externalClose() {
			openStore.dispatch(storeRecord({ open: false }));
		},
		updatePoint() {
			pointStore.dispatch(storeRecord({ point: 7 }));
		},
		reorder() {
			root.update(tree("accepted", ["other", "dialog"]));
		},
		discard() {
			const candidate = root.prepare(tree("discarded", ["other", "dialog"]));
			candidate.discard();
		},
		pending() {
			return queue.enqueue({
				id: "radix-dialog-pending",
				roots: [{
					root,
					tree: tree("next", ["other", "dialog"], true)
				}],
				onSettled(outcome) {
					if (outcome.status !== "committed") throw new Error(`pending dialog ${outcome.status}`);
					groupedCallback++;
					if (host.querySelector("[data-native-label=\"next\"]") === null) throw new Error("native dialog callback preceded accepted root");
				}
			});
		},
		settle() {
			pending.resolve("ready");
		},
		replaceReady() {
			const stale = root.prepare(tree("stale", ["other", "dialog"]));
			root.update(tree("fresh", ["other", "dialog"]));
			if (stale.validate()) throw new Error("stale dialog candidate validated after newer publication");
			stale.discard();
		},
		remove() {
			root.update(/* @__PURE__ */ __nativeJsx.jsx(NativeRootView, {
				openStore,
				pointStore,
				label: "fresh",
				order: ["other"],
				portalContainer: portal,
				observer,
				onOpenChange
			}));
		},
		reinsert() {
			root.update(tree("fresh", ["other", "dialog"]));
		},
		state() {
			return {
				callbackCount,
				callbackOpen,
				groupedCallback,
				open: openStore.getState().open,
				version: root.publicationVersion,
				trace: structuredClone(trace)
			};
		},
		dispose() {
			queue.dispose();
			root.dispose();
			return root.diagnostics();
		}
	};
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-cf53c52b0f7dfdb7",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "implementation/2026-10-19-radix-dialog/workload/native_arm.tsx",
		"module_revision": "native-v1-cf53c52b0f7dfdb7",
		"owners": [{
			"site_id": "implementation/2026-10-19-radix-dialog/workload/native_arm.tsx#component:NativeRootView",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [],
		"sinks": [],
		"operations": [],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {},
			"execution_order": []
		}
	},
	"source_file": "implementation/2026-10-19-radix-dialog/workload/native_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { AsyncResource, createDOMRoot, jsx, NativeRootWorkQueue, storeRecord, Suspense } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"implementation/2026-10-19-radix-dialog/workload/native_arm.tsx#component:NativeRootView\", NativeRootView, { propOnlySites: [] });\nimport { NativeRadixApp, createOpenStore, createPointStore,\n  type NativeRadixProps } from \"../../../compiler/fixtures/native-radix-dialog.tsx\";\nimport { createDialogTrace } from \"./dialog_body.tsx\";\n\nfunction deferred<T>() {\n  let resolve!: (value: T) => void;\n  const promise = new Promise<T>(done => { resolve = done; });\n  return { promise, resolve };\n}\nfunction NativeRootView(props: NativeRadixProps) {\n  return <Suspense fallback={<output data-native-waiting=\"true\" />} __nativeBoundarySite=\"implementation/2026-10-19-radix-dialog/workload/native_arm.tsx#boundary:0\"><NativeRadixApp {...props} /></Suspense>;\n}\nexport function mountNative(host: HTMLElement, portal: HTMLElement) {\n  const root = createDOMRoot(host), queue = new NativeRootWorkQueue();\n  const { trace, observer } = createDialogTrace();\n  const openStore = createOpenStore(), pointStore = createPointStore();\n  const pending = deferred<string>(), resource = new AsyncResource(pending.promise);\n  let callbackCount = 0, callbackOpen = false, groupedCallback = 0;\n  const onOpenChange = (open: boolean) => {\n    callbackCount++;\n    callbackOpen = open;\n    openStore.dispatch(storeRecord({ open }));\n  };\n  const tree = (label: string, order: readonly string[], gate = false) =>\n    <NativeRootView openStore={openStore} pointStore={pointStore} label={label} order={order}\n      portalContainer={portal} observer={observer} onOpenChange={onOpenChange}\n      gate={gate ? resource : undefined} />;\n  root.mount(tree(\"accepted\", [\"dialog\", \"other\"]));\n  return {\n    trace, host, portal, root,\n    externalOpen() { openStore.dispatch(storeRecord({ open: true })); },\n    externalClose() { openStore.dispatch(storeRecord({ open: false })); },\n    updatePoint() { pointStore.dispatch(storeRecord({ point: 7 })); },\n    reorder() { root.update(tree(\"accepted\", [\"other\", \"dialog\"])); },\n    discard() { const candidate = root.prepare(tree(\"discarded\", [\"other\", \"dialog\"])); candidate.discard(); },\n    pending() { return queue.enqueue({ id: \"radix-dialog-pending\", roots: [\n      { root, tree: tree(\"next\", [\"other\", \"dialog\"], true) },\n    ], onSettled(outcome) {\n      if (outcome.status !== \"committed\") throw new Error(`pending dialog ${outcome.status}`);\n      groupedCallback++;\n      if (host.querySelector('[data-native-label=\"next\"]') === null)\n        throw new Error(\"native dialog callback preceded accepted root\");\n    } }); },\n    settle() { pending.resolve(\"ready\"); },\n    replaceReady() {\n      const stale = root.prepare(tree(\"stale\", [\"other\", \"dialog\"]));\n      root.update(tree(\"fresh\", [\"other\", \"dialog\"]));\n      if (stale.validate()) throw new Error(\"stale dialog candidate validated after newer publication\");\n      stale.discard();\n    },\n    remove() { root.update(<NativeRootView openStore={openStore} pointStore={pointStore}\n      label=\"fresh\" order={[\"other\"]} portalContainer={portal} observer={observer}\n      onOpenChange={onOpenChange} />); },\n    reinsert() { root.update(tree(\"fresh\", [\"other\", \"dialog\"])); },\n    state() { return { callbackCount, callbackOpen, groupedCallback,\n      open: openStore.getState().open, version: root.publicationVersion, trace: structuredClone(trace) }; },\n    dispose() { queue.dispose(); root.dispose(); return root.diagnostics(); },\n  };\n}\n",
	"components": [{
		"name": "NativeRootView",
		"component_site_id": "implementation/2026-10-19-radix-dialog/workload/native_arm.tsx#component:NativeRootView",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}]
};
import * as __nativeJsx from "@r3act/core";
