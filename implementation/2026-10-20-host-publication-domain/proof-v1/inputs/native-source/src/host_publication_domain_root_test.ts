import {
  ComponentStateRoot,
  defineComponent,
  useStateAt,
} from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const equal = (actual: unknown, expected: unknown, message: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
};
const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");
const drain = async () => {
  for (let index = 0; index < 4; index++) await Promise.resolve();
};

Deno.test("one host serializes reentrant direct update before another root body or write", async () => {
  const host = new MemoryVDOMHost();
  const otherHost = new MemoryVDOMHost();
  const aContainer = host.createContainer();
  const bContainer = host.createContainer();
  const cContainer = otherHost.createContainer();
  let a!: ComponentStateRoot<MemoryNode, MemoryNode>;
  let b!: ComponentStateRoot<MemoryNode, MemoryNode>;
  let c!: ComponentStateRoot<MemoryNode, MemoryNode>;
  let bRenders = 0;
  let nestedWrites = 0;
  let writerDepth = 0;
  let callbackRan = false;
  const B = defineComponent<{ value: string }>("host-domain-direct-b", ({ value }) => {
    bRenders++;
    return jsx("output", { "data-value": value }, value);
  });
  const treeA = (step: number) => jsx("output", { "data-step": step }, `a:${step}`);
  const treeB = (value: string) => jsx(B, { value });
  const original = host.setProp.bind(host);
  host.setProp = (node, name, value, previous) => {
    writerDepth++;
    if (writerDepth > 1) nestedWrites++;
    try {
      original(node, name, value, previous);
      if (!callbackRan && name === "data-step" && value === 1) {
        callbackRan = true;
        const before = b.publicationVersion;
        b.update(treeB("next"));
        equal(bRenders, 1, "busy direct update ran an opaque body");
        equal(b.publicationVersion, before, "busy direct update published reentrantly");
        equal(text(bContainer.children[0]), "initial", "busy direct update wrote the host");
        c.update(jsx("output", { "data-value": "independent" }, "independent"));
        equal(text(cContainer.children[0]), "independent", "distinct host did not progress");
      }
    } finally {
      writerDepth--;
    }
  };
  try {
    a = new ComponentStateRoot(host, aContainer, { rootId: "host-domain-direct-a", scheduleCommit() {} });
    b = new ComponentStateRoot(host, bContainer, { rootId: "host-domain-direct-b", scheduleCommit() {} });
    c = new ComponentStateRoot(otherHost, cContainer, { rootId: "host-domain-direct-c", scheduleCommit() {} });
    a.mount(treeA(0));
    b.mount(treeB("initial"));
    c.mount(jsx("output", { "data-value": "initial" }, "initial"));
    a.update(treeA(1));
    await drain();
    assert(callbackRan, "host writer did not exercise reentry");
    equal(nestedWrites, 0, "same host nested a second writer");
    equal(bRenders, 2, "deferred direct update did not render once after release");
    equal(text(bContainer.children[0]), "next", "deferred direct update was lost");
    equal(text(aContainer.children[0]), "a:1", "outer update was lost");
  } finally {
    a?.dispose();
    b?.dispose();
    c?.dispose();
  }
});

