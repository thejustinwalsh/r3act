import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";

const outputDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(outputDirectory, "../..");
const proofDirectory = path.join(repositoryRoot, ".cache/high-frequency-build-proof-20261013-03");
const distDirectory = path.join(proofDirectory, "dist");
const origin = "https://current-product-high-frequency.localhost:1355";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const expectedAssets = new Map([
  ["/high-frequency.html", { file: "high-frequency.html", sha256: "f481926e51897eb85e30d0353d33c695dca599f83722c9c66d01977297c4f944" }],
  ["/assets/highFrequency-Dk3MpsD8.js", { file: "assets/highFrequency-Dk3MpsD8.js", sha256: "664210da6a73f7acc266f4f36fe04186c4ee1c5c7e65cb42798bee5f78fb52e7" }],
  ["/assets/highFrequency-GrFjeJ6A.css", { file: "assets/highFrequency-GrFjeJ6A.css", sha256: "6e8c589e7715cc058dceb37820c50bda5e4ec1529cf5b3029d83e6d4797c30e4" }],
  ["/assets/native_high_frequency_arm-CoEbLbje.js", { file: "assets/native_high_frequency_arm-CoEbLbje.js", sha256: "aa84bd264ffdebf8e259f525608fab936a85f001e88c62d5e62f1bf65b4879a3" }],
  ["/assets/react_high_frequency_arm-Cio8XO_I.js", { file: "assets/react_high_frequency_arm-Cio8XO_I.js", sha256: "5f6b1c07d3db89ab96ad86662db07c4172575e47dcc28b5fd6e49b3b605f212a" }],
]);
const cases = [
  { sequence: 1, arm: "react", rows: 128 },
  { sequence: 2, arm: "native", rows: 128 },
  { sequence: 3, arm: "native", rows: 1024 },
  { sequence: 4, arm: "react", rows: 1024 },
  { sequence: 5, arm: "react", rows: 10000 },
  { sequence: 6, arm: "native", rows: 10000 },
].map((value) => ({ ...value, dirty: "all", placement: "contiguous", programs: "homogeneous" }));
const resultKeys = [
  "schemaVersion", "status", "arm", "rows", "dirty", "placement", "programs", "production",
  "userAgent", "warmupFrames", "measuredFrames", "checks", "errors",
  "mountAndFrameZeroInitializationMs", "warmupSamples", "samples", "disposeMs", "active",
  "afterDispose", "deadSetterProbeCount", "deadSetterThrows", "summary", "timingContract",
].sort();
const checkKeys = ["output", "order", "identity", "lifecycle", "deadSetters", "visible"].sort();
const lifecycleKeys = ["mounts", "cleanups", "writers"].sort();
const exactKeys = (value, expected) => value && typeof value === "object" &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify(expected);
const finite = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;

async function localAssetLocks() {
  const locks = [];
  for (const [urlPath, expected] of expectedAssets) {
    const bytes = await readFile(path.join(distDirectory, expected.file));
    const actual = sha256(bytes);
    locks.push({ urlPath, file: expected.file, expectedSha256: expected.sha256, actualSha256: actual, bytes: bytes.byteLength, matches: actual === expected.sha256 });
  }
  return locks;
}

