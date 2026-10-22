import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { AsyncStore, createAsyncStore } from "./async_store_runtime.ts";
import { AsyncResource } from "./async_resource_runtime.ts";
import {
  ComponentStateRoot, defineComponent, Suspense, useAt, useEffectAt, useStoreAt,
} from "./component_state_runtime.ts";
import {
  invalidateCompiledSemanticPlan, registerCompiledSemanticPlan,
} from "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");

Deno.test("a later root's Store preparation callback cannot leave an accepted group prefix", () => {
  const world = new OwnerStateWorld();
  const leftStore = createAsyncStore(0, (_old: number, next: number) => next);
  const original = new Error("right-reader-preparation-fault");
  let armed = false, callbacks = 0;
  class CallbackStore extends AsyncStore<number, number> {
    override _prepareReaderValues(
      rootId: string,
      pending: ReadonlyMap<string, ReadonlyMap<object, unknown> | null>,
    ) {
      if (armed) {
        callbacks++;
        leftStore.dispatch(2);
        throw original;
      }
      return super._prepareReaderValues(rootId, pending);
    }
  }
  const rightStore = new CallbackStore(0, (_old, next) => next);
  const View = defineComponent("publication-callback-view", (
    props: { store: AsyncStore<number, number> },
  ) => jsx("output", {}, String(useStoreAt("publication-callback-reader", props.store))));
  const roots = ["left", "right"].map((name) => {
    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    const root = new ComponentStateRoot(host, container, {
      world, rootId: `publication-callback-${name}`, scheduleCommit() {},
    });
    return { root, container };
  });
  const queue = new NativeRootWorkQueue();
  try {
    const [left, right] = roots;
    const leftTree = jsx(View, { store: leftStore });
    const rightTree = jsx(View, { store: rightStore });
    left.root.mount(leftTree);
    right.root.mount(rightTree);
    const versions = roots.map(({ root }) => root.publicationVersion);
    const accepted = roots.map(({ root }) => root.snapshot);
    leftStore.dispatch(1);
    rightStore.dispatch(1);
    armed = true;
    const work = queue.enqueue({ id: "publication-reader-preparation-fault", renderPreparation: "repeatable", roots: [
      { root: left.root, tree: leftTree },
      { root: right.root, tree: rightTree },
    ] });
    assertEquals(work.status, "failed");
    assertStrictEquals(work.resolution.error, original);
    assertEquals(callbacks, 1);
    assertEquals(roots.map(({ root }) => root.publicationVersion), versions);
    for (let index = 0; index < roots.length; index++) {
      assertStrictEquals(roots[index].root.snapshot, accepted[index]);
    }
    assertEquals(leftStore.getState(), 2, "newer callback action disappeared");
  } finally {
    armed = false;
    queue.dispose();
    for (const { root, container } of roots) {
      root.dispose();
      assertEquals(root.diagnostics().ownerCount, 0);
      assertEquals(container.children.length, 0);
    }
  }
  assert(leftStore.diagnostics().roots === 0 && rightStore.diagnostics().roots === 0);
});

