import { assert, assertEquals, assertStrictEquals, assertThrows } from "jsr:@std/assert";
import { createAsyncStore, type AsyncStore } from "./async_store_runtime.ts";
import { ComponentStateRoot, defineComponent, useStoreAt } from "./component_state_runtime.ts";
import { registerCompiledSemanticPlan } from "./compiled_semantic_plan.ts";
import { createNativeFrameLoop } from "./native_frame_loop.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, type MemoryNode } from "./vdom_snapshot_runtime.ts";

const revision = "native-frame-loop-test-v1";

function fixture(id: string, shared?: AsyncStore<number, number>, host = new MemoryVDOMHost()) {
  const sourceFile = `native-frame-loop/${id}.tsx`;
  registerCompiledSemanticPlan({
    schema_version: 1, source_file: sourceFile, module_revision: revision,
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
  });
  const store = shared ?? createAsyncStore(0, (_old: number, next: number) => next);
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: id, scheduleCommit: () => {},
  });
  const programId = `${sourceFile}#component:Value`;
  const useSite = `${programId}#store:0`;
  const Value = defineComponent(programId, (props: { store: typeof store }) =>
    jsx("output", { key: "value", "data-value": useStoreAt(useSite, props.store) }), {
    propOnlySites: [],
    closedStoreHostProgram: {
      schemaVersion: 1, componentProgramId: programId, moduleRevision: revision,
      storeUseSiteId: useSite, storeProp: "store",
      host: { tag: "output", key: "value", child: null,
        props: [["data-value", { kind: "input", index: 0 }]] },
    },
  });
  root.mount(jsx(Value, { store }));
  return {
    root, store, host, container,
    value: () => container.children[0].props["data-value"],
    dispose: () => root.dispose(),
  };
}

function fakeRaf() {
  let nextId = 0;
  const callbacks = new Map<number, (timeMs: number) => void>();
  const cancelled: number[] = [];
  return {
    requestFrame(callback: (timeMs: number) => void) {
      const id = ++nextId;
      callbacks.set(id, callback);
      return id;
    },
    cancelFrame(id: number) { cancelled.push(id); callbacks.delete(id); },
    take(id: number) { const callback = callbacks.get(id); assert(callback); callbacks.delete(id); return callback; },
    ids: () => [...callbacks.keys()],
    cancelled,
  };
}

Deno.test("manual frame certifies an unchanged Store group and clamps elapsed time", () => {
  const f = fixture("manual-noop");
  const frames: Array<readonly [number, number]> = [];
  const draws: number[] = [];
  const loop = createNativeFrameLoop({ roots: [{ root: f.root, stores: [f.store] }],
    update(frame) {
      assert(Object.isFrozen(frame));
      frames.push([frame.timeMs, frame.deltaMs]);
    },
    draw(frame) { draws.push(frame.timeMs); },
  });
  try {
    assertEquals(loop.running, false);
    assertEquals(loop.advance(10).status, "drawn");
    assertEquals(loop.advance(110).status, "drawn");
    assertEquals(frames, [[10, 0], [110, 50]]);
    assertEquals(draws, [10, 110]);
    assertEquals(f.value(), 0);
    assertThrows(() => loop.advance(109), RangeError);
    assertEquals(loop.running, false);
  } finally { loop.dispose(); f.dispose(); }
});

Deno.test("RAF ownership ignores stopped callback after restart", () => {
  const f = fixture("raf-stale");
  const raf = fakeRaf();
  const draws: number[] = [];
  const loop = createNativeFrameLoop({ roots: [{ root: f.root, stores: [f.store] }],
    update() {}, draw(frame) { draws.push(frame.timeMs); },
    requestFrame: raf.requestFrame, cancelFrame: raf.cancelFrame,
  });
  try {
    loop.start();
    const oldId = raf.ids()[0];
    const oldCallback = raf.take(oldId);
    loop.stop();
    loop.start();
    const newId = raf.ids()[0];
    oldCallback(1);
    assertEquals(raf.ids(), [newId]);
    raf.take(newId)(2);
    assertEquals(draws, [2]);
    assertEquals(raf.ids().length, 1);
  } finally { loop.dispose(); f.dispose(); }
});

Deno.test("two Store roots draw only after their grouped accepted cut", () => {
  const shared = createAsyncStore(0, (_old: number, next: number) => next);
  const a = fixture("group-a", shared), b = fixture("group-b", shared);
  const observations: Array<readonly [unknown, unknown]> = [];
  const loop = createNativeFrameLoop({ roots: [
    { root: a.root, stores: [shared] }, { root: b.root, stores: [shared] },
  ], update() { shared.dispatch(3); },
  draw() { observations.push([a.value(), b.value()]); } });
  try {
    const result = loop.advance(1);
    assertEquals(result.status, "drawn");
    assertEquals(result.publication?.roots, [a.root.rootId, b.root.rootId]);
    assertEquals(observations, [[3, 3]]);
  } finally { loop.dispose(); a.dispose(); b.dispose(); }
});

