import {
  captureCanonicalBlockedStoreReaderReceipt, createAsyncStore, createStoreSelector,
  prepareCanonicalClosedStorePublication,
  readOwnedClosedProjectionBatch, readOwnedClosedStoreCaptureCounts,
  StoreRenderTransaction,
} from "./async_store_runtime.ts";
import { normalizeClosedProjectionPaths, storeRecord } from "./owned_store_record.ts";
import {
  captureOwnedClosedWorldInputBatch, createClosedWorldCellCut,
  OwnerStateWorld, validateCanonicalClosedWorldPhase,
} from "./owner_state_world.ts";

function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const same = (actual: unknown, expected: unknown, message: string) => {
  if (!Object.is(actual, expected)) throw new Error(`${message}: ${String(actual)}`);
};

Deno.test("owned direct staging keeps distinct readers and publishes an older cut", () => {
  const first = createAsyncStore(storeRecord({ phase: 2 }));
  const second = createAsyncStore(storeRecord({ phase: 4 }));
  const paths = normalizeClosedProjectionPaths([["phase"]])!;
  const transaction = new StoreRenderTransaction("owned-direct");
  const values = readOwnedClosedProjectionBatch(transaction, [
    { store: first, readerId: "a", paths },
    { store: first, readerId: "b", paths },
    { store: second, readerId: "c", paths },
  ]);
  check(values, "direct capture declined");
  check(values[0] === values[1], "shared path was copied");
  check(values[0] !== values[2], "different stores shared a projection");
  same(transaction.readers.size, 3, "reader view collapsed IDs");
  same(transaction.getObservation("a")?.value, transaction.getObservation("b")?.value,
    "same-store observations diverged");
  same(readOwnedClosedStoreCaptureCounts(transaction)?.ownedDirectRows, 3, "row count");
  same(readOwnedClosedStoreCaptureCounts(transaction)?.genericMaterializations, 0,
    "read-only view promoted staging");
  same(captureCanonicalBlockedStoreReaderReceipt(transaction, "a", first), null,
    "direct reader became a captured blocked reader");
  first.dispatch(storeRecord({ phase: 9 }));
  same(prepareCanonicalClosedStorePublication(transaction), "ready", "old cut stage");
  transaction.publishAccepted();
  same(first.diagnostics().readers, 2, "accepted reader identity");
  same(second.diagnostics().readers, 1, "second store reader identity");
  same(readOwnedClosedStoreCaptureCounts(transaction)?.genericMaterializations, 0,
    "canonical stage promoted staging");
  same(transaction.readers.size, 3, "postpublication reader view was lost");
  same(transaction.observations.size, 3, "postpublication observations were lost");
});

Deno.test("direct candidate promotes once from captured values for general reads and savepoints", () => {
  const store = createAsyncStore(storeRecord({ phase: 1 }));
  const paths = normalizeClosedProjectionPaths([["phase"]])!;
  const transaction = new StoreRenderTransaction("owned-promotion");
  check(readOwnedClosedProjectionBatch(transaction, [{ store, readerId: "direct", paths }]),
    "direct capture declined");
  store.dispatch(storeRecord({ phase: 7 }));
  const checkpoint = transaction.checkpoint();
  same(readOwnedClosedStoreCaptureCounts(transaction)?.genericMaterializations, 1,
    "checkpoint did not promote exactly once");
  same((transaction.read(store, "direct") as { phase: number }).phase, 1,
    "promotion reread the newer head");
  const selected = createStoreSelector([store], ([state]) =>
    (state as { phase: number }).phase + 1);
  same(transaction.read(selected, "selected"), 2, "selector lost captured state");
  transaction.rollbackTo(checkpoint);
  same(transaction.readers.size, 1, "rollback removed captured direct reader");
  same(transaction.getObservation("selected"), undefined, "rollback retained selector");
  transaction.releaseCheckpoint(checkpoint);
  same(readOwnedClosedStoreCaptureCounts(transaction)?.genericMaterializations, 1,
    "general reads repeated promotion");
  transaction.preparePublicationAfterHost();
  transaction.publishAccepted();
  same(store.diagnostics().readers, 1, "rollback published selector history");
});

