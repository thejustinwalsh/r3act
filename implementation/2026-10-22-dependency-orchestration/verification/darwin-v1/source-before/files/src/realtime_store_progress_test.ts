import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import { createAsyncStore, type AsyncStore } from "./async_store_runtime.ts";
import { ComponentStateRoot, Suspense, defineComponent, useAt, useStateAt, useStoreAt } from
  "./component_state_runtime.ts";
import {
  invalidateCompiledSemanticPlan,
  registerCompiledSemanticPlan,
  type CompiledSemanticPlan,
} from "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, type MemoryNode } from "./vdom_snapshot_runtime.ts";

const sourceFile = "realtime-store-progress/clock-and-control.tsx";
const revision = "realtime-store-progress-v1";

const sceneKeys = (container: MemoryNode): string[] =>
  container.children[0].children[0].children.map((child) =>
    String(child.props["data-id"]));
const clockValue = (container: MemoryNode): number =>
  Number(container.children[0].children[1].props["data-epoch"]);
const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");

Deno.test("continuous closed clock preserves opaque control and held resource progress", async () => {
  const semanticPlan: CompiledSemanticPlan = {
    schema_version: 1, source_file: sourceFile, module_revision: revision,
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {},
      execution_order: [] },
  };
  registerCompiledSemanticPlan(semanticPlan);
  const studio = createAsyncStore(["orbit-a", "orbit-b"],
    (_old: string[], next: string[]) => [...next]);
  const clock = createAsyncStore(0, (_old: number, next: number) => next);
  const ready = new AsyncResource(Promise.resolve("healthy"));
  const health = createAsyncStore(ready,
    (_old: AsyncResource<string>, next: AsyncResource<string>) => next);
  await Promise.resolve();
  let sceneRenders = 0;
  let clockRenders = 0;
  let failScene = false;
  const sceneFailure = new Error("generic Scene preparation failed");
  const Scene = defineComponent(`${sourceFile}#component:Scene`, () => {
    sceneRenders++;
    const keys = useStoreAt(`${sourceFile}#component:Scene#store:0`, studio);
    if (failScene) throw sceneFailure;
    return jsx("section", { key: "scene" }, keys.map((key) =>
      jsx("span", { key, "data-id": key })));
  });
  const clockId = `${sourceFile}#component:Clock`;
  const clockUse = `${clockId}#store:0`;
  const Clock = defineComponent(clockId,
    (props: { store: AsyncStore<number, number> }) => {
      clockRenders++;
      return jsx("output", { key: "clock", "data-epoch":
        useStoreAt(clockUse, props.store) });
    }, {
      propOnlySites: [],
      closedStoreHostProgram: {
        schemaVersion: 1, componentProgramId: clockId, moduleRevision: revision,
        storeUseSiteId: clockUse, storeProp: "store",
        host: { tag: "output", key: "clock", child: null,
          props: [["data-epoch", { kind: "input", index: 0 }]] },
      },
    });
  const Health = defineComponent(`${sourceFile}#component:Health`, () => {
    const resource = useStoreAt(`${sourceFile}#component:Health#store:0`, health);
    return jsx("span", { key: "health" },
      useAt(`${sourceFile}#component:Health#resource:0`, resource) as string);
  });
  const host = new MemoryVDOMHost();
  let hostWriteAction: (() => void) | null = null;
  const originalSetProp = host.setProp;
  host.setProp = (node, name, value, previous) => {
    originalSetProp.call(host, node, name, value, previous);
    if (name === "data-id" && value === "host-time-edit") {
      const action = hostWriteAction;
      hostWriteAction = null;
      action?.();
    }
  };
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "realtime-progress-main", scheduleCommit() {},
  });
  try {
    root.mount(jsx("main", {}, [jsx(Scene, { key: "scene-owner" }),
      jsx(Clock, { key: "clock-owner", store: clock }),
      jsx(Suspense, { key: "health-boundary",
        __nativeBoundarySite: `${sourceFile}#boundary:Health`,
        fallback: jsx("span", { key: "health-fallback" }, "waiting"),
        error: () => jsx("span", { key: "health-error" }, "failed"),
        children: jsx(Health, { key: "health-owner" }),
      })]));
    assertEquals(sceneKeys(container), ["orbit-a", "orbit-b"]);
    assertEquals(text(container.children[0].children[2]), "healthy");
    assert(sceneRenders > 0 && clockRenders > 0);
    const initialRenders = [sceneRenders, clockRenders];
    const clockHost = container.children[0].children[1];
    for (let epoch = 1; epoch <= 4; epoch++) {
      clock.dispatch(epoch);
      assertEquals(root.flush(), true);
      assertEquals(clockValue(container), epoch);
      assertEquals(sceneKeys(container), ["orbit-a", "orbit-b"]);
      assertEquals([sceneRenders, clockRenders], initialRenders,
        "ordinary clock frame rerendered a generic owner");
      assertStrictEquals(container.children[0].children[1], clockHost);
    }
    studio.dispatch(["relay", "orbit-b", "orbit-a"]);
    let settled = false;
    for (let epoch = 5; epoch <= 7; epoch++) {
      clock.dispatch(epoch);
      assertEquals(root.flush(), true);
      if (sceneKeys(container).join(",") === "relay,orbit-b,orbit-a") {
        settled = true;
        break;
      }
    }
    assert(settled, "opaque control action starved behind continuous closed clock");
    assertEquals(sceneKeys(container), ["relay", "orbit-b", "orbit-a"]);
    assert(sceneRenders > 1, "generic control reader was never rendered");
    const afterControl = sceneRenders;
    for (let epoch = 8; epoch <= 10; epoch++) {
      clock.dispatch(epoch);
      assertEquals(root.flush(), true);
      assertEquals(clockValue(container), epoch);
      assertEquals(sceneRenders, afterControl,
        "settled clock frame rerendered the generic control owner");
    }
    const acceptedBeforeFailure = root.snapshot;
    const savedBeforeFailure = JSON.stringify(acceptedBeforeFailure);
    const oldKeys = sceneKeys(container);
    failScene = true;
    studio.dispatch(["failed-control", "orbit-a"]);
    clock.dispatch(11);
    let caught: unknown;
    try { root.flush(); } catch (error) { caught = error; }
    assertStrictEquals(caught, sceneFailure,
      "generic preparation did not propagate its original error");
    assertEquals(clockValue(container), 11,
      "generic preparation failure lost the earlier accepted clock cut");
    assertEquals(sceneKeys(container), oldKeys,
      "failed generic preparation changed accepted control keys");
    assertEquals(JSON.stringify(acceptedBeforeFailure), savedBeforeFailure,
      "later partial publication mutated the saved accepted snapshot");
    assert(JSON.stringify(root.snapshot) !== savedBeforeFailure,
      "accepted clock snapshot did not advance before generic failure");
    failScene = false;
    studio.dispatch(["recovered", "relay", "orbit-a"]);
    let recovered = false;
    for (let epoch = 12; epoch <= 14; epoch++) {
      clock.dispatch(epoch);
      assertEquals(root.flush(), true);
      if (sceneKeys(container).join(",") === "recovered,relay,orbit-a") {
        recovered = true;
        break;
      }
    }
    assert(recovered, "newer control action did not recover after generic failure");
    assertEquals(sceneKeys(container), ["recovered", "relay", "orbit-a"]);
    const healthHost = container.children[0].children[2];
    health.dispatch(new AsyncResource(new Promise<string>(() => {})));
    root.flush();
    const parkedSceneRenders = sceneRenders;
    for (let epoch = 15; epoch <= 17; epoch++) {
      clock.dispatch(epoch);
      assertEquals(root.flush(), true);
      assertEquals(clockValue(container), epoch,
        "held health resource stopped independent closed clock progress");
      assertStrictEquals(container.children[0].children[2], healthHost);
      assertEquals(text(healthHost), "healthy");
      assertEquals(sceneRenders, parkedSceneRenders,
        "parked health triggered an unrelated generic Scene render");
    }
    studio.dispatch(["parked-edit", "relay"]);
    let editedBesideParkedHealth = false;
    for (let epoch = 18; epoch <= 20; epoch++) {
      clock.dispatch(epoch);
      root.flush();
      if (sceneKeys(container).join(",") === "parked-edit,relay") {
        editedBesideParkedHealth = true;
        break;
      }
    }
    assert(editedBesideParkedHealth,
      "an independent control edit starved beside parked health");
    assertEquals(text(container.children[0].children[2]), "healthy");
    const hostTimeReady = new AsyncResource(Promise.resolve("host-time"));
    await Promise.resolve();
    hostWriteAction = () => health.dispatch(hostTimeReady);
    studio.dispatch(["host-time-edit", "relay"]);
    clock.dispatch(21);
    assertEquals(root.flush(), true);
    assertStrictEquals(hostWriteAction, null,
      "Scene host write did not dispatch the newer Health action");
    assertEquals(sceneKeys(container), ["host-time-edit", "relay"]);
    assertEquals(text(container.children[0].children[2]), "healthy",
      "host-time replacement changed the accepted old Health cut");
    let hostTimeRecovered = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      root.flush();
      if (text(container.children[0].children[2]) === "host-time") {
        hostTimeRecovered = true;
        break;
      }
    }
    assert(hostTimeRecovered,
      "newer host-time Health action was not retried after the old cut");
    health.dispatch(new AsyncResource(new Promise<string>(() => {})));
    root.flush();
    assertEquals(text(container.children[0].children[2]), "host-time");
    const replacement = new AsyncResource(Promise.resolve("replacement"));
    await Promise.resolve();
    health.dispatch(replacement);
    let replaced = false;
    for (let epoch = 22; epoch <= 24; epoch++) {
      clock.dispatch(epoch);
      root.flush();
      if (text(container.children[0].children[2]) === "replacement") {
        replaced = true;
        break;
      }
    }
    assert(replaced,
      "a ready replacement was hidden behind the old pending resource");
    let fulfill!: (value: string) => void;
    health.dispatch(new AsyncResource(new Promise<string>((resolve) => {
      fulfill = resolve;
    })));
    root.flush();
    assertEquals(text(container.children[0].children[2]), "replacement");
    fulfill("fulfilled");
    await Promise.resolve();
    let fulfilled = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      root.flush();
      if (text(container.children[0].children[2]) === "fulfilled") {
        fulfilled = true;
        break;
      }
    }
    assert(fulfilled, "settled health resource did not wake its boundary");
    let reject!: (reason: unknown) => void;
    health.dispatch(new AsyncResource(new Promise<string>((_resolve, fail) => {
      reject = fail;
    })));
    root.flush();
    assertEquals(text(container.children[0].children[2]), "fulfilled");
    reject("health-failed");
    await Promise.resolve();
    let rejected = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      root.flush();
      if (text(container.children[0].children[2]) === "failed") {
        rejected = true;
        break;
      }
    }
    assert(rejected, "rejected health resource did not wake its boundary");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile, revision);
  }
});

