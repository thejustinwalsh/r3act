import {
  createNativeRoot,
  defineComponent,
  NativeRootWorkQueue,
  useEffectAt,
} from "./native_runtime_api.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
  VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const assertSame = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) throw new Error(message);
};

const assertEquals = (
  actual: unknown,
  expected: unknown,
  message = "Values differ",
) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, received ${
        JSON.stringify(actual)
      }`,
    );
  }
};

class RefHost extends MemoryVDOMHost {
  readonly disposed: MemoryNode[] = [];
  failDisposeId: number | null = null;
  publicInstance: (node: MemoryNode) => unknown = (node) => node;

  getPublicInstance(node: MemoryNode) {
    return this.publicInstance(node);
  }

  dispose(node: MemoryNode) {
    this.disposed.push(node);
    if (node.id === this.failDisposeId) throw new Error("dispose failed");
  }
}

Deno.test("public native root refs expose handles or host public instances and remain stable", () => {
  const host = new RefHost();
  const container = host.createContainer();
  const root = createNativeRoot(host, container, { scheduleCommit: () => {} });
  const objectRef: { current: unknown } = { current: null };
  const callbackValues: unknown[] = [];
  const firstCallback = (instance: unknown | null) =>
    callbackValues.push(instance);

  root.mount(
    jsx("group", { ref: objectRef }, jsx("mesh", { ref: firstCallback })),
  );
  const group = container.children[0];
  const mesh = group.children[0];
  assertSame(
    objectRef.current,
    group,
    "Default ref did not expose the host handle",
  );
  assertSame(
    callbackValues[0],
    mesh,
    "Callback ref did not expose the host handle",
  );

  root.render(
    jsx(
      "group",
      { ref: objectRef, name: "updated" },
      jsx("mesh", { ref: firstCallback }),
    ),
  );
  assertEquals(callbackValues.length, 1, "An unchanged ref fired again");

  host.publicInstance = (node) => ({ publicId: node.id });
  const publicObjectRef: { current: unknown } = { current: null };
  const nextValues: unknown[] = [];
  const nextCallback = (instance: unknown | null) => nextValues.push(instance);
  root.render(
    jsx("group", { ref: publicObjectRef }, jsx("mesh", { ref: nextCallback })),
  );
  assertEquals(
    callbackValues.length,
    2,
    "Replacing a callback ref did not detach the old ref",
  );
  assertSame(
    callbackValues[1],
    null,
    "Old callback ref was not detached with null",
  );
  assertEquals(
    nextValues,
    [{ publicId: mesh.id }],
    "Custom public instance was not exposed",
  );
  assertEquals(
    publicObjectRef.current,
    { publicId: group.id },
    "Object ref did not receive custom public instance",
  );

  root.render(jsx("group", { ref: publicObjectRef }));
  assertSame(
    nextValues[1],
    null,
    "Removing a referenced child did not detach it",
  );
  root.dispose();
  assertSame(
    publicObjectRef.current,
    null,
    "Root disposal did not clear its object ref",
  );
});

Deno.test("discarded candidates never attach refs and invalid refs fail before host writes", () => {
  const host = new RefHost();
  const container = host.createContainer();
  const root = createNativeRoot(host, container, { scheduleCommit: () => {} });
  let attached = 0;
  const candidate = root.prepare(jsx("mesh", { ref: () => attached++ }), { renderPreparation: "repeatable" });
  candidate.discard();
  assertEquals(attached, 0);
  assertEquals(container.children.length, 0);

  let rejected = false;
  try {
    root.prepare(jsx("mesh", { ref: "invalid" }), { renderPreparation: "repeatable" });
  } catch (error) {
    rejected = error instanceof TypeError;
  }
  assert(rejected, "An invalid ref did not fail validation");
  assertEquals(
    container.children.length,
    0,
    "Invalid ref validation wrote host nodes",
  );
  root.dispose();
});

Deno.test("grouped root queue publishes all host trees and owner state before ref callbacks", () => {
  const world = new OwnerStateWorld();
  const leftHost = new RefHost();
  const rightHost = new RefHost();
  const leftContainer = leftHost.createContainer();
  const rightContainer = rightHost.createContainer();
  const left = createNativeRoot(leftHost, leftContainer, {
    world,
    rootId: "refs-group-left",
    scheduleCommit: () => {},
  });
  const right = createNativeRoot(rightHost, rightContainer, {
    world,
    rootId: "refs-group-right",
    scheduleCommit: () => {},
  });
  const observations: unknown[][] = [];
  const Probe = defineComponent("refs-group-probe", () =>
    jsx("mesh", {
      ref: (instance: unknown | null) => {
        if (instance !== null) {
          observations.push([
            leftContainer.children.length,
            rightContainer.children.length,
            left.diagnostics().ownerCount,
            right.diagnostics().ownerCount,
          ]);
        }
      },
    }, "left"));
  const Right = defineComponent(
    "refs-group-right-view",
    () => jsx("section", {}, "right"),
  );
  const queue = new NativeRootWorkQueue();
  const handle = queue.enqueue({ renderPreparation: "repeatable",
    id: "refs-group-commit",
    roots: [
      { root: left, tree: jsx(Probe, {}) },
      { root: right, tree: jsx(Right, {}) },
    ],
  });

  assertEquals(handle.status, "committed");
  assertEquals(
    observations,
    [[1, 1, 1, 1]],
    "Ref callback ran before grouped publication completed",
  );
  queue.dispose();
  left.dispose();
  right.dispose();
});

Deno.test("ref cleanup failures do not block other detaches or host disposal", () => {
  const host = new RefHost();
  const container = host.createContainer();
  const root = createNativeRoot(host, container, { scheduleCommit: () => {} });
  const objectRef: { current: unknown } = { current: null };
  let attached = 0;
  root.mount(jsx("main", {}, [
    jsx("mesh", {
      key: "a",
      ref: (instance: unknown | null) => {
        if (instance !== null) {
          attached++;
          return () => {
            throw new Error("ref cleanup failed");
          };
        }
      },
    }),
    jsx("light", { key: "b", ref: objectRef }),
  ]));

  let caught: unknown;
  try {
    root.dispose();
  } catch (error) {
    caught = error;
  }
  assert(
    caught instanceof AggregateError,
    "Root disposal did not report ref cleanup failure",
  );
  assertEquals(attached, 1);
  assertSame(
    objectRef.current,
    null,
    "Another ref was not detached after cleanup threw",
  );
  assertEquals(
    host.disposed.length,
    3,
    "Ref failure prevented owned host disposal",
  );
});

Deno.test("disposing a root inside a ref callback cancels pending attaches and effects", () => {
  const host = new RefHost();
  const container = host.createContainer();
  let root: ReturnType<typeof createNativeRoot<MemoryNode, MemoryNode>> | null =
    null;
  let callbackCleanup = 0;
  let secondAttach = 0;
  let effects = 0;
  const App = defineComponent("refs-dispose-during-attach", () => {
    useEffectAt("effect", () => {
      effects++;
    });
    return jsx("main", {}, [
      jsx("mesh", {
        key: "first",
        ref: (instance: unknown | null) => {
          if (instance !== null) secondAttach++;
        },
      }),
      jsx("light", {
        key: "second",
        ref: (instance: unknown | null) => {
          if (instance !== null) {
            root?.dispose();
            return () => callbackCleanup++;
          }
        },
      }),
    ]);
  });
  root = createNativeRoot(host, container, { scheduleCommit: () => {} });

  root.mount(jsx(App, {}));

  assertEquals(
    callbackCleanup,
    1,
    "Returned cleanup was orphaned after callback disposal",
  );
  assertEquals(secondAttach, 0, "A later ref attached after root disposal");
  assertEquals(effects, 0, "Effect setup ran after a ref disposed the root");
  assertEquals(
    root.diagnostics().ownerCount,
    0,
    "Disposed root retained component ownership",
  );
  assertEquals(
    container.children.length,
    0,
    "Ref callback disposal left host nodes mounted",
  );
});

Deno.test("a failed normal disposal is not retried when the root later tears down", () => {
  const host = new RefHost();
  const container = host.createContainer();
  const vdom = new VDOMSnapshotRoot(host, container);
  vdom.commit(jsx("mesh", { key: "old" }, jsx("geometry", {}, "child")));
  const mesh = container.children[0];
  const geometry = mesh.children[0];
  host.failDisposeId = geometry.id;

  let caught: unknown;
  try {
    vdom.commit(jsx("light", { key: "old" }));
  } catch (error) {
    caught = error;
  }
  assert(
    caught instanceof AggregateError,
    "Expected terminal replacement disposal failure",
  );

  try {
    vdom.dispose();
  } catch {
    // The second teardown still removes all nodes; the original host failure
    // is deliberately terminal and is reported again only if new cleanup fails.
  }
  assertEquals(host.disposed.filter((node) => node === geometry).length, 1);
  assertEquals(host.disposed.filter((node) => node === mesh).length, 1);
});
