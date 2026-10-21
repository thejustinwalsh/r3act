import { copyRuntimeElement, jsx } from "./jsx_binding_runtime.ts";
import {
  MemoryVDOMHost,
  VDOMSnapshotRoot,
  type PreparedStorePropDelta,
} from "./vdom_snapshot_runtime.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const tree = () => jsx("main", {}, [
  jsx("mesh", { key: "mesh", role: "body", x: 1 }),
  jsx("mesh", { key: "outline", role: "outline", x: 1 }),
]);

const accept = (
  root: VDOMSnapshotRoot<ReturnType<MemoryVDOMHost["createContainer"]>>,
  token: PreparedStorePropDelta,
) => {
  assert(root.isStorePropDeltaCurrent(token), "prepared cut was stale");
  root.beginPublication();
  root.applyStorePropDelta(token);
  assert(root.isStorePropDeltaCurrent(token, { afterHost: true }),
    "applied cut lost its host footprint");
  root.publishAccepted();
};

Deno.test("Store prop cut preserves accepted snapshot until publication and patches only keyed leaves", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(tree());
  const [mesh, outline] = container.children[0].children;
  const cut = root.prepareStorePropDelta([
    { key: "mesh", tag: "mesh", props: [["x", 2]] },
    { key: "outline", tag: "mesh", props: [["x", 2]] },
  ]);
  assert(cut, "closed primitive leaf cut declined");
  const acceptedBefore = JSON.stringify(root.snapshot);
  root.beginPublication();
  root.applyStorePropDelta(cut);
  assert(JSON.stringify(root.snapshot) === acceptedBefore,
    "applying exposed an unaccepted VNode");
  assert(root.isStorePropDeltaCurrent(cut, { afterHost: true }),
    "post-host footprint changed");
  root.publishAccepted();
  assert(container.children[0].children[0] === mesh &&
    container.children[0].children[1] === outline, "host identities changed");
  assert(mesh.props.x === 2 && outline.props.x === 2 &&
    mesh.props.role === "body" && outline.props.role === "outline",
  "primitive host props were not preserved");
  assert(JSON.stringify(root.snapshot).includes('"x":2'),
    "accepted VNode snapshot missed the prop cut");
  root.dispose();
});

Deno.test("Store prop cuts admit unrelated leaves and reject overlapping or replaced writers", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(tree());
  const mesh = root.prepareStorePropDelta([{ key: "mesh", tag: "mesh", props: [["x", 2]] }]);
  const overlap = root.prepareStorePropDelta([{ key: "mesh", tag: "mesh", props: [["x", 3]] }]);
  const outline = root.prepareStorePropDelta([{ key: "outline", tag: "mesh", props: [["x", 2]] }]);
  assert(mesh && overlap && outline, "primitive cuts were not prepared");
  accept(root, mesh);
  assert(!root.isStorePropDeltaCurrent(overlap), "overlapping writer stayed current");
  assert(root.isStorePropDeltaCurrent(outline), "unrelated leaf was overinvalidated");
  accept(root, outline);
  const old = root.prepareStorePropDelta([{ key: "mesh", tag: "mesh", props: [["x", 4]] }]);
  assert(old, "replacement precondition cut declined");
  root.commit(jsx("main", {}, [
    jsx("mesh", { key: "outline", role: "outline", x: 2 }),
  ]));
  root.commit(tree());
  assert(!root.isStorePropDeltaCurrent(old), "remove/reinsert revived an old writer");
  root.dispose();
});

