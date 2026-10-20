import { assertEquals, assertStrictEquals, assertThrows } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import {
  bindStatePropAt,
  bindStatePropsAt,
  ComponentStateRoot,
  defineComponent,
  Suspense,
  useAt,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import {
  invalidateCompiledSemanticPlan,
  registerCompiledSemanticPlan,
} from "./compiled_semantic_plan.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => resolve = yes);
  return { promise, resolve };
};
const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");

function pendingStoreScene(
  id: string,
  host: MemoryVDOMHost = new MemoryVDOMHost(),
) {
  const ready = deferred<string>();
  const pending = deferred<string>();
  const first = new AsyncResource(ready.promise);
  const next = new AsyncResource(pending.promise);
  const mode = createAsyncStore(0, (_state: number, action: number) => action);
  const world = new OwnerStateWorld();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: id,
    world,
    scheduleCommit() {},
  });
  const A = defineComponent(`${id}:A`, () =>
    jsx("div", { key: "a-host" }, useAt("a", useStoreAt("mode", mode) === 0
      ? first : next) as string));
  const blocked = () => {
    mode.dispatch(1);
    root.flush();
  };
  return { ready, pending, mode, world, host, container, root, A, blocked };
}

Deno.test("ordinary closed prop flush publishes while unrelated Store resource waits", async () => {
  const f = pendingStoreScene("urgent-retained-position");
  let setPosition!: (value: number) => boolean;
  let renders = 0;
  const programId = "urgent-retained-position:View";
  const View = defineComponent(programId, () => {
    renders++;
    [, setPosition] = useStateAt("position", 0);
    return jsx("output", { key: "position-host", position: bindStatePropAt(
      "position", (value) => value, {
        schemaVersion: 2,
        ownerProgramId: programId,
        sinkId: "position",
        sourceSites: ["position"],
        closedExpression: { kind: "input", index: 0 },
      }) });
  }, {
    propOnlySites: ["position"],
    stateLayout: { schemaVersion: 1, programId,
      slots: [{ siteId: "position", slot: 0 }] },
  });
  try {
    f.ready.resolve("old-a");
    await Promise.resolve();
    f.root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "a", __nativeBoundarySite: "a", fallback:
        jsx("div", { key: "a-host" }, "loading"), children: jsx(f.A, { key: "a" }) }),
      jsx(View, { key: "view" }),
    ]));
    const liveSet = setPosition;
    const acceptedA = f.container.children[0].children[0];
    f.blocked();
    const rendersBefore = renders;
    liveSet(7);
    f.root.flush();
    assertEquals(f.container.children[0].children[1].props.position, 7);
    assertStrictEquals(f.container.children[0].children[0], acceptedA);
    assertEquals(text(acceptedA), "old-a");
    assertEquals(renders, rendersBefore);
    assertEquals(f.root.diagnostics().pendingChangeCount, 0);
    f.pending.resolve("new-a");
    await Promise.resolve();
    f.root.flush();
    assertEquals(text(f.container.children[0].children[0]), "new-a");
    assertEquals(f.container.children[0].children[1].props.position, 7);
  } finally {
    f.root.dispose();
  }
});

Deno.test("fresh synchronous Store action and closed cell publish together", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "urgent-retained-fresh-store",
    scheduleCommit() {},
  });
  const store = createAsyncStore(0, (_state: number, action: number) => action);
  let setPosition!: (value: number) => boolean;
  const StoreView = defineComponent("urgent-retained-fresh-store:Store", () =>
    jsx("span", { key: "store-host" }, String(useStoreAt("value", store))));
  const programId = "urgent-retained-fresh-store:Position";
  const Position = defineComponent(programId, () => {
    [, setPosition] = useStateAt("position", 0);
    return jsx("output", { key: "position-host", position: bindStatePropAt(
      "position", (value) => value, {
        schemaVersion: 2, ownerProgramId: programId, sinkId: "position",
        sourceSites: ["position"],
        closedExpression: { kind: "input", index: 0 },
      }) });
  }, {
    propOnlySites: ["position"],
    stateLayout: { schemaVersion: 1, programId,
      slots: [{ siteId: "position", slot: 0 }] },
  });
  try {
    root.mount(jsx("section", {}, [
      jsx(StoreView, { key: "store" }), jsx(Position, { key: "position" }),
    ]));
    const liveSet = setPosition;
    store.dispatch(1);
    liveSet(7);
    root.flush();
    assertEquals(text(container.children[0].children[0]), "1");
    assertEquals(container.children[0].children[1].props.position, 7);
    assertEquals(root.diagnostics().pendingChangeCount, 0);
  } finally {
    root.dispose();
  }
});

