import { assert, assertEquals, assertStrictEquals, assertThrows } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import { createAsyncStore, storeRecord, type AsyncStore } from "./async_store_runtime.ts";
import { ComponentStateRoot, Suspense, defineComponent, useAt, useStoreAt } from "./component_state_runtime.ts";
import { invalidateCompiledSemanticPlan, registerCompiledSemanticPlan } from "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const revision = "structured-store-projections-v1";
const frozen = (x: number, y: number, width: number) => storeRecord({
  position: storeRecord({ x, y }), outline: storeRecord({ width }),
});
type Geometry = ReturnType<typeof frozen>;
type GeometryStore = AsyncStore<Geometry, Geometry>;
const geometryStore = () => createAsyncStore(frozen(1, 2, 3), (_old: Geometry, next: Geometry) => next);
const cameraStore = () => createAsyncStore(storeRecord({ yaw: 4 }),
  (_old: Readonly<{ yaw: number }>, next: Readonly<{ yaw: number }>) => next);

const plus = (left: number, right: number) => ({ kind: "binary" as const,
  operator: "+" as const, left: { kind: "input" as const, index: left },
  right: { kind: "input" as const, index: right } });
const input = (index: number) => ({ kind: "input" as const, index });
const literal = (value: number) => ({ kind: "literal" as const, value });
const publish = (candidate: NonNullable<ReturnType<ComponentStateRoot<MemoryNode, MemoryNode>["prepareStores"]>>) => {
  assert(candidate.validate());
  candidate.commitHost();
  assert(candidate.validatePostHost());
  candidate.preparePublication(); candidate.publish(); candidate.runEffects();
};

function fixture(id: string, shared?: GeometryStore, hostOverride?: MemoryVDOMHost) {
  const sourceFile = `store-projections/${id}.tsx`;
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const geometry = shared ?? geometryStore();
  const camera = cameraStore();
  const status = createAsyncStore(1, (_old: number, next: number) => next);
  const health = new AsyncResource(new Promise<string>(() => {}));
  const host = hostOverride ?? new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: id, scheduleCommit() {} });
  const sceneId = `${sourceFile}#component:Scene`;
  let renders = 0;
  const Scene = defineComponent(sceneId,
    (props: { geometry: typeof geometry; camera: typeof camera }) => {
      renders++;
      const first = useStoreAt(`${sceneId}#store:0`, props.geometry);
      const view = useStoreAt(`${sceneId}#store:1`, props.camera);
      const again = useStoreAt(`${sceneId}#store:2`, props.geometry);
      return jsx("div", { key: "scene" }, [
        jsx("output", { key: "label", style: { opacity: first.outline.width / 10 } },
          first.position.x + view.yaw),
        jsx("group", { key: "group" }, [
          jsx("mesh", { key: "mesh", position: Object.freeze([
            first.position.x, first.position.y, view.yaw,
          ]) }),
          jsx("mesh", { key: "outline", position: Object.freeze([
            again.outline.width, first.position.x, 0,
          ]) }),
        ]),
      ]);
    }, { propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 5, componentProgramId: sceneId, moduleRevision: revision,
      inputs: [
        { storeUseSiteId: `${sceneId}#store:0`, storeProp: "geometry",
          paths: [["position", "x"], ["position", "y"], ["outline", "width"]] },
        { storeUseSiteId: `${sceneId}#store:1`, storeProp: "camera", paths: [["yaw"]] },
        { storeUseSiteId: `${sceneId}#store:2`, storeProp: "geometry",
          paths: [["outline", "width"]] },
      ],
      host: { tag: "div", key: "scene", props: [], children: [
        { kind: "host", host: { tag: "output", key: "label",
          props: [["style", { kind: "style", entries: [["opacity", {
            kind: "binary", operator: "/", left: input(2), right: literal(10),
          }]] }]], children: [{ kind: "text", expression: plus(0, 3) }] } },
        { kind: "host", host: { tag: "group", key: "group", props: [], children: [
          { kind: "host", host: { tag: "mesh", key: "mesh", props: [["position", {
            kind: "tuple", items: [input(0), input(1), input(3)],
          }]], children: [] } },
          { kind: "host", host: { tag: "mesh", key: "outline", props: [["position", {
            kind: "tuple", items: [input(4), input(0), literal(0)],
          }]], children: [] } },
        ] } },
      ] },
    } });
  const statusId = `${sourceFile}#component:Status`;
  const Status = defineComponent(statusId, (props: { store: typeof status }) =>
    jsx("output", { key: "status", "data-status":
      useStoreAt(`${statusId}#store:0`, props.store) }), {
    propOnlySites: [], closedStoreHostProgram: { schemaVersion: 1,
      componentProgramId: statusId, moduleRevision: revision,
      storeUseSiteId: `${statusId}#store:0`, storeProp: "store",
      host: { tag: "output", key: "status", child: null,
        props: [["data-status", input(0)]] } },
  });
  const Pending = defineComponent(`${sourceFile}#component:Pending`, () =>
    jsx("span", { key: "pending" }, useAt(`${sourceFile}#resource:0`, health)));
  const tree = () => jsx("section", {}, [
    jsx(Scene, { key: "scene-owner", geometry, camera }),
    jsx(Status, { key: "status-owner", store: status }),
    jsx(Suspense, { key: "pending-boundary",
      __nativeBoundarySite: `${sourceFile}#boundary:0`,
      fallback: jsx("span", { key: "waiting" }, "waiting"),
      children: jsx(Pending, { key: "pending-owner" }) }),
  ]);
  root.mount(tree());
  const scene = container.children[0].children[0];
  const label = scene.children[0];
  const group = scene.children[1];
  const mesh = group.children[0];
  const outline = group.children[1];
  return { sourceFile, geometry, camera, status, host, container, root, scene,
    label, group, mesh, outline, renders: () => renders, tree,
    dispose() { root.dispose(); } };
}

