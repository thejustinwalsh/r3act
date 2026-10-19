import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { openBrowser } from "vitexec/cli";
import { productMixedSchedule } from "../src/browser/product_mixed_schedule.ts";

const origin = "https://compiled-product-mixed.localhost:1355";
const output = "results/product-mixed-v2-memory";
const frozenPreregistrationPath =
  "results/product-mixed-v2-preregistration.json";
const latencyManifestPath = "results/product-mixed-v2-manifest.json";
const latencyDirectory = "results/product-mixed-v2";
const archivePath =
  "implementation/2026-10-12-namespace-three/source-and-build.tar.gz";
const protocolPath = "product-mixed-v2-protocol.md";
const schedulePath = "src/browser/product_mixed_schedule.ts";
const sequences = [0, 1, 10, 11, 20, 21];
const samplingIntervalBytes = 32 * 1024;
const runId = randomUUID();

const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const hashFile = async (filename) => sha256(await readFile(filename));
const writeJson = (filename, value, flag = "w") =>
  writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, { flag });
const getHeapUsage = (session) => session.send("Runtime.getHeapUsage");

function summarizeSamplingTree(profile) {
  const byFrame = new Map();
  const visit = (node) => {
    const frame = node.callFrame ?? {};
    const url = frame.url ?? "";
    const functionName = frame.functionName || "(anonymous)";
    const key = `${url}\u0000${functionName}`;
    const row = byFrame.get(key) ?? {
      url,
      functionName,
      sampledAllocationBytes: 0,
      profileNodes: 0,
    };
    row.sampledAllocationBytes += node.selfSize ?? 0;
    row.profileNodes++;
    byFrame.set(key, row);
    for (const child of node.children ?? []) visit(child);
  };
  if (profile?.head) visit(profile.head);
  return [...byFrame.values()]
    .sort((left, right) =>
      right.sampledAllocationBytes - left.sampledAllocationBytes
    )
    .slice(0, 60);
}

const frozenPreregistration = JSON.parse(
  await readFile(frozenPreregistrationPath, "utf8"),
);
const frozenPreregistrationHash = await hashFile(frozenPreregistrationPath);
const latencyManifest = JSON.parse(await readFile(latencyManifestPath, "utf8"));
const protocolHash = await hashFile(protocolPath);
const scheduleHash = await hashFile(schedulePath);
const archiveHash = await hashFile(archivePath);
assert.equal(
  archiveHash,
  frozenPreregistration.archiveSha256,
  "Source/build archive differs from frozen preregistration",
);
assert.equal(
  protocolHash,
  frozenPreregistration.protocolSha256,
  "Protocol differs from frozen preregistration",
);
assert.equal(
  latencyManifest.status,
  "COLLECTION_COMPLETE",
  "Latency manifest must be COLLECTION_COMPLETE before memory profiling",
);
assert.equal(
  latencyManifest.archiveSha256,
  frozenPreregistration.archiveSha256,
  "Latency manifest archive lock does not match",
);
assert.equal(
  latencyManifest.preregistrationSha256,
  frozenPreregistrationHash,
  "Latency manifest does not reference the frozen preregistration",
);
assert.deepEqual(
  frozenPreregistration.schedule,
  productMixedSchedule,
  "Runtime schedule differs from frozen preregistration",
);
const productionHashes = frozenPreregistration.productionSha256;
assert.ok(productionHashes && Object.keys(productionHashes).length > 0);
for (const [filename, expectedHash] of Object.entries(productionHashes)) {
  assert.equal(
    await hashFile(filename),
    expectedHash,
    `Production file differs from frozen build: ${filename}`,
  );
}

