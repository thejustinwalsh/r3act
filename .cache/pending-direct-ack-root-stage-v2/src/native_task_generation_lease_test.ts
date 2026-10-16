import { assertEquals } from "jsr:@std/assert";
import { asyncTask } from "./async_task_plan.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import {
  ComponentStateRoot,
  defineComponent,
  Suspense,
  useAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { NativeTaskTransitionQueue } from "./native_task_transition.ts";
import { jsx } from "./jsx_binding_runtime.ts";
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
  });
  return { root, container, text: () => container.children.map(text).join("") };
};

Deno.test("task generation replacement retains pending-only publication store scopes", async () => {
  const app = harness("task-generation-pending-lease");
  app.root.mount(jsx("i", {}, "startup"));
  const query = createAsyncStore("old");
  const signal = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  const oldResult = deferred<string>();
  const started: string[] = [];
  const tasks = [asyncTask("load", ["$query"], (values) => {
    const value = String(values.get("$query"));
    started.push(value);
    return value === "old" ? oldResult.promise : `ready-${value}`;
  })] as const;
  const View = defineComponent(
    "task-generation-pending-lease-view",
    (
      { execution }: {
        execution: import("./native_task_execution.ts").NativeTaskExecution<
          typeof tasks
        >;
      },
    ) => {
      const version = useStoreAt("publication-signal", signal);
      return jsx(
        "b",
        {},
        `${version}:${useAt("generation-result", execution.resource("load"))}`,
      );
    },
  );
  const publicationScope = "task-generation-publication-scope";
  const queryScope = "task-generation-query-scope";
  signal.beginTransition(publicationScope, [app.root.rootId]);
  signal.dispatch(1, { kind: "transition", transitionId: publicationScope });
  query.beginTransition(queryScope, [app.root.rootId]);

  const observations: Array<[string, number]> = [];
  const observe = () =>
    observations.push([
      app.text(),
      signal.getStateForRoot(app.root.rootId),
    ]);
  const externalUnsubscribes = [
    signal.subscribe(app.root.rootId, observe),
    signal.subscribe(app.root.rootId, observe),
  ];
  const queue = new NativeTaskTransitionQueue();
  const handle = queue.enqueue(tasks, [{
    root: app.root,
    buildTree: (execution) =>
      jsx(Suspense, {
        __nativeBoundarySite: "task-generation-pending-lease-boundary",
        fallback: jsx("i", {}, "waiting"),
        children: jsx(View, { execution }),
      }),
  }], {
    liveInputs: { "$query": query },
    transitions: [publicationScope, queryScope],
    finishTransitions: true,
  });
  assertEquals(started, ["old"]);
  assertEquals(app.text(), "startup");
  assertEquals(signal.getStateForRoot(app.root.rootId), 0);
  assertEquals(signal.diagnostics().readers, 0);
  assertEquals(signal.diagnostics().listeners > 2, true);
  assertEquals([...signal.transitionRoots(publicationScope)], [
    app.root.rootId,
  ]);

  query.dispatch("new", { kind: "transition", transitionId: queryScope });
  assertEquals(started, ["old", "new"]);
  assertEquals(app.text(), "startup");
  // Generation replacement must keep the first pending candidate's store
  // scope attached until the replacement candidate retains the same store.
  assertEquals([...signal.transitionRoots(publicationScope)], [
    app.root.rootId,
  ]);

  oldResult.resolve("stale-old-result");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assertEquals(app.text(), "1:ready-new");
  assertEquals((await handle.completion).status, "committed");
  assertEquals(app.text(), "1:ready-new");
  assertEquals(signal.getStateForRoot(app.root.rootId), 1);
  assertEquals(query.getStateForRoot(app.root.rootId), "new");
  assertEquals(signal.diagnostics().readers, 1);
  assertEquals(signal.diagnostics().transitions, 0);
  assertEquals(query.diagnostics().transitions, 0);
  assertEquals(signal.diagnostics().retainedActions, 0);
  assertEquals(query.diagnostics().retainedActions, 0);
  assertEquals(observations.length > 0, true);
  for (const observation of observations) {
    assertEquals(observation, ["1:ready-new", 1]);
  }

  oldResult.resolve("too-late");
  for (const unsubscribe of externalUnsubscribes) unsubscribe();
  queue.dispose();
  app.root.dispose();
  for (const store of [signal, query]) {
    assertEquals([
      store.diagnostics().roots,
      store.diagnostics().readers,
      store.diagnostics().listeners,
      store.diagnostics().transitions,
      store.diagnostics().retainedActions,
    ], [0, 0, 0, 0, 0]);
  }
});

