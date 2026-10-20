import { assert, assertEquals, assertStrictEquals, assertThrows } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import { createAsyncStore, type AsyncStore } from "./async_store_runtime.ts";
import {
  ComponentStateRoot,
  Suspense,
  defineComponent,
  useAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import {
  invalidateCompiledSemanticPlan,
  registerCompiledSemanticPlan,
  type CompiledSemanticPlan,
} from "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

type NumericStore = AsyncStore<number, number>;
const revision = "store-host-cut-v1";
const makeStore = () => createAsyncStore(1, (_value: number, next: number) => next);
const plan = (sourceFile: string): CompiledSemanticPlan => ({
  schema_version: 1, source_file: sourceFile, module_revision: revision,
  owners: [], sources: [], sinks: [], operations: [],
  graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
});
const value = (container: MemoryNode, key: string) => {
  const node = container.children[0].children.find((child) => child.props["data-leaf"] === key);
  assert(node, `missing ${key} host`);
  return { node, value: node.props["data-x"] };
};
const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");
const publish = (
  candidate: NonNullable<ReturnType<ComponentStateRoot<MemoryNode, MemoryNode>["prepareStores"]>>,
) => {
  assert(candidate.validate());
  candidate.commitHost();
  assert(candidate.validatePostHost());
  candidate.preparePublication();
  candidate.publish();
  candidate.runEffects();
};

async function fixture(
  id: string,
  options: {
    host?: MemoryVDOMHost;
    position?: NumericStore;
    outline?: NumericStore;
    health?: boolean;
    opaqueReader?: boolean;
    oneLeaf?: boolean;
    scheduleCommit?: (commit: () => void) => void;
  } = {},
) {
  const sourceFile = `store-host-cut/${id}.tsx`;
  registerCompiledSemanticPlan(plan(sourceFile));
  const position = options.position ?? makeStore();
  const outline = options.outline ?? position;
  const host = options.host ?? new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: id, scheduleCommit: options.scheduleCommit ?? (() => {}),
  });
  const renderCount = { mesh: 0, outline: 0, opaque: 0 };
  const leaf = (name: "mesh" | "outline") => {
    const programId = `${sourceFile}#component:${name}`;
    const storeUseSiteId = `${programId}#store:0`;
    return defineComponent(programId, (props: { store: NumericStore }) => {
      renderCount[name]++;
      const next = useStoreAt(storeUseSiteId, props.store);
      return jsx("div", { key: `${name}-host`, "data-leaf": name, "data-x": next });
    }, {
      propOnlySites: [],
      closedStoreHostProgram: {
        schemaVersion: 1, componentProgramId: programId, moduleRevision: revision,
        storeUseSiteId, storeProp: "store",
        host: { tag: "div", key: `${name}-host`, child: null,
          props: [["data-leaf", { kind: "literal", value: name }],
            ["data-x", { kind: "input", index: 0 }]] },
      },
    });
  };
  const Mesh = leaf("mesh"), Outline = leaf("outline");
  const ready = new AsyncResource(Promise.resolve("healthy"));
  const health = createAsyncStore(ready, (_old: AsyncResource<string>, next: AsyncResource<string>) => next);
  const Health = defineComponent(`${id}:health`, () => {
    const resource = useStoreAt(`${id}:health-store`, health);
    return jsx("span", { key: "health-host", "data-health": "yes" },
      useAt(`${id}:health-resource`, resource) as string);
  });
  const Opaque = defineComponent(`${id}:opaque`, () => {
    renderCount.opaque++;
    return jsx("span", { key: "opaque-host" },
      String(useStoreAt(`${id}:opaque-store`, position)));
  });
  const tree = (meshStore = position, outlineStore = outline) =>
    jsx("section", {}, [
      jsx(Mesh, { key: "mesh-owner", store: meshStore }),
      ...(options.oneLeaf ? [] : [jsx(Outline, { key: "outline-owner", store: outlineStore })]),
      ...(options.health ? [jsx(Suspense, {
        key: "health-boundary",
        __nativeBoundarySite: `${id}:health-boundary`,
        fallback: jsx("span", { key: "health-fallback" }, "loading"),
        children: jsx(Health, { key: "health-owner" }),
      })] : []),
      ...(options.opaqueReader ? [jsx(Opaque, { key: "opaque-owner" })] : []),
    ]);
  await Promise.resolve();
  root.mount(tree());
  return { sourceFile, host, container, root, position, outline, health,
    renderCount, tree, dispose: () => root.dispose() };
}

