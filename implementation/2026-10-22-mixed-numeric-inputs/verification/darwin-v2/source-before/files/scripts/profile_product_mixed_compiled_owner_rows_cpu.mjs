import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { openBrowser } from "vitexec/cli";
import { productMixedSchedule } from "../src/browser/product_mixed_schedule.ts";

const scriptPath = "scripts/profile_product_mixed_compiled_owner_rows_cpu.mjs";
const verifierPath = "scripts/verify_product_mixed_compiled_owner_rows_cpu.mjs";
const checkpointPath = "implementation/2026-10-13-compiled-owner-rows/status.json";
const pilotManifestPath = "results/product-mixed-compiled-owner-rows-pilot/results.json";
const pilotVerifierPath = "scripts/verify_product_mixed_compiled_owner_rows_pilot.mjs";
const outputDirectory = "results/product-mixed-compiled-owner-rows-cpu";
const archivePath = "implementation/2026-10-13-compiled-owner-rows/source-and-evidence.tar.gz";
const protocolPath = "product-mixed-compiled-owner-rows-cpu-protocol.md";
const schedulePath = "src/browser/product_mixed_schedule.ts";
const configPath = "vite.product-mixed-compiled-owner-rows-cpu.config.ts";
const priorConfirmation = "results/product-mixed-compiled-owner-rows-confirmation";
const priorPreregistrationPath = `${priorConfirmation}/preregistration.json`;
const priorManifestPath = `${priorConfirmation}/manifest.json`;
const priorFinalResultsPath = `${priorConfirmation}/FINALresults.json`;
const priorSummaryPath = `${priorConfirmation}/summary-v2.json`;
const priorVerificationPath = `${priorConfirmation}/verification-v4.json`;
const timingCheckpointPath = "implementation/2026-10-13-compiled-owner-row-timing/status.json";
const timingArchivePath = "implementation/2026-10-13-compiled-owner-row-timing/evidence.tar.gz";
const expectedTimingArchiveHash = "f89b9ed1e96218548324478854876d2d3fde544c86c7c9207ffb91bc5a32a02f";
const origin = "https://compiled-owner-rows-cpu.localhost:1355";
const selectedSequences = [20, 21];
const selectedSchedule = selectedSequences.map((sequence) => productMixedSchedule[sequence]);
const samplingIntervalMicros = 1000;
const runId = randomUUID();

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (filename) => sha256(await readFile(filename));
const writeJson = (filename, data, flag = "w") =>
  writeFile(filename, `${JSON.stringify(data, null, 2)}\n`, { flag });

function summarizeCpuProfile(profile, productionHashes) {
  const nodes = new Map((profile.nodes ?? []).map((node) => [node.id, node]));
  const totals = new Map();
  const deltas = profile.timeDeltas ?? [];
  for (let index = 0; index < (profile.samples ?? []).length; index++) {
    const node = nodes.get(profile.samples[index]);
    if (!node) continue;
    const frame = node.callFrame ?? {};
    const url = frame.url ?? "";
    const functionName = frame.functionName || "(anonymous)";
    const lineNumber = frame.lineNumber ?? -1;
    const columnNumber = frame.columnNumber ?? -1;
    const key =
      `${url}\u0000${functionName}\u0000${lineNumber}\u0000${columnNumber}`;
    const row = totals.get(key) ?? {
      functionName,
      url,
      lineNumber,
      columnNumber,
      sampleCount: 0,
      selfTimeMicros: 0,
    };
    row.sampleCount++;
    row.selfTimeMicros += deltas[index] ?? 0;
    totals.set(key, row);
  }

  const totalSelfTimeMicros = [...totals.values()].reduce(
    (sum, row) => sum + row.selfTimeMicros,
    0,
  );
  const productionByBasename = new Map(
    Object.keys(productionHashes).map((filename) => [
      path.basename(filename),
    ]),
  );
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
    if (basename.startsWith("product-mixed-v2-")) return "shared harness and runtime bundle";
    if (basename.startsWith("native_product_mixed_arm-")) return "native arm and runtime bundle";
    if (basename.startsWith("product_mixed_react_arm-")) return "React arm bundle";
    if (productionByBasename.has(basename)) return "production document or style";
    return "other runtime";
  };
  const topFrames = [...totals.values()]
    .map((row) => ({
      ...row,
      category: classify(row),
      selfTimeMs: row.selfTimeMicros / 1000,
      selfTimePercent: totalSelfTimeMicros === 0
        ? null
        : row.selfTimeMicros * 100 / totalSelfTimeMicros,
    }))
    .sort((left, right) => right.selfTimeMicros - left.selfTimeMicros)
    .slice(0, 50);
  const categoryTimeMicros = {};
  for (const row of totals.values()) {
    const category = classify(row);
    categoryTimeMicros[category] = (categoryTimeMicros[category] ?? 0) +
      row.selfTimeMicros;
  }
  for (const [category, time] of Object.entries(categoryTimeMicros)) {
    categoryTimeMicros[category] = {
      selfTimeMicros: time,
      selfTimeMs: time / 1000,
      selfTimePercent: totalSelfTimeMicros === 0
        ? null
        : time * 100 / totalSelfTimeMicros,
    };
  }
  return {
    totalSelfTimeMicros,
    totalSelfTimeMs: totalSelfTimeMicros / 1000,
    sampleCount: (profile.samples ?? []).length,
    topFrames,
    categoryTime: categoryTimeMicros,
    categoryMethod:
      "URL/function-name heuristics only; the native arm chunk combines authored app and native runtime code, so labels do not establish per-stage CPU cost or causality.",
  };
}

