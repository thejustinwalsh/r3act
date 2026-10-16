import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(directory, "../..");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const read = async (file) => JSON.parse(await readFile(file, "utf8"));
const matrix = [["react", 128], ["native", 128], ["native", 1024],
  ["react", 1024], ["react", 10000], ["native", 10000]];
const receipt = { status: "RUNNING", scope: "Production DOM correctness only", files: [] };
try {
  const manifest = await read(path.join(directory, "manifest.json"));
  assert.equal(manifest.status, "PASS");
  assert.equal(manifest.failure, null);
  assert.equal(manifest.records.length, 6);
  assert.equal(manifest.browser.headless, false);
  assert.equal(manifest.browser.gpu, true);
  assert.deepEqual(manifest.browser.viewport, { width: 1200, height: 900 });
  const assets = new Map();
  for (const asset of manifest.localBuildAssetLocks) {
    const bytes = await readFile(path.join(project,
      ".cache/high-frequency-build-proof-20261013-03/dist", asset.file));
    assert.equal(hash(bytes), asset.expectedSha256);
    assert.equal(asset.actualSha256, asset.expectedSha256);
    assets.set(asset.urlPath, asset.expectedSha256);
  }
  assert.equal(assets.size, 5);
  for (const [index, [arm, rows]] of matrix.entries()) {
    const filename = `sequence-${String(index + 1).padStart(2, "0")}.json`;
    const bytes = await readFile(path.join(directory, filename));
    const page = JSON.parse(bytes);
    const result = page.result;
    assert.equal(page.sequence, index + 1);
    assert.equal(page.status, "PASS");
    assert.equal(page.navigationStatus, 200);
    assert.equal(new URL(page.url).pathname, "/high-frequency.html");
    assert.deepEqual(page.pageErrors, []);
    assert.deepEqual(page.validationErrors, []);
    assert.equal(result.arm, arm);
    assert.equal(result.rows, rows);
    assert.equal(result.status, "PASS");
    assert.equal(result.production, true);
    assert.equal(result.dirty, "all");
    assert.equal(result.placement, "contiguous");
    assert.equal(result.programs, "homogeneous");
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.checks, { output: true, order: true, identity: true,
      lifecycle: true, deadSetters: true, visible: true });
    assert.deepEqual(result.active, { mounts: rows, cleanups: 0, writers: rows });
    assert.deepEqual(result.afterDispose, { mounts: rows, cleanups: rows, writers: 0 });
    assert.equal(result.deadSetterProbeCount, rows);
    assert.equal(result.deadSetterThrows, arm === "native" ? rows : 0);
    assert.equal(result.warmupSamples.length, 60);
    assert.equal(result.samples.length, 240);
    assert.deepEqual(result.warmupSamples.map((x) => x.frame),
      Array.from({ length: 60 }, (_, i) => i + 1));
    assert.deepEqual(result.samples.map((x) => [x.frame, x.dirtyCount]),
      Array.from({ length: 240 }, (_, i) => [i + 61, rows]));
    for (const resource of page.loadedBuildResources) {
      assert.equal(resource.status, 200);
      assert.equal(resource.sha256, assets.get(resource.path));
    }
    assert.equal(new Set(page.loadedBuildResources.map((x) => x.path)).size, 4);
    receipt.files.push({ filename, sha256: hash(bytes) });
  }
  const proofBytes = await readFile(path.join(project,
    ".cache/high-frequency-build-proof-20261013-03/build-proof.json"));
  assert.equal(hash(proofBytes), "8abcbdf4034c5e71c97cf0e61dbc275c2555a9561c2e4ffb2470d0c37867d305");
  receipt.buildProofSha256 = hash(proofBytes);
  receipt.pages = 6;
  receipt.measuredFrames = 1440;
  receipt.status = "PASS";
} catch (error) {
  receipt.status = "FAIL";
  receipt.error = String(error.stack ?? error);
  process.exitCode = 1;
}
await writeFile(path.join(directory, "primary-verification.json"),
  JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(receipt));
