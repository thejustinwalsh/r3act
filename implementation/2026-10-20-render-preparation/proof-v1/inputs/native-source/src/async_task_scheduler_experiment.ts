import { executeAsyncTaskPlan } from "./async_task_scheduler.ts";

const deferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => resolve = resolvePromise);
  return { promise, resolve };
};

/** Deterministic deferred-promise fixture; reports event order, never durations. */
export const runAsyncTaskSchedulerExperiment = async () => {
  const profile = deferred<string>();
  const feed = deferred<string>();
  const headerStarted = deferred<void>();
  const pageModelStarted = deferred<void>();
  const started: string[] = [];
  const execution = executeAsyncTaskPlan(
    [
      {
        id: "profile",
        dependsOn: [],
        run: () => {
          started.push("profile");
          return profile.promise;
        },
      },
      {
        id: "feed",
        dependsOn: [],
        run: () => {
          started.push("feed");
          return feed.promise;
        },
      },
      {
        id: "personalized-header",
        dependsOn: ["profile"],
        run: (inputs) => {
          started.push("personalized-header");
          headerStarted.resolve();
          return `Hello ${inputs.get("profile")}`;
        },
      },
      {
        id: "page-model",
        dependsOn: ["profile", "feed"],
        run: (inputs) => {
          started.push("page-model");
          pageModelStarted.resolve();
          return `${inputs.get("profile")}:${inputs.get("feed")}`;
        },
      },
    ],
    {},
    { maxConcurrency: 2 },
  );

  const startedInitially = [...started];
  profile.resolve("Ada");
  await headerStarted.promise;
  const startedAfterProfile = [...started];
  const pageModelWaitedForFeed = !started.includes("page-model");

  feed.resolve("news");
  await pageModelStarted.promise;
  const result = await execution;
  const contractsPass = result.status === "complete" &&
    JSON.stringify(startedInitially) === JSON.stringify(["profile", "feed"]) &&
    JSON.stringify(startedAfterProfile) ===
      JSON.stringify(["profile", "feed", "personalized-header"]) &&
    pageModelWaitedForFeed &&
    result.values.get("personalized-header") === "Hello Ada" &&
    result.values.get("page-model") === "Ada:news";
  if (!contractsPass) {
    throw new Error(
      "Async task scheduling fixture failed its event-order contract",
    );
  }

  return {
    schemaVersion: "async-task-scheduler-event-trace-v1",
    status: "PASS",
    execution:
      "executeAsyncTaskPlan with deferred promises and maxConcurrency=2",
    timingMeasured: false,
    startedInitially,
    startedAfterProfile,
    pageModelWaitedForFeed,
    completed: result.completed,
    outputs: {
      personalizedHeader: result.values.get("personalized-header"),
      pageModel: result.values.get("page-model"),
    },
    contractsPass,
    limitation:
      "Deterministic event-order proof only. It does not measure wall time, compare React, integrate VDOM commits, or parallelize CPU work.",
  };
};
