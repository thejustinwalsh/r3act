import {
  createAsyncStore,
  createStoreSelector,
  StoreRenderTransaction,
} from "./async_store_runtime.ts";

type Operation = { id: string; payload: string };
type State = {
  optimistic: readonly Operation[];
  confirmed: readonly Operation[];
};
type Action =
  | { kind: "begin"; operation: Operation }
  | { kind: "confirm"; id: string }
  | { kind: "compensate"; id: string }
  | { kind: "noop" };

const initial: State = {
  optimistic: [{ id: "draft-a", payload: "A" }],
  confirmed: [],
};

function reduce(state: State, action: Action): State {
  switch (action.kind) {
    case "begin":
      if (state.optimistic.some((item) => item.id === action.operation.id)) {
        return state;
      }
      return { ...state, optimistic: [...state.optimistic, action.operation] };
    case "confirm": {
      const operation = state.optimistic.find((item) => item.id === action.id);
      if (!operation) return state;
      return {
        optimistic: state.optimistic.filter((item) => item.id !== action.id),
        confirmed: [...state.confirmed, operation],
      };
    }
    case "compensate": {
      const next = state.optimistic.filter((item) => item.id !== action.id);
      return next.length === state.optimistic.length
        ? state
        : { ...state, optimistic: next };
    }
    case "noop":
      return state;
  }
}

type LogEntry = {
  action: Action;
  transitionId?: string;
  heldRoots: Set<string>;
};
type Scope = { roots: Set<string>; completed: Set<string>; open: boolean };

/**
 * This model keeps only original actions and scope facts. Every expected value
 * is obtained by folding the uncompressed log from the initial domain state.
 */
class SemanticOracle {
  readonly log: LogEntry[] = [];
  readonly scopes = new Map<string, Scope>();
  readonly attached = new Set<string>();

