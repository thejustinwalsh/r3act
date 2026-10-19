/**
 * A keyed, insertion-ordered collection for compiler-proven sparse edits.
 *
 * The collection deliberately has no `map` method: arbitrary array transforms
 * cannot safely be represented as keyed deltas. `snapshot()` is an explicit
 * O(N) materialization for initial iteration or a generic fallback.
 */
export type KeyedCollectionEntry<T> = Readonly<{ key: string; value: T }>;

export type KeyedCollectionOperation<T> =
  | Readonly<{ type: "insert"; key: string; value: T; beforeKey: string | null }>
  | Readonly<{ type: "remove"; key: string }>
  | Readonly<{ type: "move"; key: string; beforeKey: string | null }>
  | Readonly<{ type: "replace"; key: string; value: T }>;

export type KeyedCollectionBatch<T> = Readonly<{
  fromVersion: number;
  version: number;
  operations: readonly KeyedCollectionOperation<T>[];
}>;

export type KeyedCollectionRead<T> =
  | Readonly<{
    status: "available";
    fromVersion: number;
    toVersion: number;
    batches: readonly KeyedCollectionBatch<T>[];
  }>
  | Readonly<{
    status: "unavailable";
    requestedVersion: number;
    oldestAvailableVersion: number;
    currentVersion: number;
  }>;

export type KeyedCollectionApplyResult =
  | Readonly<{ ok: true; version: number }>
  | Readonly<{
    ok: false;
    reason: "stale-version" | "invalid-operation";
    version: number;
  }>;

export type KeyedCollectionStats = Readonly<{
  entryInspections: number;
  anchorInspections: number;
  retainedBatches: number;
  readerCount: number;
  listenerNotifications: number;
  listenerErrors: number;
}>;

type Entry<T> = {
  key: string;
  value: T;
  previous: Entry<T> | null;
  next: Entry<T> | null;
};

type VirtualEntry<T> = {
  entry: Entry<T>;
  value: T;
  previous: Entry<T> | null;
  next: Entry<T> | null;
  alive: boolean;
};

type ReaderState = { version: number; readThrough: number; detached: boolean };
type PendingNotification<T> = {
  batch: KeyedCollectionBatch<T>;
  listeners: readonly KeyedCollectionListener<T>[];
};

export type KeyedCollectionReader<T> = Readonly<{
  read(): KeyedCollectionRead<T>;
  /** Acknowledge only a version returned by the latest read. */
  acknowledge(version: number): boolean;
  /** Reset after a fallback snapshot only if that snapshot's version is current. */
  resetTo(version: number): boolean;
  detach(): void;
}>;

type ReaderAcknowledgement = (version: number) => (() => boolean) | null;
const readerAcknowledgements = new WeakMap<object, ReaderAcknowledgement>();

/** @internal Stage exact acceptance; the callback reports whether the reader caught up. */
export function prepareCollectionReaderAcknowledgement(
  reader: KeyedCollectionReader<unknown>,
  version: number,
): (() => boolean) | null {
  return readerAcknowledgements.get(reader)?.(version) ?? null;
}

export type KeyedCollectionListener<T> = (
  batch: KeyedCollectionBatch<T>,
) => void;

/**
 * Create an ordered keyed collection with independent, versioned readers.
 * Key/anchor lookup is Map-backed; edits link/unlink entries without copying
 * the sibling list. History is capped by `maxRetainedBatches`; lagging readers
 * receive `unavailable` and should ask their owner for a generic snapshot.
 * Payload values are retained by reference and must be treated as immutable by
 * callers; operation descriptors and batches are copied and frozen here.
 * `.map` is an O(N) generic snapshot operation. Compiler lowering may replace
 * a proven collection row-map with versioned region rendering.
 */
