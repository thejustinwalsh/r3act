import { runTaskGraphExperiment } from "../src/task_graph_experiment.ts";

const outputPath = Deno.args[0] ?? "results/task-graph-dispatch.json";
const seed = Deno.args[1] ? Number(Deno.args[1]) : undefined;
const artifact = runTaskGraphExperiment(24, seed);
await Deno.writeTextFile(outputPath, JSON.stringify(artifact, null, 2) + "\n");
console.table(artifact.results.map((row) => ({
  nodes: row.entityCount,
  changed: `${row.changedFraction * 100}%`,
  graphUs: (row.medianMs.taskGraph * 1_000).toFixed(2),
  scanUs: (row.medianMs.fullScan * 1_000).toFixed(2),
  graphWins: row.pairedWins.taskGraph,
  parity: row.parityFailures,
})));
console.log(`Saved ${artifact.results.length} scenarios with ${artifact.protocol.pairCount} randomized pairs to ${outputPath}`);
