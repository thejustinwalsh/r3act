import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";

const root = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const stage = path.dirname(fileURLToPath(import.meta.url));
assert.equal(process.version, "v24.18.0");
const args = process.argv.slice(2);
const value = (flag) => { const index = args.indexOf(flag); return index < 0 ? null : args[index + 1] ?? null; };
assert.equal(args.length, 4, "usage: verify-browser.mjs --proof-dir DIR --phase proof|timing");
const kind = value("--phase"), origin = "https://group-host-admission-proof.invalid";
assert.ok(["proof", "timing"].includes(kind), "--phase proof|timing required");
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
assert.ok(path.basename(proof.consumer).startsWith("r3act-group-host-admission-"));
assert.deepEqual(proof.entries, { native: "native.html", react: "react.html" });
assert.ok(Object.values(proof.assertions).length && Object.values(proof.assertions).every(Boolean));
assert.equal(proof.assertions.installedResourceLifetimes, true);
assert.equal(proof.assertions.installedGroupAdmission, true);
assert.equal(proof.assertions.installedPublicationDomains, true);
assert.equal(proof.assertions.separateNativeGraph, true);
assert.equal(proof.assertions.separateReactGraph, true);
for (const name of ["app.tsx", "scene.tsx"]) {
  const semantic = proof.nativeSemantic?.[name];
  assert.ok(semantic?.componentDefinitions?.length >= 2);
  assert.equal(semantic?.semanticPlans?.length, 1);
  assert.ok(semantic.compiledHookCalls >= 1);
}
for (const name of ["Projection", "Result", "App"])
  assert.ok(proof.reactMemoSlots?.[name]?.some(slots => Number.isInteger(slots) && slots > 0));
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
let authBytes = null, authorization = null, proofPairBytes = null, timingBytes = null;
if (kind !== "proof") {
  proofPairBytes = await readFile(path.join(proofDir, "proof-pair-one-shot.json"));
  const browserProof = JSON.parse(proofPairBytes);
  assert.equal(browserProof.status, "PASS_UNTIMED_INSTALLED_ASYNC_UX_PROOF");
  assert.equal(browserProof.buildProofSha256, sha(proofBytes));
  assert.equal(browserProof.inputLockSha256, sha(sourceBytes));
  assert.deepEqual(browserProof.arms.map(item => item.arm), modes);
  assert.deepEqual(browserProof.errors, []);
  authBytes = await readFile(authorizationPath);
  authorization = JSON.parse(authBytes);
  assert.equal(authorization.status, "APPROVED_FOR_ONE_INSTALLED_ASYNC_UX_TIMING_PAIR");
  assert.equal(authorization.kind, kind);
  assert.equal(authorization.buildProofSha256, sha(proofBytes));
  assert.equal(authorization.inputLockSha256, sha(sourceBytes));
  assert.equal(authorization.proofPairSha256, sha(proofPairBytes));
}
const record = { schemaVersion: "installed-async-ux-browser-pair-v1", kind, status: "STARTED", origin,
  transport: "Offline synthetic HTTPS asset replay; no server, TLS route, or live network",
  timingMeaning: kind === "timing" ? "Twenty #urgent.click dispatch-to-complete matching DOM MutationObserver observations and one C settlement-to-complete observation; ten clicks during pending B and ten during pending C. Fresh Native-first pages; snapshots and RAF waits outside intervals; observer delivery included, paint excluded; no GC or retry." : null,
  sourceBefore: [], sourceAfter: [], servedAssets: [], blockedRequests: [], requestFailures: [], pageErrors: [], consoleErrors: [], arms: [], comparison: null,
  buildProofSha256: sha(proofBytes), inputLockSha256: sha(sourceBytes), proofPairSha256: proofPairBytes ? sha(proofPairBytes) : null,
  authorizationSha256: authBytes ? sha(authBytes) : null,
  bundleBytes: Object.fromEntries(modes.map(mode => [mode, { total: proof.assets[mode].reduce((sum, item) => sum + item.bytes, 0), javascript: proof.assets[mode].filter(item => item.path.endsWith(".js")).reduce((sum, item) => sum + item.bytes, 0) }])),
  browserVersion: null, browserClosed: false, errors: [], cleanupErrors: [], stopReason: null };
