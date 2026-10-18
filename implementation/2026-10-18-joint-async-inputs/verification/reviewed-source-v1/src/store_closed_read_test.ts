import {
  AsyncStore,
  createAsyncStore,
  storeRecord,
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
  const state: PositionState = storeRecord({ position: storeRecord({ x: 2, y: 3 }), camera: 7 });
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
  const next = storeRecord({ position: storeRecord({ x: 9, y: 10 }), camera: 11 });
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
    [storeRecord({ position: accessor }), [["position", "x"]]],
    [storeRecord({ position: unrelatedAccessor }), [["position", "x"]]],
    [{ position: Object.freeze({ x: 1 }) }, [["position", "x"]]],
    [storeRecord({ position: { x: 1 } }), [["position", "x"]]],
    [storeRecord({ position: Object.freeze([1]) }), [["position", "length"]]],
    [storeRecord({ position: Object.freeze(Object.create({ x: 1 })) }), [["position", "x"]]],
    [storeRecord({ position: storeRecord({ x: Infinity }) }), [["position", "x"]]],
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
  const store = createAsyncStore(storeRecord({ x: 1 }));
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

Deno.test("path descriptor traps cannot publish a stale closed projection", () => {
  let store: AsyncStore<Readonly<{ x: number }>>;
  let mutated = false;
  const path = new Proxy(["x"], {
    getOwnPropertyDescriptor(object, name) {
      if (!mutated) {
        mutated = true;
        store.dispatch(storeRecord({ x: 2 }));
      }
      return Reflect.getOwnPropertyDescriptor(object, name);
    },
  });
  store = createAsyncStore<Readonly<{ x: number }>>(storeRecord({ x: 1 }));
  const cut = new StoreRenderTransaction("root");
  equal(cut.readClosedProjections(store, "reader", [path])?.[0], 1, "captured old value");
  equal(cut.validate(), false, "proxy mutation passed final live validation");
  cut.discard();
});

Deno.test("storeRecord copies once and requires explicit ownership at each selected level", () => {
  const authored = { x: 3, nested: { y: 4 } };
  const owned = storeRecord(authored);
  equal(owned === authored, false, "constructor returned authored object");
  equal(Object.isFrozen(owned), true, "owned record is mutable");
  authored.x = 9;
  equal(owned.x, 3, "authored alias changed owned value");
  const outer = createAsyncStore(owned);
  const direct = new StoreRenderTransaction("root");
  equal(direct.readClosedProjections(outer, "x", [["x"]])?.[0], 3, "owned direct field");
  equal(direct.readClosedProjections(outer, "nested", [["nested", "y"]]), null,
    "unowned nested record entered closed capture");
  direct.discard();
  const nested = storeRecord({ y: 4 });
  const complete = createAsyncStore(storeRecord({ nested }));
  const cut = new StoreRenderTransaction("root");
  equal(cut.readClosedProjections(complete, "nested", [["nested", "y"]])?.[0], 4,
    "owned nested field");
  cut.discard();
});

Deno.test("storeRecord rejects unsafe descriptors and frozen Proxy wrappers decline without get traps", () => {
  let getterCalls = 0;
  const accessor = Object.defineProperty({}, "x", {
    get() { getterCalls++; return 1; },
  });
  for (const input of [accessor, [], Object.create({ x: 1 }),
    { [Symbol("hidden")]: 1 }, Object.defineProperty({}, "constructor", { value: 1 })]) {
    let rejected = false;
    try { storeRecord(input); } catch (error) { rejected = error instanceof TypeError; }
    equal(rejected, true, "unsafe constructor input accepted");
  }
  equal(getterCalls, 0, "constructor called getter");
  let proxyGets = 0;
  const owned = storeRecord({ x: 1 });
  const proxy = new Proxy(owned, {
    get(target, key, receiver) {
      proxyGets++;
      return Reflect.get(target, key, receiver);
    },
  });
  const store = createAsyncStore(proxy);
  const cut = new StoreRenderTransaction("root");
  equal(cut.readClosedProjections(store, "reader", [["x"]]), null,
    "Proxy wrapper gained owned provenance");
  cut.discard();
  equal(proxyGets, 0, "closed capture invoked Proxy get trap");
  equal(store.diagnostics().roots, 0, "declined Proxy registered a root");
});

Deno.test("closed reader retirement publishes with replacement history and leaves forks intact", () => {
  const store = createAsyncStore(1);
  const fork = new StoreRenderTransaction("fork");
  equal(fork.read(store.select((value) => value), "old"), 1, "fork initial read");
  fork.preparePublication();
  fork.publishAccepted();
  const initial = new StoreRenderTransaction("root");
  equal(initial.readClosedNumeric(store, "old"), 1, "root initial read");
  initial.preparePublication();
  initial.publishAccepted();

  const next = new StoreRenderTransaction("root");
  equal(next.readClosedNumeric(store, "new"), 1, "replacement read");
  equal(next.retireClosedReaders(new Map([["old", new Set([store])]])), true,
    "captured closed Store could not retire old reader");
  equal(store.diagnostics().readers, 2, "retirement escaped preparation");
  next.preparePublication();
  equal(store.diagnostics().readers, 2, "preparation changed accepted readers");
  next.publishAccepted();
  equal(store.diagnostics().readers, 2, "replacement and retirement were not atomic");
  equal(store._readerValuesFor("root", "old").size, 0, "old root history remains");
  equal(store._readerValuesFor("fork", "old").size, 1, "fork history changed");
});

Deno.test("closed reader retirement declines uncaptured Stores without changing history", () => {
  const store = createAsyncStore(1);
  const initial = new StoreRenderTransaction("root");
  initial.readClosedNumeric(store, "old");
  initial.preparePublication();
  initial.publishAccepted();
  const declined = new StoreRenderTransaction("root");
  equal(declined.retireClosedReaders(new Map([["old", new Set([store])]])), false,
    "uncaptured Store retired a reader");
  declined.discard();
  equal(store.diagnostics().readers, 1, "declined retirement changed history");
});

Deno.test("closed reader retirement rolls back with a candidate savepoint", () => {
  const store = createAsyncStore(1);
  const initial = new StoreRenderTransaction("root");
  initial.readClosedNumeric(store, "old");
  initial.preparePublication();
  initial.publishAccepted();
  const next = new StoreRenderTransaction("root");
  next.readClosedNumeric(store, "new");
  const checkpoint = next.checkpoint();
  equal(next.retireClosedReaders(new Map([["old", new Set([store])]])), true,
    "retirement failed");
  next.rollbackTo(checkpoint);
  next.releaseCheckpoint(checkpoint);
  next.preparePublication();
  next.publishAccepted();
  equal(store.diagnostics().readers, 2, "rollback retained retirement");
});

Deno.test("closed reader retirement preserves a replacement observation at the same site", () => {
  const store = createAsyncStore(1);
  const initial = new StoreRenderTransaction("root");
  initial.readClosedNumeric(store, "site");
  initial.preparePublication();
  initial.publishAccepted();
  const next = new StoreRenderTransaction("root");
  next.readClosedNumeric(store, "site");
  equal(next.retireClosedReaders(new Map([["site", new Set([store])]])), true,
    "same-site replacement declined");
  next.preparePublication();
  next.publishAccepted();
  equal(store.diagnostics().readers, 1, "same-site replacement was deleted");
});

Deno.test("closed reader retirement fails preparation after a callback changes the exact cut", () => {
  const closed = createAsyncStore(1);
  class CallbackStore extends AsyncStore<number> {
    override _prepareReaderValues(
      rootId: string,
      pending: ReadonlyMap<string, ReadonlyMap<object, unknown> | null>,
    ) {
      closed.dispatch(2);
      return super._prepareReaderValues(rootId, pending);
    }
  }
  const callbackStore = new CallbackStore(2);
  const initial = new StoreRenderTransaction("root");
  initial.readClosedNumeric(closed, "old");
  initial.preparePublication();
  initial.publishAccepted();
  const next = new StoreRenderTransaction("root");
  next.readClosedNumeric(closed, "new");
  next.read(callbackStore, "callback");
  equal(next.retireClosedReaders(new Map([["old", new Set([closed])]])), true,
    "captured Store could not stage retirement");
  let rejected = false;
  try { next.preparePublication(); } catch { rejected = true; }
  equal(rejected, true, "callback changed a closed Store but preparation succeeded");
  equal(closed.diagnostics().readers, 1, "failed preparation retired old history");
  equal(closed.getStateForRoot("root"), 2, "newer action was lost");
  next.discard();
});

Deno.test("closed reader retirement declines a stale captured lineage", () => {
  const store = createAsyncStore(1);
  const initial = new StoreRenderTransaction("root");
  initial.readClosedNumeric(store, "old");
  initial.preparePublication();
  initial.publishAccepted();
  const next = new StoreRenderTransaction("root");
  next.readClosedNumeric(store, "new");
  store.detachRoot("root");
  equal(next.retireClosedReaders(new Map([["old", new Set([store])]])), false,
    "stale Store lineage staged retirement");
  next.discard();
});

Deno.test("closed reader retirement declines a replaced Store prototype", () => {
  const store = createAsyncStore(1);
  const transaction = new StoreRenderTransaction("root");
  transaction.readClosedNumeric(store, "new");
  const descriptor = Object.getOwnPropertyDescriptor(AsyncStore.prototype, "read")!;
  try {
    Object.defineProperty(AsyncStore.prototype, "read", {
      ...descriptor,
      value: () => 9,
    });
    equal(transaction.retireClosedReaders(new Map([["old", new Set([store])]])), false,
      "replaced prototype staged retirement");
  } finally {
    Object.defineProperty(AsyncStore.prototype, "read", descriptor);
    transaction.discard();
  }
});

Deno.test("published closed transaction detects a newer action from captured snapshots", () => {
  const store = createAsyncStore(1);
  const transaction = new StoreRenderTransaction("root");
  transaction.readClosedNumeric(store, "reader");
  transaction.preparePublication();
  transaction.publishAccepted();
  equal(transaction.closedInputsChanged(), false, "unchanged accepted cut was marked stale");
  store.dispatch(2);
  equal(transaction.closedInputsChanged(), true, "newer action escaped captured cut check");
});
