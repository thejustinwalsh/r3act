import { AsyncTransitionRuntime } from "./async_transition_runtime.ts";
import { runAsyncTransitionExperiment } from "./async_transition_experiment.ts";
import { TransitionCoordinator } from "./transition_coordinator.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

Deno.test("async transition prepares a DAG and atomically publishes its roots", async () => {
  const profile = deferred<string>();
  const feed = deferred<string>();
  const headerStarted = deferred<void>();
  const visible = new Map([["scene", "scene-v1"], ["hud", "hud-v1"]]);
  const commitBatches: string[][] = [];
  const coordinator = new TransitionCoordinator<string>(
    new Map([["scene", 1], ["hud", 1]]),
    (roots) => {
      commitBatches.push(roots.map((root) => root.rootId));
      for (const root of roots) visible.set(root.rootId, root.snapshot);
    },
  );
  const runtime = new AsyncTransitionRuntime(coordinator);
  const started: string[] = [];
  const running = runtime.run({
    roots: [
      {
        rootId: "scene",
        baseVersion: 1,
        targetVersion: 2,
        committedSnapshot: "scene-v1",
      },
      {
        rootId: "hud",
        baseVersion: 1,
        targetVersion: 2,
        committedSnapshot: "hud-v1",
      },
    ],
    tasks: [
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
        id: "header",
        dependsOn: ["profile"],
        run: (values) => {
          started.push("header");
          headerStarted.resolve();
          return `hello ${values.get("profile")}`;
        },
      },
    ],
    buildSnapshots: (values) =>
      new Map([
        ["scene", `scene:${values.get("feed")}`],
        ["hud", `hud:${values.get("header")}`],
      ]),
  });

  await Promise.resolve();
  if (JSON.stringify(started) !== JSON.stringify(["profile", "feed"])) {
    throw new Error(`Independent tasks did not start together: ${started}`);
  }
  if (
    coordinator.getVersion("scene") !== 1 || coordinator.getVersion("hud") !== 1
  ) {
    throw new Error("Pending work advanced committed root versions");
  }
  if (visible.get("scene") !== "scene-v1" || visible.get("hud") !== "hud-v1") {
    throw new Error("Pending work changed the visible roots");
  }

  profile.resolve("Ada");
  await headerStarted.promise;
  if (started.includes("header") === false) {
    throw new Error("A dependency-ready branch did not start early");
  }
  if (commitBatches.length !== 0) {
    throw new Error(
      "The transition committed before the unrelated feed was ready",
    );
  }

  feed.resolve("items");
  const result = await running;
  if (result.resolution.status !== "committed") {
    throw new Error(`Expected commit, got ${result.resolution.status}`);
  }
  if (JSON.stringify(commitBatches) !== JSON.stringify([["scene", "hud"]])) {
    throw new Error(
      `Expected one coordinated root commit: ${JSON.stringify(commitBatches)}`,
    );
  }
  if (
    visible.get("scene") !== "scene:items" ||
    visible.get("hud") !== "hud:hello Ada"
  ) {
    throw new Error(
      "The committed snapshots did not include prepared task results",
    );
  }
});

Deno.test("a newer async transition cancels superseded task work", async () => {
  const firstStarted = deferred<void>();
  const firstTask = deferred<string>();
  let firstWasAborted = false;
  const commits: string[] = [];
  const coordinator = new TransitionCoordinator<string>(
    new Map([["root", 1]]),
    (roots) => commits.push(roots[0].snapshot),
  );
  const runtime = new AsyncTransitionRuntime(coordinator);
  const first = runtime.run({
    roots: [{
      rootId: "root",
      baseVersion: 1,
      targetVersion: 2,
      committedSnapshot: "v1",
    }],
    tasks: [{
      id: "slow",
      dependsOn: [],
      run: (_values, signal) => {
        firstWasAborted = false;
        signal.addEventListener("abort", () => firstWasAborted = true, {
          once: true,
        });
        firstStarted.resolve();
        return firstTask.promise;
      },
    }],
    buildSnapshots: (values) => new Map([["root", String(values.get("slow"))]]),
  });
  await firstStarted.promise;

  const second = runtime.run({
    roots: [{
      rootId: "root",
      baseVersion: 1,
      targetVersion: 3,
      committedSnapshot: "v1",
    }],
    tasks: [{ id: "fast", dependsOn: [], run: () => "v3" }],
    buildSnapshots: (values) => new Map([["root", String(values.get("fast"))]]),
  });
  const [firstResult, secondResult] = await Promise.all([first, second]);
  firstTask.resolve("late-v2");

  if (!firstWasAborted) {
    throw new Error("Superseded work did not receive abort");
  }
  if (firstResult.resolution.status !== "stale") {
    throw new Error(
      `Superseded transition should be stale, got ${firstResult.resolution.status}`,
    );
  }
  if (secondResult.resolution.status !== "committed") {
    throw new Error(
      `Latest transition failed to commit: ${secondResult.resolution.status}`,
    );
  }
  if (JSON.stringify(commits) !== JSON.stringify(["v3"])) {
    throw new Error(
      `A stale snapshot was published: ${JSON.stringify(commits)}`,
    );
  }
});

