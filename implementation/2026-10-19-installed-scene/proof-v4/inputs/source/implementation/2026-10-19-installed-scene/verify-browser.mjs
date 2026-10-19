import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, "../..");
const args = process.argv.slice(2);
assert.ok(args.includes("--proof-dir"), "usage: node verify-browser.mjs --proof-dir PROOF");
const proof = path.resolve(root, args[args.indexOf("--proof-dir") + 1]);
assert.ok(proof.startsWith(`${unit}${path.sep}`));
assert.equal(process.version, "v24.18.0");
const receiptPath = path.join(proof, "browser-conformance.json");
try { await stat(receiptPath); throw new Error("refusing to repeat browser conformance"); }
catch (error) { if (error?.code !== "ENOENT") throw error; }
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hashFile = async filename => sha(await readFile(filename));
const proofBytes = await readFile(path.join(proof, "build-proof.json"));
const buildProof = JSON.parse(proofBytes);
assert.equal(buildProof.status, "PASS_SCENE_BUILD_PROOF");
const sourceLock = JSON.parse(await readFile(path.join(proof, "input-lock.json"), "utf8"));
const pairProofBytes = await readFile(path.join(proof, "pair-proof.json"));
const pairProof = JSON.parse(pairProofBytes);
assert.equal(pairProof.status, "PASS_UNTIMED_PAIR_PROOF");
const assets = buildProof.assets.filter(item => item.mode === "scene");
const assetByUrl = new Map(assets.map(item => [item.urlPath, item]));
for (const name of ["native", "react"]) for (const item of pairProof.assets[name]) {
  const filename = path.join(proof, "comparison-proof", "dist", name, item.path);
  assetByUrl.set(`/comparison-${name}/${item.path}`, { path: filename, sha256: item.sha256 });
}
assert.ok(assetByUrl.has("/index.html"));
const origin = "https://installed-scene.localhost";
const result = { status: "STARTED", buildProofSha256: sha(proofBytes), origin,
  browserVersion: null, inputsBefore: [], inputsAfter: [], stages: [], comparisonOutput: {}, servedAssets: [],
  blockedRequests: [], requestFailures: [], pageErrors: [], consoleErrors: [], errors: [], stopReason: null };
const verify = async field => {
  for (const item of sourceLock.source) {
    const actual = await hashFile(path.join(root, item.path));
    result[field].push({ path: item.path, expected: item.sha256, actual });
    assert.equal(actual, item.sha256, `${field} source drift: ${item.path}`);
    if (!item.path.startsWith("implementation/2026-10-19-installed-scene/proof-"))
      assert.equal(await hashFile(path.join(proof, "inputs/source", item.path)), item.sha256);
  }
  for (const item of sourceLock.tarballs) {
    const actual = await hashFile(path.join(root, item.path));
    result[field].push({ path: item.path, expected: item.sha256, actual });
    assert.equal(actual, item.sha256, `${field} tarball drift: ${item.path}`);
  }
  for (const item of sourceLock.installedGraph) for (const file of item.files)
    assert.equal(await hashFile(path.join(root, item.root, file.path)), file.sha256,
      `${field} installed graph drift: ${item.name}/${file.path}`);
  for (const item of sourceLock.consumerCopies) assert.equal(await hashFile(item.path), item.sha256);
  assert.equal(await hashFile(sourceLock.compiler.consumerPath), sourceLock.compiler.sha256);
  for (const item of assets) assert.equal(await hashFile(path.join(root, item.path)), item.sha256);
  for (const item of buildProof.transforms) assert.equal(await hashFile(path.join(root, item.path)), item.sha256);
  for (const name of ["native", "react"]) for (const item of pairProof.assets[name])
    assert.equal(await hashFile(path.join(proof, "comparison-proof", "dist", name, item.path)), item.sha256);
};
let browser, deadline, failed = false;
let rejectStop;
const stopped = new Promise((_, reject) => { rejectStop = reject; });
void stopped.catch(() => {});
const stop = reason => { if (result.stopReason) return; result.stopReason = reason;
  rejectStop(new Error(`browser stopped: ${reason}`)); void browser?.close().catch(() => {}); };
