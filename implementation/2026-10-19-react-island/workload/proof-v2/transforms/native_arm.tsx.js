import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "implementation/2026-10-19-react-island/workload/native_arm.tsx",
	"module_revision": "native-v1-3760e89c3b6f9a2b",
	"owners": [{
		"site_id": "implementation/2026-10-19-react-island/workload/native_arm.tsx#component:NativeRootView",
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
		if (event?.sourceFile === "implementation/2026-10-19-react-island/workload/native_arm.tsx") __invalidateNativeSemanticPlan("implementation/2026-10-19-react-island/workload/native_arm.tsx", "native-v1-3760e89c3b6f9a2b");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { AsyncResource, createDOMRoot, NativeRootWorkQueue, storeRecord, Suspense } from "@r3act/core";
import { defineComponent as __nativeDefineComponent } from "@r3act/core";
__nativeDefineComponent("implementation/2026-10-19-react-island/workload/native_arm.tsx#component:NativeRootView", NativeRootView, { propOnlySites: [] });
import { NativeIslandApp, createPointStore } from "../../../compiler/fixtures/native-react-island.tsx";
import { createIslandTrace } from "./react_leaf.tsx";
function NativeRootView(props) {
	return /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("output", { "data-native-waiting": "true" }),
		__nativeBoundarySite: "implementation/2026-10-19-react-island/workload/native_arm.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(NativeIslandApp, props));
}
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
export function mountNative(hosts) {
	const { trace, observer } = createIslandTrace();
	const points = [createPointStore(), createPointStore()];
	const roots = hosts.map((host) => createDOMRoot(host));
	const orders = [["a", "b"], ["c"]];
	const gate = deferred();
	const resource = new AsyncResource(gate.promise);
	const queue = new NativeRootWorkQueue();
	let nativeActions = 0, callbacks = 0, callbackVersions = [];
	const tree = (index, label, pending = false) => /* @__PURE__ */ __nativeJsx.jsx(NativeRootView, {
		label,
		order: orders[index],
		point: points[index],
		gate: pending ? resource : undefined,
		observer,
		onNativeAction: () => {
			nativeActions++;
		}
	});
	roots[0].mount(tree(0, "accepted"));
	roots[1].mount(tree(1, "accepted"));
	const initialVersions = roots.map((root) => root.publicationVersion);
	return {
		trace,
		roots,
		hosts,
		initialVersions,
		updatePoints() {
			points[0].dispatch(storeRecord({ point: 7 }));
			points[1].dispatch(storeRecord({ point: 9 }));
		},
		reorder() {
			roots[0].update(/* @__PURE__ */ __nativeJsx.jsx(NativeRootView, {
				label: "accepted",
				order: ["b", "a"],
				point: points[0],
				observer,
				onNativeAction: () => {
					nativeActions++;
				}
			}));
		},
		remove() {
			roots[0].update(/* @__PURE__ */ __nativeJsx.jsx(NativeRootView, {
				label: "accepted",
				order: ["b"],
				point: points[0],
				observer,
				onNativeAction: () => {
					nativeActions++;
				}
			}));
		},
		reinsert() {
			roots[0].update(/* @__PURE__ */ __nativeJsx.jsx(NativeRootView, {
				label: "accepted",
				order: ["b", "a"],
				point: points[0],
				observer,
				onNativeAction: () => {
					nativeActions++;
				}
			}));
		},
		discard() {
			const candidate = roots[0].prepare(tree(0, "discarded"));
			candidate.discard();
		},
		enqueuePending() {
			return queue.enqueue({
				id: "react-island-pending",
				roots: [{
					root: roots[0],
					tree: tree(0, "next", true)
				}, {
					root: roots[1],
					tree: tree(1, "next", true)
				}],
				onSettled(outcome) {
					if (outcome.status !== "committed") throw new Error(`native group ${outcome.status}`);
					callbacks++;
					callbackVersions = roots.map((root) => root.publicationVersion);
					if (hosts.some((host) => host.querySelector("[data-native-label=\"next\"]") === null)) throw new Error("native group callback preceded accepted roots");
				}
			});
		},
		settle() {
			gate.resolve("ready");
		},
		replaceReady() {
			const stale = roots[0].prepare(tree(0, "stale"));
			roots[0].update(tree(0, "fresh"));
			if (stale.validate()) throw new Error("stale native candidate validated after newer commit");
			stale.discard();
		},
		state() {
			return {
				nativeActions,
				callbacks,
				callbackVersions,
				versions: roots.map((root) => root.publicationVersion),
				trace: structuredClone(trace)
			};
		},
		dispose() {
			queue.dispose();
			const diagnostics = roots.map((root) => {
				root.dispose();
				return root.diagnostics();
			});
			return diagnostics;
		}
	};
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-3760e89c3b6f9a2b",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "implementation/2026-10-19-react-island/workload/native_arm.tsx",
		"module_revision": "native-v1-3760e89c3b6f9a2b",
		"owners": [{
			"site_id": "implementation/2026-10-19-react-island/workload/native_arm.tsx#component:NativeRootView",
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
	"source_file": "implementation/2026-10-19-react-island/workload/native_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { AsyncResource, createDOMRoot, jsx, NativeRootWorkQueue, storeRecord, Suspense } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"implementation/2026-10-19-react-island/workload/native_arm.tsx#component:NativeRootView\", NativeRootView, { propOnlySites: [] });\nimport { NativeIslandApp, createPointStore } from \"../../../compiler/fixtures/native-react-island.tsx\";\nimport { createIslandTrace } from \"./react_leaf.tsx\";\n\nfunction NativeRootView(props: Parameters<typeof NativeIslandApp>[0]) {\n  return <Suspense fallback={<output data-native-waiting=\"true\" />} __nativeBoundarySite=\"implementation/2026-10-19-react-island/workload/native_arm.tsx#boundary:0\"><NativeIslandApp {...props} /></Suspense>;\n}\n\nfunction deferred<T>() {\n  let resolve!: (value: T) => void;\n  const promise = new Promise<T>(done => { resolve = done; });\n  return { promise, resolve };\n}\n\nexport function mountNative(hosts: readonly [HTMLElement, HTMLElement]) {\n  const { trace, observer } = createIslandTrace();\n  const points = [createPointStore(), createPointStore()] as const;\n  const roots = hosts.map(host => createDOMRoot(host)) as [ReturnType<typeof createDOMRoot>, ReturnType<typeof createDOMRoot>];\n  const orders = [[\"a\", \"b\"], [\"c\"]] as const;\n  const gate = deferred<string>();\n  const resource = new AsyncResource(gate.promise);\n  const queue = new NativeRootWorkQueue();\n  let nativeActions = 0, callbacks = 0, callbackVersions: number[] = [];\n  const tree = (index: 0 | 1, label: string, pending = false) =>\n    <NativeRootView label={label} order={orders[index]} point={points[index]}\n      gate={pending ? resource : undefined} observer={observer} onNativeAction={() => { nativeActions++; }} />;\n  roots[0].mount(tree(0, \"accepted\"));\n  roots[1].mount(tree(1, \"accepted\"));\n  const initialVersions = roots.map(root => root.publicationVersion);\n  return {\n    trace, roots, hosts, initialVersions,\n    updatePoints() {\n      points[0].dispatch(storeRecord({ point: 7 }));\n      points[1].dispatch(storeRecord({ point: 9 }));\n    },\n    reorder() { roots[0].update(<NativeRootView label=\"accepted\" order={[\"b\", \"a\"]} point={points[0]}\n      observer={observer} onNativeAction={() => { nativeActions++; }} />); },\n    remove() { roots[0].update(<NativeRootView label=\"accepted\" order={[\"b\"]} point={points[0]}\n      observer={observer} onNativeAction={() => { nativeActions++; }} />); },\n    reinsert() { roots[0].update(<NativeRootView label=\"accepted\" order={[\"b\", \"a\"]} point={points[0]}\n      observer={observer} onNativeAction={() => { nativeActions++; }} />); },\n    discard() {\n      const candidate = roots[0].prepare(tree(0, \"discarded\"));\n      candidate.discard();\n    },\n    enqueuePending() {\n      return queue.enqueue({ id: \"react-island-pending\", roots: [\n        { root: roots[0], tree: tree(0, \"next\", true) },\n        { root: roots[1], tree: tree(1, \"next\", true) },\n      ], onSettled(outcome) {\n        if (outcome.status !== \"committed\") throw new Error(`native group ${outcome.status}`);\n        callbacks++;\n        callbackVersions = roots.map(root => root.publicationVersion);\n        if (hosts.some(host => host.querySelector('[data-native-label=\"next\"]') === null))\n          throw new Error(\"native group callback preceded accepted roots\");\n      } });\n    },\n    settle() { gate.resolve(\"ready\"); },\n    replaceReady() {\n      const stale = roots[0].prepare(tree(0, \"stale\"));\n      roots[0].update(tree(0, \"fresh\"));\n      if (stale.validate()) throw new Error(\"stale native candidate validated after newer commit\");\n      stale.discard();\n    },\n    state() { return { nativeActions, callbacks, callbackVersions,\n      versions: roots.map(root => root.publicationVersion), trace: structuredClone(trace) }; },\n    dispose() { queue.dispose(); const diagnostics = roots.map(root => { root.dispose(); return root.diagnostics(); }); return diagnostics; },\n  };\n}\n",
	"components": [{
		"name": "NativeRootView",
		"component_site_id": "implementation/2026-10-19-react-island/workload/native_arm.tsx#component:NativeRootView",
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
