import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";

const root = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const stage = path.dirname(fileURLToPath(import.meta.url));
assert.equal(process.version, "v24.18.0");
const args = process.argv.slice(2);
const value = (flag) => { const index = args.indexOf(flag); return index < 0 ? null : args[index + 1] ?? null; };
const kind = value("--kind"), origin = value("--origin");
assert.ok(kind === "timing" || kind === "heap", "--kind timing|heap required");
assert.ok(origin, "--origin https://NAME.localhost required");
const address = new URL(origin);
assert.equal(address.protocol, "https:");
assert.ok(address.hostname.endsWith(".localhost") && address.origin === origin);
const proofDir = path.resolve(value("--proof-dir") ?? "");
assert.equal(path.dirname(proofDir), stage);
assert.match(path.basename(proofDir), /^proof-v[1-9]\d*$/);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (file) => sha(await readFile(file));
const proofPath = path.join(proofDir, "build-proof.json");
const sourcePath = path.join(proofDir, "source-lock.json");
const authorizationPath = path.join(proofDir, `${kind}-authorization.json`);
const outputPath = path.join(proofDir, `${kind}-pair-one-shot.json`);
const proofBytes = await readFile(proofPath), sourceBytes = await readFile(sourcePath), authBytes = await readFile(authorizationPath);
const proof = JSON.parse(proofBytes), lock = JSON.parse(sourceBytes), authorization = JSON.parse(authBytes);
assert.equal(proof.status, "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW");
assert.equal(proof.sourceLockSha256, sha(sourceBytes));
assert.equal(authorization.status, `APPROVED_FOR_ONE_AUTHORED_LIFECYCLE_${kind.toUpperCase()}_PAIR`);
assert.equal(authorization.buildProofSha256, sha(proofBytes));
assert.equal(authorization.sourceLockSha256, sha(sourceBytes));
assert.equal(authorization.kind, kind);
assert.ok(proof.assets.length && proof.transformed.length === 2);
assert.ok(Object.values(proof.assertions).every(Boolean));
if (kind === "heap") {
  const timingBytes = await readFile(path.join(proofDir, "timing-pair-one-shot.json"));
  assert.equal(JSON.parse(timingBytes).status, "PASS_DESCRIPTIVE_TIMING_PAIR");
  assert.equal(authorization.timingPairSha256, sha(timingBytes), "heap authorization must bind completed timing pair");
}
const manifest = new Map(proof.assets.map((asset) => [asset.urlPath, asset]));
const htmlPath = [...manifest.keys()].find((name) => name.endsWith(".html"));
assert.ok(htmlPath);
const record = { schemaVersion: "authored-lifecycle-pair-v1", kind, status: "STARTED", origin,
  transport: "Offline synthetic HTTPS asset replay; no server, TLS route, or live network",
  timingMeaning: kind === "timing" ? "60 synchronous update dispatch-through-commit intervals measured with page performance.now; RAF and DOM checks outside; fresh Native-first contexts; no GC/CDP. Mount+updates+array-edit+disposal subtotal excludes local click, resource waiting/reveal work and harness inspection" : null,
  heapMeaning: kind === "heap" ? "Separate fresh untimed pages; forced GC and raw CDP heap/DOM counters include engine, module, and application costs; descriptive signed deltas only" : null,
  sourceBefore: [], sourceAfter: [], servedAssets: [], blockedRequests: [], requestFailures: [], pageErrors: [], consoleErrors: [], arms: [], comparison: null,
  buildProofSha256: sha(proofBytes), sourceLockSha256: sha(sourceBytes), authorizationSha256: sha(authBytes),
  bundleBytes: { total: proof.assets.reduce((sum, item) => sum + item.bytes, 0), javascript: proof.assets.filter((item) => item.path.endsWith(".js")).reduce((sum, item) => sum + item.bytes, 0) },
  browserVersion: null, errors: [], cleanupErrors: [], stopReason: null };
