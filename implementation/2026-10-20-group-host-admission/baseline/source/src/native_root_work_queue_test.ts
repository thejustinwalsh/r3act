import { assertEquals, assertThrows } from "jsr:@std/assert";
import { createAsyncStore } from "./async_store_runtime.ts";
import {
  bindStatePropsAt,
  ComponentStateRoot,
  defineComponent,
  Suspense,
  useAt,
  useEffectAt,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
function harness(id: string, host = new MemoryVDOMHost()) {
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: id,
    scheduleCommit: () => {},
    renderPreparation: "repeatable",
  });
  return {
    host,
    container,
    root,
    text: () => container.children.map(text).join(""),
  };
}

Deno.test("generic queued work declines before an undeclared component renders", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const queue = new NativeRootWorkQueue();
  let renders = 0;
  const Opaque = defineComponent("queue-undeclared-opaque", () => {
    renders++;
    return jsx("i", {}, "opaque");
  });
  assertThrows(() => queue.enqueue({
    id: "undeclared", roots: [{ root, tree: jsx(Opaque, {}) }],
  }), Error, "requires repeatable render preparation");
  assertEquals(renders, 0);
  assertEquals(container.children.length, 0);
  queue.dispose();
  root.dispose();
});

Deno.test("native queue coexists on one root and rebases reverse-ready store work", () => {
  const app = harness("queue-overlap");
  const store = createAsyncStore(
    1,
    (state: number, action: number) => state + action,
  );
  let update!: (value: number) => boolean;
  const View = defineComponent("queue-overlap-view", () => {
    const [n, set] = useStateAt("n", 0);
    update = set;
    return jsx(
      "output",
      { "data-local": bindStatePropsAt(["n"], ([n]) => n) },
      String(useStoreAt("store", store)),
    );
  }, { propOnlySites: ["n"] });
  const tree = jsx(View, {});
  app.root.mount(tree);
  const queue = new NativeRootWorkQueue();
  for (const id of ["slow", "fast"]) {
    store.beginTransition(id, [app.root.rootId]);
  }
  store.dispatch(10, { kind: "transition", transitionId: "slow" });
  store.dispatch(100, { kind: "transition", transitionId: "fast" });
  const slow = queue.enqueue({
    id: "slow",
    roots: [{ root: app.root, tree }],
    pending: ["ready"],
    transitions: ["slow"],
    finishTransitions: true,
  });
  const fast = queue.enqueue({
    id: "fast",
    roots: [{ root: app.root, tree }],
    pending: ["ready"],
    transitions: ["fast"],
    finishTransitions: true,
  });
  update(8);
  app.root.flush();
  fast.resolve("ready");
  assertEquals([app.text(), slow.status, fast.status], [
    "101",
    "pending",
    "committed",
  ]);
  slow.resolve("ready");
  assertEquals(app.text(), "111");
  assertEquals(app.container.children[0].props["data-local"], 8);
  update(9);
  app.root.flush();
  assertEquals(app.container.children[0].props["data-local"], 9);
  queue.dispose();
  app.root.dispose();
  assertEquals(store.diagnostics().roots, 0);
});

Deno.test("native group publishes two roots and two stores before observers or effects", () => {
  const left = harness("queue-group-left"),
    right = harness("queue-group-right");
  const a = createAsyncStore(1, (s: number, n: number) => s + n),
    b = createAsyncStore(10, (s: number, n: number) => s + n);
  const observations: string[][] = [];
  const observe = () =>
    observations.push([
      left.text(),
      right.text(),
      String(a.getStateForRoot(left.root.rootId)),
      String(b.getStateForRoot(right.root.rootId)),
    ]);
  const Probe = defineComponent("queue-group-probe", () => {
    useEffectAt("observe", () => {
      observe();
    });
    return jsx("i", {}, "ready");
  });
  const View = defineComponent(
    "queue-group-view",
    ({ show }: { show: boolean }) =>
      jsx(
        "div",
        {},
        `${useStoreAt("a", a)}:${useStoreAt("b", b)}`,
        show ? jsx(Probe, {}) : null,
      ),
  );
  left.root.mount(jsx(View, { show: false }));
  right.root.mount(jsx(View, { show: false }));
  const unsubs = [
    a.subscribe(left.root.rootId, observe),
    b.subscribe(right.root.rootId, observe),
  ];
  for (const store of [a, b]) {
    store.beginTransition("group", [left.root.rootId, right.root.rootId]);
  }
  a.dispatch(2, { kind: "transition", transitionId: "group" });
  b.dispatch(20, { kind: "transition", transitionId: "group" });
  observations.length = 0;
  const queue = new NativeRootWorkQueue();
  const handle = queue.enqueue({
    id: "group",
    roots: [{ root: left.root, tree: jsx(View, { show: true }) }, {
      root: right.root,
      tree: jsx(View, { show: true }),
    }],
    transitions: ["group", "group"],
    finishTransitions: true,
  });
  assertEquals(handle.status, "committed");
  assertEquals(observations.length, 4);
  for (const observation of observations) {
    assertEquals(observation, ["3:30ready", "3:30ready", "3", "30"]);
  }
  for (const unsub of unsubs) unsub();
  queue.dispose();
  left.root.dispose();
  right.root.dispose();
});

