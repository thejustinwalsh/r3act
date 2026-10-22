const paths = [1, 2, 3].map((index) => `results/task-graph-dispatch-v5-process-${index}.json`);
const runs = await Promise.all(paths.map(async (path) => JSON.parse(await Deno.readTextFile(path))));
if (runs.some((run) => run.experiment !== "Paired task-graph dispatch versus full recomputation")) {
  throw new Error("Unexpected task-graph experiment record");
}
if (new Set(runs.map((run) => run.protocol.randomizationSeed)).size !== runs.length) {
  throw new Error("Task-graph replications must use distinct randomization seeds");
}
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};
const nearestRank = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const key = (row: { entityCount: number; changedFraction: number }) => `${row.entityCount}:${row.changedFraction}`;
const scenarios = runs[0].results.map((row: any) => {
  const matches = runs.map((run) => run.results.find((candidate: any) => key(candidate) === key(row)));
  if (matches.some((match: any) => !match || match.parityFailures !== 0)) {
    throw new Error(`Missing scenario or failed parity for ${key(row)}`);
  }
  const graphPairs = matches.flatMap((match: any) => match.pairs.map((pair: any) => pair.taskGraphMs));
  const scanPairs = matches.flatMap((match: any) => match.pairs.map((pair: any) => pair.fullScanMs));
  return {
    entityCount: row.entityCount,
    changedFraction: row.changedFraction,
    changedCount: row.changedCount,
    medianAcrossProcessMediansMs: {
      taskGraph: median(matches.map((match: any) => match.medianMs.taskGraph)),
      fullScan: median(matches.map((match: any) => match.medianMs.fullScan)),
    },
    p95AcrossPairedSamplesMs: {
      taskGraph: nearestRank(graphPairs, 0.95),
      fullScan: nearestRank(scanPairs, 0.95),
    },
    speedupFullScanOverGraph: median(matches.map((match: any) => match.medianMs.fullScan)) /
      median(matches.map((match: any) => match.medianMs.taskGraph)),
    pairedWinsByProcess: matches.map((match: any) => match.pairedWins),
    parityEveryProcess: matches.every((match: any) => match.parityFailures === 0),
  };
});
const summary = {
  schemaVersion: 1,
  experiment: runs[0].experiment,
  processCount: runs.length,
  pairCountPerProcess: runs[0].protocol.pairCount,
  randomizationSeeds: runs.map((run) => run.protocol.randomizationSeed),
  environments: runs.map((run) => run.environment),
  protocol: runs[0].protocol,
  scenarios,
};
await Deno.writeTextFile("results/task-graph-dispatch-summary-v5.json", JSON.stringify(summary, null, 2) + "\n");
console.table(scenarios.map((row: any) => ({
  nodes: row.entityCount,
  changed: `${row.changedFraction * 100}%`,
  graphUs: (row.medianAcrossProcessMediansMs.taskGraph * 1_000).toFixed(2),
  scanUs: (row.medianAcrossProcessMediansMs.fullScan * 1_000).toFixed(2),
  scanOverGraph: row.speedupFullScanOverGraph.toFixed(2),
  parity: row.parityEveryProcess,
})));