  attach(root: string) {
    this.attached.add(root);
  }
  begin(id: string, roots: readonly string[]) {
    this.scopes.set(id, {
      roots: new Set(roots),
      completed: new Set(),
      open: true,
    });
    for (const root of roots) this.attached.add(root);
  }
  dispatch(action: Action, transitionId?: string) {
    const heldRoots = transitionId
      ? new Set(this.scopes.get(transitionId)!.roots)
      : new Set<string>();
    this.log.push({ action, transitionId, heldRoots });
  }
  finish(id: string) {
    const scope = this.scopes.get(id);
    if (scope) scope.open = false;
  }
  publish(id: string, roots: readonly string[]) {
    const scope = this.scopes.get(id)!;
    for (const root of roots) {
      scope.completed.add(root);
      for (const entry of this.log) {
        if (entry.transitionId === id) entry.heldRoots.delete(root);
      }
    }
  }
  detach(root: string) {
    this.attached.delete(root);
    for (const [id, scope] of this.scopes) {
      if (scope.roots.delete(root)) scope.completed.add(root);
      for (const entry of this.log) {
        if (entry.transitionId === id) entry.heldRoots.delete(root);
      }
    }
  }
  project(root: string, included: readonly string[] = []): State {
    const lanes = new Set(included);
    let state = initial;
    for (const entry of this.log) {
      if (!entry.transitionId) {
        state = reduce(state, entry.action);
        continue;
      }
      const scope = this.scopes.get(entry.transitionId)!;
      if (
        lanes.has(entry.transitionId) ||
        (!scope.open && !entry.heldRoots.has(root))
      ) state = reduce(state, entry.action);
    }
    return state;
  }
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function same(actual: unknown, expected: unknown, message: string) {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}
function sameState(actual: State, expected: State, message: string) {
  const encode = (state: State) => JSON.stringify({
    optimistic: state.optimistic.map(({ id, payload }) => [id, payload]),
    confirmed: state.confirmed.map(({ id, payload }) => [id, payload]),
  });
  same(encode(actual), encode(expected), message);
}

Deno.test("operation-tagged optimistic action log matches independent projections", () => {
  const store = createAsyncStore<State, Action>(initial, reduce);
  const oracle = new SemanticOracle();
  const roots = ["left", "right", "late"];
  let step = 0;

  const check = (label: string) => {
    step++;
    const candidates = [[], ...[...oracle.scopes.keys()].map((id) => [id])];
    for (const root of roots) {
      for (const transitions of candidates) {
        sameState(
          store.getStateForRoot(root, { transitions }),
          oracle.project(root, transitions),
          `${label} step ${step}, root ${root}, lanes ${transitions.join(",") || "visible"}`,
        );
      }
    }
  };
  const attach = (root: string) => {
    store.beginRender(root);
    oracle.attach(root);
    check(`attach ${root}`);
  };
  const begin = (id: string, participants: string[]) => {
    store.beginTransition(id, participants);
    oracle.begin(id, participants);
    check(`begin ${id}`);
  };
  const dispatch = (action: Action, id?: string) => {
    const accepted = store.dispatch(
      action,
      id ? { kind: "transition", transitionId: id } : { kind: "urgent" },
    );
    oracle.dispatch(action, id);
    check(`${id ?? "urgent"} ${action.kind}`);
    return accepted;
  };
  const finish = (id: string) => {
    store.finishTransition(id);
    oracle.finish(id);
    check(`finish ${id}`);
  };
  const commit = (id: string, participants: string[], finishScope = false) => {
    store.commitTransitionRoots(id, participants, { finish: finishScope });
    oracle.publish(id, participants);
    if (finishScope) oracle.finish(id);
    check(`publish ${id}/${participants.join(",")}`);
  };
  const detach = (root: string) => {
    store.detachRoot(root);
    oracle.detach(root);
    check(`detach ${root}`);
  };

  attach("left");
  attach("right");

  // Compensation removes draft-a from the chronological head. Confirming it
  // is therefore a head no-op, but changes the still-held left projection.
  begin("compensate-a", ["left"]);
  assert(dispatch({ kind: "compensate", id: "draft-a" }, "compensate-a"), "compensation retained");
  assert(
    dispatch({ kind: "confirm", id: "draft-a" }),
    "head-equal urgent confirm must be retained when a held root changes",
  );
  sameState(store.getState(), oracle.project("left", ["compensate-a"]), "head projection");
  assert(!dispatch({ kind: "noop" }), "true no-op should be dropped");
  check("drop head and visible no-op");

  // Three independent scopes overlap. Finish and publish them out of start order.
  begin("scope-1", ["left"]);
  dispatch({ kind: "begin", operation: { id: "op-1", payload: "first" } }, "scope-1");
  begin("scope-2", ["left", "right"]);
  dispatch({ kind: "begin", operation: { id: "op-2", payload: "second" } }, "scope-2");
  begin("scope-3", ["right"]);
  dispatch({ kind: "begin", operation: { id: "op-3", payload: "third" } }, "scope-3");
  attach("late"); // Joined after the pending actions and holds were created.

  finish("scope-3");
  commit("scope-3", ["right"], true);
  finish("compensate-a");
  commit("compensate-a", ["left"], true);
  finish("scope-1");
  commit("scope-1", ["left"], true);
  finish("scope-2");
  commit("scope-2", ["left", "right"], true);
  check("out-of-order three-scope completion");

  detach("right");
  attach("right"); // A same-ID root begins from current semantic projection.
  check("same-ID root reattachment");

  for (const root of [...oracle.attached]) detach(root);
  const diagnostics = store.diagnostics();
  same(diagnostics.roots, 0, "root cleanup");
  same(diagnostics.listeners, 0, "listener cleanup");
  same(diagnostics.readers, 0, "reader cleanup");
  same(diagnostics.retainedActions, 0, "action compaction cleanup");
  same(diagnostics.transitions, 0, "scope compaction cleanup");
});

Deno.test("transaction pins exact Promise identities across multiple stores", () => {
  const first = Promise.resolve({ name: "first" });
  const second = Promise.resolve({ name: "second" });
  const nextFirst = Promise.resolve({ name: "next-first" });
  const nextSecond = Promise.resolve({ name: "next-second" });
  const a = createAsyncStore(first);
  const b = createAsyncStore(second);
  const pair = createStoreSelector([a, b], ([left, right]) => [left, right] as const);

  const candidate = new StoreRenderTransaction("promise-root");
  const pinned = candidate.read(pair, "pair");
  same(pinned[0], first, "first promise identity pinned");
  same(pinned[1], second, "second promise identity pinned");
  a.dispatch(nextFirst);
  b.dispatch(nextSecond);
  const repeated = candidate.read(pair, "pair");
  same(repeated[0], first, "first promise remains pinned after mutation");
  same(repeated[1], second, "second promise remains pinned after mutation");
  assert(!candidate.validate(), "both changed stores invalidate the candidate");
  candidate.discard();

  const retry = new StoreRenderTransaction("promise-root");
  const current = retry.read(pair, "pair");
  same(current[0], nextFirst, "retry returns exact new first promise");
  same(current[1], nextSecond, "retry returns exact new second promise");
  assert(retry.validate(), "retry validates against its pinned read set");
  retry.commitAfterValidatedRender();
  a.forgetReader("promise-root", "pair");
  b.forgetReader("promise-root", "pair");
  a.detachRoot("promise-root");
  b.detachRoot("promise-root");
  for (const [store, name] of [[a, "first store"], [b, "second store"]] as const) {
    same(store.diagnostics().roots, 0, `${name} root cleanup`);
    same(store.diagnostics().readers, 0, `${name} reader cleanup`);
    same(store.diagnostics().retainedActions, 0, `${name} action cleanup`);
  }
});

Deno.test("changing a selector source replaces that read site's previous history", () => {
  const a = createAsyncStore({ value: 4 });
  const b = createAsyncStore({ value: 9 });
  const seenA: unknown[] = [];
  const seenB: unknown[] = [];
  const selectA = a.select((state, previous) => {
    seenA.push(previous);
    return state.value * 2;
  });
  const selectB = b.select((state, previous) => {
    seenB.push(previous);
    return state.value * 3;
  });

  const first = new StoreRenderTransaction("selector-root");
  same(first.read(selectA, "changing-site"), 8, "initial selector value");
  assert(first.validate(), "initial selector validates");
  first.commitAfterValidatedRender();
  const switched = new StoreRenderTransaction("selector-root");
  same(switched.read(selectB, "changing-site"), 27, "replacement selector value");
  assert(switched.validate(), "replacement selector validates");
  const replacementFootprint = switched.readers.get("changing-site");
  assert(replacementFootprint?.has(b), "replacement footprint includes new source store");
  assert(!replacementFootprint?.has(a), "replacement footprint drops old source store");
  switched.commitAfterValidatedRender();

  same(seenA[0], undefined, "first source has no prior value");
  same(seenB[0], undefined, "changed source starts with no prior value");
  // The render owner reconciles old and new store footprints at publication;
  // the transaction reports the replacement footprint but does not own that
  // cross-candidate removal itself.
  a.forgetReader("selector-root", "changing-site");
  assert(a._readerValuesFor("selector-root", "changing-site").size === 0, "old store history removed with old footprint");
  assert(b._readerValuesFor("selector-root", "changing-site").has(selectB), "new source history committed");

  a.detachRoot("selector-root");
  b.forgetReader("selector-root", "changing-site");
  b.detachRoot("selector-root");
  same(a.diagnostics().roots, 0, "old source root cleanup");
  same(b.diagnostics().roots, 0, "new source root cleanup");
  same(b.diagnostics().readers, 0, "new source reader cleanup");
});
