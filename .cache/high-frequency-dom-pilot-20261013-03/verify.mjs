import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(directory, "../..");
const distDirectory = path.join(repositoryRoot, ".cache/high-frequency-build-proof-20261013-03/dist");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const expectedAssets = [
  { path: "/high-frequency.html", file: "high-frequency.html", sha256: "f481926e51897eb85e30d0353d33c695dca599f83722c9c66d01977297c4f944" },
  { path: "/assets/highFrequency-Dk3MpsD8.js", file: "assets/highFrequency-Dk3MpsD8.js", sha256: "664210da6a73f7acc266f4f36fe04186c4ee1c5c7e65cb42798bee5f78fb52e7" },
  { path: "/assets/highFrequency-GrFjeJ6A.css", file: "assets/highFrequency-GrFjeJ6A.css", sha256: "6e8c589e7715cc058dceb37820c50bda5e4ec1529cf5b3029d83e6d4797c30e4" },
  { path: "/assets/native_high_frequency_arm-CoEbLbje.js", file: "assets/native_high_frequency_arm-CoEbLbje.js", sha256: "aa84bd264ffdebf8e259f525608fab936a85f001e88c62d5e62f1bf65b4879a3" },
  { path: "/assets/react_high_frequency_arm-Cio8XO_I.js", file: "assets/react_high_frequency_arm-Cio8XO_I.js", sha256: "5f6b1c07d3db89ab96ad86662db07c4172575e47dcc28b5fd6e49b3b605f212a" },
];
const expectedCases = [
  { sequence: 1, arm: "react", rows: 128 },
  { sequence: 2, arm: "native", rows: 128 },
  { sequence: 3, arm: "native", rows: 1024 },
  { sequence: 4, arm: "react", rows: 1024 },
  { sequence: 5, arm: "react", rows: 10000 },
  { sequence: 6, arm: "native", rows: 10000 },
].map((testCase) => ({ ...testCase, dirty: "all", placement: "contiguous", programs: "homogeneous" }));
const resultKeys = [
  "schemaVersion", "status", "arm", "rows", "dirty", "placement", "programs", "production", "userAgent",
  "warmupFrames", "measuredFrames", "checks", "errors", "mountAndFrameZeroInitializationMs", "warmupSamples",
  "samples", "disposeMs", "active", "afterDispose", "deadSetterProbeCount", "deadSetterThrows", "summary", "timingContract",
].sort();
const checks = ["output", "order", "identity", "lifecycle", "deadSetters", "visible"].sort();
const lifecycle = ["mounts", "cleanups", "writers"].sort();
const exactKeys = (value, expected) => value && typeof value === "object" && JSON.stringify(Object.keys(value).sort()) === JSON.stringify(expected);
const finite = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
const failures = [];
const add = (condition, name, detail) => { if (!condition) failures.push({ name, detail }); };

const manifest = JSON.parse(await readFile(path.join(directory, "manifest.json"), "utf8"));
add(manifest.schemaVersion === "current-product-high-frequency-correctness-pilot-v1", "manifest-schema", manifest.schemaVersion);
add(manifest.purpose === "Correctness and lifecycle only; no performance ratios, ranking, or speed gate", "scope", manifest.purpose);
add(manifest.origin === "https://current-product-high-frequency.localhost:1355", "origin", manifest.origin);
add(manifest.browser?.headless === false && manifest.browser?.gpu === true && manifest.browser?.viewport?.width === 1200 && manifest.browser?.viewport?.height === 900, "browser-config", manifest.browser);
add(manifest.failure === null, "collector-failure", manifest.failure);
add(manifest.cases?.length === 6 && JSON.stringify(manifest.cases) === JSON.stringify(expectedCases), "case-matrix", manifest.cases);
add(manifest.records?.length === 6, "record-count", manifest.records?.length);

