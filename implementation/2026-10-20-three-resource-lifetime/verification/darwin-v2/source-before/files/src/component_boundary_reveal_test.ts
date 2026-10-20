import { assertEquals, assertStrictEquals, assertThrows } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import { createAsyncStore, storeDependencies } from "./async_store_runtime.ts";
import {
  ComponentStateRoot,
  defineComponent,
  Suspense,
  useAt,
  useEffectAt,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import {
  invalidateCompiledSemanticPlan,
  registerCompiledSemanticPlan,
  type CompiledSemanticPlan,
} from "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => resolve = yes);
  return { promise, resolve };
};
const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");
const plan = (sourceFile: string): CompiledSemanticPlan => ({
  schema_version: 1,
  source_file: sourceFile,
  module_revision: "reveal-v1",
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

Deno.test("a closed accepted fallback reveals beside retained Store-pending sibling", async () => {
  const sourceFile = "boundary-reveal/closed.tsx";
  registerCompiledSemanticPlan(plan(sourceFile));
  const readyA = deferred<string>();
  const pendingA = deferred<string>();
  const pendingB = deferred<string>();
  const firstA = new AsyncResource(readyA.promise);
  const nextA = new AsyncResource(pendingA.promise);
  const resourceB = new AsyncResource(pendingB.promise);
  readyA.resolve("old-a");
  await Promise.resolve();
  const mode = createAsyncStore(0, (_state: number, action: number) => action);
  let bRenders = 0;
  const A = defineComponent("boundary-reveal:A", () => {
    const selected = useStoreAt("mode", mode) === 0 ? firstA : nextA;
    return jsx("div", { key: "a-host" }, useAt("a-resource", selected) as string);
  });
  const programId = `${sourceFile}#component:B`;
  const B = defineComponent(programId, (props: { resource: AsyncResource<string> }) => {
    bRenders++;
    const value = useAt("b-resource", props.resource);
    return jsx("div", { key: "b-host", "data-b": "primary" }, value as string);
  }, {
    propOnlySites: [],
    closedResourceHostProgram: {
      schemaVersion: 1,
      componentProgramId: programId,
      moduleRevision: "reveal-v1",
      resourceUseSiteId: `${programId}#resource:0`,
      resourceProp: "resource",
      host: {
        tag: "div",
        key: "b-host",
        props: [["data-b", "primary"]],
        child: "resource-value",
      },
    },
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "boundary-reveal-closed",
    scheduleCommit() {},
  });
  try {
    root.mount(jsx("section", {}, [
      jsx(Suspense, {
        key: "a",
        __nativeBoundarySite: "a-boundary",
        fallback: jsx("div", { key: "a-host" }, "a-loading"),
        children: jsx(A, { key: "a-child" }),
      }),
      jsx(Suspense, {
        key: "b",
        __nativeBoundarySite: "b-boundary",
        fallback: jsx("div", { key: "b-host" }, "b-loading"),
        children: jsx(B, { key: "b-child", resource: resourceB }),
      }),
    ]));
    assertEquals(container.children.map(text), ["old-ab-loading"]);
    assertEquals(bRenders, 1);
    const acceptedA = container.children[0].children[0];

    mode.dispatch(1);
    root.flush();
    assertStrictEquals(container.children[0].children[0], acceptedA);
    assertEquals(container.children.map(text), ["old-ab-loading"]);
    const rendersBeforeReveal = bRenders;

    pendingB.resolve("ready-b");
    await Promise.resolve();
    root.flush();
    assertStrictEquals(container.children[0].children[0], acceptedA);
    assertEquals(container.children.map(text), ["old-aready-b"]);
    assertEquals(bRenders, rendersBeforeReveal);
    const acceptedB = container.children[0].children[1];
    const ownersAfterReveal = root.diagnostics().ownerCount;

    pendingA.resolve("new-a");
    await Promise.resolve();
    root.flush();
    assertEquals(container.children.map(text), ["new-aready-b"]);
    assertStrictEquals(container.children[0].children[1], acceptedB);
    assertEquals(root.diagnostics().ownerCount, ownersAfterReveal);
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("opaque settled child takes one generic render without speculative replay", async () => {
  const pending = deferred<string>();
  const resource = new AsyncResource(pending.promise);
  let renders = 0;
  const Opaque = defineComponent("boundary-reveal:opaque", () => {
    renders++;
    return jsx("div", { key: "opaque-host" }, useAt("resource", resource) as string);
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "boundary-reveal-opaque",
    scheduleCommit() {},
  });
  try {
    root.mount(jsx(Suspense, {
      key: "opaque",
      __nativeBoundarySite: "opaque-boundary",
      fallback: jsx("div", { key: "opaque-host" }, "waiting"),
      children: jsx(Opaque, { key: "child" }),
    }));
    assertEquals(renders, 1);
    pending.resolve("ready");
    await Promise.resolve();
    root.flush();
    assertEquals(renders, 2);
    assertEquals(container.children.map(text), ["ready"]);
  } finally {
    root.dispose();
  }
});

Deno.test("raw thenable changing to a Store source retains the generic control read", async () => {
  const sourceFile = "boundary-reveal/raw-control.tsx";
  registerCompiledSemanticPlan(plan(sourceFile));
  const pending = deferred<string>();
  let renders = 0;
  const programId = `${sourceFile}#component:Ready`;
  const Ready = defineComponent(programId, (props: { resource: Promise<string> }) => {
    renders++;
    return jsx("div", { key: "raw-host" },
      useAt("resource", props.resource) as string);
  }, {
    propOnlySites: [],
    closedResourceHostProgram: {
      schemaVersion: 1,
      componentProgramId: programId,
      moduleRevision: "reveal-v1",
      resourceUseSiteId: `${programId}#resource:0`,
      resourceProp: "resource",
      host: {
        tag: "div",
        key: "raw-host",
        props: [],
        child: "resource-value",
      },
    },
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "boundary-reveal-raw-control",
    scheduleCommit() {},
  });
  try {
    root.mount(jsx(Suspense, {
      key: "raw",
      __nativeBoundarySite: "raw-boundary",
      fallback: jsx("div", { key: "raw-host" }, "waiting"),
      children: jsx(Ready, { key: "ready", resource: pending.promise }),
    }));
    assertEquals(renders, 1);
    Object.assign(pending.promise, {
      [storeDependencies]: [] as const,
      read: () => "stored-value",
    });
    pending.resolve("resource-value");
    await Promise.resolve();
    root.flush();
    assertEquals(renders, 2);
    assertEquals(container.children.map(text), ["stored-value"]);
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("fallback-owned effects retire through generic reveal", async () => {
  const sourceFile = "boundary-reveal/owned-fallback.tsx";
  registerCompiledSemanticPlan(plan(sourceFile));
  const pending = deferred<string>();
  const resource = new AsyncResource(pending.promise);
  let cleanupCount = 0;
  let setFallback!: (value: number) => boolean;
  const Fallback = defineComponent("boundary-reveal:fallback-owner", () => {
    const [value, set] = useStateAt("value", 0);
    setFallback = set;
    useEffectAt("cleanup", () => () => { cleanupCount++; });
    return jsx("div", { key: "ready-host" }, `waiting:${value}`);
  });
  const programId = `${sourceFile}#component:Ready`;
  const Ready = defineComponent(programId, (props: { resource: AsyncResource<string> }) =>
    jsx("div", { key: "ready-host" }, useAt("resource", props.resource) as string), {
    propOnlySites: [],
    closedResourceHostProgram: {
      schemaVersion: 1,
      componentProgramId: programId,
      moduleRevision: "reveal-v1",
      resourceUseSiteId: `${programId}#resource:0`,
      resourceProp: "resource",
      host: {
        tag: "div",
        key: "ready-host",
        props: [],
        child: "resource-value",
      },
    },
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "boundary-reveal-owned-fallback",
    scheduleCommit() {},
  });
  try {
    root.mount(jsx(Suspense, {
      key: "owned",
      __nativeBoundarySite: "owned-boundary",
      fallback: jsx(Fallback, { key: "fallback" }),
      children: jsx(Ready, { key: "ready", resource }),
    }));
    assertEquals(container.children.map(text), ["waiting:0"]);
    pending.resolve("ready");
    await Promise.resolve();
    root.flush();
    assertEquals(container.children.map(text), ["ready"]);
    assertEquals(cleanupCount, 1);
    assertThrows(() => setFallback(1), Error, "not alive");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("partial closed reveal host failure keeps old accepted owner history", async () => {
  const sourceFile = "boundary-reveal/host-failure.tsx";
  registerCompiledSemanticPlan(plan(sourceFile));
  const pending = deferred<string>();
  const resource = new AsyncResource(pending.promise);
  let renders = 0;
  const programId = `${sourceFile}#component:Ready`;
  const Ready = defineComponent(programId, (props: { resource: AsyncResource<string> }) => {
    renders++;
    return jsx("div", { key: "host-failure-leaf" },
      useAt("resource", props.resource) as string);
  }, {
    propOnlySites: [],
    closedResourceHostProgram: {
      schemaVersion: 1,
      componentProgramId: programId,
      moduleRevision: "reveal-v1",
      resourceUseSiteId: `${programId}#resource:0`,
      resourceProp: "resource",
      host: {
        tag: "div",
        key: "host-failure-leaf",
        props: [],
        child: "resource-value",
      },
    },
  });
  let armed = false;
  class Host extends MemoryVDOMHost {
    override setText(node: MemoryNode, value: string) {
      super.setText(node, value);
      if (armed && value === "ready") throw new Error("reveal host failed");
    }
  }
  const host = new Host();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "boundary-reveal-host-failure",
    scheduleCommit() {},
  });
  try {
    root.mount(jsx(Suspense, {
      key: "failed",
      __nativeBoundarySite: "failed-boundary",
      fallback: jsx("div", { key: "host-failure-leaf" }, "waiting"),
      children: jsx(Ready, { key: "ready", resource }),
    }));
    const oldVersion = root.publicationVersion;
    const oldOwners = root.diagnostics().ownerCount;
    pending.resolve("ready");
    await Promise.resolve();
    armed = true;
    assertThrows(() => root.flush(), Error, "reveal host failed");
    assertEquals(root.publicationVersion, oldVersion);
    assertEquals(root.diagnostics().ownerCount, oldOwners);
    assertEquals(renders, 1);
    assertThrows(() => root.flush(), Error, "host commit failure");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

const closedReady = (
  sourceFile: string,
  name: string,
  onRender: () => void,
) => {
  const programId = `${sourceFile}#component:${name}`;
  const hostKey = `${name.toLowerCase()}-host`;
  return defineComponent(programId, (props: { resource: AsyncResource<string> }) => {
    onRender();
    return jsx("div", { key: hostKey },
      useAt("resource", props.resource) as string);
  }, {
    propOnlySites: [],
    closedResourceHostProgram: {
      schemaVersion: 1,
      componentProgramId: programId,
      moduleRevision: "reveal-v1",
      resourceUseSiteId: `${programId}#resource:0`,
      resourceProp: "resource",
      host: { tag: "div", key: hostKey, props: [], child: "resource-value" },
    },
  });
};

Deno.test("two ready boundaries drain beside a Store-pending sibling", async () => {
  const sourceFile = "boundary-reveal/drain-pair.tsx";
  registerCompiledSemanticPlan(plan(sourceFile));
  const firstA = deferred<string>();
  const nextA = deferred<string>();
  const b = deferred<string>();
  const c = deferred<string>();
  const initialA = new AsyncResource(firstA.promise);
  const pendingA = new AsyncResource(nextA.promise);
  const resourceB = new AsyncResource(b.promise);
  const resourceC = new AsyncResource(c.promise);
  firstA.resolve("old-a");
  await Promise.resolve();
  const mode = createAsyncStore(0, (_state: number, action: number) => action);
  const A = defineComponent(`${sourceFile}:A`, () =>
    jsx("div", { key: "a-host" }, useAt("a", useStoreAt("mode", mode) === 0
      ? initialA : pendingA) as string));
  let bRenders = 0;
  let cRenders = 0;
  const B = closedReady(sourceFile, "B", () => bRenders++);
  const C = closedReady(sourceFile, "C", () => cRenders++);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "boundary-reveal-drain-pair",
    scheduleCommit() {},
  });
  try {
    root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "a", __nativeBoundarySite: "a", fallback:
        jsx("div", { key: "a-host" }, "a-loading"), children: jsx(A, { key: "a" }) }),
      jsx(Suspense, { key: "b", __nativeBoundarySite: "b", fallback:
        jsx("div", { key: "b-host" }, "b-loading"), children: jsx(B,
        { key: "b", resource: resourceB }) }),
      jsx(Suspense, { key: "c", __nativeBoundarySite: "c", fallback:
        jsx("div", { key: "c-host" }, "c-loading"), children: jsx(C,
        { key: "c", resource: resourceC }) }),
    ]));
    const oldA = container.children[0].children[0];
    mode.dispatch(1);
    root.flush();
    const rendersBefore = [bRenders, cRenders];
    const beforeVersion = root.publicationVersion;
    b.resolve("ready-b");
    c.resolve("ready-c");
    await Promise.resolve();
    root.flush();
    assertEquals(container.children.map(text), ["old-aready-bready-c"]);
    assertStrictEquals(container.children[0].children[0], oldA);
    assertEquals([bRenders, cRenders], rendersBefore);
    assertEquals(root.publicationVersion, beforeVersion + 2);
    const readyB = container.children[0].children[1];
    const readyC = container.children[0].children[2];
    nextA.resolve("new-a");
    await Promise.resolve();
    root.flush();
    assertEquals(container.children.map(text), ["new-aready-bready-c"]);
    assertStrictEquals(container.children[0].children[1], readyB);
    assertStrictEquals(container.children[0].children[2], readyC);
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("host-time state action keeps the next ready boundary and exact dirty work", async () => {
  const sourceFile = "boundary-reveal/drain-reentry.tsx";
  registerCompiledSemanticPlan(plan(sourceFile));
  const firstA = deferred<string>();
  const nextA = deferred<string>();
  const b = deferred<string>();
  const c = deferred<string>();
  const initialA = new AsyncResource(firstA.promise);
  const pendingA = new AsyncResource(nextA.promise);
  firstA.resolve("old-a");
  await Promise.resolve();
  const mode = createAsyncStore(0, (_state: number, action: number) => action);
  const A = defineComponent(`${sourceFile}:A`, () => jsx("div", { key: "a-host" },
    useAt("a", useStoreAt("mode", mode) === 0 ? initialA : pendingA) as string));
  let setCount!: (value: number) => boolean;
  let liveSetCount!: (value: number) => boolean;
  const Counter = defineComponent(`${sourceFile}:Counter`, () => {
    const [count, set] = useStateAt("count", 0);
    setCount = set;
    return jsx("span", { key: "counter-host" }, String(count));
  });
  const B = closedReady(sourceFile, "B", () => {});
  const C = closedReady(sourceFile, "C", () => {});
  let armed = false;
  let autoSchedule = false;
  let schedules = 0;
  class Host extends MemoryVDOMHost {
    override setText(node: MemoryNode, value: string) {
      super.setText(node, value);
      if (armed && value === "ready-b") {
        armed = false;
        liveSetCount(7);
      }
    }
  }
  const host = new Host();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "boundary-reveal-drain-reentry",
    scheduleCommit(commit) {
      schedules++;
      if (autoSchedule) commit();
    },
  });
  try {
    root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "a", __nativeBoundarySite: "a", fallback:
        jsx("div", { key: "a-host" }, "a-loading"), children: jsx(A, { key: "a" }) }),
      jsx(Suspense, { key: "b", __nativeBoundarySite: "b", fallback:
        jsx("div", { key: "b-host" }, "b-loading"), children: jsx(B,
        { key: "b", resource: new AsyncResource(b.promise) }) }),
      jsx(Suspense, { key: "c", __nativeBoundarySite: "c", fallback:
        jsx("div", { key: "c-host" }, "c-loading"), children: jsx(C,
        { key: "c", resource: new AsyncResource(c.promise) }) }),
      jsx(Counter, { key: "counter" }),
    ]));
    liveSetCount = setCount;
    mode.dispatch(1);
    root.flush();
    b.resolve("ready-b");
    c.resolve("ready-c");
    await Promise.resolve();
    armed = true;
    autoSchedule = true;
    root.flush();
    autoSchedule = false;
    assertEquals(container.children.map(text), ["old-aready-bc-loading0"]);
    assertEquals(root.diagnostics().pendingChangeCount, 1);
    assertEquals(root.world.pendingChanges().length, 1);
    const scheduledAfter = schedules;
    root.flush();
    assertEquals(schedules, scheduledAfter);
    assertEquals(root.diagnostics().pendingChangeCount, 1);
    assertEquals(container.children.map(text), ["old-aready-bc-loading0"]);
    nextA.resolve("new-a");
    await Promise.resolve();
    root.flush();
    assertEquals(container.children.map(text), ["new-aready-bready-c7"]);
    assertEquals(root.diagnostics().pendingChangeCount, 0);
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("second reveal host failure preserves the first accepted receipt", async () => {
  const sourceFile = "boundary-reveal/drain-failure.tsx";
  registerCompiledSemanticPlan(plan(sourceFile));
  const b = deferred<string>();
  const c = deferred<string>();
  let bRenders = 0;
  let cRenders = 0;
  const B = closedReady(sourceFile, "B", () => bRenders++);
  const C = closedReady(sourceFile, "C", () => cRenders++);
  let armed = false;
  class Host extends MemoryVDOMHost {
    override setText(node: MemoryNode, value: string) {
      super.setText(node, value);
      if (armed && value === "ready-c") throw new Error("second reveal failed");
    }
  }
  const host = new Host();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "boundary-reveal-drain-failure",
    scheduleCommit() {},
  });
  try {
    root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "b", __nativeBoundarySite: "b", fallback:
        jsx("div", { key: "b-host" }, "b-loading"), children: jsx(B,
        { key: "b", resource: new AsyncResource(b.promise) }) }),
      jsx(Suspense, { key: "c", __nativeBoundarySite: "c", fallback:
        jsx("div", { key: "c-host" }, "c-loading"), children: jsx(C,
        { key: "c", resource: new AsyncResource(c.promise) }) }),
    ]));
    const oldVersion = root.publicationVersion;
    const oldOwners = root.diagnostics().ownerCount;
    b.resolve("ready-b");
    c.resolve("ready-c");
    await Promise.resolve();
    armed = true;
    assertThrows(() => root.flush(), Error, "second reveal failed");
    assertEquals(root.publicationVersion, oldVersion + 1);
    assertEquals(root.diagnostics().ownerCount, oldOwners + 1);
    assertEquals(container.children[0].children[0] && text(container.children[0].children[0]),
      "ready-b");
    assertEquals([bRenders, cRenders], [1, 1]);
    assertThrows(() => root.flush(), Error, "host commit failure");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("opaque ready target stays pending while a closed sibling reveals", async () => {
  const sourceFile = "boundary-reveal/drain-opaque.tsx";
  registerCompiledSemanticPlan(plan(sourceFile));
  const firstA = deferred<string>();
  const nextA = deferred<string>();
  const b = deferred<string>();
  const c = deferred<string>();
  const initialA = new AsyncResource(firstA.promise);
  const pendingA = new AsyncResource(nextA.promise);
  const resourceC = new AsyncResource(c.promise);
  firstA.resolve("old-a");
  await Promise.resolve();
  const mode = createAsyncStore(0, (_state: number, action: number) => action);
  const A = defineComponent(`${sourceFile}:A`, () => jsx("div", { key: "a-host" },
    useAt("a", useStoreAt("mode", mode) === 0 ? initialA : pendingA) as string));
  let bRenders = 0;
  const B = closedReady(sourceFile, "B", () => bRenders++);
  const C = defineComponent(`${sourceFile}:Opaque`, () => {
    return jsx("div", { key: "c-host" }, useAt("c", resourceC) as string);
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "boundary-reveal-drain-opaque",
    scheduleCommit() {},
  });
  try {
    root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "a", __nativeBoundarySite: "a", fallback:
        jsx("div", { key: "a-host" }, "a-loading"), children: jsx(A, { key: "a" }) }),
      jsx(Suspense, { key: "b", __nativeBoundarySite: "b", fallback:
        jsx("div", { key: "b-host" }, "b-loading"), children: jsx(B,
        { key: "b", resource: new AsyncResource(b.promise) }) }),
      jsx(Suspense, { key: "c", __nativeBoundarySite: "c", fallback:
        jsx("div", { key: "c-host" }, "c-loading"), children: jsx(C,
        { key: "c" }) }),
    ]));
    mode.dispatch(1);
    root.flush();
    const beforeB = bRenders;
    b.resolve("ready-b");
    c.resolve("ready-c");
    await Promise.resolve();
    root.flush();
    assertEquals(container.children.map(text), ["old-aready-bc-loading"]);
    assertEquals(bRenders, beforeB + 1);
    const acceptedB = container.children[0].children[1];
    root.flush();
    assertEquals(container.children.map(text), ["old-aready-bc-loading"]);
    nextA.resolve("new-a");
    await Promise.resolve();
    root.flush();
    assertEquals(container.children.map(text), ["new-aready-bready-c"]);
    assertStrictEquals(container.children[0].children[1], acceptedB);
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("disposal during the first receipt stops the remaining ready target", async () => {
  const sourceFile = "boundary-reveal/drain-dispose.tsx";
  registerCompiledSemanticPlan(plan(sourceFile));
  const b = deferred<string>();
  const c = deferred<string>();
  const B = closedReady(sourceFile, "B", () => {});
  const C = closedReady(sourceFile, "C", () => {});
  let disposeRoot = () => {};
  let cWrites = 0;
  class Host extends MemoryVDOMHost {
    override setText(node: MemoryNode, value: string) {
      super.setText(node, value);
      if (value === "ready-b") disposeRoot();
      if (value === "ready-c") cWrites++;
    }
  }
  const host = new Host();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "boundary-reveal-drain-dispose",
    scheduleCommit() {},
  });
  disposeRoot = () => root.dispose();
  try {
    root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "b", __nativeBoundarySite: "b", fallback:
        jsx("div", { key: "b-host" }, "b-loading"), children: jsx(B,
        { key: "b", resource: new AsyncResource(b.promise) }) }),
      jsx(Suspense, { key: "c", __nativeBoundarySite: "c", fallback:
        jsx("div", { key: "c-host" }, "c-loading"), children: jsx(C,
        { key: "c", resource: new AsyncResource(c.promise) }) }),
    ]));
    b.resolve("ready-b");
    c.resolve("ready-c");
    await Promise.resolve();
    assertThrows(() => root.flush(), Error,
      "Native root candidate was cancelled during host commit");
    assertEquals(root.diagnostics().disposed, true);
    assertEquals(cWrites, 0);
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("frozen child accessors decline the closed reveal", async () => {
  const sourceFile = "boundary-reveal/accessor-child.tsx";
  registerCompiledSemanticPlan(plan(sourceFile));
  const pending = deferred<string>();
  const resource = new AsyncResource(pending.promise);
  let renders = 0;
  const Ready = closedReady(sourceFile, "B", () => renders++);
  const childProps = Object.freeze({ key: "ready", resource });
  const child = Object.freeze({
    get type() { return Ready; },
    get props() { return childProps; },
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "boundary-reveal-accessor-child",
    scheduleCommit() {},
  });
  try {
    root.mount(jsx(Suspense, {
      key: "b",
      __nativeBoundarySite: "b",
      fallback: jsx("div", { key: "b-host" }, "loading"),
      children: child,
    }));
    assertEquals(renders, 1);
    pending.resolve("ready");
    await Promise.resolve();
    root.flush();
    assertEquals(renders, 2);
    assertEquals(container.children.map(text), ["ready"]);
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("a target arriving from a host callback waits for a fresh receipt", async () => {
  const sourceFile = "boundary-reveal/drain-arrival.tsx";
  registerCompiledSemanticPlan(plan(sourceFile));
  const b = deferred<string>();
  const c = deferred<string>();
  const B = closedReady(sourceFile, "B", () => {});
  const C = closedReady(sourceFile, "C", () => {});
  let cWrites = 0;
  class Host extends MemoryVDOMHost {
    override setText(node: MemoryNode, value: string) {
      super.setText(node, value);
      if (value === "ready-b") c.resolve("ready-c");
      if (value === "ready-c") cWrites++;
    }
  }
  const host = new Host();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "boundary-reveal-drain-arrival",
    scheduleCommit() {},
  });
  try {
    root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "b", __nativeBoundarySite: "b", fallback:
        jsx("div", { key: "b-host" }, "b-loading"), children: jsx(B,
        { key: "b", resource: new AsyncResource(b.promise) }) }),
      jsx(Suspense, { key: "c", __nativeBoundarySite: "c", fallback:
        jsx("div", { key: "c-host" }, "c-loading"), children: jsx(C,
        { key: "c", resource: new AsyncResource(c.promise) }) }),
    ]));
    b.resolve("ready-b");
    await Promise.resolve();
    root.flush();
    assertEquals(container.children.map(text), ["ready-bc-loading"]);
    assertEquals(cWrites, 0);
    await Promise.resolve();
    root.flush();
    assertEquals(container.children.map(text), ["ready-bready-c"]);
    assertEquals(cWrites, 1);
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});