async function sourceExcerpts(topFrames, productionHashes) {
  const byBasename = new Map(
    Object.entries(productionHashes).map(([filename, hash]) => [
      path.basename(filename),
      { filename, hash },
    ]),
  );
  const sourceCache = new Map();
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
    let code = sourceCache.get(source.filename);
    if (code === undefined) {
      code = await readFile(source.filename, "utf8");
      sourceCache.set(source.filename, code);
    }
    const lines = code.split("\n");
    if (frame.lineNumber >= lines.length) continue;
    const lineStart = lines.slice(0, frame.lineNumber).reduce(
      (sum, line) => sum + line.length + 1,
      0,
    );
    if (frame.columnNumber > lines[frame.lineNumber].length) continue;
    const offset = lineStart + frame.columnNumber;
    if (offset > code.length) continue;
    output.push({
      functionName: frame.functionName,
      url: frame.url,
      lineNumber: frame.lineNumber,
      columnNumber: frame.columnNumber,
      sampledSelfTimeMs: frame.selfTimeMs,
      productionFile: source.filename,
      productionSha256: source.hash,
      offsetUnit: "UTF-16 code units",
      excerptStartOffset: Math.max(0, offset - 150),
      sampleOffset: offset,
      excerptEndOffset: Math.min(code.length, offset + 150),
      minifiedCodeExcerpt: code.slice(Math.max(0, offset - 150), offset + 150),
    });
  }
  return output;
}

const checkpoint = JSON.parse(await readFile(checkpointPath, "utf8"));
const checkpointHash = await hashFile(checkpointPath);
const archiveHash = await hashFile(archivePath);
const expectedArchiveHash = "4aabe8b6cb3168aae50ba8474464452494d790aac60b472611fc20f54ec7a08c";
assert.equal(checkpoint.status, "UNIT_AUTHORED_COMPILER_THREE_AND_CHROMIUM_VERIFIED");
assert.equal(checkpoint.runtimeTests, 694);
assert.equal(checkpoint.rustTests, 33);
assert.equal(checkpoint.candidateProductionPilotPages, 0);
assert.equal(checkpoint.archiveSha256, expectedArchiveHash);
assert.equal(archiveHash, expectedArchiveHash);

const sourceBuildHashes = checkpoint.sourceAndBuildSha256;
assert.equal(Object.keys(sourceBuildHashes).length, 965);
for (const [filename, expectedHash] of Object.entries(sourceBuildHashes)) {
  assert.equal(await hashFile(filename), expectedHash, `Frozen compiled owner-row source/build file changed: ${filename}`);
}
const productionHashes = Object.fromEntries(Object.entries(sourceBuildHashes).filter(([filename]) =>
  filename.startsWith("dist-product-mixed-compiled-owner-rows/")
));
assert.equal(Object.keys(productionHashes).length, 5);

const verificationHashes = checkpoint.verificationSha256;
assert.equal(Object.keys(verificationHashes).length, 64);
for (const [filename, expectedHash] of Object.entries(verificationHashes)) {
  assert.equal(await hashFile(filename), expectedHash, `Frozen compiled owner-row verification evidence changed: ${filename}`);
}
assert.equal(checkpoint.qualifiedEngineDiagnostic, "results/numeric-cell-storage-candidate-v5/diagnostic.json");
const chromiumStorageDiagnostic = JSON.parse(await readFile(checkpoint.qualifiedEngineDiagnostic, "utf8"));
assert.equal(chromiumStorageDiagnostic.status, "PASS");
assert.equal(chromiumStorageDiagnostic.attempt, "v5");