Deno.test("same-generation refresh finishes scopes read only before the error branch", async () => {
  const app = harness("task-generation-error-lease");
  app.root.mount(jsx("i", {}, "startup"));
  const source = createAsyncStore({ selected: "old", noise: 0 });
  const query = source.select((state) => state.selected);
  const signal = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  const pending = deferred<string>();
  const taskRuns: string[] = [];
  const tasks = [asyncTask("load", ["$query"], (values) => {
    taskRuns.push(String(values.get("$query")));
    return pending.promise;
  })] as const;
  const View = defineComponent(
    "task-generation-error-primary",
    (
      { execution }: {
        execution: import("./native_task_execution.ts").NativeTaskExecution<
          typeof tasks
        >;
      },
    ) => {
      const version = useStoreAt("error-publication-signal", signal);
      return jsx(
        "b",
        {},
        `${version}:${
          useAt("error-generation-result", execution.resource("load"))
        }`,
      );
    },
  );
  const publicationScope = "task-generation-error-publication";
  const queryScope = "task-generation-error-query";
  signal.beginTransition(publicationScope, [app.root.rootId]);
  signal.dispatch(1, { kind: "transition", transitionId: publicationScope });
  source.beginTransition(queryScope, [app.root.rootId]);
  const observations: string[] = [];
  const externalUnsubscribes = [
    signal.subscribe(app.root.rootId, () => observations.push(app.text())),
    signal.subscribe(app.root.rootId, () => observations.push(app.text())),
  ];
  const queue = new NativeTaskTransitionQueue();
  const handle = queue.enqueue(tasks, [{
    root: app.root,
    buildTree: (execution) =>
      jsx(Suspense, {
        __nativeBoundarySite: "task-generation-error-boundary",
        fallback: jsx("i", {}, "waiting"),
        error: () => jsx("strong", {}, "load-failed"),
        children: jsx(View, { execution }),
      }),
  }], {
    liveInputs: { "$query": query },
    transitions: [publicationScope, queryScope],
    finishTransitions: true,
  });
  assertEquals(taskRuns, ["old"]);
  assertEquals(signal.diagnostics().readers, 0);
  assertEquals([...signal.transitionRoots(publicationScope)], [
    app.root.rootId,
  ]);
  const generation = handle.snapshot().generation;

  // This changes the source store version, but not the selected task input.
  // The native work refreshes in place and keeps its execution generation.
  source.dispatch({ selected: "old", noise: 1 });
  assertEquals(taskRuns, ["old"]);
  assertEquals(handle.snapshot().generation, generation);
  assertEquals([...signal.transitionRoots(publicationScope)], [
    app.root.rootId,
  ]);
  pending.reject(new Error("expected task failure"));
  assertEquals((await handle.completion).status, "committed");
  assertEquals(app.text(), "load-failed");
  assertEquals(signal.getStateForRoot(app.root.rootId), 1);
  assertEquals(signal.diagnostics().readers, 0);
  assertEquals(signal.diagnostics().transitions, 0);
  assertEquals(signal.diagnostics().retainedActions, 0);
  assertEquals(source.diagnostics().transitions, 0);
  assertEquals(source.diagnostics().retainedActions, 0);
  assertEquals(observations.length > 0, true);
  for (const observation of observations) {
    assertEquals(observation, "load-failed");
  }

  for (const unsubscribe of externalUnsubscribes) unsubscribe();
  queue.dispose();
  app.root.dispose();
  for (const store of [signal, source]) {
    assertEquals([
      store.diagnostics().roots,
      store.diagnostics().readers,
      store.diagnostics().listeners,
      store.diagnostics().transitions,
      store.diagnostics().retainedActions,
    ], [0, 0, 0, 0, 0]);
  }
});

