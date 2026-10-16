import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const verifierPath = fileURLToPath(import.meta.url);
const resultPath = path.join(directory, "results.json");
const rawPath = path.join(directory, "raw.ndjson");
const sourcePath = path.resolve(directory, "../pending-direct-ack-stage-v3/src/pending_state_changes.ts");
const collectorPath = path.join(directory, "queue_cost_diagnostic.mjs");
const protocolPath = path.join(directory, "protocol.md");
const verificationPath = path.join(directory, "verification.json");
const expectedSourceSha256 = "11afdb7111a2f1d399c5d32e7b429456b8004fc106b20277295eb011cb403e1e";
const expectedCollectorSha256 = "e18cd62fc7e8ceff8769107c32a3b76721ca78c2ed9989426bbfc5a638f1ef33";
const expectedProtocolSha256 = "6354761a0e23d8697a5a3c16761e1a46ad9ff0cd885d672c36bc92a337ea6ffd";
const expectedResultsSha256 = "edc828ad7fac9877d41b349ca2391c9243af12554733ebf13ddac7829676de6a";
const expectedRawSha256 = "5e6cf9090a7be6fd9d91a988aee922aa6d1cca6c5ba8ddb6069e8ec872e10cba";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const parseJson = (bytes, name) => {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`${name} is not valid JSON: ${String(error)}`);
  }
};
const median = (values) => {
  assert.ok(values.length > 0, "Cannot compute an empty median");
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
};
const geometricMean = (values) => {
  assert.ok(values.length > 0, "Cannot compute an empty geometric mean");
  for (const value of values) assert.ok(Number.isFinite(value) && value > 0);
  return Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length);
};
const scenarioKey = (scenario) => `${scenario.size}:${scenario.density}`;
const pairKey = (record) => `${record.case}|${scenarioKey(record.scenario)}|${record.pairIndex}`;
const ratio = (keyed, baseline) => {
  assert.ok(Number.isFinite(keyed) && keyed > 0, "Keyed duration must be finite and positive");
  assert.ok(Number.isFinite(baseline) && baseline > 0, "Baseline duration must be finite and positive");
  return keyed / baseline;
};

for (const filename of [resultPath, rawPath, sourcePath, collectorPath, protocolPath]) {
  assert.equal(existsSync(filename), true, `Missing locked input: ${filename}`);
}
assert.equal(existsSync(verificationPath), false, "Refusing to overwrite verification.json");

const resultBytes = readFileSync(resultPath);
const rawBytes = readFileSync(rawPath);
const sourceBytes = readFileSync(sourcePath);
const collectorBytes = readFileSync(collectorPath);
const protocolBytes = readFileSync(protocolPath);
const result = parseJson(resultBytes, "results.json");
const rawLines = rawBytes.toString("utf8").trimEnd().split("\n");
const rawRecords = rawLines.map((line, index) => parseJson(Buffer.from(line), `raw.ndjson line ${index + 1}`));

assert.equal(sha256(resultBytes), expectedResultsSha256);
assert.equal(sha256(rawBytes), expectedRawSha256);
assert.equal(result.status, "COMPLETE");
assert.match(result.scope, /queue cost only/);
assert.equal(result.source.path, ".cache/pending-direct-ack-stage-v3/src/pending_state_changes.ts");
assert.equal(result.source.sha256, expectedSourceSha256);
assert.equal(result.source.expectedSha256, expectedSourceSha256);
assert.equal(sha256(sourceBytes), expectedSourceSha256);
assert.equal(result.tools.scriptSha256, expectedCollectorSha256);
assert.equal(sha256(collectorBytes), expectedCollectorSha256);
assert.equal(result.tools.protocolSha256, expectedProtocolSha256);
assert.equal(sha256(protocolBytes), expectedProtocolSha256);
assert.equal(result.rawNdjsonSha256, sha256(rawBytes));
assert.equal(result.rawNdjsonBytes, rawBytes.length);
assert.equal(result.tools.node, "v24.18.0");
assert.equal(result.completedPairCount, 120);
assert.deepEqual(result.configuration.sizes, [128, 1024, 10000]);
assert.deepEqual(result.configuration.densities, ["sparse-1pct", "dense-100pct"]);
assert.equal(result.configuration.warmupBatches, 64);
assert.equal(result.configuration.measuredBatches, 96);
assert.equal(result.configuration.pairsPerOrder, 5);
assert.equal(result.configuration.totalPairsPerWorkload, 10);
assert.deepEqual(result.configuration.pairOrders, [
  "AB", "AB", "AB", "AB", "AB", "BA", "BA", "BA", "BA", "BA",
]);