Deno.test("retained-child Store prop cut preserves child identity and declines an intervening child write", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(copyRuntimeElement("group", { key: "motion", "rotation-y": 0,
    children: jsx("mesh", { key: "resource", x: 1 }) }, 1));
  const group = container.children[0];
  const child = group.children[0];
  assert(root.prepareStorePropDelta([{ key: "motion", tag: "group",
    props: [["rotation-y", 1]] }]) === null,
  "ordinary prop-only cut crossed a child");
  assert(root.prepareStorePropDelta([{ key: "motion", tag: "group",
    props: [["rotation-y", 1]], retainedChildren: true, componentOwner: 1,
    children: [] }]) === null,
  "retained-child and fixed-tree descriptions mixed");
  const first = root.prepareStorePropDelta([{ key: "motion", tag: "group",
    props: [["rotation-y", 1]], retainedChildren: true, componentOwner: 1 }]);
  assert(first, "retained-child prop cut declined");
  accept(root, first);
  assert(container.children[0] === group && group.children[0] === child &&
    group.props["rotation-y"] === 1 && child.props.x === 1,
  "retained child changed during wrapper write");
  const stale = root.prepareStorePropDelta([{ key: "motion", tag: "group",
    props: [["rotation-y", 2]], retainedChildren: true, componentOwner: 1 }]);
  const childCut = root.prepareStorePropDelta([{ key: "resource", tag: "mesh",
    props: [["x", 2]] }]);
  assert(stale && childCut, "independent cut setup declined");
  accept(root, childCut);
  assert(!root.isStorePropDeltaCurrent(stale),
    "a descendant publication left an old wrapper cut current");
  assert(child.props.x === 2 && group.children[0] === child,
    "independent child publication lost its host");
  root.dispose();
});

Deno.test("retained-child Store prop cut selects repeated literal keys by existing component owner", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const scene = (owners: readonly number[]) => jsx("main", {}, owners.map((owner) =>
    jsx("section", { key: `slot-${owner}` },
      copyRuntimeElement("group", { key: "motion", "rotation-y": 0,
        children: jsx("mesh", { key: `child-${owner}`, x: owner }) }, owner))));
  root.commit(scene([1, 2]));
  const first = container.children[0].children[0].children[0];
  const second = container.children[0].children[1].children[0];
  assert(root.prepareStorePropDelta([{ key: "motion", tag: "group",
    props: [["rotation-y", 1]] }]) === null,
  "unqualified duplicate host key was admitted");
  const selected = root.prepareStorePropDelta([
    { key: "motion", tag: "group", props: [["rotation-y", 1]],
      retainedChildren: true, componentOwner: 1 },
    { key: "motion", tag: "group", props: [["rotation-y", 2]],
      retainedChildren: true, componentOwner: 2 },
  ]);
  assert(selected, "owner-qualified duplicate host keys declined");
  accept(root, selected);
  assert(first.props["rotation-y"] === 1 && second.props["rotation-y"] === 2,
    "owner-qualified writes crossed");
  const stale = root.prepareStorePropDelta([{ key: "motion", tag: "group",
    props: [["rotation-y", 3]], retainedChildren: true, componentOwner: 1 }]);
  assert(stale, "stale candidate setup declined");
  root.commit(scene([2]));
  root.commit(scene([1, 2]));
  assert(!root.isStorePropDeltaCurrent(stale),
    "removed owner writer revived after reinsert");
  root.dispose();
});

Deno.test("retained-child Store second-writer failure preserves accepted frontier", () => {
  class FailingHost extends MemoryVDOMHost {
    writes = 0;
    fail = false;
    override setProp(node: ReturnType<MemoryVDOMHost["createContainer"]>,
      name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (this.fail && name === "rotation-y" && ++this.writes === 2) {
        throw new Error("second wrapper write failed");
      }
    }
  }
  const host = new FailingHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("main", {}, [1, 2].map((owner) =>
    jsx("section", { key: `slot-${owner}` },
      copyRuntimeElement("group", { key: "motion", "rotation-y": 0,
        children: jsx("mesh", { key: `child-${owner}`, x: owner }) }, owner)))));
  const before = JSON.stringify(root.snapshot);
  const children = container.children[0].children.map((section) =>
    section.children[0].children[0]);
  const cut = root.prepareStorePropDelta([1, 2].map((componentOwner) => ({
    key: "motion", tag: "group", props: [["rotation-y", 1]] as const,
    retainedChildren: true as const, componentOwner,
  })));
  assert(cut, "grouped retained wrapper cut declined");
  host.fail = true;
  root.beginPublication();
  let threw = false;
  try { root.applyStorePropDelta(cut); } catch { threw = true; }
  assert(threw, "second writer failure was masked");
  assert(JSON.stringify(root.snapshot) === before,
    "partial host write advanced accepted snapshot");
  assert(container.children[0].children.every((section, index) =>
    section.children[0].children[0] === children[index]),
  "partial wrapper write detached retained children");
  root.failPublication();
  assert(root.prepareStorePropDelta([{ key: "motion", tag: "group",
    props: [["rotation-y", 2]], retainedChildren: true,
    componentOwner: 1 }]) === null,
  "partial failure admitted replay");
  host.fail = false;
  root.dispose();
});

