import { OwnedScalarFrame, OwnedScalarLayout } from "./closed_scalar_output.ts";
import { copyRuntimeElement, jsx } from "./jsx_binding_runtime.ts";
import {
  MemoryVDOMHost, VDOMSnapshotRoot,
  type MemoryNode, type MountedScalarStorePlan,
  type OwnedScalarStoreRegion,
} from "./vdom_snapshot_runtime.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

const layout = OwnedScalarLayout.create(["rotation-y"], [undefined]);
const tree = (owners: readonly number[]) => jsx("main", {}, owners.map((owner) =>
  jsx("section", { key: `slot-${owner}` }, copyRuntimeElement("group", {
    key: "motion", "rotation-y": 0,
    children: jsx("mesh", { key: `mesh-${owner}`, x: owner }),
  }, owner))));
const regions = (owners: readonly number[], tick: number): OwnedScalarStoreRegion[] =>
  owners.map((owner) => Object.freeze({
    key: "motion", tag: "group", componentOwner: owner,
    retainedChildren: true as const, kind: "frame" as const,
    frame: OwnedScalarFrame.create(layout, [tick + owner]),
  }));
const prepare = (root: VDOMSnapshotRoot<MemoryNode>,
  owners: readonly number[], tick: number,
  plans?: readonly (MountedScalarStorePlan | null)[]) => {
  const candidate = root.prepareScopedKeyedRetainedAndStoreDeltas(
    [], [], regions(owners, tick), [], plans,
  );
  assert(candidate !== null, "mounted scalar candidate declined");
  assert(candidate.validate() && candidate.storeScalarPlans?.every(Boolean),
    "mounted scalar candidate lost validity or retained plans");
  return candidate;
};
const accept = (root: VDOMSnapshotRoot<MemoryNode>,
  candidate: ReturnType<typeof prepare>) => {
  root.beginPublication();
  candidate.commit();
  assert(candidate.validatePostHost(), "scalar candidate lost posthost currentness");
  root.publishAccepted();
  candidate.discard();
};

Deno.test("accepted images revoke old generic candidates without rebuilding geometry", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const owners = [1];
  try {
    root.commit(tree(owners));
    const cold = prepare(root, owners, 10);
    const plans = cold.storeScalarPlans!;
    accept(root, cold);
    const saved = root.snapshot;
    const savedText = JSON.stringify(saved);
    const groups = container.children[0].children.map((section) =>
      section.children[0]);
    const children = groups.map((group) => group.children[0]);
    const stale = root.prepareKeyedRegions([{
      key: "slot-1", tree: jsx("section", { key: "slot-1" },
        copyRuntimeElement("group", {
          key: "motion", "rotation-y": 11,
          children: jsx("mesh", { key: "mesh-1", x: 1 }),
        }, 1)),
    }]);
    assert(stale !== null, "generic candidate did not prepare");
    assert(stale.validate(), "generic candidate did not validate");
    const warm = prepare(root, owners, 20, plans);
    assert(warm.storeScalarPlans?.every((plan, index) => plan === plans[index]),
      "warm frame rebuilt mounted target geometry");
    accept(root, warm);
    assert(!stale.validate(), "older generic candidate survived accepted image change");
    stale.discard?.();
    assert(groups.every((group, index) =>
      group.props["rotation-y"] === 20 + owners[index] &&
      group.children[0] === children[index]),
    "warm frame changed host or child identity");
    assert(JSON.stringify(saved) === savedText &&
      JSON.stringify(root.snapshot).includes('"rotation-y":21'),
    "later accepted image mutated an observed snapshot");
  } finally { root.dispose(); }
});

Deno.test("failed publication restores previous accepted scalar page", () => {
  class ReadingHost extends MemoryVDOMHost {
    observe?: () => string;
    seen: string[] = [];
    override setProp(node: MemoryNode, name: string, value: unknown,
      previous?: unknown) {
      if (name === "rotation-y" && this.observe) this.seen.push(this.observe());
      super.setProp(node, name, value, previous);
    }
  }
  const host = new ReadingHost();
  const root = new VDOMSnapshotRoot(host, host.createContainer());
  const owners = [1, 2];
  try {
    root.commit(tree(owners));
    const cold = prepare(root, owners, 10);
    const plans = cold.storeScalarPlans!;
    accept(root, cold);
    const accepted = JSON.stringify(root.snapshot);
    host.observe = () => JSON.stringify(root.snapshot);
    const warm = prepare(root, owners, 20, plans);
    root.beginPublication();
    warm.commit();
    assert(warm.validatePostHost() && host.seen.length === 2 &&
      host.seen.every((view) => view === accepted),
    "host callbacks observed applying values");
    root.failPublication();
    warm.discard();
    assert(JSON.stringify(root.snapshot) === accepted,
      "later group failure leaked the already written scalar page");
    assert(root.prepareScopedKeyedRetainedAndStoreDeltas(
      [], [], regions(owners, 30), [], plans) === null,
      "quarantined root admitted another scalar candidate");
  } finally { root.dispose(); }
});

Deno.test("nested mounted targets retain child geometry as both pages advance", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const nested = jsx("main", {}, copyRuntimeElement("group", {
    key: "motion", "rotation-y": 0,
    children: copyRuntimeElement("group", {
      key: "motion", "rotation-y": 0,
      children: jsx("mesh", { key: "leaf" }),
    }, 2),
  }, 1));
  try {
    root.commit(nested);
    const owners = [1, 2];
    const cold = prepare(root, owners, 10);
    const plans = cold.storeScalarPlans!;
    accept(root, cold);
    const outer = container.children[0].children[0];
    const inner = outer.children[0];
    const leaf = inner.children[0];
    for (const tick of [20, 30]) {
      const warm = prepare(root, owners, tick, plans);
      assert(warm.storeScalarPlans?.every((plan, index) => plan === plans[index]),
        "nested frame rebuilt retained target geometry");
      accept(root, warm);
      assert(container.children[0].children[0] === outer &&
        outer.children[0] === inner && inner.children[0] === leaf &&
        outer.props["rotation-y"] === tick + 1 &&
        inner.props["rotation-y"] === tick + 2,
      "nested frame changed host geometry or accepted values");
    }
  } finally { root.dispose(); }
});

Deno.test("roots sharing immutable images keep independent accepted histories", () => {
  const host = new MemoryVDOMHost();
  const left = new VDOMSnapshotRoot(host, host.createContainer());
  const right = new VDOMSnapshotRoot(host, host.createContainer());
  try {
    left.commit(tree([1]));
    right.commit(tree([1]));
    const initial = regions([1], 10);
    for (const root of [left, right]) {
      const candidate = root.prepareScopedKeyedRetainedAndStoreDeltas(
        [], [], initial,
      );
      assert(candidate !== null, "shared image candidate declined");
      assert(candidate.validate(), "shared image candidate did not validate");
      accept(root, candidate);
    }
    const leftBefore = JSON.stringify(left.snapshot);
    const rightBefore = JSON.stringify(right.snapshot);
    assert(leftBefore === rightBefore, "forks did not share initial values");
    accept(left, prepare(left, [1], 20));
    assert(JSON.stringify(right.snapshot) === rightBefore &&
      JSON.stringify(left.snapshot) !== leftBefore,
    "one root acceptance advanced another root's image");
    accept(right, prepare(right, [1], 30));
    assert(JSON.stringify(left.snapshot).includes('"rotation-y":21') &&
      JSON.stringify(right.snapshot).includes('"rotation-y":31'),
    "independent accepted histories crossed roots");
  } finally {
    left.dispose();
    right.dispose();
  }
});
