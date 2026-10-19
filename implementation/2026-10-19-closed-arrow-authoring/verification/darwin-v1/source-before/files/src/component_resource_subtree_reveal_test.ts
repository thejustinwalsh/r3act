import { assert, assertEquals, assertStrictEquals, assertThrows } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import {
  bindStatePropAt, ComponentStateRoot, defineComponent, Suspense,
  useAt, useEffectAt, useStateAt, useStoreAt,
} from "./component_state_runtime.ts";
import { invalidateCompiledSemanticPlan, registerCompiledSemanticPlan } from "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};
const text = (node: MemoryNode): string => (node.text ?? "") + node.children.map(text).join("");
const input = { kind: "input", index: 0 } as const;
const plusOne = { kind: "binary", operator: "+", left: input,
  right: { kind: "literal", value: 1 } } as const;

async function fixture(id: string, host = new MemoryVDOMHost(), unsafeFallback = false, structured = false) {
  const source = `resource-subtree/${id}.tsx`;
  registerCompiledSemanticPlan({ schema_version: 1, source_file: source,
    module_revision: "resource-subtree-v1", owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const firstA = new AsyncResource(Promise.resolve("old-a"));
  const pendingA = deferred<string>(), pendingB = deferred<number>();
  const nextA = new AsyncResource(pendingA.promise), resourceB = new AsyncResource(pendingB.promise);
  await Promise.resolve();
  const mode = createAsyncStore(0, (_previous: number, value: number) => value);
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: id, scheduleCommit() {} });
  let readyRenders = 0, setFallback!: (value: number) => boolean;
  let setWorld!: (value: number) => boolean;
  const cleanup: string[] = [];
  let cleanupAction: (() => void) | null = null;
  const A = defineComponent(`${id}:A`, () => jsx("div", { key: "a-host" },
    useAt("a", useStoreAt("mode", mode) === 0 ? firstA : nextA) as string));
  const Inner = defineComponent(`${id}:Inner`, () => {
    const [value, setter] = useStateAt("fallback-state", 0);
    useEffectAt("lifetime", () => { setFallback = setter; return () => {
      cleanup.push("inner"); cleanupAction?.();
    }; });
    return jsx("span", { key: "fallback-text", ...(unsafeFallback ? { onClick() {} } : {}) }, `waiting:${value}`);
  });
  const Fallback = defineComponent(`${id}:Fallback`, () => {
    useEffectAt("lifetime", () => () => { cleanup.push("outer"); });
    return jsx("div", { key: "b-host", ...(structured ? { style: { color: "gray" } } : {}) },
      jsx(Inner, { key: "inner-owner" }));
  });
  const programId = `${source}#component:Ready`;
  const styleProp = ["style", { kind: "style", entries: [
    ["--ready", input], ["color", { kind: "literal", value: "red" }],
  ] }] as const;
  const Ready = defineComponent(programId, (props: { resource: AsyncResource<number> }) => {
    readyRenders++;
    const value = useAt("ready", props.resource) as number;
    return jsx("output", { key: "b-host", "data-ready": value,
      ...(structured ? { style: { "--ready": value, color: "red" } } : {}) }, [
      jsx("span", { key: "left", "data-value": value }, value),
      jsx("span", { key: "right", "data-value": value + 1 }, value + 1),
    ]);
  }, { propOnlySites: [], closedResourceHostProgram: {
    schemaVersion: structured ? 3 : 2, componentProgramId: programId, moduleRevision: "resource-subtree-v1",
    resourceUseSiteId: `${programId}#store:0`, resourceProp: "resource",
    host: { tag: "output", key: "b-host", props: [["data-ready", input],
      ...(structured ? [styleProp] : [])], children: [
      { kind: "host", host: { tag: "span", key: "left", props: [["data-value", input]],
        children: [{ kind: "text", expression: input }] } },
      { kind: "host", host: { tag: "span", key: "right", props: [["data-value", plusOne]],
        children: [{ kind: "text", expression: plusOne }] } },
    ] },
  } });
  const worldId = `${id}:World`;
  const World = defineComponent(worldId, () => {
    const [, setter] = useStateAt("world", 0);
    useEffectAt("install", () => { setWorld = setter; });
    return jsx("output", { key: "world-host", "data-world": bindStatePropAt("world", (value) => value, {
      schemaVersion: 2, ownerProgramId: worldId, sinkId: "world", sourceSites: ["world"],
      closedExpression: input,
    }) });
  }, { propOnlySites: ["world"], stateLayout: { schemaVersion: 1, programId: worldId,
    slots: [{ siteId: "world", slot: 0 }] } });
  const tree = jsx("main", {}, [
    jsx(Suspense, { key: "a", __nativeBoundarySite: "a", fallback: jsx("div", { key: "a-host" }, "loading-a"), children: jsx(A, {}) }),
    jsx(Suspense, { key: "b", __nativeBoundarySite: "b", fallback: jsx(Fallback, {}), children: jsx(Ready, { resource: resourceB }) }),
    jsx(World, {}),
  ]);
  root.mount(tree);
  const main = container.children[0];
  return { root, host, main, mode, pendingA, pendingB, resourceB, cleanup,
    get renders() { return readyRenders; },
    fallbackSet(value: number) { return setFallback(value); },
    worldSet(value: number) { return setWorld(value); },
    cleanupAction(action: () => void) { cleanupAction = action; },
    reconcile() { root.update(tree); },
    dispose() { root.dispose(); invalidateCompiledSemanticPlan(source); },
  };
}

