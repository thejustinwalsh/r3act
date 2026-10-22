import { createAsyncStore } from "./async_store_runtime.ts";
import type { AsyncStore } from "./async_store_runtime.ts";

export type OperationId = string;
export type FeedItemId = string;

export type FeedItem = Readonly<{
  id: FeedItemId;
  text: string;
  source: "server" | "optimistic" | "urgent";
  /** Set only for a post inserted by an optimistic operation. */
  postOperationId?: OperationId;
  serverId?: string;
  confirmedLikes: number;
  /** One visible optimistic like contribution per operation. */
  pendingLikeOperationIds: readonly OperationId[];
}>;

export type OptimisticPostOperation = Readonly<{
  id: OperationId;
  kind: "post";
  itemId: FeedItemId;
  text: string;
  status: "pending" | "confirmed" | "compensated";
  receipt?: Readonly<{ serverItemId: string }>;
}>;

export type OptimisticLikeOperation = Readonly<{
  id: OperationId;
  kind: "like";
  itemId: FeedItemId;
  status: "pending" | "confirmed" | "compensated";
  receipt?: Readonly<{ serverLikeId: string }>;
}>;

export type OptimisticOperation =
  | OptimisticPostOperation
  | OptimisticLikeOperation;

export type OptimisticFeedState = Readonly<{
  items: readonly FeedItem[];
  operations: Readonly<Record<OperationId, OptimisticOperation>>;
}>;

export type OptimisticFeedAction =
  | Readonly<{
    type: "begin-post";
    operationId: OperationId;
    itemId: FeedItemId;
    text: string;
  }>
  | Readonly<{
    type: "begin-like";
    operationId: OperationId;
    itemId: FeedItemId;
  }>
  | Readonly<{
    type: "confirm-post";
    operationId: OperationId;
    serverItemId: string;
  }>
  | Readonly<{
    type: "confirm-like";
    operationId: OperationId;
    serverLikeId: string;
  }>
  | Readonly<{ type: "compensate"; operationId: OperationId }>
  | Readonly<{ type: "edit-text"; itemId: FeedItemId; text: string }>
  | Readonly<{ type: "publish-urgent-post"; itemId: FeedItemId; text: string }>;

export type OptimisticFeedStore = AsyncStore<
  OptimisticFeedState,
  OptimisticFeedAction
>;

export type OptimisticFeedSeed = Readonly<{
  id: FeedItemId;
  text: string;
  confirmedLikes?: number;
  serverId?: string;
}>;

const operationRecord = (
  state: OptimisticFeedState,
  operation: OptimisticOperation,
): Readonly<Record<OperationId, OptimisticOperation>> => {
  const operations = Object.assign(
    Object.create(null) as Record<OperationId, OptimisticOperation>,
    state.operations,
  );
  operations[operation.id] = operation;
  return operations;
};

const findItem = (state: OptimisticFeedState, itemId: FeedItemId) =>
  state.items.findIndex((item) => item.id === itemId);

const withItem = (
  state: OptimisticFeedState,
  itemId: FeedItemId,
  update: (item: FeedItem) => FeedItem,
): OptimisticFeedState => {
  const index = findItem(state, itemId);
  if (index < 0) return state;
  const previous = state.items[index]!;
  const next = update(previous);
  if (next === previous) return state;
  const items = [...state.items];
  items[index] = next;
  return { ...state, items };
};

function sameOperationIdentity(
  current: OptimisticOperation,
  kind: OptimisticOperation["kind"],
  itemId: FeedItemId,
): boolean {
  return current.kind === kind && current.itemId === itemId;
}

function setOperation(
  state: OptimisticFeedState,
  operation: OptimisticOperation,
): OptimisticFeedState {
  if (state.operations[operation.id] === operation) return state;
  return { ...state, operations: operationRecord(state, operation) };
}

