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
const arg = flag => args[args.indexOf(flag) + 1];
assert.equal(args.length, 4);
const kind = arg("--phase"), proofDir = path.resolve(arg("--proof-dir") ?? "");
assert.ok(["proof", "timing"].includes(kind));
assert.equal(path.dirname(proofDir), stage);
assert.match(path.basename(proofDir), /^proof-v[1-9]\d*$/);
const origin = "https://closed-row-episode.invalid";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hashFile = async file => sha(await readFile(file));
const proofPath = path.join(proofDir, "build-proof.json"), sourcePath = path.join(proofDir, "input-lock.json");
const proofBytes = await readFile(proofPath), sourceBytes = await readFile(sourcePath);
const proof = JSON.parse(proofBytes), lock = JSON.parse(sourceBytes);
assert.equal(proof.status, "PASS_INSTALLED_BUILD_PROOF");
assert.equal(lock.status, "PASS_INSTALLED_PREPARATION");
assert.equal(proof.inputLockSha256, sha(sourceBytes));
assert.equal(proof.consumer, lock.consumer);
assert.equal(path.dirname(proof.consumer), await realpath(tmpdir()));
assert.ok(path.basename(proof.consumer).startsWith("r3act-closed-collection-rows-"));
assert.ok(Object.values(proof.assertions).length && Object.values(proof.assertions).every(Boolean));
const asyncProofPath = path.join(proofDir, "proof-pair-one-shot.json");
const asyncProofBytes = await readFile(asyncProofPath), asyncProof = JSON.parse(asyncProofBytes);
assert.equal(asyncProof.status, "PASS_UNTIMED_INSTALLED_ASYNC_UX_PROOF");
assert.equal(asyncProof.buildProofSha256, sha(proofBytes));
assert.equal(asyncProof.inputLockSha256, sha(sourceBytes));
const modes = ["native", "react"], assets = new Map();
for (const mode of modes) {
  const capture = proof.rows.captures[mode].value;
  assert.equal(capture.mode, mode);
  if (mode === "native") assert.ok(capture.templates.length >= 2);
  else assert.ok(capture.memoCalls.length && capture.compilerEvents.some(event => event.kind === "CompileSuccess" && event.fnName === "Row"));
  for (const item of proof.rows.assets[mode]) {
    assert.ok(item.urlPath.startsWith(`/rows/${mode}/`));
    assert.equal(item.path, path.join(proofDir, "row-dist", mode, item.urlPath.slice(`/rows/${mode}/`.length)));
    assert.ok(!assets.has(item.urlPath)); assets.set(item.urlPath, { ...item, mode });
  }
}
let authBytes = null, proofPairBytes = null;
const authorizationPath = path.join(proofDir, "rows-timing-authorization.json");
if (kind === "timing") {
  proofPairBytes = await readFile(path.join(proofDir, "rows-proof-pair-one-shot.json"));
  const prior = JSON.parse(proofPairBytes);
  assert.equal(prior.status, "PASS_UNTIMED_CLOSED_ROW_EPISODE");
  assert.equal(prior.buildProofSha256, sha(proofBytes));
  assert.equal(prior.inputLockSha256, sha(sourceBytes));
  authBytes = await readFile(authorizationPath);
  const authorization = JSON.parse(authBytes);
  assert.equal(authorization.status, "APPROVED_FOR_ONE_CLOSED_ROW_TIMING_PAIR");
  assert.equal(authorization.buildProofSha256, sha(proofBytes));
  assert.equal(authorization.inputLockSha256, sha(sourceBytes));
  assert.equal(authorization.proofPairSha256, sha(proofPairBytes));
  assert.equal(authorization.asyncProofSha256, sha(asyncProofBytes));
}
const outputPath = path.join(proofDir, `rows-${kind}-pair-one-shot.json`);
const record = { schemaVersion: "installed-closed-row-episode-v1", status: "STARTED", kind,
  sourceBefore: [], sourceAfter: [], servedAssets: [], blockedRequests: [], requestFailures: [],
  pageErrors: [], consoleErrors: [], errors: [], cleanupErrors: [], arms: [], browserClosed: false, stopReason: null,
  origin, transport: "Offline intercepted synthetic HTTPS; no server or live network",
  buildProofSha256: sha(proofBytes), inputLockSha256: sha(sourceBytes), asyncProofSha256: sha(asyncProofBytes),
  proofPairSha256: proofPairBytes ? sha(proofPairBytes) : null, authorizationSha256: authBytes ? sha(authBytes) : null,
  timingMeaning: kind === "timing" ? "24 synchronous operation through publication intervals, inspection and RAF outside; explicit Native grouped DOM/Three versus React Compiler DOM with Three layout effect; fixed order, no GC or retries, paint excluded" : null,
  bundleBytes: Object.fromEntries(modes.map(mode => [mode, proof.rows.assets[mode].filter(item => item.path.endsWith(".js")).reduce((sum, item) => sum + item.bytes, 0)])) };
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
  for (const mode of modes) {
    for (const item of [...proof.rows.assets[mode], ...proof.rows.transforms[mode], proof.rows.captures[mode]])
      await check(item.path, item.sha256, `${mode}-row-proof`);
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

async function runArm(arm) {
  let context, page, mounted = false;
  const entry = { arm, contextClosed: false, stages: [] };
  record.arms.push(entry);
  try {
    context = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
    page = await context.newPage();
    page.setDefaultTimeout(5000);
    page.on("pageerror", error => record.pageErrors.push({ arm, error: String(error) }));
    page.on("console", message => { if (message.type() === "error") record.consoleErrors.push({ arm, error: message.text() }); });
    page.on("requestfailed", request => record.requestFailures.push({ arm, url: request.url(), reason: request.failure()?.errorText }));
    await context.route("**/*", async route => {
      try {
        const url = new URL(route.request().url()), item = assets.get(url.pathname);
        if (url.origin !== origin || url.search || url.hash || !item || item.mode !== arm) {
          record.blockedRequests.push({ arm, url: url.href }); await route.abort(); return;
        }
        const body = await readFile(item.path); assert.equal(sha(body), item.sha256);
        record.servedAssets.push({ arm, url: url.pathname, sha256: item.sha256 });
        await route.fulfill({ status: 200, headers: { "content-type": item.path.endsWith(".html") ? "text/html" : "text/javascript", "cache-control": "no-store" }, body });
      } catch (error) { record.errors.push({ arm, operation: "route", error: String(error) }); try { await route.abort(); } catch {} }
    });
    const response = await page.goto(`${origin}/rows/${arm}/${proof.rows.entries[arm]}`, { waitUntil: "networkidle", timeout: remaining() });
    assert.equal(response.status(), 200);
    mounted = true;
    const episode = await page.evaluate(async timing => {
      const driver = window.closedRows;
      const frames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const initial = driver.mount();
      const stages = [initial], durations = [], expected = Array.from({ length: 64 }, (_, id) => ({ id, x: id }));
      const check = value => {
        const values = expected.map(item => item.x);
        if (JSON.stringify(value.values) !== JSON.stringify(values) || JSON.stringify(value.attributes) !== JSON.stringify(values) ||
            JSON.stringify(value.positions) !== JSON.stringify(values) || !value.identity || !value.pending) throw new Error('Row output/identity/pending mismatch');
      };
      check(initial);
      let quantum = Infinity, last = performance.now();
      for (let i = 0; i < 10000; i++) { const now = performance.now(); if (now > last) quantum = Math.min(quantum, now - last); last = now; }
      for (let index = 0; index < 24; index++) {
        const start = timing ? performance.now() : null;
        driver.step(index);
        if (timing) durations.push(performance.now() - start);
        const cycle = Math.floor(index / 3), id = 64 + cycle;
        if (index % 3 === 0) expected[0] = { id: 0, x: 1000 + index };
        else if (index % 3 === 1) expected.push({ id, x: 2000 + index });
        else expected.splice(expected.findIndex(item => item.id === id), 1);
        const value = driver.inspect(); check(value); stages.push(value);
        await frames();
      }
      const cleanup = driver.dispose();
      return { stages, durations, quantumMs: Number.isFinite(quantum) ? quantum : null, cleanup };
    }, kind === "timing");
    mounted = false;
    entry.stages = episode.stages; entry.cleanup = episode.cleanup; entry.quantumMs = episode.quantumMs;
    assert.equal(episode.stages.length, 25);
    assert.equal(episode.cleanup.hostChildren, 0); assert.equal(episode.cleanup.sceneChildren, 0);
    if (arm === "native") { assert.deepEqual(episode.cleanup.owners, [0, 0]); assert.deepEqual(episode.cleanup.pending, [0, 0]); }
    else assert.equal(episode.cleanup.listeners, 0);
    if (kind === "timing") {
      const sorted = [...episode.durations].sort((a, b) => a - b);
      assert.equal(sorted.length, 24);
      entry.timing = { samplesMs: episode.durations, medianMs: (sorted[11] + sorted[12]) / 2,
        p95Ms: sorted[Math.ceil(sorted.length * .95) - 1], sumMs: sorted.reduce((a, b) => a + b, 0),
        firstMs: episode.durations[0] };
    }
  } finally {
    if (page && mounted) try { await page.evaluate(() => window.closedRows?.dispose()); } catch (error) { record.cleanupErrors.push(String(error)); }
    if (context) { await closeWithin(() => context.close(), `${arm} context close`); entry.contextClosed = true; }
  }
}

let failure = null, candidateStatus = null, openingPromise, workPromise;
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
    const normalize = stage => ({ values: stage.values, attributes: stage.attributes, positions: stage.positions, identity: stage.identity, pending: stage.pending });
    assert.deepEqual(record.arms[0].stages.map(normalize), record.arms[1].stages.map(normalize));
    record.comparison = kind === "timing" ? { fixedOrder: modes, native: record.arms[0].timing, react: record.arms[1].timing } : null;
    await verify("sourceAfter");
    assert.equal(await hashFile(proofPath), sha(proofBytes));
    assert.equal(await hashFile(sourcePath), sha(sourceBytes));
    if (authBytes) assert.equal(await hashFile(authorizationPath), sha(authBytes));
    if (proofPairBytes) assert.equal(await hashFile(path.join(proofDir, "rows-proof-pair-one-shot.json")), sha(proofPairBytes));
    candidateStatus = kind === "proof" ? "PASS_UNTIMED_CLOSED_ROW_EPISODE" : "PASS_DESCRIPTIVE_CLOSED_ROW_TIMING_PAIR";
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
