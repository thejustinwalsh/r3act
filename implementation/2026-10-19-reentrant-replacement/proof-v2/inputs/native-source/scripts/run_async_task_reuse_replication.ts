import { runAsyncTaskReuseBenchmark } from "../src/async_task_reuse_benchmark.ts";

const result = await runAsyncTaskReuseBenchmark();
await Deno.writeTextFile(
  "results/async-task-reuse-cost-replication-v1.json",
  JSON.stringify(result, null, 2) + String.fromCharCode(10),
);
if (result.status !== "PASS") {
  throw new Error("Async task reuse replication failed correctness checks");
}
console.log(JSON.stringify(
  {
    status: result.status,
    run: result.run,
    repetitions: result.repetitions,
    cases: result.cases.map((entry) => ({
      totalTasks: entry.totalTasks,
      changedPercent: entry.changedPercent,
      workIterations: entry.workIterations,
      fullRestartMedianMs: entry.fullRestart.medianMs,
      reuseMedianMs: entry.reuseCompleted.medianMs,
      medianTimeSavedPercent: entry.medianTimeSavedPercent,
      reusedTasks: entry.reuseCompleted.medianReused,
      correctnessPass: entry.correctnessPass,
    })),
  },
  null,
  2,
));
