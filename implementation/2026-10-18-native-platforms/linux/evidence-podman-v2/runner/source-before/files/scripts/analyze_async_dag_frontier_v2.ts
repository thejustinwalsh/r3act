const directory = "results/async-dag-frontier-v2";
const schedule = JSON.parse(await Deno.readTextFile(`${directory}/schedule.json`));
const preregistration = JSON.parse(await Deno.readTextFile(`${directory}/preregistration.json`));
const verifyHashes = async (hashes: Record<string, string>) => {
  for (const [file, expected] of Object.entries(hashes)) {
    const bytes = await Deno.readFile(file);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const actual = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    if (actual !== expected) throw new Error(`Frozen hash mismatch: ${file}`);
  }
};
await verifyHashes(preregistration.sourceSha256);
await verifyHashes(preregistration.productionArtifactSha256);
const rawFiles: string[] = [];
for await (const entry of Deno.readDir(directory)) {
  if (entry.isFile && /^async-dag-frontier-v2-r\d+-\d+\.json$/.test(entry.name)) {
    rawFiles.push(`${directory}/${entry.name}`);
  }
}
const records = await Promise.all(rawFiles.map(async (file) => JSON.parse(await Deno.readTextFile(file))));
records.sort((left, right) => left.replication - right.replication);
if (records.length !== 30) throw new Error(`Expected 30 scheduled blocks, found ${records.length}`);
for (let index = 0; index < 30; index++) {
  const record = records[index];
  if (record.replication !== index) throw new Error(`Missing or duplicate replication ${index}`);
  if (JSON.stringify(record.armOrder) !== JSON.stringify(schedule.blocks[index].order)) {
    throw new Error(`Arm order mismatch in replication ${index}`);
  }
  if (record.schemaVersion !== "async-dag-frontier-browser-v2" || record.collection !== "async-dag-frontier-v2") {
    throw new Error(`Unexpected schema in replication ${index}`);
  }
}
const sorted = (values: number[]) => values.toSorted((a, b) => a - b);
const median = (values: number[]) => {
  const ordered = sorted(values);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};
const percentile = (values: number[], probability: number) =>
  sorted(values)[Math.ceil(probability * values.length) - 1];
const summarize = (values: number[]) => ({
  n: values.length,
  medianMs: median(values),
  p95Ms: percentile(values, 0.95),
  meanMs: values.reduce((sum, value) => sum + value, 0) / values.length,
  minMs: Math.min(...values),
  maxMs: Math.max(...values),
  valuesMs: values,
});
const latency = Object.fromEntries(["serial", "reactPreload", "dag"].map((arm) => [
  arm,
  summarize(records.map((record) => record.arms[arm].durationMs)),
]));
const pairedRatio = (numerator: string, denominator: string) =>
  records.map((record) => record.arms[numerator].durationMs / record.arms[denominator].durationMs);
