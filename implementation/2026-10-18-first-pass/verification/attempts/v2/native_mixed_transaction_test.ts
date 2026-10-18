import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import {
  bindStatePropAt,
  ComponentStateRoot,
  defineComponent,
  renderCollectionAt,
  Suspense,
  useAt,
  useStateAt,
} from "./component_state_runtime.ts";
import { jsx, type RuntimeNode } from "./jsx_binding_runtime.ts";
import { createKeyedCollection } from "./keyed_collection.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import type { StateCellHandle } from "./owner_state_world.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

function fixture(id: string) {
  const rows = createKeyedCollection(["a", "b", "c"], (key) => key);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: id,
    scheduleCommit() {},
  });
  const cells = new Map<string, StateCellHandle>();
  const setters = new Map<string, (value: number) => boolean>();
  const unsubscribe = root.world.subscribeDirtyCells((handle) => {
    cells.set(handle.site, handle);
  });
  const field = (site: string) => {
    const programId = `${id}:${site}`;
    return defineComponent(programId, () => {
      const [, setter] = useStateAt(site, 0);
      setters.set(site, setter);
      return jsx("output", {
        value: bindStatePropAt(site, (value) => value, {
          schemaVersion: 2,
          ownerProgramId: programId,
          sinkId: "value",
          sourceSites: [site],
          closedExpression: { kind: "input", index: 0 },
        }),
      });
    }, {
      propOnlySites: [site],
      stateLayout: {
        schemaVersion: 1,
        programId,
        slots: [{ siteId: site, slot: 0 }],
      },
    });
  };
  const Position = field("position"), Health = field("health");
  const Item = defineComponent<{ value: string }>(
    `${id}:item`,
    ({ value }) => jsx("li", { "data-key": value }, value),
  );
  const List = defineComponent(
    `${id}:list`,
    () =>
      jsx(
        "ul",
        {},
        renderCollectionAt(`${id}:rows`, rows, (value) => jsx(Item, { value })),
      ),
  );
  const tree = (extra?: RuntimeNode) =>
    jsx("main", {}, jsx(Position, {}), jsx(Health, {}), jsx(List, {}), extra);
  root.mount(tree());
  const main = container.children[0];
  return {
    root,
    rows,
    tree,
    container,
    set(site: string, value: number) {
      assert(setters.get(site)?.(value));
      const cell = cells.get(site);
      assert(cell);
      return cell;
    },
    value: (index: number) => main.children[index].props.value,
    order: () =>
      main.children[2].children.map((node) => node.props["data-key"]),
    nodes: () => [...main.children[2].children],
    move() {
      assert(
        rows.apply(rows.version, [{ type: "move", key: "c", beforeKey: "a" }])
          .ok,
      );
    },
    dispose() {
      unsubscribe();
      root.dispose();
    },
  };
}

Deno.test("joint transaction snapshots selection while independent same-root work publishes", () => {
  const f = fixture("mixed-queue-independent"),
    queue = new NativeRootWorkQueue();
  try {
    const retainedNodes = f.nodes();
    const position = f.set("position", 7);
    f.move();
    const selectedCells = [position], selectedCollections = [f.rows];
    const joint = queue.enqueueTransaction({
      id: "joint-position-order",
      roots: [{
        root: f.root,
        cells: selectedCells,
        collections: selectedCollections,
      }],
      pending: ["ready"],
    });
    selectedCells.length = 0;
    selectedCollections.length = 0;
    const health = f.set("health", 9);
    const independent = queue.enqueueRetained({
      id: "independent-health",
      roots: [{ root: f.root, cells: [health] }],
    });
    assertEquals(independent.status, "committed");
    assertEquals(joint.status, "pending");
    assertEquals(f.value(0), 0);
    assertEquals(f.value(1), 9);
    assertEquals(f.order(), ["a", "b", "c"]);
    joint.resolve("ready");
    assertEquals(joint.status, "committed");
    assertEquals(f.value(0), 7);
    assertEquals(f.value(1), 9);
    assertEquals(f.order(), ["c", "a", "b"]);
    assertStrictEquals(f.nodes()[0], retainedNodes[2]);
    assertEquals(f.root.diagnostics().pendingChangeCount, 0);
  } finally {
    queue.dispose();
    f.dispose();
  }
});