Deno.test("busy host settles later and an intervening root commit forces reprepare", async () => {
  const host = new MemoryVDOMHost();
  const blocker = fixture("busy-blocker", undefined, host);
  const f = fixture("busy-target", undefined, host);
  const held = blocker.root.prepareStores([blocker.store]);
  assert(held);
  held.commitHost();
  let updates = 0;
  const draws: unknown[] = [];
  const loop = createNativeFrameLoop({ roots: [{ root: f.root, stores: [f.store] }],
    update() { updates++; f.store.dispatch(1); },
    draw() { draws.push(f.value()); },
  });
  try {
    const before = f.root.publicationVersion;
    assertEquals(loop.advance(1).status, "pending");
    assertEquals(draws, []);
    assert(held.validatePostHost());
    held.preparePublication(); held.publish(); held.runEffects();
    await Promise.resolve();
    await Promise.resolve();
    assertEquals(draws, [], "host wake drew outside advance");
    assertEquals(f.root.publicationVersion, before + 1);
    f.store.dispatch(2);
    f.root.flush();
    assertEquals(loop.advance(2).status, "drawn");
    assertEquals(updates, 1, "pending frame reran update");
    assertEquals(draws, [2]);
  } finally { loop.dispose(); blocker.dispose(); f.dispose(); }
});

Deno.test("a newer action during host write remains for the next frame", () => {
  const store = createAsyncStore(0, (_old: number, next: number) => next);
  class ReentrantHost extends MemoryVDOMHost {
    armed = false;
    override setProp(node: MemoryNode, name: string, next: unknown, previous?: unknown) {
      super.setProp(node, name, next, previous);
      if (this.armed && name === "data-value" && next === 1) {
        this.armed = false;
        store.dispatch(2);
      }
    }
  }
  const host = new ReentrantHost();
  const f = fixture("newer-action", store, host);
  const seen: unknown[] = [];
  let updates = 0;
  const loop = createNativeFrameLoop({ roots: [{ root: f.root, stores: [store] }],
    update() { if (++updates === 1) store.dispatch(1); },
    draw() { seen.push(f.value()); },
  });
  try {
    host.armed = true;
    assertEquals(loop.advance(1).status, "drawn");
    assertEquals(seen, [1]);
    assertEquals(loop.advance(2).status, "drawn");
    assertEquals(seen, [1, 2]);
  } finally { loop.dispose(); f.dispose(); }
});

Deno.test("stop and disposal from callbacks prevent publication or draw", () => {
  const f = fixture("callback-stop");
  let draws = 0;
  let loop!: ReturnType<typeof createNativeFrameLoop>;
  loop = createNativeFrameLoop({ roots: [{ root: f.root, stores: [f.store] }],
    update() { loop.stop(); }, draw() { draws++; },
  });
  try {
    assertEquals(loop.advance(1).status, "cancelled");
    assertEquals(draws, 0);
  } finally { loop.dispose(); f.dispose(); }

  const g = fixture("callback-dispose");
  let disposed!: ReturnType<typeof createNativeFrameLoop>;
  disposed = createNativeFrameLoop({ roots: [{ root: g.root, stores: [g.store] }],
    update() { disposed.dispose(); }, draw() { draws++; },
  });
  try {
    assertEquals(disposed.advance(1).status, "disposed");
    assertEquals(draws, 0);
  } finally { disposed.dispose(); g.dispose(); }
});

Deno.test("stop from host application blocks draw without reverting accepted work", () => {
  const host = new MemoryVDOMHost();
  const f = fixture("host-stop", undefined, host);
  let draws = 0;
  let loop!: ReturnType<typeof createNativeFrameLoop>;
  const original = host.setProp.bind(host);
  host.setProp = (node, name, next, previous) => {
    original(node, name, next, previous);
    if (name === "data-value" && next === 1) loop.stop();
  };
  loop = createNativeFrameLoop({ roots: [{ root: f.root, stores: [f.store] }],
    update() { f.store.dispatch(1); }, draw() { draws++; },
  });
  try {
    assertEquals(loop.advance(1).status, "cancelled");
    assertEquals(f.value(), 1);
    assertEquals(draws, 0);
  } finally { loop.dispose(); f.dispose(); }
});

Deno.test("synchronous scheduler callback fails safely and cancels returned request", () => {
  const f = fixture("synchronous-raf");
  const cancelled: number[] = [];
  const errors: unknown[] = [];
  let updates = 0;
  const loop = createNativeFrameLoop({ roots: [{ root: f.root, stores: [f.store] }],
    update() { updates++; }, draw() {},
    requestFrame(callback) { callback(1); return 7; },
    cancelFrame(id) { cancelled.push(id); },
    onError(error) { errors.push(error); },
  });
  try {
    assertThrows(() => loop.start(), Error, "synchronously");
    assertEquals([loop.running, updates], [false, 0]);
    assertEquals(cancelled, [7]);
    assertEquals(errors.length, 1);
  } finally { loop.dispose(); f.dispose(); }
});

