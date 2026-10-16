import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PendingStateChanges } from "../pending-direct-ack-stage-v3/src/pending_state_changes.ts";

const directory = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = fileURLToPath(import.meta.url);
const protocolPath = path.join(directory, "protocol.md");
const sourcePath = path.resolve(
  directory,
  "../pending-direct-ack-stage-v3/src/pending_state_changes.ts",
);
const rawPath = path.join(directory, "raw.ndjson");
const resultsPath = path.join(directory, "results.json");
const expectedSourceSha256 = "11afdb7111a2f1d399c5d32e7b429456b8004fc106b20277295eb011cb403e1e";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sourceBytes = readFileSync(sourcePath);
const sourceSha256 = sha256(sourceBytes);
assert.equal(sourceSha256, expectedSourceSha256, "Staged PendingStateChanges source changed");
assert.equal(existsSync(rawPath), false, "Refusing to overwrite raw.ndjson");
assert.equal(existsSync(resultsPath), false, "Refusing to overwrite results.json");
const nodeMajor = Number(process.versions.node.split(".")[0]);
assert.ok(nodeMajor >= 24, `Expected Node 24+, received ${process.versions.node}`);

const sizes = [128, 1024, 10_000];
const warmupBatches = 64;
const measuredBatches = 96;
const pairsPerOrder = 5;
const pairOrders = [
  ...Array(pairsPerOrder).fill("AB"),
  ...Array(pairsPerOrder).fill("BA"),
];
const descriptors = sizes.flatMap((size) => [
  { size, density: "sparse-1pct", activeCount: Math.max(1, Math.floor(size * 0.01)) },
  { size, density: "dense-100pct", activeCount: size },
]);

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

function summary(values) {
  return {
    count: values.length,
    medianNs: percentile(values, 0.5),
    p95Ns: percentile(values, 0.95),
  };
}

function buildHandles(size, activeCount) {
  const all = Array.from({ length: size }, (_, index) => Object.freeze({
    owner: index + 1,
    site: `site-${index}`,
    cellIdentity: Object.freeze({}),
  }));
  const active = [];
  for (let ordinal = 0; ordinal < activeCount; ordinal++) {
    const index = Math.floor(ordinal * size / activeCount);
    active.push(all[index]);
  }
  return active;
}

function makeBuffers(count, withKeys, capacity = count) {
  return {
    handles: Array(capacity),
    versions: Array(capacity).fill(0),
    keys: withKeys ? Array(capacity) : undefined,
  };
}

function scrub(buffers, count = buffers.handles.length) {
  for (let index = 0; index < count; index++) {
    buffers.handles[index] = undefined;
    buffers.versions[index] = 0;
    if (buffers.keys) buffers.keys[index] = undefined;
  }
}

function assertScrubbed(buffers) {
  assert.ok(buffers.handles.every((handle) => handle === undefined));
  assert.ok(buffers.versions.every((version) => version === 0));
  if (buffers.keys) assert.ok(buffers.keys.every((key) => key === undefined));
}

function successfulBatch(state, handles, buffers, arm, version) {
  for (const handle of handles) state.setCell(handle, version);
  const count = arm === "A"
    ? state.captureNative(buffers.handles, buffers.versions)
    : state.captureNativeWithKeys(buffers.handles, buffers.versions, buffers.keys);
  assert.equal(count, handles.length, `${arm} successful capture count`);
  if (arm === "A") {
    state.clearNativeThrough(buffers.handles, buffers.versions, count);
  } else {
    state.clearNativeThroughKeys(buffers.keys, buffers.handles, buffers.versions, count);
  }
  scrub(buffers, count);
}

function declinedBatch(state, handles, buffers, arm, version) {
  for (const handle of handles) state.setCell(handle, version);
  state.set({ owner: -1, site: "legacy", version });
  const count = arm === "A"
    ? state.captureNative(buffers.handles, buffers.versions)
    : state.captureNativeWithKeys(buffers.handles, buffers.versions, buffers.keys);
  assert.equal(count, null, `${arm} legacy capture must decline`);
  // Root clears the whole reusable cut capacity after native preflight declines.
  scrub(buffers);
  assert.equal(state.size, handles.length + 1, "Declined capture changed pending state");
}

function measure(fn) {
  const start = process.hrtime.bigint();
  fn();
  return Number(process.hrtime.bigint() - start);
}