Deno.test("native disposal cancels pending included work and leaves unrelated root usable", () => {
  const a = harness("queue-detach-a"), b = harness("queue-detach-b");
  const queue = new NativeRootWorkQueue();
  const one = queue.enqueue({
    id: "one",
    roots: [{ root: a.root, tree: jsx("i", {}, "a") }],
    pending: ["ready"],
  });
  const two = queue.enqueue({
    id: "two",
    roots: [{ root: b.root, tree: jsx("i", {}, "b") }],
    pending: ["ready"],
  });
  a.root.dispose();
  assertEquals(one.status, "cancelled");
  two.resolve("ready");
  assertEquals(two.status, "committed");
  assertEquals(b.text(), "b");
  queue.dispose();
  b.root.dispose();
});

Deno.test("native queue group host failure poisons every native root", () => {
  class ThrowHost extends MemoryVDOMHost {
    override createElement(_tag: string): MemoryNode {
      throw undefined;
    }
  }
  const a = harness("queue-fail-a"),
    b = harness("queue-fail-b", new ThrowHost());
  const queue = new NativeRootWorkQueue();
  let effects = 0;
  const View = defineComponent("queue-fail-view", () => {
    useEffectAt("effect", () => {
      effects++;
    });
    return jsx("i", {}, "new");
  });
  const handle = queue.enqueue({
    id: "fail",
    roots: [{ root: a.root, tree: jsx(View, {}) }, {
      root: b.root,
      tree: jsx(View, {}),
    }],
  });
  assertEquals(handle.status, "failed");
  assertEquals(effects, 0);
  assertThrows(() => a.root.prepare(jsx("i", {}, "retry")));
  assertThrows(() => b.root.prepare(jsx("i", {}, "retry")));
  queue.dispose();
  a.root.dispose();
  b.root.dispose();
});

Deno.test("effect disposal detaches native queue after publication without leaking later work", () => {
  const app = harness("queue-effect-dispose");
  const queue = new NativeRootWorkQueue();
  const later = queue.enqueue({
    id: "later",
    roots: [{ root: app.root, tree: jsx("i", {}, "later") }],
    pending: ["ready"],
  });
  const View = defineComponent("queue-effect-dispose-view", () => {
    useEffectAt("dispose", () => app.root.dispose());
    return jsx("i", {}, "published");
  });
  const now = queue.enqueue({
    id: "now",
    roots: [{ root: app.root, tree: jsx(View, {}) }],
  });
  assertEquals(now.status, "committed");
  assertEquals(later.status, "cancelled");
  assertEquals(app.root.diagnostics().disposed, true);
  queue.dispose();
});

Deno.test("native resource candidates wait across every root and publish as one group", async () => {
  const leftPending = deferred<string>(), rightPending = deferred<string>();
  let effects = 0;
  const View = defineComponent(
    "queue-resource-view",
    (props: { promise: PromiseLike<string>; label: string }) => {
      useEffectAt("effect", () => {
        effects++;
      });
      return jsx("b", {}, `${props.label}:${useAt("resource", props.promise)}`);
    },
  );
  const tree = (label: string, promise: PromiseLike<string>) =>
    jsx(Suspense, {
      __nativeBoundarySite: `queue-boundary:${label}`,
      fallback: jsx("i", {}, `${label}:waiting`),
      children: jsx(View, { label, promise }),
    });
  const left = harness("queue-resource-left"),
    right = harness("queue-resource-right");
  // The caller can mount local fallbacks independently. A queued group never
  // commits these partial fallback candidates while other roots are pending.
  left.root.mount(tree("left", leftPending.promise));
  right.root.mount(tree("right", rightPending.promise));
  const queue = new NativeRootWorkQueue();
  const handle = queue.enqueue({
    id: "resource-group",
    roots: [
      { root: left.root, tree: tree("left", leftPending.promise) },
      { root: right.root, tree: tree("right", rightPending.promise) },
    ],
  });
  assertEquals(handle.status, "pending");
  assertEquals([left.text(), right.text(), effects], [
    "left:waiting",
    "right:waiting",
    0,
  ]);
  leftPending.resolve("ready-left");
  await Promise.resolve();
  assertEquals(handle.status, "pending");
  assertEquals([left.text(), right.text(), effects], [
    "left:waiting",
    "right:waiting",
    0,
  ]);
  rightPending.resolve("ready-right");
  await Promise.resolve();
  assertEquals(handle.status, "committed");
  assertEquals([left.text(), right.text(), effects], [
    "left:ready-left",
    "right:ready-right",
    2,
  ]);
  queue.dispose();
  left.root.dispose();
  right.root.dispose();
});

