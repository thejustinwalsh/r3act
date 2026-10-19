import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { openBrowser } from "vitexec/cli";
import { productMixedSchedule } from "../src/browser/product_mixed_schedule.ts";

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

await mkdir(output, { recursive: true });
assert.equal((await readdir(output)).length, 0, `Refusing to overwrite an existing allocation-profile output: ${output}`);

// Validate local CDP support on a blank page before freezing the allocation diagnostic.
browser = await openBrowser({ headless: false, gpu: false });
const preflightContext = await browser.newContext({ ignoreHTTPSErrors: true, viewport });
const preflightPage = await preflightContext.newPage();
const preflightSession = await preflightContext.newCDPSession(preflightPage);
let cdpMethods = [];
const assetPreflight = [];
let browserVersion;
let engineEpoch;
try {
  await preflightPage.goto("about:blank");
  await preflightSession.send("Runtime.enable");
  await preflightSession.send("HeapProfiler.enable");
  await preflightSession.send("HeapProfiler.collectGarbage");
  const baseline = await getHeapUsage(preflightSession);
  await preflightSession.send("HeapProfiler.startSampling", {
    samplingInterval: samplingIntervalBytes,
    includeObjectsCollectedByMajorGC: true,
    includeObjectsCollectedByMinorGC: true,
  });
  const current = await preflightSession.send("HeapProfiler.getSamplingProfile");
  assert.ok(current.profile?.head, "CDP returned no current sampling profile");
  const stopped = await preflightSession.send("HeapProfiler.stopSampling");
  assert.ok(stopped.profile?.head, "CDP returned no stopped sampling profile");
  cdpMethods = [
    "HeapProfiler.collectGarbage",
    "Runtime.getHeapUsage",
    "HeapProfiler.startSampling",
    "HeapProfiler.getSamplingProfile",
    "HeapProfiler.stopSampling",
  ];
  assert.ok(baseline.usedSize >= 0);
  for (const [filename, expectedHash] of Object.entries(productionHashes)) {
    const response = await preflightContext.request.get(`${origin}/${filename.slice(`${buildDirectory}/`.length)}`);
    const headers = response.headers();
    const coop = String(headers["cross-origin-opener-policy"] ?? "").trim().toLowerCase();
    const coep = String(headers["cross-origin-embedder-policy"] ?? "").trim().toLowerCase();
    assert.equal(response.status(), 200);
    assert.equal(coop, "same-origin");
    assert.equal(coep, "require-corp");
    const servedSha256 = sha256(await response.body());
    assert.equal(servedSha256, expectedHash, `Served asset bytes differ: ${filename}`);
    assetPreflight.push({ filename, status: response.status(), sha256: servedSha256, coop, coep });
  }
  browserVersion = await preflightSession.send("Browser.getVersion");
  engineEpoch = {
    product: browserVersion.product,
    jsVersion: browserVersion.jsVersion,
    revision: browserVersion.revision,
  };
  assert.deepEqual(engineEpoch, {
    product: diagnostic.browserVersion.product,
    jsVersion: diagnostic.browserVersion.jsVersion,
    revision: diagnostic.browserVersion.revision,
  }, "Profile browser must match the engine tuple in the qualified V5 diagnostic");
  assert.deepEqual(pilotManifest.engineEpoch, engineEpoch, "Profile browser must match the independently qualified pilot engine");
} finally {
  await preflightSession.detach().catch(() => {});
  await preflightContext.close();
}

