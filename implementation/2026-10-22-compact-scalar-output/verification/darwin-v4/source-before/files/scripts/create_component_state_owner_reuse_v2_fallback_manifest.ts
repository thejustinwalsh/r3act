const directory = "results/component-state-owner-reuse-v2";
const replicationPaths = Array.from(
  { length: 5 },
  (_, index) => `${directory}/fallback-phase-diagnostic-${index + 1}.json`,
);
const sourcePaths = [
  "scripts/profile_component_state_owner_reuse_v2_fallback.ts",
  "src/component_state_runtime.ts",
  "src/owner_state_world.ts",
  "src/jsx_binding_runtime.ts",
  "src/vdom_snapshot_runtime.ts",
  "src/derived_region_runtime.ts",
  "deno.json",
  "deno.browser.json",
];
const digest = async (bytes: Uint8Array) => {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    bytes.slice().buffer as ArrayBuffer,
  );
  return [...new Uint8Array(hash)].map((value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
};
const inputs = await Promise.all([...sourcePaths, ...replicationPaths].map(
  async (path) => {
    const bytes = await Deno.readFile(path);
    return {
      path,
      sha256: await digest(bytes),
      bytes: bytes.length,
      kind: sourcePaths.includes(path) ? "source" : "raw-record",
    };
  },
));
const records = await Promise.all(
  replicationPaths.map(async (path) =>
    JSON.parse(await Deno.readTextFile(path))
  ),
);
const expectedSchema =
  "component-state-owner-reuse-v2-fallback-phase-diagnostic-v1";
for (let index = 0; index < records.length; index++) {
  const record = records[index];
  if (
    record.schemaVersion !== expectedSchema ||
    record.replication !== index + 1 ||
    record.count !== 10_000 || record.warmupUpdatesPerArm !== 8 ||
    record.measuredPairedUpdates !== 12 ||
    record.integrity?.allOutputParity !== true ||
    record.integrity?.allHostIdentity !== true ||
    record.integrity?.allChildStateRetained !== true
  ) {
    throw new Error(
      `Fallback diagnostic contract failed for replication ${index + 1}`,
    );
  }
}

const manifest = {
  schemaVersion: "component-state-owner-reuse-v2-fallback-phase-manifest-v1",
  createdAt: new Date().toISOString(),
  status: "POST_COLLECTION_HASH_MANIFEST",
  collection: {
    replicationCount: records.length,
    recordsPerArmPerReplication: 12,
    arms: ["generic", "checked", "token"],
    workload: "10,000 keyed stateful rows; one edge replacement per update",
    host: "MemoryVDOMHost; no browser DOM",
    timingUse:
      "diagnostic phase attribution only; excluded from latency claims",
  },
  inputs,
  integrity: {
    allRecordsPass: true,
    allOutputParity: true,
    allHostIdentity: true,
    allChildStateRetained: true,
  },
};
await Deno.writeTextFile(
  `${directory}/fallback-phase-diagnostic-manifest.json`,
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(JSON.stringify(
  {
    status: manifest.status,
    sourceCount: sourcePaths.length,
    recordCount: replicationPaths.length,
    integrity: manifest.integrity,
  },
  null,
  2,
));