Deno.test("closed Store cut publishes all same-Store host leaves while health remains pending", async () => {
  const f = await fixture("same-store-health", { health: true });
  try {
    const mesh = value(f.container, "mesh").node;
    const outline = value(f.container, "outline").node;
    const pending = new AsyncResource(new Promise<string>(() => {}));
    f.health.dispatch(pending);
    f.root.flush();
    assertEquals(text(f.container.children[0].children[2]), "healthy");
    const before = { ...f.renderCount };
    f.position.dispatch(2);
    const cut = f.root.prepareStores([f.position]);
    assert(cut, "closed Store cut declined beside pending health");
    publish(cut);
    assertStrictEquals(value(f.container, "mesh").node, mesh);
    assertStrictEquals(value(f.container, "outline").node, outline);
    assertEquals([value(f.container, "mesh").value, value(f.container, "outline").value], [2, 2]);
    assertEquals(text(f.container.children[0].children[2]), "healthy");
    assertEquals(f.renderCount, before);
    assertEquals(f.position.diagnostics().readers, 2);
  } finally { f.dispose(); }
  assertEquals(f.position.diagnostics().roots, 0);
});

Deno.test("ordinary flush admits complete closed Store fanout beside pending health", async () => {
  const closed = await fixture("automatic-fanout", { health: true });
  const opaque = await fixture("opaque-reader", { opaqueReader: true });
  try {
    closed.health.dispatch(new AsyncResource(new Promise<string>(() => {})));
    closed.root.flush();
    assertEquals(text(closed.container.children[0].children[2]), "healthy");
    const before = { ...closed.renderCount };
    closed.position.dispatch(3);
    assertEquals(closed.root.flush(), true);
    assertEquals([value(closed.container, "mesh").value,
      value(closed.container, "outline").value], [3, 3]);
    assertEquals(closed.renderCount, before);
    opaque.position.dispatch(4);
    assertEquals(opaque.root.prepareStores([opaque.position]), null);
    assertEquals(value(opaque.container, "mesh").value, 1);
  } finally { closed.dispose(); opaque.dispose(); }
});

Deno.test("automatic closed Store cut drains its generic follow-up without rescheduling a no-op", async () => {
  const tasks: Array<() => void> = [];
  let scheduled = 0;
  const f = await fixture("automatic-drain", {
    health: true, oneLeaf: true,
    scheduleCommit(commit) { scheduled++; tasks.push(commit); },
  });
  const drain = () => {
    let ran = 0;
    while (tasks.length > 0 && ran < 8) {
      tasks.shift()!();
      ran++;
    }
    assertEquals(tasks.length, 0, "scheduled work must drain without a spin");
    return ran;
  };
  try {
    f.health.dispatch(new AsyncResource(new Promise<string>(() => {})));
    f.root.flush();
    drain();
    const before = { ...f.renderCount };
    f.position.dispatch(2);
    const scheduledAfterDispatch = scheduled;
    assertEquals(f.root.flush(), true);
    assertEquals(value(f.container, "mesh").value, 2);
    assertEquals(f.renderCount, before);
    assertEquals(scheduled, scheduledAfterDispatch + 1,
      "unacknowledged Store generation needs one generic follow-up");
    assert(drain() > 0);
    assertEquals(value(f.container, "mesh").value, 2);
    assertEquals(tasks.length, 0);
  } finally { f.dispose(); }
});

Deno.test("disjoint Store leaves merge through one ancestor while overlap and full tree go stale", async () => {
  const second = makeStore();
  const f = await fixture("disjoint-store-cuts", { outline: second });
  try {
    f.position.dispatch(2);
    second.dispatch(3);
    const full = f.root.prepare(f.tree());
    const mesh = f.root.prepareStores([f.position]);
    const duplicate = f.root.prepareStores([f.position]);
    const outline = f.root.prepareStores([second]);
    assert(mesh && duplicate && outline);
    publish(mesh);
    assertEquals(duplicate.validate(), false);
    assertEquals(full.validate(), false);
    assertEquals(outline.validate(), true);
    publish(outline);
    assertEquals([value(f.container, "mesh").value,
      value(f.container, "outline").value], [2, 3]);
    duplicate.discard();
    full.discard();
  } finally { f.dispose(); }
});

