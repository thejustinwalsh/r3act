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
assert.ok(args.includes("--proof-dir"),
  "usage: node verify-browser.mjs --proof-dir DIR");
const proof = path.resolve(root, option("--proof-dir"));
assert.ok(proof.startsWith(`${unit}${path.sep}`));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = async file => sha(await readFile(file));
const buildBytes = await readFile(path.join(proof, "build-proof.json"));
const build = JSON.parse(buildBytes);
assert.equal(build.status, "PASS_INSTALLED_BUILD_PROOF");
const pairBytes = await readFile(path.join(proof, "pair-proof.json"));
const pair = JSON.parse(pairBytes);
assert.equal(pair.status, "PASS_UNTIMED_BUILD_PAIR");
assert.equal(pair.buildProofSha256, sha(buildBytes));
const consumer = build.consumer;
assert.equal(path.dirname(consumer), await realpath(tmpdir()));
assert.ok(path.basename(consumer).startsWith("r3act-runtime-import-origin-"));
const lock = JSON.parse(await readFile(path.join(proof, "input-lock.json"), "utf8"));
const receiptPath = path.join(proof, "browser-untimed.json");
const origin = "https://runtime-import-origin-proof.invalid";
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
const result = { phase: "proof", status: "STARTED", buildProofSha256: sha(buildBytes),
  pairProofSha256: sha(pairBytes), browserVersion: null,
  inputBefore: [], inputAfter: [], transformBefore: [], transformAfter: [],
  assetBefore: [], assetAfter: [], served: [],
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
  assert.equal(lock.stagedSource.schemaVersion, 1);
  for (const item of lock.stagedSource.files) {
    assert.equal(await hash(path.join(root, item.path)), item.sha256);
    assert.equal(await hash(path.join(proof, "inputs", "native-source", item.path)), item.sha256);
  }
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
  const transformField = field === "inputBefore" ? "transformBefore" : "transformAfter";
  for (const mode of ["native", "react"]) {
    for (const item of pair.transforms[mode]) {
      assert.equal(await hash(path.join(proof, "comparison-proof", "transforms", mode, item.path)), item.sha256);
      result[transformField].push({ mode, ...item });
    }
    for (const item of pair.assets[mode]) assert.equal(
      await hash(path.join(proof, "comparison-proof", "dist", mode, item.path)), item.sha256);
  }
};
const verifyAssets = async field => {
  for (const [routePath, item] of assets) {
    const bytes = await readFile(item.file);
    assert.equal(bytes.length, item.bytes);
    assert.equal(sha(bytes), item.sha256);
    result[field].push({ routePath, sha256: item.sha256, bytes: item.bytes });
  }
};
const snapshot = page => page.evaluate(() => window.replacementProof?.snapshot());
const wait = (page, predicate) => page.waitForFunction(predicate, null, { timeout: 12_000 });
const closeWithin = async (close, label) => {
  let timer;
  try {
    await Promise.race([close(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out`)), 5_000);
    })]);
  } finally { clearTimeout(timer); }
};
const comparable = state => Object.fromEntries([
  "origin", "request", "accepted", "fork", "scene", "urgent", "statuses", "started", "settled",
].map(name => [name, state[name]]));
const nativeStages = new Map();
let browser, context, rejectStop, deadline, activePage;
const mark = (mode, stage) => { result.activePhase = { mode, stage }; };
const checkpoint = async (page, mode, stage) => {
  mark(mode, stage);
  const state = await snapshot(page);
  result.stages.push({ mode, stage, snapshot: state });
  if (mode === "native") nativeStages.set(stage, comparable(state));
  else assert.deepEqual(comparable(state), nativeStages.get(stage),
    `Native and React behavior differ at ${stage}`);
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
    try {
      const bytes = await readFile(item.file);
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
    for (const order of [["A", "B"], ["B", "A"]]) {
      const episode = order.join("-");
      mark(mode, `${episode}:new-page`);
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
      mark(mode, `${episode}:navigation`);
      const response = await Promise.race([page.goto(`${origin}/${mode}/index.html`,
        { waitUntil: "networkidle", timeout: 15_000 }), stopped]);
      assert.equal(response?.status(), 200);
      await wait(page, () => window.replacementProof?.snapshot()?.statuses?.A === "pending");
      const initial = await checkpoint(page, mode, `${episode}:initial`);
      assert.equal(initial.accepted, "old");
      assert.equal(initial.origin, "custom:shared|substring:shared");
      assert.ok(initial.originCalls > 0 && initial.substringCalls > 0);
      assert.equal(initial.fork, "old");
      assert.equal(initial.scene, "old");
      assert.deepEqual(initial.started, ["A"]);
      mark(mode, `${episode}:replace`);
      await page.evaluate(() => window.replacementProof.replace());
      await wait(page, () => window.replacementProof?.snapshot()?.statuses?.B === "cancelled");
      const replaced = await checkpoint(page, mode, `${episode}:runtime-import-origin`);
      assert.equal(replaced.statuses.A, "cancelled");
      assert.equal(replaced.statuses.B, "cancelled");
      assert.equal(replaced.statuses.C, "pending");
      assert.deepEqual(replaced.started, ["A", "C"]);
      const cancelledCompletions = await page.evaluate(async () => [
        (await window.replacementProof.wait("A"))?.status,
        (await window.replacementProof.wait("B"))?.status,
      ]);
      assert.deepEqual(cancelledCompletions, ["cancelled", "cancelled"]);
      assert.equal(replaced.accepted, "old");
      assert.equal(replaced.fork, "old");
      assert.equal(replaced.scene, "old");
      mark(mode, `${episode}:urgent`);
      await page.evaluate(() => window.replacementProof.startUrgent());
      await page.evaluate(() => window.replacementProof.settle("urgent", "urgent-ready"));
      await wait(page, () => window.replacementProof?.snapshot()?.urgent === "urgent-ready");
      const urgent = await checkpoint(page, mode, `${episode}:independent-urgent`);
      assert.equal(urgent.accepted, "old");
      assert.equal(urgent.statuses.C, "pending");
      for (const stale of order) {
        mark(mode, `${episode}:stale-${stale}`);
        await page.evaluate(label => window.replacementProof.settle(label, `stale-${label}`), stale);
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
        const state = await checkpoint(page, mode, `${episode}:stale-${stale}`);
        assert.equal(state.accepted, "old");
        assert.equal(state.fork, "old");
        assert.equal(state.scene, "old");
        assert.equal(state.statuses.C, "pending");
      }
      mark(mode, `${episode}:winner`);
      await page.evaluate(() => window.replacementProof.settle("C", "winner"));
      await wait(page, () => {
        const state = window.replacementProof?.snapshot();
        return state?.accepted === "winner" && state.fork === "winner" &&
          state.scene === "winner" && state.statuses.C === "committed";
      });
      const winner = await checkpoint(page, mode, `${episode}:winner`);
      assert.equal(winner.statuses.urgent, "committed");
      assert.equal(winner.origin, "custom:shared|substring:shared");
      assert.ok(winner.originCalls > 0 && winner.substringCalls > 0);
      const committedCompletions = await page.evaluate(async () => [
        (await window.replacementProof.wait("C"))?.status,
        (await window.replacementProof.wait("urgent"))?.status,
      ]);
      assert.deepEqual(committedCompletions, ["committed", "committed"]);
      assert.deepEqual(winner.started, ["A", "C", "urgent"]);
      assert.equal(winner.settled.filter(value => value === "A:cancelled").length, 1);
      assert.equal(winner.settled.filter(value => value === "B:cancelled").length, 1);
      assert.equal(winner.settled.filter(value => value === "C:committed").length, 1);
      assert.equal(winner.settled.filter(value => value === "urgent:committed").length, 1);
      mark(mode, `${episode}:dispose`);
      await page.evaluate(() => window.replacementProof.dispose());
      const disposed = await snapshot(page);
      result.stages.push({ mode, stage: `${episode}:disposed`, snapshot: disposed });
      assert.equal(disposed.disposed, true);
      for (const [label, count] of Object.entries(disposed.mounts ?? {}))
        assert.equal(disposed.cleanups[label], count, `${mode} ${label} leaked`);
      if (mode === "native") {
        for (const name of ["dom", "three", "forkDiagnostics", "urgentDiagnostics"])
          assert.equal(disposed[name].ownerCount, 0, `${name} retained owners`);
        assert.equal(disposed.threeHost.liveHandles, 0);
        assert.equal(disposed.threeHost.liveResources, 0);
      }
      result.episodes.push({ mode, episode, initial, replaced, urgent, winner, disposed });
      await page.close();
      activePage = undefined;
    }
  }
  assert.deepEqual(result.errors, []);
  await verify("inputAfter");
  await verifyAssets("assetAfter");
  assert.deepEqual(result.inputAfter, result.inputBefore);
  assert.deepEqual(result.transformAfter, result.transformBefore);
  assert.deepEqual(result.assetAfter, result.assetBefore);
  assert.ok(result.served.some(item => item.path === "/native/index.html"));
  assert.ok(result.served.some(item => item.path === "/react/index.html"));
} catch (error) {
  mainError = error;
  result.errors.push({ kind: "verifier", phase: result.activePhase,
    message: error instanceof Error ? error.stack ?? String(error) : String(error) });
  if (activePage) {
    try {
      const failedState = await Promise.race([snapshot(activePage), new Promise((_, reject) =>
        setTimeout(() => reject(new Error("failure snapshot timed out")), 5_000))]);
      result.stages.push({ kind: "failure-snapshot", phase: result.activePhase, snapshot: failedState });
    } catch (snapshotError) {
      result.stages.push({ kind: "failure-snapshot-error", phase: result.activePhase,
        message: String(snapshotError) });
    }
  }
} finally {
  if (context) {
    try { await closeWithin(() => context.close(), "context close"); result.contextClosed = true; }
    catch (error) { result.errors.push({ kind: "context-close", message: String(error) }); }
  }
  if (browser) {
    try { await closeWithin(() => browser.close(), "browser close"); result.browserClosed = true; }
    catch (error) { result.errors.push({ kind: "browser-close", message: String(error) }); }
  }
  if (deadline) clearTimeout(deadline);
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", interrupt);
  result.status = !mainError && !result.stopReason && result.errors.length === 0 &&
    result.contextClosed && result.browserClosed ? "PASS_UNTIMED_BROWSER" : "FAIL_OR_INCOMPLETE";
  await writeFile(receiptPath, JSON.stringify(result, null, 2) + "\n");
}
if (result.status === "FAIL_OR_INCOMPLETE") {
  console.error(result.errors.map(item => item.message ?? JSON.stringify(item)).join("\n"));
  process.exitCode = 1;
} else console.log(JSON.stringify({ status: result.status, receiptPath }));
