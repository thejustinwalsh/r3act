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

function throws(run: () => unknown, message: string): void {
  let didThrow = false;
  try {
    run();
  } catch {
    didThrow = true;
  }
  assert(didThrow, message);
}

function watchRoots<S, A>(
  store: ReturnType<typeof createAsyncStore<S, A>>,
  roots: string[],
) {
  const notifications: string[] = [];
  for (const rootId of roots) {
    store.subscribe(rootId, () => notifications.push(rootId));
  }
  return notifications;
}

function observable<S, A>(
  store: ReturnType<typeof createAsyncStore<S, A>>,
  roots: string[],
) {
  return {
    state: store.getState(),
    version: store.version,
    roots: roots.map((rootId) => [rootId, store.getStateForRoot(rootId)]),
    rootVersions: roots.map((rootId) => [rootId, store.getRootVersion(rootId)]),
    diagnostics: store.diagnostics(),
  };
}

function cleanup<S, A>(
  store: ReturnType<typeof createAsyncStore<S, A>>,
  scopeIds: string[],
  rootIds: string[],
): void {
  for (const transitionId of scopeIds) store.finishTransition(transitionId);
  for (const rootId of rootIds) store.detachRoot(rootId);
  equal(
    JSON.stringify(store.diagnostics()),
    JSON.stringify({
      roots: 0,
      listeners: 0,
      readers: 0,
      retainedActions: 0,
      transitions: 0,
    }),
    "scope fixture teardown retained store-owned state",
  );
}

Deno.test("scope IDs reject empty and duplicate active identities without mutation", () => {
  const store = createAsyncStore(0);
  store.beginRender("root");
  const notifications = watchRoots(store, ["root", "other"]);
  store.beginTransition("active", ["root"]);
  const before = observable(store, ["root", "other"]);

  throws(
    () => store.beginTransition("", ["other"]),
    "empty transition IDs must be rejected",
  );
  throws(
    () => store.beginTransition("active", ["other"]),
    "a duplicate active transition ID must be rejected",
  );

  equal(
    JSON.stringify(observable(store, ["root", "other"])),
    JSON.stringify(before),
    "invalid begin calls changed store state, versions, or diagnostics",
  );
  equal(notifications.length, 0, "invalid begin calls notified subscribers");
  cleanup(store, ["active"], ["root", "other"]);
});

Deno.test("unknown and closed scopes reject dispatch without mutation or notification", () => {
  const store = createAsyncStore(0);
  store.beginRender("root");
  const notifications = watchRoots(store, ["root", "outsider"]);
  store.beginTransition("closed", ["root"]);
  store.finishTransition("closed");
  notifications.length = 0;
  const before = observable(store, ["root", "outsider"]);

  throws(
    () => store.dispatch(1, { kind: "transition", transitionId: "missing" }),
    "dispatch into an unknown scope must be rejected",
  );
  throws(
    () => store.dispatch(1, { kind: "transition", transitionId: "closed" }),
    "dispatch into a finished scope must be rejected",
  );

  equal(
    JSON.stringify(observable(store, ["root", "outsider"])),
    JSON.stringify(before),
    "invalid dispatch changed state, versions, or diagnostics",
  );
  equal(notifications.length, 0, "invalid dispatch notified subscribers");
  cleanup(store, ["closed"], ["root", "outsider"]);
});

Deno.test("duplicate and foreign root commits fail before changing projections", () => {
  const store = createAsyncStore(0);
  store.beginRender("member");
  store.beginRender("outsider");
  const notifications = watchRoots(store, ["member", "outsider"]);
  store.beginTransition("scope", ["member"]);
  store.dispatch(7, { kind: "transition", transitionId: "scope" });
  store.finishTransition("scope");
  notifications.length = 0;
  const before = observable(store, ["member", "outsider"]);

  throws(
    () => store.commitTransitionRoots("scope", ["member", "member"]),
    "a commit with duplicate root IDs must be rejected",
  );
  throws(
    () => store.commitTransition("scope", "outsider"),
    "a commit by a root outside the scope must be rejected",
  );

  equal(
    JSON.stringify(observable(store, ["member", "outsider"])),
    JSON.stringify(before),
    "invalid commits changed state, versions, or diagnostics",
  );
  equal(notifications.length, 0, "invalid commits notified subscribers");
  cleanup(store, ["scope"], ["member", "outsider"]);
});

Deno.test("finishing known or unknown scopes is idempotent and unknown finish is a no-op", () => {
  const store = createAsyncStore("");
  store.beginRender("held");
  store.beginRender("outsider");
  const notifications = watchRoots(store, ["held", "outsider"]);
  store.beginTransition("scope", ["held"]);
  store.dispatch("A", { kind: "transition", transitionId: "scope" });
  store.finishTransition("scope");
  notifications.length = 0;
  const afterFirstFinish = observable(store, ["held", "outsider"]);

  store.finishTransition("scope");
  store.finishTransition("never-began");

  equal(
    JSON.stringify(observable(store, ["held", "outsider"])),
    JSON.stringify(afterFirstFinish),
    "repeated/unknown finish changed state, versions, or diagnostics",
  );
  equal(
    notifications.length,
    0,
    "repeated/unknown finish notified subscribers",
  );
  equal(store.getStateForRoot("held"), "", "finish released a held root early");
  equal(
    store.getStateForRoot("outsider"),
    "A",
    "finished scope did not publish to outsider",
  );
  cleanup(store, ["scope"], ["held", "outsider"]);
});

