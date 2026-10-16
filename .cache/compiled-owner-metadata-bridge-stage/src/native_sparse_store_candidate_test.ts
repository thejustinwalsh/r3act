import {
  bindStatePropsAt,
  ComponentStateRoot,
  defineComponent,
  useAt,
  useEffectAt,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { AsyncResource } from "./async_resource_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const equal = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) {
    throw new Error(
      `${message}: expected ${String(expected)}, got ${String(actual)}`,
    );
  }
};
const textContent = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(textContent).join("");

Deno.test("sparse store candidates scale by all leaf readers and preserve reader state", () => {
  for (const size of [1_000, 10_000, 50_000]) {
    const store = createAsyncStore("before");
    const renders = new Map<string, number>();
    const setters = new Map<string, (value: number) => boolean>();
    let listRenders = 0;
    let plainRenders = 0;
    let effectSetups = 0;
    let effectCleanups = 0;
    const stableEffect = () => {
      effectSetups++;
      return () => effectCleanups++;
    };
    const Row = defineComponent<{ id: string }>(
      `sparse-store-row-${size}`,
      ({ id }) => {
        renders.set(id, (renders.get(id) ?? 0) + 1);
        const value = useStoreAt("value", store);
        const [local, setLocal] = useStateAt("local", 0);
        setters.set(id, setLocal);
        useEffectAt("stable-effect", stableEffect);
        return jsx("span", { "data-id": id }, `${id}:${value}:${local}`);
      },
      { propOnlySites: [], hostLeafOutput: true },
    );
    const List = defineComponent(`sparse-store-list-${size}`, () => {
      listRenders++;
      return Array.from({ length: size }, (_, index) => {
        const id = String(index);
        return jsx(Row, { id, key: id });
      });
    });
    const Plain = defineComponent(`sparse-store-plain-${size}`, () => {
      plainRenders++;
      return jsx("i", {}, "plain");
    });
    let setCounter!: (value: number) => boolean;
    const Counter = defineComponent(`sparse-store-counter-${size}`, () => {
      const [value, set] = useStateAt("value", 0);
      setCounter = set;
      return jsx("b", {}, `count:${value}`);
    });
    let counters: Readonly<Record<string, number>> = {};
    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    const root = new ComponentStateRoot(host, container, {
      rootId: `sparse-store-scale-${size}`,
      scheduleCommit: () => {},
      profileCounter: (next) => counters = next,
    });
    root.mount(
      jsx("main", {}, [jsx(List, {}), jsx(Plain, {}), jsx(Counter, {})]),
    );
    counters = {};

    equal(
      setters.get("0")?.(7),
      true,
      "reader-local state change was accepted",
    );
    store.dispatch("after");
    assert(root.flush(), "store-only flush did not commit");

    equal(listRenders, 1, "unrelated list owner did not rerender");
    equal(plainRenders, 1, "unrelated component did not rerender");
    equal(renders.get("0"), 2, "reader with local state rerendered once");
    equal(renders.get(String(size - 1)), 2, "last reader rerendered once");
    equal(
      textContent(container.children[0].children[0]),
      `0:after:7`,
      "reader state and store output",
    );
    equal(
      textContent(container.children[0].children[size - 1]),
      `${size - 1}:after:0`,
      "last reader store output",
    );
    equal(effectSetups, size, "unchanged effect setups were retained");
    equal(effectCleanups, 0, "unchanged effects were not cleaned up");
    equal(
      counters["store.sparse.reader-owner-renders"],
      size,
      "all readers refreshed",
    );
    equal(
      counters["store.sparse.eligibility-owner-visits"],
      size,
      "eligibility visited only reader owners",
    );
    equal(
      counters["store.sparse.reader-cache-lookups"],
      size,
      "candidate cache lookups are reader bounded",
    );
    equal(
      counters["store.sparse.live-reader-selection-visits"],
      size,
      "store selection visited each live reader once",
    );
    equal(
      counters["store.sparse.reader-publication-map-visits"],
      size * 2,
      "publication replaced the complete reader map in two linear passes",
    );
    equal(
      counters["store.sparse.subscription-reader-visits"],
      size,
      "subscription reconciliation visited the live reader footprint",
    );
    equal(
      counters["store.sparse.cache-patch-writes"],
      size,
      "publication wrote only reader caches",
    );
    equal(
      counters["store.sparse.keyed-output-edge-visits"],
      size,
      "publication refreshed one keyed output edge per reader",
    );
    equal(
      counters["store.sparse.effect-owner-visits"],
      size,
      "effect reconciliation visited only reader owners",
    );
    assert(
      (counters["store.sparse.ancestor-owner-visits"] ?? 0) <= size * 2,
      "ancestor invalidation followed only each reader's short lineage",
    );
    assert(
      (counters["store.sparse.ancestor-marker-writes"] ?? 0) <= 2,
      "ancestor invalidation wrote the shared ancestors once",
    );
    equal(
      counters["owner.component-visits"],
      size,
      "no component-array sibling scan occurred",
    );
    equal(
      counters["owner.component-renders"],
      size,
      "only the live store readers executed",
    );
    assert(
      (counters["store.sparse.output-tree-node-visits"] ?? 0) <= size * 20,
      "leaf output inspection stayed bounded by each reader's host subtree",
    );
    equal(
      counters["owner.cached-reused"] ?? 0,
      0,
      "sparse candidate did not enumerate unrelated caches",
    );
    equal(
      counters["store.sparse.generic-fallbacks"] ?? 0,
      0,
      "eligible readers used sparse candidate",
    );

    // A later generic update must descend through the stale list snapshot and
    // read each row's updated leaf cache, without resetting row state/effects.
    const firstRow = container.children[0].children[0];
    setCounter(1);
    assert(root.flush(), "unrelated generic state update did not flush");
    equal(
      textContent(container.children[0].children[0]),
      `0:after:7`,
      "generic update retained sparse output",
    );
    equal(
      container.children[0].children[0],
      firstRow,
      "generic update retained row host identity",
    );
    equal(
      renders.get("0"),
      3,
      "generic candidate refreshed the live store reader",
    );
    equal(
      textContent(container.children[0].children[size + 1]),
      "count:1",
      "generic update published sibling state",
    );
    equal(
      listRenders,
      1,
      "stale ancestor output was repaired without rerendering the list owner",
    );
    equal(
      effectSetups,
      size,
      "same effect registration identity stayed active",
    );
    equal(effectCleanups, 0, "same effect registrations did not clean up");
    root.dispose();
    equal(effectCleanups, size, "dispose cleaned up every row effect");
    equal(store.diagnostics().readers, 0, "all row store readers detached");
    equal(store.diagnostics().listeners, 0, "store subscription released");
  }
});

