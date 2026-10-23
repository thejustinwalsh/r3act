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

const scalarTargetCounters = [
  "store.scalar-target.bucket-builds",
  "store.scalar-target.member-visits",
  "store.scalar-target.owner-index-visits",
  "store.scalar-target.owner-lookups",
] as const;

for (const count of [1, 32, 256, 1024]) {
  Deno.test(`mounted scalar target selection visits ${count} same-key owners once`, () => {
    const counters = new Map<string, number>();
    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    const root = new VDOMSnapshotRoot(host, container, undefined, (entries) => {
      for (const [name, value] of Object.entries(entries)) {
        counters.set(name, (counters.get(name) ?? 0) + value);
      }
    });
    try {
      root.commit(jsx("main", {}, Array.from({ length: count }, (_, index) =>
        jsx("section", { key: `slot-${index}` },
          copyRuntimeElement("group", {
            key: "motion", name: `owner-${index}`, "rotation-y": 0,
            children: jsx("mesh", { key: `child-${index}`, x: index }),
          }, index + 1)))));
      const groups = container.children[0].children.map((slot) => slot.children[0]);
      const children = groups.map((group) => group.children[0]);
      const owners = Array.from({ length: count }, (_, index) => count - index);
      let plans: readonly (MountedScalarStorePlan | null)[] | undefined;
      for (let frame = 1; frame <= 3; frame++) {
        const before = new Map(counters);
        const candidate = root.prepareScopedKeyedRetainedAndStoreDeltas(
          [], [], owners.map((owner) => ownerRegion(owner, frame * 10000 + owner)),
          [], plans);
        assert(candidate !== null, `frame ${frame} candidate declined`);
        assert(candidate.storeScalarPlans?.every(Boolean),
          `frame ${frame} did not prepare every owner`);
        for (const [name, expected] of [
          [scalarTargetCounters[0], 1],
          [scalarTargetCounters[1], count],
          [scalarTargetCounters[2], count],
          [scalarTargetCounters[3], count],
          [frame === 1 ? "store.mounted-scalar.cold-rows" :
            "store.mounted-scalar.warm-rows", count],
        ] as const) {
          assert((counters.get(name) ?? 0) - (before.get(name) ?? 0) === expected,
            `${name} did not count one candidate-local pass at frame ${frame}`);
        }
        plans = candidate.storeScalarPlans;
        accept(root, candidate);
        candidate.discard();
        for (let index = 0; index < count; index++) {
          assert(groups[index].props["rotation-y"] === frame * 10000 + index + 1 &&
            groups[index].props.name === `owner-${index}` &&
            groups[index].children[0] === children[index],
          `frame ${frame} changed owner ${index} identity or output`);
        }
      }
    } finally { root.dispose(); }
  });
}

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

Deno.test("scalar target snapshots distinct selected keys once", () => {
  const counters = new Map<string, number>();
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container, undefined, (entries) => {
    for (const [name, value] of Object.entries(entries)) {
      counters.set(name, (counters.get(name) ?? 0) + value);
    }
  });
  const keyedRegion = (key: string, owner: number | undefined, value: number) => {
    const delta = createOwnedScalarStorePropDelta({
      key, tag: "group", ...(owner === undefined ? {} : {
        componentOwner: owner, retainedChildren: true,
      }), props: [["rotation-y", value]],
    });
    assert(delta, "keyed scalar region declined");
    return delta;
  };
  try {
    root.commit(jsx("main", {}, [
      ...[1, 2, 3].map((owner) => jsx("section", { key: `a-${owner}` },
        copyRuntimeElement("group", { key: "a", "rotation-y": 0 }, owner))),
      ...[4, 5].map((owner) => jsx("section", { key: `b-${owner}` },
        copyRuntimeElement("group", { key: "b", "rotation-y": 0 }, owner))),
      jsx("section", { key: "marker-parent" },
        jsx("group", { key: "marker", "rotation-y": 0 })),
    ]));
    const selected = [keyedRegion("a", 2, 1), keyedRegion("b", 4, 2),
      keyedRegion("a", 1, 3), keyedRegion("marker", undefined, 4)];
    const candidate = root.prepareScopedKeyedRetainedAndStoreDeltas([], [], selected);
    assert(candidate, "mixed selected-key candidate declined");
    assert(counters.get(scalarTargetCounters[0]) === 3 &&
      counters.get(scalarTargetCounters[1]) === 6 &&
      counters.get(scalarTargetCounters[2]) === 5 &&
      counters.get(scalarTargetCounters[3]) === 3,
    "selected-key work repeated a bucket or counted the untargeted peer as a target");
    accept(root, candidate);
    const groups = container.children[0].children.map((parent) => parent.children[0]);
    assert(groups[0].props["rotation-y"] === 3 &&
      groups[1].props["rotation-y"] === 1 &&
      groups[2].props["rotation-y"] === 0 &&
      groups[3].props["rotation-y"] === 2 &&
      groups[4].props["rotation-y"] === 0 &&
      groups[5].props["rotation-y"] === 4,
    "selected-key candidate changed an untargeted peer or wrong owner");
    candidate.discard();
  } finally { root.dispose(); }
});

Deno.test("duplicate same-key owner declines cold and hinted selection", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  try {
    const tree = (duplicate: boolean) => jsx("main", {}, [1, 2].map((slot) =>
      jsx("section", { key: `slot-${slot}` },
        copyRuntimeElement("group", { key: "motion", "rotation-y": 0 },
          duplicate ? 1 : slot))));
    root.commit(tree(false));
    const first = root.prepareScopedKeyedRetainedAndStoreDeltas([], [],
      [ownerRegion(1, 1)]);
    const plan = first?.storeScalarPlans?.[0];
    assert(first && plan, "unique owner setup declined");
    accept(root, first);
    first.discard();
    root.commit(tree(true));
    assert(root.prepareScopedKeyedRetainedAndStoreDeltas([], [],
      [ownerRegion(1, 2)]) === null,
    "duplicate cold owner selected a target");
    assert(root.prepareScopedKeyedRetainedAndStoreDeltas([], [],
      [ownerRegion(1, 2)], [], [plan]) === null,
    "stale hint bypassed duplicate-owner ambiguity");
  } finally { root.dispose(); }
});

