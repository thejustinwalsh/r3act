import {
  ComponentStateRoot,
  bindStatePropsAt,
  defineComponent,
  renderCollectionAt,
  useEffectAt,
  useStateAt,
} from "./component_state_runtime.ts";
import { createKeyedCollection, type KeyedCollectionOperation } from "./keyed_collection.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const equal = (actual: unknown, expected: unknown, message: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};
const textContent = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(textContent).join("");
const flushMicrotasks = async () => await new Promise<void>((resolve) => queueMicrotask(resolve));

type RowData = { id: string; value: number };

Deno.test("same-site collections under distinct hosts keep independent row owners", () => {
  const leftRows = createKeyedCollection<RowData>([{ id: "a", value: 1 }], row => row.id);
  const rightRows = createKeyedCollection<RowData>([{ id: "a", value: 10 }], row => row.id);
  const setters = new Map<string, (value: number) => boolean>();
  const Row = defineComponent<{ side: string; row: RowData }>(
    "fixture.host-scoped-collection-row",
    ({ side, row }) => {
      const [count, setCount] = useStateAt("fixture.host-scoped-collection-count", 0);
      setters.set(side, setCount);
      return jsx("li", { key: row.id, "data-side": side }, `${side}:${row.value}:${count}`);
    },
  );
  const App = defineComponent<{ leftHostKey?: string }>(
    "fixture.host-scoped-collection-app", ({ leftHostKey }) =>
    jsx("section", {}, [
      jsx("ul", { key: leftHostKey ?? "left" }, renderCollectionAt(
        "fixture.shared-collection-site", leftRows,
        row => jsx(Row, { key: row.id, side: "left", row }),
      )),
      jsx("ul", { key: "right" }, renderCollectionAt(
        "fixture.shared-collection-site", rightRows,
        row => jsx(Row, { key: row.id, side: "right", row }),
      )),
    ]),
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { renderPreparation: "repeatable" });
  root.mount(jsx(App, {}));
  const section = container.children[0];
  const left = section.children[0];
  const right = section.children[1];
  equal([textContent(left), textContent(right)], ["left:1:0", "right:10:0"],
    "same row key aliased across host parents");
  setters.get("left")!(2);
  root.flush();
  equal([textContent(left), textContent(right)], ["left:1:2", "right:10:0"],
    "row state crossed host scope");
  assert(leftRows.apply(leftRows.version, [
    { type: "replace", key: "a", value: { id: "a", value: 3 } },
    { type: "insert", key: "b", value: { id: "b", value: 4 } },
  ]).ok, "left collection update failed");
  assert(root.flush(), "left collection did not publish");
  equal([textContent(left), textContent(right)], ["left:3:2left:4:0", "right:10:0"],
    "left collection update altered right row or lost left state");
  assert(rightRows.apply(rightRows.version, [
    { type: "replace", key: "a", value: { id: "a", value: 11 } },
  ]).ok, "right collection update failed");
  assert(root.flush(), "right collection did not publish");
  equal([textContent(left), textContent(right)], ["left:3:2left:4:0", "right:11:0"],
    "right collection update altered left rows");
  root.update(jsx(App, { leftHostKey: "left-replaced" }));
  equal([textContent(section.children[0]), textContent(section.children[1])],
    ["left:3:0left:4:0", "right:11:0"],
    "host replacement kept old collection row owners or altered sibling rows");
  root.dispose();
});

Deno.test("cached parent carries every scoped collection reader through sibling updates", () => {
  const first = createKeyedCollection<RowData>([{ id: "a", value: 1 }], row => row.id);
  const second = createKeyedCollection<RowData>([{ id: "a", value: 10 }], row => row.id);
  let listRenders = 0;
  let updateSibling: ((value: number) => boolean) | undefined;
  const Row = defineComponent<{ row: RowData }>(
    "fixture.cached-regions.row", ({ row }) =>
      jsx("li", { key: row.id }, `${row.id}:${row.value}`),
  );
  const Lists = defineComponent("fixture.cached-regions.lists", () => {
    listRenders++;
    return jsx("section", {}, [
      jsx("ul", { key: "first" }, renderCollectionAt(
        "fixture.cached-regions.shared-site", first,
        row => jsx(Row, { key: row.id, row }),
      )),
      jsx("ul", { key: "second" }, renderCollectionAt(
        "fixture.cached-regions.shared-site", second,
        row => jsx(Row, { key: row.id, row }),
      )),
    ]);
  });
  const Sibling = defineComponent("fixture.cached-regions.sibling", () => {
    const [count, setCount] = useStateAt("fixture.cached-regions.sibling-count", 0);
    updateSibling = setCount;
    return jsx("output", {}, String(count));
  });
  const tree = (showLists: boolean) => jsx("main", {}, [
    showLists ? jsx(Lists, { key: "lists" }) : null,
    jsx(Sibling, { key: "sibling" }),
  ]);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const paths: string[] = [];
  const root = new ComponentStateRoot(host, container, {
    scheduleCommit: () => {}, profile: phase => paths.push(phase),
  });
  root.mount(tree(true));
  equal([first.stats().readerCount, second.stats().readerCount], [1, 1],
    "initial collection readers");
  paths.length = 0;
  updateSibling!(1);
  assert(root.flush(), "sibling state did not publish");
  assert(paths.includes("dispatch.path.full-reconcile"),
    "sibling update did not exercise full-candidate collection carryover");
  equal(listRenders, 1, "unrelated update rerendered cached collection parent");
  equal([first.stats().readerCount, second.stats().readerCount], [1, 1],
    "cached parent dropped one scoped collection reader");
  assert(first.apply(first.version, [
    { type: "replace", key: "a", value: { id: "a", value: 2 } },
  ]).ok, "first collection replacement failed");
  assert(root.flush(), "first collection notification was lost");
  equal(textContent(container.children[0]), "a:2a:101",
    "first collection did not publish after cached reuse");
  root.update(tree(false));
  equal([first.stats().readerCount, second.stats().readerCount], [0, 0],
    "removing collection parent retained a reader");
  root.dispose();
});

