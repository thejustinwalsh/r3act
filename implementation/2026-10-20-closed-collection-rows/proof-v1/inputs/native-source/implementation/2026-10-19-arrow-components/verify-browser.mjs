import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, "../..");
const at = process.argv.indexOf("--proof-dir");
assert.ok(at >= 0 && process.argv[at + 1], "usage: node verify-browser.mjs --proof-dir PROOF");
const proof = path.resolve(root, process.argv[at + 1]);
assert.ok(proof.startsWith(`${unit}${path.sep}`));
assert.equal(process.version, "v24.18.0");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = async file => sha(await readFile(file));
const buildBytes = await readFile(path.join(proof, "build-proof.json"));
const build = JSON.parse(buildBytes);
assert.equal(build.status, "PASS_INSTALLED_BUILD_PROOF");
const pairBytes = await readFile(path.join(proof, "pair-proof.json"));
const pair = JSON.parse(pairBytes);
assert.equal(pair.status, "PASS_UNTIMED_PAIR_PROOF");
const lock = JSON.parse(await readFile(path.join(proof, "input-lock.json"), "utf8"));
const target = path.join(proof, "browser-behavior.json");
try { await stat(target); throw new Error("Refusing a second browser behavior attempt"); }
catch (error) { if (error?.code !== "ENOENT") throw error; }
const verify = async () => {
  const rows = [];
  for (const row of lock.source) {
    const current = await hash(row.path), archived = await hash(row.archive);
    rows.push({ path: row.relative, expected: row.sha256, current, archived });
    assert.equal(current, row.sha256); assert.equal(archived, row.sha256);
  }
  for (const row of lock.packageSources) {
    assert.equal(await hash(row.path), row.sha256);
    assert.equal(await hash(row.archive), row.sha256);
  }
  for (const row of lock.consumerCopies) assert.equal(await hash(row.path), row.sha256);
  for (const row of [...lock.tarballs, ...lock.installed, lock.compiler]) {
    assert.equal(await hash(row.path), row.sha256);
    assert.equal(await hash(row.archive), row.sha256);
  }
  for (const row of [...build.transforms, ...build.assets]) assert.equal(await hash(row.path), row.sha256);
  for (const mode of ["native", "react"]) {
    for (const row of pair.transforms[mode]) assert.equal(await hash(path.join(proof,
      "comparison-proof", "transforms", mode, row.path)), row.sha256);
    for (const row of pair.assets[mode]) assert.equal(await hash(path.join(proof,
      "comparison-proof", "dist", mode, row.path)), row.sha256);
  }
  return rows;
};
const origin = "https://arrow-components.localhost";
const assets = new Map(build.assets.map(item => [item.urlPath, item]));
for (const mode of ["native", "react"]) for (const row of pair.assets[mode])
  assets.set(`/comparison-${mode}/${row.path}`, { path: path.join(proof, "comparison-proof", "dist", mode, row.path), sha256: row.sha256 });
assert.ok(assets.has("/index.html"));
const receipt = { status: "STARTED", buildProofSha256: sha(buildBytes), pairProofSha256: sha(pairBytes),
  origin, before: [], after: [], stages: [], comparison: {}, served: [], blocked: [],
  pageErrors: [], consoleErrors: [], requestFailures: [], stopReason: null, errors: [] };
