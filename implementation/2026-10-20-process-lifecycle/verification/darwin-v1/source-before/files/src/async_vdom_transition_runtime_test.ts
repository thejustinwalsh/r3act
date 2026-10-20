import { jsx } from "./jsx_binding_runtime.ts";
import { AsyncVDOMTransitionRuntime } from "./async_vdom_transition_runtime.ts";
import { runAsyncVDOMTransitionExperiment } from "./async_vdom_transition_experiment.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";
import {
  createVDOMSnapshotRoot,
  MemoryVDOMHost,
} from "./vdom_snapshot_runtime.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => resolve = yes);
  return { promise, resolve };
};

Deno.test("async task results prepare and commit retained VDOM roots together", async () => {
  const host = new MemoryVDOMHost();
  const sceneContainer = host.createContainer();
  const hudContainer = host.createContainer();
  const sceneRoot = createVDOMSnapshotRoot(host, sceneContainer);
  const hudRoot = createVDOMSnapshotRoot(host, hudContainer);
  sceneRoot.commit(
    jsx("main", {}, jsx("strong", { key: "stable", id: "scene" }, "old scene")),
  );
  hudRoot.commit(
    jsx("aside", {}, jsx("strong", { key: "stable", id: "hud" }, "old HUD")),
  );
  const sceneNodeBefore = host.findByProp(sceneContainer, "id", "scene")!;
  const hudNodeBefore = host.findByProp(hudContainer, "id", "hud")!;
  const sceneBefore = JSON.stringify(host.serialize(sceneContainer));
  const hudBefore = JSON.stringify(host.serialize(hudContainer));
  const sceneData = deferred<string>();
  const hudData = deferred<string>();
  const roots = new Map([["scene", sceneRoot], ["hud", hudRoot]]);
  const runtime = new AsyncVDOMTransitionRuntime(roots);
  const running = runtime.run({
    rootIds: ["scene", "hud"],
    tasks: [
      { id: "scene-data", dependsOn: [], run: () => sceneData.promise },
      { id: "hud-data", dependsOn: [], run: () => hudData.promise },
    ],
    buildTree: (rootId, values) =>
      rootId === "scene"
        ? jsx(
          "main",
          {},
          jsx(
            "strong",
            { key: "stable", id: "scene", "data-version": 2 },
            `scene:${values.get("scene-data")}`,
          ),
        )
        : jsx(
          "aside",
          {},
          jsx(
            "strong",
            { key: "stable", id: "hud", "data-version": 2 },
            `hud:${values.get("hud-data")}`,
          ),
        ),
  });

  await Promise.resolve();
  if (
    JSON.stringify(host.serialize(sceneContainer)) !== sceneBefore ||
    JSON.stringify(host.serialize(hudContainer)) !== hudBefore
  ) {
    throw new Error("Starting task work mutated mounted VDOM roots");
  }
  sceneData.resolve("ready");
  await Promise.resolve();
  if (
    JSON.stringify(host.serialize(sceneContainer)) !== sceneBefore ||
    JSON.stringify(host.serialize(hudContainer)) !== hudBefore
  ) {
    throw new Error(
      "One ready branch patched DOM before the whole transition was prepared",
    );
  }

  hudData.resolve("ready");
  const result = await running;
  const sceneNodeAfter = host.findByProp(sceneContainer, "id", "scene");
  const hudNodeAfter = host.findByProp(hudContainer, "id", "hud");
  if (
    result.resolution.status !== "committed" ||
    sceneNodeAfter !== sceneNodeBefore || hudNodeAfter !== hudNodeBefore ||
    sceneNodeAfter?.children[0].text !== "scene:ready" ||
    hudNodeAfter?.children[0].text !== "hud:ready" ||
    sceneRoot.version !== 2 || hudRoot.version !== 2
  ) {
    throw new Error(
      "Prepared transition did not patch and retain both keyed roots",
    );
  }
});