Deno.test("a later nonthrowing Store callback revokes an earlier root before group acceptance", () => {
  const world = new OwnerStateWorld();
  const leftStore = createAsyncStore(0, (_old: number, next: number) => next);
  const newer = createAsyncStore(0, (_old: number, next: number) => next);
  let armed = false, callbacks = 0;
  let leftRoot!: ComponentStateRoot<MemoryNode, MemoryNode>;
  class RetiringStore extends AsyncStore<number, number> {
    override _prepareReaderValues(
      rootId: string,
      pending: ReadonlyMap<string, ReadonlyMap<object, unknown> | null>,
    ) {
      if (armed) {
        callbacks++;
        newer.dispatch(2);
        leftRoot.dispose();
      }
      return super._prepareReaderValues(rootId, pending);
    }
  }
  const rightStore = new RetiringStore(0, (_old, next) => next);
  const View = defineComponent("publication-callback-retirement-view", (
    props: { store: AsyncStore<number, number> },
  ) => jsx("output", {}, String(useStoreAt("publication-callback-retirement-reader", props.store))));
  const roots = ["left", "right"].map((name) => {
    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    const root = new ComponentStateRoot(host, container, {
      world, rootId: `publication-retirement-${name}`, scheduleCommit() {},
    });
    return { root, container };
  });
  const [left, right] = roots;
  leftRoot = left.root;
  const queue = new NativeRootWorkQueue();
  try {
    const leftTree = jsx(View, { store: leftStore });
    const rightTree = jsx(View, { store: rightStore });
    left.root.mount(leftTree);
    right.root.mount(rightTree);
    const versions = roots.map(({ root }) => root.publicationVersion);
    const rightAccepted = right.root.snapshot;
    leftStore.dispatch(1);
    rightStore.dispatch(1);
    armed = true;
    const work = queue.enqueue({ id: "publication-reader-retires-earlier-root", renderPreparation: "repeatable", roots: [
      { root: left.root, tree: leftTree },
      { root: right.root, tree: rightTree },
    ] });
    assertEquals(callbacks, 1, "later Store preparation callback did not run");
    assertEquals(work.status, "failed", "group accepted after earlier root retired");
    assertEquals(roots.map(({ root }) => root.publicationVersion), versions,
      "an accepted group prefix escaped after deferred disposal");
    assertStrictEquals(right.root.snapshot, rightAccepted,
      "later root accepted despite earlier root retirement");
    assertEquals(left.root.diagnostics().disposed, true,
      "earlier root did not complete deferred disposal");
    assertEquals(newer.getState(), 2, "newer callback action disappeared");
  } finally {
    armed = false;
    queue.dispose();
    for (const { root, container } of roots) {
      root.dispose();
      assertEquals(root.diagnostics().ownerCount, 0);
      assertEquals(container.children.length, 0);
    }
  }
  assert(leftStore.diagnostics().roots === 0 && rightStore.diagnostics().roots === 0 &&
    newer.diagnostics().roots === 0);
});

Deno.test("a default Proxy around a registered component keeps generic grouped publication", () => {
  const sourceFile = "publication-callback/proxy-component.tsx";
  registerCompiledSemanticPlan({
    schema_version: 1, source_file: sourceFile, module_revision: "proxy-component-v1",
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
  });
  const world = new OwnerStateWorld();
  const firstStore = createAsyncStore(0, (_old: number, next: number) => next);
  const secondStore = createAsyncStore(0, (_old: number, next: number) => next);
  const calls = { proxied: 0, setup: 0, cleanup: 0 };
  const Registered = defineComponent(`${sourceFile}#component:Registered`, (
    props: { store: AsyncStore<number, number> },
  ) => {
    useEffectAt("proxy-component-effect", () => {
      calls.setup++;
      return () => { calls.cleanup++; };
    });
    return jsx("output", {}, String(useStoreAt("proxy-component-store", props.store)));
  });
  const Proxied = new Proxy(Registered, {
    apply(target, thisArg, args) {
      calls.proxied++;
      return Reflect.apply(target, thisArg, args);
    },
    get(target, key, receiver) { return Reflect.get(target, key, receiver); },
  });
  const Plain = defineComponent("publication-callback-plain-peer", (
    props: { store: AsyncStore<number, number> },
  ) => jsx("output", {}, String(useStoreAt("proxy-component-peer-store", props.store))));
  const roots = ["proxy", "peer"].map((name) => {
    const host = new MemoryVDOMHost(), container = host.createContainer();
    const root = new ComponentStateRoot(host, container, {
      world, rootId: `publication-${name}`, scheduleCommit() {},
    });
    return { root, container };
  });
  const queue = new NativeRootWorkQueue();
  try {
    const [first, second] = roots;
    const firstTree = jsx(Proxied, { store: firstStore });
    const secondTree = jsx(Plain, { store: secondStore });
    first.root.mount(firstTree);
    second.root.mount(secondTree);
    assertEquals(roots.map(({ container }) => container.children.map(text).join("")), ["0", "0"]);
    const versions = roots.map(({ root }) => root.publicationVersion);
    const callsBefore = calls.proxied;
    firstStore.dispatch(1);
    secondStore.dispatch(1);
    const work = queue.enqueue({ id: "publication-proxy-component", renderPreparation: "repeatable", roots: [
      { root: first.root, tree: firstTree },
      { root: second.root, tree: secondTree },
    ] });
    assertEquals(work.status, "committed");
    assertEquals(roots.map(({ root }) => root.publicationVersion), versions.map((value) => value + 1));
    assertEquals(roots.map(({ container }) => container.children.map(text).join("")), ["1", "1"]);
    assert(calls.proxied > callsBefore, "proxied component was not called by generic rendering");
  } finally {
    queue.dispose();
    for (const { root, container } of roots) {
      root.dispose();
      assertEquals(root.diagnostics().ownerCount, 0);
      assertEquals(container.children.length, 0);
    }
    invalidateCompiledSemanticPlan(sourceFile, "proxy-component-v1");
  }
  assertEquals(calls.setup, calls.cleanup, "proxied component effect did not clean up");
  assertEquals(firstStore.diagnostics().roots, 0);
  assertEquals(secondStore.diagnostics().roots, 0);
});

