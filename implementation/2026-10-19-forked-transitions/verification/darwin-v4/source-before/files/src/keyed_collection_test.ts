import {
  createKeyedCollection,
  type KeyedCollectionOperation,
} from "./keyed_collection.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const equal = (actual: unknown, expected: unknown, message: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
};

type Row = { key: string; value: number };
const keys = (rows: readonly Row[]) => rows.map((row) => row.key);
const snapshot = (collection: ReturnType<typeof createKeyedCollection<Row>>) =>
  collection.snapshot().map(({ key, value }) => ({ key, value: value.value }));

Deno.test("keyed collection sparse operations replay against array oracle", () => {
  const collection = createKeyedCollection<Row>([], (row) => row.key);
  const oracle: Row[] = [];
  let seed = 0x1234abcd;
  const random = (limit: number) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed % limit;
  };
  const indexBefore = (beforeKey: string | null) => beforeKey === null
    ? oracle.length
    : oracle.findIndex((row) => row.key === beforeKey);

  for (let step = 0; step < 1500; step++) {
    const choices = ["insert", "remove", "move", "replace"] as const;
    let type = choices[random(choices.length)];
    if (oracle.length === 0 && type !== "insert") type = "insert";
    const currentKeys = keys(oracle);
    const key = type === "insert"
      ? `row-${step}`
      : currentKeys[random(currentKeys.length)];
    const beforeCandidates = currentKeys.filter((candidate) => candidate !== key);
    const beforeKey = random(5) === 0 || beforeCandidates.length === 0
      ? null
      : beforeCandidates[random(beforeCandidates.length)];
    let operation: KeyedCollectionOperation<Row>;

    if (type === "insert") {
      const value = { key, value: step };
      operation = { type, key, value, beforeKey };
      oracle.splice(indexBefore(beforeKey), 0, value);
    } else if (type === "remove") {
      operation = { type, key };
      oracle.splice(oracle.findIndex((row) => row.key === key), 1);
    } else if (type === "move") {
      operation = { type, key, beforeKey };
      const [row] = oracle.splice(oracle.findIndex((item) => item.key === key), 1);
      oracle.splice(indexBefore(beforeKey), 0, row);
    } else {
      const value = { key, value: step };
      operation = { type, key, value };
      oracle[oracle.findIndex((row) => row.key === key)] = value;
    }

    const result = collection.apply(collection.version, [operation]);
    assert(result.ok, `operation ${step} should apply`);
    equal(snapshot(collection), oracle, `oracle diverged at step ${step}`);
  }
});

Deno.test("keyed collection supports independent cursors and releases acknowledged history", () => {
  const collection = createKeyedCollection<Row>([
    { key: "a", value: 1 },
    { key: "b", value: 2 },
  ], (row) => row.key);
  const first = collection.createReader();
  const second = collection.createReader();
  const apply = (operations: readonly KeyedCollectionOperation<Row>[]) => {
    const result = collection.apply(collection.version, operations);
    assert(result.ok, "expected valid operation batch");
  };
  apply([{ type: "insert", key: "c", value: { key: "c", value: 3 }, beforeKey: null }]);
  apply([{ type: "move", key: "c", beforeKey: "a" }]);
  const firstRead = first.read();
  const secondRead = second.read();
  if (firstRead.status !== "available") throw new Error("first reader should get deltas");
  if (secondRead.status !== "available") throw new Error("second reader should get deltas");
  equal(firstRead.batches.map((batch) => batch.version), [1, 2], "first batch versions");
  equal(secondRead.batches.map((batch) => batch.version), [1, 2], "second batch versions");
  assert(first.acknowledge(2), "first reader should acknowledge read version");
  assert(collection.stats().retainedBatches === 2, "slow reader retains needed history");
  assert(second.acknowledge(2), "second reader should acknowledge read version");
  assert(collection.stats().retainedBatches === 0, "acknowledgement releases history");
  first.detach();
  second.detach();
  assert(collection.stats().readerCount === 0, "detach releases reader registrations");
});

Deno.test("keyed collection retention overflow requests generic fallback", () => {
  const collection = createKeyedCollection<Row>([], (row) => row.key, {
    maxRetainedBatches: 2,
  });
  const reader = collection.createReader();
  for (let index = 0; index < 3; index++) {
    const value = { key: `r${index}`, value: index };
    assert(
      collection.apply(collection.version, [{
        type: "insert",
        key: value.key,
        value,
        beforeKey: null,
      }]).ok,
      "insert should apply",
    );
  }
  const result = reader.read();
  if (result.status !== "unavailable") {
    throw new Error("expired reader must request fallback");
  }
  equal(result.requestedVersion, 0, "fallback reports requested base version");
  equal(result.oldestAvailableVersion, 1, "fallback reports earliest retained base");
  reader.detach();
});