const validatedLatencyRecords = [];
for (const scheduled of productMixedSchedule) {
  const filename = path.join(
    latencyDirectory,
    `sequence-${String(scheduled.sequence).padStart(2, "0")}.json`,
  );
  const raw = JSON.parse(await readFile(filename, "utf8"));
  assert.equal(raw.archiveSha256, frozenPreregistration.archiveSha256);
  assert.equal(raw.protocolSha256, frozenPreregistration.protocolSha256);
  assert.equal(raw.preregistrationSha256, frozenPreregistrationHash);
  assert.deepEqual(raw.schedule, scheduled);
  const result = raw.result;
  assert.equal(result?.status, "PASS", `Latency page failed in ${filename}`);
  assert.equal(result.mode, "confirm");
  assert.equal(result.production, true);
  assert.equal(result.sequence, scheduled.sequence);
  assert.equal(result.arm, scheduled.arm);
  assert.equal(result.size, scheduled.size);
  assert.equal(result.frames, 240);
  assert.equal(result.samples?.length, 240);
  assert.deepEqual(Object.values(result.checks), [
    true,
    true,
    true,
    true,
    true,
  ]);
  assert.deepEqual(raw.browserErrors, []);
  validatedLatencyRecords.push({
    sequence: scheduled.sequence,
    arm: scheduled.arm,
    size: scheduled.size,
    status: result.status,
    sampleCount: result.samples.length,
  });
}
assert.equal(validatedLatencyRecords.length, 30);

const selectedSchedule = sequences.map((sequence) =>
  productMixedSchedule[sequence]
);
assert.deepEqual(
  selectedSchedule.map((page) => page.sequence),
  sequences,
);
assert.deepEqual(
  selectedSchedule.map((page) => page.size),
  [128, 128, 512, 512, 1024, 1024],
);
assert.deepEqual(
  selectedSchedule.map((page) => page.arm),
  ["react", "native", "react", "native", "react", "native"],
);

await mkdir(output, { recursive: true });
assert.equal(
  (await readdir(output)).length,
  0,
  `Refusing to overwrite an existing memory-profile output: ${output}`,
);