const expectedWorkloads = [
  { size: 128, density: "sparse-1pct", activeCount: 1 },
  { size: 128, density: "dense-100pct", activeCount: 128 },
  { size: 1024, density: "sparse-1pct", activeCount: 10 },
  { size: 1024, density: "dense-100pct", activeCount: 1024 },
  { size: 10000, density: "sparse-1pct", activeCount: 100 },
  { size: 10000, density: "dense-100pct", activeCount: 10000 },
];
const expectedPairs = new Map();
const completedArms = new Map();
for (const record of rawRecords) {
  assert.ok(record.recordType === "completed-arm" || record.recordType === "completed-pair");
  assert.ok(record.case === "accepted" || record.case === "legacy-decline");
  assert.ok(expectedWorkloads.some((item) =>
    item.size === record.scenario.size &&
    item.density === record.scenario.density &&
    item.activeCount === record.scenario.activeCount
  ), "Unexpected workload in raw records");
  assert.ok(record.scenario.effectiveDensity === record.scenario.activeCount / record.scenario.size);
  assert.equal(record.order, result.configuration.pairOrders[record.pairIndex]);
  assert.ok(record.pairIndex >= 0 && record.pairIndex < 10);
  const key = pairKey(record);
  if (record.recordType === "completed-arm") {
    assert.ok(record.result.arm === "A" || record.result.arm === "B");
    assert.equal(record.result.order, record.order);
    assert.equal(record.result.samplesNs.length, 96);
    assert.ok(Number.isFinite(record.result.firstColdNs) && record.result.firstColdNs > 0);
    for (const duration of record.result.samplesNs) {
      assert.ok(Number.isFinite(duration) && duration > 0);
    }
    assert.deepEqual(record.result.postRunCleanup, {
      clearCalled: true,
      queueSize: 0,
      buffersScrubbed: true,
    });
    const armKey = `${key}|${record.result.arm}`;
    assert.equal(completedArms.has(armKey), false, `Duplicate completed arm ${armKey}`);
    completedArms.set(armKey, record.result);
  } else {
    assert.equal(expectedPairs.has(key), false, `Duplicate completed pair ${key}`);
    expectedPairs.set(key, record);
  }
}

assert.equal(expectedPairs.size, 120);
assert.equal(completedArms.size, 240);
assert.equal(rawRecords.length, 360);
const verifiedPairs = [];
for (const [key, pair] of expectedPairs) {
  const baseline = completedArms.get(`${key}|A`);
  const keyed = completedArms.get(`${key}|B`);
  assert.ok(baseline && keyed, `Missing arm for ${key}`);
  assert.equal(pair.baseline.arm, "A");
  assert.equal(pair.keyed.arm, "B");
  assert.deepEqual(pair.baseline, baseline);
  assert.deepEqual(pair.keyed, keyed);
  assert.deepEqual(
    pair.keyedMinusBaselineNs,
    keyed.samplesNs.map((value, index) => value - baseline.samplesNs[index]),
  );
  verifiedPairs.push({ pair, baseline, keyed });
}

function collectorPercentile(values, p) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.ceil(p * ordered.length) - 1)];
}
function verifyCollectorSummary(caseName, summaryName) {
  const summaryRows = result[summaryName];
  assert.equal(summaryRows.length, expectedWorkloads.length, `${summaryName} workload count`);
  for (const workload of expectedWorkloads) {
    const row = summaryRows.find((item) =>
      item.size === workload.size && item.density === workload.density
    );
    assert.ok(row, `Missing ${summaryName} row ${scenarioKey(workload)}`);
    for (const armName of ["baseline", "keyed"]) {
      const arm = armName === "baseline" ? "A" : "B";
      const matching = verifiedPairs.filter(({ pair }) =>
        pair.case === caseName &&
        pair.scenario.size === workload.size &&
        pair.scenario.density === workload.density
      ).map((entry) => entry[armName]);
      const samples = matching.flatMap((entry) => entry.samplesNs);
      const cold = matching.map((entry) => entry.firstColdNs);
      assert.equal(row[armName].samples.count, samples.length);
      assert.equal(row[armName].samples.medianNs, collectorPercentile(samples, 0.5));
      assert.equal(row[armName].samples.p95Ns, collectorPercentile(samples, 0.95));
      assert.equal(row[armName].firstCold.count, cold.length);
      assert.equal(row[armName].firstCold.medianNs, collectorPercentile(cold, 0.5));
      assert.equal(row[armName].firstCold.p95Ns, collectorPercentile(cold, 0.95));
    }
  }
}
verifyCollectorSummary("accepted", "acceptedSummary");
verifyCollectorSummary("legacy-decline", "legacyDeclineSummary");

