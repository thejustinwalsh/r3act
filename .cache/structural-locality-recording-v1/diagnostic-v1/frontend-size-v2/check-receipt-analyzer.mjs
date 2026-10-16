import assert from "node:assert/strict";
import { pageSchedule } from "../../model/schedule.mjs";
import { analyzeReceipt, REQUIRED_COUNT_SITES, requiredCountValue } from "./receipt-analyzer.mjs";

const mock = (schedule, mode) => ({ schemaVersion: "structural-count-page-v2", status: "PASS", mode,
  size: schedule.size, scheduleId: schedule.id, error: null, cleanupErrors: [],
  final: { ownerCount: 0, readerCount: 0 },
  trace: [...schedule.trials.map((trial) => ({ id: trial.id, status: "PASS",
    digest: "12345678", route: mode === "count" ? "collection-delta" : null })),
    { phase: "disposed", final: { ownerCount: 0, readerCount: 0 }, remainingChildren: 0 }],
  edits: schedule.trials.map((trial) => ({
    id: trial.id, kind: trial.kind, trialIndex: trial.trialIndex,
    sampleKind: trial.sampleKind, operationIndex: trial.operationIndex,
    changedKeys: trial.changedKeys, beforeSize: trial.beforeSize, afterSize: trial.afterSize,
    reset: { size: schedule.size, digest: "12345678", identity: {
      retainedChecked: schedule.size, newNotSeen: 0, cleanedChecked: 0 } },
    output: { size: trial.afterSize, digest: "12345678", sentinelSelected: true,
      identity: { retainedChecked: schedule.size - trial.removedIds.length,
        newNotSeen: trial.addedIds.length, cleanedChecked: trial.removedIds.length } },
    selectionActions: { reset: 0, preselection: 1 },
    lifecycle: { retained: schedule.size - trial.removedIds.length,
      mounted: trial.addedIds.length, cleaned: trial.removedIds.length },
    path: { deltaOperations: trial.nativeOperations.length, renderFallback: 0 },
    commit: { expectedVersion: 128, applyResult: { ok: true, version: 129 },
      afterCollectionVersion: 129, flushResult: true, pendingChangeCount: 0 },
    collection: { deltas: { entryInspections: 1, anchorInspections: 1,
      listenerNotifications: 1, listenerErrors: 0 },
    gauges: { before: { readerCount: 1, retainedBatches: 0 },
      after: { readerCount: 1, retainedBatches: 0 } } },
    bucketStats: { before: null, after: null, reason: "No public retained bucket accessor" },
    bucketProfileGauge: null,
    receipt: mode === "count" ? { label: trial.id, rootId: "r1", phase: "edit",
      coverageId: "recording-b-probe-coverage-v1",
      completed: true, route: "collection-delta", bails: [], errors: [],
      counts: Object.fromEntries(Object.entries(REQUIRED_COUNT_SITES).map(([name, value]) =>
        [name, { value: requiredCountValue(name, trial.nativeOperations.length), ...value }])),
      missing: { "host.layout-paint": { value: null,
        reason: "synchronous window excludes presentation" },
        "bucket.stats.public-access": { value: null,
          reason: "No public retained VDOM bucket stats accessor" } } } : null,
  })) });
const changes = [
  (value) => value.edits.pop(),
  (value) => { value.size = value.size === 128 ? 1024 : 128; },
  (value) => { value.scheduleId = "wrong-schedule"; },
  (value) => { value.trace[1].id = value.trace[0].id; },
  (value) => { [value.trace[0], value.trace[1]] = [value.trace[1], value.trace[0]]; },
  (value) => { value.trace[0].digest = "ffffffff"; },
  (value) => { value.trace[120].remainingChildren = 1; },
  (value) => { value.trace[120].final.readerCount = 1; },
  (value) => { value.trace.pop(); },
  (value) => { value.edits[0].receipt.completed = false; },
  (value) => { value.edits[0].receipt.counts["root.flush.entries"].unit = "unknown"; },
  (value) => { const edit = value.edits.find((item) => item.kind === "odd-key-filter");
    edit.receipt.counts["collection.preflight.operation-visits"].value = 1; },
  (value) => { value.edits[0].receipt.counts["root.flush.entries"].value = 2; },
  (value) => { value.edits[0].receipt.counts["collection.delta.batch-visits"].value = 2; },
  (value) => { value.edits[0].receipt.counts["vdom.delta.commit-operation-visits"].site =
    "wrong-site"; },
  (value) => { value.edits[0].commit.afterCollectionVersion++; },
  (value) => { value.edits[0].commit.flushResult = false; },
  (value) => { value.edits[0].commit.pendingChangeCount = 1; },
  (value) => { value.edits[0].collection.gauges.after.retainedBatches = 1; },
  (value) => { value.edits[0].collection.deltas.listenerErrors = 1; },
  (value) => { value.edits[0].receipt.missing["host.layout-paint"].value = 0; },
  (value) => { value.edits[0].output.identity.retainedChecked--; },
  (value) => { value.edits[0].latencyMs = 1; },
  (value) => { value.edits[0].receipt.route = "full-reconcile"; },
  (value) => { value.edits[0].receipt.coverageId = "unknown"; },
  (value) => { delete value.edits[0].receipt.counts["collection.preflight.operation-visits"]; },
  (value) => { value.edits[0].bucketStats.before = 0; },
];
for (const size of [128, 1024, 10000]) {
  const schedule = pageSchedule({ size, pairIndex: 0, arm: "native", pageKind: "count" });
  assert.equal(schedule.trials.length, 120);
  assert.equal(analyzeReceipt(mock(schedule, "count"), "count", size).edits, 120);
  assert.equal(analyzeReceipt(mock(schedule, "off"), "off", size).timings, "ABSENT");
  const broadFilter = schedule.trials.find((trial) => trial.kind === "odd-key-filter");
  assert.equal(broadFilter.nativeOperations.length, size / 2);
  assert.equal(requiredCountValue("collection.preflight.operation-visits",
    broadFilter.nativeOperations.length), size / 2);
  for (const change of changes) {
    const invalid = structuredClone(mock(schedule, "count"));
    change(invalid);
    assert.throws(() => analyzeReceipt(invalid, "count", size));
  }
}
console.log("Recording B size-v2 receipt analyzer synthetic checks PASS");
