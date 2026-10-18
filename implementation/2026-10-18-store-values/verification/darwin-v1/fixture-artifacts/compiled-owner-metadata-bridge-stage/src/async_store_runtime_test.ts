import { createAsyncStore } from "./async_store_runtime.ts";

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