for (const workload of expectedWorkloads) {
  for (const caseName of ["accepted", "legacy-decline"]) {
    const matching = verifiedPairs.filter(({ pair }) =>
      pair.case === caseName &&
      pair.scenario.size === workload.size &&
      pair.scenario.density === workload.density
    );
    assert.equal(matching.length, 10, `${caseName}/${scenarioKey(workload)} pair count`);
    assert.equal(matching.filter(({ pair }) => pair.order === "AB").length, 5);
    assert.equal(matching.filter(({ pair }) => pair.order === "BA").length, 5);
  }
}

const pairedSummaries = [];
for (const workload of expectedWorkloads) {
  for (const caseName of ["accepted", "legacy-decline"]) {
    const matching = verifiedPairs.filter(({ pair }) =>
      pair.case === caseName &&
      pair.scenario.size === workload.size &&
      pair.scenario.density === workload.density
    );
    const warmPairRatios = matching.map(({ baseline, keyed }) =>
      ratio(median(keyed.samplesNs), median(baseline.samplesNs))
    );
    const coldPairRatios = matching.map(({ baseline, keyed }) =>
      ratio(keyed.firstColdNs, baseline.firstColdNs)
    );
    pairedSummaries.push({
      case: caseName,
      workload,
      pairing: "ratio of each matched pair's keyed/baseline median over 96 measured batches",
      warmPairRatios,
      warmGeometricMeanBOverA: geometricMean(warmPairRatios),
      coldPairRatios,
      coldGeometricMeanBOverA: geometricMean(coldPairRatios),
    });
  }
}

const verification = {
  status: "PASS",
  scope: "Independent integrity/completeness and paired-median recomputation for a Node queue-only diagnostic; no Root/React/VDOM/browser performance claim",
  inputs: {
    resultsJson: { path: path.basename(resultPath), sha256: sha256(resultBytes) },
    rawNdjson: { path: path.basename(rawPath), sha256: sha256(rawBytes), bytes: rawBytes.length, records: rawRecords.length },
    source: { path: result.source.path, sha256: sha256(sourceBytes) },
    collector: { path: path.basename(collectorPath), sha256: sha256(collectorBytes) },
    protocol: { path: path.basename(protocolPath), sha256: sha256(protocolBytes) },
    verifier: { path: path.basename(verifierPath), sha256: sha256(readFileSync(verifierPath)) },
  },
  configurationVerified: {
    sizes: [128, 1024, 10000],
    densities: ["sparse-1pct", "dense-100pct"],
    matchedPairsPerWorkload: 10,
    orderCounts: { AB: 5, BA: 5 },
    armRecords: 240,
    pairRecords: 120,
    measuredSamplesPerArm: 96,
    warmupBatchesPerArm: 64,
    cleanupAssertionsPassed: 240,
  },
  recomputation: {
    method: "For every matched pair, compute the median of that arm's 96 durations; divide keyed median by baseline median; report geometric mean of the ten pair ratios. Cold ratios use each pair's separate firstColdNs values. Generic legacy-decline and accepted cases remain separate.",
    pairedSummaries,
  },
  interpretationLimit: "Results describe only this Node PendingStateChanges queue harness. They do not establish React, Root, VDOM, or product-level gains.",
};

writeFileSync(verificationPath, `${JSON.stringify(verification, null, 2)}\n`, { flag: "wx" });
console.log(`Verified ${expectedPairs.size} matched pairs and wrote ${path.basename(verificationPath)}.`);
