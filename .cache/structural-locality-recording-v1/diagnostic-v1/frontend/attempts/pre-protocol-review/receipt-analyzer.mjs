import { pageSchedule } from "../../model/schedule.mjs";

export const REQUIRED_COUNT_SITES = Object.freeze({
  "root.flush.entries": { unit: "event", site: "component_state_runtime.ts:flush" },
  "collection.copy-operation-callbacks": { unit: "iteration", site: "keyed_collection.ts:apply-copy" },
  "collection.preflight.operation-visits": { unit: "iteration", site: "keyed_collection.ts:apply-preflight" },
  "collection.delta.batch-visits": { unit: "iteration", site: "component_state_runtime.ts:flushCollectionDelta" },
  "collection.delta.operation-visits": { unit: "iteration", site: "component_state_runtime.ts:flushCollectionDelta" },
  "vdom.delta.validate-operation-visits": { unit: "iteration", site: "vdom_snapshot_runtime.ts:commitKeyedRegionDelta" },
  "vdom.delta.commit-operation-visits": { unit: "iteration", site: "vdom_snapshot_runtime.ts:commitKeyedRegionDelta" },
});

const assert = (condition, message) => { if (!condition) throw Error(message); };
const noTimingFields = (value, path = "result") => {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert(!/(?:duration|elapsed|latency|median|p95|startTime|endTime|performance|nanoseconds|milliseconds)/i
      .test(key), `timing field forbidden at ${path}.${key}`);
    noTimingFields(child, `${path}.${key}`);
  }
};

