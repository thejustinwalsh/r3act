import { createAsyncStore } from "./async_store_runtime.ts";

type Action =
  | { kind: "add"; amount: number }
  | { kind: "set"; value: number };

type OracleEntry = {
  action: Action;
  transitionId?: string;
  /** Roots that had not published/released this action when it was dispatched. */
  heldRoots: Set<string>;
};

type OracleTransition = {
  roots: Set<string>;
  completedRoots: Set<string>;
  open: boolean;
};

function reduce(state: number, action: Action): number {
  return action.kind === "add" ? state + action.amount : action.value;
}

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

/**
 * Deliberately small reference model: fold every retained semantic action in
 * chronological order. It has no cached head states, compacted base, root
 * versions, notifications, or runtime entry objects.
 */
class ProjectionOracle {
  readonly entries: OracleEntry[] = [];
  readonly transitions = new Map<string, OracleTransition>();
  readonly knownRoots = new Set<string>();
  head: number;

  constructor(readonly initial: number) {
    this.head = initial;
  }

  attach(rootId: string): void {
    this.knownRoots.add(rootId);
  }

  beginTransition(transitionId: string, roots: readonly string[]): void {
    this.transitions.set(transitionId, {
      roots: new Set(roots),
      completedRoots: new Set(),
      open: true,
    });
    for (const rootId of roots) this.knownRoots.add(rootId);
  }

  dispatch(action: Action, transitionId?: string): void {
    const heldRoots = transitionId
      ? new Set(this.transitions.get(transitionId)!.roots)
      : new Set<string>();
    this.entries.push({ action, transitionId, heldRoots });
    this.head = reduce(this.head, action);
  }

  finish(transitionId: string): void {
    const transition = this.transitions.get(transitionId);
    if (transition) transition.open = false;
  }

  publish(transitionId: string, roots: readonly string[]): void {
    const transition = this.transitions.get(transitionId)!;
    for (const entry of this.entries) {
      if (entry.transitionId !== transitionId) continue;
      for (const rootId of roots) entry.heldRoots.delete(rootId);
    }
    for (const rootId of roots) transition.completedRoots.add(rootId);
  }

  release(transitionId: string, rootId: string): void {
    const transition = this.transitions.get(transitionId)!;
    transition.roots.delete(rootId);
    transition.completedRoots.add(rootId);
    for (const entry of this.entries) {
      if (entry.transitionId === transitionId) entry.heldRoots.delete(rootId);
    }
  }

  detach(rootId: string): void {
    this.knownRoots.delete(rootId);
    for (const [transitionId, transition] of this.transitions) {
      transition.roots.delete(rootId);
      transition.completedRoots.add(rootId);
      for (const entry of this.entries) {
        if (entry.transitionId === transitionId) {
          entry.heldRoots.delete(rootId);
        }
      }
    }
  }

  /** Scopes that can still affect a visible or candidate projection. */
  selectableTransitionIds(): string[] {
    return [...this.transitions]
      .filter(([id, transition]) =>
        transition.open || this.entries.some((entry) =>
          entry.transitionId === id && entry.heldRoots.size > 0
        ) || [...transition.roots].some((rootId) =>
          !transition.completedRoots.has(rootId)
        )
      )
      .map(([id]) => id);
  }

  /** A valid mutation scope is known from the model, never runtime probing. */
  mutationRoots(transitionId: string): string[] {
    const transition = this.transitions.get(transitionId)!;
    return [...transition.roots].filter((rootId) =>
      !transition.completedRoots.has(rootId)
    );
  }

  project(rootId: string, includedTransitions: readonly string[] = []): number {
    const included = new Set(includedTransitions);
    let state = this.initial;
    for (const entry of this.entries) {
      if (!entry.transitionId) {
        state = reduce(state, entry.action);
        continue;
      }
      const transition = this.transitions.get(entry.transitionId);
      const explicitlyIncluded = included.has(entry.transitionId);
      const pendingScopeStillOpen = transition?.open === true;
      const thisRootStillHeld = entry.heldRoots.has(rootId);
      // A candidate can see its own lane. Otherwise the action becomes
      // globally available after its scope closes, unless this root still
      // holds that particular action for an unfinished commit.
      if (explicitlyIncluded || (!pendingScopeStillOpen && !thisRootStillHeld)) {
        state = reduce(state, entry.action);
      }
    }
    return state;
  }
}

class ProjectionHarness {
  readonly store = createAsyncStore<number, Action>(0, reduce);
  readonly oracle = new ProjectionOracle(0);
  readonly rootIds = ["left", "right", "third", "late"];
  #step = 0;
  pairCoverageSteps = 0;

