import { assert, assertEquals, assertThrows } from "jsr:@std/assert";
import { createAsyncStore, type AsyncStore } from "./async_store_runtime.ts";
import {
  admitPreparedNativeGroup, claimPreparedNativeGroup,
  ComponentStateRoot, defineComponent, useEffectAt, useStateAt, useStoreAt,
} from "./component_state_runtime.ts";
import { invalidateCompiledSemanticPlan, registerCompiledSemanticPlan } from "./compiled_semantic_plan.ts";
import { jsx, type RuntimeNode } from "./jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import { MemoryVDOMHost, type MemoryNode } from "./vdom_snapshot_runtime.ts";

const revision = "native-group-continuation-v1";

function fixture(id: string, store: AsyncStore<number, number>, host = new MemoryVDOMHost()) {
  const sourceFile = `native-group-continuation/${id}.tsx`;
  registerCompiledSemanticPlan({
    schema_version: 1, source_file: sourceFile, module_revision: revision,
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
  });
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: id, scheduleCommit() {} });
  const componentProgramId = `${sourceFile}#component:Value`;
  const storeUseSiteId = `${componentProgramId}#store:0`;
  const Value = defineComponent(componentProgramId,
    (props: { store: typeof store }) => jsx("output", {
      key: "value", "data-value": useStoreAt(storeUseSiteId, props.store),
    }), { propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 1, componentProgramId, moduleRevision: revision,
      storeUseSiteId, storeProp: "store",
      host: { tag: "output", key: "value", child: null,
        props: [["data-value", { kind: "input", index: 0 }]] },
    }, closedStoreExecution: { schemaVersion: 1, kind: "owned-data",
      componentProgramId, moduleRevision: revision } });
  root.mount(jsx(Value, { key: "owner", store }));
  return { root, host, container, sourceFile,
    value: () => container.children[0].props["data-value"],
    dispose: () => root.dispose() };
}

Deno.test("admitted later Store member keeps the captured cut after newer shared action", () => {
  const shared = createAsyncStore(0, (_old: number, action: number) => action);
  const first = fixture("newer-first", shared);
  const second = fixture("newer-second", shared);
  const original = first.host.setProp.bind(first.host);
  let newer = false;
  first.host.setProp = (node, name, value, previous) => {
    original(node, name, value, previous);
    if (!newer && name === "data-value" && value === 1) {
      newer = true;
      shared.dispatch(2);
    }
  };
  const queue = new NativeRootWorkQueue();
  try {
    const before = [first.root.publicationVersion, second.root.publicationVersion];
    shared.dispatch(1);
    const accepted = queue.enqueueStores({ id: "shared-captured", roots: [
      { root: first.root, stores: [shared] },
      { root: second.root, stores: [shared] },
    ] });
    assertEquals(accepted.status, "committed");
    assertEquals([first.value(), second.value(), shared.getState()], [1, 1, 2]);
    assertEquals([first.root.publicationVersion, second.root.publicationVersion],
      before.map((version) => version + 1));
    assert(JSON.stringify(first.root.snapshot).includes('"data-value":1'));
    assert(JSON.stringify(second.root.snapshot).includes('"data-value":1'));
    assert(shared.diagnostics().retainedActions > 0);
    const later = queue.enqueueStores({ id: "shared-newer", roots: [
      { root: first.root, stores: [shared] },
      { root: second.root, stores: [shared] },
    ] });
    assertEquals(later.status, "committed");
    assertEquals([first.value(), second.value()], [2, 2]);
  } finally { queue.dispose(); first.dispose(); second.dispose(); }
  assertEquals(shared.diagnostics().roots, 0);
});

