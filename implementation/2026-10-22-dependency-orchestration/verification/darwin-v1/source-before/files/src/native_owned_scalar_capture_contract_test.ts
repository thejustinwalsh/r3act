import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import { createAsyncStore, type AsyncStore } from "./async_store_runtime.ts";
import { ComponentStateRoot, Suspense, defineComponent, useAt, useStateAt,
  useStoreAt } from "./component_state_runtime.ts";
import { invalidateCompiledSemanticPlan, registerCompiledSemanticPlan } from
  "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, type MemoryNode } from "./vdom_snapshot_runtime.ts";

Deno.test("closed clock leaves actionable generic readers live beside a parked resource", async () => {
  const file = "owned-capture/clock-and-parked-generic.tsx";
  const revision = "owned-capture-progress-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: file,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const clock = createAsyncStore(0, (_old: number, next: number) => next);
  const studio = createAsyncStore("old", (_old: string, next: string) => next);
  const initial = new AsyncResource(Promise.resolve("healthy"));
  await Promise.resolve();
  const health = createAsyncStore(initial,
    (_old: AsyncResource<string>, next: AsyncResource<string>) => next);
  let acceptedSetLocal!: (next: number) => boolean;
  let outsideRenders = 0;
  let clockRenders = 0;
  const Scene = defineComponent(`${file}#component:Scene`, () => jsx("section", {
    key: "scene", "data-id": useStoreAt(`${file}#component:Scene#store:0`, studio),
  }));
  const Outside = defineComponent(`${file}#component:Outside`, () => {
    outsideRenders++;
    const resource = useStoreAt(`${file}#component:Outside#store:0`, health);
    return jsx("output", { key: "outside", "data-state":
      resource === initial ? "initial" : resource.status.status });
  });
  const Health = defineComponent(`${file}#component:Health`, () => {
    const [local, setLocal] = useStateAt(`${file}#component:Health#local:0`, 0);
    acceptedSetLocal = setLocal;
    const resource = useStoreAt(`${file}#component:Health#store:0`, health);
    return jsx("span", { key: "health", "data-local": local },
      useAt(`${file}#component:Health#resource:0`, resource) as string);
  });
  const clockId = `${file}#component:Clock`;
  const clockUse = `${clockId}#store:0`;
  const Clock = defineComponent(clockId,
    (props: { store: AsyncStore<number, number> }) => {
      clockRenders++;
      return jsx("output", { key: "clock", "data-epoch":
        useStoreAt(clockUse, props.store) });
    }, { propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 1, componentProgramId: clockId, moduleRevision: revision,
      storeUseSiteId: clockUse, storeProp: "store",
      host: { tag: "output", key: "clock", child: null,
        props: [["data-epoch", { kind: "input", index: 0 }]] },
    } });
  const host = new MemoryVDOMHost();
  let onSceneWrite: (() => void) | null = null;
  const originalSetProp = host.setProp;
  host.setProp = (node, name, value, previous) => {
    originalSetProp.call(host, node, name, value, previous);
    if (name === "data-id" && value === "edit") {
      const action = onSceneWrite;
      onSceneWrite = null;
      action?.();
    }
  };
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container,
    { rootId: "owned-capture-parked-generic", scheduleCommit() {} });
  const nodes = () => container.children[0].children;
  const healthNode = () => nodes()[3];
  const text = (node: MemoryNode): string =>
    (node.text ?? "") + node.children.map(text).join("");
  try {
    root.mount(jsx("main", {}, [jsx(Scene, { key: "scene-owner" }),
      jsx(Outside, { key: "outside-owner" }),
      jsx(Clock, { key: "clock-owner", store: clock }),
      jsx(Suspense, { key: "health-boundary",
        __nativeBoundarySite: `${file}#boundary:Health`,
        fallback: jsx("span", { key: "fallback" }, "waiting"),
        children: jsx(Health, { key: "health-owner" }),
      })]));
    const stableClock = nodes()[2];
    const initialClockRenders = clockRenders;
    const initialOutsideRenders = outsideRenders;
    const acceptedLocal = acceptedSetLocal;
    clock.dispatch(1);
    assertEquals(root.flush(), true);
    assertEquals(nodes()[2].props["data-epoch"], 1);
    assertStrictEquals(nodes()[2], stableClock);
    assertEquals(clockRenders, initialClockRenders,
      "closed-only clock cut executed its owner body");
    assertEquals(outsideRenders, initialOutsideRenders,
      "closed-only clock cut rendered an unrelated generic owner");
    health.dispatch(new AsyncResource(new Promise<string>(() => {})));
    root.flush();
    const parkedSnapshot = root.snapshot;
    const parkedBytes = JSON.stringify(parkedSnapshot);
    const beforeOutside = outsideRenders;
    clock.dispatch(2);
    assertEquals(root.flush(), true);
    assertEquals(nodes()[2].props["data-epoch"], 2);
    assertStrictEquals(nodes()[2], stableClock);
    assert(outsideRenders > beforeOutside,
      "blocked resource reader hid its actionable same-Store opaque sibling");
    assertEquals(nodes()[1].props["data-state"], "pending");
    assertEquals(text(healthNode()), "healthy");
    studio.dispatch("independent");
    for (let epoch = 3; epoch <= 5; epoch++) {
      clock.dispatch(epoch);
      root.flush();
      if (nodes()[0].props["data-id"] === "independent") break;
    }
    assertEquals(nodes()[0].props["data-id"], "independent",
      "generic Store progress starved behind continuous closed clock");
    assertEquals(JSON.stringify(parkedSnapshot), parkedBytes);
    const ready = new AsyncResource(Promise.resolve("woken"));
    await Promise.resolve();
    onSceneWrite = () => {
      assertEquals(acceptedLocal(1), true,
        "the mounted setter must retain the queued local action");
      health.dispatch(ready);
    };
    studio.dispatch("edit");
    clock.dispatch(6);
    assertEquals(root.flush(), true);
    assertStrictEquals(onSceneWrite, null);
    assertEquals(nodes()[0].props["data-id"], "edit");
    assertEquals(healthNode().props["data-local"], 0);
    assertEquals(text(healthNode()), "healthy",
      "host-time actions changed the old accepted parked cut");
    for (let attempt = 0; attempt < 3; attempt++) {
      root.flush();
      if (text(healthNode()) === "woken") break;
    }
    assertEquals(text(healthNode()), "woken");
    assertEquals(healthNode().props["data-local"], 1);
    assertEquals(nodes()[1].props["data-state"], "fulfilled");
    assertEquals(JSON.stringify(parkedSnapshot), parkedBytes);
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(file, revision);
  }
});