Deno.test("pending frontier store leases survive replacement until grouped publication", async () => {
  const leftResource = deferred<string>();
  const rightResource = deferred<string>();
  const signal = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  const View = defineComponent(
    "queue-pending-lease-view",
    (props: { label: string; promise: PromiseLike<string> }) => {
      const version = useStoreAt("publication-signal", signal);
      return jsx(
        "b",
        {},
        `${props.label}:${version}:${
          useAt("pending-lease-resource", props.promise)
        }`,
      );
    },
  );
  const tree = (label: string, promise: PromiseLike<string>) =>
    jsx(Suspense, {
      __nativeBoundarySite: `queue-pending-lease-boundary:${label}`,
      fallback: jsx("i", {}, `${label}:waiting`),
      children: jsx(View, { label, promise }),
    });
  const left = harness("queue-pending-lease-left");
  const right = harness("queue-pending-lease-right");
  left.root.mount(jsx("i", {}, "left-startup"));
  right.root.mount(jsx("i", {}, "right-startup"));
  const scope = "queue-pending-lease-transition";
  signal.beginTransition(scope, [left.root.rootId, right.root.rootId]);
  signal.dispatch(1, { kind: "transition", transitionId: scope });
  const observations: Array<[string, string, number, number]> = [];
  const observe = () =>
    observations.push([
      left.text(),
      right.text(),
      signal.getStateForRoot(left.root.rootId),
      signal.getStateForRoot(right.root.rootId),
    ]);
  const externalUnsubscribes = [
    signal.subscribe(left.root.rootId, observe),
    signal.subscribe(right.root.rootId, observe),
  ];
  const queue = new NativeRootWorkQueue();
  const handle = queue.enqueue({
    id: "queue-pending-lease-work",
    roots: [
      { root: left.root, tree: tree("left", leftResource.promise) },
      { root: right.root, tree: tree("right", rightResource.promise) },
    ],
    transitions: [scope],
    finishTransitions: true,
  });
  // Two external observers, two root dependency holds, and two queue
  // invalidation observers are live during the pending frontier.
  assertEquals([handle.status, signal.diagnostics().listeners], ["pending", 6]);
  assertEquals(
    [...signal.transitionRoots(scope)].sort(),
    [
      left.root.rootId,
      right.root.rootId,
    ].sort(),
  );

  leftResource.resolve("left-ready");
  await Promise.resolve();
  assertEquals([handle.status, signal.diagnostics().listeners], ["pending", 6]);
  assertEquals(
    [...signal.transitionRoots(scope)].sort(),
    [
      left.root.rootId,
      right.root.rootId,
    ].sort(),
  );
  assertEquals(observations.length, 0);

  rightResource.resolve("right-ready");
  await Promise.resolve();
  assertEquals([handle.status, left.text(), right.text()], [
    "committed",
    "left:1:left-ready",
    "right:1:right-ready",
  ]);
  assertEquals(signal.diagnostics().readers, 2);
  assertEquals(signal.diagnostics().listeners, 4);
  assertEquals(signal.diagnostics().transitions, 0);
  assertEquals(observations.length > 0, true);
  for (const observation of observations) {
    assertEquals(observation, [
      "left:1:left-ready",
      "right:1:right-ready",
      1,
      1,
    ]);
  }

  for (const unsubscribe of externalUnsubscribes) unsubscribe();
  queue.dispose();
  left.root.dispose();
  right.root.dispose();
  assertEquals([
    signal.diagnostics().roots,
    signal.diagnostics().readers,
    signal.diagnostics().listeners,
    signal.diagnostics().transitions,
  ], [0, 0, 0, 0]);
});