Deno.test("invalid candidate VDOM is rejected before any root is patched", async () => {
  const host = new MemoryVDOMHost();
  const sceneContainer = host.createContainer();
  const hudContainer = host.createContainer();
  const sceneRoot = createVDOMSnapshotRoot(host, sceneContainer);
  const hudRoot = createVDOMSnapshotRoot(host, hudContainer);
  sceneRoot.commit(jsx("main", {}, jsx("span", { id: "old-scene" }, "old")));
  hudRoot.commit(jsx("aside", {}, jsx("span", { id: "old-hud" }, "old")));
  const sceneBefore = JSON.stringify(host.serialize(sceneContainer));
  const hudBefore = JSON.stringify(host.serialize(hudContainer));
  const roots = new Map([["scene", sceneRoot], ["hud", hudRoot]]);
  const runtime = new AsyncVDOMTransitionRuntime(roots);
  let rejected = false;
  try {
    await runtime.run({
      rootIds: ["scene", "hud"],
      tasks: [{ id: "ready", dependsOn: [], run: () => "new" }],
      buildTree: (rootId) =>
        rootId === "scene"
          ? jsx(
            "main",
            {},
            jsx("span", { key: "duplicate" }, "one"),
            jsx("span", { key: "duplicate" }, "two"),
          )
          : jsx("aside", {}, jsx("span", { id: "new-hud" }, "new")),
    });
  } catch (error) {
    rejected = error instanceof Error &&
      error.message.includes("Duplicate key");
  }
  if (!rejected) throw new Error("Expected duplicate-key candidate rejection");
  if (
    JSON.stringify(host.serialize(sceneContainer)) !== sceneBefore ||
    JSON.stringify(host.serialize(hudContainer)) !== hudBefore ||
    sceneRoot.version !== 1 || hudRoot.version !== 1
  ) {
    throw new Error(
      "Invalid VDOM candidate partially committed the root group",
    );
  }
});

Deno.test("external root commit invalidates the whole pending async batch", async () => {
  const host = new MemoryVDOMHost();
  const sceneContainer = host.createContainer();
  const hudContainer = host.createContainer();
  const sceneRoot = createVDOMSnapshotRoot(host, sceneContainer);
  const hudRoot = createVDOMSnapshotRoot(host, hudContainer);
  sceneRoot.commit(jsx("main", {}, jsx("span", { id: "scene" }, "old scene")));
  hudRoot.commit(jsx("aside", {}, jsx("span", { id: "hud" }, "old HUD")));
  const sceneData = deferred<string>();
  const hudData = deferred<string>();
  const runtime = new AsyncVDOMTransitionRuntime(
    new Map([
      ["scene", sceneRoot],
      ["hud", hudRoot],
    ]),
  );
  const running = runtime.run({
    rootIds: ["scene", "hud"],
    tasks: [
      { id: "scene-data", dependsOn: [], run: () => sceneData.promise },
      { id: "hud-data", dependsOn: [], run: () => hudData.promise },
    ],
    buildTree: (rootId, values) =>
      rootId === "scene"
        ? jsx(
          "main",
          {},
          jsx("span", { id: "scene" }, String(values.get("scene-data"))),
        )
        : jsx(
          "aside",
          {},
          jsx("span", { id: "hud" }, String(values.get("hud-data"))),
        ),
  });
  await Promise.resolve();

  sceneRoot.commit(
    jsx("main", {}, jsx("span", { id: "scene" }, "urgent update")),
  );
  sceneData.resolve("stale transition");
  hudData.resolve("stale HUD");
  let rejected = false;
  try {
    await running;
  } catch (error) {
    rejected = error instanceof Error &&
      error.message.includes("changed during async preparation");
  }
  if (!rejected) throw new Error("Stale async batch was not invalidated");
  if (
    host.findByProp(sceneContainer, "id", "scene")?.children[0].text !==
      "urgent update" ||
    host.findByProp(hudContainer, "id", "hud")?.children[0].text !==
      "old HUD" ||
    sceneRoot.version !== 2 || hudRoot.version !== 1
  ) {
    throw new Error(
      "Stale batch overwrote or partially committed over a newer root",
    );
  }
});