Deno.test("resource subtree reveals and retires nested fallback owners beside pending sibling", async () => {
  const f = await fixture("resource-subtree-owned");
  try {
    const a = f.main.children[0], oldFallback = f.main.children[1];
    f.mode.dispatch(1); f.root.flush();
    const renders = f.renders, owners = f.root.diagnostics().ownerCount;
    const before = f.root.publicationVersion;
    f.pendingB.resolve(4); await Promise.resolve(); f.root.flush();
    assertStrictEquals(f.main.children[0], a);
    assertEquals(text(f.main), "old-a45");
    assertEquals(f.renders, renders, "closed reveal replayed Ready");
    assert(f.main.children[1] !== oldFallback);
    assertEquals(f.cleanup, ["outer", "inner"]);
    assertEquals(f.root.diagnostics().ownerCount, owners - 1);
    assertEquals(f.root.publicationVersion, before + 1);
    assertThrows(() => f.fallbackSet(1), Error, "not alive");
    const ready = f.main.children[1];
    f.pendingA.resolve("new-a"); await Promise.resolve(); f.root.flush();
    assertEquals(text(f.main), "new-a45");
    assertStrictEquals(f.main.children[1], ready);
    assertEquals(f.cleanup.length, 2);
  } finally { f.dispose(); }
});

Deno.test("structured resource style reveals beside an independent pending branch", async () => {
  const f = await fixture("resource-subtree-style", new MemoryVDOMHost(), false, true);
  try {
    const a = f.main.children[0], fallback = f.main.children[1];
    f.mode.dispatch(1); f.root.flush();
    const renders = f.renders;
    f.pendingB.resolve(4); await Promise.resolve(); f.root.flush();
    assertStrictEquals(f.main.children[0], a);
    assert(f.main.children[1] !== fallback);
    const readyStyle = f.main.children[1].props.style as Record<string, unknown>;
    assertEquals(readyStyle["--ready"], 4);
    assertEquals(readyStyle.color, "red");
    assertEquals(f.renders, renders);
    assertEquals(f.cleanup, ["outer", "inner"]);
    const ready = f.main.children[1];
    f.pendingA.resolve("new-a"); await Promise.resolve(); f.root.flush();
    assertStrictEquals(f.main.children[1], ready);
    assertEquals(text(f.main), "new-a45");
  } finally { f.dispose(); }
});

