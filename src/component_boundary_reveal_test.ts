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
