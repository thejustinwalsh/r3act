import assert from "node:assert/strict";
import { pageSchedule, OPERATION_KINDS, SIZES, PAIR_INDEXES, armOrder } from "../../model/schedule.mjs";
import { analyzePage, analyzePair, analyzeMatrix } from "./analyzer.mjs";
import { assertExecutedResponseHashes } from "./asset-contract.mjs";

function mockPage(size, pairIndex, arm, intervalMs = 1) {
  const schedule = pageSchedule({ size, pairIndex, arm,
    pageKind: arm === "generic" ? "oracle" : "latency" });
  return { schemaVersion: "structural-latency-page-v1", status: "PASS", arm, size, pairIndex,
    scheduleId: schedule.id, scheduleLabel: schedule.scheduleLabel,
    error: null, cleanupErrors: [], scheduleConstructionMs: 1,
    initialIdsConstructionMs: 1, coldMountMs: 1, teardownMs: 1,
    final: arm === "native" ? { ownerCount: 0, readerCount: 0 } :
      arm === "generic" ? { ownerCount: 0, readerCount: null } :
      { ownerCount: null, readerCount: null },
    trace: [...schedule.trials.map((trial) => ({ id: trial.id, status: "PASS",
      digest: "12345678" })), { phase: "disposed", remainingChildren: 0,
      final: arm === "native" ? { ownerCount: 0, readerCount: 0 } :
        arm === "generic" ? { ownerCount: 0, readerCount: null } :
        { ownerCount: null, readerCount: null } }],
    edits: schedule.trials.map((trial) => ({ id: trial.id, kind: trial.kind,
      trialIndex: trial.trialIndex, operationIndex: trial.operationIndex,
      sampleKind: trial.sampleKind, changedKeys: trial.changedKeys,
      beforeSize: trial.beforeSize, afterSize: trial.afterSize,
      reset: { size: trial.beforeSize, digest: "12345678" },
      output: { size: trial.afterSize, digest: "12345678", sentinelSelected: true,
        identity: { retainedChecked: trial.beforeSize - trial.removedIds.length,
          newNotSeen: trial.addedIds.length, cleanedChecked: trial.removedIds.length } },
      selectionActions: { reset: 0, preselection: 1 },
      lifecycle: { retained: trial.beforeSize - trial.removedIds.length,
        mounted: trial.addedIds.length, cleaned: trial.removedIds.length },
      intervalMs: arm === "generic" ? null : intervalMs,
      resetPhaseMs: 1, inputConstructionMs: 1,
      commit: arm === "native" ? { expectedVersion: 1, appliedVersion: 2,
        afterVersion: 2, flushed: true, pendingChangeCount: 0 } : null })) };
}

for (const size of SIZES) {
  for (const arm of ["native", "react", "generic"]) {
    const page = mockPage(size, 0, arm);
    assert.equal(analyzePage(page, arm === "generic" ? null : .01).status, "PASS");
    const wrongSize = structuredClone(page); wrongSize.size = size === 128 ? 1024 : 128;
    assert.throws(() => analyzePage(wrongSize, arm === "generic" ? null : .01));
    const wrongSchema = structuredClone(page); wrongSchema.schemaVersion = "wrong";
    assert.throws(() => analyzePage(wrongSchema, arm === "generic" ? null : .01));
    const wrongArm = structuredClone(page); wrongArm.arm = "unsupported";
    assert.throws(() => analyzePage(wrongArm, arm === "generic" ? null : .01));
    const missing = structuredClone(page); missing.edits.pop();
    assert.throws(() => analyzePage(missing, arm === "generic" ? null : .01));
    const identity = structuredClone(page); identity.edits[0].output.identity.retainedChecked--;
    assert.throws(() => analyzePage(identity, arm === "generic" ? null : .01));
    const trace = structuredClone(page); trace.trace[1].id = trace.trace[0].id;
    assert.throws(() => analyzePage(trace, arm === "generic" ? null : .01));
    const disposal = structuredClone(page); disposal.trace[120].remainingChildren = 1;
    assert.throws(() => analyzePage(disposal, arm === "generic" ? null : .01));
  }
  const native = mockPage(size, 0, "native"), react = mockPage(size, 0, "react");
  assert.equal(analyzePair(native, react, .01, .01).cells["insert-head"].medianRatio, 1);
  const nearFloor = analyzePair(mockPage(size, 0, "native", .01), react, .01, .01);
  assert.equal(nearFloor.cells["insert-head"].censored, true);
  assert.equal(analyzePage(mockPage(size, 0, "native", .01), .01).screenStatus,
    "UNRESOLVED_TIMER_FLOOR");
  const wrongOutput = structuredClone(react); wrongOutput.edits[0].output.digest = "ffffffff";
  wrongOutput.trace[0].digest = "ffffffff";
  assert.throws(() => analyzePair(native, wrongOutput, .01, .01));
}
const pairs = SIZES.flatMap((size) => PAIR_INDEXES.map((pairIndex) => ({
  status: "PASS", size, pairIndex, order: armOrder(SIZES.indexOf(size), pairIndex),
  cells: Object.fromEntries(OPERATION_KINDS.map((kind) =>
    [kind, { censored: false, medianRatio: 1, p95Ratio: 1 }])) })));
assert.equal(analyzeMatrix(pairs).status, "PARITY");
const missingPair = structuredClone(pairs); missingPair.pop();
assert.throws(() => analyzeMatrix(missingPair));
const missingCell = structuredClone(pairs); delete missingCell[0].cells["insert-head"];
assert.throws(() => analyzeMatrix(missingCell));
const wrongOrder = structuredClone(pairs); wrongOrder[0].order.reverse();
assert.throws(() => analyzeMatrix(wrongOrder));
const wrongRatio = structuredClone(pairs); wrongRatio[0].cells["insert-head"].medianRatio = 2;
assert.equal(analyzeMatrix(wrongRatio).status, "FAIL");
const wrongP95 = structuredClone(pairs); wrongP95[0].cells["insert-head"].p95Ratio = 2;
assert.equal(analyzeMatrix(wrongP95).status, "FAIL");
const leftCensored = structuredClone(pairs); leftCensored[0].cells["insert-head"].censored = true;
assert.equal(analyzeMatrix(leftCensored).status, "UNRESOLVED");
const strong = structuredClone(pairs);
for (const pair of strong) if (pair.size > 128)
  for (const kind of OPERATION_KINDS) {
    pair.cells[kind].medianRatio = .7;
    pair.cells[kind].p95Ratio = .7;
  }
assert.equal(analyzeMatrix(strong).strongWinOptional, true);
const expected = new Map([["/index.html", "abc"], ["/assets/app.js", "def"]]);
const served = [{ path: "/index.html", status: 200, sha256: "abc" },
  { path: "/assets/app.js", status: 200, sha256: "def" }];
assert.doesNotThrow(() => assertExecutedResponseHashes(expected, served));
for (const mutate of [
  (rows) => { rows[0].sha256 = "wrong"; },
  (rows) => { rows[0].status = 404; },
  (rows) => { rows.pop(); },
  (rows) => { rows.push({ ...rows[0] }); },
]) {
  const rows = structuredClone(served); mutate(rows);
  assert.throws(() => assertExecutedResponseHashes(expected, rows));
}
console.log("Recording B latency/oracle analyzer synthetic checks PASS");
