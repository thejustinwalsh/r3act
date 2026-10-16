import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decisionRules, decisionRulesSha256, schedule, scheduleSha256 } from "./study-spec.mjs";

const stageDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(stageDirectory, "../..");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const resolveWorkspacePath = (filename) => path.isAbsolute(filename) ? filename : path.resolve(repositoryRoot, filename);
const configIndex = process.argv.indexOf("--config");
if (configIndex < 0 || !process.argv[configIndex + 1] || process.argv.length !== 4) {
  throw new Error("Usage: analyze.mjs --config FROZEN_CONFIG");
}
const configPath = path.resolve(process.argv[configIndex + 1]);
const configBytes = await readFile(configPath);
const config = JSON.parse(configBytes.toString("utf8"));
assert.equal(config.schemaVersion, "headless-high-frequency-config-v1");
assert.ok(Number.isFinite(config.preregisteredClockQuantumMs) && config.preregisteredClockQuantumMs > 0,
  "frozen preregistered timer quantum is required");
const outputPath = path.join(config.outputDirectory, "analysis.json");
const candidate = {
  status: resolveWorkspacePath(config.candidate.checkpointStatusPath),
  statusSha256: config.candidate.checkpointSha256,
  sourceArchive: resolveWorkspacePath(config.candidate.sourceArchivePath),
  sourceArchiveSha256: config.candidate.sourceArchiveSha256,
  sourceBuildLock: resolveWorkspacePath(config.candidate.sourceBuildLockPath),
  sourceBuildLockSha256: config.candidate.sourceBuildLockSha256,
  buildProof: resolveWorkspacePath(config.candidate.buildProofPath),
  buildProofSha256: config.candidate.buildProofSha256,
};
for (const [name, file, expected] of [
  ["checkpoint-status", candidate.status, candidate.statusSha256],
  ["source-archive", candidate.sourceArchive, candidate.sourceArchiveSha256],
  ["source-build-lock", candidate.sourceBuildLock, candidate.sourceBuildLockSha256],
  ["build-proof", candidate.buildProof, candidate.buildProofSha256],
]) {
  assert.equal(sha256(await readFile(file)), expected, name + " changed since the frozen config");
}
assert.equal(scheduleSha256.length, 64);
assert.equal(decisionRulesSha256.length, 64);

const readJson = async (file) => JSON.parse((await readFile(file)).toString("utf8"));
const pageFile = (sequence) => path.join(config.outputDirectory, "sequence-" + String(sequence).padStart(2, "0") + ".json");
const pairFile = (rows, pair) => path.join(config.outputDirectory, "pair-" + rows + "-" + String(pair).padStart(2, "0") + ".json");
const calibrationFile = (sequence, phase) => path.join(config.outputDirectory, "calibration-sequence-" + String(sequence).padStart(2, "0") + "-" + phase + ".json");
const median = (input) => {
  const values = [...input].sort((a, b) => a - b);
  const center = values.length / 2;
  return values.length % 2 ? values[Math.floor(center)] : (values[center - 1] + values[center]) / 2;
};
const p95 = (input) => {
  const values = [...input].sort((a, b) => a - b);
  return values[Math.ceil(values.length * 0.95) - 1];
};
const geometricMean = (values) => Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length);
const pages = [];
const pairs = [];
for (const scheduledPair of schedule) {
  const receiptPath = pairFile(scheduledPair.rows, scheduledPair.pair);
  const receipt = await readJson(receiptPath);
  assert.equal(receipt.schemaVersion, "headless-high-frequency-pair-receipt-v2");
  assert.equal(receipt.status, "PASS", "pair receipt failed: " + scheduledPair.pairId);
  assert.equal(receipt.scheduleSha256, scheduleSha256);
  assert.equal(receipt.decisionRulesSha256, decisionRulesSha256);
  assert.equal(receipt.configSha256, sha256(configBytes));
  assert.equal(receipt.pairId, scheduledPair.pairId);
  assert.equal(receipt.rows, scheduledPair.rows);
  assert.equal(receipt.pair, scheduledPair.pair);
  assert.equal(receipt.calibrationRecords?.length, 4, "pair requires before/after calibration for both pages");
  const calibrationRecords = [];
  for (const spec of scheduledPair.pages) for (const phase of ["before", "after"]) {
    const calibration = await readJson(calibrationFile(spec.sequence, phase));
    assert.equal(calibration.schemaVersion, "headless-high-frequency-calibration-v2");
    assert.equal(calibration.valid, true, "page calibration failed: " + spec.sequence + " " + phase);
    assert.equal(calibration.pageSequence, spec.sequence);
    assert.equal(calibration.phase, phase);
    assert.equal(calibration.pairId, scheduledPair.pairId);
    assert.equal(calibration.crossOriginIsolated, config.expectedCrossOriginIsolated);
    assert.ok(Number.isFinite(calibration.minPositiveQuantumMs) && calibration.minPositiveQuantumMs > 0);
    calibrationRecords.push(calibration);
  }
  const maxObservedQuantum = Math.max(...calibrationRecords.map((record) => record.minPositiveQuantumMs));
  const pairQuantum = Math.max(config.preregisteredClockQuantumMs, maxObservedQuantum);
  assert.equal(receipt.maxObservedClockQuantumMs, maxObservedQuantum);
  assert.equal(receipt.preregisteredClockQuantumMs, config.preregisteredClockQuantumMs);
  assert.equal(receipt.effectiveClockQuantumMs, pairQuantum);
  const pairPages = [];
  for (const scheduledPage of scheduledPair.pages) {
    const filename = pageFile(scheduledPage.sequence);
    const bytes = await readFile(filename);
    const record = JSON.parse(bytes.toString("utf8"));
    assert.equal(record.schemaVersion, "headless-high-frequency-page-v1");
    assert.equal(record.status, "PASS", "page failed: " + scheduledPage.sequence);
    assert.deepEqual(record.page, scheduledPage);
    assert.equal(record.pairId, scheduledPair.pairId);
    const before = calibrationRecords.find((item) => item.pageSequence === scheduledPage.sequence && item.phase === "before");
    const after = calibrationRecords.find((item) => item.pageSequence === scheduledPage.sequence && item.phase === "after");
    assert.equal(record.beforeCalibrationPath, calibrationFile(scheduledPage.sequence, "before"));
    assert.equal(record.afterCalibrationPath, calibrationFile(scheduledPage.sequence, "after"));
    assert.equal(record.beforeCalibrationQuantumMs, before.minPositiveQuantumMs);
    assert.equal(record.afterCalibrationQuantumMs, after.minPositiveQuantumMs);
    assert.equal(record.pairClockQuantumMs, Math.max(before.minPositiveQuantumMs, after.minPositiveQuantumMs));
    const samples = record.result.samples.map((sample) => sample.commitMs);
    assert.equal(samples.length, 240);
    const metric = { medianMs: median(samples), p95Ms: p95(samples) };
    const page = {
      sequence: scheduledPage.sequence,
      arm: scheduledPage.arm,
      rows: scheduledPage.rows,
      pair: scheduledPair.pair,
      pairId: scheduledPair.pairId,
      file: filename,
      sha256: sha256(bytes),
      metric,
    };
    pages.push(page);
    pairPages.push(page);
  }
  const byArm = Object.fromEntries(pairPages.map((page) => [page.arm, page]));
  const clockFloorMs = 5 * pairQuantum;
  const resolved = Object.values(byArm).every((arm) => arm.metric.medianMs >= clockFloorMs && arm.metric.p95Ms >= clockFloorMs);
  const paired = resolved ? {
    nativeToReactMedianRatio: byArm.native.metric.medianMs / byArm.react.metric.medianMs,
    nativeToReactP95Ratio: byArm.native.metric.p95Ms / byArm.react.metric.p95Ms,
  } : null;
  pairs.push({
    rows: scheduledPair.rows,
    pair: scheduledPair.pair,
    pairId: scheduledPair.pairId,
    pageSequences: pairPages.map((page) => page.sequence),
    clockQuantumMs: pairQuantum,
    maxObservedClockQuantumMs: maxObservedQuantum,
    clockFloorMs,
    resolved,
    react: byArm.react.metric,
    native: byArm.native.metric,
    paired,
  });
}
assert.equal(pages.length, 30);
assert.equal(pairs.length, 15);

