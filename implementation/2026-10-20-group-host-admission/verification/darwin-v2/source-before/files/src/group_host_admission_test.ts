import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import {
  bindStatePropAt, ComponentStateRoot, defineComponent, renderCollectionAt,
  isNativeRootHostPublicationBusy, Suspense, useAt, useStateAt, useStoreAt,
} from "./component_state_runtime.ts";
import { AsyncResource } from "./async_resource_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import { createKeyedCollection } from "./keyed_collection.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import { OwnerStateWorld, type StateCellHandle } from "./owner_state_world.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const root = (id: string, host = new MemoryVDOMHost()) => {
  const container = host.createContainer();
  const instance = new ComponentStateRoot(host, container, {
    rootId: id, scheduleCommit() {}, renderPreparation: "repeatable",
  });
  return { root: instance, container, host };
};

for (const order of ["left-first", "right-first"] as const) {
  Deno.test(`final group callback revokes a member before either host writes (${order})`, () => {
    const left = root(`admission-left-${order}`);
    const right = root(`admission-right-${order}`);
    const queue = new NativeRootWorkQueue({ maxStaleRetries: 0 });
    left.root.mount(jsx("output", {}, "left-old"));
    right.root.mount(jsx("output", {}, "right-old"));
    const leftWrites = left.host.writeCount;
    const leftPlaces = left.host.placementCount;
    const leftAccepted = left.root.snapshot;
    const members = order === "left-first" ? [left, right] : [right, left];
    let callbacks = 0;
    try {
      const stale = queue.enqueue({
        id: `admission-revoke-${order}`,
        roots: members.map(({ root }) => ({ root, tree: jsx("output", {}, "new") })),
        validateWork: () => {
          callbacks++;
          if (callbacks === 3) right.root.dispose();
          return true;
        },
        onStaleWork: () => "reject",
      });
      assertEquals(stale.status === "stale" || stale.status === "cancelled", true);
      assertStrictEquals(left.root.snapshot, leftAccepted);
      assertEquals(left.host.writeCount, leftWrites);
      assertEquals(left.host.placementCount, leftPlaces);
      assertEquals(left.container.children[0].children[0].text, "left-old");
      const healthy = queue.enqueue({
        id: `admission-healthy-${order}`,
        roots: [{ root: left.root, tree: jsx("output", {}, "healthy") }],
      });
      assertEquals(healthy.status, "committed");
      assertEquals(left.container.children[0].children[0].text, "healthy");
    } finally {
      queue.dispose();
      left.root.dispose();
      right.root.dispose();
    }
  });
}

Deno.test("retained group keeps newer actions after a late admission callback", () => {
  const world = new OwnerStateWorld();
  const queue = new NativeRootWorkQueue({ maxStaleRetries: 0 });
  const fixtures = ["left", "right"].map((side) => {
    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    const root = new ComponentStateRoot(host, container, {
      rootId: `admission-retained-${side}`, world, scheduleCommit() {},
    });
    const programId = `admission-retained-${side}:view`;
    let set!: (value: number) => boolean;
    const View = defineComponent(programId, () => {
      [, set] = useStateAt("value", 0);
      return jsx("output", {
        value: bindStatePropAt("value", (value) => value, {
          schemaVersion: 2, ownerProgramId: programId, sinkId: "value",
          sourceSites: ["value"], closedExpression: { kind: "input", index: 0 },
        }),
      });
    }, {
      propOnlySites: ["value"],
      stateLayout: {
        schemaVersion: 1, programId,
        slots: [{ siteId: "value", slot: 0 }],
      },
    });
    root.mount(jsx(View, {}));
    return { root, host, container, set: (value: number) => set(value) };
  });
  const handles: StateCellHandle[] = [];
  const unsubscribe = world.subscribeDirtyCells((handle) => handles.push(handle));
  try {
    for (const fixture of fixtures) assertEquals(fixture.set(1), true);
    assertEquals(handles.length, 2);
    const cells = [...handles];
    const before = fixtures.map(({ host }) => host.writeCount);
    let callbacks = 0;
    const stale = queue.enqueueRetained({
      id: "admission-retained-stale",
      roots: fixtures.map(({ root }, index) => ({ root, cells: [cells[index]] })),
      validateWork: () => {
        if (++callbacks === 3) fixtures[0].set(2);
        return true;
      },
      onStaleWork: () => "reject",
    });
    assertEquals(stale.status, "stale");
    assertEquals(fixtures.map(({ host }) => host.writeCount), before);
    assertEquals(fixtures.map(({ container }) => container.children[0].props.value), [0, 0]);
    assertEquals(fixtures[0].root.diagnostics().pendingChangeCount > 0, true);
  } finally {
    unsubscribe();
    queue.dispose();
    for (const fixture of fixtures) fixture.root.dispose();
  }
});