await writeFile(outputPath, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
async function verify(field) {
  for (const item of lock.inputs) {
    const actual = await hashFile(path.join(root, item.path));
    record[field].push({ path: item.path, expected: item.sha256, actual, matches: actual === item.sha256 });
    assert.equal(actual, item.sha256, `${field}: source drift ${item.path}`);
  }
  for (const item of [lock.compiler, ...proof.assets, ...proof.transformed]) {
    const actual = await hashFile(path.join(root, item.path));
    record[field].push({ path: item.path, expected: item.sha256, actual, matches: actual === item.sha256 });
    assert.equal(actual, item.sha256, `${field}: artifact drift ${item.path}`);
  }
}
let browser, deadlineTimer, resolveStopped;
const stopped = new Promise((resolve) => { resolveStopped = resolve; });
const deadlineAt = Date.now() + 90_000;
function stop(reason) {
  if (record.stopReason) return;
  record.stopReason = reason;
  resolveStopped(reason);
  browser?.close().catch((error) => record.cleanupErrors.push(`stop close: ${String(error)}`));
}
const stopError = () => stopped.then((reason) => { throw new Error(`pair stopped: ${reason}`); });
const remaining = () => {
  const ms = deadlineAt - Date.now();
  if (record.stopReason || ms <= 0) throw new Error(`pair deadline: ${record.stopReason ?? "90 seconds"}`);
  return ms;
};
const onInt = () => stop("SIGINT"), onTerm = () => stop("SIGTERM");
const assertRow = (row, id, step, local) => {
  assert.deepEqual(row, { id, step: String(step), local: String(local), transform: `translateX(${(step + id) % 128}px)`,
    opacity: String(((step + id) % 10 + 1) / 10), text: `${id}:${step}:${local}` });
};
const initial = Array.from({ length: 256 }, (_, id) => id);
const edited = [...initial.slice(2), 256, 0];
function assertScene(scene, order, step, detailReady, healthReady, disposed = false) {
  assert.deepEqual(scene.rows.map((row) => row.id), disposed ? [] : order);
  for (const row of scene.rows) assertRow(row, row.id, step, row.id === 0 ? 1 : 0);
  if (!disposed) {
    assert.equal(scene.row0Retained, true);
    assert.deepEqual(scene.detail, detailReady ? { fallback: 0, ready: 1, text: "detail ready" } : { fallback: 1, ready: 0, text: "waiting" });
    assert.deepEqual(scene.health, healthReady ? { fallback: 0, ready: 1, text: "health ready" } : { fallback: 1, ready: 0, text: "waiting" });
  }
  const d = scene.diagnostics;
  assert.ok(d);
  assert.equal(d.rowSetups, order === edited ? 257 : 256);
  assert.equal(d.rowCleanups, disposed ? 257 : order === edited ? 1 : 0);
  assert.equal(d.detailFallbackSetups, 1);
  assert.equal(d.detailFallbackCleanups, detailReady || disposed ? 1 : 0);
  assert.equal(d.healthFallbackSetups, 1);
  assert.equal(d.healthFallbackCleanups, healthReady || disposed ? 1 : 0);
  assert.equal(d.disposed, disposed);
  if (disposed) {
    assert.equal(scene.remainingChildren, 0);
    assert.equal(d.storeListeners, 0);
    if (d.arm === "native") {
      assert.equal(d.storeReaders, 0); assert.equal(d.ownerCount, 0); assert.equal(d.pendingChangeCount, 0);
    }
  }
}
const summary = (samples) => {
  const sorted = [...samples].sort((a, b) => a - b);
  return { firstMs: samples[0], medianMs: sorted[Math.ceil(sorted.length * 0.5) - 1],
    p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1], sumMs: samples.reduce((a, b) => a + b, 0) };
};
async function runArm(arm) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.setDefaultTimeout(Math.min(5000, remaining()));
  page.on("pageerror", (error) => record.pageErrors.push({ arm, error: String(error) }));
  page.on("console", (message) => { if (message.type() === "error") record.consoleErrors.push({ arm, error: message.text() }); });
  page.on("requestfailed", (request) => record.requestFailures.push({ arm, url: request.url(), reason: request.failure()?.errorText ?? "unknown" }));
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || url.search || url.hash || !manifest.has(url.pathname)) {
      record.blockedRequests.push({ arm, url: url.href }); await route.abort(); return;
    }
    const asset = manifest.get(url.pathname), body = await readFile(path.join(root, asset.path));
    assert.equal(sha(body), asset.sha256);
    const type = url.pathname.endsWith(".html") ? "text/html; charset=utf-8" : url.pathname.endsWith(".js") ? "text/javascript; charset=utf-8" : url.pathname.endsWith(".css") ? "text/css; charset=utf-8" : "application/octet-stream";
    record.servedAssets.push({ arm, path: url.pathname, sha256: asset.sha256, bytes: body.length });
    await route.fulfill({ status: 200, headers: { "content-type": type, "cache-control": "no-store" }, body });
  });
  let mounted = false;
  try {
    const response = await page.goto(new URL(htmlPath, origin).href, { waitUntil: "networkidle", timeout: remaining() });
    assert.equal(response?.status(), 200);
    assert.equal(await page.evaluate(() => window.isSecureContext), true);
    assert.equal(await page.evaluate(() => Boolean(window.__authoredLifecycle)), true);
    const entry = { arm, observations: {} };
    if (kind === "timing") entry.timerQuantumMs = await page.evaluate(() => {
      let previous = performance.now(), minimum = Infinity;
      for (let index = 0; index < 2048; index++) {
        const next = performance.now();
        if (next > previous) minimum = Math.min(minimum, next - previous);
        previous = next;
      }
      return Number.isFinite(minimum) ? minimum : null;
    });
    let cdp = null;
    const sample = async (name) => {
      if (!cdp) cdp = await context.newCDPSession(page);
      await cdp.send("HeapProfiler.collectGarbage");
      const heap = await cdp.send("Runtime.getHeapUsage");
      const dom = await cdp.send("Memory.getDOMCounters");
      entry.observations[name] = { heap, dom };
    };
    if (kind === "heap") await sample("baseline");
    const mountDurationMs = await page.evaluate(({ name, measured }) => {
      if (!measured) { window.__authoredLifecycle.mount(name); return null; }
      const t = performance.now(); window.__authoredLifecycle.mount(name); return performance.now() - t;
    }, { name: arm, measured: kind === "timing" });
    mounted = true;
    if (kind === "timing") assert.ok(Number.isFinite(mountDurationMs) && mountDurationMs >= 0);
    const wait = async (predicate, label) => page.evaluate(async ({ predicate, label }) => {
      const deadline = performance.now() + 5000;
      while (true) {
        const value = window.__authoredLifecycle.inspect();
        if (predicate === "mounted" && value.rows.length === 256) return value;
        if (predicate === "click" && value.rows.find((row) => row.id === 0)?.local === "1") return value;
        if (predicate.startsWith("step:") && value.rows[0]?.step === predicate.slice(5)) return value;
        if (predicate === "edited" && value.rows.length === 256 && value.rows.at(-1)?.id === 0 && value.rows.some((row) => row.id === 256)) return value;
        if (predicate === "detail" && value.detail.ready === 1) return value;
        if (predicate === "health" && value.health.ready === 1) return value;
        if (performance.now() >= deadline) throw new Error(`${label} did not settle`);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }, { predicate, label });
    const mountedScene = await wait("mounted", "mount");
    assert.equal(mountedScene.diagnostics.arm, arm);
    if (kind === "heap") await sample("mounted");
    await page.evaluate(() => window.__authoredLifecycle.clickRow());
    assertScene(await wait("click", "row click"), initial, 0, false, false);
    const updateMs = [];
    for (let step = 1; step <= 60; step++) {
      if (kind === "timing") {
        const elapsed = await page.evaluate((nextStep) => {
          const t = performance.now();
          window.__authoredLifecycle.update(nextStep);
          const elapsed = performance.now() - t;
          const row0 = document.querySelector('[data-row="0"]');
          if (row0?.getAttribute("data-step") !== String(nextStep)) throw new Error(`update ${nextStep} did not commit synchronously`);
          return elapsed;
        }, step);
        assert.ok(Number.isFinite(elapsed) && elapsed >= 0); updateMs.push(elapsed);
      } else await page.evaluate((nextStep) => window.__authoredLifecycle.update(nextStep), step);
      const stepScene = await wait(`step:${step}`, `step ${step}`);
      assertScene(stepScene, initial, step, false, false);
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(done)));
    }
    const afterUpdates = await page.evaluate(() => window.__authoredLifecycle.inspect());
    assertScene(afterUpdates, initial, 60, false, false);
    const editDurationMs = await page.evaluate((measured) => {
      if (!measured) { window.__authoredLifecycle.edit(); return null; }
      const t = performance.now(); window.__authoredLifecycle.edit(); return performance.now() - t;
    }, kind === "timing");
    const afterEdit = await wait("edited", "keyed edit");
    assertScene(afterEdit, edited, 60, false, false);
    await page.evaluate(() => window.__authoredLifecycle.settleDetail());
    const afterDetail = await wait("detail", "detail reveal");
    assertScene(afterDetail, edited, 60, true, false);
    await page.evaluate(() => window.__authoredLifecycle.settleHealth());
    const afterHealth = await wait("health", "health reveal");
    assertScene(afterHealth, edited, 60, true, true);
    if (kind === "heap") await sample("updatedEditedRevealed");
    const disposal = await page.evaluate((retain) => {
      if (retain) return window.__authoredLifecycle.dispose({ retain });
      const t = performance.now(); const result = window.__authoredLifecycle.dispose({ retain });
      return { ...result, durationMs: performance.now() - t };
    }, kind === "heap");
    mounted = false;
    if (kind === "timing") assert.ok(Number.isFinite(disposal.durationMs) && disposal.durationMs >= 0);
    const postDispose = await page.evaluate(() => window.__authoredLifecycle.inspect());
    assertScene(postDispose, edited, 60, true, true, true);
    assert.equal(disposal.remainingChildren, 0);
    if (kind === "heap") await sample("disposedControllerRetained");
    await page.evaluate(() => window.__authoredLifecycle.release());
    if (kind === "heap") await sample("releasedController");
    if (kind === "timing") {
      entry.mountDurationMs = mountDurationMs;
      entry.editDurationMs = editDurationMs;
      entry.disposeDurationMs = disposal.durationMs;
    }
    entry.finalScene = afterHealth;
    entry.disposal = disposal;
    entry.postDispose = postDispose;
    if (kind === "timing") {
      entry.updateMs = updateMs;
      entry.stats = { ...summary(updateMs), measuredLifecycleSubtotalMs: mountDurationMs + updateMs.reduce((a, b) => a + b, 0) + editDurationMs + disposal.durationMs };
    } else {
      const base = entry.observations.baseline;
      entry.signedDeltasFromBaseline = Object.fromEntries(Object.entries(entry.observations).map(([name, data]) => [name, {
        usedSize: data.heap.usedSize - base.heap.usedSize,
        totalSize: data.heap.totalSize - base.heap.totalSize,
        documents: data.dom.documents - base.dom.documents,
        nodes: data.dom.nodes - base.dom.nodes,
        jsEventListeners: data.dom.jsEventListeners - base.dom.jsEventListeners,
      }]));
    }
    assert.deepEqual(record.pageErrors.filter((item) => item.arm === arm), []);
    assert.deepEqual(record.consoleErrors.filter((item) => item.arm === arm), []);
    assert.deepEqual(record.blockedRequests.filter((item) => item.arm === arm), []);
    assert.deepEqual(record.requestFailures.filter((item) => item.arm === arm), []);
    for (const asset of proof.assets.filter((item) => /\.(html|js|css)$/.test(item.path))) {
      assert.equal(record.servedAssets.filter((item) => item.arm === arm && item.path === asset.urlPath).length, 1);
    }
    if (cdp) await cdp.detach();
    return entry;
  } catch (error) {
    if (mounted) {
      try { await page.evaluate(() => { window.__authoredLifecycle.dispose({ retain: false }); window.__authoredLifecycle.release(); }); }
      catch (cleanupError) { record.cleanupErrors.push({ arm, error: String(cleanupError) }); }
    }
    throw error;
  } finally {
    try { await context.close(); } catch (error) { record.cleanupErrors.push({ arm, error: String(error) }); }
  }
}
let failure = null;
try {
  await verify("sourceBefore");
  process.on("SIGINT", onInt); process.on("SIGTERM", onTerm);
  deadlineTimer = setTimeout(() => stop("deadline-90s"), 90_000);
  const opening = openBrowser({ headless: true, gpu: false, handleSignals: false }).then(async (instance) => {
    if (record.stopReason) { await instance.close(); throw new Error("stopped during browser launch"); }
    return instance;
  });
  browser = await Promise.race([opening, stopError()]);
  record.browserVersion = browser.version();
  const work = (async () => {
    record.arms.push(await runArm("native"));
    record.arms.push(await runArm("react"));
    assert.deepEqual(record.arms[0].finalScene.rows, record.arms[1].finalScene.rows);
    assert.deepEqual(record.arms[0].finalScene.detail, record.arms[1].finalScene.detail);
    assert.deepEqual(record.arms[0].finalScene.health, record.arms[1].finalScene.health);
    record.comparison = kind === "timing" ? {
      native: record.arms[0].stats, react: record.arms[1].stats,
      nativeMinusReactMeasuredSubtotalMs: record.arms[0].stats.measuredLifecycleSubtotalMs - record.arms[1].stats.measuredLifecycleSubtotalMs,
      status: "ONE_FIXED_ORDER_DESCRIPTIVE_TIMING_PAIR",
    } : { status: "SEPARATE_UNTIMED_FORCED_GC_HEAP_PAIR" };
    await verify("sourceAfter");
    assert.equal(await hashFile(proofPath), sha(proofBytes));
    assert.equal(await hashFile(sourcePath), sha(sourceBytes));
    assert.equal(await hashFile(authorizationPath), sha(authBytes));
    record.status = kind === "timing" ? "PASS_DESCRIPTIVE_TIMING_PAIR" : "PASS_DESCRIPTIVE_HEAP_PAIR";
  })();
  await Promise.race([work, stopError()]);
} catch (error) { failure = error; record.status = "INCOMPLETE"; record.errors.push(String(error)); }
finally {
  clearTimeout(deadlineTimer); process.off("SIGINT", onInt); process.off("SIGTERM", onTerm);
  if (browser) { try { await browser.close(); } catch (error) { record.cleanupErrors.push(String(error)); } }
  await writeFile(outputPath, JSON.stringify(record, null, 2) + "\n");
}
if (failure) { console.error(String(failure)); process.exitCode = record.stopReason === "SIGINT" ? 130 : record.stopReason === "SIGTERM" ? 143 : 1; }
else console.log(JSON.stringify({ status: record.status, outputPath }));
