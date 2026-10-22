import { OwnedScalarFrame, OwnedScalarLayout } from "./closed_scalar_output.ts";
import { copyRuntimeElement, jsx } from "./jsx_binding_runtime.ts";
import {
  MemoryVDOMHost, VDOMSnapshotRoot,
  type MemoryNode, type MountedScalarStorePlan,
  type OwnedScalarStoreRegion, type PreparedOwnedScalarStoreProgram,
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
const tree = (owners: readonly number[]) => jsx("main", {}, owners.map((owner) =>
  jsx("section", { key: `slot-${owner}` },
    copyRuntimeElement("group", {
      key: "motion", name: "marker", "rotation-y": 0,
      children: jsx("mesh", { key: `child-${owner}`, x: owner }),
    }, owner))));
const prepare = (root: VDOMSnapshotRoot<MemoryNode>, owners: readonly number[],
  value: number, plans?: readonly (MountedScalarStorePlan | null)[]) =>
  root.prepareOwnedScalarStoreDeltas(owners.map((owner) =>
    region(owner, value + owner)), plans);
const accept = (root: VDOMSnapshotRoot<MemoryNode>,
  program: PreparedOwnedScalarStoreProgram) => {
  assert(program.ownedScalarPhases.preflightPrepared(), "pre-host audit failed");
  root.beginPublication();
  program.commitAdmitted();
  assert(program.ownedScalarPhases.preflightPostHost(), "post-host audit failed");
  assert(program.validatePostHostPrivate(), "final mounted scan failed");
  root.publishAccepted();
};

Deno.test("owned scalar phases retain one admitted and one final full sweep", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  try {
    root.commit(tree([1, 2]));
    const cold = prepare(root, [2, 1], 10);
    assert(cold, "cold candidate declined");
    assert(cold.storeScalarPlans?.every(Boolean), "cold successors unavailable");
    assert(Object.isFrozen(cold.ownedScalarPhases), "phase descriptor is mutable");
    assert(cold.ownedScalarPhases.readCounts().preparedSweeps === 0,
      "internal construction performed a redundant full sweep");
    accept(root, cold);
    const counts = cold.ownedScalarPhases.readCounts();
    assert(counts.preparedSweeps === 1 && counts.postHostSweeps === 1 &&
      Object.isFrozen(counts), "owned route did not perform exactly two full sweeps");
    const plans = cold.storeScalarPlans;
    const saved = root.snapshot;
    const savedText = JSON.stringify(saved);
    cold.discard();
    assert(cold.storeScalarPlans === undefined, "discard retained successors");
    const warm = prepare(root, [2, 1], 20, plans);
    assert(warm, "warm candidate declined");
    assert(warm.storeScalarPlans?.every(Boolean), "warm successors unavailable");
    accept(root, warm);
    assert(container.children[0].children[0].children[0].props["rotation-y"] === 21 &&
      container.children[0].children[1].children[0].props["rotation-y"] === 22 &&
      JSON.stringify(saved) === savedText,
    "ordered owners or saved accepted snapshot changed");
    warm.discard();
  } finally { root.dispose(); }
});

Deno.test("host descriptor traps run in public preflight before private sweeps", () => {
  const host = new MemoryVDOMHost();
  const original = Object.getPrototypeOf(host);
  let descriptorReads = 0;
  Object.setPrototypeOf(host, new Proxy(original, {
    getOwnPropertyDescriptor(target, name) {
      if (name === "setProp") descriptorReads++;
      return Reflect.getOwnPropertyDescriptor(target, name);
    },
  }));
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  try {
    root.commit(tree([1]));
    const candidate = prepare(root, [1], -1);
    assert(candidate, "no-op frame declined");
    descriptorReads = 0;
    assert(candidate.ownedScalarPhases.preflightPrepared() && descriptorReads > 0,
      "pre-host writer descriptor was not audited");
    descriptorReads = 0;
    root.beginPublication();
    candidate.commitAdmitted();
    assert(descriptorReads === 0,
      "admitted private target sweep ran host descriptor traps");
    assert(candidate.ownedScalarPhases.preflightPostHost() && descriptorReads > 0,
      "post-host writer descriptor was not audited");
    descriptorReads = 0;
    assert(candidate.validatePostHostPrivate() && descriptorReads === 0,
      "final private sweep ran host descriptor traps");
    root.publishAccepted();
    candidate.discard();
  } finally { root.dispose(); }
});

