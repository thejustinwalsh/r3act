import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "jsr:@std/assert";
import {
  bindStatePropAt,
  ComponentStateRoot,
  defineComponent,
  renderCollectionAt,
  useEffectAt,
  useStateAt,
} from "./component_state_runtime.ts";
import { createKeyedCollection } from "./keyed_collection.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

type Row = { id: string };

function fixture(id: string, host: MemoryVDOMHost = new MemoryVDOMHost()) {
  const left = createKeyedCollection<Row>(
    [{ id: "a" }, { id: "b" }, { id: "c" }],
    (row) => row.id,
  );
  const right = createKeyedCollection<Row>(
    [{ id: "d" }, { id: "e" }, { id: "f" }],
    (row) => row.id,
  );
  let rowRenders = 0;
  const RowView = defineComponent(`${id}:row`, ({ row }: { row: Row }) => {
    rowRenders++;
    return jsx("li", { "data-id": row.id }, row.id);
  });
  const List = defineComponent(
    `${id}:list`,
    ({ side, collection }: { side: string; collection: typeof left }) =>
      jsx(
        "ul",
        { "data-side": side },
        renderCollectionAt(
          `${id}:${side}:region`,
          collection,
          (row) => jsx(RowView, { row }),
        ),
      ),
  );
  const App = defineComponent(`${id}:app`, () =>
    jsx("section", {}, [
      jsx(List, { key: "left", side: "left", collection: left }),
      jsx(List, { key: "right", side: "right", collection: right }),
    ]));
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: id,
    scheduleCommit() {},
  });
  const tree = () => jsx(App, {});
  root.mount(tree());
  const list = (side: "left" | "right") =>
    container.children[0].children[side === "left" ? 0 : 1];
  const order = (side: "left" | "right") =>
    list(side).children.map((node) => node.props["data-id"]);
  return {
    left,
    right,
    root,
    container,
    tree,
    list,
    order,
    rowRenders: () => rowRenders,
    dispose: () => root.dispose(),
  };
}

function move(
  collection: ReturnType<typeof createKeyedCollection<Row>>,
  key: string,
  beforeKey: string | null,
) {
  assert(
    collection.apply(collection.version, [{ type: "move", key, beforeKey }]).ok,
  );
}

function publish(
  candidate: NonNullable<
    ReturnType<ComponentStateRoot<MemoryNode, MemoryNode>["prepareCollections"]>
  >,
) {
  assert(candidate.validate());
  candidate.commitHost();
  assert(candidate.validatePostHost());
  candidate.preparePublication();
  candidate.publish();
  candidate.runEffects();
}

function rowOwner(
  f: ReturnType<typeof fixture>,
  id: string,
  side: "left" | "right",
  key: string,
) {
  const world = f.root.world;
  const root = world.findOwner(null, `@component-root:${id}`);
  assert(root !== undefined);
  const app = world.findOwner(root, `${id}:app`, `@slot:${id}:app:0`);
  assert(app !== undefined);
  const list = world.findOwner(app, `${id}:list`, side);
  assert(list !== undefined);
  const row = world.findOwner(
    list,
    `${id}:row\u0000collection:${id}:${side}:region`,
    key,
  );
  assert(row !== undefined);
  return row;
}

function interceptNextVersionRead(
  collection: ReturnType<typeof createKeyedCollection<Row>>,
  onRead: () => void,
) {
  const original = Object.getOwnPropertyDescriptor(collection, "version");
  assert(original);
  const getter = original.get;
  assert(getter);
  let armed = true;
  Object.defineProperty(collection, "version", {
    configurable: true,
    get() {
      if (armed) {
        armed = false;
        onRead();
      }
      return getter.call(collection);
    },
  });
  return () => Object.defineProperty(collection, "version", original);
}