// Check the local CDP implementation before writing the profile preregistration.
const browser = await openBrowser({ headless: false, gpu: false });
const preflightContext = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: frozenPreregistration.browser.viewport,
});
const preflightPage = await preflightContext.newPage();
const preflightSession = await preflightContext.newCDPSession(preflightPage);
let preflightProfileMethods = [];
try {
  await preflightSession.send("Runtime.enable");
  await preflightSession.send("HeapProfiler.enable");
  await preflightSession.send("HeapProfiler.collectGarbage");
  const baseline = await getHeapUsage(preflightSession);
  await preflightSession.send("HeapProfiler.startSampling", {
    samplingInterval: samplingIntervalBytes,
    includeObjectsCollectedByMajorGC: true,
    includeObjectsCollectedByMinorGC: true,
  });
  const current = await preflightSession.send(
    "HeapProfiler.getSamplingProfile",
  );
  assert.ok(current.profile?.head, "CDP returned no current sampling profile");
  const stopped = await preflightSession.send("HeapProfiler.stopSampling");
  assert.ok(stopped.profile?.head, "CDP returned no stopped sampling profile");
  preflightProfileMethods = [
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

const preregistration = {
  schemaVersion: 1,
  study: "compiled-product-mixed-v2-memory-profile",
  status: "FROZEN_BEFORE_MEMORY_PROFILE",
  runId,
  createdAt: new Date().toISOString(),
  profilerSha256: await hashFile(import.meta.filename),
  frozenLatencyStudy: {
    preregistrationPath: frozenPreregistrationPath,
    preregistrationSha256: frozenPreregistrationHash,
    manifestPath: latencyManifestPath,
    manifestSha256: await hashFile(latencyManifestPath),
    archiveSha256: frozenPreregistration.archiveSha256,
    protocolSha256: frozenPreregistration.protocolSha256,
    productionSha256: productionHashes,
    proof: frozenPreregistration.proof,
    validatedLatencyRecords,
  },
  protocol: { path: protocolPath, sha256: protocolHash },
  frozenSchedule: {
    path: schedulePath,
    sha256: scheduleHash,
    sequences: selectedSchedule,
    note:
      "Separate untimed profiles on the first pair per size; excluded from latency analysis.",
  },
  browser: {
    origin,
    mode: "confirm",
    headless: false,
    gpu: false,
    viewport: frozenPreregistration.browser.viewport,
    freshContexts: true,
    serial: true,
    cdpMethods: preflightProfileMethods,
    samplingIntervalBytes,
    samplingBeginsOnAboutBlankBeforeNavigation: true,
  },
  workload: {
    warmupFrames: 60,
    measuredFrames: 240,
    eachResultMustPassCorrectness: true,
  },
  limitations: [
    "HeapProfiler sampling estimates sampled JavaScript allocations; selfSize is not an exact allocation total.",
    "Runtime.getHeapUsage reports JavaScript heap usage and excludes native DOM, GPU, and presentation allocations.",
    "Sampling scope includes module import, initial mount, warmup, all 240 measured frames, harness checks, and disposal; it is not a pure-update profile.",
    "The benchmark harness disposes before publishing its result. Post-run heap readings are after harness teardown, before and after forced GC; no mounted-only heap snapshot is collected.",
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
await writeJson(
  path.join(output, "preregistration.json"),
  preregistration,
  "wx",
);

const pageRecords = [];
try {
  for (const scheduled of selectedSchedule) {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: frozenPreregistration.browser.viewport,
    });
    const page = await context.newPage();
    const pageErrors = [];
    const resourceResponses = [];
    let session;
    let samplingStarted = false;
    const pageRecord = {
      schemaVersion: 1,
      study: "compiled-product-mixed-v2-memory-profile",
      runId,
      sequence: scheduled.sequence,
      pair: scheduled.pair,
      size: scheduled.size,
      arm: scheduled.arm,
      startedAt: new Date().toISOString(),
      origin,
      status: "INCOMPLETE",
      pageErrors,
    };

    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("response", (response) => {
      const url = response.url();
      if (url.startsWith(origin) && /\.(html|js|css)(\?|$)/.test(url)) {
        resourceResponses.push((async () => {
          try {
            const body = await response.body();
            return {
              url,
              status: response.status(),
              sha256: sha256(body),
              filename: path.basename(new URL(url).pathname),
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
        scope:
          "module import, initial mount, warmup, 240 measured frames, harness checks, harness disposal",
      };
      await session.send("HeapProfiler.startSampling", {
        samplingInterval: samplingIntervalBytes,
        includeObjectsCollectedByMajorGC: true,
        includeObjectsCollectedByMinorGC: true,
      });
      samplingStarted = true;

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
      assert.equal(result.samples.length, 240);
      assert.deepEqual(Object.values(result.checks), [
        true,
        true,
        true,
        true,
        true,
      ]);
      assert.equal(
        result.samples.filter((sample) => sample.structural).length,
        8,
      );
      assert.deepEqual(pageErrors, []);

      const currentProfile =
        (await session.send("HeapProfiler.getSamplingProfile")).profile;
      await page.evaluate(() => window.__productMixed.dispose());
      const stopped = await session.send("HeapProfiler.stopSampling");
      samplingStarted = false;
      pageRecord.heapUsageAfterHarnessTeardown = await getHeapUsage(session);
      await session.send("HeapProfiler.collectGarbage");
      pageRecord.heapUsageAfterForcedGC = await getHeapUsage(session);

      const loadedResources = await Promise.all(resourceResponses);
      pageRecord.loadedBuildResources = loadedResources;
      const expectedLocal = new Map(
        Object.entries(productionHashes).map(([filename, hash]) => [
          path.basename(filename),
          hash,
        ]),
      );
      for (const response of loadedResources) {
        if (response.filename && expectedLocal.has(response.filename)) {
          assert.equal(
            response.sha256,
            expectedLocal.get(response.filename),
            `Loaded asset differs from frozen production build: ${response.filename}`,
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
      pageRecord.cdp = {
        currentSamplingProfile: currentProfile,
        stoppedSamplingProfile: stopped.profile,
        stoppedSummaryTopFrames: summarizeSamplingTree(stopped.profile),
      };
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
      const filename = `${
        String(scheduled.sequence).padStart(2, "0")
      }-${scheduled.arm}-${scheduled.size}.json`;
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
      await writeJson(path.join(output, "results.json"), {
        schemaVersion: 1,
        study: "compiled-product-mixed-v2-memory-profile",
        runId,
        createdAt: new Date().toISOString(),
        status: pageRecords.length === selectedSchedule.length &&
            pageRecords.every((page) => page.status === "PASS")
          ? "PASS"
          : "IN_PROGRESS",
        records: pageRecords,
        interpretation:
          "Separate untimed allocation and JS heap diagnostics; never pool with latency pages or interpret as exact allocation totals.",
        limitations: preregistration.limitations,
      });
      console.log(
        `${pageRecord.status} memory profile ${scheduled.arm}/${scheduled.size} sequence=${scheduled.sequence}`,
      );
    }
  }
} finally {
  await browser.close();
}

if (
  pageRecords.length !== selectedSchedule.length ||
  pageRecords.some((page) => page.status !== "PASS")
) {
  process.exitCode = 1;
}
