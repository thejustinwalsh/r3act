import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { schedule, scheduleSha256, decisionRulesSha256, viewport, warmupFrames, measuredFrames } from "./study-spec.mjs";

const stage = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(stage, "../..");
const temp = path.join(stage, "synthetic-study-cases-rerun-" + Date.now());
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const jsonBytes = (value) => Buffer.from(JSON.stringify(value, null, 2) + "\n");
const assetsDir = path.join(root, ".cache/high-frequency-build-proof-20261013-03/dist");
const sourceProof = JSON.parse(await readFile(path.join(root, ".cache/high-frequency-build-proof-20261013-03/build-proof.json"), "utf8"));
const familyPaths = [
  "src/component_state_runtime.ts", "src/vdom_snapshot_runtime.ts", "src/owner_state_world.ts",
  "src/compiled_state_layout.ts", "src/native_runtime_api.ts", "compiler/oxc-spike/src/main.rs",
  "compiler/oxc-spike/src/owner_update_program.rs", "compiler/vite_native_plugin.ts", "compiler/vite_native_module.ts",
  ".cache/high-frequency-harness-stage/src/browser/high_frequency_harness.ts",
  ".cache/high-frequency-harness-stage/src/browser/high_frequency_contract.ts",
  ".cache/high-frequency-harness-stage/src/browser/native_high_frequency_arm.tsx",
  ".cache/high-frequency-harness-stage/src/browser/react_high_frequency_arm.tsx",
  ".cache/high-frequency-harness-stage/src/browser/high_frequency.css",
];
const assetSpecs = [
  ["/high-frequency.html", "high-frequency.html"],
  ["/assets/highFrequency-Dk3MpsD8.js", "assets/highFrequency-Dk3MpsD8.js"],
  ["/assets/highFrequency-GrFjeJ6A.css", "assets/highFrequency-GrFjeJ6A.css"],
  ["/assets/native_high_frequency_arm-CoEbLbje.js", "assets/native_high_frequency_arm-CoEbLbje.js"],
  ["/assets/react_high_frequency_arm-Cio8XO_I.js", "assets/react_high_frequency_arm-Cio8XO_I.js"],
];
const assets = [];
for (const [urlPath, file] of assetSpecs) assets.push({ urlPath, file, sha256: hash(await readFile(path.join(assetsDir, file))) });

