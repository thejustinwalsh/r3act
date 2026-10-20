import { assertEquals, assertThrows } from "jsr:@std/assert";
import { asyncTask } from "./async_task_plan.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import { ComponentStateRoot, defineComponent, Suspense, useAt } from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { NativeTaskTransitionQueue, type NativeTaskTransitionHandle } from "./native_task_transition.ts";
import { MemoryVDOMHost, type MemoryNode } from "./vdom_snapshot_runtime.ts";

const deferred = () => {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((done) => resolve = done);
  return { promise, resolve };
};
const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");
const root = (rootId: string, host = new MemoryVDOMHost()) => {
  const container = host.createContainer();
  const native = new ComponentStateRoot(host, container, { rootId, scheduleCommit: () => {} });
  native.mount(jsx("b", {}, "accepted"));
  return { native, text: () => container.children.map(text).join("") };
};
const View = defineComponent("reentrant-replacement-view", ({ execution }: any) =>
  jsx("b", {}, String(useAt("value", execution.resource("value")))));
const tree = (execution: any) => jsx(Suspense, {
  __nativeBoundarySite: "reentrant-replacement-boundary",
  fallback: jsx("i", {}, "loading"),
  children: jsx(View, { execution }),
});

for (const lateFirst of [false, true]) {
  Deno.test(`reentrant task replacement retains newest operation; late old provider ${lateFirst ? "first" : "last"}`, async () => {
    const app = root(`reentrant-task-${lateFirst}`);
    const independent = root(`reentrant-independent-${lateFirst}`);
    const queue = new NativeTaskTransitionQueue();
    const oldProvider = deferred(), newestProvider = deferred(), otherProvider = deferred();
    const started: string[] = [], settled: string[] = [];
    let c!: NativeTaskTransitionHandle;
    const tasks = (name: string, promise: Promise<string>) =>
      [asyncTask("value", [], () => { started.push(name); return promise; })] as const;
    const a = queue.enqueue(tasks("a", oldProvider.promise), [
      { root: app.native, buildTree: tree },
    ], { id: `a-${lateFirst}`, key: "route", onSettled: ({ status }) => {
      settled.push(`a:${status}`);
      if (status === "cancelled") c = queue.enqueue(tasks("c", newestProvider.promise), [
        { root: app.native, buildTree: tree },
      ], { id: `c-${lateFirst}`, key: "route",
        onSettled: (resolution) => settled.push(`c:${resolution.status}`) });
    } });
    const other = queue.enqueue(tasks("other", otherProvider.promise), [
      { root: independent.native, buildTree: tree },
    ], { id: `other-${lateFirst}`, key: "independent" });
    const b = queue.enqueue(tasks("b", Promise.resolve("wrong")), [
      { root: app.native, buildTree: tree },
    ], { id: `b-${lateFirst}`, key: "route",
      onSettled: (resolution) => settled.push(`b:${resolution.status}`) });
    assertEquals([a.status, b.status, c.status, other.status],
      ["cancelled", "cancelled", "pending", "pending"]);
    assertEquals(started, ["a", "other", "c"]);
    assertEquals(b.snapshot().started, []);
    assertEquals(app.text(), "accepted");
    otherProvider.resolve("independent");
    assertEquals((await other.completion).status, "committed");
    assertEquals(independent.text(), "independent");
    if (lateFirst) oldProvider.resolve("stale");
    newestProvider.resolve("winner");
    assertEquals((await c.completion).status, "committed");
    if (!lateFirst) oldProvider.resolve("stale");
    await Promise.resolve();
    assertEquals((await a.completion).status, "cancelled");
    assertEquals((await b.completion).status, "cancelled");
    assertEquals(app.text(), "winner");
    assertEquals(settled, ["a:cancelled", "b:cancelled", "c:committed"]);
    queue.dispose();
    app.native.dispose();
    independent.native.dispose();
  });
}

