import {
  bindStatePropAt,
  ComponentStateRoot,
  defineComponent,
  renderCollectionAt,
  useEffectAt,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import {
  batchStorePublication,
  createAsyncStore,
} from "./async_store_runtime.ts";
import { createKeyedCollection } from "./keyed_collection.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const equal = (actual: unknown, expected: unknown, message: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${
        JSON.stringify(actual)
      }`,
    );
  }
};
const textContent = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(textContent).join("");

type RowData = { id: string; value: number };
const program = (sinkId: string, sourceSites: readonly string[]) => ({
  schemaVersion: 1 as const,
  sinkId,
  sourceSites,
});

Deno.test("mixed collection and compiled numeric work share one candidate", () => {
  const collection = createKeyedCollection<RowData>([
    { id: "a", value: 1 },
    { id: "b", value: 2 },
  ], (row) => row.id);
  let setValue!: (value: number) => boolean;
  let rootRenders = 0;
  let rowRenders = 0;
  const ref = { current: null as MemoryNode | null };
  const insertedRowEffectValues: unknown[] = [];
  const Row = defineComponent<{ row: RowData }>(
    "mixed-candidate-row",
    ({ row }) => {
      rowRenders++;
      useEffectAt("observe-numeric", () => {
        if (row.id === "c") {
          insertedRowEffectValues.push(ref.current?.props["data-value"]);
        }
      });
      return jsx("li", { "data-id": row.id }, `${row.id}:${row.value}`);
    },
  );
  const List = defineComponent<{ collection: typeof collection }>(
    "mixed-candidate-list",
    ({ collection: source }) =>
      jsx(
        "ul",
        {},
        renderCollectionAt("mixed-candidate-region", source, (row) =>
          jsx(Row, { row })),
      ),
  );
  const Root = defineComponent("mixed-candidate-root", () => {
    rootRenders++;
    const [, set] = useStateAt("value", 1);
    setValue = set;
    return jsx("section", {}, [
      jsx("output", {
        ref,
        "data-value": bindStatePropAt(
          "value",
          (value) => value * 10,
          program("mixed-candidate-root.data-value", ["value"]),
        ),
      }),
      jsx(List, { collection }),
    ]);
  }, { propOnlySites: ["value"] });

  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const counters: Array<Readonly<Record<string, number>>> = [];
  const root = new ComponentStateRoot(host, container, {
    scheduleCommit() {},
    profileCounter: (values) => counters.push(values),
  });
  root.mount(jsx(Root, {}));
  const list = container.children[0].children[1];
  const initialA = list.children[0];
  const initialB = list.children[1];
  const rendersAtMount = rowRenders;

  setValue(3);
  assert(
    collection.apply(collection.version, [
      {
        type: "insert",
        key: "c",
        value: { id: "c", value: 3 },
        beforeKey: "b",
      },
      { type: "move", key: "a", beforeKey: null },
    ]).ok,
    "collection batch rejected",
  );
  assert(root.flush(), "mixed candidate did not flush");

  equal(
    container.children[0].children[0].props["data-value"],
    30,
    "numeric write was not in the mixed host cut",
  );
  equal(
    list.children.map((node) => node.props["data-id"]),
    ["c", "b", "a"],
    "mixed collection order",
  );
  assert(
    list.children[1] === initialB && list.children[2] === initialA,
    "retained rows lost host identity",
  );
  assert(rootRenders === 1, "mixed candidate rerendered the root component");
  assert(rowRenders === rendersAtMount + 1, "only inserted row should render");
  equal(
    insertedRowEffectValues,
    [30],
    "inserted row effect ran before numeric host publication",
  );
  assert(
    (counters.at(-1)?.["collection.mixed-region-visits"] ?? 0) === 1,
    "mixed collection path was not used",
  );
  assert(
    (counters.at(-1)?.["collection.delta-operations"] ?? 0) === 2,
    "mixed operation work was not counted",
  );
  assert(
    (counters.at(-1)?.["numeric.candidate-batches"] ?? 0) === 1,
    "mixed numeric candidate did not contribute one batch",
  );
  assert(
    (counters.at(-1)?.["numeric.candidate-source-updates"] ?? 0) === 1,
    "mixed numeric candidate source update was not counted",
  );
  assert(!root.flush(), "mixed publication left captured work pending");
  root.dispose();
});

Deno.test("preparePending composes queued numeric and collection cuts without host writes", () => {
  const collection = createKeyedCollection<RowData>(
    [{ id: "a", value: 1 }],
    (row) => row.id,
  );
  const store = createAsyncStore(
    "before",
    (_state: string, action: string) => action,
  );
  let setValue!: (value: number) => boolean;
  const Row = defineComponent<{ row: RowData }>(
    "mixed-prepare-row",
    ({ row }) => jsx("li", { "data-id": row.id }, row.id),
  );
  const List = defineComponent<{ collection: typeof collection }>(
    "mixed-prepare-list",
    ({ collection: source }) =>
      jsx(
        "ul",
        {},
        renderCollectionAt("mixed-prepare-region", source, (row) =>
          jsx(Row, { row })),
      ),
  );
  const Root = defineComponent("mixed-prepare-root", () => {
    const [, set] = useStateAt("value", 1);
    setValue = set;
    return jsx("section", {}, [
      jsx("output", {
        value: bindStatePropAt(
          "value",
          (value) => value,
          program("mixed-prepare-root.value", ["value"]),
        ),
      }),
      jsx(List, { collection }),
    ]);
  }, { propOnlySites: ["value"] });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  root.mount(jsx(Root, {}));
  setValue(5);
  collection.apply(collection.version, [
    { type: "insert", key: "b", value: { id: "b", value: 2 }, beforeKey: null },
  ]);

  const candidate = root.preparePending();
  if (!candidate) throw new Error("pending work did not produce a candidate");
  assert(candidate.validate(), "prepared mixed candidate was not valid");
  equal(
    container.children[0].children[0].props.value,
    1,
    "prepare wrote numeric host props",
  );
  equal(
    container.children[0].children[1].children.map((node) =>
      node.props["data-id"]
    ),
    ["a"],
    "prepare wrote collection topology",
  );
  candidate.commitHost();
  candidate.publish();
  candidate.runEffects();
  equal(
    container.children[0].children[0].props.value,
    5,
    "candidate numeric host prop",
  );
  equal(
    container.children[0].children[1].children.map((node) =>
      node.props["data-id"]
    ),
    ["a", "b"],
    "candidate collection topology",
  );
  root.dispose();
});

Deno.test("preparePending returns null only for no work and otherwise falls back coherently", () => {
  let setValue!: (value: number) => boolean;
  const App = defineComponent("pending-fallback-app", () => {
    const [value, set] = useStateAt("value", 1);
    setValue = set;
    return jsx("output", { value });
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  root.mount(jsx(App, {}));
  assert(
    root.preparePending() === null,
    "empty pending cut produced a candidate",
  );
  setValue(2);
  const candidate = root.preparePending();
  if (!candidate) throw new Error("unsupported pending work did not fall back");
  equal(
    container.children[0].props.value,
    1,
    "fallback prepare wrote before commit",
  );
  candidate.commitHost();
  candidate.publish();
  candidate.runEffects();
  equal(
    container.children[0].props.value,
    2,
    "fallback pending candidate lost state",
  );
  root.dispose();
});

Deno.test("mixed candidate prunes transient private rows and rerenders replaced private rows", () => {
  const collection = createKeyedCollection<RowData>([], (row) => row.id);
  const setups: string[] = [];
  const cleanups: string[] = [];
  const setters: Array<(value: number) => boolean> = [];
  const publishedSetters = new Map<string, (value: number) => boolean>();
  const cleanupSetterResults: boolean[] = [];
  let setTick!: (value: number) => boolean;
  const Row = defineComponent<{ row: RowData }>(
    "mixed-transient-row",
    ({ row }) => {
      const [count, setCount] = useStateAt("count", 0);
      setters.push(setCount);
      useEffectAt("effect", () => {
        setups.push(`${row.value}:${count}`);
        publishedSetters.set(row.id, setCount);
        return () => {
          cleanups.push(`${row.value}:${count}`);
          cleanupSetterResults.push(setCount(count + 1));
          publishedSetters.delete(row.id);
        };
      });
      return jsx(
        "li",
        { "data-id": row.id, "data-count": count },
        `${row.value}:${count}`,
      );
    },
  );
  const List = defineComponent<{ collection: typeof collection }>(
    "mixed-transient-list",
    ({ collection: source }) =>
      jsx(
        "ul",
        {},
        renderCollectionAt("mixed-transient-region", source, (row) =>
          jsx(Row, { row })),
      ),
  );
  const Root = defineComponent("mixed-transient-root", () => {
    const [, set] = useStateAt("tick", 0);
    setTick = set;
    return jsx("section", {}, [
      jsx("output", {
        value: bindStatePropAt(
          "tick",
          (value) => value,
          program("mixed-transient-root.value", ["tick"]),
        ),
      }),
      jsx(List, { collection }),
    ]);
  }, { propOnlySites: ["tick"] });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  root.mount(jsx(Root, {}));

  setTick(1);
  assert(
    collection.apply(collection.version, [
      {
        type: "insert",
        key: "x",
        value: { id: "x", value: 1 },
        beforeKey: null,
      },
      { type: "replace", key: "x", value: { id: "x", value: 2 } },
    ]).ok,
    "insert/replace batch rejected",
  );
  root.flush();
  equal(
    textContent(container.children[0].children[1].children[0]),
    "2:0",
    "insert then replace did not publish winning row",
  );
  equal(setups, ["2:0"], "superseded private row effect ran");

  const firstInsertSetter = setters.at(-1)!;
  const retiringSetter = publishedSetters.get("x")!;
  assert(
    firstInsertSetter === retiringSetter,
    "committed row setter was not registered",
  );
  setTick(2);
  assert(
    collection.apply(collection.version, [
      { type: "remove", key: "x" },
      {
        type: "insert",
        key: "x",
        value: { id: "x", value: 3 },
        beforeKey: null,
      },
    ]).ok,
    "remove/insert batch rejected",
  );
  root.flush();
  equal(
    textContent(container.children[0].children[1].children[0]),
    "3:0",
    "remove then insert did not reset row state",
  );
  let staleSetterThrew = false;
  try {
    firstInsertSetter(4);
  } catch {
    staleSetterThrew = true;
  }
  assert(staleSetterThrew, "removed private row setter remained active");
  assert(
    cleanupSetterResults[0],
    "retiring setter was invalidated before its cleanup ran",
  );
  assert(
    publishedSetters.get("x") === setters.at(-1),
    "old cleanup removed the fresh same-key setter",
  );
  equal(setups, ["2:0", "3:0"], "only committed row effects should run");
  equal(cleanups, ["2:0"], "committed replaced row should clean up once");
  root.dispose();
  equal(cleanups, ["2:0", "3:0"], "final row cleanup did not run");
});

Deno.test("mixed candidate folds collection-row and outside store readers into one cut", () => {
  const collection = createKeyedCollection<RowData>(
    [{ id: "a", value: 1 }],
    (row) => row.id,
  );
  const store = createAsyncStore(
    "before",
    (_state: string, action: string) => action,
  );
  let listRenders = 0;
  let rowRenders = 0;
  let outsideRenders = 0;
  let counters: Readonly<Record<string, number>> = {};
  const Row = defineComponent<{ row: RowData }>(
    "mixed-store-row",
    ({ row }) => {
      rowRenders++;
      const status = useStoreAt("status", store);
      return jsx(
        "li",
        { "data-id": row.id, "data-status": status },
        `${row.id}:${status}`,
      );
    },
  );
  const List = defineComponent<{ collection: typeof collection }>(
    "mixed-store-list",
    ({ collection: source }) => {
      listRenders++;
      return jsx(
        "ul",
        {},
        renderCollectionAt(
          "mixed-store-region",
          source,
          (row) => jsx(Row, { row }),
        ),
      );
    },
  );
  const OutsideReader = defineComponent("mixed-store-outside-reader", () => {
    outsideRenders++;
    return jsx("output", { "data-status": useStoreAt("status", store) });
  }, { propOnlySites: [], hostLeafOutput: true });
  const App = defineComponent(
    "mixed-store-app",
    () => jsx("main", {}, [jsx(List, { collection }), jsx(OutsideReader, {})]),
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    scheduleCommit() {},
    profileCounter: (next) => counters = next,
  });
  root.mount(jsx(App, {}));
  const initialRow = container.children[0].children[0].children[0];
  store.dispatch("after");
  assert(
    collection.apply(collection.version, [
      {
        type: "insert",
        key: "b",
        value: { id: "b", value: 2 },
        beforeKey: null,
      },
    ]).ok,
    "collection batch rejected",
  );
  assert(root.flush(), "mixed store and collection cut did not flush");

  const list = container.children[0].children[0];
  assert(
    list.children[0] === initialRow,
    "store refresh replaced the retained collection host row",
  );
  equal(list.children.map((node) => node.props["data-status"]), [
    "after",
    "after",
  ], "collection store readers did not share store cut");
  equal(
    container.children[0].children[1].props["data-status"],
    "after",
    "outside store reader missed the same cut",
  );
  assert(
    listRenders === 1,
    "mixed store candidate rerendered collection ancestor",
  );
  assert(
    outsideRenders === 2,
    "outside store reader was not refreshed exactly once",
  );
  assert(
    rowRenders === 3,
    "retained and inserted rows did not render in the shared cut",
  );
  assert(
    counters["collection.mixed-region-visits"] === 1,
    "store cut did not use mixed collection path",
  );
  assert(
    counters["collection.mixed-store-reader-visits"] === 2,
    "mixed reader lookup was not reader-bounded",
  );
  root.dispose();
});

Deno.test("mixed row replacement switches store readers without a store dispatch", () => {
  const first = createAsyncStore(
    "first",
    (_state: string, action: string) => action,
  );
  const second = createAsyncStore(
    "second",
    (_state: string, action: string) => action,
  );
  const collection = createKeyedCollection<{ id: string; store: typeof first }>(
    [
      { id: "a", store: first },
    ],
    (row) => row.id,
  );
  let setTick!: (value: number) => boolean;
  let rowRenders = 0;
  const Row = defineComponent<{ row: { id: string; store: typeof first } }>(
    "mixed-switch-row",
    ({ row }) => {
      rowRenders++;
      return jsx(
        "li",
        { "data-value": useStoreAt("value", row.store) },
        row.id,
      );
    },
  );
  const List = defineComponent<{ collection: typeof collection }>(
    "mixed-switch-list",
    ({ collection: source }) =>
      jsx(
        "ul",
        {},
        renderCollectionAt("mixed-switch-region", source, (row) =>
          jsx(Row, { row })),
      ),
  );
  const Root = defineComponent("mixed-switch-root", () => {
    const [, set] = useStateAt("tick", 0);
    setTick = set;
    return jsx("section", {}, [
      jsx("output", {
        value: bindStatePropAt(
          "tick",
          (value) => value,
          program("mixed-switch-root.value", ["tick"]),
        ),
      }),
      jsx(List, { collection }),
    ]);
  }, { propOnlySites: ["tick"] });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  root.mount(jsx(Root, {}));
  setTick(1);
  assert(
    collection.apply(collection.version, [
      { type: "replace", key: "a", value: { id: "a", store: second } },
    ]).ok,
    "row replacement rejected",
  );
  root.flush();
  assert(rowRenders === 2, "replacement row did not render in mixed candidate");
  equal(
    container.children[0].children[1].children[0].props["data-value"],
    "second",
    "replacement did not read its new store",
  );

  first.dispatch("old");
  assert(!root.flush(), "superseded store reader remained subscribed");
  second.dispatch("new");
  assert(root.flush(), "new store reader was not subscribed");
  equal(
    container.children[0].children[1].children[0].props["data-value"],
    "new",
    "new store dispatch did not refresh row",
  );
  root.dispose();
});

Deno.test("stale mixed candidate leaves host, effects, and collection cut untouched", () => {
  const collection = createKeyedCollection<RowData>(
    [{ id: "a", value: 1 }],
    (row) => row.id,
  );
  const store = createAsyncStore(
    "before",
    (_state: string, action: string) => action,
  );
  let setValue!: (value: number) => boolean;
  const setups: string[] = [];
  const Row = defineComponent<{ row: RowData }>(
    "mixed-stale-row",
    ({ row }) => {
      const status = useStoreAt("status", store);
      useEffectAt("setup", () => {
        setups.push(row.id);
      });
      return jsx("li", { "data-id": row.id, "data-status": status }, row.id);
    },
  );
  const List = defineComponent<{ collection: typeof collection }>(
    "mixed-stale-list",
    ({ collection: source }) =>
      jsx(
        "ul",
        {},
        renderCollectionAt("mixed-stale-region", source, (row) =>
          jsx(Row, { row })),
      ),
  );
  const Root = defineComponent("mixed-stale-root", () => {
    const [, set] = useStateAt("value", 1);
    setValue = set;
    return jsx("section", {}, [
      jsx("output", {
        value: bindStatePropAt(
          "value",
          (value) => value,
          program("mixed-stale-root.value", ["value"]),
        ),
      }),
      jsx(List, { collection }),
    ]);
  }, { propOnlySites: ["value"] });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  root.mount(jsx(Root, {}));
  const listBefore = container.children[0].children[1].children.slice();
  setValue(2);
  store.dispatch("middle");
  assert(
    collection.apply(collection.version, [
      {
        type: "insert",
        key: "b",
        value: { id: "b", value: 2 },
        beforeKey: null,
      },
    ]).ok,
    "collection batch rejected",
  );
  const candidate = root.preparePending();
  if (!candidate) throw new Error("mixed pending work did not prepare");
  setValue(3);
  store.dispatch("after");
  assert(
    collection.apply(collection.version, [
      {
        type: "insert",
        key: "c",
        value: { id: "c", value: 3 },
        beforeKey: null,
      },
    ]).ok,
    "post-prepare collection batch rejected",
  );
  assert(!candidate.validate(), "stale mixed candidate remained valid");
  candidate.discard();
  equal(
    container.children[0].children[0].props.value,
    1,
    "stale candidate wrote numeric host prop",
  );
  assert(
    container.children[0].children[1].children[0] === listBefore[0],
    "stale candidate changed retained host identity",
  );
  equal(
    container.children[0].children[1].children.length,
    1,
    "stale candidate changed collection topology",
  );
  equal(
    container.children[0].children[1].children[0].props["data-status"],
    "before",
    "stale candidate wrote store output",
  );
  equal(setups, ["a"], "stale candidate ran effects before commit");

  assert(root.flush(), "later fresh mixed candidate did not publish");
  equal(
    container.children[0].children[0].props.value,
    3,
    "fresh mixed candidate lost newer state",
  );
  equal(
    container.children[0].children[1].children.map((node) =>
      node.props["data-id"]
    ),
    ["a", "b", "c"],
    "fresh mixed candidate lost collection batch",
  );
  equal(
    container.children[0].children[1].children.map((node) =>
      node.props["data-status"]
    ),
    ["after", "after", "after"],
    "fresh mixed candidate lost store version",
  );
  equal(
    setups,
    ["a", "b", "c"],
    "fresh mixed candidate effects did not run once",
  );
  assert(
    !root.flush(),
    "stale candidate acknowledged work that should remain pending",
  );
  root.dispose();
});

Deno.test("post-host reentry makes a mixed candidate terminal before effects", () => {
  const collection = createKeyedCollection<RowData>(
    [{ id: "a", value: 1 }],
    (row) => row.id,
  );
  let setValue!: (value: number) => boolean;
  let armed = false;
  const setups: string[] = [];
  class ReentrantHost extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      super.setProp(node, name, value, previous);
      if (armed && name === "data-value" && value === 2) {
        armed = false;
        setValue(3);
      }
    }
  }
  const Row = defineComponent<{ row: RowData }>(
    "mixed-terminal-row",
    ({ row }) => {
      useEffectAt("setup", () => {
        setups.push(row.id);
      });
      return jsx("li", { "data-id": row.id }, row.id);
    },
  );
  const List = defineComponent<{ collection: typeof collection }>(
    "mixed-terminal-list",
    ({ collection: source }) =>
      jsx(
        "ul",
        {},
        renderCollectionAt("mixed-terminal-region", source, (row) =>
          jsx(Row, { row })),
      ),
  );
  const Root = defineComponent("mixed-terminal-root", () => {
    const [value, set] = useStateAt("value", 1);
    setValue = set;
    return jsx("section", {}, [
      jsx("output", {
        "data-value": bindStatePropAt(
          "value",
          (next) => next,
          program("mixed-terminal-root.value", ["value"]),
        ),
      }),
      jsx(List, { collection }),
    ]);
  }, { propOnlySites: ["value"] });
  const host = new ReentrantHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  root.mount(jsx(Root, {}));
  setValue(2);
  collection.apply(collection.version, [
    { type: "insert", key: "b", value: { id: "b", value: 2 }, beforeKey: null },
  ]);
  const candidate = root.preparePending();
  if (!candidate) throw new Error("mixed pending work did not prepare");
  armed = true;
  candidate.commitHost();
  let publishFailed = false;
  try {
    candidate.publish();
  } catch {
    publishFailed = true;
  }
  assert(
    publishFailed,
    "post-host reentry did not invalidate candidate publication",
  );
  equal(setups, ["a"], "candidate effects ran after stale host commit");
  let terminal = false;
  try {
    root.flush();
  } catch {
    terminal = true;
  }
  assert(terminal, "post-host stale root was not terminal");
  root.dispose();
});

Deno.test("shared-store mixed candidates coordinate across roots with transitions", () => {
  const world = new OwnerStateWorld();
  const store = createAsyncStore(0, (_state: number, action: number) => action);
  const collectionA = createKeyedCollection<RowData>(
    [{ id: "a0", value: 0 }],
    (row) => row.id,
  );
  const collectionB = createKeyedCollection<RowData>(
    [{ id: "b0", value: 0 }],
    (row) => row.id,
  );
  const hostA = new MemoryVDOMHost();
  const hostB = new MemoryVDOMHost();
  const containerA = hostA.createContainer();
  const containerB = hostB.createContainer();
  const rootA = new ComponentStateRoot(hostA, containerA, {
    world,
    rootId: "mixed-group-a",
    scheduleCommit() {},
  });
  const rootB = new ComponentStateRoot(hostB, containerB, {
    world,
    rootId: "mixed-group-b",
    scheduleCommit() {},
  });
  const observedGroupState: boolean[] = [];
  let listRendersA = 0;
  let listRendersB = 0;
  const Row = defineComponent<{ row: RowData }>(
    "mixed-group-row",
    ({ row }) => {
      const value = useStoreAt("value", store);
      useEffectAt("observe-group", () => {
        if (row.id.endsWith("1")) {
          observedGroupState.push(
            containerA.children[0]?.children[0]?.children.some((node) =>
                  node.props["data-id"] === "a1"
                ) === true &&
              containerB.children[0]?.children[0]?.children.some((node) =>
                  node.props["data-id"] === "b1"
                ) === true,
          );
        }
      });
      return jsx("li", { "data-id": row.id, "data-store": value }, row.id);
    },
  );
  const ListA = defineComponent<{ collection: typeof collectionA }>(
    "mixed-group-list-a",
    ({ collection }) => {
      listRendersA++;
      return jsx(
        "ul",
        {},
        renderCollectionAt(
          "mixed-group-region-a",
          collection,
          (row) => jsx(Row, { row }),
        ),
      );
    },
  );
  const ListB = defineComponent<{ collection: typeof collectionB }>(
    "mixed-group-list-b",
    ({ collection }) => {
      listRendersB++;
      return jsx(
        "ul",
        {},
        renderCollectionAt(
          "mixed-group-region-b",
          collection,
          (row) => jsx(Row, { row }),
        ),
      );
    },
  );
  const AppA = defineComponent(
    "mixed-group-app-a",
    () => jsx("main", {}, jsx(ListA, { collection: collectionA })),
  );
  const AppB = defineComponent(
    "mixed-group-app-b",
    () => jsx("main", {}, jsx(ListB, { collection: collectionB })),
  );
  rootA.mount(jsx(AppA, {}));
  rootB.mount(jsx(AppB, {}));
  observedGroupState.length = 0;

  const retainedA = containerA.children[0].children[0].children[0];
  const retainedB = containerB.children[0].children[0].children[0];
  store.beginTransition("shared-transition", [rootA.rootId, rootB.rootId]);
  store.dispatch(1, {
    kind: "transition",
    transitionId: "shared-transition",
  });
  equal(
    store.getStateForRoot(rootA.rootId),
    0,
    "first root exposed pending transition early",
  );
  equal(
    store.getStateForRoot(rootB.rootId),
    0,
    "second root exposed pending transition early",
  );
  assert(
    collectionA.apply(collectionA.version, [
      {
        type: "insert",
        key: "a1",
        value: { id: "a1", value: 1 },
        beforeKey: null,
      },
    ]).ok,
    "first root collection batch rejected",
  );
  assert(
    collectionB.apply(collectionB.version, [
      {
        type: "insert",
        key: "b1",
        value: { id: "b1", value: 1 },
        beforeKey: null,
      },
    ]).ok,
    "second root collection batch rejected",
  );
  const candidateA = rootA.preparePending({
    transitions: ["shared-transition"],
  });
  const candidateB = rootB.preparePending({
    transitions: ["shared-transition"],
  });
  if (!candidateA || !candidateB) {
    throw new Error("both roots must prepare mixed candidates");
  }
  equal(
    candidateA.transitions,
    ["shared-transition"],
    "first root transition scope",
  );
  equal(
    candidateB.transitions,
    ["shared-transition"],
    "second root transition scope",
  );
  assert(
    candidateA.validate() && candidateB.validate(),
    "transition candidates were stale before commit",
  );
  candidateA.commitHost();
  candidateB.commitHost();
  candidateA.publish();
  candidateB.publish();
  equal(
    store.getStateForRoot(rootA.rootId),
    0,
    "first root committed before transition batch",
  );
  equal(
    store.getStateForRoot(rootB.rootId),
    0,
    "second root committed before transition batch",
  );
  assert(
    containerA.children[0].children[0].children[0] === retainedA,
    "first root transition replaced retained row",
  );
  assert(
    containerB.children[0].children[0].children[0] === retainedB,
    "second root transition replaced retained row",
  );
  batchStorePublication(() => {
    store.commitTransitionRoots(
      "shared-transition",
      [rootA.rootId, rootB.rootId],
      { finish: true },
    );
  });
  equal(
    store.getStateForRoot(rootA.rootId),
    1,
    "first root transition projection was not committed",
  );
  equal(
    store.getStateForRoot(rootB.rootId),
    1,
    "second root transition projection was not committed",
  );
  equal(
    store.diagnostics().transitions,
    0,
    "committed transition scope remained open",
  );
  candidateA.runEffects();
  candidateB.runEffects();
  assert(
    observedGroupState.length >= 2,
    "mixed store row effects did not run in both roots",
  );
  assert(
    observedGroupState.every(Boolean),
    "an effect observed a partially published root group",
  );
  equal(
    containerA.children[0].children[0].children.map((node) =>
      node.props["data-store"]
    ),
    [1, 1],
    "first root shared-store cut",
  );
  equal(
    containerB.children[0].children[0].children.map((node) =>
      node.props["data-store"]
    ),
    [1, 1],
    "second root shared-store cut",
  );
  assert(
    listRendersA === 1 && listRendersB === 1,
    "mixed transition rerendered collection owners",
  );
  rootA.dispose();
  rootB.dispose();
});
