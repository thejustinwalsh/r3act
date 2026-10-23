import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, "../..");
assert.equal(process.version, "v24.18.0");
const args = process.argv.slice(2);
const flag = name => { const index = args.indexOf(name); return index < 0 ? null : args[index + 1] ?? null; };
assert.equal(args.length, 4, "usage: verify-browser.mjs --proof-dir DIR --phase proof|timing");
const phase = flag("--phase"), proofDir = path.resolve(flag("--proof-dir") ?? "");
assert.ok(phase === "proof" || phase === "timing");
assert.equal(path.dirname(proofDir), unit);
assert.match(path.basename(proofDir), /^proof-v[1-9]\d*$/);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = async file => sha(await readFile(file));
const proofPath = path.join(proofDir, "build-proof.json");
const lockPath = path.join(proofDir, "input-lock.json");
const proofBytes = await readFile(proofPath), lockBytes = await readFile(lockPath);
const build = JSON.parse(proofBytes), lock = JSON.parse(lockBytes);
assert.equal(build.status, "PASS_INSTALLED_BUILD_PROOF");
assert.equal(lock.status, "PASS_INSTALLED_PREPARATION");
assert.equal(build.inputLockSha256, sha(lockBytes));
assert.equal(build.consumer, lock.consumer);
assert.equal(path.dirname(build.consumer), await realpath(tmpdir()));
assert.ok(path.basename(build.consumer).startsWith("r3act-dependency-orchestration-"));
assert.deepEqual(build.entries, { native: "native.html", react: "react.html" });
assert.ok(Object.values(build.assertions).length && Object.values(build.assertions).every(Boolean));
assert.deepEqual(build.buildMode, { native: "production-minified",
  react: "production-minified", profiler: false });
const order = phase === "proof" ? ["native", "react"] :
  ["native", "react", "react", "native", "react", "native", "native", "react"];
const origin = "https://installed-dependency-orchestration.invalid";
const assets = new Map();
for (const arm of ["native", "react"]) {
  assert.ok(build.assets[arm]?.length > 0);
  for (const item of build.assets[arm]) {
    assert.match(item.urlPath, new RegExp(`^/${arm}/(?:[A-Za-z0-9._-]+\\.html|assets/[A-Za-z0-9._-]+\\.(?:js|css))$`));
    assert.equal(item.path, path.join(proofDir, "dist", arm, item.urlPath.slice(arm.length + 2)));
    assert.ok(!assets.has(item.urlPath));
    assets.set(item.urlPath, { ...item, arm });
  }
  assert.ok(assets.has(`/${arm}/${build.entries[arm]}`));
}
let priorProofBytes = null, authorizationBytes = null;
if (phase === "timing") {
  priorProofBytes = await readFile(path.join(proofDir, "proof-one-shot.json"));
  const prior = JSON.parse(priorProofBytes);
  assert.equal(prior.status, "PASS_UNTIMED_DEPENDENCY_PROOF");
  assert.equal(prior.buildProofSha256, sha(proofBytes));
  assert.equal(prior.inputLockSha256, sha(lockBytes));
  authorizationBytes = await readFile(path.join(proofDir, "timing-authorization.json"));
  const authorization = JSON.parse(authorizationBytes);
  assert.equal(authorization.status, "APPROVED_FOR_ONE_DEPENDENCY_TIMING_PHASE");
  assert.equal(authorization.buildProofSha256, sha(proofBytes));
  assert.equal(authorization.inputLockSha256, sha(lockBytes));
  assert.equal(authorization.proofSha256, sha(priorProofBytes));
}
const outputPath = path.join(proofDir, `${phase}-one-shot.json`);
const record = { schemaVersion: "dependency-orchestration-browser-v1", phase,
  status: "STARTED", order, origin, transport: "exact offline HTTPS asset replay",
  meaning: phase === "timing" ? "urgent dispatch to matching accepted MutationObserver or declarative Three commit event; observer delivery included, paint excluded" : "deterministic deferred semantic proof",
  buildMode: build.buildMode, warmupsPerContext: phase === "timing" ? 12 : null,
  measuredPerContext: phase === "timing" ? 60 : null,
  buildProofSha256: sha(proofBytes), inputLockSha256: sha(lockBytes),
  proofSha256: priorProofBytes ? sha(priorProofBytes) : null,
  authorizationSha256: authorizationBytes ? sha(authorizationBytes) : null,
  sourceBefore: [], sourceAfter: [], servedAssets: [], blockedRequests: [],
  requestFailures: [], pageErrors: [], consoleErrors: [], contexts: [],
  comparison: null, browserVersion: null, browserClosed: false,
  errors: [], cleanupErrors: [], stopReason: null };
