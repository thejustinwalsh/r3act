import { assertEquals, assertThrows } from "jsr:@std/assert";
import {
  type RootWorkCandidate,
  type RootWorkDefinition,
  RootWorkPending,
  RootWorkQueue,
  type RootWorkResolution,
} from "./root_work_queue.ts";

function candidate(
  rootId: string,
  baseVersion: number,
  targetVersion: number,
  value: string,
  validate?: () => boolean,
): RootWorkCandidate<string> {
  return { rootId, baseVersion, targetVersion, value, validate };
}

function makeWork(
  queue: RootWorkQueue<string>,
  id: string,
  roots: readonly string[],
  options: Partial<RootWorkDefinition<string>> = {},
) {
  const commits: string[][] = [];
  const definition: RootWorkDefinition<string> = {
    id,
    roots,
    pending: options.pending ?? ["ready"],
    prepare: options.prepare ?? (({ versions }) =>
      roots.map((rootId) => {
        const base = versions.get(rootId)!;
        return candidate(rootId, base, base + 1, `${id}:${rootId}`);
      })),
    commit: options.commit ?? ((items) => {
      commits.push(items.map((item) => item.value));
    }),
    ...(options.key !== undefined ? { key: options.key } : {}),
    ...(options.onStale ? { onStale: options.onStale } : {}),
    ...(options.discard ? { discard: options.discard } : {}),
    ...(options.afterCommit ? { afterCommit: options.afterCommit } : {}),
    ...(options.onSettled ? { onSettled: options.onSettled } : {}),
  };
  return { handle: queue.enqueue(definition), commits };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => resolve = done);
  return { promise, resolve };
}

Deno.test("independent root transitions publish in reverse task completion order", async () => {
  const queue = new RootWorkQueue<string>(
    new Map([[
      "root",
      0,
    ]]),
  );
  const slow = deferred<string>();
  const fast = deferred<string>();
  const commits: string[] = [];
  const make = (id: string, promise: Promise<string>) => {
    const handle = queue.enqueue({
      id,
      roots: ["root"],
      pending: ["task"],
      prepare: ({ versions }) => {
        const base = versions.get("root")!;
        return [candidate("root", base, base + 1, `${id}:${base}`)];
      },
      commit: (items) => commits.push(items[0].value),
    });
    void promise.then(() => handle.resolve("task"));
    return handle;
  };
  const slowWork = make("slow", slow.promise);
  const fastWork = make("fast", fast.promise);

  fast.resolve("fast");
  await fast.promise;
  await Promise.resolve();
  slow.resolve("slow");
  await slow.promise;
  await Promise.resolve();

  assertEquals(commits, ["fast:0", "slow:1"]);
  assertEquals(queue.getVersion("root"), 2);
  assertEquals(fastWork.status, "committed");
  assertEquals(slowWork.status, "committed");
});

Deno.test("three transitions sharing a root coexist; urgent commit rebases each", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  const prepared: string[] = [];
  const handles = ["a", "b", "c"].map((id) =>
    queue.enqueue({
      id,
      roots: ["root"],
      pending: ["done"],
      prepare: ({ versions, attempt }) => {
        prepared.push(`${id}@${versions.get("root")}/${attempt}`);
        const base = versions.get("root")!;
        return [candidate("root", base, base + 1, id)];
      },
      commit: () => {},
    })
  );

  assertEquals(queue.recordUrgentCommit("root"), 1);
  for (const handle of handles) handle.resolve("done");
  assertEquals(handles.map((handle) => handle.status), [
    "committed",
    "committed",
    "committed",
  ]);
  assertEquals(prepared, ["a@1/0", "b@2/0", "c@3/0"]);
  assertEquals(queue.getVersion("root"), 4);
});

Deno.test("explicit replacement key cancels only the matching transition", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  const first = makeWork(queue, "search-old", ["root"], { key: "search" });
  const unrelated = makeWork(queue, "like", ["root"]);
  const replacement = makeWork(queue, "search-new", ["root"], {
    key: "search",
  });

  assertEquals(first.handle.status, "cancelled");
  assertEquals(unrelated.handle.status, "pending");
  assertEquals(replacement.handle.status, "pending");
  unrelated.handle.resolve("ready");
  replacement.handle.resolve("ready");
  assertEquals(unrelated.handle.status, "committed");
  assertEquals(replacement.handle.status, "committed");
});