Deno.test("release is idempotent for a known scope and foreign releases are no-ops", () => {
  const store = createAsyncStore("");
  store.beginRender("root");
  store.beginRender("other-held-root");
  const notifications = watchRoots(store, ["root", "other-held-root"]);
  store.beginTransition("scope", ["root", "other-held-root"]);
  store.dispatch("A", { kind: "transition", transitionId: "scope" });
  store.finishTransition("scope");
  notifications.length = 0;

  const beforeForeignRelease = observable(store, [
    "root",
    "other-held-root",
    "foreign",
  ]);
  store.releaseTransition("scope", "foreign");
  equal(
    JSON.stringify(
      observable(store, ["root", "other-held-root", "foreign"]),
    ),
    JSON.stringify(beforeForeignRelease),
    "foreign release changed state, versions, or diagnostics",
  );
  equal(
    notifications.length,
    0,
    "foreign release notified existing subscribers",
  );
  throws(
    () => store.releaseTransition("missing", "foreign"),
    "release against an unknown scope must remain an error",
  );
  equal(
    JSON.stringify(
      observable(store, ["root", "other-held-root", "foreign"]),
    ),
    JSON.stringify(beforeForeignRelease),
    "unknown-scope release changed state, versions, or diagnostics",
  );
  equal(
    notifications.length,
    0,
    "unknown-scope release notified existing subscribers",
  );

  store.releaseTransition("scope", "root");
  notifications.length = 0;
  const afterFirstRelease = observable(store, ["root", "other-held-root"]);

  store.releaseTransition("scope", "root");

  equal(
    JSON.stringify(observable(store, ["root", "other-held-root"])),
    JSON.stringify(afterFirstRelease),
    "repeated release changed state, versions, or diagnostics",
  );
  equal(notifications.length, 0, "repeated release notified subscribers");
  equal(
    store.getStateForRoot("root"),
    "A",
    "released root retained a transition hold",
  );
  equal(
    store.getStateForRoot("other-held-root"),
    "",
    "releasing one root released a sibling root's hold",
  );
  cleanup(store, ["scope"], ["root", "other-held-root", "foreign"]);
});

Deno.test("reattaching a detached ID does not restore its old scope membership", () => {
  const store = createAsyncStore("");
  const oldSnapshot = store.beginRender("same-id");
  store.beginTransition("scope", ["same-id"]);
  store.dispatch("A", { kind: "transition", transitionId: "scope" });
  store.detachRoot("same-id");
  const reattached = store.beginRender("same-id");

  assert(
    !oldSnapshot.validate(),
    "detached snapshot revived after same-ID attach",
  );
  equal(reattached.state, "", "open transition leaked into a late attachment");
  equal(
    store.transitionRoots("scope").includes("same-id"),
    false,
    "detached root membership survived reattachment",
  );
  const beforeInvalidCommit = observable(store, ["same-id"]);
  throws(
    () => store.commitTransition("scope", "same-id"),
    "reattached root must not commit its former scope membership",
  );
  equal(
    JSON.stringify(observable(store, ["same-id"])),
    JSON.stringify(beforeInvalidCommit),
    "foreign commit by reattached ID mutated store state",
  );

  store.finishTransition("scope");
  equal(
    store.getStateForRoot("same-id"),
    "A",
    "reattached root did not fold the original action after scope completion",
  );
  cleanup(store, ["scope"], ["same-id"]);
});

Deno.test("late roots fold original actions according to open, finished, and released scope state", () => {
  const store = createAsyncStore(
    "",
    (state: string, action: string) => state + action,
  );
  store.beginRender("held");
  store.beginRender("released");
  store.beginTransition("scope", ["held", "released"]);
  store.dispatch("A", { kind: "transition", transitionId: "scope" });
  store.dispatch("U");

  const whileOpen = store.beginRender("late-open");
  equal(
    whileOpen.state,
    "U",
    "open scope late root failed to fold urgent action over skipped A",
  );
  equal(
    store.getStateForRoot("late-open", { transitions: ["scope"] }),
    "AU",
    "scope candidate did not fold original actions in dispatch order",
  );

  store.finishTransition("scope");
  const whileFinished = store.beginRender("late-finished");
  equal(
    whileFinished.state,
    "AU",
    "finished scope late root missed the transition action",
  );
  equal(
    store.getStateForRoot("held"),
    "U",
    "finish released a still-pending participant",
  );

  store.releaseTransition("scope", "released");
  const afterRelease = store.beginRender("late-released");
  equal(
    afterRelease.state,
    "AU",
    "late root after release did not observe original action fold",
  );
  equal(
    store.getStateForRoot("released"),
    "AU",
    "released root did not catch up to action head",
  );
  equal(
    store.getStateForRoot("held"),
    "U",
    "releasing a sibling root released the held root",
  );
  cleanup(
    store,
    ["scope"],
    ["held", "released", "late-open", "late-finished", "late-released"],
  );
});
