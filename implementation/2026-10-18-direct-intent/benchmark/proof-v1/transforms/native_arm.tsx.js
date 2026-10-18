import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "../../../src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx",
	"module_revision": "native-v1-3cfbda44aff78067",
	"owners": [{
		"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:App",
		"repeated_scope": "runtime-keyed-owner"
	}, {
		"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [
		{
			"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#state:0",
			"owner_site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:0",
			"owner_site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:1",
			"owner_site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:2",
			"owner_site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [],
	"operations": [
		{
			"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:0",
			"owner_site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:1",
			"owner_site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:2",
			"owner_site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary",
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
		if (event?.sourceFile === "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx") __invalidateNativeSemanticPlan("implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx", "native-v1-3cfbda44aff78067");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { AsyncResource, createDOMRoot, createStore, Suspense } from "../../../src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useAt as __nativeUseAt } from "../../../src/native_runtime_api.ts";
__nativeDefineComponent("implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary", Primary, { propOnlySites: [] });
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
const initial = deferred();
initial.resolve("initial value");
const obsolete = deferred();
const latest = deferred();
const initialControl = deferred();
initialControl.resolve("control ready");
const pendingControl = deferred();
const controlStore = createStore(initialControl.promise, (_current, next) => next);
function Primary(props) {
	const value = __nativeUseAt("implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:0", props.resource);
	__nativeUseAt("implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:1", __nativeUseAt("implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:2", controlStore));
	const [count, setCount] = __nativeUseStateAt("implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#state:0", 0);
	return /* @__PURE__ */ __nativeJsx.jsx("div", {
		key: "primary-host",
		"data-primary": "yes",
		"data-label": props.label
	}, /* @__PURE__ */ __nativeJsx.jsx("button", {
		"data-counter": "yes",
		onClick: () => setCount((n) => n + 1)
	}, count), /* @__PURE__ */ __nativeJsx.jsx("span", { "data-value": "yes" }, value));
}
function App(props) {
	return /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("div", {
			key: "primary-host",
			"data-fallback": "yes"
		}, "waiting"),
		__nativeBoundarySite: "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(Primary, {
		resource: props.resource,
		label: props.label
	}));
}
export function mountNative(host) {
	const root = createDOMRoot(host);
	const initialResource = new AsyncResource(initial.promise);
	const obsoleteResource = new AsyncResource(obsolete.promise);
	const latestResource = new AsyncResource(latest.promise);
	const started = performance.now();
	root.mount(/* @__PURE__ */ __nativeJsx.jsx(App, {
		resource: initialResource,
		label: "initial"
	}));
	const mountDurationMs = performance.now() - started;
	return {
		mountDurationMs,
		beginRequests() {
			controlStore.dispatch(pendingControl.promise);
			root.update(/* @__PURE__ */ __nativeJsx.jsx(App, {
				resource: obsoleteResource,
				label: "obsolete"
			}));
			root.update(/* @__PURE__ */ __nativeJsx.jsx(App, {
				resource: latestResource,
				label: "latest"
			}));
		},
		settleObsolete() {
			obsolete.resolve("obsolete value");
		},
		settleLatest() {
			latest.resolve("latest value");
			pendingControl.resolve("control next");
		},
		dispose() {
			root.dispose();
			return root.diagnostics();
		}
	};
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-3cfbda44aff78067",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx",
		"module_revision": "native-v1-3cfbda44aff78067",
		"owners": [{
			"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		}, {
			"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [
			{
				"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#state:0",
				"owner_site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:0",
				"owner_site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:1",
				"owner_site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:2",
				"owner_site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [],
		"operations": [
			{
				"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:0",
				"owner_site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:1",
				"owner_site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:2",
				"owner_site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary",
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
	"source_file": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { AsyncResource, createDOMRoot, createStore, Suspense, use, useState } from \"../../../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../../../src/native_runtime_api.ts\";\n__nativeDefineComponent(\"implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary\", Primary, { propOnlySites: [] });\n\ntype Deferred = { promise: Promise<string>; resolve(value: string): void };\nfunction deferred(): Deferred {\n  let resolve!: (value: string) => void;\n  const promise = new Promise<string>((done) => { resolve = done; });\n  return { promise, resolve };\n}\n\nconst initial = deferred();\ninitial.resolve(\"initial value\");\nconst obsolete = deferred();\nconst latest = deferred();\nconst initialControl = deferred();\ninitialControl.resolve(\"control ready\");\nconst pendingControl = deferred();\nconst controlStore = createStore(initialControl.promise,\n  (_current: PromiseLike<string>, next: PromiseLike<string>) => next);\n\nfunction Primary(props: { resource: AsyncResource<string>; label: string }) {\n  const value = __nativeUseAt(\"implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:0\", props.resource);\n  __nativeUseAt(\"implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:1\", __nativeUseAt(\"implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:2\", controlStore));\n  const [count, setCount] = __nativeUseStateAt(\"implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#state:0\", 0);\n  return <div key=\"primary-host\" data-primary=\"yes\" data-label={props.label}>\n    <button data-counter=\"yes\" onClick={() => setCount((n) => n + 1)}>{count}</button>\n    <span data-value=\"yes\">{value}</span>\n  </div>;\n}\n\nfunction App(props: { resource: AsyncResource<string>; label: string }) {\n  return <Suspense fallback={<div key=\"primary-host\" data-fallback=\"yes\">waiting</div>} __nativeBoundarySite=\"implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#boundary:0\">\n    <Primary resource={props.resource} label={props.label} />\n  </Suspense>;\n}\n\nexport function mountNative(host: HTMLElement) {\n  const root = createDOMRoot(host);\n  const initialResource = new AsyncResource(initial.promise);\n  const obsoleteResource = new AsyncResource(obsolete.promise);\n  const latestResource = new AsyncResource(latest.promise);\n  const started = performance.now();\n  root.mount(<App resource={initialResource} label=\"initial\" />);\n  const mountDurationMs = performance.now() - started;\n  return {\n    mountDurationMs,\n    beginRequests() {\n      controlStore.dispatch(pendingControl.promise);\n      root.update(<App resource={obsoleteResource} label=\"obsolete\" />);\n      root.update(<App resource={latestResource} label=\"latest\" />);\n    },\n    settleObsolete() { obsolete.resolve(\"obsolete value\"); },\n    settleLatest() {\n      latest.resolve(\"latest value\");\n      pendingControl.resolve(\"control next\");\n    },\n    dispose() { root.dispose(); return root.diagnostics(); },\n  };\n}\n",
	"components": [{
		"name": "App",
		"component_site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:App",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}, {
		"name": "Primary",
		"component_site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [{
			"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#state:0",
			"initial_value": "0"
		}],
		"effect_sites": [],
		"store_sites": [
			{
				"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:0",
				"source_expression": "props.resource"
			},
			{
				"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:1",
				"source_expression": "use(controlStore)"
			},
			{
				"site_id": "implementation/2026-10-18-direct-intent/benchmark/native_arm.tsx#component:Primary#store:2",
				"source_expression": "controlStore"
			}
		],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}]
};
import * as __nativeJsx from "../../../src/native_runtime_api.ts";