Deno.test("store invalidation replaces a pending resource frontier", async () => {
  const old = deferred<string>(), replacement = deferred<string>();
  const store = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  let current: PromiseLike<string> = old.promise;
  const View = defineComponent("queue-resource-refresh", () => {
    const version = useStoreAt("version", store);
    return jsx("b", {}, `${version}:${useAt("resource", current)}`);
  });
  const tree = jsx(Suspense, {
    __nativeBoundarySite: "queue-resource-refresh-boundary",
    fallback: jsx("i", {}, "waiting"),
    children: jsx(View, {}),
  });
  const app = harness("queue-resource-refresh");
  app.root.mount(tree);
  const queue = new NativeRootWorkQueue();
  const handle = queue.enqueue({
    id: "resource-refresh",
    roots: [{ root: app.root, tree }],
  });
  assertEquals([handle.status, app.text()], ["pending", "waiting"]);

  current = replacement.promise;
  store.dispatch(1);
  assertEquals(handle.status, "pending");
  old.resolve("obsolete");
  await Promise.resolve();
  assertEquals([handle.status, app.text()], ["pending", "waiting"]);
  replacement.resolve("fresh");
  await Promise.resolve();
  assertEquals([handle.status, app.text()], ["committed", "1:fresh"]);
  queue.dispose();
  app.root.dispose();
});

Deno.test("resource settlement refreshes a blocked retained-primary candidate", async () => {
  const first = deferred<string>(), next = deferred<string>();
  const store = createAsyncStore("before");
  const View = defineComponent(
    "queue-blocked-primary",
    (props: { promise: PromiseLike<string> }) =>
      jsx(
        "b",
        {},
        `${useStoreAt("store", store)}:${useAt("resource", props.promise)}`,
      ),
  );
  const tree = (promise: PromiseLike<string>) =>
    jsx(Suspense, {
      __nativeBoundarySite: "queue-blocked-primary-boundary",
      fallback: jsx("i", {}, "waiting"),
      children: jsx(View, { promise }),
    });
  const app = harness("queue-blocked-primary");
  app.root.mount(tree(first.promise));
  first.resolve("old-resource");
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  app.root.flush();
  assertEquals(app.text(), "before:old-resource");
  store.dispatch("after");

  const queue = new NativeRootWorkQueue();
  const handle = queue.enqueue({
    id: "blocked-primary",
    roots: [{ root: app.root, tree: tree(next.promise) }],
  });
  assertEquals([handle.status, app.text()], ["pending", "before:old-resource"]);
  next.resolve("new-resource");
  await Promise.resolve();
  assertEquals([handle.status, app.text()], [
    "committed",
    "after:new-resource",
  ]);
  queue.dispose();
  app.root.dispose();
});

Deno.test("cancelling resource work releases its retained store dependency lease", () => {
  const pending = deferred<string>();
  const store = createAsyncStore("ready");
  const View = defineComponent(
    "queue-resource-cancel",
    () =>
      jsx(
        "b",
        {},
        `${useStoreAt("store", store)}:${useAt("resource", pending.promise)}`,
      ),
  );
  const tree = jsx(Suspense, {
    __nativeBoundarySite: "queue-resource-cancel-boundary",
    fallback: jsx("i", {}, "waiting"),
    children: jsx(View, {}),
  });
  const app = harness("queue-resource-cancel");
  app.root.mount(tree);
  const before = store.diagnostics().listeners;
  const queue = new NativeRootWorkQueue();
  const handle = queue.enqueue({
    id: "resource-cancel",
    roots: [{ root: app.root, tree }],
  });
  assertEquals(handle.status, "pending");
  assertEquals(store.diagnostics().listeners > before, true);
  handle.cancel("caller cancelled");
  assertEquals([handle.status, store.diagnostics().listeners], [
    "cancelled",
    before,
  ]);
  pending.resolve("late");
  queue.dispose();
  app.root.dispose();
});

Deno.test("detaching a root and disposing the queue release resource observers", () => {
  const makePending = (id: string) => {
    const resource = deferred<string>();
    const store = createAsyncStore("ready");
    const View = defineComponent(`queue-resource-detach:${id}`, () =>
      jsx(
        "b",
        {},
        `${useStoreAt("store", store)}:${useAt("resource", resource.promise)}`,
      ));
    const tree = jsx(Suspense, {
      __nativeBoundarySite: `queue-resource-detach-boundary:${id}`,
      fallback: jsx("i", {}, "waiting"),
      children: jsx(View, {}),
    });
    const app = harness(id);
    app.root.mount(tree);
    const before = store.diagnostics().listeners;
    const queue = new NativeRootWorkQueue();
    const handle = queue.enqueue({ id, roots: [{ root: app.root, tree }] });
    return { app, before, handle, queue, resource, store };
  };

  const detached = makePending("queue-resource-root-detach");
  assertEquals(detached.store.diagnostics().listeners > detached.before, true);
  detached.app.root.dispose();
  assertEquals(detached.handle.status, "cancelled");
  assertEquals(detached.store.diagnostics().listeners, 0);
  detached.resource.resolve("late");
  detached.queue.dispose();

  const disposed = makePending("queue-resource-queue-dispose");
  assertEquals(disposed.store.diagnostics().listeners > disposed.before, true);
  disposed.queue.dispose();
  assertEquals(disposed.handle.status, "cancelled");
  assertEquals(disposed.store.diagnostics().listeners, disposed.before);
  disposed.resource.resolve("late");
  disposed.app.root.dispose();
});