await writeFile(outputPath, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
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
  assert.equal(lock.frozenSource?.length, 4);
  for (const item of lock.frozenSource) {
    await check(item.path, item.sha256, "frozen-source");
    await check(item.archivePath, item.sha256, "frozen-source-archive");
  }
  assert.deepEqual(proof.sourceSelection, lock.sourceSelection);
  assert.deepEqual(proof.sourceContext, lock.sourceContext);
  assert.deepEqual(proof.reactAdaptation, lock.reactAdaptation);
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
let browser, browserClosePromise, deadlineTimer, resolveStopped;
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
  browserClosePromise ??= closeWithin(() => browser.close(), "browser close").then(() => { record.browserClosed = true; });
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
const summary = (samples) => {
  assert.equal(samples.length, 20);
  assert.ok(samples.every((n) => Number.isFinite(n) && n >= 0));
  const sorted = [...samples].sort((a, b) => a - b);
  return { medianMs: sorted[9], p95Ms: sorted[18], firstMs: samples[0], sumMs: samples.reduce((a, b) => a + b, 0) };
};
const normalized = (scene) => ({
  primary: Object.fromEntries(["query", "urgent", "result", "detail", "pending"].map(key => [key, scene.primary[key] ?? null])),
  fork: Object.fromEntries(["query", "urgent", "result", "detail", "pending"].map(key => [key, scene.fork[key] ?? null])),
  three: { query: scene.three.query, urgent: scene.three.urgent, result: scene.three.result,
    resultPosition: scene.three.resultPosition, children: scene.three.children },
});
function assertPanel(scene, query, forkQuery, result, urgent, detail, pending) {
  for (const [lane, expected] of [["primary", query], ["fork", forkQuery]]) {
    assert.equal(scene[lane].query, expected, `${lane} requested query`);
    assert.equal(scene[lane].urgent, String(urgent), `${lane} urgent count`);
    assert.equal(scene[lane].result, result, `${lane} accepted result`);
    assert.equal(scene[lane].detail, detail, `${lane} accepted detail`);
    assert.equal(scene[lane].pending ?? null, expected === result ? null : pending, `${lane} pending marker`);
    assert.equal(scene[lane].error ?? null, null, `${lane} error marker`);
  }
  assert.equal(scene.three.query, `query-${query}`);
  assert.equal(scene.three.urgent, `urgent-${urgent}`);
  assert.equal(scene.three.result, `result-${result}`);
  assert.equal(scene.three.resultPosition, result === "A" ? 1 : 3);
  assert.equal(scene.three.children, 1);
  assert.equal(scene.queryHead, query);
  assert.equal(scene.urgentHead, urgent);
}
function assertCleanup(scene, arm) {
  assert.equal(scene.borrowedAtHostDisposal.geometry, 0);
  assert.equal(scene.borrowedAtHostDisposal.material, 0);
  assert.equal(scene.borrowedDisposed.geometry, 1);
  assert.equal(scene.borrowedDisposed.material, 1);
  if (arm === "native") {
    for (const root of Object.values(scene.roots)) {
      assert.equal(root.ownerCount, 0);
      assert.equal(root.pendingChangeCount, 0);
    }
    assert.equal(scene.stores.query.listeners, 0);
    assert.equal(scene.stores.query.readers, 0);
    assert.equal(scene.stores.urgent.listeners, 0);
    assert.equal(scene.stores.urgent.readers, 0);
    assert.equal(scene.three.diagnostics.liveResources, 0);
    assert.equal(scene.life.starts, scene.life.cleanups);
  } else {
    assert.equal(scene.listenerCount, 0);
    assert.equal(scene.owned.createdGeometry, scene.owned.disposedGeometry);
    assert.equal(scene.owned.createdMaterial, scene.owned.disposedMaterial);
    assert.equal(scene.life.effectRuns, scene.life.effectCleanups);
    assert.equal(scene.life.primaryMounts, scene.life.primaryCleanups);
    assert.equal(scene.life.forkMounts, scene.life.forkCleanups);
  }
}
async function runArm(arm) {
  const entry = { arm, episodes: [], contextClosed: false, observations: {} };
  record.arms.push(entry);
  let context, page, mounted = false;
  try {
    context = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
    page = await context.newPage();
    page.setDefaultTimeout(Math.min(5000, remaining()));
    page.on("pageerror", error => record.pageErrors.push({ arm, error: String(error) }));
    page.on("console", message => { if (message.type() === "error") record.consoleErrors.push({ arm, error: message.text() }); });
    page.on("requestfailed", request => record.requestFailures.push({ arm, url: request.url(), reason: request.failure()?.errorText ?? "unknown" }));
    await context.route("**/*", async route => {
      try {
        const url = new URL(route.request().url());
        const asset = assets.get(url.pathname);
        if (url.origin !== origin || url.search || url.hash || !asset || asset.mode !== arm) {
          record.blockedRequests.push({ arm, url: url.href }); await route.abort(); return;
        }
        const body = await readFile(asset.file);
        assert.equal(sha(body), asset.sha256);
        const type = url.pathname.endsWith(".html") ? "text/html; charset=utf-8" :
          url.pathname.endsWith(".js") ? "text/javascript; charset=utf-8" :
          url.pathname.endsWith(".css") ? "text/css; charset=utf-8" : "application/octet-stream";
        record.servedAssets.push({ arm, path: url.pathname, sha256: asset.sha256, bytes: body.length });
        await route.fulfill({ status: 200, headers: { "content-type": type, "cache-control": "no-store" }, body });
      } catch (error) {
        record.errors.push({ kind: "route-error", arm, error: error instanceof Error ? error.stack ?? String(error) : String(error) });
        try { await route.abort(); } catch (abortError) { record.cleanupErrors.push({ arm, operation: "route abort", error: String(abortError) }); }
      }
    });
    const response = await page.goto(`${origin}/${arm}/${proof.entries[arm]}`, { waitUntil: "networkidle", timeout: remaining() });
    assert.equal(response?.status(), 200);
    assert.equal(await page.evaluate(() => window.isSecureContext), true);
    assert.equal(await page.evaluate(() => window.__forkedUX?.selectedArm), arm);
    assert.equal(await page.evaluate(() => document.querySelector("#app") === null && document.querySelector("#mount") !== null), true);
    if (kind === "timing") {
      entry.timerQuantumMs = await page.evaluate(() => {
        let previous = performance.now(), minimum = Infinity;
        for (let index = 0; index < 2048; index++) {
          const next = performance.now();
          if (next > previous) minimum = Math.min(minimum, next - previous);
          previous = next;
        }
        return Number.isFinite(minimum) ? minimum : null;
      });
      assert.ok(Number.isFinite(entry.timerQuantumMs) && entry.timerQuantumMs > 0);
    }
    await page.exposeFunction("__recordForkedUXStage", async (stage) => {
      if (!entry.currentEpisode) throw new Error("stage without active episode");
      entry.currentEpisode.stages.push(stage);
    });
    const runEpisode = async (variant) => page.evaluate(async ({ variant, measure }) => {
      const driver = window.__forkedUX;
      const snapshots = {};
      const mutation = { fallbackAdditions: 0, observations: [] };
      const identities = [];
      const texts = {};
      let firstPrimary = null, firstFork = null;
      const waitFor = async (predicate, label) => {
        const deadline = performance.now() + 5000;
        while (true) {
          const scene = driver.snapshot();
          if (predicate(scene)) return scene;
          if (performance.now() >= deadline) throw new Error(`${variant}: ${label} did not settle`);
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
      };
      const progress = { variant, snapshots, mutation, identities, texts };
      window.__forkedUXProofProgress = progress;
      const capture = async (name, scene, sampleMs = null) => {
        snapshots[name] = scene;
        mutation.observations.push({ name, count: mutation.fallbackAdditions });
        const primaryNode = document.querySelector('[data-root="primary"] [data-result]');
        const forkNode = document.querySelector('[data-root="fork"] [data-result]');
        const clean = node => node?.textContent?.replace(/\s+/g, " ").trim() ?? null;
        texts[name] = { primary: clean(primaryNode), fork: clean(forkNode) };
        if (name === "initialA") { firstPrimary = primaryNode; firstFork = forkNode; }
        if (variant === "main" && name !== "disposed") identities.push({ name,
          primaryRetained: primaryNode === firstPrimary, forkRetained: forkNode === firstFork });
        await window.__recordForkedUXStage({ variant, name, scene, fallbackAdditions: mutation.fallbackAdditions,
          identity: identities.at(-1) ?? null, text: texts[name], sampleMs });
        return scene;
      };
      const completeUrgent = (count) => {
        const nodes = [document.querySelector('[data-root="primary"] [data-urgent]'), document.querySelector('[data-root="fork"] [data-urgent]')];
        const scene = driver.snapshot();
        const requested = count <= 10 ? "B" : "C";
        return nodes.every(node => node?.getAttribute("data-urgent") === String(count)) &&
          scene.three.urgent === `urgent-${count}` && scene.primary.query === scene.queryHead &&
          scene.queryHead === requested && scene.fork.query === requested && scene.three.query === `query-${requested}` &&
          scene.primary.result === "A" && scene.fork.result === "A" && scene.three.result === "result-A" &&
          scene.three.resultPosition === 1 && scene.primary.detail === "ready-A" && scene.fork.detail === "ready-A" &&
          scene.primary.pending === "detail" && scene.fork.pending === "detail";
      };
      const observeInterval = (fire, predicate, label) => new Promise((resolve, reject) => {
        let finished = false, timeout;
        const observer = new MutationObserver(() => {
          const observedAt = performance.now();
          if (!finished && predicate()) { finished = true; observer.disconnect(); clearTimeout(timeout); resolve(observedAt - start); }
        });
        observer.observe(document.querySelector("#mount"), { subtree: true, childList: true, attributes: true, characterData: true });
        const start = performance.now();
        try { fire(); } catch (error) { finished = true; observer.disconnect(); reject(error); return; }
        timeout = setTimeout(() => { if (!finished) { finished = true; observer.disconnect(); reject(new Error(`${label}: complete MutationObserver not observed`)); } }, 5000);
      });
      driver.mount();
      const initial = await capture("initialA", await waitFor(s => s.primary.result === "A" && s.fork.result === "A" && s.three.result === "result-A", "initial A"));
      const identity = { handle: initial.three.resultHandleId, geometry: initial.three.resultGeometryId, material: initial.three.resultMaterialId };
      const observer = new MutationObserver(records => {
        for (const record of records) for (const node of record.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches?.('[data-startup], [data-pending="startup"]') || node.querySelector?.('[data-startup], [data-pending="startup"]')) mutation.fallbackAdditions++;
        }
      });
      observer.observe(document.querySelector("#mount"), { subtree: true, childList: true, attributes: true });
      try {
        if (variant === "dispose") {
          const begin = driver.action("beginB");
          const disposal = driver.dispose();
          await capture("atDispose", driver.snapshot());
          await begin;
          await driver.action("resolveA"); await driver.action("resolveB"); await driver.action("resolveC");
          await Promise.resolve(); await new Promise(resolve => requestAnimationFrame(resolve));
          await capture("lateAfterDispose", driver.snapshot());
          return { variant, snapshots, mutation, identities, texts, identity, disposal, hostChildren: document.querySelector("#mount").childNodes.length };
        }
        await driver.action("beginB");
        await capture("divergedB", await waitFor(s => s.primary.query === "B" && s.three.query === "query-B" && s.fork.query === "A", "divergent B"));
        if (variant === "cancel") {
          await driver.action("cancel");
          await capture("cancelled", await waitFor(s => s.primary.result === "A" && s.fork.result === "A", "cancelled accepted A"));
          await driver.action("resolveA"); await driver.action("resolveB"); await driver.action("resolveC");
          await Promise.resolve(); await new Promise(resolve => requestAnimationFrame(resolve));
          await capture("lateAfterCancel", driver.snapshot());
          const disposal = driver.dispose();
          return { variant, snapshots, mutation, identities, texts, identity, disposal, hostChildren: document.querySelector("#mount").childNodes.length };
        }
        await driver.action("catchUpFork");
        await capture("convergedB", await waitFor(s => s.fork.query === "B" && s.primary.query === "B", "converged B"));
        const clickMs = [];
        for (let count = 1; count <= 10; count++) {
          const button = document.querySelector("#urgent");
          if (!button) throw new Error("real urgent button missing");
          if (measure) clickMs.push(await observeInterval(() => button.click(), () => completeUrgent(count), `B click ${count}`));
          else { button.click(); await waitFor(s => s.primary.urgent === String(count) && s.fork.urgent === String(count) && s.three.urgent === `urgent-${count}`, `B urgent ${count}`); }
          await capture(`urgentB${count}`, driver.snapshot(), measure ? clickMs.at(-1) : null);
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
        await driver.action("beginC");
        await capture("pendingC", await waitFor(s => s.primary.query === "C" && s.fork.query === "C" && s.three.query === "query-C", "pending C"));
        for (let count = 11; count <= 20; count++) {
          const button = document.querySelector("#urgent");
          if (!button) throw new Error("real urgent button missing");
          if (measure) clickMs.push(await observeInterval(() => button.click(), () => completeUrgent(count), `C click ${count}`));
          else { button.click(); await waitFor(s => s.primary.urgent === String(count) && s.fork.urgent === String(count) && s.three.urgent === `urgent-${count}`, `C urgent ${count}`); }
          await capture(`urgentC${count}`, driver.snapshot(), measure ? clickMs.at(-1) : null);
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
        await driver.action("resolveA"); await driver.action("resolveB");
        await Promise.resolve(); await new Promise(resolve => requestAnimationFrame(resolve));
        await capture("staleSettled", driver.snapshot());
        let settlementToObserverMs = null;
        let settlementAction;
        if (measure) settlementToObserverMs = await observeInterval(() => { settlementAction = driver.action("resolveC"); }, () => {
          const s = driver.snapshot();
          return s.primary.query === "C" && s.fork.query === "C" && s.primary.result === "C" && s.fork.result === "C" &&
            s.three.query === "query-C" && s.three.result === "result-C" && s.three.resultPosition === 3 &&
            s.three.urgent === "urgent-20" && s.primary.urgent === "20" && s.fork.urgent === "20" &&
            s.primary.detail === "ready-C" && s.fork.detail === "ready-C" && !s.primary.pending && !s.fork.pending;
        }, "C settle");
        else await driver.action("resolveC");
        if (settlementAction) await settlementAction;
        await capture("finalC", await waitFor(s => s.primary.result === "C" && s.fork.result === "C" && s.three.result === "result-C", "final C"), settlementToObserverMs);
        const disposal = driver.dispose();
        await capture("disposed", driver.snapshot());
        return { variant, snapshots, mutation, identities, texts, identity, clickMs, settlementToObserverMs, disposal,
          hostChildren: document.querySelector("#mount").childNodes.length };
      } finally { observer.disconnect(); }
    }, { variant, measure: kind === "timing" });
    for (const variant of kind === "proof" ? ["main", "cancel", "dispose"] : ["main"]) {
      if (variant !== "main") await page.evaluate(() => document.querySelector("#mount")?.replaceChildren());
      const running = { variant, stages: [], status: "STARTED" };
      entry.episodes.push(running);
      entry.currentEpisode = running;
      mounted = true;
      const episode = await runEpisode(variant);
      mounted = false;
      Object.assign(running, episode, { status: "CAPTURED" });
      delete entry.currentEpisode;
      assert.equal(episode.hostChildren, 0);
      assert.equal(episode.mutation.fallbackAdditions, 0);
      assert.ok(episode.mutation.observations.length >= (variant === "main" ? 27 : variant === "cancel" ? 4 : 3));
      assertPanel(episode.snapshots.initialA, "A", "A", "A", 0, "ready-A", null);
      if (variant !== "dispose") assertPanel(episode.snapshots.divergedB, "B", "A", "A", 0, "ready-A", "detail");
      const final = episode.snapshots[variant === "main" ? "finalC" : variant === "cancel" ? "lateAfterCancel" : "lateAfterDispose"];
      if (variant === "main") {
        assert.ok(episode.identities.length >= 26);
        assert.ok(episode.identities.every(item => item.primaryRetained && item.forkRetained), "DOM result identity changed");
        for (const [name, scene] of Object.entries(episode.snapshots)) {
          if (name === "disposed") continue;
          assert.equal(scene.three.resultHandleId, episode.identity.handle, `Three result handle at ${name}`);
          assert.equal(scene.three.resultGeometryId, episode.identity.geometry, `Three result geometry at ${name}`);
          assert.equal(scene.three.resultMaterialId, episode.identity.material, `Three result material at ${name}`);
        }
        for (const [name, visible] of Object.entries(episode.texts)) {
          if (name === "disposed") continue;
          const accepted = name === "finalC" ? "C: ready-C · shared-catalog" : "A: ready-A · shared-catalog";
          assert.deepEqual(visible, { primary: accepted, fork: accepted }, `DOM result text at ${name}`);
        }
        assertPanel(episode.snapshots.convergedB, "B", "B", "A", 0, "ready-A", "detail");
        assertPanel(episode.snapshots.pendingC, "C", "C", "A", 10, "ready-A", "detail");
        assertPanel(episode.snapshots.staleSettled, "C", "C", "A", 20, "ready-A", "detail");
        assertPanel(final, "C", "C", "C", 20, "ready-C", null);
        for (let count = 1; count <= 20; count++) {
          const scene = episode.snapshots[count <= 10 ? `urgentB${count}` : `urgentC${count}`];
          assertPanel(scene, count <= 10 ? "B" : "C", count <= 10 ? "B" : "C", "A", count, "ready-A", "detail");
        }
        assert.equal(final.three.resultHandleId, episode.identity.handle);
        assert.equal(final.three.resultGeometryId, episode.identity.geometry);
        assert.equal(final.three.resultMaterialId, episode.identity.material);
        assert.deepEqual(final.providerTrace.filter(item => item.event === "start").map(item => item.query), ["B", "A", "C"]);
        assert.deepEqual(final.providerTrace.filter(item => item.event === "resolve").map(item => item.query), ["A", "B", "C"]);
        if (arm === "native") {
          for (const query of ["A", "B", "C"]) {
            assert.equal(final.providerTrace.filter(item => item.query === query && item.event === "start").length, 1);
            assert.equal(final.providerTrace.filter(item => item.query === query && item.event === "resolve").length, 1);
          }
          for (const query of ["A", "B"])
            assert.equal(final.providerTrace.filter(item => item.query === query && item.event === "abort").length, 1);
          assert.deepEqual(final.providerTrace.filter(item => item.event === "abort").map(item => item.query), ["A", "B"]);
          assert.ok(final.detail?.reused?.includes("catalog"), "independent catalog work was repeated");
          for (const id of ["publish-B-primary-three", "publish-B-fork", "publish-C-all"])
            assert.ok(final.settlementTrace.some(item => item.id === id && item.status === "committed"));
        } else {
          assert.deepEqual(final.logicalRetirements, ["A", "B"]);
        }
        if (kind === "timing") {
          assert.equal(episode.clickMs.length, 20);
          assert.ok(Number.isFinite(episode.settlementToObserverMs) && episode.settlementToObserverMs >= 0);
          entry.timing = { clickMs: episode.clickMs, ...summary(episode.clickMs), settlementToObserverMs: episode.settlementToObserverMs };
        } else {
          assert.deepEqual(episode.clickMs, []);
          assert.equal(episode.settlementToObserverMs, null);
        }
      } else if (variant === "cancel") {
        assertPanel(final, "B", "A", "A", 0, "ready-A", "detail");
        assert.deepEqual(normalized(episode.snapshots.cancelled), normalized(final), "late provider wrote cancelled hosts");
      } else {
        assert.deepEqual(normalized(episode.snapshots.atDispose), normalized(final), "late provider wrote disposed hosts");
        assert.equal(final.life.starts ?? final.life.effectRuns, episode.snapshots.atDispose.life.starts ?? episode.snapshots.atDispose.life.effectRuns);
        assert.equal(final.life.cleanups ?? final.life.effectCleanups, episode.snapshots.atDispose.life.cleanups ?? episode.snapshots.atDispose.life.effectCleanups);
      }
      assertCleanup(episode.disposal, arm);
    }
    assert.deepEqual(record.pageErrors.filter(item => item.arm === arm), []);
    assert.deepEqual(record.consoleErrors.filter(item => item.arm === arm), []);
    assert.deepEqual(record.blockedRequests.filter(item => item.arm === arm), []);
    assert.deepEqual(record.requestFailures.filter(item => item.arm === arm), []);
    for (const asset of proof.assets[arm].filter(item => /\.(html|js|css)$/.test(item.path)))
      assert.equal(record.servedAssets.filter(item => item.arm === arm && item.path === asset.urlPath).length, 1);
    return entry;
  } catch (error) {
    if (mounted && page) {
      try { entry.partialEpisode = await page.evaluate(() => window.__forkedUXProofProgress ?? null); }
      catch (captureError) { record.cleanupErrors.push({ arm, operation: "partial episode capture", error: String(captureError) }); }
      try { await page.evaluate(() => window.__forkedUX?.dispose()); }
      catch (cleanupError) { record.cleanupErrors.push({ arm, operation: "episode dispose", error: String(cleanupError) }); }
    }
    throw error;
  } finally {
    if (context) try { await closeWithin(() => context.close(), `${arm} context close`); entry.contextClosed = true; }
    catch (error) { record.cleanupErrors.push({ arm, operation: "context close", error: String(error) }); }
  }
}
let failure = null, candidateStatus = null, workPromise = null, openingPromise = null;
try {
  process.on("SIGINT", onInt); process.on("SIGTERM", onTerm);
  deadlineTimer = setTimeout(() => stop("deadline-90s"), 90_000);
  await verify("sourceBefore");
  openingPromise = openBrowser({ headless: true, gpu: false, handleSignals: false }).then(async instance => {
    if (record.stopReason) {
      try { await closeWithin(() => instance.close(), "late browser close"); }
      catch (error) { record.cleanupErrors.push({ operation: "late browser close", error: String(error) }); }
      throw new Error("stopped during browser launch");
    }
    return instance;
  });
  browser = await Promise.race([openingPromise, stopError()]);
  record.browserVersion = browser.version();
  workPromise = (async () => {
    await runArm("native"); await runArm("react");
    const n = record.arms[0].episodes[0], r = record.arms[1].episodes[0];
    for (const name of ["initialA", "divergedB", "convergedB", "pendingC", "staleSettled", "finalC"])
      assert.deepEqual(normalized(n.snapshots[name]), normalized(r.snapshots[name]), `arm output mismatch: ${name}`);
    for (let count = 1; count <= 20; count++) {
      const name = count <= 10 ? `urgentB${count}` : `urgentC${count}`;
      assert.deepEqual(normalized(n.snapshots[name]), normalized(r.snapshots[name]), `arm output mismatch: ${name}`);
    }
    record.comparison = kind === "timing" ? { status: "ONE_FIXED_ORDER_DESCRIPTIVE_TIMING_PAIR", native: record.arms[0].timing,
      react: record.arms[1].timing, fixedOrder: modes, paintExcluded: true } : { status: "UNTIMED_INSTALLED_ASYNC_UX_PROOF" };
    await verify("sourceAfter");
    assert.equal(await hashFile(proofPath), sha(proofBytes));
    assert.equal(await hashFile(sourcePath), sha(sourceBytes));
    if (authBytes) assert.equal(await hashFile(authorizationPath), sha(authBytes));
    if (proofPairBytes) assert.equal(await hashFile(path.join(proofDir, "proof-pair-one-shot.json")), sha(proofPairBytes));
    candidateStatus = kind === "proof" ? "PASS_UNTIMED_INSTALLED_ASYNC_UX_PROOF" : "PASS_DESCRIPTIVE_ASYNC_UX_TIMING_PAIR";
  })();
  await Promise.race([workPromise, stopError()]);
} catch (error) {
  failure = error;
  record.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
} finally {
  clearTimeout(deadlineTimer); process.off("SIGINT", onInt); process.off("SIGTERM", onTerm);
  if (!browser && openingPromise && record.stopReason) {
    try { await closeWithin(() => openingPromise.catch(() => {}), "stopped browser launch cleanup"); }
    catch (error) { record.cleanupErrors.push({ operation: "stopped browser launch cleanup", error: String(error) }); }
  }
  if (browser) try { await closeBrowser(); }
  catch (error) { record.cleanupErrors.push({ operation: "browser close", error: String(error) }); }
  if (workPromise && record.stopReason) try {
    await closeWithin(() => workPromise.catch(error => record.errors.push({ kind: "stopped-work-error", error: String(error) })), "stopped work cleanup");
  } catch (error) { record.cleanupErrors.push({ operation: "stopped work cleanup", error: String(error) }); }
  if (!failure && (!candidateStatus || record.errors.length || record.cleanupErrors.length || record.stopReason || !record.browserClosed ||
    record.pageErrors.length || record.consoleErrors.length || record.blockedRequests.length || record.requestFailures.length ||
    record.arms.some(item => !item.contextClosed))) failure = new Error("browser phase had errors or incomplete cleanup");
  record.status = failure ? "INCOMPLETE" : candidateStatus;
  await writeFile(outputPath, JSON.stringify(record, null, 2) + "\n");
}
if (failure) { console.error(String(failure)); process.exitCode = record.stopReason === "SIGINT" ? 130 : record.stopReason === "SIGTERM" ? 143 : 1; }
else console.log(JSON.stringify({ status: record.status, outputPath }));
