/** Run and verify the six-page production correctness pilot. This is not timing evidence. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { openBrowser } from "vitexec/cli";

const origin = "https://owner-row-fusion-pilot.localhost:1355";
const output = "results/product-mixed-owner-row-fusion-pilot";
const checkpoint = "implementation/2026-10-13-owner-row-fusion";
const statusPath = `${checkpoint}/status.json`;
const archivePath = `${checkpoint}/source-and-evidence.tar.gz`;
const chromiumDiagnosticPath = "results/numeric-cell-storage-candidate-v5/diagnostic.json";
const viewport = { width: 1200, height: 900 };
const isolationHeaders = { coop: "same-origin", coep: "require-corp" };
const compilerDirectory = ".cache/product-mixed-compiled-owner-row-fusion/compiler-proof";
const compilerProofPaths = {
  native: `${compilerDirectory}/native.json`,
  react: `${compilerDirectory}/react.json`,
};
const authoredOwnerRowProofPath = ".cache/compiled-owner-proof/compiled-owner-row-proof-1791897220716-45399-148948e4-9717-4af7-ac7e-6677cfe15b7c.json";
const actualThreeOwnerRowProofPath = ".cache/compiled-owner-three-proof/compiled-three-owner-row-proof-1791897229482-45665-848b1a2a-3e3c-438f-a452-ee013892c29e.json";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = async (filename) => JSON.parse(await readFile(filename, "utf8"));

const statusBytes = await readFile(statusPath);
const status = JSON.parse(statusBytes.toString("utf8"));
const statusSha256 = sha(statusBytes);
assert.equal(status.schemaVersion, 2);
assert.equal(status.status, "UNIT_AUTHORED_THREE_AND_PRODUCTION_BUILD_VERIFIED");
assert.equal(status.qualifiedProductionBuild, "dist-product-mixed-compiled-owner-row-fusion");
assert.equal(status.qualifiedCompilerProofDirectory, compilerDirectory);
assert.equal(status.qualifiedEngineDiagnostic, chromiumDiagnosticPath);
assert.equal(status.runtimeTests, 695);
assert.equal(status.rustTests, 33);
assert.equal(status.candidateProductionPilotPages, 0, "Frozen source checkpoint must remain pre-pilot");
assert.equal(status.archiveSha256, "cbe4ce3f557314fa093ac51214a2ba5e9cf0a5f0ad67b5429ce3a95a5e59a382");
assert.equal(sha(await readFile(archivePath)), status.archiveSha256, "Frozen source archive checksum mismatch");
assert.equal(Object.keys(status.sourceAndBuildSha256).length, 1004);
assert.equal(Object.keys(status.verificationSha256).length, 25);
assert.equal(Object.keys(status.historicalVerificationSha256).length, 64);
assert.equal(status.archiveMembers, 1093);
for (const [filename, expectedHash] of Object.entries(status.sourceAndBuildSha256)) {
  assert.equal(sha(await readFile(filename)), expectedHash, `Frozen source/build input changed: ${filename}`);
}
for (const [filename, expectedHash] of Object.entries(status.verificationSha256)) {
  assert.equal(sha(await readFile(filename)), expectedHash, `Current verification input changed: ${filename}`);
}
for (const [filename, expectedHash] of Object.entries(status.historicalVerificationSha256)) {
  assert.equal(sha(await readFile(filename)), expectedHash, `Historical verification input changed: ${filename}`);
}
const productionSha256 = Object.fromEntries(Object.entries(status.sourceAndBuildSha256)
  .filter(([filename]) => filename.startsWith("dist-product-mixed-compiled-owner-row-fusion/")));
assert.equal(Object.keys(productionSha256).length, 5, "Expected five frozen production assets");
for (const [filename, expectedHash] of Object.entries(productionSha256)) {
  assert.equal(sha(await readFile(filename)), expectedHash, `Frozen production asset changed: ${filename}`);
}
const chromiumDiagnostic = await readJson(chromiumDiagnosticPath);
assert.equal(chromiumDiagnostic.status, "PASS");
assert.equal(chromiumDiagnostic.attempt, "v5");
const chromiumDiagnosticHash = sha(await readFile(chromiumDiagnosticPath));
assert.equal(status.historicalVerificationSha256[chromiumDiagnosticPath], chromiumDiagnosticHash,
  "Frozen checkpoint does not bind the v5 engine diagnostic");
assert.deepEqual(chromiumDiagnostic.bundledInputHashes, chromiumDiagnostic.bundledInputHashesAfterBundle);
assert.equal(Object.keys(chromiumDiagnostic.bundledInputHashes).length, 6,
  "The reused World diagnostic is valid only with all six byte-identical bundled inputs");
for (const [filename, expectedHash] of Object.entries(chromiumDiagnostic.bundledInputHashes)) {
  assert.equal(sha(await readFile(filename)), expectedHash, `Reused World diagnostic input changed: ${filename}`);
}
assert.equal(chromiumDiagnostic.sourceSha256BeforeBundle, chromiumDiagnostic.sourceSha256AfterBundle);
assert.equal(chromiumDiagnostic.bundleSha256, sha(await readFile(chromiumDiagnostic.bundlePath)));
const expectedEngineEpoch = {
  product: chromiumDiagnostic.browserVersion.product,
  jsVersion: chromiumDiagnostic.browserVersion.jsVersion,
  revision: chromiumDiagnostic.browserVersion.revision,
};
assert.ok(expectedEngineEpoch.product && expectedEngineEpoch.jsVersion && expectedEngineEpoch.revision);
const nativeProof = await readJson(compilerProofPaths.native);
const reactProof = await readJson(compilerProofPaths.react);
const authoredOwnerRowProof = await readJson(authoredOwnerRowProofPath);
const actualThreeOwnerRowProof = await readJson(actualThreeOwnerRowProofPath);
assert.equal(nativeProof.arm, "native");
assert.equal(nativeProof.compiled, true);
assert.equal(nativeProof.bindings, 3);
assert.equal(nativeProof.deltas, true);
assert.equal(nativeProof.propOnly, true);
assert.equal(nativeProof.deltaFallback, false);
const ownerRow = nativeProof.ownerRow;
assert.ok(ownerRow, "Missing v2 ownerRow compiler metadata");
assert.equal(ownerRow.matchesOwnerProgram, true);
assert.equal(ownerRow.denseSlots, true);
assert.equal(ownerRow.validDescriptors, true);
assert.equal(ownerRow.validBindings, true);
const ownerProgramId = "src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow";
const slots = [0, 1, 2].map((slot) => ({ siteId: `${ownerProgramId}#state:${slot}`, slot }));
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
assert.deepEqual(reactProof, { arm: "react", compiled: true, rowMemoCache: true, boardMemoCache: true });
assert.equal(status.verificationSha256[authoredOwnerRowProofPath], sha(await readFile(authoredOwnerRowProofPath)));
assert.equal(authoredOwnerRowProof.status, "PASS");
assert.equal(authoredOwnerRowProof.ownerRowPrograms.preparedProgramCount, 2);
assert.deepEqual(authoredOwnerRowProof.ownerRowPrograms.sparseAndDenseCalls.map(({ count }) => count), [1, 6]);
assert.equal(authoredOwnerRowProof.ownerRowPrograms.legacyPreparedCellCalls, 0);
assert.equal(authoredOwnerRowProof.ownerRowPrograms.legacyPreparedCellExecutions, 0);
assert.equal(authoredOwnerRowProof.ownerRowPrograms.legacySetColumnCellsCalls, 0);
assert.equal(authoredOwnerRowProof.ownerRowPrograms.legacySetColumnRowsCalls, 0);
assert.equal(authoredOwnerRowProof.ownerRowPrograms.sourceProgramCalls, 0);
assert.equal(authoredOwnerRowProof.ownerRowPrograms.eligibleNonemptyPendingCaptureCalls, 0);
assert.equal(authoredOwnerRowProof.assertions.candidateValidAfterPrivateRenderWrite, false);
for (const [key, value] of Object.entries(authoredOwnerRowProof.assertions)) {
  if (key === "candidateValidAfterPrivateRenderWrite") continue;
  assert.equal(value, true, `Authored owner-row assertion failed: ${key}`);
}
assert.equal(status.verificationSha256[actualThreeOwnerRowProofPath], sha(await readFile(actualThreeOwnerRowProofPath)));
assert.equal(actualThreeOwnerRowProof.status, "PASS");
assert.equal(actualThreeOwnerRowProof.numericOwnerRowCut.batches, 240);
assert.equal(actualThreeOwnerRowProof.numericOwnerRowCut.cellsPerBatch, 5);
assert.equal(actualThreeOwnerRowProof.numericOwnerRowCut.preparedRowProgramCount, 1);
assert.equal(actualThreeOwnerRowProof.numericOwnerRowCut.eligibleNonemptyPendingCaptureCalls, 0);
assert.equal(actualThreeOwnerRowProof.numericOwnerRowCut.legacyPreparedCellCalls, 0);
assert.equal(actualThreeOwnerRowProof.numericOwnerRowCut.legacyPreparedCellExecutions, 0);
assert.equal(actualThreeOwnerRowProof.numericOwnerRowCut.legacySetColumnCellsCalls, 0);
assert.equal(actualThreeOwnerRowProof.numericOwnerRowCut.legacySetColumnRowsCalls, 0);
assert.equal(actualThreeOwnerRowProof.numericOwnerRowCut.genericSourceProgramCalls, 0);
assert.ok(Object.values(actualThreeOwnerRowProof.assertions).every((value) => value === true));

const compilerProofs = {};
for (const [arm, filename] of Object.entries(compilerProofPaths)) {
  const bytes = await readFile(filename);
  compilerProofs[arm] = { path: filename, sha256: sha(bytes) };
}
const authoredBytes = await readFile(authoredOwnerRowProofPath);
const threeBytes = await readFile(actualThreeOwnerRowProofPath);
await mkdir(output, { recursive: true });
assert.equal((await readdir(output)).length, 0, "Refusing to overwrite pilot evidence");
const browser = await openBrowser({ headless: false, gpu: false });
const records = [];
const pageFiles = [];
try {
  const preflightContext = await browser.newContext({ ignoreHTTPSErrors: true, viewport });
  const servedAssetSha256 = {};
  const assetPreflight = [];
  for (const [filename, expectedHash] of Object.entries(productionSha256)) {
    const publicPath = filename.slice("dist-product-mixed-compiled-owner-row-fusion/".length);
    const response = await preflightContext.request.get(`${origin}/${publicPath}`);
    assert.equal(response.status(), 200, `Production asset unavailable: ${filename}`);
    const headers = response.headers();
    const coop = headers["cross-origin-opener-policy"] ?? headers["Cross-Origin-Opener-Policy"];
    const coep = headers["cross-origin-embedder-policy"] ?? headers["Cross-Origin-Embedder-Policy"];
    assert.equal(coop, isolationHeaders.coop, `COOP mismatch for ${filename}`);
    assert.equal(coep, isolationHeaders.coep, `COEP mismatch for ${filename}`);
    const observedHash = sha(await response.body());
    assert.equal(observedHash, expectedHash, `Served production bytes changed: ${filename}`);
    servedAssetSha256[filename] = observedHash;
    assetPreflight.push({ filename, sha256: observedHash, status: response.status(), coop, coep });
  }
  assert.deepEqual(servedAssetSha256, productionSha256);
  const enginePage = await preflightContext.newPage();
  const engineSession = await preflightContext.newCDPSession(enginePage);
  const version = await engineSession.send("Browser.getVersion");
  const engineEpoch = {
    product: version.product,
    jsVersion: version.jsVersion,
    revision: version.revision,
  };
  assert.deepEqual(engineEpoch, expectedEngineEpoch, "Pilot Chromium engine differs from the v5 diagnostic");
  await engineSession.detach();
  await enginePage.close();
  await preflightContext.close();

  for (const size of [128, 512, 1024]) {
    for (const arm of ["native", "react"]) {
      const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${origin}/product-mixed-v2.html?mode=pilot&arm=${arm}&size=${size}`, { waitUntil: "domcontentloaded" });
      await page.bringToFront();
      await page.waitForFunction(() => window.__productMixed?.result(), null, { timeout: 20000 });
      const record = await page.evaluate(() => window.__productMixed.result());
      const pageEnvironment = await page.evaluate(() => ({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      }));
      const pagePath = `${output}/${arm}-${size}.json`;
      const pageBytes = Buffer.from(JSON.stringify({
        ...record,
        browserErrors: errors,
        productionSha256,
        servedAssetSha256,
        engineEpoch,
        browser: pageEnvironment,
      }, null, 2) + "\n");
      await writeFile(pagePath, pageBytes, { flag: "wx" });
      assert.deepEqual(errors, []);
      assert.equal(record.status, "PASS", `${arm}/${size}: ${JSON.stringify(record.errors)}`);
      assert.equal(record.production, true);
      assert.deepEqual(pageEnvironment.viewport, viewport);
      assert.equal(pageEnvironment.userAgent, record.userAgent);
      assert.equal(record.mode, "pilot");
      assert.equal(record.arm, arm);
      assert.equal(record.size, size);
      assert.equal(record.frames, 60);
      assert.equal(record.samples.length, 60);
      assert.deepEqual(record.samples.map(({ frame }) => frame), Array.from({ length: 60 }, (_, index) => index + 6));
      assert.deepEqual(record.samples.filter(({ structural }) => structural).map(({ frame }) => frame), [35, 65]);
      assert.deepEqual(Object.keys(record.checks).sort(), ["identity", "lifecycle", "order", "output", "visible"]);
      assert.deepEqual(Object.values(record.checks), [true, true, true, true, true]);
      assert.deepEqual(record.errors, []);
      assert.equal(record.active.mounts, size + 16);
      assert.equal(record.active.cleanups, 16);
      assert.equal(record.after.writers, 0);
      assert.equal(record.after.mounts, record.after.cleanups);
      assert.equal(record.after.mounts, size + 16);
      if (arm === "native") {
        assert.equal(record.after.extra.root.ownerCount, 0);
        assert.equal(record.after.extra.root.disposed, true);
        assert.equal(record.after.extra.collection.readerCount, 0);
        assert.equal(record.after.extra.collection.retainedBatches, 0);
      }
      records.push({ arm, size, status: record.status });
      pageFiles.push({ arm, size, file: `${arm}-${size}.json`, sha256: sha(pageBytes) });
      console.log(`PASS pilot ${arm}/${size}: output/order/identity/lifecycle/teardown`);
      await context.close();
    }
  }
  const expectedRecords = [128, 512, 1024].flatMap((size) => ["native", "react"].map((arm) => ({ arm, size, status: "PASS" })));
  assert.deepEqual(records, expectedRecords);
  assert.deepEqual(await readFile(statusPath), statusBytes, "Frozen checkpoint status changed during pilot");
  assert.equal(sha(await readFile(archivePath)), status.archiveSha256, "Frozen source archive changed during pilot");
  for (const [filename, expectedHash] of Object.entries(status.sourceAndBuildSha256)) {
    assert.equal(sha(await readFile(filename)), expectedHash, `Frozen source/build input changed during pilot: ${filename}`);
  }
  for (const [filename, expectedHash] of Object.entries(status.verificationSha256)) {
    assert.equal(sha(await readFile(filename)), expectedHash, `Current verification input changed during pilot: ${filename}`);
  }
  for (const [filename, expectedHash] of Object.entries(status.historicalVerificationSha256)) {
    assert.equal(sha(await readFile(filename)), expectedHash, `Historical verification input changed during pilot: ${filename}`);
  }
const manifest = {
  status: "PASS",
  scope: "Correctness pilot only; no confirmatory performance evidence",
  checkpoint: {
    statusPath,
    statusSha256,
    status: status.status,
    runtimeTests: status.runtimeTests,
    rustTests: status.rustTests,
    sourceAndBuildCount: Object.keys(status.sourceAndBuildSha256).length,
    currentVerificationCount: Object.keys(status.verificationSha256).length,
    historicalVerificationCount: Object.keys(status.historicalVerificationSha256).length,
    archiveMembers: status.archiveMembers,
    candidateProductionPilotPages: status.candidateProductionPilotPages,
  },
  records,
  pageFiles,
  nativeProof,
  reactProof,
  sourceArchive: { path: archivePath, sha256: status.archiveSha256 },
  currentVerificationInputs: status.verificationSha256,
  historicalVerificationInputs: status.historicalVerificationSha256,
    productionSha256,
    servedAssetSha256,
    assetPreflight,
    engineEpoch,
    compilerProofs,
    authoredOwnerRowProof: {
      path: authoredOwnerRowProofPath,
      sha256: sha(authoredBytes),
      assertions: authoredOwnerRowProof.assertions,
    },
    actualThreeOwnerRowProof: {
      path: actualThreeOwnerRowProofPath,
      sha256: sha(threeBytes),
      assertions: actualThreeOwnerRowProof.assertions,
    },
    chromiumDiagnostic: { path: chromiumDiagnosticPath, sha256: chromiumDiagnosticHash, engineEpoch: expectedEngineEpoch },
  };
  await writeFile(`${output}/results.json`, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
} finally {
  await browser.close();
}
