import { AsyncVDOMTransitionRuntime } from "./async_vdom_transition_runtime.ts";
import { searchTasks } from "../compiler/fixtures/async_task_state_input.ts";
import { bindCompiledAsyncTasks } from "./async_task_plan.ts";
import {
  compiledAsyncTaskPlan as compiledAsyncTaskStateInputPlan,
} from "./browser/generated_async_task_state_input_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";
import { componentStateSitesPlan } from "./browser/generated_component_state_sites.ts";
import {
  createVDOMSnapshotRoot,
  MemoryVDOMHost,
} from "./vdom_snapshot_runtime.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => resolve = yes);
  return { promise, resolve };
};

const counterCountSiteId = componentStateSitesPlan.components.find((
  component,
) => component.name === "Counter")?.state_sites[0]?.site_id;
if (!counterCountSiteId) throw new Error("Counter state site is missing");

/** Deterministic same-root urgent/update rebase trace; no timing is measured. */
export const runAsyncVDOMUrgentRebaseExperiment = async () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = createVDOMSnapshotRoot(host, container);
  root.commit(
    jsx(
      "main",
      {},
      jsx("input", { key: "input", id: "query", value: "0" }),
      jsx("strong", { key: "result", id: "result" }, "old result"),
    ),
  );
  const input = host.findByProp(container, "id", "query")!;
  const resultNode = host.findByProp(container, "id", "result")!;
  const data = deferred<string>();
  const world = new OwnerStateWorld();
  const queryOwner = world.resolveOwner(null, "app");
  const [, setCount] = world.useState(queryOwner, counterCountSiteId, 0);
  const readCount = () => world.useState(queryOwner, counterCountSiteId, 0)[0];
  const events: string[] = ["transition:start"];
  const runtime = new AsyncVDOMTransitionRuntime(new Map([["app", root]]));
  runtime.watchStateWorld("app", world);
  const running = runtime.run({
    rootIds: ["app"],
    tasks: [{ id: "results", dependsOn: [], run: () => data.promise }],
    buildTree: (_rootId, values) =>
      jsx(
        "main",
        {},
        jsx("input", {
          key: "input",
          id: "query",
          value: String(readCount()),
        }),
        jsx(
          "strong",
          { key: "result", id: "result" },
          String(readCount()) + ": " + values.get("results"),
        ),
      ),
  });
  await Promise.resolve();

  setCount(1);
  runtime.commitUrgent(
    "app",
    jsx(
      "main",
      {},
      jsx("input", {
        key: "input",
        id: "query",
        value: String(readCount()),
      }),
      jsx("strong", { key: "result", id: "result" }, "old result"),
    ),
  );
  events.push("urgent:commit");
  const urgentVisibleImmediately =
    host.findByProp(container, "id", "query") === input &&
    input.props.value === "1";
  const pendingResultRetained =
    host.findByProp(container, "id", "result") === resultNode &&
    resultNode.children[0].text === "old result";

  data.resolve("fresh results");
  events.push("async:ready");
  const transition = await running;
  events.push("candidate:rebased-and-committed");
  const rebasedStateCommitted = transition.resolution.status === "committed" &&
    String(resultNode.children[0].text) ===
      "1: fresh results";
  const hostIdentityPreserved =
    host.findByProp(container, "id", "query") === input &&
    host.findByProp(container, "id", "result") === resultNode;
  const rootVersionAdvanced = root.version === 3;
  const contracts = {
    urgentVisibleImmediately,
    pendingResultRetained,
    rebasedStateCommitted,
    hostIdentityPreserved,
    rootVersionAdvanced,
  };
  const contractsPass = Object.values(contracts).every(Boolean);
  return {
    schemaVersion: "async-vdom-urgent-rebase-v1",
    status: contractsPass ? "PASS" : "FAIL",
    contracts,
    contractsPass,
    events,
    changedState: world.pendingChanges(),
    finalCount: input.props.value,
    finalResult: resultNode.children[0].text,
    rootVersion: root.version,
    timingMeasured: false,
    limitations: [
      "the async result is independent of the urgent count; changing a task dependency must restart or invalidate that task explicitly",
      "the build callback must read current application state when it builds the ready candidate",
      "deterministic in-memory host trace only; no React differential or browser paint measurement",
    ],
  };
};

