import { assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import {
  ComponentStateRoot,
  defineComponent,
  Suspense,
  useAt,
  useEffectAt,
} from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

Deno.test("accepted rejection retains its error until replacement succeeds", async () => {
  let setups = 0, cleanups = 0;
  const View = defineComponent(
    "recovery-primary",
    (props: { resource: AsyncResource<string> }) => {
      useEffectAt("recovery-effect", () => {
        setups++;
        return () => cleanups++;
      });
      return jsx("b", {}, useAt("recovery-read", props.resource) as string);
    },
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const tree = (resource: AsyncResource<string>) => jsx(Suspense, {
    __nativeBoundarySite: "recovery-boundary",
    fallback: jsx("p", {}, "pending"),
    error: (reason: unknown) => jsx("strong", {}, `error:${String(reason)}`),
    children: jsx(View, { resource }),
  });
  try {
    root.mount(tree(new AsyncResource(Promise.resolve("v1"))));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const firstNode = container.children[0];
    assertEquals(text(firstNode), "v1");
    assertEquals([setups, cleanups], [1, 0]);

    const discardedRejection = new AsyncResource<string>(
      Promise.reject("discarded"),
    );
    await Promise.resolve();
    const declined = root.prepare(tree(discardedRejection));
    declined.discard();
    const waiting = deferred<string>();
    const pending = new AsyncResource(waiting.promise);
    root.update(tree(pending));
    assertStrictEquals(container.children[0], firstNode);
    assertEquals(text(container.children[0]), "v1");
    assertEquals([setups, cleanups], [1, 0]);

    waiting.reject("broken");
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    assertEquals(text(container.children[0]), "error:broken");
    assertEquals([setups, cleanups], [1, 1]);

    const replacement = deferred<string>();
    root.update(tree(new AsyncResource(replacement.promise)));
    assertEquals(text(container.children[0]), "error:broken");
    assertEquals([setups, cleanups], [1, 1]);
    replacement.resolve("v3");
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    assertEquals(text(container.children[0]), "v3");
    assertEquals([setups, cleanups], [2, 1]);
  } finally {
    root.dispose();
  }
  assertEquals([setups, cleanups], [2, 2]);
});

Deno.test("outer suspension rolls back an inner rejection before retaining its view", async () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const first = new AsyncResource(Promise.resolve("first"));
  const innerWait = deferred<string>();
  const innerPending = new AsyncResource(innerWait.promise);
  const siblingWait = deferred<string>();
  const siblingPending = new AsyncResource(siblingWait.promise);
  const rejectedInner = new AsyncResource<string>(
    Promise.reject("inner-failed"),
  );
  const Inner = defineComponent(
    "recovery-nested-inner",
    (props: { resource: AsyncResource<string> }) =>
      jsx("b", {}, useAt("recovery-nested-inner-read", props.resource) as string),
  );
  const Sibling = defineComponent(
    "recovery-nested-sibling",
    (props: { resource: AsyncResource<string> }) =>
      jsx("i", {}, useAt("recovery-nested-sibling-read", props.resource) as string),
  );
  const tree = (inner: AsyncResource<string>, sibling?: AsyncResource<string>) =>
    jsx(Suspense, {
      __nativeBoundarySite: "recovery-outer",
      fallback: jsx("p", {}, "outer-pending"),
      children: [
        jsx(Suspense, {
          __nativeBoundarySite: "recovery-inner",
          fallback: jsx("p", {}, "inner-pending"),
          error: (reason: unknown) => jsx("strong", {}, `error:${String(reason)}`),
          children: jsx(Inner, { resource: inner }),
        }),
        sibling ? jsx(Sibling, { resource: sibling }) : jsx("i", {}, "sibling"),
      ],
    });
  try {
    root.mount(tree(first));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    assertEquals(text(container), "firstsibling");
    root.update(tree(innerPending));
    assertEquals(text(container), "firstsibling");
    await Promise.resolve();

    const candidate = root.prepare(tree(rejectedInner, siblingPending));
    assertEquals(candidate.validate(), true);
    candidate.commitHost();
    candidate.publish();
    candidate.runEffects();
    assertEquals(text(container), "firstsibling");
  } finally {
    root.dispose();
  }
});

Deno.test("replaced and disposed pending queue work ignores late resource completion", async () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const queue = new NativeRootWorkQueue();
  const View = defineComponent(
    "recovery-queued-view",
    (props: { resource: AsyncResource<string> }) =>
      jsx("output", {}, useAt("recovery-queued-read", props.resource) as string),
  );
  const tree = (resource: AsyncResource<string>) => jsx(Suspense, {
    __nativeBoundarySite: "recovery-queued-boundary",
    fallback: jsx("p", {}, "pending"),
    error: (reason: unknown) => jsx("strong", {}, `error:${String(reason)}`),
    children: jsx(View, { resource }),
  });
  try {
    root.mount(tree(new AsyncResource(Promise.resolve("base"))));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    assertEquals(text(container.children[0]), "base");

    const oldWait = deferred<string>();
    const old = queue.enqueue({
      id: "old", key: "selection",
      roots: [{ root, tree: tree(new AsyncResource(oldWait.promise)) }],
    });
    assertEquals(old.status, "pending");
    const next = queue.enqueue({
      id: "next", key: "selection",
      roots: [{ root, tree: tree(new AsyncResource(Promise.resolve("next"))) }],
    });
    assertEquals(old.status, "cancelled");
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    assertEquals(next.status, "committed");
    assertEquals(text(container.children[0]), "next");
    const accepted = container.children[0];
    oldWait.resolve("late-old");
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    assertStrictEquals(container.children[0], accepted);
    assertEquals(text(container.children[0]), "next");

    const abandonedWait = deferred<string>();
    const abandoned = queue.enqueue({
      id: "abandoned",
      roots: [{ root, tree: tree(new AsyncResource(abandonedWait.promise)) }],
    });
    assertEquals(abandoned.status, "pending");
    queue.dispose();
    assertEquals(abandoned.status, "cancelled");
    abandonedWait.resolve("late-abandoned");
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    assertStrictEquals(container.children[0], accepted);
    assertEquals(text(container.children[0]), "next");
  } finally {
    queue.dispose();
    root.dispose();
  }
});

Deno.test("early root disposal cancels resource preparation and ignores settlement", async () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const queue = new NativeRootWorkQueue();
  const wait = deferred<string>();
  const View = defineComponent("recovery-disposed-view", () =>
    jsx("output", {}, useAt("recovery-disposed-read", wait.promise) as string));
  try {
    root.mount(jsx("div", {}, "accepted"));
    const work = queue.enqueue({
      id: "dispose-pending-resource",
      roots: [{ root, tree: jsx(Suspense, {
        __nativeBoundarySite: "recovery-disposed-boundary",
        fallback: jsx("p", {}, "pending"),
        children: jsx(View, {}),
      }) }],
    });
    assertEquals(work.status, "pending");
    root.dispose();
    assertEquals(work.status, "cancelled");
    wait.resolve("late");
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    assertEquals(container.children.length, 0);
    assertEquals(work.status, "cancelled");
  } finally {
    queue.dispose();
    root.dispose();
  }
});