const pilotEvidenceLocks = pilotStatus.evidenceSha256;
const diagnosticArtifacts = [
  `${diagnosticDirectory}/inspect_numeric_cell_storage_candidate_v5.mjs`,
  `${diagnosticDirectory}/owner-state-world-entry.ts`,
  `${diagnosticDirectory}/owner-state-world.iife.js`,
  `${diagnosticDirectory}/owner-state-world.source.ts`,
];
const ownerFixtureHashes = {
  [ownerRowAuthoredSourcePath]: await hashFile(ownerRowAuthoredSourcePath),
  [ownerRowEmittedModulePath]: await hashFile(ownerRowEmittedModulePath),
};
const diagnosticArtifactsHashes = Object.fromEntries(await Promise.all(diagnosticArtifacts.map(async (filename) => [filename, await hashFile(filename)])));
const pilotPageLocks = Object.fromEntries(validatedPilotRecords.map((record) => [
  `${pilotDirectory}/${record.arm}-${record.size}.json`, record.pageSha256,
]));
const pilotLocks = {
  [pilotStatusPath]: pilotStatusHash,
  [pilotArchivePath]: pilotArchiveHash,
  [pilotVerificationPath]: pilotVerificationHash,
  [pilotVerifierPath]: await hashFile(pilotVerifierPath),
  [pilotEvidenceVerifierPath]: await hashFile(pilotEvidenceVerifierPath),
  [pilotManifestPath]: pilotManifestHash,
  ...pilotEvidenceLocks,
  ...pilotPageLocks,
};
const inputLocks = {
  [archivePath]: archiveHash,
  [statusPath]: statusHash,
  ...sourceAndBuildHashes,
  ...currentVerificationHashes,
  ...historicalVerificationHashes,
  [timingStatusPath]: timingStatusHash,
  [timingArchivePath]: timingArchiveHash,
  ...timingStatus.evidenceSha256,
  ...compilerProofFiles,
  [ownerRowProofPath]: await hashFile(ownerRowProofPath),
  ...ownerFixtureHashes,
  [ownerThreeProofPath]: await hashFile(ownerThreeProofPath),
  [diagnosticPath]: await hashFile(diagnosticPath),
  ...diagnosticArtifactsHashes,
  ...diagnostic.bundledInputHashes,
  ...pilotLocks,
  [protocolPath]: protocolHash,
  [configPath]: await hashFile(configPath),
  [baseConfigPath]: await hashFile(baseConfigPath),
  [schedulePath]: scheduleHash,
  [scriptPath]: await hashFile(scriptPath),
  [verifierPath]: await hashFile(verifierPath),
};
for (const [filename, expectedHash] of Object.entries(inputLocks)) {
  assert.equal(await hashFile(filename), expectedHash, `Frozen input changed before preregistration: ${filename}`);
}

const profileScope = "Whole page from about:blank through module import, initial mount, 60 warmup frames, 240 measured frames, correctness checks, and disposal.";

