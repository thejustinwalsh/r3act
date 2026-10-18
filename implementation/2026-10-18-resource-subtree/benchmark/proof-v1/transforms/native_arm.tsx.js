import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "../../../src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx",
	"module_revision": "native-v1-e70ef2ec0d6da4d0",
	"owners": [
		{
			"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A#store:0",
			"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A#store:1",
			"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B#store:0",
			"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB#state:0",
			"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0",
			"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row",
			"kind": "state",
			"provenance": "tracked"
		}
	],
	"sinks": [{
		"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#numeric-sink:1428",
		"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row",
		"source_sites": ["implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}],
	"operations": [
		{
			"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A#store:0",
			"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A#store:1",
			"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B#store:0",
			"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB#effect:0",
			"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": { "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0": ["implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#numeric-sink:1428"] },
		"execution_order": ["implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#numeric-sink:1428"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx") __invalidateNativeSemanticPlan("implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx", "native-v1-e70ef2ec0d6da4d0");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { AsyncResource, createDOMRoot, createStore, Suspense } from "../../../src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from "../../../src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row",
	sinkId: "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#numeric-sink:1428",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: ["implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0"]
}];
const __nativeOwnerCutKernels = [{
	schemaVersion: 2,
	programId: "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row",
	slotCount: 1,
	sinkIds: ["implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#numeric-sink:1428"],
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
					break;
				}
			}
		}
		return stagedCount;
	}
}];
__nativeDefineComponent("implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A", A, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B", B, {
	propOnlySites: [],
	closedResourceHostProgram: {
		"componentProgramId": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B",
		"host": {
			"children": [{
				"host": {
					"children": [{
						"expression": {
							"index": 0,
							"kind": "input"
						},
						"kind": "text"
					}],
					"key": "b-label",
					"props": [["data-label", {
						"kind": "literal",
						"value": "ready"
					}]],
					"tag": "span"
				},
				"kind": "host"
			}, {
				"host": {
					"children": [{
						"expression": {
							"index": 0,
							"kind": "input"
						},
						"kind": "text"
					}],
					"key": "b-output",
					"props": [["data-count", {
						"kind": "binary",
						"left": {
							"index": 0,
							"kind": "input"
						},
						"operator": "+",
						"right": {
							"kind": "literal",
							"value": 1
						}
					}]],
					"tag": "output"
				},
				"kind": "host"
			}],
			"key": "b-root",
			"props": [["data-b", {
				"kind": "literal",
				"value": "ready"
			}]],
			"tag": "div"
		},
		"moduleRevision": "native-v1-e70ef2ec0d6da4d0",
		"resourceProp": "resource",
		"resourceUseSiteId": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B#store:0",
		"schemaVersion": 2
	}
});
__nativeDefineComponent("implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB", FallbackB, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent("implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row", Row, {
	propOnlySites: ["implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0"],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row",
		moduleRevision: "native-v1-e70ef2ec0d6da4d0",
		slots: [{
			siteId: "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0",
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
const oldA = deferred();
oldA.resolve("A ready");
const pendingA = deferred();
const pendingB = deferred();
const aStore = createStore(oldA.promise, (_current, next) => next);
const resourceB = new AsyncResource(pendingB.promise);
const fallbackLife = {
	mounts: 0,
	cleanups: 0
};
function A() {
	const value = __nativeUseAt("implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A#store:0", __nativeUseAt("implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A#store:1", aStore));
	return /* @__PURE__ */ __nativeJsx.jsx("div", {
		key: "a-host",
		"data-a": "primary"
	}, value);
}
function FallbackB() {
	const [, setValue] = __nativeUseStateAt("implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB#state:0", 1);
	__nativeUseEffectAt("implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB#effect:0", () => {
		void setValue;
		fallbackLife.mounts++;
		return () => {
			fallbackLife.cleanups++;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("span", {
		key: "b-root",
		"data-b": "fallback"
	}, "B waiting");
}
function B(props) {
	const value = __nativeUseAt("implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B#store:0", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("div", {
		key: "b-root",
		"data-b": "ready"
	}, /* @__PURE__ */ __nativeJsx.jsx("span", {
		key: "b-label",
		"data-label": "ready"
	}, value), /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "b-output",
		"data-count": value + 1
	}, value));
}
function Row() {
	const [value, setValue] = __nativeUseStateAt("implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0", 0);
	return /* @__PURE__ */ __nativeJsx.jsx("button", {
		key: "row",
		"data-row": "local",
		"data-local": __nativeBindStatePropAt("implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0", (value) => value, __nativeNumericPrograms[0]),
		onClick: () => setValue((previous) => previous + 1)
	}, "row");
}
function App() {
	return /* @__PURE__ */ __nativeJsx.jsx("main", null, /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("div", {
			key: "a-host",
			"data-a": "fallback"
		}, "A waiting"),
		__nativeBoundarySite: "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(A, null)), /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx(FallbackB, null),
		__nativeBoundarySite: "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#boundary:1"
	}, /* @__PURE__ */ __nativeJsx.jsx(B, { resource: resourceB })), /* @__PURE__ */ __nativeJsx.jsx(Row, null));
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
		settleB() {
			pendingB.resolve(7);
		},
		settlePendingA() {
			pendingA.resolve("A next");
		},
		fallbackLife() {
			return { ...fallbackLife };
		},
		dispose() {
			root.dispose();
			return {
				...root.diagnostics(),
				fallbackLife: { ...fallbackLife },
				store: aStore.diagnostics()
			};
		}
	};
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-e70ef2ec0d6da4d0",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx",
		"module_revision": "native-v1-e70ef2ec0d6da4d0",
		"owners": [
			{
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A#store:0",
				"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A#store:1",
				"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B#store:0",
				"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB#state:0",
				"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0",
				"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row",
				"kind": "state",
				"provenance": "tracked"
			}
		],
		"sinks": [{
			"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#numeric-sink:1428",
			"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row",
			"source_sites": ["implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}],
		"operations": [
			{
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A#store:0",
				"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A#store:1",
				"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B#store:0",
				"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB#effect:0",
				"owner_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": { "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0": ["implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#numeric-sink:1428"] },
			"execution_order": ["implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#numeric-sink:1428"]
		}
	},
	"source_file": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { AsyncResource, createDOMRoot, createStore, Suspense, use, useEffect, useState } from \"../../../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../../../src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row\", sinkId: \"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#numeric-sink:1428\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"../../../src/native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 2, programId: \"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row\", slotCount: 1, sinkIds: [\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#numeric-sink:1428\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\n__nativeDefineComponent(\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A\", A, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B\", B, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B\",\"host\":{\"children\":[{\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"b-label\",\"props\":[[\"data-label\",{\"kind\":\"literal\",\"value\":\"ready\"}]],\"tag\":\"span\"},\"kind\":\"host\"},{\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"b-output\",\"props\":[[\"data-count\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"kind\":\"literal\",\"value\":1.0}}]],\"tag\":\"output\"},\"kind\":\"host\"}],\"key\":\"b-root\",\"props\":[[\"data-b\",{\"kind\":\"literal\",\"value\":\"ready\"}]],\"tag\":\"div\"},\"moduleRevision\":\"native-v1-e70ef2ec0d6da4d0\",\"resourceProp\":\"resource\",\"resourceUseSiteId\":\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B#store:0\",\"schemaVersion\":2} });\n__nativeDefineComponent(\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB\", FallbackB, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row\", Row, { propOnlySites: [\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row\", moduleRevision: \"native-v1-e70ef2ec0d6da4d0\", slots: [{ siteId: \"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\n\ntype Deferred<T> = { promise: Promise<T>; resolve(value: T): void };\nfunction deferred<T>(): Deferred<T> {\n  let resolve!: (value: T) => void;\n  const promise = new Promise<T>((done) => { resolve = done; });\n  return { promise, resolve };\n}\nconst oldA = deferred<string>();\noldA.resolve(\"A ready\");\nconst pendingA = deferred<string>();\nconst pendingB = deferred<number>();\nconst aStore = createStore(oldA.promise, (_current: Promise<string>, next: Promise<string>) => next);\nconst resourceB = new AsyncResource(pendingB.promise);\nconst fallbackLife = { mounts: 0, cleanups: 0 };\n\nfunction A() {\n  const value = __nativeUseAt(\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A#store:0\", __nativeUseAt(\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A#store:1\", aStore));\n  return <div key=\"a-host\" data-a=\"primary\">{value}</div>;\n}\nfunction FallbackB() {\n  const [, setValue] = __nativeUseStateAt(\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB#state:0\", 1);\n  __nativeUseEffectAt(\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB#effect:0\", () => { void setValue; fallbackLife.mounts++; return () => { fallbackLife.cleanups++; }; });\n  return <span key=\"b-root\" data-b=\"fallback\">B waiting</span>;\n}\nfunction B(props: { resource: AsyncResource<number> }) {\n  const value = __nativeUseAt(\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B#store:0\", props.resource);\n  return <div key=\"b-root\" data-b=\"ready\"><span key=\"b-label\" data-label=\"ready\">{value}</span><output key=\"b-output\" data-count={value + 1}>{value}</output></div>;\n}\nfunction Row() {\n  const [value, setValue] = __nativeUseStateAt(\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0\", 0);\n  return <button key=\"row\" data-row=\"local\" data-local={__nativeBindStatePropAt(\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0\", (value) => (value), __nativeNumericPrograms[0])}\n    onClick={() => setValue((previous) => previous + 1)}>row</button>;\n}\nfunction App() {\n  return <main>\n    <Suspense fallback={<div key=\"a-host\" data-a=\"fallback\">A waiting</div>} __nativeBoundarySite=\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#boundary:0\"><A /></Suspense>\n    <Suspense fallback={<FallbackB />} __nativeBoundarySite=\"implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#boundary:1\"><B resource={resourceB} /></Suspense>\n    <Row />\n  </main>;\n}\nexport function mountNative(host: HTMLElement) {\n  const root = createDOMRoot(host);\n  const started = performance.now();\n  root.mount(<App />);\n  const mountDurationMs = performance.now() - started;\n  return {\n    mountDurationMs,\n    beginPendingA() { aStore.dispatch(pendingA.promise); },\n    settleB() { pendingB.resolve(7); },\n    settlePendingA() { pendingA.resolve(\"A next\"); },\n    fallbackLife() { return { ...fallbackLife }; },\n    dispose() { root.dispose(); return { ...root.diagnostics(), fallbackLife: { ...fallbackLife },\n      store: aStore.diagnostics() }; },\n  };\n}\n",
	"components": [
		{
			"name": "A",
			"component_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A#store:0",
				"source_expression": "use(aStore)"
			}, {
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:A#store:1",
				"source_expression": "aStore"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "App",
			"component_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:App",
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
			"component_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B#store:0",
				"source_expression": "props.resource"
			}],
			"closedResourceHostProgram": {
				"componentProgramId": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B",
				"host": {
					"children": [{
						"host": {
							"children": [{
								"expression": {
									"index": 0,
									"kind": "input"
								},
								"kind": "text"
							}],
							"key": "b-label",
							"props": [["data-label", {
								"kind": "literal",
								"value": "ready"
							}]],
							"tag": "span"
						},
						"kind": "host"
					}, {
						"host": {
							"children": [{
								"expression": {
									"index": 0,
									"kind": "input"
								},
								"kind": "text"
							}],
							"key": "b-output",
							"props": [["data-count", {
								"kind": "binary",
								"left": {
									"index": 0,
									"kind": "input"
								},
								"operator": "+",
								"right": {
									"kind": "literal",
									"value": 1
								}
							}]],
							"tag": "output"
						},
						"kind": "host"
					}],
					"key": "b-root",
					"props": [["data-b", {
						"kind": "literal",
						"value": "ready"
					}]],
					"tag": "div"
				},
				"moduleRevision": "native-v1-e70ef2ec0d6da4d0",
				"resourceProp": "resource",
				"resourceUseSiteId": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:B#store:0",
				"schemaVersion": 2
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "FallbackB",
			"component_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB#state:0",
				"initial_value": "1"
			}],
			"effect_sites": [{ "site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:FallbackB#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Row",
			"component_site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row",
			"prop_only_sites": ["implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0"],
			"state_layout": {
				"schema_version": 1,
				"programId": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row",
				"moduleRevision": "native-v1-e70ef2ec0d6da4d0",
				"slots": [{
					"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": "implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#numeric-sink:1428",
				"source_sites": ["implementation/2026-10-18-resource-subtree/benchmark/native_arm.tsx#component:Row#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "../../../src/native_runtime_api.ts";
