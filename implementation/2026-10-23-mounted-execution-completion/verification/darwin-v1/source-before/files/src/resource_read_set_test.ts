import { assertEquals, assertThrows } from "jsr:@std/assert";
import {
  AsyncResourceTable,
  isPendingResourceToken,
  ResourceRejection,
} from "./async_resource_runtime.ts";
import { ResourceReadSet } from "./resource_read_set.ts";
import { RootWorkQueue } from "./root_work_queue.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}

Deno.test("resource read set captures every pending sibling and rejects stale readiness", async () => {
  const a = deferred<number>(), b = deferred<number>();
  const table = new AsyncResourceTable();
  const reads = new ResourceReadSet(table);
  for (const source of [a.promise, b.promise, a.promise]) {
    let caught = false;
    try {
      reads.read(source);
    } catch (error) {
      caught = isPendingResourceToken(error);
    }
    assertEquals(caught, true);
  }
  assertEquals(reads.pending.length, 2);
  assertEquals(reads.validate(), true);
  b.resolve(2);
  await b.promise;
  assertEquals(reads.validate(), false);
  assertEquals(reads.pending.length, 1);
  a.resolve(1);
  await a.promise;
  const retry = new ResourceReadSet(table);
  assertEquals([retry.read(a.promise), retry.read(b.promise)], [1, 2]);
  assertEquals(retry.validate(), true);
  reads.discard();
  assertEquals(reads.pending.length, 0);
  assertThrows(() => reads.read(a.promise), Error, "closed");
});

Deno.test("unrelated resource settlement does not invalidate candidate reads", async () => {
  const a = deferred<number>(), b = deferred<number>();
  const table = new AsyncResourceTable();
  table.from(a.promise);
  table.from(b.promise);
  a.resolve(1);
  await a.promise;
  const reads = new ResourceReadSet(table);
  assertEquals(reads.read(a.promise), 1);
  b.resolve(2);
  await b.promise;
  assertEquals(reads.validate(), true);
});

Deno.test("discarding resource consumer preserves other consumer and provider", async () => {
  const source = deferred<number>();
  const table = new AsyncResourceTable();
  const a = new ResourceReadSet(table), b = new ResourceReadSet(table);
  for (const reads of [a, b]) {
    try {
      reads.read(source.promise);
    } catch { /* pending */ }
  }
  a.discard();
  source.resolve(7);
  await source.promise;
  assertEquals(a.validate(), false);
  assertEquals(b.validate(), false);
  assertEquals(new ResourceReadSet(table).read(source.promise), 7);
});

Deno.test("resource readiness publishes overlapping root work in completion order", async () => {
  const table = new AsyncResourceTable();
  const queue = new RootWorkQueue<number>(new Map([["root", 0]]));
  const commits: number[] = [];
  const a = deferred<number>(), b = deferred<number>();
  const subscriptions: (() => void)[] = [];
  const enqueue = (id: string, source: Promise<number>) => {
    const resource = table.from(source);
    let reads: ResourceReadSet;
    const handle = queue.enqueue({
      id,
      roots: ["root"],
      pending: ["resource"],
      prepare: ({ versions }) => {
        reads = new ResourceReadSet(table);
        const value = reads.read(resource);
        const baseVersion = versions.get("root")!;
        return [{
          rootId: "root",
          baseVersion,
          targetVersion: baseVersion + 1,
          value,
          validate: () => reads.validate(),
        }];
      },
      commit: (candidates) => {
        commits.push(candidates[0].value);
        reads.discard();
      },
      discard: () => reads.discard(),
    });
    subscriptions.push(resource.subscribe(() => handle.resolve("resource")));
    return handle;
  };
  const first = enqueue("a", a.promise), second = enqueue("b", b.promise);
  queue.recordUrgentCommit("root");
  b.resolve(2);
  await b.promise;
  a.resolve(1);
  await a.promise;
  assertEquals(commits, [2, 1]);
  assertEquals([first.status, second.status, queue.getVersion("root")], [
    "committed",
    "committed",
    3,
  ]);
  for (const unsubscribe of subscriptions) unsubscribe();
});

Deno.test("rejected resource cannot publish root work", async () => {
  const source = deferred<number>();
  const table = new AsyncResourceTable();
  const resource = table.from(source.promise);
  const queue = new RootWorkQueue<number>(new Map([["root", 0]]));
  let commits = 0;
  const handle = queue.enqueue({
    id: "reject",
    roots: ["root"],
    pending: ["resource"],
    prepare: (
      { versions },
    ) => [{
      rootId: "root",
      baseVersion: versions.get("root")!,
      targetVersion: 1,
      value: resource.read(),
    }],
    commit: () => {
      commits++;
    },
  });
  const unsubscribe = resource.subscribe(() => handle.resolve("resource"));
  source.reject(new Error("offline"));
  await source.promise.catch(() => {});
  assertEquals(handle.status, "failed");
  assertEquals(handle.resolution.error instanceof ResourceRejection, true);
  assertEquals(commits, 0);
  assertEquals(queue.getVersion("root"), 0);
  unsubscribe();
});