Deno.test("busy host defers direct mount and flush before authored bodies", async () => {
  const host = new MemoryVDOMHost();
  const aContainer = host.createContainer();
  const bContainer = host.createContainer();
  const cContainer = host.createContainer();
  let bodyCalls = 0;
  let setLocal!: (value: number) => boolean;
  const MountBody = defineComponent("host-domain-mount-body", () => {
    bodyCalls++;
    return jsx("i", {}, "mounted");
  });
  const Counter = defineComponent("host-domain-flush-body", () => {
    bodyCalls++;
    const [value, set] = useStateAt("value", 0);
    setLocal = set;
    return jsx("b", {}, String(value));
  });
  const a = new ComponentStateRoot(host, aContainer, { rootId: "host-domain-mount-a", scheduleCommit() {} });
  const b = new ComponentStateRoot(host, bContainer, { rootId: "host-domain-mount-b", scheduleCommit() {} });
  const c = new ComponentStateRoot(host, cContainer, { rootId: "host-domain-flush-c", scheduleCommit() {} });
  let invoked = false;
  const original = host.setProp.bind(host);
  host.setProp = (node, name, value, previous) => {
    original(node, name, value, previous);
    if (!invoked && name === "data-step" && value === 1) {
      invoked = true;
      const before = bodyCalls;
      b.mount(jsx(MountBody, {}));
      setLocal(1);
      c.flush();
      equal(bodyCalls, before, "busy mount/flush invoked authored body");
      equal(bContainer.children.length, 0, "busy mount wrote host");
      equal(text(cContainer.children[0]), "0", "busy flush wrote host");
    }
  };
  try {
    a.mount(jsx("output", { "data-step": 0 }, "a"));
    c.mount(jsx(Counter, {}));
    a.update(jsx("output", { "data-step": 1 }, "a"));
    await drain();
    assert(invoked, "writer did not exercise busy mount/flush");
    equal(text(bContainer.children[0]), "mounted", "deferred mount did not complete");
    equal(text(cContainer.children[0]), "1", "deferred flush lost accepted state");
  } finally {
    a.dispose();
    b.dispose();
    c.dispose();
  }
});

Deno.test("one host failure quarantines sibling roots while a fresh host remains usable", () => {
  const host = new MemoryVDOMHost();
  const aContainer = host.createContainer();
  const bContainer = host.createContainer();
  const a = new ComponentStateRoot(host, aContainer, { rootId: "host-domain-failure-a", scheduleCommit() {} });
  const b = new ComponentStateRoot(host, bContainer, { rootId: "host-domain-failure-b", scheduleCommit() {} });
  const tree = (value: string) => jsx("output", { "data-value": value }, value);
  const failure = new Error("host-domain-injected-failure");
  const original = host.setProp.bind(host);
  try {
    a.mount(tree("a0"));
    b.mount(tree("b0"));
    const before = [a.publicationVersion, b.publicationVersion];
    const snapshots = [JSON.stringify(a.snapshot), JSON.stringify(b.snapshot)];
    host.setProp = (node, name, value, previous) => {
      original(node, name, value, previous);
      if (name === "data-value" && value === "a1") throw failure;
    };
    let caught: unknown;
    try { a.update(tree("a1")); } catch (error) { caught = error; }
    assert(caught === failure || caught instanceof AggregateError,
      "host writer's original failure was lost");
    equal(a.publicationVersion, before[0], "failed root accepted partial host write");
    equal(b.publicationVersion, before[1], "sibling accepted a failed host domain");
    equal(JSON.stringify(a.snapshot), snapshots[0], "failed root changed accepted snapshot");
    equal(JSON.stringify(b.snapshot), snapshots[1], "sibling changed accepted snapshot");
    let siblingError: unknown;
    try { b.update(tree("b1")); } catch (error) { siblingError = error; }
    assert(siblingError instanceof Error && /terminal|failure|quarantin/i.test(siblingError.message),
      "sibling published after same-host failure");
  } finally {
    a.dispose();
    b.dispose();
  }
  const fresh = new MemoryVDOMHost();
  const container = fresh.createContainer();
  const recovered = new ComponentStateRoot(fresh, container, { rootId: "host-domain-fresh", scheduleCommit() {} });
  try {
    recovered.mount(tree("fresh"));
    recovered.update(tree("recovered"));
    equal(text(container.children[0]), "recovered", "fresh-host recovery failed");
  } finally {
    recovered.dispose();
  }
});

