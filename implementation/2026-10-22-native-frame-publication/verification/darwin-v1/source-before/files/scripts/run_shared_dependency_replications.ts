const seeds = [1_063_781_101, 1_063_782_211, 1_063_783_307];
const outputPaths = seeds.map((seed) => `results/deno-shared-dependency-${seed}.json`);
const children = await Promise.all(seeds.map((seed) => new Deno.Command(Deno.execPath(), {
  args: ["run", "--allow-write=results", "scripts/run_shared_dependency_experiment.ts", "48", String(seed)],
  stdout: "inherit",
  stderr: "inherit",
}).spawn()));
const statuses = await Promise.all(children.map((child) => child.status));
if (statuses.some((status) => !status.success)) throw new Error("A shared-dependency replication failed");

const runs = await Promise.all(outputPaths.map(async (path) => JSON.parse(await Deno.readTextFile(path))));
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};
const keyOf = (scenario: Record<string, unknown>) => `${scenario.sharedMode}:${scenario.changedFraction}`;
const scenarios = runs[0].scenarios.map((scenario: Record<string, any>) => {
  const replications = runs.map((run) => run.scenarios.find((candidate: Record<string, any>) => keyOf(candidate) === keyOf(scenario)));
  return {
    entityCount: scenario.entityCount,
    changedFraction: scenario.changedFraction,
    changedEntities: scenario.changedEntities,
    sharedMode: scenario.sharedMode,
    affectedBindingsPerBatch: scenario.affectedBindingsPerBatch,
    medianUsAcrossProcesses: {
      graph: median(replications.map((result) => result.medianMs.graph * 1_000)),
      fullScan: median(replications.map((result) => result.medianMs.fullScan * 1_000)),
    },
    p95UsAcrossProcesses: {
      graph: median(replications.map((result) => result.p95Ms.graph * 1_000)),
      fullScan: median(replications.map((result) => result.p95Ms.fullScan * 1_000)),
    },
    graphWinsByProcess: replications.map((result) => result.graphWins),
    fullScanWinsByProcess: replications.map((result) => result.fullScanWins),
    parityAllProcesses: replications.every((result) => result.parityFailures === 0),
    orderBalancedAllProcesses: replications.every((result) =>
      Object.values(result.orderCounts).every((count: any) => count === 24)
    ),
  };
});
const summary = {
  schemaVersion: 1,
  experiment: "Shared-source dependency fan-out across independent Deno processes",
  processCount: runs.length,
  seeds,
  environments: runs.map((run) => run.environment),
  rawSources: outputPaths,
  scenarios,
};
await Deno.writeTextFile("results/deno-shared-dependency-replication-summary.json", `${JSON.stringify(summary, null, 2)}\n`);
console.table(scenarios.map((scenario: Record<string, any>) => ({
  changed: `${scenario.changedFraction * 100}%`,
  shared: scenario.sharedMode,
  affectedBindings: scenario.affectedBindingsPerBatch,
  graphUs: scenario.medianUsAcrossProcesses.graph.toFixed(3),
  scanUs: scenario.medianUsAcrossProcesses.fullScan.toFixed(3),
  graphWins: scenario.graphWinsByProcess.join("/"),
  parity: scenario.parityAllProcesses,
})));
console.log(`Independent shared-dependency Deno processes: ${summary.processCount}`);