Deno.test("multi-root candidate validates and commits as one ordered boundary", () => {
  const queue = new RootWorkQueue<string>(new Map([["left", 3], ["right", 9]]));
  const log: string[] = [];
  const work = queue.enqueue({
    id: "group",
    roots: ["left", "right"],
    pending: ["io-a", "io-b"],
    prepare: ({ versions }) => [
      candidate("left", versions.get("left")!, 4, "left candidate", () => {
        log.push("validate-left");
        return true;
      }),
      candidate("right", versions.get("right")!, 10, "right candidate", () => {
        log.push("validate-right");
        return true;
      }),
    ],
    commit: (items) => {
      log.push(`commit:${items.map((item) => item.rootId).join(",")}`);
    },
    onSettled: ({ status }) => log.push(`notify:${status}`),
  });

  work.resolve("io-b");
  assertEquals(work.status, "pending");
  work.resolve("io-a");
  assertEquals(work.status, "committed");
  assertEquals(log, [
    "validate-left",
    "validate-right",
    "validate-left",
    "validate-right",
    "commit:left,right",
    "notify:committed",
  ]);
  assertEquals(queue.getVersion("left"), 4);
  assertEquals(queue.getVersion("right"), 10);
});

Deno.test("stale prepared candidate is rebuilt from current root version", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  const attempts: number[] = [];
  const work = queue.enqueue({
    id: "stale-then-fresh",
    roots: ["root"],
    pending: ["ready"],
    prepare: ({ attempt, versions }) => {
      attempts.push(attempt);
      if (attempt === 0) {
        // Simulate an urgent commit between candidate creation and validation.
        queue.recordUrgentCommit("root", 1);
        return [candidate("root", 0, 2, "old base")];
      }
      const base = versions.get("root")!;
      return [candidate("root", base, base + 1, "rebuilt")];
    },
    commit: (items) => assertEquals(items[0].value, "rebuilt"),
  });

  work.resolve("ready");
  assertEquals(attempts, [0, 1]);
  assertEquals(work.status, "committed");
  assertEquals(queue.getVersion("root"), 2);
});

Deno.test("false read-set validation rejects stale work with a clear hook", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 2]]));
  let staleReason = "";
  let commits = 0;
  const work = queue.enqueue({
    id: "stale-store-read",
    roots: ["root"],
    pending: ["ready"],
    prepare: ({ versions }) => {
      const base = versions.get("root")!;
      return [candidate("root", base, base + 1, "snapshot", () => false)];
    },
    commit: () => commits++,
    onStale: ({ reason }) => {
      staleReason = reason;
      return "reject";
    },
  });
  work.resolve("ready");
  assertEquals(work.status, "stale");
  assertEquals(staleReason, "Candidate read set is stale for root");
  assertEquals(commits, 0);
});

Deno.test("cancel, detach, and disposed handles do not publish candidates", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0], ["other", 0]]));
  let commits = 0;
  const cancel = queue.enqueue({
    id: "cancel-me",
    roots: ["root"],
    pending: ["a"],
    prepare: ({ versions }) => [
      candidate("root", versions.get("root")!, 1, "cancelled"),
    ],
    commit: () => commits++,
  });
  const detached = queue.enqueue({
    id: "detached-work",
    roots: ["root", "other"],
    pending: ["b"],
    prepare: ({ versions }) => [
      candidate("root", versions.get("root")!, 1, "root"),
      candidate("other", versions.get("other")!, 1, "other"),
    ],
    commit: () => commits++,
  });
  const survivor = queue.enqueue({
    id: "survivor",
    roots: ["other"],
    pending: ["c"],
    prepare: ({ versions }) => [
      candidate("other", versions.get("other")!, 1, "survivor"),
    ],
    commit: () => commits++,
  });

  cancel.cancel();
  assertEquals(queue.detachRoot("root"), 1);
  assertEquals(cancel.status, "cancelled");
  assertEquals(detached.status, "cancelled");
  assertEquals(detached.resolve("b").status, "stale");
  survivor.resolve("c");
  assertEquals(survivor.status, "committed");
  assertEquals(commits, 1);
  assertThrows(() => queue.getVersion("root"), Error);
});

