import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx",
	"module_revision": "native-v1-84202ab3936e9ccb",
	"owners": [
		{
			"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Board",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe#state:0",
			"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0",
			"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1",
			"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2",
			"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
			"kind": "state",
			"provenance": "tracked"
		}
	],
	"sinks": [
		{
			"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:971",
			"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe",
			"source_sites": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		},
		{
			"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:682",
			"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
			"source_sites": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		},
		{
			"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:701",
			"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
			"source_sites": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		},
		{
			"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:726",
			"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
			"source_sites": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}
	],
	"operations": [{
		"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Board#collection:0",
		"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Board",
		"kind": "collection",
		"provenance": "opaque",
		"source_sites": []
	}, {
		"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#effect:0",
		"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
		"kind": "activation-effect",
		"provenance": "opaque",
		"source_sites": []
	}],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {
			".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe#state:0": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:971"],
			".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:682"],
			".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:701"],
			".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:726"]
		},
		"execution_order": [
			".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:971",
			".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:682",
			".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:701",
			".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:726"
		]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx" && event.previousRevision === "native-v1-84202ab3936e9ccb" && event.previousInstance === "native-v1-84202ab3936e9ccb") __invalidateNativeSemanticPlan(".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx", "native-v1-84202ab3936e9ccb");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { createKeyedCollection } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, renderCollectionAt as __nativeRenderCollectionAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
