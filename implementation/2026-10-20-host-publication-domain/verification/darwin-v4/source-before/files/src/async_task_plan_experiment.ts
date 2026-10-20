import { dashboardTasks } from "../compiler/fixtures/async_vdom_transition.ts";
import { compiledAsyncTaskPlan } from "./browser/generated_async_task_plan.ts";
import { AsyncVDOMTransitionRuntime } from "./async_vdom_transition_runtime.ts";
import { bindCompiledAsyncTasks } from "./async_task_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import {
  createVDOMSnapshotRoot,
  MemoryVDOMHost,
} from "./vdom_snapshot_runtime.ts";

/** Executes the checked-in OXC graph with the fixture's authored callbacks. */
export const runCompiledAsyncTaskPlanExperiment = async () => {
  const events: string[] = [];
  const implementations = Object.fromEntries(dashboardTasks.map((task) => [
    task.id,
    async (values: ReadonlyMap<string, unknown>, signal: AbortSignal) => {
      events.push(`start:${task.id}`);
      const value = await task.run(values, signal);
      events.push(`finish:${task.id}`);
      return value;
    },
  ]));
  const tasks = bindCompiledAsyncTasks(compiledAsyncTaskPlan, implementations);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = createVDOMSnapshotRoot(host, container);
  root.commit(
    jsx("main", {}, jsx("h1", { key: "title", id: "title" }, "Loading")),
  );
  const previousHeading = host.findByProp(container, "id", "title");
  const runtime = new AsyncVDOMTransitionRuntime(
    new Map([["dashboard", root]]),
  );
  const result = await runtime.run({
    rootIds: ["dashboard"],
    tasks,
    buildTree: (_rootId, values) => {
      const model = values.get("page-model") as {
        title: string;
        items: readonly { id: string; label: string }[];
      };
      return jsx(
        "main",
        {},
        jsx("h1", { key: "title", id: "title" }, model.title),
        jsx(
          "ul",
          { key: "items" },
          model.items.map((item) =>
            jsx("li", { key: item.id, "data-id": item.id }, item.label)
          ),
        ),
      );
    },
  });
  const heading = host.findByProp(container, "id", "title");
  const item = host.findByProp(container, "data-id", "one");
  const outputMatches = result.resolution.status === "committed" &&
    heading === previousHeading && heading?.children[0].text === "Hello, Ada" &&
    item?.children[0].text === "First item" && root.version === 2;
  const startedTasks = result.startedTasks;
  const compilerOrder = compiledAsyncTaskPlan.task_order.map((index) =>
    compiledAsyncTaskPlan.tasks[index].id
  );
  const taskOrderApplied = startedTasks.join("|") === compilerOrder.join("|");
  const contracts = { outputMatches, taskOrderApplied };
  const contractsPass = Object.values(contracts).every(Boolean);
  return {
    schemaVersion: "compiled-async-task-plan-experiment-v1",
    status: contractsPass ? "PASS" : "FAIL",
    contracts,
    contractsPass,
    compilerOrder,
    startedTasks,
    completedTasks: result.completedTasks,
    events,
    finalTitle: heading?.children[0].text,
    finalItem: item?.children[0].text,
    hostWrites: host.writeCount,
    timingMeasured: false,
    limitations: [
      "compiler extracts literal task IDs and prerequisite lists; it does not infer arbitrary async reads",
      "in-memory VDOM host only; no browser timing or React comparison",
      "all roots wait for the complete task plan; progressive reveal is not implemented",
    ],
  };
};
