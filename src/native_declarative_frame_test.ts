import { assert, assertEquals, assertStrictEquals, assertThrows } from "jsr:@std/assert";
import {
  ComponentStateRoot, defineComponent, useFrameAt, useStateAt,
} from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { NativeFrameProgram } from "./native_frame_program.ts";
import { createNativeFrameLoop } from "./native_frame_loop.ts";
import { FrameLoop, type NativeFrameTime } from "./native_runtime_api.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const clock = Object.freeze({ elapsed: 0, delta: 0, timeMs: 0, deltaMs: 0 });

Deno.test("frame graph retains deterministic order and refreshes explicit captures", () => {
  const program = new NativeFrameProgram();
  const calls: string[] = [];
  const a = program.register("owner:a", () => calls.push("a"), [],
    { id: "a", phase: "late" });
  const b = program.register("owner:b", () => calls.push("b:old"), ["old"],
    { id: "b", phase: "early", after: ["a"] });
  program.run(clock);
  assertEquals(calls, ["a", "b:old"]);
  program.refresh("owner:b", () => calls.push("b:ignored"), ["old"],
    { id: "b", phase: "early", after: ["a"] });
  program.run(clock);
  assertEquals(calls.slice(2), ["a", "b:old"]);
  program.refresh("owner:b", () => calls.push("b:new"), ["new"],
    { id: "b", phase: "early", after: ["a"] });
  program.run(clock);
  assertEquals(calls.slice(4), ["a", "b:new"]);
  assertThrows(() => program.register("owner:c", () => {}, [], { id: "a" }),
    Error, "Duplicate frame callback id");
  b();
  a();
});

Deno.test("frame callback cycles reject before any callback executes", () => {
  const program = new NativeFrameProgram();
  let calls = 0;
  program.register("a", () => calls++, [], { id: "a", after: ["b"] });
  program.register("b", () => calls++, [], { id: "b", after: ["a"] });
  assertThrows(() => program.run(clock), Error, "cycle");
  assertEquals(calls, 0);
});

const exposedGc = (globalThis as typeof globalThis & { gc?: () => void }).gc;
Deno.test({
  name: "retired frame registration releases captured dependency without another tick",
  ignore: !exposedGc,
  async fn() {
    const program = new NativeFrameProgram();
    const weak = (() => {
      const captured = {};
      const reference = new WeakRef(captured);
      const retire = program.register("lifetime", () => {}, [captured]);
      program.run(clock);
      retire();
      return reference;
    })();
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      exposedGc?.();
      if (weak.deref() === undefined) return;
    }
    assertEquals(weak.deref(), undefined);
  },
});

Deno.test("one declarative tick updates root clock, local state, props and draw in order", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container,
    { rootId: "declarative-frame", scheduleCommit() {} });
  const callbacks: string[] = [];
  const draws: string[] = [];
  let clockRenders = 0;
  const Clock = defineComponent("frame-clock-owner", () => {
    clockRenders++;
    const frame = useFrameAt("frame-clock-read");
    return jsx("output", { key: "clock", "data-time": frame.timeMs });
  });
  const Logic = defineComponent<{ label: string }>("frame-logic-owner", ({ label }) => {
    const [count, setCount] = useStateAt("frame-count", 0);
    useFrameAt("frame-callback", () => {
      callbacks.push(label);
      setCount((previous) => previous + 1);
    }, [label], { id: "motion", phase: "early" });
    return jsx("output", { key: "logic", "data-count": count });
  });
  const App = defineComponent<{ label: string }>("frame-app-owner", ({ label }) =>
    jsx("section", { key: "scene" }, [
      jsx(Clock, { key: "clock-owner" }),
      jsx(Logic, { key: "logic-owner", label }),
    ]));
  const raf = new Map<number, (timeMs: number) => void>();
  let nextId = 0;
  const take = (timeMs: number) => {
    const [id, callback] = [...raf][0];
    assert(callback);
    raf.delete(id);
    callback(timeMs);
  };
  root.mount(jsx(App, { label: "first" }));
  const section = container.children[0];
  const firstClock = section.children[0];
  let stop: (() => void) | undefined;
  try {
    stop = root.mountFrameLoop({
      draw: ({ timeMs }) => {
        assertEquals(section.children[0].props["data-time"], timeMs);
        draws.push(`${timeMs}:${section.children[1].props["data-count"]}`);
      },
      requestFrame: (callback) => {
        const id = ++nextId;
        raf.set(id, callback);
        return id;
      },
      cancelFrame: (id) => { raf.delete(id); },
    });
    assertThrows(() => root.mountFrameLoop({ draw() {} }),
      Error, "Multiple active FrameLoop");
    take(1000);
    take(1016);
    assertEquals(callbacks, ["first", "first"]);
    assertEquals(draws, ["1000:1", "1016:2"]);
    assertStrictEquals(section.children[0], firstClock);
    assert(clockRenders >= 2);
    root.update(jsx(App, { label: "second" }));
    take(1032);
    assertEquals(callbacks, ["first", "first", "second"]);
    assertEquals(draws.at(-1), "1032:3");
  } finally {
    stop?.();
    root.dispose();
  }
  assertEquals(raf.size, 0);
});

