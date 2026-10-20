import { assert, assertEquals, assertStrictEquals, assertThrows } from "jsr:@std/assert";
import { createAsyncStore, type AsyncStore } from "./async_store_runtime.ts";
import {
  bindStatePropAt,
  ComponentStateRoot,
  defineComponent,
  renderCollectionAt,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { registerCompiledSemanticPlan, type CompiledSemanticPlan } from "./compiled_semantic_plan.ts";
import { createKeyedCollection } from "./keyed_collection.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import type { StateCellHandle } from "./owner_state_world.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

type NumericStore = AsyncStore<number, number>;
const revision = "joint-store-input-v1";
const store = (initial: number): NumericStore =>
  createAsyncStore(initial, (_old: number, next: number) => next);
const plan = (sourceFile: string): CompiledSemanticPlan => ({
  schema_version: 1, source_file: sourceFile, module_revision: revision,
  owners: [], sources: [], sinks: [], operations: [],
  graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
});

type FixtureOptions = {
  position?: NumericStore;
  camera?: NumericStore;
  host?: MemoryVDOMHost;
  cameraOnlyOpaque?: boolean;
  omitCameraRead?: boolean;
};
function fixture(id: string, options: FixtureOptions = {}) {
  const sourceFile = `joint-input/${id}.tsx`;
  registerCompiledSemanticPlan(plan(sourceFile));
  const position = options.position ?? store(1);
  const camera = options.camera ?? store(2);
  const rows = createKeyedCollection(["a", "b", "c"], (key) => key);
  const host = options.host ?? new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: id, scheduleCommit() {} });
  const handles = new Map<string, StateCellHandle>();
  const unsubscribe = root.world.subscribeDirtyCells((handle) => handles.set(handle.site, handle));
  let setWorld!: (value: number) => boolean;
  const renders = { joint: 0, row: 0, cameraOnly: 0 };
  const jointProgramId = `${sourceFile}#component:Joint`;
  const positionSite = `${jointProgramId}#store:0`;
  const cameraSite = `${jointProgramId}#store:1`;
  const Joint = defineComponent(jointProgramId, (props: { position: NumericStore; camera: NumericStore }) => {
    renders.joint++;
    const x = useStoreAt(positionSite, props.position);
    const y = options.omitCameraRead ? 2 : useStoreAt(cameraSite, props.camera);
    return jsx("output", { key: "joint-host", "data-value": x + y });
  }, {
    propOnlySites: [],
    closedStoreHostProgram: {
      schemaVersion: 2, componentProgramId: jointProgramId, moduleRevision: revision,
      inputs: [
        { storeUseSiteId: positionSite, storeProp: "position" },
        { storeUseSiteId: cameraSite, storeProp: "camera" },
      ],
      host: { tag: "output", key: "joint-host", child: null,
        props: [["data-value", { kind: "binary", operator: "+",
          left: { kind: "input", index: 0 }, right: { kind: "input", index: 1 } }]] },
    },
  });
  const Row = defineComponent(`${id}:row`, (props: { row: string }) => {
    renders.row++;
    return jsx("li", { "data-id": props.row },
      props.row === "a" ? jsx(Joint, { key: "joint-owner", position, camera }) : props.row);
  });
  const List = defineComponent(`${id}:list`, () => jsx("ul", {},
    renderCollectionAt(`${id}:rows`, rows, (row) => jsx(Row, { row }))));
  const worldProgramId = `${id}:world`;
  const World = defineComponent(worldProgramId, () => {
    const [, setter] = useStateAt("world-value", 0);
    setWorld = setter;
    return jsx("output", { key: "world-host", "data-world": bindStatePropAt(
      "world-value", (value) => value, {
        schemaVersion: 2, ownerProgramId: worldProgramId, sinkId: "world",
        sourceSites: ["world-value"], closedExpression: { kind: "input", index: 0 },
      }) });
  }, { propOnlySites: ["world-value"], stateLayout: { schemaVersion: 1,
    programId: worldProgramId, slots: [{ siteId: "world-value", slot: 0 }] } });
  const CameraOnly = defineComponent(`${id}:camera-only`, () => {
    renders.cameraOnly++;
    return jsx("span", { key: "camera-only" }, String(useStoreAt(`${id}:camera-opaque`, camera)));
  });
  const tree = jsx("section", {}, [jsx(List, { key: "list" }), jsx(World, { key: "world" }),
    ...(options.cameraOnlyOpaque ? [jsx(CameraOnly, { key: "camera-only-owner" })] : [])]);
  root.mount(tree);
  const section = container.children[0];
  const jointNode = () => section.children[0].children.find((row) => row.props["data-id"] === "a")?.children[0];
  return {
    id, position, camera, rows, root, host, container, renders,
    jointNode, jointValue: () => jointNode()?.props["data-value"],
    reconcile() { root.update(tree); },
    worldValue: () => section.children[1].props["data-world"],
    order: () => section.children[0].children.map((row) => row.props["data-id"]),
    setWorld(value: number) {
      assert(setWorld(value));
      const handle = handles.get("world-value");
      assert(handle);
      return handle;
    },
    moveA() { assert(rows.apply(rows.version, [{ type: "move", key: "a", beforeKey: null }]).ok); },
    remove(key: string) { assert(rows.apply(rows.version, [{ type: "remove", key }]).ok); },
    dispose() { unsubscribe(); root.dispose(); },
  };
}
function publish(candidate: NonNullable<ReturnType<ComponentStateRoot<MemoryNode, MemoryNode>["prepareTransaction"]>>) {
  assert(candidate.validate());
  candidate.commitHost();
  assert(candidate.validatePostHost());
  candidate.preparePublication();
  candidate.publish();
  candidate.runEffects();
}