Deno.test("collection version getter cannot erase a checked World row before host admission", () => {
  const id = "scoped-structure-prehost-getter";
  const f = fixture(id);
  let restore = () => {};
  try {
    move(f.left, "c", "a");
    const cut = f.root.prepareCollections([f.left]);
    assert(cut);
    const owner = rowOwner(f, id, "left", "c");
    const accepted = f.root.publicationVersion;
    restore = interceptNextVersionRead(f.left, () => {
      assertEquals(f.root.world.destroyOwner(owner), true);
    });
    assertEquals(cut.validate(), false);
    assertEquals(f.root.publicationVersion, accepted);
    assertEquals(f.order("left"), ["a", "b", "c"]);
    cut.discard();
  } finally {
    restore();
    f.dispose();
  }
});

Deno.test("collection version getter cannot erase a checked World row after host application", () => {
  const id = "scoped-structure-posthost-getter";
  const f = fixture(id);
  let restore = () => {};
  try {
    move(f.left, "c", "a");
    const cut = f.root.prepareCollections([f.left]);
    assert(cut);
    const owner = rowOwner(f, id, "left", "c");
    const accepted = f.root.publicationVersion;
    cut.commitHost();
    restore = interceptNextVersionRead(f.left, () => {
      assertEquals(f.root.world.destroyOwner(owner), true);
    });
    assertEquals(cut.validatePostHost(), false);
    assertThrows(() => cut.preparePublication(), Error);
    assertEquals(f.root.publicationVersion, accepted);
    assertThrows(() => f.root.prepareCollections([f.left]), Error);
  } finally {
    restore();
    f.dispose();
  }
});

Deno.test("accepted scoped removal revokes the owner before ref detach and cleans its effect once", () => {
  const id = "scoped-structure-retirement";
  const collection = createKeyedCollection<Row>(
    [{ id: "a" }, { id: "b" }, { id: "c" }],
    (row) => row.id,
  );
  const events: string[] = [];
  let setC!: (value: number) => boolean;
  let removedOwner!: number;
  let cleanupCount = 0;
  const RowView = defineComponent(`${id}:row`, ({ row }: { row: Row }) => {
    const [, setValue] = useStateAt("value", 0);
    if (row.id === "c") setC = setValue;
    useEffectAt("lifetime", () => () => {
      if (row.id !== "c") return;
      assertEquals(root.world.isAlive(removedOwner), false);
      cleanupCount++;
      events.push("cleanup");
    });
    return jsx("li", {
      "data-id": row.id,
      ref: row.id === "c" ? (node: MemoryNode | null) => {
        if (node !== null) return;
        assertEquals(root.world.isAlive(removedOwner), false);
        assertThrows(() => setC(9), Error, "not alive");
        assertEquals(cleanupCount, 0);
        events.push("detach");
      } : undefined,
    }, row.id);
  });
  const List = defineComponent(`${id}:list`, () =>
    jsx("ul", {}, renderCollectionAt(
      `${id}:region`,
      collection,
      (row) => jsx(RowView, { row }),
    )));
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: id,
    scheduleCommit() {},
  });
  root.mount(jsx(List, {}));
  try {
    const rootOwner = root.world.findOwner(null, `@component-root:${id}`);
    assert(rootOwner !== undefined);
    const listOwner = root.world.findOwner(
      rootOwner,
      `${id}:list`,
      `@slot:${id}:list:0`,
    );
    assert(listOwner !== undefined);
    const owner = root.world.findOwner(
      listOwner,
      `${id}:row\u0000collection:${id}:region`,
      "c",
    );
    assert(owner !== undefined);
    removedOwner = owner;
    assert(collection.apply(collection.version, [{ type: "remove", key: "c" }]).ok);
    const cut = root.prepareCollections([collection]);
    assert(cut);
    publish(cut);
    assertEquals(events, ["detach", "cleanup"]);
    assertEquals(cleanupCount, 1);
    assertEquals(container.children[0].children.length, 2);
  } finally {
    root.dispose();
  }
  assertEquals(cleanupCount, 1);
});