Deno.test("keyed collection rejects stale and invalid batches transactionally", () => {
  const collection = createKeyedCollection<Row>([
    { key: "a", value: 1 },
    { key: "b", value: 2 },
  ], (row) => row.key);
  const before = snapshot(collection);
  const stale = collection.apply(3, [{ type: "remove", key: "a" }]);
  assert(!stale.ok && stale.reason === "stale-version", "stale base must reject");
  const invalid = collection.apply(0, [
    { type: "remove", key: "a" },
    { type: "insert", key: "b", value: { key: "b", value: 20 }, beforeKey: null },
  ]);
  assert(!invalid.ok && invalid.reason === "invalid-operation", "duplicate key rejects");
  equal(snapshot(collection), before, "invalid batch must not partially mutate state");
  equal(collection.version, 0, "invalid batch must not advance version");
});

Deno.test("keyed collection validates anchor sequences before publishing changes", () => {
  const collection = createKeyedCollection<Row>([
    { key: "a", value: 1 },
    { key: "b", value: 2 },
  ], (row) => row.key);
  const before = snapshot(collection);
  const invalid = collection.apply(0, [
    { type: "insert", key: "c", value: { key: "c", value: 3 }, beforeKey: "a" },
    { type: "move", key: "a", beforeKey: "missing" },
  ]);
  assert(!invalid.ok, "missing anchor should reject whole batch");
  equal(snapshot(collection), before, "failed anchor validation is atomic");
  equal(collection.stats().entryInspections > 0, true, "entry inspections are counted");
  equal(collection.stats().anchorInspections > 0, true, "anchor inspections are counted");
});

Deno.test("keyed collection notifies subscribers after commit and cleans subscriptions", () => {
  const collection = createKeyedCollection<Row>([], (row) => row.key);
  const delivered: number[] = [];
  const unsubscribeFirst = collection.subscribe((batch) => {
    delivered.push(batch.version);
  });
  const unsubscribeSecond = collection.subscribe((batch) => {
    delivered.push(batch.version * 10);
  });
  const value = { key: "a", value: 1 };
  assert(collection.apply(0, [{
    type: "insert",
    key: "a",
    value,
    beforeKey: null,
  }]).ok, "batch should commit");
  equal(delivered, [1, 10], "both subscribers receive committed version");
  equal(collection.stats().listenerNotifications, 2, "deliveries are counted");
  unsubscribeFirst();
  unsubscribeFirst();
  unsubscribeSecond();
  assert(collection.apply(1, [{ type: "replace", key: "a", value: { key: "a", value: 2 } }]).ok,
    "batch should commit after cleanup");
  equal(delivered, [1, 10], "unsubscribed listeners are not called");
});

Deno.test("keyed collection aggregates listener failures after notifying all listeners", () => {
  const collection = createKeyedCollection<Row>([], (row) => row.key);
  let delivered = 0;
  collection.subscribe(() => {
    throw new Error("listener failure");
  });
  collection.subscribe(() => delivered++);
  let caught: unknown;
  try {
    collection.apply(0, [{
      type: "insert",
      key: "a",
      value: { key: "a", value: 1 },
      beforeKey: null,
    }]);
  } catch (error) {
    caught = error;
  }
  assert(caught instanceof AggregateError, "listener errors should be aggregated");
  equal(delivered, 1, "remaining listeners still receive the batch");
  equal(collection.version, 1, "listener failure occurs after the commit");
  equal(snapshot(collection), [{ key: "a", value: 1 }], "state remains committed and valid");
  equal(collection.stats().listenerErrors, 1, "listener errors are counted");
});

Deno.test("keyed collection freezes copied operation descriptors in retained history", () => {
  const collection = createKeyedCollection<Row>([], (row) => row.key);
  const reader = collection.createReader();
  const operation: KeyedCollectionOperation<Row> = {
    type: "insert",
    key: "a",
    value: { key: "a", value: 1 },
    beforeKey: null,
  };
  const operations: KeyedCollectionOperation<Row>[] = [operation];
  assert(collection.apply(0, operations).ok, "batch should commit");
  (operation as { key: string }).key = "changed";
  operations.push({ type: "remove", key: "a" });
  const result = reader.read();
  if (result.status !== "available") throw new Error("history should be available");
  equal(result.batches.length, 1, "input array changes do not add history operations");
  equal(result.batches[0].operations[0].key, "a", "copied operation keeps original key");
  assert(Object.isFrozen(result.batches[0].operations[0]), "operation descriptor is frozen");
  reader.detach();
});

Deno.test("keyed collection reader can reset after a version-checked fallback snapshot", () => {
  const collection = createKeyedCollection<Row>([], (row) => row.key, {
    maxRetainedBatches: 1,
  });
  const reader = collection.createReader();
  for (let index = 0; index < 2; index++) {
    const value = { key: `r${index}`, value: index };
    assert(collection.apply(collection.version, [{
      type: "insert",
      key: value.key,
      value,
      beforeKey: null,
    }]).ok, "insert should commit");
  }
  const unavailable = reader.read();
  if (unavailable.status !== "unavailable") throw new Error("reader should need fallback");
  const capturedVersion = collection.version;
  collection.snapshot();
  assert(reader.resetTo(capturedVersion), "reader resets to matching snapshot version");
  const fresh = reader.read();
  if (fresh.status !== "available") throw new Error("reader should be current after reset");
  equal(fresh.batches, [], "reset reader has no unconsumed deltas");
  assert(collection.apply(collection.version, [{
    type: "replace",
    key: "r0",
    value: { key: "r0", value: 10 },
  }]).ok, "subsequent commit should apply");
  assert(!reader.resetTo(capturedVersion), "stale snapshot version cannot reset cursor");
  reader.detach();
});

