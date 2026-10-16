import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";

const stageDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(stageDirectory, "../..");
const defaultConfig = path.join(workspaceRoot, ".cache/current-owner-kernel-headless-20261013-v1/frozen-config.json");
const args = process.argv.slice(2);
const option = (key) => {
  const index = args.indexOf(key);
  return index < 0 ? null : args[index + 1] ?? null;
};
const arm = option("--arm");
const rows = Number(option("--rows"));
const configPath = path.resolve(option("--config") ?? defaultConfig);
const outputBase = path.resolve(option("--output") ?? path.join(stageDirectory, "runs"));
if (arm !== "native" && arm !== "react") throw new Error("Usage: profile-one-arm.mjs --arm native|react --rows 1024 [--config FROZEN_CONFIG] [--output DIR]");
if (rows !== 1024) throw new Error("This diagnostic is intentionally bounded to --rows 1024.");
if (args.some((value, index) => value.startsWith("--") && !["--arm", "--rows", "--config", "--output"].includes(value))) {
  throw new Error("Unknown command-line option.");
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const abs = (value) => path.isAbsolute(value) ? value : path.resolve(workspaceRoot, value);
const hashFile = async (filename) => sha256(await readFile(filename));
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const nowIso = () => new Date().toISOString();
const runId = `${Date.now()}-${randomUUID()}`;
const outputDirectory = path.join(outputBase, `${arm}-${rows}-${runId}`);
const pageRecordPath = path.join(outputDirectory, "record.json");
const profilePath = path.join(outputDirectory, "profile.cpuprofile");
const sourcesDirectory = path.join(outputDirectory, "script-sources");
const record = {
  schemaVersion: "current-kernel-cpu-diagnostic-v1",
  diagnosticOnly: true,
  status: "STARTED",
  runId,
  startedAt: nowIso(),
  arm,
  rows,
  workload: { dirty: "all", placement: "contiguous", programs: "homogeneous", warmupFrames: 60, measuredFrames: 240 },
  profileScope: "One production page from about:blank navigation through app initialization, 60 warmup frames, 240 measured frames, per-frame DOM inspection, correctness checks, disposal, and dead-setter checks.",
  interpretation: "Whole-page sampled CPU attribution only. It includes harness, layout, DOM inspection, and lifecycle work; it is not a commit-latency measurement, phase attribution, comparison, ratio, or qualification gate.",
  config: { path: configPath, sha256: null },
  candidate: null,
  frozenInputs: null,
  browser: { headless: true, gpu: false, viewport: { width: 1200, height: 900 }, version: null },
  navigation: null,
  pageErrors: [],
  assetResponses: [],
  debuggerScripts: [],
  result: null,
  cpuProfile: null,
  stopReason: null,
  failure: null,
  cleanupErrors: [],
  completedAt: null,
};

await mkdir(sourcesDirectory, { recursive: true });
await writeFile(pageRecordPath, json(record), { flag: "wx" });
const configBytes = await readFile(configPath);
const configHash = sha256(configBytes);
record.config.sha256 = configHash;
const config = JSON.parse(configBytes.toString("utf8"));
assert.equal(config.schemaVersion, "headless-high-frequency-config-v1");
assert.equal(config.studyId, "current-owner-kernel-headless-20261013-v1");
assert.equal(config.origin, "https://react-runtime-headless.localhost:1355");
assert.equal(config.htmlPath, "/high-frequency.html");
assert.equal(config.expectedCrossOriginIsolated, true);
assert.equal(config.productionAssets.length, 5);
assert.equal(path.resolve(config.distDirectory), path.resolve(workspaceRoot, ".cache/high-frequency-build-proof-20261013-04/dist"));
record.candidate = structuredClone(config.candidate);

const readLocked = async (name, expectedHash) => {
  const filename = abs(name);
  const bytes = await readFile(filename);
  const actual = sha256(bytes);
  assert.equal(actual, expectedHash, `Frozen input changed: ${name}`);
  return { filename, bytes, value: JSON.parse(bytes.toString("utf8")), sha256: actual };
};
const status = await readLocked(config.candidate.checkpointStatusPath, config.candidate.checkpointSha256);
assert.equal(status.value.status, config.candidate.expectedCheckpointStatus);
const archiveBytes = await readFile(abs(config.candidate.sourceArchivePath));
assert.equal(sha256(archiveBytes), config.candidate.sourceArchiveSha256);
assert.equal(status.value.sourceArchiveSha256 ?? status.value.archiveSha256, config.candidate.sourceArchiveSha256);
const sourceLocks = await readLocked(config.candidate.sourceBuildLockPath, config.candidate.sourceBuildLockSha256);
const buildProof = await readLocked(config.candidate.buildProofPath, config.candidate.buildProofSha256);
const sourceLockMap = sourceLocks.value;
assert.ok(sourceLockMap && typeof sourceLockMap === "object" && !Array.isArray(sourceLockMap));
const sourceChecks = await Promise.all(Object.entries(sourceLockMap).map(async ([name, expected]) => {
  const actual = await hashFile(abs(name));
  return { path: name, expectedSha256: expected, actualSha256: actual, matches: actual === expected };
}));
assert.ok(sourceChecks.length > 0 && sourceChecks.every((item) => item.matches), "Current source/build inventory differs from frozen lock.");
const proof = buildProof.value;
assert.equal(proof.schemaVersion, "high-frequency-build-proof-v2");
assert.equal(proof.status, "PASS");
assert.equal(proof.productionBuild, true);
for (const rowName of ["NativeRowA", "NativeRowB"]) {
  const item = proof.transforms?.native?.assertions?.find((entry) => entry.name === rowName);
  assert.ok(item?.ownerUpdateProgram && item.ownerUpdateSchemaVersion === 2 && item.ownerUpdateSixArgs && item.ownerUpdateSlotCount === 3,
    `Missing captured native row build proof: ${rowName}`);
}
for (const rowName of ["ReactRowA", "ReactRowB"]) {
  const item = proof.transforms?.react?.assertions?.find((entry) => entry.name === rowName);
  assert.ok(item?.present && item.memoCacheAllocation && item.memoCacheReadWrite,
    `Missing React row compiler proof: ${rowName}`);
}
assert.equal(sourceLockMap[proof.sourceHashLock?.path], proof.sourceHashLock?.sha256,
  "Build proof source hash lock is not covered by the current source/build inventory.");
const assetChecks = await Promise.all(config.productionAssets.map(async (asset) => {
  const filename = path.join(config.distDirectory, asset.file);
  const actualSha256 = await hashFile(filename);
  return { urlPath: asset.urlPath, path: filename, expectedSha256: asset.sha256, actualSha256, matches: actualSha256 === asset.sha256 };
}));
assert.ok(assetChecks.every((item) => item.matches), "Build04 production assets differ from frozen hashes.");
record.frozenInputs = {
  status: { path: config.candidate.checkpointStatusPath, sha256: status.sha256, value: status.value.status },
  sourceArchive: { path: config.candidate.sourceArchivePath, sha256: sha256(archiveBytes) },
  sourceBuildLock: { path: config.candidate.sourceBuildLockPath, sha256: sourceLocks.sha256, entryCount: sourceChecks.length, checks: sourceChecks },
  buildProof: { path: config.candidate.buildProofPath, sha256: buildProof.sha256 },
  productionAssets: assetChecks,
};

const lockedByPath = new Map(config.productionAssets.map((asset) => [asset.urlPath, asset]));
const requiredPaths = new Set([
  config.htmlPath,
  config.productionAssets.find((item) => item.urlPath.endsWith(".css"))?.urlPath,
  config.productionAssets.find((item) => item.urlPath.endsWith(".js") && !item.urlPath.includes("native_high_frequency_arm-") && !item.urlPath.includes("react_high_frequency_arm-"))?.urlPath,
  config.productionAssets.find((item) => item.urlPath.includes(arm === "native" ? "native_high_frequency_arm-" : "react_high_frequency_arm-"))?.urlPath,
].filter(Boolean));
const oppositeArmAsset = config.productionAssets.find((item) => item.urlPath.includes(arm === "native" ? "react_high_frequency_arm-" : "native_high_frequency_arm-"));
const expectedJs = new Map(config.productionAssets.filter((item) => item.urlPath.endsWith(".js")).map((item) => [item.urlPath, item]));
const assetResponses = new Map();
const pageErrors = [];
const debuggerScripts = new Map();
let browser = null;
let context = null;
let page = null;
let session = null;
let profilerStarted = false;
let profileStopped = false;
let stopPromiseResolve;
const stopPromise = new Promise((resolve) => { stopPromiseResolve = resolve; });
const deadlineAt = Date.now() + 90_000;
const stop = (reason) => {
  if (record.stopReason) return;
  record.stopReason = reason;
  stopPromiseResolve(reason);
  browser?.close().catch((error) => record.cleanupErrors.push(`browser close on stop: ${String(error)}`));
};
const sigint = () => stop("SIGINT");
const sigterm = () => stop("SIGTERM");
process.on("SIGINT", sigint);
process.on("SIGTERM", sigterm);
const deadline = setTimeout(() => stop("deadline-90s"), 90_000);
const remaining = (cap = 15_000) => {
  const ms = Math.min(cap, deadlineAt - Date.now());
  if (record.stopReason || ms <= 0) throw new Error(`Diagnostic stopped: ${record.stopReason ?? "deadline-90s"}`);
  return ms;
};

const tryGetSources = async () => {
  if (!session) return;
  for (const script of debuggerScripts.values()) {
    try {
      if (script.sourceFile) continue;
      const response = await session.send("Debugger.getScriptSource", { scriptId: script.scriptId });
      const bytes = Buffer.from(response.scriptSource, "utf8");
      const locked = expectedJs.get(script.urlPath);
      const expectedSha256 = locked?.sha256 ?? null;
      const actualSha256 = sha256(bytes);
      const filename = path.join(sourcesDirectory, `${path.basename(script.urlPath)}.script-${script.scriptId}.js`);
      await writeFile(filename, bytes, { flag: "wx" });
      script.sourceFile = path.relative(outputDirectory, filename);
      script.sourceSha256 = actualSha256;
      script.sourceBytes = bytes.byteLength;
      script.matchesServedAsset = expectedSha256 === null ? null : actualSha256 === expectedSha256;
      script.expectedAssetSha256 = expectedSha256;
    } catch (error) {
      record.cleanupErrors.push(`Debugger.getScriptSource ${script.urlPath}#${script.scriptId}: ${String(error)}`);
    }
  }
  record.debuggerScripts = [...debuggerScripts.values()];
};

try {
  const opening = openBrowser({ headless: true, gpu: false, handleSignals: false }).then(async (instance) => {
    if (record.stopReason) {
      await instance.close().catch(() => {});
      throw new Error(`Stopped while browser was opening: ${record.stopReason}`);
    }
    return instance;
  });
  browser = await Promise.race([opening, stopPromise.then((reason) => { throw new Error(`Stopped while opening browser: ${reason}`); })]);
  record.browser.version = browser.version();
  context = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("response", (response) => {
    const task = (async () => {
      let url;
      try { url = new URL(response.url()); } catch { return; }
      if (url.origin !== new URL(config.origin).origin || !lockedByPath.has(url.pathname)) return;
      const body = await response.body();
      const asset = lockedByPath.get(url.pathname);
      const actualSha256 = sha256(body);
      assetResponses.set(url.pathname, {
        urlPath: url.pathname,
        status: response.status(),
        expectedSha256: asset.sha256,
        actualSha256,
        bytes: body.byteLength,
        matches: response.status() === 200 && actualSha256 === asset.sha256,
        headers: await response.allHeaders(),
      });
    })();
    responseTasks.push(task);
  });
  const responseTasks = [];
  session = await context.newCDPSession(page);
  session.on("Debugger.scriptParsed", (event) => {
    try {
      const url = new URL(event.url);
      if (url.origin !== new URL(config.origin).origin || !expectedJs.has(url.pathname)) return;
      const asset = expectedJs.get(url.pathname);
      debuggerScripts.set(`${event.scriptId}:${url.pathname}`, {
        scriptId: event.scriptId,
        url: event.url,
        urlPath: url.pathname,
        expectedAssetSha256: asset.sha256,
        executionContextId: event.executionContextId,
        startLine: event.startLine,
        startColumn: event.startColumn,
      });
    } catch { /* Non-URL and non-product scripts are intentionally ignored. */ }
  });
  await session.send("Debugger.enable");
  await session.send("Profiler.enable");
  await session.send("Profiler.setSamplingInterval", { interval: 1000 });
  await session.send("Profiler.start");
  profilerStarted = true;

  const url = new URL(config.htmlPath, config.origin);
  url.searchParams.set("arm", arm);
  url.searchParams.set("rows", String(rows));
  url.searchParams.set("dirty", "all");
  url.searchParams.set("placement", "contiguous");
  url.searchParams.set("programs", "homogeneous");
  const response = await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: remaining() });
  const headers = await response?.allHeaders() ?? {};
  record.navigation = {
    url: response?.url() ?? url.toString(),
    status: response?.status() ?? null,
    headers,
    crossOriginIsolated: await page.evaluate(() => globalThis.crossOriginIsolated),
  };
  await page.waitForFunction(() => globalThis.__highFrequencyResult !== undefined, undefined, { timeout: remaining(80_000) });
  record.result = await page.evaluate(() => globalThis.__highFrequencyResult);
  await Promise.all(responseTasks);
  record.assetResponses = [...assetResponses.values()];
  assert.equal(record.navigation.status, 200, "Production page navigation must return 200.");
  assert.equal(record.navigation.headers["cross-origin-opener-policy"], "same-origin");
  assert.equal(record.navigation.headers["cross-origin-embedder-policy"], "require-corp");
  assert.equal(record.navigation.crossOriginIsolated, true);
  assert.equal(record.result?.schemaVersion, "current-product-high-frequency-v1");
  assert.equal(record.result?.status, "PASS");
  assert.equal(record.result?.production, true);
  assert.equal(record.result?.arm, arm);
  assert.equal(record.result?.rows, rows);
  assert.equal(record.result?.dirty, "all");
  assert.equal(record.result?.placement, "contiguous");
  assert.equal(record.result?.programs, "homogeneous");
  assert.equal(record.result?.warmupFrames, 60);
  assert.equal(record.result?.measuredFrames, 240);
  assert.deepEqual(record.result?.checks, { output: true, order: true, identity: true, lifecycle: true, deadSetters: true, visible: true });
  assert.deepEqual(record.result?.errors, []);
  assert.equal(record.result?.warmupSamples?.length, 60);
  assert.equal(record.result?.samples?.length, 240);
  for (const [index, sample] of record.result.warmupSamples.entries()) {
    assert.equal(sample.frame, index + 1);
    assert.ok(finite(sample.commitMs) && finite(sample.intervalMs));
  }
  for (const [index, sample] of record.result.samples.entries()) {
    assert.equal(sample.frame, 61 + index);
    assert.equal(sample.dirtyCount, rows);
    assert.ok(finite(sample.commitMs) && finite(sample.intervalMs));
  }
  assert.equal(record.result.active?.mounts, rows);
  assert.equal(record.result.active?.cleanups, 0);
  assert.equal(record.result.active?.writers, rows);
  assert.equal(record.result.afterDispose?.mounts, rows);
  assert.equal(record.result.afterDispose?.cleanups, rows);
  assert.equal(record.result.afterDispose?.writers, 0);
  assert.equal(record.result.deadSetterProbeCount, rows);
  assert.equal(record.result.deadSetterThrows, arm === "native" ? rows : 0);
  assert.deepEqual(pageErrors, []);
  record.pageErrors = pageErrors;
  for (const pathname of requiredPaths) assert.ok(assetResponses.has(pathname), `Missing locked production response ${pathname}`);
  for (const pathname of requiredPaths) assert.equal(assetResponses.get(pathname)?.matches, true, `Served bytes differ for ${pathname}`);
  assert.equal(assetResponses.size, requiredPaths.size, "Unexpected or duplicate locked asset response set.");
  if (oppositeArmAsset) assert.ok(!assetResponses.has(oppositeArmAsset.urlPath), "Opposite arm asset should remain unloaded.");
  const executedLockedJs = [...debuggerScripts.values()];
  assert.ok(executedLockedJs.some((item) => item.urlPath.includes(arm === "native" ? "native_high_frequency_arm-" : "react_high_frequency_arm-")), "Selected arm JS did not execute.");
  record.status = "PASS";
} catch (error) {
  record.status = record.stopReason ? "INCOMPLETE" : "FAIL";
  record.failure = String(error?.stack ?? error);
  record.pageErrors = pageErrors;
} finally {
  if (profilerStarted && !profileStopped && session) {
    try {
      const stopped = await session.send("Profiler.stop");
      profileStopped = true;
      record.cpuProfile = summarizeProfile(stopped.profile);
      await writeFile(profilePath, json(stopped.profile), { flag: "wx" });
      record.cpuProfile.path = path.relative(outputDirectory, profilePath);
      record.cpuProfile.sha256 = await hashFile(profilePath);
      record.cpuProfile.bytes = (await readFile(profilePath)).byteLength;
    } catch (error) {
      record.cleanupErrors.push(`Profiler.stop/write: ${String(error)}`);
    }
  }
  await tryGetSources();
  if (session) await session.detach().catch((error) => record.cleanupErrors.push(`CDP detach: ${String(error)}`));
  if (context) await context.close().catch((error) => record.cleanupErrors.push(`Context close: ${String(error)}`));
  if (browser) await browser.close().catch((error) => record.cleanupErrors.push(`Browser close: ${String(error)}`));
  clearTimeout(deadline);
  process.off("SIGINT", sigint);
  process.off("SIGTERM", sigterm);
  record.pageErrors = pageErrors;
  record.assetResponses = [...assetResponses.values()];
  record.debuggerScripts = [...debuggerScripts.values()];
  record.completedAt = nowIso();
  record.durationMs = Date.now() - Number(runId.split("-")[0]);
  record.stopReason ??= null;
  if (record.stopReason && record.status === "PASS") {
    record.status = "INCOMPLETE";
    record.failure = `Stop requested: ${record.stopReason}`;
  }
  if (record.cleanupErrors.length && record.status === "PASS") {
    record.status = "FAIL";
    record.failure = `Cleanup or source capture failed: ${record.cleanupErrors.join("; ")}`;
  }
  await writeFile(pageRecordPath, json(record), { flag: "w" });
}

