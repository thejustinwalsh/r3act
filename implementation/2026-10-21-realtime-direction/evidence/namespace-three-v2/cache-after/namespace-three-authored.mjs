import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "../src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/namespace-three-authored.tsx",
	"module_revision": "native-v1-25bd664f15789f30",
	"owners": [
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:FrameShell",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:Motion",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:NestedForm",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:SceneView",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker#state:0",
			"owner_site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:Motion#state:0",
			"owner_site_id": ".cache/namespace-three-authored.tsx#component:Motion",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:NestedForm#state:0",
			"owner_site_id": ".cache/namespace-three-authored.tsx#component:NestedForm",
			"kind": "state",
			"provenance": "tracked"
		}
	],
	"sinks": [
		{
			"site_id": ".cache/namespace-three-authored.tsx#numeric-sink:362",
			"owner_site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker",
			"source_sites": [".cache/namespace-three-authored.tsx#component:FrameMarker#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#numeric-sink:569",
			"owner_site_id": ".cache/namespace-three-authored.tsx#component:Motion",
			"source_sites": [".cache/namespace-three-authored.tsx#component:Motion#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#numeric-sink:808",
			"owner_site_id": ".cache/namespace-three-authored.tsx#component:NestedForm",
			"source_sites": [".cache/namespace-three-authored.tsx#component:NestedForm#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}
	],
	"operations": [
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker#effect:0",
			"owner_site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:Motion#effect:0",
			"owner_site_id": ".cache/namespace-three-authored.tsx#component:Motion",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:NestedForm#effect:0",
			"owner_site_id": ".cache/namespace-three-authored.tsx#component:NestedForm",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {
			".cache/namespace-three-authored.tsx#component:FrameMarker#state:0": [".cache/namespace-three-authored.tsx#numeric-sink:362"],
			".cache/namespace-three-authored.tsx#component:Motion#state:0": [".cache/namespace-three-authored.tsx#numeric-sink:569"],
			".cache/namespace-three-authored.tsx#component:NestedForm#state:0": [".cache/namespace-three-authored.tsx#numeric-sink:808"]
		},
		"execution_order": [
			".cache/namespace-three-authored.tsx#numeric-sink:362",
			".cache/namespace-three-authored.tsx#numeric-sink:569",
			".cache/namespace-three-authored.tsx#numeric-sink:808"
		]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === ".cache/namespace-three-authored.tsx" && event.previousRevision === "native-v1-25bd664f15789f30" && event.previousInstance === "native-v1-25bd664f15789f30") __invalidateNativeSemanticPlan(".cache/namespace-three-authored.tsx", "native-v1-25bd664f15789f30");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, bindStatePropAt as __nativeBindStatePropAt } from "../src/native_runtime_api.ts";
const __nativeNumericPrograms = [
	{
		schemaVersion: 2,
		ownerProgramId: ".cache/namespace-three-authored.tsx#component:FrameMarker",
		sinkId: ".cache/namespace-three-authored.tsx#numeric-sink:362",
		closedExpression: {
			"index": 0,
			"kind": "input"
		},
		sourceSites: [".cache/namespace-three-authored.tsx#component:FrameMarker#state:0"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: ".cache/namespace-three-authored.tsx#component:Motion",
		sinkId: ".cache/namespace-three-authored.tsx#numeric-sink:569",
		closedExpression: {
			"kind": "binary",
			"left": {
				"index": 0,
				"kind": "input"
			},
			"operator": "*",
			"right": {
				"kind": "literal",
				"value": .42
			}
		},
		sourceSites: [".cache/namespace-three-authored.tsx#component:Motion#state:0"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: ".cache/namespace-three-authored.tsx#component:NestedForm",
		sinkId: ".cache/namespace-three-authored.tsx#numeric-sink:808",
		closedExpression: {
			"index": 0,
			"kind": "input"
		},
		sourceSites: [".cache/namespace-three-authored.tsx#component:NestedForm#state:0"]
	}
];
const __nativeOwnerCutKernels = [
	{
		schemaVersion: 2,
		programId: ".cache/namespace-three-authored.tsx#component:FrameMarker",
		slotCount: 1,
		sinkIds: [".cache/namespace-three-authored.tsx#numeric-sink:362"],
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
	},
	{
		schemaVersion: 3,
		programId: ".cache/namespace-three-authored.tsx#component:Motion",
		slotCount: 1,
		sinkIds: [".cache/namespace-three-authored.tsx#numeric-sink:569"],
		executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) {
			let stagedCount = 0;
			for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) {
				const rowState = rowStates[changeIndex];
				switch (changedSlots[changeIndex]) {
					case 0: {
						if ((rowState.seenMask & 1) === 0) {
							rowState.seenMask |= 1;
							const next = rowState.inputValues[0] * .42;
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
	},
	{
		schemaVersion: 2,
		programId: ".cache/namespace-three-authored.tsx#component:NestedForm",
		slotCount: 1,
		sinkIds: [".cache/namespace-three-authored.tsx#numeric-sink:808"],
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
	}
];
__nativeDefineComponent(".cache/namespace-three-authored.tsx#component:FrameMarker", FrameMarker, {
	propOnlySites: [".cache/namespace-three-authored.tsx#component:FrameMarker#state:0"],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: ".cache/namespace-three-authored.tsx#component:FrameMarker",
		moduleRevision: "native-v1-25bd664f15789f30",
		slots: [{
			siteId: ".cache/namespace-three-authored.tsx#component:FrameMarker#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
__nativeDefineComponent(".cache/namespace-three-authored.tsx#component:FrameShell", FrameShell, { propOnlySites: [] });
__nativeDefineComponent(".cache/namespace-three-authored.tsx#component:Motion", Motion, {
	propOnlySites: [".cache/namespace-three-authored.tsx#component:Motion#state:0"],
	numericPrimitiveProps: ["motionName"],
	numericRetainedProps: ["children"],
	stateLayout: {
		schemaVersion: 1,
		programId: ".cache/namespace-three-authored.tsx#component:Motion",
		moduleRevision: "native-v1-25bd664f15789f30",
		slots: [{
			siteId: ".cache/namespace-three-authored.tsx#component:Motion#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[1]
});
__nativeDefineComponent(".cache/namespace-three-authored.tsx#component:NestedForm", NestedForm, {
	propOnlySites: [".cache/namespace-three-authored.tsx#component:NestedForm#state:0"],
	numericPrimitiveProps: ["name"],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: ".cache/namespace-three-authored.tsx#component:NestedForm",
		moduleRevision: "native-v1-25bd664f15789f30",
		slots: [{
			siteId: ".cache/namespace-three-authored.tsx#component:NestedForm#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[2]
});
__nativeDefineComponent(".cache/namespace-three-authored.tsx#component:SceneView", SceneView, {
	propOnlySites: [],
	hostLeafOutput: true
});
export const frameTrace = {
	sceneRenders: 0,
	setEpoch: null,
	setPhase: null,
	setNested: null
};
export function FrameMarker() {
	const [epoch, setEpoch] = __nativeUseStateAt(".cache/namespace-three-authored.tsx#component:FrameMarker#state:0", 0);
	__nativeUseEffectAt(".cache/namespace-three-authored.tsx#component:FrameMarker#effect:0", () => {
		frameTrace.setEpoch = setEpoch;
	});
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "frame-marker",
		name: "accepted-frame",
		"position-x": __nativeBindStatePropAt(".cache/namespace-three-authored.tsx#component:FrameMarker#state:0", (epoch) => epoch, __nativeNumericPrograms[0])
	});
}
export function Motion(props) {
	const [phase, setPhase] = __nativeUseStateAt(".cache/namespace-three-authored.tsx#component:Motion#state:0", 0);
	__nativeUseEffectAt(".cache/namespace-three-authored.tsx#component:Motion#effect:0", () => {
		frameTrace.setPhase = setPhase;
	});
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "motion",
		name: props.motionName,
		"rotation-y": __nativeBindStatePropAt(".cache/namespace-three-authored.tsx#component:Motion#state:0", (phase) => phase * .42, __nativeNumericPrograms[1])
	}, props.children);
}
export function NestedForm(props) {
	const [scale, setScale] = __nativeUseStateAt(".cache/namespace-three-authored.tsx#component:NestedForm#state:0", 1);
	__nativeUseEffectAt(".cache/namespace-three-authored.tsx#component:NestedForm#effect:0", () => {
		frameTrace.setNested = setScale;
	});
	return /* @__PURE__ */ __nativeJsx.jsx("mesh", {
		key: "nested",
		name: props.name,
		"scale-x": __nativeBindStatePropAt(".cache/namespace-three-authored.tsx#component:NestedForm#state:0", (scale) => scale, __nativeNumericPrograms[2])
	}, /* @__PURE__ */ __nativeJsx.jsx("boxGeometry", { args: [
		1,
		1,
		1
	] }), /* @__PURE__ */ __nativeJsx.jsx("meshStandardMaterial", { color: "orange" }));
}
export function FrameShell(props) {
	frameTrace.sceneRenders++;
	return /* @__PURE__ */ __nativeJsx.jsx("group", { key: "frame-shell" }, /* @__PURE__ */ __nativeJsx.jsx(FrameMarker, { key: "marker" }), !props.omitMotion && /* @__PURE__ */ __nativeJsx.jsx(Motion, {
		key: "motion-owner",
		motionName: "kinetic-form"
	}, /* @__PURE__ */ __nativeJsx.jsx(NestedForm, {
		key: props.replacement ? "replacement" : "first",
		name: props.replacement ? "replacement" : "first"
	})));
}
export function SceneView({ value, reset = false }) {
	return /* @__PURE__ */ __nativeJsx.jsx("group", null, /* @__PURE__ */ __nativeJsx.jsx("pointLight", {
		key: "light",
		args: ["orange", 2],
		distance: reset ? undefined : value,
		position: reset ? undefined : [
			1,
			2,
			3
		],
		"shadow-mapSize": reset ? undefined : [1024, 512]
	}), /* @__PURE__ */ __nativeJsx.jsx("orthographicCamera", {
		key: "camera",
		zoom: reset ? undefined : value
	}), /* @__PURE__ */ __nativeJsx.jsx("mesh", {
		key: "mesh",
		"material-clearcoat": reset ? undefined : .65
	}, /* @__PURE__ */ __nativeJsx.jsx("icosahedronGeometry", { args: [1, 2] }), /* @__PURE__ */ __nativeJsx.jsx("meshPhysicalMaterial", {
		color: reset ? undefined : "blue",
		clearcoatRoughness: reset ? undefined : .25
	})), /* @__PURE__ */ __nativeJsx.jsx("probeGroup", {
		key: "custom",
		args: [7],
		probeMode: reset ? undefined : value
	}));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-25bd664f15789f30",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/namespace-three-authored.tsx",
		"module_revision": "native-v1-25bd664f15789f30",
		"owners": [
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:FrameShell",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:Motion",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:NestedForm",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:SceneView",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker#state:0",
				"owner_site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:Motion#state:0",
				"owner_site_id": ".cache/namespace-three-authored.tsx#component:Motion",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:NestedForm#state:0",
				"owner_site_id": ".cache/namespace-three-authored.tsx#component:NestedForm",
				"kind": "state",
				"provenance": "tracked"
			}
		],
		"sinks": [
			{
				"site_id": ".cache/namespace-three-authored.tsx#numeric-sink:362",
				"owner_site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker",
				"source_sites": [".cache/namespace-three-authored.tsx#component:FrameMarker#state:0"],
				"provenance": "closed",
				"equality": "object-is",
				"host_value": "scalar",
				"retention": "value",
				"execution": "compiled-binding"
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#numeric-sink:569",
				"owner_site_id": ".cache/namespace-three-authored.tsx#component:Motion",
				"source_sites": [".cache/namespace-three-authored.tsx#component:Motion#state:0"],
				"provenance": "closed",
				"equality": "object-is",
				"host_value": "scalar",
				"retention": "value",
				"execution": "compiled-binding"
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#numeric-sink:808",
				"owner_site_id": ".cache/namespace-three-authored.tsx#component:NestedForm",
				"source_sites": [".cache/namespace-three-authored.tsx#component:NestedForm#state:0"],
				"provenance": "closed",
				"equality": "object-is",
				"host_value": "scalar",
				"retention": "value",
				"execution": "compiled-binding"
			}
		],
		"operations": [
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker#effect:0",
				"owner_site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:Motion#effect:0",
				"owner_site_id": ".cache/namespace-three-authored.tsx#component:Motion",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:NestedForm#effect:0",
				"owner_site_id": ".cache/namespace-three-authored.tsx#component:NestedForm",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {
				".cache/namespace-three-authored.tsx#component:FrameMarker#state:0": [".cache/namespace-three-authored.tsx#numeric-sink:362"],
				".cache/namespace-three-authored.tsx#component:Motion#state:0": [".cache/namespace-three-authored.tsx#numeric-sink:569"],
				".cache/namespace-three-authored.tsx#component:NestedForm#state:0": [".cache/namespace-three-authored.tsx#numeric-sink:808"]
			},
			"execution_order": [
				".cache/namespace-three-authored.tsx#numeric-sink:362",
				".cache/namespace-three-authored.tsx#numeric-sink:569",
				".cache/namespace-three-authored.tsx#numeric-sink:808"
			]
		}
	},
	"source_file": ".cache/namespace-three-authored.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { useEffect, useState } from \"../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \".cache/namespace-three-authored.tsx#component:FrameMarker\", sinkId: \".cache/namespace-three-authored.tsx#numeric-sink:362\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\".cache/namespace-three-authored.tsx#component:FrameMarker#state:0\"] }, { schemaVersion: 2, ownerProgramId: \".cache/namespace-three-authored.tsx#component:Motion\", sinkId: \".cache/namespace-three-authored.tsx#numeric-sink:569\", closedExpression: {\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.42}}, sourceSites: [\".cache/namespace-three-authored.tsx#component:Motion#state:0\"] }, { schemaVersion: 2, ownerProgramId: \".cache/namespace-three-authored.tsx#component:NestedForm\", sinkId: \".cache/namespace-three-authored.tsx#numeric-sink:808\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\".cache/namespace-three-authored.tsx#component:NestedForm#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"../src/native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 2, programId: \".cache/namespace-three-authored.tsx#component:FrameMarker\", slotCount: 1, sinkIds: [\".cache/namespace-three-authored.tsx#numeric-sink:362\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }, { schemaVersion: 3, programId: \".cache/namespace-three-authored.tsx#component:Motion\", slotCount: 1, sinkIds: [\".cache/namespace-three-authored.tsx#numeric-sink:569\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0] * 0.42); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }, { schemaVersion: 2, programId: \".cache/namespace-three-authored.tsx#component:NestedForm\", slotCount: 1, sinkIds: [\".cache/namespace-three-authored.tsx#numeric-sink:808\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\n__nativeDefineComponent(\".cache/namespace-three-authored.tsx#component:FrameMarker\", FrameMarker, { propOnlySites: [\".cache/namespace-three-authored.tsx#component:FrameMarker#state:0\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \".cache/namespace-three-authored.tsx#component:FrameMarker\", moduleRevision: \"native-v1-25bd664f15789f30\", slots: [{ siteId: \".cache/namespace-three-authored.tsx#component:FrameMarker#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\n__nativeDefineComponent(\".cache/namespace-three-authored.tsx#component:FrameShell\", FrameShell, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/namespace-three-authored.tsx#component:Motion\", Motion, { propOnlySites: [\".cache/namespace-three-authored.tsx#component:Motion#state:0\"], numericPrimitiveProps: [\"motionName\"], numericRetainedProps: [\"children\"], stateLayout: { schemaVersion: 1, programId: \".cache/namespace-three-authored.tsx#component:Motion\", moduleRevision: \"native-v1-25bd664f15789f30\", slots: [{ siteId: \".cache/namespace-three-authored.tsx#component:Motion#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[1] });\n__nativeDefineComponent(\".cache/namespace-three-authored.tsx#component:NestedForm\", NestedForm, { propOnlySites: [\".cache/namespace-three-authored.tsx#component:NestedForm#state:0\"], numericPrimitiveProps: [\"name\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \".cache/namespace-three-authored.tsx#component:NestedForm\", moduleRevision: \"native-v1-25bd664f15789f30\", slots: [{ siteId: \".cache/namespace-three-authored.tsx#component:NestedForm#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[2] });\n__nativeDefineComponent(\".cache/namespace-three-authored.tsx#component:SceneView\", SceneView, { propOnlySites: [], hostLeafOutput: true });\nexport const frameTrace = { sceneRenders: 0, setEpoch: null, setPhase: null, setNested: null };\nexport function FrameMarker() {\n  const [epoch, setEpoch] = __nativeUseStateAt(\".cache/namespace-three-authored.tsx#component:FrameMarker#state:0\", 0);\n  __nativeUseEffectAt(\".cache/namespace-three-authored.tsx#component:FrameMarker#effect:0\", () => { frameTrace.setEpoch = setEpoch; });\n  return <group key=\"frame-marker\" name=\"accepted-frame\" position-x={__nativeBindStatePropAt(\".cache/namespace-three-authored.tsx#component:FrameMarker#state:0\", (epoch) => (epoch), __nativeNumericPrograms[0])} />;\n}\nexport function Motion(props) {\n  const [phase, setPhase] = __nativeUseStateAt(\".cache/namespace-three-authored.tsx#component:Motion#state:0\", 0);\n  __nativeUseEffectAt(\".cache/namespace-three-authored.tsx#component:Motion#effect:0\", () => { frameTrace.setPhase = setPhase; });\n  return <group key=\"motion\" name={props.motionName} rotation-y={__nativeBindStatePropAt(\".cache/namespace-three-authored.tsx#component:Motion#state:0\", (phase) => (phase * 0.42), __nativeNumericPrograms[1])}>\n    {props.children}\n  </group>;\n}\nexport function NestedForm(props) {\n  const [scale, setScale] = __nativeUseStateAt(\".cache/namespace-three-authored.tsx#component:NestedForm#state:0\", 1);\n  __nativeUseEffectAt(\".cache/namespace-three-authored.tsx#component:NestedForm#effect:0\", () => { frameTrace.setNested = setScale; });\n  return <mesh key=\"nested\" name={props.name} scale-x={__nativeBindStatePropAt(\".cache/namespace-three-authored.tsx#component:NestedForm#state:0\", (scale) => (scale), __nativeNumericPrograms[2])}>\n    <boxGeometry args={[1, 1, 1]} />\n    <meshStandardMaterial color=\"orange\" />\n  </mesh>;\n}\nexport function FrameShell(props) {\n  frameTrace.sceneRenders++;\n  return <group key=\"frame-shell\"><FrameMarker key=\"marker\" />\n    {!props.omitMotion && <Motion key=\"motion-owner\" motionName=\"kinetic-form\">\n      <NestedForm key={props.replacement ? \"replacement\" : \"first\"}\n        name={props.replacement ? \"replacement\" : \"first\"} />\n    </Motion>}\n  </group>;\n}\nexport function SceneView({ value, reset=false }) {\n  return <group>\n    <pointLight key=\"light\" args={[\"orange\", 2]} distance={reset ? undefined : value} position={reset ? undefined : [1,2,3]} shadow-mapSize={reset ? undefined : [1024,512]} />\n    <orthographicCamera key=\"camera\" zoom={reset ? undefined : value} />\n    <mesh key=\"mesh\" material-clearcoat={reset ? undefined : .65}>\n      <icosahedronGeometry args={[1,2]} />\n      <meshPhysicalMaterial color={reset ? undefined : \"blue\"} clearcoatRoughness={reset ? undefined : .25} />\n    </mesh>\n    <probeGroup key=\"custom\" args={[7]} probeMode={reset ? undefined : value} />\n  </group>;\n}",
	"components": [
		{
			"name": "FrameMarker",
			"component_site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker",
			"prop_only_sites": [".cache/namespace-three-authored.tsx#component:FrameMarker#state:0"],
			"state_layout": {
				"schema_version": 1,
				"programId": ".cache/namespace-three-authored.tsx#component:FrameMarker",
				"moduleRevision": "native-v1-25bd664f15789f30",
				"slots": [{
					"site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": ".cache/namespace-three-authored.tsx#numeric-sink:362",
				"source_sites": [".cache/namespace-three-authored.tsx#component:FrameMarker#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		},
		{
			"name": "FrameShell",
			"component_site_id": ".cache/namespace-three-authored.tsx#component:FrameShell",
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
			"name": "Motion",
			"component_site_id": ".cache/namespace-three-authored.tsx#component:Motion",
			"prop_only_sites": [".cache/namespace-three-authored.tsx#component:Motion#state:0"],
			"numeric_primitive_props": ["motionName"],
			"numeric_retained_props": ["children"],
			"state_layout": {
				"schema_version": 1,
				"programId": ".cache/namespace-three-authored.tsx#component:Motion",
				"moduleRevision": "native-v1-25bd664f15789f30",
				"slots": [{
					"site_id": ".cache/namespace-three-authored.tsx#component:Motion#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/namespace-three-authored.tsx#component:Motion#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": ".cache/namespace-three-authored.tsx#component:Motion#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": ".cache/namespace-three-authored.tsx#numeric-sink:569",
				"source_sites": [".cache/namespace-three-authored.tsx#component:Motion#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		},
		{
			"name": "NestedForm",
			"component_site_id": ".cache/namespace-three-authored.tsx#component:NestedForm",
			"prop_only_sites": [".cache/namespace-three-authored.tsx#component:NestedForm#state:0"],
			"numeric_primitive_props": ["name"],
			"state_layout": {
				"schema_version": 1,
				"programId": ".cache/namespace-three-authored.tsx#component:NestedForm",
				"moduleRevision": "native-v1-25bd664f15789f30",
				"slots": [{
					"site_id": ".cache/namespace-three-authored.tsx#component:NestedForm#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": ".cache/namespace-three-authored.tsx#component:NestedForm#state:0",
				"initial_value": "1"
			}],
			"effect_sites": [{ "site_id": ".cache/namespace-three-authored.tsx#component:NestedForm#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": ".cache/namespace-three-authored.tsx#numeric-sink:808",
				"source_sites": [".cache/namespace-three-authored.tsx#component:NestedForm#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		},
		{
			"name": "SceneView",
			"component_site_id": ".cache/namespace-three-authored.tsx#component:SceneView",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "../src/native_runtime_api.ts";
