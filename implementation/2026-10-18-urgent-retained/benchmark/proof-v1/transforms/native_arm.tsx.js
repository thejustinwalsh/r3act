import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "../../../src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx",
	"module_revision": "native-v1-0454a5156f8fbadf",
	"owners": [
		{
			"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary#store:0",
			"owner_site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary#store:1",
			"owner_site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0",
			"owner_site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl",
			"kind": "state",
			"provenance": "tracked"
		}
	],
	"sinks": [{
		"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:769",
		"owner_site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl",
		"source_sites": ["implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}, {
		"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:790",
		"owner_site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl",
		"source_sites": ["implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}],
	"operations": [{
		"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary#store:0",
		"owner_site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary",
		"kind": "use-store-or-resource",
		"provenance": "opaque",
		"source_sites": []
	}, {
		"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary#store:1",
		"owner_site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary",
		"kind": "use-store-or-resource",
		"provenance": "opaque",
		"source_sites": []
	}],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": { "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0": ["implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:769", "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:790"] },
		"execution_order": ["implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:769", "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:790"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx") __invalidateNativeSemanticPlan("implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx", "native-v1-0454a5156f8fbadf");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { createDOMRoot, createStore, Suspense } from "../../../src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from "../../../src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl",
	sinkId: "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:769",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: ["implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0"]
}, {
	schemaVersion: 2,
	ownerProgramId: "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl",
	sinkId: "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:790",
	closedExpression: {
		"kind": "binary",
		"left": {
			"index": 0,
			"kind": "input"
		},
		"operator": "/",
		"right": {
			"kind": "literal",
			"value": 10
		}
	},
	sourceSites: ["implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0"]
}];
const __nativeOwnerCutKernels = [{
	schemaVersion: 2,
	programId: "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl",
	slotCount: 1,
	sinkIds: ["implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:769", "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:790"],
	executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) {
		let stagedCount = 0;
		for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) {
			const rowState = rowStates[changeIndex];
			switch (changedSlots[changeIndex]) {
				case 0: {
					if ((rowState.seenMask & 1) === 0) {
						rowState.seenMask |= 1;
						const next = rowState.inputValues[0];
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
					if ((rowState.seenMask & 2) === 0) {
						rowState.seenMask |= 2;
						const next = rowState.inputValues[0] / 10;
						const sinkState = rowState.sinks[1];
						const last = sinkState.lastValue;
						const same = last === next ? typeof next !== "number" || typeof last === "number" && (last !== 0 || 1 / last === 1 / next) : typeof last === "number" && typeof next === "number" && last !== last && next !== next;
						if (!same) {
							stagedInputIndices[stagedCount] = changeIndex;
							stagedSinkIds[stagedCount] = 1;
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
__nativeDefineComponent("implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary", APrimary, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl", NumericControl, {
	propOnlySites: ["implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0"],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl",
		moduleRevision: "native-v1-0454a5156f8fbadf",
		slots: [{
			siteId: "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
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
const initialA = deferred();
initialA.resolve("A ready");
const pendingA = deferred();
const aStore = createStore(initialA.promise, (_current, next) => next);
function APrimary() {
	const value = __nativeUseAt("implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary#store:0", __nativeUseAt("implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary#store:1", aStore));
	return /* @__PURE__ */ __nativeJsx.jsx("div", { "data-a": "primary" }, value);
}
function NumericControl() {
	const [x, setX] = __nativeUseStateAt("implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0", 1);
	return /* @__PURE__ */ __nativeJsx.jsx("button", {
		"data-x": __nativeBindStatePropAt("implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0", (x) => x, __nativeNumericPrograms[0]),
		style: { opacity: __nativeBindStatePropAt("implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0", (x) => x / 10, __nativeNumericPrograms[1]) },
		onClick: () => setX((n) => n + 1)
	}, "Increment");
}
function App() {
	return /* @__PURE__ */ __nativeJsx.jsx("main", null, /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("div", { "data-a": "fallback" }, "A waiting"),
		__nativeBoundarySite: "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(APrimary, null)), /* @__PURE__ */ __nativeJsx.jsx(NumericControl, null));
}
export function mountNative(host) {
	const root = createDOMRoot(host);
	const started = performance.now();
	root.mount(/* @__PURE__ */ __nativeJsx.jsx(App, null));
	const mountDurationMs = performance.now() - started;
	return {
		mountDurationMs,
		beginPendingA() {
			aStore.dispatch(pendingA.promise);
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
	"module_revision": "native-v1-0454a5156f8fbadf",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx",
		"module_revision": "native-v1-0454a5156f8fbadf",
		"owners": [
			{
				"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary#store:0",
				"owner_site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary#store:1",
				"owner_site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0",
				"owner_site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl",
				"kind": "state",
				"provenance": "tracked"
			}
		],
		"sinks": [{
			"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:769",
			"owner_site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl",
			"source_sites": ["implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}, {
			"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:790",
			"owner_site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl",
			"source_sites": ["implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}],
		"operations": [{
			"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary#store:0",
			"owner_site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		}, {
			"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary#store:1",
			"owner_site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		}],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": { "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0": ["implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:769", "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:790"] },
			"execution_order": ["implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:769", "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:790"]
		}
	},
	"source_file": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import {\n  createDOMRoot,\n  createStore,\n  Suspense,\n  use,\n  useState,\n} from \"../../../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../../../src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl\", sinkId: \"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:769\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0\"] }, { schemaVersion: 2, ownerProgramId: \"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl\", sinkId: \"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:790\", closedExpression: {\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"/\",\"right\":{\"kind\":\"literal\",\"value\":10.0}}, sourceSites: [\"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"../../../src/native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 2, programId: \"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl\", slotCount: 1, sinkIds: [\"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:769\", \"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:790\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } }if ((rowState.seenMask & 2) === 0) { rowState.seenMask |= 2; const next = (rowState.inputValues[0] / 10); const sinkState = rowState.sinks[1]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 1; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\n__nativeDefineComponent(\"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary\", APrimary, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl\", NumericControl, { propOnlySites: [\"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl\", moduleRevision: \"native-v1-0454a5156f8fbadf\", slots: [{ siteId: \"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\n\ntype Deferred<T> = { promise: Promise<T>; resolve(value: T): void };\nfunction deferred<T>(): Deferred<T> {\n  let resolve!: (value: T) => void;\n  const promise = new Promise<T>((done) => { resolve = done; });\n  return { promise, resolve };\n}\n\nconst initialA = deferred<string>();\ninitialA.resolve(\"A ready\");\nconst pendingA = deferred<string>();\nconst aStore = createStore(initialA.promise, (_current: PromiseLike<string>, next: PromiseLike<string>) => next);\n\nfunction APrimary() {\n  const value = __nativeUseAt(\"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary#store:0\", __nativeUseAt(\"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary#store:1\", aStore));\n  return <div data-a=\"primary\">{value}</div>;\n}\n\nfunction NumericControl() {\n  const [x, setX] = __nativeUseStateAt(\"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0\", 1);\n  return <button data-x={__nativeBindStatePropAt(\"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0\", (x) => (x), __nativeNumericPrograms[0])} style={{ opacity: __nativeBindStatePropAt(\"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0\", (x) => (x / 10), __nativeNumericPrograms[1]) }} onClick={() => setX((n) => n + 1)}>Increment</button>;\n}\n\nfunction App() {\n  return <main>\n    <Suspense fallback={<div data-a=\"fallback\">A waiting</div>} __nativeBoundarySite=\"implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#boundary:0\">\n      <APrimary />\n    </Suspense>\n    <NumericControl />\n  </main>;\n}\n\nexport function mountNative(host: HTMLElement) {\n  const root = createDOMRoot(host);\n  const started = performance.now();\n  root.mount(<App />);\n  const mountDurationMs = performance.now() - started;\n  return {\n    mountDurationMs,\n    beginPendingA() { aStore.dispatch(pendingA.promise); },\n    settlePendingA() { pendingA.resolve(\"A next\"); },\n    dispose() { root.dispose(); return root.diagnostics(); },\n  };\n}\n",
	"components": [
		{
			"name": "APrimary",
			"component_site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary#store:0",
				"source_expression": "use(aStore)"
			}, {
				"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:APrimary#store:1",
				"source_expression": "aStore"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "App",
			"component_site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:App",
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
			"name": "NumericControl",
			"component_site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl",
			"prop_only_sites": ["implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0"],
			"state_layout": {
				"schema_version": 1,
				"programId": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl",
				"moduleRevision": "native-v1-0454a5156f8fbadf",
				"slots": [{
					"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0",
				"initial_value": "1"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:769",
				"source_sites": ["implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0"],
				"primitive_value": true
			}, {
				"sink_id": "implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#numeric-sink:790",
				"source_sites": ["implementation/2026-10-18-urgent-retained/benchmark/native_arm.tsx#component:NumericControl#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "../../../src/native_runtime_api.ts";
