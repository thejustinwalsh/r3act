import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { productMixedSchedule } from "/Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/browser/product_mixed_schedule.ts";

const origin = "https://owner-row-fusion-confirmation.localhost:1355";
const output = "results/product-mixed-owner-row-fusion-confirmation";
const preregistrationPath = `${output}/preregistration.json`;
const manifestPath = `${output}/manifest.json`;
const finalResultsPath = `${output}/FINALresults.json`;
const checkpoint = "implementation/2026-10-13-owner-row-fusion";
const archivePath = `${checkpoint}/source-and-evidence.tar.gz`;
const statusPath = `${checkpoint}/status.json`;
const ownerRowProofPath = ".cache/compiled-owner-proof/compiled-owner-row-proof-1791897220716-45399-148948e4-9717-4af7-ac7e-6677cfe15b7c.json";
const ownerRowAuthoredSourcePath = ".cache/compiled-owner-proof/authored-owner-row-1791897220716-45399-148948e4-9717-4af7-ac7e-6677cfe15b7c.tsx";
const ownerRowEmittedModulePath = ".cache/compiled-owner-proof/compiled-owner-row-1791897220716-45399-148948e4-9717-4af7-ac7e-6677cfe15b7c.mjs";
const ownerThreeProofPath = ".cache/compiled-owner-three-proof/compiled-three-owner-row-proof-1791897229482-45665-848b1a2a-3e3c-438f-a452-ee013892c29e.json";
const chromiumStorageDiagnosticPath = "results/numeric-cell-storage-candidate-v5/diagnostic.json";
const chromiumStorageDirectory = "results/numeric-cell-storage-candidate-v5";
const productionPilotDirectory = "results/product-mixed-owner-row-fusion-pilot";
const productionPilotManifestPath = `${productionPilotDirectory}/results.json`;
const productionPilotVerifierPath = "scripts/verify_product_mixed_owner_row_fusion_pilot.mjs";
const productionPilotVerificationPath = `${productionPilotDirectory}/verification.json`;
const productionPilotCheckpoint = "implementation/2026-10-13-owner-row-fusion-pilot";
const productionPilotStatusPath = `${productionPilotCheckpoint}/status.json`;
const productionPilotArchivePath = `${productionPilotCheckpoint}/evidence.tar.gz`;
const productionPilotEvidenceVerifierPath = "scripts/verify_product_mixed_owner_row_fusion_pilot_evidence.mjs";
const compilerProofPaths = [
  ".cache/product-mixed-compiled-owner-row-fusion/compiler-proof/native.js",
  ".cache/product-mixed-compiled-owner-row-fusion/compiler-proof/react.js",
  ".cache/product-mixed-compiled-owner-row-fusion/compiler-proof/native.json",
  ".cache/product-mixed-compiled-owner-row-fusion/compiler-proof/react.json",
];
const timingConfigPath = "vite.product-mixed-owner-row-fusion-timing.config.ts";
const basePreviewConfigPath = "vite.product-mixed-compiled-owner-row-fusion.config.ts";
const protocolPath = "product-mixed-owner-row-fusion-confirmation-protocol.md";
const collectorPath = "scripts/collect_product_mixed_owner_row_fusion.mjs";
const analyzerPath = "scripts/summarize_product_mixed_owner_row_fusion.mjs";
const verifierPath = "scripts/verify_product_mixed_owner_row_fusion_evidence.mjs";
const schedulePath = "src/browser/product_mixed_schedule.ts";
const buildDirectory = "dist-product-mixed-compiled-owner-row-fusion";
const viewport = { width: 1200, height: 900 };
const sequences = productMixedSchedule.map((page) => page.sequence);
const isolationHeaders = {
  coop: "same-origin",
  coep: "require-corp",
};
const calibrationReadings = 100_000;
const calibrationRafIntervals = 48;
const minDenominatorTicks = 5;
const expectedArchiveHash =
  "cbe4ce3f557314fa093ac51214a2ba5e9cf0a5f0ad67b5429ce3a95a5e59a382";
const runId = randomUUID();

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (filename) => sha256(await readFile(filename));
const writeJson = (filename, value, flag = "w") =>
  writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, { flag });
const responseHeader = (headers, name) =>
  String(headers[name.toLowerCase()] ?? "").trim().toLowerCase();

