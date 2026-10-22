import { jsx, keyedOwnerChildren, stampComponentOutput } from "./jsx_binding_runtime.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
  VDOMSnapshotRoot,
  createOwnedScalarStorePropDelta,
} from "./vdom_snapshot_runtime.ts";

type SnapshotElement = {
  key: string | null;
  children: readonly SnapshotElement[];
};

const equal = (actual: unknown, expected: unknown, message: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
};

const rows = (snapshot: readonly unknown[]) =>
  ((snapshot[0] as SnapshotElement).children[0].children).map((node) =>
    node.key
  );

const nestedRows = (snapshot: readonly unknown[]) =>
  ((snapshot[0] as SnapshotElement).children[0].children.find((row) =>
    row.key === "a"
  )?.children ?? []).map((node) => node.key);

const tree = () =>
  jsx("main", { key: "root" },
    jsx("section", { key: "branch" }, keyedOwnerChildren("rows", [
      jsx("article", { key: "a" }, keyedOwnerChildren("nested", [
        jsx("i", { key: "x" }, "X"),
      ])),
      jsx("article", { key: "b" }, "B"),
    ])));

Deno.test("owned Store application retains old accepted view through a throwing second writer", () => {
  let root!: VDOMSnapshotRoot<MemoryNode, MemoryNode>;
  let inspect = false;
  let observed = "";
  let writes = 0;
  const failure = new Error("second writer");
  const host = new class extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous: unknown) {
      if (inspect) {
        observed = JSON.stringify(root.snapshot);
        if (++writes === 2) throw failure;
      }
      super.setProp(node, name, value, previous);
    }
  }();
  const container = host.createContainer();
  root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("main", {}, [
    jsx("mesh", { key: "left", x: 1 }),
    jsx("mesh", { key: "right", x: 1 }),
  ]));
  const before = JSON.stringify(root.snapshot);
  const left = createOwnedScalarStorePropDelta({ key: "left", tag: "mesh",
    props: [["x", 2]], children: [] });
  const right = createOwnedScalarStorePropDelta({ key: "right", tag: "mesh",
    props: [["x", 2]], children: [] });
  if (!left || !right) throw new Error("owned setup declined");
  const program = root.prepareScopedKeyedRetainedAndStoreDeltas([], [], [left, right]);
  if (!program) throw new Error("owned program declined");
  root.beginPublication();
  inspect = true;
  let caught: unknown;
  try { program.commit(); } catch (error) { caught = error; }
  inspect = false;
  equal(caught, failure, "second writer error identity");
  equal(observed, before, "writer saw old accepted snapshot");
  equal(JSON.stringify(root.snapshot), before, "failed cut advanced accepted history");
  root.failPublication();
  equal(root.prepareScopedKeyedRetainedAndStoreDeltas([], [], [left]), null,
    "failed domain admitted another cut");
  root.dispose();
});

Deno.test("clean accepted snapshot and retained nested VNodes survive keyed publication", () => {
  let root!: VDOMSnapshotRoot<MemoryNode, MemoryNode>;
  let inspect = false;
  const during: Array<readonly unknown[]> = [];
  const host = new class extends MemoryVDOMHost {
    override place(
      parent: MemoryNode,
      node: MemoryNode,
      before: MemoryNode | null,
    ) {
      if (inspect) during.push(root.snapshot);
      super.place(parent, node, before);
    }
  }();
  root = new VDOMSnapshotRoot(host, host.createContainer());
  try {
    root.commit(tree());
    const accepted = root.snapshot;
    const retainedParent = (accepted[0] as SnapshotElement).children[0];
    const retainedRows = retainedParent.children;
    const initial = JSON.stringify(accepted);
    root.beginPublication();
    inspect = true;
    equal(
      root.commitKeyedRegionDelta("root", "rows", [{
        type: "insert",
        key: "c",
        beforeKey: null,
        tree: jsx("article", { key: "c" }),
      }]),
      true,
      "keyed delta accepted",
    );
    inspect = false;
    equal(during.length, 1, "host inspected one placement");
    equal(during[0], accepted, "host callback saw old accepted structure");
    equal(root.snapshot, accepted, "accepted structure changed during apply");
    root.publishAccepted();
    equal(rows(root.snapshot), ["a", "b", "c"], "published row order");
    equal(nestedRows(root.snapshot), ["x"], "nested bucket preserved");
    equal(JSON.stringify(accepted), initial, "retained snapshot mutated");
    equal(retainedParent.children, retainedRows, "retained child array changed");
  } finally {
    root.dispose();
  }
});

