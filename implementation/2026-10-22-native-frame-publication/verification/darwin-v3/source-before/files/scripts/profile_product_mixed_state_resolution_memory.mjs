import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { openBrowser } from "vitexec/cli";
import { productMixedSchedule } from "../src/browser/product_mixed_schedule.ts";

const scriptPath = "scripts/profile_product_mixed_state_resolution_memory.mjs";
const output = "results/product-mixed-state-resolution-memory";
const implementationDirectory = "implementation/2026-10-12-state-resolution";
const statusPath = `${implementationDirectory}/status.json`;
const archivePath = `${implementationDirectory}/source-and-build.tar.gz`;
const protocolPath = "product-mixed-state-resolution-memory-protocol.md";
const schedulePath = "src/browser/product_mixed_schedule.ts";
const buildDirectory = "dist-product-mixed-state-resolution";
const proofDirectory = `${implementationDirectory}/verification/product-mixed-pilot`;
const pilotManifestPath = `${proofDirectory}/results.json`;
const origin = "https://compiled-state-resolution.localhost:1355";
const expectedStatus = "STATE_RESOLUTION_CORRECTNESS_VERIFIED";
const sequences = [0, 1, 10, 11, 20, 21];
const samplingIntervalBytes = 32 * 1024;
const viewport = { width: 1200, height: 900 };
const runId = randomUUID();
const expectedArchiveHash = process.env.EXPECTED_STATE_RESOLUTION_ARCHIVE_SHA256;

const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const hashFile = async (filename) => sha256(await readFile(filename));
const writeJson = (filename, value, flag = "w") =>
  writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, { flag });
const getHeapUsage = (session) => session.send("Runtime.getHeapUsage");

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
    const lineStart = lines.slice(0, frame.lineNumber).reduce((sum, line) => sum + line.length + 1, 0);
    const offset = Math.min(source.length, lineStart + frame.columnNumber);
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

assert.ok(
  /^[a-f0-9]{64}$/.test(expectedArchiveHash ?? ""),
  "EXPECTED_STATE_RESOLUTION_ARCHIVE_SHA256 must be set to the reviewed archive SHA-256",
);

const status = JSON.parse(await readFile(statusPath, "utf8"));
const statusHash = await hashFile(statusPath);
const archiveHash = await hashFile(archivePath);
const protocolHash = await hashFile(protocolPath);
const scheduleHash = await hashFile(schedulePath);
const pilotManifest = JSON.parse(await readFile(pilotManifestPath, "utf8"));
const pilotManifestHash = await hashFile(pilotManifestPath);
assert.equal(status.status, expectedStatus, "State-resolution correctness is not qualified");
assert.equal(status.runtimeTests, 495, "Qualified status must report 495 runtime checks");
assert.equal(status.rustTests, 28, "Qualified status must report 28 Rust tests");
assert.equal(status.integrationCommands, 50, "Qualified status must report 50 integration commands including the pilot");
assert.equal(status.candidateProductionPilotPages, 6, "Qualified status must report all six production pilot pages");
assert.equal(status.archiveSha256, expectedArchiveHash, "Status archive hash differs from reviewed archive hash");
assert.equal(archiveHash, expectedArchiveHash, "Source/build archive differs from reviewed archive hash");
const protocolText = await readFile(protocolPath, "utf8");
assert(protocolText.includes(expectedArchiveHash), "Memory protocol does not pin the reviewed archive SHA-256");
assert.match(protocolText, /STATE_RESOLUTION_CORRECTNESS_VERIFIED/);
assert.equal(pilotManifest.status, "PASS", "Six-page correctness pilot must pass");
assert.match(pilotManifest.scope ?? "", /correctness pilot/i);
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

const sourceAndBuildHashes = status.sourceAndBuildSha256;
assert.ok(sourceAndBuildHashes && typeof sourceAndBuildHashes === "object");
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
  "vite.product-mixed-state-resolution.config.ts",
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
  const filename = path.join(proofDirectory, `${arm}-${size}.json`);
  const raw = JSON.parse(await readFile(filename, "utf8"));
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
  assert.equal(raw.after?.writers, 0);
  assert.equal(raw.after?.mounts, raw.after?.cleanups);
  assert.equal(raw.active?.mounts, raw.active?.cleanups + size);
  validatedPilotRecords.push({ arm, size, status: raw.status, pageSha256: await hashFile(filename) });
}