Deno.test("joint Store input, World writer, and moved collection share one accepted revision", () => {
  const f = fixture("all-three", { cameraOnlyOpaque: true });
  try {
    const jointHost = f.jointNode();
    const before = { ...f.renders };
    const cell = f.setWorld(5);
    f.position.dispatch(7);
    f.moveA();
    f.remove("b");
    const version = f.root.publicationVersion;
    const cut = f.root.prepareTransaction({ cells: [cell], collections: [f.rows], stores: [f.position] });
    assert(cut, "declared joint cut was declined");
    publish(cut);
    assertEquals(f.root.publicationVersion, version + 1);
    assertEquals(f.order(), ["c", "a"]);
    assertStrictEquals(f.jointNode(), jointHost);
    assertEquals([f.jointValue(), f.worldValue()], [9, 5]);
    assertEquals(f.renders, before, "joint cut replayed authored components");
    assertEquals(f.root.diagnostics().pendingChangeCount, 0);
    assertEquals(f.camera.diagnostics().readers, 2, "camera-only accepted reader was swallowed");
    f.reconcile();
    assertEquals([f.jointValue(), f.worldValue()], [9, 5],
      "generic reconciliation resurrected the moved row's old nested Store output");
    assertStrictEquals(f.jointNode(), jointHost);
    assertEquals(f.order(), ["c", "a"]);
  } finally { f.dispose(); }
});

