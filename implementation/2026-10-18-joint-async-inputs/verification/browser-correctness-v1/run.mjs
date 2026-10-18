import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";
const root = process.cwd();
const output = path.dirname(fileURLToPath(import.meta.url));
const proofDir = path.join(root, "implementation/2026-10-18-joint-async-inputs/benchmark/proof-v3");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const proofBytes = await readFile(path.join(proofDir, "build-proof.json"));
const proof = JSON.parse(proofBytes);
assert.equal(proof.status, "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW");
const auth = JSON.parse(await readFile(path.join(proofDir, "correctness-authorization.json")));
assert.equal(auth.status, "APPROVED_FOR_ONE_UNTIMED_NATIVE_CORRECTNESS_REPLAY");
assert.equal(auth.buildProofSha256, sha(proofBytes));
const lock = JSON.parse(await readFile(path.join(proofDir, "source-lock.json")));
const inputs = [...lock.inputs, { path: proof.compiler.path, sha256: proof.compiler.sha256 }, ...proof.transformed, ...proof.assets];
const origin = "https://r3act-joint-async-correctness.localhost";
const record = { status: "STARTED", kind: "UNTIMED_NATIVE_CORRECTNESS_ONLY", buildProofSha256: sha(proofBytes),
  transport: "Offline local asset replay; no project server, network, TLS, route or trust change",
  sourceBefore: [], sourceAfter: [], servedAssets: [], errors: [], pageErrors: [], blockedRequests: [], result: null };
const resultPath = path.join(output, "receipt.json");
await writeFile(resultPath, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
async function verify(field) {
  for (const item of inputs) {
    const actual = sha(await readFile(path.join(root, item.path)));
    record[field].push({ path: item.path, expected: item.sha256, actual });
    assert.equal(actual, item.sha256, `Source drift: ${item.path}`);
  }
}
let browser;
let timer;
let stopped;
let cancelled = false;
const stop = new Promise((_, reject) => { stopped = reject; });
const interrupt = () => { cancelled = true; stopped(new Error("Interrupted")); browser?.close().catch(() => {}); };
process.once("SIGINT", interrupt); process.once("SIGTERM", interrupt);
try {
  await verify("sourceBefore");
  timer = setTimeout(() => { cancelled = true; stopped(new Error("30000ms correctness deadline")); browser?.close().catch(() => {}); }, 30_000);
  await Promise.race([(async () => {
    const opened = await openBrowser({ headless: true, gpu: false, handleSignals: false });
    if (cancelled) { await opened.close(); throw new Error("Stopped while opening browser"); }
    browser = opened;
    record.browserVersion = browser.version();
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    page.on("pageerror", (error) => record.pageErrors.push(String(error)));
    page.on("console", (message) => { if (message.type() === "error") record.errors.push(message.text()); });
    page.on("requestfailed", (request) => record.errors.push(`request: ${request.url()}`));
    const manifest = new Map(proof.assets.map((asset) => [asset.urlPath, asset]));
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url()); const asset = manifest.get(url.pathname);
      if (url.origin !== origin || !asset) { record.blockedRequests.push(url.href); await route.abort(); return; }
      const body = await readFile(path.join(root, asset.path)); assert.equal(sha(body), asset.sha256);
      record.servedAssets.push({ path: asset.urlPath, sha256: asset.sha256 });
      await route.fulfill({ status: 200, contentType: url.pathname.endsWith(".html") ? "text/html" : "text/javascript", body });
    });
    const html = proof.assets.find((asset) => asset.urlPath.endsWith(".html"));
    await page.goto(new URL(html.urlPath, origin).href, { waitUntil: "networkidle", timeout: 10_000 });
    record.result = await page.evaluate(async () => {
      const result = await window.__jointAsyncInputsPair.run("native");
      // Retain behavior and lifetime only; this replay is not a comparison.
      return { status: result.status, arm: result.arm, definedOutput: result.definedOutput, outputSha256: result.outputSha256,
        retainedHealthIdentity: result.retainedHealthIdentity, retainedRowIdentity: result.retainedRowIdentity,
        retainedRowState: result.retainedRowState, noPrematureJointReveal: result.noPrematureJointReveal,
        fallbackRetired: result.fallbackRetired, laterStoreUpdated: result.laterStoreUpdated,
        laterHealthRevealed: result.laterHealthRevealed, disposal: result.disposal };
    });
    assert.equal(record.result.status, "PASS");
    assert.equal(record.result.arm, "native");
    for (const key of ["retainedHealthIdentity", "retainedRowIdentity", "noPrematureJointReveal", "fallbackRetired", "laterStoreUpdated", "laterHealthRevealed"]) assert.equal(record.result[key], true);
    assert.equal(record.result.retainedRowState, 1);
    assert.equal(record.result.disposal.remainingChildren, 0);
    assert.equal(record.result.disposal.ownerCount, 0);
    assert.equal(record.result.disposal.store.readers, 0);
    assert.equal(record.result.disposal.store.listeners, 0);
    assert.equal(record.result.disposal.store.roots, 0);
    await verify("sourceAfter");
    assert.deepEqual(record.pageErrors, []); assert.deepEqual(record.errors, []); assert.deepEqual(record.blockedRequests, []);
    record.status = "PASS_UNTIMED_NATIVE_CORRECTNESS_ONLY";
  })(), stop]);
} catch (error) {
  record.status = "FAIL_UNTIMED_NATIVE_CORRECTNESS"; record.errors.push(String(error?.stack ?? error)); process.exitCode = 1;
} finally {
  cancelled = true;
  clearTimeout(timer); process.off("SIGINT", interrupt); process.off("SIGTERM", interrupt);
  try { await browser?.close(); } catch (error) { record.status = "FAIL_UNTIMED_NATIVE_CORRECTNESS"; record.errors.push(String(error)); process.exitCode = 1; }
  await writeFile(resultPath, JSON.stringify(record, null, 2) + "\n");
}
console.log(JSON.stringify({ status: record.status, resultPath }));