Deno.test("Store prop cut declines unsafe prop shapes and writer replacement", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(tree());
  assert(root.prepareStorePropDelta([{ key: "mesh", tag: "mesh", props: [["role", "new"]] }]),
    "existing primitive string prop should be eligible");
  assert(root.prepareStorePropDelta([{ key: "mesh", tag: "mesh", props: [["style", "x"]] }]) === null,
    "style prop was accepted");
  assert(root.prepareStorePropDelta([{ key: "mesh", tag: "mesh", props: [["new", 1]] }]) === null,
    "new prop shape was accepted");
  assert(root.prepareStorePropDelta([{ key: "mesh", tag: "mesh", props: [["x", 2], ["x", 3]] }]) === null,
    "duplicate prop was accepted");
  const cut = root.prepareStorePropDelta([{ key: "mesh", tag: "mesh", props: [["x", 2]] }]);
  assert(cut, "writer replacement setup failed");
  host.setProp = () => {};
  assert(!root.isStorePropDeltaCurrent(cut), "replaced host writer stayed current");
  let getterCalls = 0;
  Object.defineProperty(host, "setProp", {
    configurable: true,
    get() { getterCalls++; throw new Error("writer getter must not run"); },
  });
  assert(!root.isStorePropDeltaCurrent(cut) && getterCalls === 0,
    "writer identity check invoked an accessor");
  delete (host as { setProp?: unknown }).setProp;
  root.dispose();
});

Deno.test("Store prop host failure leaves accepted view and rejects further cuts", () => {
  class ThrowingHost extends MemoryVDOMHost {
    fail = false;
    override setProp(node: ReturnType<MemoryVDOMHost["createContainer"]>,
      name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (this.fail && name === "x") throw new Error("host write failed after mutation");
    }
  }
  const host = new ThrowingHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(tree());
  const before = JSON.stringify(root.snapshot);
  const cut = root.prepareStorePropDelta([{ key: "mesh", tag: "mesh", props: [["x", 2]] }]);
  assert(cut, "failing host setup declined");
  host.fail = true;
  root.beginPublication();
  let threw = false;
  try { root.applyStorePropDelta(cut); } catch { threw = true; }
  assert(threw, "host exception was masked");
  assert(JSON.stringify(root.snapshot) === before,
    "unaccepted host failure changed managed accepted view");
  root.failPublication();
  assert(root.prepareStorePropDelta([{ key: "outline", tag: "mesh", props: [["x", 2]] }]) === null,
    "terminal partial host failure admitted another cut");
  host.fail = false;
  root.dispose();
});

Deno.test("Store prop cut copies accepted styles and stabilized Three tuples", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const oldTuple = Object.freeze([1, 2, 3] as const);
  root.commit(jsx("main", {}, [
    jsx("div", { key: "dom", style: { color: "red", opacity: 1 } }),
    jsx("mesh", { key: "three", position: oldTuple }),
  ]));
  const [dom, three] = container.children[0].children;
  const before = JSON.stringify(root.snapshot);
  const nextStyle = { color: "blue", opacity: 0.5 };
  const nextTuple = Object.freeze([4, 5, 6] as const);
  const cut = root.prepareStorePropDelta([
    { key: "dom", tag: "div", props: [["style", nextStyle]] },
    { key: "three", tag: "mesh", props: [["position", nextTuple]] },
  ]);
  assert(cut, "stable structured cut declined");
  nextStyle.color = "green";
  root.beginPublication();
  root.applyStorePropDelta(cut);
  assert(JSON.stringify(root.snapshot) === before,
    "applying exposed unaccepted structured props");
  assert(root.isStorePropDeltaCurrent(cut, { afterHost: true }),
    "structured host footprint changed during application");
  root.publishAccepted();
  assert(container.children[0].children[0] === dom &&
    container.children[0].children[1] === three,
  "structured cut replaced retained handles");
  assert((dom.props.style as { color: string }).color === "blue" &&
    (three.props.position as number[])[0] === 4,
  "host did not receive copied structured values");
  const accepted = JSON.stringify(root.snapshot);
  nextStyle.opacity = 0;
  assert(JSON.stringify(root.snapshot) === accepted,
    "caller mutation aliased accepted style history");
  const again = root.prepareStorePropDelta([
    { key: "dom", tag: "div", props: [["style", { color: "purple" }]] },
    { key: "three", tag: "mesh", props: [["position", Object.freeze([7, 8, 9] as const)]] },
  ]);
  assert(again, "new accepted structured history was not reusable");
  accept(root, again);
  root.dispose();
});

