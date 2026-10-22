import { copyRuntimeElement, jsx } from "./jsx_binding_runtime.ts";
import {
  createOwnedScalarStorePropDelta,
  MemoryVDOMHost,
  VDOMSnapshotRoot,
  type MemoryNode,
  type MountedScalarStorePlan,
  type PreparedScopedKeyedRetainedProgram,
} from "./vdom_snapshot_runtime.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

const ownerRegion = (owner: number, value: number) => {
  const owned = createOwnedScalarStorePropDelta({
    key: "motion", tag: "group", componentOwner: owner,
    retainedChildren: true, props: [["rotation-y", value]],
  });
  assert(owned, "owned scalar region declined");
  return owned;
};
const region = (value: number) => ownerRegion(7, value);

const prepare = (root: VDOMSnapshotRoot<MemoryNode>, value: number,
  hint?: MountedScalarStorePlan | null) =>
  root.prepareScopedKeyedRetainedAndStoreDeltas([], [], [region(value)], [],
    hint === undefined ? undefined : [hint]);

const accept = (root: VDOMSnapshotRoot<MemoryNode>,
  program: PreparedScopedKeyedRetainedProgram) => {
  assert(program.validate(), "prepared scalar program became stale");
  root.beginPublication();
  program.commit();
  assert(program.validatePostHost(), "applied scalar program lost its footprint");
  root.publishAccepted();
};

Deno.test("mounted scalar successor keeps constants, child and accepted snapshots", () => {
  class ReadingHost extends MemoryVDOMHost {
    during: string[] = [];
    read?: () => string;
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (this.read && name === "rotation-y") this.during.push(this.read());
      super.setProp(node, name, value, previous);
    }
  }
  const host = new ReadingHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  try {
    root.commit(jsx("main", {}, copyRuntimeElement("group", {
      key: "motion", name: "marker", "rotation-y": 0,
      children: jsx("mesh", { key: "child", x: 5 }),
    }, 7)));
    const group = container.children[0].children[0];
    const child = group.children[0];
    const first = prepare(root, 1);
    assert(first, "first cold candidate declined");
    const plan = first.storeScalarPlans?.[0];
    assert(plan, "cold candidate did not produce an immutable successor");
    accept(root, first);
    first.discard();
    const savedA = JSON.stringify(root.snapshot);
    host.read = () => JSON.stringify(root.snapshot);
    const second = prepare(root, 2, plan);
    assert(second, "warm successor declined");
    const nextPlan = second.storeScalarPlans?.[0];
    assert(nextPlan, "warm candidate did not produce its own successor");
    accept(root, second);
    second.discard();
    assert(host.during.at(-1) === savedA,
      "host callback saw an unaccepted scalar snapshot");
    assert(JSON.stringify(root.snapshot) !== savedA &&
      group.props.name === "marker" && group.props["rotation-y"] === 2 &&
      group.children[0] === child,
    "warm successor lost a constant, output or retained child");
    const coldAgain = prepare(root, 3, plan);
    assert(coldAgain !== null,
      "stale hint should fall back to cold preparation");
    coldAgain.discard();
    const warmAgain = prepare(root, 3, nextPlan);
    assert(warmAgain !== null,
      "accepted successor should prepare the next candidate");
    warmAgain.discard();
  } finally { root.dispose(); }
});

Deno.test("foreign mounted scalar hint declines to cold and released getter severs plans", () => {
  const hostA = new MemoryVDOMHost();
  const hostB = new MemoryVDOMHost();
  const rootA = new VDOMSnapshotRoot(hostA, hostA.createContainer());
  const rootB = new VDOMSnapshotRoot(hostB, hostB.createContainer());
  const tree = () => jsx("main", {}, copyRuntimeElement("group", {
    key: "motion", name: "marker", "rotation-y": 0,
    children: jsx("mesh", { key: "child", x: 1 }),
  }, 7));
  try {
    rootA.commit(tree()); rootB.commit(tree());
    const a = prepare(rootA, 1);
    const foreign = a?.storeScalarPlans?.[0];
    assert(a && foreign, "first root lacked a successor");
    const b = prepare(rootB, 1, foreign);
    assert(b?.storeScalarPlans?.[0], "foreign hint blocked cold preparation");
    a.discard(); b.discard();
    assert(a.storeScalarPlans === undefined && b.storeScalarPlans === undefined,
      "released candidates retained their successor arrays");
  } finally { rootA.dispose(); rootB.dispose(); }
});

Deno.test("prepared warm scalar still rejects a stale mounted target", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  try {
    root.commit(jsx("main", {}, copyRuntimeElement("group", {
      key: "motion", name: "marker", "rotation-y": 0,
      children: jsx("mesh", { key: "child", x: 1 }),
    }, 7)));
    const first = prepare(root, 1);
    const hint = first?.storeScalarPlans?.[0];
    assert(first && hint, "cold successor was unavailable");
    accept(root, first);
    const warm = prepare(root, 2, hint);
    assert(warm, "warm candidate declined");
    root.commit(jsx("main", {}, copyRuntimeElement("group", {
      key: "motion", name: "marker", "rotation-y": 4,
      children: jsx("mesh", { key: "child", x: 1 }),
    }, 7)));
    assert(!warm.validate(), "prepared candidate survived generic reconciliation");
    warm.discard();
    assert(warm.storeScalarPlans === undefined,
      "discarded stale candidate retained its successor");
    const rebound = prepare(root, 5, hint);
    assert(rebound, "generic reconciliation blocked cold successor rebind");
    rebound.discard();
  } finally { root.dispose(); }
});

