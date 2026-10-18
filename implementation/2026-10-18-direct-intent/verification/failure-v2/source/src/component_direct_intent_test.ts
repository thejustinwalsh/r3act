import { assertEquals, assertStrictEquals, assertThrows } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import { AsyncStore, createAsyncStore } from "./async_store_runtime.ts";
import {
  ComponentStateRoot,
  bindStatePropAt,
  defineComponent,
  Suspense,
  useAt,
  useEffectAt,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import {
  invalidateCompiledSemanticPlan,
  registerCompiledSemanticPlan,
} from "./compiled_semantic_plan.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";
import { OwnerStateWorld, type StateCellHandle } from "./owner_state_world.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => resolve = yes);
  return { promise, resolve };
};
const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");

function scene(
  id: string,
  host: MemoryVDOMHost = new MemoryVDOMHost(),
  onSelectedStoreRead: () => void = () => {},
  scheduleCommit: (commit: () => void) => void = () => {},
) {
  const oldGate = deferred<string>();
  const pendingGate = deferred<string>();
  const oldValue = deferred<string>();
  const firstValue = deferred<string>();
  const latestValue = deferred<string>();
  const oldGateResource = new AsyncResource(oldGate.promise);
  const pendingGateResource = new AsyncResource(pendingGate.promise);
  const oldResource = new AsyncResource(oldValue.promise);
  const firstResource = new AsyncResource(firstValue.promise);
  const latestResource = new AsyncResource(latestValue.promise);
  const gate = createAsyncStore(oldGateResource,
    (_: AsyncResource<string>, action: AsyncResource<string>) => action);
  const selection = createAsyncStore(firstResource,
    (_: AsyncResource<string>, action: AsyncResource<string>) => action);
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: id, scheduleCommit,
  });
  let setLocal!: (value: number) => boolean;
  let cleanups = 0;
  const Gate = defineComponent(`${id}:Gate`, () => {
    const resource = useStoreAt("gate", gate);
    return jsx("div", { key: "gate-host" }, useAt("gate-resource", resource));
  });
  const Choice = defineComponent(`${id}:Choice`, (props: {
    selection: AsyncResource<string> | AsyncStore<AsyncResource<string>, AsyncResource<string>>;
    label: string;
  }) => {
    const resource = props.selection instanceof AsyncResource
      ? props.selection : useStoreAt("selection", props.selection);
    if (props.selection instanceof AsyncStore) onSelectedStoreRead();
    return jsx("div", { key: "choice-host" },
      `${props.label}:${useAt("choice-resource", resource)}`);
  });
  const Local = defineComponent(`${id}:Local`, () => {
    const [value, set] = useStateAt("local", 0);
    setLocal = set;
    useEffectAt("local-effect", () => () => { cleanups++; });
    return jsx("output", { key: "local-host" }, String(value));
  });
  const tree = (
    label: string,
    source: AsyncResource<string> | AsyncStore<AsyncResource<string>, AsyncResource<string>>,
  ) => jsx("section", {}, [
    jsx(Suspense, { key: "gate", __nativeBoundarySite: "gate",
      fallback: jsx("div", { key: "gate-host" }, "gate-loading"),
      children: jsx(Gate, { key: "gate-child" }) }),
    jsx(Suspense, { key: "choice", __nativeBoundarySite: "choice",
      fallback: jsx("div", { key: "choice-host" }, "choice-loading"),
      children: jsx(Choice, { key: "choice-child", label, selection: source }) }),
    jsx(Local, { key: "local" }),
  ]);
  return { root, container, gate, selection, tree, setLocal: () => setLocal,
    cleanups: () => cleanups, oldGate, pendingGate, oldValue, firstValue,
    latestValue, oldResource, firstResource, latestResource,
    pendingGateResource };
}

