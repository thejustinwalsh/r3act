import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, "../..");
const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
assert.ok(args.includes("--proof-dir") && args.includes("--phase"),
  "usage: node verify-browser.mjs --proof-dir DIR --phase proof|measure");
const proof = path.resolve(root, option("--proof-dir"));
const phase = option("--phase");
assert.ok(proof.startsWith(`${unit}${path.sep}`));
assert.ok(["proof", "measure"].includes(phase));
assert.equal(process.version, "v24.18.0");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = async file => sha(await readFile(file));
const buildBytes = await readFile(path.join(proof, "build-proof.json"));
const build = JSON.parse(buildBytes);
assert.equal(build.status, "PASS_INSTALLED_BUILD_PROOF");
const pairBytes = await readFile(path.join(proof, "pair-proof.json"));
const pair = JSON.parse(pairBytes);
assert.equal(pair.status, "PASS_UNTIMED_PRODUCTION_PAIR");
assert.equal(pair.buildProofSha256, sha(buildBytes));
const consumer = build.consumer;
assert.equal(path.dirname(consumer), await realpath(tmpdir()));
assert.ok(path.basename(consumer).startsWith("r3act-numeric-owner-"));
const lock = JSON.parse(await readFile(path.join(proof, "input-lock.json"), "utf8"));
const receiptPath = path.join(proof, phase === "proof" ? "browser-untimed.json" : "browser-one-pair.json");
const origin = "https://numeric-owner-proof.invalid";
const assets = new Map();
for (const mode of ["native", "react"]) {
  for (const item of pair.assets[mode]) {
    assert.match(item.path, /^(?:index\.html|assets\/[A-Za-z0-9._-]+\.(?:js|css))$/);
    const routePath = `/${mode}/${item.path}`;
    assert.ok(!assets.has(routePath));
    assets.set(routePath, { ...item, file: path.join(proof, "comparison-proof", "dist", mode, item.path) });
  }
  assert.ok(assets.has(`/${mode}/index.html`));
}
const result = { phase, status: "STARTED", buildProofSha256: sha(buildBytes),
  pairProofSha256: sha(pairBytes), browserVersion: null,
  inputBefore: [], inputAfter: [], assetBefore: [], assetAfter: [], served: [],
  stages: [], episodes: [], events: [], errors: [], stopReason: null, activePhase: null,
  contextClosed: false, browserClosed: false };