if (record.stopReason === "SIGINT") process.exitCode = 130;
else if (record.stopReason === "SIGTERM") process.exitCode = 143;
else if (record.status !== "PASS") process.exitCode = 1;
console.log(`CPU diagnostic ${record.status}: ${arm}, ${rows} rows; ${pageRecordPath}`);

function summarizeProfile(profile) {
  const nodes = new Map((profile.nodes ?? []).map((node) => [node.id, node]));
  const selfTime = new Map();
  const samples = profile.samples ?? [];
  const deltas = profile.timeDeltas ?? [];
  for (let index = 0; index < samples.length; index++) {
    const node = nodes.get(samples[index]);
    if (!node) continue;
    const frame = node.callFrame ?? {};
    const key = `${frame.url ?? ""}\u0000${frame.functionName ?? ""}\u0000${frame.lineNumber ?? -1}\u0000${frame.columnNumber ?? -1}`;
    const entry = selfTime.get(key) ?? {
      url: frame.url ?? "",
      functionName: frame.functionName || "(anonymous)",
      lineNumber: frame.lineNumber ?? -1,
      columnNumber: frame.columnNumber ?? -1,
      sampleCount: 0,
      selfTimeMicros: 0,
    };
    entry.sampleCount++;
    entry.selfTimeMicros += deltas[index] ?? 0;
    selfTime.set(key, entry);
  }
  const topFrames = [...selfTime.values()].sort((a, b) => b.selfTimeMicros - a.selfTimeMicros).slice(0, 50);
  return {
    samplingIntervalMicros: 1000,
    sampleCount: samples.length,
    totalSampledSelfTimeMicros: [...selfTime.values()].reduce((sum, item) => sum + item.selfTimeMicros, 0),
    topFrames,
    dataFile: path.relative(outputDirectory, profilePath),
  };
}