Deno.test("keyed collection queues reentrant notifications in version order", () => {
  const collection = createKeyedCollection<Row>([], (row) => row.key);
  const calls: string[] = [];
  collection.subscribe((batch) => {
    calls.push(`first:${batch.version}`);
    if (batch.version === 1) {
      assert(collection.apply(1, [{
        type: "insert",
        key: "b",
        value: { key: "b", value: 2 },
        beforeKey: null,
      }]).ok, "reentrant batch should commit");
    }
  });
  collection.subscribe((batch) => calls.push(`second:${batch.version}`));
  assert(collection.apply(0, [{
    type: "insert",
    key: "a",
    value: { key: "a", value: 1 },
    beforeKey: null,
  }]).ok, "outer batch should commit");
  equal(
    calls,
    ["first:1", "second:1", "first:2", "second:2"],
    "all listeners finish each version before the next version dispatches",
  );
});

Deno.test("keyed collection releases history when its last reader detaches", () => {
  const collection = createKeyedCollection<Row>([], (row) => row.key);
  const reader = collection.createReader();
  for (let index = 0; index < 3; index++) {
    const value = { key: `r${index}`, value: index };
    assert(collection.apply(collection.version, [{
      type: "insert",
      key: value.key,
      value,
      beforeKey: null,
    }]).ok, "insert should commit");
  }
  assert(collection.stats().retainedBatches === 3, "reader retains unacknowledged history");
  reader.detach();
  assert(collection.stats().retainedBatches === 0, "last detach releases retained payloads");
  const value = { key: "later", value: 4 };
  assert(collection.apply(collection.version, [{
    type: "insert",
    key: value.key,
    value,
    beforeKey: null,
  }]).ok, "edit with no readers should commit");
  assert(collection.stats().retainedBatches === 0, "edits without readers retain no history");
  const nextReader = collection.createReader();
  const current = nextReader.read();
  if (current.status !== "available") throw new Error("new reader starts at current version");
  equal(current.batches, [], "new reader does not replay history from before attachment");
  nextReader.detach();
});

Deno.test("keyed collection map is a value-only full snapshot in order", () => {
  const collection = createKeyedCollection<Row>([
    { key: "a", value: 3 },
    { key: "b", value: 1 },
    { key: "c", value: 2 },
  ], (row) => row.key);
  collection.resetStats();
  const rendered = collection.map((row) => `${row.key}:${row.value}`);
  equal(rendered, ["a:3", "b:1", "c:2"], "map preserves collection value order");
  equal(collection.stats().entryInspections, 3, "map records its full snapshot scan");
});

Deno.test("keyed collection exposes current boundary and adjacency keys", () => {
  const collection = createKeyedCollection<Row>([
    { key: "a", value: 1 },
    { key: "b", value: 2 },
    { key: "c", value: 3 },
    { key: "d", value: 4 },
  ], (row) => row.key);
  assert(collection.firstKey === "a", "first key is at the list head");
  assert(collection.lastKey === "d", "last key is at the list tail");
  assert(collection.previousKey("a") === null, "head has no previous key");
  assert(collection.nextKey("d") === null, "tail has no next key");
  assert(collection.previousKey("missing") === undefined, "missing previous lookup is undefined");
  assert(collection.nextKey("missing") === undefined, "missing next lookup is undefined");
  assert(collection.apply(0, [{ type: "move", key: "d", beforeKey: "b" }]).ok,
    "move should apply");
  assert(collection.apply(1, [{ type: "remove", key: "d" }]).ok,
    "remove should apply");
  assert(collection.apply(2, [{
    type: "insert",
    key: "x",
    value: { key: "x", value: 5 },
    beforeKey: "b",
  }]).ok, "insert should apply");
  assert(collection.firstKey === "a", "head remains correct after edits");
  assert(collection.lastKey === "c", "tail remains correct after edits");
  assert(collection.previousKey("b") === "x", "previous lookup follows edited links");
  assert(collection.nextKey("x") === "b", "next lookup follows edited links");
});

Deno.test("keyed collection adjacency lookup work stays constant at 10k rows", () => {
  const initial = Array.from({ length: 10_000 }, (_, index) => ({
    key: `k${index}`,
    value: index,
  }));
  const collection = createKeyedCollection<Row>(initial, (row) => row.key);
  collection.resetStats();
  assert(collection.firstKey === "k0", "first getter reads head directly");
  assert(collection.lastKey === "k9999", "last getter reads tail directly");
  assert(collection.previousKey("k5000") === "k4999", "previous lookup is correct");
  assert(collection.nextKey("k5000") === "k5001", "next lookup is correct");
  equal(collection.stats().entryInspections, 2, "two adjacency lookups inspect two entries");
  equal(collection.stats().anchorInspections, 0, "adjacency lookups are not anchor scans");
});