  attach(rootId: string, label: string): void {
    const snapshot = this.store.beginRender(rootId);
    this.oracle.attach(rootId);
    equal(snapshot.state, this.oracle.project(rootId), `${label}: initial pinned read`);
    this.check(label);
  }

  beginTransition(transitionId: string, roots: readonly string[], label: string): void {
    this.store.beginTransition(transitionId, roots);
    this.oracle.beginTransition(transitionId, roots);
    this.check(label);
  }

  dispatch(action: Action, transitionId: string | undefined, label: string): boolean {
    const accepted = this.store.dispatch(
      action,
      transitionId
        ? { kind: "transition", transitionId }
        : { kind: "urgent" },
    );
    this.oracle.dispatch(action, transitionId);
    this.check(label);
    return accepted;
  }

  finish(transitionId: string, label: string): void {
    this.store.finishTransition(transitionId);
    this.oracle.finish(transitionId);
    this.check(label);
  }

  commit(
    transitionId: string,
    roots: readonly string[],
    finish: boolean,
    label: string,
  ): void {
    this.store.commitTransitionRoots(transitionId, roots, { finish });
    this.oracle.publish(transitionId, roots);
    if (finish) this.oracle.finish(transitionId);
    this.check(label);
  }

  release(transitionId: string, rootId: string, label: string): void {
    this.store.releaseTransition(transitionId, rootId);
    this.oracle.release(transitionId, rootId);
    this.check(label);
  }

  detach(rootId: string, label: string): void {
    this.store.detachRoot(rootId);
    this.oracle.detach(rootId);
    this.check(label);
  }

  check(label: string): void {
    this.#step++;
    const context = `${label} (step ${this.#step})`;
    equal(this.store.getState(), this.oracle.head, `${context}: chronological head`);

    const activeIds = this.oracle.selectableTransitionIds();
    const laneSets: string[][] = [[]];
    if (activeIds.length <= 5) {
      for (let mask = 1; mask < (1 << activeIds.length); mask++) {
        laneSets.push(activeIds.filter((_, index) => (mask & (1 << index)) !== 0));
      }
    } else {
      this.pairCoverageSteps++;
      for (const id of activeIds) laneSets.push([id]);
      for (let left = 0; left < activeIds.length; left++) {
        for (let right = left + 1; right < activeIds.length; right++) {
          laneSets.push([activeIds[left], activeIds[right]]);
        }
      }
      laneSets.push(activeIds);
    }

    for (const rootId of this.rootIds) {
      for (const transitions of laneSets) {
        const expected = this.oracle.project(rootId, transitions);
        equal(
          this.store.getStateForRoot(rootId, { transitions }),
          expected,
          `${context}: root ${rootId}, lanes ${transitions.join(",") || "visible"}`,
        );
        if (this.oracle.knownRoots.has(rootId)) {
          const snapshot = this.store.beginRender(rootId, { transitions });
          equal(
            snapshot.state,
            expected,
            `${context}: pinned root ${rootId}, lanes ${transitions.join(",") || "visible"}`,
          );
        }
      }
    }
  }