Deno.test("paused standalone candidate holds the shared host until publication wakes queued work", async () => {
  const host = new MemoryVDOMHost();
  const aContainer = host.createContainer();
  const bContainer = host.createContainer();
  const a = new ComponentStateRoot(host, aContainer, {
    rootId: "host-domain-paused-a", renderPreparation: "repeatable", scheduleCommit() {},
  });
  const b = new ComponentStateRoot(host, bContainer, {
    rootId: "host-domain-paused-b", renderPreparation: "repeatable", scheduleCommit() {},
  });
  const queue = new NativeRootWorkQueue();
  let bodies = 0;
  const B = defineComponent<{ value: string }>("host-domain-paused-body", ({ value }) => {
    bodies++;
    return jsx("output", {}, value);
  });
  const aTree = jsx("output", { "data-id": "a" }, "a");
  let candidate: ReturnType<typeof a.prepare> | undefined;
  try {
    a.mount(aTree);
    b.mount(jsx(B, { value: "initial" }));
    const abandoned = a.prepare(aTree);
    abandoned.discard();
    candidate = a.prepare(aTree);
    assert(candidate.validate(), "standalone candidate became stale before application");
    candidate.commitHost();
    const version = b.publicationVersion;
    const work = queue.enqueue({
      id: "host-domain-wait-for-standalone", renderPreparation: "repeatable",
      roots: [{ root: b, tree: jsx(B, { value: "later" }) }],
    });
    equal(work.status, "pending", "paused candidate did not hold the host");
    equal(bodies, 1, "busy queue prepared an opaque component");
    equal(b.publicationVersion, version, "busy queue published before release");
    equal(text(bContainer.children[0]), "initial", "busy queue wrote the host");
    assert(candidate.validatePostHost(), "standalone candidate lost its held read cut");
    candidate.preparePublication();
    candidate.publish();
    candidate.installSubscriptions();
    candidate.runEffects();
    candidate = undefined;
    await drain();
    equal(work.status, "committed", "publication did not wake waiting work");
    equal(bodies, 2, "waiting work did not render exactly once");
    equal(text(bContainer.children[0]), "later", "waiting work output missing");
    equal(b.publicationVersion, version + 1, "waiting work accepted more than once");
  } finally {
    if (candidate) candidate.failGroup(new Error("paused candidate cleanup"));
    queue.dispose();
    a.dispose();
    b.dispose();
  }
});

Deno.test("dispose revokes a busy root immediately and defers physical teardown", async () => {
  const host = new MemoryVDOMHost();
  const aContainer = host.createContainer();
  const bContainer = host.createContainer();
  const a = new ComponentStateRoot(host, aContainer, {
    rootId: "host-domain-dispose-a", renderPreparation: "repeatable", scheduleCommit() {},
  });
  const b = new ComponentStateRoot(host, bContainer, {
    rootId: "host-domain-dispose-b", renderPreparation: "repeatable", scheduleCommit() {},
  });
  let candidate: ReturnType<typeof a.prepare> | undefined;
  let doomed: ReturnType<typeof b.prepare> | undefined;
  try {
    const aTree = jsx("output", {}, "a");
    a.mount(aTree);
    b.mount(jsx("output", {}, "b"));
    doomed = b.prepare(jsx("output", {}, "next"));
    assert(doomed.validate(), "sibling candidate was stale before disposal");
    candidate = a.prepare(aTree);
    candidate.commitHost();
    b.dispose();
    assert(bContainer.children.length > 0, "busy dispose physically removed the sibling early");
    assert(!doomed.validate(), "busy disposal left a prepared sibling eligible");
    doomed.discard();
    doomed = undefined;
    let rejected = false;
    try { b.update(jsx("output", {}, "late")); } catch (error) {
      rejected = error instanceof Error && /disposed|pending/i.test(error.message);
    }
    assert(rejected, "busy disposal did not revoke publication eligibility");
    assert(candidate.validatePostHost(), "standalone candidate lost its held read cut");
    candidate.preparePublication();
    candidate.publish();
    candidate.installSubscriptions();
    candidate.runEffects();
    candidate = undefined;
    await drain();
    equal(bContainer.children.length, 0, "deferred teardown did not run after release");
  } finally {
    doomed?.discard();
    if (candidate) candidate.failGroup(new Error("paused candidate cleanup"));
    a.dispose();
    b.dispose();
  }
});

