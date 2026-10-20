import {
  bindStatePropsAt,
  ComponentStateRoot,
  defineComponent,
  renderCollectionAt,
  Suspense,
  useAt,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { createKeyedCollection } from "./keyed_collection.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const equal = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
};
const textContent = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(textContent).join("");
const harness = (
  rootId: string,
  host = new MemoryVDOMHost(),
  renderPreparation?: "repeatable",
) => {
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId,
    scheduleCommit: () => {},
    renderPreparation,
  });
  return { root, container };
};

Deno.test("store flush rerenders live reader owners and reuses disjoint cached owners", () => {
  const leftStore = createAsyncStore("left-0");
  const rightStore = createAsyncStore("right-0");
  let leftRenders = 0;
  let rightRenders = 0;
  let plainRenders = 0;
  const Left = defineComponent("store-invalidation-left", () => {
    leftRenders++;
    return jsx("span", { id: "left" }, useStoreAt("value", leftStore));
  });
  const Right = defineComponent("store-invalidation-right", () => {
    rightRenders++;
    return jsx("span", { id: "right" }, useStoreAt("value", rightStore));
  });
  const Plain = defineComponent("store-invalidation-plain", () => {
    plainRenders++;
    return jsx("i", {}, "plain");
  });
  const { root, container } = harness("store-owner-invalidation-disjoint");
  root.mount(jsx("main", {}, [jsx(Left, {}), jsx(Right, {}), jsx(Plain, {})]));
  leftStore.dispatch("left-1");
  assert(root.flush(), "store notification did not flush");
  equal(textContent(container.children[0]), "left-1right-0plain", "store output");
  equal(leftRenders, 2, "changed store reader render count");
  equal(rightRenders, 2, "all live reader owners are refreshed to retain their read footprints");
  equal(plainRenders, 1, "unrelated store-free owner should reuse its cache");
  root.dispose();
  equal(leftStore.diagnostics().listeners, 0, "left subscription cleanup");
  equal(rightStore.diagnostics().listeners, 0, "right subscription cleanup");
  equal(leftStore.diagnostics().readers, 0, "left reader cleanup");
  equal(rightStore.diagnostics().readers, 0, "right reader cleanup");
});

Deno.test("store and collection notifications refresh their shared owner in one selective candidate", () => {
  type Row = { id: string; label: string };
  const collection = createKeyedCollection<Row>([{ id: "a", label: "A" }], (row) => row.id);
  const status = createAsyncStore("ready-0");
  let listRenders = 0;
  let plainRenders = 0;
  const RowView = defineComponent<{ row: Row }>(
    "store-collection-row",
    ({ row }) => jsx("li", { "data-id": row.id }, row.label),
  );
  const List = defineComponent("store-collection-list", () => {
    listRenders++;
    const current = useStoreAt("status", status);
    return jsx("section", {}, [
      jsx("b", {}, current),
      jsx("ul", {}, renderCollectionAt(
        "store-collection-region",
        collection,
        (row) => jsx(RowView, { row }),
      )),
    ]);
  });
  const Plain = defineComponent("store-collection-plain", () => {
    plainRenders++;
    return jsx("i", {}, "stable");
  });
  const { root, container } = harness("store-owner-invalidation-collection");
  root.mount(jsx("main", {}, [jsx(List, {}), jsx(Plain, {})]));
  collection.apply(collection.version, [
    { type: "insert", key: "b", value: { id: "b", label: "B" }, beforeKey: null },
  ]);
  status.dispatch("ready-1");
  assert(root.flush(), "combined store and collection work did not flush");
  const list = container.children[0].children[0];
  equal(textContent(list), "ready-1AB", "combined candidate sees both current snapshots");
  equal(listRenders, 2, "collection/store owner should render once");
  equal(plainRenders, 1, "disjoint store-free owner should remain cached");
  assert(!root.flush(), "combined notifications should be consumed once");
  root.dispose();
});

Deno.test("local numeric writes remain coherent beside store invalidation without rerunning their owner", () => {
  const store = createAsyncStore("A");
  let setHot!: (value: number) => boolean;
  let hotRenders = 0;
  const Badge = defineComponent("store-invalidation-numeric-badge", () =>
    jsx("label", {}, useStoreAt("label", store))
  );
  const Hot = defineComponent("store-invalidation-numeric-hot", () => {
    hotRenders++;
    const [_value, set] = useStateAt("value", 0);
    setHot = set;
    return jsx("output", {
      "data-value": bindStatePropsAt(["value"], ([value]) => value),
    });
  }, { propOnlySites: ["value"] });
  const { root, container } = harness("store-owner-invalidation-numeric");
  root.mount(jsx("main", {}, [jsx(Badge, {}), jsx(Hot, {})]));
  const output = container.children[0].children[1];
  store.dispatch("B");
  setHot(1);
  assert(root.flush(), "combined store and numeric work did not flush");
  equal(textContent(container.children[0]), "B", "store value publication");
  equal(output.props["data-value"], 1, "numeric prop publication");
  equal(hotRenders, 1, "coordinated store and numeric work stages props without rerendering the writer owner");
  root.dispose();
});

