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
assert.ok(path.basename(consumer).startsWith("r3act-held-reader-"));
const lock = JSON.parse(await readFile(path.join(proof, "input-lock.json"), "utf8"));
const receiptPath = path.join(proof, phase === "proof" ? "browser-untimed.json" : "browser-one-pair.json");
const origin = "https://held-reader-proof.invalid";
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
  stages: [], episodes: [], events: [], errors: [], stopReason: null,
  contextClosed: false, browserClosed: false };
await writeFile(receiptPath, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
const verify = async field => {
  for (const item of lock.source) {
    const current = await hash(path.join(unit, item.relative));
    const archived = await hash(path.join(proof, "inputs", "source", item.relative));
    assert.equal(current, item.sha256);
    assert.equal(archived, item.sha256);
    if (item.relative.startsWith("consumer/") && item.relative !== "consumer/package.json") assert.equal(
      await hash(path.join(consumer, item.relative.slice("consumer/".length))), item.sha256);
    result[field].push({ path: item.relative, sha256: current });
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
const snapshot = page => page.evaluate(() => window.heldReaderProof?.snapshot());
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
  const target = document.getElementById("dialog-portal");
  if (!target) { reject(new Error("missing dialog portal")); return; }
  const button = document.querySelector('[data-action="open"]');
  if (!(button instanceof HTMLElement)) { reject(new Error("missing open button")); return; }
  const started = performance.now();
  const observer = new MutationObserver(() => {
    if (!target.querySelector('[role="dialog"]')) return;
    const elapsedMs = performance.now() - started;
    observer.disconnect();
    clearTimeout(deadline);
    resolve(elapsedMs);
  });
  const deadline = setTimeout(() => { observer.disconnect(); reject(new Error("dialog episode timed out")); }, 10_000);
  observer.observe(target, { subtree: true, childList: true, attributes: true });
  button.click();
}));

let browser, context, rejectStop, deadline;
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
    const page = await Promise.race([context.newPage(), stopped]);
    page.on("pageerror", error => result.errors.push({ kind: `${mode}-pageerror`, message: String(error) }));
    page.on("console", message => {
      if (message.type() === "error") result.errors.push({ kind: `${mode}-console`,
        message: message.text(), location: message.location() });
    });
    page.on("response", response => {
      if (response.status() >= 400) result.errors.push({ kind: `${mode}-response`,
        status: response.status(), url: response.url() });
    });
    const response = await Promise.race([page.goto(`${origin}/${mode}/index.html`,
      { waitUntil: "networkidle", timeout: 15_000 }), stopped]);
    assert.equal(response?.status(), 200);
    await wait(page, () => window.heldReaderProof?.snapshot()?.groupStatus === "pending");
    const initial = await snapshot(page);
    assert.equal(initial.held, "waiting");
    assert.equal(initial.fallbackRetained, true);
    if (mode === "native") {
      assert.equal(initial.threeFallbackRetained, true);
      assert.equal(initial.groupCallbacks, 0);
      assert.equal(initial.heldDomProjection, 1);
      assert.equal(initial.heldThreeProjection, 1);
    }
    let elapsedMs = null;
    if (phase === "measure") {
      elapsedMs = await Promise.race([observeEpisode(page), stopped]);
      assert.ok(Number.isFinite(elapsedMs) && elapsedMs >= 0);
    } else await page.evaluate(() => document.querySelector('[data-action="open"]')?.click());
    await wait(page, () => {
      const state = window.heldReaderProof?.snapshot();
      return state?.open === "true" && state.dialogPresent &&
        state.reactMounts === state.reactCleanups + 1;
    });
    const opened = await snapshot(page);
    assert.equal(opened.groupStatus, "pending");
    assert.equal(opened.fallbackRetained, true);
    assert.equal(opened.threePosition, null);
    if (mode === "native") {
      assert.equal(opened.threeFallbackRetained, true);
      assert.equal(opened.groupCallbacks, 0);
      assert.equal(opened.heldDomProjection, 1);
      assert.equal(opened.heldThreeProjection, 1);
    }
    result.episodes.push({ mode, elapsedMs, initial, opened });
    if (phase === "proof") {
      await page.evaluate(() => document.querySelector('[data-action="local"]')?.click());
      await wait(page, () => window.heldReaderProof?.snapshot()?.local === "1");
      await page.evaluate(() => window.heldReaderProof.setHeldA(7, 8));
      await page.evaluate(() => document.querySelector('[data-action="close"]')?.click());
      await wait(page, () => window.heldReaderProof?.snapshot()?.open === null &&
        !window.heldReaderProof.snapshot().dialogPresent);
      const closed = await snapshot(page);
      assert.equal(closed.groupStatus, "pending");
      assert.equal(closed.fallbackRetained, true);
      assert.equal(closed.local, "1");
      if (mode === "native") {
        assert.equal(closed.heldPendingValue, 7);
        assert.equal(closed.heldDomProjection, 7);
        assert.equal(closed.heldThreeProjection, 7);
      }
      await page.evaluate(() => window.heldReaderProof.resolveDetail());
      await wait(page, () => {
        const state = window.heldReaderProof?.snapshot();
        return state?.detailStatus === "fulfilled" && state.signalStatus === "pending" &&
          state.groupStatus === "pending";
      });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve(null))));
      const oneReady = await snapshot(page);
      assert.equal(oneReady.fallbackRetained, true);
      assert.equal(oneReady.threePosition, null);
      await page.evaluate(() => window.heldReaderProof.resolveSignal());
      await wait(page, () => window.heldReaderProof?.snapshot()?.groupStatus === "committed");
      const final = await snapshot(page);
      assert.equal(final.held, "11");
      assert.equal(final.acceptedA, "7");
      assert.deepEqual(final.threePosition, [7, 2, 11]);
      assert.equal(final.local, "1");
      if (mode === "native") {
        assert.equal(final.groupCallbacks, 1);
        assert.equal(final.heldDomProjection, 7);
        assert.equal(final.heldThreeProjection, 7);
      }
      result.stages.push({ mode, initial, opened, closed, oneReady, final });
    }
    await page.evaluate(() => window.heldReaderProof.dispose());
    await wait(page, () => {
      const state = window.heldReaderProof?.snapshot();
      return state?.disposed && state.reactMounts === state.reactCleanups;
    });
    const disposed = await snapshot(page);
    assert.equal(disposed.reactMounts, disposed.reactCleanups);
    if (mode === "native") {
      assert.equal(disposed.dom.ownerCount, 0);
      assert.equal(disposed.three.ownerCount, 0);
      assert.equal(disposed.threeHost.liveHandles, 0);
      assert.equal(disposed.threeHost.liveResources, 0);
    }
    result.stages.push({ mode, disposed });
    await page.close();
  }
  assert.deepEqual(result.errors, []);
  await verify("inputAfter");
  await verifyAssets("assetAfter");
  assert.deepEqual(result.inputAfter, result.inputBefore);
  assert.deepEqual(result.assetAfter, result.assetBefore);
  assert.ok(result.served.some(item => item.path === "/native/index.html"));
  assert.ok(result.served.some(item => item.path === "/react/index.html"));
} catch (error) {
  mainError = error;
  result.errors.push({ kind: "verifier", message: error instanceof Error ? error.stack ?? String(error) : String(error) });
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
