import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/compiled-owner-kernel-root-proof-v2/src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: ".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row",
	sinkId: ".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#numeric-sink:406",
	sourceSites: [".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row#state:0"]
}, {
	schemaVersion: 2,
	ownerProgramId: ".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row",
	sinkId: ".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#numeric-sink:432",
	sourceSites: [".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row#state:0"]
}];
const __nativeOwnerCutKernels = [{
	schemaVersion: 2,
	programId: ".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row",
	slotCount: 1,
	sinkIds: [".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#numeric-sink:406", ".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#numeric-sink:432"],
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
						const next = `${rowState.inputValues[0] % 2}px`;
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
__nativeDefineComponent(".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row", Row, {
	propOnlySites: [".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row#state:0"],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: ".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row",
		slots: [{
			siteId: ".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
export const trace = {
	renders: {
		a: 0,
		b: 0
	},
	setters: {
		a: null,
		b: null
	}
};
function Row({ id }) {
	trace.renders[id]++;
	const [value, setValue] = __nativeUseStateAt(".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row#state:0", 1);
	trace.setters[id] = setValue;
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		"data-parity": __nativeBindStatePropAt(".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row#state:0", (value) => value % 2, __nativeNumericPrograms[0]),
		style: { left: __nativeBindStatePropAt(".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row#state:0", (value) => `${value % 2}px`, __nativeNumericPrograms[1]) }
	});
}
export function App() {
	return /* @__PURE__ */ __nativeJsx.jsx("main", null, /* @__PURE__ */ __nativeJsx.jsx(Row, { id: "a" }), /* @__PURE__ */ __nativeJsx.jsx(Row, { id: "b" }));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { useState } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/compiled-owner-kernel-root-proof-v2/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/compiled-owner-kernel-root-proof-v2/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row\", sinkId: \".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#numeric-sink:406\", sourceSites: [\".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row#state:0\"] }, { schemaVersion: 2, ownerProgramId: \".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row\", sinkId: \".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#numeric-sink:432\", sourceSites: [\".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/compiled-owner-kernel-root-proof-v2/src/native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 2, programId: \".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row\", slotCount: 1, sinkIds: [\".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#numeric-sink:406\", \".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#numeric-sink:432\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0] % 2); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } }if ((rowState.seenMask & 2) === 0) { rowState.seenMask |= 2; const next = (`${rowState.inputValues[0] % 2}px`); const sinkState = rowState.sinks[1]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 1; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\n__nativeDefineComponent(\".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row\", Row, { propOnlySites: [\".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row#state:0\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row\", slots: [{ siteId: \".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\nexport const trace = { renders: { a: 0, b: 0 }, setters: { a: null, b: null } };\nfunction Row({ id }) {\n  trace.renders[id]++;\n  const [value, setValue] = __nativeUseStateAt(\".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row#state:0\", 1);\n  trace.setters[id] = setValue;\n  return <output data-parity={__nativeBindStatePropAt(\".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row#state:0\", (value) => (value % 2), __nativeNumericPrograms[0])} style={{ left: __nativeBindStatePropAt(\".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row#state:0\", (value) => (`${value % 2}px`), __nativeNumericPrograms[1]) }} />;\n}\nexport function App() {\n  return <main><Row id=\"a\" /><Row id=\"b\" /></main>;\n}",
	"components": [{
		"name": "App",
		"component_site_id": ".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:App",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": []
	}, {
		"name": "Row",
		"component_site_id": ".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row",
		"prop_only_sites": [".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row#state:0"],
		"state_layout": {
			"schema_version": 1,
			"programId": ".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row",
			"slots": [{
				"site_id": ".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row#state:0",
				"slot": 0
			}]
		},
		"host_leaf_output": true,
		"state_sites": [{
			"site_id": ".cache/compiled-owner-kernel-root-proof-v2/proof/results/authored-1791924045407-88846-796c2c3d-556e-42bc-8b5e-1cef71b3e771.tsx#component:Row#state:0",
			"initial_value": "1"
		}],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": []
	}]
};
import * as __nativeJsx from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/compiled-owner-kernel-root-proof-v2/src/native_runtime_api.ts";
