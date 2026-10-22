const seeds = [1_905_426_017, 20_261_011, 20_261_012];
for (let index = 0; index < seeds.length; index++) {
  const outputPath = `results/deno-bucket-scan-vs-graph-process-${index + 1}.json`;
  const command = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-write=results", "scripts/run_bucket_experiment.ts", outputPath, String(seeds[index])],
    stdout: "null",
    stderr: "inherit",
  });
  const result = await command.output();
  if (!result.success) throw new Error(`Bucket replication ${index + 1} failed with status ${result.code}`);
}

const processes = await Promise.all(seeds.map(async (_, index) =>
  JSON.parse(await Deno.readTextFile(`results/deno-bucket-scan-vs-graph-process-${index + 1}.json`))
));
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};
const scenarios = processes[0].results.map((row: any, scenarioIndex: number) => {
  const replications = processes.map((process) => process.results[scenarioIndex]);
  return {
    entityCount: row.entityCount,
    changedFraction: row.changedFraction,
    distribution: row.distribution,
    bucketSize: row.bucketSize,
    processMedians: replications.map((result) => ({
      bucketScanUs: result.bucketMedianMs * 1_000,
      graphUs: result.graphMedianMs * 1_000,
      bucketOverGraph: result.medianBucketOverGraph,
      graphWins: result.graphWins,
      bucketWins: result.bucketWins,
      parityFailures: result.parityFailures,
    })),
    medianBucketScanUsAcrossProcesses: median(replications.map((result) => result.bucketMedianMs * 1_000)),
    medianGraphUsAcrossProcesses: median(replications.map((result) => result.graphMedianMs * 1_000)),
    medianBucketOverGraphAcrossProcesses: median(replications.map((result) => result.medianBucketOverGraph)),
    bucketWinsAllProcesses: replications.every((result) => result.bucketWins > result.graphWins),
    parityAllProcesses: replications.every((result) => result.parityFailures === 0),
  };
});

const summary = {
  schemaVersion: 1,
  experiment: "Deno dirty-bucket scan independent process replications",
  processCount: processes.length,
  seeds,
  runtime: processes.map((process) => process.environment),
  rawSources: seeds.map((_, index) => `results/deno-bucket-scan-vs-graph-process-${index + 1}.json`),
  scenarios,
};
await Deno.writeTextFile("results/deno-bucket-process-replication-summary.json", JSON.stringify(summary, null, 2) + "\n");
console.table(scenarios.filter((row: any) => row.entityCount === 50_000 && row.bucketSize === 64).map((row: any) => ({
  density: `${row.changedFraction * 100}%`,
  distribution: row.distribution,
  bucketUs: row.medianBucketScanUsAcrossProcesses.toFixed(3),
  graphUs: row.medianGraphUsAcrossProcesses.toFixed(3),
  bucketOverGraph: row.medianBucketOverGraphAcrossProcesses.toFixed(2),
  bucketWinsEveryProcess: row.bucketWinsAllProcesses,
})));
