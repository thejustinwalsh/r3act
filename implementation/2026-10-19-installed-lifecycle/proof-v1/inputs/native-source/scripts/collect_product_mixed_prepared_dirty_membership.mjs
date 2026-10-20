import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { openBrowser } from "vitexec/cli";
import { productMixedSchedule } from "../src/browser/product_mixed_schedule.ts";

const origin = "https://compiled-dirty-membership-timing.localhost:1355";
const output = "results/product-mixed-prepared-dirty-membership-confirmation";
const preregistrationPath = `${output}/preregistration.json`;
const manifestPath = `${output}/manifest.json`;
const finalResultsPath = `${output}/FINALresults.json`;
const checkpoint = "implementation/2026-10-13-prepared-dirty-membership";
const archivePath = `${checkpoint}/source-and-evidence.tar.gz`;
const statusPath = `${checkpoint}/status.json`;
const pilotDirectory = "results/product-mixed-prepared-dirty-membership-pilot";
const pilotManifestPath = `${pilotDirectory}/results.json`;
const pilotVerifierPath = "scripts/verify_product_mixed_prepared_dirty_membership_pilot.mjs";
const preparedExecutionProofPath = ".cache/prepared-numeric-cell-proof-v2/prepared-numeric-cell-proof-v2-1791885263259-80954-e967d459-32be-4bc2-996d-1a8e4721c36b.json";
const preparedLifecycleProofPath = ".cache/prepared-numeric-cell-lifecycle-proof/prepared-lifecycle-proof-1791885299470-81595-4312ddec-3948-4bb8-9481-f561daa43d08.json";
const chromiumStorageDiagnosticPath = "results/numeric-cell-storage-candidate-v4/diagnostic.json";
const chromiumStorageDirectory = "results/numeric-cell-storage-candidate-v4";
const compilerProofPaths = [
  ".cache/product-mixed-prepared-dirty-membership/compiler-proof/native.js",
  ".cache/product-mixed-prepared-dirty-membership/compiler-proof/react.js",
  ".cache/product-mixed-prepared-dirty-membership/compiler-proof/native.json",
  ".cache/product-mixed-prepared-dirty-membership/compiler-proof/react.json",
];
const timingConfigPath = "vite.product-mixed-prepared-dirty-membership-timing.config.ts";
const basePreviewConfigPath = "vite.product-mixed-prepared-dirty-membership.config.ts";
const protocolPath = "product-mixed-prepared-dirty-membership-confirmation-protocol.md";
const collectorPath = "scripts/collect_product_mixed_prepared_dirty_membership.mjs";
const analyzerPath = "scripts/summarize_product_mixed_prepared_dirty_membership.mjs";
const verifierPath = "scripts/verify_product_mixed_prepared_dirty_membership_evidence.mjs";
const schedulePath = "src/browser/product_mixed_schedule.ts";
const buildDirectory = "dist-product-mixed-prepared-dirty-membership";
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
  "38c9fc22b706bc9181c7de30f27e94fe937b0dc3993ed5d28642bf4779ca614d";
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
assert.equal(status.status, "UNIT_AUTHORED_COMPILER_AND_CHROMIUM_VERIFIED");
assert.equal(status.runtimeTests, 663);
assert.equal(status.rustTests, 32);
assert.equal(status.candidateProductionPilotPages, 0);

assert.equal(status.archiveSha256, expectedArchiveHash);
assert.equal(archiveHash, expectedArchiveHash);
assert.equal(status.speedGate, "UNMEASURED_FOR_THIS_CANDIDATE");
assert.equal(status.qualifiedEngineDiagnostic, chromiumStorageDiagnosticPath);

const sourceAndBuildHashes = status.sourceAndBuildSha256;
assert.ok(sourceAndBuildHashes && typeof sourceAndBuildHashes === "object");
assert.equal(Object.keys(sourceAndBuildHashes).length, 884);
const productionHashes = Object.fromEntries(
  Object.entries(sourceAndBuildHashes).filter(([filename]) =>
    filename.startsWith(`${buildDirectory}/`)
  ),
);
assert.equal(Object.keys(productionHashes).length, 5);
for (const [filename, expectedHash] of Object.entries(sourceAndBuildHashes)) {
  assert.equal(await hashFile(filename), expectedHash, `Frozen input changed: ${filename}`);
}