async function setup(caseName, clockQuantumMs, { missingPair = false, partialPair = false } = {}) {
  const base = path.join(temp, caseName);
  const outputDirectory = path.join(base, "raw");
  const inputs = path.join(base, "inputs");
  await mkdir(outputDirectory, { recursive: true });
  await mkdir(inputs, { recursive: true });
  const archivePath = path.join(inputs, "source.tar.gz");
  const archiveBytes = Buffer.from("synthetic archive for tooling contract cases\n");
  await writeFile(archivePath, archiveBytes);
  const buildProof = structuredClone(sourceProof);
  const updatePath = "compiler/oxc-spike/src/owner_update_program.rs";
  const updateBytes = await readFile(path.join(root, updatePath));
  buildProof.sourceHashLock.sha256 = hash(updateBytes);
  const proofPath = path.join(inputs, "build-proof.json");
  await writeFile(proofPath, jsonBytes(buildProof));
  const sourceLocks = {};
  for (const relative of familyPaths) sourceLocks[relative] = hash(await readFile(path.join(root, relative)));
  const lockPath = path.join(inputs, "source-build.json");
  await writeFile(lockPath, jsonBytes(sourceLocks));
  const lockBytes = await readFile(lockPath);
  const statusPath = path.join(inputs, "status.json");
  await writeFile(statusPath, jsonBytes({ status: "SYNTHETIC_PASS", archiveSha256: hash(archiveBytes) }));
  const statusBytes = await readFile(statusPath);
  const config = {
    schemaVersion: "headless-high-frequency-config-v1",
    studyId: "synthetic-" + caseName,
    candidate: {
      checkpointStatusPath: statusPath, checkpointSha256: hash(statusBytes), expectedCheckpointStatus: "SYNTHETIC_PASS",
      sourceArchivePath: archivePath, sourceArchiveSha256: hash(archiveBytes),
      sourceBuildLockPath: lockPath, sourceBuildLockSha256: hash(lockBytes),
      buildProofPath: proofPath, buildProofSha256: hash(await readFile(proofPath)),
    },
    origin: "https://synthetic-headless.localhost",
    htmlPath: "/high-frequency.html",
    distDirectory: assetsDir,
    outputDirectory,
    productionAssets: assets,
    expectedIsolationHeaders: { "cross-origin-opener-policy": "same-origin", "cross-origin-embedder-policy": "require-corp" },
    expectedCrossOriginIsolated: true,
    preregisteredClockQuantumMs: clockQuantumMs,
  };
  const configPath = path.join(base, "config.json");
  await writeFile(configPath, jsonBytes(config));
  const configSha256 = hash(await readFile(configPath));
  const html = assets.find((item) => item.urlPath === config.htmlPath);
  const qa = clockQuantumMs;
  const allPages = schedule.flatMap((pair) => pair.pages.map((page) => ({ pair, page })));
  const calibrationBySequence = new Map();
  for (const { pair, page } of allPages) for (const phase of ["before", "after"]) {
    const filename = "calibration-sequence-" + String(page.sequence).padStart(2, "0") + "-" + phase + ".json";
    const record = {
      schemaVersion: "headless-high-frequency-calibration-v2", pageSequence: page.sequence, phase,
      pairId: pair.pairId, url: config.origin + config.htmlPath, status: 200, htmlSha256: html.sha256,
      headers: { ...config.expectedIsolationHeaders }, blockedScripts: ["/assets/highFrequency.js"],
      browserVersion: "Synthetic Chromium 153", minPositiveQuantumMs: qa, positiveSteps: 250000,
      crossOriginIsolated: true, harnessResultAbsent: true, valid: true,
    };
    const absolute = path.join(outputDirectory, filename);
    await writeFile(absolute, jsonBytes(record));
    const key = page.sequence + ":" + phase;
    calibrationBySequence.set(key, { ...record, path: absolute });
  }
  const localAssets = assets.map((item) => ({ ...item, actualSha256: item.sha256, bytes: 8, matches: true }));
  for (const pair of schedule) {
    if (missingPair && pair === schedule[0]) continue;
    const calibrationRecords = pair.pages.flatMap((page) => ["before", "after"].map((phase) => {
      const item = calibrationBySequence.get(page.sequence + ":" + phase);
      return { path: item.path, phase, pageSequence: page.sequence, valid: true, minPositiveQuantumMs: qa };
    }));
    const maxObservedClockQuantumMs = qa;
    const effectiveClockQuantumMs = Math.max(clockQuantumMs, qa);
    const pageRecords = [];
    for (const page of pair.pages) {
      if (partialPair && pair === schedule[0] && page === pair.pages[1]) continue;
      const before = calibrationBySequence.get(page.sequence + ":before");
      const after = calibrationBySequence.get(page.sequence + ":after");
      const url = new URL(config.htmlPath, config.origin);
      url.searchParams.set("arm", page.arm);
      url.searchParams.set("rows", String(page.rows));
      url.searchParams.set("dirty", page.dirty);
      url.searchParams.set("placement", page.placement);
      url.searchParams.set("programs", page.programs);
      const userAgent = "Synthetic Headless Chromium";
      const commitNative = clockQuantumMs >= 0.5 ? qa * 0.5 : qa * 6;
      const commitReact = clockQuantumMs >= 0.5 ? qa * 0.625 : qa * 8;
      const commitMs = page.arm === "native" ? commitNative : commitReact;
      const result = {
        schemaVersion: "current-product-high-frequency-v1", status: "PASS", arm: page.arm, rows: page.rows,
        dirty: "all", placement: "contiguous", programs: "homogeneous", production: true, userAgent,
        warmupFrames, measuredFrames,
        checks: { output: true, order: true, identity: true, lifecycle: true, deadSetters: true, visible: true },
        errors: [], mountAndFrameZeroInitializationMs: 1,
        warmupSamples: Array.from({ length: warmupFrames }, (_, index) => ({ frame: index + 1, commitMs, intervalMs: 16 })),
        samples: Array.from({ length: measuredFrames }, (_, index) => ({ frame: index + warmupFrames + 1, dirtyCount: page.rows, commitMs, intervalMs: 16 })),
        disposeMs: 1,
        active: { mounts: page.rows, cleanups: 0, writers: page.rows },
        afterDispose: { mounts: page.rows, cleanups: page.rows, writers: 0 },
        deadSetterProbeCount: page.rows, deadSetterThrows: page.arm === "native" ? page.rows : 0,
        summary: { synthetic: true }, timingContract: { synthetic: true },
      };
      const armSegment = page.arm === "native" ? "native_high_frequency_arm-" : "react_high_frequency_arm-";
      const loadedBuildResources = assets.filter((asset) => asset.urlPath === config.htmlPath ||
        asset.urlPath.endsWith(".css") || asset.urlPath.includes(armSegment) ||
        (asset.urlPath.endsWith(".js") && !asset.urlPath.includes("native_high_frequency_arm-") && !asset.urlPath.includes("react_high_frequency_arm-")))
        .map((asset) => ({ path: asset.urlPath, status: 200, expectedSha256: asset.sha256,
          actualSha256: asset.sha256, bytes: 8, matches: true }));
      const record = {
        schemaVersion: "headless-high-frequency-page-v1", page, pairId: pair.pairId, url: url.toString(), status: "PASS",
        browser: { headless: true, gpu: false, viewport, version: "Synthetic Chromium 153", userAgent, crossOriginIsolated: true },
        navigation: { status: 200, headers: { ...config.expectedIsolationHeaders } }, pageErrors: [], loadedBuildResources,
        beforeCalibrationPath: before.path, beforeCalibrationQuantumMs: qa,
        afterCalibrationPath: after.path, afterCalibrationQuantumMs: qa, afterCalibrationError: null,
        pairClockQuantumMs: qa, executionError: null, validationErrors: [], result,
      };
      const relative = "sequence-" + String(page.sequence).padStart(2, "0") + ".json";
      const absolute = path.join(outputDirectory, relative);
      await writeFile(absolute, jsonBytes(record));
      pageRecords.push({ sequence: page.sequence, arm: page.arm, rows: page.rows, status: "PASS", path: absolute, sha256: hash(await readFile(absolute)) });
    }
    const pairReceipt = {
      schemaVersion: "headless-high-frequency-pair-receipt-v2", studyId: config.studyId,
      configPath, configSha256, candidate: config.candidate, rows: pair.rows, pair: pair.pair, pairId: pair.pairId,
      scheduleSha256, decisionRulesSha256, localAssets, sourceBuildFileCount: Object.keys(sourceLocks).length,
      sourceBuildLocksSha256: config.candidate.sourceBuildLockSha256, sourceArchiveSha256: config.candidate.sourceArchiveSha256,
      buildProofSha256: config.candidate.buildProofSha256, calibrationRecords,
      maxObservedClockQuantumMs, preregisteredClockQuantumMs: clockQuantumMs,
      effectiveClockQuantumMs, clockFloorMs: 5 * effectiveClockQuantumMs,
      deadlineMs: 90000, durationMs: 1000, stopReason: null, pageRecords,
      status: partialPair && pair === schedule[0] ? "INCOMPLETE" : "PASS", failure: null,
    };
    await writeFile(path.join(outputDirectory, "pair-" + pair.rows + "-" + String(pair.pair).padStart(2, "0") + ".json"), jsonBytes(pairReceipt));
  }
  if (missingPair) return { configPath, outputDirectory, config, missingPair: true };
  return { configPath, outputDirectory, config };
}