Deno.test("async task failure leaves committed roots unchanged", async () => {
  const visible = new Map([["root", "v1"]]);
  const coordinator = new TransitionCoordinator<string>(
    new Map([["root", 1]]),
    (roots) => visible.set("root", roots[0].snapshot),
  );
  const runtime = new AsyncTransitionRuntime(coordinator);
  let rejected = false;
  try {
    await runtime.run({
      roots: [{
        rootId: "root",
        baseVersion: 1,
        targetVersion: 2,
        committedSnapshot: "v1",
      }],
      tasks: [{
        id: "failed",
        dependsOn: [],
        run: () => Promise.reject(new Error("offline")),
      }],
      buildSnapshots: () => new Map([["root", "v2"]]),
    });
  } catch (error) {
    rejected = error instanceof Error && error.message === "offline";
  }
  if (!rejected) throw new Error("Task failure was not propagated");
  if (visible.get("root") !== "v1" || coordinator.getVersion("root") !== 1) {
    throw new Error("Failed task plan changed the committed root");
  }
});

Deno.test("invalid new transition does not cancel a valid pending candidate", async () => {
  const taskStarted = deferred<void>();
  const taskValue = deferred<string>();
  let wasAborted = false;
  const commits: string[] = [];
  const coordinator = new TransitionCoordinator<string>(
    new Map([["root", 1]]),
    (roots) => commits.push(roots[0].snapshot),
  );
  const runtime = new AsyncTransitionRuntime(coordinator);
  const valid = runtime.run({
    roots: [{
      rootId: "root",
      baseVersion: 1,
      targetVersion: 2,
      committedSnapshot: "v1",
    }],
    tasks: [{
      id: "wait",
      dependsOn: [],
      run: (_values, signal) => {
        signal.addEventListener("abort", () => wasAborted = true, {
          once: true,
        });
        taskStarted.resolve();
        return taskValue.promise;
      },
    }],
    buildSnapshots: (values) => new Map([["root", String(values.get("wait"))]]),
  });
  await taskStarted.promise;

  let invalidRejected = false;
  try {
    await runtime.run({
      roots: [{
        rootId: "root",
        baseVersion: 1,
        targetVersion: 1,
        committedSnapshot: "v1",
      }],
      tasks: [],
      buildSnapshots: () => new Map([["root", "invalid"]]),
    });
  } catch {
    invalidRejected = true;
  }
  if (!invalidRejected || wasAborted) {
    throw new Error("Invalid request disrupted the valid pending transition");
  }

  let cyclicRejected = false;
  try {
    await runtime.run({
      roots: [{
        rootId: "root",
        baseVersion: 1,
        targetVersion: 3,
        committedSnapshot: "v1",
      }],
      tasks: [
        { id: "left", dependsOn: ["right"], run: () => "left" },
        { id: "right", dependsOn: ["left"], run: () => "right" },
      ],
      buildSnapshots: () => new Map([["root", "cyclic"]]),
    });
  } catch (error) {
    cyclicRejected = error instanceof Error && error.message.includes("cycle");
  }
  if (!cyclicRejected || wasAborted) {
    throw new Error(
      "Invalid task graph disrupted the valid pending transition",
    );
  }

  taskValue.resolve("v2");
  const validResult = await valid;
  if (validResult.resolution.status !== "committed" || commits[0] !== "v2") {
    throw new Error(
      "Valid pending transition did not finish after invalid request",
    );
  }
});

Deno.test("notebook async transition fixture preserves its integration contracts", async () => {
  const result = await runAsyncTransitionExperiment();
  if (result.status !== "PASS" || !result.contractsPass) {
    throw new Error(
      `Async transition fixture failed: ${JSON.stringify(result)}`,
    );
  }
});