const expectedPilotRecords = [
  ["native", 128], ["react", 128],
  ["native", 512], ["react", 512],
  ["native", 1024], ["react", 1024],
];
const pilotManifest = JSON.parse(await readFile(pilotManifestPath, "utf8"));
assert.equal(pilotManifest.status, "PASS");
assert.deepEqual(
  pilotManifest.records,
  expectedPilotRecords.map(([arm, size]) => ({ arm, size, status: "PASS" })),
);
assert.deepEqual(pilotManifest.nativeProof, {
  arm: "native",
  compiled: true,
  bindings: 3,
  deltas: true,
  propOnly: true,
  deltaFallback: false,
});
assert.deepEqual(pilotManifest.reactProof, {
  arm: "react",
  compiled: true,
  rowMemoCache: true,
  boardMemoCache: true,
});
const pilotPageHashes = {};
for (const [arm, size] of expectedPilotRecords) {
  const filename = `${pilotDirectory}/${arm}-${size}.json`;
  const page = JSON.parse(await readFile(filename, "utf8"));
  assert.equal(page.status, "PASS");
  assert.equal(page.mode, "pilot");
  assert.equal(page.production, true);
  assert.equal(page.arm, arm);
  assert.equal(page.size, size);
  assert.equal(page.frames, 60);
  assert.equal(page.samples?.length, 60);
  assert.deepEqual(Object.values(page.checks), [true, true, true, true, true]);
  assert.deepEqual(page.errors, []);
  assert.deepEqual(page.browserErrors, []);
  pilotPageHashes[filename] = await hashFile(filename);
}

