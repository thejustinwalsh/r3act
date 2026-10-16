import {
  bindStatePropsAt,
  ComponentStateRoot,
  defineComponent,
  useEffectAt,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const equal = (actual: unknown, expected: unknown, message = "") => {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `${message}: expected ${String(expected)}, received ${String(actual)}`,
    );
  }
};
const textContent = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(textContent).join("");

const harness = (rootId?: string, world?: OwnerStateWorld) => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    ...(rootId ? { rootId } : {}),
    ...(world ? { world } : {}),
    scheduleCommit: () => {},
  });
  return { host, container, root };
};

Deno.test("prepare keeps host, effects, and committed owners private until phases run", () => {
  class CountingHost extends MemoryVDOMHost {
    writes = 0;
    override createElement(tag: string) {
      this.writes++;
      return super.createElement(tag);
    }
    override setProp(node: MemoryNode, name: string, value: unknown) {
      this.writes++;
      return super.setProp(node, name, value);
    }
  }
  const host = new CountingHost();
  const container = host.createContainer();
  const world = new OwnerStateWorld();
  const root = new ComponentStateRoot(host, container, {
    world,
    rootId: "candidate-private",
    scheduleCommit: () => {},
  });
  let effects = 0;
  let setter!: (value: number) => boolean;
  const Child = defineComponent("candidate-private-child", () => {
    const [value, set] = useStateAt("value", 4);
    setter = set;
    useEffectAt("effect", () => {
      effects++;
    });
    return jsx("span", {
      "data-value": bindStatePropsAt(["value"], ([n]) => n),
    }, String(value));
  });
  const beforeWrites = host.writes;
  const candidate = root.prepare(jsx(Child, {}));
  equal(host.writes, beforeWrites, "prepare wrote to host");
  equal(effects, 0, "prepare ran effect setup");
  equal(
    root.diagnostics().ownerCount,
    0,
    "private owner leaked into committed diagnostics",
  );
  assert(candidate.validate(), "fresh candidate should validate");
  candidate.commitHost();
  equal(effects, 0, "host phase ran effect setup");
  candidate.publish();
  equal(root.diagnostics().ownerCount, 1);
  equal(effects, 0, "publish ran effect setup");
  candidate.runEffects();
  equal(candidate.stores.size, 0, "finished candidate retained its store set");
  equal(effects, 1);
  equal(textContent(container.children[0]), "4");
  root.dispose();
});

Deno.test("independent candidates isolate new owners and stale after a sibling publishes", () => {
  const { root, container } = harness("candidate-overlap");
  let discardedSetter!: (value: number) => boolean;
  let publishedSetter!: (value: number) => boolean;
  const Item = defineComponent(
    "candidate-overlap-item",
    ({ value }: { value: number }) => {
      const [state, set] = useStateAt("state", value);
      if (value === 1) publishedSetter = set;
      else discardedSetter = set;
      return jsx("i", {}, String(state));
    },
  );
  const first = root.prepare(jsx(Item, { value: 1 }));
  const second = root.prepare(jsx(Item, { value: 2 }));
  assert(
    first.validate() && second.validate(),
    "overlapping candidates should coexist before publication",
  );
  first.commitHost();
  first.publish();
  first.runEffects();
  assert(
    !second.validate(),
    "candidate based on prior root revision must stale",
  );
  let staleRejected = false;
  try {
    second.commitHost();
  } catch {
    staleRejected = true;
  }
  assert(staleRejected, "stale candidate reached host commit");
  equal(textContent(container.children[0]), "1");
  assert(
    discardedSetter(3) === false,
    "stale candidate setter should be inert",
  );
  equal(publishedSetter(7), true);
  root.flush();
  equal(
    textContent(container.children[0]),
    "7",
    "published setter did not forward to live state",
  );
  root.dispose();
});

Deno.test("urgent numeric publication stales a candidate and direct binding flush remains live", () => {
  const { root, container } = harness("candidate-numeric");
  let set!: (value: number) => boolean;
  const Counter = defineComponent("candidate-numeric-counter", () => {
    const [value, update] = useStateAt("value", 2);
    if (!set) set = update;
    return jsx("output", {
      "data-value": bindStatePropsAt(["value"], ([n]) => n * 3),
    });
  }, { propOnlySites: ["value"] });
  root.mount(jsx(Counter, {}));
  const candidate = root.prepare(jsx(Counter, {}));
  equal(set(5), true);
  root.flush();
  assert(
    !candidate.validate(),
    "numeric-only urgent commit did not advance candidate base revision",
  );
  equal(container.children[0].props["data-value"], 15);
  set(8);
  root.flush();
  equal(
    container.children[0].props["data-value"],
    24,
    "direct binding source stopped after candidate work",
  );
  candidate.discard();
  root.dispose();
});