function reducer(
  state: OptimisticFeedState,
  action: OptimisticFeedAction,
): OptimisticFeedState {
  switch (action.type) {
    case "begin-post": {
      const prior = state.operations[action.operationId];
      if (prior) {
        if (
          !sameOperationIdentity(prior, "post", action.itemId) ||
          prior.kind === "post" && prior.text !== action.text
        ) {
          throw new Error(
            `Operation ID is already assigned: ${action.operationId}`,
          );
        }
        return state;
      }
      if (findItem(state, action.itemId) >= 0) {
        throw new Error(`Feed item ID is already assigned: ${action.itemId}`);
      }
      const operation: OptimisticPostOperation = {
        id: action.operationId,
        kind: "post",
        itemId: action.itemId,
        text: action.text,
        status: "pending",
      };
      const item: FeedItem = {
        id: action.itemId,
        text: action.text,
        source: "optimistic",
        postOperationId: action.operationId,
        confirmedLikes: 0,
        pendingLikeOperationIds: [],
      };
      return {
        items: [...state.items, item],
        operations: operationRecord(state, operation),
      };
    }
    case "begin-like": {
      const prior = state.operations[action.operationId];
      if (prior) {
        if (!sameOperationIdentity(prior, "like", action.itemId)) {
          throw new Error(
            `Operation ID is already assigned: ${action.operationId}`,
          );
        }
        return state;
      }
      if (findItem(state, action.itemId) < 0) {
        throw new Error(`Cannot like a missing feed item: ${action.itemId}`);
      }
      const operation: OptimisticLikeOperation = {
        id: action.operationId,
        kind: "like",
        itemId: action.itemId,
        status: "pending",
      };
      const withLike = withItem(state, action.itemId, (item) => ({
        ...item,
        pendingLikeOperationIds: [
          ...item.pendingLikeOperationIds,
          action.operationId,
        ],
      }));
      return { ...withLike, operations: operationRecord(state, operation) };
    }
    case "confirm-post": {
      const operation = state.operations[action.operationId];
      if (
        !operation || operation.kind !== "post" ||
        operation.status !== "pending"
      ) {
        return state;
      }
      const confirmed: OptimisticPostOperation = {
        ...operation,
        status: "confirmed",
        receipt: { serverItemId: action.serverItemId },
      };
      const withItemState = withItem(state, operation.itemId, (item) => {
        if (item.postOperationId !== operation.id) return item;
        return {
          ...item,
          source: "server",
          serverId: action.serverItemId,
        };
      });
      return setOperation(withItemState, confirmed);
    }
    case "confirm-like": {
      const operation = state.operations[action.operationId];
      if (
        !operation || operation.kind !== "like" ||
        operation.status !== "pending"
      ) {
        return state;
      }
      const confirmed: OptimisticLikeOperation = {
        ...operation,
        status: "confirmed",
        receipt: { serverLikeId: action.serverLikeId },
      };
      const withItemState = withItem(state, operation.itemId, (item) => {
        if (!item.pendingLikeOperationIds.includes(operation.id)) return item;
        return {
          ...item,
          confirmedLikes: item.confirmedLikes + 1,
          pendingLikeOperationIds: item.pendingLikeOperationIds.filter((id) =>
            id !== operation.id
          ),
        };
      });
      return setOperation(withItemState, confirmed);
    }
    case "compensate": {
      const operation = state.operations[action.operationId];
      if (!operation || operation.status !== "pending") return state;
      const compensated: OptimisticOperation = {
        ...operation,
        status: "compensated",
      };
      let withItemState = state;
      if (operation.kind === "post") {
        // A removed optimistic post does not own other operations targeting
        // it. Their callers must confirm or compensate each like explicitly;
        // a late receipt records the outcome but cannot recreate the item.
        const index = findItem(state, operation.itemId);
        if (
          index >= 0 && state.items[index]!.postOperationId === operation.id
        ) {
          withItemState = {
            ...state,
            items: state.items.filter((item) => item.id !== operation.itemId),
          };
        }
      } else {
        withItemState = withItem(state, operation.itemId, (item) => {
          if (!item.pendingLikeOperationIds.includes(operation.id)) return item;
          return {
            ...item,
            pendingLikeOperationIds: item.pendingLikeOperationIds.filter((id) =>
              id !== operation.id
            ),
          };
        });
      }
      return setOperation(withItemState, compensated);
    }
    case "edit-text":
      return withItem(
        state,
        action.itemId,
        (item) =>
          item.text === action.text ? item : { ...item, text: action.text },
      );
    case "publish-urgent-post": {
      const existing = findItem(state, action.itemId);
      if (existing >= 0) {
        const item = state.items[existing]!;
        if (item.source === "urgent" && item.text === action.text) return state;
        throw new Error(`Feed item ID is already assigned: ${action.itemId}`);
      }
      const item: FeedItem = {
        id: action.itemId,
        text: action.text,
        source: "urgent",
        confirmedLikes: 0,
        pendingLikeOperationIds: [],
      };
      return { ...state, items: [...state.items, item] };
    }
  }
}

/** Create a native `use(store)` compatible feed action log. */
export function createOptimisticFeedStore(
  initialItems: readonly OptimisticFeedSeed[] = [],
): OptimisticFeedStore {
  const items: readonly FeedItem[] = initialItems.map((item) => ({
    id: item.id,
    text: item.text,
    source: "server",
    ...(item.serverId === undefined ? {} : { serverId: item.serverId }),
    confirmedLikes: item.confirmedLikes ?? 0,
    pendingLikeOperationIds: [],
  }));
  const ids = new Set<FeedItemId>();
  for (const item of items) {
    if (ids.has(item.id)) throw new Error(`Duplicate feed item ID: ${item.id}`);
    ids.add(item.id);
  }
  return createAsyncStore<OptimisticFeedState, OptimisticFeedAction>(
    {
      items,
      operations: Object.create(null) as Record<
        OperationId,
        OptimisticOperation
      >,
    },
    reducer,
  );
}

/** Each helper dispatches one operation-tagged action; no queue cancellation hook is installed. */
export const optimisticFeedActions = Object.freeze({
  beginPost(
    store: OptimisticFeedStore,
    operationId: OperationId,
    itemId: FeedItemId,
    text: string,
  ) {
    return store.dispatch({ type: "begin-post", operationId, itemId, text });
  },
  beginLike(
    store: OptimisticFeedStore,
    operationId: OperationId,
    itemId: FeedItemId,
  ) {
    return store.dispatch({ type: "begin-like", operationId, itemId });
  },
  confirmPost(
    store: OptimisticFeedStore,
    operationId: OperationId,
    serverItemId: string,
  ) {
    return store.dispatch({ type: "confirm-post", operationId, serverItemId });
  },
  confirmLike(
    store: OptimisticFeedStore,
    operationId: OperationId,
    serverLikeId: string,
  ) {
    return store.dispatch({ type: "confirm-like", operationId, serverLikeId });
  },
  compensate(store: OptimisticFeedStore, operationId: OperationId) {
    return store.dispatch({ type: "compensate", operationId });
  },
  editText(store: OptimisticFeedStore, itemId: FeedItemId, text: string) {
    return store.dispatch({ type: "edit-text", itemId, text });
  },
  publishUrgentPost(
    store: OptimisticFeedStore,
    itemId: FeedItemId,
    text: string,
  ) {
    return store.dispatch({ type: "publish-urgent-post", itemId, text });
  },
});

export function optimisticLikeCount(item: FeedItem): number {
  return item.confirmedLikes + item.pendingLikeOperationIds.length;
}
