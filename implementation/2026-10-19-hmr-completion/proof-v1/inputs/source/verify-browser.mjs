import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, "../..");
const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
assert.ok(args.includes("--proof-dir") && args.includes("--origin"),
  "usage: node verify-browser.mjs --proof-dir DIR --origin https://PORTLESS_HOST --invalid-edit");
assert.ok(args.includes("--invalid-edit"), "the invalid native edit is required");
const proof = path.resolve(root, option("--proof-dir"));
assert.ok(proof.startsWith(`${unit}${path.sep}`));
const origin = new URL(option("--origin"));
assert.equal(origin.protocol, "https:");
assert.equal(origin.pathname, "/");
assert.equal(process.version, "v24.18.0");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = async file => sha(await readFile(file));
const source = JSON.parse(await readFile(path.join(proof, "build-proof.json"), "utf8"));
assert.equal(source.status, "PASS_INSTALLED_BUILD_PROOF");
const consumer = source.consumer;
assert.equal(path.dirname(consumer), await realpath(tmpdir()));
assert.ok(path.basename(consumer).startsWith("r3act-installed-hmr-"));
const panelFile = path.join(consumer, "react-panel.tsx");
const nativeFile = path.join(consumer, "main.tsx");
const result = { status: "STARTED", origin: origin.href, consumer, browserVersion: null,
  sourceBefore: [], sourceAfter: [], edits: [], transforms: [], events: [], stages: [],
  comparisonOutput: {}, errors: [], invalidErrors: [], stopReason: null,
  contextClosed: false, browserClosed: false, completedAssertions: false };
const verifyInputs = async field => {
  for (const item of source.source) {
    const initial = path.join(unit, item.relative);
    const archived = path.join(proof, "inputs", "source", item.relative);
    assert.equal(await hash(initial), item.sha256);
    assert.equal(await hash(archived), item.sha256);
    if (item.relative.startsWith("consumer/")) {
      const current = await hash(path.join(consumer, item.relative.slice("consumer/".length)));
      result[field].push({ path: item.relative, initial: item.sha256, current });
      if (item.relative === "consumer/package.json") {
        assert.equal(current, source.installed.find(entry => entry.name === "package.json")?.sha256);
      } else if (field === "sourceBefore") assert.equal(current, item.sha256);
      else if (!["consumer/main.tsx", "consumer/react-panel.tsx"].includes(item.relative))
        assert.equal(current, item.sha256);
    }
  }
  for (const item of source.installed) {
    assert.equal(await hash(item.path), item.sha256);
    if (item.installedPath) assert.equal(await hash(item.installedPath), item.sha256);
    if (["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml"].includes(item.name))
      assert.equal(await hash(path.join(consumer, item.name)), item.sha256);
  }
  assert.equal(await hash(source.compiler.path), source.compiler.sha256);
  assert.equal(await hash(source.compiler.installedPath), source.compiler.sha256);
  for (const item of source.transforms) assert.equal(await hash(item.path), item.sha256);
  for (const item of source.assets) assert.equal(await hash(item.path), item.sha256);
};
const edit = async (file, from, to, label) => {
  const original = await readFile(file, "utf8");
  assert.equal(original.split(from).length, 2, `${label} marker must appear exactly once`);
  const revised = original.replace(from, to);
  const archive = path.join(proof, `${label}-revised.tsx`);
  await writeFile(archive, revised, { flag: "wx" });
  await writeFile(file, revised);
  result.edits.push({ label, file, archive, beforeSha256: sha(original), afterSha256: sha(revised) });
};

