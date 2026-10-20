import { runSharedDependencyExperiment } from "../src/shared_dependency_experiment.ts";

const pairCount = Number(Deno.args[0] ?? 48);
const seed = Number(Deno.args[1] ?? 1_063_771_009);
if (!Number.isInteger(pairCount) || pairCount < 2 || pairCount % 2 !== 0) {
  throw new RangeError("Pair count must be a positive even integer");
}
if (!Number.isInteger(seed) || seed < 1 || seed > 0xffff_ffff) {
  throw new RangeError("Seed must be an integer from 1 to 4294967295");
}

const result = runSharedDependencyExperiment(pairCount, seed);
const output = `results/deno-shared-dependency-${seed}.json`;
await Deno.writeTextFile(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  output,
  environment: result.environment,
  scenarios: result.scenarios.map((scenario) => ({
    density: `${scenario.changedFraction * 100}%`,
    sharedMode: scenario.sharedMode,
    graphMedianP95: [scenario.medianMs.graph, scenario.p95Ms.graph],
    scanMedianP95: [scenario.medianMs.fullScan, scenario.p95Ms.fullScan],
    graphWins: scenario.graphWins,
    fullScanWins: scenario.fullScanWins,
    parityFailures: scenario.parityFailures,
  })),
}, null, 2));
