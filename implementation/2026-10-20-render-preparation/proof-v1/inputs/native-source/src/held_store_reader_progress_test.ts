import {
  assert, assertEquals, assertStrictEquals, assertThrows,
} from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import {
  AsyncStore, captureCanonicalStoreReaderReceipt, createAsyncStore,
  inspectCanonicalStoreReaderReceipt, StoreRenderTransaction,
} from "./async_store_runtime.ts";
import {
  ComponentStateRoot, defineComponent, Suspense, useAt, useStoreAt,
} from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");

Deno.test("captured and preserved readers keep each root's accepted Store cut", () => {
  const store = createAsyncStore(1);
  const selected = store.select((value: number) => value * 2);
  const left = new StoreRenderTransaction("held-reader-left");
  assertEquals(left.read(selected, "selected"), 2);
  left.commitAfterValidatedRender();
  const selections = store._readerValuesFor("held-reader-left", "selected");
  const accepted = captureCanonicalStoreReaderReceipt(
    store, "held-reader-left", "selected",
  );
  assert(accepted);

  const suspended = new StoreRenderTransaction("held-reader-left");
  const checkpoint = suspended.checkpoint();
  assertEquals(suspended.read(store, "draft"), 1);
  const draftReaders = suspended.readersSince(checkpoint);
  suspended.rollbackTo(checkpoint);
  suspended.preserveCapturedReaders(new Map([
    ["pending-alias", draftReaders.get("draft")!],
  ]));
  suspended.releaseCheckpoint(checkpoint);
  suspended.commitAfterValidatedRender();
  const alias = captureCanonicalStoreReaderReceipt(
    store, "held-reader-left", "pending-alias",
  );
  assert(alias);
  assertEquals(store.diagnostics().readers, 1);
  assertEquals(store._readerValuesFor("held-reader-left", "pending-alias").size, 0);
  assertStrictEquals(store._readerValuesFor("held-reader-left", "selected"), selections);

  store.dispatch(2);
  assertEquals(inspectCanonicalStoreReaderReceipt(
    store, "held-reader-left", "selected", accepted,
  ), "retained");
  const preserved = new StoreRenderTransaction("held-reader-left");
  preserved.preserveReaders(new Map([
    ["selected", new Set([store])], ["pending-alias", new Set([store])],
  ]));
  preserved.commitAfterValidatedRender();
  assertStrictEquals(store._readerValuesFor("held-reader-left", "selected"), selections);
  assertEquals(inspectCanonicalStoreReaderReceipt(
    store, "held-reader-left", "selected", accepted,
  ), "retained");
  assertEquals(inspectCanonicalStoreReaderReceipt(
    store, "held-reader-left", "pending-alias", alias,
  ), "retained");

  const right = new StoreRenderTransaction("held-reader-right");
  assertEquals(right.read(store, "selected"), 2);
  right.commitAfterValidatedRender();
  const rightReceipt = captureCanonicalStoreReaderReceipt(
    store, "held-reader-right", "selected",
  );
  assert(rightReceipt);
  assertEquals(inspectCanonicalStoreReaderReceipt(
    store, "held-reader-right", "selected", rightReceipt,
  ), "current");
  Object.defineProperty(store, "_prepareReaderValues", {
    configurable: true, value: store._prepareReaderValues,
  });
  assertEquals(captureCanonicalStoreReaderReceipt(
    store, "held-reader-left", "selected",
  ), null);
  assertEquals(inspectCanonicalStoreReaderReceipt(
    store, "held-reader-right", "selected", rightReceipt,
  ), null);
  Reflect.deleteProperty(store, "_prepareReaderValues");
  store.forgetReader("held-reader-left", "pending-alias");
  assertEquals(inspectCanonicalStoreReaderReceipt(
    store, "held-reader-left", "pending-alias", alias,
  ), null);
  store.detachRoot("held-reader-left");
  assertEquals(inspectCanonicalStoreReaderReceipt(
    store, "held-reader-left", "selected", accepted,
  ), null);
  const reattached = new StoreRenderTransaction("held-reader-left");
  reattached.read(store, "selected");
  reattached.commitAfterValidatedRender();
  assertEquals(inspectCanonicalStoreReaderReceipt(
    store, "held-reader-left", "selected", accepted,
  ), null);
  store.detachRoot("held-reader-left");
  store.detachRoot("held-reader-right");
  assertEquals(store.diagnostics().readers, 0);
});

