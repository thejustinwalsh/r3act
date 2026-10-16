import { AsyncTransitionRuntime } from "./async_transition_runtime.ts";
import { TransitionCoordinator } from "./transition_coordinator.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => resolve = yes);
  return { promise, resolve };
};

/** Deterministic integration trace; events are ordered, not timed. */
export const runAsyncTransitionExperiment = async () => {
  const profile = deferred<string>();
  const feed = deferred<string>();
  const initialTasksStarted = deferred<void>();
  const headerStarted = deferred<void>();
  const events: string[] = [];
  const visibleRoots = new Map([["scene", "scene-v1"], ["hud", "hud-v1"]]);
  const coordinator = new TransitionCoordinator<string>(
    new Map([["scene", 1], ["hud", 1]]),
    (roots) => {
      events.push(`commit:${roots.map((root) => root.rootId).join("+")}`);
      for (const root of roots) visibleRoots.set(root.rootId, root.snapshot);
    },
  );
  const runtime = new AsyncTransitionRuntime(coordinator);
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
          events.push("start:profile");
          if (events.includes("start:feed")) initialTasksStarted.resolve();
          return profile.promise;
        },
      },
      {
        id: "feed",
        dependsOn: [],
        run: () => {
          events.push("start:feed");
          if (events.includes("start:profile")) initialTasksStarted.resolve();
          return feed.promise;
        },
      },
      {
        id: "header",
        dependsOn: ["profile"],
        run: (values) => {
          events.push("derive:header");
          headerStarted.resolve();
          return `hello ${values.get("profile")}`;
        },
      },
    ],
    buildSnapshots: (values) => {
      events.push("prepare:root-snapshots");
      return new Map([
        ["scene", `scene:${values.get("feed")}`],
        ["hud", `hud:${values.get("header")}`],
      ]);
    },
  });

  await initialTasksStarted.promise;
  const retainedWhilePending = visibleRoots.get("scene") === "scene-v1" &&
    visibleRoots.get("hud") === "hud-v1" &&
    coordinator.getVersion("scene") === 1 &&
    coordinator.getVersion("hud") === 1;
  events.push("retain:committed-roots");

  events.push("resolve:profile");
  profile.resolve("Ada");
  await headerStarted.promise;
  const branchRanBeforeFeed = !events.includes("resolve:feed");

  events.push("resolve:feed");
  feed.resolve("items");
  const execution = await running;
  const atomicCommit = execution.resolution.status === "committed" &&
    events.filter((event) => event.startsWith("commit:")).length === 1 &&
    visibleRoots.get("scene") === "scene:items" &&
    visibleRoots.get("hud") === "hud:hello Ada" &&
    coordinator.getVersion("scene") === 2 &&
    coordinator.getVersion("hud") === 2;
  const contractsPass = retainedWhilePending && branchRanBeforeFeed &&
    atomicCommit;
  return {
    schemaVersion: "async-transition-integration-trace-v1",
    status: contractsPass ? "PASS" : "FAIL",
    contracts: { retainedWhilePending, branchRanBeforeFeed, atomicCommit },
    contractsPass,
    events,
    startedTasks: execution.startedTasks,
    completedTasks: execution.completedTasks,
    committedSnapshots: Object.fromEntries(visibleRoots),
    timingMeasured: false,
    browserMeasured: false,
    limitations: [
      "event-loop async overlap only; CPU tasks are not parallelized",
      "all task outputs are ready before candidate root snapshots are built",
      "no progressive reveal boundaries or React Suspense comparison",
    ],
  };
};
