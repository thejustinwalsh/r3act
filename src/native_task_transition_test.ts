import { assertEquals, assertThrows } from "jsr:@std/assert";
import { asyncTask } from "./async_task_plan.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import {
  ComponentStateRoot,
  defineComponent,
  Suspense,
  useAt,
  useEffectAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { NativeTaskTransitionQueue } from "./native_task_transition.ts";
import { jsx, type RuntimeNode } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");
const harness = (id: string) => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: id,
    scheduleCommit: () => {},
    renderPreparation: "repeatable",
  });
  return { root, container, text: () => container.children.map(text).join("") };
};
const boundary = (child: RuntimeNode) =>
  jsx(Suspense, {
    __nativeBoundarySite: "task-boundary",
    fallback: jsx("i", {}, "loading"),
    children: child,
  });

Deno.test("task transition declines before undeclared providers and builders", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const queue = new NativeTaskTransitionQueue();
  let providers = 0, builders = 0;
  const tasks = [asyncTask("value", [], () => { providers++; return "ready"; })] as const;
  assertThrows(() => queue.enqueue(tasks, [{
    root, buildTree: () => { builders++; return jsx("i", {}, "ready"); },
  }]), Error, "requires repeatable render preparation");
  assertEquals([providers, builders], [0, 0]);
  assertEquals(container.children.length, 0);
  queue.dispose();
  root.dispose();
});

Deno.test("task transition shares one execution across equal cuts and commits after true fan-in", async () => {
  const app = harness("task-transition-fanin");
  const secondApp = harness("task-transition-fanin-second");
  const first = deferred<string>(), second = deferred<string>();
  let runs = 0;
  const tasks = [
    asyncTask("left", ["$query"], () => {
      runs++;
      return first.promise;
    }),
    asyncTask("right", ["$query"], () => {
      runs++;
      return second.promise;
    }),
    asyncTask(
      "joined",
      ["left", "right"],
      (values) =>
        String(values.get("left")) + ":" + String(values.get("right")),
    ),
  ] as const;
  const View = defineComponent(
    "task-transition-view",
    ({ execution }: any) =>
      jsx("b", {}, useAt("joined", execution.resource("joined")) as string),
  );
  const queue = new NativeTaskTransitionQueue();
  const handle = queue.enqueue(tasks, [{
    root: app.root,
    buildTree: (execution) => boundary(jsx(View, { execution })),
  }, {
    root: secondApp.root,
    buildTree: (execution) => boundary(jsx(View, { execution })),
  }], { inputs: { "$query": "same" } });
  assertEquals(runs, 2);
  assertEquals(app.text(), "");
  first.resolve("A");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assertEquals(app.text(), "");
  second.resolve("B");
  assertEquals((await handle.completion).status, "committed");
  assertEquals(app.text(), "A:B");
  assertEquals(secondApp.text(), "A:B");
  queue.dispose();
  app.root.dispose();
  secondApp.root.dispose();
});

