import {
  createOptimisticFeedStore,
  optimisticFeedActions as actions,
  optimisticLikeCount,
} from "./optimistic_feed.ts";
import type { OptimisticFeedState } from "./optimistic_feed.ts";

const assert: (condition: unknown, message?: string) => asserts condition = (
  condition,
  message = "Assertion failed",
) => {
  if (!condition) throw new Error(message);
};

const equal = (actual: unknown, expected: unknown, message?: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(
      message ?? `Expected ${String(expected)}, got ${String(actual)}`,
    );
  }
};

const throws = (callback: () => unknown, message: string) => {
  let didThrow = false;
  try {
    callback();
  } catch {
    didThrow = true;
  }
  assert(didThrow, message);
};

const item = (state: OptimisticFeedState, id: string) => {
  const found = state.items.find((candidate) => candidate.id === id);
  assert(found, `Missing item ${id}`);
  return found;
};

Deno.test("optimistic posts confirm and compensate by operation ID despite out-of-order receipts", () => {
  const store = createOptimisticFeedStore([
    { id: "server-1", text: "Original", serverId: "remote-1" },
  ]);
  actions.beginPost(store, "post-a", "draft-a", "First draft");
  actions.beginPost(store, "post-b", "draft-b", "Second draft");
  actions.editText(store, "server-1", "Urgent edit while requests are pending");
  actions.publishUrgentPost(store, "urgent-1", "Urgent post");

  // B confirms before A's failure arrives. Each terminal outcome touches only
  // the item owned by its operation; the urgent actions remain independent.
  actions.confirmPost(store, "post-b", "remote-b");
  actions.compensate(store, "post-a");
  const state = store.getState();
  equal(state.operations["post-a"]?.status, "compensated");
  equal(state.operations["post-b"]?.status, "confirmed");
  equal(state.operations["post-b"]?.kind, "post");
  equal(item(state, "draft-b").source, "server");
  equal(item(state, "draft-b").serverId, "remote-b");
  equal(state.items.some((candidate) => candidate.id === "draft-a"), false);
  equal(item(state, "server-1").text, "Urgent edit while requests are pending");
  equal(item(state, "urgent-1").text, "Urgent post");

  const version = store.version;
  actions.confirmPost(store, "post-b", "remote-b");
  actions.compensate(store, "post-a");
  actions.confirmPost(store, "post-a", "late-remote-a");
  equal(
    store.version,
    version,
    "Repeated and late terminal actions must be referential no-ops",
  );
  equal(store.getState().operations["post-a"]?.status, "compensated");
  equal(
    store.getState().items.some((candidate) => candidate.id === "draft-a"),
    false,
  );
});

Deno.test("two optimistic likes on one item contribute and roll back independently", () => {
  const store = createOptimisticFeedStore([
    { id: "story", text: "A shared story", confirmedLikes: 4 },
  ]);
  actions.beginLike(store, "like-a", "story");
  actions.beginLike(store, "like-b", "story");
  equal(optimisticLikeCount(item(store.getState(), "story")), 6);

  // Resolve B first, then compensate A. Confirmed B remains while only A's
  // pending contribution disappears.
  actions.confirmLike(store, "like-b", "receipt-b");
  actions.compensate(store, "like-a");
  let story = item(store.getState(), "story");
  equal(story.confirmedLikes, 5);
  equal(story.pendingLikeOperationIds.length, 0);
  equal(optimisticLikeCount(story), 5);
  equal(store.getState().operations["like-a"]?.status, "compensated");
  equal(store.getState().operations["like-b"]?.status, "confirmed");

  const version = store.version;
  actions.confirmLike(store, "like-b", "receipt-b");
  actions.compensate(store, "like-a");
  actions.compensate(store, "like-b");
  story = item(store.getState(), "story");
  equal(
    store.version,
    version,
    "Terminal like actions must not change the store twice",
  );
  equal(story.confirmedLikes, 5);
  equal(optimisticLikeCount(story), 5);
});

