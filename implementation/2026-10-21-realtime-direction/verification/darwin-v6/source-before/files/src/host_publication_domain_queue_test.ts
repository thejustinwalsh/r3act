import {
  type RootWorkCandidate,
  RootWorkPending,
  RootWorkQueue,
  type RootWorkPendingContext,
} from "./root_work_queue.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const equal = (actual: unknown, expected: unknown, message: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
};
const candidate = (base: number): RootWorkCandidate<string> => ({
  rootId: "root", baseVersion: base, targetVersion: base + 1, value: `value-${base + 1}`,
});

Deno.test("precommit admission contention stays pending and retries without poisoning a root", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  let busy = true;
  let pending!: RootWorkPendingContext;
  let preparations = 0;
  let discards = 0;
  let commits = 0;
  let releases = 0;
  const work = queue.enqueue({
    id: "busy-admission", roots: ["root"],
    prepare({ versions }) {
      preparations++;
      return [candidate(versions.get("root")!)];
    },
    admit() {
      if (busy) throw new RootWorkPending(["host-available"]);
      return () => { releases++; };
    },
    discard() { discards++; },
    onPending(context) { pending = context; },
    commit() { commits++; },
  });
  equal(work.status, "pending", "busy admission settled terminally");
  equal(preparations, 1, "busy admission retried synchronously");
  equal(discards, 1, "busy candidate was not discarded");
  equal(commits, 0, "busy admission reached host application");
  equal(queue.getVersion("root"), 0, "busy admission advanced accepted version");
  assert(pending.tokens.includes("host-available"), "busy token was not exposed");
  busy = false;
  pending.resolve("host-available");
  equal(work.status, "committed", "availability did not retry work");
  equal(preparations, 2, "retry reused a stale candidate");
  equal(discards, 1, "committed candidate was discarded");
  equal(commits, 1, "retry did not commit once");
  equal(releases, 1, "successful admission claim was not released once");
  equal(queue.getVersion("root"), 1, "retry did not publish version");
  const later = queue.enqueue({ id: "later", roots: ["root"],
    prepare: ({ versions }) => [candidate(versions.get("root")!)],
    commit() { commits++; },
  });
  equal(later.status, "committed", "busy admission poisoned later work");
  equal(queue.getVersion("root"), 2, "later work did not advance the root");
});

Deno.test("cancellation during admission discards candidate without reaching commit", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  let work: ReturnType<typeof queue.enqueue>;
  let discards = 0;
  let commits = 0;
  let releases = 0;
  work = queue.enqueue({
    id: "cancel-at-admission", roots: ["root"], pending: ["start"],
    prepare: ({ versions }) => [candidate(versions.get("root")!)],
    admit() {
      work.cancel("cancelled inside admission");
      return () => { releases++; };
    },
    discard() { discards++; },
    commit() { commits++; },
  });
  equal(work.status, "pending", "start gate did not hold work");
  work.resolve("start");
  equal(work.status, "cancelled", "admission cancellation did not settle");
  equal(discards, 1, "cancelled candidate was not discarded exactly once");
  equal(commits, 0, "cancelled admission reached commit");
  equal(releases, 1, "cancelled admission claim was not released");
  equal(queue.getVersion("root"), 0, "cancelled admission advanced version");
});
