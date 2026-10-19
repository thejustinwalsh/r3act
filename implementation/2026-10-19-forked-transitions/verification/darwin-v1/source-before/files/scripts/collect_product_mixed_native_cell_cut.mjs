import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { openBrowser } from "vitexec/cli";
import { productMixedSchedule } from "../src/browser/product_mixed_schedule.ts";

const origin = "https://compiled-native-cell-cut-timing.localhost:1355";
const output = "results/product-mixed-native-cell-cut-confirmation";
const preregistrationPath = `${output}/preregistration.json`;
const manifestPath = `${output}/manifest.json`;
const finalResultsPath = `${output}/FINALresults.json`;
const checkpoint = "implementation/2026-10-13-native-cell-cut";
const archivePath = `${checkpoint}/source-and-build.tar.gz`;
const statusPath = `${checkpoint}/status.json`;
const pilotDirectory = `${checkpoint}/verification/product-mixed-pilot`;
const pilotManifestPath = `${pilotDirectory}/results.json`;
const executionProofPath = `${checkpoint}/verification/execution-proof.json`;
const compilerProofPath = `${checkpoint}/verification/product-compiler-proof/native.js`;
const timingConfigPath = "vite.product-mixed-native-cell-cut-timing.config.ts";
const basePreviewConfigPath = "vite.product-mixed-native-cell-cut.config.ts";
const protocolPath = "product-mixed-native-cell-cut-confirmation-protocol.md";
const collectorPath = "scripts/collect_product_mixed_native_cell_cut.mjs";
const analyzerPath = "scripts/summarize_product_mixed_native_cell_cut.mjs";
const verifierPath = "scripts/verify_product_mixed_native_cell_cut_evidence.mjs";
const schedulePath = "src/browser/product_mixed_schedule.ts";
const buildDirectory = "dist-product-mixed-native-cell-cut";
const allocationCheckpoint = "implementation/2026-10-13-native-cell-cut-memory";
const allocationStatusPath = `${allocationCheckpoint}/status.json`;
const allocationArchivePath = `${allocationCheckpoint}/evidence.tar.gz`;
const allocationVerificationPath =
  "results/product-mixed-native-cell-cut-memory/verification.json";
const allocationAnalysisPath =
  "results/product-mixed-native-cell-cut-memory-analysis/analysis.json";
const expectedArchiveHash =
  "1687915fd6d6ba51d457a4265100e0c72eed5e2641af230257fd29185ec3ac45";
const expectedAllocationArchiveHash =
  "b8ff4de1b91e4575bcde7d6844c4cb5bbf30c9d93b7020c7c8095f3c36bb555a";
const expectedAllocationRatios = [
  0.8171613054148904,
  0.7181120594910139,
  0.7364903972829481,
];
const viewport = { width: 1200, height: 900 };
const sequences = productMixedSchedule.map((page) => page.sequence);
const isolationHeaders = {
  coop: "same-origin",
  coep: "require-corp",
};
const calibrationReadings = 100_000;
const calibrationRafIntervals = 48;
const minDenominatorTicks = 5;
const runId = randomUUID();

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (filename) => sha256(await readFile(filename));
const writeJson = (filename, value, flag = "w") =>
  writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, { flag });
const responseHeader = (headers, name) =>
  String(headers[name.toLowerCase()] ?? "").trim().toLowerCase();