Deno.test("authored collection sites cannot occupy the internal NUL namespace", () => {
  const source = createKeyedCollection<RowData>([{ id: "a", value: 1 }], row => row.id);
  const App = defineComponent("fixture.invalid-collection-site.app", () =>
    renderCollectionAt("fixture.site\u0000structural:[\"x\"]", source,
      row => jsx("li", { key: row.id }, String(row.value))));
  const host = new MemoryVDOMHost();
  const root = new ComponentStateRoot(host, host.createContainer());
  let rejected = false;
  try {
    root.mount(jsx(App, {}));
  } catch (error) {
    rejected = error instanceof Error && error.message.includes("renderCollectionAt requires");
  }
  assert(rejected, "NUL collection site entered the scoped region namespace");
  root.dispose();
});

Deno.test("structural owner removal retires all scoped collection readers", () => {
  const first = createKeyedCollection<RowData>([{ id: "a", value: 1 }], row => row.id);
  const second = createKeyedCollection<RowData>([{ id: "a", value: 10 }], row => row.id);
  let setVisible: ((value: number) => boolean) | undefined;
  const Row = defineComponent<{ row: RowData }>(
    "fixture.retired-regions.row", ({ row }) => jsx("li", {}, String(row.value)),
  );
  const Lists = defineComponent("fixture.retired-regions.lists", () => {
    const [visible, set] = useStateAt("fixture.retired-regions.visible", 2);
    setVisible = set;
    return jsx("section", {}, [
      visible >= 1 ? jsx("ul", { key: "first" }, renderCollectionAt(
        "fixture.retired-regions.site", first,
        row => jsx(Row, { key: row.id, row }),
      )) : null,
      visible >= 2 ? jsx("ul", { key: "second" }, renderCollectionAt(
        "fixture.retired-regions.site", second,
        row => jsx(Row, { key: row.id, row }),
      )) : null,
    ]);
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const paths: string[] = [];
  let scheduled = 0;
  const root = new ComponentStateRoot(host, container, {
    renderPreparation: "repeatable",
    scheduleCommit: () => { scheduled++; },
    profile: phase => paths.push(phase),
  });
  root.mount(jsx(Lists, {}));
  equal([first.stats().readerCount, second.stats().readerCount], [1, 1],
    "initial readers");
  setVisible!(1);
  assert(root.flush(), "single-region removal did not publish");
  equal([first.stats().readerCount, second.stats().readerCount], [1, 0],
    "single-region removal retained obsolete reader");
  setVisible!(0);
  assert(root.flush(), "all-region removal did not publish");
  equal([first.stats().readerCount, second.stats().readerCount], [0, 0],
    "all-region removal retained obsolete reader");
  assert(paths.includes("dispatch.path.structural-owner"),
    "owner local update did not exercise structural commit");
  const scheduledAfterRemoval = scheduled;
  assert(first.apply(first.version, [
    { type: "replace", key: "a", value: { id: "a", value: 2 } },
  ]).ok, "retired first collection update failed");
  assert(second.apply(second.version, [
    { type: "replace", key: "a", value: { id: "a", value: 20 } },
  ]).ok, "retired second collection update failed");
  equal(scheduled, scheduledAfterRemoval,
    "retired collection still schedules its former root");
  root.dispose();
});

Deno.test("native collection delta renders only changed rows and preserves surviving owner and host identity", async () => {
  const collection = createKeyedCollection<RowData>([
    { id: "a", value: 1 },
    { id: "b", value: 2 },
    { id: "c", value: 3 },
  ], (row) => row.id);
  const setups: string[] = [];
  const cleanups: string[] = [];
  let listRenders = 0;
  const Row = defineComponent<{ row: RowData }>("fixture.collection-row", ({ row }) => {
    const [count, setCount] = useStateAt("fixture.collection-row.count", 0);
    useEffectAt("fixture.collection-row.effect", () => {
      setups.push(row.id);
      return () => cleanups.push(row.id);
    });
    return jsx("li", {
      "data-id": row.id,
      "data-value": row.value,
      "data-count": count,
      onClick: () => setCount((value) => value + 1),
    }, `${row.id}:${row.value}:${count}`);
  });
  const List = defineComponent<{ collection: typeof collection }>("fixture.collection-list", ({ collection: source }) => {
    listRenders++;
    return jsx("ul", {}, renderCollectionAt("fixture.collection-row", source, (row) => jsx(Row, { row })));
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const scheduled: Array<() => void> = [];
  const counters: Array<Readonly<Record<string, number>>> = [];
  const root = new ComponentStateRoot(host, container, {
    scheduleCommit: (commit) => scheduled.push(commit),
    profileCounter: (values) => counters.push(values),
    renderPreparation: "repeatable",
  });
  root.mount(jsx(List, { collection }));
  const list = container.children[0];
  const initialNodes = new Map(list.children.map((node) => [node.props["data-id"], node]));
  (initialNodes.get("b")!.props.onClick as () => void)();
  root.flush();
  assert(textContent(initialNodes.get("b")!) === "b:2:1", "row-local state did not update");

  collection.resetStats();
  const operations: KeyedCollectionOperation<RowData>[] = [
    { type: "insert", key: "d", value: { id: "d", value: 4 }, beforeKey: "b" },
    { type: "move", key: "c", beforeKey: "a" },
    { type: "replace", key: "b", value: { id: "b", value: 20 } },
    { type: "remove", key: "a" },
  ];
  assert(collection.apply(collection.version, operations).ok, "collection batch rejected");
  collection.resetStats();
  assert(root.flush(), "collection notification did not flush");

  equal(list.children.map((node) => node.props["data-id"]), ["c", "d", "b"], "sparse order");
  assert(list.children[0] === initialNodes.get("c"), "move replaced surviving host node");
  assert(list.children[2] === initialNodes.get("b"), "replace lost host identity");
  equal(textContent(list.children[2]), "b:20:1", "replace did not retain row owner state");
  assert(listRenders === 1, "collection delta rerendered its ancestor component");
  equal(setups, ["a", "b", "c", "d"], "effect setup lifetimes");
  equal(cleanups, ["a"], "removed row effect cleanup");
  equal(collection.stats().entryInspections, 0, "delta walked collection entries");
  const last = counters.at(-1) ?? {};
  equal(last["collection.rows-prepared"], 2, "only inserted and replaced rows should render");
  equal(last["collection.delta-operations"], 4, "host delta operation count");

  root.update(jsx(List, { collection }));
  equal(list.children.map((node) => node.props["data-id"]), ["c", "d", "b"], "fresh full render after delta used stale collection rows");
  root.dispose();
  equal(cleanups.sort(), ["a", "b", "c", "d"], "all committed row effects should clean up");
  assert(scheduled.length > 0, "expected scheduled commit callback");
  await flushMicrotasks();
});

Deno.test("collection delta work stays bounded at 1k, 10k, and 50k rows", () => {
  for (const size of [1_000, 10_000, 50_000]) {
    const collection = createKeyedCollection<RowData>(
      Array.from({ length: size }, (_, index) => ({ id: `r${index}`, value: index })),
      (row) => row.id,
    );
    let rowRenders = 0;
    const stateSite = `fixture.large-row-${size}.count`;
    const Row = defineComponent<{ row: RowData }>(
      `fixture.large-row-${size}`,
      ({ row }) => {
        rowRenders++;
        const [count, setCount] = useStateAt(stateSite, 0);
        const boundCount = bindStatePropsAt([stateSite], (values) => values[0]);
        return jsx("li", {
          "data-id": row.id,
          "data-count": boundCount,
          "data-value": row.value,
          onClick: () => setCount((value) => value + 1),
        }, `${row.id}:${row.value}`);
      },
      { propOnlySites: [stateSite] },
    );
    const List = defineComponent<{ collection: typeof collection }>(`fixture.large-list-${size}`, ({ collection: source }) =>
      jsx("ul", {}, renderCollectionAt(`fixture.large-row-${size}`, source, (row) => jsx(Row, { row })))
    );
    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    const counters: Array<Readonly<Record<string, number>>> = [];
    const root = new ComponentStateRoot(host, container, {
      scheduleCommit: () => {},
      profileCounter: (values) => counters.push(values),
      renderPreparation: "repeatable",
    });
    root.mount(jsx(List, { collection }));
    const list = container.children[0];
    const initialNodes = new Map(list.children.map((node) => [node.props["data-id"], node]));
    equal(rowRenders, size, `initial row renders at ${size}`);

    const applyAndMeasure = (
      operation: KeyedCollectionOperation<RowData>,
      expectation: {
        key: string;
        rowsPrepared: number;
        rowRenders: number;
        placements: number;
        removals: number;
        bindingAttaches: number;
        bindingDetaches: number;
        membershipWrites: number;
      },
    ) => {
      const beforeWrites = host.writeCount;
      const beforePlacements = host.placementCount;
      const beforeRemovals = host.removalCount;
      const beforeSourceSyncVisits = root.diagnostics().sourceValueSyncVisits;
      const beforeRowRenders = rowRenders;
      collection.resetStats();
      assert(collection.apply(collection.version, [operation]).ok, `${operation.type} rejected at ${size}`);
      assert(root.flush(), `${operation.type} did not flush at ${size}`);
      const stats = collection.stats();
      assert(stats.entryInspections <= 2, `${operation.type} entry inspections at ${size}: ${stats.entryInspections}`);
      assert(stats.anchorInspections <= 1, `${operation.type} anchor inspections at ${size}: ${stats.anchorInspections}`);
      const measured = counters.at(-1) ?? {};
      equal(measured["collection.rows-prepared"] ?? 0, expectation.rowsPrepared, `${operation.type} prepared rows at ${size}`);
      equal(measured["owner.component-renders"] ?? 0, expectation.rowRenders, `${operation.type} component renders at ${size}`);
      equal(rowRenders - beforeRowRenders, expectation.rowRenders, `${operation.type} actual row renders at ${size}`);
      equal(measured["collection.delta-operations"], 1, `${operation.type} VDOM operation count at ${size}`);
      assert((measured["collection.owner-membership-writes"] ?? 0) <= expectation.membershipWrites, `${operation.type} owner membership edits at ${size}`);
      assert((measured["vdom.keyed-region-delta.binding-attaches"] ?? 0) <= expectation.bindingAttaches, `${operation.type} scalar binding attaches at ${size}`);
      assert((measured["vdom.keyed-region-delta.binding-detaches"] ?? 0) <= expectation.bindingDetaches, `${operation.type} scalar binding detaches at ${size}`);
      assert((measured["vdom.keyed-region-delta.binding-index-operations"] ?? 0) <= expectation.bindingAttaches + expectation.bindingDetaches + 2, `${operation.type} scalar index edits at ${size}`);
      equal(host.placementCount - beforePlacements, expectation.placements, `${operation.type} host placements at ${size}`);
      equal(host.removalCount - beforeRemovals, expectation.removals, `${operation.type} host removals at ${size}`);
      assert(host.writeCount - beforeWrites <= 4, `${operation.type} host writes exceeded changed-row budget at ${size}`);
      assert(root.diagnostics().sourceValueSyncVisits - beforeSourceSyncVisits <= 1, `${operation.type} performed broad source-cache synchronization at ${size}`);
      assert(measured["owner.full-expand"] === undefined, `${operation.type} unexpectedly expanded the full owner tree at ${size}`);
      return expectation.key;
    };

    applyAndMeasure({
      type: "insert",
      key: "extra",
      value: { id: "extra", value: size + 1 },
      beforeKey: "r0",
    }, {
      key: "extra", rowsPrepared: 1, rowRenders: 1, placements: 2, removals: 0,
      bindingAttaches: 1, bindingDetaches: 0, membershipWrites: 4,
    });
    applyAndMeasure({
      type: "move", key: "r0", beforeKey: null,
    }, {
      key: "r0", rowsPrepared: 0, rowRenders: 0, placements: 1, removals: 0,
      bindingAttaches: 0, bindingDetaches: 0, membershipWrites: 0,
    });
    applyAndMeasure({
      type: "replace", key: "r1", value: { id: "r1", value: size + 2 },
    }, {
      key: "r1", rowsPrepared: 1, rowRenders: 1, placements: 0, removals: 0,
      bindingAttaches: 1, bindingDetaches: 1, membershipWrites: 0,
    });
    applyAndMeasure({
      type: "remove", key: "extra",
    }, {
      key: "extra", rowsPrepared: 0, rowRenders: 0, placements: 0, removals: 1,
      bindingAttaches: 0, bindingDetaches: 1, membershipWrites: 4,
    });
    equal(list.children.length, size, `row count after CRUD sequence at ${size}`);
    assert(list.children.at(-1) === initialNodes.get("r0"), `move lost surviving host identity at ${size}`);
    const survivingWriterNode = initialNodes.get(`r${size - 1}`)!;
    (survivingWriterNode.props.onClick as () => void)();
    assert(root.flush(), `surviving row setter did not flush at ${size}`);
    equal(survivingWriterNode.props["data-count"], 1, `surviving scalar writer stopped working at ${size}`);
    root.dispose();
  }
});

Deno.test("mixed collection and numeric writes commit together without starving collection work", () => {
  const collection = createKeyedCollection<RowData>([{ id: "a", value: 1 }], (row) => row.id);
  let listRenders = 0;
  const Row = defineComponent<{ row: RowData }>("fixture.mixed-work-row", ({ row }) => {
    const [count, setCount] = useStateAt("fixture.mixed-work-row.count", 0);
    return jsx("li", { "data-id": row.id, "data-count": count }, `${row.id}:${count}`);
  });
  const List = defineComponent<{ collection: typeof collection }>("fixture.mixed-work-list", ({ collection: source }) => {
    listRenders++;
    const [clicks, setClicks] = useStateAt("fixture.mixed-work-list.clicks", 0);
    return jsx("section", {}, [
      jsx("h1", {}, `Rows ${source.size}`),
      jsx("ul", {}, renderCollectionAt("fixture.mixed-work-region", source, (row) => jsx(Row, { row }))),
      jsx("button", { "data-clicks": clicks, onClick: () => {
        setClicks((value) => value + 1);
        collection.apply(collection.version, [
          { type: "insert", key: "b", value: { id: "b", value: 2 }, beforeKey: null },
        ]);
      } }, "both"),
    ]);
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit: () => {} });
  root.mount(jsx(List, { collection }));
  const button = container.children[0].children[2];
  (button.props.onClick as () => void)();
  assert(root.flush(), "mixed collection/local work did not flush");
  equal(container.children[0].children[0].children[0].text, "Rows 2", "collection-derived parent output was stale");
  equal(container.children[0].children[1].children.map((node) => node.props["data-id"]), ["a", "b"], "collection edit was starved by numeric work");
  equal(container.children[0].children[2].props["data-clicks"], 1, "numeric write was lost beside collection edit");
  assert(listRenders === 2, "mixed work did not use one generic candidate");
  assert(!root.flush(), "mixed batch left historical collection work pending");
  root.dispose();
});

Deno.test("collection readers are root-local and detach on source switch, conditional removal, and disposal", () => {
  const first = createKeyedCollection<RowData>([{ id: "a", value: 1 }], (row) => row.id);
  const second = createKeyedCollection<RowData>([{ id: "b", value: 2 }], (row) => row.id);
  const Row = defineComponent<{ row: RowData }>("fixture.reader-row", ({ row }) => jsx("li", {}, row.id));
  const List = defineComponent<{ collection: typeof first; show: boolean }>("fixture.reader-list", ({ collection, show }) =>
    jsx("ul", {}, show ? renderCollectionAt("fixture.reader-row", collection, (row) => jsx(Row, { row })) : [])
  );
  const hostA = new MemoryVDOMHost();
  const hostB = new MemoryVDOMHost();
  const rootA = new ComponentStateRoot(hostA, hostA.createContainer(), { scheduleCommit: () => {} });
  const rootB = new ComponentStateRoot(hostB, hostB.createContainer(), { scheduleCommit: () => {} });
  rootA.mount(jsx(List, { collection: first, show: true }));
  rootB.mount(jsx(List, { collection: first, show: true }));
  equal(first.stats().readerCount, 2, "two roots should hold independent readers");
  rootA.update(jsx(List, { collection: second, show: true }));
  equal(first.stats().readerCount, 1, "source switch did not detach old reader");
  equal(second.stats().readerCount, 1, "source switch did not attach new reader");
  rootB.update(jsx(List, { collection: first, show: false }));
  equal(first.stats().readerCount, 0, "conditional removal did not detach reader");
  rootA.dispose();
  rootB.dispose();
  equal(second.stats().readerCount, 0, "root disposal did not detach reader");
});

Deno.test("failed historical row preparation falls back to a fresh snapshot and rolls back candidate owners", () => {
  type MaybeBadRow = RowData & { fail?: boolean };
  const collection = createKeyedCollection<MaybeBadRow>([{ id: "a", value: 1 }], (row) => row.id);
  let fail = true;
  const Row = defineComponent<{ row: MaybeBadRow }>("fixture.recover-row", ({ row }) => {
    if (fail && row.fail) throw new Error("temporary row failure");
    return jsx("li", { "data-id": row.id }, String(row.value));
  });
  const List = defineComponent<{ collection: typeof collection }>("fixture.recover-list", ({ collection: source }) =>
    jsx("ul", {}, renderCollectionAt("fixture.recover-row", source, (row) => jsx(Row, { row })))
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit: () => {} });
  root.mount(jsx(List, { collection }));
  const oldNode = container.children[0].children[0];
  collection.apply(collection.version, [{ type: "insert", key: "bad", value: { id: "bad", value: 2, fail: true }, beforeKey: null }]);
  let failed = false;
  try { root.flush(); } catch { failed = true; }
  assert(failed, "fresh-snapshot fallback should report the still-invalid row");
  assert(container.children[0].children.length === 1 && container.children[0].children[0] === oldNode, "failed row candidate changed host output");
  const ownerCountBeforeRecovery = root.diagnostics().ownerCount;
  collection.apply(collection.version, [{ type: "replace", key: "bad", value: { id: "bad", value: 3 } }]);
  fail = false;
  root.flush();
  equal(container.children[0].children.map((node) => node.props["data-id"]), ["a", "bad"], "fresh snapshot did not recover from historical failed insert");
  assert(root.diagnostics().ownerCount <= ownerCountBeforeRecovery + 1, "failed staged owner leaked into committed owner set");
  root.dispose();
});

Deno.test("same-batch remove and reinsert creates a fresh owner; transient rows run no effects", () => {
  const collection = createKeyedCollection<RowData>([{ id: "a", value: 1 }], (row) => row.id);
  const setups: number[] = [];
  const cleanups: number[] = [];
  const Row = defineComponent<{ row: RowData }>("fixture.reincarnated-row", ({ row }) => {
    const [count, setCount] = useStateAt("fixture.reincarnated-row.count", 0);
    useEffectAt("fixture.reincarnated-row.effect", () => {
      setups.push(row.value);
      return () => cleanups.push(row.value);
    });
    return jsx("li", { "data-id": row.id, "data-count": count, onClick: () => setCount((value) => value + 1) }, `${row.value}:${count}`);
  });
  const List = defineComponent<{ collection: typeof collection }>("fixture.reincarnated-list", ({ collection: source }) =>
    jsx("ul", {}, renderCollectionAt("fixture.reincarnated-row", source, (row) => jsx(Row, { row })))
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit: () => {} });
  root.mount(jsx(List, { collection }));
  const oldNode = container.children[0].children[0];
  (oldNode.props.onClick as () => void)();
  root.flush();
  assert(textContent(oldNode) === "1:1", "initial owner state did not update");
  const version = collection.version;
  assert(collection.apply(version, [
    { type: "remove", key: "a" },
    { type: "insert", key: "a", value: { id: "a", value: 2 }, beforeKey: null },
    { type: "remove", key: "a" },
    { type: "insert", key: "a", value: { id: "a", value: 3 }, beforeKey: null },
  ]).ok, "remove/reinsert batch rejected");
  root.flush();
  const newNode = container.children[0].children[0];
  assert(newNode !== oldNode, "reinserted row reused the removed host node");
  assert(textContent(newNode) === "3:0", "reinserted row reused removed owner state");
  equal(setups, [1, 3], "only the final reinsert should start a fresh effect lifetime");
  equal(cleanups, [1], "removed owner effect cleanup missing");

  const ownerCount = root.diagnostics().ownerCount;
  assert(collection.apply(collection.version, [
    { type: "insert", key: "temporary", value: { id: "temporary", value: 3 }, beforeKey: null },
    { type: "remove", key: "temporary" },
  ]).ok, "transient insert/remove batch rejected");
  root.flush();
  equal(root.diagnostics().ownerCount, ownerCount, "transient row owner leaked");
  equal(setups, [1, 3], "transient row effects must not start");
  root.dispose();
  equal(cleanups, [1, 3], "fresh owner effect cleanup missing on disposal");
});

Deno.test("seeded collection operations match an array oracle and full-render baseline", () => {
  const initial: RowData[] = Array.from({ length: 7 }, (_, index) => ({ id: `seed-${index}`, value: index }));
  const oracle = [...initial];
  const collection = createKeyedCollection<RowData>(initial, (row) => row.id);
  const Row = defineComponent<{ row: RowData }>("fixture.seeded-row", ({ row }) =>
    jsx("li", { "data-id": row.id, "data-value": row.value }, String(row.value))
  );
  const List = defineComponent<{ collection: typeof collection }>("fixture.seeded-list", ({ collection: source }) =>
    jsx("ul", {}, renderCollectionAt("fixture.seeded-row", source, (row) => jsx(Row, { row })))
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit: () => {} });
  const tree = () => jsx(List, { collection });
  root.mount(tree());
  let seed = 0x6d2b79f5;
  let nextKey = 0;
  const random = (limit: number) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed % limit;
  };
  const compare = (step: number | string) => {
    const children = container.children[0].children;
    equal(children.map((node) => node.props["data-id"]), oracle.map((row) => row.id), `oracle order at ${step}`);
    equal(children.map((node) => node.props["data-value"]), oracle.map((row) => row.value), `oracle values at ${step}`);
  };
  for (let step = 0; step < 350; step++) {
    const choice = oracle.length === 0 || (oracle.length < 15 && random(4) === 0)
      ? "insert"
      : (["remove", "move", "replace"] as const)[random(3)];
    let operation: KeyedCollectionOperation<RowData>;
    if (choice === "insert") {
      const row = { id: `new-${nextKey++}`, value: step };
      const beforeIndex = random(3) === 0 ? oracle.length : random(oracle.length + 1);
      const beforeKey = oracle[beforeIndex]?.id ?? null;
      operation = { type: "insert", key: row.id, value: row, beforeKey };
      oracle.splice(beforeIndex, 0, row);
    } else if (choice === "remove") {
      const index = random(oracle.length);
      const [row] = oracle.splice(index, 1);
      operation = { type: "remove", key: row.id };
    } else if (choice === "move") {
      const from = random(oracle.length);
      const [row] = oracle.splice(from, 1);
      const beforeIndex = random(oracle.length + 1);
      const beforeKey = oracle[beforeIndex]?.id ?? null;
      oracle.splice(beforeIndex, 0, row);
      operation = { type: "move", key: row.id, beforeKey };
      if (beforeKey === row.id) continue;
    } else {
      const index = random(oracle.length);
      const row = { ...oracle[index], value: step * 3 };
      oracle[index] = row;
      operation = { type: "replace", key: row.id, value: row };
    }
    const result = collection.apply(collection.version, [operation]);
    assert(result.ok, `seeded operation ${step} rejected`);
    root.flush();
    compare(step);
    if (step % 47 === 0) {
      root.update(tree());
      compare(`full-${step}`);
    }
  }
  root.dispose();
});

