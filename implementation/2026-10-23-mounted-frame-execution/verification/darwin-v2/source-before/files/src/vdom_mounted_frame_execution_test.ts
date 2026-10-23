import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { OwnedClosedFrameCut } from "./closed_store_execution.ts";
import { copyRuntimeElement, jsx } from "./jsx_binding_runtime.ts";
import { mountedFrameFixture } from "./vdom_mounted_frame_fixture.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "./vdom_snapshot_runtime.ts";

const tree = () => jsx("main", {}, [1, 2].map((owner) =>
  jsx("section", { key: `slot-${owner}` }, copyRuntimeElement("group", {
    key: "motion", "rotation-y": 0, "position-x": 0,
    children: jsx("mesh", { key: `child-${owner}` }),
  }, owner))));

Deno.test("mounted frame accepts only the authentic cut and retains private binding geometry", () => {
  const fixture = mountedFrameFixture([2, 1]);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  try {
    root.commit(tree());
    const cut = fixture.capture(10);
    assert(Object.isFrozen(cut.imageAt(0)) &&
      Object.isFrozen(cut.imageAt(1)));
    assert(!OwnedClosedFrameCut.owns(Object.create(OwnedClosedFrameCut.prototype)));
    assertEquals(root.prepareOwnedScalarStoreDeltas(
      Object.create(OwnedClosedFrameCut.prototype)), null);
    assertEquals(root.prepareOwnedScalarStoreDeltas(new Proxy(cut, {})), null);
    const revoked = Proxy.revocable(cut, {});
    revoked.revoke();
    assertEquals(root.prepareOwnedScalarStoreDeltas(revoked.proxy), null);
    const cold = root.prepareOwnedScalarStoreDeltas(cut);
    assert(cold);
    const bindings = [cold.mountedBindingAt(0), cold.mountedBindingAt(1)];
    assert(bindings.every(Boolean));
    const before = root.snapshot;
    const beforeText = JSON.stringify(before);
    assert(cold.validate());
    root.beginPublication();
    cold.commitAdmitted();
    assert(cold.validatePostHostPrivate());
    root.publishAccepted();
    cold.discard();
    assertEquals(cold.mountedBindingAt(0), null);
    const child = container.children[0].children[0].children[0].children[0];
    const warm = root.prepareOwnedScalarStoreDeltas(fixture.capture(20), bindings);
    assert(warm);
    assertStrictEquals(warm.mountedBindingAt(0), bindings[0]);
    assertStrictEquals(warm.mountedBindingAt(1), bindings[1]);
    assert(warm.validate());
    root.beginPublication();
    warm.commitAdmitted();
    assert(warm.validatePostHostPrivate());
    root.publishAccepted();
    warm.discard();
    assertEquals(JSON.stringify(before), beforeText);
    assertStrictEquals(container.children[0].children[0].children[0].children[0], child);
    assertEquals(container.children[0].children[0].children[0].props["rotation-y"], 21);
    assertEquals(container.children[0].children[1].children[0].props["rotation-y"], 22);
  } finally { root.dispose(); }
});

Deno.test("mounted frame composite shares checked Store application and cold binding proposal", () => {
  const fixture = mountedFrameFixture([1]);
  const host = new MemoryVDOMHost();
  const root = new VDOMSnapshotRoot(host, host.createContainer());
  try {
    root.commit(jsx("main", {}, copyRuntimeElement("group", {
      key: "motion", "rotation-y": 0, "position-x": 0,
      children: jsx("mesh", { key: "child" }),
    }, 1)));
    const cut = fixture.capture(5);
    const candidate = root.prepareScopedKeyedRetainedAndStoreDeltas(
      [], [], [], [], undefined, cut);
    assert(candidate);
    assert(candidate.mountedBindingAt(0));
    assert(candidate.validate());
    root.beginPublication();
    candidate.commitAdmitted();
    assert(candidate.validatePostHostPrivate());
    root.publishAccepted();
    assert(JSON.stringify(root.snapshot).includes('"rotation-y":6'));
    candidate.discard();
  } finally { root.dispose(); }
});

Deno.test("mounted frame writer reentry observes the old accepted snapshot", () => {
  const fixture = mountedFrameFixture([1, 2]);
  class ReenteringHost extends MemoryVDOMHost {
    onWrite?: () => void;
    override setProp(node: import("./vdom_snapshot_runtime.ts").MemoryNode,
      name: string, value: unknown, previous?: unknown) {
      if (name === "rotation-y") this.onWrite?.();
      super.setProp(node, name, value, previous);
    }
  }
  const host = new ReenteringHost();
  const root = new VDOMSnapshotRoot(host, host.createContainer());
  try {
    root.commit(tree());
    const old = JSON.stringify(root.snapshot);
    const cut = fixture.capture(9);
    const candidate = root.prepareOwnedScalarStoreDeltas(cut);
    assert(candidate);
    let observations = 0;
    host.onWrite = () => {
      observations++;
      assertEquals(JSON.stringify(root.snapshot), old);
      assertEquals(root.prepareOwnedScalarStoreDeltas(cut), null);
    };
    assert(candidate.validate());
    root.beginPublication();
    candidate.commitAdmitted();
    assert(candidate.validatePostHostPrivate());
    root.publishAccepted();
    assertEquals(observations, 2);
    assert(JSON.stringify(root.snapshot).includes('"rotation-y":10'));
    candidate.discard();
  } finally { root.dispose(); }
});
