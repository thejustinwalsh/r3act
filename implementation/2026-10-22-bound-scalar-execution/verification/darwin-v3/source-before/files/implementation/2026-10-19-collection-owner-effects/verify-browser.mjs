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
assert.ok(path.basename(consumer).startsWith("r3act-collection-owner-"));
const lock = JSON.parse(await readFile(path.join(proof, "input-lock.json"), "utf8"));
const receiptPath = path.join(proof, phase === "proof" ? "browser-untimed.json" : "browser-one-pair.json");
const origin = "https://collection-owner-proof.invalid";
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
const snapshot = page => page.evaluate(() => window.collectionOwnerProof?.snapshot());
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
  const target = document.querySelector('[data-list="safe"]');
  const button = document.querySelector('[data-action="safe"]');
  if (!(target instanceof HTMLElement) || !(button instanceof HTMLElement)) {
    reject(new Error("missing safe authored collection")); return;
  }
  const started = performance.now();
  const observer = new MutationObserver(() => {
    const order = Array.from(target.querySelectorAll("[data-row]"))
      .map(node => node.getAttribute("data-row"));
    if (JSON.stringify(order) !== '["q","p"]') return;
    const elapsedMs = performance.now() - started;
    observer.disconnect(); clearTimeout(deadline); resolve(elapsedMs);
  });
  const deadline = setTimeout(() => { observer.disconnect();
    reject(new Error("safe collection episode timed out")); }, 10_000);
  observer.observe(target, { childList: true, subtree: true });
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
    await wait(page, () => window.collectionOwnerProof?.snapshot()?.safeOrder?.length === 2);
    const initial = await checkpoint(page, mode, "initial");
    assert.deepEqual(initial.opaqueOrder, ["a", "b", "c"]);
    assert.deepEqual(initial.safeOrder, ["p", "q"]);
    assert.equal(initial.opaque, "A");
    assert.equal(initial.rowBCount, "0");
    assert.equal(initial.sceneStatus, "pending");
    assert.equal(initial.sceneName, "waiting");
    assert.equal(initial.sceneFallbackRetained, true);
    let elapsedMs = null;
    mark(mode, "safe-move-dispatch");
    if (phase === "measure") elapsedMs = await Promise.race([observeEpisode(page), stopped]);
    else await page.evaluate(() => document.querySelector('[data-action="safe"]')?.click());
    await wait(page, () => JSON.stringify(window.collectionOwnerProof?.snapshot()?.safeOrder) === '["q","p"]');
    const safeMoved = await checkpoint(page, mode, "safe-moved");
    assert.deepEqual(safeMoved.opaqueOrder, ["a", "b", "c"]);
    assert.equal(safeMoved.opaque, "A");
    assert.equal(safeMoved.opaqueCalls, initial.opaqueCalls);
    assert.equal(safeMoved.getterCalls, initial.getterCalls);
    for (const id of ["a", "b", "c", "p", "q"]) assert.equal(safeMoved.retained[id], true);
    assert.equal(safeMoved.sceneName, "waiting");
    result.episodes.push({ mode, elapsedMs, initial, safeMoved });
    if (phase === "proof") {
      mark(mode, "row-state-dispatch");
      await page.evaluate(() => document.querySelector('[data-action="row"]')?.click());
      await wait(page, () => window.collectionOwnerProof?.snapshot()?.rowBCount === "7");
      const rowUpdated = await checkpoint(page, mode, "row-updated");
      assert.equal(rowUpdated.retained.b, true);
      assert.deepEqual(rowUpdated.opaqueOrder, ["a", "b", "c"]);
      mark(mode, "opaque-move-dispatch");
      await page.evaluate(() => document.querySelector('[data-action="opaque"]')?.click());
      await wait(page, () => {
        const state = window.collectionOwnerProof?.snapshot();
        return state?.opaque === "B" && JSON.stringify(state.opaqueOrder) === '["c","a","b"]';
      });
      const opaqueMoved = await checkpoint(page, mode, "opaque-moved");
      assert.equal(opaqueMoved.opaqueRetained, true);
      assert.ok(opaqueMoved.opaqueCalls > initial.opaqueCalls);
      assert.ok(opaqueMoved.getterCalls > initial.getterCalls);
      assert.equal(opaqueMoved.rowBCount, "7");
      for (const id of ["a", "b", "c", "p", "q"]) assert.equal(opaqueMoved.retained[id], true);
      assert.equal(opaqueMoved.sceneName, "waiting");
      mark(mode, "structure-dispatch");
      await page.evaluate(() => document.querySelector('[data-action="structure"]')?.click());
      await wait(page, () => JSON.stringify(window.collectionOwnerProof?.snapshot()?.opaqueOrder) === '["c","d","b"]');
      const changed = await checkpoint(page, mode, "structure-changed");
      assert.equal(changed.opaque, "B");
      assert.equal(changed.rowBCount, "7");
      assert.equal(changed.rowBLabel, "Bravo");
      assert.equal(changed.retained.b, true);
      assert.equal(changed.retained.c, true);
      assert.equal(changed.mounts.d, 1);
      assert.equal(changed.cleanups.a, 1);
      assert.equal(changed.sceneName, "waiting");
      mark(mode, "scene-resolution-dispatch");
      await page.evaluate(() => window.collectionOwnerProof.resolveScene(4));
      await wait(page, () => JSON.stringify(window.collectionOwnerProof?.snapshot()?.scenePosition) === "[4,0,0]");
      const final = await checkpoint(page, mode, "scene-revealed");
      assert.deepEqual(final.opaqueOrder, ["c", "d", "b"]);
      assert.deepEqual(final.safeOrder, ["q", "p"]);
      assert.equal(final.sceneStatus, "fulfilled");
      assert.deepEqual(final.scenePosition, [4, 0, 0]);
      assert.equal(final.sceneFallbackRetained, mode === "native");
    }
    mark(mode, "dispose-dispatch");
    await page.evaluate(() => window.collectionOwnerProof.dispose());
    await wait(page, () => window.collectionOwnerProof?.snapshot()?.disposed);
    const disposed = await checkpoint(page, mode, "disposed");
    for (const [id, mounts] of Object.entries(disposed.mounts))
      assert.equal(disposed.cleanups[id], mounts, `${mode} ${id} effect leaked`);
    if (mode === "native") {
      assert.equal(disposed.dom.ownerCount, 0);
      assert.equal(disposed.three.ownerCount, 0);
      assert.equal(disposed.threeHost.liveHandles, 0);
      assert.equal(disposed.threeHost.liveResources, 0);
    }
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