const runNode = (script, configPath) => spawnSync(process.execPath, [path.join(stage, script), "--config", configPath], {
  cwd: root, encoding: "utf8", timeout: 30_000,
});
const accepted = [];
const rejected = [];

const resolved = await setup("resolved-pass", 0.0001);
let outcome = runNode("analyze.mjs", resolved.configPath);
assert.equal(outcome.status, 0, "resolved synthetic analyzer pass: " + outcome.stderr);
outcome = runNode("verify.mjs", resolved.configPath);
assert.equal(outcome.status, 0, "resolved synthetic verifier pass: " + outcome.stderr);
const resolvedAnalysis = JSON.parse(await readFile(path.join(resolved.outputDirectory, "analysis.json"), "utf8"));
const resolvedVerification = JSON.parse(await readFile(path.join(resolved.outputDirectory, "verification.json"), "utf8"));
assert.equal(resolvedAnalysis.status, "PASS");
assert.equal(resolvedVerification.status, "PASS");
accepted.push("resolved 30-page PASS");

const unresolved = await setup("clock-unresolved", 1);
outcome = runNode("analyze.mjs", unresolved.configPath);
assert.equal(outcome.status, 0, "low-resolution synthetic analyzer should retain data: " + outcome.stderr);
outcome = runNode("verify.mjs", unresolved.configPath);
assert.equal(outcome.status, 0, "low-resolution synthetic verifier should accept UNRESOLVED: " + outcome.stderr);
const unresolvedAnalysis = JSON.parse(await readFile(path.join(unresolved.outputDirectory, "analysis.json"), "utf8"));
const unresolvedVerification = JSON.parse(await readFile(path.join(unresolved.outputDirectory, "verification.json"), "utf8"));
assert.equal(unresolvedAnalysis.status, "UNRESOLVED");
assert.equal(unresolvedVerification.status, "PASS");
assert.equal(unresolvedVerification.analysisStatus, "UNRESOLVED");
accepted.push("low-quantum UNRESOLVED retained and verified");

