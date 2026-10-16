import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildProofErrors, sourceLockCoverageErrors } from "./verifier-contract.mjs";

const stageDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(stageDirectory, "../..");
const selfPath = fileURLToPath(import.meta.url);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const resolveWorkspacePath = (filename) => path.isAbsolute(filename) ? filename : path.resolve(repositoryRoot, filename);
const cliIndex = process.argv.indexOf("--config");
if (cliIndex < 0 || !process.argv[cliIndex + 1] || process.argv.length !== 4) {
  throw new Error("Usage: verify.mjs --config FROZEN_CONFIG");
}
const configPath = path.resolve(process.argv[cliIndex + 1]);
const configBytes = await readFile(configPath);
const config = JSON.parse(configBytes.toString("utf8"));
const outputDirectory = path.resolve(config.outputDirectory);
const verificationPath = path.join(outputDirectory, "verification.json");
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const readJson = async (filename) => JSON.parse((await readFile(filename)).toString("utf8"));
const exactKeys = (value, expected) => value && typeof value === "object" &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
const finite = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
const arraysEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sizes = [128, 1024, 10000];
const pairsPerSize = 5;
const warmupFrames = 60;
const measuredFrames = 240;
const viewport = { width: 1200, height: 900 };
const rules = {
  schemaVersion: "headless-high-frequency-decision-v1",
  parity: { pairedMedianGeometricMeanAtMost: 1, pairedP95MedianAtMost: 1, requiredSizes: "all-three" },
  strongerDenseWin: { pairedMedianGeometricMeanAtMost: 0.8, requiredSizes: "at-least-two-of-three" },
  pairedDenominatorFloor: "five-times-the-maximum-of-frozen-preregistered-and-all-pair-before-after-positive-performance-now-quanta",
  unresolvedPolicy: "keep all records; do not exclude, replace, or infer a gate result when any arm median or p95 is below the floor",
  repetitionPrecision: "five independent pairs per size; p95 precision is limited by five page-pairs and 240 frame observations per page",
};
const scheduledPairs = sizes.flatMap((rows, sizeIndex) => Array.from({ length: pairsPerSize }, (_, pair) => {
  const arms = pair % 2 === 0 ? ["react", "native"] : ["native", "react"];
  return {
    rows,
    pair,
    pairId: rows + "-" + String(pair).padStart(2, "0"),
    order: arms,
    pages: arms.map((arm, withinPair) => ({
      sequence: sizeIndex * pairsPerSize * 2 + pair * 2 + withinPair,
      arm,
      rows,
      dirty: "all",
      placement: "contiguous",
      programs: "homogeneous",
    })),
  };
}));
const canonical = (value) => {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  return JSON.stringify(value);
};
const fingerprint = (value) => sha256(Buffer.from(canonical(value)));
const scheduleHash = fingerprint({ schemaVersion: "headless-high-frequency-schedule-v1", sizes, pairsPerSize, warmupFrames, measuredFrames, viewport, schedule: scheduledPairs });
const rulesHash = fingerprint(rules);
const expectedNames = [
  "analysis.json",
  ...scheduledPairs.flatMap((pair) => [
    "pair-" + pair.rows + "-" + String(pair.pair).padStart(2, "0") + ".json",
    ...pair.pages.flatMap((page) => [
      "calibration-sequence-" + String(page.sequence).padStart(2, "0") + "-before.json",
      "calibration-sequence-" + String(page.sequence).padStart(2, "0") + "-after.json",
    ]),
    ...pair.pages.map((page) => "sequence-" + String(page.sequence).padStart(2, "0") + ".json"),
  ]),
].sort();
let status = "PASS";
let detail = null;
let analysis = null;
try {
  check(config.schemaVersion === "headless-high-frequency-config-v1", "wrong config schema");
  check(config.studyId && !config.studyId.startsWith("fill-"), "study id is not frozen");
  check(config.candidate.expectedCheckpointStatus && !config.candidate.expectedCheckpointStatus.startsWith("FILL"),
    "exact frozen candidate status value is missing");
  check(config.origin.startsWith("https://") && config.origin.includes(".localhost"), "origin is not Portless HTTPS");
  check(config.htmlPath === "/high-frequency.html", "unexpected production HTML path");
  check(config.expectedCrossOriginIsolated === true, "expected isolated page mode is not frozen");
  check(Number.isFinite(config.preregisteredClockQuantumMs) && config.preregisteredClockQuantumMs > 0,
    "positive preregistered timer quantum is missing");
  const outputNames = (await readdir(outputDirectory)).sort();
  check(arraysEqual(outputNames, expectedNames), "output directory contains missing or unexpected evidence files");

  const candidateChecks = [
    ["status", config.candidate.checkpointStatusPath, config.candidate.checkpointSha256],
    ["source archive", config.candidate.sourceArchivePath, config.candidate.sourceArchiveSha256],
    ["source/build lock", config.candidate.sourceBuildLockPath, config.candidate.sourceBuildLockSha256],
    ["build proof", config.candidate.buildProofPath, config.candidate.buildProofSha256],
  ];
  for (const [label, name, expected] of candidateChecks) {
    const actual = sha256(await readFile(resolveWorkspacePath(name)));
    check(actual === expected, "candidate " + label + " hash mismatch");
  }
  const checkpointStatus = await readJson(resolveWorkspacePath(config.candidate.checkpointStatusPath));
  check(checkpointStatus?.status === config.candidate.expectedCheckpointStatus, "candidate checkpoint status does not match frozen expected status");
  check((checkpointStatus?.sourceArchiveSha256 ?? checkpointStatus?.archiveSha256) === config.candidate.sourceArchiveSha256,
    "candidate checkpoint does not bind the configured source archive");
  const sourceLocks = await readJson(resolveWorkspacePath(config.candidate.sourceBuildLockPath));
  for (const message of sourceLockCoverageErrors(sourceLocks)) check(false, message);
  for (const [filename, expected] of Object.entries(sourceLocks)) check(/^[a-f0-9]{64}$/.test(expected), "invalid source/build SHA lock: " + filename);
  const sourceLockChecks = [];
  for (const [filename, expected] of Object.entries(sourceLocks)) {
    const actual = sha256(await readFile(resolveWorkspacePath(filename)));
    sourceLockChecks.push({ path: filename, expected, actual });
    check(actual === expected, "frozen source/build path changed: " + filename);
  }
  check(sourceLockChecks.length > 0, "empty source/build lock");
  const buildProof = await readJson(resolveWorkspacePath(config.candidate.buildProofPath));
  for (const message of buildProofErrors(buildProof, sourceLocks)) check(false, message);

  const localAssetEvidence = [];
  check(Array.isArray(config.productionAssets) && config.productionAssets.length === 5, "five production assets are required");
  for (const asset of config.productionAssets) {
    const actual = sha256(await readFile(path.join(config.distDirectory, asset.file)));
    localAssetEvidence.push({ urlPath: asset.urlPath, expected: asset.sha256, actual });
    check(actual === asset.sha256, "local production asset mismatch: " + asset.file);
  }
  const expectedByPath = new Map(config.productionAssets.map((asset) => [asset.urlPath, asset]));
  check(expectedByPath.size === 5, "duplicate production asset path");
  const recordsBySequence = new Map();
  const calculatedPairs = [];
  for (const scheduledPair of scheduledPairs) {
    const id = scheduledPair.pairId;
    const pairPath = path.join(outputDirectory, "pair-" + scheduledPair.rows + "-" + String(scheduledPair.pair).padStart(2, "0") + ".json");
    const pairRecord = await readJson(pairPath);
    check(pairRecord.schemaVersion === "headless-high-frequency-pair-receipt-v2", id + " pair schema");
    check(pairRecord.status === "PASS" && pairRecord.stopReason === null && pairRecord.durationMs <= 90_000 &&
      pairRecord.pairId === id && pairRecord.rows === scheduledPair.rows && pairRecord.pair === scheduledPair.pair, id + " pair status/configuration/deadline");
    check(pairRecord.configSha256 === sha256(configBytes) && pairRecord.scheduleSha256 === scheduleHash && pairRecord.decisionRulesSha256 === rulesHash, id + " pair locks");
    check(pairRecord.sourceBuildFileCount === sourceLockChecks.length && pairRecord.sourceBuildLocksSha256 === config.candidate.sourceBuildLockSha256, id + " source inventory lock");
    check(pairRecord.sourceArchiveSha256 === config.candidate.sourceArchiveSha256 && pairRecord.buildProofSha256 === config.candidate.buildProofSha256, id + " candidate build lock");
    check(pairRecord.localAssets?.length === localAssetEvidence.length && pairRecord.localAssets.every((asset, index) =>
      asset.urlPath === config.productionAssets[index].urlPath && asset.sha256 === config.productionAssets[index].sha256 &&
      asset.actualSha256 === config.productionAssets[index].sha256 && asset.matches === true), id + " local asset locks");
    const calibrations = [];
    for (const pageSpec of scheduledPair.pages) for (const phase of ["before", "after"]) {
      const filename = "calibration-sequence-" + String(pageSpec.sequence).padStart(2, "0") + "-" + phase + ".json";
      const calibration = await readJson(path.join(outputDirectory, filename));
      check(calibration.schemaVersion === "headless-high-frequency-calibration-v2" && calibration.valid === true &&
        calibration.pairId === id && calibration.pageSequence === pageSpec.sequence && calibration.phase === phase && calibration.status === 200,
      filename + " clock calibration");
      check(calibration.crossOriginIsolated === config.expectedCrossOriginIsolated, filename + " bare-page isolation");
      check(calibration.headers?.["cross-origin-opener-policy"] === config.expectedIsolationHeaders["cross-origin-opener-policy"], filename + " bare-page COOP");
      check(calibration.headers?.["cross-origin-embedder-policy"] === config.expectedIsolationHeaders["cross-origin-embedder-policy"], filename + " bare-page COEP");
      check(Number.isFinite(calibration.minPositiveQuantumMs) && calibration.minPositiveQuantumMs > 0 && calibration.positiveSteps > 0,
        filename + " timer quantum");
      check(typeof calibration.browserVersion === "string" && calibration.browserVersion.length > 0, filename + " browser engine version");
      check(calibration.harnessResultAbsent === true && calibration.blockedScripts?.length > 0, filename + " bare-page verification");
      check(calibration.htmlSha256 === expectedByPath.get(config.htmlPath)?.sha256, filename + " bare-page served HTML hash");
      calibrations.push(calibration);
    }
    const maxQuantum = Math.max(...calibrations.map((item) => item.minPositiveQuantumMs));
    const effectiveQuantum = Math.max(config.preregisteredClockQuantumMs, maxQuantum);
    check(pairRecord.calibrationRecords?.length === 4 && pairRecord.maxObservedClockQuantumMs === maxQuantum &&
      pairRecord.preregisteredClockQuantumMs === config.preregisteredClockQuantumMs &&
      pairRecord.effectiveClockQuantumMs === effectiveQuantum && pairRecord.clockFloorMs === 5 * effectiveQuantum,
    id + " fixed preregistered/four-point clock denominator");
    const calibrationManifest = pairRecord.calibrationRecords ?? [];
    check(calibrationManifest.every((item, index) => item.valid === true && item.phase === calibrations[index]?.phase &&
      item.pageSequence === calibrations[index]?.pageSequence && item.minPositiveQuantumMs === calibrations[index]?.minPositiveQuantumMs &&
      path.resolve(item.path) === path.join(outputDirectory,
        "calibration-sequence-" + String(item.pageSequence).padStart(2, "0") + "-" + item.phase + ".json")),
    id + " receipt calibration metadata");

    const pairPageMetrics = [];
    for (const pageSpec of scheduledPair.pages) {
      const filename = "sequence-" + String(pageSpec.sequence).padStart(2, "0") + ".json";
      const pagePath = path.join(outputDirectory, filename);
      const pageBytes = await readFile(pagePath);
      const page = JSON.parse(pageBytes.toString("utf8"));
      recordsBySequence.set(pageSpec.sequence, { page, bytes: pageBytes });
      check(page.schemaVersion === "headless-high-frequency-page-v1" && page.status === "PASS", filename + " status/schema");
      check(arraysEqual([page.page.sequence, page.page.arm, page.page.rows, page.page.dirty, page.page.placement, page.page.programs],
        [pageSpec.sequence, pageSpec.arm, pageSpec.rows, "all", "contiguous", "homogeneous"]), filename + " schedule");
      const before = calibrations.find((item) => item.pageSequence === pageSpec.sequence && item.phase === "before");
      const after = calibrations.find((item) => item.pageSequence === pageSpec.sequence && item.phase === "after");
      check(page.pairId === id && page.beforeCalibrationPath === "calibration-sequence-" + String(pageSpec.sequence).padStart(2, "0") + "-before.json" &&
        page.afterCalibrationPath === "calibration-sequence-" + String(pageSpec.sequence).padStart(2, "0") + "-after.json" &&
        page.beforeCalibrationQuantumMs === before?.minPositiveQuantumMs && page.afterCalibrationQuantumMs === after?.minPositiveQuantumMs &&
        page.pairClockQuantumMs === Math.max(before?.minPositiveQuantumMs ?? Infinity, after?.minPositiveQuantumMs ?? Infinity), filename + " pair clock binding");
      check(page.url === new URL(config.htmlPath + "?arm=" + pageSpec.arm + "&rows=" + pageSpec.rows + "&dirty=all&placement=contiguous&programs=homogeneous", config.origin).toString(), filename + " URL");
      check(page.browser?.headless === true && page.browser?.gpu === false && page.browser?.viewport?.width === 1200 && page.browser?.viewport?.height === 900, filename + " browser settings");
      check(page.browser?.crossOriginIsolated === true && typeof page.browser?.userAgent === "string" && page.browser.userAgent.length > 0, filename + " page browser metadata");
      check(page.navigation?.status === 200, filename + " navigation status");
      check(page.navigation?.headers?.["cross-origin-opener-policy"] === config.expectedIsolationHeaders["cross-origin-opener-policy"], filename + " COOP");
      check(page.navigation?.headers?.["cross-origin-embedder-policy"] === config.expectedIsolationHeaders["cross-origin-embedder-policy"], filename + " COEP");
      check(Array.isArray(page.pageErrors) && page.pageErrors.length === 0, filename + " browser errors");
      check(page.executionError === null && Array.isArray(page.validationErrors) && page.validationErrors.length === 0, filename + " collector errors");
      check(page.result?.schemaVersion === "current-product-high-frequency-v1" && page.result.status === "PASS", filename + " harness status");
      check(page.result?.production === true && page.result.arm === pageSpec.arm && page.result.rows === pageSpec.rows, filename + " production/arm/size");
      check(page.result?.userAgent === page.browser?.userAgent, filename + " user agent binding");
      check(page.result?.dirty === "all" && page.result.placement === "contiguous" && page.result.programs === "homogeneous", filename + " workload");
      check(page.result?.warmupFrames === warmupFrames && page.result.measuredFrames === measuredFrames, filename + " frame targets");
      check(exactKeys(page.result.checks, ["output", "order", "identity", "lifecycle", "deadSetters", "visible"]) && Object.values(page.result.checks).every(Boolean), filename + " correctness checks");
      check(Array.isArray(page.result.errors) && page.result.errors.length === 0, filename + " harness errors");
      check(page.result.checks?.visible === true, filename + " visibility");
      check(page.result.active?.mounts === pageSpec.rows && page.result.active?.cleanups === 0 && page.result.active?.writers === pageSpec.rows, filename + " active lifecycle");
      check(page.result.afterDispose?.mounts === pageSpec.rows && page.result.afterDispose?.cleanups === pageSpec.rows && page.result.afterDispose?.writers === 0, filename + " disposed lifecycle");
      check(page.result.deadSetterProbeCount === pageSpec.rows && page.result.deadSetterThrows === (pageSpec.arm === "native" ? pageSpec.rows : 0), filename + " dead setters");
      check(Array.isArray(page.result.warmupSamples) && page.result.warmupSamples.length === warmupFrames, filename + " warmup sample count");
      check(Array.isArray(page.result.samples) && page.result.samples.length === measuredFrames, filename + " measured sample count");
      for (const [index, sample] of (page.result.warmupSamples ?? []).entries()) {
        check(sample.frame === index + 1 && finite(sample.commitMs) && finite(sample.intervalMs), filename + " warmup sample " + index);
      }
      for (const [index, sample] of (page.result.samples ?? []).entries()) {
        check(sample.frame === index + warmupFrames + 1 && sample.dirtyCount === pageSpec.rows && finite(sample.commitMs) && finite(sample.intervalMs), filename + " measured sample " + index);
      }
      const expectedArm = pageSpec.arm === "native" ? "/assets/native_high_frequency_arm-" : "/assets/react_high_frequency_arm-";
      const resources = page.loadedBuildResources ?? [];
      check(resources.length > 0 && resources.every((resource) =>
        resource.status === 200 && resource.matches === true && resource.actualSha256 === resource.expectedSha256 &&
        expectedByPath.has(resource.path) && expectedByPath.get(resource.path).sha256 === resource.expectedSha256), filename + " served asset hashes");
      check(resources.some((resource) => resource.path.includes(expectedArm)), filename + " active arm asset");
      const sharedScript = config.productionAssets.find((asset) => asset.urlPath.endsWith(".js") && !asset.urlPath.includes("native_high_frequency_arm-") && !asset.urlPath.includes("react_high_frequency_arm-"));
      const stylesheet = config.productionAssets.find((asset) => asset.urlPath.endsWith(".css"));
      check(resources.some((resource) => resource.path === config.htmlPath), filename + " production HTML response");
      check(sharedScript && resources.some((resource) => resource.path === sharedScript.urlPath), filename + " shared application script");
      check(stylesheet && resources.some((resource) => resource.path === stylesheet.urlPath), filename + " stylesheet");
      const oppositeArm = pageSpec.arm === "native" ? "/assets/react_high_frequency_arm-" : "/assets/native_high_frequency_arm-";
      check(!resources.some((resource) => resource.path.includes(oppositeArm)), filename + " opposite arm asset absent");
      const times = (page.result.samples ?? []).map((sample) => sample.commitMs);
      const sorted = [...times].sort((left, right) => left - right);
      const center = sorted.length / 2;
      const medianMs = sorted.length % 2 ? sorted[Math.floor(center)] : (sorted[center - 1] + sorted[center]) / 2;
      const p95Ms = sorted[Math.ceil(sorted.length * 0.95) - 1];
      pairPageMetrics.push({ sequence: pageSpec.sequence, arm: pageSpec.arm, rows: pageSpec.rows, pair: scheduledPair.pair, medianMs, p95Ms, rawSha256: sha256(pageBytes) });
    }
    check(pairRecord.pageRecords?.length === 2 && pairRecord.pageRecords.every((item, index) =>
      item.sequence === pairPageMetrics[index].sequence && item.arm === pairPageMetrics[index].arm &&
      item.rows === scheduledPair.rows && item.status === "PASS" &&
      item.sha256 === pairPageMetrics[index].rawSha256), id + " pair receipt page hashes");
    const byArm = Object.fromEntries(pairPageMetrics.map((item) => [item.arm, item]));
    const floorMs = 5 * effectiveQuantum;
    const resolved = [byArm.react, byArm.native].every((arm) => arm.medianMs >= floorMs && arm.p95Ms >= floorMs);
    const paired = resolved
      ? { medianRatio: byArm.native.medianMs / byArm.react.medianMs, p95Ratio: byArm.native.p95Ms / byArm.react.p95Ms }
      : null;
    calculatedPairs.push({
      rows: scheduledPair.rows,
      pair: scheduledPair.pair,
      pairId: id,
      pageSequences: pairPageMetrics.map((page) => page.sequence),
      clockQuantumMs: effectiveQuantum,
      maxObservedClockQuantumMs: maxQuantum,
      clockFloorMs: floorMs,
      resolved,
      react: { medianMs: byArm.react.medianMs, p95Ms: byArm.react.p95Ms },
      native: { medianMs: byArm.native.medianMs, p95Ms: byArm.native.p95Ms },
      paired: resolved ? {
        nativeToReactMedianRatio: byArm.native.medianMs / byArm.react.medianMs,
        nativeToReactP95Ratio: byArm.native.p95Ms / byArm.react.p95Ms,
      } : null,
    });
  }

  const medianOf = (values) => {
    const sorted = [...values].sort((left, right) => left - right);
    const center = sorted.length / 2;
    return sorted.length % 2 ? sorted[Math.floor(center)] : (sorted[center - 1] + sorted[center]) / 2;
  };
  const geomean = (values) => Math.exp(values.reduce((total, value) => total + Math.log(value), 0) / values.length);
  const recomputedSizes = sizes.map((rows) => {
    const subset = calculatedPairs.filter((pair) => pair.rows === rows);
    const resolved = subset.every((pair) => pair.resolved);
    if (!resolved) return { rows, gate: "UNRESOLVED" };
    const medians = subset.map((pair) => pair.paired.nativeToReactMedianRatio);
    const p95s = subset.map((pair) => pair.paired.nativeToReactP95Ratio);
    const medianGeomean = geomean(medians);
    const p95Median = medianOf(p95s);
    return {
      rows,
      pairedMedianRatios: medians,
      pairedP95Ratios: p95s,
      pairedMedianGeometricMean: medianGeomean,
      pairedP95MedianRatio: p95Median,
      parity: medianGeomean <= 1 && p95Median <= 1 ? "PASS" : "FAIL",
      strongerDenseWin: medianGeomean <= 0.8 ? "PASS" : "FAIL",
    };
  });
  const hasUnresolved = recomputedSizes.some((item) => item.gate === "UNRESOLVED");
  const parityGate = hasUnresolved ? "UNRESOLVED" : recomputedSizes.every((item) => item.parity === "PASS") ? "PASS" : "FAIL";
  const winCount = recomputedSizes.filter((item) => item.strongerDenseWin === "PASS").length;
  const strongGate = hasUnresolved ? "UNRESOLVED" : winCount >= 2 ? "PASS" : "FAIL";
  const computedStatus = hasUnresolved ? "UNRESOLVED" : parityGate === "PASS" && strongGate === "PASS" ? "PASS" : "FAIL";
  analysis = await readJson(path.join(outputDirectory, "analysis.json"));
  check(analysis.schemaVersion === "headless-high-frequency-analysis-v1", "analysis schema");
  check(analysis.status === computedStatus && analysis.gates?.qualification === computedStatus, "analysis overall gate differs from independent recomputation");
  check(analysis.gates?.parity === parityGate && analysis.gates?.strongerDenseWin === strongGate, "analysis gate fields differ from independent recomputation");
  check(analysis.schedule?.pageCount === 30 && analysis.schedule?.pairCount === 15 && analysis.schedule?.sha256 === scheduleHash, "analysis schedule lock");
  check(analysis.decisionRules?.sha256 === rulesHash, "analysis decision-rule lock");
  check(arraysEqual(analysis.pairs, calculatedPairs), "analysis paired calculations differ from verifier recomputation");
  for (let index = 0; index < recomputedSizes.length; index++) {
    const actual = analysis.sizes[index];
    const expected = recomputedSizes[index];
    check(actual?.rows === expected.rows && actual?.parity === expected.parity && actual?.strongerDenseWin === expected.strongerDenseWin &&
      actual?.pairedMedianGeometricMean === expected.pairedMedianGeometricMean &&
      actual?.pairedP95MedianRatio === expected.pairedP95MedianRatio, "analysis size gate differs at N=" + expected.rows);
  }
  check(recordsBySequence.size === 30, "raw page count is not exactly 30");
} catch (error) {
  status = "FAIL";
  detail = String(error?.stack ?? error);
  errors.push(detail);
}
if (errors.length) status = "FAIL";
const verification = {
  schemaVersion: "headless-high-frequency-verification-v1",
  status,
  checkedAt: new Date().toISOString(),
  verifier: { path: selfPath, sha256: sha256(await readFile(selfPath)) },
  config: { path: configPath, sha256: sha256(configBytes), studyId: config.studyId },
  candidate: config.candidate,
  scheduleSha256: scheduleHash,
  decisionRulesSha256: rulesHash,
  checkedPageCount: recordsBySequence.size,
  checkedPairCount: calculatedPairs.length,
  localAssets: config.productionAssets?.map((asset) => ({ urlPath: asset.urlPath, sha256: asset.sha256 })) ?? [],
  analysisStatus: analysis?.status ?? null,
  failureCount: errors.length,
  failures: errors,
  interpretation: "Independent integrity, correctness, paired-math, and fixed-gate verification for one headless workload; no whole-page CPU or paint claim.",
};
await writeFile(verificationPath, JSON.stringify(verification, null, 2) + "\n", { flag: "wx" });
console.log("Verification " + status + "; pages=" + recordsBySequence.size + "; failures=" + errors.length);
if (status !== "PASS") process.exitCode = 1;