Deno.test("independent resource works overlap one root and a fork with reverse readiness", async () => {
  const store = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  const slowResource = deferred<string>(), fastResource = deferred<string>();
  const forkResource = deferred<string>();
  const draftSetters = new Map<string, (value: number) => boolean>();
  let effectCount = 0;
  const View = defineComponent(
    "queue-independent-resource-view",
    (props: { rootName: string; promise: PromiseLike<string> }) => {
      const counter = useStoreAt("counter", store);
      const [draft, setDraft] = useStateAt("draft", 0);
      draftSetters.set(props.rootName, setDraft);
      useEffectAt("effect", () => {
        effectCount++;
      });
      return jsx(
        "output",
        {},
        `${props.rootName}:${counter}:${draft}:${
          useAt("resource", props.promise)
        }`,
      );
    },
  );
  const left = harness("queue-resource-overlap-left");
  const fork = harness("queue-resource-overlap-fork");
  // Prime the shared component owners with ready resources, then edit each
  // retained draft before scheduling independent resource work.
  await Promise.resolve();
  const tree = (rootName: string, promise: PromiseLike<string>) =>
    jsx(Suspense, {
      __nativeBoundarySite: `queue-resource-overlap-boundary:${rootName}`,
      fallback: jsx("i", {}, `${rootName}:waiting`),
      children: jsx(View, { rootName, promise }),
    });
  const base = Promise.resolve("base");
  left.root.mount(tree("left", base));
  fork.root.mount(tree("fork", base));
  await Promise.resolve();
  left.root.flush();
  fork.root.flush();
  draftSetters.get("left")!(7);
  draftSetters.get("fork")!(11);
  left.root.flush();
  fork.root.flush();
  assertEquals([left.text(), fork.text()], [
    "left:0:7:base",
    "fork:0:11:base",
  ]);
  const initialEffects = effectCount;

  for (const id of ["slow", "fast", "fork-only"]) {
    store.beginTransition(
      id,
      id === "fork-only"
        ? [fork.root.rootId]
        : [left.root.rootId, fork.root.rootId],
    );
  }
  store.dispatch(10, { kind: "transition", transitionId: "slow" });
  store.dispatch(100, { kind: "transition", transitionId: "fast" });
  store.dispatch(1000, { kind: "transition", transitionId: "fork-only" });

  const queue = new NativeRootWorkQueue();
  const slow = queue.enqueue({
    id: "resource-slow",
    roots: [
      { root: left.root, tree: tree("left", slowResource.promise) },
      { root: fork.root, tree: tree("fork", slowResource.promise) },
    ],
    transitions: ["slow"],
    finishTransitions: true,
  });
  const fast = queue.enqueue({
    id: "resource-fast",
    roots: [
      { root: left.root, tree: tree("left", fastResource.promise) },
      { root: fork.root, tree: tree("fork", fastResource.promise) },
    ],
    transitions: ["fast"],
    finishTransitions: true,
  });
  const forkOnly = queue.enqueue({
    id: "resource-fork-only",
    roots: [{ root: fork.root, tree: tree("fork", forkResource.promise) }],
    transitions: ["fork-only"],
    finishTransitions: true,
  });
  assertEquals([slow.status, fast.status, forkOnly.status], [
    "pending",
    "pending",
    "pending",
  ]);
  assertEquals([left.text(), fork.text(), effectCount], [
    "left:0:7:base",
    "fork:0:11:base",
    initialEffects,
  ]);

  // An urgent write rebases every still-pending transition while preserving
  // both roots' retained drafts and their currently visible resources.
  store.dispatch(1, { kind: "urgent" });
  left.root.flush();
  fork.root.flush();
  assertEquals([left.text(), fork.text()], [
    "left:1:7:base",
    "fork:1:11:base",
  ]);
  assertEquals([slow.status, fast.status, forkOnly.status], [
    "pending",
    "pending",
    "pending",
  ]);

  const notifications: { a: number; b: number; left: string; fork: string }[] =
    [];
  const observe = () =>
    notifications.push({
      a: store.getStateForRoot(left.root.rootId),
      b: store.getStateForRoot(fork.root.rootId),
      left: left.text(),
      fork: fork.text(),
    });
  const unsubscribe = [
    store.subscribe(left.root.rootId, observe),
    store.subscribe(fork.root.rootId, observe),
  ];

  // Enqueued slow, fast, fork-only; resolve in reverse order. Each settlement
  // retries only the work that captured that resource identity.
  forkResource.resolve("fork-ready");
  await Promise.resolve();
  assertEquals([forkOnly.status, fast.status, slow.status], [
    "committed",
    "pending",
    "pending",
  ]);
  assertEquals([left.text(), fork.text()], [
    "left:1:7:base",
    "fork:1001:11:fork-ready",
  ]);

  fastResource.resolve("fast-ready");
  await Promise.resolve();
  assertEquals([fast.status, slow.status], ["committed", "pending"]);
  assertEquals([left.text(), fork.text()], [
    "left:1101:7:fast-ready",
    "fork:1101:11:fast-ready",
  ]);

  slowResource.resolve("slow-ready");
  await Promise.resolve();
  assertEquals([slow.status, fast.status, forkOnly.status], [
    "committed",
    "committed",
    "committed",
  ]);
  assertEquals([left.text(), fork.text()], [
    "left:1111:7:slow-ready",
    "fork:1111:11:slow-ready",
  ]);
  assertEquals(notifications.length > 0, true);
  for (const notification of notifications) {
    // The fork-only scope also notifies the non-participating left root when
    // it closes, before that root's ordinary scheduled render catches up. The
    // two-root groups themselves must expose both new host trees and store
    // projections before either subscriber runs.
    if (
      !notification.left.includes("fast-ready") &&
      !notification.left.includes("slow-ready")
    ) continue;
    assertEquals(notification.left.startsWith(`left:${notification.a}:`), true);
    assertEquals(notification.fork.startsWith(`fork:${notification.b}:`), true);
  }
  for (const off of unsubscribe) off();

  // Work cancellation ends observation without taking ownership of the
  // caller's promise provider.
  const late = deferred<string>();
  let providerSettled = false;
  late.promise.then(() => {
    providerSettled = true;
  });
  const cancelled = queue.enqueue({
    id: "resource-cancel-provider",
    roots: [{ root: left.root, tree: tree("left", late.promise) }],
  });
  assertEquals(cancelled.status, "pending");
  cancelled.cancel("caller no longer needs this render");
  late.resolve("provider-still-runs");
  await Promise.resolve();
  assertEquals([cancelled.status, providerSettled, left.text()], [
    "cancelled",
    true,
    "left:1111:7:slow-ready",
  ]);

  queue.dispose();
  left.root.dispose();
  fork.root.dispose();
});

