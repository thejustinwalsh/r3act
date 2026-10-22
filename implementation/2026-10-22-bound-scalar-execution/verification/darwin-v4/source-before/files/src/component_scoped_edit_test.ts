import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "jsr:@std/assert";
import {
  bindStatePropAt,
  bindStatePropsAt,
  ComponentStateRoot,
  defineComponent,
  renderCollectionAt,
  useStateAt,
} from "./component_state_runtime.ts";
import { createKeyedCollection } from "./keyed_collection.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import type { StateCellHandle } from "./owner_state_world.ts";
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
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: id,
    scheduleCommit() {},
  });
  const handles = new Map<string, StateCellHandle>();
  const unsubscribe = root.world.subscribeDirtyCells((handle) => {
    if (handle.site === "position" || handle.site === "camera") {
      handles.set(handle.site, handle);
    }
  });
  let setPosition!: (value: number) => boolean;
  let rowRenders = 0;
  const RowView = defineComponent(`${id}:row`, ({ row }: { row: Row }) => {
    rowRenders++;
    return jsx("li", { "data-id": row.id }, row.id);
  });
  const List = defineComponent(
    `${id}:list`,
    ({ side, collection }: { side: string; collection: typeof left }) =>
      jsx("ul", { "data-side": side }, renderCollectionAt(
        `${id}:${side}:region`,
        collection,
        (row) => jsx(RowView, { row }),
      )),
  );
  const positionProgramId = `${id}:position`;
  const Position = defineComponent(positionProgramId, () => {
    [, setPosition] = useStateAt("position", 0);
    useStateAt("camera", 0);
    return jsx("output", {
      screen: bindStatePropsAt(
        ["position", "camera"],
        ([position, camera]) => position + camera,
        {
          schemaVersion: 2,
          ownerProgramId: positionProgramId,
          sinkId: "screen",
          sourceSites: ["position", "camera"],
          closedExpression: {
            kind: "binary",
            operator: "+",
            left: { kind: "input", index: 0 },
            right: { kind: "input", index: 1 },
          },
        },
      ),
    });
  }, {
    propOnlySites: ["position", "camera"],
    stateLayout: {
      schemaVersion: 1,
      programId: positionProgramId,
      slots: [
        { siteId: "position", slot: 0 },
        { siteId: "camera", slot: 1 },
      ],
    },
  });
  const App = defineComponent(`${id}:app`, () => jsx("section", {}, [
    jsx(List, { key: "left", side: "left", collection: left }),
    jsx(List, { key: "right", side: "right", collection: right }),
    jsx(Position, { key: "position" }),
  ]));
  root.mount(jsx(App, {}));
  const order = (side: "left" | "right") =>
    container.children[0].children[side === "left" ? 0 : 1].children.map(
      (node) => node.props["data-id"],
    );
  return {
    root,
    left,
    right,
    container,
    order,
    rowRenders: () => rowRenders,
    setPosition(value: number) {
      assertEquals(setPosition(value), true);
      const handle = handles.get("position");
      assert(handle);
      return handle;
    },
    cameraHandle(position: StateCellHandle) {
      const handle = root.world.cellHandle(position.owner, "camera");
      assert(handle);
      return handle;
    },
    dispose() {
      unsubscribe();
      root.dispose();
    },
  };
}

function move(
  collection: ReturnType<typeof createKeyedCollection<Row>>,
  key: string,
  beforeKey: string | null,
) {
  assert(collection.apply(collection.version, [{
    type: "move",
    key,
    beforeKey,
  }]).ok);
}

function publish(
  candidate: NonNullable<
    ReturnType<ComponentStateRoot<MemoryNode, MemoryNode>["prepareTransaction"]>
  >,
) {
  assert(candidate.validate());
  candidate.commitHost();
  assert(candidate.validatePostHost());
  candidate.preparePublication();
  candidate.publish();
  candidate.runEffects();
}