Deno.test("scoped publication uses the staged reader acknowledgement without a public version getter", () => {
  const f = fixture("scoped-structure-publish-getter");
  let restore = () => {};
  try {
    move(f.left, "c", "a");
    const cut = f.root.prepareCollections([f.left]);
    assert(cut);
    cut.commitHost();
    assert(cut.validatePostHost());
    cut.preparePublication();
    const original = Object.getOwnPropertyDescriptor(f.left, "version");
    assert(original);
    Object.defineProperty(f.left, "version", {
      configurable: true,
      get() {
        throw new Error("public version getter called during publication");
      },
    });
    restore = () => Object.defineProperty(f.left, "version", original);
    cut.publish();
    cut.runEffects();
    assertEquals(f.order("left"), ["c", "a", "b"]);
  } finally {
    restore();
    f.dispose();
  }
});

Deno.test("disjoint collection regions under one App survive reverse publication order", () => {
  const f = fixture("scoped-structure-disjoint");
  try {
    const leftNodes = [...f.list("left").children];
    const rightNodes = [...f.list("right").children];
    move(f.left, "c", "a");
    const leftCut = f.root.prepareCollections([f.left]);
    assert(leftCut);
    move(f.right, "f", "d");
    const rightCut = f.root.prepareCollections([f.right]);
    assert(rightCut);
    publish(rightCut);
    assert(leftCut.validate());
    publish(leftCut);
    assertEquals(f.order("left"), ["c", "a", "b"]);
    assertEquals(f.order("right"), ["f", "d", "e"]);
    assertStrictEquals(f.list("left").children[0], leftNodes[2]);
    assertStrictEquals(f.list("right").children[0], rightNodes[2]);
    assertEquals(f.rowRenders(), 6);
  } finally {
    f.dispose();
  }
});

Deno.test("one scoped candidate accepts two disjoint regions as one cut", () => {
  const f = fixture("scoped-structure-joint");
  try {
    move(f.left, "c", "a");
    move(f.right, "f", "d");
    const before = f.root.publicationVersion;
    const cut = f.root.prepareCollections([f.left, f.right]);
    assert(cut);
    publish(cut);
    assertEquals(f.root.publicationVersion, before + 1);
    assertEquals(f.order("left"), ["c", "a", "b"]);
    assertEquals(f.order("right"), ["f", "d", "e"]);
    assertEquals(f.rowRenders(), 6);
  } finally {
    f.dispose();
  }
});

Deno.test("same-region overlap stales even when an independent region can publish", () => {
  const f = fixture("scoped-structure-overlap");
  try {
    move(f.left, "c", "a");
    const first = f.root.prepareCollections([f.left]);
    const stale = f.root.prepareCollections([f.left]);
    assert(first && stale);
    publish(first);
    assertEquals(stale.validate(), false);
    stale.discard();
    move(f.right, "f", "d");
    const right = f.root.prepareCollections([f.right]);
    assert(right);
    publish(right);
    assertEquals(f.order("right"), ["f", "d", "e"]);
  } finally {
    f.dispose();
  }
});

Deno.test("full-tree candidate remains strict after scoped collection publication", () => {
  const f = fixture("scoped-structure-full-strict");
  try {
    const full = f.root.prepare(f.tree(), { renderPreparation: "repeatable" });
    move(f.left, "c", "a");
    const scoped = f.root.prepareCollections([f.left]);
    assert(scoped);
    publish(scoped);
    assertEquals(full.validate(), false);
    full.discard();
  } finally {
    f.dispose();
  }
});

Deno.test("explicit scoped collection work declines arbitrary row rendering", () => {
  const f = fixture("scoped-structure-opaque");
  try {
    assert(
      f.left.apply(f.left.version, [{
        type: "insert",
        key: "x",
        value: { id: "x" },
        beforeKey: "a",
      }]).ok,
    );
    const renders = f.rowRenders();
    assertStrictEquals(f.root.prepareCollections([f.left]), null);
    assertEquals(f.rowRenders(), renders);
    assertEquals(f.order("left"), ["a", "b", "c"]);
    assertEquals(f.root.flush(), true);
    assertEquals(f.order("left"), ["x", "a", "b", "c"]);
  } finally {
    f.dispose();
  }
});

