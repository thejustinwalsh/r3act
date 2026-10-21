import { executeAsyncTaskPlan } from "./async_task_scheduler.ts";
import { runAsyncTaskSchedulerExperiment } from "./async_task_scheduler_experiment.ts";

const assertEquals = (
  actual: unknown,
  expected: unknown,
  message = "Values differ",
) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, received ${
        JSON.stringify(actual)
      }`,
    );
  }
};

const deferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

Deno.test("async task plan overlaps independent work and releases ready branches early", async () => {
  const profile = deferred<string>();
  const feed = deferred<string>();
  const personalizedStarted = deferred<void>();
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
          personalizedStarted.resolve();
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

  assertEquals(
    started,
    ["profile", "feed"],
    "Both independent resources should start immediately",
  );
  profile.resolve("Ada");
  await personalizedStarted.promise;
  assertEquals(started, ["profile", "feed", "personalized-header"]);
  assertEquals(
    started.includes("page-model"),
    false,
    "Fan-in task must wait for every prerequisite",
  );

  feed.resolve("news");
  await pageModelStarted.promise;
  const result = await execution;
  assertEquals(result.status, "complete");
  assertEquals(result.started, [
    "profile",
    "feed",
    "personalized-header",
    "page-model",
  ]);
  assertEquals(result.completed.length, 4);
  assertEquals(result.values.get("personalized-header"), "Hello Ada");
  assertEquals(result.values.get("page-model"), "Ada:news");
});

Deno.test("async task plan respects its concurrency cap", async () => {
  const gates = [deferred<number>(), deferred<number>(), deferred<number>()];
  const thirdStarted = deferred<void>();
  const started: string[] = [];
  const execution = executeAsyncTaskPlan(
    gates.map((gate, index) => ({
      id: `resource-${index}`,
      dependsOn: [],
      run: () => {
        const id = `resource-${index}`;
        started.push(id);
        if (index === 2) thirdStarted.resolve();
        return gate.promise;
      },
    })),
    {},
    { maxConcurrency: 2 },
  );

  assertEquals(started, ["resource-0", "resource-1"]);
  gates[1].resolve(1);
  await thirdStarted.promise;
  assertEquals(started, ["resource-0", "resource-1", "resource-2"]);
  gates[0].resolve(0);
  gates[2].resolve(2);
  const result = await execution;
  assertEquals(result.status, "complete");
  assertEquals(result.completed.length, 3);
});

Deno.test("async task plan reuses completed work outside changed-input closure", async () => {
  const started: string[] = [];
  const values = new Map<string, unknown>([
    ["load", "old load"],
    ["derive", "old derive"],
    ["catalog", "cached catalog"],
  ]);
  const result = await executeAsyncTaskPlan(
    [
      {
        id: "load",
        dependsOn: ["query"],
        run: (inputs) => {
          started.push("load");
          return `load:${inputs.get("query")}`;
        },
      },
      {
        id: "derive",
        dependsOn: ["load"],
        run: (inputs) => {
          started.push("derive");
          return `derive:${inputs.get("load")}`;
        },
      },
      {
        id: "catalog",
        dependsOn: ["locale"],
        run: () => {
          started.push("catalog");
          return "new catalog";
        },
      },
    ],
    { query: "new", locale: "en" },
    {
      reuseCompleted: {
        values,
        completed: ["load", "derive", "catalog"],
        changedInputs: ["query"],
      },
    },
  );

  assertEquals(result.status, "complete");
  assertEquals(started, ["load", "derive"]);
  assertEquals(result.reused, ["catalog"]);
  assertEquals(result.completed, ["catalog", "load", "derive"]);
  assertEquals(result.values.get("derive"), "derive:load:new");
  assertEquals(result.values.get("catalog"), "cached catalog");
});

Deno.test("cancelled async task plans return promptly and ignore late task results", async () => {
  const gate = deferred<string>();
  const controller = new AbortController();
  let taskSignal: AbortSignal | undefined;
  const completionEvents: string[] = [];
  const execution = executeAsyncTaskPlan(
    [{
      id: "slow-resource",
      dependsOn: [],
      run: (_inputs, signal) => {
        taskSignal = signal;
        return gate.promise;
      },
    }],
    {},
    {
      signal: controller.signal,
      onTaskComplete: ({ taskId }) => completionEvents.push(taskId),
    },
  );

  controller.abort("superseded");
  const result = await execution;
  assertEquals(result.status, "aborted");
  assertEquals(taskSignal?.aborted, true);
  assertEquals(result.completed, []);

  gate.resolve("late value");
  await Promise.resolve();
  assertEquals(
    result.values.has("slow-resource"),
    false,
    "Late completion must not enter the cancelled candidate",
  );
  assertEquals(
    completionEvents,
    [],
    "Late completion must not notify output observers",
  );
});

Deno.test("task completion observers run before dependent tasks start", async () => {
  const root = deferred<string>();
  const events: string[] = [];
  const execution = executeAsyncTaskPlan(
    [
      { id: "root", dependsOn: [], run: () => root.promise },
      {
        id: "child",
        dependsOn: ["root"],
        run: (inputs) => {
          events.push(`start:child:${inputs.get("root")}`);
          return "done";
        },
      },
    ],
    {},
    {
      onTaskComplete: ({ taskId, value, reused }) =>
        events.push(`complete:${taskId}:${String(value)}:${reused}`),
    },
  );

  root.resolve("ready");
  const result = await execution;
  assertEquals(result.status, "complete");
  assertEquals(events, [
    "complete:root:ready:false",
    "start:child:ready",
    "complete:child:done:false",
  ]);
});

Deno.test("completion observer abort prevents its task dependents from starting", async () => {
  const controller = new AbortController();
  const events: string[] = [];
  const result = await executeAsyncTaskPlan(
    [
      { id: "root", dependsOn: [], run: () => "ready" },
      {
        id: "child",
        dependsOn: ["root"],
        run: () => {
          events.push("start:child");
          return "should not run";
        },
      },
    ],
    {},
    {
      signal: controller.signal,
      onTaskComplete: ({ taskId }) => {
        events.push(`complete:${taskId}`);
        if (taskId === "root") controller.abort("superseded");
      },
    },
  );

  assertEquals(result.status, "aborted");
  assertEquals(result.completed, ["root"]);
  assertEquals(events, ["complete:root"]);
});

Deno.test("observer and error reporter failures do not fail scheduler results", async () => {
  const reported: string[] = [];
  const result = await executeAsyncTaskPlan(
    [
      { id: "root", dependsOn: [], run: () => "ready" },
      { id: "child", dependsOn: ["root"], run: () => "done" },
    ],
    {},
    {
      onTaskComplete: ({ taskId }) => {
        throw new Error(`observer failed: ${taskId}`);
      },
      onObserverError: (error, event) => {
        reported.push(`${event.taskId}:${String(error)}`);
        throw new Error("reporter failed");
      },
    },
  );

  assertEquals(result.status, "complete");
  assertEquals(result.values.get("child"), "done");
  assertEquals(reported, [
    "root:Error: observer failed: root",
    "child:Error: observer failed: child",
  ]);
});

Deno.test("reused output observer fires once while changed-input closures rerun", async () => {
  const events: string[] = [];
  const started: string[] = [];
  const timeline: string[] = [];
  const values = new Map<string, unknown>([
    ["load", "cached load"],
    ["derive", "cached derive"],
    ["catalog", "cached catalog"],
  ]);
  const result = await executeAsyncTaskPlan(
    [
      {
        id: "load",
        dependsOn: ["query"],
        run: (inputs) => {
          started.push("load");
          timeline.push("start:load");
          return `load:${inputs.get("query")}`;
        },
      },
      {
        id: "derive",
        dependsOn: ["load"],
        run: (inputs) => {
          started.push("derive");
          timeline.push("start:derive");
          return `derive:${inputs.get("load")}`;
        },
      },
      {
        id: "catalog",
        dependsOn: ["locale"],
        run: () => {
          started.push("catalog");
          timeline.push("start:catalog");
          return "new catalog";
        },
      },
    ],
    { query: "new", locale: "en" },
    {
      reuseCompleted: {
        values,
        completed: ["load", "derive", "catalog"],
        changedInputs: ["query"],
      },
      onTaskComplete: ({ taskId, value, reused }) => {
        events.push(`${taskId}:${String(value)}:${reused}`);
        timeline.push(`complete:${taskId}`);
      },
    },
  );

  assertEquals(result.status, "complete");
  assertEquals(result.reused, ["catalog"]);
  assertEquals(result.completed, ["catalog", "load", "derive"]);
  assertEquals(started, ["load", "derive"]);
  assertEquals(events, [
    "catalog:cached catalog:true",
    "load:load:new:false",
    "derive:derive:load:new:false",
  ]);
  assertEquals(timeline, [
    "complete:catalog",
    "start:load",
    "complete:load",
    "start:derive",
    "complete:derive",
  ]);
});

Deno.test("async task plan rejects cycles before starting task code", async () => {
  let started = false;
  let rejected = false;
  try {
    await executeAsyncTaskPlan([
      {
        id: "a",
        dependsOn: ["b"],
        run: () => {
          started = true;
        },
      },
      {
        id: "b",
        dependsOn: ["a"],
        run: () => {
          started = true;
        },
      },
    ]);
  } catch (error) {
    rejected = error instanceof Error && error.message.includes("cycle");
  }
  assertEquals(rejected, true);
  assertEquals(started, false);
});

Deno.test("async task failure aborts in-flight work and skips its dependents", async () => {
  const failing = deferred<string>();
  const slow = deferred<string>();
  const controller = new AbortController();
  let slowSignal: AbortSignal | undefined;
  let dependentStarted = false;
  const execution = executeAsyncTaskPlan(
    [
      { id: "failing", dependsOn: [], run: () => failing.promise },
      {
        id: "slow",
        dependsOn: [],
        run: (_inputs, signal) => {
          slowSignal = signal;
          return slow.promise;
        },
      },
      {
        id: "dependent",
        dependsOn: ["failing"],
        run: () => {
          dependentStarted = true;
          return "should not run";
        },
      },
    ],
    {},
    { signal: controller.signal, maxConcurrency: 2 },
  );

  failing.reject(new Error("resource failed"));
  let caught = false;
  try {
    await execution;
  } catch (error) {
    caught = error instanceof Error && error.message === "resource failed";
  }
  assertEquals(caught, true);
  assertEquals(slowSignal?.aborted, true);
  assertEquals(dependentStarted, false);
  slow.resolve("late sibling");
  await Promise.resolve();
});

Deno.test("notebook async scheduling fixture preserves its event-order contract", async () => {
  const result = await runAsyncTaskSchedulerExperiment();
  assertEquals(result.status, "PASS");
  assertEquals(result.timingMeasured, false);
  assertEquals(result.startedInitially, ["profile", "feed"]);
  assertEquals(result.startedAfterProfile, [
    "profile",
    "feed",
    "personalized-header",
  ]);
  assertEquals(result.pageModelWaitedForFeed, true);
});

Deno.test("async observer reporter rejection cannot escape scheduler completion", async () => {
  const result = await executeAsyncTaskPlan(
    [
      { id: "value", dependsOn: [], run: () => 42 },
    ],
    {},
    {
      onTaskComplete() {
        throw new Error("observer failed");
      },
      onObserverError: async () => {
        throw new Error("reporter failed");
      },
    },
  );
  assertEquals(result.status, "complete");
  assertEquals(result.values.get("value"), 42);
  await new Promise((resolve) => setTimeout(resolve, 0));
});