Deno.test("host contention arising in final work validation suspends without quarantine", async () => {
  const host = new MemoryVDOMHost();
  const aContainer = host.createContainer();
  const bContainer = host.createContainer();
  const a = new ComponentStateRoot(host, aContainer, {
    rootId: "host-domain-validation-a", renderPreparation: "repeatable", scheduleCommit() {},
  });
  const b = new ComponentStateRoot(host, bContainer, {
    rootId: "host-domain-validation-b", renderPreparation: "repeatable", scheduleCommit() {},
  });
  const queue = new NativeRootWorkQueue();
  const aTree = (value: string) => jsx("output", { "data-value": value }, value);
  let held: ReturnType<typeof b.prepare> | undefined;
  let validations = 0;
  try {
    a.mount(aTree("a0"));
    b.mount(aTree("b0"));
    const before = a.publicationVersion;
    const work = queue.enqueue({
      id: "host-domain-validation-contention", renderPreparation: "repeatable",
      roots: [{ root: a, tree: aTree("a1") }],
      validateWork() {
        validations++;
        if (!held && validations === 1) {
          held = b.prepare(aTree("b0"));
          held.commitHost();
        }
        return true;
      },
    });
    equal(work.status, "pending", "late host contention failed work");
    equal(a.publicationVersion, before, "late contention published a prepared cut");
    equal(text(aContainer.children[0]), "a0", "late contention wrote host");
    assert(held?.validatePostHost(), "held validation candidate became stale");
    held?.preparePublication();
    held?.publish();
    held?.installSubscriptions();
    held?.runEffects();
    held = undefined;
    await drain();
    equal(work.status, "committed", "late contention did not retry after release");
    equal(a.publicationVersion, before + 1, "retry published wrong accepted frontier");
    equal(text(aContainer.children[0]), "a1", "retried output missing");
    assert(validations >= 2, "candidate was not rebuilt after contention");
  } finally {
    if (held) held.failGroup(new Error("held candidate cleanup"));
    queue.dispose();
    a.dispose();
    b.dispose();
  }
});

Deno.test("failed physical teardown quarantines the shared host while allowing sibling cleanup", () => {
  const failure = new Error("host-domain-remove-after-mutation");
  let removals = 0;
  class ThrowingHost extends MemoryVDOMHost {
    override remove(parent: MemoryNode, node: MemoryNode) {
      super.remove(parent, node);
      if (node.props["data-id"] === "first") {
        removals++;
        throw failure;
      }
    }
  }
  const host = new ThrowingHost();
  const firstContainer = host.createContainer();
  const secondContainer = host.createContainer();
  const first = new ComponentStateRoot(host, firstContainer, {
    rootId: "host-domain-teardown-first", scheduleCommit() {},
  });
  const second = new ComponentStateRoot(host, secondContainer, {
    rootId: "host-domain-teardown-second", scheduleCommit() {},
  });
  const tree = (id: string) => jsx("output", { "data-id": id }, id);
  const includes = (error: unknown, target: unknown): boolean =>
    error === target || error instanceof AggregateError &&
      error.errors.some((part) => includes(part, target));
  try {
    first.mount(tree("first"));
    second.mount(tree("second"));
    const accepted = second.publicationVersion;
    const snapshot = JSON.stringify(second.snapshot);
    let caught: unknown;
    try { first.dispose(); } catch (error) { caught = error; }
    assert(includes(caught, failure), "physical teardown lost the original host error");
    equal(removals, 1, "failing removal did not mutate exactly once");
    equal(firstContainer.children.length, 0, "failing removal had no physical mutation");
    let siblingFailure: unknown;
    try { second.update(tree("changed")); } catch (error) { siblingFailure = error; }
    assert(siblingFailure instanceof Error && /terminal|failure|quarantin/i.test(siblingFailure.message),
      "sibling wrote into host after failed physical teardown");
    equal(second.publicationVersion, accepted, "sibling accepted after teardown failure");
    equal(JSON.stringify(second.snapshot), snapshot, "sibling snapshot advanced after teardown failure");
    second.dispose();
    equal(secondContainer.children.length, 0, "quarantined host prevented explicit sibling cleanup");
  } finally {
    try { first.dispose(); } catch { /* original failure asserted above */ }
    second.dispose();
  }
  const fresh = new MemoryVDOMHost();
  const container = fresh.createContainer();
  const recovered = new ComponentStateRoot(fresh, container, {
    rootId: "host-domain-teardown-recovery", scheduleCommit() {},
  });
  try {
    recovered.mount(tree("new"));
    recovered.update(tree("healthy"));
    equal(text(container.children[0]), "healthy", "fresh host failed after old teardown quarantine");
  } finally {
    recovered.dispose();
  }
});

