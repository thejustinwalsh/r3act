const schedule = JSON.parse(await Deno.readTextFile(
  "results/columnar-dispatch-v1-preregistration.json",
));
const lock = JSON.parse(await Deno.readTextFile(
  "results/columnar-dispatch-v1-source-lock.json",
));
const sourceSnapshot = JSON.parse(await Deno.readTextFile(
  "results/columnar-dispatch-v1-source-snapshot-manifest.json",
));
const replay = JSON.parse(await Deno.readTextFile(
  "results/columnar-dispatch-v1-replay-verification.json",
));
if (
  schedule.status !== "PREREGISTERED" || schedule.cases.length !== 720 ||
  lock.status !== "FROZEN_BEFORE_COLLECTION"
) throw new Error("Columnar dispatch preregistration or source lock is incomplete");
if (
  sourceSnapshot.status !== "PASS" || replay.status !== "PASS" ||
  replay.caseCount !== 720 || replay.batchCount !== 79200 ||
  !replay.allOutputAndIdentityChecksPass
) throw new Error("Columnar dispatch source replay is incomplete");
for (const dependency of sourceSnapshot.supplementalDependencies ?? []) {
  const bytes = await Deno.readFile(`${sourceSnapshot.snapshotRoot}/${dependency.snapshotPath}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  if (bytes.byteLength !== dependency.bytes || sha256 !== dependency.sha256) {
    throw new Error(`Supplemental source hash mismatch: ${dependency.sourcePath}`);
  }
}
for (const entry of lock.files) {
  const source = await Deno.readFile(entry.path);
  const digest = await crypto.subtle.digest("SHA-256", source);
  const sha256 = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  if (source.byteLength !== entry.bytes || sha256 !== entry.sha256) {
    throw new Error(`Columnar dispatch source lock mismatch: ${entry.path}`);
  }
}
const files = [];
const environments = new Set<string>();
for (let replication = 1; replication <= 5; replication++) {
  const path = `results/columnar-dispatch-v1/replication-${replication}.json`;
  const bytes = await Deno.readFile(path);
  const record = JSON.parse(new TextDecoder().decode(bytes));
  if (
    record.schemaVersion !== "columnar-dispatch-v1-replication" ||
    record.status !== "PASS" || !record.allContractsPass ||
    record.replication !== replication || record.caseCount !== 144 ||
    record.cases.length !== 144 ||
    record.cases.some((cell: any) =>
      cell.replication !== replication || !cell.allOutputMatches ||
      !cell.stableNodeIdentity || cell.sampleCount !== 80 ||
      cell.measuredHostWrites !== cell.dirtyCount * 2 * 80
    )
  ) throw new Error(`Columnar dispatch contract failed in ${path}`);
  const expected = schedule.cases.filter((item: any) => item.replication === replication);
  if (expected.length !== record.caseCount) throw new Error(`Schedule mismatch in ${path}`);
  for (const cell of record.cases) {
    if (!expected.some((item: any) =>
      item.sequence === cell.sequence && item.size === cell.size &&
      item.dirtyPercent === cell.dirtyPercent && item.locality === cell.locality &&
      item.strategy === cell.strategy && item.seed === cell.seed
    )) throw new Error(`Unscheduled case in ${path}: ${cell.sequence}`);
  }
  environments.add(JSON.stringify(record.environment));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  files.push({ path: `columnar-dispatch-v1/replication-${replication}.json`, bytes: bytes.byteLength, sha256, caseCount: record.caseCount });
}
if (environments.size !== 1) throw new Error("Replication environments differ");
const manifest = {
  schemaVersion: "columnar-dispatch-v1-manifest",
  status: "PASS",
  generatedAt: new Date().toISOString(),
  preregistration: "columnar-dispatch-v1-preregistration.json",
  sourceLock: "columnar-dispatch-v1-source-lock.json",
  sourceSnapshot: "columnar-dispatch-v1-source-snapshot-manifest.json",
  replayVerification: "columnar-dispatch-v1-replay-verification.json",
  replayVerificationHash: await (async () => {
    const bytes = await Deno.readFile("results/columnar-dispatch-v1-replay-verification.json");
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  })(),
  supplementalDependencies: sourceSnapshot.supplementalDependencies ?? [],
  replicationCount: files.length,
  caseCount: files.reduce((sum, entry) => sum + entry.caseCount, 0),
  measuredUpdates: files.reduce((sum, entry) => sum + entry.caseCount, 0) * schedule.measuredUpdatesPerCell,
  warmupUpdates: files.reduce((sum, entry) => sum + entry.caseCount, 0) * schedule.warmupUpdatesPerCell,
  replayVerificationSummary: {
    caseCount: replay.caseCount,
    batchCount: replay.batchCount,
    entityChecks: replay.entityChecks,
    status: replay.status,
  },
  environment: JSON.parse([...environments][0]),
  files,
};
await Deno.writeTextFile(
  "results/columnar-dispatch-v1-manifest.json",
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(`Manifest PASS: ${manifest.replicationCount} processes, ${manifest.caseCount} cases.`);
