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
const input = (index: number) => ({ kind: "input" as const, index });
const sum = (left: number, right: number) => ({ kind: "binary" as const,
  operator: "+" as const, left: input(left), right: input(right) });
const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");
const drainQueuedCommits = (queue: Array<() => void>, limit = 12): void => {
  for (let index = 0; index < limit && queue.length; index++) queue.shift()!();
  assertEquals(queue.length, 0, "scheduled commits exceeded the finite drain budget");
};

Deno.test("two resources settle in either order before joint Store reveal, then Store updates locally", async () => {
  const sourceFile = "joint-async/multi.tsx";
  const revision = "joint-async-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const leftPending = deferred<number>();
  const rightPending = deferred<Readonly<{ value: number }>>();
  const left = new AsyncResource(leftPending.promise);
  const right = new AsyncResource(rightPending.promise);
  const health = new AsyncResource(new Promise<number>(() => {}));
  const store = createAsyncStore(1, (_old: number, next: number) => next);
  const id = `${sourceFile}#component:Joint`;
  let renders = 0;
  const Joint = defineComponent(id,
    (props: { left: typeof left; right: typeof right; store: typeof store }) => {
      renders++;
      const a = useAt(`${id}#resource:0`, props.left) as number;
      const b = useAt(`${id}#resource:1`, props.right) as { value: number };
      const c = useStoreAt(`${id}#store:0`, props.store);
      return jsx("output", { key: "joint", "data-total": a + b.value + c });
    }, { propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 5, componentProgramId: id, moduleRevision: revision,
      inputs: [
        { storeUseSiteId: `${id}#resource:0`, storeProp: "left", paths: [[]] },
        { storeUseSiteId: `${id}#resource:1`, storeProp: "right", paths: [["value"]] },
        { storeUseSiteId: `${id}#store:0`, storeProp: "store", paths: [[]] },
      ],
      host: { tag: "output", key: "joint", props: [["data-total", {
        kind: "binary", operator: "+", left: sum(0, 1), right: input(2),
      }]], children: [] },
    } });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: sourceFile, scheduleCommit() {} });
  const Health = defineComponent(`${sourceFile}#component:Health`, () =>
    jsx("output", { key: "health" }, useAt(`${sourceFile}#resource:health`, health) as number));
  const jointNode = () => container.children[0].children[0];
  try {
    root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "boundary", __nativeBoundarySite: `${id}#boundary`,
        fallback: jsx("output", { key: "joint", "data-total": "waiting" }),
        children: jsx(Joint, { key: "owner", left, right, store }) }),
      jsx(Suspense, { key: "health-boundary", __nativeBoundarySite: `${id}#health-boundary`,
        fallback: jsx("output", { key: "health", "data-health": "pending" }),
        children: jsx(Health, { key: "health-owner" }) }),
    ]));
    assertEquals(jointNode().props["data-total"], "waiting");
    const fallback = jointNode();
    const pendingHealth = container.children[0].children[1];
    rightPending.resolve(storeRecord({ value: 5 }));
    await Promise.resolve();
    root.flush();
    assertStrictEquals(jointNode(), fallback);
    leftPending.resolve(3);
    await Promise.resolve();
    root.flush();
    assertEquals(jointNode().props["data-total"], 9);
    const accepted = jointNode();
    const before = renders;
    store.dispatch(7);
    root.flush();
    assertStrictEquals(jointNode(), accepted);
    assertEquals(jointNode().props["data-total"], 15);
    assertEquals(renders, before);
    assertStrictEquals(container.children[0].children[1], pendingHealth);
    assertEquals(pendingHealth.props["data-health"], "pending");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("a Store discovered after suspension retains a host-time newer action", async () => {
  const sourceFile = "joint-async/late-store.tsx";
  const revision = "joint-async-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const pending = deferred<number>();
  const resource = new AsyncResource(pending.promise);
  const store = createAsyncStore(2, (_old: number, next: number) => next);
  const id = `${sourceFile}#component:Joint`;
  const Joint = defineComponent(id, (props: { resource: typeof resource; store: typeof store }) => {
    const a = useAt(`${id}#resource:0`, props.resource) as number;
    const b = useStoreAt(`${id}#store:0`, props.store);
    return jsx("output", { key: "joint", "data-total": a + b });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 4, componentProgramId: id, moduleRevision: revision,
    inputs: [
      { storeUseSiteId: `${id}#resource:0`, storeProp: "resource" },
      { storeUseSiteId: `${id}#store:0`, storeProp: "store" },
    ],
    host: { tag: "output", key: "joint", props: [["data-total", sum(0, 1)]], children: [] },
  } });
  class ReentrantHost extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "data-total" && value === 5) store.dispatch(9);
    }
  }
  const host = new ReentrantHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: sourceFile, scheduleCommit() {} });
  try {
    root.mount(jsx(Suspense, { key: "boundary", __nativeBoundarySite: `${id}#boundary`,
      fallback: jsx("output", { key: "joint", "data-total": "waiting" }),
      children: jsx(Joint, { key: "owner", resource, store }) }));
    assertEquals(store.diagnostics().readers, 0);
    pending.resolve(3);
    await Promise.resolve();
    root.flush();
    assertEquals(container.children[0].props["data-total"], 5);
    root.flush();
    assertEquals(container.children[0].props["data-total"], 12);
    assertEquals(store.diagnostics().readers, 1);
    assertEquals(text(container.children[0]), "");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("accepted reveal transfers the Store reader captured before suspension", async () => {
  const sourceFile = "joint-async/pending-reader.tsx";
  const revision = "joint-async-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const pending = deferred<number>();
  const resource = new AsyncResource(pending.promise);
  const health = new AsyncResource(new Promise<number>(() => {}));
  const store = createAsyncStore(2, (_old: number, next: number) => next);
  const id = `${sourceFile}#component:Joint`;
  let renders = 0;
  const Joint = defineComponent(id, (props: { resource: typeof resource; store: typeof store }) => {
    renders++;
    const a = useStoreAt(`${id}#store:0`, props.store);
    const b = useAt(`${id}#resource:0`, props.resource) as number;
    return jsx("output", { key: "joint", "data-total": a + b });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 4, componentProgramId: id, moduleRevision: revision,
    inputs: [
      { storeUseSiteId: `${id}#store:0`, storeProp: "store" },
      { storeUseSiteId: `${id}#resource:0`, storeProp: "resource" },
    ],
    host: { tag: "output", key: "joint", props: [["data-total", sum(0, 1)]], children: [] },
  } });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: sourceFile, scheduleCommit() {} });
  const Health = defineComponent(`${sourceFile}#component:Health`, () =>
    jsx("output", { key: "health" }, useAt(`${sourceFile}#resource:health`, health) as number));
  const jointNode = () => container.children[0].children[0];
  try {
    root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "boundary", __nativeBoundarySite: `${id}#boundary`,
        fallback: jsx("output", { key: "joint", "data-total": "waiting" }),
        children: jsx(Joint, { key: "owner", resource, store }) }),
      jsx(Suspense, { key: "health-boundary", __nativeBoundarySite: `${id}#health-boundary`,
        fallback: jsx("output", { key: "health", "data-health": "pending" }),
        children: jsx(Health, { key: "health-owner" }) }),
    ]));
    const pendingHealth = container.children[0].children[1];
    store.dispatch(4);
    root.flush();
    assertEquals(jointNode().props["data-total"], "waiting");
    pending.resolve(3);
    await Promise.resolve();
    root.flush();
    assertEquals(jointNode().props["data-total"], 7);
    const accepted = jointNode();
    const before = renders;
    store.dispatch(5);
    root.flush();
    assertEquals(jointNode().props["data-total"], 8);
    assertStrictEquals(jointNode(), accepted);
    assertEquals(renders, before);
    assertEquals(store.diagnostics().readers, 1);
    assertStrictEquals(container.children[0].children[1], pendingHealth);
    assertEquals(pendingHealth.props["data-health"], "pending");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("joint reveal host failure preserves the old accepted fallback and error", async () => {
  const sourceFile = "joint-async/host-failure.tsx";
  const revision = "joint-async-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const pending = deferred<number>();
  const resource = new AsyncResource(pending.promise);
  const store = createAsyncStore(2, (_old: number, next: number) => next);
  const id = `${sourceFile}#component:Joint`;
  let renders = 0;
  const Joint = defineComponent(id, (props: { resource: typeof resource; store: typeof store }) => {
    renders++;
    const a = useStoreAt(`${id}#store:0`, props.store);
    const b = useAt(`${id}#resource:0`, props.resource) as number;
    return jsx("output", { key: "joint", "data-total": a + b });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 4, componentProgramId: id, moduleRevision: revision,
    inputs: [
      { storeUseSiteId: `${id}#store:0`, storeProp: "store" },
      { storeUseSiteId: `${id}#resource:0`, storeProp: "resource" },
    ],
    host: { tag: "output", key: "joint", props: [["data-total", sum(0, 1)]], children: [] },
  } });
  const failure = new Error("joint reveal writer failed");
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
    root.mount(jsx(Suspense, { key: "boundary", __nativeBoundarySite: `${id}#boundary`,
      fallback: jsx("output", { key: "joint", "data-total": "waiting" }),
      children: jsx(Joint, { key: "owner", resource, store }) }));
    const accepted = container.children[0];
    const version = root.publicationVersion;
    const owners = root.diagnostics().ownerCount;
    pending.resolve(3);
    await Promise.resolve();
    assertStrictEquals(assertThrows(() => root.flush()), failure);
    assertStrictEquals(container.children[0], accepted);
    assertEquals(container.children[0].props["data-total"], "waiting");
    assertEquals(root.publicationVersion, version);
    assertEquals(root.diagnostics().ownerCount, owners);
    assertEquals(resource.status.status, "fulfilled");
    assertEquals(renders, 1);
    assertThrows(() => root.flush(), Error, "host commit failure");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("joint reveal follows the current resource prop after an obsolete source settles", async () => {
  const sourceFile = "joint-async/stale-source.tsx";
  const revision = "joint-async-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const oldPending = deferred<number>();
  const newPending = deferred<number>();
  const oldResource = new AsyncResource(oldPending.promise);
  const newResource = new AsyncResource(newPending.promise);
  const store = createAsyncStore(2, (_old: number, next: number) => next);
  const id = `${sourceFile}#component:Joint`;
  const Joint = defineComponent(id, (props: { resource: AsyncResource<number>; store: typeof store }) => {
    const a = useAt(`${id}#resource:0`, props.resource) as number;
    const b = useStoreAt(`${id}#store:0`, props.store);
    return jsx("output", { key: "joint", "data-total": a + b });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 4, componentProgramId: id, moduleRevision: revision,
    inputs: [
      { storeUseSiteId: `${id}#resource:0`, storeProp: "resource" },
      { storeUseSiteId: `${id}#store:0`, storeProp: "store" },
    ],
    host: { tag: "output", key: "joint", props: [["data-total", sum(0, 1)]], children: [] },
  } });
  const tree = (resource: AsyncResource<number>) => jsx(Suspense, {
    key: "boundary", __nativeBoundarySite: `${id}#boundary`,
    fallback: jsx("output", { key: "joint", "data-total": "waiting" }),
    children: jsx(Joint, { key: "owner", resource, store }),
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: sourceFile, scheduleCommit() {} });
  try {
    root.mount(tree(oldResource));
    root.update(tree(newResource));
    const fallback = container.children[0];
    oldPending.resolve(10);
    await Promise.resolve();
    root.flush();
    assertStrictEquals(container.children[0], fallback);
    assertEquals(container.children[0].props["data-total"], "waiting");
    newPending.resolve(3);
    await Promise.resolve();
    root.flush();
    assertEquals(container.children[0].props["data-total"], 5);
    root.update(jsx("output", { key: "replacement", "data-total": "removed" }));
    assertEquals(container.children[0].props["data-total"], "removed");
    store.dispatch(8);
    root.flush();
    assertEquals(container.children[0].props["data-total"], "removed");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("a matching legacy resource program wins over an additional Store program", async () => {
  const sourceFile = "joint-async/legacy-resource.tsx";
  const revision = "joint-async-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const pending = deferred<string>();
  const resource = new AsyncResource(pending.promise);
  const store = createAsyncStore(1, (_old: number, next: number) => next);
  const id = `${sourceFile}#component:Legacy`;
  let renders = 0;
  const Legacy = defineComponent(id, (props: { resource: typeof resource; store: typeof store }) => {
    renders++;
    return jsx("div", { key: "legacy" }, useAt(`${id}#resource:0`, props.resource) as string);
  }, { propOnlySites: [], closedResourceHostProgram: {
    schemaVersion: 1, componentProgramId: id, moduleRevision: revision,
    resourceUseSiteId: `${id}#resource:0`, resourceProp: "resource",
    host: { tag: "div", key: "legacy", props: [], child: "resource-value" },
  }, closedStoreHostProgram: {
    schemaVersion: 1, componentProgramId: id, moduleRevision: revision,
    storeUseSiteId: `${id}#store:0`, storeProp: "store",
    host: { tag: "output", key: "numeric", props: [["data-value", input(0)]], child: null },
  } });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: sourceFile, scheduleCommit() {} });
  try {
    root.mount(jsx(Suspense, { key: "boundary", __nativeBoundarySite: `${id}#boundary`,
      fallback: jsx("div", { key: "legacy" }, "waiting"),
      children: jsx(Legacy, { key: "owner", resource, store }) }));
    pending.resolve("ready");
    await Promise.resolve();
    root.flush();
    assertEquals(text(container.children[0]), "ready");
    assertEquals(renders, 1);
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("joint reveal uses its root projection after another root publishes the shared Store", async () => {
  const sourceFile = "joint-async/fork.tsx";
  const revision = "joint-async-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const pending = deferred<number>();
  const resource = new AsyncResource(pending.promise);
  const store = createAsyncStore(2, (_old: number, next: number) => next);
  const jointId = `${sourceFile}#component:Joint`;
  const otherId = `${sourceFile}#component:Other`;
  const Joint = defineComponent(jointId, (props: { resource: typeof resource; store: typeof store }) => {
    const a = useAt(`${jointId}#resource:0`, props.resource) as number;
    const b = useStoreAt(`${jointId}#store:0`, props.store);
    return jsx("output", { key: "joint", "data-total": a + b });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 4, componentProgramId: jointId, moduleRevision: revision,
    inputs: [
      { storeUseSiteId: `${jointId}#resource:0`, storeProp: "resource" },
      { storeUseSiteId: `${jointId}#store:0`, storeProp: "store" },
    ],
    host: { tag: "output", key: "joint", props: [["data-total", sum(0, 1)]], children: [] },
  } });
  const Other = defineComponent(otherId, (props: { store: typeof store }) =>
    jsx("output", { key: "other", "data-value":
      useStoreAt(`${otherId}#store:0`, props.store) }), {
    propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 1, componentProgramId: otherId, moduleRevision: revision,
      storeUseSiteId: `${otherId}#store:0`, storeProp: "store",
      host: { tag: "output", key: "other", child: null,
        props: [["data-value", input(0)]] },
    },
  });
  const host = new MemoryVDOMHost();
  const firstContainer = host.createContainer();
  const secondContainer = host.createContainer();
  const first = new ComponentStateRoot(host, firstContainer,
    { rootId: `${sourceFile}:first`, scheduleCommit() {} });
  const second = new ComponentStateRoot(host, secondContainer,
    { rootId: `${sourceFile}:second`, scheduleCommit() {} });
  try {
    first.mount(jsx(Suspense, { key: "boundary", __nativeBoundarySite: `${jointId}#boundary`,
      fallback: jsx("output", { key: "joint", "data-total": "waiting" }),
      children: jsx(Joint, { key: "owner", resource, store }) }));
    second.mount(jsx(Other, { store }));
    const otherHost = secondContainer.children[0];
    store.dispatch(7);
    second.flush();
    assertEquals(secondContainer.children[0].props["data-value"], 7);
    pending.resolve(3);
    await Promise.resolve();
    first.flush();
    assertEquals(firstContainer.children[0].props["data-total"], 10);
    assertStrictEquals(secondContainer.children[0], otherHost);
    assertEquals(secondContainer.children[0].props["data-value"], 7);
    store.dispatch(8);
    first.flush();
    second.flush();
    assertEquals(firstContainer.children[0].props["data-total"], 11);
    assertEquals(secondContainer.children[0].props["data-value"], 8);
  } finally {
    first.dispose();
    second.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("invalidated joint component code cannot reveal a pending boundary", async () => {
  const sourceFile = "joint-async/stale-code.tsx";
  const revision = "joint-async-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const pending = deferred<number>();
  const resource = new AsyncResource(pending.promise);
  const store = createAsyncStore(2, (_old: number, next: number) => next);
  const id = `${sourceFile}#component:Joint`;
  const Joint = defineComponent(id, (props: { resource: typeof resource; store: typeof store }) => {
    const a = useAt(`${id}#resource:0`, props.resource) as number;
    const b = useStoreAt(`${id}#store:0`, props.store);
    return jsx("output", { key: "joint", "data-total": a + b });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 4, componentProgramId: id, moduleRevision: revision,
    inputs: [
      { storeUseSiteId: `${id}#resource:0`, storeProp: "resource" },
      { storeUseSiteId: `${id}#store:0`, storeProp: "store" },
    ],
    host: { tag: "output", key: "joint", props: [["data-total", sum(0, 1)]], children: [] },
  } });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: sourceFile, scheduleCommit() {} });
  try {
    root.mount(jsx(Suspense, { key: "boundary", __nativeBoundarySite: `${id}#boundary`,
      fallback: jsx("output", { key: "joint", "data-total": "waiting" }),
      children: jsx(Joint, { key: "owner", resource, store }) }));
    const accepted = container.children[0];
    invalidateCompiledSemanticPlan(sourceFile);
    pending.resolve(3);
    await Promise.resolve();
    assertThrows(() => root.flush(), Error,
      "Compiled component revision is obsolete; remount with current code");
    assertStrictEquals(container.children[0], accepted);
    assertEquals(container.children[0].props["data-total"], "waiting");
    assertEquals(resource.status.status, "fulfilled");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("automatic closed style cuts drain same-value notifications beside pending health", () => {
  const sourceFile = "joint-async/queued-style.tsx";
  const revision = "joint-async-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const store = createAsyncStore(0.2, (_old: number, next: number) => next);
  const health = new AsyncResource(new Promise<number>(() => {}));
  const id = `${sourceFile}#component:Style`;
  let renders = 0;
  const Style = defineComponent(id, (props: { store: typeof store }) => {
    renders++;
    const value = useStoreAt(`${id}#store:0`, props.store);
    return jsx("output", { key: "style", style: { opacity: value } });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 4, componentProgramId: id, moduleRevision: revision,
    inputs: [{ storeUseSiteId: `${id}#store:0`, storeProp: "store" }],
    host: { tag: "output", key: "style", props: [["style", {
      kind: "style", entries: [["opacity", input(0)]],
    }]], children: [] },
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
      jsx(Style, { key: "style-owner", store }),
      jsx(Suspense, { key: "health-boundary", __nativeBoundarySite: `${id}#health-boundary`,
        fallback: jsx("output", { key: "health", "data-health": "pending" }),
        children: jsx(Health, { key: "health-owner" }) }),
    ]));
    const style = container.children[0].children[0];
    const pendingHealth = container.children[0].children[1];
    const acceptedRenders = renders;
    store.dispatch(0.6);
    drainQueuedCommits(queue);
    assertStrictEquals(container.children[0].children[0], style);
    assertEquals(style.props.style, { opacity: 0.6 });
    assertEquals(renders, acceptedRenders);
    store.dispatch(0.6);
    drainQueuedCommits(queue);
    assertEquals(style.props.style, { opacity: 0.6 });
    assertEquals(renders, acceptedRenders);
    assertStrictEquals(container.children[0].children[1], pendingHealth);
    assertEquals(pendingHealth.props["data-health"], "pending");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("partial closed cuts preserve uncovered Store notifications and bounded scheduling", () => {
  const sourceFile = "joint-async/queued-opaque.tsx";
  const revision = "joint-async-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const closed = createAsyncStore(1, (_old: number, next: number) => next);
  const opaque = createAsyncStore(2, (_old: number, next: number) => next);
  const health = new AsyncResource(new Promise<number>(() => {}));
  const id = `${sourceFile}#component:Closed`;
  let closedRenders = 0;
  const Closed = defineComponent(id, (props: { store: typeof closed }) => {
    closedRenders++;
    const value = useStoreAt(`${id}#store:0`, props.store);
    return jsx("output", { key: "closed", "data-closed": value,
      style: { opacity: value / 10 } });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 4, componentProgramId: id, moduleRevision: revision,
    inputs: [{ storeUseSiteId: `${id}#store:0`, storeProp: "store" }],
    host: { tag: "output", key: "closed", props: [
      ["data-closed", input(0)], ["style", { kind: "style", entries: [["opacity", {
        kind: "binary", operator: "/", left: input(0),
        right: { kind: "literal", value: 10 },
      }]] }],
    ], children: [] },
  } });
  const opaqueId = `${sourceFile}#component:Opaque`;
  const Opaque = defineComponent(opaqueId, () => jsx("output", { key: "opaque",
    "data-opaque": useStoreAt(`${opaqueId}#store:0`, opaque) }));
  const Health = defineComponent(`${sourceFile}#component:Health`, () =>
    jsx("output", { key: "health" }, useAt(`${sourceFile}#resource:health`, health) as number));
  const queue: Array<() => void> = [];
  class ReentrantHost extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "data-closed" && value === 4) closed.dispatch(6);
    }
  }
  const host = new ReentrantHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: sourceFile, scheduleCommit: (commit) => queue.push(commit),
  });
  try {
    root.mount(jsx("section", {}, [
      jsx(Closed, { key: "closed-owner", store: closed }),
      jsx(Opaque, { key: "opaque-owner" }),
      jsx(Suspense, { key: "health-boundary", __nativeBoundarySite: `${id}#health-boundary`,
        fallback: jsx("output", { key: "health", "data-health": "pending" }),
        children: jsx(Health, { key: "health-owner" }) }),
    ]));
    const section = container.children[0];
    const closedNode = section.children[0];
    const pendingHealth = section.children[2];
    const acceptedRenders = closedRenders;
    closed.dispatch(4);
    opaque.dispatch(7);
    assertEquals(queue.length, 1);
    queue.shift()!();
    assertStrictEquals(section.children[0], closedNode);
    assertEquals(closedNode.props["data-closed"], 4);
    assertEquals(closedNode.props.style, { opacity: 0.4 });
    assertEquals(closedRenders, acceptedRenders);
    assertEquals(section.children[1].props["data-opaque"], 2);
    drainQueuedCommits(queue);
    assertEquals(section.children[0].props["data-closed"], 6);
    assertEquals(section.children[0].props.style, { opacity: 0.6 });
    assertEquals(section.children[1].props["data-opaque"], 7);
    assertStrictEquals(section.children[2], pendingHealth);
    assertEquals(pendingHealth.props["data-health"], "pending");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("automatic complete cut retains a newer host-time Store notification", () => {
  const sourceFile = "joint-async/queued-newer.tsx";
  const revision = "joint-async-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const store = createAsyncStore(1, (_old: number, next: number) => next);
  const health = new AsyncResource(new Promise<number>(() => {}));
  const id = `${sourceFile}#component:Closed`;
  const Closed = defineComponent(id, (props: { store: typeof store }) =>
    jsx("output", { key: "closed", "data-closed":
      useStoreAt(`${id}#store:0`, props.store) }),
  { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 4, componentProgramId: id, moduleRevision: revision,
    inputs: [{ storeUseSiteId: `${id}#store:0`, storeProp: "store" }],
    host: { tag: "output", key: "closed", props: [["data-closed", input(0)]], children: [] },
  } });
  const Health = defineComponent(`${sourceFile}#component:Health`, () =>
    jsx("output", { key: "health" }, useAt(`${sourceFile}#resource:health`, health) as number));
  class ReentrantHost extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "data-closed" && value === 4) store.dispatch(9);
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
      jsx(Closed, { key: "closed-owner", store }),
      jsx(Suspense, { key: "health-boundary", __nativeBoundarySite: `${id}#health-boundary`,
        fallback: jsx("output", { key: "health", "data-health": "pending" }),
        children: jsx(Health, { key: "health-owner" }) }),
    ]));
    const section = container.children[0];
    const closedNode = section.children[0];
    store.dispatch(4);
    assertEquals(queue.length, 1);
    queue.shift()!();
    assertEquals(closedNode.props["data-closed"], 4);
    assertEquals(queue.length, 1);
    drainQueuedCommits(queue);
    assertStrictEquals(section.children[0], closedNode);
    assertEquals(closedNode.props["data-closed"], 9);
    assertEquals(section.children[1].props["data-health"], "pending");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});
