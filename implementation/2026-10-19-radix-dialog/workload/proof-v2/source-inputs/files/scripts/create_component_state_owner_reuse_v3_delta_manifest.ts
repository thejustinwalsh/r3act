const directory = "results/component-state-owner-reuse-v3";
const sourceLockPath = `${directory}/delta-profile-source-lock.json`;
const sourceLock = JSON.parse(await Deno.readTextFile(sourceLockPath));
const hash = async (path: string) => {
  const bytes = await Deno.readFile(path);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes.slice().buffer as ArrayBuffer,
  );
  return {
    path,
    bytes: bytes.length,
    sha256: [...new Uint8Array(digest)].map((byte) =>
      byte.toString(16).padStart(2, "0")
    ).join(""),
  };
};
if (
  sourceLock.schemaVersion !==
    "component-state-owner-reuse-v3-delta-source-lock-v1" ||
  sourceLock.status !== "FROZEN_BEFORE_FRESH_DIAGNOSTIC_REPLICATIONS"
) throw new Error("V3 delta source lock is not frozen");

const replications = [];
for (let replication = 1; replication <= 5; replication++) {
  const path = `${directory}/delta-profile-${replication}.json`;
  const record = JSON.parse(await Deno.readTextFile(path));
  if (
    record.schemaVersion !==
      "component-state-owner-reuse-v3-delta-profile-v1" ||
    record.replication !== replication || record.count !== 10_000 ||
    record.warmupPairsPerArm !== 8 || record.measuredPairs !== 12 ||
    !record.integrity?.allEdgeParity ||
    !record.integrity?.allRotationParity ||
    !record.integrity?.allHostIdentity ||
    !record.integrity?.allChildStateRetained ||
    record.samples?.length !== 12
  ) throw new Error(`V3 delta profile contract failed: ${path}`);
  for (const sample of record.samples) {
    if (
      !sample.edgeParity || !sample.rotateParity || !sample.hostIdentity ||
      !sample.childStateRetained
    ) throw new Error(`V3 delta sample integrity failed: ${path}`);
    const edge = sample.stages["token-delta"].edge.counters;
    const rotate = sample.stages["token-delta"].rotate.counters;
    if (
      edge["owner.keyed-region.token-mismatches"] !== 1 ||
      edge["owner.keyed-region.fallback"] !== 1 ||
      edge["owner.keyed-region.delta-owner-deletes"] !== 1 ||
      edge["owner.keyed-region.delta-output-upserts"] !== 1 ||
      edge["owner.keyed-region.delta-owner-upserts"] !== 1 ||
      rotate["owner.keyed-region.token-hits"] !== 10_000 ||
      rotate["owner.keyed-region.token-output-reuses"] !== 10_000 ||
      (rotate["owner.keyed-region.token-mismatches"] ?? 0) !== 0 ||
      (rotate["owner.keyed-region.fallback"] ?? 0) !== 0
    ) throw new Error(`V3 delta mechanism counters failed: ${path}`);
  }
  replications.push({
    replication,
    ...await hash(path),
  });
}
const manifest = {
  schemaVersion: "component-state-owner-reuse-v3-delta-profile-manifest-v1",
  createdAt: new Date().toISOString(),
  status: "PASS",
  preregistration: `${directory}/delta-profile-preregistration.json`,
  sourceLock: {
    ...await hash(sourceLockPath),
    lockedInputCount: sourceLock.entries.length,
    status: sourceLock.status,
  },
  replicationUnit: "Fresh Deno process; five process replications",
  integrity: {
    allFiveProcessesPresent: replications.length === 5,
    allMeasuredSamplesPassParityIdentityAndChildState: true,
    allTokenDeltaEdgeAndNextRotationCountersPass: true,
  },
  replications,
};
await Deno.writeTextFile(
  `${directory}/delta-profile-manifest.json`,
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(JSON.stringify(manifest, null, 2));
