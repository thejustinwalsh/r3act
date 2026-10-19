import { assertEquals, assertStrictEquals, assertThrows } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import { createAsyncStore, storeRecord } from "./async_store_runtime.ts";
import { ComponentStateRoot, defineComponent, Suspense, useAt, useStoreAt } from "./component_state_runtime.ts";
import { invalidateCompiledSemanticPlan, registerCompiledSemanticPlan } from "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => resolve = yes);
  return { promise, resolve };
};
const register = (sourceFile: string, revision: string) =>
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
const input = (index: number) => ({ kind: "input" as const, index });
const sum = (left: number, right: number) => ({ kind: "binary" as const,
  operator: "+" as const, left: input(left), right: input(right) });
const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");
const drain = (queue: Array<() => void>, limit = 12) => {
  for (let index = 0; index < limit && queue.length; index++) queue.shift()!();
  assertEquals(queue.length, 0, "automatic forwarding reveal did not quiesce");
};

Deno.test("two forwarding owners reveal joint numeric inputs and keep Store updates scoped", async () => {
  const sourceFile = "forward-reveal/joint.tsx";
  const revision = "forward-v1";
  register(sourceFile, revision);
  const pending = deferred<Readonly<{ value: number }>>();
  const resource = new AsyncResource(pending.promise);
  const healthPending = deferred<number>();
  const health = new AsyncResource(healthPending.promise);
  const store = createAsyncStore(2, (_old: number, next: number) => next);
  const leafId = `${sourceFile}#component:Leaf`;
  const middleId = `${sourceFile}#component:Middle`;
  const outerId = `${sourceFile}#component:Outer`;
  let leafRenders = 0, middleRenders = 0, outerRenders = 0;
  const Leaf = defineComponent(leafId,
    (props: { source: typeof resource; amount: typeof store }) => {
      leafRenders++;
      const amount = useStoreAt(`${leafId}#store:0`, props.amount);
      const source = useAt(`${leafId}#resource:0`, props.source) as { value: number };
      return jsx("output", { key: "joint", "data-total": amount + source.value });
    }, { propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 5, componentProgramId: leafId, moduleRevision: revision,
      inputs: [
        { storeUseSiteId: `${leafId}#store:0`, storeProp: "amount", paths: [[]] },
        { storeUseSiteId: `${leafId}#resource:0`, storeProp: "source", paths: [["value"]] },
      ],
      host: { tag: "output", key: "joint", props: [["data-total", sum(0, 1)]], children: [] },
    } });
  const Middle = defineComponent(middleId,
    (props: { payload: typeof resource; quantity: typeof store }) => {
      middleRenders++;
      return jsx(Leaf, { key: "leaf-owner", source: props.payload, amount: props.quantity });
    }, { propOnlySites: [], closedComponentForwardProgram: {
      schemaVersion: 1, componentProgramId: middleId, moduleRevision: revision,
      childComponentProgramId: leafId, childComponent: Leaf, key: "leaf-owner",
      props: [["source", { kind: "prop", name: "payload" }],
        ["amount", { kind: "prop", name: "quantity" }]],
    } });
  const Outer = defineComponent(outerId,
    (props: { resource: typeof resource; store: typeof store }) => {
      outerRenders++;
      return jsx(Middle, { payload: props.resource, quantity: props.store });
    }, { propOnlySites: [], closedComponentForwardProgram: {
      schemaVersion: 1, componentProgramId: outerId, moduleRevision: revision,
      childComponentProgramId: middleId, childComponent: Middle, key: null,
      props: [["payload", { kind: "prop", name: "resource" }],
        ["quantity", { kind: "prop", name: "store" }]],
    } });
  const Health = defineComponent(`${sourceFile}#component:Health`, () =>
    jsx("output", { key: "health" }, useAt(`${sourceFile}#resource:health`, health) as number));
  const queue: Array<() => void> = [];
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: sourceFile, scheduleCommit: (commit) => queue.push(commit),
  });
  try {
    root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "joint-boundary", __nativeBoundarySite: `${outerId}#boundary`,
        fallback: jsx("output", { key: "joint", "data-total": "waiting" }),
        children: jsx(Outer, { key: "outer", resource, store }) }),
      jsx(Suspense, { key: "health-boundary", __nativeBoundarySite: `${outerId}#health`,
        fallback: jsx("output", { key: "health", "data-health": "pending" }),
        children: jsx(Health, { key: "health-owner" }) }),
    ]));
    const section = container.children[0];
    const fallback = section.children[0];
    const pendingHealth = section.children[1];
    assertEquals([outerRenders, middleRenders, leafRenders], [1, 1, 1]);
    pending.resolve(storeRecord({ value: 3 }));
    await Promise.resolve();
    drain(queue);
    assertStrictEquals(section.children[0], fallback);
    assertEquals(fallback.props["data-total"], 5);
    assertEquals([outerRenders, middleRenders, leafRenders], [1, 1, 1]);
    assertEquals(store.diagnostics().readers, 1);
    const owners = root.diagnostics().ownerCount;
    store.dispatch(7);
    drain(queue);
    assertStrictEquals(section.children[0], fallback);
    assertEquals(fallback.props["data-total"], 10);
    assertEquals(root.diagnostics().ownerCount, owners);
    assertEquals([outerRenders, middleRenders, leafRenders], [1, 1, 1]);
    assertStrictEquals(section.children[1], pendingHealth);
    healthPending.resolve(9);
    await Promise.resolve();
    drain(queue);
    assertEquals(section.children[0].props["data-total"], 10);
    assertEquals(text(section.children[1]), "9");
    assertEquals(root.diagnostics().ownerCount, owners + 1);
    assertEquals(store.diagnostics().readers, 1);
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
  assertEquals(container.children.length, 0);
});

