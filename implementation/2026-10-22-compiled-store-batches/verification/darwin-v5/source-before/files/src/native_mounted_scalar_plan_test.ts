import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { createAsyncStore } from "./async_store_runtime.ts";
import { ComponentStateRoot, defineComponent, useStoreAt } from "./component_state_runtime.ts";
import {
  invalidateCompiledSemanticPlan, registerCompiledSemanticPlan,
} from "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { storeRecord } from "./owned_store_record.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const registerPlan = (sourceFile: string, revision: string) =>
  registerCompiledSemanticPlan({
    schema_version: 1, source_file: sourceFile, module_revision: revision,
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
  });

Deno.test("bound scalar Store updates retain the literal and accepted snapshots", () => {
  const sourceFile = "mounted-scalar/root.tsx";
  const revision = "mounted-scalar-root-v1";
  registerPlan(sourceFile, revision);
  const clock = createAsyncStore(storeRecord({ phase: 0 }));
  const site = `${sourceFile}#component:Motion`;
  const useSite = `${site}#store:0`;
  let renders = 0;
  const Motion = defineComponent(site, (props: { clock: typeof clock }) => {
    renders++;
    const phase = useStoreAt(useSite, props.clock).phase;
    return jsx("group", { key: "motion", name: "anchor", "position-x": phase * 2 });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 5, componentProgramId: site, moduleRevision: revision,
    inputs: [{ storeUseSiteId: useSite, storeProp: "clock", paths: [["phase"]] }],
    host: { tag: "group", key: "motion", children: [], props: [
      ["name", { kind: "literal", value: "anchor" }],
      ["position-x", { kind: "binary", operator: "*",
        left: { kind: "input", index: 0 }, right: { kind: "literal", value: 2 } }],
    ] },
  }, closedStoreExecution: { schemaVersion: 1, kind: "owned-data",
    componentProgramId: site, moduleRevision: revision } });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const frames: Record<string, number>[] = [];
  const root = new ComponentStateRoot(host, container, {
    rootId: "mounted-scalar-root", scheduleCommit() {},
    profileCounter: (counters) => frames.push(counters),
  });
  try {
    root.mount(jsx(Motion, { clock }));
    const node = container.children[0];
    const initial = root.snapshot;
    clock.dispatch(() => storeRecord({ phase: 1 }));
    assertEquals(root.flush(), true);
    const first = root.snapshot;
    const allocatedAfterCold = frames.reduce((sum, frame) =>
      sum + (frame["store.bound-input.allocated-records"] ?? 0), 0);
    assertStrictEquals(container.children[0], node);
    assertEquals(node.props.name, "anchor");
    assertEquals(node.props["position-x"], 2);
    clock.dispatch(() => storeRecord({ phase: 2 }));
    assertEquals(root.flush(), true);
    const second = root.snapshot;
    assertStrictEquals(container.children[0], node);
    assertEquals(node.props["position-x"], 4);
    assertEquals(renders, 1);
    assertEquals((initial[0] as { props: Record<string, unknown> }).props["position-x"], 0);
    assertEquals((first[0] as { props: Record<string, unknown> }).props["position-x"], 2);
    assertEquals((second[0] as { props: Record<string, unknown> }).props["position-x"], 4);
    const total = (name: string) => frames.reduce((sum, frame) => sum + (frame[name] ?? 0), 0);
    assertEquals(total("store.bound-input.new-rows"), 1);
    assertEquals(total("store.bound-input.reused-rows"), 1);
    assertEquals(allocatedAfterCold, 1);
    assertEquals(total("store.bound-input.allocated-records"), 1);
    assertEquals(total("store.scalar-output.frames"), 3);
    assertEquals(total("store.scalar-output.root-materializations"), 0);
    assertEquals(total("store.mounted-scalar.cold-rows"), 1);
    assertEquals(total("store.mounted-scalar.warm-rows"), 1);
    for (const name of ["bucket-builds", "member-visits", "owner-index-visits", "owner-lookups"])
      assertEquals(total(`store.scalar-target.${name}`), 2);
    assert(invalidateCompiledSemanticPlan(sourceFile, revision));
    assertEquals((root.snapshot[0] as { props: Record<string, unknown> })
      .props["position-x"], 4);
  } finally { root.dispose(); }
});

