import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { bindSources, jsx, keyedOwnerChildren, ScalarSource } from "./jsx_binding_runtime.ts";
import {
  MemoryVDOMHost,
  VDOMSnapshotRoot,
  type PreparedKeyedVDOMProgram,
  type MemoryNode,
} from "./vdom_snapshot_runtime.ts";

const fallback = () => jsx("div", { key: "resource-host", "data-phase": "pending" }, [
  jsx("span", { key: "fallback-child" }, "loading"),
]);
const primary = () => jsx("section", { key: "resource-host", "data-phase": "ready" }, [
  jsx("h2", { key: "title" }, "ready"),
  jsx("p", { key: "detail" }, "value"),
]);
const scene = () => jsx("main", { key: "app" }, [
  jsx("aside", { key: "before" }, "before"),
  fallback(),
  jsx("aside", { key: "after" }, "after"),
  jsx("ul", { key: "rows" }, keyedOwnerChildren("rows-region", [
    jsx("li", { key: "a" }, "a"), jsx("li", { key: "b" }, "b"),
  ])),
]);
const accept = (root: VDOMSnapshotRoot<MemoryNode, MemoryNode>,
  program: PreparedKeyedVDOMProgram) => {
  assert(program.validate());
  root.beginPublication();
  program.commit();
  assert(program.validatePostHost());
  root.publishAccepted();
};

Deno.test("scoped resource subtree replaces a nested fallback with a different host type", () => {
  class OwnedHost extends MemoryVDOMHost {
    disposed: MemoryNode[] = [];
    dispose(node: MemoryNode) { this.disposed.push(node); }
  }
  const host = new OwnedHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(scene());
  const main = container.children[0];
  const [before, old, after] = main.children;
  const oldChild = old.children[0];
  const program = root.prepareScopedHostSubtreeReplacements([
    { key: "resource-host", tree: primary() },
  ]);
  assert(program && program.scoped && program.structuralVersionDelta === 1);
  const accepted = JSON.stringify(root.snapshot);
  root.beginPublication();
  program.commit();
  assertEquals(JSON.stringify(root.snapshot), accepted,
    "host application exposed an unaccepted fallback replacement");
  assert(program.validatePostHost());
  root.publishAccepted();
  assertStrictEquals(main.children[0], before);
  assertStrictEquals(main.children[2], after);
  assert(main.children[1] !== old);
  assertEquals(main.children[1].tag, "section");
  assertEquals(main.children[1].children.map((child) => child.tag), ["h2", "p"]);
  assert(host.disposed.includes(oldChild) && host.disposed.includes(old),
    "old fallback subtree did not release host-owned resources");
  assertEquals((root.snapshot[0] as { children: Array<{ tag: string }> })
    .children[1].tag, "section");
  root.dispose();
});

Deno.test("scoped resource reveal merges a disjoint keyed edit and stales overlap", () => {
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(scene());
  const first = root.prepareScopedHostSubtreeReplacements([
    { key: "resource-host", tree: primary() },
  ]);
  const overlap = root.prepareScopedHostSubtreeReplacements([
    { key: "resource-host", tree: primary() },
  ]);
  assert(first && overlap);
  assert(root.commitKeyedRegionDelta("rows", "rows-region", [
    { type: "move", key: "b", beforeKey: "a" },
  ]));
  assert(first.validate(), "disjoint keyed edit invalidated fallback target");
  accept(root, first);
  assertEquals(container.children[0].children[3].children[0].children[0].text, "b");
  assertEquals(overlap.validate(), false, "overlapping fallback stayed current");
  overlap.discard();
  root.dispose();
});

