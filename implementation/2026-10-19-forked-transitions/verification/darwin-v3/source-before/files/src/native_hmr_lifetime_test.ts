import { assertEquals, assertThrows } from "jsr:@std/assert";
import { asyncTask } from "./async_task_plan.ts";
import { AsyncResource } from "./async_resource_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import {
  invalidateCompiledSemanticPlan,
  registerCompiledSemanticPlan,
  type CompiledSemanticPlan,
} from "./compiled_semantic_plan.ts";
import { ComponentStateRoot, defineComponent, Suspense, useAt, useEffectAt, useStoreAt } from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { NativeTaskTransitionQueue } from "./native_task_transition.ts";
import { type NativeTaskExecution } from "./native_task_execution.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const plan = (source: string, revision: string): CompiledSemanticPlan => ({
  schema_version: 1,
  source_file: source,
  module_revision: revision,
  owners: [], sources: [], sinks: [], operations: [],
  graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
});
const rootFor = (id: string) => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  return { root: new ComponentStateRoot(host, container, {
    rootId: id,
    scheduleCommit() {},
  }), container };
};
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => resolve = done);
  return { promise, resolve };
};

Deno.test("HMR retires accepted effects and pending tasks without touching another root", async () => {
  const firstSource = "hmr-lifetime/first.tsx";
  const secondSource = "hmr-lifetime/second.tsx";
  registerCompiledSemanticPlan(plan(firstSource, "a"));
  registerCompiledSemanticPlan(plan(secondSource, "a"));
  const first = rootFor("hmr-lifetime-first");
  const second = rootFor("hmr-lifetime-second");
  const taskQueue = new NativeTaskTransitionQueue();
  const waiting = deferred<string>();
  const tasks = [asyncTask("slow", [], () => waiting.promise)] as const;
  let setups = 0, cleanups = 0;
  const First = defineComponent(`${firstSource}#component:First`, () => {
    useEffectAt("effect", () => {
      setups++;
      return () => { cleanups++; };
    });
    return jsx("b", {}, "first");
  });
  const Second = defineComponent(`${secondSource}#component:Second`, () => jsx("b", {}, "second"));
  const Pending = defineComponent(`${firstSource}#component:Pending`,
    ({ execution }: { execution: NativeTaskExecution<typeof tasks> }) =>
      jsx("b", {}, useAt("slow", execution.resource("slow")) as string));
  try {
    first.root.mount(jsx(First, {}));
    second.root.mount(jsx(Second, {}));
    const secondVersion = second.root.publicationVersion;
    const handle = taskQueue.enqueue(tasks, [{
      root: first.root,
      buildTree: (execution) => jsx(Suspense, {
        __nativeBoundarySite: "hmr-task-boundary",
        fallback: jsx("i", {}, "waiting"),
        children: jsx(Pending, { execution }),
      }),
    }]);
    assertEquals(handle.status, "pending");
    assertEquals(setups, 1);
    registerCompiledSemanticPlan(plan(firstSource, "a"));
    assertEquals(handle.status, "pending");
    assertEquals(cleanups, 0);
    assertEquals(invalidateCompiledSemanticPlan(firstSource, "obsolete"), false);
    assertEquals(handle.status, "pending");
    invalidateCompiledSemanticPlan(firstSource, "a");
    assertEquals((await handle.completion).status, "cancelled");
    assertEquals(cleanups, 1);
    assertEquals(second.root.publicationVersion, secondVersion);
    second.root.update(jsx(Second, {}));
    assertEquals(second.root.publicationVersion, secondVersion + 1);
    waiting.resolve("late");
    await Promise.resolve();
    assertThrows(() => first.root.flush(), Error, "Compiled module changed");
    assertEquals(cleanups, 1);
  } finally {
    taskQueue.dispose();
    first.root.dispose();
    second.root.dispose();
    invalidateCompiledSemanticPlan(firstSource);
    invalidateCompiledSemanticPlan(secondSource);
  }
});

