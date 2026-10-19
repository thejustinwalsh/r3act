import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { bindSources, jsx, keyedOwnerChildren, ScalarSource } from "./jsx_binding_runtime.ts";
import {
  MemoryVDOMHost,
  VDOMSnapshotRoot,
  type PreparedKeyedVDOMProgram,
  type MemoryNode,
} from "./vdom_snapshot_runtime.ts";
import { isSafeClosedStyleName, snapshotScopedHostProp } from "./scoped_host_values.ts";

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
    { style: { get color() { return "red"; } } },
    { style: { color: Infinity } },
    { position: [1, 2, Infinity] },
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

Deno.test("scoped resource values copy style and tuple data before external mutation", () => {
  class RetainingHost extends MemoryVDOMHost {
    values: unknown[] = [];
    onStyleWrite?: () => void;
    override setProp(node: MemoryNode, name: string, value: unknown,
      previous: unknown) {
      if (name === "style" || name === "position") this.values.push(value);
      if (name === "style") this.onStyleWrite?.();
      super.setProp(node, name, value, previous);
    }
  }
  const host = new RetainingHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const oldStyle = { color: "gray" }, nextStyle = { color: "green", opacity: 0.7 };
  const nextPosition = [4, 5, 6];
  root.commit(jsx("section", { key: "app" }, [
    jsx("div", { key: "style-host", style: oldStyle }, "old"),
    jsx("group", { key: "tuple-host", position: Object.freeze([1, 2, 3]) }),
  ]));
  oldStyle.color = "green";
  const ready = root.prepareScopedHostSubtreeReplacements([
    { key: "style-host", tree: jsx("div", { key: "style-host", style: nextStyle }, "new") },
    { key: "tuple-host", tree: jsx("group", { key: "tuple-host", position: nextPosition }) },
  ]);
  assert(ready);
  oldStyle.color = "black";
  nextStyle.color = "red";
  nextPosition[0] = 99;
  host.onStyleWrite = () => { nextStyle.opacity = 0.1; nextPosition[1] = 99; };
  root.beginPublication();
  ready.commit();
  const during = root.snapshot[0] as { children: Array<{ props: { style: { color: string } } }> };
  assertEquals(during.children[0].props.style.color, "gray");
  assert(ready.validatePostHost());
  root.publishAccepted();
  const current = root.snapshot[0] as { children: Array<{ props: Record<string, unknown> }> };
  assertEquals(current.children[0].props.style, { color: "green", opacity: 0.7 });
  assertEquals(current.children[1].props.position, [4, 5, 6]);
  assert(host.values.every((value) => value !== oldStyle && value !== nextStyle &&
    value !== nextPosition));
  assertEquals(host.values.at(-2), { color: "green", opacity: 0.7 });
  assertEquals(host.values.at(-1), [4, 5, 6]);
  root.dispose();
});

Deno.test("scoped reveal declines mutable generic tuple fallback history", () => {
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const original = [1, 2, 3];
  root.commit(jsx("group", { key: "resource-host", position: original }));
  original[0] = 9;
  assertEquals(root.prepareScopedHostSubtreeReplacements([
    { key: "resource-host", tree: jsx("group", { key: "resource-host",
      position: [4, 5, 6] }) },
  ]), null);
  root.dispose();
});

Deno.test("ordinary style mount and update preserve getter and Proxy trap order", () => {
  const trace: string[] = [];
  const style = (label: string) => new Proxy({ color: label }, {
    ownKeys(target) { trace.push(`${label}:keys`); return Reflect.ownKeys(target); },
    getOwnPropertyDescriptor(target, key) {
      trace.push(`${label}:descriptor:${String(key)}`);
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    get(target, key, receiver) {
      trace.push(`${label}:get:${String(key)}`);
      return Reflect.get(target, key, receiver);
    },
  });
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("div", { key: "resource-host", style: style("old") }));
  const read = (label: string) => [
    `${label}:keys`, `${label}:descriptor:color`, `${label}:get:color`,
  ];
  assertEquals(trace, [...read("old"), ...read("old"), ...read("old"),
    ...read("old")]);
  trace.length = 0;
  root.commit(jsx("div", { key: "resource-host", style: style("next") }));
  assertEquals(trace, [...read("old"), ...read("next"), ...read("next"),
    ...read("next")]);
  root.dispose();
});

Deno.test("keyed parent edits retain authored style reads and accepted values", () => {
  let opacity = 0.2, reads = 0;
  const oldStyle = { get opacity() { reads++; return opacity; } };
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("div", { key: "rows-parent", style: oldStyle },
    keyedOwnerChildren("rows-region", [
      jsx("li", { key: "a" }, "a"), jsx("li", { key: "b" }, "b"),
    ])));
  assert(root.commitKeyedRegionDelta("rows-parent", "rows-region", [
    { type: "move", key: "b", beforeKey: "a" },
  ]));
  const accepted = root.snapshot[0] as { props: { style: { opacity: number } } };
  assertEquals(accepted.props.style.opacity, 0.2);
  reads = 0;
  opacity = 0.7;
  assertEquals(accepted.props.style.opacity, 0.2);
  root.commit(jsx("div", { key: "rows-parent", style: { opacity: 0.7 } },
    keyedOwnerChildren("rows-region", [
      jsx("li", { key: "b" }, "b"), jsx("li", { key: "a" }, "a"),
    ])));
  assertEquals(reads, 1);
  assertEquals((root.snapshot[0] as typeof accepted).props.style.opacity, 0.7);
  root.dispose();
});