Deno.test("multiple collection regions use the explicit generic full-render fallback", () => {
  const left = createKeyedCollection<RowData>([{ id: "l0", value: 0 }], (row) => row.id);
  const right = createKeyedCollection<RowData>([{ id: "r0", value: 0 }], (row) => row.id);
  const RowLeft = defineComponent<{ row: RowData }>("fixture.multi-left-row", ({ row }) => jsx("li", { "data-id": row.id }, String(row.value)));
  const RowRight = defineComponent<{ row: RowData }>("fixture.multi-right-row", ({ row }) => jsx("li", { "data-id": row.id }, String(row.value)));
  let renders = 0;
  const List = defineComponent<{ left: typeof left; right: typeof right }>("fixture.multi-list", ({ left: leftSource, right: rightSource }) => {
    renders++;
    return jsx("div", {}, [
      jsx("ul", { key: "left" }, renderCollectionAt("fixture.multi-left-row", leftSource, (row) => jsx(RowLeft, { row }))),
      jsx("ul", { key: "right" }, renderCollectionAt("fixture.multi-right-row", rightSource, (row) => jsx(RowRight, { row }))),
    ]);
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit: () => {} });
  root.mount(jsx(List, { left, right }));
  left.apply(left.version, [{ type: "insert", key: "l1", value: { id: "l1", value: 1 }, beforeKey: null }]);
  root.flush();
  equal(container.children[0].children[0].children.map((node) => node.props["data-id"]), ["l0", "l1"], "first region generic fallback");
  assert(renders === 2, "unsupported multiple-region update did not re-render its containing component");
  root.dispose();
});

