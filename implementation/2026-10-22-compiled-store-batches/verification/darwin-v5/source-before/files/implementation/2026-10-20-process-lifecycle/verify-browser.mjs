import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { openBrowser } from "vitexec/cli";

const root = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const stage = path.dirname(fileURLToPath(import.meta.url));
assert.equal(process.version, "v24.18.0");
assert.ok(process.env.SELENIUM_REMOTE_URL === undefined, "Remote Selenium configuration is unsupported");
const args = process.argv.slice(2);
const value = (flag) => { const index = args.indexOf(flag); return index < 0 ? null : args[index + 1] ?? null; };
assert.equal(args.length, 4, "usage: verify-browser.mjs --proof-dir DIR --phase proof|startup|heap|allocation");
const kind = value("--phase"), origin = "https://installed-process-lifecycle.invalid";
assert.ok(["proof", "startup", "heap", "allocation"].includes(kind), "--phase proof|startup|heap|allocation required");
const proofDir = path.resolve(value("--proof-dir") ?? "");
assert.equal(path.dirname(proofDir), stage);
assert.match(path.basename(proofDir), /^proof-v[1-9]\d*$/);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (file) => sha(await readFile(file));
const proofPath = path.join(proofDir, "build-proof.json");
const sourcePath = path.join(proofDir, "input-lock.json");
const authorizationPath = path.join(proofDir, `${kind}-authorization.json`);
const outputPath = path.join(proofDir, `${kind}-pair-one-shot.json`);
const proofBytes = await readFile(proofPath), sourceBytes = await readFile(sourcePath);
const proof = JSON.parse(proofBytes), lock = JSON.parse(sourceBytes);
assert.equal(proof.status, "PASS_INSTALLED_BUILD_PROOF");
assert.equal(lock.status, "PASS_INSTALLED_PREPARATION");
assert.equal(proof.inputLockSha256, sha(sourceBytes));
assert.equal(proof.consumer, lock.consumer);
assert.equal(path.dirname(proof.consumer), await realpath(tmpdir()));
assert.ok(path.basename(proof.consumer).startsWith("r3act-process-lifecycle-"));
assert.deepEqual(proof.entries, { native: "native.html", react: "react.html" });
assert.ok(Object.values(proof.assertions).length && Object.values(proof.assertions).every(Boolean));
assert.equal(proof.assertions.separateNativeGraph, true);
assert.equal(proof.assertions.separateReactGraph, true);
assert.deepEqual(proof.browserDependencies, lock.browserDependencies);
const modes = ["native", "react"];
const assets = new Map();
for (const mode of modes) {
  assert.ok(Array.isArray(proof.assets[mode]) && proof.assets[mode].length > 0);
  assert.ok(Array.isArray(proof.transforms[mode]) && proof.transforms[mode].length > 0);
  for (const asset of proof.assets[mode]) {
    assert.match(asset.urlPath, new RegExp(`^/${mode}/(?:[A-Za-z0-9._-]+\\.html|assets/[A-Za-z0-9._-]+\\.(?:js|css))$`));
    const urlPath = asset.urlPath;
    assert.equal(asset.path, path.join(proofDir, "dist", mode, urlPath.slice(mode.length + 2)));
    assert.ok(!assets.has(urlPath));
    assets.set(urlPath, { ...asset, mode, file: asset.path });
  }
  assert.ok(assets.has(`/${mode}/${proof.entries[mode]}`));
}
let authBytes = null, authorization = null, proofPairBytes = null;
if (kind !== "proof") {
  proofPairBytes = await readFile(path.join(proofDir, "proof-pair-one-shot.json"));
  const browserProof = JSON.parse(proofPairBytes);
  assert.equal(browserProof.status, "PASS_UNTIMED_INSTALLED_PROCESS_LIFECYCLE_PROOF");
  assert.equal(browserProof.buildProofSha256, sha(proofBytes));
  assert.equal(browserProof.inputLockSha256, sha(sourceBytes));
  assert.deepEqual(browserProof.arms.map(item => item.arm), modes);
  assert.deepEqual(browserProof.errors, []);
  authBytes = await readFile(authorizationPath);
  authorization = JSON.parse(authBytes);
  assert.equal(authorization.status, `APPROVED_FOR_ONE_INSTALLED_PROCESS_${kind.toUpperCase()}_PAIR`);
  assert.equal(authorization.kind, kind);
  assert.equal(authorization.buildProofSha256, sha(proofBytes));
  assert.equal(authorization.inputLockSha256, sha(sourceBytes));
  assert.equal(authorization.proofPairSha256, sha(proofPairBytes));
}
const record = { schemaVersion: "installed-process-lifecycle-browser-pair-v1", kind, status: "STARTED", origin,
  transport: "Offline synthetic HTTPS asset replay; no server, TLS route, or live network",
  launchMode: "Local Chromium launch; websocket endpoint omitted and Selenium remote configuration rejected",
  startupMeaning: kind === "startup" ? "One fixed Native-first pair; each arm launches its own fresh local Chromium process, creates a context and page, navigates the offline HTTPS entry, evaluates selected modules and auto-mounts through matching ready output. Node monotonic wall interval includes browser harness and scheduling; no GC, OS/filesystem/network cold claim, update timing, p95 or budget verdict" : null,
  heapMeaning: kind === "heap" ? "Separate fresh untimed Chromium processes; forced GC and raw CDP heap/DOM counters from a pre-module blank page through mounted, updated, retained-controller disposal and release. Whole-page signed deltas include engine, modules and application" : null,
  allocationMeaning: kind === "allocation" ? "Separate fresh untimed Chromium processes; CDP HeapProfiler.startSampling after mounted row click and stopSampling after all sixty updates, including validation/RAF between updates but excluding keyed edit. Sampled stack sizes are statistical observations, not exact allocations or rates" : null,
  sourceBefore: [], sourceAfter: [], servedAssets: [], blockedRequests: [], requestFailures: [], pageErrors: [], consoleErrors: [], arms: [], comparison: null,
  buildProofSha256: sha(proofBytes), inputLockSha256: sha(sourceBytes), proofPairSha256: proofPairBytes ? sha(proofPairBytes) : null,
  authorizationSha256: authBytes ? sha(authBytes) : null,
  bundleBytes: Object.fromEntries(modes.map(mode => [mode, { total: proof.assets[mode].reduce((sum, item) => sum + item.bytes, 0), javascript: proof.assets[mode].filter(item => item.path.endsWith(".js")).reduce((sum, item) => sum + item.bytes, 0) }])),
  harnessPreload: null, errors: [], cleanupErrors: [], stopReason: null };
