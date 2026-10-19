/** Independently verify the frozen owner-row-fusion production correctness pilot. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const checkpointDirectory = "implementation/2026-10-13-owner-row-fusion";
const statusPath = `${checkpointDirectory}/status.json`;
const archivePath = `${checkpointDirectory}/source-and-evidence.tar.gz`;
const expectedArchiveSha256 = "cbe4ce3f557314fa093ac51214a2ba5e9cf0a5f0ad67b5429ce3a95a5e59a382";
const pilotDirectory = "results/product-mixed-owner-row-fusion-pilot";
const diagnosticPath = "results/numeric-cell-storage-candidate-v5/diagnostic.json";
const compilerDirectory = ".cache/product-mixed-compiled-owner-row-fusion/compiler-proof";
const compilerProofPaths = {
  native: `${compilerDirectory}/native.json`,
  react: `${compilerDirectory}/react.json`,
};
const authoredProofPath = ".cache/compiled-owner-proof/compiled-owner-row-proof-1791897220716-45399-148948e4-9717-4af7-ac7e-6677cfe15b7c.json";
const threeProofPath = ".cache/compiled-owner-three-proof/compiled-three-owner-row-proof-1791897229482-45665-848b1a2a-3e3c-438f-a452-ee013892c29e.json";
const outputPath = `${pilotDirectory}/verification.json`;
const verifierPath = "scripts/verify_product_mixed_owner_row_fusion_pilot_evidence.mjs";
const expectedProductionDirectory = "dist-product-mixed-compiled-owner-row-fusion";
const expectedArchiveMemberCount = 1093;
const expectedEngineAttempt = "v5";
const expectedViewport = { width: 1200, height: 900 };
const isolationHeaders = { coop: "same-origin", coep: "require-corp" };
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = async (filename) => JSON.parse(await readFile(filename, "utf8"));
const hashFile = async (filename) => sha(await readFile(filename));

function tarMemberHashes(filename) {
  const script = `import hashlib,json,sys,tarfile
members={}
with tarfile.open(sys.argv[1], "r:gz") as archive:
    for member in archive:
        stream=archive.extractfile(member)
        if stream is None: raise RuntimeError("Unreadable or non-file archive member: "+member.name)
        digest=hashlib.sha256()
        while True:
            chunk=stream.read(1024*1024)
            if not chunk: break
            digest.update(chunk)
        stream.close()
        if member.name in members: raise RuntimeError("Duplicate archive member: "+member.name)
        members[member.name]=digest.hexdigest()
print(json.dumps(members,sort_keys=True))`;
  return JSON.parse(execFileSync("python3", ["-c", script, filename], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }));
}

const statusBytes = await readFile(statusPath);
const status = JSON.parse(statusBytes.toString("utf8"));
const statusSha256 = sha(statusBytes);
assert.equal(status.schemaVersion, 2);
assert.equal(status.status, "UNIT_AUTHORED_THREE_AND_PRODUCTION_BUILD_VERIFIED");
assert.equal(status.qualifiedProductionBuild, expectedProductionDirectory);
assert.equal(status.qualifiedCompilerProofDirectory, compilerDirectory);
assert.equal(status.qualifiedEngineDiagnostic, diagnosticPath);
assert.equal(status.runtimeTests, 695);
assert.equal(status.rustTests, 33);
assert.equal(status.candidateProductionPilotPages, 0, "The frozen checkpoint stays pre-pilot");
assert.equal(status.archive, "source-and-evidence.tar.gz");
assert.equal(status.archiveSha256, expectedArchiveSha256);
assert.equal(status.archiveMembers, expectedArchiveMemberCount);
assert.equal(await hashFile(archivePath), expectedArchiveSha256);

const sourceBuild = status.sourceAndBuildSha256;
const currentVerification = status.verificationSha256;
const historicalVerification = status.historicalVerificationSha256;
assert.equal(Object.keys(sourceBuild).length, 1004);
assert.equal(Object.keys(currentVerification).length, 25);
assert.equal(Object.keys(historicalVerification).length, 64);
const expectedArchivePaths = [...new Set([
  ...Object.keys(sourceBuild),
  ...Object.keys(currentVerification),
  ...Object.keys(historicalVerification),
])].sort();
assert.equal(expectedArchivePaths.length, expectedArchiveMemberCount);
const archivedMembers = tarMemberHashes(archivePath);
assert.deepEqual(Object.keys(archivedMembers).sort(), expectedArchivePaths,
  "Frozen source archive membership must equal current plus historical checkpoint inventories");
for (const [filename, expected] of Object.entries(sourceBuild)) {
  assert.equal(archivedMembers[filename], expected, `Archived source/build bytes: ${filename}`);
  assert.equal(await hashFile(filename), expected, `Current source/build hash: ${filename}`);
}
for (const [filename, expected] of Object.entries(currentVerification)) {
  assert.equal(archivedMembers[filename], expected, `Archived current verification bytes: ${filename}`);
  assert.equal(await hashFile(filename), expected, `Current verification hash: ${filename}`);
}
for (const [filename, expected] of Object.entries(historicalVerification)) {
  assert.equal(archivedMembers[filename], expected, `Archived historical verification bytes: ${filename}`);
  assert.equal(await hashFile(filename), expected, `Historical verification hash: ${filename}`);
}

const productionSha256 = Object.fromEntries(Object.entries(sourceBuild)
  .filter(([filename]) => filename.startsWith(`${expectedProductionDirectory}/`)));
assert.equal(Object.keys(productionSha256).length, 5);
for (const [filename, expected] of Object.entries(productionSha256)) {
  assert.equal(await hashFile(filename), expected, `Frozen production asset changed: ${filename}`);
}

const diagnostic = await readJson(diagnosticPath);
assert.equal(diagnostic.status, "PASS");
assert.equal(diagnostic.attempt, expectedEngineAttempt);
assert.equal(historicalVerification[diagnosticPath], await hashFile(diagnosticPath),
  "The reused v5 diagnostic is a historical verification artifact in this checkpoint");
assert.deepEqual(diagnostic.bundledInputHashes, diagnostic.bundledInputHashesAfterBundle,
  "The reused World diagnostic must prove byte-identical bundle inputs");
assert.equal(Object.keys(diagnostic.bundledInputHashes).length, 6);
for (const [filename, expected] of Object.entries(diagnostic.bundledInputHashes)) {
  const frozenExpected = sourceBuild[filename] ?? currentVerification[filename] ?? historicalVerification[filename];
  assert.equal(frozenExpected, expected, `World diagnostic input is not byte-bound by the checkpoint: ${filename}`);
  assert.equal(await hashFile(filename), expected, `Reused World diagnostic input changed: ${filename}`);
}
assert.equal(diagnostic.sourceSha256BeforeBundle, diagnostic.sourceSha256AfterBundle);
assert.equal(diagnostic.sourceSha256AfterBundle, sourceBuild[diagnostic.sourcePath]);
assert.equal(diagnostic.bundleSha256, historicalVerification[diagnostic.bundlePath]);
assert.equal(await hashFile(diagnostic.bundlePath), diagnostic.bundleSha256);
const engineEpoch = {
  product: diagnostic.browserVersion.product,
  jsVersion: diagnostic.browserVersion.jsVersion,
  revision: diagnostic.browserVersion.revision,
};
assert.ok(engineEpoch.product && engineEpoch.jsVersion && engineEpoch.revision);

const compilerProofs = {};
for (const [arm, filename] of Object.entries(compilerProofPaths)) {
  const proof = await readJson(filename);
  assert.equal(sourceBuild[filename], await hashFile(filename));
  compilerProofs[arm] = { path: filename, sha256: sourceBuild[filename] };
  if (arm === "native") {
    assert.equal(proof.arm, "native");
    assert.equal(proof.compiled, true);
    assert.equal(proof.bindings, 3);
    assert.equal(proof.deltas, true);
    assert.equal(proof.propOnly, true);
    assert.equal(proof.deltaFallback, false);
    const ownerRow = proof.ownerRow;
    assert.ok(ownerRow);
    assert.equal(ownerRow.matchesOwnerProgram, true);
    assert.equal(ownerRow.denseSlots, true);
    assert.equal(ownerRow.validDescriptors, true);
    assert.equal(ownerRow.validBindings, true);
    const programId = "src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow";
    const slots = [0, 1, 2].map((slot) => ({ siteId: `${programId}#state:${slot}`, slot }));
    assert.equal(ownerRow.ownerProgramId, programId);
    assert.equal(ownerRow.stateLayoutProgramId, programId);
    assert.deepEqual(ownerRow.slots, slots);
    assert.deepEqual(ownerRow.bindings, slots.map(({ siteId }, programIndex) => ({ siteId, programIndex })));
    assert.equal(ownerRow.numericDescriptors.length, 3);
    assert.equal(new Set(ownerRow.numericDescriptors.map(({ sinkId }) => sinkId)).size, 3);
    for (const [index, descriptor] of ownerRow.numericDescriptors.entries()) {
      assert.equal(descriptor.schemaVersion, 2);
      assert.equal(descriptor.ownerProgramId, programId);
      assert.ok(descriptor.sinkId.length > 0);
      assert.deepEqual(descriptor.sourceSites, [slots[index].siteId]);
    }
  } else {
    assert.deepEqual(proof, { arm: "react", compiled: true, rowMemoCache: true, boardMemoCache: true });
  }
}

const authoredProof = await readJson(authoredProofPath);
const threeProof = await readJson(threeProofPath);
assert.equal(currentVerification[authoredProofPath], await hashFile(authoredProofPath));
assert.equal(currentVerification[threeProofPath], await hashFile(threeProofPath));
assert.equal(authoredProof.status, "PASS");
assert.equal(authoredProof.ownerRowPrograms.preparedProgramCount, 2);
assert.deepEqual(authoredProof.ownerRowPrograms.sparseAndDenseCalls.map(({ count }) => count), [1, 6]);
for (const [key, value] of Object.entries(authoredProof.assertions)) {
  assert.equal(value, key === "candidateValidAfterPrivateRenderWrite" ? false : true,
    `Authored owner-row proof assertion ${key}`);
}
assert.equal(authoredProof.ownerRowPrograms.legacyPreparedCellCalls, 0);
assert.equal(authoredProof.ownerRowPrograms.legacyPreparedCellExecutions, 0);
assert.equal(authoredProof.ownerRowPrograms.legacySetColumnCellsCalls, 0);
assert.equal(authoredProof.ownerRowPrograms.legacySetColumnRowsCalls, 0);
assert.equal(authoredProof.ownerRowPrograms.sourceProgramCalls, 0);
assert.equal(authoredProof.ownerRowPrograms.eligibleNonemptyPendingCaptureCalls, 0);
assert.equal(threeProof.status, "PASS");
assert.equal(threeProof.numericOwnerRowCut.batches, 240);
assert.equal(threeProof.numericOwnerRowCut.cellsPerBatch, 5);
assert.equal(threeProof.numericOwnerRowCut.preparedRowProgramCount, 1);
assert.equal(threeProof.numericOwnerRowCut.eligibleNonemptyPendingCaptureCalls, 0);
assert.equal(threeProof.numericOwnerRowCut.legacyPreparedCellCalls, 0);
assert.equal(threeProof.numericOwnerRowCut.legacyPreparedCellExecutions, 0);
assert.equal(threeProof.numericOwnerRowCut.legacySetColumnCellsCalls, 0);
assert.equal(threeProof.numericOwnerRowCut.legacySetColumnRowsCalls, 0);
assert.equal(threeProof.numericOwnerRowCut.genericSourceProgramCalls, 0);
assert.ok(Object.values(threeProof.assertions).every((value) => value === true));
assert.deepEqual(threeProof.threeObjectIdentity, {
  componentRenders: 1,
  positionVectorStable: true,
  rotationEulerStable: true,
  geometryStable: true,
  materialStable: true,
  geometryDisposals: 1,
  materialDisposals: 1,
  diagnostics: {
    createdResources: 2,
    disposedResources: 2,
    liveResources: 0,
    liveHandles: 0,
    eventRegistrations: 0,
  },
});

const outputFiles = await readdir(pilotDirectory);
const expectedPageFiles = [128, 512, 1024].flatMap((size) => [
  `native-${size}.json`,
  `react-${size}.json`,
]);
const expectedFiles = [...expectedPageFiles, "results.json"];
assert.deepEqual(outputFiles.filter((name) => name !== "verification.json").sort(), expectedFiles.slice().sort(),
  "Pilot directory must contain exactly six pages and the manifest");
const manifest = await readJson(`${pilotDirectory}/results.json`);
assert.equal(manifest.status, "PASS");
assert.deepEqual(manifest.checkpoint, {
  statusPath,
  statusSha256,
  status: status.status,
  runtimeTests: status.runtimeTests,
  rustTests: status.rustTests,
  sourceAndBuildCount: Object.keys(sourceBuild).length,
  currentVerificationCount: Object.keys(currentVerification).length,
  historicalVerificationCount: Object.keys(historicalVerification).length,
  archiveMembers: status.archiveMembers,
  candidateProductionPilotPages: status.candidateProductionPilotPages,
});
assert.deepEqual(manifest.currentVerificationInputs, currentVerification);
assert.deepEqual(manifest.historicalVerificationInputs, historicalVerification);
assert.deepEqual(manifest.scope, "Correctness pilot only; no confirmatory performance evidence");
assert.deepEqual(manifest.sourceArchive, { path: archivePath, sha256: expectedArchiveSha256 });
assert.deepEqual(manifest.productionSha256, productionSha256);
assert.deepEqual(manifest.servedAssetSha256, productionSha256);
assert.deepEqual(manifest.engineEpoch, engineEpoch);
assert.deepEqual(manifest.nativeProof, await readJson(compilerProofPaths.native));
assert.deepEqual(manifest.reactProof, await readJson(compilerProofPaths.react));
assert.deepEqual(manifest.compilerProofs, compilerProofs);
assert.deepEqual(manifest.chromiumDiagnostic, {
  path: diagnosticPath,
  sha256: historicalVerification[diagnosticPath],
  engineEpoch,
});
assert.deepEqual(manifest.authoredOwnerRowProof, {
  path: authoredProofPath,
  sha256: currentVerification[authoredProofPath],
  assertions: authoredProof.assertions,
});
assert.deepEqual(manifest.actualThreeOwnerRowProof, {
  path: threeProofPath,
  sha256: currentVerification[threeProofPath],
  assertions: threeProof.assertions,
});
assert.equal(manifest.assetPreflight.length, 5);
const expectedAssetPreflight = Object.entries(productionSha256).map(([filename, digest]) => ({
  filename,
  sha256: digest,
  status: 200,
  coop: isolationHeaders.coop,
  coep: isolationHeaders.coep,
}));
assert.deepEqual(manifest.assetPreflight, expectedAssetPreflight);
const expectedRecords = [128, 512, 1024].flatMap((size) => ["native", "react"].map((arm) => ({
  arm,
  size,
  status: "PASS",
})));
assert.deepEqual(manifest.records, expectedRecords);
assert.deepEqual(manifest.pageFiles.map(({ arm, size, file }) => ({ arm, size, file })), expectedRecords.map(({ arm, size }) => ({ arm, size, file: `${arm}-${size}.json` })));

for (const { arm, size } of expectedRecords) {
  const filename = `${pilotDirectory}/${arm}-${size}.json`;
  const raw = await readJson(filename);
  const hash = await hashFile(filename);
  const manifestEntry = manifest.pageFiles.find((entry) => entry.arm === arm && entry.size === size);
  assert.equal(manifestEntry.file, `${arm}-${size}.json`);
  assert.equal(manifestEntry.sha256, hash);
  assert.equal(raw.status, "PASS");
  assert.equal(raw.production, true);
  assert.equal(raw.mode, "pilot");
  assert.equal(raw.arm, arm);
  assert.equal(raw.size, size);
  assert.equal(raw.frames, 60);
  assert.deepEqual(raw.productionSha256, productionSha256);
  assert.deepEqual(raw.servedAssetSha256, productionSha256);
  assert.deepEqual(raw.engineEpoch, engineEpoch);
  assert.deepEqual(raw.browser?.viewport, expectedViewport);
  assert.equal(typeof raw.browser?.userAgent, "string");
  assert(raw.browser.userAgent.length > 0);
  assert.equal(raw.browser.userAgent, raw.userAgent);
  assert.equal(typeof raw.browser?.platform, "string");
  assert(raw.browser.platform.length > 0);
  assert.deepEqual(raw.browserErrors, []);
  assert.deepEqual(raw.checks, { identity: true, lifecycle: true, order: true, output: true, visible: true });
  assert.deepEqual(raw.errors, []);
  assert.deepEqual(raw.samples.map(({ frame }) => frame), Array.from({ length: 60 }, (_, index) => index + 6));
  assert.deepEqual(raw.samples.filter(({ structural }) => structural).map(({ frame }) => frame), [35, 65]);
  assert.equal(raw.active.mounts, size + 16);
  assert.equal(raw.active.cleanups, 16);
  assert.equal(raw.after.writers, 0);
  assert.equal(raw.after.mounts, size + 16);
  assert.equal(raw.after.cleanups, size + 16);
  if (arm === "native") {
    assert.equal(raw.after.extra.root.ownerCount, 0);
    assert.equal(raw.after.extra.root.disposed, true);
    assert.equal(raw.after.extra.collection.readerCount, 0);
    assert.equal(raw.after.extra.collection.retainedBatches, 0);
  }
}

const verification = {
  schemaVersion: 1,
  status: "PASS",
  scope: "Independent correctness-pilot evidence verification; no timing claim.",
  verifier: { path: verifierPath, sha256: await hashFile(verifierPath) },
  sourceArchive: { path: archivePath, sha256: expectedArchiveSha256, members: expectedArchiveMemberCount },
  inventory: {
    sourceBuildEntriesVerified: Object.keys(sourceBuild).length,
    currentVerificationEntriesVerified: Object.keys(currentVerification).length,
    historicalVerificationEntriesVerified: Object.keys(historicalVerification).length,
    archiveMembersVerified: Object.keys(archivedMembers).length,
  },
  productionAssetsVerified: Object.keys(productionSha256).length,
  reusedWorldDiagnostic: {
    path: diagnosticPath,
    attempt: diagnostic.attempt,
    sixBundledInputsByteIdentical: true,
    engineEpoch,
  },
  compilerProofsVerified: Object.keys(compilerProofs).length,
  authoredOwnerRowProof: { path: authoredProofPath, status: authoredProof.status },
  actualThreeOwnerRowProof: { path: threeProofPath, status: threeProof.status },
  pilotPagesVerified: expectedRecords.length,
  pageRecords: expectedRecords.map(({ arm, size }) => ({ arm, size, status: "PASS" })),
  lifecycleChecks: ["60 measured samples", "2 structural samples at frames 35 and 65", "identity/order/output/visibility", "teardown"],
  performanceClaim: "None; these are correctness pilot pages, not timing evidence.",
};
await writeFile(outputPath, `${JSON.stringify(verification, null, 2)}\n`, { flag: "wx" });
console.log(`PASS independent owner-row-fusion pilot evidence verification: ${expectedRecords.length} pages; no timing claim.`);
