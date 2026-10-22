const seeds = [1_222_641_101, 1_222_641_211, 1_222_641_307];
const outputs = seeds.map((_, index) => `results/deno-three-way-dispatch-process-${index + 1}.json`);
const children = await Promise.all(outputs.map((output, index) =>
  new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-write=results", "scripts/run_dispatch_experiment.ts", output, String(seeds[index])],
    stdout: "inherit",
    stderr: "inherit",
  }).spawn()
));
const statuses = await Promise.all(children.map((child) => child.status));
if (statuses.some((status) => !status.success)) throw new Error("A three-way dispatch replication failed");

const replications = await Promise.all(outputs.map(async (path) =>
  JSON.parse(await Deno.readTextFile(path)) as {
    environment: Record<string, unknown>;
    results: Array<Record<string, any>>;
  }
));
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};
const keyOf = (row: Record<string, any>) => `${row.changedFraction}:${row.distribution}`;
const scenarios = replications[0].results.map((row) => {
  const same = replications.map((run) => run.results.find((candidate) => keyOf(candidate) === keyOf(row))!);
  return {
    entityCount: row.entityCount,
    changedFraction: row.changedFraction,
    changedCount: row.changedCount,
    distribution: row.distribution,
    bucketSize: row.bucketSize,
    bucketEntityInspectionsPerBatch: row.bucketEntityInspectionsPerBatch,
    medianUsAcrossProcesses: {
      graph: median(same.map((result) => result.mediansMs.graph * 1_000)),
      bucketScan: median(same.map((result) => result.mediansMs.bucketScan * 1_000)),
      fullScan: median(same.map((result) => result.mediansMs.fullScan * 1_000)),
    },
    pairwiseWinsByProcess: same.map((result) => result.pairwiseWins),
    parityEveryProcess: same.every((result) => result.parityFailures === 0),
  };
});
const summary = {
  schemaVersion: 1,
  experiment: "Three-way graph, bucket, and full-scan independent process replications",
  processCount: outputs.length,
  seeds,
  runtime: replications[0].environment,
  rawSources: outputs,
  scenarios,
};
await Deno.writeTextFile("results/deno-three-way-dispatch-replication-summary.json", JSON.stringify(summary, null, 2) + "\n");
console.table(scenarios.map((row) => ({
  changed: `${row.changedFraction * 100}%`, layout: row.distribution,
  graphUs: row.medianUsAcrossProcesses.graph.toFixed(3),
  bucketUs: row.medianUsAcrossProcesses.bucketScan.toFixed(3),
  scanUs: row.medianUsAcrossProcesses.fullScan.toFixed(3),
  parity: row.parityEveryProcess,
})));
console.log(`Independent three-way Deno processes: ${summary.processCount}`);