Deno.test("dirty accepted snapshot keeps keyed bucket authority across raw-key collisions", () => {
  for (const direction of ["ambiguous-to-unique", "unique-to-ambiguous"]) {
    let root!: VDOMSnapshotRoot<MemoryNode, MemoryNode>;
    let inspect = false;
    let during: readonly unknown[] | undefined;
    const host = new class extends MemoryVDOMHost {
      override place(parent: MemoryNode, node: MemoryNode, before: MemoryNode | null) {
        if (inspect && node.tag === "aside") during = root.snapshot;
        super.place(parent, node, before);
      }
    }();
    root = new VDOMSnapshotRoot(host, host.createContainer());
    const row = (owner: number) =>
      stampComponentOutput(jsx("article", { key: "same:0" }, owner), owner);
    const initialRows = direction === "ambiguous-to-unique"
      ? [row(71), row(72)] : [row(71)];
    const nextRows = direction === "ambiguous-to-unique"
      ? [row(72)] : [row(71), row(72)];
    const scene = (items: ReturnType<typeof row>[], prefix: boolean, added: boolean) =>
      jsx("main", { key: "root" }, [
        ...(prefix ? [jsx("aside", { key: "prefix" })] : []),
        jsx("section", { key: "rows" }, keyedOwnerChildren("rows-region", items)),
        jsx("ul", { key: "touch" }, keyedOwnerChildren("touch-region", [
          jsx("li", { key: "touch-a" }),
          ...(added ? [jsx("li", { key: "touch-b" })] : []),
        ])),
      ]);
    try {
      root.commit(scene(initialRows, false, false));
      equal(root.commitKeyedRegionDelta("root", "touch-region", [{
        type: "insert", key: "touch-b", beforeKey: null,
        tree: jsx("li", { key: "touch-b" }),
      }]), true, `${direction} dirtying delta`);
      root.beginPublication();
      inspect = true;
      root.commit(scene(nextRows, true, true));
      inspect = false;
      if (!during) throw new Error(`${direction} missed host-time snapshot`);
      const acceptedRows = ((during[0] as SnapshotElement).children[0].children)
        .map((node) => node.key);
      equal(acceptedRows, initialRows.map(() => "same:0"),
        `${direction} leaked candidate rows into accepted snapshot`);
      root.publishAccepted();
      const publishedRows = ((root.snapshot[0] as SnapshotElement).children[1].children)
        .map((node) => node.key);
      equal(publishedRows, nextRows.map(() => "same:0"),
        `${direction} failed to publish candidate rows`);
    } finally {
      root.dispose();
    }
  }
});

Deno.test("dirty accepted snapshot survives nested delta and partial host failure", () => {
  let root!: VDOMSnapshotRoot<MemoryNode, MemoryNode>;
  let failPlacement = false;
  let during: readonly unknown[] | undefined;
  const host = new class extends MemoryVDOMHost {
    override place(
      parent: MemoryNode,
      node: MemoryNode,
      before: MemoryNode | null,
    ) {
      if (failPlacement) {
        during = root.snapshot;
        super.place(parent, node, before);
        throw new Error("partial placement");
      }
      super.place(parent, node, before);
    }
  }();
  root = new VDOMSnapshotRoot(host, host.createContainer());
  try {
    root.commit(tree());
    const initial = root.snapshot;
    const initialJSON = JSON.stringify(initial);
    equal(root.commitKeyedRegionDelta("root", "rows", [{
      type: "move", key: "b", beforeKey: "a",
    }]), true, "first delta accepted");
    // No snapshot read here: beginPublication must reconstruct the dirty view.
    root.beginPublication();
    failPlacement = true;
    let failure: unknown;
    try {
      root.commitKeyedRegionDelta("a", "nested", [{
        type: "insert",
        key: "y",
        beforeKey: null,
        tree: jsx("i", { key: "y" }),
      }]);
    } catch (error) {
      failure = error;
      root.failPublication();
    }
    failPlacement = false;
    equal(failure instanceof Error, true, "partial host failure surfaced");
    equal(rows(during ?? []), ["b", "a"], "host saw dirty accepted order");
    equal(nestedRows(during ?? []), ["x"], "host saw old nested rows");
    equal(rows(root.snapshot), ["b", "a"], "accepted order after failure");
    equal(nestedRows(root.snapshot), ["x"], "accepted nested rows after failure");
    equal(JSON.stringify(initial), initialJSON, "earlier snapshot mutated");
  } finally {
    root.dispose();
  }
});