Deno.test("scoped move preserves an unselected row's pending numeric history", () => {
  const id = "joint-unselected-row-history";
  const rows = createKeyedCollection(["a", "b"], (key) => key);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: id, scheduleCommit() {} });
  const rowProgramId = `${id}:row`;
  let setA!: (value: number) => boolean;
  const Row = defineComponent(rowProgramId, ({ row }: { row: string }) => {
    const [, setter] = useStateAt("value", 1);
    if (row === "a") setA = setter;
    return jsx("li", { "data-id": row, "data-value": bindStatePropAt("value", (value) => value, {
      schemaVersion: 2, ownerProgramId: rowProgramId, sinkId: "value",
      sourceSites: ["value"], closedExpression: { kind: "input", index: 0 },
    }) });
  }, { propOnlySites: ["value"], stateLayout: { schemaVersion: 1,
    programId: rowProgramId, slots: [{ siteId: "value", slot: 0 }] } });
  const List = defineComponent(`${id}:list`, () => jsx("ul", {},
    renderCollectionAt(`${id}:rows`, rows, (row) => jsx(Row, { row }))));
  root.mount(jsx(List, {}));
  const rowA = () => container.children[0].children.find((node) => node.props["data-id"] === "a");
  const acceptedNode = rowA();
  try {
    assertEquals(rowA()?.props["data-value"], 1);
    assert(setA(2));
    assert(rows.apply(rows.version, [{ type: "move", key: "a", beforeKey: null }]).ok);
    const move = root.prepareTransaction({ cells: [], collections: [rows], stores: [] });
    assert(move);
    publish(move);
    assertStrictEquals(rowA(), acceptedNode);
    assertEquals(rowA()?.props["data-value"], 1);
    assertEquals(root.diagnostics().pendingChangeCount, 1);
    root.flush();
    assertEquals(rowA()?.props["data-value"], 2,
      "the move must not mark an unselected numeric value accepted");
    assertEquals(root.diagnostics().pendingChangeCount, 0);
    assert(setA(1));
    root.flush();
    assertEquals(rowA()?.props["data-value"], 1);
  } finally { root.dispose(); }
});

Deno.test("same-key row owner replacement initializes its new numeric history", () => {
  const id = "joint-replaced-row-history";
  type RowValue = { id: string; initial: number };
  const rows = createKeyedCollection<RowValue>([{ id: "a", initial: 1 }], (row) => row.id);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: id, scheduleCommit() {} });
  const renders = { list: 0, row: 0 };
  let setRow!: (value: number) => boolean;
  const programId = `${id}:row`;
  const Row = defineComponent(programId, ({ row }: { row: RowValue }) => {
    renders.row++;
    const [, setter] = useStateAt("value", row.initial);
    setRow = setter;
    return jsx("li", { "data-id": row.id, "data-value": bindStatePropAt(
      "value", (value) => value, {
        schemaVersion: 2, ownerProgramId: programId, sinkId: "value",
        sourceSites: ["value"], closedExpression: { kind: "input", index: 0 },
      }) });
  }, { propOnlySites: ["value"], stateLayout: { schemaVersion: 1,
    programId, slots: [{ siteId: "value", slot: 0 }] } });
  const List = defineComponent(`${id}:list`, () => {
    renders.list++;
    return jsx("ul", {}, renderCollectionAt(`${id}:rows`, rows,
      (value) => jsx(Row, { key: value.id, row: value })));
  });
  root.mount(jsx(List, {}));
  const output = () => container.children[0].children[0].props["data-value"];
  try {
    assertEquals(output(), 1);
    const oldHost = container.children[0].children[0];
    const oldSetter = setRow;
    assert(rows.apply(rows.version, [
      { type: "remove", key: "a" },
      { type: "insert", key: "a", value: { id: "a", initial: 7 }, beforeKey: null },
    ]).ok);
    const replacement = root.preparePending({ renderPreparation: "repeatable" });
    assert(replacement, "same-key row replacement did not prepare");
    assertEquals(renders.list, 1, "replacement fell back to whole-list rendering");
    publish(replacement);
    assertEquals(output(), 7);
    assert(container.children[0].children[0] !== oldHost && setRow !== oldSetter,
      "same-key remove and insert reused the retired row incarnation");
    assertEquals(renders.row, 2);
    assert(setRow(8));
    assertEquals(root.flush(), true);
    assertEquals(output(), 8);
    assertEquals(renders.row, 2,
      "missing new-owner numeric history forced authored row rendering");
    assertEquals(root.diagnostics().pendingChangeCount, 0);
  } finally { root.dispose(); }
});

