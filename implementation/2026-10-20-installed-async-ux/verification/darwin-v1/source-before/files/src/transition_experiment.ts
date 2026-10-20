import { TransitionCoordinator } from "./transition_coordinator.ts";
import { bind, jsx, ScalarSource, type RuntimeNode } from "./jsx_binding_runtime.ts";
import { createVDOMSnapshotRoot, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

/**
 * Deterministic transition/scheduling model, not a wall-clock runtime benchmark.
 * It estimates task-DAG critical paths from declared durations and checks the
 * proposed commit/lifecycle invariants while candidate roots are pending.
 */

export type ModelTask = {
  id: string;
  durationMs: number;
  dependsOn: string[];
};

type TaskInterval = { id: string; startMs: number; endMs: number };

export const scheduleDag = (tasks: ModelTask[]): TaskInterval[] => {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  if (byId.size !== tasks.length) throw new Error("Task IDs must be unique");
  for (const task of tasks) {
    if (!Number.isFinite(task.durationMs) || task.durationMs < 0) {
      throw new Error(`Invalid duration for ${task.id}`);
    }
    for (const dependency of task.dependsOn) {
      if (!byId.has(dependency)) {
        throw new Error(`${task.id} depends on missing task ${dependency}`);
      }
    }
  }

  const endById = new Map<string, number>();
  const intervals: TaskInterval[] = [];
  let remaining = tasks.length;
  while (remaining > 0) {
    let progressed = false;
    for (const task of tasks) {
      if (endById.has(task.id)) continue;
      if (!task.dependsOn.every((dependency) => endById.has(dependency))) continue;
      const startMs = task.dependsOn.reduce(
        (latest, dependency) => Math.max(latest, endById.get(dependency)!),
        0,
      );
      const endMs = startMs + task.durationMs;
      endById.set(task.id, endMs);
      intervals.push({ id: task.id, startMs, endMs });
      remaining--;
      progressed = true;
    }
    if (!progressed) throw new Error("Dependency cycle in task graph");
  }
  return intervals;
};

export type SchedulingScenario = {
  independentResources: number;
  resourceDurationsMs: number[];
  deriveDurationMs: number;
  waterfallMs: number;
  dagPlannedMs: number;
  intervals: TaskInterval[];
};

const makeSchedulingScenario = (independentResources: number): SchedulingScenario => {
  // Heterogeneous deterministic I/O latencies avoid a uniform-task-only result.
  const resourceDurationsMs = Array.from(
    { length: independentResources },
    (_, index) => 32 + ((index * 13) % 37),
  );
  const deriveDurationMs = 18;
  const resources: ModelTask[] = resourceDurationsMs.map((durationMs, index) => ({
    id: `resource-${index}`,
    durationMs,
    dependsOn: [],
  }));
  const planned = scheduleDag([
    ...resources,
    {
      id: "derive-view-model",
      durationMs: deriveDurationMs,
      dependsOn: resources.map((task) => task.id),
    },
  ]);
  const waterfall = scheduleDag([
    ...resources.map((task, index) => ({
      ...task,
      dependsOn: index === 0 ? [] : [`resource-${index - 1}`],
    })),
    {
      id: "derive-view-model",
      durationMs: deriveDurationMs,
      dependsOn: resources.length === 0 ? [] : [`resource-${resources.length - 1}`],
    },
  ]);
  const makespan = (intervals: TaskInterval[]) =>
    Math.max(0, ...intervals.map((interval) => interval.endMs));
  return {
    independentResources,
    resourceDurationsMs,
    deriveDurationMs,
    waterfallMs: makespan(waterfall),
    dagPlannedMs: makespan(planned),
    intervals: planned,
  };
};

/**
 * Small state-machine model for a two-root transition. Candidate writes and
 * effect changes are staged until every root in the transition is ready.
 */
const verifyTransitionInvariants = () => {
  const committedRoots = new Map([["scene", "scene-v4"], ["hud", "hud-v4"]]);
  const commits: Array<{ generation: number; roots: readonly string[] }> = [];
  let mountEffects = 2;
  let cleanupEffects = 0;
  const coordinator = new TransitionCoordinator<{ value: string; mount: number; cleanup: number }>(
    new Map([["scene", 4], ["hud", 4]]),
    (roots, generation) => {
      // Models the synchronous apply phase for ECS state, VDOM patches, then
      // lifecycle effects. It is invoked once for the whole root group.
      for (const root of roots) {
        committedRoots.set(root.rootId, root.snapshot.value);
        mountEffects += root.snapshot.mount;
        cleanupEffects += root.snapshot.cleanup;
      }
      commits.push({ generation, roots: roots.map((root) => root.rootId) });
    },
  );
  const visibleBefore = [...committedRoots.entries()];

  const superseded = coordinator.begin([{
    rootId: "scene",
    baseVersion: 4,
    targetVersion: 5,
    snapshot: { value: "scene-v5-stale", mount: 0, cleanup: 1 },
    pendingResources: ["old-scene-resource"],
  }]);
  if (superseded.status !== "pending") throw new Error("Expected first candidate to suspend");
  const supersededGeneration = coordinator.generation;

  // Starting a fresher group invalidates late results from the first candidate.
  const start = coordinator.begin([
    {
      rootId: "scene",
      baseVersion: 4,
      targetVersion: 6,
      snapshot: { value: "scene-v6", mount: 1, cleanup: 1 },
      pendingResources: ["scene-resource"],
    },
    {
      rootId: "hud",
      baseVersion: 4,
      targetVersion: 6,
      snapshot: { value: "hud-v6", mount: 1, cleanup: 1 },
      pendingResources: ["hud-resource"],
    },
  ]);
  if (start.status !== "pending") throw new Error("Expected coordinated roots to suspend");
  const currentGeneration = coordinator.generation;
  const staleResult = coordinator.resolve(supersededGeneration, "old-scene-resource");
  const staleResultRejected = staleResult.status === "stale";

  // Until both roots are ready, the committed VDOM and lifecycle stay intact.
  const pendingPreserved =
    coordinator.getVersion("scene") === 4 && coordinator.getVersion("hud") === 4 &&
    JSON.stringify([...committedRoots]) === JSON.stringify(visibleBefore) &&
    commits.length === 0;
  const pendingEffectsUnchanged = mountEffects === 2 && cleanupEffects === 0;
  if (!pendingPreserved || !pendingEffectsUnchanged) {
    throw new Error("Pending candidate mutated committed UI/effects");
  }
  const firstReady = coordinator.resolve(currentGeneration, "scene-resource");
  const readyAfterFirstRoot = firstReady.status === "committed";
  if (readyAfterFirstRoot || commits.length !== 0) {
    throw new Error("Cross-root commit happened before every resource was ready");
  }
  const finalReady = coordinator.resolve(currentGeneration, "hud-resource");
  const commitsAfterReadiness = Array.from(commits);
  const canCommitAtomically =
    finalReady.status === "committed" && commitsAfterReadiness.length === 1 &&
    commitsAfterReadiness[0].roots.length === 2;
  if (!canCommitAtomically) throw new Error("Ready root group did not commit as one batch");
  const commitEffectsApplied =
    coordinator.getVersion("scene") === 6 && coordinator.getVersion("hud") === 6 &&
    mountEffects === 4 && cleanupEffects === 2;
  const atomicCommittedSceneVersion = coordinator.getVersion("scene");

  const valuesAfterCommit = [...committedRoots.entries()];
  const cancelled = coordinator.begin([{
    rootId: "scene",
    baseVersion: 6,
    targetVersion: 7,
    snapshot: { value: "scene-v7-cancelled", mount: 0, cleanup: 1 },
    pendingResources: ["cancel-me"],
  }]);
  if (cancelled.status !== "pending") throw new Error("Expected cancellable candidate to suspend");
  const cancelledGeneration = coordinator.generation;
  const cancelResult = coordinator.cancel(cancelledGeneration);
  const lateCancelledResult = coordinator.resolve(cancelledGeneration, "cancel-me");
  const cancellationPreservedCommitted =
    cancelResult.status === "cancelled" && lateCancelledResult.status === "stale" &&
    coordinator.getVersion("scene") === 6 &&
    JSON.stringify([...committedRoots.entries()]) === JSON.stringify(valuesAfterCommit) &&
    mountEffects === 4 && cleanupEffects === 2;
  if (!cancellationPreservedCommitted) throw new Error("Cancelled candidate changed committed state/effects");

  const independentScene = coordinator.begin([{
    rootId: "scene",
    baseVersion: 6,
    targetVersion: 7,
    snapshot: { value: "scene-v7-independent", mount: 0, cleanup: 0 },
    pendingResources: ["slow-scene"],
  }]);
  const sceneGeneration = coordinator.generation;
  const independentHud = coordinator.begin([{
    rootId: "hud",
    baseVersion: 6,
    targetVersion: 7,
    snapshot: { value: "hud-v7-independent", mount: 0, cleanup: 0 },
    pendingResources: ["fast-hud"],
  }]);
  const hudGeneration = coordinator.generation;
  if (independentScene.status !== "pending" || independentHud.status !== "pending") {
    throw new Error("Expected disjoint root candidates to remain pending independently");
  }
  const hudFirst = coordinator.resolve(hudGeneration, "fast-hud");
  const independentRootsProgressSeparately =
    hudFirst.status === "committed" && coordinator.getVersion("hud") === 7 &&
    coordinator.getVersion("scene") === 6;
  const sceneLater = coordinator.resolve(sceneGeneration, "slow-scene");
  if (!independentRootsProgressSeparately || sceneLater.status !== "committed") {
    throw new Error("Disjoint root updates did not progress independently");
  }

  return {
    pendingPreservesCommittedVdom: pendingPreserved,
    pendingDoesNotRunMountOrCleanupEffects: pendingEffectsUnchanged,
    supersededGenerationRejected: staleResultRejected,
    coordinatedRootsWaitForAllMembers: !readyAfterFirstRoot && canCommitAtomically,
    cancellationPreservesCommittedVdomAndEffects: cancellationPreservedCommitted,
    independentRootsProgressSeparately,
    commitAppliesStagedEffectsOnlyAfterReadiness: commitEffectsApplied,
    committedVersionAfterResolution: atomicCommittedSceneVersion,
    rootsInTransition: commitsAfterReadiness[0].roots.length,
  };
};

const verifyVDOMCommitPath = () => {
  const host = new MemoryVDOMHost();
  const sceneContainer = host.createContainer();
  const hudContainer = host.createContainer();
  const sceneRoot = createVDOMSnapshotRoot(host, sceneContainer);
  const hudRoot = createVDOMSnapshotRoot(host, hudContainer);
  sceneRoot.commit(jsx("main", { id: "scene-root" },
    jsx("div", { key: "stable", id: "stable-scene", "data-state": "old" }, "old scene"),
    jsx("span", { key: "removed", id: "removed-scene" }, "remove me"),
  ));
  hudRoot.commit(jsx("aside", { id: "hud-root" },
    jsx("strong", { key: "stable", id: "stable-hud", "data-state": "old" }, "old HUD"),
  ));

  const stableSceneBefore = host.findByProp(sceneContainer, "id", "stable-scene")!;
  const stableHudBefore = host.findByProp(hudContainer, "id", "stable-hud")!;
  const sceneBefore = JSON.stringify(host.serialize(sceneContainer));
  const hudBefore = JSON.stringify(host.serialize(hudContainer));
  let batchCommitCount = 0;
  const roots = new Map([["scene", sceneRoot], ["hud", hudRoot]]);
  const coordinator = new TransitionCoordinator<RuntimeNode>(
    new Map([["scene", sceneRoot.version], ["hud", hudRoot.version]]),
    (batch) => {
      batchCommitCount++;
      for (const root of batch) {
        const target = roots.get(root.rootId);
        if (!target) throw new Error(`Missing VDOM root ${root.rootId}`);
        target.commit(root.snapshot);
      }
    },
  );
  const candidate: RuntimeNode = jsx("main", { id: "scene-root" },
    jsx("i", { key: "added", id: "added-scene" }, "new first"),
    jsx("div", { key: "stable", id: "stable-scene", "data-state": "new" }, "new scene"),
  );
  const hudCandidate: RuntimeNode = jsx("aside", { id: "hud-root" },
    jsx("strong", { key: "stable", id: "stable-hud", "data-state": "new" }, "new HUD"),
  );
  const begin = coordinator.begin([
    {
      rootId: "scene",
      baseVersion: sceneRoot.version,
      targetVersion: sceneRoot.version + 1,
      snapshot: candidate,
      pendingResources: ["scene-data"],
    },
    {
      rootId: "hud",
      baseVersion: hudRoot.version,
      targetVersion: hudRoot.version + 1,
      snapshot: hudCandidate,
      pendingResources: ["hud-data"],
    },
  ]);
  if (begin.status !== "pending") throw new Error("Expected VDOM candidate to remain pending");
  const generation = coordinator.generation;
  const pendingPreserved =
    JSON.stringify(host.serialize(sceneContainer)) === sceneBefore &&
    JSON.stringify(host.serialize(hudContainer)) === hudBefore &&
    sceneRoot.version === 1 && hudRoot.version === 1 && batchCommitCount === 0;
  if (!pendingPreserved) throw new Error("Pending VDOM candidate changed a visible host tree");

  const first = coordinator.resolve(generation, "scene-data");
  const heldUntilAllReady = first.status === "pending" && batchCommitCount === 0 &&
    JSON.stringify(host.serialize(sceneContainer)) === sceneBefore &&
    JSON.stringify(host.serialize(hudContainer)) === hudBefore;
  if (!heldUntilAllReady) throw new Error("VDOM roots committed before all transition resources resolved");
  const last = coordinator.resolve(generation, "hud-data");
  const stableSceneAfter = host.findByProp(sceneContainer, "id", "stable-scene");
  const stableHudAfter = host.findByProp(hudContainer, "id", "stable-hud");
  const keyedIdentityPreserved = stableSceneAfter === stableSceneBefore && stableHudAfter === stableHudBefore;
  const sceneRootNode = sceneContainer.children[0];
  const sceneOrder = sceneRootNode.children.map((child) => child.props.id);
  const committedBothRoots = last.status === "committed" && batchCommitCount === 1 &&
    Number(sceneRoot.version) === 2 && Number(hudRoot.version) === 2 &&
    stableSceneAfter?.props["data-state"] === "new" && stableHudAfter?.props["data-state"] === "new" &&
    host.findByProp(sceneContainer, "id", "removed-scene") === null &&
    host.findByProp(sceneContainer, "id", "added-scene") !== null;
  if (!committedBothRoots || !keyedIdentityPreserved || sceneOrder.join(",") !== "added-scene,stable-scene") {
    throw new Error("VDOM host commit failed keyed identity, structure, or two-root update");
  }
  return {
    pendingCandidatePreservesRenderedRoots: pendingPreserved,
    coordinatedCommitWaitsForAllResources: heldUntilAllReady,
    keyedHostIdentitySurvivesPatch: keyedIdentityPreserved,
    keyedInsertRemoveAndReorderMatchVDOM: true,
    multiRootVDOMCommitAppliedOnce: committedBothRoots,
    finalSceneOrder: sceneOrder,
    sceneSnapshotIsRetained: sceneRoot.snapshot.length === 1,
  };
};

const verifyVDOMBindingPath = () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = createVDOMSnapshotRoot(host, container);
  const x = new ScalarSource(0, 10);
  const y = new ScalarSource(1, 20);
  let componentExecutions = 0;
  const Item = ({ id, source }: { id: string; source: ScalarSource }) => {
    componentExecutions++;
    return jsx("div", {
      id,
      title: bind(source, (value) => `position:${value}`),
      style: { opacity: bind(source, (value) => value / 100) },
    });
  };
  root.commit(jsx("section", { id: "binding-root" },
    jsx(Item, { key: "x", id: "x-item", source: x }),
    jsx(Item, { key: "y", id: "y-item", source: y }),
  ));
  const xNode = host.findByProp(container, "id", "x-item")!;
  const yNode = host.findByProp(container, "id", "y-item")!;
  const initialComponentExecutions = componentExecutions;
  const oldYTitle = yNode.props.title;
  host.writeCount = 0;

  const sourceChanged = root.setSource(x, 35);
  const affectedBindingPathsUpdated =
    xNode.props.title === "position:35" && (xNode.props.style as any).opacity === 0.35 &&
    yNode.props.title === oldYTitle;
  const noComponentExecution = componentExecutions === initialComponentExecutions;
  const boundedHostWrites = host.writeCount === 2;
  const vdomSourceRemainsInspectable = root.snapshot.length === 1 && x.value === 35;
  if (!sourceChanged || !affectedBindingPathsUpdated || !noComponentExecution || !boundedHostWrites || !vdomSourceRemainsInspectable) {
    throw new Error("VDOM dependency binding did not update only affected retained props");
  }
  return {
    sourceUpdateSkipsComponentExecution: noComponentExecution,
    onlyAffectedHostPropsWritten: boundedHostWrites,
    sourceUpdatesRetainedVdomBindings: vdomSourceRemainsInspectable,
    unaffectedEntityUnchanged: yNode.props.title === oldYTitle,
    hostWrites: host.writeCount,
  };
};