Deno.test("joint move and closed numeric cut accepts one coherent revision", () => {
  const f = fixture("scoped-edit-joint");
  try {
    const position = f.setPosition(7);
    const camera = f.cameraHandle(position);
    move(f.left, "c", "a");
    const before = f.root.publicationVersion;
    const cut = f.root.prepareTransaction({
      cells: [position, camera],
      collections: [f.left],
    });
    assert(cut);
    publish(cut);
    assertEquals(f.root.publicationVersion, before + 1);
    assertEquals(f.order("left"), ["c", "a", "b"]);
    assertEquals(f.container.children[0].children[2].props.screen, 7);
    assertEquals(f.root.diagnostics().pendingChangeCount, 0);
    assertEquals(f.rowRenders(), 6);
  } finally {
    f.dispose();
  }
});

Deno.test("joint cut survives unrelated scoped region publication", () => {
  const f = fixture("scoped-edit-disjoint");
  try {
    const position = f.setPosition(4);
    const camera = f.cameraHandle(position);
    move(f.left, "c", "a");
    const joint = f.root.prepareTransaction({
      cells: [position, camera],
      collections: [f.left],
    });
    assert(joint);
    move(f.right, "f", "d");
    const independent = f.root.prepareCollections([f.right]);
    assert(independent);
    publish(independent);
    assert(joint.validate());
    publish(joint);
    assertEquals(f.order("left"), ["c", "a", "b"]);
    assertEquals(f.order("right"), ["f", "d", "e"]);
    assertEquals(f.container.children[0].children[2].props.screen, 4);
  } finally {
    f.dispose();
  }
});

Deno.test("joint cut declines an incomplete closed expression input set", () => {
  const f = fixture("scoped-edit-incomplete");
  try {
    const position = f.setPosition(3);
    move(f.left, "c", "a");
    assertStrictEquals(f.root.prepareTransaction({
      cells: [position],
      collections: [f.left],
    }), null);
    assertEquals(f.order("left"), ["a", "b", "c"]);
    assertEquals(f.root.diagnostics().pendingChangeCount, 1);
  } finally {
    f.dispose();
  }
});

Deno.test("joint cut writes a moved row then declines its removed owner", () => {
  const id = "scoped-edit-remove-conflict";
  const collection = createKeyedCollection<Row>(
    [{ id: "a" }, { id: "b" }],
    (row) => row.id,
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: id,
    scheduleCommit() {},
  });
  let setB!: (value: number) => boolean;
  let bHandle!: StateCellHandle;
  const unsubscribe = root.world.subscribeDirtyCells((handle) => {
    if (handle.site === "value") bHandle = handle;
  });
  const rowProgramId = `${id}:row`;
  const RowView = defineComponent(rowProgramId, ({ row }: { row: Row }) => {
    const [, setter] = useStateAt("value", 0);
    if (row.id === "b") setB = setter;
    return jsx("li", {
      "data-id": row.id,
      value: bindStatePropAt("value", (value) => value, {
        schemaVersion: 2,
        ownerProgramId: rowProgramId,
        sinkId: "value",
        sourceSites: ["value"],
        closedExpression: { kind: "input", index: 0 },
      }),
    });
  }, {
    propOnlySites: ["value"],
    stateLayout: {
      schemaVersion: 1,
      programId: rowProgramId,
      slots: [{ siteId: "value", slot: 0 }],
    },
  });
  const List = defineComponent(`${id}:list`, () => jsx("ul", {},
    renderCollectionAt(`${id}:region`, collection, (row) =>
      jsx(RowView, { row }))));
  root.mount(jsx(List, {}));
  try {
    assertEquals(setB(5), true);
    assert(bHandle);
    move(collection, "b", "a");
    const moved = root.prepareTransaction({
      cells: [bHandle],
      collections: [collection],
    });
    assert(moved);
    publish(moved);
    assertEquals(container.children[0].children[0].props["data-id"], "b");
    assertEquals(container.children[0].children[0].props.value, 5);
    assertEquals(root.diagnostics().pendingChangeCount, 0);
    assertEquals(setB(7), true);
    assert(collection.apply(collection.version, [{
      type: "remove",
      key: "b",
    }]).ok);
    assertStrictEquals(root.prepareTransaction({
      cells: [bHandle],
      collections: [collection],
    }), null);
    assertEquals(container.children[0].children.length, 2);
    assertEquals(root.diagnostics().pendingChangeCount, 1);
  } finally {
    unsubscribe();
    root.dispose();
  }
});