function validateResult(result, testCase, resourceRecords, pageErrors) {
  const errors = [];
  const fail = (condition, message) => { if (!condition) errors.push(message); };
  fail(exactKeys(result, resultKeys), "published result key set differs from the harness schema");
  if (!result || typeof result !== "object") return ["no structured window.__highFrequencyResult was published"];
  fail(result.schemaVersion === "current-product-high-frequency-v1", "unexpected result schemaVersion");
  fail(result.status === "PASS", `application status is ${String(result.status)}`);
  fail(result.arm === testCase.arm && result.rows === testCase.rows, "arm or row count differs from this case");
  fail(result.dirty === "all" && result.placement === "contiguous" && result.programs === "homogeneous", "workload configuration differs from the plan");
  fail(result.production === true, "page does not report a production build");
  fail(typeof result.userAgent === "string" && result.userAgent.length > 0, "missing page userAgent");
  fail(result.warmupFrames === 60 && result.measuredFrames === 240, "warmup/measured frame counts differ from the harness");
  fail(exactKeys(result.checks, checkKeys) && Object.values(result.checks).every((value) => value === true), "correctness/lifecycle checks are missing or false");
  fail(Array.isArray(result.errors) && result.errors.length === 0, "application recorded errors");
  fail(finite(result.mountAndFrameZeroInitializationMs), "missing mount/frame-zero initialization duration");
  fail(finite(result.disposeMs), "missing disposal duration");
  fail(exactKeys(result.active, lifecycleKeys) && result.active.mounts === testCase.rows && result.active.cleanups === 0 && result.active.writers === testCase.rows, "active lifecycle does not match row count");
  fail(exactKeys(result.afterDispose, lifecycleKeys) && result.afterDispose.mounts === testCase.rows && result.afterDispose.cleanups === testCase.rows && result.afterDispose.writers === 0, "disposed lifecycle did not release rows and setters");
  fail(result.deadSetterProbeCount === testCase.rows && Number.isInteger(result.deadSetterThrows), "dead-setter probe count is inconsistent");
  fail(result.deadSetterThrows === (testCase.arm === "native" ? testCase.rows : 0), "dead-setter throw count differs from the arm contract");
  fail(Array.isArray(result.warmupSamples) && result.warmupSamples.length === 60, "expected exactly 60 raw warmup samples");
  fail(Array.isArray(result.samples) && result.samples.length === 240, "expected exactly 240 raw measured samples");
  if (Array.isArray(result.warmupSamples)) {
    result.warmupSamples.forEach((sample, index) => {
      fail(exactKeys(sample, ["frame", "commitMs", "intervalMs"].sort()) && sample.frame === index + 1 && finite(sample.commitMs) && finite(sample.intervalMs), `invalid warmup sample ${index + 1}`);
    });
  }
  if (Array.isArray(result.samples)) {
    result.samples.forEach((sample, index) => {
      fail(exactKeys(sample, ["frame", "dirtyCount", "commitMs", "intervalMs"].sort()) && sample.frame === index + 61 && sample.dirtyCount === testCase.rows && finite(sample.commitMs) && finite(sample.intervalMs), `invalid measured sample ${index + 1}`);
    });
  }
  const pathSet = new Set(resourceRecords.filter((record) => record.matches).map((record) => record.path));
  const armResource = testCase.arm === "native" ? "/assets/native_high_frequency_arm-CoEbLbje.js" : "/assets/react_high_frequency_arm-Cio8XO_I.js";
  for (const required of ["/high-frequency.html", "/assets/highFrequency-Dk3MpsD8.js", "/assets/highFrequency-GrFjeJ6A.css", armResource]) {
    fail(pathSet.has(required), `production resource missing or hash-mismatched: ${required}`);
  }
  fail(resourceRecords.every((record) => record.status === 200 && record.matches), "a loaded production resource failed status/hash verification");
  fail(pageErrors.length === 0, "browser emitted pageerror events");
  return errors;
}