const sizes = [128, 1024, 10000].map((rows) => {
  const sizePairs = pairs.filter((pair) => pair.rows === rows);
  const unresolved = sizePairs.filter((pair) => !pair.resolved);
  if (unresolved.length) return { rows, pairCount: sizePairs.length, unresolvedPairIds: unresolved.map((pair) => pair.pairId), gate: "UNRESOLVED" };
  const medianRatios = sizePairs.map((pair) => pair.paired.nativeToReactMedianRatio);
  const p95Ratios = sizePairs.map((pair) => pair.paired.nativeToReactP95Ratio);
  const pairedMedianGeometricMean = geometricMean(medianRatios);
  const pairedP95MedianRatio = median(p95Ratios);
  return {
    rows,
    pairCount: sizePairs.length,
    pairedMedianRatios: medianRatios,
    pairedP95Ratios: p95Ratios,
    pairedMedianGeometricMean,
    pairedP95MedianRatio,
    parity: pairedMedianGeometricMean <= 1 && pairedP95MedianRatio <= 1 ? "PASS" : "FAIL",
    strongerDenseWin: pairedMedianGeometricMean <= 0.8 ? "PASS" : "FAIL",
  };
});
const unresolvedSizes = sizes.filter((item) => item.gate === "UNRESOLVED");
const parity = unresolvedSizes.length
  ? "UNRESOLVED"
  : sizes.every((item) => item.parity === "PASS") ? "PASS" : "FAIL";
const denseWins = sizes.filter((item) => item.strongerDenseWin === "PASS").length;
const strongerDenseWin = unresolvedSizes.length ? "UNRESOLVED" : denseWins >= 2 ? "PASS" : "FAIL";
const status = parity === "UNRESOLVED" || strongerDenseWin === "UNRESOLVED"
  ? "UNRESOLVED"
  : parity === "PASS" && strongerDenseWin === "PASS" ? "PASS" : "FAIL";
const output = {
  schemaVersion: "headless-high-frequency-analysis-v1",
  status,
  interpretation: "Per-frame synchronous commit measurements; not whole-page CPU and not a paint/visual latency measurement.",
  candidate,
  config: { path: configPath, sha256: sha256(configBytes), studyId: config.studyId },
  schedule: { sha256: scheduleSha256, pageCount: pages.length, pairCount: pairs.length, sizes: [128, 1024, 10000] },
  decisionRules: { ...decisionRules, sha256: decisionRulesSha256 },
  gates: { parity, strongerDenseWin, qualification: status, denseWinSizes: denseWins },
  sizes,
  pairs,
  pages,
  limitations: [
    "One browser build, one source/build candidate, one headless environment, and one contiguous all-dirty homogeneous DOM workload.",
    "Five independent pairs per size provide limited p95 precision; report the fixed experiment, not a general tail distribution.",
    "Frame commitMs excludes RAF wait, dirty-ID selection, DOM inspection, correctness checks, paint, and display.",
  ],
};
await writeFile(outputPath, JSON.stringify(output, null, 2) + "\n", { flag: "wx" });
console.log("Analysis " + status + "; 30 pages retained; parity=" + parity + "; stronger dense win=" + strongerDenseWin);
