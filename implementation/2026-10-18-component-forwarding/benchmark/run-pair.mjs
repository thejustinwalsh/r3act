import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";

const root = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
assert.equal(process.version, "v24.18.0", `Node v24.18.0 required, got ${process.version}`);
const args = process.argv.slice(2);
const value = (flag) => { const index = args.indexOf(flag); return index < 0 ? null : args[index + 1] ?? null; };
const proofDir = path.resolve(value("--proof-dir") ?? "");
const origin = value("--origin");
assert.ok(origin, "usage: node run-pair.mjs --proof-dir ABSOLUTE_DIR --origin https://NAME.localhost");
assert.ok(proofDir.startsWith(path.join(root, "implementation/2026-10-18-component-forwarding/benchmark/")));
const address = new URL(origin);
assert.equal(address.protocol, "https:");
assert.ok(address.hostname.endsWith(".localhost") && address.origin === origin);
const proofPath = path.join(proofDir, "build-proof.json");
const sourcePath = path.join(proofDir, "source-lock.json");
const authorizationPath = path.join(proofDir, "run-authorization.json");
const outputPath = path.join(proofDir, "pair-one-shot.json");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (filename) => sha(await readFile(filename));
const proofBytes = await readFile(proofPath);
const sourceBytes = await readFile(sourcePath);
const authBytes = await readFile(authorizationPath);
const proof = JSON.parse(proofBytes);
const lock = JSON.parse(sourceBytes);
const authorization = JSON.parse(authBytes);
assert.equal(proof.status, "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW");
assert.equal(authorization.status, "APPROVED_FOR_ONE_DESCRIPTIVE_PAIR");
assert.equal(authorization.buildProofSha256, sha(proofBytes), "authorization does not bind this exact proof");
assert.equal(proof.sourceLockSha256, sha(sourceBytes));
assert.ok(proof.assets.length > 0 && proof.compiler.sha256 === lock.compiler.sha256);
assert.ok(proof.assertions.nativeComponentForwardPrograms && proof.assertions.nativeJointInputProgram && proof.assertions.nativeOwnedPayloads &&
  proof.assertions.nativeFallbackOwnerHookSites && proof.assertions.nativeRegisteredRevisionAndInvalidation &&
  proof.assertions.reactCompilerRuntime && proof.assertions.reactMemoCache);
try { await stat(outputPath); throw new Error(`refusing a second attempt or replacement of ${outputPath}`); }
catch (error) { if (error.code !== "ENOENT") throw error; }

const manifest = new Map(proof.assets.map((asset) => [asset.urlPath, asset]));
const htmlPath = [...manifest.keys()].find((item) => item.endsWith(".html"));
assert.ok(htmlPath, "build proof has no HTML entry");
const record = { schemaVersion: "component-forwarding-one-pair-v1", status: "STARTED",
  workload: "Two compiler-proven component forwarding edges carry prestarted canonical resources and a live structured Store into a fixed tree beside independent pending health. Second resource settles first and cannot reveal the joint tree. The final resource settlement reveals sum=6, model=50, transform=translateX(6px), opacity=.3. Untimed row interaction, subsequent Store update to sum12 and later health reveal verify identity and lifetime.",
  timingMeaning: "Final resource settlement to first matching MutationObserver callback with joint sum6/model50/transform6px/opacity.3; includes scheduling and observer delivery before paint. Native uses AsyncResource and runtime-owned records; React reads equally prestarted Promises and frozen records. No CPU, physical input, tail, presentation, cold/memory or independent-device qualification.",
  transport: "offline-production-asset-replay; synthetic HTTPS .localhost requests are fulfilled only from source-locked local assets; no network, TLS connection, project server or Portless route",
  nodeVersion: process.version, origin, browserOptions: { headless: true, gpu: false, handleSignals: false }, browserVersion: null,
  viewport: { width: 1200, height: 900 }, buildProofSha256: sha(proofBytes), sourceLockSha256: sha(sourceBytes),
  sourceBefore: [], sourceAfter: [], bundleBytes: { total: proof.assets.reduce((sum, asset) => sum + asset.bytes, 0),
    javascript: proof.assets.filter((asset) => /\.js$/.test(asset.path)).reduce((sum, asset) => sum + asset.bytes, 0),
    css: proof.assets.filter((asset) => /\.css$/.test(asset.path)).reduce((sum, asset) => sum + asset.bytes, 0) },
  servedAssets: [], blockedRequests: [], requestFailures: [], pageErrors: [], consoleErrors: [], arms: [], comparison: null, errors: [], stopReason: null };