const preregistration = {
  schemaVersion: 1,
  study: "compiled-product-mixed-owner-row-fusion-allocation-diagnostic",
  status: "FROZEN_BEFORE_ALLOCATION_PROFILE",
  runId,
  createdAt: new Date().toISOString(),
  frozenInputs: {
    archive: { path: archivePath, sha256: archiveHash },
    status: { path: statusPath, sha256: statusHash, qualifiedStatus: expectedStatus },
    protocol: { path: protocolPath, sha256: protocolHash },
    configuration: { path: configPath, sha256: inputLocks[configPath] },
    pilotManifest: { path: pilotManifestPath, sha256: pilotManifestHash },
    currentTimingEvidence: {
      statusPath: timingStatusPath,
      statusSha256: timingStatusHash,
      archivePath: timingArchivePath,
      archiveSha256: timingArchiveHash,
      status: timingStatus.status,
      speedGate: timingStatus.speedGate,
      allocationGate: timingStatus.allocationGate,
      evidenceSha256: timingStatus.evidenceSha256,
    },
    pilotCheckpoint: {
      statusPath: pilotStatusPath,
      statusSha256: pilotStatusHash,
      archivePath: pilotArchivePath,
      archiveSha256: pilotArchiveHash,
      verificationPath: pilotVerificationPath,
      verificationSha256: pilotVerificationHash,
      evidenceVerifier: { path: pilotEvidenceVerifierPath, sha256: pilotLocks[pilotEvidenceVerifierPath] },
      evidenceSha256: pilotEvidenceLocks,
    },
    proofs: {
      authoredOwnerRow: { path: ownerRowProofPath, sha256: inputLocks[ownerRowProofPath], status: ownerRowProof.status },
      actualThreeOwnerRow: { path: ownerThreeProofPath, sha256: inputLocks[ownerThreeProofPath], status: ownerThreeProof.status },
      compiler: { files: compilerProofFiles, native: compilerProofs.native, react: compilerProofs.react },
      chromiumDiagnostic: {
        path: diagnosticPath,
        sha256: inputLocks[diagnosticPath],
        status: diagnostic.status,
        engineEpoch,
        bundledInputHashes: diagnostic.bundledInputHashes,
      },
    },
    schedule: { path: schedulePath, sha256: scheduleHash, pages: selectedSchedule },
    productionFiles: productionHashes,
    sourceFiles: sourceHashes,
    sourceAndBuildSha256: sourceAndBuildHashes,
    currentVerificationSha256: currentVerificationHashes,
    historicalVerificationSha256: historicalVerificationHashes,
    pilotRecords: validatedPilotRecords,
    pilotPageHashes: pilotPageLocks,
    assetPreflight,
    engineEpoch,
    collector: { path: scriptPath, sha256: inputLocks[scriptPath] },
    independentVerifier: { path: verifierPath, sha256: inputLocks[verifierPath] },
    inputCounts: {
      sourceAndBuild: 1004,
      currentVerification: 25,
      historicalVerification: 64,
      archiveMembers: 1093,
      currentTimingMembers: timingStatus.archiveMembers,
      inputLocks: Object.keys(inputLocks).length,
    },
    inputLocks,
  },
  browser: {
    origin,
    mode: "confirm",
    headless: false,
    gpu: false,
    viewport,
    freshContexts: true,
    serial: true,
    cdpMethods,
    engineEpoch,
    browserVersion,
    productionSha256: productionHashes,
    servedAssetSha256: Object.fromEntries(assetPreflight.map(({ filename, sha256 }) => [filename, sha256])),
    assetPreflight,
    samplingIntervalBytes,
    includeObjectsCollectedByMajorGC: true,
    includeObjectsCollectedByMinorGC: true,
    samplingBeginsOnAboutBlankBeforeNavigation: true,
  },
  workload: {
    sequences,
    sizes: [128, 512, 1024],
    arms: ["react", "native"],
    warmupFrames: 60,
    measuredFrames: 240,
    correctnessGate: "Each page passes all five checks, has 240 samples, and has no harness or browser errors.",
  },
  profileScope,
  interpretation: {
    kind: "diagnostic-only",
    allocationPassGate: false,
    speedVerdict: false,
    releaseVerdict: false,
    currentTimingResult: { path: timingStatusPath, sha256: timingStatusHash, status: timingStatus.status, speedGate: timingStatus.speedGate },
    priorTimingResult: { value: status.latestMeasuredRuntimeSpeedGate, label: "historical checkpoint summary; superseded by the separately locked current timing evidence" },
  },
  limitations: [
    "HeapProfiler sampling estimates sampled JavaScript allocations; node selfSize and flat samples are reported as separate CDP outputs and are not required to agree.",
    "Runtime.getHeapUsage reports JavaScript heap usage and excludes native DOM, GPU, and presentation allocations.",
    "The profile spans import, mount, warmup, measured frames, checks, and disposal; it is not an update-only profile or a CPU frame-speed claim.",
    "Post-teardown heap readings occur after harness disposal, before and after forced GC; they do not measure mounted-only cache memory or prove absence of leaks.",
    "A second browser context on this computer is not independent-device replication.",
    "One pair per size is diagnostic only and does not create an allocation pass/fail gate.",
    "This profile cannot reverse the checkpoint's existing timing failure or establish a release verdict.",
  ],
  machine: {
    platform: process.platform,
    architecture: process.arch,
    nodeVersion: process.version,
    cpuModel: os.cpus()[0]?.model ?? null,
    logicalCpuCount: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
  },
};
await writeJson(path.join(output, "preregistration.json"), preregistration, "wx");