/** Verify changed task inputs invalidate pending results before they publish. */
export const runAsyncVDOMDependencyInvalidationExperiment = async () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = createVDOMSnapshotRoot(host, container);
  root.commit(
    jsx(
      "main",
      {},
      jsx("input", { key: "input", id: "query", value: "0" }),
      jsx("strong", { key: "result", id: "result" }, "old result"),
    ),
  );
  const data = deferred<string>();
  const world = new OwnerStateWorld();
  const queryOwner = world.resolveOwner(null, "app");
  const [, setCount] = world.useState(queryOwner, counterCountSiteId, 0);
  const readCount = () => world.useState(queryOwner, counterCountSiteId, 0)[0];
  let taskAborted = false;
  const implementations = Object.fromEntries(
    searchTasks.map((task) => [task.id, task.run]),
  );
  implementations.search = (_inputs, signal) => {
    signal.addEventListener("abort", () => taskAborted = true, {
      once: true,
    });
    return data.promise;
  };
  const tasks = bindCompiledAsyncTasks(
    compiledAsyncTaskStateInputPlan,
    implementations,
  );
  const runtime = new AsyncVDOMTransitionRuntime(new Map([["app", root]]));
  runtime.watchStateWorld("app", world);
  const running = runtime.run({
    rootIds: ["app"],
    initialValues: { [counterCountSiteId]: readCount() },
    tasks,
    buildTree: (_rootId, values) =>
      jsx(
        "main",
        {},
        jsx("input", {
          key: "input",
          id: "query",
          value: String(readCount()),
        }),
        jsx(
          "strong",
          { key: "result", id: "result" },
          String(values.get("search")),
        ),
      ),
  });
  await Promise.resolve();

  setCount(1);
  const invalidatedAtStateWrite = taskAborted;
  runtime.commitUrgent(
    "app",
    jsx(
      "main",
      {},
      jsx("input", {
        key: "input",
        id: "query",
        value: String(readCount()),
      }),
      jsx("strong", { key: "result", id: "result" }, "old result"),
    ),
  );
  data.resolve("stale result for old count");
  const transition = await running;
  const contracts = {
    compilerInputEdgeBound:
      tasks[0]?.dependsOn.join("|") === counterCountSiteId,
    stateWriteInvalidatedBeforeUrgentCommit: invalidatedAtStateWrite,
    taskSignalAborted: taskAborted,
    staleCandidateRejected: transition.resolution.status === "stale" ||
      transition.resolution.status === "cancelled",
    urgentStateRetained:
      host.findByProp(container, "id", "query")?.props.value === "1",
    oldResultRetained:
      host.findByProp(container, "id", "result")?.children[0].text ===
        "old result",
    rootVersionAdvancedOnlyForUrgentWrite: root.version === 2,
  };
  const contractsPass = Object.values(contracts).every(Boolean);
  return {
    schemaVersion: "async-vdom-urgent-dependency-invalidation-v1",
    status: contractsPass ? "PASS" : "FAIL",
    contracts,
    contractsPass,
    changedState: world.pendingChanges(),
    finalCount: host.findByProp(container, "id", "query")?.props.value,
    finalResult: host.findByProp(container, "id", "result")?.children[0].text,
    timingMeasured: false,
  };
};