Deno.test("unrelated HMR preserves a blocked direct update and its resource wake", async () => {
  const firstSource = "hmr-lifetime/unrelated.tsx";
  const secondSource = "hmr-lifetime/blocked.tsx";
  registerCompiledSemanticPlan(plan(firstSource, "a"));
  registerCompiledSemanticPlan(plan(secondSource, "a"));
  const first = rootFor("hmr-unrelated-first");
  const second = rootFor("hmr-unrelated-second");
  const old = deferred<string>();
  const waiting = deferred<string>();
  const oldResource = new AsyncResource(old.promise);
  const pendingResource = new AsyncResource(waiting.promise);
  const gate = createAsyncStore(oldResource,
    (_: AsyncResource<string>, next: AsyncResource<string>) => next);
  const First = defineComponent(`${firstSource}#component:First`, () => jsx("b", {}, "first"));
  const Second = defineComponent(`${secondSource}#component:Second`, () =>
    jsx("b", {}, useAt("data", useStoreAt("gate", gate)) as string));
  const tree = (label: string) => jsx("section", {}, [
    jsx(Suspense, { __nativeBoundarySite: "hmr-blocked", fallback: jsx("i", {}, "waiting"),
      children: jsx(Second, {}) }),
    jsx("strong", {}, label),
  ]);
  try {
    first.root.mount(jsx(First, {}));
    old.resolve("old");
    await Promise.resolve();
    second.root.mount(tree("old"));
    const accepted = second.root.publicationVersion;
    gate.dispatch(pendingResource);
    second.root.flush();
    second.root.update(tree("desired"));
    assertEquals(second.root.publicationVersion, accepted);
    invalidateCompiledSemanticPlan(firstSource, "a");
    assertEquals(second.root.publicationVersion, accepted);
    waiting.resolve("ready");
    await Promise.resolve();
    second.root.flush();
    assertEquals(second.root.publicationVersion, accepted + 1);
  } finally {
    first.root.dispose();
    second.root.dispose();
    invalidateCompiledSemanticPlan(firstSource);
    invalidateCompiledSemanticPlan(secondSource);
  }
});

Deno.test("first prepared mount loses its lease when its compiled module retires", () => {
  const source = "hmr-lifetime/prepared.tsx";
  registerCompiledSemanticPlan(plan(source, "a"));
  const app = rootFor("hmr-prepared-first");
  const View = defineComponent(`${source}#component:View`, () => jsx("b", {}, "old"));
  try {
    const candidate = app.root.prepare(jsx(View, {}));
    assertEquals(candidate.validate(), true);
    invalidateCompiledSemanticPlan(source, "a");
    assertEquals(candidate.validate(), false);
    assertEquals(app.container.children.length, 0);
    assertThrows(() => candidate.commitHost(), Error);
  } finally {
    app.root.dispose();
    invalidateCompiledSemanticPlan(source);
  }
});

Deno.test("obsolete HMR disposal cannot retire a newly mounted revision", () => {
  const source = "hmr-lifetime/replaced.tsx";
  registerCompiledSemanticPlan(plan(source, "a"));
  const oldRoot = rootFor("hmr-old-revision");
  const Old = defineComponent(`${source}#component:View`, () => jsx("b", {}, "old"));
  let newRoot: ReturnType<typeof rootFor> | undefined;
  try {
    oldRoot.root.mount(jsx(Old, {}));
    registerCompiledSemanticPlan(plan(source, "b"));
    assertEquals(oldRoot.root.retired, true);
    const New = defineComponent(`${source}#component:View`, () => jsx("b", {}, "new"));
    newRoot = rootFor("hmr-new-revision");
    newRoot.root.mount(jsx(New, {}));
    const version = newRoot.root.publicationVersion;
    assertEquals(invalidateCompiledSemanticPlan(source, "a"), false);
    assertEquals(newRoot.root.retired, false);
    newRoot.root.update(jsx(New, {}));
    assertEquals(newRoot.root.publicationVersion, version + 1);
  } finally {
    oldRoot.root.dispose();
    newRoot?.root.dispose();
    invalidateCompiledSemanticPlan(source);
  }
});