Deno.test("blocked resource proof does not cover an opaque same-Store sibling", async () => {
  const file = "realtime-store-progress/shared-health.tsx";
  const revision = "realtime-shared-health-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: file,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {},
      execution_order: [] } });
  const oldReady = new AsyncResource(Promise.resolve("old"));
  await Promise.resolve();
  const health = createAsyncStore(oldReady,
    (_old: AsyncResource<string>, next: AsyncResource<string>) => next);
  const clock = createAsyncStore(0, (_old: number, next: number) => next);
  let replacement: AsyncResource<string> | null = null;
  let outsideRenders = 0;
  const Outside = defineComponent(`${file}#component:Outside`, () => {
    outsideRenders++;
    const resource = useStoreAt(`${file}#component:Outside#store:0`, health);
    return jsx("output", { key: "outside", "data-resource":
      resource === oldReady ? "old" : resource === replacement ? "new" : "pending" });
  });
  const Health = defineComponent(`${file}#component:Health`, () => {
    const resource = useStoreAt(`${file}#component:Health#store:0`, health);
    return jsx("span", { key: "health" },
      useAt(`${file}#component:Health#resource:0`, resource) as string);
  });
  const clockId = `${file}#component:Clock`;
  const clockUse = `${clockId}#store:0`;
  const Clock = defineComponent(clockId,
    (props: { store: AsyncStore<number, number> }) => jsx("output", {
      key: "clock", "data-epoch": useStoreAt(clockUse, props.store),
    }), { propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 1, componentProgramId: clockId, moduleRevision: revision,
      storeUseSiteId: clockUse, storeProp: "store",
      host: { tag: "output", key: "clock", child: null,
        props: [["data-epoch", { kind: "input", index: 0 }]] },
    } });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "realtime-shared-health", scheduleCommit() {},
  });
  try {
    root.mount(jsx("main", {}, [
      jsx(Outside, { key: "outside-owner" }),
      jsx(Clock, { key: "clock-owner", store: clock }),
      jsx(Suspense, { key: "health-boundary",
        __nativeBoundarySite: `${file}#boundary:Health`,
        fallback: jsx("span", { key: "health-fallback" }, "waiting"),
        children: jsx(Health, { key: "health-owner" }),
      }),
    ]));
    health.dispatch(new AsyncResource(new Promise<string>(() => {})));
    root.flush();
    const beforeClock = outsideRenders;
    clock.dispatch(1);
    assertEquals(root.flush(), true);
    assert(outsideRenders > beforeClock,
      "blocked Health reader improperly exempted its opaque same-Store sibling");
    replacement = new AsyncResource(Promise.resolve("replacement"));
    await Promise.resolve();
    health.dispatch(replacement);
    for (let attempt = 0; attempt < 3; attempt++) {
      root.flush();
      if (container.children[0].children[0].props["data-resource"] === "new") break;
    }
    assertEquals(container.children[0].children[0].props["data-resource"], "new");
    assertEquals(text(container.children[0].children[2]), "replacement");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(file, revision);
  }
});

