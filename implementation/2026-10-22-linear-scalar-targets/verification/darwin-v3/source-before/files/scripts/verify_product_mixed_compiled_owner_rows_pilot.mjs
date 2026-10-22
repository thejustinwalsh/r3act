/** Run and verify the six-page production correctness pilot. This is not timing evidence. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { openBrowser } from "vitexec/cli";

const origin = process.env.PRODUCT_MIXED_ORIGIN ?? "https://compiled-owner-rows-pilot.localhost:1355";
const output = process.env.PRODUCT_MIXED_PILOT_DIR ?? "results/product-mixed-compiled-owner-rows-pilot";
const checkpoint = "implementation/2026-10-13-compiled-owner-rows";
const statusPath = `${checkpoint}/status.json`;
const archivePath = `${checkpoint}/source-and-evidence.tar.gz`;
const chromiumDiagnosticPath = "results/numeric-cell-storage-candidate-v5/diagnostic.json";
const viewport = { width: 1200, height: 900 };
const isolationHeaders = { coop: "same-origin", coep: "require-corp" };
const compilerDirectory = ".cache/product-mixed-compiled-owner-rows/compiler-proof";
const compilerProofPaths = {
  native: `${compilerDirectory}/native.json`,
  react: `${compilerDirectory}/react.json`,
};
const authoredOwnerRowProofPath = ".cache/compiled-owner-proof/compiled-owner-row-proof-1791891092204-6101-de502448-3663-461a-aac8-23ad74563e33.json";
const actualThreeOwnerRowProofPath = ".cache/compiled-owner-three-proof/compiled-three-owner-row-proof-1791891101523-6304-3e133077-e20e-4579-8bf2-87ebc5a2dd70.json";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = async (filename) => JSON.parse(await readFile(filename, "utf8"));

const status = await readJson(statusPath);
assert.equal(status.status, "UNIT_AUTHORED_COMPILER_THREE_AND_CHROMIUM_VERIFIED");
assert.equal(status.candidateProductionPilotPages, 0, "Frozen source checkpoint must remain pre-pilot");
assert.equal(status.archiveSha256, "4aabe8b6cb3168aae50ba8474464452494d790aac60b472611fc20f54ec7a08c");
assert.equal(sha(await readFile(archivePath)), status.archiveSha256, "Frozen source archive checksum mismatch");
const productionSha256 = Object.fromEntries(Object.entries(status.sourceAndBuildSha256)
  .filter(([filename]) => filename.startsWith("dist-product-mixed-compiled-owner-rows/")));
assert.equal(Object.keys(productionSha256).length, 5, "Expected five frozen production assets");
for (const [filename, expectedHash] of Object.entries(productionSha256)) {
  assert.equal(sha(await readFile(filename)), expectedHash, `Frozen production asset changed: ${filename}`);
}
const chromiumDiagnostic = await readJson(chromiumDiagnosticPath);
assert.equal(chromiumDiagnostic.status, "PASS");
assert.equal(chromiumDiagnostic.attempt, "v5");
const chromiumDiagnosticHash = sha(await readFile(chromiumDiagnosticPath));
assert.equal(status.verificationSha256[chromiumDiagnosticPath], chromiumDiagnosticHash,
  "Frozen checkpoint does not bind the v5 engine diagnostic");
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
assert.equal(authoredOwnerRowProof.status, "PASS");
assert.equal(authoredOwnerRowProof.ownerRowPrograms.preparedProgramCount, 2);
assert.deepEqual(authoredOwnerRowProof.ownerRowPrograms.sparseAndDenseCalls.map(({ count }) => count), [1, 6]);
assert.equal(actualThreeOwnerRowProof.status, "PASS");
assert.equal(actualThreeOwnerRowProof.numericOwnerRowCut.batches, 240);
assert.equal(actualThreeOwnerRowProof.numericOwnerRowCut.cellsPerBatch, 5);
assert.equal(actualThreeOwnerRowProof.numericOwnerRowCut.preparedRowProgramCount, 1);

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
    const publicPath = filename.slice("dist-product-mixed-compiled-owner-rows/".length);
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
  const manifest = {
    status: "PASS",
    scope: "Correctness pilot only; no confirmatory performance evidence",
    records,
    pageFiles,
    nativeProof,
    reactProof,
    sourceArchive: { path: archivePath, sha256: status.archiveSha256 },
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
