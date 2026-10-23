import { dashboardTasks } from "../compiler/fixtures/async_vdom_transition.ts";
import { compiledAsyncTaskPlan } from "./browser/generated_async_task_plan.ts";
import { AsyncVDOMTransitionRuntime } from "./async_vdom_transition_runtime.ts";
import { runCompiledAsyncTaskPlanExperiment } from "./async_task_plan_experiment.ts";
import {
  asyncTask,
  bindCompiledAsyncTasks,
  type AsyncTaskOutput,
} from "./async_task_plan.ts";
import { searchTasks } from "../compiler/fixtures/async_task_state_input.ts";
import {
  compiledAsyncTaskPlan as compiledAsyncTaskStateInputPlan,
} from "./browser/generated_async_task_state_input_plan.ts";
import { componentStateSitesPlan } from "./browser/generated_component_state_sites.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import {
  createVDOMSnapshotRoot,
  MemoryVDOMHost,
} from "./vdom_snapshot_runtime.ts";

Deno.test("OXC task DAG binds authored functions and commits through async VDOM", async () => {
  const implementations = Object.fromEntries(
    dashboardTasks.map((task) => [task.id, task.run]),
  );
  const tasks = bindCompiledAsyncTasks(compiledAsyncTaskPlan, implementations);
  if (
    tasks.map((task) => task.id).join("|") !== "profile|feed|header|page-model"
  ) {
    throw new Error(
      `Compiler topological order was not applied: ${
        tasks.map((task) => task.id)
      }`,
    );
  }

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
  if (
    result.resolution.status !== "committed" || heading !== previousHeading ||
    heading?.children[0].text !== "Hello, Ada" ||
    item?.children[0].text !== "First item" ||
    root.version !== 2
  ) {
    throw new Error(
      "Compiler-emitted async plan failed to prepare/commit the dashboard VDOM",
    );
  }
});

Deno.test("compiled task binder rejects implementation drift", () => {
  let rejected = false;
  try {
    bindCompiledAsyncTasks(compiledAsyncTaskPlan, {
      profile: async () => "Ada",
    });
  } catch (error) {
    rejected = error instanceof Error &&
      error.message.includes("exactly match");
  }
  if (!rejected) {
    throw new Error("Expected extra or missing task implementations to fail");
  }
});

Deno.test("compiled task binder rejects external aliases colliding with task IDs", () => {
  const plan = { schema_version: 1 as const, source_file: "collision.tsx",
    tasks: [
      { id: "query", site_id: "collision.tsx#async-task:query",
        depends_on: [] },
      { id: "lookup", site_id: "collision.tsx#async-task:lookup",
        depends_on: ["$query"] },
    ], task_order: [0, 1] };
  let rejected = false;
  try {
    bindCompiledAsyncTasks(plan, { query: () => "task", lookup: () => "input" });
  } catch (error) {
    rejected = error instanceof Error && error.message.includes("aliases");
  }
  if (!rejected) throw new Error("External alias became a task prerequisite");
});

const typedOutputTasks = [
  asyncTask("two-argument-result", (values) => ({
    result: values.get("input") as number,
  })),
  asyncTask("lookup-result", ["$query"], (values) => ({
    query: values.get("$query") as string,
    matches: ["one", "two"],
  })),
  asyncTask("render-result", ["lookup-result"], (values) => ({
    count: (values.get("lookup-result") as { matches: string[] }).matches.length,
  })),
] as const;
const typedLookup: AsyncTaskOutput<typeof typedOutputTasks, "lookup-result"> = {
  query: "tea",
  matches: ["cup"],
};
const invalidTypedOutput: AsyncTaskOutput<typeof typedOutputTasks, "lookup-result"> = {
  // @ts-expect-error The output resource retains its inferred object type.
  query: 42,
  matches: [],
};
// @ts-expect-error The task ID is inferred as a literal union.
const invalidTypedLookup: AsyncTaskOutput<typeof typedOutputTasks, "missing"> = {};
void typedLookup;
void invalidTypedOutput;
void invalidTypedLookup;

Deno.test("compiled task binder restores authored external aliases in scope", async () => {
  const plan = {
    schema_version: 1 as const,
    source_file: "compiled.tsx",
    tasks: [{
      id: "lookup-result",
      site_id: "compiled.tsx#async-task:lookup-result",
      depends_on: ["$query", "Counter#state:0"],
    }],
    task_order: [0],
  };
  let seen: ReadonlyMap<string, unknown> | undefined;
  const [task] = bindCompiledAsyncTasks(plan, {
    "lookup-result": (values) => {
      seen = values;
      return values.get("$query");
    },
  });
  await task.run(new Map<string, unknown>([
    ["query", "green tea"],
    ["Counter#state:0", 7],
    ["undeclared-secret", "hidden"],
  ]), new AbortController().signal);
  if (
    seen?.get("$query") !== "green tea" || seen.get("query") !== undefined ||
    seen.get("Counter#state:0") !== 7 || seen.has("undeclared-secret")
  ) {
    throw new Error("Compiled task inputs did not preserve declared authored keys");
  }
});

Deno.test("OXC infers component state-site task reads", () => {
  const implementations = Object.fromEntries(
    searchTasks.map((task) => [task.id, task.run]),
  );
  const tasks = bindCompiledAsyncTasks(
    compiledAsyncTaskStateInputPlan,
    implementations,
  );
  const counterCountSite = componentStateSitesPlan.components.find(
    (component) => component.name === "Counter",
  )?.state_sites[0]?.site_id;
  if (!counterCountSite) throw new Error("Counter state site is missing");
  if (
    tasks.map((task) => task.id).join("|") !== "search|catalog|page-model" ||
    tasks[0].dependsOn.join("|") !== counterCountSite ||
    tasks[1].dependsOn.length !== 0 ||
    tasks[2].dependsOn.join("|") !== "search|catalog"
  ) {
    throw new Error(
      "OXC state input did not become a runtime read edge",
    );
  }
});

Deno.test("notebook compiled async-plan fixture preserves compiler/runtime parity", async () => {
  const result = await runCompiledAsyncTaskPlanExperiment();
  if (result.status !== "PASS" || !result.contractsPass) {
    throw new Error(
      `Compiled async task fixture failed: ${JSON.stringify(result)}`,
    );
  }
});