  cleanup(label: string): void {
    for (const [transitionId, transition] of this.oracle.transitions) {
      const participants = this.oracle.mutationRoots(transitionId);
      const stillSelectable = this.oracle.selectableTransitionIds().includes(transitionId);
      if (stillSelectable) {
        if (participants.length > 0) {
          this.commit(transitionId, participants, false, `${label}: publish ${transitionId}`);
        }
        this.finish(transitionId, `${label}: finish ${transitionId}`);
      }
    }
    for (const rootId of [...this.oracle.knownRoots]) {
      this.detach(rootId, `${label}: detach ${rootId}`);
    }
    this.check(`${label}: final cleanup`);
    const diagnostics = this.store.diagnostics();
    equal(diagnostics.roots, 0, `${label}: leaked roots`);
    equal(diagnostics.listeners, 0, `${label}: leaked listeners`);
    equal(diagnostics.readers, 0, `${label}: leaked readers`);
    equal(diagnostics.retainedActions, 0, `${label}: retained actions after compaction`);
    equal(diagnostics.transitions, 0, `${label}: retained transitions after compaction`);
  }
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

Deno.test("seeded root projections match a chronological log oracle", () => {
  const harness = new ProjectionHarness();
  harness.attach("left", "attach left");
  harness.attach("right", "attach right");

  // Force the semantic corner cases before the seeded operation streams.
  harness.beginTransition("held-head", ["left", "right"], "begin head hold");
  harness.dispatch({ kind: "set", value: 5 }, "held-head", "dispatch held head action");
  assert(
    harness.dispatch({ kind: "set", value: 5 }, undefined, "urgent head-equal replacement"),
    "head-equal urgent replacement must be retained because visible roots change",
  );

  harness.beginTransition("older", ["left"], "begin older lane");
  harness.dispatch({ kind: "add", amount: 2 }, "older", "dispatch older lane");
  harness.beginTransition("newer", ["right"], "begin newer lane");
  harness.dispatch({ kind: "set", value: 11 }, "newer", "dispatch newer lane");
  harness.commit("newer", ["right"], true, "complete newer before older");
  harness.finish("older", "finish older lane");
  harness.commit("older", ["left"], true, "publish older lane");

  harness.beginTransition("released", ["left"], "begin releasable lane");
  harness.dispatch({ kind: "add", amount: 3 }, "released", "dispatch releasable lane");
  harness.release("released", "left", "release held root");
  harness.finish("released", "finish released scope");
  harness.detach("right", "detach and compact right root");
  harness.attach("right", "reattach same root ID");

  // Exercise the bounded pair-coverage branch with six simultaneous scopes.
  const pairScopes = Array.from({ length: 5 }, (_, index) => `pair-${index}`);
  for (const [index, transitionId] of pairScopes.entries()) {
    harness.beginTransition(transitionId, ["left"], `begin ${transitionId}`);
    harness.dispatch(
      { kind: "add", amount: index + 1 },
      transitionId,
      `dispatch ${transitionId}`,
    );
  }
  for (const transitionId of pairScopes) {
    harness.finish(transitionId, `finish ${transitionId}`);
    harness.commit(transitionId, ["left"], false, `publish ${transitionId}`);
  }

  const rootIds = ["left", "right", "third", "late"];
  for (const seed of [0x1234_5678, 0xdecafbad, 0x0bad_f00d]) {
    const random = seededRandom(seed);
    let transitionSerial = 0;
    const prefix = `seed ${seed.toString(16)}`;
    for (let step = 0; step < 180; step++) {
      const open = [...harness.oracle.transitions]
        .filter(([, transition]) => transition.open)
        .map(([id]) => id);
      const participantPairs = harness.oracle.selectableTransitionIds().flatMap((id) =>
        harness.oracle.mutationRoots(id).map((rootId) => [id, rootId] as const)
      );
      const choice = Math.floor(random() * 9);
      const label = `${prefix}, op ${step}`;

      if (choice === 0 || (choice === 1 && open.length === 0)) {
        const rootId = rootIds[Math.floor(random() * rootIds.length)];
        harness.attach(rootId, `${label}: attach ${rootId}`);
      } else if (choice === 1 && harness.oracle.selectableTransitionIds().length < 7) {
        const roots = rootIds.filter(() => random() < 0.5);
        if (roots.length === 0) roots.push(rootIds[Math.floor(random() * rootIds.length)]);
        const id = `${prefix}-t${transitionSerial++}`;
        harness.beginTransition(id, roots, `${label}: begin ${id}`);
      } else if (choice === 2 || choice === 3) {
        const transitionId = choice === 3 && open.length > 0
          ? open[Math.floor(random() * open.length)]
          : undefined;
        const action: Action = random() < 0.45
          ? { kind: "add", amount: Math.floor(random() * 7) - 3 }
          : { kind: "set", value: Math.floor(random() * 25) - 8 };
        harness.dispatch(action, transitionId, `${label}: dispatch`);
      } else if (choice === 4 && open.length > 0) {
        const id = open[Math.floor(random() * open.length)];
        harness.finish(id, `${label}: finish ${id}`);
      } else if ((choice === 1 || choice === 5) && participantPairs.length > 0) {
        const [id, rootId] = participantPairs[Math.floor(random() * participantPairs.length)];
        const finish = random() < 0.25;
        harness.commit(id, [rootId], finish, `${label}: commit ${id}/${rootId}`);
      } else if (choice === 6 && participantPairs.length > 0) {
        const [id, rootId] = participantPairs[Math.floor(random() * participantPairs.length)];
        harness.release(id, rootId, `${label}: release ${id}/${rootId}`);
      } else if (choice === 7) {
        const known = [...harness.oracle.knownRoots];
        if (known.length > 0) {
          const rootId = known[Math.floor(random() * known.length)];
          harness.detach(rootId, `${label}: detach ${rootId}`);
        } else {
          harness.attach(rootIds[Math.floor(random() * rootIds.length)], `${label}: attach fallback`);
        }
      } else {
        const rootId = rootIds[Math.floor(random() * rootIds.length)];
        harness.attach(rootId, `${label}: reattach ${rootId}`);
      }
    }
    harness.cleanup(prefix);
  }
  assert(
    harness.pairCoverageSteps > 0,
    "seeded traces never exercised pair coverage above five active scopes",
  );
});