await writeFile(outputPath, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });

const verifyInputs = async (field) => {
  for (const item of lock.inputs) {
    const actual = await hashFile(path.join(root, item.path));
    record[field].push({ path: item.path, expected: item.sha256, actual, matches: actual === item.sha256 });
    assert.equal(actual, item.sha256, `${field} source drift: ${item.path}`);
  }
  const actualCompiler = await hashFile(path.join(root, lock.compiler.path));
  record[field].push({ path: lock.compiler.path, expected: lock.compiler.sha256, actual: actualCompiler, matches: actualCompiler === lock.compiler.sha256 });
  assert.equal(actualCompiler, lock.compiler.sha256, `${field} compiler drift`);
  for (const asset of [...proof.assets, ...proof.transformed]) {
    const actual = await hashFile(path.join(root, asset.path));
    record[field].push({ path: asset.path, expected: asset.sha256, actual, matches: actual === asset.sha256 });
    assert.equal(actual, asset.sha256, `${field} artifact drift: ${asset.path}`);
  }
};

let browser;
let deadlineTimer;
let resolveStopped;
const stopped = new Promise((resolve) => { resolveStopped = resolve; });
const deadlineAt = Date.now() + 90_000;
const stop = (reason) => {
  if (record.stopReason) return;
  record.stopReason = reason;
  resolveStopped(reason);
  browser?.close().catch(() => {});
};
const stoppedError = () => stopped.then((reason) => { throw new Error(`pair interrupted: ${reason}`); });
const onInt = () => stop("SIGINT");
const onTerm = () => stop("SIGTERM");
const remaining = () => {
  const milliseconds = deadlineAt - Date.now();
  if (record.stopReason || milliseconds <= 0) throw new Error(`pair deadline: ${record.stopReason ?? "90-second limit"}`);
  return milliseconds;
};

