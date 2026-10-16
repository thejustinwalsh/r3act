import {
  type AsyncTaskSpec,
  executeAsyncTaskPlan,
  prepareAsyncTaskPlan,
} from "./async_task_scheduler.ts";

type Strategy = "full-restart" | "reuse-completed";

type Trial = {
  strategy: Strategy;
  durationMs: number;
  startedWorkTasks: number;
  reusedTasks: number;
  correct: boolean;
};

type CaseSummary = {
  totalTasks: number;
  changedPercent: number;
  workIterations: number;
  fullRestart: { medianMs: number; p95Ms: number; medianStarted: number };
  reuseCompleted: {
    medianMs: number;
    p95Ms: number;
    medianStarted: number;
    medianReused: number;
  };
  medianTimeSavedPercent: number;
  correctnessPass: boolean;
  trials: Trial[];
};

const quantile = (values: readonly number[], fraction: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
  return sorted[Math.min(sorted.length - 1, rank)];
};

const median = (values: readonly number[]) => quantile(values, 0.5);

const makeWork = (iterations: number, salt: number) => {
  let value = salt | 0;
  for (let index = 0; index < iterations; index++) {
    value = Math.imul(value ^ (index + salt), 1664525) + 1013904223 | 0;
  }
  return value;
};

const runTrial = async (
  totalTasks: number,
  changedPercent: number,
  workIterations: number,
  strategy: Strategy,
): Promise<Trial> => {
  const changedCount = Math.max(
    1,
    Math.min(totalTasks - 1, Math.round(totalTasks * changedPercent / 100)),
  );
  const independentCount = totalTasks - changedCount;
  const workTaskCount = changedCount + independentCount;
  const runCounts = new Map<string, number>();
  let workCallbacksCompleted = 0;
  let allWorkCallbacks: () => void = () => {};
  const allWorkDone = new Promise<void>((resolve) =>
    allWorkCallbacks = resolve
  );
  let holdStarted: () => void = () => {};
  const holdHasStarted = new Promise<void>((resolve) => holdStarted = resolve);
  let releaseHold: () => void = () => {};
  const held = new Promise<void>((resolve) => releaseHold = resolve);
  let holdCalls = 0;
  const countRun = (id: string) =>
    runCounts.set(id, (runCounts.get(id) ?? 0) + 1);
  const finishWork = () => {
    workCallbacksCompleted++;
    if (workCallbacksCompleted === workTaskCount) allWorkCallbacks();
  };

  const tasks: AsyncTaskSpec[] = [];
  for (let index = 0; index < changedCount; index++) {
    const id = `changed-${index}`;
    const dependency = index === 0 ? "query" : `changed-${index - 1}`;
    tasks.push({
      id,
      dependsOn: [dependency],
      run: (inputs) => {
        countRun(id);
        const value = makeWork(workIterations, index + 17);
        finishWork();
        return `${String(inputs.get(dependency))}:${value}`;
      },
    });
  }
  for (let index = 0; index < independentCount; index++) {
    const id = `independent-${index}`;
    tasks.push({
      id,
      dependsOn: ["locale"],
      run: () => {
        countRun(id);
        const value = makeWork(workIterations, index + 1009);
        finishWork();
        return value;
      },
    });
  }
  tasks.push({
    id: "invalidation-gate",
    dependsOn: [],
    run: (_inputs, signal) => {
      countRun("invalidation-gate");
      holdCalls++;
      if (holdCalls > 1) return "released";
      holdStarted();
      signal.addEventListener("abort", releaseHold, { once: true });
      return held;
    },
  });

  const oldInputs = { query: "old", locale: "en" };
  const oldPrepared = prepareAsyncTaskPlan(tasks, oldInputs);
  const abortController = new AbortController();
  const firstAttempt = executeAsyncTaskPlan(
    tasks,
    oldInputs,
    { signal: abortController.signal },
    oldPrepared,
  );
  await Promise.all([holdHasStarted, allWorkDone]);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  abortController.abort("input changed");
  const cached = await firstAttempt;
  if (
    cached.status !== "aborted" || cached.completed.length !== workTaskCount
  ) {
    throw new Error(
      "Benchmark setup did not complete all work before invalidation",
    );
  }

  runCounts.clear();
  const nextInputs = { query: "new", locale: "en" };
  const nextPrepared = prepareAsyncTaskPlan(tasks, nextInputs);
  const startedAt = performance.now();
  const result = await executeAsyncTaskPlan(
    tasks,
    nextInputs,
    {
      reuseCompleted: strategy === "reuse-completed"
        ? {
          values: cached.values,
          completed: cached.completed,
          changedInputs: ["query"],
        }
        : undefined,
    },
    nextPrepared,
  );
  const durationMs = performance.now() - startedAt;
  const finalTask = `changed-${changedCount - 1}`;
  let expectedChanged: unknown = nextInputs.query;
  let outputsMatch = true;
  for (let index = 0; index < changedCount; index++) {
    expectedChanged = String(expectedChanged) + ":" +
      makeWork(workIterations, index + 17);
    outputsMatch &&= result.values.get(`changed-${index}`) === expectedChanged;
  }
  for (let index = 0; index < independentCount; index++) {
    outputsMatch &&= result.values.get(`independent-${index}`) ===
      makeWork(workIterations, index + 1009);
  }
  const correct = result.status === "complete" && outputsMatch &&
    result.values.has(finalTask) && result.reused.length ===
      (strategy === "reuse-completed" ? independentCount : 0);
  if (!correct) {
    throw new Error(`Incorrect ${strategy} result for ${finalTask}`);
  }

  const startedWorkTasks =
    result.started.filter((id) => id !== "invalidation-gate").length;
  return {
    strategy,
    durationMs,
    startedWorkTasks,
    reusedTasks: result.reused.length,
    correct,
  };
};