const pilotManifest = JSON.parse(await readFile(pilotManifestPath, "utf8"));
const pilotManifestHash = await hashFile(pilotManifestPath);
assert.equal(pilotManifest.status, "PASS");
assert.match(pilotManifest.scope, /Correctness pilot only/);
const pilotDirectory = "results/product-mixed-compiled-owner-rows-pilot";
const expectedPilotPairs = [
  ["native", 128], ["react", 128], ["native", 512],
  ["react", 512], ["native", 1024], ["react", 1024],
];
assert.deepEqual(pilotManifest.records, expectedPilotPairs.map(([arm, size]) => ({ arm, size, status: "PASS" })));
assert.deepEqual(pilotManifest.sourceArchive, { path: archivePath, sha256: archiveHash });
assert.deepEqual(pilotManifest.productionSha256, productionHashes);
assert.deepEqual(pilotManifest.servedAssetSha256, productionHashes);
const expectedEngineEpoch = {
  product: chromiumStorageDiagnostic.browserVersion.product,
  jsVersion: chromiumStorageDiagnostic.browserVersion.jsVersion,
  revision: chromiumStorageDiagnostic.browserVersion.revision,
};
assert.deepEqual(pilotManifest.engineEpoch, expectedEngineEpoch);
assert.deepEqual(pilotManifest.chromiumDiagnostic, {
  path: checkpoint.qualifiedEngineDiagnostic,
  sha256: verificationHashes[checkpoint.qualifiedEngineDiagnostic],
  engineEpoch: expectedEngineEpoch,
});
const pilotPageLocks = {};
const pilotBrowserRecords = [];
for (const [arm, size] of expectedPilotPairs) {
  const filename = `${pilotDirectory}/${arm}-${size}.json`;
  const raw = JSON.parse(await readFile(filename, "utf8"));
  assert.equal(raw.status, "PASS");
  assert.equal(raw.mode, "pilot");
  assert.equal(raw.arm, arm);
  assert.equal(raw.size, size);
  assert.equal(raw.production, true);
  assert.equal(raw.samples?.length, 60);
  assert.deepEqual(raw.productionSha256, productionHashes);
  assert.deepEqual(raw.servedAssetSha256, productionHashes);
  assert.deepEqual(raw.engineEpoch, expectedEngineEpoch);
  assert.ok(raw.browser?.userAgent);
  assert.deepEqual(raw.browser?.viewport, { width: 1200, height: 900 });
  pilotBrowserRecords.push({ arm, size, ...raw.browser });
  assert.deepEqual(Object.values(raw.checks), [true, true, true, true, true]);
  assert.deepEqual(raw.errors, []);
  assert.deepEqual(raw.browserErrors, []);
  pilotPageLocks[filename] = await hashFile(filename);
}

const priorPreregistration = JSON.parse(await readFile(priorPreregistrationPath, "utf8"));
const priorManifest = JSON.parse(await readFile(priorManifestPath, "utf8"));
const priorFinalResults = JSON.parse(await readFile(priorFinalResultsPath, "utf8"));
const priorSummary = JSON.parse(await readFile(priorSummaryPath, "utf8"));
const priorVerification = JSON.parse(await readFile(priorVerificationPath, "utf8"));
assert.equal(priorFinalResults.status, "PASS");
assert.equal(priorManifest.status, "COLLECTION_COMPLETE");
assert.equal(priorManifest.records.length, 30);
assert.equal(priorVerification.status, "PASS");
assert.equal(priorVerification.gate, "FAIL");
assert.equal(priorSummary.gate, "FAIL");
assert.equal(priorVerification.rawPages, 30);
assert.equal(priorVerification.sourceBuildEntriesVerified, 965);
assert.equal(priorVerification.verificationEntriesVerified, 64);
const priorPageLocks = {};
for (const record of priorManifest.records) {
  assert.equal(record.status, "PASS");
  assert.equal(await hashFile(record.file), record.sha256, `Prior timing page changed: ${record.file}`);
  priorPageLocks[record.file] = record.sha256;
}
const priorConfirmationLocks = {
  [priorPreregistrationPath]: await hashFile(priorPreregistrationPath),
  [priorManifestPath]: await hashFile(priorManifestPath),
  [priorFinalResultsPath]: await hashFile(priorFinalResultsPath),
  [`${priorConfirmation}/postlock.json`]: await hashFile(`${priorConfirmation}/postlock.json`),
  [priorSummaryPath]: await hashFile(priorSummaryPath),
  [`${priorConfirmation}/summary-v2.svg`]: await hashFile(`${priorConfirmation}/summary-v2.svg`),
  [`${priorConfirmation}/summary.json`]: await hashFile(`${priorConfirmation}/summary.json`),
  [`${priorConfirmation}/summary.svg`]: await hashFile(`${priorConfirmation}/summary.svg`),
  [priorVerificationPath]: await hashFile(priorVerificationPath),
  ...priorPageLocks,
};