Deno.test("strict admission rejects a newer Store action before any host write", () => {
  const shared = createAsyncStore(0, (_old: number, action: number) => action);
  const first = fixture("prewrite-first", shared);
  const second = fixture("prewrite-second", shared);
  try {
    shared.dispatch(1);
    const a = first.root.prepareStores([shared]);
    const b = second.root.prepareStores([shared]);
    assert(a && b);
    const claim = claimPreparedNativeGroup([a, b]);
    assertEquals(claim.status, "claimed");
    if (claim.status !== "claimed") throw new Error("host unexpectedly busy");
    try {
      shared.dispatch(2);
      assertEquals(admitPreparedNativeGroup([a, b]), false);
      assertEquals([first.value(), second.value()], [0, 0]);
    } finally { a.discard(); b.discard(); claim.release(); }
  } finally { first.dispose(); second.dispose(); }
});

Deno.test("later Store member retains captured local input and leaves newer input pending", () => {
  const sourceFile = "native-group-continuation/mixed.tsx";
  registerCompiledSemanticPlan({
    schema_version: 1, source_file: sourceFile, module_revision: revision,
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
  });
  const shared = createAsyncStore(0, (_old: number, action: number) => action);
  const site = `${sourceFile}#component:Motion`;
  const storeSite = `${site}#store:0`, stateSite = `${site}#state:0`;
  const effectSite = `${site}#effect:0`;
  const setters = new Map<string, (value: number) => boolean>();
  const Motion = defineComponent(site, (props: {
    label: string; clock: typeof shared; children: RuntimeNode;
  }) => {
    const clock = useStoreAt(storeSite, props.clock);
    const [offset, setOffset] = useStateAt(stateSite, 4);
    useEffectAt(effectSite, () => {
      setters.set(props.label, setOffset);
      return () => { setters.delete(props.label); };
    });
    return jsx("group", { key: "motion", "data-x": clock + offset }, props.children);
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 7, componentProgramId: site, moduleRevision: revision,
    inputs: [{ storeUseSiteId: storeSite, storeProp: "clock", paths: [[]] }],
    stateSites: [stateSite], effectSites: [effectSite],
    retainedChildProp: "children",
    host: { tag: "group", key: "motion", child: null, props: [
      ["data-x", { kind: "binary", operator: "+",
        left: { kind: "input", index: 0 }, right: { kind: "input", index: 1 } }],
    ] },
  }, closedStoreExecution: { schemaVersion: 1, kind: "owned-data",
    componentProgramId: site, moduleRevision: revision } });
  const firstHost = new MemoryVDOMHost(), secondHost = new MemoryVDOMHost();
  const firstContainer = firstHost.createContainer(), secondContainer = secondHost.createContainer();
  const first = new ComponentStateRoot(firstHost, firstContainer,
    { rootId: "mixed-first", scheduleCommit() {} });
  const second = new ComponentStateRoot(secondHost, secondContainer,
    { rootId: "mixed-second", scheduleCommit() {} });
  const tree = (label: string) => jsx(Motion, { label, clock: shared,
    children: jsx("mesh", { key: `${label}-child` }) });
  first.mount(tree("first")); second.mount(tree("second"));
  const original = firstHost.setProp.bind(firstHost);
  let interleaved = false;
  firstHost.setProp = (node, name, value, previous) => {
    original(node, name, value, previous);
    if (!interleaved && name === "data-x" && value === 5) {
      interleaved = true;
      shared.dispatch(2);
      assert(setters.get("second")?.(5));
    }
  };
  const queue = new NativeRootWorkQueue();
  try {
    shared.dispatch(1);
    const result = queue.enqueueStores({ id: "mixed-captured", roots: [
      { root: first, stores: [shared] }, { root: second, stores: [shared] },
    ] });
    assertEquals(result.status, "committed");
    assertEquals([firstContainer.children[0].props["data-x"],
      secondContainer.children[0].props["data-x"]], [5, 5]);
    assertEquals(shared.getState(), 2);
    assertEquals(second.flush(), true);
    assertEquals(secondContainer.children[0].props["data-x"], 7);
    assertEquals(first.flush(), true);
    assertEquals(firstContainer.children[0].props["data-x"], 6);
  } finally { queue.dispose(); first.dispose(); second.dispose(); }
});