Deno.test("urgent same-root commit is visible immediately and rebases async candidate", async () => {
  const { runAsyncVDOMUrgentRebaseExperiment } = await import(
    "./async_vdom_urgent_rebase_experiment.ts"
  );
  const result = await runAsyncVDOMUrgentRebaseExperiment();
  if (result.status !== "PASS" || !result.contractsPass) {
    throw new Error(
      `Urgent same-root rebase failed: ${JSON.stringify(result)}`,
    );
  }
});

Deno.test("urgent dependency write cancels a candidate built from stale task inputs", async () => {
  const { runAsyncVDOMDependencyInvalidationExperiment } = await import(
    "./async_vdom_urgent_rebase_experiment.ts"
  );
  const result = await runAsyncVDOMDependencyInvalidationExperiment();
  if (result.status !== "PASS" || !result.contractsPass) {
    throw new Error(
      `Dependency invalidation failed: ${JSON.stringify(result)}`,
    );
  }
});

Deno.test("invalidated task plans restart from the newest state-site inputs", async () => {
  const { runAsyncVDOMInputRestartExperiment } = await import(
    "./async_vdom_urgent_rebase_experiment.ts"
  );
  const result = await runAsyncVDOMInputRestartExperiment();
  if (result.status !== "PASS" || !result.contractsPass) {
    throw new Error(`Input restart failed: ${JSON.stringify(result)}`);
  }
});

Deno.test("a newer root transition supersedes a queued input restart", async () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = createVDOMSnapshotRoot(host, container);
  root.commit(jsx("main", {}, jsx("strong", { id: "result" }, "old")));
  const firstValue = deferred<string>();
  const firstStarted = deferred<void>();
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "app");
  const [, setQuery] = world.useState(owner, "query", 0);
  const readQuery = () => world.useState(owner, "query", 0)[0];
  const runtime = new AsyncVDOMTransitionRuntime(new Map([["root", root]]));
  runtime.watchStateWorld("root", world);
  const invalidated = runtime.run({
    rootIds: ["root"],
    initialValues: { query: readQuery() },
    tasks: [{
      id: "search",
      dependsOn: ["query"],
      run: () => {
        firstStarted.resolve();
        return firstValue.promise;
      },
    }],
    maxInputRestarts: 1,
    refreshInputs: () => ({ query: readQuery() }),
    buildTree: (_rootId, values) =>
      jsx(
        "main",
        {},
        jsx("strong", { id: "result" }, String(values.get("search"))),
      ),
  });
  await firstStarted.promise;
  setQuery(1);
  runtime.commitUrgent(
    "root",
    jsx("main", {}, jsx("strong", { id: "result" }, "old")),
  );

  const latest = runtime.run({
    rootIds: ["root"],
    tasks: [{ id: "latest", dependsOn: [], run: () => "new transition" }],
    buildTree: (_rootId, values) =>
      jsx(
        "main",
        {},
        jsx("strong", { id: "result" }, String(values.get("latest"))),
      ),
  });
  const [invalidatedResult, latestResult] = await Promise.all([
    invalidated,
    latest,
  ]);
  firstValue.resolve("late stale search");
  if (
    invalidatedResult.restartCount !== 0 ||
    invalidatedResult.resolution.status !== "stale" ||
    latestResult.resolution.status !== "committed" ||
    host.findByProp(container, "id", "result")?.children[0].text !==
      "new transition" ||
    root.version !== 3
  ) {
    throw new Error("An invalidated run restarted over a newer transition");
  }
});

Deno.test("notebook async VDOM fixture preserves host integration contracts", async () => {
  const result = await runAsyncVDOMTransitionExperiment();
  if (result.status !== "PASS" || !result.contractsPass) {
    throw new Error(
      `Async VDOM transition fixture failed: ${JSON.stringify(result)}`,
    );
  }
});
