import { assertEquals } from "jsr:@std/assert";
import { asyncTask } from "./async_task_plan.ts";
import { AsyncTaskDemandScope, defineProviderDemand } from "./async_task_demand.ts";
import { AsyncResource } from "./async_resource_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import {
  invalidateCompiledSemanticPlan,
  registerCompiledSemanticPlan,
  type CompiledSemanticPlan,
} from "./compiled_semantic_plan.ts";
import { ComponentStateRoot, defineComponent, Suspense, useAt, useEffectAt, useStoreAt } from "./component_state_runtime.ts";
import { jsx, type RuntimeNode } from "./jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import { NativeTaskTransitionQueue } from "./native_task_transition.ts";
import { type NativeTaskExecution } from "./native_task_execution.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => { resolve = yes; });
  return { promise, resolve };
};
const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");
const root = (rootId: string) => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const value = new ComponentStateRoot(host, container, {
    rootId,
    scheduleCommit: () => {},
    renderPreparation: "repeatable",
  });
  return { value, text: () => container.children.map(text).join("") };
};

Deno.test("shared provider demand preserves divergent root history through independent cancellation", async () => {
  const left = root("shared-demand-history-left");
  const right = root("shared-demand-history-right");
  left.value.mount(jsx("output", {}, "initial-left"));
  right.value.mount(jsx("output", {}, "initial-right"));
  const query = createAsyncStore("old");
  query.beginTransition("shared-demand-fork", [left.value.rootId, right.value.rootId]);
  query.dispatch("new", { kind: "transition", transitionId: "shared-demand-fork" });
  query.commitTransitionRoots("shared-demand-fork", [right.value.rootId], { finish: true });
  const shared = deferred<string>(), oldResult = deferred<string>();
  const newResult = deferred<string>(), background = deferred<string>();
  const scope = new AsyncTaskDemandScope();
  let sharedStarts = 0, backgroundStarts = 0, backgroundAborts = 0;
  const sharedDemand = defineProviderDemand({}, "shared-history-v1", () => {
    sharedStarts++;
    return shared.promise;
  });
  const backgroundDemand = defineProviderDemand({}, "shared-history-v1", (_captures, signal) => {
    backgroundStarts++;
    signal.addEventListener("abort", () => backgroundAborts++, { once: true });
    return background.promise;
  });
  const queried: string[] = [];
  const tasks = [
    asyncTask("shared", [], () => { throw new Error("explicit shared provider required"); }),
    asyncTask("background", [], () => { throw new Error("explicit background provider required"); }),
    asyncTask("result", ["$query", "shared"], (inputs) => {
      const key = String(inputs.get("$query"));
      queried.push(key);
      return (key === "old" ? oldResult.promise : newResult.promise)
        .then(value => `${String(inputs.get("shared"))}:${value}`);
    }),
  ] as const;
  const View = defineComponent("shared-demand-history-view",
    ({ execution }: { execution: NativeTaskExecution<typeof tasks> }) =>
      jsx("output", {}, String(useAt("result", execution.resource("result")))));
  const buildTree = (execution: NativeTaskExecution<typeof tasks>): RuntimeNode =>
    jsx(Suspense, { __nativeBoundarySite: "shared-demand-history-boundary",
      fallback: jsx("i", {}, "loading"), children: jsx(View, { execution }) });
  const queue = new NativeTaskTransitionQueue();
  const histories = () => [query.getStateForRoot(left.value.rootId),
    query.getStateForRoot(right.value.rootId)];
  try {
    const operation = queue.enqueue(tasks, [
      { root: left.value, buildTree }, { root: right.value, buildTree },
    ], { reveal: "independent", liveInputs: { "$query": query }, demandScope: scope,
      demands: new Map([["shared", sharedDemand], ["background", backgroundDemand]]) });
    assertEquals(histories(), ["old", "new"]);
    assertEquals([sharedStarts, backgroundStarts], [1, 1]);
    shared.resolve("shared");
    oldResult.resolve("old-result");
    for (let turn = 0; turn < 8 && left.text() !== "shared:old-result"; turn++)
      await new Promise(resolve => setTimeout(resolve, 0));
    assertEquals(queried, ["old", "new"]);
    assertEquals([left.text(), right.text()], ["shared:old-result", "initial-right"]);
    assertEquals(histories(), ["old", "new"]);
    assertEquals(backgroundAborts, 0);
    const acceptedLeft = JSON.stringify(left.value.snapshot);
    const acceptedVersions = [left.value.publicationVersion, right.value.publicationVersion];
    operation.cancel("retire pending fork interests");
    assertEquals((await operation.completion).status, "cancelled");
    assertEquals(backgroundAborts, 1);
    newResult.resolve("late-new-result");
    background.resolve("late-background");
    await new Promise(resolve => setTimeout(resolve, 0));
    assertEquals(JSON.stringify(left.value.snapshot), acceptedLeft);
    assertEquals([left.value.publicationVersion, right.value.publicationVersion], acceptedVersions);
    assertEquals([left.text(), right.text()], ["shared:old-result", "initial-right"]);
    assertEquals(histories(), ["old", "new"]);
    assertEquals(scope.size, 0);
  } finally {
    queue.dispose(); scope.dispose(); left.value.dispose(); right.value.dispose();
  }
});

