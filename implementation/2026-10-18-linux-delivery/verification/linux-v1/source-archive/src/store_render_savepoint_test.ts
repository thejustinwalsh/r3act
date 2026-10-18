import {
  createAsyncStore,
  createStoreSelector,
  StoreRenderTransaction,
  storeDependencies,
  type AnyAsyncStore,
  type StoreRenderCheckpoint,
  type StoreSource,
} from "./async_store_runtime.ts";

const equal = (actual: unknown, expected: unknown, message = "") => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message} expected ${expected}, got ${actual}`);
  }
};
const assert = (value: unknown, message = "Assertion failed") => {
  if (!value) throw new Error(message);
};
const throws = (run: () => unknown, text: string) => {
  try {
    run();
  } catch (error) {
    assert(String(error).includes(text), String(error));
    return;
  }
  throw new Error("Expected rejection");
};

Deno.test("savepoint rollback discards reader footprints, observations, and history staging", () => {
  const a = createAsyncStore(1), b = createAsyncStore(2);
  const selected = createStoreSelector([a, b], ([left, right]) =>
    Number(left) + Number(right)
  );
  const transaction = new StoreRenderTransaction("r");
  const checkpoint = transaction.checkpoint();
  equal(transaction.read(selected, "discarded"), 3);
  equal(transaction.readers.size, 1);
  equal(transaction.observations.size, 1);
  transaction.rollbackTo(checkpoint);
  equal(transaction.readers.size, 0);
  equal(transaction.observations.size, 0);
  assert(transaction.stores.has(a) && transaction.stores.has(b));
  transaction.commitAfterValidatedRender();
  equal(a.diagnostics().readers, 0);
  equal(b.diagnostics().readers, 0);
  equal(a._readerValuesFor("r", "discarded").size, 0);
});

Deno.test("reread of same reader after rollback can use a different source", () => {
  const store = createAsyncStore(3);
  const first = store.select((value) => value + 1);
  const second = store.select((value) => value + 2);
  const transaction = new StoreRenderTransaction("r");
  const checkpoint = transaction.checkpoint();
  equal(transaction.read(first, "site"), 4);
  transaction.rollbackTo(checkpoint);
  equal(transaction.read(second, "site"), 5);
  assert(transaction.validate());
  transaction.commitAfterValidatedRender();
  const history = store._readerValuesFor("r", "site");
  assert(history.has(second));
  assert(!history.has(first));
});

Deno.test("nested checkpoints preserve outer branch and invalidate inner tokens", () => {
  const store = createAsyncStore(10);
  const plusOne = store.select((value) => value + 1);
  const plusTwo = store.select((value) => value + 2);
  const transaction = new StoreRenderTransaction("r");
  const outer = transaction.checkpoint();
  equal(transaction.read(plusOne, "outer"), 11);
  const inner = transaction.checkpoint();
  equal(transaction.read(plusTwo, "inner"), 12);
  transaction.rollbackTo(inner);
  equal(transaction.readers.size, 1);
  equal(transaction.observations.size, 1);
  transaction.rollbackTo(outer);
  equal(transaction.readers.size, 0);
  equal(transaction.observations.size, 0);
  throws(() => transaction.rollbackTo(inner), "Invalid");
});

Deno.test("released sibling savepoints do not invalidate or retain their ancestor", () => {
  const store = createAsyncStore(1);
  const transaction = new StoreRenderTransaction("r");
  const ancestor = transaction.checkpoint();
  for (let i = 0; i < 1_000; i++) {
    const child = transaction.checkpoint();
    equal(transaction.read(store.select((value) => value + i), `leaf-${i}`), i + 1);
    transaction.rollbackTo(child);
    transaction.releaseCheckpoint(child);
  }
  equal(transaction.observations.size, 0);
  transaction.rollbackTo(ancestor);
  transaction.releaseCheckpoint(ancestor);
  throws(() => transaction.rollbackTo(ancestor), "Invalid");
  transaction.discard();
});

Deno.test("since-checkpoint footprint queries follow nested rollback and release", () => {
  const a = createAsyncStore(2), b = createAsyncStore(5);
  const sum = createStoreSelector([a, b], ([x, y]) => Number(x) + Number(y));
  const transaction = new StoreRenderTransaction("r");
  equal(transaction.read(a, "baseline"), 2);
  const branch = transaction.checkpoint();
  equal(transaction.read(sum, "branch"), 7);
  equal(transaction.observationsSince(branch).size, 1);
  assert(transaction.observationsSince(branch).has("branch"));
  equal(transaction.readersSince(branch).size, 1);
  assert(transaction.readersSince(branch).get("branch")?.has(a));
  equal(transaction.getObservation("branch")?.value, 7);

  const nested = transaction.checkpoint();
  equal(transaction.read(b, "nested"), 5);
  equal(transaction.observationsSince(nested).size, 1);
  transaction.rollbackTo(nested);
  equal(transaction.observationsSince(nested).size, 0);
  transaction.releaseCheckpoint(nested);
  throws(() => transaction.observationsSince(nested), "Invalid");
  equal(transaction.observationsSince(branch).size, 1);
  transaction.releaseCheckpoint(branch);
  transaction.discard();
});

Deno.test("rollback retains root projections and freshness discovery state", () => {
  const a = createAsyncStore(1), b = createAsyncStore(2);
  const transaction = new StoreRenderTransaction("r");
  const checkpoint = transaction.checkpoint();
  equal(transaction.read(a, "a"), 1);
  transaction.rollbackTo(checkpoint);
  a.dispatch(4);
  equal(transaction.read(a, "a"), 1);
  assert(!transaction.validate(), "Pinned projection should still invalidate");
  transaction.discard();

  const discovered = new StoreRenderTransaction("late");
  const boundary = discovered.checkpoint();
  b.dispatch(5);
  equal(discovered.read(b, "b"), 5);
  discovered.rollbackTo(boundary);
  assert(!discovered.validate(), "Late discovery freshness must survive rollback");
  discovered.discard();
});

Deno.test("preserveReaders pins stores and keeps committed selector history untouched", () => {
  const a = createAsyncStore(2), b = createAsyncStore(4);
  const oldSelection = createStoreSelector([a, b], ([x, y]) =>
    Number(x) * Number(y)
  );
  const seed = new StoreRenderTransaction("r");
  equal(seed.read(oldSelection, "kept"), 8);
  seed.commitAfterValidatedRender();
  const oldHistoryA = a._readerValuesFor("r", "kept");
  const oldHistoryB = b._readerValuesFor("r", "kept");
  const transaction = new StoreRenderTransaction("r");
  transaction.preserveReaders(new Map([
    ["kept", new Set<AnyAsyncStore>([a, b])],
  ]));
  assert(transaction.validate());
  assert(transaction.readers.has("kept"));
  equal(transaction.observations.size, 0);
  transaction.commitAfterValidatedRender();
  assert(a._readerValuesFor("r", "kept") === oldHistoryA);
  assert(b._readerValuesFor("r", "kept") === oldHistoryB);
  equal(a._readerValuesFor("r", "kept").get(oldSelection), 8);
  equal(b._readerValuesFor("r", "kept").get(oldSelection), 8);
});

Deno.test("checkpoint tokens reject foreign, invalidated, and closed transaction use", () => {
  const a = new StoreRenderTransaction("r");
  const b = new StoreRenderTransaction("r");
  const foreign = a.checkpoint();
  throws(() => b.rollbackTo(foreign), "Invalid");
  const first = a.checkpoint();
  const second = a.checkpoint();
  a.rollbackTo(first);
  throws(() => a.rollbackTo(second), "Invalid");
  a.discard();
  throws(() => a.checkpoint(), "closed");
  throws(() => a.rollbackTo(first), "closed");
  b.discard();
});

Deno.test("failed source read does not leave a partial reader session", () => {
  const store = createAsyncStore(6);
  const selected = store.select((value) => value * 2);
  const failing: StoreSource<number> = {
    [storeDependencies]: [store],
    read(session) {
      selected.read(session);
      throw new Error("selector failed");
    },
  };
  const transaction = new StoreRenderTransaction("r");
  const checkpoint = transaction.checkpoint();
  throws(() => transaction.read(failing, "site"), "selector failed");
  equal(transaction.readers.size, 0);
  equal(transaction.observations.size, 0);
  transaction.rollbackTo(checkpoint);
  equal(transaction.read(selected, "site"), 12);
  equal(transaction.observations.size, 1);
  transaction.discard();
});