Deno.test("compiler-declared parent collection reads refresh through a full render", () => {
  const collection = createKeyedCollection<RowData>([{ id: "a", value: 1 }], (row) => row.id);
  let listRenders = 0;
  const Row = defineComponent<{ row: RowData }>("fixture.parent-read-row", ({ row }) =>
    jsx("li", { "data-id": row.id }, String(row.value))
  );
  const List = defineComponent<{ collection: typeof collection }>("fixture.parent-read-list", ({ collection: source }) => {
    listRenders++;
    return jsx("section", {}, [
      jsx("h1", {}, `Rows ${source.size} at ${source.version}`),
      jsx("ul", {}, renderCollectionAt(
        "fixture.parent-read-region",
        source,
        (row) => jsx(Row, { row }),
        { requiresOwnerRender: true },
      )),
    ]);
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit: () => {} });
  root.mount(jsx(List, { collection }));
  collection.apply(collection.version, [
    { type: "insert", key: "b", value: { id: "b", value: 2 }, beforeKey: null },
  ]);
  root.flush();
  assert(textContent(container.children[0].children[0]) === `Rows 2 at ${collection.version}`, "parent-owned collection reads were stale after delta");
  assert(listRenders === 2, "requiresOwnerRender did not force the collection ancestor render");
  root.dispose();
});