export const runTransitionExperiment = () => {
  const scenarios = [1, 2, 4, 8, 16].map(makeSchedulingScenario);
  const transitionInvariants = verifyTransitionInvariants();
  const vdomCommitPath = verifyVDOMCommitPath();
  const failedInvariant = Object.entries(transitionInvariants).find(
    ([name, value]) => typeof value === "boolean" && !value,
  );
  if (failedInvariant) throw new Error(`Transition invariant failed: ${failedInvariant[0]}`);
  const failedVDOMInvariant = Object.entries(vdomCommitPath).find(
    ([name, value]) => typeof value === "boolean" && !value,
  );
  if (failedVDOMInvariant) throw new Error(`VDOM invariant failed: ${failedVDOMInvariant[0]}`);
  for (const scenario of scenarios) {
    if (scenario.dagPlannedMs > scenario.waterfallMs) {
      throw new Error("DAG plan exceeded waterfall critical path");
    }
  }
  return {
    schemaVersion: "transition-scheduler-model-v1",
    kind: "deterministic scheduling and state-machine model; not measured runtime performance",
    assumptions: [
      "Independent I/O resources may all be in flight concurrently.",
      "A derived view model starts only after all declared resource dependencies resolve.",
      "Durations are fixed inputs; scheduler bookkeeping, JS execution, transfer, paint, and browser presentation costs are excluded.",
      "Waterfall is an adversarial serial-discovery control, not a claim about React or any specific framework.",
    ],
    scenarios,
    transitionInvariants,
    vdomCommitPath,
    vdomBindingPath: verifyVDOMBindingPath(),
  };
};
