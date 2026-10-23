import { assert, assertEquals, assertStrictEquals, assertThrows } from "jsr:@std/assert";
import { createAsyncStore } from "./async_store_runtime.ts";
import { ComponentStateRoot, defineComponent, useStoreAt } from
  "./component_state_runtime.ts";
import { invalidateCompiledSemanticPlan, registerCompiledSemanticPlan } from
  "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, type MemoryNode } from "./vdom_snapshot_runtime.ts";

Deno.test("owned frame integration preserves generic progress and captured publication", () => {
  const file = "owned-frame/generic-progress.tsx", revision = "owned-frame-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: file,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const clock = createAsyncStore(0, (_: number, next: number) => next);
  const studio = createAsyncStore("old", (_: string, next: string) => next);
  const closedSite = `${file}#component:Closed`;
  const storeSite = `${closedSite}#store:0`;
  let closedRenders = 0, genericRenders = 0, writes = 0;
  const Closed = defineComponent(closedSite, (props: { clock: typeof clock }) => {
    closedRenders++;
    return jsx("output", { key: "clock", "data-phase": useStoreAt(storeSite, props.clock) });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 1, componentProgramId: closedSite, moduleRevision: revision,
    storeUseSiteId: storeSite, storeProp: "clock",
    host: { tag: "output", key: "clock", child: null,
      props: [["data-phase", { kind: "input", index: 0 }]] },
  } });
  const Generic = defineComponent(`${file}#component:Generic`, () => {
    genericRenders++;
    return jsx("output", { key: "studio", "data-value": useStoreAt(
      `${file}#component:Generic#store:0`, studio) });
  });
  class Host extends MemoryVDOMHost {
    onWrite: (() => void) | undefined;
    failAt = 0;
    override setProp(node: MemoryNode, name: string, value: unknown,
      previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name !== "data-phase") return;
      writes++;
      const callback = this.onWrite;
      this.onWrite = undefined;
      callback?.();
      if (writes === this.failAt) throw new Error("owned frame writer failed");
    }
  }
  const host = new Host(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container,
    { rootId: "owned-frame-generic-progress", scheduleCommit() {} });
  const nodes = () => container.children;
  try {
    root.mount([jsx(Closed, { key: "closed-owner", clock }), jsx(Generic, {})]);
    const target = nodes()[0], initialClosedRenders = closedRenders;
    clock.dispatch(1);
    assertEquals(root.flush(), true);
    assertStrictEquals(nodes()[0], target);
    assertEquals(target.props["data-phase"], 1);
    assertEquals(closedRenders, initialClosedRenders);
    const accepted = root.snapshot, saved = JSON.stringify(accepted);
    host.onWrite = () => {
      assertEquals(JSON.stringify(root.snapshot), saved);
      clock.dispatch(3);
      studio.dispatch("edited");
    };
    clock.dispatch(2);
    assertEquals(root.flush(), true);
    assertEquals(target.props["data-phase"], 2);
    assertEquals(JSON.stringify(accepted), saved);
    for (let attempt = 0; attempt < 3; attempt++) {
      root.flush();
      if (nodes()[1].props["data-value"] === "edited" &&
        target.props["data-phase"] === 3) break;
    }
    assertEquals(target.props["data-phase"], 3);
    assertEquals(nodes()[1].props["data-value"], "edited");
    assert(genericRenders > 1, "closed success starved the opaque Studio sibling");
    assertEquals(JSON.stringify(accepted), saved);
    const failedSnapshot = JSON.stringify(root.snapshot), failedVersion = root.publicationVersion;
    host.failAt = writes + 1;
    clock.dispatch(4);
    assertThrows(() => root.flush(), Error, "owned frame writer failed");
    assertEquals(root.publicationVersion, failedVersion);
    assertEquals(JSON.stringify(root.snapshot), failedSnapshot);
    assertThrows(() => root.flush(), Error);
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(file, revision);
  }
});
