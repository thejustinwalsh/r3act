import { assert, assertEquals } from "jsr:@std/assert";
import { createAsyncStore, type AsyncStore } from "./async_store_runtime.ts";
import {
  admitPreparedNativeGroup, claimPreparedNativeGroup,
  commitAdmittedNativeCandidate, ComponentStateRoot, defineComponent,
  prepareCanonicalNativeGroup, publishPreparedNativeGroup, useStoreAt,
} from "./component_state_runtime.ts";
import { registerCompiledSemanticPlan } from "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { storeRecord } from "./owned_store_record.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const revision = "owned-store-proof-v1";

function fixture(id: string, store: AsyncStore<number, number>) {
  const file = `owned-store-proof/${id}.tsx`;
  registerCompiledSemanticPlan({
    schema_version: 1, source_file: file, module_revision: revision,
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
  });
  const site = `${file}#component:Value`;
  const useSite = `${site}#store:0`;
  const Value = defineComponent(site, (props: { store: typeof store }) =>
    jsx("output", { key: "value", "data-value": useStoreAt(useSite, props.store) }), {
    propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 1, componentProgramId: site, moduleRevision: revision,
      storeUseSiteId: useSite, storeProp: "store",
      host: { tag: "output", key: "value", child: null,
        props: [["data-value", { kind: "input", index: 0 }]] },
    }, closedStoreExecution: { schemaVersion: 3, kind: "owned-data",
      componentProgramId: site, moduleRevision: revision },
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container,
    { rootId: id, scheduleCommit() {} });
  root.mount(jsx(Value, { key: "owner", store }));
  return { root, value: () => container.children[0].props["data-value"] };
}

function compactFixture(id: string,
  store: AsyncStore<Readonly<{ phase: number }>, number>) {
  const file = `owned-store-proof/${id}.tsx`;
  registerCompiledSemanticPlan({
    schema_version: 1, source_file: file, module_revision: revision,
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
  });
  const site = `${file}#component:Motion`, useSite = `${site}#store:0`;
  const Motion = defineComponent(site, (props: { store: typeof store }) =>
    jsx("group", { key: "motion", "position-x": useStoreAt(useSite, props.store).phase }), {
    propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 5, componentProgramId: site, moduleRevision: revision,
      inputs: [{ storeUseSiteId: useSite, storeProp: "store", paths: [["phase"]] }],
      host: { tag: "group", key: "motion", children: [],
        props: [["position-x", { kind: "input", index: 0 }]] },
    }, closedStoreExecution: { schemaVersion: 3, kind: "owned-data",
      componentProgramId: site, moduleRevision: revision },
  });
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container,
    { rootId: id, scheduleCommit() {} });
  root.mount(jsx(Motion, { key: "owner", store }));
  return { root, value: () => container.children[0].props["position-x"] };
}

Deno.test("legacy Store group retains conservative posthost preparation", () => {
  const store = createAsyncStore(0, (_old: number, next: number) => next);
  const first = fixture("first", store), second = fixture("second", store);
  let claim: ReturnType<typeof claimPreparedNativeGroup> | undefined;
  try {
    store.dispatch(1);
    const a = first.root.prepareStores([store]);
    const b = second.root.prepareStores([store]);
    assert(a && b);
    claim = claimPreparedNativeGroup([a, b]);
    assertEquals(claim.status, "claimed");
    assert(admitPreparedNativeGroup([a, b]));
    commitAdmittedNativeCandidate(a);
    commitAdmittedNativeCandidate(b);
    assert(a.validatePostHost() && b.validatePostHost());
    assertEquals(prepareCanonicalNativeGroup([a, b]), false);
    a.preparePublication();
    b.preparePublication();
    assert(a.validatePostHost() && b.validatePostHost());
    publishPreparedNativeGroup([a, b]);
    a.runEffects();
    b.runEffects();
    assertEquals([first.value(), second.value()], [1, 1]);
    assertEquals(store.getStateForRoot(first.root.rootId), 1);
    assertEquals(store.getStateForRoot(second.root.rootId), 1);
  } finally {
    if (claim?.status === "claimed") claim.release();
    first.root.dispose();
    second.root.dispose();
  }
  assertEquals(store.diagnostics().roots, 0);
});

Deno.test("overridden candidate preparation declines canonical group phase", () => {
  const store = createAsyncStore(storeRecord({ phase: 0 }),
    (_old: Readonly<{ phase: number }>, next: number) => storeRecord({ phase: next }));
  const f = compactFixture("custom-candidate", store);
  let claim: ReturnType<typeof claimPreparedNativeGroup> | undefined;
  try {
    store.dispatch(1);
    const candidate = f.root.prepareStores([store]);
    assert(candidate);
    claim = claimPreparedNativeGroup([candidate]);
    assertEquals(claim.status, "claimed");
    assert(admitPreparedNativeGroup([candidate]));
    commitAdmittedNativeCandidate(candidate);
    assert(candidate.validatePostHost());
    const original = candidate.preparePublication;
    let getterCalls = 0;
    Object.defineProperty(candidate, "preparePublication", {
      configurable: true,
      get() { getterCalls++; return original; },
    });
    assertEquals(prepareCanonicalNativeGroup([candidate]), false);
    assertEquals(getterCalls, 0);
    Object.defineProperty(candidate, "preparePublication", {
      configurable: true, writable: true, value: original,
    });
    assert(prepareCanonicalNativeGroup([candidate]));
    assert(candidate.validatePostHost());
    publishPreparedNativeGroup([candidate]);
    candidate.runEffects();
    assertEquals(f.value(), 1);
  } finally {
    if (claim?.status === "claimed") claim.release();
    f.root.dispose();
  }
});
