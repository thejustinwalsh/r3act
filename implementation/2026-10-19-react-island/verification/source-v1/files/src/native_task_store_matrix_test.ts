import { assertEquals, assertThrows } from "jsr:@std/assert";
import { asyncTask, type AuthoredAsyncTask } from "./async_task_plan.ts";
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
import type { NativeTaskExecution } from "./native_task_execution.ts";
import { jsx, type RuntimeNode } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";
import {
  createOptimisticFeedStore,
  optimisticFeedActions,
  optimisticLikeCount,
} from "./optimistic_feed.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

const drainMicrotasks = async () => {
  // Promise continuations are the only scheduler in these fixtures. A fixed
  // drain avoids wall-clock ordering and does not wait for timers or I/O.
  for (let index = 0; index < 24; index++) await Promise.resolve();
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

const boundary = (child: RuntimeNode) =>
  jsx(Suspense, {
    __nativeBoundarySite: "matrix-boundary",
    fallback: jsx("i", {}, "loading"),
    children: child,
  });

type MatrixExecution = NativeTaskExecution<readonly AuthoredAsyncTask[]>;

Deno.test("three independent transitions, fork work, and grouped publication compose on pinned reads", async () => {
  const app = harness("task-store-matrix-app");
  const fork = harness("task-store-matrix-fork");
  const left = harness("task-store-matrix-left");
  const right = harness("task-store-matrix-right");
  const state = createAsyncStore("base");
  const groupState = createAsyncStore("group-base");
  const timeline: string[] = [];

  const View = defineComponent(
    "task-store-matrix-view",
    ({ execution, taskId }: {
      execution: MatrixExecution;
      taskId: string;
    }) => {
      const current = useStoreAt("shared-state", state);
      const taskValue = useAt(
        `${taskId}-result`,
        execution.resource(taskId),
      );
      return jsx("b", {}, `${current}:${String(taskValue)}`);
    },
  );
  const queues = new NativeTaskTransitionQueue();
  const first = deferred<string>();
  const second = deferred<string>();
  const third = deferred<string>();
  const forkGate = deferred<string>();
  const leftGate = deferred<string>();
  const rightGate = deferred<string>();
  const operations = [
    {
      id: "first",
      transition: "transition-first",
      value: "first-state",
      gate: first,
      task: asyncTask("first", [], () => first.promise),
    },
    {
      id: "second",
      transition: "transition-second",
      value: "second-state",
      gate: second,
      task: asyncTask("second", [], () => second.promise),
    },
    {
      id: "third",
      transition: "transition-third",
      value: "third-state",
      gate: third,
      task: asyncTask("third", [], () => third.promise),
    },
  ] as const;

  for (const operation of operations) {
    state.beginTransition(operation.transition, [app.root.rootId]);
    state.dispatch(operation.value, {
      kind: "transition",
      transitionId: operation.transition,
    });
  }
  const started = operations.map((operation) =>
    queues.enqueue([operation.task] as const, [{
      root: app.root,
      buildTree: (execution) =>
        boundary(jsx(View, {
          execution,
          taskId: operation.id,
        })),
    }], {
      id: operation.id,
      transitions: [operation.transition],
      finishTransitions: true,
      onSettled: ({ status }) => timeline.push(`${operation.id}:${status}`),
    })
  );
  const reentrantReads: string[] = [];
  let urgentDispatched = false;
  const unsubscribeReentrant = state.subscribe(app.root.rootId, () => {
    reentrantReads.push(app.text());
    if (!urgentDispatched) {
      urgentDispatched = true;
      state.dispatch("urgent-from-subscriber");
    }
  });

  state.beginTransition("fork-only", [fork.root.rootId]);
  state.dispatch("fork-state", {
    kind: "transition",
    transitionId: "fork-only",
  });
  const forkWork = queues.enqueue(
    [asyncTask("fork", [], () => forkGate.promise)] as const,
    [{
      root: fork.root,
      buildTree: (execution) =>
        boundary(jsx(View, { execution, taskId: "fork" })),
    }],
    { id: "fork-only", transitions: ["fork-only"], finishTransitions: true },
  );

  groupState.beginTransition("group-left-cut", [
    left.root.rootId,
    right.root.rootId,
  ]);
  groupState.dispatch("left-state", {
    kind: "transition",
    transitionId: "group-left-cut",
  });
  groupState.commitTransitionRoots("group-left-cut", [left.root.rootId], {
    finish: true,
  });
  groupState.beginTransition("group-right-cut", [
    left.root.rootId,
    right.root.rootId,
  ]);
  groupState.dispatch("right-state", {
    kind: "transition",
    transitionId: "group-right-cut",
  });
  groupState.commitTransitionRoots("group-right-cut", [right.root.rootId], {
    finish: true,
  });
  assertEquals([
    groupState.getStateForRoot(left.root.rootId),
    groupState.getStateForRoot(right.root.rootId),
  ], ["left-state", "right-state"]);
  const groupInput = groupState.select((value) => value);
  const leftTask = asyncTask(
    "group",
    ["$region"],
    (values) =>
      String(values.get("$region")) === "left-state"
        ? leftGate.promise
        : rightGate.promise,
  );
  type GroupExecution = NativeTaskExecution<readonly [typeof leftTask]>;
  const groupLeft = defineComponent(
    "matrix-group-left",
    ({ execution }: { execution: GroupExecution }) => {
      const read = useStoreAt("left-state", groupState);
      useEffectAt("left-group-effect", () => {
        timeline.push(`left-effect:${left.text()}|${right.text()}`);
      });
      return jsx(
        "b",
        {},
        `${read}:${
          String(useAt("left-resource", execution.resource("group")))
        }`,
      );
    },
  );
  const groupRight = defineComponent(
    "matrix-group-right",
    ({ execution }: { execution: GroupExecution }) => {
      const read = useStoreAt("right-state", groupState);
      useEffectAt("right-group-effect", () => {
        timeline.push(`right-effect:${left.text()}|${right.text()}`);
      });
      return jsx(
        "b",
        {},
        `${read}:${
          String(useAt("right-resource", execution.resource("group")))
        }`,
      );
    },
  );
  const grouped = queues.enqueue([leftTask] as const, [{
    root: left.root,
    buildTree: (execution) => boundary(jsx(groupLeft, { execution })),
  }, {
    root: right.root,
    buildTree: (execution) => boundary(jsx(groupRight, { execution })),
  }], {
    id: "grouped-roots",
    liveInputs: { "$region": groupInput },
    onSettled: ({ status }) =>
      timeline.push(`group:${status}:${left.text()}|${right.text()}`),
  });

  assertEquals([app.text(), fork.text(), left.text(), right.text()], [
    "",
    "",
    "",
    "",
  ]);
  // Reverse the three same-root completions. Their independent transitions
  // remain live and each publication reads only its own captured transition.
  third.resolve("third-result");
  await drainMicrotasks();
  assertEquals(started[2]!.status, "committed");
  assertEquals(app.text(), "third-state:third-result");
  second.resolve("second-result");
  await drainMicrotasks();
  assertEquals(started[1]!.status, "committed");
  assertEquals(app.text(), "urgent-from-subscriber:second-result");
  first.resolve("first-result");
  await drainMicrotasks();
  assertEquals(started[0]!.status, "committed");
  assertEquals(app.text(), "urgent-from-subscriber:first-result");
  assertEquals(urgentDispatched, true);
  assertEquals(
    state.getStateForRoot(app.root.rootId),
    "urgent-from-subscriber",
  );
  assertEquals(reentrantReads.length, 4);
  unsubscribeReentrant();

  // A fork-only operation can publish while the unrelated grouped roots wait.
  forkGate.resolve("fork-result");
  await drainMicrotasks();
  assertEquals(forkWork.status, "committed");
  assertEquals(fork.text(), "urgent-from-subscriber:fork-result");
  leftGate.resolve("left-result");
  await drainMicrotasks();
  assertEquals(grouped.status, "pending");
  assertEquals([left.text(), right.text()], ["", ""]);
  rightGate.resolve("right-result");
  await drainMicrotasks();
  assertEquals(grouped.status, "committed");
  assertEquals([left.text(), right.text()], [
    "left-state:left-result",
    "right-state:right-result",
  ]);
  assertEquals(timeline, [
    "third:committed",
    "second:committed",
    "first:committed",
    "left-effect:left-state:left-result|right-state:right-result",
    "right-effect:left-state:left-result|right-state:right-result",
    "group:committed:left-state:left-result|right-state:right-result",
  ]);
  queues.dispose();
  for (const item of [app, fork, left, right]) item.root.dispose();
  assertEquals(state.diagnostics().readers, 0);
  assertEquals(state.diagnostics().roots, 0);
  assertEquals(state.diagnostics().transitions, 0);
  assertEquals(groupState.diagnostics().transitions, 0);
});

Deno.test("input recapture, cancellation, rejection, detach, and optimistic compensation stay operation local", async () => {
  const app = harness("task-store-matrix-lifecycle");
  const query = createAsyncStore({ selected: "old", noise: 0 });
  const selected = query.select((value) => value.selected);
  const alternateSelected = query.select((value) => value.selected);
  const selectorMode = { alternate: false };
  const oldResult = deferred<string>();
  const currentResult = deferred<string>();
  const cancelledResult = deferred<string>();
  const rejectedResult = deferred<string>();
  const rejectCause = new Error("local provider failure");
  const started: string[] = [];
  const reads = createOptimisticFeedStore([{ id: "item", text: "base" }]);
  optimisticFeedActions.beginLike(reads, "optimistic-one", "item");
  optimisticFeedActions.beginLike(reads, "optimistic-two", "item");
  const timeline: string[] = [];
  const queue = new NativeTaskTransitionQueue();
  const task = [asyncTask("load", ["$selected"], (values) => {
    const value = String(values.get("$selected"));
    started.push(value);
    return value === "old" ? oldResult.promise : currentResult.promise;
  })] as const;

  const Detail = defineComponent(
    "matrix-lifecycle-view",
    ({ execution }: { execution: NativeTaskExecution<typeof task> }) => {
      const value = useStoreAt(
        "selected-value",
        selectorMode.alternate ? alternateSelected : selected,
      );
      const feed = useStoreAt("feed-value", reads);
      useEffectAt("visible-effect", () => {
        timeline.push(
          `effect:${app.text()}:${value}:${
            optimisticLikeCount(feed.items[0]!)
          }`,
        );
      });
      return jsx(
        "b",
        {},
        `${value}:${String(useAt("resource", execution.resource("load")))}:${
          optimisticLikeCount(feed.items[0]!)
        }`,
      );
    },
  );
  const live = queue.enqueue(task, [{
    root: app.root,
    buildTree: (execution) => boundary(jsx(Detail, { execution })),
  }], {
    id: "live-input",
    liveInputs: { "$selected": selected },
    onSettled: ({ status }) => timeline.push(`live:${status}`),
  });
  assertEquals(started, ["old"]);
  selectorMode.alternate = true;
  query.dispatch({ selected: "new", noise: 0 });
  await drainMicrotasks();
  assertEquals(started, ["old", "new"]);
  // The old provider is intentionally non-cooperative. Its late result cannot
  // satisfy the new generation or publish old host/effect state.
  oldResult.resolve("stale-old");
  await drainMicrotasks();
  assertEquals(app.text(), "");
  currentResult.resolve("fresh");
  await drainMicrotasks();
  assertEquals(live.status, "committed");
  assertEquals(app.text(), "new:fresh:2");
  assertEquals(timeline, ["effect:new:fresh:2:new:2", "live:committed"]);

  const cancelTask = [
    asyncTask("load", [], () => cancelledResult.promise),
  ] as const;
  const CancelView = defineComponent(
    "matrix-cancelled-resource-view",
    ({ execution }: { execution: NativeTaskExecution<typeof cancelTask> }) =>
      jsx("b", {}, String(useAt("cancelled", execution.resource("load")))),
  );
  const cancelled = queue.enqueue(cancelTask, [{
    root: app.root,
    buildTree: (execution) => boundary(jsx(CancelView, { execution })),
  }], { id: "cancelled-operation" });
  cancelled.cancel("only cancel this operation");
  const cancelledStatus = (await cancelled.completion).status;
  cancelledResult.resolve("too-late");
  await drainMicrotasks();
  assertEquals(app.text(), "new:fresh:2");

  const rejectTask = [
    asyncTask("load", [], () => rejectedResult.promise),
  ] as const;
  const RejectedView = defineComponent(
    "matrix-rejected-resource-view",
    ({ execution }: { execution: NativeTaskExecution<typeof rejectTask> }) =>
      jsx("b", {}, String(useAt("rejected", execution.resource("load")))),
  );
  const rejected = queue.enqueue(rejectTask, [{
    root: app.root,
    buildTree: (execution) =>
      jsx(Suspense, {
        __nativeBoundarySite: "matrix-rejection-boundary",
        fallback: jsx("i", {}, "waiting"),
        error: (reason: unknown) =>
          jsx("b", {}, `local-error:${String(reason)}`),
        children: jsx(RejectedView, { execution }),
      }),
  }], { id: "rejected-operation" });
  rejectedResult.reject(rejectCause);
  const rejectedStatus = (await rejected.completion).status;
  const rejectedText = app.text();

  optimisticFeedActions.compensate(reads, "optimistic-one");
  const afterOne = reads.getState();
  assertEquals(afterOne.operations["optimistic-one"]?.status, "compensated");
  assertEquals(afterOne.operations["optimistic-two"]?.status, "pending");
  assertEquals(optimisticLikeCount(afterOne.items[0]!), 1);
  optimisticFeedActions.compensate(reads, "optimistic-two");
  assertEquals(optimisticLikeCount(reads.getState().items[0]!), 0);

  const detachedGate = deferred<string>();
  const doomedRoot = harness("task-store-matrix-detached");
  const detachedTask = [
    asyncTask("load", [], () => detachedGate.promise),
  ] as const;
  const DetachedView = defineComponent(
    "matrix-detached-resource-view",
    ({ execution }: { execution: NativeTaskExecution<typeof detachedTask> }) =>
      jsx("b", {}, String(useAt("detached", execution.resource("load")))),
  );
  const doomed = queue.enqueue(detachedTask, [{
    root: doomedRoot.root,
    buildTree: (execution) => boundary(jsx(DetachedView, { execution })),
  }], { id: "detach-before-result" });
  doomedRoot.root.dispose();
  assertEquals((await doomed.completion).status, "cancelled");
  const sameIdReplacement = harness("task-store-matrix-detached");
  const replacementTask = [asyncTask("load", [], () => "replacement")] as const;
  const ReplacementView = defineComponent(
    "matrix-replacement-resource-view",
    (
      { execution }: { execution: NativeTaskExecution<typeof replacementTask> },
    ) => jsx("b", {}, String(useAt("replacement", execution.resource("load")))),
  );
  const replacement = queue.enqueue(replacementTask, [{
    root: sameIdReplacement.root,
    buildTree: (execution) => boundary(jsx(ReplacementView, { execution })),
  }], { id: "same-id-reattach" });
  assertEquals((await replacement.completion).status, "committed");
  detachedGate.resolve("detached-stale");
  await drainMicrotasks();
  assertEquals(sameIdReplacement.text(), "replacement");

  queue.dispose();
  app.root.dispose();
  sameIdReplacement.root.dispose();
  assertEquals(query.diagnostics().listeners, 0);
  assertEquals(query.diagnostics().readers, 0);
  assertEquals(reads.diagnostics().roots, 0);
  assertEquals(reads.diagnostics().readers, 0);
  assertEquals(reads.diagnostics().transitions, 0);
  assertEquals(app.root.diagnostics().disposed, true);
  assertEquals({ cancelledStatus, rejectedStatus, rejectedText }, {
    cancelledStatus: "cancelled",
    rejectedStatus: "committed",
    rejectedText: `local-error:${String(rejectCause)}`,
  });
  assertThrows(() =>
    queue.enqueue(task, [{
      root: app.root,
      buildTree: (execution) => boundary(jsx(Detail, { execution })),
    }])
  );
});