Deno.test("two nested task replacement callbacks leave only the final provider active", async () => {
  const app = root("reentrant-task-nested");
  const queue = new NativeTaskTransitionQueue();
  const old = deferred(), latest = deferred();
  const started: string[] = [];
  let c!: NativeTaskTransitionHandle, d!: NativeTaskTransitionHandle;
  const add = (id: string, promise: Promise<string>, onSettled?: () => void) =>
    queue.enqueue([asyncTask("value", [], () => { started.push(id); return promise; })] as const,
      [{ root: app.native, buildTree: tree }],
      { id, key: "route", onSettled: () => onSettled?.() });
  const a = add("nested-a", old.promise, () => { c = add("nested-c", Promise.resolve("wrong")); });
  const b = add("nested-b", Promise.resolve("wrong"), () => { d = add("nested-d", latest.promise); });
  assertEquals([a.status, b.status, c.status, d.status],
    ["cancelled", "cancelled", "cancelled", "pending"]);
  assertEquals(started, ["nested-a", "nested-d"]);
  latest.resolve("final");
  assertEquals((await d.completion).status, "committed");
  old.resolve("late");
  await Promise.resolve();
  assertEquals(app.text(), "final");
  queue.dispose();
  app.native.dispose();
});

Deno.test("live selector reentry cancels the outer capture before provider launch", async () => {
  const app = root("reentrant-task-selector");
  const queue = new NativeTaskTransitionQueue();
  const source = createAsyncStore("query");
  const initial = deferred(), latest = deferred();
  const started: string[] = [];
  let c!: NativeTaskTransitionHandle;
  const task = (id: string, promise: Promise<string>) =>
    [asyncTask("value", ["$query"], () => { started.push(id); return promise; })] as const;
  const a = queue.enqueue(task("a", initial.promise), [{ root: app.native, buildTree: tree }],
    { id: "selector-a", key: "route" });
  let selectorCalls = 0;
  const selected = source.select((value) => {
    selectorCalls++;
    c = queue.enqueue(task("c", latest.promise), [{ root: app.native, buildTree: tree }],
      { id: "selector-c", key: "route" });
    return value;
  });
  const b = queue.enqueue(task("b", Promise.resolve("wrong")),
    [{ root: app.native, buildTree: tree }],
    { id: "selector-b", key: "route", liveInputs: { "$query": selected } });
  assertEquals(selectorCalls, 1);
  assertEquals([a.status, b.status, c.status], ["cancelled", "cancelled", "pending"]);
  assertEquals(started, ["a", "c"]);
  assertEquals(b.snapshot().started, []);
  assertEquals(source.diagnostics().listeners, 0);
  assertEquals(app.text(), "accepted");
  latest.resolve("selected-winner");
  assertEquals((await c.completion).status, "committed");
  initial.resolve("stale");
  await Promise.resolve();
  assertEquals(app.text(), "selected-winner");
  queue.dispose();
  app.native.dispose();
  assertEquals(source.diagnostics().listeners, 0);
});

Deno.test("provider startup replacement prevents the outer task tree from publishing", async () => {
  const app = root("reentrant-task-startup");
  const queue = new NativeTaskTransitionQueue();
  const latest = deferred();
  const started: string[] = [];
  let c!: NativeTaskTransitionHandle;
  const a = queue.enqueue([asyncTask("value", [], () => new Promise<string>(() => {}))] as const,
    [{ root: app.native, buildTree: tree }], { id: "startup-a", key: "route" });
  const b = queue.enqueue([asyncTask("value", [], () => {
    started.push("b");
    c = queue.enqueue([asyncTask("value", [], () => {
      started.push("c");
      return latest.promise;
    })] as const, [{ root: app.native, buildTree: tree }],
      { id: "startup-c", key: "route" });
    return "wrong";
  })] as const, [{ root: app.native, buildTree: tree }],
    { id: "startup-b", key: "route" });
  assertEquals([a.status, b.status, c.status], ["cancelled", "cancelled", "pending"]);
  assertEquals(started, ["b", "c"]);
  assertEquals(app.text(), "accepted");
  latest.resolve("startup-winner");
  assertEquals((await c.completion).status, "committed");
  assertEquals(app.text(), "startup-winner");
  queue.dispose();
  app.native.dispose();
});