Deno.test("wrong-owner scalar hint cannot redirect a current target", () => {
  const counters = new Map<string, number>();
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container, undefined, (entries) => {
    for (const [name, value] of Object.entries(entries)) {
      counters.set(name, (counters.get(name) ?? 0) + value);
    }
  });
  try {
    root.commit(jsx("main", {}, [1, 2].map((owner) =>
      jsx("section", { key: `slot-${owner}` },
        copyRuntimeElement("group", { key: "motion", "rotation-y": 0 }, owner)))));
    const first = root.prepareScopedKeyedRetainedAndStoreDeltas([], [],
      [ownerRegion(1, 1), ownerRegion(2, 1)]);
    const plans = first?.storeScalarPlans;
    assert(first && plans?.[0] && plans[1], "owner hints were unavailable");
    accept(root, first);
    first.discard();
    const before = new Map(counters);
    const second = root.prepareScopedKeyedRetainedAndStoreDeltas([], [],
      [ownerRegion(2, 3)], [], [plans[0]]);
    assert(second, "wrong-owner hint blocked cold target selection");
    assert((counters.get("store.mounted-scalar.cold-rows") ?? 0) -
      (before.get("store.mounted-scalar.cold-rows") ?? 0) === 1,
    "wrong-owner hint was trusted for layout");
    accept(root, second);
    assert(container.children[0].children[0].children[0].props["rotation-y"] === 1 &&
      container.children[0].children[1].children[0].props["rotation-y"] === 3,
    "wrong-owner hint redirected the scalar write");
    second.discard();
  } finally { root.dispose(); }
});

Deno.test("same-key peer churn invalidates prepared footprint and rebinds cold", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const tree = (owners: readonly number[]) => jsx("main", {}, owners.map((owner) =>
    jsx("section", { key: `slot-${owner}` },
      copyRuntimeElement("group", { key: "motion", "rotation-y": 0,
        children: jsx("mesh", { key: `child-${owner}`, x: owner }),
      }, owner))));
  try {
    root.commit(tree([1, 2]));
    const first = root.prepareScopedKeyedRetainedAndStoreDeltas([], [],
      [ownerRegion(1, 1)]);
    const plan = first?.storeScalarPlans?.[0];
    assert(first && plan, "peer churn setup lacked a successor");
    accept(root, first);
    first.discard();
    const pending = root.prepareScopedKeyedRetainedAndStoreDeltas([], [],
      [ownerRegion(1, 2)], [], [plan]);
    assert(pending, "current same-key candidate declined");
    root.commit(tree([1, 2, 3]));
    assert(!pending.validate(),
      "same-key membership change retained a prepared candidate");
    pending.discard();
    const rebound = root.prepareScopedKeyedRetainedAndStoreDeltas([], [],
      [ownerRegion(1, 3)], [], [plan]);
    assert(rebound, "same-key peer insertion blocked current target resolution");
    accept(root, rebound);
    assert(container.children[0].children[0].children[0].props["rotation-y"] === 3 &&
      container.children[0].children[1].children[0].props["rotation-y"] === 0 &&
      container.children[0].children[2].children[0].props["rotation-y"] === 0,
    "peer insertion wrote the wrong target");
    rebound.discard();
    root.commit(tree([1, 3]));
    const afterRemoval = root.prepareScopedKeyedRetainedAndStoreDeltas([], [],
      [ownerRegion(1, 4)], [], [plan]);
    assert(afterRemoval, "same-key peer removal blocked current target resolution");
    afterRemoval.discard();
  } finally { root.dispose(); }
});

Deno.test("scalar writer replacement inside first write stops the next target", () => {
  class ReplacingHost extends MemoryVDOMHost {
    writes = 0;
    replace = false;
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (this.replace && name === "rotation-y" && ++this.writes === 1) {
        this.setProp = () => { throw new Error("replacement writer ran"); };
      }
    }
  }
  const host = new ReplacingHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  try {
    root.commit(jsx("main", {}, [1, 2].map((owner) =>
      jsx("section", { key: `slot-${owner}` },
        copyRuntimeElement("group", { key: "motion", "rotation-y": 0 }, owner)))));
    const first = root.prepareScopedKeyedRetainedAndStoreDeltas([], [],
      [ownerRegion(1, 1), ownerRegion(2, 1)]);
    const plans = first?.storeScalarPlans;
    assert(first && plans?.[0] && plans[1], "writer replacement setup declined");
    accept(root, first);
    first.discard();
    const accepted = JSON.stringify(root.snapshot);
    const warm = root.prepareScopedKeyedRetainedAndStoreDeltas([], [],
      [ownerRegion(1, 2), ownerRegion(2, 2)], [], plans);
    assert(warm, "writer replacement warm candidate declined");
    host.replace = true;
    root.beginPublication();
    let caught: unknown;
    try { warm.commit(); } catch (error) { caught = error; }
    assert(caught instanceof Error &&
      caught.message === "Prepared Store prop delta changed during host application" &&
      host.writes === 1,
    "writer replacement did not stop before the second changed target");
    assert(JSON.stringify(root.snapshot) === accepted,
      "writer replacement advanced the accepted snapshot");
    root.failPublication();
    warm.discard();
    assert(warm.storeScalarPlans === undefined,
      "failed writer candidate retained successor plans");
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