Deno.test("FrameLoop boundary starts on accepted mount and retires with root", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container,
    { rootId: "declarative-boundary", scheduleCommit() {} });
  const callbacks = new Map<number, (timeMs: number) => void>();
  let nextId = 0;
  const draws: number[] = [];
  const Value = defineComponent("frame-boundary-value", () => {
    const frame = useFrameAt("frame-boundary-clock");
    return jsx("output", { key: "value", "data-ms": frame.timeMs });
  });
  root.mount(jsx(FrameLoop, {
    draw: ({ timeMs }: NativeFrameTime) => draws.push(timeMs),
    requestFrame(callback: (timeMs: number) => void) {
      const id = ++nextId;
      callbacks.set(id, callback);
      return id;
    },
    cancelFrame(id: number) { callbacks.delete(id); },
    children: jsx(Value, { key: "value-owner" }),
  }));
  try {
    assertEquals(callbacks.size, 1);
    const [id, callback] = [...callbacks][0];
    callbacks.delete(id);
    callback(42);
    assertEquals(container.children[0].props["data-ms"], 42);
    assertEquals(draws, [42]);
  } finally {
    root.dispose();
  }
  assertEquals(callbacks.size, 0);
});

Deno.test("manual declarative driver claims one root and draws without readers", () => {
  const host = new MemoryVDOMHost();
  const root = new ComponentStateRoot(host, host.createContainer(),
    { rootId: "manual-declarative", scheduleCommit() {} });
  root.mount(jsx("output", { key: "empty" }));
  const drawn: number[] = [];
  const loop = createNativeFrameLoop({
    roots: [{ root, stores: [] }], declarative: true,
    draw: ({ timeMs }) => drawn.push(timeMs),
  });
  try {
    assertThrows(() => createNativeFrameLoop({
      roots: [{ root, stores: [] }], declarative: true, draw() {},
    }), Error, "Multiple active FrameLoop");
    assertEquals(loop.advance(10).status, "drawn");
    assertEquals(drawn, [10]);
  } finally {
    loop.dispose();
  }
  const replacement = createNativeFrameLoop({
    roots: [{ root, stores: [] }], declarative: true, draw() {},
  });
  try { assertEquals(replacement.advance(11).status, "drawn"); }
  finally { replacement.dispose(); root.dispose(); }
});

Deno.test("callback reentry defers publication until ordered callbacks complete", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container,
    { rootId: "frame-reentry", scheduleCommit() {} });
  const seen: number[] = [];
  const Logic = defineComponent("frame-reentry-owner", () => {
    const [count, setCount] = useStateAt("frame-reentry-state", 0);
    useFrameAt("frame-reentry-first", () => {
      setCount(1);
      assertEquals(root.flush(), false);
    }, [], { id: "first" });
    useFrameAt("frame-reentry-second", () => {
      seen.push(container.children[0].props["data-count"] as number);
    }, [], { id: "second", after: ["first"] });
    return jsx("output", { key: "value", "data-count": count });
  });
  root.mount(jsx(Logic, { key: "logic" }));
  const loop = createNativeFrameLoop({ roots: [{ root, stores: [] }],
    declarative: true,
    draw() { seen.push(container.children[0].props["data-count"] as number); },
  });
  try {
    assertEquals(loop.advance(1).status, "drawn");
    assertEquals(seen, [0, 1]);
  } finally { loop.dispose(); root.dispose(); }
});

Deno.test("disposing a driver during a callback skips later callbacks and draw", () => {
  const host = new MemoryVDOMHost();
  const root = new ComponentStateRoot(host, host.createContainer(),
    { rootId: "frame-mid-tick-dispose", scheduleCommit() {} });
  const seen: string[] = [];
  let loop!: ReturnType<typeof createNativeFrameLoop>;
  const Logic = defineComponent("frame-mid-tick-owner", () => {
    useFrameAt("frame-dispose-first", () => {
      seen.push("first");
      loop.dispose();
    }, [], { id: "first" });
    useFrameAt("frame-dispose-second", () => seen.push("second"), [],
      { id: "second", after: ["first"] });
    return jsx("output", { key: "value" });
  });
  root.mount(jsx(Logic, { key: "logic" }));
  loop = createNativeFrameLoop({ roots: [{ root, stores: [] }],
    declarative: true, draw() { seen.push("draw"); },
  });
  try {
    assertEquals(loop.advance(1).status, "disposed");
    assertEquals(seen, ["first"]);
  } finally { loop.dispose(); root.dispose(); }
});

Deno.test("stopping a driver during a callback skips later callbacks and draw", () => {
  const host = new MemoryVDOMHost();
  const root = new ComponentStateRoot(host, host.createContainer(),
    { rootId: "frame-mid-tick-stop", scheduleCommit() {} });
  const seen: string[] = [];
  let loop!: ReturnType<typeof createNativeFrameLoop>;
  const Logic = defineComponent("frame-mid-tick-stop-owner", () => {
    useFrameAt("frame-stop-first", () => {
      seen.push("first");
      loop.stop();
    }, [], { id: "first" });
    useFrameAt("frame-stop-second", () => seen.push("second"), [],
      { id: "second", after: ["first"] });
    return jsx("output", { key: "value" });
  });
  root.mount(jsx(Logic, { key: "logic" }));
  loop = createNativeFrameLoop({ roots: [{ root, stores: [] }],
    declarative: true, draw() { seen.push("draw"); },
  });
  try {
    assertEquals(loop.advance(1).status, "cancelled");
    assertEquals(seen, ["first"]);
  } finally { loop.dispose(); root.dispose(); }
});
