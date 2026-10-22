import { assert, assertEquals } from "jsr:@std/assert";
import { createAsyncStore } from "./async_store_runtime.ts";
import { ComponentStateRoot, defineComponent, useStoreAt } from "./component_state_runtime.ts";
import { registerCompiledSemanticPlan } from "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import { MemoryVDOMHost, type MemoryNode } from "./vdom_snapshot_runtime.ts";

function fixture(id: string, scheduleCommit?: (commit: () => void) => void) {
  const file = `native-notification-ack/${id}.tsx`;
  const revision = "native-notification-ack-v1";
  registerCompiledSemanticPlan({
    schema_version: 1, source_file: file, module_revision: revision,
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
  });
  const clock = createAsyncStore(0, (_old: number, next: number) => next);
  const studio = createAsyncStore("old", (_old: string, next: string) => next);
  const clockSite = `${file}#component:Clock`;
  const clockUseSite = `${clockSite}#store:0`;
  let clockRenders = 0, studioRenders = 0;
  const Clock = defineComponent(clockSite, (props: { clock: typeof clock }) => {
    clockRenders++;
    return jsx("output", { key: "clock", "data-clock": useStoreAt(clockUseSite, props.clock) });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 1, componentProgramId: clockSite, moduleRevision: revision,
    storeUseSiteId: clockUseSite, storeProp: "clock",
    host: { tag: "output", key: "clock", child: null,
      props: [["data-clock", { kind: "input", index: 0 }]] },
  }, closedStoreExecution: { schemaVersion: 1, kind: "owned-data",
    componentProgramId: clockSite, moduleRevision: revision } });
  const studioSite = `${file}#component:Studio`;
  const Studio = defineComponent(studioSite, (props: { studio: typeof studio }) => {
    studioRenders++;
    return jsx("output", { key: "studio",
      "data-studio": useStoreAt(`${studioSite}#store:0`, props.studio) });
  });
  class Host extends MemoryVDOMHost {
    onClockWrite?: (value: unknown) => void;
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "data-clock") this.onClockWrite?.(value);
    }
  }
  const host = new Host(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container,
    { rootId: id, ...(scheduleCommit ? { scheduleCommit } : {}) });
  root.mount([jsx(Clock, { key: "clock-owner", clock }),
    jsx(Studio, { key: "studio-owner", studio })]);
  const queue = new NativeRootWorkQueue();
  return { root, queue, clock, studio, host,
    clockValue: () => container.children[0].props["data-clock"],
    studioValue: () => container.children[1].props["data-studio"],
    renders: () => [clockRenders, studioRenders] as const,
    publishClock: (workId: string) => queue.enqueueStores({ id: workId,
      roots: [{ root, stores: [clock] }] }),
    dispose: () => { queue.dispose(); root.dispose(); } };
}

Deno.test("default scheduler does not rerender an unchanged opaque Store sibling after repeated closed frames", async () => {
  const f = fixture("default-scheduler");
  try {
    const initial = f.renders();
    for (const value of [1, 2, 3]) {
      f.clock.dispatch(value);
      assertEquals(f.publishClock(`default-${value}`).status, "committed");
      await Promise.resolve();
      await Promise.resolve();
      assertEquals(f.clockValue(), value);
      assertEquals(f.renders(), initial);
    }
    f.studio.dispatch("edited");
    await Promise.resolve();
    await Promise.resolve();
    assertEquals(f.studioValue(), "edited");
    assert(f.renders()[1] > initial[1]);
  } finally { f.dispose(); }
});

Deno.test("manual scheduler keeps newer host-time action pending and preserves a pending transition projection", () => {
  const callbacks: Array<() => void> = [];
  const f = fixture("manual-scheduler", (commit) => callbacks.push(commit));
  const drain = () => {
    for (let count = 0; callbacks.length && count < 12; count++) callbacks.shift()!();
    assertEquals(callbacks.length, 0);
  };
  try {
    const initial = f.renders();
    f.clock.dispatch(1);
    assertEquals(f.publishClock("manual-one").status, "committed");
    drain();
    assertEquals(f.renders(), initial);

    f.host.onClockWrite = (value) => {
      if (value === 2) {
        f.host.onClockWrite = undefined;
        f.clock.dispatch(3);
      }
    };
    f.clock.dispatch(2);
    assertEquals(f.publishClock("manual-newer").status, "committed");
    assertEquals([f.clockValue(), f.clock.getState()], [2, 3]);
    drain();
    assertEquals(f.clockValue(), 3);

    f.studio.beginTransition("fork", [f.root.rootId]);
    f.studio.dispatch("slow", { kind: "transition", transitionId: "fork" });
    const forkProjection = f.studio.getStateForRoot(f.root.rootId);
    f.clock.dispatch(4);
    assertEquals(f.publishClock("manual-forked").status, "committed");
    assertEquals(f.studio.getStateForRoot(f.root.rootId), forkProjection);
    assert(f.studio.hasTransition("fork"));
  } finally { f.dispose(); }
});
