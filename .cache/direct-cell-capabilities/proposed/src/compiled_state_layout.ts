import type { NumericColumn } from "./jsx_binding_runtime.ts";

/** Compiler-certified numeric state slots for one component site. */
export type CompiledStateLayout = Readonly<{
  schemaVersion: 1;
  slots: readonly Readonly<{ siteId: string; slot: number }>[];
}>;

/** Stable World-owned column address for a committed numeric state cell. */
export type NumericLaneAddress = Readonly<{
  column: NumericColumn;
  row: number;
  generation: number;
  owner: number;
  site: string;
}>;

const normalizedLayouts = new WeakMap<object, CompiledStateLayout>();
const layoutSignatures = new WeakMap<object, string>();
const layoutSlotsBySite = new WeakMap<object, Map<string, number>>();

/** Validate and defensively snapshot metadata once per compiler-owned object. */
export function normalizeCompiledStateLayout(
  input: CompiledStateLayout,
): CompiledStateLayout {
  if (typeof input !== "object" || input === null) {
    throw new TypeError("Compiled state layout must be an object");
  }
  const cached = normalizedLayouts.get(input as object);
  if (cached) return cached;
  if (input.schemaVersion !== 1 || !Array.isArray(input.slots)) {
    throw new TypeError("Unsupported compiled state layout");
  }
  const sites = new Set<string>();
  const slots = input.slots.map((entry, index) => {
    if (
      !entry || typeof entry.siteId !== "string" || entry.siteId.length === 0 ||
      !Number.isSafeInteger(entry.slot) || entry.slot !== index ||
      sites.has(entry.siteId)
    ) {
      throw new TypeError("Invalid compiled state layout slot");
    }
    sites.add(entry.siteId);
    return Object.freeze({ siteId: entry.siteId, slot: entry.slot });
  });
  const normalized = Object.freeze({
    schemaVersion: 1 as const,
    slots: Object.freeze(slots),
  });
  normalizedLayouts.set(input as object, normalized);
  normalizedLayouts.set(normalized, normalized);
  layoutSignatures.set(
    normalized,
    slots.map(({ siteId, slot }) => `${slot}:${siteId}`).join("\u0000"),
  );
  return normalized;
}

export function compiledStateLayoutSignature(
  layout: CompiledStateLayout,
): string {
  const normalized = normalizeCompiledStateLayout(layout);
  let signature = layoutSignatures.get(normalized);
  if (signature === undefined) {
    signature = normalized.slots.map(({ siteId, slot }) => `${slot}:${siteId}`)
      .join("\u0000");
    layoutSignatures.set(normalized, signature);
  }
  return signature;
}

/** Resolve a hook slot once per immutable layout descriptor. */
export function compiledStateLayoutSlot(
  layout: CompiledStateLayout,
  siteId: string,
): number | undefined {
  const normalized = normalizeCompiledStateLayout(layout);
  let bySite = layoutSlotsBySite.get(normalized as object);
  if (!bySite) {
    bySite = new Map();
    for (const slot of normalized.slots) bySite.set(slot.siteId, slot.slot);
    layoutSlotsBySite.set(normalized as object, bySite);
  }
  return bySite.get(siteId);
}
