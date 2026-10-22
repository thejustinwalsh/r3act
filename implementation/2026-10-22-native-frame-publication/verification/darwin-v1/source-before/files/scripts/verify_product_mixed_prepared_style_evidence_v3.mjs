/** Independently verify the prepared-style product confirmation from frozen raw files. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const preregPath = "results/product-mixed-prepared-style-confirmation/preregistration.json";
const manifestPath = "results/product-mixed-prepared-style-confirmation/manifest.json";
const rawDir = "results/product-mixed-prepared-style-confirmation";
const summaryPath = "results/product-mixed-prepared-style-confirmation/summary-v3.json";
const timingConfigPath = "vite.product-mixed-prepared-style-timing.config.ts";
const statusPath = "implementation/2026-10-13-prepared-style-writers/status.json";
const expectedArchive = "implementation/2026-10-13-prepared-style-writers/source-and-build.tar.gz";
const executionProofPath = "implementation/2026-10-13-prepared-style-writers/verification/execution-proof.json";
const compilerProofPath = "implementation/2026-10-13-prepared-style-writers/verification/product-compiler-proof/native.js";
const compilerProofPaths = [
  compilerProofPath,
  "implementation/2026-10-13-prepared-style-writers/verification/product-compiler-proof/react.js",
  "implementation/2026-10-13-prepared-style-writers/verification/product-compiler-proof/native.json",
  "implementation/2026-10-13-prepared-style-writers/verification/product-compiler-proof/react.json",
];
const compiledStyleProofPath = "implementation/2026-10-13-prepared-style-writers/verification/compiled-style-proof.json";
const pilotDirectory = "implementation/2026-10-13-prepared-style-writers/verification/product-mixed-pilot";
const basePreviewConfigPath = "vite.product-mixed-prepared-style.config.ts";
const collectorPath = "scripts/collect_product_mixed_prepared_style.mjs";
const analyzerPath = "scripts/summarize_product_mixed_prepared_style.mjs";
const verifierPath = "scripts/verify_product_mixed_prepared_style_evidence.mjs";
const schedulePath = "src/browser/product_mixed_schedule.ts";
const expectedArchiveSha = "093f7058977c0a1290ddcc3f27b7ee5cbda022e9e43a161be1b24b950c3c419b";
const expectedCompiledStyleProofSha = "e5255d4b25bf83d67d03f2c9fa821192ed38e6adff826b938a504574a4910d20";
const sizes = [128, 512, 1024];
const pairsPerSize = 5;
const warmup = 60;
const frames = 240;
const structuralFrames = [90, 120, 150, 180, 210, 240, 270, 300];
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const json = async (filename) => JSON.parse(await readFile(filename, "utf8"));
const sorted = (values) => [...values].sort((a, b) => a - b);
const median = (values) => sorted(values)[Math.floor(values.length / 2)];
const p95 = (values) => sorted(values)[Math.ceil(values.length * 0.95) - 1];
const geomean = (values) => Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length);
const close = (actual, expected, label) => assert.ok(
  actual === expected || (Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) < 1e-9),
  `${label}: ${actual} != ${expected}`,
);
const equalSchedule = (actual, expected) => assert.deepEqual(actual, expected);
const expectedSchedule = sizes.flatMap((size) => Array.from({ length: pairsPerSize }, (_, pair) =>
  (pair % 2 ? ["native", "react"] : ["react", "native"]).map((arm) => ({ size, pair, arm }))
).flat()).map((item, sequence) => ({ ...item, sequence }));

const preregBytes = await readFile(preregPath);
const preregHash = sha(preregBytes);
const prereg = JSON.parse(preregBytes);
const manifest = await json(manifestPath);
const summary = await json(summaryPath);
const postlock = await json(`${rawDir}/postlock.json`);
const finalResults = await json(`${rawDir}/FINALresults.json`);
assert.equal(prereg.study, "compiled-product-mixed-prepared-style-confirmation");
assert.deepEqual(prereg.schedule, expectedSchedule, "Frozen schedule must be 30 pages, five pairs at each size, with alternating order");
assert.equal(prereg.workload.warmup, warmup);
assert.equal(prereg.workload.frames, frames);
assert.equal(prereg.workload.topologyEvery, 30);
assert.equal(prereg.workload.removed, 8);
assert.equal(prereg.workload.inserted, 8);
assert.equal(prereg.workload.rotation, 13);
assert.equal(prereg.decision.medianRatioMax, 0.80);
assert.equal(prereg.decision.medianSizesRequired, 2);
assert.equal(prereg.decision.p95RatioMax, 1.10);
assert.equal(prereg.decision.minDenominatorTicks, 5);
assert.equal(prereg.decision.denominatorRule, "max(preregistration,reactPage,nativePage) * minDenominatorTicks");
assert.equal(prereg.decision.noPageExclusions, true);
assert.equal(prereg.clock.readings, 100000);
assert.ok(Number.isFinite(prereg.clock.minPositiveDeltaMs) && prereg.clock.minPositiveDeltaMs > 0);
assert.ok(Number.isSafeInteger(prereg.clock.positiveObservations) && prereg.clock.positiveObservations > 0);
assert.equal(prereg.clock.rafIntervalsMs.length, 48);
assert.ok(prereg.clock.rafIntervalsMs.every((value) => Number.isFinite(value) && value >= 0));
assert.equal(prereg.clock.crossOriginIsolated, true);
assert.equal(prereg.clock.coop, "same-origin");
assert.equal(prereg.clock.coep, "require-corp");
assert.equal(prereg.clock.visibility, "visible");
assert.equal(prereg.clock.focused, true);
assert.equal(typeof prereg.clock.userAgent, "string");
assert.ok(prereg.clock.userAgent.length > 0);
assert.equal(typeof prereg.clock.platform, "string");
assert.ok(Number.isSafeInteger(prereg.clock.hardwareConcurrency));
assert.ok(Number.isFinite(prereg.clock.timeOrigin) && prereg.clock.timeOrigin >= 0);
assert.equal(prereg.decision.denominatorRule, "max(preregistration,reactPage,nativePage) * minDenominatorTicks");
assert.equal(prereg.timingEnvironment.origin, "https://compiled-prepared-style-timing.localhost:1355");
assert.equal(prereg.timingEnvironment.coop, "same-origin");
assert.equal(prereg.timingEnvironment.coep, "require-corp");
assert.equal(prereg.timingEnvironment.crossOriginIsolated, true);
assert.equal(prereg.timingEnvironment.calibrationPath, "/__clock-calibration");
assert.equal(prereg.timingEnvironment.configPath, timingConfigPath);
assert.equal(prereg.timingEnvironment.baseConfigPath, basePreviewConfigPath);
assert.equal(prereg.workload.exactScheduleLength, 30);
assert.deepEqual(prereg.workload.measuredFrameNumbers, [61, 300]);
assert.deepEqual(manifest.postCollectionChangedFiles, []);
assert.equal(manifest.status, "COLLECTION_COMPLETE");
assert.equal(manifest.preregistrationSha256, preregHash);
assert.equal(manifest.archiveSha256, prereg.archiveSha256);
assert.equal(manifest.runId, prereg.runId);
assert.equal(manifest.failedOrIncomplete.length, 0);
assert.equal(manifest.files.length, expectedSchedule.length);
assert.equal(postlock.status, "PASS");
assert.deepEqual(postlock.mismatches, []);
assert.equal(postlock.study, prereg.study);
assert.equal(postlock.runId, prereg.runId);
assert.equal(postlock.records.length, Object.keys(prereg.inputLocks).length);
for (const item of postlock.records) {
  assert.ok(item.filename in prereg.inputLocks, `Unexpected postlock path: ${item.filename}`);
  assert.equal(item.expected, prereg.inputLocks[item.filename]);
  assert.equal(item.observed, item.expected);
  assert.equal(item.matches, true);
  assert.equal(sha(await readFile(item.filename)), item.expected, `Postlock input changed: ${item.filename}`);
}
assert.equal(finalResults.status, "PASS");
assert.equal(finalResults.study, prereg.study);
assert.equal(finalResults.runId, prereg.runId);
assert.equal(finalResults.postlock.status, "PASS");
assert.deepEqual(finalResults.postlock.mismatches, []);

// Lock every preregistered source/build file and ensure the lock enumerates the archive itself.
const status = await json(statusPath);
assert.equal(prereg.archive, expectedArchive);
assert.equal(prereg.archiveSha256, expectedArchiveSha);
assert.equal(path.join(path.dirname(statusPath), status.archive), prereg.archive);
assert.equal(status.archiveSha256, prereg.archiveSha256);
assert.equal(status.status, "PREPARED_STYLE_WRITERS_CORRECTNESS_VERIFIED");
assert.equal(status.runtimeTests, 593);
assert.equal(status.rustTests, 29);
assert.equal(status.integrationCommands, 12);
assert.equal(status.candidateProductionPilotPages, 6);
assert.equal(sha(await readFile(prereg.archive)), prereg.archiveSha256, "Source/build archive hash mismatch");
assert.deepEqual(prereg.sourceAndBuildSha256, status.sourceAndBuildSha256);
assert.equal(Object.keys(prereg.sourceAndBuildSha256).length, 830);
assert.equal(Object.keys(status.verificationSha256 ?? {}).length, 33);
assert.equal(Object.keys(prereg.buildProofSha256 ?? {}).length, 33);
assert.equal(prereg.candidate.status, status.status);
assert.equal(prereg.candidate.runtimeTests, 593);
assert.equal(prereg.candidate.rustTests, 29);
assert.equal(prereg.candidate.integrationCommands, 12);
assert.equal(prereg.candidate.candidateProductionPilotPages, 6);
const archiveMembers = JSON.parse(execFileSync("python3", ["-c", `import hashlib,json,sys,tarfile
members={}
with tarfile.open(sys.argv[1], "r:gz") as archive:
    for member in archive:
        stream=archive.extractfile(member)
        if stream is None: raise RuntimeError("Cannot read archive member: "+member.name)
        digest=hashlib.sha256()
        while True:
            chunk=stream.read(1024*1024)
            if not chunk: break
            digest.update(chunk)
        stream.close()
        members[member.name]=digest.hexdigest()
print(json.dumps(members,sort_keys=True))`, prereg.archive], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));
assert.deepEqual(Object.keys(archiveMembers).sort(), Object.keys(prereg.sourceAndBuildSha256).sort(), "Source/build lock must enumerate actual archive members");
for (const [filename, expectedHash] of Object.entries(prereg.sourceAndBuildSha256)) {
  assert.equal(archiveMembers[filename], expectedHash, `Archive member mismatch: ${filename}`);
}
for (const [filename, expectedHash] of Object.entries(prereg.productionSha256)) {
  assert.equal(prereg.sourceAndBuildSha256[filename], expectedHash, `Production asset absent from source/build lock: ${filename}`);
  assert.equal(sha(await readFile(filename)), expectedHash, `Local production asset mismatch: ${filename}`);
}
for (const [filename, expectedHash] of Object.entries(prereg.buildProofSha256)) {
  assert.equal(sha(await readFile(filename)), expectedHash, `Build proof hash mismatch: ${filename}`);
}
const executionProof = await json(executionProofPath);
const executionProofHash = sha(await readFile(executionProofPath));
assert.equal(status.verificationSha256?.["verification/execution-proof.json"], executionProofHash);
assert.equal(prereg.proof.executionProof.path, executionProofPath);
assert.equal(prereg.proof.executionProof.sha256, executionProofHash);
assert.equal(executionProof.status, "PASS");
assert.equal(executionProof.captureCallsForEligibleCuts, 0);
assert.equal(executionProof.captureNativeCalls, 5);
assert.deepEqual(executionProof.numericFrames.map((frame) => frame.density), [1, 4, 32]);
assert.deepEqual(executionProof.numericFrames.map((frame) => frame.counters["numeric.program-batches"]), [1, 1, 1]);
assert.deepEqual(executionProof.numericFrames.map((frame) => frame.counters["numeric.program-source-updates"]), [2, 8, 64]);
assert.deepEqual(executionProof.numericFrames.map((frame) => frame.counters["numeric.program-projections"]), [5, 20, 160]);
assert.deepEqual(prereg.proof.executionProof.numericFrames, [
  { density: 1, batches: 1, sourceUpdates: 2, projections: 5 },
  { density: 4, batches: 1, sourceUpdates: 8, projections: 20 },
  { density: 32, batches: 1, sourceUpdates: 64, projections: 160 },
]);
const compiledStyleProof = await json(compiledStyleProofPath);
const compiledStyleProofHash = sha(await readFile(compiledStyleProofPath));
assert.equal(compiledStyleProof.status, "PASS");
assert.equal(compiledStyleProofHash, expectedCompiledStyleProofSha);
assert.equal(status.verificationSha256?.["verification/compiled-style-proof.json"], compiledStyleProofHash);
assert.equal(prereg.proof.compiledStyleProof.path, compiledStyleProofPath);
assert.equal(prereg.proof.compiledStyleProof.sha256, compiledStyleProofHash);
assert.equal(prereg.proof.compiledStyleProof.status, "PASS");
assert.equal(compiledStyleProof.trace?.factories, 73);
assert.equal(compiledStyleProof.trace?.writes, 80);
assert.deepEqual(compiledStyleProof.trace?.fields, { left: 35, top: 35, transform: 3 });
assert.equal(prereg.proof.compiledStyleProof.activations, 73);
assert.equal(prereg.proof.compiledStyleProof.writes, 80);
assert.deepEqual(prereg.proof.compiledStyleProof.fields, { left: 35, top: 35, transform: 3 });
const compilerProof = await readFile(compilerProofPath, "utf8");
const compilerProofHash = sha(Buffer.from(compilerProof));
assert.equal(status.verificationSha256?.["verification/product-compiler-proof/native.js"], compilerProofHash);
assert.equal(prereg.proof.compilerEmission.numericProgramDescriptors, 3);
assert.equal(prereg.proof.compilerEmission.numericProgramBindings, 3);
assert.deepEqual(Object.keys(prereg.proof.compilerEmission.files).sort(), compilerProofPaths.sort());
for (const filename of compilerProofPaths) {
  const expectedHash = sha(await readFile(filename));
  assert.equal(status.verificationSha256?.[filename.slice(`implementation/2026-10-13-prepared-style-writers/`.length)], expectedHash);
  assert.equal(prereg.proof.compilerEmission.files[filename], expectedHash);
}
const compilerPlanStart = compilerProof.search(/\n\s*"component_module":/);
assert.ok(compilerPlanStart > 0);
const compilerExecutable = compilerProof.slice(0, compilerPlanStart);
assert.equal((compilerExecutable.match(/schemaVersion:\s*1/g) ?? []).length, 3);
assert.equal((compilerExecutable.match(/sourceSites:\s*\[/g) ?? []).length, 3);
assert.equal((compilerExecutable.match(/__nativeBindStatePropAt\(/g) ?? []).length, 3);
assert.equal((compilerExecutable.match(/__nativeBindStatePropAt\([\s\S]*?__nativeNumericPrograms\[\d+\]\)/g) ?? []).length, 3);
assert.equal(prereg.proof.native.bindings, 3);
assert.equal(prereg.proof.native.deltaFallback, false);
assert.equal(prereg.proof.react.rowMemoCache, true);
assert.equal(prereg.proof.react.boardMemoCache, true);
assert.equal(prereg.proof.compilerEmission.reactCompiler.arm, "react");
assert.equal(prereg.proof.compilerEmission.reactCompiler.rowMemoCache, true);
assert.equal(prereg.proof.compilerEmission.reactCompiler.boardMemoCache, true);
const reactCompilerProof = await json(compilerProofPaths[3]);
assert.equal(reactCompilerProof.arm, "react");
assert.equal(reactCompilerProof.rowMemoCache, true);
assert.equal(reactCompilerProof.boardMemoCache, true);
assert.equal(prereg.proof.pilotManifestPath, `${pilotDirectory}/results.json`);
assert.equal(prereg.proof.pilotManifestSha256, prereg.buildProofSha256[prereg.proof.pilotManifestPath]);
const requiredInputLocks = [
  prereg.archive, statusPath, ...Object.keys(prereg.sourceAndBuildSha256),
  ...Object.keys(prereg.buildProofSha256), prereg.protocol, timingConfigPath, basePreviewConfigPath,
  collectorPath, analyzerPath, verifierPath, schedulePath,
];
assert.deepEqual(Object.keys(prereg.inputLocks).sort(), [...new Set(requiredInputLocks)].sort(), "Frozen input inventory must exactly include candidate, proof, pilot, protocol, configs, scripts, and schedule");
for (const [filename, expectedHash] of Object.entries(prereg.inputLocks)) {
  assert.equal(sha(await readFile(filename)), expectedHash, `Frozen input lock mismatch: ${filename}`);
}
assert.equal(prereg.collectorSha256, prereg.inputLocks[collectorPath]);
assert.equal(prereg.analyzer.path, analyzerPath);
assert.equal(prereg.analyzer.sha256, prereg.inputLocks[analyzerPath]);
assert.equal(prereg.verifier.path, verifierPath);
assert.equal(prereg.verifier.sha256, prereg.inputLocks[verifierPath]);
assert.equal(prereg.scheduleSource.path, schedulePath);
assert.equal(prereg.scheduleSource.sha256, prereg.inputLocks[schedulePath]);
assert.equal(prereg.timingEnvironment.configSha256, prereg.inputLocks[timingConfigPath]);
assert.equal(prereg.timingEnvironment.baseConfigSha256, prereg.inputLocks[basePreviewConfigPath]);
assert.equal(sha(await readFile("product-mixed-prepared-style-confirmation-protocol.md")), prereg.protocolSha256, "Protocol hash mismatch");
assert.equal(sha(await readFile(collectorPath)), prereg.collectorSha256, "Frozen collector hash mismatch");
assert.equal(sha(await readFile(prereg.analyzer.path)), prereg.analyzer.sha256, "Frozen analyzer hash mismatch");

const files = await readdir(rawDir);
const sequenceFiles = files.filter((file) => /^sequence-\d{2}\.json$/.test(file)).sort();
const allowedMetadataFiles = new Set(["preregistration.json", "manifest.json", "postlock.json", "FINALresults.json", "summary.json", "summary.svg", "summary-v2.json", "summary-v2.svg", "summary-v3.json", "summary-v3.svg"]);
assert.deepEqual(files.filter((file) => file.endsWith(".json") && !/^sequence-\d{2}\.json$/.test(file) && !allowedMetadataFiles.has(file)), [], "Unexpected JSON evidence in confirmation directory");
assert.deepEqual(sequenceFiles, expectedSchedule.map(({ sequence }) => `sequence-${String(sequence).padStart(2, "0")}.json`));
const manifestBySequence = new Map();
for (const entry of manifest.files) {
  assert.ok(Number.isInteger(entry.sequence));
  assert.ok(!manifestBySequence.has(entry.sequence), `Repeated manifest sequence ${entry.sequence}`);
  manifestBySequence.set(entry.sequence, entry);
}
assert.equal(manifestBySequence.size, expectedSchedule.length);

const rows = [];
for (const scheduled of expectedSchedule) {
  const filename = `${rawDir}/sequence-${String(scheduled.sequence).padStart(2, "0")}.json`;
  const bytes = await readFile(filename);
  const record = JSON.parse(bytes);
  const manifestEntry = manifestBySequence.get(scheduled.sequence);
  assert.ok(manifestEntry, `Missing manifest sequence ${scheduled.sequence}`);
  assert.equal(manifestEntry.file, filename);
  assert.equal(manifestEntry.sha256, sha(bytes), `Raw hash mismatch: ${filename}`);
  assert.equal(record.status, "PASS", `Page status is not PASS: ${filename}`);
  assert.equal(record.runId, prereg.runId);
  equalSchedule(record.schedule, scheduled);
  assert.equal(record.preregistrationSha256, preregHash);
  assert.equal(record.archiveSha256, prereg.archiveSha256);
  assert.equal(record.protocolSha256, prereg.protocolSha256);
  assert.deepEqual(record.browserErrors, []);
  assert.deepEqual(record.endVisibility, { state: "visible", focused: true });
  assert.equal(record.error, undefined, `Collector error in ${filename}`);
  assert.equal(record.crossOriginIsolated, true);
  assert.deepEqual(record.navigationHeaders, { coop: "same-origin", coep: "require-corp" });
  const clock = record.postDisposeClock;
  assert.equal(clock.crossOriginIsolated, true);
  assert.equal(clock.coop, "same-origin");
  assert.equal(clock.coep, "require-corp");
  assert.equal(clock.visibility, "visible");
  assert.equal(clock.focused, true);
  assert.equal(clock.readings, 100000);
  assert.ok(Number.isFinite(clock.minPositiveDeltaMs) && clock.minPositiveDeltaMs > 0);
  assert.ok(Number.isSafeInteger(clock.positiveObservations) && clock.positiveObservations > 0);
  assert.equal(clock.rafIntervalsMs.length, 48);
  assert.ok(clock.rafIntervalsMs.every((value) => Number.isFinite(value) && value >= 0));
  const expectedAssets = prereg.productionSha256;
  const resources = record.loadedBuildResources;
  assert.ok(Array.isArray(resources) && resources.length > 0, `Missing resource inventory in ${filename}`);
  const resourceNames = new Set();
  for (const resource of resources) {
    assert.equal(resource.status, 200, `Resource response failed in ${filename}`);
    assert.ok(resource.filename in expectedAssets, `Unexpected build resource in ${filename}: ${resource.filename}`);
    assert.equal(resource.sha256, expectedAssets[resource.filename], `Resource hash mismatch in ${filename}: ${resource.filename}`);
    assert.equal(resource.coop, "same-origin");
    assert.equal(resource.coep, "require-corp");
    resourceNames.add(path.basename(resource.filename));
  }
  const commonNames = ["product-mixed-v2.html", ...Object.keys(expectedAssets)
    .filter((asset) => !/native_product_mixed_arm-|product_mixed_react_arm-/.test(asset))
    .map((asset) => path.basename(asset))];
  for (const name of commonNames) assert.ok(resourceNames.has(name), `Missing common asset ${name} in ${filename}`);
  const selectedArm = scheduled.arm === "native" ? /^native_product_mixed_arm-/ : /^product_mixed_react_arm-/;
  const oppositeArm = scheduled.arm === "native" ? /^product_mixed_react_arm-/ : /^native_product_mixed_arm-/;
  assert.ok([...resourceNames].some((name) => selectedArm.test(name)), `Selected arm bundle missing in ${filename}`);
  assert.ok(![...resourceNames].some((name) => oppositeArm.test(name)), `Opposite arm bundle loaded in ${filename}`);
  const r = record.result;
  assert.ok(r && typeof r === "object", `Missing result in ${filename}`);
  equalSchedule({ size: r.size, pair: r.pair, arm: r.arm, sequence: r.sequence }, scheduled);
  assert.equal(r.status, "PASS");
  assert.equal(r.production, true);
  assert.equal(r.mode, "confirm");
  assert.equal(r.warmup, warmup);
  assert.equal(r.frames, frames);
  assert.equal(r.samples.length, frames);
  assert.deepEqual(Object.keys(r.checks).sort(), ["identity", "lifecycle", "order", "output", "visible"].sort());
  assert.ok(Object.values(r.checks).every((value) => value === true));
  assert.ok(Number.isFinite(r.mountMs) && r.mountMs >= 0);
  assert.ok(Number.isFinite(r.disposeMs) && r.disposeMs >= 0);
  assert.deepEqual(r.samples.filter((sample) => sample.structural).map((sample) => sample.frame), structuralFrames);
  for (let i = 0; i < frames; i++) {
    const sample = r.samples[i];
    assert.equal(sample.frame, warmup + i + 1, `Frame sequence mismatch in ${filename}`);
    assert.equal(sample.structural, structuralFrames.includes(sample.frame), `Structural flag mismatch in ${filename}`);
    assert.ok(Number.isFinite(sample.commitMs) && sample.commitMs >= 0, `Invalid commitMs in ${filename}`);
    assert.ok(Number.isFinite(sample.intervalMs) && sample.intervalMs >= 0, `Invalid intervalMs in ${filename}`);
  }
  const expectedMounts = scheduled.size + 8 * 8;
  const expectedCleanups = 8 * 8;
  assert.equal(r.active.writers, scheduled.size);
  assert.equal(r.active.mounts, expectedMounts);
  assert.equal(r.active.cleanups, expectedCleanups);
  assert.equal(r.after.writers, 0);
  assert.equal(r.after.mounts, expectedMounts);
  assert.equal(r.after.cleanups, expectedMounts);
  if (scheduled.arm === "native") {
    assert.equal(r.after.extra.root.ownerCount, 0);
    assert.equal(r.after.extra.root.disposed, true);
    assert.equal(r.after.extra.collection.readerCount, 0);
    assert.equal(r.after.extra.collection.retainedBatches, 0);
  }
  const all = r.samples.map((sample) => sample.commitMs);
  const ordinary = r.samples.filter((sample) => !sample.structural).map((sample) => sample.commitMs);
  const structural = r.samples.filter((sample) => sample.structural).map((sample) => sample.commitMs);
  rows.push({ ...scheduled, clockMinPositiveDeltaMs: clock.minPositiveDeltaMs, median: median(all), p95: p95(all), ordinaryMedian: median(ordinary), ordinaryP95: p95(ordinary), structuralMedian: median(structural), structuralP95: p95(structural),
    intervalMedian: median(r.samples.map((sample) => sample.intervalMs)), intervalP95: p95(r.samples.map((sample) => sample.intervalMs)), mount: r.mountMs, dispose: r.disposeMs,
    lifecycle: r.mountMs + all.reduce((sum, value) => sum + value, 0) + r.disposeMs });
}

assert.equal(summary.analysisRepair.previousRepairSha256, sha(await readFile("scripts/summarize_product_mixed_prepared_style_v2.mjs")));
assert.equal(summary.analysisRepair.previousSummarySha256, sha(await readFile(`${rawDir}/summary-v2.json`)));
assert.equal(summary.analysisRepair.originalAnalyzerSha256, sha(await readFile(analyzerPath)));
assert.equal(summary.analysisRepair.originalSummarySha256, sha(await readFile(`${rawDir}/summary.json`)));
// Recompute page summaries, paired ratios, clock-floor treatment and the decision gates.
const recomputedSizes = [];
for (const size of sizes) {
  const paired = Array.from({ length: pairsPerSize }, (_, pair) => ({
    native: rows.find((row) => row.size === size && row.pair === pair && row.arm === "native"),
    react: rows.find((row) => row.size === size && row.pair === pair && row.arm === "react"),
  }));
  const pairFloors = paired.map(({ native, react }) => Math.max(
    prereg.clock.minPositiveDeltaMs,
    native.clockMinPositiveDeltaMs,
    react.clockMinPositiveDeltaMs,
  ) * prereg.decision.minDenominatorTicks);
  const medianValues = paired.map(({ native, react }, index) => react.median < pairFloors[index] ? null : native.median / react.median);
  const p95Values = paired.map(({ native, react }, index) => react.p95 < pairFloors[index] ? null : native.p95 / react.p95);
  const resolvedMedian = medianValues.filter(Number.isFinite);
  const resolvedP95 = p95Values.filter(Number.isFinite);
  const descriptiveMedian = paired.map(({ native, react }) => native.median / react.median);
  const descriptiveP95 = paired.map(({ native, react }) => native.p95 / react.p95);
  const gm = resolvedMedian.length === pairsPerSize ? geomean(resolvedMedian) : null;
  const p95Median = resolvedP95.length === pairsPerSize ? median(resolvedP95) : null;
  const expected = {
    native: {
      all: median(paired.map((pair) => pair.native.median)),
      ordinary: median(paired.map((pair) => pair.native.ordinaryMedian)),
      p95: median(paired.map((pair) => pair.native.p95)),
      ordinaryP95: median(paired.map((pair) => pair.native.ordinaryP95)),
      structuralMedian: median(paired.map((pair) => pair.native.structuralMedian)),
      intervalP95: median(paired.map((pair) => pair.native.intervalP95)),
      structuralP95: median(paired.map((pair) => pair.native.structuralP95)),
      interval: median(paired.map((pair) => pair.native.intervalMedian)),
      mount: median(paired.map((pair) => pair.native.mount)),
      dispose: median(paired.map((pair) => pair.native.dispose)),
      lifecycle: median(paired.map((pair) => pair.native.lifecycle)),
    },
    react: {
      all: median(paired.map((pair) => pair.react.median)),
      ordinary: median(paired.map((pair) => pair.react.ordinaryMedian)),
      p95: median(paired.map((pair) => pair.react.p95)),
      ordinaryP95: median(paired.map((pair) => pair.react.ordinaryP95)),
      structuralMedian: median(paired.map((pair) => pair.react.structuralMedian)),
      intervalP95: median(paired.map((pair) => pair.react.intervalP95)),
      structuralP95: median(paired.map((pair) => pair.react.structuralP95)),
      interval: median(paired.map((pair) => pair.react.intervalMedian)),
      mount: median(paired.map((pair) => pair.react.mount)),
      dispose: median(paired.map((pair) => pair.react.dispose)),
      lifecycle: median(paired.map((pair) => pair.react.lifecycle)),
    },
    gm, p95Median, medianDescriptiveGeomean: geomean(descriptiveMedian), p95DescriptiveMedian: median(descriptiveP95),
    medianPairsResolved: resolvedMedian.length, p95PairsResolved: resolvedP95.length,
  };
  recomputedSizes.push({ size, expected, medianPass: gm === null ? null : gm <= prereg.decision.medianRatioMax,
    p95Pass: p95Median === null ? null : p95Median <= prereg.decision.p95RatioMax });
  const reported = summary.sizes.find((item) => item.size === size);
  assert.ok(reported, `Summary missing size ${size}`);
  for (const arm of ["native", "react"]) {
    close(reported.arms[arm].pageMedianOfPageMediansMs.all, expected[arm].all, `${size}/${arm} median`);
    close(reported.arms[arm].pageMedianOfPageMediansMs.ordinary, expected[arm].ordinary, `${size}/${arm} ordinary median`);
    close(reported.arms[arm].pageMedianOfPageP95sMs.all, expected[arm].p95, `${size}/${arm} all p95`);
    close(reported.arms[arm].pageMedianOfPageP95sMs.ordinary, expected[arm].ordinaryP95, `${size}/${arm} ordinary p95`);
    close(reported.arms[arm].pageMedianOfPageMediansMs.structural, expected[arm].structuralMedian, `${size}/${arm} structural median`);
    close(reported.arms[arm].pageMedianIntervalP95Ms, expected[arm].intervalP95, `${size}/${arm} RAF p95`);
    close(reported.arms[arm].pageMedianOfPageP95sMs.structural, expected[arm].structuralP95, `${size}/${arm} structural p95`);
    close(reported.arms[arm].pageMedianIntervalMs, expected[arm].interval, `${size}/${arm} interval median`);
    close(reported.arms[arm].pageMedianMountMs, expected[arm].mount, `${size}/${arm} mount median`);
    close(reported.arms[arm].pageMedianDisposeMs, expected[arm].dispose, `${size}/${arm} dispose median`);
    close(reported.arms[arm].pageMedianLifecycleCpuMs, expected[arm].lifecycle, `${size}/${arm} lifecycle total`);
    assert.equal(reported.arms[arm].validPages, pairsPerSize);
  }
  close(reported.decision.descriptiveMedianGeometricMeanRatio, expected.medianDescriptiveGeomean, `${size} descriptive geomean`);
  close(reported.decision.descriptiveMedianPairedP95Ratio, expected.p95DescriptiveMedian, `${size} descriptive p95 ratio`);
  assert.equal(reported.decision.medianPairsResolved, expected.medianPairsResolved);
  assert.equal(reported.decision.p95PairsResolved, expected.p95PairsResolved);
  assert.equal(reported.decision.pairedMedianGeometricMeanRatio, expected.gm);
  assert.equal(reported.decision.medianPairedP95Ratio, expected.p95Median);
  assert.equal(reported.decision.medianRatioStatus, expected.gm === null ? "UNRESOLVED" : "RESOLVED");
  assert.equal(reported.decision.p95RatioStatus, expected.p95Median === null ? "UNRESOLVED" : "RESOLVED");
  assert.equal(reported.decision.medianRatioPass, recomputedSizes.at(-1).medianPass);
  assert.equal(reported.decision.p95RatioPass, recomputedSizes.at(-1).p95Pass);
}
const passSizes = recomputedSizes.filter((item) => item.medianPass === true).map((item) => item.size);
const failSizes = recomputedSizes.filter((item) => item.medianPass === false).map((item) => item.size);
const unresolvedSizes = recomputedSizes.filter((item) => item.medianPass === null).map((item) => item.size);
const medianPossiblePasses = passSizes.length + unresolvedSizes.length;
const medianGate = passSizes.length >= prereg.decision.medianSizesRequired ? "PASS" : medianPossiblePasses < prereg.decision.medianSizesRequired ? "FAIL" : "UNRESOLVED";
const p95FailSizes = recomputedSizes.filter((item) => item.p95Pass === false).map((item) => item.size);
const p95UnresolvedSizes = recomputedSizes.filter((item) => item.p95Pass === null).map((item) => item.size);
const p95Gate = p95FailSizes.length ? "FAIL" : p95UnresolvedSizes.length ? "UNRESOLVED" : "PASS";
const gate = medianGate === "FAIL" || p95Gate === "FAIL" ? "FAIL" : medianGate === "UNRESOLVED" || p95Gate === "UNRESOLVED" ? "UNRESOLVED" : "PASS";
assert.equal(summary.gate, gate, "Reported gate differs from raw-evidence recomputation");
assert.equal(summary.decision.medianGate, medianGate);
assert.deepEqual(summary.decision.medianPassingSizes, passSizes);
assert.deepEqual(summary.decision.medianFailingSizes, failSizes);
assert.deepEqual(summary.decision.medianUnresolvedSizes, unresolvedSizes);
assert.equal(summary.decision.p95Gate, p95Gate);
assert.deepEqual(summary.decision.p95FailingSizes, p95FailSizes);
assert.deepEqual(summary.decision.p95UnresolvedSizes, p95UnresolvedSizes);
assert.equal(summary.counts.scheduled, expectedSchedule.length);
assert.equal(summary.counts.loaded, expectedSchedule.length);
assert.equal(summary.counts.valid, expectedSchedule.length);
assert.equal(summary.counts.invalid, 0);
assert.deepEqual(summary.validation.invalidPages, []);
assert.deepEqual(summary.validation.preregistrationErrors, []);
assert.deepEqual(summary.validation.archiveContentErrors, []);
assert.deepEqual(summary.validation.directoryErrors, []);

console.log(`PASS independent prepared-style confirmation verification: ${expectedSchedule.length} raw pages, recalculated metrics and ${gate} gate.`);