Deno.test("pending resource work retains its view while a joint interaction publishes then rebases", async () => {
  const f = fixture("mixed-queue-resource"), queue = new NativeRootWorkQueue();
  let resolve!: (value: string) => void;
  const resource = new Promise<string>((done) => {
    resolve = done;
  });
  const Label = defineComponent(
    "mixed-queue-resource-label",
    () => jsx("strong", {}, useAt("label", resource) as string),
  );
  try {
    const original = f.nodes();
    const loading = queue.enqueue({
      id: "load-health",
      roots: [{
        root: f.root,
        tree: f.tree(jsx(Suspense, {
          __nativeBoundarySite: "mixed-queue-resource-boundary",
          fallback: jsx("i", {}, "waiting"),
          children: jsx(Label, {}),
        })),
      }],
    });
    assertEquals(loading.status, "pending");
    assertEquals(f.container.children[0].children.length, 3);
    const position = f.set("position", 8);
    f.move();
    const interaction = queue.enqueueTransaction({
      id: "ready-position-order",
      roots: [{ root: f.root, cells: [position], collections: [f.rows] }],
    });
    assertEquals(interaction.status, "committed");
    assertEquals(loading.status, "pending");
    assertEquals(f.value(0), 8);
    assertEquals(f.order(), ["c", "a", "b"]);
    assertEquals(f.container.children[0].children.length, 3);
    resolve("ready");
    await new Promise((done) => setTimeout(done, 0));
    assertEquals(loading.status, "committed");
    assertEquals(f.value(0), 8);
    assertEquals(f.order(), ["c", "a", "b"]);
    assertStrictEquals(f.nodes()[0], original[2]);
    assertEquals(f.container.children[0].children[3].children[0].text, "ready");
  } finally {
    queue.dispose();
    f.dispose();
  }
});

Deno.test("joint multi-root transaction publishes all numeric and keyed outputs before settlement", () => {
  const a = fixture("mixed-group-a"), b = fixture("mixed-group-b");
  const queue = new NativeRootWorkQueue();
  let settled = 0;
  try {
    const versions = [a.root.publicationVersion, b.root.publicationVersion];
    const roots = [a, b].map((f) => {
      const cell = f.set("position", 5);
      f.move();
      return { root: f.root, cells: [cell], collections: [f.rows] };
    });
    const work = queue.enqueueTransaction({
      id: "joint-group",
      roots,
      onSettled: () => {
        settled++;
        for (const f of [a, b]) {
          assertEquals(f.value(0), 5);
          assertEquals(f.order(), ["c", "a", "b"]);
        }
        assertEquals(
          [a.root.publicationVersion, b.root.publicationVersion],
          versions.map((version) => version + 1),
        );
      },
    });
    assertEquals(work.status, "committed");
    assertEquals(settled, 1);
  } finally {
    queue.dispose();
    a.dispose();
    b.dispose();
  }
});

Deno.test("unsupported joint edit fails without consuming state or generic collection work", () => {
  const f = fixture("mixed-queue-generic"), queue = new NativeRootWorkQueue();
  try {
    const cell = f.set("position", 4);
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
      roots: [{ root: f.root, cells: [cell], collections: [f.rows] }],
    });
    assertEquals(work.status, "failed");
    assertEquals(f.value(0), 0);
    assertEquals(f.order(), ["a", "b", "c"]);
    assertEquals(f.root.diagnostics().pendingChangeCount, 1);
    assertEquals(f.root.flush(), true);
    assertEquals(f.value(0), 4);
    assertEquals(f.order(), ["a", "b", "c", "d"]);
  } finally {
    queue.dispose();
    f.dispose();
  }
});
