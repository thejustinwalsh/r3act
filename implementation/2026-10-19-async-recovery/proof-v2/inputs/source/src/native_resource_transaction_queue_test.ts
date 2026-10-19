import { assert, assertEquals, assertStrictEquals, assertThrows } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import {
  ComponentStateRoot,
  defineComponent,
  Suspense,
  useAt,
} from "./component_state_runtime.ts";
import {
  invalidateCompiledSemanticPlan,
  registerCompiledSemanticPlan,
} from "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => resolve = done);
  return { promise, resolve };
};
const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");

function fixture(
  id: string,
  names: readonly string[],
  host = new MemoryVDOMHost(),
) {
  const sourceFile = `resource-queue/${id}.tsx`;
  const revision = "resource-queue-v1";
  registerCompiledSemanticPlan({
    schema_version: 1,
    source_file: sourceFile,
    module_revision: revision,
    owners: [],
    sources: [],
    sinks: [],
    operations: [],
    graph: {
      coverage: "proven-sinks-only",
      source_to_sinks: {},
      execution_order: [],
    },
  });
  const waits = new Map(names.map((name) => [name, deferred<string>()]));
  const resources = new Map(
    [...waits].map(([name, wait]) => [name, new AsyncResource(wait.promise)]),
  );
  const container = host.createContainer();
  const scheduled: Array<() => void> = [];
  const root = new ComponentStateRoot(host, container, {
    rootId: id,
    scheduleCommit(commit) {
      scheduled.push(commit);
    },
  });
  const children = names.map((name) => {
    const programId = `${sourceFile}#component:${name}`;
    const Child = defineComponent(
      programId,
      (props: { resource: AsyncResource<string> }) =>
        jsx(
          "div",
          { key: `${name}-host` },
          useAt(`${programId}#resource:0`, props.resource) as string,
        ),
      {
        propOnlySites: [],
        closedResourceHostProgram: {
          schemaVersion: 1,
          componentProgramId: programId,
          moduleRevision: revision,
          resourceUseSiteId: `${programId}#resource:0`,
          resourceProp: "resource",
          host: {
            tag: "div",
            key: `${name}-host`,
            props: [],
            child: "resource-value",
          },
        },
      },
    );
    return jsx(Suspense, {
      key: name,
      __nativeBoundarySite: `${name}-boundary`,
      fallback: jsx("div", { key: `${name}-host` }, `${name}-loading`),
      children: jsx(Child, {
        key: `${name}-child`,
        resource: resources.get(name)!,
      }),
    });
  });
  root.mount(jsx("section", {}, children));
  return {
    root,
    sourceFile,
    container,
    resources,
    node(name: string) {
      return container.children[0].children[names.indexOf(name)];
    },
    value(name: string) {
      return text(this.node(name));
    },
    updateMarker(label: string) {
      root.update(jsx("section", {}, [...children, jsx("mark", { key: "marker" }, label)]));
    },
    async settle(name: string) {
      waits.get(name)!.resolve(`${name}-ready`);
      await Promise.resolve();
    },
    drain(limit = 12) {
      for (let i = 0; i < limit && scheduled.length; i++) scheduled.shift()!();
      assertEquals(scheduled.length, 0, "automatic scheduling did not quiesce");
    },
    dispose() {
      root.dispose();
      invalidateCompiledSemanticPlan(sourceFile);
    },
  };
}

Deno.test("declared A/B reveal waits for both inputs while independent C publishes", async () => {
  const f = fixture("joint-independent", ["a", "b", "c"]);
  const queue = new NativeRootWorkQueue();
  try {
    const [a, b, c] = ["a", "b", "c"].map((name) => f.resources.get(name)!);
    const oldA = f.node("a"), oldB = f.node("b");
    const joint = queue.enqueueResources({
      id: "joint-ab",
      roots: [{ root: f.root, resources: [a, b] }],
    });
    const independent = queue.enqueueResources({
      id: "independent-c",
      roots: [{ root: f.root, resources: [c] }],
    });
    await f.settle("a");
    f.drain();
    assertEquals(joint.status, "pending");
    assertStrictEquals(f.node("a"), oldA);
    assertStrictEquals(f.node("b"), oldB);
    await f.settle("c");
    f.drain();
    assertEquals(independent.status, "committed");
    assertStrictEquals(f.node("a"), oldA);
    assertStrictEquals(f.node("b"), oldB);
    assertEquals(f.value("c"), "c-ready");
    await f.settle("b");
    f.drain();
    assertEquals(joint.status, "committed");
    assertEquals([f.value("a"), f.value("b"), f.value("c")], [
      "a-ready",
      "b-ready",
      "c-ready",
    ]);
  } finally {
    queue.dispose();
    f.dispose();
  }
});

