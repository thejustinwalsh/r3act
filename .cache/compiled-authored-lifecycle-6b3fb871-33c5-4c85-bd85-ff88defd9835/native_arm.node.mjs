import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx",
	"module_revision": "native-v1-619ba715b2b194d7",
	"owners": [
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Detail",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:DetailFallback",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Health",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:HealthFallback",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Rows",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Detail#store:0",
			"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Detail",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Health#store:0",
			"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Health",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row#state:0",
			"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row#store:0",
			"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Rows#store:0",
			"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Rows",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [{
		"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#opaque-sink:1529",
		"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row",
		"source_sites": [],
		"provenance": "opaque",
		"equality": "adapter-declared",
		"host_value": "adapter-declared",
		"retention": "adapter-declared",
		"execution": "generic"
	}],
	"operations": [
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Detail#store:0",
			"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Detail",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:DetailFallback#effect:0",
			"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:DetailFallback",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Health#store:0",
			"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Health",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:HealthFallback#effect:0",
			"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:HealthFallback",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row#store:0",
			"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row#effect:0",
			"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Rows#store:0",
			"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Rows",
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
		if (event?.sourceFile === "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx" && event.previousRevision === "native-v1-619ba715b2b194d7" && event.previousInstance === "native-v1-619ba715b2b194d7") __invalidateNativeSemanticPlan("implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx", "native-v1-619ba715b2b194d7");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { AsyncResource, createDOMRoot, createNativeRoot, createStore, Suspense } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useAt as __nativeUseAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__nativeDefineComponent("implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Detail", Detail, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:DetailFallback", DetailFallback, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent("implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Health", Health, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:HealthFallback", HealthFallback, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent("implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row", Row, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Rows", Rows, { propOnlySites: [] });
import { editedRows, initialRows } from "file:///Volumes/Depot/Developer/r3act/implementation/2026-10-18-authored-lifecycle/workload/contract.ts";
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
function createDomain() {
	const detail = deferred();
	const health = deferred();
	return {
		stepStore: createStore(0),
		itemsStore: createStore(initialRows()),
		detail,
		health,
		detailResource: new AsyncResource(detail.promise),
		healthResource: new AsyncResource(health.promise),
		counts: {
			rowSetups: 0,
			rowCleanups: 0,
			detailFallbackSetups: 0,
			detailFallbackCleanups: 0,
			healthFallbackSetups: 0,
			healthFallbackCleanups: 0
		}
	};
}
function Row(props) {
	const step = __nativeUseAt("implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row#store:0", props.domain.stepStore);
	const [local, setLocal] = __nativeUseStateAt("implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row#state:0", 0);
	__nativeUseEffectAt("implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row#effect:0", () => {
		props.domain.counts.rowSetups++;
		return () => {
			props.domain.counts.rowCleanups++;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("button", {
		"data-row": props.id,
		"data-step": step,
		"data-local": local,
		style: {
			transform: `translateX(${(step + props.id) % 128}px)`,
			opacity: ((step + props.id) % 10 + 1) / 10
		},
		onClick: () => setLocal((previous) => previous + 1)
	}, `${props.id}:${step}:${local}`);
}
function Rows(props) {
	const items = __nativeUseAt("implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Rows#store:0", props.domain.itemsStore);
	return /* @__PURE__ */ __nativeJsx.jsx("div", { "data-rows": "ready" }, items.map((id) => /* @__PURE__ */ __nativeJsx.jsx(Row, {
		key: id,
		id,
		domain: props.domain
	})));
}
function Detail(props) {
	const value = __nativeUseAt("implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Detail#store:0", props.domain.detailResource);
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "detail-output",
		"data-detail": "ready"
	}, value);
}
function Health(props) {
	const value = __nativeUseAt("implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Health#store:0", props.domain.healthResource);
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "health-output",
		"data-health": "ready"
	}, value);
}
function DetailFallback(props) {
	__nativeUseEffectAt("implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:DetailFallback#effect:0", () => {
		props.domain.counts.detailFallbackSetups++;
		return () => {
			props.domain.counts.detailFallbackCleanups++;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "detail-output",
		"data-detail": "waiting"
	}, "waiting");
}
function HealthFallback(props) {
	__nativeUseEffectAt("implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:HealthFallback#effect:0", () => {
		props.domain.counts.healthFallbackSetups++;
		return () => {
			props.domain.counts.healthFallbackCleanups++;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "health-output",
		"data-health": "waiting"
	}, "waiting");
}
function App(props) {
	return /* @__PURE__ */ __nativeJsx.jsx("main", null, /* @__PURE__ */ __nativeJsx.jsx(Rows, { domain: props.domain }), /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx(DetailFallback, { domain: props.domain }),
		__nativeBoundarySite: "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(Detail, { domain: props.domain })), /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx(HealthFallback, { domain: props.domain }),
		__nativeBoundarySite: "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#boundary:1"
	}, /* @__PURE__ */ __nativeJsx.jsx(Health, { domain: props.domain })));
}
function mountScene(root) {
	const domain = createDomain();
	root.mount(/* @__PURE__ */ __nativeJsx.jsx(App, { domain }));
	let disposed = false;
	const diagnostics = () => {
		const step = domain.stepStore.diagnostics();
		const items = domain.itemsStore.diagnostics();
		const state = root.diagnostics();
		return {
			arm: "native",
			...domain.counts,
			storeListeners: step.listeners + items.listeners,
			storeReaders: step.readers + items.readers,
			ownerCount: state.ownerCount,
			pendingChangeCount: state.pendingChangeCount,
			disposed: state.disposed
		};
	};
	return {
		updateStep(step) {
			if (disposed) throw new Error("Native scene is disposed");
			domain.stepStore.dispatch(step);
			root.flush();
		},
		editRows() {
			if (disposed) throw new Error("Native scene is disposed");
			domain.itemsStore.dispatch(editedRows());
			root.flush();
		},
		settleDetail() {
			if (disposed) throw new Error("Native scene is disposed");
			domain.detail.resolve("detail ready");
		},
		settleHealth() {
			if (disposed) throw new Error("Native scene is disposed");
			domain.health.resolve("health ready");
		},
		diagnostics,
		dispose() {
			if (!disposed) {
				disposed = true;
				root.dispose();
			}
			return diagnostics();
		}
	};
}
export function mountNative(host) {
	return mountScene(createDOMRoot(host));
}
export function mountNativeWithHost(host, container, options = {}) {
	return mountScene(createNativeRoot(host, container, options));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-619ba715b2b194d7",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx",
		"module_revision": "native-v1-619ba715b2b194d7",
		"owners": [
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Detail",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:DetailFallback",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Health",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:HealthFallback",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Rows",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Detail#store:0",
				"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Detail",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Health#store:0",
				"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Health",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row#state:0",
				"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row#store:0",
				"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Rows#store:0",
				"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Rows",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [{
			"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#opaque-sink:1529",
			"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}],
		"operations": [
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Detail#store:0",
				"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Detail",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:DetailFallback#effect:0",
				"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:DetailFallback",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Health#store:0",
				"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Health",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:HealthFallback#effect:0",
				"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:HealthFallback",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row#store:0",
				"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row#effect:0",
				"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Rows#store:0",
				"owner_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Rows",
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
	"source_file": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import {\n  AsyncResource,\n  createDOMRoot,\n  createNativeRoot,\n  createStore,\n  Suspense,\n  use,\n  useEffect,\n  useState,\n  type NativeRootOptions,\n  type RuntimeNode,\n  type VDOMHost,\n} from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Detail\", Detail, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:DetailFallback\", DetailFallback, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\"implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Health\", Health, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:HealthFallback\", HealthFallback, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\"implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row\", Row, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Rows\", Rows, { propOnlySites: [] });\nimport {\n  editedRows,\n  initialRows,\n  type SceneController,\n  type SceneDiagnostics,\n} from \"./contract.ts\";\n\ntype Deferred = {\n  promise: Promise<string>;\n  resolve(value: string): void;\n};\n\nfunction deferred(): Deferred {\n  let resolve!: (value: string) => void;\n  const promise = new Promise<string>((done) => { resolve = done; });\n  return { promise, resolve };\n}\n\nfunction createDomain() {\n  const detail = deferred();\n  const health = deferred();\n  return {\n    stepStore: createStore(0),\n    itemsStore: createStore(initialRows()),\n    detail,\n    health,\n    detailResource: new AsyncResource(detail.promise),\n    healthResource: new AsyncResource(health.promise),\n    counts: {\n      rowSetups: 0,\n      rowCleanups: 0,\n      detailFallbackSetups: 0,\n      detailFallbackCleanups: 0,\n      healthFallbackSetups: 0,\n      healthFallbackCleanups: 0,\n    },\n  };\n}\n\ntype Domain = ReturnType<typeof createDomain>;\ntype DomainProps = { domain: Domain };\ntype RowProps = DomainProps & { id: number };\n\nfunction Row(props: RowProps) {\n  const step = __nativeUseAt(\"implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row#store:0\", props.domain.stepStore);\n  const [local, setLocal] = __nativeUseStateAt(\"implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row#state:0\", 0);\n  __nativeUseEffectAt(\"implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row#effect:0\", () => {\n    props.domain.counts.rowSetups++;\n    return () => { props.domain.counts.rowCleanups++; };\n  });\n  return <button\n    data-row={props.id}\n    data-step={step}\n    data-local={local}\n    style={{\n      transform: `translateX(${(step + props.id) % 128}px)`,\n      opacity: ((step + props.id) % 10 + 1) / 10,\n    }}\n    onClick={() => setLocal((previous) => previous + 1)}\n  >{`${props.id}:${step}:${local}`}</button>;\n}\n\nfunction Rows(props: DomainProps) {\n  const items = __nativeUseAt(\"implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Rows#store:0\", props.domain.itemsStore);\n  return <div data-rows=\"ready\">{items.map((id) =>\n    <Row key={id} id={id} domain={props.domain} />\n  )}</div>;\n}\n\nfunction Detail(props: DomainProps) {\n  const value = __nativeUseAt(\"implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Detail#store:0\", props.domain.detailResource);\n  return <output key=\"detail-output\" data-detail=\"ready\">{value}</output>;\n}\n\nfunction Health(props: DomainProps) {\n  const value = __nativeUseAt(\"implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Health#store:0\", props.domain.healthResource);\n  return <output key=\"health-output\" data-health=\"ready\">{value}</output>;\n}\n\nfunction DetailFallback(props: DomainProps) {\n  __nativeUseEffectAt(\"implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:DetailFallback#effect:0\", () => {\n    props.domain.counts.detailFallbackSetups++;\n    return () => { props.domain.counts.detailFallbackCleanups++; };\n  });\n  return <output key=\"detail-output\" data-detail=\"waiting\">waiting</output>;\n}\n\nfunction HealthFallback(props: DomainProps) {\n  __nativeUseEffectAt(\"implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:HealthFallback#effect:0\", () => {\n    props.domain.counts.healthFallbackSetups++;\n    return () => { props.domain.counts.healthFallbackCleanups++; };\n  });\n  return <output key=\"health-output\" data-health=\"waiting\">waiting</output>;\n}\n\nfunction App(props: DomainProps) {\n  return <main>\n    <Rows domain={props.domain} />\n    <Suspense fallback={<DetailFallback domain={props.domain} />} __nativeBoundarySite=\"implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#boundary:0\">\n      <Detail domain={props.domain} />\n    </Suspense>\n    <Suspense fallback={<HealthFallback domain={props.domain} />} __nativeBoundarySite=\"implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#boundary:1\">\n      <Health domain={props.domain} />\n    </Suspense>\n  </main>;\n}\n\ntype SceneRoot = {\n  mount(tree: RuntimeNode): void;\n  flush(): boolean;\n  diagnostics(): { ownerCount: number; pendingChangeCount: number; disposed: boolean };\n  dispose(): void;\n};\n\nfunction mountScene(root: SceneRoot): SceneController {\n  const domain = createDomain();\n  root.mount(<App domain={domain} />);\n  let disposed = false;\n\n  const diagnostics = (): SceneDiagnostics => {\n    const step = domain.stepStore.diagnostics();\n    const items = domain.itemsStore.diagnostics();\n    const state = root.diagnostics();\n    return {\n      arm: \"native\",\n      ...domain.counts,\n      storeListeners: step.listeners + items.listeners,\n      storeReaders: step.readers + items.readers,\n      ownerCount: state.ownerCount,\n      pendingChangeCount: state.pendingChangeCount,\n      disposed: state.disposed,\n    };\n  };\n\n  return {\n    updateStep(step: number) {\n      if (disposed) throw new Error(\"Native scene is disposed\");\n      domain.stepStore.dispatch(step);\n      root.flush();\n    },\n    editRows() {\n      if (disposed) throw new Error(\"Native scene is disposed\");\n      domain.itemsStore.dispatch(editedRows());\n      root.flush();\n    },\n    settleDetail() {\n      if (disposed) throw new Error(\"Native scene is disposed\");\n      domain.detail.resolve(\"detail ready\");\n    },\n    settleHealth() {\n      if (disposed) throw new Error(\"Native scene is disposed\");\n      domain.health.resolve(\"health ready\");\n    },\n    diagnostics,\n    dispose() {\n      if (!disposed) {\n        disposed = true;\n        root.dispose();\n      }\n      return diagnostics();\n    },\n  };\n}\n\nexport function mountNative(host: HTMLElement): SceneController {\n  return mountScene(createDOMRoot(host));\n}\n\nexport function mountNativeWithHost<H, Parent = H>(\n  host: VDOMHost<H, Parent>,\n  container: Parent,\n  options: NativeRootOptions = {},\n): SceneController {\n  return mountScene(createNativeRoot(host, container, options));\n}\n",
	"components": [
		{
			"name": "App",
			"component_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:App",
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
			"component_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Detail",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Detail#store:0",
				"source_expression": "props.domain.detailResource"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "DetailFallback",
			"component_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:DetailFallback",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [],
			"effect_sites": [{ "site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:DetailFallback#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Health",
			"component_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Health",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Health#store:0",
				"source_expression": "props.domain.healthResource"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "HealthFallback",
			"component_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:HealthFallback",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [],
			"effect_sites": [{ "site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:HealthFallback#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Row",
			"component_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row#effect:0" }],
			"store_sites": [{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Row#store:0",
				"source_expression": "props.domain.stepStore"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": ["implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#opaque-sink:1529"]
		},
		{
			"name": "Rows",
			"component_site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Rows",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx#component:Rows#store:0",
				"source_expression": "props.domain.itemsStore"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