await writeFile(outputPath, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });

const deadlineAt = Date.now() + 90_000;
const remaining = () => {
  if (record.stopReason || Date.now() >= deadlineAt)
    throw new Error(`browser phase stopped: ${record.stopReason ?? "90-second deadline"}`);
  return deadlineAt - Date.now();
};
async function verify(field) {
  const check = async (file, expected, kind) => {
    remaining();
    const actual = await hash(file);
    record[field].push({ kind, file, expected, actual, matches: expected === actual });
    assert.equal(actual, expected, `source drift: ${kind} ${file}`);
  };
  for (const kind of ["inputs", "authoredExample", "tarballs", "installed"])
    for (const item of lock[kind] ?? []) {
      await check(item.path, item.sha256, kind);
      await check(item.archivePath, item.sha256, `${kind}-archive`);
    }
  assert.equal(lock.authoredExample?.length, 2);
  for (const kind of ["compiler", "packageReport"]) {
    const item = lock[kind];
    assert.ok(item?.path && item.sha256);
    await check(item.path, item.sha256, kind);
    if (item.sourcePath) await check(item.sourcePath, item.sha256, `${kind}-source`);
    if (item.archivePath) await check(item.archivePath, item.sha256, `${kind}-archive`);
  }
  assert.ok(lock.stagedSource?.files?.length > 0);
  for (const item of lock.stagedSource.files) {
    await check(path.join(root, item.path), item.sha256, "selected-native-source");
    await check(path.join(proofDir, "inputs", "native-source", item.path), item.sha256, "staged-native-source");
  }
  const report = JSON.parse(await readFile(lock.packageReport.path, "utf8"));
  for (const [relative, expected] of Object.entries(report.sourceHashes ?? {}))
    await check(path.join(root, relative), expected, "fresh-package-source");
  for (const arm of ["native", "react"]) {
    const capture = build.transformCaptures[arm];
    await check(capture.path, capture.sha256, "transform-capture");
    for (const item of [...build.transforms[arm], ...build.assets[arm]])
      await check(item.path, item.sha256, `${arm}-build-output`);
  }
  for (const processRecord of Object.values(build.processes))
    for (const stream of ["stdout", "stderr"])
      await check(processRecord[stream].path, processRecord[stream].sha256, "process-log");
  await check(proofPath, sha(proofBytes), "build-proof");
  await check(lockPath, sha(lockBytes), "input-lock");
  if (priorProofBytes) await check(path.join(proofDir, "proof-one-shot.json"), sha(priorProofBytes), "untimed-proof");
  if (authorizationBytes) await check(path.join(proofDir, "timing-authorization.json"), sha(authorizationBytes), "timing-authorization");
}