Deno.test("equal key replaces a waiting resource intent and releases its hold", async () => {
  const f = fixture("replacement", ["a", "b"]);
  const queue = new NativeRootWorkQueue();
  try {
    const a = f.resources.get("a")!, b = f.resources.get("b")!;
    const old = queue.enqueueResources({
      id: "old-ab",
      key: "selection",
      roots: [{ root: f.root, resources: [a, b] }],
    });
    const next = queue.enqueueResources({
      id: "new-a",
      key: "selection",
      roots: [{ root: f.root, resources: [a] }],
    });
    assertEquals(old.status, "cancelled");
    await f.settle("a");
    f.drain();
    assertEquals(next.status, "committed");
    assertEquals(f.value("a"), "a-ready");
    assertEquals(f.value("b"), "b-loading");
    await f.settle("b");
    f.drain();
    assertEquals(f.value("b"), "b-ready");
  } finally {
    queue.dispose();
    f.dispose();
  }
});

Deno.test("a second A-only group cannot publish ahead of an older A/B group", async () => {
  const left = fixture("cross-root-left", ["a"]);
  const right = fixture("cross-root-right", ["b"]);
  const queue = new NativeRootWorkQueue();
  try {
    const a = left.resources.get("a")!, b = right.resources.get("b")!;
    const group = queue.enqueueResources({
      id: "cross-root-ab",
      roots: [
        { root: left.root, resources: [a] },
        { root: right.root, resources: [b] },
      ],
    });
    const later = queue.enqueueResources({
      id: "later-a",
      roots: [
        { root: left.root, resources: [a] },
      ],
    });
    await left.settle("a");
    left.drain();
    assertEquals(group.status, "pending");
    assertEquals(later.status, "pending");
    assertEquals(left.value("a"), "a-loading");
    await right.settle("b");
    right.drain();
    left.drain();
    assertEquals(group.status, "committed");
    assertEquals(left.value("a"), "a-ready");
    assertEquals(right.value("b"), "b-ready");
    assertEquals(later.status, "committed");
  } finally {
    queue.dispose();
    left.dispose();
    right.dispose();
  }
});

Deno.test("parked direct updates retain the latest tree until joint resource intent releases", async () => {
  const f = fixture("parked-direct", ["a", "b"]);
  const queue = new NativeRootWorkQueue();
  try {
    const group = queue.enqueueResources({ id: "direct-ab", roots: [{ root: f.root,
      resources: [...f.resources.values()] }] });
    f.updateMarker("obsolete");
    f.updateMarker("latest");
    f.drain();
    assertEquals(f.container.children[0].children.length, 2);
    await f.settle("a");
    f.drain();
    assertEquals(group.status, "pending");
    assertEquals(f.value("a"), "a-loading");
    await f.settle("b");
    assertEquals(group.status, "committed");
    f.drain();
    assertEquals([f.value("a"), f.value("b")], ["a-ready", "b-ready"]);
    assertEquals(f.container.children[0].children.length, 3);
    assertEquals(text(f.container.children[0].children[2]), "latest");
  } finally {
    queue.dispose();
    f.dispose();
  }
});

Deno.test("cancellation releases intent without cancelling the resource provider", async () => {
  const f = fixture("cancel-intent", ["a", "b"]);
  const queue = new NativeRootWorkQueue();
  try {
    const a = f.resources.get("a")!, b = f.resources.get("b")!;
    const work = queue.enqueueResources({ id: "cancelled-ab",
      roots: [{ root: f.root, resources: [a, b] }] });
    await f.settle("a");
    f.drain();
    assertEquals(f.value("a"), "a-loading");
    work.cancel("user changed selection");
    f.drain();
    assertEquals(work.status, "cancelled");
    assertEquals(f.value("a"), "a-ready");
    assertEquals(b.status.status, "pending");
    await f.settle("b");
    f.drain();
    assertEquals(f.value("b"), "b-ready");
  } finally {
    queue.dispose();
    f.dispose();
  }
});

