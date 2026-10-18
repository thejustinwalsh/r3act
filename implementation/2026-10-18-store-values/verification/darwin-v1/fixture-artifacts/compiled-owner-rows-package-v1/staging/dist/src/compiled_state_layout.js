const normalizedLayouts = new WeakMap();
const layoutSignatures = new WeakMap();
const layoutSlotsBySite = new WeakMap();
const makeLayoutSignature = (programId, slots) => JSON.stringify([
    programId ?? null,
    slots.map(({ siteId, slot }) => [siteId, slot]),
]);
/** Validate and defensively snapshot metadata once per compiler-owned object. */
export function normalizeCompiledStateLayout(input) {
    if (typeof input !== "object" || input === null) {
        throw new TypeError("Compiled state layout must be an object");
    }
    const cached = normalizedLayouts.get(input);
    if (cached)
        return cached;
    if (input.schemaVersion !== 1 || !Array.isArray(input.slots)) {
        throw new TypeError("Unsupported compiled state layout");
    }
    if (input.programId !== undefined &&
        (typeof input.programId !== "string" || input.programId.length === 0)) {
        throw new TypeError("Invalid compiled state layout program ID");
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
        slots: Object.freeze(slots),
    });
    normalizedLayouts.set(input, normalized);
    normalizedLayouts.set(normalized, normalized);
    layoutSignatures.set(normalized, makeLayoutSignature(input.programId, slots));
    return normalized;
}
export function compiledStateLayoutSignature(layout) {
    const normalized = normalizeCompiledStateLayout(layout);
    let signature = layoutSignatures.get(normalized);
    if (signature === undefined) {
        signature = makeLayoutSignature(normalized.programId, normalized.slots);
        layoutSignatures.set(normalized, signature);
    }
    return signature;
}
/** Resolve a hook slot once per immutable layout descriptor. */
export function compiledStateLayoutSlot(layout, siteId) {
    const normalized = normalizeCompiledStateLayout(layout);
    let bySite = layoutSlotsBySite.get(normalized);
    if (!bySite) {
        bySite = new Map();
        for (const slot of normalized.slots)
            bySite.set(slot.siteId, slot.slot);
        layoutSlotsBySite.set(normalized, bySite);
    }
    return bySite.get(siteId);
}
//# sourceMappingURL=compiled_state_layout.js.map