let browser = null, opening = null, browserClose = null;
let stopResolve;
const stopped = new Promise(resolve => { stopResolve = resolve; });
const stop = reason => {
  if (record.stopReason) return;
  record.stopReason = reason;
  stopResolve(reason);
  void closeBrowser().catch(error => record.cleanupErrors.push({ operation: "stop-close", error: String(error) }));
};
const stopError = () => stopped.then(reason => { throw new Error(`browser phase stopped: ${reason}`); });
const closeWithin = async (operation, label) => {
  let timer;
  try {
    await Promise.race([operation(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} exceeded 5 seconds`)), 5000);
    })]);
  } finally { clearTimeout(timer); }
};
function closeBrowser() {
  if (!browser) return Promise.resolve();
  browserClose ??= closeWithin(() => browser.close(), "browser close")
    .then(() => { record.browserClosed = true; });
  return browserClose;
}
const onInterrupt = () => stop("SIGINT"), onTerminate = () => stop("SIGTERM");
const normalized = scene => ({ navigation: scene.navigation, fork: scene.fork,
  three: scene.three, queryHead: scene.queryHead, urgentHead: scene.urgentHead });
const events = scene => scene.providerTrace.map(({ kind, key, event }) => ({ kind, key, event }));
const quantiles = samples => {
  assert.equal(samples.length, 60);
  assert.deepEqual(samples.map(sample => sample.count),
    Array.from({ length: 60 }, (_, index) => index + 13));
  assert.ok(samples.every(sample => Number.isFinite(sample.startMs) &&
    Number.isFinite(sample.observedAtMs) && sample.observedAtMs >= sample.startMs &&
    sample.durationMs === sample.observedAtMs - sample.startMs));
  const sorted = samples.map(sample => sample.durationMs).sort((a, b) => a - b);
  assert.ok(sorted[29] > 0 && sorted[53] > 0);
  return { medianMs: (sorted[29] + sorted[30]) / 2, p90Ms: sorted[53],
    p95Ms: sorted[56], maxMs: sorted[59], rawSamples: samples };
};

async function runContext(arm, variant, index) {
  const item = { arm, variant, index, stages: [], contextClosed: false,
    timerQuantumMs: null, warmups: [], samples: [], errors: [] };
  record.contexts.push(item);
  let context, page;
  try {
    context = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
    page = await context.newPage();
    page.setDefaultTimeout(Math.min(5000, remaining()));
    page.on("pageerror", error => record.pageErrors.push({ arm, index, error: String(error) }));
    page.on("console", message => { if (message.type() === "error") record.consoleErrors.push({ arm, index, error: message.text() }); });
    page.on("requestfailed", request => record.requestFailures.push({ arm, index, url: request.url(), reason: request.failure()?.errorText }));
    await context.route("**/*", async route => {
      try {
        const url = new URL(route.request().url());
        const asset = assets.get(url.pathname);
        if (url.origin !== origin || url.search || url.hash || !asset || asset.arm !== arm) {
          record.blockedRequests.push({ arm, index, url: url.href });
          await route.abort(); return;
        }
        const body = await readFile(asset.path);
        assert.equal(sha(body), asset.sha256);
        const contentType = url.pathname.endsWith(".html") ? "text/html; charset=utf-8" :
          url.pathname.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/css; charset=utf-8";
        record.servedAssets.push({ arm, index, path: url.pathname, sha256: asset.sha256 });
        await route.fulfill({ status: 200, headers: { "content-type": contentType,
          "cache-control": "no-store" }, body });
      } catch (error) {
        item.errors.push({ kind: "route", error: String(error) });
        try { await route.abort(); } catch (failure) { record.cleanupErrors.push({ arm, index, operation: "route abort", error: String(failure) }); }
      }
    });
    const response = await page.goto(`${origin}/${arm}/${build.entries[arm]}`,
      { waitUntil: "networkidle", timeout: remaining() });
    assert.equal(response?.status(), 200);
    assert.equal(await page.evaluate(() => window.isSecureContext), true);
    assert.equal(await page.evaluate(() => window.__dependencyUX?.selectedArm), arm);
    assert.equal(await page.evaluate(() => document.querySelector("#app") === null), true);
    if (phase === "timing") {
      item.timerQuantumMs = await page.evaluate(() => {
        let last = performance.now(), minimum = Infinity;
        for (let i = 0; i < 2048; i++) {
          const next = performance.now();
          if (next > last) minimum = Math.min(minimum, next - last);
          last = next;
        }
        return minimum;
      });
      assert.ok(Number.isFinite(item.timerQuantumMs) && item.timerQuantumMs > 0);
    }
    const episode = await page.evaluate(async ({ variant, timing }) => {
      const driver = window.__dependencyUX;
      const stages = [];
      const sleepFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
      const waitFor = async (predicate, label) => {
        const deadline = performance.now() + 5000;
        for (;;) {
          const scene = driver.snapshot();
          if (predicate(scene)) return scene;
          if (performance.now() >= deadline) throw new Error(`${label} did not settle`);
          await sleepFrame();
        }
      };
      const capture = (name) => {
        const scene = driver.snapshot();
        const outputText = {
          navigation: document.querySelector('[data-root="navigation"] [data-navigation]')?.textContent?.trim() ?? null,
          recommendations: document.querySelector('[data-root="recommendations"] [data-recommendations]')?.textContent?.trim() ?? null,
        };
        stages.push({ name, atMs: performance.now(), scene, outputText });
        window.__dependencyPartial = stages;
        return scene;
      };
      const navReady = query => scene => scene.navigation.query === query &&
        scene.three?.startsWith(`navigation-${query}-`);
      const initial = await waitFor(scene => scene.navigation.query === "A" &&
        scene.fork.query === "A" && scene.three === "navigation-A-0-urgent-0", "initial A");
      capture("initial");
      driver.begin("B");
      await waitFor(scene => ["profile", "permissions", "recommendations"].every(kind =>
        scene.providerTrace.some(item => item.kind === kind && item.key === "B" && item.event === "start")), "known-key starts");
      capture("startedB");
      driver.resolveProfile("B", { query: "B", accountId: "account-B", name: "Bea" });
      await waitFor(scene => scene.providerTrace.some(item => item.kind === "projects" &&
        item.key === "account-B" && item.event === "start"), "dependent project start");
      capture("projectsStartedB");
      driver.resolvePermissions("B", { query: "B", level: "editor" });
      driver.resolveProjects("account-B", { accountId: "account-B", titles: ["One", "Two"] });
      await waitFor(scene => navReady("B")(scene) && scene.fork.query === "A", "fast navigation reveal");
      capture("navigationB");
      const button = document.querySelector("#urgent");
      if (!(button instanceof HTMLButtonElement)) throw new Error("urgent button missing");
      const click = count => new Promise((resolve, reject) => {
        let done = false, timer;
        const complete = () => {
          const observedAt = performance.now();
          if (!done && driver.acceptedUrgent(count)) {
            done = true;
            observer.disconnect();
            window.removeEventListener("dependency-three-commit", complete);
            clearTimeout(timer);
            resolve({ count, startMs: start, observedAtMs: observedAt,
              durationMs: observedAt - start });
          }
        };
        const observer = new MutationObserver(complete);
        observer.observe(document.querySelector("#mount"),
          { subtree: true, childList: true, attributes: true, characterData: true });
        window.addEventListener("dependency-three-commit", complete);
        timer = setTimeout(() => {
          if (done) return;
          done = true;
          observer.disconnect();
          window.removeEventListener("dependency-three-commit", complete);
          reject(new Error(`urgent ${count} accepted observation timed out`));
        }, 5000);
        const start = performance.now();
        try { button.click(); }
        catch (error) {
          done = true;
          observer.disconnect();
          window.removeEventListener("dependency-three-commit", complete);
          clearTimeout(timer);
          reject(error);
        }
      });
      const samples = [], warmups = [];
      const clicks = timing ? 72 : 3;
      for (let count = 1; count <= clicks; count++) {
        const sample = await click(count);
        if (timing && count > 12) samples.push(sample);
        else if (timing) warmups.push(sample);
        await sleepFrame();
      }
      capture("urgentWhileSlowPending");
      if (variant === "dispose") {
        const before = capture("beforeDispose");
        driver.dispose();
        capture("disposed");
        driver.resolveRecommendations("B", { query: "B", label: "Late B" });
        await sleepFrame();
        capture("lateAfterDispose");
        return { stages, samples, warmups, before,
          hostChildren: document.querySelector("#mount").childNodes.length };
      }
      if (variant === "cancel") {
        driver.cancelPending();
        capture("cancelledFork");
        driver.resolveRecommendations("B", { query: "B", label: "Late B" });
        await sleepFrame();
        capture("lateAfterCancel");
        driver.dispose();
        capture("disposed");
        return { stages, samples, warmups,
          hostChildren: document.querySelector("#mount").childNodes.length };
      }
      driver.resolveRecommendations("B", { query: "B", label: "Recommended B" });
      await waitFor(scene => scene.fork.query === "B" && scene.fork.label === "Recommended B", "slow B reveal");
      capture("slowB");
      driver.dispose();
      capture("disposed");
      return { stages, samples, warmups,
        hostChildren: document.querySelector("#mount").childNodes.length };
    }, { variant, timing: phase === "timing" });
    item.stages = episode.stages;
    item.samples = episode.samples;
    item.warmups = episode.warmups;
    assert.equal(episode.hostChildren, 0);
    const at = name => episode.stages.find(stage => stage.name === name)?.scene;
    const starts = events(at("startedB")).filter(item => item.event === "start");
    assert.deepEqual(starts, [
      { kind: "profile", key: "B", event: "start" },
      { kind: "permissions", key: "B", event: "start" },
      { kind: "recommendations", key: "B", event: "start" },
    ]);
    assert.equal(starts.some(item => item.kind === "projects"), false);
    assert.equal(events(at("projectsStartedB")).filter(item =>
      item.kind === "projects" && item.event === "start").length, 1);
    assert.equal(at("navigationB").fork.query, "A");
    if (arm === "native") assert.ok(at("navigationB").routeWork,
      "Independent reveal must be one live authored route operation");
    assert.equal(at("navigationB").navigation.label, "Bea · editor");
    assert.equal(at("navigationB").navigation.projectCount, "2");
    assert.equal(at("navigationB").three, "navigation-B-2-urgent-0");
    assert.equal(at("urgentWhileSlowPending").fork.query, "A");
    assert.equal(at("urgentWhileSlowPending").navigation.urgent, phase === "timing" ? "72" : "3");
    if (variant === "main") {
      assert.equal(at("slowB").fork.label, "Recommended B");
      assert.equal(events(at("slowB")).filter(item => item.kind === "recommendations" && item.key === "B" && item.event === "start").length, 1);
    } else {
      const before = variant === "cancel" ? at("cancelledFork") : at("beforeDispose");
      const late = variant === "cancel" ? at("lateAfterCancel") : at("lateAfterDispose");
      assert.deepEqual(normalized(late), normalized(variant === "dispose" ? at("disposed") : before));
    }
    if (phase === "timing") {
      assert.deepEqual(item.warmups.map(sample => sample.count),
        Array.from({ length: 12 }, (_, count) => count + 1));
      item.summary = quantiles(item.samples);
    }
    assert.deepEqual(record.pageErrors.filter(row => row.arm === arm && row.index === index), []);
    assert.deepEqual(record.consoleErrors.filter(row => row.arm === arm && row.index === index), []);
    assert.deepEqual(record.blockedRequests.filter(row => row.arm === arm && row.index === index), []);
    assert.deepEqual(record.requestFailures.filter(row => row.arm === arm && row.index === index), []);
    for (const asset of build.assets[arm])
      assert.equal(record.servedAssets.filter(row => row.index === index && row.path === asset.urlPath).length, 1);
    return item;
  } catch (error) {
    item.errors.push({ kind: "episode", error: error instanceof Error ? error.stack ?? String(error) : String(error) });
    if (page) {
      try { item.partialStages = await page.evaluate(() => window.__dependencyPartial ?? null); }
      catch (failure) { record.cleanupErrors.push({ arm, index, operation: "partial capture", error: String(failure) }); }
      try { await page.evaluate(() => window.__dependencyUX?.dispose()); }
      catch (failure) { record.cleanupErrors.push({ arm, index, operation: "episode dispose", error: String(failure) }); }
    }
    throw error;
  } finally {
    if (context) try {
      await closeWithin(() => context.close(), `${arm} context close`);
      item.contextClosed = true;
    } catch (error) { record.cleanupErrors.push({ arm, index, operation: "context close", error: String(error) }); }
  }
}

let work = null, failure = null, deadlineTimer;
try {
  process.on("SIGINT", onInterrupt); process.on("SIGTERM", onTerminate);
  deadlineTimer = setTimeout(() => stop("deadline-90s"), 90_000);
  await verify("sourceBefore");
  opening = openBrowser({ headless: true, gpu: true, handleSignals: false });
  browser = await Promise.race([opening, stopError()]);
  record.browserVersion = browser.version();
  work = (async () => {
    if (phase === "proof") {
      for (const arm of order) for (const variant of ["main", "cancel", "dispose"])
        await runContext(arm, variant, record.contexts.length);
      for (const variant of ["main", "cancel", "dispose"]) {
        const native = record.contexts.find(item => item.arm === "native" && item.variant === variant);
        const react = record.contexts.find(item => item.arm === "react" && item.variant === variant);
        assert.deepEqual(native.stages.map(item => item.name), react.stages.map(item => item.name));
        for (let i = 0; i < native.stages.length; i++)
          assert.deepEqual(normalized(native.stages[i].scene), normalized(react.stages[i].scene),
            `matched ${variant} stage ${native.stages[i].name}`);
        for (let i = 0; i < native.stages.length; i++)
          assert.deepEqual(native.stages[i].outputText, react.stages[i].outputText,
            `matched ${variant} rendered text ${native.stages[i].name}`);
        assert.deepEqual(events(native.stages.at(-2).scene).filter(item => item.event !== "abort"),
          events(react.stages.at(-2).scene).filter(item => item.event !== "abort"),
          `matched ${variant} provider start/settle order`);
      }
      record.comparison = { status: "MATCHED_EQUAL_PRELOAD_SEMANTIC_PROOF",
        deterministicDeferredOnly: true, networkLatencyClaim: false };
    } else {
      for (const arm of order) await runContext(arm, "main", record.contexts.length);
      const pairs = [];
      for (let index = 0; index < order.length; index += 2) {
        const adjacent = record.contexts.slice(index, index + 2);
        const native = adjacent.find(item => item.arm === "native");
        const react = adjacent.find(item => item.arm === "react");
        assert.ok(native && react);
        pairs.push({ contexts: [index, index + 1],
          medianRatio: native.summary.medianMs / react.summary.medianMs,
          p90Ratio: native.summary.p90Ms / react.summary.p90Ms });
      }
      record.comparison = { status: "ONE_BALANCED_MINIFIED_PRODUCTION_TIMING_PHASE",
        order, warmupsPerContext: 12, measuredPerContext: 60,
        adjacentPairs: pairs,
        native: record.contexts.filter(item => item.arm === "native").map(item => item.summary),
        react: record.contexts.filter(item => item.arm === "react").map(item => item.summary),
        paintExcluded: true, networkLatencyClaim: false };
    }
    await verify("sourceAfter");
  })();
  await Promise.race([work, stopError()]);
} catch (error) {
  failure = error;
  record.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
} finally {
  clearTimeout(deadlineTimer);
  process.off("SIGINT", onInterrupt); process.off("SIGTERM", onTerminate);
  if (!browser && opening && record.stopReason) try {
    await closeWithin(() => opening.then(instance => instance.close()).catch(() => {}), "late browser cleanup");
  } catch (error) { record.cleanupErrors.push({ operation: "late browser cleanup", error: String(error) }); }
  if (browser) try { await closeBrowser(); }
  catch (error) { record.cleanupErrors.push({ operation: "browser close", error: String(error) }); }
  if (work && record.stopReason) try { await closeWithin(() => work.catch(() => {}), "stopped work cleanup"); }
  catch (error) { record.cleanupErrors.push({ operation: "stopped work cleanup", error: String(error) }); }
  if (!failure && (record.errors.length || record.cleanupErrors.length || record.stopReason ||
    !record.browserClosed || record.contexts.some(item => !item.contextClosed)))
    failure = new Error("browser phase incomplete");
  record.status = failure ? "INCOMPLETE" : phase === "proof" ?
    "PASS_UNTIMED_DEPENDENCY_PROOF" : "PASS_DESCRIPTIVE_DEPENDENCY_TIMING";
  await writeFile(outputPath, JSON.stringify(record, null, 2) + "\n");
}
if (failure) { console.error(String(failure)); process.exitCode = 1; }
else console.log(JSON.stringify({ status: record.status, outputPath }));
