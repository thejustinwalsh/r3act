import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: ".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow",
	sinkId: ".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#numeric-sink:359",
	sourceSites: [".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow#state:0"]
}, {
	schemaVersion: 2,
	ownerProgramId: ".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow",
	sinkId: ".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#numeric-sink:379",
	sourceSites: [".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow#state:0"]
}];
const __nativeOwnerCutKernels = [{
	schemaVersion: 2,
	programId: ".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow",
	slotCount: 1,
	sinkIds: [".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#numeric-sink:359", ".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#numeric-sink:379"],
	executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) {
		let stagedCount = 0;
		for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) {
			const rowState = rowStates[changeIndex];
			switch (changedSlots[changeIndex]) {
				case 0: {
					if ((rowState.seenMask & 1) === 0) {
						rowState.seenMask |= 1;
						const next = rowState.inputValues[0] % 2;
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
						const next = rowState.inputValues[0] % 2 + 10;
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
__nativeDefineComponent(".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow", DerivedRow, {
	propOnlySites: [".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow#state:0"],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: ".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow",
		slots: [{
			siteId: ".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
export function DerivedRow() {
	const [value] = __nativeUseStateAt(".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow#state:0", 4);
	const parity = value % 2;
	const label = parity + 10;
	return /* @__PURE__ */ __nativeJsx.jsx("div", {
		"data-parity": __nativeBindStatePropAt(".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow#state:0", (value) => value % 2, __nativeNumericPrograms[0]),
		"data-label": __nativeBindStatePropAt(".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow#state:0", (value) => value % 2 + 10, __nativeNumericPrograms[1]),
		"data-tail": "sentinel"
	});
}
export const untouchedTail = "tail-after-component";
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "// 🧭 UTF-8 prefix; Rust byte offsets must map to JavaScript UTF-16 columns.\nimport { useState } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow\", sinkId: \".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#numeric-sink:359\", sourceSites: [\".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow#state:0\"] }, { schemaVersion: 2, ownerProgramId: \".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow\", sinkId: \".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#numeric-sink:379\", sourceSites: [\".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 2, programId: \".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow\", slotCount: 1, sinkIds: [\".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#numeric-sink:359\", \".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#numeric-sink:379\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = ((rowState.inputValues[0] % 2)); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } }if ((rowState.seenMask & 2) === 0) { rowState.seenMask |= 2; const next = (((rowState.inputValues[0] % 2) + 10)); const sinkState = rowState.sinks[1]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 1; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\n__nativeDefineComponent(\".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow\", DerivedRow, { propOnlySites: [\".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow#state:0\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow\", slots: [{ siteId: \".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\n\nexport function DerivedRow() {\n  const [value] = __nativeUseStateAt(\".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow#state:0\", 4);\n  const parity = value % 2;\n  const label = parity + 10;\n  return <div data-parity={__nativeBindStatePropAt(\".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow#state:0\", (value) => ((value % 2)), __nativeNumericPrograms[0])} data-label={__nativeBindStatePropAt(\".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow#state:0\", (value) => (((value % 2) + 10)), __nativeNumericPrograms[1])} data-tail=\"sentinel\" />;\n}\n\nexport const untouchedTail = \"tail-after-component\";\n",
	"components": [{
		"name": "DerivedRow",
		"component_site_id": ".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow",
		"prop_only_sites": [".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow#state:0"],
		"state_layout": {
			"schema_version": 1,
			"programId": ".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow",
			"slots": [{
				"site_id": ".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow#state:0",
				"slot": 0
			}]
		},
		"host_leaf_output": true,
		"state_sites": [{
			"site_id": ".cache/derived-local-sourcemap-stage/derived-local-source-map.tsx#component:DerivedRow#state:0",
			"initial_value": "4"
		}],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": []
	}]
};
import * as __nativeJsx from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
