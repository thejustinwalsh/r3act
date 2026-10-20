import { assertEquals, assertThrows } from "jsr:@std/assert";
import { RootWorkQueue, type RootWorkHandle } from "./root_work_queue.ts";

const work = (
  queue: RootWorkQueue<string>,
  id: string,
  key: string | undefined,
  events: string[],
  onSettled?: (status: string) => void,
) => queue.enqueue({
  id,
  roots: ["view"],
  key,
  pending: ["ready"],
  prepare: ({ versions }) => {
    events.push(`prepare:${id}`);
    const baseVersion = versions.get("view")!;
    return [{ rootId: "view", baseVersion, targetVersion: baseVersion + 1, value: id }];
  },
  commit: () => events.push(`commit:${id}`),
  onSettled: ({ status }) => {
    events.push(`settled:${id}:${status}`);
    onSettled?.(status);
  },
});

Deno.test("reentrant same-key work supersedes the replacement being enqueued", () => {
  const events: string[] = [];
  const queue = new RootWorkQueue<string>(new Map([["view", 0]]));
  let c!: RootWorkHandle;
  const a = work(queue, "a", "route", events, (status) => {
    if (status === "cancelled") c = work(queue, "c", "route", events);
  });
  const unrelated = work(queue, "unrelated", "other", events);
  const b = work(queue, "b", "route", events);
  assertEquals([a.status, b.status, c.status, unrelated.status],
    ["cancelled", "cancelled", "pending", "pending"]);
  assertEquals(b.resolve("ready").status, "stale");
  assertEquals(b.status, "cancelled");
  unrelated.resolve("ready");
  c.resolve("ready");
  assertEquals([unrelated.status, c.status], ["committed", "committed"]);
  assertEquals(events.filter((event) => event === "prepare:b" || event === "commit:b"), []);
  assertEquals(events.filter((event) => event.startsWith("commit:")),
    ["commit:unrelated", "commit:c"]);
  assertEquals(queue.getVersion("view"), 2);
});

Deno.test("nested replacement callbacks retain the newest claimant and report throws", () => {
  const events: string[] = [];
  const callbackErrors: unknown[] = [];
  const queue = new RootWorkQueue<string>(new Map([["view", 0]]), 2,
    (error) => callbackErrors.push(error));
  let c!: RootWorkHandle;
  let d!: RootWorkHandle;
  const marker = new Error("settlement observer failed");
  const a = work(queue, "a", "route", events, (status) => {
    if (status === "cancelled") c = work(queue, "c", "route", events);
    throw marker;
  });
  const b = work(queue, "b", "route", events, (status) => {
    if (status === "cancelled") d = work(queue, "d", "route", events);
  });
  assertEquals([a.status, b.status, c.status, d.status],
    ["cancelled", "cancelled", "cancelled", "pending"]);
  assertEquals(callbackErrors, [marker]);
  for (const handle of [b, c]) {
    assertEquals(handle.resolve("ready").status, "stale");
    assertEquals(handle.status, "cancelled");
  }
  d.resolve("ready");
  assertEquals(events.filter((event) => event.startsWith("commit:")), ["commit:d"]);
  assertEquals(queue.getVersion("view"), 1);
});

Deno.test("replacement while a group is applying preserves its committed result", () => {
  const events: string[] = [];
  const queue = new RootWorkQueue<string>(new Map([["view", 0]]));
  let a!: RootWorkHandle;
  let b!: RootWorkHandle;
  a = queue.enqueue({
    id: "a", roots: ["view"], key: "route", pending: ["ready"],
    prepare: ({ versions }) => [{ rootId: "view", baseVersion: versions.get("view")!,
      targetVersion: 1, value: "a" }],
    commit: () => {
      events.push("commit:a");
      b = work(queue, "b", "route", events);
      assertEquals(a.status, "pending");
      assertEquals(b.status, "pending");
    },
    onSettled: ({ status }) => events.push(`settled:a:${status}`),
  });
  a.resolve("ready");
  assertEquals(a.status, "committed");
  b.resolve("ready");
  assertEquals(b.status, "committed");
  assertEquals(events.filter((event) => event.startsWith("commit:")),
    ["commit:a", "commit:b"]);
  assertEquals(queue.getVersion("view"), 2);
});

Deno.test("afterCommit retains exact applying identity until final notification", () => {
  const queue = new RootWorkQueue<string>(new Map([["view", 0]]));
  const events: string[] = [];
  let b!: RootWorkHandle;
  const a = queue.enqueue({
    id: "after-a", roots: ["view"], key: "route", pending: ["ready"],
    prepare: ({ versions }) => [{ rootId: "view", baseVersion: versions.get("view")!,
      targetVersion: 1, value: "a" }],
    commit: () => events.push("commit:a"),
    afterCommit: () => {
      assertEquals(queue.isCommitting("after-a"), true);
      assertEquals(queue.getVersion("view"), 1);
      assertThrows(() => work(queue, "after-a", undefined, events));
      b = work(queue, "after-b", "route", events);
      assertEquals(b.status, "pending");
      events.push("after:a");
    },
    onSettled: ({ status }) => {
      assertEquals(queue.isCommitting("after-a"), false);
      events.push(`settled:a:${status}`);
    },
  });
  a.resolve("ready");
  assertEquals(a.status, "committed");
  assertEquals(b.status, "pending");
  assertEquals(events, ["commit:a", "after:a", "settled:a:committed"]);
  b.resolve("ready");
  assertEquals(b.status, "committed");
  assertEquals(events, ["commit:a", "after:a", "settled:a:committed",
    "prepare:after-b", "commit:after-b", "settled:after-b:committed"]);
  assertEquals(queue.getVersion("view"), 2);
  const reused = work(queue, "after-a", undefined, events);
  assertEquals(reused.status, "pending");
  reused.cancel();
});