Deno.test("a throwing grouped host commit terminally poisons its roots", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  const broken = queue.enqueue({
    id: "broken",
    roots: ["root"],
    pending: [],
    prepare: ({ versions }) => [
      candidate("root", versions.get("root")!, 1, "partial"),
    ],
    commit: () => {
      throw new Error("host failed after partial mutation");
    },
  });
  assertEquals(broken.status, "failed");
  assertEquals(
    broken.resolution.reason,
    "Grouped host commit failed; roots require remount",
  );

  const blocked = queue.enqueue({
    id: "blocked",
    roots: ["root"],
    pending: [],
    prepare: ({ versions }) => [
      candidate("root", versions.get("root")!, 1, "should-not-run"),
    ],
    commit: () => assertEquals(true, false),
  });
  assertEquals(blocked.status, "failed");
  assertEquals(queue.getVersion("root"), 0);
  queue.detachRoot("root");
  queue.attachRoot("root", 0);
  const remounted = makeWork(queue, "after-remount", ["root"], {
    pending: [],
  });
  assertEquals(remounted.handle.status, "committed");
});

Deno.test("throwing freshness validation fails work without poisoning the root", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  const broken = queue.enqueue({
    id: "bad-validator",
    roots: ["root"],
    pending: ["ready"],
    prepare: ({ versions }) => [
      candidate("root", versions.get("root")!, 1, "candidate", () => {
        throw new Error("store snapshot check failed");
      }),
    ],
    commit: () => assertEquals(true, false),
  });

  broken.resolve("ready");
  assertEquals(broken.status, "failed");
  assertEquals(
    broken.resolution.reason,
    "Candidate freshness validation failed",
  );

  const followup = makeWork(queue, "followup", ["root"], { pending: [] });
  assertEquals(followup.handle.status, "committed");
  assertEquals(queue.getVersion("root"), 1);
});

Deno.test("cancellation or detach during preparation cannot reach host commit", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  let cancelHandle: ReturnType<typeof queue.enqueue>;
  let cancelCommits = 0;
  cancelHandle = queue.enqueue({
    id: "cancel-in-prepare",
    roots: ["root"],
    pending: ["ready"],
    prepare: ({ versions }) => {
      cancelHandle.cancel("prepared work was abandoned");
      return [candidate("root", versions.get("root")!, 1, "cancelled")];
    },
    commit: () => cancelCommits++,
  });
  cancelHandle.resolve("ready");
  assertEquals(cancelHandle.status, "cancelled");
  assertEquals(cancelCommits, 0);

  const detachedQueue = new RootWorkQueue<string>(new Map([["root", 0]]));
  let detachedHandle: ReturnType<typeof detachedQueue.enqueue>;
  let detachCommits = 0;
  detachedHandle = detachedQueue.enqueue({
    id: "detach-in-prepare",
    roots: ["root"],
    pending: ["ready"],
    prepare: ({ versions }) => {
      detachedQueue.detachRoot("root");
      return [candidate("root", versions.get("root")!, 1, "detached")];
    },
    commit: () => detachCommits++,
  });
  detachedHandle.resolve("ready");
  assertEquals(detachedHandle.status, "cancelled");
  assertEquals(detachCommits, 0);
});

Deno.test("cancellation or detach during validation prevents publication", () => {
  const cancelQueue = new RootWorkQueue<string>(new Map([["root", 0]]));
  let cancelHandle: ReturnType<typeof cancelQueue.enqueue>;
  let cancelCommits = 0;
  cancelHandle = cancelQueue.enqueue({
    id: "cancel-in-validate",
    roots: ["root"],
    pending: ["ready"],
    prepare: ({ versions }) => [
      candidate("root", versions.get("root")!, 1, "cancelled", () => {
        cancelHandle.cancel();
        return true;
      }),
    ],
    commit: () => cancelCommits++,
  });
  cancelHandle.resolve("ready");
  assertEquals(cancelHandle.status, "cancelled");
  assertEquals(cancelCommits, 0);

  const detachQueue = new RootWorkQueue<string>(new Map([["root", 0]]));
  let detachHandle: ReturnType<typeof detachQueue.enqueue>;
  let detachCommits = 0;
  detachHandle = detachQueue.enqueue({
    id: "detach-in-validate",
    roots: ["root"],
    pending: ["ready"],
    prepare: ({ versions }) => [
      candidate("root", versions.get("root")!, 1, "detached", () => {
        detachQueue.detachRoot("root");
        return true;
      }),
    ],
    commit: () => detachCommits++,
  });
  detachHandle.resolve("ready");
  assertEquals(detachHandle.status, "cancelled");
  assertEquals(detachCommits, 0);
});

