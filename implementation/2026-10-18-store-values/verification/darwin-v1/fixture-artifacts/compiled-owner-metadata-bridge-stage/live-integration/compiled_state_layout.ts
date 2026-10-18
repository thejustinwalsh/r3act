import type { NumericColumn } from "./jsx_binding_runtime.ts";

/** Compiler-certified numeric state slots for one component site. */
export type CompiledStateLayout = Readonly<{
  schemaVersion: 1;
  /** Stable component program identity; omitted by legacy layout-v1 metadata. */
  programId?: string;
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

// Source and normalized aliases share one private cache record.
type NormalizedLayoutRecord = {
  readonly layout: CompiledStateLayout;
  readonly signature: string;
  slotsBySite?: Map<string, number>;
};

const layoutRecords = new WeakMap<object, NormalizedLayoutRecord>();
const makeLayoutSignature = (
  programId: string | undefined,
  slots: readonly Readonly<{ siteId: string; slot: number }>[],
): string => JSON.stringify([
  programId ?? null,
  slots.map(({ siteId, slot }) => [siteId, slot]),
]);

function recordForLayout(input: CompiledStateLayout): NormalizedLayoutRecord {
  if (typeof input !== "object" || input === null) {
    throw new TypeError("Compiled state layout must be an object");
  }
  const cached = layoutRecords.get(input as object);
  if (cached) return cached;
  if (input.schemaVersion !== 1 || !Array.isArray(input.slots)) {
    throw new TypeError("Unsupported compiled state layout");
  }
  if (
    input.programId !== undefined &&
    (typeof input.programId !== "string" || input.programId.length === 0)
  ) {
    throw new TypeError("Invalid compiled state layout program ID");
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
  const normalized: CompiledStateLayout = Object.freeze({
    schemaVersion: 1 as const,
    ...(input.programId !== undefined ? { programId: input.programId } : {}),
    slots: Object.freeze(slots),
  });
  const record: NormalizedLayoutRecord = {
    layout: normalized,
    signature: makeLayoutSignature(input.programId, slots),
  };
  layoutRecords.set(input as object, record);
  layoutRecords.set(normalized, record);
  return record;
}

/** Validate and defensively snapshot metadata once per compiler-owned object. */
export function normalizeCompiledStateLayout(
  input: CompiledStateLayout,
): CompiledStateLayout {
  return recordForLayout(input).layout;
}

export function compiledStateLayoutSignature(
  layout: CompiledStateLayout,
): string {
  return recordForLayout(layout).signature;
}

/** Resolve a hook slot once per immutable layout descriptor. */
export function compiledStateLayoutSlot(
  layout: CompiledStateLayout,
  siteId: string,
): number | undefined {
  const record = recordForLayout(layout);
  let bySite = record.slotsBySite;
  if (!bySite) {
    bySite = new Map();
    for (const slot of record.layout.slots) bySite.set(slot.siteId, slot.slot);
    record.slotsBySite = bySite;
  }
  return bySite.get(siteId);
}