Deno.test("forked task inputs converge onto the already matching execution", async () => {
  const left = root("fork-converge-left");
  const right = root("fork-converge-right");
  const query = createAsyncStore("old");
  query.beginTransition("fork", [left.value.rootId, right.value.rootId]);
  query.dispatch("new", { kind: "transition", transitionId: "fork" });
  query.commitTransitionRoots("fork", [right.value.rootId], { finish: true });
  const oldResult = deferred<string>();
  const newResult = deferred<string>();
  const calls: string[] = [];
  const signals = new Map<string, AbortSignal>();
  const tasks = [asyncTask("result", ["$query"], (inputs, signal) => {
    const input = String(inputs.get("$query"));
    calls.push(input);
    signals.set(input, signal);
    return input === "old" ? oldResult.promise : newResult.promise;
  })] as const;
  const View = defineComponent("fork-converge-view", ({ execution }: { execution: NativeTaskExecution<typeof tasks> }) =>
    jsx("output", {}, String(useAt("result", execution.resource("result")))));
  const buildTree = (execution: NativeTaskExecution<typeof tasks>): RuntimeNode => jsx(Suspense, {
    __nativeBoundarySite: "fork-converge-boundary",
    fallback: jsx("i", {}, "loading"),
    children: jsx(View, { execution }),
  });
  const queue = new NativeTaskTransitionQueue();
  try {
    const operation = queue.enqueue(tasks, [
      { root: left.value, buildTree },
      { root: right.value, buildTree },
    ], { liveInputs: { "$query": query } });
    assertEquals(calls, ["old", "new"]);
    query.commitTransitionRoots("fork", [left.value.rootId], { finish: true });
    assertEquals(calls, ["old", "new"]);
    assertEquals(signals.get("old")?.aborted, true);
    assertEquals(signals.get("new")?.aborted, false);
    assertEquals([left.text(), right.text()], ["", ""]);
    oldResult.resolve("obsolete");
    await Promise.resolve();
    assertEquals([left.text(), right.text()], ["", ""]);
    newResult.resolve("accepted");
    assertEquals((await operation.completion).status, "committed");
    assertEquals([left.text(), right.text()], ["accepted", "accepted"]);
    assertEquals(calls, ["old", "new"]);
    assertEquals(query.diagnostics().listeners, 0);
  } finally {
    queue.dispose();
    left.value.dispose();
    right.value.dispose();
  }
});

