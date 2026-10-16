import assert from "node:assert/strict";
import { pageSchedule } from "../../model/schedule.mjs";
import { analyzeReceipt, REQUIRED_COUNT_SITES } from "./receipt-analyzer.mjs";

const schedule = pageSchedule({ size: 128, pairIndex: 0, arm: "native", pageKind: "count" });
const mock = (mode) => ({ schemaVersion: "structural-count-page-v1", status: "PASS", mode,
  size: 128, scheduleId: schedule.id, error: null, cleanupErrors: [],
  final: { ownerCount: 0, readerCount: 0 },
  trace: [...schedule.trials.map((trial) => ({ id: trial.id, status: "PASS" })),
    { phase: "disposed" }],
  edits: schedule.trials.map((trial) => ({
    id: trial.id, kind: trial.kind, trialIndex: trial.trialIndex,
    sampleKind: trial.sampleKind, operationIndex: trial.operationIndex,
    changedKeys: trial.changedKeys, beforeSize: trial.beforeSize, afterSize: trial.afterSize,
    reset: { size: 128, digest: "12345678", identity: {
      retainedChecked: 128, newNotSeen: 0, cleanedChecked: 0 } },
    output: { size: trial.afterSize, digest: "12345678", sentinelSelected: true,
      identity: { retainedChecked: 128 - trial.removedIds.length,
        newNotSeen: trial.addedIds.length, cleanedChecked: trial.removedIds.length } },
    selectionActions: { reset: 0, preselection: 1 },
    lifecycle: { retained: 128 - trial.removedIds.length,
      mounted: trial.addedIds.length, cleaned: trial.removedIds.length },
    path: { deltaOperations: trial.nativeOperations.length, renderFallback: 0 },
    collection: { deltas: { entryInspections: 1, anchorInspections: 1,
      listenerNotifications: 1, listenerErrors: 0 } },
    bucketStats: { before: null, after: null, reason: "No public retained bucket accessor" },
    bucketProfileGauge: null,
    receipt: mode === "count" ? { label: trial.id, rootId: "r1", phase: "edit",
      coverageId: "recording-b-probe-coverage-v1",
      completed: true, route: "collection-delta", bails: [], errors: [],
      counts: Object.fromEntries(Object.entries(REQUIRED_COUNT_SITES).map(([name, value]) =>
        [name, { value: 1, ...value }])),
      missing: { "host.layout-paint": { value: null,
        reason: "synchronous window excludes presentation" },
        "bucket.stats.public-access": { value: null,
          reason: "No public retained VDOM bucket stats accessor" } } } : null,
  })) });
const copy = (value) => structuredClone(value);
assert.equal(analyzeReceipt(mock("count"), "count").edits, 120);
assert.equal(analyzeReceipt(mock("off"), "off").timings, "ABSENT");
for (const change of [
  (value) => value.edits.pop(),
  (value) => { value.edits[0].receipt.completed = false; },
  (value) => { value.edits[0].receipt.counts["root.flush.entries"].unit = "unknown"; },
  (value) => { value.edits[0].receipt.missing["host.layout-paint"].value = 0; },
  (value) => { value.edits[0].output.identity.retainedChecked--; },
  (value) => { value.edits[0].latencyMs = 1; },
  (value) => { value.edits[0].receipt.route = "full-reconcile"; },
  (value) => { value.edits[0].receipt.coverageId = "unknown"; },
  (value) => { delete value.edits[0].receipt.counts["collection.preflight.operation-visits"]; },
  (value) => { value.edits[0].bucketStats.before = 0; },
]) {
  const invalid = copy(mock("count"));
  change(invalid);
  assert.throws(() => analyzeReceipt(invalid, "count"));
}
console.log("Recording B receipt analyzer synthetic checks PASS");
