import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx",
	"module_revision": "native-v1-5912b616964f831f",
	"owners": [
		{
			"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A#store:0",
			"owner_site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A#store:1",
			"owner_site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0",
			"owner_site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B",
			"kind": "state",
			"provenance": "tracked"
		}
	],
	"sinks": [{
		"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#numeric-sink:975",
		"owner_site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B",
		"source_sites": [".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}],
	"operations": [
		{
			"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A#store:0",
			"owner_site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A#store:1",
			"owner_site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#effect:0",
			"owner_site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": { ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0": [".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#numeric-sink:975"] },
		"execution_order": [".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#numeric-sink:975"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx" && event.previousRevision === "native-v1-5912b616964f831f" && event.previousInstance === "native-v1-5912b616964f831f") __invalidateNativeSemanticPlan(".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx", "native-v1-5912b616964f831f");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { Suspense, createStore, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B",
	sinkId: ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#numeric-sink:975",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: [".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0"]
}];
const __nativeOwnerCutKernels = [{
	schemaVersion: 2,
	programId: ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B",
	slotCount: 1,
	sinkIds: [".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#numeric-sink:975"],
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
__nativeDefineComponent(".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A", A, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B", B, {
	propOnlySites: [".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0"],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B",
		moduleRevision: "native-v1-5912b616964f831f",
		slots: [{
			siteId: ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
export function deferred() {
	let resolve;
	const promise = new Promise((yes) => {
		resolve = yes;
	});
	return {
		promise,
		resolve
	};
}
export const firstA = deferred();
export const nextA = deferred();
export const mode = createStore(0, (_state, action) => action);
export const trace = {
	setter: null,
	activations: 0,
	cleanups: 0
};
export function A() {
	const selected = __nativeUseAt(".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A#store:0", mode) === 0 ? firstA.promise : nextA.promise;
	const value = __nativeUseAt(".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A#store:1", selected);
	return /* @__PURE__ */ jsx("group", {
		key: "a-group",
		name: value
	});
}
export function B() {
	const [x, setX] = __nativeUseStateAt(".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0", 1);
	__nativeUseEffectAt(".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#effect:0", () => {
		trace.setter = setX;
		trace.activations++;
		return () => {
			trace.cleanups++;
			if (trace.setter === setX) trace.setter = null;
		};
	});
	return /* @__PURE__ */ jsx("mesh", {
		key: "b-mesh",
		"position-x": __nativeBindStatePropAt(".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0", (x) => x, __nativeNumericPrograms[0])
	});
}
export function App() {
	return /* @__PURE__ */ jsx("group", { key: "app-group" }, /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx("group", {
			key: "a-group",
			name: "a-loading"
		}),
		__nativeBoundarySite: ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#boundary:0"
	}, /* @__PURE__ */ jsx(A, { key: "a-child" })), /* @__PURE__ */ jsx(B, { key: "b-child" }));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-5912b616964f831f",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx",
		"module_revision": "native-v1-5912b616964f831f",
		"owners": [
			{
				"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A#store:0",
				"owner_site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A#store:1",
				"owner_site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0",
				"owner_site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B",
				"kind": "state",
				"provenance": "tracked"
			}
		],
		"sinks": [{
			"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#numeric-sink:975",
			"owner_site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B",
			"source_sites": [".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}],
		"operations": [
			{
				"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A#store:0",
				"owner_site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A#store:1",
				"owner_site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#effect:0",
				"owner_site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": { ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0": [".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#numeric-sink:975"] },
			"execution_order": [".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#numeric-sink:975"]
		}
	},
	"source_file": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport { Suspense, use, createStore, useState, useEffect, jsx } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B\", sinkId: \".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#numeric-sink:975\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 2, programId: \".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B\", slotCount: 1, sinkIds: [\".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#numeric-sink:975\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\n__nativeDefineComponent(\".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A\", A, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B\", B, { propOnlySites: [\".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B\", moduleRevision: \"native-v1-5912b616964f831f\", slots: [{ siteId: \".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\nexport function deferred() {\n  let resolve;\n  const promise = new Promise((yes) => { resolve = yes; });\n  return { promise, resolve };\n}\nexport const firstA = deferred();\nexport const nextA = deferred();\nexport const mode = createStore(0, (_state, action) => action);\nexport const trace = { setter: null, activations: 0, cleanups: 0 };\nexport function A() {\n  const selected = __nativeUseAt(\".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A#store:0\", mode) === 0 ? firstA.promise : nextA.promise;\n  const value = __nativeUseAt(\".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A#store:1\", selected);\n  return <group key=\"a-group\" name={value} />;\n}\nexport function B() {\n  const [x, setX] = __nativeUseStateAt(\".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0\", 1);\n  __nativeUseEffectAt(\".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#effect:0\", () => {\n    trace.setter = setX;\n    trace.activations++;\n    return () => {\n      trace.cleanups++;\n      if (trace.setter === setX) trace.setter = null;\n    };\n  });\n  return <mesh key=\"b-mesh\" position-x={__nativeBindStatePropAt(\".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0\", (x) => (x), __nativeNumericPrograms[0])} />;\n}\nexport function App() {\n  return <group key=\"app-group\">\n    <Suspense fallback={<group key=\"a-group\" name=\"a-loading\" />} __nativeBoundarySite=\".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#boundary:0\">\n      <A key=\"a-child\" />\n    </Suspense>\n    <B key=\"b-child\" />\n  </group>;\n}\n",
	"components": [
		{
			"name": "A",
			"component_site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A#store:0",
				"source_expression": "mode"
			}, {
				"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:A#store:1",
				"source_expression": "selected"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "App",
			"component_site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:App",
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
			"component_site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B",
			"prop_only_sites": [".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0"],
			"state_layout": {
				"schema_version": 1,
				"programId": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B",
				"moduleRevision": "native-v1-5912b616964f831f",
				"slots": [{
					"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0",
				"initial_value": "1"
			}],
			"effect_sites": [{ "site_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": ".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#numeric-sink:975",
				"source_sites": [".cache/compiled-urgent-retained-three-bf6aadc1-c246-4c38-ae92-2ceb3d3027ee/urgent-three.tsx#component:B#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		}
	]
};
