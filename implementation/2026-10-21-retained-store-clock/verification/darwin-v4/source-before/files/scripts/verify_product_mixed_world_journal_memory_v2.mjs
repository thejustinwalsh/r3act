import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

// Usage: node scripts/verify_product_mixed_world_journal_memory_v2.mjs [results-dir]
// Reads finalized collection evidence and writes verification-v2.json exclusively.
const root = process.cwd();
const relativeResultDir = process.argv[2] ?? "results/product-mixed-world-journal-memory";
const verificationFilename = process.argv[3] ?? "verification-v2.json";
const resultDir = path.resolve(root, relativeResultDir);
const protocolPath = "product-mixed-world-journal-memory-protocol.md";
const statusPath = "implementation/2026-10-13-world-dirty-journal/status.json";
const archivePath = "implementation/2026-10-13-world-dirty-journal/source-and-build.tar.gz";
const pilotDir = "implementation/2026-10-13-world-dirty-journal/verification/product-mixed-pilot";
const pilotManifestPath = `${pilotDir}/results.json`;
const worldJournalProofPath = "implementation/2026-10-13-world-dirty-journal/verification/execution-proof.json";
const nativeCompilerProofPath = "implementation/2026-10-13-world-dirty-journal/verification/product-compiler-proof/native.js";
const schedulePath = "src/browser/product_mixed_schedule.ts";
const verifierPath = "scripts/verify_product_mixed_world_journal_memory.mjs";
const currentVerifierPath = "scripts/verify_product_mixed_world_journal_memory_v2.mjs";
const priorFailureLogPath = ".cache/world-journal-diagnostics/memory-verification.log";
const buildDirectory = "dist-product-mixed-world-journal";
const selected = [
  { sequence: 0, pair: 0, arm: "react", size: 128, file: "00-react-128.json" },
  { sequence: 1, pair: 0, arm: "native", size: 128, file: "01-native-128.json" },
  { sequence: 10, pair: 0, arm: "react", size: 512, file: "10-react-512.json" },
  { sequence: 11, pair: 0, arm: "native", size: 512, file: "11-native-512.json" },
  { sequence: 20, pair: 0, arm: "react", size: 1024, file: "20-react-1024.json" },
  { sequence: 21, pair: 0, arm: "native", size: 1024, file: "21-native-1024.json" },
];
const expectedPilot = [
  ["native", 128], ["react", 128], ["native", 512],
  ["react", 512], ["native", 1024], ["react", 1024],
];
const expectedSourcePaths = [
  "src/browser/native_product_mixed_arm.tsx",
  "src/browser/product_mixed_react_arm.tsx",
  "src/browser/product_mixed_harness.ts",
  "src/browser/product_mixed_schedule.ts",
  "vite.product-mixed-world-journal.config.ts",
];
const expectedOrigin = "https://compiled-world-journal.localhost:1355";
const expectedArchiveHash = "262914378f2cebb79d77805e7dda341d6b9c58b00de9c9a7eba801d621202468";
const expectedCellCutProofHash = "bffb8c32999026bf1907e321c8c86fa8915a2c67ecbdad729fc3bcac82347796";
const expectedNativeCompilerHash = "9556c7165e65ddad202650167860640010fa09fbead822c46f81cea5f181e67d";
const checks = [];
const failures = [];
const diagnostics = [];
const profileSummaries = {};
const pilotHashes = [];
const verifiedAllocationFrames = [];
const unresolvedAllocationFrames = [];
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = async (filename) => JSON.parse(await readFile(path.resolve(root, filename), "utf8"));
const hashFile = async (filename) => sha256(await readFile(path.resolve(root, filename)));
// JSON object key order is not semantic; arrays remain order-sensitive.
function sameJson(left, right) {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, i) => sameJson(item, right[i]));
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return sameJson(leftKeys, rightKeys) && leftKeys.every((key) => sameJson(left[key], right[key]));
}
function check(id, ok, detail, data = undefined) {
  const row = { id, status: ok ? "PASS" : "FAIL", detail };
  if (data !== undefined) row.data = data;
  checks.push(row);
  if (!ok) failures.push({ id, detail });
  return ok;
}
function finiteNonnegative(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
function integerNonnegative(value) {
  return Number.isSafeInteger(value) && value >= 0;
}
function validHeapUsage(value) {
  return value && typeof value === "object" && ["usedSize", "totalSize", "embedderHeapUsedSize", "backingStorageSize"].every((key) => finiteNonnegative(value[key]));
}
function frameKey(frame = {}) {
  return `${frame.url ?? ""}\u0000${frame.functionName || "(anonymous)"}\u0000${frame.lineNumber ?? -1}\u0000${frame.columnNumber ?? -1}`;
}
function analyzeProfile(profile) {
  const shapeErrors = [];
  if (!profile || typeof profile !== "object") return { shapeErrors: ["missing stopped sampling profile"] };
  const head = profile.head;
  if (!head || typeof head !== "object") shapeErrors.push("missing profile.head tree");
  const flattened = [];
  const ids = new Set();
  let treeSizeSUM = 0;
  const byFrame = new Map();
  const visit = (node, parentId = null, depth = 0) => {
    if (!node || typeof node !== "object") { shapeErrors.push("tree child is not an object"); return; }
    if (!integerNonnegative(node.id)) shapeErrors.push("tree node has invalid id");
    else if (ids.has(node.id)) shapeErrors.push(`duplicate tree node id ${node.id}`);
    else ids.add(node.id);
    if (!finiteNonnegative(node.selfSize)) shapeErrors.push(`tree node ${node.id ?? "?"} has invalid selfSize`);
    else treeSizeSUM += node.selfSize;
    const callFrame = node.callFrame;
    if (!callFrame || typeof callFrame !== "object") shapeErrors.push(`tree node ${node.id ?? "?"} has no callFrame`);
    if (callFrame?.lineNumber !== undefined && (!Number.isSafeInteger(callFrame.lineNumber) || callFrame.lineNumber < -1)) shapeErrors.push(`tree node ${node.id ?? "?"} has invalid lineNumber`);
    if (callFrame?.columnNumber !== undefined && (!Number.isSafeInteger(callFrame.columnNumber) || callFrame.columnNumber < -1)) shapeErrors.push(`tree node ${node.id ?? "?"} has invalid columnNumber`);
    const row = {
      url: callFrame?.url ?? "",
      functionName: callFrame?.functionName || "(anonymous)",
      lineNumber: callFrame?.lineNumber ?? -1,
      columnNumber: callFrame?.columnNumber ?? -1,
    };
    const key = frameKey(row);
    const aggregate = byFrame.get(key) ?? { ...row, sampledAllocationBytes: 0, profileNodes: 0 };
    aggregate.sampledAllocationBytes += finiteNonnegative(node.selfSize) ? node.selfSize : 0;
    aggregate.profileNodes++;
    byFrame.set(key, aggregate);
    flattened.push({ id: node.id ?? null, parentId, depth, selfSize: node.selfSize, callFrame: callFrame ?? {} });
    if (node.children !== undefined && !Array.isArray(node.children)) shapeErrors.push(`tree node ${node.id ?? "?"} children is not an array`);
    for (const child of Array.isArray(node.children) ? node.children : []) visit(child, node.id ?? null, depth + 1);
  };
  if (head) visit(head);
  const treeTopFrames = [...byFrame.values()]
    .sort((a, b) => b.sampledAllocationBytes - a.sampledAllocationBytes)
    .slice(0, 50);

  const flatSamples = profile.samples;
  let flatSamplesSizeSUM = 0;
  const flatSamplesNodeIdNotFound = [];
  if (!Array.isArray(flatSamples)) shapeErrors.push("profile.samples is not an array");
  else {
    for (let i = 0; i < flatSamples.length; i++) {
      const sample = flatSamples[i];
      if (!sample || typeof sample !== "object") { shapeErrors.push(`flat sample ${i} is not an object`); continue; }
      if (!finiteNonnegative(sample.size)) shapeErrors.push(`flat sample ${i} has invalid size`);
      else flatSamplesSizeSUM += sample.size;
      if (!integerNonnegative(sample.nodeId)) shapeErrors.push(`flat sample ${i} has invalid nodeId`);
      else if (!ids.has(sample.nodeId)) flatSamplesNodeIdNotFound.push({ index: i, nodeId: sample.nodeId });
    }
  }
  return { shapeErrors, flattened, treeNodeCount: flattened.length, treeSizeSUM, flatSampleCount: flatSamples?.length ?? null,
    flatSamplesSizeSUM, flatSamplesNodeIdNotFound, treeTopFrames };
}
function validateSavedSummary(saved, independent) {
  if (!Array.isArray(saved)) return false;
  return sameJson(saved, independent.treeTopFrames);
}
function excerptChecks(excerpts, productionHashes, loadedResources) {
  const rows = [];
  const servedHashes = new Map((loadedResources ?? []).filter((r) => r.filename && r.sha256).map((r) => [r.filename, r.sha256]));
  for (const excerpt of excerpts ?? []) {
    const emittedFile = excerpt?.emittedExcerpt?.file;
    let resolvableFile = null;
    try { resolvableFile = `${buildDirectory}${new URL(excerpt?.url ?? "").pathname}`; } catch { /* builtin, inlined, or otherwise non-URL frame */ }
    const canResolveFromLockedServedAsset = Boolean(
      resolvableFile &&
      productionHashes?.[resolvableFile] &&
      servedHashes.get(resolvableFile) === productionHashes[resolvableFile] &&
      Number.isSafeInteger(excerpt?.lineNumber) && excerpt.lineNumber >= 0 &&
      Number.isSafeInteger(excerpt?.columnNumber) && excerpt.columnNumber >= 0,
    );
    const frame = {
      functionName: excerpt?.functionName,
      url: excerpt?.url,
      lineNumber: excerpt?.lineNumber,
      columnNumber: excerpt?.columnNumber,
      sampledAllocationBytes: excerpt?.sampledAllocationBytes,
      profileNodes: excerpt?.profileNodes,
      builtinCallerContext: excerpt?.builtinCallerContext ?? null,
      nearestAuthoredAncestor: excerpt?.nearestAuthoredAncestor ?? null,
    };
    if (excerpt?.emittedExcerpt === null) {
      rows.push({ ...frame, file: null, valid: !canResolveFromLockedServedAsset, attribution: "unresolved", reason: canResolveFromLockedServedAsset ? "null excerpt bypasses a loaded, hash-locked asset with a valid source position" : "no emitted source excerpt could be resolved from a loaded, hash-locked asset and valid source position" });
      continue;
    }
    if (!excerpt?.emittedExcerpt || typeof excerpt.emittedExcerpt !== "object") {
      rows.push({ ...frame, file: emittedFile ?? null, valid: false, attribution: "invalid", reason: "attribution entry has no explicit emittedExcerpt object or null" });
      continue;
    }
    const expected = productionHashes?.[emittedFile];
    const served = servedHashes.get(emittedFile);
    let valid = Boolean(expected && served && expected === served && excerpt.emittedExcerpt.sha256 === expected && excerpt.emittedExcerpt.verifiedServedSha256 === served);
    let detail = { ...frame, file: emittedFile, expectedSha256: expected ?? null, servedSha256: served ?? null };
    if (valid) {
      const code = readFile(path.resolve(root, emittedFile), "utf8");
      rows.push((async () => {
        const source = await code;
        const e = excerpt.emittedExcerpt;
        const lineStart = source.split("\n").slice(0, e.lineNumber).reduce((sum, line) => sum + line.length + 1, 0);
        const offset = Math.min(source.length, lineStart + e.columnNumber);
        const start = Math.max(0, offset - 160);
        const end = Math.min(source.length, offset + 160);
        const text = source.slice(start, end);
        const ok = e.lineNumber === excerpt.lineNumber && e.columnNumber === excerpt.columnNumber && e.offset === offset && e.start === start && e.end === end && e.text === text;
        return { ...detail, offset: e.offset, recomputedOffset: offset, start: e.start, recomputedStart: start, end: e.end, recomputedEnd: end, excerptSha256: sha256(Buffer.from(text)), valid: ok, attribution: "verified" };
      })());
    } else rows.push(Promise.resolve({ ...detail, valid: false, attribution: "invalid", reason: "emitted file is not a loaded, hash-locked production asset" }));
  }
  return Promise.all(rows);
}

let result, prereg, postlock, checkpoint, pilotManifest, worldJournalProof, nativeCompilerProof, protocolText;
try {
  result = await readJson(path.join(relativeResultDir, "FINALresults.json"));
  prereg = await readJson(path.join(relativeResultDir, "preregistration.json"));
  postlock = await readJson(path.join(relativeResultDir, "postlock.json"));
  checkpoint = await readJson(statusPath);
  pilotManifest = await readJson(pilotManifestPath);
  worldJournalProof = await readJson(worldJournalProofPath);
  nativeCompilerProof = await readFile(path.resolve(root, nativeCompilerProofPath), "utf8");
  protocolText = await readFile(path.resolve(root, protocolPath), "utf8");
} catch (error) {
  console.error(`Cannot read finalized diagnostic inputs: ${error}`);
  process.exitCode = 2;
  process.exit();
}

check("finalized-results", result.status === "PASS" && result.records?.length === selected.length,
  "Finalized collection must report PASS and contain the six selected pages.", { status: result.status, recordCount: result.records?.length ?? null });
check("run-id-consistency", Boolean(result.runId) && result.runId === prereg.runId && prereg.runId === postlock.runId,
  "Final results, preregistration, post-lock, and all selected page records must share one runId.", { result: result.runId, preregistration: prereg.runId, postlock: postlock.runId });
check("preregistration-identity", prereg.schemaVersion === 1 && prereg.study === "compiled-product-mixed-world-journal-memory-diagnostic" && prereg.status === "FROZEN_BEFORE_MEMORY_PROFILE",
  "Preregistration must identify the frozen world-dirty-journal memory diagnostic.", { study: prereg.study, status: prereg.status });

const archiveHash = await hashFile(archivePath);
const protocolHash = await hashFile(protocolPath);
const statusHash = await hashFile(statusPath);
const pilotManifestHash = await hashFile(pilotManifestPath);
const worldJournalProofHash = await hashFile(worldJournalProofPath);
const nativeCompilerProofHash = await hashFile(nativeCompilerProofPath);
check("protocol-pins-archive", archiveHash === expectedArchiveHash && protocolText.includes(expectedArchiveHash) && prereg.frozenInputs?.archive?.sha256 === archiveHash && checkpoint.archiveSha256 === archiveHash,
  "Protocol, preregistration, qualified status, and source/build archive must pin the same exact archive SHA-256.", { archiveHash, preregistered: prereg.frozenInputs?.archive?.sha256, statusArchive: checkpoint.archiveSha256 });
check("qualified-status", checkpoint.status === "WORLD_DIRTY_JOURNAL_CORRECTNESS_VERIFIED" && checkpoint.runtimeTests === 582 && checkpoint.rustTests === 29 && checkpoint.integrationCommands === 9 && checkpoint.candidateProductionPilotPages === 6,
  "Qualified world-dirty-journal status must match the pinned correctness counts.", { status: checkpoint.status, runtimeTests: checkpoint.runtimeTests, rustTests: checkpoint.rustTests, integrationCommands: checkpoint.integrationCommands, candidateProductionPilotPages: checkpoint.candidateProductionPilotPages });
check("pilot-manifest", pilotManifest.status === "PASS" && pilotManifest.scope && /correctness pilot/i.test(pilotManifest.scope) && prereg.frozenInputs?.pilotManifest?.sha256 === pilotManifestHash,
  "Six-page production correctness pilot must PASS and match its frozen manifest hash.", { status: pilotManifest.status, scope: pilotManifest.scope, sha256: pilotManifestHash });
check("pilot-record-set", sameJson(pilotManifest.records, expectedPilot.map(([arm, size]) => ({ arm, size, status: "PASS" }))),
  "Pilot manifest must contain exactly the six expected PASS arm and size records.", pilotManifest.records);
const manifestProof = { native: pilotManifest.nativeProof, react: pilotManifest.reactProof };
check("pilot-proof", sameJson(prereg.frozenInputs?.pilotProof, manifestProof) && prereg.frozenInputs?.pilotProof?.native?.arm === "native" && prereg.frozenInputs?.pilotProof?.native?.compiled === true && prereg.frozenInputs?.pilotProof?.native?.bindings === 3 && prereg.frozenInputs?.pilotProof?.native?.deltas === true && prereg.frozenInputs?.pilotProof?.native?.propOnly === true && prereg.frozenInputs?.pilotProof?.native?.deltaFallback === false && prereg.frozenInputs?.pilotProof?.react?.arm === "react" && prereg.frozenInputs?.pilotProof?.react?.compiled === true && prereg.frozenInputs?.pilotProof?.react?.rowMemoCache === true && prereg.frozenInputs?.pilotProof?.react?.boardMemoCache === true,
  "Frozen native and React compiler proofs must match the correctness-pilot evidence.", prereg.frozenInputs?.pilotProof ?? null);
const proofFrames = worldJournalProof.numericFrames ?? [];
const expectedDensities = [1, 4, 32];
const expectedSourceUpdates = [2, 8, 64];
const expectedProjections = [5, 20, 160];
const cellCutProofRowsOK = proofFrames.length === 3 && proofFrames.every((frame, i) =>
  frame.density === expectedDensities[i] &&
  frame.counters?.["numeric.program-batches"] === 1 &&
  frame.counters?.["numeric.program-source-updates"] === expectedSourceUpdates[i] &&
  frame.counters?.["numeric.program-projections"] === expectedProjections[i]);
const frozenWorldJournalProof = prereg.frozenInputs?.worldJournalProof;
check("native-cell-cut-execution-proof", worldJournalProof.status === "PASS" && worldJournalProof.captureCallsForEligibleCuts === 0 && worldJournalProof.captureNativeCalls === 5 && cellCutProofRowsOK && worldJournalProofHash === expectedCellCutProofHash && checkpoint.verificationSha256?.["verification/execution-proof.json"] === worldJournalProofHash && frozenWorldJournalProof?.path === worldJournalProofPath && frozenWorldJournalProof?.sha256 === worldJournalProofHash && frozenWorldJournalProof?.status === worldJournalProof.status && frozenWorldJournalProof?.captureCallsForEligibleCuts === 0 && frozenWorldJournalProof?.captureNativeCalls === worldJournalProof.captureNativeCalls && sameJson(frozenWorldJournalProof?.numericFrames?.map((frame) => ({ density: frame.density, counters: { batches: frame.counters?.batches, sourceUpdates: frame.counters?.sourceUpdates, projections: frame.counters?.projections } })), proofFrames.map((frame) => ({ density: frame.density, counters: { batches: frame.counters?.["numeric.program-batches"], sourceUpdates: frame.counters?.["numeric.program-source-updates"], projections: frame.counters?.["numeric.program-projections"] } }))),
  "Archived numeric cell-cut execution proof must be hash-locked and show zero eligible capture calls plus the expected sparse/dense batch, source-update, and projection counts.", { path: worldJournalProofPath, sha256: worldJournalProofHash, status: worldJournalProof.status, captureCallsForEligibleCuts: worldJournalProof.captureCallsForEligibleCuts, captureNativeCalls: worldJournalProof.captureNativeCalls, frames: proofFrames, preregistration: frozenWorldJournalProof });
const frozenCompilerProof = prereg.frozenInputs?.nativeCompilerEmission;
const nativeCompilerPlanBoundary = nativeCompilerProof.search(/\n\s*"component_module":/);
const nativeCompilerExecutablePrefix = nativeCompilerPlanBoundary > 0 ? nativeCompilerProof.slice(0, nativeCompilerPlanBoundary) : "";
const nativeProgramDescriptorCount = (nativeCompilerExecutablePrefix.match(/schemaVersion:\s*1/g) ?? []).length;
const nativeSourceSiteArrayCount = (nativeCompilerExecutablePrefix.match(/sourceSites:\s*\[/g) ?? []).length;
const nativeBindCallCount = (nativeCompilerExecutablePrefix.match(/__nativeBindStatePropAt\([\s\S]*?__nativeNumericPrograms\[\d+\]\)/g) ?? []).length;
check("native-compiler-emission-proof", nativeCompilerProofHash === expectedNativeCompilerHash && checkpoint.verificationSha256?.["verification/product-compiler-proof/native.js"] === nativeCompilerProofHash && nativeCompilerPlanBoundary > 0 && nativeProgramDescriptorCount === 3 && nativeSourceSiteArrayCount === 3 && nativeBindCallCount === 3 && (nativeCompilerExecutablePrefix.match(/sinkId:/g) ?? []).length === 3 && nativeCompilerExecutablePrefix.includes("ProductMixedRow#state:0") && nativeCompilerExecutablePrefix.includes("ProductMixedRow#state:1") && nativeCompilerExecutablePrefix.includes("ProductMixedRow#state:2") && frozenCompilerProof?.path === nativeCompilerProofPath && frozenCompilerProof?.sha256 === nativeCompilerProofHash && frozenCompilerProof?.numericProgramDescriptors === 3 && frozenCompilerProof?.numericProgramBindings === 3,
  "Archived native compiler output must be hash-locked and contain three Row numeric program descriptors and three bindings in executable output before the embedded source plan.", { path: nativeCompilerProofPath, sha256: nativeCompilerProofHash, numericProgramDescriptors: nativeProgramDescriptorCount, numericProgramBindings: nativeBindCallCount, preregistration: frozenCompilerProof });
for (const [arm, size] of expectedPilot) {
  const filename = `${pilotDir}/${arm}-${size}.json`;
  try {
    const pilot = await readJson(filename);
    const actualHash = await hashFile(filename);
    const locked = prereg.frozenInputs?.validatedPilotRecords?.find((row) => row.arm === arm && row.size === size);
    const valid = pilot.status === "PASS" && pilot.mode === "pilot" && pilot.production === true && pilot.arm === arm && pilot.size === size && pilot.frames === 60 && pilot.samples?.length === 60 && sameJson(Object.values(pilot.checks ?? {}), [true, true, true, true, true]) && sameJson(pilot.errors, []) && sameJson(pilot.browserErrors, []) && pilot.warmup === 5 && pilot.samples.filter((sample) => sample.structural).length === 2 && pilot.active?.writers === size && pilot.after?.writers === 0 && pilot.after?.mounts === pilot.after?.cleanups && pilot.active?.mounts === pilot.active?.cleanups + size && locked?.pageSha256 === actualHash;
    pilotHashes.push({ arm, size, sha256: actualHash });
    check(`pilot-page-${arm}-${size}`, valid, "Pilot page contents, lifecycle, checks, and frozen SHA-256 must match.", { expectedSha256: locked?.pageSha256 ?? null, actualSha256: actualHash, status: pilot.status });
  } catch (error) { check(`pilot-page-${arm}-${size}`, false, `Cannot validate pilot page: ${error}`); }
}
check("validated-pilot-lock-set", sameJson(prereg.frozenInputs?.validatedPilotRecords,
  pilotHashes.map(({ arm, size, sha256 }) => ({ arm, size, status: "PASS", pageSha256: sha256 }))),
  "Frozen validated pilot records must contain exactly the six page identities and hashes in the expected order.", prereg.frozenInputs?.validatedPilotRecords);
check("frozen-schedule-set", sameJson(prereg.frozenInputs?.schedule?.pages,
  selected.map(({ sequence, pair, arm, size }) => ({ sequence, pair, arm, size }))),
  "Frozen selected schedule must contain exactly the six requested pages in sequence order.", prereg.frozenInputs?.schedule?.pages);

const frozen = prereg.frozenInputs ?? {};
const productionHashes = frozen.productionFiles ?? {};
const sourceHashes = frozen.sourceFiles ?? {};
const inputLocks = frozen.inputLocks ?? {};
const candidateSourceBuildHashes = checkpoint.sourceAndBuildSha256 ?? {};
const expectedProductionPaths = Object.keys(productionHashes).sort();
const expectedCommon = expectedProductionPaths.filter((p) => !/native_product_mixed_arm-|product_mixed_react_arm-/.test(p));
check("frozen-reference-hashes", frozen.protocol?.path === protocolPath && frozen.protocol?.sha256 === protocolHash && frozen.status?.path === statusPath && frozen.status?.sha256 === statusHash && frozen.status?.qualifiedStatus === "WORLD_DIRTY_JOURNAL_CORRECTNESS_VERIFIED" && frozen.archive?.path === archivePath && frozen.archive?.sha256 === archiveHash && frozen.pilotManifest?.path === pilotManifestPath && frozen.pilotManifest?.sha256 === pilotManifestHash && frozen.worldJournalProof?.path === worldJournalProofPath && frozen.worldJournalProof?.sha256 === worldJournalProofHash && frozen.schedule?.path === schedulePath && frozen.schedule?.sha256 === inputLocks[schedulePath] && frozen.collector?.path === "scripts/profile_product_mixed_world_journal_memory.mjs" && frozen.collector?.sha256 === inputLocks[frozen.collector?.path] && frozen.independentVerifier?.path === verifierPath && frozen.independentVerifier?.sha256 === inputLocks[verifierPath],
  "Frozen preregistration references must agree with the current protocol, status, archive, pilot manifest, schedule, and collector locks.", { protocol: frozen.protocol, status: frozen.status, archive: frozen.archive, pilotManifest: frozen.pilotManifest, schedule: frozen.schedule, collector: frozen.collector });
const expectedBuildHTML = `${buildDirectory}/product-mixed-v2.html`;
const assetPathsOK = expectedProductionPaths.length === 5 && expectedProductionPaths.includes(expectedBuildHTML) && expectedProductionPaths.every((p) => p.startsWith(`${buildDirectory}/`)) && expectedCommon.length === 3 && expectedProductionPaths.filter((p) => /native_product_mixed_arm-/.test(p)).length === 1 && expectedProductionPaths.filter((p) => /product_mixed_react_arm-/.test(p)).length === 1 && Object.keys(sourceHashes).length === expectedSourcePaths.length && expectedSourcePaths.every((p) => sourceHashes[p]);
check("locked-source-and-build-inventory", assetPathsOK, "Frozen source/build inventory must contain the five source files and exactly five production build files.", { productionFiles: productionHashes, sourceFiles: sourceHashes });
const requiredLockPaths = [archivePath, statusPath, pilotManifestPath, worldJournalProofPath, nativeCompilerProofPath, protocolPath, schedulePath, frozen.collector?.path, verifierPath, ...Object.keys(candidateSourceBuildHashes), ...expectedProductionPaths, ...expectedSourcePaths, ...expectedPilot.map(([arm, size]) => `${pilotDir}/${arm}-${size}.json`)];
const requiredPaths = [...new Set(requiredLockPaths.filter(Boolean))].sort();
const lockSetOK = sameJson(Object.keys(inputLocks).sort(), requiredPaths);
check("pre-lock-inventory", lockSetOK, "Preregistration pre-lock must list the complete frozen protocol, archive, status, proof, source, build, pilot, schedule, and collector inventory exactly once.", { expectedPaths: requiredPaths, observedPaths: Object.keys(inputLocks).sort() });
const lockResults = [];
for (const filename of requiredPaths) {
  try {
    const actual = await hashFile(filename);
    lockResults.push({ filename, expected: inputLocks[filename], actual, matches: inputLocks[filename] === actual });
  } catch (error) { lockResults.push({ filename, expected: inputLocks[filename], actual: null, matches: false, error: String(error) }); }
}
check("frozen-input-hashes", lockResults.length === requiredPaths.length && lockResults.every((row) => row.matches),
  "Every pre-locked source, build, protocol, checkpoint, archive, proof, pilot, schedule, and collector file must still match its SHA-256.", lockResults);
const mapsMatchStatus = sameJson(sourceHashes, Object.fromEntries(expectedSourcePaths.map((filename) => [filename, candidateSourceBuildHashes[filename]]))) &&
  expectedProductionPaths.every((filename) => productionHashes[filename] === candidateSourceBuildHashes[filename]) &&
  expectedSourcePaths.every((filename) => inputLocks[filename] === sourceHashes[filename]) &&
  expectedProductionPaths.every((filename) => inputLocks[filename] === productionHashes[filename]);
check("source-build-maps-match-status", mapsMatchStatus,
  "Preregistered source and production asset hashes must exactly match the qualified status inventory and their corresponding pre-lock entries.", {
    sourceFileCount: Object.keys(sourceHashes).length,
    productionFileCount: expectedProductionPaths.length,
  });
let archivedHashes = null;
try {
  const archiveInventoryJson = execFileSync("python3", ["-c", `import hashlib, json, sys, tarfile
members = {}
with tarfile.open(sys.argv[1], "r:gz") as archive:
    for member in archive:
        stream = archive.extractfile(member)
        if stream is None:
            raise RuntimeError("Cannot read archive member: " + member.name)
        digest = hashlib.sha256()
        while True:
            chunk = stream.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
        stream.close()
        members[member.name] = digest.hexdigest()
print(json.dumps(members, sort_keys=True))`, archivePath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  archivedHashes = JSON.parse(archiveInventoryJson);
} catch (error) {
  diagnostics.push({ type: "archive-inventory-read-error", detail: String(error) });
}
check("source-archive-members", archivedHashes !== null && sameJson(archivedHashes, candidateSourceBuildHashes),
  "The source/build archive member set and each member SHA-256 must independently match the qualified status inventory.", {
    archivedMemberCount: archivedHashes ? Object.keys(archivedHashes).length : null,
    statusMemberCount: Object.keys(candidateSourceBuildHashes).length,
  });
const postRecords = postlock.records ?? [];
const postMap = Object.fromEntries(postRecords.map((row) => [row.filename, row]));
check("post-lock-inventory", postlock.status === "PASS" && postlock.mismatches?.length === 0 && sameJson(postRecords.map((row) => row.filename).sort(), requiredPaths) && requiredPaths.every((filename) => postMap[filename]?.expected === inputLocks[filename] && postMap[filename]?.observed === inputLocks[filename] && postMap[filename]?.matches === true),
  "Post-lock must pass with the exact same inventory and hashes as the preregistration pre-lock.", { status: postlock.status, mismatchCount: postlock.mismatches?.length, expectedCount: requiredPaths.length, observedCount: postRecords.length });

const browser = prereg.browser ?? {};
check("browser-configuration", browser.origin === expectedOrigin && browser.mode === "confirm" && browser.headless === false && browser.gpu === false && browser.viewport?.width === 1200 && browser.viewport?.height === 900 && browser.freshContexts === true && browser.serial === true && browser.samplingIntervalBytes === 32768 && browser.includeObjectsCollectedByMajorGC === true && browser.includeObjectsCollectedByMinorGC === true && browser.samplingBeginsOnAboutBlankBeforeNavigation === true,
  "Preregistration must lock headed GPU-disabled fresh serial 1200×900 CDP sampling at 32,768 bytes including major and minor GC objects.", browser);
check("cdp-method-inventory", sameJson(browser.cdpMethods, ["HeapProfiler.collectGarbage", "Runtime.getHeapUsage", "HeapProfiler.startSampling", "HeapProfiler.getSamplingProfile", "HeapProfiler.stopSampling"]),
  "Preregistration must record the CDP methods used for the heap and sampling-profile captures.", browser.cdpMethods);
check("workload-configuration", sameJson(prereg.workload?.sequences, selected.map((p) => p.sequence)) && prereg.workload?.warmupFrames === 60 && prereg.workload?.measuredFrames === 240,
  "Preregistration must select sequences 0/1/10/11/20/21 with 60 warmup and 240 measured frames.", prereg.workload);

const productionByBasename = new Map(Object.entries(productionHashes).map(([filename, hash]) => [path.basename(filename), { filename, hash }]));
const profileResults = [];
for (const expected of selected) {
  const recordRef = result.records?.find((row) => row.sequence === expected.sequence);
  let page;
  try { page = await readJson(path.join(relativeResultDir, expected.file)); }
  catch (error) { check(`page-record-${expected.sequence}`, false, `Cannot read page record ${expected.file}: ${error}`); continue; }
  const pageIdentity = page.schemaVersion === 1 && page.study === prereg.study && page.runId === result.runId && page.origin === expectedOrigin && page.sequence === expected.sequence && page.pair === expected.pair && page.arm === expected.arm && page.size === expected.size && Number.isFinite(Date.parse(page.startedAt)) && Number.isFinite(Date.parse(page.finishedAt)) && Date.parse(page.finishedAt) >= Date.parse(page.startedAt) && recordRef?.file === expected.file && recordRef?.status === page.status;
  check(`selected-page-${expected.sequence}`, pageIdentity, `Page must match frozen sequence ${expected.sequence}, pair, arm, size, result index, and shared runId.`, { runId: page.runId, sequence: page.sequence, pair: page.pair, arm: page.arm, size: page.size, status: page.status });
  const scheduled = prereg.frozenInputs?.schedule?.pages?.find((row) => row.sequence === expected.sequence);
  check(`schedule-page-${expected.sequence}`, scheduled?.sequence === expected.sequence && scheduled?.pair === 0 && scheduled?.arm === expected.arm && scheduled?.size === expected.size,
    "Selected page must match the frozen sequence schedule.", scheduled ?? null);
  const harness = page.harnessResult ?? {};
  const samples = harness.samples ?? [];
  const expectedFrames = Array.from({ length: 240 }, (_, i) => i + 61);
  const expectedStructuralFrames = [90, 120, 150, 180, 210, 240, 270, 300];
  const observedStructuralFrames = samples.filter((sample) => sample.structural).map((sample) => sample.frame);
  const timingOK = samples.length === 240 && sameJson(samples.map((s) => s.frame), expectedFrames) && samples.every((s) => finiteNonnegative(s.commitMs) && finiteNonnegative(s.intervalMs)) && sameJson(observedStructuralFrames, expectedStructuralFrames);
  check(`harness-${expected.sequence}`, harness.status === "PASS" && harness.mode === "confirm" && harness.production === true && harness.sequence === expected.sequence && harness.pair === 0 && harness.arm === expected.arm && harness.size === expected.size && harness.warmup === 60 && harness.frames === 240 && timingOK,
    "Harness must PASS on frames 61–300 with 240 samples, eight structural frames, and finite nonnegative timing fields.", { status: harness.status, samples: samples.length, observedStructuralFrames, timingOK });
  const expectedChecks = ["identity", "lifecycle", "order", "output", "visible"];
  check(`checks-errors-${expected.sequence}`, sameJson(Object.keys(harness.checks ?? {}).sort(), expectedChecks) && Object.values(harness.checks ?? {}).every((value) => value === true) && sameJson(harness.errors, []) && sameJson(page.browserErrors, []),
    "All five correctness checks must be true and harness/browser errors empty.", { checks: harness.checks, errors: harness.errors, browserErrors: page.browserErrors });
  check(`heap-usage-${expected.sequence}`, validHeapUsage(page.heapUsageBaseline) && validHeapUsage(page.heapUsageAfterHarnessTeardown) && validHeapUsage(page.heapUsageAfterForcedGC),
    "Baseline, post-teardown, and post-GC Runtime.getHeapUsage fields must be finite and nonnegative.", { baseline: page.heapUsageBaseline, afterHarnessTeardown: page.heapUsageAfterHarnessTeardown, afterForcedGC: page.heapUsageAfterForcedGC });
  check(`sampling-config-${expected.sequence}`, page.sampling?.startedBeforeNavigation === true && page.sampling?.samplingIntervalBytes === 32768 && page.sampling?.includeObjectsCollectedByMajorGC === true && page.sampling?.includeObjectsCollectedByMinorGC === true && page.sampling?.scope === prereg.profileScope,
    "Each page must start 32,768-byte sampling before navigation and include objects collected by both major and minor GC.", page.sampling);
  check(`lifecycle-${expected.sequence}`, harness.active?.writers === expected.size && harness.active?.mounts === expected.size + 64 && harness.active?.cleanups === 64 && harness.after?.writers === 0 && harness.after?.mounts === harness.after?.cleanups,
    "Mounted lifecycle must show size writers plus 8×8=64 structural mounts/cleanups, followed by zero writers and balanced teardown.", { active: harness.active, after: harness.after, expectedSize: expected.size });

  const loaded = page.loadedBuildResources ?? [];
  const loadedNames = new Set(loaded.map((r) => path.basename(r.filename ?? "")));
  const armRegex = expected.arm === "native" ? /^native_product_mixed_arm-/ : /^product_mixed_react_arm-/;
  const otherRegex = expected.arm === "native" ? /^product_mixed_react_arm-/ : /^native_product_mixed_arm-/;
  const loadedChecks = loaded.map((resource) => {
    const locked = productionByBasename.get(path.basename(resource.filename ?? ""));
    let urlMatches = false;
    try {
      const servedUrl = new URL(resource.url);
      urlMatches = servedUrl.origin === expectedOrigin && `${buildDirectory}${servedUrl.pathname}` === resource.filename;
    } catch { /* malformed or missing served URL */ }
    return { url: resource.url, filename: resource.filename, status: resource.status, sha256: resource.sha256, valid: Boolean(urlMatches && locked && resource.status === 200 && resource.sha256 === locked.hash && resource.filename === locked.filename) };
  });
  const expectedNames = [...expectedCommon.map((p) => path.basename(p)), ...expectedProductionPaths.filter((p) => armRegex.test(path.basename(p))).map((p) => path.basename(p))];
  const resourcesOK = loaded.length === expectedNames.length && loadedChecks.every((r) => r.valid) && expectedNames.every((n) => loadedNames.has(n)) && ![...loadedNames].some((n) => otherRegex.test(n));
  check(`loaded-assets-${expected.sequence}`, resourcesOK, "Each page must serve exactly the locked common files plus its selected arm, with no opposite-arm resource.", { expectedNames, loaded: loadedChecks });

  const profile = page.cdp?.stoppedSamplingProfile;
  const independent = analyzeProfile(profile);
  profileSummaries[expected.sequence] = {
    treeNodeCount: independent.treeNodeCount ?? null,
    treeSizeSUM: independent.treeSizeSUM ?? null,
    flatSampleCount: independent.flatSampleCount ?? null,
    flatSamplesSizeSUM: independent.flatSamplesSizeSUM ?? null,
    flatSamplesNodeIdNotFound: independent.flatSamplesNodeIdNotFound ?? [],
  };
  const profileOK = independent.shapeErrors.length === 0 && independent.treeNodeCount > 0 && independent.treeSizeSUM >= 0 && independent.flatSampleCount > 0 && independent.flatSamplesSizeSUM >= 0;
  check(`raw-profile-${expected.sequence}`, profileOK, "Stopped CDP profile must have the actual tree and flat-sample shapes, unique node IDs, and finite nonnegative sizes.", { shapeErrors: independent.shapeErrors, treeNodeCount: independent.treeNodeCount, treeSizeSUM: independent.treeSizeSUM, flatSampleCount: independent.flatSampleCount, flatSamplesSizeSUM: independent.flatSamplesSizeSUM });
  if (independent.flatSamplesNodeIdNotFound?.length) diagnostics.push({ sequence: expected.sequence, type: "flat-sample-nodeId-not-found", count: independent.flatSamplesNodeIdNotFound.length, examples: independent.flatSamplesNodeIdNotFound.slice(0, 20), note: "Reported as a CDP diagnostic; not treated as a schema failure." });
  const flattened = page.cdp?.flattenedTreeNodes;
  const flatMatches = Array.isArray(flattened) && sameJson(flattened, independent.flattened);
  check(`flattened-tree-${expected.sequence}`, flatMatches, "Collector flattened-tree representation must match an independent preorder traversal of the raw CDP tree.", { savedNodeCount: flattened?.length ?? null, recomputedNodeCount: independent.treeNodeCount });
  check(`tree-preservation-${expected.sequence}`, sameJson(page.cdp?.stoppedProfileTree, profile?.head), "Saved raw profile tree must preserve the stopped profile head exactly.", { savedTreePresent: Boolean(page.cdp?.stoppedProfileTree), rawTreePresent: Boolean(profile?.head) });
  const savedSummary = page.cdp?.stoppedSummaryTopFrames;
  check(`tree-selfsize-summary-${expected.sequence}`, validateSavedSummary(savedSummary, independent), "Saved summary must equal independent aggregation of node.selfSize by URL, function name, line, and column; inclusive parent sizes are not summed.", { treeSizeSUM: independent.treeSizeSUM, topFrameCount: independent.treeTopFrames?.length ?? null, savedTopFrameCount: savedSummary?.length ?? null });
  const attributedFrames = page.cdp?.topFrameAttribution;
  const attributedFrameSummary = Array.isArray(attributedFrames) ? attributedFrames.map((frame) => ({
    url: frame.url ?? "",
    functionName: frame.functionName || "(anonymous)",
    lineNumber: frame.lineNumber ?? -1,
    columnNumber: frame.columnNumber ?? -1,
    sampledAllocationBytes: frame.sampledAllocationBytes,
    profileNodes: frame.profileNodes,
  })) : null;
  check(`top-frame-attribution-${expected.sequence}`, sameJson(attributedFrameSummary, independent.treeTopFrames), "All saved top-frame attribution tuples, selfSize totals, counts, and order must match the independent raw-tree aggregation.", { savedTopFrameCount: attributedFrameSummary?.length ?? null, recomputedTopFrameCount: independent.treeTopFrames?.length ?? null });
  const savedFlat = page.cdp?.stoppedFlatSamples;
  check(`flat-sample-preservation-${expected.sequence}`, sameJson(savedFlat, profile?.samples), "Saved flat CDP samples must exactly preserve raw profile.samples.", { savedCount: savedFlat?.length ?? null, rawCount: profile?.samples?.length ?? null });
  const excerpts = await excerptChecks(attributedFrames, productionHashes, loaded);
  for (const row of excerpts.filter((item) => item.attribution === "verified" && item.valid)) verifiedAllocationFrames.push({ sequence: expected.sequence, arm: expected.arm, size: expected.size, functionName: row.functionName, url: row.url, sampledAllocationBytes: row.sampledAllocationBytes, profileNodes: row.profileNodes, productionFile: row.file, productionSha256: row.expectedSha256, excerptSha256: row.excerptSha256, offset: row.offset, excerptStart: row.start, excerptEnd: row.end });
  for (const row of excerpts.filter((item) => item.attribution === "unresolved")) unresolvedAllocationFrames.push({ sequence: expected.sequence, arm: expected.arm, size: expected.size, ...row });
  check(`source-excerpts-${expected.sequence}`, excerpts.length > 0 && excerpts.every((row) => row.valid), "Every emitted production excerpt must match the locked served asset hash and independently recomputed line/column offsets and text.", excerpts);
  check(`page-status-${expected.sequence}`, page.status === "PASS" && !page.failure, "Collector page record must retain PASS status and no failure.", { status: page.status, failure: page.failure ?? null });
  profileResults.push({ sequence: expected.sequence, arm: expected.arm, size: expected.size, status: page.status });
}

check("record-set", sameJson(result.records?.map(({ sequence, pair, arm, size, status, file }) => ({ sequence, pair, arm, size, status, file })), selected.map(({ sequence, pair, arm, size, file }) => ({ sequence, pair, arm, size, status: "PASS", file }))),
  "Final records must contain exactly the six selected pages in scheduled order, all PASS.", result.records);
check("collection-postlock-status", result.postlock?.path === "postlock.json" && result.postlock?.status === postlock.status && result.postlock?.mismatches?.length === 0,
  "Final results must reference the passing post-lock evidence with no mismatches.", result.postlock);

const verification = {
  schemaVersion: 1,
  study: "compiled-product-mixed-world-journal-memory-independent-verification",
  checkedAt: new Date().toISOString(),
  inputResults: path.relative(root, path.join(resultDir, "FINALresults.json")),
  repairProvenance: {
    originalVerifierPath: verifierPath,
    originalVerifierSha256: await hashFile(verifierPath),
    currentVerifierPath,
    currentVerifierSha256: await hashFile(currentVerifierPath),
    preservedFirstFailureLogPath: priorFailureLogPath,
    preservedFirstFailureLogSha256: await hashFile(priorFailureLogPath),
  },
  runId: result.runId,
  status: failures.length === 0 ? "PASS" : "FAIL",
  summary: {
    checkCount: checks.length,
    passed: checks.filter((row) => row.status === "PASS").length,
    failed: failures.length,
    perPageAllocationDiagnostics: profileSummaries,
    largestVerifiedAllocationFrames: verifiedAllocationFrames.sort((a, b) => b.sampledAllocationBytes - a.sampledAllocationBytes).slice(0, 30),
    unresolvedAllocationFrames,
    pilotHashes,
    diagnostics,
  },
  checks,
  failures,
  interpretation: "Independent integrity and CDP allocation-profile verification only. Tree node selfSize sums and flat sample size sums are reported separately; they are different CDP outputs. This diagnostic does not establish general memory-leak or speed claims.",
};
const verificationPath = path.join(resultDir, verificationFilename);
await writeFile(verificationPath, `${JSON.stringify(verification, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ status: verification.status, runId: verification.runId, checkCount: verification.summary.checkCount, passed: verification.summary.passed, failed: failures.length, verificationPath: path.relative(root, verificationPath), failures }, null, 2));
if (verification.status !== "PASS") process.exitCode = 1;