const pageRecords = [];
  for (const scheduled of selectedSchedule) {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport });
    const page = await context.newPage();
    const browserErrors = [];
    const resourceResponses = [];
    let session;
    let samplingStarted = false;
    const pageRecord = {
      schemaVersion: 1,
      study: preregistration.study,
      runId,
      sequence: scheduled.sequence,
      pair: scheduled.pair,
      size: scheduled.size,
      arm: scheduled.arm,
      startedAt: new Date().toISOString(),
      origin,
      status: "INCOMPLETE",
      browserErrors,
    };
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("response", (response) => {
      const url = response.url();
      if (url.startsWith(origin) && /\.(html|js|css)(\?|$)/.test(url)) {
        resourceResponses.push((async () => {
          try {
            const body = await response.body();
            return {
              url,
              status: response.status(),
              filename: `${buildDirectory}${new URL(url).pathname}`,
              sha256: sha256(body),
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
      session = await context.newCDPSession(page);
      await session.send("Runtime.enable");
      await session.send("HeapProfiler.enable");
      await session.send("HeapProfiler.collectGarbage");
      pageRecord.heapUsageBaseline = await getHeapUsage(session);
      pageRecord.sampling = {
        startedBeforeNavigation: true,
        samplingIntervalBytes,
        includeObjectsCollectedByMajorGC: true,
        includeObjectsCollectedByMinorGC: true,
        scope: preregistration.profileScope,
      };
      await session.send("HeapProfiler.startSampling", {
        samplingInterval: samplingIntervalBytes,
        includeObjectsCollectedByMajorGC: true,
        includeObjectsCollectedByMinorGC: true,
      });
      samplingStarted = true;

      const url = `${origin}/product-mixed-v2.html?mode=confirm&sequence=${scheduled.sequence}`;
      pageRecord.url = url;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.bringToFront();
      await page.waitForFunction(() => window.__productMixed?.result() !== undefined, null, { timeout: 90000 });
      const result = await page.evaluate(() => window.__productMixed.result());
      pageRecord.harnessResult = result;
      assert.equal(result.status, "PASS");
      assert.equal(result.mode, "confirm");
      assert.equal(result.production, true);
      assert.equal(result.sequence, scheduled.sequence);
      assert.equal(result.pair, scheduled.pair);
      assert.equal(result.arm, scheduled.arm);
      assert.equal(result.size, scheduled.size);
      assert.equal(result.warmup, 60);
      assert.equal(result.frames, 240);
      assert.equal(result.samples?.length, 240);
      assert.deepEqual(result.samples.map((sample) => sample.frame), Array.from({ length: 240 }, (_, index) => index + 61));
      assert.equal(result.samples.filter((sample) => sample.structural).length, 8);
      assert.deepEqual(Object.values(result.checks), [true, true, true, true, true]);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(browserErrors, []);

      await page.evaluate(() => window.__productMixed.dispose());
      const stopped = await session.send("HeapProfiler.stopSampling");
      samplingStarted = false;
      pageRecord.cdp = {
        stoppedSamplingProfile: stopped.profile,
        stoppedProfileTree: stopped.profile?.head ?? null,
        stoppedFlatSamples: stopped.profile?.samples ?? [],
        flattenedTreeNodes: flattenSamplingTree(stopped.profile),
        stoppedSummaryTopFrames: summarizeSamplingTree(stopped.profile),
        topFrameAttribution: null,
      };
      assert.ok(stopped.profile?.head, "CDP returned no stopped sampling profile");
      pageRecord.heapUsageAfterHarnessTeardown = await getHeapUsage(session);
      await session.send("HeapProfiler.collectGarbage");
      pageRecord.heapUsageAfterForcedGC = await getHeapUsage(session);

      const loadedResources = await Promise.all(resourceResponses);
      pageRecord.loadedBuildResources = loadedResources;
      for (const response of loadedResources) {
        assert.equal(response.status, 200, `Production resource returned HTTP ${response.status}: ${response.url}`);
        assert.ok(response.filename in productionHashes, `Unexpected production resource: ${response.filename}`);
        assert.equal(response.sha256, productionHashes[response.filename], `Served bytes differ from frozen build: ${response.filename}`);
      }
      const loadedNames = new Set(loadedResources.map((resource) => path.basename(resource.filename ?? "")));
      for (const name of expectedCommonNames) assert(loadedNames.has(name), `Missing common production resource: ${name}`);
      const selectedArmPattern = scheduled.arm === "native" ? /^native_product_mixed_arm-/ : /^product_mixed_react_arm-/;
      const oppositeArmPattern = scheduled.arm === "native" ? /^product_mixed_react_arm-/ : /^native_product_mixed_arm-/;
      assert([...loadedNames].some((name) => selectedArmPattern.test(name)), "Selected production arm chunk was not served");
      assert(![...loadedNames].some((name) => oppositeArmPattern.test(name)), "Opposite arm chunk was served during this profile");
      pageRecord.cdp.topFrameAttribution = await attributeTopFrames(
        stopped.profile,
        productionHashes,
        loadedResources,
      );
      pageRecord.status = "PASS";
    } catch (error) {
      pageRecord.status = "FAIL";
      pageRecord.failure = String(error?.stack ?? error);
      if (samplingStarted && session) {
        try {
          const stopped = await session.send("HeapProfiler.stopSampling");
          samplingStarted = false;
          pageRecord.cdp = {
            stoppedSamplingProfile: stopped.profile,
            stoppedProfileTree: stopped.profile?.head ?? null,
            stoppedFlatSamples: stopped.profile?.samples ?? [],
            flattenedTreeNodes: flattenSamplingTree(stopped.profile),
            stoppedSummaryTopFrames: summarizeSamplingTree(stopped.profile),
          };
          pageRecord.heapUsageAfterFailure = await getHeapUsage(session);
        } catch (stopError) {
          pageRecord.samplingStopError = String(stopError);
        }
      }
      pageRecord.loadedBuildResources = await Promise.all(resourceResponses);
    } finally {
      pageRecord.finishedAt = new Date().toISOString();
      const filename = `${String(scheduled.sequence).padStart(2, "0")}-${scheduled.arm}-${scheduled.size}.json`;
      await writeJson(path.join(output, filename), pageRecord, "wx");
      pageRecords.push({
        sequence: scheduled.sequence,
        pair: scheduled.pair,
        arm: scheduled.arm,
        size: scheduled.size,
        status: pageRecord.status,
        file: filename,
        sha256: await hashFile(path.join(output, filename)),
      });
      await session?.detach().catch(() => {});
      await context.close();
      await writeJson(path.join(output, "progress.json"), {
        schemaVersion: 1,
        study: preregistration.study,
        runId,
        createdAt: new Date().toISOString(),
        status: pageRecords.length === selectedSchedule.length && pageRecords.every((page) => page.status === "PASS")
          ? "PASS"
          : "IN_PROGRESS",
        records: pageRecords,
        interpretation: "Separate untimed allocation and JavaScript heap diagnostics; do not pool with latency pages or interpret as exact allocation totals or CPU frame speed.",
        limitations: preregistration.limitations,
      });
      console.log(`${pageRecord.status} owner-row allocation profile ${scheduled.arm}/${scheduled.size} sequence=${scheduled.sequence}`);
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
const postLock = {
  schemaVersion: 1,
  study: preregistration.study,
  runId,
  checkedAt: new Date().toISOString(),
  status: postLockMismatches.length === 0 ? "PASS" : "FAIL",
  records: postLockRecords,
  mismatches: postLockMismatches,
};
await writeJson(path.join(output, "postlock.json"), postLock, "wx");
const finalStatus = pageRecords.length === selectedSchedule.length &&
    pageRecords.every((page) => page.status === "PASS") && postLockMismatches.length === 0
  ? "PASS"
  : "FAIL";
await writeJson(path.join(output, "manifest.json"), {
  schemaVersion: 1,
  study: preregistration.study,
  runId,
  status: finalStatus,
  preregistrationSha256: await hashFile(path.join(output, "preregistration.json")),
  archiveSha256: archiveHash,
  records: pageRecords,
  postCollectionChangedFiles: postLockMismatches.map(({ filename }) => filename),
}, "wx");
await writeJson(path.join(output, "FINALresults.json"), {
  schemaVersion: 1,
  study: preregistration.study,
  runId,
  finalizedAt: new Date().toISOString(),
  status: finalStatus,
  records: pageRecords,
  postlock: { path: "postlock.json", status: postLock.status, mismatches: postLockMismatches },
  interpretation: preregistration.interpretation,
  interpretationText: "Separate untimed allocation and JavaScript heap diagnostics; do not pool with latency pages or interpret as exact allocation totals or CPU frame speed.",
  limitations: preregistration.limitations,
}, "wx");
if (finalStatus !== "PASS") {
  process.exitCode = 1;
}
} finally {
  await browser?.close();
}
}

await main();
