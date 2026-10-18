import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/compiled-owner-metadata-bridge-stage/src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: ".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row",
	sinkId: ".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#numeric-sink:372",
	sourceSites: [".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row#state:0"]
}, {
	schemaVersion: 2,
	ownerProgramId: ".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row",
	sinkId: ".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#numeric-sink:394",
	sourceSites: [".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row#state:0"]
}];
const __nativeOwnerCutKernels = [{
	schemaVersion: 1,
	programId: ".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row",
	slotCount: 1,
	sinkIds: [".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#numeric-sink:372", ".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#numeric-sink:394"],
	executeCut: function(changedRows, changedSlots, changeCount, rowStates, stagedRows, stagedSinkIds, stagedValues) {
		let stagedCount = 0;
		for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) {
			const rowIndex = changedRows[changeIndex];
			const rowState = rowStates[rowIndex];
			switch (changedSlots[changeIndex]) {
				case 0: {
					if ((rowState.seenMask & 1) === 0) {
						rowState.seenMask |= 1;
						const next = rowState.inputValues[0];
						const sinkState = rowState.sinks[0];
						const last = sinkState.lastValue;
						const same = last === next ? last !== 0 || 1 / last === 1 / next : last !== last && next !== next;
						if (!same) {
							stagedRows[stagedCount] = rowIndex;
							stagedSinkIds[stagedCount] = 0;
							stagedValues[stagedCount] = next;
							stagedCount++;
						}
					}
					if ((rowState.seenMask & 2) === 0) {
						rowState.seenMask |= 2;
						const next = `${rowState.inputValues[0]}px`;
						const sinkState = rowState.sinks[1];
						const last = sinkState.lastValue;
						const same = last === next ? last !== 0 || 1 / last === 1 / next : last !== last && next !== next;
						if (!same) {
							stagedRows[stagedCount] = rowIndex;
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
__nativeDefineComponent(".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row", Row, {
	propOnlySites: [".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row#state:0"],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: ".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row",
		slots: [{
			siteId: ".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
export const trace = {
	renders: 0,
	setValue: null
};
export function Row() {
	trace.renders++;
	const [value, setValue] = __nativeUseStateAt(".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row#state:0", 1);
	trace.setValue = setValue;
	return /* @__PURE__ */ __nativeJsx.jsx("button", {
		"data-value": __nativeBindStatePropAt(".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row#state:0", (value) => value, __nativeNumericPrograms[0]),
		style: { left: __nativeBindStatePropAt(".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row#state:0", (value) => `${value}px`, __nativeNumericPrograms[1]) }
	});
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { useState } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/compiled-owner-metadata-bridge-stage/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/compiled-owner-metadata-bridge-stage/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row\", sinkId: \".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#numeric-sink:372\", sourceSites: [\".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row#state:0\"] }, { schemaVersion: 2, ownerProgramId: \".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row\", sinkId: \".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#numeric-sink:394\", sourceSites: [\".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row#state:0\"] }] as const;\nconst __nativeOwnerCutKernels = [{ schemaVersion: 1, programId: \".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row\", slotCount: 1, sinkIds: [\".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#numeric-sink:372\", \".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#numeric-sink:394\"], executeCut: function(changedRows, changedSlots, changeCount, rowStates, stagedRows, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowIndex = changedRows[changeIndex]; const rowState = rowStates[rowIndex]; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (last !== 0 || 1 / last === 1 / next) : (last !== last && next !== next); if (!same) { stagedRows[stagedCount] = rowIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } }if ((rowState.seenMask & 2) === 0) { rowState.seenMask |= 2; const next = (`${rowState.inputValues[0]}px`); const sinkState = rowState.sinks[1]; const last = sinkState.lastValue; const same = last === next ? (last !== 0 || 1 / last === 1 / next) : (last !== last && next !== next); if (!same) { stagedRows[stagedCount] = rowIndex; stagedSinkIds[stagedCount] = 1; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\n__nativeDefineComponent(\".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row\", Row, { propOnlySites: [\".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row#state:0\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row\", slots: [{ siteId: \".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\nexport const trace = { renders: 0, setValue: null };\nexport function Row() {\n  trace.renders++;\n  const [value, setValue] = __nativeUseStateAt(\".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row#state:0\", 1);\n  trace.setValue = setValue;\n  return <button data-value={__nativeBindStatePropAt(\".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row#state:0\", (value) => (value), __nativeNumericPrograms[0])} style={{ left: __nativeBindStatePropAt(\".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row#state:0\", (value) => (`${value}px`), __nativeNumericPrograms[1]) }} />;\n}",
	"components": [{
		"name": "Row",
		"component_site_id": ".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row",
		"prop_only_sites": [".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row#state:0"],
		"state_layout": {
			"schema_version": 1,
			"programId": ".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row",
			"slots": [{
				"site_id": ".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row#state:0",
				"slot": 0
			}]
		},
		"host_leaf_output": true,
		"state_sites": [{
			"site_id": ".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922847492-51191-2403387f-49f4-4129-9f97-6ff4295949f8.tsx#component:Row#state:0",
			"initial_value": "1"
		}],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": []
	}]
};
import * as __nativeJsx from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/compiled-owner-metadata-bridge-stage/src/native_runtime_api.ts";