const timingCheckpoint = JSON.parse(await readFile(timingCheckpointPath, "utf8"));
const timingCheckpointHash = await hashFile(timingCheckpointPath);
const timingArchiveHash = await hashFile(timingArchivePath);
assert.equal(timingCheckpoint.status, "TIMING_CONFIRMATION_VERIFIED_SPEED_FAIL");
assert.equal(timingCheckpoint.runId, priorManifest.runId);
assert.equal(timingCheckpoint.archiveSha256, timingArchiveHash);
assert.equal(timingArchiveHash, expectedTimingArchiveHash);
assert.equal(timingCheckpoint.evidenceSha256[archivePath], expectedArchiveHash);
assert.equal(timingCheckpoint.pages, 30);
assert.equal(timingCheckpoint.measuredFrames, 7200);
assert.equal(timingCheckpoint.independentVerification, "PASS");
assert.equal(timingCheckpoint.speedGate, "FAIL");
assert.equal(timingCheckpoint.archiveMembers, 75);
assert.equal(Object.keys(timingCheckpoint.evidenceSha256).length, timingCheckpoint.archiveMembers);
for (const [filename, expectedHash] of Object.entries(timingCheckpoint.evidenceSha256)) {
  assert.equal(await hashFile(filename), expectedHash, `Frozen timing evidence changed: ${filename}`);
}
const timingEvidenceLocks = { ...timingCheckpoint.evidenceSha256 };

const protocolHash = await hashFile(protocolPath);
const scheduleHash = await hashFile(schedulePath);
const configHash = await hashFile(configPath);
const collectorHash = await hashFile(scriptPath);
const verifierHash = await hashFile(verifierPath);
const previousTimingLocks = priorPreregistration.inputLocks;
assert(previousTimingLocks && typeof previousTimingLocks === "object");
for (const [filename, expectedHash] of Object.entries(previousTimingLocks)) {
  assert.equal(await hashFile(filename), expectedHash, `Prior preregistered compiled owner-row timing input changed: ${filename}`);
}
const checkpointLocks = {
  [checkpointPath]: checkpointHash,
  [archivePath]: archiveHash,
  ...sourceBuildHashes,
  ...verificationHashes,
  [pilotManifestPath]: pilotManifestHash,
  [pilotVerifierPath]: await hashFile(pilotVerifierPath),
  ...pilotPageLocks,
};
const timingStatusAndArchiveLocks = {
  [timingCheckpointPath]: timingCheckpointHash,
  [timingArchivePath]: timingArchiveHash,
  ...timingEvidenceLocks,
};

await mkdir(outputDirectory, { recursive: true });
assert.equal(
  (await readdir(outputDirectory)).length,
  0,
  `Refusing to overwrite an existing CPU-profile directory: ${outputDirectory}`,
);