Deno.test("host reentry preserves a newer numeric action after joint acceptance", () => {
  let armed = false;
  let f!: ReturnType<typeof fixture>;
  class Host extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      super.setProp(node, name, value, previous);
      if (armed && name === "screen") {
        armed = false;
        f.setPosition(9);
        assertEquals(f.root.flush(), false);
      }
    }
  }
  f = fixture("scoped-edit-reentry", new Host());
  try {
    const position = f.setPosition(4);
    const camera = f.cameraHandle(position);
    move(f.left, "c", "a");
    const cut = f.root.prepareTransaction({
      cells: [position, camera],
      collections: [f.left],
    });
    assert(cut);
    armed = true;
    publish(cut);
    assertEquals(f.container.children[0].children[2].props.screen, 4);
    assertEquals(f.root.diagnostics().pendingChangeCount, 1);
    const newer = f.root.prepareRetained([
      position,
      f.cameraHandle(position),
    ]);
    assert(newer);
    publish(newer);
    assertEquals(f.container.children[0].children[2].props.screen, 9);
    assertEquals(f.root.diagnostics().pendingChangeCount, 0);
  } finally {
    armed = false;
    f.dispose();
  }
});

Deno.test("an overlapping retained writer stales a prepared joint edit", () => {
  const f = fixture("scoped-edit-overlap");
  try {
    const position = f.setPosition(4);
    const camera = f.cameraHandle(position);
    move(f.left, "c", "a");
    const joint = f.root.prepareTransaction({
      cells: [position, camera],
      collections: [f.left],
    });
    assert(joint);
    const retained = f.root.prepareRetained([position, camera]);
    assert(retained);
    publish(retained);
    assertEquals(joint.validate(), false);
    joint.discard();
    assertEquals(f.order("left"), ["a", "b", "c"]);
    assertEquals(f.container.children[0].children[2].props.screen, 4);
  } finally {
    f.dispose();
  }
});

Deno.test("a later keyed host failure leaves the joint accepted revision old", () => {
  let armed = false;
  class Host extends MemoryVDOMHost {
    override place(
      parent: MemoryNode,
      node: MemoryNode,
      before: MemoryNode | null,
    ) {
      super.place(parent, node, before);
      if (armed && node.props["data-id"] === "c") {
        armed = false;
        throw new Error("keyed place failed");
      }
    }
  }
  const f = fixture("scoped-edit-host-failure", new Host());
  try {
    const position = f.setPosition(6);
    const camera = f.cameraHandle(position);
    move(f.left, "c", "a");
    const accepted = f.root.publicationVersion;
    const cut = f.root.prepareTransaction({
      cells: [position, camera],
      collections: [f.left],
    });
    assert(cut);
    armed = true;
    assertThrows(() => cut.commitHost(), Error, "keyed place failed");
    assertEquals(f.root.publicationVersion, accepted);
    assertEquals(f.root.diagnostics().pendingChangeCount, 1);
    assertThrows(() => f.root.prepareTransaction({
      cells: [position, camera],
      collections: [f.left],
    }), Error, "host commit failure");
  } finally {
    armed = false;
    f.dispose();
  }
});

Deno.test("opaque inserts and replacements decline explicit scoped preparation", () => {
  const f = fixture("scoped-edit-opaque");
  try {
    const renders = f.rowRenders();
    assert(f.left.apply(f.left.version, [{
      type: "insert",
      key: "x",
      value: { id: "x" },
      beforeKey: "a",
    }]).ok);
    assertStrictEquals(f.root.prepareTransaction({
      cells: [],
      collections: [f.left],
    }), null);
    assertEquals(f.rowRenders(), renders);
    assertEquals(f.root.flush(), true);
    assertEquals(f.order("left"), ["x", "a", "b", "c"]);
    assert(f.left.apply(f.left.version, [{
      type: "replace",
      key: "x",
      value: { id: "x" },
    }]).ok);
    const afterInsert = f.rowRenders();
    assertStrictEquals(f.root.prepareCollections([f.left]), null);
    assertEquals(f.rowRenders(), afterInsert);
  } finally {
    f.dispose();
  }
});
