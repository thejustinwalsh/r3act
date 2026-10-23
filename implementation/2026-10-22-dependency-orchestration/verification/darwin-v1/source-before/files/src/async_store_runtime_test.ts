import { readOwnedClosedProjectionBatch } from "./closed_projection_schedule_test_helper.ts";
import {
  AsyncStore, captureCanonicalStoreReaderReceipt, createAsyncStore,
  bindOwnedClosedProjectionRequest,
  inspectCanonicalStoreReaderReceipt,
  StoreRenderTransaction,
  validateCanonicalClosedStorePhase,
} from "./async_store_runtime.ts";

Deno.test("canonical Store phase covers selected readers and preserves newer action lineage", () => {
  const paths = normalizeClosedProjectionPaths([["phase"]])!;
  const store = createAsyncStore(storeRecord({ phase: 1 }));
  const transaction = new StoreRenderTransaction("phase-root");
  const values = readOwnedClosedProjectionBatch(transaction, [
    { store, readerId: "first", paths },
    { store, readerId: "second", paths },
  ]);
  assert(values, "owned Store batch declined");
  equal(values[0][0], 1, "first reader projection");
  equal(values[1][0], 1, "second reader projection");
  equal(validateCanonicalClosedStorePhase(transaction, "prepared"), "current", "prepared phase");
  store.dispatch(storeRecord({ phase: 2 }));
  equal(validateCanonicalClosedStorePhase(transaction, "prepared"), "stale", "newer action prepared phase");
  equal(validateCanonicalClosedStorePhase(transaction, "after-host"), "current", "newer action lineage");
  transaction.preparePublicationAfterHost();
  transaction.publishAccepted();
  equal(store.diagnostics().readers, 2, "independent direct reader histories");
});

Deno.test("canonical Store phase falls back on override and rejects revoked root epoch", () => {
  const paths = normalizeClosedProjectionPaths([["phase"]])!;
  const store = createAsyncStore(storeRecord({ phase: 1 }));
  const transaction = new StoreRenderTransaction("phase-root");
  assert(readOwnedClosedProjectionBatch(transaction, [
    { store, readerId: "reader", paths },
  ]), "owned Store batch declined");
  const original = Object.getOwnPropertyDescriptor(AsyncStore.prototype, "_validateRender")!;
  try {
    Object.defineProperty(AsyncStore.prototype, "_validateRender", {
      ...original, value() { return false; },
    });
    equal(validateCanonicalClosedStorePhase(transaction, "prepared"), "public-required", "prototype override");
  } finally {
    Object.defineProperty(AsyncStore.prototype, "_validateRender", original);
  }
  const originalValidate = transaction.validate;
  transaction.validate = () => originalValidate.call(transaction);
  equal(validateCanonicalClosedStorePhase(transaction, "prepared"), "public-required", "own override");
  delete (transaction as { validate?: unknown }).validate;
  store.detachRoot("phase-root");
  equal(validateCanonicalClosedStorePhase(transaction, "after-host"), "stale", "revoked epoch");
  transaction.discard();
});

Deno.test("canonical Store phase rejects Proxy receiver before reflection", () => {
  const transaction = new StoreRenderTransaction("phase-proxy");
  let traps = 0;
  const proxy = new Proxy(transaction, { getPrototypeOf() { traps++; throw new Error("trap"); } });
  equal(validateCanonicalClosedStorePhase(proxy, "prepared"), "public-required", "Proxy status");
  equal(traps, 0, "receiver trap ran before private brand check");
});

Deno.test("canonical Store phase declines a mixed pinned snapshot without changing reader publication", () => {
  const paths = normalizeClosedProjectionPaths([["phase"]])!;
  const selected = createAsyncStore(storeRecord({ phase: 1 }));
  const other = createAsyncStore(5);
  const transaction = new StoreRenderTransaction("mixed-phase");
  assert(readOwnedClosedProjectionBatch(transaction, [
    { store: selected, readerId: "selected", paths },
  ]), "owned Store batch declined");
  equal(transaction.read(other, "other"), 5, "ordinary reader value");
  equal(validateCanonicalClosedStorePhase(transaction, "prepared"),
    "public-required", "mixed snapshot did not retain public validation");
  assert(transaction.validate(), "ordinary transaction validation changed");
  transaction.preparePublication();
  transaction.publishAccepted();
  equal(selected.diagnostics().readers, 1, "selected history was not published");
  equal(other.diagnostics().readers, 1, "ordinary history was not published");
});
import { normalizeClosedProjectionPaths, storeRecord } from "./owned_store_record.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function equal<T>(actual: T, expected: T, message: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `${message}: expected ${String(expected)}, got ${String(actual)}`,
    );
  }
}

