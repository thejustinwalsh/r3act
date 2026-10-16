import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OPERATION_KINDS, SIZES, applyOperationsToIds, armOrder, editFor, orderedKinds,
  pageSchedule } from "./schedule.mjs";
import { applyExpectedEdit, expectedDomRows, initialModel, prepareTrial,
  restoreCanonical } from "./model.mjs";

assert.equal(process.version, "v24.18.0");
const root = path.resolve(fileURLToPath(new URL("./", import.meta.url)), "../../..");
const lock = JSON.parse(await readFile(new URL("./selflock.json", import.meta.url), "utf8"));
assert.equal(lock.schemaVersion, "structural-locality-recording-model-lock-v1");
for (const item of lock.files) {
  const actual = createHash("sha256").update(await readFile(path.join(root, item.path)))
    .digest("hex");
  assert.equal(actual, item.sha256, `locked source changed: ${item.path}`);
}
const preservation = JSON.parse(await readFile(
  new URL("./attempts/pre-review/manifest.json", import.meta.url), "utf8"));
assert.equal(preservation.schemaVersion, "structural-recording-model-pre-review-preservation-v1");
for (const item of preservation.files) {
  const actual = createHash("sha256").update(await readFile(path.join(root, item.path)))
    .digest("hex");
  assert.equal(actual, item.sha256, `pre-review handoff changed: ${item.path}`);
}
const actionPreservation = JSON.parse(await readFile(
  new URL("./attempts/pre-selection-action-review/manifest.json", import.meta.url), "utf8"));
assert.equal(actionPreservation.schemaVersion,
  "structural-recording-model-pre-selection-action-preservation-v1");
for (const item of actionPreservation.files) {
  const actual = createHash("sha256").update(await readFile(path.join(root, item.path)))
    .digest("hex");
  assert.equal(actual, item.sha256, `selection-action handoff changed: ${item.path}`);
}
const context = JSON.parse(await readFile(new URL("./context/provenance.json", import.meta.url),
  "utf8"));
assert.equal(context.schemaVersion, "structural-recording-model-context-v1");
for (const item of context.files) {
  const actual = createHash("sha256").update(await readFile(path.join(root, item.copyPath)))
    .digest("hex");
  assert.equal(actual, item.copySha256, `context copy changed: ${item.copyPath}`);
  assert.equal(item.originalSha256AtCapture, item.copySha256);
}

function independentIds(size, kind, newId) {
  const ids = Array.from({ length: size }, (_, index) => `row-${index}`);
  const middle = Math.floor(size / 2);
  if (kind.startsWith("insert-")) {
    ids.splice(kind === "insert-head" ? 0 : kind === "insert-middle" ? middle : size,
      0, newId);
  } else if (kind.startsWith("remove-")) {
    ids.splice(kind === "remove-head" ? 0 : kind === "remove-middle" ? middle : size - 1,
      1);
  } else if (kind === "move-head") ids.unshift(ids.pop());
  else if (kind === "move-middle") {
    const first = ids.shift();
    ids.splice(middle - 1, 0, first);
  }
  else if (kind === "move-tail" || kind === "same-key-rotation") ids.push(ids.shift());
  else if (kind === "edge-replacement") { ids.pop(); ids.unshift(newId); }
  else if (kind === "odd-key-filter") return ids.filter((_, index) => index % 2 === 0);
  else throw Error(`unknown kind ${kind}`);
  return ids;
}

for (const [sizeIndex, size] of SIZES.entries()) {
  assert.deepEqual(armOrder(sizeIndex, 0), sizeIndex === 1 ?
    ["react", "native"] : ["native", "react"]);
  assert.deepEqual(armOrder(sizeIndex, 1), sizeIndex === 1 ?
    ["native", "react"] : ["react", "native"]);
  for (const kind of OPERATION_KINDS) {
    const edit = editFor(size, 0, 0, kind);
    assert.ok(Object.isFrozen(edit.nativeOperations));
    assert.ok(Object.isFrozen(edit.nextIds));
    assert.deepEqual(edit.nextIds, independentIds(size, kind, edit.addedIds[0]));
    assert.equal(new Set(edit.nextIds).size, edit.afterSize);
    assert.ok(edit.nextIds.includes("row-2"));
    assert.ok(edit.selectedBeforeIds.includes("row-2"));
    assert.equal(edit.nativeOperations.length, kind === "odd-key-filter" ? size / 2 :
      kind === "edge-replacement" ? 2 : 1);
  }
}

const canonical = Array.from({ length: 128 }, (_, index) => `row-${index}`);
assert.throws(() => applyOperationsToIds(canonical, [
  { type: "remove", key: "row-1" }, { type: "remove", key: "row-1" },
]), /duplicate remove key/);
assert.throws(() => applyOperationsToIds(canonical, [
  { type: "remove", key: "row-1" }, { type: "remove", key: "missing" },
]), /missing remove key/);
const filter = editFor(128, 0, 0, "odd-key-filter");
const preparedFilter = prepareTrial(initialModel(128), filter);
for (const invalidOperations of [
  [{ type: "remove", key: "row-1" }, { type: "remove", key: "row-1" }],
  [{ type: "remove", key: "row-1" }, { type: "remove", key: "missing" }],
]) assert.throws(() => applyExpectedEdit(preparedFilter,
  { ...filter, nativeOperations: invalidOperations }), /remove key/);

