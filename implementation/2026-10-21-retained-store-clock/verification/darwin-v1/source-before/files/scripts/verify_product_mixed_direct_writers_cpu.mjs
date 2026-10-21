import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Usage: node scripts/verify_product_mixed_direct_writers_cpu.mjs [results-dir]
// Defaults to the repaired collection directory. The verifier never changes
// collection evidence and creates verification.json exclusively.
const root = process.cwd();
const relativeResultDir = process.argv[2] ?? "results/product-mixed-direct-writers-cpu-v3";
const resultDir = path.resolve(root, relativeResultDir);
const resultsPath = path.join(resultDir, "results.json");
const expectedArchiveHash = "cc4c5370868bea0e32b5e2212c80a2fde90c2448116ec1f079a11455170cae51";
const checkpointPath = "implementation/2026-10-12-direct-writers/status.json";
const archivePath = "implementation/2026-10-12-direct-writers/source-and-build.tar.gz";
const pilotManifestPath = "implementation/2026-10-12-direct-writers/verification/product-mixed-pilot/results.json";
const pilotDir = "implementation/2026-10-12-direct-writers/verification/product-mixed-pilot";
const expectedPilot = [["native", 128], ["react", 128], ["native", 512], ["react", 512], ["native", 1024], ["react", 1024]];
const selected = [
  { sequence: 20, pair: 0, arm: "react", size: 1024, file: "20-react-1024.json" },
  { sequence: 21, pair: 0, arm: "native", size: 1024, file: "21-native-1024.json" },
];
const checkRows = [];
const failures = [];
const recomputed = {};

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = async (filename) => JSON.parse(await readFile(path.resolve(root, filename), "utf8"));
const hashFile = async (filename) => sha256(await readFile(path.resolve(root, filename)));
function check(id, ok, detail, data = undefined) {
  const row = { id, status: ok ? "PASS" : "FAIL", detail };
  if (data !== undefined) row.data = data;
  checkRows.push(row);
  if (!ok) failures.push({ id, detail });
  return ok;
}
function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
function profileTotals(profile) {
  if (!profile || !Array.isArray(profile.nodes) || !Array.isArray(profile.samples) || !Array.isArray(profile.timeDeltas)) {
    return { error: "missing raw profile nodes, samples, or timeDeltas" };
  }
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const badDeltas = [];
  const missingNodes = [];
  const totals = new Map();
  let totalSelfTimeMicros = 0;
  for (let i = 0; i < profile.samples.length; i++) {
    const sampleId = profile.samples[i];
    const delta = profile.timeDeltas[i];
    if (!Number.isFinite(delta) || delta < 0) badDeltas.push({ index: i, value: delta });
    const node = nodes.get(sampleId);
    if (!node) {
      missingNodes.push({ index: i, sampleId });
      continue;
    }
    if (!Number.isFinite(delta) || delta < 0) continue;
    const frame = node.callFrame ?? {};
    const key = `${frame.url ?? ""}\u0000${frame.functionName || "(anonymous)"}\u0000${frame.lineNumber ?? -1}\u0000${frame.columnNumber ?? -1}`;
    const row = totals.get(key) ?? {
      functionName: frame.functionName || "(anonymous)",
      url: frame.url ?? "",
      lineNumber: frame.lineNumber ?? -1,
      columnNumber: frame.columnNumber ?? -1,
      sampleCount: 0,
      selfTimeMicros: 0,
    };
    row.sampleCount++;
    row.selfTimeMicros += delta;
    totalSelfTimeMicros += delta;
    totals.set(key, row);
  }
  const topFrames = [...totals.values()]
    .map((row) => ({ ...row, selfTimeMs: row.selfTimeMicros / 1000,
      selfTimePercent: totalSelfTimeMicros === 0 ? null : row.selfTimeMicros * 100 / totalSelfTimeMicros }))
    .sort((a, b) => b.selfTimeMicros - a.selfTimeMicros)
    .slice(0, 50);
  return {
    sampleCount: profile.samples.length,
    timeDeltaCount: profile.timeDeltas.length,
    nodeCount: profile.nodes.length,
    finiteNonnegativeDeltas: badDeltas.length === 0,
    badDeltaCount: badDeltas.length,
    badDeltaExamples: badDeltas.slice(0, 10),
    allSamplesResolveToNodes: missingNodes.length === 0,
    missingNodeExamples: missingNodes.slice(0, 10),
    totalSelfTimeMicros,
    totalSelfTimeMs: totalSelfTimeMicros / 1000,
    topFrames,
  };
}

