import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { createAsyncStore } from "./async_store_runtime.ts";
import { ComponentStateRoot, defineComponent, useStoreAt } from
  "./component_state_runtime.ts";
import { invalidateCompiledSemanticPlan, registerCompiledSemanticPlan } from
  "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { storeRecord } from "./owned_store_record.ts";
import { MemoryVDOMHost, type MemoryNode } from "./vdom_snapshot_runtime.ts";

Deno.test("Root batches alternating Store sources in each Store's host order", () => {
  const file = "compiled-store-batch/root.tsx", revision = "compiled-store-batch-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: file,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const left = createAsyncStore(storeRecord({ phase: 1 }),
    (_: Readonly<{ phase: number }>, next: number) => storeRecord({ phase: next }));
  const right = createAsyncStore(storeRecord({ phase: 1 }),
    (_: Readonly<{ phase: number }>, next: number) => storeRecord({ phase: next }));
  const genericStore = createAsyncStore("old", (_: string, next: string) => next);
  const site = `${file}#component:Motion`, storeSite = `${site}#store:0`;
  let renders = 0;
  const Motion = defineComponent(site, (props: { clock: typeof left }) => {
    renders++;
    return jsx("group", { key: "motion",
      "position-x": useStoreAt(storeSite, props.clock).phase });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 5, componentProgramId: site, moduleRevision: revision,
    inputs: [{ storeUseSiteId: storeSite, storeProp: "clock", paths: [["phase"]] }],
    host: { tag: "group", key: "motion", children: [], props: [
      ["position-x", { kind: "input", index: 0 }],
    ] },
  }, closedStoreExecution: { schemaVersion: 3, kind: "owned-data",
    componentProgramId: site, moduleRevision: revision,
    batchKernel: (shared: readonly number[], _varying: readonly number[],
      outputs: number[][], rowCount: number) => {
      for (let row = 0; row < rowCount; row++) outputs[row][0] = shared[0];
    },
  } });
  let genericRenders = 0;
  const Generic = defineComponent(`${file}#component:Generic`, () => {
    genericRenders++;
    return jsx("output", { key: "generic", "data-text": useStoreAt(
      `${file}#component:Generic#store:0`, genericStore) });
  });
  const counts = new Map<string, number>();
  class Host extends MemoryVDOMHost {
    writes: MemoryNode[] = [];
    onWrite: (() => void) | undefined;
    override setProp(node: MemoryNode, name: string, value: unknown,
      previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "position-x") {
        this.writes.push(node);
        this.onWrite?.();
      }
    }
  }
  const host = new Host(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "compiled-store-batch-root", scheduleCommit() {},
    profileCounter(batch) {
      for (const [name, value] of Object.entries(batch))
        counts.set(name, (counts.get(name) ?? 0) + value);
    },
  });
  try {
    const tree = () => jsx("group", { key: "scene" }, [
      ...[left, right, left, right]
        .map((clock, index) => jsx(Motion, { key: `motion-${index}`, clock })),
      jsx(Generic, { key: "generic-owner" }),
    ]);
    root.mount(tree());
    const nodes = [...container.children[0].children.slice(0, 4)];
    assertEquals(nodes.length, 4);
    assertEquals(renders, 4);
    counts.clear(); host.writes.length = 0;
    left.dispatch(2); right.dispatch(2);
    const before = root.snapshot, beforeText = JSON.stringify(before);
    const acceptedValues = () => {
      const scene = root.snapshot[0] as {
        children: readonly { props: Record<string, unknown> }[];
      };
      return scene.children.slice(0, 4).map(node => node.props["position-x"]);
    };
    host.onWrite = () => {
      const accepted = acceptedValues();
      assertEquals(accepted[0], accepted[2]);
      assertEquals(accepted[1], accepted[3]);
      const currentWriter = host.writes.at(-1);
      assert(currentWriter);
      const writerIndex = nodes.indexOf(currentWriter);
      assert(writerIndex >= 0);
      assertEquals(accepted[writerIndex], 1,
        "the Store pair being applied must retain its old accepted value");
    };
    assertEquals(root.flush(), true);
    host.onWrite = undefined;
    assertEquals(counts.get("store.batch.calls"), 2);
    assertEquals(counts.get("store.batch.rows"), 4);
    assertEquals(counts.get("store.scalar-kernel.calls") ?? 0, 0);
    assert((counts.get("store.owned-data.verified-rows") ?? 0) >= 4);
    assertEquals(host.writes.length, nodes.length);
    const leftWrites = host.writes.filter(node => node === nodes[0] || node === nodes[2]);
    const rightWrites = host.writes.filter(node => node === nodes[1] || node === nodes[3]);
    assertEquals(leftWrites.length, 2);
    assertEquals(rightWrites.length, 2);
    assertStrictEquals(leftWrites[0], nodes[0]);
    assertStrictEquals(leftWrites[1], nodes[2]);
    assertStrictEquals(rightWrites[0], nodes[1]);
    assertStrictEquals(rightWrites[1], nodes[3]);
    for (const [index, node] of nodes.entries()) {
      assertStrictEquals(node, container.children[0].children[index]);
      assertEquals(node.props["position-x"], 2);
    }
    assertEquals(JSON.stringify(before), beforeText);
    counts.clear(); host.writes.length = 0;
    left.dispatch(3);
    const admitted = JSON.stringify(root.snapshot);
    host.onWrite = () => {
      host.onWrite = undefined;
      assertEquals(JSON.stringify(root.snapshot), admitted);
      left.dispatch(4);
      genericStore.dispatch("edited");
    };
    assertEquals(root.flush(), true);
    assert((counts.get("store.batch.calls") ?? 0) >= 1);
    assert((counts.get("store.batch.rows") ?? 0) >= 2);
    assertEquals(counts.get("store.scalar-kernel.calls") ?? 0, 0);
    assertEquals(host.writes.length, 2);
    assertStrictEquals(host.writes[0], nodes[0]);
    assertStrictEquals(host.writes[1], nodes[2]);
    assertEquals(nodes.map(node => node.props["position-x"]), [3, 2, 3, 2]);
    for (let attempt = 0; attempt < 3; attempt++) {
      root.flush();
      if (nodes[0].props["position-x"] === 4 &&
        container.children[0].children[4].props["data-text"] === "edited") break;
    }
    assertEquals(nodes.map(node => node.props["position-x"]), [4, 2, 4, 2]);
    assertEquals(container.children[0].children[4].props["data-text"], "edited");
    assert(genericRenders > 1, "batch publication starved the generic Store sibling");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(file, revision);
  }
});
