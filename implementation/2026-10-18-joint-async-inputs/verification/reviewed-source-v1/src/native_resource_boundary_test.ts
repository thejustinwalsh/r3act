import {
  ComponentStateRoot,
  defineComponent,
  Suspense,
  useAt,
  useEffectAt,
  useStateAt,
} from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import { StoreRenderTransaction } from "./async_store_runtime.ts";

const assert = (value: unknown, message = "Assertion failed") => {
  if (!value) throw new Error(message);
};
const equal = (actual: unknown, expected: unknown) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
};
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
const publish = (
  root: ComponentStateRoot<MemoryNode, MemoryNode>,
  tree: ReturnType<typeof jsx>,
) => {
  const candidate = root.prepare(tree);
  candidate.commitHost();
  candidate.publish();
  candidate.runEffects();
  return candidate;
};

Deno.test("native boundary discovers later pending siblings and commits only local fallback", () => {
  const first = deferred<string>(), second = deferred<string>();
  let effects = 0;
  const A = defineComponent("resource-a", () => {
    useEffectAt("effect", () => {
      effects++;
    });
    return jsx("b", {}, useAt("read", first.promise) as string);
  });
  const B = defineComponent(
    "resource-b",
    () => jsx("i", {}, useAt("read", second.promise) as string),
  );
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const candidate = root.prepare(jsx(Suspense, {
    __nativeBoundarySite: "boundary",
    fallback: jsx("p", { id: "fallback" }, "loading"),
    children: [jsx(A, {}), jsx(B, {})],
  }));
  equal(candidate.pendingResources.length, 2);
  candidate.commitHost();
  candidate.publish();
  candidate.runEffects();
  equal(effects, 0);
  equal(text(container.children[0]), "loading");
  root.dispose();
});

Deno.test("discarded primary store observations and effects do not publish", () => {
  const pending = deferred<string>();
  const store = createAsyncStore("private");
  let effects = 0;
  const View = defineComponent("discarded-primary", () => {
    const value = useAt("store", store) as string;
    useEffectAt("effect", () => {
      effects++;
    });
    return jsx(
      "b",
      {},
      `${value}:${String(useAt("resource", pending.promise))}`,
    );
  });
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  publish(
    root,
    jsx(Suspense, {
      __nativeBoundarySite: "discarded-boundary",
      fallback: jsx("p", {}, "loading"),
      children: jsx(View, {}),
    }),
  );
  equal(effects, 0);
  assert(
    store.diagnostics().listeners > 0,
    "suspended branch store stays watched",
  );
  equal(store.diagnostics().readers, 0);
  equal(store._readerValuesFor(root.rootId, "discarded-primary").size, 0);
  root.dispose();
});

Deno.test("native resource reads reveal the primary after all observed siblings settle", async () => {
  const first = deferred<string>(), second = deferred<string>();
  const A = defineComponent(
    "ready-a",
    () => jsx("b", {}, useAt("read", first.promise) as string),
  );
  const B = defineComponent(
    "ready-b",
    () => jsx("i", {}, useAt("read", second.promise) as string),
  );
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const tree = jsx(Suspense, {
    __nativeBoundarySite: "boundary",
    fallback: jsx("p", {}, "waiting"),
    children: [jsx(A, {}), jsx(B, {})],
  });
  root.mount(tree);
  first.resolve("A");
  second.resolve("B");
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  equal(container.children.map(text).join(""), "AB");
  root.dispose();
});

Deno.test("rejected resources reach the local error renderer and replacement identity retries", () => {
  const rejected = deferred<string>(), replacement = deferred<string>();
  const View = defineComponent(
    "error-view",
    (props: { promise: PromiseLike<string> }) =>
      jsx("span", {}, useAt("read", props.promise) as string),
  );
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const tree = (promise: PromiseLike<string>) =>
    jsx(Suspense, {
      __nativeBoundarySite: "error-boundary",
      fallback: jsx("p", {}, "pending"),
      error: (reason: unknown) => jsx("strong", {}, `error:${String(reason)}`),
      children: jsx(View, { promise }),
    });
  root.mount(tree(rejected.promise));
  rejected.reject("failed");
  return Promise.resolve().then(() => Promise.resolve()).then(() => {
    equal(text(container.children[0]), "error:failed");
    publish(root, tree(replacement.promise));
    replacement.resolve("recovered");
    return Promise.resolve().then(() => Promise.resolve());
  }).then(() => {
    equal(text(container.children[0]), "recovered");
    root.dispose();
  });
});