Deno.test("leaf reader source changes use the sparse transaction without store notifications", () => {
  const size = 10_000;
  const left = createAsyncStore("left");
  const right = createAsyncStore("right");
  let switchFirst!: (value: boolean) => boolean;
  const Row = defineComponent<{ id: number }>(
    "sparse-store-source-switch-row",
    ({ id }) => {
      const [useRight, setUseRight] = useStateAt("use-right", false);
      if (id === 0) switchFirst = setUseRight;
      const value = useStoreAt("value", useRight ? right : left);
      return jsx("span", { "data-id": id }, value);
    },
    { propOnlySites: [], hostLeafOutput: true },
  );
  const List = defineComponent(
    "sparse-store-source-switch-list",
    () => Array.from({ length: size }, (_, id) => jsx(Row, { id, key: id })),
  );
  let counters: Readonly<Record<string, number>> = {};
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "sparse-store-source-switch",
    scheduleCommit: () => {},
    profileCounter: (next) => counters = next,
  });
  root.mount(jsx("main", {}, jsx(List, {})));
  counters = {};

  equal(switchFirst(true), true, "source-switch state update was accepted");
  assert(root.flush(), "source-switch-only flush did not commit");
  equal(
    textContent(container.children[0].children[0]),
    "right",
    "changed reader follows its new store source",
  );
  equal(
    textContent(container.children[0].children[size - 1]),
    "left",
    "unchanged readers retain their prior source",
  );
  equal(
    counters["store.sparse.reader-owner-renders"],
    size,
    "source change refreshes the complete reader footprint",
  );
  equal(
    counters["store.sparse.live-reader-selection-visits"],
    size,
    "source change selects only current readers",
  );
  equal(
    counters["store.sparse.reader-publication-map-visits"],
    size * 2,
    "source change transactionally replaces the full reader map",
  );
  equal(
    counters["store.sparse.effect-owner-visits"],
    size,
    "source change reconciles only refreshed reader effects",
  );
  equal(
    counters["owner.component-visits"],
    size,
    "source change visits reader owners only",
  );
  equal(
    counters["store.sparse.generic-fallbacks"] ?? 0,
    0,
    "source change stays on the sparse path",
  );
  equal(left.diagnostics().readers, size - 1, "old source detached atomically");
  equal(right.diagnostics().readers, 1, "new source attached atomically");
  root.dispose();
});