Deno.test("Store prop cut declines mutable old tuples and callback-bearing styles", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("main", {}, [
    jsx("mesh", { key: "mutable", position: [1, 2, 3] }),
    jsx("div", { key: "accessor", style: Object.defineProperty({}, "color", {
      get() { return "red"; }, enumerable: true,
    }) }),
  ]));
  assert(root.prepareStorePropDelta([{ key: "mutable", tag: "mesh",
    props: [["position", Object.freeze([4, 5, 6] as const)]] }]) === null,
  "mutable generic tuple was certified as stable");
  assert(root.prepareStorePropDelta([{ key: "accessor", tag: "div",
    props: [["style", { color: "blue" }]] }]) === null,
  "authored style accessor was certified closed");
  root.dispose();
});

Deno.test("structured Store host failure preserves accepted values and quarantines later cuts", () => {
  class FailingHost extends MemoryVDOMHost {
    fail = false;
    override setProp(node: ReturnType<MemoryVDOMHost["createContainer"]>,
      name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (this.fail && name === "position") throw new Error("structured host failed");
    }
  }
  const host = new FailingHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("main", {}, [
    jsx("div", { key: "dom", style: { opacity: 0.1 } }),
    jsx("mesh", { key: "three", position: Object.freeze([1, 2, 3] as const) }),
  ]));
  const before = JSON.stringify(root.snapshot);
  const cut = root.prepareStorePropDelta([
    { key: "dom", tag: "div", props: [["style", { opacity: 0.2 }]] },
    { key: "three", tag: "mesh", props: [["position", Object.freeze([4, 5, 6] as const)]] },
  ]);
  assert(cut, "structured failure setup declined");
  host.fail = true;
  root.beginPublication();
  let caught: unknown;
  try { root.applyStorePropDelta(cut); } catch (error) { caught = error; }
  assert(caught instanceof Error && caught.message === "structured host failed",
    "original structured writer error was replaced");
  assert(JSON.stringify(root.snapshot) === before,
    "partial structured host work advanced accepted values");
  root.failPublication();
  assert(root.prepareStorePropDelta([{ key: "dom", tag: "div",
    props: [["style", { opacity: 0.3 }]] }]) === null,
  "failed publication admitted a later structured cut");
  host.fail = false;
  root.dispose();
});

Deno.test("structured Store cut rejects replaced writer after preparation", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("main", {}, [
    jsx("div", { key: "styled", style: { opacity: 0.1 } }),
  ]));
  const cut = root.prepareStorePropDelta([{ key: "styled", tag: "div",
    props: [["style", { opacity: 0.2 }]] }]);
  assert(cut, "structured writer setup declined");
  host.setProp = () => {};
  assert(!root.isStorePropDeltaCurrent(cut),
    "replaced structured host writer remained current");
  root.dispose();
});

Deno.test("Store subtree cut retains nested hosts and accepted text history", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("section", {}, jsx("div", { key: "outer" },
    jsx("span", { key: "inner", style: { opacity: 0.1 } }, "1"))));
  const outer = container.children[0].children[0];
  const inner = outer.children[0];
  const textNode = inner.children[0];
  const retained = root.snapshot;
  const before = JSON.stringify(retained);
  const cut = root.prepareStorePropDelta([
    { key: "outer", tag: "div", props: [],
      children: [{ kind: "host", key: "inner", tag: "span" }] },
    { key: "inner", tag: "span", props: [["style", { opacity: 0.2 }]],
      children: [{ kind: "text", text: "2" }] },
  ]);
  assert(cut, "fixed subtree declined");
  root.beginPublication();
  root.applyStorePropDelta(cut);
  assert(JSON.stringify(root.snapshot) === before,
    "subtree host work changed accepted snapshot before publication");
  assert(root.isStorePropDeltaCurrent(cut, { afterHost: true }),
    "accepted subtree footprint changed after host application");
  root.publishAccepted();
  assert(outer.children[0] === inner && inner.children[0] === textNode,
    "subtree handles changed");
  assert(inner.props.style && textNode.text === "2", "subtree values were not applied");
  assert(JSON.stringify(retained) === before, "retained accepted image was mutated");
  root.dispose();
});