Deno.test("cancellation or detach in the stale hook stops retries", () => {
  const cancelQueue = new RootWorkQueue<string>(new Map([["root", 0]]));
  let cancelHandle: ReturnType<typeof cancelQueue.enqueue>;
  let cancelCommits = 0;
  cancelHandle = cancelQueue.enqueue({
    id: "cancel-in-stale-hook",
    roots: ["root"],
    pending: ["ready"],
    prepare: ({ versions }) => [
      candidate("root", versions.get("root")!, 1, "stale", () => false),
    ],
    commit: () => cancelCommits++,
    onStale: () => {
      cancelHandle.cancel();
      return "retry";
    },
  });
  cancelHandle.resolve("ready");
  assertEquals(cancelHandle.status, "cancelled");
  assertEquals(cancelCommits, 0);

  const detachQueue = new RootWorkQueue<string>(new Map([["root", 0]]));
  let detachHandle: ReturnType<typeof detachQueue.enqueue>;
  let detachCommits = 0;
  detachHandle = detachQueue.enqueue({
    id: "detach-in-stale-hook",
    roots: ["root"],
    pending: ["ready"],
    prepare: ({ versions }) => [
      candidate("root", versions.get("root")!, 1, "stale", () => false),
    ],
    commit: () => detachCommits++,
    onStale: () => {
      detachQueue.detachRoot("root");
      return "retry";
    },
  });
  detachHandle.resolve("ready");
  assertEquals(detachHandle.status, "cancelled");
  assertEquals(detachCommits, 0);
});

Deno.test("root and pending routing arrays are copied when work is enqueued", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0], ["other", 0]]));
  const roots = ["root"];
  const pending = ["ready"];
  let committedRoots: string[] = [];
  const work = queue.enqueue({
    id: "immutable-routing",
    roots,
    pending,
    prepare: ({ versions }) => {
      const base = versions.get("root")!;
      return [candidate("root", base, base + 1, "root")];
    },
    commit: (items) => committedRoots = items.map(({ rootId }) => rootId),
  });

  roots[0] = "other";
  roots.push("other");
  pending[0] = "wrong-token";
  pending.push("another-token");
  assertEquals(work.resolve("ready").status, "committed");
  assertEquals(committedRoots, ["root"]);
  assertEquals(queue.getVersion("root"), 1);
  assertEquals(queue.getVersion("other"), 0);
});

Deno.test("validator urgent commit is detected and causes a fresh preparation", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  let validations = 0;
  const attempts: number[] = [];
  const work = queue.enqueue({
    id: "urgent-during-validation",
    roots: ["root"],
    pending: ["ready"],
    prepare: ({ attempt, versions }) => {
      attempts.push(attempt);
      const base = versions.get("root")!;
      return [candidate("root", base, base + 1, `v${base}`, () => {
        if (validations++ === 0) queue.recordUrgentCommit("root");
        return true;
      })];
    },
    commit: (items) => assertEquals(items[0].value, "v1"),
  });
  work.resolve("ready");
  assertEquals(attempts, [0, 1]);
  assertEquals(work.status, "committed");
  assertEquals(queue.getVersion("root"), 2);
});

Deno.test("later root validation cannot stale an earlier root unnoticed", () => {
  const queue = new RootWorkQueue<string>(new Map([["a", 0], ["b", 0]]));
  const attempts: number[] = [];
  let advancedA = false;
  const work = queue.enqueue({
    id: "cross-root-validator",
    roots: ["a", "b"],
    pending: ["ready"],
    prepare: ({ attempt, versions }) => {
      attempts.push(attempt);
      const baseA = versions.get("a")!;
      const baseB = versions.get("b")!;
      return [
        candidate("a", baseA, baseA + 1, `a${baseA}`, () => true),
        candidate("b", baseB, baseB + 1, `b${baseB}`, () => {
          if (!advancedA) {
            advancedA = true;
            queue.recordUrgentCommit("a");
          }
          return true;
        }),
      ];
    },
    commit: (items) =>
      assertEquals(items.map(({ value }) => value), ["a1", "b0"]),
  });
  work.resolve("ready");
  assertEquals(attempts, [0, 1]);
  assertEquals(work.status, "committed");
  assertEquals(queue.getVersion("a"), 2);
  assertEquals(queue.getVersion("b"), 1);
});

