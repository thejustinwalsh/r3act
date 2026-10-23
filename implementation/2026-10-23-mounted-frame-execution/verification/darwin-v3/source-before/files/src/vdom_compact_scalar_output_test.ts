import { OwnedScalarFrame, OwnedScalarLayout } from "./closed_scalar_output.ts";
import { createAsyncStore, StoreRenderTransaction } from "./async_store_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";
import {
  bindOwnedClosedStoreOutputRequest,
  normalizeClosedStoreDataExecution, prepareMountedClosedStoreExecution,
  prepareOwnedClosedStoreOutputs,
} from "./closed_store_execution.ts";
import { normalizeClosedStoreHostProgram } from "./closed_store_host_program.ts";
import { storeRecord } from "./owned_store_record.ts";
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
    kind: "frame" as const,
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
        const previousPlans = plans;
        const candidate = prepare(root, owners, step * 10000, plans);
        const nextPlans = candidate?.storeScalarPlans;
        assert(candidate !== null && nextPlans?.every(Boolean) === true,
          `compact step ${step} declined or lost successors`);
        if (previousPlans) {
          assert(nextPlans.every((plan, index) =>
            plan === previousPlans[index]),
          `compact step ${step} rebuilt mounted target geometry`);
        }
        plans = nextPlans;
        for (const [name, expected] of [
          ["store.scalar-target.bucket-builds", step === 1 ? 1 : 0],
          ["store.scalar-target.member-visits", step === 1 ? count : 0],
          ["store.scalar-target.owner-index-visits", step === 1 ? count : 0],
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
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  try {
    root.commit(tree([1, 2]));
    const cold = prepare(root, [1, 2], 0);
    assert(cold !== null && cold.storeScalarPlans?.every(Boolean) === true,
      "cold images declined");
    const plans = cold.storeScalarPlans;
    accept(root, cold);
    const groups = container.children[0].children.map((slot) => slot.children[0]);
    assert(groups[0].props["rotation-y"] === 1 &&
      groups[1].props["rotation-y"] === 2,
    "cold publication did not accept the owner-offset values");
    const acceptedBeforeWarm = JSON.stringify(root.snapshot);
    const acceptedValues = [...acceptedBeforeWarm.matchAll(/"rotation-y":(-?\d+(?:\.\d+)?)/g)]
      .map((match) => Number(match[1]));
    assert(acceptedValues.length === 2 && acceptedValues[0] === 1 &&
      acceptedValues[1] === 2,
    "cold accepted snapshot did not retain the owner-offset values");
    host.read = () => JSON.stringify(root.snapshot);
    host.failSecond = true;
    const warm = prepare(root, [1, 2], 10, plans);
    assert(warm, "warm images declined");
    root.beginPublication();
    let caught: unknown;
    try { warm.commit(); } catch (error) { caught = error; }
    assert(caught === host.failure && host.observations.length === 2 &&
      host.observations.every((snapshot) => snapshot === acceptedBeforeWarm) &&
      JSON.stringify(root.snapshot) === acceptedBeforeWarm,
    "callbacks or failed writer observed an applying image");
    root.failPublication();
    warm.discard();
    assert(JSON.stringify(root.snapshot) === acceptedBeforeWarm,
      "failed compact writer advanced accepted snapshot");
  } finally { root.dispose(); }
});

