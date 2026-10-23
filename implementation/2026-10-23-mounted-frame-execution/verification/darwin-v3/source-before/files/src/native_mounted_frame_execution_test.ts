import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { createAsyncStore } from "./async_store_runtime.ts";
import { ComponentStateRoot, defineComponent, useStoreAt } from "./component_state_runtime.ts";
import { registerCompiledSemanticPlan } from "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { storeRecord } from "./owned_store_record.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

Deno.test("discarded mounted cut leaves binding uninstalled and reentry repairs selection", () => {
  const sourceFile = "mounted-frame/reentry.tsx";
  const revision = "mounted-frame-reentry-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {},
      execution_order: [] } });
  const clock = createAsyncStore(storeRecord({ phase: 0 }));
  const site = `${sourceFile}#component:Motion`;
  const useSite = `${site}#store:0`;
  let renders = 0;
  const Motion = defineComponent(site, (props: { clock: typeof clock }) => {
    renders++;
    return jsx("group", { key: "motion", "position-x":
      useStoreAt(useSite, props.clock).phase });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 5, componentProgramId: site, moduleRevision: revision,
    inputs: [{ storeUseSiteId: useSite, storeProp: "clock", paths: [["phase"]] }],
    host: { tag: "group", key: "motion", children: [], props: [
      ["position-x", { kind: "input", index: 0 }],
    ] },
  }, closedStoreExecution: { schemaVersion: 3, kind: "owned-data",
    componentProgramId: site, moduleRevision: revision } });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container,
    { rootId: "mounted-frame-reentry", scheduleCommit() {} });
  try {
    root.mount(jsx(Motion, { clock }));
    const mounted = container.children[0];
    clock.dispatch(() => storeRecord({ phase: 1 }));
    const discarded = root.prepareStores([clock]);
    assert(discarded);
    assert(discarded.validate());
    discarded.discard();
    assertStrictEquals(container.children[0], mounted);
    assertEquals(mounted.props["position-x"], 0);

    clock.dispatch(() => storeRecord({ phase: 2 }));
    const accepted = root.prepareStores([clock]);
    assert(accepted);
    assert(accepted.validate());
    accepted.commitHost();
    assert(accepted.validatePostHost());
    accepted.preparePublication();
    accepted.publish();
    accepted.runEffects();
    assertStrictEquals(container.children[0], mounted);
    assertEquals(mounted.props["position-x"], 2);
    assertEquals((root.snapshot[0] as { props: Record<string, unknown> })
      .props["position-x"], 2);

    root.update(jsx("span", { key: "replacement" }, "retired"));
    root.update(jsx(Motion, { clock }));
    clock.dispatch(() => storeRecord({ phase: 3 }));
    assertEquals(root.flush(), true);
    assertEquals(container.children[0].props["position-x"], 3);
    assertEquals(renders, 2);
  } finally { root.dispose(); }
});
