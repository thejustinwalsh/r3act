import {
  bindCompiledColumn,
  bindVector3,
  jsx,
  NumericColumn,
  ScalarSource,
} from "./jsx_binding_runtime.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
  VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";

const assertEquals = (
  actual: unknown,
  expected: unknown,
  message = "Values differ",
) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, received ${
        JSON.stringify(actual)
      }`,
    );
  }
};

const assertSame = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) throw new Error(message);
};

const assertNotSame = (actual: unknown, expected: unknown, message: string) => {
  if (actual === expected) throw new Error(message);
};

Deno.test("JSX runtime elements and child arrays are immutable for safe retained reuse", () => {
  const sourceChildren = [jsx("i", {}, "a"), [jsx("b", {}, "b")]];
  const element = jsx("div", { children: sourceChildren });
  const children = element.props.children as unknown[];
  assertEquals(Object.isFrozen(element), true);
  assertEquals(Object.isFrozen(element.props), true);
  assertEquals(Object.isFrozen(children), true);
  assertEquals(Object.isFrozen(children[1]), true);
  assertEquals(
    Object.isFrozen(sourceChildren),
    false,
    "JSX factory must not freeze a caller-owned child array",
  );
});

Deno.test("vector bindings coalesce frame sources into one stable host prop write", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const x = new ScalarSource(0, 1);
  const y = new ScalarSource(1, 2);
  const z = new ScalarSource(2, 3);
  root.commit(jsx("mesh", { position: bindVector3(x, y, z) }));

  const mesh = container.children[0];
  const position = mesh.props.position as [number, number, number];
  const writesBeforeFrame = host.writeCount;
  root.setSources([[x, 4], [y, 5], [z, 6]]);

  assertSame(
    mesh.props.position,
    position,
    "Vector tuple was reallocated during the frame",
  );
  assertEquals(position, [4, 5, 6], "Batched vector values were not applied");
  assertEquals(
    host.writeCount - writesBeforeFrame,
    1,
    "One bound prop should be written once per frame batch",
  );

  root.setSource(y, 7);
  assertSame(
    mesh.props.position,
    position,
    "Single-source update replaced the stable vector tuple",
  );
  assertEquals(position, [4, 7, 6], "Single-source vector update was lost");
  root.dispose();
});

Deno.test("compiled numeric columns update stable VDOM writers as one batch", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const x = new NumericColumn(0, 0, new Float64Array([1, 3]));
  const y = new NumericColumn(1, 1, new Float64Array([2, 4]));
  const tree = () =>
    jsx("div", {}, [
      jsx("i", {
        key: "a",
        style: {
          left: bindCompiledColumn(x, 0, 4, (value) => `${value}px`),
          top: bindCompiledColumn(y, 0, 9, (value) => `${value}px`),
        },
      }),
      jsx("i", {
        key: "b",
        style: {
          left: bindCompiledColumn(x, 1, 4, (value) => `${value}px`),
          top: bindCompiledColumn(y, 1, 9, (value) => `${value}px`),
        },
      }),
    ]);
  const graph = {
    sourceCount: 2,
    sourcePaths: ["Position.x", "Position.y"],
    sourceBindingOffsets: [0, 1, 2],
    bindingIds: [4, 9],
  };
  root.commit(tree(), graph);
  const board = container.children[0];
  const original = [...board.children];
  x.values.set([5, 7]);
  y.values.set([6, 8]);
  const writesBefore = host.writeCount;
  assertEquals(root.setColumns([x, y]), true);
  assertEquals(board.children.map((node) => node.props.style), [
    { left: "5px", top: "6px" },
    { left: "7px", top: "8px" },
  ]);
  assertEquals(host.writeCount - writesBefore, 4);
  assertSame(
    board.children[0],
    original[0],
    "Column update replaced host row a",
  );
  assertSame(
    board.children[1],
    original[1],
    "Column update replaced host row b",
  );
  const writesAfterChange = host.writeCount;
  assertEquals(
    root.setColumns([x, y]),
    false,
    "An unchanged column must be skipped",
  );
  assertEquals(
    host.writeCount,
    writesAfterChange,
    "Unchanged columns wrote host props",
  );
  root.dispose();
});

Deno.test("compiled column rows and buckets target dirty rows and rebuild after growth", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const x = new NumericColumn(0, 0, new Float64Array([1, 2, 3, 4]));
  const y = new NumericColumn(1, 1, new Float64Array([10, 20, 30, 40]));
  const graph = {
    sourceCount: 2,
    sourcePaths: ["Position.x", "Position.y"],
    sourceBindingOffsets: [0, 1, 2],
    bindingIds: [4, 9],
  };
  const tree = (count: number) =>
    jsx(
      "div",
      {},
      Array.from({ length: count }, (_, row) =>
        jsx("i", {
          key: `row-${row}`,
          style: {
            left: bindCompiledColumn(x, row, 4, (value) => `${value}px`),
            top: bindCompiledColumn(y, row, 9, (value) => `${value}px`),
          },
        })),
    );
  root.commit(tree(4), graph);
  const board = container.children[0];
  const original = [...board.children];

  x.values[1] = 12;
  y.values[1] = 22;
  x.values[3] = 14;
  y.values[3] = 44;
  const beforeRows = host.writeCount;
  assertEquals(root.setColumnRows([x, y], new Uint32Array([1, 3])), true);
  assertEquals(
    host.writeCount - beforeRows,
    4,
    "Only two dirty rows should write",
  );
  assertEquals(board.children.map((node) => node.props.style), [
    { left: "1px", top: "10px" },
    { left: "12px", top: "22px" },
    { left: "3px", top: "30px" },
    { left: "14px", top: "44px" },
  ]);

  x.values[0] = 11;
  y.values[0] = 21;
  const beforeBucket = host.writeCount;
  assertEquals(root.setColumnBuckets([x, y], new Uint32Array([0]), 1, 2), true);
  assertEquals(
    host.writeCount - beforeBucket,
    2,
    "A bucket should skip unchanged rows",
  );
  assertEquals(board.children[0].props.style, { left: "11px", top: "21px" });
  assertSame(
    board.children[0],
    original[0],
    "Dirty bucket replaced a host node",
  );
  assertSame(board.children[3], original[3], "Dirty rows replaced a host node");

  x.values = new Float64Array([11, 12, 3, 14, 5]);
  y.values = new Float64Array([21, 22, 30, 44, 50]);
  root.commit(tree(5), graph);
  const grownHost = board.children[4];
  x.values[4] = 15;
  y.values[4] = 55;
  assertEquals(root.setColumnRows([x, y], new Uint32Array([4])), true);
  assertEquals(grownHost.props.style, { left: "15px", top: "55px" });
  assertEquals(
    board.children.length,
    5,
    "Structural growth did not mount the new row",
  );
  root.dispose();
});

Deno.test("keyed VDOM reorder preserves host identity and only changes child order", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const tree = (keys: string[]) =>
    jsx(
      "ul",
      {},
      keys.map((key) => jsx("li", { key, "data-key": key }, key.toUpperCase())),
    );

  root.commit(tree(["a", "b", "c"]));
  const list = container.children[0];
  const originalChildren = new Map(
    list.children.map((child) => [String(child.props["data-key"]), child]),
  );
  const writesBeforeReorder = host.writeCount;

  root.commit(tree(["c", "a", "b"]));

  assertEquals(list.children.map((child) => child.props["data-key"]), [
    "c",
    "a",
    "b",
  ]);
  for (const child of list.children) {
    assertSame(
      child,
      originalChildren.get(String(child.props["data-key"])),
      `Key ${child.props["data-key"]} lost host identity during reorder`,
    );
  }
  assertEquals(
    host.writeCount,
    writesBeforeReorder,
    "A pure keyed reorder should not rewrite props or text",
  );
  assertSame(
    container.children[0],
    list,
    "Reordering descendants replaced the parent list",
  );
});

Deno.test("linear keyed move planning preserves order and host identity", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const tree = (keys: string[]) =>
    jsx("ul", {}, keys.map((key) => jsx("li", { key, "data-key": key })));
  root.commit(tree(["a", "b", "c", "d"]));
  const list = container.children[0];
  const originals = new Map(
    list.children.map((child) => [String(child.props["data-key"]), child]),
  );

  let placements = host.placementCount;
  root.commit(tree(["b", "c", "d", "a"]));
  assertEquals(list.children.map((node) => node.props["data-key"]), [
    "b",
    "c",
    "d",
    "a",
  ]);
  assertEquals(
    host.placementCount - placements,
    1,
    "A single rotation should move one retained node",
  );
  for (const node of list.children) {
    assertSame(
      node,
      originals.get(String(node.props["data-key"])),
      "Rotation lost keyed host identity",
    );
  }

  placements = host.placementCount;
  root.commit(tree(["b", "d"]));
  assertEquals(list.children.map((node) => node.props["data-key"]), ["b", "d"]);
  assertEquals(
    host.placementCount,
    placements,
    "Filtering a stable subsequence should not place retained nodes",
  );

  placements = host.placementCount;
  root.commit(tree(["x", "b", "d"]));
  assertEquals(list.children.map((node) => node.props["data-key"]), [
    "x",
    "b",
    "d",
  ]);
  assertEquals(
    host.placementCount - placements,
    1,
    "Inserting one leaf should place one new node",
  );
  assertSame(
    list.children[1],
    originals.get("b"),
    "Insertion replaced retained key b",
  );
  assertSame(
    list.children[2],
    originals.get("d"),
    "Insertion replaced retained key d",
  );
});

Deno.test("stable child order updates avoid redundant host placements", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const tree = (value: number) =>
    jsx("ul", {}, [
      jsx("li", { key: "a", "data-value": value }, String(value)),
      jsx("li", { key: "b", "data-value": "steady" }, "steady"),
    ]);
  root.commit(tree(0));
  const initialPlacements = host.placementCount;
  const initialA = container.children[0].children[0];
  const initialB = container.children[0].children[1];

  root.commit(tree(1));

  assertEquals(
    host.placementCount,
    initialPlacements,
    "Stable ordering should not place or move existing host nodes",
  );
  assertSame(
    container.children[0].children[0],
    initialA,
    "Stable child a lost host identity",
  );
  assertSame(
    container.children[0].children[1],
    initialB,
    "Stable child b lost host identity",
  );
  assertEquals(
    container.children[0].children[0].children[0].text,
    "1",
    "Changed child text was not committed",
  );
  assertEquals(
    container.children[0].children[0].props["data-value"],
    1,
    "Changed child prop was not committed",
  );
});

Deno.test("keyed region commit updates one subtree without placing siblings", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("main", {}, [
    jsx("section", { key: "region", "data-value": 0 }, jsx("span", {}, "old")),
    jsx("aside", { key: "sibling", "data-stable": true }, "steady"),
  ]));
  const main = container.children[0];
  const region = main.children[0];
  const sibling = main.children[1];
  const placements = host.placementCount;
  const writes = host.writeCount;

  const committed = root.commitKeyedRegion(
    "region",
    jsx("section", { key: "region", "data-value": 1 }, jsx("span", {}, "new")),
  );

  assertEquals(
    committed,
    true,
    "Stable keyed region did not use partial commit",
  );
  assertSame(
    main.children[0],
    region,
    "Partial commit replaced its target host node",
  );
  assertSame(
    main.children[1],
    sibling,
    "Partial commit disturbed an unrelated sibling",
  );
  assertEquals(region.props["data-value"], 1);
  assertEquals(region.children[0].children[0].text, "new");
  assertEquals(
    host.placementCount,
    placements,
    "Partial commit placed or moved a host node",
  );
  assertEquals(
    host.writeCount - writes,
    2,
    "Partial commit should write only the changed prop and text",
  );
  assertEquals(
    (root.snapshot[0] as any).children[0].props["data-value"],
    1,
    "Snapshot missed the partial commit",
  );
});

Deno.test("keyed region commits maintain the global key index by delta", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const counterSamples: Array<Record<string, number>> = [];
  const root = new VDOMSnapshotRoot(host, container, undefined, (counts) => {
    counterSamples.push({ ...counts });
  });
  root.commit(jsx("main", {}, [
    jsx("section", { key: "region" }, jsx("i", { key: "old-child" }, "old")),
    jsx("aside", { key: "sibling" }, "steady"),
  ]));
  const region = container.children[0].children[0];
  const sibling = container.children[0].children[1];

  assertEquals(
    root.commitKeyedRegion(
      "region",
      jsx("section", { key: "region" }, jsx("b", { key: "new-child" }, "new")),
    ),
    true,
  );
  assertEquals(counterSamples.at(-1), {
    "vdom.key-index.incremental-old-visits": 2,
    "vdom.key-index.incremental-new-visits": 2,
  });
  assertSame(
    container.children[0].children[0],
    region,
    "Key-index maintenance replaced the region host node",
  );
  assertSame(
    container.children[0].children[1],
    sibling,
    "Key-index maintenance disturbed the sibling host node",
  );
  assertEquals(
    root.commitKeyedRegion(
      "old-child",
      jsx("i", { key: "old-child" }, "stale"),
    ),
    false,
    "Removed descendant key remained in the global index",
  );
  assertEquals(
    root.commitKeyedRegion(
      "new-child",
      jsx("b", { key: "new-child" }, "updated"),
    ),
    true,
    "Inserted descendant key was absent from the global index",
  );
  assertEquals(counterSamples.at(-1), {
    "vdom.key-index.incremental-old-visits": 0,
    "vdom.key-index.incremental-new-visits": 0,
  }, "A text-only edit should not traverse the key index");
});

Deno.test("keyed region subtree-rescan baseline matches the prior index algorithm", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const counterSamples: Array<Record<string, number>> = [];
  const root = new VDOMSnapshotRoot(
    host,
    container,
    undefined,
    (counts) => counterSamples.push({ ...counts }),
    "rebuild",
  );
  root.commit(jsx("main", {}, [
    jsx("section", { key: "region" }, jsx("i", { key: "old-child" }, "old")),
    jsx("aside", { key: "sibling" }, "steady"),
  ]));

  assertEquals(
    root.commitKeyedRegion(
      "region",
      jsx("section", { key: "region" }, jsx("b", { key: "new-child" }, "new")),
    ),
    true,
  );
  assertEquals(counterSamples.at(-1), {
    "vdom.key-index.subtree-rescan-old-visits": 3,
    "vdom.key-index.subtree-rescan-new-visits": 3,
  });
  assertEquals(
    root.commitKeyedRegion(
      "old-child",
      jsx("i", { key: "old-child" }, "stale"),
    ),
    false,
    "Removed descendant key remained in the rebuilt global index",
  );
  assertEquals(
    root.commitKeyedRegion(
      "new-child",
      jsx("b", { key: "new-child" }, "updated"),
    ),
    true,
    "Inserted descendant key was absent from the rebuilt global index",
  );
  root.dispose();
});

Deno.test("keyed region commit declines incompatible or ambiguous roots without host writes", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("main", {}, [
    jsx("section", { key: "region" }, "one"),
    jsx("aside", {}, jsx("section", { key: "duplicate" }, "two")),
    jsx("article", {}, jsx("section", { key: "duplicate" }, "three")),
  ]));
  const writes = host.writeCount;
  const placements = host.placementCount;

  assertEquals(
    root.commitKeyedRegion(
      "region",
      jsx("article", { key: "region" }, "changed"),
    ),
    false,
    "Host type change should use full reconciliation",
  );
  assertEquals(
    root.commitKeyedRegion(
      "duplicate",
      jsx("section", { key: "duplicate" }, "changed"),
    ),
    false,
    "Duplicate global key should use full reconciliation",
  );
  assertEquals(
    host.writeCount,
    writes,
    "Declined partial commits changed host props or text",
  );
  assertEquals(
    host.placementCount,
    placements,
    "Declined partial commits changed host placement",
  );
});

Deno.test("multi-region keyed commit validates every region before mutating any host", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("main", {}, [
    jsx("span", { key: "a", "data-id": "a" }, "A"),
    jsx("span", { key: "b", "data-id": "b" }, "B"),
    jsx("span", { key: "c", "data-id": "c" }, "C"),
  ]));
  const beforeVersion = root.version;
  const beforeNodes = [...container.children[0].children];

  const committed = root.commitKeyedRegions([
    { key: "a", tree: jsx("span", { key: "a", "data-id": "a" }, "A updated") },
    {
      key: "b",
      tree: jsx(
        "span",
        { key: "b", "data-id": "b" },
        jsx("i", { key: "c" }, "collision"),
      ),
    },
  ]);

  assertEquals(
    committed,
    false,
    "A candidate key that collides with a surviving sibling must reject the whole batch",
  );
  assertEquals(
    root.version,
    beforeVersion,
    "Rejected batch must not advance the committed version",
  );
  assertSame(
    container.children[0].children[0],
    beforeNodes[0],
    "Rejected batch replaced the first target node",
  );
  assertSame(
    container.children[0].children[1],
    beforeNodes[1],
    "Rejected batch replaced the second target node",
  );
  assertSame(
    container.children[0].children[2],
    beforeNodes[2],
    "Rejected batch changed the untouched sibling",
  );
  assertEquals(
    container.children[0].children.map((node) => node.children[0]?.text),
    ["A", "B", "C"],
  );

  assertEquals(
    root.commitKeyedRegions([
      { key: "a", tree: jsx("span", { key: "a", "data-id": "a" }, "A2") },
      { key: "b", tree: jsx("span", { key: "b", "data-id": "b" }, "B2") },
    ]),
    true,
    "Valid disjoint regions should commit",
  );
  assertSame(
    container.children[0].children[0],
    beforeNodes[0],
    "Valid patch should retain target a host identity",
  );
  assertSame(
    container.children[0].children[1],
    beforeNodes[1],
    "Valid patch should retain target b host identity",
  );
  assertSame(
    container.children[0].children[2],
    beforeNodes[2],
    "Valid patch should retain untouched sibling identity",
  );
  assertEquals(
    container.children[0].children.map((node) => node.children[0]?.text),
    ["A2", "B2", "C"],
  );
  assertEquals(
    root.partialCommitCount,
    2,
    "Partial region counter should count patched regions",
  );
  assertEquals(
    root.partialCommitBatchCount,
    1,
    "One multi-region call should publish one commit batch",
  );
  root.dispose();
});

Deno.test("removal detaches keyed nodes and a later insertion creates fresh host identity", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const tree = (keys: string[]) =>
    jsx(
      "ul",
      {},
      keys.map((key) => jsx("li", { key, "data-key": key }, key.toUpperCase())),
    );

  root.commit(tree(["a", "b", "c"]));
  const list = container.children[0];
  const original = new Map(
    list.children.map((child) => [String(child.props["data-key"]), child]),
  );
  const removed = original.get("b")!;

  root.commit(tree(["a", "c"]));
  assertEquals(list.children.map((child) => child.props["data-key"]), [
    "a",
    "c",
  ]);
  assertEquals(removed.parent, null, "Removed keyed node stayed attached");
  assertSame(
    list.children[0],
    original.get("a"),
    "Retained key a lost host identity",
  );
  assertSame(
    list.children[1],
    original.get("c"),
    "Retained key c lost host identity",
  );

  root.commit(tree(["b", "a", "c"]));
  assertEquals(list.children.map((child) => child.props["data-key"]), [
    "b",
    "a",
    "c",
  ]);
  assertNotSame(
    list.children[0],
    removed,
    "A removed key incorrectly reused its detached host node",
  );
  assertSame(
    list.children[1],
    original.get("a"),
    "Reinserting another key disturbed retained identity",
  );
  assertSame(
    list.children[2],
    original.get("c"),
    "Reinserting another key disturbed retained identity",
  );

  const topLevel = container.children[0];
  root.dispose();
  assertEquals(
    container.children.length,
    0,
    "Disposing the root left a host child attached",
  );
  assertEquals(
    topLevel.parent,
    null,
    "Disposing the root left its top-level parent pointer attached",
  );
});

Deno.test("duplicate next-sibling keys fail before changing the committed host tree", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const tree = (keys: string[]) =>
    jsx(
      "ul",
      {},
      keys.map((key) => jsx("li", { key, "data-key": key }, key.toUpperCase())),
    );

  root.commit(tree(["a", "b"]));
  const committedList = container.children[0];
  const committedChildren = [...committedList.children];
  const committedVersion = root.version;

  let thrown: unknown;
  try {
    root.commit(tree(["b", "b"]));
  } catch (error) {
    thrown = error;
  }

  if (
    !(thrown instanceof Error) ||
    thrown.message !== "Duplicate key in next VDOM children: b"
  ) {
    throw new Error(
      `Expected duplicate-key validation error, received ${String(thrown)}`,
    );
  }
  assertSame(
    container.children[0],
    committedList,
    "Invalid update replaced the committed list",
  );
  assertEquals(
    committedList.children.map((child) => child.id),
    committedChildren.map((child) => child.id),
    "Invalid update partially changed committed children",
  );
  assertEquals(
    root.version,
    committedVersion,
    "Invalid update advanced the committed version",
  );
});

Deno.test("changing a key's host type replaces the incompatible node", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const first = jsx("li", { key: "same", "data-key": "same" }, "row");
  root.commit(first);
  const oldNode: MemoryNode = container.children[0];

  root.commit(jsx("button", { key: "same", "data-key": "same" }, "button"));

  assertEquals(container.children[0].tag, "button");
  assertNotSame(
    container.children[0],
    oldNode,
    "A host type change reused an incompatible node",
  );
  assertEquals(oldNode.parent, null, "Replaced host node stayed attached");
});

Deno.test("removing and disposing keyed subtrees releases native event props", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const onClick = () => {};
  const tree = (includeButton: boolean) =>
    jsx(
      "div",
      {},
      includeButton ? jsx("button", { key: "button", onClick }, "Click") : null,
    );

  root.commit(tree(true));
  const removedButton = container.children[0].children[0];
  assertSame(
    removedButton.props.onClick,
    onClick,
    "Native event prop was not installed",
  );

  root.commit(tree(false));
  assertEquals(
    removedButton.props.onClick,
    undefined,
    "Removed node retained its native event callback",
  );
  assertEquals(
    removedButton.parent,
    null,
    "Removed event node stayed attached",
  );

  root.commit(jsx("button", { onClick }, "Root button"));
  const disposedButton = container.children[0];
  root.dispose();
  assertEquals(
    disposedButton.props.onClick,
    undefined,
    "Disposed root retained its native event callback",
  );
  assertEquals(
    disposedButton.parent,
    null,
    "Disposed event node stayed attached",
  );
});