Deno.test("publication override requests public fallback before staging", () => {
  const store = createAsyncStore(storeRecord({ phase: 3 }));
  const paths = normalizeClosedProjectionPaths([["phase"]])!;
  const transaction = new StoreRenderTransaction("owned-override");
  check(readOwnedClosedProjectionBatch(transaction, [{ store, readerId: "a", paths }]),
    "direct capture declined");
  const original = transaction.preparePublicationAfterHost;
  let calls = 0;
  transaction.preparePublicationAfterHost = function () {
    calls++;
    return original.call(this);
  };
  same(prepareCanonicalClosedStorePublication(transaction), "public-required",
    "override was bypassed");
  same(readOwnedClosedStoreCaptureCounts(transaction)?.genericMaterializations, 0,
    "fallback decision promoted early");
  transaction.preparePublicationAfterHost();
  same(calls, 1, "public method was not observed");
  same(readOwnedClosedStoreCaptureCounts(transaction)?.genericMaterializations, 1,
    "public staging did not promote");
  transaction.publishAccepted();
});

Deno.test("direct reader retirement and fork epochs remain independent", () => {
  const store = createAsyncStore(storeRecord({ phase: 5 }));
  const paths = normalizeClosedProjectionPaths([["phase"]])!;
  const first = new StoreRenderTransaction("owned-fork-a");
  const second = new StoreRenderTransaction("owned-fork-b");
  check(readOwnedClosedProjectionBatch(first, [
    { store, readerId: "a", paths }, { store, readerId: "b", paths },
  ]), "first fork capture declined");
  check(readOwnedClosedProjectionBatch(second, [
    { store, readerId: "a", paths },
  ]), "second fork capture declined");
  first.dropReaders(["b"]);
  same(readOwnedClosedStoreCaptureCounts(first)?.genericMaterializations, 1,
    "drop did not promote");
  same(readOwnedClosedStoreCaptureCounts(second)?.genericMaterializations, 0,
    "other fork promoted");
  first.preparePublication();
  first.publishAccepted();
  same(store.diagnostics().readers, 1, "first fork retirement changed history");
  store.detachRoot("owned-fork-b");
  same(prepareCanonicalClosedStorePublication(second), "stale",
    "revoked second root epoch published");
  second.discard();
  same(second.readers.size, 1, "discard lost reader footprint");
  same(second.observations.size, 0, "discard retained an observation");
});

Deno.test("descriptor traps cannot smuggle malformed projection requests", () => {
  const store = createAsyncStore(storeRecord({ phase: 2 }));
  const paths = normalizeClosedProjectionPaths([["phase"]])!;
  const transaction = new StoreRenderTransaction("owned-proxy");
  let traps = 0;
  const request = new Proxy({ store, readerId: "a", paths }, {
    getOwnPropertyDescriptor(target, name) {
      traps++;
      if (name === "paths") return { configurable: true, enumerable: true,
        get() { throw new Error("getter must not run"); } };
      return Reflect.getOwnPropertyDescriptor(target, name);
    },
  });
  same(readOwnedClosedProjectionBatch(transaction, [request]), null,
    "accessor request entered owned capture");
  check(traps > 0, "request descriptor was not inspected");
  same(transaction.stores.size, 0, "malformed request pinned a store");
  same(transaction.readers.size, 0, "malformed request staged a reader");
});

Deno.test("private World batch deduplicates authentic cells and preserves signed zero", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "owned-world");
  const [, update] = world.useState(owner, "value", -0);
  const batch = captureOwnedClosedWorldInputBatch(world, [
    { owner, sites: ["value", "value"] }, { owner, sites: ["value"] },
  ]);
  check(batch, "World batch declined");
  same(batch.rows.length, 2, "duplicate request count");
  same(batch.rows[0].cells.length, 2, "duplicate site row changed");
  check(Object.is(batch.rows[0].cells[0].value, -0), "signed zero changed");
  same(validateCanonicalClosedWorldPhase(world, batch.cellCut, "prepared"), "current",
    "authentic cut invalid");
  const copied = createClosedWorldCellCut(batch.rows.flatMap((row) => row.cells));
  check(copied, "public defensive cut declined");
  update(0);
  same(validateCanonicalClosedWorldPhase(world, batch.cellCut, "prepared"), "stale",
    "signed-zero change was invisible");
  const malformed = [, { owner, sites: ["value"] }] as unknown as
    readonly { owner: number; sites: readonly string[] }[];
  same(captureOwnedClosedWorldInputBatch(world, malformed), null,
    "sparse caller array entered private capture");
});
