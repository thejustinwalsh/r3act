export const SIZES = Object.freeze([128, 1024, 10000]);
export const OPERATION_KINDS = Object.freeze([
  "insert-head", "insert-middle", "insert-tail",
  "remove-head", "remove-middle", "remove-tail",
  "move-head", "move-middle", "move-tail",
  "same-key-rotation", "edge-replacement", "odd-key-filter",
]);
export const PAIR_INDEXES = Object.freeze([0, 1, 2, 3, 4]);
export const WARMUP_TRIALS = 2;
export const MEASURED_TRIALS = 8;
export const SCHEDULE_LABEL = "proposal-formula-v1";
export const PROPOSED_SEED_LABEL = "0x5b2026";

const freezeArray = (items) => Object.freeze(items);
const rowId = (index) => `row-${index}`;
const canonicalIds = (size) => freezeArray(Array.from({ length: size }, (_, index) => rowId(index)));

export function armOrder(sizeIndex, pairIndex) {
  if (!Number.isInteger(sizeIndex) || sizeIndex < 0 || sizeIndex >= SIZES.length ||
      !PAIR_INDEXES.includes(pairIndex)) throw new RangeError("invalid size/pair index");
  const nativeFirst = (pairIndex % 2 === 0) !== (sizeIndex === 1);
  return freezeArray(nativeFirst ? ["native", "react"] : ["react", "native"]);
}

export function orderedKinds(sizeIndex, pairIndex, trialIndex) {
  if (!Number.isInteger(sizeIndex) || sizeIndex < 0 || sizeIndex >= SIZES.length ||
      !PAIR_INDEXES.includes(pairIndex) || !Number.isInteger(trialIndex) ||
      trialIndex < 0 || trialIndex >= WARMUP_TRIALS + MEASURED_TRIALS)
    throw new RangeError("invalid schedule coordinate");
  const rotation = (sizeIndex + pairIndex + trialIndex) % OPERATION_KINDS.length;
  const rotated = [...OPERATION_KINDS.slice(rotation), ...OPERATION_KINDS.slice(0, rotation)];
  return freezeArray(trialIndex % 2 === 1 ? rotated.reverse() : rotated);
}

function immutableOperation(operation) {
  if (operation.value) Object.freeze(operation.value);
  return Object.freeze(operation);
}

export function applyOperationsToIds(ids, operations) {
  if (operations.length > 1 && operations.every((item) => item.type === "remove")) {
    const live = new Set(ids);
    const removed = new Set();
    for (const operation of operations) {
      if (!live.has(operation.key)) throw Error(`missing remove key ${operation.key}`);
      if (removed.has(operation.key)) throw Error(`duplicate remove key ${operation.key}`);
      removed.add(operation.key);
    }
    return freezeArray(ids.filter((id) => !removed.has(id)));
  }
  const result = [...ids];
  for (const operation of operations) {
    if (operation.type === "remove") {
      const index = result.indexOf(operation.key);
      if (index < 0) throw Error(`missing remove key ${operation.key}`);
      result.splice(index, 1);
    } else if (operation.type === "insert") {
      if (result.includes(operation.key)) throw Error(`duplicate insert key ${operation.key}`);
      const index = operation.beforeKey === null ? result.length : result.indexOf(operation.beforeKey);
      if (index < 0) throw Error(`missing insert anchor ${operation.beforeKey}`);
      result.splice(index, 0, operation.key);
    } else if (operation.type === "move") {
      const from = result.indexOf(operation.key);
      if (from < 0) throw Error(`missing move key ${operation.key}`);
      result.splice(from, 1);
      const to = operation.beforeKey === null ? result.length : result.indexOf(operation.beforeKey);
      if (to < 0) throw Error(`missing move anchor ${operation.beforeKey}`);
      result.splice(to, 0, operation.key);
    } else throw Error(`unexpected operation ${operation.type}`);
  }
  return freezeArray(result);
}

