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
  equal(transaction.readClosedNumeric(createAsyncStore(Infinity), "infinite"), null, "nonfinite");
  const proxy = new Proxy(createAsyncStore(4), {});
  equal(transaction.readClosedNumeric(proxy, "proxy"), null, "proxy");
  equal(transaction.readers.size, 0, "declined stores staged readers");
  transaction.discard();
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
