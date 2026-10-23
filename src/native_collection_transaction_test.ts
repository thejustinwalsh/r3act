import { assert, assertEquals } from "jsr:@std/assert";
import {
  bindStatePropAt,
  ComponentStateRoot,
  defineComponent,
  renderCollectionAt,
  useEffectAt,
  useStateAt,
} from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { createKeyedCollection } from "./keyed_collection.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import type { StateCellHandle } from "./owner_state_world.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

function fixture(id: string) {
  const rows = createKeyedCollection(["a", "b", "c"], (value) => value);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: id,
    scheduleCommit() {},
  });
  let setHealth!: (value: number) => boolean;
  const cleanups: string[] = [];
  const Item = defineComponent<{ value: string }>(`${id}:item`, ({ value }) => {
    useEffectAt("lifetime", () => () => {
      cleanups.push(value);
    });
    return jsx("li", { "data-key": value }, value);
  });
  const List = defineComponent(
    `${id}:list`,
    () =>
      jsx(
        "ul",
        {},
        renderCollectionAt(`${id}:rows`, rows, (value) => jsx(Item, { value })),
      ),
  );
  const healthProgram = `${id}:health`;
  const Health = defineComponent(healthProgram, () => {
    [, setHealth] = useStateAt("health", 0);
    return jsx("output", {
      health: bindStatePropAt("health", (value) => value, {
        schemaVersion: 2,
        ownerProgramId: healthProgram,
        sinkId: "health",
        sourceSites: ["health"],
        closedExpression: { kind: "input", index: 0 },
      }),
    });
  }, {
    propOnlySites: ["health"],
    stateLayout: {
      schemaVersion: 1,
      programId: healthProgram,
      slots: [{ siteId: "health", slot: 0 }],
    },
  });
  const tree = jsx("main", {}, jsx(Health, {}), jsx(List, {}));
  root.mount(tree);
  const list = container.children[0].children[1];
  return {
    root,
    rows,
    list,
    cleanups,
    tree,
    setHealth: (value: number) => setHealth(value),
    order: () => list.children.map((node) => node.props["data-key"]),
    dispose: () => root.dispose(),
  };
}

Deno.test("selected collection work publishes while same-root health work waits", () => {
  const f = fixture("scoped-queue-health");
  const queue = new NativeRootWorkQueue();
  let healthCell: StateCellHandle | undefined;
  const unsubscribe = f.root.world.subscribeDirtyCells((handle) =>
    healthCell = handle
  );
  try {
    f.setHealth(9);
    assert(healthCell);
    const healthWork = queue.enqueueTransaction({
      id: "pending-health",
      roots: [{ root: f.root, cells: [healthCell] }],
      pending: ["health-ready"],
    });
    const original = f.list.children[2];
    assert(
      f.rows.apply(f.rows.version, [{ type: "move", key: "c", beforeKey: "a" }])
        .ok,
    );
    const moved = queue.enqueueTransaction({
      id: "move-position-row",
      roots: [{ root: f.root, collections: [f.rows] }],
    });
    assertEquals(moved.status, "committed");
    assertEquals(healthWork.status, "pending");
    assertEquals(f.order(), ["c", "a", "b"]);
    assert(f.list.children[0] === original);
    assertEquals(f.root.diagnostics().pendingChangeCount, 1);
    assertEquals(f.cleanups, []);
    healthWork.resolve("health-ready");
    assertEquals(healthWork.status, "committed");
    assertEquals(f.root.diagnostics().pendingChangeCount, 0);
    assertEquals(f.order(), ["c", "a", "b"]);
  } finally {
    unsubscribe();
    queue.dispose();
    f.dispose();
  }
});

Deno.test("declared collection group snapshots selection and retires owners after acceptance", () => {
  const a = fixture("scoped-group-a"), b = fixture("scoped-group-b");
  const queue = new NativeRootWorkQueue();
  try {
    const versions = [a.root.publicationVersion, b.root.publicationVersion];
    for (const f of [a, b]) {
      assert(f.rows.apply(f.rows.version, [{ type: "remove", key: "b" }]).ok);
    }
    const selected = [a.rows];
    const group = queue.enqueueTransaction({
      id: "remove-group",
      roots: [{ root: a.root, collections: selected }, {
        root: b.root,
        collections: [b.rows],
      }],
      pending: ["frame"],
      onSettled: () => {
        assertEquals(a.order(), ["a", "c"]);
        assertEquals(b.order(), ["a", "c"]);
        assertEquals(
          [a.root.publicationVersion, b.root.publicationVersion],
          versions.map((v) => v + 1),
        );
      },
    });
    selected.length = 0;
    assertEquals(group.status, "pending");
    group.resolve("frame");
    assertEquals(group.status, "committed");
    assertEquals(a.cleanups, ["b"]);
    assertEquals(b.cleanups, ["b"]);
  } finally {
    queue.dispose();
    a.dispose();
    b.dispose();
  }
});

Deno.test("unsupported collection insertion preserves work for the generic path", () => {
  const f = fixture("scoped-queue-fallback");
  const queue = new NativeRootWorkQueue();
  try {
    assert(
      f.rows.apply(f.rows.version, [{
        type: "insert",
        key: "d",
        value: "d",
        beforeKey: null,
      }]).ok,
    );
    const work = queue.enqueueTransaction({
      id: "unsupported-insert",
      roots: [{ root: f.root, collections: [f.rows] }],
    });
    assertEquals(work.status, "failed");
    assertEquals(f.order(), ["a", "b", "c"]);
    f.root.flush();
    assertEquals(f.order(), ["a", "b", "c", "d"]);
  } finally {
    queue.dispose();
    f.dispose();
  }
});
