import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, "../..");
const args = process.argv.slice(2);
const value = flag => { const index = args.indexOf(flag); return index < 0 ? null : args[index + 1] ?? null; };
const proofDir = path.resolve(value("--proof-dir") ?? "");
const phase = value("--phase");
assert.ok(proofDir.startsWith(`${unit}${path.sep}`), "proof must be inside async-recovery unit");
assert.ok(["behavior", "measured"].includes(phase), "usage: node verify-browser.mjs --proof-dir DIR --phase behavior|measured");
assert.equal(process.version, "v24.18.0");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hashFile = async filename => sha(await readFile(filename));
const buildPath = path.join(proofDir, "build-proof.json");
const lockPath = path.join(proofDir, "source-lock.json");
const buildBytes = await readFile(buildPath);
const lockBytes = await readFile(lockPath);
const build = JSON.parse(buildBytes);
const lock = JSON.parse(lockBytes);
assert.equal(build.status, "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW");
assert.equal(build.sourceLockSha256, sha(lockBytes));
assert.equal(build.compiler.sha256, lock.compiler.sha256);
const authorizationPath = path.join(proofDir, "run-authorization.json");
const behaviorPath = path.join(proofDir, "browser-behavior.json");
const receiptPath = path.join(proofDir, phase === "behavior" ? "browser-behavior.json" : "browser-measured-one-shot.json");
let authorizationBytes = null, behaviorBytes = null;
if (phase === "measured") {
  behaviorBytes = await readFile(behaviorPath);
  const behavior = JSON.parse(behaviorBytes);
  assert.equal(behavior.status, "PASS_UNTIMED_BEHAVIOR");
  assert.equal(behavior.buildProofSha256, sha(buildBytes));
  authorizationBytes = await readFile(authorizationPath);
  const authorization = JSON.parse(authorizationBytes);
  assert.equal(authorization.status, "APPROVED_FOR_ONE_DESCRIPTIVE_PAIR");
  assert.equal(authorization.buildProofSha256, sha(buildBytes), "authorization must name the exact reviewed build proof");
  assert.equal(authorization.behaviorReceiptSha256, sha(behaviorBytes), "authorization must name the exact passed behavior receipt");
}
try { await stat(receiptPath); throw new Error(`refusing a second ${phase} attempt`); }
catch (error) { if (error?.code !== "ENOENT") throw error; }

const origin = "https://async-recovery.localhost";
const assets = new Map(build.assets.map(asset => [asset.urlPath, asset]));
const htmlPath = [...assets.keys()].find(item => item.endsWith(".html"));
assert.ok(htmlPath && assets.size === build.assets.length, "missing HTML or duplicate asset URL");
const record = { schemaVersion: "async-recovery-browser-v1", phase, status: "STARTED",
  timingMeaning: "Final retry provider resolution to first matching MutationObserver; scheduling and observer delivery included, paint excluded. One fixed Native-first pair, not CPU, tails, cold, memory or independent-device evidence.",
  transport: "offline exact-asset synthetic HTTPS localhost; no server, TLS route or network",
  nodeVersion: process.version, origin, browserOptions: { headless: true, gpu: false, handleSignals: false },
  browserVersion: null, buildProofSha256: sha(buildBytes), sourceLockSha256: sha(lockBytes),
  behaviorReceiptSha256: behaviorBytes ? sha(behaviorBytes) : null,
  authorizationSha256: authorizationBytes ? sha(authorizationBytes) : null,
  sourceBefore: [], sourceAfter: [], servedAssets: [], blockedRequests: [], requestFailures: [],
  pageErrors: [], consoleErrors: [], arms: [], comparison: null, errors: [], stopReason: null, cleanup: { browserClosed: false } };
await writeFile(receiptPath, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });

const verifyInputs = async field => {
  for (const item of lock.inputs) {
    const actual = await hashFile(path.join(root, item.path));
    record[field].push({ path: item.path, expected: item.sha256, actual });
    assert.equal(actual, item.sha256, `${field} source changed: ${item.path}`);
    assert.equal(await hashFile(path.join(proofDir, "inputs/source", item.path)), item.sha256);
  }
  for (const item of [lock.compiler, ...build.transforms, ...build.assets]) {
    const actual = await hashFile(path.join(root, item.path));
    record[field].push({ path: item.path, expected: item.sha256, actual });
    assert.equal(actual, item.sha256, `${field} artifact changed: ${item.path}`);
  }
  assert.equal(await hashFile(path.join(root, lock.compiler.archivePath)), lock.compiler.sha256);
};