let result, prereg, postLock, checkpoint, pilotManifest;
try {
  result = await readJson(path.relative(root, resultsPath));
  prereg = await readJson(path.join(relativeResultDir, "preregistration.json"));
  postLock = await readJson(path.join(relativeResultDir, "source-build-post-lock.json"));
  checkpoint = await readJson(checkpointPath);
  pilotManifest = await readJson(pilotManifestPath);
} catch (error) {
  console.error(`Cannot read finalized diagnostic inputs: ${error}`);
  process.exitCode = 2;
  process.exit();
}

check("finalized-results", ["PASS", "FAIL"].includes(result.status) && result.records?.length === 2,
  `Expected finalized PASS/FAIL with two records; found status=${result.status}, records=${result.records?.length ?? "missing"}.`);
check("run-id-consistency", Boolean(result.runId) && result.runId === prereg.runId,
  "Results and preregistration must share one runId; raw page-record IDs are checked against it below.", { result: result.runId, prereg: prereg.runId });
check("protocol-and-prereg-frozen", prereg.status === "FROZEN_BEFORE_CPU_PROFILE" && prereg.study === "compiled-product-mixed-direct-writers-cpu-diagnostic",
  "Preregistration must be frozen before profiles and identify this diagnostic.");

const archiveHash = await hashFile(archivePath);
check("checkpoint-archive", archiveHash === expectedArchiveHash && prereg.frozenInputs?.sourceBuildArchive?.sha256 === expectedArchiveHash,
  "Checkpoint source/build archive must match the protocol's locked SHA-256.", { expected: expectedArchiveHash, actual: archiveHash, preregistered: prereg.frozenInputs?.sourceBuildArchive?.sha256 });
check("checkpoint-status", checkpoint.status === "AUTOMATIC_DIRECT_WRITERS_CORRECTNESS_VERIFIED" && checkpoint.runtimeTests === 458 && checkpoint.rustTests === 25 && checkpoint.integrationCommands === 47 && checkpoint.candidateProductionPilotPages === 6 && checkpoint.performance?.candidateGate === "UNMEASURED",
  "Checkpoint qualification fields must match the frozen protocol.", { status: checkpoint.status, runtimeTests: checkpoint.runtimeTests, rustTests: checkpoint.rustTests, integrationCommands: checkpoint.integrationCommands, candidateProductionPilotPages: checkpoint.candidateProductionPilotPages, candidateGate: checkpoint.performance?.candidateGate });
const checkpointHash = await hashFile(checkpointPath);
const manifestHash = await hashFile(pilotManifestPath);
check("pilot-manifest", pilotManifest.status === "PASS" && prereg.frozenInputs?.correctnessPilotManifest?.sha256 === manifestHash && result.correctnessPilotReference?.manifestSha256 === manifestHash,
  "Six-page pilot manifest must be PASS and match the preregistered/result reference hash.", { actual: manifestHash, status: pilotManifest.status });
const compilerProof = {
  native: pilotManifest.nativeProof,
  react: pilotManifest.reactProof,
};
check("compiler-proof", sameJson(compilerProof, prereg.frozenInputs?.compilerProof),
  "Frozen preregistration compiler proofs must exactly match the correctness pilot manifest proofs.", compilerProof);

const expectedPilotRecords = expectedPilot.map(([arm, size]) => ({ arm, size, status: "PASS" }));
check("pilot-manifest-record-set", sameJson(pilotManifest.records, expectedPilotRecords),
  "Pilot manifest must contain exactly the six expected PASS arm/size records.", { records: pilotManifest.records });
const preregPilot = new Map((prereg.frozenInputs?.validatedPilotRecords ?? []).map((row) => [`${row.arm}-${row.size}`, row]));
const pilotHashes = [];
for (const [arm, size] of expectedPilot) {
  const filename = `${pilotDir}/${arm}-${size}.json`;
  const raw = await readJson(filename);
  const actualHash = await hashFile(filename);
  const locked = preregPilot.get(`${arm}-${size}`);
  const valid = raw.status === "PASS" && raw.arm === arm && raw.size === size && raw.mode === "pilot" && raw.production === true && raw.warmup === 5 && raw.frames === 60 && raw.samples?.length === 60 && Object.values(raw.checks ?? {}).length === 5 && Object.values(raw.checks).every(Boolean) && Array.isArray(raw.errors) && raw.errors.length === 0 && Array.isArray(raw.browserErrors) && raw.browserErrors.length === 0 && locked?.pageSha256 === actualHash;
  pilotHashes.push({ arm, size, sha256: actualHash });
  check(`pilot-record-${arm}-${size}`, valid,
    `Pilot page must retain its expected PASS content and match the frozen page hash.`, { expectedSha256: locked?.pageSha256 ?? null, actualSha256: actualHash, status: raw.status, samples: raw.samples?.length });
}

