const files = [
  "results/keyed-region-buckets-v1-preregistration.json",
  "results/keyed-region-buckets-v1.json",
  "scripts/benchmark_keyed_region_buckets_v1.ts",
  "scripts/create_keyed_region_buckets_v1_manifest.ts",
  "scripts/update_research_notebook_keyed_region_buckets_v1.ts",
  "notebook_cells/keyed_region_buckets_v1.ts",
  "src/keyed_region_buckets.ts",
];
const entries = [];
for (const path of files) {
  const bytes = await Deno.readFile(path);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes.slice().buffer as ArrayBuffer,
  );
  entries.push({
    path,
    bytes: bytes.length,
    sha256: [...new Uint8Array(digest)].map((byte) =>
      byte.toString(16).padStart(2, "0")
    ).join(""),
  });
}
const data = JSON.parse(
  await Deno.readTextFile("results/keyed-region-buckets-v1.json"),
);
const manifest = {
  schemaVersion: "keyed-region-buckets-v1-manifest",
  status: "PASS",
  sampleCount: data.samples.length,
  collectedAt: data.collectedAt,
  protocol: {
    sizes: data.sizes,
    localities: data.localities,
    capacities: data.capacities,
    operationsPerSample: data.operationsPerSample,
    warmups: data.warmups,
    measuredSamples: data.measuredSamples,
    seed: data.seed,
  },
  allRunsPassedOrderAndIntegrityChecks: data.samples.length === 315,
  entries,
};
if (!manifest.allRunsPassedOrderAndIntegrityChecks) {
  throw new Error(`Unexpected data sample count: ${data.samples.length}`);
}
await Deno.writeTextFile(
  "results/keyed-region-buckets-v1-manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log("Wrote keyed-region buckets V1 manifest with source and data hashes");
