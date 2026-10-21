/** Independently verify frozen compiled owner rows product confirmation evidence. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const rawDir = "results/product-mixed-compiled-owner-rows-confirmation";
const preregPath = `${rawDir}/preregistration.json`;
const manifestPath = `${rawDir}/manifest.json`;
const postlockPath = `${rawDir}/postlock.json`;
const finalResultsPath = `${rawDir}/FINALresults.json`;
const originalSummaryPath = `${rawDir}/summary.json`;
const summaryPath = `${rawDir}/summary-v2.json`;
const verificationPath = `${rawDir}/verification-v3.json`;
const checkpoint = "implementation/2026-10-13-compiled-owner-rows";
const statusPath = `${checkpoint}/status.json`;
const archivePath = `${checkpoint}/source-and-evidence.tar.gz`;
const expectedArchiveHash = "4aabe8b6cb3168aae50ba8474464452494d790aac60b472611fc20f54ec7a08c";
const pilotDir = "results/product-mixed-compiled-owner-rows-pilot";
const pilotManifestPath = `${pilotDir}/results.json`;
const compilerProofPaths = [
  ".cache/product-mixed-compiled-owner-rows/compiler-proof/native.js",
  ".cache/product-mixed-compiled-owner-rows/compiler-proof/react.js",
  ".cache/product-mixed-compiled-owner-rows/compiler-proof/native.json",
  ".cache/product-mixed-compiled-owner-rows/compiler-proof/react.json",
];
const authoredOwnerRowProofPath = ".cache/compiled-owner-proof/compiled-owner-row-proof-1791891092204-6101-de502448-3663-461a-aac8-23ad74563e33.json";
const actualThreeOwnerRowProofPath = ".cache/compiled-owner-three-proof/compiled-three-owner-row-proof-1791891101523-6304-3e133077-e20e-4579-8bf2-87ebc5a2dd70.json";
const chromiumDiagnosticPath = "results/numeric-cell-storage-candidate-v5/diagnostic.json";
const chromiumDiagnosticDirectory = "results/numeric-cell-storage-candidate-v5";
const chromiumDiagnosticArtifacts = [
  `${chromiumDiagnosticDirectory}/inspect_numeric_cell_storage_candidate_v5.mjs`,
  `${chromiumDiagnosticDirectory}/owner-state-world-entry.ts`,
  `${chromiumDiagnosticDirectory}/owner-state-world.iife.js`,
];
const protocolPath = "product-mixed-compiled-owner-rows-confirmation-protocol.md";
const timingConfigPath = "vite.product-mixed-compiled-owner-rows-timing.config.ts";
const baseConfigPath = "vite.product-mixed-compiled-owner-rows.config.ts";
const collectorPath = "scripts/collect_product_mixed_compiled_owner_rows.mjs";
const analyzerPath = "scripts/summarize_product_mixed_compiled_owner_rows.mjs";
const verifierPath = "scripts/verify_product_mixed_compiled_owner_rows_evidence.mjs";
const v2AnalyzerPath = "scripts/summarize_product_mixed_compiled_owner_rows_v2.mjs";
const v2VerifierPath = "scripts/verify_product_mixed_compiled_owner_rows_evidence_v2.mjs";
const v3VerifierPath = "scripts/verify_product_mixed_compiled_owner_rows_evidence_v3.mjs";
const pilotVerifierPath = "scripts/verify_product_mixed_compiled_owner_rows_pilot.mjs";
const buildDirectory = "dist-product-mixed-compiled-owner-rows";
const schedulePath = "src/browser/product_mixed_schedule.ts";
const harnessPath = "src/browser/product_mixed_harness.ts";
const contractPath = "src/browser/product_mixed_contract.ts";
const sizes = [128, 512, 1024];
const pairsPerSize = 5;
const warmup = 60;
const measuredFrames = 240;
const structuralFrames = [90, 120, 150, 180, 210, 240, 270, 300];

const sha = (value) => createHash("sha256").update(value).digest("hex");
const readJson = async (filename) => JSON.parse(await readFile(filename, "utf8"));
const ordered = (values) => [...values].sort((a, b) => a - b);
const quantile = (values, q) => ordered(values)[Math.ceil(q * values.length) - 1];
const median = (values) => ordered(values)[Math.floor(values.length / 2)];
const geomean = (values) => values.some((value) => value === 0)
  ? 0
  : Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length);
const close = (actual, expected, label) => assert.ok(
  actual === expected || (Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) <= 1e-9),
  `${label}: ${actual} != ${expected}`,
);
const expectedSchedule = sizes.flatMap((size) => Array.from({ length: pairsPerSize }, (_, pair) =>
  (pair % 2 ? ["native", "react"] : ["react", "native"]).map((arm) => ({ size, pair, arm }))
).flat()).map((entry, sequence) => ({ ...entry, sequence }));
const expectedSampleFrames = Array.from({ length: measuredFrames }, (_, index) => warmup + index + 1);
const hashFile = async (filename) => sha(await readFile(filename));
function assertOwnerRowMetadata(nativeProof) {
  assert.equal(nativeProof.arm, "native");
  assert.equal(nativeProof.compiled, true);
  assert.equal(nativeProof.bindings, 3);
  assert.equal(nativeProof.deltas, true);
  assert.equal(nativeProof.propOnly, true);
  assert.equal(nativeProof.deltaFallback, false);
  const ownerRow = nativeProof.ownerRow;
  assert.ok(ownerRow, "Missing v2 ownerRow metadata");
  assert.equal(ownerRow.matchesOwnerProgram, true);
  assert.equal(ownerRow.denseSlots, true);
  assert.equal(ownerRow.validDescriptors, true);
  assert.equal(ownerRow.validBindings, true);
  const ownerProgramId = "src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow";
  const slots = [0, 1, 2].map((slot) => ({
    siteId: `${ownerProgramId}#state:${slot}`,
    slot,
  }));
  assert.equal(ownerRow.ownerProgramId, ownerProgramId);
  assert.equal(ownerRow.stateLayoutProgramId, ownerProgramId);
  assert.deepEqual(ownerRow.slots, slots);
  assert.deepEqual(ownerRow.bindings, slots.map(({ siteId }, programIndex) => ({ siteId, programIndex })));
  assert.equal(ownerRow.numericDescriptors.length, 3);
  assert.equal(new Set(ownerRow.numericDescriptors.map(({ sinkId }) => sinkId)).size, 3);
  for (const [index, descriptor] of ownerRow.numericDescriptors.entries()) {
    assert.equal(descriptor.schemaVersion, 2);
    assert.equal(descriptor.ownerProgramId, ownerProgramId);
    assert.ok(descriptor.sinkId.length > 0);
    assert.deepEqual(descriptor.sourceSites, [slots[index].siteId]);
  }
  return ownerRow;
}

assert.equal(expectedSchedule.length, 30);
const preregBytes = await readFile(preregPath);
const preregHash = sha(preregBytes);
const prereg = JSON.parse(preregBytes);
const manifest = await readJson(manifestPath);
const postlock = await readJson(postlockPath);
const finalResults = await readJson(finalResultsPath);
const originalSummary = await readJson(originalSummaryPath);
const summary = await readJson(summaryPath);
assert.equal(prereg.schemaVersion, 1);
assert.equal(prereg.study, "compiled-product-mixed-owner-rows-confirmation");
assert.deepEqual(prereg.schedule, expectedSchedule, "Frozen schedule must be five alternating pairs at each size");
assert.equal(prereg.archive, archivePath);
assert.equal(prereg.archiveSha256, expectedArchiveHash);
assert.equal(prereg.protocol, protocolPath);
assert.equal(prereg.protocolSha256, await hashFile(protocolPath));
assert.equal(prereg.workload.warmup, warmup);
assert.equal(prereg.workload.frames, measuredFrames);
assert.equal(prereg.workload.topologyEvery, 30);
assert.equal(prereg.workload.structuralFrames, 8);
assert.equal(prereg.workload.removed, 8);
assert.equal(prereg.workload.inserted, 8);
assert.equal(prereg.workload.rotation, 13);
assert.deepEqual(prereg.workload.measuredFrameNumbers, [61, 300]);
assert.equal(prereg.workload.exactScheduleLength, 30);
assert.equal(prereg.decision.medianRatioMax, 0.8);
assert.equal(prereg.decision.medianSizesRequired, 2);
assert.equal(prereg.decision.p95RatioMax, 1.1);
assert.equal(prereg.decision.minDenominatorTicks, 5);
assert.equal(prereg.decision.noPageExclusions, true);
assert.equal(prereg.decision.denominatorRule, "max(preregistration,reactPage,nativePage) * minDenominatorTicks");
assert.equal(prereg.browser.headless, false);
assert.equal(prereg.browser.gpu, false);
assert.equal(prereg.browser.serial, true);
assert.equal(prereg.browser.freshContexts, true);
assert.deepEqual(prereg.browser.viewport, { width: 1200, height: 900 });
assert.equal(prereg.timingEnvironment.origin, "https://compiled-owner-rows-timing.localhost:1355");
assert.equal(prereg.timingEnvironment.coop, "same-origin");
assert.equal(prereg.timingEnvironment.coep, "require-corp");
assert.equal(prereg.timingEnvironment.crossOriginIsolated, true);
assert.equal(prereg.clock.readings, 100000);
assert.ok(prereg.clock.minPositiveDeltaMs > 0);
assert.ok(Number.isSafeInteger(prereg.clock.positiveObservations) && prereg.clock.positiveObservations > 0);
assert.equal(prereg.clock.rafIntervalsMs.length, 48);
assert.ok(prereg.clock.rafIntervalsMs.every((value) => Number.isFinite(value) && value >= 0));
assert.equal(prereg.clock.crossOriginIsolated, true);
assert.equal(prereg.clock.visibility, "visible");
assert.equal(prereg.clock.focused, true);
assert.equal(typeof prereg.clock.userAgent, "string");
assert.ok(prereg.clock.userAgent.length > 0);
assert.equal(typeof prereg.clock.platform, "string");
assert.ok(Number.isSafeInteger(prereg.clock.hardwareConcurrency));
assert.ok(Number.isFinite(prereg.clock.timeOrigin) && prereg.clock.timeOrigin >= 0);
assert.equal(prereg.timingEnvironment.configPath, timingConfigPath);
assert.equal(prereg.timingEnvironment.baseConfigPath, baseConfigPath);

// Validate candidate status, complete inventory, and the actual bytes in the frozen archive.
const status = await readJson(statusPath);
assert.equal(status.status, "UNIT_AUTHORED_COMPILER_THREE_AND_CHROMIUM_VERIFIED");
assert.equal(status.runtimeTests, 694);
assert.equal(status.rustTests, 33);
assert.equal(status.candidateProductionPilotPages, 0, "Checkpoint pilot count must remain immutable");
assert.equal(status.speedGate, "UNMEASURED_CURRENT_REVISION");
assert.equal(status.allocationGate, "UNMEASURED_CURRENT_REVISION");
assert.equal(status.currentPackageGate, "NOT_REQUALIFIED_CURRENT_REVISION");
assert.equal(status.maintenanceGate, "HOLD");
assert.equal(status.archive, "source-and-evidence.tar.gz");
assert.equal(status.authoredOwnerRowProof, authoredOwnerRowProofPath);
assert.equal(status.actualThreeOwnerRowProof, actualThreeOwnerRowProofPath);
assert.ok(authoredOwnerRowProofPath in status.verificationSha256);
assert.ok(actualThreeOwnerRowProofPath in status.verificationSha256);
assert.equal(status.qualifiedEngineDiagnostic, chromiumDiagnosticPath);
assert.equal(status.archiveSha256, expectedArchiveHash);
assert.equal(await hashFile(archivePath), expectedArchiveHash);
assert.equal(Object.keys(status.sourceAndBuildSha256).length, 965);
assert.equal(Object.keys(status.verificationSha256).length, 64);
assert.deepEqual(prereg.sourceAndBuildSha256, status.sourceAndBuildSha256);
assert.deepEqual(prereg.buildProofSha256, status.verificationSha256);
assert.deepEqual(prereg.candidate, {
  status: status.status,
  archivePath,
  archiveSha256: expectedArchiveHash,
  runtimeTests: 694,
  rustTests: 33,
  candidateProductionPilotPages: 0,
});
const archiveMembers = JSON.parse(execFileSync("python3", ["-c", `import hashlib,json,sys,tarfile
members={}
with tarfile.open(sys.argv[1], "r:gz") as archive:
    for member in archive:
        stream=archive.extractfile(member)
        if stream is None: raise RuntimeError("Unreadable archive member: "+member.name)
        digest=hashlib.sha256()
        while True:
            chunk=stream.read(1024*1024)
            if not chunk: break
            digest.update(chunk)
        stream.close()
        members[member.name]=digest.hexdigest()
print(json.dumps(members,sort_keys=True))`, archivePath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));
const archiveInventory = [...new Set([
  ...Object.keys(status.sourceAndBuildSha256),
  ...Object.keys(status.verificationSha256),
])].sort();
assert.equal(archiveInventory.length, 1029);
assert.deepEqual(Object.keys(archiveMembers).sort(), archiveInventory);
for (const [filename, expected] of Object.entries(status.sourceAndBuildSha256)) {
  assert.equal(archiveMembers[filename], expected, `Archived source/build member mismatch: ${filename}`);
  assert.equal(await hashFile(filename), expected, `Current source/build file differs from archive: ${filename}`);
}
for (const [filename, expected] of Object.entries(status.verificationSha256)) {
  assert.equal(archiveMembers[filename], expected, `Archived verification member mismatch: ${filename}`);
  assert.equal(await hashFile(filename), expected, `Current verification file differs from checkpoint: ${filename}`);
}
const production = Object.fromEntries(Object.entries(status.sourceAndBuildSha256).filter(([name]) => name.startsWith(`${buildDirectory}/`)));
assert.equal(Object.keys(production).length, 5);
assert.deepEqual(prereg.productionSha256, production);
assert.deepEqual(
  [...prereg.timingEnvironment.assetPreflight].sort((a, b) => a.filename.localeCompare(b.filename)),
  Object.entries(production).map(([filename, digest]) => ({ filename, sha256: digest, coop: "same-origin", coep: "require-corp" })).sort((a, b) => a.filename.localeCompare(b.filename)),
);
assert.equal(prereg.collectorSha256, prereg.inputLocks[collectorPath]);
assert.equal(prereg.analyzer.path, analyzerPath);
assert.equal(prereg.analyzer.sha256, prereg.inputLocks[analyzerPath]);
assert.equal(prereg.verifier.path, verifierPath);
assert.equal(prereg.verifier.sha256, prereg.inputLocks[verifierPath]);
assert.equal(prereg.inputLocks[analyzerPath], await hashFile(analyzerPath), "Original preregistered V1 analyzer changed");
assert.equal(prereg.inputLocks[verifierPath], await hashFile(verifierPath), "Original preregistered V1 verifier changed");
assert.equal(prereg.scheduleSource.path, schedulePath);
assert.equal(prereg.scheduleSource.sha256, prereg.inputLocks[schedulePath]);

// Fresh pilot evidence is distinct from the immutable checkpoint's zero pilot count.
const pilotManifest = await readJson(pilotManifestPath);
assert.equal(pilotManifest.status, "PASS");
assert.deepEqual(pilotManifest.sourceArchive, { path: archivePath, sha256: expectedArchiveHash });
assert.deepEqual(pilotManifest.productionSha256, production);
assert.deepEqual(pilotManifest.servedAssetSha256, production, "Served production bytes must match frozen build bytes");
assert.deepEqual(pilotManifest.assetPreflight.map(({ filename, sha256, status, coop, coep }) => ({ filename, sha256, status, coop, coep })),
  Object.entries(production).map(([filename, sha256]) => ({ filename, sha256, status: 200, coop: "same-origin", coep: "require-corp" })));
const pilotOwnerRow = assertOwnerRowMetadata(pilotManifest.nativeProof);
assert.deepEqual(pilotManifest.reactProof, { arm: "react", compiled: true, rowMemoCache: true, boardMemoCache: true });
const pilotPairs = [["native", 128], ["react", 128], ["native", 512], ["react", 512], ["native", 1024], ["react", 1024]];
assert.deepEqual(pilotManifest.records, pilotPairs.map(([arm, size]) => ({ arm, size, status: "PASS" })));
assert.equal(pilotManifest.scope, "Correctness pilot only; no confirmatory performance evidence");
assert.deepEqual(pilotManifest.compilerProofs, Object.fromEntries(
  ["native", "react"].map((arm, index) => [arm, {
    path: compilerProofPaths[arm === "native" ? 2 : 3],
    sha256: prereg.inputLocks[compilerProofPaths[arm === "native" ? 2 : 3]],
  }]),
));
assert.deepEqual(pilotManifest.authoredOwnerRowProof, {
  path: authoredOwnerRowProofPath,
  sha256: await hashFile(authoredOwnerRowProofPath),
  assertions: (await readJson(authoredOwnerRowProofPath)).assertions,
});
assert.deepEqual(pilotManifest.actualThreeOwnerRowProof, {
  path: actualThreeOwnerRowProofPath,
  sha256: await hashFile(actualThreeOwnerRowProofPath),
  assertions: (await readJson(actualThreeOwnerRowProofPath)).assertions,
});
assert.deepEqual(pilotManifest.chromiumDiagnostic, {
  path: chromiumDiagnosticPath,
  sha256: await hashFile(chromiumDiagnosticPath),
  engineEpoch: pilotManifest.engineEpoch,
});
assert.ok(pilotManifest.engineEpoch?.product);
assert.ok(pilotManifest.engineEpoch?.jsVersion);
assert.ok(pilotManifest.engineEpoch?.revision);
assert.deepEqual(pilotManifest.pageFiles.map(({ arm, size, file }) => ({ arm, size, file })),
  pilotPairs.map(([arm, size]) => ({ arm, size, file: `${arm}-${size}.json` })));
const pilotHashes = {};
for (const [arm, size] of pilotPairs) {
  const filename = `${pilotDir}/${arm}-${size}.json`;
  const page = await readJson(filename);
  assert.equal(page.status, "PASS");
  assert.equal(page.mode, "pilot");
  assert.equal(page.production, true);
  assert.equal(page.arm, arm);
  assert.equal(page.size, size);
  assert.equal(page.frames, 60);
  assert.deepEqual(page.productionSha256, production);
  assert.deepEqual(page.servedAssetSha256, production);
  assert.deepEqual(page.engineEpoch, pilotManifest.engineEpoch);
  assert.deepEqual(page.browser.viewport, { width: 1200, height: 900 });
  assert.equal(page.browser.userAgent, page.userAgent);
  assert.equal(typeof page.browser.platform, "string");
  assert.equal(page.samples.length, 60);
  assert.deepEqual(Object.keys(page.checks).sort(), ["identity", "lifecycle", "order", "output", "visible"]);
  assert.deepEqual(Object.values(page.checks), [true, true, true, true, true]);
  assert.deepEqual(page.errors, []);
  assert.deepEqual(page.browserErrors, []);
  assert.equal(page.active.writers, size);
  assert.equal(page.active.mounts, size + 16);
  assert.equal(page.active.cleanups, 16);
  assert.equal(page.after.writers, 0);
  assert.equal(page.after.mounts, page.after.cleanups);
  assert.equal(page.after.mounts, size + 16);
  if (arm === "native") {
    assert.equal(page.after.extra.root.ownerCount, 0);
    assert.equal(page.after.extra.root.disposed, true);
    assert.equal(page.after.extra.collection.readerCount, 0);
    assert.equal(page.after.extra.collection.retainedBatches, 0);
  }
  assert.deepEqual(page.samples.map(({ frame }) => frame), Array.from({ length: 60 }, (_, index) => index + 6));
  assert.deepEqual(page.samples.filter(({ structural }) => structural).map(({ frame }) => frame), [35, 65]);
  pilotHashes[filename] = await hashFile(filename);
  assert.equal(pilotManifest.pageFiles.find((entry) => entry.arm === arm && entry.size === size)?.sha256, pilotHashes[filename]);
}

// Independently validate the authored keyed-row proof and actual THREE proof.
const authoredOwnerRowProof = await readJson(authoredOwnerRowProofPath);
const actualThreeOwnerRowProof = await readJson(actualThreeOwnerRowProofPath);
assert.equal(authoredOwnerRowProof.status, "PASS");
assert.equal(authoredOwnerRowProof.ownerRowPrograms.preparedProgramCount, 2);
assert.deepEqual(
  authoredOwnerRowProof.ownerRowPrograms.sparseAndDenseCalls.map(({ count }) => count),
  [1, 6],
);
assert.deepEqual(authoredOwnerRowProof.ownerRowPrograms.sparseAndDenseCalls[0].changedRowIndices, [0]);
assert.deepEqual(authoredOwnerRowProof.ownerRowPrograms.sparseAndDenseCalls[0].changedSlots, [0]);
assert.deepEqual(authoredOwnerRowProof.ownerRowPrograms.sparseAndDenseCalls[0].values, [13]);
assert.deepEqual(authoredOwnerRowProof.ownerRowPrograms.sparseAndDenseCalls[1].changedRowIndices, [0, 0, 0, 1, 1, 1]);
assert.deepEqual(authoredOwnerRowProof.ownerRowPrograms.sparseAndDenseCalls[1].changedSlots, [0, 1, 2, 0, 1, 2]);
assert.deepEqual(authoredOwnerRowProof.ownerRowPrograms.sparseAndDenseCalls[1].values, [21, 22, 23, 31, 32, 33]);
for (const key of [
  "legacyPreparedCellCalls", "legacyPreparedCellExecutions", "legacySetColumnCellsCalls",
  "legacySetColumnRowsCalls", "sourceProgramCalls", "eligibleNonemptyPendingCaptureCalls",
]) assert.equal(authoredOwnerRowProof.ownerRowPrograms[key], 0, `${key} must be zero in authored proof`);
for (const key of [
  "ordinaryAuthoredTSX", "layoutOwnerMatchesComponent", "sourceSiteOrderMatchesLayout",
  "authoredVectorOrderPreserved", "repeatedSourceReadPreserved", "sparseCellUpdate",
  "denseTwoRowSixCellUpdate", "noEligibleRerenders", "stableKeyedMoveIdentity",
  "removedOwnerAndDeadSetter", "rowReuseGeneration", "discardedCandidateColumnIsolation",
  "promotedStringAndUndefinedFallback",
]) assert.equal(authoredOwnerRowProof.assertions[key], true, `Authored owner-row assertion failed: ${key}`);
assert.equal(authoredOwnerRowProof.assertions.candidateValidAfterPrivateRenderWrite, false);
assert.equal(actualThreeOwnerRowProof.status, "PASS");
assert.equal(actualThreeOwnerRowProof.numericOwnerRowCut.batches, 240);
assert.equal(actualThreeOwnerRowProof.numericOwnerRowCut.cellsPerBatch, 5);
assert.equal(actualThreeOwnerRowProof.numericOwnerRowCut.preparedRowProgramCount, 1);
assert.equal(actualThreeOwnerRowProof.numericOwnerRowCut.eligibleNonemptyPendingCaptureCalls, 0);
for (const key of [
  "legacyPreparedCellCalls", "legacyPreparedCellExecutions", "legacySetColumnCellsCalls",
  "legacySetColumnRowsCalls", "genericSourceProgramCalls",
]) assert.equal(actualThreeOwnerRowProof.numericOwnerRowCut[key], 0, `${key} must be zero in THREE proof`);
for (const key of [
  "actualThreeSceneAndObjects", "ordinaryAuthoredTSX", "ownerProgramAndLayoutMatch",
  "sourceSlotsVectorRotationRoughness", "240DistinctSetterBatches", "exactThreePropertiesPerBatch",
  "sameThreeObjectAndResourceIdentities", "noComponentRerenders",
  "noGenericOrLegacyFallbackDuringNumericBatches", "cleanThreeResourceDisposal",
]) assert.equal(actualThreeOwnerRowProof.assertions[key], true, `THREE owner-row assertion failed: ${key}`);

// Independently validate the qualified Chromium representation diagnostic and
// its current bundled inputs. Explicit undefined checks on destroyed state avoid
// treating a missing/boxed payload as an ordinary promoted cell.
const chromiumDiagnostic = await readJson(chromiumDiagnosticPath);
const chromiumDiagnosticHash = await hashFile(chromiumDiagnosticPath);
assert.equal(chromiumDiagnostic.status, "PASS");
assert.equal(chromiumDiagnostic.attempt, "v5");
assert.deepEqual(pilotManifest.engineEpoch, {
  product: chromiumDiagnostic.browserVersion.product,
  jsVersion: chromiumDiagnostic.browserVersion.jsVersion,
  revision: chromiumDiagnostic.browserVersion.revision,
});
assert.equal(chromiumDiagnostic.sourcePath, "src/owner_state_world.ts");
assert.equal(chromiumDiagnostic.sourceSha256BeforeBundle, chromiumDiagnostic.sourceSha256AfterBundle);
assert.equal(chromiumDiagnostic.sourceSha256BeforeBundle, chromiumDiagnostic.bundledInputHashes["src/owner_state_world.ts"]);
assert.equal(chromiumDiagnostic.bundlePath, `${chromiumDiagnosticDirectory}/owner-state-world.iife.js`);
assert.equal(chromiumDiagnostic.bundleSha256, await hashFile(chromiumDiagnostic.bundlePath));
assert.equal(chromiumDiagnostic.environment.scriptPath, "scripts/inspect_numeric_cell_storage_candidate_v5.mjs");
assert.equal(chromiumDiagnostic.environment.scriptSha256, await hashFile(chromiumDiagnosticArtifacts[0]));
assert.equal(chromiumDiagnostic.environment.scriptSha256, status.sourceAndBuildSha256[chromiumDiagnostic.environment.scriptPath]);
assert.equal(chromiumDiagnostic.browserVersion.product.startsWith("Chrome/"), true);
const expectedChromiumInputs = [
  `${chromiumDiagnosticDirectory}/owner-state-world-entry.ts`,
  "src/compiled_bindings.ts",
  "src/compiled_state_layout.ts",
  "src/jsx_binding_runtime.ts",
  "src/owner_state_world.ts",
  "src/world_dirty_journal.ts",
];
assert.deepEqual(Object.keys(chromiumDiagnostic.bundledInputHashes).sort(), expectedChromiumInputs.sort());
for (const [filename, expectedHash] of Object.entries(chromiumDiagnostic.bundledInputHashes)) {
  assert.equal(await hashFile(filename), expectedHash, `Chromium bundled input changed: ${filename}`);
  assert.equal(status.sourceAndBuildSha256[filename] ?? status.verificationSha256[filename], expectedHash,
    `Chromium bundled input is not covered by the frozen checkpoint: ${filename}`);
}
for (const filename of chromiumDiagnosticArtifacts) {
  assert.ok(filename in status.verificationSha256, `Chromium diagnostic artifact not checkpointed: ${filename}`);
}
for (const key of [
  "directInitial", "preparedPublished", "directAfterReentryDispatch", "preparedAfterReentryDispatch",
  "directAfterPromotion", "preparedAfterPromotion", "directAfterReturnToNumeric",
  "preparedAfterReturnToNumeric", "directAfterDestroy", "directAfterOwnerReuse",
]) {
  const snapshot = chromiumDiagnostic.snapshots[key];
  assert.equal(snapshot.fastProperties, true, `${key}: expected fast properties`);
  assert.equal(snapshot.ownValueDescriptor, null, `${key}: own value property must be absent`);
  assert.equal(snapshot.prototypeValueDescriptor?.getterName, "getLaneBackedValue", `${key}: expected shared getter`);
  assert.equal(snapshot.prototypeValueDescriptor?.setterName, "setLaneBackedValue", `${key}: expected shared setter`);
}
assert.equal(chromiumDiagnostic.snapshots.directInitial.boxedValueUndefined, true);
assert.equal(chromiumDiagnostic.snapshots.preparedPublished.boxedValueUndefined, true);
assert.equal(chromiumDiagnostic.snapshots.directAfterDestroy.logicalValueUndefined, true);
assert.equal(chromiumDiagnostic.snapshots.directAfterDestroy.boxedValuePresent, true);
assert.equal(chromiumDiagnostic.snapshots.directAfterDestroy.boxedValueUndefined, true);
assert.equal(chromiumDiagnostic.snapshots.directAfterDestroy.laneIsNullish, true);
assert.equal(chromiumDiagnostic.snapshots.directAfterDestroy.lane, null);
assert.equal(chromiumDiagnostic.snapshots.directAfterOwnerReuse.lane?.generation, 2);
assert.equal(chromiumDiagnostic.semantics.preparationCancellation.acceptedAfterDiscard, false);
assert.equal(chromiumDiagnostic.semantics.preparationCancellation.ownerVisibleAfterDiscard, false);
assert.equal(chromiumDiagnostic.semantics.destroyAndReuse.destroyed, true);
assert.equal(chromiumDiagnostic.semantics.destroyAndReuse.laneActive, true);
assert.match(chromiumDiagnostic.semantics.destroyAndReuse.deadSetterError, /not alive/);

const compilerProofs = await Promise.all(compilerProofPaths.map(async (filename) => [filename, await readFile(filename, "utf8")]));
const compilerMap = Object.fromEntries(compilerProofs);
const nativeJson = JSON.parse(compilerMap[compilerProofPaths[2]]);
const reactJson = JSON.parse(compilerMap[compilerProofPaths[3]]);
const nativeOwnerRow = assertOwnerRowMetadata(nativeJson);
assert.deepEqual(pilotOwnerRow, nativeOwnerRow);
const rowOwnerProgramId = "src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow";
const expectedRowSlots = [0, 1, 2].map((slot) => ({
  siteId: `${rowOwnerProgramId}#state:${slot}`,
  slot,
}));
assert.equal(nativeJson.ownerRow.ownerProgramId, rowOwnerProgramId);
assert.equal(nativeJson.ownerRow.stateLayoutProgramId, rowOwnerProgramId);
assert.deepEqual(nativeJson.ownerRow.slots, expectedRowSlots);
assert.deepEqual(nativeJson.ownerRow.bindings, expectedRowSlots.map(({ siteId }, programIndex) => ({ siteId, programIndex })));
assert.equal(nativeJson.ownerRow.numericDescriptors.length, 3);
assert.equal(new Set(nativeJson.ownerRow.numericDescriptors.map(({ sinkId }) => sinkId)).size, 3);
for (const [index, descriptor] of nativeJson.ownerRow.numericDescriptors.entries()) {
  assert.equal(descriptor.schemaVersion, 2);
  assert.equal(descriptor.ownerProgramId, rowOwnerProgramId);
  assert.ok(descriptor.sinkId.length > 0);
  assert.deepEqual(descriptor.sourceSites, [expectedRowSlots[index].siteId]);
}
assert.equal(reactJson.arm, "react");
assert.equal(reactJson.compiled, true);
assert.equal(reactJson.rowMemoCache, true);
assert.equal(reactJson.boardMemoCache, true);
assert.equal(actualThreeOwnerRowProof.ownerProgramId, actualThreeOwnerRowProof.authoredSource + "#component:SceneComponent");
assert.equal(actualThreeOwnerRowProof.assertions.ownerProgramAndLayoutMatch, true);
const nativeCompilerSource = compilerMap[compilerProofPaths[0]];
const componentModuleBoundary = nativeCompilerSource.search(/\n\s*"component_module":/);
assert.ok(componentModuleBoundary > 0, "compiler proof has the expected component_module boundary");
const nativeExecutable = nativeCompilerSource.slice(0, componentModuleBoundary);
assert.equal((nativeExecutable.match(/__nativeBindStatePropAt\(/g) ?? []).length, 3);
assert.equal((nativeExecutable.match(/ProductMixedRow#state:\d+/g) ?? []).length >= 3, true);
assert.match(nativeExecutable, /stateLayout:\s*\{[\s\S]*?schemaVersion:\s*1,[\s\S]*?programId:\s*"src\/browser\/native_product_mixed_arm\.tsx#component:ProductMixedRow"/);
assert.match(nativeExecutable, /slots:\s*\[[\s\S]*?state:0[\s\S]*?slot:\s*0[\s\S]*?state:1[\s\S]*?slot:\s*1[\s\S]*?state:2[\s\S]*?slot:\s*2/);

// Check the locked authored harness itself, since raw records intentionally contain check
// outcomes, not DOM row snapshots. We do not claim to recompute those rows from raw JSON.
const harness = await readFile(harnessPath, "utf8");
const contract = await readFile(contractPath, "utf8");
assert.ok(harnessPath in status.sourceAndBuildSha256);
assert.ok(contractPath in status.sourceAndBuildSha256);
assert.match(harness, /const inspect\s*=\s*\(frame: number, before\?: Map<number, HTMLElement>\)/);
assert.match(harness, /productMixedState\(id, frame\)/);
assert.match(harness, /checks\.order\s*=\s*false/);
assert.match(harness, /checks\.identity\s*=\s*false/);
assert.match(harness, /checks\.output\s*=\s*false/);
assert.match(harness, /Number\(node\.dataset\.id\) !== id/);
assert.match(harness, /node\.style\.left !== `\$\{expected\.x\}px`/);
assert.match(harness, /node\.style\.top !== `\$\{expected\.y\}px`/);
assert.match(harness, /node\.style\.transform !== `rotate\(\$\{expected\.rotation\}deg\)`/);
assert.match(harness, /before\?\.has\(id\).*before\.get\(id\) !== node/);
assert.match(harness, /after\.writers !== 0.*after\.mounts !== after\.cleanups.*nodes\(\)\.length !== 0/);
assert.match(harness, /ids\.slice\(0, 8\)/);
assert.match(harness, /Array\.from\(\{ length: 8 \}/);
assert.match(harness, /Math\.min\(13,/);
assert.match(contract, /export const productMixedState/);
assert.match(contract, /x: \(id \* 17 \+ frame \* 2\) % 760/);
assert.match(contract, /y: \(id \* 29 \+ frame \* 3\) % 500/);
assert.match(contract, /rotation: \(id \* 7 \+ frame \* 4\) % 360/);

// Independently check preregistration, postlock and all frozen inputs.
assert.equal(manifest.status, "COLLECTION_COMPLETE");
assert.equal(manifest.runId, prereg.runId);
assert.equal(manifest.preregistrationSha256, preregHash);
assert.equal(manifest.archiveSha256, expectedArchiveHash);
assert.deepEqual(manifest.failedOrIncomplete, []);
assert.deepEqual(manifest.postCollectionChangedFiles, []);
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
assert.deepEqual(postlock.records.map(({ filename }) => filename).sort(), Object.keys(prereg.inputLocks).sort());
for (const item of postlock.records) {
  assert.equal(item.expected, prereg.inputLocks[item.filename]);
  assert.equal(item.observed, item.expected);
  assert.equal(item.matches, true);
}
const expectedInputPaths = [
  archivePath, statusPath, ...Object.keys(status.sourceAndBuildSha256),
  pilotManifestPath, pilotVerifierPath, ...Object.keys(pilotHashes), ...compilerProofPaths,
  authoredOwnerRowProofPath, actualThreeOwnerRowProofPath, ...Object.keys(status.verificationSha256),
  chromiumDiagnosticPath, ...chromiumDiagnosticArtifacts, ...Object.keys(chromiumDiagnostic.bundledInputHashes),
  protocolPath, timingConfigPath, baseConfigPath, collectorPath, analyzerPath, verifierPath, schedulePath,
];
assert.deepEqual(Object.keys(prereg.inputLocks).sort(), [...new Set(expectedInputPaths)].sort());
for (const [filename, expected] of Object.entries(prereg.inputLocks)) {
  assert.equal(await hashFile(filename), expected, `Prerecorded input changed: ${filename}`);
}
assert.equal(prereg.proof.compiledOwnerRow.path, authoredOwnerRowProofPath);
assert.equal(prereg.proof.compiledOwnerRow.sha256, await hashFile(authoredOwnerRowProofPath));
assert.equal(prereg.proof.compiledOwnerRow.status, authoredOwnerRowProof.status);
assert.deepEqual(prereg.proof.compiledOwnerRow.ownerRowPrograms, authoredOwnerRowProof.ownerRowPrograms);
assert.deepEqual(prereg.proof.compiledOwnerRow.assertions, authoredOwnerRowProof.assertions);
const ownerMeta = prereg.proof.compiledOwnerRow.currentNativeBindingV2OwnerMeta;
assert.equal(ownerMeta.authoredSource.path, authoredOwnerRowProof.authoredSource);
assert.equal(ownerMeta.emittedModule.path, authoredOwnerRowProof.emittedModule);
for (const metadata of Object.values(ownerMeta)) {
  assert.equal(await hashFile(metadata.path), metadata.sha256, `Authored owner-row metadata input changed: ${metadata.path}`);
}
assert.equal(prereg.proof.actualThreeOwnerRow.path, actualThreeOwnerRowProofPath);
assert.equal(prereg.proof.actualThreeOwnerRow.sha256, await hashFile(actualThreeOwnerRowProofPath));
assert.equal(prereg.proof.actualThreeOwnerRow.status, actualThreeOwnerRowProof.status);
assert.equal(prereg.proof.actualThreeOwnerRow.ownerProgramId, actualThreeOwnerRowProof.ownerProgramId);
assert.deepEqual(prereg.proof.actualThreeOwnerRow.numericOwnerRowCut, actualThreeOwnerRowProof.numericOwnerRowCut);
assert.deepEqual(prereg.proof.actualThreeOwnerRow.assertions, actualThreeOwnerRowProof.assertions);
assert.deepEqual(prereg.proof.actualThreeOwnerRow.threeObjectIdentity, actualThreeOwnerRowProof.threeObjectIdentity);
const productionPilotProof = prereg.proof.productionPilot;
assert.equal(productionPilotProof.path, pilotManifestPath);
assert.equal(productionPilotProof.sha256, await hashFile(pilotManifestPath));
assert.equal(productionPilotProof.status, pilotManifest.status);
assert.equal(productionPilotProof.scope, pilotManifest.scope);
assert.deepEqual(productionPilotProof.pageFiles, pilotManifest.pageFiles);
assert.deepEqual(productionPilotProof.pageSha256, pilotHashes);
assert.deepEqual(productionPilotProof.sourceArchive, pilotManifest.sourceArchive);
assert.deepEqual(productionPilotProof.productionSha256, pilotManifest.productionSha256);
assert.deepEqual(productionPilotProof.servedAssetSha256, pilotManifest.servedAssetSha256);
assert.deepEqual(productionPilotProof.assetPreflight, pilotManifest.assetPreflight);
assert.deepEqual(productionPilotProof.engineEpoch, pilotManifest.engineEpoch);
assert.deepEqual(productionPilotProof.chromiumDiagnostic, pilotManifest.chromiumDiagnostic);
assert.deepEqual(productionPilotProof.verifier, {
  path: pilotVerifierPath,
  sha256: prereg.inputLocks[pilotVerifierPath],
});
assert.deepEqual(productionPilotProof.compilerProofs, pilotManifest.compilerProofs);
assert.deepEqual(productionPilotProof.authoredOwnerRowProof, pilotManifest.authoredOwnerRowProof);
assert.deepEqual(productionPilotProof.actualThreeOwnerRowProof, pilotManifest.actualThreeOwnerRowProof);
assert.equal(prereg.proof.compilerEmission.numericProgramDescriptors, 3);
assert.equal(prereg.proof.compilerEmission.numericProgramBindings, 3);
assert.deepEqual(prereg.proof.compilerEmission.ownerRow, nativeJson.ownerRow);
assert.deepEqual(Object.keys(prereg.proof.compilerEmission.files).sort(), compilerProofPaths.sort());
for (const filename of compilerProofPaths) {
  assert.equal(prereg.proof.compilerEmission.files[filename], await hashFile(filename));
}
assert.deepEqual(prereg.proof.compilerEmission.native, nativeJson);
assert.deepEqual(prereg.proof.compilerEmission.react, reactJson);
assert.equal(prereg.proof.chromiumStorageDiagnostic.path, chromiumDiagnosticPath);
assert.equal(prereg.proof.chromiumStorageDiagnostic.sha256, chromiumDiagnosticHash);
assert.equal(prereg.proof.chromiumStorageDiagnostic.status, chromiumDiagnostic.status);
assert.equal(prereg.proof.chromiumStorageDiagnostic.attempt, "v5");
assert.equal(prereg.proof.chromiumStorageDiagnostic.sourcePath, chromiumDiagnostic.sourcePath);
assert.equal(prereg.proof.chromiumStorageDiagnostic.sourceSha256, chromiumDiagnostic.sourceSha256BeforeBundle);
assert.equal(prereg.proof.chromiumStorageDiagnostic.bundlePath, chromiumDiagnostic.bundlePath);
assert.equal(prereg.proof.chromiumStorageDiagnostic.bundleSha256, chromiumDiagnostic.bundleSha256);
assert.deepEqual(prereg.proof.chromiumStorageDiagnostic.bundledInputHashes, chromiumDiagnostic.bundledInputHashes);
assert.deepEqual(prereg.proof.chromiumStorageDiagnostic.browserVersion, chromiumDiagnostic.browserVersion);
assert.deepEqual(prereg.proof.chromiumStorageDiagnostic.snapshots, chromiumDiagnostic.snapshots);
assert.deepEqual(prereg.proof.chromiumStorageDiagnostic.semantics, chromiumDiagnostic.semantics);
assert.deepEqual(prereg.proof.chromiumStorageDiagnostic.rowCapabilities, chromiumDiagnostic.rowCapabilities);
assert.equal(prereg.pilotVerifier.path, pilotVerifierPath);
assert.equal(prereg.pilotVerifier.sha256, prereg.inputLocks[pilotVerifierPath]);
assert.equal(prereg.timingEnvironment.configSha256, prereg.inputLocks[timingConfigPath]);
assert.equal(prereg.timingEnvironment.baseConfigSha256, prereg.inputLocks[baseConfigPath]);
assert.equal(prereg.scheduleSource.path, schedulePath);
assert.equal(prereg.scheduleSource.sha256, prereg.inputLocks[schedulePath]);

// V2 analysis is a repair of the V1 tool interpretation, not a new collection.
const originalValidationErrors = [
  ...originalSummary.validation.preregistrationErrors,
  ...originalSummary.validation.archiveContentErrors,
  ...originalSummary.validation.directoryErrors,
  ...originalSummary.validation.invalidPages.flatMap(({ filename, validationErrors }) =>
    validationErrors.map((error) => `${filename}: ${error}`)),
];
assert.equal(originalSummary.gate, "INVALID");
assert.equal(originalSummary.counts.scheduled, 30);
assert.equal(originalSummary.counts.loaded, 30);
assert.equal(originalSummary.counts.invalid, 30);
assert.equal(summary.schemaVersion, "product-mixed-compiled-owner-rows-confirmation-analysis-v2");
assert.equal(summary.study, prereg.study);
assert.deepEqual(summary.repairProvenance.originalAnalyzer, {
  path: analyzerPath,
  sha256: prereg.inputLocks[analyzerPath],
});
assert.deepEqual(summary.repairProvenance.originalVerifier, {
  path: verifierPath,
  sha256: prereg.inputLocks[verifierPath],
});
assert.deepEqual(summary.repairProvenance.originalSummary, {
  path: originalSummaryPath,
  sha256: await hashFile(originalSummaryPath),
  gate: originalSummary.gate,
  validation: originalSummary.validation,
  validationErrors: originalValidationErrors,
});
assert.deepEqual(summary.repairProvenance.v2Analyzer, {
  path: v2AnalyzerPath,
  sha256: await hashFile(v2AnalyzerPath),
});
assert.deepEqual(summary.repairProvenance.v2Verifier, {
  path: v2VerifierPath,
  sha256: await hashFile(v2VerifierPath),
});
assert.ok(typeof summary.repairProvenance.v2Run.generatedAt === "string");
assert.ok(Number.isFinite(Date.parse(summary.repairProvenance.v2Run.generatedAt)));
assert.equal(summary.repairProvenance.v2Run.rawRunId, prereg.runId);
assert.equal(summary.repairProvenance.v2Run.reusedRawRecords, true);
assert.equal(summary.repairProvenance.v2Run.recordCount, 30);
assert.equal(summary.repairProvenance.v2Verifier.path, v2VerifierPath);
assert.equal(summary.repairProvenance.v2Verifier.sha256, await hashFile(v2VerifierPath),
  "V2 summary must preserve provenance for the V2 verifier that was actually run");

// Validate every raw page and compute timing statistics independently.
const directoryFiles = await readdir(rawDir);
const sequenceFiles = directoryFiles.filter((name) => /^sequence-\d{2}\.json$/.test(name)).sort();
assert.deepEqual(sequenceFiles, expectedSchedule.map(({ sequence }) => `sequence-${String(sequence).padStart(2, "0")}.json`));
const allowedJsonFiles = [
  "FINALresults.json", "manifest.json", "postlock.json", "preregistration.json",
  "summary.json", "summary-v2.json", ...sequenceFiles,
].sort();
const observedJsonFiles = directoryFiles.filter((name) => name.endsWith(".json")).sort();
const allowedVerificationOutputs = new Set(["verification.json", "verification-v2.json", "verification-v3.json"]);
assert.ok(allowedJsonFiles.every((filename) => observedJsonFiles.includes(filename)),
  "Raw directory is missing a frozen V1 artifact or V2 summary");
assert.ok(observedJsonFiles.every((filename) => allowedJsonFiles.includes(filename) || allowedVerificationOutputs.has(filename)),
  "Raw directory contains an unexpected JSON file; V1/V2 artifacts must remain intact");
const manifestBySequence = new Map(manifest.files.map((entry) => [entry.sequence, entry]));
assert.equal(manifestBySequence.size, 30);
const pages = [];
for (const scheduled of expectedSchedule) {
  const filename = `${rawDir}/sequence-${String(scheduled.sequence).padStart(2, "0")}.json`;
  const bytes = await readFile(filename);
  const record = JSON.parse(bytes);
  const fileEntry = manifestBySequence.get(scheduled.sequence);
  assert.equal(fileEntry.file, filename);
  assert.equal(fileEntry.sha256, sha(bytes));
  assert.equal(record.status, "PASS");
  assert.equal(record.failure, undefined);
  assert.ok(typeof record.startedAt === "string" && typeof record.finishedAt === "string");
  assert.equal(record.runId, prereg.runId);
  assert.deepEqual(record.schedule, scheduled);
  assert.equal(record.preregistrationSha256, preregHash);
  assert.equal(record.archiveSha256, expectedArchiveHash);
  assert.equal(record.protocolSha256, prereg.protocolSha256);
  assert.deepEqual(record.browserErrors, []);
  assert.equal(record.crossOriginIsolated, true);
  assert.deepEqual(record.navigationHeaders, { coop: "same-origin", coep: "require-corp" });
  assert.deepEqual(record.endVisibility, { state: "visible", focused: true });
  const clock = record.postDisposeClock;
  assert.equal(clock.readings, 100000);
  assert.ok(clock.minPositiveDeltaMs > 0);
  assert.equal(clock.crossOriginIsolated, true);
  assert.equal(clock.coop, "same-origin");
  assert.equal(clock.coep, "require-corp");
  assert.equal(clock.visibility, "visible");
  assert.equal(clock.focused, true);
  assert.equal(clock.rafIntervalsMs.length, 48);
  const resourceNames = new Set();
  assert.ok(record.loadedBuildResources.length > 0);
  for (const resource of record.loadedBuildResources) {
    assert.equal(resource.status, 200);
    assert.ok(resource.filename in production);
    assert.equal(resource.sha256, production[resource.filename]);
    assert.equal(resource.coop, "same-origin");
    assert.equal(resource.coep, "require-corp");
    resourceNames.add(path.basename(resource.filename));
  }
  for (const commonAsset of Object.keys(production).filter((name) =>
    !/native_product_mixed_arm-|product_mixed_react_arm-/.test(name)
  )) {
    assert.ok(resourceNames.has(path.basename(commonAsset)), `Missing common asset ${commonAsset}`);
  }
  const selectedArm = scheduled.arm === "native" ? /^native_product_mixed_arm-/ : /^product_mixed_react_arm-/;
  const oppositeArm = scheduled.arm === "native" ? /^product_mixed_react_arm-/ : /^native_product_mixed_arm-/;
  assert.ok([...resourceNames].some((name) => selectedArm.test(name)));
  assert.ok(![...resourceNames].some((name) => oppositeArm.test(name)));
  const result = record.result;
  assert.equal(result.study, "compiled-product-mixed-v2");
  assert.equal(result.mode, "confirm");
  assert.equal(result.status, "PASS");
  assert.equal(result.production, true);
  assert.equal(result.arm, scheduled.arm);
  assert.equal(result.size, scheduled.size);
  assert.equal(result.pair, scheduled.pair);
  assert.equal(result.sequence, scheduled.sequence);
  assert.equal(result.warmup, warmup);
  assert.equal(result.frames, measuredFrames);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(Object.keys(result.checks).sort(), ["identity", "lifecycle", "order", "output", "visible"]);
  assert.deepEqual(Object.values(result.checks), [true, true, true, true, true]);
  assert.equal(result.samples.length, measuredFrames);
  assert.deepEqual(result.samples.map(({ frame }) => frame), expectedSampleFrames);
  assert.deepEqual(result.samples.filter(({ structural }) => structural).map(({ frame }) => frame), structuralFrames);
  for (const sample of result.samples) {
    assert.equal(sample.structural, structuralFrames.includes(sample.frame));
    assert.ok(Number.isFinite(sample.commitMs) && sample.commitMs >= 0);
    assert.ok(Number.isFinite(sample.intervalMs) && sample.intervalMs >= 0);
  }
  const summaryStats = (values) => ({ medianMs: median(values), p95Ms: quantile(values, 0.95) });
  assert.deepEqual(result.summary, {
    all: summaryStats(result.samples.map((sample) => sample.commitMs)),
    ordinary: summaryStats(result.samples.filter((sample) => !sample.structural).map((sample) => sample.commitMs)),
    structural: summaryStats(result.samples.filter((sample) => sample.structural).map((sample) => sample.commitMs)),
    interval: summaryStats(result.samples.map((sample) => sample.intervalMs)),
  });
  assert.equal(result.active.writers, scheduled.size);
  assert.equal(result.active.mounts, scheduled.size + 64);
  assert.equal(result.active.cleanups, 64);
  assert.equal(result.after.writers, 0);
  assert.equal(result.after.mounts, result.after.cleanups);
  assert.equal(result.after.mounts, scheduled.size + 64);
  if (scheduled.arm === "native") {
    assert.equal(result.after.extra.root.ownerCount, 0);
    assert.equal(result.after.extra.root.disposed, true);
    assert.equal(result.after.extra.collection.readerCount, 0);
    assert.equal(result.after.extra.collection.retainedBatches, 0);
  }
  pages.push({ ...scheduled, clockQuantumMs: clock.minPositiveDeltaMs, result });
}

const computedSizes = [];
for (const size of sizes) {
  const pairs = Array.from({ length: pairsPerSize }, (_, pair) => {
    const native = pages.find((p) => p.size === size && p.pair === pair && p.arm === "native");
    const react = pages.find((p) => p.size === size && p.pair === pair && p.arm === "react");
    const stats = (page) => {
      const all = page.result.samples.map((s) => s.commitMs);
      const ordinary = page.result.samples.filter((s) => !s.structural).map((s) => s.commitMs);
      const structural = page.result.samples.filter((s) => s.structural).map((s) => s.commitMs);
      const intervals = page.result.samples.map((s) => s.intervalMs);
      return {
        median: median(all), p95: quantile(all, 0.95),
        ordinaryMedian: median(ordinary), ordinaryP95: quantile(ordinary, 0.95),
        structuralMedian: median(structural), structuralP95: quantile(structural, 0.95),
        intervalMedian: median(intervals), intervalP95: quantile(intervals, 0.95),
        mount: page.result.mountMs, dispose: page.result.disposeMs,
        measuredStepsCpu: all.reduce((sum, value) => sum + value, 0),
        lifecycleCpu: page.result.mountMs + all.reduce((sum, value) => sum + value, 0) + page.result.disposeMs,
      };
    };
    return { native, react, n: stats(native), r: stats(react) };
  });
  const floors = pairs.map(({ native, react }) => Math.max(prereg.clock.minPositiveDeltaMs, native.clockQuantumMs, react.clockQuantumMs) * 5);
  const medianRatios = pairs.map((pair, i) => pair.r.median < floors[i] ? null : pair.n.median / pair.r.median);
  const p95Ratios = pairs.map((pair, i) => pair.r.p95 < floors[i] ? null : pair.n.p95 / pair.r.p95);
  const medResolved = medianRatios.filter(Number.isFinite);
  const p95Resolved = p95Ratios.filter(Number.isFinite);
  const medianGM = medResolved.length === pairsPerSize ? geomean(medResolved) : null;
  const p95Median = p95Resolved.length === pairsPerSize ? median(p95Resolved) : null;
  const armExpected = (armKey) => {
    const values = pairs.map((pair) => pair[armKey === "native" ? "n" : "r"]);
    return {
      median: median(values.map((item) => item.median)),
      ordinaryMedian: median(values.map((item) => item.ordinaryMedian)),
      p95: median(values.map((item) => item.p95)),
      ordinaryP95: median(values.map((item) => item.ordinaryP95)),
      structuralMedian: median(values.map((item) => item.structuralMedian)),
      structuralP95: median(values.map((item) => item.structuralP95)),
      intervalMedian: median(values.map((item) => item.intervalMedian)),
      intervalP95: median(values.map((item) => item.intervalP95)),
      mount: median(values.map((item) => item.mount)),
      dispose: median(values.map((item) => item.dispose)),
      measuredStepsCpu: median(values.map((item) => item.measuredStepsCpu)),
      lifecycleCpu: median(values.map((item) => item.lifecycleCpu)),
    };
  };
  computedSizes.push({ size, arms: { native: armExpected("native"), react: armExpected("react") },
    pairedMedianGeometricMeanRatio: medianGM, medianPairsResolved: medResolved.length,
    medianRatioPass: medianGM === null ? null : medianGM <= 0.8,
    medianPairedP95Ratio: p95Median, p95PairsResolved: p95Resolved.length,
    p95RatioPass: p95Median === null ? null : p95Median <= 1.1,
    denominatorFloorsMs: floors });
}
const medianPassSizes = computedSizes.filter((item) => item.medianRatioPass === true).map((item) => item.size);
const medianFailSizes = computedSizes.filter((item) => item.medianRatioPass === false).map((item) => item.size);
const medianUnresolvedSizes = computedSizes.filter((item) => item.medianRatioPass === null).map((item) => item.size);
const medianGate = medianPassSizes.length >= 2 ? "PASS" : medianPassSizes.length + medianUnresolvedSizes.length < 2 ? "FAIL" : "UNRESOLVED";
const p95Fails = computedSizes.filter((item) => item.p95RatioPass === false).map((item) => item.size);
const p95Unresolved = computedSizes.filter((item) => item.p95RatioPass === null).map((item) => item.size);
const p95Gate = p95Fails.length ? "FAIL" : p95Unresolved.length ? "UNRESOLVED" : "PASS";
const gate = medianGate === "FAIL" || p95Gate === "FAIL" ? "FAIL" : medianGate === "UNRESOLVED" || p95Gate === "UNRESOLVED" ? "UNRESOLVED" : "PASS";

assert.equal(summary.study, prereg.study);
assert.equal(summary.gate, gate);
assert.equal(summary.counts.scheduled, 30);
assert.equal(summary.counts.loaded, 30);
assert.equal(summary.counts.valid, 30);
assert.equal(summary.counts.invalid, 0);
assert.deepEqual(summary.validation.invalidPages, []);
assert.deepEqual(summary.validation.preregistrationErrors, []);
assert.deepEqual(summary.validation.archiveContentErrors, []);
assert.deepEqual(summary.validation.directoryErrors, []);
assert.equal(summary.decision.medianGate, medianGate);
assert.deepEqual(summary.decision.medianPassingSizes, medianPassSizes);
assert.deepEqual(summary.decision.medianFailingSizes, medianFailSizes);
assert.deepEqual(summary.decision.medianUnresolvedSizes, medianUnresolvedSizes);
assert.equal(summary.decision.p95Gate, p95Gate);
assert.deepEqual(summary.decision.p95FailingSizes, p95Fails);
assert.deepEqual(summary.decision.p95UnresolvedSizes, p95Unresolved);
for (const item of computedSizes) {
  const reported = summary.sizes.find((entry) => entry.size === item.size);
  assert.ok(reported, `Analyzer summary omits size ${item.size}`);
  for (const arm of ["native", "react"]) {
    close(reported.arms[arm].pageMedianOfPageMediansMs.all, item.arms[arm].median, `${item.size}/${arm} median`);
    close(reported.arms[arm].pageMedianOfPageMediansMs.ordinary, item.arms[arm].ordinaryMedian, `${item.size}/${arm} ordinary median`);
    close(reported.arms[arm].pageMedianOfPageMediansMs.structural, item.arms[arm].structuralMedian, `${item.size}/${arm} structural median`);
    close(reported.arms[arm].pageMedianOfPageP95sMs.all, item.arms[arm].p95, `${item.size}/${arm} p95`);
    close(reported.arms[arm].pageMedianOfPageP95sMs.ordinary, item.arms[arm].ordinaryP95, `${item.size}/${arm} ordinary p95`);
    close(reported.arms[arm].pageMedianOfPageP95sMs.structural, item.arms[arm].structuralP95, `${item.size}/${arm} structural p95`);
    close(reported.arms[arm].pageMedianIntervalMs, item.arms[arm].intervalMedian, `${item.size}/${arm} interval median`);
    close(reported.arms[arm].pageMedianIntervalP95Ms, item.arms[arm].intervalP95, `${item.size}/${arm} interval p95`);
    close(reported.arms[arm].pageMedianMountMs, item.arms[arm].mount, `${item.size}/${arm} mount`);
    close(reported.arms[arm].pageMedianDisposeMs, item.arms[arm].dispose, `${item.size}/${arm} dispose`);
    close(reported.arms[arm].pageMedianMeasuredStepsCpuMs, item.arms[arm].measuredStepsCpu, `${item.size}/${arm} measured-step CPU`);
    close(reported.arms[arm].pageMedianLifecycleCpuMs, item.arms[arm].lifecycleCpu, `${item.size}/${arm} lifecycle CPU`);
  }
  close(reported.decision.pairedMedianGeometricMeanRatio, item.pairedMedianGeometricMeanRatio, `${item.size} median ratio`);
  close(reported.decision.medianPairedP95Ratio, item.medianPairedP95Ratio, `${item.size} p95 ratio`);
  assert.equal(reported.decision.medianPairsResolved, item.medianPairsResolved);
  assert.equal(reported.decision.p95PairsResolved, item.p95PairsResolved);
  assert.equal(reported.decision.medianRatioPass, item.medianRatioPass);
  assert.equal(reported.decision.p95RatioPass, item.p95RatioPass);
}

// The independent audit reports the bounded correctness evidence: page results carry checks,
// not DOM snapshots, so value/order/identity recomputation is attributed to the locked harness.
const verification = {
  schemaVersion: 1,
  status: "PASS",
  study: prereg.study,
  runId: prereg.runId,
  rawPages: expectedSchedule.length,
  sourceArchiveMembersVerified: Object.keys(archiveMembers).length,
  sourceBuildEntriesVerified: Object.keys(status.sourceAndBuildSha256).length,
  verificationEntriesVerified: Object.keys(status.verificationSha256).length,
  correctnessEvidence: {
    rawResultChecksAndErrorsVerified: true,
    harnessOutputOrderAndIdentityLogicHashLocked: true,
    rawDomSnapshotsPresent: false,
    limitation: "Raw page records preserve pass/fail checks and errors, not per-frame row IDs, values, or node snapshots; the verifier checks the frozen authored harness logic that computes those checks and does not claim to recompute row values from raw records.",
  },
  compiledOwnerRowsProofs: {
    authoredOwnerRow: "PASS",
    actualThreeOwnerRow: "PASS",
    chromiumRepresentation: "PASS",
    compiler: "PASS",
    pilot: "PASS",
  },
  repairProvenance: {
    originalV1: {
      analyzer: { path: analyzerPath, sha256: prereg.inputLocks[analyzerPath] },
      verifier: { path: verifierPath, sha256: prereg.inputLocks[verifierPath] },
      invalidSummary: {
        path: originalSummaryPath,
        sha256: await hashFile(originalSummaryPath),
        gate: originalSummary.gate,
        validationErrors: originalValidationErrors,
      },
    },
    v2: {
      analyzer: { path: v2AnalyzerPath, sha256: await hashFile(v2AnalyzerPath) },
      verifier: { path: v2VerifierPath, sha256: await hashFile(v2VerifierPath) },
      summary: { path: summaryPath, sha256: await hashFile(summaryPath), gate: summary.gate },
    },
    v3: {
      verifier: { path: v3VerifierPath, sha256: await hashFile(v3VerifierPath) },
      output: verificationPath,
    },
    rawRun: { runId: prereg.runId, reusedExistingRecords: true, recordCount: expectedSchedule.length },
  },
  computedSizes,
  pageSummaryAggregationVerified: true,
  gate,
  inputLockCount: Object.keys(prereg.inputLocks).length,
};
await writeFile(verificationPath, `${JSON.stringify(verification, null, 2)}\n`);
console.log(`PASS independent compiled owner rows evidence verification: ${expectedSchedule.length} pages; recomputed gate ${gate}.`);