Deno.test("urgent closed prop publishes before a fresh ready-boundary receipt", async () => {
  const sourceFile = "urgent-retained/paired-boundary.tsx";
  registerCompiledSemanticPlan({
    schema_version: 1, source_file: sourceFile, module_revision: "urgent-v1",
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {},
      execution_order: [] },
  });
  const f = pendingStoreScene("urgent-retained-paired");
  const b = deferred<string>();
  const resourceB = new AsyncResource(b.promise);
  let setPosition!: (value: number) => boolean;
  const viewId = "urgent-retained-paired:View";
  const View = defineComponent(viewId, () => {
    [, setPosition] = useStateAt("position", 0);
    return jsx("output", { key: "view-host", position: bindStatePropAt(
      "position", (value) => value, {
        schemaVersion: 2, ownerProgramId: viewId, sinkId: "position",
        sourceSites: ["position"],
        closedExpression: { kind: "input", index: 0 },
      }) });
  }, {
    propOnlySites: ["position"],
    stateLayout: { schemaVersion: 1, programId: viewId,
      slots: [{ siteId: "position", slot: 0 }] },
  });
  const bId = `${sourceFile}#component:B`;
  let bRenders = 0;
  const B = defineComponent(bId, (props: { resource: AsyncResource<string> }) => {
    bRenders++;
    return jsx("div", { key: "b-host" },
      useAt("resource", props.resource) as string);
  }, {
    propOnlySites: [],
    closedResourceHostProgram: {
      schemaVersion: 1, componentProgramId: bId, moduleRevision: "urgent-v1",
      resourceUseSiteId: `${bId}#resource:0`, resourceProp: "resource",
      host: { tag: "div", key: "b-host", props: [], child: "resource-value" },
    },
  });
  try {
    f.ready.resolve("old-a");
    await Promise.resolve();
    f.root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "a", __nativeBoundarySite: "a", fallback:
        jsx("div", { key: "a-host" }, "loading"), children: jsx(f.A, { key: "a" }) }),
      jsx(View, { key: "view" }),
      jsx(Suspense, { key: "b", __nativeBoundarySite: "b", fallback:
        jsx("div", { key: "b-host" }, "b-loading"), children: jsx(B,
        { key: "b", resource: resourceB }) }),
    ]));
    const liveSet = setPosition;
    f.blocked();
    const rendersBefore = bRenders;
    liveSet(7);
    b.resolve("ready-b");
    await Promise.resolve();
    f.root.flush();
    assertEquals(f.container.children[0].children[1].props.position, 7);
    assertEquals(text(f.container.children[0].children[2]), "ready-b");
    assertEquals(text(f.container.children[0].children[0]), "old-a");
    assertEquals(bRenders, rendersBefore);
    assertEquals(f.root.diagnostics().pendingChangeCount, 0);
  } finally {
    f.root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("incomplete joint input and opaque cell batch stay generic while blocked", async () => {
  const f = pendingStoreScene("urgent-retained-incomplete");
  let setPosition!: (value: number) => boolean;
  let setCamera!: (value: number) => boolean;
  let setOpaque!: (value: number) => boolean;
  let opaqueRenders = 0;
  const programId = "urgent-retained-incomplete:View";
  const View = defineComponent(programId, () => {
    [, setPosition] = useStateAt("position", 0);
    [, setCamera] = useStateAt("camera", 0);
    return jsx("output", { key: "view-host", screen: bindStatePropsAt(
      ["position", "camera"], ([position, camera]) => position + camera, {
        schemaVersion: 2,
        ownerProgramId: programId,
        sinkId: "screen",
        sourceSites: ["position", "camera"],
        closedExpression: { kind: "binary", operator: "+",
          left: { kind: "input", index: 0 },
          right: { kind: "input", index: 1 } },
      }) });
  }, {
    propOnlySites: ["position", "camera"],
    stateLayout: { schemaVersion: 1, programId,
      slots: [{ siteId: "position", slot: 0 }, { siteId: "camera", slot: 1 }] },
  });
  const Opaque = defineComponent(`${programId}:Opaque`, () => {
    opaqueRenders++;
    const [value, set] = useStateAt("opaque", 0);
    setOpaque = set;
    return jsx("span", { key: "opaque-host" }, String(value));
  });
  try {
    f.ready.resolve("old-a");
    await Promise.resolve();
    f.root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "a", __nativeBoundarySite: "a", fallback:
        jsx("div", { key: "a-host" }, "loading"), children: jsx(f.A, { key: "a" }) }),
      jsx(View, { key: "view" }),
      jsx(Opaque, { key: "opaque" }),
    ]));
    const position = setPosition;
    const camera = setCamera;
    const opaque = setOpaque;
    f.blocked();
    position(3);
    f.root.flush();
    assertEquals(f.container.children[0].children[1].props.screen, 0);
    assertEquals(f.root.diagnostics().pendingChangeCount, 1);
    camera(4);
    opaque(5);
    f.root.flush();
    assertEquals(f.container.children[0].children[1].props.screen, 0);
    assertEquals(f.root.diagnostics().pendingChangeCount, 3);
    f.pending.resolve("new-a");
    await Promise.resolve();
    f.root.flush();
    assertEquals(f.container.children[0].children[1].props.screen, 7);
    assertEquals(text(f.container.children[0].children[2]), "5");
    assertEquals(f.root.diagnostics().pendingChangeCount, 0);
    assertEquals(opaqueRenders > 1, true);
  } finally {
    f.root.dispose();
  }
});

