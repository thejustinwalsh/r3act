import {
  AsyncStore,
  createAsyncStore,
  StoreRenderTransaction,
} from "./async_store_runtime.ts";

function equal(actual: unknown, expected: unknown, message: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

Deno.test("closed numeric Store reads stage only selected reader history", () => {
  const selected = createAsyncStore(3);
  const unrelated = createAsyncStore(11);
  const fork = new StoreRenderTransaction("fork");
  equal(fork.readClosedNumeric(selected, "fork-reader"), 3, "fork cut");
  fork.preparePublication();
  fork.publishAccepted();
  const prior = new StoreRenderTransaction("root");
  equal(prior.read(unrelated, "unrelated"), 11, "prior read");
  prior.preparePublication();
  prior.publishAccepted();

  const transaction = new StoreRenderTransaction("root");
  equal(transaction.readClosedNumeric(selected, "selected"), 3, "numeric cut");
  equal(transaction.readClosedNumeric(selected, "selected"), 3, "cached cut");
  equal(transaction.readers.size, 1, "unrelated reader entered the cut");
  equal(selected.diagnostics().readers, 1, "reader history escaped preparation");
  transaction.preparePublication();
  transaction.publishAccepted();
  equal(selected.diagnostics().readers, 2, "selected history was not accepted");
  equal(selected._readerValuesFor("fork", "fork-reader").size, 0, "fork history changed");
  equal(unrelated.diagnostics().readers, 1, "unrelated history was replaced");
});

Deno.test("closed numeric cut preserves newer host-time Store action", () => {
  const store = createAsyncStore(1);
  const transaction = new StoreRenderTransaction("root");
  equal(transaction.readClosedNumeric(store, "direct"), 1, "captured value");
  store.dispatch(2);
  equal(transaction.validate(), false, "newer action did not stale exact cut");
  equal(
    transaction.validatePublicationInputs(),
    true,
    "newer action invalidated prior accepted lineage",
  );
  transaction.preparePublicationAfterHost();
  transaction.publishAccepted();
  equal(store.getStateForRoot("root"), 2, "newer action was lost");
  equal(store.diagnostics().readers, 1, "accepted reader was omitted");
});

Deno.test("closed numeric cut declines hidden transition without reducer replay", () => {
  let reductions = 0;
  const store = createAsyncStore(0, (state: number, action: number) => {
    reductions++;
    return state + action;
  });
  store.beginRender("root");
  store.beginTransition("slow", ["root"]);
  store.dispatch(1, { kind: "transition", transitionId: "slow" });
  store.dispatch(2);
  const beforeRead = reductions;
  const transaction = new StoreRenderTransaction("root");
  equal(transaction.readClosedNumeric(store, "direct"), null, "hidden cut");
  equal(reductions, beforeRead, "closed cut replayed reducer");
  equal(transaction.readers.size, 0, "declined reader was staged");
  transaction.discard();
});

Deno.test("closed numeric cut declines noncanonical Stores and nonfinite values", () => {
  class DerivedStore extends AsyncStore<number> {}
  const transaction = new StoreRenderTransaction("root");
  equal(transaction.readClosedNumeric(new DerivedStore(1), "derived"), null, "subclass");
  const shadowed = createAsyncStore(2);
  Object.defineProperty(shadowed, "read", {
    value: () => 99,
    configurable: true,
  });
  equal(transaction.readClosedNumeric(shadowed, "shadowed"), null, "own read override");
  const nonfinite = createAsyncStore(Infinity);
  equal(transaction.readClosedNumeric(nonfinite, "infinite"), null, "nonfinite");
  const proxy = new Proxy(createAsyncStore(4), {});
  equal(transaction.readClosedNumeric(proxy, "proxy"), null, "proxy");
  equal(transaction.readers.size, 0, "declined stores staged readers");
  transaction.discard();
  equal(nonfinite.diagnostics().roots, 0, "nonfinite numeric capture registered a root");
});

Deno.test("closed numeric cut rejects Store prototype replacement before admission or publication", () => {
  const store = createAsyncStore(5);
  const publication = Object.getOwnPropertyDescriptor(
    AsyncStore.prototype,
    "_publishPreparedReaderValues",
  )!;
  const read = Object.getOwnPropertyDescriptor(AsyncStore.prototype, "read")!;
  try {
    Object.defineProperty(AsyncStore.prototype, "read", {
      ...read,
      value: () => 99,
    });
    const rejected = new StoreRenderTransaction("root");
    equal(rejected.readClosedNumeric(store, "reader"), null, "replaced read");
    rejected.discard();
  } finally {
    Object.defineProperty(AsyncStore.prototype, "read", read);
  }

  const prepared = new StoreRenderTransaction("root");
  equal(prepared.readClosedNumeric(store, "reader"), 5, "prepared cut");
  try {
    Object.defineProperty(AsyncStore.prototype, "_publishPreparedReaderValues", {
      ...publication,
      value: () => { throw new Error("replacement publication invoked"); },
    });
    equal(prepared.validate(), false, "prototype replacement remained valid");
    let rejected = false;
    try {
      prepared.preparePublication();
    } catch {
      rejected = true;
    }
    equal(rejected, true, "replacement reached publication staging");
    equal(store.diagnostics().readers, 0, "failed cut published reader history");
  } finally {
    Object.defineProperty(AsyncStore.prototype, "_publishPreparedReaderValues", publication);
    prepared.discard();
  }
});

Deno.test("closed projections retain whole Store observations across sites and fork histories", () => {
  type PositionState = Readonly<{ position: Readonly<{ x: number; y: number }>; camera: number }>;
  const state: PositionState = Object.freeze({ position: Object.freeze({ x: 2, y: 3 }), camera: 7 });
  const store = createAsyncStore(state);
  const fork = new StoreRenderTransaction("fork");
  equal(fork.readClosedProjections(store, "fork-site", [["position", "x"]])?.[0], 2, "fork projection");
  fork.preparePublication();
  fork.publishAccepted();
  const root = new StoreRenderTransaction("root");
  equal(root.readClosedProjections(store, "x-site", [["position", "x"], ["position", "y"]])?.join(","), "2,3", "joint projection");
  equal(root.readClosedProjections(store, "camera-site", [["camera"]])?.[0], 7, "second site");
  equal(root.getObservation("x-site")?.value, state, "projection replaced whole-state history");
  equal(root.getObservation("camera-site")?.value, state, "sites did not share pinned state");
  equal(root.readers.size, 2, "distinct reader sites were collapsed");
  root.preparePublication();
  root.publishAccepted();
  equal(store.diagnostics().readers, 3, "fork or root reader history was lost");
  const next = Object.freeze({ position: Object.freeze({ x: 9, y: 10 }), camera: 11 });
  store.dispatch(next);
  const updated = new StoreRenderTransaction("root");
  equal(updated.readClosedProjections(store, "x-site", [["position", "x"]])?.[0], 9, "new action");
  equal(updated.getObservation("x-site")?.value, next, "new state observation");
  updated.discard();
  equal(store._readerValuesFor("fork", "fork-site").size, 0, "fork reader history changed");
});

Deno.test("closed projections reject unsafe records without calling getters", () => {
  let getterCalls = 0;
  const accessor = Object.freeze(Object.defineProperty({}, "x", {
    configurable: true,
    get() { getterCalls++; return 1; },
  }));
  const unrelatedAccessor = Object.freeze(Object.defineProperties({ x: 1 }, {
    hidden: { configurable: true, get() { getterCalls++; return 2; } },
  }));
  const values: Array<[unknown, readonly (readonly string[])[]]> = [
    [Object.freeze({ position: accessor }), [["position", "x"]]],
    [Object.freeze({ position: unrelatedAccessor }), [["position", "x"]]],
    [{ position: Object.freeze({ x: 1 }) }, [["position", "x"]]],
    [Object.freeze({ position: { x: 1 } }), [["position", "x"]]],
    [Object.freeze({ position: Object.freeze([1]) }), [["position", "length"]]],
    [Object.freeze({ position: Object.freeze(Object.create({ x: 1 })) }), [["position", "x"]]],
    [Object.freeze({ position: Object.freeze({ x: Infinity }) }), [["position", "x"]]],
  ];
  for (const [value, paths] of values) {
    const store = createAsyncStore(value);
    const cut = new StoreRenderTransaction("root");
    equal(cut.readClosedProjections(store, "reader", paths), null, "unsafe shape");
    equal(cut.readers.size, 0, "unsafe reader staged");
    cut.discard();
    equal(store.diagnostics().roots, 0, "declined shape registered a root");
  }
  equal(getterCalls, 0, "authored getter ran");
  const store = createAsyncStore(Object.freeze({ x: 1 }));
  const accessorPath = ["x"];
  Object.defineProperty(accessorPath, "0", { get() { getterCalls++; return "x"; } });
  const accessorCut = new StoreRenderTransaction("root");
  equal(accessorCut.readClosedProjections(store, "reader", [accessorPath]), null, "path getter");
  accessorCut.discard();
  equal(store.diagnostics().roots, 0, "declined path registered a root");
  equal(getterCalls, 0, "path getter ran");
  for (const paths of [[], [["x", "y", "z", "a", "b", "c", "d", "e", "f"]],
    Array.from({ length: 33 }, () => ["x"]), [["__proto__"]]]) {
    const cut = new StoreRenderTransaction("root");
    equal(cut.readClosedProjections(store, "reader", paths), null, "path bound");
    cut.discard();
    equal(store.diagnostics().roots, 0, "declined path bound registered a root");
  }
});

Deno.test("hostile descriptor traps cannot publish a stale closed projection", () => {
  let store: AsyncStore<object>;
  let mutated = false;
  const target = Object.freeze({ x: 1 });
  const state = new Proxy(target, {
    getOwnPropertyDescriptor(object, name) {
      if (!mutated) {
        mutated = true;
        store.dispatch(Object.freeze({ x: 2 }));
      }
      return Reflect.getOwnPropertyDescriptor(object, name);
    },
  });
  store = createAsyncStore<object>(state);
  const cut = new StoreRenderTransaction("root");
  equal(cut.readClosedProjections(store, "reader", [["x"]])?.[0], 1, "captured old value");
  equal(cut.validate(), false, "proxy mutation passed final live validation");
  cut.discard();
});
