import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "main.tsx",
	"module_revision": "native-v1-7c31ef52f5ba9279",
	"owners": [
		{
			"site_id": "main.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:HotCounter",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:OpaqueSibling",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:PureArrow",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:PureNamed",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": "main.tsx#component:HotCounter#state:0",
			"owner_site_id": "main.tsx#component:HotCounter",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": "main.tsx#component:OpaqueSibling#state:0",
			"owner_site_id": "main.tsx#component:OpaqueSibling",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": "main.tsx#component:PureArrow#state:0",
			"owner_site_id": "main.tsx#component:PureArrow",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": "main.tsx#component:PureNamed#state:0",
			"owner_site_id": "main.tsx#component:PureNamed",
			"kind": "state",
			"provenance": "tracked"
		}
	],
	"sinks": [
		{
			"site_id": "main.tsx#numeric-sink:1241",
			"owner_site_id": "main.tsx#component:HotCounter",
			"source_sites": ["main.tsx#component:HotCounter#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		},
		{
			"site_id": "main.tsx#numeric-sink:996",
			"owner_site_id": "main.tsx#component:OpaqueSibling",
			"source_sites": ["main.tsx#component:OpaqueSibling#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		},
		{
			"site_id": "main.tsx#numeric-sink:1487",
			"owner_site_id": "main.tsx#component:PureArrow",
			"source_sites": ["main.tsx#component:PureArrow#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		},
		{
			"site_id": "main.tsx#numeric-sink:1363",
			"owner_site_id": "main.tsx#component:PureNamed",
			"source_sites": ["main.tsx#component:PureNamed#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}
	],
	"operations": [{
		"site_id": "main.tsx#component:HotCounter#effect:0",
		"owner_site_id": "main.tsx#component:HotCounter",
		"kind": "activation-effect",
		"provenance": "opaque",
		"source_sites": []
	}, {
		"site_id": "main.tsx#component:OpaqueSibling#effect:0",
		"owner_site_id": "main.tsx#component:OpaqueSibling",
		"kind": "activation-effect",
		"provenance": "opaque",
		"source_sites": []
	}],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {
			"main.tsx#component:HotCounter#state:0": ["main.tsx#numeric-sink:1241"],
			"main.tsx#component:OpaqueSibling#state:0": ["main.tsx#numeric-sink:996"],
			"main.tsx#component:PureArrow#state:0": ["main.tsx#numeric-sink:1487"],
			"main.tsx#component:PureNamed#state:0": ["main.tsx#numeric-sink:1363"]
		},
		"execution_order": [
			"main.tsx#numeric-sink:1241",
			"main.tsx#numeric-sink:996",
			"main.tsx#numeric-sink:1487",
			"main.tsx#numeric-sink:1363"
		]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "main.tsx" && event.previousRevision === "native-v1-7c31ef52f5ba9279" && event.previousInstance === "native-v1-7c31ef52f5ba9279") __invalidateNativeSemanticPlan("main.tsx", "native-v1-7c31ef52f5ba9279");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/core */
import { createWorld } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, bindStatePropAt as __nativeBindStatePropAt } from "@r3act/core";
const __nativeNumericPrograms = [
	{
		schemaVersion: 2,
		ownerProgramId: "main.tsx#component:OpaqueSibling",
		sinkId: "main.tsx#numeric-sink:996",
		closedExpression: {
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
		},
		sourceSites: ["main.tsx#component:OpaqueSibling#state:0"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: "main.tsx#component:HotCounter",
		sinkId: "main.tsx#numeric-sink:1241",
		closedExpression: {
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
		},
		sourceSites: ["main.tsx#component:HotCounter#state:0"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: "main.tsx#component:PureNamed",
		sinkId: "main.tsx#numeric-sink:1363",
		closedExpression: {
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
		},
		sourceSites: ["main.tsx#component:PureNamed#state:0"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: "main.tsx#component:PureArrow",
		sinkId: "main.tsx#numeric-sink:1487",
		closedExpression: {
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
		},
		sourceSites: ["main.tsx#component:PureArrow#state:0"]
	}
];
const __nativeOwnerCutKernels = [
	{
		schemaVersion: 2,
		programId: "main.tsx#component:HotCounter",
		slotCount: 1,
		sinkIds: ["main.tsx#numeric-sink:1241"],
		executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) {
			let stagedCount = 0;
			for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) {
				const rowState = rowStates[changeIndex];
				switch (changedSlots[changeIndex]) {
					case 0: {
						if ((rowState.seenMask & 1) === 0) {
							rowState.seenMask |= 1;
							const next = rowState.inputValues[0] + 1;
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
		programId: "main.tsx#component:PureArrow",
		slotCount: 1,
		sinkIds: ["main.tsx#numeric-sink:1487"],
		executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) {
			let stagedCount = 0;
			for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) {
				const rowState = rowStates[changeIndex];
				switch (changedSlots[changeIndex]) {
					case 0: {
						if ((rowState.seenMask & 1) === 0) {
							rowState.seenMask |= 1;
							const next = rowState.inputValues[0] + 1;
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
		programId: "main.tsx#component:PureNamed",
		slotCount: 1,
		sinkIds: ["main.tsx#numeric-sink:1363"],
		executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) {
			let stagedCount = 0;
			for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) {
				const rowState = rowStates[changeIndex];
				switch (changedSlots[changeIndex]) {
					case 0: {
						if ((rowState.seenMask & 1) === 0) {
							rowState.seenMask |= 1;
							const next = rowState.inputValues[0] + 1;
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
__nativeDefineComponent("main.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent("main.tsx#component:OpaqueSibling", OpaqueSibling, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent("main.tsx#component:PureNamed", PureNamed, {
	propOnlySites: ["main.tsx#component:PureNamed#state:0"],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: "main.tsx#component:PureNamed",
		moduleRevision: "native-v1-7c31ef52f5ba9279",
		slots: [{
			siteId: "main.tsx#component:PureNamed#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[2]
});
import { createDOMRoot } from "@r3act/host-dom";
import { createThreeNativeRoot } from "@r3act/host-three";
import { Scene } from "three";
import { SceneApp } from "./scene";
import { createSceneResource } from "./state";
const trace = {
	opaqueValue: "A",
	opaqueCalls: 0,
	getterCalls: 0,
	opaqueMounts: 0,
	opaqueCleanups: 0,
	hotMounts: 0,
	hotCleanups: 0,
	setOpaque: null,
	setHot: null
};
const opaqueSource = { get value() {
	trace.getterCalls++;
	return trace.opaqueValue;
} };
function readOpaque() {
	trace.opaqueCalls++;
	return opaqueSource.value;
}
export function OpaqueSibling() {
	const [n, setN] = __nativeUseStateAt("main.tsx#component:OpaqueSibling#state:0", 0);
	__nativeUseEffectAt("main.tsx#component:OpaqueSibling#effect:0", () => {
		trace.opaqueMounts++;
		trace.setOpaque = setN;
		return () => {
			trace.opaqueCleanups++;
		};
	});
	const opaque = readOpaque();
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "opaque",
		"data-n": __nativeBindStatePropAt("main.tsx#component:OpaqueSibling#state:0", (n) => n + 1, __nativeNumericPrograms[0]),
		"data-opaque": opaque
	});
}
export const HotCounter = __nativeDefineComponent("main.tsx#component:HotCounter", { HotCounter: () => {
	const [n, setN] = __nativeUseStateAt("main.tsx#component:HotCounter#state:0", 0);
	__nativeUseEffectAt("main.tsx#component:HotCounter#effect:0", () => {
		trace.hotMounts++;
		trace.setHot = setN;
		return () => {
			trace.hotCleanups++;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "hot",
		"data-hot": __nativeBindStatePropAt("main.tsx#component:HotCounter#state:0", (n) => n + 1, __nativeNumericPrograms[1])
	});
} }.HotCounter, {
	propOnlySites: ["main.tsx#component:HotCounter#state:0"],
	stateLayout: {
		schemaVersion: 1,
		programId: "main.tsx#component:HotCounter",
		moduleRevision: "native-v1-7c31ef52f5ba9279",
		slots: [{
			siteId: "main.tsx#component:HotCounter#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
export function PureNamed() {
	const [n] = __nativeUseStateAt("main.tsx#component:PureNamed#state:0", 0);
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "pure-named",
		"data-pure-named": __nativeBindStatePropAt("main.tsx#component:PureNamed#state:0", (n) => n + 1, __nativeNumericPrograms[2])
	});
}
export const PureArrow = __nativeDefineComponent("main.tsx#component:PureArrow", { PureArrow: () => {
	const [n] = __nativeUseStateAt("main.tsx#component:PureArrow#state:0", 0);
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "pure-arrow",
		"data-pure-arrow": __nativeBindStatePropAt("main.tsx#component:PureArrow#state:0", (n) => n + 1, __nativeNumericPrograms[3])
	});
} }.PureArrow, {
	propOnlySites: ["main.tsx#component:PureArrow#state:0"],
	stateLayout: {
		schemaVersion: 1,
		programId: "main.tsx#component:PureArrow",
		moduleRevision: "native-v1-7c31ef52f5ba9279",
		slots: [{
			siteId: "main.tsx#component:PureArrow#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[1]
});
export function App() {
	return /* @__PURE__ */ __nativeJsx.jsx("main", null, /* @__PURE__ */ __nativeJsx.jsx("h1", null, "Numeric owner effects"), /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		"data-action": "hot",
		onClick: () => trace.setHot?.(1)
	}, "Update safe owner"), /* @__PURE__ */ __nativeJsx.jsx("button", {
		type: "button",
		"data-action": "opaque",
		onClick: () => {
			trace.opaqueValue = "B";
			trace.setOpaque?.(1);
		}
	}, "Update opaque owner"), /* @__PURE__ */ __nativeJsx.jsx(OpaqueSibling, { key: "opaque-owner" }), /* @__PURE__ */ __nativeJsx.jsx(HotCounter, { key: "hot-owner" }), /* @__PURE__ */ __nativeJsx.jsx(PureNamed, { key: "named-owner" }), /* @__PURE__ */ __nativeJsx.jsx(PureArrow, { key: "arrow-owner" }));
}
export function mountNumericOwnerScene(host) {
	const world = createWorld();
	const scene = new Scene();
	const pending = createSceneResource();
	const domRoot = createDOMRoot(host, {
		world,
		rootId: "numeric-effects-dom"
	});
	const three = createThreeNativeRoot(scene, { rootOptions: {
		world,
		rootId: "numeric-effects-three"
	} });
	let disposed = false;
	domRoot.mount(/* @__PURE__ */ __nativeJsx.jsx(App, null));
	three.root.mount(/* @__PURE__ */ __nativeJsx.jsx(SceneApp, { resource: pending.resource }));
	const opaqueInitial = host.querySelector("[data-opaque]");
	const hotInitial = host.querySelector("[data-hot]");
	const sceneFallback = scene.children[0]?.children[0];
	const snapshot = () => {
		const opaque = host.querySelector("[data-opaque]");
		const hot = host.querySelector("[data-hot]");
		const sceneChild = scene.children[0]?.children[0];
		return {
			opaqueN: opaque?.getAttribute("data-n") ?? null,
			opaqueValue: opaque?.getAttribute("data-opaque") ?? null,
			opaqueRetained: opaque === opaqueInitial,
			hot: hot?.getAttribute("data-hot") ?? null,
			hotRetained: hot === hotInitial,
			opaqueCalls: trace.opaqueCalls,
			getterCalls: trace.getterCalls,
			opaqueMounts: trace.opaqueMounts,
			opaqueCleanups: trace.opaqueCleanups,
			hotMounts: trace.hotMounts,
			hotCleanups: trace.hotCleanups,
			sceneStatus: pending.resource.status.status,
			sceneName: sceneChild?.name ?? null,
			sceneFallbackRetained: sceneChild === sceneFallback,
			scenePosition: sceneChild?.children[0]?.position.toArray() ?? null,
			dom: domRoot.diagnostics(),
			three: three.root.diagnostics(),
			threeHost: three.host.diagnostics,
			disposed
		};
	};
	return {
		snapshot,
		updateHot(value) {
			trace.setHot?.(value);
		},
		updateOpaque(value, opaque) {
			trace.opaqueValue = opaque;
			trace.setOpaque?.(value);
		},
		resolveScene(x) {
			pending.resolve({ sample: { x } });
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			domRoot.dispose();
			three.dispose();
		}
	};
}
const host = document.getElementById("app");
window.numericOwnerProof = mountNumericOwnerScene(host);
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-7c31ef52f5ba9279",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "main.tsx",
		"module_revision": "native-v1-7c31ef52f5ba9279",
		"owners": [
			{
				"site_id": "main.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:HotCounter",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:OpaqueSibling",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:PureArrow",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:PureNamed",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": "main.tsx#component:HotCounter#state:0",
				"owner_site_id": "main.tsx#component:HotCounter",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": "main.tsx#component:OpaqueSibling#state:0",
				"owner_site_id": "main.tsx#component:OpaqueSibling",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": "main.tsx#component:PureArrow#state:0",
				"owner_site_id": "main.tsx#component:PureArrow",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": "main.tsx#component:PureNamed#state:0",
				"owner_site_id": "main.tsx#component:PureNamed",
				"kind": "state",
				"provenance": "tracked"
			}
		],
		"sinks": [
			{
				"site_id": "main.tsx#numeric-sink:1241",
				"owner_site_id": "main.tsx#component:HotCounter",
				"source_sites": ["main.tsx#component:HotCounter#state:0"],
				"provenance": "closed",
				"equality": "object-is",
				"host_value": "scalar",
				"retention": "value",
				"execution": "compiled-binding"
			},
			{
				"site_id": "main.tsx#numeric-sink:996",
				"owner_site_id": "main.tsx#component:OpaqueSibling",
				"source_sites": ["main.tsx#component:OpaqueSibling#state:0"],
				"provenance": "closed",
				"equality": "object-is",
				"host_value": "scalar",
				"retention": "value",
				"execution": "compiled-binding"
			},
			{
				"site_id": "main.tsx#numeric-sink:1487",
				"owner_site_id": "main.tsx#component:PureArrow",
				"source_sites": ["main.tsx#component:PureArrow#state:0"],
				"provenance": "closed",
				"equality": "object-is",
				"host_value": "scalar",
				"retention": "value",
				"execution": "compiled-binding"
			},
			{
				"site_id": "main.tsx#numeric-sink:1363",
				"owner_site_id": "main.tsx#component:PureNamed",
				"source_sites": ["main.tsx#component:PureNamed#state:0"],
				"provenance": "closed",
				"equality": "object-is",
				"host_value": "scalar",
				"retention": "value",
				"execution": "compiled-binding"
			}
		],
		"operations": [{
			"site_id": "main.tsx#component:HotCounter#effect:0",
			"owner_site_id": "main.tsx#component:HotCounter",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}, {
			"site_id": "main.tsx#component:OpaqueSibling#effect:0",
			"owner_site_id": "main.tsx#component:OpaqueSibling",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {
				"main.tsx#component:HotCounter#state:0": ["main.tsx#numeric-sink:1241"],
				"main.tsx#component:OpaqueSibling#state:0": ["main.tsx#numeric-sink:996"],
				"main.tsx#component:PureArrow#state:0": ["main.tsx#numeric-sink:1487"],
				"main.tsx#component:PureNamed#state:0": ["main.tsx#numeric-sink:1363"]
			},
			"execution_order": [
				"main.tsx#numeric-sink:1241",
				"main.tsx#numeric-sink:996",
				"main.tsx#numeric-sink:1487",
				"main.tsx#numeric-sink:1363"
			]
		}
	},
	"source_file": "main.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/core */\n// @native-ui\nimport { createWorld, useEffect, useState } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \"main.tsx#component:OpaqueSibling\", sinkId: \"main.tsx#numeric-sink:996\", closedExpression: {\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"kind\":\"literal\",\"value\":1.0}}, sourceSites: [\"main.tsx#component:OpaqueSibling#state:0\"] }, { schemaVersion: 2, ownerProgramId: \"main.tsx#component:HotCounter\", sinkId: \"main.tsx#numeric-sink:1241\", closedExpression: {\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"kind\":\"literal\",\"value\":1.0}}, sourceSites: [\"main.tsx#component:HotCounter#state:0\"] }, { schemaVersion: 2, ownerProgramId: \"main.tsx#component:PureNamed\", sinkId: \"main.tsx#numeric-sink:1363\", closedExpression: {\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"kind\":\"literal\",\"value\":1.0}}, sourceSites: [\"main.tsx#component:PureNamed#state:0\"] }, { schemaVersion: 2, ownerProgramId: \"main.tsx#component:PureArrow\", sinkId: \"main.tsx#numeric-sink:1487\", closedExpression: {\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"kind\":\"literal\",\"value\":1.0}}, sourceSites: [\"main.tsx#component:PureArrow#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"@r3act/core\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 2, programId: \"main.tsx#component:HotCounter\", slotCount: 1, sinkIds: [\"main.tsx#numeric-sink:1241\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0] + 1); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }, { schemaVersion: 2, programId: \"main.tsx#component:PureArrow\", slotCount: 1, sinkIds: [\"main.tsx#numeric-sink:1487\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0] + 1); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }, { schemaVersion: 2, programId: \"main.tsx#component:PureNamed\", slotCount: 1, sinkIds: [\"main.tsx#numeric-sink:1363\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0] + 1); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\n__nativeDefineComponent(\"main.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"main.tsx#component:OpaqueSibling\", OpaqueSibling, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\"main.tsx#component:PureNamed\", PureNamed, { propOnlySites: [\"main.tsx#component:PureNamed#state:0\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \"main.tsx#component:PureNamed\", moduleRevision: \"native-v1-7c31ef52f5ba9279\", slots: [{ siteId: \"main.tsx#component:PureNamed#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[2] });\nimport { createDOMRoot } from \"@r3act/host-dom\";\nimport { createThreeNativeRoot } from \"@r3act/host-three\";\nimport { Scene } from \"three\";\nimport { SceneApp } from \"./scene\";\nimport { createSceneResource } from \"./state\";\n\nconst trace = { opaqueValue: \"A\", opaqueCalls: 0, getterCalls: 0,\n  opaqueMounts: 0, opaqueCleanups: 0, hotMounts: 0, hotCleanups: 0,\n  setOpaque: null as null | ((value: number) => void),\n  setHot: null as null | ((value: number) => void) };\nconst opaqueSource = { get value() { trace.getterCalls++; return trace.opaqueValue; } };\nfunction readOpaque() { trace.opaqueCalls++; return opaqueSource.value; }\n\nexport function OpaqueSibling() {\n  const [n, setN] = __nativeUseStateAt(\"main.tsx#component:OpaqueSibling#state:0\", 0);\n  __nativeUseEffectAt(\"main.tsx#component:OpaqueSibling#effect:0\", () => { trace.opaqueMounts++; trace.setOpaque = setN;\n    return () => { trace.opaqueCleanups++; }; });\n  const opaque = readOpaque();\n  return <output key=\"opaque\" data-n={__nativeBindStatePropAt(\"main.tsx#component:OpaqueSibling#state:0\", (n) => (n + 1), __nativeNumericPrograms[0])} data-opaque={opaque} />;\n}\nexport const HotCounter = __nativeDefineComponent(\"main.tsx#component:HotCounter\", ({ HotCounter: () => {\n  const [n, setN] = __nativeUseStateAt(\"main.tsx#component:HotCounter#state:0\", 0);\n  __nativeUseEffectAt(\"main.tsx#component:HotCounter#effect:0\", () => { trace.hotMounts++; trace.setHot = setN;\n    return () => { trace.hotCleanups++; }; });\n  return <output key=\"hot\" data-hot={__nativeBindStatePropAt(\"main.tsx#component:HotCounter#state:0\", (n) => (n + 1), __nativeNumericPrograms[1])} />;\n} }).HotCounter, { propOnlySites: [\"main.tsx#component:HotCounter#state:0\"], stateLayout: { schemaVersion: 1, programId: \"main.tsx#component:HotCounter\", moduleRevision: \"native-v1-7c31ef52f5ba9279\", slots: [{ siteId: \"main.tsx#component:HotCounter#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\nexport function PureNamed() {\n  const [n] = __nativeUseStateAt(\"main.tsx#component:PureNamed#state:0\", 0);\n  return <output key=\"pure-named\" data-pure-named={__nativeBindStatePropAt(\"main.tsx#component:PureNamed#state:0\", (n) => (n + 1), __nativeNumericPrograms[2])} />;\n}\nexport const PureArrow = __nativeDefineComponent(\"main.tsx#component:PureArrow\", ({ PureArrow: () => {\n  const [n] = __nativeUseStateAt(\"main.tsx#component:PureArrow#state:0\", 0);\n  return <output key=\"pure-arrow\" data-pure-arrow={__nativeBindStatePropAt(\"main.tsx#component:PureArrow#state:0\", (n) => (n + 1), __nativeNumericPrograms[3])} />;\n} }).PureArrow, { propOnlySites: [\"main.tsx#component:PureArrow#state:0\"], stateLayout: { schemaVersion: 1, programId: \"main.tsx#component:PureArrow\", moduleRevision: \"native-v1-7c31ef52f5ba9279\", slots: [{ siteId: \"main.tsx#component:PureArrow#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[1] });\nexport function App() {\n  return <main>\n    <h1>Numeric owner effects</h1>\n    <button type=\"button\" data-action=\"hot\" onClick={() => trace.setHot?.(1)}>Update safe owner</button>\n    <button type=\"button\" data-action=\"opaque\" onClick={() => {\n      trace.opaqueValue = \"B\"; trace.setOpaque?.(1);\n    }}>Update opaque owner</button>\n    <OpaqueSibling key=\"opaque-owner\" />\n    <HotCounter key=\"hot-owner\" />\n    <PureNamed key=\"named-owner\" />\n    <PureArrow key=\"arrow-owner\" />\n  </main>;\n}\n\nexport function mountNumericOwnerScene(host: HTMLElement) {\n  const world = createWorld();\n  const scene = new Scene();\n  const pending = createSceneResource();\n  const domRoot = createDOMRoot(host, { world, rootId: \"numeric-effects-dom\" });\n  const three = createThreeNativeRoot(scene,\n    { rootOptions: { world, rootId: \"numeric-effects-three\" } });\n  let disposed = false;\n  domRoot.mount(<App />);\n  three.root.mount(<SceneApp resource={pending.resource} />);\n  const opaqueInitial = host.querySelector(\"[data-opaque]\");\n  const hotInitial = host.querySelector(\"[data-hot]\");\n  const sceneFallback = scene.children[0]?.children[0];\n  const snapshot = () => {\n    const opaque = host.querySelector(\"[data-opaque]\");\n    const hot = host.querySelector(\"[data-hot]\");\n    const sceneChild = scene.children[0]?.children[0];\n    return { opaqueN: opaque?.getAttribute(\"data-n\") ?? null,\n      opaqueValue: opaque?.getAttribute(\"data-opaque\") ?? null,\n      opaqueRetained: opaque === opaqueInitial,\n      hot: hot?.getAttribute(\"data-hot\") ?? null, hotRetained: hot === hotInitial,\n      opaqueCalls: trace.opaqueCalls, getterCalls: trace.getterCalls,\n      opaqueMounts: trace.opaqueMounts, opaqueCleanups: trace.opaqueCleanups,\n      hotMounts: trace.hotMounts, hotCleanups: trace.hotCleanups,\n      sceneStatus: pending.resource.status.status,\n      sceneName: sceneChild?.name ?? null,\n      sceneFallbackRetained: sceneChild === sceneFallback,\n      scenePosition: sceneChild?.children[0]?.position.toArray() ?? null,\n      dom: domRoot.diagnostics(), three: three.root.diagnostics(),\n      threeHost: three.host.diagnostics, disposed };\n  };\n  return { snapshot,\n    updateHot(value: number) { trace.setHot?.(value); },\n    updateOpaque(value: number, opaque: string) { trace.opaqueValue = opaque; trace.setOpaque?.(value); },\n    resolveScene(x: number) { pending.resolve({ sample: { x } }); },\n    dispose() { if (disposed) return; disposed = true; domRoot.dispose(); three.dispose(); } };\n}\n\nconst host = document.getElementById(\"app\")!;\n(window as Window & { numericOwnerProof?: ReturnType<typeof mountNumericOwnerScene> })\n  .numericOwnerProof = mountNumericOwnerScene(host);\n",
	"components": [
		{
			"name": "App",
			"component_site_id": "main.tsx#component:App",
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
			"name": "HotCounter",
			"component_site_id": "main.tsx#component:HotCounter",
			"prop_only_sites": ["main.tsx#component:HotCounter#state:0"],
			"state_layout": {
				"schema_version": 1,
				"programId": "main.tsx#component:HotCounter",
				"moduleRevision": "native-v1-7c31ef52f5ba9279",
				"slots": [{
					"site_id": "main.tsx#component:HotCounter#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": "main.tsx#component:HotCounter#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": "main.tsx#component:HotCounter#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": "main.tsx#numeric-sink:1241",
				"source_sites": ["main.tsx#component:HotCounter#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		},
		{
			"name": "OpaqueSibling",
			"component_site_id": "main.tsx#component:OpaqueSibling",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": "main.tsx#component:OpaqueSibling#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": "main.tsx#component:OpaqueSibling#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": "main.tsx#numeric-sink:996",
				"source_sites": ["main.tsx#component:OpaqueSibling#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		},
		{
			"name": "PureArrow",
			"component_site_id": "main.tsx#component:PureArrow",
			"prop_only_sites": ["main.tsx#component:PureArrow#state:0"],
			"state_layout": {
				"schema_version": 1,
				"programId": "main.tsx#component:PureArrow",
				"moduleRevision": "native-v1-7c31ef52f5ba9279",
				"slots": [{
					"site_id": "main.tsx#component:PureArrow#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": "main.tsx#component:PureArrow#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": "main.tsx#numeric-sink:1487",
				"source_sites": ["main.tsx#component:PureArrow#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		},
		{
			"name": "PureNamed",
			"component_site_id": "main.tsx#component:PureNamed",
			"prop_only_sites": ["main.tsx#component:PureNamed#state:0"],
			"state_layout": {
				"schema_version": 1,
				"programId": "main.tsx#component:PureNamed",
				"moduleRevision": "native-v1-7c31ef52f5ba9279",
				"slots": [{
					"site_id": "main.tsx#component:PureNamed#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": "main.tsx#component:PureNamed#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": "main.tsx#numeric-sink:1363",
				"source_sites": ["main.tsx#component:PureNamed#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "@r3act/core";