Deno.test("forked task inputs converging to a new value start one new execution", async () => {
  const left = root("fork-third-left");
  const right = root("fork-third-right");
  const query = createAsyncStore("old");
  query.beginTransition("fork-third", [left.value.rootId, right.value.rootId]);
  query.dispatch("new", { kind: "transition", transitionId: "fork-third" });
  query.commitTransitionRoots("fork-third", [right.value.rootId], { finish: true });
  const results = new Map([
    ["old", deferred<string>()],
    ["new", deferred<string>()],
    ["third", deferred<string>()],
  ]);
  const calls: string[] = [];
  const signals = new Map<string, AbortSignal>();
  const tasks = [asyncTask("result", ["$query"], (inputs, signal) => {
    const input = String(inputs.get("$query"));
    calls.push(input);
    signals.set(input, signal);
    return results.get(input)!.promise;
  })] as const;
  const View = defineComponent("fork-third-view", ({ execution }: { execution: NativeTaskExecution<typeof tasks> }) =>
    jsx("output", {}, String(useAt("result", execution.resource("result")))));
  const buildTree = (execution: NativeTaskExecution<typeof tasks>): RuntimeNode => jsx(Suspense, {
    __nativeBoundarySite: "fork-third-boundary",
    fallback: jsx("i", {}, "loading"),
    children: jsx(View, { execution }),
  });
  const queue = new NativeTaskTransitionQueue();
  try {
    const operation = queue.enqueue(tasks, [
      { root: left.value, buildTree },
      { root: right.value, buildTree },
    ], { liveInputs: { "$query": query } });
    assertEquals(calls, ["old", "new"]);
    const acceptedVersions = [left.value.publicationVersion, right.value.publicationVersion];
    query.dispatch("third");
    assertEquals(calls, ["old", "new", "third"]);
    assertEquals(signals.get("old")?.aborted, true);
    assertEquals(signals.get("new")?.aborted, true);
    assertEquals(signals.get("third")?.aborted, false);
    results.get("old")!.resolve("obsolete-old");
    results.get("new")!.resolve("obsolete-new");
    await Promise.resolve();
    assertEquals([left.text(), right.text()], ["", ""]);
    assertEquals([left.value.publicationVersion, right.value.publicationVersion], acceptedVersions);
    results.get("third")!.resolve("accepted-third");
    assertEquals((await operation.completion).status, "committed");
    assertEquals([left.text(), right.text()], ["accepted-third", "accepted-third"]);
    assertEquals(calls, ["old", "new", "third"]);
    assertEquals(query.diagnostics().listeners, 0);
  } finally {
    queue.dispose();
    left.value.dispose();
    right.value.dispose();
  }
});

Deno.test("committed optional task retires only after its last forked root retires", async () => {
  const leftSource = "fork-task-lifetime/left.tsx";
  const rightSource = "fork-task-lifetime/right.tsx";
  const plan = (source: string): CompiledSemanticPlan => ({
    schema_version: 1,
    source_file: source,
    module_revision: "a",
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
  });
  registerCompiledSemanticPlan(plan(leftSource));
  registerCompiledSemanticPlan(plan(rightSource));
  const left = root("fork-task-lifetime-left");
  const right = root("fork-task-lifetime-right");
  const waiting = deferred<string>();
  let starts = 0;
  let taskSignal: AbortSignal | undefined;
  const tasks = [asyncTask("optional", [], (_inputs, signal) => {
    starts++;
    taskSignal = signal;
    return waiting.promise;
  })] as const;
  const Left = defineComponent(`${leftSource}#component:View`, () => jsx("b", {}, "left accepted"));
  const Right = defineComponent(`${rightSource}#component:View`, () => jsx("b", {}, "right accepted"));
  const queue = new NativeTaskTransitionQueue();
  try {
    const operation = queue.enqueue(tasks, [
      { root: left.value, buildTree: () => jsx(Left, {}) },
      { root: right.value, buildTree: () => jsx(Right, {}) },
    ]);
    assertEquals((await operation.completion).status, "committed");
    assertEquals(starts, 1);
    assertEquals([left.text(), right.text()], ["left accepted", "right accepted"]);
    const acceptedVersions = [left.value.publicationVersion, right.value.publicationVersion];
    invalidateCompiledSemanticPlan(leftSource, "a");
    assertEquals(left.value.retired, true);
    assertEquals(right.value.retired, false);
    assertEquals(taskSignal?.aborted, false);
    assertEquals([left.text(), right.text()], ["left accepted", "right accepted"]);
    invalidateCompiledSemanticPlan(rightSource, "a");
    assertEquals(right.value.retired, true);
    assertEquals(taskSignal?.aborted, true);
    waiting.resolve("late");
    await Promise.resolve();
    assertEquals([left.text(), right.text()], ["left accepted", "right accepted"]);
    assertEquals([left.value.publicationVersion, right.value.publicationVersion], acceptedVersions);
  } finally {
    queue.dispose();
    left.value.dispose();
    right.value.dispose();
    invalidateCompiledSemanticPlan(leftSource);
    invalidateCompiledSemanticPlan(rightSource);
  }
});

