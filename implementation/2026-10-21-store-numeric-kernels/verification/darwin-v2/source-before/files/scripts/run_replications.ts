const seeds = [1_736_031_009, 20_261_009, 20_261_010];

for (let index = 0; index < seeds.length; index++) {
  const outputPath = `results/deno-graph-vs-scan-process-${index + 1}.json`;
  const command = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-write=results", "scripts/run_experiment.ts", outputPath, String(seeds[index])],
    stdout: "inherit",
    stderr: "inherit",
  });
  const result = await command.output();
  if (!result.success) throw new Error(`Replication ${index + 1} failed with status ${result.code}`);
}

const processes = await Promise.all(seeds.map(async (_, index) => {
  const path = `results/deno-graph-vs-scan-process-${index + 1}.json`;
  return JSON.parse(await Deno.readTextFile(path));
}));
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};
const scenarios = processes[0].results.map((row: any, scenarioIndex: number) => {
  const replications = processes.map((process) => process.results[scenarioIndex]);
  return {
    entityCount: row.entityCount,
    changedCount: row.changedCount,
    processCount: replications.length,
    processMedians: replications.map((result) => ({
      scanUs: result.scan.medianMs * 1_000,
      graphUs: result.compiledGraph.medianMs * 1_000,
      scanOverGraph: result.paired.medianScanOverGraph,
      graphWins: result.paired.graphFasterPairs,
      scanWins: result.paired.scanFasterPairs,
      outputParity: result.outputParity,
    })),
    medianScanUsAcrossProcesses: median(replications.map((result) => result.scan.medianMs * 1_000)),
    medianGraphUsAcrossProcesses: median(replications.map((result) => result.compiledGraph.medianMs * 1_000)),
    medianScanOverGraphAcrossProcesses: median(replications.map((result) => result.paired.medianScanOverGraph)),
    graphWinsAllProcesses: replications.every((result) => result.paired.graphFasterPairs > result.paired.scanFasterPairs),
    parityAllProcesses: replications.every((result) => result.outputParity),
  };
});

const summary = {
  schemaVersion: 1,
  experiment: "Deno scan-vs-graph independent process replications",
  processCount: processes.length,
  seeds,
  runtime: processes.map((process) => process.environment),
  rawSources: seeds.map((_, index) => `results/deno-graph-vs-scan-process-${index + 1}.json`),
  scenarios,
};
await Deno.writeTextFile("results/deno-process-replication-summary.json", JSON.stringify(summary, null, 2) + "\n");
console.table(scenarios.map((row: any) => ({
  entities: row.entityCount,
  changed: row.changedCount,
  scanMedianUs: row.medianScanUsAcrossProcesses.toFixed(3),
  graphMedianUs: row.medianGraphUsAcrossProcesses.toFixed(3),
  scanOverGraph: row.medianScanOverGraphAcrossProcesses.toFixed(2),
  graphWinsAllProcesses: row.graphWinsAllProcesses,
  parityAllProcesses: row.parityAllProcesses,
})));
