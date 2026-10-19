import {
  bind,
  bindSources,
  jsx,
  keyedOwnerChildren,
  ScalarSource,
} from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "./vdom_snapshot_runtime.ts";

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
const same = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) throw new Error(message);
};

type Row = { key: string; x: ScalarSource; y: ScalarSource; label: string };
const row = (item: Row) =>
  jsx("li", {
    key: item.key,
    title: bind(item.x, (value) => `x=${value}`),
    "data-sum": bindSources([item.x, item.y], ([x, y]) => x + y),
  }, item.label);
const tree = (rows: readonly Row[]) =>
  jsx("ul", { key: "list" }, keyedOwnerChildren("rows", rows.map(row)));
const mountedRows = (
  container: ReturnType<MemoryVDOMHost["createContainer"]>,
) => container.children[0].children;
const hostShape = (
  node: ReturnType<MemoryVDOMHost["createContainer"]>,
): unknown => ({
  tag: node.tag,
  text: node.text,
  props: node.props,
  children: node.children.map(hostShape),
});
const makeRow = (key: string, seed: number): Row => ({
  key,
  x: new ScalarSource(seed * 2, seed),
  y: new ScalarSource(seed * 2 + 1, seed + 1),
  label: `row-${key}`,
});

Deno.test("keyed deltas attach scalar and multisource writers for inserted rows", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const a = makeRow("a", 1);
  root.commit(tree([a]));

  const inserted = makeRow("b", 4);
  assert(
    root.commitKeyedRegionDelta("list", "rows", [
      { type: "insert", key: "b", beforeKey: null, tree: row(inserted) },
    ]),
    "bound row insertion should use the sparse delta path",
  );
  const bNode = mountedRows(container)[1];
  same(
    bNode.props.title,
    "x=4",
    "inserted binding should materialize initially",
  );
  same(
    bNode.props["data-sum"],
    9,
    "inserted multisource binding should materialize initially",
  );

  root.setSources([[inserted.x, 8], [inserted.y, 13]]);
  same(bNode.props.title, "x=8", "inserted scalar writer was not attached");
  same(
    bNode.props["data-sum"],
    21,
    "inserted multisource writer was not attached",
  );
  assert(
    root.diagnostics().bindingIndexAttachOperations >= 2,
    "attach work must be counted per prop writer",
  );
  root.dispose();
});

Deno.test("full commit diffs against last committed bound value after source mutation", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(99, 0);
  const render = () =>
    jsx("button", {
      key: "button",
      "data-value": bind(source),
    }, "increment");
  root.commit(render());
  const button = container.children[0];
  same(button.props["data-value"], 0, "initial bound prop missing");

  // Numeric state may be published before its candidate reaches VDOM commit.
  // The previous VNode still references the source, but that read now returns
  // the candidate value instead of the value actually present on the host.
  source.value = 1;
  root.commit(render());
  same(
    button.props["data-value"],
    1,
    "full commit diffed current source against itself",
  );
  root.dispose();
});

Deno.test("remove and replace detach old writers; moves leave sibling indexes untouched", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const a = makeRow("a", 1);
  const b = makeRow("b", 2);
  const c = makeRow("c", 3);
  root.commit(tree([a, b, c]));
  const [aNode, bNode, cNode] = mountedRows(container);

  const beforeMove = root.diagnostics();
  assert(
    root.commitKeyedRegionDelta("list", "rows", [
      { type: "move", key: "c", beforeKey: "a" },
    ]),
    "move should use sparse delta path",
  );
  same(mountedRows(container)[0], cNode, "move must preserve host identity");
  equal(
    root.diagnostics().bindingIndexAttachOperations,
    beforeMove.bindingIndexAttachOperations,
    "move must not attach sibling writers",
  );
  equal(
    root.diagnostics().bindingIndexDetachOperations,
    beforeMove.bindingIndexDetachOperations,
    "move must not detach sibling writers",
  );

  assert(
    root.commitKeyedRegionDelta("list", "rows", [
      { type: "remove", key: "b" },
    ]),
    "remove should use sparse delta path",
  );
  const detachedB = bNode;
  const detachedWrites = host.writeCount;
  let removedSourceRejected = false;
  try {
    root.setSource(b.x, 99);
  } catch {
    removedSourceRejected = true;
  }
  assert(removedSourceRejected, "removed source must no longer be registered");
  same(
    detachedB.props.title,
    "x=2",
    "removed node should not receive later source writes",
  );
  same(
    host.writeCount,
    detachedWrites,
    "removed source must not write detached nodes",
  );

  const replacement = makeRow("a", 20);
  assert(
    root.commitKeyedRegionDelta("list", "rows", [
      { type: "replace", key: "a", tree: row(replacement) },
    ]),
    "compatible bound replacement should use sparse delta path",
  );
  const replacedA = mountedRows(container).find((node) =>
    node.props.title === "x=1"
  )!;
  const replacedNode = mountedRows(container).find((node) =>
    node.props.title === "x=20"
  )!;
  assert(
    replacedA === undefined,
    "old writer value should not remain after replacement",
  );
  root.setSource(replacement.x, 25);
  same(replacedNode.props.title, "x=25", "replacement writer was not attached");
  let replacedSourceRejected = false;
  try {
    root.setSource(a.x, 30);
  } catch {
    replacedSourceRejected = true;
  }
  assert(
    replacedSourceRejected,
    "replacement must release the previous source writer",
  );
  assert(
    mountedRows(container).includes(cNode),
    "unaffected sibling identity changed",
  );
  root.dispose();
});

