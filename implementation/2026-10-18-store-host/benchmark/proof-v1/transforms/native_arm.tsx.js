import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "../../../src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx",
	"module_revision": "native-v1-7f1b6b3622778845",
	"owners": [
		{
			"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition#store:0",
			"owner_site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health#store:0",
			"owner_site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position#store:0",
			"owner_site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [],
	"operations": [
		{
			"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition#store:0",
			"owner_site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health#store:0",
			"owner_site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position#store:0",
			"owner_site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position",
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
		if (event?.sourceFile === "implementation/2026-10-18-store-host/benchmark/native_arm.tsx") __invalidateNativeSemanticPlan("implementation/2026-10-18-store-host/benchmark/native_arm.tsx", "native-v1-7f1b6b3622778845");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { createDOMRoot, createStore, Suspense } from "../../../src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt } from "../../../src/native_runtime_api.ts";
__nativeDefineComponent("implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition", DoublePosition, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition",
		"host": {
			"child": null,
			"key": "double-position",
			"props": [["data-double", {
				"kind": "binary",
				"left": {
					"index": 0,
					"kind": "input"
				},
				"operator": "*",
				"right": {
					"kind": "literal",
					"value": 2
				}
			}]],
			"tag": "output"
		},
		"moduleRevision": "native-v1-7f1b6b3622778845",
		"schemaVersion": 1,
		"storeProp": "position",
		"storeUseSiteId": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition#store:0"
	}
});
__nativeDefineComponent("implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health", Health, {
	propOnlySites: [],
	closedResourceHostProgram: {
		"componentProgramId": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health",
		"host": {
			"child": "resource-value",
			"key": "health",
			"props": [["data-health", "ready"]],
			"tag": "div"
		},
		"moduleRevision": "native-v1-7f1b6b3622778845",
		"resourceProp": "resource",
		"resourceUseSiteId": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health#store:0",
		"schemaVersion": 1
	}
});
__nativeDefineComponent("implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position", Position, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position",
		"host": {
			"child": null,
			"key": "position",
			"props": [["data-x", {
				"index": 0,
				"kind": "input"
			}]],
			"tag": "output"
		},
		"moduleRevision": "native-v1-7f1b6b3622778845",
		"schemaVersion": 1,
		"storeProp": "position",
		"storeUseSiteId": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position#store:0"
	}
});
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
const health = deferred();
const position = createStore(1);
function Health(props) {
	const value = __nativeUseAt("implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health#store:0", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("div", {
		key: "health",
		"data-health": "ready"
	}, value);
}
function Position(props) {
	const x = __nativeUseAt("implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position#store:0", props.position);
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "position",
		"data-x": x
	});
}
function DoublePosition(props) {
	const x = __nativeUseAt("implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition#store:0", props.position);
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "double-position",
		"data-double": x * 2
	});
}
function App() {
	return /* @__PURE__ */ __nativeJsx.jsx("main", null, /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("div", {
			key: "health",
			"data-health": "fallback"
		}, "health waiting"),
		__nativeBoundarySite: "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(Health, { resource: health.promise })), /* @__PURE__ */ __nativeJsx.jsx(Position, { position }), /* @__PURE__ */ __nativeJsx.jsx(DoublePosition, { position }));
}
export function mountNative(host) {
	const root = createDOMRoot(host);
	const started = performance.now();
	root.mount(/* @__PURE__ */ __nativeJsx.jsx(App, null));
	const mountDurationMs = performance.now() - started;
	return {
		mountDurationMs,
		updatePosition() {
			position.dispatch(7);
		},
		settleHealth() {
			health.resolve("health ready");
		},
		dispose() {
			root.dispose();
			return {
				...root.diagnostics(),
				store: position.diagnostics()
			};
		}
	};
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-7f1b6b3622778845",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx",
		"module_revision": "native-v1-7f1b6b3622778845",
		"owners": [
			{
				"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition#store:0",
				"owner_site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health#store:0",
				"owner_site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position#store:0",
				"owner_site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [],
		"operations": [
			{
				"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition#store:0",
				"owner_site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health#store:0",
				"owner_site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position#store:0",
				"owner_site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position",
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
	"source_file": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { createDOMRoot, createStore, Suspense, use } from \"../../../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../../../src/native_runtime_api.ts\";\n__nativeDefineComponent(\"implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition\", DoublePosition, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition\",\"host\":{\"child\":null,\"key\":\"double-position\",\"props\":[[\"data-double\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":2.0}}]],\"tag\":\"output\"},\"moduleRevision\":\"native-v1-7f1b6b3622778845\",\"schemaVersion\":1,\"storeProp\":\"position\",\"storeUseSiteId\":\"implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition#store:0\"} });\n__nativeDefineComponent(\"implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health\", Health, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\"implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health\",\"host\":{\"child\":\"resource-value\",\"key\":\"health\",\"props\":[[\"data-health\",\"ready\"]],\"tag\":\"div\"},\"moduleRevision\":\"native-v1-7f1b6b3622778845\",\"resourceProp\":\"resource\",\"resourceUseSiteId\":\"implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health#store:0\",\"schemaVersion\":1} });\n__nativeDefineComponent(\"implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position\", Position, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position\",\"host\":{\"child\":null,\"key\":\"position\",\"props\":[[\"data-x\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"output\"},\"moduleRevision\":\"native-v1-7f1b6b3622778845\",\"schemaVersion\":1,\"storeProp\":\"position\",\"storeUseSiteId\":\"implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position#store:0\"} });\n\ntype Deferred = { promise: Promise<string>; resolve(value: string): void };\nfunction deferred(): Deferred {\n  let resolve!: (value: string) => void;\n  const promise = new Promise<string>((done) => { resolve = done; });\n  return { promise, resolve };\n}\n\nconst health = deferred();\nconst position = createStore(1);\n\nfunction Health(props: { resource: Promise<string> }) {\n  const value = __nativeUseAt(\"implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health#store:0\", props.resource);\n  return <div key=\"health\" data-health=\"ready\">{value}</div>;\n}\n\nfunction Position(props: { position: typeof position }) {\n  const x = __nativeUseAt(\"implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position#store:0\", props.position);\n  return <output key=\"position\" data-x={x} />;\n}\n\nfunction DoublePosition(props: { position: typeof position }) {\n  const x = __nativeUseAt(\"implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition#store:0\", props.position);\n  return <output key=\"double-position\" data-double={x * 2} />;\n}\n\nfunction App() {\n  return <main>\n    <Suspense fallback={<div key=\"health\" data-health=\"fallback\">health waiting</div>} __nativeBoundarySite=\"implementation/2026-10-18-store-host/benchmark/native_arm.tsx#boundary:0\">\n      <Health resource={health.promise} />\n    </Suspense>\n    <Position position={position} />\n    <DoublePosition position={position} />\n  </main>;\n}\n\nexport function mountNative(host: HTMLElement) {\n  const root = createDOMRoot(host);\n  const started = performance.now();\n  root.mount(<App />);\n  const mountDurationMs = performance.now() - started;\n  return {\n    mountDurationMs,\n    updatePosition() { position.dispatch(7); },\n    settleHealth() { health.resolve(\"health ready\"); },\n    dispose() { root.dispose(); return { ...root.diagnostics(), store: position.diagnostics() }; },\n  };\n}\n",
	"components": [
		{
			"name": "App",
			"component_site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:App",
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
			"name": "DoublePosition",
			"component_site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition#store:0",
				"source_expression": "props.position"
			}],
			"closedStoreHostProgram": {
				"componentProgramId": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition",
				"host": {
					"child": null,
					"key": "double-position",
					"props": [["data-double", {
						"kind": "binary",
						"left": {
							"index": 0,
							"kind": "input"
						},
						"operator": "*",
						"right": {
							"kind": "literal",
							"value": 2
						}
					}]],
					"tag": "output"
				},
				"moduleRevision": "native-v1-7f1b6b3622778845",
				"schemaVersion": 1,
				"storeProp": "position",
				"storeUseSiteId": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:DoublePosition#store:0"
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Health",
			"component_site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health#store:0",
				"source_expression": "props.resource"
			}],
			"closedResourceHostProgram": {
				"componentProgramId": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health",
				"host": {
					"child": "resource-value",
					"key": "health",
					"props": [["data-health", "ready"]],
					"tag": "div"
				},
				"moduleRevision": "native-v1-7f1b6b3622778845",
				"resourceProp": "resource",
				"resourceUseSiteId": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Health#store:0",
				"schemaVersion": 1
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Position",
			"component_site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position#store:0",
				"source_expression": "props.position"
			}],
			"closedStoreHostProgram": {
				"componentProgramId": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position",
				"host": {
					"child": null,
					"key": "position",
					"props": [["data-x", {
						"index": 0,
						"kind": "input"
					}]],
					"tag": "output"
				},
				"moduleRevision": "native-v1-7f1b6b3622778845",
				"schemaVersion": 1,
				"storeProp": "position",
				"storeUseSiteId": "implementation/2026-10-18-store-host/benchmark/native_arm.tsx#component:Position#store:0"
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "../../../src/native_runtime_api.ts";
