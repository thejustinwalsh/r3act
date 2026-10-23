import { runDispatchExperiment } from "../src/dispatch_experiment.ts";

const outputPath = Deno.args[0] ?? "results/deno-three-way-dispatch.json";
const seed = Deno.args[1] ? Number(Deno.args[1]) : undefined;
const artifact = runDispatchExperiment(48, seed);
await Deno.writeTextFile(outputPath, JSON.stringify(artifact, null, 2) + "\n");
console.table(artifact.results.filter((row) => row.distribution === "cluster" || row.changedFraction === 0.5).map((row) => ({
  changed: `${row.changedFraction * 100}%`, layout: row.distribution,
  graphUs: (row.mediansMs.graph * 1_000).toFixed(3),
  bucketUs: (row.mediansMs.bucketScan * 1_000).toFixed(3),
  scanUs: (row.mediansMs.fullScan * 1_000).toFixed(3),
  parity: row.parityFailures,
})));
console.log(`Saved ${artifact.results.length} scenarios with ${artifact.protocol.pairCount} three-arm blocks to ${outputPath}`);
