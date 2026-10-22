import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { createAsyncStore } from "./async_store_runtime.ts";
import { ComponentStateRoot, defineComponent, useStoreAt } from "./component_state_runtime.ts";
import { registerCompiledSemanticPlan } from "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { storeRecord } from "./owned_store_record.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

Deno.test("compact Store output stays framed until a generic Root observation", () => {
  const sourceFile = "compact-output/owner.tsx";
  const revision = "compact-output-owner-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const clock = createAsyncStore(storeRecord({ phase: 0 }));
  const site = `${sourceFile}#component:Motion`;
  const useSite = `${site}#store:0`;
  let renders = 0;
  const Motion = defineComponent(site, (props: { clock: typeof clock }) => {
    renders++;
    return jsx("group", { key: "motion", name: "stable",
      "position-x": useStoreAt(useSite, props.clock).phase * 2 });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 5, componentProgramId: site, moduleRevision: revision,
    inputs: [{ storeUseSiteId: useSite, storeProp: "clock", paths: [["phase"]] }],
    host: { tag: "group", key: "motion", children: [], props: [
      ["name", { kind: "literal", value: "stable" }],
      ["position-x", { kind: "binary", operator: "*",
        left: { kind: "input", index: 0 }, right: { kind: "literal", value: 2 } }],
    ] },
  }, closedStoreExecution: { schemaVersion: 1, kind: "owned-data",
    componentProgramId: site, moduleRevision: revision } });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const reports: Record<string, number>[] = [];
  const root = new ComponentStateRoot(host, container, {
    rootId: "compact-output-root", scheduleCommit() {},
    profileCounter: (batch) => reports.push(batch),
  });
  const tree = jsx(Motion, { clock });
  const count = (name: string) => reports.reduce((sum, batch) =>
    sum + (batch[name] ?? 0), 0);
  try {
    root.mount(tree);
    const hostNode = container.children[0];
    reports.length = 0;
    clock.dispatch(() => storeRecord({ phase: 1 }));
    assertEquals(root.flush(), true);
    assertEquals(count("store.scalar-output.frames"), 2);
    assertEquals(count("store.scalar-output.root-materializations"), 0);
    assertEquals(count("store.scalar-output.prop-materializations"), 0);
    assertEquals(count("owner.component-renders"), 0);
    const accepted = root.snapshot;
    const saved = JSON.stringify(accepted);
    reports.length = 0;
    clock.dispatch(() => storeRecord({ phase: 2 }));
    assertEquals(root.flush(), true);
    assertEquals(count("store.scalar-output.frames"), 1);
    assertEquals(count("store.scalar-output.root-materializations"), 0);
    assertEquals(count("store.scalar-output.prop-materializations"), 0);
    assertStrictEquals(container.children[0], hostNode);
    assertEquals(hostNode.props["position-x"], 4);
    assertEquals(JSON.stringify(accepted), saved);
    reports.length = 0;
    root.render(tree);
    assert(count("store.scalar-output.root-materializations") > 0);
    assert(count("store.scalar-output.prop-materializations") > 0);
    assertStrictEquals(container.children[0], hostNode);
    assertEquals(renders, 2);
  } finally { root.dispose(); }
});
