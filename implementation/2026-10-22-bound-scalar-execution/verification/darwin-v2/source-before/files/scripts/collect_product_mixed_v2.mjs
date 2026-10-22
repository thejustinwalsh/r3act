import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { openBrowser } from "vitexec/cli";

const origin = "https://compiled-product-mixed.localhost:1355";
const checkpoint = "implementation/2026-10-12-namespace-three";
const directory = "results/product-mixed-v2";
const preregPath = "results/product-mixed-v2-preregistration.json";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const status = JSON.parse(await readFile(`${checkpoint}/status.json`, "utf8"));
assert.equal(sha(await readFile(`${checkpoint}/source-and-build.tar.gz`)), status.archiveSha256);
for (const [filename, expected] of Object.entries(status.sourceAndBuildSha256)) {
  assert.equal(sha(await readFile(filename)), expected, `Locked source/build changed: ${filename}`);
}
const production = Object.fromEntries(Object.entries(status.sourceAndBuildSha256).filter(([name]) => name.startsWith("dist-product-mixed-v2/")));
const schedule = [128, 512, 1024].flatMap(size => Array.from({length:5}, (_, pair) =>
  (pair % 2 ? ["native", "react"] : ["react", "native"]).map(arm => ({size, pair, arm}))
).flat()).map((item, sequence) => ({ ...item, sequence }));
const proof = {
  native: JSON.parse(await readFile(`${checkpoint}/verification/product-compiler-proof/native.json`, "utf8")),
  react: JSON.parse(await readFile(`${checkpoint}/verification/product-compiler-proof/react.json`, "utf8")),
};
assert.equal(proof.native.bindings, 3); assert.equal(proof.native.deltas, true);
assert.equal(proof.native.propOnly, true); assert.equal(proof.native.deltaFallback, false);
assert.equal(proof.react.rowMemoCache, true); assert.equal(proof.react.boardMemoCache, true);
await mkdir(directory, { recursive: true });
const browser = await openBrowser({ headless: false, gpu: false });
let prereg;
try {
  const calibrationContext = await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1200,height:900}});
  // Preflight every served production asset without navigating the benchmark.
  for (const [filename, expected] of Object.entries(production)) {
    const response = await calibrationContext.request.get(origin + "/" + filename.slice("dist-product-mixed-v2/".length));
    assert.equal(response.status(), 200, filename);
    assert.equal(sha(await response.body()), expected, `Served production asset differs: ${filename}`);
  }
  const page = await calibrationContext.newPage();
  await page.goto("about:blank"); await page.bringToFront();
  const clock = await page.evaluate(async () => {
    let previous = performance.now(); let min = Infinity; let positive = 0;
    for (let i = 0; i < 100000; i++) {
      const now = performance.now(); const delta = now - previous;
      if (delta > 0) { min = Math.min(min, delta); positive++; } previous = now;
    }
    const raf = []; let last = await new Promise(resolve => requestAnimationFrame(resolve));
    for (let i = 0; i < 48; i++) { const now = await new Promise(resolve => requestAnimationFrame(resolve)); raf.push(now-last); last=now; }
    return { minPositiveDeltaMs: Number.isFinite(min) ? min : null, positiveObservations: positive, readings:100000,
      idleRafIntervalsMs:raf, visibility:document.visibilityState, focused:document.hasFocus(),
      userAgent:navigator.userAgent, platform:navigator.platform, hardwareConcurrency:navigator.hardwareConcurrency };
  });
  assert.ok(clock.minPositiveDeltaMs > 0); assert.equal(clock.visibility, "visible"); assert.equal(clock.focused, true);
  prereg = {
    schemaVersion:2, study:"compiled-product-mixed-v2", frozenAt:new Date().toISOString(),
    archive:checkpoint+"/source-and-build.tar.gz", archiveSha256:status.archiveSha256,
    protocol:"product-mixed-v2-protocol.md", protocolSha256:sha(await readFile("product-mixed-v2-protocol.md")),
    sourceAndBuildSha256:status.sourceAndBuildSha256, productionSha256:production,
    collectorSha256:sha(await readFile(import.meta.filename)), schedule, proof,
    decision:{medianRatioMax:.80,medianSizesRequired:2,p95RatioMax:1.10,minDenominatorTicks:5},
    browser:{headless:false,gpu:false,viewport:{width:1200,height:900},origin,userAgent:clock.userAgent},clock,
    machine:{platform:process.platform,arch:process.arch,cpuModel:os.cpus()[0]?.model,logicalCpus:os.cpus().length,totalMemoryBytes:os.totalmem()},
    workload:{warmup:60,frames:240,topologyEvery:30,removed:8,inserted:8,rotation:13},
    unit:"fresh page load; frame samples nested", independentDevice:false,
    policy:"Preserve all scheduled pages including errors; no exclusions/replacements; no source changes after lock",
  };
  await writeFile(preregPath, JSON.stringify(prereg,null,2)+"\n", {flag:"wx"});
  await calibrationContext.close();
  console.log(`FROZEN ${schedule.length} pages; clock ${clock.minPositiveDeltaMs.toFixed(4)} ms; headed browser`);
  const files = [];
  for (const scheduled of schedule) {
    const filename = `${directory}/sequence-${String(scheduled.sequence).padStart(2,"0")}.json`;
    const context = await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1200,height:900}});
    const page = await context.newPage();
    const browserErrors = []; page.on("pageerror", error => browserErrors.push(error.message));
    const record = {schedule:scheduled,archiveSha256:prereg.archiveSha256,protocolSha256:prereg.protocolSha256,
      preregistrationSha256:sha(await readFile(preregPath)),collectedAt:new Date().toISOString(),result:null,browserErrors};
    try {
      await page.bringToFront();
      await page.goto(`${origin}/product-mixed-v2.html?mode=confirm&sequence=${scheduled.sequence}`, {waitUntil:"domcontentloaded"});
      await page.bringToFront();
      await page.waitForFunction(() => window.__productMixed?.result(), null, {timeout:30000});
      record.result = await page.evaluate(() => window.__productMixed.result());
      record.endVisibility = await page.evaluate(() => ({state:document.visibilityState,focused:document.hasFocus()}));
    } catch (error) { record.error = String(error); }
    await writeFile(filename,JSON.stringify(record,null,2)+"\n",{flag:"wx"});
    files.push({file:filename,sha256:sha(await readFile(filename)),sequence:scheduled.sequence});
    await writeFile("results/product-mixed-v2-manifest.json",JSON.stringify({schemaVersion:2,study:prereg.study,
      status:files.length===schedule.length?"COLLECTION_COMPLETE":"COLLECTING",preregistrationSha256:sha(await readFile(preregPath)),
      archiveSha256:prereg.archiveSha256,files},null,2)+"\n");
    console.log(`PAGE ${scheduled.sequence+1}/${schedule.length} ${scheduled.arm}/${scheduled.size}: ${record.result?.status ?? "ERROR"}`);
    await context.close();
  }
  // Confirm the lock again after collection; preserve results even on mismatch.
  const changed = [];
  for (const [filename, expected] of Object.entries(status.sourceAndBuildSha256)) {
    if (sha(await readFile(filename)) !== expected) changed.push(filename);
  }
  const manifest = JSON.parse(await readFile("results/product-mixed-v2-manifest.json","utf8"));
  manifest.postCollectionChangedFiles = changed;
  manifest.status = changed.length ? "COLLECTION_COMPLETE_LOCK_FAILED" : "COLLECTION_COMPLETE";
  await writeFile("results/product-mixed-v2-manifest.json",JSON.stringify(manifest,null,2)+"\n");
  assert.deepEqual(changed,[]);
} finally { await browser.close(); }