Deno.test("strict Store admission preserves a newer last-callback action without group writes", () => {
  const store = createAsyncStore(0, (_previous: number, next: number) => next);
  const left = root("admission-store-left");
  const right = root("admission-store-right");
  const queue = new NativeRootWorkQueue({ maxStaleRetries: 0 });
  const StoreView = defineComponent("admission-store-view", () =>
    jsx("output", {}, String(useStoreAt("value", store))));
  const leftTree = jsx(StoreView, {});
  left.root.mount(leftTree);
  right.root.mount(jsx("output", {}, "right-old"));
  store.dispatch(1);
  const before = [left.host.writeCount, right.host.writeCount];
  const versions = [left.root.publicationVersion, right.root.publicationVersion];
  let callbacks = 0;
  try {
    const stale = queue.enqueue({
      id: "admission-store-stale", renderPreparation: "repeatable",
      roots: [
        { root: left.root, tree: leftTree },
        { root: right.root, tree: jsx("output", {}, "right-new") },
      ],
      validateWork: () => {
        if (++callbacks === 3) store.dispatch(2);
        return true;
      },
      onStaleWork: () => "reject",
    });
    assertEquals(callbacks, 3);
    assertEquals(stale.status, "stale");
    assertEquals([left.host.writeCount, right.host.writeCount], before);
    assertEquals([left.root.publicationVersion, right.root.publicationVersion], versions);
    assertEquals(store.getState(), 2);
    assertEquals(left.container.children[0].children[0].text, "0");
    const healthy = queue.enqueue({
      id: "admission-store-healthy", renderPreparation: "repeatable",
      roots: [{ root: left.root, tree: leftTree }],
    });
    assertEquals(healthy.status, "committed");
    assertEquals(left.container.children[0].children[0].text, "2");
  } finally {
    queue.dispose();
    left.root.dispose();
    right.root.dispose();
  }
});