Deno.test("Store subtree cut declines changed child order and text writer", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("div", { key: "outer" }, [
    jsx("span", { key: "a" }, "a"), jsx("span", { key: "b" }, "b"),
  ]));
  const regions = [{ key: "outer", tag: "div", props: [], children: [
    { kind: "host" as const, key: "a", tag: "span" },
    { kind: "host" as const, key: "b", tag: "span" },
  ] }, { key: "a", tag: "span", props: [], children: [{ kind: "text" as const, text: "A" }] },
  { key: "b", tag: "span", props: [], children: [{ kind: "text" as const, text: "B" }] }];
  const cut = root.prepareStorePropDelta(regions);
  assert(cut, "ordered child footprint declined");
  host.setText = () => {};
  assert(!root.isStorePropDeltaCurrent(cut), "changed text writer stayed current");
  delete (host as { setText?: unknown }).setText;
  root.commit(jsx("div", { key: "outer" }, [
    jsx("span", { key: "b" }, "b"), jsx("span", { key: "a" }, "a"),
  ]));
  assert(!root.isStorePropDeltaCurrent(cut), "reordered children stayed current");
  root.dispose();
});

Deno.test("Store subtree footprint survives an unrelated accepted sibling cut", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("section", {}, [
    jsx("div", { key: "outer" }, jsx("span", { key: "inner" }, "1")),
    jsx("output", { key: "other", "data-x": 1 }),
  ]));
  const subtree = root.prepareStorePropDelta([
    { key: "outer", tag: "div", props: [],
      children: [{ kind: "host", key: "inner", tag: "span" }] },
    { key: "inner", tag: "span", props: [],
      children: [{ kind: "text", text: "2" }] },
  ]);
  const sibling = root.prepareStorePropDelta([
    { key: "other", tag: "output", props: [["data-x", 2]] },
  ]);
  assert(subtree && sibling, "independent cuts did not prepare");
  accept(root, sibling);
  assert(root.isStorePropDeltaCurrent(subtree),
    "unrelated sibling acceptance invalidated fixed subtree");
  accept(root, subtree);
  assert(container.children[0].children[0].children[0].children[0].text === "2",
    "fixed subtree did not publish after intervening acceptance");
  root.dispose();
});

Deno.test("throwing second subtree text write keeps old accepted image", () => {
  class FailingTextHost extends MemoryVDOMHost {
    writes = 0;
    fail = false;
    readonly error = new Error("second text failed");
    override setText(node: ReturnType<MemoryVDOMHost["createContainer"]>, text: string) {
      super.setText(node, text);
      if (this.fail && ++this.writes === 2) throw this.error;
    }
  }
  const host = new FailingTextHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("div", { key: "outer" }, ["1", "2"]));
  const before = JSON.stringify(root.snapshot);
  const cut = root.prepareStorePropDelta([{ key: "outer", tag: "div", props: [],
    children: [{ kind: "text", text: "3" }, { kind: "text", text: "4" }] }]);
  assert(cut, "text failure setup declined");
  host.fail = true;
  root.beginPublication();
  let error: unknown;
  try { root.applyStorePropDelta(cut); } catch (caught) { error = caught; }
  assert(error === host.error,
    "original second-text error was masked");
  assert(JSON.stringify(root.snapshot) === before, "failed text work advanced accepted data");
  root.failPublication();
  assert(root.prepareStorePropDelta([{ key: "outer", tag: "div", props: [], children: [] }]) === null,
    "partial text failure admitted another cut");
  host.fail = false;
  root.dispose();
});