await mkdir(output, { recursive: true });
assert.equal((await readdir(output)).length, 0, `Refusing to overwrite an existing memory-profile output: ${output}`);

// Validate local CDP support on a blank page before freezing the allocation diagnostic.
const browser = await openBrowser({ headless: false, gpu: false });
const preflightContext = await browser.newContext({ ignoreHTTPSErrors: true, viewport });
const preflightPage = await preflightContext.newPage();
const preflightSession = await preflightContext.newCDPSession(preflightPage);
let cdpMethods = [];
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
} finally {
  await preflightSession.detach().catch(() => {});
  await preflightContext.close();
}

const inputLocks = {
  [archivePath]: archiveHash,
  [statusPath]: statusHash,
  [pilotManifestPath]: pilotManifestHash,
  [protocolPath]: protocolHash,
  [schedulePath]: scheduleHash,
  [scriptPath]: await hashFile(scriptPath),
  ...productionHashes,
  ...sourceHashes,
  ...Object.fromEntries(validatedPilotRecords.map((record) => [
    path.join(proofDirectory, `${record.arm}-${record.size}.json`),
    record.pageSha256,
  ])),
};
for (const [filename, expectedHash] of Object.entries(inputLocks)) {
  assert.equal(await hashFile(filename), expectedHash, `Frozen input changed before preregistration: ${filename}`);
}

const preregistration = {
  schemaVersion: 1,
  study: "compiled-product-mixed-state-resolution-memory-diagnostic",
  status: "FROZEN_BEFORE_MEMORY_PROFILE",
  runId,
  createdAt: new Date().toISOString(),
  frozenInputs: {
    archive: { path: archivePath, sha256: archiveHash },
    status: { path: statusPath, sha256: statusHash, qualifiedStatus: expectedStatus },
    protocol: { path: protocolPath, sha256: protocolHash },
    pilotManifest: { path: pilotManifestPath, sha256: pilotManifestHash },
    pilotProof: proof,
    validatedPilotRecords,
    schedule: { path: schedulePath, sha256: scheduleHash, pages: selectedSchedule },
    productionFiles: productionHashes,
    sourceFiles: sourceHashes,
    collector: { path: scriptPath, sha256: inputLocks[scriptPath] },
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
  profileScope: "Module import, initial mount, 60 warmup frames, 240 measured frames, harness checks, and harness disposal.",
  limitations: [
    "HeapProfiler sampling estimates sampled JavaScript allocations; node selfSize and flat samples are reported as separate CDP outputs and are not required to agree.",
    "Runtime.getHeapUsage reports JavaScript heap usage and excludes native DOM, GPU, and presentation allocations.",
    "The profile spans import, mount, warmup, measured frames, checks, and disposal; it is not an update-only profile or a CPU frame-speed claim.",
    "Post-teardown heap readings occur after harness disposal, before and after forced GC; they do not measure mounted-only cache memory or prove absence of leaks.",
    "A second browser context on this computer is not independent-device replication.",
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
try {
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
      console.log(`${pageRecord.status} state-resolution memory profile ${scheduled.arm}/${scheduled.size} sequence=${scheduled.sequence}`);
    }
  }
} finally {
  await browser.close();
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
await writeJson(path.join(output, "FINALresults.json"), {
  schemaVersion: 1,
  study: preregistration.study,
  runId,
  finalizedAt: new Date().toISOString(),
  status: finalStatus,
  records: pageRecords,
  postlock: { path: "postlock.json", status: postLock.status, mismatches: postLockMismatches },
  interpretation: "Separate untimed allocation and JavaScript heap diagnostics; do not pool with latency pages or interpret as exact allocation totals or CPU frame speed.",
  limitations: preregistration.limitations,
}, "wx");
if (finalStatus !== "PASS") {
  process.exitCode = 1;
}