const dagVsSerial = pairedRatio("dag", "serial");
const dagVsReactPreload = pairedRatio("dag", "reactPreload");
const frameBudgetMs = preregistration.decisionRules.frameBudgetMs;
const mechanism = {
  blocks: records.length,
  completeAndPassingBlocks: records.filter((record) => record.status === "PASS").length,
  allOutputsParity: records.every((record) => record.outputParity),
  allArmsKeepPendingUi: records.every((record) => record.allPendingRetained),
  allArmsKeepKeyedDomIdentity: records.every((record) => record.allKeyIdentityRetained),
  hardDependencyViolations: records.filter((record) => !record.allDependenciesValid).length,
  oneCommitPerArm: records.every((record) => Object.values(record.commitCount).every((count: number) => count === 1)),
  dagIndependentFrontierWithinFrame: records.filter((record) => record.arms.dag.independentStartGapMs <= frameBudgetMs).length,
  dagDependentStartWithinFrame: records.filter((record) => record.arms.dag.dependentTasksWithinFrame).length,
  reactPreloadDependentStartWithinFrame: records.filter((record) => record.arms.reactPreload.dependentTasksWithinFrame).length,
  dagIndependentStartGapMedianMs: median(records.map((record) => record.arms.dag.independentStartGapMs)),
  reactPreloadIndependentStartGapMedianMs: median(records.map((record) => record.arms.reactPreload.independentStartGapMs)),
  dagDependentStartLagMaxMs: Math.max(...records.map((record) => record.arms.dag.maxDependentStartLagMs)),
};
const v1Files: string[] = [];
for await (const entry of Deno.readDir("results/async-dag-frontier-v1")) {
  if (entry.isFile && /^async-dag-frontier-v1-r\d+-\d+\.json$/.test(entry.name)) {
    v1Files.push(`results/async-dag-frontier-v1/${entry.name}`);
  }
}
const v1Records = await Promise.all(v1Files.map(async (file) => JSON.parse(await Deno.readTextFile(file))));
const v1SetupAudit = {
  records: v1Records.length,
  pass: v1Records.filter((record) => record.status === "PASS").length,
  fail: v1Records.filter((record) => record.status === "FAIL").length,
  reactPendingUiViolations: v1Records.filter((record) => !record.arms.reactPreload.pendingRetained || !record.arms.serial.pendingRetained).length,
  validity: "INVALID_FOR_PENDING_UI_AND_KEY_IDENTITY_CONCLUSIONS",
  reason: "The first React Suspense view had not completed its initial layout before some first-arm samples. The full raw run is preserved and excluded from v2 estimates.",
};
const summary = {
  schemaVersion: "async-dag-frontier-analysis-v2",
  study: "Async DAG frontier browser study v2",
  preregistration: `${directory}/preregistration.json`,
  sampleUnit: "paired page block",
  rawRecordCount: records.length,
  scheduleBalance: schedule.balance,
  endpointDelaysMs: preregistration.endpointDelaysMs,
  latency,
  pairedComparisons: {
    dagVsSequentialControl: {
      pairedMedianRatio: median(dagVsSerial),
      pairedMedianSpeedupFraction: 1 - median(dagVsSerial),
      pairedRatioP95: percentile(dagVsSerial, 0.95),
      allRatios: dagVsSerial,
      preregisteredMedianSpeedupThreshold: preregistration.decisionRules.medianDagVsSequentialSpeedup,
      passesMedianThreshold: 1 - median(dagVsSerial) >= preregistration.decisionRules.medianDagVsSequentialSpeedup,
    },
    dagVsReactPreload: {
      pairedMedianRatio: median(dagVsReactPreload),
      pairedRatioP95: percentile(dagVsReactPreload, 0.95),
      absoluteP95Ratio: latency.dag.p95Ms / latency.reactPreload.p95Ms,
      allRatios: dagVsReactPreload,
      preregisteredP95MaxRatio: preregistration.decisionRules.dagP95MaxRelativeToReactPreload,
      passesP95Threshold: latency.dag.p95Ms <= latency.reactPreload.p95Ms * preregistration.decisionRules.dagP95MaxRelativeToReactPreload,
    },
  },
  mechanism,
  v1SetupAudit,
  interpretation: "The compiled DAG reliably exposes and launches the ready frontier, removes the sequential loader waterfall, and coordinates one retained-view commit. It does not show a latency advantage over React given equal explicit preloading; report orchestration and inspectability gains, not general React speed superiority.",
};
await Deno.writeTextFile(`${directory}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({
  rawRecordCount: summary.rawRecordCount,
  latency: Object.fromEntries(Object.entries(latency).map(([arm, stats]) => [arm, { medianMs: stats.medianMs, p95Ms: stats.p95Ms }])),
  pairedComparisons: {
    dagVsSequentialMedianSpeedup: summary.pairedComparisons.dagVsSequentialControl.pairedMedianSpeedupFraction,
    dagVsReactPreloadP95Ratio: summary.pairedComparisons.dagVsReactPreload.absoluteP95Ratio,
  },
  mechanism,
  v1SetupAudit,
}, null, 2));