Deno.test("releasing a resource hold revokes its prepared capability before host writes", async () => {
  const f = fixture("released-capability", ["a"]);
  const resource = f.resources.get("a")!;
  const release = f.root.holdTransactionPublications({ resources: [resource] });
  let candidate: ReturnType<typeof f.root.prepareResources> = null;
  try {
    const fallback = f.node("a");
    await f.settle("a");
    f.drain();
    assertStrictEquals(f.node("a"), fallback);
    candidate = f.root.prepareResources([resource], release);
    assertStrictEquals(candidate === null, false);
    assertEquals(candidate!.validate(), true);
    release();
    assertEquals(candidate!.validate(), false);
    assertStrictEquals(f.node("a"), fallback);
  } finally {
    candidate?.discard();
    release();
    f.dispose();
  }
});

Deno.test("a lease for A cannot authorize B through a younger B/C hold", async () => {
  const f = fixture("capability-scope", ["a", "b", "c"]);
  const a = f.resources.get("a")!, b = f.resources.get("b")!;
  const c = f.resources.get("c")!;
  const releaseA = f.root.holdTransactionPublications({ resources: [a] });
  const releaseBC = f.root.holdTransactionPublications({ resources: [b, c] });
  try {
    const fallback = f.node("b");
    await f.settle("b");
    f.drain();
    assertStrictEquals(f.node("b"), fallback);
    assertStrictEquals(f.root.prepareResources([b], releaseA), null);
    assertStrictEquals(f.node("b"), fallback);
    assertEquals(f.value("b"), "b-loading");
    assertEquals(c.status.status, "pending");
  } finally {
    releaseBC();
    releaseA();
    f.dispose();
  }
});

Deno.test("expired compiled code cannot publish a waiting resource group", async () => {
  const f = fixture("expired-code", ["a", "b"]);
  const queue = new NativeRootWorkQueue();
  try {
    const work = queue.enqueueResources({ id: "expired-ab", roots: [{ root: f.root,
      resources: [...f.resources.values()] }] });
    const fallback = f.node("a");
    invalidateCompiledSemanticPlan(f.sourceFile);
    await f.settle("a");
    await f.settle("b");
    assertEquals(work.status, "failed");
    assertStrictEquals(f.node("a"), fallback);
  } finally {
    queue.dispose();
    f.dispose();
  }
});

Deno.test("second host failure preserves the original error and old accepted histories", async () => {
  const fault = new Error("second-host-fault");
  let armed = false;
  class FaultHost extends MemoryVDOMHost {
    override setText(node: MemoryNode, value: string) {
      if (armed && value === "b-ready") throw fault;
      super.setText(node, value);
    }
    override place(parent: MemoryNode, node: MemoryNode, before: MemoryNode | null) {
      if (armed && text(node) === "b-ready") throw fault;
      super.place(parent, node, before);
    }
  }
  const left = fixture("failure-left", ["a"]);
  const right = fixture("failure-right", ["b"], new FaultHost());
  const queue = new NativeRootWorkQueue();
  try {
    const versions = [left.root.publicationVersion, right.root.publicationVersion];
    const work = queue.enqueueResources({ id: "failure-ab", roots: [
      { root: left.root, resources: [left.resources.get("a")!] },
      { root: right.root, resources: [right.resources.get("b")!] },
    ] });
    armed = true;
    await left.settle("a");
    await right.settle("b");
    assertEquals(work.status, "failed");
    const error = work.resolution.error;
    assertEquals(error === fault ||
      (error instanceof AggregateError && error.errors[0] === fault), true);
    assertEquals([left.root.publicationVersion, right.root.publicationVersion], versions);
    const leftTerminal = assertThrows(() =>
      left.root.prepareResources([left.resources.get("a")!]));
    const rightTerminal = assertThrows(() =>
      right.root.prepareResources([right.resources.get("b")!]));
    assert(leftTerminal instanceof Error);
    assert(rightTerminal instanceof Error);
    assertStrictEquals(leftTerminal.cause, fault);
    assertStrictEquals(rightTerminal.cause, fault);
  } finally {
    queue.dispose();
    left.dispose();
    right.dispose();
  }
});

Deno.test("settlement callback may dispose the queue and root after joint publication", async () => {
  const f = fixture("callback-dispose", ["a", "b"]);
  const queue = new NativeRootWorkQueue();
  let settled = 0;
  try {
    const work = queue.enqueueResources({ id: "callback-ab",
      roots: [{ root: f.root, resources: [...f.resources.values()] }],
      onSettled(resolution) {
        assertEquals(resolution.status, "committed");
        assertEquals([f.value("a"), f.value("b")], ["a-ready", "b-ready"]);
        settled++;
        queue.dispose();
        f.dispose();
      } });
    await f.settle("a");
    await f.settle("b");
    assertEquals(work.status, "committed");
    assertEquals(settled, 1);
  } finally {
    queue.dispose();
    f.dispose();
  }
});
