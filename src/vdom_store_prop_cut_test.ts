import { jsx } from "./jsx_binding_runtime.ts";
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
