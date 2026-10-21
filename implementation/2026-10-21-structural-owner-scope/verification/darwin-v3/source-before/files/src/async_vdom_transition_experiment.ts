import { AsyncVDOMTransitionRuntime } from "./async_vdom_transition_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import {
  createVDOMSnapshotRoot,
  MemoryVDOMHost,
} from "./vdom_snapshot_runtime.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => resolve = yes);
  return { promise, resolve };
};

/** Deterministic host integration trace; ordered events are not timings. */
export const runAsyncVDOMTransitionExperiment = async () => {
  const host = new MemoryVDOMHost();
  const sceneContainer = host.createContainer();
  const hudContainer = host.createContainer();
  const sceneRoot = createVDOMSnapshotRoot(host, sceneContainer);
  const hudRoot = createVDOMSnapshotRoot(host, hudContainer);
  sceneRoot.commit(
    jsx("main", {}, jsx("strong", { key: "scene", id: "scene" }, "old scene")),
  );
  hudRoot.commit(
    jsx("aside", {}, jsx("strong", { key: "hud", id: "hud" }, "old HUD")),
  );
  const sceneNode = host.findByProp(sceneContainer, "id", "scene")!;
  const hudNode = host.findByProp(hudContainer, "id", "hud")!;
  const sceneData = deferred<string>();
  const profileData = deferred<string>();
  const headerStarted = deferred<void>();
  const events: string[] = [];
  const runtime = new AsyncVDOMTransitionRuntime(
    new Map([
      ["scene", sceneRoot],
      ["hud", hudRoot],
    ]),
  );
  const running = runtime.run({
    rootIds: ["scene", "hud"],
    tasks: [
      {
        id: "profile",
        dependsOn: [],
        run: () => {
          events.push("start:profile");
          return profileData.promise;
        },
      },
      {
        id: "scene-data",
        dependsOn: [],
        run: () => {
          events.push("start:scene-data");
          return sceneData.promise;
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
    buildTree: (rootId, values) =>
      rootId === "scene"
        ? jsx(
          "main",
          {},
          jsx(
            "strong",
            { key: "scene", id: "scene" },
            `scene:${values.get("scene-data")}`,
          ),
        )
        : jsx(
          "aside",
          {},
          jsx(
            "strong",
            { key: "hud", id: "hud" },
            String(values.get("header")),
          ),
        ),
  });

  await Promise.resolve();
  const retainedAtStart = sceneNode.children[0].text === "old scene" &&
    hudNode.children[0].text === "old HUD";
  events.push("retain:visible-vdom");

  events.push("resolve:profile");
  profileData.resolve("Ada");
  await headerStarted.promise;
  const branchDoesNotPatchEarly = sceneNode.children[0].text === "old scene" &&
    hudNode.children[0].text === "old HUD";

  events.push("resolve:scene-data");
  sceneData.resolve("ready");
  const result = await running;
  const keyedIdentityPreserved =
    host.findByProp(sceneContainer, "id", "scene") === sceneNode &&
    host.findByProp(hudContainer, "id", "hud") === hudNode;
  const rootsCommittedTogether = result.resolution.status === "committed" &&
    sceneNode.children[0].text === "scene:ready" &&
    hudNode.children[0].text === "hello Ada" &&
    sceneRoot.version === 2 && hudRoot.version === 2;
  events.push("commit:scene+hud");
  const contracts = {
    retainedAtStart,
    dependencyReadyBranchDidNotPatchEarly: branchDoesNotPatchEarly,
    keyedIdentityPreserved,
    rootsCommittedTogether,
  };
  const contractsPass = Object.values(contracts).every(Boolean);
  return {
    schemaVersion: "async-vdom-transition-trace-v1",
    status: contractsPass ? "PASS" : "FAIL",
    contracts,
    contractsPass,
    events,
    startedTasks: result.startedTasks,
    completedTasks: result.completedTasks,
    hostWrites: host.writeCount,
    placements: host.placementCount,
    timingMeasured: false,
    limitations: [
      "in-memory VDOM host only; no browser DOM or paint measurement",
      "all roots wait for the complete task plan; no progressive reveal boundary",
      "tasks represent async/event-loop work and do not parallelize CPU computation",
    ],
  };
};