Deno.test("moving a row leaves its unrelated dirty numeric value unacknowledged", () => {
  const collection = createKeyedCollection<Row>(
    [{ id: "a" }, { id: "b" }],
    (row) => row.id,
  );
  const programId = "scoped-structure-dirty-row:item";
  let setB!: (value: number) => boolean;
  const RowView = defineComponent(programId, ({ row }: { row: Row }) => {
    const [, setter] = useStateAt("value", 0);
    if (row.id === "b") setB = setter;
    return jsx("li", {
      "data-id": row.id,
      "data-value": bindStatePropAt("value", (value) => value, {
        schemaVersion: 2,
        ownerProgramId: programId,
        sinkId: "data-value",
        sourceSites: ["value"],
        closedExpression: { kind: "input", index: 0 },
      }),
    });
  }, {
    propOnlySites: ["value"],
    stateLayout: {
      schemaVersion: 1,
      programId,
      slots: [{ siteId: "value", slot: 0 }],
    },
  });
  const List = defineComponent(
    "scoped-structure-dirty-row:list",
    () =>
      jsx(
        "ul",
        {},
        renderCollectionAt(
          "scoped-structure-dirty-row:region",
          collection,
          (row) => jsx(RowView, { row }),
        ),
      ),
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "scoped-structure-dirty-row",
    scheduleCommit() {},
  });
  root.mount(jsx(List, {}));
  try {
    assertEquals(setB(9), true);
    move(collection, "b", "a");
    const cut = root.prepareCollections([collection]);
    assert(cut);
    publish(cut);
    assertEquals(container.children[0].children[0].props["data-id"], "b");
    assertEquals(container.children[0].children[0].props["data-value"], 0);
    assertEquals(root.diagnostics().pendingChangeCount, 1);
    assertEquals(root.flush(), true);
    assertEquals(container.children[0].children[0].props["data-value"], 9);
    assertEquals(root.diagnostics().pendingChangeCount, 0);
  } finally {
    root.dispose();
  }
});

Deno.test("host-time newer collection operation remains pending after exact old cut", () => {
  let armed = false;
  let f!: ReturnType<typeof fixture>;
  class Host extends MemoryVDOMHost {
    override place(
      parent: MemoryNode,
      node: MemoryNode,
      before: MemoryNode | null,
    ) {
      super.place(parent, node, before);
      if (armed && node.props["data-id"] === "c") {
        armed = false;
        move(f.left, "b", "a");
        assertEquals(f.root.flush(), false);
      }
    }
  }
  f = fixture("scoped-structure-reentry", new Host());
  try {
    move(f.left, "c", "a");
    const first = f.root.prepareCollections([f.left]);
    assert(first);
    armed = true;
    publish(first);
    assertEquals(f.order("left"), ["c", "a", "b"]);
    const newer = f.root.prepareCollections([f.left]);
    assert(newer);
    publish(newer);
    assertEquals(f.order("left"), ["c", "b", "a"]);
  } finally {
    armed = false;
    f.dispose();
  }
});

Deno.test("partial second-region host failure keeps accepted version old and quarantines", () => {
  let armed = false;
  class Host extends MemoryVDOMHost {
    override place(
      parent: MemoryNode,
      node: MemoryNode,
      before: MemoryNode | null,
    ) {
      super.place(parent, node, before);
      if (armed && node.props["data-id"] === "f") {
        armed = false;
        throw new Error("second region place failed");
      }
    }
  }
  const f = fixture("scoped-structure-failure", new Host());
  try {
    move(f.left, "c", "a");
    move(f.right, "f", "d");
    const accepted = f.root.publicationVersion;
    const cut = f.root.prepareCollections([f.left, f.right]);
    assert(cut);
    armed = true;
    let error: unknown;
    try {
      cut.commitHost();
    } catch (caught) {
      error = caught;
    }
    assert(error instanceof Error);
    assertEquals(f.root.publicationVersion, accepted);
    assertThrows(
      () => f.root.prepareCollections([f.left, f.right]),
      Error,
      "host commit failure",
    );
  } finally {
    armed = false;
    f.dispose();
  }
});