await writeFile(outputPath, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
const persist = () => writeFile(outputPath, JSON.stringify(record, null, 2) + "\n");
async function verify(field) {
  const check = async (file, expected, label) => {
    remaining();
    const actual = await hashFile(file);
    record[field].push({ path: file, label, expected, actual, matches: actual === expected });
    assert.equal(actual, expected, `${field}: drift ${label} ${file}`);
  };
  assert.ok(Array.isArray(lock.inputs) && lock.inputs.length > 0);
  assert.ok(Array.isArray(lock.installed) && lock.installed.length > 0);
  assert.ok(Array.isArray(lock.tarballs) && lock.tarballs.length === 5);
  for (const label of ["inputs", "tarballs", "installed"]) {
    for (const item of lock[label]) {
      await check(item.path, item.sha256, label);
      await check(item.archivePath, item.sha256, `${label}-archive`);
    }
  }
  assert.deepEqual(proof.sourceSelection, lock.sourceSelection);
  assert.deepEqual(proof.sourceContext, lock.sourceContext);
  assert.deepEqual(proof.reactAdaptation, lock.reactAdaptation);
  assert.ok(Array.isArray(lock.browserDependencies?.files) && lock.browserDependencies.files.length > 0);
  const executable = lock.browserDependencies.executable;
  assert.ok(executable?.path && executable.sha256 && Number.isInteger(executable.bytes));
  await check(executable.path, executable.sha256, "browser-executable");
  assert.equal((await readFile(executable.path)).length, executable.bytes);
  for (const label of ["compiler", "packageReport"]) {
    const item = lock[label];
    assert.ok(item?.path && item.sha256);
    await check(item.path, item.sha256, label);
    if (item.sourcePath) await check(item.sourcePath, item.sha256, `${label}-source`);
    if (item.archivePath) await check(item.archivePath, item.sha256, `${label}-archive`);
  }
  assert.ok(Array.isArray(lock.stagedSource?.files) && lock.stagedSource.files.length > 0);
  for (const item of lock.stagedSource.files) {
    await check(path.join(root, item.path), item.sha256, "selected-source");
    await check(path.join(proofDir, "inputs", "native-source", item.path), item.sha256, "staged-source");
  }
  const packageReport = JSON.parse(await readFile(lock.packageReport.path, "utf8"));
  assert.ok(Object.keys(packageReport.sourceHashes ?? {}).length > 0);
  for (const [relative, expected] of Object.entries(packageReport.sourceHashes))
    await check(path.join(root, relative), expected, "package-report-source");
  for (const mode of modes) {
    const capture = proof.transformCaptures?.[mode];
    assert.ok(capture?.path && capture.sha256 && Number.isInteger(capture.bytes));
    await check(capture.path, capture.sha256, `${mode}-transform-capture`);
    assert.equal((await readFile(capture.path)).length, capture.bytes);
    for (const item of proof.transforms[mode]) {
      await check(item.path, item.sha256, `${mode}-transform`);
      assert.equal((await readFile(item.path)).length, item.bytes);
    }
    for (const item of proof.assets[mode]) {
      await check(item.path, item.sha256, `${mode}-asset`);
      assert.equal((await readFile(item.path)).length, item.bytes);
    }
  }
  for (const [name, processRecord] of Object.entries(proof.processes ?? {})) {
    for (const stream of ["stdout", "stderr"]) {
      const item = processRecord[stream];
      assert.ok(item?.path && item.sha256 && Number.isInteger(item.bytes));
      await check(item.path, item.sha256, `${name}-${stream}`);
      assert.equal((await readFile(item.path)).length, item.bytes);
    }
  }
}
let browser = null, browserClosePromise = null, openingPromise = null;
let deadlineTimer, resolveStopped;
const stopped = new Promise((resolve) => { resolveStopped = resolve; });
const deadlineAt = Date.now() + 90_000;
async function closeWithin(close, label) {
  let timer;
  try {
    await Promise.race([close(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} exceeded 5 seconds`)), 5000);
    })]);
  } finally { clearTimeout(timer); }
}
function closeBrowser() {
  if (!browser) return Promise.resolve();
  browserClosePromise ??= closeWithin(() => browser.close(), "browser close");
  return browserClosePromise;
}
function stop(reason) {
  if (record.stopReason) return;
  record.stopReason = reason;
  resolveStopped(reason);
  void closeBrowser().catch(() => {});
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
function summarizeAllocationProfile(profile) {
  assert.ok(profile?.head && Array.isArray(profile.samples), "CDP sampling profile is required");
  const stacks = new Map();
  const walk = (node, parent) => {
    const frame = node.callFrame;
    const label = `${frame?.functionName ?? ""} ${frame?.url ?? ""}:${frame?.lineNumber ?? -1}:${frame?.columnNumber ?? -1}`;
    stacks.set(node.id, [...parent, label]);
    for (const child of node.children ?? []) walk(child, [...parent, label]);
  };
  walk(profile.head, []);
  const byStack = new Map();
  let sampledBytes = 0;
  for (const sample of profile.samples) {
    assert.ok(Number.isFinite(sample.size) && sample.size >= 0 && stacks.has(sample.nodeId));
    const stack = stacks.get(sample.nodeId).join(" > ");
    byStack.set(stack, (byStack.get(stack) ?? 0) + sample.size);
    sampledBytes += sample.size;
  }
  return { sampleCount: profile.samples.length, sampledBytes,
    topStacks: [...byStack].sort((a, b) => b[1] - a[1]).slice(0, 20)
      .map(([stack, bytes]) => ({ stack, sampledBytes: bytes })) };
}
async function waitForPidExit(pid, label) {
  const until = Date.now() + 5000;
  while (true) {
    try { process.kill(pid, 0); }
    catch (error) {
      if (error?.code === "ESRCH") return;
      throw new Error(`${label} process exit could not be verified: ${String(error)}`);
    }
    if (Date.now() >= until) throw new Error(`${label} browser PID ${pid} remained live after close`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
function assertScene(scene, order, step, detailReady, healthReady, disposed = false, row0Captured = true) {
  assert.deepEqual(scene.rows.map((row) => row.id), disposed ? [] : order);
  for (const row of scene.rows) assertRow(row, row.id, step, row.id === 0 && row0Captured ? 1 : 0);
  if (!disposed) {
    assert.equal(scene.row0Retained, row0Captured ? true : null);
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
async function runArm(arm) {
  const entry = { arm, observations: {}, stages: [], browserVersion: null,
    browserClosed: false, contextClosed: false, startup: null };
  record.arms.push(entry);
  let context = null, page = null, cdp = null, mounted = false, allocationSampling = false;
  const startupStartedAt = kind === "startup" ? performance.now() : null;
  try {
    openingPromise = openBrowser({ headless: true, gpu: false, handleSignals: false }).then(async (instance) => {
      if (record.stopReason) {
        try { await closeWithin(() => instance.close(), `${arm} late browser close`); }
        catch (error) { record.cleanupErrors.push({ arm, operation: "late browser close", error: String(error) }); }
        throw new Error("stopped during browser launch");
      }
      return instance;
    });
    browser = await Promise.race([openingPromise, stopError()]);
    entry.browserVersion = browser.version();
    const launchedAt = kind === "startup" ? performance.now() : null;
    context = await browser.newContext({ viewport: { width: 1200, height: 900 },
      deviceScaleFactor: 1, serviceWorkers: "block" });
    page = await context.newPage();
    const pageReadyAt = kind === "startup" ? performance.now() : null;
    page.setDefaultTimeout(Math.min(5000, remaining()));
    page.on("pageerror", (error) => record.pageErrors.push({ arm, error: String(error) }));
    page.on("console", (message) => { if (message.type() === "error") record.consoleErrors.push({ arm, error: message.text() }); });
    page.on("requestfailed", (request) => record.requestFailures.push({ arm, url: request.url(), reason: request.failure()?.errorText ?? "unknown" }));
    await context.route("**/*", async (route) => {
      try {
        const url = new URL(route.request().url());
        const asset = assets.get(url.pathname);
        if (url.origin !== origin || url.search || url.hash || !asset || asset.mode !== arm) {
          record.blockedRequests.push({ arm, url: url.href }); await route.abort(); return;
        }
        const body = await readFile(asset.file);
        assert.equal(sha(body), asset.sha256);
        const type = url.pathname.endsWith(".html") ? "text/html; charset=utf-8" : url.pathname.endsWith(".js") ? "text/javascript; charset=utf-8" : url.pathname.endsWith(".css") ? "text/css; charset=utf-8" : "application/octet-stream";
        record.servedAssets.push({ arm, path: url.pathname, sha256: asset.sha256, bytes: body.length });
        await route.fulfill({ status: 200, headers: { "content-type": type, "cache-control": "no-store" }, body });
      } catch (error) {
        record.errors.push({ kind: "route-error", arm, error: error instanceof Error ? error.stack ?? String(error) : String(error) });
        try { await route.abort(); } catch (abortError) {
          record.cleanupErrors.push({ arm, operation: "route abort", error: String(abortError) });
        }
      }
    });
    const sample = async (name) => {
      if (!cdp) cdp = await context.newCDPSession(page);
      await cdp.send("HeapProfiler.collectGarbage");
      const heap = await cdp.send("Runtime.getHeapUsage");
      const dom = await cdp.send("Memory.getDOMCounters");
      entry.observations[name] = { heap, dom };
    };
    if (kind === "heap") await sample("blankBeforeModules");
    const response = await page.goto(`${origin}/${arm}/${proof.entries[arm]}`, { waitUntil: "domcontentloaded", timeout: remaining() });
    assert.equal(response?.status(), 200);
    assert.equal(await page.evaluate(() => window.isSecureContext), true);
    await page.waitForFunction((selectedArm) => {
      const ready = window.__r3actStartupReady;
      if (ready?.ready !== true || ready.arm !== selectedArm) return false;
      const scene = window.__authoredLifecycle?.inspect();
      return scene?.diagnostics?.arm === selectedArm && scene.rows?.length === 256 &&
        scene.rows[0]?.id === 0 && scene.rows[0]?.step === "0" &&
        scene.rows[255]?.id === 255 && scene.detail?.fallback === 1 &&
        scene.health?.fallback === 1;
    }, arm, { timeout: remaining() });
    const startupReadyAt = kind === "startup" ? performance.now() : null;
    const ready = await page.evaluate(() => window.__r3actStartupReady);
    assert.equal(ready.arm, arm);
    assert.equal(ready.ready, true);
    assert.ok(Number.isFinite(ready.entryBodyStartedAtMs) && ready.entryBodyStartedAtMs >= 0);
    assert.ok(Number.isFinite(ready.mountedAtMs) && ready.mountedAtMs >= ready.entryBodyStartedAtMs);
    assert.equal(await page.evaluate(() => Boolean(window.__authoredLifecycle)), true);
    mounted = true;
    if (kind === "startup") entry.startup = {
      launchMs: launchedAt - startupStartedAt,
      contextAndPageMs: pageReadyAt - launchedAt,
      navigationModulesAndMountMs: startupReadyAt - pageReadyAt,
      launchThroughReadyMs: startupReadyAt - startupStartedAt,
      browserMarks: ready,
    };
    entry.ready = ready;
    const browserSession = await browser.newBrowserCDPSession();
    try {
      const processInfo = await browserSession.send("SystemInfo.getProcessInfo");
      const browserProcesses = processInfo.processInfo.filter((item) => item.type === "browser");
      assert.equal(browserProcesses.length, 1, "CDP must identify exactly one browser process");
      assert.ok(Number.isSafeInteger(browserProcesses[0].id) && browserProcesses[0].id > 0);
      entry.browserPid = browserProcesses[0].id;
      assert.ok(record.arms.slice(0, -1).every((prior) => prior.browserPid !== entry.browserPid),
        "Native and React must use distinct browser processes");
    } finally { await browserSession.detach(); }
    const observe = async (name, scene) => {
      entry.stages.push({ name, scene });
      if (!name.startsWith("step")) await persist();
      return scene;
    };
    if (kind === "proof") {
      const rejected = await page.evaluate(name => {
        try { window.__authoredLifecycle.mount(name); return false; }
        catch (error) { return String(error).includes("previous scene must be released"); }
      }, arm);
      assert.equal(rejected, true, "duplicate mount must be rejected");
      const unchanged = await page.evaluate(() => ({ snapshot: window.__authoredLifecycle.inspect(), sections: document.querySelectorAll("section[data-arm]").length }));
      assert.equal(unchanged.sections, 1);
      assert.equal(unchanged.snapshot.rows.length, 256);
      entry.duplicateMountRejectedWithoutExtraDOM = true;
    }
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
    const mountedScene = await observe("mounted", await wait("mounted", "mount"));
    assert.equal(mountedScene.diagnostics.arm, arm);
    assertScene(mountedScene, initial, 0, false, false, false, false);
    if (kind === "heap") await sample("mounted");
    await page.evaluate(() => window.__authoredLifecycle.clickRow());
    assertScene(await observe("row0Click", await wait("click", "row click")), initial, 0, false, false);
    if (kind === "allocation") {
      cdp = await context.newCDPSession(page);
      await cdp.send("HeapProfiler.enable");
      await cdp.send("HeapProfiler.startSampling", {
        samplingInterval: 32768, stackDepth: 128,
        includeObjectsCollectedByMajorGC: true,
        includeObjectsCollectedByMinorGC: true,
      });
      allocationSampling = true;
    }
    for (let step = 1; step <= 60; step++) {
      await page.evaluate((nextStep) => window.__authoredLifecycle.update(nextStep), step);
      const stepScene = await observe(`step${step}`, await wait(`step:${step}`, `step ${step}`));
      assertScene(stepScene, initial, step, false, false);
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(done)));
    }
    if (allocationSampling) {
      const { profile } = await cdp.send("HeapProfiler.stopSampling");
      allocationSampling = false;
      entry.allocationProfile = profile;
      entry.allocationSummary = summarizeAllocationProfile(profile);
    }
    const afterUpdates = await observe("afterUpdates", await page.evaluate(() => window.__authoredLifecycle.inspect()));
    assertScene(afterUpdates, initial, 60, false, false);
    await page.evaluate(() => window.__authoredLifecycle.edit());
    const afterEdit = await observe("keyedEdit", await wait("edited", "keyed edit"));
    assertScene(afterEdit, edited, 60, false, false);
    await page.evaluate(() => window.__authoredLifecycle.settleDetail());
    const afterDetail = await observe("detailRevealHealthWaiting", await wait("detail", "detail reveal"));
    assertScene(afterDetail, edited, 60, true, false);
    await page.evaluate(() => window.__authoredLifecycle.settleHealth());
    const afterHealth = await observe("healthReveal", await wait("health", "health reveal"));
    assertScene(afterHealth, edited, 60, true, true);
    if (kind === "heap") await sample("updatedEditedRevealed");
    const disposal = await page.evaluate((phase) =>
      window.__authoredLifecycle.dispose({ retain: phase === "heap" }), kind);
    mounted = false;
    const postDispose = await observe("disposed", await page.evaluate(() => window.__authoredLifecycle.inspect()));
    assertScene(postDispose, edited, 60, true, true, true);
    assert.equal(disposal.remainingChildren, 0);
    if (kind === "heap") await sample("disposedControllerRetained");
    await page.evaluate(() => window.__authoredLifecycle.release());
    if (kind === "proof") {
      const wrongArm = arm === "native" ? "react" : "native";
      const rejected = await page.evaluate((name) => {
        try { window.__authoredLifecycle.mount(name); return false; }
        catch (error) { return String(error).includes("selected page only supports"); }
      }, wrongArm);
      assert.equal(rejected, true, "wrong arm must be rejected after release");
      assert.equal(await page.evaluate(() => document.querySelectorAll("section[data-arm]").length), 0);
      entry.wrongArmMountRejectedWithoutDOM = true;
    }
    if (kind === "heap") await sample("releasedController");
    entry.finalScene = afterHealth;
    entry.disposal = disposal;
    entry.postDispose = postDispose;
    if (kind === "heap") {
      const base = entry.observations.blankBeforeModules;
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
    for (const asset of proof.assets[arm].filter((item) => /\.(html|js|css)$/.test(item.path))) {
      assert.equal(record.servedAssets.filter((item) => item.arm === arm && item.path === asset.urlPath).length, 1);
    }
  } catch (error) {
    if (allocationSampling && cdp) {
      try {
        const { profile } = await cdp.send("HeapProfiler.stopSampling");
        allocationSampling = false;
        entry.allocationProfile = profile;
        entry.allocationSummary = summarizeAllocationProfile(profile);
      } catch (cleanupError) {
        record.cleanupErrors.push({ arm, operation: "partial allocation profile stop", error: String(cleanupError) });
      }
    }
    if (mounted) {
      try { await page.evaluate(() => { window.__authoredLifecycle.dispose({ retain: false }); window.__authoredLifecycle.release(); }); }
      catch (cleanupError) { record.cleanupErrors.push({ arm, error: String(cleanupError) }); }
    }
    throw error;
  } finally {
    if (cdp) {
      try { await closeWithin(() => cdp.detach(), `${arm} CDP detach`); }
      catch (error) { record.cleanupErrors.push({ arm, operation: "CDP detach", error: String(error) }); }
    }
    if (context) {
      try { await closeWithin(() => context.close(), `${arm} context close`); entry.contextClosed = true; }
      catch (error) { record.cleanupErrors.push({ arm, operation: "context close", error: String(error) }); }
    }
    if (!browser && openingPromise && record.stopReason) {
      try { await closeWithin(() => openingPromise.catch(() => {}), `${arm} stopped browser launch cleanup`); }
      catch (error) { record.cleanupErrors.push({ arm, operation: "stopped browser launch cleanup", error: String(error) }); }
    }
    if (browser) {
      try { await closeBrowser(); entry.browserClosed = true; }
      catch (error) { record.cleanupErrors.push({ arm, operation: "browser close", error: String(error) }); }
      if (entry.browserClosed && entry.browserPid) {
        try { await waitForPidExit(entry.browserPid, arm); entry.browserPidExited = true; }
        catch (error) { record.cleanupErrors.push({ arm, operation: "browser PID exit", error: String(error) }); }
      }
    }
    browser = null;
    browserClosePromise = null;
    openingPromise = null;
    try { await persist(); }
    catch (error) { record.cleanupErrors.push({ arm, operation: "partial receipt write", error: String(error) }); }
  }
  if (!entry.browserClosed || !entry.contextClosed || entry.browserPidExited !== true)
    throw new Error(`${arm} fresh browser or context cleanup was incomplete`);
  return entry;
}
let failure = null, candidateStatus = null, workPromise = null;
try {
  process.on("SIGINT", onInt); process.on("SIGTERM", onTerm);
  deadlineTimer = setTimeout(() => stop("deadline-90s"), 90_000);
  await verify("sourceBefore");
  const playwrightEntry = lock.browserDependencies.files.find((item) =>
    item.package === "playwright" && item.relative === "browser-dependencies/playwright/index.mjs");
  assert.ok(playwrightEntry, "locked Playwright ESM entry is required");
  const playwright = await import(pathToFileURL(playwrightEntry.path).href);
  assert.ok(playwright.chromium, "locked Playwright Chromium export is required");
  assert.equal(await realpath(playwright.chromium.executablePath()), lock.browserDependencies.executable.path);
  record.harnessPreload = { path: playwrightEntry.path, sha256: playwrightEntry.sha256,
    scope: "Node harness import before both startup intervals; no browser or app warmup" };
  workPromise = (async () => {
    remaining();
    await runArm("native");
    remaining();
    await runArm("react");
    assert.deepEqual(record.arms[0].finalScene.rows, record.arms[1].finalScene.rows);
    assert.deepEqual(record.arms[0].finalScene.detail, record.arms[1].finalScene.detail);
    assert.deepEqual(record.arms[0].finalScene.health, record.arms[1].finalScene.health);
    record.comparison = kind === "startup" ? {
      native: record.arms[0].startup, react: record.arms[1].startup,
      nativeMinusReactLaunchThroughReadyMs: record.arms[0].startup.launchThroughReadyMs - record.arms[1].startup.launchThroughReadyMs,
      status: "ONE_FIXED_ORDER_DESCRIPTIVE_STARTUP_PAIR",
    } : kind === "heap" ? { status: "SEPARATE_UNTIMED_FORCED_GC_HEAP_PAIR" }
      : kind === "allocation" ? { status: "SEPARATE_UNTIMED_SAMPLED_ALLOCATION_PAIR" }
      : { status: "UNTIMED_INSTALLED_PROCESS_LIFECYCLE_PROOF" };
    await verify("sourceAfter");
    assert.equal(await hashFile(proofPath), sha(proofBytes));
    assert.equal(await hashFile(sourcePath), sha(sourceBytes));
    if (authBytes) assert.equal(await hashFile(authorizationPath), sha(authBytes));
    if (proofPairBytes) assert.equal(await hashFile(path.join(proofDir, "proof-pair-one-shot.json")), sha(proofPairBytes));
    candidateStatus = kind === "proof" ? "PASS_UNTIMED_INSTALLED_PROCESS_LIFECYCLE_PROOF"
      : kind === "startup" ? "PASS_DESCRIPTIVE_STARTUP_PAIR"
      : kind === "heap" ? "PASS_DESCRIPTIVE_HEAP_PAIR" : "PASS_DESCRIPTIVE_ALLOCATION_PAIR";
  })();
  await Promise.race([workPromise, stopError()]);
} catch (error) {
  failure = error;
  record.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
}
finally {
  clearTimeout(deadlineTimer); process.off("SIGINT", onInt); process.off("SIGTERM", onTerm);
  if (workPromise && record.stopReason) {
    try {
      await closeWithin(() => workPromise.catch(error => {
        record.errors.push({ kind: "stopped-work-error", error: error instanceof Error ? error.stack ?? String(error) : String(error) });
      }), "stopped work cleanup");
    } catch (error) { record.cleanupErrors.push({ operation: "stopped work cleanup", error: String(error) }); }
  }
  if (!failure && (!candidateStatus || record.errors.length || record.cleanupErrors.length || record.stopReason ||
      record.pageErrors.length || record.consoleErrors.length || record.blockedRequests.length || record.requestFailures.length ||
      record.arms.length !== 2 || record.arms.some(item => !item.contextClosed || !item.browserClosed || !item.browserPidExited)))
    failure = new Error("browser phase had errors, incomplete cleanup, or a stop condition");
  record.status = failure ? "INCOMPLETE" : candidateStatus;
  await writeFile(outputPath, JSON.stringify(record, null, 2) + "\n");
}
if (failure) { console.error(String(failure)); process.exitCode = record.stopReason === "SIGINT" ? 130 : record.stopReason === "SIGTERM" ? 143 : 1; }
else console.log(JSON.stringify({ status: record.status, outputPath }));