Deno.test("parked boundary keeps host-time local and ancestor actions queued", async () => {
  const file = "realtime-store-progress/host-time-controls.tsx";
  const ready = new AsyncResource(Promise.resolve("healthy"));
  await Promise.resolve();
  const health = createAsyncStore(ready,
    (_old: AsyncResource<string>, next: AsyncResource<string>) => next);
  const control = createAsyncStore(0, (_old: number, next: number) => next);
  const studio = createAsyncStore(["old"],
    (_old: string[], next: string[]) => [...next]);
  let setLocal!: (next: number) => boolean;
  const Health = defineComponent(`${file}#Health`,
    (props: { control: number }) => {
      const [local, set] = useStateAt(`${file}#Health#local`, 0);
      setLocal = set;
      const resource = useStoreAt(`${file}#Health#store`, health);
      return jsx("span", { key: "health", "data-local": local,
        "data-control": props.control },
      useAt(`${file}#Health#resource`, resource) as string);
    });
  const Ancestor = defineComponent(`${file}#Ancestor`, () => {
    const value = useStoreAt(`${file}#Ancestor#store`, control);
    return jsx(Suspense, { key: "health-boundary",
      __nativeBoundarySite: `${file}#boundary`,
      fallback: jsx("span", { key: "fallback" }, "waiting"),
      children: jsx(Health, { key: "health-owner", control: value }),
    });
  });
  const Scene = defineComponent(`${file}#Scene`, () => {
    const keys = useStoreAt(`${file}#Scene#store`, studio);
    return jsx("section", { key: "scene" }, keys.map((key) =>
      jsx("span", { key, "data-id": key })));
  });
  const host = new MemoryVDOMHost();
  let hostWriteAction: (() => void) | null = null;
  const originalSetProp = host.setProp;
  host.setProp = (node, name, value, previous) => {
    originalSetProp.call(host, node, name, value, previous);
    if (name === "data-id" &&
      (value === "local-edit" || value === "ancestor-edit")) {
      const action = hostWriteAction;
      hostWriteAction = null;
      action?.();
    }
  };
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "realtime-host-time-controls", scheduleCommit() {},
  });
  const healthNode = () => container.children[0].children[1];
  const sceneNode = () => container.children[0].children[0].children[0];
  try {
    root.mount(jsx("main", {}, [jsx(Scene, { key: "scene-owner" }),
      jsx(Ancestor, { key: "ancestor-owner" })]));
    assertEquals(text(healthNode()), "healthy");
    const acceptedSetLocal = setLocal;
    health.dispatch(new AsyncResource(new Promise<string>(() => {})));
    root.flush();
    hostWriteAction = () => { assertEquals(acceptedSetLocal(1), true); };
    studio.dispatch(["local-edit"]);
    assertEquals(root.flush(), true);
    assertStrictEquals(hostWriteAction, null);
    assertEquals(sceneNode().props["data-id"], "local-edit");
    assertEquals(healthNode().props["data-local"], 0);
    assertEquals(text(healthNode()), "healthy");
    const localReady = new AsyncResource(Promise.resolve("local-ready"));
    await Promise.resolve();
    health.dispatch(localReady);
    for (let attempt = 0; attempt < 3; attempt++) {
      root.flush();
      if (text(healthNode()) === "local-ready") break;
    }
    assertEquals(text(healthNode()), "local-ready");
    assertEquals(healthNode().props["data-local"], 1);
    health.dispatch(new AsyncResource(new Promise<string>(() => {})));
    root.flush();
    hostWriteAction = () => { control.dispatch(1); };
    studio.dispatch(["ancestor-edit"]);
    assertEquals(root.flush(), true);
    assertStrictEquals(hostWriteAction, null);
    assertEquals(sceneNode().props["data-id"], "ancestor-edit");
    assertEquals(healthNode().props["data-control"], 0);
    assertEquals(text(healthNode()), "local-ready");
    const ancestorReady = new AsyncResource(Promise.resolve("ancestor-ready"));
    await Promise.resolve();
    health.dispatch(ancestorReady);
    for (let attempt = 0; attempt < 3; attempt++) {
      root.flush();
      if (text(healthNode()) === "ancestor-ready") break;
    }
    assertEquals(text(healthNode()), "ancestor-ready");
    assertEquals(healthNode().props["data-control"], 1);
    assertEquals(healthNode().props["data-local"], 1);
  } finally {
    root.dispose();
  }
});
