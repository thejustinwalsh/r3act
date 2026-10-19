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
const origin = "https://custom-host.localhost";
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
  await page.waitForFunction(() => window.customHostDemo?.snapshot().frame.length > 0);
  const observed = async () => await page.evaluate(() => {
    const api = window.customHostDemo;
    const value = api.snapshot();
    const context = document.querySelector("#app canvas")?.getContext("2d");
    const pixel = (x, y) => context ? [...context.getImageData(x, y, 1, 1).data] : null;
    return { ...value,
      pixels: { first: pixel(20, 20), second: pixel(20, 65) },
      hostChildren: document.querySelector("#app")?.childElementCount ?? null };
  });
  const call = async (method, ...args) => await page.evaluate(async ([name, values]) => {
    await window.customHostDemo[name](...values);
  }, [method, args]);
  const initial = await observed();
  receipt.stages.push({ name: "initial-A", value: initial });
  assert.equal(initial.domStage, "A"); assert.equal(initial.threeStage, "stage-A");
  assert.deepEqual(initial.rows, ["shared-a", "shared-b", "owned", "borrowed"]);
  assert.equal(initial.frame[0]?.text, "stage-A");
  assert.deepEqual(initial.pixels.first, [71, 117, 173, 255]);
  assert.equal(initial.brushes.borrowed, 0);
  await page.evaluate(() => { window.__customShared = window.customHostDemo.handle("shared-a"); });
  await call("click", "shared-a");
  const clicked = await observed(); receipt.stages.push({ name: "click-retained", value: clicked });
  assert.ok(clicked.frame.some(command => command.name === "shared-a-label" && command.text === "shared-a:1"));
  assert.deepEqual(clicked.life, initial.life);
  assert.equal(await page.evaluate(() => window.__customShared === window.customHostDemo.handle("shared-a")), true);
  await call("move");
  const moved = await observed(); receipt.stages.push({ name: "keyed-move", value: moved });
  assert.deepEqual(moved.rows, ["borrowed", "owned", "shared-b", "shared-a"]);
  assert.ok(moved.frame.some(command => command.name === "shared-a-label" && command.text === "shared-a:1"));
  assert.equal(await page.evaluate(() => window.__customShared === window.customHostDemo.handle("shared-a")), true);
  assert.deepEqual(moved.pixels.first, [166, 93, 75, 255]);
  await call("removeSharedFirst");
  const oneShared = await observed(); receipt.stages.push({ name: "one-shared-lease", value: oneShared });
  assert.equal(oneShared.brushes.shared, 0);
  assert.equal(await page.evaluate(() => window.customHostDemo.lateClick()), false);
  await call("removeSharedLast");
  const noShared = await observed(); receipt.stages.push({ name: "last-shared-release", value: noShared });
  assert.equal(noShared.brushes.shared, 1);
  assert.equal(noShared.brushes.borrowed, 0);
  await call("replaceOwnedBrush");
  const replaced = await observed(); receipt.stages.push({ name: "owned-brush-replace", value: replaced });
  assert.equal(replaced.brushes.owned, 1);
  assert.equal(replaced.brushes.replacement, 0);
  assert.equal(replaced.brushes.borrowed, 0);
  await call("publishB");
  const published = await observed(); receipt.stages.push({ name: "three-root-B", value: published });
  assert.equal(published.domStage, "B"); assert.equal(published.threeStage, "stage-B");
  assert.equal(published.frame[0]?.text, "stage-B"); assert.equal(published.stageHead, "B");
  assert.ok(published.publicationObservations.some(item => item.domStage === "B" &&
    item.threeStage === "stage-B" && item.canvasStage === "stage-B"),
  "a Store notification must observe all three published roots");
  assert.equal(published.roots.dom.pendingChangeCount, 0);
  assert.equal(published.roots.canvas.pendingChangeCount, 0);
  await call("dispose");
  const disposed = await observed(); receipt.stages.push({ name: "disposed", value: disposed });
  assert.equal(disposed.disposed, true); assert.equal(disposed.hostChildren, 0);
  assert.equal(disposed.host.liveHandles, 0); assert.equal(disposed.host.liveResources, 0);
  assert.equal(disposed.host.eventRegistrations, 0);
  assert.equal(disposed.roots.dom.ownerCount, 0); assert.equal(disposed.roots.canvas.ownerCount, 0);
  assert.equal(disposed.roots.three.ownerCount, 0);
  assert.equal(disposed.brushes.borrowedAtHostDisposal, 0);
  assert.equal(disposed.brushes.borrowed, 1);
  assert.equal(disposed.brushes.replacement, 1);
  assert.equal(disposed.life.mounts, disposed.life.cleanups);

  const normalized = {};
  for (const mode of ["native", "react"]) {
    const compared = await open(`/comparison-${mode}/index.html`);
    await compared.waitForFunction(() => window.comparison?.snapshot()?.count === "0" &&
      window.comparison.snapshot().pixel?.join(",") === "34,126,112,255");
    const take = async () => await compared.evaluate(() => {
      const value = window.comparison.snapshot();
      return { count: value.count, pixel: value.pixel, growthPixel: value.growthPixel,
        title: document.querySelector("h1")?.textContent ?? null,
        button: document.querySelector("button")?.textContent ?? null,
        canvasSize: [document.querySelector("canvas")?.width, document.querySelector("canvas")?.height] };
    });
    const before = await take();
    assert.equal(before.count, "0"); assert.deepEqual(before.pixel, [34, 126, 112, 255]);
    assert.deepEqual(before.growthPixel, [0, 0, 0, 0]);
    await compared.locator("button").click();
    await compared.waitForFunction(() => window.comparison?.snapshot()?.count === "1" &&
      window.comparison.snapshot().growthPixel?.join(",") === "34,126,112,255");
    const after = await take();
    assert.equal(after.count, "1"); assert.deepEqual(after.pixel, before.pixel);
    assert.deepEqual(after.growthPixel, [34, 126, 112, 255]);
    normalized[mode] = { before, after };
    const afterDisposal = await compared.evaluate(() => {
      window.comparison.dispose();
      return window.comparison.snapshot();
    });
    if (mode === "native") {
      assert.equal(afterDisposal.brushDisposals, 1);
      assert.equal(afterDisposal.canvasNodes, 0);
    }
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
  receipt.status = "PASS_BROWSER_BEHAVIOR";
} catch (error) {
  receipt.status = "FAIL_OR_INCOMPLETE";
  receipt.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
} finally {
  if (timer) clearTimeout(timer);
  process.off("SIGINT", interrupt); process.off("SIGTERM", interrupt);
  try { await browser?.close(); } catch (error) { receipt.errors.push(String(error)); receipt.status = "FAIL_OR_INCOMPLETE"; }
  await writeFile(target, JSON.stringify(receipt, null, 2) + "\n");
}
if (receipt.status !== "PASS_BROWSER_BEHAVIOR") {
  console.error(receipt.errors.join("\n")); process.exitCode = 1;
} else console.log(JSON.stringify({ status: receipt.status, receipt: target }));