async function calibratePage(page) {
  return await page.evaluate(async ({ readings, rafReadings }) => {
    let previous = performance.now();
    let minPositiveDeltaMs = Infinity;
    let positiveObservations = 0;
    for (let index = 0; index < readings; index++) {
      const current = performance.now();
      const delta = current - previous;
      if (delta > 0) {
        minPositiveDeltaMs = Math.min(minPositiveDeltaMs, delta);
        positiveObservations++;
      }
      previous = current;
    }
    const rafIntervalsMs = [];
    let previousRaf = await new Promise((resolve) => requestAnimationFrame(resolve));
    for (let index = 0; index < rafReadings; index++) {
      const currentRaf = await new Promise((resolve) => requestAnimationFrame(resolve));
      rafIntervalsMs.push(currentRaf - previousRaf);
      previousRaf = currentRaf;
    }
    return {
      minPositiveDeltaMs: Number.isFinite(minPositiveDeltaMs)
        ? minPositiveDeltaMs
        : null,
      positiveObservations,
      readings,
      rafIntervalsMs,
      crossOriginIsolated: globalThis.crossOriginIsolated === true,
      visibility: document.visibilityState,
      focused: document.hasFocus(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      timeOrigin: performance.timeOrigin,
    };
  }, { readings: calibrationReadings, rafReadings: calibrationRafIntervals });
}

function validateClock(clock, headers, label) {
  assert.ok(clock.minPositiveDeltaMs > 0, `${label}: no positive performance.now quantum`);
  assert.ok(clock.positiveObservations > 0, `${label}: no advancing clock observations`);
  assert.equal(clock.readings, calibrationReadings, `${label}: wrong clock sample count`);
  assert.equal(clock.crossOriginIsolated, true, `${label}: page is not cross-origin isolated`);
  assert.equal(clock.visibility, "visible", `${label}: page is not visible`);
  assert.equal(clock.focused, true, `${label}: page is not foregrounded`);
  assert.equal(headers.coop, isolationHeaders.coop, `${label}: wrong COOP response header`);
  assert.equal(headers.coep, isolationHeaders.coep, `${label}: wrong COEP response header`);
  assert.equal(clock.coop, isolationHeaders.coop, `${label}: clock COOP does not match`);
  assert.equal(clock.coep, isolationHeaders.coep, `${label}: clock COEP does not match`);
}

function validateResult(result, scheduled, browserErrors) {
  assert.equal(result?.status, "PASS");
  assert.equal(result.mode, "confirm");
  assert.equal(result.production, true);
  assert.equal(result.sequence, scheduled.sequence);
  assert.equal(result.pair, scheduled.pair);
  assert.equal(result.arm, scheduled.arm);
  assert.equal(result.size, scheduled.size);
  assert.equal(result.warmup, 60);
  assert.equal(result.frames, 240);
  assert.equal(result.samples?.length, 240);
  assert.deepEqual(
    result.samples.map((sample) => sample.frame),
    Array.from({ length: 240 }, (_, index) => index + 61),
  );
  assert.equal(result.samples.filter((sample) => sample.structural).length, 8);
  assert.deepEqual(Object.values(result.checks), [true, true, true, true, true]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(browserErrors, []);
  assert.equal(result.active?.writers, scheduled.size);
  assert.equal(result.after?.writers, 0);
  assert.equal(result.after?.mounts, result.after?.cleanups);
  assert.equal(result.active?.mounts, result.active?.cleanups + scheduled.size);
}

assert.equal(productMixedSchedule.length, 30, "The frozen schedule must contain 30 pages");
assert.deepEqual(sequences, Array.from({ length: 30 }, (_, index) => index));
assert.deepEqual(
  productMixedSchedule.filter((page) => page.pair === 0).map((page) => page.sequence),
  [0, 1, 10, 11, 20, 21],
);

const status = JSON.parse(await readFile(statusPath, "utf8"));
const statusHash = await hashFile(statusPath);
const archiveHash = await hashFile(archivePath);
assert.equal(status.status, "NATIVE_CELL_CUT_CORRECTNESS_VERIFIED");
assert.equal(status.runtimeTests, 573);
assert.equal(status.rustTests, 29);
assert.equal(status.integrationCommands, 58);
assert.equal(status.candidateProductionPilotPages, 6);
assert.equal(status.archiveSha256, expectedArchiveHash);
assert.equal(archiveHash, expectedArchiveHash);

const sourceAndBuildHashes = status.sourceAndBuildSha256;
assert.ok(sourceAndBuildHashes && typeof sourceAndBuildHashes === "object");
const productionHashes = Object.fromEntries(
  Object.entries(sourceAndBuildHashes).filter(([filename]) =>
    filename.startsWith(`${buildDirectory}/`)
  ),
);
assert.equal(Object.keys(productionHashes).length, 5);
for (const [filename, expectedHash] of Object.entries(sourceAndBuildHashes)) {
  assert.equal(await hashFile(filename), expectedHash, `Frozen input changed: ${filename}`);
}

const expectedPilotRecords = [
  ["native", 128], ["react", 128],
  ["native", 512], ["react", 512],
  ["native", 1024], ["react", 1024],
];
const pilotManifest = JSON.parse(await readFile(pilotManifestPath, "utf8"));
assert.equal(pilotManifest.status, "PASS");
assert.deepEqual(
  pilotManifest.records,
  expectedPilotRecords.map(([arm, size]) => ({ arm, size, status: "PASS" })),
);
assert.deepEqual(pilotManifest.nativeProof, {
  arm: "native",
  compiled: true,
  bindings: 3,
  deltas: true,
  propOnly: true,
  deltaFallback: false,
});
assert.deepEqual(pilotManifest.reactProof, {
  arm: "react",
  compiled: true,
  rowMemoCache: true,
  boardMemoCache: true,
});
const pilotPageHashes = {};
for (const [arm, size] of expectedPilotRecords) {
  const filename = `${pilotDirectory}/${arm}-${size}.json`;
  const page = JSON.parse(await readFile(filename, "utf8"));
  assert.equal(page.status, "PASS");
  assert.equal(page.mode, "pilot");
  assert.equal(page.production, true);
  assert.equal(page.arm, arm);
  assert.equal(page.size, size);
  assert.equal(page.frames, 60);
  assert.equal(page.samples?.length, 60);
  assert.deepEqual(Object.values(page.checks), [true, true, true, true, true]);
  assert.deepEqual(page.errors, []);
  assert.deepEqual(page.browserErrors, []);
  pilotPageHashes[filename] = await hashFile(filename);
}

const executionProof = JSON.parse(await readFile(executionProofPath, "utf8"));
const executionProofHash = await hashFile(executionProofPath);
const compilerProof = await readFile(compilerProofPath, "utf8");
const compilerProofHash = await hashFile(compilerProofPath);
assert.equal(status.verificationSha256?.["verification/execution-proof.json"], executionProofHash);
assert.equal(status.verificationSha256?.["verification/product-compiler-proof/native.js"], compilerProofHash);
assert.equal(executionProof.status, "PASS");
assert.equal(executionProof.captureCallsForEligibleCuts, 0);
assert.ok(executionProof.captureNativeCalls > 0);
assert.deepEqual(executionProof.numericFrames.map((frame) => frame.density), [1, 4, 32]);
assert.deepEqual(
  executionProof.numericFrames.map((frame) => frame.counters["numeric.program-batches"]),
  [1, 1, 1],
);
assert.deepEqual(
  executionProof.numericFrames.map((frame) => frame.counters["numeric.program-source-updates"]),
  [2, 8, 64],
);
assert.deepEqual(
  executionProof.numericFrames.map((frame) => frame.counters["numeric.program-projections"]),
  [5, 20, 160],
);
const compilerPlanStart = compilerProof.search(/\n\s*"component_module":/);
assert.ok(compilerPlanStart > 0);
const compilerExecutable = compilerProof.slice(0, compilerPlanStart);
assert.equal((compilerExecutable.match(/schemaVersion:\s*1/g) ?? []).length, 3);
assert.equal((compilerExecutable.match(/sourceSites:\s*\[/g) ?? []).length, 3);
assert.equal((compilerExecutable.match(/__nativeBindStatePropAt\(/g) ?? []).length, 3);
assert.equal(
  (compilerExecutable.match(/__nativeBindStatePropAt\([\s\S]*?__nativeNumericPrograms\[\d+\]\)/g) ?? []).length,
  3,
);

const allocationStatus = JSON.parse(await readFile(allocationStatusPath, "utf8"));
const allocationArchiveHash = await hashFile(allocationArchivePath);
const allocationVerification = JSON.parse(await readFile(allocationVerificationPath, "utf8"));
const allocationAnalysis = JSON.parse(await readFile(allocationAnalysisPath, "utf8"));
assert.equal(allocationStatus.status, "ALLOCATION_DIAGNOSTIC_VERIFIED");
assert.equal(allocationStatus.archiveSha256, expectedAllocationArchiveHash);
assert.equal(allocationStatus.sourceCheckpointArchiveSha256, expectedArchiveHash);
assert.equal(allocationStatus.independentVerificationChecks, 109);
assert.equal(allocationArchiveHash, expectedAllocationArchiveHash);
assert.equal(allocationVerification.status, "PASS");
assert.equal(allocationVerification.summary?.checkCount, 109);
assert.equal(allocationVerification.summary?.passed, 109);
assert.equal(allocationVerification.summary?.failed, 0);
assert.deepEqual(
  allocationAnalysis.pairs.map((pair) => pair.nativeOverReactTreeRatio),
  expectedAllocationRatios,
);

const protocolHash = await hashFile(protocolPath);
const timingConfigHash = await hashFile(timingConfigPath);
const basePreviewConfigHash = await hashFile(basePreviewConfigPath);
const scheduleHash = await hashFile(schedulePath);
const collectorHash = await hashFile(collectorPath);
const analyzerHash = await hashFile(analyzerPath);
const verifierHash = await hashFile(verifierPath);
const allocationLocks = {
  [allocationStatusPath]: await hashFile(allocationStatusPath),
  [allocationArchivePath]: allocationArchiveHash,
  [allocationVerificationPath]: await hashFile(allocationVerificationPath),
  [allocationAnalysisPath]: await hashFile(allocationAnalysisPath),
};

await mkdir(output, { recursive: true });
assert.equal((await readdir(output)).length, 0, `Refusing to reuse nonempty output directory: ${output}`);

const browser = await openBrowser({ headless: false, gpu: false });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport });
let preregistration;
const pageRecords = [];
try {
  const assetPreflight = [];
  for (const [filename, expectedHash] of Object.entries(productionHashes)) {
    const publicPath = filename.slice(`${buildDirectory}/`.length);
    const response = await context.request.get(`${origin}/${publicPath}`);
    const headers = response.headers();
    assert.equal(response.status(), 200, `Production asset unavailable: ${filename}`);
    assert.equal(responseHeader(headers, "cross-origin-opener-policy"), isolationHeaders.coop);
    assert.equal(responseHeader(headers, "cross-origin-embedder-policy"), isolationHeaders.coep);
    const observedHash = sha256(await response.body());
    assert.equal(observedHash, expectedHash, `Served product bytes changed: ${filename}`);
    assetPreflight.push({
      filename,
      sha256: observedHash,
      coop: responseHeader(headers, "cross-origin-opener-policy"),
      coep: responseHeader(headers, "cross-origin-embedder-policy"),
    });
  }

  const calibrationPage = await context.newPage();
  await calibrationPage.goto("about:blank");
  await calibrationPage.bringToFront();
  const calibrationResponse = await calibrationPage.goto(`${origin}/__clock-calibration`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  assert.equal(calibrationResponse?.status(), 200);
  const calibrationHeaders = calibrationResponse.headers();
  const calibrationHeaderValues = {
    coop: responseHeader(calibrationHeaders, "cross-origin-opener-policy"),
    coep: responseHeader(calibrationHeaders, "cross-origin-embedder-policy"),
  };
  const clock = await calibratePage(calibrationPage);
  clock.coop = calibrationHeaderValues.coop;
  clock.coep = calibrationHeaderValues.coep;
  validateClock(clock, calibrationHeaderValues, "Pre-registration isolated calibration");
  assert.match(await calibrationPage.locator("body").innerText(), /Clock calibration only/);
  assert.equal(await calibrationPage.evaluate(() => document.querySelector("script") === null), true);

  const inputLocks = {
    [archivePath]: archiveHash,
    [statusPath]: statusHash,
    ...sourceAndBuildHashes,
    [`${checkpoint}/verification/product-mixed-pilot/results.json`]: await hashFile(pilotManifestPath),
    ...pilotPageHashes,
    [executionProofPath]: executionProofHash,
    [compilerProofPath]: compilerProofHash,
    [allocationStatusPath]: allocationLocks[allocationStatusPath],
    [allocationArchivePath]: allocationLocks[allocationArchivePath],
    [allocationVerificationPath]: allocationLocks[allocationVerificationPath],
    [allocationAnalysisPath]: allocationLocks[allocationAnalysisPath],
    [protocolPath]: protocolHash,
    [timingConfigPath]: timingConfigHash,
    [basePreviewConfigPath]: basePreviewConfigHash,
    [collectorPath]: collectorHash,
    [analyzerPath]: analyzerHash,
    [verifierPath]: verifierHash,
    [schedulePath]: scheduleHash,
  };
  for (const [filename, expectedHash] of Object.entries(inputLocks)) {
    assert.equal(await hashFile(filename), expectedHash, `Frozen input changed before preregistration: ${filename}`);
  }

  preregistration = {
    schemaVersion: 1,
    study: "compiled-product-mixed-native-cell-cut-confirmation",
    status: "FROZEN_BEFORE_CONFIRMATION",
    runId,
    frozenAt: new Date().toISOString(),
    archive: archivePath,
    archiveSha256: archiveHash,
    protocol: protocolPath,
    protocolSha256: protocolHash,
    schedule: productMixedSchedule,
    scheduleSource: { path: schedulePath, sha256: scheduleHash },
    candidate: {
      status: status.status,
      archivePath,
      archiveSha256: archiveHash,
      runtimeTests: status.runtimeTests,
      rustTests: status.rustTests,
      integrationCommands: status.integrationCommands,
      candidateProductionPilotPages: status.candidateProductionPilotPages,
    },
    sourceAndBuildSha256: sourceAndBuildHashes,
    productionSha256: productionHashes,
    proof: {
      pilotManifestPath,
      pilotManifestSha256: await hashFile(pilotManifestPath),
      native: pilotManifest.nativeProof,
      react: pilotManifest.reactProof,
      executionProof: {
        path: executionProofPath,
        sha256: executionProofHash,
        status: executionProof.status,
        captureCallsForEligibleCuts: executionProof.captureCallsForEligibleCuts,
        captureNativeCalls: executionProof.captureNativeCalls,
        numericFrames: executionProof.numericFrames.map((frame) => ({
          density: frame.density,
          batches: frame.counters["numeric.program-batches"],
          sourceUpdates: frame.counters["numeric.program-source-updates"],
          projections: frame.counters["numeric.program-projections"],
        })),
      },
      compilerEmission: {
        path: compilerProofPath,
        sha256: compilerProofHash,
        numericProgramDescriptors: 3,
        numericProgramBindings: 3,
      },
      pilotPageHashes,
    },
    allocationContext: {
      statusPath: allocationStatusPath,
      statusSha256: allocationLocks[allocationStatusPath],
      archivePath: allocationArchivePath,
      archiveSha256: allocationArchiveHash,
      verificationPath: allocationVerificationPath,
      verificationSha256: allocationLocks[allocationVerificationPath],
      independentChecks: allocationStatus.independentVerificationChecks,
      analysisPath: allocationAnalysisPath,
      analysisSha256: allocationLocks[allocationAnalysisPath],
      nativeOverReactTreeRatios: expectedAllocationRatios,
      interpretation: "Allocation diagnostic only; these ratios are not speed evidence.",
    },
    buildProofSha256: {
      [pilotManifestPath]: await hashFile(pilotManifestPath),
      ...pilotPageHashes,
      [executionProofPath]: executionProofHash,
      [compilerProofPath]: compilerProofHash,
    },
    collectorSha256: collectorHash,
    analyzer: { path: analyzerPath, sha256: analyzerHash },
    verifier: { path: verifierPath, sha256: verifierHash },
    timingEnvironment: {
      configPath: timingConfigPath,
      configSha256: timingConfigHash,
      baseConfigPath: basePreviewConfigPath,
      baseConfigSha256: basePreviewConfigHash,
      origin,
      calibrationPath: "/__clock-calibration",
      coop: isolationHeaders.coop,
      coep: isolationHeaders.coep,
      crossOriginIsolated: clock.crossOriginIsolated,
      assetPreflight,
    },
    browser: {
      headless: false,
      gpu: false,
      viewport,
      freshContexts: true,
      serial: true,
      userAgent: clock.userAgent,
      isolationHeaders: calibrationHeaderValues,
    },
    clock,
    decision: {
      medianRatioMax: 0.8,
      medianSizesRequired: 2,
      p95RatioMax: 1.1,
      minDenominatorTicks,
      denominatorRule: "max(preregistration,reactPage,nativePage) * minDenominatorTicks",
      unresolvedWhen: "The React page median is below its paired denominator resolution floor.",
      noPageExclusions: true,
    },
    workload: {
      warmup: 60,
      frames: 240,
      topologyEvery: 30,
      removed: 8,
      inserted: 8,
      rotation: 13,
      measuredFrameNumbers: [61, 300],
      structuralFrames: 8,
      exactScheduleLength: 30,
      eachResultMustPassAllFiveChecks: true,
    },
    inputLocks,
    machine: {
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
      cpuModel: os.cpus()[0]?.model ?? null,
      logicalCpuCount: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
    },
    limits: [
      "The page load is the replication unit; frame samples are nested observations.",
      "COOP/COEP is a measurement-environment change applied equally to both arms; product source and build bytes are unchanged.",
      "The memory allocation ratios are separate context and do not establish speed.",
      "This confirmation is not a causal comparison with historical checkpoints or an independent-device result.",
    ],
  };
  await writeJson(preregistrationPath, preregistration, "wx");
  await calibrationPage.close();
  await context.close();
  console.log(`FROZEN ${productMixedSchedule.length} pages; isolated clock ${clock.minPositiveDeltaMs} ms`);

  for (const scheduled of productMixedSchedule) {
    const filename = `${output}/sequence-${String(scheduled.sequence).padStart(2, "0")}.json`;
    const pageContext = await browser.newContext({ ignoreHTTPSErrors: true, viewport });
    const page = await pageContext.newPage();
    const browserErrors = [];
    const resourceResponses = [];
    const startedAt = new Date().toISOString();
    const pageRecord = {
      schemaVersion: 1,
      study: preregistration.study,
      runId,
      sequence: scheduled.sequence,
      schedule: scheduled,
      archiveSha256: archiveHash,
      protocolSha256: protocolHash,
      preregistrationSha256: await hashFile(preregistrationPath),
      startedAt,
      finishedAt: null,
      status: "INCOMPLETE",
      result: null,
      browserErrors,
      navigationHeaders: null,
      crossOriginIsolated: false,
      postDisposeClock: null,
    };
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("response", (response) => {
      const url = response.url();
      if (url.startsWith(origin) && /\.(html|js|css)(\?|$)/.test(url)) {
        resourceResponses.push((async () => {
          try {
            const body = await response.body();
            const headers = response.headers();
            return {
              url,
              status: response.status(),
              filename: `${buildDirectory}${new URL(url).pathname}`,
              sha256: sha256(body),
              coop: responseHeader(headers, "cross-origin-opener-policy"),
              coep: responseHeader(headers, "cross-origin-embedder-policy"),
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
      const navigationResponse = await page.goto(
        `${origin}/product-mixed-v2.html?mode=confirm&sequence=${scheduled.sequence}`,
        { waitUntil: "domcontentloaded", timeout: 60_000 },
      );
      assert.equal(navigationResponse?.status(), 200);
      const navigationResponseHeaders = navigationResponse.headers();
      pageRecord.navigationHeaders = {
        coop: responseHeader(navigationResponseHeaders, "cross-origin-opener-policy"),
        coep: responseHeader(navigationResponseHeaders, "cross-origin-embedder-policy"),
      };
      assert.deepEqual(pageRecord.navigationHeaders, isolationHeaders);
      await page.bringToFront();
      await page.waitForFunction(() => window.__productMixed?.result() !== undefined, null, {
        timeout: 90_000,
      });
      pageRecord.result = await page.evaluate(() => window.__productMixed.result());
      await page.evaluate(() => window.__productMixed?.dispose());
      pageRecord.postDisposeClock = await calibratePage(page);
      pageRecord.postDisposeClock.coop = pageRecord.navigationHeaders.coop;
      pageRecord.postDisposeClock.coep = pageRecord.navigationHeaders.coep;
      pageRecord.crossOriginIsolated = pageRecord.postDisposeClock.crossOriginIsolated;
      validateClock(pageRecord.postDisposeClock, pageRecord.navigationHeaders, `Page ${scheduled.sequence}`);
      pageRecord.endVisibility = {
        state: pageRecord.postDisposeClock.visibility,
        focused: pageRecord.postDisposeClock.focused,
      };
      validateResult(pageRecord.result, scheduled, browserErrors);

      const loadedResources = await Promise.all(resourceResponses);
      pageRecord.loadedBuildResources = loadedResources;
      const loadedNames = new Set();
      for (const resource of loadedResources) {
        assert.equal(resource.status, 200);
        assert.ok(resource.filename in productionHashes, `Unexpected resource: ${resource.filename}`);
        assert.equal(resource.sha256, productionHashes[resource.filename]);
        assert.equal(resource.coop, isolationHeaders.coop);
        assert.equal(resource.coep, isolationHeaders.coep);
        loadedNames.add(path.basename(resource.filename));
      }
      const commonNames = [
        path.basename(`${buildDirectory}/product-mixed-v2.html`),
        ...Object.keys(productionHashes)
          .filter((name) => !/native_product_mixed_arm-|product_mixed_react_arm-/.test(name))
          .map((name) => path.basename(name)),
      ];
      for (const name of commonNames) assert(loadedNames.has(name), `Missing common resource: ${name}`);
      const selectedArm = scheduled.arm === "native"
        ? /^native_product_mixed_arm-/
        : /^product_mixed_react_arm-/;
      const oppositeArm = scheduled.arm === "native"
        ? /^product_mixed_react_arm-/
        : /^native_product_mixed_arm-/;
      assert([...loadedNames].some((name) => selectedArm.test(name)));
      assert(![...loadedNames].some((name) => oppositeArm.test(name)));
      pageRecord.status = "PASS";
    } catch (error) {
      pageRecord.status = "FAIL";
      pageRecord.failure = String(error?.stack ?? error);
      pageRecord.loadedBuildResources = await Promise.all(resourceResponses);
    } finally {
      pageRecord.finishedAt = new Date().toISOString();
      await writeJson(filename, pageRecord, "wx");
      pageRecords.push({
        sequence: scheduled.sequence,
        pair: scheduled.pair,
        arm: scheduled.arm,
        size: scheduled.size,
        status: pageRecord.status,
        file: filename,
        sha256: await hashFile(filename),
      });
      await writeJson(manifestPath, {
        schemaVersion: 1,
        study: preregistration.study,
        runId,
        preregistrationSha256: await hashFile(preregistrationPath),
        archiveSha256: archiveHash,
        status: "COLLECTING",
        files: pageRecords.map((record) => ({
          sequence: record.sequence,
          file: record.file,
          sha256: record.sha256,
        })),
        postCollectionChangedFiles: [],
        records: pageRecords,
        failedOrIncomplete: pageRecords.filter((record) => record.status !== "PASS"),
      });
      console.log(`PAGE ${scheduled.sequence + 1}/30 ${scheduled.arm}/${scheduled.size}: ${pageRecord.status}`);
      await pageContext.close();
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
  const postCollectionChangedFiles = postLockMismatches.map((record) => record.filename);
  const postlock = {
    schemaVersion: 1,
    study: preregistration.study,
    runId,
    checkedAt: new Date().toISOString(),
    status: postLockMismatches.length === 0 ? "PASS" : "FAIL",
    records: postLockRecords,
    mismatches: postLockMismatches,
  };
  await writeJson(`${output}/postlock.json`, postlock, "wx");
  const everyPagePassed = pageRecords.length === productMixedSchedule.length &&
    pageRecords.every((record) => record.status === "PASS");
  const finalStatus = everyPagePassed && postLockMismatches.length === 0
    ? "COLLECTION_COMPLETE"
    : postLockMismatches.length > 0
    ? "COLLECTION_COMPLETE_LOCK_FAILED"
    : "COLLECTION_COMPLETE_WITH_FAILURES";
  const finalManifest = {
    schemaVersion: 1,
    study: preregistration.study,
    runId,
    status: finalStatus,
    preregistrationSha256: await hashFile(preregistrationPath),
    archiveSha256: archiveHash,
    files: pageRecords.map((record) => ({
      sequence: record.sequence,
      file: record.file,
      sha256: record.sha256,
    })),
    postCollectionChangedFiles,
    records: pageRecords,
    failedOrIncomplete: pageRecords.filter((record) => record.status !== "PASS"),
  };
  await writeJson(manifestPath, finalManifest);
  await writeJson(finalResultsPath, {
    schemaVersion: 1,
    study: preregistration.study,
    runId,
    finalizedAt: new Date().toISOString(),
    status: finalStatus === "COLLECTION_COMPLETE" ? "PASS" : "FAIL",
    records: pageRecords,
    postlock: { path: "postlock.json", status: postlock.status, mismatches: postLockMismatches },
    interpretation:
      "Named candidate confirmation under the preregistered isolated timing environment; no historical causal claim.",
    decision: preregistration.decision,
  }, "wx");
  if (finalStatus !== "COLLECTION_COMPLETE") process.exitCode = 1;
} finally {
  await context.close().catch(() => {});
  await browser.close();
}