Deno.test("intrinsic keyed collection rows stay live through generic full-render fallback", () => {
  const collection = createKeyedCollection<RowData>([
    { id: "a", value: 1 },
    { id: "b", value: 2 },
  ], (row) => row.id);
  const Child = defineComponent<{ row: RowData }>("fixture.intrinsic-child", ({ row }) => {
    const [count, setCount] = useStateAt("fixture.intrinsic-child.count", 0);
    return jsx("span", { "data-row": row.id, onClick: () => setCount((value) => value + 1) }, `${row.id}:${count}`);
  });
  const List = defineComponent<{ collection: typeof collection }>("fixture.intrinsic-list", ({ collection: source }) =>
    jsx("ul", {}, renderCollectionAt(
      "fixture.intrinsic-region",
      source,
      (row) => jsx("li", { key: row.id, "data-id": row.id }, jsx(Child, { row })),
    ))
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit: () => {} });
  root.mount(jsx(List, { collection }));
  equal(collection.stats().readerCount, 1, "intrinsic row region did not attach a live reader");
  const [initialA, initialB] = container.children[0].children;
  (initialA.children[0].props.onClick as () => void)();
  root.flush();
  assert(textContent(initialA) === "a:1", "intrinsic row child state did not update");
  collection.apply(collection.version, [
    { type: "move", key: "a", beforeKey: null },
  ]);
  root.flush();
  const [movedB, movedA] = container.children[0].children;
  assert(movedB === initialB && movedA === initialA, "intrinsic keyed rows lost host identity during move");
  assert(textContent(movedA) === "a:1" && textContent(movedB) === "b:0", "intrinsic nested component owners aliased across rows or lost state on move");
  collection.apply(collection.version, [
    { type: "insert", key: "c", value: { id: "c", value: 3 }, beforeKey: null },
  ]);
  root.flush();
  equal(container.children[0].children.map((node) => node.props["data-id"]), ["b", "a", "c"], "intrinsic row collection did not refresh");
  root.dispose();
  equal(collection.stats().readerCount, 0, "intrinsic region reader leaked on disposal");
});

