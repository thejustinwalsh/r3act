import type { NumericColumn } from "./jsx_binding_runtime.ts";

/** Compiler-certified numeric state slots for one component site. */
export type CompiledStateLayout = Readonly<{
  schemaVersion: 1;
  /** Stable component program identity; omitted by legacy layout-v1 metadata. */
  programId?: string;
  /** Source revision that emitted this layout and its executable program. */
  moduleRevision?: string;
  slots: readonly Readonly<{ siteId: string; slot: number }>[];
}>;

/** A primitive value accepted by the compiler-emitted owner update kernel. */
export type CompiledOwnerUpdatePrimitive =
  | number
  | string
  | boolean
  | null
  | undefined;

/** Existing prepared sink value inspected by an owner update kernel. */
export type CompiledOwnerUpdateSink = Readonly<{ lastValue: unknown }>;

/** Existing prepared row state shared by generic and compiled execution. */
export type CompiledOwnerUpdateRowState = {
  readonly inputValues: readonly number[];
  readonly sinks: readonly CompiledOwnerUpdateSink[];
  seenMask: number;
};

/** Static primitive-only update kernel attached to one normalized layout. */
export type CompiledOwnerUpdateProgram = Readonly<{
  schemaVersion: 2;
  programId: string;
  slotCount: number;
  sinkIds: readonly string[];
  executeCut: (
    changedSlots: Uint32Array,
    changeCount: number,
    rowStates: readonly (CompiledOwnerUpdateRowState | undefined)[],
    stagedInputIndices: Uint32Array,
    stagedSinkIds: Uint16Array,
    stagedValues: CompiledOwnerUpdatePrimitive[],
  ) => number;
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
  ownerUpdateProgram?: CompiledOwnerUpdateProgram;
};

const layoutRecords = new WeakMap<object, NormalizedLayoutRecord>();
const makeLayoutSignature = (
  programId: string | undefined,
  moduleRevision: string | undefined,
  slots: readonly Readonly<{ siteId: string; slot: number }>[],
): string => JSON.stringify([
  programId ?? null,
  moduleRevision ?? null,
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
  if (input.moduleRevision !== undefined &&
    (typeof input.moduleRevision !== "string" || !input.moduleRevision)) {
    throw new TypeError("Invalid compiled state layout module revision");
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
    ...(input.moduleRevision !== undefined ? { moduleRevision: input.moduleRevision } : {}),
    slots: Object.freeze(slots),
  });
  const record: NormalizedLayoutRecord = {
    layout: normalized,
    signature: makeLayoutSignature(input.programId, input.moduleRevision, slots),
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

/** Validate and associate one immutable owner update program with a layout. */
export function associateCompiledOwnerUpdateProgram(
  layout: CompiledStateLayout,
  input: CompiledOwnerUpdateProgram,
): CompiledOwnerUpdateProgram {
  const record = recordForLayout(layout);
  if (typeof input !== "object" || input === null) {
    throw new TypeError("Compiled owner update program must be an object");
  }
  const schemaVersion = input.schemaVersion;
  const programId = input.programId;
  const slotCount = input.slotCount;
  const inputSinkIds = input.sinkIds;
  const executeCut = input.executeCut;
  if (
    schemaVersion !== 2 || typeof programId !== "string" || !programId ||
    record.layout.programId !== programId ||
    !Number.isSafeInteger(slotCount) || slotCount !== record.layout.slots.length ||
    slotCount < 1 || slotCount > 30 || !Array.isArray(inputSinkIds) ||
    inputSinkIds.length < 1 || inputSinkIds.length > 30 ||
    typeof executeCut !== "function"
  ) {
    throw new TypeError("Invalid compiled owner update program");
  }
  const seen = new Set<string>();
  const sinkIds: string[] = [];
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
    if (
      current.schemaVersion !== schemaVersion ||
      current.programId !== programId || current.slotCount !== slotCount ||
      current.executeCut !== executeCut ||
      current.sinkIds.length !== sinkIds.length ||
      current.sinkIds.some((sinkId, index) => sinkId !== sinkIds[index])
    ) {
      throw new TypeError("Conflicting compiled owner update program");
    }
    return current;
  }
  const snapshot: CompiledOwnerUpdateProgram = Object.freeze({
    schemaVersion: 2,
    programId,
    slotCount,
    sinkIds: Object.freeze(sinkIds),
    executeCut,
  });
  record.ownerUpdateProgram = snapshot;
  return snapshot;
}

/** Resolve a program during VDOM row preparation, not during cut execution. */
export function compiledOwnerUpdateProgramFor(
  layout: CompiledStateLayout,
): CompiledOwnerUpdateProgram | undefined {
  return recordForLayout(layout).ownerUpdateProgram;
}