const interrupt = () => stop("signal");
try {
  await verify("inputsBefore");
  process.once("SIGINT", interrupt); process.once("SIGTERM", interrupt);
  deadline = setTimeout(() => stop("deadline-90s"), 90_000);
  const opening = openBrowser({ headless: true, gpu: false, handleSignals: false }).then(async instance => {
    if (result.stopReason) { await instance.close(); throw new Error("browser opened after stop"); }
    return instance;
  });
  browser = await Promise.race([opening, stopped]);
  result.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  try {
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      const asset = url.origin === origin ? assetByUrl.get(url.pathname) : null;
      if (!asset) { result.blockedRequests.push({ url: url.href }); await route.abort(); return; }
      const body = await readFile(path.isAbsolute(asset.path) ? asset.path : path.join(root, asset.path));
      assert.equal(sha(body), asset.sha256);
      const type = url.pathname.endsWith(".html") ? "text/html; charset=utf-8" :
        url.pathname.endsWith(".js") ? "text/javascript; charset=utf-8" :
        url.pathname.endsWith(".css") ? "text/css; charset=utf-8" : "application/octet-stream";
      result.servedAssets.push({ urlPath: url.pathname, sha256: asset.sha256 });
      await route.fulfill({ status: 200, headers: { "content-type": type, "cache-control": "no-store" }, body });
    });
    const page = await context.newPage();
    page.on("pageerror", error => result.pageErrors.push(String(error)));
    page.on("console", message => { if (message.type() === "error") result.consoleErrors.push(message.text()); });
    page.on("requestfailed", request => result.requestFailures.push({ url: request.url(), error: request.failure()?.errorText }));
    const response = await Promise.race([page.goto(`${origin}/index.html`, { waitUntil: "networkidle" }), stopped]);
    assert.equal(response?.status(), 200);
    const snap = () => page.evaluate(() => window.installedScene?.snapshot());
    const call = name => page.evaluate(method => window.installedScene[method](), name);
    const until = predicate => page.waitForFunction(predicate, null, { timeout: 10_000 });
    await until(() => Boolean(window.installedScene?.snapshot()?.sceneCursorX === 1));
    const initial = await snap(); result.stages.push({ name: "initial", snapshot: initial });
    assert.equal(initial.domDetail, "waiting"); assert.equal(initial.health, "waiting");
    assert.equal(initial.sceneSignalName, "signal-waiting"); assert.equal(initial.domPoint, "1");
    assert.equal(initial.cursorRetained, true); assert.equal(initial.dialogRetained, true);
    await call("settleA"); await page.evaluate(() => Promise.resolve());
    assert.equal((await snap()).domDetail, "waiting", "A revealed before B");
    await page.evaluate(() => window.installedScene.updatePoint(2));
    await until(() => window.installedScene.snapshot().domPoint === "2");
    const pending = await snap(); result.stages.push({ name: "independent-progress", snapshot: pending });
    assert.equal(pending.sceneCursorX, 2); assert.equal(pending.cursorRetained, true);
    assert.equal(pending.health, "waiting");
    await call("settleB");
    await until(() => window.installedScene.snapshot().revealCallbacks === 1);
    const revealed = await snap(); result.stages.push({ name: "joint-reveal", snapshot: revealed });
    assert.equal(revealed.domDetail, "3"); assert.equal(revealed.domJoint, "5");
    assert.equal(revealed.sceneSignalName, "signal-ready"); assert.equal(revealed.sceneSignalX, 5);
    assert.equal(revealed.revealView, "3:5"); assert.equal(revealed.revealStatus, "committed");
    assert.equal(revealed.health, "waiting", "joint reveal waited for unrelated health");
    await page.locator('[data-action="move"]').click();
    await until(() => window.installedScene.snapshot().domPoint === "3");
    const event = await snap(); result.stages.push({ name: "native-event", snapshot: event });
    assert.equal(event.sceneCursorX, 3); assert.equal(event.domJoint, "6");
    assert.equal(event.positionView, "3:3"); assert.equal(event.cursorRetained, true);
    assert.equal(event.health, "waiting", "native event waited for unrelated health");
    await call("settleHealth");
    await until(() => window.installedScene.snapshot().health === "healthy");
    result.stages.push({ name: "independent-health", snapshot: await snap() });
    const baseline = await page.evaluate(() => {
      const sentinel = document.createElement("button");
      sentinel.id = "outside-sentinel"; sentinel.textContent = "Outside sentinel";
      document.body.append(sentinel);
      const portalSentinel = document.createElement("span");
      portalSentinel.id = "portal-sentinel"; portalSentinel.textContent = "Portal sentinel";
      document.querySelector("#dialog-portal").append(portalSentinel);
      sentinel.focus();
      return { bodyStyle: document.body.getAttribute("style"),
        bodyScrollLock: document.body.getAttribute("data-scroll-locked"),
        bodyAria: document.body.getAttribute("aria-hidden"),
        sentinelAria: sentinel.getAttribute("aria-hidden"),
        portalParent: document.querySelector("#dialog-portal")?.parentElement?.tagName,
        portalElement: document.querySelector("#dialog-portal")?.id,
        portalSentinelConnected: portalSentinel.isConnected,
        portalChildCount: document.querySelector("#dialog-portal")?.childElementCount,
        focusGuards: document.querySelectorAll('[data-radix-focus-guard]').length,
        sentinelConnected: sentinel.isConnected };
    });
    await call("externalOpen");
    await until(() => Boolean(document.querySelector('#dialog-portal [role="dialog"]')));
    const dialog = page.locator('#dialog-portal [role="dialog"]');
    assert.equal(await dialog.getAttribute("aria-modal"), "true");
    const labelledBy = await dialog.getAttribute("aria-labelledby");
    const describedBy = await dialog.getAttribute("aria-describedby");
    assert.ok(labelledBy); assert.ok(describedBy);
    assert.equal(await page.evaluate(id => document.getElementById(id)?.textContent, labelledBy), "Scene settings");
    assert.equal(await page.evaluate(id => document.getElementById(id)?.textContent, describedBy),
      "A controlled dialog for this scene");
    const note = page.locator('#dialog-portal input[aria-label="Dialog note"]');
    await note.focus();
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Close settings");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Dialog note");
    await note.fill("retained note");
    await note.evaluate(element => element.setSelectionRange(2, 7));
    await page.evaluate(() => { window.__installedNoteIdentity = document.querySelector('#dialog-portal input[aria-label="Dialog note"]'); });
    await page.locator('#dialog-portal [data-dialog-local]').click();
    const beforeReorder = await snap();
    await call("reorder");
    const reordered = await snap(); result.stages.push({ name: "keyed-reorder", snapshot: reordered });
    assert.equal(reordered.dialogRetained, true); assert.equal(reordered.noteValue, "retained note");
    assert.equal(reordered.noteSelectionStart, 2);
    assert.equal(reordered.noteSelectionEnd, 7);
    assert.equal(reordered.dialogLocalCount, "1");
    assert.equal(await page.evaluate(() => window.__installedNoteIdentity ===
      document.querySelector('#dialog-portal input[aria-label="Dialog note"]')), true);
    assert.equal(await page.evaluate(() => document.querySelector('#dialog-portal input[aria-label="Dialog note"]')?.selectionEnd), 7);
    assert.equal(reordered.dialogMounts, beforeReorder.dialogMounts);
    await page.keyboard.press("Escape");
    await until(() => !document.querySelector('#dialog-portal [role="dialog"]'));
    assert.equal((await snap()).dialogOpen, false);
    await call("externalOpen");
    await until(() => Boolean(document.querySelector('#dialog-portal [role="dialog"]')));
    await page.locator('#dialog-portal button').last().click();
    await until(() => !document.querySelector('#dialog-portal [role="dialog"]'));
    assert.equal((await snap()).dialogOpen, false);
    await call("removeDialog");
    await until(() => { const view = window.installedScene.snapshot();
      return !view.dialogPresent && view.portalChildCount === 1 && view.dialogCleanups === view.dialogMounts; });
    const removed = await snap(); result.stages.push({ name: "removed", snapshot: removed });
    assert.equal(removed.portalChildCount, 1);
    assert.equal(removed.dialogCleanups, removed.dialogMounts);
    await call("reinsertDialog");
    await until(() => window.installedScene.snapshot().dialogPresent);
    assert.equal((await snap()).dialogRetained, false);
    await call("externalOpen");
    await until(() => Boolean(document.querySelector('#dialog-portal [role="dialog"]')));
    await call("dispose");
    await until(() => { const view = window.installedScene.snapshot();
      return view.portalChildCount === 1 && view.dialogCleanups === view.dialogMounts; });
    const disposed = await snap(); result.stages.push({ name: "disposed", snapshot: disposed });
    assert.equal(disposed.sceneChildren, 0); assert.equal(disposed.disposed, true);
    assert.equal(disposed.dialogCleanups, disposed.dialogMounts);
    assert.deepEqual(disposed.borrowedAtHostDisposal, { geometry: 0, material: 0 });
    assert.deepEqual(disposed.borrowedDisposed, { geometry: 1, material: 1 });
    assert.equal(disposed.dom.ownerCount, 0);
    assert.equal(disposed.dom.pendingStateChanges, 0);
    assert.equal(disposed.three.liveResources, 0);
    assert.equal(disposed.three.liveHandles, 0);
    assert.equal(disposed.three.eventRegistrations, 0);
    const restored = await page.evaluate(() => ({
      bodyStyle: document.body.getAttribute("style"), bodyAria: document.body.getAttribute("aria-hidden"),
      bodyScrollLock: document.body.getAttribute("data-scroll-locked"),
      sentinelAria: document.querySelector("#outside-sentinel")?.getAttribute("aria-hidden"),
      portalParent: document.querySelector("#dialog-portal")?.parentElement?.tagName,
      portalElement: document.querySelector("#dialog-portal")?.id,
      portalSentinelConnected: Boolean(document.querySelector("#portal-sentinel")?.isConnected),
      portalChildCount: document.querySelector("#dialog-portal")?.childElementCount,
      sentinelConnected: Boolean(document.querySelector("#outside-sentinel")?.isConnected),
      focusGuards: document.querySelectorAll('[data-radix-focus-guard]').length,
    }));
    assert.deepEqual(restored, baseline);
    assert.equal(await page.evaluate(() => {
      const outside = document.querySelector("#outside-sentinel"); outside.focus();
      return document.activeElement === outside;
    }), true);
    for (const name of ["native", "react"]) {
      const comparisonPage = await context.newPage();
      comparisonPage.on("pageerror", error => result.pageErrors.push(String(error)));
      comparisonPage.on("console", message => {
        if (message.type() === "error") result.consoleErrors.push(message.text());
      });
      comparisonPage.on("requestfailed", request => result.requestFailures.push({
        url: request.url(), error: request.failure()?.errorText,
      }));
      try {
        const response = await comparisonPage.goto(`${origin}/comparison-${name}/index.html`,
          { waitUntil: "networkidle", timeout: 10_000 });
        assert.equal(response?.status(), 200);
        await comparisonPage.locator("button").first().click();
        await comparisonPage.waitForFunction(() => Boolean(document.querySelector('[role="dialog"]')),
          null, { timeout: 10_000 });
        result.comparisonOutput[name] = await comparisonPage.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"]');
          const labelled = dialog?.getAttribute("aria-labelledby");
          const described = dialog?.getAttribute("aria-describedby");
          return { title: labelled ? document.getElementById(labelled)?.textContent : null,
            description: described ? document.getElementById(described)?.textContent : null,
            close: [...dialog?.querySelectorAll("button") ?? []].map(button => button.textContent).find(text => text === "Close settings") ?? null };
        });
      } finally {
        try { await comparisonPage.close(); }
        catch (error) { failed = true; result.status = "FAIL_OR_INCOMPLETE";
          result.errors.push(`comparison page close: ${String(error)}`); }
      }
    }
    assert.deepEqual(result.comparisonOutput.native, result.comparisonOutput.react);
    assert.deepEqual(result.comparisonOutput.native, { title: "Settings", description: "Edit settings", close: "Close settings" });
    assert.deepEqual(result.pageErrors, []); assert.deepEqual(result.consoleErrors, []);
    assert.deepEqual(result.blockedRequests, []); assert.deepEqual(result.requestFailures, []);
    await verify("inputsAfter");
    assert.equal(await hashFile(path.join(proof, "build-proof.json")), sha(proofBytes));
    result.status = failed ? "FAIL_OR_INCOMPLETE" : "PASS_INSTALLED_BROWSER_CONFORMANCE";
  } finally {
    try { await context.close(); }
    catch (error) { failed = true; result.status = "FAIL_OR_INCOMPLETE";
      result.errors.push(`context close: ${String(error)}`); }
  }
} catch (error) { failed = true; result.status = "FAIL_OR_INCOMPLETE";
  result.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
} finally {
  clearTimeout(deadline); process.off("SIGINT", interrupt); process.off("SIGTERM", interrupt);
  if (browser) try { await browser.close(); } catch (error) { failed = true; result.status = "FAIL_OR_INCOMPLETE";
    result.errors.push(`browser close: ${String(error)}`); }
  await writeFile(receiptPath, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
}
if (failed) { console.error(result.errors.join("\n")); process.exitCode = 1; }
else console.log(JSON.stringify({ status: result.status, receiptPath }));