Deno.test("nested native boundaries keep pending work local", () => {
  const pending = deferred<string>();
  const Inner = defineComponent(
    "inner-resource",
    () => jsx("b", {}, useAt("read", pending.promise) as string),
  );
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const candidate = root.prepare(jsx("main", {}, [
    jsx("aside", {}, "outer-before"),
    jsx(Suspense, {
      __nativeBoundarySite: "inner",
      fallback: jsx("i", {}, "inner-wait"),
      children: jsx(Inner, {}),
    }),
    jsx("aside", {}, "outer-after"),
  ]));
  equal(candidate.pendingResources.length, 1);
  candidate.commitHost();
  candidate.publish();
  candidate.runEffects();
  equal(text(container.children[0]), "outer-beforeinner-waitouter-after");
  root.dispose();
});

Deno.test("same-site sibling boundaries scope owners, effects, readers, and keyed moves", async () => {
  const store = createAsyncStore("shared");
  const setters = new Map<
    string,
    (action: (value: number) => number) => boolean
  >();
  let setups = 0, cleanups = 0;
  const Shared = defineComponent(
    "shared-boundary-child",
    (props: { id: string }) => {
      const [count, setCount] = useStateAt("count", 0);
      setters.set(props.id, setCount);
      useAt("store", store);
      useEffectAt("effect", () => {
        setups++;
        return () => {
          cleanups++;
        };
      });
      return jsx("span", {}, `${props.id}:${count}`);
    },
  );
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const boundary = (id: string) =>
    jsx(Suspense, {
      __nativeBoundarySite: "same-loop-boundary",
      key: id,
      children: jsx(Shared, { id }),
    });
  root.mount(jsx("div", {}, [boundary("a"), boundary("b")]));
  equal(setups, 2);
  equal(store.diagnostics().readers, 2);
  setters.get("a")!((value) => value + 1);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  root.update(jsx("div", {}, [boundary("b"), boundary("a")]));
  equal(text(container.children[0]), "b:0a:1");
  equal(setups, 2);
  equal(cleanups, 0);
  root.dispose();
  equal(cleanups, 2);
});

Deno.test("cached ancestor reuse keeps nested boundary owners and primary snapshots", async () => {
  const initial = deferred<string>(),
    next = deferred<string>(),
    later = deferred<string>();
  let bump = () => {};
  const Content = defineComponent(
    "cached-boundary-content",
    (props: { promise: PromiseLike<string> }) =>
      jsx("b", {}, useAt("resource", props.promise) as string),
  );
  const Stable = defineComponent(
    "cached-boundary-stable",
    (props: { promise: PromiseLike<string> }) =>
      jsx(Suspense, {
        __nativeBoundarySite: "cached-boundary-site",
        fallback: jsx("i", {}, "waiting"),
        children: jsx(Content, { promise: props.promise }),
      }),
  );
  const App = defineComponent(
    "cached-boundary-app",
    (props: { promise: PromiseLike<string> }) => {
      const [, setDraft] = useStateAt("draft", 0);
      bump = () => setDraft((value) => value + 1);
      return jsx("main", {}, [
        jsx(Stable, { promise: props.promise }),
        jsx("aside", {}, "sibling"),
      ]);
    },
  );
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const tree = (promise: PromiseLike<string>) => jsx(App, { promise });
  root.mount(tree(initial.promise));
  initial.resolve("initial");
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  equal(text(container.children[0]), "initialsibling");
  publish(root, tree(next.promise));
  equal(text(container.children[0]), "initialsibling");
  bump();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  publish(root, tree(later.promise));
  equal(text(container.children[0]), "initialsibling");
  later.resolve("later");
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  equal(text(container.children[0]), "later sibling".replace(" ", ""));
  root.dispose();
});

Deno.test("revealed primary re-expands current owner state while a replacement resource is pending", async () => {
  const initial = deferred<string>(), next = deferred<string>();
  const store = createAsyncStore("stable");
  let bump = () => {};
  const View = defineComponent(
    "retained-view",
    (props: { promise: PromiseLike<string> }) => {
      const [draft, setDraft] = useStateAt("draft", 0);
      bump = () => setDraft((value) => value + 1);
      const shared = useAt("store", store) as string;
      const data = useAt("data", props.promise) as string;
      return jsx("p", {}, `${shared}:${draft}:${data}`);
    },
  );
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const tree = (promise: PromiseLike<string>) =>
    jsx(Suspense, {
      __nativeBoundarySite: "retained-boundary",
      fallback: jsx("i", {}, "waiting"),
      children: jsx(View, { promise }),
    });
  root.mount(tree(initial.promise));
  initial.resolve("ready");
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  equal(text(container.children[0]), "stable:0:ready");
  bump();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  equal(text(container.children[0]), "stable:1:ready");
  publish(root, tree(next.promise));
  equal(text(container.children[0]), "stable:1:ready");
  next.resolve("next");
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  equal(text(container.children[0]), "stable:1:next");
  root.dispose();
});

