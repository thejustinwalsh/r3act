import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import {
  bindStatePropAt,
  ComponentStateRoot,
  defineComponent,
  renderCollectionAt,
  Suspense,
  useAt,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import {
  invalidateCompiledSemanticPlan,
  registerCompiledSemanticPlan,
} from "./compiled_semantic_plan.ts";
import { createKeyedCollection } from "./keyed_collection.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import type { StateCellHandle } from "./owner_state_world.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => resolve = done);
  return { promise, resolve };
};
const input = (index: number) => ({ kind: "input" as const, index });

async function mixedScenario(overlap: boolean) {
  const sourceFile = `resource-transaction/${overlap ? "overlap" : "independent"}.tsx`;
  const revision = "resource-transaction-v1";
  registerCompiledSemanticPlan({
    schema_version: 1,
    source_file: sourceFile,
    module_revision: revision,
    owners: [],
    sources: [],
    sinks: [],
    operations: [],
    graph: {
      coverage: "proven-sinks-only",
      source_to_sinks: {},
      execution_order: [],
    },
  });
  const pending = deferred<number>();
  const resource = new AsyncResource(pending.promise);
  const healthPending = deferred<string>();
  const health = new AsyncResource(healthPending.promise);
  const store = createAsyncStore(2, (_old: number, next: number) => next);
  const rows = createKeyedCollection(["a", "b", "c"], (key) => key);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const scheduled: Array<() => void> = [];
  const root = new ComponentStateRoot(host, container, {
    rootId: `resource-transaction-${overlap ? "overlap" : "independent"}`,
    scheduleCommit(commit) { scheduled.push(commit); },
  });
  const drain = (limit = 12) => {
    for (let i = 0; i < limit && scheduled.length; i++) scheduled.shift()!();
    assertEquals(scheduled.length, 0, "automatic scheduling exceeded its finite budget");
  };
  const queue = new NativeRootWorkQueue();
  const handles = new Map<string, StateCellHandle>();
  const unsubscribe = root.world.subscribeDirtyCells((handle) =>
    handles.set(handle.site, handle)
  );
  let setWorld!: (value: number) => boolean;
  const jointId = `${sourceFile}#component:Joint`;
  const Joint = defineComponent(
    jointId,
    (props: { resource: typeof resource; store: typeof store }) => {
      const x = useAt(`${jointId}#resource:0`, props.resource) as number;
      const y = useStoreAt(`${jointId}#store:0`, props.store);
      return jsx("output", { key: "joint", "data-total": x + y });
    },
    {
      propOnlySites: [],
      closedStoreHostProgram: {
        schemaVersion: 4,
        componentProgramId: jointId,
        moduleRevision: revision,
        inputs: [
          { storeUseSiteId: `${jointId}#resource:0`, storeProp: "resource" },
          { storeUseSiteId: `${jointId}#store:0`, storeProp: "store" },
        ],
        host: {
          tag: "output",
          key: "joint",
          props: [["data-total", {
            kind: "binary",
            operator: "+",
            left: input(0),
            right: input(1),
          }]],
          children: [],
        },
      },
    },
  );
  const World = defineComponent(`${sourceFile}#component:World`, () => {
    const [, setter] = useStateAt("world", 0);
    setWorld = setter;
    return jsx("output", {
      key: "world",
      "data-world": bindStatePropAt(
        "world",
        (value) => value,
        {
          schemaVersion: 2,
          ownerProgramId: `${sourceFile}#component:World`,
          sinkId: "world",
          sourceSites: ["world"],
          closedExpression: input(0),
        },
      ),
    });
  }, {
    propOnlySites: ["world"],
    stateLayout: {
      schemaVersion: 1,
      programId: `${sourceFile}#component:World`,
      slots: [{ siteId: "world", slot: 0 }],
    },
  });
  const Row = defineComponent<{ value: string }>(
    `${sourceFile}#component:Row`,
    ({ value }) => jsx("li", { "data-key": value }, value),
  );
  const List = defineComponent(
    `${sourceFile}#component:List`,
    () =>
      jsx(
        "ul",
        {},
        renderCollectionAt("rows", rows, (value) => jsx(Row, { value })),
      ),
  );
  const healthId = `${sourceFile}#component:Health`;
  const Health = defineComponent(healthId,
    (props: { resource: typeof health }) => jsx("output", { key: "health" },
      useAt(`${healthId}#resource:0`, props.resource) as string),
    { propOnlySites: [], closedResourceHostProgram: {
      schemaVersion: 1, componentProgramId: healthId, moduleRevision: revision,
      resourceUseSiteId: `${healthId}#resource:0`, resourceProp: "resource",
      host: { tag: "output", key: "health", props: [], child: "resource-value" },
    } });
  try {
    root.mount(jsx("section", {}, [
      jsx(Suspense, {
        key: "joint-boundary",
        __nativeBoundarySite: "joint-boundary",
        fallback: jsx("output", { key: "joint", "data-total": "waiting" }),
        children: jsx(Joint, { key: "joint-owner", resource, store }),
      }),
      jsx(World, { key: "world-owner" }),
      jsx(List, { key: "list-owner" }),
      jsx(Suspense, {
        key: "health-boundary",
        __nativeBoundarySite: "health-boundary",
        fallback: jsx("output", { key: "health" }, "health-loading"),
        children: jsx(Health, { key: "health-owner", resource: health }),
      }),
    ]));
    const section = container.children[0];
    const fallback = section.children[0];
    const initialRows = [...section.children[2].children];
    store.dispatch(4);
    assert(setWorld(7));
    const cell = handles.get("world");
    assert(cell);
    assert(
      rows.apply(rows.version, [{ type: "move", key: "c", beforeKey: "a" }]).ok,
    );
    const preparedBeforeIntent = root.prepareRetained([cell]);
    assert(preparedBeforeIntent);
    assert(preparedBeforeIntent.validate());
    const cut = queue.enqueueTransaction({
      id: "all-inputs",
      roots: [{
        root,
        cells: [cell],
        collections: [rows],
        stores: [store],
        resources: [resource],
      }],
    });
    assertEquals(preparedBeforeIntent.validate(), false);
    preparedBeforeIntent.discard();
    assertEquals(cut.status, "pending");
    assertStrictEquals(section.children[0], fallback);
    const storeOnly = overlap ? queue.enqueueStores({
      id: "later-store",
      roots: [{ root, stores: [store] }],
    }) : null;
    const later = overlap ? queue.enqueueTransaction({
      id: "later-overlap",
      roots: [{ root, cells: [cell], collections: [rows],
        stores: [store], resources: [health] }],
    }) : null;
    healthPending.resolve("healthy");
    await Promise.resolve();
    drain();
    assertEquals(cut.status, "pending");
    assertStrictEquals(section.children[0], fallback);
    assertEquals(section.children[1].props["data-world"], 0);
    assertEquals(section.children[2].children.map((row) => row.props["data-key"]),
      ["a", "b", "c"]);
    if (later) {
      assertEquals(storeOnly?.status, "pending");
      assertEquals(later.status, "pending");
      assertEquals(section.children[3].children[0].text, "health-loading");
    } else {
      assertEquals(section.children[3].children[0].text, "healthy");
    }
    store.dispatch(5);
    drain();
    assertStrictEquals(section.children[0], fallback);
    assertEquals(section.children[1].props["data-world"], 0);
    pending.resolve(3);
    await Promise.resolve();
    drain();
    assertEquals(cut.status, "committed");
    if (storeOnly) assertEquals(storeOnly.status, "committed");
    if (later) assertEquals(later.status, "committed");
    assertEquals(section.children[0].props["data-total"], 8);
    assertEquals(section.children[1].props["data-world"], 7);
    assertEquals(
      section.children[2].children.map((row) => row.props["data-key"]),
      ["c", "a", "b"],
    );
    assertStrictEquals(section.children[2].children[0], initialRows[2]);
    assertEquals(section.children[3].children[0].text, "healthy");
    assertEquals(root.diagnostics().pendingChangeCount, 0);
  } finally {
    queue.dispose();
    unsubscribe();
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
}

Deno.test("resource, Store, local cell, and keyed move publish in one declared cut", () =>
  mixedScenario(false));
Deno.test("later resource with overlapping Store, cell and collection waits, then commits", () =>
  mixedScenario(true));

Deno.test("joint position reader waits for held camera while independent Store publishes", async () => {
  const sourceFile = "resource-transaction/joint-held-camera.tsx";
  const revision = "resource-transaction-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const pending = deferred<string>();
  const resource = new AsyncResource(pending.promise);
  const position = createAsyncStore(1, (_old: number, next: number) => next);
  const camera = createAsyncStore(2, (_old: number, next: number) => next);
  const health = createAsyncStore(0, (_old: number, next: number) => next);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const scheduled: Array<() => void> = [];
  const root = new ComponentStateRoot(host, container, {
    rootId: "resource-joint-held-camera",
    scheduleCommit(commit) { scheduled.push(commit); },
  });
  const drain = () => {
    for (let index = 0; index < 12 && scheduled.length; index++) scheduled.shift()!();
    assertEquals(scheduled.length, 0, "held-camera scheduling did not quiesce");
  };
  const queue = new NativeRootWorkQueue();
  const resourceId = `${sourceFile}#component:Resource`;
  const Resource = defineComponent(resourceId, (props: { resource: typeof resource }) =>
    jsx("output", { key: "resource" },
      useAt(`${resourceId}#resource:0`, props.resource) as string),
    { propOnlySites: [], closedResourceHostProgram: {
      schemaVersion: 1, componentProgramId: resourceId, moduleRevision: revision,
      resourceUseSiteId: `${resourceId}#resource:0`, resourceProp: "resource",
      host: { tag: "output", key: "resource", props: [], child: "resource-value" },
    } });
  const jointId = `${sourceFile}#component:Joint`;
  const Joint = defineComponent(jointId,
    (props: { position: typeof position; camera: typeof camera }) => {
      const x = useStoreAt(`${jointId}#store:0`, props.position);
      const y = useStoreAt(`${jointId}#store:1`, props.camera);
      return jsx("output", { key: "joint", "data-value": x + y });
    }, { propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 2, componentProgramId: jointId, moduleRevision: revision,
      inputs: [
        { storeUseSiteId: `${jointId}#store:0`, storeProp: "position" },
        { storeUseSiteId: `${jointId}#store:1`, storeProp: "camera" },
      ],
      host: { tag: "output", key: "joint", child: null, props: [["data-value", {
        kind: "binary", operator: "+", left: input(0), right: input(1),
      }]] },
    } });
  const healthId = `${sourceFile}#component:Health`;
  const Health = defineComponent(healthId,
    (props: { store: typeof health }) => {
      const value = useStoreAt(`${healthId}#store:0`, props.store);
      return jsx("output", { key: "health", "data-health": value });
    }, { propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 1, componentProgramId: healthId, moduleRevision: revision,
      storeUseSiteId: `${healthId}#store:0`, storeProp: "store",
      host: { tag: "output", key: "health", child: null,
        props: [["data-health", input(0)]] },
    } });
  try {
    root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "resource-boundary", __nativeBoundarySite: "resource-boundary",
        fallback: jsx("output", { key: "resource" }, "waiting"),
        children: jsx(Resource, { key: "resource-owner", resource }) }),
      jsx(Joint, { key: "joint-owner", position, camera }),
      jsx(Health, { key: "health-owner", store: health }),
    ]));
    const section = container.children[0];
    const jointNode = section.children[1];
    const healthNode = section.children[2];
    camera.dispatch(10);
    const cameraWork = queue.enqueueTransaction({ id: "camera-resource",
      roots: [{ root, cells: [], collections: [], stores: [camera], resources: [resource] }] });
    position.dispatch(3);
    const positionWork = queue.enqueueStores({ id: "position-only",
      roots: [{ root, stores: [position] }] });
    health.dispatch(9);
    const healthWork = queue.enqueueStores({ id: "independent-health",
      roots: [{ root, stores: [health] }] });
    drain();
    assertEquals(cameraWork.status, "pending");
    assertEquals(positionWork.status, "pending");
    assertEquals(healthWork.status, "committed");
    assertEquals(section.children[0].children[0].text, "waiting");
    assertStrictEquals(section.children[1], jointNode);
    assertEquals(jointNode.props["data-value"], 3);
    assertStrictEquals(section.children[2], healthNode);
    assertEquals(healthNode.props["data-health"], 9);
    pending.resolve("ready");
    await Promise.resolve();
    drain();
    assertEquals(cameraWork.status, "committed");
    assertEquals(positionWork.status, "committed");
    assertEquals(jointNode.props["data-value"], 13);
    assertEquals(section.children[0].children[0].text, "ready");
    assertEquals(healthNode.props["data-health"], 9);
  } finally {
    queue.dispose();
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});