for (let pairIndex = 0; pairIndex < 5; pairIndex++) {
  const native = pageSchedule({ size: 128, pairIndex, arm: "native" });
  const react = pageSchedule({ size: 128, pairIndex, arm: "react" });
  assert.equal(native.trials.length, 120);
  assert.equal(react.trials.length, 120);
  assert.deepEqual(native.trials.map((item) => item.id), react.trials.map((item) => item.id));
  assert.equal(new Set(native.trials.flatMap((item) => item.addedIds)).size,
    native.trials.flatMap((item) => item.addedIds).length);
  for (let trialIndex = 0; trialIndex < 10; trialIndex++) {
    const group = native.trials.slice(trialIndex * 12, (trialIndex + 1) * 12);
    assert.deepEqual(group.map((item) => item.kind), orderedKinds(0, pairIndex, trialIndex));
    assert.equal(new Set(group.map((item) => item.kind)).size, 12);
    assert.equal(new Set(group.map((item) => item.trialId)).size, 1);
    assert.ok(group.every((item) => item.sampleKind ===
      (trialIndex < 2 ? "warmup" : "measured")));
  }
}
assert.throws(() => pageSchedule({ size: 128, pairIndex: 1, arm: "generic",
  pageKind: "oracle" }), RangeError);
assert.equal(pageSchedule({ size: 128, arm: "generic", pageKind: "oracle" }).trials.length, 120);
assert.equal(pageSchedule({ size: 128, arm: "native", pageKind: "count" }).trials.length, 120);

let current = initialModel(128);
const page = pageSchedule({ size: 128, pairIndex: 0, arm: "native" });
for (const trial of page.trials) {
  const prepared = prepareTrial(current, trial);
  assert.ok(prepared.state.rows.find((row) => row.id === "row-2").selected);
  const beforeById = new Map(prepared.state.rows.map((row) => [row.id, row]));
  const result = applyExpectedEdit(prepared, trial);
  assert.deepEqual(expectedDomRows(result.state).map((row) => row.id), trial.nextIds);
  assert.deepEqual(result.lifecycle.mounted, trial.addedIds);
  assert.deepEqual(result.lifecycle.cleaned, trial.removedIds);
  for (const key of result.lifecycle.retained) {
    assert.equal(result.state.rows.find((row) => row.id === key).incarnation,
      beforeById.get(key).incarnation);
  }
  current = result.state;
}

const removed = editFor(128, 0, 0, "remove-head");
const beforeRemoval = prepareTrial(initialModel(128), removed);
assert.deepEqual(beforeRemoval.resetSelectionChanges, []);
assert.deepEqual(beforeRemoval.preselectionChanges.map((action) =>
  [action.id, action.fromSelected, action.toSelected]), [["row-2", false, true]]);
const afterRemoval = applyExpectedEdit(beforeRemoval, removed);
const restored = restoreCanonical(afterRemoval.state, 128);
assert.equal(restored.state.rows[0].incarnation, "row-0#2");
assert.equal(restored.state.rows[0].selected, false);
assert.ok(restored.lifecycle.mounted.includes("row-0"));
assert.ok(!restored.resetSelectionChanges.some((action) => action.id === "row-0"));
assert.equal(restored.state.rows[2].incarnation,
  beforeRemoval.state.rows[2].incarnation);
assert.ok(restored.state.rows[2].selected,
  "retained selected row-2 must not be toggled false during reset");
const move = editFor(128, 0, 1, "move-head");
const moved = applyExpectedEdit(prepareTrial(restored.state, move), move);
assert.ok(moved.state.rows[0].selected);
assert.equal(moved.state.rows[0].incarnation, "row-127#1");
const next = prepareTrial(moved.state, editFor(128, 0, 2, "insert-tail"));
assert.deepEqual(next.resetSelectionChanges.map((action) =>
  [action.id, action.fromSelected, action.toSelected]), [["row-127", true, false]]);
assert.ok(!next.preselectionChanges.some((action) => action.id === "row-127"));
assert.ok(!next.resetSelectionChanges.some((action) => action.id === "row-2"));
assert.ok(next.state.rows.find((row) => row.id === "row-2").selected);
assert.equal(next.state.rows.find((row) => row.id === "row-127").selected, false);
const repeatedMove = prepareTrial(moved.state, editFor(128, 0, 2, "move-head"));
assert.deepEqual(repeatedMove.resetSelectionChanges.map((action) =>
  [action.id, action.fromSelected, action.toSelected]), [["row-127", true, false]]);
assert.deepEqual(repeatedMove.preselectionChanges.map((action) =>
  [action.id, action.fromSelected, action.toSelected]), [["row-127", false, true]]);

console.log("Recording B deterministic schedule/model synthetic checks PASS");
