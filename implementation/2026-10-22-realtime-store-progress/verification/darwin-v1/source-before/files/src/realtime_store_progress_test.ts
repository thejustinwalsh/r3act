import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import { createAsyncStore, type AsyncStore } from "./async_store_runtime.ts";
import { ComponentStateRoot, Suspense, defineComponent, useAt, useStoreAt } from
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
    for (let epoch = 15; epoch <= 17; epoch++) {
      clock.dispatch(epoch);
      assertEquals(root.flush(), true);
      assertEquals(clockValue(container), epoch,
        "held health resource stopped independent closed clock progress");
      assertStrictEquals(container.children[0].children[2], healthHost);
      assertEquals(text(healthHost), "healthy");
    }
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile, revision);
  }
});