Deno.test("owned scalar writer replacement quarantines the partial frame", () => {
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
  const root = new VDOMSnapshotRoot(host, host.createContainer());
  try {
    root.commit(tree([1, 2]));
    const cold = prepare(root, [1, 2], 0);
    assert(cold, "cold frame declined");
    accept(root, cold);
    const plans = cold.storeScalarPlans;
    cold.discard();
    const before = JSON.stringify(root.snapshot);
    const warm = prepare(root, [1, 2], 10, plans);
    assert(warm, "warm candidate declined");
    assert(warm.ownedScalarPhases.preflightPrepared(), "warm preflight failed");
    host.replace = true;
    root.beginPublication();
    let error: unknown;
    try { warm.commitAdmitted(); } catch (caught) { error = caught; }
    assert(error instanceof Error &&
      error.message === "Prepared Store prop delta changed during host application" &&
      host.writes === 1 && JSON.stringify(root.snapshot) === before,
    "second write ran or the partial frame advanced the accepted snapshot");
    root.failPublication();
    warm.discard();
    assert(warm.storeScalarPlans === undefined, "failed frame retained successors");
  } finally { root.dispose(); }
});

Deno.test("peer churn cannot turn a phase preflight into admission", () => {
  const host = new MemoryVDOMHost();
  const root = new VDOMSnapshotRoot(host, host.createContainer());
  try {
    root.commit(tree([1, 2]));
    const candidate = prepare(root, [1], 10);
    assert(candidate, "candidate declined");
    root.commit(tree([1, 3]));
    assert(!candidate.validate(), "public validation missed peer replacement");
    root.beginPublication();
    let stale = false;
    try { candidate.commitAdmitted(); }
    catch (error) {
      stale = error instanceof Error &&
        error.message === "Prepared scoped VDOM transaction is stale";
    }
    assert(stale && candidate.ownedScalarPhases.readCounts().preparedSweeps >= 2,
      "admitted full sweep accepted a stale same-key bucket");
    root.cancelPublication();
    candidate.discard();
    const rebound = prepare(root, [1], 20);
    assert(rebound, "current peer set could not bind a fresh target");
    rebound.discard();
  } finally { root.dispose(); }
});

Deno.test("second writer error retains the accepted image and child identity", () => {
  class FailingHost extends MemoryVDOMHost {
    fail = false;
    writes = 0;
    readonly failure = new Error("second writer failed");
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
    root.commit(tree([1, 2]));
    const cold = prepare(root, [1, 2], 0);
    assert(cold, "cold frame declined");
    accept(root, cold);
    const plans = cold.storeScalarPlans;
    cold.discard();
    const accepted = root.snapshot;
    const acceptedText = JSON.stringify(accepted);
    const children = container.children[0].children.map((parent) =>
      parent.children[0].children[0]);
    const warm = prepare(root, [1, 2], 10, plans);
    assert(warm, "warm candidate declined");
    assert(warm.ownedScalarPhases.preflightPrepared(), "warm preflight failed");
    host.fail = true;
    root.beginPublication();
    let caught: unknown;
    try { warm.commitAdmitted(); } catch (error) { caught = error; }
    assert(caught === host.failure && host.writes === 2 &&
      JSON.stringify(root.snapshot) === acceptedText &&
      JSON.stringify(accepted) === acceptedText &&
      container.children[0].children.every((parent, index) =>
        parent.children[0].children[0] === children[index]),
    "failure changed error identity, accepted image or retained children");
    root.failPublication();
    warm.discard();
  } finally { root.dispose(); }
});

Deno.test("owned scalar frames leave resource disposal with the mounted tree", () => {
  class DisposingHost extends MemoryVDOMHost {
    disposed: MemoryNode[] = [];
    dispose(node: MemoryNode) { this.disposed.push(node); }
  }
  const host = new DisposingHost();
  const root = new VDOMSnapshotRoot(host, host.createContainer());
  root.commit(tree([1]));
  for (const value of [0, 10, 20]) {
    const candidate = prepare(root, [1], value);
    assert(candidate, "resource frame declined");
    accept(root, candidate);
    candidate.discard();
    assert(host.disposed.length === 0,
      "scalar publication disposed a retained host node");
  }
  root.dispose();
  assert(host.disposed.length === 4 &&
    new Set(host.disposed).size === 4,
  "mounted host resources were not disposed exactly once");
});
