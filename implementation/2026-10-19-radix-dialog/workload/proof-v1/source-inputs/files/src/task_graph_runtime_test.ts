import { defineTaskGraphPlan } from "./task_graph_plan.ts";
import { TaskGraphRuntime } from "./task_graph_runtime.ts";

const assertEquals = (actual: unknown, expected: unknown, message = "Values differ") => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
};

const makePlan = () => defineTaskGraphPlan(
  ["a", "b", "c"],
  ["left", "right", "summary", "unrelated"],
  [
    ["source:a"],
    ["source:b"],
    ["task:left", "task:right", "source:c"],
    ["source:c"],
  ],
);

const makeTasks = (calls: string[]) => ({
  left: (values: readonly unknown[], inputs: readonly number[], start: number, _end: number) => { calls.push("left"); return Number(values[inputs[start]]) * 2; },
  right: (values: readonly unknown[], inputs: readonly number[], start: number, _end: number) => { calls.push("right"); return Number(values[inputs[start]]) + 1; },
  summary: (values: readonly unknown[], inputs: readonly number[], start: number, _end: number) => { calls.push("summary"); return Number(values[inputs[start]]) + Number(values[inputs[start + 1]]) + Number(values[inputs[start + 2]]); },
  unrelated: (values: readonly unknown[], inputs: readonly number[], start: number, _end: number) => { calls.push("unrelated"); return Number(values[inputs[start]]) * 10; },
});

Deno.test("task graph dispatches only reachable value-dependent work", () => {
  const calls: string[] = [];
  const graph = new TaskGraphRuntime(makePlan(), makeTasks(calls), { a: 2, b: 4, c: 6 });
  assertEquals(graph.initialize(), 4);
  calls.length = 0;

  graph.setSourceSlot(0, 3);
  assertEquals(graph.flush(), 2);
  assertEquals(calls, ["left", "summary"]);
  assertEquals(graph.getTaskValue("summary"), 17);
  assertEquals(graph.getTaskValue("unrelated"), 60);

  calls.length = 0;
  graph.setSource("c", 8);
  assertEquals(graph.flush(), 2);
  assertEquals(calls, ["unrelated", "summary"]);
  assertEquals(graph.getTaskValue("summary"), 19);
  assertEquals(graph.getTaskValue("unrelated"), 80);
  let outOfRangeRejected = false;
  try {
    graph.setSourceSlot(3, 0);
  } catch (error) {
    outOfRangeRejected = error instanceof RangeError;
  }
  assertEquals(outOfRangeRejected, true);
});

Deno.test("shared fan-in is coalesced and tasks run after every changed prerequisite", () => {
  const calls: string[] = [];
  const graph = new TaskGraphRuntime(makePlan(), makeTasks(calls), { a: 1, b: 2, c: 3 });
  graph.initialize();
  calls.length = 0;
  graph.setSource("a", 5);
  graph.setSource("b", 7);
  graph.setSource("a", 6);
  assertEquals(graph.flush(), 3);
  assertEquals(calls, ["left", "right", "summary"]);
  assertEquals(graph.getTaskValue("summary"), 23);
});

Deno.test("no-op source writes enqueue no work and repeated updates use the latest value", () => {
  const calls: string[] = [];
  const graph = new TaskGraphRuntime(makePlan(), makeTasks(calls), { a: 2, b: 4, c: 6 });
  graph.initialize();
  calls.length = 0;
  assertEquals(graph.setSource("a", 2), false);
  assertEquals(graph.flush(), 0);
  graph.setSource("a", 9);
  graph.setSource("a", 10);
  assertEquals(graph.flush(), 2);
  assertEquals(graph.getTaskValue("summary"), 31);
});

Deno.test("unchanged intermediate output prunes downstream task execution", () => {
  const calls: string[] = [];
  const plan = defineTaskGraphPlan(["x"], ["bucket", "view"], [["source:x"], ["task:bucket"]]);
  const graph = new TaskGraphRuntime(plan, {
    bucket: (values, inputs, start) => { calls.push("bucket"); return Math.floor(Number(values[inputs[start]]) / 10); },
    view: (values, inputs, start) => { calls.push("view"); return Number(values[inputs[start]]) * 100; },
  }, { x: 1 });
  graph.initialize();
  assertEquals(graph.getTaskValue("view"), 0);
  calls.length = 0;

  graph.setSourceSlot(0, 2);
  assertEquals(graph.flush(), 1);
  assertEquals(calls, ["bucket"]);
  assertEquals(graph.getTaskValue("view"), 0);
});

Deno.test("incremental graph values match a full topological recomputation across an update trace", () => {
  const calls: string[] = [];
  const plan = makePlan();
  const tasks = makeTasks(calls);
  const graph = new TaskGraphRuntime(plan, tasks, { a: 0, b: 0, c: 0 });
  graph.initialize();
  const referenceSources: Record<string, number> = { a: 0, b: 0, c: 0 };
  const trace = [
    { a: 1 }, { b: 3, c: 2 }, { a: 5, b: 4 }, { c: -1 }, { a: 0, b: 0, c: 0 },
  ];

  for (const update of trace) {
    for (const [source, value] of Object.entries(update)) {
      referenceSources[source] = value;
      graph.setSource(source, value);
    }
    graph.flush();

    const expected = new Array<unknown>(plan.source_count + plan.task_count);
    for (let source = 0; source < plan.source_count; source++) expected[source] = referenceSources[plan.source_ids[source]];
    for (const taskIndex of plan.task_order) {
      const start = plan.task_input_offsets[taskIndex];
      const end = plan.task_input_offsets[taskIndex + 1];
      expected[plan.source_count + taskIndex] = tasks[plan.task_ids[taskIndex] as keyof typeof tasks](
        expected,
        plan.input_node_ids,
        start,
        end,
      );
    }
    for (const [index, taskId] of plan.task_ids.entries()) {
      assertEquals(graph.getTaskValue(taskId), expected[plan.source_count + index], `Mismatch for ${taskId}`);
    }
  }
});

Deno.test("compiler plan rejects cycles and unknown dependency names", () => {
  let cycleRejected = false;
  try {
    defineTaskGraphPlan([], ["a", "b"], [["task:b"], ["task:a"]]);
  } catch (error) {
    cycleRejected = error instanceof Error && error.message.includes("cycle");
  }
  assertEquals(cycleRejected, true);

  let missingRejected = false;
  try {
    defineTaskGraphPlan(["source"], ["task"], [["task:missing"]]);
  } catch (error) {
    missingRejected = error instanceof Error && error.message.includes("unknown dependency");
  }
  assertEquals(missingRejected, true);
});