Deno.test("owned batch stages distinct readers and leaves failed paths unstaged", () => {
  const paths = normalizeClosedProjectionPaths([["phase"]])!;
  const missing = normalizeClosedProjectionPaths([["missing"]])!;
  const store = createAsyncStore(storeRecord({ phase: 4 }));
  const failed = new StoreRenderTransaction("batch-root");
  equal(readOwnedClosedProjectionBatch(failed, [
    { store, readerId: "first", paths },
    { store, readerId: "second", paths: missing },
  ]), null, "missing projection should decline");
  equal(failed.readers.size, 0, "decline staged a reader");
  equal(failed.stores.size, 0, "decline pinned a snapshot");
  const transaction = new StoreRenderTransaction("batch-root");
  const values = readOwnedClosedProjectionBatch(transaction, [
    { store, readerId: "first", paths },
    { store, readerId: "second", paths },
  ]);
  assert(values, "canonical batch declined");
  equal(values[0][0], 4, "first projection");
  equal(values[1][0], 4, "second projection");
  equal(transaction.readers.size, 2, "reader membership was shared");
  equal(transaction.observations.size, 2, "reader observations were shared");
  transaction.preparePublication();
  transaction.publishAccepted();
  equal(store.diagnostics().readers, 2, "accepted reader histories were shared");
});

Deno.test("bound Store projections preserve independent readers across fresh roots", () => {
  const paths = normalizeClosedProjectionPaths([["phase"]])!;
  const store = createAsyncStore(storeRecord({ phase: 2 }));
  const first = bindOwnedClosedProjectionRequest({ store, readerId: "first", paths });
  const second = bindOwnedClosedProjectionRequest({ store, readerId: "second", paths });
  assert(first && second, "projection binding declined");
  const rootA = new StoreRenderTransaction("bound-store-a");
  const initial = readOwnedClosedProjectionBatch(rootA, [first, second]);
  assert(initial, "bound Store batch declined");
  equal(initial[0][0], 2, "first root value");
  equal(initial[1][0], 2, "second reader value");
  assert(initial[0] === initial[1],
    "separately bound readers lost shared Store/path projection identity");
  equal(rootA.readers.size, 2, "shared projection collapsed first-root readers");
  rootA.preparePublication();
  rootA.publishAccepted();
  store.dispatch(storeRecord({ phase: 5 }));
  const rootB = new StoreRenderTransaction("bound-store-b");
  const later = readOwnedClosedProjectionBatch(rootB, [first, second]);
  assert(later, "reused Store binding declined");
  equal(later[0][0], 5, "fresh root value");
  assert(later[0] === later[1],
    "reused bindings lost shared Store/path projection identity");
  equal(initial[0][0], 2, "saved projection changed");
  equal(rootB.readers.size, 2, "independent readers collapsed");
  rootB.preparePublication();
  rootB.publishAccepted();
  equal(readOwnedClosedProjectionBatch(new StoreRenderTransaction("forged"),
    [new Proxy(first, {})]), null, "Proxy receipt was trusted");
  let constructorForged = false;
  try {
    const Constructor = first.constructor as unknown as new (...args: unknown[]) => typeof first;
    new Constructor(Symbol("forged"), { store, readerId: "forged", paths });
    constructorForged = true;
  } catch { /* expected */ }
  equal(constructorForged, false, "runtime constructor minted a receipt");
  const ReceiptClass = first.constructor as unknown as {
    unwrap: (...args: unknown[]) => unknown;
  };
  equal(ReceiptClass.unwrap(Symbol("forged"), first), null,
    "public unwrap exposed private projection data");
  const originalUnwrap = ReceiptClass.unwrap;
  ReceiptClass.unwrap = () => { throw new Error("public unwrap replacement ran"); };
  try {
    const unaffected = new StoreRenderTransaction("bound-static-replacement");
    equal(readOwnedClosedProjectionBatch(unaffected, [first])?.[0][0], 5,
      "batch called replaced unwrap");
    unaffected.discard();
  } finally { ReceiptClass.unwrap = originalUnwrap; }
  const missing = bindOwnedClosedProjectionRequest({
    store, readerId: "missing", paths: [["missing"]],
  });
  assert(missing, "valid static missing path was rejected at binding");
  const missingRoot = new StoreRenderTransaction("bound-missing");
  equal(readOwnedClosedProjectionBatch(missingRoot, [missing]), null,
    "missing current data was accepted");
  equal(missingRoot.readers.size, 0, "failed capture staged readers");
  const replaced = new StoreRenderTransaction("bound-override");
  replaced.readClosedProjections = (() => {
    throw new Error("bound capture called public override");
  }) as typeof replaced.readClosedProjections;
  equal(readOwnedClosedProjectionBatch(replaced, [first]), null,
    "bound receipt bypassed replaced method audit");
  equal(replaced.readers.size, 0, "override decline staged readers");
});

