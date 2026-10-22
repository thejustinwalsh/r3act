import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { openBrowser } from "vitexec/cli";
import { productMixedSchedule } from "../src/browser/product_mixed_schedule.ts";

const scriptPath = "scripts/profile_product_mixed_v2_cpu.mjs";
const preregistrationPath = "results/product-mixed-v2-preregistration.json";
const manifestPath = "results/product-mixed-v2-manifest.json";
const latencyDirectory = "results/product-mixed-v2";
const outputDirectory = "results/product-mixed-v2-cpu";
const archivePath =
  "implementation/2026-10-12-namespace-three/source-and-build.tar.gz";
const protocolPath = "product-mixed-v2-protocol.md";
const schedulePath = "src/browser/product_mixed_schedule.ts";
const origin = "https://compiled-product-mixed.localhost:1355";
const selectedSequences = [20, 21];
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
    if (basename.startsWith("product-mixed-v2-")) return "harness bundle";
    if (productionByBasename.has(basename)) return "arm/runtime bundle";
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
      "URL/function-name heuristics only; bundled arm chunks combine authored app and runtime code, so labels do not establish causality.",
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
    const lineStart = code.split("\n").slice(0, frame.lineNumber).reduce(
      (sum, line) => sum + line.length + 1,
      0,
    );
    const offset = Math.min(code.length, lineStart + frame.columnNumber);
    output.push({
      functionName: frame.functionName,
      url: frame.url,
      lineNumber: frame.lineNumber,
      columnNumber: frame.columnNumber,
      sampledSelfTimeMs: frame.selfTimeMs,
      productionFile: source.filename,
      productionSha256: source.hash,
      excerptStartOffset: Math.max(0, offset - 150),
      sampleOffset: offset,
      excerptEndOffset: Math.min(code.length, offset + 150),
      minifiedCodeExcerpt: code.slice(Math.max(0, offset - 150), offset + 150),
    });
  }
  return output;
}

const preregistration = JSON.parse(await readFile(preregistrationPath, "utf8"));
const preregistrationHash = await hashFile(preregistrationPath);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const archiveHash = await hashFile(archivePath);
const protocolHash = await hashFile(protocolPath);
const scheduleHash = await hashFile(schedulePath);
const scriptHash = await hashFile(scriptPath);
assert.equal(
  archiveHash,
  preregistration.archiveSha256,
  "Archived source/build hash mismatch",
);
assert.equal(
  protocolHash,
  preregistration.protocolSha256,
  "Frozen protocol hash mismatch",
);
assert.equal(
  manifest.status,
  "COLLECTION_COMPLETE",
  "Latency manifest must be COLLECTION_COMPLETE",
);
assert.equal(
  manifest.archiveSha256,
  preregistration.archiveSha256,
  "Latency archive lock mismatch",
);
assert.equal(
  manifest.preregistrationSha256,
  preregistrationHash,
  "Latency preregistration lock mismatch",
);
assert.deepEqual(
  preregistration.schedule,
  productMixedSchedule,
  "Runtime schedule differs from frozen preregistration",
);
assert.deepEqual(preregistration.proof?.native, {
  arm: "native",
  compiled: true,
  bindings: 3,
  deltas: true,
  propOnly: true,
  deltaFallback: false,
});
assert.deepEqual(preregistration.proof?.react, {
  arm: "react",
  compiled: true,
  rowMemoCache: true,
  boardMemoCache: true,
});
assert.equal(productMixedSchedule.length, 30);
for (
  const [filename, expectedHash] of Object.entries(
    preregistration.productionSha256,
  )
) {
  assert.equal(
    await hashFile(filename),
    expectedHash,
    `Frozen production file changed: ${filename}`,
  );
}

const validatedLatencyRecords = [];
for (const scheduled of productMixedSchedule) {
  const filename = path.join(
    latencyDirectory,
    `sequence-${String(scheduled.sequence).padStart(2, "0")}.json`,
  );
  const raw = JSON.parse(await readFile(filename, "utf8"));
  assert.equal(raw.archiveSha256, preregistration.archiveSha256);
  assert.equal(raw.protocolSha256, preregistration.protocolSha256);
  assert.equal(raw.preregistrationSha256, preregistrationHash);
  assert.deepEqual(raw.schedule, scheduled);
  assert.equal(
    raw.result?.status,
    "PASS",
    `Latency result did not pass: ${filename}`,
  );
  assert.equal(raw.result.production, true);
  assert.equal(raw.result.mode, "confirm");
  assert.equal(raw.result.sequence, scheduled.sequence);
  assert.equal(raw.result.arm, scheduled.arm);
  assert.equal(raw.result.size, scheduled.size);
  assert.equal(raw.result.samples?.length, 240);
  assert.deepEqual(Object.values(raw.result.checks), [
    true,
    true,
    true,
    true,
    true,
  ]);
  assert.deepEqual(raw.browserErrors, []);
  validatedLatencyRecords.push({
    sequence: scheduled.sequence,
    status: raw.result.status,
    sampleCount: raw.result.samples.length,
  });
}
assert.equal(validatedLatencyRecords.length, 30);
const selectedSchedule = selectedSequences.map((sequence) =>
  productMixedSchedule[sequence]
);
assert.deepEqual(selectedSchedule.map((page) => page.sequence), [20, 21]);
assert.deepEqual(selectedSchedule.map((page) => page.size), [1024, 1024]);
assert.deepEqual(selectedSchedule.map((page) => page.arm), ["react", "native"]);

await mkdir(outputDirectory, { recursive: true });
assert.equal(
  (await readdir(outputDirectory)).length,
  0,
  `Refusing to overwrite an existing CPU-profile directory: ${outputDirectory}`,
);