Deno.test("cancel after generation replacement releases transferred store holds", async () => {
  const app = harness("task-generation-cancel-lease");
  app.root.mount(jsx("i", {}, "startup"));
  const query = createAsyncStore("old");
  const signal = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  const oldResult = deferred<string>();
  const latestResult = deferred<string>();
  const tasks = [
    asyncTask(
      "load",
      ["$query"],
      (values) =>
        String(values.get("$query")) === "old"
          ? oldResult.promise
          : latestResult.promise,
    ),
  ] as const;
  const View = defineComponent(
    "task-generation-cancel-view",
    (
      { execution }: {
        execution: import("./native_task_execution.ts").NativeTaskExecution<
          typeof tasks
        >;
      },
    ) => {
      const version = useStoreAt("cancel-publication-signal", signal);
      return jsx(
        "b",
        {},
        `${version}:${
          useAt("cancel-generation-result", execution.resource("load"))
        }`,
      );
    },
  );
  const publicationScope = "task-generation-cancel-publication";
  const queryScope = "task-generation-cancel-query";
  signal.beginTransition(publicationScope, [app.root.rootId]);
  signal.dispatch(1, { kind: "transition", transitionId: publicationScope });
  query.beginTransition(queryScope, [app.root.rootId]);
  const externalUnsubscribe = signal.subscribe(app.root.rootId, () => {});
  const queue = new NativeTaskTransitionQueue();
  const handle = queue.enqueue(tasks, [{
    root: app.root,
    buildTree: (execution) =>
      jsx(Suspense, {
        __nativeBoundarySite: "task-generation-cancel-boundary",
        fallback: jsx("i", {}, "waiting"),
        children: jsx(View, { execution }),
      }),
  }], {
    liveInputs: { "$query": query },
    transitions: [publicationScope, queryScope],
    finishTransitions: true,
  });
  query.dispatch("new", { kind: "transition", transitionId: queryScope });
  assertEquals([...signal.transitionRoots(publicationScope)], [
    app.root.rootId,
  ]);
  assertEquals(signal.diagnostics().listeners > 1, true);

  handle.cancel("explicit generation cancellation");
  assertEquals((await handle.completion).status, "cancelled");
  assertEquals(signal.diagnostics().listeners, 0);
  assertEquals(query.diagnostics().listeners, 0);
  // Store action scopes are caller-owned; close them after operation cleanup.
  signal.finishTransition(publicationScope);
  query.finishTransition(queryScope);
  externalUnsubscribe();
  queue.dispose();
  app.root.dispose();
  for (const store of [signal, query]) {
    assertEquals([
      store.diagnostics().roots,
      store.diagnostics().readers,
      store.diagnostics().listeners,
      store.diagnostics().transitions,
      store.diagnostics().retainedActions,
    ], [0, 0, 0, 0, 0]);
  }
  oldResult.resolve("ignored-old");
  latestResult.resolve("ignored-latest");
});

Deno.test("repeated task generations keep one aggregate dependency lease", async () => {
  const app = harness("task-generation-bounded-leases");
  app.root.mount(jsx("i", {}, "startup"));
  const query = createAsyncStore("0");
  const signal = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  const originalHold = app.root.holdStoreDependencies.bind(app.root);
  const activeHolds = new Set<symbol>();
  let peakHolds = 0;
  app.root.holdStoreDependencies = (stores) => {
    const release = originalHold(stores);
    const id = Symbol("tracked-root-store-hold");
    activeHolds.add(id);
    peakHolds = Math.max(peakHolds, activeHolds.size);
    return () => {
      if (activeHolds.delete(id)) release();
    };
  };
  const results: Array<ReturnType<typeof deferred<string>>> = [];
  const tasks = [asyncTask("load", ["$query"], () => {
    const result = deferred<string>();
    results.push(result);
    return result.promise;
  })] as const;
  const View = defineComponent(
    "task-generation-bounded-view",
    (
      { execution }: {
        execution: import("./native_task_execution.ts").NativeTaskExecution<
          typeof tasks
        >;
      },
    ) => {
      const version = useStoreAt("bounded-publication-signal", signal);
      return jsx(
        "b",
        {},
        `${version}:${
          useAt("bounded-generation-result", execution.resource("load"))
        }`,
      );
    },
  );
  const publicationScope = "task-generation-bounded-publication";
  const queryScope = "task-generation-bounded-query";
  signal.beginTransition(publicationScope, [app.root.rootId]);
  signal.dispatch(1, { kind: "transition", transitionId: publicationScope });
  query.beginTransition(queryScope, [app.root.rootId]);
  const queue = new NativeTaskTransitionQueue();
  const handle = queue.enqueue(tasks, [{
    root: app.root,
    buildTree: (execution) =>
      jsx(Suspense, {
        __nativeBoundarySite: "task-generation-bounded-boundary",
        fallback: jsx("i", {}, "waiting"),
        children: jsx(View, { execution }),
      }),
  }], {
    liveInputs: { "$query": query },
    transitions: [publicationScope, queryScope],
    finishTransitions: true,
  });
  assertEquals(results.length, 1);
  const generationHolds: number[] = [];
  for (let generation = 1; generation <= 12; generation++) {
    query.dispatch(String(generation), {
      kind: "transition",
      transitionId: queryScope,
    });
    assertEquals(handle.snapshot().generation, generation * 2 + 1);
    assertEquals([...signal.transitionRoots(publicationScope)], [
      app.root.rootId,
    ]);
    generationHolds.push(activeHolds.size);
  }
  assertEquals(results.length, 13);
  assertEquals(
    Math.max(...generationHolds.slice(1)) <= generationHolds[0] + 2,
    true,
  );
  assertEquals(peakHolds <= generationHolds[0] + 3, true);

  handle.cancel("bounded lease regression cleanup");
  assertEquals((await handle.completion).status, "cancelled");
  signal.finishTransition(publicationScope);
  query.finishTransition(queryScope);
  queue.dispose();
  app.root.dispose();
  assertEquals(activeHolds.size, 0);
  for (const store of [signal, query]) {
    assertEquals([
      store.diagnostics().roots,
      store.diagnostics().readers,
      store.diagnostics().listeners,
      store.diagnostics().transitions,
      store.diagnostics().retainedActions,
    ], [0, 0, 0, 0, 0]);
  }
  for (const result of results) result.resolve("ignored");
});