Deno.test("newer Store action during host write remains pending after exact accepted cut", async () => {
  class ReentrantHost extends MemoryVDOMHost {
    onWrite: (() => void) | null = null;
    override setProp(node: MemoryNode, name: string, next: unknown, previous?: unknown) {
      super.setProp(node, name, next, previous);
      if (name === "data-x" && next === 2) this.onWrite?.();
    }
  }
  const host = new ReentrantHost();
  const f = await fixture("host-time-newer-action", { host, oneLeaf: true });
  try {
    f.position.dispatch(2);
    const cut = f.root.prepareStores([f.position]);
    assert(cut);
    host.onWrite = () => { host.onWrite = null; f.position.dispatch(3); };
    publish(cut);
    assertEquals(value(f.container, "mesh").value, 2);
    assertEquals(f.position.getState(), 3);
    assertEquals(f.root.flush(), true);
    assertEquals(value(f.container, "mesh").value, 3);
  } finally { f.dispose(); }
});

Deno.test("Store identity replacement, module invalidation and disposal revoke prepared cuts", async () => {
  const f = await fixture("store-identity-replacement", { oneLeaf: true });
  try {
    f.position.dispatch(2);
    const old = f.root.prepareStores([f.position]);
    assert(old);
    const replacement = makeStore();
    f.root.update(f.tree(replacement));
    assertEquals(old.validate(), false);
    assertEquals(value(f.container, "mesh").value, 1);
    old.discard();
    replacement.dispatch(5);
    const current = f.root.prepareStores([replacement]);
    assert(current);
    invalidateCompiledSemanticPlan(f.sourceFile, revision);
    assertEquals(current.validate(), false);
    current.discard();
  } finally { f.dispose(); }
  assertEquals(f.position.diagnostics().roots, 0);
  const disposed = await fixture("store-cut-disposed", { oneLeaf: true });
  disposed.position.dispatch(2);
  const cut = disposed.root.prepareStores([disposed.position]);
  assert(cut);
  disposed.dispose();
  assertEquals(cut.validate(), false);
  cut.discard();
  assertEquals(disposed.position.diagnostics().roots, 0);
});

Deno.test("declared two-root Store group accepts together and terminally contains second-host failure", async () => {
  const shared = makeStore();
  const a = await fixture("store-group-a", { position: shared, oneLeaf: true });
  const b = await fixture("store-group-b", { position: shared, oneLeaf: true });
  const queue = new NativeRootWorkQueue();
  try {
    const before = [a.root.publicationVersion, b.root.publicationVersion];
    shared.dispatch(5);
    const done = queue.enqueueStores({ id: "store-group-success", roots: [
      { root: a.root, stores: [shared] }, { root: b.root, stores: [shared] },
    ] });
    assertEquals(done.status, "committed");
    assertEquals([value(a.container, "mesh").value, value(b.container, "mesh").value], [5, 5]);
    assertEquals([a.root.publicationVersion, b.root.publicationVersion], before.map((v) => v + 1));
  } finally { queue.dispose(); a.dispose(); b.dispose(); }

  class FailingHost extends MemoryVDOMHost {
    fail = false;
    override setProp(node: MemoryNode, name: string, next: unknown, previous?: unknown) {
      super.setProp(node, name, next, previous);
      if (this.fail && name === "data-x" && next === 9) throw new Error("second host partial write");
    }
  }
  const failedShared = makeStore(), failingHost = new FailingHost();
  const first = await fixture("store-group-first", { position: failedShared, oneLeaf: true });
  const second = await fixture("store-group-second", {
    position: failedShared, oneLeaf: true, host: failingHost,
  });
  const failedQueue = new NativeRootWorkQueue();
  try {
    const accepted = [JSON.stringify(first.root.snapshot), JSON.stringify(second.root.snapshot)];
    const before = [first.root.publicationVersion, second.root.publicationVersion];
    failedShared.dispatch(9);
    failingHost.fail = true;
    const work = failedQueue.enqueueStores({ id: "store-group-failed", roots: [
      { root: first.root, stores: [failedShared] },
      { root: second.root, stores: [failedShared] },
    ] });
    assertEquals(work.status, "failed");
    assertEquals([first.root.publicationVersion, second.root.publicationVersion], before);
    assertEquals([JSON.stringify(first.root.snapshot), JSON.stringify(second.root.snapshot)], accepted);
    assertThrows(() => first.root.prepareStores([failedShared]));
    assertThrows(() => second.root.prepareStores([failedShared]));
  } finally {
    failedQueue.dispose();
    failingHost.fail = false;
    first.dispose(); second.dispose();
  }
  assertEquals(failedShared.diagnostics().roots, 0);
});
