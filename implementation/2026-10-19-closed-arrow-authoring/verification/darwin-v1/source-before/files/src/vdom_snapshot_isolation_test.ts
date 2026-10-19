import { jsx, keyedOwnerChildren } from "./jsx_binding_runtime.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
  VDOMSnapshotRoot,
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