let browser, deadline;
let rejectStopped;
const stopped = new Promise((_, reject) => { rejectStopped = reject; });
void stopped.catch(() => {});
const stop = reason => {
  if (record.stopReason) return;
  record.stopReason = reason;
  rejectStopped(new Error(`browser stopped: ${reason}`));
  void browser?.close().catch(error => record.errors.push(`forced browser close: ${String(error)}`));
};
const onInt = () => stop("SIGINT");
const onTerm = () => stop("SIGTERM");
const deadlineAt = Date.now() + 90_000;
const remaining = () => Math.max(1, deadlineAt - Date.now());
async function runArm(arm) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  try {
    await context.route("**/*", async route => {
      const request = new URL(route.request().url());
      const asset = request.origin === origin ? assets.get(request.pathname) : null;
      if (!asset) {
        record.blockedRequests.push({ arm, url: request.href });
        await route.abort(); return;
      }
      const body = await readFile(path.join(root, asset.path));
      assert.equal(sha(body), asset.sha256, `served asset changed: ${request.pathname}`);
      const type = request.pathname.endsWith(".html") ? "text/html; charset=utf-8" :
        request.pathname.endsWith(".js") ? "text/javascript; charset=utf-8" :
        request.pathname.endsWith(".css") ? "text/css; charset=utf-8" : "application/octet-stream";
      record.servedAssets.push({ arm, urlPath: request.pathname, sha256: asset.sha256 });
      await route.fulfill({ status: 200, headers: { "content-type": type, "cache-control": "no-store" }, body });
    });
    const page = await context.newPage();
    page.on("pageerror", error => record.pageErrors.push({ arm, error: String(error) }));
    page.on("console", message => { if (message.type() === "error") record.consoleErrors.push({ arm, error: message.text() }); });
    page.on("requestfailed", request => record.requestFailures.push({ arm, url: request.url(), error: request.failure()?.errorText }));
    const response = await page.goto(new URL(htmlPath, origin).href, { waitUntil: "networkidle", timeout: remaining() });
    assert.equal(response?.status(), 200);
    assert.equal(await page.evaluate(() => window.isSecureContext), true);
    const timerQuantumMs = phase === "measured" ? await page.evaluate(() => {
      let previous = performance.now(), smallest = Infinity;
      for (let index = 0; index < 1000; index++) {
        const next = performance.now();
        if (next > previous) smallest = Math.min(smallest, next - previous);
        previous = next;
      }
      return Number.isFinite(smallest) ? smallest : null;
    }) : null;
    if (timerQuantumMs !== null) assert.ok(Number.isFinite(timerQuantumMs) && timerQuantumMs > 0);
    const output = await page.evaluate(async ({ name, measure }) => {
      if (!window.__asyncRecoveryPair) throw new Error("async recovery entry missing");
      return await window.__asyncRecoveryPair.run(name, { measure });
    }, { name: arm, measure: phase === "measured" });
    assert.equal(output.status, "PASS");
    assert.equal(output.arm, arm);
    assert.equal(typeof output.output, "string");
    assert.equal(output.outputSha256, sha(output.output));
    if (phase === "measured")
      assert.ok(Number.isFinite(output.settlementToMutationObserverMs) && output.settlementToMutationObserverMs >= 0);
    else assert.equal(output.settlementToMutationObserverMs ?? null, null,
      "untimed behavior phase recorded a settlement interval");
    assert.equal(output.urgentWhilePending, true);
    assert.equal(output.acceptedErrorRetained, true);
    assert.equal(output.cancelledLateDiscarded, true);
    assert.equal(output.remainingChildren, 0);
    assert.equal(output.staleStatus, "cancelled");
    assert.equal(output.retryStatus, "committed");
    assert.equal(output.firstStatus, "committed");
    assert.ok(output.lifeBeforeDisposal.readyMounts >= 1 && output.lifeBeforeDisposal.errorMounts >= 1);
    assert.equal(output.lifeAfterDisposal.readyMounts, output.lifeAfterDisposal.readyCleanups);
    assert.equal(output.lifeAfterDisposal.errorMounts, output.lifeAfterDisposal.errorCleanups);
    if (arm === "native") {
      assert.equal(output.disposal.ownerCount, 0);
      assert.equal(output.disposal.pendingChangeCount, 0);
    } else assert.equal(output.disposal.listenerCount, 0);
    assert.deepEqual(record.pageErrors.filter(item => item.arm === arm), []);
    assert.deepEqual(record.consoleErrors.filter(item => item.arm === arm), []);
    assert.deepEqual(record.blockedRequests.filter(item => item.arm === arm), []);
    assert.deepEqual(record.requestFailures.filter(item => item.arm === arm), []);
    for (const asset of build.assets.filter(item => /\.(html|js|css)$/.test(item.path)))
      assert.equal(record.servedAssets.filter(item => item.arm === arm && item.urlPath === asset.urlPath).length, 1,
        `${arm} did not load exact asset ${asset.urlPath}`);
    return { arm, output, timerQuantumMs };
  } finally {
    try { await context.close(); }
    catch (error) { record.errors.push(`${arm} context close: ${String(error)}`); }
  }
}