Deno.test("camera input is required but camera-only opaque consumer is outside selection", () => {
  const f = fixture("camera-dependency", { cameraOnlyOpaque: true });
  try {
    f.position.dispatch(4);
    const cut = f.root.prepareTransaction({ cells: [], collections: [], stores: [f.position] });
    assert(cut, "camera-only opaque consumer blocked selected position");
    f.camera.dispatch(8);
    assertEquals(cut.validate(), false, "camera dependency changed without staling the prepared cut");
    cut.discard();
    const fresh = f.root.prepareTransaction({ cells: [], collections: [], stores: [f.position] });
    assert(fresh);
    publish(fresh);
    assertEquals(f.jointValue(), 12);
  } finally { f.dispose(); }
});

Deno.test("joint Store and World or Store and collection cuts allow empty third input", () => {
  const f = fixture("two-way-joint");
  try {
    const cell = f.setWorld(4);
    f.position.dispatch(5);
    const valueCut = f.root.prepareTransaction({ cells: [cell], collections: [], stores: [f.position] });
    assert(valueCut);
    publish(valueCut);
    assertEquals([f.jointValue(), f.worldValue()], [7, 4]);

    f.position.dispatch(6);
    f.moveA();
    const orderCut = f.root.prepareTransaction({ cells: [], collections: [f.rows], stores: [f.position] });
    assert(orderCut);
    publish(orderCut);
    assertEquals([f.jointValue(), f.worldValue()], [8, 4]);
    assertEquals(f.order(), ["b", "c", "a"]);
  } finally { f.dispose(); }
});

Deno.test("missing accepted joint input footprint and selected row removal decline", () => {
  const missing = fixture("missing-camera", { omitCameraRead: true });
  const removed = fixture("removed-selected");
  try {
    missing.position.dispatch(3);
    assertStrictEquals(missing.root.prepareTransaction({ cells: [], collections: [], stores: [missing.position] }), null);
    removed.remove("a");
    assertStrictEquals(removed.root.prepareTransaction({ cells: [], collections: [removed.rows], stores: [removed.position] }), null);
    assertEquals(removed.jointValue(), 3);
    assertEquals(removed.order(), ["a", "b", "c"]);
    assertEquals(removed.root.flush(), true);
    assertEquals(removed.order(), ["b", "c"]);
    assertEquals(removed.jointNode(), undefined);
    assertEquals(removed.position.diagnostics().readers, 0);
    assertEquals(removed.camera.diagnostics().readers, 0);
  } finally { missing.dispose(); removed.dispose(); }
});

Deno.test("newer Store, World, and collection actions survive exact joint acknowledgement", () => {
  class ReentrantHost extends MemoryVDOMHost {
    onWrite: (() => void) | null = null;
    override setProp(node: MemoryNode, name: string, next: unknown, previous?: unknown) {
      super.setProp(node, name, next, previous);
      if (name === "data-value" && this.onWrite) {
        const callback = this.onWrite;
        this.onWrite = null;
        callback();
      }
    }
  }
  const host = new ReentrantHost();
  const f = fixture("newer-joint", { host });
  try {
    const cell = f.setWorld(5);
    f.position.dispatch(7);
    f.moveA();
    host.onWrite = () => {
      f.position.dispatch(8);
      f.setWorld(6);
      assert(f.rows.apply(f.rows.version, [{ type: "move", key: "c", beforeKey: "b" }]).ok);
    };
    const cut = f.root.prepareTransaction({ cells: [cell], collections: [f.rows], stores: [f.position] });
    assert(cut);
    publish(cut);
    assertEquals([f.jointValue(), f.worldValue()], [9, 5]);
    assertEquals(f.root.diagnostics().pendingChangeCount, 1);
    assertEquals(f.position.getStateForRoot(f.id), 8);
    const next = f.root.prepareTransaction({ cells: [cell], collections: [f.rows], stores: [f.position] });
    assert(next, "newer work was consumed by prior acceptance");
    publish(next);
    assertEquals([f.jointValue(), f.worldValue()], [10, 6]);
  } finally { f.dispose(); }
});