Deno.test("shared-source detach deletes only the removed subtree registrations", () => {
  const counters: Array<Readonly<Record<string, number>>> = [];
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(
    host,
    container,
    undefined,
    (entry) => counters.push(entry),
  );
  const shared = new ScalarSource(7000, 1);
  const rows: Row[] = Array.from({ length: 2048 }, (_, index) => ({
    key: `shared-${index}`,
    x: shared,
    y: new ScalarSource(8000 + index, index),
    label: `shared-${index}`,
  }));
  const sharedTree = () =>
    jsx(
      "ul",
      { key: "list" },
      keyedOwnerChildren(
        "rows",
        rows.map((item) =>
          jsx("li", {
            key: item.key,
            title: bind(shared),
            "data-derived": bindSources([shared, item.y], ([x, y]) => x + y),
          }, item.label)
        ),
      ),
    );
  root.commit(sharedTree());

  const detached = mountedRows(container)[1024];
  const detachedKey = rows[1024].key;
  rows.splice(1024, 1);
  assert(
    root.commitKeyedRegionDelta("list", "rows", [
      { type: "remove", key: detachedKey },
    ]),
    "shared-source row removal should use sparse delta path",
  );
  const deltaCounters = counters.at(-1)!;
  same(
    deltaCounters["vdom.keyed-region-delta.binding-detaches"],
    2,
    "only removed row's two prop writers should detach",
  );
  same(
    deltaCounters["vdom.keyed-region-delta.binding-index-operations"],
    3,
    "only its three source registrations should be deleted",
  );

  const detachedTitle = detached.props.title;
  const detachedDerived = detached.props["data-derived"];
  root.setSource(shared, 9);
  same(
    detached.props.title,
    detachedTitle,
    "detached shared-source node received a write",
  );
  same(
    detached.props["data-derived"],
    detachedDerived,
    "detached derived node received a write",
  );
  same(
    mountedRows(container)[1023].props.title,
    9,
    "surviving shared-source writer was lost",
  );
  root.dispose();
});

Deno.test("invalid bound delta validates fully before any host mutation", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const a = makeRow("a", 1);
  const b = makeRow("b", 2);
  root.commit(tree([a, b]));
  const before = hostShape(container);
  const writes = host.writeCount;
  const placements = host.placementCount;
  const removals = host.removalCount;
  const version = root.version;
  const accepted = root.commitKeyedRegionDelta("list", "rows", [
    { type: "remove", key: "a" },
    { type: "move", key: "b", beforeKey: "missing" },
  ]);
  same(accepted, false, "invalid delta should be rejected");
  equal(
    hostShape(container),
    before,
    "invalid delta changed mounted host tree",
  );
  same(host.writeCount, writes, "invalid delta wrote host props");
  same(host.placementCount, placements, "invalid delta placed host nodes");
  same(host.removalCount, removals, "invalid delta removed host nodes");
  same(root.version, version, "invalid delta advanced root version");
  root.dispose();
});

Deno.test("keyed delta locates component roots nested in the app tree", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const a = makeRow("a", 1);
  root.commit(
    jsx(
      "main",
      { key: "app" },
      jsx("section", { key: "list" }, keyedOwnerChildren("rows", [row(a)])),
    ),
  );

  const inserted = makeRow("b", 2);
  assert(
    root.commitKeyedRegionDelta("list", "rows", [
      { type: "insert", key: "b", beforeKey: null, tree: row(inserted) },
    ]),
    "nested keyed component root should be found under its keyed parent",
  );
  const rows = container.children[0].children[0].children;
  same(rows.length, 2, "nested region insertion did not reach its host parent");
  same(
    rows[1].props.title,
    "x=2",
    "nested inserted binding was not initialized",
  );
  root.dispose();
});

