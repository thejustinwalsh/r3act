import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const checkpoint = "implementation/2026-10-13-native-cell-cut";
const status = JSON.parse(await readFile(`${checkpoint}/status.json`, "utf8"));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
assert.equal(sha(await readFile(`${checkpoint}/source-and-build.tar.gz`)), status.archiveSha256);
const files = [];
for (const [path, expected] of Object.entries(status.sourceAndBuildSha256)) {
  if (!path.startsWith("dist-product-mixed-native-cell-cut/")) continue;
  const bytes = await readFile(path);
  assert.equal(sha(bytes), expected, path);
  files.push({ path, sha256: expected, bytes: bytes.length, gzipLevel9Bytes: gzipSync(bytes, { level: 9 }).length });
}
assert.equal(files.length, 5);
const arms = {};
for (const arm of ["react", "native"]) {
  const selected = files.filter(file => arm === "react"
    ? !file.path.includes("native_product_mixed_arm-")
    : !file.path.includes("product_mixed_react_arm-"));
  assert.equal(selected.length, 4);
  arms[arm] = {
    paths: selected.map(file => file.path),
    rawBytes: selected.reduce((sum, file) => sum + file.bytes, 0),
    gzipLevel9Bytes: selected.reduce((sum, file) => sum + file.gzipLevel9Bytes, 0),
  };
}
const record = {
  schemaVersion: 1, status: "HASH_VERIFIED", checkpoint, archiveSha256: status.archiveSha256,
  runtime: process.version, zlib: process.versions.zlib,
  scope: "Four production resources loaded by each arm of the matched compiled application",
  compression: "Sum of independently gzip-compressed resources at level 9; an estimate, not observed transfer bytes",
  files, arms,
  nativeOverReact: {
    raw: arms.native.rawBytes / arms.react.rawBytes,
    gzipLevel9: arms.native.gzipLevel9Bytes / arms.react.gzipLevel9Bytes,
  },
  limits: ["Application artifact sizes, not complete library or feature-parity sizes", "No timing or universal framework-size conclusion"],
};
await writeFile("results/product-mixed-native-cell-cut-bundle-size.json", JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(record));