Deno.test("structured Store projections preserve a joint fixed tree beside pending health", () => {
  class ReentrantHost extends MemoryVDOMHost {
    onWrite: (() => void) | null = null;
    override setProp(node: MemoryNode, name: string, next: unknown, previous?: unknown) {
      super.setProp(node, name, next, previous);
      if (name === "position" && Array.isArray(next) && next[0] === 7) {
        this.onWrite?.();
      }
    }
  }
  const host = new ReentrantHost();
  const f = fixture("joint", undefined, host);
  try {
    const before = f.renders();
    assertEquals(f.geometry.diagnostics().readers, 2);
    f.geometry.dispatch(frozen(7, 8, 9));
    const stale = f.root.prepareStores([f.geometry]);
    assert(stale);
    f.camera.dispatch(storeRecord({ yaw: 5 }));
    assertEquals(stale.validate(), false);
    stale.discard();
    const cut = f.root.prepareStores([f.geometry]);
    assert(cut);
    f.status.dispatch(2);
    publish(f.root.prepareStores([f.status])!);
    assert(cut.validate(), "unrelated accepted Store cut invalidated the projection");
    host.onWrite = () => { host.onWrite = null; f.geometry.dispatch(frozen(11, 12, 13)); };
    publish(cut);
    assertStrictEquals(f.container.children[0].children[0], f.scene);
    assertStrictEquals(f.scene.children[0], f.label);
    assertStrictEquals(f.scene.children[1], f.group);
    assertStrictEquals(f.group.children[0], f.mesh);
    assertStrictEquals(f.group.children[1], f.outline);
    assertEquals(f.label.children[0].text, "12");
    assertEquals(f.label.props.style, { opacity: 0.9 });
    assertEquals(f.mesh.props.position, [7, 8, 5]);
    assertEquals(f.outline.props.position, [9, 7, 0]);
    assertEquals(f.geometry.getState(), frozen(11, 12, 13));
    assertEquals(f.container.children[0].children[1].props["data-status"], 2);
    assertEquals(f.container.children[0].children[2].children[0].text, "waiting");
    assertEquals(f.renders(), before);
    assertEquals(f.root.flush(), true);
    assertEquals(f.mesh.props.position, [11, 12, 5]);
    assertEquals(f.outline.props.position, [13, 11, 0]);
    assertEquals(f.renders(), before);
    f.geometry.dispatch(frozen(14, 15, 16));
    const revoked = f.root.prepareStores([f.geometry]);
    assert(revoked);
    invalidateCompiledSemanticPlan(f.sourceFile, revision);
    assertEquals(revoked.validate(), false);
    revoked.discard();
  } finally { f.dispose(); }
  assertEquals(f.geometry.diagnostics().roots, 0);
});