Deno.test("cancel and keyed replacement during commit preserve committed outcome", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  const order: string[] = [];
  let first: ReturnType<typeof queue.enqueue>;
  let replacement: ReturnType<typeof queue.enqueue>;
  first = queue.enqueue({
    id: "first",
    roots: ["root"],
    key: "navigation",
    pending: ["ready"],
    prepare: ({ versions }) => {
      const base = versions.get("root")!;
      return [candidate("root", base, base + 1, "first")];
    },
    commit: () => {
      order.push("first:commit");
      first.cancel("too late to cancel");
      assertEquals(first.status, "pending");
      replacement = queue.enqueue({
        id: "replacement",
        roots: ["root"],
        key: "navigation",
        pending: [],
        prepare: ({ versions }) => {
          const base = versions.get("root")!;
          return [candidate("root", base, base + 1, "replacement")];
        },
        commit: () => order.push("replacement:commit"),
      });
      assertEquals(first.status, "pending");
      assertEquals(replacement.status, "pending");
    },
  });
  first.resolve("ready");
  assertEquals(first.status, "committed");
  assertEquals(replacement!.status, "committed");
  assertEquals(order, ["first:commit", "replacement:commit"]);
  assertEquals(queue.getVersion("root"), 2);
});

Deno.test("discard releases stale retry candidates but not committed candidates", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  const discarded: string[] = [];
  const attempts: number[] = [];
  let validations = 0;
  const work = queue.enqueue({
    id: "discard-on-retry",
    roots: ["root"],
    pending: ["ready"],
    prepare: ({ attempt, versions }) => {
      attempts.push(attempt);
      const base = versions.get("root")!;
      return [
        candidate(
          "root",
          base,
          base + 1,
          attempt === 0 ? "stale" : "fresh",
          () => {
            if (attempt === 0 && validations++ === 1) {
              queue.recordUrgentCommit("root");
            }
            return true;
          },
        ),
      ];
    },
    discard: ({ value }) => discarded.push(value),
    commit: (items) => assertEquals(items[0].value, "fresh"),
  });

  work.resolve("ready");
  assertEquals(work.status, "committed");
  assertEquals(attempts, [0, 1]);
  assertEquals(discarded, ["stale"]);
});

Deno.test("discard runs on rejection and validation errors without changing settlement", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  const discarded: string[] = [];
  const rejected = queue.enqueue({
    id: "discard-on-reject",
    roots: ["root"],
    pending: ["ready"],
    prepare: ({ versions }) => [
      candidate("root", versions.get("root")!, 1, "rejected", () => false),
    ],
    discard: ({ value }) => discarded.push(value),
    commit: () => assertEquals(true, false),
    onStale: () => "reject",
  });
  rejected.resolve("ready");
  assertEquals(rejected.status, "stale");

  const invalid = queue.enqueue({
    id: "discard-on-validation-error",
    roots: ["root"],
    pending: ["ready"],
    prepare: ({ versions }) => [
      candidate("root", versions.get("root")!, 1, "invalid", () => {
        throw new Error("validation failed");
      }),
    ],
    discard: ({ value }) => discarded.push(value),
    commit: () => assertEquals(true, false),
  });
  invalid.resolve("ready");
  assertEquals(invalid.status, "failed");
  assertEquals(discarded, ["rejected", "invalid"]);
});

Deno.test("discard runs after reentrant cancellation during prepare and validation", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  const discarded: string[] = [];
  let duringPrepare: ReturnType<typeof queue.enqueue>;
  duringPrepare = queue.enqueue({
    id: "discard-after-prepare-cancel",
    roots: ["root"],
    pending: ["ready"],
    prepare: ({ versions }) => {
      duringPrepare.cancel();
      return [candidate("root", versions.get("root")!, 1, "prepare")];
    },
    discard: ({ value }) => discarded.push(value),
    commit: () => assertEquals(true, false),
  });
  duringPrepare.resolve("ready");

  let duringValidation: ReturnType<typeof queue.enqueue>;
  duringValidation = queue.enqueue({
    id: "discard-after-validation-cancel",
    roots: ["root"],
    pending: ["ready"],
    prepare: ({ versions }) => [
      candidate("root", versions.get("root")!, 1, "validation", () => {
        duringValidation.cancel();
        return true;
      }),
    ],
    discard: ({ value }) => discarded.push(value),
    commit: () => assertEquals(true, false),
  });
  duringValidation.resolve("ready");

  assertEquals(duringPrepare.status, "cancelled");
  assertEquals(duringValidation.status, "cancelled");
  assertEquals(discarded, ["prepare", "validation"]);
});