await writeFile(target, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
let browser, timer;
let rejectStop;
const stopped = new Promise((_, reject) => { rejectStop = reject; });
void stopped.catch(() => {});
const stop = reason => {
  if (receipt.stopReason) return;
  receipt.stopReason = reason;
  rejectStop(new Error(`browser stopped: ${reason}`));
  void browser?.close().catch(() => {});
};
const interrupt = () => stop("signal");
try {
  receipt.before = await verify();
  process.once("SIGINT", interrupt); process.once("SIGTERM", interrupt);
  timer = setTimeout(() => stop("deadline-90s"), 90_000);
  const opening = openBrowser({ headless: true, gpu: false, handleSignals: false }).then(async instance => {
    if (receipt.stopReason) { await instance.close(); throw new Error("browser opened after stop"); }
    return instance;
  });
  browser = await Promise.race([opening, stopped]);
  receipt.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 800, height: 700 }, deviceScaleFactor: 1 });
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    const asset = url.origin === origin ? assets.get(url.pathname) : null;
    if (!asset) { receipt.blocked.push(url.href); await route.abort(); return; }
    const bytes = await readFile(asset.path);
    assert.equal(sha(bytes), asset.sha256);
    const type = url.pathname.endsWith(".html") ? "text/html; charset=utf-8" :
      url.pathname.endsWith(".js") ? "text/javascript; charset=utf-8" :
      url.pathname.endsWith(".css") ? "text/css; charset=utf-8" : "application/octet-stream";
    receipt.served.push(url.pathname);
    await route.fulfill({ status: 200, contentType: type, body: bytes });
  });
  const open = async pathname => {
    const page = await context.newPage();
    page.on("pageerror", error => receipt.pageErrors.push(String(error)));
    page.on("console", message => { if (message.type() === "error") receipt.consoleErrors.push(message.text()); });
    page.on("requestfailed", request => receipt.requestFailures.push(request.url()));
    await page.goto(`${origin}${pathname}`, { waitUntil: "load" });
    return page;
  };
  const page = await open("/index.html");
  await page.waitForFunction(() => {
    const value = window.arrowComponents?.snapshot();
    return value?.result === "A" && value.three.includes("result-A");
  });
  const observed = async () => page.evaluate(() => window.arrowComponents.snapshot());
  const call = async (method, ...args) => page.evaluate(async ([name, values]) => {
    await window.arrowComponents[name](...values);
  }, [method, args]);
  const initial = await observed();
  receipt.stages.push({ name: "initial", value: initial });
  assert.equal(initial.stage, "A");
  assert.equal(initial.urgent, "0");
  assert.equal(initial.detail, "ready-A");
  assert.deepEqual(initial.rows, [{ id: "a", count: "0" }, { id: "b", count: "0" }]);
  assert.ok(initial.three.includes("stage-A"));
  assert.ok(initial.three.includes("result-A"));
  assert.deepEqual(await page.locator("[data-badge]").evaluate(element => ({
    stage: element.getAttribute("data-badge"),
    lexicalArguments: element.getAttribute("data-lexical-arguments"),
    lexicalThis: element.getAttribute("data-lexical-this"),
  })), { stage: "A", lexicalArguments: "undefined", lexicalThis: "undefined" });
  await page.evaluate(() => { window.__arrowA = document.querySelector('[data-click="a"]'); });
  await call("click", "a");
  const clicked = await observed();
  receipt.stages.push({ name: "arrow-local-click", value: clicked });
  assert.deepEqual(clicked.rows, [{ id: "a", count: "1" }, { id: "b", count: "0" }]);
  assert.equal(clicked.life.mounts, initial.life.mounts);
  assert.equal(clicked.life.cleanups, initial.life.cleanups);
  assert.equal(clicked.life.conditionalMounts, initial.life.conditionalMounts + 1);
  assert.equal(clicked.life.conditionalCleanups, initial.life.conditionalCleanups);
  await call("reorder", ["b", "a", "c"]);
  const moved = await observed();
  receipt.stages.push({ name: "keyed-move-and-add", value: moved });
  assert.deepEqual(moved.rows, [{ id: "b", count: "0" }, { id: "a", count: "1" },
    { id: "c", count: "0" }]);
  assert.equal(await page.evaluate(() => window.__arrowA === document.querySelector('[data-click="a"]')), true);
  assert.equal(moved.life.conditionalMounts, clicked.life.conditionalMounts);
  assert.equal(moved.life.conditionalCleanups, clicked.life.conditionalCleanups);
  await call("reorder", ["a", "c"]);
  const removed = await observed();
  receipt.stages.push({ name: "keyed-removal", value: removed });
  assert.deepEqual(removed.rows, [{ id: "a", count: "1" }, { id: "c", count: "0" }]);
  assert.equal(removed.life.cleanups, moved.life.cleanups + 1);
  await call("click", "a");
  const conditionalOff = await observed();
  receipt.stages.push({ name: "conditional-effect-cleanup", value: conditionalOff });
  assert.deepEqual(conditionalOff.rows, [{ id: "a", count: "2" }, { id: "c", count: "0" }]);
  assert.equal(conditionalOff.life.conditionalCleanups, removed.life.conditionalCleanups + 1);
  await call("click", "a");
  const conditionalOn = await observed();
  receipt.stages.push({ name: "conditional-effect-reactivation", value: conditionalOn });
  assert.deepEqual(conditionalOn.rows, [{ id: "a", count: "3" }, { id: "c", count: "0" }]);
  assert.equal(conditionalOn.life.conditionalMounts, conditionalOff.life.conditionalMounts + 1);
  await call("publishStage", "B");
  const published = await observed();
  receipt.stages.push({ name: "dom-three-stage-B", value: published });
  assert.equal(published.stage, "B");
  assert.equal(await page.locator("[data-badge]").getAttribute("data-badge"), "B");
  assert.ok(published.three.includes("stage-B"));
  assert.equal(published.roots.dom.pendingChangeCount, 0);
  assert.equal(published.roots.three.pendingChangeCount, 0);
  await call("beginDetail");
  const pending = await observed();
  receipt.stages.push({ name: "pending-retains-accepted", value: pending });
  assert.equal(pending.result, "A");
  assert.equal(pending.detail, "ready-A");
  assert.ok(pending.three.includes("result-A"));
  await call("urgent");
  await page.waitForFunction(() => {
    const value = window.arrowComponents?.snapshot();
    return value?.urgent === "1" && value.three.includes("urgent-1");
  });
  const urgent = await observed();
  receipt.stages.push({ name: "urgent-progress-under-pending", value: urgent });
  assert.equal(urgent.urgent, "1");
  assert.ok(urgent.three.includes("urgent-1"));
  assert.equal(urgent.result, "A");
  await call("rejectDetail", "first-provider-failed");
  await page.waitForFunction(() => {
    const value = window.arrowComponents?.snapshot();
    return value?.error?.includes("first-provider-failed") &&
      value.three.some(name => name.includes("result-error-first-provider-failed"));
  });
  const rejected = await observed();
  receipt.stages.push({ name: "accepted-error", value: rejected });
  assert.ok(rejected.error.includes("first-provider-failed"));
  assert.ok(rejected.three.some(name => name.includes("result-error")));
  await call("beginDetail");
  await call("beginDetail");
  await call("resolveRetiredDetail", "discarded");
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
  const stale = await observed();
  receipt.stages.push({ name: "stale-result-discarded", value: stale });
  assert.equal(stale.result, null);
  assert.ok(stale.error.includes("first-provider-failed"));
  assert.ok(!stale.three.includes("result-stale"));
  await call("resolveDetail", "ready-B");
  await page.waitForFunction(() => {
    const value = window.arrowComponents?.snapshot();
    return value?.detail === "ready-B" && value.three.includes("result-B");
  });
  const resolved = await observed();
  receipt.stages.push({ name: "resolved-dom-three", value: resolved });
  assert.equal(resolved.stage, "B");
  assert.equal(resolved.result, "B");
  assert.equal(resolved.detail, "ready-B");
  assert.ok(resolved.three.includes("result-B"));
  assert.deepEqual(resolved.rows, conditionalOn.rows);
  await call("dispose");
  const disposed = await observed();
  receipt.stages.push({ name: "disposed", value: disposed });
  assert.equal(disposed.disposed, true);
  assert.equal(await page.locator("#app").evaluate(element => element.childElementCount), 0);
  assert.equal(disposed.roots.dom.ownerCount, 0);
  assert.equal(disposed.roots.three.ownerCount, 0);
  assert.deepEqual(disposed.three, []);
  assert.equal(disposed.threeHost.liveHandles, 0);
  assert.equal(disposed.threeHost.liveResources, 0);
  assert.equal(disposed.threeHost.eventRegistrations, 0);
  assert.equal(disposed.threeHost.createdResources, disposed.threeHost.disposedResources);
  assert.equal(disposed.life.mounts, disposed.life.cleanups);
  assert.equal(disposed.life.conditionalMounts, disposed.life.conditionalCleanups);
  assert.equal(disposed.life.resultMounts, disposed.life.resultCleanups);
  for (const store of [disposed.stores.stage, disposed.stores.urgent]) {
    assert.equal(store.roots, 0);
    assert.equal(store.listeners, 0);
    assert.equal(store.readers, 0);
    assert.equal(store.transitions, 0);
  }

  const normalized = {};
  for (const mode of ["native", "react"]) {
    const compared = await open(`/comparison-${mode}/index.html`);
    await compared.waitForFunction(() => window.comparison?.snapshot()?.count === "0");
    const take = async () => compared.evaluate(() => window.comparison.snapshot());
    const before = await take();
    assert.deepEqual(before, { count: "0", title: "Arrow counter", button: "Increment" });
    await compared.locator("button").click();
    await compared.waitForFunction(() => window.comparison?.snapshot()?.count === "1");
    const after = await take();
    assert.deepEqual(after, { count: "1", title: "Arrow counter", button: "Increment" });
    normalized[mode] = { before, after };
    await compared.evaluate(() => window.comparison.dispose());
    assert.equal(await compared.locator("#app").evaluate(element => element.childElementCount), 0);
    await compared.close();
  }
  assert.deepEqual(normalized.native, normalized.react);
  receipt.comparison = normalized;
  assert.deepEqual(receipt.blocked, []);
  assert.deepEqual(receipt.pageErrors, []);
  assert.deepEqual(receipt.consoleErrors, []);
  assert.deepEqual(receipt.requestFailures, []);
  await page.close();
  await context.close();
  receipt.after = await verify();
  assert.equal(receipt.stopReason, null, "browser deadline or interruption");
  receipt.status = "PASS_BROWSER_BEHAVIOR";
} catch (error) {
  receipt.status = "FAIL_OR_INCOMPLETE";
  receipt.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
} finally {
  if (timer) clearTimeout(timer);
  process.off("SIGINT", interrupt); process.off("SIGTERM", interrupt);
  try { await browser?.close(); } catch (error) { receipt.errors.push(String(error)); receipt.status = "FAIL_OR_INCOMPLETE"; }
  if (receipt.stopReason !== null || receipt.errors.length !== 0) receipt.status = "FAIL_OR_INCOMPLETE";
  await writeFile(target, JSON.stringify(receipt, null, 2) + "\n");
}
if (receipt.status !== "PASS_BROWSER_BEHAVIOR") {
  console.error(receipt.errors.join("\n")); process.exitCode = 1;
} else console.log(JSON.stringify({ status: receipt.status, receipt: target }));