Deno.test("a Proxy AsyncResource with bound public methods keeps generic grouped reveal", async () => {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((done) => { resolve = done; });
  const resource = new AsyncResource(promise);
  const proxied = new Proxy(resource, {
    get(target, key) {
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const world = new OwnerStateWorld();
  const store = createAsyncStore(0, (_old: number, next: number) => next);
  const effects = { fallbackSetup: 0, fallbackCleanup: 0, readySetup: 0, readyCleanup: 0 };
  const Left = defineComponent("publication-resource-left", () =>
    jsx("output", {}, String(useStoreAt("publication-resource-store", store))));
  const Fallback = defineComponent("publication-resource-fallback", () => {
    useEffectAt("publication-resource-fallback-effect", () => {
      effects.fallbackSetup++;
      return () => { effects.fallbackCleanup++; };
    });
    return jsx("span", { key: "resource-host" }, "waiting");
  });
  const Ready = defineComponent("publication-resource-ready", (
    props: { source: AsyncResource<string> },
  ) => {
    const value = useAt("publication-resource-read", props.source);
    useEffectAt("publication-resource-ready-effect", () => {
      effects.readySetup++;
      return () => { effects.readyCleanup++; };
    });
    return jsx("span", { key: "resource-host" }, value);
  });
  const roots = ["left", "right"].map((name) => {
    const host = new MemoryVDOMHost(), container = host.createContainer();
    const root = new ComponentStateRoot(host, container, {
      world, rootId: `publication-opaque-${name}`, scheduleCommit() {},
    });
    return { root, container };
  });
  const queue = new NativeRootWorkQueue();
  try {
    const [left, right] = roots;
    const leftTree = jsx(Left, {});
    const rightTree = jsx(Suspense, {
      key: "resource-boundary", __nativeBoundarySite: "publication-resource-boundary",
      fallback: jsx(Fallback, { key: "fallback-owner" }),
      children: jsx(Ready, { key: "ready-owner", source: proxied }),
    });
    left.root.mount(leftTree);
    right.root.mount(rightTree);
    assertEquals(roots.map(({ container }) => container.children.map(text).join("")), ["0", "waiting"]);
    assertEquals(effects.fallbackSetup, 1);
    const versions = roots.map(({ root }) => root.publicationVersion);
    store.dispatch(1);
    const work = queue.enqueue({ id: "publication-opaque-resource", renderPreparation: "repeatable", roots: [
      { root: left.root, tree: leftTree },
      { root: right.root, tree: rightTree },
    ] });
    assertEquals(work.status, "pending");
    resolve("ready");
    for (let index = 0; index < 5; index++) await Promise.resolve();
    assertEquals(work.status, "committed");
    assertEquals(roots.map(({ root }) => root.publicationVersion), versions.map((value) => value + 1));
    assertEquals(roots.map(({ container }) => container.children.map(text).join("")), ["1", "ready"]);
    assertEquals([effects.fallbackCleanup, effects.readySetup], [1, 1]);
  } finally {
    queue.dispose();
    for (const { root, container } of roots) {
      root.dispose();
      assertEquals(root.diagnostics().ownerCount, 0);
      assertEquals(container.children.length, 0);
    }
  }
  assertEquals(effects.readySetup, effects.readyCleanup);
  assertEquals(effects.fallbackSetup, effects.fallbackCleanup);
  assertEquals(store.diagnostics().roots, 0);
});
