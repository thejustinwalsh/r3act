import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { createAsyncStore } from "./async_store_runtime.ts";
import { AsyncResource } from "./async_resource_runtime.ts";
import { ComponentStateRoot, Suspense, defineComponent, useAt, useStoreAt } from "./component_state_runtime.ts";
import { registerCompiledSemanticPlan } from "./compiled_semantic_plan.ts";
import { jsx, type RuntimeNode } from "./jsx_binding_runtime.ts";
import { storeRecord } from "./owned_store_record.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const fixture = (suffix: string) => {
  const sourceFile = `frame-cache/${suffix}.tsx`;
  const revision = `frame-cache-${suffix}-v1`;
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
  const counters: Record<string, number> = {};
  const root = new ComponentStateRoot(host, container, {
    rootId: `frame-cache-${suffix}`, scheduleCommit() {},
    profileCounter: (frame) => {
      for (const [name, count] of Object.entries(frame)) {
        counters[name] = (counters[name] ?? 0) + count;
      }
    },
  });
  root.mount(jsx(Motion, { clock }));
  return { root, container, clock, counters, renders: () => renders };
};

Deno.test("ordinary owned frames reuse the mounted cache and preserve old pages", () => {
  const f = fixture("ordinary");
  try {
    const node = f.container.children[0];
    const old = f.root.snapshot;
    f.clock.dispatch(() => storeRecord({ phase: 1 }));
    assertEquals(f.root.flush(), true);
    const first = f.root.snapshot;
    f.clock.dispatch(() => storeRecord({ phase: 2 }));
    assertEquals(f.root.flush(), true);
    assertEquals(f.counters["store.owned-cache.reused"], 2);
    assertEquals(f.counters["store.owned-cache.cloned"] ?? 0, 0);
    assertStrictEquals(f.container.children[0], node);
    assertEquals(f.renders(), 1);
    assertEquals((old[0] as { props: Record<string, unknown> }).props["position-x"], 0);
    assertEquals((first[0] as { props: Record<string, unknown> }).props["position-x"], 1);
    assertEquals(node.props["position-x"], 2);
  } finally { f.root.dispose(); }
});

Deno.test("a second prepared cut keeps cache successors immutable", () => {
  const f = fixture("concurrent");
  try {
    f.clock.dispatch(() => storeRecord({ phase: 1 }));
    const stale = f.root.prepareStores([f.clock]);
    assert(stale);
    assert(stale.validate());
    assertEquals(f.root.flush(), true);
    assertEquals(f.counters["store.owned-cache.reused"] ?? 0, 0);
    assertEquals(f.counters["store.owned-cache.cloned"], 1);
    assertEquals(stale.validate(), false);
    stale.discard();
    f.clock.dispatch(() => storeRecord({ phase: 2 }));
    assertEquals(f.root.flush(), true);
    assertEquals(f.counters["store.owned-cache.reused"], 1);
    assertEquals(f.container.children[0].props["position-x"], 2);
  } finally { f.root.dispose(); }
});

Deno.test("parked descendant keeps accepted cache aliases isolated", async () => {
  const sourceFile = "frame-cache/parked.tsx";
  const revision = "frame-cache-parked-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {},
      execution_order: [] } });
  const clock = createAsyncStore(storeRecord({ phase: 0 }));
  const ready = new AsyncResource(Promise.resolve("healthy"));
  await Promise.resolve();
  const resource = createAsyncStore(ready,
    (_old: AsyncResource<string>, next: AsyncResource<string>) => next);
  const site = `${sourceFile}#component:Motion`;
  const useSite = `${site}#store:0`;
  const Motion = defineComponent(site,
    (props: { clock: typeof clock; children: RuntimeNode }) =>
      jsx("group", { key: "motion", "position-x":
        useStoreAt(useSite, props.clock).phase }, props.children),
  { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 6, componentProgramId: site, moduleRevision: revision,
    retainedChildProp: "children",
    inputs: [{ storeUseSiteId: useSite, storeProp: "clock", paths: [["phase"]] }],
    host: { tag: "group", key: "motion", child: null, props: [
      ["position-x", { kind: "input", index: 0 }],
    ] },
  }, closedStoreExecution: { schemaVersion: 3, kind: "owned-data",
    componentProgramId: site, moduleRevision: revision } });
  const Health = defineComponent(`${sourceFile}#component:Health`, () =>
    jsx("span", { key: "health" },
      useAt(`${sourceFile}#resource:0`, useStoreAt(
        `${sourceFile}#store:health`, resource)) as string));
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const counters: Record<string, number> = {};
  const root = new ComponentStateRoot(host, container, {
    rootId: "frame-cache-parked", scheduleCommit() {},
    profileCounter: (frame) => {
      for (const [name, count] of Object.entries(frame)) {
        counters[name] = (counters[name] ?? 0) + count;
      }
    },
  });
  const text = (node: MemoryNode): string => (node.text ?? "") +
    node.children.map(text).join("");
  try {
    root.mount(jsx(Motion, { key: "motion-owner", clock,
      children: jsx(Suspense, { key: "health-boundary",
        __nativeBoundarySite: "frame-cache-health-boundary",
        fallback: jsx("span", { key: "fallback" }, "loading"),
        children: jsx(Health, { key: "health-owner" }) }) }));
    const initial = root.snapshot;
    clock.dispatch(() => storeRecord({ phase: 1 }));
    assertEquals(root.flush(), true);
    assertEquals(counters["store.owned-cache.reused"], 1);
    let resolvePending!: (value: string) => void;
    resource.dispatch(new AsyncResource(new Promise<string>((resolve) => {
      resolvePending = resolve;
    })));
    root.flush();
    assertEquals(text(container.children[0].children[0]), "healthy");
    clock.dispatch(() => storeRecord({ phase: 2 }));
    const cut = root.prepareStores([clock]);
    assert(cut);
    assert(cut.validate());
    cut.commitHost();
    assert(cut.validatePostHost());
    cut.preparePublication();
    cut.publish();
    cut.runEffects();
    assertEquals(container.children[0].props["position-x"], 2);
    assertEquals(text(container.children[0].children[0]), "healthy");
    assertEquals((initial[0] as { props: Record<string, unknown> })
      .props["position-x"], 0);
    resolvePending("recovered");
    await Promise.resolve();
    root.flush();
    assertEquals(container.children[0].props["position-x"], 2);
    assertEquals(text(container.children[0].children[0]), "recovered");
  } finally { root.dispose(); }
});