await writeFile(receiptPath, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
const verify = async field => {
  assert.equal(lock.packageReport.sourcePath,
    path.join(root, ".cache/r3act-package-build/report.json"));
  assert.equal(lock.packageReport.path, path.join(proof, "inputs", "package-report.json"));
  const reportBytes = await readFile(lock.packageReport.path);
  assert.equal(sha(reportBytes), lock.packageReport.sha256);
  assert.equal(await hash(lock.packageReport.sourcePath), lock.packageReport.sha256);
  assert.equal(await hash(lock.baseline.sourcePath), lock.baseline.sha256);
  assert.equal(await hash(lock.baseline.path), lock.baseline.sha256);
  assert.equal(await hash(path.join(unit, "baseline/provenance.json")), lock.baseline.manifestSha256);
  assert.equal(await hash(lock.baseline.manifestPath), lock.baseline.manifestSha256);
  assert.equal(await hash(lock.baseline.reportSourcePath), lock.baseline.reportSha256);
  assert.equal(await hash(lock.baseline.reportPath), lock.baseline.reportSha256);
  const report = JSON.parse(reportBytes);
  for (const [relative, expected] of Object.entries(report.sourceHashes ?? {}))
    assert.equal(await hash(path.join(root, relative)), expected,
      `changed package source: ${relative}`);
  for (const item of lock.source) {
    const current = await hash(path.join(unit, item.relative));
    const archived = await hash(path.join(proof, "inputs", "source", item.relative));
    assert.equal(current, item.sha256);
    assert.equal(archived, item.sha256);
    if (item.relative.startsWith("consumer/") && item.relative !== "consumer/package.json") assert.equal(
      await hash(path.join(consumer, item.relative.slice("consumer/".length))), item.sha256);
    result[field].push({ path: item.relative, sha256: current });
  }
  for (const item of lock.externalSource) {
    assert.equal(await hash(path.join(root, item.relative)), item.sha256);
    assert.equal(await hash(item.path), item.sha256);
    result[field].push({ path: item.relative, sha256: item.sha256 });
  }
  for (const item of lock.tarballs) assert.equal(await hash(item.path), item.sha256);
  for (const item of lock.installed) {
    assert.equal(await hash(item.path), item.sha256);
    if (item.installedPath) assert.equal(await hash(item.installedPath), item.sha256);
  }
  assert.equal(await hash(lock.compiler.path), lock.compiler.sha256);
  assert.equal(await hash(lock.compiler.installedPath), lock.compiler.sha256);
  for (const item of build.transforms) assert.equal(await hash(item.path), item.sha256);
  for (const item of build.assets) assert.equal(await hash(item.path), item.sha256);
};
const verifyAssets = async field => {
  for (const [routePath, item] of assets) {
    const bytes = await readFile(item.file);
    assert.equal(bytes.length, item.bytes);
    assert.equal(sha(bytes), item.sha256);
    result[field].push({ routePath, sha256: item.sha256, bytes: item.bytes });
  }
};
const snapshot = page => page.evaluate(() => window.numericOwnerProof?.snapshot());
const wait = (page, predicate) => page.waitForFunction(predicate, null, { timeout: 12_000 });
const closeWithin = async (close, label) => {
  let timer;
  try {
    await Promise.race([close(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out`)), 5_000);
    })]);
  } finally { clearTimeout(timer); }
};
const observeEpisode = page => page.evaluate(() => new Promise((resolve, reject) => {
  const target = document.querySelector("[data-hot]");
  if (!(target instanceof HTMLElement)) { reject(new Error("missing safe authored owner")); return; }
  const button = document.querySelector('[data-action="hot"]');
  if (!(button instanceof HTMLElement)) { reject(new Error("missing safe update button")); return; }
  const started = performance.now();
  const observer = new MutationObserver(() => {
    if (target.getAttribute("data-hot") !== "2") return;
    const elapsedMs = performance.now() - started;
    observer.disconnect();
    clearTimeout(deadline);
    resolve(elapsedMs);
  });
  const deadline = setTimeout(() => { observer.disconnect(); reject(new Error("safe-owner episode timed out")); }, 10_000);
  observer.observe(target, { attributes: true, attributeFilter: ["data-hot"] });
  button.click();
}));

let browser, context, rejectStop, deadline, activePage;
const mark = (mode, stage) => { result.activePhase = { mode, stage }; };
const checkpoint = async (page, mode, stage) => {
  mark(mode, stage);
  const state = await snapshot(page);
  result.stages.push({ mode, stage, snapshot: state });
  return state;
};
const stopped = new Promise((_, reject) => { rejectStop = reject; });
const stop = reason => {
  if (result.stopReason) return;
  result.stopReason = reason;
  rejectStop(new Error(`stopped: ${reason}`));
  void browser?.close().catch(() => {});
};
const interrupt = () => stop("signal");
process.once("SIGINT", interrupt);
process.once("SIGTERM", interrupt);
let mainError;
try {
  if (phase === "measure") {
    const untimedBytes = await readFile(path.join(proof, "browser-untimed.json"));
    const untimed = JSON.parse(untimedBytes);
    assert.equal(untimed.status, "PASS_UNTIMED_BROWSER");
    const authorization = JSON.parse(await readFile(path.join(proof, "run-authorization.json"), "utf8"));
    assert.equal(authorization.status, "APPROVED_FOR_ONE_RUNTIME_PAIR");
    assert.equal(authorization.buildProofSha256, sha(buildBytes));
    assert.equal(authorization.pairProofSha256, sha(pairBytes));
    assert.equal(authorization.browserUntimedSha256, sha(untimedBytes));
    result.authorization = authorization;
  }
  await verify("inputBefore");
  await verifyAssets("assetBefore");
  deadline = setTimeout(() => stop("deadline-90s"), 90_000);
  const opening = openBrowser({ headless: true, gpu: false, handleSignals: false }).then(async instance => {
    if (result.stopReason) { await instance.close(); throw new Error("browser opened after deadline"); }
    return instance;
  });
  browser = await Promise.race([opening, stopped]);
  result.browserVersion = browser.version();
  context = await Promise.race([browser.newContext({ viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 1 }), stopped]);
  await context.route("**/*", async route => {
    const requestUrl = new URL(route.request().url());
    const item = requestUrl.origin === origin && !requestUrl.search ? assets.get(requestUrl.pathname) : null;
    if (!item) {
      result.errors.push({ kind: "unlisted-request", url: requestUrl.href });
      try { await route.fulfill({ status: 404, body: "Unlisted asset" }); }
      catch { try { await route.abort("failed"); } catch {} }
      return;
    }
    let bytes;
    try {
      bytes = await readFile(item.file);
      assert.equal(bytes.length, item.bytes);
      assert.equal(sha(bytes), item.sha256);
      await route.fulfill({ status: 200, body: bytes,
        contentType: item.path.endsWith(".html") ? "text/html; charset=utf-8" :
          item.path.endsWith(".css") ? "text/css; charset=utf-8" :
            "text/javascript; charset=utf-8" });
      result.served.push({ path: requestUrl.pathname, sha256: item.sha256 });
    } catch (error) {
      result.errors.push({ kind: "asset-route", url: requestUrl.href, message: String(error) });
      try { await route.abort("failed"); } catch {}
    }
  });
  for (const mode of ["native", "react"]) {
    mark(mode, "new-page");
    const page = await Promise.race([context.newPage(), stopped]);
    activePage = page;
    page.on("pageerror", error => result.errors.push({ kind: `${mode}-pageerror`, message: String(error) }));
    page.on("console", message => {
      if (message.type() === "error") result.errors.push({ kind: `${mode}-console`,
        message: message.text(), location: message.location() });
    });
    page.on("response", response => {
      if (response.status() >= 400) result.errors.push({ kind: `${mode}-response`,
        status: response.status(), url: response.url() });
    });
    mark(mode, "navigation");
    const response = await Promise.race([page.goto(`${origin}/${mode}/index.html`,
      { waitUntil: "networkidle", timeout: 15_000 }), stopped]);
    assert.equal(response?.status(), 200);
    mark(mode, "initial-wait");
    await wait(page, () => window.numericOwnerProof?.snapshot()?.hot === "1");
    const initial = await checkpoint(page, mode, "initial");
    assert.equal(initial.opaqueN, "1");
    assert.equal(initial.opaqueValue, "A");
    assert.equal(initial.hot, "1");
    assert.equal(initial.opaqueRetained, true);
    assert.equal(initial.hotRetained, true);
    assert.equal(initial.sceneStatus, "pending");
    assert.equal(initial.sceneName, "waiting");
    assert.equal(initial.sceneFallbackRetained, true);
    assert.equal(initial.opaqueMounts, 1);
    assert.equal(initial.hotMounts, 1);
    let elapsedMs = null;
    mark(mode, "safe-update-dispatch");
    if (phase === "measure") {
      elapsedMs = await Promise.race([observeEpisode(page), stopped]);
      assert.ok(Number.isFinite(elapsedMs) && elapsedMs >= 0);
    } else await page.evaluate(() => document.querySelector('[data-action="hot"]')?.click());
    mark(mode, "safe-update-wait");
    await wait(page, () => window.numericOwnerProof?.snapshot()?.hot === "2");
    const hotUpdated = await checkpoint(page, mode, "safe-updated");
    assert.equal(hotUpdated.hotRetained, true);
    assert.equal(hotUpdated.opaqueN, "1");
    assert.equal(hotUpdated.opaqueValue, "A");
    assert.equal(hotUpdated.opaqueCalls, initial.opaqueCalls);
    assert.equal(hotUpdated.getterCalls, initial.getterCalls);
    assert.equal(hotUpdated.hotMounts, 1);
    assert.equal(hotUpdated.hotCleanups, 0);
    assert.equal(hotUpdated.sceneStatus, "pending");
    assert.equal(hotUpdated.sceneName, "waiting");
    assert.equal(hotUpdated.sceneFallbackRetained, true);
    result.episodes.push({ mode, elapsedMs, initial, hotUpdated });
    if (phase === "proof") {
      mark(mode, "opaque-update-dispatch");
      await page.evaluate(() => document.querySelector('[data-action="opaque"]')?.click());
      await checkpoint(page, mode, "opaque-dispatched");
      mark(mode, "opaque-update-wait");
      await wait(page, () => {
        const state = window.numericOwnerProof?.snapshot();
        return state?.opaqueN === "2" && state.opaqueValue === "B";
      });
      const opaqueUpdated = await checkpoint(page, mode, "opaque-updated");
      assert.equal(opaqueUpdated.opaqueRetained, true);
      assert.equal(opaqueUpdated.opaqueCalls, initial.opaqueCalls + 1);
      assert.equal(opaqueUpdated.getterCalls, initial.getterCalls + 1);
      assert.equal(opaqueUpdated.opaqueMounts, 1);
      assert.equal(opaqueUpdated.opaqueCleanups, 0);
      assert.equal(opaqueUpdated.hot, "2");
      assert.equal(opaqueUpdated.sceneStatus, "pending");
      assert.equal(opaqueUpdated.sceneName, "waiting");
      mark(mode, "scene-resolution-dispatch");
      await page.evaluate(() => window.numericOwnerProof.resolveScene(4));
      mark(mode, "scene-reveal-wait");
      await wait(page, () => JSON.stringify(window.numericOwnerProof?.snapshot()?.scenePosition) === "[4,0,0]");
      const final = await checkpoint(page, mode, "scene-revealed");
      assert.equal(final.opaqueN, "2");
      assert.equal(final.opaqueValue, "B");
      assert.equal(final.hot, "2");
      assert.equal(final.sceneStatus, "fulfilled");
      assert.equal(final.sceneName, "");
      assert.deepEqual(final.scenePosition, [4, 0, 0]);
      assert.equal(final.sceneFallbackRetained, mode === "native");
      result.stages.push({ mode, initial, hotUpdated, opaqueUpdated, final });
    }
    mark(mode, "dispose-dispatch");
    await page.evaluate(() => window.numericOwnerProof.dispose());
    mark(mode, "dispose-wait");
    await wait(page, () => {
      const state = window.numericOwnerProof?.snapshot();
      return state?.disposed && state.opaqueMounts === state.opaqueCleanups &&
        state.hotMounts === state.hotCleanups;
    });
    const disposed = await checkpoint(page, mode, "disposed");
    assert.equal(disposed.opaqueMounts, disposed.opaqueCleanups);
    assert.equal(disposed.hotMounts, disposed.hotCleanups);
    if (mode === "native") {
      assert.equal(disposed.dom.ownerCount, 0);
      assert.equal(disposed.three.ownerCount, 0);
      assert.equal(disposed.threeHost.liveHandles, 0);
      assert.equal(disposed.threeHost.liveResources, 0);
    }
    result.stages.push({ mode, disposed });
    mark(mode, "page-close");
    await page.close();
    activePage = undefined;
  }
  mark("both", "final-integrity");
  assert.deepEqual(result.errors, []);
  await verify("inputAfter");
  await verifyAssets("assetAfter");
  assert.deepEqual(result.inputAfter, result.inputBefore);
  assert.deepEqual(result.assetAfter, result.assetBefore);
  assert.ok(result.served.some(item => item.path === "/native/index.html"));
  assert.ok(result.served.some(item => item.path === "/react/index.html"));
} catch (error) {
  mainError = error;
  result.errors.push({ kind: "verifier", phase: result.activePhase,
    message: error instanceof Error ? error.stack ?? String(error) : String(error) });
  if (activePage) {
    try {
      let failedState;
      await closeWithin(async () => {
        failedState = await snapshot(activePage);
      }, "failure snapshot");
      result.stages.push({ kind: "failure-snapshot", phase: result.activePhase,
        snapshot: failedState });
    } catch (snapshotError) {
      result.stages.push({ kind: "failure-snapshot-error", phase: result.activePhase,
        message: String(snapshotError) });
    }
  }
} finally {
  if (context) {
    try { await closeWithin(() => context.close(), "context close");
      result.contextClosed = true; }
    catch (error) { result.errors.push({ kind: "context-close", message: String(error) }); }
  }
  if (browser) {
    try { await closeWithin(() => browser.close(), "browser close");
      result.browserClosed = true; }
    catch (error) { result.errors.push({ kind: "browser-close", message: String(error) }); }
  }
  if (deadline) clearTimeout(deadline);
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", interrupt);
  result.status = !mainError && !result.stopReason && result.errors.length === 0 &&
    result.contextClosed && result.browserClosed ?
    phase === "proof" ? "PASS_UNTIMED_BROWSER" : "PASS_ONE_RUNTIME_PAIR" : "FAIL_OR_INCOMPLETE";
  await writeFile(receiptPath, JSON.stringify(result, null, 2) + "\n");
}
if (result.status === "FAIL_OR_INCOMPLETE") {
  console.error(result.errors.map(item => item.message ?? JSON.stringify(item)).join("\n"));
  process.exitCode = 1;
} else console.log(JSON.stringify({ status: result.status, receiptPath }));