const localLocks = [];
for (const asset of expectedAssets) {
  const bytes = await readFile(path.join(distDirectory, asset.file));
  const actual = sha256(bytes);
  localLocks.push({ path: asset.path, file: asset.file, expectedSha256: asset.sha256, actualSha256: actual, bytes: bytes.byteLength, matches: actual === asset.sha256 });
  add(actual === asset.sha256, `local-build-${asset.file}`, actual);
}
add(Array.isArray(manifest.localBuildAssetLocks) && manifest.localBuildAssetLocks.length === localLocks.length && localLocks.every((expected, index) => {
  const actual = manifest.localBuildAssetLocks[index];
  return actual?.urlPath === expected.path && actual?.file === expected.file && actual?.expectedSha256 === expected.expectedSha256 &&
    actual?.actualSha256 === expected.actualSha256 && actual?.bytes === expected.bytes && actual?.matches === expected.matches;
}), "local-build-lock-map", manifest.localBuildAssetLocks);

const records = [];
for (const testCase of expectedCases) {
  const file = `sequence-${String(testCase.sequence).padStart(2, "0")}.json`;
  let record;
  try {
    record = JSON.parse(await readFile(path.join(directory, file), "utf8"));
  } catch (error) {
    failures.push({ name: `record-${testCase.sequence}`, detail: String(error) });
    continue;
  }
  records.push(record);
  const prefix = `case-${testCase.sequence}`;
  add(record.sequence === testCase.sequence && JSON.stringify(record.case) === JSON.stringify(testCase), `${prefix}-configuration`, record.case);
  add(record.status === "PASS", `${prefix}-collector-status`, record.status);
  add(record.url === `${manifest.origin}/high-frequency.html?arm=${testCase.arm}&rows=${testCase.rows}&dirty=all&placement=contiguous&programs=homogeneous`, `${prefix}-url`, record.url);
  add(record.navigationStatus === 200, `${prefix}-navigation-status`, record.navigationStatus);
  add(record.browser?.headless === false && record.browser?.gpu === true && record.browser?.viewport?.width === 1200 && record.browser?.viewport?.height === 900, `${prefix}-browser`, record.browser);
  add(typeof record.browserVersion === "string" && record.browserVersion.length > 0 && record.browserVersion === manifest.browserVersion, `${prefix}-engine`, record.browserVersion);
  add(Array.isArray(record.pageErrors) && record.pageErrors.length === 0, `${prefix}-page-errors`, record.pageErrors);
  add(Array.isArray(record.validationErrors) && record.validationErrors.length === 0, `${prefix}-collector-errors`, record.validationErrors);
  const result = record.result;
  add(exactKeys(result, resultKeys), `${prefix}-published-shape`, result && Object.keys(result).sort());
  if (!result || typeof result !== "object") continue;
  add(result.schemaVersion === "current-product-high-frequency-v1" && result.status === "PASS", `${prefix}-app-status`, [result.schemaVersion, result.status]);
  add(result.arm === testCase.arm && result.rows === testCase.rows && result.programs === "homogeneous" && result.dirty === "all" && result.placement === "contiguous", `${prefix}-app-config`, { arm: result.arm, rows: result.rows, programs: result.programs, dirty: result.dirty, placement: result.placement });
  add(result.production === true, `${prefix}-production`, result.production);
  add(typeof result.userAgent === "string" && result.userAgent.length > 0 && result.userAgent === record.pageUserAgent, `${prefix}-ua`, result.userAgent);
  add(result.warmupFrames === 60 && result.measuredFrames === 240, `${prefix}-frame-targets`, { warmup: result.warmupFrames, measured: result.measuredFrames });
  add(exactKeys(result.checks, checks) && Object.values(result.checks).every((value) => value === true), `${prefix}-checks`, result.checks);
  add(Array.isArray(result.errors) && result.errors.length === 0, `${prefix}-app-errors`, result.errors);
  add(finite(result.mountAndFrameZeroInitializationMs) && finite(result.disposeMs), `${prefix}-lifecycle-durations-present`, { mount: result.mountAndFrameZeroInitializationMs, dispose: result.disposeMs });
  add(exactKeys(result.active, lifecycle) && result.active.mounts === testCase.rows && result.active.cleanups === 0 && result.active.writers === testCase.rows, `${prefix}-active-lifecycle`, result.active);
  add(exactKeys(result.afterDispose, lifecycle) && result.afterDispose.mounts === testCase.rows && result.afterDispose.cleanups === testCase.rows && result.afterDispose.writers === 0, `${prefix}-disposed-lifecycle`, result.afterDispose);
  add(result.deadSetterProbeCount === testCase.rows && result.deadSetterThrows === (testCase.arm === "native" ? testCase.rows : 0), `${prefix}-dead-setters`, { count: result.deadSetterProbeCount, thrown: result.deadSetterThrows });
  add(Array.isArray(result.warmupSamples) && result.warmupSamples.length === 60, `${prefix}-warmup-count`, result.warmupSamples?.length);
  add(Array.isArray(result.samples) && result.samples.length === 240, `${prefix}-measured-count`, result.samples?.length);
  for (const [index, sample] of (result.warmupSamples ?? []).entries()) add(exactKeys(sample, ["frame", "commitMs", "intervalMs"].sort()) && sample.frame === index + 1 && finite(sample.commitMs) && finite(sample.intervalMs), `${prefix}-warmup-${index + 1}`, sample);
  for (const [index, sample] of (result.samples ?? []).entries()) add(exactKeys(sample, ["frame", "dirtyCount", "commitMs", "intervalMs"].sort()) && sample.frame === index + 61 && sample.dirtyCount === testCase.rows && finite(sample.commitMs) && finite(sample.intervalMs), `${prefix}-measured-${index + 1}`, sample);
  const requiredArmResource = testCase.arm === "native" ? "/assets/native_high_frequency_arm-CoEbLbje.js" : "/assets/react_high_frequency_arm-Cio8XO_I.js";
  const resources = record.loadedBuildResources ?? [];
  const resourcePaths = new Set(resources.filter((resource) => resource.matches).map((resource) => resource.path));
  for (const resourcePath of ["/high-frequency.html", "/assets/highFrequency-Dk3MpsD8.js", "/assets/highFrequency-GrFjeJ6A.css", requiredArmResource]) add(resourcePaths.has(resourcePath), `${prefix}-resource-${resourcePath}`, resources);
  add(resources.every((resource) => resource.status === 200 && resource.matches), `${prefix}-resource-hashes`, resources);
}

