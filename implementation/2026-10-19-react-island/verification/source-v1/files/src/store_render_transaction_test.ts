import {
  createAsyncStore,
  createStoreSelector,
  storeDependencies,
  StoreRenderTransaction,
  type StoreSource,
} from "./async_store_runtime.ts";
const equal = (actual: unknown, expected: unknown) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
};
const assert = (value: unknown, message = "Assertion failed") => {
  if (!value) throw new Error(message);
};
const throws = (run: () => unknown, text: string) => {
  try {
    run();
  } catch (e) {
    assert(String(e).includes(text), String(e));
    return;
  }
  throw new Error("Expected rejection");
};
Deno.test("transaction pins complete multi-store selection dependency set", () => {
  const a = createAsyncStore(2), b = createAsyncStore(4);
  const sum = createStoreSelector([a, b], ([a, b]) => Number(a) + Number(b));
  const transaction = new StoreRenderTransaction("root");
  equal(transaction.read(sum, "sum"), 6);
  a.dispatch(3);
  b.dispatch(5);
  equal(transaction.read(sum, "sum"), 6);
  assert(!transaction.validate());
  transaction.discard();
  const retry = new StoreRenderTransaction("root");
  equal(retry.read(sum, "sum"), 8);
  assert(retry.validate());
  retry.commitAfterValidatedRender();
  equal(a.diagnostics().readers, 1);
  equal(b.diagnostics().readers, 1);
  a.forgetReader("root", "sum");
  b.forgetReader("root", "sum");
  a.detachRoot("root");
  b.detachRoot("root");
  equal(a.diagnostics().roots, 0);
  equal(b.diagnostics().roots, 0);
});
Deno.test("discarded transaction leaves no committed selector history", () => {
  const a = createAsyncStore(1), b = createAsyncStore(2);
  const seen: unknown[] = [];
  const sum = createStoreSelector([a, b], ([a, b], previous) => {
    seen.push(previous);
    return Number(a) + Number(b);
  });
  const abandoned = new StoreRenderTransaction("r");
  equal(abandoned.read(sum, "site"), 3);
  abandoned.discard();
  equal(a.diagnostics().readers, 0);
  equal(b.diagnostics().readers, 0);
  const committed = new StoreRenderTransaction("r");
  equal(committed.read(sum, "site"), 3);
  committed.commitAfterValidatedRender();
  const next = new StoreRenderTransaction("r");
  equal(next.read(sum, "site"), 3);
  next.discard();
  equal(seen[0], undefined);
  equal(seen[1], undefined);
  equal(seen[2], 3);
});
Deno.test("store changed during traversal before first discovery invalidates candidate", () => {
  const a = createAsyncStore(1),
    b = createAsyncStore(2),
    unrelated = createAsyncStore(9);
  const candidate = new StoreRenderTransaction("r");
  equal(candidate.read(a, "first"), 1);
  b.dispatch(3);
  equal(candidate.read(b, "second"), 3);
  assert(!candidate.validate());
  candidate.discard();
  const next = new StoreRenderTransaction("r");
  equal(next.read(a, "first"), 1);
  unrelated.dispatch(10);
  equal(next.read(b, "second"), 3);
  assert(next.validate());
  next.discard();
});
Deno.test("selector side effect cannot publish invalidated pinned read set", () => {
  const a = createAsyncStore(1), b = createAsyncStore(2);
  const selection = createStoreSelector([a, b], ([a, b]) => {
    aStoreUpdate();
    return Number(a) + Number(b);
  });
  const aStoreUpdate = () => a.dispatch(5);
  const candidate = new StoreRenderTransaction("r");
  equal(candidate.read(selection, "site"), 3);
  assert(!candidate.validate());
  candidate.discard();
  equal(a.diagnostics().readers, 0);
});
Deno.test("transaction root projections include only requested pending transitions", () => {
  const a = createAsyncStore(0), b = createAsyncStore(10);
  a.beginRender("r");
  b.beginRender("r");
  a.beginTransition("T", ["r"]);
  b.beginTransition("T", ["r"]);
  a.dispatch(1, { kind: "transition", transitionId: "T" });
  b.dispatch(11, { kind: "transition", transitionId: "T" });
  const selection = createStoreSelector(
    [a, b],
    ([a, b]) => Number(a) + Number(b),
  );
  const urgent = new StoreRenderTransaction("r");
  equal(urgent.read(selection, "s"), 10);
  urgent.discard();
  const transition = new StoreRenderTransaction("r", { transitions: ["T"] });
  equal(transition.read(selection, "s"), 12);
  assert(transition.validate());
  transition.discard();
});
Deno.test("unknown store sources reject before executing custom reads", () => {
  let calls = 0;
  const candidate = new StoreRenderTransaction("r");
  throws(() =>
    candidate.read({
      read() {
        calls++;
        return 1;
      },
    }, "s"), "declared StoreSelection");
  equal(calls, 0);
  candidate.discard();
});
Deno.test("source graph captures immutable dependencies and deduplicates participants", () => {
  const a = createAsyncStore(2), b = createAsyncStore(9);
  const dependencies = [a];
  const selection = createStoreSelector(dependencies, ([v]) => Number(v));
  dependencies[0] = b;
  const nested = createStoreSelector(
    [selection, a],
    ([left, right]) => Number(left) + Number(right),
  );
  const candidate = new StoreRenderTransaction("r");
  equal(candidate.read(nested, "s"), 4);
  equal(candidate.stores.size, 1);
  assert(candidate.validate());
  candidate.discard();
});

Deno.test("inline selector replacement releases the previous read-site graph", () => {
  const store = createAsyncStore(1);
  let oldSelection = store.select((value) => value);
  for (let i = 0; i < 100; i++) {
    const selection = store.select((value) => value + i);
    const candidate = new StoreRenderTransaction("r");
    candidate.read(selection, "site");
    assert(candidate.validate());
    candidate.commitAfterValidatedRender();
    const history = store._readerValuesFor("r", "site");
    equal(history.size, 1);
    assert(!history.has(oldSelection));
    oldSelection = selection;
  }
  store.forgetReader("r", "site");
  equal(store._readerValuesFor("r", "site").size, 0);
  store.detachRoot("r");
});

Deno.test("declared adapter sources read pinned dependencies through the public protocol", () => {
  const a = createAsyncStore(2), b = createAsyncStore(3);
  const adapter: StoreSource<number> = {
    [storeDependencies]: Object.freeze([a, b]),
    read(session) {
      return a.read(session) * b.read(session);
    },
  };
  const candidate = new StoreRenderTransaction("r");
  equal(candidate.read(adapter, "s"), 6);
  a.dispatch(4);
  equal(candidate.read(adapter, "s"), 6);
  assert(!candidate.validate());
  candidate.discard();
});
Deno.test("adapter sources cannot read undeclared stores or cyclic graphs", () => {
  const declared = createAsyncStore(1), hidden = createAsyncStore(2);
  const bad: StoreSource<number> = {
    [storeDependencies]: [declared],
    read(session) {
      return hidden.read(session);
    },
  };
  const candidate = new StoreRenderTransaction("r");
  throws(() => candidate.read(bad, "s"), "not included");
  equal(declared.diagnostics().readers, 0);
  candidate.discard();
  const deps: StoreSource<unknown>[] = [];
  const cycle: StoreSource<number> = {
    [storeDependencies]: deps,
    read() {
      return 0;
    },
  };
  deps.push(cycle);
  const next = new StoreRenderTransaction("r");
  throws(() => next.read(cycle, "s"), "dependency cycle");
  next.discard();
});