const frozen = prereg.frozenInputs ?? {};
const frozenExpected = {
  [checkpointPath]: frozen.checkpoint?.sha256,
  [pilotManifestPath]: frozen.correctnessPilotManifest?.sha256,
  [archivePath]: frozen.sourceBuildArchive?.sha256,
  ["product-mixed-direct-writers-cpu-protocol.md"]: frozen.protocol?.sha256,
  ["src/browser/product_mixed_schedule.ts"]: frozen.schedule?.sha256,
  [frozen.collector?.path]: frozen.collector?.sha256,
  ...Object.fromEntries(Object.entries(frozen.productionFiles ?? {})),
  ...Object.fromEntries(Object.entries(frozen.sourceFiles ?? {})),
};
for (const row of frozen.validatedPilotRecords ?? []) {
  frozenExpected[`${pilotDir}/${row.arm}-${row.size}.json`] = row.pageSha256;
}
delete frozenExpected.undefined;
const frozenResults = [];
for (const [filename, expected] of Object.entries(frozenExpected)) {
  const actual = await hashFile(filename);
  frozenResults.push({ filename, expected, actual, matches: expected === actual });
}
check("frozen-input-hashes", frozenResults.length >= 18 && frozenResults.every((row) => row.matches),
  "Every preregistered checkpoint, pilot, protocol, schedule, collector, production, and source lock must match the current file.", frozenResults);
check("pre-post-locks", postLock.status === "PASS" && Array.isArray(postLock.mismatches) && postLock.mismatches.length === 0 && Object.entries(postLock.expected ?? {}).every(([filename, expected]) => expected === postLock.observed?.[filename] && expected === frozenExpected[filename]) && Object.keys(postLock.expected ?? {}).length === Object.keys(frozenExpected).length,
  "Collector post-lock must agree with preregistered hashes and current frozen input inventory.", { status: postLock.status, mismatchCount: postLock.mismatches?.length, expectedCount: Object.keys(postLock.expected ?? {}).length, verifierFrozenCount: Object.keys(frozenExpected).length });
const browserConfig = prereg.browser ?? {};
const browserOK = browserConfig.origin === "https://compiled-direct-writers.localhost:1355" && browserConfig.headless === false && browserConfig.gpu === false && browserConfig.viewport?.width === 1200 && browserConfig.viewport?.height === 900 && browserConfig.freshContext === true && browserConfig.foregroundPage === true && browserConfig.serial === true && browserConfig.profilerSamplingIntervalMicros === 1000 && browserConfig.profilerStartsOnAboutBlankBeforeNavigation === true;
check("browser-profile-configuration", browserOK,
  "Preregistration must specify headed, GPU-disabled, 1200×900, serial fresh foreground contexts and the 1,000 µs profiler started on about:blank.", browserConfig);