Deno.test("private admission does not call overridable World methods", () => {
  class ObservedWorld extends OwnerStateWorld {
    armed = false;
    forbiddenCalls = 0;
    override versionForCell(handle: StateCellHandle): number | null {
      if (this.armed) {
        this.forbiddenCalls++;
        throw new Error("public versionForCell entered private admission");
      }
      return super.versionForCell(handle);
    }
    override isAlive(owner: number): boolean {
      if (this.armed) {
        this.forbiddenCalls++;
        throw new Error("public isAlive entered private admission");
      }
      return super.isAlive(owner);
    }
  }
  const world = new ObservedWorld();
  class DisarmingHost extends MemoryVDOMHost {
    override setProp(node: Parameters<MemoryVDOMHost["setProp"]>[0], name: string,
      value: unknown, previous?: unknown): void {
      world.armed = false;
      super.setProp(node, name, value, previous);
    }
  }
  const fixtures = ["left", "right"].map((side) => {
    const host = new DisarmingHost();
    const container = host.createContainer();
    const instance = new ComponentStateRoot(host, container, {
      rootId: `admission-world-${side}`, world, scheduleCommit() {},
    });
    const programId = `admission-world-${side}:view`;
    let set!: (value: number) => boolean;
    const View = defineComponent(programId, () => {
      [, set] = useStateAt("value", 0);
      return jsx("output", {
        value: bindStatePropAt("value", (value) => value, {
          schemaVersion: 2, ownerProgramId: programId,
          sinkId: "value", sourceSites: ["value"],
          closedExpression: { kind: "input", index: 0 },
        }),
      });
    }, {
      propOnlySites: ["value"],
      stateLayout: {
        schemaVersion: 1, programId,
        slots: [{ siteId: "value", slot: 0 }],
      },
    });
    instance.mount(jsx(View, {}));
    return { root: instance, container, set: (value: number) => set(value) };
  });
  const cells: StateCellHandle[] = [];
  const unsubscribe = world.subscribeDirtyCells((handle) => cells.push(handle));
  const queue = new NativeRootWorkQueue({ maxStaleRetries: 0 });
  try {
    for (const fixture of fixtures) assertEquals(fixture.set(1), true);
    assertEquals(cells.length, 2);
    let callbacks = 0;
    const committed = queue.enqueueRetained({
      id: "admission-world-private",
      roots: fixtures.map(({ root }, index) => ({ root, cells: [cells[index]] })),
      validateWork: () => {
        if (++callbacks === 3) world.armed = true;
        return true;
      },
      onStaleWork: () => "reject",
    });
    assertEquals(callbacks >= 3, true);
    assertEquals(committed.status, "committed");
    assertEquals(world.forbiddenCalls, 0);
    assertEquals(fixtures.map(({ container }) => container.children[0].props.value), [1, 1]);
  } finally {
    world.armed = false;
    unsubscribe();
    queue.dispose();
    for (const fixture of fixtures) fixture.root.dispose();
  }
});

