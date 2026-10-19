import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import { createAsyncStore, type AsyncStore } from "./async_store_runtime.ts";
import { ComponentStateRoot, Suspense, defineComponent, useAt, useStoreAt } from "./component_state_runtime.ts";
import { registerCompiledSemanticPlan } from "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const revision = "store-host-values-v1";
const plan = (sourceFile: string) => ({
  schema_version: 1 as const, source_file: sourceFile, module_revision: revision,
  owners: [], sources: [], sinks: [], operations: [],
  graph: { coverage: "proven-sinks-only" as const, source_to_sinks: {}, execution_order: [] },
});

function fixture(id: string, shared?: AsyncStore<number, number>, hostOverride?: MemoryVDOMHost) {
  const sourceFile = `store-host-values/${id}.tsx`;
  registerCompiledSemanticPlan(plan(sourceFile));
  const position = shared ?? createAsyncStore(1, (_old: number, next: number) => next);
  const camera = createAsyncStore(2, (_old: number, next: number) => next);
  const health = new AsyncResource(new Promise<string>(() => {}));
  const host = hostOverride ?? new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: id, scheduleCommit() {} });
  let renders = 0;
  const idDom = `${sourceFile}#component:Dom`;
  const idThree = `${sourceFile}#component:Three`;
  const Dom = defineComponent(idDom, (props: { position: typeof position; camera: typeof camera }) => {
    renders++;
    const x = useStoreAt(`${idDom}#store:0`, props.position);
    const y = useStoreAt(`${idDom}#store:1`, props.camera);
    return jsx("output", { key: "dom-host", style: { color: "red", opacity: (x + y) / 10 } });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 3, componentProgramId: idDom, moduleRevision: revision,
    inputs: [
      { storeUseSiteId: `${idDom}#store:0`, storeProp: "position" },
      { storeUseSiteId: `${idDom}#store:1`, storeProp: "camera" },
    ], host: { tag: "output", key: "dom-host", child: null, props: [["style", {
      kind: "style", entries: [["color", { kind: "literal", value: "red" }],
        ["opacity", { kind: "binary", operator: "/", left: {
          kind: "binary", operator: "+", left: { kind: "input", index: 0 },
          right: { kind: "input", index: 1 },
        }, right: { kind: "literal", value: 10 } }]],
    }]] },
  } });
  const Three = defineComponent(idThree, (props: { position: typeof position }) => {
    renders++;
    const x = useStoreAt(`${idThree}#store:0`, props.position);
    return jsx("mesh", { key: "three-host", position: Object.freeze([x, 2, 3]) });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 3, componentProgramId: idThree, moduleRevision: revision,
    inputs: [{ storeUseSiteId: `${idThree}#store:0`, storeProp: "position" }],
    host: { tag: "mesh", key: "three-host", child: null, props: [["position", {
      kind: "tuple", items: [{ kind: "input", index: 0 },
        { kind: "literal", value: 2 }, { kind: "literal", value: 3 }],
    }]] },
  } });
  const Health = defineComponent(`${id}:health`, () =>
    jsx("span", { key: "health" }, useAt(`${id}:resource`, health)));
  root.mount(jsx("section", {}, [
    jsx(Dom, { key: "dom-owner", position, camera }),
    jsx(Three, { key: "three-owner", position }),
    jsx(Suspense, { key: "health-boundary", __nativeBoundarySite: `${id}:boundary`,
      fallback: jsx("span", { key: "waiting" }, "waiting"),
      children: jsx(Health, { key: "health-owner" }) }),
  ]));
  const dom = container.children[0].children[0];
  const three = container.children[0].children[1];
  return { root, position, camera, container, dom, three, renders: () => renders,
    dispose() { root.dispose(); } };
}

Deno.test("structured Store cut updates joint style and stable tuple beside pending resource", () => {
  const f = fixture("joint");
  try {
    const before = f.renders();
    f.position.dispatch(4);
    const cut = f.root.prepareStores([f.position]);
    assert(cut);
    f.camera.dispatch(5);
    assertEquals(cut.validate(), false, "joint dependency did not stale the cut");
    cut.discard();
    const fresh = f.root.prepareStores([f.position]);
    assert(fresh);
    assert(fresh.validate());
    fresh.commitHost();
    assert(fresh.validatePostHost());
    fresh.preparePublication(); fresh.publish(); fresh.runEffects();
    assertStrictEquals(f.container.children[0].children[0], f.dom);
    assertStrictEquals(f.container.children[0].children[1], f.three);
    assertEquals(f.dom.props.style, { color: "red", opacity: 0.9 });
    assertEquals(f.three.props.position, [4, 2, 3]);
    assertEquals(f.renders(), before);
    assertEquals(f.container.children[0].children[2].children[0].text, "waiting");
    f.position.dispatch(6);
    assertEquals(f.root.flush(), true);
    assertEquals(f.three.props.position, [6, 2, 3]);
  } finally { f.dispose(); }
  assertEquals(f.position.diagnostics().roots, 0);
});

Deno.test("structured Store group preserves independent fork histories", () => {
  const shared = createAsyncStore(1, (_old: number, next: number) => next);
  const a = fixture("fork-a", shared), b = fixture("fork-b", shared);
  const queue = new NativeRootWorkQueue();
  try {
    shared.dispatch(3);
    const onlyA = a.root.prepareStores([shared]);
    assert(onlyA);
    onlyA.commitHost();
    assert(onlyA.validatePostHost());
    onlyA.preparePublication(); onlyA.publish(); onlyA.runEffects();
    assertEquals(a.three.props.position, [3, 2, 3]);
    assertEquals(b.three.props.position, [1, 2, 3]);
    shared.dispatch(7);
    const grouped = queue.enqueueStores({ id: "structured-group", roots: [
      { root: a.root, stores: [shared] }, { root: b.root, stores: [shared] },
    ] });
    assertEquals(grouped.status, "committed");
    assertEquals(a.three.props.position, [7, 2, 3]);
    assertEquals(b.three.props.position, [7, 2, 3]);
  } finally { queue.dispose(); a.dispose(); b.dispose(); }
  assertEquals(shared.diagnostics().roots, 0);
});

Deno.test("newer Store action during a structured host write remains pending", () => {
  class ReentrantHost extends MemoryVDOMHost {
    onWrite: (() => void) | null = null;
    override setProp(node: ReturnType<MemoryVDOMHost["createContainer"]>,
      name: string, next: unknown, previous?: unknown) {
      super.setProp(node, name, next, previous);
      if (name === "position" && Array.isArray(next) && next[0] === 4) {
        this.onWrite?.();
      }
    }
  }
  const host = new ReentrantHost();
  const f = fixture("reentrant", undefined, host);
  try {
    f.position.dispatch(4);
    const cut = f.root.prepareStores([f.position]);
    assert(cut, "structured reentrant setup declined");
    host.onWrite = () => { host.onWrite = null; f.position.dispatch(5); };
    assert(cut.validate());
    cut.commitHost();
    assert(cut.validatePostHost());
    cut.preparePublication(); cut.publish(); cut.runEffects();
    assertEquals(f.three.props.position, [4, 2, 3]);
    assertEquals(f.position.getState(), 5);
    assertEquals(f.root.flush(), true);
    assertEquals(f.three.props.position, [5, 2, 3]);
  } finally { f.dispose(); }
  assertEquals(f.position.diagnostics().roots, 0);
});