Deno.test("retained primary accepts one fresh store projection across the root", async () => {
  const ready = deferred<string>(), pending = deferred<string>();
  const score = createAsyncStore(1);
  let bump = () => {};
  const Outside = defineComponent(
    "coherence-outside",
    () => jsx("aside", {}, `outside:${String(useAt("score", score))}`),
  );
  const View = defineComponent(
    "coherence-view",
    (props: { promise: PromiseLike<string> }) => {
      const [draft, setDraft] = useStateAt("draft", 0);
      bump = () => setDraft((value) => value + 1);
      const value = useAt("score", score) as number;
      return jsx(
        "p",
        {},
        `${value}:${draft}:${String(useAt("data", props.promise))}`,
      );
    },
  );
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const tree = (promise: PromiseLike<string>) =>
    jsx("main", {}, [
      jsx(Outside, {}),
      jsx(Suspense, {
        __nativeBoundarySite: "coherence-boundary",
        fallback: jsx("i", {}, "waiting"),
        children: jsx(View, { promise }),
      }),
    ]);
  root.mount(tree(ready.promise));
  ready.resolve("old");
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  score.dispatch(2);
  bump();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  publish(root, tree(pending.promise));
  equal(text(container.children[0]), "outside:22:1:old");
  pending.resolve("new");
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  equal(text(container.children[0]), "outside:22:1:new");
  root.dispose();
});

Deno.test("retained primary blocks when its current store-held resource still suspends", async () => {
  const ready = deferred<string>(), pending = deferred<string>();
  const store = createAsyncStore<PromiseLike<string>>(ready.promise);
  const View = defineComponent("coherence-view", () => {
    const value = useAt(
      "data",
      useAt("resource-store", store) as PromiseLike<string>,
    ) as string;
    return jsx("p", {}, value);
  });
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const tree = () =>
    jsx(Suspense, {
      __nativeBoundarySite: "coherence-boundary",
      fallback: jsx("i", {}, "waiting"),
      children: jsx(View, {}),
    });
  root.mount(tree());
  ready.resolve("old");
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  store.dispatch(pending.promise);
  const candidate = root.prepare(tree());
  assert(
    candidate.blocked,
    "retained primary that re-suspends must block publication",
  );
  assert(!candidate.validate(), "blocked candidate cannot publish");
  candidate.discard();
  root.dispose();
});

Deno.test("suspended store reader survives local rejection and watches replacement identity", async () => {
  const rejected = deferred<string>(), replacement = deferred<string>();
  const store = createAsyncStore<PromiseLike<string>>(rejected.promise);
  const View = defineComponent("store-resource-view", () => {
    const value = useAt(
      "resource",
      useAt("store", store) as PromiseLike<string>,
    ) as string;
    return jsx("span", {}, value);
  });
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const tree = jsx(Suspense, {
    __nativeBoundarySite: "store-error-boundary",
    fallback: jsx("i", {}, "waiting"),
    error: (reason: unknown) => jsx("b", {}, `error:${String(reason)}`),
    children: jsx(View, {}),
  });
  root.mount(tree);
  rejected.reject("broken");
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  equal(text(container.children[0]), "error:broken");
  store.dispatch(replacement.promise);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  replacement.resolve("recovered");
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  equal(text(container.children[0]), "recovered");
  root.dispose();
});

Deno.test("retained primary keeps pending-primary source dependencies subscribed", async () => {
  const ready = deferred<string>(), never = deferred<string>(), replacement = deferred<string>();
  const sourceA = createAsyncStore<PromiseLike<string>>(ready.promise);
  const sourceB = createAsyncStore<PromiseLike<string>>(never.promise);
  const View = defineComponent(
    "retained-source-switch",
    (props: { source: ReturnType<typeof createAsyncStore<PromiseLike<string>>> }) =>
      jsx("b", {}, useAt(
        "unwrap",
        useAt("source", props.source) as PromiseLike<string>,
      ) as string),
  );
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const tree = (source: typeof sourceA) => jsx(Suspense, {
    __nativeBoundarySite: "retained-source-switch-boundary",
    fallback: jsx("i", {}, "waiting"),
    children: jsx(View, { source }),
  });
  root.mount(tree(sourceA));
  ready.resolve("old");
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  equal(text(container.children[0]), "old");

  publish(root, tree(sourceB));
  equal(text(container.children[0]), "old");
  sourceB.dispatch(replacement.promise);
  replacement.resolve("new");
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  equal(text(container.children[0]), "new");
  root.dispose();
});