Deno.test("grouped transition notifies live task work after every root leaves publication", async () => {
  const roots = [root("fork-notify-primary"), root("fork-notify-three"), root("fork-notify-inspector")];
  const query = createAsyncStore("A");
  const accepted = new AsyncResource(Promise.resolve("accepted-A"));
  await Promise.resolve();
  const observed: string[][] = [];
  const readAll = () => roots.map(({ text }) => text());
  const Probe = defineComponent("fork-notify-probe", () => {
    useEffectAt("all-roots", () => { observed.push(readAll()); });
    return jsx("i", {}, "effect");
  });
  const Detail = defineComponent("fork-notify-detail", ({ resource }: { resource: AsyncResource<string> }) =>
    jsx("output", {}, String(useAt("result", resource))));
  const View = defineComponent("fork-notify-view", ({ resource, probe }: {
    resource: AsyncResource<string>;
    probe: boolean;
  }) => jsx("section", {}, [
    jsx("b", {}, String(useStoreAt("query", query))),
    jsx(Suspense, {
      __nativeBoundarySite: "fork-notify-boundary",
      fallback: jsx("i", {}, "loading"),
      children: jsx(Detail, { resource }),
    }),
    probe ? jsx(Probe, {}) : null,
  ]));
  const tree = (resource: AsyncResource<string>, probe: boolean) => jsx(View, { resource, probe });
  const pendingA = deferred<string>();
  const pendingC = deferred<string>();
  const starts: string[] = [];
  const signals = new Map<string, AbortSignal>();
  const tasks = [asyncTask("result", ["$query"], (inputs, signal) => {
    const value = String(inputs.get("$query"));
    starts.push(value);
    signals.set(value, signal);
    return value === "A" ? pendingA.promise : pendingC.promise;
  })] as const;
  const taskQueue = new NativeTaskTransitionQueue();
  const publicationQueue = new NativeRootWorkQueue();
  let unsubscribe: (() => void) | undefined;
  try {
    for (const { value } of roots) value.mount(tree(accepted, false));
    const operation = taskQueue.enqueue(tasks, roots.map(({ value }) => ({
      root: value,
      buildTree: (execution: NativeTaskExecution<typeof tasks>) => tree(execution.resource("result"), false),
    })), { liveInputs: { "$query": query } });
    assertEquals(starts, ["A"]);
    query.beginTransition("fork-notify-C", roots.map(({ value }) => value.rootId));
    query.dispatch("C", { kind: "transition", transitionId: "fork-notify-C" });
    unsubscribe = query.subscribe(roots[0].value.rootId, () => { observed.push(readAll()); });
    const settled: string[] = [];
    const publication = publicationQueue.enqueue({ renderPreparation: "repeatable",
      id: "fork-notify-C",
      roots: roots.map(({ value }) => ({ root: value, tree: tree(accepted, true) })),
      transitions: ["fork-notify-C"],
      finishTransitions: true,
      onSettled: ({ status }) => { settled.push(status); },
    });
    assertEquals(publication.status, "committed");
    assertEquals(starts, ["A", "C"]);
    assertEquals(signals.get("A")?.aborted, true);
    assertEquals(operation.status, "pending");
    assertEquals(observed.length, 4);
    for (const snapshot of observed) {
      assertEquals(snapshot, ["Caccepted-Aeffect", "Caccepted-Aeffect", "Caccepted-Aeffect"]);
    }
    assertEquals(settled, ["committed"]);
    pendingA.resolve("obsolete-A");
    pendingC.resolve("accepted-C");
    assertEquals((await operation.completion).status, "committed");
    assertEquals(readAll(), ["Caccepted-C", "Caccepted-C", "Caccepted-C"]);
  } finally {
    unsubscribe?.();
    taskQueue.dispose();
    publicationQueue.dispose();
    for (const { value } of roots) value.dispose();
  }
});