Deno.test("independent roots keep separate bound Store histories", () => {
  const sourceFile = "mounted-scalar/roots.tsx";
  const revision = "mounted-scalar-roots-v1";
  registerPlan(sourceFile, revision);
  const clock = createAsyncStore(0, (_old: number, next: number) => next);
  const site = `${sourceFile}#component:Motion`;
  const useSite = `${site}#store:0`;
  let renders = 0;
  const Motion = defineComponent(site, (props: { clock: typeof clock }) => {
    renders++;
    return jsx("group", { key: "motion",
      "position-x": useStoreAt(useSite, props.clock) });
  },
  { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 1, componentProgramId: site, moduleRevision: revision,
    storeUseSiteId: useSite, storeProp: "clock",
    host: { tag: "group", key: "motion", child: null,
      props: [["position-x", { kind: "input", index: 0 }]] },
  }, closedStoreExecution: { schemaVersion: 1, kind: "owned-data",
    componentProgramId: site, moduleRevision: revision } });
  const hostA = new MemoryVDOMHost(), hostB = new MemoryVDOMHost();
  const containerA = hostA.createContainer(), containerB = hostB.createContainer();
  const rootA = new ComponentStateRoot(hostA, containerA,
    { rootId: "mounted-scalar-A", scheduleCommit() {} });
  const rootB = new ComponentStateRoot(hostB, containerB,
    { rootId: "mounted-scalar-B", scheduleCommit() {} });
  try {
    rootA.mount(jsx(Motion, { clock }));
    rootB.mount(jsx(Motion, { clock }));
    clock.dispatch(1);
    assertEquals(rootA.flush(), true);
    assertEquals(containerA.children[0].props["position-x"], 1);
    assertEquals(containerB.children[0].props["position-x"], 0);
    assertEquals(rootB.flush(), true);
    clock.dispatch(2);
    const held = rootA.prepareStores([clock]);
    assert(held);
    assertEquals(rootB.flush(), true);
    assert(held.validate());
    held.commitHost();
    assert(held.validatePostHost());
    held.preparePublication(); held.publish(); held.runEffects();
    assertEquals(containerA.children[0].props["position-x"], 2);
    assertEquals(containerB.children[0].props["position-x"], 2);
    assertEquals(renders, 2);
  } finally { rootA.dispose(); rootB.dispose(); }
});

Deno.test("two selected reader sites share a Store and retain exact warm coverage", () => {
  const sourceFile = "mounted-scalar/two-readers.tsx";
  const revision = "mounted-scalar-two-readers-v1";
  registerPlan(sourceFile, revision);
  const clock = createAsyncStore(storeRecord({ phase: 0 }));
  const site = `${sourceFile}#component:Motion`;
  const leftSite = `${site}#store:0`;
  const rightSite = `${site}#store:1`;
  let renders = 0;
  const Motion = defineComponent(site, (props: { clock: typeof clock }) => {
    renders++;
    const left = useStoreAt(leftSite, props.clock).phase;
    const right = useStoreAt(rightSite, props.clock).phase;
    return jsx("group", { key: "motion", "position-x": left + right });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 5, componentProgramId: site, moduleRevision: revision,
    inputs: [
      { storeUseSiteId: leftSite, storeProp: "clock", paths: [["phase"]] },
      { storeUseSiteId: rightSite, storeProp: "clock", paths: [["phase"]] },
    ],
    host: { tag: "group", key: "motion", children: [], props: [
      ["position-x", { kind: "binary", operator: "+",
        left: { kind: "input", index: 0 }, right: { kind: "input", index: 1 } }],
    ] },
  }, closedStoreExecution: { schemaVersion: 1, kind: "owned-data",
    componentProgramId: site, moduleRevision: revision } });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const reports: Record<string, number>[] = [];
  const root = new ComponentStateRoot(host, container, {
    rootId: "mounted-scalar-two-readers", scheduleCommit() {},
    profileCounter: (batch) => reports.push(batch),
  });
  const count = (name: string) => reports.reduce((sum, batch) =>
    sum + (batch[name] ?? 0), 0);
  try {
    root.mount(jsx(Motion, { clock }));
    reports.length = 0;
    clock.dispatch(() => storeRecord({ phase: 1 }));
    assertEquals(root.flush(), true);
    assertEquals(container.children[0].props["position-x"], 2);
    assertEquals(count("store.bound-input.allocated-records"), 2);
    reports.length = 0;
    clock.dispatch(() => storeRecord({ phase: 2 }));
    assertEquals(root.flush(), true);
    assertEquals(container.children[0].props["position-x"], 4);
    assertEquals(count("store.bound-input.allocated-records"), 0);
    assertEquals(count("store.bound-input.reused-rows"), 1);
    assertEquals(renders, 1);
  } finally { root.dispose(); }
});