Deno.test("later group member rejects writer replacement after first host write", () => {
  const shared = createAsyncStore(0, (_old: number, action: number) => action);
  const first = fixture("writer-first", shared);
  const second = fixture("writer-second", shared);
  const original = first.host.setProp.bind(first.host);
  const secondWriter = second.host.setProp.bind(second.host);
  first.host.setProp = (node, name, value, previous) => {
    original(node, name, value, previous);
    if (name === "data-value" && value === 1) {
      second.host.setProp = (target, prop, next, prior) =>
        secondWriter(target, prop, next, prior);
    }
  };
  const queue = new NativeRootWorkQueue();
  try {
    shared.dispatch(1);
    const result = queue.enqueueStores({ id: "writer-revoked", roots: [
      { root: first.root, stores: [shared] },
      { root: second.root, stores: [shared] },
    ] });
    assertEquals(result.status, "failed");
    assertEquals(second.value(), 0);
    assertThrows(() => first.root.prepareStores([shared]));
    assertThrows(() => second.root.prepareStores([shared]));
  } finally { queue.dispose(); first.dispose(); second.dispose(); }
});

Deno.test("later group member rejects owner removal, code retirement, and root disposal", () => {
  for (const kind of ["owner", "code", "lifetime"] as const) {
    const shared = createAsyncStore(0, (_old: number, action: number) => action);
    const first = fixture(`${kind}-first`, shared);
    const second = fixture(`${kind}-second`, shared);
    const original = first.host.setProp.bind(first.host);
    first.host.setProp = (node, name, value, previous) => {
      original(node, name, value, previous);
      if (name === "data-value" && value === 1) {
        if (kind === "code") invalidateCompiledSemanticPlan(second.sourceFile);
        else if (kind === "lifetime") second.root.dispose();
        else {
          const rootOwner = second.root.world.findOwner(null,
            `@component-root:${second.root.rootId}`);
          assert(rootOwner !== undefined);
          const owner = second.root.world.findOwner(rootOwner,
            `${second.sourceFile}#component:Value`, "owner");
          assert(owner !== undefined);
          assert(second.root.world.destroyOwner(owner));
        }
      }
    };
    const queue = new NativeRootWorkQueue();
    try {
      shared.dispatch(1);
      const result = queue.enqueueStores({ id: `${kind}-revoked`, roots: [
        { root: first.root, stores: [shared] },
        { root: second.root, stores: [shared] },
      ] });
      assertEquals(result.status, "failed");
      assertThrows(() => first.root.prepareStores([shared]));
    } finally { queue.dispose(); first.dispose(); second.dispose(); }
  }
});

Deno.test("host reflection retirement during continuation cannot enter later writer", () => {
  const shared = createAsyncStore(0, (_old: number, action: number) => action);
  const first = fixture("reflection-first", shared);
  class CountingHost extends MemoryVDOMHost {
    writes = 0;
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      this.writes++;
      super.setProp(node, name, value, previous);
    }
  }
  const target = new CountingHost();
  let armed = false, trapped = false;
  let second!: ReturnType<typeof fixture>;
  const proxy = new Proxy(target, {
    getOwnPropertyDescriptor(host, name) {
      if (armed && name === "setProp") {
        armed = false;
        trapped = true;
        invalidateCompiledSemanticPlan(second.sourceFile);
      }
      return Reflect.getOwnPropertyDescriptor(host, name);
    },
  });
  second = fixture("reflection-second", shared, proxy);
  const writesBefore = target.writes;
  const original = first.host.setProp.bind(first.host);
  first.host.setProp = (node, name, value, previous) => {
    original(node, name, value, previous);
    if (name === "data-value" && value === 1) armed = true;
  };
  const queue = new NativeRootWorkQueue();
  try {
    shared.dispatch(1);
    const result = queue.enqueueStores({ id: "reflection-retired", roots: [
      { root: first.root, stores: [shared] },
      { root: second.root, stores: [shared] },
    ] });
    assertEquals(result.status, "failed");
    assert(trapped);
    assertEquals(target.writes, writesBefore);
    assertEquals(second.value(), 0);
  } finally { queue.dispose(); first.dispose(); second.dispose(); }
});