function runAcceptedArm(arm, handles, order) {
  const state = new PendingStateChanges();
  const buffers = makeBuffers(handles.length, arm === "B");
  let version = 0;
  const execute = () => successfulBatch(state, handles, buffers, arm, ++version);
  const firstColdNs = measure(execute);
  assert.equal(state.size, 0, `${arm} cold cut left pending work`);
  assertScrubbed(buffers);
  for (let index = 0; index < warmupBatches; index++) execute();
  const samplesNs = [];
  for (let index = 0; index < measuredBatches; index++) {
    samplesNs.push(measure(execute));
    assert.equal(state.size, 0, `${arm} measured cut left pending work`);
    assertScrubbed(buffers);
  }
  state.clear();
  assert.equal(state.size, 0, `${arm} final clear left pending work`);
  assertScrubbed(buffers);
  return {
    arm,
    order,
    firstColdNs,
    samplesNs,
    postRunCleanup: { clearCalled: true, queueSize: state.size, buffersScrubbed: true },
  };
}

function cleanupDeclinedQueue(state) {
  const captured = state.capture();
  state.clearThrough(captured);
  assert.equal(state.size, 0, "Generic decline cleanup did not clear pending state");
}

function runDeclinedArm(arm, handles, order) {
  const state = new PendingStateChanges();
  const buffers = makeBuffers(handles.length, arm === "B", handles.length + 1);
  let version = 0;
  const execute = () => declinedBatch(state, handles, buffers, arm, ++version);
  const firstColdNs = measure(execute);
  assertScrubbed(buffers);
  cleanupDeclinedQueue(state);
  for (let index = 0; index < warmupBatches; index++) {
    execute();
    cleanupDeclinedQueue(state);
  }
  const samplesNs = [];
  for (let index = 0; index < measuredBatches; index++) {
    samplesNs.push(measure(execute));
    assertScrubbed(buffers);
    cleanupDeclinedQueue(state);
  }
  state.clear();
  assert.equal(state.size, 0, `${arm} final clear left pending work`);
  assertScrubbed(buffers);
  return {
    arm,
    order,
    firstColdNs,
    samplesNs,
    postRunCleanup: { clearCalled: true, queueSize: state.size, buffersScrubbed: true },
  };
}

const baselineSamples = new Map();
const keyedSamples = new Map();
const baselineCold = new Map();
const keyedCold = new Map();
const declineBaselineSamples = new Map();
const declineKeyedSamples = new Map();
const declineBaselineCold = new Map();
const declineKeyedCold = new Map();
const completedPairs = [];
let failure;

function runPair(caseName, descriptor, handles, pairIndex, order, runner) {
  const arms = [];
  for (const arm of order) {
    const record = runner(arm, handles, order);
    arms.push(record);
    appendFileSync(rawPath, `${JSON.stringify({
      recordType: "completed-arm",
      case: caseName,
      scenario: descriptor,
      pairIndex,
      order,
      result: record,
    })}\n`, { flag: "a" });
  }
  const baseline = arms.find((arm) => arm.arm === "A");
  const keyed = arms.find((arm) => arm.arm === "B");
  const pair = {
    recordType: "completed-pair",
    case: caseName,
    scenario: descriptor,
    pairIndex,
    order,
    baseline,
    keyed,
    keyedMinusBaselineNs: keyed.samplesNs.map((value, index) => value - baseline.samplesNs[index]),
  };
  completedPairs.push(pair);
  appendFileSync(rawPath, `${JSON.stringify(pair)}\n`, { flag: "a" });
  return { baseline, keyed };
}