Deno.test("keyed host descriptor callback revokes a later retained member before the first write", () => {
  const base = new MemoryVDOMHost();
  const container = base.createContainer();
  let armed = false, descriptorCalls = 0, revocations = 0;
  let revoke!: () => void;
  const host = new Proxy(base, {
    get(target, name) {
      const value = Reflect.get(target, name, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
    getOwnPropertyDescriptor(target, name) {
      if (name === "setProp") {
        descriptorCalls++;
        if (armed && isNativeRootHostPublicationBusy(keyedRoot)) {
          armed = false;
          revoke();
        }
      }
      return Reflect.getOwnPropertyDescriptor(target, name);
    },
  });
  const keyedRoot = new ComponentStateRoot(host, container, {
    rootId: "admission-keyed-host", scheduleCommit() {},
  });
  const rows = createKeyedCollection(["a", "b"], (value) => value);
  const Row = defineComponent("admission-keyed-row", ({ value }: { value: string }) =>
    jsx("li", { "data-key": value }, value));
  const List = defineComponent("admission-keyed-list", () => jsx("ul", {},
    renderCollectionAt("admission-keyed-region", rows, (value) =>
      jsx(Row, { value }))));
  keyedRoot.mount(jsx(List, {}));
  const peer = root("admission-keyed-peer");
  let setter!: (value: number) => boolean;
  let cell!: StateCellHandle;
  const unsubscribe = peer.root.world.subscribeDirtyCells((handle) => cell = handle);
  const Peer = defineComponent("admission-keyed-peer-view", () => {
    [, setter] = useStateAt("value", 0);
    return jsx("output", {
      value: bindStatePropAt("value", (value) => value, {
        schemaVersion: 2, ownerProgramId: "admission-keyed-peer-view",
        sinkId: "value", sourceSites: ["value"],
        closedExpression: { kind: "input", index: 0 },
      }),
    });
  }, {
    propOnlySites: ["value"],
    stateLayout: {
      schemaVersion: 1, programId: "admission-keyed-peer-view",
      slots: [{ siteId: "value", slot: 0 }],
    },
  });
  peer.root.mount(jsx(Peer, {}));
  assertEquals(setter(1), true);
  assert(rows.apply(rows.version, [{ type: "move", key: "b", beforeKey: "a" }]).ok);
  const queue = new NativeRootWorkQueue({ maxStaleRetries: 0 });
  const writes = [base.writeCount, base.placementCount, peer.host.writeCount];
  let callbacks = 0;
  revoke = () => { revocations++; assertEquals(setter(2), true); };
  try {
    const result = queue.enqueueTransaction({
      id: "admission-keyed-proxy-revocation",
      roots: [
        { root: keyedRoot, cells: [], collections: [rows] },
        { root: peer.root, cells: [cell], collections: [] },
      ],
      validateWork: () => {
        if (++callbacks === 2) armed = true;
        return true;
      },
      onStaleWork: () => "reject",
    });
    assertEquals(result.status, "stale");
    assertEquals(descriptorCalls > 0, true);
    assertEquals(revocations, 1);
    assertEquals([base.writeCount, base.placementCount, peer.host.writeCount], writes);
    assertEquals(container.children[0].children.map((node) => node.props["data-key"]), ["a", "b"]);
    assertEquals(peer.container.children[0].props.value, 0);
    assertEquals(peer.root.diagnostics().pendingChangeCount > 0, true);
    const healthy = queue.enqueueRetained({
      id: "admission-keyed-peer-healthy",
      roots: [{ root: peer.root, cells: [cell] }],
    });
    assertEquals(healthy.status, "committed");
    assertEquals(peer.container.children[0].props.value, 2);
  } finally {
    unsubscribe();
    queue.dispose();
    keyedRoot.dispose();
    peer.root.dispose();
  }
});

Deno.test("opaque grouped resource stamp declines before host writes while standalone Proxy remains usable", async () => {
  const source = new AsyncResource(Promise.resolve("ready"));
  const opaque = new Proxy(source, {
    get(target, name) {
      if (name === "read") return () => "external";
      const value = Reflect.get(target, name, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  for (let index = 0; index < 5; index++) await Promise.resolve();
  const left = root("admission-opaque-left");
  const right = root("admission-opaque-right");
  const Read = defineComponent("admission-opaque-read", () =>
    jsx("output", {}, String(useAt("resource", opaque))));
  const tree = jsx(Suspense, {
    key: "opaque-boundary", __nativeBoundarySite: "admission-opaque-boundary",
    fallback: jsx("output", {}, "waiting"),
    children: jsx(Read, {}),
  });
  left.root.mount(jsx("output", {}, "old-left"));
  right.root.mount(jsx("output", {}, "old-right"));
  const writes = [left.host.writeCount, right.host.writeCount];
  const versions = [left.root.publicationVersion, right.root.publicationVersion];
  const queue = new NativeRootWorkQueue({ maxStaleRetries: 0 });
  try {
    const grouped = queue.enqueue({
      id: "admission-opaque-group", renderPreparation: "repeatable",
      roots: [
        { root: left.root, tree: jsx("output", {}, "new-left") },
        { root: right.root, tree },
      ],
      onStaleWork: () => "reject",
    });
    assertEquals(grouped.status, "failed");
    assertEquals(
      String(grouped.resolution.error).includes("opaque") ||
        String(grouped.resolution.error).includes("resource"),
      true,
    );
    assertEquals([left.host.writeCount, right.host.writeCount], writes);
    assertEquals([left.root.publicationVersion, right.root.publicationVersion], versions);
    const healthy = queue.enqueue({
      id: "admission-opaque-healthy", renderPreparation: "repeatable",
      roots: [{ root: left.root, tree: jsx("output", {}, "healthy") }],
    });
    assertEquals(healthy.status, "committed");
    right.root.update(tree);
    assertEquals(right.container.children[0].children[0].text, "external");
  } finally {
    queue.dispose();
    left.root.dispose();
    right.root.dispose();
  }
});
