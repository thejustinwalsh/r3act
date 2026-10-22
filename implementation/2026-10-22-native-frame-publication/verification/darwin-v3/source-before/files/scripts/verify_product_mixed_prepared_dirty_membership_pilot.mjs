import assert from "node:assert/strict";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { openBrowser } from "vitexec/cli";

const origin = process.env.PRODUCT_MIXED_ORIGIN ?? "https://compiled-dirty-membership-pilot.localhost:1355";
const output = process.env.PRODUCT_MIXED_PILOT_DIR ?? "results/product-mixed-prepared-dirty-membership-pilot";
await mkdir(output, { recursive: true });
assert.equal((await readdir(output)).length, 0, "Refusing to overwrite pilot evidence");
const nativeProof = JSON.parse(await readFile(".cache/product-mixed-prepared-dirty-membership/compiler-proof/native.json", "utf8"));
const reactProof = JSON.parse(await readFile(".cache/product-mixed-prepared-dirty-membership/compiler-proof/react.json", "utf8"));
assert.equal(nativeProof.bindings, 3); assert.equal(nativeProof.deltas, true);
assert.equal(nativeProof.propOnly, true); assert.equal(nativeProof.deltaFallback, false);
assert.equal(reactProof.rowMemoCache, true); assert.equal(reactProof.boardMemoCache, true);
const browser = await openBrowser({ gpu: false });
const records = [];
try {
  for (const size of [128, 512, 1024]) {
    for (const arm of ["native", "react"]) {
      const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1200, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${origin}/product-mixed-v2.html?mode=pilot&arm=${arm}&size=${size}`, { waitUntil: "domcontentloaded" });
      await page.bringToFront();
      await page.waitForFunction(() => window.__productMixed?.result(), null, { timeout: 20000 });
      const record = await page.evaluate(() => window.__productMixed.result());
      await writeFile(`${output}/${arm}-${size}.json`, JSON.stringify({ ...record, browserErrors: errors }, null, 2) + "\n", { flag: "wx" });
      assert.deepEqual(errors, []);
      assert.equal(record.status, "PASS", `${arm}/${size}: ${JSON.stringify(record.errors)}`);
      assert.equal(record.production, true);
      assert.equal(record.mode, "pilot");
      assert.equal(record.samples.length, 60);
      assert.equal(record.samples.filter(sample => sample.structural).length, 2);
      assert.ok(Object.values(record.checks).every(Boolean));
      assert.equal(record.active.mounts, size + 16);
      assert.equal(record.active.cleanups, 16);
      assert.equal(record.after.mounts, record.after.cleanups);
      assert.equal(record.after.writers, 0);
      if (arm === "native") {
        assert.equal(record.after.extra.root.ownerCount, 0);
        assert.equal(record.after.extra.root.disposed, true);
        assert.equal(record.after.extra.collection.readerCount, 0);
        assert.equal(record.after.extra.collection.retainedBatches, 0);
      }
      records.push({ arm, size, status: record.status });
      console.log(`PASS pilot ${arm}/${size}: props/order/identity/lifecycle/production/teardown`);
      await context.close();
    }
  }
  await writeFile(`${output}/results.json`, JSON.stringify({ status: "PASS", scope: "Correctness pilot only; no confirmatory performance evidence", records, nativeProof, reactProof }, null, 2) + "\n", { flag: "wx" });
} finally { await browser.close(); }
