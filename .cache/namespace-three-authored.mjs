import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "../src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/namespace-three-authored.tsx",
	"module_revision": "native-v1-e27d5bbd83886ce8",
	"owners": [
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:AlternatePanel",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:FragmentPair",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:FrameShell",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:IdentityPanel",
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
			"site_id": ".cache/namespace-three-authored.tsx#component:PrimitiveList",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:PrimitiveRoot",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:SceneView",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:ThreeIdentity",
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
			"site_id": ".cache/namespace-three-authored.tsx#numeric-sink:1739",
			"owner_site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker",
			"source_sites": [".cache/namespace-three-authored.tsx#component:FrameMarker#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#numeric-sink:1946",
			"owner_site_id": ".cache/namespace-three-authored.tsx#component:Motion",
			"source_sites": [".cache/namespace-three-authored.tsx#component:Motion#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#numeric-sink:2185",
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
			"site_id": ".cache/namespace-three-authored.tsx#component:AlternatePanel#effect:0",
			"owner_site_id": ".cache/namespace-three-authored.tsx#component:AlternatePanel",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker#effect:0",
			"owner_site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:IdentityPanel#effect:0",
			"owner_site_id": ".cache/namespace-three-authored.tsx#component:IdentityPanel",
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
		},
		{
			"site_id": ".cache/namespace-three-authored.tsx#component:ThreeIdentity#effect:0",
			"owner_site_id": ".cache/namespace-three-authored.tsx#component:ThreeIdentity",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {
			".cache/namespace-three-authored.tsx#component:FrameMarker#state:0": [".cache/namespace-three-authored.tsx#numeric-sink:1739"],
			".cache/namespace-three-authored.tsx#component:Motion#state:0": [".cache/namespace-three-authored.tsx#numeric-sink:1946"],
			".cache/namespace-three-authored.tsx#component:NestedForm#state:0": [".cache/namespace-three-authored.tsx#numeric-sink:2185"]
		},
		"execution_order": [
			".cache/namespace-three-authored.tsx#numeric-sink:1739",
			".cache/namespace-three-authored.tsx#numeric-sink:1946",
			".cache/namespace-three-authored.tsx#numeric-sink:2185"
		]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === ".cache/namespace-three-authored.tsx" && event.previousRevision === "native-v1-e27d5bbd83886ce8" && event.previousInstance === "native-v1-e27d5bbd83886ce8") __invalidateNativeSemanticPlan(".cache/namespace-three-authored.tsx", "native-v1-e27d5bbd83886ce8");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, bindStatePropAt as __nativeBindStatePropAt } from "../src/native_runtime_api.ts";
const __nativeNumericPrograms = [
	{
		schemaVersion: 2,
		ownerProgramId: ".cache/namespace-three-authored.tsx#component:FrameMarker",
		sinkId: ".cache/namespace-three-authored.tsx#numeric-sink:1739",
		closedExpression: {
			"index": 0,
			"kind": "input"
		},
		sourceSites: [".cache/namespace-three-authored.tsx#component:FrameMarker#state:0"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: ".cache/namespace-three-authored.tsx#component:Motion",
		sinkId: ".cache/namespace-three-authored.tsx#numeric-sink:1946",
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
		sinkId: ".cache/namespace-three-authored.tsx#numeric-sink:2185",
		closedExpression: {
			"index": 0,
			"kind": "input"
		},
		sourceSites: [".cache/namespace-three-authored.tsx#component:NestedForm#state:0"]
	}
];
const __nativeOwnerCutKernels = [
	{
		schemaVersion: 4,
		programId: ".cache/namespace-three-authored.tsx#component:FrameMarker",
		slotCount: 1,
		sinkIds: [".cache/namespace-three-authored.tsx#numeric-sink:1739"],
		executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues, inputStart = 0, outputStart = 0) {
			let stagedCount = outputStart;
			for (let localIndex = 0; localIndex < changeCount; localIndex++) {
				const changeIndex = inputStart + localIndex;
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
			return stagedCount - outputStart;
		}
	},
	{
		schemaVersion: 5,
		programId: ".cache/namespace-three-authored.tsx#component:Motion",
		slotCount: 1,
		sinkIds: [".cache/namespace-three-authored.tsx#numeric-sink:1946"],
		executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues, inputStart = 0, outputStart = 0) {
			let stagedCount = outputStart;
			for (let localIndex = 0; localIndex < changeCount; localIndex++) {
				const changeIndex = inputStart + localIndex;
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
			return stagedCount - outputStart;
		}
	},
	{
		schemaVersion: 4,
		programId: ".cache/namespace-three-authored.tsx#component:NestedForm",
		slotCount: 1,
		sinkIds: [".cache/namespace-three-authored.tsx#numeric-sink:2185"],
		executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues, inputStart = 0, outputStart = 0) {
			let stagedCount = outputStart;
			for (let localIndex = 0; localIndex < changeCount; localIndex++) {
				const changeIndex = inputStart + localIndex;
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
			return stagedCount - outputStart;
		}
	}
];
__nativeDefineComponent(".cache/namespace-three-authored.tsx#component:AlternatePanel", AlternatePanel, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent(".cache/namespace-three-authored.tsx#component:FragmentPair", FragmentPair, { propOnlySites: [] });
__nativeDefineComponent(".cache/namespace-three-authored.tsx#component:FrameMarker", FrameMarker, {
	propOnlySites: [".cache/namespace-three-authored.tsx#component:FrameMarker#state:0"],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: ".cache/namespace-three-authored.tsx#component:FrameMarker",
		moduleRevision: "native-v1-e27d5bbd83886ce8",
		slots: [{
			siteId: ".cache/namespace-three-authored.tsx#component:FrameMarker#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
__nativeDefineComponent(".cache/namespace-three-authored.tsx#component:FrameShell", FrameShell, { propOnlySites: [] });
__nativeDefineComponent(".cache/namespace-three-authored.tsx#component:IdentityPanel", IdentityPanel, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent(".cache/namespace-three-authored.tsx#component:Motion", Motion, {
	propOnlySites: [".cache/namespace-three-authored.tsx#component:Motion#state:0"],
	numericPrimitiveProps: ["motionName"],
	numericRetainedProps: ["children"],
	stateLayout: {
		schemaVersion: 1,
		programId: ".cache/namespace-three-authored.tsx#component:Motion",
		moduleRevision: "native-v1-e27d5bbd83886ce8",
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
		moduleRevision: "native-v1-e27d5bbd83886ce8",
		slots: [{
			siteId: ".cache/namespace-three-authored.tsx#component:NestedForm#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[2]
});
__nativeDefineComponent(".cache/namespace-three-authored.tsx#component:PrimitiveList", PrimitiveList, { propOnlySites: [] });
__nativeDefineComponent(".cache/namespace-three-authored.tsx#component:PrimitiveRoot", PrimitiveRoot, { propOnlySites: [] });
__nativeDefineComponent(".cache/namespace-three-authored.tsx#component:SceneView", SceneView, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent(".cache/namespace-three-authored.tsx#component:ThreeIdentity", ThreeIdentity, {
	propOnlySites: [],
	hostLeafOutput: true
});
export const frameTrace = {
	sceneRenders: 0,
	setEpoch: null,
	setPhase: null,
	setNested: null
};
export const identityTrace = {
	starts: 0,
	cleanups: 0,
	refs: []
};
export function captureIdentityRef(node) {
	identityTrace.refs.push(node);
}
export function IdentityPanel(props) {
	__nativeUseEffectAt(".cache/namespace-three-authored.tsx#component:IdentityPanel#effect:0", () => {
		identityTrace.starts++;
		return () => {
			identityTrace.cleanups++;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "constant",
		ref: captureIdentityRef,
		"data-value": props.value
	}, "same");
}
export function AlternatePanel(props) {
	__nativeUseEffectAt(".cache/namespace-three-authored.tsx#component:AlternatePanel#effect:0", () => {
		identityTrace.starts++;
		return () => {
			identityTrace.cleanups++;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "constant",
		ref: captureIdentityRef,
		"data-value": props.value
	}, "same");
}
export function PrimitiveRoot(props) {
	return props.value;
}
export function PrimitiveList(props) {
	const first = /* @__PURE__ */ __nativeJsx.jsx(PrimitiveRoot, {
		key: "A",
		value: "A"
	});
	const second = /* @__PURE__ */ __nativeJsx.jsx(PrimitiveRoot, {
		key: "B",
		value: "B"
	});
	return /* @__PURE__ */ __nativeJsx.jsx("section", { key: "text-list" }, props.reverse ? [second, first] : [first, second]);
}
export function FragmentPair(props) {
	return /* @__PURE__ */ __nativeJsx.jsx(__nativeJsx.Fragment, null, /* @__PURE__ */ __nativeJsx.jsx("i", { key: "left" }, "left"), /* @__PURE__ */ __nativeJsx.jsx("i", { key: "right" }, "right"));
}
export const threeIdentityTrace = {
	starts: 0,
	cleanups: 0
};
export function ThreeIdentity(props) {
	__nativeUseEffectAt(".cache/namespace-three-authored.tsx#component:ThreeIdentity#effect:0", () => {
		threeIdentityTrace.starts++;
		return () => {
			threeIdentityTrace.cleanups++;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "constant",
		name: props.name
	}, /* @__PURE__ */ __nativeJsx.jsx("mesh", { key: "mesh" }, /* @__PURE__ */ __nativeJsx.jsx("boxGeometry", { args: [
		1,
		1,
		1
	] }), /* @__PURE__ */ __nativeJsx.jsx("meshStandardMaterial", { color: "orange" })));
}
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
	"module_revision": "native-v1-e27d5bbd83886ce8",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/namespace-three-authored.tsx",
		"module_revision": "native-v1-e27d5bbd83886ce8",
		"owners": [
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:AlternatePanel",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:FragmentPair",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:FrameShell",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:IdentityPanel",
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
				"site_id": ".cache/namespace-three-authored.tsx#component:PrimitiveList",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:PrimitiveRoot",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:SceneView",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:ThreeIdentity",
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
				"site_id": ".cache/namespace-three-authored.tsx#numeric-sink:1739",
				"owner_site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker",
				"source_sites": [".cache/namespace-three-authored.tsx#component:FrameMarker#state:0"],
				"provenance": "closed",
				"equality": "object-is",
				"host_value": "scalar",
				"retention": "value",
				"execution": "compiled-binding"
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#numeric-sink:1946",
				"owner_site_id": ".cache/namespace-three-authored.tsx#component:Motion",
				"source_sites": [".cache/namespace-three-authored.tsx#component:Motion#state:0"],
				"provenance": "closed",
				"equality": "object-is",
				"host_value": "scalar",
				"retention": "value",
				"execution": "compiled-binding"
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#numeric-sink:2185",
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
				"site_id": ".cache/namespace-three-authored.tsx#component:AlternatePanel#effect:0",
				"owner_site_id": ".cache/namespace-three-authored.tsx#component:AlternatePanel",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker#effect:0",
				"owner_site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:IdentityPanel#effect:0",
				"owner_site_id": ".cache/namespace-three-authored.tsx#component:IdentityPanel",
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
			},
			{
				"site_id": ".cache/namespace-three-authored.tsx#component:ThreeIdentity#effect:0",
				"owner_site_id": ".cache/namespace-three-authored.tsx#component:ThreeIdentity",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {
				".cache/namespace-three-authored.tsx#component:FrameMarker#state:0": [".cache/namespace-three-authored.tsx#numeric-sink:1739"],
				".cache/namespace-three-authored.tsx#component:Motion#state:0": [".cache/namespace-three-authored.tsx#numeric-sink:1946"],
				".cache/namespace-three-authored.tsx#component:NestedForm#state:0": [".cache/namespace-three-authored.tsx#numeric-sink:2185"]
			},
			"execution_order": [
				".cache/namespace-three-authored.tsx#numeric-sink:1739",
				".cache/namespace-three-authored.tsx#numeric-sink:1946",
				".cache/namespace-three-authored.tsx#numeric-sink:2185"
			]
		}
	},
	"source_file": ".cache/namespace-three-authored.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { useEffect, useState } from \"../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \".cache/namespace-three-authored.tsx#component:FrameMarker\", sinkId: \".cache/namespace-three-authored.tsx#numeric-sink:1739\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\".cache/namespace-three-authored.tsx#component:FrameMarker#state:0\"] }, { schemaVersion: 2, ownerProgramId: \".cache/namespace-three-authored.tsx#component:Motion\", sinkId: \".cache/namespace-three-authored.tsx#numeric-sink:1946\", closedExpression: {\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.42}}, sourceSites: [\".cache/namespace-three-authored.tsx#component:Motion#state:0\"] }, { schemaVersion: 2, ownerProgramId: \".cache/namespace-three-authored.tsx#component:NestedForm\", sinkId: \".cache/namespace-three-authored.tsx#numeric-sink:2185\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\".cache/namespace-three-authored.tsx#component:NestedForm#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"../src/native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 4, programId: \".cache/namespace-three-authored.tsx#component:FrameMarker\", slotCount: 1, sinkIds: [\".cache/namespace-three-authored.tsx#numeric-sink:1739\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues, inputStart = 0, outputStart = 0) { let stagedCount = outputStart; for (let localIndex = 0; localIndex < changeCount; localIndex++) { const changeIndex = inputStart + localIndex; const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount - outputStart; } }, { schemaVersion: 5, programId: \".cache/namespace-three-authored.tsx#component:Motion\", slotCount: 1, sinkIds: [\".cache/namespace-three-authored.tsx#numeric-sink:1946\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues, inputStart = 0, outputStart = 0) { let stagedCount = outputStart; for (let localIndex = 0; localIndex < changeCount; localIndex++) { const changeIndex = inputStart + localIndex; const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0] * 0.42); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount - outputStart; } }, { schemaVersion: 4, programId: \".cache/namespace-three-authored.tsx#component:NestedForm\", slotCount: 1, sinkIds: [\".cache/namespace-three-authored.tsx#numeric-sink:2185\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues, inputStart = 0, outputStart = 0) { let stagedCount = outputStart; for (let localIndex = 0; localIndex < changeCount; localIndex++) { const changeIndex = inputStart + localIndex; const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount - outputStart; } }];\n__nativeDefineComponent(\".cache/namespace-three-authored.tsx#component:AlternatePanel\", AlternatePanel, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\".cache/namespace-three-authored.tsx#component:FragmentPair\", FragmentPair, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/namespace-three-authored.tsx#component:FrameMarker\", FrameMarker, { propOnlySites: [\".cache/namespace-three-authored.tsx#component:FrameMarker#state:0\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \".cache/namespace-three-authored.tsx#component:FrameMarker\", moduleRevision: \"native-v1-e27d5bbd83886ce8\", slots: [{ siteId: \".cache/namespace-three-authored.tsx#component:FrameMarker#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\n__nativeDefineComponent(\".cache/namespace-three-authored.tsx#component:FrameShell\", FrameShell, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/namespace-three-authored.tsx#component:IdentityPanel\", IdentityPanel, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\".cache/namespace-three-authored.tsx#component:Motion\", Motion, { propOnlySites: [\".cache/namespace-three-authored.tsx#component:Motion#state:0\"], numericPrimitiveProps: [\"motionName\"], numericRetainedProps: [\"children\"], stateLayout: { schemaVersion: 1, programId: \".cache/namespace-three-authored.tsx#component:Motion\", moduleRevision: \"native-v1-e27d5bbd83886ce8\", slots: [{ siteId: \".cache/namespace-three-authored.tsx#component:Motion#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[1] });\n__nativeDefineComponent(\".cache/namespace-three-authored.tsx#component:NestedForm\", NestedForm, { propOnlySites: [\".cache/namespace-three-authored.tsx#component:NestedForm#state:0\"], numericPrimitiveProps: [\"name\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \".cache/namespace-three-authored.tsx#component:NestedForm\", moduleRevision: \"native-v1-e27d5bbd83886ce8\", slots: [{ siteId: \".cache/namespace-three-authored.tsx#component:NestedForm#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[2] });\n__nativeDefineComponent(\".cache/namespace-three-authored.tsx#component:PrimitiveList\", PrimitiveList, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/namespace-three-authored.tsx#component:PrimitiveRoot\", PrimitiveRoot, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/namespace-three-authored.tsx#component:SceneView\", SceneView, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\".cache/namespace-three-authored.tsx#component:ThreeIdentity\", ThreeIdentity, { propOnlySites: [], hostLeafOutput: true });\nexport const frameTrace = { sceneRenders: 0, setEpoch: null, setPhase: null, setNested: null };\nexport const identityTrace = { starts: 0, cleanups: 0, refs: [] };\nexport function captureIdentityRef(node) { identityTrace.refs.push(node); }\nexport function IdentityPanel(props) {\n  __nativeUseEffectAt(\".cache/namespace-three-authored.tsx#component:IdentityPanel#effect:0\", () => { identityTrace.starts++; return () => { identityTrace.cleanups++; }; });\n  return <output key=\"constant\" ref={captureIdentityRef} data-value={props.value}>same</output>;\n}\nexport function AlternatePanel(props) {\n  __nativeUseEffectAt(\".cache/namespace-three-authored.tsx#component:AlternatePanel#effect:0\", () => { identityTrace.starts++; return () => { identityTrace.cleanups++; }; });\n  return <output key=\"constant\" ref={captureIdentityRef} data-value={props.value}>same</output>;\n}\nexport function PrimitiveRoot(props) { return props.value; }\nexport function PrimitiveList(props) {\n  const first = <PrimitiveRoot key=\"A\" value=\"A\" />;\n  const second = <PrimitiveRoot key=\"B\" value=\"B\" />;\n  return <section key=\"text-list\">{props.reverse ? [second, first] : [first, second]}</section>;\n}\nexport function FragmentPair(props) {\n  return <><i key=\"left\">left</i><i key=\"right\">right</i></>;\n}\nexport const threeIdentityTrace = { starts: 0, cleanups: 0 };\nexport function ThreeIdentity(props) {\n  __nativeUseEffectAt(\".cache/namespace-three-authored.tsx#component:ThreeIdentity#effect:0\", () => { threeIdentityTrace.starts++; return () => { threeIdentityTrace.cleanups++; }; });\n  return <group key=\"constant\" name={props.name}><mesh key=\"mesh\">\n    <boxGeometry args={[1,1,1]} /><meshStandardMaterial color=\"orange\" />\n  </mesh></group>;\n}\nexport function FrameMarker() {\n  const [epoch, setEpoch] = __nativeUseStateAt(\".cache/namespace-three-authored.tsx#component:FrameMarker#state:0\", 0);\n  __nativeUseEffectAt(\".cache/namespace-three-authored.tsx#component:FrameMarker#effect:0\", () => { frameTrace.setEpoch = setEpoch; });\n  return <group key=\"frame-marker\" name=\"accepted-frame\" position-x={__nativeBindStatePropAt(\".cache/namespace-three-authored.tsx#component:FrameMarker#state:0\", (epoch) => (epoch), __nativeNumericPrograms[0])} />;\n}\nexport function Motion(props) {\n  const [phase, setPhase] = __nativeUseStateAt(\".cache/namespace-three-authored.tsx#component:Motion#state:0\", 0);\n  __nativeUseEffectAt(\".cache/namespace-three-authored.tsx#component:Motion#effect:0\", () => { frameTrace.setPhase = setPhase; });\n  return <group key=\"motion\" name={props.motionName} rotation-y={__nativeBindStatePropAt(\".cache/namespace-three-authored.tsx#component:Motion#state:0\", (phase) => (phase * 0.42), __nativeNumericPrograms[1])}>\n    {props.children}\n  </group>;\n}\nexport function NestedForm(props) {\n  const [scale, setScale] = __nativeUseStateAt(\".cache/namespace-three-authored.tsx#component:NestedForm#state:0\", 1);\n  __nativeUseEffectAt(\".cache/namespace-three-authored.tsx#component:NestedForm#effect:0\", () => { frameTrace.setNested = setScale; });\n  return <mesh key=\"nested\" name={props.name} scale-x={__nativeBindStatePropAt(\".cache/namespace-three-authored.tsx#component:NestedForm#state:0\", (scale) => (scale), __nativeNumericPrograms[2])}>\n    <boxGeometry args={[1, 1, 1]} />\n    <meshStandardMaterial color=\"orange\" />\n  </mesh>;\n}\nexport function FrameShell(props) {\n  frameTrace.sceneRenders++;\n  return <group key=\"frame-shell\"><FrameMarker key=\"marker\" />\n    {!props.omitMotion && <Motion key=\"motion-owner\" motionName=\"kinetic-form\">\n      <NestedForm key={props.replacement ? \"replacement\" : \"first\"}\n        name={props.replacement ? \"replacement\" : \"first\"} />\n    </Motion>}\n  </group>;\n}\nexport function SceneView({ value, reset=false }) {\n  return <group>\n    <pointLight key=\"light\" args={[\"orange\", 2]} distance={reset ? undefined : value} position={reset ? undefined : [1,2,3]} shadow-mapSize={reset ? undefined : [1024,512]} />\n    <orthographicCamera key=\"camera\" zoom={reset ? undefined : value} />\n    <mesh key=\"mesh\" material-clearcoat={reset ? undefined : .65}>\n      <icosahedronGeometry args={[1,2]} />\n      <meshPhysicalMaterial color={reset ? undefined : \"blue\"} clearcoatRoughness={reset ? undefined : .25} />\n    </mesh>\n    <probeGroup key=\"custom\" args={[7]} probeMode={reset ? undefined : value} />\n  </group>;\n}",
	"components": [
		{
			"name": "AlternatePanel",
			"component_site_id": ".cache/namespace-three-authored.tsx#component:AlternatePanel",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [],
			"effect_sites": [{ "site_id": ".cache/namespace-three-authored.tsx#component:AlternatePanel#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "FragmentPair",
			"component_site_id": ".cache/namespace-three-authored.tsx#component:FragmentPair",
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
			"name": "FrameMarker",
			"component_site_id": ".cache/namespace-three-authored.tsx#component:FrameMarker",
			"prop_only_sites": [".cache/namespace-three-authored.tsx#component:FrameMarker#state:0"],
			"state_layout": {
				"schema_version": 1,
				"programId": ".cache/namespace-three-authored.tsx#component:FrameMarker",
				"moduleRevision": "native-v1-e27d5bbd83886ce8",
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
				"sink_id": ".cache/namespace-three-authored.tsx#numeric-sink:1739",
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
			"name": "IdentityPanel",
			"component_site_id": ".cache/namespace-three-authored.tsx#component:IdentityPanel",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [],
			"effect_sites": [{ "site_id": ".cache/namespace-three-authored.tsx#component:IdentityPanel#effect:0" }],
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
				"moduleRevision": "native-v1-e27d5bbd83886ce8",
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
				"sink_id": ".cache/namespace-three-authored.tsx#numeric-sink:1946",
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
				"moduleRevision": "native-v1-e27d5bbd83886ce8",
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
				"sink_id": ".cache/namespace-three-authored.tsx#numeric-sink:2185",
				"source_sites": [".cache/namespace-three-authored.tsx#component:NestedForm#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		},
		{
			"name": "PrimitiveList",
			"component_site_id": ".cache/namespace-three-authored.tsx#component:PrimitiveList",
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
			"name": "PrimitiveRoot",
			"component_site_id": ".cache/namespace-three-authored.tsx#component:PrimitiveRoot",
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
		},
		{
			"name": "ThreeIdentity",
			"component_site_id": ".cache/namespace-three-authored.tsx#component:ThreeIdentity",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [],
			"effect_sites": [{ "site_id": ".cache/namespace-three-authored.tsx#component:ThreeIdentity#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "../src/native_runtime_api.ts";