Deno.test("HMR inside a host writer delays retirement callbacks and keeps accepted history old", () => {
  const source = "hmr-lifetime/host.tsx";
  registerCompiledSemanticPlan(plan(source, "a"));
  let inWriter = false;
  let retiredDuringWriter = false;
  let retireCallbacks = 0;
  let lateRetireCallbacks = 0;
  let lateDuringWriter = false;
  let lateAtRegistration = -1;
  let root!: ComponentStateRoot<MemoryNode, MemoryNode>;
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name !== "data-count" || value !== 7) return;
      inWriter = true;
      try {
        invalidateCompiledSemanticPlan(source, "a");
        root.onRetire(() => {
          lateRetireCallbacks++;
          lateDuringWriter = inWriter;
        });
        lateAtRegistration = lateRetireCallbacks;
      } finally { inWriter = false; }
    }
  }
  const host = new Host();
  const container = host.createContainer();
  root = new ComponentStateRoot(host, container, {
    rootId: "hmr-host-writer", scheduleCommit() {},
  });
  const View = defineComponent(`${source}#component:View`,
    ({ count }: { count: number }) => jsx("output", { "data-count": count }, String(count)));
  const queue = new NativeRootWorkQueue();
  try {
    root.mount(jsx(View, { count: 0 }));
    const accepted = root.publicationVersion;
    root.onRetire(() => { retireCallbacks++; retiredDuringWriter = inWriter; });
    assertThrows(() => root.update(jsx(View, { count: 7 })), Error);
    assertEquals(lateAtRegistration, 0);
    assertEquals(retireCallbacks, 1);
    assertEquals(retiredDuringWriter, false);
    assertEquals(lateRetireCallbacks, 1);
    assertEquals(lateDuringWriter, false);
    assertEquals(root.retired, true);
    assertEquals(root.publicationVersion, accepted);
    root.onRetire(() => { lateRetireCallbacks++; });
    assertEquals(lateRetireCallbacks, 2);
    assertThrows(() => queue.enqueue({ id: "retired", roots: [{ root, tree: jsx(View, { count: 7 }) }] }),
      Error, "retired");
  } finally {
    queue.dispose();
    root.dispose();
    invalidateCompiledSemanticPlan(source);
  }
});

Deno.test("throwing retirement listener cannot skip deferred disposal after a host failure", () => {
  const source = "hmr-lifetime/host-failure.tsx";
  registerCompiledSemanticPlan(plan(source, "a"));
  const hostError = new Error("host writer failed");
  const retireError = new Error("retirement listener failed");
  let root!: ComponentStateRoot<MemoryNode, MemoryNode>;
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name !== "data-count" || value !== 7) return;
      invalidateCompiledSemanticPlan(source, "a");
      root.dispose();
      throw hostError;
    }
  }
  const host = new Host();
  const container = host.createContainer();
  root = new ComponentStateRoot(host, container, {
    rootId: "hmr-host-failure", scheduleCommit() {},
  });
  const View = defineComponent(`${source}#component:View`,
    ({ count }: { count: number }) => jsx("output", { "data-count": count }, String(count)));
  const hasError = (value: unknown, target: unknown): boolean =>
    value === target || value instanceof AggregateError &&
      value.errors.some((error) => hasError(error, target));
  try {
    root.mount(jsx(View, { count: 0 }));
    root.onRetire(() => { throw retireError; });
    let caught: unknown;
    try { root.update(jsx(View, { count: 7 })); } catch (error) { caught = error; }
    assertEquals(hasError(caught, hostError), true);
    assertEquals(hasError(caught, retireError), true);
    assertEquals(root.diagnostics().disposed, true);
    assertEquals(root.diagnostics().ownerCount, 0);
    assertEquals(container.children.length, 0);
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(source);
  }
});