Deno.test("live task input restart ignores late non-cooperative results and reuses unaffected output", async () => {
  const app = harness("task-transition-live");
  const query = createAsyncStore("old");
  const old = deferred<string>();
  const started: string[] = [];
  const tasks = [
    asyncTask("search", ["$query"], (_values, _signal) => {
      started.push("search");
      return started.length === 1 ? old.promise : "new-result";
    }),
    asyncTask("catalog", ["$locale"], () => {
      started.push("catalog");
      return "en";
    }),
  ] as const;
  const View = defineComponent(
    "task-transition-live-view",
    ({ execution }: any) =>
      jsx("b", {}, String(useAt("search", execution.resource("search")))),
  );
  const queue = new NativeTaskTransitionQueue();
  const handle = queue.enqueue(tasks, [{
    root: app.root,
    buildTree: (execution) => boundary(jsx(View, { execution })),
  }], {
    inputs: { "$locale": "en" },
    liveInputs: { "$query": query },
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assertEquals(started, ["search", "catalog"]);
  query.dispatch("new");
  await Promise.resolve();
  assertEquals(started, ["search", "catalog", "search"]);
  old.resolve("stale");
  await Promise.resolve();
  assertEquals(app.text(), "new-result");
  assertEquals((await handle.completion).status, "committed");
  assertEquals(app.text(), "new-result");
  assertEquals(handle.snapshot().reused, ["catalog"]);
  assertEquals(query.diagnostics().listeners, 0);
  queue.dispose();
  app.root.dispose();
});

Deno.test("same selected live value refreshes its cut without restarting tasks", async () => {
  const app = harness("task-transition-same-selector");
  const source = createAsyncStore({ selected: "one", noise: 0 });
  const selected = source.select((state) => state.selected);
  const ready = deferred<string>();
  let runs = 0;
  const tasks = [asyncTask("load", ["$selected"], () => {
    runs++;
    return runs === 1 ? ready.promise : "second";
  })] as const;
  const View = defineComponent(
    "task-transition-selector-view",
    ({ execution }: any) =>
      jsx("b", {}, useAt("load", execution.resource("load")) as string),
  );
  const queue = new NativeTaskTransitionQueue();
  const handle = queue.enqueue(tasks, [{
    root: app.root,
    buildTree: (execution) => boundary(jsx(View, { execution })),
  }], { liveInputs: { "$selected": selected } });
  source.dispatch({ selected: "one", noise: 1 });
  assertEquals(runs, 1);
  source.dispatch({ selected: "two", noise: 1 });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assertEquals(runs, 2);
  assertEquals((await handle.completion).status, "committed");
  assertEquals(app.text(), "second");
  ready.resolve("stale");
  queue.dispose();
  app.root.dispose();
});

Deno.test("roots with different live projections receive distinct task executions", async () => {
  const left = harness("task-transition-projection-left");
  const right = harness("task-transition-projection-right");
  const store = createAsyncStore("old");
  store.beginTransition("project", [left.root.rootId, right.root.rootId]);
  store.dispatch("new", { kind: "transition", transitionId: "project" });
  store.commitTransitionRoots("project", [right.root.rootId], { finish: true });
  let providers = 0;
  const tasks = [asyncTask("value", ["$query"], (values) => {
    providers++;
    return values.get("$query");
  })] as const;
  const View = defineComponent(
    "task-transition-projection-view",
    ({ execution }: any) =>
      jsx("b", {}, String(useAt("value", execution.resource("value")))),
  );
  const queue = new NativeTaskTransitionQueue();
  const handle = queue.enqueue(tasks, [{
    root: left.root,
    buildTree: (execution) => boundary(jsx(View, { execution })),
  }, {
    root: right.root,
    buildTree: (execution) => boundary(jsx(View, { execution })),
  }], {
    liveInputs: { "$query": store },
  });
  assertEquals(providers, 2);
  assertEquals((await handle.completion).status, "committed");
  assertEquals(left.text(), "old");
  assertEquals(right.text(), "new");
  queue.dispose();
  left.root.dispose();
  right.root.dispose();
});

Deno.test("one grouped generation publishes neither root until both are ready; observers see both", async () => {
  const left = harness("task-transition-atomic-left");
  const right = harness("task-transition-atomic-right");
  const query = createAsyncStore("old");
  query.beginTransition("query-projection", [
    left.root.rootId,
    right.root.rootId,
  ]);
  query.dispatch("new", {
    kind: "transition",
    transitionId: "query-projection",
  });
  query.commitTransitionRoots("query-projection", [right.root.rootId], {
    finish: true,
  });
  const leftData = createAsyncStore("left-ready");
  const rightData = createAsyncStore("right-ready");
  for (const store of [leftData, rightData]) {
    store.beginTransition("publish", [left.root.rootId, right.root.rootId]);
    store.dispatch(store === leftData ? "left-visible" : "right-visible", {
      kind: "transition",
      transitionId: "publish",
    });
  }
  const leftResult = deferred<string>(), rightResult = deferred<string>();
  const tasks = [
    asyncTask(
      "load",
      ["$query"],
      (values) =>
        values.get("$query") === "old"
          ? leftResult.promise
          : rightResult.promise,
    ),
  ] as const;
  const observed: string[][] = [];
  const subscribe = (label: string) => () =>
    observed.push([label, left.text(), right.text()]);
  const unsubs = [
    leftData.subscribe(left.root.rootId, subscribe("left-store")),
    rightData.subscribe(right.root.rootId, subscribe("right-store")),
  ];
  const Left = defineComponent(
    "task-transition-atomic-view-left",
    ({ execution }: any) => {
      const value = useStoreAt("value", leftData);
      useEffectAt("effect", () => {
        observed.push(["left-effect", left.text(), right.text()]);
      });
      return jsx(
        "b",
        {},
        String(value) + ":" + String(useAt("load", execution.resource("load"))),
      );
    },
  );
  const Right = defineComponent(
    "task-transition-atomic-view-right",
    ({ execution }: any) => {
      const value = useStoreAt("value", rightData);
      useEffectAt("effect", () => {
        observed.push(["right-effect", left.text(), right.text()]);
      });
      return jsx(
        "b",
        {},
        String(value) + ":" + String(useAt("load", execution.resource("load"))),
      );
    },
  );
  const queue = new NativeTaskTransitionQueue();
  const handle = queue.enqueue(tasks, [{
    root: left.root,
    buildTree: (execution) => boundary(jsx(Left, { execution })),
  }, {
    root: right.root,
    buildTree: (execution) => boundary(jsx(Right, { execution })),
  }], {
    liveInputs: { "$query": query },
    transitions: ["publish"],
    finishTransitions: true,
  });
  assertEquals(left.text(), "");
  assertEquals(right.text(), "");
  leftResult.resolve("L");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assertEquals(left.text(), "");
  assertEquals(right.text(), "");
  rightResult.resolve("R");
  assertEquals((await handle.completion).status, "committed");
  assertEquals(left.text(), "left-visible:L");
  assertEquals(right.text(), "right-visible:R");
  assertEquals(observed.length > 0, true);
  for (const entry of observed) {
    assertEquals(entry.slice(1), ["left-visible:L", "right-visible:R"]);
  }
  for (const unsubscribe of unsubs) unsubscribe();
  queue.dispose();
  left.root.dispose();
  right.root.dispose();
});

Deno.test("live restart reuses only outputs from the changed root's prior input group", async () => {
  const left = harness("task-transition-reuse-left");
  const right = harness("task-transition-reuse-right");
  const query = createAsyncStore("old");
  query.beginTransition("q1", [left.root.rootId, right.root.rootId]);
  query.dispatch("new", { kind: "transition", transitionId: "q1" });
  query.commitTransitionRoots("q1", [right.root.rootId], { finish: true });
  let headerRuns = 0;
  const searchRuns: string[] = [];
  const oldSearch = deferred<string>(),
    newSearch = deferred<string>(),
    latestSearch = deferred<string>();
  const tasks = [
    asyncTask("header", ["$locale"], () => {
      headerRuns++;
      return "header";
    }),
    asyncTask("search", ["$query"], (values) => {
      const value = String(values.get("$query"));
      searchRuns.push(value);
      if (value === "old") return oldSearch.promise.then(() => "search-old");
      if (value === "new") return newSearch.promise.then(() => "search-new");
      return latestSearch.promise.then(() => "search-latest");
    }),
  ] as const;
  const View = defineComponent(
    "task-transition-group-reuse-view",
    ({ execution }: any) =>
      jsx(
        "b",
        {},
        String(useAt("header", execution.resource("header"))) + ":" +
          String(useAt("search", execution.resource("search"))),
      ),
  );
  const roots = [{
    root: left.root,
    buildTree: (execution: any) => boundary(jsx(View, { execution })),
  }, {
    root: right.root,
    buildTree: (execution: any) => boundary(jsx(View, { execution })),
  }];
  const queue = new NativeTaskTransitionQueue();
  const operation = queue.enqueue(tasks, roots, {
    inputs: { "$locale": "en" },
    liveInputs: { "$query": query },
  });
  assertEquals(searchRuns, ["old", "new"]);
  newSearch.resolve("new-ready");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assertEquals([left.text(), right.text()], ["", ""]);
  assertEquals(headerRuns, 2);

  query.beginTransition("q2", [left.root.rootId, right.root.rootId]);
  query.dispatch("latest", { kind: "transition", transitionId: "q2" });
  query.commitTransitionRoots("q2", [left.root.rootId], { finish: true });
  assertEquals(searchRuns, ["old", "new", "latest"]);
  oldSearch.resolve("stale");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assertEquals([left.text(), right.text()], ["", ""]);
  latestSearch.resolve("latest-ready");
  assertEquals((await operation.completion).status, "committed");
  assertEquals([left.text(), right.text()], [
    "header:search-latest",
    "header:search-new",
  ]);
  assertEquals(headerRuns, 2);
  assertEquals(searchRuns, ["old", "new", "latest"]);
  queue.dispose();
  left.root.dispose();
  right.root.dispose();
});

Deno.test("overlapping operations coexist; root disposal cancels only its own operation", async () => {
  const a = harness("task-transition-overlap-a"),
    b = harness("task-transition-overlap-b");
  const slow = deferred<string>(), fast = deferred<string>();
  const tasksA = [asyncTask("a", [], () => slow.promise)] as const;
  const tasksB = [asyncTask("b", [], () => fast.promise)] as const;
  const ViewA = defineComponent(
    "task-overlap-a",
    ({ execution }: any) =>
      jsx("b", {}, useAt("a", execution.resource("a")) as string),
  );
  const ViewB = defineComponent(
    "task-overlap-b",
    ({ execution }: any) =>
      jsx("b", {}, useAt("b", execution.resource("b")) as string),
  );
  const queue = new NativeTaskTransitionQueue();
  const one = queue.enqueue(tasksA, [{
    root: a.root,
    buildTree: (execution) => boundary(jsx(ViewA, { execution })),
  }]);
  const two = queue.enqueue(tasksB, [{
    root: b.root,
    buildTree: (execution) => boundary(jsx(ViewB, { execution })),
  }]);
  a.root.dispose();
  assertEquals((await one.completion).status, "cancelled");
  fast.resolve("two");
  assertEquals((await two.completion).status, "committed");
  assertEquals(b.text(), "two");
  slow.resolve("ignored");
  queue.dispose();
  b.root.dispose();
});

Deno.test("captures authored tasks and immutable input values at enqueue", async () => {
  const app = harness("task-transition-snapshots");
  const input = { "$query": "before" };
  const called: string[] = [];
  const tasks = [
    asyncTask("load", ["$query"], (values) => {
      called.push(String(values.get("$query")));
      return String(values.get("$query"));
    }),
  ] as const;
  const View = defineComponent(
    "task-transition-snapshot-view",
    ({ execution }: any) =>
      jsx("b", {}, String(useAt("load", execution.resource("load")))),
  );
  const queue = new NativeTaskTransitionQueue();
  const handle = queue.enqueue(tasks, [{
    root: app.root,
    buildTree: (execution) => boundary(jsx(View, { execution })),
  }], { id: "snapshot-op", inputs: input });
  input["$query"] = "after";
  assertThrows(() =>
    queue.enqueue(tasks, [{
      root: app.root,
      buildTree: (execution) => boundary(jsx(View, { execution })),
    }], { id: "snapshot-op", inputs: { "$query": "duplicate" } })
  );
  assertEquals((await handle.completion).status, "committed");
  assertEquals(called, ["before"]);
  assertEquals(app.text(), "before");
  queue.dispose();
  app.root.dispose();
});

Deno.test("captures reserved immutable and live input keys as ordinary bindings", async () => {
  const app = harness("task-transition-reserved-keys");
  const liveStore = createAsyncStore("live-value");
  const inputs = Object.fromEntries([
    ["__proto__", "immutable-value"],
    ["constructor", "constructor-value"],
  ]);
  const tasks = [asyncTask(
    "load",
    ["__proto__", "constructor"],
    (values) => `${values.get("__proto__")}:${values.get("constructor")}`,
  )] as const;
  const View = defineComponent(
    "task-transition-reserved-keys-view",
    ({ execution }: any) =>
      jsx("b", {}, String(useAt("load", execution.resource("load")))),
  );
  const queue = new NativeTaskTransitionQueue();
  const handle = queue.enqueue(tasks, [{
    root: app.root,
    buildTree: (execution) => boundary(jsx(View, { execution })),
  }], { inputs });
  assertEquals((await handle.completion).status, "committed");
  assertEquals(app.text(), "immutable-value:constructor-value");
  const liveApp = harness("task-transition-live-reserved-key");
  const liveInputs = Object.fromEntries([["__proto__", liveStore]]);
  const liveTask = [
    asyncTask(
      "live",
      ["__proto__"],
      (values) => String(values.get("__proto__")),
    ),
  ] as const;
  const liveView = defineComponent(
    "task-transition-live-reserved-key-view",
    ({ execution }: any) =>
      jsx("b", {}, String(useAt("live", execution.resource("live")))),
  );
  const liveHandle = queue.enqueue(liveTask, [{
    root: liveApp.root,
    buildTree: (execution) => boundary(jsx(liveView, { execution })),
  }], { liveInputs });
  assertEquals((await liveHandle.completion).status, "committed");
  assertEquals(liveApp.text(), "live-value");
  queue.dispose();
  app.root.dispose();
  liveApp.root.dispose();
});

Deno.test("initial multi-root capture retries the entire cohort before starting tasks", async () => {
  const left = harness("task-transition-initial-cut-left");
  const right = harness("task-transition-initial-cut-right");
  const store = createAsyncStore("before");
  let reads = 0;
  let injected = false;
  const query = store.select((value) => {
    reads++;
    if (!injected && reads === 2) {
      injected = true;
      store.dispatch("after");
    }
    return value;
  });
  const started: string[] = [];
  const tasks = [asyncTask("load", ["$query"], (values) => {
    const value = String(values.get("$query"));
    started.push(value);
    return value;
  })] as const;
  const View = defineComponent(
    "task-transition-initial-cut-view",
    ({ execution }: any) =>
      jsx("b", {}, String(useAt("load", execution.resource("load")))),
  );
  const queue = new NativeTaskTransitionQueue();
  const handle = queue.enqueue(tasks, [{
    root: left.root,
    buildTree: (execution) => boundary(jsx(View, { execution })),
  }, {
    root: right.root,
    buildTree: (execution) => boundary(jsx(View, { execution })),
  }], { liveInputs: { "$query": query } });
  assertEquals(started, ["after"]);
  assertEquals((await handle.completion).status, "committed");
  assertEquals([left.text(), right.text()], ["after", "after"]);
  queue.dispose();
  left.root.dispose();
  right.root.dispose();
});

Deno.test("explicit operation keys replace prior work; unkeyed overlap remains independent", async () => {
  const app = harness("task-transition-explicit-key");
  const replaced = deferred<string>(),
    independent = deferred<string>(),
    latest = deferred<string>();
  const View = defineComponent(
    "task-transition-key-view",
    ({ execution, taskId }: any) =>
      jsx("b", {}, String(useAt("value", execution.resource(taskId)))),
  );
  const queue = new NativeTaskTransitionQueue();
  const old = queue.enqueue(
    [asyncTask("old", [], () => replaced.promise)] as const,
    [{
      root: app.root,
      buildTree: (execution) =>
        boundary(jsx(View, { execution, taskId: "old" })),
    }],
    { key: "navigation" },
  );
  const other = queue.enqueue(
    [asyncTask("other", [], () => independent.promise)] as const,
    [{
      root: app.root,
      buildTree: (execution) =>
        boundary(jsx(View, { execution, taskId: "other" })),
    }],
  );
  const current = queue.enqueue(
    [asyncTask("current", [], () => latest.promise)] as const,
    [{
      root: app.root,
      buildTree: (execution) =>
        boundary(jsx(View, { execution, taskId: "current" })),
    }],
    { key: "navigation" },
  );
  assertEquals((await old.completion).status, "cancelled");
  independent.resolve("independent");
  assertEquals((await other.completion).status, "committed");
  latest.resolve("current");
  assertEquals((await current.completion).status, "committed");
  assertEquals(app.text(), "current");
  replaced.resolve("stale");
  queue.dispose();
  app.root.dispose();
});

Deno.test("cancellation aborts providers and releases task-only store subscriptions", async () => {
  const app = harness("task-transition-cancel-cleanup");
  const store = createAsyncStore("query");
  let signal: AbortSignal | undefined;
  const tasks = [asyncTask("load", ["$query"], (_values, activeSignal) => {
    signal = activeSignal;
    return new Promise<string>(() => {});
  })] as const;
  const View = defineComponent(
    "task-transition-cancel-view",
    ({ execution }: any) =>
      jsx("b", {}, String(useAt("load", execution.resource("load")))),
  );
  const queue = new NativeTaskTransitionQueue();
  const handle = queue.enqueue(tasks, [{
    root: app.root,
    buildTree: (execution) => boundary(jsx(View, { execution })),
  }], { liveInputs: { "$query": store } });
  assertEquals(store.diagnostics().listeners > 0, true);
  handle.cancel("cancel test");
  assertEquals((await handle.completion).status, "cancelled");
  assertEquals(signal?.aborted, true);
  assertEquals(store.diagnostics().listeners, 0);
  queue.dispose();
  app.root.dispose();
});

Deno.test("hidden task prewarm continues after its visible root commits", async () => {
  const app = harness("task-transition-prewarm");
  const prewarm = deferred<string>();
  let prewarmFinished = false;
  const tasks = [
    asyncTask("visible", [], () => "ready"),
    asyncTask("prewarm", [], () =>
      prewarm.promise.then((value) => {
        prewarmFinished = true;
        return value;
      })),
  ] as const;
  const View = defineComponent(
    "task-transition-prewarm-view",
    ({ execution }: any) =>
      jsx("b", {}, String(useAt("visible", execution.resource("visible")))),
  );
  const queue = new NativeTaskTransitionQueue();
  const handle = queue.enqueue(tasks, [{
    root: app.root,
    buildTree: (execution) => boundary(jsx(View, { execution })),
  }]);
  assertEquals((await handle.completion).status, "committed");
  assertEquals(app.text(), "ready");
  assertEquals(prewarmFinished, false);
  prewarm.resolve("warm");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assertEquals(prewarmFinished, true);
  queue.dispose();
  app.root.dispose();
});

Deno.test("committed prewarm is cancelled only after its last interested root detaches", async () => {
  const left = harness("task-transition-prewarm-owner-left");
  const right = harness("task-transition-prewarm-owner-right");
  const pending = deferred<string>();
  let signal: AbortSignal | undefined;
  const tasks = [
    asyncTask("visible", [], () => "ready"),
    asyncTask("prewarm", [], (_values, activeSignal) => {
      signal = activeSignal;
      return pending.promise;
    }),
  ] as const;
  const View = defineComponent(
    "task-transition-prewarm-owner-view",
    ({ execution }: any) =>
      jsx("b", {}, String(useAt("visible", execution.resource("visible")))),
  );
  const queue = new NativeTaskTransitionQueue();
  const handle = queue.enqueue(tasks, [{
    root: left.root,
    buildTree: (execution) => boundary(jsx(View, { execution })),
  }, {
    root: right.root,
    buildTree: (execution) => boundary(jsx(View, { execution })),
  }]);
  assertEquals((await handle.completion).status, "committed");
  assertEquals(left.text(), "ready");
  assertEquals(right.text(), "ready");
  left.root.dispose();
  assertEquals(signal?.aborted, false);
  right.root.dispose();
  assertEquals(signal?.aborted, true);
  pending.resolve("late");
  queue.dispose();
});

Deno.test("unrelated store notifications do not restart declared task inputs", async () => {
  const app = harness("task-transition-unrelated-store");
  const query = createAsyncStore("query");
  const noise = createAsyncStore(0);
  const pending = deferred<string>();
  let runs = 0;
  const tasks = [asyncTask("load", ["$query"], () => {
    runs++;
    return pending.promise;
  })] as const;
  const View = defineComponent(
    "task-transition-unrelated-view",
    ({ execution }: any) =>
      jsx("b", {}, String(useAt("load", execution.resource("load")))),
  );
  const queue = new NativeTaskTransitionQueue();
  const handle = queue.enqueue(tasks, [{
    root: app.root,
    buildTree: (execution) => boundary(jsx(View, { execution })),
  }], { liveInputs: { "$query": query } });
  noise.subscribe(app.root.rootId, () => {});
  noise.dispatch(1);
  await Promise.resolve();
  assertEquals(runs, 1);
  pending.resolve("ok");
  assertEquals((await handle.completion).status, "committed");
  queue.dispose();
  app.root.dispose();
});

Deno.test("input notifications arriving during a recapture are drained instead of dropped", async () => {
  const app = harness("task-transition-reentrant-refresh");
  const store = createAsyncStore("old");
  let injectFinal = false;
  const source = store.select((value) => {
    if (injectFinal) {
      injectFinal = false;
      store.dispatch("final");
    }
    return value;
  });
  const starts: string[] = [];
  const tasks = [asyncTask("load", ["$query"], (values) => {
    const value = String(values.get("$query"));
    starts.push(value);
    return value === "old" ? new Promise<string>(() => {}) : "loaded-" + value;
  })] as const;
  const View = defineComponent(
    "task-transition-reentrant-view",
    ({ execution }: any) =>
      jsx("b", {}, String(useAt("load", execution.resource("load")))),
  );
  const queue = new NativeTaskTransitionQueue();
  const handle = queue.enqueue(tasks, [{
    root: app.root,
    buildTree: (execution) => boundary(jsx(View, { execution })),
  }], { liveInputs: { "$query": source } });
  injectFinal = true;
  store.dispatch("intermediate");
  assertEquals((await handle.completion).status, "committed");
  assertEquals(starts, ["old", "final"]);
  assertEquals(app.text(), "loaded-final");
  queue.dispose();
  app.root.dispose();
});