Deno.test("resource reveal preserves a newer independent host-time World action", async () => {
  class ReentrantHost extends MemoryVDOMHost {
    action: (() => void) | null = null;
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "data-ready") { const action = this.action; this.action = null; action?.(); }
    }
  }
  const host = new ReentrantHost(), f = await fixture("resource-subtree-reentry", host);
  try {
    f.mode.dispatch(1); f.root.flush();
    host.action = () => { assert(f.worldSet(9)); };
    f.pendingB.resolve(5); await Promise.resolve(); f.root.flush();
    assertEquals(f.main.children[1].props["data-ready"], 5);
    f.root.flush();
    assertEquals(f.main.children[2].props["data-world"], 9);
    assertEquals(text(f.main), "old-a56");
    assertEquals(f.root.diagnostics().pendingChangeCount, 0);
  } finally { f.dispose(); }
});

Deno.test("resource reveal cleanup errors happen after accepted owner retirement", async () => {
  const f = await fixture("resource-subtree-cleanup-error");
  try {
    f.mode.dispatch(1); f.root.flush();
    f.cleanupAction(() => { throw new Error("fallback cleanup failure"); });
    f.pendingB.resolve(2); await Promise.resolve();
    assertThrows(() => f.root.flush(), AggregateError);
    assertEquals(f.main.children[1].props["data-ready"], 2);
    assertThrows(() => f.fallbackSet(3), Error, "not alive");
    f.root.flush();
    assertEquals(f.cleanup, ["outer", "inner"]);
  } finally { f.dispose(); }
});

Deno.test("unsafe fallback events keep opaque lifetime reconciliation generic", async () => {
  const f = await fixture("resource-subtree-unsafe", new MemoryVDOMHost(), true);
  try {
    f.mode.dispatch(1); f.root.flush();
    f.pendingB.resolve(3); await Promise.resolve(); f.root.flush();
    assertEquals(f.main.children[1].tag, "div");
    assertEquals(f.cleanup, []);
    f.pendingA.resolve("new-a"); await Promise.resolve(); f.root.flush();
    assertEquals(f.main.children[1].props["data-ready"], 3);
    assertEquals(f.cleanup, ["outer", "inner"]);
  } finally { f.dispose(); }
});

Deno.test("partial resource subtree failure leaves fallback ownership and effects accepted", async () => {
  class FailingHost extends MemoryVDOMHost {
    fail = false;
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (this.fail && name === "data-value" && value === 9) {
        throw new Error("partial ready host");
      }
    }
  }
  const host = new FailingHost(), f = await fixture("resource-subtree-partial", host);
  try {
    f.mode.dispatch(1); f.root.flush();
    const accepted = JSON.stringify(f.root.snapshot);
    const owners = f.root.diagnostics().ownerCount, version = f.root.publicationVersion;
    host.fail = true;
    f.pendingB.resolve(8); await Promise.resolve();
    assertThrows(() => f.root.flush(), Error);
    assertEquals(JSON.stringify(f.root.snapshot), accepted);
    assertEquals(f.root.publicationVersion, version);
    assertEquals(f.root.diagnostics().ownerCount, owners);
    assertEquals(f.cleanup, []);
    f.root.dispose();
    assertEquals(f.cleanup, ["outer", "inner"]);
    assertThrows(() => f.fallbackSet(1), Error, "not alive");
  } finally { f.dispose(); }
});

Deno.test("partial structured style write keeps accepted fallback and quarantines reveal", async () => {
  class FailingStyleHost extends MemoryVDOMHost {
    fail = false;
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (this.fail && name === "style") throw new Error("partial style host");
    }
    override setStyleProp(node: MemoryNode, name: string, value: unknown) {
      super.setStyleProp(node, name, value);
      if (this.fail && name === "color") throw new Error("partial style host");
    }
  }
  const host = new FailingStyleHost();
  const f = await fixture("resource-subtree-style-partial", host, false, true);
  try {
    f.mode.dispatch(1); f.root.flush();
    const accepted = JSON.stringify(f.root.snapshot), version = f.root.publicationVersion;
    const owners = f.root.diagnostics().ownerCount;
    host.fail = true;
    f.pendingB.resolve(8); await Promise.resolve();
    assertThrows(() => f.root.flush(), Error, "partial style host");
    assertEquals(JSON.stringify(f.root.snapshot), accepted);
    assertEquals(f.root.publicationVersion, version);
    assertEquals(f.root.diagnostics().ownerCount, owners);
    assertEquals(f.cleanup, []);
  } finally { f.dispose(); }
});