Deno.test("blocked direct updates retain latest tree and newly observed Store wake", async () => {
  const f = scene("direct-intent-latest");
  try {
    f.oldGate.resolve("old-gate");
    f.oldValue.resolve("old-choice");
    await Promise.resolve();
    f.root.mount(f.tree("old", f.oldResource));
    const acceptedVersion = f.root.publicationVersion;
    const localHost = f.container.children[0].children[2];
    const liveSet = f.setLocal();
    f.gate.dispatch(f.pendingGateResource);
    f.root.flush();
    assertEquals(f.root.publicationVersion, acceptedVersion);
    f.root.update(f.tree("first", f.selection));
    f.root.update(f.tree("latest", f.selection));
    assertEquals(f.root.publicationVersion, acceptedVersion);
    assertEquals(f.selection.diagnostics().readers, 0);
    assertEquals(f.selection.diagnostics().listeners > 0, true);
    f.firstValue.resolve("first-value");
    await Promise.resolve();
    f.root.flush();
    assertEquals(f.root.publicationVersion, acceptedVersion);
    f.selection.dispatch(f.latestResource);
    f.latestValue.resolve("latest-value");
    f.pendingGate.resolve("new-gate");
    await Promise.resolve();
    f.root.flush();
    assertEquals(text(f.container.children[0].children[1]), "latest:latest-value");
    assertEquals(text(f.container.children[0].children[0]), "new-gate");
    assertStrictEquals(f.container.children[0].children[2], localHost);
    liveSet(7);
    f.root.flush();
    assertEquals(text(localHost), "7");
    assertEquals(f.cleanups(), 0);
    assertEquals(f.selection.diagnostics().readers > 0, true);
  } finally {
    f.root.dispose();
  }
});

Deno.test("host-time state action after direct-intent acceptance gets a scheduled flush", async () => {
  let liveSet: ((value: number) => boolean) | null = null;
  let dispatched = false;
  class Host extends MemoryVDOMHost {
    override setText(node: MemoryNode, value: string) {
      super.setText(node, value);
      if (value === "desired:ready-choice" && !dispatched) {
        dispatched = true;
        liveSet?.(9);
      }
    }
  }
  const scheduled: Array<() => void> = [];
  const f = scene("direct-intent-host-newer", new Host(), undefined,
    (commit) => { scheduled.push(commit); });
  try {
    f.oldGate.resolve("old-gate");
    f.oldValue.resolve("old-choice");
    await Promise.resolve();
    f.root.mount(f.tree("old", f.oldResource));
    liveSet = f.setLocal();
    f.gate.dispatch(f.pendingGateResource);
    f.root.flush();
    f.root.update(f.tree("desired", f.selection));
    f.firstValue.resolve("ready-choice");
    f.pendingGate.resolve("ready-gate");
    await Promise.resolve();
    scheduled.length = 0;
    f.root.flush();
    assertEquals(dispatched, true);
    assertEquals(text(f.container.children[0].children[2]), "0");
    assertEquals(scheduled.length > 0, true);
    for (let turns = 0; scheduled.length > 0 && turns < 8; turns++) {
      scheduled.shift()!();
    }
    assertEquals(text(f.container.children[0].children[2]), "9");
    assertEquals(f.root.diagnostics().pendingChangeCount, 0);
  } finally {
    f.root.dispose();
  }
});

