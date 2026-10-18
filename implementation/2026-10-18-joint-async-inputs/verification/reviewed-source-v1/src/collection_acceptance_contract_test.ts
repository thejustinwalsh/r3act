import {
  createKeyedCollection,
  prepareCollectionReaderAcknowledgement,
  type KeyedCollectionReader,
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

type Row = { key: string };

Deno.test("staged native collection acknowledgement keeps later batches pending", () => {
  const collection = createKeyedCollection<Row>([], (row) => row.key);
  const reader = collection.createReader();
  try {
    assert(collection.apply(0, [{
      type: "insert", key: "a", value: { key: "a" }, beforeKey: null,
    }]).ok, "first batch applied");
    const captured = reader.read();
    if (captured.status !== "available") throw new Error("read unavailable");
    equal(captured.toVersion, 1, "captured cutoff");
    const acknowledge = prepareCollectionReaderAcknowledgement(
      reader,
      captured.toVersion,
    );
    assert(acknowledge, "native reader accepted staged cutoff");
    assert(collection.apply(1, [{
      type: "insert", key: "b", value: { key: "b" }, beforeKey: null,
    }]).ok, "newer batch applied");
    equal(acknowledge!(), false, "newer batches keep the native reader pending");
    const pending = reader.read();
    if (pending.status !== "available") throw new Error("newer read unavailable");
    equal(pending.fromVersion, 1, "acknowledgement advanced past captured cutoff");
    equal(pending.batches.map((batch) => batch.version), [2], "newer batch lost");
    const finish = prepareCollectionReaderAcknowledgement(reader, pending.toVersion);
    assert(finish, "latest cutoff could not stage");
    equal(finish!(), true, "latest cutoff catches up without public getters");
  } finally {
    reader.detach();
  }
});

Deno.test("staging rejects forged, detached, and uncaptured collection readers", () => {
  const collection = createKeyedCollection<Row>([], (row) => row.key);
  const reader = collection.createReader();
  const forged = {
    read: () => reader.read(),
    acknowledge: (_version: number) => true,
    resetTo: (_version: number) => true,
    detach: () => {},
  } satisfies KeyedCollectionReader<Row>;
  assert(
    prepareCollectionReaderAcknowledgement(forged, 0) === null,
    "foreign reader was admitted",
  );
  assert(collection.apply(0, [{
    type: "insert", key: "a", value: { key: "a" }, beforeKey: null,
  }]).ok, "batch applied");
  assert(
    prepareCollectionReaderAcknowledgement(reader, 1) === null,
    "version without a captured read was admitted",
  );
  const captured = reader.read();
  if (captured.status !== "available") throw new Error("read unavailable");
  const staged = prepareCollectionReaderAcknowledgement(reader, 1);
  assert(staged, "valid reader could not stage");
  reader.detach();
  assert(
    prepareCollectionReaderAcknowledgement(reader, 1) === null,
    "detached reader was admitted",
  );
});

Deno.test("a later mixed reader readiness failure leaves every group frontier old", async () => {
  const { ComponentStateRoot, defineComponent, renderCollectionAt, useStateAt,
    bindStatePropAt } = await import("./component_state_runtime.ts");
  const { jsx } = await import("./jsx_binding_runtime.ts");
  const { MemoryVDOMHost } = await import("./vdom_snapshot_runtime.ts");
  const makeRoot = (id: string) => {
    const collection = createKeyedCollection<Row>([{ key: "a" }], (row) => row.key);
    const createReader = collection.createReader;
    let reader!: KeyedCollectionReader<Row>;
    collection.createReader = () => reader = createReader();
    let setValue!: (value: number) => boolean;
    const Item = defineComponent<{ row: Row }>(`${id}-row`, ({ row }) =>
      jsx("li", {}, row.key));
    const List = defineComponent(`${id}-list`, () => jsx("ul", {},
      renderCollectionAt(`${id}-rows`, collection, (row) => jsx(Item, { row }))));
    const View = defineComponent(`${id}-view`, () => {
      [, setValue] = useStateAt("value", 0);
      return jsx("section", {}, [jsx("output", {
        value: bindStatePropAt("value", (value) => value, {
          schemaVersion: 1, sinkId: `${id}-value`, sourceSites: ["value"],
        }),
      }), jsx(List, {})]);
    }, { propOnlySites: ["value"] });
    const host = new MemoryVDOMHost();
    const root = new ComponentStateRoot(host, host.createContainer(), {
      rootId: id, scheduleCommit() {},
    });
    root.mount(jsx(View, {}));
    const accepted = root.publicationVersion;
    setValue(1);
    collection.apply(collection.version, [{
      type: "insert", key: "b", value: { key: "b" }, beforeKey: null,
    }]);
    const candidate = root.preparePending();
    if (!candidate) throw new Error("mixed candidate missing");
    return { root, candidate, accepted, reader };
  };
  const first = makeRoot("reader-readiness-first");
  const second = makeRoot("reader-readiness-second");
  try {
    first.candidate.commitHost();
    second.candidate.commitHost();
    second.reader.detach();
    first.candidate.preparePublication();
    let failure: unknown;
    try { second.candidate.preparePublication(); } catch (error) { failure = error; }
    assert(failure instanceof Error, "detached later reader reached acceptance");
    equal(first.root.publicationVersion, first.accepted, "first accepted frontier advanced");
    equal(second.root.publicationVersion, second.accepted, "second accepted frontier advanced");
    const read = first.reader.read();
    if (read.status !== "available") throw new Error("first reader unavailable");
    equal(read.fromVersion, 0, "earlier reader acknowledged before group readiness");
    first.candidate.failGroup(failure);
  } finally {
    first.root.dispose();
    second.root.dispose();
  }
});

Deno.test("direct removal does not acknowledge when a host retires the captured owner", async () => {
  const { ComponentStateRoot, defineComponent, renderCollectionAt, useStateAt } =
    await import("./component_state_runtime.ts");
  const { jsx } = await import("./jsx_binding_runtime.ts");
  const { MemoryVDOMHost } = await import("./vdom_snapshot_runtime.ts");
  const collection = createKeyedCollection<Row>([{ key: "a" }], (row) => row.key);
  let reader!: KeyedCollectionReader<Row>;
  const createReader = collection.createReader;
  collection.createReader = () => reader = createReader();
  let root!: InstanceType<typeof ComponentStateRoot>;
  let armed = false;
  let rowOwner: number | undefined;
  const host = new class extends MemoryVDOMHost {
    override remove(parent: import("./vdom_snapshot_runtime.ts").MemoryNode,
      node: import("./vdom_snapshot_runtime.ts").MemoryNode) {
      super.remove(parent, node);
      if (armed && rowOwner !== undefined) {
        armed = false;
        root.world.destroyOwner(rowOwner);
      }
    }
  }();
  let setRow!: (value: number) => boolean;
  const Item = defineComponent<{ row: Row }>("reader-direct-row", ({ row }) => {
    [, setRow] = useStateAt("identity", 0);
    return jsx("li", {}, row.key);
  });
  const List = defineComponent("reader-direct-list", () => jsx("ul", {},
    renderCollectionAt("reader-direct-rows", collection, (row) => jsx(Item, { row }))));
  root = new ComponentStateRoot(host, host.createContainer(), {
    rootId: "reader-direct-removal", scheduleCommit() {},
  });
  try {
    root.mount(jsx(List, {}));
    setRow(1);
    rowOwner = root.world.pendingChanges()[0]?.owner;
    root.flush();
    assert(rowOwner !== undefined, "row owner missing");
    const accepted = root.publicationVersion;
    collection.apply(collection.version, [{ type: "remove", key: "a" }]);
    armed = true;
    let failure: unknown;
    try { root.flush(); } catch (error) { failure = error; }
    assert(failure instanceof Error, "retired captured owner was accepted");
    equal(root.publicationVersion, accepted, "failed direct cut advanced root history");
    const pending = reader.read();
    if (pending.status !== "available") throw new Error("reader history unavailable");
    equal(pending.fromVersion, 0, "failed direct cut acknowledged collection history");
  } finally {
    root.dispose();
  }
});
