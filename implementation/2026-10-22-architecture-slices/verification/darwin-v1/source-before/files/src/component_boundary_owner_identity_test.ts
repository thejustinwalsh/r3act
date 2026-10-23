import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import {
  ComponentStateRoot,
  defineComponent,
  Suspense,
  useAt,
} from "./component_state_runtime.ts";
import { jsx, type RuntimeNode } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => resolve = yes);
  return { promise, resolve };
};

const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");

const drain = (queue: Array<() => void>) => {
  for (let turn = 0; turn < 12 && queue.length; turn++) queue.shift()!();
  assertEquals(queue.length, 0, "boundary reveal did not quiesce");
};

for (const hostKey of ["constant-host", 7] as const) {
  Deno.test(
    `a bare Suspense fallback with ${typeof hostKey} key is adopted, then a changed child owner remounts`,
    async () => {
      const pending = deferred<string>();
      const resource = new AsyncResource(pending.promise);
      const Ready = defineComponent(
        "boundary-owner-identity:Ready",
        (props: { label: string; resource: AsyncResource<string> }) =>
          jsx(
            "output",
            { key: hostKey, "data-label": props.label },
            useAt("boundary-owner-identity:resource", props.resource) as string,
          ),
      );
      const Other = defineComponent(
        "boundary-owner-identity:Other",
        (props: { label: string }) =>
          jsx("output", { key: hostKey, "data-label": props.label }, "other"),
      );
      const queue: Array<() => void> = [];
      const host = new MemoryVDOMHost();
      const container = host.createContainer();
      const root = new ComponentStateRoot(host, container, {
        rootId: "boundary-owner-identity-bare",
        scheduleCommit: (commit) => queue.push(commit),
      });
      const boundary = (child: RuntimeNode) =>
        jsx(Suspense, {
          key: "boundary",
          __nativeBoundarySite: "boundary-owner-identity:boundary",
          fallback: jsx(
            "output",
            { key: hostKey, "data-label": "pending" },
            "waiting",
          ),
          children: child,
        });
      try {
        root.mount(
          boundary(jsx(Ready, { key: "first", label: "first", resource })),
        );
        const fallback = container.children[0];
        assertEquals(text(fallback), "waiting");

        pending.resolve("ready");
        await Promise.resolve();
        drain(queue);
        assertStrictEquals(container.children[0], fallback);
        assertEquals(text(fallback), "ready");
        assertEquals(fallback.props["data-label"], "first");

        root.update(
          boundary(jsx(Ready, { key: "first", label: "updated", resource })),
        );
        assertStrictEquals(container.children[0], fallback);
        assertEquals(fallback.props["data-label"], "updated");

        root.update(
          boundary(jsx(Ready, { key: "second", label: "second", resource })),
        );
        const second = container.children[0];
        assert(second !== fallback, "a new child key reused the adopted host");
        assertEquals(text(second), "ready");
        assertEquals(second.props["data-label"], "second");

        root.update(boundary(jsx(Other, { key: "second", label: "other" })));
        const other = container.children[0];
        assert(other !== second, "a new child type reused the previous host");
        assertEquals(text(other), "other");
        assertEquals(other.props["data-label"], "other");
      } finally {
        root.dispose();
      }
      assertEquals(container.children.length, 0);
    },
  );
}

Deno.test("a component-authored Suspense fallback retires its host on reveal", async () => {
  const pending = deferred<string>();
  const resource = new AsyncResource(pending.promise);
  const Fallback = defineComponent(
    "boundary-owner-identity:Fallback",
    () => jsx("output", { key: "constant-host" }, "waiting"),
  );
  const Ready = defineComponent(
    "boundary-owner-identity:ReadyAfterFallback",
    (props: { resource: AsyncResource<string>; label: string }) =>
      jsx(
        "output",
        { key: "constant-host", "data-label": props.label },
        useAt(
          "boundary-owner-identity:after-fallback",
          props.resource,
        ) as string,
      ),
  );
  const queue: Array<() => void> = [];
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "boundary-owner-identity-component-fallback",
    scheduleCommit: (commit) => queue.push(commit),
  });
  const boundary = (label: string) =>
    jsx(Suspense, {
      key: "boundary",
      __nativeBoundarySite: "boundary-owner-identity:component-boundary",
      fallback: jsx(Fallback, { key: "fallback" }),
      children: jsx(Ready, { key: "ready", resource, label }),
    });
  try {
    root.mount(boundary("first"));
    const fallback = container.children[0];
    assertEquals(text(fallback), "waiting");

    pending.resolve("ready");
    await Promise.resolve();
    drain(queue);
    const revealed = container.children[0];
    assert(
      revealed !== fallback,
      "the real fallback owner survived the child reveal",
    );
    assertEquals(text(revealed), "ready");
    assertEquals(revealed.props["data-label"], "first");

    root.update(boundary("updated"));
    assertStrictEquals(container.children[0], revealed);
    assertEquals(revealed.props["data-label"], "updated");
  } finally {
    root.dispose();
  }
  assertEquals(container.children.length, 0);
});