Deno.test("host contention created by an earlier group preparation defers the next opaque entry", async () => {
  const firstHost = new MemoryVDOMHost();
  const sharedHost = new MemoryVDOMHost();
  const aContainer = firstHost.createContainer();
  const bContainer = sharedHost.createContainer();
  const cContainer = sharedHost.createContainer();
  const a = new ComponentStateRoot(firstHost, aContainer, {
    rootId: "host-domain-between-a", renderPreparation: "repeatable", scheduleCommit() {},
  });
  const b = new ComponentStateRoot(sharedHost, bContainer, {
    rootId: "host-domain-between-b", renderPreparation: "repeatable", scheduleCommit() {},
  });
  const c = new ComponentStateRoot(sharedHost, cContainer, {
    rootId: "host-domain-between-c", renderPreparation: "repeatable", scheduleCommit() {},
  });
  const queue = new NativeRootWorkQueue();
  const cTree = jsx("output", {}, "c");
  let held: ReturnType<typeof c.prepare> | undefined;
  let holdCreated = false;
  let aBodies = 0;
  let bBodies = 0;
  const A = defineComponent<{ value: string }>("host-domain-between-body-a", ({ value }) => {
    aBodies++;
    if (value === "a1" && !holdCreated) {
      holdCreated = true;
      held = c.prepare(cTree);
      held.commitHost();
    }
    return jsx("output", {}, value);
  });
  const B = defineComponent<{ value: string }>("host-domain-between-body-b", ({ value }) => {
    bBodies++;
    return jsx("output", {}, value);
  });
  let discardedA = 0;
  try {
    c.mount(cTree);
    a.mount(jsx(A, { value: "a0" }));
    b.mount(jsx(B, { value: "b0" }));
    const originalPrepare = a.prepare.bind(a);
    a.prepare = (tree, options) => {
      const candidate = originalPrepare(tree, options);
      const originalDiscard = candidate.discard;
      candidate.discard = () => {
        discardedA++;
        originalDiscard.call(candidate);
      };
      return candidate;
    };
    const before = [a.publicationVersion, b.publicationVersion];
    const work = queue.enqueue({
      id: "host-domain-between-entries", renderPreparation: "repeatable",
      roots: [
        { root: a, tree: jsx(A, { value: "a1" }) },
        { root: b, tree: jsx(B, { value: "b1" }) },
      ],
    });
    equal(work.status, "pending", "inter-entry host contention failed or partially committed work");
    equal(aBodies, 2, "first repeatable entry did not prepare once");
    equal(discardedA, 1, "earlier private candidate was not discarded once on contention");
    equal(bBodies, 1, "busy later entry invoked its opaque component");
    equal(text(aContainer.children[0]), "a0", "earlier private entry wrote its host");
    equal(text(bContainer.children[0]), "b0", "busy later entry wrote its host");
    equal(a.publicationVersion, before[0], "earlier private entry published");
    equal(b.publicationVersion, before[1], "busy later entry published");
    assert(held?.validatePostHost(), "standalone holder lost its read cut");
    held?.preparePublication();
    held?.publish();
    held?.installSubscriptions();
    held?.runEffects();
    held = undefined;
    await drain();
    equal(work.status, "committed", "host release did not retry the whole group");
    equal(aBodies, 3, "earlier private candidate was not rebuilt once");
    equal(discardedA, 1, "accepted retried candidate was discarded");
    equal(bBodies, 2, "busy later entry did not render once after release");
    equal(text(aContainer.children[0]), "a1", "retried first output missing");
    equal(text(bContainer.children[0]), "b1", "retried second output missing");
    equal(a.publicationVersion, before[0] + 1, "first root published more than once");
    equal(b.publicationVersion, before[1] + 1, "second root published more than once");
  } finally {
    if (held) held.failGroup(new Error("inter-entry holder cleanup"));
    queue.dispose();
    a.dispose();
    b.dispose();
    c.dispose();
  }
});
