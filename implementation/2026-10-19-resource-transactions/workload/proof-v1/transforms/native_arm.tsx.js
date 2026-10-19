import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx",
	"module_revision": "native-v1-6f8f48bc190bc2ae",
	"owners": [
		{
			"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Urgent",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:0",
			"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:1",
			"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B#store:0",
			"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C#store:0",
			"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback#state:0",
			"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Urgent#store:0",
			"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Urgent",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [],
	"operations": [
		{
			"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:0",
			"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:1",
			"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B#store:0",
			"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C#store:0",
			"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback#effect:0",
			"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Urgent#store:0",
			"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Urgent",
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
		if (event?.sourceFile === "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx") __invalidateNativeSemanticPlan("implementation/2026-10-19-resource-transactions/workload/native_arm.tsx", "native-v1-6f8f48bc190bc2ae");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { AsyncResource, Suspense, createDOMRoot, createStore, storeRecord, NativeRootWorkQueue } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useAt as __nativeUseAt } from "@r3act/core";
__nativeDefineComponent("implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A", A, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A",
		"host": {
			"children": [{
				"expression": {
					"index": 1,
					"kind": "input"
				},
				"kind": "text"
			}],
			"key": "a",
			"props": [["data-ready", {
				"kind": "literal",
				"value": "a"
			}], ["data-value", {
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
			}]],
			"tag": "output"
		},
		"inputs": [{
			"paths": [["sample", "x"], ["sample", "y"]],
			"storeProp": "resource",
			"storeUseSiteId": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:0"
		}, {
			"paths": [["point", "x"]],
			"storeProp": "position",
			"storeUseSiteId": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:1"
		}],
		"moduleRevision": "native-v1-6f8f48bc190bc2ae",
		"schemaVersion": 5
	}
});
__nativeDefineComponent("implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B", B, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B",
		"host": {
			"children": [{
				"expression": {
					"index": 1,
					"kind": "input"
				},
				"kind": "text"
			}],
			"key": "b",
			"props": [["data-ready", {
				"kind": "literal",
				"value": "b"
			}], ["data-value", {
				"index": 0,
				"kind": "input"
			}]],
			"tag": "output"
		},
		"inputs": [{
			"paths": [["sample", "x"], ["sample", "y"]],
			"storeProp": "resource",
			"storeUseSiteId": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B#store:0"
		}],
		"moduleRevision": "native-v1-6f8f48bc190bc2ae",
		"schemaVersion": 5
	}
});
__nativeDefineComponent("implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C", C, {
	propOnlySites: [],
	closedResourceHostProgram: {
		"componentProgramId": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C",
		"host": {
			"children": [],
			"key": "health",
			"props": [["data-health", {
				"index": 0,
				"kind": "input"
			}]],
			"tag": "span"
		},
		"moduleRevision": "native-v1-6f8f48bc190bc2ae",
		"resourceProp": "resource",
		"resourceUseSiteId": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C#store:0",
		"schemaVersion": 2
	}
});
__nativeDefineComponent("implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback", Fallback, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Urgent", Urgent, { propOnlySites: [] });
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
const a = deferred(), b = deferred(), health = deferred();
const resourceA = new AsyncResource(a.promise), resourceB = new AsyncResource(b.promise);
const resourceHealth = new AsyncResource(health.promise);
const position = createStore(storeRecord({ point: storeRecord({ x: 1 }) }), (_old, value) => value);
const life = {
	a: {
		mounts: 0,
		cleanups: 0
	},
	b: {
		mounts: 0,
		cleanups: 0
	}
};
const payload = (x, y) => storeRecord({ sample: storeRecord({
	x,
	y
}) });
function A(props) {
	const value = __nativeUseAt("implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:0", props.resource);
	const point = __nativeUseAt("implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:1", props.position);
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "a",
		"data-ready": "a",
		"data-value": value.sample.x + point.point.x
	}, value.sample.y);
}
function B(props) {
	const value = __nativeUseAt("implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B#store:0", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "b",
		"data-ready": "b",
		"data-value": value.sample.x
	}, value.sample.y);
}
function C(props) {
	const value = __nativeUseAt("implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C#store:0", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("span", {
		key: "health",
		"data-health": value
	});
}
function Fallback(props) {
	const [, setValue] = __nativeUseStateAt("implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback#state:0", 0);
	__nativeUseEffectAt("implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback#effect:0", () => {
		void setValue;
		life[props.slot].mounts++;
		return () => {
			life[props.slot].cleanups++;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: props.slot,
		"data-waiting": props.slot
	});
}
function Urgent(props) {
	const value = __nativeUseAt("implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Urgent#store:0", props.position);
	return /* @__PURE__ */ __nativeJsx.jsx("button", {
		key: "urgent",
		"data-urgent": value.point.x
	});
}
function App() {
	return /* @__PURE__ */ __nativeJsx.jsx("main", null, /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx(Fallback, { slot: "a" }),
		__nativeBoundarySite: "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(A, {
		resource: resourceA,
		position
	})), /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx(Fallback, { slot: "b" }),
		__nativeBoundarySite: "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#boundary:1"
	}, /* @__PURE__ */ __nativeJsx.jsx(B, { resource: resourceB })), /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("span", {
			key: "health",
			"data-health": "waiting"
		}),
		__nativeBoundarySite: "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#boundary:2"
	}, /* @__PURE__ */ __nativeJsx.jsx(C, { resource: resourceHealth })), /* @__PURE__ */ __nativeJsx.jsx(Urgent, { position }));
}
export function mountNative(host) {
	const root = createDOMRoot(host);
	const queue = new NativeRootWorkQueue();
	const mountStart = performance.now();
	root.mount(/* @__PURE__ */ __nativeJsx.jsx(App, null));
	const mountMs = performance.now() - mountStart;
	let callbackCount = 0, callbackView = null;
	const selected = queue.enqueueResources({
		id: "paired-resource-reveal",
		roots: [{
			root,
			resources: [resourceA, resourceB]
		}],
		onSettled(outcome) {
			if (outcome.status !== "committed") throw new Error(`selected resources ${outcome.status}`);
			callbackCount++;
			callbackView = `${host.querySelector("[data-ready=\"a\"]")?.getAttribute("data-value") ?? "missing"}:${host.querySelector("[data-ready=\"b\"]")?.getAttribute("data-value") ?? "missing"}`;
		}
	});
	return {
		mountMs,
		settleA() {
			a.resolve(payload(3, 4));
		},
		settleB() {
			b.resolve(payload(5, 6));
		},
		settleHealth() {
			health.resolve("healthy");
		},
		updateUrgent() {
			position.dispatch(storeRecord({ point: storeRecord({ x: 7 }) }));
		},
		state() {
			return {
				life: structuredClone(life),
				callbackCount,
				callbackView,
				queueStatus: selected.status
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
	"module_revision": "native-v1-6f8f48bc190bc2ae",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx",
		"module_revision": "native-v1-6f8f48bc190bc2ae",
		"owners": [
			{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Urgent",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:0",
				"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:1",
				"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B#store:0",
				"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C#store:0",
				"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback#state:0",
				"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Urgent#store:0",
				"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Urgent",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [],
		"operations": [
			{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:0",
				"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:1",
				"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B#store:0",
				"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C#store:0",
				"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback#effect:0",
				"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Urgent#store:0",
				"owner_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Urgent",
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
	"source_file": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { AsyncResource, Suspense, createDOMRoot, createStore, storeRecord,\n  NativeRootWorkQueue, use, useEffect, useState } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A\", A, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A\",\"host\":{\"children\":[{\"expression\":{\"index\":1,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"a\",\"props\":[[\"data-ready\",{\"kind\":\"literal\",\"value\":\"a\"}],[\"data-value\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"index\":2,\"kind\":\"input\"}}]],\"tag\":\"output\"},\"inputs\":[{\"paths\":[[\"sample\",\"x\"],[\"sample\",\"y\"]],\"storeProp\":\"resource\",\"storeUseSiteId\":\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:0\"},{\"paths\":[[\"point\",\"x\"]],\"storeProp\":\"position\",\"storeUseSiteId\":\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:1\"}],\"moduleRevision\":\"native-v1-6f8f48bc190bc2ae\",\"schemaVersion\":5} });\n__nativeDefineComponent(\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B\", B, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B\",\"host\":{\"children\":[{\"expression\":{\"index\":1,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"b\",\"props\":[[\"data-ready\",{\"kind\":\"literal\",\"value\":\"b\"}],[\"data-value\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"output\"},\"inputs\":[{\"paths\":[[\"sample\",\"x\"],[\"sample\",\"y\"]],\"storeProp\":\"resource\",\"storeUseSiteId\":\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B#store:0\"}],\"moduleRevision\":\"native-v1-6f8f48bc190bc2ae\",\"schemaVersion\":5} });\n__nativeDefineComponent(\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C\", C, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C\",\"host\":{\"children\":[],\"key\":\"health\",\"props\":[[\"data-health\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"span\"},\"moduleRevision\":\"native-v1-6f8f48bc190bc2ae\",\"resourceProp\":\"resource\",\"resourceUseSiteId\":\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C#store:0\",\"schemaVersion\":2} });\n__nativeDefineComponent(\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback\", Fallback, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Urgent\", Urgent, { propOnlySites: [] });\n\ntype Payload = Readonly<{ sample: Readonly<{ x: number; y: number }> }>;\nfunction deferred<T>() {\n  let resolve!: (value: T) => void;\n  const promise = new Promise<T>((done) => { resolve = done; });\n  return { promise, resolve };\n}\nconst a = deferred<Payload>(), b = deferred<Payload>(), health = deferred<string>();\nconst resourceA = new AsyncResource(a.promise), resourceB = new AsyncResource(b.promise);\nconst resourceHealth = new AsyncResource(health.promise);\nconst position = createStore(storeRecord({ point: storeRecord({ x: 1 }) }), (_old, value) => value);\nconst life = { a: { mounts: 0, cleanups: 0 }, b: { mounts: 0, cleanups: 0 } };\nconst payload = (x: number, y: number) => storeRecord({ sample: storeRecord({ x, y }) });\nfunction A(props: { resource: typeof resourceA; position: typeof position }) {\n  const value = __nativeUseAt(\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:0\", props.resource);\n  const point = __nativeUseAt(\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:1\", props.position);\n  return <output key=\"a\" data-ready=\"a\" data-value={value.sample.x + point.point.x}>{value.sample.y}</output>;\n}\nfunction B(props: { resource: typeof resourceB }) {\n  const value = __nativeUseAt(\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B#store:0\", props.resource);\n  return <output key=\"b\" data-ready=\"b\" data-value={value.sample.x}>{value.sample.y}</output>;\n}\nfunction C(props: { resource: typeof resourceHealth }) { const value = __nativeUseAt(\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C#store:0\", props.resource); return <span key=\"health\" data-health={value} />; }\nfunction Fallback(props: { slot: \"a\" | \"b\" }) {\n  const [, setValue] = __nativeUseStateAt(\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback#state:0\", 0);\n  __nativeUseEffectAt(\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback#effect:0\", () => { void setValue; life[props.slot].mounts++; return () => { life[props.slot].cleanups++; }; });\n  return <output key={props.slot} data-waiting={props.slot} />;\n}\nfunction Urgent(props: { position: typeof position }) {\n  const value = __nativeUseAt(\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Urgent#store:0\", props.position);\n  return <button key=\"urgent\" data-urgent={value.point.x} />;\n}\nfunction App() {\n  return <main><Suspense fallback={<Fallback slot=\"a\" />} __nativeBoundarySite=\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#boundary:0\"><A resource={resourceA} position={position} /></Suspense><Suspense fallback={<Fallback slot=\"b\" />} __nativeBoundarySite=\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#boundary:1\"><B resource={resourceB} /></Suspense><Suspense fallback={<span key=\"health\" data-health=\"waiting\" />} __nativeBoundarySite=\"implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#boundary:2\"><C resource={resourceHealth} /></Suspense><Urgent position={position} /></main>;\n}\nexport function mountNative(host: HTMLElement) {\n  const root = createDOMRoot(host);\n  const queue = new NativeRootWorkQueue();\n  const mountStart = performance.now(); root.mount(<App />);\n  const mountMs = performance.now() - mountStart;\n  let callbackCount = 0, callbackView: string | null = null;\n  const selected = queue.enqueueResources({ id: \"paired-resource-reveal\", roots: [\n    { root, resources: [resourceA, resourceB] },\n  ], onSettled(outcome) {\n    if (outcome.status !== \"committed\") throw new Error(`selected resources ${outcome.status}`);\n    callbackCount++;\n    callbackView = `${host.querySelector('[data-ready=\"a\"]')?.getAttribute(\"data-value\") ?? \"missing\"}:${host.querySelector('[data-ready=\"b\"]')?.getAttribute(\"data-value\") ?? \"missing\"}`;\n  } });\n  return {\n    mountMs,\n    settleA() { a.resolve(payload(3, 4)); },\n    settleB() { b.resolve(payload(5, 6)); },\n    settleHealth() { health.resolve(\"healthy\"); },\n    updateUrgent() { position.dispatch(storeRecord({ point: storeRecord({ x: 7 }) })); },\n    state() { return { life: structuredClone(life), callbackCount, callbackView, queueStatus: selected.status }; },\n    dispose() { queue.dispose(); root.dispose(); return root.diagnostics(); },\n  };\n}\n",
	"components": [
		{
			"name": "A",
			"component_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:0",
				"source_expression": "props.resource"
			}, {
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:1",
				"source_expression": "props.position"
			}],
			"closedStoreHostProgram": {
				"componentProgramId": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A",
				"host": {
					"children": [{
						"expression": {
							"index": 1,
							"kind": "input"
						},
						"kind": "text"
					}],
					"key": "a",
					"props": [["data-ready", {
						"kind": "literal",
						"value": "a"
					}], ["data-value", {
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
					}]],
					"tag": "output"
				},
				"inputs": [{
					"paths": [["sample", "x"], ["sample", "y"]],
					"storeProp": "resource",
					"storeUseSiteId": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:0"
				}, {
					"paths": [["point", "x"]],
					"storeProp": "position",
					"storeUseSiteId": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:A#store:1"
				}],
				"moduleRevision": "native-v1-6f8f48bc190bc2ae",
				"schemaVersion": 5
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "App",
			"component_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:App",
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
			"name": "B",
			"component_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B#store:0",
				"source_expression": "props.resource"
			}],
			"closedStoreHostProgram": {
				"componentProgramId": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B",
				"host": {
					"children": [{
						"expression": {
							"index": 1,
							"kind": "input"
						},
						"kind": "text"
					}],
					"key": "b",
					"props": [["data-ready", {
						"kind": "literal",
						"value": "b"
					}], ["data-value", {
						"index": 0,
						"kind": "input"
					}]],
					"tag": "output"
				},
				"inputs": [{
					"paths": [["sample", "x"], ["sample", "y"]],
					"storeProp": "resource",
					"storeUseSiteId": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:B#store:0"
				}],
				"moduleRevision": "native-v1-6f8f48bc190bc2ae",
				"schemaVersion": 5
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "C",
			"component_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C#store:0",
				"source_expression": "props.resource"
			}],
			"closedResourceHostProgram": {
				"componentProgramId": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C",
				"host": {
					"children": [],
					"key": "health",
					"props": [["data-health", {
						"index": 0,
						"kind": "input"
					}]],
					"tag": "span"
				},
				"moduleRevision": "native-v1-6f8f48bc190bc2ae",
				"resourceProp": "resource",
				"resourceUseSiteId": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:C#store:0",
				"schemaVersion": 2
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Fallback",
			"component_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Fallback#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Urgent",
			"component_site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Urgent",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-19-resource-transactions/workload/native_arm.tsx#component:Urgent#store:0",
				"source_expression": "props.position"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "@r3act/core";