Deno.test("owned batch reuses one projection per Store and branded path identity", () => {
  const paths = normalizeClosedProjectionPaths([["phase"]])!;
  const equalButDistinctPaths = normalizeClosedProjectionPaths([["phase"]])!;
  const first = createAsyncStore(storeRecord({ phase: 6 }));
  const second = createAsyncStore(storeRecord({ phase: 6 }));
  const transaction = new StoreRenderTransaction("batch-reuse");
  const requests = Array.from({ length: 257 }, (_, index) => ({
    store: first, readerId: `reader-${index}`, paths,
  }));
  const values = readOwnedClosedProjectionBatch(transaction, [
    ...requests,
    { store: first, readerId: "other-path", paths: equalButDistinctPaths },
    { store: second, readerId: "other-store", paths },
  ]);
  assert(values, "canonical repeated-path batch declined");
  for (let index = 1; index < 257; index++) {
    assert(values[index] === values[0], "identical Store/path repeated projection allocation");
  }
  assert(values[257] !== values[0], "distinct path identity shared a projection");
  assert(values[258] !== values[0], "distinct Store shared a projection");
  assert(transaction.readClosedProjections(first, "after-batch", paths) === values[0],
    "transaction-local projection memo was not seeded");
  equal(transaction.readers.size, 260, "reused projection collapsed reader membership");
  equal(transaction.observations.size, 260, "reused projection collapsed observations");
  transaction.discard();
});