Deno.test("ordered keyed operations allow remove and reinsert with fresh writers", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const a = makeRow("a", 1);
  const b = makeRow("b", 2);
  const c = makeRow("c", 3);
  root.commit(tree([a, b, c]));
  const oldB = mountedRows(container)[1];

  const replacementB = makeRow("b", 20);
  const d = makeRow("d", 4);
  assert(
    root.commitKeyedRegionDelta("list", "rows", [
      { type: "remove", key: "b" },
      { type: "insert", key: "b", beforeKey: "c", tree: row(replacementB) },
      { type: "insert", key: "d", beforeKey: "a", tree: row(d) },
      { type: "move", key: "a", beforeKey: "d" },
      { type: "remove", key: "d" },
      { type: "insert", key: "d", beforeKey: "b", tree: row(d) },
    ]),
    "valid sequential remove/insert/move sequence should use sparse path",
  );
  const rows = mountedRows(container);
  equal(
    rows.map((node) => node.props.title),
    ["x=1", "x=4", "x=20", "x=3"],
    "operations should apply in order",
  );
  assert(
    rows[2] !== oldB,
    "remove and reinsert should create a fresh host node",
  );
  root.setSource(replacementB.x, 25);
  same(rows[2].props.title, "x=25", "reinserted row writer was not attached");
  let oldSourceRejected = false;
  try {
    root.setSource(b.x, 30);
  } catch {
    oldSourceRejected = true;
  }
  assert(oldSourceRejected, "removed row source should remain detached");
  root.dispose();
});

Deno.test("delta releases cached keyed VNode children and rebuilds snapshots", () => {
  const counters: Array<Readonly<Record<string, number>>> = [];
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(
    host,
    container,
    undefined,
    (entry) => counters.push(entry),
  );
  const a = makeRow("a", 1);
  const b = makeRow("b", 2);
  const reusableTree = tree([a, b]);
  root.commit(reusableTree);
  const previousSnapshot = root.snapshot;
  assert(
    JSON.stringify(previousSnapshot).includes("row-b"),
    "initial snapshot should include the row before removal",
  );

  assert(
    root.commitKeyedRegionDelta("list", "rows", [
      { type: "remove", key: "b" },
    ]),
    "row removal should use sparse path",
  );
  same(
    counters.at(-1)?.["vdom.keyed-region-delta.released-child-vnodes"],
    2,
    "delta should release the initial normalized keyed child references",
  );
  const currentSnapshot = root.snapshot;
  const serialized = JSON.stringify(currentSnapshot);
  assert(serialized.includes("row-a"), "snapshot lost a surviving row");
  assert(!serialized.includes("row-b"), "snapshot retained a removed row");

  // Reusing the exact input RuntimeElement must normalize its current children
  // again after the mounted keyed container dropped its old normalized array.
  root.commit(reusableTree);
  assert(
    JSON.stringify(root.snapshot).includes("row-b"),
    "reused keyed input should rebuild its normalized child list",
  );
  root.dispose();
});