Deno.test("selector error after reentrant replacement reaches the caller", async () => {
  const app = root("reentrant-selector-error");
  const queue = new NativeTaskTransitionQueue();
  const source = createAsyncStore("query");
  const latest = deferred();
  const originalError = new Error("caller selector failed after replacement");
  let c!: NativeTaskTransitionHandle;
  const selected = source.select(() => {
    c = queue.enqueue([asyncTask("value", [], () => latest.promise)] as const,
      [{ root: app.native, buildTree: tree }], { id: "error-c", key: "route" });
    throw originalError;
  });
  let caught: unknown;
  try {
    queue.enqueue([asyncTask("value", ["$query"], () => "wrong")] as const,
      [{ root: app.native, buildTree: tree }],
      { id: "error-b", key: "route", liveInputs: { "$query": selected } });
  } catch (error) { caught = error; }
  assertEquals(caught, originalError);
  assertEquals(c.status, "pending");
  assertEquals(source.diagnostics().listeners, 0);
  assertEquals(app.text(), "accepted");
  latest.resolve("winner");
  assertEquals((await c.completion).status, "committed");
  assertEquals(app.text(), "winner");
  queue.dispose();
  app.native.dispose();
});

Deno.test("buildTree reentry stops the cancelled outer operation before its next root", async () => {
  const primary = root("reentrant-build-primary");
  const fork = root("reentrant-build-fork");
  const queue = new NativeTaskTransitionQueue();
  const old = deferred(), outer = deferred(), newest = deferred();
  const builds: string[] = [];
  let c!: NativeTaskTransitionHandle;
  const winningRoots = [
    { root: primary.native, buildTree: (execution: any) => {
      builds.push("c:primary");
      return tree(execution);
    } },
    { root: fork.native, buildTree: (execution: any) => {
      builds.push("c:fork");
      return tree(execution);
    } },
  ];
  const roots = (label: string) => [
    { root: primary.native, buildTree: (execution: any) => {
      builds.push(`${label}:primary`);
      if (label === "b") {
        c = queue.enqueue([asyncTask("value", [], () => newest.promise)] as const,
          winningRoots, { id: "build-c", key: "route" });
      }
      return tree(execution);
    } },
    { root: fork.native, buildTree: (execution: any) => {
      builds.push(`${label}:fork`);
      return tree(execution);
    } },
  ];
  const a = queue.enqueue([asyncTask("value", [], () => old.promise)] as const,
    roots("a"), { id: "build-a", key: "route" });
  const b = queue.enqueue([asyncTask("value", [], () => outer.promise)] as const,
    roots("b"), { id: "build-b", key: "route" });
  assertEquals([a.status, b.status, c.status], ["cancelled", "cancelled", "pending"]);
  assertEquals(builds.includes("b:fork"), false);
  assertEquals(primary.text(), "accepted");
  assertEquals(fork.text(), "accepted");
  newest.resolve("winner");
  assertEquals((await c.completion).status, "committed");
  outer.resolve("late-outer"); old.resolve("late-old");
  await Promise.resolve();
  assertEquals(primary.text(), "winner");
  assertEquals(fork.text(), "winner");
  queue.dispose();
  primary.native.dispose();
  fork.native.dispose();
});

