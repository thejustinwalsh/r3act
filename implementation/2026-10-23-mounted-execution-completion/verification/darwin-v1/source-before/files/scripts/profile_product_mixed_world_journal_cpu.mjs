import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { openBrowser } from "vitexec/cli";
import { productMixedSchedule } from "../src/browser/product_mixed_schedule.ts";

const scriptPath = "scripts/profile_product_mixed_world_journal_cpu.mjs";
const verifierPath = "scripts/verify_product_mixed_world_journal_cpu.mjs";
const preregistrationPath = "implementation/2026-10-13-world-dirty-journal/status.json";
const manifestPath = "implementation/2026-10-13-world-dirty-journal/verification/product-mixed-pilot/results.json";
const outputDirectory = "results/product-mixed-world-journal-cpu";
const archivePath =
  "implementation/2026-10-13-world-dirty-journal/source-and-build.tar.gz";
const protocolPath = "product-mixed-world-journal-cpu-protocol.md";
const schedulePath = "src/browser/product_mixed_schedule.ts";
const configPath = "vite.product-mixed-world-journal.config.ts";
const verificationDirectory = "implementation/2026-10-13-world-dirty-journal/verification";
const executionProofPath = `${verificationDirectory}/execution-proof.json`;
const compilerProofPaths = [
  `${verificationDirectory}/product-compiler-proof/native.js`,
  `${verificationDirectory}/product-compiler-proof/react.js`,
  `${verificationDirectory}/product-compiler-proof/native.json`,
  `${verificationDirectory}/product-compiler-proof/react.json`,
];
const origin = "https://compiled-world-journal.localhost:1355";
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
    if (basename.startsWith("product-mixed-v2-")) return "harness bundle";
    if (basename.startsWith("native_product_mixed_arm-")) return "native arm bundle";
    if (basename.startsWith("product_mixed_react_arm-")) return "react arm bundle";
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
      excerptStartOffset: Math.max(0, offset - 150),
      sampleOffset: offset,
      excerptEndOffset: Math.min(code.length, offset + 150),
      minifiedCodeExcerpt: code.slice(Math.max(0, offset - 150), offset + 150),
    });
  }
  return output;
}

const checkpoint = JSON.parse(await readFile(preregistrationPath, "utf8"));
const checkpointHash = await hashFile(preregistrationPath);
const pilotManifest = JSON.parse(await readFile(manifestPath, "utf8"));
const pilotManifestHash = await hashFile(manifestPath);
const archiveHash = await hashFile(archivePath);
const protocolHash = await hashFile(protocolPath);
const scheduleHash = await hashFile(schedulePath);
const collectorHash = await hashFile(scriptPath);
const expectedArchiveHash =
  "262914378f2cebb79d77805e7dda341d6b9c58b00de9c9a7eba801d621202468";
const pilotDirectory =
  "implementation/2026-10-13-world-dirty-journal/verification/product-mixed-pilot";