Deno.test("callback error preserves original and scheduler cleanup failure", () => {
  const f = fixture("cleanup-error");
  const raf = fakeRaf();
  const original = new Error("update failed");
  const cleanup = new Error("cancel failed");
  const reported: unknown[] = [];
  const loop = createNativeFrameLoop({ roots: [{ root: f.root, stores: [f.store] }],
    update() { throw original; }, draw() {},
    requestFrame: raf.requestFrame,
    cancelFrame(id) { raf.cancelFrame(id); throw cleanup; },
    onError(error) { reported.push(error); },
  });
  try {
    loop.start();
    const error = assertThrows(() => loop.advance(1));
    assert(error instanceof AggregateError);
    assertStrictEquals(error.errors[0], original);
    assert(error.errors[1] instanceof AggregateError);
    assertStrictEquals(error.errors[1].errors[0], cleanup);
    assertEquals(reported, [original]);
    assertEquals(loop.running, false);
  } finally { loop.dispose(); f.dispose(); }
});

Deno.test("failed host writer returns failed receipt and stops scheduled replay", () => {
  class FailingHost extends MemoryVDOMHost {
    fail = false;
    override setProp(node: MemoryNode, name: string, next: unknown, previous?: unknown) {
      super.setProp(node, name, next, previous);
      if (this.fail && name === "data-value" && next === 1) throw new Error("host failed");
    }
  }
  const host = new FailingHost();
  const f = fixture("writer-failure", undefined, host);
  const raf = fakeRaf();
  let draws = 0;
  const loop = createNativeFrameLoop({ roots: [{ root: f.root, stores: [f.store] }],
    update() { f.store.dispatch(1); }, draw() { draws++; },
    requestFrame: raf.requestFrame, cancelFrame: raf.cancelFrame,
  });
  try {
    loop.start();
    host.fail = true;
    const first = raf.ids()[0];
    assertThrows(() => raf.take(first)(1), Error, "host failed");
    assertEquals(loop.running, false);
    assertEquals(raf.ids(), []);
    assertEquals(draws, 0);
    const failed = loop.advance(2);
    assertEquals(failed.status, "failed");
    assert(failed.publication?.error instanceof Error);
    assertStrictEquals(failed.publication?.error, failed.error);
    assertStrictEquals(loop.advance(3), failed);
    assertStrictEquals(assertThrows(() => loop.start()), failed.error);
    assertEquals(raf.ids(), []);
  } finally { loop.dispose(); f.dispose(); }
});

Deno.test("failed receipt preserves an arbitrary thrown value", () => {
  class UndefinedFailureHost extends MemoryVDOMHost {
    fail = false;
    override setProp(node: MemoryNode, name: string, next: unknown, previous?: unknown) {
      super.setProp(node, name, next, previous);
      if (this.fail && name === "data-value" && next === 1) throw undefined;
    }
  }
  const host = new UndefinedFailureHost();
  const f = fixture("undefined-writer-failure", undefined, host);
  const reported: unknown[] = [];
  const loop = createNativeFrameLoop({ roots: [{ root: f.root, stores: [f.store] }],
    update() { f.store.dispatch(1); }, draw() { throw new Error("must not draw"); },
    onError(error) { reported.push(error); },
  });
  try {
    host.fail = true;
    const result = loop.advance(1);
    assertEquals(result.status, "failed");
    assert(result.publication && Object.hasOwn(result.publication, "error"));
    assertStrictEquals(result.error, undefined);
    assertEquals(reported, [undefined]);
  } finally { loop.dispose(); f.dispose(); }
});

Deno.test("reentrant advance rejects and draw failure does not poison accepted root", () => {
  const f = fixture("reentrant-draw");
  const failure = new Error("draw failed");
  let loop!: ReturnType<typeof createNativeFrameLoop>;
  let reentry: unknown;
  loop = createNativeFrameLoop({ roots: [{ root: f.root, stores: [f.store] }],
    update() {
      try { loop.advance(1); } catch (error) { reentry = error; }
      f.store.dispatch(4);
    },
    draw() { throw failure; },
  });
  try {
    assertStrictEquals(assertThrows(() => loop.advance(1)), failure);
    assert(reentry instanceof Error);
    assertEquals(loop.running, false);
    assertEquals(f.value(), 4);
    const next = createNativeFrameLoop({ roots: [{ root: f.root, stores: [f.store] }],
      update() {}, draw() {},
    });
    try { assertEquals(next.advance(2).status, "drawn"); }
    finally { next.dispose(); }
  } finally { loop.dispose(); f.dispose(); }
});

Deno.test("retirement disposes the controller before another draw", () => {
  const f = fixture("retirement");
  let draws = 0;
  const loop = createNativeFrameLoop({ roots: [{ root: f.root, stores: [f.store] }],
    update() {}, draw() { draws++; },
  });
  try {
    assertEquals(loop.advance(1).status, "drawn");
    f.root.dispose();
    assertEquals(loop.disposed, true);
    assertEquals(loop.advance(2).status, "disposed");
    assertEquals(draws, 1);
  } finally { loop.dispose(); f.dispose(); }
});
