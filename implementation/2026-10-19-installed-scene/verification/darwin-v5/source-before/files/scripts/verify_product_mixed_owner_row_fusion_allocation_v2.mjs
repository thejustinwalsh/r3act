import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

// Independent integrity verifier. It reads an already completed collection and
// writes verification.json exclusively; it never starts a browser or server.
const root = process.cwd();
const output = "results/product-mixed-owner-row-fusion-allocation";
const statusPath = "implementation/2026-10-13-owner-row-fusion/status.json";
const archivePath = "implementation/2026-10-13-owner-row-fusion/source-and-evidence.tar.gz";
const pilotDir = "results/product-mixed-owner-row-fusion-pilot";
const pilotManifestPath = `${pilotDir}/results.json`;
const pilotVerifierPath = "scripts/verify_product_mixed_owner_row_fusion_pilot.mjs";
const pilotEvidenceVerifierPath = "scripts/verify_product_mixed_owner_row_fusion_pilot_evidence.mjs";
const diagnosticPath = "results/numeric-cell-storage-candidate-v5/diagnostic.json";
const timingDirectory = "implementation/2026-10-13-owner-row-fusion-timing";
const timingStatusPath = `${timingDirectory}/status.json`;
const timingArchivePath = `${timingDirectory}/evidence.tar.gz`;
const buildDirectory = "dist-product-mixed-compiled-owner-row-fusion";
const verifierPath = "scripts/verify_product_mixed_owner_row_fusion_allocation.mjs";
const archiveSha256 = "cbe4ce3f557314fa093ac51214a2ba5e9cf0a5f0ad67b5429ce3a95a5e59a382";
const sequences = [0, 1, 10, 11, 20, 21];
const schedule = new Map([
  [0, { pair: 0, arm: "react", size: 128 }], [1, { pair: 0, arm: "native", size: 128 }],
  [10, { pair: 0, arm: "react", size: 512 }], [11, { pair: 0, arm: "native", size: 512 }],
  [20, { pair: 0, arm: "react", size: 1024 }], [21, { pair: 0, arm: "native", size: 1024 }],
]);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = async (name) => JSON.parse(await readFile(path.resolve(root, name), "utf8"));
const hashFile = async (name) => sha(await readFile(path.resolve(root, name)));
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}
function archiveInventory() {
  const py = `import hashlib,json,sys,tarfile\nm={}\nwith tarfile.open(sys.argv[1], 'r:gz') as t:\n for x in t:\n  f=t.extractfile(x)\n  if f is None or x.name in m: raise RuntimeError('invalid archive member '+x.name)\n  h=hashlib.sha256()\n  while True:\n   b=f.read(1048576)\n   if not b: break\n   h.update(b)\n  m[x.name]=h.hexdigest()\nprint(json.dumps(m,sort_keys=True))`;
  return JSON.parse(execFileSync("python3", ["-c", py, archivePath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));
}
const checks = [];
const add = (id, ok, details = null) => checks.push({ id, status: ok ? "PASS" : "FAIL", details });
const finite = (x) => typeof x === "number" && Number.isFinite(x) && x >= 0;
function profileStats(profile) {
  const errors = [];
  const flattened = [];
  const ids = new Set();
  const frames = new Map();
  let treeSelfSize = 0;
  const visit = (node, parentId = null, depth = 0) => {
    if (!node || typeof node !== "object") { errors.push("invalid tree node"); return; }
    if (!Number.isSafeInteger(node.id) || node.id < 0 || ids.has(node.id)) errors.push(`invalid or duplicate node id ${node.id}`);
    ids.add(node.id);
    if (!finite(node.selfSize)) errors.push(`invalid selfSize at node ${node.id}`);
    else treeSelfSize += node.selfSize;
    const cf = node.callFrame;
    if (!cf || typeof cf !== "object") errors.push(`missing callFrame at node ${node.id}`);
    const row = { url: cf?.url ?? "", functionName: cf?.functionName || "(anonymous)", lineNumber: cf?.lineNumber ?? -1, columnNumber: cf?.columnNumber ?? -1 };
    const key = `${row.url}\0${row.functionName}\0${row.lineNumber}\0${row.columnNumber}`;
    const agg = frames.get(key) ?? { ...row, sampledAllocationBytes: 0, profileNodes: 0 };
    agg.sampledAllocationBytes += finite(node.selfSize) ? node.selfSize : 0;
    agg.profileNodes++;
    frames.set(key, agg);
    flattened.push({ id: node.id ?? null, parentId, depth, selfSize: node.selfSize, callFrame: cf ?? {} });
    if (node.children !== undefined && !Array.isArray(node.children)) errors.push(`children is not an array at ${node.id}`);
    for (const child of node.children ?? []) visit(child, node.id, depth + 1);
  };
  if (!profile?.head) errors.push("missing profile head"); else visit(profile.head);
  const flat = profile?.samples;
  let flatBytes = 0;
  const badSampleNodes = [];
  if (!Array.isArray(flat)) errors.push("samples is not an array");
  else flat.forEach((sample, i) => {
    if (!finite(sample?.size)) errors.push(`invalid flat sample size ${i}`); else flatBytes += sample.size;
    if (!Number.isSafeInteger(sample?.nodeId) || sample.nodeId < 0) errors.push(`invalid flat sample node ${i}`);
    else if (!ids.has(sample.nodeId)) badSampleNodes.push({ index: i, nodeId: sample.nodeId });
  });
  const top = [...frames.values()].sort((a, b) => b.sampledAllocationBytes - a.sampledAllocationBytes).slice(0, 50);
  return { errors, flattened, ids, treeSelfSize, flatBytes, flatSampleCount: flat?.length ?? 0, badSampleNodes, top };
}

const final = await readJson(`${output}/FINALresults.json`);
const prereg = await readJson(`${output}/preregistration.json`);
const manifest = await readJson(`${output}/manifest.json`);
const postlock = await readJson(`${output}/postlock.json`);
const checkpoint = await readJson(statusPath);
const pilot = await readJson(pilotManifestPath);
const diagnostic = await readJson(diagnosticPath);
const timingStatus = await readJson(timingStatusPath);
const authoredProofPath = prereg.frozenInputs?.proofs?.authoredOwnerRow?.path;
const threeProofPath = prereg.frozenInputs?.proofs?.actualThreeOwnerRow?.path;
const authoredProof = await readJson(authoredProofPath);
const threeProof = await readJson(threeProofPath);
const study = "compiled-product-mixed-owner-row-fusion-allocation-diagnostic";
add("result-status", final.status === "PASS" && manifest.status === "PASS" && prereg.status === "FROZEN_BEFORE_ALLOCATION_PROFILE", { final: final.status, manifest: manifest.status, prereg: prereg.status });
add("identity", final.study === study && prereg.study === study && manifest.study === study && final.runId === prereg.runId && manifest.runId === prereg.runId && postlock.runId === prereg.runId, { runId: prereg.runId });
add("checkpoint-status", checkpoint.status === "UNIT_AUTHORED_THREE_AND_PRODUCTION_BUILD_VERIFIED" && checkpoint.archiveSha256 === archiveSha256 && checkpoint.archiveMembers === 1093 && checkpoint.runtimeTests === 695 && checkpoint.rustTests === 33 && checkpoint.speedGate === "UNMEASURED_CURRENT_REVISION" && checkpoint.latestMeasuredRuntimeSpeedGate === "FAIL_OWNER_ROWS_27_TO_43_PERCENT_SLOWER", { status: checkpoint.status, timingResult: checkpoint.latestMeasuredRuntimeSpeedGate });
const timingArchiveHash = await hashFile(timingArchivePath);
let timingEvidenceMatches = false;
try {
  const py = `import hashlib,json,sys,tarfile\nm={}\nwith tarfile.open(sys.argv[1], 'r:gz') as t:\n for x in t:\n  f=t.extractfile(x)\n  if f is None or x.name in m: raise RuntimeError('invalid archive member '+x.name)\n  h=hashlib.sha256()\n  while True:\n   b=f.read(1048576)\n   if not b: break\n   h.update(b)\n  m[x.name]=h.hexdigest()\nprint(json.dumps(m,sort_keys=True))`;
  const members = JSON.parse(execFileSync("python3", ["-c", py, timingArchivePath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));
  timingEvidenceMatches = same(members, timingStatus.evidenceSha256) && Object.keys(members).length === timingStatus.archiveMembers;
  for (const [file, expected] of Object.entries(timingStatus.evidenceSha256 ?? {})) if (await hashFile(file).catch(() => null) !== expected) timingEvidenceMatches = false;
} catch { timingEvidenceMatches = false; }
add("current-timing-evidence", timingStatus.status === "TIMING_VERIFIED_SPEED_FAIL" && timingStatus.speedGate === "FAIL" && timingStatus.allocationGate === "UNMEASURED_CURRENT_REVISION" && timingStatus.sourceArchiveSha256 === archiveSha256 && timingArchiveHash === "06a33b0b9d403802877066972cc8ead67e68aba9356f9c715f95005b258cd23c" && timingStatus.archiveSha256 === timingArchiveHash && timingEvidenceMatches, { status: timingStatus.status, speedGate: timingStatus.speedGate, allocationGate: timingStatus.allocationGate, archiveSha256: timingArchiveHash, evidenceCount: Object.keys(timingStatus.evidenceSha256 ?? {}).length });

const maps = [checkpoint.sourceAndBuildSha256, checkpoint.verificationSha256, checkpoint.historicalVerificationSha256];
const mapSizes = maps.map((x) => Object.keys(x ?? {}).length);
const union = [...new Set(maps.flatMap((x) => Object.keys(x ?? {})))].sort();
const archived = archiveInventory();
add("archive-hash-and-inventory", await hashFile(archivePath) === archiveSha256 && mapSizes.join(",") === "1004,25,64" && union.length === 1093 && same(Object.keys(archived).sort(), union), { mapSizes, unionCount: union.length, archiveCount: Object.keys(archived).length });
let archiveBytesMatch = true;
for (const map of maps) for (const [file, expected] of Object.entries(map ?? {})) {
  if (archived[file] !== expected || await hashFile(file) !== expected) archiveBytesMatch = false;
}
add("archive-and-live-member-bytes", archiveBytesMatch);
add("frozen-status-claims", checkpoint.qualifiedEngineDiagnostic === diagnosticPath && diagnostic.status === "PASS" && diagnostic.attempt === "v5" && same(diagnostic.bundledInputHashes, diagnostic.bundledInputHashesAfterBundle));

const pilotStatusPath = "implementation/2026-10-13-owner-row-fusion-pilot/status.json";
const pilotArchivePath = "implementation/2026-10-13-owner-row-fusion-pilot/evidence.tar.gz";
const pilotVerificationPath = `${pilotDir}/verification.json`;
const pilotStatus = await readJson(pilotStatusPath);
const pilotVerification = await readJson(pilotVerificationPath);
const productionFiles = Object.fromEntries(Object.entries(checkpoint.sourceAndBuildSha256).filter(([name]) => name.startsWith(`${buildDirectory}/`)));
const engineEpoch = { product: diagnostic.browserVersion.product, jsVersion: diagnostic.browserVersion.jsVersion, revision: diagnostic.browserVersion.revision };
add("pilot-proof-and-engine", pilot.status === "PASS" && pilot.scope === "Correctness pilot only; no confirmatory performance evidence" && pilotStatus.status === "PRODUCTION_CORRECTNESS_PILOT_VERIFIED" && await hashFile(pilotArchivePath) === pilotStatus.archiveSha256 && pilotVerification.status === "PASS" && same(pilot.engineEpoch, engineEpoch), { pilotStatus: pilot.status, engineEpoch, pilotEngineEpoch: pilot.engineEpoch });
add("pilot-production-assets", Object.keys(productionFiles).length === 5 && same(pilot.productionSha256, productionFiles) && same(pilot.servedAssetSha256, productionFiles) && same(pilot.engineEpoch, engineEpoch), { files: Object.keys(productionFiles) });
const expectedPilotPairs = [["native", 128], ["react", 128], ["native", 512], ["react", 512], ["native", 1024], ["react", 1024]];
add("pilot-record-index", same(pilot.records, expectedPilotPairs.map(([arm, size]) => ({ arm, size, status: "PASS" }))) && pilot.pageFiles?.length === 6, pilot.records);
let pilotPagesOK = true;
for (const [arm, size] of expectedPilotPairs) {
  const file = `${pilotDir}/${arm}-${size}.json`;
  const row = pilot.pageFiles?.find((item) => item.arm === arm && item.size === size);
  const raw = await readJson(file);
  if (row?.file !== `${arm}-${size}.json` || row.sha256 !== await hashFile(file) || raw.status !== "PASS" || raw.arm !== arm || raw.size !== size || raw.frames !== 60 || raw.samples?.length !== 60 || raw.warmup !== 5 || !same(Object.values(raw.checks ?? {}), [true, true, true, true, true]) || !same(raw.errors, []) || !same(raw.browserErrors, []) || raw.samples.filter((sample) => sample.structural).length !== 2 || raw.active?.writers !== size || raw.active?.mounts !== size + 16 || raw.active?.cleanups !== 16 || raw.after?.writers !== 0 || raw.after?.mounts !== raw.after?.cleanups) pilotPagesOK = false;
}
add("pilot-page-content-lifecycle", pilotPagesOK);
const authoredAssertions = authoredProof.assertions ?? {};
const threeAssertions = threeProof.assertions ?? {};
add("authored-and-three-owner-row-proofs", authoredProof.status === "PASS" && threeProof.status === "PASS" && authoredProof.ownerRowPrograms?.sparseAndDenseCalls?.map(({ count }) => count).join(",") === "1,6" && authoredProof.ownerRowPrograms?.eligibleNonemptyPendingCaptureCalls === 0 && authoredAssertions.ordinaryAuthoredTSX === true && authoredAssertions.stableKeyedMoveIdentity === true && authoredAssertions.removedOwnerAndDeadSetter === true && authoredAssertions.rowReuseGeneration === true && authoredAssertions.discardedCandidateColumnIsolation === true && threeProof.numericOwnerRowCut?.batches === 240 && threeProof.numericOwnerRowCut?.cellsPerBatch === 5 && threeProof.numericOwnerRowCut?.preparedRowProgramCount === 1 && threeAssertions.sameThreeObjectAndResourceIdentities === true && threeAssertions.cleanThreeResourceDisposal === true, { authored: authoredAssertions, actualThree: threeAssertions });

const frozen = prereg.frozenInputs ?? {};
const inputLocks = frozen.inputLocks ?? {};
add("prereg-frozen-identifiers", frozen.archive?.path === archivePath && frozen.archive.sha256 === archiveSha256 && frozen.status?.path === statusPath && frozen.status.sha256 === await hashFile(statusPath) && frozen.sourceAndBuildSha256 && same(frozen.sourceAndBuildSha256, checkpoint.sourceAndBuildSha256) && same(frozen.currentVerificationSha256, checkpoint.verificationSha256) && same(frozen.historicalVerificationSha256, checkpoint.historicalVerificationSha256), { sourceMaps: mapSizes });
const allLockPaths = Object.keys(inputLocks).sort();
let lockBytesMatch = allLockPaths.length > 0;
for (const file of allLockPaths) if (await hashFile(file).catch(() => null) !== inputLocks[file]) lockBytesMatch = false;
add("all-prereg-input-locks", lockBytesMatch && frozen.inputCounts?.archiveMembers === 1093 && frozen.inputCounts?.sourceAndBuild === 1004 && frozen.inputCounts?.currentVerification === 25 && frozen.inputCounts?.historicalVerification === 64, { locks: allLockPaths.length });
const requiredArchiveLocksPresent = union.every((file) => inputLocks[file] === (checkpoint.sourceAndBuildSha256[file] ?? checkpoint.verificationSha256[file] ?? checkpoint.historicalVerificationSha256[file]));
const requiredOtherLocks = [archivePath, statusPath, timingStatusPath, timingArchivePath, pilotManifestPath, pilotStatusPath, pilotArchivePath, pilotVerificationPath, authoredProofPath, threeProofPath, diagnosticPath, ...Object.keys(productionFiles), prereg.frozenInputs?.protocol?.path, prereg.frozenInputs?.configuration?.path, prereg.frozenInputs?.collector?.path, prereg.frozenInputs?.independentVerifier?.path];
add("required-input-lock-coverage", requiredArchiveLocksPresent && requiredOtherLocks.every((file) => file && file in inputLocks), { requiredOtherLocks });
const diagnosticArtifacts = [
  "results/numeric-cell-storage-candidate-v5/inspect_numeric_cell_storage_candidate_v5.mjs",
  "results/numeric-cell-storage-candidate-v5/owner-state-world-entry.ts",
  "results/numeric-cell-storage-candidate-v5/owner-state-world.iife.js",
  "results/numeric-cell-storage-candidate-v5/owner-state-world.source.ts",
];
const expectedLockSet = new Set([
  archivePath, statusPath, ...union,
  ...Object.keys(prereg.frozenInputs?.proofs?.compiler?.files ?? {}),
  authoredProofPath, authoredProof.authoredSource?.path, authoredProof.emittedModule?.path,
  threeProofPath,
  diagnosticPath, ...diagnosticArtifacts, ...Object.keys(diagnostic.bundledInputHashes ?? {}),
  timingStatusPath, timingArchivePath, ...Object.keys(timingStatus.evidenceSha256 ?? {}),
  pilotStatusPath, pilotArchivePath, pilotVerificationPath, pilotVerifierPath, pilotEvidenceVerifierPath,
  pilotManifestPath, ...Object.keys(pilotStatus.evidenceSha256 ?? {}),
  ...(pilot.pageFiles ?? []).map((row) => `${pilotDir}/${row.file}`),
  prereg.frozenInputs?.protocol?.path, prereg.frozenInputs?.configuration?.path,
  "vite.product-mixed-compiled-owner-row-fusion.config.ts",
  "src/browser/product_mixed_schedule.ts",
  prereg.frozenInputs?.collector?.path, prereg.frozenInputs?.independentVerifier?.path,
].filter(Boolean));
add("exact-prereg-input-lock-set", same(allLockPaths, [...expectedLockSet].sort()), { expectedCount: expectedLockSet.size, observedCount: allLockPaths.length, missing: [...expectedLockSet].filter((x) => !inputLocks[x]), extra: allLockPaths.filter((x) => !expectedLockSet.has(x)) });
const postMap = Object.fromEntries((postlock.records ?? []).map((row) => [row.filename, row]));
add("post-lock-equals-prereg", postlock.status === "PASS" && postlock.mismatches?.length === 0 && same((postlock.records ?? []).map(({ filename }) => filename).sort(), allLockPaths) && allLockPaths.every((file) => postMap[file]?.matches === true && postMap[file]?.expected === inputLocks[file] && postMap[file]?.observed === inputLocks[file]), { records: postlock.records?.length, locks: allLockPaths.length });
add("served-asset-preflight", same(prereg.browser?.productionSha256, productionFiles) && same(prereg.browser?.servedAssetSha256, productionFiles) && prereg.browser?.assetPreflight?.length === 5 && prereg.browser.assetPreflight.every((item) => item.status === 200 && item.sha256 === productionFiles[item.filename] && item.coop === "same-origin" && item.coep === "require-corp"), prereg.browser?.assetPreflight);
add("browser-and-sampling-configuration", prereg.browser?.origin === "https://owner-row-fusion-allocation.localhost:1355" && prereg.browser?.headless === false && prereg.browser?.gpu === false && prereg.browser?.viewport?.width === 1200 && prereg.browser?.viewport?.height === 900 && prereg.browser?.freshContexts === true && prereg.browser?.serial === true && prereg.browser?.samplingIntervalBytes === 32768 && prereg.browser?.includeObjectsCollectedByMajorGC === true && prereg.browser?.includeObjectsCollectedByMinorGC === true && prereg.browser?.samplingBeginsOnAboutBlankBeforeNavigation === true && same(prereg.browser?.engineEpoch, engineEpoch), prereg.browser);
add("diagnostic-only-interpretation", prereg.interpretation?.kind === "diagnostic-only" && prereg.interpretation?.allocationPassGate === false && prereg.interpretation?.speedVerdict === false && prereg.interpretation?.releaseVerdict === false && prereg.interpretation?.currentTimingResult?.path === timingStatusPath && prereg.interpretation?.currentTimingResult?.sha256 === await hashFile(timingStatusPath) && prereg.interpretation?.currentTimingResult?.status === timingStatus.status && prereg.interpretation?.currentTimingResult?.speedGate === timingStatus.speedGate && prereg.interpretation?.priorTimingResult?.label?.includes("historical") && same(final.interpretation, prereg.interpretation) && /CPU frame speed/i.test(final.interpretationText ?? ""), final.interpretation);
add("recorded-input-counts", frozen.inputCounts?.sourceAndBuild === 1004 && frozen.inputCounts?.currentVerification === 25 && frozen.inputCounts?.historicalVerification === 64 && frozen.inputCounts?.archiveMembers === 1093 && frozen.inputCounts?.currentTimingMembers === timingStatus.archiveMembers && frozen.inputCounts?.inputLocks === allLockPaths.length, frozen.inputCounts);

const expectedProductionPaths = Object.keys(productionFiles).sort();
const commonNames = expectedProductionPaths.filter((name) => !/native_product_mixed_arm-|product_mixed_react_arm-/.test(name)).map((name) => path.basename(name));
const pages = [];
const allProfileSummary = {};
for (const sequence of sequences) {
  const expected = schedule.get(sequence);
  const filename = `${String(sequence).padStart(2, "0")}-${expected.arm}-${expected.size}.json`;
  const page = await readJson(`${output}/${filename}`);
  const ref = final.records?.find((row) => row.sequence === sequence);
  const pageHash = await hashFile(`${output}/${filename}`);
  const identityOK = page.study === study && page.runId === prereg.runId && page.sequence === sequence && page.pair === 0 && page.arm === expected.arm && page.size === expected.size && page.origin === prereg.browser.origin && ref?.file === filename && ref?.sha256 === pageHash && ref?.status === "PASS" && page.status === "PASS";
  add(`page-identity-${sequence}`, identityOK, { filename, arm: page.arm, size: page.size, status: page.status });
  const result = page.harnessResult ?? {};
  const frameNumbers = result.samples?.map((sample) => sample.frame) ?? [];
  const structuralFrames = result.samples?.filter((sample) => sample.structural).map((sample) => sample.frame) ?? [];
  const expectedFrames = Array.from({ length: 240 }, (_, i) => i + 61);
  const expectedStructural = [90, 120, 150, 180, 210, 240, 270, 300];
  add(`harness-correctness-${sequence}`, result.status === "PASS" && result.mode === "confirm" && result.production === true && result.sequence === sequence && result.pair === 0 && result.arm === expected.arm && result.size === expected.size && result.warmup === 60 && result.frames === 240 && result.samples?.length === 240 && same(frameNumbers, expectedFrames) && same(structuralFrames, expectedStructural) && same(Object.values(result.checks ?? {}), [true, true, true, true, true]) && same(result.errors, []) && same(page.browserErrors, []), { status: result.status, sampleCount: result.samples?.length, structuralFrames, checks: result.checks, errors: result.errors, browserErrors: page.browserErrors });
  const lifecycle = result;
  add(`lifecycle-${sequence}`, lifecycle.active?.writers === expected.size && lifecycle.active?.mounts === expected.size + expectedStructural.length * 8 && lifecycle.active?.cleanups === expectedStructural.length * 8 && lifecycle.after?.writers === 0 && lifecycle.after?.mounts === expected.size + expectedStructural.length * 8 && lifecycle.after?.mounts === lifecycle.after?.cleanups, { active: lifecycle.active, after: lifecycle.after });
  const heap = [page.heapUsageBaseline, page.heapUsageAfterHarnessTeardown, page.heapUsageAfterForcedGC];
  add(`heap-snapshots-${sequence}`, heap.every((h) => h && ["usedSize", "totalSize", "embedderHeapUsedSize", "backingStorageSize"].every((key) => finite(h[key]))), heap);
  add(`sampling-start-${sequence}`, page.sampling?.startedBeforeNavigation === true && page.sampling.samplingIntervalBytes === 32768 && page.sampling.includeObjectsCollectedByMajorGC === true && page.sampling.includeObjectsCollectedByMinorGC === true && page.sampling.scope === prereg.profileScope, page.sampling);

  const resources = page.loadedBuildResources ?? [];
  const loadedNames = resources.map((r) => path.basename(r.filename ?? ""));
  const selectedPattern = expected.arm === "native" ? /^native_product_mixed_arm-/ : /^product_mixed_react_arm-/;
  const oppositePattern = expected.arm === "native" ? /^product_mixed_react_arm-/ : /^native_product_mixed_arm-/;
  const resourceOK = resources.length === commonNames.length + 1 && commonNames.every((n) => loadedNames.includes(n)) && loadedNames.some((n) => selectedPattern.test(n)) && !loadedNames.some((n) => oppositePattern.test(n)) && resources.every((r) => r.status === 200 && productionFiles[r.filename] === r.sha256 && new URL(r.url).origin === prereg.browser.origin && `${buildDirectory}${new URL(r.url).pathname}` === r.filename);
  add(`served-resources-${sequence}`, resourceOK, resources.map(({ filename: f, status, sha256: h }) => ({ filename: f, status, sha256: h })));

  const profile = page.cdp?.stoppedSamplingProfile;
  const stats = profileStats(profile);
  allProfileSummary[sequence] = { treeNodes: stats.flattened.length, treeSelfSizeBytes: stats.treeSelfSize, flatSamples: stats.flatSampleCount, flatSampleSizeBytes: stats.flatBytes, unresolvedSampleNodeIds: stats.badSampleNodes.length };
  add(`cdp-profile-shape-${sequence}`, stats.errors.length === 0 && stats.flattened.length > 0 && stats.flatSampleCount > 0, { errors: stats.errors, treeNodes: stats.flattened.length, flatSamples: stats.flatSampleCount });
  add(`cdp-independent-tree-${sequence}`, same(page.cdp?.flattenedTreeNodes, stats.flattened) && same(page.cdp?.stoppedProfileTree, profile?.head) && same(page.cdp?.stoppedFlatSamples, profile?.samples) && same(page.cdp?.stoppedSummaryTopFrames, stats.top), { treeSelfSizeBytes: stats.treeSelfSize, flatSampleSizeBytes: stats.flatBytes, flatSamplesAreIndependent: true });
  const attributed = page.cdp?.topFrameAttribution ?? [];
  const attributeTuples = attributed.map(({ url = "", functionName, lineNumber = -1, columnNumber = -1, sampledAllocationBytes, profileNodes }) => ({ url, functionName: functionName || "(anonymous)", lineNumber, columnNumber, sampledAllocationBytes, profileNodes }));
  add(`frame-aggregation-${sequence}`, same(attributeTuples, stats.top), { topFrames: stats.top.length });
  const servedHashes = new Map(resources.map((r) => [r.filename, r.sha256]));
  let excerptsOK = attributed.length === stats.top.length;
  for (let i = 0; i < attributed.length; i++) {
    const entry = attributed[i];
    const pathname = (() => { try { return `${buildDirectory}${new URL(entry.url).pathname}`; } catch { return null; } })();
    const canAttribute = pathname && productionFiles[pathname] && servedHashes.get(pathname) === productionFiles[pathname] && Number.isSafeInteger(entry.lineNumber) && entry.lineNumber >= 0 && Number.isSafeInteger(entry.columnNumber) && entry.columnNumber >= 0;
    if (!canAttribute) { if (entry.emittedExcerpt !== null) excerptsOK = false; continue; }
    const e = entry.emittedExcerpt;
    if (!e || e.file !== pathname || e.sha256 !== productionFiles[pathname] || e.verifiedServedSha256 !== servedHashes.get(pathname)) { excerptsOK = false; continue; }
    const source = await readFile(pathname, "utf8");
    const lines = source.split("\n");
    if (entry.lineNumber >= lines.length || entry.columnNumber > lines[entry.lineNumber].length) { excerptsOK = false; continue; }
    const offset = lines.slice(0, entry.lineNumber).reduce((n, line) => n + line.length + 1, 0) + entry.columnNumber;
    const start = Math.max(0, offset - 160), end = Math.min(source.length, offset + 160);
    if (e.lineNumber !== entry.lineNumber || e.columnNumber !== entry.columnNumber || e.offset !== offset || e.start !== start || e.end !== end || e.text !== source.slice(start, end)) excerptsOK = false;
  }
  add(`source-excerpts-${sequence}`, excerptsOK, { frames: attributed.length, unresolved: attributed.filter((f) => f.emittedExcerpt === null).length });
  pages.push({ sequence, pair: 0, arm: expected.arm, size: expected.size, status: page.status, file: filename, sha256: pageHash });
}
add("selected-record-set", same(final.records, pages) && same(manifest.records, pages) && sequences.length === 6, final.records);
add("final-postlock-reference", final.postlock?.path === "postlock.json" && final.postlock?.status === "PASS" && final.postlock?.mismatches?.length === 0);
add("manifest-provenance", manifest.preregistrationSha256 === await hashFile(`${output}/preregistration.json`) && manifest.archiveSha256 === archiveSha256 && same(manifest.postCollectionChangedFiles, []));
add("output-inventory", same((await readdir(output)).sort(), ["00-react-128.json", "01-native-128.json", "10-react-512.json", "11-native-512.json", "20-react-1024.json", "21-native-1024.json", "FINALresults.json", "manifest.json", "postlock.json", "preregistration.json", "progress.json", "verification.json"].sort()), (await readdir(output)).sort());

const verification = {
  schemaVersion: 1,
  study: `${study}-independent-verification`,
  checkedAt: new Date().toISOString(),
  runId: prereg.runId,
  status: checks.every((c) => c.status === "PASS") ? "PASS" : "FAIL",
  collector: { path: prereg.frozenInputs?.collector?.path, sha256: prereg.frozenInputs?.collector?.sha256 },
  verifier: { path: "scripts/verify_product_mixed_owner_row_fusion_allocation_v2.mjs", sha256: await hashFile("scripts/verify_product_mixed_owner_row_fusion_allocation_v2.mjs") },
  repair: { originalPath: verifierPath, originalSha256: await hashFile(verifierPath), originalFailurePath: `${output}/verification.json`, originalFailureSha256: await hashFile(`${output}/verification.json`), failureLog: ".cache/owner-row-fusion-allocation-primary/verification.log", failureLogSha256: await hashFile(".cache/owner-row-fusion-allocation-primary/verification.log"), scope: "Confirm workloads have eight 8-row structural edits; correct lifecycle counts from locked harness; same six profiles, no reruns or exclusions." },
  pages: allProfileSummary,
  profileInterpretation: "Whole-page CDP allocation sampling only. Tree selfSize and flat sample size totals are separate CDP outputs; sampled bytes are estimates, include work outside update commits, and do not imply frame speed or release readiness.",
  checks,
  failures: checks.filter((c) => c.status !== "PASS"),
};
await writeFile(path.join(output, "verification-v2.json"), `${JSON.stringify(verification, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ status: verification.status, checkCount: checks.length, failed: verification.failures.length }, null, 2));
if (verification.status !== "PASS") process.exitCode = 1;