Deno.test("new World action wakes a blocked direct tree through the captured scheduler", async () => {
  const old = deferred<string>();
  const pending = deferred<string>();
  const ready = deferred<string>();
  const oldResource = new AsyncResource(old.promise);
  const pendingResource = new AsyncResource(pending.promise);
  const readyResource = new AsyncResource(ready.promise);
  const scheduled: Array<() => void> = [];
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "direct-intent-world-wake",
    scheduleCommit(commit) { scheduled.push(commit); },
  });
  let setMode!: (value: number) => boolean;
  const View = defineComponent("direct-intent-world-wake:View",
    (props: { label: string }) => {
      const [mode, set] = useStateAt("mode", 0);
      setMode = set;
      const resource = mode === 0 ? oldResource :
        mode === 1 ? pendingResource : readyResource;
      return jsx("div", { key: "view-host" },
        `${props.label}:${useAt("resource", resource)}`);
    });
  try {
    old.resolve("old");
    ready.resolve("ready");
    await Promise.resolve();
    root.mount(jsx(Suspense, { key: "boundary", __nativeBoundarySite: "boundary",
      fallback: jsx("div", { key: "view-host" }, "loading"),
      children: jsx(View, { key: "view", label: "old" }) }));
    const liveSet = setMode;
    liveSet(1);
    root.flush();
    scheduled.length = 0;
    root.update(jsx(Suspense, { key: "boundary", __nativeBoundarySite: "boundary",
      fallback: jsx("div", { key: "view-host" }, "loading"),
      children: jsx(View, { key: "view", label: "desired" }) }));
    assertEquals(text(container.children[0]), "old:old");
    scheduled.length = 0;
    liveSet(2);
    assertEquals(scheduled.length > 0, true);
    for (let turns = 0; scheduled.length > 0 && turns < 8; turns++) {
      scheduled.shift()!();
    }
    assertEquals(text(container.children[0]), "desired:ready");
    assertEquals(root.diagnostics().pendingChangeCount, 0);
  } finally {
    root.dispose();
  }
});

Deno.test("older prepared full candidate cannot supersede a blocked newer direct intent", async () => {
  const f = scene("direct-intent-stale");
  try {
    f.oldGate.resolve("old-gate");
    f.oldValue.resolve("old-choice");
    await Promise.resolve();
    f.root.mount(f.tree("old", f.oldResource));
    const older = f.root.prepare(f.tree("older", f.oldResource));
    f.gate.dispatch(f.pendingGateResource);
    f.root.flush();
    f.root.update(f.tree("newer", f.selection));
    assertEquals(older.validate(), false);
    older.discard();
    const pending = f.root.preparePending();
    assertEquals(pending?.blocked, true);
    pending?.discard();
    f.firstValue.resolve("first-value");
    f.pendingGate.resolve("new-gate");
    await Promise.resolve();
    f.root.flush();
    assertEquals(text(f.container.children[0].children[1]), "newer:first-value");
  } finally {
    f.root.dispose();
  }
});

Deno.test("prepared retained work declines after a blocked direct replacement", async () => {
  const old = deferred<string>();
  const pending = deferred<string>();
  const oldResource = new AsyncResource(old.promise);
  const pendingResource = new AsyncResource(pending.promise);
  const mode = createAsyncStore(oldResource,
    (_: AsyncResource<string>, action: AsyncResource<string>) => action);
  const world = new OwnerStateWorld();
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "direct-intent-retained-conflict", world, scheduleCommit() {},
  });
  let setPosition!: (value: number) => boolean;
  let handle: StateCellHandle | null = null;
  const unsubscribe = world.subscribeDirtyCells((dirty) => { handle = dirty; });
  const Gate = defineComponent("direct-intent-retained-conflict:Gate", () =>
    jsx("div", { key: "gate-host" },
      useAt("resource", useStoreAt("mode", mode))));
  const programId = "direct-intent-retained-conflict:Position";
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
  const tree = (label: string) => jsx("section", { label }, [
    jsx(Suspense, { key: "gate", __nativeBoundarySite: "gate",
      fallback: jsx("div", { key: "gate-host" }, "loading"),
      children: jsx(Gate, { key: "gate-child" }) }),
    jsx(Position, { key: "position" }),
  ]);
  try {
    old.resolve("old");
    await Promise.resolve();
    root.mount(tree("old"));
    setPosition(7);
    const cut = root.prepareRetained([handle!]);
    assertEquals(cut !== null, true);
    mode.dispatch(pendingResource);
    root.update(tree("desired"));
    assertEquals(cut?.validate(), false);
    assertEquals(root.prepareRetained([handle!]), null);
    cut?.discard();
    assertEquals(container.children[0].props.label, "old");
  } finally {
    unsubscribe();
    root.dispose();
  }
});