Deno.test("owned batch audits after the last request trap", () => {
  const paths = normalizeClosedProjectionPaths([["phase"]])!;
  const first = createAsyncStore(storeRecord({ phase: 1 }));
  const second = createAsyncStore(storeRecord({ phase: 2 }));
  const original = Object.getOwnPropertyDescriptor(AsyncStore.prototype, "_validateRender")!;
  const last = new Proxy({ store: second, readerId: "second", paths }, {
    getOwnPropertyDescriptor(target, key) {
      if (key === "paths") {
        Object.defineProperty(AsyncStore.prototype, "_validateRender", {
          ...original, value() { return false; },
        });
      }
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  try {
    const transaction = new StoreRenderTransaction("batch-order");
    equal(readOwnedClosedProjectionBatch(transaction, [
      { store: first, readerId: "first", paths }, last,
    ]), null, "batch accepted a prototype revoked by the last request");
    equal(transaction.readers.size, 0, "revoked batch staged readers");
  } finally {
    Object.defineProperty(AsyncStore.prototype, "_validateRender", original);
  }
});

Deno.test("owned projections share a pinned value without sharing reader history or forks", () => {
  const paths = normalizeClosedProjectionPaths([["phase"]])!;
  const store = createAsyncStore(storeRecord({ phase: 2 }));
  const root = new StoreRenderTransaction("root");
  const first = root.readClosedProjections(store, "first", paths);
  const second = root.readClosedProjections(store, "second", paths);
  assert(first === second, "same snapshot and path plan did not share immutable values");
  equal(root.readers.size, 2, "reader membership was shared");
  equal(root.observations.size, 2, "reader observations were shared");
  const checkpoint = root.checkpoint();
  root.readClosedProjections(store, "temporary", paths);
  root.rollbackTo(checkpoint);
  equal(root.readers.size, 2, "rollback retained reader membership");
  equal(root.observations.size, 2, "rollback retained reader observation");
  root.releaseCheckpoint(checkpoint);
  root.preparePublication();
  root.publishAccepted();
  equal(store.diagnostics().readers, 2, "accepted reader count changed");

  const fork = new StoreRenderTransaction("fork");
  const forkValues = fork.readClosedProjections(store, "fork-reader", paths);
  assert(forkValues !== first, "fork reused a different pinned snapshot's values");
  fork.preparePublication();
  fork.publishAccepted();
  equal(store.diagnostics().readers, 3, "fork reader disappeared");
});

Deno.test("direct selector direct changes reset previous selection and retain exact receipt", () => {
  const store = createAsyncStore(3);
  const selector = store.select((_value, previous: number | undefined) => (previous ?? 0) + 1);
  const root = "reader-root";
  const site = "site";
  const direct = new StoreRenderTransaction(root);
  equal(direct.read(store, site), 3, "direct read");
  direct.preparePublication();
  direct.publishAccepted();
  const directReceipt = captureCanonicalStoreReaderReceipt(store, root, site);
  assert(directReceipt, "direct history had no receipt");
  equal(inspectCanonicalStoreReaderReceipt(store, root, site, directReceipt), "current", "direct receipt state");
  const selected = new StoreRenderTransaction(root);
  equal(selected.read(selector, site), 1, "selector inherited direct history");
  selected.preparePublication();
  selected.publishAccepted();
  const back = new StoreRenderTransaction(root);
  equal(back.read(store, site), 3, "direct reread");
  back.preparePublication();
  back.publishAccepted();
  const selectedAgain = new StoreRenderTransaction(root);
  equal(selectedAgain.read(selector, site), 1, "direct read retained stale selector previous");
  selectedAgain.discard();
  equal(inspectCanonicalStoreReaderReceipt(store, root, site, directReceipt), null, "old receipt survived replacement");
});

Deno.test("later closed admission rejects a prototype changed by an earlier selector", () => {
  const paths = normalizeClosedProjectionPaths([["phase"]])!;
  const store = createAsyncStore(storeRecord({ phase: 1 }));
  const original = Object.getOwnPropertyDescriptor(AsyncStore.prototype, "_validateRender")!;
  const selected = store.select((state) => {
    Object.defineProperty(AsyncStore.prototype, "_validateRender", {
      ...original, value: function () { return true; },
    });
    return state.phase;
  });
  const cut = new StoreRenderTransaction("root");
  try {
    equal(cut.read(selected, "selector"), 1, "selector value");
    equal(cut.readClosedProjections(store, "later", paths), null, "later admission accepted changed prototype");
    equal(cut.readers.has("later"), false, "declined reader was staged");
  } finally {
    Object.defineProperty(AsyncStore.prototype, "_validateRender", original);
    cut.discard();
  }
});

Deno.test("prepared store readers remain old until accepted publication", () => {
  const store = createAsyncStore(7);
  const selection = store.select((_value, previous: number | undefined) =>
    (previous ?? 0) + 1
  );
  const first = new StoreRenderTransaction("root");
  equal(first.read(selection, "reader"), 1, "initial reader history was wrong");
  first.preparePublication();

  const concurrent = new StoreRenderTransaction("root");
  equal(
    concurrent.read(selection, "reader"),
    1,
    "prepared reader history escaped before publication",
  );
  concurrent.discard();

  first.publishAccepted();
  first.notifyPublished();
  const next = new StoreRenderTransaction("root");
  equal(next.read(selection, "reader"), 2, "accepted history was not visible");
  next.discard();
});

Deno.test("posthost store publication retains newer action and prior reader cut", () => {
  const store = createAsyncStore(1, (state: number, action: number) =>
    state + action
  );
  const selection = store.select((state, previous: number | undefined) =>
    state + (previous ?? 0)
  );
  const transaction = new StoreRenderTransaction("root");
  equal(transaction.read(selection, "reader"), 1, "captured reader was wrong");
  store.dispatch(1);
  assert(!transaction.validate(), "newer action did not invalidate exact cut");
  assert(
    transaction.validatePublicationInputs(),
    "newer action invalidated the prior accepted cut",
  );
  transaction.preparePublicationAfterHost();
  transaction.publishAccepted();
  equal(store.getStateForRoot("root"), 2, "newer store action was lost");
  const next = new StoreRenderTransaction("root");
  equal(next.read(selection, "reader"), 3, "prior reader cut was not retained");
  next.discard();
});

Deno.test("head-equal urgent action is retained when it changes a hidden root", () => {
  const store = createAsyncStore(0);
  store.beginRender("root");
  store.beginTransition("slow", ["root"]);
  assert(
    store.dispatch(1, { kind: "transition", transitionId: "slow" }),
    "transition action was dropped",
  );
  equal(
    store.getStateForRoot("root"),
    0,
    "pending transition leaked to the visible root",
  );

  assert(store.dispatch(1), "head-equal urgent update was dropped");
  equal(store.getState(), 1, "chronological head changed unexpectedly");
  equal(
    store.getStateForRoot("root"),
    1,
    "urgent action did not update the visible projection",
  );
});

Deno.test("ordinary head no-op does not append or invalidate snapshots", () => {
  const store = createAsyncStore(4);
  const snapshot = store.beginRender("root");
  const version = store.version;
  assert(!store.dispatch(4), "ordinary no-op was retained");
  equal(store.version, version, "no-op advanced the action-log version");
  assert(snapshot.validate(), "no-op invalidated an unchanged root snapshot");
});

Deno.test("independent same-root transitions commit in reverse and replay in dispatch order", () => {
  const store = createAsyncStore(
    "",
    (state: string, action: string) => state + action,
  );
  store.beginRender("root");
  store.beginTransition("A", ["root"]);
  store.beginTransition("B", ["root"]);
  store.dispatch("A", { kind: "transition", transitionId: "A" });
  store.dispatch("B", { kind: "transition", transitionId: "B" });
  store.finishTransition("A");
  store.finishTransition("B");

  store.commitTransition("B", "root");
  equal(
    store.getStateForRoot("root"),
    "B",
    "B candidate should exclude still-pending A",
  );
  equal(
    store.getState(),
    "AB",
    "global action head lost dispatch order",
  );
  store.commitTransition("A", "root");
  equal(
    store.getStateForRoot("root"),
    "AB",
    "once A commits, both actions must replay in dispatch order",
  );
});

Deno.test("head-equal transition action is retained for a candidate that omits prior work", () => {
  const store = createAsyncStore(
    "",
    (state: string, action: { kind: "append" | "setA" }) =>
      action.kind === "append" ? `${state}A` : "A",
  );
  store.beginRender("root");
  store.beginTransition("A", ["root"]);
  store.dispatch({ kind: "append" }, { kind: "transition", transitionId: "A" });
  store.beginTransition("B", ["root"]);

  assert(
    store.dispatch({ kind: "setA" }, { kind: "transition", transitionId: "B" }),
    "head-equal B action was dropped despite changing B's candidate projection",
  );
  equal(store.getState(), "A", "head-equal transition changed the global head");
  equal(
    store.getStateForRoot("root", { transitions: ["B"] }),
    "A",
    "B candidate did not apply its action after omitting A",
  );
  equal(
    store.getStateForRoot("root"),
    "",
    "pending candidate leaked to the visible root",
  );
});

Deno.test("group transition commit publishes every root before notifying observers", () => {
  const store = createAsyncStore(0);
  store.beginRender("left");
  store.beginRender("right");
  store.beginTransition("group", ["left", "right"]);
  store.dispatch(7, { kind: "transition", transitionId: "group" });
  store.finishTransition("group");

  const observed: Array<[string, number, number]> = [];
  store.subscribe("left", () => {
    observed.push([
      "left",
      store.getStateForRoot("left"),
      store.getStateForRoot("right"),
    ]);
  });
  store.subscribe("right", () => {
    observed.push([
      "right",
      store.getStateForRoot("left"),
      store.getStateForRoot("right"),
    ]);
  });

  store.commitTransitionRoots("group", ["left", "right"]);
  equal(
    observed.length,
    2,
    "group commit did not notify each participating root",
  );
  assert(
    observed.every(([, left, right]) => left === 7 && right === 7),
    "observer saw a partial group projection",
  );
});

Deno.test("finish and partial commit publish outsider and participant pointers together", () => {
  const store = createAsyncStore(0);
  for (const rootId of ["committing", "still-pending", "outsider"]) {
    store.beginRender(rootId);
  }
  store.beginTransition("group", ["committing", "still-pending"]);
  store.dispatch(5, { kind: "transition", transitionId: "group" });

  const initialVersions = new Map(
    ["committing", "still-pending", "outsider"].map((rootId) => [
      rootId,
      store.getRootVersion(rootId),
    ]),
  );
  const observations: Array<{
    listener: string;
    states: [number, number, number];
    versions: [number, number, number];
  }> = [];
  for (const rootId of ["committing", "still-pending", "outsider"]) {
    store.subscribe(rootId, () => {
      observations.push({
        listener: rootId,
        states: [
          store.getStateForRoot("committing"),
          store.getStateForRoot("still-pending"),
          store.getStateForRoot("outsider"),
        ],
        versions: [
          store.getRootVersion("committing"),
          store.getRootVersion("still-pending"),
          store.getRootVersion("outsider"),
        ],
      });
    });
  }

  store.commitTransitionRoots("group", ["committing"], { finish: true });
  equal(
    observations.length,
    2,
    "finish/commit should notify the changed roots once",
  );
  assert(
    observations.every(({ states }) =>
      states[0] === 5 && states[1] === 0 && states[2] === 5
    ),
    "observer saw an intermediate projection before grouped publication",
  );
  assert(
    observations.every(({ versions }) =>
      versions[0] > initialVersions.get("committing")! &&
      versions[1] === initialVersions.get("still-pending")! &&
      versions[2] > initialVersions.get("outsider")!
    ),
    "root versions were not all updated before notifications",
  );
  assert(
    observations.every(({ listener }) => listener !== "still-pending"),
    "uncommitted participant was notified despite retaining its held projection",
  );
});

Deno.test("render snapshot pins state and invalidates after a relevant update", () => {
  const store = createAsyncStore(0);
  const snapshot = store.beginRender("root");
  equal(snapshot.state, 0, "snapshot did not capture initial state");
  store.dispatch(1);
  equal(snapshot.state, 0, "snapshot value was mutated by a later dispatch");
  assert(!snapshot.validate(), "stale snapshot remained valid after dispatch");
  const current = store.beginRender("root");
  equal(current.state, 1, "new render did not observe the update");
  assert(current.validate(), "fresh snapshot did not validate");
});

Deno.test("selector previous values publish only after render commit and remain reader-local", () => {
  const store = createAsyncStore(2);
  const seen: Array<number | undefined> = [];
  const selection = store.select<number>((state, previous) => {
    seen.push(previous);
    return state * 10;
  });

  const abandoned = store.beginRender("root");
  equal(
    abandoned.read(selection, "panel"),
    20,
    "first selector value was incorrect",
  );
  const committed = store.beginRender("root");
  equal(
    committed.read(selection, "panel"),
    20,
    "abandoned selector read changed committed history",
  );
  committed.commit();

  store.dispatch(3);
  const next = store.beginRender("root");
  equal(
    next.read(selection, "panel"),
    30,
    "selector did not compute the next value",
  );
  next.commit();
  const anotherReader = store.beginRender("root");
  equal(
    anotherReader.read(selection, "sidebar"),
    30,
    "independent reader returned wrong value",
  );

  equal(seen[0], undefined, "first read should have no previous value");
  equal(seen[1], undefined, "uncommitted render published selector history");
  equal(
    seen[2],
    20,
    "committed reader history was not supplied on the next render",
  );
  equal(seen[3], undefined, "selector history leaked between reader IDs");
});

Deno.test("detach invalidates snapshots, removes readers and releases transition holds", () => {
  const store = createAsyncStore(0);
  const snapshot = store.beginRender("root");
  store.beginTransition("held", ["root"]);
  store.dispatch(1, { kind: "transition", transitionId: "held" });
  let notifications = 0;
  store.subscribe("root", () => notifications++);
  const selection = store.select<string>((state, previous) =>
    `${state}:${previous ?? "none"}`
  );
  const render = store.beginRender("root", { transitions: ["held"] });
  render.read(selection, "reader");
  render.commit();

  store.detachRoot("root");
  assert(!snapshot.validate(), "pre-detach snapshot remained valid");
  assert(!render.validate(), "render snapshot remained valid after detach");
  equal(
    store.transitionRoots("held").length,
    0,
    "detached root still held the transition",
  );
  assert(
    store.hasTransition("held"),
    "detaching the last root implicitly finished the async action scope",
  );

  store.finishTransition("held");
  equal(
    store.getStateForRoot("root"),
    1,
    "released root did not catch up after transition completion",
  );
  store.dispatch(2);
  equal(notifications, 0, "detached root retained its subscription");

  const reattached = store.beginRender("root");
  assert(
    !snapshot.validate(),
    "old snapshot became valid after same-ID reattachment",
  );
  equal(
    reattached.read(selection, "reader"),
    "2:none",
    "detached selector history survived reattachment",
  );
});

Deno.test("head-equal urgent updates remain visible to roots attached afterward", () => {
  const store = createAsyncStore(0);
  store.beginTransition("unmounted", []);
  store.dispatch(1, { kind: "transition", transitionId: "unmounted" });

  assert(
    store.dispatch(1),
    "head-equal urgent action was dropped without known roots",
  );
  const laterRoot = store.beginRender("later");
  equal(
    laterRoot.state,
    1,
    "later root missed the urgent update while transition work was held",
  );
});

Deno.test("head-equal transition action is preserved for a root attached later", () => {
  const store = createAsyncStore(
    "",
    (state: string, action: "appendA" | "setA") =>
      action === "appendA" ? `${state}A` : "A",
  );
  store.beginTransition("earlier", ["old-root"]);
  store.dispatch("appendA", { kind: "transition", transitionId: "earlier" });
  store.beginTransition("later", []);
  assert(
    store.dispatch("setA", { kind: "transition", transitionId: "later" }),
    "head-equal transition action was dropped before a later root could attach",
  );

  const newRoot = store.beginRender("new-root");
  equal(
    newRoot.state,
    "",
    "open transitions leaked to the newly attached root",
  );
  store.finishTransition("later");
  equal(
    store.getStateForRoot("new-root"),
    "A",
    "new root did not observe the completed transition action",
  );
});

Deno.test("dispatch during notification drains after the current listener batch", () => {
  const store = createAsyncStore(0);
  const observedBySecond: Array<{ state: unknown; version: number }> = [];
  store.subscribe("root", (change) => {
    if (change.state === 1) store.dispatch(2);
  });
  store.subscribe("root", (change) => {
    observedBySecond.push({
      state: change.state,
      version: change.storeVersion,
    });
  });

  store.beginRender("root");
  store.dispatch(1);
  equal(
    observedBySecond.length,
    2,
    "nested update did not drain after the first listener batch",
  );
  equal(
    observedBySecond[0].state,
    1,
    "second listener did not receive the original batch snapshot",
  );
  equal(
    observedBySecond[1].state,
    2,
    "second listener did not receive the queued update",
  );
  equal(
    observedBySecond[1].version,
    store.version,
    "last notification version is stale",
  );
});

Deno.test("throwing notification listener does not leave the drain stuck", () => {
  const store = createAsyncStore(0);
  store.beginRender("root");
  let shouldThrow = true;
  const unsubscribe = store.subscribe("root", () => {
    if (shouldThrow) throw new Error("listener failure");
  });
  let secondListenerCalls = 0;
  store.subscribe("root", () => secondListenerCalls++);

  let threw = false;
  try {
    store.dispatch(1);
  } catch {
    threw = true;
  }
  assert(threw, "listener exception did not propagate");
  equal(
    secondListenerCalls,
    1,
    "throwing listener blocked a captured sibling listener",
  );
  unsubscribe();
  shouldThrow = false;
  store.dispatch(2);
  equal(
    secondListenerCalls,
    2,
    "notification drain remained stuck after listener threw",
  );
});