const altered = await setup("altered-raw", 0.0001);
outcome = runNode("analyze.mjs", altered.configPath);
assert.equal(outcome.status, 0, "altered-raw baseline analyzer pass: " + outcome.stderr);
const alteredPath = path.join(altered.outputDirectory, "sequence-00.json");
const alteredRecord = JSON.parse(await readFile(alteredPath, "utf8"));
alteredRecord.result.samples[0].dirtyCount++;
await writeFile(alteredPath, jsonBytes(alteredRecord));
outcome = runNode("verify.mjs", altered.configPath);
assert.notEqual(outcome.status, 0, "altered raw sample was not rejected");
const alteredVerification = JSON.parse(await readFile(path.join(altered.outputDirectory, "verification.json"), "utf8"));
assert.equal(alteredVerification.status, "FAIL");
rejected.push("altered dirtyCount rejected independently");

const missing = await setup("missing-pair", 0.0001, { missingPair: true });
outcome = runNode("analyze.mjs", missing.configPath);
assert.notEqual(outcome.status, 0, "missing pair was not rejected by analyzer");
rejected.push("missing pair rejected");

const partial = await setup("partial-pair", 0.0001, { partialPair: true });
outcome = runNode("analyze.mjs", partial.configPath);
assert.notEqual(outcome.status, 0, "partial pair was not rejected by analyzer");
rejected.push("partial pair rejected");

console.log(JSON.stringify({ accepted, rejected, syntheticPageCount: schedule.reduce((sum, pair) => sum + pair.pages.length, 0), browserLaunched: false }));