const productionFiles = frozen.productionFiles ?? {};
const productionByBasename = new Map(Object.entries(productionFiles).map(([filename, hash]) => [path.basename(filename), { filename, hash }]));
const postLockByName = postLock.expected ?? {};
const profileSummaries = {};
for (let i = 0; i < selected.length; i++) {
  const expected = selected[i];
  const recordRef = result.records.find((row) => row.sequence === expected.sequence);
  const recordPath = path.join(relativeResultDir, expected.file);
  let page;
  try { page = await readJson(recordPath); } catch (error) {
    check(`page-record-${expected.sequence}`, false, `Cannot read page evidence ${expected.file}: ${error}`);
    continue;
  }
  const schedulePage = frozen.schedule?.pages?.find((row) => row.sequence === expected.sequence);
  const scheduleOK = page.runId === result.runId && page.sequence === expected.sequence && page.pair === expected.pair && page.arm === expected.arm && page.size === expected.size && recordRef?.file === expected.file && recordRef?.status === page.status && schedulePage?.sequence === expected.sequence && schedulePage?.arm === expected.arm && schedulePage?.size === expected.size && schedulePage?.pair === expected.pair;
  check(`selected-sequence-${expected.sequence}`, scheduleOK,
    `Sequence ${expected.sequence} must be the frozen ${expected.arm} page, pair 0, size 1024, match results index, and share the runId.`, { runId: page.runId, sequence: page.sequence, pair: page.pair, arm: page.arm, size: page.size, status: page.status });
  const harness = page.harness ?? {};
  const checks = harness.checks ?? {};
  const expectedCheckNames = ["identity", "lifecycle", "order", "output", "visible"];
  const actualCheckNames = Object.keys(checks).sort();
  const sampleRows = harness.samples ?? [];
  const sampleFrames = sampleRows.map((sample) => sample.frame);
  const expectedStructuralFrames = [90, 120, 150, 180, 210, 240, 270, 300];
  const observedStructuralFrames = sampleRows.filter((sample) => sample.structural).map((sample) => sample.frame);
  const sampleMetricsOK = sampleRows.length === 240 && sameJson(sampleFrames, Array.from({ length: 240 }, (_, index) => index + 61)) && sampleRows.every((sample) => Number.isFinite(sample.commitMs) && sample.commitMs >= 0 && Number.isFinite(sample.intervalMs) && sample.intervalMs >= 0) && sameJson(observedStructuralFrames, expectedStructuralFrames);
  const harnessOK = harness.status === "PASS" && harness.sampleCount === 240 && harness.frames === 240 && harness.warmup === 60 && harness.structuralFrameCount === 8 && sameJson(actualCheckNames, expectedCheckNames) && Object.values(checks).every(Boolean) && sampleMetricsOK;
  check(`harness-${expected.arm}`, harnessOK,
    "Harness must PASS with 240 measured samples on frames 61–300, 60 warmup frames, structural frames 90..300 every 30 frames, finite nonnegative timing fields, and the exact five checks true.", { status: harness.status, sampleCount: harness.sampleCount, frames: harness.frames, warmup: harness.warmup, structuralFrameCount: harness.structuralFrameCount ?? null, expectedStructuralFrames, observedStructuralFrames, sampleMetricsOK, checkNames: actualCheckNames, checks });
  check(`page-errors-${expected.arm}`, Array.isArray(page.pageErrors) && page.pageErrors.length === 0,
    "Page must have no browser page errors.", page.pageErrors ?? null);
  const loaded = page.loadedBuildResources ?? [];
  const loadedHashes = [];
  let loadedOK = loaded.length > 0;
  for (const resource of loaded) {
    if (!resource.filename) { loadedOK = false; continue; }
    const locked = productionByBasename.get(resource.filename);
    if (locked) {
      const valid = resource.status === 200 && resource.sha256 === locked.hash && resource.sha256 === postLockByName[locked.filename];
      loadedHashes.push({ filename: resource.filename, expected: locked.hash, served: resource.sha256, status: resource.status, matches: valid });
      loadedOK &&= valid;
    } else if (resource.url?.startsWith(prereg.browser?.origin ?? "")) {
      loadedOK = false;
      loadedHashes.push({ filename: resource.filename, unexpected: true, status: resource.status });
    }
  }
  const requiredNames = ["product-mixed-v2.html", "product-mixed-v2-YB-6hwHt.js", "product-mixed-v2-hg5qe9FO.css", expected.arm === "react" ? "product_mixed_react_arm-CuNyYvmB.js" : "native_product_mixed_arm-Ty2On70_.js"];
  for (const name of requiredNames) if (!loaded.some((resource) => resource.filename === name && resource.status === 200)) loadedOK = false;
  check(`loaded-asset-locks-${expected.arm}`, loadedOK,
    "Each loaded production asset must match its frozen local build bytes; common and selected-arm files must be present.", { requiredNames, loaded: loadedHashes });

  const independent = profileTotals(page.profile);
  profileSummaries[expected.arm] = independent;
  if (independent.error) {
    check(`raw-profile-${expected.arm}`, false, `Independent weighted self-time/top-frame recomputation unavailable: ${independent.error}`);
  } else {
    const cardinality = independent.sampleCount > 0 && independent.sampleCount === independent.timeDeltaCount && independent.finiteNonnegativeDeltas && independent.allSamplesResolveToNodes;
    check(`profile-cardinality-${expected.arm}`, cardinality,
      "Raw profile must have one finite nonnegative timeDelta per sample, and every sample must resolve to a profile node.", { sampleCount: independent.sampleCount, timeDeltaCount: independent.timeDeltaCount, nodeCount: independent.nodeCount, finiteNonnegativeDeltas: independent.finiteNonnegativeDeltas, allSamplesResolveToNodes: independent.allSamplesResolveToNodes });
    const saved = page.summary ?? {};
    const totalsMatch = saved.sampleCount === independent.sampleCount && Math.abs(saved.totalSelfTimeMicros - independent.totalSelfTimeMicros) < 1e-7 && saved.topFrames?.length === independent.topFrames.length && saved.topFrames.every((row, index) => {
      const other = independent.topFrames[index];
      return row.functionName === other.functionName && row.url === other.url && row.lineNumber === other.lineNumber && row.columnNumber === other.columnNumber && row.sampleCount === other.sampleCount && Math.abs(row.selfTimeMicros - other.selfTimeMicros) < 1e-7;
    });
    check(`weighted-self-time-and-top-frames-${expected.arm}`, totalsMatch,
      "Collector summary must match independent aggregation of sample node IDs weighted by corresponding timeDeltas.", { independentTotalSelfTimeMicros: independent.totalSelfTimeMicros, savedTotalSelfTimeMicros: saved.totalSelfTimeMicros, independentTopFrameCount: independent.topFrames.length });
    const sourceExcerpts = page.topFrameSourceExcerpts ?? [];
    const excerptResults = [];
    for (const excerpt of sourceExcerpts) {
      const locked = productionByBasename.get(path.basename(excerpt.productionFile ?? ""));
      if (!locked) { excerptResults.push({ functionName: excerpt.functionName, valid: false, reason: "excerpt file is not a preregistered production file" }); continue; }
      const code = await readFile(path.resolve(root, locked.filename), "utf8");
      const lineStart = code.split("\n").slice(0, excerpt.lineNumber).reduce((sum, line) => sum + line.length + 1, 0);
      const offset = Math.min(code.length, lineStart + excerpt.columnNumber);
      const start = Math.max(0, offset - 150);
      const end = Math.min(code.length, offset + 150);
      const text = code.slice(start, end);
      const valid = excerpt.productionSha256 === locked.hash && excerpt.productionSha256 === postLockByName[locked.filename] && excerpt.sampleOffset === offset && excerpt.excerptStartOffset === start && excerpt.excerptEndOffset === end && excerpt.minifiedCodeExcerpt === text;
      excerptResults.push({ functionName: excerpt.functionName, productionFile: locked.filename, sampleOffset: excerpt.sampleOffset, recomputedOffset: offset, excerptStartOffset: excerpt.excerptStartOffset, excerptEndOffset: excerpt.excerptEndOffset, excerptSha256: sha256(Buffer.from(text)), productionSha256: excerpt.productionSha256, valid });
    }
    check(`source-excerpts-${expected.arm}`, excerptResults.length > 0 && excerptResults.every((row) => row.valid),
      "Every emitted source excerpt must use a locked production-file hash and reproduce exact offset and excerpt bytes.", excerptResults);
  }
  const reportedFailure = page.status === "FAIL" || Boolean(page.failure);
  if (reportedFailure) check(`preserved-collector-failure-${expected.arm}`, false,
    "The page record contains a collector failure; it remains part of the evidence and invalidates this collection.", { status: page.status, failure: page.failure ?? null });
}