Deno.test("failed host publication discards all candidates and reports cleanup errors", () => {
  const reported: unknown[] = [];
  const queue = new RootWorkQueue<string>(
    new Map([["left", 0], ["right", 0]]),
    2,
    (error) => reported.push(error),
  );
  const discarded: string[] = [];
  let settledAfterCleanup = false;
  const failed = queue.enqueue({
    id: "discard-after-host-failure",
    roots: ["left", "right"],
    pending: [],
    prepare: ({ versions }) => [
      candidate("left", versions.get("left")!, 1, "left"),
      candidate("right", versions.get("right")!, 1, "right"),
    ],
    discard: ({ value }) => {
      discarded.push(value);
      if (value === "left") throw new Error("left cleanup failed");
    },
    onSettled: () => settledAfterCleanup = discarded.length === 2,
    commit: () => {
      throw new Error("host failed");
    },
  });

  assertEquals(failed.status, "failed");
  assertEquals(
    failed.resolution.reason,
    "Grouped host commit failed; roots require remount",
  );
  assertEquals(discarded, ["left", "right"]);
  assertEquals(settledAfterCleanup, true);
  assertEquals(reported.length, 1);
  assertEquals((reported[0] as Error).message, "left cleanup failed");
});

Deno.test("afterCommit sees all published versions before onSettled", () => {
  const queue = new RootWorkQueue<string>(new Map([["left", 3], ["right", 9]]));
  const order: string[] = [];
  let handle: ReturnType<typeof queue.enqueue>;
  let afterCommitCalls = 0;
  handle = queue.enqueue({
    id: "after-publish-group",
    roots: ["left", "right"],
    pending: ["ready"],
    prepare: ({ versions }) => [
      candidate("left", versions.get("left")!, 4, "left"),
      candidate("right", versions.get("right")!, 10, "right"),
    ],
    commit: () => order.push("commit"),
    afterCommit: (items) => {
      afterCommitCalls++;
      order.push(
        `after:${handle.status}:${queue.getVersion("left")},${
          queue.getVersion("right")
        }:${items.length}`,
      );
    },
    onSettled: ({ status }) => {
      order.push(`settled:${status}`);
      assertThrows(() => queue.recordRootCommit("left", 5), Error);
    },
  });

  handle.resolve("ready");
  assertEquals(handle.status, "committed");
  assertEquals(afterCommitCalls, 1);
  assertEquals(order, [
    "commit",
    "after:committed:4,10:2",
    "settled:committed",
  ]);
});

Deno.test("afterCommit errors preserve publication and still notify settlement", () => {
  const reported: unknown[] = [];
  const queue = new RootWorkQueue<string>(
    new Map([["root", 0]]),
    2,
    (error) => {
      reported.push(error);
    },
  );
  let afterCommitCalls = 0;
  const notifications: string[] = [];
  const work = queue.enqueue({
    id: "throwing-after-commit",
    roots: ["root"],
    pending: [],
    prepare: ({ versions }) => [
      candidate("root", versions.get("root")!, 1, "published"),
    ],
    commit: () => {},
    afterCommit: () => {
      afterCommitCalls++;
      throw new Error("effect failed");
    },
    onSettled: ({ status }) => notifications.push(status),
  });

  assertEquals(work.status, "committed");
  assertEquals(queue.getVersion("root"), 1);
  assertEquals(afterCommitCalls, 1);
  assertEquals(notifications, ["committed"]);
  assertEquals((reported[0] as Error).message, "effect failed");
});

Deno.test("afterCommit can enqueue follow-up work but cannot cancel or republish its group", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  let first: ReturnType<typeof queue.enqueue>;
  let followup: ReturnType<typeof queue.enqueue>;
  const attempts: string[] = [];
  first = queue.enqueue({
    id: "published-first",
    roots: ["root"],
    pending: ["ready"],
    prepare: ({ versions }) => {
      const base = versions.get("root")!;
      attempts.push(`first:${base}`);
      return [candidate("root", base, base + 1, "first")];
    },
    commit: () => {},
    afterCommit: () => {
      assertEquals(first.cancel("too late").status, "committed");
      assertThrows(() => queue.recordRootCommit("root", 2), Error);
      assertThrows(() => queue.detachRoot("root"), Error);
      followup = queue.enqueue({
        id: "published-followup",
        roots: ["root"],
        pending: [],
        prepare: ({ versions }) => {
          const base = versions.get("root")!;
          attempts.push(`followup:${base}`);
          return [candidate("root", base, base + 1, "followup")];
        },
        commit: () => {},
      });
      assertEquals(followup.status, "pending");
    },
  });

  first.resolve("ready");
  assertEquals(first.status, "committed");
  assertEquals(followup!.status, "committed");
  assertEquals(attempts, ["first:0", "followup:1"]);
  assertEquals(queue.getVersion("root"), 2);
});

