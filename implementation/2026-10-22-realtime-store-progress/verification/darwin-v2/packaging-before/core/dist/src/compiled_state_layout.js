const layoutRecords = new WeakMap();
const makeLayoutSignature = (programId, moduleRevision, slots) => JSON.stringify([
    programId ?? null,
    moduleRevision ?? null,
    slots.map(({ siteId, slot }) => [siteId, slot]),
]);
function recordForLayout(input) {
    if (typeof input !== "object" || input === null) {
        throw new TypeError("Compiled state layout must be an object");
    }
    const cached = layoutRecords.get(input);
    if (cached)
        return cached;
    if (input.schemaVersion !== 1 || !Array.isArray(input.slots)) {
        throw new TypeError("Unsupported compiled state layout");
    }
    if (input.programId !== undefined &&
        (typeof input.programId !== "string" || input.programId.length === 0)) {
        throw new TypeError("Invalid compiled state layout program ID");
    }
    if (input.moduleRevision !== undefined &&
        (typeof input.moduleRevision !== "string" || !input.moduleRevision)) {
        throw new TypeError("Invalid compiled state layout module revision");
    }
    const sites = new Set();
    const slots = input.slots.map((entry, index) => {
        if (!entry || typeof entry.siteId !== "string" || entry.siteId.length === 0 ||
            !Number.isSafeInteger(entry.slot) || entry.slot !== index ||
            sites.has(entry.siteId)) {
            throw new TypeError("Invalid compiled state layout slot");
        }
        sites.add(entry.siteId);
        return Object.freeze({ siteId: entry.siteId, slot: entry.slot });
    });
    const normalized = Object.freeze({
        schemaVersion: 1,
        ...(input.programId !== undefined ? { programId: input.programId } : {}),
        ...(input.moduleRevision !== undefined ? { moduleRevision: input.moduleRevision } : {}),
        slots: Object.freeze(slots),
    });
    const record = {
        layout: normalized,
        signature: makeLayoutSignature(input.programId, input.moduleRevision, slots),
    };
    layoutRecords.set(input, record);
    layoutRecords.set(normalized, record);
    return record;
}
/** Validate and defensively snapshot metadata once per compiler-owned object. */
export function normalizeCompiledStateLayout(input) {
    return recordForLayout(input).layout;
}
export function compiledStateLayoutSignature(layout) {
    return recordForLayout(layout).signature;
}
/** Resolve a hook slot once per immutable layout descriptor. */
export function compiledStateLayoutSlot(layout, siteId) {
    const record = recordForLayout(layout);
    let bySite = record.slotsBySite;
    if (!bySite) {
        bySite = new Map();
        for (const slot of record.layout.slots)
            bySite.set(slot.siteId, slot.slot);
        record.slotsBySite = bySite;
    }
    return bySite.get(siteId);
}
/** Validate and associate one immutable owner update program with a layout. */
export function associateCompiledOwnerUpdateProgram(layout, input) {
    const record = recordForLayout(layout);
    if (typeof input !== "object" || input === null) {
        throw new TypeError("Compiled owner update program must be an object");
    }
    const schemaVersion = input.schemaVersion;
    const programId = input.programId;
    const slotCount = input.slotCount;
    const inputSinkIds = input.sinkIds;
    const executeCut = input.executeCut;
    if ((schemaVersion !== 2 && schemaVersion !== 3 &&
        schemaVersion !== 4 && schemaVersion !== 5) ||
        typeof programId !== "string" || !programId ||
        record.layout.programId !== programId ||
        !Number.isSafeInteger(slotCount) || slotCount !== record.layout.slots.length ||
        slotCount < 1 || slotCount > 30 || !Array.isArray(inputSinkIds) ||
        inputSinkIds.length < 1 || inputSinkIds.length > 30 ||
        typeof executeCut !== "function") {
        throw new TypeError("Invalid compiled owner update program");
    }
    const seen = new Set();
    const sinkIds = [];
    for (let index = 0; index < inputSinkIds.length; index++) {
        const sinkId = inputSinkIds[index];
        if (typeof sinkId !== "string" || !sinkId || seen.has(sinkId)) {
            throw new TypeError("Invalid compiled owner update sink ID");
        }
        seen.add(sinkId);
        sinkIds.push(sinkId);
    }
    const current = record.ownerUpdateProgram;
    if (current) {
        if (current.schemaVersion !== schemaVersion ||
            current.programId !== programId || current.slotCount !== slotCount ||
            current.executeCut !== executeCut ||
            current.sinkIds.length !== sinkIds.length ||
            current.sinkIds.some((sinkId, index) => sinkId !== sinkIds[index])) {
            throw new TypeError("Conflicting compiled owner update program");
        }
        return current;
    }
    const snapshot = Object.freeze({
        schemaVersion,
        programId,
        slotCount,
        sinkIds: Object.freeze(sinkIds),
        executeCut,
    });
    record.ownerUpdateProgram = snapshot;
    return snapshot;
}
/** Resolve a program during VDOM row preparation, not during cut execution. */
export function compiledOwnerUpdateProgramFor(layout) {
    return recordForLayout(layout).ownerUpdateProgram;
}
//# sourceMappingURL=compiled_state_layout.js.map