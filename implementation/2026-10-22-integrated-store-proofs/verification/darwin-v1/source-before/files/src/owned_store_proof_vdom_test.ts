import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { OwnedScalarFrame, OwnedScalarLayout } from "./closed_scalar_output.ts";
import { copyRuntimeElement, jsx } from "./jsx_binding_runtime.ts";
import {
  MemoryVDOMHost, VDOMSnapshotRoot,
  type MemoryNode, type OwnedScalarStoreRegion,
} from "./vdom_snapshot_runtime.ts";

const layout = OwnedScalarLayout.create(["rotation-y"], [undefined]);
const tree = (owners: readonly number[]) => jsx("main", {}, owners.map((owner) =>
  jsx("section", { key: `slot-${owner}` }, copyRuntimeElement("group", {
    key: "motion", "rotation-y": 0,
    children: jsx("mesh", { key: `child-${owner}` }),
  }, owner))));
const regions = (owners: readonly number[], value: number): OwnedScalarStoreRegion[] =>
  owners.map((owner) => Object.freeze({
    key: "motion", tag: "group", componentOwner: owner,
    retainedChildren: true as const,
    frame: OwnedScalarFrame.create(layout, [value + owner]),
  }));

Deno.test("owned VDOM receipt rejects removal and same-key reinsertion", () => {
  const host = new MemoryVDOMHost();
  const root = new VDOMSnapshotRoot(host, host.createContainer());
  try {
    root.commit(tree([1, 2]));
    const prepared = root.prepareOwnedScalarStoreDeltas(regions([1, 2], 10));
    assert(prepared);
    root.commit(tree([1]));
    root.commit(tree([1, 2]));
    assertEquals(prepared.validate(), false);
    root.beginPublication();
    let stale = false;
    try { prepared.commitAdmitted(); }
    catch (error) { stale = error instanceof Error && /stale/.test(error.message); }
    assert(stale);
    root.cancelPublication();
    prepared.discard();
    const fresh = root.prepareOwnedScalarStoreDeltas(regions([1, 2], 20));
    assert(fresh);
    fresh.discard();
  } finally { root.dispose(); }
});

Deno.test("host reflection revocation is observed before a private target sweep", () => {
  const host = new MemoryVDOMHost();
  const original = Object.getPrototypeOf(host);
  let armed = false;
  let callbacks = 0;
  Object.setPrototypeOf(host, new Proxy(original, {
    getOwnPropertyDescriptor(target, name) {
      if (name === "setProp") {
        callbacks++;
        if (armed) {
          armed = false;
          host.setProp = () => { throw new Error("revoked writer entered"); };
        }
      }
      return Reflect.getOwnPropertyDescriptor(target, name);
    },
  }));
  const root = new VDOMSnapshotRoot(host, host.createContainer());
  try {
    root.commit(tree([1]));
    const prepared = root.prepareOwnedScalarStoreDeltas(regions([1], 10));
    assert(prepared);
    assert(prepared.ownedScalarPhases.preflightPrepared());
    armed = true;
    prepared.ownedScalarPhases.preflightPrepared();
    assert(callbacks > 0);
    assertEquals(prepared.validate(), false);
    prepared.discard();
  } finally { root.dispose(); }
});

Deno.test("second writer failure keeps old snapshots and retained handles", () => {
  class FailingHost extends MemoryVDOMHost {
    writes = 0;
    fail = false;
    readonly failure = new Error("second write");
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
    const old = root.snapshot;
    const oldText = JSON.stringify(old);
    const children = container.children[0].children.map((slot) => slot.children[0].children[0]);
    const prepared = root.prepareOwnedScalarStoreDeltas(regions([1, 2], 10));
    assert(prepared);
    assert(prepared.ownedScalarPhases.preflightPrepared());
    host.fail = true;
    root.beginPublication();
    let failure: unknown;
    try { prepared.commitAdmitted(); } catch (error) { failure = error; }
    assertStrictEquals(failure, host.failure);
    assertEquals(host.writes, 2);
    assertEquals(JSON.stringify(root.snapshot), oldText);
    assertEquals(JSON.stringify(old), oldText);
    children.forEach((child, index) =>
      assertStrictEquals(container.children[0].children[index].children[0].children[0], child));
    root.failPublication();
    prepared.discard();
    assertEquals(prepared.storeScalarPlans, undefined);
  } finally { root.dispose(); }
});