Deno.test("dynamic pending resumes preparation across independent resource waves", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  const attempts: number[] = [];
  const pendingContexts: Array<{
    tokens: readonly string[];
    resolve(token: string): RootWorkResolution;
    refresh(): RootWorkResolution;
  }> = [];
  let commits = 0;
  const work = queue.enqueue({
    id: "resource-waves",
    roots: ["root"],
    pending: ["task"],
    prepare: ({ attempt, versions }) => {
      attempts.push(attempt);
      if (attempts.length === 1) throw new RootWorkPending(["image"]);
      if (attempts.length === 2) {
        throw new RootWorkPending(["font", "stylesheet"]);
      }
      const base = versions.get("root")!;
      return [candidate("root", base, base + 1, "ready")];
    },
    onPending: (context) => pendingContexts.push(context),
    commit: () => commits++,
  });

  assertEquals(work.status, "pending");
  assertEquals(attempts, []);
  work.resolve("task");
  assertEquals(attempts, [0]);
  assertEquals(pendingContexts[0].tokens, ["image"]);
  assertEquals(pendingContexts[0].resolve("image").status, "pending");
  assertEquals(attempts, [0, 0]);
  assertEquals(pendingContexts[1].tokens, ["font", "stylesheet"]);
  assertEquals(pendingContexts[1].resolve("font").status, "pending");
  assertEquals(work.status, "pending");
  assertEquals(pendingContexts[1].resolve("stylesheet").status, "committed");
  assertEquals(attempts, [0, 0, 0]);
  assertEquals(commits, 1);
});

Deno.test("synchronous dynamic resolution queues another prepare without recursion", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  let prepareDepth = 0;
  let maximumDepth = 0;
  let prepareCalls = 0;
  let onPendingCalls = 0;
  const work = queue.enqueue({
    id: "sync-resource",
    roots: ["root"],
    pending: [],
    prepare: ({ versions }) => {
      prepareDepth++;
      maximumDepth = Math.max(maximumDepth, prepareDepth);
      try {
        prepareCalls++;
        if (prepareCalls === 1) throw new RootWorkPending(["cached"]);
        const base = versions.get("root")!;
        return [candidate("root", base, base + 1, "ready")];
      } finally {
        prepareDepth--;
      }
    },
    onPending: ({ tokens, resolve }) => {
      onPendingCalls++;
      assertEquals(tokens, ["cached"]);
      assertEquals(resolve("cached").status, "pending");
    },
    commit: () => {},
  });

  assertEquals(work.status, "committed");
  assertEquals(prepareCalls, 2);
  assertEquals(onPendingCalls, 1);
  assertEquals(maximumDepth, 1);
});

Deno.test("refresh reopens only dynamic waits and preserves static task gates", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  let prepareCalls = 0;
  let staleResolve: (() => RootWorkResolution) | undefined;
  const work = queue.enqueue({
    id: "refresh-dynamic-only",
    roots: ["root"],
    pending: ["task"],
    prepare: ({ versions }) => {
      prepareCalls++;
      if (prepareCalls === 1) throw new RootWorkPending(["resource"]);
      const base = versions.get("root")!;
      return [candidate("root", base, base + 1, "ready")];
    },
    onPending: ({ resolve }) => staleResolve = () => resolve("resource"),
    commit: () => {},
  });

  assertEquals(work.refresh().status, "stale");
  assertEquals(prepareCalls, 0);
  work.resolve("task");
  assertEquals(prepareCalls, 1);
  assertEquals(work.refresh().status, "committed");
  assertEquals(prepareCalls, 2);
  assertEquals(staleResolve!().status, "stale");
  assertEquals(work.status, "committed");
});

Deno.test("pending context refresh invalidates its token generation", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  let contextRefresh!: () => RootWorkResolution;
  let resolveOldToken!: (token: string) => RootWorkResolution;
  let prepareCalls = 0;
  const work = queue.enqueue({
    id: "context-refresh",
    roots: ["root"],
    pending: [],
    prepare: ({ versions }) => {
      prepareCalls++;
      if (prepareCalls === 1) throw new RootWorkPending(["resource"]);
      const base = versions.get("root")!;
      return [candidate("root", base, base + 1, "ready")];
    },
    onPending: (context) => {
      contextRefresh = context.refresh;
      resolveOldToken = context.resolve;
    },
    commit: () => {},
  });

  assertEquals(contextRefresh().status, "committed");
  assertEquals(resolveOldToken("resource").status, "stale");
  assertEquals(prepareCalls, 2);
  assertEquals(work.status, "committed");
});

