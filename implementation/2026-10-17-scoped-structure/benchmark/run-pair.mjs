import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";

const root = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const nodePath = process.execPath;
assert.equal(process.version, "v24.18.0", `Node v24.18.0 required, got ${process.version}`);
const args = process.argv.slice(2);
const value = (name) => { const index = args.indexOf(name); return index < 0 ? null : args[index + 1] ?? null; };
const proofDirArg = value("--proof-dir");
const origin = value("--origin");
assert.ok(proofDirArg && origin, "usage: node run-pair.mjs --proof-dir ABSOLUTE_DIR --origin https://NAME.localhost[:PORT]");
const proofDir = path.resolve(proofDirArg);
assert.ok(proofDir.startsWith(path.join(root, "implementation/2026-10-17-scoped-structure/benchmark/")));
const address = new URL(origin);
assert.equal(address.protocol, "https:");
assert.ok(address.hostname.endsWith(".localhost") && origin === address.origin);
const proofPath = path.join(proofDir, "build-proof.json");
const authPath = path.join(proofDir, "run-authorization.json");
const lockPath = path.join(proofDir, "source-lock.json");
const outputPath = path.join(proofDir, "pair-one-shot.json");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (filename) => sha(await readFile(filename));
const proofBytes = await readFile(proofPath);
const proof = JSON.parse(proofBytes);
const authBytes = await readFile(authPath);
const auth = JSON.parse(authBytes);
const lockBytes = await readFile(lockPath);
const lock = JSON.parse(lockBytes);
assert.equal(proof.schemaVersion, "scoped-structure-pair-build-proof-v1");
assert.equal(proof.status, "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW");
assert.equal(auth.status, "APPROVED_FOR_ONE_DESCRIPTIVE_PAIR");
assert.equal(auth.buildProofSha256, sha(proofBytes), "primary authorization does not bind this build proof");
assert.equal(proof.sourceLockSha256, sha(lockBytes));
assert.ok(proof.compiler?.sha256 && proof.compiler.sha256 === lock.compiler.sha256 && proof.assets?.length > 0);
assert.ok(proof.transformed?.some((item) => item.path.endsWith("native_arm.tsx.js")));
assert.ok(proof.transformed?.some((item) => item.path.endsWith("react_arm.tsx.js")));
try { await stat(outputPath); throw new Error(`refusing a second pair or replacement of ${outputPath}`); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const record = { schemaVersion: "scoped-structure-one-pair-v1", status: "STARTED",
  study: "N=1024 keyed local move and middle removal; native scoped collection candidates compared with React array replacement",
  claimLimit: "One independent matched page-pair is descriptive only; no locality, tail, or speed qualification.",
  transport: "offline-production-asset-replay; HTTPS .localhost origin intercepted in Playwright and fulfilled only from source-locked build files; no server, TLS connection, Portless route, or live HTTPS evidence",
  nodeVersion: process.version, origin, browserOptions: { headless: true, gpu: false, handleSignals: false }, browserVersion: null, viewport: { width: 1200, height: 900 },
  buildProofSha256: sha(proofBytes), sourceLockSha256: sha(lockBytes), sourceBefore: [], sourceAfter: [],
  bundleBytes: { total: proof.assets.reduce((sum, item) => sum + item.bytes, 0), javascript: proof.assets.filter((item) => /\.js$/.test(item.path)).reduce((sum, item) => sum + item.bytes, 0), css: proof.assets.filter((item) => /\.css$/.test(item.path)).reduce((sum, item) => sum + item.bytes, 0) },
  servedAssets: [], blockedRequests: [], arms: [], comparison: null, errors: [], stopReason: null };
await writeFile(outputPath, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
const verifySources = async (target) => {
  for (const input of lock.inputs) {
    const actual = await hashFile(path.join(root, input.path));
    record[target].push({ path: input.path, expected: input.sha256, actual, matches: actual === input.sha256 });
    assert.equal(actual, input.sha256, `${target} source drift: ${input.path}`);
  }
  const binaryActual = await hashFile(path.join(root, lock.compiler.path));
  record[target].push({ path: lock.compiler.path, expected: lock.compiler.sha256, actual: binaryActual, matches: binaryActual === lock.compiler.sha256 });
  assert.equal(binaryActual, lock.compiler.sha256, `${target} compiler binary drift`);
  for (const artifact of [...proof.assets, ...proof.transformed]) {
    const actual = await hashFile(path.join(root, artifact.path));
    record[target].push({ path: artifact.path, expected: artifact.sha256, actual, matches: actual === artifact.sha256 });
    assert.equal(actual, artifact.sha256, `${target} local artifact drift: ${artifact.path}`);
  }
};
const expectedAssets = new Map(proof.assets.filter((asset) => /\.(html|js|css)$/.test(asset.path))
  .map((asset) => [asset.urlPath, asset.sha256]));
const manifestAssets = new Map(proof.assets.map((asset) => [asset.urlPath, asset]));
const htmlPath = [...expectedAssets.keys()].find((item) => item.endsWith(".html"));
assert.ok(htmlPath, "build proof has no HTML asset");
let browser;
let deadline;
const deadlineAt = Date.now() + 90_000;
let stopResolve;
const stopped = new Promise((resolve) => { stopResolve = resolve; });
const stop = (reason) => {
  if (record.stopReason) return;
  record.stopReason = reason;
  stopResolve(reason);
  browser?.close().catch((error) => record.errors.push(`browser close: ${String(error)}`));
};
const onSigint = () => stop("SIGINT");
const onSigterm = () => stop("SIGTERM");
const stoppedError = () => stopped.then((reason) => { throw new Error(`pair interrupted: ${reason}`); });
const remaining = () => {
  const time = deadlineAt - Date.now();
  if (record.stopReason || time <= 0) throw new Error(`pair deadline reached: ${record.stopReason ?? "deadline-90s"}`);
  return Math.max(1, time);
};
const median = (samples) => { const sorted = [...samples].sort((a, b) => a - b); return (sorted[3] + sorted[4]) / 2; };
const executeArm = async (arm) => {
  const context = await browser.newContext({ viewport: record.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const failures = [];
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("requestfailed", (request) => failures.push({ url: request.url(), error: request.failure()?.errorText ?? "unknown" }));
  await context.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin !== origin) {
      record.blockedRequests.push({ arm, url: requestUrl.href, reason: "outside exact synthetic origin" });
      await route.abort();
      return;
    }
    if (requestUrl.pathname === "/favicon.ico") {
      record.servedAssets.push({ arm, path: requestUrl.pathname, status: 204, sha256: null, kind: "explicit-empty-favicon" });
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    const asset = manifestAssets.get(requestUrl.pathname);
    if (!asset) {
      record.blockedRequests.push({ arm, url: requestUrl.href, reason: "path absent from frozen build manifest" });
      await route.abort();
      return;
    }
    const bytes = await readFile(path.join(root, asset.path));
    const actual = sha(bytes);
    if (actual !== asset.sha256) {
      record.errors.push(`${arm} local asset hash mismatch: ${requestUrl.pathname}`);
      await route.abort();
      return;
    }
    const extension = path.extname(requestUrl.pathname);
    const contentType = extension === ".html" ? "text/html; charset=utf-8" : extension === ".js" ? "text/javascript; charset=utf-8" : extension === ".css" ? "text/css; charset=utf-8" : "application/json; charset=utf-8";
    record.servedAssets.push({ arm, path: requestUrl.pathname, status: 200, expected: asset.sha256, actual, bytes: bytes.byteLength, kind: "local-manifest-fulfillment" });
    await route.fulfill({ status: 200, headers: { "content-type": contentType, "cache-control": "no-store" }, body: bytes });
  });
  try {
    const navigation = await page.goto(new URL(htmlPath, origin).toString(), { waitUntil: "networkidle", timeout: remaining() });
    assert.equal(navigation?.status(), 200);
    assert.equal(new URL(page.url()).origin, origin);
    assert.equal(await page.evaluate(() => window.isSecureContext), true, "synthetic HTTPS origin did not provide secure-context semantics");
    const result = await page.evaluate(async (selectedArm) => {
      if (!window.__structuralPair) throw new Error("structural pair runner not initialized");
      return await window.__structuralPair.run(selectedArm);
    }, arm);
    for (const [assetPath] of expectedAssets) {
      const matches = record.servedAssets.filter((item) => item.arm === arm && item.path === assetPath);
      assert.equal(matches.length, 1, `${arm} asset missing/duplicated: ${assetPath}`);
    }
    assert.equal(result.status, "PASS");
    assert.equal(result.rows, 1024);
    assert.equal(result.dirty, 2);
    assert.equal(result.nativeScopedCandidateSamples, arm === "native" ? 20 : 0);
    assert.ok(Number.isFinite(result.mountDurationMs) && result.mountDurationMs >= 0, `${arm} mount duration missing`);
    assert.ok(Number.isFinite(result.disposeDurationMs) && result.disposeDurationMs >= 0, `${arm} dispose duration missing`);
    assert.equal(result.disposal.remainingChildren, 0);
    assert.deepEqual(pageErrors, [], `${arm} page errors`);
    assert.deepEqual(consoleErrors, [], `${arm} console errors`);
    assert.deepEqual(failures, [], `${arm} request failures`);
    assert.deepEqual(record.blockedRequests.filter((item) => item.arm === arm), [], `${arm} attempted an unmanifested or external request`);
    assert.deepEqual(record.errors, [], "asset verification errors");
    return { arm, result, responses: record.servedAssets.filter((item) => item.arm === arm), pageErrors, consoleErrors, failures };
  } finally { await context.close(); }
};
let primaryError = null;
try {
  await verifySources("sourceBefore");
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);
  deadline = setTimeout(() => stop("deadline-90s"), 90_000);
  const opening = openBrowser({ headless: true, gpu: false, handleSignals: false }).then(async (instance) => {
    if (record.stopReason) { await instance.close(); throw new Error("stopped while browser opened"); }
    return instance;
  });
  browser = await Promise.race([opening, stoppedError()]);
  record.browserVersion = browser.version();
  const work = (async () => {
    record.arms.push(await executeArm("native"));
    record.arms.push(await executeArm("react"));
    const native = record.arms[0].result;
    const react = record.arms[1].result;
    assert.equal(native.outputSha256, react.outputSha256, "final native/React authored output mismatch");
    const resolutionUnknown = native.timerResolutionMs === null || react.timerResolutionMs === null;
    for (const operation of ["move-row-0-to-tail", "remove-row-512"]) {
      const left = native.measurements[operation];
      const right = react.measurements[operation];
      assert.equal(left.measuredMs.length, 8);
      assert.equal(right.measuredMs.length, 8);
      record.comparison ??= {};
      const belowResolution = !resolutionUnknown && (left.medianMs <= 2 * native.timerResolutionMs || right.medianMs <= 2 * react.timerResolutionMs);
      record.comparison[operation] = { nativeMedianMs: left.medianMs, reactMedianMs: right.medianMs,
        nativeP95Ms: left.p95Ms, reactP95Ms: right.p95Ms,
        descriptiveMedianRatioNativeOverReact: resolutionUnknown || belowResolution ? null : left.medianMs / right.medianMs,
        p95RatioNativeOverReact: resolutionUnknown || belowResolution ? null : left.p95Ms / right.p95Ms,
        ratioStatus: resolutionUnknown ? "UNRESOLVED_TIMER_QUANTUM" : belowResolution ? "UNRESOLVED_NEAR_TIMER_FLOOR" : "DESCRIPTIVE_ONLY",
        interpretation: "one page per arm, eight measured trials per operation; p95 is the within-page maximum and descriptive only; pauses and GC samples are retained without censoring" };
    }
    record.status = "PASS_DESCRIPTIVE_PAIR_ONLY";
  })();
  await Promise.race([work, stoppedError()]);
  await verifySources("sourceAfter");
  assert.equal(await hashFile(proofPath), sha(proofBytes), "build proof changed during pair");
  assert.equal(await hashFile(lockPath), sha(lockBytes), "source lock changed during pair");
  assert.equal(await hashFile(authPath), sha(authBytes), "run authorization changed during pair");
} catch (error) {
  primaryError = String(error);
  record.status = "INCOMPLETE";
  record.errors.push(primaryError);
} finally {
  clearTimeout(deadline);
  process.off("SIGINT", onSigint);
  process.off("SIGTERM", onSigterm);
  if (browser) { try { await browser.close(); } catch (error) { record.errors.push(`browser close: ${String(error)}`); } }
  await writeFile(outputPath, JSON.stringify(record, null, 2) + "\n");
}
if (primaryError) { console.error(primaryError); process.exitCode = record.stopReason === "SIGINT" ? 130 : record.stopReason === "SIGTERM" ? 143 : 1; }
else console.log(JSON.stringify({ status: record.status, outputPath }));