try {
  for (const descriptor of descriptors) {
    const handles = buildHandles(descriptor.size, descriptor.activeCount);
    const scenario = {
      ...descriptor,
      effectiveDensity: descriptor.activeCount / descriptor.size,
    };
    const key = `${descriptor.size}:${descriptor.density}`;
    baselineSamples.set(key, []);
    keyedSamples.set(key, []);
    baselineCold.set(key, []);
    keyedCold.set(key, []);
    for (let pairIndex = 0; pairIndex < pairOrders.length; pairIndex++) {
      const order = pairOrders[pairIndex];
      const { baseline, keyed } = runPair(
        "accepted",
        scenario,
        handles,
        pairIndex,
        order,
        runAcceptedArm,
      );
      baselineSamples.get(key).push(...baseline.samplesNs);
      keyedSamples.get(key).push(...keyed.samplesNs);
      baselineCold.get(key).push(baseline.firstColdNs);
      keyedCold.get(key).push(keyed.firstColdNs);
    }
  }

  for (const descriptor of descriptors) {
    const handles = buildHandles(descriptor.size, descriptor.activeCount);
    const scenario = {
      ...descriptor,
      effectiveDensity: descriptor.activeCount / descriptor.size,
    };
    const key = `${descriptor.size}:${descriptor.density}`;
    declineBaselineSamples.set(key, []);
    declineKeyedSamples.set(key, []);
    declineBaselineCold.set(key, []);
    declineKeyedCold.set(key, []);
    for (let pairIndex = 0; pairIndex < pairOrders.length; pairIndex++) {
      const order = pairOrders[pairIndex];
      const { baseline, keyed } = runPair(
        "legacy-decline",
        scenario,
        handles,
        pairIndex,
        order,
        runDeclinedArm,
      );
      declineBaselineSamples.get(key).push(...baseline.samplesNs);
      declineKeyedSamples.get(key).push(...keyed.samplesNs);
      declineBaselineCold.get(key).push(baseline.firstColdNs);
      declineKeyedCold.get(key).push(keyed.firstColdNs);
    }
  }
} catch (error) {
  failure = String(error?.stack ?? error);
}

function summarizeWorkloads(descriptors, baselineSamples, keyedSamples, baselineCold, keyedCold) {
  return descriptors.map((descriptor) => {
    const key = `${descriptor.size}:${descriptor.density}`;
    const baselineValues = baselineSamples.get(key) ?? [];
    const keyedValues = keyedSamples.get(key) ?? [];
    const baselineColdValues = baselineCold.get(key) ?? [];
    const keyedColdValues = keyedCold.get(key) ?? [];
    const pairCount = Math.min(baselineValues.length, keyedValues.length);
    const deltas = [];
    for (let index = 0; index < pairCount; index++) {
      deltas.push(keyedValues[index] - baselineValues[index]);
    }
    return {
      ...descriptor,
      baseline: {
        samples: baselineValues.length ? summary(baselineValues) : null,
        firstCold: baselineColdValues.length ? summary(baselineColdValues) : null,
      },
      keyed: {
        samples: keyedValues.length ? summary(keyedValues) : null,
        firstCold: keyedColdValues.length ? summary(keyedColdValues) : null,
      },
      keyedMinusBaseline: deltas.length ? summary(deltas) : null,
    };
  });
}

const rawBytes = existsSync(rawPath) ? readFileSync(rawPath) : Buffer.alloc(0);
const result = {
  status: failure ? "ERROR" : "COMPLETE",
  scope: "PendingStateChanges queue cost only; no Root, React, VDOM, or browser claim",
  source: {
    path: path.relative(path.resolve(directory, "../.."), sourcePath),
    sha256: sourceSha256,
    expectedSha256: expectedSourceSha256,
  },
  tools: {
    script: path.basename(scriptPath),
    scriptSha256: sha256(readFileSync(scriptPath)),
    protocolSha256: sha256(readFileSync(protocolPath)),
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  configuration: {
    sizes,
    densities: ["sparse-1pct", "dense-100pct"],
    pairsPerOrder,
    totalPairsPerWorkload: pairOrders.length,
    pairOrders,
    timedAssertions: "capture-count/null assertions and queue mutation operations are inside the timer for both arms; queue-size, buffer-scrub, generic-cleanup, and final state.clear validation are outside",
    warmupBatches,
    measuredBatches,
    timingMethod: "process.hrtime.bigint; write+capture+ack+scrub included",
    genericDecline: "separate case; declined capture+full buffer scrub timed; generic snapshot/clear cleanup untimed and identical",
  },
  completedPairCount: completedPairs.length,
  rawNdjsonSha256: sha256(rawBytes),
  rawNdjsonBytes: rawBytes.length,
  acceptedSummary: summarizeWorkloads(
    descriptors,
    baselineSamples,
    keyedSamples,
    baselineCold,
    keyedCold,
  ),
  legacyDeclineSummary: summarizeWorkloads(
    descriptors,
    declineBaselineSamples,
    declineKeyedSamples,
    declineBaselineCold,
    declineKeyedCold,
  ),
  failure,
};
writeFileSync(resultsPath, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
if (failure) {
  console.error(`Diagnostic stopped after ${completedPairs.length} completed pairs; partial results preserved.`);
  console.error(failure);
  process.exitCode = 1;
} else {
  console.log(`Diagnostic complete: ${completedPairs.length} matched pairs.`);
}