const startedAt = new Date().toISOString();
const localLocks = await localAssetLocks();
const browserInfo = { headless: false, gpu: true, viewport: { width: 1200, height: 900 }, origin };
const records = [];
let browserVersion = null;
let browser = null;
let collectorFailure = null;
await mkdir(outputDirectory, { recursive: true });
try {
  if (localLocks.some((record) => !record.matches)) throw new Error("Local build03 asset bytes no longer match the recorded build hashes");
  browser = await openBrowser({ headless: false, gpu: true, handleSignals: false });
  browserVersion = browser.version();
  for (const testCase of cases) {
    const url = new URL("/high-frequency.html", origin);
    url.searchParams.set("arm", testCase.arm);
    url.searchParams.set("rows", String(testCase.rows));
    url.searchParams.set("dirty", testCase.dirty);
    url.searchParams.set("placement", testCase.placement);
    url.searchParams.set("programs", testCase.programs);
    const context = await browser.newContext({ viewport: browserInfo.viewport, deviceScaleFactor: 1 });
    let page;
    const pageErrors = [];
    const pendingResponses = [];
    const resourceRecords = [];
    let result = null;
    let navigationStatus = null;
    let failure = null;
    try {
      page = await context.newPage();
    } catch (error) {
      failure = String(error);
    }
    if (!page) {
      const record = {
        sequence: testCase.sequence,
        case: testCase,
        url: url.toString(),
        status: "FAIL",
        browser: browserInfo,
        browserVersion,
        pageUserAgent: null,
        navigationStatus,
        pageErrors,
        loadedBuildResources: resourceRecords,
        validationErrors: [`page creation failed: ${failure}`],
        result,
      };
      records.push(record);
      await writeFile(path.join(outputDirectory, `sequence-${String(testCase.sequence).padStart(2, "0")}.json`), `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
      await context.close();
      console.log(`case ${testCase.sequence}/6 ${testCase.arm} ${testCase.rows}: FAIL`);
      continue;
    }
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    page.on("response", (response) => {
      let parsed;
      try { parsed = new URL(response.url()); } catch { return; }
      if (parsed.origin !== origin || !expectedAssets.has(parsed.pathname)) return;
      const asset = expectedAssets.get(parsed.pathname);
      pendingResponses.push((async () => {
        try {
          const bytes = await response.body();
          const actual = sha256(bytes);
          resourceRecords.push({
            path: parsed.pathname,
            url: response.url(),
            status: response.status(),
            file: asset.file,
            expectedSha256: asset.sha256,
            sha256: actual,
            bytes: bytes.byteLength,
            matches: actual === asset.sha256,
          });
        } catch (error) {
          resourceRecords.push({ path: parsed.pathname, url: response.url(), status: response.status(), file: asset.file, expectedSha256: asset.sha256, sha256: null, bytes: null, matches: false, error: String(error) });
        }
      })());
    });
    try {
      const response = await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 180_000 });
      navigationStatus = response?.status() ?? null;
      await page.waitForFunction(() => window.__highFrequencyResult !== undefined, undefined, { timeout: 180_000 });
      result = await page.evaluate(() => window.__highFrequencyResult);
      await Promise.allSettled(pendingResponses);
    } catch (error) {
      failure = String(error);
      await Promise.allSettled(pendingResponses);
      try { result = await page.evaluate(() => window.__highFrequencyResult ?? null); } catch { /* Keep missing result as null. */ }
    }
    const validationErrors = validateResult(result, testCase, resourceRecords, pageErrors);
    if (failure) validationErrors.unshift(`page execution failed: ${failure}`);
    const record = {
      sequence: testCase.sequence,
      case: testCase,
      url: url.toString(),
      status: validationErrors.length === 0 ? "PASS" : "FAIL",
      browser: browserInfo,
      browserVersion,
      pageUserAgent: result?.userAgent ?? null,
      navigationStatus,
      pageErrors,
      loadedBuildResources: resourceRecords,
      validationErrors,
      result,
    };
    records.push(record);
    await writeFile(path.join(outputDirectory, `sequence-${String(testCase.sequence).padStart(2, "0")}.json`), `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
    await context.close();
    console.log(`case ${testCase.sequence}/6 ${testCase.arm} ${testCase.rows}: ${record.status}`);
  }
} catch (error) {
  collectorFailure = String(error);
} finally {
  await browser?.close();
}

const manifest = {
  schemaVersion: "current-product-high-frequency-correctness-pilot-v1",
  status: collectorFailure || records.length !== cases.length || records.some((record) => record.status !== "PASS") ? "FAIL" : "PASS",
  purpose: "Correctness and lifecycle only; no performance ratios, ranking, or speed gate",
  startedAt,
  completedAt: new Date().toISOString(),
  origin,
  browser: browserInfo,
  browserVersion,
  localBuildAssetLocks: localLocks,
  cases,
  records: records.map(({ sequence, case: testCase, status, url }) => ({ sequence, case: testCase, status, url, file: `sequence-${String(sequence).padStart(2, "0")}.json` })),
  failure: collectorFailure,
};
await writeFile(path.join(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
console.log(`Pilot ${manifest.status}: ${records.filter((record) => record.status === "PASS").length}/6 pages passed; no timing aggregation was performed.`);
if (manifest.status !== "PASS") process.exitCode = 1;