export function createKeyedCollection<T>(
  initial: readonly T[],
  keyOf: (value: T) => string,
  options: Readonly<{ maxRetainedBatches?: number }> = {},
) {
  const maxRetainedBatches = options.maxRetainedBatches ?? 256;
  if (!Number.isSafeInteger(maxRetainedBatches) || maxRetainedBatches < 1) {
    throw new RangeError("maxRetainedBatches must be an integer >= 1");
  }

  let head: Entry<T> | null = null;
  let tail: Entry<T> | null = null;
  const byKey = new Map<string, Entry<T>>();
  const history: KeyedCollectionBatch<T>[] = [];
  const readers = new Set<ReaderState>();
  const listeners = new Set<KeyedCollectionListener<T>>();
  const notificationQueue: PendingNotification<T>[] = [];
  let drainingNotifications = false;
  let version = 0;
  let entryInspections = 0;
  let anchorInspections = 0;
  let listenerNotifications = 0;
  let listenerErrors = 0;

  for (const value of initial) {
    const key = keyOf(value);
    if (typeof key !== "string" || key.length === 0) {
      throw new TypeError("keyOf must return a non-empty string");
    }
    if (byKey.has(key)) throw new Error(`Duplicate keyed-collection key: ${key}`);
    const entry: Entry<T> = { key, value, previous: tail, next: null };
    if (tail) tail.next = entry;
    else head = entry;
    tail = entry;
    byKey.set(key, entry);
  }

  const find = (key: string): Entry<T> | undefined => {
    entryInspections++;
    return byKey.get(key);
  };
  const getVirtual = (
    entry: Entry<T>,
    virtual: Map<Entry<T>, VirtualEntry<T>>,
  ): VirtualEntry<T> => {
    let state = virtual.get(entry);
    if (!state) {
      state = {
        entry,
        value: entry.value,
        previous: entry.previous,
        next: entry.next,
        alive: true,
      };
      virtual.set(entry, state);
    }
    return state;
  };

  const pruneAcknowledged = () => {
    if (readers.size === 0) {
      history.length = 0;
      return;
    }
    let minimum = Infinity;
    for (const reader of readers) minimum = Math.min(minimum, reader.version);
    while (history.length > 0 && history[0].version <= minimum) history.shift();
  };
  const capHistory = () => {
    while (history.length > maxRetainedBatches) history.shift();
  };

  const collection = {
    get version() {
      return version;
    },
    get size() {
      return byKey.size;
    },
    get firstKey(): string | null {
      return head?.key ?? null;
    },
    get lastKey(): string | null {
      return tail?.key ?? null;
    },
    has(key: string) {
      return find(key) !== undefined;
    },
    get(key: string): T | undefined {
      return find(key)?.value;
    },
    /** Return an adjacent key, null at the edge, or undefined if missing. */
    previousKey(key: string): string | null | undefined {
      const entry = find(key);
      return entry ? entry.previous?.key ?? null : undefined;
    },
    /** Return an adjacent key, null at the edge, or undefined if missing. */
    nextKey(key: string): string | null | undefined {
      const entry = find(key);
      return entry ? entry.next?.key ?? null : undefined;
    },
    /** O(N), intended for initial materialization or generic fallback. */
    snapshot(): readonly KeyedCollectionEntry<T>[] {
      const result: KeyedCollectionEntry<T>[] = [];
      for (let entry = head; entry; entry = entry.next) {
        entryInspections++;
        result.push(Object.freeze({ key: entry.key, value: entry.value }));
      }
      return Object.freeze(result);
    },
    /** O(N) generic fallback; callback receives only the row value, never index. */
    map<U>(render: (value: T) => U): U[] {
      return this.snapshot().map(({ value }) => render(value));
    },
    apply(
      expectedVersion: number,
      operations: readonly KeyedCollectionOperation<T>[],
    ): KeyedCollectionApplyResult {
      if (expectedVersion !== version) {
        return { ok: false, reason: "stale-version", version };
      }
      let batchOperations: readonly KeyedCollectionOperation<T>[];
      try {
        batchOperations = Object.freeze(Array.from(operations, (operation) =>
          Object.freeze({ ...operation }) as KeyedCollectionOperation<T>
        ));
      } catch {
        return { ok: false, reason: "invalid-operation", version };
      }
      if (batchOperations.length === 0) return { ok: true, version };

      // Preflight the complete sequential batch against a sparse virtual
      // overlay. Only entries touched by the batch are represented here.
      const virtual = new Map<Entry<T>, VirtualEntry<T>>();
      const keyOverlay = new Map<string, Entry<T> | null>();
      let virtualHead = head;
      let virtualTail = tail;
      const lookup = (key: string): Entry<T> | undefined => {
        entryInspections++;
        if (keyOverlay.has(key)) return keyOverlay.get(key) ?? undefined;
        return byKey.get(key);
      };
      const anchor = (key: string | null): Entry<T> | null | undefined => {
        if (key === null) return null;
        anchorInspections++;
        return lookup(key);
      };
      const linkOut = (entry: Entry<T>) => {
        const state = getVirtual(entry, virtual);
        const before = state.previous;
        const after = state.next;
        if (before) getVirtual(before, virtual).next = after;
        else virtualHead = after;
        if (after) getVirtual(after, virtual).previous = before;
        else virtualTail = before;
        state.previous = null;
        state.next = null;
        state.alive = false;
      };
      const linkBefore = (entry: Entry<T>, before: Entry<T> | null) => {
        const previous = before ? getVirtual(before, virtual).previous : virtualTail;
        const state = getVirtual(entry, virtual);
        state.previous = previous;
        state.next = before;
        state.alive = true;
        if (previous) getVirtual(previous, virtual).next = entry;
        else virtualHead = entry;
        if (before) getVirtual(before, virtual).previous = entry;
        else virtualTail = entry;
      };

      for (const operation of batchOperations) {
        if (!operation || typeof operation.key !== "string" || !operation.key) {
          return { ok: false, reason: "invalid-operation", version };
        }
        if (operation.type === "insert") {
          if (lookup(operation.key) !== undefined) {
            return { ok: false, reason: "invalid-operation", version };
          }
          let selectedKey: string;
          try {
            selectedKey = keyOf(operation.value);
          } catch {
            return { ok: false, reason: "invalid-operation", version };
          }
          if (selectedKey !== operation.key) {
            return { ok: false, reason: "invalid-operation", version };
          }
          const before = anchor(operation.beforeKey);
          if (before === undefined) {
            return { ok: false, reason: "invalid-operation", version };
          }
          const entry: Entry<T> = {
            key: operation.key,
            value: operation.value,
            previous: null,
            next: null,
          };
          virtual.set(entry, {
            entry,
            value: operation.value,
            previous: null,
            next: null,
            alive: false,
          });
          keyOverlay.set(operation.key, entry);
          linkBefore(entry, before);
        } else if (operation.type === "remove") {
          const entry = lookup(operation.key);
          if (!entry) return { ok: false, reason: "invalid-operation", version };
          linkOut(entry);
          keyOverlay.set(operation.key, null);
        } else if (operation.type === "move") {
          const entry = lookup(operation.key);
          const before = anchor(operation.beforeKey);
          if (
            !entry || before === undefined || before === entry
          ) return { ok: false, reason: "invalid-operation", version };
          linkOut(entry);
          linkBefore(entry, before);
        } else if (operation.type === "replace") {
          const entry = lookup(operation.key);
          if (!entry) return { ok: false, reason: "invalid-operation", version };
          let selectedKey: string;
          try {
            selectedKey = keyOf(operation.value);
          } catch {
            return { ok: false, reason: "invalid-operation", version };
          }
          if (selectedKey !== operation.key) {
            return { ok: false, reason: "invalid-operation", version };
          }
          getVirtual(entry, virtual).value = operation.value;
        } else {
          return { ok: false, reason: "invalid-operation", version };
        }
      }

      // Publish the sparse overlay only after every operation validated.
      // Neighbors whose links changed are included in `virtual`, so this does
      // not walk or copy the full sibling list.
      for (const state of virtual.values()) {
        state.entry.value = state.value;
        state.entry.previous = state.alive ? state.previous : null;
        state.entry.next = state.alive ? state.next : null;
      }
      head = virtualHead;
      tail = virtualTail;
      for (const [key, entry] of keyOverlay) {
        if (entry === null) byKey.delete(key);
        else byKey.set(key, entry);
      }

      version++;
      const batch: KeyedCollectionBatch<T> = Object.freeze({
        fromVersion: version - 1,
        version,
        operations: batchOperations,
      });
      history.push(batch);
      pruneAcknowledged();
      capHistory();

      const errors: unknown[] = [];
      notificationQueue.push({ batch, listeners: [...listeners] });
      if (!drainingNotifications) {
        drainingNotifications = true;
        try {
          while (notificationQueue.length > 0) {
            const pending = notificationQueue.shift()!;
            for (const listener of pending.listeners) {
              listenerNotifications++;
              try {
                listener(pending.batch);
              } catch (error) {
                listenerErrors++;
                errors.push(error);
              }
            }
          }
        } finally {
          drainingNotifications = false;
        }
      }
      if (errors.length > 0) {
        throw new AggregateError(
          errors,
          `Keyed collection committed version ${version}, but ${errors.length} listener(s) failed`,
        );
      }
      return { ok: true, version };
    },
    subscribe(listener: KeyedCollectionListener<T>): () => void {
      if (typeof listener !== "function") {
        throw new TypeError("listener must be a function");
      }
      listeners.add(listener);
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },
    createReader(): KeyedCollectionReader<T> {
      const reader: ReaderState = {
        version,
        readThrough: version,
        detached: false,
      };
      readers.add(reader);
      const ensureAttached = () => {
        if (reader.detached) throw new Error("Keyed collection reader is detached");
      };
      const handle = Object.freeze({
        read(): KeyedCollectionRead<T> {
          ensureAttached();
          const oldestAvailableVersion = history[0]?.fromVersion ?? version;
          if (reader.version < oldestAvailableVersion) {
            return Object.freeze({
              status: "unavailable",
              requestedVersion: reader.version,
              oldestAvailableVersion,
              currentVersion: version,
            });
          }
          const batches = history.filter((batch) => batch.version > reader.version);
          reader.readThrough = version;
          return Object.freeze({
            status: "available",
            fromVersion: reader.version,
            toVersion: version,
            batches: Object.freeze(batches),
          });
        },
        acknowledge(ackVersion: number): boolean {
          ensureAttached();
          if (
            !Number.isSafeInteger(ackVersion) || ackVersion < reader.version ||
            ackVersion > reader.readThrough
          ) return false;
          reader.version = ackVersion;
          pruneAcknowledged();
          return true;
        },
        resetTo(resetVersion: number): boolean {
          ensureAttached();
          if (resetVersion !== version) return false;
          reader.version = resetVersion;
          reader.readThrough = resetVersion;
          pruneAcknowledged();
          return true;
        },
        detach(): void {
          if (reader.detached) return;
          reader.detached = true;
          readers.delete(reader);
          pruneAcknowledged();
        },
      });
      readerAcknowledgements.set(handle, (ackVersion) => {
        if (
          reader.detached || !Number.isSafeInteger(ackVersion) ||
          ackVersion < reader.version || ackVersion > reader.readThrough
        ) return null;
        return () => {
          reader.version = Math.max(reader.version, ackVersion);
          pruneAcknowledged();
          return reader.version === version;
        };
      });
      return handle;
    },
    stats(): KeyedCollectionStats {
      return Object.freeze({
        entryInspections,
        anchorInspections,
        retainedBatches: history.length,
        readerCount: readers.size,
        listenerNotifications,
        listenerErrors,
      });
    },
    resetStats() {
      entryInspections = 0;
      anchorInspections = 0;
      listenerNotifications = 0;
      listenerErrors = 0;
    },
  };
  return collection;
}

/** Public structural type for consumers that need to name the collection. */
export type KeyedCollection<T> = ReturnType<typeof createKeyedCollection<T>>;