async function calibratePage(page) {
  return await page.evaluate(async ({ readings, rafReadings }) => {
    let previous = performance.now();
    let minPositiveDeltaMs = Infinity;
    let positiveObservations = 0;
    for (let index = 0; index < readings; index++) {
      const current = performance.now();
      const delta = current - previous;
      if (delta > 0) {
        minPositiveDeltaMs = Math.min(minPositiveDeltaMs, delta);
        positiveObservations++;
      }
      previous = current;
    }
    const rafIntervalsMs = [];
    let previousRaf = await new Promise((resolve) => requestAnimationFrame(resolve));
    for (let index = 0; index < rafReadings; index++) {
      const currentRaf = await new Promise((resolve) => requestAnimationFrame(resolve));
      rafIntervalsMs.push(currentRaf - previousRaf);
      previousRaf = currentRaf;
    }
    return {
      minPositiveDeltaMs: Number.isFinite(minPositiveDeltaMs)
        ? minPositiveDeltaMs
        : null,
      positiveObservations,
      readings,
      rafIntervalsMs,
      crossOriginIsolated: globalThis.crossOriginIsolated === true,
      visibility: document.visibilityState,
      focused: document.hasFocus(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      timeOrigin: performance.timeOrigin,
    };
  }, { readings: calibrationReadings, rafReadings: calibrationRafIntervals });
}

function validateClock(clock, headers, label) {
  assert.ok(clock.minPositiveDeltaMs > 0, `${label}: no positive performance.now quantum`);
  assert.ok(clock.positiveObservations > 0, `${label}: no advancing clock observations`);
  assert.equal(clock.readings, calibrationReadings, `${label}: wrong clock sample count`);
  assert.equal(clock.crossOriginIsolated, true, `${label}: page is not cross-origin isolated`);
  assert.equal(clock.visibility, "visible", `${label}: page is not visible`);
  assert.equal(clock.focused, true, `${label}: page is not foregrounded`);
  assert.equal(headers.coop, isolationHeaders.coop, `${label}: wrong COOP response header`);
  assert.equal(headers.coep, isolationHeaders.coep, `${label}: wrong COEP response header`);
  assert.equal(clock.coop, isolationHeaders.coop, `${label}: clock COOP does not match`);
  assert.equal(clock.coep, isolationHeaders.coep, `${label}: clock COEP does not match`);
}

function validateResult(result, scheduled, browserErrors) {
  assert.equal(result?.status, "PASS");
  assert.equal(result.mode, "confirm");
  assert.equal(result.production, true);
  assert.equal(result.sequence, scheduled.sequence);
  assert.equal(result.pair, scheduled.pair);
  assert.equal(result.arm, scheduled.arm);
  assert.equal(result.size, scheduled.size);
  assert.equal(result.warmup, 60);
  assert.equal(result.frames, 240);
  assert.equal(result.samples?.length, 240);
  assert.deepEqual(
    result.samples.map((sample) => sample.frame),
    Array.from({ length: 240 }, (_, index) => index + 61),
  );
  assert.equal(result.samples.filter((sample) => sample.structural).length, 8);
  assert.deepEqual(Object.values(result.checks), [true, true, true, true, true]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(browserErrors, []);
  assert.equal(result.active?.writers, scheduled.size);
  assert.equal(result.after?.writers, 0);
  assert.equal(result.after?.mounts, result.after?.cleanups);
  assert.equal(result.active?.mounts, result.active?.cleanups + scheduled.size);
}

assert.equal(productMixedSchedule.length, 30, "The frozen schedule must contain 30 pages");
assert.deepEqual(sequences, Array.from({ length: 30 }, (_, index) => index));
assert.deepEqual(
  productMixedSchedule.filter((page) => page.pair === 0).map((page) => page.sequence),
  [0, 1, 10, 11, 20, 21],
);

const status = JSON.parse(await readFile(statusPath, "utf8"));
const statusHash = await hashFile(statusPath);
const archiveHash = await hashFile(archivePath);
assert.equal(status.status, "UNIT_AUTHORED_THREE_AND_PRODUCTION_BUILD_VERIFIED");
assert.equal(status.runtimeTests, 695);
assert.equal(status.rustTests, 33);
assert.equal(status.candidateProductionPilotPages, 0);
assert.equal(status.archiveMembers, 1093);
assert.equal(status.archiveSha256, expectedArchiveHash);
assert.equal(archiveHash, expectedArchiveHash);
assert.equal(status.speedGate, "UNMEASURED_CURRENT_REVISION");
assert.equal(status.qualifiedEngineDiagnostic, chromiumStorageDiagnosticPath);

const sourceAndBuildHashes = status.sourceAndBuildSha256;
assert.ok(sourceAndBuildHashes && typeof sourceAndBuildHashes === "object");
assert.equal(Object.keys(sourceAndBuildHashes).length, 1004);
assert.equal(sourceAndBuildHashes["src/owner_state_world.ts"], "70d9bc88a087e7dcedb8121dcfe4b9573e85549a49e385e67f1e178069c03428");
const productionHashes = Object.fromEntries(
  Object.entries(sourceAndBuildHashes).filter(([filename]) =>
    filename.startsWith(`${buildDirectory}/`)
  ),
);
assert.equal(Object.keys(productionHashes).length, 5);
for (const [filename, expectedHash] of Object.entries(sourceAndBuildHashes)) {
  assert.equal(await hashFile(filename), expectedHash, `Frozen input changed: ${filename}`);
}

const ownerRowProof = JSON.parse(await readFile(ownerRowProofPath, "utf8"));
const ownerRowProofHash = await hashFile(ownerRowProofPath);
const ownerRowFixtureHashes = {
  [ownerRowAuthoredSourcePath]: await hashFile(ownerRowAuthoredSourcePath),
  [ownerRowEmittedModulePath]: await hashFile(ownerRowEmittedModulePath),
};
const ownerThreeProof = JSON.parse(await readFile(ownerThreeProofPath, "utf8"));
const ownerThreeProofHash = await hashFile(ownerThreeProofPath);
const chromiumStorageDiagnostic = JSON.parse(await readFile(chromiumStorageDiagnosticPath, "utf8"));
const chromiumStorageDiagnosticHash = await hashFile(chromiumStorageDiagnosticPath);
const chromiumStorageArtifactPaths = [
  `${chromiumStorageDirectory}/inspect_numeric_cell_storage_candidate_v5.mjs`,
  `${chromiumStorageDirectory}/owner-state-world-entry.ts`,
  `${chromiumStorageDirectory}/owner-state-world.iife.js`,
  `${chromiumStorageDirectory}/owner-state-world.source.ts`,
];
const chromiumStorageArtifactHashes = Object.fromEntries(await Promise.all(chromiumStorageArtifactPaths.map(async (filename) => [filename, await hashFile(filename)])));
const compilerProofHashes = Object.fromEntries(await Promise.all(compilerProofPaths.map(async (filename) => [
  filename,
  await hashFile(filename),
])));
const compilerProof = await readFile(compilerProofPaths[0], "utf8");
const nativeCompilerProof = JSON.parse(await readFile(compilerProofPaths[2], "utf8"));
const reactCompilerProof = JSON.parse(await readFile(compilerProofPaths[3], "utf8"));
const verificationHashes = status.verificationSha256;
assert.ok(verificationHashes && typeof verificationHashes === "object");
assert.equal(Object.keys(verificationHashes).length, 25);
for (const [relativePath, expectedHash] of Object.entries(verificationHashes)) {
  assert.equal(await hashFile(relativePath), expectedHash, `Frozen verification artifact changed: ${relativePath}`);
}
const historicalVerificationHashes = status.historicalVerificationSha256;
assert.ok(historicalVerificationHashes && typeof historicalVerificationHashes === "object");
assert.equal(Object.keys(historicalVerificationHashes).length, 64);
for (const [relativePath, expectedHash] of Object.entries(historicalVerificationHashes)) {
  assert.equal(await hashFile(relativePath), expectedHash, `Frozen historical verification artifact changed: ${relativePath}`);
}
assert.equal(status.archiveMembers, new Set([
  ...Object.keys(sourceAndBuildHashes),
  ...Object.keys(verificationHashes),
  ...Object.keys(historicalVerificationHashes),
]).size);
assert.equal(status.verificationSha256?.[ownerRowProofPath], ownerRowProofHash);
for (const [filename, hash] of Object.entries(ownerRowFixtureHashes)) {
  assert.equal(status.verificationSha256?.[filename], hash, `Authored owner-row fixture is not checkpoint-locked: ${filename}`);
}
assert.equal(status.verificationSha256?.[ownerThreeProofPath], ownerThreeProofHash);
assert.equal(status.historicalVerificationSha256?.[chromiumStorageDiagnosticPath], chromiumStorageDiagnosticHash);
for (const [filename, hash] of Object.entries(chromiumStorageArtifactHashes)) {
  assert.equal(status.historicalVerificationSha256?.[filename], hash, `Chromium artifact is not checkpoint-locked: ${filename}`);
}
for (const [filename, hash] of Object.entries(compilerProofHashes)) {
  assert.equal(status.sourceAndBuildSha256?.[filename], hash, `Compiler artifact is not checkpoint-locked: ${filename}`);
}
assert.equal(ownerRowProof.status, "PASS");
assert.deepEqual(ownerRowProof.ownerRowPrograms.sparseAndDenseCalls.map(({ count }) => count), [1, 6]);
assert.deepEqual(ownerRowProof.ownerRowPrograms.sparseAndDenseCalls.map(({ accepted }) => accepted), [true, true]);
assert.equal(ownerRowProof.ownerRowPrograms.preparedProgramCount, 2);
assert.equal(ownerRowProof.ownerRowPrograms.eligibleNonemptyPendingCaptureCalls, 0);
assert.equal(ownerRowProof.ownerRowPrograms.legacyPreparedCellCalls, 0);
assert.equal(ownerRowProof.ownerRowPrograms.legacyPreparedCellExecutions, 0);
assert.equal(ownerRowProof.ownerRowPrograms.legacySetColumnCellsCalls, 0);
assert.equal(ownerRowProof.ownerRowPrograms.legacySetColumnRowsCalls, 0);
assert.equal(ownerRowProof.ownerRowPrograms.sourceProgramCalls, 0);
for (const assertion of [
  "ordinaryAuthoredTSX", "layoutOwnerMatchesComponent", "sourceSiteOrderMatchesLayout",
  "authoredVectorOrderPreserved", "repeatedSourceReadPreserved", "sparseCellUpdate",
  "denseTwoRowSixCellUpdate", "noEligibleRerenders", "stableKeyedMoveIdentity",
  "removedOwnerAndDeadSetter", "rowReuseGeneration", "discardedCandidateColumnIsolation",
  "promotedStringAndUndefinedFallback",
]) assert.equal(ownerRowProof.assertions[assertion], true, `Owner-row proof assertion failed: ${assertion}`);
assert.equal(ownerRowProof.assertions.candidateValidAfterPrivateRenderWrite, false);
assert.deepEqual(ownerRowProof.assertions.rowReuseGeneration, true);

assert.equal(ownerThreeProof.status, "PASS");
assert.equal(ownerThreeProof.numericOwnerRowCut.batches, 240);
assert.equal(ownerThreeProof.numericOwnerRowCut.cellsPerBatch, 5);
assert.equal(ownerThreeProof.numericOwnerRowCut.preparedRowProgramCount, 1);
assert.equal(ownerThreeProof.numericOwnerRowCut.eligibleNonemptyPendingCaptureCalls, 0);
assert.equal(ownerThreeProof.numericOwnerRowCut.legacyPreparedCellCalls, 0);
assert.equal(ownerThreeProof.numericOwnerRowCut.legacyPreparedCellExecutions, 0);
assert.equal(ownerThreeProof.numericOwnerRowCut.legacySetColumnCellsCalls, 0);
assert.equal(ownerThreeProof.numericOwnerRowCut.legacySetColumnRowsCalls, 0);
assert.equal(ownerThreeProof.numericOwnerRowCut.genericSourceProgramCalls, 0);
assert.equal(ownerThreeProof.threeObjectIdentity.componentRenders, 1);
assert.equal(ownerThreeProof.assertions.actualThreeSceneAndObjects, true);
assert.equal(ownerThreeProof.assertions.sameThreeObjectAndResourceIdentities, true);
assert.equal(ownerThreeProof.assertions.cleanThreeResourceDisposal, true);

assert.equal(chromiumStorageDiagnostic.status, "PASS");
assert.equal(chromiumStorageDiagnostic.attempt, "v5");
assert.equal(chromiumStorageDiagnostic.sourcePath, "src/owner_state_world.ts");
assert.equal(chromiumStorageDiagnostic.sourceSha256BeforeBundle, chromiumStorageDiagnostic.sourceSha256AfterBundle);
assert.equal(chromiumStorageDiagnostic.sourceSha256BeforeBundle, sourceAndBuildHashes["src/owner_state_world.ts"]);
assert.equal(chromiumStorageDiagnostic.sourceSha256BeforeBundle, chromiumStorageDiagnostic.bundledInputHashes["src/owner_state_world.ts"]);
assert.equal(Object.keys(chromiumStorageDiagnostic.bundledInputHashes).length, 6);
for (const [filename, expectedHash] of Object.entries(chromiumStorageDiagnostic.bundledInputHashes)) {
  assert.equal(await hashFile(filename), expectedHash, `Chromium diagnostic input changed: ${filename}`);
  assert.equal(sourceAndBuildHashes[filename] ?? verificationHashes[filename] ?? historicalVerificationHashes[filename], expectedHash, `Chromium diagnostic input is not covered by checkpoint: ${filename}`);
}
assert.equal(chromiumStorageDiagnostic.environment.scriptPath, "scripts/inspect_numeric_cell_storage_candidate_v5.mjs");
assert.equal(chromiumStorageDiagnostic.environment.scriptSha256, chromiumStorageArtifactHashes[`${chromiumStorageDirectory}/inspect_numeric_cell_storage_candidate_v5.mjs`]);
assert.equal(chromiumStorageDiagnostic.bundleSha256, await hashFile(chromiumStorageDiagnostic.bundlePath));
assert.equal(chromiumStorageDiagnostic.browserVersion.product.startsWith("Chrome/"), true);
for (const key of ["directInitial", "preparedPublished", "directAfterReentryDispatch", "preparedAfterReentryDispatch", "directAfterPromotion", "preparedAfterPromotion", "directAfterReturnToNumeric", "preparedAfterReturnToNumeric", "directAfterDestroy", "directAfterOwnerReuse"]) {
  const snapshot = chromiumStorageDiagnostic.snapshots[key];
  assert.equal(snapshot.fastProperties, true, `${key}: expected fast properties`);
  assert.equal(snapshot.ownValueDescriptor, null, `${key}: own value property must be absent`);
  assert.equal(snapshot.prototypeValueDescriptor?.getterName, "getLaneBackedValue", `${key}: expected shared prototype getter`);
  assert.equal(snapshot.prototypeValueDescriptor?.setterName, "setLaneBackedValue", `${key}: expected shared prototype setter`);
}
assert.equal(chromiumStorageDiagnostic.snapshots.directInitial.boxedValueUndefined, true);
assert.equal(chromiumStorageDiagnostic.snapshots.preparedPublished.boxedValueUndefined, true);
assert.equal(chromiumStorageDiagnostic.snapshots.directAfterDestroy.boxedValueUndefined, true);
assert.equal(chromiumStorageDiagnostic.snapshots.directAfterDestroy.laneIsNullish, true);
assert.equal(chromiumStorageDiagnostic.semantics.preparationCancellation.acceptedAfterDiscard, false);
assert.equal(chromiumStorageDiagnostic.semantics.destroyAndReuse.laneActive, true);
assert.equal(chromiumStorageDiagnostic.snapshots.directAfterOwnerReuse.lane.generation, 2);
assert.equal(chromiumStorageDiagnostic.semantics.preparationCancellation.ownerVisibleAfterDiscard, false);
assert.equal(chromiumStorageDiagnostic.semantics.destroyAndReuse.destroyed, true);
assert.match(chromiumStorageDiagnostic.semantics.destroyAndReuse.deadSetterError, /not alive/);
assert.equal(chromiumStorageDiagnostic.rowCapabilities.afterVersionAdvance.staleVersionDeclined, true);
assert.equal(chromiumStorageDiagnostic.rowCapabilities.afterVersionAdvance.currentVersionAccepted, true);
assert.equal(chromiumStorageDiagnostic.rowCapabilities.afterVersionAdvance.sameRowIdentity, true);
assert.equal(chromiumStorageDiagnostic.rowCapabilities.afterDestroy.deadHandleDeclined, true);
assert.equal(chromiumStorageDiagnostic.rowCapabilities.afterDestroy.logicalLaneReleased, true);
for (const view of [
  chromiumStorageDiagnostic.rowCapabilities.directLive,
  chromiumStorageDiagnostic.rowCapabilities.preparedPublishedLive,
  chromiumStorageDiagnostic.rowCapabilities.afterVersionAdvance.view,
]) {
  assert.equal(view.frozen, true);
  for (const descriptor of Object.values(view.descriptors)) {
    assert.equal(descriptor.hasValue, true);
    assert.equal(descriptor.hasGetter, false);
    assert.equal(descriptor.hasSetter, false);
  }
}

const compilerPlanStart = compilerProof.search(/\n\s*"component_module":/);
assert.ok(compilerPlanStart > 0);
const compilerExecutable = compilerProof.slice(0, compilerPlanStart);
const numericProgramTable = compilerExecutable.match(/const __nativeNumericPrograms\s*=\s*\[([\s\S]*?)\n\];/);
assert.ok(numericProgramTable, "Compiler output includes the static owner-row program table");
assert.equal((numericProgramTable[1].match(/schemaVersion:\s*2/g) ?? []).length, 3);
assert.equal((numericProgramTable[1].match(/ownerProgramId:\s*"/g) ?? []).length, 3);
assert.equal((numericProgramTable[1].match(/sinkId:\s*"/g) ?? []).length, 3);
assert.equal((numericProgramTable[1].match(/sourceSites:\s*\[/g) ?? []).length, 3);
assert.equal((compilerExecutable.match(/__nativeBindStatePropAt\(/g) ?? []).length, 3);
const layoutBlock = compilerExecutable.match(/stateLayout:\s*\{\s*schemaVersion:\s*1,\s*programId:\s*"([^"]+)",\s*slots:\s*\[([\s\S]*?)\]\s*\}/);
assert.ok(layoutBlock, "Compiler output includes owner program identity and dense stateLayout slots");
const layoutProgramId = layoutBlock[1];
const layoutSlots = [...layoutBlock[2].matchAll(/siteId:\s*"([^"\n]+#component:ProductMixedRow#state:\d+)",\s*slot:\s*(\d+)/g)]
  .map((match) => ({ siteId: match[1], slot: Number(match[2]) }));
const ownerProgramId = "src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow";
assert.equal(layoutProgramId, ownerProgramId);
assert.deepEqual(layoutSlots, [0, 1, 2].map((slot) => ({
  siteId: `${ownerProgramId}#state:${slot}`,
  slot,
})));
assert.equal(nativeCompilerProof.arm, "native");
assert.equal(nativeCompilerProof.compiled, true);
assert.equal(nativeCompilerProof.bindings, 3);
assert.equal(nativeCompilerProof.ownerRow.ownerProgramId, ownerProgramId);
assert.equal(nativeCompilerProof.ownerRow.stateLayoutProgramId, ownerProgramId);
assert.equal(nativeCompilerProof.ownerRow.denseSlots, true);
assert.equal(nativeCompilerProof.ownerRow.validDescriptors, true);
assert.equal(nativeCompilerProof.ownerRow.validBindings, true);
assert.equal(nativeCompilerProof.ownerRow.numericDescriptors.length, 3);
assert(nativeCompilerProof.ownerRow.numericDescriptors.every((descriptor, index) =>
  descriptor.schemaVersion === 2 &&
  descriptor.ownerProgramId === ownerProgramId &&
  descriptor.sourceSites.length === 1 &&
  descriptor.sourceSites[0] === `${ownerProgramId}#state:${index}`
));
assert.equal(reactCompilerProof.arm, "react");
assert.equal(reactCompilerProof.rowMemoCache, true);
assert.equal(reactCompilerProof.boardMemoCache, true);

// A separate six-page production correctness pilot is required for this
// confirmation. Its count stays outside the immutable checkpoint status.
const productionPilot = JSON.parse(await readFile(productionPilotManifestPath, "utf8"));
const productionPilotHash = await hashFile(productionPilotManifestPath);
const productionPilotVerifierHash = await hashFile(productionPilotVerifierPath);
const productionPilotEvidenceVerifierHash = await hashFile(productionPilotEvidenceVerifierPath);
const productionPilotStatus = JSON.parse(await readFile(productionPilotStatusPath, "utf8"));
const productionPilotStatusHash = await hashFile(productionPilotStatusPath);
const productionPilotArchiveHash = await hashFile(productionPilotArchivePath);
const productionPilotVerification = JSON.parse(await readFile(productionPilotVerificationPath, "utf8"));
const productionPilotVerificationHash = await hashFile(productionPilotVerificationPath);
assert.equal(productionPilotStatus.status, "PRODUCTION_CORRECTNESS_PILOT_VERIFIED");
assert.equal(productionPilotStatus.pilotPages, 6);
assert.deepEqual(productionPilotStatus.sourceCheckpoint, {
  path: archivePath,
  sha256: expectedArchiveHash,
  members: 1093,
});
assert.equal(productionPilotStatus.archiveSha256, "925cb5eb7caf9c4e49c164666eb899c7c00f87075ef97828aba4052bc324534b");
assert.equal(productionPilotArchiveHash, productionPilotStatus.archiveSha256);
assert.equal(Object.keys(productionPilotStatus.evidenceSha256).length, 16);
for (const [filename, expectedHash] of Object.entries(productionPilotStatus.evidenceSha256)) {
  assert.equal(await hashFile(filename), expectedHash, `Pilot evidence changed: ${filename}`);
}
assert.equal(productionPilotStatus.evidenceSha256[productionPilotManifestPath], productionPilotHash);
assert.equal(productionPilotStatus.evidenceSha256[productionPilotVerificationPath], productionPilotVerificationHash);
assert.equal(productionPilotStatus.evidenceSha256[productionPilotVerifierPath], productionPilotVerifierHash);
assert.equal(productionPilotStatus.evidenceSha256[productionPilotEvidenceVerifierPath], productionPilotEvidenceVerifierHash);
assert.equal(productionPilotVerification.status, "PASS");
assert.equal(productionPilotVerification.pilotPagesVerified, 6);
assert.equal(productionPilotVerification.sourceArchive.sha256, expectedArchiveHash);
assert.equal(productionPilotVerification.reusedWorldDiagnostic.attempt, "v5");
assert.equal(productionPilotVerification.productionAssetsVerified, 5);
assert.equal(productionPilotVerification.inventory.sourceBuildEntriesVerified, 1004);
assert.equal(productionPilotVerification.inventory.currentVerificationEntriesVerified, 25);
assert.equal(productionPilotVerification.inventory.historicalVerificationEntriesVerified, 64);
assert.equal(productionPilotVerification.inventory.archiveMembersVerified, 1093);
assert.equal(productionPilot.status, "PASS");
assert.equal(productionPilot.scope, "Correctness pilot only; no confirmatory performance evidence");
assert.deepEqual(productionPilot.productionSha256, productionHashes, "Pilot is not tied to the frozen five production assets");
assert.deepEqual(productionPilot.servedAssetSha256, productionHashes, "Pilot did not serve the frozen production bytes");
const expectedEngineEpoch = {
  product: chromiumStorageDiagnostic.browserVersion.product,
  jsVersion: chromiumStorageDiagnostic.browserVersion.jsVersion,
  revision: chromiumStorageDiagnostic.browserVersion.revision,
};
assert.deepEqual(productionPilot.engineEpoch, expectedEngineEpoch, "Pilot engine differs from the qualified v5 Chromium diagnostic");
assert.deepEqual(productionPilot.sourceArchive, { path: archivePath, sha256: archiveHash });
assert.deepEqual(productionPilot.chromiumDiagnostic, {
  path: chromiumStorageDiagnosticPath,
  sha256: chromiumStorageDiagnosticHash,
  engineEpoch: expectedEngineEpoch,
});
assert.equal(productionPilot.assetPreflight.length, 5);
for (const asset of productionPilot.assetPreflight) {
  assert.equal(productionPilot.productionSha256[asset.filename], asset.sha256);
  assert.equal(productionPilot.servedAssetSha256[asset.filename], asset.sha256);
  assert.equal(asset.status, 200);
  assert.equal(asset.coop, isolationHeaders.coop);
  assert.equal(asset.coep, isolationHeaders.coep);
}
assert.deepEqual(productionPilot.records, [128, 512, 1024].flatMap((size) => [
  { arm: "native", size, status: "PASS" },
  { arm: "react", size, status: "PASS" },
]));
assert.deepEqual(productionPilot.nativeProof, nativeCompilerProof);
assert.deepEqual(productionPilot.reactProof, reactCompilerProof);
assert.deepEqual(productionPilot.compilerProofs, {
  native: { path: compilerProofPaths[2], sha256: compilerProofHashes[compilerProofPaths[2]] },
  react: { path: compilerProofPaths[3], sha256: compilerProofHashes[compilerProofPaths[3]] },
});
assert.deepEqual(productionPilot.authoredOwnerRowProof, {
  path: ownerRowProofPath,
  sha256: ownerRowProofHash,
  assertions: ownerRowProof.assertions,
});
assert.deepEqual(productionPilot.actualThreeOwnerRowProof, {
  path: ownerThreeProofPath,
  sha256: ownerThreeProofHash,
  assertions: ownerThreeProof.assertions,
});
assert.deepEqual(productionPilot.pageFiles.map(({ arm, size, file }) => ({ arm, size, file })),
  [128, 512, 1024].flatMap((size) => [
    { arm: "native", size, file: `native-${size}.json` },
    { arm: "react", size, file: `react-${size}.json` },
  ]));
const productionPilotPageHashes = {};
for (const pageFile of productionPilot.pageFiles) {
  const relativePath = `${productionPilotDirectory}/${pageFile.file}`;
  const rawPage = JSON.parse(await readFile(relativePath, "utf8"));
  const rawPageHash = await hashFile(relativePath);
  assert.equal(rawPageHash, pageFile.sha256, `Pilot page hash mismatch: ${relativePath}`);
  assert.equal(rawPage.status, "PASS");
  assert.equal(rawPage.mode, "pilot");
  assert.equal(rawPage.production, true);
  assert.equal(rawPage.arm, pageFile.arm);
  assert.equal(rawPage.size, pageFile.size);
  assert.equal(rawPage.frames, 60);
  assert.deepEqual(rawPage.productionSha256, productionHashes);
  assert.deepEqual(rawPage.servedAssetSha256, productionHashes);
  assert.deepEqual(rawPage.engineEpoch, expectedEngineEpoch);
  assert.ok(rawPage.browser?.userAgent);
  assert.deepEqual(rawPage.browser?.viewport, viewport);
  assert.deepEqual(rawPage.samples.map(({ frame }) => frame), Array.from({ length: 60 }, (_, index) => index + 6));
  assert.deepEqual(rawPage.samples.filter(({ structural }) => structural).map(({ frame }) => frame), [35, 65]);
  assert.deepEqual(rawPage.checks, { identity: true, lifecycle: true, order: true, output: true, visible: true });
  assert.deepEqual(rawPage.errors, []);
  assert.deepEqual(rawPage.browserErrors, []);
  assert.equal(rawPage.active.mounts, pageFile.size + 16);
  assert.equal(rawPage.active.cleanups, 16);
  assert.equal(rawPage.after.mounts, pageFile.size + 16);
  assert.equal(rawPage.after.cleanups, pageFile.size + 16);
  assert.equal(rawPage.after.writers, 0);
  if (pageFile.arm === "native") {
    assert.equal(rawPage.after.extra.root.ownerCount, 0);
    assert.equal(rawPage.after.extra.root.disposed, true);
    assert.equal(rawPage.after.extra.collection.readerCount, 0);
    assert.equal(rawPage.after.extra.collection.retainedBatches, 0);
  }
  productionPilotPageHashes[relativePath] = rawPageHash;
}
const productionPilotLocks = {
  [productionPilotStatusPath]: productionPilotStatusHash,
  [productionPilotArchivePath]: productionPilotArchiveHash,
  [productionPilotVerificationPath]: productionPilotVerificationHash,
  [productionPilotVerifierPath]: productionPilotVerifierHash,
  [productionPilotEvidenceVerifierPath]: productionPilotEvidenceVerifierHash,
  [productionPilotManifestPath]: productionPilotHash,
  ...productionPilotStatus.evidenceSha256,
  ...productionPilotPageHashes,
};

const protocolHash = await hashFile(protocolPath);
const timingConfigHash = await hashFile(timingConfigPath);
const basePreviewConfigHash = await hashFile(basePreviewConfigPath);
const scheduleHash = await hashFile(schedulePath);
const collectorHash = await hashFile(collectorPath);
const analyzerHash = await hashFile(analyzerPath);
const verifierHash = await hashFile(verifierPath);



console.log("PASS primary non-browser collector schema/input preflight; no registration or pages collected");