const manifestRecordSummary = records.map((record) => ({ sequence: record.sequence, case: record.case, status: record.status, url: record.url, file: `sequence-${String(record.sequence).padStart(2, "0")}.json` }));
add(JSON.stringify(manifest.records) === JSON.stringify(manifestRecordSummary), "manifest-records-match", manifest.records);
add(manifest.status === (failures.length === 0 ? "PASS" : "FAIL"), "manifest-status", manifest.status);
const verification = {
  schemaVersion: "current-product-high-frequency-correctness-verification-v1",
  status: failures.length === 0 ? "PASS" : "FAIL",
  runDirectory: directory,
  checkedAt: new Date().toISOString(),
  inputPageCount: records.length,
  caseMatrix: expectedCases,
  localBuildAssetLocks: localLocks,
  failureCount: failures.length,
  failures,
  interpretation: "Correctness and lifecycle verification only; raw app timing fields were checked for shape and frame coverage but not aggregated or compared.",
};
await writeFile(path.join(directory, "verification.json"), `${JSON.stringify(verification, null, 2)}\n`, { flag: "wx" });
console.log(`Verification ${verification.status}: ${records.length}/6 raw pages; failures=${failures.length}; no timing aggregation.`);
if (verification.status !== "PASS") process.exitCode = 1;