Deno.test("same-key enqueue and cancel from A's host writer preserve applying A", async () => {
  class ReentrantHost extends MemoryVDOMHost {
    armed = false;
    onApply?: () => void;
    override setProp(node: MemoryNode, name: string, value: unknown, previous: unknown) {
      super.setProp(node, name, value, previous);
      if (this.armed && name === "data-stage" && value === "A") {
        this.armed = false;
        this.onApply?.();
      }
    }
  }
  const host = new ReentrantHost();
  const app = root("reentrant-applying-task", host);
  const queue = new NativeTaskTransitionQueue();
  const second = deferred();
  const statuses: string[] = [];
  const writer: string[] = [];
  let a!: NativeTaskTransitionHandle;
  let b!: NativeTaskTransitionHandle;
  let firstSignal: AbortSignal | undefined;
  const Stage = defineComponent("reentrant-applying-stage", ({ execution }: any) => {
    const value = String(useAt("value", execution.resource("value")));
    return jsx("b", { "data-stage": value }, value);
  });
  const stageTree = (execution: any) => jsx(Suspense, {
    __nativeBoundarySite: "reentrant-applying-boundary",
    fallback: jsx("i", {}, "loading"),
    children: jsx(Stage, { execution }),
  });
  host.onApply = () => {
    writer.push("entered");
    assertEquals(a.status, "pending");
    assertEquals(a.cancel("too late").status, "pending");
    assertEquals(firstSignal?.aborted, false);
    b = queue.enqueue([asyncTask("value", [], () => second.promise)] as const,
      [{ root: app.native, buildTree: stageTree }],
      { id: "applying-b", key: "route",
        onSettled: ({ status }) => statuses.push(`b:${status}`) });
    assertEquals(a.status, "pending");
    assertEquals(b.status, "pending");
    assertEquals(firstSignal?.aborted, false);
    assertEquals(statuses, []);
    writer.push("left");
  };
  host.armed = true;
  a = queue.enqueue([asyncTask("value", [], (_values, signal) => {
    firstSignal = signal;
    return Promise.resolve("A");
  })] as const, [{ root: app.native, buildTree: stageTree }],
    { id: "applying-a", key: "route",
      onSettled: ({ status }) => statuses.push(`a:${status}`) });
  assertEquals((await a.completion).status, "committed");
  assertEquals(writer, ["entered", "left"]);
  assertEquals(a.status, "committed");
  assertEquals(b.status, "pending");
  assertEquals(app.text(), "A");
  assertEquals(statuses, ["a:committed"]);
  second.resolve("B");
  assertEquals((await b.completion).status, "committed");
  assertEquals(app.text(), "B");
  assertEquals(statuses, ["a:committed", "b:committed"]);
  queue.dispose();
  app.native.dispose();
});

Deno.test("disposing the task queue inside a host writer lets applying A finish", async () => {
  class DisposeHost extends MemoryVDOMHost {
    armed = false;
    onApply?: () => void;
    override setProp(node: MemoryNode, name: string, value: unknown, previous: unknown) {
      super.setProp(node, name, value, previous);
      if (this.armed && name === "data-stage" && value === "A") {
        this.armed = false;
        this.onApply?.();
      }
    }
  }
  const host = new DisposeHost();
  const app = root("reentrant-dispose-applying", host);
  const source = createAsyncStore("query");
  const queue = new NativeTaskTransitionQueue();
  const statuses: string[] = [];
  let a!: NativeTaskTransitionHandle;
  let signalA: AbortSignal | undefined;
  const Stage = defineComponent("reentrant-dispose-stage", ({ execution }: any) => {
    const value = String(useAt("value", execution.resource("value")));
    return jsx("b", { "data-stage": value }, value);
  });
  const stageTree = (execution: any) => jsx(Suspense, {
    __nativeBoundarySite: "reentrant-dispose-boundary",
    fallback: jsx("i", {}, "loading"),
    children: jsx(Stage, { execution }),
  });
  host.onApply = () => {
    assertEquals(a.status, "pending");
    assertEquals(signalA?.aborted, false);
    assertEquals(source.diagnostics().listeners > 0, true);
    queue.dispose();
    assertEquals(a.status, "pending");
    assertEquals(signalA?.aborted, false);
    assertEquals(statuses, []);
    assertThrows(() => queue.enqueue(
      [asyncTask("value", [], () => "wrong")] as const,
      [{ root: app.native, buildTree: stageTree }], { id: "disposed-new" }));
  };
  host.armed = true;
  a = queue.enqueue([asyncTask("value", ["$query"], (_values, signal) => {
    signalA = signal;
    return Promise.resolve("A");
  })] as const, [{ root: app.native, buildTree: stageTree }],
    { id: "dispose-a", key: "route", liveInputs: { "$query": source },
      onSettled: ({ status }) => statuses.push(`a:${status}`) });
  assertEquals((await a.completion).status, "committed");
  assertEquals(statuses, ["a:committed"]);
  assertEquals(app.text(), "A");
  await Promise.resolve();
  assertEquals(source.diagnostics().listeners, 0);
  const nextQueue = new NativeTaskTransitionQueue();
  const next = nextQueue.enqueue([asyncTask("value", [], () => "next")] as const,
    [{ root: app.native, buildTree: stageTree }], { id: "after-dispose" });
  assertEquals((await next.completion).status, "committed");
  assertEquals(app.text(), "next");
  nextQueue.dispose();
  app.native.dispose();
  assertEquals(source.diagnostics().listeners, 0);
});
