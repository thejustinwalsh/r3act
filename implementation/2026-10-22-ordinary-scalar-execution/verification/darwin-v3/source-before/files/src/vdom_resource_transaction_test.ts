import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { bindSources, jsx, keyedOwnerChildren, ScalarSource } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot, type MemoryNode } from "./vdom_snapshot_runtime.ts";

const numeric = (source: ScalarSource) => bindSources([source], () => {
  throw new Error("authored numeric projector must not run");
}, {
  schemaVersion: 2, ownerProgramId: "resource-transaction", sinkId: "numeric",
  sourceSites: ["numeric"], closedExpression: { kind: "input", index: 0 },
});
const scene = (source: ScalarSource) => jsx("main", { key: "app" }, [
  jsx("output", { key: "numeric", x: numeric(source) }),
  jsx("ul", { key: "rows" }, keyedOwnerChildren("rows-region", [
    jsx("li", { key: "a" }, "a"), jsx("li", { key: "b" }, "b"),
  ])),
  jsx("mesh", { key: "store", x: 1 }),
  jsx("div", { key: "resource", phase: "waiting" }, [
    jsx("span", { key: "fallback" }, "loading"),
  ]),
]);
const move = [{ parentKey: "rows", regionId: "rows-region", operations: [
  { type: "move" as const, key: "b", beforeKey: "a" },
] }];
const replacement = [{ key: "resource", tree: jsx("section", {
  key: "resource", phase: "ready",
}, [jsx("strong", { key: "content" }, "ready")]) }];
const prepare = (root: VDOMSnapshotRoot<MemoryNode, MemoryNode>, source: ScalarSource) =>
  root.prepareScopedKeyedRetainedAndStoreDeltas(move, [[source, 2]],
    [{ key: "store", tag: "mesh", props: [["x", 3]] }], replacement);

Deno.test("one scoped publication combines keyed, retained, Store and resource replacement", () => {
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(1, 1);
  root.commit(scene(source), null, true);
  const main = container.children[0], rows = main.children[1];
  const rowA = rows.children[0], rowB = rows.children[1];
  const oldResource = main.children[3];
  source.value = 2;
  const program = prepare(root, source);
  assert(program, "joint scoped program must prepare");
  assert(program.validate());
  assertEquals(program.structuralVersionDelta, 1);
  const accepted = JSON.stringify(root.snapshot), before = root.appliedVersion;
  root.beginPublication();
  program.commit();
  assertEquals(root.appliedVersion, before + 1);
  assertEquals(JSON.stringify(root.snapshot), accepted);
  assert(program.validatePostHost());
  root.publishAccepted();
  assertStrictEquals(rows.children[0], rowB);
  assertStrictEquals(rows.children[1], rowA);
  assert(main.children[3] !== oldResource);
  assertEquals(main.children[3].tag, "section");
  assertEquals(main.children[0].props.x, 2);
  assertEquals(main.children[2].props.x, 3);
  root.dispose();
});

Deno.test("joint resource cut declines a key introduced by a disjoint keyed edit", () => {
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(1, 1);
  root.commit(scene(source), null, true);
  source.value = 2;
  const colliding = root.prepareScopedKeyedRetainedAndStoreDeltas([{
    parentKey: "rows", regionId: "rows-region", operations: [{ type: "insert",
      key: "content", beforeKey: null,
      tree: jsx("li", { key: "content" }, "collision") }],
  }], [[source, 2]], [], replacement);
  assertEquals(colliding, null);
  const reusedRemoved = root.prepareScopedKeyedRetainedAndStoreDeltas([{
    parentKey: "rows", regionId: "rows-region", operations: [
      { type: "remove", key: "a" },
    ],
  }], [[source, 2]], [], [{ key: "resource", tree: jsx("section", {
    key: "resource", phase: "ready",
  }, [jsx("strong", { key: "a" }, "collision")]) }]);
  assertEquals(reusedRemoved, null);
  root.dispose();
});

Deno.test("partial replacement failure retains the old accepted snapshot", () => {
  class ThrowingHost extends MemoryVDOMHost {
    fail = false;
    disposed: MemoryNode[] = [];
    override createElement(tag: string, parent?: MemoryNode, props?: Readonly<Record<string, unknown>>) {
      if (this.fail && tag === "strong") throw new Error("partial replacement");
      return super.createElement(tag, parent, props);
    }
    dispose(node: MemoryNode) { this.disposed.push(node); }
  }
  const host = new ThrowingHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(1, 1);
  root.commit(scene(source), null, true);
  source.value = 2;
  const program = prepare(root, source);
  assert(program, "joint scoped program must prepare before the host fails");
  assert(program.validate());
  const accepted = JSON.stringify(root.snapshot);
  host.fail = true;
  root.beginPublication();
  let threw = false;
  try { program.commit(); } catch { threw = true; }
  assert(threw);
  assert(host.disposed.some((node) => node.tag === "section"));
  assertEquals(JSON.stringify(root.snapshot), accepted);
  root.failPublication();
  assertEquals(JSON.stringify(root.snapshot), accepted);
  assertEquals(root.prepareScopedHostSubtreeReplacements(replacement), null);
  host.fail = false;
  root.dispose();
});