Deno.test("urgent closed host reentry retains the newer exact cell action", async () => {
  let reenter = () => {};
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "position" && value === 7) reenter();
    }
  }
  const f = pendingStoreScene("urgent-retained-reentry", new Host());
  let setPosition!: (value: number) => boolean;
  const programId = "urgent-retained-reentry:View";
  const View = defineComponent(programId, () => {
    [, setPosition] = useStateAt("position", 0);
    return jsx("output", { key: "view-host", position: bindStatePropAt(
      "position", (value) => value, {
        schemaVersion: 2, ownerProgramId: programId, sinkId: "position",
        sourceSites: ["position"],
        closedExpression: { kind: "input", index: 0 },
      }) });
  }, {
    propOnlySites: ["position"],
    stateLayout: { schemaVersion: 1, programId,
      slots: [{ siteId: "position", slot: 0 }] },
  });
  try {
    f.ready.resolve("old-a");
    await Promise.resolve();
    f.root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "a", __nativeBoundarySite: "a", fallback:
        jsx("div", { key: "a-host" }, "loading"), children: jsx(f.A, { key: "a" }) }),
      jsx(View, { key: "view" }),
    ]));
    const liveSet = setPosition;
    f.blocked();
    reenter = () => { liveSet(9); };
    liveSet(7);
    f.root.flush();
    assertEquals(f.container.children[0].children[1].props.position, 7);
    assertEquals(f.root.diagnostics().pendingChangeCount, 1);
    assertEquals(f.world.pendingChanges().length, 1);
    f.root.flush();
    assertEquals(f.container.children[0].children[1].props.position, 9);
    assertEquals(f.root.diagnostics().pendingChangeCount, 0);
    assertEquals(text(f.container.children[0].children[0]), "old-a");
  } finally {
    f.root.dispose();
  }
});