export function analyzeReceipt(result, mode) {
  assert(mode === "count" || mode === "off", "invalid mode");
  assert(result?.schemaVersion === "structural-count-page-v1", "wrong result schema");
  assert(result.status === "PASS" && result.mode === mode && result.size === 128,
    "wrong result status/mode/size");
  assert(result.error === null && Array.isArray(result.cleanupErrors) &&
    result.cleanupErrors.length === 0, "page error or disposal error");
  const schedule = pageSchedule({ size: 128, pairIndex: 0, arm: "native", pageKind: "count" });
  assert(result.scheduleId === schedule.id, "schedule identity drift");
  assert(Array.isArray(result.edits) && result.edits.length === 120, "expected all 120 edits");
  assert(Array.isArray(result.trace) &&
    result.trace.filter((item) => item.status === "PASS").length === 120 &&
    result.trace.some((item) => item.phase === "disposed"),
    "incomplete edit/disposal trace");
  noTimingFields(result);
  const units = new Set(["iteration", "lookup", "event", "length", "estimate", "gauge"]);
  const sampleCounts = new Map();
  for (let index = 0; index < schedule.trials.length; index++) {
    const expected = schedule.trials[index];
    const edit = result.edits[index];
    assert(edit.id === expected.id && edit.kind === expected.kind &&
      edit.trialIndex === expected.trialIndex &&
      edit.operationIndex === expected.operationIndex &&
      edit.sampleKind === expected.sampleKind, `schedule mismatch at ${index}`);
    assert(edit.changedKeys === expected.changedKeys &&
      edit.beforeSize === expected.beforeSize && edit.afterSize === expected.afterSize,
      `edit cardinality at ${index}`);
    assert(edit.output?.size === expected.afterSize &&
      /^[0-9a-f]{8}$/.test(edit.output.digest) && edit.output.sentinelSelected === true,
      `output digest/schema at ${index}`);
    assert(edit.reset?.size === expected.beforeSize &&
      /^[0-9a-f]{8}$/.test(edit.reset.digest), `reset digest/schema at ${index}`);
    assert(edit.output.identity?.retainedChecked === expected.beforeSize - expected.removedIds.length &&
      edit.output.identity?.newNotSeen === expected.addedIds.length &&
      edit.output.identity?.cleanedChecked === expected.removedIds.length,
      `edit identity evidence at ${index}`);
    assert(Number.isInteger(edit.reset.identity?.retainedChecked) &&
      Number.isInteger(edit.reset.identity?.newNotSeen) &&
      Number.isInteger(edit.reset.identity?.cleanedChecked), `reset identity evidence at ${index}`);
    assert(Number.isInteger(edit.selectionActions?.reset) &&
      Number.isInteger(edit.selectionActions?.preselection), `selection action evidence at ${index}`);
    assert(edit.lifecycle?.retained === edit.output.identity.retainedChecked &&
      edit.lifecycle?.mounted === expected.addedIds.length &&
      edit.lifecycle?.cleaned === expected.removedIds.length,
      `lifecycle evidence at ${index}`);
    assert(edit.path?.deltaOperations === expected.nativeOperations.length &&
      edit.path.renderFallback === 0, `delta path at ${index}`);
    const stats = edit.collection;
    assert(edit.bucketStats?.before === null && edit.bucketStats?.after === null &&
      typeof edit.bucketStats.reason === "string" && edit.bucketStats.reason.length > 0,
      `bucket gauge authority at ${index}`);
    assert(edit.bucketProfileGauge === null ||
      (Number.isSafeInteger(edit.bucketProfileGauge) && edit.bucketProfileGauge >= 0),
      `profile bucket-count gauge at ${index}`);
    for (const key of ["entryInspections", "anchorInspections", "listenerNotifications", "listenerErrors"])
      assert(Number.isSafeInteger(stats?.deltas?.[key]) && stats.deltas[key] >= 0,
        `collection delta ${key} at ${index}`);
    if (mode === "count") {
      const receipt = edit.receipt;
      assert(receipt?.label === expected.id && receipt.phase === "edit" &&
        receipt.coverageId === "recording-b-probe-coverage-v1" &&
        receipt.completed === true && receipt.route === "collection-delta" &&
        typeof receipt.rootId === "string" && receipt.rootId.length > 0 &&
        Array.isArray(receipt.bails) && receipt.bails.length === 0 &&
        Array.isArray(receipt.errors) && receipt.errors.length === 0,
        `count window incomplete at ${index}`);
      assert(receipt.counts && typeof receipt.counts === "object" &&
        Object.keys(receipt.counts).length > 0, `count values absent at ${index}`);
      for (const [name, expectedSite] of Object.entries(REQUIRED_COUNT_SITES)) {
        const count = receipt.counts[name];
        assert(count && count.value > 0 && count.unit === expectedSite.unit &&
          count.site === expectedSite.site, `required route site ${name} at ${index}`);
      }
      for (const [name, count] of Object.entries(receipt.counts))
        assert(Number.isSafeInteger(count.value) && count.value >= 0 &&
          units.has(count.unit) && typeof count.site === "string" && count.site.length > 0,
          `invalid count ${name} at ${index}`);
      assert(receipt.missing && typeof receipt.missing === "object" &&
        Object.keys(receipt.missing).length > 0, `missing-authority map absent at ${index}`);
      assert(receipt.missing["bucket.stats.public-access"]?.value === null &&
        typeof receipt.missing["bucket.stats.public-access"].reason === "string",
        `retained bucket stats must remain unresolved at ${index}`);
      for (const [name, missing] of Object.entries(receipt.missing))
        assert(missing.value === null && typeof missing.reason === "string" &&
          missing.reason.length > 0 && !Object.hasOwn(receipt.counts, name),
          `missing authority misreported as zero ${name} at ${index}`);
    } else assert(edit.receipt === null, `off mode has receipt at ${index}`);
    const label = `${expected.kind}:${expected.sampleKind}`;
    sampleCounts.set(label, (sampleCounts.get(label) ?? 0) + 1);
  }
  for (const trial of schedule.trials.slice(0, 12)) {
    assert(sampleCounts.get(`${trial.kind}:warmup`) === 2, `warmup count ${trial.kind}`);
    assert(sampleCounts.get(`${trial.kind}:measured`) === 8, `measured count ${trial.kind}`);
  }
  assert(result.final?.ownerCount === 0 && result.final?.readerCount === 0,
    "final root/reader not disposed");
  return { status: "PASS", mode, size: 128, edits: 120,
    warmupPerKind: 2, measuredPerKind: 8, timings: "ABSENT",
    requiredObservedSites: mode === "count" ? Object.keys(REQUIRED_COUNT_SITES) : [],
    absentConditionalCounts: mode === "count" ? "UNREACHED_OR_UNOBSERVED_NOT_ZERO" : "PROBE_OFF" };
}