Deno.test("mounted scalar hint validation rejects forged and proxied recipes", () => {
  const counters = new Map<string, number>();
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container, undefined, (entries) => {
    for (const [name, count] of Object.entries(entries)) {
      counters.set(name, (counters.get(name) ?? 0) + count);
    }
  });
  try {
    root.commit(jsx("main", {}, copyRuntimeElement("group", {
      key: "motion", name: "marker", "rotation-y": 0,
      children: jsx("mesh", { key: "child", x: 1 }),
    }, 7)));
    const first = prepare(root, -0);
    const plan = first?.storeScalarPlans?.[0];
    assert(first && plan, "cold successor was unavailable");
    accept(root, first);
    first.discard();
    const forged = Object.freeze({}) as unknown as MountedScalarStorePlan;
    const proxy = new Proxy(plan, {});
    const recipeClass = plan.constructor as unknown as {
      fields: (...args: unknown[]) => unknown;
      create: (...args: unknown[]) => unknown;
    };
    const originalFields = recipeClass.fields;
    const originalCreate = recipeClass.create;
    let substitutedCalls = 0;
    try {
      recipeClass.fields = () => { substitutedCalls++; return null; };
      recipeClass.create = () => { substitutedCalls++; return null; };
      const second = prepare(root, 0, forged);
      assert(second, "forged hint blocked cold binding");
      second.discard();
      const third = prepare(root, 0, proxy);
      assert(third, "proxied hint blocked cold binding");
      third.discard();
      const warm = prepare(root, 0, plan);
      assert(warm, "genuine hint declined");
      accept(root, warm);
      warm.discard();
    } finally {
      recipeClass.fields = originalFields;
      recipeClass.create = originalCreate;
    }
    assert(substitutedCalls === 0,
      "recipe lookup invoked replaceable static methods");
    assert(counters.get("store.mounted-scalar.cold-rows") === 3 &&
      counters.get("store.mounted-scalar.warm-rows") === 1,
    "genuine and untrusted hint paths were not distinguished");
    assert(Object.is(container.children[0].children[0].props["rotation-y"], 0),
      "signed zero was lost in warm scalar publication");
  } finally { root.dispose(); }
});

Deno.test("mounted scalar plans keep same-key owners and ordered writes distinct", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  try {
    root.commit(jsx("main", {}, [1, 2].map((owner) =>
      jsx("section", { key: `slot-${owner}` },
        copyRuntimeElement("group", { key: "motion", "rotation-y": 0,
          children: jsx("mesh", { key: `child-${owner}`, x: owner }),
        }, owner)))));
    const cold = root.prepareScopedKeyedRetainedAndStoreDeltas([], [], [
      ownerRegion(2, 1), ownerRegion(1, 1),
    ]);
    const plans = cold?.storeScalarPlans;
    assert(cold && plans?.[0] && plans[1], "same-key successors were unavailable");
    accept(root, cold);
    const warm = root.prepareScopedKeyedRetainedAndStoreDeltas([], [], [
      ownerRegion(2, 2), ownerRegion(1, 3),
    ], [], plans);
    assert(warm, "same-key warm candidates declined");
    accept(root, warm);
    const groups = container.children[0].children.map((slot) => slot.children[0]);
    assert(groups[0].props["rotation-y"] === 3 &&
      groups[1].props["rotation-y"] === 2,
    "same-key warm writes crossed owner identity");
    cold.discard(); warm.discard();
  } finally { root.dispose(); }
});

Deno.test("warm scalar second-writer failure keeps the accepted snapshot", () => {
  class FailingHost extends MemoryVDOMHost {
    fail = false;
    writes = 0;
    readonly failure = new Error("warm second writer failed");
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (this.fail && name === "rotation-y" && ++this.writes === 2) {
        throw this.failure;
      }
    }
  }
  const host = new FailingHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  try {
    root.commit(jsx("main", {}, [1, 2].map((owner) =>
      jsx("section", { key: `slot-${owner}` },
        copyRuntimeElement("group", { key: "motion", "rotation-y": 0,
          children: jsx("mesh", { key: `child-${owner}`, x: owner }),
        }, owner)))));
    const cold = root.prepareScopedKeyedRetainedAndStoreDeltas([], [], [
      ownerRegion(1, 1), ownerRegion(2, 1),
    ]);
    const plans = cold?.storeScalarPlans;
    assert(cold && plans?.[0] && plans[1], "cold successors were unavailable");
    accept(root, cold);
    cold.discard();
    const accepted = JSON.stringify(root.snapshot);
    const warm = root.prepareScopedKeyedRetainedAndStoreDeltas([], [], [
      ownerRegion(1, 2), ownerRegion(2, 2),
    ], [], plans);
    assert(warm, "warm failure candidate declined");
    host.fail = true;
    root.beginPublication();
    let caught: unknown;
    try { warm.commit(); } catch (error) { caught = error; }
    assert(caught === host.failure && host.writes === 2,
      "warm failure changed error identity or write order");
    assert(JSON.stringify(root.snapshot) === accepted,
      "partial warm host mutation advanced the accepted snapshot");
    root.failPublication();
    warm.discard();
    assert(warm.storeScalarPlans === undefined,
      "failed warm candidate retained successor references");
  } finally { root.dispose(); }
});