Deno.test("forwarded legacy resource program retains string output and literal props", async () => {
  const sourceFile = "forward-reveal/legacy.tsx";
  const revision = "forward-v1";
  register(sourceFile, revision);
  const pending = deferred<string>();
  const resource = new AsyncResource(pending.promise);
  const leafId = `${sourceFile}#component:Leaf`;
  const outerId = `${sourceFile}#component:Outer`;
  let outerRenders = 0, leafRenders = 0;
  const Leaf = defineComponent(leafId,
    (props: { source: typeof resource; label: string }) => {
      leafRenders++;
      return jsx("div", { key: "legacy", "data-label": props.label },
        useAt(`${leafId}#resource:0`, props.source) as string);
    }, { propOnlySites: [], closedResourceHostProgram: {
      schemaVersion: 1, componentProgramId: leafId, moduleRevision: revision,
      resourceUseSiteId: `${leafId}#resource:0`, resourceProp: "source",
      host: { tag: "div", key: "legacy", props: [["data-label", "forwarded"]],
        child: "resource-value" },
    } });
  const Outer = defineComponent(outerId,
    (props: { resource: typeof resource }) => {
      outerRenders++;
      return jsx(Leaf, { source: props.resource, label: "forwarded", key: "leaf" });
    }, { propOnlySites: [], closedComponentForwardProgram: {
      schemaVersion: 1, componentProgramId: outerId, moduleRevision: revision,
      childComponentProgramId: leafId, childComponent: Leaf, key: "leaf",
      props: [["source", { kind: "prop", name: "resource" }],
        ["label", { kind: "literal", value: "forwarded" }]],
    } });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: sourceFile, scheduleCommit() {} });
  try {
    root.mount(jsx(Suspense, { key: "boundary", __nativeBoundarySite: `${outerId}#boundary`,
      fallback: jsx("div", { key: "legacy" }, "waiting"),
      children: jsx(Outer, { key: "outer", resource }) }));
    pending.resolve("ready");
    await Promise.resolve();
    root.flush();
    assertEquals(text(container.children[0]), "ready");
    assertEquals(container.children[0].props["data-label"], "forwarded");
    assertEquals([outerRenders, leafRenders], [1, 1]);
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("forwarded resource-first reveal retains a newly discovered Store action", async () => {
  const sourceFile = "forward-reveal/late-store.tsx";
  const revision = "forward-v1";
  register(sourceFile, revision);
  const pending = deferred<number>();
  const resource = new AsyncResource(pending.promise);
  const health = new AsyncResource(new Promise<number>(() => {}));
  const store = createAsyncStore(2, (_old: number, next: number) => next);
  const leafId = `${sourceFile}#component:Leaf`;
  const outerId = `${sourceFile}#component:Outer`;
  let outerRenders = 0, leafRenders = 0;
  const Leaf = defineComponent(leafId,
    (props: { source: typeof resource; amount: typeof store }) => {
      leafRenders++;
      const source = useAt(`${leafId}#resource:0`, props.source) as number;
      const amount = useStoreAt(`${leafId}#store:0`, props.amount);
      return jsx("output", { key: "joint", "data-total": source + amount });
    }, { propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 4, componentProgramId: leafId, moduleRevision: revision,
      inputs: [
        { storeUseSiteId: `${leafId}#resource:0`, storeProp: "source" },
        { storeUseSiteId: `${leafId}#store:0`, storeProp: "amount" },
      ],
      host: { tag: "output", key: "joint", props: [["data-total", sum(0, 1)]], children: [] },
    } });
  const Outer = defineComponent(outerId,
    (props: { resource: typeof resource; store: typeof store }) => {
      outerRenders++;
      return jsx(Leaf, { source: props.resource, amount: props.store });
    }, { propOnlySites: [], closedComponentForwardProgram: {
      schemaVersion: 1, componentProgramId: outerId, moduleRevision: revision,
      childComponentProgramId: leafId, childComponent: Leaf, key: null,
      props: [["source", { kind: "prop", name: "resource" }],
        ["amount", { kind: "prop", name: "store" }]],
    } });
  const Health = defineComponent(`${sourceFile}#component:Health`, () =>
    jsx("output", { key: "health" }, useAt(`${sourceFile}#resource:health`, health) as number));
  class ReentrantHost extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "data-total" && value === 5) store.dispatch(9);
    }
  }
  const queue: Array<() => void> = [];
  const host = new ReentrantHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: sourceFile, scheduleCommit: (commit) => queue.push(commit),
  });
  try {
    root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "joint-boundary", __nativeBoundarySite: `${outerId}#boundary`,
        fallback: jsx("output", { key: "joint", "data-total": "waiting" }),
        children: jsx(Outer, { key: "outer", resource, store }) }),
      jsx(Suspense, { key: "health-boundary", __nativeBoundarySite: `${outerId}#health`,
        fallback: jsx("output", { key: "health", "data-health": "pending" }),
        children: jsx(Health, { key: "health-owner" }) }),
    ]));
    const section = container.children[0];
    const joint = section.children[0];
    const pendingHealth = section.children[1];
    assertEquals(store.diagnostics().readers, 0);
    pending.resolve(3);
    await Promise.resolve();
    assertEquals(queue.length, 1);
    queue.shift()!();
    assertEquals(joint.props["data-total"], 5);
    assertEquals(queue.length, 1);
    drain(queue);
    assertStrictEquals(section.children[0], joint);
    assertEquals(joint.props["data-total"], 12);
    assertEquals([outerRenders, leafRenders], [1, 1]);
    assertEquals(store.diagnostics().readers, 1);
    assertStrictEquals(section.children[1], pendingHealth);
    root.update(jsx("output", { key: "replacement", "data-total": "removed" }));
    store.dispatch(11);
    drain(queue);
    assertEquals(container.children[0].props["data-total"], "removed");
    assertEquals(resource.status.status, "fulfilled");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("forwarded host failure keeps fallback history and original error", async () => {
  const sourceFile = "forward-reveal/host-failure.tsx";
  const revision = "forward-v1";
  register(sourceFile, revision);
  const pending = deferred<number>();
  const resource = new AsyncResource(pending.promise);
  const store = createAsyncStore(2, (_old: number, next: number) => next);
  const leafId = `${sourceFile}#component:Leaf`;
  const outerId = `${sourceFile}#component:Outer`;
  const Leaf = defineComponent(leafId,
    (props: { source: typeof resource; amount: typeof store }) => {
      const amount = useStoreAt(`${leafId}#store:0`, props.amount);
      const source = useAt(`${leafId}#resource:0`, props.source) as number;
      return jsx("output", { key: "joint", "data-total": amount + source });
    }, { propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 4, componentProgramId: leafId, moduleRevision: revision,
      inputs: [
        { storeUseSiteId: `${leafId}#store:0`, storeProp: "amount" },
        { storeUseSiteId: `${leafId}#resource:0`, storeProp: "source" },
      ],
      host: { tag: "output", key: "joint", props: [["data-total", sum(0, 1)]], children: [] },
    } });
  const Outer = defineComponent(outerId,
    (props: { resource: typeof resource; store: typeof store }) =>
      jsx(Leaf, { source: props.resource, amount: props.store }),
    { propOnlySites: [], closedComponentForwardProgram: {
      schemaVersion: 1, componentProgramId: outerId, moduleRevision: revision,
      childComponentProgramId: leafId, childComponent: Leaf, key: null,
      props: [["source", { kind: "prop", name: "resource" }],
        ["amount", { kind: "prop", name: "store" }]],
    } });
  const failure = new Error("forwarded host writer failed");
  class FailingHost extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (name === "data-total" && value === 5) throw failure;
      super.setProp(node, name, value, previous);
    }
  }
  const host = new FailingHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: sourceFile, scheduleCommit() {} });
  try {
    root.mount(jsx(Suspense, { key: "boundary", __nativeBoundarySite: `${outerId}#boundary`,
      fallback: jsx("output", { key: "joint", "data-total": "waiting" }),
      children: jsx(Outer, { key: "outer", resource, store }) }));
    const fallback = container.children[0];
    const acceptedOwners = root.diagnostics().ownerCount;
    const version = root.publicationVersion;
    pending.resolve(3);
    await Promise.resolve();
    assertStrictEquals(assertThrows(() => root.flush()), failure);
    assertStrictEquals(container.children[0], fallback);
    assertEquals(fallback.props["data-total"], "waiting");
    assertEquals(root.publicationVersion, version);
    assertEquals(root.diagnostics().ownerCount, acceptedOwners);
    assertEquals(resource.status.status, "fulfilled");
    assertThrows(() => root.flush(), Error, "host commit failure");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("unproved forwarding target and cycle conservatively use generic reveal", async () => {
  for (const mode of ["wrong-site", "cycle"] as const) {
    const sourceFile = `forward-reveal/${mode}.tsx`;
    const revision = "forward-v1";
    register(sourceFile, revision);
    const pending = deferred<number>();
    const resource = new AsyncResource(pending.promise);
    const leafId = `${sourceFile}#component:Leaf`;
    const outerId = `${sourceFile}#component:Outer`;
    let renders = 0;
    const Leaf = defineComponent(leafId, (props: { source: typeof resource }) =>
      jsx("output", { key: "value", "data-value":
        useAt(`${leafId}#resource:0`, props.source) as number }),
    { propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 4, componentProgramId: leafId, moduleRevision: revision,
      inputs: [{ storeUseSiteId: `${leafId}#resource:0`, storeProp: "source" }],
      host: { tag: "output", key: "value", props: [["data-value", input(0)]], children: [] },
    } });
    const renderOuter = (props: { source: typeof resource }) => {
      renders++;
      return jsx(Leaf, { source: props.source });
    };
    const Outer = defineComponent(outerId, renderOuter,
      { propOnlySites: [], closedComponentForwardProgram: {
        schemaVersion: 1, componentProgramId: outerId, moduleRevision: revision,
        childComponentProgramId: mode === "wrong-site" ? `${leafId}:wrong` : outerId,
        childComponent: mode === "wrong-site" ? Leaf : renderOuter, key: null,
        props: [["source", { kind: "prop", name: "source" }]],
      } });
    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    const root = new ComponentStateRoot(host, container,
      { rootId: sourceFile, scheduleCommit() {} });
    try {
      root.mount(jsx(Suspense, { key: "boundary", __nativeBoundarySite: `${outerId}#boundary`,
        fallback: jsx("output", { key: "value", "data-value": "waiting" }),
        children: jsx(Outer, { key: "outer", source: resource }) }));
      pending.resolve(4);
      await Promise.resolve();
      root.flush();
      assertEquals(container.children[0].props["data-value"], 4);
      assertEquals(renders, 2);
    } finally {
      root.dispose();
      invalidateCompiledSemanticPlan(sourceFile);
    }
  }
});

