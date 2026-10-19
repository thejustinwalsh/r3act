import { readFile, writeFile } from "node:fs/promises";

const replications = await Promise.all([1, 2, 3].map(async (replication) =>
  JSON.parse(await readFile(`results/keyed-region-columnar-layout-v1/replication-${replication}.json`, "utf8"))
));
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const scenarios = [...new Set(replications[0].cells.map((cell) => cell.scenario))];
const sizes = [...new Set(replications[0].cells.map((cell) => cell.size))];
const arms = ["array-map", "object-buckets", "columnar-buckets"];
const cells = [];
for (const size of sizes) for (const scenario of scenarios) {
  const rows = replications.map((run) => run.cells.find((cell) => cell.size === size && cell.scenario === scenario));
  cells.push({
    size,
    scenario,
    processReplications: rows.length,
    arms: Object.fromEntries(arms.map((arm) => [arm, {
      medianOfProcessMediansMs: median(rows.map((row) => row.results[arm].medianMs)),
      medianOfProcessP95Ms: median(rows.map((row) => row.results[arm].p95Ms)),
      processMedianRangeMs: [
        Math.min(...rows.map((row) => row.results[arm].medianMs)),
        Math.max(...rows.map((row) => row.results[arm].medianMs)),
      ],
    }])),
  });
}
const summary = {
  schemaVersion: "keyed-region-columnar-layout-v1-summary",
  status: "EXPLORATORY_PASS",
  benchmark: "keyed bucket move and allocation-free ordered scan microbenchmark",
  replications: replications.map((run) => ({
    replication: run.replication,
    runtime: run.runtime,
    measuredOperationsPerArm: run.measuredOperationsPerArm,
  })),
  aggregation: "median of per-process sample medians; p95 is median of per-process p95 values",
  cells,
  limitations: [
    "One host/runtime and three serialized Node processes; this is not browser or end-to-end UI evidence.",
    "The columnar candidate stores parallel JavaScript arrays of strings and values, not typed numeric VDOM columns.",
    "The measured scan reads only ordered keys and values; it does not model props, dependency dispatch, or host writes.",
    "No allocation, heap, garbage-collection, or hardware cache-miss measurements were collected.",
    "Many local edit samples are below one microsecond; interpret small differences as directional only.",
  ],
};
await writeFile("results/keyed-region-columnar-layout-v1/summary.json", `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary.cells.map((cell) => ({
  size: cell.size,
  scenario: cell.scenario,
  mediansMs: Object.fromEntries(arms.map((arm) => [arm, cell.arms[arm].medianOfProcessMediansMs])),
  p95Ms: Object.fromEntries(arms.map((arm) => [arm, cell.arms[arm].medianOfProcessP95Ms])),
})), null, 2));
