import { assertEquals } from "jsr:@std/assert";
import { createAsyncStore } from "./async_store_runtime.ts";
import {
  ComponentStateRoot,
  defineComponent,
  Suspense,
  useAt,
  useEffectAt,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => resolve = yes);
  return { promise, resolve };
};
function harness(id: string) {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: id,
    scheduleCommit: () => {},
    renderPreparation: "repeatable",
  });
  return {
    host,
    container,
    root,
    text: () => container.children.map(text).join(""),
  };
}

Deno.test("late readers join pending scopes according to their explicit projection", async () => {
  const store = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  const leftResource = deferred<string>();
  const rightResource = deferred<string>();
  const forkResource = deferred<string>();
  const effectLog: string[] = [];
  const Reader = defineComponent(
    "late-reader-matrix-reader",
    (props: { name: string; resource?: PromiseLike<string> }) => {
      const value = useStoreAt("value", store);
      useEffectAt("published", () => {
        effectLog.push(`${props.name}:${value}`);
      });
      const resource = props.resource
        ? `:${useAt("resource", props.resource)}`
        : "";
      return jsx("b", {}, `${props.name}:${value}${resource}`);
    },
  );
  const tree = (name: string, resource: PromiseLike<string>) =>
    jsx(Suspense, {
      __nativeBoundarySite: `late-reader-boundary:${name}`,
      fallback: jsx("i", {}, `${name}:waiting`),
      children: jsx(Reader, { name, resource }),
    });
  const left = harness("late-reader-left");
  const right = harness("late-reader-right");
  const fork = harness("late-reader-fork");
  const outside = harness("late-reader-outside");
  for (const app of [left, right, fork, outside]) {
    app.root.mount(jsx("i", {}, "startup"));
  }

  const scopes = ["late-left", "late-right", "late-fork"];
  const roots = [left, right, fork];
  roots.forEach((app, i) => {
    store.beginTransition(scopes[i], [app.root.rootId]);
    store.dispatch((i + 1) * 10, {
      kind: "transition",
      transitionId: scopes[i],
    });
  });
  const queue = new NativeRootWorkQueue();
  const work = roots.map((app, i) =>
    queue.enqueue({
      id: `late-work-${i}`,
      roots: [{
        root: app.root,
        tree: tree(
          ["left", "right", "fork"][i],
          [leftResource, rightResource, forkResource][i].promise,
        ),
      }],
      transitions: [scopes[i]],
      finishTransitions: true,
    })
  );
  assertEquals(work.map((handle) => handle.status), [
    "pending",
    "pending",
    "pending",
  ]);
  assertEquals([left.text(), right.text(), fork.text()], [
    "startup",
    "startup",
    "startup",
  ]);

  // A root that was not in the original scope can explicitly join its
  // projection; the same store read without that scope sees the default cut.
  const joinedTree = jsx(Reader, { name: "joined" });
  const outsideTree = jsx(Reader, { name: "outside" });
  const joined = queue.enqueue({
    id: "late-explicit-join",
    roots: [{ root: outside.root, tree: joinedTree }],
    transitions: [scopes[0]],
  });
  assertEquals([joined.status, outside.text()], ["committed", "joined:10"]);
  const outsideProjection = harness("late-reader-default");
  outsideProjection.root.mount(outsideTree);
  assertEquals(outsideProjection.text(), "outside:0");

  // Complete independent roots in a different order from enqueue order.
  forkResource.resolve("fork-ready");
  await Promise.resolve();
  assertEquals([work[2].status, work[1].status, work[0].status], [
    "committed",
    "pending",
    "pending",
  ]);
  rightResource.resolve("right-ready");
  await Promise.resolve();
  assertEquals([work[1].status, work[0].status], ["committed", "pending"]);
  leftResource.resolve("left-ready");
  await Promise.resolve();
  assertEquals(work.map((handle) => handle.status), [
    "committed",
    "committed",
    "committed",
  ]);
  assertEquals([left.text(), right.text(), fork.text()], [
    "left:60:left-ready",
    "right:50:right-ready",
    "fork:30:fork-ready",
  ]);
  assertEquals([
    store.getStateForRoot(left.root.rootId),
    store.getStateForRoot(right.root.rootId),
    store.getStateForRoot(fork.root.rootId),
  ], [60, 60, 60]);
  assertEquals(store.hasTransition(scopes[0]), false);
  assertEquals(store.hasTransition(scopes[1]), false);
  assertEquals(store.hasTransition(scopes[2]), false);

  queue.dispose();
  for (const app of [left, right, fork, outside, outsideProjection]) {
    app.root.dispose();
  }
  assertEquals([
    store.diagnostics().roots,
    store.diagnostics().readers,
    store.diagnostics().listeners,
    store.diagnostics().transitions,
  ], [0, 0, 0, 0]);
  assertEquals(effectLog.length > 0, true);
});

