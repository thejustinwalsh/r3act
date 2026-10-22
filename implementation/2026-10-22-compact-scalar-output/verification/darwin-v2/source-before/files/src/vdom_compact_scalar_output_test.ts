import { OwnedScalarFrame, OwnedScalarLayout } from "./closed_scalar_output.ts";
import { copyRuntimeElement, jsx } from "./jsx_binding_runtime.ts";
import {
  MemoryVDOMHost, VDOMSnapshotRoot,
  type MemoryNode, type MountedScalarStorePlan,
  type OwnedScalarStoreRegion, type PreparedScopedKeyedRetainedProgram,
} from "./vdom_snapshot_runtime.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

const layout = OwnedScalarLayout.create(["name", "rotation-y"],
  ["marker", undefined]);
const region = (owner: number, value: number): OwnedScalarStoreRegion =>
  Object.freeze({ key: "motion", tag: "group", componentOwner: owner,
    retainedChildren: true as const,
    frame: OwnedScalarFrame.create(layout, ["marker", value]) });
const tree = (owners: number[]) => jsx("main", {}, owners.map((owner) =>
  jsx("section", { key: `slot-${owner}` },
    copyRuntimeElement("group", {
      key: "motion", name: "marker", "rotation-y": 0,
      children: jsx("mesh", { key: `child-${owner}`, x: owner }),
    }, owner))));
const prepare = (root: VDOMSnapshotRoot<MemoryNode>, owners: number[],
  value: number, plans?: readonly (MountedScalarStorePlan | null)[]) =>
  root.prepareScopedKeyedRetainedAndStoreDeltas([], [],
    owners.map((owner) => region(owner, value + owner)), [], plans);
const accept = (root: VDOMSnapshotRoot<MemoryNode>,
  program: PreparedScopedKeyedRetainedProgram) => {
    assert(program.validate(), "compact candidate became stale");
    root.beginPublication();
    program.commit();
    assert(program.validatePostHost(), "compact candidate lost mounted currentness");
    root.publishAccepted();
    program.discard();
};

for (const count of [1, 32, 256, 1024]) {
  Deno.test(`compact scalar ${count} repeated-key owners retain linear selection`, () => {
    const counters = new Map<string, number>();
    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    const root = new VDOMSnapshotRoot(host, container, undefined, (entries) => {
      for (const [name, value] of Object.entries(entries)) {
        counters.set(name, (counters.get(name) ?? 0) + value);
      }
    });
    try {
      const owners = Array.from({ length: count }, (_, index) => index + 1);
      root.commit(tree(owners));
      const groups = container.children[0].children.map((slot) => slot.children[0]);
      const children = groups.map((group) => group.children[0]);
      let plans: readonly (MountedScalarStorePlan | null)[] | undefined;
      for (let step = 1; step <= 3; step++) {
        const before = new Map(counters);
        const candidate = prepare(root, owners, step * 10000, plans);
        assert(candidate !== null && candidate.storeScalarPlans?.every(Boolean) === true,
          `compact step ${step} declined or lost successors`);
        plans = candidate.storeScalarPlans;
        for (const [name, expected] of [
          ["store.scalar-target.bucket-builds", 1],
          ["store.scalar-target.member-visits", count],
          ["store.scalar-target.owner-index-visits", count],
          ["store.scalar-target.owner-lookups", count],
          [step === 1 ? "store.mounted-scalar.cold-rows" :
            "store.mounted-scalar.warm-rows", count],
        ] as const) {
          assert((counters.get(name) ?? 0) - (before.get(name) ?? 0) === expected,
            `${name} did not remain linear at ${count} owners`);
        }
        accept(root, candidate);
        for (let index = 0; index < count; index++) {
          assert(groups[index].props["rotation-y"] === step * 10000 + index + 1 &&
            groups[index].props.name === "marker" &&
            groups[index].children[0] === children[index],
          `compact step ${step} changed owner output or child identity`);
        }
      }
      assert((counters.get("store.scalar-output.prop-materializations") ?? 0) === 0,
        "unobserved compact frames materialized ordinary props");
      const observed = JSON.stringify(root.snapshot);
      assert(observed.includes(`\"rotation-y\":30001`) &&
        (counters.get("store.scalar-output.prop-materializations") ?? 0) === count,
      "snapshot did not materialize current compact props exactly once");
    } finally { root.dispose(); }
  });
}