Deno.test("ordinary style update diffs against accepted value after source mutation", () => {
  class DiffStyleHost extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown,
      previous: unknown) {
      if (name !== "style") return super.setProp(node, name, value, previous);
      const before = (previous ?? {}) as Record<string, unknown>;
      const after = (value ?? {}) as Record<string, unknown>;
      const actual = (node.props.style ??= {}) as Record<string, unknown>;
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (!Object.is(before[key], after[key])) actual[key] = after[key];
      }
    }
  }
  const trace: string[] = [];
  let opacity = 0.2;
  const authored = { get opacity() { trace.push("old-get"); return opacity; } };
  const host = new DiffStyleHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("div", { key: "resource-host", style: authored }));
  assertEquals((container.children[0].props.style as { opacity: number }).opacity, 0.2);
  trace.length = 0;
  opacity = 0.7;
  root.commit(jsx("div", { key: "resource-host", style: { opacity: 0.7 } }));
  assertEquals(trace, ["old-get"]);
  assertEquals((container.children[0].props.style as { opacity: number }).opacity, 0.7);
  root.dispose();
});

Deno.test("unsupported ordinary style reads its old getter once per update", () => {
  let reads = 0;
  const oldStyle = { get opacity() { reads++; return true; } };
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("div", { key: "resource-host", style: oldStyle }));
  reads = 0;
  root.commit(jsx("div", { key: "resource-host", style: { opacity: 0.7 } }));
  assertEquals(reads, 1);
  root.dispose();
});

Deno.test("scoped resource values decline unsafe structure and stale host writer", () => {
  assert(isSafeClosedStyleName("background-color"));
  assert(isSafeClosedStyleName("--accent-color"));
  for (const key of ["__proto__", "prototype", "constructor", "bad key"]) {
    assertEquals(isSafeClosedStyleName(key), false);
  }
  for (const [tag, name, value] of [
    ["div", "style", { opacity: NaN }],
    ["div", "style", { get color() { return "red"; } }],
    ["mesh", "position", [1, 2]],
    ["mesh", "scale", [1, 2, Infinity]],
    ["div", "position", [1, 2, 3]],
    ["group", "style", { color: "red" }],
  ] as const) assertEquals(snapshotScopedHostProp(tag, name, value).accepted, false);
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("div", { key: "resource-host", style: { color: "gray" } }));
  const ready = root.prepareScopedHostSubtreeReplacements([
    { key: "resource-host", tree: jsx("div", { key: "resource-host",
      style: { color: "green" } }) },
  ]);
  assert(ready);
  const writer = host.setProp;
  host.setProp = () => {};
  assertEquals(ready.validate(), false);
  host.setProp = writer;
  ready.discard();
  root.dispose();
});

Deno.test("scoped style writer failure preserves accepted data and quarantines", () => {
  const failure = new Error("style write failed after host mutation");
  class PartialStyleHost extends MemoryVDOMHost {
    fail = false;
    override setProp(node: MemoryNode, name: string, value: unknown,
      previous: unknown) {
      super.setProp(node, name, value, previous);
      if (this.fail && name === "style") throw failure;
    }
  }
  const host = new PartialStyleHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("div", { key: "resource-host", style: { color: "gray" } }));
  const ready = root.prepareScopedHostSubtreeReplacements([
    { key: "resource-host", tree: jsx("div", { key: "resource-host",
      style: { color: "green" } }) },
  ]);
  assert(ready);
  root.beginPublication();
  host.fail = true;
  let caught: unknown;
  try { ready.commit(); } catch (error) { caught = error; }
  assertStrictEquals(caught, failure);
  assertEquals((root.snapshot[0] as { props: { style: { color: string } } })
    .props.style.color, "gray");
  root.failPublication();
  assertEquals(root.prepareScopedHostSubtreeReplacements([
    { key: "resource-host", tree: jsx("div", { key: "resource-host" }) },
  ]), null);
  host.fail = false;
  root.dispose();
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
    placedNested = false;
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
    override place(parent: MemoryNode, node: MemoryNode, before: MemoryNode | null) {
      super.place(parent, node, before);
      if (this.creating && (parent.tag === "section" || parent.tag === "h2")) {
        this.placedNested = true;
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
      jsx("p", { key: "detail", "data-probe": "value" }, "value"),
      jsx("h2", { key: "title" }, "ready"),
    ]) }]);
  assert(reveal);
  root.beginPublication();
  host.creating = true;
  let failure: unknown;
  try { reveal.commit(); } catch (error) { failure = error; }
  host.creating = false;
  assert(failure instanceof Error && failure.message === "nested creation write");
  assert(host.created.length >= 4 && host.placedNested);
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
