import type { CompiledOwnerUpdateProgram } from "../src/compiled_state_layout.ts";
const __nativeOwnerCutKernels = [{
	schemaVersion: 1,
	programId: ".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922877837-52118-44c49d4e-017c-48fd-9567-4016d8985c35.tsx#component:Row",
	slotCount: 1,
	sinkIds: [".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922877837-52118-44c49d4e-017c-48fd-9567-4016d8985c35.tsx#numeric-sink:372", ".cache/compiled-owner-metadata-bridge-stage/proof/results/authored-1791922877837-52118-44c49d4e-017c-48fd-9567-4016d8985c35.tsx#numeric-sink:394"],
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
