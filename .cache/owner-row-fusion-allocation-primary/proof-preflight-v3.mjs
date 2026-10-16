import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { productMixedSchedule } from "/Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/browser/product_mixed_schedule.ts";

async function main() {
let browser;
try {
const scriptPath = "scripts/profile_product_mixed_owner_row_fusion_allocation.mjs";
const verifierPath = "scripts/verify_product_mixed_owner_row_fusion_allocation.mjs";
const output = "results/product-mixed-owner-row-fusion-allocation";
const implementationDirectory = "implementation/2026-10-13-owner-row-fusion";
const statusPath = `${implementationDirectory}/status.json`;
const archivePath = `${implementationDirectory}/source-and-evidence.tar.gz`;
const protocolPath = "product-mixed-owner-row-fusion-allocation-protocol.md";
const configPath = "vite.product-mixed-owner-row-fusion-allocation.config.ts";
const schedulePath = "src/browser/product_mixed_schedule.ts";
const buildDirectory = "dist-product-mixed-compiled-owner-row-fusion";
const pilotDirectory = "results/product-mixed-owner-row-fusion-pilot";
const pilotManifestPath = `${pilotDirectory}/results.json`;
const pilotStatusPath = "implementation/2026-10-13-owner-row-fusion-pilot/status.json";
const pilotArchivePath = "implementation/2026-10-13-owner-row-fusion-pilot/evidence.tar.gz";
const pilotVerificationPath = `${pilotDirectory}/verification.json`;
const pilotVerifierPath = "scripts/verify_product_mixed_owner_row_fusion_pilot.mjs";
const pilotEvidenceVerifierPath = "scripts/verify_product_mixed_owner_row_fusion_pilot_evidence.mjs";
const timingDirectory = "implementation/2026-10-13-owner-row-fusion-timing";
const timingStatusPath = `${timingDirectory}/status.json`;
const timingArchivePath = `${timingDirectory}/evidence.tar.gz`;
const ownerRowProofPath = ".cache/compiled-owner-proof/compiled-owner-row-proof-1791897220716-45399-148948e4-9717-4af7-ac7e-6677cfe15b7c.json";
const ownerRowAuthoredSourcePath = ".cache/compiled-owner-proof/authored-owner-row-1791897220716-45399-148948e4-9717-4af7-ac7e-6677cfe15b7c.tsx";
const ownerRowEmittedModulePath = ".cache/compiled-owner-proof/compiled-owner-row-1791897220716-45399-148948e4-9717-4af7-ac7e-6677cfe15b7c.mjs";
const ownerThreeProofPath = ".cache/compiled-owner-three-proof/compiled-three-owner-row-proof-1791897229482-45665-848b1a2a-3e3c-438f-a452-ee013892c29e.json";
const diagnosticPath = "results/numeric-cell-storage-candidate-v5/diagnostic.json";
const diagnosticDirectory = "results/numeric-cell-storage-candidate-v5";
const compilerProofPaths = [
  ".cache/product-mixed-compiled-owner-row-fusion/compiler-proof/native.js",
  ".cache/product-mixed-compiled-owner-row-fusion/compiler-proof/react.js",
  ".cache/product-mixed-compiled-owner-row-fusion/compiler-proof/native.json",
  ".cache/product-mixed-compiled-owner-row-fusion/compiler-proof/react.json",
];
const baseConfigPath = "vite.product-mixed-compiled-owner-row-fusion.config.ts";
const origin = "https://owner-row-fusion-allocation.localhost:1355";
const expectedStatus = "UNIT_AUTHORED_THREE_AND_PRODUCTION_BUILD_VERIFIED";
const sequences = [0, 1, 10, 11, 20, 21];
const samplingIntervalBytes = 32 * 1024;
const viewport = { width: 1200, height: 900 };
const runId = randomUUID();
const expectedArchiveHash = "cbe4ce3f557314fa093ac51214a2ba5e9cf0a5f0ad67b5429ce3a95a5e59a382";

const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const hashFile = async (filename) => sha256(await readFile(filename));
const writeJson = (filename, value, flag = "w") =>
  writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, { flag });
const getHeapUsage = (session) => session.send("Runtime.getHeapUsage");

function archiveMemberHashes(filename) {
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

function flattenSamplingTree(profile) {
  const nodes = [];
  const visit = (node, parentId = null, depth = 0) => {
    const frame = node.callFrame ?? {};
    nodes.push({
      id: node.id ?? null,
      parentId,
      depth,
      selfSize: node.selfSize ?? 0,
      callFrame: frame,
    });
    for (const child of node.children ?? []) visit(child, node.id ?? null, depth + 1);
  };
  if (profile?.head) visit(profile.head);
  return nodes;
}

function summarizeSamplingTree(profile) {
  const byFrame = new Map();
  const visit = (node) => {
    const frame = node.callFrame ?? {};
    const row = {
      url: frame.url ?? "",
      functionName: frame.functionName || "(anonymous)",
      lineNumber: frame.lineNumber ?? -1,
      columnNumber: frame.columnNumber ?? -1,
    };
    const key = `${row.url}\u0000${row.functionName}\u0000${row.lineNumber}\u0000${row.columnNumber}`;
    const existing = byFrame.get(key) ?? { ...row, sampledAllocationBytes: 0, profileNodes: 0 };
    existing.sampledAllocationBytes += node.selfSize ?? 0;
    existing.profileNodes++;
    byFrame.set(key, existing);
    for (const child of node.children ?? []) visit(child);
  };
  if (profile?.head) visit(profile.head);
  return [...byFrame.values()]
    .sort((left, right) => right.sampledAllocationBytes - left.sampledAllocationBytes)
    .slice(0, 50);
}

async function attributeTopFrames(profile, productionHashes, loadedResources) {
  const byFrame = new Map();
  const visit = (node) => {
    const frame = node.callFrame ?? {};
    const url = frame.url ?? "";
    const functionName = frame.functionName || "(anonymous)";
    const lineNumber = frame.lineNumber ?? -1;
    const columnNumber = frame.columnNumber ?? -1;
    const key = `${url}\u0000${functionName}\u0000${lineNumber}\u0000${columnNumber}`;
    const row = byFrame.get(key) ?? {
      url,
      functionName,
      lineNumber,
      columnNumber,
      sampledAllocationBytes: 0,
      profileNodes: 0,
    };
    row.sampledAllocationBytes += node.selfSize ?? 0;
    row.profileNodes++;
    byFrame.set(key, row);
    for (const child of node.children ?? []) visit(child);
  };
  if (profile?.head) visit(profile.head);
  const servedHashes = new Map(loadedResources
    .filter((resource) => resource.filename && resource.sha256)
    .map((resource) => [resource.filename, resource.sha256]));
  const topFrames = [...byFrame.values()]
    .sort((left, right) => right.sampledAllocationBytes - left.sampledAllocationBytes)
    .slice(0, 50);
  const sourceCache = new Map();
  for (const frame of topFrames) {
    let emittedFile;
    try {
      emittedFile = `${buildDirectory}${new URL(frame.url).pathname}`;
    } catch {
      frame.emittedExcerpt = null;
      continue;
    }
    const expectedHash = productionHashes[emittedFile];
    const servedHash = servedHashes.get(emittedFile);
    if (!expectedHash || !servedHash || expectedHash !== servedHash || frame.lineNumber < 0 || frame.columnNumber < 0) {
      frame.emittedExcerpt = null;
      continue;
    }
    let source = sourceCache.get(emittedFile);
    if (source === undefined) {
      source = await readFile(emittedFile, "utf8");
      sourceCache.set(emittedFile, source);
    }
    const lines = source.split("\n");
    if (!Number.isSafeInteger(frame.lineNumber) || frame.lineNumber < 0 || frame.lineNumber >= lines.length ||
      !Number.isSafeInteger(frame.columnNumber) || frame.columnNumber < 0 || frame.columnNumber > lines[frame.lineNumber].length) {
      frame.emittedExcerpt = null;
      continue;
    }
    const lineStart = lines.slice(0, frame.lineNumber).reduce((sum, line) => sum + line.length + 1, 0);
    const offset = lineStart + frame.columnNumber;
    const start = Math.max(0, offset - 160);
    const end = Math.min(source.length, offset + 160);
    frame.emittedExcerpt = {
      file: emittedFile,
      sha256: expectedHash,
      verifiedServedSha256: servedHash,
      lineNumber: frame.lineNumber,
      columnNumber: frame.columnNumber,
      offset,
      start,
      end,
      text: source.slice(start, end),
    };
  }
  return topFrames;
}

const status = JSON.parse(await readFile(statusPath, "utf8"));
const statusHash = await hashFile(statusPath);
const archiveHash = await hashFile(archivePath);
const protocolHash = await hashFile(protocolPath);
const scheduleHash = await hashFile(schedulePath);
const pilotManifest = JSON.parse(await readFile(pilotManifestPath, "utf8"));
const pilotManifestHash = await hashFile(pilotManifestPath);
const timingStatus = JSON.parse(await readFile(timingStatusPath, "utf8"));
const timingStatusHash = await hashFile(timingStatusPath);
const timingArchiveHash = await hashFile(timingArchivePath);
assert.equal(status.schemaVersion, 2);
assert.equal(status.status, expectedStatus, "Owner-row fusion correctness is not qualified");
assert.equal(status.runtimeTests, 695);
assert.equal(status.rustTests, 33);
assert.equal(status.candidateProductionPilotPages, 0);
assert.equal(status.archiveMembers, 1093);
assert.equal(status.archiveSha256, expectedArchiveHash);
assert.equal(archiveHash, expectedArchiveHash);
assert.equal(status.speedGate, "UNMEASURED_CURRENT_REVISION");
assert.equal(status.latestMeasuredRuntimeSpeedGate, "FAIL_OWNER_ROWS_27_TO_43_PERCENT_SLOWER");
assert.equal(timingStatus.status, "TIMING_VERIFIED_SPEED_FAIL");
assert.equal(timingStatus.speedGate, "FAIL");
assert.equal(timingStatus.allocationGate, "UNMEASURED_CURRENT_REVISION");
assert.equal(timingStatus.sourceArchiveSha256, archiveHash);
assert.equal(timingArchiveHash, "06a33b0b9d403802877066972cc8ead67e68aba9356f9c715f95005b258cd23c");
assert.equal(timingStatus.archiveSha256, timingArchiveHash);
const timingArchiveMembers = archiveMemberHashes(timingArchivePath);
assert.deepEqual(timingArchiveMembers, timingStatus.evidenceSha256);
assert.equal(Object.keys(timingArchiveMembers).length, timingStatus.archiveMembers);
for (const [filename, expected] of Object.entries(timingStatus.evidenceSha256)) {
  assert.equal(await hashFile(filename), expected, `Frozen timing evidence changed: ${filename}`);
}
const sourceAndBuildHashes = status.sourceAndBuildSha256;
const currentVerificationHashes = status.verificationSha256;
const historicalVerificationHashes = status.historicalVerificationSha256;
assert.equal(Object.keys(sourceAndBuildHashes).length, 1004);
assert.equal(Object.keys(currentVerificationHashes).length, 25);
assert.equal(Object.keys(historicalVerificationHashes).length, 64);
assert.equal(new Set([
  ...Object.keys(sourceAndBuildHashes),
  ...Object.keys(currentVerificationHashes),
  ...Object.keys(historicalVerificationHashes),
]).size, 1093);
const archiveMembers = archiveMemberHashes(archivePath);
const expectedArchivePaths = [...new Set([
  ...Object.keys(sourceAndBuildHashes),
  ...Object.keys(currentVerificationHashes),
  ...Object.keys(historicalVerificationHashes),
])].sort();
assert.deepEqual(Object.keys(archiveMembers).sort(), expectedArchivePaths);
for (const map of [sourceAndBuildHashes, currentVerificationHashes, historicalVerificationHashes]) {
  for (const [filename, expected] of Object.entries(map)) {
    assert.equal(archiveMembers[filename], expected, `Archive member mismatch: ${filename}`);
    assert.equal(await hashFile(filename), expected, `Frozen input changed: ${filename}`);
  }
}
assert.equal(status.qualifiedEngineDiagnostic, diagnosticPath);
assert.equal(pilotManifest.status, "PASS");
assert.equal(pilotManifest.scope, "Correctness pilot only; no confirmatory performance evidence");
const pilotStatus = JSON.parse(await readFile(pilotStatusPath, "utf8"));
const pilotStatusHash = await hashFile(pilotStatusPath);
const pilotArchiveHash = await hashFile(pilotArchivePath);
const pilotVerificationHash = await hashFile(pilotVerificationPath);
const pilotVerification = JSON.parse(await readFile(pilotVerificationPath, "utf8"));
assert.equal(pilotStatus.status, "PRODUCTION_CORRECTNESS_PILOT_VERIFIED");
assert.equal(pilotStatus.archiveSha256, "925cb5eb7caf9c4e49c164666eb899c7c00f87075ef97828aba4052bc324534b");
assert.equal(pilotArchiveHash, pilotStatus.archiveSha256);
assert.equal(pilotVerification.status, "PASS");
const ownerRowProof = JSON.parse(await readFile(ownerRowProofPath, "utf8"));
const ownerThreeProof = JSON.parse(await readFile(ownerThreeProofPath, "utf8"));
assert.equal(ownerRowProof.status, "PASS");
assert.deepEqual(ownerRowProof.ownerRowPrograms.sparseAndDenseCalls.map(({ count }) => count), [1, 6]);
assert.equal(ownerRowProof.ownerRowPrograms.eligibleNonemptyPendingCaptureCalls, 0);
assert.equal(ownerThreeProof.status, "PASS");
assert.equal(ownerThreeProof.numericOwnerRowCut.batches, 240);
assert.equal(ownerThreeProof.numericOwnerRowCut.cellsPerBatch, 5);
assert.equal(ownerThreeProof.numericOwnerRowCut.preparedRowProgramCount, 1);
const diagnostic = JSON.parse(await readFile(diagnosticPath, "utf8"));
assert.equal(diagnostic.status, "PASS");
assert.equal(diagnostic.attempt, "v5");
assert.deepEqual(diagnostic.bundledInputHashes, diagnostic.bundledInputHashesAfterBundle);
const compilerProofFiles = Object.fromEntries(await Promise.all(compilerProofPaths.map(async (filename) => [filename, await hashFile(filename)])));
const compilerProofs = {
  native: JSON.parse(await readFile(compilerProofPaths[2], "utf8")),
  react: JSON.parse(await readFile(compilerProofPaths[3], "utf8")),
};
assert.equal(compilerProofs.native.ownerRow.validDescriptors, true);
assert.equal(compilerProofs.native.ownerRow.validBindings, true);
assert.deepEqual(compilerProofs.react, { arm: "react", compiled: true, rowMemoCache: true, boardMemoCache: true });
const protocolText = await readFile(protocolPath, "utf8");
assert(protocolText.includes(expectedArchiveHash));
assert.match(protocolText, /allocation diagnostic/i);
assert.match(protocolText, /does not establish CPU speed/i);
const expectedPilotPairs = [
  ["native", 128], ["react", 128],
  ["native", 512], ["react", 512],
  ["native", 1024], ["react", 1024],
];
assert.deepEqual(pilotManifest.records, expectedPilotPairs.map(([arm, size]) => ({
  arm, size, status: "PASS",
})));
const proof = {
  native: pilotManifest.nativeProof,
  react: pilotManifest.reactProof,
};
assert.equal(proof.native?.arm, "native");
assert.equal(proof.native?.compiled, true);
assert.equal(proof.native?.bindings, 3);
assert.equal(proof.native?.deltas, true);
assert.equal(proof.native?.propOnly, true);
assert.equal(proof.native?.deltaFallback, false);
assert.equal(proof.react?.arm, "react");
assert.equal(proof.react?.compiled, true);
assert.equal(proof.react?.rowMemoCache, true);
assert.equal(proof.react?.boardMemoCache, true);
assert.equal(productMixedSchedule.length, 30);

const selectedSchedule = sequences.map((sequence) => productMixedSchedule[sequence]);
assert.deepEqual(selectedSchedule.map((page) => page.sequence), sequences);
assert.deepEqual(selectedSchedule.map((page) => page.size), [128, 128, 512, 512, 1024, 1024]);
assert.deepEqual(selectedSchedule.map((page) => page.arm), ["react", "native", "react", "native", "react", "native"]);
assert.deepEqual(selectedSchedule.map((page) => page.pair), [0, 0, 0, 0, 0, 0]);

const productionHashes = Object.fromEntries(
  Object.entries(sourceAndBuildHashes).filter(([filename]) => filename.startsWith(`${buildDirectory}/`)),
);
assert.equal(Object.keys(productionHashes).length, 5, "Status must lock exactly the five production build files");
for (const [filename, expectedHash] of Object.entries(productionHashes)) {
  assert.equal(await hashFile(filename), expectedHash, `Frozen production file changed: ${filename}`);
}
const htmlPath = `${buildDirectory}/product-mixed-v2.html`;
const expectedCommonNames = new Set([
  path.basename(htmlPath),
  ...Object.keys(productionHashes)
    .filter((filename) => !/native_product_mixed_arm-|product_mixed_react_arm-/.test(filename))
    .map((filename) => path.basename(filename)),
]);
assert.equal(expectedCommonNames.size, 3, "Build must contain HTML, harness JS, CSS, and two arm chunks");
assert.equal(Object.keys(productionHashes).filter((filename) => /native_product_mixed_arm-/.test(filename)).length, 1);
assert.equal(Object.keys(productionHashes).filter((filename) => /product_mixed_react_arm-/.test(filename)).length, 1);

const sourceLockPaths = [
  "src/browser/native_product_mixed_arm.tsx",
  "src/browser/product_mixed_react_arm.tsx",
  "src/browser/product_mixed_harness.ts",
  "src/browser/product_mixed_schedule.ts",
  baseConfigPath,
];
const sourceHashes = {};
for (const filename of sourceLockPaths) {
  const expectedHash = sourceAndBuildHashes[filename];
  assert.ok(expectedHash, `Qualified status omits source lock: ${filename}`);
  assert.equal(await hashFile(filename), expectedHash, `Frozen source file changed: ${filename}`);
  sourceHashes[filename] = expectedHash;
}

const validatedPilotRecords = [];
for (const [arm, size] of expectedPilotPairs) {
  const filename = path.join(pilotDirectory, `${arm}-${size}.json`);
  const raw = JSON.parse(await readFile(filename, "utf8"));
  const pageFile = pilotManifest.pageFiles.find((entry) => entry.arm === arm && entry.size === size);
  assert.equal(pageFile?.file, `${arm}-${size}.json`);
  assert.equal(pageFile?.sha256, await hashFile(filename));
  assert.equal(raw.status, "PASS", `Correctness pilot failed: ${filename}`);
  assert.equal(raw.mode, "pilot");
  assert.equal(raw.production, true);
  assert.equal(raw.arm, arm);
  assert.equal(raw.size, size);
  assert.equal(raw.frames, 60);
  assert.equal(raw.samples?.length, 60);
  assert.deepEqual(Object.values(raw.checks), [true, true, true, true, true]);
  assert.deepEqual(raw.errors, []);
  assert.deepEqual(raw.browserErrors, []);
  assert.equal(raw.warmup, 5);
  assert.equal(raw.samples.filter((sample) => sample.structural).length, 2);
  assert.equal(raw.active?.writers, size);
  assert.equal(raw.active?.mounts, size + 16);
  assert.equal(raw.active?.cleanups, 16);
  assert.equal(raw.after?.writers, 0);
  assert.equal(raw.after?.mounts, raw.after?.cleanups);
  validatedPilotRecords.push({ arm, size, status: raw.status, pageSha256: await hashFile(filename) });
}


console.log("PASS primary allocation nonbrowser proof/input preflight; no collection");

} finally {}

}
await main();