Deno.test("transition scopes finish for stores read only by an earlier pending wave", async () => {
  const rejected = deferred<string>();
  const briefStore = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  const profileStore = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  const Brief = defineComponent("queue-wave-brief-reader", () => {
    const brief = useStoreAt("brief", briefStore);
    return jsx(
      "p",
      {},
      `brief:${brief}:${useAt("brief-resource", rejected.promise)}`,
    );
  });
  const ProfileError = defineComponent(
    "queue-wave-profile-error",
    () =>
      jsx("strong", {}, `error:profile:${useStoreAt("profile", profileStore)}`),
  );
  const tree = jsx(Suspense, {
    __nativeBoundarySite: "queue-wave-store-boundary",
    fallback: jsx("i", {}, "waiting"),
    error: (_reason: unknown) => jsx(ProfileError, {}),
    children: jsx(Brief, {}),
  });
  const app = harness("queue-wave-store-root");
  // Initial startup fallback has no store dependencies. Only the queued
  // pending wave observes briefStore before rejection switches to profileStore.
  app.root.mount(jsx("i", {}, "startup"));
  const transition = "queue-wave-store-transition";
  for (const store of [briefStore, profileStore]) {
    store.beginTransition(transition, [app.root.rootId]);
    store.dispatch(1, { kind: "transition", transitionId: transition });
  }
  const queue = new NativeRootWorkQueue();
  const handle = queue.enqueue({
    id: "queue-wave-store-work",
    roots: [{ root: app.root, tree }],
    transitions: [transition],
    finishTransitions: true,
  });
  assertEquals([handle.status, app.text()], ["pending", "startup"]);
  assertEquals(briefStore.diagnostics().transitions, 1);
  assertEquals(profileStore.diagnostics().transitions, 1);

  // The final render reads profileStore from the error UI and never reaches
  // the rejected primary's briefStore read. The queue must still finish both
  // scopes observed across the pending wave and final candidate.
  rejected.reject("brief failed");
  await Promise.resolve();
  await Promise.resolve();
  assertEquals([handle.status, app.text()], [
    "committed",
    "error:profile:1",
  ]);
  assertEquals([
    briefStore.getStateForRoot(app.root.rootId),
    profileStore.getStateForRoot(app.root.rootId),
  ], [
    1,
    1,
  ]);
  assertEquals([
    briefStore.diagnostics().transitions,
    profileStore.diagnostics().transitions,
  ], [
    0,
    0,
  ]);
  assertEquals([
    briefStore.diagnostics().retainedActions,
    profileStore.diagnostics().retainedActions,
  ], [
    0,
    0,
  ]);
  queue.dispose();
  app.root.dispose();
  for (const store of [briefStore, profileStore]) {
    assertEquals(store.diagnostics().transitions, 0);
    assertEquals(store.diagnostics().retainedActions, 0);
    assertEquals(store.diagnostics().readers, 0);
    assertEquals(store.diagnostics().roots, 0);
  }
});