function fixture(
  id: string,
  held: AsyncStore<number>,
  host = new MemoryVDOMHost(),
) {
  const visible = createAsyncStore(0);
  let resolve!: (value: string) => void;
  const resource = new AsyncResource(new Promise<string>((done) => {
    resolve = done;
  }));
  const world = new OwnerStateWorld();
  const container = host.createContainer();
  const scheduled: Array<() => void> = [];
  const root = new ComponentStateRoot(host, container, {
    world, rootId: id, scheduleCommit(commit) { scheduled.push(commit); },
  });
  let heldSelectorCalls = 0;
  const selectedHeld = held.select((value) => {
    heldSelectorCalls++;
    return value;
  });
  const Held = defineComponent(`${id}-held`, () => {
    const value = useStoreAt("held-a", selectedHeld);
    const detail = useAt("detail", resource);
    return jsx("output", { key: "held-output" }, `${value}:${detail}`);
  });
  const Independent = defineComponent(`${id}-independent`, () => {
    const value = useStoreAt("b", visible);
    return jsx("output", { key: "independent-output", "data-b": value },
      String(value));
  });
  root.mount(jsx("main", {}, [
    jsx(Suspense, {
      key: "held-boundary", __nativeBoundarySite: "held-boundary",
      fallback: jsx("output", { key: "held-output" }, "waiting"),
      children: jsx(Held, { key: "held-owner" }),
    }),
    jsx(Independent, { key: "independent-owner" }),
  ]));
  const heldNode = () => container.children[0].children[0];
  const independentNode = () => container.children[0].children[1];
  const drain = () => {
    for (let i = 0; i < 20 && scheduled.length; i++) scheduled.shift()!();
    assertEquals(scheduled.length, 0, "Store work did not quiesce");
  };
  return { root, held, visible, resource, heldNode, independentNode, drain,
    resolve, heldSelectorCalls: () => heldSelectorCalls,
    dispose() { root.dispose(); } };
}

Deno.test("an independent Store advances beside a stale held reader and later reveals latest A", async () => {
  class ReentrantHost extends MemoryVDOMHost {
    action: (() => void) | null = null;
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "data-b" && value === 2) {
        const action = this.action;
        this.action = null;
        action?.();
      }
    }
  }
  const host = new ReentrantHost();
  const held = createAsyncStore(1);
  const f = fixture("held-reader-progress", held, host);
  const release = f.root.holdTransactionPublications({ resources: [f.resource] });
  try {
    const fallback = f.heldNode();
    const before = f.root.publicationVersion;
    const selectorCalls = f.heldSelectorCalls();
    held.dispatch(2);
    f.drain();
    f.visible.dispatch(1);
    f.drain();
    assert(f.root.publicationVersion > before);
    assertStrictEquals(f.heldNode(), fallback);
    assertEquals(text(f.heldNode()), "waiting");
    assertEquals(f.independentNode().props["data-b"], 1);
    assertEquals(f.heldSelectorCalls(), selectorCalls);

    host.action = () => {
      held.dispatch(3);
      f.visible.dispatch(3);
    };
    f.visible.dispatch(2);
    f.drain();
    assertEquals(f.independentNode().props["data-b"], 3);
    assertStrictEquals(f.heldNode(), fallback);
    assertEquals(held.getStateForRoot(f.root.rootId), 3);
    f.visible.dispatch(4);
    f.drain();
    assertEquals(f.independentNode().props["data-b"], 4);
    assertStrictEquals(f.heldNode(), fallback);
    assertEquals(f.heldSelectorCalls(), selectorCalls);

    f.resolve("ready");
    await Promise.resolve();
    release();
    f.drain();
    assertEquals(text(f.heldNode()), "3:ready");
    assertEquals(f.independentNode().props["data-b"], 4);
    assert(f.heldSelectorCalls() > selectorCalls);
  } finally {
    release();
    f.dispose();
    assertEquals(held.diagnostics().readers, 0);
    assertEquals(f.visible.diagnostics().readers, 0);
    assertEquals(held.diagnostics().roots, 0);
    assertEquals(f.visible.diagnostics().roots, 0);
  }
});

Deno.test("opaque held Store readers conservatively decline independent generic work", async () => {
  class OpaqueStore extends AsyncStore<number> {}
  const held = new OpaqueStore(1);
  const f = fixture("opaque-held-reader", held);
  const release = f.root.holdTransactionPublications({ resources: [f.resource] });
  try {
    const fallback = f.heldNode();
    const version = f.root.publicationVersion;
    f.visible.dispatch(1);
    f.drain();
    assertEquals(f.root.publicationVersion, version);
    assertStrictEquals(f.heldNode(), fallback);
    assertEquals(f.independentNode().props["data-b"], 0);
    f.resolve("ready");
    await Promise.resolve();
    release();
    f.drain();
    assertEquals(text(f.heldNode()), "1:ready");
    assertEquals(f.independentNode().props["data-b"], 1);
  } finally {
    release();
    f.dispose();
  }
});

Deno.test("a failed independent host write cannot advance held reader history", () => {
  const fault = new Error("held-reader-host-fault");
  class FailingHost extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "data-b" && value === 1) throw fault;
    }
  }
  const held = createAsyncStore(1);
  const f = fixture("held-reader-failure", held, new FailingHost());
  const release = f.root.holdTransactionPublications({ resources: [f.resource] });
  try {
    const fallback = f.heldNode();
    const selectorCalls = f.heldSelectorCalls();
    held.dispatch(2);
    f.drain();
    const version = f.root.publicationVersion;
    f.visible.dispatch(1);
    const thrown = assertThrows(() => f.drain());
    assert(thrown === fault ||
      (thrown instanceof AggregateError && thrown.errors[0] === fault));
    assertEquals(f.root.publicationVersion, version);
    assertStrictEquals(f.heldNode(), fallback);
    assertEquals(f.heldSelectorCalls(), selectorCalls);
    assertEquals(held.getStateForRoot(f.root.rootId), 2);
  } finally {
    release();
    f.dispose();
    assertEquals(held.diagnostics().readers, 0);
    assertEquals(f.visible.diagnostics().readers, 0);
  }
});