Deno.test("selective store candidate switches reader sources and releases stale subscriptions", () => {
  const first = createAsyncStore("first");
  const second = createAsyncStore("second");
  let switchSource!: () => boolean;
  let renders = 0;
  const Reader = defineComponent("store-invalidation-switch", () => {
    renders++;
    const [switched, setSwitched] = useStateAt("switch", false);
    switchSource = () => setSwitched(true);
    const value = useStoreAt("value", switched ? second : first);
    return jsx("span", {}, value);
  });
  const { root, container } = harness("store-owner-invalidation-switch");
  root.mount(jsx(Reader, {}));
  switchSource();
  assert(root.flush(), "source switch did not flush");
  equal(textContent(container.children[0]), "second", "new source value");
  equal(first.diagnostics().listeners, 0, "old source listener detached");
  equal(first.diagnostics().readers, 0, "old source reader detached");
  equal(second.diagnostics().listeners, 1, "new source listener attached");
  first.dispatch("stale");
  assert(!root.flush(), "detached source must not schedule a render");
  equal(renders, 2, "detached source must not rerender the owner");
  second.dispatch("current");
  assert(root.flush(), "current source update was not observed");
  equal(textContent(container.children[0]), "current", "current source update");
  root.dispose();
  equal(second.diagnostics().listeners, 0, "new source listener cleanup");
  equal(second.diagnostics().readers, 0, "new source reader cleanup");
});

Deno.test("selective store candidates retry a reentrant stale read cut before host writes", () => {
  const first = createAsyncStore(0, (state: number, action: number) => state + action);
  const second = createAsyncStore(0, (state: number, action: number) => state + action);
  let reenter = false;
  const selection = first.select((state) => {
    if (reenter) {
      reenter = false;
      second.dispatch(1);
    }
    return state;
  });
  const Pair = defineComponent("store-invalidation-reentrant", () => {
    const left = useStoreAt("left", selection);
    const right = useStoreAt("right", second);
    return jsx("span", {}, `${left},${right}`);
  });
  const writes: string[] = [];
  class RecordingHost extends MemoryVDOMHost {
    override setText(node: MemoryNode, value: string) {
      writes.push(value);
      super.setText(node, value);
    }
  }
  const { root, container } = harness(
    "store-owner-invalidation-reentrant",
    new RecordingHost(),
    "repeatable",
  );
  root.mount(jsx(Pair, {}));
  reenter = true;
  first.dispatch(1);
  assert(root.flush(), "store notification did not flush");
  equal(textContent(container.children[0]), "1,1", "retried candidate uses a coherent read cut");
  equal(writes.join("|"), "1,1", "stale candidate did not write before retry");
  root.dispose();
});

Deno.test("settled resource retry stays full when scalar and collection work is queued", async () => {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((yes) => resolve = yes);
  const collection = createKeyedCollection([{ id: "a" }], (row) => row.id);
  let setCount!: (value: number) => boolean;
  const AsyncValue = defineComponent("store-invalidation-resource-value", () =>
    jsx("b", {}, useAt("value", promise) as string)
  );
  const View = defineComponent("store-invalidation-resource-root", () => {
    const [count, set] = useStateAt("count", 0);
    setCount = set;
    return jsx("section", {}, [
      jsx("i", {}, `count:${count}`),
      jsx("ul", {}, renderCollectionAt(
        "store-invalidation-resource-region",
        collection,
        (row) => jsx("li", { "data-id": row.id }, row.id),
      )),
      jsx(Suspense, {
        __nativeBoundarySite: "store-invalidation-resource-boundary",
        fallback: jsx("em", {}, "pending"),
        children: jsx(AsyncValue, {}),
      }),
    ]);
  });
  const { root, container } = harness("store-owner-invalidation-resource");
  root.mount(jsx(View, {}));
  equal(textContent(container.children[0]), "count:0apending", "pending tree");
  resolve("settled");
  setCount(1);
  collection.apply(collection.version, [{
    type: "insert",
    key: "b",
    value: { id: "b" },
    beforeKey: null,
  }]);
  await new Promise<void>((done) => setTimeout(done, 0));
  assert(root.flush(), "combined resource, scalar, and collection work did not flush");
  equal(textContent(container.children[0]), "count:1absettled", "full retry publishes all current inputs");
  root.dispose();
});