Deno.test("scoped resource reveal declines bound fallback, unsafe props and key collision", () => {
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(1, 1);
  const bound = bindSources([source], ([value]) => value, {
    schemaVersion: 2, ownerProgramId: "fallback", sinkId: "x",
    sourceSites: ["x"], closedExpression: { kind: "input", index: 0 },
  });
  root.commit(jsx("main", { key: "app" }, [
    jsx("div", { key: "resource-host", x: bound }, "loading"),
  ]), null, true);
  assertEquals(root.prepareScopedHostSubtreeReplacements([
    { key: "resource-host", tree: primary() },
  ]), null);
  root.dispose();

  for (const props of [
    { style: { color: "red" } },
    { onClick: () => {} },
    { ref: { current: null } },
  ]) {
    const unsafeHost = new MemoryVDOMHost();
    const unsafe = new VDOMSnapshotRoot(unsafeHost, unsafeHost.createContainer());
    unsafe.commit(jsx("div", { key: "resource-host", ...props }, "loading"));
    assertEquals(unsafe.prepareScopedHostSubtreeReplacements([
      { key: "resource-host", tree: primary() },
    ]), null);
    unsafe.dispose();
  }

  const plain = new VDOMSnapshotRoot(host, host.createContainer());
  plain.commit(scene());
  assertEquals(plain.prepareScopedHostSubtreeReplacements([
    { key: "resource-host", tree: jsx("section", { key: "resource-host", onClick: () => {} }) },
  ]), null);
  assertEquals(plain.prepareScopedHostSubtreeReplacements([
    { key: "resource-host", tree: jsx("section", { key: "resource-host" },
      jsx("p", { key: "after" }, "collision")) },
  ]), null);
  plain.dispose();
});

Deno.test("resource subtree host failure retains accepted fallback and quarantines later cuts", () => {
  class ThrowingHost extends MemoryVDOMHost {
    fail = false;
    override place(parent: MemoryNode, node: MemoryNode, before: MemoryNode | null) {
      super.place(parent, node, before);
      if (this.fail && node.tag === "section") throw new Error("partial reveal placement");
    }
  }
  const host = new ThrowingHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(scene());
  const accepted = JSON.stringify(root.snapshot);
  const reveal = root.prepareScopedHostSubtreeReplacements([
    { key: "resource-host", tree: primary() },
  ]);
  assert(reveal);
  root.beginPublication();
  host.fail = true;
  let threw = false;
  try { reveal.commit(); } catch { threw = true; }
  assert(threw);
  assertEquals(JSON.stringify(root.snapshot), accepted,
    "partially applied reveal changed the accepted fallback view");
  root.failPublication();
  assertEquals(root.prepareScopedHostSubtreeReplacements([
    { key: "resource-host", tree: primary() },
  ]), null);
  host.fail = false;
  root.dispose();
});

Deno.test("nested reveal constructor failure releases only new host handles", () => {
  class TrackingHost extends MemoryVDOMHost {
    creating = false;
    created: MemoryNode[] = [];
    disposed: MemoryNode[] = [];
    override createElement(tag: string, parent?: MemoryNode,
      props?: Readonly<Record<string, unknown>>) {
      const node = super.createElement(tag, parent, props);
      if (this.creating) this.created.push(node);
      return node;
    }
    override createText(value: string) {
      const node = super.createText(value);
      if (this.creating) this.created.push(node);
      return node;
    }
    override setProp(node: MemoryNode, name: string, value: unknown,
      previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (this.creating && node.tag === "p" && name === "data-probe") {
        throw new Error("nested creation write");
      }
    }
    dispose(node: MemoryNode) { this.disposed.push(node); }
  }
  const host = new TrackingHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(scene());
  const accepted = JSON.stringify(root.snapshot);
  const old = container.children[0].children[1];
  const reveal = root.prepareScopedHostSubtreeReplacements([{ key: "resource-host",
    tree: jsx("section", { key: "resource-host" }, [
      jsx("h2", { key: "title" }, "ready"),
      jsx("p", { key: "detail", "data-probe": "value" }, "value"),
    ]) }]);
  assert(reveal);
  root.beginPublication();
  host.creating = true;
  let failure: unknown;
  try { reveal.commit(); } catch (error) { failure = error; }
  host.creating = false;
  assert(failure instanceof Error && failure.message === "nested creation write");
  assert(host.created.length >= 3);
  assertEquals(JSON.stringify(root.snapshot), accepted);
  assertEquals(host.disposed.filter((node) => node === old).length, 1);
  for (const node of host.created) {
    assertEquals(host.disposed.filter((disposed) => disposed === node).length, 1);
    assertEquals(node.parent, null);
  }
  root.failPublication();
  root.dispose();
  for (const node of host.created) {
    assertEquals(host.disposed.filter((disposed) => disposed === node).length, 1);
  }
});