for (const direct of [false, true]) Deno.test(`seeded scalar/style keyed deltas match full recompute (direct=${direct})`, () => {
  const styledRow = (item: Row) => jsx("li", { key: item.key, title: bind(item.x, value => `x=${value}`), "data-sum": bindSources([item.x,item.y], ([x,y]) => x+y), style: { color: "navy", left: bind(item.x, value => `${value}px`), opacity: bindSources([item.x,item.y], ([x,y]) => (x+y)/100) } }, item.label);
  const styledTree = (rows: readonly Row[]) => jsx("ul", {key:"list"}, keyedOwnerChildren("rows", rows.map(styledRow)));
  const deltaHost = new MemoryVDOMHost();
  const fullHost = new MemoryVDOMHost();
  const deltaContainer = deltaHost.createContainer();
  const fullContainer = fullHost.createContainer();
  const deltaRoot = new VDOMSnapshotRoot(deltaHost, deltaContainer);
  const fullRoot = new VDOMSnapshotRoot(fullHost, fullContainer);
  const rows: Row[] = Array.from(
    { length: 12 },
    (_, index) => makeRow(`r${index}`, index + 1),
  );
  const cloneRow = (item: Row): Row => ({
    key: item.key,
    x: new ScalarSource(item.x.id, item.x.value),
    y: new ScalarSource(item.y.id, item.y.value),
    label: item.label,
  });
  const fullRows: Row[] = rows.map(cloneRow);
  deltaRoot.commit(styledTree(rows), null, direct);
  fullRoot.commit(styledTree(fullRows));
  let seed = 0x51a7;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x1_0000_0000;
  };
  let nextId = 0;
  for (let step = 0; step < 120; step++) {
    const action = Math.floor(random() * 4);
    const operations = [] as Array<
      | {
        type: "insert";
        key: string;
        beforeKey: string | null;
        tree: ReturnType<typeof styledRow>;
      }
      | { type: "remove"; key: string }
      | { type: "move"; key: string; beforeKey: string | null }
      | { type: "replace"; key: string; tree: ReturnType<typeof styledRow> }
    >;
    if (action === 0 || rows.length < 3) {
      const key = `n${nextId++}`;
      const beforeIndex = rows.length === 0
        ? -1
        : Math.floor(random() * (rows.length + 1));
      const item = makeRow(key, 100 + nextId);
      const fullItem = cloneRow(item);
      operations.push({
        type: "insert",
        key,
        beforeKey: beforeIndex < 0 || beforeIndex === rows.length
          ? null
          : rows[beforeIndex].key,
        tree: styledRow(item),
      });
      if (beforeIndex < 0 || beforeIndex === rows.length) {
        rows.push(item);
        fullRows.push(fullItem);
      } else {
        rows.splice(beforeIndex, 0, item);
        fullRows.splice(beforeIndex, 0, fullItem);
      }
    } else if (action === 1) {
      const index = Math.floor(random() * rows.length);
      const [item] = rows.splice(index, 1);
      fullRows.splice(index, 1);
      operations.push({ type: "remove", key: item.key });
    } else if (action === 2) {
      const from = Math.floor(random() * rows.length);
      const to = Math.floor(random() * (rows.length + 1));
      const [item] = rows.splice(from, 1);
      const [fullItem] = fullRows.splice(from, 1);
      const target = Math.min(to, rows.length);
      operations.push({
        type: "move",
        key: item.key,
        beforeKey: target === rows.length ? null : rows[target].key,
      });
      rows.splice(target, 0, item);
      fullRows.splice(target, 0, fullItem);
    } else {
      const index = Math.floor(random() * rows.length);
      const prior = rows[index];
      const replacement = makeRow(prior.key, 200 + nextId++);
      const fullReplacement = cloneRow(replacement);
      rows[index] = replacement;
      fullRows[index] = fullReplacement;
      operations.push({
        type: "replace",
        key: prior.key,
        tree: styledRow(replacement),
      });
    }
    assert(
      deltaRoot.commitKeyedRegionDelta("list", "rows", operations),
      `delta rejected seeded step ${step}`,
    );
    fullRoot.commit(styledTree(fullRows));
    equal(
      hostShape(deltaContainer),
      hostShape(fullContainer),
      `host parity failed at seeded step ${step}`,
    );
    if (rows.length > 0 && step % 5 === 0) {
      const selected = rows[Math.floor(random() * rows.length)];
      const nextX = selected.x.value + 0.5;
      const nextY = selected.y.value + 1.5;
      const fullSelected = fullRows.find((item) => item.key === selected.key)!;
      deltaRoot.setSources([[selected.x, nextX], [selected.y, nextY]]);
      fullRoot.setSources([[fullSelected.x, nextX], [fullSelected.y, nextY]]);
      equal(
        hostShape(deltaContainer),
        hostShape(fullContainer),
        `source parity failed at seeded step ${step}`,
      );
    }
  }
  deltaRoot.dispose();
  fullRoot.dispose();
});

Deno.test("compiled graph retains fallback while plain direct bindings support deltas", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(0, 1);
  const rows = [jsx("li", { key: "a", title: bind(source) }, "a")];
  root.commit(jsx("ul", { key: "list" }, keyedOwnerChildren("rows", rows)), {
    sourceCount: 1,
    sourcePaths: ["state.value"],
    sourceBindingOffsets: [0, 1],
    bindingIds: [1],
  });
  same(
    root.commitKeyedRegionDelta("list", "rows", [
      {
        type: "insert",
        key: "b",
        beforeKey: null,
        tree: jsx("li", { key: "b" }, "b"),
      },
    ]),
    false,
    "compiled graph root must use generic fallback",
  );
  root.dispose();

  const directHost = new MemoryVDOMHost();
  const directContainer = directHost.createContainer();
  const directRoot = new VDOMSnapshotRoot(directHost, directContainer);
  directRoot.commit(
    jsx("ul", { key: "list" }, keyedOwnerChildren("rows", rows)),
    null,
    true,
  );
  same(
    directRoot.commitKeyedRegionDelta("list", "rows", [
      {
        type: "insert",
        key: "b",
        beforeKey: null,
        tree: jsx("li", { key: "b" }, "b"),
      },
    ]),
    true,
    "plain direct binding writers support sparse deltas",
  );
  directRoot.dispose();
});