Deno.test("a later prepared full candidate supersedes only its captured pending intent", async () => {
  const f = scene("direct-intent-queued-replacement");
  try {
    f.oldGate.resolve("old-gate");
    f.oldValue.resolve("old-choice");
    await Promise.resolve();
    f.root.mount(f.tree("old", f.oldResource));
    f.gate.dispatch(f.pendingGateResource);
    f.root.flush();
    f.root.update(f.tree("pending", f.selection));
    f.pendingGate.resolve("ready-gate");
    await Promise.resolve();
    const queued = f.root.prepare(f.tree("queued", f.oldResource));
    assertEquals(queued.validate(), true);
    queued.commitHost();
    queued.publish();
    queued.runEffects();
    assertEquals(text(f.container.children[0].children[1]), "queued:old-choice");
    f.firstValue.resolve("obsolete");
    await Promise.resolve();
    f.root.flush();
    assertEquals(text(f.container.children[0].children[1]), "queued:old-choice");
    assertEquals(f.selection.diagnostics().listeners, 0);
  } finally {
    f.root.dispose();
  }
});

Deno.test("nested preparation update keeps the newer direct intent", async () => {
  let onRead = () => {};
  const f = scene("direct-intent-nested", undefined, () => onRead());
  try {
    f.oldGate.resolve("old-gate");
    f.oldValue.resolve("old-choice");
    await Promise.resolve();
    f.root.mount(f.tree("old", f.oldResource));
    f.gate.dispatch(f.pendingGateResource);
    f.root.flush();
    let nested = false;
    onRead = () => {
      if (nested) return;
      nested = true;
      f.root.update(f.tree("newer", f.selection));
    };
    f.root.update(f.tree("older", f.selection));
    assertEquals(nested, true);
    f.firstValue.resolve("ready-choice");
    f.pendingGate.resolve("ready-gate");
    await Promise.resolve();
    f.root.flush();
    assertEquals(text(f.container.children[0].children[1]), "newer:ready-choice");
  } finally {
    f.root.dispose();
  }
});

Deno.test("postpublication effect error does not resurrect accepted direct intent", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "direct-intent-effect-error", scheduleCommit() {},
  });
  const Effect = defineComponent("direct-intent-effect-error:Effect", () => {
    useEffectAt("throw", () => { throw new Error("desired effect failed"); });
    return jsx("span", { key: "effect-host" }, "desired");
  });
  try {
    root.mount(jsx("section", {}, jsx("span", { key: "old" }, "old")));
    const previous = root.publicationVersion;
    assertThrows(() => root.update(jsx("section", {},
      jsx(Effect, { key: "effect" }))), Error, "Component effects failed");
    assertEquals(root.publicationVersion, previous + 1);
    assertEquals(text(container.children[0]), "desired");
    root.flush();
    assertEquals(text(container.children[0]), "desired");
  } finally {
    root.dispose();
  }
});

Deno.test("disposing a blocked direct intent releases its newly observed Store lease", async () => {
  const f = scene("direct-intent-dispose");
  f.oldGate.resolve("old-gate");
  f.oldValue.resolve("old-choice");
  await Promise.resolve();
  f.root.mount(f.tree("old", f.oldResource));
  f.gate.dispatch(f.pendingGateResource);
  f.root.flush();
  f.root.update(f.tree("desired", f.selection));
  assertEquals(f.selection.diagnostics().listeners > 0, true);
  f.root.dispose();
  assertEquals(f.selection.diagnostics().listeners, 0);
  assertEquals(f.selection.diagnostics().readers, 0);
});

