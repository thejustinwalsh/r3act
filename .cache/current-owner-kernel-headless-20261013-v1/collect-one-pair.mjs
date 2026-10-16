import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";
import { decisionRulesSha256, measuredFrames, schedule, scheduleSha256, viewport, warmupFrames } from "./study-spec.mjs";

const stageDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(stageDirectory, "../..");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const resolveWorkspacePath = (filename) => path.isAbsolute(filename) ? filename : path.resolve(repositoryRoot, filename);
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? null : args[index + 1] ?? null;
};
const configPath = option("--config");
const rows = Number(option("--size"));
const pairIndex = Number(option("--pair"));
if (!configPath || args.length !== 6 || !Number.isInteger(rows) || !Number.isInteger(pairIndex)) {
  throw new Error("Usage: collect-one-pair.mjs --config FROZEN_CONFIG --size 128|1024|10000 --pair 0..4");
}
const configBytes = await readFile(path.resolve(configPath));
const config = JSON.parse(configBytes.toString("utf8"));
assert.equal(config.schemaVersion, "headless-high-frequency-config-v1");
assert.ok(config.studyId && !config.studyId.startsWith("fill-"), "config must identify a frozen study");
assert.ok(Number.isFinite(config.preregisteredClockQuantumMs) && config.preregisteredClockQuantumMs > 0,
  "a positive preregistered timer quantum must be locked before any pair is run");
assert.ok(config.origin.startsWith("https://") && config.origin.includes(".localhost"), "origin must use Portless HTTPS .localhost");
assert.ok(path.isAbsolute(config.distDirectory) && path.isAbsolute(config.outputDirectory), "dist and output directories must be absolute");
assert.ok(config.productionAssets.length === 5, "expected five frozen production asset locks");
assert.ok(config.candidate.checkpointStatusPath && config.candidate.checkpointSha256, "candidate status and checkpoint hash are required");
assert.ok(config.candidate.expectedCheckpointStatus && !config.candidate.expectedCheckpointStatus.startsWith("FILL"), "exact candidate status value is required");
assert.ok(config.candidate.sourceArchivePath && config.candidate.sourceArchiveSha256, "source archive path and hash are required");
assert.ok(config.candidate.sourceBuildLockPath && config.candidate.sourceBuildLockSha256, "source/build lock file and hash are required");
assert.ok(config.candidate.buildProofPath && config.candidate.buildProofSha256, "build proof and hash are required");
const pair = schedule.find((item) => item.rows === rows && item.pair === pairIndex);
assert.ok(pair, "requested size/pair is outside the frozen 15-pair schedule");
const pairStem = "pair-" + rows + "-" + String(pairIndex).padStart(2, "0");
const pairPath = path.join(config.outputDirectory, pairStem + ".json");
const pagePaths = pair.pages.map((page) => path.join(config.outputDirectory, "sequence-" + String(page.sequence).padStart(2, "0") + ".json"));
const calibrationPath = (page, phase) => path.join(config.outputDirectory,
  "calibration-sequence-" + String(page.sequence).padStart(2, "0") + "-" + phase + ".json");