let browser, failed = false, rejectStop, editPhase = "normal";
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
let deadline;
try {
  await verifyInputs("sourceBefore");
  deadline = setTimeout(() => stop("deadline-90s"), 90_000);
  const opening = openBrowser({ headless: true, gpu: false, handleSignals: false }).then(async instance => {
    if (result.stopReason) { await instance.close(); throw new Error("browser opened after deadline"); }
    return instance;
  });
  browser = await Promise.race([opening, stopped]);
  result.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  try {
    await context.addInitScript(token => {
      if (sessionStorage.getItem("r3act-hmr-verifier-token") !== token) {
        sessionStorage.removeItem("r3act-installed-hmr-disposal");
        sessionStorage.setItem("r3act-hmr-verifier-token", token);
      }
    }, randomUUID());
    const captureTransform = async (label, module) => {
      const response = await context.request.get(new URL(`/${module}`, origin));
      assert.equal(response.status(), 200, `${module} dev transform failed`);
      const bytes = await response.body();
      const archive = path.join(proof, `dev-transform-${label}.js`);
      await writeFile(archive, bytes, { flag: "wx" });
      result.transforms.push({ label, module, archive, sha256: sha(bytes) });
      return bytes.toString("utf8");
    };
    const page = await context.newPage();
    page.on("websocket", socket => {
      result.events.push({ kind: "socket", url: socket.url() });
      socket.on("framereceived", frame => {
        const payload = String(frame.payload);
        result.events.push({ kind: "vite-frame", payload: payload.slice(0, 100_000),
          sha256: sha(payload), truncated: payload.length > 100_000 });
      });
    });
    page.on("framenavigated", frame => {
      if (frame === page.mainFrame()) result.events.push({ kind: "navigation", url: frame.url() });
    });
    const recordError = (kind, message) => {
      const item = { kind, phase: editPhase, message };
      (editPhase === "invalid" ? result.invalidErrors : result.errors).push(item);
    };
    page.on("pageerror", error => recordError("page", String(error)));
    page.on("console", message => {
      if (message.type() === "error") recordError("console", message.text());
    });
    const response = await Promise.race([page.goto(origin.href, { waitUntil: "networkidle", timeout: 15_000 }), stopped]);
    assert.equal(response?.status(), 200);
    const until = predicate => page.waitForFunction(predicate, null, { timeout: 12_000 });
    const snapshot = () => page.evaluate(() => window.installedHmr?.snapshot());
    const assertRetired = retired => {
      assert.equal(retired?.disposed, true, "native revision did not retire prior app");
      assert.equal(retired.dom.ownerCount, 0);
      assert.equal(retired.dom.pendingChangeCount, 0);
      assert.equal(retired.dom.disposed, true);
      assert.equal(retired.revealStatus, "cancelled");
      assert.equal(retired.revealCallbacks, 0);
      assert.equal(retired.three.liveResources, 0);
      assert.equal(retired.three.liveHandles, 0);
      assert.equal(retired.three.eventRegistrations, 0);
      assert.equal(retired.sceneChildren, 0);
      assert.equal(retired.portalChildCount, 0);
      assert.equal(retired.domPoint, null);
      assert.equal(retired.dialogCleanups, retired.dialogMounts);
      assert.deepEqual(retired.borrowedAtHostDisposal, { geometry: 0, material: 0 });
      assert.deepEqual(retired.borrowedDisposed, { geometry: 1, material: 1 });
    };
    await until(() => window.installedHmr?.snapshot().nativeRevision === "native-v1");
    const initial = await snapshot();
    result.stages.push({ name: "initial", snapshot: initial });
    const initialNative = await captureTransform("native-initial", "main.tsx");
    const initialReact = await captureTransform("react-initial", "react-panel.tsx");
    assert.match(initialNative, /__nativeDefineComponent/);
    assert.doesNotMatch(initialNative, /\$RefreshReg\$/);
    assert.match(initialReact, /\$RefreshReg\$|__vite__react/);
    assert.doesNotMatch(initialReact, /__nativeDefineComponent/);
    assert.ok(result.events.some(item => item.kind === "socket" &&
      new URL(item.url).hostname === origin.hostname), "Vite socket did not use owned HTTPS route");
    assert.equal(initial.domPoint, "1");
    assert.equal(initial.sceneCursorX, 1);
    assert.equal(initial.domDetail, "waiting");
    assert.equal(initial.sceneSignalName, "signal-waiting");
    for (const mode of ["native", "react"]) {
      const comparisonPage = await context.newPage();
      comparisonPage.on("pageerror", error => result.errors.push({ kind: `comparison-${mode}`, message: String(error) }));
      try {
        const response = await comparisonPage.goto(new URL(`/comparison/${mode}/index.html`, origin).href,
          { waitUntil: "networkidle", timeout: 15_000 });
        assert.equal(response?.status(), 200);
        await comparisonPage.waitForFunction(() => document.querySelector("output[data-count]")?.textContent === "0",
          null, { timeout: 10_000 });
        const read = () => comparisonPage.evaluate(() => ({
          heading: document.querySelector("main h1")?.textContent,
          button: document.querySelector("main button")?.textContent,
          mainCount: document.querySelector("main")?.getAttribute("data-count"),
          outputCount: document.querySelector("main output")?.getAttribute("data-count"),
          output: document.querySelector("main output")?.textContent,
        }));
        const before = await read();
        await comparisonPage.locator("main button").click();
        await comparisonPage.waitForFunction(() => document.querySelector("output[data-count]")?.textContent === "1",
          null, { timeout: 10_000 });
        result.comparisonOutput[mode] = { before, after: await read() };
      } finally { await comparisonPage.close(); }
    }
    assert.deepEqual(result.comparisonOutput.native, result.comparisonOutput.react);
    assert.deepEqual(result.comparisonOutput.native, {
      before: { heading: "Installed counter", button: "Increment", mainCount: "0", outputCount: "0", output: "0" },
      after: { heading: "Installed counter", button: "Increment", mainCount: "1", outputCount: "1", output: "1" },
    });
    await page.evaluate(() => window.installedHmr.externalOpen());
    await until(() => Boolean(document.querySelector('#dialog-portal [role="dialog"]')));
    await page.locator("#dialog-portal [data-dialog-local]").click({ clickCount: 2 });
    await until(() => {
      const state = window.installedHmr.snapshot();
      return state.dialogLocalCount === "2" && state.dialogMounts === state.dialogCleanups + 1;
    });
    const beforeReact = await snapshot();
    const navigationsBeforeReact = result.events.filter(item => item.kind === "navigation").length;
    result.stages.push({ name: "react-before", snapshot: beforeReact });
    await edit(panelFile, "react-v1", "react-v2", "react");
    await until(() => {
      const state = window.installedHmr.snapshot();
      return document.querySelector('[data-react-revision="react-v2"]') &&
        state.dialogMounts === state.dialogCleanups + 1;
    });
    const revisedReact = await captureTransform("react-revised", "react-panel.tsx");
    assert.match(revisedReact, /react-v2/);
    const afterReact = await snapshot();
    result.stages.push({ name: "react-after", snapshot: afterReact });
    assert.equal(afterReact.dialogLocalCount, "2", "React Refresh lost local state");
    assert.equal(afterReact.point, beforeReact.point);
    assert.equal(afterReact.sceneCursorX, beforeReact.sceneCursorX);
    assert.equal(afterReact.cursorRetained, true);
    assert.equal(afterReact.dom.ownerCount, beforeReact.dom.ownerCount);
    assert.equal(afterReact.sceneChildren, beforeReact.sceneChildren);
    assert.equal(afterReact.nativeRevision, "native-v1");
    assert.equal(result.events.filter(item => item.kind === "navigation").length,
      navigationsBeforeReact, "React Refresh reloaded the native page");
    assert.ok(result.events.some(item => item.kind === "vite-frame" &&
      /react-panel\.tsx/.test(item.payload)), "React edit had no Vite socket update");
    await page.evaluate(() => window.installedHmr.removeDialog());
    await until(() => {
      const state = window.installedHmr.snapshot();
      return !state.dialogPresent && state.dialogCleanups === state.dialogMounts;
    });
    result.stages.push({ name: "removed-island", snapshot: await snapshot() });
    await page.evaluate(() => window.installedHmr.reinsertDialog());
    await until(() => {
      const state = window.installedHmr.snapshot();
      return state.dialogPresent && state.dialogLocalCount === "0" &&
        state.dialogMounts === state.dialogCleanups + 1;
    });
    await page.evaluate(() => window.installedHmr.settleA());
    const pending = await snapshot();
    assert.equal(pending.domDetail, "waiting");
    assert.notEqual(pending.revealStatus, "committed");
    result.stages.push({ name: "pending-before-native-edit", snapshot: pending });
    const valid = await readFile(nativeFile, "utf8");
    assert.equal(valid.split('"native-v1"').length, 2);
    const invalid = valid.replace('"native-v1"', '"native-v1" + ;');
    const invalidArchive = path.join(proof, "native-invalid.tsx");
    await writeFile(invalidArchive, invalid, { flag: "wx" });
    result.edits.push({ label: "native-invalid", file: nativeFile, archive: invalidArchive,
      beforeSha256: sha(valid), afterSha256: sha(invalid) });
    const navigationsBeforeInvalid = result.events.filter(item => item.kind === "navigation").length;
    const invalidationsBeforeInvalid = result.events.filter(item => item.kind === "vite-frame" &&
      /r3act:invalidate-native-module/.test(item.payload)).length;
    const framesBeforeInvalid = result.events.length;
    assert.deepEqual(result.errors, [], "browser errors before invalid edit");
    editPhase = "invalid";
    await writeFile(nativeFile, invalid);
    let overlay;
    try {
      await until(() => Boolean(document.querySelector("vite-error-overlay")));
      overlay = await page.locator("vite-error-overlay").evaluate(element =>
        element.shadowRoot?.textContent ?? element.textContent ?? "");
      assert.match(overlay, /main\.tsx/);
      assert.match(overlay, /Unexpected|Expected|Parse|Syntax/i);
      assert.ok(result.events.slice(framesBeforeInvalid).some(item => item.kind === "vite-frame" &&
        /"type":"error"/.test(item.payload) && /main\.tsx/.test(item.payload) &&
        /Unexpected|Expected|Parse|Syntax/i.test(item.payload)),
      "invalid source produced no Vite compiler error frame");
      const duringInvalid = await snapshot();
      result.stages.push({ name: "invalid-overlay", overlay, snapshot: duringInvalid });
      assert.equal(duringInvalid.nativeRevision, "native-v1");
      assert.equal(duringInvalid.domDetail, pending.domDetail);
      assert.equal(duringInvalid.sceneCursorX, pending.sceneCursorX);
      assert.equal(duringInvalid.revealCallbacks, pending.revealCallbacks);
      assert.equal(duringInvalid.disposed, false);
      assert.equal(duringInvalid.dom.ownerCount, pending.dom.ownerCount);
      assert.equal(duringInvalid.three.liveResources, pending.three.liveResources);
      assert.equal(duringInvalid.dialogLocalCount, pending.dialogLocalCount);
      assert.equal(duringInvalid.dialogMounts, pending.dialogMounts);
      assert.equal(result.events.filter(item => item.kind === "navigation").length,
        navigationsBeforeInvalid, "invalid native edit reloaded the page");
      assert.equal(result.events.filter(item => item.kind === "vite-frame" &&
        /r3act:invalidate-native-module/.test(item.payload)).length,
        invalidationsBeforeInvalid, "invalid native edit retired its accepted revision");
    } finally { await writeFile(nativeFile, valid); }
    await until(() => !document.querySelector("vite-error-overlay"));
    await until(() => window.installedHmrPrevious?.disposed &&
      window.installedHmr?.snapshot().nativeRevision === "native-v1");
    const recovered = await snapshot();
    const recoveredRetired = await page.evaluate(() => window.installedHmrPrevious);
    result.stages.push({ name: "invalid-recovered", snapshot: recovered, retired: recoveredRetired });
    assertRetired(recoveredRetired);
    assert.ok(result.events.filter(item => item.kind === "navigation").length >
      navigationsBeforeInvalid, "valid repair did not reload the page");
    assert.equal(recovered.domDetail, "waiting");
    assert.equal(recovered.revealCallbacks, 0);
    assert.equal(recovered.disposed, false);
    const recoveredNative = await captureTransform("native-recovered", "main.tsx");
    assert.match(recoveredNative, /native-v1/);
    assert.match(recoveredNative, /__nativeDefineComponent/);
    assert.deepEqual(result.invalidErrors.filter(item => item.kind === "page"), [],
      "invalid edit caused a page runtime error");
    for (const item of result.invalidErrors)
      assert.match(item.message, /main\.tsx/, `unrelated error during invalid edit: ${item.message}`);
    editPhase = "normal";
    const navigationsBeforeNative = result.events.filter(item => item.kind === "navigation").length;
    await edit(nativeFile, "native-v1", "native-v2", "native");
    await until(() => window.installedHmr?.snapshot().nativeRevision === "native-v2");
    const revisedNative = await captureTransform("native-revised", "main.tsx");
    assert.match(revisedNative, /native-v2/);
    assert.match(revisedNative, /__nativeDefineComponent/);
    const afterNative = await snapshot();
    const retired = await page.evaluate(() => window.installedHmrPrevious);
    result.stages.push({ name: "native-after", snapshot: afterNative, retired });
    assert.equal(afterNative.domPoint, "1");
    assert.equal(afterNative.sceneCursorX, 1);
    assert.equal(afterNative.domDetail, "waiting");
    assert.equal(afterNative.sceneSignalName, "signal-waiting");
    assertRetired(retired);
    assert.equal(afterNative.revealCallbacks, 0);
    assert.ok(result.events.filter(item => item.kind === "navigation").length >
      navigationsBeforeNative, "native edit did not reload the page");
    assert.ok(result.events.some(item => item.kind === "vite-frame" &&
      /r3act:invalidate-native-module/.test(item.payload)), "native invalidation event missing");
    await page.evaluate(() => window.installedHmr.dispose());
    const final = await snapshot();
    result.stages.push({ name: "final-disposal", snapshot: final });
    assert.equal(final.dom.ownerCount, 0);
    assert.equal(final.dom.pendingChangeCount, 0);
    assert.equal(final.dom.disposed, true);
    assert.equal(final.three.liveResources, 0);
    assert.equal(final.three.liveHandles, 0);
    assert.equal(final.three.eventRegistrations, 0);
    assert.equal(final.sceneChildren, 0);
    assert.equal(final.portalChildCount, 0);
    assert.equal(final.domPoint, null);
    assert.equal(final.revealStatus, "cancelled");
    assert.equal(final.revealCallbacks, 0);
    assert.equal(final.dialogCleanups, final.dialogMounts);
    assert.deepEqual(final.borrowedAtHostDisposal, { geometry: 0, material: 0 });
    assert.deepEqual(final.borrowedDisposed, { geometry: 1, material: 1 });
    await verifyInputs("sourceAfter");
    assert.equal(await hash(panelFile), result.edits.find(item => item.label === "react").afterSha256);
    assert.equal(await hash(nativeFile), result.edits.find(item => item.label === "native").afterSha256);
    assert.deepEqual(result.errors, [], "unrelated browser errors");
    result.completedAssertions = true;
  } finally {
    await context.close();
    result.contextClosed = true;
  }
} catch (error) {
  failed = true;
  result.status = "FAIL_OR_INCOMPLETE";
  result.errors.push({ kind: "verification", message: error instanceof Error ? error.stack ?? String(error) : String(error) });
} finally {
  if (browser) try { await browser.close(); } catch (error) {
    failed = true;
    result.errors.push({ kind: "browser-close", message: String(error) });
  }
  if (browser && !failed) result.browserClosed = true;
  if (result.stopReason || result.errors.length || !result.completedAssertions ||
      !result.contextClosed || !result.browserClosed) {
    failed = true;
    result.status = "FAIL_OR_INCOMPLETE";
  } else result.status = "PASS_INSTALLED_HMR_BROWSER";
  if (deadline) clearTimeout(deadline);
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", interrupt);
  await writeFile(path.join(proof, "browser-hmr.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
}
if (failed) process.exitCode = 1;
else console.log(JSON.stringify({ status: result.status, proof }));