Deno.test("lagging owner-state and a brand-new root attach while resource work waits", async () => {
  const store = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  const pending = deferred<string>();
  let setLocal!: (value: number) => boolean;
  let setShowReader!: (value: boolean) => boolean;
  const Reader = defineComponent(
    "late-owner-reader",
    (props: { name: string }) => {
      const value = useStoreAt("value", store);
      return jsx("b", {}, `${props.name}:${value}`);
    },
  );
  const View = defineComponent(
    "late-owner-view",
    (props: { name: string; resource?: PromiseLike<string> }) => {
      const [local, set] = useStateAt("local", 0);
      const [showReader, setShow] = useStateAt("show-reader", false);
      setLocal = set;
      setShowReader = setShow;
      const value = useStoreAt("view-value", store);
      const resource = props.resource
        ? `:${useAt("resource", props.resource)}`
        : "";
      return jsx(
        "div",
        {},
        `${props.name}:${value}:${local}${resource}`,
        showReader ? jsx(Reader, { name: "new-child" }) : null,
      );
    },
  );
  const tree = (resource?: PromiseLike<string>) =>
    jsx(Suspense, {
      __nativeBoundarySite: "late-owner-boundary",
      fallback: jsx("i", {}, "waiting"),
      children: jsx(View, { name: "lagging", resource }),
    });
  const lagging = harness("late-owner-lagging");
  const sibling = harness("late-owner-sibling");
  const fresh = harness("late-owner-fresh");
  lagging.root.mount(tree());
  const updateLocal = setLocal;
  const updateShowReader = setShowReader;
  sibling.root.mount(jsx(Reader, { name: "sibling" }));
  fresh.root.mount(jsx("i", {}, "fresh-startup"));
  const scope = "late-owner-transition";
  store.beginTransition(scope, [lagging.root.rootId, sibling.root.rootId]);
  store.dispatch(5, { kind: "transition", transitionId: scope });
  const queue = new NativeRootWorkQueue();
  const replacement = queue.enqueue({
    id: "late-owner-replacement",
    roots: [{ root: lagging.root, tree: tree(pending.promise) }],
    transitions: [scope],
    finishTransitions: true,
  });
  assertEquals([replacement.status, lagging.text(), sibling.text()], [
    "pending",
    "lagging:0:0",
    "sibling:0",
  ]);

  // Commit owner state independently while the replacement candidate remains
  // suspended. This introduces a committed reader into a lagging root.
  updateShowReader(true);
  lagging.root.flush();
  assertEquals(lagging.text(), "lagging:0:0new-child:0");
  assertEquals(store.getStateForRoot(lagging.root.rootId), 0);

  // The brand-new root gets the transition only when its candidate names it.
  const explicitJoin = queue.enqueue({
    id: "late-owner-explicit-join",
    roots: [{ root: fresh.root, tree: jsx(Reader, { name: "fresh-joined" }) }],
    transitions: [scope],
  });
  assertEquals([explicitJoin.status, fresh.text()], [
    "committed",
    "fresh-joined:5",
  ]);
  const defaultRoot = harness("late-owner-default");
  defaultRoot.root.mount(jsx(Reader, { name: "fresh-default" }));
  assertEquals(defaultRoot.text(), "fresh-default:0");

  // A local urgent owner update commits against the visible store projection
  // and must survive the later resource candidate publication.
  updateLocal(7);
  lagging.root.flush();
  assertEquals(lagging.text(), "lagging:0:7new-child:0");
  pending.resolve("replacement-ready");
  await Promise.resolve();
  assertEquals([replacement.status, lagging.text()], [
    "committed",
    "lagging:5:7:replacement-readynew-child:5",
  ]);
  const siblingCommit = queue.enqueue({
    id: "late-owner-sibling-completion",
    roots: [{ root: sibling.root, tree: jsx(Reader, { name: "sibling" }) }],
    transitions: [scope],
    finishTransitions: true,
  });
  assertEquals(siblingCommit.status, "committed");

  queue.dispose();
  for (const app of [lagging, sibling, fresh, defaultRoot]) app.root.dispose();
  assertEquals([
    store.diagnostics().roots,
    store.diagnostics().readers,
    store.diagnostics().listeners,
    store.diagnostics().transitions,
  ], [0, 0, 0, 0]);
});

