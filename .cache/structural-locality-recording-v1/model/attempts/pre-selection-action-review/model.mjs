import { SIZES } from "./schedule.mjs";

const check = (condition, message) => { if (!condition) throw Error(message); };
const equal = (actual, expected, message) =>
  check(Object.is(actual, expected), `${message}: ${String(actual)} != ${String(expected)}`);
const sameArray = (actual, expected, message) => {
  check(actual.length === expected.length, `${message}: length ${actual.length} != ${expected.length}`);
  for (let index = 0; index < actual.length; index++)
    equal(actual[index], expected[index], `${message} at ${index}`);
};
const freezeRows = (rows) => Object.freeze(rows.map((row) => Object.freeze(row)));
const stateOf = (rows, generations) => Object.freeze({ rows: freezeRows(rows), generations });
const canonicalId = (index) => `row-${index}`;

export function initialModel(size) {
  if (!SIZES.includes(size)) throw new RangeError("unsupported registered size");
  const rows = Array.from({ length: size }, (_, index) => ({
    id: canonicalId(index), incarnation: `${canonicalId(index)}#1`, selected: false,
  }));
  return stateOf(rows, new Map(rows.map((row) => [row.id, 1])));
}

export function identityDelta(before, after) {
  const previous = new Map(before.rows.map((row) => [row.id, row]));
  const next = new Map(after.rows.map((row) => [row.id, row]));
  const retained = [], mounted = [], cleaned = [];
  for (const row of after.rows) {
    const old = previous.get(row.id);
    if (old) {
      equal(row.incarnation, old.incarnation, `retained ${row.id} changed incarnation`);
      retained.push(row.id);
    } else mounted.push(row.id);
  }
  for (const row of before.rows) if (!next.has(row.id)) cleaned.push(row.id);
  return Object.freeze({ retained: Object.freeze(retained), mounted: Object.freeze(mounted),
    cleaned: Object.freeze(cleaned) });
}

export function restoreCanonical(current, size) {
  if (!SIZES.includes(size)) throw new RangeError("unsupported registered size");
  const previous = new Map(current.rows.map((row) => [row.id, row]));
  const generations = new Map(current.generations);
  const rows = Array.from({ length: size }, (_, index) => {
    const id = canonicalId(index);
    const retained = previous.get(id);
    if (retained) return { id, incarnation: retained.incarnation,
      selected: id === "row-2" ? retained.selected : false };
    const generation = (generations.get(id) ?? 0) + 1;
    generations.set(id, generation);
    return { id, incarnation: `${id}#${generation}`, selected: false };
  });
  const state = stateOf(rows, generations);
  return Object.freeze({ state, lifecycle: identityDelta(current, state),
    phase: "untimed-canonical-reset" });
}

export function prepareTrial(current, trial) {
  check(current && trial && SIZES.includes(trial.size), "invalid trial preparation");
  const reset = restoreCanonical(current, trial.size);
  sameArray(reset.state.rows.map((row) => row.id), trial.canonicalIds, "canonical reset order");
  const selected = new Set(trial.selectedBeforeIds);
  check(selected.has("row-2"), "sentinel must be selected before each edit");
  if (trial.movingKey) check(selected.has(trial.movingKey), "moving key must be selected");
  const preselectionChanges = reset.state.rows
    .filter((row) => row.selected !== selected.has(row.id)).map((row) => row.id);
  const state = stateOf(reset.state.rows.map((row) => ({ ...row,
    selected: selected.has(row.id) })), reset.state.generations);
  return Object.freeze({ state, reset: reset.lifecycle,
    preselectionChanges: Object.freeze(preselectionChanges),
    phase: "untimed-reset-and-preselection" });
}

export function applyExpectedEdit(prepared, trial) {
  check(prepared && trial && SIZES.includes(trial.size), "invalid expected edit");
  const before = prepared.state ?? prepared;
  sameArray(before.rows.map((row) => row.id), trial.canonicalIds,
    "edit must start from canonical order");
  sameArray(before.rows.filter((row) => row.selected).map((row) => row.id),
    trial.selectedBeforeIds.slice().sort((a, b) =>
      trial.canonicalIds.indexOf(a) - trial.canonicalIds.indexOf(b)),
    "edit must start with registered sentinels");
  let rows = [...before.rows];
  const generations = new Map(before.generations);
  if (trial.nativeOperations.length > 1 &&
      trial.nativeOperations.every((item) => item.type === "remove")) {
    const live = new Set(rows.map((row) => row.id));
    const removed = new Set();
    for (const operation of trial.nativeOperations) {
      check(live.has(operation.key), `missing remove key ${operation.key}`);
      check(!removed.has(operation.key), `duplicate remove key ${operation.key}`);
      removed.add(operation.key);
    }
    rows = rows.filter((row) => !removed.has(row.id));
  } else for (const operation of trial.nativeOperations) {
    if (operation.type === "remove") {
      const index = rows.findIndex((row) => row.id === operation.key);
      check(index >= 0, `missing remove key ${operation.key}`);
      rows.splice(index, 1);
    } else if (operation.type === "insert") {
      check(!rows.some((row) => row.id === operation.key), "inserted key already live");
      const index = operation.beforeKey === null ? rows.length :
        rows.findIndex((row) => row.id === operation.beforeKey);
      check(index >= 0, `missing insert anchor ${operation.beforeKey}`);
      const generation = (generations.get(operation.key) ?? 0) + 1;
      generations.set(operation.key, generation);
      rows.splice(index, 0, { id: operation.key,
        incarnation: `${operation.key}#${generation}`, selected: false });
    } else if (operation.type === "move") {
      const oldIndex = rows.findIndex((row) => row.id === operation.key);
      check(oldIndex >= 0, `missing move key ${operation.key}`);
      const [row] = rows.splice(oldIndex, 1);
      const index = operation.beforeKey === null ? rows.length :
        rows.findIndex((item) => item.id === operation.beforeKey);
      check(index >= 0, `missing move anchor ${operation.beforeKey}`);
      rows.splice(index, 0, row);
    } else throw Error(`unexpected operation ${operation.type}`);
  }
  const state = stateOf(rows, generations);
  sameArray(state.rows.map((row) => row.id), trial.nextIds, "edited output order");
  check(state.rows.find((row) => row.id === "row-2")?.selected,
    "sentinel row-2 must survive selected");
  if (trial.movingKey) check(state.rows.find((row) => row.id === trial.movingKey)?.selected,
    "moving row must retain selected state");
  return Object.freeze({ state, lifecycle: identityDelta(before, state),
    phase: "edit-result-inspect-after-commit" });
}

export function expectedDomRows(state) {
  return Object.freeze(state.rows.map((row) => Object.freeze({
    id: row.id, text: row.id, selected: String(row.selected),
    incarnation: row.incarnation,
  })));
}
