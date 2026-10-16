import { createDOMRoot } from "../../../../src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, bindStatePropAt as __nativeBindStatePropAt } from "../../../../src/native_runtime_api.ts";
const __nativeNumericPrograms = [
	{
		schemaVersion: 2,
		ownerProgramId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA",
		sinkId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1229",
		sourceSites: [".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA",
		sinkId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1244",
		sourceSites: [".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA",
		sinkId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1265",
		sourceSites: [".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB",
		sinkId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1896",
		sourceSites: [".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB",
		sinkId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1911",
		sourceSites: [".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB",
		sinkId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1932",
		sourceSites: [".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0"]
	}
];
const __nativeOwnerCutKernels = [{
	schemaVersion: 2,
	programId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA",
	slotCount: 3,
	sinkIds: [
		".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1229",
		".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1244",
		".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1265"
	],
	executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) {
		let stagedCount = 0;
		for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) {
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
		return stagedCount;
	}
}, {
	schemaVersion: 2,
	programId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB",
	slotCount: 3,
	sinkIds: [
		".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1896",
		".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1911",
		".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1932"
	],
	executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) {
		let stagedCount = 0;
		for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) {
			const rowState = rowStates[changeIndex];
			switch (changedSlots[changeIndex]) {
				case 0: {
					if ((rowState.seenMask & 4) === 0) {
						rowState.seenMask |= 4;
						const next = `rotate(${rowState.inputValues[0]}deg)`;
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
				case 1: {
					if ((rowState.seenMask & 1) === 0) {
						rowState.seenMask |= 1;
						const next = `${rowState.inputValues[1]}px`;
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
				case 2: {
					if ((rowState.seenMask & 2) === 0) {
						rowState.seenMask |= 2;
						const next = `${rowState.inputValues[2]}px`;
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
__nativeDefineComponent(".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeBoard", NativeBoard, { propOnlySites: [] });
__nativeDefineComponent(".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA", NativeRowA, {
	propOnlySites: [
		".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0",
		".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1",
		".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2"
	],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA",
		slots: [
			{
				siteId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0",
				slot: 0
			},
			{
				siteId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1",
				slot: 1
			},
			{
				siteId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2",
				slot: 2
			}
		]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
__nativeDefineComponent(".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB", NativeRowB, {
	propOnlySites: [
		".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0",
		".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1",
		".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2"
	],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB",
		slots: [
			{
				siteId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0",
				slot: 0
			},
			{
				siteId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1",
				slot: 1
			},
			{
				siteId: ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2",
				slot: 2
			}
		]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[1]
});
import { highFrequencyState } from "./high_frequency_contract";
function NativeRowA({ id, session }) {
	const [x, setX] = __nativeUseStateAt(".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0", 0);
	const [y, setY] = __nativeUseStateAt(".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1", 0);
	const [rotation, setRotation] = __nativeUseStateAt(".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2", 0);
	__nativeUseEffectAt(".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#effect:0", () => {
		const setter = (frame) => {
			const state = highFrequencyState(id, frame);
			setX(state.x);
			setY(state.y);
			setRotation(state.rotation);
		};
		session.registerSetter(id, setter);
		session.registerMount();
		return () => {
			session.removeSetter(id, setter);
			session.registerCleanup();
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("i", {
		className: "row",
		"data-row-id": id,
		style: {
			left: __nativeBindStatePropAt(".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0", (x) => `${x}px`, __nativeNumericPrograms[0]),
			top: __nativeBindStatePropAt(".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1", (y) => `${y}px`, __nativeNumericPrograms[1]),
			transform: __nativeBindStatePropAt(".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2", (rotation) => `rotate(${rotation}deg)`, __nativeNumericPrograms[2])
		}
	});
}
function NativeRowB({ id, session }) {
	const [rotation, setRotation] = __nativeUseStateAt(".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0", 0);
	const [x, setX] = __nativeUseStateAt(".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1", 0);
	const [y, setY] = __nativeUseStateAt(".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2", 0);
	__nativeUseEffectAt(".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#effect:0", () => {
		const setter = (frame) => {
			const state = highFrequencyState(id, frame);
			setX(state.x);
			setY(state.y);
			setRotation(state.rotation);
		};
		session.registerSetter(id, setter);
		session.registerMount();
		return () => {
			session.removeSetter(id, setter);
			session.registerCleanup();
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("i", {
		className: "row",
		"data-row-id": id,
		style: {
			left: __nativeBindStatePropAt(".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1", (x) => `${x}px`, __nativeNumericPrograms[3]),
			top: __nativeBindStatePropAt(".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2", (y) => `${y}px`, __nativeNumericPrograms[4]),
			transform: __nativeBindStatePropAt(".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0", (rotation) => `rotate(${rotation}deg)`, __nativeNumericPrograms[5])
		}
	});
}
function NativeBoard({ ids, session, programs }) {
	return /* @__PURE__ */ __nativeJsx.jsx("div", { className: "board" }, ids.map((id) => programs === "heterogeneous" && id % 2 === 1 ? /* @__PURE__ */ __nativeJsx.jsx(NativeRowB, {
		key: id,
		id,
		session
	}) : /* @__PURE__ */ __nativeJsx.jsx(NativeRowA, {
		key: id,
		id,
		session
	})));
}
export const createHighFrequencyNative = (container, ids, programs) => {
	let mounts = 0;
	let cleanups = 0;
	const setters = new Map();
	const session = {
		setters,
		registerSetter(id, setter) {
			setters.set(id, setter);
		},
		removeSetter(id, setter) {
			if (setters.get(id) === setter) setters.delete(id);
		},
		registerMount() {
			mounts++;
		},
		registerCleanup() {
			cleanups++;
		}
	};
	let root = createDOMRoot(container, { scheduleCommit: () => {} });
	let disposed = false;
	let staleSetters = [];
	const diagnostics = () => ({
		mounts,
		cleanups,
		writers: session.setters.size
	});
	const controller = {
		mount() {
			if (disposed || !root) throw new Error("Cannot mount a disposed native arm");
			root.mount(/* @__PURE__ */ __nativeJsx.jsx(NativeBoard, {
				ids,
				session,
				programs
			}));
			root.flush();
			for (const setter of session.setters.values()) setter(0);
			root.flush();
		},
		step(frame, dirtyIds) {
			if (disposed || !root) throw new Error("Cannot step a disposed native arm");
			const ledger = globalThis.__denseLedger;
			ledger?.mark("native.dispatch.start");
			ledger?.count("native.setter.calls", dirtyIds.length);
			for (const id of dirtyIds) {
				const setter = session.setters.get(id);
				if (!setter) throw new Error(`Missing native row setter ${id}`);
				setter(frame);
			}
			ledger?.mark("native.dispatch.end");
			ledger?.mark("native.flush.start");
			root.flush();
			ledger?.mark("native.flush.end");
		},
		diagnostics,
		dispose() {
			if (disposed) return;
			disposed = true;
			staleSetters = [...session.setters.values()];
			root?.dispose();
			root = null;
		},
		probeDeadSetters(frame) {
			let thrown = 0;
			for (const setter of staleSetters) {
				try {
					setter(frame);
				} catch {
					thrown++;
				}
			}
			return thrown;
		}
	};
	return controller;
};
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import {\n  createDOMRoot,\n  useEffect,\n  useState,\n} from \"../../../../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../../../../src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA\", sinkId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1229\", sourceSites: [\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0\"] }, { schemaVersion: 2, ownerProgramId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA\", sinkId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1244\", sourceSites: [\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1\"] }, { schemaVersion: 2, ownerProgramId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA\", sinkId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1265\", sourceSites: [\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2\"] }, { schemaVersion: 2, ownerProgramId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB\", sinkId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1896\", sourceSites: [\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1\"] }, { schemaVersion: 2, ownerProgramId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB\", sinkId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1911\", sourceSites: [\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2\"] }, { schemaVersion: 2, ownerProgramId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB\", sinkId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1932\", sourceSites: [\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"../../../../src/native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 2, programId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA\", slotCount: 3, sinkIds: [\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1229\", \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1244\", \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1265\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (`${rowState.inputValues[0]}px`); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;}case 1: {if ((rowState.seenMask & 2) === 0) { rowState.seenMask |= 2; const next = (`${rowState.inputValues[1]}px`); const sinkState = rowState.sinks[1]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 1; stagedValues[stagedCount] = next; stagedCount++; } } break;}case 2: {if ((rowState.seenMask & 4) === 0) { rowState.seenMask |= 4; const next = (`rotate(${rowState.inputValues[2]}deg)`); const sinkState = rowState.sinks[2]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 2; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }, { schemaVersion: 2, programId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB\", slotCount: 3, sinkIds: [\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1896\", \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1911\", \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#numeric-sink:1932\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 4) === 0) { rowState.seenMask |= 4; const next = (`rotate(${rowState.inputValues[0]}deg)`); const sinkState = rowState.sinks[2]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 2; stagedValues[stagedCount] = next; stagedCount++; } } break;}case 1: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (`${rowState.inputValues[1]}px`); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;}case 2: {if ((rowState.seenMask & 2) === 0) { rowState.seenMask |= 2; const next = (`${rowState.inputValues[2]}px`); const sinkState = rowState.sinks[1]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 1; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\n__nativeDefineComponent(\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeBoard\", NativeBoard, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA\", NativeRowA, { propOnlySites: [\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0\", \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1\", \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA\", slots: [{ siteId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0\", slot: 0 }, { siteId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1\", slot: 1 }, { siteId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2\", slot: 2 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\n__nativeDefineComponent(\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB\", NativeRowB, { propOnlySites: [\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0\", \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1\", \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB\", slots: [{ siteId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0\", slot: 0 }, { siteId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1\", slot: 1 }, { siteId: \".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2\", slot: 2 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[1] });\nimport type {\n  HighFrequencyController,\n  HighFrequencyDiagnostics,\n  HighFrequencyFactory,\n  ProgramMix,\n} from \"./high_frequency_contract\";\nimport { highFrequencyState } from \"./high_frequency_contract\";\n\ntype FrameSetter = (frame: number) => void;\ntype Session = {\n  readonly setters: Map<number, FrameSetter>;\n  registerSetter(id: number, setter: FrameSetter): void;\n  removeSetter(id: number, setter: FrameSetter): void;\n  registerMount(): void;\n  registerCleanup(): void;\n};\n\ntype RowProps = { id: number; session: Session };\n\nfunction NativeRowA({ id, session }: RowProps) {\n  const [x, setX] = __nativeUseStateAt(\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0\", 0);\n  const [y, setY] = __nativeUseStateAt(\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1\", 0);\n  const [rotation, setRotation] = __nativeUseStateAt(\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2\", 0);\n  __nativeUseEffectAt(\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#effect:0\", () => {\n    const setter: FrameSetter = (frame) => {\n      const state = highFrequencyState(id, frame);\n      setX(state.x);\n      setY(state.y);\n      setRotation(state.rotation);\n    };\n    session.registerSetter(id, setter);\n    session.registerMount();\n    return () => {\n      session.removeSetter(id, setter);\n      session.registerCleanup();\n    };\n  });\n  return <i className=\"row\" data-row-id={id} style={{ left: __nativeBindStatePropAt(\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0\", (x) => (`${x}px`), __nativeNumericPrograms[0]), top: __nativeBindStatePropAt(\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1\", (y) => (`${y}px`), __nativeNumericPrograms[1]), transform: __nativeBindStatePropAt(\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2\", (rotation) => (`rotate(${rotation}deg)`), __nativeNumericPrograms[2]) }} />;\n}\n\nfunction NativeRowB({ id, session }: RowProps) {\n  const [rotation, setRotation] = __nativeUseStateAt(\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0\", 0);\n  const [x, setX] = __nativeUseStateAt(\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1\", 0);\n  const [y, setY] = __nativeUseStateAt(\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2\", 0);\n  __nativeUseEffectAt(\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#effect:0\", () => {\n    const setter: FrameSetter = (frame) => {\n      const state = highFrequencyState(id, frame);\n      setX(state.x);\n      setY(state.y);\n      setRotation(state.rotation);\n    };\n    session.registerSetter(id, setter);\n    session.registerMount();\n    return () => {\n      session.removeSetter(id, setter);\n      session.registerCleanup();\n    };\n  });\n  return <i className=\"row\" data-row-id={id} style={{ left: __nativeBindStatePropAt(\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1\", (x) => (`${x}px`), __nativeNumericPrograms[3]), top: __nativeBindStatePropAt(\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2\", (y) => (`${y}px`), __nativeNumericPrograms[4]), transform: __nativeBindStatePropAt(\".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0\", (rotation) => (`rotate(${rotation}deg)`), __nativeNumericPrograms[5]) }} />;\n}\n\nfunction NativeBoard({ ids, session, programs }: { ids: readonly number[]; session: Session; programs: ProgramMix }) {\n  return (\n    <div className=\"board\">\n      {ids.map((id) => programs === \"heterogeneous\" && id % 2 === 1\n        ? <NativeRowB key={id} id={id} session={session} />\n        : <NativeRowA key={id} id={id} session={session} />)}\n    </div>\n  );\n}\n\nexport const createHighFrequencyNative: HighFrequencyFactory = (\n  container,\n  ids,\n  programs,\n) => {\n  let mounts = 0;\n  let cleanups = 0;\n  const setters = new Map<number, FrameSetter>();\n  const session: Session = {\n    setters,\n    registerSetter(id, setter) { setters.set(id, setter); },\n    removeSetter(id, setter) { if (setters.get(id) === setter) setters.delete(id); },\n    registerMount() { mounts++; },\n    registerCleanup() { cleanups++; },\n  };\n  let root: ReturnType<typeof createDOMRoot> | null = createDOMRoot(container, {\n    scheduleCommit: () => {},\n  });\n  let disposed = false;\n  let staleSetters: FrameSetter[] = [];\n  const diagnostics = (): HighFrequencyDiagnostics => ({\n    mounts,\n    cleanups,\n    writers: session.setters.size,\n  });\n  const controller: HighFrequencyController = {\n    mount() {\n      if (disposed || !root) throw new Error(\"Cannot mount a disposed native arm\");\n      root.mount(<NativeBoard ids={ids} session={session} programs={programs} />);\n      root.flush();\n      for (const setter of session.setters.values()) setter(0);\n      root.flush();\n    },\n    step(frame, dirtyIds) {\n      if (disposed || !root) throw new Error(\"Cannot step a disposed native arm\");\n      const ledger = (globalThis as typeof globalThis & {__denseLedger?: {mark(s:string):void;count(s:string,n?:number):void}}).__denseLedger;\n      ledger?.mark(\"native.dispatch.start\");\n      ledger?.count(\"native.setter.calls\", dirtyIds.length);\n      for (const id of dirtyIds) {\n        const setter = session.setters.get(id);\n        if (!setter) throw new Error(`Missing native row setter ${id}`);\n        setter(frame);\n      }\n      ledger?.mark(\"native.dispatch.end\");\n      ledger?.mark(\"native.flush.start\");\n      root.flush();\n      ledger?.mark(\"native.flush.end\");\n    },\n    diagnostics,\n    dispose() {\n      if (disposed) return;\n      disposed = true;\n      staleSetters = [...session.setters.values()];\n      root?.dispose();\n      root = null;\n    },\n    probeDeadSetters(frame) {\n      let thrown = 0;\n      for (const setter of staleSetters) {\n        try {\n          setter(frame);\n        } catch {\n          thrown++;\n        }\n      }\n      return thrown;\n    },\n  };\n  return controller;\n};\n",
	"components": [
		{
			"name": "NativeBoard",
			"component_site_id": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeBoard",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "NativeRowA",
			"component_site_id": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA",
			"prop_only_sites": [
				".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0",
				".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1",
				".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2"
			],
			"state_layout": {
				"schema_version": 1,
				"programId": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA",
				"slots": [
					{
						"site_id": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0",
						"slot": 0
					},
					{
						"site_id": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1",
						"slot": 1
					},
					{
						"site_id": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2",
						"slot": 2
					}
				]
			},
			"host_leaf_output": true,
			"state_sites": [
				{
					"site_id": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0",
					"initial_value": "0"
				},
				{
					"site_id": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1",
					"initial_value": "0"
				},
				{
					"site_id": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2",
					"initial_value": "0"
				}
			],
			"effect_sites": [{ "site_id": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowA#effect:0" }],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "NativeRowB",
			"component_site_id": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB",
			"prop_only_sites": [
				".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0",
				".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1",
				".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2"
			],
			"state_layout": {
				"schema_version": 1,
				"programId": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB",
				"slots": [
					{
						"site_id": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0",
						"slot": 0
					},
					{
						"site_id": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1",
						"slot": 1
					},
					{
						"site_id": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2",
						"slot": 2
					}
				]
			},
			"host_leaf_output": true,
			"state_sites": [
				{
					"site_id": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0",
					"initial_value": "0"
				},
				{
					"site_id": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1",
					"initial_value": "0"
				},
				{
					"site_id": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2",
					"initial_value": "0"
				}
			],
			"effect_sites": [{ "site_id": ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx#component:NativeRowB#effect:0" }],
			"store_sites": [],
			"collection_sites": []
		}
	]
};
import * as __nativeJsx from "../../../../src/native_runtime_api.ts";