let failed = false;
try {
  await verifyInputs("sourceBefore");
  process.once("SIGINT", onInt); process.once("SIGTERM", onTerm);
  deadline = setTimeout(() => stop("deadline-90s"), 90_000);
  const opening = openBrowser(record.browserOptions).then(async instance => {
    if (record.stopReason) { await instance.close(); throw new Error("browser opened after stop"); }
    return instance;
  });
  browser = await Promise.race([opening, stopped]);
  record.browserVersion = browser.version();
  const pair = (async () => {
    record.arms.push(await runArm("native"));
    record.arms.push(await runArm("react"));
    assert.equal(record.arms[0].output.output, record.arms[1].output.output, "defined outputs differ");
    assert.equal(record.arms[0].output.outputSha256, record.arms[1].output.outputSha256, "output digests differ");
    if (phase === "measured") record.comparison = {
      nativeSettlementToMutationObserverMs: record.arms[0].output.settlementToMutationObserverMs,
      reactSettlementToMutationObserverMs: record.arms[1].output.settlementToMutationObserverMs,
      observerDelayIncluded: true, paintExcluded: true, fixedOrder: ["native", "react"] };
    assert.deepEqual(record.errors, [], "browser cleanup errors");
  })();
  await Promise.race([pair, stopped]);
  record.status = phase === "behavior" ? "PASS_UNTIMED_BEHAVIOR" : "PASS_ONE_DESCRIPTIVE_PAIR";
} catch (error) {
  failed = true;
  record.status = "FAIL_OR_INCOMPLETE";
  record.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
} finally {
  clearTimeout(deadline); process.off("SIGINT", onInt); process.off("SIGTERM", onTerm);
  if (browser) try { await browser.close(); record.cleanup.browserClosed = true; }
  catch (error) { failed = true; record.status = "FAIL_OR_INCOMPLETE"; record.errors.push(`browser close: ${String(error)}`); }
  try {
    await verifyInputs("sourceAfter");
    assert.equal(await hashFile(buildPath), sha(buildBytes));
    assert.equal(await hashFile(lockPath), sha(lockBytes));
    if (authorizationBytes) assert.equal(await hashFile(authorizationPath), sha(authorizationBytes));
    if (behaviorBytes) assert.equal(await hashFile(behaviorPath), sha(behaviorBytes));
  } catch (error) {
    failed = true; record.status = "FAIL_OR_INCOMPLETE";
    record.errors.push(`final integrity: ${error instanceof Error ? error.stack ?? String(error) : String(error)}`);
  }
  if (record.errors.length) { failed = true; record.status = "FAIL_OR_INCOMPLETE"; }
  await writeFile(receiptPath, JSON.stringify(record, null, 2) + "\n");
}
if (failed) { console.error(record.errors.join("\n")); process.exitCode = record.stopReason === "SIGINT" ? 130 : record.stopReason === "SIGTERM" ? 143 : 1; }
else console.log(JSON.stringify({ status: record.status, receiptPath }));
