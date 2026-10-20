/** Independently verify the stable-cells whole-page CPU attribution records. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = "results/product-mixed-stable-cells-cpu";
const preregistrationPath = `${outputDirectory}/preregistration.json`;
const resultsPath = `${outputDirectory}/results.json`;
const postLockPath = `${outputDirectory}/source-build-post-lock.json`;
const verificationPath = `${outputDirectory}/verification.json`;
const checkpointPath = "implementation/2026-10-13-stable-numeric-cells/status.json";
const archivePath = "implementation/2026-10-13-stable-numeric-cells/source-and-evidence.tar.gz";
const expectedArchiveHash = "11b0c553b021e4ca96cdcc75f71babf3cdc9e7aaf19f49699c55a7b0ba7fc0d6";
const pilotDirectory = "results/product-mixed-stable-cells-pilot";
const timingCheckpointPath = "implementation/2026-10-13-stable-cell-timing/status.json";
const timingArchivePath = "implementation/2026-10-13-stable-cell-timing/evidence.tar.gz";
const expectedTimingArchiveHash = "2f99962b417a609acd5545a18eafff5677f384a2713ac2a7db1787b1bb76f925";
const priorConfirmation = "results/product-mixed-stable-cells-confirmation";
const profileScriptPath = "scripts/profile_product_mixed_stable_cells_cpu.mjs";
const verifierPath = "scripts/verify_product_mixed_stable_cells_cpu.mjs";
const protocolPath = "product-mixed-stable-cells-cpu-protocol.md";
const configPath = "vite.product-mixed-stable-cells-cpu.config.ts";
const schedulePath = "src/browser/product_mixed_schedule.ts";
const buildDirectory = "dist-product-mixed-stable-cells";
const origin = "https://compiled-stable-cells-cpu.localhost:1355";
const samplingIntervalMicros = 1000;
const selected = [
  { sequence: 20, pair: 0, arm: "react", size: 1024 },
  { sequence: 21, pair: 0, arm: "native", size: 1024 },
];
const warmupFrames = 60;
const measuredFrames = 240;
const structuralFrames = [90, 120, 150, 180, 210, 240, 270, 300];

const sha = (value) => createHash("sha256").update(value).digest("hex");
const readJson = async (filename) => JSON.parse(await readFile(filename, "utf8"));
const hashFile = async (filename) => sha(await readFile(filename));
const sameJson = (left, right) => {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
      left.every((item, index) => sameJson(item, right[index]));
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return sameJson(leftKeys, rightKeys) && leftKeys.every((key) => sameJson(left[key], right[key]));
};
const finiteNonnegative = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
const equalPathKeys = (actual, expected, label) =>
  assert.deepEqual([...actual].sort(), [...new Set(expected)].sort(), `${label} path inventory`);

function archiveHashes(filename) {
  return JSON.parse(execFileSync("python3", ["-c", `import hashlib,json,sys,tarfile
members={}
with tarfile.open(sys.argv[1], "r:gz") as archive:
    for member in archive:
        stream=archive.extractfile(member)
        if stream is None: raise RuntimeError("Unreadable archive member: "+member.name)
        digest=hashlib.sha256()
        while True:
            chunk=stream.read(1024*1024)
            if not chunk: break
            digest.update(chunk)
        stream.close()
        members[member.name]=digest.hexdigest()
print(json.dumps(members,sort_keys=True))`, filename], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }));
}

function summarizeProfile(profile, productionHashes) {
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const totals = new Map();
  for (let index = 0; index < profile.samples.length; index++) {
    const node = nodes.get(profile.samples[index]);
    assert.ok(node, `CPU sample references unknown node id ${profile.samples[index]}`);
    const frame = node.callFrame ?? {};
    const url = frame.url ?? "";
    const functionName = frame.functionName || "(anonymous)";
    const lineNumber = frame.lineNumber ?? -1;
    const columnNumber = frame.columnNumber ?? -1;
    const key = `${url}\u0000${functionName}\u0000${lineNumber}\u0000${columnNumber}`;
    const row = totals.get(key) ?? {
      functionName,
      url,
      lineNumber,
      columnNumber,
      sampleCount: 0,
      selfTimeMicros: 0,
    };
    row.sampleCount++;
    row.selfTimeMicros += profile.timeDeltas[index];
    totals.set(key, row);
  }
  const totalSelfTimeMicros = [...totals.values()].reduce((sum, row) => sum + row.selfTimeMicros, 0);
  const productionByBasename = new Map(Object.keys(productionHashes).map((filename) => [path.basename(filename)]));
  const classify = (frame) => {
    const name = frame.functionName.toLowerCase();
    let basename = "";
    try {
      basename = path.basename(new URL(frame.url || "about:blank").pathname);
    } catch {
      // Synthetic profiler URLs are classified by function name below.
    }
    if (name === "(root)" || name === "root") return "root";
    if (name === "(idle)" || name === "idle") return "idle";
    if (name === "(program)" || name === "program") return "program";
    if (/garbage collector|\(gc\)|^gc$/.test(name)) return "gc";
    if (basename.startsWith("product-mixed-v2-")) return "harness bundle";
    if (basename.startsWith("native_product_mixed_arm-")) return "native arm bundle";
    if (basename.startsWith("product_mixed_react_arm-")) return "react arm bundle";
    if (productionByBasename.has(basename)) return "production document or style";
    return "other runtime";
  };
  const topFrames = [...totals.values()].map((row) => ({
    ...row,
    category: classify(row),
    selfTimeMs: row.selfTimeMicros / 1000,
    selfTimePercent: totalSelfTimeMicros === 0 ? null : row.selfTimeMicros * 100 / totalSelfTimeMicros,
  })).sort((left, right) => right.selfTimeMicros - left.selfTimeMicros).slice(0, 50);
  const categoryTime = {};
  for (const row of totals.values()) {
    const category = classify(row);
    categoryTime[category] = (categoryTime[category] ?? 0) + row.selfTimeMicros;
  }
  for (const [category, time] of Object.entries(categoryTime)) {
    categoryTime[category] = {
      selfTimeMicros: time,
      selfTimeMs: time / 1000,
      selfTimePercent: totalSelfTimeMicros === 0 ? null : time * 100 / totalSelfTimeMicros,
    };
  }
  return {
    totalSelfTimeMicros,
    totalSelfTimeMs: totalSelfTimeMicros / 1000,
    sampleCount: profile.samples.length,
    topFrames,
    categoryTime,
    categoryMethod: "URL/function-name heuristics only; bundled arm chunks combine authored app and runtime code, so labels do not establish causality.",
  };
}

async function recomputeExcerpts(topFrames, productionHashes) {
  const byBasename = new Map(Object.entries(productionHashes).map(([filename, hash]) => [
    path.basename(filename), { filename, hash },
  ]));
  const sources = new Map();
  const output = [];
  for (const frame of topFrames) {
    if (output.length >= 30) break;
    if (frame.lineNumber < 0 || frame.columnNumber < 0) continue;
    let basename;
    try {
      basename = path.basename(new URL(frame.url).pathname);
    } catch {
      continue;
    }
    const source = byBasename.get(basename);
    if (!source) continue;
    let code = sources.get(source.filename);
    if (code === undefined) {
      code = await readFile(source.filename, "utf8");
      sources.set(source.filename, code);
    }
    const lines = code.split("\n");
    if (frame.lineNumber >= lines.length || frame.columnNumber > lines[frame.lineNumber].length) continue;
    const lineStart = lines.slice(0, frame.lineNumber).reduce((sum, line) => sum + line.length + 1, 0);
    const offset = lineStart + frame.columnNumber;
    if (offset > code.length) continue;
    const excerptStartOffset = Math.max(0, offset - 150);
    const excerptEndOffset = Math.min(code.length, offset + 150);
    output.push({
      functionName: frame.functionName,
      url: frame.url,
      lineNumber: frame.lineNumber,
      columnNumber: frame.columnNumber,
      sampledSelfTimeMs: frame.selfTimeMs,
      productionFile: source.filename,
      productionSha256: source.hash,
      offsetUnit: "UTF-16 code units",
      excerptStartOffset,
      sampleOffset: offset,
      excerptEndOffset,
      minifiedCodeExcerpt: code.slice(excerptStartOffset, excerptEndOffset),
    });
  }
  return output;
}

const prereg = await readJson(preregistrationPath);
const results = await readJson(resultsPath);
const postLock = await readJson(postLockPath);
assert.equal(prereg.schemaVersion, 1);
assert.equal(prereg.study, "compiled-product-mixed-stable-cells-cpu-diagnostic");
assert.equal(prereg.status, "FROZEN_BEFORE_CPU_PROFILE");
assert.equal(results.study, prereg.study);
assert.equal(results.runId, prereg.runId);
assert.equal(results.status, "PASS");
assert.deepEqual(results.records.map(({ sequence, pair, arm, size }) => ({ sequence, pair, arm, size })), selected);
assert.deepEqual(postLock.mismatches, []);
assert.equal(postLock.status, "PASS");
assert.deepEqual(postLock.expected, prereg.frozenInputs.inputLocks);
assert.deepEqual(postLock.observed, prereg.frozenInputs.inputLocks);

const frozen = prereg.frozenInputs;
const checkpoint = await readJson(checkpointPath);
assert.equal(frozen.checkpoint.path, checkpointPath);
assert.equal(frozen.sourceBuildArchive.path, archivePath);
assert.equal(frozen.sourceBuildArchive.sha256, expectedArchiveHash);
assert.equal(checkpoint.status, "UNIT_AUTHORED_COMPILER_AND_CHROMIUM_SHAPE_VERIFIED");
assert.equal(checkpoint.runtimeTests, 653);
assert.equal(checkpoint.rustTests, 32);
assert.equal(checkpoint.candidateProductionPilotPages, 0);
assert.equal(checkpoint.speedGate, "UNMEASURED_FOR_THIS_CANDIDATE");
assert.equal(checkpoint.archiveSha256, expectedArchiveHash);
assert.equal(await hashFile(archivePath), expectedArchiveHash);
assert.equal(Object.keys(frozen.sourceBuildFiles).length, 878);
assert.equal(Object.keys(frozen.verificationEvidence).length, 111);
assert.deepEqual(frozen.sourceBuildFiles, checkpoint.sourceAndBuildSha256);
assert.deepEqual(frozen.verificationEvidence, checkpoint.verificationSha256);
assert.equal(frozen.checkpoint.sha256, await hashFile(checkpointPath));
assert.equal(frozen.checkpoint.status, checkpoint.status);
assert.equal(frozen.checkpoint.runtimeTests, checkpoint.runtimeTests);
assert.equal(frozen.checkpoint.rustTests, checkpoint.rustTests);

const candidateMembers = archiveHashes(archivePath);
const candidatePaths = [...new Set([
  ...Object.keys(checkpoint.sourceAndBuildSha256),
  ...Object.keys(checkpoint.verificationSha256),
])].sort();
assert.equal(candidatePaths.length, 989);
assert.deepEqual(Object.keys(candidateMembers).sort(), candidatePaths);
for (const [filename, expected] of Object.entries(checkpoint.sourceAndBuildSha256)) {
  assert.equal(candidateMembers[filename], expected, `Stable archive source/build bytes: ${filename}`);
  assert.equal(await hashFile(filename), expected, `Stable current source/build hash: ${filename}`);
}
for (const [filename, expected] of Object.entries(checkpoint.verificationSha256)) {
  assert.equal(candidateMembers[filename], expected, `Stable archive verification bytes: ${filename}`);
  assert.equal(await hashFile(filename), expected, `Stable current verification hash: ${filename}`);
}
const productionHashes = Object.fromEntries(Object.entries(checkpoint.sourceAndBuildSha256).filter(([filename]) =>
  filename.startsWith(`${buildDirectory}/`)
));
assert.equal(Object.keys(productionHashes).length, 5);
assert.deepEqual(frozen.productionFiles, productionHashes);

const pilotManifestPath = `${pilotDirectory}/results.json`;
const pilotManifest = await readJson(pilotManifestPath);
assert.equal(frozen.correctnessPilotManifest.path, pilotManifestPath);
assert.equal(frozen.correctnessPilotManifest.sha256, await hashFile(pilotManifestPath));
assert.equal(pilotManifest.status, "PASS");
const expectedPilotPages = ["native-128", "react-128", "native-512", "react-512", "native-1024", "react-1024"]
  .map((base) => `${pilotDirectory}/${base}.json`);
assert.deepEqual(Object.keys(frozen.correctnessPilotPages).sort(), expectedPilotPages.slice().sort());
for (const filename of expectedPilotPages) {
  assert.equal(await hashFile(filename), frozen.correctnessPilotPages[filename]);
}

// Recheck the earlier timing context, including the complete archive and every locked input.
const timing = await readJson(timingCheckpointPath);
assert.equal(timing.status, "TIMING_CONFIRMATION_VERIFIED_SPEED_FAIL");
assert.equal(timing.speedGate, "FAIL");
assert.equal(timing.archiveSha256, expectedTimingArchiveHash);
assert.equal(timing.sourceCheckpointArchiveSha256, expectedArchiveHash);
assert.equal(timing.archiveMembers, 68);
assert.equal(timing.pages, 30);
assert.equal(timing.measuredFrames, 7200);
assert.equal(timing.independentVerification, "PASS_WITH_DOCUMENTED_ANALYZER_AND_VERIFIER_REPAIRS");
assert.equal(await hashFile(timingArchivePath), expectedTimingArchiveHash);
const timingMembers = archiveHashes(timingArchivePath);
assert.deepEqual(Object.keys(timingMembers).sort(), Object.keys(timing.evidenceSha256).sort());
for (const [filename, expected] of Object.entries(timing.evidenceSha256)) {
  assert.equal(timingMembers[filename], expected, `Timing archive evidence bytes: ${filename}`);
  assert.equal(await hashFile(filename), expected, `Timing evidence current hash: ${filename}`);
}
const priorInputs = await readJson(`${priorConfirmation}/preregistration.json`);
const priorManifest = await readJson(`${priorConfirmation}/manifest.json`);
const priorFinal = await readJson(`${priorConfirmation}/FINALresults.json`);
const priorSummary = await readJson(`${priorConfirmation}/summary-v2.json`);
const priorVerification = await readJson(`${priorConfirmation}/verification.json`);
assert.equal(priorFinal.status, "PASS");
assert.equal(priorManifest.status, "COLLECTION_COMPLETE");
assert.equal(priorManifest.records.length, 30);
assert.equal(priorVerification.status, "PASS");
assert.equal(priorVerification.gate, "FAIL");
assert.equal(priorSummary.gate, "FAIL");
assert.equal(frozen.stableTimingConfirmation.verificationV2.status, "PASS");
assert.equal(frozen.stableTimingConfirmation.verificationV2.gate, "FAIL");
assert.equal(frozen.stableTimingConfirmation.summaryV2.gate, "FAIL");
const priorPageHashes = {};
for (const record of priorManifest.records) {
  assert.equal(record.status, "PASS");
  assert.equal(await hashFile(record.file), record.sha256, `Stable timing page hash: ${record.file}`);
  priorPageHashes[record.file] = record.sha256;
}
assert.deepEqual(frozen.stableTimingConfirmation.rawPages, priorPageHashes);
const priorLockPath = `${priorConfirmation}/preregistration.json`;
assert.deepEqual(frozen.stableTimingConfirmation.preregistration, {
  path: priorLockPath,
  sha256: await hashFile(priorLockPath),
});
assert.deepEqual(frozen.stableTimingConfirmation.manifest, {
  path: `${priorConfirmation}/manifest.json`,
  sha256: await hashFile(`${priorConfirmation}/manifest.json`),
});
assert.deepEqual(frozen.stableTimingConfirmation.finalResults, {
  path: `${priorConfirmation}/FINALresults.json`,
  sha256: await hashFile(`${priorConfirmation}/FINALresults.json`),
});
assert.equal(frozen.stableTimingConfirmation.timingArchive.archiveSha256, expectedTimingArchiveHash);
assert.deepEqual(frozen.stableTimingConfirmation.timingArchive.evidenceSha256, timing.evidenceSha256);

assert.deepEqual(frozen.protocol, { path: protocolPath, sha256: await hashFile(protocolPath) });
assert.deepEqual(frozen.schedule, {
  path: schedulePath,
  sha256: await hashFile(schedulePath),
  pages: selected,
});
assert.deepEqual(frozen.collector, { path: profileScriptPath, sha256: await hashFile(profileScriptPath) });
assert.deepEqual(frozen.verifier, { path: verifierPath, sha256: await hashFile(verifierPath) });
assert.deepEqual(frozen.config, { path: configPath, sha256: await hashFile(configPath) });

assert.deepEqual(prereg.browser, {
  origin,
  headless: false,
  gpu: false,
  viewport: { width: 1200, height: 900 },
  freshContext: true,
  foregroundPage: true,
  serial: true,
  profilerSamplingIntervalMicros: samplingIntervalMicros,
  profilerStartsOnAboutBlankBeforeNavigation: true,
});
assert.deepEqual(prereg.workload.sequences, [20, 21]);
assert.equal(prereg.workload.size, 1024);
assert.deepEqual(prereg.workload.arms, ["react", "native"]);
assert.equal(prereg.workload.warmupFrames, warmupFrames);
assert.equal(prereg.workload.measuredFrames, measuredFrames);
assert.match(prereg.profileScope, /whole-page attribution only/);
assert(prereg.interpretationLimits.some((limit) => /not a causal comparison/.test(limit)));
assert.match(results.interpretation, /not a latency verdict/);

const expectedInputPaths = [
  checkpointPath,
  archivePath,
  ...Object.keys(checkpoint.sourceAndBuildSha256),
  ...Object.keys(checkpoint.verificationSha256),
  pilotManifestPath,
  ...expectedPilotPages,
  timingCheckpointPath,
  timingArchivePath,
  ...Object.keys(timing.evidenceSha256),
  ...Object.keys(priorInputs.inputLocks),
  ...Object.keys(priorPageHashes),
  `${priorConfirmation}/preregistration.json`,
  `${priorConfirmation}/manifest.json`,
  `${priorConfirmation}/FINALresults.json`,
  `${priorConfirmation}/postlock.json`,
  `${priorConfirmation}/summary-v2.json`,
  `${priorConfirmation}/summary-v2.svg`,
  `${priorConfirmation}/summary.json`,
  `${priorConfirmation}/summary.svg`,
  `${priorConfirmation}/verification.json`,
  ...Object.keys(productionHashes),
  protocolPath,
  schedulePath,
  profileScriptPath,
  verifierPath,
  configPath,
];
equalPathKeys(Object.keys(frozen.inputLocks), expectedInputPaths, "CPU pre-registration");
for (const [filename, expected] of Object.entries(frozen.inputLocks)) {
  assert.equal(await hashFile(filename), expected, `Frozen CPU input lock: ${filename}`);
}
assert.equal(postLock.status, "PASS");
assert.deepEqual(Object.keys(postLock.expected).sort(), Object.keys(frozen.inputLocks).sort());
assert.deepEqual(Object.keys(postLock.observed).sort(), Object.keys(frozen.inputLocks).sort());
for (const [filename, expected] of Object.entries(frozen.inputLocks)) {
  assert.equal(postLock.expected[filename], expected);
  assert.equal(postLock.observed[filename], expected);
  assert.equal(await hashFile(filename), expected, `Post-profile locked input: ${filename}`);
}

assert.equal(frozen.servedBytesPreflight.length, 5);
const preflightNames = new Set();
const productionByBasename = new Map(Object.entries(productionHashes).map(([filename, digest]) => [path.basename(filename), digest]));
for (const response of frozen.servedBytesPreflight) {
  assert.equal(response.status, 200);
  assert(response.url.startsWith(`${origin}/`));
  assert.equal(response.sha256, productionByBasename.get(response.filename));
  preflightNames.add(response.filename);
}
assert.equal(preflightNames.size, 5);
assert.deepEqual([...preflightNames].sort(), Object.keys(productionHashes).map((filename) => path.basename(filename)).sort());

const resultRecords = results.records;
assert.equal(resultRecords.length, selected.length);
assert.deepEqual(resultRecords.map(({ sequence, pair, arm, size }) => ({ sequence, pair, arm, size })), selected);
assert.deepEqual(results.priorTimingContext, {
  status: priorVerification.status,
  gate: priorVerification.gate,
  timingArchiveSha256: expectedTimingArchiveHash,
});
assert.equal(results.sourceBuildPostLock, "source-build-post-lock.json");
const outputNames = await readdir(outputDirectory);
const expectedOutputNames = [
  "20-react-1024.json",
  "21-native-1024.json",
  "preregistration.json",
  "results.json",
  "source-build-post-lock.json",
];
const sequenceNames = outputNames.filter((name) => /^\d{2}-(?:react|native)-1024\.json$/.test(name));
assert.deepEqual(sequenceNames.sort(), ["20-react-1024.json", "21-native-1024.json"]);
assert(outputNames.every((name) => expectedOutputNames.includes(name) || name === "verification.json"),
  `Unexpected CPU profile output files: ${outputNames.filter((name) => !expectedOutputNames.includes(name) && name !== "verification.json").join(", ")}`);
assert.deepEqual(outputNames.filter((name) => expectedOutputNames.includes(name)).sort(), expectedOutputNames.sort());

const pages = [];
for (let pageIndex = 0; pageIndex < selected.length; pageIndex++) {
  const scheduled = selected[pageIndex];
  const record = resultRecords[pageIndex];
  const filename = `${outputDirectory}/${String(scheduled.sequence).padStart(2, "0")}-${scheduled.arm}-${scheduled.size}.json`;
  assert.equal(record.file, path.basename(filename));
  assert.equal(record.status, "PASS");
  assert.equal(record.sha256, await hashFile(filename));
  const page = await readJson(filename);
  assert.equal(page.schemaVersion, 1);
  assert.equal(page.study, prereg.study);
  assert.equal(page.runId, prereg.runId);
  assert.equal(page.sequence, scheduled.sequence);
  assert.equal(page.pair, scheduled.pair);
  assert.equal(page.arm, scheduled.arm);
  assert.equal(page.size, scheduled.size);
  assert.equal(page.origin, origin);
  assert.equal(page.status, "PASS");
  assert.equal(page.failure, undefined);
  assert.deepEqual(page.pageErrors, []);
  assert.equal(Number.isFinite(Date.parse(page.startedAt)), true);
  assert.equal(Number.isFinite(Date.parse(page.finishedAt)), true);
  assert(Date.parse(page.finishedAt) >= Date.parse(page.startedAt));
  assert.equal(page.url, `${origin}/product-mixed-v2.html?mode=confirm&sequence=${scheduled.sequence}`);

  const result = page.result;
  assert.equal(result.status, "PASS");
  assert.equal(result.mode, "confirm");
  assert.equal(result.production, true);
  assert.equal(result.sequence, scheduled.sequence);
  assert.equal(result.pair, scheduled.pair);
  assert.equal(result.arm, scheduled.arm);
  assert.equal(result.size, scheduled.size);
  assert.equal(result.warmup, warmupFrames);
  assert.equal(result.frames, measuredFrames);
  assert.equal(result.samples.length, measuredFrames);
  assert.deepEqual(Object.keys(result.checks).sort(), ["identity", "lifecycle", "order", "output", "visible"]);
  assert(Object.values(result.checks).every((value) => value === true));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(page.active, result.active);
  assert.deepEqual(page.harness.checks, result.checks);
  assert.equal(page.harness.status, result.status);
  assert.equal(page.harness.sampleCount, measuredFrames);
  assert.equal(page.harness.warmup, warmupFrames);
  assert.equal(page.harness.frames, measuredFrames);
  assert.equal(page.harness.structuralFrameCount, 8);
  assert.deepEqual(page.harness.samples, result.samples);
  assert.deepEqual(page.harness.active, result.active);
  assert.deepEqual(page.harness.after, result.after);
  assert.deepEqual(page.harness.postTeardown, result.after);
  assert.equal(result.active.writers, 1024);
  assert.equal(result.after.writers, 0);
  assert.equal(result.active.mounts, result.active.cleanups + 1024);
  assert.equal(result.after.mounts, result.after.cleanups);
  assert.deepEqual(result.samples.map(({ frame }) => frame), Array.from({ length: measuredFrames }, (_, index) => warmupFrames + index + 1));
  assert.deepEqual(result.samples.filter(({ structural }) => structural).map(({ frame }) => frame), structuralFrames);
  for (const sample of result.samples) {
    assert.equal(sample.structural, structuralFrames.includes(sample.frame));
    assert(finiteNonnegative(sample.commitMs));
    assert(finiteNonnegative(sample.intervalMs));
  }

  const loaded = page.loadedBuildResources;
  assert(Array.isArray(loaded) && loaded.length > 0);
  assert.equal(new Set(loaded.map((resource) => resource.filename)).size, loaded.length);
  for (const resource of loaded) {
    assert.equal(resource.status, 200);
    assert(Object.values(productionHashes).includes(resource.sha256));
    assert(resource.url.startsWith(`${origin}/`));
  }
  const chosenArm = scheduled.arm === "react" ? /^product_mixed_react_arm-/ : /^native_product_mixed_arm-/;
  const oppositeArm = scheduled.arm === "react" ? /^native_product_mixed_arm-/ : /^product_mixed_react_arm-/;
  const byName = new Map(Object.keys(productionHashes).map((pathName) => [path.basename(pathName), productionHashes[pathName]]));
  const loadedBasenames = new Set();
  for (const resource of loaded) {
    assert(byName.has(resource.filename), `Unknown build resource ${resource.filename}`);
    assert.equal(resource.sha256, byName.get(resource.filename));
    loadedBasenames.add(resource.filename);
  }
  assert(loadedBasenames.has("product-mixed-v2.html"));
  assert([...loadedBasenames].some((name) => name.endsWith(".css")));
  assert([...loadedBasenames].some((name) => name.startsWith("product-mixed-v2-") && name.endsWith(".js")));
  assert([...loadedBasenames].some((name) => chosenArm.test(name)));
  assert(![...loadedBasenames].some((name) => oppositeArm.test(name)));

  const profile = page.profile;
  assert(profile && Array.isArray(profile.nodes) && profile.nodes.length > 0);
  assert(Array.isArray(profile.samples) && profile.samples.length > 0);
  assert(Array.isArray(profile.timeDeltas) && profile.timeDeltas.length === profile.samples.length);
  assert(Number.isFinite(profile.startTime) && Number.isFinite(profile.endTime) && profile.endTime > profile.startTime);
  const nodeIds = new Set(profile.nodes.map((node) => node.id));
  assert.equal(nodeIds.size, profile.nodes.length);
  for (const nodeId of profile.samples) assert(nodeIds.has(nodeId), `Unknown sampled node ${nodeId}`);
  for (const delta of profile.timeDeltas) assert(Number.isFinite(delta) && delta >= 0);
  const computedProfile = summarizeProfile(profile, productionHashes);
  assert.deepEqual(page.summary, computedProfile, `CPU profile summary differs for ${scheduled.arm}`);
  const computedExcerpts = await recomputeExcerpts(computedProfile.topFrames, productionHashes);
  assert.deepEqual(page.topFrameSourceExcerpts, computedExcerpts, `Production source excerpts differ for ${scheduled.arm}`);
  pages.push({ ...scheduled, page, summary: computedProfile });
}

const verification = {
  schemaVersion: 1,
  status: "PASS",
  study: prereg.study,
  runId: prereg.runId,
  pagesVerified: pages.length,
  pageSequences: selected.map(({ sequence }) => sequence),
  sourceArchiveMembersVerified: candidatePaths.length,
  sourceBuildEntriesVerified: Object.keys(checkpoint.sourceAndBuildSha256).length,
  verificationEntriesVerified: Object.keys(checkpoint.verificationSha256).length,
  timingArchiveMembersVerified: Object.keys(timing.evidenceSha256).length,
  preregisteredInputLocksVerified: Object.keys(frozen.inputLocks).length,
  productionAssetsVerified: Object.keys(productionHashes).length,
  profileSummariesIndependentlyRecomputed: true,
  sourceExcerptsIndependentlyRecomputed: true,
  profileScope: "Whole-page sampled self time from profiler start on about:blank through navigation, module import, mount, warmup, measured work, harness inspection, and teardown. It is not an update-only or structural-only measurement.",
  attributionLimits: [
    "Sampled timeDeltas estimate CPU self time; they are not exact instruction counts.",
    "Frames aggregate across the entire page lifetime and cannot be assigned to individual ordinary or structural harness frames.",
    "URL/function categories are attribution hints; bundled app and runtime code do not establish causality.",
    "This two-page single-machine diagnostic is not a timing confirmation or causal speed verdict and does not revise the prior FAIL speed gate.",
  ],
  pageProfiles: pages.map(({ arm, sequence, summary }) => ({
    arm,
    sequence,
    sampleCount: summary.sampleCount,
    totalSelfTimeMicros: summary.totalSelfTimeMicros,
    categoryTime: summary.categoryTime,
    topFrames: summary.topFrames,
  })),
  priorTimingContext: {
    verificationStatus: priorVerification.status,
    speedGate: priorVerification.gate,
    archiveSha256: expectedTimingArchiveHash,
  },
};
await writeFile(verificationPath, `${JSON.stringify(verification, null, 2)}\n`);
console.log(`PASS independent stable-cell CPU evidence verification: ${pages.length} pages; whole-page sampled attribution only.`);
