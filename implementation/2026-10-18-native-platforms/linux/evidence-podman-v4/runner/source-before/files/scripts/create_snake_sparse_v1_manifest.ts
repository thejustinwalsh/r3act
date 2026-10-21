import { sparseV1Pages } from "../src/browser/snake_sparse_v1_schedule.ts";

const preregPath = "results/snake-sparse-frame-v1-preregistration.json";
const lockPath = "results/snake-sparse-frame-v1-source-lock.json";
const rawDirectory = "results/snake-sparse-frame-v1-production";
const outputPath = "results/snake-sparse-frame-v1-manifest.json";
const sha256 = async (bytes: Uint8Array) =>
  [
    ...new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        bytes.slice().buffer as ArrayBuffer,
      ),
    ),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
const prereg = JSON.parse(await Deno.readTextFile(preregPath));
const lock = JSON.parse(await Deno.readTextFile(lockPath));
if (
  prereg.status !== "PREREGISTERED" ||
  lock.status !== "FROZEN_BEFORE_COLLECTION_AFTER_AMENDMENT_1"
) throw new Error("Prerequisite records are not frozen under amendment 1");
for (const file of lock.files) {
  const digest = await sha256(await Deno.readFile(file.path));
  const snapshot = await sha256(await Deno.readFile(file.snapshotPath));
  if (digest !== file.sha256 || snapshot !== file.sha256) {
    throw new Error(`Frozen source mismatch: ${file.path}`);
  }
}
const expected = new Map(sparseV1Pages().map((page) => [page.trialId, page]));
const records: Array<{ filename: string; sha256: string; record: any }> = [];
for await (const entry of Deno.readDir(rawDirectory)) {
  if (!entry.isFile || !entry.name.endsWith(".json")) continue;
  const bytes = await Deno.readFile(`${rawDirectory}/${entry.name}`);
  records.push({
    filename: entry.name,
    sha256: await sha256(bytes),
    record: JSON.parse(new TextDecoder().decode(bytes)),
  });
}
if (records.length !== prereg.totalPageLoads) {
  throw new Error(
    `Expected ${prereg.totalPageLoads} records; found ${records.length}`,
  );
}
const seen = new Set<string>();
for (const { filename, record } of records) {
  const page = expected.get(record.trialId);
  if (!page || seen.has(record.trialId)) {
    throw new Error(`Unexpected or duplicate trial: ${record.trialId}`);
  }
  seen.add(record.trialId);
  if (
    record.arm !== page.arm || record.size !== page.size ||
    record.dirtyPercent !== page.dirtyPercent ||
    record.locality !== page.locality || record.replication !== page.replication
  ) throw new Error(`Page assignment mismatch: ${filename}`);
  if (
    record.schemaVersion !== "snake-sparse-frame-browser-v1" ||
    record.status !== "PASS" || record.allContractsPass !== true ||
    record.warmupFrames !== 30 || record.measuredFrames !== 60 ||
    record.samples.length !== 60 ||
    record.browser?.buildMode !== "production" ||
    record.browser?.visibilityState !== "visible" || !record.stableNodeCount ||
    !record.stableNodeIdentity || !record.finalOutputParity ||
    !record.completeCommitCoverage
  ) throw new Error(`Record contract failed: ${filename}`);
}
if (seen.size !== expected.size) {
  throw new Error(
    `Missing trial ids: expected ${expected.size}; saw ${seen.size}`,
  );
}
const first = records[0]?.record.browser;
if (
  records.some(({ record }) =>
    record.browser?.userAgent !== first.userAgent ||
    record.browser?.platform !== first.platform ||
    record.browser?.devicePixelRatio !== first.devicePixelRatio
  )
) throw new Error("Browser profile changed during the matrix");
const manifest = {
  schemaVersion: "snake-sparse-frame-browser-v1-manifest",
  status: "PASS",
  generatedAt: new Date().toISOString(),
  preregistration: preregPath,
  sourceLock: lockPath,
  sourceSnapshotManifest:
    "source snapshots are listed and hash-verified by the source lock",
  rawDirectory,
  expectedPageLoads: prereg.totalPageLoads,
  archivedPageLoads: records.length,
  measuredFrames: records.reduce(
    (sum, item) => sum + item.record.measuredFrames,
    0,
  ),
  warmupFrames: records.reduce(
    (sum, item) => sum + item.record.warmupFrames,
    0,
  ),
  contractFailures: 0,
  profile: first,
  records: records.map(({ filename, sha256: hash, record }) => ({
    filename,
    sha256: hash,
    trialId: record.trialId,
    arm: record.arm,
    size: record.size,
    dirtyPercent: record.dirtyPercent,
    locality: record.locality,
    replication: record.replication,
  })),
};
await Deno.writeTextFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `PASS ${records.length}/${expected.size} pages · ${manifest.measuredFrames} measured RAF samples · source and raw hashes verified`,
);