Deno.test("urgent closed host failure preserves accepted history and quarantines", async () => {
  let armed = false;
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (armed && name === "position" && value === 7) {
        throw new Error("urgent host failed");
      }
    }
  }
  const f = pendingStoreScene("urgent-retained-failure", new Host());
  let setPosition!: (value: number) => boolean;
  const programId = "urgent-retained-failure:View";
  const View = defineComponent(programId, () => {
    [, setPosition] = useStateAt("position", 0);
    return jsx("output", { key: "view-host", position: bindStatePropAt(
      "position", (value) => value, {
        schemaVersion: 2, ownerProgramId: programId, sinkId: "position",
        sourceSites: ["position"],
        closedExpression: { kind: "input", index: 0 },
      }) });
  }, {
    propOnlySites: ["position"],
    stateLayout: { schemaVersion: 1, programId,
      slots: [{ siteId: "position", slot: 0 }] },
  });
  try {
    f.ready.resolve("old-a");
    await Promise.resolve();
    f.root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "a", __nativeBoundarySite: "a", fallback:
        jsx("div", { key: "a-host" }, "loading"), children: jsx(f.A, { key: "a" }) }),
      jsx(View, { key: "view" }),
    ]));
    const liveSet = setPosition;
    f.blocked();
    const version = f.root.publicationVersion;
    liveSet(7);
    armed = true;
    assertThrows(() => f.root.flush(), Error, "urgent host failed");
    assertEquals(f.root.publicationVersion, version);
    assertEquals(f.root.diagnostics().pendingChangeCount, 1);
    assertThrows(() => f.root.flush(), Error, "host commit failure");
  } finally {
    f.root.dispose();
  }
});

Deno.test("urgent closed receipt stops when disposal is requested by the host", async () => {
  let disposeRoot = () => {};
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "position" && value === 7) disposeRoot();
    }
  }
  const f = pendingStoreScene("urgent-retained-dispose", new Host());
  disposeRoot = () => f.root.dispose();
  let setPosition!: (value: number) => boolean;
  const programId = "urgent-retained-dispose:View";
  const View = defineComponent(programId, () => {
    [, setPosition] = useStateAt("position", 0);
    return jsx("output", { key: "view-host", position: bindStatePropAt(
      "position", (value) => value, {
        schemaVersion: 2, ownerProgramId: programId, sinkId: "position",
        sourceSites: ["position"],
        closedExpression: { kind: "input", index: 0 },
      }) });
  }, {
    propOnlySites: ["position"],
    stateLayout: { schemaVersion: 1, programId,
      slots: [{ siteId: "position", slot: 0 }] },
  });
  try {
    f.ready.resolve("old-a");
    await Promise.resolve();
    f.root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "a", __nativeBoundarySite: "a", fallback:
        jsx("div", { key: "a-host" }, "loading"), children: jsx(f.A, { key: "a" }) }),
      jsx(View, { key: "view" }),
    ]));
    const liveSet = setPosition;
    f.blocked();
    liveSet(7);
    assertThrows(() => f.root.flush(), Error,
      "Native root candidate was cancelled during host commit");
    assertEquals(f.root.diagnostics().disposed, true);
  } finally {
    f.root.dispose();
  }
});

Deno.test("module invalidation during urgent host application rejects publication", async () => {
  const sourceFile = "urgent-retained/hmr.tsx";
  registerCompiledSemanticPlan({
    schema_version: 1,
    source_file: sourceFile,
    module_revision: "urgent-v1",
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {},
      execution_order: [] },
  });
  let invalidate = () => {};
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "position" && value === 7) invalidate();
    }
  }
  const f = pendingStoreScene("urgent-retained-hmr", new Host());
  invalidate = () => { invalidateCompiledSemanticPlan(sourceFile, "urgent-v1"); };
  let setPosition!: (value: number) => boolean;
  const programId = `${sourceFile}#component:View`;
  const View = defineComponent(programId, () => {
    [, setPosition] = useStateAt("position", 0);
    return jsx("output", { key: "view-host", position: bindStatePropAt(
      "position", (value) => value, {
        schemaVersion: 2, ownerProgramId: programId, sinkId: "position",
        sourceSites: ["position"],
        closedExpression: { kind: "input", index: 0 },
      }) });
  }, {
    propOnlySites: ["position"],
    stateLayout: { schemaVersion: 1, programId,
      slots: [{ siteId: "position", slot: 0 }] },
  });
  try {
    f.ready.resolve("old-a");
    await Promise.resolve();
    f.root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "a", __nativeBoundarySite: "a", fallback:
        jsx("div", { key: "a-host" }, "loading"), children: jsx(f.A, { key: "a" }) }),
      jsx(View, { key: "view" }),
    ]));
    const liveSet = setPosition;
    f.blocked();
    const version = f.root.publicationVersion;
    liveSet(7);
    assertThrows(() => f.root.flush(), Error);
    assertEquals(f.root.publicationVersion, version);
  } finally {
    f.root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});
