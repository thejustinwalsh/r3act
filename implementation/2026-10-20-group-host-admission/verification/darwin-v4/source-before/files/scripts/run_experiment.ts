import { runDenoExperiment } from "../src/deno_experiment.ts";

const outputPath = Deno.args[0] ?? "results/deno-graph-vs-scan.json";
const seed = Number(Deno.args[1] ?? 1_736_031_009);
if (!Number.isInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
  throw new Error("Seed must be an integer from 0 through 4294967295");
}
const result = runDenoExperiment(41, seed);
await Deno.writeTextFile(outputPath, JSON.stringify(result, null, 2) + "\n");
console.table(result.results.map((row) => ({
  entities: row.entityCount,
  changed: row.changedCount,
  scanMedianUs: (row.scan.medianMs * 1_000).toFixed(3),
  graphMedianUs: (row.compiledGraph.medianMs * 1_000).toFixed(3),
  scanOverGraph: row.paired.medianScanOverGraph.toFixed(2),
  graphWins: row.paired.graphFasterPairs,
  scanWins: row.paired.scanFasterPairs,
  parity: row.outputParity,
})));