/** Restart an invalidated plan once with the newest state-site input. */
export const runAsyncVDOMInputRestartExperiment = async () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = createVDOMSnapshotRoot(host, container);
  root.commit(
    jsx(
      "main",
      {},
      jsx("input", { key: "input", id: "query", value: "0" }),
      jsx("strong", { key: "result", id: "result" }, "old result"),
    ),
  );
  const firstResult = deferred<string>();
  const latestResult = deferred<string>();
  const firstTaskStarted = deferred<void>();
  const restartedTaskStarted = deferred<void>();
  const world = new OwnerStateWorld();
  const queryOwner = world.resolveOwner(null, "app");
  const [, setCount] = world.useState(queryOwner, counterCountSiteId, 0);
  const readCount = () => world.useState(queryOwner, counterCountSiteId, 0)[0];
  const startedInputs: number[] = [];
  let firstTaskAborted = false;
  let pageModelRuns = 0;
  let catalogRuns = 0;
  const implementations = Object.fromEntries(
    searchTasks.map((task) => [task.id, task.run]),
  );
  implementations.search = (inputs, signal) => {
    const count = Number(inputs.get(`$${counterCountSiteId}`));
    startedInputs.push(count);
    if (count === 0) {
      signal.addEventListener("abort", () => firstTaskAborted = true, {
        once: true,
      });
      firstTaskStarted.resolve();
      return firstResult.promise;
    }
    restartedTaskStarted.resolve();
    return latestResult.promise;
  };
  implementations["page-model"] = (inputs) => {
    pageModelRuns++;
    return String(inputs.get("search")) + "|" + String(inputs.get("catalog"));
  };
  implementations.catalog = async () => {
    catalogRuns++;
    return "catalog";
  };
  const tasks = bindCompiledAsyncTasks(
    compiledAsyncTaskStateInputPlan,
    implementations,
  );
  const runtime = new AsyncVDOMTransitionRuntime(new Map([["app", root]]));
  runtime.watchStateWorld("app", world);
  const running = runtime.run({
    rootIds: ["app"],
    initialValues: { [counterCountSiteId]: readCount() },
    tasks,
    maxInputRestarts: 1,
    reuseCompletedTasks: true,
    refreshInputs: (changedInputIds) =>
      Object.fromEntries(
        changedInputIds.map((inputId) => [inputId, readCount()]),
      ),
    buildTree: (_rootId, values) =>
      jsx(
        "main",
        {},
        jsx("input", {
          key: "input",
          id: "query",
          value: String(readCount()),
        }),
        jsx(
          "strong",
          { key: "result", id: "result" },
          String(values.get("page-model")),
        ),
      ),
  });
  await firstTaskStarted.promise;

  setCount(1);
  runtime.commitUrgent(
    "app",
    jsx(
      "main",
      {},
      jsx("input", {
        key: "input",
        id: "query",
        value: String(readCount()),
      }),
      jsx("strong", { key: "result", id: "result" }, "old result"),
    ),
  );
  const urgentStateVisible =
    host.findByProp(container, "id", "query")?.props.value === "1" &&
    host.findByProp(container, "id", "result")?.children[0].text ===
      "old result";
  await restartedTaskStarted.promise;
  firstResult.resolve("stale results for 0");
  latestResult.resolve("fresh results for 1");
  const transition = await running;
  const finalResult = host.findByProp(container, "id", "result")?.children[0]
    .text;
  const contracts = {
    firstAttemptAborted: firstTaskAborted,
    urgentStateVisible,
    restartedWithLatestInput: startedInputs.join("|") === "0|1",
    restartCountReported: transition.restartCount === 1,
    staleResultDidNotPublish: finalResult === "fresh results for 1|catalog",
    downstreamTaskRanOnlyForFreshAttempt: pageModelRuns === 1,
    independentTaskReusedAcrossRestart: catalogRuns === 1 &&
      transition.reusedTasks.includes("catalog"),
    transitionCommitted: transition.resolution.status === "committed",
    rootVersionIncludesUrgentAndTransition: root.version === 3,
  };
  const contractsPass = Object.values(contracts).every(Boolean);
  return {
    schemaVersion: "async-vdom-input-restart-v1",
    status: contractsPass ? "PASS" : "FAIL",
    contracts,
    contractsPass,
    startedInputs,
    restartCount: transition.restartCount,
    finalResult,
    rootVersion: root.version,
    timingMeasured: false,
    limitations: [
      "reuse is limited to completed tasks outside the conservative changed-input descendant closure",
      "refreshInputs is an application callback; the runtime does not yet synthesize owner-scoped state snapshots",
      "restart behavior is not compared with React or timed in a browser",
    ],
  };
};