Deno.test("selector source replacement during pending resource work commits fresh history and retires old readers", async () => {
  const first = createAsyncStore(
    1,
    (state: number, action: number) => state + action,
  );
  const second = createAsyncStore(
    20,
    (state: number, action: number) => state + action,
  );
  const firstHistory: Array<number | undefined> = [];
  const secondHistory: Array<number | undefined> = [];
  const firstSelection = first.select((state, previous: number | undefined) => {
    firstHistory.push(previous);
    return state * 10;
  });
  const secondSelection = second.select(
    (state, previous: number | undefined) => {
      secondHistory.push(previous);
      return state * 10;
    },
  );
  const oldResource = deferred<string>();
  let selected = firstSelection;
  let includeResource = true;
  let effects = 0;
  const View = defineComponent("late-selector-switch", () => {
    const value = useStoreAt("selection", selected);
    useEffectAt("effect", () => {
      effects++;
    });
    const resource = includeResource
      ? `:${useAt("resource", oldResource.promise)}`
      : "";
    return jsx("b", {}, `${value}${resource}`);
  });
  const tree = jsx(Suspense, {
    __nativeBoundarySite: "late-selector-switch-boundary",
    fallback: jsx("i", {}, "waiting"),
    children: jsx(View, {}),
  });
  const app = harness("late-selector-switch-root");
  app.root.mount(jsx("b", {}, "starting"));
  const queue = new NativeRootWorkQueue();
  const work = queue.enqueue({
    id: "late-selector-switch-work",
    roots: [{ root: app.root, tree }],
  });
  assertEquals([work.status, app.text()], ["pending", "starting"]);

  // Replace the source, commit an urgent update from the new store, and let
  // the root's normal owner retirement remove the first selector reader.
  selected = secondSelection;
  includeResource = false;
  app.root.update(jsx(View, {}));
  assertEquals(secondHistory[0], undefined);
  second.dispatch(1, { kind: "urgent" });
  app.root.flush();
  assertEquals(app.text(), "210");
  assertEquals(secondHistory.at(-1), 200);
  assertEquals(first.diagnostics().readers, 0);
  work.cancel("selector source replaced by a committed fresh cut");
  assertEquals(work.status, "cancelled");
  assertEquals(first.diagnostics().listeners, 0);

  const effectsAtFreshCut = effects;
  oldResource.resolve("late-obsolete");
  await Promise.resolve();
  assertEquals([work.status, app.text(), effects], [
    "cancelled",
    "210",
    effectsAtFreshCut,
  ]);
  assertEquals(first.diagnostics().readers, 0);
  assertEquals(first.diagnostics().listeners, 0);
  assertEquals(secondHistory.at(-1), 200);

  queue.dispose();
  app.root.dispose();
  assertEquals([
    first.diagnostics().roots,
    first.diagnostics().readers,
    first.diagnostics().listeners,
  ], [0, 0, 0]);
  assertEquals([
    second.diagnostics().roots,
    second.diagnostics().readers,
    second.diagnostics().listeners,
  ], [0, 0, 0]);
});
