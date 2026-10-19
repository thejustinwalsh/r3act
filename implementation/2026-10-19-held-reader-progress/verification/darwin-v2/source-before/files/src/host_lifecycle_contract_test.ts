import {
  bindVector3,
  jsx,
  keyedOwnerChildren,
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

const hostTag = (node: MemoryNode) => node.kind === "text" ? "#text" : node.tag;

class LifecycleMemoryHost extends MemoryVDOMHost {
  readonly creationProps: Array<{
    tag: string;
    props: Readonly<Record<string, unknown>>;
  }> = [];
  readonly disposed: MemoryNode[] = [];
  readonly removed: MemoryNode[] = [];
  readonly failDisposeIds = new Set<number>();
  failListenerCleanup = false;

  override createElement(
    tag: string,
    parent?: MemoryNode,
    creationProps: Readonly<Record<string, unknown>> = {},
  ) {
    this.creationProps.push({ tag, props: creationProps });
    return super.createElement(tag, parent);
  }

  override setProp(
    node: MemoryNode,
    name: string,
    value: unknown,
    previous: unknown,
  ) {
    if (
      this.failListenerCleanup && /^on[A-Z]/.test(name) && value === undefined
    ) {
      throw new Error(`listener cleanup failed for ${node.tag}`);
    }
    super.setProp(node, name, value, previous);
  }

  override remove(parent: MemoryNode, node: MemoryNode) {
    this.removed.push(node);
    super.remove(parent, node);
  }

  dispose(node: MemoryNode) {
    this.disposed.push(node);
    if (this.failDisposeIds.has(node.id)) {
      throw new Error(`dispose failed for ${node.tag ?? "text"}`);
    }
  }
}

Deno.test("host element construction receives materialized props before prop writes", () => {
  const host = new LifecycleMemoryHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const x = new ScalarSource(0, 1);
  const y = new ScalarSource(1, 2);
  const z = new ScalarSource(2, 3);

  root.commit(
    jsx("mesh", {
      args: ["geometry", "material"],
      position: bindVector3(x, y, z),
    }),
  );

  const mesh = container.children[0];
  assertEquals(host.creationProps[0], {
    tag: "mesh",
    props: { args: ["geometry", "material"], position: [1, 2, 3] },
  });
  assertEquals(mesh.props.position, [1, 2, 3]);
  root.setSource(x, 4);
  assertEquals(
    mesh.props.position,
    [4, 2, 3],
    "Bound props stopped updating after construction",
  );
  root.dispose();
});

Deno.test("removal and incompatible replacement dispose descendants postorder; reorder does not", () => {
  const host = new LifecycleMemoryHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const tree = (items: Array<[string, string]>) =>
    jsx(
      "scene",
      {},
      items.map(([key, tag]) =>
        jsx(tag, { key }, jsx("geometry", {}, "payload"))
      ),
    );

  root.commit(tree([["a", "mesh"], ["b", "mesh"]]));
  const scene = container.children[0];
  const a = scene.children[0];
  const b = scene.children[1];
  root.commit(tree([["b", "mesh"], ["a", "mesh"]]));
  assertEquals(host.disposed.length, 0, "Reordering disposed retained nodes");
  assertEquals(scene.children.map((node) => node.id), [b.id, a.id]);

  root.commit(tree([["b", "mesh"], ["a", "light"]]));
  assertEquals(host.disposed.map(hostTag), ["#text", "geometry", "mesh"]);
  assertEquals(scene.children[0].id, b.id);
  assertEquals(scene.children[1].tag, "light");

  root.commit(tree([["b", "mesh"]]));
  assertEquals(host.disposed.slice(3).map(hostTag), [
    "#text",
    "geometry",
    "light",
  ]);
  root.dispose();
});

Deno.test("sparse keyed collection removal disposes the removed subtree", () => {
  const host = new LifecycleMemoryHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const rows = (keys: string[]) =>
    jsx(
      "scene",
      { key: "root" },
      keyedOwnerChildren(
        "rows",
        keys.map((key) => jsx("mesh", { key }, jsx("geometry", {}, key))),
      ),
    );

  root.commit(rows(["a", "b"]));
  const committed = root.commitKeyedRegionDelta("root", "rows", [
    { type: "remove", key: "a" },
  ]);

  assertEquals(committed, true, "Expected sparse keyed removal path");
  assertEquals(host.disposed.map(hostTag), ["#text", "geometry", "mesh"]);
  root.dispose();
});

Deno.test("root disposal continues removals and postorder disposal after host failures", () => {
  const host = new LifecycleMemoryHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const listener = () => {};
  root.commit(jsx("main", {}, [
    jsx("mesh", { key: "a", onClick: listener }, jsx("geometry", {}, "a")),
    jsx("mesh", { key: "b" }, jsx("geometry", {}, "b")),
  ]));
  const [first, second] = container.children[0].children;
  const failingGeometry = first.children[0];
  host.failDisposeIds.add(failingGeometry.id);
  host.failListenerCleanup = true;

  let caught: unknown;
  try {
    root.dispose();
  } catch (error) {
    caught = error;
  }

  if (!(caught instanceof AggregateError)) {
    throw new Error("Expected aggregate disposal errors");
  }
  assertEquals(host.disposed.map(hostTag), [
    "#text",
    "geometry",
    "mesh",
    "#text",
    "geometry",
    "mesh",
    "main",
  ]);
  assertEquals(host.removed.map((node) => node.tag), ["main"]);
  assertEquals(
    container.children.length,
    0,
    "Failed cleanup prevented root removal",
  );
  assertEquals(
    root.snapshot,
    [],
    "Root retained its mounted snapshot after disposal",
  );
  assertEquals(host.disposed.includes(second), true);
});