Deno.test("joint cut is scoped to one fork and stale after same-key collection ABA", () => {
  const position = store(1), camera = store(2);
  const left = fixture("fork-left", { position, camera });
  const right = fixture("fork-right", { position, camera });
  try {
    position.dispatch(7);
    left.moveA();
    const candidate = left.root.prepareTransaction({ cells: [], collections: [left.rows], stores: [position] });
    assert(candidate);
    left.remove("a");
    assert(left.rows.apply(left.rows.version, [{ type: "insert", key: "a", value: "a", beforeKey: null }]).ok);
    assertEquals(candidate.validate(), false, "same-key collection ABA kept old cut valid");
    candidate.discard();
    const rightCut = right.root.prepareTransaction({ cells: [], collections: [], stores: [position] });
    assert(rightCut);
    publish(rightCut);
    assertEquals(right.jointValue(), 9);
    assertEquals(left.jointValue(), 3);
  } finally { left.dispose(); right.dispose(); }
  assertEquals(position.diagnostics().roots, 0);
});

Deno.test("queue snapshots selected Stores and groups complete joint cuts across roots", () => {
  const position = store(1), camera = store(2);
  const first = fixture("group-first", { position, camera });
  const second = fixture("group-second", { position, camera });
  const queue = new NativeRootWorkQueue();
  try {
    const entries = [first, second].map((f) => {
      const cell = f.setWorld(4);
      f.position.dispatch(7);
      f.moveA();
      return { root: f.root, cells: [cell], collections: [f.rows], stores: [position] };
    });
    const selectedStores = entries[0].stores;
    const work = queue.enqueueTransaction({ id: "joint-store-group", roots: entries, pending: ["ready"],
      onSettled: () => {
        for (const f of [first, second]) {
          assertEquals([f.jointValue(), f.worldValue()], [9, 4]);
          assertEquals(f.order(), ["b", "c", "a"]);
        }
      } });
    selectedStores.length = 0;
    assertEquals(work.status, "pending");
    work.resolve("ready");
    assertEquals(work.status, "committed");
  } finally { queue.dispose(); first.dispose(); second.dispose(); }
});

Deno.test("second host failure quarantines grouped joint cut without accepted history advance", () => {
  class FailingHost extends MemoryVDOMHost {
    fail = false;
    override setProp(node: MemoryNode, name: string, next: unknown, previous?: unknown) {
      super.setProp(node, name, next, previous);
      if (this.fail && name === "data-value") throw new Error("second joint host failed");
    }
  }
  const position = store(1), camera = store(2);
  const first = fixture("failure-first", { position, camera });
  const failingHost = new FailingHost();
  const second = fixture("failure-second", { position, camera, host: failingHost });
  const queue = new NativeRootWorkQueue();
  try {
    const versions = [first.root.publicationVersion, second.root.publicationVersion];
    const readers = position.diagnostics().readers;
    position.dispatch(7);
    const roots = [first, second].map((f) => {
      const cell = f.setWorld(5);
      f.moveA();
      return { root: f.root, cells: [cell], collections: [f.rows], stores: [position] };
    });
    failingHost.fail = true;
    const work = queue.enqueueTransaction({ id: "joint-second-host-failure", roots });
    assertEquals(work.status, "failed");
    assertEquals([first.root.publicationVersion, second.root.publicationVersion], versions);
    assertEquals(position.diagnostics().readers, readers);
    assertThrows(() => first.root.prepareTransaction({ cells: [], collections: [], stores: [position] }));
    assertThrows(() => second.root.prepareTransaction({ cells: [], collections: [], stores: [position] }));
  } finally { queue.dispose(); failingHost.fail = false; first.dispose(); second.dispose(); }
});