Deno.test("a new task generation finishes an earlier store scope after its read disappears", async () => {
  const app = harness("task-generation-disappearing-store");
  app.root.mount(jsx("i", {}, "startup"));
  const query = createAsyncStore("old");
  const signal = createAsyncStore(0);
  const old = deferred<string>(), fresh = deferred<string>();
  const tasks = [
    asyncTask(
      "load",
      ["$query"],
      (values) => values.get("$query") === "old" ? old.promise : fresh.promise,
    ),
  ] as const;
  const View = defineComponent(
    "task-disappearing-store-primary",
    (
      { execution, includeSignal }: {
        execution: import("./native_task_execution.ts").NativeTaskExecution<
          typeof tasks
        >;
        includeSignal: boolean;
      },
    ) => {
      if (includeSignal) useStoreAt("earlier-signal", signal);
      return jsx("b", {}, useAt("result", execution.resource("load")));
    },
  );
  const scope = "task-disappearing-store-scope";
  signal.beginTransition(scope, [app.root.rootId]);
  signal.dispatch(1, { kind: "transition", transitionId: scope });
  const observed: Array<[string, number]> = [];
  const unsubscribe = signal.subscribe(
    app.root.rootId,
    () => observed.push([app.text(), signal.getStateForRoot(app.root.rootId)]),
  );
  const queue = new NativeTaskTransitionQueue();
  const handle = queue.enqueue(tasks, [{
    root: app.root,
    buildTree: (execution) =>
      jsx(Suspense, {
        __nativeBoundarySite: "task-disappearing-store-boundary",
        fallback: jsx("i", {}, "waiting"),
        error: () => jsx("strong", {}, "new-generation-error"),
        children: jsx(View, {
          execution,
          includeSignal: query.getState() === "old",
        }),
      }),
  }], {
    liveInputs: { "$query": query },
    transitions: [scope],
    finishTransitions: true,
  });
  query.dispatch("new");
  assertEquals(signal.transitionRoots(scope), [app.root.rootId]);
  fresh.reject(new Error("replacement failed"));
  assertEquals((await handle.completion).status, "committed");
  assertEquals(app.text(), "new-generation-error");
  assertEquals(observed, [["new-generation-error", 1]]);
  assertEquals(signal.diagnostics().transitions, 0);
  assertEquals(signal.diagnostics().retainedActions, 0);
  old.resolve("obsolete");
  await Promise.resolve();
  assertEquals(app.text(), "new-generation-error");
  unsubscribe();
  queue.dispose();
  app.root.dispose();
  for (const store of [query, signal]) {
    assertEquals(store.diagnostics(), {
      roots: 0,
      listeners: 0,
      readers: 0,
      retainedActions: 0,
      transitions: 0,
    });
  }
});