const calibrationPaths = pair.pages.flatMap((page) => [calibrationPath(page, "before"), calibrationPath(page, "after")]);
await mkdir(config.outputDirectory, { recursive: true });
for (const filename of [pairPath, ...calibrationPaths, ...pagePaths]) {
  try {
    await readFile(filename);
    throw new Error("Refusing to rerun or replace existing evidence: " + filename);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const readLockedJson = async (filename, expectedHash) => {
  const bytes = await readFile(path.resolve(filename));
  assert.equal(sha256(bytes), expectedHash, "frozen input hash mismatch: " + filename);
  return JSON.parse(bytes.toString("utf8"));
};
const exactSourcePaths = [
  "src/component_state_runtime.ts", "src/vdom_snapshot_runtime.ts", "src/owner_state_world.ts",
  "src/compiled_state_layout.ts", "src/native_runtime_api.ts", "compiler/oxc-spike/src/main.rs",
  "compiler/oxc-spike/src/owner_update_program.rs", "compiler/vite_native_plugin.ts",
  "compiler/vite_native_module.ts",
];
const stagedHarnessPaths = ["src/browser/high_frequency_harness.ts", "src/browser/high_frequency_contract.ts",
  "src/browser/native_high_frequency_arm.tsx", "src/browser/react_high_frequency_arm.tsx", "src/browser/high_frequency.css"];
const lockHasStagePath = (locks, suffix) => Object.keys(locks).some((name) => {
  const normalized = name.replaceAll("\\", "/");
  return normalized.startsWith(".cache/high-frequency-harness-stage/") && normalized.endsWith(suffix);
});
const required = (condition, message) => { if (!condition) throw new Error(message); };
const validateBuildProof = (proof, locks) => {
  required(proof?.schemaVersion === "high-frequency-build-proof-v2" && proof.status === "PASS" && proof.productionBuild === true,
    "build proof is not a successful production build v2");
  const native = proof.transforms?.native;
  const react = proof.transforms?.react;
  required(native?.conditionalMapsBothNativeRows === true, "native component-map proof is missing");
  const rowNames = ["NativeRowA", "NativeRowB"];
  for (const name of rowNames) {
    const assertion = native.assertions?.find((item) => item.name === name);
    required(assertion && assertion.emittedComponent && assertion.programIdMatchesComponent && assertion.stateLayout && assertion.threeStateSites,
      "native transformed assertion missing for " + name);
    required(assertion.ownerUpdateProgram === true && assertion.ownerUpdateSchemaVersion === 2 &&
      assertion.ownerUpdateSixArgs === true && assertion.ownerUpdateSlotCount === 3 && assertion.ownerUpdateSinkCount === 3 &&
      assertion.ownerUpdateProgramId === assertion.componentId && assertion.programId === assertion.componentId &&
      assertion.ownerUpdateProgramIdMatchesComponent === true, "native schema-v2 six-argument row kernel mismatch for " + name);
    const registration = native.nativeRegistrations?.find((item) => item.componentId.endsWith("#component:" + name));
    required(registration && registration.programId === assertion.programId && registration.schemaVersion === 1 &&
      registration.slots?.length === 3 && registration.slots.every((slot, index) => slot.slot === index) &&
      registration.ownerUpdateKernelTable === assertion.ownerUpdateKernelTable &&
      registration.ownerUpdateKernelIndex === assertion.ownerUpdateKernelIndex,
    "native registration does not link to row program " + name);
    const kernel = native.nativeOwnerUpdateKernels?.find((item) => item.index === registration.ownerUpdateKernelIndex);
    required(kernel && kernel.tableName === "__nativeOwnerCutKernels" && kernel.programId === registration.programId &&
      kernel.schemaVersion === 2 && kernel.slotCount === 3 && kernel.sinkIds?.length === 3 &&
      JSON.stringify(kernel.executeCutParameters) === JSON.stringify(["changedSlots", "changeCount", "rowStates", "stagedInputIndices", "stagedSinkIds", "stagedValues"]),
    "native emitted six-argument kernel table mismatch for " + name);
  }
  for (const name of ["ReactRowA", "ReactRowB"]) {
    const assertion = react?.assertions?.find((item) => item.name === name);
    required(assertion?.present === true && assertion.memoCacheAllocation === true && assertion.memoCacheReadWrite === true,
      "React compiler memo-cache proof missing for " + name);
    const success = proof.reactRowCompilerSuccesses?.find((item) => item.fnName === name && item.memoSlots === 11);
    required(success, "React compiler did not report successful row compilation for " + name);
  }
  const sourceLock = proof.sourceHashLock;
  required(sourceLock?.path && /^[a-f0-9]{64}$/.test(sourceLock.sha256) &&
    locks[sourceLock.path] === sourceLock.sha256, "build proof source hash lock is not part of the frozen source/build inventory");
};
const [checkpointStatus, sourceArchiveBytes, sourceBuildLocks, buildProof] = await Promise.all([
  readLockedJson(resolveWorkspacePath(config.candidate.checkpointStatusPath), config.candidate.checkpointSha256),
  readFile(resolveWorkspacePath(config.candidate.sourceArchivePath)),
  readLockedJson(resolveWorkspacePath(config.candidate.sourceBuildLockPath), config.candidate.sourceBuildLockSha256),
  readLockedJson(resolveWorkspacePath(config.candidate.buildProofPath), config.candidate.buildProofSha256),
]);
assert.equal(sha256(sourceArchiveBytes), config.candidate.sourceArchiveSha256, "frozen source archive changed");
assert.equal(checkpointStatus?.status, config.candidate.expectedCheckpointStatus, "candidate checkpoint status differs from its frozen expected status");
assert.equal(checkpointStatus?.sourceArchiveSha256 ?? checkpointStatus?.archiveSha256, config.candidate.sourceArchiveSha256,
  "candidate checkpoint does not bind the configured source archive");
assert.ok(sourceBuildLocks && typeof sourceBuildLocks === "object" && !Array.isArray(sourceBuildLocks), "source/build lock must be a path→sha256 object");
for (const filename of exactSourcePaths) assert.ok(Object.hasOwn(sourceBuildLocks, filename), "source/build inventory omits exact path: " + filename);
for (const filename of stagedHarnessPaths) assert.ok(lockHasStagePath(sourceBuildLocks, filename), "source/build inventory omits staged harness path: " + filename);
for (const [filename, expectedHash] of Object.entries(sourceBuildLocks)) assert.match(expectedHash, /^[a-f0-9]{64}$/, "invalid SHA-256 lock: " + filename);
validateBuildProof(buildProof, sourceBuildLocks);
const sourceBuildChecks = [];
for (const [filename, expectedHash] of Object.entries(sourceBuildLocks)) {
  const bytes = await readFile(resolveWorkspacePath(filename));
  const actualHash = sha256(bytes);
  sourceBuildChecks.push({ path: filename, expectedSha256: expectedHash, actualSha256: actualHash, matches: actualHash === expectedHash });
}
assert.ok(sourceBuildChecks.length > 0 && sourceBuildChecks.every((item) => item.matches), "frozen source/build inventory changed");

const localAssets = [];
for (const asset of config.productionAssets) {
  const bytes = await readFile(path.join(config.distDirectory, asset.file));
  const actualHash = sha256(bytes);
  localAssets.push({ ...asset, actualSha256: actualHash, bytes: bytes.byteLength, matches: actualHash === asset.sha256 });
}
assert.ok(localAssets.every((asset) => asset.matches), "local production asset bytes differ from frozen asset locks");

const resultKeys = [
  "schemaVersion", "status", "arm", "rows", "dirty", "placement", "programs", "production", "userAgent",
  "warmupFrames", "measuredFrames", "checks", "errors", "mountAndFrameZeroInitializationMs", "warmupSamples",
  "samples", "disposeMs", "active", "afterDispose", "deadSetterProbeCount", "deadSetterThrows", "summary", "timingContract",
].sort();
const checkKeys = ["output", "order", "identity", "lifecycle", "deadSetters", "visible"].sort();
const lifecycleKeys = ["mounts", "cleanups", "writers"].sort();
const exactKeys = (value, expected) => value && typeof value === "object" &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify(expected);
const finite = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
const expectedAssetByPath = new Map(config.productionAssets.map((item) => [item.urlPath, item]));
const browserConfig = { headless: true, gpu: false, viewport };
const pairStartedAt = Date.now();
const pairDeadlineAt = pairStartedAt + 90_000;
let stopReason = null;
let browserClosePromise = null;
let browser = null;
let resolveStopRequest;
const stopRequested = new Promise((resolve) => { resolveStopRequest = resolve; });
const stopPair = (reason) => {
  if (stopReason) return;
  stopReason = reason;
  resolveStopRequest(reason);
  if (browser) browserClosePromise ??= browser.close().catch(() => {});
};
const onSigint = () => stopPair("SIGINT");
const onSigterm = () => stopPair("SIGTERM");
process.on("SIGINT", onSigint);
process.on("SIGTERM", onSigterm);
const deadlineTimer = setTimeout(() => stopPair("pair-deadline-90s"), Math.max(1, pairDeadlineAt - Date.now()));
try {
  const opening = openBrowser({ headless: true, gpu: false, handleSignals: false }).then(async (instance) => {
    if (stopReason) {
      await instance.close().catch(() => {});
      throw new Error("pair stopped while browser was opening: " + stopReason);
    }
    return instance;
  });
  browser = await Promise.race([opening, stopRequested.then((reason) => { throw new Error("pair stopped while browser was opening: " + reason); })]);
} catch (error) {
  clearTimeout(deadlineTimer);
  process.off("SIGINT", onSigint);
  process.off("SIGTERM", onSigterm);
  const receipt = {
    schemaVersion: "headless-high-frequency-pair-receipt-v2", studyId: config.studyId,
    configPath: path.resolve(configPath), configSha256: sha256(configBytes), candidate: config.candidate,
    rows, pair: pairIndex, pairId: pair.pairId, scheduleSha256, decisionRulesSha256,
    status: "INCOMPLETE", stopReason: stopReason ?? "browser-launch-failed", failure: String(error),
    pageRecords: [], calibrationRecords: [], deadlineMs: 90_000,
  };
  await writeFile(pairPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  throw error;
}
const browserVersion = browser.version();
if (stopReason) {
  await browser.close().catch(() => {});
  clearTimeout(deadlineTimer);
  process.off("SIGINT", onSigint);
  process.off("SIGTERM", onSigterm);
  const receipt = {
    schemaVersion: "headless-high-frequency-pair-receipt-v2", studyId: config.studyId,
    configPath: path.resolve(configPath), configSha256: sha256(configBytes), candidate: config.candidate,
    rows, pair: pairIndex, pairId: pair.pairId, scheduleSha256, decisionRulesSha256,
    status: "INCOMPLETE", stopReason, failure: "stop requested before browser pair work began",
    pageRecords: [], calibrationRecords: [], deadlineMs: 90_000,
  };
  await writeFile(pairPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  process.exitCode = stopReason === "SIGINT" ? 130 : stopReason === "SIGTERM" ? 143 : 1;
  throw new Error("pair stopped before work began: " + stopReason);
}
const remainingTimeout = (cap) => {
  const remaining = pairDeadlineAt - Date.now();
  if (stopReason || remaining <= 0) throw new Error("pair stopped: " + (stopReason ?? "pair-deadline-90s"));
  return Math.max(1, Math.min(cap, remaining));
};
const pageRecords = [];
let pairFailure = null;
const calibrations = [];
const runCalibration = async (pageCase, phase) => {
  const filename = calibrationPath(pageCase, phase);
  if (stopReason) throw new Error("pair stopped: " + stopReason);
  const calibrationContext = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  let calibration;
  try {
    const page = await calibrationContext.newPage();
    const blockedScripts = [];
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith(".js")) {
        blockedScripts.push(url.pathname);
        await route.abort();
      } else await route.continue();
    });
    const response = await page.goto(new URL(config.htmlPath, config.origin).toString(), { waitUntil: "domcontentloaded", timeout: remainingTimeout(20_000) });
    const headers = response?.headers() ?? {};
    const calibrationHtmlHash = response ? sha256(await response.body()) : null;
    const calibrationData = await page.evaluate(() => {
      let previous = performance.now();
      let minPositiveQuantum = Infinity;
      let positiveSteps = 0;
      for (let index = 0; index < 250000; index++) {
        const current = performance.now();
        const delta = current - previous;
        if (delta > 0) {
          minPositiveQuantum = Math.min(minPositiveQuantum, delta);
          positiveSteps++;
        }
        previous = current;
      }
      return { minPositiveQuantumMs: minPositiveQuantum, positiveSteps,
        crossOriginIsolated: globalThis.crossOriginIsolated,
        harnessResultAbsent: globalThis.__highFrequencyResult === undefined };
    });
    calibration = {
      schemaVersion: "headless-high-frequency-calibration-v2", pageSequence: pageCase.sequence,
      phase, pairId: pair.pairId, url: response?.url() ?? null, status: response?.status() ?? null,
      htmlSha256: calibrationHtmlHash, headers, blockedScripts, browserVersion, ...calibrationData,
      valid: response?.status() === 200 &&
        headers["cross-origin-opener-policy"] === config.expectedIsolationHeaders["cross-origin-opener-policy"] &&
        headers["cross-origin-embedder-policy"] === config.expectedIsolationHeaders["cross-origin-embedder-policy"] &&
        calibrationData.crossOriginIsolated === config.expectedCrossOriginIsolated &&
        calibrationData.harnessResultAbsent === true && blockedScripts.length > 0 &&
        Number.isFinite(calibrationData.minPositiveQuantumMs) && calibrationData.minPositiveQuantumMs > 0 &&
        calibrationData.positiveSteps > 0,
    };
  } finally {
    await calibrationContext.close().catch(() => {});
  }
  await writeFile(filename, JSON.stringify(calibration, null, 2) + "\n", { flag: "wx" });
  calibrations.push({ path: filename, ...calibration });
  return calibration;
};
try {
  for (const pageCase of pair.pages) {
    if (stopReason) break;
    const beforeCalibration = await runCalibration(pageCase, "before");
    if (!beforeCalibration.valid) pairFailure = "bare-page COOP/COEP or timer calibration failed before page " + pageCase.sequence;
    const url = new URL(config.htmlPath, config.origin);
    url.searchParams.set("arm", pageCase.arm);
    url.searchParams.set("rows", String(pageCase.rows));
    url.searchParams.set("dirty", pageCase.dirty);
    url.searchParams.set("placement", pageCase.placement);
    url.searchParams.set("programs", pageCase.programs);
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    let record;
    let contextCloseError = null;
    try {
      const page = await context.newPage();
      const pageErrors = [];
      const loadedBuildResources = [];
      const pendingBodies = [];
      page.on("pageerror", (error) => pageErrors.push(String(error)));
      page.on("response", (response) => {
        let parsed;
        try { parsed = new URL(response.url()); } catch { return; }
        if (parsed.origin !== config.origin || !expectedAssetByPath.has(parsed.pathname)) return;
        const expected = expectedAssetByPath.get(parsed.pathname);
        pendingBodies.push((async () => {
          try {
            const bytes = await response.body();
            const actualHash = sha256(bytes);
            loadedBuildResources.push({
              path: parsed.pathname,
              status: response.status(),
              expectedSha256: expected.sha256,
              actualSha256: actualHash,
              bytes: bytes.byteLength,
              matches: actualHash === expected.sha256,
            });
          } catch (error) {
            loadedBuildResources.push({ path: parsed.pathname, status: response.status(), expectedSha256: expected.sha256, actualSha256: null, bytes: null, matches: false, error: String(error) });
          }
        })());
      });
      let navigationStatus = null;
      let navigationHeaders = {};
      let result = null;
      let executionError = null;
      try {
        const response = await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: remainingTimeout(45_000) });
        navigationStatus = response?.status() ?? null;
        navigationHeaders = response?.headers() ?? {};
        await page.waitForFunction(() => window.__highFrequencyResult !== undefined, undefined, { timeout: remainingTimeout(45_000) });
        result = await page.evaluate(() => window.__highFrequencyResult);
      } catch (error) {
        executionError = String(error);
        try { result = await page.evaluate(() => window.__highFrequencyResult ?? null); } catch { /* Preserve null if the page never loaded. */ }
      }
      await Promise.allSettled(pendingBodies);
      const errors = [];
      const fail = (condition, message) => { if (!condition) errors.push(message); };
      fail(navigationStatus === 200, "navigation did not return HTTP 200");
      fail(exactKeys(result, resultKeys), "published result key set differs from the harness schema");
      fail(result?.schemaVersion === "current-product-high-frequency-v1" && result?.status === "PASS", "harness result is not PASS");
      fail(result?.arm === pageCase.arm && result?.rows === pageCase.rows, "arm or row count differs from schedule");
      fail(result?.dirty === "all" && result?.placement === "contiguous" && result?.programs === "homogeneous", "workload differs from schedule");
      fail(result?.production === true, "page did not report production output");
      fail(result?.warmupFrames === warmupFrames && result?.measuredFrames === measuredFrames, "warmup/measured frame counts differ");
      fail(exactKeys(result?.checks, checkKeys) && Object.values(result.checks).every((value) => value === true), "one or more correctness checks failed");
      fail(Array.isArray(result?.errors) && result.errors.length === 0, "harness reported errors");
      fail(Array.isArray(result?.warmupSamples) && result.warmupSamples.length === warmupFrames, "warmup sample count differs");
      fail(Array.isArray(result?.samples) && result.samples.length === measuredFrames, "measured sample count differs");
      fail(exactKeys(result?.active, lifecycleKeys) && result.active.mounts === pageCase.rows && result.active.cleanups === 0 && result.active.writers === pageCase.rows, "active lifecycle counts differ");
      fail(exactKeys(result?.afterDispose, lifecycleKeys) && result.afterDispose.mounts === pageCase.rows && result.afterDispose.cleanups === pageCase.rows && result.afterDispose.writers === 0, "disposed lifecycle counts differ");
      fail(result?.deadSetterProbeCount === pageCase.rows && result.deadSetterThrows === (pageCase.arm === "native" ? pageCase.rows : 0), "dead-setter probe differs from arm contract");
      fail(loadedBuildResources.length > 0 && loadedBuildResources.every((item) => item.status === 200 && item.matches), "loaded production response bytes did not match locks");
      const expectedArmFile = pageCase.arm === "native" ? "native_high_frequency_arm-" : "react_high_frequency_arm-";
      fail(loadedBuildResources.some((item) => item.path.includes(expectedArmFile)), "active production arm asset was not captured");
      fail(pageErrors.length === 0, "browser pageerror events were recorded");
      fail(navigationHeaders["cross-origin-opener-policy"] === config.expectedIsolationHeaders["cross-origin-opener-policy"], "navigation COOP header differs");
      fail(navigationHeaders["cross-origin-embedder-policy"] === config.expectedIsolationHeaders["cross-origin-embedder-policy"], "navigation COEP header differs");
      if (executionError) errors.unshift("page execution error: " + executionError);
      const isolation = await page.evaluate(() => ({ crossOriginIsolated: globalThis.crossOriginIsolated, visibilityState: document.visibilityState, userAgent: navigator.userAgent })).catch(() => null);
      fail(isolation?.crossOriginIsolated === config.expectedCrossOriginIsolated, "application page isolation differs from config");
      fail(isolation?.visibilityState === "visible" && result?.checks?.visible === true, "page was not visible for the run");
      for (const [index, sample] of (result?.warmupSamples ?? []).entries()) fail(sample.frame === index + 1 && finite(sample.commitMs) && finite(sample.intervalMs), "invalid warmup sample");
      for (const [index, sample] of (result?.samples ?? []).entries()) {
        fail(sample.frame === index + warmupFrames + 1 && sample.dirtyCount === pageCase.rows && finite(sample.commitMs) && finite(sample.intervalMs), "invalid measured frame sample");
      }
      record = {
        schemaVersion: "headless-high-frequency-page-v1",
        page: pageCase,
        pairId: pair.pairId,
        url: url.toString(),
        status: errors.length === 0 ? "PASS" : "FAIL",
        browser: { ...browserConfig, version: browserVersion, userAgent: isolation?.userAgent ?? null, crossOriginIsolated: isolation?.crossOriginIsolated ?? null },
        navigation: { status: navigationStatus, headers: navigationHeaders },
        pageErrors,
        loadedBuildResources,
        beforeCalibrationPath: calibrationPath(pageCase, "before"),
        beforeCalibrationQuantumMs: beforeCalibration.minPositiveQuantumMs,
        executionError,
        validationErrors: errors,
        result,
      };
    } catch (error) {
      record = {
        schemaVersion: "headless-high-frequency-page-v1",
        page: pageCase,
        pairId: pair.pairId,
        url: url.toString(),
        status: "FAIL",
        browser: { ...browserConfig, version: browserVersion },
        navigation: { status: null, headers: {} },
        pageErrors: [],
        loadedBuildResources: [],
        beforeCalibrationPath: calibrationPath(pageCase, "before"),
        beforeCalibrationQuantumMs: beforeCalibration.minPositiveQuantumMs,
        executionError: String(error),
        validationErrors: [String(error)],
        result: null,
      };
    } finally {
      await context.close().catch((error) => { contextCloseError = String(error); });
    }
    if (contextCloseError) {
      record.status = "FAIL";
      record.executionError ??= "browser context close failed: " + contextCloseError;
      record.validationErrors ??= [];
      record.validationErrors.push("browser context close failed: " + contextCloseError);
      pairFailure ??= record.executionError;
    }
    let afterCalibration = null;
    let afterCalibrationError = null;
    try {
      afterCalibration = await runCalibration(pageCase, "after");
      if (!afterCalibration.valid) pairFailure = "bare-page COOP/COEP or timer calibration failed after page " + pageCase.sequence;
    } catch (error) {
      afterCalibrationError = String(error);
      pairFailure ??= afterCalibrationError;
    }
    record.afterCalibrationPath = afterCalibration ? calibrationPath(pageCase, "after") : null;
    record.afterCalibrationQuantumMs = afterCalibration?.minPositiveQuantumMs ?? null;
    record.afterCalibrationError = afterCalibrationError;
    record.pairClockQuantumMs = afterCalibration
      ? Math.max(beforeCalibration.minPositiveQuantumMs, afterCalibration.minPositiveQuantumMs)
      : null;
    if (!beforeCalibration.valid || !afterCalibration?.valid || afterCalibrationError) {
      record.status = "FAIL";
      record.validationErrors.push("before/after page clock calibration is missing or invalid");
    }
    const pagePath = pagePaths[pageCase.sequence - pair.pages[0].sequence];
    await writeFile(pagePath, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
    pageRecords.push({ sequence: pageCase.sequence, arm: pageCase.arm, rows, status: record.status, path: pagePath, sha256: sha256(await readFile(pagePath)) });
  }
} catch (error) {
  pairFailure ??= String(error?.stack ?? error);
} finally {
  if (Date.now() >= pairDeadlineAt && !stopReason) stopReason = "pair-deadline-90s";
  clearTimeout(deadlineTimer);
  process.off("SIGINT", onSigint);
  process.off("SIGTERM", onSigterm);
  await (browserClosePromise ?? browser.close()).catch(() => {});
}