const expectedPilotPairs = [
  ["native", 128], ["react", 128],
  ["native", 512], ["react", 512],
  ["native", 1024], ["react", 1024],
];
assert.equal(checkpoint.status, "WORLD_DIRTY_JOURNAL_CORRECTNESS_VERIFIED");
assert.equal(checkpoint.runtimeTests, 582);
assert.equal(checkpoint.rustTests, 29);
assert.equal(checkpoint.integrationCommands, 9);
assert.equal(checkpoint.candidateProductionPilotPages, 6);
assert.equal(checkpoint.speedGate, "UNMEASURED_FOR_THIS_CANDIDATE");
assert.equal(archiveHash, expectedArchiveHash, "Candidate source/build archive hash mismatch");
assert.equal(checkpoint.archiveSha256, expectedArchiveHash);
assert.equal(pilotManifest.status, "PASS");
assert.match(pilotManifest.scope, /Correctness pilot only/);
assert.deepEqual(pilotManifest.records, expectedPilotPairs.map(([arm, size]) => ({
  arm, size, status: "PASS",
})));
const pilotProof = {
  native: pilotManifest.nativeProof,
  react: pilotManifest.reactProof,
};
assert.deepEqual(pilotProof.native, {
  arm: "native", compiled: true, bindings: 3, deltas: true,
  propOnly: true, deltaFallback: false,
});
assert.deepEqual(pilotProof.react, {
  arm: "react", compiled: true, rowMemoCache: true, boardMemoCache: true,
});
assert.deepEqual(productMixedSchedule.slice(20, 22).map((page) => ({
  sequence: page.sequence, pair: page.pair, arm: page.arm, size: page.size,
})), [
  { sequence: 20, pair: productMixedSchedule[20].pair, arm: "react", size: 1024 },
  { sequence: 21, pair: productMixedSchedule[21].pair, arm: "native", size: 1024 },
]);
assert.equal(productMixedSchedule.length, 30);
const validatedPilotRecords = [];
for (const [arm, size] of expectedPilotPairs) {
  const filename = path.join(pilotDirectory, `${arm}-${size}.json`);
  const raw = JSON.parse(await readFile(filename, "utf8"));
  assert.equal(raw.schemaVersion, 2);
  assert.equal(raw.study, "compiled-product-mixed-v2");
  assert.equal(raw.mode, "pilot");
  assert.equal(raw.arm, arm);
  assert.equal(raw.size, size);
  assert.equal(raw.production, true);
  assert.equal(raw.warmup, 5);
  assert.equal(raw.frames, 60);
  assert.equal(raw.status, "PASS");
  assert.deepEqual(Object.values(raw.checks), [true, true, true, true, true]);
  assert.equal(raw.samples?.length, 60);
  assert.deepEqual(raw.errors, []);
  assert.deepEqual(raw.browserErrors, []);
  assert.equal(raw.active?.writers, size);
  assert.equal(raw.after?.writers, 0);
  assert.equal(raw.active?.cleanups < raw.after?.cleanups, true);
  validatedPilotRecords.push({
    arm, size, status: raw.status, sampleCount: raw.samples.length,
    pageSha256: await hashFile(filename),
  });
}
assert.equal(validatedPilotRecords.length, 6);
const statusHashes = checkpoint.sourceAndBuildSha256;
assert.ok(statusHashes && typeof statusHashes === "object");
const productionHashes = Object.fromEntries(
  Object.entries(statusHashes).filter(([filename]) =>
    filename.startsWith("dist-product-mixed-world-journal/")
  ),
);
assert.equal(Object.keys(productionHashes).length, 5);
for (const [filename, expectedHash] of Object.entries(productionHashes)) {
  assert.equal(await hashFile(filename), expectedHash, `Frozen production file changed: ${filename}`);
}
assert.equal(Object.keys(statusHashes).length, 815);
const sourceBuildHashes = { ...statusHashes };
for (const [filename, expectedHash] of Object.entries(sourceBuildHashes)) {
  assert.equal(await hashFile(filename), expectedHash, `Frozen source/build file changed: ${filename}`);
}
const verificationHashes = checkpoint.verificationSha256;
assert.ok(verificationHashes && typeof verificationHashes === "object");
for (const [relativePath, expectedHash] of Object.entries(verificationHashes)) {
  assert.equal(
    await hashFile(path.join("implementation/2026-10-13-world-dirty-journal", relativePath)),
    expectedHash,
    `Frozen verification evidence changed: ${relativePath}`,
  );
}
const verificationLocks = Object.fromEntries(Object.entries(verificationHashes).map(([relativePath, hash]) => [
  path.join("implementation/2026-10-13-world-dirty-journal", relativePath), hash,
]));
const executionProof = JSON.parse(await readFile(executionProofPath, "utf8"));
assert.equal(executionProof.status, "PASS");
const compilerProofFiles = Object.fromEntries(await Promise.all(compilerProofPaths.map(async (filename) => [
  filename,
  { sha256: await hashFile(filename) },
])));
assert.deepEqual(productMixedSchedule[20].arm, "react");
assert.deepEqual(productMixedSchedule[21].arm, "native");
assert.deepEqual([productMixedSchedule[20].size, productMixedSchedule[21].size], [1024, 1024]);