const resultPass = result.status === "PASS" && result.records.every((row) => row.status === "PASS");
check("collection-status", resultPass, "A verified collection requires results.json and every selected page record to be PASS.", { status: result.status, records: result.records.map(({ sequence, arm, status }) => ({ sequence, arm, status })) });

const verification = {
  schemaVersion: 1,
  study: "compiled-product-mixed-direct-writers-cpu-independent-verification",
  checkedAt: new Date().toISOString(),
  inputResults: path.relative(root, resultsPath),
  runId: result.runId,
  status: failures.length === 0 ? "PASS" : "FAIL",
  summary: {
    checkCount: checkRows.length,
    passed: checkRows.filter((row) => row.status === "PASS").length,
    failed: failures.length,
    weightedSampledSelfTime: profileSummaries,
    pilotHashes,
  },
  checks: checkRows,
  failures,
  interpretation: "Independent integrity and CPU-profile recomputation only. Sampled self time is not exact instruction time or update-only cost; labels and two profiles do not establish causality or universal superiority.",
};
const verificationPath = path.join(resultDir, "verification.json");
await writeFile(verificationPath, `${JSON.stringify(verification, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ status: verification.status, runId: verification.runId, checkCount: verification.summary.checkCount, passed: verification.summary.passed, failed: verification.summary.failed, verificationPath: path.relative(root, verificationPath), failures }, null, 2));
if (verification.status !== "PASS") process.exitCode = 1;
