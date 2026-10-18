import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "../../../src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx",
	"module_revision": "native-v1-4f489b7a8212dd35",
	"owners": [
		{
			"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary#store:0",
			"owner_site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary#store:1",
			"owner_site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary#store:0",
			"owner_site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [],
	"operations": [
		{
			"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary#store:0",
			"owner_site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary#store:1",
			"owner_site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary#store:0",
			"owner_site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary",
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
		if (event?.sourceFile === "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx") __invalidateNativeSemanticPlan("implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx", "native-v1-4f489b7a8212dd35");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { createDOMRoot, createStore, AsyncResource, Suspense } from "../../../src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt } from "../../../src/native_runtime_api.ts";
__nativeDefineComponent("implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary", APrimary, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary", BPrimary, {
	propOnlySites: [],
	closedResourceHostProgram: {
		"componentProgramId": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary",
		"host": {
			"child": "resource-value",
			"key": "b-primary",
			"props": [["data-b", "primary"]],
			"tag": "div"
		},
		"moduleRevision": "native-v1-4f489b7a8212dd35",
		"resourceProp": "resource",
		"resourceUseSiteId": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary#store:0",
		"schemaVersion": 1
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
const primaryA = deferred();
void primaryA.resolve("A ready");
const pendingA = deferred();
const pendingB = deferred();
const aStore = createStore(primaryA.promise, (_current, next) => next);
function APrimary() {
	const value = __nativeUseAt("implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary#store:0", __nativeUseAt("implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary#store:1", aStore));
	return /* @__PURE__ */ __nativeJsx.jsx("div", {
		key: "a-primary",
		"data-a": "primary"
	}, value);
}
function BPrimary(props) {
	const value = __nativeUseAt("implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary#store:0", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("div", {
		key: "b-primary",
		"data-b": "primary"
	}, value);
}
function App(props) {
	return /* @__PURE__ */ __nativeJsx.jsx("main", null, /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		key: "boundary-a",
		fallback: /* @__PURE__ */ __nativeJsx.jsx("div", {
			key: "a-primary",
			"data-a": "fallback"
		}, "A waiting"),
		__nativeBoundarySite: "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(APrimary, null)), /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		key: "boundary-b",
		fallback: /* @__PURE__ */ __nativeJsx.jsx("div", {
			key: "b-primary",
			"data-b": "fallback"
		}, "B waiting"),
		__nativeBoundarySite: "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#boundary:1"
	}, /* @__PURE__ */ __nativeJsx.jsx(BPrimary, { resource: props.resourceB })));
}
export function mountNative(host) {
	const root = createDOMRoot(host);
	const started = performance.now();
	const resourceB = new AsyncResource(pendingB.promise);
	root.mount(/* @__PURE__ */ __nativeJsx.jsx(App, { resourceB }));
	const mountDurationMs = performance.now() - started;
	return {
		mountDurationMs,
		beginPendingA() {
			aStore.dispatch(pendingA.promise);
		},
		settleB() {
			pendingB.resolve("B ready");
		},
		settlePendingA() {
			pendingA.resolve("A next");
		},
		dispose() {
			root.dispose();
			return root.diagnostics();
		}
	};
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-4f489b7a8212dd35",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx",
		"module_revision": "native-v1-4f489b7a8212dd35",
		"owners": [
			{
				"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary#store:0",
				"owner_site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary#store:1",
				"owner_site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary#store:0",
				"owner_site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [],
		"operations": [
			{
				"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary#store:0",
				"owner_site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary#store:1",
				"owner_site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary#store:0",
				"owner_site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary",
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
	"source_file": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import {\n  createDOMRoot,\n  createStore,\n  AsyncResource,\n  Suspense,\n  use,\n} from \"../../../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../../../src/native_runtime_api.ts\";\n__nativeDefineComponent(\"implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary\", APrimary, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary\", BPrimary, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\"implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary\",\"host\":{\"child\":\"resource-value\",\"key\":\"b-primary\",\"props\":[[\"data-b\",\"primary\"]],\"tag\":\"div\"},\"moduleRevision\":\"native-v1-4f489b7a8212dd35\",\"resourceProp\":\"resource\",\"resourceUseSiteId\":\"implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary#store:0\",\"schemaVersion\":1} });\n\ntype Deferred = { promise: Promise<string>; resolve(value: string): void };\nfunction deferred(): Deferred {\n  let resolve!: (value: string) => void;\n  const promise = new Promise<string>((done) => { resolve = done; });\n  return { promise, resolve };\n}\n\nconst primaryA = deferred();\nvoid primaryA.resolve(\"A ready\");\nconst pendingA = deferred();\nconst pendingB = deferred();\nconst aStore = createStore(primaryA.promise, (_current: PromiseLike<string>, next: PromiseLike<string>) => next);\n\nfunction APrimary() {\n  const value = __nativeUseAt(\"implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary#store:0\", __nativeUseAt(\"implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary#store:1\", aStore));\n  return <div key=\"a-primary\" data-a=\"primary\">{value}</div>;\n}\n\nfunction BPrimary(props: { resource: AsyncResource<string> }) {\n  const value = __nativeUseAt(\"implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary#store:0\", props.resource);\n  return <div key=\"b-primary\" data-b=\"primary\">{value}</div>;\n}\n\nfunction App(props: { resourceB: AsyncResource<string> }) {\n  return <main>\n    <Suspense key=\"boundary-a\" fallback={<div key=\"a-primary\" data-a=\"fallback\">A waiting</div>} __nativeBoundarySite=\"implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#boundary:0\">\n      <APrimary />\n    </Suspense>\n    <Suspense key=\"boundary-b\" fallback={<div key=\"b-primary\" data-b=\"fallback\">B waiting</div>} __nativeBoundarySite=\"implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#boundary:1\">\n      <BPrimary resource={props.resourceB} />\n    </Suspense>\n  </main>;\n}\n\nexport function mountNative(host: HTMLElement) {\n  const root = createDOMRoot(host);\n  const started = performance.now();\n  const resourceB = new AsyncResource(pendingB.promise);\n  root.mount(<App resourceB={resourceB} />);\n  const mountDurationMs = performance.now() - started;\n  return {\n    mountDurationMs,\n    beginPendingA() { aStore.dispatch(pendingA.promise); },\n    settleB() { pendingB.resolve(\"B ready\"); },\n    settlePendingA() { pendingA.resolve(\"A next\"); },\n    dispose() { root.dispose(); return root.diagnostics(); },\n  };\n}\n",
	"components": [
		{
			"name": "APrimary",
			"component_site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary#store:0",
				"source_expression": "use(aStore)"
			}, {
				"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:APrimary#store:1",
				"source_expression": "aStore"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "App",
			"component_site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:App",
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
			"name": "BPrimary",
			"component_site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary#store:0",
				"source_expression": "props.resource"
			}],
			"closedResourceHostProgram": {
				"componentProgramId": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary",
				"host": {
					"child": "resource-value",
					"key": "b-primary",
					"props": [["data-b", "primary"]],
					"tag": "div"
				},
				"moduleRevision": "native-v1-4f489b7a8212dd35",
				"resourceProp": "resource",
				"resourceUseSiteId": "implementation/2026-10-18-host-reveal/benchmark/native_arm.tsx#component:BPrimary#store:0",
				"schemaVersion": 1
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "../../../src/native_runtime_api.ts";