Deno.test("task-only store freshness rejects a stale resource candidate before host writes", async () => {
  const app = harness("queue-task-cut-stale");
  app.root.mount(jsx("i", {}, "startup"));
  const resource = deferred<string>();
  const taskStore = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  const initialTaskState = taskStore.getStateForRoot(app.root.rootId);
  const View = defineComponent(
    "queue-task-cut-view",
    () => jsx("b", {}, useAt("queue-task-cut-resource", resource.promise)),
  );
  const tree = jsx(Suspense, {
    __nativeBoundarySite: "queue-task-cut-boundary",
    fallback: jsx("i", {}, "waiting"),
    children: jsx(View, {}),
  });
  const writesBefore = [
    app.host.writeCount,
    app.host.placementCount,
    app.host.removalCount,
  ];
  let staleChecks = 0;
  const queue = new NativeRootWorkQueue();
  const handle = queue.enqueue({
    id: "queue-task-cut-work",
    roots: [{ root: app.root, tree }],
    validateWork: () =>
      taskStore.getStateForRoot(app.root.rootId) === initialTaskState,
    onStaleWork: () => {
      staleChecks++;
      return "reject";
    },
  });
  assertEquals([handle.status, app.text()], ["pending", "startup"]);

  // This input is consumed by an external task and is not read by the UI tree.
  taskStore.dispatch(1);
  resource.resolve("obsolete-task-result");
  await Promise.resolve();
  assertEquals([handle.status, app.text()], ["stale", "startup"]);
  assertEquals(staleChecks > 0, true);
  assertEquals([
    app.host.writeCount,
    app.host.placementCount,
    app.host.removalCount,
  ], writesBefore);
  queue.dispose();
  app.root.dispose();
});

Deno.test("external cut going stale at final pre-host validation does not poison roots", () => {
  const app = harness("queue-task-cut-prehost");
  app.root.mount(jsx("i", {}, "before"));
  const writesBefore = [
    app.host.writeCount,
    app.host.placementCount,
    app.host.removalCount,
  ];
  let validations = 0;
  const queue = new NativeRootWorkQueue();
  const stale = queue.enqueue({
    id: "queue-task-cut-prehost-stale",
    roots: [{ root: app.root, tree: jsx("b", {}, "stale") }],
    validateWork: () => ++validations === 1,
    onStaleWork: () => "reject",
  });
  assertEquals([stale.status, app.text()], ["stale", "before"]);
  assertEquals(validations, 2);
  assertEquals([
    app.host.writeCount,
    app.host.placementCount,
    app.host.removalCount,
  ], writesBefore);

  const followup = queue.enqueue({
    id: "queue-task-cut-prehost-followup",
    roots: [{ root: app.root, tree: jsx("b", {}, "usable") }],
  });
  assertEquals([followup.status, app.text()], ["committed", "usable"]);
  queue.dispose();
  app.root.dispose();
});

Deno.test("task-only freshness change during grouped host writes fails terminally", () => {
  const taskStore = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  class ReentrantHost extends MemoryVDOMHost {
    armed = false;
    override setText(node: MemoryNode, value: string) {
      super.setText(node, value);
      if (this.armed) {
        this.armed = false;
        taskStore.dispatch(1);
      }
    }
  }
  const host = new ReentrantHost();
  const app = harness("queue-task-cut-reentrant", host);
  app.root.mount(jsx("i", {}, "before"));
  const initialTaskState = taskStore.getStateForRoot(app.root.rootId);
  host.armed = true;
  const queue = new NativeRootWorkQueue();
  const handle = queue.enqueue({
    id: "queue-task-cut-reentrant-work",
    roots: [{ root: app.root, tree: jsx("i", {}, "after") }],
    validateWork: () =>
      taskStore.getStateForRoot(app.root.rootId) === initialTaskState,
  });
  assertEquals([handle.status, app.text()], ["failed", "after"]);
  assertThrows(() => app.root.prepare(jsx("i", {}, "retry")));
  queue.dispose();
  app.root.dispose();
});