Deno.test("compact scalar snapshots retain old images through later frames", () => {
  const host = new MemoryVDOMHost();
  const root = new VDOMSnapshotRoot(host, host.createContainer());
  try {
    root.commit(tree([7]));
    const first = prepare(root, [7], 0);
    assert(first?.storeScalarPlans?.[0], "first image declined");
    const firstPlan = first.storeScalarPlans;
    accept(root, first);
    const saved = root.snapshot;
    const savedJSON = JSON.stringify(saved);
    const second = prepare(root, [7], 10, firstPlan);
    assert(second?.storeScalarPlans?.[0], "second image declined");
    const secondPlan = second.storeScalarPlans;
    accept(root, second);
    const third = prepare(root, [7], 20, secondPlan);
    assert(third, "third image declined");
    accept(root, third);
    assert(JSON.stringify(saved) === savedJSON &&
      JSON.stringify(root.snapshot).includes("\"rotation-y\":27"),
    "later frames mutated a saved ordinary snapshot");
    assert(Object.isFrozen((saved as any)[0].children[0].children[0].props),
      "saved scalar props were not frozen");
  } finally { root.dispose(); }
});

Deno.test("ordinary props replacement leaves compact form at the latest accepted value", () => {
  const counters = new Map<string, number>();
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container, undefined, (entries) => {
    for (const [name, value] of Object.entries(entries)) {
      counters.set(name, (counters.get(name) ?? 0) + value);
    }
  });
  try {
    root.commit(tree([7]));
    const group = container.children[0].children[0].children[0];
    const child = group.children[0];
    const first = prepare(root, [7], 0);
    assert(first?.storeScalarPlans?.[0], "first compact frame declined");
    const firstPlan = first.storeScalarPlans;
    accept(root, first);
    const second = prepare(root, [7], 10, firstPlan);
    assert(second, "second compact frame declined");
    accept(root, second);
    const before = counters.get("store.scalar-output.prop-materializations") ?? 0;
    root.commit(jsx("main", {}, jsx("section", { key: "slot-7" },
      copyRuntimeElement("group", {
        key: "motion", name: "marker", "rotation-y": 18,
        children: jsx("mesh", { key: "child-7", x: 7 }),
      }, 7))));
    assert(group.props["rotation-y"] === 18 && group.children[0] === child &&
      JSON.stringify(root.snapshot).includes("\"rotation-y\":18") &&
      (counters.get("store.scalar-output.prop-materializations") ?? 0) > before,
    "ordinary reconciliation did not read and replace current compact output");
  } finally { root.dispose(); }
});

Deno.test("compact scalar host callbacks and partial failure read old accepted image", () => {
  class ReadingHost extends MemoryVDOMHost {
    read?: () => string;
    observations: string[] = [];
    writes = 0;
    failSecond = false;
    readonly failure = new Error("second compact writer failed");
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (this.read && name === "rotation-y") this.observations.push(this.read());
      super.setProp(node, name, value, previous);
      if (this.failSecond && name === "rotation-y" && ++this.writes === 2) {
        throw this.failure;
      }
    }
  }
  const host = new ReadingHost();
  const root = new VDOMSnapshotRoot(host, host.createContainer());
  try {
    root.commit(tree([1, 2]));
    const cold = prepare(root, [1, 2], 0);
    assert(cold !== null && cold.storeScalarPlans?.every(Boolean) === true,
      "cold images declined");
    const plans = cold.storeScalarPlans;
    accept(root, cold);
    host.read = () => JSON.stringify(root.snapshot);
    host.failSecond = true;
    const warm = prepare(root, [1, 2], 10, plans);
    assert(warm, "warm images declined");
    root.beginPublication();
    let caught: unknown;
    try { warm.commit(); } catch (error) { caught = error; }
    const accepted = host.observations[0];
    assert(caught === host.failure && host.observations.length === 2 &&
      accepted.includes("\"rotation-y\":2") &&
      accepted.includes("\"rotation-y\":3") &&
      !accepted.includes("\"rotation-y\":12") &&
      host.observations.every((snapshot) => snapshot === accepted) &&
      JSON.stringify(root.snapshot) === accepted,
    "callbacks or failed writer observed an applying image");
    root.failPublication();
    warm.discard();
    assert(JSON.stringify(root.snapshot) === accepted,
      "failed compact writer advanced accepted snapshot");
  } finally { root.dispose(); }
});