/**
 * Compare retry execution cost after a controlled invalidation point.
 * First, all work tasks finish while an unrelated gate keeps the old attempt
 * pending. The measured interval is only the next attempt. This isolates
 * scheduler retry cost from the artificial wait used to create the snapshot.
 */
export const runAsyncTaskReuseBenchmark = async (
  options: {
    totalTasks?: readonly number[];
    changedPercents?: readonly number[];
    workIterations?: readonly number[];
    repetitions?: number;
  } = {},
) => {
  const totalTasks = options.totalTasks ?? [32, 128];
  const changedPercents = options.changedPercents ?? [10, 50, 90];
  const workIterations = options.workIterations ?? [0, 2_000];
  const repetitions = options.repetitions ?? 31;
  if (!Number.isSafeInteger(repetitions) || repetitions < 3) {
    throw new RangeError("repetitions must be an integer of at least 3");
  }

  const cases: CaseSummary[] = [];
  for (const taskCount of totalTasks) {
    for (const changedPercent of changedPercents) {
      for (const iterations of workIterations) {
        const trials: Trial[] = [];
        for (let repetition = 0; repetition < repetitions; repetition++) {
          const strategies: Strategy[] = repetition % 2 === 0
            ? ["full-restart", "reuse-completed"]
            : ["reuse-completed", "full-restart"];
          for (const strategy of strategies) {
            trials.push(
              await runTrial(taskCount, changedPercent, iterations, strategy),
            );
          }
        }
        const full = trials.filter((trial) =>
          trial.strategy === "full-restart"
        );
        const reuse = trials.filter((trial) =>
          trial.strategy === "reuse-completed"
        );
        const fullMedian = median(full.map((trial) => trial.durationMs));
        const reuseMedian = median(reuse.map((trial) => trial.durationMs));
        cases.push({
          totalTasks: taskCount,
          changedPercent,
          workIterations: iterations,
          fullRestart: {
            medianMs: fullMedian,
            p95Ms: quantile(full.map((trial) => trial.durationMs), 0.95),
            medianStarted: median(full.map((trial) => trial.startedWorkTasks)),
          },
          reuseCompleted: {
            medianMs: reuseMedian,
            p95Ms: quantile(reuse.map((trial) => trial.durationMs), 0.95),
            medianStarted: median(reuse.map((trial) => trial.startedWorkTasks)),
            medianReused: median(reuse.map((trial) => trial.reusedTasks)),
          },
          medianTimeSavedPercent: fullMedian === 0
            ? 0
            : (fullMedian - reuseMedian) / fullMedian * 100,
          correctnessPass: trials.every((trial) => trial.correct),
          trials,
        });
      }
    }
  }
  return {
    schemaVersion: "async-task-reuse-cost-v1",
    status: cases.every((entry) => entry.correctnessPass) ? "PASS" : "FAIL",
    run: {
      recordedAt: new Date().toISOString(),
      denoVersion: Deno.version.deno,
      v8Version: Deno.version.v8,
      typescriptVersion: Deno.version.typescript,
      target: Deno.build.target,
      architecture: Deno.build.arch,
    },
    methodology: {
      benchmarkedOperation:
        "scheduler retry only, after prior completed values are available",
      topology:
        "one query-dependent chain plus independent leaf tasks and a final independent gate",
      invalidation:
        "query changes after all work tasks complete and while the gate remains pending",
      timing:
        "performance.now wall time on one Deno process; alternating strategy order",
      excluded: [
        "candidate-root preparation and DOM commit",
        "React comparison",
        "browser frame presentation",
        "worker execution or CPU parallelism",
      ],
    },
    repetitions,
    cases,
  };
};