Deno.test("resource-free arrays do not acquire per-child render savepoints", () => {
  const original = StoreRenderTransaction.prototype.checkpoint;
  let checkpoints = 0;
  StoreRenderTransaction.prototype.checkpoint = function () {
    checkpoints++;
    return original.call(this);
  };
  try {
    const host = new MemoryVDOMHost(), container = host.createContainer();
    const root = new ComponentStateRoot(host, container);
    root.mount(
      jsx(
        "main",
        {},
        Array.from(
          { length: 20 },
          (_, index) => jsx("span", {}, String(index)),
        ),
      ),
    );
    equal(checkpoints, 0);
    root.dispose();
  } finally {
    StoreRenderTransaction.prototype.checkpoint = original;
  }
});

Deno.test("discarded candidate store dependency leases outlive candidate release", () => {
  const store = createAsyncStore("watched");
  const View = defineComponent("leased-store-view", () => {
    const value = useAt("store", store) as string;
    return jsx(
      "span",
      {},
      `${value}:${String(useAt("pending", deferred<string>().promise))}`,
    );
  });
  const host = new MemoryVDOMHost(), container = host.createContainer();
  let scheduled = 0;
  const root = new ComponentStateRoot(host, container, {
    scheduleCommit: () => {
      scheduled++;
    },
  });
  const candidate = root.prepare(
    jsx(Suspense, {
      __nativeBoundarySite: "leased-store-boundary",
      fallback: jsx("i", {}, "waiting"),
      children: jsx(View, {}),
    }),
    { autoRetryResources: false },
  );
  const release = candidate.retainStoreDependencies();
  candidate.discard();
  assert(store.diagnostics().listeners > 0);
  store.dispatch("updated");
  assert(scheduled > 0, "lease notifications schedule candidate refresh");
  release();
  equal(store.diagnostics().listeners, 0);
  root.dispose();
});

Deno.test("hostile then getter is assimilated once and reaches local error renderer", () => {
  let reads = 0;
  const hostile = Object.defineProperty({}, "then", {
    get() {
      reads++;
      throw new Error("hostile getter");
    },
  });
  const View = defineComponent(
    "hostile-resource-view",
    () =>
      jsx(
        "span",
        {},
        String(useAt("resource", hostile as PromiseLike<string>)),
      ),
  );
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  root.mount(jsx(Suspense, {
    __nativeBoundarySite: "hostile-resource-boundary",
    error: (reason: unknown) => jsx("b", {}, String(reason)),
    children: jsx(View, {}),
  }));
  equal(reads, 1);
  equal(text(container.children[0]), "Error: hostile getter");
  root.dispose();
});

Deno.test("store read protocol takes precedence over an incidental then field", () => {
  const store = createAsyncStore("store-value") as
    & ReturnType<typeof createAsyncStore>
    & {
      then?: unknown;
    };
  let thenReads = 0;
  Object.defineProperty(store, "then", {
    get() {
      thenReads++;
      throw new Error("must not assimilate store");
    },
  });
  const View = defineComponent(
    "incidental-then-store",
    () => jsx("span", {}, String(useAt("store", store))),
  );
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  root.mount(jsx(View, {}));
  equal(thenReads, 0);
  equal(text(container.children[0]), "store-value");
  root.dispose();
});

Deno.test("disposing a root detaches resource settlement retries", async () => {
  const pending = deferred<string>();
  const View = defineComponent(
    "dispose-resource",
    () => jsx("span", {}, useAt("read", pending.promise) as string),
  );
  const host = new MemoryVDOMHost(), container = host.createContainer();
  let scheduled = 0;
  const root = new ComponentStateRoot(host, container, {
    scheduleCommit: (commit) => {
      scheduled++;
      commit();
    },
  });
  root.mount(jsx(Suspense, {
    __nativeBoundarySite: "dispose-boundary",
    fallback: jsx("p", {}, "wait"),
    children: jsx(View, {}),
  }));
  root.dispose();
  pending.resolve("done");
  await Promise.resolve();
  await Promise.resolve();
  equal(scheduled, 0);
});
