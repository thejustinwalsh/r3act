import { assert, assertEquals } from "jsr:@std/assert";
import {
  acknowledgeCanonicalStoreReaderCohort, AsyncStore, createAsyncStore,
  inspectCanonicalClosedStorePublication,
  prepareCanonicalClosedStorePublicationAfterHost,
  readOwnedClosedProjectionBatch, StoreRenderTransaction,
} from "./async_store_runtime.ts";
import { normalizeClosedProjectionPaths, storeRecord } from "./owned_store_record.ts";

Deno.test("passive cohort checks every accepted reader and root-specific cut", () => {
  const shared = createAsyncStore(1);
  const other = createAsyncStore(4);
  const left = new StoreRenderTransaction("left-cohort");
  assertEquals(left.read(shared, "first"), 1);
  assertEquals(left.read(shared, "second"), 1);
  assertEquals(left.read(other, "other"), 4);
  left.commitAfterValidatedRender();
  const right = new StoreRenderTransaction("right-cohort");
  assertEquals(right.read(shared, "fork"), 1);
  right.commitAfterValidatedRender();
  const entries = [
    { store: shared, rootId: "left-cohort", readerId: "first" },
    { store: shared, rootId: "left-cohort", readerId: "second" },
    { store: other, rootId: "left-cohort", readerId: "other" },
    { store: shared, rootId: "right-cohort", readerId: "fork" },
  ];
  assertEquals(acknowledgeCanonicalStoreReaderCohort(entries), "current");
  assertEquals(acknowledgeCanonicalStoreReaderCohort([
    ...entries, { store: shared, rootId: "left-cohort", readerId: "missing" },
  ]), "stale");
  shared.dispatch(2);
  assertEquals(acknowledgeCanonicalStoreReaderCohort(entries), "stale");
  const updated = new StoreRenderTransaction("left-cohort");
  assertEquals(updated.read(shared, "first"), 2);
  assertEquals(updated.read(shared, "second"), 2);
  updated.commitAfterValidatedRender();
  assertEquals(acknowledgeCanonicalStoreReaderCohort(entries), "stale");
  shared.detachRoot("right-cohort");
  const replacement = new StoreRenderTransaction("right-cohort");
  assertEquals(replacement.read(shared, "fork"), 2);
  replacement.commitAfterValidatedRender();
  assertEquals(acknowledgeCanonicalStoreReaderCohort(entries), "current");
  shared.detachRoot("left-cohort");
  assertEquals(acknowledgeCanonicalStoreReaderCohort(entries), "stale");
});

Deno.test("passive cohort declines altered Store shapes and rejects Proxy without traps", () => {
  const store = createAsyncStore(1);
  const transaction = new StoreRenderTransaction("shape-cohort");
  transaction.read(store, "reader");
  transaction.commitAfterValidatedRender();
  const entry = [{ store, rootId: "shape-cohort", readerId: "reader" }];
  assertEquals(acknowledgeCanonicalStoreReaderCohort(entry), "current");
  const original = Object.getOwnPropertyDescriptor(AsyncStore.prototype, "_validateRender")!;
  try {
    Object.defineProperty(AsyncStore.prototype, "_validateRender", {
      ...original, value() { return true; },
    });
    assertEquals(acknowledgeCanonicalStoreReaderCohort(entry), "public-required");
  } finally {
    Object.defineProperty(AsyncStore.prototype, "_validateRender", original);
  }
  Object.defineProperty(store, "_validateRender", {
    configurable: true, value: store._validateRender,
  });
  assertEquals(acknowledgeCanonicalStoreReaderCohort(entry), "public-required");
  Reflect.deleteProperty(store, "_validateRender");
  const subclass = new (class extends AsyncStore<number> {})(1);
  assertEquals(acknowledgeCanonicalStoreReaderCohort([
    { store: subclass, rootId: "shape-cohort", readerId: "reader" },
  ]), "public-required");
  let traps = 0;
  const proxy = new Proxy(store, { getPrototypeOf() { traps++; throw new Error("trap"); } });
  assertEquals(acknowledgeCanonicalStoreReaderCohort([
    { store: proxy, rootId: "shape-cohort", readerId: "reader" },
  ]), "public-required");
  assertEquals(traps, 0);
  const mapGet = Map.prototype.get;
  try {
    Map.prototype.get = function (key) { return mapGet.call(this, key); };
    assertEquals(acknowledgeCanonicalStoreReaderCohort(entry), "public-required");
  } finally {
    Map.prototype.get = mapGet;
  }
  assertEquals(acknowledgeCanonicalStoreReaderCohort(entry), "current");
});

Deno.test("canonical Store publication prepares the captured cut after newer actions", () => {
  const paths = normalizeClosedProjectionPaths([["value"]])!;
  const first = createAsyncStore(storeRecord({ value: 1 }));
  const second = createAsyncStore(storeRecord({ value: 7 }));
  const transaction = new StoreRenderTransaction("publication-cohort");
  assert(readOwnedClosedProjectionBatch(transaction, [
    { store: first, readerId: "first", paths },
    { store: second, readerId: "second", paths },
  ]));
  assertEquals(inspectCanonicalClosedStorePublication(transaction), "current");
  first.dispatch(storeRecord({ value: 2 }));
  assertEquals(inspectCanonicalClosedStorePublication(transaction), "current");
  assertEquals(prepareCanonicalClosedStorePublicationAfterHost(transaction), "ready");
  transaction.publishAccepted();
  assertEquals(first.diagnostics().readers, 1);
  assertEquals(second.diagnostics().readers, 1);
  assertEquals(inspectCanonicalClosedStorePublication(transaction), "stale");
});

Deno.test("canonical Store publication declines changed methods and revoked roots", () => {
  const paths = normalizeClosedProjectionPaths([["value"]])!;
  const store = createAsyncStore(storeRecord({ value: 1 }));
  const transaction = new StoreRenderTransaction("declined-publication");
  assert(readOwnedClosedProjectionBatch(transaction, [{ store, readerId: "reader", paths }]));
  const original = transaction.preparePublicationAfterHost;
  transaction.preparePublicationAfterHost = function () {
    return original.call(this);
  };
  assertEquals(inspectCanonicalClosedStorePublication(transaction), "public-required");
  Reflect.deleteProperty(transaction, "preparePublicationAfterHost");
  store.detachRoot("declined-publication");
  assertEquals(inspectCanonicalClosedStorePublication(transaction), "stale");
  assertEquals(prepareCanonicalClosedStorePublicationAfterHost(transaction), "stale");
  transaction.discard();
});
