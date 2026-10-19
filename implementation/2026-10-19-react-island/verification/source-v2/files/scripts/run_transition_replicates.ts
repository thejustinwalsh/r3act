const replications = [465_477, 735_013, 240_719];
const runs: Array<{ label: string; seed: number; artifact: Record<string, any> }> = [];

for (let index = 0; index < replications.length; index++) {
  const seed = replications[index];
  const label = `rep-${String(index + 1).padStart(2, "0")}`;
  const command = new Deno.Command(Deno.execPath(), {
    args: ["run", "--config", "deno.browser.json", "--allow-write=results", "scripts/run_transition_experiment.ts", String(seed), label],
    stdout: "piped",
    stderr: "piped",
  });
  const output = await command.output();
  if (!output.success) {
    console.error(new TextDecoder().decode(output.stdout));
    console.error(new TextDecoder().decode(output.stderr));
    throw new Error(`Transition benchmark replication ${label} failed`);
  }
  const artifactPath = `results/transition-coordinator-fanin-${label}.json`;
  const artifact = JSON.parse(await Deno.readTextFile(artifactPath));
  runs.push({ label, seed, artifact });
  console.log(new TextDecoder().decode(output.stdout));
}

const rootCounts = runs[0].artifact.summaries.map((row: any) => row.rootCount);
const summary = {
  schemaVersion: "transition-coordinator-fanin-replication-summary-v1",
  replicationCount: runs.length,
  rootCounts,
  runs: runs.map(({ label, seed, artifact }) => ({
    label,
    seed,
    runtime: artifact.runtime,
    summaries: artifact.summaries,
  })),
  crossProcess: rootCounts.map((rootCount: number) => {
    const rows = runs.map(({ artifact }) => artifact.summaries.find((row: any) => row.rootCount === rootCount));
    return {
      rootCount,
      indexedMedianMsByRun: rows.map((row: any) => row.indexedCoordinator.medianMs),
      scanMedianMsByRun: rows.map((row: any) => row.scanOnEveryResolve.medianMs),
      scanOverIndexedMedianRatioByRun: rows.map((row: any) => row.scanOverIndexedMedianRatio),
      indexedWinsByRun: rows.map((row: any) => row.wins.indexedCoordinator),
      pairCountPerRun: rows.map((row: any) => row.pairCount),
    };
  }),
};
const summaryPath = "results/transition-coordinator-fanin-replication-summary-v1.json";
await Deno.writeTextFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`Wrote ${summaryPath}`);