const receipt = {
  schemaVersion: "headless-high-frequency-pair-receipt-v2",
  studyId: config.studyId,
  configPath: path.resolve(configPath),
  configSha256: sha256(configBytes),
  candidate: config.candidate,
  rows,
  pair: pairIndex,
  pairId: pair.pairId,
  scheduleSha256,
  decisionRulesSha256,
  localAssets,
  sourceBuildFileCount: sourceBuildChecks.length,
  sourceBuildLocksSha256: config.candidate.sourceBuildLockSha256,
  sourceArchiveSha256: config.candidate.sourceArchiveSha256,
  buildProofSha256: config.candidate.buildProofSha256,
  calibrationRecords: calibrations.map(({ path: filename, phase, pageSequence, valid, minPositiveQuantumMs }) => ({
    path: filename, phase, pageSequence, valid, minPositiveQuantumMs,
  })),
  maxObservedClockQuantumMs: calibrations.length ? Math.max(...calibrations.map((item) => item.minPositiveQuantumMs)) : null,
  preregisteredClockQuantumMs: config.preregisteredClockQuantumMs,
  effectiveClockQuantumMs: calibrations.length ? Math.max(config.preregisteredClockQuantumMs, ...calibrations.map((item) => item.minPositiveQuantumMs)) : null,
  clockFloorMs: calibrations.length ? 5 * Math.max(config.preregisteredClockQuantumMs, ...calibrations.map((item) => item.minPositiveQuantumMs)) : null,
  deadlineMs: 90_000,
  durationMs: Date.now() - pairStartedAt,
  stopReason,
  pageRecords,
  status: stopReason || calibrations.length !== 4 || pageRecords.length !== 2 ? "INCOMPLETE" :
    !pairFailure && calibrations.every((item) => item.valid) && pageRecords.every((record) => record.status === "PASS") ? "PASS" : "FAIL",
  failure: pairFailure,
};
await writeFile(pairPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
console.log("Pair " + pair.pairId + " " + receipt.status + "; completed raw records preserved; no cross-pair summary computed.");
if (stopReason === "SIGINT") process.exitCode = 130;
else if (stopReason === "SIGTERM") process.exitCode = 143;
else if (receipt.status !== "PASS") process.exitCode = 1;
