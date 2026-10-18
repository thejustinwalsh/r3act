import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { createAsyncStore } from "./async_store_runtime.ts";
import {
  bindStatePropAt,
  ComponentStateRoot,
  defineComponent,
  renderCollectionAt,
  Suspense,
  useAt,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { createKeyedCollection } from "./keyed_collection.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import type { StateCellHandle } from "./owner_state_world.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

type Row = { id: string };
const nodeText = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(nodeText).join("");

function move(collection: ReturnType<typeof createKeyedCollection<Row>>) {
  assert(collection.apply(collection.version, [{
    type: "move", key: "b", beforeKey: "a",
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

function fixture(id: string, health: () => ReturnType<typeof jsx>) {
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
  let setPosition!: (value: number) => boolean;
  let positionHandle: StateCellHandle | undefined;
  const unsubscribe = root.world.subscribeDirtyCells((handle) => {
    if (handle.site === "position") positionHandle = handle;
  });
  const RowView = defineComponent(`${id}:row`, ({ row }: { row: Row }) =>
    jsx("li", { "data-id": row.id }, row.id));
  const List = defineComponent(`${id}:list`, () => jsx("ul", {},
    renderCollectionAt(`${id}:region`, collection, (row) =>
      jsx(RowView, { row }))));
  const positionProgramId = `${id}:position`;
  const Position = defineComponent(positionProgramId, () => {
    [, setPosition] = useStateAt("position", 0);
    return jsx("output", {
      screen: bindStatePropAt("position", (value) => value, {
        schemaVersion: 2,
        ownerProgramId: positionProgramId,
        sinkId: "screen",
        sourceSites: ["position"],
        closedExpression: { kind: "input", index: 0 },
      }),
    });
  }, {
    propOnlySites: ["position"],
    stateLayout: {
      schemaVersion: 1,
      programId: positionProgramId,
      slots: [{ siteId: "position", slot: 0 }],
    },
  });
  const App = defineComponent(`${id}:app`, () => jsx("section", {}, [
    jsx(List, { key: "list" }),
    jsx(Position, { key: "position" }),
    health(),
  ]));
  root.mount(jsx(App, {}));
  return {
    root,
    collection,
    container,
    order: () => container.children[0].children[0].children.map((node) =>
      node.props["data-id"]),
    screen: () => container.children[0].children[1].props.screen,
    healthText: () => nodeText(container.children[0].children[2]),
    position(value: number) {
      assertEquals(setPosition(value), true);
      assert(positionHandle);
      return positionHandle;
    },
    dispose() {
      unsubscribe();
      root.dispose();
    },
  };
}

Deno.test("scoped joint move publishes beside an unrelated pending Suspense resource", () => {
  const pending = new Promise<string>(() => {});
  const Health = defineComponent("scoped-async-resource-health", () =>
    jsx("strong", {}, useAt("health", pending) as string));
  const f = fixture("scoped-async-resource", () => jsx(Suspense, {
    __nativeBoundarySite: "health-boundary",
    fallback: jsx("span", {}, "waiting"),
    children: jsx(Health, {}),
  }));
  try {
    const position = f.position(7);
    move(f.collection);
    const cut = f.root.prepareTransaction({
      cells: [position], collections: [f.collection],
    });
    assert(cut);
    publish(cut);
    assertEquals(f.order(), ["b", "a"]);
    assertEquals(f.screen(), 7);
    assertEquals(f.healthText(), "waiting");
    assertEquals(f.root.diagnostics().pendingChangeCount, 0);
  } finally {
    f.dispose();
  }
});

Deno.test("scoped joint move preserves unrelated pending Store history and subscription", () => {
  const store = createAsyncStore(0, (_state: number, action: number) => action);
  const Health = defineComponent("scoped-async-store-health", () =>
    jsx("span", {}, String(useStoreAt("health", store))));
  const f = fixture("scoped-async-store", () => jsx(Health, {}));
  try {
    const position = f.position(5);
    move(f.collection);
    const cut = f.root.prepareTransaction({
      cells: [position], collections: [f.collection],
    });
    assert(cut);
    assert(store.dispatch(1));
    assert(cut.validate());
    cut.commitHost();
    assert(store.dispatch(2));
    assert(cut.validatePostHost());
    cut.preparePublication();
    cut.publish();
    cut.runEffects();
    assertEquals(f.order(), ["b", "a"]);
    assertEquals(f.screen(), 5);
    assertEquals(f.healthText(), "0");
    assert(store.diagnostics().listeners > 0);
    assert(f.root.flush());
    assertEquals(f.healthText(), "2");
  } finally {
    f.dispose();
  }
});

Deno.test("opaque Store-reading rows move without replay, while selected Store writes and removal decline", () => {
  const id = "scoped-async-selected-store";
  const store = createAsyncStore(0);
  const collection = createKeyedCollection<Row>(
    [{ id: "a" }, { id: "b" }], (row) => row.id,
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: id, scheduleCommit() {},
  });
  const renders = { a: 0, b: 0 };
  const RowView = defineComponent(`${id}:row`, ({ row }: { row: Row }) => {
    renders[row.id as keyof typeof renders]++;
    return jsx("li", { "data-id": row.id, value: useStoreAt("value", store) });
  });
  const List = defineComponent(`${id}:list`, () => jsx("ul", {},
    renderCollectionAt(`${id}:region`, collection, (row) =>
      jsx(RowView, { row }))));
  root.mount(jsx(List, {}));
  try {
    const [a, b] = container.children[0].children;
    const before = { ...renders };
    move(collection);
    const moveCut = root.prepareCollections([collection]);
    assert(moveCut);
    assert(store.dispatch(1));
    publish(moveCut);
    assertStrictEquals(container.children[0].children[0], b);
    assertStrictEquals(container.children[0].children[1], a);
    assertEquals(renders, before, "move replayed opaque Store readers");
    assertEquals([a.props.value, b.props.value], [0, 0],
      "move consumed a newer Store action without publishing its output");
    assertEquals(store.diagnostics().readers, 2);
    assert(store.diagnostics().listeners > 0);
    assertStrictEquals(root.prepareTransaction({ cells: [], collections: [], stores: [store] }), null,
      "an opaque selected Store consumer was certified as closed");
    assert(root.flush());
    assertEquals([a.props.value, b.props.value], [1, 1],
      "ordinary reconciliation lost the pending Store action");
    assertStrictEquals(container.children[0].children[0], b);
    assertStrictEquals(container.children[0].children[1], a);

    assert(collection.apply(collection.version, [{ type: "remove", key: "b" }]).ok);
    assertStrictEquals(root.prepareCollections([collection]), null,
      "scoped removal cannot retire a live Store reader");
    assert(root.flush());
    assertEquals(container.children[0].children.map((node) => node.props["data-id"]), ["a"]);
    assertEquals(store.diagnostics().readers, 1);
  } finally {
    root.dispose();
  }
});
