const arms = ["serial", "reactPreload", "dag"] as const;
const permutations = [
  ["serial", "reactPreload", "dag"],
  ["serial", "dag", "reactPreload"],
  ["reactPreload", "serial", "dag"],
  ["reactPreload", "dag", "serial"],
  ["dag", "serial", "reactPreload"],
  ["dag", "reactPreload", "serial"],
];
const schedule = Array.from({ length: 30 }, (_, index) => ({
  replication: index,
  order: permutations[index % permutations.length],
}));
const sourceFiles = [
  "async-dag-frontier-protocol.md",
  "async-dag-frontier-benchmark.html",
  "compiler/fixtures/async_dag_frontier.ts",
  "scripts/preregister_async_dag_frontier.ts",
  "src/async_task_plan.ts",
  "src/async_task_scheduler.ts",
  "src/async_vdom_transition_runtime.ts",
  "src/browser/async_dag_frontier_benchmark.tsx",
  "src/browser/generated_async_dag_frontier_plan.ts",
  "src/jsx_binding_runtime.ts",
  "src/vdom_snapshot_runtime.ts",
  "vite.config.ts",
  "package.json",
  "pnpm-lock.yaml",
];
const artifactFiles: string[] = [];
for await (const entry of Deno.readDir("dist/assets")) {
  if (entry.isFile && entry.name.endsWith(".js")) {
    artifactFiles.push(`dist/assets/${entry.name}`);
  }
}
artifactFiles.push("dist/async-dag-frontier-benchmark.html");
const sha256 = async (file: string) => {
  const bytes = await Deno.readFile(file);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
const hashes = async (files: string[]) =>
  Object.fromEntries(await Promise.all(files.map(async (file) => [file, await sha256(file)])));
const directory = "results/async-dag-frontier-v1";
await Deno.mkdir(directory, { recursive: true });
const scheduleRecord = {
  schemaVersion: "async-dag-frontier-schedule-v1",
  repetitions: 30,
  balance: "Each of the six arm permutations occurs five times; order is counterbalanced in a fixed cyclic schedule.",
  blocks: schedule,
};
await Deno.writeTextFile(`${directory}/schedule.json`, `${JSON.stringify(scheduleRecord, null, 2)}\n`);
const preregistration = {
  schemaVersion: "async-dag-frontier-preregistration-v1",
  study: "Async DAG frontier browser study",
  frozenAt: new Date().toISOString(),
  protocol: "async-dag-frontier-protocol.md",
  schedule: `${directory}/schedule.json`,
  sampleUnit: "fresh visible production-browser page block containing one run of each arm",
  arms,
  endpointDelaysMs: { profile: 90, feed: 130, recommendations: 110 },
  browserConditions: { buildMode: "production", visibilityState: "visible", requestCache: "no-store", origin: "same-origin controlled endpoint" },
  decisionRules: {
    frameBudgetMs: 1000 / 60,
    independentFrontierPassRate: 0.95,
    dependentStartPassRate: 0.95,
    hardDependencyViolationsAllowed: 0,
    medianDagVsSequentialSpeedup: 0.2,
    dagP95MaxRelativeToReactPreload: 1.1,
    preserveAllBlocks: true,
    latencyUnit: "page block; paired comparisons by replication index",
  },
  sourceSha256: await hashes(sourceFiles),
  productionArtifactSha256: await hashes(artifactFiles.sort()),
};
await Deno.writeTextFile(`${directory}/preregistration.json`, `${JSON.stringify(preregistration, null, 2)}\n`);
console.log(`Wrote frozen schedule and preregistration to ${directory}`);