Deno.test("collection effect setup can enqueue a later collection batch without losing it", () => {
  const collection = createKeyedCollection<RowData>([], (row) => row.id);
  let enqueueSecond = true;
  const Row = defineComponent<{ row: RowData }>("fixture.reentrant-row", ({ row }) => {
    useEffectAt("fixture.reentrant-row.effect", () => {
      if (row.id === "first" && enqueueSecond) {
        enqueueSecond = false;
        collection.apply(collection.version, [{ type: "insert", key: "second", value: { id: "second", value: 2 }, beforeKey: null }]);
      }
    });
    return jsx("li", { "data-id": row.id }, String(row.value));
  });
  const List = defineComponent<{ collection: typeof collection }>("fixture.reentrant-list", ({ collection: source }) =>
    jsx("ul", {}, renderCollectionAt("fixture.reentrant-row", source, (row) => jsx(Row, { row })))
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const scheduled: Array<() => void> = [];
  const root = new ComponentStateRoot(host, container, { scheduleCommit: (commit) => scheduled.push(commit) });
  root.mount(jsx(List, { collection }));
  collection.apply(collection.version, [{ type: "insert", key: "first", value: { id: "first", value: 1 }, beforeKey: null }]);
  root.flush();
  root.flush();
  equal(container.children[0].children.map((node) => node.props["data-id"]), ["first", "second"], "effect-enqueued collection batch was dropped");
  assert(scheduled.length > 0, "reentrant batch should schedule follow-up work");
  root.dispose();
});

Deno.test("host failure during sparse delta rolls back candidate owners and makes the root terminal", () => {
  class ThrowOnceHost extends MemoryVDOMHost {
    throwOnNextPlace = false;
    override place(parent: MemoryNode, node: MemoryNode, before: MemoryNode | null) {
      super.place(parent, node, before);
      if (this.throwOnNextPlace) {
        this.throwOnNextPlace = false;
        throw new Error("host placement failed after write");
      }
    }
  }
  const collection = createKeyedCollection<RowData>([{ id: "a", value: 1 }], (row) => row.id);
  const Row = defineComponent<{ row: RowData }>("fixture.throw-row", ({ row }) => jsx("li", {}, String(row.value)));
  const List = defineComponent<{ collection: typeof collection }>("fixture.throw-list", ({ collection: source }) =>
    jsx("ul", {}, renderCollectionAt("fixture.throw-region", source, (row) => jsx(Row, { row })))
  );
  const host = new ThrowOnceHost();
  const container = host.createContainer();
  const world = new OwnerStateWorld();
  const root = new ComponentStateRoot(host, container, { scheduleCommit: () => {}, world, rootId: "throwing-host-root" });
  root.mount(jsx(List, { collection }));
  const rootOwner = world.findOwner(null, "@component-root:throwing-host-root")!;
  const listOwner = world.findOwner(rootOwner, "fixture.throw-list", "@slot:fixture.throw-list:0")!;
  host.throwOnNextPlace = true;
  collection.apply(collection.version, [{ type: "insert", key: "b", value: { id: "b", value: 2 }, beforeKey: null }]);
  let hostFailure = false;
  try { root.flush(); } catch { hostFailure = true; }
  assert(hostFailure, "host failure was not propagated");
  assert(world.findOwner(listOwner, "fixture.throw-row\u0000collection:fixture.throw-region", "b") === undefined, "failed sparse candidate owner leaked");
  let terminalFailure = false;
  try { root.flush(); } catch (error) {
    terminalFailure = String(error).includes("cannot continue after a host commit failure");
  }
  assert(terminalFailure, "root retried after a potentially partial host write");
  root.dispose();
});
