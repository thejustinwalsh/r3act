import { bindSources, jsx, keyedOwnerChildren, ScalarSource } from "./jsx_binding_runtime.ts";
import {
  MemoryVDOMHost,
  VDOMSnapshotRoot,
  type PreparedScopedKeyedRetainedProgram,
} from "./vdom_snapshot_runtime.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

const bound = (source: ScalarSource) => bindSources([source], () => {
  throw new Error("authored projector must not run");
}, {
  schemaVersion: 2, ownerProgramId: "joint-store", sinkId: "numeric",
  sourceSites: ["numeric"], closedExpression: { kind: "input", index: 0 },
});

const scene = (source: ScalarSource) => jsx("main", { key: "app" }, [
  jsx("output", { key: "numeric", x: bound(source) }),
  jsx("group", { key: "left" }, keyedOwnerChildren("left-rows", [
    jsx("mesh", { key: "mesh", x: 1, role: "body" }),
    jsx("mesh", { key: "outline", x: 1, role: "outline" }),
  ])),
  jsx("group", { key: "right" }, keyedOwnerChildren("right-rows", [
    jsx("mesh", { key: "other", x: 1, role: "other" }),
  ])),
]);

const move = [{ parentKey: "left", regionId: "left-rows", operations: [
  { type: "move" as const, key: "mesh", beforeKey: null },
] }];
const store = (key: string, x: number) => [{ key, tag: "mesh", props: [["x", x]] as const }];
const accept = (
  root: VDOMSnapshotRoot<ReturnType<MemoryVDOMHost["createContainer"]>>,
  program: PreparedScopedKeyedRetainedProgram,
) => {
  assert(program.validate(), "joint program became stale before host publication");
  root.beginPublication();
  program.commit();
  assert(program.validatePostHost(), "joint post-host footprint was lost");
  root.publishAccepted();
};

Deno.test("joint cut moves a Store leaf, writes its prop and numeric sibling in one publication", () => {
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(1, 1);
  root.commit(scene(source), null, true);
  const left = container.children[0].children[1];
  const mesh = left.children[0], outline = left.children[1];
  source.value = 2;
  const program = root.prepareScopedKeyedRetainedAndStoreDeltas(
    move, [[source, 2]], store("mesh", 3),
  );
  assert(program, "three-way cut declined");
  assert(program.structuralVersionDelta === 1 &&
    program.readSources.length === 1 && program.readSources[0] === source,
  "joint metadata lost the structural or numeric footprint");
  const accepted = JSON.stringify(root.snapshot);
  root.beginPublication();
  program.commit();
  assert(JSON.stringify(root.snapshot) === accepted, "unaccepted view leaked");
  assert(program.validatePostHost(), "moved Store target was falsely stale");
  root.publishAccepted();
  assert(left.children[0] === outline && left.children[1] === mesh,
    "move replaced a mounted host");
  assert(mesh.props.x === 3 && mesh.props.role === "body" &&
    container.children[0].children[0].props.x === 2,
  "one of the joint host writes was lost");
  assert(JSON.stringify(root.snapshot).includes('"x":3'), "accepted Store prop was absent");
  root.dispose();
});

Deno.test("joint cut declines a Store leaf removed or replaced by its structural edit", () => {
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(1, 1);
  root.commit(scene(source), null, true);
  source.value = 2;
  for (const operation of [
    { type: "remove" as const, key: "mesh" },
    { type: "replace" as const, key: "mesh",
      tree: jsx("mesh", { key: "mesh", x: 4, role: "replacement" }) },
  ]) {
    assert(root.prepareScopedKeyedRetainedAndStoreDeltas([{
      parentKey: "left", regionId: "left-rows", operations: [operation],
    }], [[source, 2]], store("mesh", 3)) === null,
    "removed or replaced Store writer entered joint cut");
  }
  root.dispose();
});

Deno.test("joint cuts merge disjoint later leaves and revoke overlapping prepared leaves", () => {
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(1, 1);
  root.commit(scene(source), null, true);
  source.value = 2;
  const joint = root.prepareScopedKeyedRetainedAndStoreDeltas(
    move, [[source, 2]], store("mesh", 3),
  );
  const overlap = root.prepareScopedKeyedRetainedAndStoreDeltas([], [], store("mesh", 4));
  const other = root.prepareScopedKeyedRetainedAndStoreDeltas([], [], store("other", 5));
  assert(joint && overlap && other, "disjoint preparation declined");
  accept(root, joint);
  assert(!overlap.validate(), "same mounted leaf did not go stale");
  assert(other.validate(), "unrelated Store leaf was overinvalidated");
  accept(root, other);
  assert(container.children[0].children[2].children[0].props.x === 5,
    "disjoint Store output was lost after keyed publication");
  overlap.discard();
  root.dispose();
});

Deno.test("joint host reentry retains a newer source value for a later cut", () => {
  class ReentrantHost extends MemoryVDOMHost {
    onWrite: (() => void) | null = null;
    override setProp(node: ReturnType<MemoryVDOMHost["createContainer"]>,
      name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "x" && value === 3) this.onWrite?.();
    }
  }
  const host = new ReentrantHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(1, 1);
  root.commit(scene(source), null, true);
  source.value = 2;
  const joint = root.prepareScopedKeyedRetainedAndStoreDeltas(
    move, [[source, 2]], store("mesh", 3),
  );
  assert(joint, "joint reentry setup declined");
  host.onWrite = () => { host.onWrite = null; source.value = 4; };
  accept(root, joint);
  assert(source.value === 4 && container.children[0].children[0].props.x === 2,
    "newer source value was swallowed by accepted host history");
  const later = root.prepareScopedKeyedRetainedAndStoreDeltas([], [[source, 4]], []);
  assert(later, "newer source value could not prepare after joint acceptance");
  accept(root, later);
  assert(container.children[0].children[0].props.x === 4,
    "newer source value failed to reach the host");
  root.dispose();
});

Deno.test("joint partial host throw preserves accepted view and quarantines later cuts", () => {
  class ThrowingHost extends MemoryVDOMHost {
    fail = false;
    override setProp(node: ReturnType<MemoryVDOMHost["createContainer"]>,
      name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (this.fail && name === "x" && value === 3) throw new Error("partial joint write");
    }
  }
  const host = new ThrowingHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(1, 1);
  root.commit(scene(source), null, true);
  source.value = 2;
  const joint = root.prepareScopedKeyedRetainedAndStoreDeltas(
    move, [[source, 2]], store("mesh", 3),
  );
  assert(joint, "throwing joint setup declined");
  const accepted = JSON.stringify(root.snapshot);
  host.fail = true;
  root.beginPublication();
  let threw = false;
  try { joint.commit(); } catch { threw = true; }
  assert(threw && JSON.stringify(root.snapshot) === accepted,
    "partial host throw changed the accepted view");
  root.failPublication();
  assert(root.prepareScopedKeyedRetainedAndStoreDeltas([], [], store("other", 2)) === null,
    "terminal host failure admitted a later cut");
  host.fail = false;
  root.dispose();
});
