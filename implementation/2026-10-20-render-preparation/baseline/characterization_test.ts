import { assertEquals } from "jsr:@std/assert";
import { ComponentStateRoot, defineComponent } from "./source/src/component_state_runtime.ts";
import { jsx } from "./source/src/jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./source/src/native_root_work_queue.ts";
import { MemoryVDOMHost, type MemoryNode } from "./source/src/vdom_snapshot_runtime.ts";

const text = (node: MemoryNode): string => (node.text ?? "") + node.children.map(text).join("");
const create = (id: string) => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: id, scheduleCommit: () => {} });
  root.mount(jsx("output", {}, "accepted"));
  return { root, read: () => container.children.map(text).join("") };
};

Deno.test("old generic preparation executes an opaque body before discard", () => {
  const app = create("old-opaque-discard");
  let escaped = 0;
  const Opaque = defineComponent("old-opaque-discard-view", () => {
    escaped++;
    return jsx("output", {}, "candidate");
  });
  try {
    const candidate = app.root.prepare(jsx(Opaque, {}));
    assertEquals(escaped, 1);
    candidate.discard();
    assertEquals(app.read(), "accepted");
    assertEquals(escaped, 1);
  } finally { app.root.dispose(); }
});

Deno.test("old generic stale replay repeats an opaque body on the same root frontier", async () => {
  const app = create("old-opaque-replay");
  const queue = new NativeRootWorkQueue();
  let escaped = 0, checks = 0;
  const Opaque = defineComponent("old-opaque-replay-view", () => {
    escaped++;
    return jsx("output", {}, String(escaped));
  });
  const before = app.root.publicationVersion;
  let settle!: (value: string) => void;
  const settled = new Promise<string>(resolve => { settle = resolve; });
  try {
    queue.enqueue({ id: "old-opaque-replay", roots: [{ root: app.root, tree: jsx(Opaque, {}) }],
      validateWork: () => ++checks > 1,
      onSettled: outcome => settle(outcome.status) });
    assertEquals(await settled, "committed");
    assertEquals(escaped, 2);
    assertEquals(app.read(), "2");
    assertEquals(app.root.publicationVersion, before + 1);
  } finally { queue.dispose(); app.root.dispose(); }
});