Deno.test("task-only publication dependencies finish scopes before subscribers", () => {
  const app = harness("queue-task-scope");
  app.root.mount(jsx("i", {}, "before"));
  const taskStore = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  const scope = "queue-task-scope-transition";
  taskStore.beginTransition(scope, [app.root.rootId]);
  taskStore.dispatch(1, { kind: "transition", transitionId: scope });
  const observations: Array<[string, number, number]> = [];
  const unsubscribe = taskStore.subscribe(app.root.rootId, () => {
    observations.push([
      app.text(),
      taskStore.getStateForRoot(app.root.rootId),
      taskStore.diagnostics().transitions,
    ]);
  });
  const queue = new NativeRootWorkQueue();
  const handle = queue.enqueue({
    id: "queue-task-scope-work",
    roots: [{ root: app.root, tree: jsx("b", {}, "published") }],
    transitions: [scope],
    finishTransitions: true,
    publicationDependencies: [{
      root: app.root,
      stores: new Set([taskStore]),
    }],
  });
  assertEquals(handle.status, "committed");
  assertEquals(observations, [["published", 1, 0]]);
  unsubscribe();
  queue.dispose();
  app.root.dispose();
  assertEquals(taskStore.diagnostics().transitions, 0);
});

Deno.test("task-only publication dependencies reject roots outside the work", () => {
  const included = harness("queue-task-dependency-included");
  const excluded = harness("queue-task-dependency-excluded");
  const taskStore = createAsyncStore(0);
  const queue = new NativeRootWorkQueue();
  assertThrows(() =>
    queue.enqueue({
      id: "queue-task-dependency-invalid",
      roots: [{ root: included.root, tree: jsx("i", {}, "included") }],
      publicationDependencies: [{
        root: excluded.root,
        stores: new Set([taskStore]),
      }],
    })
  );
  assertThrows(() => queue.getVersion(included.root));
  assertThrows(() => queue.getVersion(excluded.root));
  queue.dispose();
  included.root.dispose();
  excluded.root.dispose();
});

Deno.test("a dependency lease transfers pending-only scope ownership between works", async () => {
  const app = harness("queue-work-lease-transfer");
  app.root.mount(jsx("i", {}, "startup"));
  const signal = createAsyncStore(0);
  const pending = deferred<string>();
  const View = defineComponent("queue-work-lease-view", () => {
    useStoreAt("scope", signal);
    return jsx("b", {}, useAt("resource", pending.promise));
  });
  const scope = "queue-work-lease-scope";
  signal.beginTransition(scope, [app.root.rootId]);
  signal.dispatch(1, { kind: "transition", transitionId: scope });
  const observed: Array<[string, number]> = [];
  const unsubscribe = signal.subscribe(app.root.rootId, () => {
    observed.push([app.text(), signal.getStateForRoot(app.root.rootId)]);
  });
  const queue = new NativeRootWorkQueue();
  const previous = queue.enqueue({
    id: "queue-work-lease-old",
    roots: [{
      root: app.root,
      tree: jsx(Suspense, {
        __nativeBoundarySite: "queue-work-lease-boundary",
        fallback: jsx("i", {}, "waiting"),
        children: jsx(View, {}),
      }),
    }],
    transitions: [scope],
    finishTransitions: true,
  });
  const lease = previous.retainStoreDependencies();
  assertEquals(lease.dependencies.length, 1);
  assertEquals(lease.dependencies[0]!.root, app.root);
  assertEquals(lease.dependencies[0]!.stores.has(signal), true);
  previous.cancel("transfer to replacement");
  assertEquals(signal.transitionRoots(scope), [app.root.rootId]);
  assertEquals(signal.diagnostics().listeners, 2);
  // The replacement need not read the source: dependency metadata still
  // publishes the earlier pending store's scope after the complete host write.
  const next = queue.enqueue({
    id: "queue-work-lease-new",
    roots: [{ root: app.root, tree: jsx("b", {}, "replacement") }],
    transitions: [scope],
    finishTransitions: true,
    publicationDependencies: lease.dependencies,
  });
  assertEquals(next.status, "committed");
  assertEquals(observed, [["replacement", 1]]);
  assertEquals(signal.diagnostics().transitions, 0);
  assertThrows(() => previous.retainStoreDependencies());
  assertThrows(() => next.retainStoreDependencies());
  lease.release();
  lease.release();
  assertEquals(signal.diagnostics().listeners, 0);
  assertEquals(signal.diagnostics().roots, 0);
  unsubscribe();
  pending.resolve("obsolete");
  await Promise.resolve();
  assertEquals(app.text(), "replacement");
  queue.dispose();
  app.root.dispose();
  assertEquals(signal.diagnostics().retainedActions, 0);
});