Deno.test("repeating a dispatch after a notification throws does not duplicate its operation", () => {
  const store = createOptimisticFeedStore();
  const unsubscribe = store.subscribe("throwing-root", () => {
    throw new Error("subscriber failed after publication");
  });

  throws(
    () => actions.beginPost(store, "post-once", "item-once", "Visible once"),
    "The throwing subscriber should make dispatch report its notification error",
  );
  equal(
    store.getState().items.length,
    1,
    "The action should already be committed when notification reports failure",
  );
  equal(store.getState().operations["post-once"]?.status, "pending");
  const beginVersion = store.version;

  unsubscribe();
  equal(
    actions.beginPost(store, "post-once", "item-once", "Visible once"),
    false,
  );
  equal(
    store.version,
    beginVersion,
    "Retrying the same begin action must be a no-op",
  );
  equal(store.getState().items.length, 1);

  const unsubscribeConfirm = store.subscribe("throwing-root-2", () => {
    throw new Error("subscriber failed after receipt publication");
  });
  throws(
    () => actions.confirmPost(store, "post-once", "remote-once"),
    "The throwing subscriber should report confirmation notification failure",
  );
  equal(store.getState().operations["post-once"]?.status, "confirmed");
  equal(item(store.getState(), "item-once").serverId, "remote-once");
  const confirmVersion = store.version;

  unsubscribeConfirm();
  equal(actions.confirmPost(store, "post-once", "remote-once"), false);
  equal(
    store.version,
    confirmVersion,
    "Retrying the same receipt must not apply it twice",
  );
  equal(store.getState().items.length, 1);
  equal(item(store.getState(), "item-once").source, "server");
});

Deno.test("optimistic IDs reject conflicting reuse and missing-item likes", () => {
  const store = createOptimisticFeedStore([{
    id: "existing",
    text: "Existing",
  }]);
  actions.beginPost(store, "operation-1", "draft", "Draft");
  throws(
    () => actions.beginLike(store, "operation-1", "existing"),
    "An operation ID cannot switch from post to like",
  );
  throws(
    () => actions.beginLike(store, "missing-like", "absent"),
    "A like operation requires an existing feed item",
  );
  equal(store.getState().items.length, 2);
  equal(store.getState().operations["operation-1"]?.kind, "post");
});

Deno.test("prototype-named operation IDs are ordinary operation keys", () => {
  const store = createOptimisticFeedStore();
  actions.beginPost(store, "__proto__", "item-proto", "Prototype-safe post");
  actions.beginLike(store, "constructor", "item-proto");
  actions.beginPost(store, "toString", "item-string", "String-key post");

  equal(Object.getPrototypeOf(store.getState().operations), null);
  equal(store.getState().operations["__proto__"]?.kind, "post");
  equal(store.getState().operations["constructor"]?.kind, "like");
  equal(store.getState().operations["toString"]?.kind, "post");

  actions.confirmPost(store, "__proto__", "remote-proto");
  actions.compensate(store, "constructor");
  actions.compensate(store, "toString");
  equal(store.getState().operations["__proto__"]?.status, "confirmed");
  equal(store.getState().operations["constructor"]?.status, "compensated");
  equal(store.getState().operations["toString"]?.status, "compensated");
  equal(item(store.getState(), "item-proto").serverId, "remote-proto");
  equal(
    store.getState().items.some((candidate) => candidate.id === "item-string"),
    false,
  );
});

Deno.test("post compensation leaves like outcomes independently settleable", () => {
  const store = createOptimisticFeedStore();
  actions.beginPost(store, "post-op", "temporary-post", "Temporary");
  actions.beginLike(store, "like-cancel", "temporary-post");
  actions.beginLike(store, "like-receipt", "temporary-post");

  actions.compensate(store, "post-op");
  equal(
    store.getState().items.some((candidate) =>
      candidate.id === "temporary-post"
    ),
    false,
  );
  equal(store.getState().operations["post-op"]?.status, "compensated");
  equal(store.getState().operations["like-cancel"]?.status, "pending");
  equal(store.getState().operations["like-receipt"]?.status, "pending");

  // Like operations are independent: callers settle them separately. A late
  // receipt after the target disappeared is recorded without resurrecting it.
  actions.compensate(store, "like-cancel");
  actions.confirmLike(store, "like-receipt", "late-like-receipt");
  equal(store.getState().operations["like-cancel"]?.status, "compensated");
  equal(store.getState().operations["like-receipt"]?.status, "confirmed");
  equal(store.getState().operations["like-receipt"]?.kind, "like");
  equal(
    store.getState().items.some((candidate) =>
      candidate.id === "temporary-post"
    ),
    false,
  );
  equal(store.getState().items.length, 0);

  const version = store.version;
  actions.confirmLike(store, "like-receipt", "late-like-receipt");
  actions.compensate(store, "like-cancel");
  equal(store.version, version);
  equal(store.getState().items.length, 0);
});
