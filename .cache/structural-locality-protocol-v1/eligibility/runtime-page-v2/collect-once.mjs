import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";
import { fetchServedMaps } from "./served-map-fetch.mjs";

const stage = fileURLToPath(new URL("./", import.meta.url));
const root = path.resolve(stage, "../../../..");
const buildStage = path.resolve(stage, "../runtime-gate-v2");
const origin = process.env.STRUCTURAL_RUNTIME_GATE_ORIGIN;
assert.ok(origin, "set STRUCTURAL_RUNTIME_GATE_ORIGIN to the exact Portless URL, including its port");
const output = path.join(stage, "page-report.json");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const hash = async (file) => sha(await readFile(file));
const lockPath = path.join(buildStage, "input-lock.json");
const preservationPath = path.join(buildStage, "v1-preservation-manifest.json");
const buildPath = path.join(buildStage, "build-report.json");
const runnerLockPath = path.join(stage, "runner-lock.json");
const failedPageManifestPath = path.join(stage, "failed-page-preservation.json");
const browserOptions = { headless: true, gpu: false, handleSignals: false };
const viewport = { width: 1200, height: 900 };
assert.equal(process.version, "v24.18.0");
const address = new URL(origin);
assert.equal(address.protocol, "https:");
assert.ok(address.hostname.endsWith(".localhost") && !address.username && !address.password &&
  !address.pathname.replaceAll("/", "") && !address.search && !address.hash,
"origin must be a Portless HTTPS .localhost origin");
assert.equal(origin, address.origin, "origin must be the exact canonical HTTPS origin");
try { await stat(output); throw new Error(`refusing existing report ${output}`); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const lockBytes = await readFile(lockPath);
const lock = JSON.parse(lockBytes);
const buildBytes = await readFile(buildPath);
const build = JSON.parse(buildBytes);
const runnerLockBytes = await readFile(runnerLockPath);
const runnerLock = JSON.parse(runnerLockBytes);
const assetBase = ".cache/structural-locality-protocol-v1/eligibility/runtime-gate-v2/dist/";
const servedPathFor = (item) => {
  assert.ok(item.path.startsWith(assetBase), `artifact outside v2 dist: ${item.path}`);
  return "/" + item.path.slice(assetBase.length);
};
const htmlArtifacts = build.artifacts.filter((item) => item.path.endsWith(".html"));
const htmlServedPath = htmlArtifacts.length === 1 ? servedPathFor(htmlArtifacts[0]) : null;
const expectedResponses = new Map(build.artifacts.filter((item) =>
  !item.path.endsWith(".map")).map((item) => [servedPathFor(item), item.sha256]));
const record = { schemaVersion: "structural-runtime-page-v2", status: "STARTED",
  origin, nodeVersion: process.version, browserOptions, viewport,
  runnerLockSha256: sha(runnerLockBytes), htmlServedPath,
  inputLockSha256: sha(lockBytes), buildReportSha256: sha(buildBytes),
  compilerBinarySha256: build.compiler.sha256, browserVersion: null,
  runnerSourcesBefore: [], runnerSourcesAfter: [], failedPageBefore: [], failedPageAfter: [],
  inputsBefore: [], inputsAfter: [], preservationBefore: [], preservationAfter: [],
  localAssetsBefore: [], localAssetsAfter: [],
  navigation: null, executedResponses: [], responseInventory: [],
  faviconInterceptions: [], fetchedMaps: [],
  pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [], cleanupErrors: [],
  trace: [], result: null, stopReason: null, error: null };
const verifyInputs = async (phase) => {
  assert.equal(await hash(runnerLockPath), record.runnerLockSha256, `${phase}: runner lock drift`);
  for (const source of runnerLock.sources) {
    const actual = await hash(path.join(root, source.path));
    record[phase === "inputsBefore" ? "runnerSourcesBefore" : "runnerSourcesAfter"]
      .push({ path: source.path, expected: source.sha256, actual });
    assert.equal(actual, source.sha256,
      `${phase}: page runner source ${source.path}`);
  }
  for (const declaration of runnerLock.apiDeclarations) {
    const actual = await hash(path.join(root, declaration.path));
    record[phase === "inputsBefore" ? "runnerSourcesBefore" : "runnerSourcesAfter"]
      .push({ path: declaration.path, expected: declaration.sha256, actual,
        role: "API-surface declaration" });
    assert.equal(actual, declaration.sha256,
      `${phase}: API-surface declaration ${declaration.path}`);
  }
  const failedPage = JSON.parse(await readFile(failedPageManifestPath, "utf8"));
  const phaseField = phase === "inputsBefore" ? "failedPageBefore" : "failedPageAfter";
  for (const source of failedPage.files) {
    const actual = await hash(path.join(root, source.path));
    record[phaseField].push({ path: source.path, expected: source.sha256, actual });
    assert.equal(actual, source.sha256, `${phase}: failed page preservation ${source.path}`);
  }
  assert.equal(await hash(lockPath), record.inputLockSha256, `${phase}: input-lock self drift`);
  for (const entry of lock.inputs) {
    const actual = await hash(path.join(root, entry.path));
    record[phase].push({ path: entry.path, expected: entry.sha256, actual });
    assert.equal(actual, entry.sha256, `${phase}: ${entry.path}`);
  }
  const preserved = JSON.parse(await readFile(preservationPath, "utf8"));
  const previous = phase === "inputsBefore" ? "preservationBefore" : "preservationAfter";
  for (const entry of preserved.files) {
    const actual = await hash(path.join(root, entry.path));
    record[previous].push({ path: entry.path, expected: entry.sha256, actual });
    assert.equal(actual, entry.sha256, `${phase}: v1 preservation ${entry.path}`);
  }
  assert.equal(await hash(buildPath), record.buildReportSha256, `${phase}: build report drift`);
  assert.equal(await hash(path.join(root, build.compiler.binary)), build.compiler.sha256,
    `${phase}: compiler binary drift`);
  for (const item of build.artifacts) {
    const actual = await hash(path.join(root, item.path));
    record[phase === "inputsBefore" ? "localAssetsBefore" : "localAssetsAfter"]
      .push({ path: item.path, expected: item.sha256, actual });
    assert.equal(actual, item.sha256, `${phase}: local asset ${item.path}`);
  }
};
let browser, context, page, deadline, stopResolve;
const stopped = new Promise((resolve) => { stopResolve = resolve; });
const responseJobs = [];
const responseErrors = [];
const responses = [];
const responseInventory = [];
const faviconInterceptions = [];
const pageErrors = [];
const consoleErrors = [];
const requestFailures = [];
let deadlineAt = 0;
function stop(reason) {
  if (record.stopReason) return;
  record.stopReason = reason;
  stopResolve(reason);
  browser?.close().catch((error) => record.cleanupErrors.push(`stop browser close: ${String(error)}`));
}
const onSigint = () => stop("SIGINT");
const onSigterm = () => stop("SIGTERM");
const stoppedError = () => stopped.then((reason) => { throw Error(`stopped: ${reason}`); });
const remaining = () => Math.max(1, Math.min(80_000, deadlineAt - Date.now()));
async function boundedClose(label, promise) {
  if (!promise) return;
  const ms = Math.max(1, Math.min(5_000, deadlineAt - Date.now()));
  let timer;
  try {
    await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(Error(`cleanup timeout after ${ms} ms`)), ms);
    })]);
  } catch (error) { record.cleanupErrors.push(`${label}: ${String(error)}`); }
  finally { clearTimeout(timer); }
}
try {
  assert.equal(runnerLock.schemaVersion, "structural-runtime-page-runner-lock-v2");
  assert.deepEqual(runnerLock.apiDeclarations.map((item) => item.path), [
    "node_modules/.pnpm/playwright-core@1.63.0-beta-1788477194000/node_modules/playwright-core/types/types.d.ts",
    "node_modules/.pnpm/@typescript+native-preview-darwin-arm64@7.0.0-dev.20260707.2/node_modules/@typescript/native-preview-darwin-arm64/lib/lib.dom.d.ts",
  ]);
  assert.equal(runnerLock.v2InputLockSha256, record.inputLockSha256);
  assert.equal(runnerLock.v2BuildReportSha256, record.buildReportSha256);
  assert.equal(runnerLock.v2CompilerBinarySha256, build.compiler.sha256);
  assert.equal(lock.schemaVersion, "structural-runtime-gate-input-lock-v2");
  assert.equal(lock.inputs.length, 424);
  assert.equal(build.schemaVersion, "structural-runtime-gate-build-v2");
  assert.equal(build.status, "BUILD_PROVENANCE_PASS_RUNTIME_UNVERIFIED");
  assert.equal(build.inputLockSha256, sha(lockBytes));
  assert.equal(build.compiler.sha256, lock.binarySha256);
  assert.equal(htmlArtifacts.length, 1, "expected one emitted HTML artifact");
  assert.ok(htmlServedPath && expectedResponses.has(htmlServedPath));
  assert.ok([...expectedResponses.keys()].some((name) => name.endsWith(".js")));
  await verifyInputs("inputsBefore");
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);
  deadlineAt = Date.now() + 90_000;
  deadline = setTimeout(() => stop("deadline-90s"), 90_000);
  const opening = openBrowser(browserOptions).then(async (instance) => {
    if (record.stopReason) {
      await boundedClose("late browser close", instance.close());
      throw Error("stopped during browser opening");
    }
    return instance;
  });
  browser = await Promise.race([opening, stoppedError()]);
  record.browserVersion = browser.version();
  const work = (async () => {
    context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    page = await context.newPage();
    await page.route(`${origin}/favicon.ico`, async (route) => {
      faviconInterceptions.push({ url: route.request().url(), action: "fulfill-204" });
      await route.fulfill({ status: 204, body: "" });
    });
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push({ type: message.type(), text: message.text(),
        location: message.location() });
    });
    page.on("requestfailed", (request) => requestFailures.push({
      url: request.url(), failure: request.failure()?.errorText ?? "unknown" }));
    page.on("response", (response) => {
      responseInventory.push({ url: response.url(), status: response.status() });
      responseJobs.push((async () => {
        const url = new URL(response.url());
        const servedPath = url.pathname;
        if (url.origin !== origin || !expectedResponses.has(servedPath)) return;
        const body = await response.body();
        responses.push({ path: servedPath, responseUrl: response.url(), status: response.status(),
          sha256: sha(body), expectedSha256: expectedResponses.get(servedPath) });
      })().catch((error) => responseErrors.push(`${response.url()}: ${String(error)}`)));
    });
    const navigation = await page.goto(new URL(htmlServedPath, origin).toString(),
      { waitUntil: "networkidle", timeout: remaining() });
    record.navigation = { status: navigation?.status(), url: page.url() };
    assert.equal(new URL(page.url()).origin, origin);
    assert.equal(new URL(page.url()).pathname, htmlServedPath);
    await Promise.all(responseJobs);
    assert.deepEqual(responseErrors, [], "initial response body read failed");
    assert.equal(record.navigation.status, 200);
    for (const [name, expected] of expectedResponses) {
      const matched = responses.filter((item) => item.path === name);
      assert.equal(matched.length, 1, `executed response absent/duplicated: ${name}`);
      assert.equal(matched[0].status, 200, `response ${name}`);
      assert.equal(matched[0].sha256, expected, `executed response drift ${name}`);
    }
    const maps = build.artifacts.filter((item) => item.path.endsWith(".map"))
      .map((item) => ({ ...item, url: servedPathFor(item) }));
    record.fetchedMaps = await page.evaluate(fetchServedMaps, maps);
    const expectedInventory = new Map([
      ...[...expectedResponses].map(([url]) => [url, 200]),
      ...maps.map((item) => [item.url, 200]),
      ["/favicon.ico", 204],
    ]);
    for (const response of responseInventory) {
      const url = new URL(response.url);
      assert.equal(url.origin, origin, `unexpected response origin ${response.url}`);
      assert.equal(response.status, expectedInventory.get(url.pathname),
        `unexpected response ${response.url}: HTTP ${response.status}`);
    }
    assert.deepEqual(consoleErrors, [], "console error before app gate");
    await page.waitForFunction(() => typeof window.__structuralRuntimeGate?.run === "function",
      undefined, { timeout: remaining() });
    record.result = await page.evaluate(() => window.__structuralRuntimeGate.run());
    record.trace = await page.evaluate(() => window.__structuralRuntimeGate.trace);
    await Promise.all(responseJobs);
    assert.deepEqual(responseErrors, []);
    for (const response of responseInventory) {
      const url = new URL(response.url);
      assert.equal(url.origin, origin, `unexpected response origin ${response.url}`);
      assert.equal(response.status, expectedInventory.get(url.pathname),
        `unexpected response ${response.url}: HTTP ${response.status}`);
    }
    assert.deepEqual(record.result.map((item) => item.status), ["PASS", "PASS", "PASS"]);
    assert.deepEqual(record.result.map((item) => item.arm), ["collection", "generic", "react"]);
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(requestFailures, []);
    record.status = "CORRECTNESS_AND_DELTA_PATH_PASS_SINGLE_N_128";
  })();
  await Promise.race([work, stoppedError()]);
} catch (error) {
  record.status = record.stopReason ? "INCOMPLETE" : "FAIL";
  record.error = String(error?.stack ?? error);
  if (page && !record.stopReason) {
    try { record.trace = await Promise.race([
      page.evaluate(() => window.__structuralRuntimeGate?.trace ?? []),
      new Promise((_, reject) => setTimeout(() => reject(Error("trace timeout")), 1000)),
    ]); } catch (traceError) { record.cleanupErrors.push(`trace: ${String(traceError)}`); }
  }
} finally {
  await boundedClose("context close", context?.close());
  await boundedClose("browser close", browser?.close());
  clearTimeout(deadline);
  process.off("SIGINT", onSigint);
  process.off("SIGTERM", onSigterm);
  record.executedResponses = responses;
  record.responseInventory = responseInventory;
  record.faviconInterceptions = faviconInterceptions;
  record.pageErrors = pageErrors;
  record.consoleErrors = consoleErrors;
  record.requestFailures = requestFailures;
  record.responseErrors = responseErrors;
  try { await verifyInputs("inputsAfter"); }
  catch (error) { record.cleanupErrors.push(`postflight: ${String(error)}`); }
  if (record.stopReason) record.status = "INCOMPLETE";
  if (record.cleanupErrors.length && record.status === "CORRECTNESS_AND_DELTA_PATH_PASS_SINGLE_N_128")
    record.status = "FAIL";
  await writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
}
if (record.status !== "CORRECTNESS_AND_DELTA_PATH_PASS_SINGLE_N_128") process.exitCode = 1;