Deno.test("mounted page cut preserves accepted VDOM snapshots and owner offsets", () => {
  const hostProgram = normalizeClosedStoreHostProgram({
    schemaVersion: 7, componentProgramId: "vdom-page", moduleRevision: "rev",
    inputs: [{ storeUseSiteId: "frame", storeProp: "clock",
      paths: [["phase"], ["epoch"]] }],
    stateSites: ["offset"], effectSites: [], retainedChildProp: "children",
    host: { tag: "group", key: "motion", child: null, props: [
      ["rotation-y", { kind: "binary", operator: "+",
        left: { kind: "binary", operator: "*",
          left: { kind: "input", index: 0 }, right: { kind: "literal", value: 2 } },
        right: { kind: "input", index: 2 } }],
      ["position-x", { kind: "input", index: 1 }],
    ] },
  });
  assert(hostProgram, "verified page host program declined");
  const execution = normalizeClosedStoreDataExecution({
    schemaVersion: 3, kind: "owned-data", componentProgramId: "vdom-page",
    moduleRevision: "rev",
    batchKernel: function(s: readonly number[], v: readonly number[],
      o: number[][], n: number) {
      const doubled = s[0] * 2;
      for (let r = 0; r < n; r++) {
        o[r][0] = doubled + v[r];
        o[r][1] = s[1];
      }
    },
  }, hostProgram);
  assert(execution, "verified page execution declined");
  const world = new OwnerStateWorld();
  const owners = [world.resolveOwner(null, "a"), world.resolveOwner(null, "b")];
  const setOffsets = owners.map((owner, index) =>
    world.useState(owner, "offset", index + 1)[1]);
  const store = createAsyncStore(storeRecord({ phase: 2, epoch: -0 }));
  const requests = owners.map((owner) => {
    const bound = bindOwnedClosedStoreOutputRequest({ execution, owner,
      hostKey: "motion", inputs: [{ store, readerId: `reader-${owner}` }] });
    assert(bound, "page row binding declined");
    return bound;
  });
  const mounted = prepareMountedClosedStoreExecution(requests);
  assert(mounted, "page mounted plan declined");
  const capture = () => {
    const transaction = new StoreRenderTransaction("vdom-page");
    const result = prepareOwnedClosedStoreOutputs(world, transaction, mounted);
    transaction.discard();
    assert(result?.kind === "ready" && result.cut.rowCount === owners.length &&
      result.cut.imageAt(0).kind === "page" &&
      result.cut.imageAt(1).kind === "page",
    "verified execution did not capture page images");
    const first = result.cut.imageAt(0);
    const second = result.cut.imageAt(1);
    assert(first.kind === "page" && second.kind === "page" &&
      first.page === second.page && first.rowIndex === 0 && second.rowIndex === 1,
    "mounted page lost shared page identity or owner order");
    return result.cut;
  };
  class ReadingHost extends MemoryVDOMHost {
    read?: () => string;
    observed: string[] = [];
    failSecond = false;
    writes = 0;
    readonly failure = new Error("second page writer failed");
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (this.read && name === "rotation-y") this.observed.push(this.read());
      super.setProp(node, name, value, previous);
      if (this.failSecond && name === "rotation-y" && ++this.writes === 2) {
        throw this.failure;
      }
    }
  }
  const host = new ReadingHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  try {
    root.commit(jsx("main", {}, owners.map((owner) =>
      jsx("section", { key: `slot-${owner}` }, copyRuntimeElement("group", {
        key: "motion", "rotation-y": 0, "position-x": 0,
        children: jsx("mesh", { key: `child-${owner}`, x: owner }),
      }, owner)))));
    const first = root.prepareOwnedScalarStoreDeltas(capture());
    if (!first || !first.mountedBindingAt(0) || !first.mountedBindingAt(1)) {
      throw new Error("page target preparation declined");
    }
    const firstPlans = [first.mountedBindingAt(0), first.mountedBindingAt(1)];
    accept(root, first);
    const saved = root.snapshot;
    const savedJSON = JSON.stringify(saved);
    host.read = () => JSON.stringify(root.snapshot);
    setOffsets[0](9);
    store.dispatch(storeRecord({ phase: 7, epoch: 8 }));
    const second = root.prepareOwnedScalarStoreDeltas(capture(), firstPlans);
    if (!second || second.mountedBindingAt(0) !== firstPlans[0] ||
      second.mountedBindingAt(1) !== firstPlans[1]) {
      throw new Error("warm page target declined");
    }
    const secondPlans = [second.mountedBindingAt(0), second.mountedBindingAt(1)];
    accept(root, second);
    assert(host.observed.length === 2 &&
      host.observed.every((value) => value === savedJSON),
    "host callback observed an applying page");
    assert(JSON.stringify(saved) === savedJSON,
      "later page publication mutated a saved snapshot");
    const groups = container.children[0].children.map((slot) => slot.children[0]);
    assert(groups[0].props["rotation-y"] === 23 &&
      groups[1].props["rotation-y"] === 16 &&
      groups[0].props["position-x"] === 8 &&
      groups[1].props["position-x"] === 8,
    "page row offsets crossed owners or lost a constant");
    const accepted = JSON.stringify(root.snapshot);
    setOffsets[0](10);
    setOffsets[1](11);
    const third = root.prepareOwnedScalarStoreDeltas(capture(), secondPlans);
    assert(third, "third page candidate declined");
    host.writes = 0;
    host.failSecond = true;
    root.beginPublication();
    let failure: unknown;
    try { third.commit(); } catch (error) { failure = error; }
    root.failPublication();
    third.discard();
    assert(failure === host.failure && JSON.stringify(root.snapshot) === accepted &&
      host.observed.slice(-2).every((value) => value === accepted),
    "partial page failure advanced accepted history");
  } finally { root.dispose(); }
});