Deno.test("cancellation and detach invalidate outstanding dynamic resource callbacks", () => {
  const cancelQueue = new RootWorkQueue<string>(new Map([["root", 0]]));
  let cancelResolve!: (token: string) => RootWorkResolution;
  const cancelled = cancelQueue.enqueue({
    id: "cancel-resource-wait",
    roots: ["root"],
    pending: [],
    prepare: () => {
      throw new RootWorkPending(["resource"]);
    },
    onPending: ({ resolve }) => cancelResolve = resolve,
    commit: () => assertEquals(true, false),
  });
  cancelled.cancel("resource no longer needed");
  assertEquals(cancelled.status, "cancelled");
  assertEquals(cancelResolve("resource").status, "stale");

  const detachQueue = new RootWorkQueue<string>(new Map([["root", 0]]));
  let detachResolve!: (token: string) => RootWorkResolution;
  const detached = detachQueue.enqueue({
    id: "detach-resource-wait",
    roots: ["root"],
    pending: [],
    prepare: () => {
      throw new RootWorkPending(["resource"]);
    },
    onPending: ({ resolve }) => detachResolve = resolve,
    commit: () => assertEquals(true, false),
  });
  assertEquals(detachQueue.detachRoot("root"), 1);
  assertEquals(detached.status, "cancelled");
  assertEquals(detachResolve("resource").status, "stale");
});

Deno.test("pending subscription failure settles failed and source errors stay ordinary failures", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  const settled: string[] = [];
  let pendingCalls = 0;
  const subscriptionError = queue.enqueue({
    id: "subscription-error",
    roots: ["root"],
    pending: [],
    prepare: () => {
      throw new RootWorkPending(["resource"]);
    },
    onPending: () => {
      pendingCalls++;
      throw new Error("subscribe failed");
    },
    commit: () => assertEquals(true, false),
    onSettled: ({ status }) => settled.push(status),
  });
  assertEquals(subscriptionError.status, "failed");
  assertEquals(
    subscriptionError.resolution.reason,
    "Dynamic resource subscription failed",
  );

  const sourceError = queue.enqueue({
    id: "ordinary-source-error",
    roots: ["root"],
    pending: [],
    prepare: () => {
      throw new Error("source preparation failed");
    },
    onPending: () => pendingCalls++,
    commit: () => assertEquals(true, false),
    onSettled: ({ status }) => settled.push(status),
  });
  assertEquals(sourceError.status, "failed");
  assertEquals(sourceError.resolution.reason, "Candidate preparation failed");
  assertEquals(pendingCalls, 1);
  assertEquals(settled, ["failed", "failed"]);
});

Deno.test("dynamic waits coexist with same-root work and keyed replacement", () => {
  const queue = new RootWorkQueue<string>(new Map([["root", 0]]));
  let lateResolve!: (token: string) => RootWorkResolution;
  let waitingPrepares = 0;
  const waiting = queue.enqueue({
    id: "waiting-old-route",
    key: "route",
    roots: ["root"],
    pending: [],
    prepare: () => {
      waitingPrepares++;
      throw new RootWorkPending(["slow-resource"]);
    },
    onPending: ({ resolve }) => lateResolve = resolve,
    commit: () => assertEquals(true, false),
  });
  const independent = makeWork(queue, "independent-during-wait", ["root"], {
    pending: [],
  });
  assertEquals(independent.handle.status, "committed");
  assertEquals(queue.getVersion("root"), 1);

  const replacement = makeWork(queue, "replacement-route", ["root"], {
    key: "route",
    pending: [],
  });
  assertEquals(waiting.status, "cancelled");
  assertEquals(replacement.handle.status, "committed");
  assertEquals(queue.getVersion("root"), 2);
  assertEquals(lateResolve("slow-resource").status, "stale");
  assertEquals(waitingPrepares, 1);
});

Deno.test("RootWorkPending snapshots unique nonempty token IDs", () => {
  const pending = new RootWorkPending(["a", "b"]);
  assertEquals(pending.tokens, ["a", "b"]);
  assertEquals(Object.isFrozen(pending.tokens), true);
  assertThrows(() => new RootWorkPending([]), RangeError);
  assertThrows(() => new RootWorkPending([""]), Error);
  assertThrows(() => new RootWorkPending(["same", "same"]), Error);
});