Deno.test("sparse store candidate stages mixed numeric writes and propagates renderer errors", () => {
  const store = createAsyncStore("before");
  let setValue!: (value: number) => boolean;
  let writerRenders = 0;
  let throwOnce = false;
  const host = new class extends MemoryVDOMHost {
    writes: unknown[] = [];
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      if (name === "data-value") this.writes.push(value);
      super.setProp(node, name, value, previous);
    }
  }();
  const Reader = defineComponent("sparse-store-mixed-reader", () => {
    if (throwOnce) {
      throwOnce = false;
      throw new Error("reader failed once");
    }
    return jsx("span", {}, useStoreAt("value", store));
  }, { propOnlySites: [], hostLeafOutput: true });
  const Writer = defineComponent("sparse-store-mixed-writer", () => {
    writerRenders++;
    const [, set] = useStateAt("value", 0);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropsAt(["value"], ([value]) => value),
    });
  }, { propOnlySites: ["value"] });
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "sparse-store-mixed",
    scheduleCommit: () => {},
  });
  root.mount(jsx("main", {}, [jsx(Reader, {}), jsx(Writer, {})]));
  const output = container.children[0].children[1];
  host.writes.length = 0;
  store.dispatch("after");
  setValue(8);
  root.flush();
  equal(
    output.props["data-value"],
    8,
    "numeric prop updated with the store candidate",
  );
  equal(writerRenders, 1, "numeric writer owner stayed cached");
  equal(host.writes.join(","), "8", "numeric writer ran exactly once");
  setValue(0);
  root.flush();
  equal(
    output.props["data-value"],
    0,
    "returning to the original numeric value still writes",
  );
  equal(
    host.writes.join(","),
    "8,0",
    "numeric source history advanced on sparse publish",
  );

  store.dispatch("throw");
  throwOnce = true;
  let threw = false;
  try {
    root.flush();
  } catch (error) {
    threw = error instanceof Error && error.message === "reader failed once";
  }
  assert(
    threw,
    "user renderer exception propagated without a second speculative render",
  );
  equal(
    textContent(container.children[0].children[0]),
    "after",
    "failed candidate did not change host output",
  );
  root.dispose();
});

Deno.test("sparse candidates atomically switch the complete reader footprint", () => {
  const first = createAsyncStore("first");
  const second = createAsyncStore("second");
  let switchSource!: () => boolean;
  let renders = 0;
  const Reader = defineComponent("sparse-store-source-switch", () => {
    renders++;
    const [switched, setSwitched] = useStateAt("switch", false);
    switchSource = () => setSwitched(true);
    return jsx("span", {}, useStoreAt("value", switched ? second : first));
  }, { propOnlySites: [], hostLeafOutput: true });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "sparse-store-source-switch",
    scheduleCommit: () => {},
  });
  root.mount(jsx(Reader, {}));

  switchSource();
  first.dispatch("stale");
  assert(
    root.flush(),
    "source switch plus old-store notification did not flush",
  );
  equal(
    textContent(container.children[0]),
    "second",
    "candidate selected new store state",
  );
  equal(
    first.diagnostics().readers,
    0,
    "old reader footprint detached at publication",
  );
  equal(
    first.diagnostics().listeners,
    0,
    "old store subscription detached at publication",
  );
  equal(second.diagnostics().readers, 1, "new reader footprint published");
  equal(second.diagnostics().listeners, 1, "new store subscription published");
  equal(renders, 2, "reader executed once in the sparse candidate");

  first.dispatch("late");
  assert(!root.flush(), "detached old store did not schedule more work");
  second.dispatch("current");
  assert(root.flush(), "new store notification did not refresh the reader");
  equal(
    textContent(container.children[0]),
    "current",
    "new reader source stayed active",
  );
  equal(renders, 3, "new store update used a later sparse candidate");
  root.dispose();
  equal(
    second.diagnostics().readers,
    0,
    "new store reader released on teardown",
  );
  equal(
    second.diagnostics().listeners,
    0,
    "new store subscription released on teardown",
  );
});

Deno.test("unhinted conditional resource readers stay on the generic path", async () => {
  const store = createAsyncStore(false);
  const resource = new AsyncResource(Promise.resolve("ready"));
  await Promise.resolve();
  let renders = 0;
  const Reader = defineComponent("sparse-store-conditional-resource", () => {
    renders++;
    const show = useStoreAt("show", store);
    return jsx(
      "span",
      {},
      show ? useAt("resource", resource) as string : "hidden",
    );
  });
  let counters: Readonly<Record<string, number>> = {};
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "sparse-store-conditional-resource",
    scheduleCommit: () => {},
    profileCounter: (next) => counters = next,
  });
  root.mount(jsx(Reader, {}));
  counters = {};
  store.dispatch(true);
  assert(root.flush(), "store update did not flush");
  equal(
    textContent(container.children[0]),
    "ready",
    "generic fallback committed the resource value",
  );
  equal(
    counters["owner.component-renders"],
    1,
    "unhinted component executed once through the generic path",
  );
  equal(renders, 2, "generic path executed the reader only once for update");
  root.dispose();
});
