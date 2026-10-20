const sizes = [256, 1024, 4096];
const dirtyPercentages = [1, 5, 10, 25, 50, 100];
const localityPatterns = ["clustered", "scattered"] as const;
const strategies = ["dense-scan", "dirty-rows", "bucket-32", "bucket-128"] as const;
const cases = [];
for (let replication = 1; replication <= 5; replication++) {
  for (let sizeIndex = 0; sizeIndex < sizes.length; sizeIndex++) {
    for (let densityIndex = 0; densityIndex < dirtyPercentages.length; densityIndex++) {
      for (let localityIndex = 0; localityIndex < localityPatterns.length; localityIndex++) {
        const orderOffset = (replication - 1 + sizeIndex + densityIndex + localityIndex) % strategies.length;
        const order = [...strategies.slice(orderOffset), ...strategies.slice(0, orderOffset)];
        for (let orderIndex = 0; orderIndex < order.length; orderIndex++) {
          const strategy = order[orderIndex];
          const size = sizes[sizeIndex];
          const dirtyPercent = dirtyPercentages[densityIndex];
          const locality = localityPatterns[localityIndex];
          cases.push({
            sequence: cases.length,
            replication,
            size,
            dirtyPercent,
            locality,
            strategy,
            orderIndex,
            seed: replication * 1000003 + size * 101 + dirtyPercent * 17 +
              (locality === "scattered" ? 97 : 0),
          });
        }
      }
    }
  }
}
const design = {
  schemaVersion: "columnar-dispatch-v1-preregistration",
  status: "PREREGISTERED",
  frozenAt: new Date().toISOString(),
  purpose: "Compare dense column scans, explicit dirty-row dispatch, and two contiguous dirty-bucket widths within the same compiled retained-VDOM host path.",
  scope: "Deno V8 mechanism benchmark using MemoryVDOMHost; results estimate runtime dispatch cost and are not browser DOM, React, paint, or presentation evidence.",
  replicationUnit: "fresh Deno process executing one replication matrix",
  sizes,
  dirtyPercentages,
  localityPatterns,
  strategies,
  replications: 5,
  warmupUpdatesPerCell: 30,
  measuredUpdatesPerCell: 80,
  bucketSizes: { "bucket-32": 32, "bucket-128": 128 },
  updateWork: "Every dirty entity updates x and y in shared Float64Array columns. The input update loop is timed with dispatch; dirty row and bucket buffers are prepared before measurement and reused.",
  locality: "clustered rows are a contiguous prefix; scattered rows are selected by a seeded Fisher-Yates permutation and then sorted for stable traversal.",
  primaryMetric: "median per-update synchronous elapsed milliseconds; samples nested within a cell and cells nested within a fresh-process replication.",
  contracts: [
    "all entity values match the deterministic expected columns after every measured update batch",
    "host node identities remain unchanged across updates",
    "exactly two host property writes occur per dirty entity per measured update",
    "every size/density/locality/strategy cell appears once in every replication",
  ],
  limitations: [
    "MemoryVDOMHost omits browser CSS, DOM, layout, and paint costs",
    "does not compare React or framework scheduling",
    "precomputes dirty worklists, so selection/bucket construction cost is excluded",
    "does not include structural changes or component execution",
  ],
  cases,
};
await Deno.writeTextFile(
  "results/columnar-dispatch-v1-preregistration.json",
  `${JSON.stringify(design, null, 2)}\n`,
);
console.log(`Preregistered ${cases.length} cases across five process replications.`);