Deno.test("structured Store projections retain per-root frozen histories", () => {
  const shared = geometryStore();
  const a = fixture("fork-a", shared), b = fixture("fork-b", shared);
  const queue = new NativeRootWorkQueue();
  try {
    const oldA = a.root.snapshot, oldB = b.root.snapshot;
    const oldAImage = JSON.stringify(oldA);
    const oldBImage = JSON.stringify(oldB);
    shared.dispatch(frozen(4, 5, 6));
    const first = a.root.prepareStores([shared]);
    assert(first);
    first.commitHost();
    assertEquals(JSON.stringify(a.root.snapshot), oldAImage,
      "host work advanced accepted history before publication");
    assert(first.validatePostHost());
    first.preparePublication(); first.publish(); first.runEffects();
    assertEquals(a.mesh.props.position, [4, 5, 4]);
    assertEquals(b.mesh.props.position, [1, 2, 4]);
    assertEquals(JSON.stringify(b.root.snapshot), oldBImage,
      "accepting the first root changed the fork's accepted tree");
    assertEquals(JSON.stringify(oldA), oldAImage,
      "retained initial accepted tree changed after one fork published");
    shared.dispatch(frozen(7, 8, 9));
    const work = queue.enqueueStores({ id: "projection-forks", roots: [
      { root: a.root, stores: [shared] }, { root: b.root, stores: [shared] },
    ] });
    assertEquals(work.status, "committed");
    assertEquals(a.mesh.props.position, [7, 8, 4]);
    assertEquals(b.mesh.props.position, [7, 8, 4]);
    assertEquals(a.outline.props.position, [9, 7, 0]);
    assertEquals(b.outline.props.position, [9, 7, 0]);
    assertEquals(JSON.stringify(oldB), oldBImage,
      "retained fork history changed after grouped publication");
  } finally { queue.dispose(); a.dispose(); b.dispose(); }
  assertEquals(shared.diagnostics().roots, 0);
});

Deno.test("structured Store projection declines mutable and accessor state without invoking getters", () => {
  const f = fixture("unsupported");
  try {
    const mutable = { position: { x: 7, y: 8 }, outline: { width: 9 } };
    f.geometry.dispatch(mutable);
    assertEquals(f.root.prepareStores([f.geometry]), null);
    const ordinaryFrozen = Object.freeze({
      position: Object.freeze({ x: 7, y: 8 }),
      outline: Object.freeze({ width: 9 }),
    });
    f.geometry.dispatch(ordinaryFrozen);
    assertEquals(f.root.prepareStores([f.geometry]), null);
    let proxyGets = 0;
    const frozenProxy = new Proxy(frozen(7, 8, 9), {
      get(target, key, receiver) {
        proxyGets++;
        return Reflect.get(target, key, receiver);
      },
    });
    f.geometry.dispatch(frozenProxy);
    assertEquals(f.root.prepareStores([f.geometry]), null);
    assertEquals(proxyGets, 0, "closed capture invoked a frozen Proxy getter");
    let calls = 0;
    const position = Object.freeze({ x: 7, y: 8 });
    const accessor = Object.freeze({ position,
      get outline() { calls++; return Object.freeze({ width: 9 }); } });
    f.geometry.dispatch(accessor);
    assertEquals(f.root.prepareStores([f.geometry]), null);
    assertEquals(calls, 0);
    f.geometry.dispatch(frozen(7, 8, 9));
    const removed = f.root.prepareStores([f.geometry]);
    assert(removed);
    f.root.update(jsx("span", { key: "replacement" }, "gone"));
    assertEquals(removed.validate(), false);
    removed.discard();
  } finally { f.dispose(); }
});

Deno.test("partial structured Store writer failure leaves accepted state old", () => {
  class FailingHost extends MemoryVDOMHost {
    fail = false;
    readonly failure = new Error("partial projection write");
    override setProp(node: MemoryNode, name: string, next: unknown, previous?: unknown) {
      super.setProp(node, name, next, previous);
      if (this.fail && name === "position" && Array.isArray(next) && next[0] === 9) {
        throw this.failure;
      }
    }
  }
  const host = new FailingHost();
  const f = fixture("writer-failure", undefined, host);
  try {
    const retained = f.root.snapshot;
    const accepted = JSON.stringify(retained);
    const version = f.root.publicationVersion;
    f.geometry.dispatch(frozen(9, 8, 7));
    const cut = f.root.prepareStores([f.geometry]);
    assert(cut);
    host.fail = true;
    assertStrictEquals(assertThrows(() => cut.commitHost()), host.failure);
    assertEquals(f.root.publicationVersion, version);
    assertEquals(JSON.stringify(f.root.snapshot), accepted);
    assertEquals(JSON.stringify(retained), accepted,
      "partial host work mutated a retained accepted snapshot");
    assertThrows(() => f.root.prepareStores([f.geometry]));
  } finally { host.fail = false; f.dispose(); }
  assertEquals(f.geometry.diagnostics().roots, 0);
});
