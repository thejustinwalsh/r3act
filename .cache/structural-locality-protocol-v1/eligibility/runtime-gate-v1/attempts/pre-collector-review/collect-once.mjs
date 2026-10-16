import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";

const stage = fileURLToPath(new URL("./", import.meta.url));
const root = path.resolve(stage, "../../../..");
const origin = process.env.STRUCTURAL_RUNTIME_GATE_ORIGIN ??
  "https://structural-locality-runtime-gate.localhost";
const reportPath = path.join(stage, "page-report.json");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const buildBytes = await readFile(path.join(stage, "build-report.json"));
const build = JSON.parse(buildBytes);
assert.equal(build.status, "BUILD_PROVENANCE_PASS_RUNTIME_UNVERIFIED");
assert.equal(process.version, "v24.18.0");
const record = { schemaVersion: "structural-runtime-gate-page-v1", status: "FAIL", origin,
  buildReportSha256: sha(buildBytes), browserOptions: { headless: true, gpu: false,
    freshContext: true, pageBudgetMs: 90_000 }, served: [], pageErrors: [], consoleErrors: [],
  responsesFailed: [], trace: [], result: null, error: null };
let browser, context, page, timer;
const timeout = new Promise((_, reject) => {
  timer = setTimeout(() => reject(new Error("single page exceeded 90 seconds")), 90_000);
});
try {
  browser = await openBrowser({ headless: true, gpu: false });
  context = await browser.newContext({ ignoreHTTPSErrors: true });
  page = await context.newPage();
  page.on("pageerror", (error) => record.pageErrors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error") record.consoleErrors.push(message.text()); });
  page.on("requestfailed", (request) => record.responsesFailed.push({
    url: request.url(), error: request.failure()?.errorText ?? "unknown" }));
  const work = (async () => {
    await page.goto(origin, { waitUntil: "networkidle", timeout: 30_000 });
    const served = await page.evaluate(async (paths) => {
      const digest = async (data) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", data))]
        .map((byte) => byte.toString(16).padStart(2, "0")).join("");
      const result = [];
      for (const entry of paths) {
        const url = entry.path.includes("/dist/assets/")
          ? `/assets/${entry.path.split("/dist/assets/")[1]}` : "/index.html";
        const response = await fetch(url, { cache: "no-store" });
        result.push({ path: entry.path, url, status: response.status,
          sha256: await digest(await response.arrayBuffer()) });
      }
      return result;
    }, build.artifacts);
    record.served = served;
    assert.equal(served.length, build.artifacts.length);
    for (let index = 0; index < served.length; index++) {
      assert.equal(served[index].status, 200, served[index].url);
      assert.equal(served[index].sha256, build.artifacts[index].sha256,
        `served asset changed: ${served[index].url}`);
    }
    await page.waitForFunction(() => typeof window.__structuralRuntimeGate?.run === "function",
      null, { timeout: 15_000 });
    record.result = await page.evaluate(() => window.__structuralRuntimeGate.run());
    record.trace = await page.evaluate(() => window.__structuralRuntimeGate.trace);
    assert.deepEqual(record.result.map((item) => item.status), ["PASS", "PASS", "PASS"]);
    assert.deepEqual(record.result.map((item) => item.arm), ["collection", "generic", "react"]);
    assert.deepEqual(record.pageErrors, []);
    assert.deepEqual(record.consoleErrors, []);
    assert.deepEqual(record.responsesFailed, []);
    record.status = "CORRECTNESS_AND_DELTA_PATH_PASS_SINGLE_N_128";
  })();
  await Promise.race([work, timeout]);
} catch (error) {
  record.error = String(error?.stack ?? error);
  if (page) {
    try { record.trace = await page.evaluate(() => window.__structuralRuntimeGate?.trace ?? []); }
    catch { /* Navigation or deadline may have closed the page. */ }
  }
}
finally {
  clearTimeout(timer);
  await page?.close().catch(() => {});
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
  await writeFile(reportPath, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
}
if (record.status !== "CORRECTNESS_AND_DELTA_PATH_PASS_SINGLE_N_128") process.exitCode = 1;