const __nativeNumericPrograms = [
	{
		schemaVersion: 2,
		ownerProgramId: ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
		sinkId: ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:682",
		closedExpression: {
			"expressions": [{
				"index": 0,
				"kind": "input"
			}],
			"kind": "template",
			"parts": ["", "px"]
		},
		sourceSites: [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
		sinkId: ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:701",
		closedExpression: {
			"expressions": [{
				"index": 0,
				"kind": "input"
			}],
			"kind": "template",
			"parts": ["", "px"]
		},
		sourceSites: [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
		sinkId: ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:726",
		closedExpression: {
			"expressions": [{
				"index": 0,
				"kind": "input"
			}],
			"kind": "template",
			"parts": ["rotate(", "deg)"]
		},
		sourceSites: [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe",
		sinkId: ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:971",
		closedExpression: {
			"index": 0,
			"kind": "input"
		},
		sourceSites: [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe#state:0"]
	}
];
const __nativeOwnerCutKernels = [{
	schemaVersion: 4,
	programId: ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
	slotCount: 3,
	sinkIds: [
		".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:682",
		".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:701",
		".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:726"
	],
	executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues, inputStart = 0, outputStart = 0) {
		let stagedCount = outputStart;
		for (let localIndex = 0; localIndex < changeCount; localIndex++) {
			const changeIndex = inputStart + localIndex;
			const rowState = rowStates[changeIndex];
			switch (changedSlots[changeIndex]) {
				case 0: {
					if ((rowState.seenMask & 1) === 0) {
						rowState.seenMask |= 1;
						const next = `${rowState.inputValues[0]}px`;
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
				case 1: {
					if ((rowState.seenMask & 2) === 0) {
						rowState.seenMask |= 2;
						const next = `${rowState.inputValues[1]}px`;
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
				case 2: {
					if ((rowState.seenMask & 4) === 0) {
						rowState.seenMask |= 4;
						const next = `rotate(${rowState.inputValues[2]}deg)`;
						const sinkState = rowState.sinks[2];
						const last = sinkState.lastValue;
						const same = last === next ? typeof next !== "number" || typeof last === "number" && (last !== 0 || 1 / last === 1 / next) : typeof last === "number" && typeof next === "number" && last !== last && next !== next;
						if (!same) {
							stagedInputIndices[stagedCount] = changeIndex;
							stagedSinkIds[stagedCount] = 2;
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
}];
__nativeDefineComponent(".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Board", Board, {
	propOnlySites: [],
	closedCollectionSites: []
});
__nativeDefineComponent(".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe", CandidateProbe, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent(".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row", Row, {
	propOnlySites: [
		".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0",
		".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1",
		".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2"
	],
	numericPrimitiveProps: ["id"],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
		moduleRevision: "native-v1-84202ab3936e9ccb",
		slots: [
			{
				siteId: ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0",
				slot: 0
			},
			{
				siteId: ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1",
				slot: 1
			},
			{
				siteId: ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2",
				slot: 2
			}
		]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
export const rows = createKeyedCollection([{ id: "a" }, { id: "b" }], (row) => row.id);
export const trace = {
	controls: {},
	candidateMutationKey: null,
	candidateMutations: 0
};
export function Row({ id }) {
	const [x, setX] = __nativeUseStateAt(".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0", 0);
	const [y, setY] = __nativeUseStateAt(".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1", 0);
	const [rotation, setRotation] = __nativeUseStateAt(".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2", 0);
	__nativeUseEffectAt(".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#effect:0", () => {
		trace.controls[id] = {
			x: setX,
			y: setY,
			rotation: setRotation
		};
		return () => {
			if (trace.controls[id]?.x === setX) delete trace.controls[id];
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("i", {
		"data-row": id,
		style: {
			left: __nativeBindStatePropAt(".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0", (x) => `${x}px`, __nativeNumericPrograms[0]),
			top: __nativeBindStatePropAt(".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1", (y) => `${y}px`, __nativeNumericPrograms[1]),
			transform: __nativeBindStatePropAt(".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2", (rotation) => `rotate(${rotation}deg)`, __nativeNumericPrograms[2])
		}
	});
}
export function CandidateProbe() {
	const [value, setValue] = __nativeUseStateAt(".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe#state:0", 0);
	if (trace.candidateMutationKey !== null) {
		trace.candidateMutations++;
		setValue(999);
	}
	return /* @__PURE__ */ __nativeJsx.jsx("span", { "data-candidate": __nativeBindStatePropAt(".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe#state:0", (value) => value, __nativeNumericPrograms[3]) });
}
export function Board() {
	const children = __nativeRenderCollectionAt(".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Board#collection:0", rows, ((row) => /* @__PURE__ */ __nativeJsx.jsx(Row, {
		key: row.id,
		id: row.id
	})), { requiresOwnerRender: true });
	if (trace.candidateMutationKey !== null) {
		return /* @__PURE__ */ __nativeJsx.jsx("ul", null, children, /* @__PURE__ */ __nativeJsx.jsx(CandidateProbe, { key: "candidate" }));
	}
	return /* @__PURE__ */ __nativeJsx.jsx("ul", null, children);
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-84202ab3936e9ccb",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx",
		"module_revision": "native-v1-84202ab3936e9ccb",
		"owners": [
			{
				"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Board",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe#state:0",
				"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0",
				"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1",
				"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2",
				"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
				"kind": "state",
				"provenance": "tracked"
			}
		],
		"sinks": [
			{
				"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:971",
				"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe",
				"source_sites": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe#state:0"],
				"provenance": "closed",
				"equality": "object-is",
				"host_value": "scalar",
				"retention": "value",
				"execution": "compiled-binding"
			},
			{
				"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:682",
				"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
				"source_sites": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0"],
				"provenance": "closed",
				"equality": "object-is",
				"host_value": "scalar",
				"retention": "value",
				"execution": "compiled-binding"
			},
			{
				"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:701",
				"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
				"source_sites": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1"],
				"provenance": "closed",
				"equality": "object-is",
				"host_value": "scalar",
				"retention": "value",
				"execution": "compiled-binding"
			},
			{
				"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:726",
				"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
				"source_sites": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2"],
				"provenance": "closed",
				"equality": "object-is",
				"host_value": "scalar",
				"retention": "value",
				"execution": "compiled-binding"
			}
		],
		"operations": [{
			"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Board#collection:0",
			"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Board",
			"kind": "collection",
			"provenance": "opaque",
			"source_sites": []
		}, {
			"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#effect:0",
			"owner_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {
				".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe#state:0": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:971"],
				".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:682"],
				".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:701"],
				".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:726"]
			},
			"execution_order": [
				".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:971",
				".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:682",
				".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:701",
				".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:726"
			]
		}
	},
	"source_file": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { createKeyedCollection, useEffect, useState } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row\", sinkId: \".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:682\", closedExpression: {\"expressions\":[{\"index\":0,\"kind\":\"input\"}],\"kind\":\"template\",\"parts\":[\"\",\"px\"]}, sourceSites: [\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0\"] }, { schemaVersion: 2, ownerProgramId: \".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row\", sinkId: \".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:701\", closedExpression: {\"expressions\":[{\"index\":0,\"kind\":\"input\"}],\"kind\":\"template\",\"parts\":[\"\",\"px\"]}, sourceSites: [\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1\"] }, { schemaVersion: 2, ownerProgramId: \".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row\", sinkId: \".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:726\", closedExpression: {\"expressions\":[{\"index\":0,\"kind\":\"input\"}],\"kind\":\"template\",\"parts\":[\"rotate(\",\"deg)\"]}, sourceSites: [\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2\"] }, { schemaVersion: 2, ownerProgramId: \".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe\", sinkId: \".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:971\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 4, programId: \".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row\", slotCount: 3, sinkIds: [\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:682\", \".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:701\", \".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:726\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues, inputStart = 0, outputStart = 0) { let stagedCount = outputStart; for (let localIndex = 0; localIndex < changeCount; localIndex++) { const changeIndex = inputStart + localIndex; const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (`${rowState.inputValues[0]}px`); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;}case 1: {if ((rowState.seenMask & 2) === 0) { rowState.seenMask |= 2; const next = (`${rowState.inputValues[1]}px`); const sinkState = rowState.sinks[1]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 1; stagedValues[stagedCount] = next; stagedCount++; } } break;}case 2: {if ((rowState.seenMask & 4) === 0) { rowState.seenMask |= 4; const next = (`rotate(${rowState.inputValues[2]}deg)`); const sinkState = rowState.sinks[2]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 2; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount - outputStart; } }];\n__nativeDefineComponent(\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Board\", Board, { propOnlySites: [], closedCollectionSites: [] });\n__nativeDefineComponent(\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe\", CandidateProbe, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row\", Row, { propOnlySites: [\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0\", \".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1\", \".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2\"], numericPrimitiveProps: [\"id\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row\", moduleRevision: \"native-v1-84202ab3936e9ccb\", slots: [{ siteId: \".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0\", slot: 0 }, { siteId: \".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1\", slot: 1 }, { siteId: \".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2\", slot: 2 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\nexport const rows = createKeyedCollection([{ id: \"a\" }, { id: \"b\" }], row => row.id);\nexport const trace = { controls: {}, candidateMutationKey: null, candidateMutations: 0 };\n\nexport function Row({ id }) {\n  const [x, setX] = __nativeUseStateAt(\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0\", 0);\n  const [y, setY] = __nativeUseStateAt(\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1\", 0);\n  const [rotation, setRotation] = __nativeUseStateAt(\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2\", 0);\n  __nativeUseEffectAt(\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#effect:0\", () => {\n    trace.controls[id] = { x: setX, y: setY, rotation: setRotation };\n    return () => {\n      if (trace.controls[id]?.x === setX) delete trace.controls[id];\n    };\n  });\n  return <i data-row={id} style={{\n    left: __nativeBindStatePropAt(\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0\", (x) => (`${x}px`), __nativeNumericPrograms[0]),\n    top: __nativeBindStatePropAt(\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1\", (y) => (`${y}px`), __nativeNumericPrograms[1]),\n    transform: __nativeBindStatePropAt(\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2\", (rotation) => (`rotate(${rotation}deg)`), __nativeNumericPrograms[2]),\n  }} />;\n}\n\nexport function CandidateProbe() {\n  const [value, setValue] = __nativeUseStateAt(\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe#state:0\", 0);\n  if (trace.candidateMutationKey !== null) {\n    trace.candidateMutations++;\n    setValue(999);\n  }\n  return <span data-candidate={__nativeBindStatePropAt(\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe#state:0\", (value) => (value), __nativeNumericPrograms[3])} />;\n}\n\nexport function Board() {\n  const children = __nativeRenderCollectionAt(\".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Board#collection:0\", rows, (row => <Row key={row.id} id={row.id} />), { requiresOwnerRender: true });\n  if (trace.candidateMutationKey !== null) {\n    return <ul>{children}<CandidateProbe key=\"candidate\" /></ul>;\n  }\n  return <ul>{children}</ul>;\n}",
	"components": [
		{
			"name": "Board",
			"component_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Board",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Board#collection:0",
				"source_expression": "rows",
				"row_parameter": "row",
				"requires_owner_render": true
			}],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "CandidateProbe",
			"component_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:971",
				"source_sites": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:CandidateProbe#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		},
		{
			"name": "Row",
			"component_site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
			"prop_only_sites": [
				".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0",
				".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1",
				".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2"
			],
			"numeric_primitive_props": ["id"],
			"state_layout": {
				"schema_version": 1,
				"programId": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row",
				"moduleRevision": "native-v1-84202ab3936e9ccb",
				"slots": [
					{
						"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0",
						"slot": 0
					},
					{
						"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1",
						"slot": 1
					},
					{
						"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2",
						"slot": 2
					}
				]
			},
			"host_leaf_output": true,
			"state_sites": [
				{
					"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0",
					"initial_value": "0"
				},
				{
					"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1",
					"initial_value": "0"
				},
				{
					"site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2",
					"initial_value": "0"
				}
			],
			"effect_sites": [{ "site_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [
				{
					"sink_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:682",
					"source_sites": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:0"],
					"primitive_value": true
				},
				{
					"sink_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:701",
					"source_sites": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:1"],
					"primitive_value": true
				},
				{
					"sink_id": ".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#numeric-sink:726",
					"source_sites": [".cache/numeric-state-layout/authored-layout-1792756300577-25288.tsx#component:Row#state:2"],
					"primitive_value": true
				}
			],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
