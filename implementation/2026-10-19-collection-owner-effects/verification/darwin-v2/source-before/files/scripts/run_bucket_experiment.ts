import { runBucketExperiment } from "../src/bucket_experiment.ts";

const outputPath = Deno.args[0] ?? "results/deno-bucket-scan-vs-graph.json";
const seed = Number(Deno.args[1] ?? 1_905_426_017);
const result = runBucketExperiment(41, seed);
await Deno.writeTextFile(outputPath, JSON.stringify(result, null, 2) + "\n");
console.table(result.results.filter((row) => row.entityCount === 50_000).map((row) => ({
  density: `${row.changedFraction * 100}%`,
  distribution: row.distribution,
  bucket: row.bucketSize,
  bucketScanUs: (row.bucketMedianMs * 1_000).toFixed(3),
  graphUs: (row.graphMedianMs * 1_000).toFixed(3),
  bucketOverGraph: row.medianBucketOverGraph.toFixed(2),
  graphWins: row.graphWins,
  parityFailures: row.parityFailures,
})));