await mkdir(outputDirectory, { recursive: true });
assert.equal(
  (await readdir(outputDirectory)).length,
  0,
  `Refusing to overwrite an existing CPU-profile directory: ${outputDirectory}`,
);

// Check CDP support and served static bytes without loading or running the app.
const browser = await openBrowser({ headless: false, gpu: false });
const preflightContext = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1200, height: 900 },
});
const preflightPage = await preflightContext.newPage();
const preflightSession = await preflightContext.newCDPSession(preflightPage);
let servedBytesPreflight = [];
try {
  await preflightSession.send("Profiler.enable");
  await preflightSession.send("Profiler.setSamplingInterval", {
    interval: samplingIntervalMicros,
  });
  await preflightSession.send("Profiler.start");
  const preflight = await preflightSession.send("Profiler.stop");
  assert.ok(preflight.profile?.nodes?.length, "CDP returned no CPU profile nodes");
  await preflightPage.goto("about:blank");
  for (const filename of Object.keys(productionHashes)) {
    const publicPath = filename.slice("dist-product-mixed-world-journal/".length);
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
} finally {
  await preflightSession.detach().catch(() => {});
  await preflightContext.close();
}

const preregistrationLocks = {
  [archivePath]: archiveHash,
  [preregistrationPath]: checkpointHash,
  [manifestPath]: pilotManifestHash,
  [protocolPath]: protocolHash,
  [schedulePath]: scheduleHash,
  [scriptPath]: collectorHash,
  [verifierPath]: await hashFile(verifierPath),
  [configPath]: statusHashes[configPath],
  ...verificationLocks,
  ...productionHashes,
  ...sourceBuildHashes,
  ...Object.fromEntries(validatedPilotRecords.map((record) => [
    path.join(pilotDirectory, `${record.arm}-${record.size}.json`),
    record.pageSha256,
  ])),
};
for (const [filename, expectedHash] of Object.entries(preregistrationLocks)) {
  assert.equal(await hashFile(filename), expectedHash, `Frozen input changed before preregistration: ${filename}`);
}

const cpuPreregistration = {
  schemaVersion: 1,
  study: "compiled-product-mixed-world-journal-cpu-diagnostic",
  status: "FROZEN_BEFORE_CPU_PROFILE",
  runId,
  createdAt: new Date().toISOString(),
  frozenInputs: {
    checkpoint: { path: preregistrationPath, sha256: checkpointHash },
    correctnessPilotManifest: { path: manifestPath, sha256: pilotManifestHash },
    sourceBuildArchive: { path: archivePath, sha256: archiveHash },
    protocol: { path: protocolPath, sha256: protocolHash },
    schedule: { path: schedulePath, sha256: scheduleHash, pages: [productMixedSchedule[20], productMixedSchedule[21]] },
    compilerProof: {
      correctnessPilot: pilotProof,
      executionProof: { path: executionProofPath, sha256: verificationHashes["verification/execution-proof.json"], evidence: executionProof },
      files: compilerProofFiles,
    },
    verificationEvidence: verificationHashes,
    productionFiles: productionHashes,
    sourceBuildFiles: sourceBuildHashes,
    collector: { path: scriptPath, sha256: collectorHash },
    verifier: { path: verifierPath, sha256: preregistrationLocks[verifierPath] },
    inputLocks: preregistrationLocks,
    validatedPilotRecords,
    servedBytesPreflight,
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
  profileScope: "Module import, initial mount, warmup, 240 measured frames, harness checks, and disposal; diagnostic profile, not latency confirmation.",
  interpretationLimits: [
    "Time is estimated from CPU profiler sample timeDeltas, weighted by sampled self frames; it is not an exact instruction count or update-only cost.",
    "The profile includes module import, initial mount, warmup, harness checks, and disposal, not just frame updates.",
    "Function and URL labels are attribution hints, not proof of causality.",
    "The minified native/react arm chunks combine authored app and runtime code; they cannot be separated reliably without source maps.",
    "This is one machine and browser; no independent-device claim is supported.",
    "The candidate has correctness pilot evidence only; no prior latency archive is used as candidate performance proof.",
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
      study: "compiled-product-mixed-world-journal-cpu-diagnostic",
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
      pageRecord.result = result;
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
        structuralFrameCount: result.samples.filter((sample) => sample.structural).length,
        samples: result.samples,
        active: result.active,
        after: result.after,
        mounts: result.active.mounts,
        cleanups: result.active.cleanups,
        postTeardown: result.after,
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
        study: "compiled-product-mixed-world-journal-cpu-diagnostic",
        runId,
        createdAt: new Date().toISOString(),
        status: pageRecords.length === selectedSchedule.length &&
            pageRecords.every((record) => record.status === "PASS")
          ? "PASS"
          : "IN_PROGRESS",
        records: pageRecords,
        interpretation:
          "Paired diagnostic CPU profiles only; never pool with timing evidence or infer causality from names alone.",
        correctnessPilotReference: {
          manifest: manifestPath,
          manifestSha256: await hashFile(manifestPath),
          status: pilotManifest.status,
          pageCountValidated: validatedPilotRecords.length,
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
for (const filename of [
  archivePath,
  preregistrationPath,
  manifestPath,
  protocolPath,
  schedulePath,
  scriptPath,
  ...Object.keys(productionHashes),
  ...Object.keys(sourceBuildHashes),
  ...Object.keys(verificationLocks),
  verifierPath,
  ...validatedPilotRecords.map((record) => path.join(pilotDirectory, `${record.arm}-${record.size}.json`)),
]) {
  postLocks[filename] = await hashFile(filename);
}
const expectedPostLocks = {
  [archivePath]: archiveHash,
  [preregistrationPath]: checkpointHash,
  [manifestPath]: pilotManifestHash,
  [protocolPath]: protocolHash,
  [schedulePath]: scheduleHash,
  [scriptPath]: collectorHash,
  [verifierPath]: preregistrationLocks[verifierPath],
  ...verificationLocks,
  ...productionHashes,
  ...sourceBuildHashes,
  ...Object.fromEntries(validatedPilotRecords.map((record) => [
    path.join(pilotDirectory, `${record.arm}-${record.size}.json`),
    record.pageSha256,
  ])),
};
const postLockMismatches = Object.keys(expectedPostLocks).filter((filename) =>
  postLocks[filename] !== expectedPostLocks[filename]
);
await writeJson(path.join(outputDirectory, "source-build-post-lock.json"), {
  checkedAt: new Date().toISOString(),
  status: postLockMismatches.length === 0 ? "PASS" : "FAIL",
  expected: expectedPostLocks,
  observed: postLocks,
  mismatches: postLockMismatches,
}, "wx");
await writeJson(path.join(outputDirectory, "results.json"), {
  schemaVersion: 1,
  study: "compiled-product-mixed-world-journal-cpu-diagnostic",
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
    "Paired diagnostic CPU profiles only; never pool with timing evidence or infer causality from names alone.",
  correctnessPilotReference: {
    manifest: manifestPath,
    manifestSha256: await hashFile(manifestPath),
    status: pilotManifest.status,
    pageCountValidated: validatedPilotRecords.length,
  },
});

if (
  postLockMismatches.length > 0 ||
  pageRecords.length !== selectedSchedule.length ||
  pageRecords.some((record) => record.status !== "PASS")
) {
  process.exitCode = 1;
}