Deno.test("stale forwarding revision cannot advance a pending boundary", async () => {
  const sourceFile = "forward-reveal/stale-code.tsx";
  const revision = "forward-v1";
  register(sourceFile, revision);
  const pending = deferred<number>();
  const resource = new AsyncResource(pending.promise);
  const leafId = `${sourceFile}#component:Leaf`;
  const outerId = `${sourceFile}#component:Outer`;
  const Leaf = defineComponent(leafId, (props: { source: typeof resource }) =>
    jsx("output", { key: "value", "data-value":
      useAt(`${leafId}#resource:0`, props.source) as number }),
  { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 4, componentProgramId: leafId, moduleRevision: revision,
    inputs: [{ storeUseSiteId: `${leafId}#resource:0`, storeProp: "source" }],
    host: { tag: "output", key: "value", props: [["data-value", input(0)]], children: [] },
  } });
  const Outer = defineComponent(outerId,
    (props: { source: typeof resource }) => jsx(Leaf, { source: props.source }),
    { propOnlySites: [], closedComponentForwardProgram: {
      schemaVersion: 1, componentProgramId: outerId, moduleRevision: revision,
      childComponentProgramId: leafId, childComponent: Leaf, key: null,
      props: [["source", { kind: "prop", name: "source" }]],
    } });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: sourceFile, scheduleCommit() {} });
  try {
    root.mount(jsx(Suspense, { key: "boundary", __nativeBoundarySite: `${outerId}#boundary`,
      fallback: jsx("output", { key: "value", "data-value": "waiting" }),
      children: jsx(Outer, { key: "outer", source: resource }) }));
    const fallback = container.children[0];
    const version = root.publicationVersion;
    invalidateCompiledSemanticPlan(sourceFile);
    pending.resolve(4);
    await Promise.resolve();
    assertThrows(() => root.flush(), Error,
      "Compiled module changed; remount the root");
    assertStrictEquals(container.children[0], fallback);
    assertEquals(fallback.props["data-value"], "waiting");
    assertEquals(root.publicationVersion, version);
    assertEquals(resource.status.status, "fulfilled");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("forwarding chains beyond eight wrappers decline to generic reveal", async () => {
  const sourceFile = "forward-reveal/depth.tsx";
  const revision = "forward-v1";
  register(sourceFile, revision);
  const pending = deferred<number>();
  const resource = new AsyncResource(pending.promise);
  const leafId = `${sourceFile}#component:Leaf`;
  const Leaf = defineComponent(leafId, (props: { source: typeof resource }) =>
    jsx("output", { key: "value", "data-value":
      useAt(`${leafId}#resource:0`, props.source) as number }),
  { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 4, componentProgramId: leafId, moduleRevision: revision,
    inputs: [{ storeUseSiteId: `${leafId}#resource:0`, storeProp: "source" }],
    host: { tag: "output", key: "value", props: [["data-value", input(0)]], children: [] },
  } });
  let nextComponent = Leaf;
  let nextId = leafId;
  let renders = 0;
  for (let index = 8; index >= 0; index--) {
    const id = `${sourceFile}#component:Wrapper${index}`;
    const childComponent = nextComponent;
    const childId = nextId;
    nextComponent = defineComponent(id,
      (props: { source: typeof resource }) => {
        renders++;
        return jsx(childComponent, { source: props.source });
      }, { propOnlySites: [], closedComponentForwardProgram: {
        schemaVersion: 1, componentProgramId: id, moduleRevision: revision,
        childComponentProgramId: childId, childComponent, key: null,
        props: [["source", { kind: "prop", name: "source" }]],
      } });
    nextId = id;
  }
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: sourceFile, scheduleCommit() {} });
  try {
    root.mount(jsx(Suspense, { key: "boundary", __nativeBoundarySite: `${nextId}#boundary`,
      fallback: jsx("output", { key: "value", "data-value": "waiting" }),
      children: jsx(nextComponent, { key: "top", source: resource }) }));
    assertEquals(renders, 9);
    pending.resolve(4);
    await Promise.resolve();
    root.flush();
    assertEquals(container.children[0].props["data-value"], 4);
    assertEquals(renders, 18);
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});
