import {
  batchStorePublication,
  createAsyncStore,
} from "./async_store_runtime.ts";

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

Deno.test("cross-store batch publishes every transition projection before listeners", () => {
  const left = createAsyncStore(0);
  const right = createAsyncStore(0);
  for (const root of ["one", "two"]) {
    left.beginRender(root);
    right.beginRender(root);
  }
  for (const store of [left, right]) {
    store.beginTransition("group", ["one", "two"]);
    store.dispatch(1, { kind: "transition", transitionId: "group" });
    store.finishTransition("group");
  }

  const seen: Array<[string, number, number, number, number]> = [];
  for (const root of ["one", "two"]) {
    left.subscribe(root, () => {
      seen.push([
        `left:${root}`,
        left.getStateForRoot("one"),
        left.getStateForRoot("two"),
        right.getStateForRoot("one"),
        right.getStateForRoot("two"),
      ]);
    });
  }
  right.subscribe("one", () => {
    seen.push([
      "right:one",
      left.getStateForRoot("one"),
      left.getStateForRoot("two"),
      right.getStateForRoot("one"),
      right.getStateForRoot("two"),
    ]);
  });

  batchStorePublication(() => {
    left.commitTransitionRoots("group", ["one", "two"]);
    right.commitTransitionRoots("group", ["one", "two"]);
  });

  equal(seen.length, 3, "not all root subscribers were notified");
  assert(
    seen.every(([, l1, l2, r1, r2]) =>
      l1 === 1 && l2 === 1 && r1 === 1 && r2 === 1
    ),
    "a listener observed a partial cross-store publication",
  );
});

Deno.test("nested publication batches drain once after the outer callback", () => {
  const store = createAsyncStore(0);
  store.beginRender("root");
  const seen: unknown[] = [];
  store.subscribe("root", (change) => seen.push(change.state));

  batchStorePublication(() => {
    store.dispatch(1);
    batchStorePublication(() => store.dispatch(2));
    equal(seen.length, 0, "nested batch notified before outer completion");
  });

  equal(seen.length, 2, "nested batch did not deliver both notifications");
  assert(
    seen.every((state) => state === 2),
    "nested batch listeners did not observe the completed publication",
  );
});

Deno.test("callback failure drains queued notifications and preserves the callback error", () => {
  const store = createAsyncStore(0);
  store.beginRender("root");
  const seen: unknown[] = [];
  store.subscribe("root", (change) => seen.push(change.state));
  const original = new Error("mutation callback failure");
  let caught: unknown;

  try {
    batchStorePublication(() => {
      store.dispatch(1);
      throw original;
    });
  } catch (error) {
    caught = error;
  }

  equal(caught, original, "the original callback error was not preserved");
  equal(seen.length, 1, "callback failure stranded queued notifications");
  equal(seen[0], 1, "the queued notification saw incorrect committed state");
  store.dispatch(2);
  equal(seen.length, 2, "a later ordinary dispatch was not delivered");
});

Deno.test("throwing listener does not block another store and errors report after drain", () => {
  const first = createAsyncStore(0);
  const second = createAsyncStore(0);
  first.beginRender("root");
  second.beginRender("root");
  const listenerError = new Error("listener failure");
  let secondCalls = 0;
  const unsubscribe = first.subscribe("root", () => {
    throw listenerError;
  });
  second.subscribe("root", () => secondCalls++);
  let caught: unknown;

  try {
    batchStorePublication(() => {
      first.dispatch(1);
      second.dispatch(1);
    });
  } catch (error) {
    caught = error;
  }

  assert(caught instanceof AggregateError, "listener error was not aggregated");
  equal(secondCalls, 1, "first store's listener blocked the second store");
  unsubscribe();
  first.dispatch(2);
  equal(secondCalls, 1, "unrelated store received a spurious notification");
  second.dispatch(2);
  equal(
    secondCalls,
    2,
    "notification drain remained stuck after a listener error",
  );
});

Deno.test("cross-store reentrant dispatch waits until current store listeners finish", () => {
  const first = createAsyncStore(0);
  const second = createAsyncStore(0);
  first.beginRender("root");
  second.beginRender("root");
  const order: string[] = [];
  first.subscribe("root", (change) => {
    order.push(`first-a:${change.state}`);
    if (change.state === 1) second.dispatch(1);
  });
  first.subscribe("root", (change) => order.push(`first-b:${change.state}`));
  second.subscribe("root", (change) => order.push(`second:${change.state}`));

  first.dispatch(1);

  equal(
    order.join(","),
    "first-a:1,first-b:1,second:1",
    "cross-store reentrant notifications interleaved recursively",
  );
  first.dispatch(2);
  equal(order.at(-2), "first-a:2", "next ordinary dispatch did not run");
  equal(
    order.at(-1),
    "first-b:2",
    "next ordinary dispatch was not fully delivered",
  );
});
