import {
  createAsyncStore,
  createStoreSelector,
  StoreRenderTransaction,
} from "./async_store_runtime.ts";

const equal = (actual: unknown, expected: unknown, message = "") => {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `${message ? `${message}: ` : ""}expected ${expected}, got ${actual}`,
    );
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

Deno.test("dropReaders removes only selected readers across shared stores", () => {
  const a = createAsyncStore(2), b = createAsyncStore(4);
  const sum = createStoreSelector(
    [a, b],
    ([left, right]) => Number(left) + Number(right),
  );
  const transaction = new StoreRenderTransaction("root");
  equal(transaction.read(sum, "replace-me"), 6);
  equal(transaction.read(a, "keep-a"), 2);
  equal(transaction.read(b, "keep-b"), 4);

  transaction.dropReaders(["replace-me"]);
  assert(!transaction.readers.has("replace-me"));
  assert(!transaction.observations.has("replace-me"));
  assert(transaction.readers.get("keep-a")?.has(a));
  assert(transaction.readers.get("keep-b")?.has(b));
  equal(transaction.observations.size, 2);
  // A dropped reader's discovered stores remain pinned for validation and
  // root lifecycle cleanup; they are not detached as part of pruning.
  assert(transaction.stores.has(a) && transaction.stores.has(b));
  equal(a.diagnostics().roots, 1);
  equal(b.diagnostics().roots, 1);

  transaction.commitAfterValidatedRender();
  equal(a.diagnostics().readers, 1);
  equal(b.diagnostics().readers, 1);
  equal(a._readerValuesFor("root", "replace-me").size, 0);
  equal(b._readerValuesFor("root", "replace-me").size, 0);
  transaction.discard();
  a.detachRoot("root");
  b.detachRoot("root");
});

Deno.test("dropReaders allows the same reader ID to switch source", () => {
  const oldStore = createAsyncStore("old"), newStore = createAsyncStore("new");
  const oldSource = createStoreSelector([oldStore], ([value]) => value);
  const newSource = createStoreSelector([newStore], ([value]) => value);
  const transaction = new StoreRenderTransaction("root");
  equal(transaction.read(oldSource, "site"), "old");
  transaction.dropReaders(["site"]);
  equal(transaction.read(newSource, "site"), "new");
  assert(transaction.stores.has(oldStore));
  assert(transaction.stores.has(newStore));
  assert(transaction.validate());
  transaction.commitAfterValidatedRender();
  equal(oldStore._readerValuesFor("root", "site").size, 0);
  equal(newStore._readerValuesFor("root", "site").size, 1);
  assert(
    transaction.readers.size === 1 &&
      transaction.readers.get("site")?.has(newStore),
  );
  transaction.discard();
  oldStore.detachRoot("root");
  newStore.detachRoot("root");
});

Deno.test("dropReaders is journaled with observations and reader footprints", () => {
  const a = createAsyncStore(3), b = createAsyncStore(7);
  const sourceA = createStoreSelector([a], ([value]) => Number(value) * 2);
  const transaction = new StoreRenderTransaction("root");
  equal(transaction.read(sourceA, "site"), 6);
  const checkpoint = transaction.checkpoint();

  transaction.dropReaders(["site"]);
  assert(!transaction.observations.has("site"));
  assert(!transaction.readers.has("site"));
  equal(transaction.observationsSince(checkpoint).size, 0);
  equal(transaction.readersSince(checkpoint).size, 0);

  equal(transaction.read(b, "site"), 7);
  equal(transaction.observationsSince(checkpoint).get("site")?.value, 7);
  assert(transaction.readersSince(checkpoint).get("site")?.has(b));
  transaction.rollbackTo(checkpoint);
  equal(transaction.getObservation("site")?.source, sourceA);
  equal(transaction.getObservation("site")?.value, 6);
  assert(transaction.readers.get("site")?.has(a));
  equal(transaction.observationsSince(checkpoint).size, 0);
  equal(transaction.readersSince(checkpoint).size, 0);

  transaction.releaseCheckpoint(checkpoint);
  transaction.commitAfterValidatedRender();
  equal(a._readerValuesFor("root", "site").size, 1);
  equal(b._readerValuesFor("root", "site").size, 0);
  a.detachRoot("root");
  b.detachRoot("root");
});

Deno.test("dropReaders rejects closed transactions and pruned staging is not committed", () => {
  const store = createAsyncStore(5);
  const selection = createStoreSelector(
    [store],
    ([value]) => Number(value) + 1,
  );
  const transaction = new StoreRenderTransaction("root");
  equal(transaction.read(selection, "site"), 6);
  transaction.dropReaders(["site"]);
  assert(transaction.validate());
  equal(store.diagnostics().roots, 1);
  store.dispatch(1);
  assert(
    !transaction.validate(),
    "a pruned reader's pinned store was not validated",
  );
  transaction.discard();
  throws(() => transaction.dropReaders(["site"]), "closed store transaction");
  equal(store.diagnostics().readers, 0);
  equal(store._readerValuesFor("root", "site").size, 0);
  // Discard retains the store's root registration for the owning root's normal
  // detach/hold cleanup path.
  equal(store.diagnostics().roots, 1);
  store.detachRoot("root");
  equal(store.diagnostics().roots, 0);

  const committed = new StoreRenderTransaction("committed");
  committed.read(selection, "site");
  committed.dropReaders(["site"]);
  committed.commitAfterValidatedRender();
  throws(() => committed.dropReaders(["site"]), "closed store transaction");
  equal(store.diagnostics().readers, 0);
  store.detachRoot("committed");
});