Deno.test("candidate store reads use the requested transition projection", () => {
  const { root, container } = harness("candidate-store");
  const store = createAsyncStore(
    1,
    (state: number, action: number) => state + action,
  );
  store.beginTransition("like", [root.rootId]);
  store.dispatch(10, { kind: "transition", transitionId: "like" });
  const Reader = defineComponent(
    "candidate-store-reader",
    () => jsx("b", {}, String(useStoreAt("value", store))),
  );
  const candidate = root.prepare(jsx(Reader, {}), { transitions: ["like"] });
  equal(
    container.children.length,
    0,
    "store candidate changed host during preparation",
  );
  candidate.commitHost();
  candidate.publish();
  candidate.runEffects();
  equal(textContent(container.children[0]), "11");
  root.dispose();
});

Deno.test("discarding one of several store candidates retains the other candidate root hold", () => {
  const { root } = harness("candidate-store-holds");
  const store = createAsyncStore(
    1,
    (state: number, action: number) => state + action,
  );
  const Reader = defineComponent(
    "candidate-store-holds-reader",
    () => jsx("span", {}, String(useStoreAt("value", store))),
  );
  const first = root.prepare(jsx(Reader, {}));
  const second = root.prepare(jsx(Reader, {}));
  equal(store.diagnostics().roots, 1);
  first.discard();
  equal(first.stores.size, 0, "discarded candidate retained its store set");
  equal(
    store.diagnostics().roots,
    1,
    "first discard detached another candidate's root",
  );
  second.discard();
  equal(
    store.diagnostics().roots,
    0,
    "last discarded candidate leaked its root hold",
  );
  root.dispose();
});

Deno.test("failed store preparation releases only its own root hold", () => {
  const { root } = harness("candidate-store-render-failure");
  const store = createAsyncStore(3);
  const Reader = defineComponent(
    "candidate-store-render-failure-reader",
    () => jsx("span", {}, String(useStoreAt("value", store))),
  );
  const Failing = defineComponent("candidate-store-render-failure-view", () => {
    useStoreAt("value", store);
    throw new Error("controlled candidate render failure");
  });
  const other = root.prepare(jsx(Reader, {}));
  let failed = false;
  try {
    root.prepare(jsx(Failing, {}));
  } catch {
    failed = true;
  }
  assert(failed, "controlled render failure did not throw");
  equal(
    store.diagnostics().roots,
    1,
    "failed candidate detached the still-pending candidate root",
  );
  other.discard();
  equal(store.diagnostics().roots, 0, "pending candidate root hold leaked");

  failed = false;
  try {
    root.prepare(jsx(Failing, {}));
  } catch {
    failed = true;
  }
  assert(failed, "controlled render failure without a peer did not throw");
  equal(
    store.diagnostics().roots,
    0,
    "failed candidate without a peer leaked its new store root",
  );
  root.dispose();
});

Deno.test("manual group phases expose both roots before either effect setup", () => {
  const world = new OwnerStateWorld();
  const a = harness("candidate-group-a", world);
  const b = harness("candidate-group-b", world);
  const observations: boolean[] = [];
  const Probe = defineComponent(
    "candidate-group-probe",
    ({ label }: { label: string }) => {
      useEffectAt("observe", () => {
        observations.push(
          a.container.children.length === 1 &&
            b.container.children.length === 1,
        );
      });
      return jsx("span", {}, label);
    },
  );
  const ca = a.root.prepare(jsx(Probe, { label: "a" }));
  const cb = b.root.prepare(jsx(Probe, { label: "b" }));
  ca.commitHost();
  cb.commitHost();
  ca.publish();
  cb.publish();
  ca.runEffects();
  cb.runEffects();
  assert(
    observations.length === 2 && observations.every(Boolean),
    "effects observed a partially published group",
  );
  a.root.dispose();
  b.root.dispose();
});

Deno.test("host failure is terminal for all candidates in a manual group", () => {
  class ThrowingHost extends MemoryVDOMHost {
    override createElement(_tag: string): MemoryNode {
      throw new Error("controlled host failure");
    }
  }
  const failedHost = new ThrowingHost();
  const failed = new ComponentStateRoot(
    failedHost,
    failedHost.createContainer(),
    { rootId: "candidate-host-fail", scheduleCommit: () => {} },
  );
  const other = harness("candidate-host-peer");
  const tree = jsx("div", {}, "candidate");
  const a = failed.prepare(tree);
  const b = other.root.prepare(tree);
  let error: unknown;
  try {
    a.commitHost();
  } catch (caught) {
    error = caught;
  }
  assert(error, "controlled host failure did not throw");
  a.failGroup(error);
  b.failGroup(error);
  let terminal = false;
  try {
    failed.prepare(tree);
  } catch {
    terminal = true;
  }
  assert(
    terminal,
    "failed host root was allowed to retry after partial mutation",
  );
  other.root.dispose();
  failed.dispose();
});

Deno.test("root disposal listeners fire once and can be removed", () => {
  const { root } = harness("candidate-dispose-listener");
  let first = 0;
  let second = 0;
  root.onDispose(() => first++);
  const remove = root.onDispose(() => second++);
  remove();
  root.dispose();
  root.dispose();
  equal(first, 1);
  equal(second, 0);
});