// Preflight CDP support before locking the separate CPU diagnostic run.
const browser = await openBrowser({ headless: false, gpu: false });
const preflightContext = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: preregistration.browser.viewport,
});
const preflightPage = await preflightContext.newPage();
const preflightSession = await preflightContext.newCDPSession(preflightPage);
try {
  await preflightSession.send("Profiler.enable");
  await preflightSession.send("Profiler.setSamplingInterval", {
    interval: samplingIntervalMicros,
  });
  await preflightSession.send("Profiler.start");
  const preflight = await preflightSession.send("Profiler.stop");
  assert.ok(
    preflight.profile?.nodes?.length,
    "CDP returned no CPU profile nodes",
  );
} finally {
  await preflightSession.detach().catch(() => {});
  await preflightContext.close();
}

const cpuPreregistration = {
  schemaVersion: 1,
  study: "compiled-product-mixed-v2-cpu-diagnostic",
  status: "FROZEN_BEFORE_CPU_PROFILE",
  runId,
  createdAt: new Date().toISOString(),
  frozenInputs: {
    latencyPreregistrationPath: preregistrationPath,
    latencyPreregistrationSha256: preregistrationHash,
    latencyManifestPath: manifestPath,
    latencyManifestSha256: await hashFile(manifestPath),
    sourceBuildArchive: { path: archivePath, sha256: archiveHash },
    protocol: { path: protocolPath, sha256: protocolHash },
    schedule: {
      path: schedulePath,
      sha256: scheduleHash,
      pages: selectedSchedule,
    },
    productionFiles: preregistration.productionSha256,
    compilerProof: preregistration.proof,
    profileScript: { path: scriptPath, sha256: scriptHash },
    validatedLatencyRecordCount: validatedLatencyRecords.length,
  },
  browser: {
    origin,
    headless: false,
    gpu: false,
    viewport: preregistration.browser.viewport,
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
    correctnessGate:
      "PASS and exactly 240 measured samples for each profiled page.",
  },
  profileScope:
    "Module import, initial mount, warmup, 240 measured frames, harness checks, and disposal; diagnostic profile, not latency confirmation.",
  interpretationLimits: [
    "Time is estimated from CPU profiler sample timeDeltas, weighted by sampled self frames; it is not an exact instruction count or update-only cost.",
    "The profile includes module import, initial mount, warmup, harness checks, and disposal, not just frame updates.",
    "Function and URL labels are attribution hints, not proof of causality.",
    "The minified native/react arm chunks combine authored app and runtime code; they cannot be separated reliably without source maps.",
    "This is one machine and browser; no independent-device claim is supported.",
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
  path.join(outputDirectory, "preregistration.json"),
  cpuPreregistration,
  "wx",
);

const pageRecords = [];
try {
  for (const scheduled of selectedSchedule) {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: preregistration.browser.viewport,
    });
    const page = await context.newPage();
    const pageErrors = [];
    const resourceResponses = [];
    let session;
    let profilerStarted = false;
    const pageRecord = {
      schemaVersion: 1,
      study: "compiled-product-mixed-v2-cpu-diagnostic",
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
      pageRecord.harness = {
        status: result.status,
        checks: result.checks,
        sampleCount: result.samples.length,
        warmup: result.warmup,
        frames: result.frames,
        mounts: result.active.mounts,
        cleanups: result.active.cleanups,
        postTeardown: result.after,
      };

      const stopped = await session.send("Profiler.stop");
      profilerStarted = false;
      const loadedResources = await Promise.all(resourceResponses);
      pageRecord.loadedBuildResources = loadedResources;
      const expectedLocal = new Map(
        Object.entries(preregistration.productionSha256).map((
          [filename, hash],
        ) => [
          path.basename(filename),
          hash,
        ]),
      );
      for (const response of loadedResources) {
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
      assert.deepEqual(pageErrors, []);

      const profile = stopped.profile;
      const summary = summarizeCpuProfile(
        profile,
        preregistration.productionSha256,
      );
      pageRecord.profile = profile;
      pageRecord.summary = summary;
      pageRecord.topFrameSourceExcerpts = await sourceExcerpts(
        summary.topFrames,
        preregistration.productionSha256,
      );
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
            preregistration.productionSha256,
          );
          pageRecord.topFrameSourceExcerpts = await sourceExcerpts(
            pageRecord.summary.topFrames,
            preregistration.productionSha256,
          );
        } catch (stopError) {
          pageRecord.profileStopError = String(stopError);
        }
      }
      pageRecord.loadedBuildResources = await Promise.all(resourceResponses);
    } finally {
      pageRecord.finishedAt = new Date().toISOString();
      const filename = `${
        String(scheduled.sequence).padStart(2, "0")
      }-${scheduled.arm}-${scheduled.size}.json`;
      await writeJson(path.join(outputDirectory, filename), pageRecord, "wx");
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
      await writeJson(path.join(outputDirectory, "results.json"), {
        schemaVersion: 1,
        study: "compiled-product-mixed-v2-cpu-diagnostic",
        runId,
        createdAt: new Date().toISOString(),
        status: pageRecords.length === selectedSchedule.length &&
            pageRecords.every((record) => record.status === "PASS")
          ? "PASS"
          : "IN_PROGRESS",
        records: pageRecords,
        interpretation:
          "Paired diagnostic CPU profiles only; never pool with timing evidence or infer causality from names alone.",
        latencyCollectionReference: {
          manifest: manifestPath,
          manifestSha256: await hashFile(manifestPath),
          status: manifest.status,
          pageCountValidated: validatedLatencyRecords.length,
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

if (
  pageRecords.length !== selectedSchedule.length ||
  pageRecords.some((record) => record.status !== "PASS")
) {
  process.exitCode = 1;
}