const preparedExecutionProof = JSON.parse(await readFile(preparedExecutionProofPath, "utf8"));
const preparedExecutionProofHash = await hashFile(preparedExecutionProofPath);
const preparedLifecycleProof = JSON.parse(await readFile(preparedLifecycleProofPath, "utf8"));
const preparedLifecycleProofHash = await hashFile(preparedLifecycleProofPath);
const chromiumStorageDiagnostic = JSON.parse(await readFile(chromiumStorageDiagnosticPath, "utf8"));
const chromiumStorageDiagnosticHash = await hashFile(chromiumStorageDiagnosticPath);
const chromiumStorageArtifactPaths = [
  `${chromiumStorageDirectory}/inspect_numeric_cell_storage_candidate.mjs`,
  `${chromiumStorageDirectory}/owner-state-world-entry.ts`,
  `${chromiumStorageDirectory}/owner-state-world.iife.js`,
];
const chromiumStorageArtifactHashes = Object.fromEntries(await Promise.all(chromiumStorageArtifactPaths.map(async (filename) => [filename, await hashFile(filename)])));
const compilerProofHashes = Object.fromEntries(await Promise.all(compilerProofPaths.map(async (filename) => [
  filename,
  await hashFile(filename),
])));
const compilerProof = await readFile(compilerProofPaths[0], "utf8");
const nativeCompilerProof = JSON.parse(await readFile(compilerProofPaths[2], "utf8"));
const reactCompilerProof = JSON.parse(await readFile(compilerProofPaths[3], "utf8"));
assert.equal(status.verificationSha256?.[preparedExecutionProofPath], preparedExecutionProofHash);
assert.equal(status.verificationSha256?.[preparedLifecycleProofPath], preparedLifecycleProofHash);
assert.equal(status.verificationSha256?.[chromiumStorageDiagnosticPath], chromiumStorageDiagnosticHash);
for (const [filename, hash] of Object.entries(chromiumStorageArtifactHashes)) assert.equal(status.verificationSha256?.[filename], hash);
for (const [filename, hash] of Object.entries(compilerProofHashes)) {
  assert.ok(hash.length === 64, `Compiler proof is not readable: ${filename}`);
}
assert.equal(preparedExecutionProof.status, "PASS");
assert.equal(chromiumStorageDiagnostic.status, "PASS");
assert.equal(chromiumStorageDiagnostic.sourcePath, "src/owner_state_world.ts");
assert.equal(chromiumStorageDiagnostic.sourceSha256BeforeBundle, chromiumStorageDiagnostic.sourceSha256AfterBundle);
assert.equal(chromiumStorageDiagnostic.sourceSha256BeforeBundle, chromiumStorageDiagnostic.bundledInputHashes["src/owner_state_world.ts"]);
assert.equal(Object.keys(chromiumStorageDiagnostic.bundledInputHashes).length, 6);
for (const [filename, expectedHash] of Object.entries(chromiumStorageDiagnostic.bundledInputHashes)) {
  assert.equal(await hashFile(filename), expectedHash, `Chromium diagnostic input changed: ${filename}`);
  assert.equal(status.sourceAndBuildSha256?.[filename] ?? status.verificationSha256?.[filename], expectedHash, `Chromium diagnostic input is not covered by checkpoint: ${filename}`);
}
assert.equal(chromiumStorageDiagnostic.environment.scriptPath, "scripts/inspect_numeric_cell_storage_candidate.mjs");
assert.equal(chromiumStorageDiagnostic.environment.scriptSha256, chromiumStorageArtifactHashes[`${chromiumStorageDirectory}/inspect_numeric_cell_storage_candidate.mjs`]);
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
assert.equal(preparedExecutionProof.status, "PASS");
assert.equal(preparedExecutionProof.preparedNumericCellCut.preparedTokenCount, 6);
assert.equal(preparedExecutionProof.preparedNumericCellCut.isCurrentCalls, 0);
assert.deepEqual(preparedExecutionProof.preparedNumericCellCut.executeCalls, [
  { count: 1, tokensLength: 1, valuesLength: 1, allTokensCurrent: true },
  { count: 6, tokensLength: 6, valuesLength: 6, allTokensCurrent: true },
]);
assert.equal(preparedExecutionProof.preparedNumericCellCut.nonemptyPendingStateCaptureCalls, 0);
assert.equal(preparedExecutionProof.preparedNumericCellCut.legacySetColumnCellsCalls, 0);
assert.equal(preparedExecutionProof.preparedNumericCellCut.legacyExecuteSourceProgramCalls, 0);
assert.equal(preparedExecutionProof.inheritedAssertions.ordinaryAuthoredTSX, true);
assert.deepEqual(preparedExecutionProof.inheritedAssertions.compilerLayoutSlots.map(({ slot }) => slot), [0, 1, 2]);
assert.deepEqual(preparedExecutionProof.inheritedAssertions.sparseValues, [13, 0, 0]);
assert.deepEqual(preparedExecutionProof.inheritedAssertions.denseValues, [21, 22, 23, 31, 32, 33]);
assert.equal(preparedExecutionProof.inheritedAssertions.stableAddressesThroughMove, true);
assert.equal(preparedExecutionProof.inheritedAssertions.removedOwnerAndDeadSetter, true);
assert.deepEqual(preparedExecutionProof.inheritedAssertions.rowReuse, {
  row: 1,
  oldGeneration: 1,
  newGeneration: 2,
});
assert.equal(preparedExecutionProof.inheritedAssertions.discardedCandidateColumnIsolation, true);
assert.equal(preparedExecutionProof.inheritedAssertions.candidateValidAfterPrivateRenderWrite, false);
assert.equal(preparedLifecycleProof.status, "PASS");
assert.deepEqual(preparedLifecycleProof.numericLaneReentry.capturedWrites.map(({ count }) => count), [1, 1]);
assert.equal(preparedLifecycleProof.numericLaneReentry.outerWriteValue, "5px");
assert.equal(preparedLifecycleProof.numericLaneReentry.reentrantPendingValue, 9);
assert.equal(preparedLifecycleProof.numericLaneReentry.nextWriteValue, "9px");
assert.equal(preparedLifecycleProof.numericLaneReentry.snapshotsDuringSupportedLaneCuts, 0);
assert.deepEqual(preparedLifecycleProof.promotion.outputs, ["widepx", "undefinedpx", "7px", "8px"]);
assert.equal(preparedLifecycleProof.promotion.initialStateActivations, 1);
assert.equal(preparedLifecycleProof.promotion.stickyWorldLaneOff, true);
assert.equal(preparedLifecycleProof.promotion.scalarSourceProgramFallback, true);
assert.equal(preparedLifecycleProof.lifecycle.refBeforeEffect, true);
assert.equal(preparedLifecycleProof.lifecycle.effectObservesCommittedValues, true);
assert.equal(preparedLifecycleProof.lifecycle.deadSetterRejectedOnDispose, true);
assert.equal(preparedLifecycleProof.lifecycle.hostWriteFailureCleanup, true);
assert.equal(preparedLifecycleProof.hostFailure.terminalFlushThrows, true);
assert.equal(preparedLifecycleProof.hostFailure.priorOutputRetained, true);
assert.equal(preparedLifecycleProof.hostFailure.cleanupCompleted, true);
const compilerPlanStart = compilerProof.search(/\n\s*"component_module":/);
assert.ok(compilerPlanStart > 0);
const compilerExecutable = compilerProof.slice(0, compilerPlanStart);
const numericProgramTable = compilerExecutable.match(/const __nativeNumericPrograms\s*=\s*\[([\s\S]*?)\n\];/);
assert.ok(numericProgramTable, "compiler output includes the static numeric program descriptor table");
assert.equal((numericProgramTable[1].match(/sinkId:\s*"/g) ?? []).length, 3);
assert.equal((numericProgramTable[1].match(/sourceSites:\s*\[/g) ?? []).length, 3);
assert.equal((compilerExecutable.match(/__nativeBindStatePropAt\(/g) ?? []).length, 3);
const layoutBlock = compilerExecutable.match(/stateLayout:\s*\{\s*schemaVersion:\s*1,\s*slots:\s*\[([\s\S]*?)\]\s*\}/);
assert.ok(layoutBlock, "compiler output includes the separate stateLayout table");
const layoutSlots = [...layoutBlock[1].matchAll(/siteId:\s*"([^"\n]+#component:ProductMixedRow#state:\d+)",\s*slot:\s*(\d+)/g)]
  .map((match) => ({ siteId: match[1], slot: Number(match[2]) }));
assert.deepEqual(layoutSlots, [0, 1, 2].map((slot) => ({
  siteId: `src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:${slot}`,
  slot,
})));
assert.equal(nativeCompilerProof.arm, "native");
assert.equal(nativeCompilerProof.compiled, true);
assert.equal(nativeCompilerProof.bindings, 3);
assert.equal(reactCompilerProof.arm, "react");
assert.equal(reactCompilerProof.rowMemoCache, true);
assert.equal(reactCompilerProof.boardMemoCache, true);

const verificationHashes = status.verificationSha256;
assert.ok(verificationHashes && typeof verificationHashes === "object");
assert.equal(Object.keys(verificationHashes).length, 26);
for (const [relativePath, expectedHash] of Object.entries(verificationHashes)) {
  assert.equal(
    await hashFile(relativePath),
    expectedHash,
    `Frozen verification artifact changed: ${relativePath}`,
  );
}

const protocolHash = await hashFile(protocolPath);
const timingConfigHash = await hashFile(timingConfigPath);
const basePreviewConfigHash = await hashFile(basePreviewConfigPath);
const scheduleHash = await hashFile(schedulePath);
const collectorHash = await hashFile(collectorPath);
const analyzerHash = await hashFile(analyzerPath);
const verifierHash = await hashFile(verifierPath);
const pilotVerifierHash = await hashFile(pilotVerifierPath);


await mkdir(output, { recursive: true });
assert.equal((await readdir(output)).length, 0, `Refusing to reuse nonempty output directory: ${output}`);

const browser = await openBrowser({ headless: false, gpu: false });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport });
let preregistration;
const pageRecords = [];
try {
  const assetPreflight = [];
  for (const [filename, expectedHash] of Object.entries(productionHashes)) {
    const publicPath = filename.slice(`${buildDirectory}/`.length);
    const response = await context.request.get(`${origin}/${publicPath}`);
    const headers = response.headers();
    assert.equal(response.status(), 200, `Production asset unavailable: ${filename}`);
    assert.equal(responseHeader(headers, "cross-origin-opener-policy"), isolationHeaders.coop);
    assert.equal(responseHeader(headers, "cross-origin-embedder-policy"), isolationHeaders.coep);
    const observedHash = sha256(await response.body());
    assert.equal(observedHash, expectedHash, `Served product bytes changed: ${filename}`);
    assetPreflight.push({
      filename,
      sha256: observedHash,
      coop: responseHeader(headers, "cross-origin-opener-policy"),
      coep: responseHeader(headers, "cross-origin-embedder-policy"),
    });
  }

  const calibrationPage = await context.newPage();
  await calibrationPage.goto("about:blank");
  await calibrationPage.bringToFront();
  const calibrationResponse = await calibrationPage.goto(`${origin}/__clock-calibration`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  assert.equal(calibrationResponse?.status(), 200);
  const calibrationHeaders = calibrationResponse.headers();
  const calibrationHeaderValues = {
    coop: responseHeader(calibrationHeaders, "cross-origin-opener-policy"),
    coep: responseHeader(calibrationHeaders, "cross-origin-embedder-policy"),
  };
  const clock = await calibratePage(calibrationPage);
  clock.coop = calibrationHeaderValues.coop;
  clock.coep = calibrationHeaderValues.coep;
  validateClock(clock, calibrationHeaderValues, "Pre-registration isolated calibration");
  assert.match(await calibrationPage.locator("body").innerText(), /Clock calibration only/);
  assert.equal(await calibrationPage.evaluate(() => document.querySelector("script") === null), true);

  const inputLocks = {
    [archivePath]: archiveHash,
    [statusPath]: statusHash,
    ...sourceAndBuildHashes,
    [pilotManifestPath]: await hashFile(pilotManifestPath),
    [pilotVerifierPath]: pilotVerifierHash,
    ...pilotPageHashes,
    ...Object.fromEntries(Object.entries(compilerProofHashes)),
    [preparedExecutionProofPath]: preparedExecutionProofHash,
    [preparedLifecycleProofPath]: preparedLifecycleProofHash,
    [chromiumStorageDiagnosticPath]: chromiumStorageDiagnosticHash,
    ...chromiumStorageArtifactHashes,
    ...Object.fromEntries(Object.entries(chromiumStorageDiagnostic.bundledInputHashes)),
    ...verificationHashes,
    [protocolPath]: protocolHash,
    [timingConfigPath]: timingConfigHash,
    [basePreviewConfigPath]: basePreviewConfigHash,
    [collectorPath]: collectorHash,
    [analyzerPath]: analyzerHash,
    [verifierPath]: verifierHash,
    [schedulePath]: scheduleHash,
  };
  for (const [filename, expectedHash] of Object.entries(inputLocks)) {
    assert.equal(await hashFile(filename), expectedHash, `Frozen input changed before preregistration: ${filename}`);
  }

  preregistration = {
    schemaVersion: 1,
    study: "compiled-product-mixed-prepared-dirty-membership-confirmation",
    status: "FROZEN_BEFORE_CONFIRMATION",
    runId,
    frozenAt: new Date().toISOString(),
    archive: archivePath,
    archiveSha256: archiveHash,
    protocol: protocolPath,
    protocolSha256: protocolHash,
    schedule: productMixedSchedule,
    scheduleSource: { path: schedulePath, sha256: scheduleHash },
    candidate: {
      status: status.status,
      archivePath,
      archiveSha256: archiveHash,
      runtimeTests: status.runtimeTests,
      rustTests: status.rustTests,
      candidateProductionPilotPages: status.candidateProductionPilotPages,
    },
    sourceAndBuildSha256: sourceAndBuildHashes,
    productionSha256: productionHashes,
    proof: {
      pilotManifestPath,
      pilotManifestSha256: await hashFile(pilotManifestPath),
      native: pilotManifest.nativeProof,
      react: pilotManifest.reactProof,
      preparedNumericCellExecution: {
        path: preparedExecutionProofPath,
        sha256: preparedExecutionProofHash,
        status: preparedExecutionProof.status,
        preparedTokenCount: preparedExecutionProof.preparedNumericCellCut.preparedTokenCount,
        isCurrentCalls: preparedExecutionProof.preparedNumericCellCut.isCurrentCalls,
        executeCalls: preparedExecutionProof.preparedNumericCellCut.executeCalls,
        nonemptyPendingStateCaptureCalls: preparedExecutionProof.preparedNumericCellCut.nonemptyPendingStateCaptureCalls,
        legacySetColumnCellsCalls: preparedExecutionProof.preparedNumericCellCut.legacySetColumnCellsCalls,
        legacyExecuteSourceProgramCalls: preparedExecutionProof.preparedNumericCellCut.legacyExecuteSourceProgramCalls,
        inheritedAssertions: preparedExecutionProof.inheritedAssertions,
      },
      chromiumStorageDiagnostic: { path: chromiumStorageDiagnosticPath, sha256: chromiumStorageDiagnosticHash, status: chromiumStorageDiagnostic.status, attempt: chromiumStorageDiagnostic.attempt, sourcePath: chromiumStorageDiagnostic.sourcePath, sourceSha256: chromiumStorageDiagnostic.sourceSha256BeforeBundle, bundlePath: chromiumStorageDiagnostic.bundlePath, bundleSha256: chromiumStorageDiagnostic.bundleSha256, bundledInputHashes: chromiumStorageDiagnostic.bundledInputHashes, browserVersion: chromiumStorageDiagnostic.browserVersion, snapshots: chromiumStorageDiagnostic.snapshots, semantics: chromiumStorageDiagnostic.semantics },
      preparedNumericCellLifecycle: {
        path: preparedLifecycleProofPath,
        sha256: preparedLifecycleProofHash,
        status: preparedLifecycleProof.status,
        numericLaneReentry: preparedLifecycleProof.numericLaneReentry,
        promotion: preparedLifecycleProof.promotion,
        lifecycle: preparedLifecycleProof.lifecycle,
        hostFailure: preparedLifecycleProof.hostFailure,
      },
      compilerEmission: {
        files: compilerProofHashes,
        numericProgramDescriptors: 3,
        numericProgramBindings: 3,
        native: nativeCompilerProof,
        react: reactCompilerProof,
      },
      pilotPageHashes,
    },
    buildProofSha256: {
      ...verificationHashes,
    },
    collectorSha256: collectorHash,
    analyzer: { path: analyzerPath, sha256: analyzerHash },
    verifier: { path: verifierPath, sha256: verifierHash },
    pilotVerifier: { path: pilotVerifierPath, sha256: pilotVerifierHash },
    timingEnvironment: {
      configPath: timingConfigPath,
      configSha256: timingConfigHash,
      baseConfigPath: basePreviewConfigPath,
      baseConfigSha256: basePreviewConfigHash,
      origin,
      calibrationPath: "/__clock-calibration",
      coop: isolationHeaders.coop,
      coep: isolationHeaders.coep,
      crossOriginIsolated: clock.crossOriginIsolated,
      assetPreflight,
    },
    browser: {
      headless: false,
      gpu: false,
      viewport,
      freshContexts: true,
      serial: true,
      userAgent: clock.userAgent,
      isolationHeaders: calibrationHeaderValues,
    },
    clock,
    decision: {
      medianRatioMax: 0.8,
      medianSizesRequired: 2,
      p95RatioMax: 1.1,
      minDenominatorTicks,
      denominatorRule: "max(preregistration,reactPage,nativePage) * minDenominatorTicks",
      unresolvedWhen: "The React page median is below its paired denominator resolution floor.",
      noPageExclusions: true,
    },
    workload: {
      warmup: 60,
      frames: 240,
      topologyEvery: 30,
      removed: 8,
      inserted: 8,
      rotation: 13,
      measuredFrameNumbers: [61, 300],
      structuralFrames: 8,
      exactScheduleLength: 30,
      eachResultMustPassAllFiveChecks: true,
    },
    inputLocks,
    machine: {
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
      cpuModel: os.cpus()[0]?.model ?? null,
      logicalCpuCount: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
    },
    limits: [
      "The page load is the replication unit; frame samples are nested observations.",
      "Prepared dirty-membership execution and lifecycle artifacts establish correctness and API-path coverage only; no latency claim is made.",
      "COOP/COEP is a measurement-environment change applied equally to both arms; product source and build bytes are unchanged.",
      "This confirmation is not a causal comparison with historical checkpoints or an independent-device result.",
    ],
  };
  await writeJson(preregistrationPath, preregistration, "wx");
  await calibrationPage.close();
  await context.close();
  console.log(`FROZEN ${productMixedSchedule.length} pages; isolated clock ${clock.minPositiveDeltaMs} ms`);

  for (const scheduled of productMixedSchedule) {
    const filename = `${output}/sequence-${String(scheduled.sequence).padStart(2, "0")}.json`;
    const pageContext = await browser.newContext({ ignoreHTTPSErrors: true, viewport });
    const page = await pageContext.newPage();
    const browserErrors = [];
    const resourceResponses = [];
    const startedAt = new Date().toISOString();
    const pageRecord = {
      schemaVersion: 1,
      study: preregistration.study,
      runId,
      sequence: scheduled.sequence,
      schedule: scheduled,
      archiveSha256: archiveHash,
      protocolSha256: protocolHash,
      preregistrationSha256: await hashFile(preregistrationPath),
      startedAt,
      finishedAt: null,
      status: "INCOMPLETE",
      result: null,
      browserErrors,
      navigationHeaders: null,
      crossOriginIsolated: false,
      postDisposeClock: null,
    };
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("response", (response) => {
      const url = response.url();
      if (url.startsWith(origin) && /\.(html|js|css)(\?|$)/.test(url)) {
        resourceResponses.push((async () => {
          try {
            const body = await response.body();
            const headers = response.headers();
            return {
              url,
              status: response.status(),
              filename: `${buildDirectory}${new URL(url).pathname}`,
              sha256: sha256(body),
              coop: responseHeader(headers, "cross-origin-opener-policy"),
              coep: responseHeader(headers, "cross-origin-embedder-policy"),
            };
          } catch (error) {
            return { url, status: response.status(), error: String(error) };
          }
        })());
      }
    });

    try {
      await page.goto("about:blank");
      await page.bringToFront();
      const navigationResponse = await page.goto(
        `${origin}/product-mixed-v2.html?mode=confirm&sequence=${scheduled.sequence}`,
        { waitUntil: "domcontentloaded", timeout: 60_000 },
      );
      assert.equal(navigationResponse?.status(), 200);
      const navigationResponseHeaders = navigationResponse.headers();
      pageRecord.navigationHeaders = {
        coop: responseHeader(navigationResponseHeaders, "cross-origin-opener-policy"),
        coep: responseHeader(navigationResponseHeaders, "cross-origin-embedder-policy"),
      };
      assert.deepEqual(pageRecord.navigationHeaders, isolationHeaders);
      await page.bringToFront();
      await page.waitForFunction(() => window.__productMixed?.result() !== undefined, null, {
        timeout: 90_000,
      });
      pageRecord.result = await page.evaluate(() => window.__productMixed.result());
      await page.evaluate(() => window.__productMixed?.dispose());
      pageRecord.postDisposeClock = await calibratePage(page);
      pageRecord.postDisposeClock.coop = pageRecord.navigationHeaders.coop;
      pageRecord.postDisposeClock.coep = pageRecord.navigationHeaders.coep;
      pageRecord.crossOriginIsolated = pageRecord.postDisposeClock.crossOriginIsolated;
      validateClock(pageRecord.postDisposeClock, pageRecord.navigationHeaders, `Page ${scheduled.sequence}`);
      pageRecord.endVisibility = {
        state: pageRecord.postDisposeClock.visibility,
        focused: pageRecord.postDisposeClock.focused,
      };
      validateResult(pageRecord.result, scheduled, browserErrors);

      const loadedResources = await Promise.all(resourceResponses);
      pageRecord.loadedBuildResources = loadedResources;
      const loadedNames = new Set();
      for (const resource of loadedResources) {
        assert.equal(resource.status, 200);
        assert.ok(resource.filename in productionHashes, `Unexpected resource: ${resource.filename}`);
        assert.equal(resource.sha256, productionHashes[resource.filename]);
        assert.equal(resource.coop, isolationHeaders.coop);
        assert.equal(resource.coep, isolationHeaders.coep);
        loadedNames.add(path.basename(resource.filename));
      }
      const commonNames = [
        path.basename(`${buildDirectory}/product-mixed-v2.html`),
        ...Object.keys(productionHashes)
          .filter((name) => !/native_product_mixed_arm-|product_mixed_react_arm-/.test(name))
          .map((name) => path.basename(name)),
      ];
      for (const name of commonNames) assert(loadedNames.has(name), `Missing common resource: ${name}`);
      const selectedArm = scheduled.arm === "native"
        ? /^native_product_mixed_arm-/
        : /^product_mixed_react_arm-/;
      const oppositeArm = scheduled.arm === "native"
        ? /^product_mixed_react_arm-/
        : /^native_product_mixed_arm-/;
      assert([...loadedNames].some((name) => selectedArm.test(name)));
      assert(![...loadedNames].some((name) => oppositeArm.test(name)));
      pageRecord.status = "PASS";
    } catch (error) {
      pageRecord.status = "FAIL";
      pageRecord.failure = String(error?.stack ?? error);
      pageRecord.loadedBuildResources = await Promise.all(resourceResponses);
    } finally {
      pageRecord.finishedAt = new Date().toISOString();
      await writeJson(filename, pageRecord, "wx");
      pageRecords.push({
        sequence: scheduled.sequence,
        pair: scheduled.pair,
        arm: scheduled.arm,
        size: scheduled.size,
        status: pageRecord.status,
        file: filename,
        sha256: await hashFile(filename),
      });
      await writeJson(manifestPath, {
        schemaVersion: 1,
        study: preregistration.study,
        runId,
        preregistrationSha256: await hashFile(preregistrationPath),
        archiveSha256: archiveHash,
        status: "COLLECTING",
        files: pageRecords.map((record) => ({
          sequence: record.sequence,
          file: record.file,
          sha256: record.sha256,
        })),
        postCollectionChangedFiles: [],
        records: pageRecords,
        failedOrIncomplete: pageRecords.filter((record) => record.status !== "PASS"),
      });
      console.log(`PAGE ${scheduled.sequence + 1}/30 ${scheduled.arm}/${scheduled.size}: ${pageRecord.status}`);
      await pageContext.close();
    }
  }

  const postLockRecords = await Promise.all(Object.entries(inputLocks).map(async ([filename, expected]) => {
    try {
      const observed = await hashFile(filename);
      return { filename, expected, observed, matches: observed === expected };
    } catch (error) {
      return { filename, expected, observed: null, matches: false, error: String(error) };
    }
  }));
  const postLockMismatches = postLockRecords.filter((record) => !record.matches);
  const postCollectionChangedFiles = postLockMismatches.map((record) => record.filename);
  const postlock = {
    schemaVersion: 1,
    study: preregistration.study,
    runId,
    checkedAt: new Date().toISOString(),
    status: postLockMismatches.length === 0 ? "PASS" : "FAIL",
    records: postLockRecords,
    mismatches: postLockMismatches,
  };
  await writeJson(`${output}/postlock.json`, postlock, "wx");
  const everyPagePassed = pageRecords.length === productMixedSchedule.length &&
    pageRecords.every((record) => record.status === "PASS");
  const finalStatus = everyPagePassed && postLockMismatches.length === 0
    ? "COLLECTION_COMPLETE"
    : postLockMismatches.length > 0
    ? "COLLECTION_COMPLETE_LOCK_FAILED"
    : "COLLECTION_COMPLETE_WITH_FAILURES";
  const finalManifest = {
    schemaVersion: 1,
    study: preregistration.study,
    runId,
    status: finalStatus,
    preregistrationSha256: await hashFile(preregistrationPath),
    archiveSha256: archiveHash,
    files: pageRecords.map((record) => ({
      sequence: record.sequence,
      file: record.file,
      sha256: record.sha256,
    })),
    postCollectionChangedFiles,
    records: pageRecords,
    failedOrIncomplete: pageRecords.filter((record) => record.status !== "PASS"),
  };
  await writeJson(manifestPath, finalManifest);
  await writeJson(finalResultsPath, {
    schemaVersion: 1,
    study: preregistration.study,
    runId,
    finalizedAt: new Date().toISOString(),
    status: finalStatus === "COLLECTION_COMPLETE" ? "PASS" : "FAIL",
    records: pageRecords,
    postlock: { path: "postlock.json", status: postlock.status, mismatches: postLockMismatches },
    interpretation:
      "Named candidate confirmation under the preregistered isolated timing environment; no historical causal claim.",
    decision: preregistration.decision,
  }, "wx");
  if (finalStatus !== "COLLECTION_COMPLETE") process.exitCode = 1;
} finally {
  await context.close().catch(() => {});
  await browser.close();
}
