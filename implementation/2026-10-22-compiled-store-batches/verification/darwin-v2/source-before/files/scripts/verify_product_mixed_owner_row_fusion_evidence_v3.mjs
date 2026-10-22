/** Independent verification for the frozen compiled owner-row-fusion timing run. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const raw = "results/product-mixed-owner-row-fusion-confirmation";
const preregPath = `${raw}/preregistration.json`;
const manifestPath = `${raw}/manifest.json`;
const finalPath = `${raw}/FINALresults.json`;
const postlockPath = `${raw}/postlock.json`;
const summaryPath = `${raw}/summary-v3.json`;
const outputPath = `${raw}/verification-v3.json`;
const checkpoint = "implementation/2026-10-13-owner-row-fusion";
const statusPath = `${checkpoint}/status.json`;
const archivePath = `${checkpoint}/source-and-evidence.tar.gz`;
const expectedArchiveSha256 = "cbe4ce3f557314fa093ac51214a2ba5e9cf0a5f0ad67b5429ce3a95a5e59a382";
const productionDir = "dist-product-mixed-compiled-owner-row-fusion";
const pilotDir = "results/product-mixed-owner-row-fusion-pilot";
const pilotManifestPath = `${pilotDir}/results.json`;
const pilotVerifierPath = "scripts/verify_product_mixed_owner_row_fusion_pilot.mjs";
const pilotEvidenceVerifierPath = "scripts/verify_product_mixed_owner_row_fusion_pilot_evidence.mjs";
const pilotCheckpoint = "implementation/2026-10-13-owner-row-fusion-pilot";
const pilotStatusPath = `${pilotCheckpoint}/status.json`;
const pilotArchivePath = `${pilotCheckpoint}/evidence.tar.gz`;
const diagnosticPath = "results/numeric-cell-storage-candidate-v5/diagnostic.json";
const diagnosticArtifacts = [
  "results/numeric-cell-storage-candidate-v5/inspect_numeric_cell_storage_candidate_v5.mjs",
  "results/numeric-cell-storage-candidate-v5/owner-state-world-entry.ts",
  "results/numeric-cell-storage-candidate-v5/owner-state-world.iife.js",
  "results/numeric-cell-storage-candidate-v5/owner-state-world.source.ts",
];
const authoredProofPath = ".cache/compiled-owner-proof/compiled-owner-row-proof-1791897220716-45399-148948e4-9717-4af7-ac7e-6677cfe15b7c.json";
const threeProofPath = ".cache/compiled-owner-three-proof/compiled-three-owner-row-proof-1791897229482-45665-848b1a2a-3e3c-438f-a452-ee013892c29e.json";
const compilerDir = ".cache/product-mixed-compiled-owner-row-fusion/compiler-proof";
const compilerPaths = [
  `${compilerDir}/native.js`, `${compilerDir}/react.js`,
  `${compilerDir}/native.json`, `${compilerDir}/react.json`,
];
const protocolPath = "product-mixed-owner-row-fusion-confirmation-protocol.md";
const configPath = "vite.product-mixed-owner-row-fusion-timing.config.ts";
const baseConfigPath = "vite.product-mixed-compiled-owner-row-fusion.config.ts";
const collectorPath = "scripts/collect_product_mixed_owner_row_fusion.mjs";
const analyzerPath = "scripts/summarize_product_mixed_owner_row_fusion.mjs";
const verifierPath = "scripts/verify_product_mixed_owner_row_fusion_evidence.mjs";
const schedulePath = "src/browser/product_mixed_schedule.ts";
const harnessPath = "src/browser/product_mixed_harness.ts";
const contractPath = "src/browser/product_mixed_contract.ts";
const sizes = [128, 512, 1024];
const pairs = 5;
const warmup = 60;
const frameCount = 240;
const structuralFrames = [90, 120, 150, 180, 210, 240, 270, 300];
const viewport = { width: 1200, height: 900 };
const isolationHeaders = { coop: "same-origin", coep: "require-corp" };
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = async (filename) => JSON.parse(await readFile(filename, "utf8"));
const hashFile = async (filename) => sha(await readFile(filename));
const ordered = (values) => [...values].sort((a, b) => a - b);
const median = (values) => ordered(values)[Math.floor(values.length / 2)];
const quantile = (values, q) => ordered(values)[Math.ceil(q * values.length) - 1];
const geomean = (values) => values.some((value) => value === 0)
  ? 0
  : Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length);
const close = (actual, expected, label) => assert.ok(
  actual === expected || (Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) <= 1e-9),
  `${label}: ${actual} != ${expected}`,
);
const schedule = sizes.flatMap((size) => Array.from({ length: pairs }, (_, pair) =>
  (pair % 2 ? ["native", "react"] : ["react", "native"]).map((arm) => ({ size, pair, arm }))
).flat()).map((entry, sequence) => ({ ...entry, sequence }));
assert.equal(schedule.length, 30);

function archiveHashes(filename) {
  const script = `import hashlib,json,sys,tarfile
members={}
with tarfile.open(sys.argv[1], "r:gz") as archive:
    for member in archive:
        stream=archive.extractfile(member)
        if stream is None: raise RuntimeError("Unreadable archive member: "+member.name)
        if member.name in members: raise RuntimeError("Duplicate archive member: "+member.name)
        digest=hashlib.sha256()
        while True:
            chunk=stream.read(1024*1024)
            if not chunk: break
            digest.update(chunk)
        stream.close()
        members[member.name]=digest.hexdigest()
print(json.dumps(members,sort_keys=True))`;
  return JSON.parse(execFileSync("python3", ["-c", script, filename], {
    encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
  }));
}

const preregBytes = await readFile(preregPath);
const preregHash = sha(preregBytes);
const prereg = JSON.parse(preregBytes.toString("utf8"));
const status = await readJson(statusPath);
const manifest = await readJson(manifestPath);
const finalResults = await readJson(finalPath);
const postlock = await readJson(postlockPath);
const summary = await readJson(summaryPath);

assert.equal(prereg.schemaVersion, 1);
assert.equal(prereg.study, "compiled-product-mixed-owner-row-fusion-confirmation");
assert.deepEqual(prereg.schedule, schedule);
assert.equal(prereg.archive, archivePath);
assert.equal(prereg.archiveSha256, expectedArchiveSha256);
assert.equal(prereg.protocol, protocolPath);
assert.equal(prereg.protocolSha256, await hashFile(protocolPath));
assert.deepEqual(prereg.decision, {
  medianRatioMax: 0.8,
  medianSizesRequired: 2,
  p95RatioMax: 1.1,
  minDenominatorTicks: 5,
  denominatorRule: "max(preregistration,reactPage,nativePage) * minDenominatorTicks",
  unresolvedWhen: "The React page median is below its paired denominator resolution floor.",
  noPageExclusions: true,
});
assert.equal(prereg.workload.warmup, warmup);
assert.equal(prereg.workload.frames, frameCount);
assert.equal(prereg.workload.topologyEvery, 30);
assert.equal(prereg.workload.removed, 8);
assert.equal(prereg.workload.inserted, 8);
assert.equal(prereg.workload.rotation, 13);
assert.equal(prereg.workload.structuralFrames, 8);
assert.equal(prereg.workload.exactScheduleLength, 30);
assert.equal(prereg.browser.headless, false);
assert.equal(prereg.browser.gpu, false);
assert.equal(prereg.browser.serial, true);
assert.equal(prereg.browser.freshContexts, true);
assert.deepEqual(prereg.browser.viewport, viewport);
assert.equal(prereg.clock.readings, 100000);
assert.ok(Number.isFinite(prereg.clock.minPositiveDeltaMs) && prereg.clock.minPositiveDeltaMs > 0);
assert.ok(Number.isSafeInteger(prereg.clock.positiveObservations) && prereg.clock.positiveObservations > 0);
assert.equal(prereg.clock.rafIntervalsMs.length, 48);
assert.ok(prereg.clock.rafIntervalsMs.every((value) => Number.isFinite(value) && value >= 0));
assert.equal(prereg.clock.crossOriginIsolated, true);
assert.equal(prereg.clock.visibility, "visible");
assert.equal(prereg.clock.focused, true);
assert.equal(prereg.timingEnvironment.origin, "https://owner-row-fusion-confirmation.localhost:1355");
assert.equal(prereg.timingEnvironment.coop, isolationHeaders.coop);
assert.equal(prereg.timingEnvironment.coep, isolationHeaders.coep);
assert.equal(prereg.timingEnvironment.crossOriginIsolated, true);
assert.equal(prereg.timingEnvironment.assetPreflight.length, 5);
for (const asset of prereg.timingEnvironment.assetPreflight) {
  // Collector checks HTTP 200 before writing these served-byte hashes; status is not stored here.
  assert.equal(asset.sha256, prereg.productionSha256[asset.filename]);
  assert.equal(asset.coop, isolationHeaders.coop);
  assert.equal(asset.coep, isolationHeaders.coep);
}

// Recompute the archive union and verify every archived member against live bytes.
assert.equal(status.schemaVersion, 2);
assert.equal(status.status, "UNIT_AUTHORED_THREE_AND_PRODUCTION_BUILD_VERIFIED");
assert.equal(status.archiveSha256, expectedArchiveSha256);
assert.equal(status.archiveMembers, 1093);
assert.equal(status.runtimeTests, 695);
assert.equal(status.rustTests, 33);
assert.equal(status.candidateProductionPilotPages, 0);
assert.equal(status.speedGate, "UNMEASURED_CURRENT_REVISION");
assert.equal(status.qualifiedEngineDiagnostic, diagnosticPath);
assert.equal(await hashFile(archivePath), expectedArchiveSha256);
assert.equal(prereg.archiveSha256, status.archiveSha256);
assert.deepEqual(prereg.sourceAndBuildSha256, status.sourceAndBuildSha256);
assert.deepEqual(prereg.buildProofSha256, status.verificationSha256);
assert.deepEqual(prereg.historicalVerificationSha256, status.historicalVerificationSha256);
assert.equal(Object.keys(status.sourceAndBuildSha256).length, 1004);
assert.equal(Object.keys(status.verificationSha256).length, 25);
assert.equal(Object.keys(status.historicalVerificationSha256).length, 64);
const archive = archiveHashes(archivePath);
const inventory = [...new Set([
  ...Object.keys(status.sourceAndBuildSha256),
  ...Object.keys(status.verificationSha256),
  ...Object.keys(status.historicalVerificationSha256),
])].sort();
assert.equal(inventory.length, 1093);
assert.deepEqual(Object.keys(archive).sort(), inventory);
for (const map of [status.sourceAndBuildSha256, status.verificationSha256, status.historicalVerificationSha256]) {
  for (const [filename, expected] of Object.entries(map)) {
    assert.equal(archive[filename], expected, `Archive content mismatch: ${filename}`);
    assert.equal(await hashFile(filename), expected, `Current file differs from frozen hash: ${filename}`);
  }
}
const production = Object.fromEntries(Object.entries(status.sourceAndBuildSha256)
  .filter(([filename]) => filename.startsWith(`${productionDir}/`)));
assert.equal(Object.keys(production).length, 5);
assert.deepEqual(prereg.productionSha256, production);

// Ensure all preregistered direct inputs and the separate production pilot are hash-bound.
const pilot = await readJson(pilotManifestPath);
const pilotVerifierHash = await hashFile(pilotVerifierPath);
const pilotEvidenceVerifierHash = await hashFile(pilotEvidenceVerifierPath);
const pilotStatus = await readJson(pilotStatusPath);
assert.equal(pilot.status, "PASS");
assert.equal(pilot.scope, "Correctness pilot only; no confirmatory performance evidence");
assert.deepEqual(pilot.sourceArchive, { path: archivePath, sha256: expectedArchiveSha256 });
assert.deepEqual(pilot.productionSha256, production);
assert.deepEqual(pilot.servedAssetSha256, production);
assert.deepEqual(pilot.engineEpoch, {
  product: prereg.proof.chromiumStorageDiagnostic.browserVersion.product,
  jsVersion: prereg.proof.chromiumStorageDiagnostic.browserVersion.jsVersion,
  revision: prereg.proof.chromiumStorageDiagnostic.browserVersion.revision,
});
assert.equal(pilotStatus.status, "PRODUCTION_CORRECTNESS_PILOT_VERIFIED");
assert.equal(pilotStatus.archiveSha256, "925cb5eb7caf9c4e49c164666eb899c7c00f87075ef97828aba4052bc324534b");
assert.equal(await hashFile(pilotArchivePath), pilotStatus.archiveSha256);
assert.equal(pilot.sourceArchive.sha256, expectedArchiveSha256);
assert.equal(pilot.assetPreflight.length, 5);
for (const asset of pilot.assetPreflight) {
  assert.equal(asset.status, 200);
  assert.equal(asset.sha256, production[asset.filename]);
  assert.equal(pilot.servedAssetSha256[asset.filename], asset.sha256);
  assert.equal(asset.coop, isolationHeaders.coop);
  assert.equal(asset.coep, isolationHeaders.coep);
}
assert.equal(pilot.pageFiles.length, 6);
const expectedPilotRecords = sizes.flatMap((size) => [
  { arm: "native", size, status: "PASS" },
  { arm: "react", size, status: "PASS" },
]);
assert.deepEqual(pilot.records, expectedPilotRecords);
assert.deepEqual(pilot.pageFiles.map(({ arm, size, file }) => ({ arm, size, file })),
  expectedPilotRecords.map(({ arm, size }) => ({ arm, size, file: `${arm}-${size}.json` })));
const pilotHashes = {};
for (const item of pilot.pageFiles) {
  const filename = `${pilotDir}/${item.file}`;
  const page = await readJson(filename);
  const digest = await hashFile(filename);
  assert.equal(item.sha256, digest);
  assert.equal(page.status, "PASS");
  assert.equal(page.mode, "pilot");
  assert.equal(page.production, true);
  assert.equal(page.arm, item.arm);
  assert.equal(page.size, item.size);
  assert.equal(page.frames, 60);
  assert.deepEqual(page.productionSha256, production);
  assert.deepEqual(page.servedAssetSha256, production);
  assert.deepEqual(page.engineEpoch, pilot.engineEpoch);
  assert.deepEqual(page.browser.viewport, viewport);
  assert.deepEqual(Object.values(page.checks), [true, true, true, true, true]);
  assert.deepEqual(page.errors, []);
  assert.deepEqual(page.browserErrors, []);
  assert.deepEqual(page.samples.filter((sample) => sample.structural).map((sample) => sample.frame), [35, 65]);
  assert.equal(page.after.writers, 0);
  assert.equal(page.after.mounts, page.after.cleanups);
  pilotHashes[filename] = digest;
}

const diagnostic = await readJson(diagnosticPath);
assert.equal(diagnostic.status, "PASS");
assert.equal(diagnostic.attempt, "v5");
assert.equal(diagnostic.sourceSha256BeforeBundle, diagnostic.sourceSha256AfterBundle);
assert.equal(diagnostic.sourceSha256AfterBundle, status.sourceAndBuildSha256[diagnostic.sourcePath]);
assert.deepEqual(diagnostic.bundledInputHashes, diagnostic.bundledInputHashesAfterBundle);
assert.equal(Object.keys(diagnostic.bundledInputHashes).length, 6);
for (const [filename, expected] of Object.entries(diagnostic.bundledInputHashes)) {
  assert.equal(await hashFile(filename), expected);
  assert.equal(status.sourceAndBuildSha256[filename] ?? status.verificationSha256[filename] ?? status.historicalVerificationSha256[filename], expected);
}
const diagnosticEngine = {
  product: diagnostic.browserVersion.product,
  jsVersion: diagnostic.browserVersion.jsVersion,
  revision: diagnostic.browserVersion.revision,
};
assert.deepEqual(pilot.engineEpoch, diagnosticEngine);

const authoredProof = await readJson(authoredProofPath);
const threeProof = await readJson(threeProofPath);
assert.equal(prereg.proof.compiledOwnerRow.path, authoredProofPath);
assert.equal(prereg.proof.compiledOwnerRow.sha256, await hashFile(authoredProofPath));
assert.equal(prereg.proof.compiledOwnerRow.status, authoredProof.status);
assert.deepEqual(prereg.proof.compiledOwnerRow.ownerRowPrograms, authoredProof.ownerRowPrograms);
assert.deepEqual(prereg.proof.compiledOwnerRow.assertions, authoredProof.assertions);
assert.equal(authoredProof.status, "PASS");
assert.equal(threeProof.status, "PASS");
assert.equal(prereg.proof.actualThreeOwnerRow.path, threeProofPath);
assert.equal(prereg.proof.actualThreeOwnerRow.sha256, await hashFile(threeProofPath));
assert.equal(prereg.proof.actualThreeOwnerRow.status, threeProof.status);
assert.equal(prereg.proof.actualThreeOwnerRow.ownerProgramId, threeProof.ownerProgramId);
assert.deepEqual(prereg.proof.actualThreeOwnerRow.numericOwnerRowCut, threeProof.numericOwnerRowCut);
assert.deepEqual(prereg.proof.actualThreeOwnerRow.assertions, threeProof.assertions);
assert.deepEqual(prereg.proof.actualThreeOwnerRow.threeObjectIdentity, threeProof.threeObjectIdentity);
assert.deepEqual(authoredProof.ownerRowPrograms.sparseAndDenseCalls.map(({ count }) => count), [1, 6]);
assert.equal(authoredProof.ownerRowPrograms.preparedProgramCount, 2);
assert.equal(authoredProof.ownerRowPrograms.eligibleNonemptyPendingCaptureCalls, 0);
assert.equal(threeProof.numericOwnerRowCut.batches, 240);
assert.equal(threeProof.numericOwnerRowCut.cellsPerBatch, 5);
assert.equal(threeProof.numericOwnerRowCut.preparedRowProgramCount, 1);
assert.ok(Object.values(threeProof.assertions).every((value) => value === true));
const nativeCompilerProof = await readJson(compilerPaths[2]);
const reactCompilerProof = await readJson(compilerPaths[3]);
assert.equal(nativeCompilerProof.arm, "native");
assert.equal(nativeCompilerProof.compiled, true);
assert.equal(nativeCompilerProof.bindings, 3);
assert.equal(nativeCompilerProof.ownerRow.validDescriptors, true);
assert.equal(nativeCompilerProof.ownerRow.validBindings, true);
assert.equal(nativeCompilerProof.ownerRow.numericDescriptors.length, 3);
assert.deepEqual(reactCompilerProof, { arm: "react", compiled: true, rowMemoCache: true, boardMemoCache: true });
assert.equal(prereg.proof.compilerEmission.numericProgramDescriptors, 3);
assert.equal(prereg.proof.compilerEmission.numericProgramBindings, 3);
assert.deepEqual(prereg.proof.compilerEmission.files, Object.fromEntries(await Promise.all(
  compilerPaths.map(async (filename) => [filename, await hashFile(filename)]),
)));
assert.deepEqual(prereg.proof.compilerEmission.native, nativeCompilerProof);
assert.deepEqual(prereg.proof.compilerEmission.react, reactCompilerProof);

// Input locks are exact, then rechecked against bytes after the collection.
const locks = prereg.inputLocks;
assert.ok(locks && typeof locks === "object");
assert.deepEqual(prereg.verifier, { path: verifierPath, sha256: locks[verifierPath] });
assert.equal(prereg.analyzer.path, analyzerPath);
assert.equal(prereg.analyzer.sha256, locks[analyzerPath]);
assert.equal(locks[archivePath], expectedArchiveSha256);
assert.equal(locks[statusPath], await hashFile(statusPath));
assert.equal(locks[pilotManifestPath], await hashFile(pilotManifestPath));
assert.equal(locks[pilotVerifierPath], pilotVerifierHash);
assert.equal(locks[diagnosticPath], await hashFile(diagnosticPath));
for (const [filename, expected] of Object.entries(locks)) {
  assert.equal(await hashFile(filename), expected, `Input changed: ${filename}`);
}
const pilotProof = prereg.proof.productionPilot;
const expectedLockPaths = [...new Set([
  archivePath, statusPath,
  ...Object.keys(status.sourceAndBuildSha256),
  ...Object.keys(status.verificationSha256),
  ...Object.keys(status.historicalVerificationSha256),
  ...compilerPaths,
  authoredProofPath,
  pilotProof?.statusPath,
  pilotProof?.archivePath,
  pilotProof?.verificationPath,
  pilotProof?.verifier?.path,
  pilotProof?.evidenceVerifier?.path,
  pilotManifestPath,
  ...(pilotStatus.evidenceSha256 ? Object.keys(pilotStatus.evidenceSha256) : []),
  ...(pilot.pageFiles ?? []).map(({ file }) => `${pilotDir}/${file}`),
  threeProofPath,
  pilotProof?.authoredOwnerRowProof?.path,
  pilotProof?.actualThreeOwnerRowProof?.path,
  ...(prereg.proof.compiledOwnerRow?.currentNativeBindingV2OwnerMeta
    ? Object.values(prereg.proof.compiledOwnerRow.currentNativeBindingV2OwnerMeta).map(({ path: p }) => p)
    : []),
  diagnosticPath,
  ...diagnosticArtifacts,
  ...Object.keys(diagnostic.bundledInputHashes),
  protocolPath, configPath, baseConfigPath, collectorPath, analyzerPath, verifierPath, schedulePath,
])].filter(Boolean).sort();
assert.deepEqual(Object.keys(locks).sort(), expectedLockPaths,
  "Input lock must cover the complete checkpoint, proof, pilot, diagnostic, and tool inventory exactly");
assert.equal(manifest.status, "COLLECTION_COMPLETE");
assert.equal(manifest.runId, prereg.runId);
assert.equal(manifest.preregistrationSha256, preregHash);
assert.equal(manifest.archiveSha256, expectedArchiveSha256);
assert.deepEqual(manifest.postCollectionChangedFiles, []);
assert.deepEqual(manifest.failedOrIncomplete, []);
assert.equal(finalResults.status, "PASS");
assert.equal(finalResults.study, prereg.study);
assert.equal(finalResults.runId, prereg.runId);
assert.deepEqual(finalResults.records, manifest.records);
assert.equal(finalResults.postlock.status, "PASS");
assert.deepEqual(finalResults.postlock.mismatches, []);
assert.equal(postlock.status, "PASS");
assert.equal(postlock.study, prereg.study);
assert.equal(postlock.runId, prereg.runId);
assert.deepEqual(postlock.mismatches, []);
assert.deepEqual(postlock.records.map(({ filename }) => filename).sort(), Object.keys(locks).sort());
for (const item of postlock.records) {
  assert.equal(item.expected, locks[item.filename]);
  assert.equal(item.observed, item.expected);
  assert.equal(item.matches, true);
}

// Validate every page and calculate summary values from raw measurements.
const files = await readdir(raw);
const sequenceFiles = files.filter((name) => /^sequence-\d{2}\.json$/.test(name)).sort();
assert.deepEqual(sequenceFiles, schedule.map(({ sequence }) => `sequence-${String(sequence).padStart(2, "0")}.json`));
const allowedJson = new Set([
  "preregistration.json", "manifest.json", "postlock.json", "FINALresults.json",
  "summary.json", "summary-v2.json", "summary-v3.json", "verification.json", "verification-v2.json", "verification-v3.json", ...sequenceFiles,
]);
assert.deepEqual(files.filter((name) => name.endsWith(".json") && !allowedJson.has(name)), [],
  "Unexpected JSON evidence in timing output directory");
const manifestBySequence = new Map(manifest.files.map((item) => [item.sequence, item]));
assert.equal(manifestBySequence.size, 30);
const pages = [];
for (const expected of schedule) {
  const filename = `${raw}/sequence-${String(expected.sequence).padStart(2, "0")}.json`;
  const bytes = await readFile(filename);
  const record = JSON.parse(bytes.toString("utf8"));
  const entry = manifestBySequence.get(expected.sequence);
  assert.equal(entry.file, filename);
  assert.equal(entry.sha256, sha(bytes));
  assert.equal(record.status, "PASS");
  assert.equal(record.runId, prereg.runId);
  assert.deepEqual(record.schedule, expected);
  assert.equal(record.preregistrationSha256, preregHash);
  assert.equal(record.archiveSha256, expectedArchiveSha256);
  assert.equal(record.protocolSha256, prereg.protocolSha256);
  assert.deepEqual(record.browserErrors, []);
  assert.equal(record.crossOriginIsolated, true);
  assert.deepEqual(record.navigationHeaders, isolationHeaders);
  assert.deepEqual(record.endVisibility, { state: "visible", focused: true });
  const clock = record.postDisposeClock;
  assert.equal(clock.readings, 100000);
  assert.ok(Number.isFinite(clock.minPositiveDeltaMs) && clock.minPositiveDeltaMs > 0);
  assert.ok(clock.positiveObservations > 0);
  assert.equal(clock.crossOriginIsolated, true);
  assert.equal(clock.visibility, "visible");
  assert.equal(clock.focused, true);
  assert.equal(clock.coop, isolationHeaders.coop);
  assert.equal(clock.coep, isolationHeaders.coep);
  assert.equal(clock.rafIntervalsMs.length, 48);
  const resources = new Set();
  assert.ok(record.loadedBuildResources.length > 0);
  for (const resource of record.loadedBuildResources) {
    assert.equal(resource.status, 200);
    assert.ok(Object.hasOwn(production, resource.filename));
    assert.equal(resource.sha256, production[resource.filename]);
    assert.equal(resource.coop, isolationHeaders.coop);
    assert.equal(resource.coep, isolationHeaders.coep);
    resources.add(path.basename(resource.filename));
  }
  const selected = expected.arm === "native" ? /^native_product_mixed_arm-/ : /^product_mixed_react_arm-/;
  const opposite = expected.arm === "native" ? /^product_mixed_react_arm-/ : /^native_product_mixed_arm-/;
  assert.ok([...resources].some((name) => selected.test(name)));
  assert.ok(![...resources].some((name) => opposite.test(name)));
  const result = record.result;
  assert.equal(result.mode, "confirm");
  assert.equal(result.status, "PASS");
  assert.equal(result.production, true);
  assert.equal(result.arm, expected.arm);
  assert.equal(result.size, expected.size);
  assert.equal(result.pair, expected.pair);
  assert.equal(result.sequence, expected.sequence);
  assert.equal(result.warmup, warmup);
  assert.equal(result.frames, frameCount);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(Object.keys(result.checks).sort(), ["identity", "lifecycle", "order", "output", "visible"]);
  assert.ok(Object.values(result.checks).every((value) => value === true));
  assert.equal(result.samples.length, frameCount);
  assert.deepEqual(result.samples.map(({ frame }) => frame), Array.from({ length: frameCount }, (_, index) => warmup + index + 1));
  assert.deepEqual(result.samples.filter(({ structural }) => structural).map(({ frame }) => frame), structuralFrames);
  for (const sample of result.samples) {
    assert.equal(sample.structural, structuralFrames.includes(sample.frame));
    assert.ok(Number.isFinite(sample.commitMs) && sample.commitMs >= 0);
    assert.ok(Number.isFinite(sample.intervalMs) && sample.intervalMs >= 0);
  }
  const sampleSummary = (values) => ({ medianMs: median(values), p95Ms: quantile(values, 0.95) });
  assert.deepEqual(result.summary, {
    all: sampleSummary(result.samples.map(({ commitMs }) => commitMs)),
    ordinary: sampleSummary(result.samples.filter(({ structural }) => !structural).map(({ commitMs }) => commitMs)),
    structural: sampleSummary(result.samples.filter(({ structural }) => structural).map(({ commitMs }) => commitMs)),
    interval: sampleSummary(result.samples.map(({ intervalMs }) => intervalMs)),
  });
  assert.equal(result.active.writers, expected.size);
  assert.equal(result.active.mounts, result.active.cleanups + expected.size);
  assert.equal(result.after.writers, 0);
  assert.equal(result.after.mounts, result.after.cleanups);
  if (expected.arm === "native") {
    assert.equal(result.after.extra.root.ownerCount, 0);
    assert.equal(result.after.extra.root.disposed, true);
    assert.equal(result.after.extra.collection.readerCount, 0);
    assert.equal(result.after.extra.collection.retainedBatches, 0);
  }
  pages.push({ ...expected, sequence: expected.sequence, clockMs: clock.minPositiveDeltaMs, result });
}

// The raw result carries check outcomes rather than DOM snapshots. Bind correctness claims
// to the archived harness source without claiming to independently reconstruct those snapshots.
assert.ok(status.sourceAndBuildSha256[harnessPath]);
assert.ok(status.sourceAndBuildSha256[contractPath]);
const harness = await readFile(harnessPath, "utf8");
const contract = await readFile(contractPath, "utf8");
assert.match(harness, /checks\.order\s*=\s*false/);
assert.match(harness, /checks\.identity\s*=\s*false/);
assert.match(harness, /checks\.output\s*=\s*false/);
assert.match(harness, /productMixedState\(id, frame\)/);
assert.match(contract, /export const productMixedState/);

const computedSizes = sizes.map((size) => {
  const pairRows = Array.from({ length: pairs }, (_, pair) => {
    const native = pages.find((p) => p.size === size && p.pair === pair && p.arm === "native");
    const react = pages.find((p) => p.size === size && p.pair === pair && p.arm === "react");
    const stats = (page) => {
      const commits = page.result.samples.map((sample) => sample.commitMs);
      return { median: median(commits), p95: quantile(commits, 0.95) };
    };
    return { native, react, n: stats(native), r: stats(react) };
  });
  const floors = pairRows.map(({ native, react }) =>
    Math.max(prereg.clock.minPositiveDeltaMs, native.clockMs, react.clockMs) * prereg.decision.minDenominatorTicks);
  const medianRatios = pairRows.map((pair, i) => pair.r.median < floors[i] ? null : pair.n.median / pair.r.median);
  const p95Ratios = pairRows.map((pair, i) => pair.r.p95 < floors[i] ? null : pair.n.p95 / pair.r.p95);
  const resolvedMedians = medianRatios.filter(Number.isFinite);
  const resolvedP95s = p95Ratios.filter(Number.isFinite);
  return {
    size,
    pairs: pairRows.map(({ native, react, n, r }, index) => ({
      pair: native.pair,
      nativeSequence: native.sequence,
      reactSequence: react.sequence,
      clockFloorMs: floors[index] / prereg.decision.minDenominatorTicks,
      denominatorResolutionMs: floors[index],
      nativeMedianMs: n.median,
      reactMedianMs: r.median,
      nativeP95Ms: n.p95,
      reactP95Ms: r.p95,
      medianRatio: medianRatios[index],
      p95Ratio: p95Ratios[index],
    })),
    pairedMedianGeometricMeanRatio: resolvedMedians.length === pairs ? geomean(resolvedMedians) : null,
    medianPairsResolved: resolvedMedians.length,
    medianRatioPass: resolvedMedians.length !== pairs ? null : geomean(resolvedMedians) <= prereg.decision.medianRatioMax,
    medianPairedP95Ratio: resolvedP95s.length === pairs ? median(resolvedP95s) : null,
    p95PairsResolved: resolvedP95s.length,
    p95RatioPass: resolvedP95s.length !== pairs ? null : median(resolvedP95s) <= prereg.decision.p95RatioMax,
  };
});
const medianPassingSizes = computedSizes.filter((row) => row.medianRatioPass === true).map(({ size }) => size);
const medianUnresolvedSizes = computedSizes.filter((row) => row.medianRatioPass === null).map(({ size }) => size);
const p95FailingSizes = computedSizes.filter((row) => row.p95RatioPass === false).map(({ size }) => size);
const p95UnresolvedSizes = computedSizes.filter((row) => row.p95RatioPass === null).map(({ size }) => size);
const medianGate = medianPassingSizes.length >= prereg.decision.medianSizesRequired
  ? "PASS"
  : medianPassingSizes.length + medianUnresolvedSizes.length < prereg.decision.medianSizesRequired ? "FAIL" : "UNRESOLVED";
const p95Gate = p95FailingSizes.length ? "FAIL" : p95UnresolvedSizes.length ? "UNRESOLVED" : "PASS";
const gate = medianGate === "FAIL" || p95Gate === "FAIL" ? "FAIL"
  : medianGate === "UNRESOLVED" || p95Gate === "UNRESOLVED" ? "UNRESOLVED" : "PASS";

// Analyzer is checked against independently recomputed ratios and decision outcomes.
assert.equal(summary.study, prereg.study);
assert.equal(summary.gate, gate);
assert.equal(summary.counts.scheduled, 30);
assert.equal(summary.counts.valid, 30);
assert.equal(summary.counts.invalid, 0);
assert.deepEqual(summary.validation.invalidPages, []);
assert.deepEqual(summary.validation.preregistrationErrors, []);
assert.deepEqual(summary.validation.archiveContentErrors, []);
assert.deepEqual(summary.validation.directoryErrors, []);
assert.equal(summary.decision.medianGate, medianGate);
assert.deepEqual(summary.decision.medianPassingSizes, medianPassingSizes);
assert.deepEqual(summary.decision.medianUnresolvedSizes, medianUnresolvedSizes);
assert.equal(summary.decision.p95Gate, p95Gate);
assert.deepEqual(summary.decision.p95FailingSizes, p95FailingSizes);
assert.deepEqual(summary.decision.p95UnresolvedSizes, p95UnresolvedSizes);
for (const row of computedSizes) {
  const reported = summary.sizes.find((item) => item.size === row.size);
  assert.ok(reported);
  close(reported.decision.pairedMedianGeometricMeanRatio, row.pairedMedianGeometricMeanRatio, `${row.size} paired median ratio`);
  close(reported.decision.medianPairedP95Ratio, row.medianPairedP95Ratio, `${row.size} paired p95 ratio`);
  assert.equal(reported.decision.medianRatioPass, row.medianRatioPass);
  assert.equal(reported.decision.p95RatioPass, row.p95RatioPass);
}

const repairAnalyzerPath = "scripts/summarize_product_mixed_owner_row_fusion_v3.mjs";
assert.equal(summary.analysisTools.analyzer.path, repairAnalyzerPath);
assert.equal(summary.analysisTools.analyzer.sha256, await hashFile(repairAnalyzerPath));
assert.equal(summary.analysisTools.repair.originalPath, analyzerPath);
assert.equal(summary.analysisTools.repair.originalSha256, locks[analyzerPath]);
assert.equal(summary.analysisTools.repair.failureLogSha256, await hashFile(summary.analysisTools.repair.failureLog));
const repairVerifierPath = "scripts/verify_product_mixed_owner_row_fusion_evidence_v3.mjs";
const verification = {
  schemaVersion: 1,
  status: "PASS",
  study: prereg.study,
  runId: prereg.runId,
  rawPagesVerified: pages.length,
  sourceArchiveMembersVerified: Object.keys(archive).length,
  inventoryVerified: {
    sourceAndBuild: Object.keys(status.sourceAndBuildSha256).length,
    currentVerification: Object.keys(status.verificationSha256).length,
    historicalVerification: Object.keys(status.historicalVerificationSha256).length,
  },
  correctnessEvidence: {
    recordedChecksAndErrorsVerified: true,
    lockedHarnessAndContractVerified: true,
    rawDomSnapshotsPresent: false,
    limitation: "The raw records contain per-page check outcomes, not per-frame DOM snapshots. The verifier validates the locked harness and contract that produce those checks; it does not reconstruct individual row values or identities from raw records.",
  },
  independentlyComputed: { medianGate, p95Gate, overallGate: gate, sizes: computedSizes },
  analyzerAgreementVerified: true,
  pilotAndDiagnosticVerified: true,
  inputLockCount: Object.keys(locks).length,
  verifier: { path: repairVerifierPath, sha256: await hashFile(repairVerifierPath) },
  analysisRepairVerified: summary.analysisTools.repair,
  verifierRepair: { priorPath: "scripts/verify_product_mixed_owner_row_fusion_evidence_v2.mjs", priorSha256: await hashFile("scripts/verify_product_mixed_owner_row_fusion_evidence_v2.mjs"), failureLog: ".cache/owner-row-fusion-timing-primary/verification-v2.log", failureLogSha256: await hashFile(".cache/owner-row-fusion-timing-primary/verification-v2.log"), scope: "Prereg served-byte metadata has no status field; HTTP200 is checked by the locked collector. Same raw data and gates." },
  preregisteredVerifier: { path: verifierPath, sha256: locks[verifierPath] },
};
await writeFile(outputPath, `${JSON.stringify(verification, null, 2)}\n`, { flag: "wx" });
console.log(`PASS independent owner-row-fusion evidence verification: ${pages.length} pages; recomputed gate ${gate}.`);