// Check CDP support and served static bytes without loading or running the app.
let browser = await openBrowser({ headless: false, gpu: false });
let preflightContext;
let preflightSession;
let servedBytesPreflight = [];
let engineEpoch;
try {
  preflightContext = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1200, height: 900 },
  });
  const preflightPage = await preflightContext.newPage();
  preflightSession = await preflightContext.newCDPSession(preflightPage);
  await preflightSession.send("Profiler.enable");
  await preflightSession.send("Profiler.setSamplingInterval", {
    interval: samplingIntervalMicros,
  });
  await preflightSession.send("Profiler.start");
  const preflight = await preflightSession.send("Profiler.stop");
  assert.ok(preflight.profile?.nodes?.length, "CDP returned no CPU profile nodes");
  const browserVersion = await preflightSession.send("Browser.getVersion");
  engineEpoch = {
    product: browserVersion.product,
    jsVersion: browserVersion.jsVersion,
    revision: browserVersion.revision,
  };
  assert.deepEqual(engineEpoch, expectedEngineEpoch, "CPU profiler browser differs from the qualified v5/pilot engine");
  await preflightPage.goto("about:blank");
  for (const filename of Object.keys(productionHashes)) {
    const publicPath = filename.slice("dist-product-mixed-compiled-owner-rows/".length);
    const response = await preflightContext.request.get(`${origin}/${publicPath}`);
    servedBytesPreflight.push({
      url: `${origin}/${publicPath}`,
      status: response.status(),
      filename: path.basename(filename),
      sha256: sha256(await response.body()),
    });
  }
  const expectedLocal = new Map(Object.entries(productionHashes).map(([filename, hash]) => [
    path.basename(filename), hash,
  ]));
  for (const response of servedBytesPreflight) {
    assert.equal(response.status, 200, `Candidate preflight returned HTTP ${response.status}: ${response.url}`);
    if (expectedLocal.has(response.filename)) {
      assert.equal(response.sha256, expectedLocal.get(response.filename), `Served candidate bytes differ from checkpoint: ${response.filename}`);
    }
  }
  assert(servedBytesPreflight.some((response) => response.filename === "product-mixed-v2.html"), "Candidate HTML response was not observed in served-byte preflight");
  assert(servedBytesPreflight.some((response) => response.filename.endsWith(".js")), "Candidate JavaScript response was not observed in served-byte preflight");
  assert.equal(servedBytesPreflight.length, 5, "All five frozen production assets must be fetched in preflight");
  assert.equal(new Set(servedBytesPreflight.map((response) => response.filename)).size, 5);
} finally {
  await preflightSession?.detach().catch(() => {});
  await preflightContext?.close().catch(() => {});
  await browser.close();
}

const preregistrationLocks = {
  ...checkpointLocks,
  ...timingStatusAndArchiveLocks,
  ...priorConfirmationLocks,
  ...previousTimingLocks,
  [priorPreregistrationPath]: await hashFile(priorPreregistrationPath),
  [priorManifestPath]: await hashFile(priorManifestPath),
  [priorFinalResultsPath]: await hashFile(priorFinalResultsPath),
  [priorSummaryPath]: await hashFile(priorSummaryPath),
  [priorVerificationPath]: await hashFile(priorVerificationPath),
  [protocolPath]: protocolHash,
  [schedulePath]: scheduleHash,
  [configPath]: configHash,
  [scriptPath]: collectorHash,
  [verifierPath]: verifierHash,
};
for (const [filename, expectedHash] of Object.entries(preregistrationLocks)) {
  assert.equal(await hashFile(filename), expectedHash, `Frozen input changed before preregistration: ${filename}`);
}