async function runArm(arm) {
  const context = await browser.newContext({ viewport: record.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on("pageerror", (error) => record.pageErrors.push({ arm, error: String(error) }));
  page.on("console", (message) => { if (message.type() === "error") record.consoleErrors.push({ arm, error: message.text() }); });
  page.on("requestfailed", (request) => record.requestFailures.push({ arm, url: request.url(), reason: request.failure()?.errorText ?? "unknown" }));
  await context.route("**/*", async (route) => {
    const request = new URL(route.request().url());
    if (request.origin !== origin) { record.blockedRequests.push({ arm, url: request.href, reason: "outside exact origin" }); await route.abort(); return; }
    const asset = manifest.get(request.pathname);
    if (!asset) { record.blockedRequests.push({ arm, url: request.href, reason: "not in frozen asset manifest" }); await route.abort(); return; }
    const body = await readFile(path.join(root, asset.path));
    assert.equal(sha(body), asset.sha256, `local asset changed: ${request.pathname}`);
    const type = request.pathname.endsWith(".html") ? "text/html; charset=utf-8" :
      request.pathname.endsWith(".js") ? "text/javascript; charset=utf-8" : request.pathname.endsWith(".css") ? "text/css; charset=utf-8" : "application/octet-stream";
    record.servedAssets.push({ arm, path: request.pathname, sha256: asset.sha256, bytes: body.byteLength });
    await route.fulfill({ status: 200, headers: { "content-type": type, "cache-control": "no-store" }, body });
  });
  try {
    const response = await page.goto(new URL(htmlPath, origin).href, { waitUntil: "networkidle", timeout: remaining() });
    assert.equal(response?.status(), 200);
    assert.equal(await page.evaluate(() => window.isSecureContext), true);
    const result = await page.evaluate(async (name) => {
      if (!window.__componentForwardingPair) throw new Error("component-forwarding entry was not initialized");
      return await window.__componentForwardingPair.run(name);
    }, arm);
    assert.equal(result.status, "PASS");
    assert.equal(result.arm, arm);
    assert.equal(result.retainedHealthIdentity, true);
    assert.equal(result.retainedRowIdentity, true);
    assert.equal(result.retainedRowState, 1);
    assert.equal(result.noPrematureJointReveal, true);
    assert.equal(result.fallbackRetired, true);
    assert.equal(result.laterStoreUpdated, true);
    assert.equal(result.laterHealthRevealed, true);
    assert.equal(result.disposal.remainingChildren, 0);
    if (arm === "native") {
      assert.equal(result.forwardOwnerCountPreserved, true);
      assert.equal(result.disposal.ownerCount, 0);
      assert.equal(result.disposal.pendingChangeCount, 0);
    }
    assert.deepEqual(record.pageErrors.filter((item) => item.arm === arm), []);
    assert.deepEqual(record.consoleErrors.filter((item) => item.arm === arm), []);
    assert.deepEqual(record.blockedRequests.filter((item) => item.arm === arm), []);
    assert.deepEqual(record.requestFailures.filter((item) => item.arm === arm), []);
    for (const asset of proof.assets.filter((item) => /\.(html|js|css)$/.test(item.path))) {
      assert.equal(record.servedAssets.filter((item) => item.arm === arm && item.path === asset.urlPath).length, 1,
        `${arm} did not load exactly one copy of ${asset.urlPath}`);
    }
    return { arm, result };
  } finally { await context.close(); }
}

let errorText = null;
try {
  await verifyInputs("sourceBefore");
  process.on("SIGINT", onInt); process.on("SIGTERM", onTerm);
  deadlineTimer = setTimeout(() => stop("deadline-90s"), 90_000);
  const opening = openBrowser({ headless: true, gpu: false, handleSignals: false }).then(async (instance) => {
    if (record.stopReason) { await instance.close(); throw new Error("stopped while browser opened"); }
    return instance;
  });
  browser = await Promise.race([opening, stoppedError()]);
  record.browserVersion = browser.version();
  const work = (async () => {
    record.arms.push(await runArm("native"));
    record.arms.push(await runArm("react"));
    assert.equal(record.arms[0].result.definedOutput, record.arms[1].result.definedOutput, "defined output differs");
    assert.equal(record.arms[0].result.outputSha256, record.arms[1].result.outputSha256, "defined output digest differs");
    record.comparison = { nativeSettlementToMutationObserverMs: record.arms[0].result.settlementToMutationObserverMs,
      reactSettlementToMutationObserverMs: record.arms[1].result.settlementToMutationObserverMs,
      nativeMinusReactMs: record.arms[0].result.settlementToMutationObserverMs - record.arms[1].result.settlementToMutationObserverMs,
      observerDelayIncluded: true, paintExcluded: true,
      status: "ONE_COMPONENT_FORWARDING_SETTLEMENT_TO_MUTATION_OBSERVER_DIAGNOSTIC" };
    await verifyInputs("sourceAfter");
    assert.equal(await hashFile(proofPath), sha(proofBytes));
    assert.equal(await hashFile(sourcePath), sha(sourceBytes));
    assert.equal(await hashFile(authorizationPath), sha(authBytes));
    record.status = "PASS_DESCRIPTIVE_COMPONENT_FORWARDING_PAIR_ONLY";
  })();
  await Promise.race([work, stoppedError()]);
} catch (error) {
  errorText = String(error); record.status = "INCOMPLETE"; record.errors.push(errorText);
} finally {
  clearTimeout(deadlineTimer); process.off("SIGINT", onInt); process.off("SIGTERM", onTerm);
  if (browser) { try { await browser.close(); } catch (error) { record.errors.push(`browser close: ${String(error)}`); } }
  await writeFile(outputPath, JSON.stringify(record, null, 2) + "\n");
}
if (errorText) { console.error(errorText); process.exitCode = record.stopReason === "SIGINT" ? 130 : record.stopReason === "SIGTERM" ? 143 : 1; }
else console.log(JSON.stringify({ status: record.status, outputPath }));
