import { runTransitionExperiment } from "../src/transition_experiment.ts";
import { runTransitionCoordinatorBenchmark } from "../src/transition_coordinator_benchmark.ts";

const seed = Deno.args[0] === undefined ? 0x71a45 : Number.parseInt(Deno.args[0], 10);
const label = Deno.args[1] ?? "v1";
if (!Number.isInteger(seed) || !/^[a-zA-Z0-9-]+$/.test(label)) {
  throw new Error("Usage: run_transition_experiment.ts [integer-seed] [safe-output-label]");
}

const artifact = runTransitionExperiment();
const outputPath = `results/transition-scheduler-model-${label}.json`;
await Deno.writeTextFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
const benchmark = runTransitionCoordinatorBenchmark(seed);
const benchmarkPath = `results/transition-coordinator-fanin-${label}.json`;
await Deno.writeTextFile(benchmarkPath, `${JSON.stringify(benchmark, null, 2)}\n`);

console.log("Independent resources | serial discovery | DAG planned | modeled reduction");
for (const scenario of artifact.scenarios) {
  const reduction = 1 - scenario.dagPlannedMs / scenario.waterfallMs;
  console.log(
    `${scenario.independentResources} | ${scenario.waterfallMs} ms | ${scenario.dagPlannedMs} ms | ${(reduction * 100).toFixed(1)}%`,
  );
}
console.log("Transition invariants:", JSON.stringify(artifact.transitionInvariants));
console.log("VDOM commit path invariants:", JSON.stringify(artifact.vdomCommitPath));
console.log("VDOM binding path invariants:", JSON.stringify(artifact.vdomBindingPath));
console.log(`Wrote ${outputPath}`);
console.log("\nRoot count | indexed coordinator med/p95 | per-completion scan med/p95 | scan/index ratio | indexed wins");
for (const row of benchmark.summaries) {
  console.log(
    `${row.rootCount} | ${row.indexedCoordinator.medianMs.toFixed(4)}/${row.indexedCoordinator.p95Ms.toFixed(4)} ms | ${row.scanOnEveryResolve.medianMs.toFixed(4)}/${row.scanOnEveryResolve.p95Ms.toFixed(4)} ms | ${row.scanOverIndexedMedianRatio.toFixed(2)}x | ${row.wins.indexedCoordinator}/${row.pairCount}`,
  );
}
console.log(`Wrote ${benchmarkPath}`);