export function editFor(size, pairIndex, trialIndex, kind) {
  const sizeIndex = SIZES.indexOf(size);
  if (sizeIndex < 0 || !PAIR_INDEXES.includes(pairIndex) ||
      !Number.isInteger(trialIndex) || trialIndex < 0 ||
      trialIndex >= WARMUP_TRIALS + MEASURED_TRIALS || !OPERATION_KINDS.includes(kind))
    throw new RangeError("invalid edit coordinate");
  const ids = canonicalIds(size);
  const middle = Math.floor(size / 2);
  const freshKey = `new-n${size}-p${pairIndex}-t${trialIndex}-${kind}`;
  const insert = (beforeKey) => immutableOperation({ type: "insert", key: freshKey,
    value: { id: freshKey }, beforeKey });
  const remove = (key) => immutableOperation({ type: "remove", key });
  const move = (key, beforeKey) => immutableOperation({ type: "move", key, beforeKey });
  let operations;
  let movingKey = null;
  switch (kind) {
    case "insert-head": operations = [insert(rowId(0))]; break;
    case "insert-middle": operations = [insert(rowId(middle))]; break;
    case "insert-tail": operations = [insert(null)]; break;
    case "remove-head": operations = [remove(rowId(0))]; break;
    case "remove-middle": operations = [remove(rowId(middle))]; break;
    case "remove-tail": operations = [remove(rowId(size - 1))]; break;
    case "move-head": movingKey = rowId(size - 1); operations = [move(movingKey, rowId(0))]; break;
    case "move-middle": movingKey = rowId(0); operations = [move(movingKey, rowId(middle))]; break;
    case "move-tail": movingKey = rowId(0); operations = [move(movingKey, null)]; break;
    case "same-key-rotation": movingKey = rowId(0); operations = [move(movingKey, null)]; break;
    case "edge-replacement": operations = [remove(rowId(size - 1)), insert(rowId(0))]; break;
    case "odd-key-filter": operations = Array.from({ length: size / 2 },
      (_, index) => remove(rowId(index * 2 + 1))); break;
  }
  const nativeOperations = freezeArray(operations);
  const nextIds = applyOperationsToIds(ids, nativeOperations);
  const addedIds = freezeArray(operations.filter((item) => item.type === "insert").map((item) => item.key));
  const removedIds = freezeArray(operations.filter((item) => item.type === "remove").map((item) => item.key));
  return Object.freeze({ id: `n${size}-p${pairIndex}-t${trialIndex}-${kind}`,
    size, sizeIndex, pairIndex, trialIndex,
    sampleKind: trialIndex < WARMUP_TRIALS ? "warmup" : "measured",
    measuredIndex: trialIndex < WARMUP_TRIALS ? null : trialIndex - WARMUP_TRIALS,
    kind, canonicalIds: ids, nativeOperations, nextIds, movingKey,
    selectedBeforeIds: freezeArray(movingKey ? [rowId(2), movingKey] : [rowId(2)]),
    addedIds, removedIds, changedKeys: addedIds.length + removedIds.length || (movingKey ? 1 : 0),
    beforeSize: size, afterSize: nextIds.length });
}

export function pageSchedule({ size, pairIndex = 0, arm, pageKind = "latency" }) {
  const sizeIndex = SIZES.indexOf(size);
  if (sizeIndex < 0 || !PAIR_INDEXES.includes(pairIndex) ||
      !["native", "react", "generic"].includes(arm) ||
      !["latency", "count", "oracle"].includes(pageKind) ||
      (pageKind === "latency" && arm === "generic") ||
      (pageKind === "count" && arm !== "native") ||
      (pageKind === "oracle" && arm !== "generic") ||
      (pageKind !== "latency" && pairIndex !== 0))
    throw new RangeError("invalid page coordinate");
  const trials = [];
  for (let trialIndex = 0; trialIndex < WARMUP_TRIALS + MEASURED_TRIALS; trialIndex++) {
    const order = orderedKinds(sizeIndex, pairIndex, trialIndex);
    order.forEach((kind, operationIndex) => trials.push(Object.freeze({
      ...editFor(size, pairIndex, trialIndex, kind), operationIndex,
      blockId: `n${size}-p${pairIndex}`,
      trialId: `n${size}-p${pairIndex}-t${trialIndex}`,
    })));
  }
  return Object.freeze({ id: `${pageKind}-n${size}-p${pairIndex}-${arm}`,
    scheduleLabel: SCHEDULE_LABEL, proposedSeedLabel: PROPOSED_SEED_LABEL,
    size, sizeIndex, pairIndex, arm, pageKind,
    armOrder: armOrder(sizeIndex, pairIndex),
    trialCountPerOperation: WARMUP_TRIALS + MEASURED_TRIALS,
    warmupTrialsPerOperation: WARMUP_TRIALS,
    measuredTrialsPerOperation: MEASURED_TRIALS,
    trials: freezeArray(trials) });
}
