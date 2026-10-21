type Arm = "ownerCache" | "fullRender";
const seeds = [1_610_091_001, 1_610_091_102, 1_610_091_203];
const records = await Promise.all(seeds.map(async (_, index) =>
  JSON.parse(await Deno.readTextFile(`results/component-update-ablation-v1-process-${index + 1}.json`))
));
const median = (values: number[]) => {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = ordered.length >>> 1;
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};
if (records.some((record, index) => record.schemaVersion !== "component-update-ablation-v1" ||
  record.scenarios.length !== 4 || record.scenarios.some((scenario: any) =>
    !scenario.finalOutputParity || !scenario.renderCountContract || !scenario.partialCommitContract || scenario.seed !== seeds[index] + scenario.size
  ))) throw new Error("A component update process failed protocol or parity validation");

const sizes = records[0].scenarios.map((scenario: any) => scenario.size);
if (records.some((record) => record.scenarios.map((scenario: any) => scenario.size).join() !== sizes.join())) {
  throw new Error("Component update replications do not have matching scenario sizes");
}
const scenarios: Array<{
  size: number;
  medianMs: Record<Arm, number>;
  medianSpeedupFullOverOwnerCache: number;
  pairedWinsByProcess: Array<{ ownerCache: number; fullRender: number; ties: number }>;
  [field: string]: unknown;
}> = sizes.map((size: number) => {
  const processScenarios = records.map((record) => record.scenarios.find((scenario: any) => scenario.size === size));
  const arms: Arm[] = ["ownerCache", "fullRender"];
  const medianMs = Object.fromEntries(arms.map((arm) => [arm, median(processScenarios.map((scenario: any) => scenario.medianMs[arm]))])) as Record<Arm, number>;
  const p95Ms = Object.fromEntries(arms.map((arm) => [arm, median(processScenarios.map((scenario: any) => scenario.p95Ms[arm]))])) as Record<Arm, number>;
  const pairedWins = processScenarios.map((scenario: any) => ({
    ownerCache: scenario.samples.filter((sample: any) => sample.milliseconds.ownerCache < sample.milliseconds.fullRender).length,
    fullRender: scenario.samples.filter((sample: any) => sample.milliseconds.fullRender < sample.milliseconds.ownerCache).length,
    ties: scenario.samples.filter((sample: any) => sample.milliseconds.ownerCache === sample.milliseconds.fullRender).length,
  }));
  return {
    size,
    medianMs,
    medianProcessP95Ms: p95Ms,
    medianSpeedupFullOverOwnerCache: median(processScenarios.map((scenario: any) => scenario.medianMs.fullRender / scenario.medianMs.ownerCache)),
    pairedWinsByProcess: pairedWins,
    processes: processScenarios.map((scenario: any, index: number) => ({
      seed: seeds[index],
      medianMs: scenario.medianMs,
      p95Ms: scenario.p95Ms,
      rendersPerUpdate: scenario.rendersPerUpdate,
      partialCommitsPerUpdate: scenario.partialCommitsPerUpdate,
      pairCount: scenario.measuredPairs,
    })),
    allOutputParity: processScenarios.every((scenario: any) => scenario.finalOutputParity),
    allRenderCountContracts: processScenarios.every((scenario: any) => scenario.renderCountContract),
    allPartialCommitContracts: processScenarios.every((scenario: any) => scenario.partialCommitContract),
  };
});

const summary = {
  schemaVersion: "component-update-ablation-summary-v1",
  status: "PASS",
  processCount: records.length,
  independentReplicationUnit: "fresh serialized Deno process",
  runtimes: records.map((record) => record.runtime),
  compiler: records[0].compiler,
  protocol: records[0].methodology,
  scenarios,
  rawFiles: records.map((_, index) => `results/component-update-ablation-v1-process-${index + 1}.json`),
  limitation: "same-runtime Deno ablation; the owner-cache arm uses the compiler-selected owner and indexed unique keyed host-root to update one region without visiting siblings. Structural or ineligible updates fall back to full reconciliation. Not a React or browser comparison.",
};
await Deno.writeTextFile("results/component-update-ablation-summary-v1.json", JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(scenarios.map(({ size, medianMs, medianSpeedupFullOverOwnerCache, pairedWinsByProcess }) => ({
  size,
  medianMs,
  medianSpeedupFullOverOwnerCache,
  pairedWinsByProcess,
})), null, 2));
console.log("Saved component update ablation summary to results/component-update-ablation-summary-v1.json");