Deno.test("three stale direct attempts reject instead of retaining an unwakeable tree", async () => {
  let mutate = () => {};
  const f = scene("direct-intent-stale-exhaustion", undefined, () => mutate());
  try {
    f.oldGate.resolve("old-gate");
    f.oldValue.resolve("old-choice");
    f.firstValue.resolve("new-choice");
    const churn = [1, 2, 3].map((index) =>
      new AsyncResource(Promise.resolve(`churn-${index}`)));
    await Promise.resolve();
    f.root.mount(f.tree("old", f.oldResource));
    const accepted = f.root.publicationVersion;
    let renders = 0;
    mutate = () => {
      if (++renders <= 3) f.selection.dispatch(churn[renders - 1]);
    };
    assertThrows(() => f.root.update(f.tree("unstable", f.selection)), Error,
      "Direct update stayed stale without a dependency wake");
    assertEquals(renders, 3);
    assertEquals(f.root.publicationVersion, accepted);
    assertEquals(f.selection.diagnostics().listeners, 0);
    f.root.update(f.tree("stable", f.selection));
    assertEquals(text(f.container.children[0].children[1]), "stable:churn-3");
  } finally {
    f.root.dispose();
  }
});

Deno.test("failed pending intent restores accepted settled-boundary retry work", async () => {
  const sourceFile = "direct-intent/restore-boundary.tsx";
  registerCompiledSemanticPlan({
    schema_version: 1, source_file: sourceFile, module_revision: "restore-v1",
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {},
      execution_order: [] },
  });
  const old = deferred<string>();
  const pending = deferred<string>();
  const sibling = deferred<string>();
  const oldResource = new AsyncResource(old.promise);
  const pendingResource = new AsyncResource(pending.promise);
  const siblingResource = new AsyncResource(sibling.promise);
  const mode = createAsyncStore(oldResource,
    (_: AsyncResource<string>, action: AsyncResource<string>) => action);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "direct-intent-restore-retry", scheduleCommit() {},
  });
  const A = defineComponent("direct-intent-restore-retry:A", () =>
    jsx("div", { key: "a-host" },
      useAt("resource", useStoreAt("mode", mode))));
  const bId = `${sourceFile}#component:B`;
  const B = defineComponent(bId, (props: { resource: AsyncResource<string> }) =>
    jsx("div", { key: "b-host" }, useAt("resource", props.resource)), {
    propOnlySites: [],
    closedResourceHostProgram: {
      schemaVersion: 1, componentProgramId: bId, moduleRevision: "restore-v1",
      resourceUseSiteId: `${bId}#resource:0`, resourceProp: "resource",
      host: { tag: "div", key: "b-host", props: [], child: "resource-value" },
    },
  });
  let bombCalls = 0;
  const Bomb = defineComponent("direct-intent-restore-retry:Bomb", () => {
    if (++bombCalls > 1) throw new Error("desired tree render failed");
    return jsx("aside", { key: "bomb" }, "prepared");
  });
  const tree = (withBomb: boolean) => jsx("section", {}, [
    jsx(Suspense, { key: "a", __nativeBoundarySite: "a",
      fallback: jsx("div", { key: "a-host" }, "a-loading"),
      children: jsx(A, { key: "a-child" }) }),
    jsx(Suspense, { key: "b", __nativeBoundarySite: "b",
      fallback: jsx("div", { key: "b-host" }, "b-loading"),
      children: jsx(B, { key: "b-child", resource: siblingResource }) }),
    ...(withBomb ? [jsx(Bomb, { key: "bomb" })] : []),
  ]);
  try {
    old.resolve("old-a");
    await Promise.resolve();
    root.mount(tree(false));
    mode.dispatch(pendingResource);
    root.flush();
    root.update(tree(true));
    sibling.resolve("ready-b");
    await Promise.resolve();
    assertThrows(() => root.flush(), Error, "desired tree render failed");
    root.flush();
    assertEquals(text(container.children[0].children[1]), "ready-b");
    assertEquals(text(container.children[0].children[0]), "old");
    assertEquals(bombCalls, 2);
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("direct intent host failure keeps accepted revision and quarantines root", async () => {
  let armed = false;
  class Host extends MemoryVDOMHost {
    override setText(node: MemoryNode, value: string) {
      super.setText(node, value);
      if (armed && value.includes("desired:")) throw new Error("direct intent host failed");
    }
  }
  const f = scene("direct-intent-host-failure", new Host());
  try {
    f.oldGate.resolve("old-gate");
    f.oldValue.resolve("old-choice");
    await Promise.resolve();
    f.root.mount(f.tree("old", f.oldResource));
    const accepted = f.root.publicationVersion;
    f.gate.dispatch(f.pendingGateResource);
    f.root.flush();
    f.root.update(f.tree("desired", f.selection));
    f.firstValue.resolve("new-choice");
    f.pendingGate.resolve("new-gate");
    await Promise.resolve();
    armed = true;
    assertThrows(() => f.root.flush(), Error, "direct intent host failed");
    assertEquals(f.root.publicationVersion, accepted);
    assertThrows(() => f.root.flush(), Error, "host commit failure");
    assertEquals(f.selection.diagnostics().listeners, 0);
  } finally {
    f.root.dispose();
  }
});

Deno.test("invalidation cancels a pending direct intent and its scheduled resource wake", async () => {
  const sourceFile = "direct-intent/hmr.tsx";
  registerCompiledSemanticPlan({
    schema_version: 1, source_file: sourceFile, module_revision: "direct-v1",
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {},
      execution_order: [] },
  });
  const scheduled: Array<() => void> = [];
  const f = scene("direct-intent-hmr", undefined, undefined,
    (commit) => { scheduled.push(commit); });
  try {
    f.oldGate.resolve("old-gate");
    f.oldValue.resolve("old-choice");
    await Promise.resolve();
    f.root.mount(f.tree("old", f.oldResource));
    const accepted = f.root.publicationVersion;
    f.gate.dispatch(f.pendingGateResource);
    f.root.flush();
    f.root.update(f.tree("desired", f.selection));
    assertEquals(f.selection.diagnostics().listeners > 0, true);
    invalidateCompiledSemanticPlan(sourceFile, "direct-v1");
    assertEquals(f.selection.diagnostics().listeners, 0);
    f.firstValue.resolve("ready");
    f.pendingGate.resolve("ready-gate");
    await Promise.resolve();
    for (const commit of scheduled) commit();
    assertEquals(f.root.publicationVersion, accepted);
    assertThrows(() => f.root.flush(), Error, "Compiled module changed");
  } finally {
    f.root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("resource version getter after host write cannot partially accept Store readers", async () => {
  let hostWrote = false;
  class Resource extends AsyncResource<string> {
    override get version() {
      if (hostWrote) throw new Error("resource version after host");
      return super.version;
    }
  }
  class Host extends MemoryVDOMHost {
    override createText(value: string) {
      const node = super.createText(value);
      if (value === "desired") hostWrote = true;
      return node;
    }
    override setText(node: MemoryNode, value: string) {
      super.setText(node, value);
      if (value === "desired") hostWrote = true;
    }
  }
  const host = new Host();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "direct-intent-resource-getter", scheduleCommit() {},
  });
  const store = createAsyncStore("desired", (_: string, action: string) => action);
  const resource = new Resource(Promise.resolve("desired"));
  const Desired = defineComponent("direct-intent-resource-getter:Desired", () => {
    const value = useStoreAt("value", store);
    return jsx("span", { key: "shared-host" },
      `${value === useAt("resource", resource) ? value : "unexpected"}`);
  });
  try {
    await Promise.resolve();
    root.mount(jsx("span", { key: "shared-host" }, "old"));
    const accepted = root.publicationVersion;
    assertThrows(() => root.update(jsx(Desired, { key: "desired" })), Error,
      "resource version after host");
    assertEquals(hostWrote, true);
    assertEquals(root.publicationVersion, accepted);
    assertEquals(root.diagnostics().ownerCount, 0);
    assertEquals(store.diagnostics().readers, 0);
    assertEquals(text(container.children[0]), "desired");
    assertThrows(() => root.flush(), Error, "host commit failure");
  } finally {
    root.dispose();
  }
});