Deno.test("effect setup that disposes its root immediately cleans its returned resource", () => {
  const regular = harness("effect-dispose-regular");
  let regularCleanups = 0;
  const Regular = defineComponent("effect-dispose-regular-view", () => {
    useEffectAt("dispose", () => {
      regular.root.dispose();
      return () => regularCleanups++;
    });
    return jsx("div", {});
  });
  regular.root.mount(jsx(Regular, {}));
  equal(
    regularCleanups,
    1,
    "ordinary full render leaked setup resource after synchronous dispose",
  );

  const candidateRoot = harness("effect-dispose-candidate");
  let candidateCleanups = 0;
  const Candidate = defineComponent("effect-dispose-candidate-view", () => {
    useEffectAt("dispose", () => {
      candidateRoot.root.dispose();
      return () => candidateCleanups++;
    });
    return jsx("div", {});
  });
  const candidate = candidateRoot.root.prepare(jsx(Candidate, {}));
  candidate.commitHost();
  candidate.publish();
  candidate.runEffects();
  equal(
    candidateCleanups,
    1,
    "candidate effect resource leaked after synchronous dispose",
  );
});

Deno.test("candidate publication barrier defers store-listener flush until effects finish", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const scheduled: Array<() => void> = [];
  const root = new ComponentStateRoot(host, container, {
    rootId: "candidate-publication-barrier",
    scheduleCommit: (commit) => scheduled.push(commit),
  });
  const store = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  const events: string[] = [];
  const View = defineComponent(
    "candidate-publication-barrier-view",
    ({ label }: { label: string }) => {
      const value = useStoreAt("value", store);
      useEffectAt(label, () => {
        events.push(`setup:${label}`);
        return () => events.push(`cleanup:${label}`);
      });
      return jsx("span", {}, `${label}:${value}`);
    },
  );
  root.mount(jsx(View, { label: "old" }));
  const flushResults: boolean[] = [];
  const unsubscribe = store.subscribe(root.rootId, () => {
    flushResults.push(root.flush());
    let updateBlocked = false;
    try {
      root.update(jsx(View, { label: "listener-update" }));
    } catch {
      updateBlocked = true;
    }
    assert(
      updateBlocked,
      "update was allowed during candidate publication barrier",
    );
  });

  const candidate = root.prepare(jsx(View, { label: "new" }));
  candidate.commitHost();
  candidate.publish();
  store.dispatch(1);
  equal(flushResults.length, 1);
  equal(
    flushResults[0],
    false,
    "store listener committed while candidate effects were pending",
  );
  equal(
    events.join(","),
    "setup:old",
    "old effects changed before lifecycle phase",
  );

  candidate.runEffects();
  equal(events.join(","), "setup:old,cleanup:old,setup:new");
  assert(
    scheduled.length > 0,
    "deferred work was lost when the barrier released",
  );
  while (scheduled.length) scheduled.shift()?.();
  equal(textContent(container.children[0]), "new:1");
  equal(
    events.join(","),
    "setup:old,cleanup:old,setup:new",
    "obsolete effects were reactivated by deferred flush",
  );
  unsubscribe();
  root.dispose();
});

Deno.test("host callbacks cannot reenter root commits during candidate host mutation", () => {
  class ReentrantHost extends MemoryVDOMHost {
    onProp?: (name: string, value: unknown) => void;
    override setProp(node: MemoryNode, name: string, value: unknown) {
      super.setProp(node, name, value);
      this.onProp?.(name, value);
    }
  }
  const host = new ReentrantHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "candidate-host-reentrant",
    scheduleCommit: (commit) => commit(),
  });
  let set!: (value: number) => boolean;
  const Counter = defineComponent(
    "candidate-host-reentrant-counter",
    ({ label }: { label: string }) => {
      const [value, update] = useStateAt("value", 0);
      set = update;
      return jsx("output", { "data-label": label }, String(value));
    },
  );
  root.mount(jsx(Counter, { label: "old" }));
  let flushResult: boolean | undefined;
  let updateBlocked = false;
  host.onProp = (name, value) => {
    if (name !== "data-label" || value !== "new") return;
    set(1);
    flushResult = root.flush();
    try {
      root.update(jsx(Counter, { label: "nested" }));
    } catch {
      updateBlocked = true;
    }
  };
  const candidate = root.prepare(jsx(Counter, { label: "new" }));
  candidate.commitHost();
  equal(
    flushResult,
    false,
    "host callback flushed during candidate host mutation",
  );
  assert(
    updateBlocked,
    "host callback synchronously updated the root during candidate host mutation",
  );
  let terminal = false;
  try {
    candidate.publish();
  } catch {
    terminal = true;
  }
  assert(
    terminal,
    "host callback's urgent state write was silently dropped during publication",
  );
  let rootRejected = false;
  try {
    root.update(jsx(Counter, { label: "retry" }));
  } catch {
    rootRejected = true;
  }
  assert(rootRejected, "root accepted a retry after host state became partial");
  root.dispose();
});