const cpuPreregistration = {
  schemaVersion: 1,
  study: "compiled-product-mixed-compiled-owner-rows-cpu-diagnostic",
  status: "FROZEN_BEFORE_CPU_PROFILE",
  runId,
  createdAt: new Date().toISOString(),
  frozenInputs: {
    checkpoint: { path: checkpointPath, sha256: checkpointHash, status: checkpoint.status, runtimeTests: checkpoint.runtimeTests, rustTests: checkpoint.rustTests },
    sourceBuildArchive: { path: archivePath, sha256: archiveHash },
    sourceBuildFiles: sourceBuildHashes,
    verificationEvidence: verificationHashes,
    correctnessPilotManifest: { path: pilotManifestPath, sha256: pilotManifestHash, status: pilotManifest.status },
    correctnessPilotPages: pilotPageLocks,
    qualifiedEngineDiagnostic: {
      path: checkpoint.qualifiedEngineDiagnostic,
      sha256: verificationHashes[checkpoint.qualifiedEngineDiagnostic],
      engineEpoch: expectedEngineEpoch,
    },
    pilotBuildAndEngine: {
      productionSha256: pilotManifest.productionSha256,
      servedAssetSha256: pilotManifest.servedAssetSha256,
      engineEpoch: pilotManifest.engineEpoch,
      browser: pilotBrowserRecords,
    },
    ownerRowTimingConfirmation: {
      preregistration: { path: priorPreregistrationPath, sha256: priorConfirmationLocks[priorPreregistrationPath] },
      manifest: { path: priorManifestPath, sha256: priorConfirmationLocks[priorManifestPath] },
      finalResults: { path: priorFinalResultsPath, sha256: priorConfirmationLocks[priorFinalResultsPath] },
      summaryV2: { path: priorSummaryPath, sha256: priorConfirmationLocks[priorSummaryPath], gate: priorSummary.gate },
      verificationV4: { path: priorVerificationPath, sha256: priorConfirmationLocks[priorVerificationPath], status: priorVerification.status, gate: priorVerification.gate },
      rawPages: priorPageLocks,
      timingArchive: { statusPath: timingCheckpointPath, statusSha256: timingCheckpointHash, archivePath: timingArchivePath, archiveSha256: timingArchiveHash, evidenceSha256: timingCheckpoint.evidenceSha256 },
    },
    productionFiles: productionHashes,
    protocol: { path: protocolPath, sha256: protocolHash },
    schedule: { path: schedulePath, sha256: scheduleHash, pages: selectedSchedule },
    collector: { path: scriptPath, sha256: collectorHash },
    verifier: { path: verifierPath, sha256: verifierHash },
    config: { path: configPath, sha256: configHash },
    inputLocks: preregistrationLocks,
    servedBytesPreflight,
    engineEpoch,
  },
  browser: {
    origin,
    headless: false,
    gpu: false,
    viewport: { width: 1200, height: 900 },
    freshContext: true,
    foregroundPage: true,
    serial: true,
    profilerSamplingIntervalMicros: samplingIntervalMicros,
    profilerStartsOnAboutBlankBeforeNavigation: true,
  },
  workload: {
    sequences: selectedSequences,
    size: 1024,
    arms: ["react", "native"],
    warmupFrames: 60,
    measuredFrames: 240,
    correctnessGate: "PASS and exactly 240 measured samples for each profiled page.",
  },
  profileScope: "Profiler starts on about:blank before navigation and runs through module import, mount, warmup, measured work, result inspection, and harness disposal; whole-page attribution only.",
  attributionTargets: {
    worldDispatch: { source: "src/owner_state_world.ts", routine: "#dispatchState", claim: "Frame-resolved attribution only; minified symbols may be unresolved." },
    rootCellCut: { source: "src/component_state_runtime.ts", routines: ["#tryFlushNativeCellCut", "#tryCommitNativeRows"], claim: "No internal timing hooks are enabled in this frozen production build." },
    vdomRowCut: { source: "src/vdom_snapshot_runtime.ts", routine: "#executePreparedNumericRows", claim: "Callframe/excerpt attribution only; cannot split validation, fanout dedup, and projection time." },
    hostWrites: { source: "src/vdom_snapshot_runtime.ts", routine: "#writeBoundGroup", claim: "Callframe/excerpt attribution only; host writes are interleaved in the whole-page profile." },
    structuralWork: { source: "src/component_state_runtime.ts and src/browser/product_mixed_harness.ts", metric: "Existing harness commitMs grouped by structural flag", claim: "CDP samples cannot be assigned to individual frames or structural edits." },
  },
  interpretationLimits: [
    "Time is estimated from CPU profiler sample timeDeltas, weighted by sampled self frames; it is not an exact instruction count or update-only cost.",
    "The profile includes module import, initial mount, warmup, harness checks, structural-frame work, and disposal, not just ordinary updates. Samples cannot be attributed to individual frame categories from this whole-page capture.",
    "Function and URL labels are attribution hints, not proof of causality.",
    "The minified native arm chunk combines authored app and runtime code; it has no source map, so stage details may remain unresolved.",
    "The frozen production arm does not enable RuntimeCounterCallback/profileCounter. Do not infer World, Root, VDOM, projection, deduplication, or host-write shares from bundle totals.",
    "This is one machine and browser; no independent-device claim is supported.",
    "The current owner-row timing confirmation has an independently verified failed fixed speed gate; this CPU profile is attribution only and does not revise that result.",
    "This current-candidate CPU attribution run is not a causal comparison with the prior timing confirmation.",
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
await writeJson(path.join(outputDirectory, "preregistration.json"), cpuPreregistration, "wx");

browser = await openBrowser({ headless: false, gpu: false });
const pageRecords = [];
try {
  for (const scheduled of selectedSchedule) {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: cpuPreregistration.browser.viewport,
    });
    const page = await context.newPage();
    const pageErrors = [];
    const resourceResponses = [];
    let session;
    let profilerStarted = false;
    const pageRecord = {
      schemaVersion: 1,
      study: "compiled-product-mixed-compiled-owner-rows-cpu-diagnostic",
      runId,
      sequence: scheduled.sequence,
      pair: scheduled.pair,
      arm: scheduled.arm,
      size: scheduled.size,
      origin,
      startedAt: new Date().toISOString(),
      status: "INCOMPLETE",
      pageErrors,
    };
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("response", (response) => {
      const url = response.url();
      if (url.startsWith(origin) && /\.(html|js|css)(\?|$)/.test(url)) {
        resourceResponses.push((async () => {
          try {
            return {
              url,
              status: response.status(),
              filename: path.basename(new URL(url).pathname),
              sha256: sha256(await response.body()),
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
      const pageBrowserVersion = await session.send("Browser.getVersion");
      pageRecord.engineEpoch = {
        product: pageBrowserVersion.product,
        jsVersion: pageBrowserVersion.jsVersion,
        revision: pageBrowserVersion.revision,
      };
      assert.deepEqual(pageRecord.engineEpoch, expectedEngineEpoch);
      pageRecord.browser = await page.evaluate(() => ({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      }));
      await session.send("Profiler.enable");
      await session.send("Profiler.setSamplingInterval", {
        interval: samplingIntervalMicros,
      });
      await session.send("Profiler.start");
      profilerStarted = true;

      const url =
        `${origin}/product-mixed-v2.html?mode=confirm&sequence=${scheduled.sequence}`;
      pageRecord.url = url;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.bringToFront();
      await page.waitForFunction(
        () => window.__productMixed?.result() !== undefined,
        null,
        { timeout: 90000 },
      );
      const result = await page.evaluate(() => window.__productMixed.result());
      pageRecord.result = result;
      pageRecord.active = result.active;
      assert.equal(result.status, "PASS");
      assert.equal(result.mode, "confirm");
      assert.equal(result.production, true);
      assert.equal(result.sequence, scheduled.sequence);
      assert.equal(result.pair, scheduled.pair);
      assert.equal(result.arm, scheduled.arm);
      assert.equal(result.size, scheduled.size);
      assert.equal(result.warmup, 60);
      assert.equal(result.frames, 240);
      assert.equal(result.samples.length, 240);
      assert.equal(result.active?.writers, 1024);
      assert.equal(result.after?.writers, 0);
      assert.equal(result.active?.mounts, result.active?.cleanups + 1024);
      assert.equal(result.after?.mounts, result.after?.cleanups);
      assert.deepEqual(Object.values(result.checks), [
        true,
        true,
        true,
        true,
        true,
      ]);
      assert.deepEqual(result.errors, []);
      assert.equal(
        result.samples.filter((sample) => sample.structural).length,
        8,
      );
      assert.deepEqual(pageErrors, []);
      pageRecord.harness = {
        status: result.status,
        checks: result.checks,
        sampleCount: result.samples.length,
        warmup: result.warmup,
        frames: result.frames,
        structuralFrameCount: result.samples.filter((sample) => sample.structural).length,
        samples: result.samples,
        active: result.active,
        after: result.after,
        mounts: result.active.mounts,
        cleanups: result.active.cleanups,
        postTeardown: result.after,
      };
      pageRecord.harnessFrameTiming = {
        all: result.summary?.all ?? null,
        ordinary: result.summary?.ordinary ?? null,
        structural: result.summary?.structural ?? null,
        note: "Existing harness wall-clock summaries; not a split of CDP CPU samples.",
      };

      const stopped = await session.send("Profiler.stop");
      profilerStarted = false;
      // Retain a completed profile even when subsequent qualification fails.
      pageRecord.profile = stopped.profile;
      pageRecord.summary = summarizeCpuProfile(stopped.profile, productionHashes);
      pageRecord.topFrameSourceExcerpts = await sourceExcerpts(
        pageRecord.summary.topFrames, productionHashes,
      );
      const loadedResources = await Promise.all(resourceResponses);
      pageRecord.loadedBuildResources = loadedResources;
      const expectedLocal = new Map(
        Object.entries(productionHashes).map((
          [filename, hash],
        ) => [
          path.basename(filename),
          hash,
        ]),
      );
      for (const response of loadedResources) {
        assert.equal(response.status, 200, `Production response failed: ${response.url}`);
        assert(expectedLocal.has(response.filename), `Unrecognized production response: ${response.url}`);
        if (response.filename && expectedLocal.has(response.filename)) {
          assert.equal(
            response.sha256,
            expectedLocal.get(response.filename),
            `Served file differs from frozen production build: ${response.filename}`,
          );
        }
      }
      const loadedNames = new Set(
        loadedResources.map((resource) => resource.filename),
      );
      assert(
        loadedNames.has("product-mixed-v2.html"),
        "Confirmation HTML response was not observed",
      );
      assert(
        loadedResources.some((resource) => resource.filename?.endsWith(".js")),
        "No production JavaScript response was observed",
      );
      for (const filename of Object.keys(productionHashes)) {
        const basename = path.basename(filename);
        const otherArm = scheduled.arm === "react"
          ? "native_product_mixed_arm-" : "product_mixed_react_arm-";
        if (basename.startsWith(otherArm)) continue;
        assert(
          loadedNames.has(basename),
          `Expected candidate production response was not observed: ${filename}`,
        );
      }
      const otherArm = scheduled.arm === "react"
        ? "native_product_mixed_arm-" : "product_mixed_react_arm-";
      assert(
        ![...loadedNames].some((name) => name.startsWith(otherArm)),
        `Unexpected opposite-arm production response: ${otherArm}`,
      );
      assert.deepEqual(pageErrors, []);
      pageRecord.status = "PASS";
    } catch (error) {
      pageRecord.status = "FAIL";
      pageRecord.failure = String(error?.stack ?? error);
      if (profilerStarted && session) {
        try {
          const stopped = await session.send("Profiler.stop");
          profilerStarted = false;
          pageRecord.profile = stopped.profile;
          pageRecord.summary = summarizeCpuProfile(
            stopped.profile,
            productionHashes,
          );
          pageRecord.topFrameSourceExcerpts = await sourceExcerpts(
            pageRecord.summary.topFrames,
            productionHashes,
          );
        } catch (stopError) {
          pageRecord.profileStopError = String(stopError);
        }
      }
      pageRecord.loadedBuildResources = await Promise.all(resourceResponses);
    } finally {
      pageRecord.finishedAt = new Date().toISOString();
      const filename = `${String(scheduled.sequence).padStart(2, "0")}-${scheduled.arm}-${scheduled.size}.json`;
      const pagePath = path.join(outputDirectory, filename);
      await writeJson(pagePath, pageRecord, "wx");
      pageRecords.push({
        sequence: scheduled.sequence,
        pair: scheduled.pair,
        arm: scheduled.arm,
        size: scheduled.size,
        status: pageRecord.status,
        file: filename,
        sha256: await hashFile(pagePath),
      });
      await session?.detach().catch(() => {});
      await context.close();
      await writeJson(path.join(outputDirectory, "results.json"), {
        schemaVersion: 1,
        study: "compiled-product-mixed-compiled-owner-rows-cpu-diagnostic",
        runId,
        createdAt: new Date().toISOString(),
        status: pageRecords.length === selectedSchedule.length &&
            pageRecords.every((record) => record.status === "PASS")
          ? "PASS"
          : "IN_PROGRESS",
        records: pageRecords,
        interpretation:
          "Two whole-page CPU attribution profiles only; do not pool with timing data or infer causality from names alone.",
        correctnessPilotReference: {
          manifest: pilotManifestPath,
          manifestSha256: await hashFile(pilotManifestPath),
          status: pilotManifest.status,
          pageCountValidated: Object.keys(pilotPageLocks).length,
        },
      });
      console.log(
        `${pageRecord.status} CPU profile ${scheduled.arm}/${scheduled.size} sequence=${scheduled.sequence}`,
      );
    }
  }
} finally {
  await browser.close();
}

const postLocks = {};
for (const filename of Object.keys(preregistrationLocks)) {
  try {
    postLocks[filename] = await hashFile(filename);
  } catch (error) {
    postLocks[filename] = { error: String(error) };
  }
}
const postLockMismatches = Object.entries(preregistrationLocks)
  .filter(([filename, expected]) => postLocks[filename] !== expected)
  .map(([filename]) => filename);
await writeJson(path.join(outputDirectory, "source-build-post-lock.json"), {
  checkedAt: new Date().toISOString(),
  status: postLockMismatches.length === 0 ? "PASS" : "FAIL",
  expected: preregistrationLocks,
  observed: postLocks,
  mismatches: postLockMismatches,
}, "wx");
await writeJson(path.join(outputDirectory, "results.json"), {
  schemaVersion: 1,
  study: "compiled-product-mixed-compiled-owner-rows-cpu-diagnostic",
  runId,
  createdAt: new Date().toISOString(),
  status: pageRecords.length === selectedSchedule.length &&
      pageRecords.every((record) => record.status === "PASS") &&
      postLockMismatches.length === 0
    ? "PASS"
    : "FAIL",
  records: pageRecords,
  sourceBuildPostLock: "source-build-post-lock.json",
  interpretation:
    "Two whole-page CPU profiles for the frozen compiled owner-row build; attribution only, not a latency verdict or causal comparison.",
  priorTimingContext: {
    status: priorVerification.status,
    gate: priorVerification.gate,
    timingArchiveSha256: timingArchiveHash,
  },
});

if (
  postLockMismatches.length > 0 ||
  pageRecords.length !== selectedSchedule.length ||
  pageRecords.some((record) => record.status !== "PASS")
) {
  process.exitCode = 1;
}
